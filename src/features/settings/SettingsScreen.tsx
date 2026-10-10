import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  AnimatedPressable,
  AppText,
  ConfirmationDialog,
  Screen,
  Surface,
} from '../../components';
import { cancelReminder, scheduleDailyReminder } from '../../services';
import { exportData, importData } from '../../storage';
import { useAppStore } from '../../store';
import { radii, spacing, useAppTheme } from '../../theme';
import type {
  ActivityConfig,
  MainTabParamList,
  RootStackParamList,
  ThemePreference,
} from '../../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;
type ConfirmationMode = 'RESET' | 'CLEAR' | 'IMPORT' | null;

const THEMES: readonly { value: ThemePreference; label: string }[] = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'DARK', label: 'Dark' },
];

function formatReminder(hour: number, minute: number) {
  const date = new Date(2000, 0, 1, hour, minute);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function SettingsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const settings = useAppStore((state) => state.settings);
  const updateActivityConfig = useAppStore((state) => state.updateActivityConfig);
  const moveActivity = useAppStore((state) => state.moveActivity);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const setTheme = useAppStore((state) => state.setThemePreference);
  const resetRoutine = useAppStore((state) => state.resetRoutineSettings);
  const clearAllData = useAppStore((state) => state.clearAllData);
  const replaceState = useAppStore((state) => state.replacePersistedState);
  const [confirmation, setConfirmation] = useState<ConfirmationMode>(null);
  const [busy, setBusy] = useState(false);
  const [guidanceActivity, setGuidanceActivity] = useState<ActivityConfig | null>(null);
  const [guidanceDraft, setGuidanceDraft] = useState('');
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const activities = settings.activityConfigs
    .slice()
    .sort((left, right) => left.order - right.order);
  const plannedMinutes = Math.round(
    activities
      .filter((activity) => activity.enabled)
      .reduce((sum, activity) => sum + activity.durationSeconds, 0) / 60,
  );

  const rescheduleReminder = async (hour: number, minute: number) => {
    const currentId = settings.preferences.reminder.notificationId;
    if (currentId) await cancelReminder(currentId);
    const notificationId = await scheduleDailyReminder(hour, minute);
    if (!notificationId) {
      updatePreferences({
        notificationsEnabled: false,
        reminder: { enabled: false, hour, minute },
      });
      Alert.alert(
        'Reminder not enabled',
        'Notification permission was not granted, or reminders are unavailable on this device.',
      );
      return;
    }
    updatePreferences({
      notificationsEnabled: true,
      reminder: { enabled: true, hour, minute, notificationId },
    });
  };

  const toggleReminder = async (enabled: boolean) => {
    if (enabled) {
      await rescheduleReminder(
        settings.preferences.reminder.hour,
        settings.preferences.reminder.minute,
      );
      return;
    }
    await cancelReminder(settings.preferences.reminder.notificationId);
    updatePreferences({
      notificationsEnabled: false,
      reminder: {
        enabled: false,
        hour: settings.preferences.reminder.hour,
        minute: settings.preferences.reminder.minute,
      },
    });
  };

  const shiftReminder = async (deltaMinutes: number) => {
    const current = settings.preferences.reminder.hour * 60 + settings.preferences.reminder.minute;
    const next = (current + deltaMinutes + 24 * 60) % (24 * 60);
    const hour = Math.floor(next / 60);
    const minute = next % 60;
    if (settings.preferences.reminder.enabled) await rescheduleReminder(hour, minute);
    else {
      updatePreferences({
        reminder: { enabled: false, hour, minute },
      });
    }
  };

  const exportHistory = async () => {
    setBusy(true);
    try {
      const contents = await exportData(true);
      const stamp = new Date().toISOString().slice(0, 10);
      const directory = FileSystem.cacheDirectory;
      if (!directory) throw new Error('A temporary export folder is unavailable.');
      const path = `${directory}firstlight-savers-${stamp}.json`;
      await FileSystem.writeAsStringAsync(path, contents, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          dialogTitle: 'Export FirstLight history',
          mimeType: 'application/json',
          UTI: 'public.json',
        });
      } else {
        await Share.share({ message: contents, title: 'FirstLight S.A.V.E.R.S. backup' });
      }
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const chooseImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const raw = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setPendingImport(raw);
      setConfirmation('IMPORT');
    } catch (error) {
      Alert.alert('Could not open backup', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      const imported = await importData(pendingImport, 'REPLACE');
      replaceState(imported);
      setConfirmation(null);
      setPendingImport(null);
      Alert.alert('Import complete', 'Your settings and historical routine snapshots were restored.');
    } catch (error) {
      Alert.alert('Import rejected', error instanceof Error ? error.message : 'This backup is not valid.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      contentContainerStyle={styles.content}
      edges={['top', 'left', 'right']}
      keyboardAvoiding
      scrollable
    >
      <View className="flex-row items-center justify-between" style={styles.header}>
        <View>
          <AppText color={colors.textMuted} variant="overline">
            Make it yours
          </AppText>
          <AppText variant="title">Routine settings</AppText>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.surfaceMuted }]}>
          <Feather color={colors.primary} name="sliders" size={21} />
        </View>
      </View>
      <AppText color={colors.textMuted} style={styles.intro}>
        Changes become the plan for new routine days. Today’s and every historical
        snapshot stay exactly as saved.
      </AppText>

      <View className="flex-row items-center justify-between" style={styles.sectionHeading}>
        <View>
          <AppText variant="heading">Your S.A.V.E.R.S.</AppText>
          <AppText color={colors.textMuted} variant="caption">
            Enabled practices set each new day’s denominator
          </AppText>
        </View>
        <View style={[styles.totalPill, { backgroundColor: colors.accentSoft }]}>
          <AppText color={colors.warning} variant="caption">
            {plannedMinutes} min
          </AppText>
        </View>
      </View>

      <View style={styles.activityList}>
        {activities.map((activity, index) => (
          <Surface key={activity.id} padding="md" style={!activity.enabled && styles.disabledCard}>
            <View className="flex-row items-center" style={styles.activityTop}>
              <View style={[styles.activityMark, { backgroundColor: `${activity.accentColor}20` }]}>
                <AppText color={activity.accentColor} variant="heading">
                  {activity.letter}
                </AppText>
              </View>
              <View style={styles.activityCopy}>
                <AppText variant="bodyMedium">{activity.name}</AppText>
                <AppText color={colors.textMuted} numberOfLines={1} variant="caption">
                  {activity.guidance}
                </AppText>
              </View>
              <Switch
                accessibilityLabel={`${activity.enabled ? 'Disable' : 'Enable'} ${activity.name}`}
                ios_backgroundColor={colors.borderStrong}
                onValueChange={(enabled) => updateActivityConfig(activity.id, { enabled })}
                thumbColor={colors.white}
                trackColor={{ false: colors.borderStrong, true: colors.sage }}
                value={activity.enabled}
              />
            </View>
            <View className="flex-row items-center justify-between" style={[styles.activityControls, { borderTopColor: colors.border }]}>
              <View className="flex-row items-center" style={styles.durationStepper}>
                <AnimatedPressable
                  accessibilityLabel={`Reduce ${activity.name} duration`}
                  disabled={activity.durationSeconds <= 60}
                  onPress={() =>
                    updateActivityConfig(activity.id, {
                      durationSeconds: activity.durationSeconds - 60,
                    })
                  }
                  style={[styles.miniButton, { backgroundColor: colors.surfaceMuted }]}
                >
                  <Feather color={colors.primary} name="minus" size={16} />
                </AnimatedPressable>
                <View style={styles.durationValue}>
                  <AppText variant="bodyMedium">
                    {Math.round(activity.durationSeconds / 60)} min
                  </AppText>
                  <AppText color={colors.textSubtle} variant="caption">
                    duration
                  </AppText>
                </View>
                <AnimatedPressable
                  accessibilityLabel={`Increase ${activity.name} duration`}
                  disabled={activity.durationSeconds >= 7200}
                  onPress={() =>
                    updateActivityConfig(activity.id, {
                      durationSeconds: activity.durationSeconds + 60,
                    })
                  }
                  style={[styles.miniButton, { backgroundColor: colors.surfaceMuted }]}
                >
                  <Feather color={colors.primary} name="plus" size={16} />
                </AnimatedPressable>
              </View>
              <View className="flex-row" style={styles.trailingControls}>
                <AnimatedPressable
                  accessibilityLabel={`Edit ${activity.name} guidance`}
                  onPress={() => {
                    setGuidanceActivity(activity);
                    setGuidanceDraft(activity.guidance);
                  }}
                  style={[styles.miniButton, { backgroundColor: colors.surfaceMuted }]}
                >
                  <Feather color={colors.textMuted} name="edit-2" size={15} />
                </AnimatedPressable>
                <AnimatedPressable
                  accessibilityLabel={`Move ${activity.name} earlier`}
                  disabled={index === 0}
                  onPress={() => moveActivity(activity.id, -1)}
                  style={[styles.miniButton, { backgroundColor: colors.surfaceMuted }]}
                >
                  <Feather color={colors.textMuted} name="arrow-up" size={15} />
                </AnimatedPressable>
                <AnimatedPressable
                  accessibilityLabel={`Move ${activity.name} later`}
                  disabled={index === activities.length - 1}
                  onPress={() => moveActivity(activity.id, 1)}
                  style={[styles.miniButton, { backgroundColor: colors.surfaceMuted }]}
                >
                  <Feather color={colors.textMuted} name="arrow-down" size={15} />
                </AnimatedPressable>
              </View>
            </View>
          </Surface>
        ))}
      </View>

      <SectionTitle title="Appearance" subtitle="Calm in every light" />
      <Surface padding="sm">
        <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
          {THEMES.map((item) => {
            const selected = settings.preferences.theme === item.value;
            return (
              <AnimatedPressable
                accessibilityState={{ selected }}
                key={item.value}
                onPress={() => setTheme(item.value)}
                style={[
                  styles.segment,
                  selected && { backgroundColor: colors.surface },
                ]}
              >
                <AppText color={selected ? colors.primary : colors.textMuted} variant="caption">
                  {item.label}
                </AppText>
              </AnimatedPressable>
            );
          })}
        </View>
        <SettingsToggle
          icon="smartphone"
          label="Haptic feedback"
          onValueChange={(hapticsEnabled) => updatePreferences({ hapticsEnabled })}
          subtitle="Subtle tactile cues for meaningful actions"
          value={settings.preferences.hapticsEnabled}
        />
        <SettingsToggle
          icon="minimize-2"
          label="Reduce motion"
          onValueChange={(reducedMotion) => updatePreferences({ reducedMotion })}
          subtitle="Prefer quieter transitions throughout FirstLight"
          value={settings.preferences.reducedMotion}
        />
      </Surface>

      <SectionTitle title="Morning reminder" subtitle="Optional, gentle, and local" />
      <Surface>
        <SettingsToggle
          icon="bell"
          label="Daily reminder"
          onValueChange={(enabled) => void toggleReminder(enabled)}
          subtitle={
            settings.preferences.reminder.enabled
              ? `Scheduled for ${formatReminder(settings.preferences.reminder.hour, settings.preferences.reminder.minute)}`
              : 'FirstLight asks for permission only when enabled'
          }
          value={settings.preferences.reminder.enabled}
        />
        <View className="flex-row items-center justify-between" style={[styles.reminderTime, { borderTopColor: colors.border }]}>
          <AnimatedPressable
            accessibilityLabel="Move reminder 15 minutes earlier"
            onPress={() => void shiftReminder(-15)}
            style={[styles.timeButton, { backgroundColor: colors.surfaceMuted }]}
          >
            <Feather color={colors.primary} name="minus" size={17} />
            <AppText color={colors.textMuted} variant="caption">15m</AppText>
          </AnimatedPressable>
          <View style={styles.clockValue}>
            <AppText align="center" variant="heading">
              {formatReminder(
                settings.preferences.reminder.hour,
                settings.preferences.reminder.minute,
              )}
            </AppText>
            <AppText align="center" color={colors.textSubtle} variant="caption">
              device local time
            </AppText>
          </View>
          <AnimatedPressable
            accessibilityLabel="Move reminder 15 minutes later"
            onPress={() => void shiftReminder(15)}
            style={[styles.timeButton, { backgroundColor: colors.surfaceMuted }]}
          >
            <Feather color={colors.primary} name="plus" size={17} />
            <AppText color={colors.textMuted} variant="caption">15m</AppText>
          </AnimatedPressable>
        </View>
      </Surface>

      <SectionTitle title="Your data" subtitle="Portable and entirely yours" />
      <Surface padding="sm">
        <ActionRow
          icon="download"
          label="Export history"
          onPress={() => void exportHistory()}
          subtitle="Save a versioned JSON backup"
        />
        <ActionRow
          icon="upload"
          label="Import history"
          onPress={() => void chooseImport()}
          subtitle="Validate and replace from a FirstLight backup"
        />
        <ActionRow
          icon="refresh-cw"
          label="Reset routine defaults"
          onPress={() => setConfirmation('RESET')}
          subtitle="Applies to future routine days only"
        />
        <ActionRow
          destructive
          icon="trash-2"
          label="Clear all local data"
          onPress={() => setConfirmation('CLEAR')}
          subtitle="Remove history, settings, and active timer"
        />
      </Surface>

      <Surface muted style={styles.privacyNote}>
        <Feather color={colors.primary} name="shield" size={21} />
        <View style={styles.privacyCopy}>
          <AppText variant="bodyMedium">Local-first by design</AppText>
          <AppText color={colors.textMuted} variant="caption">
            No account, backend, leaderboard, or analytics service. Your routine lives
            in this app’s device storage unless you export it.
          </AppText>
        </View>
      </Surface>
      <AppText align="center" color={colors.textSubtle} style={styles.version} variant="caption">
        FirstLight S.A.V.E.R.S. · Version 1.0
      </AppText>

      <ConfirmationDialog
        confirmLabel="Reset routine"
        message="Restore the six activities, order, durations, and guidance to their defaults? Historical snapshots will not change."
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          resetRoutine();
          setConfirmation(null);
        }}
        title="Reset future routine?"
        visible={confirmation === 'RESET'}
      />
      <ConfirmationDialog
        confirmLabel="Clear everything"
        destructive
        loading={busy}
        message="This permanently removes every local routine record, preference, and active timer. Export first if you may want them later."
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          setBusy(true);
          void (async () => {
            const reminderId = settings.preferences.reminder.notificationId;
            const cleared = await clearAllData();
            setBusy(false);
            setConfirmation(null);
            if (!cleared) {
              Alert.alert(
                'Data was not cleared',
                'Local storage could not be updated. Your data remains in place; please try again.',
              );
              return;
            }
            await cancelReminder(reminderId);
            navigation
              .getParent<NativeStackNavigationProp<RootStackParamList>>()
              ?.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
          })();
        }}
        title="Clear all local data?"
        visible={confirmation === 'CLEAR'}
      />
      <ConfirmationDialog
        confirmLabel="Replace my data"
        destructive
        loading={busy}
        message="The validated backup will replace current settings, history, and any active timer. This cannot be undone unless you export first."
        onCancel={() => {
          setConfirmation(null);
          setPendingImport(null);
        }}
        onConfirm={() => void confirmImport()}
        title="Import this backup?"
        visible={confirmation === 'IMPORT'}
      />

      <GuidanceModal
        activity={guidanceActivity}
        draft={guidanceDraft}
        onCancel={() => setGuidanceActivity(null)}
        onChange={setGuidanceDraft}
        onSave={() => {
          if (guidanceActivity && guidanceDraft.trim()) {
            updateActivityConfig(guidanceActivity.id, { guidance: guidanceDraft.trim() });
          }
          setGuidanceActivity(null);
        }}
      />
      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="heading">{title}</AppText>
      <AppText color={colors.textMuted} variant="caption">
        {subtitle}
      </AppText>
    </View>
  );
}

