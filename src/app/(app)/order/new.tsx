import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChipGroup } from '@/components/Badges';
import { Button, LinkText } from '@/components/Button';
import { EmptyState } from '@/components/Feedback';
import { AmountInput, SearchField } from '@/components/Fields';
import { Icon } from '@/components/Icon';
import { AppBar, GroupLabel, ListCard, Screen } from '@/components/Layout';
import { CustomerRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api, type OrderInput, type PaymentMethod } from '@/data';
import { OrderEditorFields, useOrderEditor } from '@/features/OrderEditor';
import { fmtShort } from '@/lib/dates';
import { customerTotals } from '@/lib/finance';
import { currencySymbol, formatMoney, parseMoneyInput } from '@/lib/money';
import { METHOD_OPTIONS } from '@/state/options';
import { useAction, usePermissions, useWorkspace } from '@/state/session';
import { colors } from '@/theme/tokens';

type PayMode = 'later' | 'full' | 'part';

/** Orders / 20a Select Customer → 20b Order Details → 23 confirmation. */
export default function NewOrder() {
  const params = useLocalSearchParams<{ customerId?: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const { finance } = usePermissions();
  const cur = ws.business.currency;
  const [customerId, setCustomerId] = useState<string | null>(params.customerId ?? null);
  const [query, setQuery] = useState('');
  const editor = useOrderEditor(ws.services);
  const [payMode, setPayMode] = useState<PayMode>('later');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [partAmount, setPartAmount] = useState('');
  const [error, setError] = useState<string>();

  const customer = ws.customers.find((c) => c.id === customerId);

  const save = useAction((input: OrderInput) => api.saveOrder(ws.business.id, null, input), {
    onSuccess: (orderId) => router.replace(`/order/${orderId}?created=1`),
  });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ws.customers.filter((c) => c.fullName.toLowerCase().includes(q) || c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'));
  }, [query, ws.customers]);
  const recent = useMemo(() => {
    const seen: string[] = [];
    for (const o of ws.orders) if (!seen.includes(o.customerId) && ws.customers.some((c) => c.id === o.customerId)) seen.push(o.customerId);
    return seen.slice(0, 5).map((id) => ws.customers.find((c) => c.id === id)!);
  }, [ws]);

  function submit() {
    if (!customer) return;
    if (editor.items.length === 0) return setError('Add at least one service to the order.');
    let payment: OrderInput['payment'] = null;
    if (finance && payMode === 'full' && editor.totalCents > 0) payment = { amountCents: editor.totalCents, method };
    if (finance && payMode === 'part') {
      const cents = parseMoneyInput(partAmount);
      if (!cents) return setError('Enter the amount paid now.');
      if (cents > editor.totalCents) return setError(`Part payment can’t be more than the ${formatMoney(editor.totalCents, cur)} total.`);
      payment = { amountCents: cents, method };
    }
    setError(undefined);
    save.run({
      customerId: customer.id,
      items: editor.items,
      dueAt: editor.dueAt.toISOString(),
      handover: editor.handover,
      handoverTime: editor.handover === 'delivery' ? editor.handoverTime : '',
      notes: editor.notes.trim(),
      payment,
    });
  }

  /* ── Step 1: choose a customer ── */
  if (!customer) {
    const row = (c: (typeof ws.customers)[number]) => {
      const t = customerTotals(c.id, ws.orders, ws.payments);
      const last = ws.orders.find((o) => o.customerId === c.id);
      return (
        <CustomerRow
          key={c.id}
          name={c.fullName}
          subtitle={`${t.orderCount} orders${last ? ` · Last visit ${fmtShort(last.createdAt)}` : ''}`}
          amount={formatMoney(t.valueCents, cur)}
          status={t.balanceCents > 0 ? `Owes ${formatMoney(t.balanceCents, cur)}` : 'Paid up'}
          statusColor={t.balanceCents > 0 ? 'errorText' : 'textSecondary'}
          onPress={() => setCustomerId(c.id)}
        />
      );
    };
    return (
      <Screen gap={14}>
        <AppBar title="New order" />
        <Txt variant="caption" color="textSecondary">
          Step 1 of 2 · Choose a customer
        </Txt>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search name or phone" />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/customer/new?then=order${query.trim() ? `&name=${encodeURIComponent(query.trim())}` : ''}`)}
          style={styles.addNew}
        >
          <View style={styles.addIcon}>
            <Icon name="user-plus" size={18} color="primary" />
          </View>
          <Txt variant="label" color="primary" style={{ flex: 1 }}>
            {query.trim() ? `Add “${query.trim()}” as a new customer` : 'Add a new customer'}
          </Txt>
        </Pressable>
        {query.trim() ? (
          <>
            <GroupLabel label="Matching customers" />
            {matches.length ? <ListCard>{matches.map(row)}</ListCard> : <Txt variant="caption" color="textSecondary">No customers match “{query.trim()}”.</Txt>}
          </>
        ) : null}
        {recent.length ? (
          <>
            <GroupLabel label="Recent" />
            <ListCard>{recent.map(row)}</ListCard>
          </>
        ) : ws.customers.length === 0 ? (
          <EmptyState icon="users" title="No customers yet" body="Add the customer this order is for." />
        ) : (
          <ListCard>{ws.customers.slice(0, 8).map(row)}</ListCard>
        )}
      </Screen>
    );
  }

  /* ── Step 2: order details ── */
  const t = customerTotals(customer.id, ws.orders, ws.payments);
  return (
    <Screen
      gap={14}
      footer={<Button label={`Save order · ${formatMoney(editor.totalCents, cur)}`} onPress={submit} loading={save.pending} disabled={editor.items.length === 0} />}
    >
      <AppBar title="New order" onBack={params.customerId ? undefined : () => setCustomerId(null)} />
      <Txt variant="caption" color="textSecondary">
        Step 2 of 2 · Order details
      </Txt>
      <ListCard>
        <View style={styles.customer}>
          <View style={{ flex: 1 }}>
            <CustomerRow
              name={customer.fullName}
              subtitle={`${t.orderCount} orders · ${t.balanceCents > 0 ? `Owes ${formatMoney(t.balanceCents, cur)}` : 'Paid up'}`}
            />
          </View>
          <LinkText label="Change" onPress={() => setCustomerId(null)} />
        </View>
      </ListCard>
      {ws.services.length === 0 ? (
        <EmptyState icon="shirt" title="No services set up" body="Your business has no services yet. Ask the owner to add services in Business profile." />
      ) : (
        <OrderEditorFields editor={editor} currency={cur} error={error} />
      )}
      {finance ? (
        <View style={{ gap: 8 }}>
          <Txt variant="label">Payment at drop-off</Txt>
          <ChipGroup
            options={[
              { value: 'later', label: 'Pay later' },
              { value: 'full', label: 'Paid in full' },
              { value: 'part', label: 'Part payment' },
            ]}
            value={payMode}
            onChange={setPayMode}
          />
          {payMode !== 'later' ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              {payMode === 'part' ? (
                <AmountInput label="Amount paid now" value={partAmount} onChangeText={setPartAmount} currencySymbol={currencySymbol(cur)} />
              ) : null}
              <Txt variant="label">Payment method</Txt>
              <ChipGroup options={METHOD_OPTIONS} value={method} onChange={setMethod} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addNew: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary50, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  addIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  customer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
