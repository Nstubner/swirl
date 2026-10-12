import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { unregisterPush } from './push';
import type { Profile } from './constants';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFor, setProfileFor] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setProfileFor(null);
      return null;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(error ? null : (data as Profile));
    setProfileFor(userId);
    return error ? null : (data as Profile);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Load outside the callback so Supabase isn't blocked waiting on our query.
      setTimeout(() => loadProfile(next?.user.id), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session?.user.id]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!session) throw new Error('Not signed in');
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', session.user.id).select('*').single();
      if (error) throw error;
      setProfile(data as Profile);
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await unregisterPush();
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  // Still loading until the signed-in user's profile has been fetched at least once.
  const busy = loading || (!!session && profileFor !== session.user.id);
  return (
    <AuthContext.Provider value={{ session, profile, loading: busy, refreshProfile, updateProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
