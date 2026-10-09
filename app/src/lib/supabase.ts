import 'expo-sqlite/localStorage/install';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh the session while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Turn Supabase/Postgres errors into short, human messages. */
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/\.edu/i.test(msg) || /saving new user/i.test(msg)) return 'Use your school email. It needs to end in .edu.';
  if (/18 and older/i.test(msg)) return 'Swirl is for students 18 and older.';
  if (/expired|invalid.*(otp|token)/i.test(msg)) return "That code didn't work. Check it or send a new one.";
  if (/rate limit|too many/i.test(msg)) return 'Too many tries. Wait a minute and try again.';
  if (/network|fetch/i.test(msg)) return "Can't reach Swirl. Check your connection and try again.";
  return msg;
}
