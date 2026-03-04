import { ScrollView, Text, StyleSheet, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { useStats } from "../../features/stats/stats.store";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";

export default function MerchantStats() {
  const { auth } = useAuth();
  const commerceId = auth?.commerceId || "c1";
  const { day, kpis, series, hist, loading } = useStats(commerceId);

  const bins = (series?.series || []) as any[];
  const peakJoin = bins.reduce(
    (best, b) => (b.join > (best?.join ?? -1) ? b : best),
    null as any
  );
  const peakServed = bins.reduce(
    (best, b) => (b.served > (best?.served ?? -1) ? b : best),
    null as any
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <AppHeader subtitle={`Stats — ${commerceId} — ${day}`} />

      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Dashboard</Text>
      </Pressable>

      {loading && <Text style={styles.sub}>Chargement...</Text>}

      <Card>
        <Text style={styles.h}>KPI du jour</Text>
        <Text>En attente maintenant: {kpis?.waitingNow ?? "-"}</Text>
        <Text>Tickets pris: {kpis?.joinedToday ?? "-"}</Text>
        <Text>Clients servis: {kpis?.servedToday ?? "-"}</Text>
        <Text>Durée moyenne: {kpis?.avgServiceMin ?? "-"} min</Text>
        <Text>P90 durée: {kpis?.p90ServiceMin ?? "-"} min</Text>
      </Card>

      <Card>
        <Text style={styles.h}>Heures de pointe</Text>
        <Text>Pic d’arrivées: {peakJoin ? `${String(peakJoin.hour).padStart(2, "0")}h (${peakJoin.join})` : "-"}</Text>
        <Text>Pic de service: {peakServed ? `${String(peakServed.hour).padStart(2, "0")}h (${peakServed.served})` : "-"}</Text>
      </Card>

      <Card>
        <Text style={styles.h}>Série horaire (joins/served)</Text>
        {bins.map((b: any) => (
          <Text key={b.hour}>
            {String(b.hour).padStart(2, "0")}h — joins: {b.join}, served: {b.served}
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={styles.h}>Distribution des durées (histogramme 5 min)</Text>
        {(hist?.histogram || []).map((bin: any) => (
          <Text key={bin.minFrom}>
            {bin.minFrom}-{bin.minTo} min : {bin.count}
          </Text>
        ))}
        <Text style={styles.sub}>Astuce: alimente la distribution en entrant durationSec quand tu appelles le prochain.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  sub: { color: "#6b7280", marginTop: 8 },
  h: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  back: { alignSelf: "flex-start", backgroundColor: "#374151", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, marginBottom: 12 },
  backText: { color: "white", fontWeight: "800" },
});
