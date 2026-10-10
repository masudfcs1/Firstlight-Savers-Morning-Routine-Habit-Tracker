import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import {
  AppText,
  DailyHistoryCard,
  EmptyState,
  RoutineCalendar,
  Screen,
  Surface,
} from '../../components';
import { useCurrentDateKey } from '../../hooks';
import { useAppStore } from '../../store';
import { radii, spacing, useAppTheme } from '../../theme';
import type {
  DailyActivityRecord,
  MainTabParamList,
  SaverKey,
} from '../../types';
import { deriveRoutineProgress, parseLocalDateKey } from '../../utils';

type Props = BottomTabScreenProps<MainTabParamList, 'History'>;

const ICONS: Record<SaverKey, React.ComponentProps<typeof Feather>['name']> = {
  SILENCE: 'wind',
  AFFIRMATIONS: 'message-circle',
  VISUALIZATION: 'eye',
  EXERCISE: 'activity',
  READING: 'book-open',
  SCRIBING: 'edit-3',
};

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function minutes(seconds: number) {
  if (seconds <= 0) return '0m';
  if (seconds < 60) return '<1m';
  return `${Math.round(seconds / 60)}m`;
}

export function HistoryScreen({ route }: Props) {
  const { colors } = useAppTheme();
  const records = useAppStore((state) => state.routinesByDate);
  const configs = useAppStore((state) => state.settings.activityConfigs);
  const weekStartsOn = useAppStore((state) => state.settings.preferences.weekStartsOn);
  const today = useCurrentDateKey();
  const initialDateKey = route.params?.dateKey ?? today;
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [month, setMonth] = useState(() => {
    const selected = parseLocalDateKey(initialDateKey);
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });

  const sortedDateKeys = useMemo(
    () => Object.keys(records).filter((key) => key <= today).sort().reverse(),
    [records, today],
  );
  const completionByDate = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(records).map(([dateKey, record]) => [
          dateKey,
          deriveRoutineProgress(record).activityCompletionPercentage,
        ]),
      ),
    [records],
  );
  const configMap = useMemo(
    () => new Map(configs.map((config) => [config.id, config])),
    [configs],
  );
  const selectedRecord = records[selectedDateKey];
  const selectedProgress = selectedRecord ? deriveRoutineProgress(selectedRecord) : null;

  const events = useMemo(() => {
    if (!selectedRecord) return [];
    const list: { at: string; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [];
    if (selectedRecord.startedAt) {
      list.push({ at: selectedRecord.startedAt, label: 'Routine started', icon: 'sunrise' });
    }
    selectedRecord.activities.forEach((activity) => {
      const config = configMap.get(activity.activityId);
      if (activity.startedAt) {
        list.push({ at: activity.startedAt, label: `${config?.name ?? activity.activityId} started`, icon: 'play' });
      }
      if (activity.completedAt) {
        list.push({
          at: activity.completedAt,
          label:
            activity.status === 'SKIPPED'
              ? `${config?.name ?? activity.activityId} skipped`
              : `${config?.name ?? activity.activityId} completed`,
          icon: activity.status === 'SKIPPED' ? 'skip-forward' : 'check',
        });
      }
    });
    return list.sort((left, right) => left.at.localeCompare(right.at));
  }, [configMap, selectedRecord]);

  const selectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    const date = parseLocalDateKey(dateKey);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  return (
    <Screen contentContainerStyle={styles.content} edges={['top', 'left', 'right']} scrollable>
      <View className="flex-row items-center justify-between" style={styles.header}>
        <View>
          <AppText color={colors.textMuted} variant="overline">
            Your practice archive
          </AppText>
          <AppText variant="title">Morning history</AppText>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.accentSoft }]}>
          <Feather color={colors.warning} name="calendar" size={21} />
        </View>
      </View>
      <AppText color={colors.textMuted} style={styles.intro}>
        Each day keeps the plan you had then, so future changes never rewrite your
        past.
      </AppText>

      <RoutineCalendar
        completionByDate={completionByDate}
        disableFuture
        month={month}
        onMonthChange={(nextMonth) => {
          const currentMonth = new Date();
          currentMonth.setDate(1);
          currentMonth.setHours(0, 0, 0, 0);
          if (nextMonth <= currentMonth) setMonth(nextMonth);
        }}
        onSelectDate={selectDate}
        selectedDateKey={selectedDateKey}
        weekStartsOn={weekStartsOn === 1 ? 1 : 0}
      />

      <View className="flex-row items-center justify-between" style={styles.sectionHeader}>
        <View>
          <AppText variant="heading">
            {parseLocalDateKey(selectedDateKey).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </AppText>
          <AppText color={colors.textMuted} variant="caption">
            Read-only daily snapshot
          </AppText>
        </View>
        {selectedProgress ? (
          <View style={[styles.percentPill, { backgroundColor: colors.surfaceMuted }]}>
            <AppText color={colors.primary} variant="caption">
              {Math.round(selectedProgress.activityCompletionPercentage)}%
            </AppText>
          </View>
        ) : null}
      </View>

      {selectedRecord && selectedProgress ? (
        <>
          <DailyHistoryCard
            activityStates={selectedRecord.activities.map((item) => item.status)}
            completedActivities={selectedProgress.completedActivityCount}
            completedMinutes={Math.round(selectedProgress.completedSeconds / 60)}
            completionPercentage={selectedProgress.activityCompletionPercentage}
            dateKey={selectedDateKey}
            plannedMinutes={Math.round(selectedProgress.plannedSeconds / 60)}
            title="Daily summary"
            totalActivities={selectedProgress.scheduledActivityCount}
            {...(selectedRecord.startedAt ? { startedAt: selectedRecord.startedAt } : {})}
            {...(selectedRecord.completedAt ? { completedAt: selectedRecord.completedAt } : {})}
          />

          <Surface padding="sm" style={styles.activityList}>
            {selectedRecord.activities.map((activity, index) => (
              <HistoryActivityRow
                activity={activity}
                accentColor={configMap.get(activity.activityId)?.accentColor ?? colors.primary}
                isLast={index === selectedRecord.activities.length - 1}
                key={activity.activityId}
                name={configMap.get(activity.activityId)?.name ?? activity.activityId}
              />
            ))}
          </Surface>

          <Surface muted style={styles.timeline}>
            <View className="flex-row items-center" style={styles.timelineHeading}>
              <Feather color={colors.primary} name="clock" size={18} />
              <AppText variant="subheading">Day timeline</AppText>
            </View>
            {events.length ? (
              events.map((event, index) => (
                <View className="flex-row" key={`${event.at}-${event.label}`} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
                    {index < events.length - 1 ? (
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    ) : null}
                  </View>
                  <View className="flex-row justify-between" style={styles.timelineEvent}>
                    <View className="flex-row items-center" style={styles.timelineLabel}>
                      <Feather color={colors.textSubtle} name={event.icon} size={14} />
                      <AppText variant="caption">{event.label}</AppText>
                    </View>
                    <AppText color={colors.textSubtle} variant="caption">
                      {formatTime(event.at)}
                    </AppText>
                  </View>
                </View>
              ))
            ) : (
              <AppText color={colors.textMuted}>
                No timed events were saved for this routine.
              </AppText>
            )}
          </Surface>
        </>
      ) : (
        <EmptyState
          icon="moon"
          message="There is no routine snapshot for this date. Days before you began—or days you never opened—stay honestly empty."
          title="A quiet page"
        />
      )}

      {sortedDateKeys.length > 1 ? (
        <View style={styles.recentSection}>
          <AppText variant="heading">Recent mornings</AppText>
          <View style={styles.recentList}>
            {sortedDateKeys
              .filter((dateKey) => dateKey !== selectedDateKey)
              .slice(0, 4)
              .map((dateKey) => {
                const item = records[dateKey];
                if (!item) return null;
                const itemProgress = deriveRoutineProgress(item);
                return (
                  <DailyHistoryCard
                    activityStates={item.activities.map((activity) => activity.status)}
                    completedActivities={itemProgress.completedActivityCount}
                    completedMinutes={Math.round(itemProgress.completedSeconds / 60)}
                    completionPercentage={itemProgress.activityCompletionPercentage}
                    dateKey={dateKey}
                    key={dateKey}
                    onPress={() => selectDate(dateKey)}
                    plannedMinutes={Math.round(itemProgress.plannedSeconds / 60)}
                    totalActivities={itemProgress.scheduledActivityCount}
                    {...(item.startedAt ? { startedAt: item.startedAt } : {})}
                    {...(item.completedAt ? { completedAt: item.completedAt } : {})}
                  />
                );
              })}
          </View>
        </View>
      ) : null}
      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

function HistoryActivityRow({
  activity,
  accentColor,
  name,
  isLast,
}: {
  activity: DailyActivityRecord;
  accentColor: string;
  name: string;
  isLast: boolean;
}) {
  const { colors } = useAppTheme();
  const statusColor =
    activity.status === 'COMPLETED'
      ? colors.success
      : activity.status === 'SKIPPED'
        ? colors.textSubtle
        : activity.status === 'IN_PROGRESS'
          ? colors.accent
          : colors.borderStrong;
  return (
    <View
      style={[
        styles.activityRow,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.activityIcon, { backgroundColor: `${accentColor}20` }]}>
        <Feather color={accentColor} name={ICONS[activity.activityId]} size={17} />
      </View>
      <View style={styles.activityCopy}>
        <View style={styles.activityTitleRow}>
          <AppText variant="bodyMedium">{name}</AppText>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
        <AppText color={colors.textMuted} variant="caption">
          {minutes(activity.durationElapsedSeconds)} elapsed ·{' '}
          {minutes(activity.durationCompletedSeconds)} credited ·{' '}
          {minutes(activity.durationPlannedSeconds)} planned
        </AppText>
      </View>
      <View style={styles.activityMethod}>
        <AppText color={statusColor} variant="caption">
          {activity.completionMethod?.toLowerCase().replace('_', ' ') ??
            activity.status.toLowerCase().replace('_', ' ')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: 118 },
  header: {},
  headerIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  intro: { marginTop: spacing.xs, marginBottom: spacing.xl, maxWidth: 480 },
  sectionHeader: { marginTop: spacing['2xl'], marginBottom: spacing.md, gap: spacing.sm },
  percentPill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  activityList: { marginTop: spacing.md, paddingVertical: 0 },
  activityRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  activityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, minWidth: 0 },
  activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  activityMethod: { alignItems: 'flex-end' },
  timeline: { marginTop: spacing.md },
  timelineHeading: { gap: spacing.xs, marginBottom: spacing.md },
  timelineRow: { minHeight: 44 },
  timelineRail: { width: 18, alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  timelineLine: { width: 1, flex: 1, marginTop: 3 },
  timelineEvent: { flex: 1, gap: spacing.sm, paddingBottom: spacing.md },
  timelineLabel: { flex: 1, gap: 6 },
  recentSection: { marginTop: spacing['2xl'] },
  recentList: { marginTop: spacing.md, gap: spacing.sm },
  bottomSpacer: { height: spacing.md },
});
