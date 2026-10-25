import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { useToast } from '@/components/Feedback';
import { TextField } from '@/components/Fields';
import { Icon } from '@/components/Icon';
import { AppBar, Note, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { fieldErrors, signUpSchema } from '@/lib/validation';
import { errorMessage } from '@/state/session';
import { colors } from '@/theme/tokens';

/** Onboarding / 02 Create Account (+ 02b validation) */
export default function SignUp() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', acceptTerms: false });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function submit() {
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed));
    setBusy(true);
    try {
      const res = await api.signUp(parsed.data);
      if (res.status === 'confirm_email') setConfirmSent(true);
      // Signed in: the root layout's guard moves to business setup.
    } catch (e) {
      toast(errorMessage(e), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      gap={20}
      footer={
        <>
          <Button label="Create account" onPress={submit} loading={busy} />
          <Button label="Already have an account? Sign in" variant="tertiary" onPress={() => router.replace('/sign-in')} />
        </>
      }
    >
      <AppBar />
      <View style={{ gap: 6 }}>
        <Txt variant="display" accessibilityRole="header">
          Create your account
        </Txt>
        <Txt variant="body" color="textSecondary">
          Start free. Set up your business in under two minutes.
        </Txt>
      </View>
      {confirmSent ? (
        <Note icon="mail" text={`We sent a confirmation link to ${form.email}. Open it, then sign in.`} action={{ label: 'Go to sign in', onPress: () => router.replace('/sign-in') }} />
      ) : null}
      <View style={{ gap: 16 }}>
        <TextField label="Full name" value={form.fullName} onChangeText={set('fullName')} autoComplete="name" textContentType="name" error={errors.fullName} />
        <TextField
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
        />
        <TextField
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          helper="At least 8 characters, including a number"
          error={errors.password}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.acceptTerms }}
          onPress={() => {
            setForm((f) => ({ ...f, acceptTerms: !f.acceptTerms }));
            setErrors((e) => ({ ...e, acceptTerms: undefined }));
          }}
          style={styles.terms}
        >
          <View style={[styles.checkbox, form.acceptTerms ? styles.checked : null]}>
            {form.acceptTerms ? <Icon name="check" size={14} color="onPrimary" /> : null}
          </View>
          <Txt variant="caption" color={errors.acceptTerms ? 'errorText' : 'textSecondary'} style={{ flex: 1 }}>
            {errors.acceptTerms ?? 'I agree to the Terms of Service and Privacy Policy'}
          </Txt>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  terms: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
});
