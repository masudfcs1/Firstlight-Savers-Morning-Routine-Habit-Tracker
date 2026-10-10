import {
  CURRENT_SCHEMA_VERSION,
  createDefaultActivityConfigs,
  createDefaultPersistedState,
} from '../constants';
import type {
  ActivityConfig,
  DailyActivityRecord,
  DailyRoutineByDate,
  DailyRoutineRecord,
  PersistedAppState,
  SaverKey,
  StorageEnvelope,
  ThemePreference,
  TimerSession,
} from '../types';
import { SAVER_KEYS } from '../types';
import { isDateKey } from '../utils';
import {
  StorageValidationError,
  assertValidPersistedState,
  isPlainObject,
} from './validation';

export class MigrationError extends StorageValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function iso(value: unknown, fallback: string): string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime()) ? value : fallback;
}

function saverKey(value: unknown): SaverKey | undefined {
  return typeof value === 'string' && SAVER_KEYS.includes(value as SaverKey)
    ? (value as SaverKey)
    : undefined;
}

function theme(value: unknown): ThemePreference {
  const normalized = String(value ?? '').toUpperCase();
  return normalized === 'LIGHT' || normalized === 'DARK' ? normalized : 'SYSTEM';
}

function migrateConfigs(value: unknown): ActivityConfig[] {
  const defaults = createDefaultActivityConfigs();
  if (!Array.isArray(value)) return defaults;
  const byId = new Map<SaverKey, Record<string, unknown>>();
  for (const candidate of value) {
    if (!isPlainObject(candidate)) continue;
    const id = saverKey(candidate.id ?? candidate.activityId ?? candidate.key);
    if (id) byId.set(id, candidate);
  }
  return defaults.map((fallback) => {
    const legacy = byId.get(fallback.id);
    if (!legacy) return fallback;
    const minutes = finite(legacy.durationMinutes, -1);
    const durationSeconds =
      typeof legacy.durationSeconds === 'number'
        ? finite(legacy.durationSeconds, fallback.durationSeconds)
        : minutes >= 0
          ? minutes * 60
          : fallback.durationSeconds;
    return {
      ...fallback,
      name: stringValue(legacy.name, fallback.name),
      description: stringValue(legacy.description, fallback.description),
      guidance: stringValue(legacy.guidance ?? legacy.prompt, fallback.guidance),
      durationSeconds,
      enabled: typeof legacy.enabled === 'boolean' ? legacy.enabled : fallback.enabled,
      order: Number.isInteger(legacy.order) ? Number(legacy.order) : fallback.order,
      accentColor: stringValue(legacy.accentColor ?? legacy.color, fallback.accentColor),
    };
  });
}

function migrateActivity(value: unknown, now: string): DailyActivityRecord | undefined {
  if (!isPlainObject(value)) return undefined;
  const activityId = saverKey(value.activityId ?? value.id ?? value.key);
  if (!activityId) return undefined;
  const durationPlannedSeconds = finite(
    value.durationPlannedSeconds ?? value.plannedDurationSeconds ?? value.durationSeconds,
  );
  const durationElapsedSeconds = finite(
    value.durationElapsedSeconds ??
      value.elapsedSeconds ??
      value.durationCompletedSeconds ??
      value.completedDurationSeconds,
  );
  const legacyCompleted = finite(
    value.durationCompletedSeconds ?? value.completedDurationSeconds ?? value.elapsedSeconds,
  );
  const status = String(value.status ?? 'NOT_STARTED').toUpperCase();
  const startedAt = value.startedAt ? iso(value.startedAt, now) : undefined;
  if (status === 'SKIPPED' || value.completionMethod === 'SKIPPED') {
    return {
      activityId,
      durationPlannedSeconds,
      durationElapsedSeconds,
      durationCompletedSeconds: 0,
      status: 'SKIPPED',
      completionMethod: 'SKIPPED',
      ...(startedAt ? { startedAt } : {}),
      completedAt: iso(value.completedAt, now),
    };
  }
  if (status === 'COMPLETED') {
    const method = value.completionMethod === 'TIMER' ? 'TIMER' : 'MANUAL';
    return {
      activityId,
      durationPlannedSeconds,
      durationElapsedSeconds,
      durationCompletedSeconds: legacyCompleted,
      status: 'COMPLETED',
      completionMethod: method,
      ...(startedAt ? { startedAt } : {}),
      completedAt: iso(value.completedAt, now),
    };
  }
  if (status === 'IN_PROGRESS') {
    return {
      activityId,
      durationPlannedSeconds,
      durationElapsedSeconds,
      durationCompletedSeconds: 0,
      status: 'IN_PROGRESS',
      startedAt: startedAt ?? now,
    };
  }
  return {
    activityId,
    durationPlannedSeconds,
    durationElapsedSeconds: 0,
    durationCompletedSeconds: 0,
    status: 'NOT_STARTED',
  };
}

