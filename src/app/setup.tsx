import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ChipGroup } from '@/components/Badges';
import { Button } from '@/components/Button';
import { OptionSheet, useToast } from '@/components/Feedback';
import { SelectField, TextField } from '@/components/Fields';
import { AppBar, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { api, type BusinessCategory } from '@/data';
import { CURRENCIES } from '@/lib/money';
import { businessSchema, fieldErrors } from '@/lib/validation';
import { CATEGORY_OPTIONS } from '@/state/options';
import { errorMessage, useSession, WORKSPACE_KEY } from '@/state/session';
import { colors } from '@/theme/tokens';

/** Onboarding / 05 Business Setup */
export default function BusinessSetup() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useSession();
  const [form, setForm] = useState({
    name: '',
    category: 'laundry' as BusinessCategory,
    currency: 'USD',
    phone: '',
    email: user?.email ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = businessSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed));
    setBusy(true);
    try {
      await api.createBusiness(parsed.data);
      await qc.refetchQueries({ queryKey: WORKSPACE_KEY });
      // Wait one frame so the root guard has switched to the app group.
      requestAnimationFrame(() => router.replace('/setup-complete'));
    } catch (e) {
      toast(errorMessage(e), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen gap={20} footer={<Button label="Finish setup" onPress={submit} loading={busy} />}>
      <AppBar onBack={() => void api.signOut()} />
      <View style={{ gap: 8 }}>
        <Txt variant="caption" color="textSecondary">
          Step 2 of 2 · Business details
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.primary }} />
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.primary }} />
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Txt variant="display" accessibilityRole="header">
          Tell us about your business
        </Txt>
        <Txt variant="body" color="textSecondary">
          This sets up your workspace, currency and receipts. You can change it later.
        </Txt>
      </View>
      <View style={{ gap: 16 }}>
        <TextField
          label="Business name"
          value={form.name}
          onChangeText={(name) => setForm((f) => ({ ...f, name }))}
          error={errors.name}
        />
        <View style={{ gap: 8 }}>
          <Txt variant="label">Business category</Txt>
          <ChipGroup options={CATEGORY_OPTIONS} value={form.category} onChange={(category) => setForm((f) => ({ ...f, category }))} />
        </View>
        <SelectField
          label="Currency"
          value={CURRENCIES.find((c) => c.code === form.currency)?.label}
          onPress={() => setCurrencyOpen(true)}
          error={errors.currency}
        />
        <TextField
          label="Business phone"
          value={form.phone}
          onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
          keyboardType="phone-pad"
          error={errors.phone}
        />
        <TextField
          label="Business email"
          value={form.email}
          onChangeText={(email) => setForm((f) => ({ ...f, email }))}
          keyboardType="email-address"
          autoCapitalize="none"
          helper="Shown on receipts sent to customers"
          error={errors.email}
        />
      </View>
      <OptionSheet
        visible={currencyOpen}
        title="Currency"
        value={form.currency}
        options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
        onSelect={(currency) => setForm((f) => ({ ...f, currency }))}
        onClose={() => setCurrencyOpen(false)}
      />
    </Screen>
  );
}
