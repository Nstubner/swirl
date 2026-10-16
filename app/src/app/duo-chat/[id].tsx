import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarHeart, ChevronLeft, Flag, MoreHorizontal, Send, User } from 'lucide-react-native';
import { Avatar, Button, EmptyState, MenuRow, Screen, Sheet, Skeleton } from '@/components/ui';
import { ReportSheet } from '@/components/profile';
import { useAuth } from '@/lib/auth';
import { supabase, friendlyError } from '@/lib/supabase';
import { PTS } from '@/lib/constants';
import { C, F, GRAD } from '@/lib/theme';

type Msg = { id: number; match_id: string; sender_id: string; body: string; created_at: string };
type Person = { id: string; name: string | null; photo: string | null };
type Match = { id: string; members: string[]; confirms: string[]; date_paid: boolean };
type Loaded = { kind: 'ok'; match: Match; people: Person[]; msgs: Msg[] } | { kind: 'gone' } | { kind: 'error'; error: string };

async function fetchChat(id: string | undefined): Promise<Loaded> {
  if (!id) return { kind: 'gone' };
  const { data: m, error } = await supabase.from('duo_matches').select('id,members,confirms,date_paid').eq('id', id).maybeSingle();
  if (error) return { kind: 'error', error: friendlyError(error) };
  if (!m) return { kind: 'gone' };
  const [list, ppl] = await Promise.all([
    supabase.from('duo_messages').select('*').eq('match_id', id).order('created_at', { ascending: true }).limit(500),
    supabase.rpc('get_duo_matches'),
  ]);
  if (list.error) return { kind: 'error', error: friendlyError(list.error) };
  const row = ((ppl.data ?? []) as { match_id: string; people: Person[] }[]).find((r) => r.match_id === id);
  return { kind: 'ok', match: m as Match, people: row?.people ?? [], msgs: (list.data ?? []) as Msg[] };
}

