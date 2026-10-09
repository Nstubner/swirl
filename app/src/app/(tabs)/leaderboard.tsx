import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, EyeOff } from 'lucide-react-native';
import { Avatar, Chip, EmptyState, Loading, Movement, Screen, Segmented, TierBadge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase, friendlyError } from '@/lib/supabase';
import { CLASS_NAME, GRAD_YEARS, fmt, signed, type TierId } from '@/lib/constants';
import { C, F, GRAD } from '@/lib/theme';

type Row = { rank: number; user_id: string; name: string; photo: string | null; grad_year: number | null; tier: TierId; value: number | null; move: number; is_me: boolean; visibility: string };
type Mode = 'campus' | 'week' | 'class';

export default function Leaderboard() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>('campus');
  const [grad, setGrad] = useState<number>(profile?.grad_year ?? 2029);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('get_leaderboard', { p_mode: mode === 'week' ? 'week' : 'campus', p_grad: mode === 'class' ? grad : null });
    if (e) setError(friendlyError(e));
    else { setError(''); setRows((data ?? []) as Row[]); }
  }, [mode, grad]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const me = rows?.find((r) => r.is_me) ?? null;
  const hiddenMe = !!me && (me.visibility === 'hidden' || !!profile?.paused);
  const list = (rows ?? []).filter((r) => !(r.is_me && hiddenMe));
  const value = (r: Row) => (r.value == null ? <TierBadge tier={r.tier} small /> : <Text style={styles.value}>{mode === 'week' ? signed(r.value) : fmt(r.value)}</Text>);

  const podium = list.slice(0, 3);
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16 }}>
      {[podium[1], podium[0], podium[2]].map((r, i) => r ? (
        <Pressable key={r.user_id} style={{ flex: 1, alignItems: 'center' }} onPress={() => !r.is_me && router.push(`/person/${r.user_id}`)}>
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

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: F.display, fontSize: 30, color: C.text }}>Leaderboard</Text>
        <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.muted }}>Season 1 · Fall ’26</Text>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Segmented value={mode} onChange={setMode} options={[{ id: 'campus', label: 'Campus' }, { id: 'week', label: 'This week' }, { id: 'class', label: 'By class' }]} />
        {mode === 'class' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {GRAD_YEARS.map((y) => <Chip key={y} small label={String(y)} selected={grad === y} onPress={() => setGrad(y)} />)}
          </View>
        )}
      </View>
      {rows === null && !error ? <Loading /> : error ? (
        <EmptyState title="Couldn't load the leaderboard" body={error} />
      ) : list.length === 0 ? (
        <EmptyState title="No one here yet" body="Once people in this group start swiping, they'll show up here." />
      ) : (
        <FlatList
          data={list.slice(3)}
          keyExtractor={(r) => r.user_id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.pink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          renderItem={({ item: r }) => (
            <Pressable onPress={() => !r.is_me && router.push(`/person/${r.user_id}`)} style={[styles.row, r.is_me && { borderColor: C.pink, borderWidth: 1.5 }]}>
              <Text style={styles.rank}>{r.rank}</Text>
              <View style={{ width: 34, alignItems: 'center' }}><Movement move={r.move} /></View>
              <Avatar uri={r.photo} name={r.name} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>{r.is_me ? `${r.name} (you)` : r.name}</Text>
                <Text style={styles.rowSub}>{r.grad_year ? CLASS_NAME[r.grad_year] ?? '' : ''}</Text>
              </View>
              {value(r)}
            </Pressable>
          )}
          ListFooterComponent={<Text style={styles.footnote}>Hidden profiles don't appear. Tier-only profiles show a badge instead of a score. Pass counts are never shown to anyone.</Text>}
        />
      )}
      {me && (
        <View style={styles.mine}>
          <View style={{ alignItems: 'center', width: 64 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 11, color: C.cardMuted }}>Your rank</Text>
            <Text style={{ fontFamily: F.display, fontSize: 28, color: C.violet }}>#{me.rank}</Text>
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
                <Text style={styles.mineTitle}>{me.value == null ? '' : mode === 'week' ? `${signed(me.value)} this week` : `${fmt(me.value)} pts`}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Movement move={me.move} /><Text style={styles.mineSub}>since yesterday</Text></View>
              </>
            )}
          </View>
          <TierBadge tier={me.tier} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  podName: { fontFamily: F.bold, fontSize: 14, color: C.text, marginTop: 8 },
  value: { fontFamily: F.bold, fontSize: 14, color: C.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  rank: { fontFamily: F.display, fontSize: 16, color: C.text, width: 28, textAlign: 'right' },
  rowName: { fontFamily: F.semibold, fontSize: 15, color: C.text },
  rowSub: { fontFamily: F.body, fontSize: 12, color: C.muted },
  footnote: { fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center', paddingHorizontal: 24, marginTop: 16 },
  mine: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: C.card, borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  mineTitle: { fontFamily: F.bold, fontSize: 15, color: C.cardText },
  mineSub: { fontFamily: F.body, fontSize: 12, color: C.cardMuted },
});
