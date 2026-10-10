import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import {
  AchievementBadge,
  ActivityBreakdownChart,
  AnimatedPressable,
  AppText,
  ConsistencyHeatmap,
  MonthlyProgressChart,
  Screen,
  StreakSummary,
  Surface,
  WeeklyConsistencyChart,
} from '../../components';
import { buildAchievements, buildAnalytics } from '../../services';
import { useCurrentDateKey } from '../../hooks';
import { useAppStore } from '../../store';
import { radii, spacing, useAppTheme } from '../../theme';
import type { AnalyticsFilter, MainTabParamList } from '../../types';

type Props = BottomTabScreenProps<MainTabParamList, 'Insights'>;

const FILTERS: readonly { key: AnalyticsFilter; label: string }[] = [
  { key: 'LAST_7_DAYS', label: '7 days' },
  { key: 'LAST_30_DAYS', label: '30 days' },
  { key: 'LAST_3_MONTHS', label: '3 months' },
  { key: 'LAST_6_MONTHS', label: '6 months' },
  { key: 'LAST_12_MONTHS', label: '12 months' },
  { key: 'ALL_TIME', label: 'All time' },
];

function formatDuration(seconds: number) {
  if (seconds > 0 && seconds < 60) return '<1m';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function InsightsScreen(_props: Props) {
  const { colors, isDark } = useAppTheme();
  const records = useAppStore((state) => state.routinesByDate);
  const configs = useAppStore((state) => state.settings.activityConfigs);
  const weekStartsOn = useAppStore((state) => state.settings.preferences.weekStartsOn);
  const [filter, setFilter] = useState<AnalyticsFilter>('LAST_30_DAYS');
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const today = useCurrentDateKey();
  const analytics = useMemo(
    () => buildAnalytics(records, { filter, asOfDateKey: today, weekStartsOn }),
    [filter, records, today, weekStartsOn],
  );
  const achievements = useMemo(() => buildAchievements(records, today), [records, today]);
  const configMap = useMemo(
    () => new Map(configs.map((config) => [config.id, config])),
    [configs],
  );
  const dailyChartData = analytics.daily.slice(-30);
  const weeklyChartData = analytics.weekly.map((bucket) => ({
    id: bucket.key,
    label: new Date(`${bucket.startDateKey}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    completionPercentage: bucket.averageCompletionPercentage,
    hasRecord: bucket.recordedDays > 0,
  }));
  const latestUnlocked = achievements.filter((item) => item.unlocked).at(-1);
  const nextAchievement = achievements.find((item) => !item.unlocked);
  const completedAllTime = Object.values(records).filter(
    (record) => record.dateKey <= today && record.completedAt,
  ).length;

  return (
    <Screen contentContainerStyle={styles.content} edges={['top', 'left', 'right']} scrollable>
      <View className="flex-row items-center justify-between" style={styles.header}>
        <View>
          <AppText color={colors.textMuted} variant="overline">
            Patterns, not pressure
          </AppText>
          <AppText variant="title">Your insights</AppText>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.accentSoft }]}>
          <MaterialCommunityIcons color={colors.warning} name="chart-timeline-variant-shimmer" size={24} />
        </View>
      </View>
      <AppText color={colors.textMuted} style={styles.intro}>
        Notice what supports you. Missing days remain missing; recorded zero-progress
        days stay visible as zero.
      </AppText>

      <ScrollView
        contentContainerStyle={styles.filters}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {FILTERS.map((item) => {
          const selected = item.key === filter;
          return (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={item.key}
              onPress={() => {
                setFilter(item.key);
                setSelectedPoint(null);
                setSelectedWeek(null);
              }}
              style={[
                styles.filter,
                {
                  backgroundColor: selected ? colors.action : colors.surface,
                  borderColor: selected ? colors.action : colors.border,
                },
              ]}
            >
              <AppText color={selected ? colors.white : colors.textMuted} variant="caption">
                {item.label}
              </AppText>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      <View className="flex-row flex-wrap" style={styles.metricGrid}>
        <MetricCard
          icon="check-circle"
          label="Completed routines"
          value={String(analytics.summary.totalCompletedRoutines)}
        />
        <MetricCard
          icon="zap"
          label="Current streak"
          value={`${analytics.summary.currentStreak}d`}
        />
        <MetricCard
          icon="clock"
          label="Time practiced"
          value={formatDuration(analytics.summary.totalCompletedSeconds)}
        />
        <MetricCard
          icon="trending-up"
          label="Average completion"
          value={
            analytics.summary.averageDailyCompletionPercentage == null
              ? '—'
              : `${Math.round(analytics.summary.averageDailyCompletionPercentage)}%`
          }
        />
      </View>

      <StreakSummary
        currentStreak={analytics.summary.currentStreak}
        longestStreak={analytics.summary.longestStreak}
        sevenDayScore={analytics.summary.sevenDayConsistencyScore}
      />

      <Surface style={styles.rateCard}>
        <View className="flex-row items-center justify-between" style={styles.rateHeader}>
          <View>
            <AppText variant="subheading">Completion rates</AppText>
            <AppText color={colors.textMuted} variant="caption">
              Fully completed days ÷ calendar days
            </AppText>
          </View>
          <Feather color={colors.sage} name="compass" size={22} />
        </View>
        <View className="flex-row items-center" style={styles.rateRow}>
          <Rate value={analytics.summary.weeklyCompletionRate} label="Past 7 days" />
          <View style={[styles.rateDivider, { backgroundColor: colors.border }]} />
          <Rate value={analytics.summary.monthlyCompletionRate} label="Past 30 days" />
        </View>
      </Surface>

      <View style={styles.trendCardWrap}>
        <Surface muted>
          <View className="flex-row items-center" style={styles.trendRow}>
            <View
              style={[
                styles.trendIcon,
                {
                  backgroundColor:
                    analytics.trend.direction === 'DOWN'
                      ? `${colors.danger}16`
                      : colors.accentSoft,
                },
              ]}
            >
              <Feather
                color={analytics.trend.direction === 'DOWN' ? colors.danger : colors.warning}
                name={
                  analytics.trend.direction === 'UP'
                    ? 'trending-up'
                    : analytics.trend.direction === 'DOWN'
                      ? 'trending-down'
                      : 'minus'
                }
                size={21}
              />
            </View>
            <View style={styles.trendCopy}>
              <AppText variant="bodyMedium">Compared with the prior period</AppText>
              <AppText color={colors.textMuted} variant="caption">
                {analytics.trend.available && analytics.trend.percentagePointChange != null
                  ? `${analytics.trend.percentagePointChange >= 0 ? '+' : ''}${Math.round(analytics.trend.percentagePointChange)} percentage points`
                  : 'More history is needed for a fair comparison.'}
              </AppText>
            </View>
          </View>
        </Surface>
      </View>

      <View style={styles.chartStack}>
        <WeeklyConsistencyChart
          dark={isDark}
          data={dailyChartData}
          onSelect={(datum) => {
            const label = datum.dateKey ?? datum.label ?? 'Selected day';
            setSelectedPoint(
              datum.completionPercentage == null
                ? `${label} · no routine recorded`
                : `${label} · ${Math.round(datum.completionPercentage)}% complete`,
            );
          }}
          subtitle={
            analytics.daily.length > 30
              ? 'Latest 30 days within this range'
              : 'Daily routine completion in this range'
          }
          title="Daily completion"
        />
        {selectedPoint ? (
          <View style={[styles.tooltip, { backgroundColor: colors.action }]}>
            <AppText color={colors.white} variant="caption">
              {selectedPoint}
            </AppText>
          </View>
        ) : null}
        <WeeklyConsistencyChart
          dark={isDark}
          data={weeklyChartData}
          onSelect={(datum) => {
            const bucket = analytics.weekly.find((item) => item.key === datum.id);
            setSelectedWeek(
              bucket
                ? `${bucket.startDateKey} to ${bucket.endDateKey} · ${bucket.recordedDays} recorded · ${bucket.completedRoutineDays} complete`
                : null,
            );
          }}
          subtitle="Average daily completion grouped by calendar week"
          title="Weekly consistency"
        />
        {selectedWeek ? (
          <View style={[styles.tooltip, { backgroundColor: colors.action }]}>
            <AppText color={colors.white} variant="caption">
              {selectedWeek}
            </AppText>
          </View>
        ) : null}
        <MonthlyProgressChart
          dark={isDark}
          data={analytics.monthly}
          subtitle="Fully completed routines by month"
          title="Monthly overview"
        />
        <ActivityBreakdownChart
          dark={isDark}
          data={analytics.breakdown.map((item) => ({
            ...item,
            label: configMap.get(item.activityId)?.name,
            color: configMap.get(item.activityId)?.accentColor,
          }))}
          subtitle="Credited minutes across S.A.V.E.R.S."
          title="Activity balance"
        />
        <ConsistencyHeatmap
          dark={isDark}
          data={analytics.heatmap}
          endDateKey={analytics.range.endDateKey}
          onSelect={(dateKey, datum) =>
            setSelectedPoint(
              datum?.recorded
                ? `${dateKey} · ${Math.round(datum.completionPercentage ?? 0)}% complete`
                : `${dateKey} · no routine recorded`,
            )
          }
          startDateKey={analytics.range.startDateKey}
          weekStartsOn={weekStartsOn === 1 ? 1 : 0}
        />
      </View>

      <View className="flex-row items-center justify-between" style={styles.achievementHeader}>
        <View>
          <AppText variant="heading">Milestones</AppText>
          <AppText color={colors.textMuted} variant="caption">
            Quiet markers of routines fully completed
          </AppText>
        </View>
        <View style={[styles.totalPill, { backgroundColor: colors.surfaceMuted }]}>
          <AppText color={colors.primary} variant="caption">
            {completedAllTime} total
          </AppText>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.achievementList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {achievements.map((achievement) => (
          <AchievementBadge
            description={
              achievement.unlocked
                ? 'A meaningful rhythm is taking root.'
                : `${Math.max(0, achievement.milestone - completedAllTime)} more complete mornings`
            }
            key={achievement.id}
            milestone={achievement.milestone}
            progress={Math.min(100, (completedAllTime / achievement.milestone) * 100)}
            title={`${achievement.milestone} mornings`}
            unlocked={achievement.unlocked}
            {...(achievement.unlockedAt ? { unlockedAt: achievement.unlockedAt } : {})}
          />
        ))}
      </ScrollView>
      {(latestUnlocked || nextAchievement) && (
        <AppText color={colors.textSubtle} style={styles.milestoneNote} variant="caption">
          {latestUnlocked
            ? `Latest unlocked: ${latestUnlocked.milestone} complete mornings.`
            : `Your first marker arrives at ${nextAchievement?.milestone ?? 3} complete mornings.`}
        </AppText>
      )}
      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();
  return (
    <Surface padding="md" style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: colors.surfaceMuted }]}>
        <Feather color={colors.primary} name={icon} size={17} />
      </View>
      <AppText style={styles.metricValue} variant="number">
        {value}
      </AppText>
      <AppText color={colors.textMuted} numberOfLines={1} variant="caption">
        {label}
      </AppText>
    </Surface>
  );
}

function Rate({ value, label }: { value: number; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.rate}>
      <AppText style={styles.rateNumber} variant="number">
        {Math.round(value)}%
      </AppText>
      <AppText color={colors.textMuted} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: 118 },
  header: {},
  headerIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  intro: { maxWidth: 520, marginTop: spacing.xs },
  filters: { gap: spacing.xs, paddingVertical: spacing.xl },
  filter: { minHeight: 40, borderRadius: radii.pill, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  metricGrid: { gap: spacing.sm, marginBottom: spacing.sm },
  metricCard: { width: '48%', flexGrow: 1, minWidth: 145 },
  metricIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 29, lineHeight: 35, marginTop: spacing.sm },
  rateCard: { marginTop: spacing.sm },
  rateHeader: {},
  rateRow: { marginTop: spacing.lg },
  rate: { flex: 1, alignItems: 'center' },
  rateNumber: { fontSize: 30, lineHeight: 36 },
  rateDivider: { width: StyleSheet.hairlineWidth, height: 42 },
  trendCardWrap: { marginTop: spacing.sm },
  trendRow: { gap: spacing.sm },
  trendIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  trendCopy: { flex: 1 },
  chartStack: { gap: spacing.md, marginTop: spacing.md },
  tooltip: { alignSelf: 'center', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 8, marginTop: -spacing.xs },
  achievementHeader: { marginTop: spacing['2xl'], gap: spacing.md },
  totalPill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  achievementList: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xs },
  milestoneNote: { marginTop: spacing.xs },
  bottomSpacer: { height: spacing.md },
});
