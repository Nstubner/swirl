import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Eye, Pencil, X } from 'lucide-react-native';
import { Button, EmptyState, Loading } from '@/components/ui';
import { ProfileView } from '@/components/profile';
import { useAuth } from '@/lib/auth';
import { Explain } from '@/lib/explain';
import { supabase, friendlyError } from '@/lib/supabase';
import type { DeckPerson } from '@/lib/constants';
import { C, F } from '@/lib/theme';

/** "See your profile": exactly what other people see. */
export default function Preview() {
  const { session, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<DeckPerson | null>(null);
  const [error, setError] = useState('');
  const id = session?.user.id;

  useEffect(() => {
    if (!id) return;
    supabase.rpc('get_person', { p_id: id }).then(({ data, error: e }) => {
      if (e) setError(friendlyError(e));
      else setMe((data as DeckPerson[] | null)?.[0] ?? null);
    });
  }, [id, profile]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const top = Platform.OS === 'ios' ? 14 : insets.top + 10;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {error ? <EmptyState title="Couldn't load your profile" body={error} /> : !me ? <Loading /> : (
        <ProfileView person={me} me={profile} isMe />
      )}
      <Explain k="preview" style={[styles.banner, { top }]}>
        <Eye size={14} color="#fff" />
        <Text style={{ fontFamily: F.semibold, fontSize: 12, color: '#fff' }}>How others see you</Text>
      </Explain>
      <Pressable onPress={close} style={[styles.close, { top }]} accessibilityLabel="Close"><X size={20} color="#fff" /></Pressable>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Button label="Edit profile" icon={<Pencil size={16} color={C.text} />} onPress={() => { router.back(); router.push('/edit'); }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(14,11,22,0.6)', borderRadius: 999, paddingHorizontal: 12, height: 32 },
  close: { position: 'absolute', right: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(14,11,22,0.6)', alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(14,11,22,0.92)' },
});
