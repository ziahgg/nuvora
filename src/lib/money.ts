import type { Cents } from '@/data/types';

/** Currencies offered in business setup / preferences. */
export const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar', symbol: '$' },
  { code: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { code: 'GBP', label: 'GBP — British Pound', symbol: '£' },
  { code: 'IDR', label: 'IDR — Indonesian Rupiah', symbol: 'Rp' },
  { code: 'SGD', label: 'SGD — Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', label: 'AUD — Australian Dollar', symbol: 'A$' },
] as const;

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code + ' ';
}

function assertCents(value: Cents) {
  if (!Number.isSafeInteger(value)) throw new Error(`Money must be an integer number of cents, got ${value}`);
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats integer cents as e.g. "$1,540.00". Pure string maths (no floats,
 * no Intl dependency) so output is identical on iOS, Android and in tests.
 */
export function formatMoney(
  cents: Cents,
  currency = 'USD',
  opts: { sign?: 'auto' | 'always'; decimals?: boolean } = {},
): string {
  assertCents(cents);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = groupThousands(String(Math.floor(abs / 100)));
  const fraction = String(abs % 100).padStart(2, '0');
  const body = currencySymbol(currency) + whole + (opts.decimals === false ? '' : '.' + fraction);
  if (negative) return '−' + body;
  if (opts.sign === 'always' && cents > 0) return '+' + body;
  return body;
}

/** "$773" + ".00" split used by the dashboard revenue total. */
export function splitMoney(cents: Cents, currency = 'USD'): { whole: string; fraction: string } {
  const full = formatMoney(cents, currency);
  const dot = full.lastIndexOf('.');
  return { whole: full.slice(0, dot), fraction: full.slice(dot) };
}

/** Compact amount for chart labels: "$168", "$1.5k". */
export function formatMoneyShort(cents: Cents, currency = 'USD'): string {
  assertCents(cents);
  const dollars = Math.round(cents / 100);
  const sym = currencySymbol(currency);
  if (Math.abs(dollars) >= 1000) {
    const k = Math.round(dollars / 100) / 10;
    return `${sym}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${sym}${groupThousands(String(dollars))}`;
}

/**
 * Parses user input ("20", "20.5", "1,250.00", "$20") into cents.
 * Returns null for anything that isn't a valid non-negative amount with
 * at most two decimals. Uses string parsing — never float multiplication.
 */
export function parseMoneyInput(input: string): Cents | null {
  const cleaned = input.replace(/[\s,$€£]/g, '').replace(/^Rp/i, '');
  if (!/^\d{1,9}(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** Cents → editable input string ("2000" → "20.00"). */
export function centsToInput(cents: Cents): string {
  assertCents(cents);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function sumCents(values: Cents[]): Cents {
  return values.reduce((acc, v) => {
    assertCents(v);
    return acc + v;
  }, 0);
}

/** Line total = quantity × unit price, quantity being a whole number of units. */
export function lineTotal(quantity: number, unitPriceCents: Cents): Cents {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Quantity must be a whole number ≥ 0');
  assertCents(unitPriceCents);
  return quantity * unitPriceCents;
}

/** Percentage with one decimal, e.g. 0.1066 → "+10.7%". */
export function formatPercentChange(current: number, previous: number): string | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded >= 0 ? '+' : '−'}${Math.abs(rounded).toFixed(1)}%`;
}
