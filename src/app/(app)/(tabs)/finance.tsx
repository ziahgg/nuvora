import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, EmptyState } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { ListCard, Note, PageHeader, Screen, SectionHeader } from '@/components/Layout';
import { TransactionRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { periodRange, PeriodRow, rangeLabel, type PeriodKey } from '@/features/period';
import { ProfitCard } from '@/features/ProfitCard';
import { inRange, outstanding, periodMetrics } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { METHOD_LABEL, transactions } from '@/state/selectors';
import { useWorkspace, useWorkspaceQuery } from '@/state/session';
import { colors, type ColorToken } from '@/theme/tokens';

/** Finance / 24 Finance Overview (+ Empty / Transactions). */
export default function Finance() {
  const router = useRouter();
  const ws = useWorkspace();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [createOpen, setCreateOpen] = useState(false);
  const cur = ws.business.currency;
  const range = periodRange(period);

  const { m, out, txns } = useMemo(() => {
    const all = transactions(ws);
    return {
      m: periodMetrics(ws, range),
      out: outstanding(ws.orders, ws.payments),
      txns: all.filter((t) => inRange(t.at, range)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, period]);

  const ordersInPeriod = ws.orders.filter((o) => o.status !== 'cancelled' && inRange(o.createdAt, range)).length;

  return (
    <Screen withTabBar onRefresh={() => void refetch()} refreshing={isRefetching}>
      <PageHeader title="Finance" action={{ icon: 'plus', label: 'Record payment or expense', onPress: () => setCreateOpen(true) }} />
      <PeriodRow value={period} onChange={setPeriod} />
      <ProfitCard
        label={`Profit · ${rangeLabel(range, false)}`}
        metrics={m}
        currency={cur}
        note={`${formatMoney(m.revenueCents, cur)} revenue − ${formatMoney(m.expensesCents, cur)} expenses`}
      />
      <View style={styles.grid}>
        <MetricTile label="Revenue recorded" value={formatMoney(m.revenueCents, cur)} note={`Value of ${ordersInPeriod} orders created`} onPress={() => router.push('/reports')} />
        <MetricTile label="Money received" value={formatMoney(m.receivedCents, cur)} color="successText" note="Payments actually collected" onPress={() => router.push('/transactions?filter=in')} />
        <MetricTile label="Expenses" value={formatMoney(m.expensesCents, cur)} note="Costs recorded this period" onPress={() => router.push('/transactions?filter=out')} />
        <MetricTile
          label="Outstanding"
          value={formatMoney(out.totalCents, cur)}
          color={out.totalCents > 0 ? 'errorText' : 'text'}
          note={`Unpaid balance · ${out.orders.length} ${out.orders.length === 1 ? 'order' : 'orders'}`}
          onPress={() => router.push('/outstanding')}
        />
      </View>
      <Note text="Revenue counts orders when they’re created. Money received counts payments when they’re collected. Profit = revenue − expenses." />

      {txns.length === 0 ? (
        <>
          <EmptyState
            icon="wallet"
            title="No transactions this period"
            body="Payments you record and expenses you add will appear here, so you always know where money went."
            action={{ label: 'Record a payment', onPress: () => router.push('/outstanding') }}
          />
          <Note icon="sparkles" text="Revenue is recorded when you create an order. Record a payment when the customer pays." />
        </>
      ) : (
        <>
          <SectionHeader title="Recent transactions" link={{ label: 'See all', onPress: () => router.push('/transactions') }} />
          <ListCard>
            {txns.slice(0, 4).map((t) => (
              <TransactionRow
                key={t.id}
                kind={t.kind}
                title={t.title}
                subtitle={t.subtitle}
                amount={`${t.kind === 'income' ? '+' : '−'}${formatMoney(t.cents, cur)}`}
                method={METHOD_LABEL[t.method]}
                onPress={() => router.push(t.href as never)}
              />
            ))}
          </ListCard>
        </>
      )}

      <BottomSheet visible={createOpen} onClose={() => setCreateOpen(false)} title="Add to finance">
        {[
          { icon: 'banknote' as const, label: 'Record payment', caption: 'Choose an unpaid order', href: '/outstanding' },
          { icon: 'receipt' as const, label: 'Add expense', caption: 'Supplies, rent, wages…', href: '/expense/new' },
        ].map((a) => (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            onPress={() => {
              setCreateOpen(false);
              router.push(a.href as never);
            }}
            style={styles.action}
          >
            <View style={styles.actionIcon}>
              <Icon name={a.icon} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyMedium">{a.label}</Txt>
              <Txt variant="caption" color="textSecondary">
                {a.caption}
              </Txt>
            </View>
            <Icon name="chevron-right" size={18} color="textTertiary" />
          </Pressable>
        ))}
      </BottomSheet>
    </Screen>
  );
}

function MetricTile({ label, value, note, color = 'text', onPress }: { label: string; value: string; note: string; color?: ColorToken; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.tile}>
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
      <Txt variant="figure" size={18} color={color}>
        {value}
      </Txt>
      <Txt variant="caption" color="textTertiary">
        {note}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.5%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 24, padding: 14, gap: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
});
