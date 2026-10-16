import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { RefreshCw, Rocket, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react-native';
import { Button, Chip, EmptyState, Label, Screen, Segmented, Sheet, Skeleton, Wordmark } from '@/components/ui';
import DuoDeck from '@/components/DuoDeck';
import { LikeSheet, MatchScreen, ScrollProfile, type LikeItem } from '@/components/profile';
import EventBanner from '@/components/EventBanner';
import TabTip from '@/components/TabTip';
import { useAuth } from '@/lib/auth';
import { InfoButton } from '@/lib/explain';
import { useExplain } from '@/lib/explain-context';
import { useExtras } from '@/lib/extras';
import { supabase, friendlyError } from '@/lib/supabase';
import { CLASS_NAME, GRAD_YEARS, LOOKING_FOR, type DeckPerson, type Filters, type LookingFor } from '@/lib/constants';
import { C, F } from '@/lib/theme';

type Dir = 'like' | 'pass' | 'super';

async function fetchDeck() {
  const { data, error } = await supabase.rpc('get_deck', { p_limit: 30 });
  return { deck: (data ?? []) as DeckPerson[], error: error ? friendlyError(error) : '' };
}

const SWIPE_AT = 110;

export default function Discover() {
  const { profile, updateProfile } = useAuth();
  const { extras, refreshExtras } = useExtras();
  const explain = useExplain();
  const reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  const [deck, setDeck] = useState<DeckPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [likeItem, setLikeItem] = useState<LikeItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [match, setMatch] = useState<{ id: string; person: DeckPerson } | null>(null);
  const [mode, setMode] = useState<'solo' | 'duo'>('solo');
  const scrollRef = useRef<ScrollView>(null);
  const tx = useSharedValue(0);
  const fade = useSharedValue(1);
  const spin = useSharedValue(0);
  const supersLeft = extras ? extras.free_super_left + extras.bonus_supers : null;
  const boosted = !!extras?.boost_until;
  const filters = profile?.filters ?? {};
  const filterCount = (filters.years?.length ? 1 : 0) + (filters.looking?.length ? 1 : 0) + (filters.verified_only ? 1 : 0);

  const apply = useCallback((res: Awaited<ReturnType<typeof fetchDeck>>) => {
    if (res.error) setError(res.error);
    else { setError(''); setDeck(res.deck); }
    setLoading(false);
  }, []);
  const load = useCallback(() => { setLoading(true); return fetchDeck().then(apply); }, [apply]);
  useEffect(() => { fetchDeck().then(apply); }, [apply]);

  const top = deck[0];

  // Record the decision, fly the profile off screen, and bring in the next person.
  const decide = useCallback(async (dir: Dir, item?: LikeItem | null, comment?: string) => {
    if (!top || busy) { tx.set(withSpring(0)); return; }
    if (dir === 'super' && supersLeft === 0) { tx.set(withSpring(0)); explain('superlike_out'); return; }
    setBusy(true);
    setLikeItem(null);
    Haptics.impactAsync(dir === 'pass' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const off = (dir === 'pass' ? -1 : 1) * width * 1.4;
    if (reduce) fade.set(withTiming(0, { duration: 120 }));
    else tx.set(withTiming(off, { duration: 220 }));
    const { data, error: e } = await supabase.rpc('swipe', {
      p_target: top.id, p_kind: dir, p_item: item?.key ?? null, p_comment: comment || null,
    });
    if (dir === 'super') refreshExtras();
    if (e) {
      tx.set(withSpring(0)); fade.set(withTiming(1));
      setBusy(false);
      if (/Out of Super Likes/i.test(e.message)) { explain('superlike_out'); return; }
      Alert.alert("That didn't save", friendlyError(e));
      return;
    }
    setTimeout(() => {
      setDeck((d) => d.slice(1));
      tx.set(0);
      fade.set(0);
      fade.set(withTiming(1, { duration: 220 }));
      setBusy(false);
    }, reduce ? 130 : 230);
    const res = data as { matched: boolean; match_id?: string };
    if (res?.matched && res.match_id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMatch({ id: res.match_id, person: top });
    }
    if (deck.length <= 3) load();
  }, [top, busy, supersLeft, explain, refreshExtras, tx, fade, width, reduce, deck.length, load]);

  // Swipe right to like, left to pass. Vertical drags still scroll the profile.
  const pan = Gesture.Pan()
    .enabled(!!top && !busy && !profile?.paused)
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onUpdate((e) => { tx.set(e.translationX); })
    .onEnd((e) => {
      if (e.translationX > SWIPE_AT || e.velocityX > 900) scheduleOnRN(decide, 'like' as Dir);
      else if (e.translationX < -SWIPE_AT || e.velocityX < -900) scheduleOnRN(decide, 'pass' as Dir);
      else tx.set(withSpring(0, { damping: 16 }));
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateX: tx.get() }, { rotate: `${interpolate(tx.get(), [-width, 0, width], [-8, 0, 8])}deg` }],
  }));
  const likeStamp = useAnimatedStyle(() => ({ opacity: interpolate(tx.get(), [20, SWIPE_AT], [0, 1], 'clamp') }));
  const passStamp = useAnimatedStyle(() => ({ opacity: interpolate(tx.get(), [-SWIPE_AT, -20], [1, 0], 'clamp') }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));

  // Tap the logo: it spins and jumps back to the top of the profile. Hold it: how Discover works.
  const tapLogo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!reduce) { spin.set(0); spin.set(withTiming(360, { duration: 650 })); }
    scrollRef.current?.scrollTo({ y: 0, animated: !reduce });
  };

  let body;
  if (profile?.paused) {
    body = <EmptyState title="Your account is paused" body="You're hidden from Discover and the leaderboard. Turn pause off in Profile to start again." />;
  } else if (loading && !deck.length) {
    body = <View style={{ padding: 16, gap: 12 }}><Skeleton height={440} radius={20} /><Skeleton height={22} width="45%" /><Skeleton height={110} radius={20} /></View>;
  } else if (error) {
    body = <EmptyState title="Couldn't load people" body={error} action={<Button label="Try again" onPress={load} icon={<RefreshCw size={16} color={C.text} />} />} />;
  } else if (!top) {
    body = (
      <EmptyState icon={<Sparkles size={28} color={C.text} />} title="You've seen everyone for now"
        body={filterCount ? 'Try loosening your filters, or check back soon.' : 'New students join every day. Check back soon, and tell your friends to join.'}
        action={<Button label={filterCount ? 'Edit filters' : 'Refresh'} variant="secondary" onPress={filterCount ? () => setFiltersOpen(true) : load} />} />
    );
  } else {
    body = (
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1 }, cardStyle]}>
          <ScrollProfile key={top.id} person={top} me={profile} onLike={(item) => setLikeItem(item)} bottomPad={120} showWhy scrollRef={scrollRef}
            footer={<Text style={styles.hint}>Swipe right to like, left to pass. Double-tap a photo or answer to like it.</Text>} />
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampLike, likeStamp]}><Text style={[styles.stampText, { color: C.up }]}>LIKE</Text></Animated.View>
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampPass, passStamp]}><Text style={[styles.stampText, { color: C.down }]}>PASS</Text></Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={tapLogo} onLongPress={() => explain('discover')} accessibilityRole="button"
          accessibilityLabel="Swirl. Tap to go to the top, hold to see how Discover works" hitSlop={8}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View style={spinStyle}><Wordmark size={24} glyphOnly /></Animated.View>
            <Wordmark size={24} textOnly />
          </View>
        </Pressable>
        <View style={{ flex: 1 }} />
        {boosted && (
          <Pressable onPress={() => explain('boost')} style={styles.boost} accessibilityLabel="Boost active">
            <Rocket size={14} color="#fff" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>Boosted</Text>
          </Pressable>
        )}
        <InfoButton k="discover" />
      </View>
      <EventBanner />
      {!profile?.paused && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <Segmented value={mode} onChange={setMode} options={[
            { id: 'solo', label: 'Solo' },
            { id: 'duo', label: extras?.duo_requests ? `Duo · ${extras.duo_requests}` : 'Duo' },
          ]} />
        </View>
      )}
      {mode === 'duo' && !profile?.paused ? <DuoDeck /> : <>
      <View style={{ flex: 1 }}>{body}</View>
      {top && !profile?.paused && (
        <View style={styles.actions} pointerEvents="box-none">
          <Pressable onPress={() => decide('pass')} style={[styles.round, { width: 64, height: 64 }]} accessibilityLabel="Pass">
            <X size={30} color={C.text} strokeWidth={2.6} />
          </Pressable>
          <Pressable onPress={() => decide('super')} onLongPress={() => explain('superlike', { left: supersLeft })}
            style={[styles.round, { width: 56, height: 56 }, supersLeft === 0 && { opacity: 0.45 }]}
            accessibilityLabel={`Super like${supersLeft != null ? `, ${supersLeft} left` : ''}`}>
            <Star size={24} color={C.pink} fill={C.pink} />
            {supersLeft != null && <View style={styles.count}><Text style={{ fontFamily: F.bold, fontSize: 11, color: '#fff' }}>{supersLeft}</Text></View>}
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setFiltersOpen(true)} style={[styles.round, { width: 48, height: 48 }]}
            accessibilityLabel={filterCount ? `Filters, ${filterCount} on` : 'Filters'}>
            <SlidersHorizontal size={20} color={C.text} />
            {filterCount > 0 && <View style={styles.dot} />}
          </Pressable>
        </View>
      )}
      {top && !profile?.paused && (
        <TabTip id="discover" title="Swipe or double-tap"
          body="Swipe right to like, left to pass. Double-tap a photo or answer to like that part and add a comment. Hold the Swirl logo anytime for how this works."
          style={styles.tip} />
      )}
      </>}

      <LikeSheet item={likeItem} name={top?.name ?? ''} visible={!!likeItem} supersLeft={supersLeft} busy={busy}
        onClose={() => setLikeItem(null)} onSend={(kind, comment) => decide(kind, likeItem, comment)} />

      <FilterSheet visible={filtersOpen} value={filters} onClose={() => setFiltersOpen(false)}
        onSave={async (f) => {
          setFiltersOpen(false);
          try { await updateProfile({ filters: f }); load(); } catch (e) { Alert.alert("Couldn't save filters", friendlyError(e)); }
        }} />

      {match && profile && (
        <MatchScreen me={profile} them={match.person}
          onClose={() => setMatch(null)}
          onMessage={() => { const id = match.id; setMatch(null); router.push(`/chat/${id}`); }} />
      )}
    </Screen>
  );
}

