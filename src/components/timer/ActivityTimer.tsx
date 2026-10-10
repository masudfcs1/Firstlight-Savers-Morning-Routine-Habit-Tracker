import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion, radii, spacing, useAppTheme } from '../../theme';
import { ActivityCompletionButton } from '../routine';
import { AnimatedPressable, AppText } from '../ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ActivityTimerProps = {
  activityName: string;
  letter: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  instruction?: string;
  accentColor?: string;
  statusText?: string;
  onToggle?: (() => void) | undefined;
  onRestart?: () => void;
  onSkip?: () => void;
  onComplete?: () => void;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  completionLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function ActivityTimer({
  activityName,
  letter,
  totalSeconds,
  remainingSeconds,
  isRunning,
  instruction,
  accentColor,
  statusText,
  onToggle,
  onRestart,
  onSkip,
  onComplete,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  completionLoading,
  style,
  testID,
}: ActivityTimerProps) {
  const { colors, isDark, reduceMotion } = useAppTheme();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion() || reduceMotion;
  const progress = useSharedValue(0);
  const safeTotal = Math.max(0, totalSeconds);
  const safeRemaining = Math.min(safeTotal || Math.max(0, remainingSeconds), Math.max(0, remainingSeconds));
  const elapsedSeconds = Math.max(0, safeTotal - safeRemaining);
  const completionRatio = safeTotal > 0 ? Math.min(1, elapsedSeconds / safeTotal) : 0;
  const isFinished = safeTotal > 0 && safeRemaining <= 0;
  const ringSize = Math.min(280, Math.max(210, width - 88));
  const strokeWidth = 13;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeColor = accentColor ?? colors.accent;

  useEffect(() => {
    progress.value = reducedMotion
      ? completionRatio
      : withTiming(completionRatio, { duration: motion.standard });
  }, [completionRatio, progress, reducedMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View className="flex-row items-center" style={styles.activityHeader}>
        <View style={[styles.letterTile, { backgroundColor: `${activeColor}20` }]}>
          <AppText color={activeColor} variant="heading">
            {letter}
          </AppText>
        </View>
        <View style={styles.headingCopy}>
          <AppText color={colors.textMuted} variant="overline">
            Current practice
          </AppText>
          <AppText numberOfLines={1} variant="heading">
            {activityName}
          </AppText>
        </View>
        <View style={[styles.statusPill, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.liveDot, { backgroundColor: isRunning ? colors.success : colors.textSubtle }]} />
          <AppText color={colors.textMuted} variant="caption">
            {statusText ?? (isFinished ? 'Finished' : isRunning ? 'In flow' : 'Paused')}
          </AppText>
        </View>
      </View>

      <View
        accessibilityLabel={`${activityName} timer, ${formatClock(safeRemaining)} remaining`}
        accessibilityRole="timer"
        style={[styles.ringContainer, { width: ringSize, height: ringSize }]}
      >
        <Svg height={ringSize} width={ringSize} style={styles.svg}>
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            fill="none"
            r={radius}
            stroke={colors.surfaceMuted}
            strokeWidth={strokeWidth}
          />
          <AnimatedCircle
            animatedProps={animatedProps}
            cx={ringSize / 2}
            cy={ringSize / 2}
            fill="none"
            r={radius}
            stroke={activeColor}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          />
        </Svg>
        <LinearGradient
          colors={isDark ? ['#213D35', '#18312B'] : ['#FFFEFB', '#F7F1E6']}
          style={[
            styles.timerFace,
            {
              width: ringSize - strokeWidth * 3.2,
              height: ringSize - strokeWidth * 3.2,
              borderRadius: ringSize,
              borderColor: colors.border,
            },
          ]}
        >
          <AppText color={colors.textSubtle} variant="overline">
            {isFinished ? 'Practice complete' : 'Time remaining'}
          </AppText>
          <AppText adjustsFontSizeToFit numberOfLines={1} style={styles.time} variant="display">
            {formatClock(safeRemaining)}
          </AppText>
          <AppText color={colors.textMuted} variant="caption">
            {formatClock(elapsedSeconds)} elapsed · {Math.round(safeTotal / 60)} min planned
          </AppText>
        </LinearGradient>
      </View>

      <View className="flex-row items-center justify-center" style={styles.primaryControls}>
        <TimerControl
          color={colors.textMuted}
          icon="rotate-ccw"
          label="Restart"
          onPress={onRestart}
        />
        <AnimatedPressable
          accessibilityLabel={
            isFinished ? 'Timer finished, confirm completion' : isRunning ? 'Pause timer' : 'Resume timer'
          }
          accessibilityRole="button"
          disabled={isFinished || !onToggle}
          haptic="medium"
          onPress={onToggle}
          style={[styles.playButton, { backgroundColor: activeColor }]}
        >
          <Feather
            color={colors.white}
            name={isFinished ? 'check' : isRunning ? 'pause' : 'play'}
            size={31}
          />
        </AnimatedPressable>
        <TimerControl color={colors.textMuted} icon="skip-forward" label="Skip" onPress={onSkip} />
      </View>

      {instruction ? (
        <View className="flex-row items-start" style={[styles.prompt, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Feather color={activeColor} name="sun" size={18} />
          <AppText color={colors.textMuted} style={styles.promptText} variant="body">
            {instruction}
          </AppText>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between" style={styles.navigationRow}>
        <AnimatedPressable
          accessibilityLabel="Previous activity"
          disabled={!canGoPrevious || !onPrevious}
          onPress={onPrevious}
          style={styles.navButton}
        >
          <Feather color={colors.textMuted} name="chevron-left" size={19} />
          <AppText color={colors.textMuted} variant="caption">
            Previous
          </AppText>
        </AnimatedPressable>
        <View style={[styles.navDivider, { backgroundColor: colors.border }]} />
        <AnimatedPressable
          accessibilityLabel="Next activity"
          disabled={!canGoNext || !onNext}
          onPress={onNext}
          style={styles.navButton}
        >
          <AppText color={colors.textMuted} variant="caption">
            Next
          </AppText>
          <Feather color={colors.textMuted} name="chevron-right" size={19} />
        </AnimatedPressable>
      </View>

      {onComplete ? (
        <ActivityCompletionButton
          accentColor={activeColor}
          completed={isFinished}
          label={isFinished ? 'Confirm completion' : 'Finish this practice'}
          loading={completionLoading}
          onPress={onComplete}
          style={styles.completionButton}
        />
      ) : null}
    </View>
  );
}

type TimerControlProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  color: string;
  onPress?: (() => void) | undefined;
};

function TimerControl({ icon, label, color, onPress }: TimerControlProps) {
  const { colors } = useAppTheme();
  return (
    <AnimatedPressable
      accessibilityLabel={label}
      disabled={!onPress}
      haptic="selection"
      onPress={onPress}
      style={styles.secondaryControl}
    >
      <View style={[styles.secondaryIcon, { backgroundColor: colors.surfaceMuted }]}>
        <Feather color={color} name={icon} size={20} />
      </View>
      <AppText color={color} variant="caption">
        {label}
      </AppText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  activityHeader: { width: '100%', gap: spacing.sm },
  letterTile: { width: 50, height: 50, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, minWidth: 0 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  ringContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xl },
  svg: { position: 'absolute' },
  timerFace: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  time: { marginVertical: 4, fontSize: 52, lineHeight: 60, fontVariant: ['tabular-nums'] },
  primaryControls: {
    gap: spacing.xl,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryControl: { minWidth: 55, alignItems: 'center', gap: 6 },
  secondaryIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  prompt: {
    width: '100%',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  promptText: { flex: 1 },
  navigationRow: {
    width: '100%',
    marginTop: spacing.lg,
  },
  navButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  navDivider: { width: StyleSheet.hairlineWidth, height: 24 },
  completionButton: { width: '100%', marginTop: spacing.md },
});
