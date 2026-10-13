import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeInUp, FadeOutUp, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Heart, MessageCircle, Star, CalendarHeart } from 'lucide-react-native';
import { Button, TierBadge } from './ui';
import { useAuth } from '@/lib/auth';
import { store } from '@/lib/extras';
import { supabase } from '@/lib/supabase';
import { TIERS, tierFor, type TierId } from '@/lib/constants';
import { C, F } from '@/lib/theme';

/* ---------- Confetti (Swirl colors). Renders nothing when Reduce Motion is on. ---------- */

const COLORS = [C.pink, C.violet, '#FFC93C', '#FFFFFF', '#25D094'];
// Deterministic "random" so renders stay pure.
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function Piece({ i, width, height }: { i: number; width: number; height: number }) {
  const t = useSharedValue(0);
  const x0 = rnd(i, 1) * width;
  const drift = (rnd(i, 2) - 0.5) * 120;
  const rot = 360 + rnd(i, 3) * 540;
  const size = 6 + rnd(i, 4) * 7;
  useEffect(() => {
    t.set(withDelay(rnd(i, 5) * 500, withTiming(1, { duration: 1900 + rnd(i, 6) * 900, easing: Easing.out(Easing.quad) })));
  }, [t, i]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() < 0.85 ? 1 : (1 - t.get()) / 0.15,
    transform: [{ translateX: x0 + drift * t.get() }, { translateY: -30 + (height + 60) * t.get() }, { rotate: `${rot * t.get()}deg` }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size * 1.6, borderRadius: 2, backgroundColor: COLORS[i % COLORS.length] }, style]} />;
}

export function Confetti({ count = 40 }: { count?: number }) {
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => <Piece key={i} i={i} width={width} height={height} />)}
    </View>
  );
}

/* ---------- Live score pop-ups + tier-up celebration ---------- */

type Feed = { id: number; delta: number; reason: string; item: string | null };
const TIER_KEY = 'swirl_last_tier';

function toastText(f: Feed) {
  const what = f.item?.startsWith('photo') ? 'photo' : f.item ? 'answer' : 'profile';
  switch (f.reason) {
    case 'super': return { icon: <Star size={16} color={C.pink} fill={C.pink} />, text: 'Someone Super Liked you' };
    case 'like': return { icon: <Heart size={16} color={C.pink} fill={C.pink} />, text: `Someone liked your ${what}` };
    case 'reply': return { icon: <MessageCircle size={16} color={C.up} />, text: 'Quick reply bonus' };
    case 'convo': return { icon: <MessageCircle size={16} color={C.up} />, text: 'Real conversation bonus' };
    case 'date': return { icon: <CalendarHeart size={16} color={C.pink} />, text: 'Date confirmed' };
    default: return { icon: <Heart size={16} color={C.pink} />, text: 'Your score went up' };
  }
}

/** Shows "+8 · Someone liked your photo" as it happens, and a celebration when you reach a new tier. */
export function ScoreToasts() {
  const { session } = useAuth();
  const me = session?.user.id;
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Feed[]>([]);
  const [tierUp, setTierUp] = useState<TierId | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compare your current tier with the last one we celebrated.
  const checkTier = useCallback(async (celebrate: boolean) => {
    const { data } = await supabase.rpc('get_my_score');
    const score = (data as { score?: number } | null)?.score;
    if (score == null) return;
    const now = tierFor(score);
    const nowIdx = TIERS.findIndex((t) => t.id === now.id);
    const prev = store.get(TIER_KEY);
    const prevIdx = prev ? TIERS.findIndex((t) => t.id === prev) : -1;
    store.set(TIER_KEY, now.id);
    if (celebrate && prevIdx >= 0 && nowIdx > prevIdx) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTierUp(now.id);
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    const t0 = setTimeout(() => { checkTier(true); }, 1500);
    const ch = supabase.channel(`score-feed-${me}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'score_feed', filter: `user_id=eq.${me}` }, (payload) => {
        const f = payload.new as Feed;
        setToasts((cur) => [...cur.slice(-2), f]);
        setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== f.id)), 3500);
        if (checkTimer.current) clearTimeout(checkTimer.current);
        checkTimer.current = setTimeout(() => { checkTier(true); }, 800);
      })
      .subscribe();
    return () => {
      clearTimeout(t0);
      if (checkTimer.current) clearTimeout(checkTimer.current);
      supabase.removeChannel(ch);
    };
  }, [me, checkTier]);

  const tier = tierUp ? TIERS.find((t) => t.id === tierUp) : null;
  return (
    <>
      <View pointerEvents="box-none" style={[styles.toastWrap, { top: insets.top + 6 }]}>
        {toasts.map((f) => {
          const t = toastText(f);
          return (
            <Animated.View key={f.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(200)} style={styles.toast} accessibilityLiveRegion="polite">
              {t.icon}
              <Text style={styles.toastDelta}>+{f.delta}</Text>
              <Text style={styles.toastText} numberOfLines={1}>{t.text}</Text>
            </Animated.View>
          );
        })}
      </View>
      <Modal visible={!!tier} transparent animationType="fade" onRequestClose={() => setTierUp(null)}>
        <View style={styles.tierBack}>
          <Confetti count={50} />
          <View style={styles.tierCard}>
            <Text style={styles.tierKicker}>New tier</Text>
            <View style={{ transform: [{ scale: 1.8 }], marginVertical: 22 }}><TierBadge tier={tierUp} explain={false} /></View>
            <Text style={styles.tierTitle}>You made {tier?.name}!</Text>
            <Text style={styles.tierBody}>People liked what they saw. Keep the conversations going to keep climbing.</Text>
            <Button label="Share it" onPress={() => Share.share({ message: `I just hit ${tier?.name} on Swirl 🌀 The CU Boulder dating app with a live leaderboard.` }).catch(() => {})} style={{ alignSelf: 'stretch', marginTop: 18 }} />
            <Button label="Nice" variant="ghost" onPress={() => setTierUp(null)} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 6, zIndex: 60 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: C.line, maxWidth: '100%', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  toastDelta: { fontFamily: F.bold, fontSize: 14, color: C.up },
  toastText: { fontFamily: F.semibold, fontSize: 14, color: C.text, flexShrink: 1 },
  tierBack: { flex: 1, backgroundColor: 'rgba(14,11,22,0.92)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  tierCard: { alignSelf: 'stretch', backgroundColor: C.surface, borderRadius: 28, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  tierKicker: { fontFamily: F.bold, fontSize: 12, color: C.muted, letterSpacing: 1, textTransform: 'uppercase' },
  tierTitle: { fontFamily: F.display, fontSize: 32, color: C.text, textAlign: 'center' },
  tierBody: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.muted, textAlign: 'center', marginTop: 8 },
});
