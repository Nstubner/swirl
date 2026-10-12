import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Chip, EmptyState, Screen } from '@/components/ui';
import { Overview, Reports, Rewards, SeasonsEvents, Users, Verifications } from '@/components/admin';
import { useExtras } from '@/lib/extras';
import { C, F } from '@/lib/theme';

type Tab = 'overview' | 'reports' | 'verify' | 'users' | 'rewards' | 'seasons';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'reports', label: 'Reports' }, { id: 'verify', label: 'Verify' }, { id: 'users', label: 'Users' },
  { id: 'rewards', label: 'Rewards' }, { id: 'seasons', label: 'Events & seasons' },
];

/** Admin dashboard. Only visible to accounts in the admins table (the server checks too). */
export default function Admin() {
  const { extras } = useExtras();
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 6 }} accessibilityLabel="Back"><ChevronLeft size={26} color={C.text} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>Admin</Text>
      </View>
      {!extras?.is_admin ? (
        <EmptyState title="Admins only" body="This account isn't an admin." />
      ) : (
        <>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 6 }}>
              {TABS.map((t) => <Chip key={t.id} small label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />)}
            </ScrollView>
          </View>
          <View style={{ flex: 1 }}>
            {tab === 'overview' && <Overview onJump={setTab} />}
            {tab === 'reports' && <Reports />}
            {tab === 'verify' && <Verifications />}
            {tab === 'users' && <Users />}
            {tab === 'rewards' && <Rewards />}
            {tab === 'seasons' && <SeasonsEvents />}
          </View>
        </>
      )}
    </Screen>
  );
}
