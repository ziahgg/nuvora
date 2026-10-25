import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/Brand';
import { Dialog, useToast } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { GroupLabel, ListCard, MenuRow, PageHeader, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { isSameDay } from '@/lib/dates';
import { monthToDate, periodMetrics } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { ROLE_LABEL } from '@/state/options';
import { notificationFeed, unreadCount } from '@/state/selectors';
import { errorMessage, usePermissions, useWorkspace } from '@/state/session';
import { colors } from '@/theme/tokens';

/** More / Menu (+ 46 Sign-out confirmation). */
export default function More() {
  const router = useRouter();
  const ws = useWorkspace();
  const toast = useToast();
  const { finance } = usePermissions();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const todays = ws.appointments.filter((a) => a.status !== 'cancelled' && isSameDay(new Date(a.startsAt), now)).length;
  const profit = periodMetrics(ws, monthToDate(now)).profitCents;
  const unread = unreadCount(notificationFeed(ws, now));
  const activeMembers = ws.members.filter((m) => m.status === 'active').length;

  async function signOut() {
    setBusy(true);
    try {
      await api.signOut();
    } catch (e) {
      toast(errorMessage(e), { kind: 'error', aboveTabBar: true });
      setBusy(false);
    }
  }

  return (
    <Screen withTabBar>
      <PageHeader title="More" />
      <Pressable accessibilityRole="button" onPress={() => router.push('/settings/business')} style={styles.business}>
        <AppIcon size={45} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodyMedium">{ws.business.name}</Txt>
          <Txt variant="caption" color="textSecondary">
            {ws.member.fullName} · {ROLE_LABEL[ws.member.role]}
          </Txt>
        </View>
        <Icon name="chevron-right" size={18} color="textTertiary" />
      </Pressable>

      <GroupLabel label="Workspace" />
      <ListCard>
        <MenuRow icon="calendar" title="Schedule" subtitle={`${todays} ${todays === 1 ? 'appointment' : 'appointments'} today`} onPress={() => router.push('/schedule')} />
        {finance ? (
          <MenuRow icon="chart-column" title="Reports" subtitle={`Profit ${formatMoney(profit, ws.business.currency, { decimals: false })} this month`} onPress={() => router.push('/reports')} />
        ) : null}
        <MenuRow icon="bell" title="Notifications" value={unread ? `${unread} new` : undefined} onPress={() => router.push('/notifications')} />
      </ListCard>

      <GroupLabel label="Settings" />
      <ListCard>
        <MenuRow icon="building-2" title="Business profile" onPress={() => router.push('/settings/business')} />
        <MenuRow icon="users-round" title="Team & roles" value={`${activeMembers} ${activeMembers === 1 ? 'member' : 'members'}`} onPress={() => router.push('/settings/team')} />
        <MenuRow icon="sliders-horizontal" title="Preferences" subtitle="Currency, language, alerts" onPress={() => router.push('/settings/preferences')} />
        <MenuRow icon="user" title="Account & security" onPress={() => router.push('/settings/account')} />
        <MenuRow icon="log-out" title="Sign out" danger onPress={() => setConfirm(true)} />
      </ListCard>
      {api.mode === 'demo' ? (
        <Txt variant="caption" color="textTertiary" align="center">
          Demo mode — data is stored on this phone only.
        </Txt>
      ) : null}

      <Dialog
        visible={confirm}
        icon="log-out"
        title="Sign out of Nuvora?"
        body="You’ll need your email and password to sign back in. Your business data stays safe."
        confirmLabel="Sign out"
        loading={busy}
        onConfirm={signOut}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  business: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
