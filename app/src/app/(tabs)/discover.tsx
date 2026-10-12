import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { RefreshCw, Rocket, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react-native';
import { Button, Chip, EmptyState, Label, Loading, Screen, Sheet, Wordmark } from '@/components/ui';
import { LikeSheet, MatchScreen, ScrollProfile, type LikeItem } from '@/components/profile';
import EventBanner from '@/components/EventBanner';
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

export default function Discover() {
  const { profile, updateProfile } = useAuth();
  const { extras, refreshExtras } = useExtras();
  const explain = useExplain();
  const [deck, setDeck] = useState<DeckPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [likeItem, setLikeItem] = useState<LikeItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [match, setMatch] = useState<{ id: string; person: DeckPerson } | null>(null);
  const fade = useSharedValue(1);
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

  // Record the decision on the server and move to the next person.
  const decide = useCallback(async (dir: Dir, item?: LikeItem | null, comment?: string) => {
    if (!top || busy) return;
    if (dir === 'super' && supersLeft === 0) { explain('superlike_out'); return; }
    setBusy(true);
    setLikeItem(null);
    Haptics.impactAsync(dir === 'pass' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const { data, error: e } = await supabase.rpc('swipe', {
      p_target: top.id, p_kind: dir, p_item: item?.key ?? null, p_comment: comment || null,
    });
    if (dir === 'super') refreshExtras();
    if (e) {
      setBusy(false);
      if (/Out of Super Likes/i.test(e.message)) { explain('superlike_out'); return; }
      Alert.alert("That didn't save", friendlyError(e));
      return;
    }
    fade.set(withTiming(0, { duration: 160 }));
    setTimeout(() => {
      setDeck((d) => d.slice(1));
      fade.set(withTiming(1, { duration: 220 }));
      setBusy(false);
    }, 170);
    const res = data as { matched: boolean; match_id?: string };
    if (res?.matched && res.match_id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMatch({ id: res.match_id, person: top });
    }
    if (deck.length <= 3) load();
  }, [top, busy, supersLeft, explain, refreshExtras, fade, deck.length, load]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateY: (1 - fade.get()) * 24 }] }));

  let body;
  if (profile?.paused) {
    body = <EmptyState title="Your account is paused" body="You're hidden from Discover and the leaderboard. Turn pause off in Profile to start again." />;
  } else if (loading && !deck.length) {
    body = <Loading />;
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
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <ScrollProfile key={top.id} person={top} me={profile} onLike={(item) => setLikeItem(item)} bottomPad={120}
          footer={<Text style={styles.hint}>Tap ♥ on a photo or prompt to like it.</Text>} />
      </Animated.View>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Wordmark size={24} />
        <View style={{ flex: 1 }} />
        {boosted && (
          <Pressable onPress={() => explain('boost')} style={styles.boost} accessibilityLabel="Boost active">
            <Rocket size={14} color="#fff" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>Boosted</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setFiltersOpen(true)} style={styles.iconBtn} accessibilityLabel="Filters">
          <SlidersHorizontal size={18} color={C.text} />
          {filterCount > 0 && <View style={styles.dot} />}
        </Pressable>
        <InfoButton k="discover" />
      </View>
      <EventBanner />
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
        </View>
      )}

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
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink },
  actions: { position: 'absolute', left: 20, bottom: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
  round: { borderRadius: 40, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  count: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: C.bg },
  hint: { fontFamily: F.body, fontSize: 13, color: C.faint, textAlign: 'center', marginTop: 8 },
});