function FilterSheet({ visible, value, onClose, onSave }: { visible: boolean; value: Filters; onClose: () => void; onSave: (f: Filters) => void }) {
  const [years, setYears] = useState<string[]>(value.years ?? []);
  const [looking, setLooking] = useState<LookingFor[]>(value.looking ?? []);
  const [verified, setVerified] = useState(!!value.verified_only);
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Filters">
      <View style={{ gap: 16, paddingBottom: 8 }}>
        <View>
          <Label>Class year (none selected = everyone)</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GRAD_YEARS.map((y) => <Chip key={y} small label={`${CLASS_NAME[y]} ’${String(y).slice(-2)}`} selected={years.includes(String(y))} onPress={() => setYears(toggle(years, String(y)))} />)}
          </View>
        </View>
        <View>
          <Label>Looking for</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LOOKING_FOR.map((l) => <Chip key={l.id} small label={`${l.emoji} ${l.label}`} selected={looking.includes(l.id)} onPress={() => setLooking(toggle(looking, l.id))} />)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.text }}>Verified people only</Text>
            <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>Only show profiles with a blue check.</Text>
          </View>
          <Switch value={verified} onValueChange={setVerified} trackColor={{ true: C.pink, false: C.surface2 }} thumbColor="#fff" />
        </View>
        <Button label="Save filters" onPress={() => onSave({ years, looking, verified_only: verified })} />
        <Button label="Clear all" variant="ghost" small onPress={() => { setYears([]); setLooking([]); setVerified(false); }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 52 },
  boost: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.violet, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink },
  actions: { position: 'absolute', left: 20, right: 20, bottom: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
  tip: { position: 'absolute', left: 16, right: 16, bottom: 96 },
  stamp: { position: 'absolute', top: 40, borderWidth: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(14,11,22,0.35)' },
  stampLike: { left: 32, borderColor: C.up, transform: [{ rotate: '-14deg' }] },
  stampPass: { right: 32, borderColor: C.down, transform: [{ rotate: '14deg' }] },
  stampText: { fontFamily: F.display, fontSize: 34, letterSpacing: 2 },
  round: { borderRadius: 40, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  count: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: C.bg },
  hint: { fontFamily: F.body, fontSize: 13, color: C.faint, textAlign: 'center', marginTop: 8 },
});
