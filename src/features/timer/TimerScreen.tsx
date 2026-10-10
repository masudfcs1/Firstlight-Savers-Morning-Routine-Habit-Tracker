import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';

import {
  ActivityTimer,
  AnimatedPressable,
  AppText,
  ConfirmationDialog,
  RoutineProgressBar,
  Screen,
  Surface,
} from '../../components';
import { getTimerSnapshot } from '../../services';
import { useAppStore } from '../../store';
import { radii, spacing, useAppTheme } from '../../theme';
import type { RootStackParamList, SaverKey } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Timer'>;
type DialogMode = 'COMPLETE' | 'SKIP' | null;

function formatMinutes(seconds: number) {
  if (seconds > 0 && seconds < 60) return '<1 min';
  return `${Math.round(seconds / 60)} min`;
}

export function TimerScreen({ navigation, route }: Props) {
  const { colors, reduceMotion } = useAppTheme();
  const reducedMotion = useReducedMotion() || reduceMotion;
  const { dateKey, activityId } = route.params;
  const records = useAppStore((state) => state.routinesByDate);
  const configs = useAppStore((state) => state.settings.activityConfigs);
  const activeTimer = useAppStore((state) => state.activeTimer);
  const hapticsEnabled = useAppStore(
    (state) => state.settings.preferences.hapticsEnabled,
  );
  const beginActivity = useAppStore((state) => state.beginActivity);
  const switchActivity = useAppStore((state) => state.switchActivity);
  const pause = useAppStore((state) => state.pauseActiveTimer);
  const resume = useAppStore((state) => state.resumeActiveTimer);
  const restart = useAppStore((state) => state.restartActiveTimer);
  const synchronize = useAppStore((state) => state.syncActiveTimer);
  const confirmTimer = useAppStore((state) => state.confirmTimerCompletion);
  const completeManually = useAppStore((state) => state.completeActivityManually);
  const skip = useAppStore((state) => state.skipActivity);
  const [now, setNow] = useState(() => Date.now());
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [hiddenCompletionSessionId, setHiddenCompletionSessionId] = useState<string | null>(null);
  const completionNotified = useRef(false);

  const record = records[dateKey];
  const activity = record?.activities.find((item) => item.activityId === activityId);
  const config = configs.find((item) => item.id === activityId);
  const orderedActivities = record?.activities ?? [];
  const activityIndex = orderedActivities.findIndex((item) => item.activityId === activityId);
  const session =
    activeTimer?.dateKey === dateKey && activeTimer.activityId === activityId
      ? activeTimer
      : null;
  const isTerminal = activity?.status === 'COMPLETED' || activity?.status === 'SKIPPED';

  useEffect(() => {
    if (activity && !isTerminal && !activeTimer) beginActivity(dateKey, activityId);
  }, [activeTimer, activity, activityId, beginActivity, dateKey, isTerminal]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING') return undefined;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [session]);

  const snapshot = useMemo(
    () => (session ? getTimerSnapshot(session, now) : null),
    [now, session],
  );

  useEffect(() => {
    if (session?.status === 'RUNNING' && snapshot?.hasReachedZero) {
      synchronize(now);
    }
  }, [now, session?.status, snapshot?.hasReachedZero, synchronize]);

  useEffect(() => {
    if (session?.status !== 'AWAITING_CONFIRMATION') {
      completionNotified.current = false;
      return;
    }
    if (!completionNotified.current && hapticsEnabled) {
      completionNotified.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    }
  }, [hapticsEnabled, session?.status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' || nextState === 'background') {
        setNow(Date.now());
        synchronize(Date.now());
      }
    });
    return () => subscription.remove();
  }, [synchronize]);

  if (!record || !activity || !config) {
    return (
      <Screen contentContainerStyle={styles.missing}>
        <Feather color={colors.textSubtle} name="alert-circle" size={34} />
        <AppText align="center" variant="heading">
          Activity unavailable
        </AppText>
        <AppText align="center" color={colors.textMuted}>
          This routine snapshot does not contain the requested activity.
        </AppText>
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          style={[styles.simpleButton, { backgroundColor: colors.action }]}
        >
          <AppText color={colors.white} variant="bodyMedium">
            Return to Today
          </AppText>
        </AnimatedPressable>
      </Screen>
    );
  }

  const openSibling = (targetId: SaverKey) => {
    const target = orderedActivities.find((item) => item.activityId === targetId);
    if (!target) return;
    if (target.status === 'COMPLETED' || target.status === 'SKIPPED') {
      if (activeTimer?.status === 'RUNNING') pause(Date.now());
      navigation.replace('Timer', { dateKey, activityId: targetId });
      return;
    }
    if (activeTimer?.status === 'AWAITING_CONFIRMATION') {
      if (session) setDialogMode('COMPLETE');
      else {
        navigation.replace('Timer', {
          dateKey: activeTimer.dateKey,
          activityId: activeTimer.activityId,
        });
      }
      return;
    }
    if (switchActivity(dateKey, targetId, Date.now())) {
      navigation.replace('Timer', { dateKey, activityId: targetId });
    }
  };
  const previous = activityIndex > 0 ? orderedActivities[activityIndex - 1] : undefined;
  const next =
    activityIndex >= 0 && activityIndex < orderedActivities.length - 1
      ? orderedActivities[activityIndex + 1]
      : undefined;

  const handleConfirmedCompletion = () => {
    if (session?.status === 'AWAITING_CONFIRMATION') confirmTimer(Date.now());
    else completeManually(dateKey, activityId);
    setDialogMode(null);
  };

  const handleSkip = () => {
    skip(dateKey, activityId);
    setDialogMode(null);
  };

  if (isTerminal) {
    return (
      <Screen contentContainerStyle={styles.content} edges={['top', 'bottom']} scrollable>
        <Header onBack={() => navigation.goBack()} title={`${config.letter} · ${config.name}`} />
        <Animated.View
          {...(!reducedMotion ? { entering: FadeInDown.duration(420) } : {})}
          style={styles.completedWrap}
        >
          <View
            style={[
              styles.celebration,
              { backgroundColor: `${config.accentColor}20`, borderColor: config.accentColor },
            ]}
          >
            <View style={[styles.celebrationCore, { backgroundColor: config.accentColor }]}>
              <Feather
                color={colors.white}
                name={activity.status === 'SKIPPED' ? 'skip-forward' : 'check'}
                size={39}
              />
            </View>
          </View>
          <AppText align="center" variant="title">
            {activity.status === 'SKIPPED' ? 'Set aside for today' : 'Practice complete'}
          </AppText>
          <AppText align="center" color={colors.textMuted} style={styles.completedCopy}>
            {activity.status === 'SKIPPED'
              ? 'Skipping with intention is still information. Your history keeps it distinct from completion.'
              : 'Pause for a breath and notice how you feel before moving into the next practice.'}
          </AppText>
        </Animated.View>

        <Surface elevated style={styles.summaryCard}>
          <View className="flex-row items-center" style={styles.summaryRow}>
            <SummaryMetric label="Planned" value={formatMinutes(activity.durationPlannedSeconds)} />
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <SummaryMetric label="Elapsed" value={formatMinutes(activity.durationElapsedSeconds)} />
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <SummaryMetric label="Credited" value={formatMinutes(activity.durationCompletedSeconds)} />
          </View>
          <View style={[styles.methodPill, { backgroundColor: colors.surfaceMuted }]}>
            <Feather color={config.accentColor} name="bookmark" size={14} />
            <AppText color={colors.textMuted} variant="caption">
              Recorded as {activity.completionMethod.toLowerCase()}
            </AppText>
          </View>
        </Surface>

        {next ? (
          <AnimatedPressable
            accessibilityLabel={`Continue to ${configs.find((item) => item.id === next.activityId)?.name ?? 'next activity'}`}
            haptic="medium"
            onPress={() => openSibling(next.activityId)}
            style={[styles.nextButton, { backgroundColor: colors.action }]}
          >
            <View>
              <AppText color={colors.white} variant="bodyMedium">
                Continue to next practice
              </AppText>
              <AppText color={`${colors.white}B8`} variant="caption">
                {configs.find((item) => item.id === next.activityId)?.name}
              </AppText>
            </View>
            <Feather color={colors.white} name="arrow-right" size={20} />
          </AnimatedPressable>
        ) : (
          <AnimatedPressable
            onPress={() => navigation.navigate('Main', { screen: 'Today' })}
            style={[styles.nextButton, { backgroundColor: colors.action }]}
          >
            <AppText color={colors.white} variant="bodyMedium">
              Return to today’s routine
            </AppText>
            <Feather color={colors.white} name="sunrise" size={20} />
          </AnimatedPressable>
        )}

        <View className="flex-row" style={styles.siblingRow}>
          <SiblingButton
            disabled={!previous}
            label="Previous"
            onPress={previous ? () => openSibling(previous.activityId) : undefined}
          />
          <SiblingButton
            disabled={!next}
            label="Next"
            next
            onPress={next ? () => openSibling(next.activityId) : undefined}
          />
        </View>
      </Screen>
    );
  }

  const remainingSeconds = snapshot?.remainingSeconds ?? activity.durationPlannedSeconds;
  const isRunning = session?.status === 'RUNNING';
  const statusText =
    session?.status === 'AWAITING_CONFIRMATION'
      ? 'Ready to confirm'
      : isRunning
        ? 'In flow'
        : 'Paused';

  return (
    <Screen contentContainerStyle={styles.content} edges={['top', 'bottom']} scrollable>
      <Header onBack={() => navigation.goBack()} title={`${activityIndex + 1} of ${orderedActivities.length}`} />
      <RoutineProgressBar
        color={config.accentColor}
        progress={((activityIndex + (snapshot?.progress ?? 0)) / orderedActivities.length) * 100}
        showPercentage={false}
        style={styles.sequenceProgress}
      />
      <ActivityTimer
        accentColor={config.accentColor}
        activityName={config.name}
        canGoNext={Boolean(next)}
        canGoPrevious={Boolean(previous)}
        instruction={config.guidance}
        isRunning={isRunning}
        letter={config.letter}
        onComplete={() => setDialogMode('COMPLETE')}
        onNext={next ? () => openSibling(next.activityId) : undefined}
        onPrevious={previous ? () => openSibling(previous.activityId) : undefined}
        onRestart={() => restart(Date.now())}
        onSkip={() => setDialogMode('SKIP')}
        onToggle={
          session?.status === 'AWAITING_CONFIRMATION'
            ? undefined
            : () => {
                if (session?.status === 'RUNNING') pause(Date.now());
                else if (session?.status === 'PAUSED') resume(Date.now());
              }
        }
        remainingSeconds={remainingSeconds}
        statusText={statusText}
        totalSeconds={activity.durationPlannedSeconds}
      />

      <ConfirmationDialog
        cancelLabel={session?.status === 'AWAITING_CONFIRMATION' ? 'Review later' : 'Keep practicing'}
        confirmLabel={
          session?.status === 'AWAITING_CONFIRMATION' ? 'Confirm completion' : 'Finish now'
        }
        icon="sunrise"
        message={
          session?.status === 'AWAITING_CONFIRMATION'
            ? 'Your timer is complete. Confirm when you are ready so this practice is saved to today.'
            : 'Finish this practice now? Only the time actually elapsed will be credited.'
        }
        onCancel={() => {
          setDialogMode(null);
          if (session?.status === 'AWAITING_CONFIRMATION') {
            setHiddenCompletionSessionId(session.id);
          }
        }}
        onConfirm={handleConfirmedCompletion}
        title={session?.status === 'AWAITING_CONFIRMATION' ? 'Time well spent' : 'Finish early?'}
        visible={
          dialogMode === 'COMPLETE' ||
          (session?.status === 'AWAITING_CONFIRMATION' &&
            hiddenCompletionSessionId !== session.id)
        }
      />
      <ConfirmationDialog
        confirmLabel="Skip for today"
        destructive
        icon="skip-forward"
        message="This activity will remain visible in history as skipped and will not count toward a completed routine day."
        onCancel={() => setDialogMode(null)}
        onConfirm={handleSkip}
        title={`Skip ${config.name}?`}
        visible={dialogMode === 'SKIP'}
      />
    </Screen>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center justify-between" style={styles.header}>
      <AnimatedPressable
        accessibilityLabel="Go back"
        onPress={onBack}
        style={[styles.headerButton, { backgroundColor: colors.surfaceMuted }]}
      >
        <Feather color={colors.text} name="chevron-left" size={23} />
      </AnimatedPressable>
      <AppText color={colors.textMuted} variant="caption">
        {title}
      </AppText>
      <View style={styles.headerButton} />
    </View>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.summaryMetric}>
      <AppText variant="subheading">{value}</AppText>
      <AppText color={colors.textSubtle} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

