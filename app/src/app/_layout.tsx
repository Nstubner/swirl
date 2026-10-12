import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { Stack, router, usePathname, type ErrorBoundaryProps } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ExplainProvider } from '@/lib/explain';
import { ExtrasProvider } from '@/lib/extras';
import { Button, Loading, SwirlGlyph } from '@/components/ui';
import { installGlobalErrorHandler, reportError } from '@/lib/errors';
import Suspended from '@/components/Suspended';
import { C, F } from '@/lib/theme';

installGlobalErrorHandler();

/** Shown if a screen crashes. The error is sent to Admin → Support so it can be fixed. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const path = usePathname();
  useEffect(() => { reportError(error, path); }, [error, path]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
      <SwirlGlyph size={64} />
      <Text style={{ fontFamily: F.display, fontSize: 24, color: C.text, textAlign: 'center' }}>Something went wrong</Text>
      <Text style={{ fontFamily: F.body, fontSize: 15, color: C.muted, textAlign: 'center' }}>We’ve been told about it. Try again, and if it keeps happening, restart the app.</Text>
      <Button label="Try again" onPress={retry} style={{ alignSelf: 'stretch', marginTop: 8 }} />
      <Button label="Go home" variant="ghost" small onPress={() => router.replace('/')} />
    </View>
  );
}

/** Tapping a notification opens the right screen (a chat, a match, Discover). */
function useNotificationTaps(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string' && r?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        router.push(url as never);
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [enabled]);
}

function RootStack() {
  const { session, profile, loading } = useAuth();
  useNotificationTaps(!loading && !!session && !!profile?.onboarded);
  if (loading) return <Loading />;
  const signedIn = !!session;
  const onboarded = !!profile?.onboarded;
  if (signedIn && profile?.banned) return <Suspended />;
  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="legal/[doc]" />
      <Stack.Screen name="i/[code]" />
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
        <Stack.Screen name="likes" />
        <Stack.Screen name="verify-photo" />
        <Stack.Screen name="help" />
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
