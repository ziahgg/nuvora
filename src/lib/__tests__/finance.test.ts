import type { Expense, Order, Payment } from '@/data/types';
import { customerTotals, maxPayable, monthToDate, orderItemsTotal, orderMoney, outstanding, periodMetrics, previousComparable } from '../finance';

const NOW = new Date(2026, 9, 22, 11, 20); // Thu 22 Oct 2026, the Figma prototype's "today"

function order(p: Partial<Order> & { id: string; totalCents: number }): Order {
  return {
    businessId: 'b',
    number: 1000,
    customerId: 'c1',
    status: 'in_progress',
    dueAt: new Date(2026, 9, 24, 18).toISOString(),
    handover: 'pickup',
    handoverTime: '',
    notes: '',
    items: [],
    createdAt: new Date(2026, 9, 22, 9).toISOString(),
    createdByName: '',
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    ...p,
  };
}
const pay = (orderId: string, amountCents: number, paidAt = new Date(2026, 9, 22, 10).toISOString()): Payment => ({
  id: `${orderId}-${amountCents}-${paidAt}`,
  businessId: 'b',
  orderId,
  amountCents,
  method: 'card',
  paidAt,
  reference: '',
  recordedByName: '',
  createdAt: paidAt,
});
const expense = (amountCents: number, spentAt: string): Expense => ({
  id: `e${amountCents}`,
  businessId: 'b',
  amountCents,
  category: 'supplies',
  description: 'x',
  spentAt,
  paidWith: 'cash',
  receiptPath: null,
  recordedByName: '',
  createdAt: spentAt,
});

describe('orderMoney', () => {
  const o = order({ id: 'o1', totalCents: 4000 });
  it('classifies payment status', () => {
    expect(orderMoney(o, [], NOW).paymentStatus).toBe('unpaid');
    expect(orderMoney(o, [pay('o1', 2000)], NOW)).toMatchObject({ paidCents: 2000, balanceCents: 2000, paymentStatus: 'partially_paid' });
    expect(orderMoney(o, [pay('o1', 2000), pay('o1', 2000)], NOW)).toMatchObject({ balanceCents: 0, paymentStatus: 'paid' });
  });
  it('flags overdue only when money is owed past the due date', () => {
    const late = order({ id: 'o2', totalCents: 1200, status: 'completed', dueAt: new Date(2026, 9, 19, 18).toISOString() });
    expect(orderMoney(late, [], NOW).overdue).toBe(true);
    expect(orderMoney(late, [pay('o2', 1200)], NOW).overdue).toBe(false);
    expect(orderMoney({ ...late, status: 'cancelled' }, [], NOW).overdue).toBe(false);
    // Due earlier today is not yet overdue.
    expect(orderMoney({ ...late, dueAt: new Date(2026, 9, 22, 8).toISOString() }, [], NOW).overdue).toBe(false);
  });
  it('limits new payments to the balance, and to zero for cancelled orders', () => {
    expect(maxPayable(o, [pay('o1', 1500)])).toBe(2500);
    expect(maxPayable({ ...o, status: 'cancelled' }, [])).toBe(0);
  });
  it('totals items as quantity × unit price', () => {
    expect(
      orderItemsTotal([
        { id: 'a', serviceId: null, name: 'Wash & fold', unit: 'kg', quantity: 5, unitPriceCents: 300 },
        { id: 'b', serviceId: null, name: 'Express', unit: 'flat', quantity: 1, unitPriceCents: 500 },
      ]),
    ).toBe(2000);
  });
});

describe('periodMetrics', () => {
  const orders = [
    order({ id: 'a', totalCents: 2000 }),
    order({ id: 'b', totalCents: 3900 }),
    order({ id: 'c', totalCents: 1600, status: 'cancelled' }),
    order({ id: 'd', totalCents: 9999, createdAt: new Date(2026, 8, 30).toISOString() }), // previous month
  ];
  const payments = [pay('a', 2000), pay('d', 1000), pay('c', 500)];
  const expenses = [expense(45000, new Date(2026, 9, 1, 10).toISOString()), expense(3000, new Date(2026, 8, 20).toISOString())];
  const m = periodMetrics({ orders, payments, expenses }, monthToDate(NOW));

  it('counts revenue when orders are created, excluding cancelled orders', () => {
    expect(m.revenueCents).toBe(5900);
    expect(m.orderCount).toBe(2);
    expect(m.averageOrderCents).toBe(2950);
  });
  it('counts money received by payment date, including payments on cancelled orders', () => {
    expect(m.receivedCents).toBe(3500);
  });
  it('profit = revenue − expenses and margin is relative to revenue', () => {
    expect(m.expensesCents).toBe(45000);
    expect(m.profitCents).toBe(5900 - 45000);
    expect(m.marginPct).toBe(Math.round(((5900 - 45000) / 5900) * 100));
  });
  it('reports no margin without revenue', () => {
    expect(periodMetrics({ orders: [], payments: [], expenses: [] }, monthToDate(NOW)).marginPct).toBeNull();
  });
});

describe('outstanding & customers', () => {
  const orders = [
    order({ id: 'a', totalCents: 4000, customerId: 'mc' }),
    order({ id: 'b', totalCents: 1200, customerId: 'ew', status: 'completed', dueAt: new Date(2026, 9, 19).toISOString() }),
    order({ id: 'c', totalCents: 1600, customerId: 'lb', status: 'cancelled' }),
    order({ id: 'd', totalCents: 2800, customerId: 'sj', status: 'completed' }),
  ];
  const payments = [pay('a', 2000), pay('d', 2800)];

  it('sums balances of non-cancelled orders and counts overdue', () => {
    const o = outstanding(orders, payments, NOW);
    expect(o.totalCents).toBe(2000 + 1200);
    expect(o.orders.map((r) => r.order.id).sort()).toEqual(['a', 'b']);
    expect(o.overdueCount).toBe(1);
    expect(o.overdueCents).toBe(1200);
  });
  it('computes customer value, paid and outstanding (value − paid)', () => {
    expect(customerTotals('mc', orders, payments, NOW)).toMatchObject({ valueCents: 4000, paidCents: 2000, balanceCents: 2000, orderCount: 1 });
    expect(customerTotals('lb', orders, payments, NOW)).toMatchObject({ valueCents: 0, balanceCents: 0, orderCount: 1 });
  });
});

describe('previousComparable', () => {
  it('maps month-to-date onto the same days of the previous month', () => {
    const prev = previousComparable(monthToDate(NOW));
    expect(prev.start).toEqual(new Date(2026, 8, 1));
    expect(prev.end).toEqual(new Date(2026, 8, 23));
  });
  it('shifts arbitrary ranges back by their own length', () => {
    const r = { start: new Date(2026, 9, 10), end: new Date(2026, 9, 17) };
    expect(previousComparable(r)).toEqual({ start: new Date(2026, 9, 3), end: new Date(2026, 9, 10) });
  });
});
