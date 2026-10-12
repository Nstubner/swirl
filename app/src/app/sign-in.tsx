import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Button, H1, Input, P, Screen } from '@/components/ui';
import { supabase, friendlyError } from '@/lib/supabase';
import { C, F } from '@/lib/theme';

const EDU_RE = /^[^\s@]+@([a-z0-9-]+\.)+edu$/i;

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const clean = email.trim().toLowerCase();

  const send = async () => {
    if (!EDU_RE.test(clean)) {
      setError('Use your school email. It needs to end in .edu.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    setBusy(false);
    if (e) setError(friendlyError(e));
    else router.push({ pathname: '/verify', params: { email: clean } });
  };

  // Password sign-in exists for App Store reviewers and test accounts made in the Supabase dashboard.
  // Normal students always use the emailed code.
  const signInWithPassword = async () => {
    if (!EDU_RE.test(clean)) { setError('Use your school email. It needs to end in .edu.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.signInWithPassword({ email: clean, password });
    setBusy(false);
    if (e) setError(/invalid/i.test(e.message) ? 'Wrong email or password.' : friendlyError(e));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 12 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, gap: 12 }}>
          <H1>What's your school email?</H1>
          <P muted>Swirl is only for verified college students. We'll email you a code to confirm it's you.</P>
          <Input
            value={email} onChangeText={(t) => { setEmail(t); setError(''); }} placeholder="you@colorado.edu"
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
            textContentType="emailAddress" returnKeyType={usePassword ? 'next' : 'send'} onSubmitEditing={usePassword ? undefined : send} invalid={!!error} style={{ marginTop: 12 }}
            accessibilityLabel="School email"
          />
          {usePassword && (
            <Input value={password} onChangeText={(t) => { setPassword(t); setError(''); }} placeholder="Password" secureTextEntry
              autoCapitalize="none" autoCorrect={false} textContentType="password" returnKeyType="go" onSubmitEditing={signInWithPassword}
              accessibilityLabel="Password" />
          )}
          {!!error && <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.down }}>{error}</Text>}
          {EDU_RE.test(clean) && !clean.endsWith('colorado.edu') && (
            <P muted style={{ fontSize: 13 }}>Swirl is live at CU Boulder first. You can still join.</P>
          )}
        </View>
        <View style={{ padding: 24 }}>
          <Button label={usePassword ? 'Sign in' : 'Send code'} onPress={usePassword ? signInWithPassword : send} loading={busy} disabled={!clean} />
          <Pressable onPress={() => { setUsePassword(!usePassword); setError(''); }} style={{ paddingTop: 14 }} accessibilityRole="button">
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.faint, textAlign: 'center' }}>
              {usePassword ? 'Use an email code instead' : 'Have a test account? Sign in with a password'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
