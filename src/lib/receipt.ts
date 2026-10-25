import type { Business, Customer, Order, Payment } from '@/data/types';
import { fmtDayTime } from './dates';
import { orderMoney } from './finance';
import { formatMoney, lineTotal } from './money';

const METHOD: Record<Payment['method'], string> = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank transfer' };

/** Plain-text receipt shared through the system share sheet (SMS, WhatsApp, email…). */
export function buildReceipt(business: Business, order: Order, customer: Customer | undefined, payments: Payment[]): string {
  const cur = business.currency;
  const money = orderMoney(order, payments);
  const lines = [
    business.name,
    [business.address, business.phone].filter(Boolean).join(' · '),
    '',
    `Receipt for order #NV-${order.number}`,
    `Customer: ${customer?.fullName ?? '—'}`,
    `Date: ${fmtDayTime(order.createdAt)}`,
    '',
    ...order.items.map((i) => `${i.quantity} × ${i.name} @ ${formatMoney(i.unitPriceCents, cur)} = ${formatMoney(lineTotal(i.quantity, i.unitPriceCents), cur)}`),
    '',
    `Total: ${formatMoney(money.totalCents, cur)}`,
    ...payments.map((p) => `Paid ${fmtDayTime(p.paidAt)} (${METHOD[p.method]}): ${formatMoney(p.amountCents, cur)}`),
    `Balance due: ${formatMoney(money.balanceCents, cur)}`,
  ];
  if (order.status === 'cancelled') lines.push('', 'This order was cancelled.');
  if (business.receiptFooter) lines.push('', business.receiptFooter);
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}
