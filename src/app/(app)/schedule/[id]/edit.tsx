import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Feedback';
import { AppBar, Screen } from '@/components/Layout';
import { api, type AppointmentInput } from '@/data';
import { AppointmentFields, useAppointmentForm } from '@/features/AppointmentForm';
import { useAction, useWorkspace } from '@/state/session';

/** Appointments / 34 Edit Appointment. */
export default function EditAppointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const appointment = ws.appointments.find((a) => a.id === id);
  const form = useAppointmentForm(ws, appointment);
  const save = useAction((input: AppointmentInput) => api.saveAppointment(ws.business.id, id, input), {
    success: 'Appointment updated',
    onSuccess: () => router.back(),
  });

  if (!appointment) {
    return (
      <Screen>
        <AppBar title="Edit appointment" />
        <EmptyState icon="calendar" title="Appointment not found" body="It may have been removed." />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label={form.conflict ? 'Save anyway' : 'Save changes'}
            loading={save.pending}
            onPress={() => {
              const input = form.validate();
              if (input) save.run(input);
            }}
          />
          <Button label="Discard changes" variant="tertiary" onPress={() => router.back()} />
        </>
      }
    >
      <AppBar title="Edit appointment" />
      <AppointmentFields ws={ws} form={form} />
    </Screen>
  );
}
