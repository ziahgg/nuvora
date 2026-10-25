import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/Feedback';
import { AppBar, Card, Screen } from '@/components/Layout';
import { IconTile } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { fmtTime } from '@/lib/dates';
import { periodMetrics, todayRange } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { todaysActivity } from '@/state/selectors';
import { useWorkspace, useWorkspaceQuery } from '@/state/session';
import { colors } from '@/theme/tokens';

/** Home / Today's Activity */
export default function Activity() {
  const router = useRouter();
  const ws = useWorkspace();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const cur = ws.business.currency;
  const items = useMemo(() => todaysActivity(ws), [ws]);
  const m = periodMetrics(ws, todayRange());

  return (
    <Screen gap={14} onRefresh={() => void refetch()} refreshing={isRefetching}>
      <AppBar title="Today’s activity" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Summary label="Orders" value={`${m.orderCount} new`} />
        <Summary label="Payments" value={formatMoney(m.receivedCents, cur)} />
        <Summary label="Expenses" value={formatMoney(m.expensesCents, cur)} />
      </View>
      {items.length === 0 ? (
        <EmptyState icon="inbox" title="Nothing yet today" body="New orders, payments and completed orders will show up here as they happen." />
      ) : (
        <Card style={{ paddingVertical: 8 }}>
          {items.map((a) => (
            <Pressable key={a.id} accessibilityRole="button" onPress={() => router.push(a.href as never)} style={styles.row}>
              <Txt variant="caption" color="textTertiary" style={{ width: 36 }}>
                {fmtTime(a.at)}
              </Txt>
              <IconTile icon={a.icon} bg={a.tileBg} color={a.tileFg} size={32} iconSize={16} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="bodyMedium">{a.title}</Txt>
                <Txt variant="caption" color="textSecondary" numberOfLines={1}>
                  {a.subtitle}
                </Txt>
              </View>
            </Pressable>
          ))}
        </Card>
      )}
      <Txt variant="caption" color="textSecondary">
        Revenue recorded today: {formatMoney(m.revenueCents, cur)} ({m.orderCount} {m.orderCount === 1 ? 'order' : 'orders'}). Money received today:{' '}
        {formatMoney(m.receivedCents, cur)} ({m.paymentCount} {m.paymentCount === 1 ? 'payment' : 'payments'}).
      </Txt>
    </Screen>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summary}>
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
      <Txt variant="figure">{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
