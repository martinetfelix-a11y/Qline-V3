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

type HourBin = { hour: number; join: number; served: number };

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtHour(h: number) {
  return `${String(h).padStart(2, "0")}h`;
}

function fmtMin(v: unknown) {
  if (typeof v !== "number") return "-";
  return `${v.toFixed(1)} min`;
}

function fmtPct(v: unknown) {
  if (typeof v !== "number") return "-";
  return `${v.toFixed(1)}%`;
}

function LoadingBlock() {
  return (
    <View style={styles.loadingBlock}>
      <ShimmerLine width="86%" />
      <ShimmerLine width="82%" />
      <ShimmerLine width="78%" />
    </View>
  );
}

export default function MerchantStats() {
  const { auth } = useAuth();
  const commerceId = auth?.commerceId || "c1";
  const { day, kpis, series, loading } = useStats(commerceId);

  const bins: HourBin[] = (series?.series || []).map((b: any) => ({
    hour: toNum(b.hour),
    join: toNum(b.join),
    served: toNum(b.served),
  }));

  const maxHourly = Math.max(1, ...bins.map((b) => Math.max(b.join, b.served)));
  const totalJoin = bins.reduce((a, b) => a + b.join, 0);
  const totalServed = bins.reduce((a, b) => a + b.served, 0);
  const netQueue = totalJoin - totalServed;
  const serviceCoverage = totalJoin > 0 ? (totalServed / totalJoin) * 100 : null;
  const peakHour = bins.reduce((best, cur) => (cur.join > (best?.join ?? -1) ? cur : best), null as HourBin | null);

  const periods = [
    { label: "Nuit", from: 0, to: 5 },
    { label: "Matin", from: 6, to: 11 },
    { label: "Apres-midi", from: 12, to: 17 },
    { label: "Soir", from: 18, to: 23 },
  ];
  const periodStats = periods.map((p) => {
    const chunk = bins.filter((b) => b.hour >= p.from && b.hour <= p.to);
    const join = chunk.reduce((a, b) => a + b.join, 0);
    const served = chunk.reduce((a, b) => a + b.served, 0);
    const pending = Math.max(0, join - served);
    return { ...p, join, served, pending };
  });
  const maxPeriod = Math.max(1, ...periodStats.flatMap((p) => [p.join, p.served, p.pending]));

  const kpiItems = [
    { label: "Attente moyenne", value: fmtMin(kpis?.avgWaitMin) },
    { label: "Service moyen", value: fmtMin(kpis?.avgServiceMin) },
    { label: "Servis aujourd'hui", value: String(kpis?.servedToday ?? "-") },
    { label: "En attente", value: String(kpis?.waitingNow ?? "-") },
    { label: "Taux abandon", value: fmtPct(kpis?.abandonRatePct) },
    { label: "Couverture service", value: fmtPct(serviceCoverage) },
  ];

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

      <Reveal delay={170}>
        <Card>
          <Text style={styles.h}>Indicateurs cles</Text>
          {loading ? (
            <LoadingBlock />
          ) : (
            <View style={styles.kpiGrid}>
              {kpiItems.map((item) => (
                <View key={item.label} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{item.label}</Text>
                  <Text style={styles.kpiValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </Reveal>

      <Reveal delay={230}>
        <Card>
          <Text style={styles.h}>Trafic horaire (barres comparees)</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#1f9f63" }]} />
              <Text style={styles.legendText}>Arrivees</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#2a6f97" }]} />
              <Text style={styles.legendText}>Servis</Text>
            </View>
          </View>
          {loading && <LoadingBlock />}
          {!loading && (
            <View style={styles.hourlyListCard}>
              {bins.map((b) => {
                const joinW = `${Math.max(4, Math.round((b.join / maxHourly) * 100))}%` as `${number}%`;
                const servedW = `${Math.max(4, Math.round((b.served / maxHourly) * 100))}%` as `${number}%`;
                return (
                  <View key={b.hour} style={styles.hourRow}>
                    <Text style={styles.hourLabel}>{fmtHour(b.hour)}</Text>
                    <View style={styles.hourTracks}>
                      <View style={styles.trackLine}>
                        <View style={[styles.trackFillJoin, { width: joinW }]} />
                      </View>
                      <View style={[styles.trackLine, styles.trackLineGap]}>
                        <View style={[styles.trackFillServed, { width: servedW }]} />
                      </View>
                    </View>
                    <Text style={styles.hourPairValue}>{b.join}/{b.served}</Text>
                  </View>
                );
              })}
              {bins.length === 0 && (
                <Text style={styles.sub}>Aucune donnee horaire disponible pour aujourd'hui.</Text>
              )}
              <View style={styles.scaleRow}>
                <Text style={styles.scaleText}>0</Text>
                <Text style={styles.scaleText}>25%</Text>
                <Text style={styles.scaleText}>50%</Text>
                <Text style={styles.scaleText}>75%</Text>
                <Text style={styles.scaleText}>100%</Text>
              </View>
            </View>
          )}
        </Card>
      </Reveal>

      <Reveal delay={290}>
        <Card>
          <Text style={styles.h}>Comparatif par periode (style barres groupees)</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#1f9f63" }]} />
              <Text style={styles.legendText}>Arrivees</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#2a6f97" }]} />
              <Text style={styles.legendText}>Servis</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#d94f4f" }]} />
              <Text style={styles.legendText}>Restants</Text>
            </View>
          </View>
          {loading && <LoadingBlock />}
          {!loading && (
            <View style={styles.periodChart}>
              {periodStats.map((p) => {
                const hJoin = Math.max(8, Math.round((p.join / maxPeriod) * 120));
                const hServed = Math.max(8, Math.round((p.served / maxPeriod) * 120));
                const hPending = Math.max(8, Math.round((p.pending / maxPeriod) * 120));
                return (
                  <View key={p.label} style={styles.periodGroup}>
                    <View style={styles.periodBars}>
                      <View style={[styles.periodBar, { height: hJoin, backgroundColor: "#1f9f63" }]} />
                      <View style={[styles.periodBar, { height: hServed, backgroundColor: "#2a6f97" }]} />
                      <View style={[styles.periodBar, { height: hPending, backgroundColor: "#d94f4f" }]} />
                    </View>
                    <Text style={styles.periodLabel}>{p.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </Reveal>

      <Reveal delay={350}>
        <Card>
          <Text style={styles.h}>Informations utiles</Text>
          {loading ? (
            <LoadingBlock />
          ) : (
            <View style={styles.infoList}>
              <Text style={styles.rowText}>Heure la plus achalandee: {peakHour ? `${fmtHour(peakHour.hour)} (${peakHour.join} arrivees)` : "-"}</Text>
              <Text style={styles.rowText}>Volume total: {totalJoin} arrivees / {totalServed} servis</Text>
              <Text style={styles.rowText}>Solde de file de la journee: {netQueue >= 0 ? `+${netQueue}` : `${netQueue}`}</Text>
              <Text style={styles.sub}>Astuce: un solde positif eleve indique que la capacite de service est insuffisante sur certains creneaux.</Text>
            </View>
          )}
        </Card>
      </Reveal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  h: { fontSize: 18, fontWeight: "900", marginBottom: 10, color: ui.colors.text },
  loadingBlock: { gap: 8 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: {
    width: "48%",
    minHeight: 102,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.md,
    padding: 12,
    justifyContent: "center",
  },
  kpiLabel: { color: ui.colors.textMuted, fontWeight: "700", fontSize: 12, marginBottom: 7 },
  kpiValue: { color: ui.colors.text, fontWeight: "900", fontSize: 21 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  legendText: { color: ui.colors.textMuted, fontWeight: "700", fontSize: 12 },
  hourlyListCard: {
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    padding: 10,
  },
  hourRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  hourLabel: { width: 38, color: ui.colors.text, fontSize: 11, fontWeight: "800" },
  hourTracks: { flex: 1 },
  trackLine: {
    height: 8,
    backgroundColor: "rgba(16,36,24,0.09)",
    borderRadius: ui.radius.pill,
    overflow: "hidden",
  },
  trackLineGap: { marginTop: 5 },
  trackFillJoin: { height: "100%", backgroundColor: "#1f9f63", borderRadius: ui.radius.pill },
  trackFillServed: { height: "100%", backgroundColor: "#2a6f97", borderRadius: ui.radius.pill },
  hourPairValue: { width: 44, textAlign: "right", color: ui.colors.textMuted, fontSize: 11, fontWeight: "800" },
  scaleRow: {
    marginTop: 6,
    marginLeft: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 44,
  },
  scaleText: { color: ui.colors.textMuted, fontSize: 10, fontWeight: "700" },
  periodChart: {
    height: 184,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.md,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  periodGroup: { flex: 1, alignItems: "center" },
  periodBars: {
    height: 130,
    width: "85%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 3,
  },
  periodBar: { width: "28%", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  periodLabel: { marginTop: 8, color: ui.colors.text, fontSize: 11, fontWeight: "800" },
  infoList: { gap: 6 },
  rowText: { color: ui.colors.text, fontWeight: "700" },
  sub: { color: ui.colors.textMuted, marginTop: 4, fontWeight: "600", lineHeight: 18 },
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
});
