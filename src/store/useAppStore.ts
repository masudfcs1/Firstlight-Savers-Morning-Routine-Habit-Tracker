import { create } from 'zustand';

import { createDefaultActivityConfigs, createDefaultPersistedState } from '../constants';
import {
  createTimerSession,
  getTimerSnapshot,
  pauseTimer,
  restartTimer,
  resumeTimer,
  synchronizeTimer,
} from '../services';
import { clearPersistedData, loadPersistedData, savePersistedData } from '../storage';
import type {
  ActivityConfig,
  CompletionMethod,
  DateKey,
  PersistedAppState,
  SaverKey,
  ThemePreference,
  UserPreferences,
} from '../types';
import {
  completeActivity,
  createDailyRoutineRecord,
  setActivityElapsed,
  startActivity,
  toLocalDateKey,
} from '../utils';

type EditableActivityFields = Pick<
  ActivityConfig,
  'durationSeconds' | 'enabled' | 'guidance' | 'description'
>;

export type AppStore = PersistedAppState & {
  hydrated: boolean;
  storageError: string | null;
  hydrate: () => Promise<void>;
  ensureRoutine: (dateKey?: DateKey) => DateKey;
  beginActivity: (dateKey: DateKey, activityId: SaverKey) => boolean;
  switchActivity: (
    dateKey: DateKey,
    activityId: SaverKey,
    now?: Date | number | string,
  ) => boolean;
  syncActiveTimer: (now?: Date | number | string) => void;
  pauseActiveTimer: (now?: Date | number | string) => void;
  resumeActiveTimer: (now?: Date | number | string) => void;
  restartActiveTimer: (now?: Date | number | string) => void;
  confirmTimerCompletion: (now?: Date | number | string) => void;
  completeActivityManually: (dateKey: DateKey, activityId: SaverKey) => void;
  skipActivity: (dateKey: DateKey, activityId: SaverKey) => void;
  updateActivityConfig: (
    activityId: SaverKey,
    patch: Partial<EditableActivityFields>,
  ) => void;
  moveActivity: (activityId: SaverKey, direction: -1 | 1) => void;
  setThemePreference: (theme: ThemePreference) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  completeOnboarding: () => void;
  resetRoutineSettings: () => void;
  replacePersistedState: (state: PersistedAppState) => void;
  clearAllData: () => Promise<boolean>;
  dismissStorageError: () => void;
};

let persistenceQueue: Promise<void> = Promise.resolve();

function persistedSlice(state: AppStore): PersistedAppState {
  return {
    settings: state.settings,
    routinesByDate: state.routinesByDate,
    activeTimer: state.activeTimer,
  };
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Your changes could not be saved.';
}

