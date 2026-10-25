import { centsToInput, formatMoney, formatMoneyShort, formatPercentChange, lineTotal, parseMoneyInput, splitMoney, sumCents } from '../money';

describe('formatMoney', () => {
  it('formats cents with grouping and two decimals', () => {
    expect(formatMoney(154000)).toBe('$1,540.00');
    expect(formatMoney(2000)).toBe('$20.00');
    expect(formatMoney(5)).toBe('$0.05');
    expect(formatMoney(123456789)).toBe('$1,234,567.89');
  });
  it('handles signs and other currencies', () => {
    expect(formatMoney(-3000)).toBe('−$30.00');
    expect(formatMoney(2000, 'USD', { sign: 'always' })).toBe('+$20.00');
    expect(formatMoney(0, 'USD', { sign: 'always' })).toBe('$0.00');
    expect(formatMoney(150000, 'EUR')).toBe('€1,500.00');
    expect(formatMoney(248000, 'USD', { decimals: false })).toBe('$2,480');
  });
  it('rejects non-integer cents', () => {
    expect(() => formatMoney(10.5)).toThrow();
  });
});

describe('parseMoneyInput', () => {
  it('parses without floating point error', () => {
    expect(parseMoneyInput('20')).toBe(2000);
    expect(parseMoneyInput('20.5')).toBe(2050);
    expect(parseMoneyInput('0.1')).toBe(10);
    expect(parseMoneyInput('19.99')).toBe(1999);
    expect(parseMoneyInput('1,250.00')).toBe(125000);
    expect(parseMoneyInput('$ 45')).toBe(4500);
  });
  it('rejects invalid input', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('1.234')).toBeNull();
    expect(parseMoneyInput('-5')).toBeNull();
    expect(parseMoneyInput('1.2.3')).toBeNull();
  });
  it('round-trips with centsToInput', () => {
    for (const c of [0, 1, 99, 2000, 123456]) expect(parseMoneyInput(centsToInput(c))).toBe(c);
  });
});

describe('helpers', () => {
  it('computes line totals from whole quantities', () => {
    expect(lineTotal(5, 300)).toBe(1500);
    expect(lineTotal(0, 300)).toBe(0);
    expect(() => lineTotal(1.5, 300)).toThrow();
    expect(() => lineTotal(-1, 300)).toThrow();
  });
  it('sums cents exactly', () => {
    expect(sumCents([10, 20, 30])).toBe(60);
    expect(sumCents(Array(1000).fill(1))).toBe(1000);
  });
  it('splits and shortens', () => {
    expect(splitMoney(77300)).toEqual({ whole: '$773', fraction: '.00' });
    expect(formatMoneyShort(16800)).toBe('$168');
    expect(formatMoneyShort(150000)).toBe('$1.5k');
    expect(formatMoneyShort(100000)).toBe('$1k');
  });
  it('formats percentage change', () => {
    expect(formatPercentChange(154000, 139100)).toBe('+10.7%');
    expect(formatPercentChange(90, 100)).toBe('−10.0%');
    expect(formatPercentChange(5, 0)).toBeNull();
  });
});
