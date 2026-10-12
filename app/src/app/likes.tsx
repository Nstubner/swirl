import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Heart, Lock, Star } from 'lucide-react-native';
import { Avatar, Button, EmptyState, Loading, Screen, TierBadge, VerifiedCheck } from '@/components/ui';
import { InfoButton } from '@/lib/explain';
import { useExtras } from '@/lib/extras';
import { supabase, friendlyError } from '@/lib/supabase';
import type { TierId } from '@/lib/constants';
import { C, F } from '@/lib/theme';

type Liker = { id: string; name: string; age: number; photo: string | null; tier: TierId | null; kind: 'like' | 'super'; item: string | null; comment: string | null; verified: boolean };

/** "Likes you": people who already liked you. Unlocked by 3 invites or during Swirl Nights. */
export default function Likes() {
  const { extras, refreshExtras } = useExtras();
  const [rows, setRows] = useState<Liker[] | null>(null);
  const [error, setError] = useState('');
  const unlocked = !!extras?.likes_unlocked;
  const count = extras?.likes_count ?? 0;

  const load = useCallback(async () => {
    refreshExtras();
    const { data, error: e } = await supabase.rpc('get_likes_me');
    if (e) setError(friendlyError(e)); else { setError(''); setRows((data ?? []) as Liker[]); }
  }, [refreshExtras]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 6 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text, flex: 1 }}>Likes you</Text>
        <InfoButton k="likes_you" ctx={{ unlocked }} />
      </View>
      {!extras || (unlocked && rows === null && !error) ? <Loading /> : error ? (
        <EmptyState title="Couldn't load likes" body={error} action={<Button label="Try again" onPress={load} />} />
      ) : !unlocked ? (
        <View style={{ flex: 1, padding: 16, gap: 16 }}>
          <View style={styles.grid}>
            {Array.from({ length: Math.min(6, Math.max(count, 2)) }).map((_, i) => (
              <View key={i} style={styles.lockedCard}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: i % 2 ? C.violet : C.pink, opacity: 0.5 }]} />
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <Lock size={22} color="#fff" />
              </View>
            ))}
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 24, color: C.text, textAlign: 'center' }}>
            {count ? `${count} ${count === 1 ? 'person likes' : 'people like'} you` : 'No new likes yet'}
          </Text>
          <Text style={{ fontFamily: F.body, fontSize: 15, color: C.muted, textAlign: 'center' }}>
            See who by inviting 3 friends. Everyone can see their likes during Swirl Nights.
          </Text>
          <Button label="Invite friends" onPress={() => router.push('/invite')} />
        </View>
      ) : !rows?.length ? (
        <EmptyState icon={<Heart size={26} color={C.text} />} title="No new likes" body="When someone likes you, they'll show up here." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item: r }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/person/${r.id}`)}>
              <View style={styles.cardPhoto}>
                {r.photo ? <Image source={{ uri: r.photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={r.name} size={80} />}
                {r.kind === 'super' && <View style={styles.superTag}><Star size={12} color="#fff" fill="#fff" /><Text style={styles.superText}>Super</Text></View>}
              </View>
              <View style={{ padding: 10, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }} numberOfLines={1}>{r.name}, {r.age}</Text>
                  {r.verified && <VerifiedCheck size={14} explain={false} />}
                </View>
                {r.comment ? <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted }} numberOfLines={2}>“{r.comment}”</Text>
                  : <Text style={{ fontFamily: F.body, fontSize: 13, color: C.faint }}>Liked your {r.item?.startsWith('prompt') ? 'prompt' : r.item ? 'photo' : 'profile'}</Text>}
                <TierBadge tier={r.tier} small explain={false} />
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  lockedCard: { width: '30%', aspectRatio: 4 / 5, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2 },
  card: { flex: 1, backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  cardPhoto: { width: '100%', aspectRatio: 4 / 5, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  superTag: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.pink, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  superText: { fontFamily: F.bold, fontSize: 11, color: '#fff' },
});
