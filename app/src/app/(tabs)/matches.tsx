import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Heart, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useExtras } from '@/lib/extras';
import { Avatar, Button, EmptyState, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase, friendlyError } from '@/lib/supabase';
import { PTS, type TierId } from '@/lib/constants';
import { Explain, InfoButton } from '@/lib/explain';
import { C, F, GRAD } from '@/lib/theme';

export type MatchRow = {
  match_id: string; other_id: string; name: string; photo: string | null; tier: TierId | null; created_at: string;
  last_body: string | null; last_sender: string | null; last_at: string | null; date_mine: boolean; date_paid: boolean;
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

  if (rows === null && !error) return <Screen><Loading /></Screen>;

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
            keyExtractor={(r) => r.match_id}
            ListHeaderComponent={fresh.length ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.section}>New matches</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 20 }}>
                  {fresh.map((r) => (
                    <Pressable key={r.match_id} onPress={() => router.push(`/chat/${r.match_id}`)} style={{ alignItems: 'center', width: 66 }}>
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
              return (
                <Pressable onPress={() => router.push(`/chat/${r.match_id}`)} style={styles.row}>
                  <Avatar uri={r.photo} name={r.name} size={52} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.name}>{r.name}</Text>
                      <Text style={styles.time}>{r.last_at ? ago(r.last_at) : ''}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.preview, yourTurn && { color: C.text, fontFamily: F.semibold }]} numberOfLines={1}>
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
  turn: { fontFamily: F.bold, fontSize: 11, color: C.text, backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
});