function SettingsToggle({
  icon,
  label,
  subtitle,
  value,
  onValueChange,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center" style={styles.toggleRow}>
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceMuted }]}>
        <Feather color={colors.primary} name={icon} size={17} />
      </View>
      <View style={styles.rowCopy}>
        <AppText variant="bodyMedium">{label}</AppText>
        <AppText color={colors.textMuted} variant="caption">
          {subtitle}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={label}
        ios_backgroundColor={colors.borderStrong}
        onValueChange={onValueChange}
        thumbColor={colors.white}
        trackColor={{ false: colors.borderStrong, true: colors.sage }}
        value={value}
      />
    </View>
  );
}

function ActionRow({
  destructive,
  icon,
  label,
  subtitle,
  onPress,
}: {
  destructive?: boolean;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const tint = destructive ? colors.danger : colors.primary;
  return (
    <AnimatedPressable onPress={onPress} style={styles.actionRow}>
      <View style={[styles.rowIcon, { backgroundColor: `${tint}14` }]}>
        <Feather color={tint} name={icon} size={17} />
      </View>
      <View style={styles.rowCopy}>
        <AppText color={destructive ? colors.danger : colors.text} variant="bodyMedium">
          {label}
        </AppText>
        <AppText color={colors.textMuted} variant="caption">
          {subtitle}
        </AppText>
      </View>
      <Feather color={colors.textSubtle} name="chevron-right" size={18} />
    </AnimatedPressable>
  );
}

function GuidanceModal({
  activity,
  draft,
  onChange,
  onCancel,
  onSave,
}: {
  activity: ActivityConfig | null;
  draft: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={Boolean(activity)}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <Surface elevated style={styles.guidanceDialog}>
          <View style={styles.guidanceHeader}>
            <View>
              <AppText color={colors.textMuted} variant="overline">
                Activity guidance
              </AppText>
              <AppText variant="heading">{activity?.name}</AppText>
            </View>
            <AnimatedPressable
              accessibilityLabel="Close guidance editor"
              onPress={onCancel}
              style={[styles.miniButton, { backgroundColor: colors.surfaceMuted }]}
            >
              <Feather color={colors.textMuted} name="x" size={18} />
            </AnimatedPressable>
          </View>
          <TextInput
            accessibilityLabel={`${activity?.name ?? 'Activity'} guidance text`}
            maxLength={280}
            multiline
            onChangeText={onChange}
            placeholder="Add a gentle prompt for this practice"
            placeholderTextColor={colors.textSubtle}
            style={[
              styles.guidanceInput,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={draft}
          />
          <AppText align="right" color={colors.textSubtle} variant="caption">
            {draft.length}/280
          </AppText>
          <View style={styles.guidanceActions}>
            <AnimatedPressable
              onPress={onCancel}
              style={[styles.dialogButton, { backgroundColor: colors.surfaceMuted }]}
            >
              <AppText variant="bodyMedium">Cancel</AppText>
            </AnimatedPressable>
            <AnimatedPressable
              disabled={!draft.trim()}
              onPress={onSave}
              style={[styles.dialogButton, { backgroundColor: colors.action }]}
            >
              <AppText color={colors.white} variant="bodyMedium">Save guidance</AppText>
            </AnimatedPressable>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: 118 },
  header: {},
  headerIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  intro: { marginTop: spacing.xs, maxWidth: 520 },
  sectionHeading: { marginTop: spacing.xl, gap: spacing.sm },
  sectionTitle: { marginTop: spacing['2xl'], marginBottom: spacing.sm },
  totalPill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  activityList: { marginTop: spacing.md, gap: spacing.sm },
  disabledCard: { opacity: 0.67 },
  activityTop: { gap: spacing.sm },
  activityMark: { width: 46, height: 46, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, minWidth: 0 },
  activityControls: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  durationStepper: { gap: spacing.xs },
  durationValue: { minWidth: 58, alignItems: 'center' },
  trailingControls: { gap: 5 },
  miniButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', borderRadius: radii.md, padding: 4 },
  segment: { flex: 1, minHeight: 38, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { minHeight: 72, gap: spacing.sm, paddingHorizontal: spacing.xs },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  reminderTime: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, marginTop: spacing.xs },
  timeButton: { minWidth: 66, height: 44, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  clockValue: { flex: 1 },
  actionRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  privacyNote: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  privacyCopy: { flex: 1 },
  version: { marginTop: spacing.xl },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  guidanceDialog: { width: '100%', maxWidth: 480 },
  guidanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guidanceInput: { minHeight: 136, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, marginTop: spacing.lg, padding: spacing.md, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  guidanceActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  dialogButton: { flex: 1, minHeight: 50, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  bottomSpacer: { height: spacing.md },
});
