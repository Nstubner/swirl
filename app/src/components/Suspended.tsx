import { Text, View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { Button, Screen } from './ui';
import { useAuth } from '@/lib/auth';
import { C, F } from '@/lib/theme';

/** Shown instead of the app when an admin has banned the account. */
export default function Suspended() {
  const { signOut } = useAuth();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <ShieldAlert size={44} color={C.down} />
        <Text style={{ fontFamily: F.display, fontSize: 26, color: C.text, textAlign: 'center' }}>Your account is suspended</Text>
        <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.muted, textAlign: 'center' }}>
          After reviewing reports, we suspended this account for breaking Swirl’s community rules. You won’t appear to anyone on Swirl.
          If you think this is a mistake, reply to any email from Swirl and we’ll take another look.
        </Text>
        <Button label="Log out" variant="secondary" onPress={signOut} style={{ marginTop: 12, alignSelf: 'stretch' }} />
      </View>
    </Screen>
  );
}
