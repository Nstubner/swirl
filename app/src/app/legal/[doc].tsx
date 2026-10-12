import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { EmptyState, Screen } from '@/components/ui';
import { LEGAL, LEGAL_UPDATED, type LegalId } from '@/lib/legal';
import { C, F } from '@/lib/theme';

/** Privacy Policy, Terms of Use and Community Guidelines. Works signed in or out. */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const d = LEGAL[doc as LegalId];
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
        <Pressable onPress={back} style={{ padding: 6 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text, flex: 1 }} numberOfLines={1}>{d?.title ?? 'Not found'}</Text>
      </View>
      {!d ? <EmptyState title="Page not found" body="That page doesn't exist." /> : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 18 }}>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint }}>Last updated {LEGAL_UPDATED}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 16, lineHeight: 23, color: C.text }}>{d.intro}</Text>
          {d.sections.map((s) => (
            <View key={s.h} style={{ gap: 8 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.text }}>{s.h}</Text>
              {s.p.map((p) => (
                <Text key={p} style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.muted }}>
                  {s.p.length > 1 ? '•  ' : ''}{p}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
