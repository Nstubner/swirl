import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ExplainProvider } from '@/lib/explain';
import { ExtrasProvider } from '@/lib/extras';
import { Loading } from '@/components/ui';
import Suspended from '@/components/Suspended';
import { C } from '@/lib/theme';

function RootStack() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  const signedIn = !!session;
  const onboarded = !!profile?.onboarded;
  if (signedIn && profile?.banned) return <Suspended />;
  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="person/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="preview" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit" />
        <Stack.Screen name="invite" />
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
  return signedIn ? <ExtrasProvider>{stack}</ExtrasProvider> : stack;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      {fontsLoaded ? (
        <AuthProvider>
          <ExplainProvider>
            <RootStack />
          </ExplainProvider>
        </AuthProvider>
      ) : (
        <Loading />
      )}
    </GestureHandlerRootView>
  );
}
