import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Chip } from '@/components/Badges';
import { EmptyState } from '@/components/Feedback';
import { SearchField } from '@/components/Fields';
import { AppBar, GroupLabel, ListCard, Screen } from '@/components/Layout';
import { TransactionRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { relativeDay, fmtDay } from '@/lib/dates';
import { formatMoney, sumCents } from '@/lib/money';
import { METHOD_LABEL, transactions, type TxnView } from '@/state/selectors';
import { useWorkspace, useWorkspaceQuery } from '@/state/session';

type Filter = 'all' | 'in' | 'out' | 'cash' | 'card';
const GROUP_LIMIT = 3;

/** Finance / 25 Transaction History. */
export default function Transactions() {
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const router = useRouter();
  const ws = useWorkspace();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const [filter, setFilter] = useState<Filter>(params.filter ?? 'all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const cur = ws.business.currency;

  const all = useMemo(() => transactions(ws), [ws]);
  const q = query.trim().toLowerCase().replace(/^#/, '#');
  const list = all
    .filter((t) =>
      filter === 'all' ? true : filter === 'in' ? t.kind === 'income' : filter === 'out' ? t.kind === 'expense' : t.method === filter,
    )
    .filter((t) => !q || t.search.includes(q.replace(/^#nv-?/, 'nv-')) || t.search.includes(q));

  const groups: { key: string; items: TxnView[] }[] = [];
  for (const t of list) {
    const key = new Date(t.at).toDateString();
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(t);
    else groups.push({ key, items: [t] });
  }

  return (
    <Screen gap={14} onRefresh={() => void refetch()} refreshing={isRefetching}>
      <AppBar title="Transactions" />
      <SearchField value={query} onChangeText={setQuery} placeholder="Search order #, customer or note" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -24 }}>
        <View style={{ width: 16 }} />
        {(
          [
            ['all', 'All'],
            ['in', 'Money in'],
            ['out', 'Money out'],
            ['cash', 'Cash'],
            ['card', 'Card'],
          ] as [Filter, string][]
        ).map(([v, l]) => (
          <Chip key={v} label={l} selected={filter === v} onPress={() => setFilter(v)} />
        ))}
        <View style={{ width: 16 }} />
      </ScrollView>
      {groups.length === 0 ? (
        <EmptyState
          icon={q ? 'search' : 'wallet'}
          title={q ? `No matches for “${query.trim()}”` : 'No transactions yet'}
          body={q ? 'Try an order number like NV-1049 or a customer name.' : 'Payments you record and expenses you add will appear here.'}
        />
      ) : (
        groups.map((g) => {
          const inC = sumCents(g.items.filter((t) => t.kind === 'income').map((t) => t.cents));
          const outC = sumCents(g.items.filter((t) => t.kind === 'expense').map((t) => t.cents));
          const r = relativeDay(g.items[0].at);
          const label = r === 'Today' ? `Today · ${fmtDay(g.items[0].at)}` : r === 'Yesterday' ? `Yesterday · ${fmtDay(g.items[0].at)}` : fmtDay(g.items[0].at);
          const open = expanded[g.key] || g.items.length <= GROUP_LIMIT + 1;
          const shown = open ? g.items : g.items.slice(0, GROUP_LIMIT);
          const note =
            g.items.length > GROUP_LIMIT + 1
              ? `${g.items.length} transactions${outC ? ` · Out ${formatMoney(outC, cur)}` : ''}`
              : [inC ? `In ${formatMoney(inC, cur)}` : null, `Out ${formatMoney(outC, cur)}`].filter(Boolean).join(' · ');
          return (
            <View key={g.key} style={{ gap: 14 }}>
              <GroupLabel label={label} note={note} />
              <ListCard>
                {[
                  ...shown.map((t) => (
                    <TransactionRow
                      key={t.id}
                      kind={t.kind}
                      title={t.title}
                      subtitle={t.subtitle}
                      amount={`${t.kind === 'income' ? '+' : '−'}${formatMoney(t.cents, cur)}`}
                      method={METHOD_LABEL[t.method]}
                      onPress={() => router.push(t.href as never)}
                    />
                  )),
                  ...(!open
                    ? [
                        <Pressable key="more" accessibilityRole="button" onPress={() => setExpanded((e) => ({ ...e, [g.key]: true }))} style={{ paddingVertical: 12, alignItems: 'center' }}>
                          <Txt variant="label" color="primary">
                            Show {g.items.length - GROUP_LIMIT} more
                          </Txt>
                        </Pressable>,
                      ]
                    : []),
                ]}
              </ListCard>
            </View>
          );
        })
      )}
    </Screen>
  );
}
