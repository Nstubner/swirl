import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Loading, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { PENDING_INVITE, store } from '@/lib/extras';

/**
 * Invite links (swirl://i/ABC123). Saves the code so onboarding fills it in,
 * then sends you to the right place. People who already finished their profile just land in the app.
 */
export default function InviteLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, profile, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const clean = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!profile?.onboarded && clean) store.set(PENDING_INVITE, clean);
    router.replace(!session ? '/' : profile?.onboarded ? '/discover' : '/onboarding');
  }, [code, session, profile?.onboarded, loading]);
  return <Screen><Loading /></Screen>;
}
