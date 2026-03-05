import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { useUserQueue } from "../../features/queue/userQueue.store";
import { useCommerces } from "../../features/commerces/commerces.store";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { ui } from "../../theme/ui";

export default function TicketsPage() {
  const q = useUserQueue();
  const { commerces } = useCommerces();

  const fmt = (sec: number) => `${Math.round(sec / 60)} min`;

  const getCommerceName = (id: string) => {
    const c = commerces.find((c) => c.id === id);
    return c ? c.name : "Commerce inconnu";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader subtitle="Mes tickets actifs" />

      {!q.ticketId && (
        <Card>
          <Text style={styles.muted}>Aucun ticket actif</Text>
        </Card>
      )}

      {q.ticketId && (
        <Card>
          <Text style={styles.h}>Ticket actif</Text>
          <Text style={styles.label}>Commerce : {getCommerceName(q.commerceId)}</Text>
          <Text style={styles.label}>Ticket : {q.ticketId}</Text>
          <Text style={styles.label}>Position : {q.position ?? "-"}</Text>
          {q.eta && <Text style={styles.label}>Temps estime : {fmt(q.eta.mean)}</Text>}

          <Pressable style={({ pressed }) => [styles.small, pressed && styles.smallPressed]} onPress={q.clearLocal}>
            <Text style={styles.smallText}>Supprimer mon ticket</Text>
          </Pressable>
        </Card>
      )}

      <Card>
        <Text style={styles.h}>File d'attente</Text>

        {q.queue.slice(0, 10).map((it, idx) => (
          <Text key={it.id} style={idx === 0 ? styles.next : styles.item}>
            {idx + 1}. {it.id}
          </Text>
        ))}

        {!q.queue.length && <Text style={styles.muted}>Aucun client</Text>}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.colors.bg },
  content: { padding: 16, paddingBottom: 110 },
  h: { fontSize: 18, fontWeight: "900", marginBottom: 8, color: ui.colors.text },
  label: {
    fontSize: 14,
    marginTop: 6,
    color: ui.colors.text,
    fontWeight: "600",
  },
  muted: { color: ui.colors.textMuted, fontSize: 13, fontWeight: "600" },
  small: {
    marginTop: 12,
    padding: 12,
    borderRadius: ui.radius.md,
    backgroundColor: ui.colors.darkButton,
    alignItems: "center",
  },
  smallPressed: { opacity: 0.85 },
  smallText: { color: "white", fontWeight: "800" },
  item: { color: ui.colors.textMuted, marginTop: 4, fontWeight: "600" },
  next: {
    color: ui.colors.primaryDeep,
    fontWeight: "900",
    marginTop: 4,
  },
});
