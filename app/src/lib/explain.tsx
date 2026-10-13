import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Info } from 'lucide-react-native';
import { Button, Sheet, TierBadge } from '@/components/ui';
import { badgeInfo, INVITE_MILESTONES, PTS, TIERS, VISIBILITY, fmt, type TierId } from './constants';
import { ExplainContext, useExplain } from './explain-context';
import { C, F } from './theme';

/**
 * Every "tap to explain" message in the app.
 * summary = one or two plain sentences. rows = short "thing → value" lines. bullets = short tips.
 */
type Entry = { title: string; summary: string; rows?: [string, string][]; bullets?: string[]; tiers?: TierId | true };
type Ctx = Record<string, unknown> | undefined;

const tierRows: [string, string][] = TIERS.map((t, i) => [t.name, i === 0 ? `under ${fmt(TIERS[1].min)}` : `${fmt(t.min)}+`]);
const pts = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

const ENTRIES: Record<string, (ctx: Ctx) => Entry> = {
  score: () => ({
    title: 'Your score',
    summary: 'Points that go up when people like you and when you’re a good match to talk to.',
    bullets: ['Everyone starts at 1,000 each semester.', 'Only you see your exact number (unless you choose Public).', 'It never drops below 500.'],
  }),
  scoring: () => ({
    title: 'How scoring works',
    summary: 'You earn points for being liked and for actually connecting.',
    rows: [
      ['Someone likes you', pts(PTS.like)],
      ['Someone Super Likes you', pts(PTS.super)],
      ['You message a new match within 24h', pts(PTS.reply)],
      [`You both send ${PTS.convoMin}+ messages`, `${pts(PTS.convo)} each`],
      ['You both confirm a date', `${pts(PTS.date)} each`],
      ['Someone passes on you', pts(PTS.pass)],
      ['You unmatch without ever messaging', pts(PTS.ghost)],
    ],
    bullets: [
      'Likes from higher-ranked people count more.',
      'Likes from people who like everyone count less.',
      'Swirl Nights make likes count extra.',
      'Everyone resets to 1,000 each semester.',
    ],
  }),
  tier: (ctx) => ({
    title: ctx?.tier ? `${TIERS.find((t) => t.id === ctx.tier)?.name ?? ''} tier` : 'Tiers',
    tiers: (ctx?.tier as TierId) ?? true,
    summary: 'A rough sign of how someone’s season is going. It never shows the exact score.',
    rows: tierRows,
  }),
  movement: () => ({
    title: 'Movement',
    summary: 'How many spots someone moved since midnight.',
    rows: [['Green ↑', 'climbed'], ['Red ↓', 'dropped'], ['—', 'no change']],
  }),
  rank: (ctx) => ({
    title: 'Your rank',
    summary: ctx?.top ? `You’re in the ${String(ctx.top).toLowerCase()} of everyone on this board.` : 'Your spot on this board.',
    bullets: ['The board lists the top 25.', 'Everyone else sees a percentile, like “Top 30%”.', 'You can hide from the board anytime in Profile.'],
  }),
  leaderboard: () => ({
    title: 'The leaderboard',
    summary: 'Five ways to see who’s doing well this season.',
    rows: [['Campus', 'top 25 scores'], ['Week', 'most points in 7 days'], ['Class', 'your grad year'], ['Dorms', 'dorm vs dorm'], ['Greek', 'chapter vs chapter']],
    bullets: ['Tier-only people show a badge, not a number.', 'Hidden people don’t appear.', 'Nobody ever sees passes.'],
  }),
  dorms: () => ({
    title: 'Dorm vs dorm',
    summary: 'Each dorm’s score is the average points its members earned this week.',
    bullets: ['A dorm needs 5+ people on Swirl to show up.', 'Points from your own dorm-mates don’t count.', 'Off-campus and the Hill don’t compete. Anyone can watch.', 'The top dorm at the end of the season wins a prize, and everyone in it gets a Champs badge.', 'You can change your dorm once per semester.'],
  }),
  greek: () => ({
    title: 'Greek board',
    summary: 'Chapter vs chapter, by average points per member this week.',
    bullets: [
      'Conversations and dates count full. Likes count half.',
      'Points from your own chapter don’t count.',
      'A chapter needs 5+ members on Swirl to show up.',
      'The top chapter at the end of the season wins a prize, and every member gets a Champs badge.',
      'Set your chapter in Edit profile (once per semester).',
    ],
  }),
  visibility: () => ({
    title: 'Leaderboard visibility',
    summary: 'Choose how you show up. Your score counts the same either way.',
    rows: VISIBILITY.map((v) => [v.label, v.id === 'public' ? 'rank + score' : v.id === 'tier' ? 'rank + badge only' : 'not on the board'] as [string, string]),
  }),
  discover: () => ({
    title: 'How Discover works',
    summary: 'Scroll through someone’s whole profile, then decide.',
    rows: [
      ['Swipe right', 'like their profile'],
      ['Swipe left or ✕', 'pass'],
      ['Double-tap or ♥', 'like a photo or answer, with an optional comment'],
      ['★', 'Super Like (they see it first)'],
    ],
    bullets: [
      'Who you see: mostly people near your score, mixed with others so it never gets stale.',
      'People who Super Liked you and Boosted profiles come first.',
      'Only people who’d want to see you show up, based on who you each want to see.',
      'If you both like each other, it’s a match. Your comment becomes the first message.',
      'Use the filter button to narrow by year, what people are looking for, or verified only.',
    ],
  }),
  why_seeing: (ctx) => ({
    title: `Why you’re seeing ${String(ctx?.name ?? 'them')}`,
    summary: 'Discover mostly shows people near your score, plus a mix of others, so you see people you’re likely to match with.',
    rows: [
      ['Similar rank', 'their score is close to yours'],
      ['Both in…', 'you share a class, dorm or spot'],
      ['Interests in common', 'you picked some of the same interests'],
      ['Super liked you', 'they used a Super Like on you'],
      ['Boosted', 'they earned a Boost by inviting friends'],
      ['New to Swirl', 'they joined in the last few days'],
    ],
    bullets: ['A regular like stays secret until you match, or until you unlock Likes you.'],
  }),
  like_comment: () => ({
    title: 'Liking with a comment',
    summary: 'Tap the heart on the photo or prompt you liked and say why. It’s the easiest way to start a conversation.',
    bullets: ['Comments are optional.', 'If you match, it shows up as the first message.'],
  }),
  superlike: (ctx) => ({
    title: 'Super Likes',
    summary: `Puts you at the top of their Discover and gives them ${pts(PTS.super)} instead of ${pts(PTS.like)}.`,
    rows: [['Free', '1 per day'], ['Each friend you invite', '+2'], ...(ctx?.left != null ? [['You have', String(ctx.left)] as [string, string]] : [])],
  }),
  superlike_out: () => ({
    title: 'Out of Super Likes',
    summary: 'You get a new one at midnight.',
    bullets: ['Invite friends to earn more: +2 for each friend who joins.'],
  }),
  super_liked_me: () => ({ title: 'They Super Liked you', summary: 'Like them back and it’s an instant match.' }),
  liked_me: () => ({ title: 'They liked you', summary: 'Like them back and it’s a match.' }),
  overlap: () => ({ title: 'Things in common', summary: 'Classes, dorm and campus spots you both added. Shared interests are outlined in pink.' }),
  boost: () => ({ title: 'Boost', summary: 'Your profile shows up first in Discover for 24 hours.', bullets: ['Unlocked by inviting 3 friends.'] }),
  invites: () => ({
    title: 'Invite friends',
    summary: 'Share your code. A friend counts once they finish their profile.',
    rows: INVITE_MILESTONES.map((m) => [`${m.at} friend${m.at > 1 ? 's' : ''}`, m.title] as [string, string]),
    bullets: ['Your friend gets a bonus Super Like too.'],
  }),
  badge: (ctx) => {
    const b = badgeInfo(String(ctx?.id));
    if (!b) return { title: 'Badge', summary: '' };
    return {
      title: b.label, summary: b.body,
      bullets: [
        b.kind === 'invite' ? 'Earned through the invite program.'
          : b.kind === 'season' ? 'Given at the end of each season to the top 25 people who show on the leaderboard.'
          : 'Given to everyone in the winning dorm or chapter at the end of each season.',
        'Badges stay on your profile for good.',
      ],
    };
  },
  verified: () => ({
    title: 'Verified',
    summary: 'This person took a selfie that a real person checked against their photos.',
    bullets: ['Get verified in Profile → Get verified.', 'You can choose to only see verified people in Discover filters.'],
  }),
  looking_for: () => ({ title: 'Looking for', summary: 'What someone wants right now. It helps avoid mismatches.' }),
  likes_you: (ctx) => ({
    title: 'Likes you',
    summary: ctx?.unlocked ? 'People who liked you that you haven’t answered yet.' : 'See who already liked you.',
    bullets: ['Unlock by inviting 3 friends.', 'Everyone can see it during Swirl Nights.'],
  }),
  filters: () => ({ title: 'Filters', summary: 'Only see people from certain grad years, looking for certain things, or verified.' }),
  season: (ctx) => ({
    title: ctx?.name ? String(ctx.name) : 'Seasons',
    summary: 'One season per semester. At the end, your final rank is saved and everyone resets to 1,000.',
  }),
  event: (ctx) => ({
    title: ctx?.name ? String(ctx.name) : 'Events',
    summary: ctx?.multiplier ? `While it’s on, likes count ${ctx.multiplier}×. Everyone’s on at once.` : 'Special times when everyone’s on at once.',
    bullets: [...(ctx?.description ? [String(ctx.description)] : []), 'Everyone can see “Likes you” during events.'],
  }),
  next_tier: (ctx) => ({
    title: 'Next tier',
    summary: ctx?.next ? `${fmt(Number(ctx.need))} more points to reach ${ctx.next}.` : 'You’re in the top tier.',
    rows: tierRows,
  }),
  history: () => ({ title: 'Last 14 days', summary: 'Your score at the end of each day.' }),
  today: () => ({ title: 'Today and this week', summary: 'Points gained since midnight, and in the last 7 days.' }),
  recap: () => ({ title: 'Your week', summary: 'What happened for you on Swirl in the last 7 days. Share it to your story if you want.' }),
  pause: () => ({ title: 'Pause your account', summary: 'Hide from Discover and the leaderboard. Matches and chats stay. Turn it off anytime.' }),
  push: () => ({ title: 'Notifications', summary: 'Get a ping for new matches, new messages and Swirl Nights.' }),
  reason_like: () => ({ title: 'Likes received', summary: `${pts(PTS.like)} each. Likes from higher-ranked people count more.` }),
  reason_super: () => ({ title: 'Super Likes received', summary: `${pts(PTS.super)} each.` }),
  reason_pass: () => ({ title: 'Passes', summary: `${pts(PTS.pass)} each. Nobody sees who passed on them.` }),
  reason_reply: () => ({ title: 'Quick replies', summary: `${pts(PTS.reply)} for messaging a new match within 24 hours.` }),
  reason_convo: () => ({ title: 'Real conversations', summary: `${pts(PTS.convo)} each when you both send ${PTS.convoMin}+ messages.` }),
  reason_date: () => ({ title: 'Dates confirmed', summary: `${pts(PTS.date)} each when you both tap “We went on a date”.` }),
  reason_ghost: () => ({ title: 'Ghosted matches', summary: `${pts(PTS.ghost)} for unmatching someone you never messaged.` }),
  matches: () => ({
    title: 'Matches',
    summary: 'New matches are the circles up top. Chats are below.',
    rows: [['Message within 24h', pts(PTS.reply)], [`Both send ${PTS.convoMin}+ messages`, `${pts(PTS.convo)} each`]],
  }),
  your_turn: () => ({ title: 'Your turn', summary: 'They sent the last message.' }),
  date: () => ({ title: 'We went on a date', summary: `After you meet up, tap it in the chat menu. When you both confirm, you each get ${pts(PTS.date)}.` }),
  date_ideas: () => ({ title: 'Date ideas', summary: 'Spots around Boulder based on what you both like. Tap one to suggest it.' }),
  icebreaker: () => ({ title: 'Icebreakers', summary: 'Stuck? Tap for a random question to send.' }),
  preview: () => ({ title: 'Your profile', summary: 'Exactly what others see. Your exact score is never shown.' }),
};