function migrateRoutine(value: unknown, fallbackDate: string | undefined, now: string): DailyRoutineRecord | undefined {
  if (!isPlainObject(value)) return undefined;
  const dateKey = stringValue(value.dateKey ?? value.date, fallbackDate ?? '');
  if (!isDateKey(dateKey)) return undefined;
  const createdAt = iso(value.createdAt ?? value.startedAt, now);
  if (!Array.isArray(value.activities)) {
    throw new MigrationError(`Routine ${dateKey} has no valid activity list.`);
  }
  const activities = value.activities.map((activity) => {
    const migrated = migrateActivity(activity, createdAt);
    if (!migrated) throw new MigrationError(`Routine ${dateKey} contains an invalid activity.`);
    return migrated;
  });
  const unique = activities.filter(
    (activity, index) =>
      activities.findIndex((candidate) => candidate.activityId === activity.activityId) === index,
  );
  return {
    dateKey,
    activities: unique,
    ...(value.startedAt ? { startedAt: iso(value.startedAt, createdAt) } : {}),
    ...(value.completedAt ? { completedAt: iso(value.completedAt, now) } : {}),
    createdAt,
    updatedAt: iso(value.updatedAt ?? value.completedAt, createdAt),
  };
}

function migrateRoutines(value: unknown, now: string): DailyRoutineByDate {
  const result: DailyRoutineByDate = {};
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const record = migrateRoutine(candidate, undefined, now);
      if (record) result[record.dateKey] = record;
    }
  } else if (isPlainObject(value)) {
    for (const [dateKey, candidate] of Object.entries(value)) {
      const record = migrateRoutine(candidate, dateKey, now);
      if (record) result[record.dateKey] = record;
    }
  }
  return result;
}

function migrateTimer(value: unknown, now: string): TimerSession | null {
  if (!isPlainObject(value)) return null;
  const activityId = saverKey(value.activityId);
  const dateKey = typeof value.dateKey === 'string' ? value.dateKey : '';
  if (!activityId || !isDateKey(dateKey)) return null;
  const startedAt = iso(value.startedAt ?? value.runningSince, now);
  const rawStatus = String(value.status ?? 'PAUSED').toUpperCase();
  const status =
    rawStatus === 'RUNNING' || rawStatus === 'AWAITING_CONFIRMATION' ? rawStatus : 'PAUSED';
  const timer: TimerSession = {
    id: stringValue(value.id, `${dateKey}:${activityId}:migrated`),
    dateKey,
    activityId,
    plannedSeconds: finite(value.plannedSeconds ?? value.plannedDurationSeconds),
    status,
    accumulatedElapsedSeconds: finite(
      value.accumulatedElapsedSeconds ?? value.elapsedSeconds,
    ),
    startedAt,
    updatedAt: iso(value.updatedAt, now),
    ...(status === 'RUNNING'
      ? { runningSince: iso(value.runningSince, startedAt) }
      : status === 'PAUSED'
        ? { pausedAt: iso(value.pausedAt, now) }
        : { reachedZeroAt: iso(value.reachedZeroAt, now) }),
  };
  return timer;
}

