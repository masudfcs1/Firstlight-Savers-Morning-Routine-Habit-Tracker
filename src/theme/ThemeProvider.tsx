import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkColors,
  darkShadows,
  lightColors,
  lightShadows,
  type ThemeColors,
} from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

export type AppTheme = {
  mode: ResolvedThemeMode;
  isDark: boolean;
  reduceMotion: boolean;
  hapticsEnabled: boolean;
  colors: ThemeColors;
  shadows: typeof lightShadows;
};

const fallbackTheme: AppTheme = {
  mode: 'light',
  isDark: false,
  reduceMotion: false,
  hapticsEnabled: true,
  colors: lightColors,
  shadows: lightShadows,
};

const AppThemeContext = createContext<AppTheme>(fallbackTheme);

export type AppThemeProviderProps = PropsWithChildren<{
  mode?: ThemeMode;
  reduceMotion?: boolean;
  hapticsEnabled?: boolean;
}>;

export function AppThemeProvider({
  children,
  mode = 'system',
  reduceMotion = false,
  hapticsEnabled = true,
}: AppThemeProviderProps) {
  const systemScheme = useColorScheme();
  const resolvedMode: ResolvedThemeMode =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<AppTheme>(
    () => ({
      mode: resolvedMode,
      isDark: resolvedMode === 'dark',
      reduceMotion,
      hapticsEnabled,
      colors: resolvedMode === 'dark' ? darkColors : lightColors,
      shadows: resolvedMode === 'dark' ? darkShadows : lightShadows,
    }),
    [hapticsEnabled, reduceMotion, resolvedMode],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  return useContext(AppThemeContext);
}
