import type {
  AppointmentType,
  BusinessCategory,
  ExpenseCategory,
  HandoverType,
  PaymentMethod,
  Role,
  ServiceUnit,
} from '@/data/types';

export const CATEGORY_OPTIONS: { value: BusinessCategory; label: string }[] = [
  { value: 'laundry', label: 'Laundry' },
  { value: 'salon', label: 'Salon & beauty' },
  { value: 'repair', label: 'Repair shop' },
  { value: 'services', label: 'Services' },
  { value: 'retail', label: 'Retail' },
  { value: 'other', label: 'Other' },
];

export const categoryLabel = (c: BusinessCategory) => CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? c;

export const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
];

export const EXPENSE_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'supplies', label: 'Supplies' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'wages', label: 'Wages' },
  { value: 'other', label: 'Other' },
];

export const expenseLabel = (c: ExpenseCategory) => EXPENSE_OPTIONS.find((o) => o.value === c)?.label ?? c;

export const HANDOVER_OPTIONS: { value: HandoverType; label: string }[] = [
  { value: 'pickup', label: 'Pickup in store' },
  { value: 'delivery', label: 'Delivery' },
];

export const APPOINTMENT_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'in_store', label: 'In-store service' },
];

export const appointmentLabel = (t: AppointmentType) => APPOINTMENT_OPTIONS.find((o) => o.value === t)?.label ?? t;

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', manager: 'Manager', staff: 'Staff' };

export const UNIT_PRICE_LABEL: Record<ServiceUnit, string> = {
  kg: 'per kg',
  item: 'per item',
  flat: 'flat',
  shirt: 'per shirt',
  set: 'per set',
};

export const UNIT_QTY_LABEL: Record<ServiceUnit, (q: number) => string> = {
  kg: (q) => `${q} kg`,
  item: (q) => `${q} ${q === 1 ? 'item' : 'items'}`,
  flat: () => '',
  shirt: (q) => `${q} ${q === 1 ? 'shirt' : 'shirts'}`,
  set: (q) => `${q} ${q === 1 ? 'set' : 'sets'}`,
};

/** Time slots offered by time pickers (business hours, 30-minute steps). */
export const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
