import { Pressable, StyleSheet, View } from 'react-native';

import type { AppointmentStatus, OrderStatus, PaymentStatus } from '@/data/types';
import { colors, type ColorToken } from '@/theme/tokens';
import { Txt } from './Text';

export type BadgeStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled'
  | 'paid'
  | 'partially_paid'
  | 'unpaid'
  | 'scheduled';

const badge: Record<BadgeStatus, { label: string; bg: ColorToken; dot: ColorToken; fg: ColorToken }> = {
  pending: { label: 'Pending', bg: 'warning50', dot: 'warning', fg: 'warningText' },
  in_progress: { label: 'In Progress', bg: 'primary50', dot: 'primary', fg: 'primary' },
  completed: { label: 'Completed', bg: 'success50', dot: 'success', fg: 'successText' },
  overdue: { label: 'Overdue', bg: 'error50', dot: 'error', fg: 'errorText' },
  cancelled: { label: 'Cancelled', bg: 'muted', dot: 'textTertiary', fg: 'textSecondary' },
  paid: { label: 'Paid', bg: 'success50', dot: 'success', fg: 'successText' },
  partially_paid: { label: 'Partially Paid', bg: 'warning50', dot: 'warning', fg: 'warningText' },
  unpaid: { label: 'Unpaid', bg: 'error50', dot: 'error', fg: 'errorText' },
  scheduled: { label: 'Scheduled', bg: 'primary50', dot: 'primary', fg: 'primary' },
};

/** Figma "Status Badge": colour is never the only signal — every badge has a label. */
export function StatusBadge({ status }: { status: BadgeStatus | OrderStatus | PaymentStatus | AppointmentStatus }) {
  const b = badge[status as BadgeStatus];
  return (
    <View style={[styles.badge, { backgroundColor: colors[b.bg] }]} accessibilityRole="text" accessibilityLabel={b.label}>
      <View style={[styles.dot, { backgroundColor: colors[b.dot] }]} />
      <Txt variant="caption" color={b.fg} weight="medium" style={styles.badgeText}>
        {b.label}
      </Txt>
    </View>
  );
}

/** Figma "Filter Chip" — Selected (ink) / Default (outlined surface). */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? { backgroundColor: colors.ink } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Txt variant="label" color={selected ? 'onPrimary' : 'textSecondary'}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  wrap = true,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  return (
    <View style={[styles.row, wrap ? { flexWrap: 'wrap' } : null]} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingLeft: 10,
    paddingRight: 11,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { lineHeight: 18 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 8 },
});
