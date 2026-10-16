import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Heart, Share2, UserPlus, Users, X } from 'lucide-react-native';
import { Avatar, Button, Input, Label, Screen, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useExtras } from '@/lib/extras';
import { InfoButton } from '@/lib/explain';
import { supabase, friendlyError } from '@/lib/supabase';
import type { Duo, DuoMatch, DuoPending } from '@/lib/constants';
import { C, F } from '@/lib/theme';

type Data = { duos: Duo[]; pending: DuoPending[]; matches: DuoMatch[]; suggestions: { id: string; name: string | null; photo: string | null }[] };

async function fetchAll(): Promise<Data> {
  const [d, p, m, s] = await Promise.all([
    supabase.rpc('get_my_duos'), supabase.rpc('get_duo_pending'), supabase.rpc('get_duo_matches'), supabase.rpc('get_duo_suggestions'),
  ]);
  return {
    duos: (d.data ?? []) as Duo[], pending: (p.data ?? []) as DuoPending[],
    matches: (m.data ?? []) as DuoMatch[], suggestions: (s.data ?? []) as Data['suggestions'],
  };
}

/** Everything about duos: requests, votes waiting on you, your duos, adding a friend, and double-date chats. */
export default function Duos() {
  const { profile, session } = useAuth();
  const { extras, refreshExtras } = useExtras();
  const me = session?.user.id;
  const [data, setData] = useState<Data | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => fetchAll().then((x) => { setData(x); refreshExtras(); }), [refreshExtras]);
  useFocusEffect(useCallback(() => { fetchAll().then(setData); }, []));

  const myCode = extras?.invite_code ?? profile?.invite_code ?? '';
  const count = data?.duos.length ?? 0;

  const invite = async (p: { user?: string; code?: string }) => {
    setBusy(true);
    const { data: r, error } = await supabase.rpc('duo_invite', { p_user: p.user ?? null, p_code: p.code ?? null });
    setBusy(false);
    if (error) { Alert.alert("Couldn't send that", friendlyError(error)); return; }
    const res = r as { ok: boolean; error?: string; name?: string; status?: string };
    if (!res.ok) { Alert.alert("Couldn't add that duo", res.error ?? 'Try again.'); return; }
    setCode('');
    Alert.alert(res.status === 'active' ? 'You’re a duo!' : 'Request sent', res.status === 'active'
      ? `You and ${res.name} can swipe on other duos now.` : `${res.name} will get a notification. Once they accept, you can swipe together.`);
    load();
  };

  const respond = async (d: Duo, accept: boolean) => {
    const { error } = await supabase.rpc('duo_respond', { p_duo: d.duo_id, p_accept: accept });
    if (error) Alert.alert('Error', friendlyError(error)); else load();
  };
  const leave = (d: Duo) => {
    Alert.alert(d.status === 'pending' ? 'Cancel this request?' : `Leave your duo with ${d.partner_name}?`,
      d.status === 'pending' ? undefined : 'Your double-date group chats stay. You just stop swiping together.', [
        { text: 'Keep', style: 'cancel' },
        { text: d.status === 'pending' ? 'Cancel request' : 'Leave', style: 'destructive', onPress: async () => {
          const { error } = await supabase.rpc('duo_leave', { p_duo: d.duo_id });
          if (error) Alert.alert('Error', friendlyError(error)); else load();
        } },
      ]);
  };
  const answer = async (p: DuoPending, v: 'like' | 'pass') => {
    const { data: r, error } = await supabase.rpc('duo_vote', { p_duo: p.duo_id, p_target: p.target_id, p_vote: v });
    if (error) { Alert.alert("That didn't save", friendlyError(error)); return; }
    const res = r as { matched?: boolean; match_id?: string };
    if (res.matched && res.match_id) { router.push(`/duo-chat/${res.match_id}`); return; }
    load();
  };

  const requests = data?.duos.filter((d) => d.status === 'pending' && !d.invited_by_me) ?? [];
  const mine = data?.duos.filter((d) => !(d.status === 'pending' && !d.invited_by_me)) ?? [];

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: C.text, flex: 1 }}>Duos</Text>
        <InfoButton k="duos" />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {!data ? (
          <View style={{ padding: 20, gap: 12 }}><Skeleton height={80} radius={18} /><Skeleton height={80} radius={18} /><Skeleton height={140} radius={18} /></View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 22 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.pink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>

            {requests.length > 0 && (
              <View style={{ gap: 8 }}>
                <Label>Duo requests</Label>
                {requests.map((d) => (
                  <View key={d.duo_id} style={styles.card}>
                    <Avatar uri={d.partner_photo} name={d.partner_name} size={44} />
                    <Text style={[styles.cardTitle, { flex: 1 }]}>{d.partner_name} wants to be your duo</Text>
                    <Pressable onPress={() => respond(d, false)} style={styles.iconBtn} accessibilityLabel="Decline"><X size={18} color={C.text} /></Pressable>
                    <Pressable onPress={() => respond(d, true)} style={[styles.iconBtn, { backgroundColor: C.pink }]} accessibilityLabel="Accept"><Check size={18} color="#fff" /></Pressable>
                  </View>
                ))}
              </View>
            )}

            {data.pending.length > 0 && (
              <View style={{ gap: 8 }}>
                <Label>Waiting on you</Label>
                {data.pending.map((p) => (
                  <View key={`${p.duo_id}-${p.target_id}`} style={[styles.card, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
                    <Text style={styles.small}>{p.partner_name} likes this duo. You in?</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {[p.a, p.b].map((x) => (
                        <Pressable key={x.id} onPress={() => router.push(`/person/${x.id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Avatar uri={x.photos?.[0]} name={x.name} size={40} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{x.name}, {x.age}</Text>
                            <Text style={styles.small} numberOfLines={1}>See profile</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Button small variant="secondary" label="Pass" onPress={() => answer(p, 'pass')} style={{ flex: 1 }} />
                      <Button small label="I'm in" icon={<Heart size={14} color="#fff" fill="#fff" />} onPress={() => answer(p, 'like')} style={{ flex: 1 }} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {data.matches.length > 0 && (
              <View style={{ gap: 8 }}>
                <Label>Double dates</Label>
                {data.matches.map((m) => {
                  const others = m.people.filter((p) => p.id !== me);
                  return (
                    <Pressable key={m.match_id} onPress={() => router.push(`/duo-chat/${m.match_id}`)} style={styles.card}>
                      <View style={{ flexDirection: 'row' }}>
                        {others.slice(0, 3).map((p, i) => <View key={p.id} style={{ marginLeft: i ? -14 : 0 }}><Avatar uri={p.photo} name={p.name} size={38} /></View>)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{others.map((p) => p.name).join(', ')}</Text>
                        <Text style={styles.small} numberOfLines={1}>{m.last_body ? `${m.last_sender}: ${m.last_body}` : 'New double date. Say hi!'}</Text>
                      </View>
                      <ChevronRight size={18} color={C.muted} />
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={{ gap: 8 }}>
              <Label>Your duos ({mine.length}/3)</Label>
              {mine.length === 0 && <Text style={styles.small}>Pair up with a friend, then swipe on other duos together in Discover → Duo.</Text>}
              {mine.map((d) => (
                <View key={d.duo_id} style={styles.card}>
                  <Avatar uri={d.partner_photo} name={d.partner_name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>You & {d.partner_name}</Text>
                    <Text style={styles.small}>{d.status === 'active' ? 'Ready to swipe' : 'Waiting for them to accept'}</Text>
                  </View>
                  <Button small variant="ghost" label={d.status === 'active' ? 'Leave' : 'Cancel'} onPress={() => leave(d)} />
                </View>
              ))}
            </View>

            {count < 3 && (
              <View style={{ gap: 10 }}>
                <Label>Add a duo</Label>
                {data.suggestions.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.small}>Friends you invited</Text>
                    {data.suggestions.map((s) => (
                      <View key={s.id} style={styles.card}>
                        <Avatar uri={s.photo} name={s.name} size={40} />
                        <Text style={[styles.cardTitle, { flex: 1 }]}>{s.name}</Text>
                        <Button small label="Ask" icon={<UserPlus size={14} color="#fff" />} onPress={() => invite({ user: s.id })} loading={busy} />
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.small}>Or enter a friend’s Swirl code. They can find it in Profile → Invite friends.</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Input value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC123" maxLength={6}
                    autoCapitalize="characters" style={{ flex: 1 }} returnKeyType="done" onSubmitEditing={() => code.length === 6 && invite({ code })} />
                  <Button label="Add" onPress={() => invite({ code })} disabled={code.length !== 6} loading={busy} />
                </View>
                <Button variant="secondary" label={`Share my code (${myCode})`} icon={<Share2 size={16} color={C.text} />}
                  onPress={() => Share.share({ message: `Be my Swirl duo for double dates 🌀 My code is ${myCode}. Not on Swirl yet? Use it when you sign up and get a free 24-hour Boost.` }).catch(() => {})} />
              </View>
            )}

            <View style={styles.how}>
              <Users size={18} color={C.pink} />
              <Text style={[styles.small, { flex: 1 }]}>
                In Discover, switch to Duo. You both have to like a duo for it to count. When two duos like each other, all four of you get a group chat. Confirm a double date for +30 each.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: C.line },
  cardTitle: { fontFamily: F.semibold, fontSize: 15, color: C.text },
  small: { fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 18 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  how: { flexDirection: 'row', gap: 10, backgroundColor: C.surface2, borderRadius: 16, padding: 12 },
});