function valueColor(v: string) {
  if (/^\+/.test(v)) return C.up;
  if (/^[−-]\d/.test(v)) return C.down;
  return C.text;
}

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
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
          {open?.tiers && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TIERS.map((t) => (
                <View key={t.id} style={{ opacity: open.tiers === true || open.tiers === t.id ? 1 : 0.4 }}>
                  <TierBadge tier={t.id} explain={false} />
                </View>
              ))}
            </View>
          )}
          {!!open?.summary && <Text style={{ fontFamily: F.semibold, fontSize: 17, lineHeight: 24, color: C.text }}>{open.summary}</Text>}
          {!!open?.rows?.length && (
            <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line }}>
              {open.rows.map(([label, value], i) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                  <Text style={{ fontFamily: F.body, fontSize: 15, color: C.text, flex: 1 }}>{label}</Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: valueColor(value), marginLeft: 12, textAlign: 'right', flexShrink: 1 }}>{value}</Text>
                </View>
              ))}
            </View>
          )}
          {!!open?.bullets?.length && (
            <View style={{ gap: 8 }}>
              {open.bullets.map((b) => (
                <View key={b} style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.pink, marginTop: 8 }} />
                  <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.muted, flex: 1 }}>{b}</Text>
                </View>
              ))}
            </View>
          )}
          <Button label="Got it" variant="secondary" onPress={() => setOpen(null)} style={{ marginTop: 4 }} />
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
