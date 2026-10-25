import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { AppBar, Screen } from '@/components/Layout';
import { api, type AppointmentInput } from '@/data';
import { AppointmentFields, useAppointmentForm } from '@/features/AppointmentForm';
import { useAction, useWorkspace } from '@/state/session';

/** Appointments / 33 Create Appointment (+ 33b conflict, → 35b booked toast). */
export default function NewAppointment() {
  const params = useLocalSearchParams<{ customerId?: string; orderId?: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const form = useAppointmentForm(ws, undefined, params);
  const [acceptedConflict, setAcceptedConflict] = useState(false);

  const save = useAction((input: AppointmentInput) => api.saveAppointment(ws.business.id, null, input), {
    success: (_id, input) => (input.remind ? 'Appointment booked · Reminder set' : 'Appointment booked'),
    onSuccess: (id) => router.replace(`/schedule/${id}`),
  });

  const submit = () => {
    const input = form.validate();
    if (input) save.run(input);
  };

  return (
    <Screen
      footer={
        form.conflict && !acceptedConflict ? (
          <>
            <Button
              label="Book anyway"
              variant="outline"
              loading={save.pending}
              onPress={() => {
                setAcceptedConflict(true);
                submit();
              }}
            />
            <Button label="Choose another time" onPress={() => form.setTime(nextFreeSlot(form.time))} />
          </>
        ) : (
          <Button label="Book appointment" loading={save.pending} onPress={submit} />
        )
      }
    >
      <AppBar title="New appointment" />
      <AppointmentFields ws={ws} form={form} />
    </Screen>
  );
}

/** Next 30-minute slot after the clashing one. */
function nextFreeSlot(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const minutes = Math.min(h * 60 + m + 30, 19 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
