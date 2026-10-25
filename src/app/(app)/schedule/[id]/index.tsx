import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Dialog, EmptyState, OptionSheet } from '@/components/Feedback';
import { Icon, type IconName } from '@/components/Icon';
import { AppBar, Card, ListCard, Screen, SectionHeader } from '@/components/Layout';
import { OrderRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api, type AppointmentStatus } from '@/data';
import { appointmentTitle } from '@/features/schedule';
import { fmtDay, fmtTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { orderNo, orderViews } from '@/state/selectors';
import { useAction, useWorkspace } from '@/state/session';

/** Appointments / 32 Appointment Details. */
export default function AppointmentDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const [menu, setMenu] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const a = ws.appointments.find((x) => x.id === id);

  const setStatus = useAction((status: AppointmentStatus) => api.setAppointmentStatus(id, status), {
    success: (_r, s) => (s === 'completed' ? (a?.type === 'delivery' ? 'Marked as delivered' : 'Marked as done') : s === 'cancelled' ? 'Appointment cancelled' : 'Appointment reopened'),
    onSuccess: () => setConfirmCancel(false),
  });

  if (!a) {
    return (
      <Screen>
        <AppBar title="Appointment" />
        <EmptyState icon="calendar" title="Appointment not found" body="It may have been removed." />
      </Screen>
    );
  }

  const customer = ws.customers.find((c) => c.id === a.customerId);
  const view = a.orderId ? orderViews(ws).find((v) => v.order.id === a.orderId) : undefined;
  const end = new Date(new Date(a.startsAt).getTime() + a.durationMin * 60_000);
  const doneLabel = a.type === 'delivery' ? 'Mark as delivered' : a.type === 'pickup' ? 'Mark as picked up' : 'Mark as done';

  const details: { icon: IconName; label: string; value: string; onPress?: () => void }[] = [
    { icon: 'map-pin', label: 'Address', value: a.location || '—' },
    {
      icon: 'phone',
      label: 'Contact',
      value: customer?.phone || 'No phone saved',
      onPress: customer?.phone ? () => Linking.openURL(`tel:${customer.phone.replace(/[^\d+]/g, '')}`) : undefined,
    },
    { icon: 'bell', label: 'Reminder', value: a.remind ? 'SMS to customer 1 hour before' : 'Off' },
    { icon: 'user', label: 'Assigned to', value: a.assignedToName || 'Unassigned' },
  ];

  return (
    <Screen
      footer={
        a.status === 'scheduled' ? (
          <>
            <Button label={doneLabel} loading={setStatus.pending} onPress={() => setStatus.run('completed')} />
            <Button label="Reschedule" variant="outline" onPress={() => router.push(`/schedule/${a.id}/edit`)} />
          </>
        ) : (
          <Button label="Reopen appointment" variant="outline" loading={setStatus.pending} onPress={() => setStatus.run('scheduled')} />
        )
      }
    >
      <AppBar title="Appointment" action={{ icon: 'ellipsis', label: 'Appointment options', onPress: () => setMenu(true) }} />
      <View style={{ gap: 8 }}>
        <StatusBadge status={a.status} />
        <Txt variant="title">{appointmentTitle(ws, a)}</Txt>
        <Txt variant="body" color="textSecondary">
          {fmtDay(a.startsAt)} · {fmtTime(a.startsAt)} – {fmtTime(end)}
        </Txt>
      </View>
      <ListCard verticalPadding={4}>
        {details.map((d) => (
          <View key={d.label} style={styles.detail}>
            <Icon name={d.icon} size={18} color="textSecondary" />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="caption" color="textSecondary">
                {d.label}
              </Txt>
              <Txt variant="bodyMedium" color={d.onPress ? 'primary' : 'text'} onPress={d.onPress}>
                {d.value}
              </Txt>
            </View>
          </View>
        ))}
      </ListCard>
      {view ? (
        <>
          <SectionHeader title="Linked order" />
          <ListCard>
            <OrderRow
              title={view.customerName}
              subtitle={`${orderNo(view.order)} · ${view.money.balanceCents ? `${formatMoney(view.money.balanceCents, ws.business.currency)} due` : 'Paid'}`}
              amount={formatMoney(view.order.totalCents, ws.business.currency)}
              status={view.badge}
              onPress={() => router.push(`/order/${view.order.id}`)}
            />
          </ListCard>
        </>
      ) : null}
      {a.notes ? (
        <>
          <SectionHeader title="Notes" />
          <Card style={{ paddingVertical: 14 }}>
            <Txt variant="body" color="textSecondary">
              {a.notes}
            </Txt>
          </Card>
        </>
      ) : null}
      <OptionSheet
        visible={menu}
        title="Appointment"
        options={[
          { value: 'edit', label: 'Edit appointment' },
          ...(customer ? [{ value: 'customer', label: 'View customer' }] : []),
          ...(a.status === 'scheduled' ? [{ value: 'cancel', label: 'Cancel appointment' }] : []),
        ]}
        onSelect={(v) => {
          if (v === 'edit') router.push(`/schedule/${a.id}/edit`);
          if (v === 'customer' && customer) router.push(`/customer/${customer.id}`);
          if (v === 'cancel') setTimeout(() => setConfirmCancel(true), 350);
        }}
        onClose={() => setMenu(false)}
      />
      <Dialog
        visible={confirmCancel}
        tone="destructive"
        icon="calendar"
        title="Cancel this appointment?"
        body={`${appointmentTitle(ws, a)} on ${fmtDay(a.startsAt)} at ${fmtTime(a.startsAt)} will be removed from the schedule.`}
        confirmLabel="Cancel appointment"
        cancelLabel="Keep"
        loading={setStatus.pending}
        onConfirm={() => setStatus.run('cancelled')}
        onCancel={() => setConfirmCancel(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  detail: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
