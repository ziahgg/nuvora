/**
 * On-device demo backend, used when no Supabase project is configured.
 * Data lives in AsyncStorage on this phone only. It enforces the same rules as
 * the database (payment ≤ balance, totals derived from items, role checks,
 * sequential order numbers) so the app behaves identically in both modes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { orderItemsTotal } from '@/lib/finance';
import { formatMoney, sumCents } from '@/lib/money';
import { AppError, type DataService, type SessionUser } from '../service';
import { DEFAULT_PREFERENCES, type Member, type Order, type Role, type Workspace } from '../types';
import { buildSeed, DEMO_PASSWORD, type LocalDB } from './seed';

const KEY = 'nuvora.demo.v1';
const LATENCY_MS = 120;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hash = (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
const uid = (prefix: string) => `${prefix}-${Crypto.randomUUID()}`;
const nowIso = () => new Date().toISOString();

export function createLocalService(): DataService {
  let db: LocalDB | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<(u: SessionUser | null) => void>();

  async function load(): Promise<LocalDB> {
    if (db) return db;
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      db = JSON.parse(raw) as LocalDB;
    } else {
      db = buildSeed(await hash(DEMO_PASSWORD));
      await AsyncStorage.setItem(KEY, JSON.stringify(db));
    }
    return db;
  }

  /** Serialises writes so concurrent mutations can't interleave. */
  function write<T>(fn: (d: LocalDB) => T | Promise<T>): Promise<T> {
    const run = queue.then(async () => {
      await sleep(LATENCY_MS);
      const d = await load();
      const result = await fn(d);
      await AsyncStorage.setItem(KEY, JSON.stringify(d));
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  async function read<T>(fn: (d: LocalDB) => T): Promise<T> {
    await sleep(LATENCY_MS);
    return fn(await load());
  }

  function sessionUser(d: LocalDB): SessionUser | null {
    const u = d.users.find((x) => x.id === d.sessionUserId);
    return u ? { id: u.id, email: u.email, fullName: u.fullName } : null;
  }

  function emit(d: LocalDB) {
    const u = sessionUser(d);
    listeners.forEach((l) => l(u));
  }

  function requireMember(d: LocalDB, businessId: string, roles: Role[] = ['owner', 'manager', 'staff']): Member {
    const m = d.members.find((x) => x.businessId === businessId && x.userId === d.sessionUserId && x.status === 'active');
    if (!m) throw new AppError('Your session has ended. Sign in again.', 'auth');
    if (!roles.includes(m.role)) throw new AppError('Your role doesn’t allow this action.', 'forbidden');
    return m;
  }

  function findOrder(d: LocalDB, orderId: string): Order {
    const o = d.orders.find((x) => x.id === orderId);
    if (!o) throw new AppError('This order no longer exists.', 'not_found');
    return o;
  }

  const paidFor = (d: LocalDB, orderId: string) =>
    sumCents(d.payments.filter((p) => p.orderId === orderId).map((p) => p.amountCents));

  function insertPayment(d: LocalDB, businessId: string, orderId: string, amountCents: number, method: 'cash' | 'card' | 'bank_transfer', paidAt: string, by: Member) {
    const order = findOrder(d, orderId);
    if (order.status === 'cancelled') throw new AppError('Payments can’t be added to a cancelled order.', 'validation');
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new AppError('Enter an amount above zero.', 'validation');
    const balance = order.totalCents - paidFor(d, orderId);
    if (amountCents > balance) throw new AppError('That’s more than the balance due on this order.', 'validation');
    const day = paidAt.slice(0, 10).replace(/-/g, '');
    const count = d.payments.filter((p) => p.paidAt.slice(0, 10) === paidAt.slice(0, 10)).length + 1;
    const id = uid('pay');
    d.payments.unshift({
      id,
      businessId,
      orderId,
      amountCents,
      method,
      paidAt,
      reference: `PAY-${day}-${String(count).padStart(4, '0')}`,
      recordedByName: by.fullName,
      createdAt: nowIso(),
    });
    const customer = d.customers.find((c) => c.id === order.customerId);
    const remaining = balance - amountCents;
    d.notifications.unshift({
      id: uid('ntf'),
      businessId,
      kind: 'payment',
      title: `Payment received · ${formatMoney(amountCents)}`,
      body: `${customer?.fullName ?? 'Customer'} paid by ${method.replace('_', ' ')} for #NV-${order.number}. ${
        remaining > 0 ? `${formatMoney(remaining)} still due.` : 'Paid in full.'
      }`,
      createdAt: nowIso(),
      readAt: null,
    });
    return id;
  }

  return {
    mode: 'demo',

    getSession: () => read((d) => sessionUser(d)),

    onAuthChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    signUp: ({ fullName, email, password }) =>
      write(async (d) => {
        const normalized = email.trim().toLowerCase();
        if (d.users.some((u) => u.email === normalized)) {
          throw new AppError('An account with this email already exists. Sign in instead.', 'conflict');
        }
        const user = { id: uid('user'), email: normalized, fullName: fullName.trim(), passwordHash: await hash(password) };
        d.users.push(user);
        d.preferences[user.id] = { ...DEFAULT_PREFERENCES };
        // Accept a pending invite for this email, as the database trigger does.
        for (const m of d.members.filter((x) => x.email === normalized && x.status === 'pending')) {
          m.userId = user.id;
          m.status = 'active';
          m.fullName = user.fullName || m.fullName;
        }
        d.sessionUserId = user.id;
        queueMicrotask(() => emit(d));
        return { status: 'signed_in' as const, user: { id: user.id, email: user.email, fullName: user.fullName } };
      }),

    signIn: ({ email, password }) =>
      write(async (d) => {
        const u = d.users.find((x) => x.email === email.trim().toLowerCase());
        if (!u || u.passwordHash !== (await hash(password))) {
          throw new AppError('Email or password is incorrect.', 'auth');
        }
        d.sessionUserId = u.id;
        queueMicrotask(() => emit(d));
        return { id: u.id, email: u.email, fullName: u.fullName };
      }),

    signOut: () =>
      write((d) => {
        d.sessionUserId = null;
        queueMicrotask(() => emit(d));
      }),

    async sendPasswordReset(email) {
      await sleep(LATENCY_MS);
      if (!email.includes('@')) throw new AppError('Enter a valid email address.', 'validation');
      // Demo mode has no email delivery; the screen states this honestly.
    },

    loadWorkspace: () =>
      read((d): Workspace | null => {
        if (!d.sessionUserId) throw new AppError('Your session has ended. Sign in again.', 'auth');
        const member = d.members.find((m) => m.userId === d.sessionUserId && m.status === 'active');
        if (!member) return null;
        const bid = member.businessId;
        const business = d.businesses.find((b) => b.id === bid);
        if (!business) return null;
        const finance = member.role !== 'staff';
        const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
        return clone({
          business,
          member,
          members: d.members.filter((m) => m.businessId === bid),
          services: d.services.filter((s) => s.businessId === bid).sort((a, b) => a.sortOrder - b.sortOrder),
          customers: d.customers
            .filter((c) => c.businessId === bid && !c.deletedAt)
            .map(({ deletedAt: _deleted, ...c }) => c)
            .sort((a, b) => a.fullName.localeCompare(b.fullName)),
          orders: d.orders.filter((o) => o.businessId === bid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          payments: d.payments.filter((p) => p.businessId === bid).sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
          expenses: finance
            ? d.expenses.filter((e) => e.businessId === bid).sort((a, b) => b.spentAt.localeCompare(a.spentAt))
            : [],
          appointments: d.appointments.filter((a) => a.businessId === bid).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
          notifications: d.notifications.filter((n) => n.businessId === bid).slice(0, 50),
          preferences: d.preferences[d.sessionUserId] ?? { ...DEFAULT_PREFERENCES },
        });
      }),

    createBusiness: (input) =>
      write((d) => {
        const user = d.users.find((u) => u.id === d.sessionUserId);
        if (!user) throw new AppError('Your session has ended. Sign in again.', 'auth');
        const id = uid('biz');
        const business = {
          id,
          name: input.name.trim(),
          category: input.category,
          currency: input.currency,
          phone: input.phone.trim(),
          email: input.email.trim().toLowerCase(),
          address: '',
          openingHours: '',
          receiptFooter: '',
          createdAt: nowIso(),
        };
        d.businesses.push(business);
        d.nextOrderNumber[id] = 1001;
        d.members.push({ id: uid('mem'), businessId: id, userId: user.id, fullName: user.fullName, email: user.email, role: 'owner', status: 'active', createdAt: nowIso() });
        if (input.category === 'laundry') {
          (
            [
              ['Wash & fold', 'kg', 300],
              ['Express same-day', 'flat', 500],
              ['Ironing', 'shirt', 200],
              ['Dry cleaning', 'item', 1600],
            ] as const
          ).forEach(([name, unit, priceCents], i) =>
            d.services.push({ id: uid('svc'), businessId: id, name, unit, priceCents, sortOrder: i + 1, active: true }),
          );
        }
        return business;
      }),

    updateBusiness: (businessId, patch) =>
      write((d) => {
        requireMember(d, businessId, ['owner']);
        const b = d.businesses.find((x) => x.id === businessId);
        if (!b) throw new AppError('Business not found.', 'not_found');
        Object.assign(b, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
      }),

    updatePreferences: (prefs) =>
      write((d) => {
        if (!d.sessionUserId) throw new AppError('Your session has ended. Sign in again.', 'auth');
        d.preferences[d.sessionUserId] = { ...prefs };
      }),

    createCustomer: (businessId, input) =>
      write((d) => {
        requireMember(d, businessId);
        const c = { id: uid('cust'), businessId, ...input, createdAt: nowIso(), deletedAt: null };
        d.customers.push(c);
        const { deletedAt: _deleted, ...customer } = c;
        return customer;
      }),

    updateCustomer: (customerId, input) =>
      write((d) => {
        const c = d.customers.find((x) => x.id === customerId && !x.deletedAt);
        if (!c) throw new AppError('This customer no longer exists.', 'not_found');
        requireMember(d, c.businessId);
        Object.assign(c, input);
      }),

    deleteCustomer: (customerId) =>
      write((d) => {
        const c = d.customers.find((x) => x.id === customerId);
        if (!c) throw new AppError('This customer no longer exists.', 'not_found');
        requireMember(d, c.businessId);
        c.deletedAt = nowIso();
      }),

    saveOrder: (businessId, orderId, input) =>
      write((d) => {
        const by = requireMember(d, businessId);
        if (!input.items.length) throw new AppError('Add at least one service to the order.', 'validation');
        if (!d.customers.some((c) => c.id === input.customerId && c.businessId === businessId && !c.deletedAt)) {
          throw new AppError('Choose a customer for this order.', 'validation');
        }
        const items = input.items.map((i) => ({ ...i, id: uid('item') }));
        const totalCents = orderItemsTotal(items);
        if (orderId) {
          const o = findOrder(d, orderId);
          if (o.status === 'cancelled') throw new AppError('Cancelled orders can’t be edited.', 'validation');
          if (totalCents < paidFor(d, orderId)) {
            throw new AppError('The new total is less than what the customer has already paid.', 'validation');
          }
          Object.assign(o, {
            customerId: input.customerId,
            items,
            totalCents,
            dueAt: input.dueAt,
            handover: input.handover,
            handoverTime: input.handoverTime,
            notes: input.notes,
          });
          return o.id;
        }
        const number = d.nextOrderNumber[businessId] ?? 1001;
        d.nextOrderNumber[businessId] = number + 1;
        const order: Order = {
          id: uid('ord'),
          businessId,
          number,
          customerId: input.customerId,
          status: 'in_progress',
          dueAt: input.dueAt,
          handover: input.handover,
          handoverTime: input.handoverTime,
          notes: input.notes,
          items,
          totalCents,
          createdAt: nowIso(),
          createdByName: by.fullName.split(' ')[0] ?? by.fullName,
          startedAt: nowIso(),
          completedAt: null,
          cancelledAt: null,
        };
        d.orders.unshift(order);
        if (input.payment) {
          if (by.role === 'staff') throw new AppError('Your role doesn’t allow recording payments.', 'forbidden');
          insertPayment(d, businessId, order.id, input.payment.amountCents, input.payment.method, nowIso(), by);
        }
        return order.id;
      }),

    setOrderStatus: (orderId, status) =>
      write((d) => {
        const o = findOrder(d, orderId);
        requireMember(d, o.businessId);
        if (o.status === status) return;
        o.status = status;
        o.completedAt = status === 'completed' ? nowIso() : null;
        o.cancelledAt = status === 'cancelled' ? nowIso() : null;
      }),

    recordPayment: (businessId, input) =>
      write((d) => {
        const by = requireMember(d, businessId, ['owner', 'manager']);
        return insertPayment(d, businessId, input.orderId, input.amountCents, input.method, input.paidAt, by);
      }),

    deletePayment: (paymentId) =>
      write((d) => {
        const p = d.payments.find((x) => x.id === paymentId);
        if (!p) throw new AppError('This payment no longer exists.', 'not_found');
        requireMember(d, p.businessId, ['owner', 'manager']);
        d.payments = d.payments.filter((x) => x.id !== paymentId);
      }),

    createExpense: (businessId, input) =>
      write((d) => {
        const by = requireMember(d, businessId, ['owner', 'manager']);
        if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
          throw new AppError('Enter the amount spent.', 'validation');
        }
        const id = uid('exp');
        d.expenses.unshift({
          id,
          businessId,
          amountCents: input.amountCents,
          category: input.category,
          description: input.description.trim(),
          spentAt: input.spentAt,
          paidWith: input.paidWith,
          // Demo mode keeps the photo on this device only.
          receiptPath: input.receipt?.uri ?? null,
          recordedByName: by.fullName,
          createdAt: nowIso(),
        });
        return id;
      }),

    deleteExpense: (expenseId) =>
      write((d) => {
        const e = d.expenses.find((x) => x.id === expenseId);
        if (!e) throw new AppError('This expense no longer exists.', 'not_found');
        requireMember(d, e.businessId, ['owner', 'manager']);
        d.expenses = d.expenses.filter((x) => x.id !== expenseId);
      }),

    receiptUrl: async (path) => path,

    saveAppointment: (businessId, appointmentId, input) =>
      write((d) => {
        requireMember(d, businessId);
        if (appointmentId) {
          const a = d.appointments.find((x) => x.id === appointmentId);
          if (!a) throw new AppError('This appointment no longer exists.', 'not_found');
          Object.assign(a, input);
          return a.id;
        }
        const id = uid('apt');
        d.appointments.push({ id, businessId, ...input, status: 'scheduled', assignedToName: '' });
        return id;
      }),

    setAppointmentStatus: (appointmentId, status) =>
      write((d) => {
        const a = d.appointments.find((x) => x.id === appointmentId);
        if (!a) throw new AppError('This appointment no longer exists.', 'not_found');
        requireMember(d, a.businessId);
        a.status = status;
      }),

    markNotificationsRead: (businessId) =>
      write((d) => {
        requireMember(d, businessId);
        d.notifications.filter((n) => n.businessId === businessId && !n.readAt).forEach((n) => (n.readAt = nowIso()));
      }),

    inviteMember: (businessId, input) =>
      write((d) => {
        requireMember(d, businessId, ['owner']);
        const email = input.email.trim().toLowerCase();
        if (d.members.some((m) => m.businessId === businessId && m.email === email)) {
          throw new AppError('That person is already on your team.', 'conflict');
        }
        const existing = d.users.find((u) => u.email === email);
        d.members.push({
          id: uid('mem'),
          businessId,
          userId: existing?.id ?? null,
          fullName: input.fullName.trim(),
          email,
          role: input.role,
          status: existing ? 'active' : 'pending',
          createdAt: nowIso(),
        });
      }),
  };
}
