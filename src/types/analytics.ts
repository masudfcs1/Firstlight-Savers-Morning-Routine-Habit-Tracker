import type { DateKey, SaverKey } from './domain';

export type AnalyticsFilter =
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_3_MONTHS'
  | 'LAST_6_MONTHS'
  | 'LAST_12_MONTHS'
  | 'ALL_TIME';

export type AnalyticsDateRange = {
  startDateKey: DateKey;
  endDateKey: DateKey;
  dayCount: number;
};

export type DailyAnalyticsPoint = {
  dateKey: DateKey;
  /** False means there is no saved routine; a saved zero-progress day is true with 0%. */
  recorded: boolean;
  completionPercentage: number | null;
  activityCompletionPercentage: number | null;
  timeCompletionPercentage: number | null;
  completedActivityCount: number;
  scheduledActivityCount: number;
  completedSeconds: number;
  elapsedSeconds: number;
  plannedSeconds: number;
  routineCompleted: boolean;
};

export type ConsistencyHeatmapPoint = {
  dateKey: DateKey;
  recorded: boolean;
  completionPercentage: number | null;
  /** Null represents missing; 0 represents a recorded day with zero progress. */
  intensity: 0 | 1 | 2 | 3 | 4 | null;
};

export type PeriodAnalyticsBucket = {
  key: string;
  startDateKey: DateKey;
  endDateKey: DateKey;
  calendarDays: number;
  recordedDays: number;
  completedRoutineDays: number;
  averageCompletionPercentage: number | null;
  /** Completed routines divided by calendar days, so missing dates remain meaningful. */
  completionRate: number;
};

export type MonthlyAnalyticsBucket = PeriodAnalyticsBucket & {
  year: number;
  month: number;
};

export type ActivityAnalyticsBreakdown = {
  activityId: SaverKey;
  completedSeconds: number;
  plannedSeconds: number;
  completionCount: number;
  sharePercentage: number;
};

export type AnalyticsTrend = {
  available: boolean;
  currentRange: AnalyticsDateRange;
  previousRange: AnalyticsDateRange | null;
  currentAveragePercentage: number | null;
  previousAveragePercentage: number | null;
  percentagePointChange: number | null;
  direction: 'UP' | 'DOWN' | 'FLAT' | 'INSUFFICIENT_DATA';
};

export type AnalyticsSummary = {
  recordedDays: number;
  totalCompletedRoutines: number;
  currentStreak: number;
  longestStreak: number;
  averageDailyCompletionPercentage: number | null;
  totalCompletedSeconds: number;
  weeklyCompletionRate: number;
  monthlyCompletionRate: number;
  sevenDayConsistencyScore: number;
};

export type AnalyticsResult = {
  filter: AnalyticsFilter;
  range: AnalyticsDateRange;
  summary: AnalyticsSummary;
  daily: DailyAnalyticsPoint[];
  weekly: PeriodAnalyticsBucket[];
  monthly: MonthlyAnalyticsBucket[];
  breakdown: ActivityAnalyticsBreakdown[];
  heatmap: ConsistencyHeatmapPoint[];
  trend: AnalyticsTrend;
};
