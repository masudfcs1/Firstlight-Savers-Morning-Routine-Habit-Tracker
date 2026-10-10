import type { AppSettings, PersistedAppState, UserPreferences } from '../types';
import { createDefaultActivityConfigs } from './activities';

export const DEFAULT_PREFERENCES: Readonly<UserPreferences> = {
  theme: 'SYSTEM',
  hapticsEnabled: true,
  reducedMotion: false,
  notificationsEnabled: false,
  reminder: { enabled: false, hour: 6, minute: 30 },
  weekStartsOn: 1,
  onboardingCompleted: false,
};

export function createDefaultSettings(): AppSettings {
  return {
    activityConfigs: createDefaultActivityConfigs(),
    preferences: {
      ...DEFAULT_PREFERENCES,
      reminder: { ...DEFAULT_PREFERENCES.reminder },
    },
  };
}

export function createDefaultPersistedState(): PersistedAppState {
  return {
    settings: createDefaultSettings(),
    routinesByDate: {},
    activeTimer: null,
  };
}
