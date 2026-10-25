import type { BadgeStatus } from '@/components/Badges';
import type { IconName } from '@/components/Icon';
import type { AppNotification, Customer, Order, Payment, PaymentMethod, Workspace } from '@/data/types';
import { fmtDay, fmtShort, fmtTime, relativeDay, relativeDayLower } from '@/lib/dates';
import { addDays, orderMoney, paymentsByOrder, startOfDay, type OrderMoney } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import type { ColorToken } from '@/theme/tokens';

export const METHOD_LABEL: Record<PaymentMethod, string> = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank transfer' };
export const orderNo = (o: Pick<Order, 'number'>) => `#NV-${o.number}`;

export function customerMap(ws: Workspace): Map<string, Customer> {
  return new Map(ws.customers.map((c) => [c.id, c]));
}

export function customerName(ws: Workspace, id: string): string {
  return ws.customers.find((c) => c.id === id)?.fullName ?? 'Deleted customer';
}

export interface OrderView {
  order: Order;
  customerName: string;
  money: OrderMoney;
  payments: Payment[];
  /** Badge shown in lists: order status, or "Overdue" when unpaid past due. */
  badge: BadgeStatus;
  summary: string;
  description: string;
}

export function serviceSummary(order: Order): string {
  const names = [...new Set(order.items.map((i) => i.name.replace(/ — .*/, '')))];
  if (names.length === 1 && order.items.length === 1) {
    const i = order.items[0];
    const unit = i.unit === 'kg' ? ` ${i.quantity} kg` : i.unit === 'shirt' ? ` · ${i.quantity} shirts` : '';
    return `${i.name}${unit}`;
  }
  if (order.items.every((i) => i.name.endsWith('dry clean'))) return 'Dry cleaning';
  return names.slice(0, 2).join(' + ');
}

export function orderViews(ws: Workspace, now = new Date()): OrderView[] {
  const byOrder = paymentsByOrder(ws.payments);
  const names = customerMap(ws);
  return ws.orders.map((order) => {
    const payments = byOrder.get(order.id) ?? [];
    const money = orderMoney(order, payments, now);
    const badge: BadgeStatus = money.overdue && order.status === 'completed' ? 'completed' : order.status;
    const pay =
      order.status === 'cancelled'
        ? `Cancelled ${fmtShort(order.cancelledAt ?? order.createdAt)}`
        : money.overdue
          ? 'Overdue'
          : money.paymentStatus === 'paid'
            ? 'Paid'
            : money.paymentStatus === 'unpaid'
              ? 'Unpaid'
              : `${formatMoney(money.balanceCents)} due`;
    const when =
      order.status === 'completed'
        ? `Picked up ${relativeDayLower(order.completedAt ?? order.dueAt, now)}`
        : `Due ${relativeDayLower(order.dueAt, now)}${relativeDay(order.dueAt, now) === 'Today' ? ' ' + fmtTime(order.dueAt) : ''}`;
    return {
      order,
      customerName: names.get(order.customerId)?.fullName ?? 'Deleted customer',
      money,
      payments,
      badge,
      summary: order.status === 'cancelled' ? `${orderNo(order)} · ${pay}` : `${orderNo(order)} · ${when} · ${pay}`,
      description: serviceSummary(order),
    };
  });
}

export function paymentStatusText(money: OrderMoney): { text: string; color: ColorToken } {
  if (money.overdue) return { text: `Overdue ${formatMoney(money.balanceCents)}`, color: 'errorText' };
  if (money.balanceCents > 0) return { text: `Owes ${formatMoney(money.balanceCents)}`, color: 'errorText' };
  return { text: 'Paid up', color: 'textSecondary' };
}

export interface ActivityItem {
  id: string;
  at: string;
  icon: IconName;
  tileBg: ColorToken;
  tileFg: ColorToken;
  title: string;
  subtitle: string;
  href: string;
}

