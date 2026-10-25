import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ErrorState, ToastProvider } from '@/components/Feedback';
import { AppProviders, errorMessage, useSession, useWorkspaceQuery } from '@/state/session';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

/** Signed-out visitors are redirected to Welcome. */
export const unstable_settings = { anchor: 'welcome' };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    InstrumentSerif_400Regular,
    Manrope_800ExtraBold,
  });
  return (
    <AppProviders>
      <ToastProvider>
        <StatusBar style="dark" />
        <Gate fontsReady={fontsLoaded || !!fontError} />
      </ToastProvider>
    </AppProviders>
  );
}

/** Chooses the route group: auth → business setup → app, per Stack.Protected guards. */
function Gate({ fontsReady }: { fontsReady: boolean }) {
  const { user, ready } = useSession();
  const workspace = useWorkspaceQuery();
  const loading = !fontsReady || !ready || (!!user && workspace.isPending);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  if (user && workspace.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 }}>
        <ErrorState message={errorMessage(workspace.error)} onRetry={() => void workspace.refetch()} />
      </View>
    );
  }

  const signedIn = !!user;
  const hasBusiness = !!workspace.data;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !hasBusiness}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && hasBusiness}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
