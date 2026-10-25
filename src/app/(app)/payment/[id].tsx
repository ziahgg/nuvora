import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { Button } from '@/components/Button';
import { Dialog, EmptyState, useToast } from '@/components/Feedback';
import { AppBar, KeyValue, ListCard, Screen, SectionHeader } from '@/components/Layout';
import { IconTile, OrderRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { fmtFull, fmtShort } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { buildReceipt } from '@/lib/receipt';
import { METHOD_LABEL, orderNo, orderViews } from '@/state/selectors';
import { useAction, usePermissions, useWorkspace } from '@/state/session';

/** Finance / 28 Transaction Details (payment). */
export default function PaymentDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const toast = useToast();
  const { finance } = usePermissions();
  const [confirm, setConfirm] = useState(false);
  const payment = ws.payments.find((p) => p.id === id);
  const view = payment ? orderViews(ws).find((v) => v.order.id === payment.orderId) : undefined;
  const cur = ws.business.currency;

  const remove = useAction(() => api.deletePayment(id), {
    success: 'Payment deleted · balance restored',
    onSuccess: () => router.back(),
  });

  if (!payment || !view) {
    return (
      <Screen>
        <AppBar title="Payment" />
        <EmptyState icon="wallet" title="Payment not found" body="It may have been deleted." />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label="Share receipt"
            variant="secondary"
            onPress={() =>
              Share.share({
                message: buildReceipt(ws.business, view.order, ws.customers.find((c) => c.id === view.order.customerId), view.payments),
              }).catch(() => toast('Couldn’t open the share sheet.', { kind: 'error' }))
            }
          />
          {finance ? <Button label="Delete payment" variant="tertiary" textColor="errorText" onPress={() => setConfirm(true)} /> : null}
        </>
      }
    >
      <AppBar title="Payment" />
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 8 }}>
        <IconTile icon="arrow-down-left" bg="success50" color="success" size={52} iconSize={26} />
        <Txt variant="kpiLarge" color="successText">
          +{formatMoney(payment.amountCents, cur)}
        </Txt>
        <Txt variant="body" color="textSecondary">
          Payment received · {METHOD_LABEL[payment.method]}
        </Txt>
      </View>
      <ListCard verticalPadding={4}>
        <KeyValue label="Date" value={fmtFull(payment.paidAt)} valueVariant="bodyMedium" />
        <KeyValue label="Customer" value={view.customerName} valueVariant="bodyMedium" />
        <KeyValue label="Method" value={METHOD_LABEL[payment.method]} valueVariant="bodyMedium" />
        <KeyValue label="Recorded by" value={payment.recordedByName || '—'} valueVariant="bodyMedium" />
        <KeyValue label="Reference" value={payment.reference || '—'} valueVariant="bodyMedium" />
      </ListCard>
      <SectionHeader title="Applied to" />
      <ListCard>
        <OrderRow
          title={view.customerName}
          subtitle={`${orderNo(view.order)} · Balance now ${formatMoney(view.money.balanceCents, cur)}`}
          amount={formatMoney(view.order.totalCents, cur)}
          status={view.money.overdue ? 'overdue' : view.money.paymentStatus}
          onPress={() => router.push(`/order/${view.order.id}`)}
        />
      </ListCard>
      <Txt variant="caption" color="textSecondary">
        This payment counts toward money received on {fmtShort(payment.paidAt)}. Revenue for this order was recorded on {fmtShort(view.order.createdAt)} when it was created.
      </Txt>
      <Dialog
        visible={confirm}
        tone="destructive"
        icon="trash-2"
        title="Delete this payment?"
        body={`${formatMoney(payment.amountCents, cur)} will be added back to ${orderNo(view.order)}’s balance. Use this only for payments recorded by mistake.`}
        confirmLabel="Delete"
        loading={remove.pending}
        onConfirm={() => remove.run(undefined)}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
