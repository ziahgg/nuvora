import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MeterBar, LegendItem, PairBars, SplitBar } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Icon, type IconName } from '@/components/Icon';
import { AppBar, Card, KeyValue, ListCard, Screen, SectionHeader } from '@/components/Layout';
import { CustomerRow, IconTile } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { DateRangeSheet } from '@/features/DateRangeSheet';
import { rangeLabel } from '@/features/period';
import { ProfitCard } from '@/features/ProfitCard';
import { fmtDay } from '@/lib/dates';
import { addDays, monthToDate, outstanding, periodMetrics, previousComparable, type DateRange } from '@/lib/finance';
import { formatMoney, formatMoneyShort, formatPercentChange } from '@/lib/money';
import { bestDay, customerInsights, lapsedCustomers, ordersByService, statusSplit, turnaround, weeklyBreakdown } from '@/lib/reports';
import { expenseLabel } from '@/state/options';
import { orderNo, orderViews } from '@/state/selectors';
import { usePermissions, useWorkspace, useWorkspaceQuery } from '@/state/session';
import { colors, type ColorToken } from '@/theme/tokens';

type Tab = 'overview' | 'money' | 'orders' | 'customers';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'money', label: 'Money' },
  { value: 'orders', label: 'Orders' },
  { value: 'customers', label: 'Customers' },
];

/** Reports / 36 Business Performance, 37 Revenue vs Expenses, 38 Order Performance, 39 Customer Insights, 40 Date range. */
export default function Reports() {
  const router = useRouter();
  const ws = useWorkspace();
  const { finance } = usePermissions();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const [tab, setTab] = useState<Tab>('overview');
  const [range, setRange] = useState<DateRange>(() => monthToDate());
  const [compare, setCompare] = useState(true);
  const [sheet, setSheet] = useState(false);
  const cur = ws.business.currency;
  const prev = previousComparable(range);

  const r = useMemo(() => {
    const m = periodMetrics(ws, range);
    const p = periodMetrics(ws, prev);
    return { m, p };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, range]);

  if (!finance) {
    return (
      <Screen>
        <AppBar title="Reports" />
        <EmptyState icon="lock" title="Not available for your role" body="Reports are available to owners and managers." />
      </Screen>
    );
  }

  const delta = (cur_: number, prev_: number, inverse = false): { text: string; color: ColorToken; icon: IconName } | null => {
    if (!compare) return null;
    const pct = formatPercentChange(cur_, prev_);
    if (!pct) return null;
    const up = cur_ >= prev_;
    return { text: pct, color: up !== inverse ? 'successText' : 'warningText', icon: up ? 'trending-up' : 'trending-down' };
  };

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <AppBar title="Reports" />
      <View style={styles.filters}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change date range" onPress={() => setSheet(true)} style={styles.filter}>
          <Icon name="calendar" size={16} color="textSecondary" />
          <Txt variant="label">{rangeLabel(range, false)}</Txt>
          <Icon name="chevron-down" size={16} color="textSecondary" />
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: compare }} onPress={() => setCompare((c) => !c)} style={[styles.filter, compare ? null : { opacity: 0.6 }]}>
          <Txt variant="label" color="textSecondary">
            {compare ? `vs ${rangeLabel(prev, false)}` : 'No comparison'}
          </Txt>
        </Pressable>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable key={t.value} accessibilityRole="tab" accessibilityState={{ selected: tab === t.value }} onPress={() => setTab(t.value)} style={{ gap: 6 }}>
            <Txt variant="label" weight={tab === t.value ? 'semibold' : 'medium'} color={tab === t.value ? 'primary' : 'textSecondary'}>
              {t.label}
            </Txt>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: tab === t.value ? colors.primary : 'transparent' }} />
          </Pressable>
        ))}
      </View>

      {tab === 'overview' ? <Overview ws={ws} range={range} m={r.m} p={r.p} cur={cur} compare={compare} delta={delta} /> : null}
      {tab === 'money' ? <Money ws={ws} range={range} cur={cur} /> : null}
      {tab === 'orders' ? <OrdersTab ws={ws} range={range} /> : null}
      {tab === 'customers' ? <CustomersTab ws={ws} range={range} cur={cur} onOpen={(href) => router.push(href as never)} /> : null}

      <DateRangeSheet
        visible={sheet}
        value={range}
        compare={compare}
        onApply={(nr, c) => {
          setRange(nr);
          setCompare(c);
          setSheet(false);
        }}
        onClose={() => setSheet(false)}
      />
    </Screen>
  );
}

