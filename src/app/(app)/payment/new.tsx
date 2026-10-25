import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ChipGroup } from '@/components/Badges';
import { Button } from '@/components/Button';
import { EmptyState, OptionSheet } from '@/components/Feedback';
import { AmountInput, SelectField } from '@/components/Fields';
import { Icon } from '@/components/Icon';
import { AppBar, KeyValue, ListCard, Screen } from '@/components/Layout';
import { OrderRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api, type PaymentInput, type PaymentMethod } from '@/data';
import { fmtDay } from '@/lib/dates';
import { addDays, startOfDay } from '@/lib/finance';
import { centsToInput, currencySymbol, formatMoney, parseMoneyInput } from '@/lib/money';
import { METHOD_OPTIONS } from '@/state/options';
import { orderNo, orderViews } from '@/state/selectors';
import { useAction, usePermissions, useWorkspace } from '@/state/session';

/** Finance / 26 Record Payment (+ 26b validation). */
export default function RecordPayment() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const { finance } = usePermissions();
  const view = orderViews(ws).find((v) => v.order.id === orderId);
  const [amount, setAmount] = useState(view ? centsToInput(view.money.balanceCents) : '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [dayOffset, setDayOffset] = useState(0);
  const [dateOpen, setDateOpen] = useState(false);
  const cur = ws.business.currency;

  const save = useAction((input: PaymentInput) => api.recordPayment(ws.business.id, input), {
    onSuccess: (paymentId) => router.replace(`/payment/done?paymentId=${paymentId}`),
  });

  const dayOptions = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        value: String(i),
        label: i === 0 ? `Today, ${fmtDay(new Date())}` : i === 1 ? 'Yesterday' : fmtDay(addDays(new Date(), -i)),
      })),
    [],
  );

  if (!view || !finance) {
    return (
      <Screen>
        <AppBar title="Record payment" />
        <EmptyState
          icon={finance ? 'clipboard-list' : 'lock'}
          title={finance ? 'Order not found' : 'Not available for your role'}
          body={finance ? 'Choose an order with a balance due.' : 'Only owners and managers can record payments.'}
          action={finance ? { label: 'Outstanding orders', onPress: () => router.replace('/outstanding') } : undefined}
        />
      </Screen>
    );
  }

  const { order, money } = view;
  const cents = parseMoneyInput(amount);
  const tooMuch = cents !== null && cents > money.balanceCents;
  const invalid = cents === null || cents === 0;
  const blocked = order.status === 'cancelled' || money.balanceCents === 0;
  const note =
    cents === money.balanceCents
      ? 'Full remaining balance'
      : tooMuch
        ? `Balance due is ${formatMoney(money.balanceCents, cur)}`
        : cents
          ? `${formatMoney(money.balanceCents - cents, cur)} will remain due`
          : 'Enter the amount received';

  function submit() {
    if (invalid || tooMuch || blocked || cents === null) return;
    const paidAt = dayOffset === 0 ? new Date() : new Date(startOfDay(addDays(new Date(), -dayOffset)).getTime() + 12 * 3600_000);
    save.run({ orderId: order.id, amountCents: cents, method, paidAt: paidAt.toISOString() });
  }

  return (
    <Screen
      footer={
        <Button
          label={invalid || tooMuch ? 'Record payment' : `Record ${formatMoney(cents ?? 0, cur)} payment`}
          disabled={invalid || tooMuch || blocked}
          loading={save.pending}
          onPress={submit}
        />
      }
    >
      <AppBar title="Record payment" />
      <ListCard>
        <OrderRow
          title={view.customerName}
          subtitle={`${orderNo(order)} · ${view.description} · Due ${fmtDay(order.dueAt)}`}
          amount={formatMoney(order.totalCents, cur)}
          status={money.overdue ? 'overdue' : money.paymentStatus}
        />
      </ListCard>
      {blocked ? (
        <Txt variant="caption" color="errorText">
          {order.status === 'cancelled' ? 'This order is cancelled — it can’t take payments.' : 'This order is already paid in full.'}
        </Txt>
      ) : null}
      <AmountInput label="Amount received" value={amount} onChangeText={setAmount} currencySymbol={currencySymbol(cur)} note={note} error={tooMuch} />
      {tooMuch ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Icon name="circle-alert" size={16} color="error" />
          <Txt variant="caption" color="errorText" style={{ flex: 1 }}>
            Amount can’t be more than the {formatMoney(money.balanceCents, cur)} balance due
          </Txt>
        </View>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Txt variant="label">Payment method</Txt>
            <ChipGroup options={METHOD_OPTIONS} value={method} onChange={setMethod} />
          </View>
          <SelectField label="Date" value={dayOptions[dayOffset].label} onPress={() => setDateOpen(true)} />
          <ListCard verticalPadding={4}>
            <KeyValue label="Order total" value={formatMoney(order.totalCents, cur)} />
            <KeyValue label="Paid before" value={formatMoney(money.paidCents, cur)} />
            <KeyValue label="This payment" value={`+${formatMoney(cents ?? 0, cur)}`} valueColor="successText" />
            <View>
              <KeyValue label="Balance after" strongLabel value={formatMoney(Math.max(0, money.balanceCents - (cents ?? 0)), cur)} large />
            </View>
          </ListCard>
        </>
      )}
      <OptionSheet
        visible={dateOpen}
        title="Payment date"
        options={dayOptions}
        value={String(dayOffset)}
        onSelect={(v) => setDayOffset(Number(v))}
        onClose={() => setDateOpen(false)}
      />
    </Screen>
  );
}
