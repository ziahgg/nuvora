import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePermissions } from '@/state/session';
import { colors, shadows, SIDE } from '@/theme/tokens';
import { CircleButton } from './Button';
import { BottomSheet } from './Feedback';
import { Icon, type IconName } from './Icon';
import { Txt } from './Text';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'house' },
  orders: { label: 'Orders', icon: 'clipboard-list' },
  customers: { label: 'Customers', icon: 'users' },
  finance: { label: 'Finance', icon: 'wallet' },
  more: { label: 'More', icon: 'ellipsis' },
};

/** Figma "Bottom Navigation" with the floating create button. */
export function TabBar({ state, navigateToTab, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { finance } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);

  const create: { icon: IconName; label: string; caption: string; href: string; finance?: boolean }[] = [
    { icon: 'clipboard-list', label: 'New order', caption: 'Choose a customer and services', href: '/order/new' },
    { icon: 'user-plus', label: 'Add customer', caption: 'Name, phone and notes', href: '/customer/new' },
    { icon: 'banknote', label: 'Record payment', caption: 'Against an unpaid order', href: '/outstanding', finance: true },
    { icon: 'receipt', label: 'Add expense', caption: 'Supplies, rent, wages…', href: '/expense/new', finance: true },
    { icon: 'calendar-plus', label: 'New appointment', caption: 'Pickup, delivery or service', href: '/schedule/new' },
  ];

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.fab}>
        <CircleButton
          icon="plus"
          size={60}
          iconSize={26}
          bg="ink"
          color="onPrimary"
          raised
          accessibilityLabel="Create"
          onPress={() => setCreateOpen(true)}
        />
      </View>
      <View style={styles.items} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          const hidden = (descriptors[route.key]?.options as { href?: unknown } | undefined)?.href === null;
          if (!tab || hidden) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => navigateToTab(route.key)}
              style={styles.tab}
            >
              <View style={styles.pill}>
                <Icon name={tab.icon} size={20} color={focused ? 'ink' : 'textTertiary'} />
              </View>
              <Txt variant="nav" color={focused ? 'ink' : 'textTertiary'} weight={focused ? 'semibold' : undefined}>
                {tab.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <BottomSheet visible={createOpen} onClose={() => setCreateOpen(false)} title="Create">
        <View>
          {create
            .filter((c) => !c.finance || finance)
            .map((c) => (
              <Pressable
                key={c.label}
                accessibilityRole="button"
                onPress={() => {
                  setCreateOpen(false);
                  router.push(c.href as never);
                }}
                style={({ pressed }) => [styles.createRow, pressed ? { opacity: 0.6 } : null]}
              >
                <View style={styles.createIcon}>
                  <Icon name={c.icon} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyMedium">{c.label}</Txt>
                  <Txt variant="caption" color="textSecondary">
                    {c.caption}
                  </Txt>
                </View>
                <Icon name="chevron-right" size={18} color="textTertiary" />
              </Pressable>
            ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 4,
    ...shadows.footer,
  },
  items: { flexDirection: 'row', height: 58 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  pill: { width: 48, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: SIDE, top: -78 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
