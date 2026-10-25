import type { Order } from '@/data/types';
import { csvField, toCsv } from '../csv';
import { ordersByService, statusSplit, turnaround, weeklyBreakdown } from '../reports';
import { customerSchema, fieldErrors, signUpSchema } from '../validation';

const base = (p: Partial<Order> & { id: string }): Order => ({
  businessId: 'b',
  number: 1,
  customerId: 'c',
  status: 'completed',
  dueAt: new Date(2026, 9, 5, 18).toISOString(),
  handover: 'pickup',
  handoverTime: '',
  notes: '',
  items: [{ id: 'i', serviceId: null, name: 'Wash & fold', unit: 'kg', quantity: 4, unitPriceCents: 300 }],
  totalCents: 1200,
  createdAt: new Date(2026, 9, 4, 10).toISOString(),
  createdByName: '',
  startedAt: null,
  completedAt: new Date(2026, 9, 5, 12).toISOString(),
  cancelledAt: null,
  ...p,
});

const range = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 15) };

describe('reports', () => {
  const orders = [
    base({ id: 'a' }),
    base({ id: 'b', createdAt: new Date(2026, 9, 9, 10).toISOString(), status: 'in_progress', completedAt: null }),
    base({
      id: 'c',
      createdAt: new Date(2026, 9, 10, 10).toISOString(),
      items: [
        { id: 'x', serviceId: null, name: 'Suit — dry clean', unit: 'item', quantity: 1, unitPriceCents: 2200 },
        { id: 'y', serviceId: null, name: 'Coat — dry clean', unit: 'item', quantity: 1, unitPriceCents: 1800 },
      ],
      totalCents: 4000,
      completedAt: new Date(2026, 9, 14, 12).toISOString(),
      dueAt: new Date(2026, 9, 12, 18).toISOString(),
    }),
    base({ id: 'd', status: 'cancelled', completedAt: null }),
  ];

  it('splits orders by status', () => {
    expect(statusSplit({ orders }, range)).toEqual({ total: 4, completed: 2, inProgress: 1, cancelled: 1 });
  });
  it('counts each service once per order and groups dry cleaning', () => {
    const s = ordersByService({ orders }, range);
    expect(s.find((x) => x.name === 'Wash & fold')?.orders).toBe(2);
    expect(s.find((x) => x.name === 'Dry cleaning')?.orders).toBe(1);
  });
  it('measures turnaround and on-time completion', () => {
    const t = turnaround({ orders }, range);
    expect(t.completed).toBe(2);
    expect(t.onTime).toBe(1);
  });
  it('breaks a range into 7-day weeks whose totals add up', () => {
    const weeks = weeklyBreakdown({ orders, payments: [], expenses: [] }, range, new Date(2026, 9, 20));
    expect(weeks).toHaveLength(2);
    expect(weeks.reduce((s, w) => s + w.revenueCents, 0)).toBe(1200 + 1200 + 4000);
  });
});

describe('csv', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(toCsv(['a', 'b'], [[1, null]])).toBe('a,b\r\n1,');
  });
});

describe('validation', () => {
  it('requires a name and a usable phone for customers', () => {
    const r = customerSchema.safeParse({ fullName: '', phone: '555-01', email: 'x', address: '', notes: '' });
    expect(fieldErrors(r)).toMatchObject({
      fullName: 'Enter the customer’s name',
      phone: 'Enter a valid phone number',
      email: 'Enter a valid email address',
    });
  });
  it('enforces the password rule from the design', () => {
    const r = signUpSchema.safeParse({ fullName: 'Maya', email: 'maya@freshfold', password: 'abcd', acceptTerms: true });
    expect(fieldErrors(r).email).toMatch(/valid email/);
    expect(fieldErrors(r).password).toBe('Password must be at least 8 characters');
    expect(signUpSchema.safeParse({ fullName: 'Maya', email: 'maya@freshfold.co', password: 'freshfold123', acceptTerms: true }).success).toBe(true);
  });
});