/** Group chat for a double date: you, your duo, and the other duo. */
export default function DuoChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const [state, setState] = useState<'loading' | 'ready' | 'gone' | 'error'>('loading');
  const [error, setError] = useState('');
  const [match, setMatch] = useState<Match | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState<Person | null>(null);

  const apply = useCallback((r: Loaded) => {
    if (r.kind === 'error') { setError(r.error); setState('error'); return; }
    if (r.kind === 'gone') { setState('gone'); return; }
    setMatch(r.match); setPeople(r.people); setMsgs(r.msgs); setState('ready');
  }, []);
  useEffect(() => { fetchChat(id).then(apply); }, [id, apply]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`duo-chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duo_messages', filter: `match_id=eq.${id}` }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const others = people.filter((p) => p.id !== me);
  const nameOf = (uid: string) => people.find((p) => p.id === uid)?.name ?? 'Someone';

  const send = async () => {
    const body = text.trim();
    if (!body || !id || sending) return;
    setSending(true);
    const { data, error: e } = await supabase.from('duo_messages').insert({ match_id: id, sender_id: me, body: body.slice(0, 1000) }).select('*').single();
    setSending(false);
    if (e) { Alert.alert("Message didn't send", friendlyError(e)); return; }
    setText('');
    const m = data as Msg;
    setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
  };

  const confirm = async () => {
    setMenu(false);
    const { data, error: e } = await supabase.rpc('duo_confirm_date', { p_match: id });
    if (e) { Alert.alert("Couldn't save that", friendlyError(e)); return; }
    const r = data as { count: number; paid: boolean };
    setMatch((cur) => (cur ? { ...cur, confirms: cur.confirms.includes(me) ? cur.confirms : [...cur.confirms, me], date_paid: r.paid } : cur));
    Alert.alert(r.paid ? 'Double date confirmed' : 'Nice!', r.paid ? `Everyone gets +${PTS.date}.` : `${r.count} of 4 confirmed. Once 3 of you confirm, everyone gets +${PTS.date}.`);
  };

  if (state === 'loading') return <Screen><View style={{ padding: 20, gap: 12 }}><Skeleton height={44} /><Skeleton height={300} radius={18} /></View></Screen>;
  if (state !== 'ready' || !match) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <EmptyState title={state === 'gone' ? 'This chat is gone' : "Couldn't load this chat"} body={state === 'gone' ? 'It may have been removed.' : error}
          action={<Button label="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const reversed = [...msgs].reverse();
  const confirmed = match.confirms.includes(me);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <View style={{ flexDirection: 'row' }}>
          {others.map((p, i) => (
            <Pressable key={p.id} onPress={() => router.push(`/person/${p.id}`)} style={{ marginLeft: i ? -12 : 0 }} accessibilityLabel={`See ${p.name}'s profile`}>
              <Avatar uri={p.photo} name={p.name} size={36} />
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{others.map((p) => p.name).join(', ')}</Text>
          <Text style={styles.sub}>Double date</Text>
        </View>
        <Pressable onPress={() => setMenu(true)} style={styles.headBtn} accessibilityLabel="More"><MoreHorizontal size={22} color={C.text} /></Pressable>
      </View>
      {match.date_paid && (
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
          <CalendarHeart size={16} color="#fff" />
          <Text style={styles.bannerText}>Double date confirmed. +{PTS.date} each.</Text>
        </LinearGradient>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          inverted data={reversed} keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}
          keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScrollBeginDrag={Platform.OS === 'android' ? Keyboard.dismiss : undefined}
          ListFooterComponent={
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
              <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text, textAlign: 'center' }}>It’s a double date!</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, textAlign: 'center', paddingHorizontal: 30 }}>
                Pick a plan: bowling at the UMC, a Hill night, or sunset at Chautauqua.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.sender_id === me;
            const prev = reversed[index + 1];
            const showName = !mine && (!prev || prev.sender_id !== item.sender_id);
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 2 }}>
                {showName && <Text style={styles.who}>{nameOf(item.sender_id)}</Text>}
                {mine ? (
                  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, { borderBottomRightRadius: 6 }]}>
                    <Text style={[styles.bubbleText, { color: '#fff' }]}>{item.body}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.bubble, { backgroundColor: C.surface2, borderBottomLeftRadius: 6 }]}>
                    <Text style={styles.bubbleText}>{item.body}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Message the group" placeholderTextColor={C.faint} multiline maxLength={1000} style={styles.input} />
          <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityLabel="Send" style={{ opacity: !text.trim() || sending ? 0.4 : 1 }}>
            <LinearGradient colors={GRAD} style={styles.sendBtn}><Send size={18} color="#fff" /></LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <MenuRow icon={<CalendarHeart size={18} color={C.text} />}
          label={match.date_paid ? 'Double date confirmed' : confirmed ? 'You confirmed the double date' : 'We went on the double date'}
          sub={match.date_paid ? `Everyone got +${PTS.date}.` : `${match.confirms.length} of 4 confirmed. 3 confirms gives everyone +${PTS.date}.`}
          onPress={match.date_paid || confirmed ? undefined : confirm} />
        {others.map((p) => (
          <MenuRow key={`v${p.id}`} icon={<User size={18} color={C.text} />} label={`View ${p.name}'s profile`} onPress={() => { setMenu(false); router.push(`/person/${p.id}`); }} />
        ))}
        {others.map((p) => (
          <MenuRow key={`r${p.id}`} icon={<Flag size={18} color={C.down} />} label={`Report ${p.name}`} danger onPress={() => { setMenu(false); setReporting(p); }} />
        ))}
      </Sheet>
      <ReportSheet target={reporting ? { id: reporting.id, name: reporting.name ?? 'them' } : null} visible={!!reporting}
        onClose={() => setReporting(null)} onDone={(blocked) => { setReporting(null); if (blocked) router.back(); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.bold, fontSize: 16, color: C.text },
  sub: { fontFamily: F.body, fontSize: 12, color: C.muted },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  bannerText: { fontFamily: F.semibold, fontSize: 13, color: '#fff', flex: 1 },
  who: { fontFamily: F.semibold, fontSize: 11, color: C.muted, marginLeft: 8, marginBottom: 2, marginTop: 6 },
  bubble: { maxWidth: '78%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleText: { fontFamily: F.body, fontSize: 16, lineHeight: 21, color: C.text },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.line },
  input: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: C.surface2, borderRadius: 21, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, color: C.text, fontFamily: F.body, fontSize: 16 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