export function migrateV1Data(value: unknown, now: string): PersistedAppState {
  if (!isPlainObject(value)) throw new MigrationError('Version 1 data is not an object.');
  const recognizedKeys = [
    'settings',
    'routinesByDate',
    'dailyRecords',
    'routines',
    'days',
    'activityConfigs',
    'activeTimer',
    'timerSession',
  ];
  if (!recognizedKeys.some((key) => key in value)) {
    throw new MigrationError('Version 1 data contains no recognized app fields.');
  }
  const defaults = createDefaultPersistedState();
  const legacySettings = isPlainObject(value.settings) ? value.settings : {};
  const legacyPreferences = isPlainObject(legacySettings.preferences)
    ? legacySettings.preferences
    : legacySettings;
  const legacyReminder = isPlainObject(legacyPreferences.reminder)
    ? legacyPreferences.reminder
    : {};
  const routineSource =
    value.routinesByDate ?? value.dailyRecords ?? value.routines ?? value.days ?? {};
  const migrated: PersistedAppState = {
    settings: {
      activityConfigs: migrateConfigs(
        legacySettings.activityConfigs ?? legacySettings.activities ?? value.activityConfigs,
      ),
      preferences: {
        ...defaults.settings.preferences,
        theme: theme(legacyPreferences.theme),
        hapticsEnabled:
          typeof legacyPreferences.hapticsEnabled === 'boolean'
            ? legacyPreferences.hapticsEnabled
            : defaults.settings.preferences.hapticsEnabled,
        reducedMotion:
          typeof legacyPreferences.reducedMotion === 'boolean'
            ? legacyPreferences.reducedMotion
            : defaults.settings.preferences.reducedMotion,
        notificationsEnabled:
          typeof legacyPreferences.notificationsEnabled === 'boolean'
            ? legacyPreferences.notificationsEnabled
            : Boolean(legacyReminder.enabled),
        onboardingCompleted:
          typeof legacyPreferences.onboardingCompleted === 'boolean'
            ? legacyPreferences.onboardingCompleted
            : false,
        weekStartsOn: [0, 1, 6].includes(Number(legacyPreferences.weekStartsOn))
          ? (Number(legacyPreferences.weekStartsOn) as 0 | 1 | 6)
          : 1,
        reminder: {
          enabled: Boolean(legacyReminder.enabled),
          hour: Math.min(23, Math.max(0, Math.floor(finite(legacyReminder.hour, 6)))),
          minute: Math.min(59, Math.max(0, Math.floor(finite(legacyReminder.minute, 30)))),
          ...(typeof legacyReminder.notificationId === 'string'
            ? { notificationId: legacyReminder.notificationId }
            : {}),
        },
      },
    },
    routinesByDate: migrateRoutines(routineSource, now),
    activeTimer: migrateTimer(value.activeTimer ?? value.timerSession, now),
  };
  assertValidPersistedState(migrated);
  return migrated;
}

export function migrateStoredValue(
  value: unknown,
  now: string = new Date().toISOString(),
): StorageEnvelope {
  if (!isPlainObject(value)) throw new MigrationError('Stored data is not a versioned object.');
  const version = Number(value.schemaVersion ?? 1);
  if (!Number.isInteger(version) || version < 1) throw new MigrationError('Invalid schema version.');
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new MigrationError(
      `This backup uses schema ${version}, newer than supported schema ${CURRENT_SCHEMA_VERSION}.`,
    );
  }
  if (version === CURRENT_SCHEMA_VERSION) {
    assertValidPersistedState(value.data);
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt: iso(value.savedAt, now),
      data: value.data,
    };
  }
  const data = migrateV1Data(value.data ?? value, now);
  return { schemaVersion: CURRENT_SCHEMA_VERSION, savedAt: now, data };
}
