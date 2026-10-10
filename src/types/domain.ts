export type DateKey = string;
export type ISODateTimeString = string;

export const SAVER_KEYS = [
  'SILENCE',
  'AFFIRMATIONS',
  'VISUALIZATION',
  'EXERCISE',
  'READING',
  'SCRIBING',
] as const;

export type SaverKey = (typeof SAVER_KEYS)[number];

export type ActivityConfig = {
  id: SaverKey;
  letter: 'S' | 'A' | 'V' | 'E' | 'R';
  name: string;
  description: string;
  guidance: string;
  durationSeconds: number;
  enabled: boolean;
  order: number;
  accentColor: string;
};

export type ActivityStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';

export type CompletionMethod = 'TIMER' | 'MANUAL' | 'SKIPPED';

type DailyActivityBase = {
  activityId: SaverKey;
  durationPlannedSeconds: number;
  /** Observed wall-clock activity time, including partial or ultimately skipped work. */
  durationElapsedSeconds: number;
  /** Actual time credited to this activity, never an assumed configured duration. */
  durationCompletedSeconds: number;
};

export type DailyActivityRecord =
  | (DailyActivityBase & {
      status: 'NOT_STARTED';
      completionMethod?: never;
      startedAt?: never;
      completedAt?: never;
    })
  | (DailyActivityBase & {
      status: 'IN_PROGRESS';
      completionMethod?: never;
      startedAt: ISODateTimeString;
      completedAt?: never;
    })
  | (DailyActivityBase & {
      status: 'COMPLETED';
      completionMethod: Exclude<CompletionMethod, 'SKIPPED'>;
      startedAt?: ISODateTimeString | undefined;
      completedAt: ISODateTimeString;
    })
  | (DailyActivityBase & {
      status: 'SKIPPED';
      completionMethod: 'SKIPPED';
      startedAt?: ISODateTimeString | undefined;
      completedAt: ISODateTimeString;
    });

export type DailyRoutineRecord = {
  /** Immutable device-local calendar date assigned when the day was created. */
  dateKey: DateKey;
  /** Ordered scheduled-activity snapshot. Disabled activities are omitted. */
  activities: DailyActivityRecord[];
  startedAt?: ISODateTimeString | undefined;
  completedAt?: ISODateTimeString | undefined;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type DailyRoutineByDate = Record<DateKey, DailyRoutineRecord>;

export type TimerStatus = 'RUNNING' | 'PAUSED' | 'AWAITING_CONFIRMATION';

export type TimerSession = {
  id: string;
  dateKey: DateKey;
  activityId: SaverKey;
  plannedSeconds: number;
  status: TimerStatus;
  /** May contain a fractional value so repeated pause/resume cycles do not lose time. */
  accumulatedElapsedSeconds: number;
  startedAt: ISODateTimeString;
  runningSince?: ISODateTimeString | undefined;
  pausedAt?: ISODateTimeString | undefined;
  reachedZeroAt?: ISODateTimeString | undefined;
  updatedAt: ISODateTimeString;
};

export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId?: string | undefined;
};

export type UserPreferences = {
  theme: ThemePreference;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  notificationsEnabled: boolean;
  reminder: ReminderSettings;
  weekStartsOn: 0 | 1 | 6;
  onboardingCompleted: boolean;
};

export type AppSettings = {
  activityConfigs: ActivityConfig[];
  preferences: UserPreferences;
};

export type PersistedAppState = {
  settings: AppSettings;
  routinesByDate: DailyRoutineByDate;
  activeTimer: TimerSession | null;
};

export type StorageEnvelope = {
  schemaVersion: number;
  savedAt: ISODateTimeString;
  data: PersistedAppState;
};

export const IMPORT_BUNDLE_FORMAT = 'MIRACLE_MORNING_EXPORT' as const;

export type ImportBundle = {
  format: typeof IMPORT_BUNDLE_FORMAT;
  schemaVersion: number;
  exportedAt: ISODateTimeString;
  data: PersistedAppState;
};

export type ImportMode = 'REPLACE' | 'MERGE';

export type Achievement = {
  id: `ROUTINE_DAYS_${number}`;
  milestone: number;
  unlocked: boolean;
  unlockedAt?: DateKey | undefined;
};
