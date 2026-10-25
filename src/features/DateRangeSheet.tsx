import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChipGroup } from '@/components/Badges';
import { Button, CircleButton } from '@/components/Button';
import { BottomSheet } from '@/components/Feedback';
import { Txt } from '@/components/Text';
import { fmtMonth, isSameDay } from '@/lib/dates';
import { addDays, monthToDate, startOfDay, todayRange, type DateRange } from '@/lib/finance';
import { colors } from '@/theme/tokens';
import { rangeLabel } from './period';

type Preset = 'today' | 'last7' | 'month' | 'lastMonth' | 'custom';

export function presetRange(p: Exclude<Preset, 'custom'>, now = new Date()): DateRange {
  if (p === 'today') return todayRange(now);
  if (p === 'last7') return { start: addDays(startOfDay(now), -6), end: addDays(startOfDay(now), 1) };
  if (p === 'lastMonth') return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
  return monthToDate(now);
}

function detectPreset(r: DateRange): Preset {
  for (const p of ['today', 'last7', 'month', 'lastMonth'] as const) {
    const pr = presetRange(p);
    if (pr.start.getTime() === r.start.getTime() && pr.end.getTime() === r.end.getTime()) return p;
  }
  return 'custom';
}

interface Props {
  visible: boolean;
  value: DateRange;
  compare: boolean;
  onApply: (r: DateRange, compare: boolean) => void;
  onClose: () => void;
}

/** Reports / 40 Date Range & Filters sheet: presets, month calendar, compare toggle. */
export function DateRangeSheet(props: Props) {
  // Remount on open so the draft always starts from the applied range.
  return <RangeSheetBody key={props.visible ? 'open' : 'closed'} {...props} />;
}

function RangeSheetBody({
  visible,
  value,
  compare,
  onApply,
  onClose,
}: Props) {
  const [draft, setDraft] = useState(value);
  const [cmp, setCmp] = useState(compare);
  const [month, setMonth] = useState(new Date(value.start.getFullYear(), value.start.getMonth(), 1));
  const [picking, setPicking] = useState<Date | null>(null);
  const today = startOfDay(new Date());


  const lastDay = addDays(draft.end, -1);
  const firstWeekday = (month.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  function tap(d: Date) {
    if (d > today) return;
    if (!picking) {
      setPicking(d);
      setDraft({ start: d, end: addDays(d, 1) });
    } else {
      const [a, b] = d < picking ? [d, picking] : [picking, d];
      setDraft({ start: a, end: addDays(b, 1) });
      setPicking(null);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Date range"
      footer={
        <>
          <Button label={cmp ? 'Compare: previous period ✓' : 'Compare: previous period'} variant="outline" onPress={() => setCmp((c) => !c)} />
          <Button label={`Apply · ${rangeLabel(draft, false)}`} onPress={() => onApply(draft, cmp)} />
        </>
      }
    >
      <ChipGroup
        options={[
          { value: 'today', label: 'Today' },
          { value: 'last7', label: 'Last 7 days' },
          { value: 'month', label: 'This month' },
          { value: 'lastMonth', label: 'Last month' },
          { value: 'custom', label: 'Custom' },
        ]}
        value={detectPreset(draft)}
        onChange={(p) => {
          if (p === 'custom') return setPicking(null);
          const r = presetRange(p);
          setDraft(r);
          setMonth(new Date(r.start.getFullYear(), r.start.getMonth(), 1));
        }}
      />
      <View style={{ gap: 4 }}>
        <View style={styles.monthHead}>
          <CircleButton icon="chevron-left" size={32} iconSize={18} bg="surface" color="textSecondary" accessibilityLabel="Previous month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
          <Txt variant="bodyMedium">{fmtMonth(month)}</Txt>
          <CircleButton icon="chevron-right" size={32} iconSize={18} bg="surface" color="textSecondary" accessibilityLabel="Next month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        </View>
        <View style={styles.week}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Txt key={i} variant="caption" color="textTertiary" style={styles.cellText}>
              {d}
            </Txt>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <View key={w} style={styles.week}>
            {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
              if (!d) return <View key={i} style={styles.cell} />;
              const edge = isSameDay(d, draft.start) || isSameDay(d, lastDay);
              const inside = d > draft.start && d < lastDay;
              const future = d > today;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={d.toDateString()}
                  accessibilityState={{ selected: edge || inside, disabled: future }}
                  disabled={future}
                  onPress={() => tap(d)}
                  style={[styles.cell, inside ? { backgroundColor: colors.primary50 } : null, edge ? { backgroundColor: colors.primary, borderRadius: 10 } : null]}
                >
                  <Txt variant="label" color={edge ? 'onPrimary' : inside ? 'primaryDark' : future ? 'textTertiary' : 'text'}>
                    {d.getDate()}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Txt variant="caption" color="textSecondary" align="center">
          {picking ? 'Tap the last day of the range' : 'Tap a start day, then an end day'}
        </Txt>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  cellText: { flex: 1, textAlign: 'center' },
});
