import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { KeyValue, ListCard, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { CURRENCIES, currencySymbol } from '@/lib/money';
import { categoryLabel } from '@/state/options';
import { useWorkspace } from '@/state/session';
import { colors } from '@/theme/tokens';

/** Onboarding / 06 Setup Complete */
export default function SetupComplete() {
  const router = useRouter();
  const ws = useWorkspace();
  const first = ws.member.fullName.split(' ')[0] || 'there';
  const currency = CURRENCIES.find((c) => c.code === ws.business.currency)?.code ?? ws.business.currency;

  return (
    <Screen
      paddingTop={72}
      footer={
        <>
          <Button label="Go to dashboard" onPress={() => router.replace('/')} />
          <Button label="Add your first customer" variant="tertiary" onPress={() => router.replace('/customer/new')} />
        </>
      }
    >
      <View style={{ alignItems: 'center', gap: 12 }}>
        <View style={styles.mark}>
          <View style={styles.inner}>
            <Icon name="check" size={40} color="onPrimary" />
          </View>
          <View style={styles.point} />
        </View>
        <Txt variant="display" align="center" accessibilityRole="header">
          You’re all set, {first}
        </Txt>
        <Txt variant="body" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
          {ws.business.name} is ready. Here’s what we set up for you:
        </Txt>
      </View>
      <ListCard verticalPadding={4}>
        <KeyValue label="Business" value={ws.business.name} valueVariant="bodyMedium" />
        <KeyValue label="Category" value={categoryLabel(ws.business.category)} valueVariant="bodyMedium" />
        <KeyValue label="Currency" value={`${currency} (${currencySymbol(currency)})`} valueVariant="bodyMedium" />
        <KeyValue
          label="Services added"
          value={ws.services.length ? `${ws.services.length} ${ws.business.category} presets` : 'None yet'}
          valueVariant="bodyMedium"
        />
      </ListCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.success50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  inner: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  point: { position: 'absolute', top: 8, left: 96, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent },
});
