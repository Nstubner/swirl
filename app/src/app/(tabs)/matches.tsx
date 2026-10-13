import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Ban, ChevronRight, Flag, Heart, HeartCrack, Lock, MessageCircle, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useExtras } from '@/lib/extras';
import { Avatar, Button, EmptyState, MenuRow, Screen, Sheet, Skeleton } from '@/components/ui';
import { ReportSheet } from '@/components/profile';
import TabTip from '@/components/TabTip';
import { useAuth } from '@/lib/auth';
import { supabase, friendlyError } from '@/lib/supabase';
import { PTS, type TierId } from '@/lib/constants';
import { Explain, InfoButton } from '@/lib/explain';
import { C, F, GRAD } from '@/lib/theme';

export type MatchRow = {
  match_id: string; other_id: string; name: string; photo: string | null; tier: TierId | null; created_at: string;
  last_body: string | null; last_sender: string | null; last_at: string | null; date_mine: boolean; date_paid: boolean; unread?: number; verified?: boolean;
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function Matches() {
  const { session } = useAuth();
  const { extras } = useExtras();
  const likes = extras?.likes_count ?? 0;
  const me = session?.user.id;
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<MatchRow | null>(null);
  const [reporting, setReporting] = useState<MatchRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('get_matches');
    if (e) setError(friendlyError(e));
    else { setError(''); setRows((data ?? []) as MatchRow[]); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Refresh when a new message or match arrives.
  useEffect(() => {
    const ch = supabase.channel('matches-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  if (rows === null && !error) {
    return (
      <Screen>
        <View style={{ padding: 20, gap: 16 }}>
          <Skeleton height={34} width="45%" />
          <Skeleton height={70} radius={18} />
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Skeleton height={52} width={52} radius={26} />
              <View style={{ flex: 1, gap: 8 }}><Skeleton height={14} width="40%" /><Skeleton height={12} width="75%" /></View>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  const openMenu = (r: MatchRow) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setMenu(r); };
  const unmatch = (r: MatchRow) => {
    setMenu(null);
    Alert.alert(`Unmatch ${r.name}?`, r.last_body ? 'This removes the conversation for both of you.' : `You haven’t messaged them, so unmatching counts as ghosting (${PTS.ghost}).`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unmatch', style: 'destructive', onPress: async () => {
        const { error: e } = await supabase.rpc('unmatch', { p_match: r.match_id });
        if (e) Alert.alert("Couldn't unmatch", friendlyError(e)); else load();
      } },
    ]);
  };
  const block = (r: MatchRow) => {
    setMenu(null);
    Alert.alert(`Block ${r.name}?`, "You won't see each other anywhere on Swirl. They won't be told.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: async () => {
        const { error: e } = await supabase.rpc('block_user', { p_target: r.other_id });
        if (e) Alert.alert("Couldn't block", friendlyError(e)); else load();
      } },
    ]);
  };

  const fresh = (rows ?? []).filter((r) => !r.last_body);
  const convos = (rows ?? []).filter((r) => r.last_body);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ fontFamily: F.display, fontSize: 30, color: C.text, flex: 1 }}>Matches</Text>
        <InfoButton k="matches" />
      </View>
      {likes > 0 && (
        <Pressable onPress={() => router.push('/likes')} style={{ marginHorizontal: 16, marginBottom: 12 }} accessibilityRole="button">
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.likesCard}>
            <View style={styles.likesIcon}>{extras?.likes_unlocked ? <Heart size={20} color={C.pink} fill={C.pink} /> : <Lock size={18} color={C.pink} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: '#fff' }}>{likes} {likes === 1 ? 'person likes' : 'people like'} you</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                {extras?.likes_unlocked ? 'Tap to see who' : 'Invite 3 friends to see who'}
              </Text>
            </View>
            <ChevronRight size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      )}
      {error ? <EmptyState title="Couldn't load matches" body={error} action={<Button label="Try again" onPress={load} />} /> :
        !rows?.length ? (
          <EmptyState icon={<Heart size={28} color={C.text} />} title="No matches yet" body="When you and someone both swipe right, they show up here."
            action={<Button label="Start swiping" onPress={() => router.navigate('/discover')} />} />
        ) : (
          <FlatList
            data={convos}
            refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.pink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
            keyExtractor={(r) => r.match_id}
            ListHeaderComponent={fresh.length ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.section}>New matches</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 20 }}>
                  {fresh.map((r) => (
                    <Pressable key={r.match_id} onPress={() => router.push(`/chat/${r.match_id}`)} onLongPress={() => openMenu(r)} style={{ alignItems: 'center', width: 66 }}>
                      <View style={{ padding: 2, borderRadius: 40, borderWidth: 2, borderColor: C.pink }}><Avatar uri={r.photo} name={r.name} size={58} /></View>
                      <Text style={styles.freshName} numberOfLines={1}>{r.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {convos.length > 0 && <Text style={[styles.section, { marginTop: 18 }]}>Messages</Text>}
              </View>
            ) : <Text style={styles.section}>Messages</Text>}
            ListEmptyComponent={<Text style={{ fontFamily: F.body, color: C.muted, paddingHorizontal: 20 }}>Say hi to your new matches. Messaging within 24 hours earns +{PTS.reply}.</Text>}
            renderItem={({ item: r }) => {
              const yourTurn = r.last_sender && r.last_sender !== me;
              const unread = (r.unread ?? 0) > 0;
              return (
                <Pressable onPress={() => router.push(`/chat/${r.match_id}`)} onLongPress={() => openMenu(r)} style={styles.row}
                  accessibilityHint="Hold for more options">
                  <Avatar uri={r.photo} name={r.name} size={52} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.name}>{r.name}</Text>
                        {unread && <View style={styles.unreadDot} accessibilityLabel={`${r.unread} unread`} />}
                      </View>
                      <Text style={styles.time}>{r.last_at ? ago(r.last_at) : ''}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.preview, (yourTurn || unread) && { color: C.text, fontFamily: F.semibold }]} numberOfLines={1}>
                        {r.last_sender === me ? 'You: ' : ''}{r.last_body}
                      </Text>
                      {yourTurn && <Explain k="your_turn"><Text style={styles.turn}>Your turn</Text></Explain>}
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )}

      {!!rows?.length && (
        <TabTip id="matches" title="Make the first move"
          body={`Message within 24 hours of matching for +${PTS.reply}. Hold a chat for more options like unmatch or report.`}
          style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }} />
      )}

      <Sheet visible={!!menu} onClose={() => setMenu(null)} title={menu?.name}>
        {menu && (
          <View style={{ paddingBottom: 8 }}>
            <MenuRow icon={<MessageCircle size={18} color={C.text} />} label="Open chat" onPress={() => { const m = menu; setMenu(null); router.push(`/chat/${m.match_id}`); }} />
            <MenuRow icon={<User size={18} color={C.text} />} label="View profile" onPress={() => { const m = menu; setMenu(null); router.push(`/person/${m.other_id}`); }} />
            <MenuRow icon={<HeartCrack size={18} color={C.text} />} label="Unmatch" onPress={() => unmatch(menu)} />
            <MenuRow icon={<Flag size={18} color={C.down} />} label="Report" danger onPress={() => { const m = menu; setMenu(null); setReporting(m); }} />
            <MenuRow icon={<Ban size={18} color={C.down} />} label="Block" danger onPress={() => block(menu)} />
          </View>
        )}
      </Sheet>
      <ReportSheet target={reporting ? { id: reporting.other_id, name: reporting.name } : null} visible={!!reporting}
        onClose={() => setReporting(null)} onDone={() => { setReporting(null); load(); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  likesCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14 },
  likesIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  section: { fontFamily: F.bold, fontSize: 13, color: C.muted, paddingHorizontal: 20, marginBottom: 8 },
  freshName: { fontFamily: F.semibold, fontSize: 12, color: C.text, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
  name: { fontFamily: F.bold, fontSize: 16, color: C.text },
  time: { fontFamily: F.body, fontSize: 12, color: C.faint },
  preview: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.muted, marginTop: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.pink },
  turn: { fontFamily: F.bold, fontSize: 11, color: C.text, backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
});
