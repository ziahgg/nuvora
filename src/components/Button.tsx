import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, shadows, type ColorToken } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Txt } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'outline';

const variants: Record<ButtonVariant | 'disabled', { bg?: ColorToken; fg: ColorToken; border?: ColorToken }> = {
  primary: { bg: 'ink', fg: 'onPrimary' },
  secondary: { bg: 'primary50', fg: 'primary' },
  tertiary: { fg: 'primary' },
  destructive: { bg: 'error', fg: 'onPrimary' },
  outline: { bg: 'surface', fg: 'text', border: 'border' },
  disabled: { bg: 'muted', fg: 'textTertiary' },
};

/** Figma "Button" component set: Primary / Secondary / Tertiary / Destructive / Outline / Disabled × Large / Small. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled,
  loading,
  icon,
  textColor,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'large' | 'small';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  /** Override for tertiary destructive actions ("Delete customer"). */
  textColor?: ColorToken;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const v = variants[disabled ? 'disabled' : variant];
  const large = size === 'large';
  const fg = disabled ? v.fg : (textColor ?? v.fg);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        large ? styles.large : styles.small,
        v.bg ? { backgroundColor: colors[v.bg] } : null,
        v.border ? { borderWidth: 1, borderColor: colors[v.border] } : null,
        pressed && !disabled ? { opacity: 0.82 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[fg]} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={large ? 20 : 18} color={fg} /> : null}
          <Txt variant="button" color={fg} style={!large ? { fontSize: 14 } : null} numberOfLines={1}>
            {label}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

/** Round icon button (44 px surface circles in headers, 58 px quick actions…). */
export function CircleButton({
  icon,
  onPress,
  size = 44,
  iconSize = 20,
  bg = 'surface',
  color = 'text',
  accessibilityLabel,
  badge,
  raised,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  bg?: ColorToken;
  color?: ColorToken;
  accessibilityLabel: string;
  badge?: boolean;
  raised?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[bg] },
        styles.center,
        raised ? shadows.raised : null,
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Icon name={icon} size={iconSize} color={color} />
      {badge ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

/** Inline text link ("See all", "View report →"). */
export function LinkText({
  label,
  onPress,
  color = 'primary',
}: {
  label: string;
  onPress: () => void;
  color?: ColorToken;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={10}>
      {({ pressed }) => (
        <Txt variant="label" color={color} style={pressed ? { opacity: 0.6 } : null}>
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
  },
  large: { height: 52, paddingHorizontal: 24 },
  small: { height: 40, paddingHorizontal: 14 },
  center: { alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
