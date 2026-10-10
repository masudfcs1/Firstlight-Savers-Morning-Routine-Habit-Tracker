import { SAVER_KEYS } from '../types';
import type {
  ActivityAnalyticsBreakdown,
  AnalyticsDateRange,
  AnalyticsFilter,
  AnalyticsResult,
  AnalyticsSummary,
  AnalyticsTrend,
  ConsistencyHeatmapPoint,
  DailyAnalyticsPoint,
  DailyRoutineByDate,
  DailyRoutineRecord,
  DateKey,
  MonthlyAnalyticsBucket,
  PeriodAnalyticsBucket,
} from '../types';
import {
  addDays,
  addMonths,
  deriveRoutineProgress,
  differenceInCalendarDays,
  eachDateKey,
  endOfMonth,
  endOfWeek,
  isDateKey,
  minDateKey,
  startOfMonth,
  startOfWeek,
} from '../utils';
import { calculateStreakSummary, routinesToDateMap } from './streakService';

type RoutineInput = DailyRoutineByDate | readonly DailyRoutineRecord[];

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function average(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function getAnalyticsDateRange(
  filter: AnalyticsFilter,
  asOfDateKey: DateKey,
  recordDateKeys: readonly DateKey[] = [],
): AnalyticsDateRange {
  if (!isDateKey(asOfDateKey)) throw new RangeError('Invalid analytics date key.');
  let startDateKey: DateKey;
  switch (filter) {
    case 'LAST_7_DAYS':
      startDateKey = addDays(asOfDateKey, -6);
      break;
    case 'LAST_30_DAYS':
      startDateKey = addDays(asOfDateKey, -29);
      break;
    case 'LAST_3_MONTHS':
      startDateKey = addDays(addMonths(asOfDateKey, -3), 1);
      break;
    case 'LAST_6_MONTHS':
      startDateKey = addDays(addMonths(asOfDateKey, -6), 1);
      break;
    case 'LAST_12_MONTHS':
      startDateKey = addDays(addMonths(asOfDateKey, -12), 1);
      break;
    case 'ALL_TIME':
      startDateKey = minDateKey(recordDateKeys.filter((key) => key <= asOfDateKey)) ?? asOfDateKey;
      break;
  }
  return {
    startDateKey,
    endDateKey: asOfDateKey,
    dayCount: differenceInCalendarDays(asOfDateKey, startDateKey) + 1,
  };
}

export function createDailyAnalyticsSeries(
  records: RoutineInput,
  range: AnalyticsDateRange,
): DailyAnalyticsPoint[] {
  const byDate = routinesToDateMap(records);
  return eachDateKey(range.startDateKey, range.endDateKey).map((dateKey) => {
    const record = byDate[dateKey];
    if (!record) {
      return {
        dateKey,
        recorded: false,
        completionPercentage: null,
        activityCompletionPercentage: null,
        timeCompletionPercentage: null,
        completedActivityCount: 0,
        scheduledActivityCount: 0,
        completedSeconds: 0,
        elapsedSeconds: 0,
        plannedSeconds: 0,
        routineCompleted: false,
      };
    }
    const progress = deriveRoutineProgress(record);
    return {
      dateKey,
      recorded: true,
      completionPercentage: round(progress.activityCompletionPercentage),
      activityCompletionPercentage: round(progress.activityCompletionPercentage),
      timeCompletionPercentage: round(progress.timeCompletionPercentage),
      completedActivityCount: progress.completedActivityCount,
      scheduledActivityCount: progress.scheduledActivityCount,
      completedSeconds: progress.completedSeconds,
      elapsedSeconds: record.activities.reduce(
        (sum, activity) => sum + Math.max(0, activity.durationElapsedSeconds),
        0,
      ),
      plannedSeconds: progress.plannedSeconds,
      routineCompleted: progress.isRoutineComplete,
    };
  });
}

function aggregatePeriod(
  points: readonly DailyAnalyticsPoint[],
  keyFor: (dateKey: DateKey) => string,
  boundsFor: (dateKey: DateKey) => [DateKey, DateKey],
): PeriodAnalyticsBucket[] {
  const groups = new Map<string, DailyAnalyticsPoint[]>();
  for (const point of points) {
    const key = keyFor(point.dateKey);
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }
  return [...groups.entries()].map(([key, group]) => {
    const first = group[0];
    const last = group.at(-1);
    if (!first || !last) throw new Error('Analytics period cannot be empty.');
    const [naturalStart, naturalEnd] = boundsFor(first.dateKey);
    const recorded = group.filter((point) => point.recorded);
    const averageValue = average(
      recorded.flatMap((point) =>
        point.completionPercentage === null ? [] : [point.completionPercentage],
      ),
    );
    const completedRoutineDays = group.filter((point) => point.routineCompleted).length;
    return {
      key,
      startDateKey: naturalStart < first.dateKey ? first.dateKey : naturalStart,
      endDateKey:
        naturalEnd > last.dateKey ? last.dateKey : naturalEnd,
      calendarDays: group.length,
      recordedDays: recorded.length,
      completedRoutineDays,
      averageCompletionPercentage: averageValue === null ? null : round(averageValue),
      completionRate: round((completedRoutineDays / group.length) * 100),
    };
  });
}

export function aggregateWeekly(
  points: readonly DailyAnalyticsPoint[],
  weekStartsOn: 0 | 1 | 6 = 1,
): PeriodAnalyticsBucket[] {
  return aggregatePeriod(
    points,
    (dateKey) => startOfWeek(dateKey, weekStartsOn),
    (dateKey) => [startOfWeek(dateKey, weekStartsOn), endOfWeek(dateKey, weekStartsOn)],
  );
}

export function aggregateMonthly(
  points: readonly DailyAnalyticsPoint[],
): MonthlyAnalyticsBucket[] {
  return aggregatePeriod(points, startOfMonth, (dateKey) => [
    startOfMonth(dateKey),
    endOfMonth(dateKey),
  ]).map((bucket) => ({
    ...bucket,
    year: Number(bucket.key.slice(0, 4)),
    month: Number(bucket.key.slice(5, 7)),
  }));
}

export function calculateActivityBreakdown(
  records: RoutineInput,
  range: AnalyticsDateRange,
): ActivityAnalyticsBreakdown[] {
  const byDate = routinesToDateMap(records);
  const selected = Object.values(byDate).filter(
    (record) => record.dateKey >= range.startDateKey && record.dateKey <= range.endDateKey,
  );
  const accumulators = Object.fromEntries(
    SAVER_KEYS.map((key) => [
      key,
      { activityId: key, completedSeconds: 0, plannedSeconds: 0, completionCount: 0 },
    ]),
  ) as Record<
    (typeof SAVER_KEYS)[number],
    Omit<ActivityAnalyticsBreakdown, 'sharePercentage'>
  >;
  for (const record of selected) {
    for (const activity of record.activities) {
      const value = accumulators[activity.activityId];
      value.plannedSeconds += Math.max(0, activity.durationPlannedSeconds);
      value.completedSeconds += Math.max(0, activity.durationCompletedSeconds);
      if (activity.status === 'COMPLETED') value.completionCount += 1;
    }
  }
  const totalCompleted = Object.values(accumulators).reduce(
    (sum, item) => sum + item.completedSeconds,
    0,
  );
  return SAVER_KEYS.map((activityId) => ({
    ...accumulators[activityId],
    sharePercentage:
      totalCompleted <= 0
        ? 0
        : round((accumulators[activityId].completedSeconds / totalCompleted) * 100),
  }));
}

export function createHeatmap(points: readonly DailyAnalyticsPoint[]): ConsistencyHeatmapPoint[] {
  return points.map((point) => {
    if (!point.recorded || point.completionPercentage === null) {
      return { dateKey: point.dateKey, recorded: false, completionPercentage: null, intensity: null };
    }
    const value = point.completionPercentage;
    const intensity: 0 | 1 | 2 | 3 | 4 =
      value <= 0 ? 0 : value < 34 ? 1 : value < 67 ? 2 : value < 100 ? 3 : 4;
    return { dateKey: point.dateKey, recorded: true, completionPercentage: value, intensity };
  });
}

function rangeBefore(range: AnalyticsDateRange): AnalyticsDateRange {
  const endDateKey = addDays(range.startDateKey, -1);
  const startDateKey = addDays(endDateKey, -(range.dayCount - 1));
  return { startDateKey, endDateKey, dayCount: range.dayCount };
}

export function calculateTrend(
  records: RoutineInput,
  currentRange: AnalyticsDateRange,
  filter: AnalyticsFilter,
): AnalyticsTrend {
  if (filter === 'ALL_TIME') {
    return {
      available: false,
      currentRange,
      previousRange: null,
      currentAveragePercentage: null,
      previousAveragePercentage: null,
      percentagePointChange: null,
      direction: 'INSUFFICIENT_DATA',
    };
  }
  const previousRange = rangeBefore(currentRange);
  const currentValues = createDailyAnalyticsSeries(records, currentRange).flatMap((point) =>
    point.completionPercentage === null ? [] : [point.completionPercentage],
  );
  const previousValues = createDailyAnalyticsSeries(records, previousRange).flatMap((point) =>
    point.completionPercentage === null ? [] : [point.completionPercentage],
  );
  const currentAverage = average(currentValues);
  const previousAverage = average(previousValues);
  if (currentAverage === null || previousAverage === null) {
    return {
      available: false,
      currentRange,
      previousRange,
      currentAveragePercentage: currentAverage === null ? null : round(currentAverage),
      previousAveragePercentage: previousAverage === null ? null : round(previousAverage),
      percentagePointChange: null,
      direction: 'INSUFFICIENT_DATA',
    };
  }
  const change = round(currentAverage - previousAverage);
  return {
    available: true,
    currentRange,
    previousRange,
    currentAveragePercentage: round(currentAverage),
    previousAveragePercentage: round(previousAverage),
    percentagePointChange: change,
    direction: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'FLAT',
  };
}

function completionRateForWindow(
  records: RoutineInput,
  asOfDateKey: DateKey,
  calendarDays: number,
): number {
  const range: AnalyticsDateRange = {
    startDateKey: addDays(asOfDateKey, -(calendarDays - 1)),
    endDateKey: asOfDateKey,
    dayCount: calendarDays,
  };
  const completed = createDailyAnalyticsSeries(records, range).filter(
    (point) => point.routineCompleted,
  ).length;
  return round((completed / calendarDays) * 100);
}

export function calculateAnalyticsSummary(
  records: RoutineInput,
  range: AnalyticsDateRange,
  asOfDateKey: DateKey,
): AnalyticsSummary {
  const points = createDailyAnalyticsSeries(records, range);
  const recorded = points.filter((point) => point.recorded);
  const values = recorded.flatMap((point) =>
    point.completionPercentage === null ? [] : [point.completionPercentage],
  );
  const streaks = calculateStreakSummary(records, asOfDateKey);
  const averageValue = average(values);
  return {
    recordedDays: recorded.length,
    totalCompletedRoutines: recorded.filter((point) => point.routineCompleted).length,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    averageDailyCompletionPercentage: averageValue === null ? null : round(averageValue),
    totalCompletedSeconds: recorded.reduce((sum, point) => sum + point.completedSeconds, 0),
    weeklyCompletionRate: completionRateForWindow(records, asOfDateKey, 7),
    monthlyCompletionRate: completionRateForWindow(records, asOfDateKey, 30),
    sevenDayConsistencyScore: round(streaks.sevenDayConsistencyScore),
  };
}

export type BuildAnalyticsOptions = {
  filter?: AnalyticsFilter;
  asOfDateKey: DateKey;
  weekStartsOn?: 0 | 1 | 6;
};

export function buildAnalytics(
  records: RoutineInput,
  options: BuildAnalyticsOptions,
): AnalyticsResult {
  const byDate = routinesToDateMap(records);
  const filter = options.filter ?? 'LAST_30_DAYS';
  const range = getAnalyticsDateRange(filter, options.asOfDateKey, Object.keys(byDate));
  const daily = createDailyAnalyticsSeries(byDate, range);
  return {
    filter,
    range,
    summary: calculateAnalyticsSummary(byDate, range, options.asOfDateKey),
    daily,
    weekly: aggregateWeekly(daily, options.weekStartsOn),
    monthly: aggregateMonthly(daily),
    breakdown: calculateActivityBreakdown(byDate, range),
    heatmap: createHeatmap(daily),
    trend: calculateTrend(byDate, range, filter),
  };
}
