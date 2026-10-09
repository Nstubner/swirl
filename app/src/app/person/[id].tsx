import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { Button, EmptyState, Loading } from '@/components/ui';
import { ProfileView, ReportSheet } from '@/components/profile';
import { useAuth } from '@/lib/auth';
import { supabase, friendlyError } from '@/lib/supabase';
import type { DeckPerson } from '@/lib/constants';
import { C } from '@/lib/theme';

async function fetchPerson(id: string | undefined) {
  if (!id) return { person: null, error: '' };
  const { data, error } = await supabase.rpc('get_person', { p_id: id });
  if (error) return { person: null, error: friendlyError(error) };
  return { person: (data as DeckPerson[] | null)?.[0] ?? null, error: '' };
}

export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const [person, setPerson] = useState<DeckPerson | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'gone' | 'error'>('loading');
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(false);
  const insets = useSafeAreaInsets();

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchPerson>>) => {
    if (r.error) { setError(r.error); setState('error'); return; }
    if (!r.person) { setState('gone'); return; }
    setPerson(r.person);
    setState('ready');
  }, []);

  const load = useCallback(() => {
    setState('loading');
    return fetchPerson(id).then(apply);
  }, [id, apply]);

  useEffect(() => { fetchPerson(id).then(apply); }, [id, apply]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/discover'));

  const block = () => {
    if (!person) return;
    Alert.alert(`Block ${person.name}?`, "You won't see each other anywhere on Swirl, and any match will be removed. They won't be told.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive', onPress: async () => {
          const { error: e } = await supabase.rpc('block_user', { p_target: person.id });
          if (e) Alert.alert("Couldn't block", friendlyError(e));
          else router.dismissTo('/discover');
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {state === 'loading' ? <Loading /> : state !== 'ready' || !person ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            title={state === 'gone' ? 'Profile not available' : "Couldn't load this profile"}
            body={state === 'gone' ? 'This person may have deleted their account.' : error}
            action={<Button label={state === 'gone' ? 'Close' : 'Try again'} onPress={state === 'gone' ? close : load} />}
          />
        </View>
      ) : (
        <ProfileView person={person} me={profile} isMe={person.id === session?.user.id} onReport={() => setReporting(true)} onBlock={block} />
      )}
      <Pressable onPress={close} style={[styles.close, { top: Platform.OS === 'ios' ? 14 : insets.top + 10 }]} accessibilityLabel="Close"><X size={20} color="#fff" /></Pressable>
      {person && (
        <ReportSheet
          target={{ id: person.id, name: person.name }}
          visible={reporting}
          onClose={() => setReporting(false)}
          onDone={(blocked) => { setReporting(false); if (blocked) router.dismissTo('/discover'); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', right: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(14,11,22,0.6)', alignItems: 'center', justifyContent: 'center' },
});
