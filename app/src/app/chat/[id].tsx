import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ban, CalendarHeart, ChevronLeft, Dices, Flag, Heart, HeartCrack, Lightbulb, MapPin, MoreHorizontal, Send, User } from 'lucide-react-native';
import { Avatar, Button, EmptyState, Loading, MenuRow, Screen, Sheet, TierBadge, VerifiedCheck } from '@/components/ui';
import { useExplain } from '@/lib/explain-context';
import { ReportSheet } from '@/components/profile';
import { useAuth } from '@/lib/auth';
import { useExtras } from '@/lib/extras';
import { supabase, friendlyError } from '@/lib/supabase';
import { ICEBREAKERS, PTS, ageFrom, pickDateIdeas, type DeckPerson } from '@/lib/constants';
import { Explain, InfoButton } from '@/lib/explain';
import { C, F, GRAD } from '@/lib/theme';

type Msg = { id: number; match_id: string; sender_id: string; body: string; created_at: string; kind?: 'text' | 'like_comment' };
type MatchRec = { id: string; user_a: string; user_b: string; created_at: string; a_date: boolean; b_date: boolean; date_paid: boolean; a_read_at?: string | null; b_read_at?: string | null };

type ChatData =
  | { kind: 'ok'; match: MatchRec; them: DeckPerson; msgs: Msg[]; replyOpen: boolean }
  | { kind: 'gone' }
  | { kind: 'error'; error: string };

async function fetchChat(id: string | undefined, me: string): Promise<ChatData> {
  if (!id) return { kind: 'gone' };
  const { data: m, error: e1 } = await supabase.from('matches').select('id,user_a,user_b,created_at,a_date,b_date,date_paid,a_read_at,b_read_at').eq('id', id).maybeSingle();
  if (e1) return { kind: 'error', error: friendlyError(e1) };
  if (!m) return { kind: 'gone' };
  const otherId = m.user_a === me ? m.user_b : m.user_a;
  const [p, list] = await Promise.all([
    supabase.rpc('get_person', { p_id: otherId }),
    supabase.from('messages').select('*').eq('match_id', id).order('created_at', { ascending: true }).limit(500),
  ]);
  if (p.error || list.error) return { kind: 'error', error: friendlyError(p.error ?? list.error) };
  const them = (p.data as DeckPerson[] | null)?.[0];
  if (!them) return { kind: 'gone' };
  const replyOpen = Date.now() - new Date(m.created_at).getTime() < 24 * 3600 * 1000;
  return { kind: 'ok', match: m as MatchRec, them, msgs: (list.data ?? []) as Msg[], replyOpen };
}

