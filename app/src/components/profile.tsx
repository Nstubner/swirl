import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ban, Flag, GraduationCap, Heart, Home, MapPin, Star } from 'lucide-react-native';
import { C, F, GRAD } from '@/lib/theme';
import {
  CLASS_NAME, PROMPT_QUESTIONS, REPORT_REASONS, overlapTags, type DeckPerson, type Profile,
} from '@/lib/constants';
import { supabase, friendlyError } from '@/lib/supabase';
import { Avatar, Button, Chip, Sheet, SwirlGlyph, TierBadge } from './ui';

const classOf = (y: number | null) => (y ? `class of ’${String(y).slice(-2)}` : '');

function Photo({ uri, name, style }: { uri?: string; name: string; style?: object }) {
  if (uri) return <Image source={{ uri }} style={[StyleSheet.absoluteFill, style]} contentFit="cover" transition={150} />;
  return (
    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontFamily: F.display, fontSize: 96, color: '#fff' }}>{name.slice(0, 1).toUpperCase()}</Text>
    </LinearGradient>
  );
}

/** The white "polaroid" card used in Discover. Tap left/right of the photo to flip photos. */
export function ProfileCard({ person, me, onOpen }: { person: DeckPerson; me: Profile | null; onOpen?: () => void }) {
  const [idx, setIdx] = useState(0);
  const photos = person.photos ?? [];
  const tags = overlapTags(me, person);
  return (
    <View style={styles.card}>
      <View style={styles.photoWrap}>
        <Photo uri={photos[idx]} name={person.name} />
        {photos.length > 1 && (
          <View style={styles.bars} pointerEvents="none">
            {photos.map((_, i) => <View key={i} style={[styles.bar, { backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.42)' }]} />)}
          </View>
        )}
        <View style={styles.photoBadges} pointerEvents="none">
          <TierBadge tier={person.tier} onPhoto />
          {person.super_liked_me && (
            <LinearGradient colors={GRAD} style={styles.superBadge}>
              <Star size={12} color="#fff" fill="#fff" />
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>Super liked you</Text>
            </LinearGradient>
          )}
        </View>
        {photos.length > 1 && (
          <View style={StyleSheet.absoluteFill} >
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <Pressable style={{ flex: 1 }} accessibilityLabel="Previous photo" onPress={() => setIdx((i) => Math.max(0, i - 1))} />
              <Pressable style={{ flex: 1 }} accessibilityLabel="Next photo" onPress={() => setIdx((i) => Math.min(photos.length - 1, i + 1))} />
            </View>
          </View>
        )}
      </View>
      <Pressable onPress={onOpen} style={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom: 6 }} accessibilityLabel={`Open ${person.name}'s full profile`}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={styles.name} numberOfLines={1}>{person.name}</Text>
          <Text style={styles.age}>{person.age}</Text>
        </View>
        <Text style={styles.sub} numberOfLines={1}>{[person.major, classOf(person.grad_year)].filter(Boolean).join(', ')}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, overflow: 'hidden' }}>
          {(tags.length ? tags.slice(0, 2) : person.interests.slice(0, 3)).map((t) => (
            <View key={t} style={[styles.pill, tags.length ? styles.pillTag : null]}>
              <Text style={{ fontFamily: F.semibold, fontSize: 12, color: C.cardText }} numberOfLines={1}>{t}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

/** Full profile: all photos, prompts, interests, campus info, and report/block. */
export function ProfileView({ person, me, isMe, onReport, onBlock }: {
  person: DeckPerson; me: Profile | null; isMe?: boolean; onReport?: () => void; onBlock?: () => void;
}) {
  const tags = isMe ? [] : overlapTags(me, person);
  const shared = new Set(isMe ? [] : me?.interests ?? []);
  const { width } = useWindowDimensions();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {(person.photos.length ? person.photos : [undefined]).map((uri, i) => (
          <View key={i} style={{ width, aspectRatio: 4 / 5 }}>
            <Photo uri={uri} name={person.name} />
          </View>
        ))}
      </ScrollView>
      <View style={{ padding: 20, gap: 22 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: F.display, fontSize: 36, color: C.text }}>{person.name}</Text>
            <Text style={{ fontFamily: F.semibold, fontSize: 28, color: C.muted }}>{person.age}</Text>
            {!!person.pronouns && <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted }}>{person.pronouns}</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <GraduationCap size={16} color={C.muted} />
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted }}>
              {[person.major, person.grad_year ? `${CLASS_NAME[person.grad_year] ?? ''} ${classOf(person.grad_year)}` : ''].filter(Boolean).join(', ')}
            </Text>
          </View>
          <View style={{ marginTop: 10 }}><TierBadge tier={person.tier} /></View>
        </View>
        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t) => <View key={t} style={styles.tagDark}><Text style={styles.tagDarkText}>{t}</Text></View>)}
          </View>
        )}
        {!!person.bio && <Text style={{ fontFamily: F.body, fontSize: 16, lineHeight: 23, color: C.text }}>{person.bio}</Text>}
        {person.prompts.map((p, i) => (
          <View key={i} style={styles.prompt}>
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.muted }}>{PROMPT_QUESTIONS[p.q] ?? ''}</Text>
            <Text style={{ fontFamily: F.displayBold, fontSize: 20, color: C.text, marginTop: 6 }}>{p.a}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {person.interests.map((i) => (
            <View key={i} style={[styles.interest, shared.has(i) && { borderColor: C.pink }]}>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.text }}>{i}</Text>
            </View>
          ))}
        </View>
        <View style={styles.infoBox}>
          {[
            { icon: <Home size={16} color={C.muted} />, label: 'Lives', value: person.dorm || 'Not shared' },
            { icon: <GraduationCap size={16} color={C.muted} />, label: 'Classes', value: person.classes.join(', ') || 'Not shared' },
            { icon: <MapPin size={16} color={C.muted} />, label: 'Favorite spots', value: person.spots.join(', ') || 'Not shared' },
          ].map((r) => (
            <View key={r.label} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8 }}>
              {r.icon}
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, width: 104 }}>{r.label}</Text>
              <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.text, flex: 1 }}>{r.value}</Text>
            </View>
          ))}
        </View>
        {!isMe && (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Report" variant="secondary" icon={<Flag size={16} color={C.text} />} onPress={onReport} style={{ flex: 1 }} />
              <Button label="Block" variant="secondary" icon={<Ban size={16} color={C.text} />} onPress={onBlock} style={{ flex: 1 }} />
            </View>
            <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center' }}>{person.name} won't know if you report or block them.</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

/** Report flow. Optionally blocks too. Calls onDone(blocked) when finished. */
export function ReportSheet({ target, visible, onClose, onDone }: {
  target: { id: string; name: string } | null; visible: boolean; onClose: () => void; onDone: (blocked: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const reset = () => { setReason(''); setDetails(''); setSent(false); };
  const submit = async (alsoBlock: boolean) => {
    if (!target) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('reports').insert({ reporter_id: u.user?.id, target_id: target.id, reason, details: details.trim() || null });
      if (error) throw error;
      if (alsoBlock) {
        const { error: e2 } = await supabase.rpc('block_user', { p_target: target.id });
        if (e2) throw e2;
      }
      setSent(true);
      setTimeout(() => { reset(); onDone(alsoBlock); }, 1400);
    } catch (e) {
      Alert.alert("Couldn't send the report", friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible={visible} onClose={() => { reset(); onClose(); }} title={sent ? 'Report sent' : `Report ${target?.name ?? ''}`}>
      {sent ? (
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
          <SwirlGlyph size={56} />
          <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>Thanks for telling us</Text>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, textAlign: 'center' }}>Our team reviews every report within 24 hours. They won't know you reported them.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, marginBottom: 4 }}>What's going on?</Text>
          {REPORT_REASONS.map((r) => <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />)}
          <TextInput
            value={details} onChangeText={setDetails} placeholder="Anything else? (optional)" placeholderTextColor={C.faint}
            multiline maxLength={500}
            style={{ marginTop: 8, minHeight: 80, backgroundColor: C.surface2, borderRadius: 16, padding: 14, color: C.text, fontFamily: F.body, fontSize: 15, textAlignVertical: 'top' }}
          />
          <Button label="Report and block" disabled={!reason} loading={busy} onPress={() => submit(true)} style={{ marginTop: 8 }} />
          <Button label="Report only" variant="secondary" disabled={!reason || busy} onPress={() => submit(false)} />
        </ScrollView>
      )}
    </Sheet>
  );
}

/** "It's a Swirl!" */
export function MatchScreen({ me, them, onMessage, onClose }: {
  me: Profile; them: { name: string; photos: string[] }; onMessage: () => void; onClose: () => void;
}) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, zIndex: 50, justifyContent: 'center', padding: 24 }]}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 300, height: 220, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', opacity: 0.35 }}><SwirlGlyph size={240} stroke={2} color="#fff" /></View>
          <View style={[styles.miniPolaroid, { left: 20, top: 20, transform: [{ rotate: '-9deg' }] }]}>
            <Avatar uri={me.photos[0]} name={me.name} size={112} />
          </View>
          <View style={[styles.miniPolaroid, { right: 20, top: 20, transform: [{ rotate: '9deg' }] }]}>
            <Avatar uri={them.photos[0]} name={them.name} size={112} />
          </View>
          <LinearGradient colors={GRAD} style={styles.heart}><Heart size={24} color="#fff" fill="#fff" /></LinearGradient>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 46, color: C.text, marginTop: 12 }}>It's a Swirl!</Text>
        <Text style={{ fontFamily: F.body, fontSize: 16, color: C.muted, marginTop: 8 }}>You and {them.name} liked each other.</Text>
        <Text style={{ fontFamily: F.body, fontSize: 13, color: C.faint, marginTop: 6 }}>Message within 24 hours for +5.</Text>
      </View>
      <View style={{ gap: 10, marginTop: 40 }}>
        <Button label="Send a message" variant="white" onPress={onMessage} />
        <Button label="Keep swiping" variant="ghost" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: C.card, borderRadius: 26, padding: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  photoWrap: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: C.surface2 },
  bars: { position: 'absolute', top: 8, left: 12, right: 12, flexDirection: 'row', gap: 4, zIndex: 2 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  photoBadges: { position: 'absolute', top: 22, left: 12, gap: 6, zIndex: 2 },
  superBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' },
  name: { fontFamily: F.display, fontSize: 30, color: C.cardText, flexShrink: 1 },
  age: { fontFamily: F.semibold, fontSize: 24, color: C.cardMuted },
  sub: { fontFamily: F.body, fontSize: 14, color: C.cardMuted, marginTop: 2 },
  pill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: 'rgba(21,16,31,0.06)' },
  pillTag: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.pink },
  tagDark: { borderRadius: 999, borderWidth: 1.5, borderColor: C.pink, paddingVertical: 5, paddingHorizontal: 10 },
  tagDarkText: { fontFamily: F.semibold, fontSize: 13, color: C.text },
  prompt: { backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.line },
  interest: { backgroundColor: C.surface2, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'transparent' },
  infoBox: { backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.line },
  miniPolaroid: { position: 'absolute', backgroundColor: '#fff', padding: 6, borderRadius: 18 },
  heart: { position: 'absolute', bottom: 0, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.bg },
});
