import { useCallback, useId, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { BadgeCheck, BarChart3, Bell, Calculator, ChevronRight, Eye, Gift, LogOut, Pause, Pencil, Share2, ShieldCheck, Trash2, Trophy } from 'lucide-react-native';
import { Avatar, Badges, Button, Chip, Loading, MenuRow, Screen, Sheet, TierBadge, VerifiedCheck } from '@/components/ui';
import { ShareSheet, type Recap, type ShareContent } from '@/components/ShareCard';
import { Explain, InfoButton } from '@/lib/explain';
import { useExplain } from '@/lib/explain-context';
import { useExtras } from '@/lib/extras';
import { useAuth } from '@/lib/auth';
import { deletePhoto } from '@/lib/photos';
import { supabase, friendlyError } from '@/lib/supabase';
import { CLASS_NAME, INVITE_MILESTONES, VISIBILITY, fmt, nextTier, signed, tierById, tierFor, topPct, type Visibility } from '@/lib/constants';
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
  { id: 'convo', label: 'Real conversations' },
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
  const { extras } = useExtras();
  const explain = useExplain();
  const { width } = useWindowDimensions();
  const [info, setInfo] = useState<ScoreInfo | null>(null);
  const [place, setPlace] = useState<{ rank: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [safety, setSafety] = useState(false);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [sharing, setSharing] = useState<ShareContent | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [s, lb, rc] = await Promise.all([
      supabase.rpc('get_my_score'),
      supabase.rpc('get_leaderboard', { p_mode: 'campus', p_grad: null }),
      supabase.rpc('get_weekly_recap'),
    ]);
    if (!rc.error) setRecap(rc.data as Recap);
    if (s.error) { setError(friendlyError(s.error)); return; }
    setError('');
    setInfo(s.data as ScoreInfo);
    const mine = ((lb.data ?? []) as { rank: number; is_me: boolean; total: number }[]).find((r) => r.is_me);
    setPlace(mine ? { rank: mine.rank, total: mine.total } : null);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!profile) return <Screen><Loading /></Screen>;

  const save = async (patch: { visibility?: Visibility; paused?: boolean; push_enabled?: boolean }) => {
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
  const invites = extras?.invites ?? profile.invites ?? 0;
  const nextMilestone = INVITE_MILESTONES.find((m) => m.at > invites);
  const placeLabel = place ? (place.rank <= 25 ? `#${place.rank} on campus` : `${topPct(place.rank, place.total)} on campus`) : null;
  const last = extras?.last_season;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.pink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8 }}>
          <Pressable onPress={() => router.push('/preview')} accessibilityLabel="See your profile">
            <Avatar uri={profile.photos[0]} name={profile.name} size={64} />
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: F.display, fontSize: 26, color: C.text, flexShrink: 1 }} numberOfLines={1}>{profile.name}</Text>
              {(extras?.verified ?? profile.verified) && <VerifiedCheck size={20} />}
            </View>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted }}>
              {[profile.major, profile.grad_year ? CLASS_NAME[profile.grad_year] : null].filter(Boolean).join(' · ')}
            </Text>
            <Badges ids={extras?.badges ?? profile.badges} />
          </View>
          <Pressable onPress={() => router.push('/edit')} style={styles.editBtn} accessibilityLabel="Edit profile">
            <Pencil size={18} color={C.text} />
          </Pressable>
        </View>
        <Button label="See your profile" variant="secondary" small icon={<Eye size={16} color={C.text} />} onPress={() => router.push('/preview')} />

        {/* Score card */}
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scoreCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Explain k="score">
              <Text style={styles.scoreLabel}>Swirl Score ⓘ</Text>
              <Text style={styles.score}>{info ? fmt(score) : '—'}</Text>
            </Explain>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <TierBadge tier={tier.id} onPhoto />
              {placeLabel && <Explain k="rank" ctx={place && place.rank > 25 ? { top: topPct(place.rank, place.total) } : undefined}><Text style={styles.rank}>{placeLabel}</Text></Explain>}
            </View>
          </View>
          <Explain k="today">
            <Text style={styles.scoreSub}>
              {info ? `${signed(info.today)} today · ${signed(info.week)} this week` : error || 'Loading…'}
            </Text>
          </Explain>
          <Explain k="history" style={{ marginTop: 14 }}>
            <Sparkline data={history} width={width - 32 - 36} />
            <Text style={styles.scoreSub}>Last 14 days</Text>
          </Explain>
          <Explain k="next_tier" ctx={{ next: next?.name, need: next ? next.min - score : 0 }} style={{ marginTop: 14 }}>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${progress * 100}%` }]} /></View>
            <Text style={[styles.scoreSub, { marginTop: 6 }]}>
              {next ? `${fmt(next.min - score)} to ${next.name}` : 'Top tier. Keep it up.'}
            </Text>
          </Explain>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            {extras?.season && (
              <Explain k="season" ctx={{ name: extras.season.name }} style={{ flex: 1 }}>
                <Text style={[styles.scoreSub, { opacity: 0.8 }]}>{extras.season.name}</Text>
              </Explain>
            )}
            <Pressable onPress={() => setSharing({ kind: 'tier', tier: tier.id, place: placeLabel, season: extras?.season?.name ?? null })} style={styles.shareBtn} accessibilityLabel="Share my tier">
              <Share2 size={14} color="#fff" />
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>Share</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Weekly recap */}
        {recap && (
          <View style={styles.box}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Explain k="recap"><Text style={styles.boxTitle}>Your week</Text></Explain>
              <Pressable onPress={() => setSharing({ kind: 'week', recap })} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Share2 size={14} color={C.pink} />
                <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.pink }}>Share</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              {[
                [recap.rank_then - recap.rank_now > 0 ? `↑${recap.rank_then - recap.rank_now}` : recap.rank_then - recap.rank_now < 0 ? `↓${recap.rank_now - recap.rank_then}` : '—', 'spots'],
                [signed(recap.points), 'points'],
                [String(recap.likes), 'likes'],
                [String(recap.matches), 'matches'],
                [String(recap.convos + recap.dates), 'convos + dates'],
              ].map(([v, l]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontFamily: F.display, fontSize: 20, color: C.text }}>{v}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 11, color: C.muted, textAlign: 'center' }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Invites */}
        <Pressable onPress={() => router.push('/invite')} style={[styles.box, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} accessibilityRole="button">
          <LinearGradient colors={GRAD} style={styles.giftIcon}><Gift size={20} color="#fff" /></LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.boxTitle}>Invite friends</Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 2 }}>
              {invites} joined{nextMilestone ? ` · ${nextMilestone.at - invites} more for ${nextMilestone.title.replace(/^\+2 Super Likes per friend$/, '2 extra Super Likes')}` : ' · every reward unlocked'}
            </Text>
            <View style={[styles.barTrackDark, { marginTop: 8 }]}>
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 6, width: `${Math.min(1, invites / 10) * 100}%` }} />
            </View>
          </View>
          <ChevronRight size={18} color={C.muted} />
        </Pressable>

        {/* Last season */}
        {last && (
          <Explain k="season" ctx={{ name: last.name }} style={[styles.box, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Trophy size={22} color="#FFC93C" />
            <View style={{ flex: 1 }}>
              <Text style={styles.boxTitle}>{last.name}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 2 }}>
                Finished {last.rank <= 25 ? `#${last.rank}` : topPct(last.rank, last.total).toLowerCase()} · {fmt(last.score)} pts · {tierById(last.tier).name}
              </Text>
            </View>
          </Explain>
        )}

        {/* Breakdown */}
        <View style={styles.box}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.boxTitle}>Where your points came from</Text>
            <Pressable onPress={() => explain('scoring')} hitSlop={8}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.pink }}>How it works</Text></Pressable>
          </View>
          {breakdown.length === 0 ? (
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, paddingVertical: 6 }}>Nothing yet this season. Everyone starts at 1,000.</Text>
          ) : breakdown.map((r) => {
            const b = info!.breakdown[r.id];
            return (
              <Explain key={r.id} k={`reason_${r.id}`} style={styles.bRow}>
                <Text style={{ fontFamily: F.body, fontSize: 14, color: C.text, flex: 1 }}>{r.label}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, width: 44, textAlign: 'right' }}>×{b.count}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: b.points >= 0 ? C.up : C.down, width: 64, textAlign: 'right' }}>{signed(b.points)}</Text>
              </Explain>
            );
          })}
        </View>

        {/* Visibility */}
        <View style={styles.box}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.boxTitle}>Leaderboard visibility</Text>
            <InfoButton k="visibility" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
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
            <Pressable style={{ flex: 1 }} onPress={() => explain('pause')}>
              <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.text }}>Pause my account</Text>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>Hide from Discover and the leaderboard. Matches stay.</Text>
            </Pressable>
            <Switch value={profile.paused} disabled={saving} onValueChange={(v) => save({ paused: v })} trackColor={{ true: C.pink, false: C.surface2 }} thumbColor="#fff" />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.icon}><Bell size={18} color={C.text} /></View>
            <Pressable style={{ flex: 1 }} onPress={() => explain('push')}>
              <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.text }}>Notifications</Text>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>Matches, messages and Swirl Nights</Text>
            </Pressable>
            <Switch value={profile.push_enabled ?? true} disabled={saving} onValueChange={(v) => save({ push_enabled: v })} trackColor={{ true: C.pink, false: C.surface2 }} thumbColor="#fff" />
          </View>
          <MenuRow icon={<BadgeCheck size={18} color="#3B82F6" />} label={(extras?.verified ?? profile.verified) ? 'Verified' : 'Get verified'}
            sub={{ approved: 'Your profile has a blue check', pending: 'We’re checking your selfie', rejected: 'Didn’t go through. Try again', none: 'A quick selfie earns a blue check' }[extras?.verification_status ?? profile.verification_status ?? 'none']}
            onPress={() => router.push('/verify-photo')} />
          {extras?.is_admin && (
            <MenuRow icon={<BarChart3 size={18} color={C.pink} />} label="Admin dashboard" sub="Signups, activity, reports, rewards" onPress={() => router.push('/admin')} />
          )}
          <MenuRow icon={<Pencil size={18} color={C.text} />} label="Edit profile" sub="Photos, prompts, interests, campus" onPress={() => router.push('/edit')} />
          <MenuRow icon={<Gift size={18} color={C.text} />} label="Invite friends" sub="Earn Super Likes, a Boost, badges and a hoodie" onPress={() => router.push('/invite')} />
          <MenuRow icon={<Calculator size={18} color={C.text} />} label="How scoring works" onPress={() => explain('scoring')} />
          <MenuRow icon={<ShieldCheck size={18} color={C.text} />} label="Safety tips" onPress={() => setSafety(true)} />
          <MenuRow icon={<LogOut size={18} color={C.text} />} label="Log out" onPress={() => signOut()} />
          <MenuRow icon={<Trash2 size={18} color={C.down} />} label="Delete account" danger onPress={confirmDelete} />
        </View>

        <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center' }}>Signed in as {profile.email}</Text>
      </ScrollView>

      <ShareSheet content={sharing} onClose={() => setSharing(null)} />

      <Sheet visible={safety} onClose={() => setSafety(false)} title="Safety tips">
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
          <Button label="Got it" variant="secondary" onPress={() => setSafety(false)} style={{ marginTop: 8 }} />
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
  barTrackDark: { height: 6, borderRadius: 3, backgroundColor: C.surface2, overflow: 'hidden' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(14,11,22,0.3)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  giftIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: C.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line },
  boxTitle: { fontFamily: F.bold, fontSize: 15, color: C.text },
  bRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
});
