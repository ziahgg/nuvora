import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows, SIDE } from '@/theme/tokens';
import { Button, type ButtonVariant } from './Button';
import { Icon, type IconName } from './Icon';
import { TAB_BAR_HEIGHT } from './Layout';
import { useFooterHeight } from './overlayInsets';
import { Txt } from './Text';

/* ───────────────────────────── Toast ───────────────────────────── */

type ToastKind = 'success' | 'error' | 'info';
interface ToastOptions {
  kind?: ToastKind;
  action?: { label: string; onPress: () => void };
  aboveTabBar?: boolean;
}
interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string, opts?: ToastOptions) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

/** Figma "Feedback/Toast": ink pill, white label, accent action, auto-dismiss. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const footer = useFooterHeight();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, opts: ToastOptions = {}) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, kind: 'success', ...opts });
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timer.current = setTimeout(
        () => Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null)),
        opts.action ? 5000 : 3200,
      );
    },
    [opacity],
  );

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const icon: Record<ToastKind, { name: IconName; color: 'success' | 'error' | 'accent' }> = {
    success: { name: 'circle-check', color: 'success' },
    error: { name: 'circle-alert', color: 'error' },
    info: { name: 'info', color: 'accent' },
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            { opacity, bottom: footer ? footer + 16 : (toast.aboveTabBar ? TAB_BAR_HEIGHT : 0) + insets.bottom + 24 },
          ]}
        >
          <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icon name={icon[toast.kind ?? 'success'].name} size={20} color={icon[toast.kind ?? 'success'].color} />
            <Txt variant="label" color="onPrimary" style={{ flex: 1 }}>
              {toast.message}
            </Txt>
            {toast.action ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
                hitSlop={10}
              >
                <Txt variant="label" color="accent">
                  {toast.action.label}
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

/* ───────────────────────────── Dialog ───────────────────────────── */

/** Figma "Feedback/Dialog": Confirm / Destructive. */
export function Dialog({
  visible,
  icon,
  tone = 'confirm',
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  icon: IconName;
  tone?: 'confirm' | 'destructive';
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const destructive = tone === 'destructive';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.scrimCenter}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={[styles.dialogIcon, { backgroundColor: destructive ? colors.error50 : colors.primary50 }]}>
            <Icon name={icon} size={22} color={destructive ? 'error' : 'primary'} />
          </View>
          <Txt variant="heading" style={{ marginTop: 8 }}>
            {title}
          </Txt>
          <Txt variant="body" color="textSecondary">
            {body}
          </Txt>
          <View style={styles.dialogActions}>
            <Button label={cancelLabel} variant="outline" onPress={onCancel} style={{ flex: 1 }} />
            <Button
              label={confirmLabel}
              variant={(destructive ? 'destructive' : 'primary') as ButtonVariant}
              onPress={onConfirm}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────── Bottom sheet ─────────────────────────── */

export function BottomSheet({
  visible,
  onClose,
  title,
  headerAction,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  headerAction?: { label: string; onPress: () => void };
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrimBottom}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24, maxHeight: height * 0.88 }]} accessibilityViewIsModal>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Txt variant="heading" style={{ flex: 1 }} accessibilityRole="header">
              {title}
            </Txt>
            {headerAction ? (
              <Pressable accessibilityRole="button" onPress={headerAction.onPress} hitSlop={10}>
                <Txt variant="label" color="primary">
                  {headerAction.label}
                </Txt>
              </Pressable>
            ) : null}
          </View>
          <ScrollView bounces={false} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={{ gap: 10, marginTop: 14 }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/** Simple single-choice picker sheet (backs every Select field). */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string; caption?: string }[];
  value?: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                onSelect(o.value);
                onClose();
              }}
              style={({ pressed }) => [styles.option, pressed ? { opacity: 0.6 } : null]}
            >
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMedium">{o.label}</Txt>
                {o.caption ? (
                  <Txt variant="caption" color="textSecondary">
                    {o.caption}
                  </Txt>
                ) : null}
              </View>
              {selected ? <Icon name="check" size={20} color="primary" /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/* ─────────────────────── Empty, loading, error ─────────────────────── */

/** Figma "Feedback/Empty State": nested circles + rising point motif. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <View style={styles.emptyOuter}>
          <View style={styles.emptyInner}>
            <Icon name={icon} size={28} color="primary" />
          </View>
        </View>
        <View style={styles.risingPoint} />
      </View>
      <Txt variant="heading" align="center" style={{ marginTop: 16 }}>
        {title}
      </Txt>
      <Txt variant="body" color="textSecondary" align="center">
        {body}
      </Txt>
      {action ? <Button label={action.label} onPress={action.onPress} style={{ marginTop: 16, alignSelf: 'center' }} /> : null}
    </View>
  );
}

/** Figma "Feedback/Skeleton Row". */
export function SkeletonRow() {
  const [pulse] = useState(() => new Animated.Value(0.6));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.skeletonRow, { opacity: pulse }]} accessibilityLabel="Loading">
      <View style={[styles.skel, { width: 40, height: 40, borderRadius: 12 }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skel, { width: 160, height: 10 }]} />
        <View style={[styles.skel, { width: 110, height: 10 }]} />
      </View>
      <View style={[styles.skel, { width: 56, height: 12 }]} />
    </Animated.View>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.skelCard}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

/** Full-screen "You’re offline" / failed-to-load state. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const offline = /offline|network/i.test(message);
  return (
    <View style={styles.errorState}>
      <View style={styles.errorArt}>
        <Icon name={offline ? 'wifi-off' : 'circle-alert'} size={36} color="error" />
      </View>
      <Txt variant="title" align="center" style={{ marginTop: 6 }}>
        {offline ? 'You’re offline' : 'Something went wrong'}
      </Txt>
      <Txt variant="body" color="textSecondary" align="center">
        {message}
      </Txt>
      <Button label="Try again" onPress={onRetry} style={{ marginTop: 8, alignSelf: 'center' }} />
    </View>
  );
}

/** Inline error banner ("Transactions didn’t load … Retry"). */
export function ErrorBanner({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Icon name="circle-alert" size={20} color="error" />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="label" color="errorText">
          {title}
        </Txt>
        <Txt variant="caption" color="errorText">
          {body}
        </Txt>
        {onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
            <Txt variant="label" color="error" style={{ textDecorationLine: 'underline' }}>
              Retry
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function FullScreenLoader() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.loader]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/** Memoised helper so screens can open/close sheets by key. */
export function useSheet<K extends string>() {
  const [open, setOpen] = useState<K | null>(null);
  return useMemo(
    () => ({ open, show: (k: K) => setOpen(k), close: () => setOpen(null), is: (k: K) => open === k }),
    [open],
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: SIDE, right: SIDE },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...shadows.toast,
  },
  scrimCenter: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', paddingHorizontal: SIDE },
  scrimBottom: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  dialog: { backgroundColor: colors.surface, borderRadius: 28, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  dialogIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dialogActions: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: SIDE,
  },
  grabber: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
  emptyArt: { width: 96, height: 96 },
  emptyOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  risingPoint: {
    position: 'absolute',
    top: 10,
    left: 74,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  skel: { backgroundColor: colors.muted, borderRadius: 5 },
  skelCard: { backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 16 },
  errorState: { alignItems: 'center', paddingTop: 120, gap: 12 },
  errorArt: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.error50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.error50,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  loader: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
