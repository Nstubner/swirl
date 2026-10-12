import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronDown, ChevronLeft, FileText, Shield, Users } from 'lucide-react-native';
import { Button, Input, Label, MenuRow, Screen } from '@/components/ui';
import { FAQ, SUPPORT_EMAIL } from '@/lib/legal';
import { supabase, friendlyError } from '@/lib/supabase';
import { C, F } from '@/lib/theme';

/** Help & support: quick answers, a message box that reaches the Swirl team, and the legal pages. */
export default function Help() {
  const [open, setOpen] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc('send_feedback', { p_body: body.trim(), p_contact: null });
    setBusy(false);
    if (error) { Alert.alert("Couldn't send that", friendlyError(error)); return; }
    setBody('');
    Alert.alert('Sent', 'Thanks! The Swirl team will see this right away. If you need a reply, we’ll reach you at your school email.');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 6 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>Help & support</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 22 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={{ gap: 8 }}>
            <Label>Quick answers</Label>
            {FAQ.map((f, i) => (
              <Pressable key={f.q} onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button"
                style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.text, flex: 1 }}>{f.q}</Text>
                  <ChevronDown size={18} color={C.muted} style={{ transform: [{ rotate: open === i ? '180deg' : '0deg' }] }} />
                </View>
                {open === i && <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted }}>{f.a}</Text>}
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 10 }}>
            <Label>Message the Swirl team</Label>
            <Input value={body} onChangeText={setBody} maxLength={2000} multiline placeholder="Found a bug? Have an idea? Need help?"
              style={{ minHeight: 110, textAlignVertical: 'top' }} />
            <Button label="Send" onPress={send} loading={busy} disabled={!body.trim()} />
            {!!SUPPORT_EMAIL && <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted, textAlign: 'center' }}>Or email {SUPPORT_EMAIL}</Text>}
          </View>

          <View style={{ gap: 8 }}>
            <Label>Safety</Label>
            <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted }}>
              In an emergency call 911. CU Boulder Police (non-emergency, 24/7): 303-492-6666. Office of Victim Assistance: 303-492-8855.
            </Text>
          </View>

          <View>
            <MenuRow icon={<Users size={18} color={C.text} />} label="Community Guidelines" onPress={() => router.push('/legal/guidelines')} />
            <MenuRow icon={<FileText size={18} color={C.text} />} label="Terms of Use" onPress={() => router.push('/legal/terms')} />
            <MenuRow icon={<Shield size={18} color={C.text} />} label="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
