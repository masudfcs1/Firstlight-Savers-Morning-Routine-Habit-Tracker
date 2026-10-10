import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedPressable, AppText } from '../components';
import { useAppStore, themePreferenceToMode } from '../store';
import { AppThemeProvider, radii, spacing, useAppTheme } from '../theme';
import { AppNavigator } from './navigation';
import { LoadingScreen } from './LoadingScreen';

export function AppRoot() {
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrate = useAppStore((state) => state.hydrate);
  const preferences = useAppStore((state) => state.settings.preferences);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppThemeProvider
          hapticsEnabled={preferences.hapticsEnabled}
          mode={themePreferenceToMode(preferences.theme)}
          reduceMotion={preferences.reducedMotion}
        >
          {hydrated ? <AppNavigator /> : <LoadingScreen />}
          <ThemedStatusBar />
          {hydrated ? <StorageErrorBanner /> : null}
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const { isDark } = useAppTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function StorageErrorBanner() {
  const { colors } = useAppTheme();
  const error = useAppStore((state) => state.storageError);
  const dismiss = useAppStore((state) => state.dismissStorageError);
  if (!error) return null;
  return (
    <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.errorSafeArea}>
      <View style={[styles.errorBanner, { backgroundColor: colors.danger }]}>
        <Feather color={colors.white} name="alert-triangle" size={18} />
        <View style={styles.errorCopy}>
          <AppText color={colors.white} variant="bodyMedium">
            A change could not be saved
          </AppText>
          <AppText color={`${colors.white}D0`} numberOfLines={2} variant="caption">
            {error}
          </AppText>
        </View>
        <AnimatedPressable accessibilityLabel="Dismiss storage error" onPress={dismiss}>
          <Feather color={colors.white} name="x" size={20} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorSafeArea: { position: 'absolute', left: spacing.sm, right: spacing.sm, top: 0 },
  errorBanner: { minHeight: 62, borderRadius: radii.lg, marginTop: spacing.xs, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorCopy: { flex: 1 },
});
