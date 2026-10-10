import React, { useEffect, useMemo } from 'react';
import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  AnimatedPressable,
  AppText,
  DailyProgressRing,
  RoutineActivityCard,
  RoutineProgressBar,
  Screen,
  StreakSummary,
  Surface,
} from '../../components';
import { calculateStreakSummary } from '../../services';
import { useCurrentDateKey } from '../../hooks';
import { useAppStore } from '../../store';
import { palette, radii, spacing, useAppTheme } from '../../theme';
import type { MainTabParamList, RootStackParamList, SaverKey } from '../../types';
import {
  addDays,
  deriveRoutineProgress,
  parseLocalDateKey,
} from '../../utils';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Today'>,
  NativeStackScreenProps<RootStackParamList>
>;

const MESSAGES = [
  'A quiet start changes the shape of the whole day.',
  'Small rituals become a life when you return to them.',
  'Begin with presence, then let momentum do its work.',
  'You do not need a perfect morning—only an intentional one.',
  'Make the next few minutes belong entirely to you.',
];

const ICONS: Record<SaverKey, React.ComponentProps<typeof Feather>['name']> = {
  SILENCE: 'wind',
  AFFIRMATIONS: 'message-circle',
  VISUALIZATION: 'eye',
  EXERCISE: 'activity',
  READING: 'book-open',
  SCRIBING: 'edit-3',
};

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatMinutes(seconds: number) {
  if (seconds <= 0) return '0 min';
  if (seconds < 60) return '<1 min';
  return `${Math.ceil(seconds / 60)} min`;
}

