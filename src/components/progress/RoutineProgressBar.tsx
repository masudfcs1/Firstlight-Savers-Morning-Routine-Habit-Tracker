import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion, radii, spacing, useAppTheme } from '../../theme';
import { AppText } from '../ui';

export type RoutineProgressBarProps = {
  /** Completion percentage in the 0–100 range. */
  progress: number;
  label?: string;
  detail?: string;
  color?: string;
  height?: number;
  showPercentage?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function RoutineProgressBar({
  progress,
  label,
  detail,
  color,
  height = 8,
  showPercentage = true,
  style,
  testID,
}: RoutineProgressBarProps) {
  const { colors, reduceMotion } = useAppTheme();
  const reducedMotion = useReducedMotion() || reduceMotion;
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedValue = useSharedValue(0);
  const value = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0));

  useEffect(() => {
    animatedValue.value = reducedMotion
      ? value / 100
      : withTiming(value / 100, { duration: motion.standard });
  }, [animatedValue, reducedMotion, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: trackWidth * animatedValue.value,
  }));

  return (
    <View
      accessibilityLabel={label ? `${label}, ${Math.round(value)} percent` : `${Math.round(value)} percent complete`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={style}
      testID={testID}
    >
      {label || detail || showPercentage ? (
        <View style={styles.header}>
          <View style={styles.textColumn}>
            {label ? <AppText variant="caption">{label}</AppText> : null}
            {detail ? (
              <AppText color={colors.textSubtle} numberOfLines={1} variant="caption">
                {detail}
              </AppText>
            ) : null}
          </View>
          {showPercentage ? (
            <AppText color={color ?? colors.primary} variant="caption">
              {Math.round(value)}%
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={[
          styles.track,
          { height, backgroundColor: colors.surfaceMuted, borderRadius: Math.min(radii.pill, height / 2) },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            { height, backgroundColor: color ?? colors.accent, borderRadius: Math.min(radii.pill, height / 2) },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  textColumn: { flex: 1 },
  track: { width: '100%', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0 },
});
