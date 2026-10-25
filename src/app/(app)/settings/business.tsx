import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppIcon } from '@/components/Brand';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Feedback';
import { AppBar, Card, GroupLabel, KeyValue, ListCard, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { fmtMonthShort } from '@/lib/dates';
import { categoryLabel } from '@/state/options';
import { usePermissions, useWorkspace } from '@/state/session';

/** Settings / 42 Business Profile (+ 42c changes saved). */
export default function BusinessProfile() {
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const toast = useToast();
  const { owner } = usePermissions();
  const b = ws.business;

  useEffect(() => {
    if (saved) toast('Business details saved');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  return (
    <Screen footer={owner ? <Button label="Edit details" onPress={() => router.push('/settings/business-edit')} /> : undefined}>
      <AppBar title="Business profile" />
      <View style={{ alignItems: 'center', gap: 8 }}>
        <AppIcon size={70} />
        <Txt variant="title" align="center">
          {b.name}
        </Txt>
        <Txt variant="caption" color="textSecondary">
          {categoryLabel(b.category)} · Since {fmtMonthShort(b.createdAt)}
        </Txt>
      </View>
      <ListCard verticalPadding={4}>
        <KeyValue label="Business name" value={b.name} valueVariant="bodyMedium" />
        <KeyValue label="Category" value={categoryLabel(b.category)} valueVariant="bodyMedium" />
        <KeyValue label="Phone" value={b.phone || '—'} valueVariant="bodyMedium" />
        <KeyValue label="Email" value={b.email || '—'} valueVariant="bodyMedium" />
        <KeyValue label="Address" value={b.address || '—'} valueVariant="bodyMedium" />
        <KeyValue label="Opening hours" value={b.openingHours || '—'} valueVariant="bodyMedium" />
      </ListCard>
      <GroupLabel label="Receipt footer" />
      <Card style={{ paddingVertical: 14 }}>
        <Txt variant="body" color="textSecondary">
          {b.receiptFooter || 'No footer yet — add a thank-you note or pickup policy.'}
        </Txt>
      </Card>
      {!owner ? (
        <Txt variant="caption" color="textSecondary">
          Only the owner can edit business details.
        </Txt>
      ) : null}
    </Screen>
  );
}
