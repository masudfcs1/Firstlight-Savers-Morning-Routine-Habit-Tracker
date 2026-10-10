import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion, palette, useAppTheme } from '../../theme';
import { AppText } from '../ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type DailyProgressRingProps = {
  /** Completion percentage in the 0–100 range. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  completedActivities?: number;
  totalActivities?: number;
  completedMinutes?: number;
  plannedMinutes?: number;
  label?: string;
  accentColor?: string;
  testID?: string;
};

const clampPercentage = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

export function DailyProgressRing({
  progress,
  size = 220,
  strokeWidth = 15,
  completedActivities,
  totalActivities,
  completedMinutes,
  plannedMinutes,
  label = "Today's progress",
  accentColor,
  testID,
}: DailyProgressRingProps) {
  const { colors, reduceMotion } = useAppTheme();
  const reducedMotion = useReducedMotion() || reduceMotion;
  const animatedProgress = useSharedValue(0);
  const value = clampPercentage(progress);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = useMemo(() => `progress-${Math.round(size)}-${Math.round(strokeWidth)}`, [size, strokeWidth]);

  useEffect(() => {
    animatedProgress.value = reducedMotion
      ? value / 100
      : withTiming(value / 100, { duration: motion.gentle });
  }, [animatedProgress, reducedMotion, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const detail =
    completedActivities != null && totalActivities != null
      ? `${completedActivities} of ${totalActivities} activities`
      : undefined;
  const minuteDetail =
    completedMinutes != null && plannedMinutes != null
      ? `${completedMinutes} of ${plannedMinutes} min`
      : undefined;

  return (
    <View
      accessibilityLabel={`${label}, ${Math.round(value)} percent complete${detail ? `, ${detail}` : ''}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={[styles.container, { width: size, height: size }]}
      testID={testID}
    >
      <Svg height={size} width={size} style={styles.svg}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={accentColor ?? colors.accent} />
            <Stop offset="1" stopColor={palette.amberDark} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={colors.surfaceMuted}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View pointerEvents="none" style={styles.content}>
        <AppText color={colors.textMuted} style={styles.label} variant="overline">
          {label}
        </AppText>
        <View style={styles.percentageRow}>
          <AppText adjustsFontSizeToFit numberOfLines={1} style={styles.percentage} variant="display">
            {Math.round(value)}
          </AppText>
          <AppText color={colors.accent} style={styles.percentMark} variant="subheading">
            %
          </AppText>
        </View>
        {detail ? (
          <AppText color={colors.textMuted} numberOfLines={1} style={styles.detail} variant="caption">
            {detail}
          </AppText>
        ) : null}
        {minuteDetail ? (
          <AppText color={colors.textSubtle} numberOfLines={1} style={styles.minuteDetail} variant="caption">
            {minuteDetail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute' },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '72%',
  },
  label: { marginBottom: 2, textAlign: 'center' },
  percentageRow: { flexDirection: 'row', alignItems: 'flex-start' },
  percentage: { fontSize: 54, lineHeight: 61, fontVariant: ['tabular-nums'] },
  percentMark: { marginLeft: 2, marginTop: 7 },
  detail: { marginTop: -1, textAlign: 'center' },
  minuteDetail: { marginTop: 1, textAlign: 'center' },
});
