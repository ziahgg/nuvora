import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, type ColorToken } from '@/theme/tokens';
import { Txt } from './Text';

/** Annular-sector path (Figma ellipse arcs with an inner radius). Angles in degrees, 0° = 3 o'clock, clockwise. */
function arcPath(cx: number, cy: number, r: number, inner: number, start: number, end: number): string {
  const sweep = Math.min(Math.max(end - start, 0), 359.999);
  if (sweep <= 0) return '';
  const a0 = (start * Math.PI) / 180;
  const a1 = ((start + sweep) * Math.PI) / 180;
  const large = sweep > 180 ? 1 : 0;
  const p = (rad: number, radius: number) => `${cx + radius * Math.cos(rad)} ${cy + radius * Math.sin(rad)}`;
  return [
    `M ${p(a0, r)}`,
    `A ${r} ${r} 0 ${large} 1 ${p(a1, r)}`,
    `L ${p(a1, inner)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${p(a0, inner)}`,
    'Z',
  ].join(' ');
}

/** Progress ring (track + clockwise progress from 12 o'clock). */
export function Ring({
  size,
  thickness,
  progress,
  color,
  track = 'border',
  children,
}: {
  size: number;
  thickness: number;
  progress: number;
  color: ColorToken;
  track?: ColorToken;
  children?: React.ReactNode;
}) {
  const r = size / 2;
  const inner = r - thickness;
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Path d={arcPath(r, r, r, inner, 0, 359.999)} fill={colors[track]} />
        {p > 0 ? <Path d={arcPath(r, r, r, inner, -90, -90 + 360 * p)} fill={colors[color]} /> : null}
      </Svg>
      {children}
    </View>
  );
}

/** Semicircular "Today at a glance" gauge — warm → violet → indigo gradient over the collected share. */
export function Gauge({ size = 236, progress }: { size?: number; progress: number }) {
  const r = size / 2;
  const inner = r * 0.8813559;
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <Svg width={size} height={r} accessibilityLabel={`${Math.round(p * 100)}% collected`}>
      <Defs>
        <LinearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.warm} />
          <Stop offset="0.5" stopColor={colors.violet} />
          <Stop offset="1" stopColor={colors.primary} />
        </LinearGradient>
      </Defs>
      <Path d={arcPath(r, r, r, inner, 180, 360)} fill={colors.border} />
      {p > 0 ? <Path d={arcPath(r, r, r, inner, 180, 180 + 180 * p)} fill="url(#gauge)" /> : null}
    </Svg>
  );
}

/** Diagonal-hatch column background used behind bars (Figma "Hatch"). */
function Hatch({ width, height, radius, id }: { width: number; height: number; radius: number; id: string }) {
  const stripes = [];
  for (let x = -height; x < width + height; x += 7) {
    stripes.push(<Path key={x} d={`M ${x} ${height} L ${x + height * 0.7} 0`} stroke={colors.hatch} strokeWidth={2} />);
  }
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <ClipPath id={id}>
          <Rect width={width} height={height} rx={radius} />
        </ClipPath>
      </Defs>
      <Rect width={width} height={height} rx={radius} fill={colors.hatch} fillOpacity={0.55} />
      <G clipPath={`url(#${id})`}>{stripes}</G>
    </Svg>
  );
}

export interface DayBar {
  key: string;
  label: string;
  valueLabel: string;
  value: number;
  tone: 'best' | 'today' | 'normal';
}

