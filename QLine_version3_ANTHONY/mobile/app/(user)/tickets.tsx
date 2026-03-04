import { View, Text, Pressable, StyleSheet } from "react-native";
import { useUserQueue } from "../../features/queue/userQueue.store";
import { useCommerces } from "../../features/commerces/commerces.store";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";

export default function TicketsPage() {
  const q = useUserQueue();
  const { commerces } = useCommerces();

  const fmt = (sec: number) => `${Math.round(sec / 60)} min`;

  const getCommerceName = (id: string) => {
    const c = commerces.find((c) => c.id === id);
    return c ? c.name : "Commerce inconnu";
  };

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Mes tickets actifs" />

      {/* aucun ticket */}
      {!q.ticketId && (
        <Card>
          <Text style={styles.muted}>Aucun ticket actif</Text>
        </Card>
      )}

      {/* ticket actif */}
      {q.ticketId && (
        <Card>
          <Text style={styles.h}>Ticket actif</Text>

          <Text style={styles.label}>
            Commerce : {getCommerceName(q.commerceId)}
          </Text>

          <Text style={styles.label}>Ticket : {q.ticketId}</Text>

          <Text style={styles.label}>
            Position : {q.position ?? "-"}
          </Text>

          {q.eta && (
            <Text style={styles.label}>
              Temps estimé : {fmt(q.eta.mean)}
            </Text>
          )}

          <Pressable style={styles.small} onPress={q.clearLocal}>
            <Text style={styles.smallText}>Supprimer mon ticket</Text>
          </Pressable>
        </Card>
      )}

      {/* file */}
      <Card>
        <Text style={styles.h}>File d'attente</Text>

        {q.queue.slice(0, 10).map((it, idx) => (
          <Text key={it.id} style={idx === 0 ? styles.next : styles.item}>
            {idx + 1}. {it.id}
          </Text>
        ))}

        {!q.queue.length && (
          <Text style={styles.muted}>Aucun client</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },

  h: { fontSize: 16, fontWeight: "800", marginBottom: 8 },

  label: {
    fontSize: 14,
    marginTop: 4,
    color: "#374151",
  },

  muted: { color: "#6b7280", fontSize: 12 },

  small: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#374151",
    alignItems: "center",
  },

  smallText: { color: "white", fontWeight: "700" },

  item: { color: "#374151", marginTop: 2 },

  next: {
    color: "#15803d",
    fontWeight: "800",
    marginTop: 2,
  },
});