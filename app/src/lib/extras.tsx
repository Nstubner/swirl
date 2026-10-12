import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import { registerForPush } from './push';
import type { Extras } from './constants';

type ExtrasState = { extras: Extras | null; refreshExtras: () => Promise<void> };
const ExtrasContext = createContext<ExtrasState>({ extras: null, refreshExtras: async () => {} });

async function fetchExtras() {
  const { data } = await supabase.rpc('get_extras');
  return (data as Extras | null) ?? null;
}

/** Loads invite/reward/season/event info and records daily activity (for the admin metrics). */
export function ExtrasProvider({ children }: { children: ReactNode }) {
  const [extras, setExtras] = useState<Extras | null>(null);
  const refreshExtras = useCallback(async () => { setExtras(await fetchExtras()); }, []);

  useEffect(() => {
    let alive = true;
    const open = () => {
      supabase.rpc('ping').then(() => {}, () => {});
      fetchExtras().then((x) => { if (alive) setExtras(x); });
    };
    open();
    registerForPush();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') open(); });
    // Keep the unread badge and "Likes you" count fresh while the app is open.
    let t: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fetchExtras().then((x) => { if (alive) setExtras(x); }), 600);
    };
    const ch = supabase.channel('extras-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, soon)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, soon)
      .subscribe();
    return () => { alive = false; sub.remove(); if (t) clearTimeout(t); supabase.removeChannel(ch); };
  }, []);

  return <ExtrasContext.Provider value={{ extras, refreshExtras }}>{children}</ExtrasContext.Provider>;
}

export const useExtras = () => useContext(ExtrasContext);

/** Invite code saved from an invite link until onboarding uses it. */
export const PENDING_INVITE = 'swirl_pending_invite';

/** Tiny wrapper around localStorage (installed by expo-sqlite on iOS/Android) that never throws. */
export const store = {
  get(key: string) { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } },
  set(key: string, value: string) { try { globalThis.localStorage?.setItem(key, value); } catch { /* ignore */ } },
  remove(key: string) { try { globalThis.localStorage?.removeItem(key); } catch { /* ignore */ } },
};
