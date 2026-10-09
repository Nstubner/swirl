import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Info } from 'lucide-react-native';
import { Button, Sheet, TierBadge } from '@/components/ui';
import { BADGES, INVITE_MILESTONES, PTS, TIERS, VISIBILITY, fmt, type TierId } from './constants';
import { ExplainContext, useExplain } from './explain-context';
import { C, F } from './theme';

type Entry = { title: string; body: string[]; tiers?: TierId | true };
type Ctx = Record<string, unknown> | undefined;

const tierLine = TIERS.map((t, i) => `${t.name}: ${i === 0 ? `under ${fmt(TIERS[1].min)}` : `${fmt(t.min)}+`}`).join(' · ');

/** Every "tap to explain" message in the app. */
const ENTRIES: Record<string, (ctx: Ctx) => Entry> = {
  score: () => ({
    title: 'Your Swirl Score',
    body: [
      'Everyone starts each season at 1,000. Your score goes up when people like you and when you’re a good match to talk to: replying quickly, having real conversations and going on dates.',
      'Nobody else ever sees your exact score unless you set your visibility to Public. It never drops below 500.',
      'Tap “How it works” to see every way to earn points.',
    ],
  }),
  scoring: () => ({
    title: 'How scoring works',
    body: [
      `Like received: +${PTS.like}. Super Like received: +${PTS.super}. A like from someone ranked above you counts more (up to 2×), from someone below you less (down to ½×).`,
      `Likes from people who like almost everyone count half, so mass-liking doesn’t game the board.`,
      `Pass received: ${PTS.pass}. Small on purpose. Nobody ever sees who passed on them.`,
      `Quick reply: +${PTS.reply} for sending the first message within 24 hours of matching.`,
      `Real conversation: +${PTS.convo} each once you’ve both sent ${PTS.convoMin}+ messages.`,
      `Date confirmed: +${PTS.date} each when you both tap “We went on a date”.`,
      `Ghosting: ${PTS.ghost} for unmatching someone you never messaged.`,
      'During events like Swirl Night, likes count extra.',
      'Scores reset to 1,000 at the start of each season (every semester), so everyone gets a fresh start.',
      `Tiers: ${tierLine}.`,
    ],
  }),
  tier: (ctx) => ({
    title: ctx?.tier ? `${TIERS.find((t) => t.id === ctx.tier)?.name ?? ''} tier` : 'Tiers',
    tiers: (ctx?.tier as TierId) ?? true,
    body: [
      'Tiers are a rough signal of how things are going for someone on Swirl this season. They’re based on the Swirl Score but never show the exact number.',
      `${tierLine}.`,
      'People whose visibility is Hidden don’t show a tier at all.',
    ],
  }),
  movement: () => ({
    title: 'Movement',
    body: [
      'The arrow shows how many places someone moved since midnight. Green means they climbed, red means they dropped, a dash means no change.',
      'It resets each day, so a good evening can move you a lot.',
    ],
  }),
  rank: (ctx) => ({
    title: 'Your rank',
    body: [
      ctx?.top
        ? `You’re in the ${String(ctx.top).toLowerCase()} of everyone on this board. The board lists the top 25. Everyone else sees their own percentile instead of a long number.`
        : 'Your place on this board. The board lists the top 25 people; everyone else sees their percentile (like “Top 30%”) instead.',
      'Hidden profiles don’t appear on the board, but you can always see where you’d be.',
    ],
  }),
  leaderboard: () => ({
    title: 'The leaderboard',
    body: [
      'Campus: the top 25 Swirl Scores this season.',
      'This week: who gained the most points in the last 7 days. The best way for new people to get noticed.',
      'By class: the same ranking within one graduation year.',
      'Dorms: dorm vs dorm, by the average points each member gained this week. Dorms need 3+ people on Swirl to appear.',
      'Tier-only profiles show a badge instead of a score. Hidden profiles don’t appear. Pass counts are never shown.',
    ],
  }),
  dorms: () => ({
    title: 'Dorm vs dorm',
    body: [
      'Each dorm’s score is the average number of points its members gained in the last 7 days. Bigger dorms don’t win just by being bigger.',
      'Dorms need at least 3 people on Swirl to show up. Set your dorm in Edit profile to count toward yours.',
    ],
  }),
  visibility: () => ({
    title: 'Leaderboard visibility',
    body: [
      ...VISIBILITY.map((v) => `${v.label}: ${v.body}`),
      'You can change this any time. Your score still counts the same no matter which you pick.',
    ],
  }),
  discover: () => ({
    title: 'Discover',
    body: [
      'Swipe right or tap the heart to like. Swipe left or tap ✕ to pass. Swipe up or tap the star to Super Like.',
      `If you both like each other, it’s a match and you can chat.`,
      'Tap someone’s name to see their full profile. Tap the left or right side of a photo to flip through photos.',
      'People who Super Liked you show up first, marked “Super liked you”.',
    ],
  }),
  superlike: (ctx) => ({
    title: 'Super Likes',
    body: [
      `A Super Like puts you at the top of their Discover with a “Super liked you” badge, and gives them +${PTS.super} instead of +${PTS.like}.`,
      'You get 1 free Super Like every day (resets at midnight Boulder time).',
      `Want more? Each friend you invite who finishes their profile gives you 2 extra.${ctx?.left != null ? ` You have ${ctx.left} left right now.` : ''}`,
    ],
  }),
  superlike_out: () => ({
    title: 'Out of Super Likes',
    body: [
      'You’ve used today’s free Super Like. You’ll get another at midnight.',
      'Invite friends to earn more: every friend who finishes their profile gives you 2 extra Super Likes.',
    ],
  }),
  super_liked_me: () => ({
    title: 'They Super Liked you',
    body: ['This person used a Super Like on you, so they’re shown first. Like them back and it’s an instant match.'],
  }),
  overlap: () => ({
    title: 'Things in common',
    body: ['Tags like “Both in ECON 2010” or “Both love Norlin” come from the classes, dorm and campus spots you each added. Shared interests are outlined in pink.'],
  }),
  boost: () => ({
    title: 'Boost',
    body: ['While your Boost is active, your profile shows up first in other people’s Discover (right after anyone who Super Liked them). You get a 24-hour Boost for inviting 3 friends.'],
  }),
  invites: () => ({
    title: 'Invite friends',
    body: [
      'Share your code. When a friend signs up, enters it and finishes their profile, it counts for you.',
      ...INVITE_MILESTONES.map((m) => `${m.at} friend${m.at > 1 ? 's' : ''}: ${m.title}. ${m.body}`),
      'Your friend gets 1 bonus Super Like for using a code.',
    ],
  }),
  badge: (ctx) => {
    const b = BADGES[String(ctx?.id)] ?? { label: 'Badge', body: '' };
    return { title: b.label, body: [b.body, 'Badges come from the invite program. Tap Invite friends on your profile to see how to earn them.'] };
  },
  season: (ctx) => ({
    title: ctx?.name ? String(ctx.name) : 'Seasons',
    body: [
      'Swirl runs in seasons, one per semester. When a season ends, everyone’s final rank and tier are saved and scores reset to 1,000 for a fresh start.',
      'Your season recap shows up on your profile.',
    ],
  }),
  event: (ctx) => ({
    title: ctx?.name ? String(ctx.name) : 'Events',
    body: [
      ctx?.description ? String(ctx.description) : 'Special times when Swirl is extra active.',
      ctx?.multiplier ? `While it’s on, likes and Super Likes count ${ctx.multiplier}× toward the score of the person you like.` : '',
    ].filter(Boolean),
  }),
  next_tier: (ctx) => ({
    title: 'Next tier',
    body: [ctx?.next ? `You need ${fmt(Number(ctx.need))} more points to reach ${ctx.next}.` : 'You’re in the top tier.', `${tierLine}.`],
  }),
  history: () => ({ title: 'Last 14 days', body: ['Your Swirl Score at the end of each day for the last two weeks.'] }),
  today: () => ({ title: 'Today and this week', body: ['Points gained (or lost) since midnight Boulder time, and over the last 7 days.'] }),
  pause: () => ({
    title: 'Pause your account',
    body: ['While paused, you’re hidden from Discover and the leaderboard and can’t swipe. Your matches and chats stay, and your score is frozen. Turn it off any time.'],
  }),
  reason_like: () => ({ title: 'Likes received', body: [`+${PTS.like} each, weighted by the liker’s score vs yours (½× to 2×).`] }),
  reason_super: () => ({ title: 'Super Likes received', body: [`+${PTS.super} each, weighted the same way as likes.`] }),
  reason_pass: () => ({ title: 'Passes', body: [`${PTS.pass} each. Nobody sees who passed on them, and passes can’t drop you below 500.`] }),
  reason_reply: () => ({ title: 'Quick replies', body: [`+${PTS.reply} the first time you message a match within 24 hours of matching.`] }),
  reason_convo: () => ({ title: 'Real conversations', body: [`+${PTS.convo} each once you and a match have both sent ${PTS.convoMin}+ messages.`] }),
  reason_date: () => ({ title: 'Dates confirmed', body: [`+${PTS.date} each when you both tap “We went on a date”.`] }),
  reason_ghost: () => ({ title: 'Ghosted matches', body: [`${PTS.ghost} for unmatching someone without ever messaging them.`] }),
  matches: () => ({
    title: 'Matches',
    body: [
      'New matches are the circles at the top. Conversations are below.',
      `Send the first message within 24 hours for +${PTS.reply}. Keep it going: once you’ve both sent ${PTS.convoMin}+ messages, you each get +${PTS.convo}.`,
      '“Your turn” means they sent the last message.',
    ],
  }),
  your_turn: () => ({ title: 'Your turn', body: ['They sent the last message. Reply to keep the conversation going.'] }),
  date: () => ({
    title: 'We went on a date',
    body: [`After you meet up, tap “We went on a date” in the chat menu. When you both confirm, you each get +${PTS.date}. It’s private: it only changes your scores.`],
  }),
  date_ideas: () => ({ title: 'Date ideas', body: ['Spots around Boulder picked from interests you both have. Tap one to drop a suggestion into the chat.'] }),
  preview: () => ({ title: 'Your profile', body: ['This is exactly what other people see when they open your profile. Your exact score is never shown, only your tier (unless you’re Hidden).'] }),
};

