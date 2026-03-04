import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { useCommerces } from "../../features/commerces/commerces.store";
import { useUserQueue } from "../../features/queue/userQueue.store";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { useAuth } from "../../features/auth/AuthProvider";


export default function UserHome() {
  const { commerces, loading } = useCommerces();
  const q = useUserQueue();
  const { logout } = useAuth();

  const fmt = (sec: number) => `${Math.round(sec / 60)} min`;

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Espace client" />

      <Card>
        <Text style={styles.h}>Choisir un commerce</Text>
        {loading && <Text style={styles.muted}>Chargement...</Text>}
        <View style={styles.rowWrap}>
          {commerces.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.pill, q.commerceId === c.id && styles.pillActive]}
              onPress={() => q.setCommerceId(c.id)}
            >
              <Text style={[styles.pillText, q.commerceId === c.id && styles.pillTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.btn} onPress={() => q.join()}>
          <Text style={styles.btnText}>Prendre un ticket</Text>
        </Pressable>

        <Pressable style={styles.btnAlt} onPress={() => router.push("/(user)/scan")}>
          <Text style={styles.btnAltText}>Scanner un QR</Text>
        </Pressable>

        {q.error && <Text style={styles.err}>{q.error}</Text>}
      </Card>

      <Card>
        <Text style={styles.h}>Mon ticket</Text>
        <Text>Ticket: {q.ticketId ?? "-"}</Text>
        <Text>Position: {q.position ?? "-"}</Text>

        {q.eta && (
          <Text>
            ETA AI: ~ {fmt(q.eta.mean)} (plage {fmt(q.eta.low)}–{fmt(q.eta.high)})
          </Text>
        )}

        <Text style={styles.muted}>Heure serveur: {q.serverTime ?? "-"}</Text>

        <Pressable style={styles.small} onPress={q.clearLocal}>
          <Text style={styles.smallText}>Supprimer mon ticket (local)</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.h}>File (top 10)</Text>
        {q.queue.slice(0, 10).map((it, idx) => (
          <Text key={it.id} style={idx === 0 ? styles.next : styles.item}>
            {idx + 1}. {it.id}
          </Text>
        ))}
        {!q.queue.length && <Text style={styles.muted}>Aucun client.</Text>}
      </Card>

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        <Text style={styles.logoutText}>Retour au menu login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },
  h: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  muted: { color: "#6b7280", fontSize: 12, marginTop: 6 },
  err: { color: "#b91c1c", marginTop: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pillActive: { borderColor: "#22c55e", backgroundColor: "#ecfdf5" },
  pillText: { fontSize: 12, color: "#374151" },
  pillTextActive: { color: "#15803d", fontWeight: "700" },
  btn: { backgroundColor: "#22c55e", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 12 },
  btnText: { color: "white", fontWeight: "800" },
  btnAlt: { backgroundColor: "#111827", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 10 },
  btnAltText: { color: "white", fontWeight: "800" },
  small: { marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: "#374151", alignItems: "center" },
  smallText: { color: "white", fontWeight: "800", fontSize: 12 },
  item: { paddingVertical: 4 },
  next: { paddingVertical: 4, fontWeight: "800", color: "#15803d" },
  logout: { marginTop: 18, backgroundColor: "#ef4444", borderRadius: 999, padding: 14, alignItems: "center" },
  logoutText: { color: "white", fontWeight: "800" },
});
