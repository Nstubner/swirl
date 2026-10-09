import { useCallback, useId, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { Calculator, ChevronRight, Eye, LogOut, Pause, Pencil, ShieldCheck, Trash2 } from 'lucide-react-native';
import { Avatar, Button, Chip, Label, Loading, MenuRow, Screen, Sheet, TierBadge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { deletePhoto } from '@/lib/photos';
import { supabase, friendlyError } from '@/lib/supabase';
import { CLASS_NAME, VISIBILITY, fmt, nextTier, signed, tierFor, type Visibility } from '@/lib/constants';
import { C, F, GRAD } from '@/lib/theme';

type ScoreInfo = {
  score: number;
  today: number;
  week: number;
  breakdown: Record<string, { count: number; points: number }>;
  history: { day: string; score: number }[];
};

const REASONS: { id: string; label: string }[] = [
  { id: 'like', label: 'Likes received' },
  { id: 'super', label: 'Super Likes received' },
  { id: 'reply', label: 'Quick replies' },
  { id: 'date', label: 'Dates confirmed' },
  { id: 'pass', label: 'Passes' },
  { id: 'ghost', label: 'Ghosted matches' },
];

function Sparkline({ data, width, height = 64 }: { data: number[]; width: number; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (data.length < 2 || width <= 0) return <View style={{ height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 6;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (width - pad * 2) + pad,
    max === min ? height / 2 : height - pad - ((v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={`f${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.pink} stopOpacity={0.35} />
          <Stop offset="1" stopColor={C.pink} stopOpacity={0} />
        </SvgGradient>
        <SvgGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.violet} />
          <Stop offset="1" stopColor={C.pink} />
        </SvgGradient>
      </Defs>
      <Path d={area} fill={`url(#f${uid})`} />
      <Path d={line} stroke={`url(#s${uid})`} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={lx} cy={ly} r={4} fill={C.pink} />
    </Svg>
  );
}

export default function ProfileTab() {
  const { profile, updateProfile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const [info, setInfo] = useState<ScoreInfo | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<'scoring' | 'safety' | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [s, lb] = await Promise.all([
      supabase.rpc('get_my_score'),
      supabase.rpc('get_leaderboard', { p_mode: 'campus', p_grad: null }),
    ]);
    if (s.error) { setError(friendlyError(s.error)); return; }
    setError('');
    setInfo(s.data as ScoreInfo);
    const mine = ((lb.data ?? []) as { rank: number; is_me: boolean }[]).find((r) => r.is_me);
    setRank(mine?.rank ?? null);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!profile) return <Screen><Loading /></Screen>;

  const save = async (patch: { visibility?: Visibility; paused?: boolean }) => {
    setSaving(true);
    try { await updateProfile(patch); } catch (e) { Alert.alert("Couldn't save that", friendlyError(e)); } finally { setSaving(false); }
  };

  const confirmDelete = () => {
    Alert.alert('Delete your account?', 'This permanently deletes your profile, photos, matches, messages and score. It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await Promise.all(profile.photos.map((u) => deletePhoto(u).catch(() => {})));
            const { error: e } = await supabase.rpc('delete_my_account');
            if (e) throw e;
            await signOut();
          } catch (e) {
            Alert.alert("Couldn't delete your account", friendlyError(e));
          }
        },
      },
    ]);
  };

  const score = info?.score ?? 1000;
  const tier = tierFor(score);
  const next = nextTier(score);
  const progress = next ? Math.max(0, Math.min(1, (score - tier.min) / (next.min - tier.min))) : 1;
  const history = (info?.history ?? []).map((h) => h.score);
  const breakdown = REASONS.filter((r) => info?.breakdown?.[r.id]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.pink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8 }}>
          <Avatar uri={profile.photos[0]} name={profile.name} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: C.text }} numberOfLines={1}>{profile.name}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted }}>
              {[profile.major, profile.grad_year ? CLASS_NAME[profile.grad_year] : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/edit')} style={styles.editBtn} accessibilityLabel="Edit profile">
            <Pencil size={18} color={C.text} />
          </Pressable>
        </View>

        {/* Score card */}
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scoreCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.scoreLabel}>Swirl Score</Text>
              <Text style={styles.score}>{info ? fmt(score) : '—'}</Text>
              <Text style={styles.scoreSub}>
                {info ? `${signed(info.today)} today · ${signed(info.week)} this week` : error || 'Loading…'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <TierBadge tier={tier.id} onPhoto />
              {rank != null && <Text style={styles.rank}>#{rank} on campus</Text>}
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <Sparkline data={history} width={width - 32 - 36} />
            <Text style={styles.scoreSub}>Last 14 days</Text>
          </View>
          <View style={{ marginTop: 14 }}>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${progress * 100}%` }]} /></View>
            <Text style={[styles.scoreSub, { marginTop: 6 }]}>
              {next ? `${fmt(next.min - score)} to ${next.name}` : 'Top tier. Keep it up.'}
            </Text>
          </View>
        </LinearGradient>

        {/* Breakdown */}
        <View style={styles.box}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.boxTitle}>Where your points came from</Text>
            <Pressable onPress={() => setSheet('scoring')} hitSlop={8}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.pink }}>How it works</Text></Pressable>
          </View>
          {breakdown.length === 0 ? (
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, paddingVertical: 6 }}>Nothing yet. Everyone starts at 1,000.</Text>
          ) : breakdown.map((r) => {
            const b = info!.breakdown[r.id];
            return (
              <View key={r.id} style={styles.bRow}>
                <Text style={{ fontFamily: F.body, fontSize: 14, color: C.text, flex: 1 }}>{r.label}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, width: 44, textAlign: 'right' }}>×{b.count}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: b.points >= 0 ? C.up : C.down, width: 64, textAlign: 'right' }}>{signed(b.points)}</Text>
              </View>
            );
          })}
        </View>

        {/* Visibility */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Leaderboard visibility</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {VISIBILITY.map((v) => (
              <Chip key={v.id} small label={v.label} selected={profile.visibility === v.id} onPress={() => !saving && v.id !== profile.visibility && save({ visibility: v.id })} />
            ))}
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 10 }}>
            {VISIBILITY.find((v) => v.id === profile.visibility)?.body}
          </Text>
        </View>

        {/* Settings */}
        <View style={[styles.box, { paddingVertical: 4 }]}>
          <View style={styles.switchRow}>
            <View style={styles.icon}><Pause size={18} color={C.text} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.text }}>Pause my account</Text>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>Hide from Discover and the leaderboard. Matches stay.</Text>
            </View>
            <Switch value={profile.paused} disabled={saving} onValueChange={(v) => save({ paused: v })} trackColor={{ true: C.pink, false: C.surface2 }} thumbColor="#fff" />
          </View>
          <MenuRow icon={<Pencil size={18} color={C.text} />} label="Edit profile" sub="Photos, prompts, interests, campus" onPress={() => router.push('/edit')} />
          <MenuRow icon={<Calculator size={18} color={C.text} />} label="How scoring works" onPress={() => setSheet('scoring')} />
          <MenuRow icon={<ShieldCheck size={18} color={C.text} />} label="Safety tips" onPress={() => setSheet('safety')} />
          <MenuRow icon={<LogOut size={18} color={C.text} />} label="Log out" onPress={() => signOut()} />
          <MenuRow icon={<Trash2 size={18} color={C.down} />} label="Delete account" danger onPress={confirmDelete} />
        </View>

        <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center' }}>Signed in as {profile.email}</Text>
      </ScrollView>

      <Sheet visible={sheet === 'scoring'} onClose={() => setSheet(null)} title="How scoring works">
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
          {[
            ['Everyone starts at 1,000', 'Your score never drops below 500.'],
            ['Like received: +10', 'Weighted by the liker’s score vs. yours (½× to 2×). A like from someone ranked above you counts more.'],
            ['Super Like received: +25', 'Same weighting as a like.'],
            ['Pass received: −3', 'A small flat amount. Nobody ever sees who passed on them.'],
            ['Quick reply: +5', 'Send the first message in a match within 24 hours.'],
            ['Date confirmed: +15 each', 'When both of you tap “We went on a date”.'],
            ['Ghosting: −5', 'Unmatching someone you never messaged.'],
          ].map(([t, b]) => (
            <View key={t} style={{ backgroundColor: C.surface2, borderRadius: 16, padding: 14 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{t}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 4 }}>{b}</Text>
            </View>
          ))}
          <Label style={{ marginTop: 8 }}>Tiers</Label>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted }}>Bronze under 900 · Silver 900 · Gold 1,100 · Platinum 1,300 · Diamond 1,500</Text>
        </ScrollView>
      </Sheet>

      <Sheet visible={sheet === 'safety'} onClose={() => setSheet(null)} title="Safety tips">
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
          {[
            'Meet in a public place for the first few dates. Campus spots and Pearl St are good options.',
            'Tell a friend where you’re going and who you’re meeting.',
            'Get yourself there and back. Don’t rely on your date for a ride.',
            'Keep conversations in Swirl until you trust them.',
            'Never send money or financial info to a match.',
            'If something feels off, leave. Report or block anyone who makes you uncomfortable. They won’t know.',
            'In an emergency, call 911. CU Boulder Police: 303-492-6666.',
          ].map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <ChevronRight size={16} color={C.pink} style={{ marginTop: 2 }} />
              <Text style={{ fontFamily: F.body, fontSize: 15, color: C.text, flex: 1, lineHeight: 21 }}>{t}</Text>
            </View>
          ))}
          <Button label="Got it" variant="secondary" onPress={() => setSheet(null)} style={{ marginTop: 8 }} icon={<Eye size={16} color={C.text} />} />
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  editBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  scoreCard: { borderRadius: 26, padding: 18 },
  scoreLabel: { fontFamily: F.semibold, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  score: { fontFamily: F.display, fontSize: 52, color: '#fff', lineHeight: 58 },
  scoreSub: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  rank: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  box: { backgroundColor: C.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line },
  boxTitle: { fontFamily: F.bold, fontSize: 15, color: C.text },
  bRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
});