/** Wraps the app and renders the explanation sheet. */
export function ExplainProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Entry | null>(null);
  const explain = useCallback((key: string, ctx?: Record<string, unknown>) => {
    const make = ENTRIES[key];
    if (make) setOpen(make(ctx));
  }, []);
  return (
    <ExplainContext.Provider value={explain}>
      {children}
      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open?.title}>
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
          {open?.tiers && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TIERS.map((t) => (
                <View key={t.id} style={{ opacity: open.tiers === true || open.tiers === t.id ? 1 : 0.45 }}>
                  <TierBadge tier={t.id} explain={false} />
                </View>
              ))}
            </View>
          )}
          {open?.body.map((p, i) => (
            <Text key={i} style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.text }}>{p}</Text>
          ))}
          <Button label="Got it" variant="secondary" onPress={() => setOpen(null)} style={{ marginTop: 6 }} />
        </ScrollView>
      </Sheet>
    </ExplainContext.Provider>
  );
}

/** Makes anything tappable to explain itself. */
export function Explain({ k, ctx, children, style }: { k: string; ctx?: Record<string, unknown>; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const explain = useExplain();
  return (
    <Pressable onPress={() => explain(k, ctx)} hitSlop={6} style={style} accessibilityRole="button" accessibilityHint="Explains what this means">
      {children}
    </Pressable>
  );
}

/** Small ⓘ button. */
export function InfoButton({ k, ctx, color = C.muted, size = 18 }: { k: string; ctx?: Record<string, unknown>; color?: string; size?: number }) {
  const explain = useExplain();
  return (
    <Pressable onPress={() => explain(k, ctx)} hitSlop={10} accessibilityLabel="What does this mean?" style={{ padding: 4 }}>
      <Info size={size} color={color} />
    </Pressable>
  );
}
