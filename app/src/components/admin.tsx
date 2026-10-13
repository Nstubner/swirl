import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Svg, { Rect } from 'react-native-svg';
import { Ban, BadgeCheck, Check, Eye, EyeOff, Search, ShieldCheck, Undo2, X } from 'lucide-react-native';
import { Avatar, Button, Chip, EmptyState, Input, Loading } from './ui';
import { supabase, friendlyError } from '@/lib/supabase';
import { CLASS_NAME, LOOKING_FOR, fmt } from '@/lib/constants';
import { C, F } from '@/lib/theme';

/* ---------- shared bits ---------- */

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const short = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—');

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {sub && <Text style={s.cardSub}>{sub}</Text>}
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue}>{value}</Text>
      {sub && <Text style={s.tileSub}>{sub}</Text>}
    </View>
  );
}

function Bars({ data, color, width, height = 70 }: { data: number[]; color: string; width: number; height?: number }) {
  const max = Math.max(1, ...data);
  const w = width / Math.max(1, data.length);
  return (
    <Svg width={width} height={height}>
      {data.map((v, i) => {
        const h = Math.max(v ? 3 : 1, (v / max) * (height - 4));
        return <Rect key={i} x={i * w + 1} y={height - h} width={Math.max(1, w - 2)} height={h} rx={2} fill={v ? color : C.surface2} />;
      })}
    </Svg>
  );
}

