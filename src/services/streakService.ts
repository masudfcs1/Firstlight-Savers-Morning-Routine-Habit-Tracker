import type {
  Achievement,
  DailyRoutineByDate,
  DailyRoutineRecord,
  DateKey,
} from '../types';
import { addDays, deriveRoutineProgress, isDateKey } from '../utils';

export const ACHIEVEMENT_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export type StreakSummary = {
  currentStreak: number;
  longestStreak: number;
  totalCompletedRoutineDays: number;
  sevenDayConsistencyScore: number;
};

type RoutineInput = DailyRoutineByDate | readonly DailyRoutineRecord[];

export function routinesToDateMap(records: RoutineInput): DailyRoutineByDate {
  if (!Array.isArray(records)) return records as DailyRoutineByDate;
  return records.reduce<DailyRoutineByDate>((map, record) => {
    const existing = map[record.dateKey];
    if (!existing || existing.updatedAt <= record.updatedAt) map[record.dateKey] = record;
    return map;
  }, {});
}

export function isRoutineDayComplete(record: DailyRoutineRecord | undefined): boolean {
  return record ? deriveRoutineProgress(record).isRoutineComplete : false;
}

export function calculateCurrentStreak(
  records: RoutineInput,
  todayDateKey: DateKey,
  graceForCurrentDay = true,
): number {
  if (!isDateKey(todayDateKey)) throw new RangeError('Invalid current date key.');
  const byDate = routinesToDateMap(records);
  let cursor = todayDateKey;
  if (!isRoutineDayComplete(byDate[cursor])) {
    if (!graceForCurrentDay) return 0;
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (isRoutineDayComplete(byDate[cursor])) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function calculateLongestStreak(
  records: RoutineInput,
  throughDateKey?: DateKey,
): number {
  const byDate = routinesToDateMap(records);
  const completedDates = Object.keys(byDate)
    .filter((dateKey) =>
      isDateKey(dateKey) &&
      (!throughDateKey || dateKey <= throughDateKey) &&
      isRoutineDayComplete(byDate[dateKey]),
    )
    .sort();
  let longest = 0;
  let current = 0;
  let previous: string | undefined;
  for (const dateKey of completedDates) {
    current = previous && addDays(previous, 1) === dateKey ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = dateKey;
  }
  return longest;
}

export function calculateSevenDayConsistency(
  records: RoutineInput,
  todayDateKey: DateKey,
): number {
  const byDate = routinesToDateMap(records);
  let completed = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    if (isRoutineDayComplete(byDate[addDays(todayDateKey, -offset)])) completed += 1;
  }
  return (completed / 7) * 100;
}

export function calculateStreakSummary(
  records: RoutineInput,
  todayDateKey: DateKey,
): StreakSummary {
  const byDate = routinesToDateMap(records);
  const totalCompletedRoutineDays = Object.entries(byDate).filter(
    ([dateKey, record]) => dateKey <= todayDateKey && isRoutineDayComplete(record),
  ).length;
  return {
    currentStreak: calculateCurrentStreak(byDate, todayDateKey),
    longestStreak: calculateLongestStreak(byDate, todayDateKey),
    totalCompletedRoutineDays,
    sevenDayConsistencyScore: calculateSevenDayConsistency(byDate, todayDateKey),
  };
}

export function buildAchievements(records: RoutineInput, todayDateKey: DateKey): Achievement[] {
  const completedDates = Object.entries(routinesToDateMap(records))
    .filter(([dateKey, record]) => dateKey <= todayDateKey && isRoutineDayComplete(record))
    .map(([dateKey]) => dateKey)
    .sort();
  return ACHIEVEMENT_MILESTONES.map((milestone) => ({
    id: `ROUTINE_DAYS_${milestone}`,
    milestone,
    unlocked: completedDates.length >= milestone,
    ...(completedDates[milestone - 1] ? { unlockedAt: completedDates[milestone - 1] } : {}),
  }));
}
