import { useState } from 'react';
import { View } from 'react-native';

import { TextField } from '@/components/Fields';
import type { CustomerInput } from '@/data';
import { customerSchema, fieldErrors } from '@/lib/validation';

export function useCustomerForm(initial: Partial<CustomerInput> = {}) {
  const [values, setValues] = useState<CustomerInput>({
    fullName: initial.fullName ?? '',
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    address: initial.address ?? '',
    notes: initial.notes ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const set = (k: keyof CustomerInput) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  /** Returns the parsed input, or null after showing field errors. */
  function validate(): CustomerInput | null {
    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed));
      return null;
    }
    return parsed.data;
  }

  return { values, errors, set, validate };
}

export function CustomerFields({ form, optionalLabels }: { form: ReturnType<typeof useCustomerForm>; optionalLabels?: boolean }) {
  const { values, errors, set } = form;
  const opt = optionalLabels ? ' (optional)' : '';
  return (
    <View style={{ gap: 16 }}>
      <TextField label="Full name" value={values.fullName} onChangeText={set('fullName')} autoCapitalize="words" error={errors.fullName} />
      <TextField
        label="Phone number"
        value={values.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        helper="Used for pickup and delivery updates"
        error={errors.phone}
      />
      <TextField
        label={`Email${opt}`}
        value={values.email}
        onChangeText={set('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <TextField label={`Address${opt}`} value={values.address} onChangeText={set('address')} placeholder="Street, building, apartment" error={errors.address} />
      <TextField
        label={`Notes${opt}`}
        value={values.notes}
        onChangeText={set('notes')}
        placeholder="e.g. Allergic to scented detergent"
        multiline
        error={errors.notes}
      />
    </View>
  );
}
