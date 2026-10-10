import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, useAppTheme } from '../../theme';
import { AnimatedPressable, AppText } from '../ui';

export type ActiveTimerSummary = {
  label: string;
  remainingLabel: string;
  onPress: () => void;
};

export type AppBottomTabBarProps = BottomTabBarProps & {
  activeTimer?: ActiveTimerSummary;
};

const ICONS: Record<string, { active: React.ComponentProps<typeof Feather>['name']; inactive: React.ComponentProps<typeof Feather>['name'] }> = {
  today: { active: 'sunrise', inactive: 'sun' },
  home: { active: 'sunrise', inactive: 'sun' },
  insights: { active: 'bar-chart-2', inactive: 'bar-chart' },
  history: { active: 'calendar', inactive: 'calendar' },
  settings: { active: 'settings', inactive: 'settings' },
};

export function AppBottomTabBar({ state, descriptors, navigation, activeTimer }: AppBottomTabBarProps) {
  const { colors, shadows } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.shell,
        shadows.floating,
        {
          paddingBottom: Math.max(insets.bottom, spacing.xs),
          backgroundColor: colors.tabBar,
          borderColor: colors.border,
        },
      ]}
    >
      {activeTimer ? (
        <AnimatedPressable
          accessibilityLabel={`${activeTimer.label}, ${activeTimer.remainingLabel} remaining`}
          accessibilityRole="button"
          haptic="selection"
          onPress={activeTimer.onPress}
          style={[styles.timerPill, { backgroundColor: colors.action }]}
        >
          <View style={[styles.timerPulse, { backgroundColor: colors.accent }]} />
          <AppText color={colors.white} numberOfLines={1} style={styles.timerLabel} variant="caption">
            {activeTimer.label}
          </AppText>
          <AppText color={colors.accentSoft} variant="caption">
            {activeTimer.remainingLabel}
          </AppText>
          <Feather color={colors.white} name="chevron-up" size={17} />
        </AnimatedPressable>
      ) : null}

      <View accessibilityRole="tablist" style={styles.tabs}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const iconSet = ICONS[route.name.toLowerCase()] ?? { active: 'circle', inactive: 'circle' };
          const color = focused ? colors.primary : colors.textSubtle;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <AnimatedPressable
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              haptic="selection"
              key={route.key}
              onLongPress={onLongPress}
              onPress={onPress}
              pressedScale={0.94}
              style={styles.tab}
              testID={options.tabBarButtonTestID}
            >
              <View
                style={[
                  styles.iconWrap,
                  focused && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                {options.tabBarIcon ? (
                  options.tabBarIcon({ focused, color, size: 21 })
                ) : (
                  <Feather color={color} name={focused ? iconSet.active : iconSet.inactive} size={21} />
                )}
                {options.tabBarBadge != null ? (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <AppText color={colors.black} style={styles.badgeText} variant="caption">
                      {String(options.tabBarBadge)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText color={color} numberOfLines={1} style={focused && styles.activeLabel} variant="caption">
                {label}
              </AppText>
              {focused ? <View style={[styles.activeDot, { backgroundColor: colors.accent }]} /> : null}
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  timerPill: {
    position: 'absolute',
    top: -42,
    left: spacing.lg,
    right: spacing.lg,
    minHeight: 44,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  timerPulse: { width: 8, height: 8, borderRadius: 4 },
  timerLabel: { flex: 1 },
  tabs: { flexDirection: 'row', alignItems: 'flex-start' },
  tab: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 1 },
  iconWrap: {
    minWidth: 48,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: { fontWeight: '700' },
  activeDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  badge: {
    position: 'absolute',
    right: 5,
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, lineHeight: 12, fontWeight: '700' },
});
