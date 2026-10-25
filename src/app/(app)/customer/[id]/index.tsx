import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState, OptionSheet, useToast } from '@/components/Feedback';
import { Icon, type IconName } from '@/components/Icon';
import { AppBar, Card, ListCard, Screen, SectionHeader } from '@/components/Layout';
import { Avatar, OrderRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { fmtMonthShort, relativeDay } from '@/lib/dates';
import { customerTotals } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { orderNo, orderViews } from '@/state/selectors';
import { usePermissions, useWorkspace } from '@/state/session';
import { colors, shadows } from '@/theme/tokens';

/** Customers / 15 Customer Profile (+ 15b new customer saved). */
export default function CustomerProfile() {
  const { id, added } = useLocalSearchParams<{ id: string; added?: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const toast = useToast();
  const { finance } = usePermissions();
  const [menu, setMenu] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const customer = ws.customers.find((c) => c.id === id);
  const cur = ws.business.currency;

  useEffect(() => {
    if (added && customer) toast('Customer added', { action: { label: 'View list', onPress: () => router.navigate('/customers') } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on arrival
  }, []);

  if (!customer) {
    return (
      <Screen>
        <AppBar />
        <EmptyState icon="users" title="Customer not found" body="This customer may have been deleted." action={{ label: 'Back to customers', onPress: () => router.navigate('/customers') }} />
      </Screen>
    );
  }

  const totals = customerTotals(customer.id, ws.orders, ws.payments);
  const views = orderViews(ws).filter((v) => v.order.customerId === customer.id);
  const unpaid = views.filter((v) => v.order.status !== 'cancelled' && v.money.balanceCents > 0).sort((a, b) => a.order.dueAt.localeCompare(b.order.dueAt));
  const shown = showAll ? views : views.slice(0, 3);

  const contact: { icon: IconName; label: string; onPress: () => void; primary?: boolean }[] = [
    { icon: 'phone', label: 'Call', onPress: () => (customer.phone ? Linking.openURL(`tel:${customer.phone.replace(/[^\d+]/g, '')}`) : toast('No phone number saved', { kind: 'info' })) },
    {
      icon: 'mail',
      label: 'Message',
      onPress: () =>
        customer.phone
          ? Linking.openURL(`sms:${customer.phone.replace(/[^\d+]/g, '')}`)
          : customer.email
            ? Linking.openURL(`mailto:${customer.email}`)
            : toast('No phone or email saved', { kind: 'info' }),
    },
    { icon: 'plus', label: 'Order', primary: true, onPress: () => router.push(`/order/new?customerId=${customer.id}`) },
  ];

  return (
    <Screen>
      <AppBar action={{ icon: 'ellipsis', label: 'Customer options', onPress: () => setMenu(true) }} />
      <View style={styles.header}>
        <Avatar name={customer.fullName} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="title">{customer.fullName}</Txt>
          <Txt variant="caption" color="textSecondary">
            {relativeDay(customer.createdAt) === 'Today' ? 'Added today' : `Customer since ${fmtMonthShort(customer.createdAt)}`} · {totals.orderCount}{' '}
            {totals.orderCount === 1 ? 'order' : 'orders'}
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {contact.map((c) => (
          <Pressable
            key={c.label}
            accessibilityRole="button"
            onPress={c.onPress}
            style={({ pressed }) => [styles.contact, c.primary ? styles.contactPrimary : null, pressed ? { opacity: 0.7 } : null]}
          >
            <Icon name={c.icon} size={16} color={c.primary ? 'onPrimary' : 'text'} />
            <Txt variant="label" color={c.primary ? 'onPrimary' : 'text'}>
              {c.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          <Stat label="Order value" value={formatMoney(totals.valueCents, cur)} />
          <Stat label="Paid" value={formatMoney(totals.paidCents, cur)} />
          <Stat label="Outstanding" value={formatMoney(totals.balanceCents, cur)} danger={totals.balanceCents > 0} />
        </View>
        <Txt variant="caption" color="textTertiary">
          Order value is the total of all orders. Outstanding = order value − paid.
        </Txt>
      </Card>

      {unpaid[0] ? (
        <View style={styles.banner}>
          <Icon name="circle-alert" size={20} color="error" />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label" color="errorText">
              Owes {formatMoney(unpaid[0].money.balanceCents, cur)} on {orderNo(unpaid[0].order)}
            </Txt>
            <Txt variant="caption" color="errorText">
              {unpaid[0].description} · due {relativeDay(unpaid[0].order.dueAt).toLowerCase() === 'today' ? 'today' : new Date(unpaid[0].order.dueAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Txt>
          </View>
          {finance ? (
            <Button label="Record" variant="destructive" size="small" onPress={() => router.push(`/payment/new?orderId=${unpaid[0].order.id}`)} />
          ) : null}
        </View>
      ) : null}

      <SectionHeader title="Contact" />
      <ListCard verticalPadding={4}>
        {customer.phone ? <ContactLine icon="phone" text={customer.phone} onPress={() => Linking.openURL(`tel:${customer.phone.replace(/[^\d+]/g, '')}`)} /> : null}
        {customer.email ? <ContactLine icon="mail" text={customer.email} onPress={() => Linking.openURL(`mailto:${customer.email}`)} /> : null}
        {customer.address ? <ContactLine icon="map-pin" text={customer.address} /> : null}
        {!customer.phone && !customer.email && !customer.address ? <ContactLine icon="info" text="No contact details yet" /> : null}
      </ListCard>

      <SectionHeader
        title="Order history"
        link={views.length > 3 ? { label: showAll ? 'Show less' : `See all ${views.length}`, onPress: () => setShowAll((s) => !s) } : undefined}
      />
      {views.length === 0 ? (
        <EmptyState
          icon="clipboard-list"
          title="No orders yet"
          body={`Create ${customer.fullName.split(' ')[0]}’s first order to start tracking payments and pickups.`}
          action={{ label: 'Create order', onPress: () => router.push(`/order/new?customerId=${customer.id}`) }}
        />
      ) : (
        <ListCard>
          {shown.map((v) => (
            <OrderRow
              key={v.order.id}
              title={v.description}
              subtitle={`${orderNo(v.order)} · ${v.order.status === 'completed' ? `Completed ${new Date(v.order.completedAt ?? v.order.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : v.order.status === 'cancelled' ? 'Cancelled' : `Due ${new Date(v.order.dueAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`}`}
              amount={formatMoney(v.order.totalCents, cur)}
              status={v.badge}
              onPress={() => router.push(`/order/${v.order.id}`)}
            />
          ))}
        </ListCard>
      )}

      {customer.notes ? (
        <>
          <SectionHeader title="Notes" />
          <Card style={{ paddingVertical: 14 }}>
            <Txt variant="body" color="textSecondary">
              {customer.notes}
            </Txt>
          </Card>
        </>
      ) : null}

      <OptionSheet
        visible={menu}
        title={customer.fullName}
        options={[
          { value: 'edit', label: 'Edit customer' },
          { value: 'order', label: 'New order' },
          { value: 'delete', label: 'Delete customer', caption: 'Orders stay in reports' },
        ]}
        onSelect={(v) => {
          if (v === 'edit') router.push(`/customer/${customer.id}/edit`);
          if (v === 'order') router.push(`/order/new?customerId=${customer.id}`);
          if (v === 'delete') router.push(`/customer/${customer.id}/edit?confirmDelete=1`);
        }}
        onClose={() => setMenu(false)}
      />
    </Screen>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
      <Txt variant="figure" size={17} color={danger ? 'errorText' : 'text'}>
        {value}
      </Txt>
    </View>
  );
}

function ContactLine({ icon, text, onPress }: { icon: IconName; text: string; onPress?: () => void }) {
  const body = (
    <View style={styles.line}>
      <Icon name={icon} size={18} color="textSecondary" />
      <Txt variant="body" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="link" onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contact: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  contactPrimary: { backgroundColor: colors.ink, ...shadows.raised },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.error50,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
