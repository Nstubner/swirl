import { useState, type ReactNode, type Ref } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, Alert, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ban, Check, Flag, GraduationCap, Heart, Home, MapPin, Send, Sparkles, Star, Users } from 'lucide-react-native';
import { C, F, GRAD } from '@/lib/theme';
import {
  CLASS_NAME, PROMPT_QUESTIONS, PTS, REPORT_REASONS, lookingLabel, overlapTags, whyReasons, type DeckPerson, type Profile,
} from '@/lib/constants';
import { supabase, friendlyError } from '@/lib/supabase';
import { Explain } from '@/lib/explain';
import { Avatar, Badges, Button, Chip, Sheet, SwirlGlyph, TierBadge, VerifiedCheck } from './ui';
import { Confetti } from './Celebrate';

const classOf = (y: number | null) => (y ? `class of ’${String(y).slice(-2)}` : '');
const favQuestion = (spot?: string | null) => `Favorite thing to get at ${spot?.trim() || 'the Hill'}`;

/** The thing someone liked on a profile: a photo or a prompt. */
export type LikeItem = { key: string; label: string; photo?: string; question?: string; answer?: string };

/** Describe an item key like "photo:1" or "prompt:0" against a profile ("your photo", "their prompt"). */
export function describeItem(key: string | null | undefined, p: Pick<Profile, 'photos' | 'prompts'> & { fav_spot?: string | null; fav_order?: string | null } | null | undefined): LikeItem | null {
  if (!key || !p) return null;
  const [kind, n] = key.split(':');
  const i = Number(n);
  if (kind === 'photo') return { key, label: 'photo', photo: p.photos?.[i] };
  if (kind === 'fav') return { key, label: 'go-to order', question: favQuestion(p.fav_spot), answer: p.fav_order ?? undefined };
  if (kind === 'prompt') {
    const pr = p.prompts?.[i];
    return { key, label: 'prompt', question: pr ? PROMPT_QUESTIONS[pr.q] : undefined, answer: pr?.a };
  }
  return null;
}

/** Double-tap anything wrapped in this to like it. A heart pops where you tapped (skipped when Reduce Motion is on). */
function DoubleTapLike({ onLike, children }: { onLike?: () => void; children: ReactNode }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: scale.get() > 0 ? 1 : 0, transform: [{ scale: scale.get() }] }));
  if (!onLike) return <>{children}</>;
  const tap = Gesture.Tap().numberOfTaps(2).maxDelay(260).runOnJS(true).onEnd((_e, ok) => {
    if (!ok) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!reduce) scale.set(withSequence(withSpring(1.15, { damping: 9 }), withTiming(1, { duration: 120 }), withTiming(0, { duration: 220 })));
    setTimeout(onLike, reduce ? 0 : 380);
  });
  return (
    <GestureDetector gesture={tap}>
      <View>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, style]}>
          <Heart size={96} color="#fff" fill={C.pink} strokeWidth={1.5} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function PhotoBlock({ uri, name, caption, location, width, onLike, hero }: {
  uri?: string; name: string; caption?: string; location?: string; width: number; onLike?: () => void; hero?: ReactNode;
}) {
  return (
    <DoubleTapLike onLike={onLike}>
      <View style={{ width, aspectRatio: 4 / 5, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface2 }}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : (
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontFamily: F.display, fontSize: 96, color: '#fff' }}>{name.slice(0, 1).toUpperCase()}</Text>
          </LinearGradient>
        )}
        {!!location && (
          <View style={styles.location}>
            <MapPin size={12} color="#fff" />
            <Text style={{ fontFamily: F.semibold, fontSize: 12, color: '#fff' }} numberOfLines={1}>{location}</Text>
          </View>
        )}
        {hero && (
          <LinearGradient colors={['transparent', 'rgba(14,11,22,0.85)']} style={styles.heroShade} pointerEvents="none">
            {hero}
          </LinearGradient>
        )}
        {onLike && <LikeButton onPress={onLike} style={{ position: 'absolute', right: 12, bottom: 12 }} />}
      </View>
      {!!caption && <Text style={styles.caption}>{caption}</Text>}
    </DoubleTapLike>
  );
}

function LikeButton({ onPress, style }: { onPress: () => void; style?: object }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Like this" hitSlop={6} style={[styles.likeBtn, style]}>
      <Heart size={24} color={C.pink} fill={C.pink} />
    </Pressable>
  );
}

