import { Tabs } from 'expo-router';
import { Flame, MessageCircle, Trophy, User } from 'lucide-react-native';
import { C, F } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.pink,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.line },
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: ({ color }) => <Flame size={24} color={color} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Leaderboard', tabBarIcon: ({ color }) => <Trophy size={24} color={color} /> }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={24} color={color} /> }} />
    </Tabs>
  );
}