/** Today's timeline: new orders, payments and completed orders (newest first). */
export function todaysActivity(ws: Workspace, now = new Date()): ActivityItem[] {
  const start = startOfDay(now).getTime();
  const end = addDays(startOfDay(now), 1).getTime();
  const isToday = (iso: string | null) => !!iso && new Date(iso).getTime() >= start && new Date(iso).getTime() < end;
  const names = customerMap(ws);
  const orders = new Map(ws.orders.map((o) => [o.id, o]));
  const items: ActivityItem[] = [];
  for (const p of ws.payments.filter((x) => isToday(x.paidAt))) {
    const o = orders.get(p.orderId);
    items.push({
      id: `p-${p.id}`,
      at: p.paidAt,
      icon: 'banknote',
      tileBg: 'success50',
      tileFg: 'success',
      title: `Payment · ${formatMoney(p.amountCents)}`,
      subtitle: `${names.get(o?.customerId ?? '')?.fullName ?? 'Customer'} · ${o ? orderNo(o) : ''} · ${METHOD_LABEL[p.method]}`,
      href: `/payment/${p.id}`,
    });
  }
  for (const o of ws.orders) {
    const who = names.get(o.customerId)?.fullName ?? 'Deleted customer';
    if (isToday(o.createdAt)) {
      items.push({
        id: `o-${o.id}`,
        at: o.createdAt,
        icon: 'clipboard-list',
        tileBg: 'primary50',
        tileFg: 'primary',
        title: `New order · ${formatMoney(o.totalCents)}`,
        subtitle: `${who} · ${orderNo(o)}`,
        href: `/order/${o.id}`,
      });
    }
    if (o.status === 'completed' && isToday(o.completedAt)) {
      items.push({
        id: `c-${o.id}`,
        at: o.completedAt!,
        icon: 'circle-check',
        tileBg: 'success50',
        tileFg: 'success',
        title: 'Order completed',
        subtitle: `${who} · ${orderNo(o)}`,
        href: `/order/${o.id}`,
      });
    }
  }
  for (const a of ws.appointments.filter((x) => x.status === 'completed' && isToday(x.startsAt))) {
    items.push({
      id: `a-${a.id}`,
      at: a.startsAt,
      icon: 'package',
      tileBg: 'muted',
      tileFg: 'textSecondary',
      title: `${a.type === 'delivery' ? 'Delivery' : a.type === 'pickup' ? 'Pickup' : 'Service'} completed`,
      subtitle: `${names.get(a.customerId)?.fullName ?? 'Customer'}${a.orderId && orders.get(a.orderId) ? ' · ' + orderNo(orders.get(a.orderId)!) : ''}`,
      href: `/schedule/${a.id}`,
    });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export interface NotificationView extends AppNotification {
  icon: IconName;
  tileBg: ColorToken;
  tileFg: ColorToken;
  href: string | null;
  derived?: boolean;
}

/**
 * Stored notifications (payments, team) plus reminders derived from live data
 * (overdue balances, orders due tomorrow, today's appointments), filtered by
 * the user's notification preferences.
 */
export function notificationFeed(ws: Workspace, now = new Date()): NotificationView[] {
  const prefs = ws.preferences;
  const views = orderViews(ws, now);
  const names = customerMap(ws);
  const out: NotificationView[] = [];
  const today9 = new Date(startOfDay(now));
  today9.setHours(9, 0, 0, 0);

  for (const n of ws.notifications) {
    if (n.kind === 'payment' && !prefs.notifyPayments) continue;
    const style: Record<string, [IconName, ColorToken, ColorToken]> = {
      payment: ['banknote', 'success50', 'success'],
      team: ['users', 'muted', 'textSecondary'],
      summary: ['receipt', 'muted', 'textSecondary'],
      order: ['clipboard-list', 'primary50', 'primary'],
      schedule: ['truck', 'primary50', 'primary'],
      overdue: ['triangle-alert', 'error50', 'error'],
    };
    const [icon, tileBg, tileFg] = style[n.kind];
    const orderMatch = n.body.match(/#NV-(\d+)/);
    const order = orderMatch ? ws.orders.find((o) => o.number === Number(orderMatch[1])) : undefined;
    out.push({ ...n, icon, tileBg, tileFg, href: order ? `/order/${order.id}` : n.kind === 'team' ? '/settings/team' : null });
  }

  if (prefs.notifyOverdue) {
    for (const v of views.filter((x) => x.money.overdue)) {
      out.push({
        id: `overdue-${v.order.id}`,
        businessId: ws.business.id,
        kind: 'overdue',
        title: `Payment overdue · ${v.customerName}`,
        body: `${orderNo(v.order)} · ${formatMoney(v.money.balanceCents)} was due ${fmtDay(v.order.dueAt)}.`,
        createdAt: today9.toISOString(),
        readAt: null,
        icon: 'triangle-alert',
        tileBg: 'error50',
        tileFg: 'error',
        href: `/order/${v.order.id}`,
        derived: true,
      });
    }
  }

  if (prefs.notifyAppointments) {
    const tomorrow = addDays(startOfDay(now), 1);
    for (const v of views.filter(
      (x) => x.order.status === 'in_progress' && startOfDay(new Date(x.order.dueAt)).getTime() === tomorrow.getTime(),
    )) {
      out.push({
        id: `due-${v.order.id}`,
        businessId: ws.business.id,
        kind: 'order',
        title: 'Order due tomorrow',
        body: `${orderNo(v.order)} · ${v.customerName}${v.order.handover === 'delivery' && v.order.handoverTime ? ` · delivery at ${v.order.handoverTime}` : ''}`,
        createdAt: new Date(startOfDay(now).getTime() + 8 * 3600_000).toISOString(),
        readAt: null,
        icon: 'clipboard-list',
        tileBg: 'primary50',
        tileFg: 'primary',
        href: `/order/${v.order.id}`,
        derived: true,
      });
    }
    for (const a of ws.appointments.filter(
      (x) => x.status === 'scheduled' && relativeDay(x.startsAt, now) === 'Today' && new Date(x.startsAt) > now,
    )) {
      const order = a.orderId ? ws.orders.find((o) => o.id === a.orderId) : undefined;
      out.push({
        id: `apt-${a.id}`,
        businessId: ws.business.id,
        kind: 'schedule',
        title: `${a.type === 'delivery' ? 'Delivery' : a.type === 'pickup' ? 'Pickup' : 'Appointment'} at ${fmtTime(a.startsAt)}`,
        body: [names.get(a.customerId)?.fullName, order ? orderNo(order) : null, a.location].filter(Boolean).join(' · '),
        createdAt: new Date(startOfDay(now).getTime() + 8.5 * 3600_000).toISOString(),
        readAt: null,
        icon: 'truck',
        tileBg: 'primary50',
        tileFg: 'primary',
        href: `/schedule/${a.id}`,
        derived: true,
      });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadCount(feed: NotificationView[]): number {
  return feed.filter((n) => !n.readAt && !n.derived).length + feed.filter((n) => n.derived).length;
}

export interface TxnView {
  kind: 'income' | 'expense';
  id: string;
  at: string;
  title: string;
  subtitle: string;
  cents: number;
  method: PaymentMethod;
  href: string;
  search: string;
}

/** Payments (money in) and expenses (money out), newest first. */
export function transactions(ws: Workspace, now = new Date()): TxnView[] {
  const orders = new Map(ws.orders.map((o) => [o.id, o]));
  const names = customerMap(ws);
  const income: TxnView[] = ws.payments.map((p) => {
    const o = orders.get(p.orderId);
    const who = names.get(o?.customerId ?? '')?.fullName ?? 'Deleted customer';
    const when = relativeDay(p.paidAt, now) === 'Today' ? `Today, ${fmtTime(p.paidAt)}` : `${fmtShort(p.paidAt)}, ${fmtTime(p.paidAt)}`;
    return {
      kind: 'income',
      id: p.id,
      at: p.paidAt,
      title: `Payment · ${o ? orderNo(o) : ''}`,
      subtitle: `${who} · ${when}`,
      cents: p.amountCents,
      method: p.method,
      href: `/payment/${p.id}`,
      search: `${who} ${o ? orderNo(o) : ''} ${p.reference}`.toLowerCase(),
    };
  });
  const expense: TxnView[] = ws.expenses.map((e) => ({
    kind: 'expense',
    id: e.id,
    at: e.spentAt,
    title: e.description,
    subtitle: `${e.category[0].toUpperCase()}${e.category.slice(1)} · ${fmtDay(e.spentAt)}`,
    cents: e.amountCents,
    method: e.paidWith,
    href: `/expense/${e.id}`,
    search: `${e.description} ${e.category}`.toLowerCase(),
  }));
  return [...income, ...expense].sort((a, b) => b.at.localeCompare(a.at));
}
