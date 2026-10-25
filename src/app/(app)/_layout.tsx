import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="setup-complete" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="payment/done" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