function PromptBlock({ q, question, a, onLike }: { q?: number; question?: string; a: string; onLike?: () => void }) {
  return (
    <DoubleTapLike onLike={onLike}>
    <View style={styles.prompt}>
      <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.muted }}>{question ?? PROMPT_QUESTIONS[q ?? -1] ?? ''}</Text>
      <Text style={{ fontFamily: F.displayBold, fontSize: 24, lineHeight: 30, color: C.text, marginTop: 8, paddingRight: onLike ? 44 : 0 }}>{a}</Text>
      {onLike && <LikeButton onPress={onLike} style={{ position: 'absolute', right: 12, bottom: 12 }} />}
    </View>
    </DoubleTapLike>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel} accessibilityRole="header">{children}</Text>;
}

function InfoChip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.infoChip}>
      {icon}
      <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.text }} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/**
 * A full profile you scroll through top to bottom, like Hinge: photos mixed with prompts.
 * Pass onLike to show a heart on every photo and prompt.
 */
export function ScrollProfile({ person, me, isMe, onLike, onReport, onBlock, header, footer, bottomPad = 40, showWhy, scrollRef }: {
  person: DeckPerson; me: Profile | null; isMe?: boolean; onLike?: (item: LikeItem) => void;
  onReport?: () => void; onBlock?: () => void; header?: ReactNode; footer?: ReactNode; bottomPad?: number;
  /** Show the "Why you're seeing them" line (Discover). */
  showWhy?: boolean; scrollRef?: Ref<ScrollView>;
}) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 32;
  const tags = isMe ? [] : overlapTags(me, person);
  const shared = new Set(isMe ? [] : me?.interests ?? []);
  const inCommon = person.interests.filter((i) => shared.has(i));
  const interests = [...inCommon, ...person.interests.filter((i) => !shared.has(i))];
  const why = showWhy && !isMe ? whyReasons(me, person) : [];
  const photos = person.photos.length ? person.photos : [undefined];
  const captions = person.captions ?? [];
  const locations = person.photo_locations ?? [];
  const prompts = person.prompts ?? [];
  const looking = lookingLabel(person.looking_for);
  const theirLike = !isMe && (person.liked_me_comment || person.liked_me_item) ? describeItem(person.liked_me_item, me) : null;

  const heroText = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingRight: onLike ? 64 : 0 }}>
      <Text style={styles.heroName} numberOfLines={1}>{person.name}</Text>
      {person.verified && <VerifiedCheck size={22} />}
      {person.age != null && <Text style={styles.heroAge}>{person.age}</Text>}
    </View>
  );
  const photo = (i: number) => i < photos.length ? (
    <PhotoBlock key={`p${i}`} uri={photos[i]} name={person.name} caption={captions[i]} location={locations[i]} width={w} hero={i === 0 ? heroText : undefined}
      onLike={onLike ? () => onLike({ key: `photo:${i}`, label: 'photo', photo: photos[i] }) : undefined} />
  ) : null;
  const prompt = (i: number) => i < prompts.length ? (
    <PromptBlock key={`q${i}`} q={prompts[i].q} a={prompts[i].a}
      onLike={onLike ? () => onLike({ key: `prompt:${i}`, label: 'prompt', question: PROMPT_QUESTIONS[prompts[i].q], answer: prompts[i].a }) : undefined} />
  ) : null;
  const fav = person.fav_spot?.trim() && person.fav_order?.trim() ? (
    <PromptBlock key="fav" question={`🍔 ${favQuestion(person.fav_spot)}`} a={person.fav_order}
      onLike={onLike ? () => onLike({ key: 'fav', label: 'go-to order', question: favQuestion(person.fav_spot), answer: person.fav_order ?? '' }) : undefined} />
  ) : null;

  const about = (
    <View key="about" style={styles.card}>
      {!!person.bio && (
        <View style={{ gap: 6 }}>
          <SectionLabel>About {isMe ? 'you' : person.name}</SectionLabel>
          <Text style={{ fontFamily: F.body, fontSize: 16, lineHeight: 23, color: C.text }}>{person.bio}</Text>
        </View>
      )}
      {tags.length > 0 && (
        <View style={{ gap: 6 }}>
          <SectionLabel>You two</SectionLabel>
          <Explain k="overlap" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t) => <View key={t} style={styles.tagDark}><Text style={styles.tagDarkText}>{t}</Text></View>)}
          </Explain>
        </View>
      )}
      {interests.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Interests</SectionLabel>
          {inCommon.length > 0 && (
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.pink }}>
              You both like {inCommon.length === 1 ? inCommon[0] : `${inCommon.slice(0, -1).join(', ')} and ${inCommon[inCommon.length - 1]}`}
            </Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {interests.map((i) => {
              const both = shared.has(i);
              return (
                <View key={i} style={[styles.interest, both && { borderColor: C.pink }]} accessibilityLabel={both ? `${i}, you both like this` : i}>
                  {both && <Check size={13} color={C.pink} strokeWidth={3} />}
                  <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.text }}>{i}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  const campus = (
    <View key="campus" style={styles.card}>
      <SectionLabel>Campus</SectionLabel>
      {[
        { icon: <GraduationCap size={16} color={C.muted} />, label: 'Classes', value: person.classes.join(', ') },
        { icon: <MapPin size={16} color={C.muted} />, label: 'Favorite spots', value: person.spots.join(', ') },
      ].filter((r) => r.value).map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', gap: 10 }}>
          {r.icon}
          <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, width: 104 }}>{r.label}</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.text, flex: 1 }}>{r.value}</Text>
        </View>
      ))}
    </View>
  );

  // Hinge-style order: photo, prompt, photo, about, photo, prompt, photo, prompt, the rest.
  const blocks = [prompt(0), photo(1), about, photo(2), prompt(1), photo(3), prompt(2), fav, photo(4), photo(5),
    ...prompts.slice(3).map((_, i) => prompt(i + 3)),
    (person.classes.length || person.spots.length) ? campus : null].filter(Boolean);

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad, gap: 14 }} showsVerticalScrollIndicator={false}>
      {header}
      {photo(0)}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -4 }}>
        <TierBadge tier={person.tier} />
        <Badges ids={person.badges} />
      </View>
      {why.length > 0 && (
        <Explain k="why_seeing" ctx={{ name: person.name }}>
          <View style={styles.why}>
            <Sparkles size={14} color={C.pink} />
            <Text style={styles.whyText}>
              <Text style={{ fontFamily: F.bold, color: C.text }}>Why you’re seeing {person.name}: </Text>{why.join(' · ')}
            </Text>
          </View>
        </Explain>
      )}

      {theirLike !== null || person.liked_me_comment ? (
        <Explain k={person.super_liked_me ? 'super_liked_me' : 'liked_me'}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.likedYou}>
            {theirLike?.photo ? <Image source={{ uri: theirLike.photo }} style={{ width: 44, height: 55, borderRadius: 8 }} /> : (person.super_liked_me ? <Star size={22} color="#fff" fill="#fff" /> : <Heart size={22} color="#fff" fill="#fff" />)}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#fff' }}>
                {person.super_liked_me ? 'Super liked' : 'Liked'} your {theirLike?.label ?? 'profile'}{theirLike?.question ? `: “${theirLike.question}”` : ''}
              </Text>
              {!!person.liked_me_comment && <Text style={{ fontFamily: F.semibold, fontSize: 16, color: '#fff', marginTop: 2 }}>“{person.liked_me_comment}”</Text>}
            </View>
          </LinearGradient>
        </Explain>
      ) : person.super_liked_me ? (
        <Explain k="super_liked_me">
          <LinearGradient colors={GRAD} style={[styles.likedYou, { paddingVertical: 10 }]}>
            <Star size={18} color="#fff" fill="#fff" />
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: '#fff' }}>Super liked you</Text>
          </LinearGradient>
        </Explain>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {looking && <Explain k="looking_for"><InfoChip icon={<Text>{looking.emoji}</Text>} text={looking.label} /></Explain>}
        {(person.major || person.grad_year) && (
          <InfoChip icon={<GraduationCap size={15} color={C.muted} />}
            text={[person.major, person.grad_year ? `${CLASS_NAME[person.grad_year] ?? ''} ${classOf(person.grad_year)}` : ''].filter(Boolean).join(', ')} />
        )}
        {!!person.pronouns && <InfoChip icon={<Text style={{ color: C.muted }}>·</Text>} text={person.pronouns} />}
        {!!person.dorm && <InfoChip icon={<Home size={15} color={C.muted} />} text={person.dorm} />}
        {!!person.greek && <InfoChip icon={<Users size={15} color={C.muted} />} text={person.greek} />}
      </ScrollView>

      {blocks}

      {!isMe && (onReport || onBlock) && (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Button label={`Send ${person.name} to a friend`} variant="secondary" icon={<Send size={16} color={C.text} />}
            onPress={() => Share.share({ message: `Check out ${person.name} on Swirl 👀 swirl://person/${person.id}` }).catch(() => {})} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Report" variant="secondary" icon={<Flag size={16} color={C.text} />} onPress={onReport} style={{ flex: 1 }} />
            <Button label="Block" variant="secondary" icon={<Ban size={16} color={C.text} />} onPress={onBlock} style={{ flex: 1 }} />
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint, textAlign: 'center' }}>{person.name} won't know if you report or block them.</Text>
        </View>
      )}
      {footer}
    </ScrollView>
  );
}

