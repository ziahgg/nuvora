import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { ChipGroup } from '@/components/Badges';
import { Button } from '@/components/Button';
import { LegendItem, SplitBar } from '@/components/Charts';
import { EmptyState, useToast } from '@/components/Feedback';
import { AppBar, Card, Divider, Screen } from '@/components/Layout';
import { OrderRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { differenceInCalendarDays, fmtDay, relativeDayLower } from '@/lib/dates';
import { outstanding } from '@/lib/finance';
import { formatMoney, sumCents } from '@/lib/money';
import { orderNo, orderViews } from '@/state/selectors';
import { usePermissions, useWorkspace, useWorkspaceQuery } from '@/state/session';
import { colors } from '@/theme/tokens';

type Sort = 'oldest' | 'highest' | 'customer';

/** Finance / 29 Outstanding Payments. */
export default function Outstanding() {
  const router = useRouter();
  const ws = useWorkspace();
  const toast = useToast();
  const { finance } = usePermissions();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const [sort, setSort] = useState<Sort>('oldest');
  const now = new Date();
  const cur = ws.business.currency;

  const { out, rows } = useMemo(() => {
    const o = outstanding(ws.orders, ws.payments, now);
    const views = orderViews(ws, now).filter((v) => o.orders.some((x) => x.order.id === v.order.id));
    return { out: o, rows: views };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws]);

  const sorted = [...rows].sort((a, b) =>
    sort === 'oldest'
      ? a.order.dueAt.localeCompare(b.order.dueAt)
      : sort === 'highest'
        ? b.money.balanceCents - a.money.balanceCents
        : a.customerName.localeCompare(b.customerName),
  );
  const dueSoon = rows.filter((v) => !v.money.overdue && differenceInCalendarDays(new Date(v.order.dueAt), now) <= 1);
  const later = rows.filter((v) => !v.money.overdue && differenceInCalendarDays(new Date(v.order.dueAt), now) > 1);
  const soonC = sumCents(dueSoon.map((v) => v.money.balanceCents));
  const laterC = sumCents(later.map((v) => v.money.balanceCents));

  function remind(v: (typeof rows)[number]) {
    const customer = ws.customers.find((c) => c.id === v.order.customerId);
    if (!customer?.phone) return toast('No phone number saved for this customer.', { kind: 'info' });
    const body = `Hi ${customer.fullName.split(' ')[0]}, a friendly reminder from ${ws.business.name}: ${formatMoney(v.money.balanceCents, cur)} is due on order ${orderNo(v.order)}. Thank you!`;
    const phone = customer.phone.replace(/[^\d+]/g, '');
    Linking.openURL(`sms:${phone}?body=${encodeURIComponent(body)}`).catch(() => toast('Couldn’t open Messages on this device.', { kind: 'error' }));
  }

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <AppBar title="Outstanding" />
      {rows.length === 0 ? (
        <EmptyState icon="circle-check" title="Everyone’s paid up" body="Orders with a balance due will show here, oldest first." />
      ) : (
        <>
          <Card style={{ gap: 4 }}>
            <Txt variant="caption" color="textSecondary">
              Total unpaid
            </Txt>
            <Txt variant="kpiLarge" color="errorText">
              {formatMoney(out.totalCents, cur)}
            </Txt>
            <Txt variant="caption" color="textSecondary">
              {rows.length} {rows.length === 1 ? 'order' : 'orders'} · {out.overdueCount} overdue
            </Txt>
            <View style={{ paddingTop: 8 }}>
              <SplitBar
                parts={[
                  { value: out.overdueCents, color: 'error' },
                  { value: soonC, color: 'warning' },
                  { value: laterC, color: 'accent' },
                ]}
              />
            </View>
            <View style={styles.legend}>
              <LegendItem round color="error" label={`Overdue ${formatMoney(out.overdueCents, cur, { decimals: false })}`} />
              <LegendItem round color="warning" label={`Due by tomorrow ${formatMoney(soonC, cur, { decimals: false })}`} />
              <LegendItem round color="accent" label={`Due later ${formatMoney(laterC, cur, { decimals: false })}`} />
            </View>
          </Card>
          <ChipGroup
            options={[
              { value: 'oldest', label: 'Oldest first' },
              { value: 'highest', label: 'Highest amount' },
              { value: 'customer', label: 'By customer' },
            ]}
            value={sort}
            onChange={setSort}
          />
          {sorted.map((v) => {
            const days = differenceInCalendarDays(now, new Date(v.order.dueAt));
            const when = v.money.overdue
              ? `Overdue ${days} ${days === 1 ? 'day' : 'days'} · due ${fmtDay(v.order.dueAt)}`
              : `Due ${relativeDayLower(v.order.dueAt, now)}${v.money.paidCents ? ` · ${formatMoney(v.money.paidCents, cur, { decimals: false })} of ${formatMoney(v.order.totalCents, cur, { decimals: false })} paid` : ''}`;
            return (
              <View key={v.order.id} style={[styles.card, v.money.overdue ? styles.cardOverdue : null]}>
                <OrderRow
                  title={v.customerName}
                  subtitle={`${orderNo(v.order)} · ${when}`}
                  amount={formatMoney(v.money.balanceCents, cur)}
                  status={v.money.overdue ? 'overdue' : v.money.paymentStatus}
                  onPress={() => router.push(`/order/${v.order.id}`)}
                />
                <Divider />
                <View style={styles.actions}>
                  <Button label="Send reminder" variant="outline" size="small" style={{ flex: 1 }} onPress={() => remind(v)} />
                  {finance ? (
                    <Button label="Record payment" variant="secondary" size="small" style={{ flex: 1 }} onPress={() => router.push(`/payment/new?orderId=${v.order.id}`)} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 4 },
  cardOverdue: { borderWidth: 1, borderColor: colors.error, borderRadius: 16 },
  actions: { flexDirection: 'row', gap: 8, paddingVertical: 10 },
});