type Ws = ReturnType<typeof useWorkspace>;
type Delta = (c: number, p: number, inverse?: boolean) => { text: string; color: ColorToken; icon: IconName } | null;

function Overview({ ws, range, m, p, cur, compare, delta }: { ws: Ws; range: DateRange; m: ReturnType<typeof periodMetrics>; p: ReturnType<typeof periodMetrics>; cur: string; compare: boolean; delta: Delta }) {
  const best = bestDay(ws, range);
  const top = ordersByService(ws, range)[0];
  const insights = customerInsights(ws, range);
  const expenses = ws.expenses.filter((e) => new Date(e.spentAt) >= range.start && new Date(e.spentAt) < range.end);
  const biggest = [...expenses].sort((a, b) => b.amountCents - a.amountCents)[0];
  const profitChange = formatPercentChange(m.profitCents, p.profitCents);
  return (
    <>
      <ProfitCard
        label={`Profit · ${rangeLabel(range, false)}`}
        metrics={m}
        currency={cur}
        note={
          compare && profitChange
            ? `${profitChange} vs ${formatMoney(p.profitCents, cur)} the previous period`
            : `${formatMoney(m.revenueCents, cur)} revenue − ${formatMoney(m.expensesCents, cur)} expenses`
        }
      />
      <View style={styles.grid}>
        <Kpi label="Revenue recorded" value={formatMoney(m.revenueCents, cur)} d={delta(m.revenueCents, p.revenueCents)} vs={formatMoney(p.revenueCents, cur, { decimals: false })} />
        <Kpi label="Expenses" value={formatMoney(m.expensesCents, cur)} d={delta(m.expensesCents, p.expensesCents, true)} vs={formatMoney(p.expensesCents, cur, { decimals: false })} />
        <Kpi label="Orders" value={String(m.orderCount)} d={delta(m.orderCount, p.orderCount)} vs={String(p.orderCount)} />
        <Kpi label="Average order" value={formatMoney(m.averageOrderCents, cur)} d={delta(m.averageOrderCents, p.averageOrderCents)} vs={formatMoney(p.averageOrderCents, cur)} />
      </View>
      <SectionHeader title="Highlights" />
      <ListCard verticalPadding={4}>
        <Highlight icon="sparkles" title={best ? `Best day: ${fmtDay(best.date)}` : 'No orders yet'} caption={best ? `${formatMoney(best.cents, cur)} revenue recorded` : 'Highlights appear once orders come in'} />
        {top ? <Highlight icon="shirt" title={`Top service: ${top.name}`} caption={`${Math.round(top.share * 100)}% of orders · ${top.orders} of ${m.orderCount}`} /> : null}
        <Highlight
          icon="users"
          title={`${insights.newCount} new ${insights.newCount === 1 ? 'customer' : 'customers'}`}
          caption={`${insights.total} total${insights.repeatRate !== null ? ` · ${insights.repeatRate}% ordered more than once` : ''}`}
        />
      </ListCard>
      {biggest ? (
        <Txt variant="caption" color="textSecondary">
          Largest expense this period: {biggest.description} ({formatMoney(biggest.amountCents, cur)}, {expenseLabel(biggest.category).toLowerCase()}), recorded on {fmtDay(biggest.spentAt)}.
        </Txt>
      ) : null}
    </>
  );
}