/** Kept for screens that want the old name. */
export function ProfileView(props: { person: DeckPerson; me: Profile | null; isMe?: boolean; onReport?: () => void; onBlock?: () => void }) {
  return <ScrollProfile {...props} />;
}

/** "Send a like" sheet with an optional comment on the photo or prompt you liked. */
export function LikeSheet({ item, name, visible, supersLeft, busy, onClose, onSend }: {
  item: LikeItem | null; name: string; visible: boolean; supersLeft: number | null; busy?: boolean;
  onClose: () => void; onSend: (kind: 'like' | 'super', comment: string) => void;
}) {
  const [comment, setComment] = useState('');
  const send = (kind: 'like' | 'super') => { onSend(kind, comment.trim()); setComment(''); };
  return (
    <Sheet visible={visible} onClose={() => { setComment(''); onClose(); }} title={`Like ${name}’s ${item?.label ?? 'profile'}`}>
      <View style={{ gap: 12, paddingBottom: 8 }}>
        {item?.photo ? (
          <Image source={{ uri: item.photo }} style={{ width: '100%', height: 220, borderRadius: 16 }} contentFit="cover" />
        ) : item?.answer ? (
          <View style={styles.prompt}>
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.muted }}>{item.question}</Text>
            <Text style={{ fontFamily: F.displayBold, fontSize: 20, color: C.text, marginTop: 6 }}>{item.answer}</Text>
          </View>
        ) : null}
        <TextInput
          value={comment} onChangeText={setComment} placeholder="Add a comment (optional)" placeholderTextColor={C.faint}
          maxLength={200} multiline
          style={{ minHeight: 52, backgroundColor: C.surface2, borderRadius: 16, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14, color: C.text, fontFamily: F.body, fontSize: 16 }}
        />
        <Text style={{ fontFamily: F.body, fontSize: 12, color: C.faint }}>If you match, your comment becomes the first message.</Text>
        <Button label="Send like" icon={<Heart size={16} color="#fff" fill="#fff" />} onPress={() => send('like')} loading={busy} />
        <Button label={`Super Like${supersLeft != null ? ` (${supersLeft} left)` : ''}`} variant="secondary"
          icon={<Star size={16} color={C.pink} fill={C.pink} />} onPress={() => send('super')} disabled={busy || supersLeft === 0} />
      </View>
    </Sheet>
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
        <Text style={{ fontFamily: F.body, fontSize: 13, color: C.faint, marginTop: 6 }}>Message within 24 hours for +{PTS.reply}.</Text>
      </View>
      <View style={{ gap: 10, marginTop: 40 }}>
        <Button label="Send a message" variant="white" onPress={onMessage} />
        <Button label="Keep swiping" variant="ghost" onPress={onClose} />
      </View>
      <Confetti />
    </View>
  );
}