function Split({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: C.surface2 }}>
        {total > 0 && parts.map((p) => <View key={p.label} style={{ flex: p.value, backgroundColor: p.color }} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {parts.map((p) => (
          <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
            <Text style={s.small}>{p.label} {p.value} ({pct(p.value, total)})</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ---------- Overview ---------- */

type Stats = {
  users: number; onboarded: number; banned: number; paused: number;
  gender: Record<string, number>; by_class: Record<string, number>; dorms: { dorm: string; count: number }[];
  dau: number; wau: number; mau: number;
  days: { day: string; signups: number; active: number }[];
  retention: Record<string, { eligible: number; returned: number }>;
  swipes: { like: number; super: number; pass: number; today: number };
  matches: number; matches_messaged: number; matches_both: number; convos: number; dates: number; messages: number;
  referred: number; top_inviters: { name: string | null; email: string; invites: number }[];
  reports_open: number; claims_open: number;
  verifications_pending: number; verified: number; push_users: number; looking_for: Record<string, number>; like_comments: number;
  errors_today?: number; feedback_new?: number;
};

export function Overview({ onJump }: { onJump: (tab: 'reports' | 'rewards' | 'verify' | 'support') => void }) {
  const { width } = useWindowDimensions();
  const [st, setSt] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('admin_stats');
    if (e) setError(friendlyError(e)); else { setError(''); setSt(data as Stats); }
  }, []);
  useEffect(() => {
    supabase.rpc('admin_stats').then(({ data, error: e }) => { if (e) setError(friendlyError(e)); else setSt(data as Stats); });
  }, []);

  if (error) return <EmptyState title="Couldn't load stats" body={error} action={<Button label="Try again" onPress={load} />} />;
  if (!st) return <Loading />;
  const chartW = width - 32 - 32;
  const swipes = st.swipes.like + st.swipes.super + st.swipes.pass;
  const r = (n: number) => st.retention?.[String(n)];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.pink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      {(st.reports_open > 0 || st.claims_open > 0) && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {st.reports_open > 0 && <Button small variant="danger" label={`${st.reports_open} open report${st.reports_open > 1 ? 's' : ''}`} onPress={() => onJump('reports')} />}
          {st.claims_open > 0 && <Button small label={`${st.claims_open} hoodie claim${st.claims_open > 1 ? 's' : ''}`} onPress={() => onJump('rewards')} />}
          {st.verifications_pending > 0 && <Button small variant="secondary" label={`${st.verifications_pending} to verify`} onPress={() => onJump('verify')} />}
        </View>
      )}

      <Card title="Growth">
        <View style={s.grid}>
          <Tile label="Signed up" value={fmt(st.users)} />
          <Tile label="Finished profile" value={fmt(st.onboarded)} sub={`${pct(st.onboarded, st.users)} of signups`} />
          <Tile label="Joined from invites" value={fmt(st.referred)} sub={`${pct(st.referred, st.onboarded)} of profiles`} />
          <Tile label="Paused / banned" value={`${st.paused} / ${st.banned}`} />
        </View>
        <Text style={[s.small, { marginTop: 12 }]}>New signups, last 30 days</Text>
        <Bars data={st.days.map((d) => d.signups)} color={C.pink} width={chartW} />
      </Card>

      <Card title="Activity" sub="People who opened the app">
        <View style={s.grid}>
          <Tile label="Today" value={fmt(st.dau)} />
          <Tile label="Last 7 days" value={fmt(st.wau)} />
          <Tile label="Last 30 days" value={fmt(st.mau)} />
          <Tile label="Stickiness" value={pct(st.dau, st.mau)} sub="today ÷ last 30 days" />
        </View>
        <Text style={[s.small, { marginTop: 12 }]}>Active people per day, last 30 days</Text>
        <Bars data={st.days.map((d) => d.active)} color={C.violet} width={chartW} />
      </Card>

      <Card title="Retention" sub="Of people who finished their profile at least N days ago, how many opened the app again N+ days later">
        <View style={s.grid}>
          {[1, 7, 30].map((n) => (
            <Tile key={n} label={`Came back after ${n} day${n > 1 ? 's' : ''}`} value={r(n)?.eligible ? pct(r(n).returned, r(n).eligible) : '—'}
              sub={r(n)?.eligible ? `${r(n).returned} of ${r(n).eligible}` : 'Not enough data yet'} />
          ))}
        </View>
      </Card>

      <Card title="Who's on Swirl">
        <Split parts={[
          { label: 'Women', value: st.gender.woman ?? 0, color: C.pink },
          { label: 'Men', value: st.gender.man ?? 0, color: C.violet },
          { label: 'Nonbinary', value: st.gender.nonbinary ?? 0, color: '#25D094' },
        ]} />
        <Text style={[s.small, { marginTop: 14 }]}>By class</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {Object.entries(st.by_class).sort().map(([y, n]) => (
            <View key={y} style={s.pill}><Text style={s.pillText}>{CLASS_NAME[Number(y)] ?? y} {n}</Text></View>
          ))}
        </View>
        {st.dorms.length > 0 && <Text style={[s.small, { marginTop: 14 }]}>Top dorms</Text>}
        {st.dorms.map((d) => (
          <View key={d.dorm} style={s.line}><Text style={s.lineLabel}>{d.dorm}</Text><Text style={s.lineValue}>{d.count}</Text></View>
        ))}
      </Card>

      <Card title="Profiles">
        <View style={s.grid}>
          <Tile label="Verified" value={fmt(st.verified)} sub={`${pct(st.verified, st.onboarded)} of profiles`} />
          <Tile label="Notifications on" value={fmt(st.push_users)} sub={`${pct(st.push_users, st.onboarded)} of profiles`} />
          <Pressable style={s.tile} onPress={() => onJump('support')}>
            <Text style={s.tileLabel}>Support messages</Text>
            <Text style={s.tileValue}>{fmt(st.feedback_new ?? 0)}</Text>
            <Text style={s.tileSub}>new · tap to open</Text>
          </Pressable>
          <Pressable style={s.tile} onPress={() => onJump('support')}>
            <Text style={s.tileLabel}>App errors today</Text>
            <Text style={s.tileValue}>{fmt(st.errors_today ?? 0)}</Text>
            <Text style={s.tileSub}>tap to see details</Text>
          </Pressable>
        </View>
        <Text style={[s.small, { marginTop: 14 }]}>Looking for</Text>
        {LOOKING_FOR.map((l) => (
          <View key={l.id} style={s.line}><Text style={s.lineLabel}>{l.emoji} {l.label}</Text><Text style={s.lineValue}>{st.looking_for?.[l.id] ?? 0}</Text></View>
        ))}
      </Card>

      <Card title="Swiping and matching">
        <View style={s.grid}>
          <Tile label="Swipes" value={fmt(swipes)} sub={`${fmt(st.swipes.today)} today`} />
          <Tile label="Like rate" value={pct(st.swipes.like + st.swipes.super, swipes)} sub={`${fmt(st.swipes.super)} Super Likes`} />
          <Tile label="Matches" value={fmt(st.matches)} />
          <Tile label="Matches that chat" value={pct(st.matches_messaged, st.matches)} sub={`${fmt(st.matches_messaged)} matches`} />
          <Tile label="Both replied" value={pct(st.matches_both, st.matches)} />
          <Tile label="Real conversations" value={fmt(st.convos)} sub="both sent 5+ messages" />
          <Tile label="Dates confirmed" value={fmt(st.dates)} sub={`${pct(st.dates, st.matches)} of matches`} />
          <Tile label="Messages" value={fmt(st.messages)} />
          <Tile label="Likes with a comment" value={fmt(st.like_comments)} sub={`${pct(st.like_comments, st.swipes.like + st.swipes.super)} of likes`} />
        </View>
      </Card>

      <Card title="Top inviters">
        {st.top_inviters.length === 0 ? <Text style={s.small}>No invites yet.</Text> : st.top_inviters.map((u) => (
          <View key={u.email} style={s.line}>
            <Text style={s.lineLabel} numberOfLines={1}>{u.name ?? '—'} · {u.email}</Text>
            <Text style={s.lineValue}>{u.invites}</Text>
          </View>
        ))}
      </Card>

      <Card title="Getting the raw data" sub="Everything here comes from your Supabase database.">
        <Text style={s.small}>
          To download a spreadsheet: Supabase → Table Editor → pick a table (profiles, swipes, matches, daily_active…) → Export → CSV.
          Email addresses, names, grad years, dorms and signup dates are in the profiles table.
        </Text>
      </Card>
    </ScrollView>
  );
}

/* ---------- Reports ---------- */

type Report = {
  id: number; created_at: string; reason: string; details: string | null; status: string; reporter_name: string | null;
  target_id: string; target_name: string | null; target_email: string; target_photo: string | null; target_reports: number; target_banned: boolean;
};

export function Reports() {
  const [status, setStatus] = useState<'open' | 'all'>('open');
  const [rows, setRows] = useState<Report[] | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_reports', { p_status: status });
    if (error) Alert.alert('Error', friendlyError(error)); else setRows((data ?? []) as Report[]);
  }, [status]);
  useEffect(() => {
    supabase.rpc('admin_reports', { p_status: status }).then(({ data }) => setRows((data ?? []) as Report[]));
  }, [status]);

  const act = (r: Report, ban: boolean) => {
    Alert.alert(ban ? `Ban ${r.target_name}?` : 'Dismiss this report?',
      ban ? 'They’ll be hidden from everyone and locked out of the app. You can unban them from Users.' : 'The report will be marked as reviewed with no action.', [
        { text: 'Cancel', style: 'cancel' },
        { text: ban ? 'Ban' : 'Dismiss', style: ban ? 'destructive' : 'default', onPress: async () => {
          const { error } = await supabase.rpc('admin_resolve_report', { p_id: r.id, p_ban: ban });
          if (error) Alert.alert('Error', friendlyError(error)); else load();
        } },
      ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 6 }}>
        <Chip small label="Open" selected={status === 'open'} onPress={() => setStatus('open')} />
        <Chip small label="All" selected={status === 'all'} onPress={() => setStatus('all')} />
      </View>
      {!rows ? <Loading /> : (
        <FlatList data={rows} keyExtractor={(r) => String(r.id)} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
          ListEmptyComponent={<EmptyState icon={<ShieldCheck size={26} color={C.text} />} title="No reports" body="Nothing to review right now." />}
          renderItem={({ item: r }) => (
            <View style={s.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar uri={r.target_photo} name={r.target_name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{r.target_name ?? '—'}{r.target_banned ? ' (banned)' : ''}</Text>
                  <Text style={s.small}>{r.target_email} · reported {r.target_reports}×</Text>
                </View>
                <Text style={s.small}>{short(r.created_at)}</Text>
              </View>
              <Text style={[s.lineLabel, { marginTop: 10, fontFamily: F.bold }]}>{r.reason}</Text>
              {!!r.details && <Text style={[s.small, { marginTop: 4 }]}>“{r.details}”</Text>}
              <Text style={[s.small, { marginTop: 4 }]}>From {r.reporter_name ?? 'someone'} · {r.status}</Text>
              {r.status === 'open' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Button small variant="secondary" label="View profile" onPress={() => router.push(`/person/${r.target_id}`)} />
                  <Button small variant="secondary" label="Dismiss" onPress={() => act(r, false)} />
                  <Button small variant="danger" label="Ban" icon={<Ban size={14} color={C.text} />} onPress={() => act(r, true)} />
                </View>
              )}
            </View>
          )} />
      )}
    </View>
  );
}

