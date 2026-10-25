/**
 * Demo dataset — "FreshFold Laundry", the shared dataset of the Figma
 * prototype. Dates are generated relative to the current day so the
 * dashboard always has a "today".
 */
import type {
  AppNotification,
  Appointment,
  Business,
  Customer,
  Expense,
  Member,
  Order,
  OrderItem,
  Payment,
  Preferences,
  Service,
} from '../types';
import { DEFAULT_PREFERENCES } from '../types';

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
}

export interface LocalDB {
  version: 1;
  users: DemoUser[];
  sessionUserId: string | null;
  businesses: Business[];
  nextOrderNumber: Record<string, number>;
  members: Member[];
  services: Service[];
  customers: (Customer & { deletedAt: string | null })[];
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
  appointments: Appointment[];
  notifications: AppNotification[];
  preferences: Record<string, Preferences>;
}

/** Demo-mode account (on-device only; documented in README). */
export const DEMO_EMAIL = 'maya@freshfold.co';
export const DEMO_PASSWORD = 'freshfold123';

const BIZ = 'demo-business';

function day(offset: number, hh = 9, mm = 0, base = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

let seq = 0;
const id = (p: string) => `${p}-${(++seq).toString(36)}`;

export function buildSeed(passwordHash: string, now = new Date()): LocalDB {
  seq = 0;
  const at = (offset: number, hh?: number, mm?: number) => day(offset, hh, mm, now);
  // Things that already happened (created, paid, completed, spent) are never seeded in the future.
  const past = (iso: string) => (new Date(iso).getTime() > now.getTime() ? new Date(now.getTime() - 60_000).toISOString() : iso);

  const business: Business = {
    id: BIZ,
    name: 'FreshFold Laundry',
    category: 'laundry',
    currency: 'USD',
    phone: '+1 (415) 555-0142',
    email: 'hello@freshfold.co',
    address: '14 Market St, San Francisco',
    openingHours: 'Mon–Sat · 08:00–19:00',
    receiptFooter: 'Thank you for choosing FreshFold! Items unclaimed after 30 days may be donated.',
    createdAt: new Date(2024, 0, 8).toISOString(),
  };

  const owner: DemoUser = { id: 'user-maya', email: DEMO_EMAIL, fullName: 'Maya Santos', passwordHash };

  const members: Member[] = [
    { id: 'm-maya', businessId: BIZ, userId: owner.id, fullName: 'Maya Santos', email: DEMO_EMAIL, role: 'owner', status: 'active', createdAt: business.createdAt },
    { id: 'm-daniel', businessId: BIZ, userId: 'user-daniel', fullName: 'Daniel Ortiz', email: 'daniel@freshfold.co', role: 'staff', status: 'active', createdAt: at(-1, 15) },
    { id: 'm-lina', businessId: BIZ, userId: null, fullName: 'Lina Park', email: 'lina@freshfold.co', role: 'manager', status: 'pending', createdAt: at(-1, 16) },
  ];

  const svc = (name: string, unit: Service['unit'], priceCents: number, sortOrder: number): Service => ({
    id: id('svc'), businessId: BIZ, name, unit, priceCents, sortOrder, active: true,
  });
  const washFold = svc('Wash & fold', 'kg', 300, 1);
  const express = svc('Express same-day', 'flat', 500, 2);
  const ironing = svc('Ironing', 'shirt', 200, 3);
  const dryClean = svc('Dry cleaning', 'item', 1600, 4);
  const bedding = svc('Bedding set', 'set', 1500, 5);
  const services = [washFold, express, ironing, dryClean, bedding];

  const cust = (
    key: string,
    fullName: string,
    phone: string,
    email: string,
    address: string,
    notes: string,
    createdAt: string,
  ) => ({ id: `cust-${key}`, businessId: BIZ, fullName, phone, email, address, notes, createdAt, deletedAt: null });
  const customers = [
    cust('sarah', 'Sarah Johnson', '+1 (415) 555-0101', 'sarah.j@email.com', '9 Bay View Ct', '', new Date(2024, 2, 4).toISOString()),
    cust('michael', 'Michael Chen', '+1 (415) 555-0187', 'm.chen@email.com', '48 Harbor Ave, Apt 3B', 'Prefers hang-dry for shirts. Call before delivery.', new Date(2025, 2, 11).toISOString()),
    cust('aisha', 'Aisha Rahman', '+1 (415) 555-0174', 'aisha.r@email.com', '22 Rose Lane', '', new Date(2025, 5, 2).toISOString()),
    cust('david', 'David Miller', '+1 (415) 555-0118', 'd.miller@email.com', '5 Park Road, Unit 2', '', new Date(2024, 3, 19).toISOString()),
    cust('emma', 'Emma Wilson', '+1 (415) 555-0152', 'emma.w@email.com', '31 Oak Street', '', new Date(2025, 7, 7).toISOString()),
    cust('priya', 'Priya Patel', '+1 (415) 555-0129', 'priya.p@email.com', '7 Lincoln Way', '', new Date(2025, 0, 23).toISOString()),
    cust('james', 'James Lee', '+1 (415) 555-0166', 'james.lee@email.com', '12 Elm Street', '', new Date(2025, 8, 1).toISOString()),
    cust('lucas', 'Lucas Brown', '+1 (415) 555-0193', 'lucas.b@email.com', '3 Pine Court', '', new Date(2025, 9, 1).toISOString()),
  ];
  const C = Object.fromEntries(customers.map((c) => [c.id.replace('cust-', ''), c.id])) as Record<string, string>;

  const orders: Order[] = [];
  const payments: Payment[] = [];
  let payRef = 1;

  const item = (s: Service, quantity: number, name = s.name, unitPriceCents = s.priceCents): OrderItem => ({
    id: id('item'), serviceId: s.id, name, unit: s.unit, quantity, unitPriceCents,
  });

  function addOrder(o: {
    number: number;
    customer: string;
    items: OrderItem[];
    createdAt: string;
    dueAt: string;
    status?: Order['status'];
    handover?: Order['handover'];
    handoverTime?: string;
    completedAt?: string | null;
    cancelledAt?: string | null;
    notes?: string;
  }): Order {
    const number = o.number;
    const order: Order = {
      id: `ord-${number}`,
      businessId: BIZ,
      number,
      customerId: o.customer,
      status: o.status ?? 'completed',
      dueAt: o.dueAt,
      handover: o.handover ?? 'pickup',
      handoverTime: o.handoverTime ?? '',
      notes: o.notes ?? '',
      items: o.items,
      totalCents: o.items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0),
      createdAt: past(o.createdAt),
      createdByName: 'Maya',
      startedAt: past(o.createdAt),
      completedAt: (() => {
        const done = o.completedAt ?? (o.status === 'completed' || !o.status ? o.dueAt : null);
        return done ? past(done) : null;
      })(),
      cancelledAt: o.cancelledAt ? past(o.cancelledAt) : null,
    };
    orders.push(order);
    return order;
  }

  function pay(order: Order, amountCents: number, method: Payment['method'], paidAtRaw: string) {
    const paidAt = past(paidAtRaw);
    const d = new Date(paidAt);
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    payments.push({
      id: id('pay'),
      businessId: BIZ,
      orderId: order.id,
      amountCents,
      method,
      paidAt,
      reference: `PAY-${ymd}-${String(payRef++).padStart(4, '0')}`,
      recordedByName: 'Maya Santos',
      createdAt: paidAt,
    });
  }

  // ── History: completed, paid orders over the previous ~6 weeks (deterministic). ──
  const regulars = ['sarah', 'michael', 'aisha', 'david', 'priya', 'james', 'emma', 'sarah', 'david', 'michael'];
  const dailyTargets: Record<number, number> = { [-6]: 12000, [-5]: 16800, [-4]: 6400, [-3]: 9800, [-2]: 11200, [-1]: 12400 };
  for (let offset = -42; offset <= -1; offset++) {
    const weekday = new Date(at(offset)).getDay();
    if (weekday === 0 && !(offset in dailyTargets)) continue; // closed most Sundays
    let target = dailyTargets[offset] ?? 8400 + ((offset * 37) % 5) * 1500;
    if (offset === -6) target -= 1200; // NV-1047 below
    if (offset === -1) target -= 4000; // NV-1049 below
    if (offset === -5) target -= 2200; // NV-1044 below
    let slot = 0;
    while (target >= 200) {
      // Orders of roughly $12–$27; a leftover under $9 is folded into the last order of the day.
      let chunk = Math.min(target, 1200 + ((Math.abs(offset) * 7 + slot * 5) % 6) * 300);
      if (target - chunk < 900 || slot === 6) chunk = target;
      // Any multiple of $1 from $2 up is a mix of wash & fold ($3/kg) and ironing ($2/shirt).
      const shirts = [0, 1, 2].find((b) => (chunk - b * 200) % 300 === 0 && chunk - b * 200 >= 0) ?? 0;
      const kg = (chunk - shirts * 200) / 300;
      const items = [...(kg > 0 ? [item(washFold, kg)] : []), ...(shirts > 0 ? [item(ironing, shirts)] : [])];
      const total = items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
      const who = C[regulars[(Math.abs(offset) + slot) % regulars.length]];
      const o = addOrder({
        number: -orders.length - 1, // temporary; renumbered below
        customer: who,
        items,
        createdAt: at(offset, 8 + slot * 2, 10 + slot * 7),
        dueAt: at(offset + 1, 17),
        completedAt: at(offset, 17, 30 + slot),
      });
      pay(o, total, slot % 2 ? 'card' : 'cash', at(offset, 17, 30 + slot)); // paid at collection the same day
      target -= total;
      slot++;
      if (total === 0 || slot > 6) break;
    }
  }

  // ── The named orders from the Figma prototype. ──
  const n1044 = addOrder({ number: 1044, customer: C.priya, items: [item(washFold, 4), item(ironing, 5)], createdAt: at(-5, 11, 5), dueAt: at(-4, 17), completedAt: at(-4, 17, 30) });
  pay(n1044, 2200, 'cash', at(-4, 17, 30));
  addOrder({ number: 1046, customer: C.lucas, items: [item(washFold, 4), item(ironing, 2)], createdAt: at(-5, 15), dueAt: at(-3, 17), status: 'cancelled', cancelledAt: at(-4, 10) });
  addOrder({ number: 1047, customer: C.emma, items: [item(washFold, 4)], createdAt: at(-6, 9, 30), dueAt: at(-3, 18), completedAt: at(-6, 16) });
  const n1048 = addOrder({ number: 1048, customer: C.sarah, items: [item(washFold, 6), item(ironing, 5)], createdAt: at(0, 8, 20), dueAt: at(0, 12), completedAt: at(0, 8, 38) });
  pay(n1048, 2800, 'cash', at(0, 8, 40));
  const n1049 = addOrder({
    number: 1049,
    customer: C.michael,
    items: [item(dryClean, 1, 'Suit — dry clean', 2200), item(dryClean, 1, 'Coat — dry clean', 1800)],
    createdAt: at(-1, 16, 20),
    dueAt: at(2, 18),
    status: 'in_progress',
    handover: 'delivery',
    handoverTime: '10:00',
  });
  pay(n1049, 2000, 'card', at(0, 10, 42));
  addOrder({ number: 1050, customer: C.aisha, items: [item(washFold, 8), item(bedding, 1)], createdAt: at(0, 9, 50), dueAt: at(1, 18), status: 'in_progress', handover: 'delivery', handoverTime: '09:30' });
  const n1051 = addOrder({ number: 1051, customer: C.david, items: [item(ironing, 10)], createdAt: at(0, 9, 12), dueAt: at(0, 15), status: 'in_progress', handover: 'delivery', handoverTime: '14:30' });
  pay(n1051, 2000, 'card', at(0, 9, 15));

  // History orders count down from #NV-1043 (newest) so numbers stay unique and
  // increase with creation time; payments are re-pointed to the new ids.
  const idMap = new Map<string, string>();
  orders
    .filter((o) => o.number < 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((o, index) => {
      const oldId = o.id;
      o.number = 1043 - index;
      o.id = `ord-${o.number}`;
      idMap.set(oldId, o.id);
    });
  for (const p of payments) p.orderId = idMap.get(p.orderId) ?? p.orderId;

  const expenses: Expense[] = [];
  const expense = (description: string, category: Expense['category'], amountCents: number, spentAt: string, paidWith: Expense['paidWith']) =>
    expenses.push({ id: id('exp'), businessId: BIZ, amountCents, category, description, spentAt: past(spentAt), paidWith, receiptPath: null, recordedByName: 'Maya Santos', createdAt: past(spentAt) });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 9);
  const dom = (d: number) => new Date(monthStart.getFullYear(), monthStart.getMonth(), d, 10).toISOString();
  expense(`${monthStart.toLocaleString('en-US', { month: 'long' })} rent`, 'rent', 45000, dom(1), 'bank_transfer');
  expense('Electricity', 'utilities', 9000, dom(3), 'bank_transfer');
  expense('Part-time wages', 'wages', 10000, dom(5), 'cash');
  expense('Garment bags', 'supplies', 13000, dom(Math.min(10, now.getDate())), 'card');
  expense('Detergent & softener', 'supplies', 14000, at(-7, 11), 'bank_transfer');
  expense('Machine repair', 'equipment', 3000, at(-4, 12), 'card');

  const appointments: Appointment[] = [
    { id: id('apt'), businessId: BIZ, type: 'delivery', customerId: C.sarah, orderId: null, startsAt: at(-3, 11), durationMin: 30, location: '9 Bay View Ct', status: 'completed', remind: true, assignedToName: 'Daniel Ortiz', notes: '' },
    { id: id('apt'), businessId: BIZ, type: 'pickup', customerId: C.michael, orderId: n1049.id, startsAt: at(-1, 16), durationMin: 15, location: '48 Harbor Ave', status: 'completed', remind: true, assignedToName: 'Daniel Ortiz', notes: '' },
    { id: id('apt'), businessId: BIZ, type: 'pickup', customerId: C.aisha, orderId: 'ord-1050', startsAt: at(0, 10), durationMin: 15, location: '22 Rose Lane', status: 'completed', remind: true, assignedToName: 'Daniel Ortiz', notes: '' },
    { id: id('apt'), businessId: BIZ, type: 'delivery', customerId: C.david, orderId: 'ord-1051', startsAt: at(0, 14, 30), durationMin: 30, location: '5 Park Road, Unit 2', status: 'scheduled', remind: true, assignedToName: 'Daniel Ortiz', notes: 'Leave with the building concierge if no answer.' },
    { id: id('apt'), businessId: BIZ, type: 'pickup', customerId: C.james, orderId: null, startsAt: at(0, 17), durationMin: 15, location: '12 Elm Street', status: 'scheduled', remind: true, assignedToName: '', notes: '' },
    { id: id('apt'), businessId: BIZ, type: 'delivery', customerId: C.aisha, orderId: 'ord-1050', startsAt: at(1, 9, 30), durationMin: 30, location: '22 Rose Lane', status: 'scheduled', remind: true, assignedToName: 'Daniel Ortiz', notes: 'Collect $39.00 on delivery.' },
    { id: id('apt'), businessId: BIZ, type: 'delivery', customerId: C.michael, orderId: n1049.id, startsAt: at(2, 10), durationMin: 30, location: '48 Harbor Ave', status: 'scheduled', remind: true, assignedToName: 'Daniel Ortiz', notes: '' },
  ];

  const notifications: AppNotification[] = [
    { id: id('ntf'), businessId: BIZ, kind: 'payment', title: 'Payment received · $20.00', body: 'Michael Chen paid by card for #NV-1049. $20.00 still due.', createdAt: past(at(0, 10, 42)), readAt: null },
    { id: id('ntf'), businessId: BIZ, kind: 'payment', title: 'Payment received · $20.00', body: 'David Miller paid by card for #NV-1051. Paid in full.', createdAt: past(at(0, 9, 15)), readAt: past(at(0, 9, 30)) },
    { id: id('ntf'), businessId: BIZ, kind: 'team', title: 'Daniel Ortiz joined your team', body: 'Role: Staff', createdAt: at(-1, 15), readAt: at(-1, 18) },
  ];

  return {
    version: 1,
    users: [owner],
    sessionUserId: null,
    businesses: [business],
    nextOrderNumber: { [BIZ]: 1052 },
    members,
    services,
    customers,
    orders,
    payments,
    expenses,
    appointments,
    notifications,
    preferences: { [owner.id]: { ...DEFAULT_PREFERENCES } },
  };
}
