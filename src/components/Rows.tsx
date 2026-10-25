import { Pressable, StyleSheet, View } from 'react-native';

import { colors, type ColorToken } from '@/theme/tokens';
import { StatusBadge, type BadgeStatus } from './Badges';
import { Icon, type IconName } from './Icon';
import { Txt } from './Text';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Txt variant="label" weight="semibold" color="primary" size={size >= 56 ? Math.round(size * 0.32) : 13}>
        {initials(name)}
      </Txt>
    </View>
  );
}

export function IconTile({
  icon,
  bg,
  color,
  size = 40,
  iconSize,
}: {
  icon: IconName;
  bg: ColorToken;
  color: ColorToken;
  size?: number;
  iconSize?: number;
}) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[bg] }]}>
      <Icon name={icon} size={iconSize ?? Math.round(size / 2)} color={color} />
    </View>
  );
}

function Wrapper({ onPress, children, label }: { onPress?: () => void; children: React.ReactNode; label?: string }) {
  if (!onPress) return <View style={styles.row}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { opacity: 0.6 } : null]}
    >
      {children}
    </Pressable>
  );
}

/** Figma "List/Order Row". */
export function OrderRow({
  title,
  subtitle,
  amount,
  status,
  onPress,
}: {
  title: string;
  subtitle: string;
  amount: string;
  status: BadgeStatus;
  onPress?: () => void;
}) {
  return (
    <Wrapper onPress={onPress} label={`${title}, ${subtitle}, ${amount}`}>
      <View style={styles.rowTall}>
        <IconTile icon="shirt" bg="primary50" color="primary" />
        <View style={styles.text}>
          <Txt variant="bodyMedium" numberOfLines={1}>
            {title}
          </Txt>
          <Txt variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Txt>
        </View>
        <View style={styles.right}>
          <Txt variant="figure">{amount}</Txt>
          <StatusBadge status={status} />
        </View>
      </View>
    </Wrapper>
  );
}

/** Figma "List/Customer Row" (also used for team members and contact cards). */
export function CustomerRow({
  name,
  subtitle,
  amount,
  status,
  statusColor = 'textSecondary',
  onPress,
}: {
  name: string;
  subtitle: string;
  amount?: string;
  status?: string;
  statusColor?: ColorToken;
  onPress?: () => void;
}) {
  return (
    <Wrapper onPress={onPress} label={`${name}, ${subtitle}`}>
      <Avatar name={name} />
      <View style={styles.text}>
        <Txt variant="bodyMedium" numberOfLines={1}>
          {name}
        </Txt>
        <Txt variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </Txt>
      </View>
      <View style={styles.right}>
        {amount ? <Txt variant="figure">{amount}</Txt> : null}
        {status ? (
          <Txt variant="caption" color={statusColor}>
            {status}
          </Txt>
        ) : null}
      </View>
    </Wrapper>
  );
}

/** Figma "List/Transaction Row" — Income (green, arrow-down-left) / Expense (red, arrow-up-right). */
export function TransactionRow({
  kind,
  title,
  subtitle,
  amount,
  method,
  onPress,
}: {
  kind: 'income' | 'expense';
  title: string;
  subtitle: string;
  amount: string;
  method: string;
  onPress?: () => void;
}) {
  const income = kind === 'income';
  return (
    <Wrapper onPress={onPress} label={`${title}, ${amount}`}>
      <IconTile
        icon={income ? 'arrow-down-left' : 'arrow-up-right'}
        bg={income ? 'success50' : 'error50'}
        color={income ? 'success' : 'error'}
      />
      <View style={styles.text}>
        <Txt variant="bodyMedium" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </Txt>
      </View>
      <View style={[styles.right, { gap: 4 }]}>
        <Txt variant="figure" color={income ? 'successText' : 'text'}>
          {amount}
        </Txt>
        <Txt variant="caption" color="textSecondary">
          {method}
        </Txt>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.primary100, alignItems: 'center', justifyContent: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 },
  rowTall: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minHeight: 52 },
  text: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
});
