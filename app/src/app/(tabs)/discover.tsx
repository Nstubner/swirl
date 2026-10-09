import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Heart, RefreshCw, Sparkles, Star, X } from 'lucide-react-native';
import { Button, EmptyState, Loading, Screen, Wordmark } from '@/components/ui';
import { MatchScreen, ProfileCard } from '@/components/profile';
import { useAuth } from '@/lib/auth';
import { supabase, friendlyError } from '@/lib/supabase';
import type { DeckPerson } from '@/lib/constants';
import { C, F, GRAD } from '@/lib/theme';

type Dir = 'like' | 'pass' | 'super';

async function fetchDeck() {
  const { data, error } = await supabase.rpc('get_deck', { p_limit: 30 });
  return { deck: (data ?? []) as DeckPerson[], error: error ? friendlyError(error) : '' };
}

export default function Discover() {
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const [deck, setDeck] = useState<DeckPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<{ id: string; person: DeckPerson } | null>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const apply = useCallback((res: Awaited<ReturnType<typeof fetchDeck>>) => {
    if (res.error) setError(res.error);
    else { setError(''); setDeck(res.deck); }
    setLoading(false);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    return fetchDeck().then(apply);
  }, [apply]);

  useEffect(() => { fetchDeck().then(apply); }, [apply]);

  const top = deck[0];

  // Record the swipe on the server (which updates their score) and advance the deck.
  const commit = useCallback(async (dir: Dir) => {
    if (!top) return;
    setDeck((d) => d.slice(1));
    x.set(0);
    y.set(0);
    setBusy(false);
    const { data, error: e } = await supabase.rpc('swipe', { p_target: top.id, p_kind: dir });
    if (e) { Alert.alert("That swipe didn't save", friendlyError(e)); return; }
    const res = data as { matched: boolean; match_id?: string };
    if (res?.matched && res.match_id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMatch({ id: res.match_id, person: top });
    }
    if (deck.length <= 3) load();
  }, [top, deck.length, load, x, y]);

  const fling = useCallback((dir: Dir) => {
    if (!top || busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    x.set(withTiming(dir === 'like' ? width * 1.4 : dir === 'pass' ? -width * 1.4 : 0, { duration: 260 }));
    y.set(withTiming(dir === 'super' ? -1100 : 40, { duration: 260 }));
    setTimeout(() => commit(dir), 270);
  }, [top, busy, width, commit, x, y]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY);
    })
    .onEnd((e) => {
      if (e.translationX > 110 || e.velocityX > 900) scheduleOnRN(fling, 'like');
      else if (e.translationX < -110 || e.velocityX < -900) scheduleOnRN(fling, 'pass');
      else if (e.translationY < -150 && Math.abs(e.translationX) < 100) scheduleOnRN(fling, 'super');
      else {
        x.set(withSpring(0));
        y.set(withSpring(0));
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${interpolate(x.get(), [-300, 300], [-18, 18])}deg` }],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [0, 100], [0, 1], 'clamp') }));
  const passStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [-100, 0], [1, 0], 'clamp') }));
  const superStyle = useAnimatedStyle(() => ({ opacity: Math.abs(x.get()) < 90 ? interpolate(y.get(), [-120, 0], [1, 0], 'clamp') : 0 }));
  const nextStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.hypot(x.get(), y.get()) / 160);
    return { transform: [{ scale: 0.95 + p * 0.05 }, { translateY: 14 - p * 14 }] };
  });

  let body;
  if (profile?.paused) {
    body = <EmptyState title="Your account is paused" body="You're hidden from Discover and the leaderboard. Turn pause off in Profile to start swiping again." />;
  } else if (loading && !deck.length) {
    body = <Loading />;
  } else if (error) {
    body = <EmptyState title="Couldn't load people" body={error} action={<Button label="Try again" onPress={load} icon={<RefreshCw size={16} color={C.text} />} />} />;
  } else if (!top) {
    body = (
      <EmptyState icon={<Sparkles size={28} color={C.text} />} title="You've seen everyone for now"
        body="New students join every day. Check back soon, and tell your friends to join."
        action={<Button label="Refresh" variant="secondary" onPress={load} />} />
    );
  } else {
    body = (
      <View style={{ flex: 1 }}>
        {deck[1] && (
          <Animated.View style={[StyleSheet.absoluteFill, nextStyle]} pointerEvents="none">
            <ProfileCard key={deck[1].id} person={deck[1]} me={profile} />
          </Animated.View>
        )}
        <GestureDetector gesture={pan}>
          <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
            <ProfileCard key={top.id} person={top} me={profile} onOpen={() => router.push(`/person/${top.id}`)} />
            <Animated.View style={[styles.stamp, { left: 22, transform: [{ rotate: '-14deg' }] }, likeStyle]} pointerEvents="none">
              <LinearGradient colors={GRAD} style={styles.stampInner}><Text style={styles.stampText}>LIKE</Text></LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.stamp, { right: 22, transform: [{ rotate: '14deg' }] }, passStyle]} pointerEvents="none">
              <View style={[styles.stampInner, { backgroundColor: C.cardText }]}><Text style={styles.stampText}>PASS</Text></View>
            </Animated.View>
            <Animated.View style={[styles.stamp, { top: undefined, bottom: 160, alignSelf: 'center' }, superStyle]} pointerEvents="none">
              <LinearGradient colors={['#FF8A5B', C.pink]} style={styles.stampInner}><Text style={styles.stampText}>SUPER</Text></LinearGradient>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Wordmark size={24} />
      </View>
      <View style={{ flex: 1, marginHorizontal: 16, marginTop: 6 }}>{body}</View>
      {top && !profile?.paused ? (
        <View style={styles.actions}>
          <Pressable onPress={() => fling('pass')} style={[styles.round, { width: 64, height: 64 }]} accessibilityLabel="Pass"><X size={30} color={C.text} strokeWidth={2.6} /></Pressable>
          <Pressable onPress={() => fling('super')} style={[styles.round, { width: 50, height: 50 }]} accessibilityLabel="Super like"><Star size={22} color={C.pink} fill={C.pink} /></Pressable>
          <Pressable onPress={() => fling('like')} accessibilityLabel="Like" style={{ borderRadius: 40, overflow: 'hidden' }}>
            <LinearGradient colors={GRAD} style={{ width: 78, height: 78, alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={34} color="#fff" fill="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={{ height: 16 }} />
      )}
      {match && profile && (
        <MatchScreen me={profile} them={match.person}
          onClose={() => setMatch(null)}
          onMessage={() => { const id = match.id; setMatch(null); router.push(`/chat/${id}`); }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingVertical: 14 },
  round: { borderRadius: 40, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stamp: { position: 'absolute', top: 36 },
  stampInner: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6 },
  stampText: { fontFamily: F.display, fontSize: 30, color: '#fff' },
});