const styles = StyleSheet.create({
  location: { position: 'absolute', left: 12, top: 12, maxWidth: '80%', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(14,11,22,0.6)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16 },
  heroName: { fontFamily: F.display, fontSize: 34, color: '#fff', flexShrink: 1 },
  heroAge: { fontFamily: F.semibold, fontSize: 26, color: 'rgba(255,255,255,0.85)' },
  sectionLabel: { fontFamily: F.bold, fontSize: 12, color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  why: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 10 },
  whyText: { flex: 1, fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
  caption: { fontFamily: F.medium, fontSize: 14, color: C.muted, marginTop: 8, paddingHorizontal: 4 },
  likeBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  prompt: { backgroundColor: C.surface, borderRadius: 20, padding: 20, paddingBottom: 26, borderWidth: 1, borderColor: C.line, minHeight: 120 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.line, gap: 14 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  likedYou: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 12 },
  tagDark: { borderRadius: 999, borderWidth: 1.5, borderColor: C.pink, paddingVertical: 5, paddingHorizontal: 10 },
  tagDarkText: { fontFamily: F.semibold, fontSize: 13, color: C.text },
  interest: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surface2, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'transparent' },
  miniPolaroid: { position: 'absolute', backgroundColor: '#fff', padding: 6, borderRadius: 18 },
  heart: { position: 'absolute', bottom: 0, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.bg },
});
