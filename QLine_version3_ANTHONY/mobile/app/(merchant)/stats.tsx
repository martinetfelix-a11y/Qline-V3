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

export default function MerchantStats() {
  const { auth } = useAuth();
  const commerceId = auth?.commerceId || "c1";
  const { day, kpis, series, hist, loading } = useStats(commerceId);

  const bins = (series?.series || []) as any[];
  const peakJoin = bins.reduce((best, b) => (b.join > (best?.join ?? -1) ? b : best), null as any);
  const peakServed = bins.reduce((best, b) => (b.served > (best?.served ?? -1) ? b : best), null as any);

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

      {loading && <Text style={styles.sub}>Chargement...</Text>}

      <Reveal delay={180}>
        <Card>
          <Text style={styles.h}>KPI du jour</Text>
          {loading ? (
            <View style={{ gap: 8 }}>
              <ShimmerLine width="75%" />
              <ShimmerLine width="70%" />
              <ShimmerLine width="68%" />
              <ShimmerLine width="72%" />
            </View>
          ) : (
            <>
              <Text style={styles.rowText}>En attente maintenant: {kpis?.waitingNow ?? "-"}</Text>
              <Text style={styles.rowText}>Tickets pris: {kpis?.joinedToday ?? "-"}</Text>
              <Text style={styles.rowText}>Clients servis: {kpis?.servedToday ?? "-"}</Text>
              <Text style={styles.rowText}>Duree moyenne: {kpis?.avgServiceMin ?? "-"} min</Text>
              <Text style={styles.rowText}>P90 duree: {kpis?.p90ServiceMin ?? "-"} min</Text>
            </>
          )}
        </Card>
      </Reveal>

      <Reveal delay={250}>
        <Card>
          <Text style={styles.h}>Heures de pointe</Text>
          {loading ? (
            <View style={{ gap: 8 }}>
              <ShimmerLine width="65%" />
              <ShimmerLine width="62%" />
            </View>
          ) : (
            <>
              <Text style={styles.rowText}>Pic d arrivees: {peakJoin ? `${String(peakJoin.hour).padStart(2, "0")}h (${peakJoin.join})` : "-"}</Text>
              <Text style={styles.rowText}>Pic de service: {peakServed ? `${String(peakServed.hour).padStart(2, "0")}h (${peakServed.served})` : "-"}</Text>
            </>
          )}
        </Card>
      </Reveal>

      <Reveal delay={320}>
        <Card>
          <Text style={styles.h}>Serie horaire (joins/served)</Text>
          {loading && (
            <View style={{ gap: 8 }}>
              <ShimmerLine width="88%" />
              <ShimmerLine width="84%" />
              <ShimmerLine width="90%" />
              <ShimmerLine width="82%" />
            </View>
          )}
          {!loading &&
            bins.map((b: any) => (
              <Text key={b.hour} style={styles.rowText}>
                {String(b.hour).padStart(2, "0")}h - joins: {b.join}, served: {b.served}
              </Text>
            ))}
        </Card>
      </Reveal>

      <Reveal delay={390}>
        <Card>
          <Text style={styles.h}>Distribution des durees (histogramme 5 min)</Text>
          {loading && (
            <View style={{ gap: 8 }}>
              <ShimmerLine width="82%" />
              <ShimmerLine width="74%" />
              <ShimmerLine width="78%" />
            </View>
          )}
          {!loading &&
            (hist?.histogram || []).map((bin: any) => (
              <Text key={bin.minFrom} style={styles.rowText}>
                {bin.minFrom}-{bin.minTo} min : {bin.count}
              </Text>
            ))}
          <Text style={styles.sub}>Astuce: alimente la distribution en entrant durationSec quand tu appelles le prochain.</Text>
        </Card>
      </Reveal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  sub: { color: ui.colors.textMuted, marginTop: 8, fontWeight: "600", lineHeight: 18 },
  h: { fontSize: 18, fontWeight: "900", marginBottom: 8, color: ui.colors.text },
  rowText: { color: ui.colors.text, marginBottom: 4, fontWeight: "600" },
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
