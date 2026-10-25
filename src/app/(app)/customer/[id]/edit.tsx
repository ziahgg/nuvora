import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { Dialog, EmptyState } from '@/components/Feedback';
import { AppBar, Screen } from '@/components/Layout';
import { api, type CustomerInput } from '@/data';
import { CustomerFields, useCustomerForm } from '@/features/CustomerForm';
import { customerTotals } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { useAction, useWorkspace } from '@/state/session';

/** Customers / 17 Edit Customer (+ State / Delete Confirmation). */
export default function EditCustomer() {
  const { id, confirmDelete } = useLocalSearchParams<{ id: string; confirmDelete?: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const customer = ws.customers.find((c) => c.id === id);
  const form = useCustomerForm(customer ?? {});
  const [confirm, setConfirm] = useState(confirmDelete === '1');

  const save = useAction((input: CustomerInput) => api.updateCustomer(id, input), {
    success: 'Customer updated',
    onSuccess: () => router.back(),
  });
  const remove = useAction(() => api.deleteCustomer(id), {
    success: 'Customer deleted',
    onSuccess: () => router.navigate('/customers'),
  });

  if (!customer) {
    return (
      <Screen>
        <AppBar />
        <EmptyState icon="users" title="Customer not found" body="This customer may have been deleted." />
      </Screen>
    );
  }

  const totals = customerTotals(customer.id, ws.orders, ws.payments);

  return (
    <Screen
      footer={
        <>
          <Button
            label="Save changes"
            loading={save.pending}
            onPress={() => {
              const input = form.validate();
              if (input) save.run(input);
            }}
          />
          <Button label="Delete customer" variant="tertiary" textColor="errorText" onPress={() => setConfirm(true)} />
        </>
      }
    >
      <AppBar title="Edit customer" />
      <CustomerFields form={form} />
      <Dialog
        visible={confirm}
        tone="destructive"
        icon="trash-2"
        title={`Delete ${customer.fullName}?`}
        body={`This removes the customer and their contact details. Their ${totals.orderCount} ${totals.orderCount === 1 ? 'order' : 'orders'}${
          totals.balanceCents > 0 ? ` and ${formatMoney(totals.balanceCents, ws.business.currency)} balance` : ''
        } stay in reports as “Deleted customer”.`}
        confirmLabel="Delete"
        loading={remove.pending}
        onConfirm={() => remove.run(undefined)}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
