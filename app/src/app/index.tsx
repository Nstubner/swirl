import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, P, Screen, SwirlGlyph } from '@/components/ui';
import { C, F } from '@/lib/theme';

export default function Welcome() {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <SwirlGlyph size={132} stroke={4.2} />
        <Text style={{ fontFamily: F.display, fontSize: 76, color: C.text, marginTop: 16, letterSpacing: -1.5 }}>swirl</Text>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: C.text, marginTop: 4 }}>Find your swirl.</Text>
        <P muted style={{ textAlign: 'center', marginTop: 12, maxWidth: 290 }}>
          The college dating app where every like moves you up your campus leaderboard. Now live at CU Boulder.
        </P>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 10 }}>
        <Button label="Get Started" onPress={() => router.push('/sign-in')} />
        <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center', marginTop: 4 }}>
          For college students 18 and up. You'll need a .edu email.
        </Text>
        <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center' }}>
          <Text style={{ textDecorationLine: 'underline' }} onPress={() => router.push('/legal/terms')}>Terms</Text>
          {'  ·  '}
          <Text style={{ textDecorationLine: 'underline' }} onPress={() => router.push('/legal/privacy')}>Privacy</Text>
          {'  ·  '}
          <Text style={{ textDecorationLine: 'underline' }} onPress={() => router.push('/legal/guidelines')}>Guidelines</Text>
        </Text>
      </View>
    </Screen>
  );
}
