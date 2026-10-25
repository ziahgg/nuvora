import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Children, Fragment, isValidElement, useEffect, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ambientGradient, colors, shadows, SIDE, type ColorToken } from '@/theme/tokens';
import { CircleButton, LinkText } from './Button';
import { setFooterHeight } from './overlayInsets';
import { Icon, type IconName } from './Icon';
import { Txt } from './Text';

export const TAB_BAR_HEIGHT = 84;

/**
 * Screen shell from the Figma frames: warm background with the ambient
 * gradient, fixed status bar area, scrolling content, optional fixed footer.
 */
export function Screen({
  children,
  footer,
  withTabBar,
  gap = 16,
  paddingTop = 0,
  scroll = true,
  onRefresh,
  refreshing = false,
  overlay,
  background,
}: {
  children: ReactNode;
  footer?: ReactNode;
  withTabBar?: boolean;
  gap?: number;
  paddingTop?: number;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  overlay?: ReactNode;
  background?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const bottomPad = withTabBar ? TAB_BAR_HEIGHT + insets.bottom + 24 : footer ? 24 : insets.bottom + 24;
  const content = (
    <View style={{ gap, paddingHorizontal: SIDE, paddingTop, paddingBottom: bottomPad }}>{children}</View>
  );
  return (
    <View style={styles.root}>
      {background ?? (
        <LinearGradient
          pointerEvents="none"
          colors={[...ambientGradient.colors]}
          locations={[...ambientGradient.locations]}
          style={[styles.gradient, { height: ambientGradient.height }]}
        />
      )}
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: insets.top }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
            }
          >
            {content}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{content}</View>
        )}
        {footer ? <Footer>{footer}</Footer> : null}
      </KeyboardAvoidingView>
      {overlay}
    </View>
  );
}

/** Fixed "Footer actions" panel: surface, 28 px top radius, upward shadow. */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  useEffect(() => () => setFooterHeight(0), []);
  return (
    <View
      onLayout={(e) => setFooterHeight(Math.round(e.nativeEvent.layout.height))}
      style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
    >
      {children}
    </View>
  );
}

/** Figma "App Bar / Type=Back": back circle, centred serif title, optional action circle. */
export function AppBar({
  title,
  action,
  onBack,
}: {
  title?: string;
  action?: { icon: IconName; label: string; onPress: () => void };
  onBack?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.appBar}>
      <CircleButton
        icon="chevron-left"
        size={42}
        iconSize={22}
        accessibilityLabel="Back"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      />
      <Txt variant="heading" align="center" numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">
        {title ?? ''}
      </Txt>
      {action ? (
        <CircleButton icon={action.icon} size={42} iconSize={22} accessibilityLabel={action.label} onPress={action.onPress} />
      ) : (
        <View style={{ width: 42 }} />
      )}
    </View>
  );
}

/** Tab-root header: Display title + optional dark circular action. */
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: { icon: IconName; label: string; onPress: () => void };
}) {
  return (
    <View style={styles.pageHeader}>
      <Txt variant="display" accessibilityRole="header">
        {title}
      </Txt>
      {action ? (
        <CircleButton icon={action.icon} bg="ink" color="onPrimary" accessibilityLabel={action.label} onPress={action.onPress} />
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style,
  bg = 'surface',
  radius = 24,
  padding = 16,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  bg?: ColorToken;
  radius?: number;
  padding?: number;
}) {
  return <View style={[{ backgroundColor: colors[bg], borderRadius: radius, padding }, style]}>{children}</View>;
}

/** Surface card holding rows separated by 1 px dividers (Figma list groups). */
export function ListCard({
  children,
  style,
  verticalPadding = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  verticalPadding?: number;
}) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.listCard, { paddingVertical: verticalPadding }, style]}>
      {items.map((child, i) => (
        <Fragment key={child.key ?? i}>
          {i > 0 ? <Divider /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/** Label / value row used in summaries ("Order total  $40.00"). */
export function KeyValue({
  label,
  value,
  strongLabel,
  valueColor = 'text',
  valueVariant = 'figure',
  large,
}: {
  label: string;
  value: string;
  strongLabel?: boolean;
  valueColor?: ColorToken;
  valueVariant?: 'figure' | 'bodyMedium';
  large?: boolean;
}) {
  return (
    <View style={styles.kv}>
      <Txt variant={strongLabel ? 'bodyMedium' : 'body'} color="textSecondary" style={{ flexShrink: 1 }}>
        {label}
      </Txt>
      <Txt
        variant={valueVariant}
        color={valueColor}
        size={large ? 17 : undefined}
        style={{ flexShrink: 1, textAlign: 'right' }}
      >
        {value}
      </Txt>
    </View>
  );
}

export function SectionHeader({
  title,
  link,
  size = 'heading',
}: {
  title: string;
  link?: { label: string; onPress: () => void; color?: ColorToken };
  size?: 'heading' | 'large';
}) {
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="heading" size={size === 'large' ? 26 : undefined} accessibilityRole="header">
        {title}
      </Txt>
      {link ? <LinkText label={link.label} onPress={link.onPress} color={link.color} /> : null}
    </View>
  );
}

/** Overline group label ("TODAY · THU 22 OCT") with optional right note. */
export function GroupLabel({ label, note }: { label: string; note?: string }) {
  return (
    <View style={styles.groupLabel}>
      <Txt variant="overline" color="textTertiary">
        {label}
      </Txt>
      {note ? (
        <Txt variant="caption" color="textSecondary">
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

/** Tinted note with an icon (primary-50 info notes, warnings, tips). */
export function Note({
  icon = 'info',
  text,
  tone = 'primary',
  action,
}: {
  icon?: IconName;
  text: string;
  tone?: 'primary' | 'warning' | 'error';
  action?: { label: string; onPress: () => void };
}) {
  const t = {
    primary: { bg: 'primary50', icon: 'primary', fg: 'primaryDark' },
    warning: { bg: 'warning50', icon: 'warning', fg: 'warningText' },
    error: { bg: 'error50', icon: 'error', fg: 'errorText' },
  }[tone] as { bg: ColorToken; icon: ColorToken; fg: ColorToken };
  return (
    <View style={[styles.note, { backgroundColor: colors[t.bg] }]}>
      <Icon name={icon} size={18} color={t.icon} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="caption" color={t.fg}>
          {text}
        </Txt>
        {action ? <LinkText label={action.label} onPress={action.onPress} color={t.fg} /> : null}
      </View>
    </View>
  );
}

/** Pressable list row with an icon tile, title, subtitle and chevron (More / settings menus). */
export function MenuRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  danger,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed ? { opacity: 0.6 } : null]}
    >
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.error50 : colors.muted }]}>
        <Icon name={icon} size={17} color={danger ? 'error' : 'text'} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="bodyMedium" color={danger ? 'errorText' : 'text'}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color="textSecondary">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt variant="label" color="textSecondary">
          {value}
        </Txt>
      ) : null}
      <Icon name="chevron-right" size={18} color="textTertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  footer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: SIDE,
    gap: 10,
    ...shadows.footer,
  },
  appBar: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, marginTop: 4 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: 12,
  },
  listCard: { backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 16 },
  divider: { height: 1, backgroundColor: colors.border },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    minHeight: 42,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  groupLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -2 },
  note: { flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 60 },
  menuIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
