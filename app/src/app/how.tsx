import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Compass, Gift, Heart, Medal, Shield, Trophy, Users } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Screen, TierBadge } from '@/components/ui';
import { PTS, TIERS, fmt } from '@/lib/constants';
import { C, F } from '@/lib/theme';

/** Words used across the app, so they always mean the same thing. */
const GLOSSARY: [string, string][] = [
  ['Score', 'Your number. Everyone starts each season at 1,000.'],
  ['Tier', 'Bronze, Silver, Gold, Platinum or Diamond, based on your score.'],
  ['Rank', 'Your place on the leaderboard, like #12 or Top 10%.'],
  ['Season', 'About one semester. Scores reset to 1,000 when a new one starts.'],
];

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={styles.icon}>{icon}</View>
        <Text style={styles.h2} accessibilityRole="header">{title}</Text>
      </View>
      {children}
    </View>
  );
}

const P = ({ children }: { children: ReactNode }) => <Text style={styles.p}>{children}</Text>;

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={styles.rowV}>{v}</Text>
    </View>
  );
}

/** Everything about how Swirl works, on one page, in plain words. */
export default function How() {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>How Swirl works</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 16 }}>
        <Section icon={<Compass size={18} color={C.pink} />} title="Who you see">
          <P>Discover mostly shows people with a score near yours, mixed with others so it never gets stale. People who Super Liked you and Boosted profiles come first.</P>
          <P>You only see people who want to see someone like you, and they only see you if you want to see them. Filters narrow it further. Each profile says why you’re seeing them.</P>
        </Section>

        <Section icon={<Heart size={18} color={C.pink} />} title="Liking and matching">
          <Row k="Swipe right" v="like their profile" />
          <Row k="Swipe left or ✕" v="pass" />
          <Row k="Double-tap or ♥" v="like one photo or answer, with an optional comment" />
          <Row k="★ Super Like" v="they see you first. 1 free a day, more from invites" />
          <P>If you both like each other, it’s a match and you can message. A comment on your like becomes the first message. A regular like stays secret until you match.</P>
        </Section>

        <Section icon={<Users size={18} color={C.pink} />} title="Duos (double dates)">
          <P>Pair up with a friend (up to 3 duos), then switch Discover to Duo and swipe on other pairs together. A like only counts once you both say yes. When two duos like each other, all four of you get a group chat. When 3 of the 4 confirm the double date, everyone gets +{PTS.date}.</P>
        </Section>

        <Section icon={<Trophy size={18} color={C.pink} />} title="Your score">
          <Row k="Someone likes you" v={`+${PTS.like}`} />
          <Row k="Someone Super Likes you" v={`+${PTS.super}`} />
          <Row k="Someone passes" v={`${PTS.pass} (never shown to anyone)`} />
          <Row k="First message within 24h of matching" v={`+${PTS.reply}`} />
          <Row k={`You both send ${PTS.convoMin}+ messages`} v={`+${PTS.convo} each`} />
          <Row k="You both confirm a date" v={`+${PTS.date} each`} />
          <Row k="Unmatching someone you never messaged" v={`${PTS.ghost}`} />
          <P>Likes from people with higher scores count more. Likes from people who like almost everyone count less. During Swirl Nights, points are multiplied.</P>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {TIERS.map((t) => (
              <View key={t.id} style={{ alignItems: 'center', gap: 4 }}>
                <TierBadge tier={t.id} small />
                <Text style={styles.small}>{t.min ? `${fmt(t.min)}+` : 'under 900'}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section icon={<Users size={18} color={C.pink} />} title="Dorms and Greek life">
          <P>Dorms and chapters compete by the average points their members earn each week. Points from your own teammates don’t count, so trading likes doesn’t help. Off-campus and the Hill don’t compete as dorms.</P>
          <P>At the end of each season, the top dorm and top chapter win a prize and every member gets a Champs badge.</P>
        </Section>

        <Section icon={<Medal size={18} color={C.pink} />} title="Seasons and badges">
          <P>Each season lasts about a semester. When it ends you get a recap of where you finished, the top 25 get a permanent badge, and everyone starts again at 1,000.</P>
          <P>Hidden profiles never appear on the leaderboard and don’t get rank badges.</P>
        </Section>

        <Section icon={<Gift size={18} color={C.pink} />} title="Inviting friends">
          <P>Each friend who finishes their profile gives you 2 Super Likes. 3 friends: a 24-hour Boost and you can see who liked you. 5: Founding Member badge. 10: Swirl Founder badge and a free hoodie.</P>
        </Section>

        <Section icon={<Shield size={18} color={C.pink} />} title="Staying safe">
          <P>Report or block anyone from their profile or your chat. They won’t know. Get verified with a quick selfie for a blue check. Meet in public and tell a friend where you’re going.</P>
        </Section>

        <View style={styles.section}>
          <Text style={styles.h2} accessibilityRole="header">Words we use</Text>
          {GLOSSARY.map(([k, v]) => <Row key={k} k={k} v={v} />)}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: C.surface, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: C.line },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,61,139,0.14)', alignItems: 'center', justifyContent: 'center' },
  h2: { fontFamily: F.display, fontSize: 20, color: C.text },
  p: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.muted },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line },
  rowK: { flex: 1, fontFamily: F.semibold, fontSize: 14, color: C.text },
  rowV: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.muted, textAlign: 'right' },
  small: { fontFamily: F.body, fontSize: 11, color: C.faint },
});
