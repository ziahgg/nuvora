import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState, OptionSheet } from '@/components/Feedback';
import { SelectField, TextField } from '@/components/Fields';
import { AppBar, Screen } from '@/components/Layout';
import { api, type BusinessCategory, type BusinessPatch } from '@/data';
import { businessEditSchema, fieldErrors } from '@/lib/validation';
import { CATEGORY_OPTIONS, categoryLabel } from '@/state/options';
import { useAction, usePermissions, useWorkspace } from '@/state/session';

/** Settings / 42b Edit Business Details. */
export default function EditBusiness() {
  const router = useRouter();
  const ws = useWorkspace();
  const { owner } = usePermissions();
  const b = ws.business;
  const [form, setForm] = useState({
    name: b.name,
    category: b.category as BusinessCategory,
    phone: b.phone,
    email: b.email,
    address: b.address,
    openingHours: b.openingHours,
    receiptFooter: b.receiptFooter,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [catOpen, setCatOpen] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = useAction((patch: BusinessPatch) => api.updateBusiness(b.id, patch), {
    onSuccess: () => router.replace('/settings/business?saved=1'),
  });

  if (!owner) {
    return (
      <Screen>
        <AppBar title="Edit business" />
        <EmptyState icon="lock" title="Owner only" body="Only the owner can edit business details." />
      </Screen>
    );
  }

  function submit() {
    const parsed = businessEditSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed));
    save.run({ ...parsed.data, receiptFooter: form.receiptFooter.trim() });
  }

  return (
    <Screen footer={<Button label="Save changes" loading={save.pending} onPress={submit} />}>
      <AppBar title="Edit business" />
      <View style={{ gap: 16 }}>
        <TextField label="Business name" value={form.name} onChangeText={set('name')} error={errors.name} />
        <SelectField label="Category" value={categoryLabel(form.category)} onPress={() => setCatOpen(true)} />
        <TextField label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
        <TextField label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <TextField label="Address" value={form.address} onChangeText={set('address')} error={errors.address} />
        <TextField
          label="Opening hours"
          value={form.openingHours}
          onChangeText={set('openingHours')}
          placeholder="e.g. Mon–Sat · 08:00–19:00"
          helper="Shown on receipts and reminders"
          error={errors.openingHours}
        />
        <TextField label="Receipt footer" value={form.receiptFooter} onChangeText={set('receiptFooter')} multiline placeholder="e.g. Thank you for choosing us!" />
      </View>
      <OptionSheet
        visible={catOpen}
        title="Category"
        options={CATEGORY_OPTIONS}
        value={form.category}
        onSelect={(category) => setForm((f) => ({ ...f, category }))}
        onClose={() => setCatOpen(false)}
      />
    </Screen>
  );
}
