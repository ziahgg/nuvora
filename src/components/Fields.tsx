import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/tokens';
import { fonts, type } from '@/theme/typography';
import { Icon } from './Icon';
import { Txt } from './Text';

/** Figma "Text Field": Default / Focused / Filled / Error / Disabled. */
export function TextField({
  label,
  helper,
  error,
  disabled,
  multiline,
  ...input
}: TextInputProps & { label: string; helper?: string; error?: string; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  const border = error ? colors.error : focused ? colors.ink : colors.border;
  return (
    <View style={styles.wrap}>
      <Txt variant="label" color={disabled ? 'textTertiary' : 'text'}>
        {label}
      </Txt>
      <View
        style={[
          styles.field,
          multiline ? styles.multiline : null,
          { borderColor: border, borderWidth: error || focused ? 1.5 : 1 },
          disabled ? { backgroundColor: colors.muted } : null,
        ]}
      >
        <TextInput
          {...input}
          editable={!disabled}
          multiline={multiline}
          accessibilityLabel={label}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[styles.input, multiline ? { minHeight: 44, textAlignVertical: 'top' } : null]}
        />
      </View>
      {error ? (
        <Txt variant="caption" color="errorText" accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : helper ? (
        <Txt variant="caption" color="textSecondary">
          {helper}
        </Txt>
      ) : null}
    </View>
  );
}

/** Figma "Select": a field that opens a picker sheet. */
export function SelectField({
  label,
  value,
  placeholder,
  helper,
  error,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  onPress: () => void;
}) {
  return (
    <View style={[styles.wrap, { flex: 1 }]}>
      <Txt variant="label">{label}</Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder ?? ''}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.field,
          { borderColor: error ? colors.error : colors.border, borderWidth: error ? 1.5 : 1 },
          pressed ? { opacity: 0.85 } : null,
        ]}
      >
        <Txt variant="body" color={value ? 'text' : 'textTertiary'} numberOfLines={1} style={{ flex: 1 }}>
          {value || placeholder}
        </Txt>
        <Icon name="chevron-down" size={18} color="textSecondary" />
      </Pressable>
      {error ? (
        <Txt variant="caption" color="errorText">
          {error}
        </Txt>
      ) : helper ? (
        <Txt variant="caption" color="textSecondary">
          {helper}
        </Txt>
      ) : null}
    </View>
  );
}

/** Figma "Search Field": Default / Active (ink border + clear button). */
export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <View style={[styles.search, active ? { borderWidth: 1.5, borderColor: colors.ink } : null]}>
      <Icon name="search" size={18} color={active ? 'text' : 'textSecondary'} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { flex: 1 }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} hitSlop={10}>
          <Icon name="x" size={18} color="textSecondary" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Large centred amount entry ("Amount received", "Amount spent"). */
export function AmountInput({
  label,
  value,
  onChangeText,
  currencySymbol,
  note,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  currencySymbol: string;
  note?: string;
  error?: boolean;
}) {
  return (
    <View style={[styles.amount, error ? { borderWidth: 1.5, borderColor: colors.error } : null]}>
      <Txt variant="label" color="textSecondary">
        {label}
      </Txt>
      <View style={styles.amountRow}>
        <Txt style={styles.amountText}>{currencySymbol}</Txt>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={label}
          // Size to the content: web inputs otherwise default to ~20 characters wide.
          style={[styles.amountText, styles.amountInput, { width: Math.max(value.length, 4) * 25 + 6 }]}
        />
      </View>
      {note ? (
        <Txt variant="caption" color={error ? 'errorText' : 'textSecondary'} align="center">
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  multiline: { paddingVertical: 12, alignItems: 'flex-start' },
  input: { ...type.body, color: colors.text, flex: 1, paddingVertical: 0 },
  search: {
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amount: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  amountText: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, color: colors.text, letterSpacing: -1 },
  amountInput: { paddingVertical: 0, paddingHorizontal: 0, textAlign: 'left' },
});
