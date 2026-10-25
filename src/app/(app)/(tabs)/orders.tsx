import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Feedback';
import { SearchField } from '@/components/Fields';
import { GroupLabel, ListCard, PageHeader, Screen } from '@/components/Layout';
import { OrderRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import type { OrderStatus } from '@/data/types';
import { differenceInCalendarDays, fmtDay } from '@/lib/dates';
import { monthToDate, inRange } from '@/lib/finance';
import { formatMoney, sumCents } from '@/lib/money';
import { orderViews, type OrderView } from '@/state/selectors';
import { useWorkspace, useWorkspaceQuery } from '@/state/session';
import { colors } from '@/theme/tokens';

type Filter = 'all' | OrderStatus;
const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const PAGE = 40;

function createdBucket(iso: string, now: Date): string {
  const diff = differenceInCalendarDays(now, new Date(iso));
  if (diff === 0) return `Today · ${fmtDay(iso)}`;
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'Earlier this week';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function dueBucket(iso: string, now: Date): string {
  const diff = differenceInCalendarDays(new Date(iso), now);
  if (diff < 0) return 'Past due';
  if (diff <= 1) return 'Due today & tomorrow';
  return `Due ${fmtDay(iso)}`;
}

/** Orders / 18 Order List (+ 18b In Progress, Empty / Orders, Loading skeleton via root). */
export default function Orders() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: Filter }>();
  const ws = useWorkspace();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const [filter, setFilter] = useState<Filter>(params.status ?? 'all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const now = new Date();
  const cur = ws.business.currency;

  const views = useMemo(() => orderViews(ws), [ws]);
  const counts = useMemo(
    () => ({
      all: views.length,
      in_progress: views.filter((v) => v.order.status === 'in_progress').length,
      completed: views.filter((v) => v.order.status === 'completed').length,
      cancelled: views.filter((v) => v.order.status === 'cancelled').length,
    }),
    [views],
  );

  const q = query.trim().toLowerCase().replace(/^#?nv-?/, '');
  const filtered = views
    .filter((v) => filter === 'all' || v.order.status === filter)
    .filter((v) => !q || v.customerName.toLowerCase().includes(q) || String(v.order.number).includes(q));
  const sorted =
    filter === 'in_progress' ? [...filtered].sort((a, b) => a.order.dueAt.localeCompare(b.order.dueAt)) : filtered;
  const shown = sorted.slice(0, limit);

  const groups: { label: string; items: OrderView[] }[] = [];
  for (const v of shown) {
    const label = filter === 'in_progress' ? dueBucket(v.order.dueAt, now) : createdBucket(v.order.createdAt, now);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(v);
    else groups.push({ label, items: [v] });
  }

  const mtd = views.filter((v) => v.order.status !== 'cancelled' && inRange(v.order.createdAt, monthToDate(now)));
  const summary =
    filter === 'in_progress'
      ? `${filtered.length} orders in progress · ${formatMoney(sumCents(filtered.map((v) => v.order.totalCents)), cur)} total · ${formatMoney(sumCents(filtered.map((v) => v.money.balanceCents)), cur)} still unpaid`
      : `${now.toLocaleDateString('en-US', { month: 'long' })} · ${mtd.length} orders · ${formatMoney(sumCents(mtd.map((v) => v.order.totalCents)), cur)} recorded`;

  return (
    <Screen withTabBar gap={14} onRefresh={() => void refetch()} refreshing={isRefetching}>
      <PageHeader title="Orders" action={{ icon: 'plus', label: 'New order', onPress: () => router.push('/order/new') }} />
      {views.length === 0 ? (
        <EmptyState
          icon="clipboard-list"
          title="No orders yet"
          body="Create an order when a customer drops off. You’ll see its status, due date and payment here."
          action={{ label: 'Create first order', onPress: () => router.push('/order/new') }}
        />
      ) : (
        <>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search order # or customer" />
          <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((t) => {
              const active = filter === t.value;
              return (
                <Pressable
                  key={t.value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setFilter(t.value);
                    setLimit(PAGE);
                  }}
                  style={[styles.tab, active ? { backgroundColor: colors.ink } : null]}
                >
                  <Txt variant="label" weight={active ? 'semibold' : 'medium'} color={active ? 'onPrimary' : 'textSecondary'} numberOfLines={1}>
                    {t.label}
                  </Txt>
                  <Txt variant="caption" color={active ? 'accent' : 'textTertiary'}>
                    {counts[t.value]}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <Txt variant="caption" color="textSecondary">
            {summary}
          </Txt>
          {shown.length === 0 ? (
            <EmptyState
              icon="search"
              title={q ? `No matches for “${query.trim()}”` : 'Nothing here'}
              body={q ? 'Check the spelling, or search by order number instead.' : 'Orders with this status will appear here.'}
            />
          ) : (
            groups.map((g) => (
              <View key={g.label} style={{ gap: 14 }}>
                <GroupLabel label={g.label} />
                <ListCard>
                  {g.items.map((v) => (
                    <OrderRow
                      key={v.order.id}
                      title={v.customerName}
                      subtitle={v.summary}
                      amount={formatMoney(v.order.totalCents, cur)}
                      status={v.badge}
                      onPress={() => router.push(`/order/${v.order.id}`)}
                    />
                  ))}
                </ListCard>
              </View>
            ))
          )}
          {sorted.length > limit ? (
            <Button label={`Show more (${sorted.length - limit})`} variant="outline" onPress={() => setLimit((l) => l + PAGE)} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4, borderRadius: 999 },
});
