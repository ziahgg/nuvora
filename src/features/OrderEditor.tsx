import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Stepper } from '@/components/Brand';
import { OptionSheet } from '@/components/Feedback';
import { SelectField, TextField } from '@/components/Fields';
import { KeyValue, ListCard, SectionHeader } from '@/components/Layout';
import { Txt } from '@/components/Text';
import type { HandoverType, Order, OrderItemInput, Service } from '@/data';
import { atTime, fmtDay, relativeDay } from '@/lib/dates';
import { addDays, startOfDay } from '@/lib/finance';
import { formatMoney, lineTotal, sumCents } from '@/lib/money';
import { HANDOVER_OPTIONS, TIME_SLOTS, UNIT_PRICE_LABEL, UNIT_QTY_LABEL } from '@/state/options';
import { colors } from '@/theme/tokens';

export interface Line extends OrderItemInput {
  key: string;
}

/** Services from the catalogue plus any custom lines already on the order. */
function initialLines(services: Service[], order?: Order): Line[] {
  const lines: Line[] = services
    .filter((s) => s.active)
    .map((s) => ({ key: s.id, serviceId: s.id, name: s.name, unit: s.unit, unitPriceCents: s.priceCents, quantity: 0 }));
  for (const item of order?.items ?? []) {
    const match = lines.find((l) => l.serviceId === item.serviceId && l.name === item.name && l.unitPriceCents === item.unitPriceCents);
    if (match) match.quantity += item.quantity;
    else lines.push({ key: item.id, serviceId: item.serviceId, name: item.name, unit: item.unit, unitPriceCents: item.unitPriceCents, quantity: item.quantity });
  }
  return lines;
}

export function useOrderEditor(services: Service[], order?: Order) {
  const now = new Date();
  const [lines, setLines] = useState<Line[]>(() => initialLines(services, order));
  const [handover, setHandover] = useState<HandoverType>(order?.handover ?? 'pickup');
  const [handoverTime, setHandoverTime] = useState(order?.handoverTime || '10:00');
  const [dueDay, setDueDay] = useState<Date>(() => startOfDay(order ? new Date(order.dueAt) : now));
  const [notes, setNotes] = useState(order?.notes ?? '');

  const chosen = lines.filter((l) => l.quantity > 0);
  const totalCents = sumCents(chosen.map((l) => lineTotal(l.quantity, l.unitPriceCents)));
  const dueAt = atTime(dueDay, handover === 'delivery' ? handoverTime : '18:00');

  return {
    lines,
    setQuantity: (key: string, q: number) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, quantity: q } : l))),
    handover,
    setHandover,
    handoverTime,
    setHandoverTime,
    dueDay,
    setDueDay,
    notes,
    setNotes,
    chosen,
    totalCents,
    dueAt,
    items: chosen.map(({ key: _key, ...item }) => item),
  };
}

export type OrderEditorState = ReturnType<typeof useOrderEditor>;

function dueLabel(day: Date, time: string): string {
  const r = relativeDay(day);
  return `${r === 'Today' || r === 'Tomorrow' ? r : fmtDay(day)}, ${time}`;
}

/** Services stepper list + due date / handover + notes + live summary. */
export function OrderEditorFields({ editor, currency, error, paidCents }: { editor: OrderEditorState; currency: string; error?: string; paidCents?: number }) {
  const [sheet, setSheet] = useState<'due' | 'handover' | 'time' | null>(null);
  const today = startOfDay(new Date());
  const dayOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(today, i);
        return { value: d.toISOString(), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDay(d) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const timeLabel = editor.handover === 'delivery' ? editor.handoverTime : '18:00';

  return (
    <>
      <SectionHeader title="Services" />
      <ListCard verticalPadding={4}>
        {editor.lines.map((l) => {
          const active = l.quantity > 0;
          const price = `${formatMoney(l.unitPriceCents, currency)} ${UNIT_PRICE_LABEL[l.unit]}`;
          return (
            <View key={l.key} style={styles.service}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyMedium">{l.name}</Txt>
                <Txt variant="caption" color={active ? 'primary' : 'textSecondary'}>
                  {active ? `${price} · ${formatMoney(lineTotal(l.quantity, l.unitPriceCents), currency)}` : price}
                </Txt>
              </View>
              <Stepper label={l.name} value={l.quantity} onChange={(q) => editor.setQuantity(l.key, q)} max={l.unit === 'flat' ? 1 : 999} />
            </View>
          );
        })}
      </ListCard>
      {error ? (
        <Txt variant="caption" color="errorText">
          {error}
        </Txt>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SelectField label="Due date" value={dueLabel(editor.dueDay, timeLabel)} onPress={() => setSheet('due')} />
        <SelectField
          label="Handover"
          value={editor.handover === 'delivery' ? `Delivery ${editor.handoverTime}` : 'Pickup in store'}
          onPress={() => setSheet('handover')}
        />
      </View>
      <TextField label="Notes (optional)" value={editor.notes} onChangeText={editor.setNotes} placeholder="e.g. Separate whites" multiline />

      <ListCard verticalPadding={4}>
        {editor.chosen.length === 0 ? (
          <KeyValue label="No services added yet" value={formatMoney(0, currency)} />
        ) : (
          editor.chosen.map((l) => (
            <KeyValue
              key={l.key}
              label={`${l.name}${UNIT_QTY_LABEL[l.unit](l.quantity) ? ` · ${UNIT_QTY_LABEL[l.unit](l.quantity)}` : ''}`}
              value={formatMoney(lineTotal(l.quantity, l.unitPriceCents), currency)}
            />
          ))
        )}
        {paidCents ? <KeyValue label="Paid so far" value={formatMoney(paidCents, currency)} /> : null}
        <View>
          <KeyValue label="Total" strongLabel value={formatMoney(editor.totalCents, currency)} large />
        </View>
      </ListCard>

      <OptionSheet
        visible={sheet === 'due'}
        title="Due date"
        options={dayOptions}
        value={editor.dueDay.toISOString()}
        onSelect={(v) => editor.setDueDay(new Date(v))}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'handover'}
        title="Handover"
        options={HANDOVER_OPTIONS}
        value={editor.handover}
        onSelect={(v) => {
          editor.setHandover(v);
          if (v === 'delivery') setTimeout(() => setSheet('time'), 350);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'time'}
        title="Delivery time"
        options={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
        value={editor.handoverTime}
        onSelect={editor.setHandoverTime}
        onClose={() => setSheet(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  service: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0, borderColor: colors.border },
});