const CAT_LABEL = { coffee: 'Coffee', outdoors: 'Outdoors', food: 'Food', nightlife: 'Night out' } as const;

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? t : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${t}`;
}

export default function Chat() {
  const explain = useExplain();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const me = session?.user.id ?? '';
  const [match, setMatch] = useState<MatchRec | null>(null);
  const [them, setThem] = useState<DeckPerson | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'gone' | 'error'>('loading');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [ideas, setIdeas] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const { refreshExtras } = useExtras();
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback((r: ChatData) => {
    if (r.kind === 'error') { setError(r.error); setState('error'); return; }
    if (r.kind === 'gone') { setState('gone'); return; }
    setMatch(r.match);
    setThem(r.them);
    setMsgs(r.msgs);
    setReplyOpen(r.replyOpen);
    setState('ready');
  }, []);

  const load = useCallback(() => fetchChat(id, me).then(apply), [id, me, apply]);

  useEffect(() => { fetchChat(id, me).then(apply); }, [id, me, apply]);

  // Mark the chat read when it opens and whenever they send something while it's open.
  const markRead = useCallback(() => {
    if (!id) return;
    supabase.rpc('mark_read', { p_match: id }).then(() => refreshExtras(), () => {});
  }, [id, refreshExtras]);
  const theirCount = msgs.filter((m) => m.sender_id !== me).length;
  useEffect(() => { if (state === 'ready') markRead(); }, [state, theirCount, markRead]);

  // Live updates: new messages and date confirmations.
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
        if (m.sender_id !== me) setTyping(false);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if ((payload as { user?: string })?.user === me) return;
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 4000);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, (payload) => {
        setMatch((cur) => (cur ? { ...cur, ...(payload.new as Partial<MatchRec>) } : cur));
      })
      .subscribe();
    channel.current = ch;
    return () => {
      channel.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      supabase.removeChannel(ch);
    };
  }, [id, me]);

  // Tell them you're typing, at most every 2.5 seconds.
  const onType = (t: string) => {
    setText(t);
    const now = Date.now();
    if (t.trim() && now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      channel.current?.send({ type: 'broadcast', event: 'typing', payload: { user: me } }).catch(() => {});
    }
  };

  const iSent = msgs.some((m) => m.sender_id === me);
  const myDate = match ? (match.user_a === me ? match.a_date : match.b_date) : false;
  const theirDate = match ? (match.user_a === me ? match.b_date : match.a_date) : false;
  const under21 = (ageFrom(profile?.birthday ?? null) ?? 0) < 21 || (them?.age ?? 0) < 21;
  const dateIdeas = useMemo(
    () => (them && id ? pickDateIdeas(profile?.interests ?? [], them.interests, id, under21) : []),
    [them, id, profile?.interests, under21],
  );

  const send = async (body = text) => {
    const clean = body.trim();
    if (!clean || !id || sending) return;
    setSending(true);
    const { data, error: e } = await supabase.from('messages').insert({ match_id: id, sender_id: me, body: clean.slice(0, 1000) }).select('*').single();
    setSending(false);
    if (e) {
      Alert.alert("Message didn't send", friendlyError(e));
      return;
    }
    setText('');
    const m = data as Msg;
    setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
  };

  const confirmDate = async () => {
    setMenu(false);
    const { data, error: e } = await supabase.rpc('confirm_date', { p_match: id });
    if (e) { Alert.alert("Couldn't save that", friendlyError(e)); return; }
    setMatch((cur) => (cur ? { ...cur, ...(cur.user_a === me ? { a_date: true } : { b_date: true }), date_paid: cur.date_paid || !!(data as { both: boolean })?.both } : cur));
    if ((data as { both: boolean })?.both) Alert.alert('Date confirmed', `You and ${them?.name} both get +${PTS.date}.`);
    else Alert.alert('Nice!', `Once ${them?.name} confirms too, you both get +${PTS.date}.`);
  };

  const unmatch = () => {
    setMenu(false);
    Alert.alert(`Unmatch ${them?.name}?`, iSent ? 'This removes the conversation for both of you.' : `You never messaged them, so unmatching counts as ghosting (${PTS.ghost}).`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch', style: 'destructive', onPress: async () => {
          const { error: e } = await supabase.rpc('unmatch', { p_match: id });
          if (e) Alert.alert("Couldn't unmatch", friendlyError(e));
          else router.back();
        },
      },
    ]);
  };

  const block = () => {
    setMenu(false);
    Alert.alert(`Block ${them?.name}?`, "You won't see each other anywhere on Swirl, and this match will be removed. They won't be told.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive', onPress: async () => {
          const { error: e } = await supabase.rpc('block_user', { p_target: them?.id });
          if (e) Alert.alert("Couldn't block", friendlyError(e));
          else router.back();
        },
      },
    ]);
  };

  if (state === 'loading') return <Screen><Loading /></Screen>;
  if (state !== 'ready' || !them || !match) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <EmptyState
          title={state === 'gone' ? 'This match is gone' : "Couldn't load this chat"}
          body={state === 'gone' ? 'They may have unmatched or deleted their account.' : error}
          action={<Button label={state === 'gone' ? 'Back to matches' : 'Try again'} onPress={state === 'gone' ? () => router.back() : load} />}
        />
      </Screen>
    );
  }

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
      <Pressable onPress={() => router.push(`/person/${them.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Avatar uri={them.photos[0]} name={them.name} size={38} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.text, flexShrink: 1 }} numberOfLines={1}>{them.name}</Text>
            {them.verified && <VerifiedCheck size={15} />}
          </View>
          {them.tier && <View style={{ marginTop: 2 }}><TierBadge tier={them.tier} small /></View>}
        </View>
      </Pressable>
      <Pressable onPress={() => setIdeas(true)} style={styles.headBtn} accessibilityLabel="Date ideas"><Lightbulb size={20} color={C.text} /></Pressable>
      <Pressable onPress={() => setMenu(true)} style={styles.headBtn} accessibilityLabel="More"><MoreHorizontal size={22} color={C.text} /></Pressable>
    </View>
  );

  const intro = (
    <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
      <Avatar uri={them.photos[0]} name={them.name} size={84} />
      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>You matched with {them.name}</Text>
      <Explain k="matches"><Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, textAlign: 'center', paddingHorizontal: 30 }}>
        {iSent ? 'Keep it going.' : replyOpen ? `Send the first message within 24 hours for +${PTS.reply}.` : 'Say hi. A good opener beats a perfect one.'}
      </Text></Explain>
      {msgs.length < 6 && (
        <View style={{ alignSelf: 'stretch', marginTop: 10, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.muted, flex: 1 }}>Date ideas for you two</Text>
            <InfoButton k="date_ideas" size={15} />
          </View>
          {dateIdeas.map((s) => (
            <Pressable key={s.id} onPress={() => setText(`Want to check out ${s.name} sometime?`)} style={styles.idea}>
              <MapPin size={16} color={C.pink} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.text }}>{s.name}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>{CAT_LABEL[s.cat]} · {s.area}</Text>
              </View>
              <Text style={{ fontFamily: F.semibold, fontSize: 12, color: C.pink }}>Suggest</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const reversed = [...msgs].reverse();
  // "Seen" shows under your latest message once they've opened the chat after it was sent.
  const theirReadAt = match.user_a === me ? match.b_read_at : match.a_read_at;
  const lastMine = reversed.find((m) => m.sender_id === me);
  const seenId = lastMine && reversed[0]?.id === lastMine.id && theirReadAt && new Date(theirReadAt) >= new Date(lastMine.created_at) ? lastMine.id : null;

  return (
    <Screen edges={['top', 'bottom']}>
      {header}
      {match.date_paid ? (
        <Explain k="date"><LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
          <CalendarHeart size={16} color="#fff" />
          <Text style={styles.bannerText}>You both confirmed a date. +{PTS.date} each.</Text>
        </LinearGradient></Explain>
      ) : theirDate && !myDate ? (
        <Pressable onPress={confirmDate} style={[styles.banner, { backgroundColor: C.surface2 }]}>
          <CalendarHeart size={16} color={C.pink} />
          <Text style={styles.bannerText}>{them.name} says you went on a date. Tap to confirm for +{PTS.date}.</Text>
        </Pressable>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          inverted
          data={reversed}
          keyExtractor={(m) => String(m.id)}
          ListFooterComponent={intro}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScrollBeginDrag={Platform.OS === 'android' ? Keyboard.dismiss : undefined}
          ListHeaderComponent={typing ? (
            <View style={[styles.bubble, { backgroundColor: C.surface2, borderBottomLeftRadius: 6, alignSelf: 'flex-start', marginTop: 4 }]}>
              <Text style={[styles.bubbleText, { color: C.muted }]}>{them.name} is typing…</Text>
            </View>
          ) : null}
          renderItem={({ item, index }) => {
            const mine = item.sender_id === me;
            const older = reversed[index + 1];
            const gap = !older || new Date(item.created_at).getTime() - new Date(older.created_at).getTime() > 30 * 60 * 1000;
            return (
              <View>
                {gap && <Text style={styles.stamp}>{timeLabel(item.created_at)}</Text>}
                <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 2 }}>
                  {item.kind === 'like_comment' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3, marginHorizontal: 6 }}>
                      <Heart size={11} color={C.pink} fill={C.pink} />
                      <Text style={{ fontFamily: F.semibold, fontSize: 11, color: C.muted }}>{mine ? 'Your comment with your like' : `${them.name}'s comment with their like`}</Text>
                    </View>
                  )}
                  {mine ? (
                    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, { borderBottomRightRadius: 6 }]}>
                      <Text style={[styles.bubbleText, { color: '#fff' }]}>{item.body}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.bubble, { backgroundColor: C.surface2, borderBottomLeftRadius: 6 }]}>
                      <Text style={styles.bubbleText}>{item.body}</Text>
                    </View>
                  )}
                  {item.id === seenId && <Text style={styles.seen}>Seen</Text>}
                </View>
              </View>
            );
          }}
        />
        <View style={styles.composer}>
          <Pressable onPress={() => setText(ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)])} onLongPress={() => explain('icebreaker')}
            style={styles.iceBtn} accessibilityLabel="Icebreaker question">
            <Dices size={20} color={C.text} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={onType}
            placeholder={`Message ${them.name}`}
            placeholderTextColor={C.faint}
            multiline
            maxLength={1000}
            style={styles.input}
          />
          <Pressable onPress={() => send()} disabled={!text.trim() || sending} accessibilityLabel="Send" style={{ opacity: !text.trim() || sending ? 0.4 : 1 }}>
            <LinearGradient colors={GRAD} style={styles.sendBtn}><Send size={18} color="#fff" /></LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <MenuRow icon={<User size={18} color={C.text} />} label={`View ${them.name}'s profile`} onPress={() => { setMenu(false); router.push(`/person/${them.id}`); }} />
        <MenuRow
          icon={<CalendarHeart size={18} color={C.text} />}
          label={match.date_paid ? 'Date confirmed' : myDate ? `Waiting for ${them.name} to confirm` : 'We went on a date'}
          sub={match.date_paid ? `You both got +${PTS.date}.` : `When you both confirm, you each get +${PTS.date}.`}
          onPress={match.date_paid || myDate ? undefined : confirmDate}
        />
        <MenuRow icon={<HeartCrack size={18} color={C.text} />} label="Unmatch" sub={iSent ? undefined : `You haven’t messaged them yet (${PTS.ghost})`} onPress={unmatch} />
        <MenuRow icon={<Flag size={18} color={C.down} />} label="Report" danger onPress={() => { setMenu(false); setReporting(true); }} />
        <MenuRow icon={<Ban size={18} color={C.down} />} label="Block" danger onPress={block} />
      </Sheet>

      <Sheet visible={ideas} onClose={() => setIdeas(false)} title="Date ideas">
        <View style={{ gap: 8, paddingBottom: 16 }}>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, marginBottom: 4 }}>Picked from what you both like. Tap one to suggest it.</Text>
          {dateIdeas.map((s) => (
            <Pressable key={s.id} onPress={() => { setText(`Want to check out ${s.name} sometime?`); setIdeas(false); }} style={styles.idea}>
              <MapPin size={16} color={C.pink} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.text }}>{s.name}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>{CAT_LABEL[s.cat]} · {s.area}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <ReportSheet
        target={{ id: them.id, name: them.name }}
        visible={reporting}
        onClose={() => setReporting(false)}
        onDone={(blocked) => { setReporting(false); if (blocked) router.back(); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  bannerText: { fontFamily: F.semibold, fontSize: 13, color: '#fff', flex: 1 },
  seen: { fontFamily: F.medium, fontSize: 11, color: C.faint, marginTop: 3, marginRight: 6 },
  stamp: { fontFamily: F.medium, fontSize: 11, color: C.faint, textAlign: 'center', marginVertical: 10 },
  bubble: { maxWidth: '78%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleText: { fontFamily: F.body, fontSize: 16, lineHeight: 21, color: C.text },
  idea: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 12 },
  iceBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.line },
  input: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: C.surface2, borderRadius: 21, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, color: C.text, fontFamily: F.body, fontSize: 16 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
