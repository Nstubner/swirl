import { useId, type ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDown, ArrowUp, Award, Check, Minus, X } from 'lucide-react-native';
import { C, F, GRAD } from '@/lib/theme';
import { BADGES, tierById, type TierId } from '@/lib/constants';
import { useExplain } from '@/lib/explain-context';

/* ---------- Swirl logo ---------- */

const SPIRAL = (() => {
  const pts: string[] = [];
  const turns = 3.2 * Math.PI;
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * turns;
    const r = 1.8 + (t / turns) * 19.2;
    pts.push(`${(24 + r * Math.cos(t + Math.PI)).toFixed(2)} ${(24 + r * Math.sin(t + Math.PI)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}`;
})();

export function SwirlGlyph({ size = 28, stroke = 5, color }: { size?: number; stroke?: number; color?: string }) {
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <SvgGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.violet} />
          <Stop offset="1" stopColor={C.pink} />
        </SvgGradient>
      </Defs>
      <Path d={SPIRAL} fill="none" stroke={color ?? `url(#${gid})`} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel="Swirl">
      <SwirlGlyph size={size * 1.08} stroke={5.5} />
      <Text style={{ fontFamily: F.display, fontSize: size, color: C.text, letterSpacing: -0.5 }}>swirl</Text>
    </View>
  );
}

/* ---------- Layout + text ---------- */

export function Screen({ children, style, edges = ['top'] }: { children: ReactNode; style?: StyleProp<ViewStyle>; edges?: ('top' | 'bottom')[] }) {
  return <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: C.bg }, style]}>{children}</SafeAreaView>;
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: F.display, fontSize: 30, color: C.text, letterSpacing: -0.6 }, style]}>{children}</Text>;
}

export function P({ children, style, muted }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) {
  return <Text style={[{ fontFamily: F.body, fontSize: 15, lineHeight: 21, color: muted ? C.muted : C.text }, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: F.bold, fontSize: 13, color: C.muted, marginBottom: 8 }, style]}>{children}</Text>;
}

/* ---------- Controls ---------- */

type BtnProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'white';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style, small }: BtnProps) {
  const h = small ? 38 : 52;
  const textColor = variant === 'white' ? C.cardText : C.text;
  const inner = (
    <View style={[styles.btnInner, { height: h, paddingHorizontal: small ? 14 : 22 }]}>
      {loading ? <ActivityIndicator color={textColor} /> : (
        <>
          {icon}
          <Text style={{ fontFamily: F.bold, fontSize: small ? 14 : 16, color: textColor }}>{label}</Text>
        </>
      )}
    </View>
  );
  const bg: Record<string, string | undefined> = { secondary: C.surface2, danger: C.down, white: '#fff', ghost: 'transparent' };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ borderRadius: 999, overflow: 'hidden', opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{inner}</LinearGradient>
      ) : (
        <View style={{ backgroundColor: bg[variant] }}>{inner}</View>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, small }: { label: string; selected?: boolean; onPress?: () => void; small?: boolean }) {
  const content = (
    <View style={[styles.chip, { height: small ? 32 : 38, paddingHorizontal: small ? 12 : 14 }, !selected && { backgroundColor: C.surface2 }]}>
      <Text style={{ fontFamily: F.semibold, fontSize: small ? 13 : 14, color: C.text }}>{label}</Text>
      {selected && <Check size={13} color={C.text} />}
    </View>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress} style={{ borderRadius: 999, overflow: 'hidden' }}>
      {selected ? <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{content}</LinearGradient> : content}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { invalid?: boolean }) {
  const { invalid, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={C.faint}
      {...rest}
      style={[styles.input, invalid && { borderColor: C.down }, rest.multiline && { height: undefined, minHeight: 96, paddingTop: 14, textAlignVertical: 'top' }, style]}
    />
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={{ flex: 1, borderRadius: 999, overflow: 'hidden' }} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            {on ? (
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segItem}>
                <Text style={styles.segTextOn}>{o.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.segItem}><Text style={styles.segText}>{o.label}</Text></View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Badges + avatars ---------- */

export function TierBadge({ tier, onPhoto, small, explain = true }: { tier: TierId | null; onPhoto?: boolean; small?: boolean; explain?: boolean }) {
  const ex = useExplain();
  // Unique gradient id per badge (duplicate SVG ids collide on web).
  const gid = `t${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (!tier) return null;
  const t = tierById(tier);
  const badge = (
    <View style={[styles.badge, { backgroundColor: onPhoto ? 'rgba(14,11,22,0.55)' : C.surface2 }]}>
      <Svg width={small ? 12 : 14} height={small ? 12 : 14} viewBox="0 0 20 20">
        <Defs>
          <SvgGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.colors[0]} />
            <Stop offset="1" stopColor={t.colors[1]} />
          </SvgGradient>
        </Defs>
        {tier === 'bronze' && <Circle cx="10" cy="10" r="8" fill={`url(#${gid})`} />}
        {tier === 'silver' && <Path d="M10 1.8 L17 4.6 V10 C17 14.2 14 17 10 18.6 C6 17 3 14.2 3 10 V4.6 Z" fill={`url(#${gid})`} />}
        {tier === 'gold' && <Path d="M10 1.6 L12.6 7.1 L18.5 7.8 L14 11.8 L15.3 17.6 L10 14.6 L4.7 17.6 L6 11.8 L1.5 7.8 L7.4 7.1 Z" fill={`url(#${gid})`} />}
        {tier === 'platinum' && <Path d="M10 1.6 L17.3 5.8 V14.2 L10 18.4 L2.7 14.2 V5.8 Z" fill={`url(#${gid})`} />}
        {tier === 'diamond' && <Path d="M5.4 2.8 H14.6 L18.6 7.9 L10 18.2 L1.4 7.9 Z" fill={`url(#${gid})`} />}
      </Svg>
      {!small && <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>{t.name}</Text>}
    </View>
  );
  if (!explain) return badge;
  return (
    <Pressable onPress={() => ex('tier', { tier })} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${t.name} tier. What does this mean?`}>
      {badge}
    </Pressable>
  );
}

/** Founding Member / Swirl Founder badges. */
export function Badges({ ids }: { ids?: string[] | null }) {
  const ex = useExplain();
  const list = (ids ?? []).filter((id) => BADGES[id]);
  if (!list.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {list.map((id) => (
        <Pressable key={id} onPress={() => ex('badge', { id })} hitSlop={6} accessibilityRole="button">
          <LinearGradient colors={id === 'founder' ? ['#FFC93C', '#FF8A5B'] : GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.badge, { paddingLeft: 7 }]}>
            <Award size={12} color="#fff" />
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>{BADGES[id].label}</Text>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}

export function Avatar({ uri, name, size = 44 }: { uri?: string | null; name?: string | null; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.surface2 }} contentFit="cover" />;
  return (
    <LinearGradient colors={GRAD} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.display, fontSize: size * 0.4, color: '#fff' }}>{(name ?? '?').slice(0, 1).toUpperCase()}</Text>
    </LinearGradient>
  );
}

export function Movement({ move }: { move: number }) {
  const ex = useExplain();
  const up = move > 0;
  return (
    <Pressable onPress={() => ex('movement')} hitSlop={8} accessibilityRole="button"
      accessibilityLabel={!move ? 'No change today' : `${up ? 'Up' : 'Down'} ${Math.abs(move)} today`}>
      {!move ? <Minus size={14} color={C.faint} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
          {up ? <ArrowUp size={13} color={C.up} strokeWidth={3} /> : <ArrowDown size={13} color={C.down} strokeWidth={3} />}
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: up ? C.up : C.down }}>{Math.abs(move)}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ---------- States ---------- */

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40, gap: 10 }}>
      {icon && <View style={styles.emptyIcon}>{icon}</View>}
      <Text style={{ fontFamily: F.display, fontSize: 21, color: C.text, textAlign: 'center' }}>{title}</Text>
      {body && <P muted style={{ textAlign: 'center' }}>{body}</P>}
      {action && <View style={{ marginTop: 10 }}>{action}</View>}
    </View>
  );
}

export function Loading() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.pink} /></View>;
}

/** Bottom sheet built on Modal. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        {title && (
          <View style={styles.sheetHead}>
            <Text style={{ fontFamily: F.display, fontSize: 21, color: C.text, flex: 1 }}>{title}</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close" style={styles.closeBtn}><X size={18} color={C.text} /></Pressable>
          </View>
        )}
        {children}
      </View>
    </Modal>
  );
}

export function MenuRow({ icon, label, sub, onPress, danger }: { icon: ReactNode; label: string; sub?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <View style={styles.menuIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.semibold, fontSize: 15, color: danger ? C.down : C.text }}>{label}</Text>
        {sub && <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999 },
  input: {
    backgroundColor: C.surface2, color: C.text, fontFamily: F.body, fontSize: 16, height: 50,
    borderRadius: 16, paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'transparent',
  },
  segment: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 999, padding: 4 },
  segItem: { height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 8 },
  segText: { fontFamily: F.semibold, fontSize: 13, color: C.muted },
  segTextOn: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 3, paddingLeft: 5, paddingRight: 8, alignSelf: 'flex-start' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(91,46,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 34 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.faint, opacity: 0.5, marginTop: 10, marginBottom: 6 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
});
