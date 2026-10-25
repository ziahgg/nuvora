/* eslint-disable @typescript-eslint/no-require-imports, import/first -- jest.mock factories must be hoisted above imports */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => {
  const { createHash, randomUUID } = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_alg: string, value: string) => createHash('sha256').update(value).digest('hex'),
    randomUUID: () => randomUUID(),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalService } from '../local/service';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../local/seed';
import { AppError } from '../service';

beforeEach(async () => {
  await AsyncStorage.clear();
});

async function signedIn() {
  const api = createLocalService();
  await api.signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const ws = (await api.loadWorkspace())!;
  return { api, ws };
}

describe('demo backend', () => {
  it('rejects a wrong password', async () => {
    const api = createLocalService();
    await expect(api.signIn({ email: DEMO_EMAIL, password: 'nope' })).rejects.toBeInstanceOf(AppError);
  });

  it('loads the seeded FreshFold workspace', async () => {
    const { ws } = await signedIn();
    expect(ws.business.name).toBe('FreshFold Laundry');
    const nv1049 = ws.orders.find((o) => o.number === 1049)!;
    expect(nv1049.totalCents).toBe(4000);
    expect(ws.payments.filter((p) => p.orderId === nv1049.id).reduce((s, p) => s + p.amountCents, 0)).toBe(2000);
    expect(new Set(ws.orders.map((o) => o.number)).size).toBe(ws.orders.length);
  });

  it('never accepts a payment above the balance due', async () => {
    const { api, ws } = await signedIn();
    const order = ws.orders.find((o) => o.number === 1049)!;
    await expect(
      api.recordPayment(ws.business.id, { orderId: order.id, amountCents: 2001, method: 'cash', paidAt: new Date().toISOString() }),
    ).rejects.toThrow(/more than the balance/);
    await api.recordPayment(ws.business.id, { orderId: order.id, amountCents: 2000, method: 'cash', paidAt: new Date().toISOString() });
    await expect(
      api.recordPayment(ws.business.id, { orderId: order.id, amountCents: 1, method: 'cash', paidAt: new Date().toISOString() }),
    ).rejects.toThrow(/more than the balance/);
  });

  it('assigns the next order number and derives the total from items', async () => {
    const { api, ws } = await signedIn();
    const customer = ws.customers[0];
    const id = await api.saveOrder(ws.business.id, null, {
      customerId: customer.id,
      items: [
        { serviceId: null, name: 'Wash & fold', unit: 'kg', quantity: 5, unitPriceCents: 300 },
        { serviceId: null, name: 'Express same-day', unit: 'flat', quantity: 1, unitPriceCents: 500 },
      ],
      dueAt: new Date().toISOString(),
      handover: 'pickup',
      handoverTime: '',
      notes: '',
      payment: { amountCents: 500, method: 'cash' },
    });
    const next = (await api.loadWorkspace())!;
    const created = next.orders.find((o) => o.id === id)!;
    expect(created.number).toBe(1052);
    expect(created.totalCents).toBe(2000);
    expect(next.payments.filter((p) => p.orderId === id).map((p) => p.amountCents)).toEqual([500]);
  });

  it('refuses edits that drop the total below what was paid', async () => {
    const { api, ws } = await signedIn();
    const order = ws.orders.find((o) => o.number === 1049)!;
    await expect(
      api.saveOrder(ws.business.id, order.id, {
        customerId: order.customerId,
        items: [{ serviceId: null, name: 'Tie', unit: 'item', quantity: 1, unitPriceCents: 500 }],
        dueAt: order.dueAt,
        handover: order.handover,
        handoverTime: order.handoverTime,
        notes: '',
      }),
    ).rejects.toThrow(/less than what the customer has already paid/);
  });

  it('blocks payments on cancelled orders', async () => {
    const { api, ws } = await signedIn();
    const order = ws.orders.find((o) => o.number === 1050)!;
    await api.setOrderStatus(order.id, 'cancelled');
    await expect(
      api.recordPayment(ws.business.id, { orderId: order.id, amountCents: 100, method: 'cash', paidAt: new Date().toISOString() }),
    ).rejects.toThrow(/cancelled/);
  });

  it('gives a new account no business until setup, then makes them owner', async () => {
    const api = createLocalService();
    await api.signUp({ fullName: 'New Owner', email: 'new@shop.dev', password: 'password1' });
    expect(await api.loadWorkspace()).toBeNull();
    await api.createBusiness({ name: 'New Shop', category: 'laundry', currency: 'EUR', phone: '', email: '' });
    const ws = (await api.loadWorkspace())!;
    expect(ws.member.role).toBe('owner');
    expect(ws.services).toHaveLength(4);
    expect(ws.orders).toHaveLength(0);
  });

  it('lets an invited staff member join but not record expenses', async () => {
    const { api, ws } = await signedIn();
    await api.inviteMember(ws.business.id, { fullName: 'Sam Staff', email: 'sam@freshfold.co', role: 'staff' });
    await api.signOut();
    await api.signUp({ fullName: 'Sam Staff', email: 'sam@freshfold.co', password: 'password1' });
    const staffWs = (await api.loadWorkspace())!;
    expect(staffWs.member.role).toBe('staff');
    expect(staffWs.expenses).toHaveLength(0);
    await expect(
      api.createExpense(staffWs.business.id, { amountCents: 100, category: 'supplies', description: 'Soap', spentAt: new Date().toISOString(), paidWith: 'cash' }),
    ).rejects.toThrow(/role/);
  });
});
