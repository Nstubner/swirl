import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

let currentToken: string | null = null;

// Show notifications as banners even while the app is open.
if (Platform.OS !== 'web') Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Ask for permission and save this phone's push token. Quietly does nothing if:
 * - the person says no, or
 * - the app isn't linked to an Expo project yet (push needs `eas init` / a real build).
 */
export async function registerForPush() {
  try {
    if (Platform.OS === 'web') return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.HIGH });
    }
    const current = await Notifications.getPermissionsAsync();
    const settings = current.granted ? current : await Notifications.requestPermissionsAsync();
    const allowed = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!allowed) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = data;
    await supabase.rpc('register_push', { p_token: data });
    return data;
  } catch {
    return null;
  }
}

/** Stop sending pushes to this phone (on log out). */
export async function unregisterPush() {
  if (!currentToken) return;
  try { await supabase.rpc('unregister_push', { p_token: currentToken }); } catch { /* ignore */ }
  currentToken = null;
}
