import { Pressable, StyleSheet, Switch as RNSwitch, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Txt } from './Text';

/** Figma "Brand/App Icon" — continuous "N" stroke with the rising point. */
export function AppIcon({ size = 64, light }: { size?: number; light?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Nuvora">
      <Rect width={64} height={64} rx={16.64} fill={light ? colors.surface : colors.primary} />
      {light ? <Rect x={0.5} y={0.5} width={63} height={63} rx={16.14} stroke={colors.border} fill="none" /> : null}
      <Path
        d="M20 44V22.5L44 41.5V20"
        stroke={light ? colors.primary : '#ffffff'}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={50.4} cy={13.6} r={4.48} fill={colors.accent} />
    </Svg>
  );
}

/** Figma "Brand/Wordmark": icon + "nuvora" in Manrope ExtraBold. */
export function Wordmark({ onDark }: { onDark?: boolean }) {
  return (
    <View style={styles.wordmark} accessibilityRole="header" accessibilityLabel="Nuvora">
      <AppIcon size={32} />
      <Txt style={[styles.wordmarkText, { color: onDark ? colors.onPrimary : colors.text }]}>nuvora</Txt>
    </View>
  );
}

/** Quantity stepper (− 5 +) from the Create Order services list. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const active = value > 0;
  const fg = active ? 'primary' : 'text';
  return (
    <View style={[styles.stepper, { backgroundColor: active ? colors.primary50 : colors.muted }]} accessibilityRole="adjustable" accessibilityLabel={`${label} quantity`} accessibilityValue={{ now: value, min, max }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.stepBtn}
      >
        <Txt variant="heading" color={value <= min ? 'textTertiary' : fg}>
          −
        </Txt>
      </Pressable>
      <View style={styles.stepBtn}>
        <Txt variant="figure" color={fg}>
          {value}
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={styles.stepBtn}
      >
        <Txt variant="heading" color={fg}>
          +
        </Txt>
      </Pressable>
    </View>
  );
}

/** Switch styled with the primary/border tokens. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <RNSwitch
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.border}
    />
  );
}

const styles = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmarkText: { fontFamily: fonts.wordmark, fontSize: 26, lineHeight: 34, letterSpacing: -0.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, height: 34 },
  stepBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
