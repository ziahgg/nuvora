import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { StatusBadge } from "@/components/Badges";
import { CircleButton, LinkText } from "@/components/Button";
import {
  DayBars,
  Gauge,
  LegendItem,
  Ring,
  type DayBar,
} from "@/components/Charts";
import { Icon } from "@/components/Icon";
import { Divider, Screen, SectionHeader } from "@/components/Layout";
import { Avatar } from "@/components/Rows";
import { Txt } from "@/components/Text";
import { WeekStrip } from "@/features/schedule";
import { greeting, isSameDay } from "@/lib/dates";
import {
  dailyRevenue,
  inRange,
  monthToDate,
  outstanding,
  periodMetrics,
  startOfDay,
  todayRange,
} from "@/lib/finance";
import {
  formatMoney,
  formatMoneyShort,
  formatPercentChange,
  splitMoney,
  sumCents,
} from "@/lib/money";
import {
  notificationFeed,
  orderNo,
  orderViews,
  unreadCount,
} from "@/state/selectors";
import {
  usePermissions,
  useSession,
  useWorkspace,
  useWorkspaceQuery,
} from "@/state/session";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Period = 7 | 30 | 90;

/** Home / Dashboard */
export default function Dashboard() {
  const router = useRouter();
  const ws = useWorkspace();
  const { refetch, isRefetching } = useWorkspaceQuery();
  const { user } = useSession();
  const { finance } = usePermissions();
  const [period, setPeriod] = useState<Period>(7);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const now = new Date();
  const cur = ws.business.currency;
  const money = (c: number) => formatMoney(c, cur);

  const data = useMemo(() => {
    const today = periodMetrics(ws, todayRange(now));
    const mtd = periodMetrics(ws, monthToDate(now));
    const out = outstanding(ws.orders, ws.payments, now);
    const views = orderViews(ws, now);
    const todays = ws.orders.filter(
      (o) => o.status !== "cancelled" && inRange(o.createdAt, todayRange(now)),
    );
    const doneToday = todays.filter((o) => o.status === "completed").length;
    const active = ws.orders.filter((o) => o.status === "in_progress");
    const dueToday = active.filter((o) =>
      isSameDay(new Date(o.dueAt), now),
    ).length;
    const unread = unreadCount(notificationFeed(ws, now));
    return {
      today,
      mtd,
      out,
      views,
      todays,
      doneToday,
      active,
      dueToday,
      unread,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when workspace changes
  }, [ws]);

  const chart = useMemo(() => {
    const days = dailyRevenue(ws.orders, period * 2, now);
    const current = days.slice(period);
    const previous = days.slice(0, period);
    const total = sumCents(current.map((d) => d.cents));
    const prevTotal = sumCents(previous.map((d) => d.cents));
    // 7D shows days; 30D / 90D group into 7 equal buckets.
    const size = period / 7;
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const slice = current.slice(
        Math.round(i * size),
        Math.round((i + 1) * size),
      );
      return {
        date: slice[0].date,
        cents: sumCents(slice.map((d) => d.cents)),
        last: i === 6,
      };
    });
    const best = Math.max(...buckets.map((b) => b.cents));
    const bars: DayBar[] = buckets.map((b) => ({
      key: b.date.toISOString(),
      label:
        period === 7
          ? b.date.toLocaleDateString("en-US", { weekday: "short" })
          : `${b.date.getDate()}/${b.date.getMonth() + 1}`,
      value: b.cents,
      valueLabel: formatMoneyShort(b.cents, cur),
      tone: b.last ? "today" : b.cents === best && best > 0 ? "best" : "normal",
    }));
    return { total, prevTotal, bars, best };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, period]);

  const collected = data.today.revenueCents
    ? data.today.receivedCents / data.today.revenueCents
    : 0;
  const { whole, fraction } = splitMoney(chart.total, cur);
  const change = formatPercentChange(chart.total, chart.prevTotal);
  const firstOverdue = data.views.find((v) => v.money.overdue);
  const dayAppointments = ws.appointments
    .filter(
      (a) => a.status === "scheduled" && isSameDay(new Date(a.startsAt), day),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const name = user?.fullName || ws.member.fullName;

  return (
    <Screen
      withTabBar
      gap={22}
      paddingTop={10}
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
    >
      {/* Header */}
      <View style={styles.header}>
        <Avatar name={name} size={48} />
        <View style={{ flex: 1 }}>
          <Txt variant="caption" color="textSecondary">
            {greeting(now)}
          </Txt>
          <Txt variant="bodyMedium" size={17}>
            {name}
          </Txt>
        </View>
        <CircleButton
          icon="calendar"
          accessibilityLabel="Schedule"
          onPress={() => router.push("/schedule")}
        />
        <CircleButton
          icon="bell"
          accessibilityLabel={`Notifications${data.unread ? `, ${data.unread} new` : ""}`}
          badge={data.unread > 0}
          onPress={() => router.push("/notifications")}
        />
      </View>

      {/* Today gauge — signature */}
      <View style={{ gap: 14 }}>
        <Txt style={styles.glance} accessibilityRole="header">
          Today at a glance
        </Txt>
        <View style={styles.gaugeBox}>
          <View style={styles.gaugeTop}>
            <View>
              <Txt variant="figure" size={20}>
                {money(data.today.receivedCents)}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                Received
              </Txt>
            </View>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/outstanding")}
              style={{ alignItems: "flex-end" }}
            >
              <Txt variant="figure" size={20} color="errorText">
                {money(data.out.totalCents)}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                Outstanding · {data.out.orders.length}{" "}
                {data.out.orders.length === 1 ? "order" : "orders"}
              </Txt>
            </Pressable>
          </View>
          <View style={styles.gauge}>
            <Gauge progress={collected} />
            <View style={styles.gaugeValue}>
              <Txt style={styles.gaugeAmount}>
                {money(data.today.revenueCents)}
              </Txt>
              <Txt variant="body" color="textSecondary">
                Revenue recorded today
              </Txt>
            </View>
          </View>
        </View>
        <View style={styles.rings}>
          <RingStat
            progress={collected}
            color="warm"
            value={`${Math.round(collected * 100)}%`}
            label="Received ÷ recorded"
            onPress={() => router.push("/activity")}
          />
          <RingStat
            progress={
              data.todays.length ? data.doneToday / data.todays.length : 0
            }
            color="violet"
            value={`${data.doneToday} of ${data.todays.length}`}
            label="Orders done"
            onPress={() => router.push("/activity")}
          />
          <RingStat
            progress={
              data.out.orders.length
                ? data.out.overdueCount / data.out.orders.length
                : 0
            }
            color="error"
            value={`${data.out.overdueCount} ${data.out.overdueCount === 1 ? "order" : "orders"}`}
            label="Overdue"
            onPress={() => router.push("/outstanding")}
          />
        </View>
      </View>

      {/* Profit this month */}
      {finance ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/reports")}
          style={styles.profit}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.tag}>
              <View style={styles.tagIcon}>
                <Icon name="trending-up" size={14} color="primary" />
              </View>
              <Txt variant="caption" color="primaryDark">
                Profit · {now.toLocaleDateString("en-US", { month: "short" })}{" "}
                to date
              </Txt>
            </View>
            <Txt variant="figure" size={30} color="primaryDark">
              {money(data.mtd.profitCents)}
            </Txt>
            <Txt variant="caption" color="primaryDark" style={{ opacity: 0.8 }}>
              {formatMoney(data.mtd.revenueCents, cur, { decimals: false })}{" "}
              revenue −{" "}
              {formatMoney(data.mtd.expensesCents, cur, { decimals: false })}{" "}
              expenses
            </Txt>
            <Txt variant="label" color="primary">
              View report →
            </Txt>
          </View>
          <Ring
            size={92}
            thickness={20}
            progress={Math.max(0, (data.mtd.marginPct ?? 0) / 100)}
            color="primary"
            track="surface"
          >
            <Txt variant="figure" size={18} color="primaryDark">
              {data.mtd.marginPct ?? 0}%
            </Txt>
            <Txt variant="caption" color="primaryDark">
              margin
            </Txt>
          </Ring>
        </Pressable>
      ) : null}

      {/* Supporting metrics */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric
          title={"Active\norders"}
          icon="clipboard-list"
          iconBg="violet50"
          iconColor="primary"
          value={String(data.active.length)}
          unit="orders"
          note={`${data.dueToday} due today`}
          onPress={() => router.push("/orders?status=in_progress")}
        />
        <Metric
          title={"Money\nreceived"}
          icon="banknote"
          iconBg="warm50"
          iconColor="warning"
          value={formatMoney(data.today.receivedCents, cur, {
            decimals: false,
          })}
          unit="today"
          note={`${data.today.paymentCount} ${data.today.paymentCount === 1 ? "payment" : "payments"}`}
          onPress={() => router.push(finance ? "/transactions" : "/activity")}
        />
      </View>

      {/* Quick actions */}
      <View style={styles.quick}>
        <Quick
          icon="clipboard-list"
          label="New order"
          onPress={() => router.push("/order/new")}
        />
        <Quick
          icon="user-plus"
          label="Add customer"
          onPress={() => router.push("/customer/new")}
        />
        {finance ? (
          <Quick
            icon="banknote"
            label="Payment"
            onPress={() => router.push("/outstanding")}
          />
        ) : null}
        {finance ? (
          <Quick
            icon="receipt"
            label="Expense"
            onPress={() => router.push("/expense/new")}
          />
        ) : null}
      </View>

      {/* Revenue chart (a report — owners and managers only) */}
      {finance ? (
        <View style={styles.chart}>
          <View style={styles.chartHead}>
            <Txt variant="bodyMedium">Revenue recorded</Txt>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {([7, 30, 90] as Period[]).map((p) => (
                <Pressable
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: period === p }}
                  onPress={() => setPeriod(p)}
                  style={[
                    styles.segmentItem,
                    period === p ? { backgroundColor: colors.ink } : null,
                  ]}
                >
                  <Txt
                    variant="label"
                    color={period === p ? "onPrimary" : "textSecondary"}
                  >
                    {p}D
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.total}>
            <Txt style={styles.totalWhole}>{whole}</Txt>
            <Txt style={styles.totalFraction}>{fraction}</Txt>
            <Txt
              variant="caption"
              color="textSecondary"
              style={{ marginBottom: 4 }}
            >
              last {period} days
            </Txt>
          </View>
          {change ? (
            <Txt
              variant="caption"
              color={
                chart.total >= chart.prevTotal ? "successText" : "errorText"
              }
            >
              {change} vs{" "}
              {formatMoney(chart.prevTotal, cur, { decimals: false })} the{" "}
              {period} days before
            </Txt>
          ) : null}
          <DayBars bars={chart.bars} />
          <View style={styles.legend}>
            <LegendItem color="primary" label="Best day" />
            <LegendItem color="warm" label="Today, so far" />
            <LegendItem
              color="hatch"
              label={`Scale · max ${formatMoneyShort(chart.best, cur)}`}
            />
          </View>
        </View>
      ) : null}

      {/* Today's schedule */}
      <SectionHeader
        title="Today’s schedule"
        size="large"
        link={{
          label: "See all",
          onPress: () => router.push("/schedule"),
          color: "textSecondary",
        }}
      />
      <WeekStrip
        selected={day}
        onSelect={setDay}
        appointments={ws.appointments}
      />
      {dayAppointments.length === 0 ? (
        <Txt variant="caption" color="textSecondary" align="center">
          Nothing scheduled for this day.
        </Txt>
      ) : (
        dayAppointments.slice(0, 3).map((a) => {
          const order = a.orderId
            ? ws.orders.find((o) => o.id === a.orderId)
            : undefined;
          const view = order
            ? data.views.find((v) => v.order.id === order.id)
            : undefined;
          const delivery = a.type === "delivery";
          const who =
            ws.customers.find((c) => c.id === a.customerId)?.fullName ??
            "Customer";
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() => router.push(`/schedule/${a.id}`)}
              style={styles.sched}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <Txt variant="bodyMedium" size={16}>
                  {delivery
                    ? "Delivery"
                    : a.type === "pickup"
                      ? "Pickup"
                      : "Service"}{" "}
                  · {who}
                </Txt>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={[
                      styles.timePill,
                      {
                        backgroundColor: delivery
                          ? colors.violet50
                          : colors.warm50,
                      },
                    ]}
                  >
                    <Icon
                      name="clock"
                      size={13}
                      color={delivery ? "primary" : "warning"}
                    />
                    <Txt
                      variant="caption"
                      weight="semibold"
                      color={delivery ? "primaryDark" : "warningText"}
                    >
                      {new Date(a.startsAt).toTimeString().slice(0, 5)}
                    </Txt>
                  </View>
                  <Txt
                    variant="caption"
                    color="textSecondary"
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {order && view
                      ? `${orderNo(order)} · ${view.money.paymentStatus === "paid" ? "Paid" : `${formatMoney(view.money.balanceCents, cur)} due`}`
                      : a.location}
                  </Txt>
                </View>
              </View>
              <View style={styles.schedIcon}>
                <Icon name={delivery ? "truck" : "package"} size={18} />
              </View>
            </Pressable>
          );
        })
      )}
      {firstOverdue ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/order/${firstOverdue.order.id}`)}
          style={styles.reminder}
        >
          <View style={styles.reminderIcon}>
            <Icon name="triangle-alert" size={18} color="error" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label" color="errorText">
              {firstOverdue.customerName} is{" "}
              {Math.max(
                1,
                Math.floor(
                  (now.getTime() -
                    new Date(firstOverdue.order.dueAt).getTime()) /
                    86400000,
                ),
              )}{" "}
              days overdue
            </Txt>
            <Txt variant="caption" color="errorText">
              {orderNo(firstOverdue.order)} ·{" "}
              {money(firstOverdue.money.balanceCents)} · due{" "}
              {new Date(firstOverdue.order.dueAt).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </Txt>
          </View>
          <Icon name="chevron-right" size={18} color="errorText" />
        </Pressable>
      ) : null}

      {/* Recent orders */}
      <SectionHeader
        title="Recent orders"
        size="large"
        link={{
          label: "View all",
          onPress: () => router.push("/orders"),
          color: "textSecondary",
        }}
      />
      <View>
        {data.views.slice(0, 3).map((v, i) => (
          <View key={v.order.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/order/${v.order.id}`)}
              style={styles.recent}
            >
              <View style={styles.recentLine}>
                <Txt variant="bodyMedium" size={16}>
                  {v.customerName}
                </Txt>
                <Txt variant="figure" size={16}>
                  {money(v.order.totalCents)}
                </Txt>
              </View>
              <View style={styles.recentLine}>
                <Txt
                  variant="caption"
                  color="textSecondary"
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {orderNo(v.order)} · {v.description}
                </Txt>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <StatusBadge status={v.order.status} />
                  {v.order.status !== "cancelled" ? (
                    <StatusBadge
                      status={
                        v.money.overdue ? "overdue" : v.money.paymentStatus
                      }
                    />
                  ) : null}
                </View>
              </View>
            </Pressable>
          </View>
        ))}
        {data.views.length === 0 ? (
          <Txt variant="caption" color="textSecondary">
            No orders yet.{" "}
            <LinkText
              label="Create the first one"
              onPress={() => router.push("/order/new")}
            />
          </Txt>
        ) : null}
      </View>
    </Screen>
  );
}

