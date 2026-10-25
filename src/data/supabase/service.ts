import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import type { PostgrestError } from '@supabase/supabase-js';

import { AppError, type DataService, type SessionUser } from '../service';
import {
  DEFAULT_PREFERENCES,
  type AppNotification,
  type Appointment,
  type Business,
  type Customer,
  type Expense,
  type Member,
  type Order,
  type Payment,
  type Preferences,
  type Service,
  type Workspace,
} from '../types';
import { getSupabase } from './client';

type Row = Record<string, any>;

function fail(error: PostgrestError | { message: string; status?: number } | null): never {
  const msg = error?.message ?? 'Something went wrong';
  if (/PAYMENT_EXCEEDS_BALANCE/.test(msg)) {
    throw new AppError('That’s more than the balance due on this order.', 'validation');
  }
  if (/TOTAL_BELOW_PAID/.test(msg)) {
    throw new AppError('The new total is less than what the customer has already paid.', 'validation');
  }
  if (/ORDER_CANCELLED/.test(msg)) throw new AppError('Payments can’t be added to a cancelled order.', 'validation');
  if (/ORDER_EMPTY/.test(msg)) throw new AppError('Add at least one service to the order.', 'validation');
  if (/row-level security|FORBIDDEN|42501|permission denied/i.test(msg) || ('code' in (error ?? {}) && (error as PostgrestError).code === '42501')) {
    throw new AppError('Your role doesn’t allow this action.', 'forbidden');
  }
  if (/duplicate key/.test(msg)) throw new AppError('That already exists.', 'conflict');
  if (/Failed to fetch|Network request failed|NetworkError/i.test(msg)) {
    throw new AppError('You’re offline. Check your connection and try again.', 'network');
  }
  throw new AppError(msg, 'unknown');
}

/** Returns the response data, throwing on errors or when no row came back. */
function check<T>(res: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (res.error) fail(res.error);
  if (res.data === null || res.data === undefined) throw new AppError('Not found.', 'not_found');
  return res.data as NonNullable<T>;
}

/** For writes that return no rows: only checks for an error. */
function ok(res: { error: PostgrestError | null }): void {
  if (res.error) fail(res.error);
}

const toUser = (u: { id: string; email?: string | null; user_metadata?: Row }): SessionUser => ({
  id: u.id,
  email: u.email ?? '',
  fullName: (u.user_metadata?.full_name as string) ?? '',
});

const mapBusiness = (r: Row): Business => ({
  id: r.id,
  name: r.name,
  category: r.category,
  currency: String(r.currency).trim(),
  phone: r.phone,
  email: r.email,
  address: r.address,
  openingHours: r.opening_hours,
  receiptFooter: r.receipt_footer,
  createdAt: r.created_at,
});

const mapMember = (r: Row): Member => ({
  id: r.id,
  businessId: r.business_id,
  userId: r.user_id,
  fullName: r.full_name,
  email: r.email,
  role: r.role,
  status: r.status,
  createdAt: r.created_at,
});

const mapService = (r: Row): Service => ({
  id: r.id,
  businessId: r.business_id,
  name: r.name,
  unit: r.unit,
  priceCents: Number(r.price_cents),
  sortOrder: r.sort_order,
  active: r.active,
});

const mapCustomer = (r: Row): Customer => ({
  id: r.id,
  businessId: r.business_id,
  fullName: r.full_name,
  phone: r.phone,
  email: r.email,
  address: r.address,
  notes: r.notes,
  createdAt: r.created_at,
});

const mapOrder = (r: Row): Order => ({
  id: r.id,
  businessId: r.business_id,
  number: r.number,
  customerId: r.customer_id,
  status: r.status,
  dueAt: r.due_at,
  handover: r.handover,
  handoverTime: r.handover_time,
  notes: r.notes,
  totalCents: Number(r.total_cents),
  createdAt: r.created_at,
  createdByName: r.created_by_name,
  startedAt: r.started_at,
  completedAt: r.completed_at,
  cancelledAt: r.cancelled_at,
  items: ((r.order_items ?? []) as Row[])
    .sort((a, b) => a.position - b.position)
    .map((i) => ({
      id: i.id,
      serviceId: i.service_id,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      unitPriceCents: Number(i.unit_price_cents),
    })),
});

const mapPayment = (r: Row): Payment => ({
  id: r.id,
  businessId: r.business_id,
  orderId: r.order_id,
  amountCents: Number(r.amount_cents),
  method: r.method,
  paidAt: r.paid_at,
  reference: r.reference,
  recordedByName: r.recorded_by_name,
  createdAt: r.created_at,
});