function Money({ ws, range, cur }: { ws: Ws; range: DateRange; cur: string }) {
  const weeks = weeklyBreakdown(ws, range);
  const total = periodMetrics(ws, range);
  const out = outstanding(ws.orders, ws.payments);
  const wk = (w: (typeof weeks)[number]) => {
    const last = addDays(w.end, -1);
    return w.start.getTime() === last.getTime() ? fmtDay(w.start).slice(4) : `${w.start.getDate()}–${last.getDate()}${w.start.getMonth() === last.getMonth() ? '' : ' ' + last.toLocaleDateString('en-GB', { month: 'short' })}`;
  };
  return (
    <>
      <Card style={{ gap: 12 }}>
        <Txt variant="label" color="textSecondary">
          Revenue vs expenses · by week
        </Txt>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <LegendItem color="primary" label="Revenue recorded" />
          <LegendItem color="accent" label="Expenses" />
        </View>
        <PairBars bars={weeks.map((w) => ({ key: w.start.toISOString(), label: wk(w), a: w.revenueCents, b: w.expensesCents }))} maxLabel={(v) => formatMoneyShort(v, cur)} />
      </Card>
      <ListCard verticalPadding={4}>
        <View style={styles.row}>
          {['Week', 'Revenue', 'Expenses', 'Profit'].map((h, i) => (
            <Txt key={h} variant="caption" color="textTertiary" style={[styles.col, i === 0 ? styles.first : styles.num]}>
              {h}
            </Txt>
          ))}
        </View>
        {weeks.map((w) => (
          <View key={w.start.toISOString()} style={styles.row}>
            <Txt variant="body" size={14} style={[styles.col, styles.first]}>
              {wk(w)}
              {w.partial ? ' (so far)' : ''}
            </Txt>
            <Txt variant="body" size={14} style={[styles.col, styles.num]}>
              {formatMoney(w.revenueCents, cur, { decimals: false })}
            </Txt>
            <Txt variant="body" size={14} style={[styles.col, styles.num]}>
              {formatMoney(w.expensesCents, cur, { decimals: false })}
            </Txt>
            <Txt variant="figure" size={14} color={w.profitCents >= 0 ? 'successText' : 'errorText'} style={[styles.col, styles.num]}>
              {formatMoney(w.profitCents, cur, { decimals: false })}
            </Txt>
          </View>
        ))}
        <View style={styles.row}>
          <Txt variant="figure" size={14} style={[styles.col, styles.first]}>
            Total
          </Txt>
          {[total.revenueCents, total.expensesCents, total.profitCents].map((c, i) => (
            <Txt key={i} variant="figure" size={14} style={[styles.col, styles.num]}>
              {formatMoney(c, cur, { decimals: false })}
            </Txt>
          ))}
        </View>
      </ListCard>
      <Txt variant="caption" color="textSecondary">
        Profit = revenue recorded − expenses. It doesn’t subtract unpaid balances ({formatMoney(out.totalCents, cur)} outstanding).
      </Txt>
    </>
  );
}

function OrdersTab({ ws, range }: { ws: Ws; range: DateRange }) {
  const split = statusSplit(ws, range);
  const services = ordersByService(ws, range);
  const ta = turnaround(ws, range);
  const pct = (n: number) => (split.total ? `${Math.round((n / split.total) * 1000) / 10}%` : '0%');
  return (
    <>
      <Card style={{ gap: 10 }}>
        <Txt variant="label" color="textSecondary">
          {split.total} orders · {rangeLabel(range, false)}
        </Txt>
        <SplitBar
          height={12}
          parts={[
            { value: split.completed, color: 'success' },
            { value: split.inProgress, color: 'primary' },
            { value: split.cancelled, color: 'textTertiary' },
          ]}
        />
        {(
          [
            ['Completed', split.completed, 'success'],
            ['In progress', split.inProgress, 'primary'],
            ['Cancelled', split.cancelled, 'textTertiary'],
          ] as [string, number, ColorToken][]
        ).map(([l, n, c]) => (
          <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <LegendItem round color={c} label={l} />
            <Txt variant="figure">
              {n} · {pct(n)}
            </Txt>
          </View>
        ))}
      </Card>
      <SectionHeader title="Orders by service" />
      {services.length === 0 ? (
        <Txt variant="caption" color="textSecondary">
          No orders in this period.
        </Txt>
      ) : (
        <Card style={{ gap: 16 }}>
          {services.map((s) => (
            <View key={s.name} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="bodyMedium">{s.name}</Txt>
                <Txt variant="figure">{s.orders} orders</Txt>
              </View>
              <MeterBar value={s.share} />
              <Txt variant="caption" color="textSecondary">
                {Math.round(s.share * 100)}% of orders
              </Txt>
            </View>
          ))}
        </Card>
      )}
      <ListCard verticalPadding={4}>
        <KeyValue label="Average turnaround" value={ta.averageDays === null ? '—' : `${ta.averageDays} days`} />
        <KeyValue label="Completed on time" value={ta.completed ? `${ta.onTime} of ${ta.completed} · ${Math.round((ta.onTime / ta.completed) * 1000) / 10}%` : '—'} />
      </ListCard>
    </>
  );
}

