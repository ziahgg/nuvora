import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/Badges';
import { CircleButton } from '@/components/Button';
import { Txt } from '@/components/Text';
import type { Appointment, Workspace } from '@/data/types';
import { fmtMonth, fmtTime, isSameDay } from '@/lib/dates';
import { addDays, orderMoney, paymentsByOrder, startOfDay } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { orderNo } from '@/state/selectors';
import { colors, type ColorToken } from '@/theme/tokens';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Monday of the week containing `d`. */
export function weekStart(d: Date): Date {
  const s = startOfDay(d);
  const offset = (s.getDay() + 6) % 7;
  return addDays(s, -offset);
}

/** Home "Week strip": month header with week arrows, 7 day pills, selected day highlighted. */
export function WeekStrip({
  selected,
  onSelect,
  appointments,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  appointments: Appointment[];
}) {
  const start = weekStart(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <View style={styles.strip}>
      <View style={styles.month}>
        <Txt variant="bodyMedium">{fmtMonth(selected)}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CircleButton icon="chevron-left" size={30} iconSize={16} bg="muted" accessibilityLabel="Previous week" onPress={() => onSelect(addDays(selected, -7))} />
          <CircleButton icon="chevron-right" size={30} iconSize={16} bg="muted" accessibilityLabel="Next week" onPress={() => onSelect(addDays(selected, 7))} />
        </View>
      </View>
      <View style={styles.days}>
        {days.map((d) => {
          const active = isSameDay(d, selected);
          const count = appointments.filter((a) => a.status !== 'cancelled' && isSameDay(new Date(a.startsAt), d)).length;
          return (
            <Pressable
              key={d.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${d.toDateString()}, ${count} appointments`}
              onPress={() => onSelect(d)}
              style={[styles.day, active ? { backgroundColor: colors.primary100 } : null]}
            >
              <Txt variant="caption" color="textSecondary">
                {WEEKDAY[d.getDay()]}
              </Txt>
              <Txt variant="figure" color={active ? 'primaryDark' : 'text'}>
                {d.getDate()}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Day pills with appointment dots (Schedule overview). */
export function DayPills({
  selected,
  onSelect,
  appointments,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  appointments: Appointment[];
}) {
  const start = weekStart(selected);
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => {
        const active = isSameDay(d, selected);
        const count = Math.min(3, appointments.filter((a) => a.status !== 'cancelled' && isSameDay(new Date(a.startsAt), d)).length);
        return (
          <Pressable
            key={d.toISOString()}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={d.toDateString()}
            onPress={() => onSelect(d)}
            style={[styles.pill, { backgroundColor: active ? colors.primary100 : colors.surface }]}
          >
            <Txt variant="caption" color={active ? 'primaryDark' : 'textSecondary'}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })}
            </Txt>
            <Txt variant="figure" size={17} color={active ? 'primaryDark' : 'text'}>
              {d.getDate()}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 3, height: 5 }}>
              {Array.from({ length: count }, (_, k) => (
                <View key={k} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: active ? colors.accent : colors.primary }} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const typeLabel = { pickup: 'Pickup', delivery: 'Delivery', in_store: 'In-store service' } as const;

export function appointmentTitle(ws: Workspace, a: Appointment): string {
  const who = ws.customers.find((c) => c.id === a.customerId)?.fullName ?? 'Deleted customer';
  return `${typeLabel[a.type]} · ${who}`;
}

/** Appointment card: time column, coloured rail, title, meta and status badge. */
export function AppointmentCard({ ws, appointment: a, now = new Date() }: { ws: Workspace; appointment: Appointment; now?: Date }) {
  const router = useRouter();
  const order = a.orderId ? ws.orders.find((o) => o.id === a.orderId) : undefined;
  const money = order ? orderMoney(order, paymentsByOrder(ws.payments).get(order.id), now) : undefined;
  const done = a.status !== 'scheduled';
  const rail: ColorToken = done ? 'border' : a.type === 'delivery' ? 'primary' : 'accent';
  const meta = [
    order ? orderNo(order) : 'New order',
    a.type === 'delivery' && money && money.balanceCents > 0 ? `Collect ${formatMoney(money.balanceCents, ws.business.currency)} on delivery` : a.location,
    a.type === 'delivery' && money && money.balanceCents === 0 ? 'Paid' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/schedule/${a.id}`)} style={styles.card}>
      <View style={{ width: 52, gap: 2 }}>
        <Txt variant="figure" color={done ? 'textTertiary' : 'text'}>
          {fmtTime(a.startsAt)}
        </Txt>
        <Txt variant="caption" color="textTertiary">
          {a.durationMin} min
        </Txt>
      </View>
      <View style={{ width: 3, height: 44, borderRadius: 2, backgroundColor: colors[rail] }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="bodyMedium" color={done ? 'textSecondary' : 'text'} numberOfLines={1}>
          {appointmentTitle(ws, a)}
        </Txt>
        <Txt variant="caption" color="textSecondary" numberOfLines={1}>
          {meta}
        </Txt>
        <StatusBadge status={a.status === 'scheduled' ? 'scheduled' : a.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { backgroundColor: colors.surface, borderRadius: 28, padding: 16, gap: 12 },
  month: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 40, alignItems: 'center', gap: 8, paddingVertical: 10, borderRadius: 999 },
  pill: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 999 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 22, padding: 14 },
});
