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
    return () => { alive = false; sub.remove(); };
  }, []);

  return <ExtrasContext.Provider value={{ extras, refreshExtras }}>{children}</ExtrasContext.Provider>;
}

export const useExtras = () => useContext(ExtrasContext);

/** Tiny wrapper around localStorage (installed by expo-sqlite on iOS/Android) that never throws. */
export const store = {
  get(key: string) { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } },
  set(key: string, value: string) { try { globalThis.localStorage?.setItem(key, value); } catch { /* ignore */ } },
};
