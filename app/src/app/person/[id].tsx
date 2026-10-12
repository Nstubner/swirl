import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Heart, X } from 'lucide-react-native';
import { Button, EmptyState, Loading } from '@/components/ui';
import { LikeSheet, ReportSheet, ScrollProfile, type LikeItem } from '@/components/profile';
import { useAuth } from '@/lib/auth';
import { useExtras } from '@/lib/extras';
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
  const { extras, refreshExtras } = useExtras();
  const [person, setPerson] = useState<DeckPerson | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'gone' | 'error'>('loading');
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [likeItem, setLikeItem] = useState<LikeItem | null>(null);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const supersLeft = extras ? extras.free_super_left + extras.bonus_supers : null;

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
  const isMe = person?.id === session?.user.id;
  // They liked you and you haven't answered: you can like back (optionally on a photo/prompt) or pass.
  const canAnswer = !!person && !isMe && !!person.liked_me && !person.i_swiped;

  const decide = async (kind: 'like' | 'super' | 'pass', item?: LikeItem | null, comment?: string) => {
    if (!person) return;
    setBusy(true);
    const { data, error: e } = await supabase.rpc('swipe', { p_target: person.id, p_kind: kind, p_item: item?.key ?? null, p_comment: comment || null });
    setBusy(false);
    setLikeItem(null);
    refreshExtras();
    if (e) { Alert.alert("That didn't save", friendlyError(e)); return; }
    const res = data as { matched: boolean; match_id?: string };
    if (res?.matched && res.match_id) router.replace(`/chat/${res.match_id}`);
    else close();
  };

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

  const top = Platform.OS === 'ios' ? 14 : insets.top + 10;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: top + 44 }}>
      {state === 'loading' ? <Loading /> : state !== 'ready' || !person ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            title={state === 'gone' ? 'Profile not available' : "Couldn't load this profile"}
            body={state === 'gone' ? 'This person may have deleted their account.' : error}
            action={<Button label={state === 'gone' ? 'Close' : 'Try again'} onPress={state === 'gone' ? close : load} />}
          />
        </View>
      ) : (
        <ScrollProfile person={person} me={profile} isMe={isMe} bottomPad={canAnswer ? 130 : 40}
          onLike={canAnswer ? setLikeItem : undefined}
          onReport={() => setReporting(true)} onBlock={block} />
      )}
      <Pressable onPress={close} style={[styles.close, { top }]} accessibilityLabel="Close"><X size={20} color="#fff" /></Pressable>
      {canAnswer && (
        <View style={[styles.answer, { paddingBottom: insets.bottom + 12 }]}>
          <Button label="Pass" variant="secondary" icon={<X size={16} color={C.text} />} onPress={() => decide('pass')} disabled={busy} style={{ flex: 1 }} />
          <Button label="Like back" icon={<Heart size={16} color="#fff" fill="#fff" />} onPress={() => decide('like')} loading={busy} style={{ flex: 1.4 }} />
        </View>
      )}
      {person && (
        <>
          <LikeSheet item={likeItem} name={person.name} visible={!!likeItem} supersLeft={supersLeft} busy={busy}
            onClose={() => setLikeItem(null)} onSend={(kind, comment) => decide(kind, likeItem, comment)} />
          <ReportSheet
            target={{ id: person.id, name: person.name }}
            visible={reporting}
            onClose={() => setReporting(false)}
            onDone={(blocked) => { setReporting(false); if (blocked) router.dismissTo('/discover'); }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', right: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(14,11,22,0.6)', alignItems: 'center', justifyContent: 'center' },
  answer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(14,11,22,0.94)', borderTopWidth: 1, borderTopColor: C.line },
});