/* ---------- Users ---------- */

type User = {
  id: string; email: string; name: string | null; gender: string | null; grad_year: number | null; dorm: string | null; created_at: string;
  onboarded: boolean; score: number; invites: number; last_active_at: string | null; banned: boolean; reports: number; photo: string | null;
};

export function Users() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<User[] | null>(null);
  const search = useCallback(async (text: string) => {
    const { data, error } = await supabase.rpc('admin_users', { p_search: text, p_limit: 200 });
    if (error) Alert.alert('Error', friendlyError(error)); else setRows((data ?? []) as User[]);
  }, []);
  useEffect(() => {
    supabase.rpc('admin_users', { p_search: '', p_limit: 200 }).then(({ data }) => setRows((data ?? []) as User[]));
  }, []);

  const toggleBan = (u: User) => {
    Alert.alert(u.banned ? `Unban ${u.name ?? u.email}?` : `Ban ${u.name ?? u.email}?`, u.banned ? 'They’ll be able to use Swirl again.' : 'They’ll be hidden from everyone and locked out.', [
      { text: 'Cancel', style: 'cancel' },
      { text: u.banned ? 'Unban' : 'Ban', style: u.banned ? 'default' : 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('admin_set_banned', { p_user: u.id, p_banned: !u.banned });
        if (error) Alert.alert('Error', friendlyError(error)); else search(q);
      } },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 6 }}>
        <Input value={q} onChangeText={setQ} placeholder="Search name or email" autoCapitalize="none" style={{ flex: 1 }}
          onSubmitEditing={() => search(q)} returnKeyType="search" />
        <Pressable onPress={() => search(q)} style={s.iconBtn} accessibilityLabel="Search"><Search size={18} color={C.text} /></Pressable>
      </View>
      {!rows ? <Loading /> : (
        <FlatList data={rows} keyExtractor={(u) => u.id} contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 60 }}
          ListHeaderComponent={<Text style={[s.small, { marginBottom: 8 }]}>{rows.length} people (newest first)</Text>}
          renderItem={({ item: u }) => (
            <View style={s.userRow}>
              <Avatar uri={u.photo} name={u.name ?? u.email} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={s.lineLabel} numberOfLines={1}>{u.name ?? '(no name yet)'}{u.banned ? ' · banned' : ''}{!u.onboarded ? ' · unfinished' : ''}</Text>
                <Text style={s.small} numberOfLines={1}>{u.email}</Text>
                <Text style={s.small} numberOfLines={1}>
                  {[u.grad_year ? CLASS_NAME[u.grad_year] : null, u.dorm, `${fmt(u.score)} pts`, `${u.invites} invites`, u.reports ? `${u.reports} reports` : null, `joined ${short(u.created_at)}`, `seen ${short(u.last_active_at)}`].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Pressable onPress={() => toggleBan(u)} style={s.iconBtn} accessibilityLabel={u.banned ? 'Unban' : 'Ban'}>
                {u.banned ? <Undo2 size={16} color={C.text} /> : <Ban size={16} color={C.down} />}
              </Pressable>
            </View>
          )} />
      )}
    </View>
  );
}

