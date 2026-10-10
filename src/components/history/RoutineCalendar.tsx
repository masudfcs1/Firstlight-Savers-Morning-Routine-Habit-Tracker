import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { radii, spacing, useAppTheme } from '../../theme';
import { AnimatedPressable, AppText, Surface } from '../ui';

export type RoutineCalendarDay = {
  dateKey: string;
  completionPercentage?: number;
  hasRecord?: boolean;
};

export type RoutineCalendarProps = {
  month: Date;
  days?: readonly RoutineCalendarDay[];
  completionByDate?: Readonly<Record<string, number | null | undefined>>;
  selectedDateKey?: string;
  onSelectDate: (dateKey: string) => void;
  onMonthChange?: (month: Date) => void;
  weekStartsOn?: 0 | 1;
  disableFuture?: boolean;
  minDateKey?: string;
  maxDateKey?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const DAY_LABELS_SUNDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LABELS_MONDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function RoutineCalendar({
  month,
  days,
  completionByDate,
  selectedDateKey,
  onSelectDate,
  onMonthChange,
  weekStartsOn = 0,
  disableFuture = true,
  minDateKey,
  maxDateKey,
  style,
  testID,
}: RoutineCalendarProps) {
  const { colors } = useAppTheme();
  const validMonth = Number.isNaN(month.getTime()) ? new Date() : month;
  const year = validMonth.getFullYear();
  const monthIndex = validMonth.getMonth();
  const todayKey = toDateKey(new Date());

  const recordMap = useMemo(() => {
    const map: Record<string, { value: number | undefined; hasRecord: boolean }> = {};
    Object.entries(completionByDate ?? {}).forEach(([dateKey, value]) => {
      map[dateKey] = { value: value == null ? undefined : clampPercentage(value), hasRecord: value != null };
    });
    days?.forEach((day) => {
      map[day.dateKey] = {
        value: day.completionPercentage == null ? undefined : clampPercentage(day.completionPercentage),
        hasRecord: day.hasRecord ?? day.completionPercentage != null,
      };
    });
    return map;
  }, [completionByDate, days]);

  const cells = useMemo(() => {
    const firstDay = new Date(year, monthIndex, 1);
    const rawOffset = firstDay.getDay();
    const offset = weekStartsOn === 1 ? (rawOffset + 6) % 7 : rawOffset;
    const gridStart = new Date(year, monthIndex, 1 - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      return { date, dateKey: toDateKey(date), inMonth: date.getMonth() === monthIndex };
    });
  }, [monthIndex, weekStartsOn, year]);

  const headerLabel = validMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const changeMonth = (offset: number) => {
    onMonthChange?.(new Date(year, monthIndex + offset, 1));
  };

  const getFill = (completion: number | undefined, hasRecord: boolean, selected: boolean) => {
    if (selected) return colors.action;
    if (!hasRecord) return 'transparent';
    if (!completion) return colors.surfaceMuted;
    if (completion < 34) return `${colors.sage}55`;
    if (completion < 67) return `${colors.sage}A8`;
    if (completion < 100) return colors.sage;
    return colors.action;
  };

  return (
    <Surface elevated style={style} testID={testID}>
      <View style={styles.header}>
        <AnimatedPressable
          accessibilityLabel="Previous month"
          disabled={!onMonthChange}
          onPress={() => changeMonth(-1)}
          style={[styles.monthButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Feather color={colors.text} name="chevron-left" size={20} />
        </AnimatedPressable>
        <View style={styles.headerCopy}>
          <AppText align="center" variant="subheading">
            {headerLabel}
          </AppText>
          <AppText align="center" color={colors.textMuted} variant="caption">
            Your morning rhythm
          </AppText>
        </View>
        <AnimatedPressable
          accessibilityLabel="Next month"
          disabled={!onMonthChange}
          onPress={() => changeMonth(1)}
          style={[styles.monthButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Feather color={colors.text} name="chevron-right" size={20} />
        </AnimatedPressable>
      </View>

      <View style={styles.weekHeader}>
        {(weekStartsOn === 1 ? DAY_LABELS_MONDAY : DAY_LABELS_SUNDAY).map((label, index) => (
          <AppText
            align="center"
            color={colors.textSubtle}
            key={`${label}-${index}`}
            style={styles.weekLabel}
            variant="overline"
          >
            {label}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map(({ date, dateKey, inMonth }) => {
          const data = recordMap[dateKey];
          const hasRecord = data?.hasRecord ?? false;
          const completion = data?.value;
          const selected = selectedDateKey === dateKey;
          const isToday = dateKey === todayKey;
          const isOutOfRange =
            (disableFuture && dateKey > todayKey) ||
            (minDateKey != null && dateKey < minDateKey) ||
            (maxDateKey != null && dateKey > maxDateKey);
          const disabled = !inMonth || isOutOfRange;
          const textColor = selected
            ? colors.white
            : !inMonth || isOutOfRange
              ? colors.textSubtle
              : completion != null && completion >= 67
                ? colors.white
                : colors.text;

          return (
            <View key={dateKey} style={styles.cell}>
              <AnimatedPressable
                accessibilityLabel={`${date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}${hasRecord ? `, ${Math.round(completion ?? 0)} percent complete` : ', no routine recorded'}`}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => onSelectDate(dateKey)}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: getFill(completion, hasRecord, selected),
                    borderColor: isToday && !selected ? colors.accent : 'transparent',
                    opacity: inMonth ? (isOutOfRange ? 0.35 : 1) : 0,
                  },
                ]}
              >
                <AppText align="center" color={textColor} style={styles.dayNumber} variant="caption">
                  {date.getDate()}
                </AppText>
              </AnimatedPressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <AppText color={colors.textSubtle} variant="caption">
          Less
        </AppText>
        {[0.18, 0.42, 0.68, 1].map((opacity) => (
          <View
            key={opacity}
            style={[styles.legendSwatch, { backgroundColor: colors.primary, opacity }]}
          />
        ))}
        <AppText color={colors.textSubtle} variant="caption">
          Complete
        </AppText>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  headerCopy: { flex: 1 },
  monthButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  weekHeader: { flexDirection: 'row', marginBottom: spacing.xs },
  weekLabel: { width: `${100 / 7}%` },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: {
    width: '82%',
    aspectRatio: 1,
    maxWidth: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  dayNumber: { fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: spacing.md },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
});
