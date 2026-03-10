import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { useStats } from "../../features/stats/stats.store";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { Reveal } from "../../components/Reveal";
import { ScreenShell } from "../../components/ScreenShell";
import { ShimmerLine } from "../../components/ShimmerLine";
import { StatusPill } from "../../components/StatusPill";
import { ui } from "../../theme/ui";

type MetricBar = {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  display: string;
  accent: string;
  note: string;
};

function metricBars(kpis: any): MetricBar[] {
  return [
    {
      key: "avgWaitMin",
      label: "Average Wait Time",
      shortLabel: "Wait",
      value: Number(kpis?.avgWaitMin ?? 0),
      display: `${kpis?.avgWaitMin ?? 0} min`,
      accent: "#5a93d7",
      note: "Total customer wait time / customers served",
    },
    {
      key: "servedToday",
      label: "Customers Served Today",
      shortLabel: "Served",
      value: Number(kpis?.servedToday ?? 0),
      display: String(kpis?.servedToday ?? 0),
      accent: "#d93c57",
      note: "Completed tickets today",
    },
    {
      key: "waitingNow",
      label: "Customers Waiting",
      shortLabel: "Waiting",
      value: Number(kpis?.waitingNow ?? 0),
      display: String(kpis?.waitingNow ?? 0),
      accent: "#3c8d2f",
      note: "Current queue length",
    },
    {
      key: "avgServiceMin",
      label: "Average Service Time",
      shortLabel: "Service",
      value: Number(kpis?.avgServiceMin ?? 0),
      display: `${kpis?.avgServiceMin ?? 0} min`,
      accent: "#f26f2d",
      note: "Total service time / customers served",
    },
    {
      key: "abandonmentRatePct",
      label: "Abandonment Rate",
      shortLabel: "Drop-off",
      value: Number(kpis?.abandonmentRatePct ?? 0),
      display: `${kpis?.abandonmentRatePct ?? 0}%`,
      accent: "#d8c919",
      note: "Cancelled tickets / created tickets",
    },
  ];
}

export default function MerchantStats() {
  const { auth } = useAuth();
  const commerceId = auth?.commerceId || "c1";
  const { day, kpis, loading } = useStats(commerceId);

  const bars = metricBars(kpis);
  const maxValue = Math.max(1, ...bars.map((item) => item.value));

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <AppHeader subtitle={`Stats - ${commerceId} - ${day}`} />

      <Reveal delay={70}>
        <View style={styles.badgeRow}>
          <StatusPill label={`Jour ${day}`} tone="neutral" />
          <StatusPill label={loading ? "Analyse en cours" : "A jour"} tone={loading ? "warning" : "success"} />
        </View>
      </Reveal>

      <Reveal delay={120}>
        <Pressable style={({ pressed }) => [styles.back, pressed && styles.backPressed]} onPress={() => router.back()}>
          <View style={styles.backRow}>
            <Ionicons name="arrow-back-outline" size={16} color="white" />
            <Text style={styles.backText}>Retour dashboard</Text>
          </View>
        </Pressable>
      </Reveal>

      <Reveal delay={180}>
        <Card>
          <Text style={styles.h}>Queue performance overview</Text>
          <Text style={styles.sub}>The chart compares the five core queue metrics you requested for this commerce.</Text>

          {loading ? (
            <View style={styles.loadingBlock}>
              <ShimmerLine width="92%" />
              <ShimmerLine width="88%" />
              <ShimmerLine width="85%" />
              <ShimmerLine width="90%" />
            </View>
          ) : (
            <View style={styles.chartWrap}>
              <View style={styles.chartArea}>
                {bars.map((item) => (
                  <View key={item.key} style={styles.barCol}>
                    <Text style={styles.barValue}>{item.display}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: item.accent,
                            height: `${Math.max(8, (item.value / maxValue) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.shortLabel}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>
      </Reveal>

      <Reveal delay={250}>
        <Card>
          <Text style={styles.h}>Metric details</Text>
          {loading ? (
            <View style={styles.loadingBlock}>
              <ShimmerLine width="84%" />
              <ShimmerLine width="86%" />
              <ShimmerLine width="80%" />
              <ShimmerLine width="82%" />
              <ShimmerLine width="78%" />
            </View>
          ) : (
            <View style={styles.metricList}>
              {bars.map((item) => (
                <View key={item.key} style={styles.metricRow}>
                  <View style={[styles.metricDot, { backgroundColor: item.accent }]} />
                  <View style={styles.metricCopy}>
                    <Text style={styles.metricLabel}>{item.label}</Text>
                    <Text style={styles.metricValue}>{item.display}</Text>
                    <Text style={styles.metricNote}>{item.note}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </Reveal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  h: { fontSize: 18, fontWeight: "900", marginBottom: 8, color: ui.colors.text },
  sub: { color: ui.colors.textMuted, marginTop: 2, fontWeight: "600", lineHeight: 18 },
  back: {
    alignSelf: "flex-start",
    backgroundColor: ui.colors.darkButton,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: ui.radius.pill,
    marginBottom: 12,
  },
  backPressed: { opacity: 0.85 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { color: "white", fontWeight: "900" },
  loadingBlock: { gap: 8, marginTop: 8 },
  chartWrap: {
    marginTop: 14,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.bgSoft,
    padding: 16,
  },
  chartArea: {
    minHeight: 300,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barValue: {
    color: ui.colors.text,
    fontWeight: "900",
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
    minHeight: 32,
  },
  barTrack: {
    width: "100%",
    maxWidth: 56,
    height: 210,
    borderRadius: 18,
    backgroundColor: "#e6efe9",
    borderWidth: 1,
    borderColor: ui.colors.border,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    minHeight: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  barLabel: {
    marginTop: 10,
    color: ui.colors.text,
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },
  metricList: { marginTop: 8, gap: 12 },
  metricRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
  },
  metricDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 5,
  },
  metricCopy: { flex: 1 },
  metricLabel: { color: ui.colors.text, fontWeight: "900", marginBottom: 2 },
  metricValue: { color: ui.colors.primaryDeep, fontWeight: "900", marginBottom: 4 },
  metricNote: { color: ui.colors.textMuted, fontWeight: "600", lineHeight: 18 },
});
