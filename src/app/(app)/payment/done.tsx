import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { KeyValue, ListCard, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { fmtShort, fmtTime } from '@/lib/dates';
import { outstanding, periodMetrics, todayRange } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { METHOD_LABEL, orderNo, orderViews } from '@/state/selectors';
import { useWorkspace } from '@/state/session';
import { colors } from '@/theme/tokens';

/** Finance / 30 Payment Confirmation. */
export default function PaymentDone() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const payment = ws.payments.find((p) => p.id === paymentId);
  const view = payment ? orderViews(ws).find((v) => v.order.id === payment.orderId) : undefined;
  const cur = ws.business.currency;

  if (!payment || !view) return <Redirect href="/finance" />;

  const out = outstanding(ws.orders, ws.payments);
  const before = out.totalCents + payment.amountCents;
  const receivedToday = periodMetrics(ws, todayRange()).receivedCents;
  const first = view.customerName.split(' ')[0] ?? view.customerName;

  return (
    <Screen
      paddingTop={56}
      footer={
        <>
          <Button label="View updated order" onPress={() => router.replace(`/order/${view.order.id}`)} />
          <Button label="Done" variant="tertiary" onPress={() => router.dismissAll()} />
        </>
      }
    >
      <View style={{ alignItems: 'center', gap: 12 }}>
        <View style={styles.mark}>
          <View style={styles.markInner}>
            <Icon name="check" size={36} color="onPrimary" />
          </View>
          <View style={styles.point} />
        </View>
        <Txt variant="display" align="center" accessibilityRole="header">
          {formatMoney(payment.amountCents, cur)} received
        </Txt>
        <Txt variant="body" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
          {view.money.balanceCents === 0
            ? `${first}’s order ${orderNo(view.order)} is now paid in full.`
            : `${formatMoney(view.money.balanceCents, cur)} is still due on ${first}’s order ${orderNo(view.order)}.`}
        </Txt>
      </View>
      <ListCard verticalPadding={4}>
        <KeyValue label={`${orderNo(view.order)} balance`} value={formatMoney(view.money.balanceCents, cur)} valueColor={view.money.balanceCents === 0 ? 'successText' : 'errorText'} />
        <KeyValue label="Money received today" value={formatMoney(receivedToday, cur)} />
        <KeyValue label="Total outstanding" value={`${formatMoney(out.totalCents, cur)} (was ${formatMoney(before, cur)})`} />
        <KeyValue label="Method" value={`${METHOD_LABEL[payment.method]} · ${fmtShort(payment.paidAt)}, ${fmtTime(payment.paidAt)}`} valueVariant="bodyMedium" />
      </ListCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.success50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  markInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  point: { position: 'absolute', top: 8, left: 92, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
});
