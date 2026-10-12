import { useRef, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import { Button, Sheet, SwirlGlyph, TierBadge } from './ui';
import { fmt, signed, tierById, type TierId } from '@/lib/constants';
import { C, F, GRAD } from '@/lib/theme';

export type Recap = { points: number; likes: number; supers: number; convos: number; dates: number; matches: number; rank_now: number; rank_then: number; total: number };

export type ShareContent =
  | { kind: 'tier'; tier: TierId; place: string | null; season: string | null }
  | { kind: 'week'; recap: Recap };

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontFamily: F.display, fontSize: 30, color: '#fff' }}>{value}</Text>
      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{label}</Text>
    </View>
  );
}

/** A story-sized card people can share to Instagram. Never shows exact scores of anyone else. */
export function ShareSheet({ content, onClose }: { content: ShareContent | null; onClose: () => void }) {
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing isn’t available here', 'Try it from the app on your phone.');
        return;
      }
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share to your story' });
    } catch (e) {
      Alert.alert('Couldn’t share', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const moved = content?.kind === 'week' ? content.recap.rank_then - content.recap.rank_now : 0;

  return (
    <Sheet visible={!!content} onClose={onClose} title="Share to your story">
      <View style={{ alignItems: 'center', gap: 14, paddingBottom: 8 }}>
        <View ref={ref} collapsable={false} style={{ width: 270, aspectRatio: 9 / 16, borderRadius: 24, overflow: 'hidden' }}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 22, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SwirlGlyph size={28} color="#fff" />
              <Text style={{ fontFamily: F.display, fontSize: 24, color: '#fff' }}>swirl</Text>
            </View>
            {content?.kind === 'tier' && (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>I’m</Text>
                <View style={{ transform: [{ scale: 1.8 }], marginVertical: 10 }}><TierBadge tier={content.tier} onPhoto explain={false} /></View>
                <Text style={{ fontFamily: F.display, fontSize: 34, color: '#fff', textAlign: 'center' }}>{tierById(content.tier).name} on Swirl</Text>
                {content.place && <Text style={{ fontFamily: F.bold, fontSize: 18, color: '#fff' }}>{content.place}</Text>}
                {content.season && <Text style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{content.season}</Text>}
              </View>
            )}
            {content?.kind === 'week' && (
              <View style={{ gap: 18 }}>
                <Text style={{ fontFamily: F.display, fontSize: 30, color: '#fff', textAlign: 'center' }}>My week on Swirl</Text>
                <View style={{ flexDirection: 'row' }}>
                  <Stat value={moved > 0 ? `↑${moved}` : moved < 0 ? `↓${-moved}` : '—'} label="spots" />
                  <Stat value={signed(content.recap.points)} label="points" />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Stat value={fmt(content.recap.likes)} label="likes" />
                  <Stat value={fmt(content.recap.matches)} label="matches" />
                  <Stat value={fmt(content.recap.dates)} label="dates" />
                </View>
              </View>
            )}
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>The CU Boulder dating app · find your swirl</Text>
          </LinearGradient>
        </View>
        <Button label="Share" icon={<Share2 size={16} color="#fff" />} onPress={share} loading={busy} style={{ alignSelf: 'stretch' }} />
        <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center' }}>Only shows your own tier and stats, never anyone else’s.</Text>
      </View>
    </Sheet>
  );
}
