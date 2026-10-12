import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BadgeCheck, Camera, ChevronLeft, Clock } from 'lucide-react-native';
import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useExtras } from '@/lib/extras';
import { takeVerificationSelfie } from '@/lib/photos';
import { supabase, friendlyError } from '@/lib/supabase';
import { VERIFY_POSES } from '@/lib/constants';
import { C, F } from '@/lib/theme';

/** Photo verification: copy a pose in a selfie; a person on the Swirl team checks it against your photos. */
export default function VerifyPhoto() {
  const { session, refreshProfile } = useAuth();
  const { extras, refreshExtras } = useExtras();
  const [busy, setBusy] = useState(false);
  const id = session?.user.id ?? '';
  const pose = VERIFY_POSES[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % VERIFY_POSES.length];
  const status = extras?.verification_status ?? 'none';

  const start = async () => {
    setBusy(true);
    try {
      const path = await takeVerificationSelfie(id);
      if (!path) return;
      const { error } = await supabase.rpc('submit_verification', { p_path: path, p_pose: pose });
      if (error) throw error;
      await Promise.all([refreshExtras(), refreshProfile()]);
    } catch (e) {
      Alert.alert("Couldn't send your selfie", friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 6 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>Get verified</Text>
      </View>
      <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
        <View style={styles.icon}>
          {status === 'approved' ? <BadgeCheck size={44} color="#fff" fill="#3B82F6" /> : status === 'pending' ? <Clock size={40} color={C.text} /> : <Camera size={40} color={C.text} />}
        </View>
        {status === 'approved' ? (
          <>
            <Text style={styles.title}>You’re verified</Text>
            <Text style={styles.body}>Your profile shows a blue check, so people know you’re really you.</Text>
          </>
        ) : status === 'pending' ? (
          <>
            <Text style={styles.title}>We’re checking your selfie</Text>
            <Text style={styles.body}>Usually within a day. We’ll send you a notification when it’s done.</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>{status === 'rejected' ? 'Let’s try that again' : 'Show people you’re really you'}</Text>
            <Text style={styles.body}>Take a selfie doing <Text style={{ color: C.text, fontFamily: F.bold }}>{pose}</Text>. Someone on the Swirl team compares it with your photos, then you get a blue check.</Text>
            <View style={styles.points}>
              <Text style={styles.point}>• Make sure your face is clear and well lit</Text>
              <Text style={styles.point}>• Your selfie is never shown on your profile</Text>
              <Text style={styles.point}>• Verified people can filter for verified matches</Text>
            </View>
            <Button label="Take selfie" icon={<Camera size={16} color="#fff" />} onPress={start} loading={busy} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { alignSelf: 'center', width: 88, height: 88, borderRadius: 44, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.display, fontSize: 26, color: C.text, textAlign: 'center' },
  body: { fontFamily: F.body, fontSize: 16, lineHeight: 23, color: C.muted, textAlign: 'center' },
  points: { backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: C.line },
  point: { fontFamily: F.body, fontSize: 14, color: C.muted },
});
