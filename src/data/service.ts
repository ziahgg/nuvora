import type {
  AppointmentStatus,
  AppointmentType,
  Business,
  BusinessCategory,
  Cents,
  Customer,
  ExpenseCategory,
  HandoverType,
  OrderStatus,
  PaymentMethod,
  Preferences,
  Role,
  ServiceUnit,
  Workspace,
} from './types';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
}

export type SignUpResult = { status: 'signed_in'; user: SessionUser } | { status: 'confirm_email' };

export interface BusinessInput {
  name: string;
  category: BusinessCategory;
  currency: string;
  phone: string;
  email: string;
}

export interface BusinessPatch {
  name?: string;
  category?: BusinessCategory;
  phone?: string;
  email?: string;
  address?: string;
  openingHours?: string;
  receiptFooter?: string;
  currency?: string;
}

export interface CustomerInput {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface OrderItemInput {
  serviceId: string | null;
  name: string;
  unit: ServiceUnit;
  quantity: number;
  unitPriceCents: Cents;
}

export interface OrderInput {
  customerId: string;
  items: OrderItemInput[];
  dueAt: string;
  handover: HandoverType;
  handoverTime: string;
  notes: string;
  /** Optional payment taken at drop-off (new orders only). */
  payment?: { amountCents: Cents; method: PaymentMethod } | null;
}

export interface PaymentInput {
  orderId: string;
  amountCents: Cents;
  method: PaymentMethod;
  paidAt: string;
}

export interface ExpenseInput {
  amountCents: Cents;
  category: ExpenseCategory;
  description: string;
  spentAt: string;
  paidWith: PaymentMethod;
  receipt?: { uri: string; mimeType: string } | null;
}

export interface AppointmentInput {
  type: AppointmentType;
  customerId: string;
  orderId: string | null;
  startsAt: string;
  durationMin: number;
  location: string;
  remind: boolean;
  notes: string;
}

export interface InviteInput {
  fullName: string;
  email: string;
  role: Exclude<Role, 'owner'>;
}

/**
 * Everything the UI needs from a backend. Implemented by the Supabase service
 * (production) and the on-device demo service (no credentials configured).
 */
export interface DataService {
  readonly mode: 'supabase' | 'demo';

  getSession(): Promise<SessionUser | null>;
  onAuthChange(listener: (user: SessionUser | null) => void): () => void;
  signUp(input: { fullName: string; email: string; password: string }): Promise<SignUpResult>;
  signIn(input: { email: string; password: string }): Promise<SessionUser>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;

  /** null when the user has no business yet (go to business setup). */
  loadWorkspace(): Promise<Workspace | null>;
  createBusiness(input: BusinessInput): Promise<Business>;
  updateBusiness(businessId: string, patch: BusinessPatch): Promise<void>;
  updatePreferences(prefs: Preferences): Promise<void>;

  createCustomer(businessId: string, input: CustomerInput): Promise<Customer>;
  updateCustomer(customerId: string, input: CustomerInput): Promise<void>;
  deleteCustomer(customerId: string): Promise<void>;

  /** Creates (orderId = null) or replaces an order and its items; returns the order id. */
  saveOrder(businessId: string, orderId: string | null, input: OrderInput): Promise<string>;
  setOrderStatus(orderId: string, status: OrderStatus): Promise<void>;

  recordPayment(businessId: string, input: PaymentInput): Promise<string>;
  deletePayment(paymentId: string): Promise<void>;

  createExpense(businessId: string, input: ExpenseInput): Promise<string>;
  deleteExpense(expenseId: string): Promise<void>;
  receiptUrl(path: string): Promise<string | null>;

  saveAppointment(businessId: string, appointmentId: string | null, input: AppointmentInput): Promise<string>;
  setAppointmentStatus(appointmentId: string, status: AppointmentStatus): Promise<void>;

  markNotificationsRead(businessId: string): Promise<void>;
  inviteMember(businessId: string, input: InviteInput): Promise<void>;
}

/** Errors with a user-facing message. Backends translate their failures into these. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'validation'
      | 'auth'
      | 'forbidden'
      | 'not_found'
      | 'conflict'
      | 'network'
      | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'AppError';
  }
}