function RingStat({
  progress,
  color,
  value,
  label,
  onPress,
}: {
  progress: number;
  color: "warm" | "violet" | "error";
  value: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={{ alignItems: "center", gap: 6 }}
    >
      <Ring size={64} thickness={12} progress={progress} color={color}>
        <Txt
          variant="label"
          weight="semibold"
          size={value.length > 7 ? 10 : value.length > 6 ? 11 : 13}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ maxWidth: 46, textAlign: "center" }}
        >
          {value}
        </Txt>
      </Ring>
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
    </Pressable>
  );
}

function Metric(props: {
  title: string;
  icon: "clipboard-list" | "banknote";
  iconBg: "violet50" | "warm50";
  iconColor: "primary" | "warning";
  value: string;
  unit: string;
  note: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={styles.metric}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Txt variant="label">{props.title}</Txt>
        <View
          style={[styles.metricIcon, { backgroundColor: colors[props.iconBg] }]}
        >
          <Icon name={props.icon} size={18} color={props.iconColor} />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        <Txt variant="figure" size={28} style={{ lineHeight: 30 }}>
          {props.value}
        </Txt>
        <Txt
          variant="caption"
          color="textSecondary"
          style={{ marginBottom: 2 }}
        >
          {props.unit}
        </Txt>
      </View>
      <Txt variant="caption" color="textTertiary">
        {props.note}
      </Txt>
    </Pressable>
  );
}

