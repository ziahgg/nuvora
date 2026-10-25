import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, OptionSheet, useToast } from '@/components/Feedback';
import { AppBar, GroupLabel, KeyValue, ListCard, MenuRow, Screen } from '@/components/Layout';
import { Avatar } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { workspaceCsvFiles } from '@/lib/csv';
import { ROLE_LABEL } from '@/state/options';
import { errorMessage, usePermissions, useSession, useWorkspace } from '@/state/session';

/** Settings / 45 Account Settings. */
export default function Account() {
  const ws = useWorkspace();
  const { user } = useSession();
  const toast = useToast();
  const { finance } = usePermissions();
  const [details, setDetails] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const email = user?.email ?? ws.member.email;
  const name = user?.fullName || ws.member.fullName;

  async function resetPassword() {
    if (api.mode === 'demo') return toast('Demo mode can’t send email. Connect Supabase to reset passwords.', { kind: 'info' });
    try {
      await api.sendPasswordReset(email);
      toast(`Password reset link sent to ${email}`, { kind: 'info' });
    } catch (e) {
      toast(errorMessage(e), { kind: 'error' });
    }
  }

  async function exportFile(fileName: string) {
    try {
      const files = workspaceCsvFiles(ws);
      const chosen = files.find((f) => f.name === fileName);
      if (!chosen) return;
      const dir = new Directory(Paths.cache, 'nuvora-export');
      if (!dir.exists) dir.create();
      const file = new File(dir, `${ws.business.name.replace(/[^\w]+/g, '-').toLowerCase()}-${chosen.name}`);
      if (file.exists) file.delete();
      file.create();
      file.write(chosen.content);
      if (!(await Sharing.isAvailableAsync())) return toast('Sharing isn’t available on this device.', { kind: 'error' });
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: `Export ${chosen.name}`, UTI: 'public.comma-separated-values-text' });
    } catch (e) {
      toast(errorMessage(e), { kind: 'error' });
    }
  }

  return (
    <Screen>
      <AppBar title="Account & security" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={name} size={56} />
        <View style={{ gap: 2 }}>
          <Txt variant="heading">{name}</Txt>
          <Txt variant="caption" color="textSecondary">
            {email} · {ROLE_LABEL[ws.member.role]}
          </Txt>
        </View>
      </View>
      <ListCard>
        <MenuRow icon="user" title="Personal details" subtitle="Name, email, role" onPress={() => setDetails(true)} />
        <MenuRow icon="lock" title="Password" subtitle="Send a reset link to your email" onPress={resetPassword} />
      </ListCard>
      {finance ? (
        <>
          <GroupLabel label="Data" />
          <ListCard>
            <MenuRow icon="file-text" title="Export data" subtitle="Orders, customers, payments and expenses (CSV)" onPress={() => setExportOpen(true)} />
          </ListCard>
        </>
      ) : null}
      <BottomSheet visible={details} onClose={() => setDetails(false)} title="Personal details">
        <ListCard verticalPadding={4}>
          <KeyValue label="Name" value={name} valueVariant="bodyMedium" />
          <KeyValue label="Email" value={email} valueVariant="bodyMedium" />
          <KeyValue label="Role" value={ROLE_LABEL[ws.member.role]} valueVariant="bodyMedium" />
          <KeyValue label="Business" value={ws.business.name} valueVariant="bodyMedium" />
        </ListCard>
      </BottomSheet>
      <OptionSheet
        visible={exportOpen}
        title="Export data"
        options={[
          { value: 'orders.csv', label: 'Orders', caption: `${ws.orders.length} rows` },
          { value: 'customers.csv', label: 'Customers', caption: `${ws.customers.length} rows` },
          { value: 'payments.csv', label: 'Payments', caption: `${ws.payments.length} rows` },
          { value: 'expenses.csv', label: 'Expenses', caption: `${ws.expenses.length} rows` },
        ]}
        onSelect={(v) => setTimeout(() => void exportFile(v), 400)}
        onClose={() => setExportOpen(false)}
      />
    </Screen>
  );
}
