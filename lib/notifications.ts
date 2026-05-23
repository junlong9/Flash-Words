import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SCHEDULED_KEY = 'wordflash:dailyReminderId';
const REMINDER_HOUR = 20; // 8 PM local
const REMINDER_MINUTE = 0;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function scheduleDailyReminder(): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;

  // Replace any existing reminder
  await cancelDailyReminder();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily', {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Water your plant 🌱',
      body: 'Don’t break your streak — log a word before midnight!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'daily' : undefined,
    } as Notifications.CalendarTriggerInput,
  });

  await AsyncStorage.setItem(SCHEDULED_KEY, id);
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(SCHEDULED_KEY);
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* ignore */
    }
    await AsyncStorage.removeItem(SCHEDULED_KEY);
  }
}

export async function getNotificationStatus(): Promise<{ scheduled: boolean; info: string }> {
  const id = await AsyncStorage.getItem(SCHEDULED_KEY);
  if (!id) return { scheduled: false, info: '' };
  return {
    scheduled: true,
    info: `Scheduled daily at ${pad(REMINDER_HOUR)}:${pad(REMINDER_MINUTE)} local time.`,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