function Quick({
  icon,
  label,
  onPress,
}: {
  icon: "clipboard-list" | "user-plus" | "banknote" | "receipt";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ alignItems: "center", gap: 8 }}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.quickIcon, pressed ? { opacity: 0.7 } : null]}>
            <Icon name={icon} size={22} />
          </View>
          <Txt variant="caption">{label}</Txt>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  glance: {
    fontFamily: fonts.serif,
    fontSize: 36,
    lineHeight: 42,
    textAlign: "center",
    color: colors.text,
  },
  gaugeBox: { height: 170 },
  gaugeTop: { flexDirection: "row", justifyContent: "space-between" },
  gauge: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  gaugeValue: { position: "absolute", top: 58, alignItems: "center" },
  gaugeAmount: {
    fontFamily: fonts.semibold,
    fontSize: 46,
    lineHeight: 44,
    letterSpacing: -1.8,
    color: colors.text,
  },
  rings: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  profit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 20,
    borderRadius: 28,
    backgroundColor: colors.primary50,
  },
  tag: { flexDirection: "row", alignItems: "center", gap: 6 },
  tagIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quick: { flexDirection: "row", justifyContent: "space-between" },
  quickIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chart: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 20,
    gap: 4,
  },
  chartHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  segmentItem: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 },
  total: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 4 },
  totalWhole: {
    fontFamily: fonts.semibold,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -1.5,
    color: colors.text,
  },
  totalFraction: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 30,
    color: colors.textTertiary,
    marginLeft: -6,
  },
  legend: { flexDirection: "row", gap: 14, paddingTop: 10, flexWrap: "wrap" },
  sched: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  schedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.error50,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  recent: { paddingVertical: 14, gap: 8 },
  recentLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
});
