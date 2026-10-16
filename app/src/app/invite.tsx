import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronLeft, Gift, Lock, Share2 } from 'lucide-react-native';
import { Badges, Button, Chip, Input, Screen } from '@/components/ui';
import { InfoButton } from '@/lib/explain';
import { useExtras } from '@/lib/extras';
import { useAuth } from '@/lib/auth';
import { supabase, friendlyError } from '@/lib/supabase';
import { APP_LINK, INVITE_URL, INVITE_MILESTONES } from '@/lib/constants';
import { C, F, GRAD } from '@/lib/theme';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export default function Invite() {
  const { profile, refreshProfile } = useAuth();
  const { extras, refreshExtras } = useExtras();
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState('');
  const [contact, setContact] = useState('');
  const invites = extras?.invites ?? profile?.invites ?? 0;
  const myCode = extras?.invite_code ?? profile?.invite_code ?? '';
  const founder = (extras?.badges ?? []).includes('founder');
  const canRedeem = !!extras?.can_redeem;

  const share = () => {
    const msg = `Join me on Swirl, the CU Boulder dating app with a live campus leaderboard. Use my code ${myCode} when you sign up and get a free 24-hour Boost, plus we can be a duo for double dates.${INVITE_URL ? ` ${INVITE_URL}${myCode}` : APP_LINK ? ` ${APP_LINK}` : ''}`;
    Share.share({ message: msg }).catch(() => {});
  };

  const redeem = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('redeem_invite', { p_code: code });
    setBusy(false);
    if (error) { setCodeMsg(friendlyError(error)); return; }
    const r = data as { ok: boolean; error?: string; name?: string };
    if (!r.ok) { setCodeMsg(r.error ?? 'That code didn’t work.'); return; }
    setCodeMsg(`Done! ${r.name ?? 'Your friend'} gets credit, and you got a bonus Super Like and a 24-hour Boost.`);
    refreshExtras(); refreshProfile();
  };

  const claim = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('claim_reward', { p_reward: 'hoodie', p_size: size, p_contact: contact.trim() });
    setBusy(false);
    if (error) { Alert.alert("Couldn't send your claim", friendlyError(error)); return; }
    Alert.alert('Hoodie claimed', 'We’ll reach out to get it to you. Thanks for building Swirl with us.');
    refreshExtras();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 6 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text, flex: 1 }}>Invite friends</Text>
        <InfoButton k="invites" />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Gift size={28} color="#fff" />
          <Text style={{ fontFamily: F.display, fontSize: 26, color: '#fff', textAlign: 'center' }}>Swirl is better with your friends on it</Text>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
            Share your code. When a friend finishes their profile, you unlock rewards.
          </Text>
          <View style={styles.codeBox}>
            <Text style={{ fontFamily: F.semibold, fontSize: 12, color: C.cardMuted }}>Your code</Text>
            <Text selectable style={{ fontFamily: F.display, fontSize: 34, letterSpacing: 4, color: C.cardText }}>{myCode || '······'}</Text>
          </View>
          <Button label="Share my code" variant="white" icon={<Share2 size={16} color={C.cardText} />} onPress={share} disabled={!myCode} style={{ alignSelf: 'stretch' }} />
        </LinearGradient>

        <View style={styles.box}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={styles.title}>{invites} {invites === 1 ? 'friend' : 'friends'} joined</Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted }}>{Math.min(invites, 10)}/10</Text>
          </View>
          <View style={styles.track}>
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 8, width: `${Math.min(1, invites / 10) * 100}%` }} />
          </View>
          {INVITE_MILESTONES.map((m) => {
            const done = invites >= m.at;
            return (
              <View key={m.at} style={styles.milestone}>
                <View style={[styles.dot, done && { backgroundColor: C.pink, borderColor: C.pink }]}>
                  {done ? <Check size={14} color="#fff" /> : <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.muted }}>{m.at}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: done ? C.text : C.muted }}>{m.title}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 2 }}>{m.body}</Text>
                </View>
                {!done && <Lock size={14} color={C.faint} />}
              </View>
            );
          })}
          <View style={{ marginTop: 8 }}><Badges ids={extras?.badges} /></View>
          {!!extras?.bonus_supers && (
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 8 }}>You have {extras.bonus_supers} bonus Super Like{extras.bonus_supers === 1 ? '' : 's'} saved up.</Text>
          )}
        </View>

        {founder && (
          <View style={styles.box}>
            <Text style={styles.title}>Claim your hoodie</Text>
            {extras?.hoodie_claimed ? (
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, marginTop: 6 }}>Claimed. We’ll reach out to get it to you. You can update your size or contact below.</Text>
            ) : (
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, marginTop: 6 }}>Pick a size and tell us how to reach you (Instagram or phone).</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {SIZES.map((s) => <Chip key={s} small label={s} selected={size === s} onPress={() => setSize(s)} />)}
            </View>
            <Input value={contact} onChangeText={setContact} placeholder="@instagram or phone number" style={{ marginTop: 12 }} autoCapitalize="none" />
            <Button label={extras?.hoodie_claimed ? 'Update claim' : 'Claim hoodie'} onPress={claim} loading={busy} disabled={!size || contact.trim().length < 3} style={{ marginTop: 12 }} />
          </View>
        )}

        {canRedeem && (
          <View style={styles.box}>
            <Text style={styles.title}>Got a friend’s code?</Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 4 }}>Enter it in your first week. They get credit, and you get a bonus Super Like and a 24-hour Boost.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Input value={code} onChangeText={(t) => { setCode(t.toUpperCase()); setCodeMsg(''); }} placeholder="ABC123" autoCapitalize="characters" maxLength={6} style={{ flex: 1 }} />
              <Button label="Apply" small onPress={redeem} loading={busy} disabled={code.trim().length < 6} style={{ alignSelf: 'center' }} />
            </View>
            {!!codeMsg && <Text style={{ fontFamily: F.body, fontSize: 13, color: C.text, marginTop: 8 }}>{codeMsg}</Text>}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  hero: { borderRadius: 26, padding: 20, alignItems: 'center', gap: 10 },
  codeBox: { backgroundColor: '#fff', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 24, alignItems: 'center', marginVertical: 6 },
  box: { backgroundColor: C.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line },
  title: { fontFamily: F.bold, fontSize: 16, color: C.text },
  track: { height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden', marginTop: 10, marginBottom: 6 },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
});
