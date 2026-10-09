import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Button, H1, Input, P, Screen } from '@/components/ui';
import { supabase, friendlyError } from '@/lib/supabase';
import { C, F } from '@/lib/theme';

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = async () => {
    if (code.length < 6) { setError('Enter the full code from your email.'); return; }
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.verifyOtp({ email: String(email), token: code, type: 'email' });
    setBusy(false);
    // On success the auth listener updates the session and the router moves on by itself.
    if (e) setError(friendlyError(e));
  };

  const resend = async () => {
    setCooldown(60);
    const { error: e } = await supabase.auth.signInWithOtp({ email: String(email), options: { shouldCreateUser: true } });
    if (e) setError(friendlyError(e));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 12 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, gap: 12 }}>
          <H1>Check your inbox</H1>
          <P muted>Enter the code we sent to {email}. It can take a minute to arrive.</P>
          <Input
            value={code} onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
            placeholder="123456" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
            maxLength={10} onSubmitEditing={verify} invalid={!!error} accessibilityLabel="Code"
            style={{ marginTop: 12, fontFamily: F.display, fontSize: 28, letterSpacing: 8, height: 64, textAlign: 'center' }}
          />
          {!!error && <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.down }}>{error}</Text>}
          <Pressable onPress={resend} disabled={cooldown > 0} style={{ marginTop: 8 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: cooldown > 0 ? C.faint : C.pink }}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </Pressable>
        </View>
        <View style={{ padding: 24 }}>
          <Button label="Verify" onPress={verify} loading={busy} disabled={code.length < 6} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
