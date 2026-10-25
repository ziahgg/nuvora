import { StyleSheet, View } from 'react-native';

import { Ring } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Text';
import type { PeriodMetrics } from '@/lib/finance';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/tokens';

/** "Profit summary — signature" card (Finance, Reports, Home). */
export function ProfitCard({ label, metrics, note, currency }: { label: string; metrics: PeriodMetrics; note: string; currency: string }) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.tag}>
          <View style={styles.tagIcon}>
            <Icon name={metrics.profitCents >= 0 ? 'trending-up' : 'trending-down'} size={14} color="primary" />
          </View>
          <Txt variant="caption" color="primaryDark">
            {label}
          </Txt>
        </View>
        <Txt variant="figure" size={30} color="primaryDark">
          {formatMoney(metrics.profitCents, currency)}
        </Txt>
        <Txt variant="caption" color="primaryDark" style={{ opacity: 0.8 }}>
          {note}
        </Txt>
      </View>
      <Ring size={92} thickness={20} progress={Math.max(0, (metrics.marginPct ?? 0) / 100)} color="primary" track="surface">
        <Txt variant="figure" size={18} color="primaryDark">
          {metrics.marginPct === null ? '—' : `${metrics.marginPct}%`}
        </Txt>
        <Txt variant="caption" color="primaryDark">
          margin
        </Txt>
      </Ring>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: 28, backgroundColor: colors.primary50 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
