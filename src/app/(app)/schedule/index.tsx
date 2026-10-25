import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { AppBar, GroupLabel, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { AppointmentCard, DayPills, weekStart } from '@/features/schedule';
import { fmtDay, fmtMonth, fmtTime, isSameDay, relativeDay } from '@/lib/dates';
import { addDays, startOfDay } from '@/lib/finance';
import { useWorkspace, useWorkspaceQuery } from '@/state/session';
import { colors, shadows, SIDE } from '@/theme/tokens';

/** Appointments / 31 Schedule Overview (+ Empty / Appointments). */
export default function Schedule() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ws = useWorkspace();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const [view, setView] = useState<'day' | 'week'>('day');
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const now = new Date();

  const sections = useMemo(() => {
    const days = view === 'day' ? [day, addDays(day, 1)] : Array.from({ length: 7 }, (_, i) => addDays(weekStart(day), i));
    return days.map((d) => ({
      day: d,
      items: ws.appointments
        .filter((a) => a.status !== 'cancelled' && isSameDay(new Date(a.startsAt), d))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }));
  }, [ws.appointments, view, day]);

  const label = (d: Date) => {
    const r = relativeDay(d, now);
    return r === 'Today' || r === 'Tomorrow' || r === 'Yesterday' ? `${r} · ${fmtDay(d)}` : fmtDay(d);
  };

  const fab = (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/schedule/new')}
      style={[styles.fab, { bottom: insets.bottom + 24 }]}
    >
      <Icon name="calendar-plus" size={20} color="onPrimary" />
      <Txt variant="button" color="onPrimary">
        New appointment
      </Txt>
    </Pressable>
  );

  return (
    <Screen gap={14} onRefresh={() => void refetch()} refreshing={isRefetching} overlay={fab}>
      <AppBar title="Schedule" action={{ icon: 'bell', label: 'Upcoming and reminders', onPress: () => router.push('/schedule/upcoming') }} />
      <View style={styles.month}>
        <Txt variant="heading">{fmtMonth(day)}</Txt>
        <View style={styles.toggle} accessibilityRole="radiogroup">
          {(['day', 'week'] as const).map((v) => (
            <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: view === v }} onPress={() => setView(v)} style={[styles.toggleItem, view === v ? { backgroundColor: colors.surface } : null]}>
              <Txt variant="label" color={view === v ? 'text' : 'textSecondary'}>
                {v === 'day' ? 'Day' : 'Week'}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>
      <DayPills selected={day} onSelect={setDay} appointments={ws.appointments} />
      {ws.appointments.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Nothing scheduled"
          body="Book pickups, deliveries or in-store services and keep track of who’s coming when."
          action={{ label: 'New appointment', onPress: () => router.push('/schedule/new') }}
        />
      ) : (
        sections
          .filter((s, i) => s.items.length > 0 || i === 0 || view === 'week')
          .map((s) => {
            const today = isSameDay(s.day, now);
            const past = today ? s.items.filter((a) => new Date(a.startsAt) <= now) : [];
            const future = today ? s.items.filter((a) => new Date(a.startsAt) > now) : s.items;
            return (
              <View key={s.day.toISOString()} style={{ gap: 14 }}>
                <GroupLabel label={label(s.day)} note={`${s.items.length} ${s.items.length === 1 ? 'appointment' : 'appointments'}`} />
                {s.items.length === 0 ? (
                  <Txt variant="caption" color="textSecondary">
                    Nothing booked.
                  </Txt>
                ) : null}
                {past.map((a) => (
                  <AppointmentCard key={a.id} ws={ws} appointment={a} />
                ))}
                {today ? (
                  <View style={styles.now} accessibilityLabel={`Now ${fmtTime(now)}`}>
                    <View style={styles.nowDot} />
                    <View style={styles.nowLine} />
                    <Txt variant="caption" color="errorText">
                      Now {fmtTime(now)}
                    </Txt>
                  </View>
                ) : null}
                {future.map((a) => (
                  <AppointmentCard key={a.id} ws={ws} appointment={a} />
                ))}
              </View>
            );
          })
      )}
      <View style={{ height: 72 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  month: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { flexDirection: 'row', backgroundColor: colors.muted, borderRadius: 10, padding: 3, gap: 2 },
  toggleItem: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8 },
  now: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  nowLine: { flex: 1, height: 2, backgroundColor: colors.error },
  fab: {
    position: 'absolute',
    right: SIDE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.ink,
    ...shadows.raised,
  },
});
