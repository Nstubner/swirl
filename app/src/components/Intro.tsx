import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ShieldCheck, Trophy, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './ui';
import { store } from '@/lib/extras';
import { C, F, GRAD } from '@/lib/theme';

const KEY = 'swirl_intro_v1';

const PAGES = [
  { icon: Heart, title: 'Like the details', body: 'Scroll someone’s profile and tap ♥ on the photo or prompt you like. Add a comment. If they like you back, it’s a match.' },
  { icon: Trophy, title: 'Every like moves you up', body: 'Likes raise your score on the CU Boulder leaderboard. Passes barely count and nobody ever sees them. Tap any score or badge to see how it works.' },
  { icon: Users, title: 'Team up', body: 'Your dorm and Greek chapter compete on team boards. Invite friends to earn Super Likes, a Boost, badges and a hoodie.' },
  { icon: ShieldCheck, title: 'Keep it good', body: 'Get verified for a blue check. Report or block anyone, anytime. They won’t know. Meet in public and tell a friend.' },
];

/** A 4-card "how Swirl works" walkthrough shown once, the first time someone lands in the app. */
export default function Intro() {
  const [visible, setVisible] = useState(() => !store.get(KEY));
  const [i, setI] = useState(0);
  if (!visible) return null;
  const done = () => { store.set(KEY, '1'); setVisible(false); };
  const page = PAGES[i];
  const Icon = page.icon;
  const last = i === PAGES.length - 1;
  return (
    <Modal visible animationType="fade" onRequestClose={done}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16 }}>
          {!last && <Pressable onPress={done} hitSlop={10} accessibilityRole="button"><Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.muted }}>Skip</Text></Pressable>}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 18 }}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={52} color="#fff" />
          </LinearGradient>
          <Text style={{ fontFamily: F.display, fontSize: 32, color: C.text, textAlign: 'center' }}>{page.title}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 17, lineHeight: 25, color: C.muted, textAlign: 'center' }}>{page.body}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {PAGES.map((p, pi) => <View key={p.title} style={{ width: pi === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: pi === i ? C.pink : C.surface2 }} />)}
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <Button label={last ? 'Let’s go' : 'Next'} onPress={() => (last ? done() : setI(i + 1))} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
