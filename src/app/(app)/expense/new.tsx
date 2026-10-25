import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChipGroup } from '@/components/Badges';
import { Button } from '@/components/Button';
import { EmptyState, OptionSheet, useToast } from '@/components/Feedback';
import { AmountInput, SelectField, TextField } from '@/components/Fields';
import { Icon } from '@/components/Icon';
import { AppBar, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { api, type ExpenseCategory, type ExpenseInput, type PaymentMethod } from '@/data';
import { fmtDay } from '@/lib/dates';
import { addDays, monthToDate, periodMetrics, startOfDay } from '@/lib/finance';
import { currencySymbol, formatMoney, parseMoneyInput } from '@/lib/money';
import { expenseSchema, fieldErrors } from '@/lib/validation';
import { EXPENSE_OPTIONS, METHOD_OPTIONS } from '@/state/options';
import { useAction, usePermissions, useWorkspace } from '@/state/session';
import { colors } from '@/theme/tokens';

/** Finance / 27 Add Expense (→ 24b Finance updated toast with Undo). */
export default function AddExpense() {
  const router = useRouter();
  const ws = useWorkspace();
  const toast = useToast();
  const { finance } = usePermissions();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('supplies');
  const [description, setDescription] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [paidWith, setPaidWith] = useState<PaymentMethod>('cash');
  const [receipt, setReceipt] = useState<ExpenseInput['receipt']>(null);
  const [sheet, setSheet] = useState<'date' | 'method' | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const cur = ws.business.currency;

  const cents = parseMoneyInput(amount);
  const mtd = periodMetrics(ws, monthToDate());
  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ value: String(i), label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : fmtDay(addDays(new Date(), -i)) })),
    [],
  );

  const undo = useAction((expenseId: string) => api.deleteExpense(expenseId), { success: 'Expense removed', aboveTabBar: true });
  const save = useAction((input: ExpenseInput) => api.createExpense(ws.business.id, input), {
    onSuccess: (expenseId) => {
      router.navigate('/finance');
      toast('Expense saved · Profit updated', { aboveTabBar: true, action: { label: 'Undo', onPress: () => undo.run(expenseId) } });
    },
  });

  if (!finance) {
    return (
      <Screen>
        <AppBar title="Add expense" />
        <EmptyState icon="lock" title="Not available for your role" body="Only owners and managers can record expenses." />
      </Screen>
    );
  }

  async function pickReceipt() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast('Allow photo access to attach a receipt.', { kind: 'info' });
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled && res.assets[0]) setReceipt({ uri: res.assets[0].uri, mimeType: res.assets[0].mimeType ?? 'image/jpeg' });
  }

  function submit() {
    const parsed = expenseSchema.safeParse({ amountCents: cents ?? 0, description });
    if (!parsed.success) return setErrors(fieldErrors(parsed));
    const spentAt = dayOffset === 0 ? new Date() : new Date(startOfDay(addDays(new Date(), -dayOffset)).getTime() + 12 * 3600_000);
    save.run({ amountCents: parsed.data.amountCents, description: parsed.data.description, category, paidWith, spentAt: spentAt.toISOString(), receipt });
  }

  return (
    <Screen footer={<Button label="Save expense" onPress={submit} loading={save.pending} />}>
      <AppBar title="Add expense" />
      <AmountInput
        label="Amount spent"
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setErrors((e) => ({ ...e, amountCents: undefined }));
        }}
        currencySymbol={currencySymbol(cur)}
        note={errors.amountCents ?? `Paid ${paidWith === 'cash' ? 'from cash drawer' : `by ${METHOD_OPTIONS.find((m) => m.value === paidWith)?.label.toLowerCase()}`}`}
        error={!!errors.amountCents}
      />
      <View style={{ gap: 8 }}>
        <Txt variant="label">Category</Txt>
        <ChipGroup options={EXPENSE_OPTIONS} value={category} onChange={setCategory} />
      </View>
      <TextField
        label="Description"
        value={description}
        onChangeText={(v) => {
          setDescription(v);
          setErrors((e) => ({ ...e, description: undefined }));
        }}
        placeholder="e.g. Detergent restock"
        error={errors.description}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SelectField label="Date" value={days[dayOffset].label} onPress={() => setSheet('date')} />
        <SelectField label="Paid with" value={METHOD_OPTIONS.find((m) => m.value === paidWith)?.label} onPress={() => setSheet('method')} />
      </View>
      {receipt ? (
        <View style={styles.receipt}>
          <Image source={{ uri: receipt.uri }} style={styles.thumb} contentFit="cover" />
          <Txt variant="label" style={{ flex: 1 }}>
            Receipt attached
          </Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove receipt" onPress={() => setReceipt(null)} hitSlop={10}>
            <Icon name="x" size={18} color="textSecondary" />
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={pickReceipt} style={styles.attach}>
          <Icon name="receipt" size={18} color="primary" />
          <Txt variant="label" color="primary">
            Attach receipt photo (optional)
          </Txt>
        </Pressable>
      )}
      {cents ? (
        <Txt variant="caption" color="textSecondary">
          Profit for {new Date().toLocaleDateString('en-US', { month: 'short' })} will update to {formatMoney(mtd.profitCents - (dayOffset < new Date().getDate() ? cents : 0), cur)} after saving.
        </Txt>
      ) : null}
      <OptionSheet visible={sheet === 'date'} title="Date" options={days} value={String(dayOffset)} onSelect={(v) => setDayOffset(Number(v))} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'method'} title="Paid with" options={METHOD_OPTIONS} value={paidWith} onSelect={setPaidWith} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: colors.surface },
  thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.muted },
});
