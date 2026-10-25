import type { Workspace } from '@/data/types';
import { orderMoney, paymentsByOrder } from './finance';

/** RFC 4180 field escaping. */
export function csvField(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n');
}

/** Cents as a plain decimal string ("1540.00") for spreadsheets. */
const amount = (cents: number) => `${cents < 0 ? '-' : ''}${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, '0')}`;

export function workspaceCsvFiles(ws: Workspace): { name: string; content: string }[] {
  const names = new Map(ws.customers.map((c) => [c.id, c.fullName]));
  const byOrder = paymentsByOrder(ws.payments);
  return [
    {
      name: 'customers.csv',
      content: toCsv(
        ['id', 'name', 'phone', 'email', 'address', 'notes', 'created_at'],
        ws.customers.map((c) => [c.id, c.fullName, c.phone, c.email, c.address, c.notes, c.createdAt]),
      ),
    },
    {
      name: 'orders.csv',
      content: toCsv(
        ['number', 'customer', 'status', 'created_at', 'due_at', 'total', 'paid', 'balance', 'items'],
        ws.orders.map((o) => {
          const m = orderMoney(o, byOrder.get(o.id));
          return [
            `NV-${o.number}`,
            names.get(o.customerId) ?? 'Deleted customer',
            o.status,
            o.createdAt,
            o.dueAt,
            amount(m.totalCents),
            amount(m.paidCents),
            amount(m.balanceCents),
            o.items.map((i) => `${i.quantity}x ${i.name}`).join('; '),
          ];
        }),
      ),
    },
    {
      name: 'payments.csv',
      content: toCsv(
        ['reference', 'order', 'customer', 'paid_at', 'method', 'amount'],
        ws.payments.map((p) => {
          const o = ws.orders.find((x) => x.id === p.orderId);
          return [p.reference, o ? `NV-${o.number}` : '', names.get(o?.customerId ?? '') ?? '', p.paidAt, p.method, amount(p.amountCents)];
        }),
      ),
    },
    {
      name: 'expenses.csv',
      content: toCsv(
        ['spent_at', 'category', 'description', 'paid_with', 'amount'],
        ws.expenses.map((e) => [e.spentAt, e.category, e.description, e.paidWith, amount(e.amountCents)]),
      ),
    },
  ];
}
