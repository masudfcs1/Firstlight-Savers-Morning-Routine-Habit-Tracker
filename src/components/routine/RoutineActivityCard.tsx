import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { radii, spacing, useAppTheme } from '../../theme';
import { RoutineProgressBar } from '../progress';
import { AnimatedPressable, AppText } from '../ui';

export type RoutineActivityStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';

export type RoutineActivityCardProps = {
  name: string;
  letter: string;
  description?: string;
  durationMinutes?: number;
  durationSeconds?: number;
  status?: RoutineActivityStatus;
  /** Timed progress in the 0–100 range. */
  progress?: number;
  accentColor?: string;
  iconName?: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  disabled?: boolean;
  testID?: string;
};

const ICON_BY_NAME: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  silence: 'wind',
  affirmations: 'message-circle',
  visualization: 'eye',
  exercise: 'activity',
  reading: 'book-open',
  scribing: 'edit-3',
};

function getStatusLabel(status: RoutineActivityStatus) {
  if (status === 'COMPLETED') return 'Complete';
  if (status === 'IN_PROGRESS') return 'In progress';
  if (status === 'SKIPPED') return 'Skipped';
  return 'Not started';
}

export function RoutineActivityCard({
  name,
  letter,
  description,
  durationMinutes,
  durationSeconds,
  status = 'NOT_STARTED',
  progress = 0,
  accentColor,
  iconName,
  onPress,
  onAction,
  actionLabel,
  disabled,
  testID,
}: RoutineActivityCardProps) {
  const { colors, shadows, reduceMotion } = useAppTheme();
  const reducedMotion = useReducedMotion() || reduceMotion;
  const checkScale = useSharedValue(status === 'COMPLETED' ? 1 : 0.65);
  const isComplete = status === 'COMPLETED';
  const isSkipped = status === 'SKIPPED';
  const activityColor = accentColor ?? colors.primary;
  const duration = durationMinutes ?? Math.round((durationSeconds ?? 0) / 60);
  const resolvedIcon = iconName ?? ICON_BY_NAME[name.toLowerCase()] ?? 'sun';

  useEffect(() => {
    checkScale.value = reducedMotion
      ? isComplete
        ? 1
        : 0.65
      : withSpring(isComplete ? 1 : 0.65, { damping: 13, stiffness: 210 });
  }, [checkScale, isComplete, reducedMotion]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const controlIcon: React.ComponentProps<typeof Feather>['name'] = isComplete
    ? 'check'
    : status === 'IN_PROGRESS'
      ? 'pause'
      : isSkipped
        ? 'rotate-ccw'
        : 'play';

  return (
    <AnimatedPressable
      accessibilityHint={onPress ? `Open ${name} activity` : undefined}
      accessibilityLabel={`${letter}, ${name}, ${duration} minutes, ${getStatusLabel(status)}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={disabled}
      haptic="selection"
      onPress={onPress}
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: isComplete ? colors.surfaceMuted : colors.surface,
          borderColor: isComplete ? activityColor : colors.border,
        },
      ]}
      testID={testID}
    >
      <View style={[styles.accent, { backgroundColor: activityColor }]} />
      <View style={styles.mainRow}>
        <View style={[styles.iconTile, { backgroundColor: `${activityColor}1C` }]}>
          <AppText color={activityColor} style={styles.letter} variant="heading">
            {letter}
          </AppText>
          <View style={[styles.miniIcon, { backgroundColor: colors.surface }]}>
            <Feather color={activityColor} name={resolvedIcon} size={12} />
          </View>
        </View>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <AppText numberOfLines={1} style={styles.title} variant="subheading">
              {name}
            </AppText>
            <View style={styles.durationRow}>
              <Feather color={colors.textSubtle} name="clock" size={13} />
              <AppText color={colors.textMuted} variant="caption">
                {duration} min
              </AppText>
            </View>
          </View>
          {description ? (
            <AppText color={colors.textMuted} numberOfLines={2} style={styles.description} variant="caption">
              {description}
            </AppText>
          ) : null}
          {status === 'IN_PROGRESS' || (progress > 0 && !isComplete) ? (
            <RoutineProgressBar
              color={activityColor}
              height={5}
              progress={progress}
              showPercentage={false}
              style={styles.progress}
            />
          ) : (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isComplete ? activityColor : colors.borderStrong }]} />
              <AppText color={isComplete ? activityColor : colors.textSubtle} variant="caption">
                {getStatusLabel(status)}
              </AppText>
            </View>
          )}
        </View>

        <AnimatedPressable
          accessibilityLabel={actionLabel ?? `${getStatusLabel(status)} ${name}`}
          accessibilityRole="button"
          haptic="light"
          onPress={(event) => {
            event.stopPropagation();
            onAction?.();
          }}
          style={[
            styles.control,
            {
              backgroundColor: isComplete ? activityColor : colors.surfaceMuted,
              borderColor: isComplete ? activityColor : colors.border,
            },
          ]}
        >
          <Animated.View style={checkStyle}>
            <Feather color={isComplete ? colors.white : activityColor} name={controlIcon} size={19} />
          </Animated.View>
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 3, borderRadius: 3 },
  mainRow: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  iconTile: {
    width: 56,
    height: 64,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 26 },
  miniIcon: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  title: { flexShrink: 1 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  description: { marginTop: 2 },
  progress: { marginTop: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