function SiblingButton({
  disabled,
  label,
  next,
  onPress,
}: {
  disabled: boolean;
  label: string;
  next?: boolean;
  onPress?: (() => void) | undefined;
}) {
  const { colors } = useAppTheme();
  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.siblingButton, { backgroundColor: colors.surfaceMuted }]}
    >
      {!next ? <Feather color={colors.textMuted} name="chevron-left" size={18} /> : null}
      <AppText color={colors.textMuted} variant="caption">
        {label}
      </AppText>
      {next ? <Feather color={colors.textMuted} name="chevron-right" size={18} /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  missing: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  simpleButton: { minHeight: 50, borderRadius: radii.md, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  header: { marginBottom: spacing.md },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sequenceProgress: { marginBottom: spacing.lg },
  completedWrap: { alignItems: 'center', paddingTop: spacing.xl },
  celebration: { width: 138, height: 138, borderRadius: 69, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  celebrationCore: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  completedCopy: { maxWidth: 380, marginTop: spacing.xs },
  summaryCard: { marginTop: spacing.xl },
  summaryRow: {},
  summaryMetric: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 40 },
  methodPill: { marginTop: spacing.lg, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: spacing.md, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextButton: { minHeight: 62, marginTop: spacing.xl, borderRadius: radii.lg, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  siblingRow: { gap: spacing.sm, marginTop: spacing.sm },
  siblingButton: { flex: 1, minHeight: 46, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
});