export function TodayScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const today = useCurrentDateKey();
  const records = useAppStore((state) => state.routinesByDate);
  const record = records[today];
  const configs = useAppStore((state) => state.settings.activityConfigs);
  const activeTimer = useAppStore((state) => state.activeTimer);
  const ensureRoutine = useAppStore((state) => state.ensureRoutine);
  const beginActivity = useAppStore((state) => state.beginActivity);

  useEffect(() => {
    ensureRoutine(today);
  }, [ensureRoutine, today]);

  const progress = useMemo(
    () =>
      record
        ? deriveRoutineProgress(record)
        : {
            scheduledActivityCount: 0,
            completedActivityCount: 0,
            skippedActivityCount: 0,
            activityCompletionPercentage: 0,
            plannedSeconds: 0,
            completedSeconds: 0,
            timeCompletionPercentage: 0,
            estimatedRemainingSeconds: 0,
            isRoutineComplete: false,
          },
    [record],
  );
  const streak = useMemo(
    () => calculateStreakSummary(records, today),
    [records, today],
  );
  const orderedConfigs = useMemo(
    () => configs.slice().sort((left, right) => left.order - right.order),
    [configs],
  );
  const activityConfig = useMemo(
    () => new Map(orderedConfigs.map((item) => [item.id, item])),
    [orderedConfigs],
  );
  const nextActivity = record?.activities.find(
    (activity) => activity.status === 'NOT_STARTED' || activity.status === 'IN_PROGRESS',
  );

  const openActivity = (activityId: SaverKey) => {
    if (activeTimer) {
      navigation.navigate('Timer', {
        dateKey: activeTimer.dateKey,
        activityId: activeTimer.activityId,
      });
      return;
    }
    const started = beginActivity(today, activityId);
    if (!started) {
      const activity = record?.activities.find((item) => item.activityId === activityId);
      if (activity?.status === 'COMPLETED' || activity?.status === 'SKIPPED') {
        navigation.navigate('Timer', { dateKey: today, activityId });
      } else {
        Alert.alert('Unable to start', 'This activity is not scheduled for today.');
      }
      return;
    }
    navigation.navigate('Timer', { dateKey: today, activityId });
  };

  const openNext = () => {
    if (activeTimer) {
      navigation.navigate('Timer', {
        dateKey: activeTimer.dateKey,
        activityId: activeTimer.activityId,
      });
    } else if (nextActivity) {
      openActivity(nextActivity.activityId);
    }
  };

  const messageIndex = today
    .split('')
    .reduce((sum, character) => sum + character.charCodeAt(0), 0) % MESSAGES.length;
  const todayDate = parseLocalDateKey(today);
  const compact = width < 460;
  const week = Array.from({ length: 7 }, (_, index) => {
    const dateKey = addDays(today, index - 6);
    const item = records[dateKey];
    const dayProgress = item ? deriveRoutineProgress(item) : null;
    return {
      label: parseLocalDateKey(dateKey).toLocaleDateString(undefined, { weekday: 'narrow' }),
      completed: Boolean(dayProgress?.isRoutineComplete),
      partial: Boolean(dayProgress && dayProgress.completedActivityCount > 0),
    };
  });

  return (
    <Screen
      contentContainerStyle={styles.content}
      edges={['top', 'left', 'right']}
      scrollable
      testID="today-screen"
    >
      <View className="flex-row items-center justify-between" style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText color={colors.textMuted} variant="caption">
            {todayDate.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </AppText>
          <AppText numberOfLines={1} variant="title">
            {greetingForHour(new Date().getHours())}.
          </AppText>
        </View>
        <AnimatedPressable
          accessibilityLabel="Open settings"
          haptic="selection"
          onPress={() => navigation.navigate('Settings')}
          style={[
            styles.settingsButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Feather color={colors.primary} name="sliders" size={20} />
        </AnimatedPressable>
      </View>

      <View className="flex-row items-start" style={styles.messageRow}>
        <View style={[styles.messageLine, { backgroundColor: colors.accent }]} />
        <AppText color={colors.textMuted} style={styles.message}>
          {MESSAGES[messageIndex]}
        </AppText>
      </View>

      {progress.isRoutineComplete ? (
        <LinearGradient
          colors={[palette.forest, palette.forestLight]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.completeHero}
        >
          <View style={[styles.completeIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <MaterialCommunityIcons color={palette.amber} name="weather-sunset-up" size={30} />
          </View>
          <View style={styles.completeCopy}>
            <AppText color={palette.ivory} variant="heading">
              Morning complete
            </AppText>
            <AppText color={palette.sageLight}>
              You kept a promise to yourself. Carry that steadiness forward.
            </AppText>
          </View>
          <Feather color={palette.amber} name="check-circle" size={26} />
        </LinearGradient>
      ) : (
        <Surface elevated padding="xl" style={styles.progressCard}>
          <View style={[styles.progressLayout, compact && styles.progressLayoutCompact]}>
            <DailyProgressRing
              completedActivities={progress.completedActivityCount}
              completedMinutes={Math.round(progress.completedSeconds / 60)}
              plannedMinutes={Math.round(progress.plannedSeconds / 60)}
              progress={progress.activityCompletionPercentage}
              size={compact ? 184 : 206}
              strokeWidth={14}
              totalActivities={progress.scheduledActivityCount}
            />
            <View style={[styles.progressDetails, compact && styles.progressDetailsCompact]}>
              <View style={compact && styles.compactMetric}>
                <AppText color={colors.textSubtle} variant="overline">
                  Still ahead
                </AppText>
                <AppText style={styles.remainingNumber} variant="number">
                  {formatMinutes(progress.estimatedRemainingSeconds)}
                </AppText>
                <AppText color={colors.textMuted} variant="caption">
                  estimated remaining
                </AppText>
              </View>
              <RoutineProgressBar
                color={colors.accent}
                detail={`${formatMinutes(progress.completedSeconds)} practiced`}
                label="Time progress"
                progress={progress.timeCompletionPercentage}
                style={compact && styles.compactMetric}
              />
            </View>
          </View>

          <AnimatedPressable
            accessibilityLabel={activeTimer ? 'Continue active routine' : 'Start morning routine'}
            disabled={!nextActivity && !activeTimer}
            haptic="medium"
            onPress={openNext}
            style={[styles.startButton, { backgroundColor: colors.action }]}
          >
            <View style={styles.startIcon}>
              <Feather color={colors.primary} name={activeTimer ? 'play' : 'sunrise'} size={19} />
            </View>
            <View style={styles.startCopy}>
              <AppText color={colors.white} variant="bodyMedium">
                {activeTimer
                  ? 'Continue routine'
                  : progress.completedActivityCount > 0
                    ? 'Continue morning routine'
                    : 'Start morning routine'}
              </AppText>
              <AppText color={`${colors.white}B8`} variant="caption">
                {activeTimer
                  ? activityConfig.get(activeTimer.activityId)?.name
                  : nextActivity
                    ? `Next · ${activityConfig.get(nextActivity.activityId)?.name ?? 'Activity'}`
                    : 'All set for today'}
              </AppText>
            </View>
            <Feather color={colors.white} name="arrow-right" size={19} />
          </AnimatedPressable>
        </Surface>
      )}

      <StreakSummary
        compact
        currentStreak={streak.currentStreak}
        longestStreak={streak.longestStreak}
        sevenDayScore={streak.sevenDayConsistencyScore}
        week={week}
      />

      <View className="flex-row items-center justify-between" style={styles.sectionTitleRow}>
        <View>
          <AppText variant="heading">Today’s S.A.V.E.R.S.</AppText>
          <AppText color={colors.textMuted} variant="caption">
            Move in order or follow what you need first.
          </AppText>
        </View>
        <View style={[styles.countPill, { backgroundColor: colors.surfaceMuted }]}>
          <AppText color={colors.primary} variant="caption">
            {progress.completedActivityCount}/{progress.scheduledActivityCount}
          </AppText>
        </View>
      </View>

      <View style={styles.list}>
        {record?.activities.map((activity) => {
          const config = activityConfig.get(activity.activityId);
          if (!config) return null;
          const timedProgress =
            activity.durationPlannedSeconds <= 0
              ? 0
              : Math.min(
                  100,
                  (activity.durationElapsedSeconds / activity.durationPlannedSeconds) * 100,
                );
          return (
            <RoutineActivityCard
              accentColor={config.accentColor}
              actionLabel={
                activity.status === 'COMPLETED'
                  ? `${config.name} complete`
                  : `Open ${config.name} timer`
              }
              description={config.description}
              durationSeconds={activity.durationPlannedSeconds}
              iconName={ICONS[activity.activityId]}
              key={activity.activityId}
              letter={config.letter}
              name={config.name}
              onAction={() => openActivity(activity.activityId)}
              onPress={() => openActivity(activity.activityId)}
              progress={timedProgress}
              status={activity.status}
              testID={`activity-${activity.activityId}`}
            />
          );
        })}
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: 118 },
  header: { gap: spacing.md },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  messageRow: { gap: spacing.sm, marginTop: spacing.lg },
  messageLine: { width: 3, borderRadius: 2 },
  message: { flex: 1, fontStyle: 'italic' },
  progressCard: { marginTop: spacing.xl },
  progressLayout: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  progressLayoutCompact: { flexDirection: 'column' },
  progressDetails: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: spacing.xl },
  progressDetailsCompact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  compactMetric: { flex: 1, minWidth: 0 },
  remainingNumber: { marginTop: 2 },
  startButton: {
    minHeight: 64,
    borderRadius: radii.lg,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  startIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.ivory, alignItems: 'center', justifyContent: 'center' },
  startCopy: { flex: 1 },
  completeHero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  completeIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  completeCopy: { flex: 1, gap: 3 },
  sectionTitleRow: { marginTop: spacing['2xl'], gap: spacing.md },
  countPill: { paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radii.pill },
  list: { marginTop: spacing.md, gap: spacing.sm },
  bottomSpacer: { height: spacing.md },
});