export const useAppStore = create<AppStore>((set, get) => {
  const queueSave = () => {
    const snapshot = persistedSlice(get());
    persistenceQueue = persistenceQueue
      .catch(() => undefined)
      .then(() => savePersistedData(snapshot))
      .catch((error: unknown) => {
        set({ storageError: messageFromError(error) });
      });
  };

  const completeWithMethod = (
    dateKey: DateKey,
    activityId: SaverKey,
    method: CompletionMethod,
    elapsedSeconds: number,
    completedSeconds: number,
    nowValue: Date | number | string = Date.now(),
  ) => {
    const date = nowValue instanceof Date ? nowValue : new Date(nowValue);
    if (!Number.isFinite(date.getTime())) return;
    const completedAt = date.toISOString();
    let changed = false;

    set((state) => {
      const record = state.routinesByDate[dateKey];
      if (!record) return state;
      const nextRecord = completeActivity(record, activityId, {
        method,
        durationElapsedSeconds: Math.max(0, elapsedSeconds),
        durationCompletedSeconds: Math.max(0, completedSeconds),
        completedAt,
      });
      if (nextRecord === record) return state;
      changed = true;
      const clearsTimer =
        state.activeTimer?.dateKey === dateKey &&
        state.activeTimer.activityId === activityId;
      return {
        routinesByDate: { ...state.routinesByDate, [dateKey]: nextRecord },
        activeTimer: clearsTimer ? null : state.activeTimer,
      };
    });
    if (changed) queueSave();
  };

  return {
    ...createDefaultPersistedState(),
    hydrated: false,
    storageError: null,

    hydrate: async () => {
      try {
        const loaded = await loadPersistedData();
        const activeTimer = loaded.activeTimer
          ? synchronizeTimer(loaded.activeTimer, Date.now())
          : null;
        set({ ...loaded, activeTimer, hydrated: true, storageError: null });
        if (activeTimer !== loaded.activeTimer) queueSave();
      } catch (error) {
        set({
          ...createDefaultPersistedState(),
          hydrated: true,
          storageError: messageFromError(error),
        });
      }
    },

    ensureRoutine: (requestedDateKey) => {
      const dateKey = requestedDateKey ?? toLocalDateKey();
      let created = false;
      set((state) => {
        if (state.routinesByDate[dateKey]) return state;
        created = true;
        return {
          routinesByDate: {
            ...state.routinesByDate,
            [dateKey]: createDailyRoutineRecord(
              dateKey,
              state.settings.activityConfigs,
            ),
          },
        };
      });
      if (created) queueSave();
      return dateKey;
    },

    beginActivity: (dateKey, activityId) => {
      const state = get();
      if (
        state.activeTimer &&
        (state.activeTimer.dateKey !== dateKey || state.activeTimer.activityId !== activityId)
      ) {
        return false;
      }

      const existingRecord = state.routinesByDate[dateKey];
      const record =
        existingRecord ??
        createDailyRoutineRecord(dateKey, state.settings.activityConfigs);
      const activity = record.activities.find((item) => item.activityId === activityId);
      if (!activity || activity.status === 'COMPLETED' || activity.status === 'SKIPPED') {
        return false;
      }
      if (state.activeTimer) return true;

      const now = new Date();
      set((current) => ({
        routinesByDate: {
          ...current.routinesByDate,
          [dateKey]: startActivity(record, activityId, now.toISOString()),
        },
        activeTimer: createTimerSession({
          dateKey,
          activityId,
          plannedSeconds: activity.durationPlannedSeconds,
          initialElapsedSeconds: activity.durationElapsedSeconds,
          now,
        }),
      }));
      queueSave();
      return true;
    },

    switchActivity: (dateKey, activityId, nowValue = Date.now()) => {
      const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
      if (!Number.isFinite(now.getTime())) return false;
      const state = get();
      const record = state.routinesByDate[dateKey];
      const target = record?.activities.find((item) => item.activityId === activityId);
      if (!record || !target || target.status === 'COMPLETED' || target.status === 'SKIPPED') {
        return false;
      }
      if (state.activeTimer?.dateKey === dateKey && state.activeTimer.activityId === activityId) {
        return true;
      }
      if (state.activeTimer?.status === 'AWAITING_CONFIRMATION') return false;
      if (state.activeTimer && state.activeTimer.dateKey !== dateKey) return false;

      let nextRecord = record;
      if (state.activeTimer) {
        const snapshot = getTimerSnapshot(state.activeTimer, now);
        nextRecord = setActivityElapsed(
          nextRecord,
          state.activeTimer.activityId,
          snapshot.preciseElapsedSeconds,
          now.toISOString(),
        );
      }
      nextRecord = startActivity(nextRecord, activityId, now.toISOString());
      const nextTarget = nextRecord.activities.find((item) => item.activityId === activityId);
      if (!nextTarget) return false;

      set((current) => ({
        routinesByDate: { ...current.routinesByDate, [dateKey]: nextRecord },
        activeTimer: createTimerSession({
          dateKey,
          activityId,
          plannedSeconds: nextTarget.durationPlannedSeconds,
          initialElapsedSeconds: nextTarget.durationElapsedSeconds,
          now,
        }),
      }));
      queueSave();
      return true;
    },

    syncActiveTimer: (now = Date.now()) => {
      const session = get().activeTimer;
      if (!session) return;
      const nextSession = synchronizeTimer(session, now);
      const snapshot = getTimerSnapshot(nextSession, now);
      set((state) => {
        const record = state.routinesByDate[session.dateKey];
        return {
          activeTimer: nextSession,
          routinesByDate: record
            ? {
                ...state.routinesByDate,
                [session.dateKey]: setActivityElapsed(
                  record,
                  session.activityId,
                  snapshot.preciseElapsedSeconds,
                ),
              }
            : state.routinesByDate,
        };
      });
      queueSave();
    },

    pauseActiveTimer: (now = Date.now()) => {
      const session = get().activeTimer;
      if (!session) return;
      const nextSession = pauseTimer(session, now);
      const snapshot = getTimerSnapshot(nextSession, now);
      set((state) => {
        const record = state.routinesByDate[session.dateKey];
        return {
          activeTimer: nextSession,
          routinesByDate: record
            ? {
                ...state.routinesByDate,
                [session.dateKey]: setActivityElapsed(
                  record,
                  session.activityId,
                  snapshot.preciseElapsedSeconds,
                ),
              }
            : state.routinesByDate,
        };
      });
      queueSave();
    },

    resumeActiveTimer: (now = Date.now()) => {
      const session = get().activeTimer;
      if (!session || session.status !== 'PAUSED') return;
      set({ activeTimer: resumeTimer(session, now) });
      queueSave();
    },

    restartActiveTimer: (now = Date.now()) => {
      const session = get().activeTimer;
      if (!session) return;
      const nextSession = restartTimer(session, now);
      set((state) => {
        const record = state.routinesByDate[session.dateKey];
        return {
          activeTimer: nextSession,
          routinesByDate: record
            ? {
                ...state.routinesByDate,
                [session.dateKey]: setActivityElapsed(
                  record,
                  session.activityId,
                  0,
                ),
              }
            : state.routinesByDate,
        };
      });
      queueSave();
    },

    confirmTimerCompletion: (now = Date.now()) => {
      const session = get().activeTimer;
      if (!session) return;
      const snapshot = getTimerSnapshot(session, now);
      completeWithMethod(
        session.dateKey,
        session.activityId,
        'TIMER',
        snapshot.preciseElapsedSeconds,
        snapshot.preciseElapsedSeconds,
        now,
      );
    },

    completeActivityManually: (dateKey, activityId) => {
      const record = get().routinesByDate[dateKey];
      const activity = record?.activities.find((item) => item.activityId === activityId);
      if (!activity) return;
      const session = get().activeTimer;
      const elapsed =
        session?.dateKey === dateKey && session.activityId === activityId
          ? getTimerSnapshot(session).preciseElapsedSeconds
          : activity.durationElapsedSeconds;
      completeWithMethod(dateKey, activityId, 'MANUAL', elapsed, elapsed);
    },

    skipActivity: (dateKey, activityId) => {
      const record = get().routinesByDate[dateKey];
      const activity = record?.activities.find((item) => item.activityId === activityId);
      if (!activity) return;
      const session = get().activeTimer;
      const elapsed =
        session?.dateKey === dateKey && session.activityId === activityId
          ? getTimerSnapshot(session).preciseElapsedSeconds
          : activity.durationElapsedSeconds;
      completeWithMethod(dateKey, activityId, 'SKIPPED', elapsed, 0);
    },

    updateActivityConfig: (activityId, patch) => {
      set((state) => ({
        settings: {
          ...state.settings,
          activityConfigs: state.settings.activityConfigs.map((activity) => {
            if (activity.id !== activityId) return activity;
            const durationSeconds =
              patch.durationSeconds == null
                ? activity.durationSeconds
                : Math.min(7_200, Math.max(60, Math.round(patch.durationSeconds)));
            return { ...activity, ...patch, durationSeconds };
          }),
        },
      }));
      queueSave();
    },

    moveActivity: (activityId, direction) => {
      set((state) => {
        const ordered = state.settings.activityConfigs
          .slice()
          .sort((left, right) => left.order - right.order);
        const from = ordered.findIndex((item) => item.id === activityId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= ordered.length) return state;
        const [moved] = ordered.splice(from, 1);
        if (!moved) return state;
        ordered.splice(to, 0, moved);
        return {
          settings: {
            ...state.settings,
            activityConfigs: ordered.map((activity, order) => ({ ...activity, order })),
          },
        };
      });
      queueSave();
    },

    setThemePreference: (theme) => {
      set((state) => ({
        settings: {
          ...state.settings,
          preferences: { ...state.settings.preferences, theme },
        },
      }));
      queueSave();
    },

    updatePreferences: (patch) => {
      set((state) => ({
        settings: {
          ...state.settings,
          preferences: { ...state.settings.preferences, ...patch },
        },
      }));
      queueSave();
    },

    completeOnboarding: () => {
      set((state) => ({
        settings: {
          ...state.settings,
          preferences: { ...state.settings.preferences, onboardingCompleted: true },
        },
      }));
      queueSave();
    },

    resetRoutineSettings: () => {
      set((state) => ({
        settings: {
          ...state.settings,
          activityConfigs: createDefaultActivityConfigs(),
        },
      }));
      queueSave();
    },

    replacePersistedState: (nextState) => {
      set({ ...nextState, storageError: null });
      queueSave();
    },

    clearAllData: async () => {
      try {
        await persistenceQueue.catch(() => undefined);
        await clearPersistedData();
        persistenceQueue = Promise.resolve();
        set({ ...createDefaultPersistedState(), storageError: null });
        return true;
      } catch (error) {
        set({ storageError: messageFromError(error) });
        return false;
      }
    },

    dismissStorageError: () => set({ storageError: null }),
  };
});

export function themePreferenceToMode(
  preference: ThemePreference,
): 'light' | 'dark' | 'system' {
  return preference.toLowerCase() as 'light' | 'dark' | 'system';
}
