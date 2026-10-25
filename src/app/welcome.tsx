import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/Brand';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/data/local/seed';
import { colors, SIDE, welcomeGradient } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

const values: [IconName, string][] = [
  ['clipboard-list', 'Orders and customers in one place'],
  ['wallet', 'Know exactly who has paid'],
  ['chart-column', 'See today’s business at a glance'],
];

/** Onboarding / 01 Welcome */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={[...welcomeGradient.colors]} locations={[...welcomeGradient.locations]} style={StyleSheet.absoluteFill} />
      {/* Motif: thin orbits and the rising point */}
      <View pointerEvents="none" style={[styles.orbit, { width: 420, height: 420, borderRadius: 210, left: 120, top: insets.top - 107 }]} />
      <View pointerEvents="none" style={[styles.orbit, { width: 280, height: 280, borderRadius: 140, left: 190, top: insets.top - 37 }]} />
      <View pointerEvents="none" style={[styles.point, { left: 330, top: insets.top + 103 }]} />

      <View style={{ flex: 1, paddingTop: insets.top + 72, paddingHorizontal: SIDE, gap: 16 }}>
        <Wordmark />
        <View style={{ height: 70 }} />
        <Txt style={styles.headline} accessibilityRole="header">
          Everything your business needs, in one clear workspace.
        </Txt>
        <Txt variant="body" color="textSecondary" style={{ maxWidth: 330 }}>
          Track orders, customers and money for your laundry, salon or shop — from your phone.
        </Txt>
        <View style={{ height: 8 }} />
        {values.map(([icon, label]) => (
          <View key={label} style={styles.value}>
            <View style={styles.valueIcon}>
              <Icon name={icon} size={16} />
            </View>
            <Txt variant="bodyMedium">{label}</Txt>
          </View>
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Button label="Create account" onPress={() => router.push('/sign-up')} />
        <Button label="I already have an account" variant="tertiary" onPress={() => router.push('/sign-in')} />
        {api.mode === 'demo' ? (
          <Txt variant="caption" color="textSecondary" align="center">
            Demo mode · data stays on this phone. Try {DEMO_EMAIL} / {DEMO_PASSWORD}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orbit: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(67, 56, 202, 0.15)' },
  point: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  headline: { fontFamily: fonts.serif, fontSize: 46, lineHeight: 48, letterSpacing: -0.9, color: colors.text },
  value: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingTop: 16, paddingHorizontal: SIDE, gap: 8 },
});
