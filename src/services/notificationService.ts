import { Platform } from 'react-native';

export const REMINDER_CHANNEL_ID = 'morning-routine-reminders';
type NotificationsModule = typeof import('expo-notifications');

async function ensurePermission(Notifications: NotificationsModule): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureAndroidChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Morning routine reminders',
    description: 'A gentle daily reminder for your S.A.V.E.R.S. routine.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: '#E8AD63',
  });
}

/** Returns null when permission is denied or the native scheduler is unavailable. */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<string | null> {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  try {
    const Notifications = await import('expo-notifications');
    if (!(await ensurePermission(Notifications))) return null;
    await ensureAndroidChannel(Notifications);
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'A calm start is waiting',
        body: 'Make a little space for your S.A.V.E.R.S. morning routine.',
        sound: 'default',
        data: { destination: 'Today', kind: 'DAILY_ROUTINE_REMINDER' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
      },
    });
  } catch {
    return null;
  }
}

/** With no id, cancels all scheduled reminders created by this local app. */
export async function cancelReminder(notificationId?: string): Promise<boolean> {
  try {
    const Notifications = await import('expo-notifications');
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    return true;
  } catch {
    return false;
  }
}
