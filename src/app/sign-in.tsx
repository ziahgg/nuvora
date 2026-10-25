import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, LinkText } from '@/components/Button';
import { useToast } from '@/components/Feedback';
import { TextField } from '@/components/Fields';
import { AppBar, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { fieldErrors, signInSchema } from '@/lib/validation';
import { errorMessage } from '@/state/session';

/** Onboarding / 03 Sign In */
export default function SignIn() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = signInSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed));
    setBusy(true);
    try {
      await api.signIn(parsed.data);
      // The root layout's guard switches to the app once the session is set.
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
          <Button label="Sign in" onPress={submit} loading={busy} />
          <Button label="New to Nuvora? Create account" variant="tertiary" onPress={() => router.replace('/sign-up')} />
        </>
      }
    >
      <AppBar />
      <View style={{ gap: 6 }}>
        <Txt variant="display" accessibilityRole="header">
          Welcome back
        </Txt>
        <Txt variant="body" color="textSecondary">
          Sign in to your business workspace.
        </Txt>
      </View>
      <View style={{ gap: 16 }}>
        <TextField
          label="Email"
          value={form.email}
          onChangeText={(email) => setForm((f) => ({ ...f, email }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
        />
        <TextField
          label="Password"
          value={form.password}
          onChangeText={(password) => setForm((f) => ({ ...f, password }))}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.password}
        />
        <View style={{ alignSelf: 'flex-start' }}>
          <LinkText label="Forgot password?" onPress={() => router.push('/forgot-password')} />
        </View>
      </View>
    </Screen>
  );
}
