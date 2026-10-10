import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { radii, spacing, useAppTheme } from '../../theme';
import { RoutineProgressBar } from '../progress';
import { AnimatedPressable, AppText } from '../ui';

export type HistoryActivityState = 'COMPLETED' | 'IN_PROGRESS' | 'SKIPPED' | 'NOT_STARTED';

export type DailyHistoryCardProps = {
  dateKey: string;
  completionPercentage: number;
  completedActivities: number;
  totalActivities: number;
  completedMinutes: number;
  plannedMinutes: number;
  startedAt?: string;
  completedAt?: string;
  activityStates?: readonly HistoryActivityState[];
  title?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function parseLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (year == null || month == null || day == null) return undefined;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatTime(iso?: string) {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function DailyHistoryCard({
  dateKey,
  completionPercentage,
  completedActivities,
  totalActivities,
  completedMinutes,
  plannedMinutes,
  startedAt,
  completedAt,
  activityStates,
  title,
  onPress,
  style,
  testID,
}: DailyHistoryCardProps) {
  const { colors, shadows } = useAppTheme();
  const progress = Math.min(100, Math.max(0, completionPercentage));
  const date = parseLocalDateKey(dateKey);
  const dateLabel = title ?? date?.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) ?? dateKey;
  const complete = progress >= 100;
  const startTime = formatTime(startedAt);
  const endTime = formatTime(completedAt);

  return (
    <AnimatedPressable
      accessibilityLabel={`${dateLabel}, ${Math.round(progress)} percent complete`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={[styles.dateIcon, { backgroundColor: complete ? colors.action : colors.surfaceMuted }]}>
          <Feather color={complete ? colors.white : colors.textMuted} name={complete ? 'check' : 'calendar'} size={18} />
        </View>
        <View style={styles.headerCopy}>
          <AppText numberOfLines={1} variant="bodyMedium">
            {dateLabel}
          </AppText>
          <AppText color={colors.textMuted} variant="caption">
            {completedActivities} of {totalActivities} practices · {completedMinutes} of {plannedMinutes} min
          </AppText>
        </View>
        <View style={[styles.percentagePill, { backgroundColor: complete ? colors.accentSoft : colors.surfaceMuted }]}>
          <AppText color={complete ? colors.warning : colors.primary} variant="caption">
            {Math.round(progress)}%
          </AppText>
        </View>
        {onPress ? <Feather color={colors.textSubtle} name="chevron-right" size={18} /> : null}
      </View>

      <RoutineProgressBar
        color={complete ? colors.primary : colors.accent}
        height={6}
        progress={progress}
        showPercentage={false}
        style={styles.progress}
      />

      {activityStates?.length || startTime || endTime ? (
        <View style={styles.footer}>
          {activityStates?.length ? (
            <View style={styles.activityDots} accessibilityLabel="Activity completion states">
              {activityStates.map((state, index) => (
                <View
                  key={`${state}-${index}`}
                  style={[
                    styles.activityDot,
                    {
                      backgroundColor:
                        state === 'COMPLETED'
                          ? colors.action
                          : state === 'IN_PROGRESS'
                            ? colors.accent
                            : state === 'SKIPPED'
                              ? colors.textSubtle
                              : colors.surfaceMuted,
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            <View />
          )}
          {startTime || endTime ? (
            <View style={styles.timeRow}>
              <Feather color={colors.textSubtle} name="clock" size={13} />
              <AppText color={colors.textSubtle} variant="caption">
                {startTime ?? '—'}{endTime ? ` – ${endTime}` : ''}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  percentagePill: { paddingVertical: 5, paddingHorizontal: spacing.xs, borderRadius: radii.pill },
  progress: { marginTop: spacing.md },
  footer: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityDots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activityDot: { width: 7, height: 7, borderRadius: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
