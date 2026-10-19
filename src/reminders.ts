import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { dateOf, minutesOf } from './time';
import type { Task } from './types';

const CHANNEL = 'sundial-reminders';

/**
 * Reminders work in the installed app (APK / dev build) on Android and iOS.
 * Expo Go on Android (SDK 53+) can't load expo-notifications, and the web has no scheduler,
 * so the reminder switch is hidden there.
 */
export const remindersSupported =
  (Platform.OS === 'android' || Platform.OS === 'ios') &&
  !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

let mod: typeof NotificationsModule | null = null;
function N(): typeof NotificationsModule {
  // Loaded lazily so unsupported environments never evaluate the module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!mod) mod = require('expo-notifications') as typeof NotificationsModule;
  return mod;
}

export function configureReminders() {
  if (!remindersSupported) return;
  try {
    N().setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      N()
        .setNotificationChannelAsync(CHANNEL, {
          name: 'Task reminders',
          importance: N().AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 120, 200],
          lightColor: '#FFC21A',
        })
        .catch(() => {});
    }
  } catch {
    // Reminders are optional; the app works without them.
  }
}

export async function ensureReminderPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  try {
    const current = await N().getPermissionsAsync();
    if (current.granted) return true;
    return (await N().requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** When a task's reminder should fire: its time, or 9 am on its day when it has no time. */
export function reminderDate(task: Pick<Task, 'date' | 'time'>): Date | null {
  if (!task.date) return null;
  const d = dateOf(task.date);
  const m = task.time ? minutesOf(task.time) : 9 * 60;
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

export async function scheduleReminder(task: Task): Promise<string | null> {
  if (!remindersSupported || !task.reminder || task.done) return null;
  const when = reminderDate(task);
  if (!when || when.getTime() <= Date.now() + 5000) return null;
  try {
    if (!(await ensureReminderPermission())) return null;
    return await N().scheduleNotificationAsync({
      content: {
        title: task.title,
        body: task.time ? 'It’s time. Open Sundial to start or check it off.' : 'Planned for today.',
        data: { taskId: task.id },
      },
      trigger: { type: N().SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string | null) {
  if (!remindersSupported || !id) return;
  try {
    await N().cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or removed.
  }
}