/** "Revenue recorded" 7-day bars on hatched tracks. */
export function DayBars({ bars, height = 150, onSelect }: { bars: DayBar[]; height?: number; onSelect?: (key: string) => void }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <View style={styles.dayBars}>
      {bars.map((b) => {
        const h = Math.max(b.value > 0 ? 6 : 0, Math.round((b.value / max) * height));
        const fill = b.tone === 'best' ? colors.primary : b.tone === 'today' ? colors.warm : colors.primary100;
        const strong = b.tone !== 'normal';
        return (
          <Pressable
            key={b.key}
            accessibilityRole="button"
            accessibilityLabel={`${b.label}: ${b.valueLabel}`}
            onPress={() => onSelect?.(b.key)}
            style={styles.dayCol}
          >
            <Txt variant="caption" color={strong ? 'text' : 'textSecondary'} weight={strong ? 'semibold' : undefined}>
              {b.valueLabel}
            </Txt>
            <View style={{ width: 34, height, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <View style={{ position: 'absolute', left: 0, top: 0, width: 16, height }}>
                <Hatch width={16} height={height} radius={8} id={`h-${b.key}`} />
              </View>
              <View style={{ width: 16, height: h, borderRadius: 8, backgroundColor: fill }} />
            </View>
            <Txt variant="caption" color={b.tone === 'today' ? 'text' : 'textTertiary'} weight={b.tone === 'today' ? 'semibold' : undefined}>
              {b.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface PairBar {
  key: string;
  label: string;
  a: number;
  b: number;
}

/** Revenue (primary) vs expenses (accent) by week, with hatched tracks and gridlines. */
export function PairBars({ bars, height = 160, maxLabel }: { bars: PairBar[]; height?: number; maxLabel: (v: number) => string }) {
  const rawMax = Math.max(1, ...bars.flatMap((x) => [x.a, x.b]));
  const max = niceCeil(rawMax);
  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 40, height, justifyContent: 'space-between' }}>
          {[max, max / 2, 0].map((v) => (
            <Txt key={v} variant="caption" color="textTertiary" style={{ marginTop: -8 }}>
              {maxLabel(v)}
            </Txt>
          ))}
        </View>
        <View style={{ flex: 1, height }}>
          {[0, 0.5, 1].map((t) => (
            <View key={t} style={[styles.gridLine, { top: t * height }]} />
          ))}
          <View style={styles.pairRow}>
            {bars.map((x) => (
              <View key={x.key} style={{ width: 42, height, justifyContent: 'flex-end' }}>
                <View style={StyleSheet.absoluteFill}>
                  <Hatch width={42} height={height} radius={10} id={`p-${x.key}`} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <View style={{ width: 20, height: Math.max(x.a ? 2 : 0, (x.a / max) * height), borderRadius: 8, backgroundColor: colors.primary }} />
                  <View style={{ width: 20, height: Math.max(2, (x.b / max) * height), borderRadius: 8, backgroundColor: x.b ? colors.accent : colors.border }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={[styles.pairRow, { marginLeft: 40, marginTop: 6 }]}>
        {bars.map((x) => (
          <Txt key={x.key} variant="caption" color="textSecondary" style={{ width: 52, textAlign: 'center', marginHorizontal: -5 }}>
            {x.label}
          </Txt>
        ))}
      </View>
    </View>
  );
}

function niceCeil(v: number): number {
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

/** Horizontal progress bar with a muted track. */
export function MeterBar({ value, color = 'primary', height = 8 }: { value: number; color?: ColorToken; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.muted, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.min(Math.max(value, 0), 1) * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: colors[color],
        }}
      />
    </View>
  );
}

/** Segmented horizontal bar (outstanding split, order status split). */
export function SplitBar({ parts, height = 8 }: { parts: { value: number; color: ColorToken }[]; height?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <View style={{ flexDirection: 'row', gap: 3, height }}>
      {parts
        .filter((p) => p.value > 0)
        .map((p, i) => (
          <View key={i} style={{ flex: p.value / total, height, borderRadius: 4, backgroundColor: colors[p.color] }} />
        ))}
    </View>
  );
}

/** Small legend swatch row. */
export function LegendItem({ color, label, round }: { color: ColorToken; label: string; round?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: round ? 8 : 10, height: round ? 8 : 10, borderRadius: round ? 4 : 5, backgroundColor: colors[color] }} />
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
    </View>
  );
}

export { Circle };

const styles = StyleSheet.create({
  dayBars: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16 },
  dayCol: { alignItems: 'center', gap: 8, width: 34 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border, opacity: 0.6 },
  pairRow: { flexDirection: 'row', justifyContent: 'space-around', flex: 1, alignItems: 'flex-end' },
});
