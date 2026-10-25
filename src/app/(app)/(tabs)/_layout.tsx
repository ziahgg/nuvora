import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { usePermissions } from '@/state/session';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const { finance } = usePermissions();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: 'fade' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="customers" />
      {/* Staff have no finance access (mirrors the RLS policies). */}
      <Tabs.Screen name="finance" options={finance ? undefined : { href: null }} />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
