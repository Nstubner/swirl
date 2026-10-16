import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Heart, RefreshCw, Users, X } from 'lucide-react-native';
import { Button, Chip, EmptyState, Skeleton, TierBadge, VerifiedCheck } from './ui';
import { Confetti } from './Celebrate';
import { useExtras } from '@/lib/extras';
import { supabase, friendlyError } from '@/lib/supabase';
import { CLASS_NAME, PROMPT_QUESTIONS, type DeckPerson, type Duo, type DuoCard } from '@/lib/constants';
import { C, F, GRAD } from '@/lib/theme';

async function fetchDuos() {
  const { data } = await supabase.rpc('get_my_duos');
  return ((data ?? []) as Duo[]).filter((d) => d.status === 'active');
}
async function fetchDeck(duo: string) {
  const { data, error } = await supabase.rpc('get_duo_deck', { p_duo: duo, p_limit: 20 });
  return { deck: (data ?? []) as DuoCard[], error: error ? friendlyError(error) : '' };
}

function PersonTile({ p, width }: { p: DeckPerson; width: number }) {
  const prompt = p.prompts?.[0];
  return (
    <Pressable onPress={() => router.push(`/person/${p.id}`)} style={{ width, gap: 8 }} accessibilityRole="button" accessibilityLabel={`See ${p.name}'s full profile`}>
      <View style={{ width, aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', backgroundColor: C.surface2 }}>
        {p.photos?.[0] ? <Image source={{ uri: p.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
          <LinearGradient colors={GRAD} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontFamily: F.display, fontSize: 56, color: '#fff' }}>{(p.name ?? '?').slice(0, 1)}</Text>
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(14,11,22,0.85)']} style={styles.shade}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
            {p.verified && <VerifiedCheck size={16} />}
            <Text style={styles.age}>{p.age}</Text>
          </View>
        </LinearGradient>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><TierBadge tier={p.tier} small /></View>
      {(p.major || p.grad_year) && (
        <Text style={styles.meta} numberOfLines={2}>{[p.major, p.grad_year ? CLASS_NAME[p.grad_year] : null].filter(Boolean).join(' · ')}</Text>
      )}
      {!!prompt && (
        <View style={styles.prompt}>
          <Text style={styles.promptQ} numberOfLines={2}>{PROMPT_QUESTIONS[prompt.q]}</Text>
          <Text style={styles.promptA} numberOfLines={4}>{prompt.a}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Duo mode in Discover: you and a friend swipe on other duos. A like counts once you both say yes. */
export default function DuoDeck() {
  const { extras, refreshExtras } = useExtras();
  const reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  const [duos, setDuos] = useState<Duo[] | null>(null);
  const [duoId, setDuoId] = useState<string | null>(null);
  const [deck, setDeck] = useState<DuoCard[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [match, setMatch] = useState<{ id: string; card: DuoCard } | null>(null);
  const tx = useSharedValue(0);
  const fade = useSharedValue(1);
  const active = duos?.find((d) => d.duo_id === duoId) ?? null;
  const top = deck?.[0];
  const tileW = (Math.min(width, 520) - 32 - 12) / 2;

  useEffect(() => {
    fetchDuos().then((list) => { setDuos(list); setDuoId((cur) => cur ?? list[0]?.duo_id ?? null); });
  }, []);
  const applyDeck = useCallback((r: Awaited<ReturnType<typeof fetchDeck>>) => { setError(r.error); setDeck(r.deck); }, []);
  const load = useCallback(() => { if (duoId) { setDeck(null); fetchDeck(duoId).then(applyDeck); } }, [duoId, applyDeck]);
  useEffect(() => { if (duoId) fetchDeck(duoId).then(applyDeck); }, [duoId, applyDeck]);

  const vote = useCallback(async (v: 'like' | 'pass') => {
    if (!top || !duoId || busy) { tx.set(withSpring(0)); return; }
    setBusy(true);
    Haptics.impactAsync(v === 'pass' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (reduce) fade.set(withTiming(0, { duration: 120 }));
    else tx.set(withTiming((v === 'pass' ? -1 : 1) * width * 1.4, { duration: 220 }));
    const { data, error: e } = await supabase.rpc('duo_vote', { p_duo: duoId, p_target: top.duo_id, p_vote: v });
    if (e) {
      tx.set(withSpring(0)); fade.set(withTiming(1)); setBusy(false);
      Alert.alert("That didn't save", friendlyError(e));
      return;
    }
    const r = data as { matched?: boolean; match_id?: string; waiting?: boolean; mate_passed?: boolean; sent?: boolean };
    const mate = active?.partner_name ?? 'your duo';
    setNote(v === 'pass' ? '' : r.matched ? '' : r.waiting ? `Sent to ${mate}. It goes through when they say yes too.`
      : r.mate_passed ? `${mate} already passed on them, so this one won’t go through.` : `You both liked them. If they like you back, it’s a double date.`);
    if (r.matched && r.match_id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMatch({ id: r.match_id, card: top });
    }
    setTimeout(() => {
      setDeck((d) => (d ? d.slice(1) : d));
      tx.set(0); fade.set(0); fade.set(withTiming(1, { duration: 220 }));
      setBusy(false);
    }, reduce ? 130 : 230);
    refreshExtras();
  }, [top, duoId, busy, tx, fade, width, reduce, active, refreshExtras]);

  const pan = Gesture.Pan().enabled(!!top && !busy).activeOffsetX([-18, 18]).failOffsetY([-14, 14])
    .onUpdate((e) => { tx.set(e.translationX); })
    .onEnd((e) => {
      if (e.translationX > 110 || e.velocityX > 900) scheduleOnRN(vote, 'like' as const);
      else if (e.translationX < -110 || e.velocityX < -900) scheduleOnRN(vote, 'pass' as const);
      else tx.set(withSpring(0, { damping: 16 }));
    });
  const cardStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateX: tx.get() }, { rotate: `${interpolate(tx.get(), [-width, 0, width], [-8, 0, 8])}deg` }],
  }));

  if (duos === null) return <View style={{ padding: 16, gap: 12 }}><Skeleton height={44} radius={22} /><Skeleton height={360} radius={20} /></View>;
  if (!duos.length) {
    return (
      <EmptyState icon={<Users size={28} color={C.text} />} title="Grab a friend for double dates"
        body="Make a duo with a friend, then swipe on other duos together. When both duos like each other, all four of you get a group chat."
        action={<Button label={extras?.duo_requests ? `See duo requests (${extras.duo_requests})` : 'Set up a duo'} onPress={() => router.push('/duos')} />} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }} style={{ flexGrow: 0 }}>
        {duos.map((d) => <Chip key={d.duo_id} small label={`You & ${d.partner_name ?? 'friend'}`} selected={d.duo_id === duoId} onPress={() => { setNote(''); setDuoId(d.duo_id); }} />)}
        <Chip small label={extras?.duo_requests ? `Duos · ${extras.duo_requests} waiting` : 'Manage duos'} onPress={() => router.push('/duos')} />
      </ScrollView>
      {!!note && <Text style={styles.note}>{note}</Text>}
      {deck === null ? (
        <View style={{ padding: 16 }}><Skeleton height={360} radius={20} /></View>
      ) : error ? (
        <EmptyState title="Couldn't load duos" body={error} action={<Button label="Try again" onPress={load} icon={<RefreshCw size={16} color={C.text} />} />} />
      ) : !top ? (
        <EmptyState icon={<Users size={28} color={C.text} />} title="No more duos right now"
          body="Duo mode is new, so tell your friends to pair up. Check back soon." action={<Button label="Refresh" variant="secondary" onPress={load} />} />
      ) : (
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flex: 1 }, cardStyle]}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>{top.a.name} & {top.b.name}</Text>
              {top.liked_us && (
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.likedUs}>
                  <Heart size={16} color="#fff" fill="#fff" />
                  <Text style={{ fontFamily: F.bold, fontSize: 14, color: '#fff' }}>They already like your duo</Text>
                </LinearGradient>
              )}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <PersonTile p={top.a} width={tileW} />
                <PersonTile p={top.b} width={tileW} />
              </View>
              <Text style={styles.hint}>Tap a photo for their full profile. Swipe right to like, left to pass.</Text>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      )}
      {top && (
        <View style={styles.actions} pointerEvents="box-none">
          <Pressable onPress={() => vote('pass')} style={[styles.round, { width: 64, height: 64 }]} accessibilityLabel="Pass on this duo">
            <X size={30} color={C.text} strokeWidth={2.6} />
          </Pressable>
          <Pressable onPress={() => vote('like')} accessibilityLabel={`Like this duo with ${active?.partner_name ?? 'your duo'}`}>
            <LinearGradient colors={GRAD} style={[styles.round, { width: 64, height: 64, borderWidth: 0 }]}><Heart size={28} color="#fff" fill="#fff" /></LinearGradient>
          </Pressable>
        </View>
      )}
      {match && (
        <View style={[StyleSheet.absoluteFill, styles.match]}>
          <Text style={styles.matchTitle}>Double date!</Text>
          <Text style={styles.matchBody}>You, {active?.partner_name ?? 'your duo'}, {match.card.a.name} and {match.card.b.name} all liked each other.</Text>
          <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 28 }}>
            <Button label="Open the group chat" variant="white" onPress={() => { const id = match.id; setMatch(null); router.push(`/duo-chat/${id}`); }} />
            <Button label="Keep swiping" variant="ghost" onPress={() => setMatch(null)} />
          </View>
          <Confetti />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingTop: 30, paddingBottom: 10 },
  name: { fontFamily: F.display, fontSize: 20, color: '#fff', flexShrink: 1 },
  age: { fontFamily: F.semibold, fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  meta: { fontFamily: F.semibold, fontSize: 12, color: C.muted },
  prompt: { backgroundColor: C.surface, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: C.line, gap: 4 },
  promptQ: { fontFamily: F.semibold, fontSize: 11, color: C.muted },
  promptA: { fontFamily: F.bold, fontSize: 14, color: C.text },
  title: { fontFamily: F.display, fontSize: 28, color: C.text },
  likedUs: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  hint: { fontFamily: F.body, fontSize: 13, color: C.faint, textAlign: 'center' },
  note: { fontFamily: F.semibold, fontSize: 13, color: C.text, backgroundColor: C.surface2, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 10, overflow: 'hidden' },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 28, alignItems: 'center' },
  round: { borderRadius: 40, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  match: { backgroundColor: C.bg, zIndex: 50, alignItems: 'center', justifyContent: 'center', padding: 24 },
  matchTitle: { fontFamily: F.display, fontSize: 44, color: C.text },
  matchBody: { fontFamily: F.body, fontSize: 16, color: C.muted, textAlign: 'center', marginTop: 10 },
});
