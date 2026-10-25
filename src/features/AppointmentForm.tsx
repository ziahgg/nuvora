import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipGroup } from '@/components/Badges';
import { Toggle } from '@/components/Brand';
import { OptionSheet } from '@/components/Feedback';
import { SelectField, TextField } from '@/components/Fields';
import { Txt } from '@/components/Text';
import type { Appointment, AppointmentInput, AppointmentType, Workspace } from '@/data';
import { atTime, fmtDay, fmtTime } from '@/lib/dates';
import { addDays, startOfDay } from '@/lib/finance';
import { APPOINTMENT_OPTIONS, TIME_SLOTS } from '@/state/options';
import { orderNo, serviceSummary } from '@/state/selectors';
import { colors } from '@/theme/tokens';

const DURATION: Record<AppointmentType, number> = { pickup: 15, delivery: 30, in_store: 30 };

export function useAppointmentForm(ws: Workspace, existing?: Appointment, preset?: { customerId?: string; orderId?: string }) {
  const start = existing ? new Date(existing.startsAt) : null;
  const [type, setType] = useState<AppointmentType>(existing?.type ?? 'pickup');
  const [customerId, setCustomerId] = useState(existing?.customerId ?? preset?.customerId ?? '');
  const [orderId, setOrderId] = useState<string | null>(existing?.orderId ?? preset?.orderId ?? null);
  const [day, setDay] = useState<Date>(start ? startOfDay(start) : addDays(startOfDay(new Date()), 1));
  const [time, setTime] = useState(start ? fmtTime(start) : '11:00');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [remind, setRemind] = useState(existing?.remind ?? ws.preferences.reminderSms);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [errors, setErrors] = useState<{ customer?: string; location?: string }>({});

  const startsAt = atTime(day, time);
  const durationMin = existing && existing.type === type ? existing.durationMin : DURATION[type];

  const conflict = useMemo(() => {
    const s = startsAt.getTime();
    const e = s + durationMin * 60_000;
    return ws.appointments.find((a) => {
      if (a.id === existing?.id || a.status !== 'scheduled') return false;
      const as = new Date(a.startsAt).getTime();
      return as < e && s < as + a.durationMin * 60_000;
    });
  }, [ws.appointments, startsAt, durationMin, existing?.id]);

  function validate(): AppointmentInput | null {
    const next: typeof errors = {};
    if (!customerId) next.customer = 'Choose a customer';
    const customer = ws.customers.find((c) => c.id === customerId);
    const loc = location.trim() || (type === 'in_store' ? `In store · ${ws.business.address || ws.business.name}` : customer?.address ?? '');
    if (!loc) next.location = 'Enter where this happens';
    setErrors(next);
    if (Object.keys(next).length) return null;
    return { type, customerId, orderId, startsAt: startsAt.toISOString(), durationMin, location: loc, remind, notes: notes.trim() };
  }

  return { type, setType, customerId, setCustomerId, orderId, setOrderId, day, setDay, time, setTime, location, setLocation, remind, setRemind, notes, setNotes, errors, conflict, validate };
}

export type AppointmentFormState = ReturnType<typeof useAppointmentForm>;

export function AppointmentFields({ ws, form }: { ws: Workspace; form: AppointmentFormState }) {
  const [sheet, setSheet] = useState<'customer' | 'date' | 'time' | 'order' | null>(null);
  const customer = ws.customers.find((c) => c.id === form.customerId);
  const order = form.orderId ? ws.orders.find((o) => o.id === form.orderId) : undefined;
  const customerOrders = ws.orders.filter((o) => o.customerId === form.customerId && o.status === 'in_progress');
  const today = startOfDay(new Date());
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = addDays(today, i);
    return { value: d.toISOString(), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDay(d) };
  });
  const conflictWho = form.conflict ? ws.customers.find((c) => c.id === form.conflict!.customerId)?.fullName ?? 'another customer' : '';
  const conflictType = form.conflict ? APPOINTMENT_OPTIONS.find((o) => o.value === form.conflict!.type)?.label.toLowerCase() : '';
  const locationPlaceholder = form.type === 'in_store' ? `In store · ${ws.business.address || ws.business.name}` : customer?.address || 'Street, building, apartment';

  return (
    <>
      <View style={{ gap: 8 }}>
        <Txt variant="label">Appointment type</Txt>
        <ChipGroup options={APPOINTMENT_OPTIONS} value={form.type} onChange={form.setType} />
      </View>
      <SelectField label="Customer" value={customer?.fullName} placeholder="Choose a customer" error={form.errors.customer} onPress={() => setSheet('customer')} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SelectField label="Date" value={days.find((d) => d.value === form.day.toISOString())?.label ?? fmtDay(form.day)} onPress={() => setSheet('date')} />
        <SelectField
          label="Time"
          value={form.time}
          error={form.conflict ? `Clashes ${fmtTime(form.conflict.startsAt)}` : undefined}
          onPress={() => setSheet('time')}
        />
      </View>
      {form.conflict ? (
        <Txt variant="caption" color="errorText">
          This time overlaps {conflictWho}’s {fmtTime(form.conflict.startsAt)} {conflictType}.
        </Txt>
      ) : null}
      <SelectField
        label="Linked order (optional)"
        value={order ? `${orderNo(order)} · ${serviceSummary(order)}` : undefined}
        placeholder={customer ? (customerOrders.length ? 'None' : 'No open orders') : 'Choose a customer first'}
        onPress={() => customer && setSheet('order')}
      />
      <TextField label="Location" value={form.location} onChangeText={form.setLocation} placeholder={locationPlaceholder} error={form.errors.location} />
      <View style={styles.toggle}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodyMedium">Remind customer</Txt>
          <Txt variant="caption" color="textSecondary">
            SMS 1 hour before
          </Txt>
        </View>
        <Toggle label="Remind customer" value={form.remind} onChange={form.setRemind} />
      </View>
      <TextField label="Notes (optional)" value={form.notes} onChangeText={form.setNotes} placeholder="e.g. Leave with the concierge" multiline />

      <OptionSheet
        visible={sheet === 'customer'}
        title="Customer"
        value={form.customerId}
        options={ws.customers.map((c) => ({ value: c.id, label: c.fullName, caption: c.address || c.phone }))}
        onSelect={(id) => {
          form.setCustomerId(id);
          form.setOrderId(null);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet visible={sheet === 'date'} title="Date" value={form.day.toISOString()} options={days} onSelect={(v) => form.setDay(new Date(v))} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'time'} title="Time" value={form.time} options={TIME_SLOTS.map((t) => ({ value: t, label: t }))} onSelect={form.setTime} onClose={() => setSheet(null)} />
      <OptionSheet
        visible={sheet === 'order'}
        title="Linked order"
        value={form.orderId ?? 'none'}
        options={[{ value: 'none', label: 'None' }, ...customerOrders.map((o) => ({ value: o.id, label: `${orderNo(o)} · ${serviceSummary(o)}`, caption: `Due ${fmtDay(o.dueAt)}` }))]}
        onSelect={(v) => form.setOrderId(v === 'none' ? null : v)}
        onClose={() => setSheet(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 24, padding: 14 },
});
