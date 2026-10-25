import type { Cents, Workspace } from '@/data/types';
import { addDays, customerTotals, inRange, periodMetrics, startOfDay, type DateRange } from './finance';
import { sumCents } from './money';

export interface WeekRow {
  start: Date;
  end: Date;
  revenueCents: Cents;
  expensesCents: Cents;
  profitCents: Cents;
  partial: boolean;
}

/** Splits a range into 7-day buckets starting at range.start (last bucket may be partial). */
export function weeklyBreakdown(ws: Pick<Workspace, 'orders' | 'payments' | 'expenses'>, range: DateRange, now = new Date()): WeekRow[] {
  const rows: WeekRow[] = [];
  for (let s = startOfDay(range.start); s < range.end; s = addDays(s, 7)) {
    const e = new Date(Math.min(addDays(s, 7).getTime(), range.end.getTime()));
    const m = periodMetrics(ws, { start: s, end: e });
    rows.push({ start: s, end: e, revenueCents: m.revenueCents, expensesCents: m.expensesCents, profitCents: m.profitCents, partial: e.getTime() > startOfDay(now).getTime() && e.getTime() - s.getTime() < 7 * 86400000 });
  }
  return rows;
}

export function bestDay(ws: Pick<Workspace, 'orders'>, range: DateRange): { date: Date; cents: Cents } | null {
  let best: { date: Date; cents: Cents } | null = null;
  for (let d = startOfDay(range.start); d < range.end; d = addDays(d, 1)) {
    const cents = sumCents(ws.orders.filter((o) => o.status !== 'cancelled' && inRange(o.createdAt, { start: d, end: addDays(d, 1) })).map((o) => o.totalCents));
    if (cents > 0 && (!best || cents > best.cents)) best = { date: d, cents };
  }
  return best;
}

export interface ServiceShare {
  name: string;
  orders: number;
  share: number; // 0..1 of orders in range
}

/** How many orders in the range include each service (an order can count for several). */
export function ordersByService(ws: Pick<Workspace, 'orders'>, range: DateRange): ServiceShare[] {
  const orders = ws.orders.filter((o) => o.status !== 'cancelled' && inRange(o.createdAt, range));
  const counts = new Map<string, number>();
  for (const o of orders) {
    for (const name of new Set(o.items.map((i) => (i.name.includes('dry clean') ? 'Dry cleaning' : i.name)))) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, n]) => ({ name, orders: n, share: orders.length ? n / orders.length : 0 }))
    .sort((a, b) => b.orders - a.orders);
}

export function statusSplit(ws: Pick<Workspace, 'orders'>, range: DateRange) {
  const orders = ws.orders.filter((o) => inRange(o.createdAt, range));
  const count = (s: string) => orders.filter((o) => o.status === s).length;
  return { total: orders.length, completed: count('completed'), inProgress: count('in_progress'), cancelled: count('cancelled') };
}

export function turnaround(ws: Pick<Workspace, 'orders'>, range: DateRange) {
  const done = ws.orders.filter((o) => o.status === 'completed' && o.completedAt && inRange(o.createdAt, range));
  const days = done.map((o) => (new Date(o.completedAt!).getTime() - new Date(o.createdAt).getTime()) / 86400000);
  const onTime = done.filter((o) => new Date(o.completedAt!).getTime() <= new Date(o.dueAt).getTime()).length;
  return {
    averageDays: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
    completed: done.length,
    onTime,
  };
}

export function customerInsights(ws: Pick<Workspace, 'orders' | 'payments' | 'customers'>, range: DateRange, now = new Date()) {
  const newCount = ws.customers.filter((c) => inRange(c.createdAt, range)).length;
  const withOrders = ws.customers.map((c) => ws.orders.filter((o) => o.customerId === c.id && o.status !== 'cancelled').length).filter((n) => n > 0);
  const repeat = withOrders.filter((n) => n >= 2).length;
  const top = ws.customers
    .map((c) => {
      const own = ws.orders.filter((o) => o.customerId === c.id && o.status !== 'cancelled' && inRange(o.createdAt, range));
      return { customer: c, cents: sumCents(own.map((o) => o.totalCents)), orders: own.length, balanceCents: customerTotals(c.id, ws.orders, ws.payments, now).balanceCents };
    })
    .filter((r) => r.cents > 0)
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 3);
  return {
    total: ws.customers.length,
    newCount,
    repeatRate: withOrders.length ? Math.round((repeat / withOrders.length) * 100) : null,
    repeatCount: repeat,
    top,
  };
}

/** Regular customers (3+ orders) whose last order is older than twice their usual gap, at least 10 days. */
export function lapsedCustomers(ws: Pick<Workspace, 'orders' | 'customers'>, now = new Date()) {
  return ws.customers
    .map((c) => {
      const dates = ws.orders
        .filter((o) => o.customerId === c.id)
        .map((o) => new Date(o.createdAt).getTime())
        .sort((a, b) => a - b);
      if (dates.length < 3) return null;
      const gaps = dates.slice(1).map((d, i) => d - dates[i]);
      const usual = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const since = now.getTime() - dates[dates.length - 1];
      const daysSince = Math.floor(since / 86400000);
      return since > Math.max(2 * usual, 10 * 86400000) ? { customer: c, daysSince, usualDays: Math.max(1, Math.round(usual / 86400000)) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 3);
}
