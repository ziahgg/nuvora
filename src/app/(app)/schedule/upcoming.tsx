import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { AppBar, GroupLabel, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { AppointmentCard } from '@/features/schedule';
import { fmtDay, relativeDay } from '@/lib/dates';
import { useWorkspace } from '@/state/session';
import { colors } from '@/theme/tokens';

/** Appointments / 35 Upcoming & Reminders. */
export default function Upcoming() {
  const router = useRouter();
  const ws = useWorkspace();
  const now = new Date();
  const upcoming = ws.appointments
    .filter((a) => a.status === 'scheduled' && new Date(a.startsAt) >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const groups: { label: string; items: typeof upcoming }[] = [];
  for (const a of upcoming) {
    const r = relativeDay(a.startsAt, now);
    const label = r === 'Today' ? `Today · ${fmtDay(a.startsAt)}` : r === 'Tomorrow' ? `Tomorrow · ${fmtDay(a.startsAt)}` : fmtDay(a.startsAt);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(a);
    else groups.push({ label, items: [a] });
  }
  const remindersOn = ws.preferences.reminderSms;

  return (
    <Screen gap={14}>
      <AppBar title="Upcoming" />
      <Pressable accessibilityRole="button" onPress={() => router.push('/settings/preferences')} style={styles.banner}>
        <Icon name="bell" size={20} color="primary" />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="label" color="primaryDark">
            {remindersOn ? 'Reminders are on for new bookings' : 'Reminders are off for new bookings'}
          </Txt>
          <Txt variant="caption" color="primaryDark">
            Each appointment keeps its own “Remind customer” setting
          </Txt>
        </View>
        <Txt variant="label" color="primary">
          Edit
        </Txt>
      </Pressable>
      {groups.length === 0 ? (
        <EmptyState icon="calendar" title="Nothing coming up" body="Book a pickup, delivery or in-store service to see it here." action={{ label: 'New appointment', onPress: () => router.push('/schedule/new') }} />
      ) : (
        groups.map((g) => (
          <View key={g.label} style={{ gap: 14 }}>
            <GroupLabel label={g.label} />
            {g.items.map((a) => (
              <AppointmentCard key={a.id} ws={ws} appointment={a} />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary50, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
});
