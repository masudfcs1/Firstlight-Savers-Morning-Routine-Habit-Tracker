import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { radii, spacing, useAppTheme } from '../../theme';
import { AppText, Surface } from '../ui';

export type ConsistencyDay = {
  label: string;
  completed: boolean;
  partial?: boolean;
};

export type StreakSummaryProps = {
  currentStreak: number;
  longestStreak: number;
  sevenDayScore?: number;
  week?: readonly ConsistencyDay[];
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function StreakSummary({
  currentStreak,
  longestStreak,
  sevenDayScore,
  week,
  compact = false,
  style,
  testID,
}: StreakSummaryProps) {
  const { colors } = useAppTheme();
  const score = sevenDayScore == null ? undefined : Math.min(100, Math.max(0, sevenDayScore));

  return (
    <Surface elevated padding={compact ? 'md' : 'lg'} style={style} testID={testID}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.fireIcon, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons color={colors.accent} name="fire" size={23} />
          </View>
          <View>
            <AppText variant="caption">Morning momentum</AppText>
            <AppText color={colors.textMuted} variant="caption">
              Gentle consistency, one day at a time
            </AppText>
          </View>
        </View>
        {score != null ? (
          <View style={[styles.scorePill, { backgroundColor: colors.surfaceMuted }]}>
            <AppText color={colors.primary} variant="caption">
              {Math.round(score)}%
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={[styles.metrics, compact && styles.metricsCompact]}>
        <View style={styles.metric}>
          <AppText style={styles.metricNumber} variant="number">
            {Math.max(0, currentStreak)}
          </AppText>
          <AppText color={colors.textMuted} variant="caption">
            day streak
          </AppText>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <View style={styles.bestRow}>
            <AppText style={styles.metricNumber} variant="number">
              {Math.max(0, longestStreak)}
            </AppText>
            <Feather color={colors.sage} name="award" size={16} />
          </View>
          <AppText color={colors.textMuted} variant="caption">
            personal best
          </AppText>
        </View>
      </View>

      {week?.length ? (
        <View style={styles.week} accessibilityLabel="Seven day consistency">
          {week.map((day, index) => (
            <View key={`${day.label}-${index}`} style={styles.day}>
              <View
                accessibilityLabel={`${day.label}, ${day.completed ? 'complete' : day.partial ? 'partially complete' : 'not complete'}`}
                style={[
                  styles.dayDot,
                  {
                    backgroundColor: day.completed
                      ? colors.action
                      : day.partial
                        ? colors.accentSoft
                        : colors.surfaceMuted,
                    borderColor: day.partial ? colors.accent : colors.border,
                  },
                ]}
              >
                {day.completed ? <Feather color={colors.white} name="check" size={13} /> : null}
              </View>
              <AppText color={colors.textSubtle} variant="caption">
                {day.label}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fireIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  scorePill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  metrics: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  metricsCompact: { marginTop: spacing.md, marginBottom: spacing.md },
  metric: { flex: 1, alignItems: 'center' },
  metricNumber: { fontSize: 32, lineHeight: 38 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  divider: { width: StyleSheet.hairlineWidth, height: 43 },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  day: { flex: 1, alignItems: 'center', gap: 5 },
  dayDot: {
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
