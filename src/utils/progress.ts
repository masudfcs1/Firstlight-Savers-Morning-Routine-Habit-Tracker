import type {
  ActivityConfig,
  CompletionMethod,
  DailyActivityRecord,
  DailyRoutineRecord,
  DateKey,
  SaverKey,
} from '../types';
import { isDateKey } from './date';

export type RoutineProgress = {
  scheduledActivityCount: number;
  completedActivityCount: number;
  skippedActivityCount: number;
  activityCompletionPercentage: number;
  plannedSeconds: number;
  completedSeconds: number;
  timeCompletionPercentage: number;
  estimatedRemainingSeconds: number;
  isRoutineComplete: boolean;
};

export function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function percentage(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return clamp((numerator / denominator) * 100, 0, 100);
}

export function deriveRoutineProgress(record: Pick<DailyRoutineRecord, 'activities'>): RoutineProgress {
  const activities = record.activities;
  const scheduledActivityCount = activities.length;
  const completedActivityCount = activities.filter((item) => item.status === 'COMPLETED').length;
  const skippedActivityCount = activities.filter((item) => item.status === 'SKIPPED').length;
  const plannedSeconds = activities.reduce(
    (sum, item) => sum + nonNegative(item.durationPlannedSeconds),
    0,
  );
  const completedSeconds = activities.reduce(
    (sum, item) => sum + nonNegative(item.durationCompletedSeconds),
    0,
  );
  const estimatedRemainingSeconds = activities.reduce((sum, item) => {
    if (item.status === 'COMPLETED' || item.status === 'SKIPPED') return sum;
    return (
      sum +
      Math.max(
        0,
        nonNegative(item.durationPlannedSeconds) - nonNegative(item.durationElapsedSeconds),
      )
    );
  }, 0);

  return {
    scheduledActivityCount,
    completedActivityCount,
    skippedActivityCount,
    activityCompletionPercentage: percentage(completedActivityCount, scheduledActivityCount),
    plannedSeconds,
    completedSeconds,
    timeCompletionPercentage: percentage(completedSeconds, plannedSeconds),
    estimatedRemainingSeconds,
    isRoutineComplete:
      scheduledActivityCount > 0 && completedActivityCount === scheduledActivityCount,
  };
}

export function createDailyRoutineRecord(
  dateKey: DateKey,
  configs: readonly ActivityConfig[],
  now: string = new Date().toISOString(),
): DailyRoutineRecord {
  if (!isDateKey(dateKey)) throw new RangeError(`Invalid routine date key: ${dateKey}`);
  const enabledIds = configs.filter((config) => config.enabled).map((config) => config.id);
  if (new Set(enabledIds).size !== enabledIds.length) {
    throw new Error('A daily routine cannot contain duplicate activity ids.');
  }
  const activities: DailyActivityRecord[] = configs
    .filter((config) => config.enabled)
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((config) => ({
      activityId: config.id,
      durationPlannedSeconds: Math.round(nonNegative(config.durationSeconds)),
      durationElapsedSeconds: 0,
      durationCompletedSeconds: 0,
      status: 'NOT_STARTED' as const,
    }));

  return { dateKey, activities, createdAt: now, updatedAt: now };
}

export function startActivity(
  record: DailyRoutineRecord,
  activityId: SaverKey,
  at: string = new Date().toISOString(),
): DailyRoutineRecord {
  let changed = false;
  const activities = record.activities.map((activity): DailyActivityRecord => {
    if (activity.activityId !== activityId || activity.status !== 'NOT_STARTED') return activity;
    changed = true;
    return { ...activity, status: 'IN_PROGRESS', startedAt: at };
  });
  if (!changed) return record;
  return { ...record, activities, startedAt: record.startedAt ?? at, updatedAt: at };
}

export type CompleteActivityInput = {
  method: CompletionMethod;
  durationElapsedSeconds?: number;
  durationCompletedSeconds: number;
  completedAt?: string;
  startedAt?: string;
};

/** Idempotent for terminal activity records, preventing rapid duplicate completion writes. */
export function completeActivity(
  record: DailyRoutineRecord,
  activityId: SaverKey,
  input: CompleteActivityInput,
): DailyRoutineRecord {
  const completedAt = input.completedAt ?? new Date().toISOString();
  let changed = false;
  const activities = record.activities.map((activity): DailyActivityRecord => {
    if (activity.activityId !== activityId) return activity;
    if (activity.status === 'COMPLETED' || activity.status === 'SKIPPED') return activity;
    changed = true;
    const base = {
      activityId: activity.activityId,
      durationPlannedSeconds: activity.durationPlannedSeconds,
      durationElapsedSeconds: nonNegative(
        input.durationElapsedSeconds ?? activity.durationElapsedSeconds,
      ),
      durationCompletedSeconds:
        input.method === 'SKIPPED' ? 0 : nonNegative(input.durationCompletedSeconds),
      startedAt: activity.startedAt ?? input.startedAt,
      completedAt,
    };
    return input.method === 'SKIPPED'
      ? { ...base, status: 'SKIPPED', completionMethod: 'SKIPPED' }
      : { ...base, status: 'COMPLETED', completionMethod: input.method };
  });
  if (!changed) return record;
  const next = {
    ...record,
    activities,
    startedAt: record.startedAt ?? input.startedAt ?? completedAt,
    updatedAt: completedAt,
  };
  return deriveRoutineProgress(next).isRoutineComplete
    ? { ...next, completedAt: record.completedAt ?? completedAt }
    : (() => {
        const { completedAt: _completedAt, ...withoutCompletion } = next;
        return withoutCompletion;
      })();
}

export function setActivityElapsed(
  record: DailyRoutineRecord,
  activityId: SaverKey,
  elapsedSeconds: number,
  at: string = new Date().toISOString(),
): DailyRoutineRecord {
  let changed = false;
  const activities = record.activities.map((activity): DailyActivityRecord => {
    if (activity.activityId !== activityId || activity.status !== 'IN_PROGRESS') return activity;
    changed = true;
    return { ...activity, durationElapsedSeconds: nonNegative(elapsedSeconds) };
  });
  return changed ? { ...record, activities, updatedAt: at } : record;
}
