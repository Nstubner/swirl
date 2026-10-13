import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, EyeOff, Home, Users } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Avatar, Button, Chip, EmptyState, Movement, Screen, Segmented, Sheet, Skeleton, TierBadge } from '@/components/ui';
import TabTip from '@/components/TabTip';
import EventBanner from '@/components/EventBanner';
import { Explain, InfoButton } from '@/lib/explain';
import { useExplain } from '@/lib/explain-context';
import { store, useExtras } from '@/lib/extras';
import { useAuth } from '@/lib/auth';
import { supabase, friendlyError } from '@/lib/supabase';
import { CLASS_NAME, GRAD_YEARS, OFF_CAMPUS, fmt, signed, tierById, topPct, type TierId } from '@/lib/constants';
import { C, F, GRAD } from '@/lib/theme';

type Row = {
  rank: number; user_id: string; name: string; photo: string | null; grad_year: number | null; tier: TierId; value: number | null;
  move: number; is_me: boolean; visibility: string; total: number; badges: string[];
};
type TeamRow = { rank: number; name: string; members: number; avg_week: number; is_mine: boolean };
type Mode = 'campus' | 'week' | 'class' | 'dorms' | 'greek';
const MODES: { id: Mode; label: string }[] = [
  { id: 'campus', label: 'Campus' }, { id: 'week', label: 'Week' }, { id: 'class', label: 'Class' }, { id: 'dorms', label: 'Dorms' }, { id: 'greek', label: 'Greek' },
];

