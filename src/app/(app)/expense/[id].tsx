import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Dialog, EmptyState } from '@/components/Feedback';
import { AppBar, KeyValue, ListCard, Screen, SectionHeader } from '@/components/Layout';
import { IconTile } from '@/components/Rows';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { fmtFull } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { expenseLabel } from '@/state/options';
import { METHOD_LABEL } from '@/state/selectors';
import { useAction, useWorkspace } from '@/state/session';
import { colors } from '@/theme/tokens';

/** Finance / 28 Transaction Details (expense). */
export default function ExpenseDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  const expense = ws.expenses.find((e) => e.id === id);
  const receipt = useQuery({
    queryKey: ['receipt', expense?.receiptPath],
    queryFn: () => api.receiptUrl(expense!.receiptPath!),
    enabled: !!expense?.receiptPath,
  });
  const remove = useAction(() => api.deleteExpense(id), { success: 'Expense deleted', onSuccess: () => router.back() });
  const cur = ws.business.currency;

  if (!expense) {
    return (
      <Screen>
        <AppBar title="Expense" />
        <EmptyState icon="receipt" title="Expense not found" body="It may have been deleted." />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label="Delete expense" variant="tertiary" textColor="errorText" onPress={() => setConfirm(true)} />}>
      <AppBar title="Expense" />
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 8 }}>
        <IconTile icon="arrow-up-right" bg="error50" color="error" size={52} iconSize={26} />
        <Txt variant="kpiLarge">−{formatMoney(expense.amountCents, cur)}</Txt>
        <Txt variant="body" color="textSecondary">
          {expense.description}
        </Txt>
      </View>
      <ListCard verticalPadding={4}>
        <KeyValue label="Date" value={fmtFull(expense.spentAt)} valueVariant="bodyMedium" />
        <KeyValue label="Category" value={expenseLabel(expense.category)} valueVariant="bodyMedium" />
        <KeyValue label="Paid with" value={METHOD_LABEL[expense.paidWith]} valueVariant="bodyMedium" />
        <KeyValue label="Recorded by" value={expense.recordedByName || '—'} valueVariant="bodyMedium" />
      </ListCard>
      {expense.receiptPath ? (
        <>
          <SectionHeader title="Receipt" />
          {receipt.data ? (
            <Image source={{ uri: receipt.data }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 24, backgroundColor: colors.muted }} contentFit="cover" />
          ) : (
            <Txt variant="caption" color="textSecondary">
              {receipt.isLoading ? 'Loading receipt…' : 'Receipt image unavailable.'}
            </Txt>
          )}
        </>
      ) : null}
      <Txt variant="caption" color="textSecondary">
        Expenses reduce profit for the period they’re dated in.
      </Txt>
      <Dialog
        visible={confirm}
        tone="destructive"
        icon="trash-2"
        title="Delete this expense?"
        body={`${formatMoney(expense.amountCents, cur)} will be removed from expenses and profit will go up by the same amount.`}
        confirmLabel="Delete"
        loading={remove.pending}
        onConfirm={() => remove.run(undefined)}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
