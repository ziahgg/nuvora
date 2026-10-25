import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Badges';
import { EmptyState } from '@/components/Feedback';
import { AppBar, GroupLabel, Screen } from '@/components/Layout';
import { IconTile } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { fmtDay, fmtTime, relativeDay } from '@/lib/dates';
import { notificationFeed, type NotificationView } from '@/state/selectors';
import { useAction, useWorkspace } from '@/state/session';
import { colors } from '@/theme/tokens';

type Filter = 'all' | 'payments' | 'orders' | 'schedule';
const KINDS: Record<Exclude<Filter, 'all'>, NotificationView['kind'][]> = {
  payments: ['payment', 'overdue'],
  orders: ['order', 'summary'],
  schedule: ['schedule', 'team'],
};

/** Notifications / 41 Notification Center. */
export default function Notifications() {
  const router = useRouter();
  const ws = useWorkspace();
  const [filter, setFilter] = useState<Filter>('all');
  // Snapshot on open so unread dots stay visible during this visit.
  const [feed] = useState(() => notificationFeed(ws));
  const markRead = useAction(() => api.markNotificationsRead(ws.business.id));

  useEffect(() => {
    if (ws.notifications.some((n) => !n.readAt)) markRead.run(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on open
  }, []);

  const list = filter === 'all' ? feed : feed.filter((n) => KINDS[filter].includes(n.kind));
  const groups = useMemo(() => {
    const out: { label: string; items: NotificationView[] }[] = [];
    for (const n of list) {
      const r = relativeDay(n.createdAt);
      const label = r === 'Today' || r === 'Yesterday' ? r : 'Earlier';
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(n);
      else out.push({ label, items: [n] });
    }
    return out;
  }, [list]);

  return (
    <Screen gap={14}>
      <AppBar title="Notifications" action={{ icon: 'settings', label: 'Notification settings', onPress: () => router.push('/settings/preferences') }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -24 }}>
        <View style={{ width: 16 }} />
        <Chip label={`All · ${feed.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Payments" selected={filter === 'payments'} onPress={() => setFilter('payments')} />
        <Chip label="Orders" selected={filter === 'orders'} onPress={() => setFilter('orders')} />
        <Chip label="Schedule" selected={filter === 'schedule'} onPress={() => setFilter('schedule')} />
        <View style={{ width: 16 }} />
      </ScrollView>
      {groups.length === 0 ? (
        <EmptyState icon="bell" title="You’re all caught up" body="Payments, overdue balances, orders due and today’s appointments show up here." />
      ) : (
        groups.map((g) => (
          <View key={g.label} style={{ gap: 14 }}>
            <GroupLabel label={g.label} />
            {g.items.map((n) => {
              const unread = !n.readAt;
              return (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${unread ? 'Unread. ' : ''}${n.title}. ${n.body}`}
                  disabled={!n.href}
                  onPress={() => n.href && router.push(n.href as never)}
                  style={[styles.card, unread ? { backgroundColor: colors.surface } : null]}
                >
                  <IconTile icon={n.icon} bg={n.tileBg} color={n.tileFg} size={36} iconSize={18} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt variant="bodyMedium">{n.title}</Txt>
                    <Txt variant="caption" color="textSecondary">
                      {n.body}
                    </Txt>
                    <Txt variant="caption" color="textTertiary">
                      {relativeDay(n.createdAt) === 'Today' ? fmtTime(n.createdAt) : fmtDay(n.createdAt)}
                    </Txt>
                  </View>
                  {unread ? <View style={styles.dot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
