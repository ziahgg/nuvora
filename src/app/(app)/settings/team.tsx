import { useState } from 'react';
import { View } from 'react-native';

import { ChipGroup } from '@/components/Badges';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/Feedback';
import { TextField } from '@/components/Fields';
import { AppBar, ListCard, Note, Screen, SectionHeader } from '@/components/Layout';
import { CustomerRow } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api, type InviteInput } from '@/data';
import { fmtShort } from '@/lib/dates';
import { fieldErrors, inviteSchema } from '@/lib/validation';
import { ROLE_LABEL } from '@/state/options';
import { useAction, usePermissions, useWorkspace } from '@/state/session';

const ROLES = [
  { role: 'Owner', text: 'Everything, including finance, team and billing' },
  { role: 'Manager', text: 'Orders, customers, payments, schedule and reports' },
  { role: 'Staff', text: 'Orders, customers and schedule. No finance or reports' },
];

/** Settings / 43 Team & Roles. */
export default function Team() {
  const ws = useWorkspace();
  const { owner } = usePermissions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InviteInput>({ fullName: '', email: '', role: 'staff' });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const invite = useAction((input: InviteInput) => api.inviteMember(ws.business.id, input), {
    success: (_r, i) => `${i.fullName} added · they join when they sign up with ${i.email}`,
    onSuccess: () => {
      setOpen(false);
      setForm({ fullName: '', email: '', role: 'staff' });
    },
  });

  return (
    <Screen footer={owner ? <Button label="Invite team member" onPress={() => setOpen(true)} /> : undefined}>
      <AppBar title="Team & roles" />
      <ListCard>
        {ws.members.map((m) => (
          <CustomerRow
            key={m.id}
            name={m.fullName || m.email}
            subtitle={m.status === 'pending' ? `Invited · ${fmtShort(m.createdAt)}` : m.email}
            amount={ROLE_LABEL[m.role]}
            status={m.status === 'pending' ? 'Pending' : 'Active'}
            statusColor={m.status === 'pending' ? 'warningText' : 'successText'}
          />
        ))}
      </ListCard>
      <SectionHeader title="What each role can do" />
      <ListCard verticalPadding={4}>
        {ROLES.map((r) => (
          <View key={r.role} style={{ paddingVertical: 12, gap: 2 }}>
            <Txt variant="bodyMedium">{r.role}</Txt>
            <Txt variant="caption" color="textSecondary">
              {r.text}
            </Txt>
          </View>
        ))}
      </ListCard>
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Invite team member"
        footer={
          <Button
            label="Add to team"
            loading={invite.pending}
            onPress={() => {
              const parsed = inviteSchema.safeParse(form);
              if (!parsed.success) return setErrors(fieldErrors(parsed));
              invite.run(parsed.data);
            }}
          />
        }
      >
        <TextField label="Full name" value={form.fullName} onChangeText={(fullName) => setForm((f) => ({ ...f, fullName }))} error={errors.fullName} />
        <TextField
          label="Email"
          value={form.email}
          onChangeText={(email) => setForm((f) => ({ ...f, email }))}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        <View style={{ gap: 8 }}>
          <Txt variant="label">Role</Txt>
          <ChipGroup
            options={[
              { value: 'staff', label: 'Staff' },
              { value: 'manager', label: 'Manager' },
            ]}
            value={form.role}
            onChange={(role) => setForm((f) => ({ ...f, role }))}
          />
        </View>
        <Note text="Nuvora doesn’t send an email for you. Ask them to create an account with this email address — they’ll join your team automatically." />
      </BottomSheet>
    </Screen>
  );
}
