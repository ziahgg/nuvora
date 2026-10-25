import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OptionSheet } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Text';
import { addDays, monthToDate, startOfDay, todayRange, type DateRange } from '@/lib/finance';
import { colors } from '@/theme/tokens';

export type PeriodKey = 'today' | 'last7' | 'month' | 'lastMonth';

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
];

export function periodRange(key: PeriodKey, now = new Date()): DateRange {
  switch (key) {
    case 'today':
      return todayRange(now);
    case 'last7':
      return { start: addDays(startOfDay(now), -6), end: addDays(startOfDay(now), 1) };
    case 'lastMonth':
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
    default:
      return monthToDate(now);
  }
}

/** "1 – 22 Oct 2026" */
export function rangeLabel(r: DateRange, withYear = true): string {
  const last = addDays(r.end, -1);
  const sameMonth = r.start.getMonth() === last.getMonth();
  const startText = sameMonth ? String(r.start.getDate()) : r.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endText = last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
  return r.start.getTime() === startOfDay(last).getTime() ? endText : `${startText} – ${endText}`;
}

export function PeriodPicker({
  value,
  onChange,
  withYear = true,
}: {
  value: PeriodKey;
  onChange: (k: PeriodKey) => void;
  withYear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Change period" onPress={() => setOpen(true)} style={styles.picker}>
        <Icon name="calendar" size={16} color="textSecondary" />
        <Txt variant="label">{rangeLabel(periodRange(value), withYear)}</Txt>
        <Icon name="chevron-down" size={16} color="textSecondary" />
      </Pressable>
      <OptionSheet visible={open} title="Period" options={PERIOD_OPTIONS} value={value} onSelect={onChange} onClose={() => setOpen(false)} />
    </>
  );
}

export function periodCaption(k: PeriodKey): string {
  return { today: 'Today', last7: 'Last 7 days', month: 'Month to date', lastMonth: 'Last month' }[k];
}

export const pickerStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
});

export function PeriodRow({ value, onChange }: { value: PeriodKey; onChange: (k: PeriodKey) => void }) {
  return (
    <View style={pickerStyles.row}>
      <PeriodPicker value={value} onChange={onChange} />
      <Txt variant="caption" color="textSecondary">
        {periodCaption(value)}
      </Txt>
    </View>
  );
}
