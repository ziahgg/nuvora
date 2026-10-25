/**
 * Domain model. Every monetary amount is an integer number of minor units
 * (cents) — never a float — to keep totals, balances and profit exact.
 */
export type Cents = number;
export type ISODate = string;

export type Role = 'owner' | 'manager' | 'staff';
export type MemberStatus = 'active' | 'pending';
export type OrderStatus = 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer';
export type ExpenseCategory = 'supplies' | 'rent' | 'utilities' | 'equipment' | 'wages' | 'other';
export type HandoverType = 'pickup' | 'delivery';
export type AppointmentType = 'pickup' | 'delivery' | 'in_store';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type BusinessCategory = 'laundry' | 'salon' | 'repair' | 'services' | 'retail' | 'other';
export type ServiceUnit = 'kg' | 'item' | 'flat' | 'shirt' | 'set';
export type NotificationKind = 'payment' | 'overdue' | 'order' | 'schedule' | 'summary' | 'team';

export interface Profile {
  id: string;
  fullName: string;
  email: string;
}

export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  currency: string;
  phone: string;
  email: string;
  address: string;
  openingHours: string;
  receiptFooter: string;
  createdAt: ISODate;
}

export interface Member {
  id: string;
  businessId: string;
  userId: string | null;
  fullName: string;
  email: string;
  role: Role;
  status: MemberStatus;
  createdAt: ISODate;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  unit: ServiceUnit;
  priceCents: Cents;
  sortOrder: number;
  active: boolean;
}

export interface Customer {
  id: string;
  businessId: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: ISODate;
}

export interface OrderItem {
  id: string;
  serviceId: string | null;
  name: string;
  unit: ServiceUnit;
  quantity: number;
  unitPriceCents: Cents;
}

export interface Order {
  id: string;
  businessId: string;
  number: number;
  customerId: string;
  status: OrderStatus;
  dueAt: ISODate;
  handover: HandoverType;
  handoverTime: string;
  notes: string;
  items: OrderItem[];
  /** Stored total; always equals the sum of item line totals (enforced by the backend). */
  totalCents: Cents;
  createdAt: ISODate;
  createdByName: string;
  startedAt: ISODate | null;
  completedAt: ISODate | null;
  cancelledAt: ISODate | null;
}

export interface Payment {
  id: string;
  businessId: string;
  orderId: string;
  amountCents: Cents;
  method: PaymentMethod;
  paidAt: ISODate;
  reference: string;
  recordedByName: string;
  createdAt: ISODate;
}

export interface Expense {
  id: string;
  businessId: string;
  amountCents: Cents;
  category: ExpenseCategory;
  description: string;
  spentAt: ISODate;
  paidWith: PaymentMethod;
  receiptPath: string | null;
  recordedByName: string;
  createdAt: ISODate;
}

export interface Appointment {
  id: string;
  businessId: string;
  type: AppointmentType;
  customerId: string;
  orderId: string | null;
  startsAt: ISODate;
  durationMin: number;
  location: string;
  status: AppointmentStatus;
  remind: boolean;
  assignedToName: string;
  notes: string;
}

export interface AppNotification {
  id: string;
  businessId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: ISODate;
  readAt: ISODate | null;
}

export interface Preferences {
  notifyPayments: boolean;
  notifyOverdue: boolean;
  notifyAppointments: boolean;
  notifyWeeklySummary: boolean;
  reminderSms: boolean;
}

/** Everything a signed-in user needs for one business workspace. */
export interface Workspace {
  business: Business;
  member: Member;
  members: Member[];
  services: Service[];
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
  appointments: Appointment[];
  notifications: AppNotification[];
  preferences: Preferences;
}

export const DEFAULT_PREFERENCES: Preferences = {
  notifyPayments: true,
  notifyOverdue: true,
  notifyAppointments: true,
  notifyWeeklySummary: false,
  reminderSms: true,
};