/* ---------- Verifications ---------- */

type Pending = { user_id: string; name: string | null; email: string; photos: string[]; selfie: string; pose: string | null };

async function fetchPending() {
  const { data, error } = await supabase.rpc('admin_verifications');
  if (error) return { error: friendlyError(error), list: [] as Pending[], urls: {} as Record<string, string> };
  const list = (data ?? []) as Pending[];
  const urls: Record<string, string> = {};
  await Promise.all(list.map(async (r) => {
    const { data: u } = await supabase.storage.from('verifications').createSignedUrl(r.selfie, 3600);
    if (u?.signedUrl) urls[r.user_id] = u.signedUrl;
  }));
  return { error: '', list, urls };
}

export function Verifications() {
  const [rows, setRows] = useState<Pending[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const apply = useCallback((r: Awaited<ReturnType<typeof fetchPending>>) => {
    if (r.error) { Alert.alert('Error', r.error); return; }
    setRows(r.list);
    setUrls(r.urls);
  }, []);
  const load = useCallback(() => fetchPending().then(apply), [apply]);
  useEffect(() => { fetchPending().then(apply); }, [apply]);
  const review = async (r: Pending, approve: boolean) => {
    const { error } = await supabase.rpc('admin_review_verification', { p_user: r.user_id, p_approve: approve });
    if (error) Alert.alert('Error', friendlyError(error)); else load();
  };
  if (!rows) return <Loading />;
  return (
    <FlatList data={rows} keyExtractor={(r) => r.user_id} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
      ListEmptyComponent={<EmptyState icon={<BadgeCheck size={26} color={C.text} />} title="Nothing to verify" body="Selfies people submit show up here." />}
      renderItem={({ item: r }) => (
        <View style={s.card}>
          <Text style={s.cardTitle}>{r.name ?? r.email}</Text>
          <Text style={s.small}>{r.email} · asked to do {r.pose ?? 'a pose'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            <View>
              <View style={[s.verifyImg, { borderColor: C.pink, borderWidth: 2 }]}>
                {urls[r.user_id] ? <Image source={{ uri: urls[r.user_id] }} style={{ flex: 1 }} contentFit="cover" /> : null}
              </View>
              <Text style={[s.small, { textAlign: 'center' }]}>Selfie</Text>
            </View>
            {r.photos.map((ph) => <Image key={ph} source={{ uri: ph }} style={s.verifyImg} contentFit="cover" />)}
          </ScrollView>
          <Text style={[s.small, { marginTop: 8 }]}>Approve if it’s clearly the same person and they’re doing the pose.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Button small variant="secondary" label="Reject" icon={<X size={14} color={C.text} />} onPress={() => review(r, false)} style={{ flex: 1 }} />
            <Button small label="Approve" icon={<Check size={14} color={C.text} />} onPress={() => review(r, true)} style={{ flex: 1 }} />
          </View>
        </View>
      )} />
  );
}

/* ---------- Rewards ---------- */

type Claim = { id: number; created_at: string; reward: string; size: string | null; contact: string | null; status: string; name: string | null; email: string; invites: number };

export function Rewards() {
  const [rows, setRows] = useState<Claim[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_claims');
    setRows((data ?? []) as Claim[]);
  }, []);
  useEffect(() => { supabase.rpc('admin_claims').then(({ data }) => setRows((data ?? []) as Claim[])); }, []);
  const mark = async (c: Claim, status: string) => {
    const { error } = await supabase.rpc('admin_update_claim', { p_id: c.id, p_status: status });
    if (error) Alert.alert('Error', friendlyError(error)); else load();
  };
  if (!rows) return <Loading />;
  return (
    <FlatList data={rows} keyExtractor={(c) => String(c.id)} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
      ListEmptyComponent={<EmptyState title="No hoodie claims yet" body="People who invite 10 friends can claim a hoodie. Claims show up here." />}
      renderItem={({ item: c }) => (
        <View style={s.card}>
          <Text style={s.cardTitle}>{c.name ?? c.email} · size {c.size ?? '?'}</Text>
          <Text style={s.small}>{c.email} · {c.invites} invites · {short(c.created_at)}</Text>
          <Text style={[s.lineLabel, { marginTop: 6 }]}>Contact: {c.contact ?? '—'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <Text style={[s.small, { flex: 1 }]}>Status: {c.status}</Text>
            {c.status === 'new' && <Button small label="Mark sent" icon={<Check size={14} color={C.text} />} onPress={() => mark(c, 'sent')} />}
            {c.status === 'sent' && <Button small variant="secondary" label="Undo" onPress={() => mark(c, 'new')} />}
          </View>
        </View>
      )} />
  );
}

/* ---------- Support: messages from Help & support, plus crash reports ---------- */

type Feedback = { id: number; created_at: string; body: string; contact: string | null; status: 'new' | 'done'; user_name: string | null; user_email: string | null };
type AppError = { id: number; created_at: string; message: string; stack: string | null; screen: string | null; platform: string | null; app_version: string | null; user_name: string | null };

async function fetchSupport() {
  const [f, e] = await Promise.all([supabase.rpc('admin_feedback', { p_limit: 100 }), supabase.rpc('admin_errors', { p_limit: 100 })]);
  return { feedback: (f.data ?? []) as Feedback[], errors: (e.data ?? []) as AppError[], error: f.error || e.error ? friendlyError(f.error ?? e.error) : '' };
}

export function Support() {
  const [view, setView] = useState<'messages' | 'errors'>('messages');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchSupport>> | null>(null);
  const [openErr, setOpenErr] = useState<number | null>(null);
  const load = useCallback(() => fetchSupport().then(setData), []);
  useEffect(() => { fetchSupport().then(setData); }, []);
  const mark = async (f: Feedback) => {
    const { error } = await supabase.rpc('admin_feedback_done', { p_id: f.id, p_done: f.status === 'new' });
    if (error) Alert.alert('Error', friendlyError(error)); else load();
  };
  if (!data) return <Loading />;
  const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.muted} />}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip small label={`Messages (${data.feedback.filter((f) => f.status === 'new').length} new)`} selected={view === 'messages'} onPress={() => setView('messages')} />
        <Chip small label={`App errors (${data.errors.length})`} selected={view === 'errors'} onPress={() => setView('errors')} />
      </View>
      {!!data.error && <Text style={[s.small, { color: C.down }]}>{data.error}. Run the latest schema.sql in Supabase.</Text>}
      {view === 'messages' ? (
        data.feedback.length === 0 ? <EmptyState title="No messages yet" body="Messages people send from Profile → Help & support show up here, and you get a push." /> :
        data.feedback.map((f) => (
          <View key={f.id} style={[s.card, f.status === 'done' && { opacity: 0.55 }]}>
            <Text style={s.small}>{f.user_name ?? 'Deleted user'}{f.user_email ? ` · ${f.user_email}` : ''} · {when(f.created_at)}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.text, marginTop: 6 }}>{f.body}</Text>
            {!!f.contact && <Text style={[s.small, { marginTop: 6 }]}>Contact: {f.contact}</Text>}
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Button small variant={f.status === 'new' ? 'primary' : 'secondary'} label={f.status === 'new' ? 'Mark done' : 'Reopen'}
                icon={f.status === 'new' ? <Check size={14} color={C.text} /> : <Undo2 size={14} color={C.text} />} onPress={() => mark(f)} />
            </View>
          </View>
        ))
      ) : (
        data.errors.length === 0 ? <EmptyState title="No errors" body="When the app crashes or hits an error, the details show up here so you can send them to whoever is fixing it." /> :
        data.errors.map((e) => (
          <Pressable key={e.id} style={s.card} onPress={() => setOpenErr(openErr === e.id ? null : e.id)}>
            <Text style={s.small}>{when(e.created_at)} · {e.platform ?? '?'} {e.app_version ?? ''} · {e.screen || 'unknown screen'}{e.user_name ? ` · ${e.user_name}` : ''}</Text>
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.text, marginTop: 4 }} numberOfLines={openErr === e.id ? undefined : 2}>{e.message}</Text>
            {openErr === e.id && !!e.stack && <Text style={[s.small, { marginTop: 8, fontSize: 11 }]} selectable>{e.stack}</Text>}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

/* ---------- Seasons & events ---------- */

type Winner = { season_id: number; season_name: string; kind: 'dorm' | 'greek'; name: string; rank: number; members: number; avg_points: number; prize_status: 'new' | 'sent' };

type Ev = { id: number; name: string; description: string | null; multiplier: number; starts_at: string; ends_at: string };

export function SeasonsEvents() {
  const [season, setSeason] = useState<{ name: string; started_at: string } | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [newSeason, setNewSeason] = useState('');
  const [name, setName] = useState('Swirl Night');
  const [desc, setDesc] = useState('Likes count double. Everyone’s on.');
  const [mult, setMult] = useState(2);
  const [start, setStart] = useState<'now' | 'tonight' | 'tomorrow'>('tonight');
  const [hours, setHours] = useState(3);
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(true);
  const [teams, setTeams] = useState<{ kind: string; name: string; members: number; hidden: boolean }[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  const loadTeams = useCallback(async () => {
    const { data } = await supabase.rpc('admin_teams');
    setTeams((data ?? []) as typeof teams);
  }, []);
  useEffect(() => { supabase.rpc('admin_teams').then(({ data }) => setTeams((data ?? []) as typeof teams)); }, []);

  const loadWinners = useCallback(() => supabase.rpc('admin_season_winners').then(({ data }) => setWinners((data ?? []) as Winner[])), []);
  useEffect(() => { supabase.rpc('admin_season_winners').then(({ data }) => setWinners((data ?? []) as Winner[])); }, []);
  const markPrize = async (w: Winner) => {
    const { error } = await supabase.rpc('admin_team_prize', { p_season: w.season_id, p_kind: w.kind, p_name: w.name, p_sent: w.prize_status !== 'sent' });
    if (error) Alert.alert('Error', friendlyError(error)); else loadWinners();
  };

  const toggleTeam = async (t: { kind: string; name: string; hidden: boolean }) => {
    const { error } = await supabase.rpc('admin_hide_team', { p_kind: t.kind, p_name: t.name, p_hidden: !t.hidden });
    if (error) Alert.alert('Error', friendlyError(error)); else loadTeams();
  };

  const sendPush = async (title: string, body: string) => {
    const { data, error } = await supabase.rpc('admin_notify_all', { p_title: title, p_body: body });
    if (error) Alert.alert('Error', friendlyError(error));
    else Alert.alert('Sent', `Notification sent to ${data} people.`);
  };

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_stats');
    const st = data as { season: { name: string; started_at: string } | null; events: Ev[] } | null;
    setSeason(st?.season ?? null);
    setEvents(st?.events ?? []);
  }, []);
  useEffect(() => {
    supabase.rpc('admin_stats').then(({ data }) => {
      const st = data as { season: { name: string; started_at: string } | null; events: Ev[] } | null;
      setSeason(st?.season ?? null);
      setEvents(st?.events ?? []);
    });
  }, []);

  const startSeason = () => {
    Alert.alert(`End ${season?.name ?? 'this season'}?`, `Everyone’s final rank is saved for their recap, and all scores reset to 1,000 for “${newSeason.trim()}”. This can’t be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start new season', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('admin_start_season', { p_name: newSeason.trim() });
        if (error) Alert.alert('Error', friendlyError(error)); else { setNewSeason(''); load(); loadWinners(); }
      } },
    ]);
  };

  const createEvent = async () => {
    const now = new Date();
    const s0 = new Date(now);
    if (start === 'tonight' || start === 'tomorrow') {
      s0.setHours(20, 0, 0, 0);
      if (start === 'tomorrow') s0.setDate(s0.getDate() + 1);
    }
    const starts = start === 'now' ? now : s0;
    const ends = new Date(starts.getTime() + hours * 3600000);
    setBusy(true);
    const { error } = await supabase.rpc('admin_create_event', {
      p_name: name.trim(), p_description: desc.trim() || null, p_multiplier: mult, p_starts: starts.toISOString(), p_ends: ends.toISOString(),
    });
    setBusy(false);
    if (error) { Alert.alert('Error', friendlyError(error)); return; }
    load();
    if (notify) {
      const when = start === 'now' ? 'is on now' : start === 'tonight' ? 'tonight at 8' : 'tomorrow at 8';
      sendPush(`${name.trim()} ${when}`, desc.trim() || `Likes count ${mult}×. Everyone’s on.`);
    }
  };

  const endEvent = async (e: Ev) => {
    const { error } = await supabase.rpc('admin_end_event', { p_id: e.id });
    if (error) Alert.alert('Error', friendlyError(error)); else load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Card title="Events" sub="Likes count extra while an event is live. Everyone sees a banner in Discover and on the leaderboard.">
        {events.length === 0 && <Text style={s.small}>No upcoming events.</Text>}
        {events.map((e) => (
          <View key={e.id} style={s.line}>
            <View style={{ flex: 1 }}>
              <Text style={s.lineLabel}>{e.name} · {Number(e.multiplier)}×</Text>
              <Text style={s.small}>{new Date(e.starts_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })} – {new Date(e.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
            <Button small variant="secondary" label="End" onPress={() => endEvent(e)} />
          </View>
        ))}
        <Text style={[s.small, { marginTop: 14, fontFamily: F.bold, color: C.text }]}>New event</Text>
        <Input value={name} onChangeText={setName} placeholder="Name" style={{ marginTop: 8 }} />
        <Input value={desc} onChangeText={setDesc} placeholder="Description" style={{ marginTop: 8 }} />
        <Text style={[s.small, { marginTop: 10 }]}>Likes count</Text>
        <View style={s.chips}>{[1.5, 2, 3].map((m) => <Chip key={m} small label={`${m}×`} selected={mult === m} onPress={() => setMult(m)} />)}</View>
        <Text style={[s.small, { marginTop: 10 }]}>Starts</Text>
        <View style={s.chips}>
          <Chip small label="Now" selected={start === 'now'} onPress={() => setStart('now')} />
          <Chip small label="Tonight 8pm" selected={start === 'tonight'} onPress={() => setStart('tonight')} />
          <Chip small label="Tomorrow 8pm" selected={start === 'tomorrow'} onPress={() => setStart('tomorrow')} />
        </View>
        <Text style={[s.small, { marginTop: 10 }]}>Lasts</Text>
        <View style={s.chips}>{[1, 2, 3, 24].map((h) => <Chip key={h} small label={h === 24 ? '24 hours' : `${h}h`} selected={hours === h} onPress={() => setHours(h)} />)}</View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 }}>
          <Text style={[s.lineLabel, { fontFamily: F.body }]}>Send everyone a notification</Text>
          <Switch value={notify} onValueChange={setNotify} trackColor={{ true: C.pink, false: C.surface2 }} thumbColor="#fff" />
        </View>
        <Button label="Schedule event" onPress={createEvent} loading={busy} disabled={name.trim().length < 2} style={{ marginTop: 14 }} />
      </Card>

      <Card title="Send a notification" sub="Goes to everyone with notifications on. Use sparingly.">
        <Input value={pushTitle} onChangeText={setPushTitle} placeholder="Title, e.g. Swirl Night starts in 1 hour" />
        <Input value={pushBody} onChangeText={setPushBody} placeholder="Message" style={{ marginTop: 8 }} />
        <Button label="Send to everyone" variant="secondary" style={{ marginTop: 10 }} disabled={pushTitle.trim().length < 3}
          onPress={() => Alert.alert('Send to everyone?', pushTitle, [{ text: 'Cancel', style: 'cancel' }, { text: 'Send', onPress: () => { sendPush(pushTitle.trim(), pushBody.trim()); setPushTitle(''); setPushBody(''); } }])} />
      </Card>

      <Card title="Teams on the boards" sub="Hide a dorm or chapter from the leaderboards (for example, if a chapter asks to be removed).">
        {teams.length === 0 && <Text style={s.small}>No dorms or chapters yet.</Text>}
        {teams.map((t) => (
          <View key={`${t.kind}-${t.name}`} style={s.line}>
            <View style={{ flex: 1 }}>
              <Text style={s.lineLabel}>{t.name}</Text>
              <Text style={s.small}>{t.kind === 'greek' ? 'Greek' : 'Dorm'} · {t.members} members{t.hidden ? ' · hidden' : ''}</Text>
            </View>
            <Pressable onPress={() => toggleTeam(t)} style={s.iconBtn} accessibilityLabel={t.hidden ? 'Show' : 'Hide'}>
              {t.hidden ? <EyeOff size={16} color={C.down} /> : <Eye size={16} color={C.text} />}
            </Pressable>
          </View>
        ))}
      </Card>

      {winners.length > 0 && (
        <Card title={`Last season’s winners · ${winners[0].season_name}`} sub="Winning teams get the team prize. Mark it sent once you’ve delivered it.">
          {(['dorm', 'greek'] as const).map((k) => winners.filter((w) => w.kind === k).length > 0 && (
            <View key={k} style={{ marginTop: 8 }}>
              <Text style={s.small}>{k === 'dorm' ? 'Dorms' : 'Greek'}</Text>
              {winners.filter((w) => w.kind === k).map((w) => (
                <View key={w.name} style={s.line}>
                  <Text style={s.lineLabel}>{w.rank}. {w.name}</Text>
                  <Text style={s.small}>{w.members} members · avg {w.avg_points}</Text>
                  {w.rank === 1 && <Button small variant={w.prize_status === 'sent' ? 'secondary' : 'primary'} label={w.prize_status === 'sent' ? 'Sent' : 'Mark sent'} onPress={() => markPrize(w)} />}
                </View>
              ))}
            </View>
          ))}
        </Card>
      )}

      <Card title="Season" sub={season ? `${season.name} · started ${short(season.started_at)}` : undefined}>
        <Text style={s.small}>At the end of the semester, start a new season. Everyone gets a recap of where they finished, and scores reset to 1,000. The top 25 (people who show on the leaderboard) get a Top 25 / Top 10 / #1 badge, and everyone in the winning dorm and chapter gets a Champs badge. Badges stay on profiles for good.</Text>
        <Input value={newSeason} onChangeText={setNewSeason} placeholder="Season 2 · Spring ’27" style={{ marginTop: 10 }} />
        <Button label="End season and start new one" variant="danger" onPress={startSeason} disabled={newSeason.trim().length < 3} style={{ marginTop: 10 }} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line },
  cardTitle: { fontFamily: F.bold, fontSize: 16, color: C.text },
  cardSub: { fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48.5%', backgroundColor: C.surface2, borderRadius: 14, padding: 12 },
  tileLabel: { fontFamily: F.semibold, fontSize: 12, color: C.muted },
  tileValue: { fontFamily: F.display, fontSize: 24, color: C.text, marginTop: 2 },
  tileSub: { fontFamily: F.body, fontSize: 11, color: C.faint, marginTop: 2 },
  small: { fontFamily: F.body, fontSize: 12, color: C.muted, lineHeight: 17 },
  pill: { backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: F.semibold, fontSize: 12, color: C.text },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  lineLabel: { fontFamily: F.semibold, fontSize: 14, color: C.text, flex: 1 },
  lineValue: { fontFamily: F.bold, fontSize: 14, color: C.text },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  verifyImg: { width: 110, height: 138, borderRadius: 12, overflow: 'hidden', backgroundColor: C.surface2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
});
