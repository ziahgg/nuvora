import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Toggle } from '@/components/Brand';
import { Dialog, OptionSheet } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { AppBar, GroupLabel, KeyValue, ListCard, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { api, type Preferences as Prefs } from '@/data';
import { CURRENCIES } from '@/lib/money';
import { useAction, usePermissions, useWorkspace } from '@/state/session';

const TOGGLES: { key: keyof Prefs; title: string; caption: string }[] = [
  { key: 'notifyPayments', title: 'Payments received', caption: 'Every payment, in the notification center' },
  { key: 'notifyOverdue', title: 'Overdue balances', caption: 'Orders past their due date with money owed' },
  { key: 'notifyAppointments', title: 'Upcoming appointments', caption: 'Today’s pickups, deliveries and orders due tomorrow' },
  { key: 'reminderSms', title: 'Remind customers by default', caption: 'New appointments start with “Remind customer” on' },
];

/** Settings / 44 Preferences. */
export default function Preferences() {
  const ws = useWorkspace();
  const { owner } = usePermissions();
  const [prefs, setPrefs] = useState<Prefs>(ws.preferences);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);

  const savePrefs = useAction((p: Prefs) => api.updatePreferences(p));
  const saveCurrency = useAction((currency: string) => api.updateBusiness(ws.business.id, { currency }), {
    success: 'Currency updated',
    onSuccess: () => setPendingCurrency(null),
  });

  const toggle = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs.run(next, { onError: () => setPrefs(prefs) });
  };

  return (
    <Screen>
      <AppBar title="Preferences" />
      <GroupLabel label="Regional" />
      <ListCard verticalPadding={4}>
        <Pressable accessibilityRole="button" disabled={!owner} onPress={() => setCurrencyOpen(true)} style={styles.row}>
          <View style={{ flex: 1 }}>
            <KeyValue label="Currency" value={CURRENCIES.find((c) => c.code === ws.business.currency)?.label ?? ws.business.currency} valueVariant="bodyMedium" />
          </View>
          {owner ? <Icon name="chevron-right" size={16} color="textTertiary" /> : null}
        </Pressable>
        <KeyValue label="Language" value="English (US)" valueVariant="bodyMedium" />
        <KeyValue label="Date format" value="Thu, 22 Oct 2026" valueVariant="bodyMedium" />
        <KeyValue label="First day of week" value="Monday" valueVariant="bodyMedium" />
      </ListCard>
      <GroupLabel label="Notifications" />
      <ListCard verticalPadding={4}>
        {TOGGLES.map((t) => (
          <View key={t.key} style={styles.toggle}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodyMedium">{t.title}</Txt>
              <Txt variant="caption" color="textSecondary">
                {t.caption}
              </Txt>
            </View>
            <Toggle label={t.title} value={prefs[t.key]} onChange={(v) => toggle(t.key, v)} />
          </View>
        ))}
      </ListCard>
      <Txt variant="caption" color="textSecondary">
        Alerts appear in the notification center. Push notifications and SMS delivery need a messaging provider and aren’t connected yet.
      </Txt>
      <OptionSheet
        visible={currencyOpen}
        title="Currency"
        options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
        value={ws.business.currency}
        onSelect={(c) => c !== ws.business.currency && setTimeout(() => setPendingCurrency(c), 350)}
        onClose={() => setCurrencyOpen(false)}
      />
      <Dialog
        visible={!!pendingCurrency}
        icon="banknote"
        title={`Switch to ${pendingCurrency}?`}
        body="Existing amounts keep their numbers — only the currency label changes. Nothing is converted."
        confirmLabel="Switch"
        loading={saveCurrency.pending}
        onConfirm={() => pendingCurrency && saveCurrency.run(pendingCurrency)}
        onCancel={() => setPendingCurrency(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
