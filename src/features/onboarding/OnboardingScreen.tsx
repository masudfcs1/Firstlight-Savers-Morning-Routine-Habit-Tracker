import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  AnimatedPressable,
  AppText,
  Screen,
  Surface,
} from '../../components/ui';
import { useAppStore } from '../../store';
import { palette, radii, spacing, useAppTheme } from '../../theme';
import type { RootStackParamList, SaverKey } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const ICONS: Record<SaverKey, React.ComponentProps<typeof Feather>['name']> = {
  SILENCE: 'wind',
  AFFIRMATIONS: 'message-circle',
  VISUALIZATION: 'eye',
  EXERCISE: 'activity',
  READING: 'book-open',
  SCRIBING: 'edit-3',
};

export function OnboardingScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const activityConfigs = useAppStore(
    (state) => state.settings.activityConfigs,
  );
  const activities = useMemo(
    () => activityConfigs.slice().sort((a, b) => a.order - b.order),
    [activityConfigs],
  );
  const updateActivityConfig = useAppStore((state) => state.updateActivityConfig);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  const finish = () => {
    completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <Screen contentContainerStyle={styles.content} edges={['top', 'bottom']} scrollable>
      <LinearGradient
        colors={[palette.forestDark, palette.forest, '#2E6253']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <View style={styles.sunHalo}>
          <View style={styles.sun} />
        </View>
        <AppText color={palette.amberLight} variant="overline">
          Your morning, intentionally
        </AppText>
        <AppText color={palette.ivory} style={styles.heroTitle} variant="display">
          Meet your daily six.
        </AppText>
        <AppText color={palette.sageLight} style={styles.heroCopy}>
          Silence. Affirmations. Visualization. Exercise. Reading. Scribing. A calm
          sequence for beginning before the noise begins.
        </AppText>
        <View className="flex-row items-center" style={styles.promiseRow}>
          <Feather color={palette.amber} name="sunrise" size={17} />
          <AppText color={palette.ivory} variant="caption">
            Private by design · saved only on this device
          </AppText>
        </View>
      </LinearGradient>

      <View className="flex-row items-start" style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <AppText variant="heading">Shape your ritual</AppText>
          <AppText color={colors.textMuted}>
            Start with the suggested 40 minutes. You can refine tomorrow’s routine
            anytime in Settings.
          </AppText>
        </View>
        <View style={[styles.totalPill, { backgroundColor: colors.accentSoft }]}>
          <AppText color={colors.warning} variant="caption">
            {Math.round(
              activities.reduce((sum, activity) => sum + activity.durationSeconds, 0) /
                60,
            )}{' '}
            min
          </AppText>
        </View>
      </View>

      <Surface padding="sm" style={styles.activitySurface}>
        {activities.map((activity, index) => (
          <View
            className="flex-row items-center"
            key={activity.id}
            style={[
              styles.activityRow,
              index < activities.length - 1 && {
                borderBottomColor: colors.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: `${activity.accentColor}20` },
              ]}
            >
              <Feather color={activity.accentColor} name={ICONS[activity.id]} size={18} />
            </View>
            <View style={styles.activityCopy}>
              <AppText variant="bodyMedium">
                {activity.letter} · {activity.name}
              </AppText>
              <AppText color={colors.textSubtle} numberOfLines={1} variant="caption">
                {activity.description}
              </AppText>
            </View>
            <View className="flex-row items-center" style={styles.stepper}>
              <AnimatedPressable
                accessibilityLabel={`Reduce ${activity.name} duration`}
                disabled={activity.durationSeconds <= 60}
                onPress={() =>
                  updateActivityConfig(activity.id, {
                    durationSeconds: activity.durationSeconds - 60,
                  })
                }
                style={[styles.stepButton, { backgroundColor: colors.surfaceMuted }]}
              >
                <Feather color={colors.primary} name="minus" size={16} />
              </AnimatedPressable>
              <AppText align="center" style={styles.minuteValue} variant="caption">
                {Math.round(activity.durationSeconds / 60)}m
              </AppText>
              <AnimatedPressable
                accessibilityLabel={`Increase ${activity.name} duration`}
                onPress={() =>
                  updateActivityConfig(activity.id, {
                    durationSeconds: activity.durationSeconds + 60,
                  })
                }
                style={[styles.stepButton, { backgroundColor: colors.surfaceMuted }]}
              >
                <Feather color={colors.primary} name="plus" size={16} />
              </AnimatedPressable>
            </View>
          </View>
        ))}
      </Surface>

      <AnimatedPressable
        accessibilityLabel="Begin with this routine"
        haptic="medium"
        onPress={finish}
        style={[styles.primaryButton, { backgroundColor: colors.action }]}
      >
        <View>
          <AppText color={colors.white} variant="bodyMedium">
            Begin with this routine
          </AppText>
          <AppText color={`${colors.white}B8`} variant="caption">
            You can change it whenever you need
          </AppText>
        </View>
        <View style={[styles.arrowCircle, { backgroundColor: `${colors.white}18` }]}>
          <Feather color={colors.white} name="arrow-right" size={20} />
        </View>
      </AnimatedPressable>

      <AnimatedPressable
        accessibilityLabel="Skip setup and use defaults"
        onPress={finish}
        style={styles.skipButton}
      >
        <AppText color={colors.textMuted} variant="caption">
          Skip setup and use these defaults
        </AppText>
      </AnimatedPressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.xl },
  hero: {
    minHeight: 310,
    borderRadius: radii.xl,
    padding: spacing.xl,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sunHalo: {
    position: 'absolute',
    right: -24,
    top: -35,
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 32,
    borderColor: 'rgba(232,173,99,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sun: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(232,173,99,0.88)',
  },
  heroTitle: { maxWidth: 290, marginTop: spacing.xs },
  heroCopy: { maxWidth: 360, marginTop: spacing.sm },
  promiseRow: { gap: spacing.xs, marginTop: spacing.lg },
  sectionHeader: { gap: spacing.sm },
  sectionCopy: { flex: 1, gap: 4 },
  totalPill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  activitySurface: { paddingVertical: 0 },
  activityRow: { gap: spacing.sm, paddingVertical: spacing.md },
  activityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, minWidth: 0 },
  stepper: { gap: 4 },
  stepButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  minuteValue: { width: 30 },
  primaryButton: {
    minHeight: 68,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  skipButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
