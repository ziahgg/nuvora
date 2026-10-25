import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, ChipGroup } from '@/components/Badges';
import { Button } from '@/components/Button';
import { BottomSheet, EmptyState, OptionSheet } from '@/components/Feedback';
import { SearchField, SelectField } from '@/components/Fields';
import { ListCard, Note, PageHeader, Screen } from '@/components/Layout';
import { CustomerRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { differenceInCalendarDays, fmtShort, relativeDayLower } from '@/lib/dates';
import { customerTotals } from '@/lib/finance';
import { formatMoney, sumCents } from '@/lib/money';
import { useWorkspace, useWorkspaceQuery } from '@/state/session';

type Quick = 'all' | 'owes' | 'regulars' | 'new';
type Balance = 'all' | 'owes' | 'paid';
type Visit = 'any' | 'week' | 'lapsed';
type Sort = 'recent' | 'name' | 'balance';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Recent visit' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'balance', label: 'Balance owed' },
];

/** Customers / 13 list, 14 search & filter results, 14b filter sheet, Empty / Customers. */
export default function Customers() {
  const router = useRouter();
  const ws = useWorkspace();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState<Quick>('all');
  const [balance, setBalance] = useState<Balance>('all');
  const [visit, setVisit] = useState<Visit>('any');
  const [sort, setSort] = useState<Sort>('recent');
  const [sheet, setSheet] = useState<'filters' | 'sort' | null>(null);
  const now = new Date();
  const cur = ws.business.currency;

  const rows = useMemo(
    () =>
      ws.customers.map((c) => {
        const t = customerTotals(c.id, ws.orders, ws.payments, now);
        const last = ws.orders.filter((o) => o.customerId === c.id).reduce<string | null>((m, o) => (!m || o.createdAt > m ? o.createdAt : m), null);
        return { c, t, last };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ws],
  );

  const isRegular = (r: (typeof rows)[number]) => r.t.orderCount >= 5;
  const isNew = (r: (typeof rows)[number]) => differenceInCalendarDays(now, new Date(r.c.createdAt)) <= 30;
  const owing = rows.filter((r) => r.t.balanceCents > 0);

  const apply = (base: typeof rows, b: Balance, v: Visit) =>
    base
      .filter((r) => b === 'all' || (b === 'owes' ? r.t.balanceCents > 0 : r.t.balanceCents === 0))
      .filter((r) => {
        if (v === 'any') return true;
        const days = r.last ? differenceInCalendarDays(now, new Date(r.last)) : Infinity;
        return v === 'week' ? days <= 7 : days >= 30;
      });

  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const searched = rows.filter(
    (r) =>
      !q ||
      r.c.fullName.toLowerCase().includes(q) ||
      r.c.email.toLowerCase().includes(q) ||
      (qDigits.length >= 3 && r.c.phone.replace(/\D/g, '').includes(qDigits)),
  );
  const quickFiltered = searched.filter((r) =>
    quick === 'all' ? true : quick === 'owes' ? r.t.balanceCents > 0 : quick === 'regulars' ? isRegular(r) : isNew(r),
  );
  const list = apply(quickFiltered, balance, visit).sort((a, b) =>
    sort === 'name'
      ? a.c.fullName.localeCompare(b.c.fullName)
      : sort === 'balance'
        ? b.t.balanceCents - a.t.balanceCents
        : (b.last ?? '').localeCompare(a.last ?? ''),
  );
  const advanced = balance !== 'all' || visit !== 'any';

  if (ws.customers.length === 0) {
    return (
      <Screen withTabBar>
        <PageHeader title="Customers" action={{ icon: 'user-plus', label: 'Add customer', onPress: () => router.push('/customer/new') }} />
        <EmptyState
          icon="users"
          title="No customers yet"
          body="Add the people you serve to track their orders, balances and contact details in one place."
          action={{ label: 'Add first customer', onPress: () => router.push('/customer/new') }}
        />
        <Note icon="sparkles" text="Tip: you can also add a customer while creating an order." />
      </Screen>
    );
  }

  return (
    <Screen withTabBar onRefresh={() => void refetch()} refreshing={isRefetching}>
      <PageHeader title="Customers" action={{ icon: 'user-plus', label: 'Add customer', onPress: () => router.push('/customer/new') }} />
      <SearchField value={query} onChangeText={setQuery} placeholder="Search name, phone or email" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -24 }}>
        <View style={{ width: 16 }} />
        <Chip label={`All · ${searched.length}`} selected={quick === 'all'} onPress={() => setQuick('all')} />
        <Chip label={`Owes money · ${searched.filter((r) => r.t.balanceCents > 0).length}`} selected={quick === 'owes'} onPress={() => setQuick('owes')} />
        <Chip label="Regulars" selected={quick === 'regulars'} onPress={() => setQuick('regulars')} />
        <Chip label="New" selected={quick === 'new'} onPress={() => setQuick('new')} />
        <Chip label={advanced ? 'Filters · on' : 'Filters'} selected={advanced} onPress={() => setSheet('filters')} />
        <View style={{ width: 16 }} />
      </ScrollView>
      <Txt variant="caption" color="textSecondary">
        {q || quick !== 'all' || advanced ? (
          `${list.length} ${list.length === 1 ? 'result' : 'results'}${q ? ` for “${query.trim()}”` : ''}`
        ) : (
          <>
            {owing.length} customers owe{' '}
            <Txt variant="caption" weight="semibold" color="errorText">
              {formatMoney(sumCents(owing.map((r) => r.t.balanceCents)), cur)}
            </Txt>{' '}
            · Sorted by {SORTS.find((s) => s.value === sort)?.label.toLowerCase()}
          </>
        )}
      </Txt>
      {list.length === 0 ? (
        <EmptyState
          icon="search"
          title={q ? `No matches for “${query.trim()}”` : 'No customers match'}
          body={q ? 'Check the spelling, or search by phone number instead. You can also add them as a new customer.' : 'Try a different filter.'}
          action={q ? { label: `Add “${query.trim()}” as customer`, onPress: () => router.push(`/customer/new?name=${encodeURIComponent(query.trim())}`) } : undefined}
        />
      ) : (
        <ListCard>
          {list.map((r) => {
            const owes = r.t.balanceCents > 0;
            return (
              <CustomerRow
                key={r.c.id}
                name={r.c.fullName}
                subtitle={`${r.t.orderCount} ${r.t.orderCount === 1 ? 'order' : 'orders'}${r.last ? ` · Last visit ${relativeDayLower(r.last, now) === 'today' ? 'today' : fmtShort(r.last)}` : ''}`}
                amount={formatMoney(r.t.valueCents, cur)}
                status={owes ? `${r.t.overdue ? 'Overdue' : 'Owes'} ${formatMoney(r.t.balanceCents, cur)}` : 'Paid up'}
                statusColor={owes ? 'errorText' : 'textSecondary'}
                onPress={() => router.push(`/customer/${r.c.id}`)}
              />
            );
          })}
        </ListCard>
      )}

      <BottomSheet
        visible={sheet === 'filters'}
        onClose={() => setSheet(null)}
        title="Filter customers"
        headerAction={{
          label: 'Reset',
          onPress: () => {
            setBalance('all');
            setVisit('any');
            setSort('recent');
          },
        }}
        footer={<Button label={`Show ${list.length} ${list.length === 1 ? 'customer' : 'customers'}`} onPress={() => setSheet(null)} />}
      >
        <View style={{ gap: 8 }}>
          <Txt variant="label" color="textSecondary">
            Balance
          </Txt>
          <ChipGroup
            options={[
              { value: 'all', label: 'All' },
              { value: 'owes', label: 'Owes money' },
              { value: 'paid', label: 'Paid up' },
            ]}
            value={balance}
            onChange={setBalance}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Txt variant="label" color="textSecondary">
            Last visit
          </Txt>
          <ChipGroup
            options={[
              { value: 'any', label: 'Any time' },
              { value: 'week', label: 'This week' },
              { value: 'lapsed', label: '30+ days ago' },
            ]}
            value={visit}
            onChange={setVisit}
          />
        </View>
        <SelectField label="Sort by" value={SORTS.find((s) => s.value === sort)?.label} onPress={() => setSheet('sort')} />
      </BottomSheet>
      <OptionSheet
        visible={sheet === 'sort'}
        title="Sort by"
        options={SORTS}
        value={sort}
        onSelect={setSort}
        onClose={() => setSheet('filters')}
      />
    </Screen>
  );
}
