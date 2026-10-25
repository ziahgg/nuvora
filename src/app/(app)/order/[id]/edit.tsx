import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, LinkText } from '@/components/Button';
import { Dialog, EmptyState, OptionSheet } from '@/components/Feedback';
import { AppBar, ListCard, Screen } from '@/components/Layout';
import { CustomerRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api, type OrderInput } from '@/data';
import { OrderEditorFields, useOrderEditor } from '@/features/OrderEditor';
import { formatMoney } from '@/lib/money';
import { orderNo, orderViews } from '@/state/selectors';
import { useAction, useWorkspace } from '@/state/session';

/** Orders / 21 Edit Order. */
export default function EditOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const view = orderViews(ws).find((v) => v.order.id === id);
  const editor = useOrderEditor(ws.services, view?.order);
  const [customerId, setCustomerId] = useState(view?.order.customerId ?? '');
  const [pickCustomer, setPickCustomer] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string>();
  const cur = ws.business.currency;

  const save = useAction((input: OrderInput) => api.saveOrder(ws.business.id, id, input), {
    success: 'Order updated',
    onSuccess: () => router.back(),
  });
  const cancel = useAction(() => api.setOrderStatus(id, 'cancelled'), {
    success: 'Order cancelled',
    onSuccess: () => router.back(),
  });

  if (!view || view.order.status === 'cancelled') {
    return (
      <Screen>
        <AppBar />
        <EmptyState icon="clipboard-list" title="Can’t edit this order" body="Cancelled or deleted orders can’t be edited." />
      </Screen>
    );
  }

  const customer = ws.customers.find((c) => c.id === customerId);

  function submit() {
    if (editor.items.length === 0) return setError('Add at least one service to the order.');
    if (editor.totalCents < view!.money.paidCents) {
      return setError(`The total can’t be less than the ${formatMoney(view!.money.paidCents, cur)} already paid.`);
    }
    setError(undefined);
    save.run({
      customerId,
      items: editor.items,
      dueAt: editor.dueAt.toISOString(),
      handover: editor.handover,
      handoverTime: editor.handover === 'delivery' ? editor.handoverTime : '',
      notes: editor.notes.trim(),
    });
  }

  return (
    <Screen
      gap={14}
      footer={
        <>
          <Button label="Save changes" onPress={submit} loading={save.pending} />
          <Button label="Cancel order" variant="tertiary" textColor="errorText" onPress={() => setConfirmCancel(true)} />
        </>
      }
    >
      <AppBar title={`Edit ${orderNo(view.order)}`} />
      <Txt variant="caption" color="textSecondary">
        Changes update the balance automatically
      </Txt>
      <ListCard>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <CustomerRow name={customer?.fullName ?? 'Deleted customer'} subtitle={customer?.phone || 'Choose a customer'} />
          </View>
          <LinkText label="Change" onPress={() => setPickCustomer(true)} />
        </View>
      </ListCard>
      <OrderEditorFields editor={editor} currency={cur} error={error} paidCents={view.money.paidCents} />
      <OptionSheet
        visible={pickCustomer}
        title="Customer"
        value={customerId}
        options={ws.customers.map((c) => ({ value: c.id, label: c.fullName, caption: c.phone }))}
        onSelect={setCustomerId}
        onClose={() => setPickCustomer(false)}
      />
      <Dialog
        visible={confirmCancel}
        tone="destructive"
        icon="trash-2"
        title={`Cancel ${orderNo(view.order)}?`}
        body="The order leaves revenue and outstanding balances. Any payments already recorded stay on record."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        loading={cancel.pending}
        onConfirm={() => cancel.run(undefined)}
        onCancel={() => setConfirmCancel(false)}
      />
    </Screen>
  );
}