function CustomersTab({ ws, range, cur, onOpen }: { ws: Ws; range: DateRange; cur: string; onOpen: (href: string) => void }) {
  const ins = customerInsights(ws, range);
  const lapsed = lapsedCustomers(ws);
  const overdue = orderViews(ws).filter((v) => v.money.overdue);
  const max = ins.top[0]?.cents ?? 1;
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, gap: 4, padding: 14 }}>
          <Txt variant="caption" color="textSecondary">
            Customers
          </Txt>
          <Txt variant="kpi">{ins.total}</Txt>
          <Txt variant="caption" color="textSecondary">
            {ins.newCount} new this period
          </Txt>
        </Card>
        <Card style={{ flex: 1, gap: 4, padding: 14 }}>
          <Txt variant="caption" color="textSecondary">
            Repeat rate
          </Txt>
          <Txt variant="kpi">{ins.repeatRate === null ? '—' : `${ins.repeatRate}%`}</Txt>
          <Txt variant="caption" color="textSecondary">
            {ins.repeatCount} ordered 2+ times
          </Txt>
        </Card>
      </View>
      <SectionHeader title="Top customers · order value" />
      {ins.top.length === 0 ? (
        <Txt variant="caption" color="textSecondary">
          No orders in this period.
        </Txt>
      ) : (
        <Card style={{ gap: 16 }}>
          {ins.top.map((t) => (
            <Pressable key={t.customer.id} accessibilityRole="button" onPress={() => onOpen(`/customer/${t.customer.id}`)} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="bodyMedium">{t.customer.fullName}</Txt>
                <Txt variant="figure">{formatMoney(t.cents, cur)}</Txt>
              </View>
              <MeterBar value={t.cents / max} color="accent" />
              <Txt variant="caption" color="textSecondary">
                {t.orders} {t.orders === 1 ? 'order' : 'orders'}
                {t.balanceCents ? ` · ${formatMoney(t.balanceCents, cur)} unpaid` : ''}
              </Txt>
            </Pressable>
          ))}
        </Card>
      )}
      <SectionHeader title="Needs attention" />
      {overdue.length === 0 && lapsed.length === 0 ? (
        <Txt variant="caption" color="textSecondary">
          Nothing needs attention right now.
        </Txt>
      ) : (
        <ListCard>
          {[
            ...overdue.map((v) => (
              <CustomerRow
                key={v.order.id}
                name={v.customerName}
                subtitle={`Overdue · ${orderNo(v.order)}`}
                amount={formatMoney(v.money.balanceCents, cur)}
                status="Send reminder"
                statusColor="primary"
                onPress={() => onOpen('/outstanding')}
              />
            )),
            ...lapsed.map((l) => (
              <CustomerRow
                key={l.customer.id}
                name={l.customer.fullName}
                subtitle={`No order in ${l.daysSince} days · usually every ${l.usualDays}`}
                status="View profile"
                statusColor="primary"
                onPress={() => onOpen(`/customer/${l.customer.id}`)}
              />
            )),
          ]}
        </ListCard>
      )}
    </>
  );
}

function Kpi({ label, value, d, vs }: { label: string; value: string; d: ReturnType<Delta>; vs: string }) {
  return (
    <View style={styles.kpi}>
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
      <Txt variant="figure" size={18}>
        {value}
      </Txt>
      {d ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name={d.icon} size={14} color={d.color === 'successText' ? 'success' : 'warning'} />
          <Txt variant="caption" color={d.color}>
            {d.text} vs {vs}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

function Highlight({ icon, title, caption }: { icon: IconName; title: string; caption: string }) {
  return (
    <View style={styles.highlight}>
      <IconTile icon={icon} bg="primary50" color="primary" size={36} iconSize={18} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyMedium">{title}</Txt>
        <Txt variant="caption" color="textSecondary">
          {caption}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8 },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabs: { flexDirection: 'row', gap: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '48.5%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 24, padding: 14, gap: 4 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  col: { flex: 1 },
  first: { flex: 1.3 },
  num: { textAlign: 'right' },
});
