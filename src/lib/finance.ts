/**
 * Financial rules — the single source of truth used by every screen.
 *
 * Definitions (from the Figma Finance / Reports notes):
 * - Order total        = Σ quantity × unit price of the order's items.
 * - Amount paid        = Σ payments recorded against the order.
 * - Balance due        = order total − amount paid (never below 0 for display).
 * - Revenue recorded   = Σ totals of non-cancelled orders CREATED in the period.
 * - Money received     = Σ payments COLLECTED (paidAt) in the period.
 * - Expenses           = Σ expenses spent in the period.
 * - Profit             = revenue recorded − expenses (does not subtract unpaid balances).
 * - Margin             = profit ÷ revenue recorded.
 * - Outstanding        = Σ balance due of non-cancelled orders, as of now.
 * - Overdue            = an order with a balance due whose due date has passed.
 * Cancelled orders keep their payment records but leave revenue and outstanding.
 */
import type { Cents, Expense, Order, Payment, PaymentStatus } from '@/data/types';
import { lineTotal, sumCents } from './money';

export interface DateRange {
  start: Date; // inclusive
  end: Date; // exclusive
}

export function inRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

export function orderItemsTotal(items: Order['items']): Cents {
  return sumCents(items.map((i) => lineTotal(i.quantity, i.unitPriceCents)));
}

export function paymentsByOrder(payments: Payment[]): Map<string, Payment[]> {
  const map = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = map.get(p.orderId);
    if (list) list.push(p);
    else map.set(p.orderId, [p]);
  }
  return map;
}

export interface OrderMoney {
  totalCents: Cents;
  paidCents: Cents;
  balanceCents: Cents;
  paymentStatus: PaymentStatus;
  overdue: boolean;
}

export function orderMoney(order: Order, payments: Payment[] | undefined, now = new Date()): OrderMoney {
  const paidCents = sumCents((payments ?? []).map((p) => p.amountCents));
  const balanceCents = Math.max(0, order.totalCents - paidCents);
  let paymentStatus: PaymentStatus;
  if (balanceCents === 0) paymentStatus = 'paid';
  else if (paidCents > 0) paymentStatus = 'partially_paid';
  else paymentStatus = 'unpaid';
  const overdue =
    order.status !== 'cancelled' && balanceCents > 0 && new Date(order.dueAt).getTime() < startOfDay(now).getTime();
  return { totalCents: order.totalCents, paidCents, balanceCents, paymentStatus, overdue };
}

/** Largest amount that may be recorded as a new payment for an order. */
export function maxPayable(order: Order, payments: Payment[] | undefined): Cents {
  if (order.status === 'cancelled') return 0;
  return orderMoney(order, payments).balanceCents;
}

export interface PeriodMetrics {
  revenueCents: Cents;
  receivedCents: Cents;
  expensesCents: Cents;
  profitCents: Cents;
  /** Whole-number percent, or null when there is no revenue. */
  marginPct: number | null;
  orderCount: number;
  averageOrderCents: Cents;
  paymentCount: number;
}

export function periodMetrics(
  data: { orders: Order[]; payments: Payment[]; expenses: Expense[] },
  range: DateRange,
): PeriodMetrics {
  const orders = data.orders.filter((o) => o.status !== 'cancelled' && inRange(o.createdAt, range));
  const payments = data.payments.filter((p) => inRange(p.paidAt, range));
  const revenueCents = sumCents(orders.map((o) => o.totalCents));
  const receivedCents = sumCents(payments.map((p) => p.amountCents));
  const expensesCents = sumCents(data.expenses.filter((e) => inRange(e.spentAt, range)).map((e) => e.amountCents));
  const profitCents = revenueCents - expensesCents;
  return {
    revenueCents,
    receivedCents,
    expensesCents,
    profitCents,
    marginPct: revenueCents > 0 ? Math.round((profitCents / revenueCents) * 100) : null,
    orderCount: orders.length,
    averageOrderCents: orders.length ? Math.round(revenueCents / orders.length) : 0,
    paymentCount: payments.length,
  };
}

export interface OutstandingSummary {
  totalCents: Cents;
  orders: { order: Order; money: OrderMoney }[];
  overdueCount: number;
  overdueCents: Cents;
}

export function outstanding(orders: Order[], payments: Payment[], now = new Date()): OutstandingSummary {
  const byOrder = paymentsByOrder(payments);
  const rows = orders
    .filter((o) => o.status !== 'cancelled')
    .map((order) => ({ order, money: orderMoney(order, byOrder.get(order.id), now) }))
    .filter((r) => r.money.balanceCents > 0);
  const overdue = rows.filter((r) => r.money.overdue);
  return {
    totalCents: sumCents(rows.map((r) => r.money.balanceCents)),
    orders: rows,
    overdueCount: overdue.length,
    overdueCents: sumCents(overdue.map((r) => r.money.balanceCents)),
  };
}

export function customerTotals(customerId: string, orders: Order[], payments: Payment[], now = new Date()) {
  const own = orders.filter((o) => o.customerId === customerId && o.status !== 'cancelled');
  const byOrder = paymentsByOrder(payments);
  const valueCents = sumCents(own.map((o) => o.totalCents));
  const moneys = own.map((o) => orderMoney(o, byOrder.get(o.id), now));
  const balanceCents = sumCents(moneys.map((m) => m.balanceCents));
  return {
    orderCount: orders.filter((o) => o.customerId === customerId).length,
    valueCents,
    paidCents: valueCents - balanceCents,
    balanceCents,
    overdue: moneys.some((m) => m.overdue),
  };
}

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

/** Month-to-date range: first of the month 00:00 → tomorrow 00:00. */
export function monthToDate(now = new Date()): DateRange {
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: addDays(startOfDay(now), 1) };
}

export function todayRange(now = new Date()): DateRange {
  const start = startOfDay(now);
  return { start, end: addDays(start, 1) };
}

/** Same-length window immediately before the given range, aligned to the previous month when month-to-date. */
export function previousComparable(range: DateRange): DateRange {
  const s = range.start;
  const isMonthStart = s.getDate() === 1 && s.getHours() === 0;
  if (isMonthStart) {
    const days = Math.round((range.end.getTime() - s.getTime()) / 86400000);
    const prevStart = new Date(s.getFullYear(), s.getMonth() - 1, 1);
    const prevMonthDays = new Date(s.getFullYear(), s.getMonth(), 0).getDate();
    return { start: prevStart, end: addDays(prevStart, Math.min(days, prevMonthDays)) };
  }
  const len = range.end.getTime() - s.getTime();
  return { start: new Date(s.getTime() - len), end: new Date(s.getTime()) };
}

/** Revenue recorded per day for the last `days` days ending today (oldest first). */
export function dailyRevenue(orders: Order[], days: number, now = new Date()) {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const start = addDays(today, i - (days - 1));
    const range = { start, end: addDays(start, 1) };
    const cents = sumCents(
      orders.filter((o) => o.status !== 'cancelled' && inRange(o.createdAt, range)).map((o) => o.totalCents),
    );
    return { date: start, cents };
  });
}
