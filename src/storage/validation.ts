import { MAX_ROUTINE_RECORDS } from '../constants';
import { IMPORT_BUNDLE_FORMAT, SAVER_KEYS } from '../types';
import type {
  ActivityConfig,
  DailyActivityRecord,
  DailyRoutineRecord,
  ImportBundle,
  PersistedAppState,
  TimerSession,
  UserPreferences,
} from '../types';
import { isDateKey } from '../utils';

export class StorageValidationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'StorageValidationError';
    this.issues = issues;
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isSaverKey(value: unknown): value is (typeof SAVER_KEYS)[number] {
  return typeof value === 'string' && SAVER_KEYS.includes(value as (typeof SAVER_KEYS)[number]);
}

export function isActivityConfig(value: unknown): value is ActivityConfig {
  if (!isPlainObject(value)) return false;
  return (
    isSaverKey(value.id) &&
    typeof value.letter === 'string' &&
    ['S', 'A', 'V', 'E', 'R'].includes(value.letter) &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.guidance === 'string' &&
    isNonNegativeNumber(value.durationSeconds) &&
    value.durationSeconds <= 86_400 &&
    typeof value.enabled === 'boolean' &&
    isIntegerInRange(value.order, 0, 100) &&
    typeof value.accentColor === 'string'
  );
}

export function isDailyActivityRecord(value: unknown): value is DailyActivityRecord {
  if (!isPlainObject(value)) return false;
  if (
    !isSaverKey(value.activityId) ||
    !isNonNegativeNumber(value.durationPlannedSeconds) ||
    !isNonNegativeNumber(value.durationElapsedSeconds) ||
    !isNonNegativeNumber(value.durationCompletedSeconds)
  ) {
    return false;
  }
  switch (value.status) {
    case 'NOT_STARTED':
      return value.completionMethod === undefined && value.completedAt === undefined;
    case 'IN_PROGRESS':
      return isTimestamp(value.startedAt) && value.completionMethod === undefined;
    case 'COMPLETED':
      return (
        (value.completionMethod === 'TIMER' || value.completionMethod === 'MANUAL') &&
        isTimestamp(value.completedAt) &&
        (value.startedAt === undefined || isTimestamp(value.startedAt))
      );
    case 'SKIPPED':
      return (
        value.completionMethod === 'SKIPPED' &&
        value.durationCompletedSeconds === 0 &&
        isTimestamp(value.completedAt) &&
        (value.startedAt === undefined || isTimestamp(value.startedAt))
      );
    default:
      return false;
  }
}

export function isDailyRoutineRecord(value: unknown): value is DailyRoutineRecord {
  if (!isPlainObject(value) || !isDateKey(value.dateKey) || !Array.isArray(value.activities)) {
    return false;
  }
  if (
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    (value.startedAt !== undefined && !isTimestamp(value.startedAt)) ||
    (value.completedAt !== undefined && !isTimestamp(value.completedAt))
  ) {
    return false;
  }
  const ids = new Set<string>();
  for (const activity of value.activities) {
    if (!isDailyActivityRecord(activity) || ids.has(activity.activityId)) return false;
    ids.add(activity.activityId);
  }
  return true;
}

export function isTimerSession(value: unknown): value is TimerSession {
  if (!isPlainObject(value)) return false;
  if (
    typeof value.id !== 'string' ||
    !isDateKey(value.dateKey) ||
    !isSaverKey(value.activityId) ||
    !isNonNegativeNumber(value.plannedSeconds) ||
    !isNonNegativeNumber(value.accumulatedElapsedSeconds) ||
    !isTimestamp(value.startedAt) ||
    !isTimestamp(value.updatedAt)
  ) {
    return false;
  }
  if (value.status === 'RUNNING') return isTimestamp(value.runningSince);
  if (value.status === 'PAUSED') {
    return value.pausedAt === undefined || isTimestamp(value.pausedAt);
  }
  return value.status === 'AWAITING_CONFIRMATION' && isTimestamp(value.reachedZeroAt);
}

function isPreferences(value: unknown): value is UserPreferences {
  if (!isPlainObject(value) || !isPlainObject(value.reminder)) return false;
  return (
    ['SYSTEM', 'LIGHT', 'DARK'].includes(String(value.theme)) &&
    typeof value.hapticsEnabled === 'boolean' &&
    typeof value.reducedMotion === 'boolean' &&
    typeof value.notificationsEnabled === 'boolean' &&
    typeof value.onboardingCompleted === 'boolean' &&
    [0, 1, 6].includes(Number(value.weekStartsOn)) &&
    typeof value.reminder.enabled === 'boolean' &&
    isIntegerInRange(value.reminder.hour, 0, 23) &&
    isIntegerInRange(value.reminder.minute, 0, 59) &&
    (value.reminder.notificationId === undefined ||
      typeof value.reminder.notificationId === 'string')
  );
}

export function validatePersistedState(value: unknown): value is PersistedAppState {
  if (!isPlainObject(value) || !isPlainObject(value.settings)) return false;
  if (
    !Array.isArray(value.settings.activityConfigs) ||
    !value.settings.activityConfigs.every(isActivityConfig) ||
    !isPreferences(value.settings.preferences) ||
    !isPlainObject(value.routinesByDate) ||
    !(value.activeTimer === null || isTimerSession(value.activeTimer))
  ) {
    return false;
  }
  const configs = value.settings.activityConfigs as ActivityConfig[];
  if (new Set(configs.map((item) => item.id)).size !== configs.length) return false;
  const entries = Object.entries(value.routinesByDate);
  if (entries.length > MAX_ROUTINE_RECORDS) return false;
  return entries.every(
    ([dateKey, record]) => isDateKey(dateKey) && isDailyRoutineRecord(record) && record.dateKey === dateKey,
  );
}

export function assertValidPersistedState(value: unknown): asserts value is PersistedAppState {
  if (!validatePersistedState(value)) {
    throw new StorageValidationError('Stored app data is malformed or unsafe to load.');
  }
}

export function validateImportBundle(value: unknown): value is ImportBundle {
  return (
    isPlainObject(value) &&
    value.format === IMPORT_BUNDLE_FORMAT &&
    typeof value.schemaVersion === 'number' &&
    isTimestamp(value.exportedAt) &&
    validatePersistedState(value.data)
  );
}
