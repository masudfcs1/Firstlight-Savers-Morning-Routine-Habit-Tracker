import React, { useEffect, useMemo, useState } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import { AppBottomTabBar } from '../../components';
import { HistoryScreen } from '../../features/history';
import { InsightsScreen } from '../../features/insights';
import { OnboardingScreen } from '../../features/onboarding';
import { TodayScreen } from '../../features/routine';
import { SettingsScreen } from '../../features/settings';
import { TimerScreen } from '../../features/timer';
import { getTimerSnapshot } from '../../services';
import { useAppStore } from '../../store';
import { useAppTheme } from '../../theme';
import type { MainTabParamList, RootStackParamList } from '../../types';
import { toLocalDateKey } from '../../utils';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function formatRemaining(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
      tabBar={(props) => <ConnectedTabBar {...props} />}
    >
      <Tabs.Screen component={TodayScreen} name="Today" />
      <Tabs.Screen component={InsightsScreen} name="Insights" />
      <Tabs.Screen component={HistoryScreen} name="History" />
      <Tabs.Screen component={SettingsScreen} name="Settings" />
    </Tabs.Navigator>
  );
}

function ConnectedTabBar(props: React.ComponentProps<typeof AppBottomTabBar>) {
  const activeTimer = useAppStore((state) => state.activeTimer);
  const configs = useAppStore((state) => state.settings.activityConfigs);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeTimer || activeTimer.status !== 'RUNNING') return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const summary = activeTimer
    ? {
        label: configs.find((item) => item.id === activeTimer.activityId)?.name ?? 'Active practice',
        remainingLabel: formatRemaining(getTimerSnapshot(activeTimer, now).remainingSeconds),
        onPress: () => {
          props.navigation
            .getParent<NativeStackNavigationProp<RootStackParamList>>()
            ?.navigate('Timer', {
              dateKey: activeTimer.dateKey,
              activityId: activeTimer.activityId,
            });
        },
      }
    : undefined;

  return <AppBottomTabBar {...props} {...(summary ? { activeTimer: summary } : {})} />;
}

export function AppNavigator() {
  const { colors, isDark } = useAppTheme();
  const onboardingCompleted = useAppStore(
    (state) => state.settings.preferences.onboardingCompleted,
  );
  const syncActiveTimer = useAppStore((state) => state.syncActiveTimer);
  const ensureRoutine = useAppStore((state) => state.ensureRoutine);

  useEffect(() => {
    const handleState = (status: AppStateStatus) => {
      if (status === 'active' || status === 'background') syncActiveTimer(Date.now());
      if (status === 'active' && onboardingCompleted) ensureRoutine(toLocalDateKey());
    };
    const subscription = AppState.addEventListener('change', handleState);
    return () => subscription.remove();
  }, [ensureRoutine, onboardingCompleted, syncActiveTimer]);

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? NavigationDarkTheme : NavigationDefaultTheme),
      colors: {
        ...(isDark ? NavigationDarkTheme.colors : NavigationDefaultTheme.colors),
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    }),
    [colors, isDark],
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={onboardingCompleted ? 'Main' : 'Onboarding'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen component={OnboardingScreen} name="Onboarding" />
        <Stack.Screen component={MainTabs} name="Main" />
        <Stack.Screen
          component={TimerScreen}
          name="Timer"
          options={{ animation: 'slide_from_bottom', gestureEnabled: true, presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
