import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { useToast } from '@/components/Feedback';
import { TextField } from '@/components/Fields';
import { AppBar, Note, Screen } from '@/components/Layout';
import { Txt } from '@/components/Text';
import { api } from '@/data';
import { fieldErrors, forgotSchema } from '@/lib/validation';
import { errorMessage } from '@/state/session';

/** Onboarding / 04 Forgot Password */
export default function ForgotPassword() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const parsed = forgotSchema.safeParse({ email });
    if (!parsed.success) return setError(fieldErrors(parsed).email);
    setBusy(true);
    try {
      await api.sendPasswordReset(parsed.data.email);
      setSent(true);
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
          <Button label={sent ? 'Send again' : 'Send reset link'} onPress={submit} loading={busy} />
          <Button label="Back to sign in" variant="tertiary" onPress={() => router.replace('/sign-in')} />
        </>
      }
    >
      <AppBar />
      <View style={{ gap: 6 }}>
        <Txt variant="display" accessibilityRole="header">
          Reset your password
        </Txt>
        <Txt variant="body" color="textSecondary">
          Enter the email you signed up with. We’ll send a link to set a new password.
        </Txt>
      </View>
      <View style={{ gap: 16 }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(undefined);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={error}
        />
        {sent ? (
          api.mode === 'demo' ? (
            <Note tone="warning" icon="triangle-alert" text="Demo mode can’t send email. Connect Supabase to enable password reset emails." />
          ) : (
            <Note icon="mail" text={`If an account exists for ${email}, a reset link is on its way.`} />
          )
        ) : (
          <Note text="The link expires after a short time. Check your spam folder if it doesn’t arrive." />
        )}
      </View>
    </Screen>
  );
}