const mapExpense = (r: Row): Expense => ({
  id: r.id,
  businessId: r.business_id,
  amountCents: Number(r.amount_cents),
  category: r.category,
  description: r.description,
  spentAt: r.spent_at,
  paidWith: r.paid_with,
  receiptPath: r.receipt_path,
  recordedByName: r.recorded_by_name,
  createdAt: r.created_at,
});

const mapAppointment = (r: Row): Appointment => ({
  id: r.id,
  businessId: r.business_id,
  type: r.type,
  customerId: r.customer_id,
  orderId: r.order_id,
  startsAt: r.starts_at,
  durationMin: r.duration_min,
  location: r.location,
  status: r.status,
  remind: r.remind,
  assignedToName: r.assigned_to_name,
  notes: r.notes,
});

const mapNotification = (r: Row): AppNotification => ({
  id: r.id,
  businessId: r.business_id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  createdAt: r.created_at,
  readAt: r.read_at,
});

export function createSupabaseService(): DataService {
  const sb = getSupabase();

  async function requireUser() {
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) throw new AppError('Your session has ended. Sign in again.', 'auth');
    return data.user;
  }

  return {
    mode: 'supabase',

    async getSession() {
      const { data } = await sb.auth.getSession();
      return data.session ? toUser(data.session.user) : null;
    },

    onAuthChange(listener) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        listener(session ? toUser(session.user) : null);
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp({ fullName, email, password }) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        if (/registered|exists/i.test(error.message)) {
          throw new AppError('An account with this email already exists. Sign in instead.', 'conflict');
        }
        fail(error);
      }
      if (!data.session || !data.user) return { status: 'confirm_email' };
      return { status: 'signed_in', user: toUser(data.user) };
    },

    async signIn({ email, password }) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid login|invalid credentials/i.test(error.message)) {
          throw new AppError('Email or password is incorrect.', 'auth');
        }
        if (/not confirmed/i.test(error.message)) {
          throw new AppError('Confirm your email first — check your inbox for the link.', 'auth');
        }
        fail(error);
      }
      return toUser(data.user);
    },

    async signOut() {
      const { error } = await sb.auth.signOut();
      if (error) fail(error);
    },

    async sendPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) fail(error);
    },

    async loadWorkspace(): Promise<Workspace | null> {
      const user = await requireUser();
      const membership = check(
        await sb
          .from('business_members')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at')
          .limit(1),
      );
      if (!membership?.length) return null;
      const member = mapMember(membership[0]);
      const bid = member.businessId;
      const finance = member.role !== 'staff';

      const [business, members, services, customers, orders, payments, expenses, appointments, notifications, profile] =
        await Promise.all([
          sb.from('businesses').select('*').eq('id', bid).single(),
          sb.from('business_members').select('*').eq('business_id', bid).order('created_at'),
          sb.from('services').select('*').eq('business_id', bid).order('sort_order'),
          sb.from('customers').select('*').eq('business_id', bid).is('deleted_at', null).order('full_name'),
          sb.from('orders').select('*, order_items(*)').eq('business_id', bid).order('created_at', { ascending: false }),
          sb.from('payments').select('*').eq('business_id', bid).order('paid_at', { ascending: false }),
          finance
            ? sb.from('expenses').select('*').eq('business_id', bid).order('spent_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          sb.from('appointments').select('*').eq('business_id', bid).order('starts_at'),
          sb.from('notifications').select('*').eq('business_id', bid).order('created_at', { ascending: false }).limit(50),
          sb.from('profiles').select('preferences').eq('id', user.id).single(),
        ]);

      return {
        business: mapBusiness(check(business)),
        member,
        members: check(members).map(mapMember),
        services: check(services).map(mapService),
        customers: check(customers).map(mapCustomer),
        orders: check(orders).map(mapOrder),
        payments: check(payments).map(mapPayment),
        expenses: (check(expenses) as Row[]).map(mapExpense),
        appointments: check(appointments).map(mapAppointment),
        notifications: check(notifications).map(mapNotification),
        preferences: { ...DEFAULT_PREFERENCES, ...(check(profile)?.preferences as Partial<Preferences>) },
      };
    },

    async createBusiness(input) {
      const id = check(
        await sb.rpc('create_business', {
          p_name: input.name,
          p_category: input.category,
          p_currency: input.currency,
          p_phone: input.phone,
          p_email: input.email,
        }),
      ) as string;
      return mapBusiness(check(await sb.from('businesses').select('*').eq('id', id).single()));
    },

    async updateBusiness(businessId, patch) {
      const row: Row = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.category !== undefined) row.category = patch.category;
      if (patch.phone !== undefined) row.phone = patch.phone;
      if (patch.email !== undefined) row.email = patch.email;
      if (patch.address !== undefined) row.address = patch.address;
      if (patch.openingHours !== undefined) row.opening_hours = patch.openingHours;
      if (patch.receiptFooter !== undefined) row.receipt_footer = patch.receiptFooter;
      if (patch.currency !== undefined) row.currency = patch.currency;
      const res = await sb.from('businesses').update(row).eq('id', businessId).select('id');
      if (!check(res)?.length) throw new AppError('Only the owner can edit business details.', 'forbidden');
    },

    async updatePreferences(prefs) {
      const user = await requireUser();
      ok(await sb.from('profiles').update({ preferences: prefs }).eq('id', user.id));
    },

    async createCustomer(businessId, input) {
      const row = check(
        await sb
          .from('customers')
          .insert({
            business_id: businessId,
            full_name: input.fullName,
            phone: input.phone,
            email: input.email,
            address: input.address,
            notes: input.notes,
          })
          .select('*')
          .single(),
      );
      return mapCustomer(row);
    },

    async updateCustomer(customerId, input) {
      ok(
        await sb
          .from('customers')
          .update({
            full_name: input.fullName,
            phone: input.phone,
            email: input.email,
            address: input.address,
            notes: input.notes,
          })
          .eq('id', customerId),
      );
    },

    async deleteCustomer(customerId) {
      ok(await sb.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', customerId));
    },

    async saveOrder(businessId, orderId, input) {
      return check(
        await sb.rpc('save_order', {
          p_business: businessId,
          p_order: orderId,
          p_customer: input.customerId,
          p_due_at: input.dueAt,
          p_handover: input.handover,
          p_handover_time: input.handoverTime,
          p_notes: input.notes,
          p_items: input.items,
          p_payment: orderId ? null : (input.payment ?? null),
        }),
      ) as string;
    },

    async setOrderStatus(orderId, status) {
      ok(await sb.from('orders').update({ status }).eq('id', orderId));
    },

    async recordPayment(businessId, input) {
      const row = check(
        await sb
          .from('payments')
          .insert({
            business_id: businessId,
            order_id: input.orderId,
            amount_cents: input.amountCents,
            method: input.method,
            paid_at: input.paidAt,
          })
          .select('id')
          .single(),
      );
      return row.id as string;
    },

    async deletePayment(paymentId) {
      const res = await sb.from('payments').delete().eq('id', paymentId).select('id');
      if (!check(res)?.length) throw new AppError('Your role doesn’t allow deleting payments.', 'forbidden');
    },

    async createExpense(businessId, input) {
      let receiptPath: string | null = null;
      if (input.receipt) {
        const ext = input.receipt.mimeType.includes('png') ? 'png' : 'jpg';
        receiptPath = `${businessId}/${Crypto.randomUUID()}.${ext}`;
        const bytes = await new File(input.receipt.uri).bytes();
        const { error } = await sb.storage
          .from('receipts')
          .upload(receiptPath, bytes, { contentType: input.receipt.mimeType, upsert: false });
        if (error) fail(error);
      }
      const row = check(
        await sb
          .from('expenses')
          .insert({
            business_id: businessId,
            amount_cents: input.amountCents,
            category: input.category,
            description: input.description,
            spent_at: input.spentAt,
            paid_with: input.paidWith,
            receipt_path: receiptPath,
          })
          .select('id')
          .single(),
      );
      return row.id as string;
    },

    async deleteExpense(expenseId) {
      ok(await sb.from('expenses').delete().eq('id', expenseId));
    },

    async receiptUrl(path) {
      const { data, error } = await sb.storage.from('receipts').createSignedUrl(path, 600);
      if (error) return null;
      return data.signedUrl;
    },

    async saveAppointment(businessId, appointmentId, input) {
      const row = {
        business_id: businessId,
        type: input.type,
        customer_id: input.customerId,
        order_id: input.orderId,
        starts_at: input.startsAt,
        duration_min: input.durationMin,
        location: input.location,
        remind: input.remind,
        notes: input.notes,
      };
      if (appointmentId) {
        ok(await sb.from('appointments').update(row).eq('id', appointmentId));
        return appointmentId;
      }
      const created = check(await sb.from('appointments').insert(row).select('id').single());
      return created.id as string;
    },

    async setAppointmentStatus(appointmentId, status) {
      ok(await sb.from('appointments').update({ status }).eq('id', appointmentId));
    },

    async markNotificationsRead(businessId) {
      ok(
        await sb
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('business_id', businessId)
          .is('read_at', null),
      );
    },

    async inviteMember(businessId, input) {
      ok(
        await sb.rpc('invite_member', {
          p_business: businessId,
          p_email: input.email,
          p_full_name: input.fullName,
          p_role: input.role,
        }),
      );
    },
  };
}
