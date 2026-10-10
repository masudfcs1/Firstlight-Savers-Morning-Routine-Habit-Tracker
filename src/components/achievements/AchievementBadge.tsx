import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { radii, spacing, useAppTheme } from '../../theme';
import { AnimatedPressable, AppText } from '../ui';

export type AchievementBadgeProps = {
  title: string;
  description?: string;
  milestone: number;
  unlocked: boolean;
  progress?: number;
  unlockedAt?: string;
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  compact?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AchievementBadge({
  title,
  description,
  milestone,
  unlocked,
  progress,
  unlockedAt,
  iconName = 'medal-outline',
  compact = false,
  onPress,
  style,
  testID,
}: AchievementBadgeProps) {
  const { colors, shadows, reduceMotion } = useAppTheme();
  const reducedMotion = useReducedMotion() || reduceMotion;
  const scale = useSharedValue(unlocked ? 1 : 0.94);

  useEffect(() => {
    scale.value = reducedMotion ? 1 : withSpring(1, { damping: 12, stiffness: 170 });
  }, [reducedMotion, scale, unlocked]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const formattedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : undefined;
  const progressValue = progress == null ? undefined : Math.min(100, Math.max(0, progress));

  return (
    <AnimatedPressable
      accessibilityLabel={`${title}, ${unlocked ? 'unlocked' : `locked, ${milestone} day milestone`}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.card,
        compact && styles.cardCompact,
        shadows.card,
        {
          backgroundColor: unlocked ? colors.surface : colors.surfaceMuted,
          borderColor: unlocked ? colors.accent : colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      <Animated.View style={[styles.badgeWrap, animatedStyle]}>
        <View
          style={[
            styles.badgeOuter,
            compact && styles.badgeOuterCompact,
            { backgroundColor: unlocked ? colors.accentSoft : colors.border },
          ]}
        >
          <View
            style={[
              styles.badgeInner,
              compact && styles.badgeInnerCompact,
              { backgroundColor: unlocked ? colors.accent : colors.textSubtle },
            ]}
          >
            <MaterialCommunityIcons color={colors.white} name={unlocked ? iconName : 'lock-outline'} size={compact ? 21 : 29} />
          </View>
          {unlocked ? (
            <View style={[styles.spark, { backgroundColor: colors.action }]}>
              <Feather color={colors.white} name="check" size={10} />
            </View>
          ) : null}
        </View>
      </Animated.View>

      <View style={styles.copy}>
        <AppText numberOfLines={1} variant={compact ? 'bodyMedium' : 'subheading'}>
          {title}
        </AppText>
        {!compact && description ? (
          <AppText color={colors.textMuted} numberOfLines={2} variant="caption">
            {description}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          <AppText color={unlocked ? colors.warning : colors.textSubtle} variant="caption">
            {unlocked ? `${milestone} days reached` : `${milestone} day milestone`}
          </AppText>
          {formattedDate ? (
            <AppText color={colors.textSubtle} variant="caption">
              {formattedDate}
            </AppText>
          ) : null}
        </View>
        {!unlocked && progressValue != null && !compact ? (
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.sage, width: `${progressValue}%` }]} />
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardCompact: { minHeight: 82, padding: spacing.sm },
  badgeWrap: { alignItems: 'center', justifyContent: 'center' },
  badgeOuter: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  badgeOuterCompact: { width: 56, height: 56, borderRadius: 28 },
  badgeInner: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  badgeInnerCompact: { width: 40, height: 40, borderRadius: 20 },
  spark: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 3 },
  progressFill: { height: 4, borderRadius: 2 },
});
