import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/Badges';
import { Button, LinkText } from '@/components/Button';
import { BottomSheet, Dialog, EmptyState, OptionSheet, useToast } from '@/components/Feedback';
import { AppBar, Card, KeyValue, ListCard, Note, Screen, SectionHeader } from '@/components/Layout';
import { CustomerRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api, type OrderStatus } from '@/data';
import { fmtDay, fmtDayTime, relativeDay } from '@/lib/dates';
import { formatMoney, lineTotal } from '@/lib/money';
import { buildReceipt } from '@/lib/receipt';
import { UNIT_QTY_LABEL } from '@/state/options';
import { METHOD_LABEL, orderNo, orderViews } from '@/state/selectors';
import { useAction, usePermissions, useWorkspace } from '@/state/session';
import { colors, type ColorToken } from '@/theme/tokens';

const STATUS_OPTIONS: { value: OrderStatus; title: string; caption: string }[] = [
  { value: 'in_progress', title: 'In Progress', caption: 'Items are being cleaned' },
  { value: 'completed', title: 'Completed', caption: 'Ready or handed over to the customer' },
  { value: 'cancelled', title: 'Cancelled', caption: 'Stops the order. Payments stay on record.' },
];

/** Orders / 19 Order Details (+ 19b paid in full, 22 status sheet, 23 created confirmation). */
export default function OrderDetails() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const toast = useToast();
  const { finance } = usePermissions();
  const [statusOpen, setStatusOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const view = orderViews(ws).find((v) => v.order.id === id);
  const [nextStatus, setNextStatus] = useState<OrderStatus>(view?.order.status === 'in_progress' ? 'completed' : (view?.order.status ?? 'completed'));
  const cur = ws.business.currency;

  const setStatus = useAction((status: OrderStatus) => api.setOrderStatus(id, status), {
    success: (_r, s) => (s === 'completed' ? 'Order marked as completed' : s === 'cancelled' ? 'Order cancelled' : 'Order back in progress'),
    onSuccess: () => {
      setStatusOpen(false);
      setConfirmCancel(false);
    },
  });

  async function shareReceipt() {
    if (!view) return;
    const customer = ws.customers.find((c) => c.id === view.order.customerId);
    try {
      await Share.share({ message: buildReceipt(ws.business, view.order, customer, view.payments), title: `Receipt ${orderNo(view.order)}` });
    } catch {
      toast('Couldn’t open the share sheet.', { kind: 'error' });
    }
  }

  useEffect(() => {
    if (created && view) toast(`Order ${orderNo(view.order)} created`, { action: { label: 'Share receipt', onPress: () => void shareReceipt() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on arrival
  }, []);

  if (!view) {
    return (
      <Screen>
        <AppBar />
        <EmptyState icon="clipboard-list" title="Order not found" body="This order may have been removed." action={{ label: 'Back to orders', onPress: () => router.navigate('/orders') }} />
      </Screen>
    );
  }

  const { order, money } = view;
  const customer = ws.customers.find((c) => c.id === order.customerId);
  const cancelled = order.status === 'cancelled';
  const canPay = finance && !cancelled && money.balanceCents > 0;
  const itemCount = order.items.reduce((s, i) => s + (i.unit === 'item' || i.unit === 'set' ? i.quantity : 0), 0);

  const events: { title: string; caption: string; dot: ColorToken; rail: ColorToken; pending?: boolean }[] = [
    { title: 'Order created', caption: `${fmtDayTime(order.createdAt)}${order.createdByName ? ` · by ${order.createdByName}` : ''}`, dot: 'success', rail: 'success' },
    ...[...view.payments]
      .sort((a, b) => a.paidAt.localeCompare(b.paidAt))
      .map((p, i, arr) => ({
        title: `Payment received · ${formatMoney(p.amountCents, cur)}`,
        caption: `${fmtDayTime(p.paidAt)} · ${METHOD_LABEL[p.method]}${i === arr.length - 1 && money.balanceCents === 0 ? ' · Paid in full' : ''}`,
        dot: 'success' as ColorToken,
        rail: 'success' as ColorToken,
      })),
  ];
  if (cancelled) events.push({ title: 'Cancelled', caption: fmtDayTime(order.cancelledAt ?? order.createdAt), dot: 'textTertiary', rail: 'border' });
  else if (order.status === 'completed') events.push({ title: 'Completed', caption: fmtDayTime(order.completedAt ?? order.dueAt), dot: 'success', rail: 'border' });
  else {
    events.push({ title: 'In progress', caption: `Started · ${fmtDay(order.startedAt ?? order.createdAt)}`, dot: 'primary', rail: 'border' });
    events.push({ title: 'Completed', caption: `Expected ${relativeDay(order.dueAt) === 'Today' ? 'today' : fmtDay(order.dueAt)}, ${new Date(order.dueAt).toTimeString().slice(0, 5)}`, dot: 'surface', rail: 'border', pending: true });
  }

  const footer = cancelled ? (
    <Button label="Share receipt" variant="outline" onPress={shareReceipt} />
  ) : canPay ? (
    <>
      <Button label={`Record payment · ${formatMoney(money.balanceCents, cur)}`} onPress={() => router.push(`/payment/new?orderId=${order.id}`)} />
      {created ? (
        <Button label="Back to orders" variant="outline" onPress={() => router.navigate('/orders')} />
      ) : (
        <Button label="Update status" variant="outline" onPress={() => setStatusOpen(true)} />
      )}
    </>
  ) : (
    <>
      <Button label="Update status" onPress={() => setStatusOpen(true)} />
      <Button label="Share receipt" variant="outline" onPress={shareReceipt} />
    </>
  );

  return (
    <Screen footer={footer}>
      <AppBar title={orderNo(order)} action={{ icon: 'ellipsis', label: 'Order options', onPress: () => setMenu(true) }} />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatusBadge status={order.status} />
          {!cancelled ? <StatusBadge status={money.overdue ? 'overdue' : money.paymentStatus} /> : null}
        </View>
        <Txt variant="kpiLarge">{formatMoney(order.totalCents, cur)}</Txt>
        <Txt variant="caption" color="textSecondary">
          {view.description}
          {itemCount > 0 ? ` · ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : ''}
        </Txt>
      </View>

      <ListCard>
        <Pressable accessibilityRole="link" onPress={() => customer && router.push(`/customer/${customer.id}`)} disabled={!customer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <CustomerRow name={view.customerName} subtitle={customer?.phone || customer?.email || 'No contact details'} />
            </View>
            {customer ? <LinkText label="View profile" onPress={() => router.push(`/customer/${customer.id}`)} /> : null}
          </View>
        </Pressable>
      </ListCard>

      <SectionHeader title="Items" />
      <ListCard verticalPadding={4}>
        {order.items.map((i) => (
          <View key={i.id} style={styles.item}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodyMedium">{i.name}</Txt>
              <Txt variant="caption" color="textSecondary">
                {i.unit === 'kg' ? `${UNIT_QTY_LABEL.kg(i.quantity)} × ${formatMoney(i.unitPriceCents, cur)}` : `${i.quantity} × ${formatMoney(i.unitPriceCents, cur)}`}
              </Txt>
            </View>
            <Txt variant="figure">{formatMoney(lineTotal(i.quantity, i.unitPriceCents), cur)}</Txt>
          </View>
        ))}
        <View>
          <KeyValue label="Order total" strongLabel value={formatMoney(order.totalCents, cur)} />
          <KeyValue label="Paid" value={formatMoney(money.paidCents, cur)} valueColor="successText" />
          <KeyValue label="Balance due" strongLabel value={formatMoney(money.balanceCents, cur)} valueColor={money.balanceCents > 0 && !cancelled ? 'errorText' : 'text'} large />
        </View>
      </ListCard>

      <SectionHeader title="Dates" />
      <ListCard verticalPadding={4}>
        <KeyValue label="Order date" value={fmtDayTime(order.createdAt)} valueVariant="bodyMedium" />
        <KeyValue label="Due date" value={relativeDay(order.dueAt) === 'Today' ? `Today, ${new Date(order.dueAt).toTimeString().slice(0, 5)}` : fmtDay(order.dueAt)} valueVariant="bodyMedium" />
        <KeyValue label="Handover" value={order.handover === 'delivery' ? `Delivery · ${order.handoverTime}` : 'Pickup in store'} valueVariant="bodyMedium" />
      </ListCard>

      <SectionHeader title="Timeline" />
      <Card style={{ paddingVertical: 16 }}>
        {events.map((e, i) => (
          <View key={i} style={styles.event}>
            <View style={{ alignItems: 'center', width: 12 }}>
              <View style={[styles.dot, { backgroundColor: colors[e.dot] }, e.pending ? styles.dotPending : null]} />
              {i < events.length - 1 ? <View style={[styles.rail, { backgroundColor: colors[e.rail] }]} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2, paddingBottom: i < events.length - 1 ? 10 : 0 }}>
              <Txt variant="label" color={e.pending ? 'textTertiary' : 'text'}>
                {e.title}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                {e.caption}
              </Txt>
            </View>
          </View>
        ))}
      </Card>

      {order.notes ? (
        <>
          <SectionHeader title="Notes" />
          <Card style={{ paddingVertical: 14 }}>
            <Txt variant="body" color="textSecondary">
              {order.notes}
            </Txt>
          </Card>
        </>
      ) : null}

      {/* Update status sheet */}
      <BottomSheet
        visible={statusOpen}
        onClose={() => setStatusOpen(false)}
        title={`Update status · ${orderNo(order)}`}
        footer={
          <Button
            label={nextStatus === 'completed' ? 'Mark as completed' : nextStatus === 'cancelled' ? 'Cancel order' : 'Mark as in progress'}
            variant={nextStatus === 'cancelled' ? 'destructive' : 'primary'}
            disabled={nextStatus === order.status}
            loading={setStatus.pending}
            onPress={() => setStatus.run(nextStatus)}
          />
        }
      >
        {STATUS_OPTIONS.map((o) => {
          const selected = nextStatus === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setNextStatus(o.value)}
              style={[styles.option, selected ? styles.optionSelected : null]}
            >
              <View style={[styles.radio, selected ? styles.radioOn : null]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyMedium">{o.title}</Txt>
                <Txt variant="caption" color="textSecondary">
                  {o.caption}
                </Txt>
              </View>
              <StatusBadge status={o.value} />
            </Pressable>
          );
        })}
        {nextStatus === 'completed' && money.balanceCents > 0 ? (
          <Note tone="warning" icon="triangle-alert" text={`${formatMoney(money.balanceCents, cur)} is still unpaid. Completing keeps the balance as outstanding.`} />
        ) : null}
        {nextStatus === 'cancelled' && money.paidCents > 0 ? (
          <Note tone="warning" icon="triangle-alert" text={`${formatMoney(money.paidCents, cur)} was already paid. Payments stay on record — refund the customer separately if needed.`} />
        ) : null}
      </BottomSheet>

      <OptionSheet
        visible={menu}
        title={orderNo(order)}
        options={[
          ...(!cancelled ? [{ value: 'edit', label: 'Edit order' }] : []),
          { value: 'share', label: 'Share receipt' },
          ...(!cancelled ? [{ value: 'status', label: 'Update status' }] : []),
          ...(!cancelled ? [{ value: 'cancel', label: 'Cancel order', caption: 'Payments stay on record' }] : []),
        ]}
        onSelect={(v) => {
          if (v === 'edit') router.push(`/order/${order.id}/edit`);
          if (v === 'share') void shareReceipt();
          if (v === 'status') setTimeout(() => setStatusOpen(true), 350);
          if (v === 'cancel') setTimeout(() => setConfirmCancel(true), 350);
        }}
        onClose={() => setMenu(false)}
      />
      <Dialog
        visible={confirmCancel}
        tone="destructive"
        icon="trash-2"
        title={`Cancel ${orderNo(order)}?`}
        body="The order leaves revenue and outstanding balances. Any payments already recorded stay on record."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        loading={setStatus.pending}
        onConfirm={() => setStatus.run('cancelled')}
        onCancel={() => setConfirmCancel(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  event: { flexDirection: 'row', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotPending: { borderWidth: 2, borderColor: colors.border },
  rail: { width: 2, flex: 1, minHeight: 34 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  optionSelected: { backgroundColor: colors.primary50, borderColor: colors.primary, borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  radioOn: { borderWidth: 6, borderColor: colors.primary },
});
