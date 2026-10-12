import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const version = Constants.expoConfig?.version ?? '';
let lastKey = '';

/** Sends a crash or error to the admin dashboard (Admin → Support). Never throws. */
export function reportError(error: unknown, screen = '') {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const key = `${e.message}|${screen}`;
    if (key === lastKey) return;   // don't send the same error over and over
    lastKey = key;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;   // only signed-in users can log errors
      supabase.rpc('log_error', {
        p_message: e.message.slice(0, 1000), p_stack: (e.stack ?? '').slice(0, 4000),
        p_screen: screen.slice(0, 200), p_platform: Platform.OS, p_version: version,
      }).then(() => {}, () => {});
    }, () => {});
  } catch { /* never let error reporting crash the app */ }
}

type Handler = (error: unknown, isFatal: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler(): Handler; setGlobalHandler(fn: Handler): void };
let installed = false;

/** Catches errors that happen outside React rendering (timers, event handlers). */
export function installGlobalErrorHandler() {
  if (installed) return;
  installed = true;
  const eu = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((error, isFatal) => {
    reportError(error, isFatal ? 'fatal' : 'global');
    prev(error, isFatal);
  });
}