function ListSkeleton() {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 18, paddingVertical: 12 }}>
        <Skeleton height={60} width={60} radius={30} /><Skeleton height={76} width={76} radius={38} /><Skeleton height={60} width={60} radius={30} />
      </View>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Skeleton height={40} width={40} radius={20} /><Skeleton height={16} width="50%" /><View style={{ flex: 1 }} /><Skeleton height={16} width={48} />
        </View>
      ))}
    </View>
  );
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const { extras } = useExtras();
  const explain = useExplain();
  const [mode, setMode] = useState<Mode>('campus');
  const [grad, setGrad] = useState<number>(profile?.grad_year ?? 2029);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [teams, setTeams] = useState<TeamRow[] | null>(null);
  const [champs, setChamps] = useState<{ dorm?: string; greek?: string; season?: number }>({});
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [recap, setRecap] = useState(false);

  const load = useCallback(async () => {
    if (mode === 'dorms' || mode === 'greek') {
      const [{ data, error: e }, past] = await Promise.all([
        supabase.rpc(mode === 'dorms' ? 'get_dorm_board' : 'get_greek_board'),
        supabase.from('season_team_results').select('season_id,kind,name').eq('rank', 1).order('season_id', { ascending: false }).limit(4),
      ]);
      if (e) { setError(friendlyError(e)); return; }
      const won = (past.data ?? []) as { season_id: number; kind: 'dorm' | 'greek'; name: string }[];
      const latest = won[0]?.season_id;
      setChamps({ season: latest, dorm: won.find((w) => w.season_id === latest && w.kind === 'dorm')?.name, greek: won.find((w) => w.season_id === latest && w.kind === 'greek')?.name });
      setError('');
      setTeams(((data ?? []) as { rank: number; dorm?: string; chapter?: string; members: number; avg_week: number; is_mine: boolean }[])
        .map((r) => ({ rank: r.rank, name: (r.dorm ?? r.chapter) as string, members: r.members, avg_week: r.avg_week, is_mine: r.is_mine })));
      return;
    }
    const { data, error: e } = await supabase.rpc('get_leaderboard', { p_mode: mode === 'week' ? 'week' : 'campus', p_grad: mode === 'class' ? grad : null });
    if (e) setError(friendlyError(e));
    else { setError(''); setRows((data ?? []) as Row[]); }
  }, [mode, grad]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Swipe left or right anywhere on the board to switch between Campus, Week, Class, Dorms and Greek.
  const step = (d: 1 | -1) => {
    const i = MODES.findIndex((m) => m.id === mode) + d;
    if (i < 0 || i >= MODES.length) return;
    Haptics.selectionAsync().catch(() => {});
    setMode(MODES[i].id);
  };
  const swipe = Gesture.Pan().runOnJS(true).activeOffsetX([-30, 30]).failOffsetY([-12, 12])
    .onEnd((e) => { if (e.translationX < -60 || e.velocityX < -700) step(1); else if (e.translationX > 60 || e.velocityX > 700) step(-1); });

  // Show the season recap once, the first time someone opens the leaderboard after a season ends.
  const last = extras?.last_season;
  useEffect(() => {
    if (!last) return;
    const key = `swirl-recap-${last.id}`;
    if (store.get(key)) return;
    store.set(key, '1');
    const t = setTimeout(() => setRecap(true), 400);
    return () => clearTimeout(t);
  }, [last]);

  const me = rows?.find((r) => r.is_me) ?? null;
  const hiddenMe = !!me && (me.visibility === 'hidden' || !!profile?.paused);
  const total = rows?.[0]?.total ?? 0;
  const list = (rows ?? []).filter((r) => !(r.is_me && hiddenMe) && r.rank <= 25);
  const meBelow = me && me.rank > 25 && !hiddenMe;
  const value = (r: Row) => (r.value == null ? <TierBadge tier={r.tier} small /> : <Text style={styles.value}>{mode === 'week' ? signed(r.value) : fmt(r.value)}</Text>);
  const myPlace = me ? (me.rank <= 25 ? `#${me.rank}` : topPct(me.rank, me.total)) : '';

  const podium = list.slice(0, 3);
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16 }}>
      {[podium[1], podium[0], podium[2]].map((r, i) => r ? (
        <Pressable key={r.user_id} style={{ flex: 1, alignItems: 'center' }} onPress={() => (r.is_me ? router.push('/preview') : router.push(`/person/${r.user_id}`))}>
          {r.rank === 1 ? <Crown size={22} color="#FFC93C" fill="#FFC93C" /> : <View style={{ height: 22 }} />}
          <Avatar uri={r.photo} name={r.name} size={r.rank === 1 ? 74 : 60} />
          <Text style={styles.podName} numberOfLines={1}>{r.is_me ? 'You' : r.name}</Text>
          <View style={{ marginTop: 4 }}>{value(r)}</View>
          <View style={{ marginTop: 4 }}><Movement move={r.move} /></View>
          <LinearGradient colors={GRAD} style={{ width: '100%', height: [64, 92, 48][i], borderTopLeftRadius: 16, borderTopRightRadius: 16, marginTop: 8, alignItems: 'center', paddingTop: 6, opacity: r.rank === 1 ? 1 : 0.8 }}>
            <Text style={{ fontFamily: F.display, fontSize: 22, color: '#fff' }}>{r.rank}</Text>
          </LinearGradient>
        </Pressable>
      ) : <View key={`e${i}`} style={{ flex: 1 }} />)}
    </View>
  );

  const renderRow = (r: Row) => (
    <Pressable key={r.user_id} onPress={() => (r.is_me ? router.push('/preview') : router.push(`/person/${r.user_id}`))} style={[styles.row, r.is_me && { borderColor: C.pink, borderWidth: 1.5 }]}>
      <Text style={styles.rank}>{r.rank}</Text>
      <View style={{ width: 34, alignItems: 'center' }}><Movement move={r.move} /></View>
      <Avatar uri={r.photo} name={r.name} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{r.is_me ? `${r.name} (you)` : r.name}</Text>
        <Text style={styles.rowSub}>{r.grad_year ? CLASS_NAME[r.grad_year] ?? '' : ''}</Text>
      </View>
      {value(r)}
    </Pressable>
  );

  let body;
  if (mode === 'dorms' || mode === 'greek') {
    const greek = mode === 'greek';
    body = teams === null && !error ? <ListSkeleton /> : error ? <EmptyState title="Couldn't load this board" body={error} /> : !teams?.length ? (
      <EmptyState icon={greek ? <Users size={26} color={C.text} /> : <Home size={26} color={C.text} />}
        title={greek ? 'No chapters on the board yet' : 'No dorms on the board yet'}
        body={greek ? 'A chapter shows up once 5 members are on Swirl. Add yours in Edit profile.' : 'A dorm shows up once 5 people from it are on Swirl. Invite your floor.'}
        action={<Button label={greek ? 'Edit profile' : 'Invite friends'} onPress={() => router.push(greek ? '/edit' : '/invite')} />} />
    ) : (
      <FlatList
        data={teams}
        keyExtractor={(d) => d.name}
        contentContainerStyle={{ padding: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.pink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            <Explain k={greek ? 'greek' : 'dorms'}><Text style={styles.note}>Average points per member this week · tap for how it works</Text></Explain>
            {!!(greek ? champs.greek : champs.dorm) && (
              <View style={styles.champs}>
                <Crown size={16} color="#FFC93C" fill="#FFC93C" />
                <Text style={styles.champsText}>Season {champs.season} champs: {greek ? champs.greek : champs.dorm}</Text>
              </View>
            )}
            {!greek && !isDorm(profile?.dorm) && (
              <Text style={[styles.note, { color: C.faint }]}>
                {profile?.dorm ? 'Off-campus isn’t a dorm, so you’re watching this one.' : 'Add your dorm in Edit profile to join your team.'}
                {profile?.greek ? ' Your chapter still competes on the Greek board.' : ''}
              </Text>
            )}
          </View>
        }
        renderItem={({ item: d }) => (
          <View style={[styles.row, d.is_mine && { borderColor: C.pink, borderWidth: 1.5 }]}>
            <Text style={styles.rank}>{d.rank}</Text>
            {d.rank === 1 ? <Crown size={18} color="#FFC93C" fill="#FFC93C" /> : greek ? <Users size={18} color={C.muted} /> : <Home size={18} color={C.muted} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>{d.name}{d.is_mine ? ' (yours)' : ''}</Text>
              <Text style={styles.rowSub}>{d.members} on Swirl</Text>
            </View>
            <Text style={styles.value}>{signed(d.avg_week)}</Text>
          </View>
        )}
      />
    );
  } else if (rows === null && !error) {
    body = <ListSkeleton />;
  } else if (error) {
    body = <EmptyState title="Couldn't load the leaderboard" body={error} />;
  } else if (list.length === 0 && !meBelow) {
    body = <EmptyState title="No one here yet" body="Once people in this group start swiping, they'll show up here." />;
  } else {
    body = (
      <FlatList
        data={list.slice(3)}
        keyExtractor={(r) => r.user_id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.pink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        renderItem={({ item }) => renderRow(item)}
        ListFooterComponent={
          <View>
            {meBelow && me && (
              <>
                <Text style={[styles.note, { marginVertical: 8 }]}>· · ·</Text>
                <Explain k="rank" ctx={{ top: topPct(me.rank, me.total) }} style={[styles.row, { borderColor: C.pink, borderWidth: 1.5 }]}>
                  <Text style={[styles.rank, { width: 64, fontSize: 14 }]}>{topPct(me.rank, me.total)}</Text>
                  <Movement move={me.move} />
                  <Avatar uri={me.photo} name={me.name} size={40} />
                  <Text style={[styles.rowName, { flex: 1 }]} numberOfLines={1}>{me.name} (you)</Text>
                  {value(me)}
                </Explain>
              </>
            )}
            <Explain k="leaderboard">
              <Text style={styles.footnote}>Showing the top 25 of {fmt(total)}. Tier-only profiles show a badge instead of a score. Hidden profiles don't appear. Pass counts are never shown.</Text>
            </Explain>
          </View>
        }
      />
    );
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: F.display, fontSize: 30, color: C.text, flex: 1 }}>Leaderboard</Text>
        <Explain k="season" ctx={{ name: extras?.season?.name }}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.muted }}>{extras?.season?.name ?? 'Season 1'}</Text>
        </Explain>
        <InfoButton k="leaderboard" />
      </View>
      <EventBanner />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Segmented value={mode} onChange={setMode} options={MODES} />
        {mode === 'class' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {GRAD_YEARS.map((y) => <Chip key={y} small label={String(y)} selected={grad === y} onPress={() => setGrad(y)} />)}
          </View>
        )}
      </View>
      <GestureDetector gesture={swipe}><View style={{ flex: 1 }}>{body}</View></GestureDetector>
      <TabTip id="leaderboard" title="How you move up"
        body="Likes and real conversations raise your score. Passes barely count and nobody ever sees them. Swipe sideways to switch boards."
        style={{ position: 'absolute', left: 16, right: 16, bottom: me && mode !== 'dorms' && mode !== 'greek' ? 96 : 16 }} />
      {me && mode !== 'dorms' && mode !== 'greek' && (
        <Pressable style={styles.mine} onPress={() => explain('rank', me.rank > 25 ? { top: topPct(me.rank, me.total) } : undefined)}>
          <View style={{ alignItems: 'center', minWidth: 64 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 11, color: C.cardMuted }}>Your rank</Text>
            <Text style={{ fontFamily: F.display, fontSize: me.rank <= 25 ? 28 : 18, color: C.violet }}>{myPlace}</Text>
          </View>
          <Avatar uri={profile?.photos?.[0]} name={profile?.name} size={42} />
          <View style={{ flex: 1 }}>
            {hiddenMe ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><EyeOff size={14} color={C.cardText} /><Text style={styles.mineTitle}>Hidden</Text></View>
                <Text style={styles.mineSub}>Only you see this rank.</Text>
              </>
            ) : (
              <>
                <Text style={styles.mineTitle}>{me.value == null ? '' : mode === 'week' ? `${signed(me.value)} this week` : `Score ${fmt(me.value)}`}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Movement move={me.move} /><Text style={styles.mineSub}>since midnight</Text></View>
              </>
            )}
          </View>
          <TierBadge tier={me.tier} />
        </Pressable>
      )}

      <Sheet visible={recap} onClose={() => setRecap(false)} title={last ? `${last.name} recap` : 'Season recap'}>
        {last && (
          <View style={{ alignItems: 'center', gap: 10, paddingBottom: 12 }}>
            <TierBadge tier={last.tier} explain={false} />
            <Text style={{ fontFamily: F.display, fontSize: 44, color: C.text }}>{last.rank <= 25 ? `#${last.rank}` : topPct(last.rank, last.total)}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 15, color: C.muted, textAlign: 'center' }}>
              You finished {last.rank <= 25 ? `#${last.rank} of ${fmt(last.total)}` : `in the ${topPct(last.rank, last.total).toLowerCase()}`} with {fmt(last.score)} points, in {tierById(last.tier).name}.
            </Text>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.faint, textAlign: 'center' }}>
              Everyone starts fresh at 1,000 for {extras?.season?.name ?? 'the new season'}. Good luck.
            </Text>
            <Button label="Let's go" onPress={() => setRecap(false)} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const isDorm = (d?: string | null) => !!d && !OFF_CAMPUS.includes(d);

const styles = StyleSheet.create({
  champs: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  champsText: { fontFamily: F.semibold, fontSize: 13, color: C.text },
  podName: { fontFamily: F.bold, fontSize: 14, color: C.text, marginTop: 8 },
  value: { fontFamily: F.bold, fontSize: 14, color: C.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  rank: { fontFamily: F.display, fontSize: 16, color: C.text, width: 28, textAlign: 'right' },
  rowName: { fontFamily: F.semibold, fontSize: 15, color: C.text },
  rowSub: { fontFamily: F.body, fontSize: 12, color: C.muted },
  note: { fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  footnote: { fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center', paddingHorizontal: 24, marginTop: 16 },
  mine: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: C.card, borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  mineTitle: { fontFamily: F.bold, fontSize: 15, color: C.cardText },
  mineSub: { fontFamily: F.body, fontSize: 12, color: C.cardMuted },
});
