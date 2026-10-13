import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Lightbulb, X } from 'lucide-react-native';
import { store } from '@/lib/extras';
import { C, F } from '@/lib/theme';

/**
 * A one-time tip shown the first time someone opens a screen. Dismissed for good with "Got it".
 * Sits near the bottom so it's in thumb reach.
 */
export default function TabTip({ id, title, body, style }: { id: string; title: string; body: string; style?: ViewStyle }) {
  const key = `swirl_tip_${id}`;
  const [open, setOpen] = useState(() => !store.get(key));
  if (!open) return null;
  const close = () => { store.set(key, '1'); setOpen(false); };
  return (
    <View style={[styles.tip, style]} accessibilityRole="alert">
      <View style={styles.icon}><Lightbulb size={16} color={C.pink} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 6 }}>
          <Text style={styles.ok}>Got it</Text>
        </Pressable>
      </View>
      <Pressable onPress={close} hitSlop={12} accessibilityLabel="Dismiss tip" style={styles.close}>
        <X size={16} color={C.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    flexDirection: 'row', gap: 10, backgroundColor: C.surface2, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,61,139,0.35)',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  icon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,61,139,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.bold, fontSize: 15, color: C.text },
  body: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted },
  ok: { fontFamily: F.bold, fontSize: 14, color: C.pink },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
