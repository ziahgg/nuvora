import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { AppBar, Screen } from '@/components/Layout';
import { api } from '@/data';
import { CustomerFields, useCustomerForm } from '@/features/CustomerForm';
import { useAction, useWorkspace } from '@/state/session';

/** Customers / 16 Add Customer (+ 16b validation). `?name=` prefills; `?then=order` continues to a new order. */
export default function NewCustomer() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; then?: string }>();
  const ws = useWorkspace();
  const form = useCustomerForm({ fullName: params.name ?? '' });

  const save = useAction((input: Parameters<typeof api.createCustomer>[1]) => api.createCustomer(ws.business.id, input), {
    success: params.then === 'order' ? 'Customer added' : undefined,
    onSuccess: (customer) => {
      if (params.then === 'order') router.replace(`/order/new?customerId=${customer.id}`);
      else router.replace(`/customer/${customer.id}?added=1`);
    },
  });

  return (
    <Screen
      footer={
        <Button
          label="Save customer"
          loading={save.pending}
          onPress={() => {
            const input = form.validate();
            if (input) save.run(input);
          }}
        />
      }
    >
      <AppBar title="New customer" />
      <CustomerFields form={form} optionalLabels />
    </Screen>
  );
}
