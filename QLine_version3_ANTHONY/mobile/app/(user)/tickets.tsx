import { Alert, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUserQueue } from "../../features/queue/userQueue.store";
import { useCommerces } from "../../features/commerces/commerces.store";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { Reveal } from "../../components/Reveal";
import { ScreenShell } from "../../components/ScreenShell";
import { StatusPill } from "../../components/StatusPill";
import { ui } from "../../theme/ui";

function fmtMin(sec: number) {
  return `${Math.round(sec / 60)} min`;
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function TicketsPage() {
  const q = useUserQueue();
  const { commerces } = useCommerces();

  const getCommerceName = (id: string) => {
    const c = commerces.find((x) => x.id === id);
    return c ? c.name : "Commerce inconnu";
  };

  const totalInScope = Math.max(q.queue.length, q.position ?? 0, 1);
  const progressRatio = q.position ? Math.max(0, Math.min(1, 1 - (q.position - 1) / totalInScope)) : 0;
  const statusTone: "success" | "warning" | "neutral" | "danger" =
    q.status === "active" ? "success" : q.status === "called" ? "warning" : q.status === "served" ? "neutral" : "danger";
  const statusLabel =
    q.status === "active"
      ? "Actif"
      : q.status === "called"
        ? "Appele"
        : q.status === "served"
          ? "Termine"
          : q.status === "cancelled"
            ? "Annule"
            : "Inconnu";

  const confirmCancel = () => {
    Alert.alert(
      "Annuler ce rendez-vous ?",
      "Cette action supprimera ton ticket de la file.",
      [
        { text: "Non", style: "cancel" },
        { text: "Oui, annuler", style: "destructive", onPress: () => q.cancel() },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <AppHeader subtitle="Mes rendez-vous" />

      <Reveal delay={70}>
        <View style={styles.badgeRow}>
          <StatusPill label={q.ticketId ? "Rendez-vous actif" : "Aucun rendez-vous"} tone={q.ticketId ? "warning" : "neutral"} />
          <StatusPill label={q.eta ? `ETA ${fmtMin(q.eta.mean)}` : "ETA --"} tone="success" />
        </View>
      </Reveal>

      {!q.ticketId && (
        <Reveal delay={140}>
          <Card>
            <Text style={styles.muted}>Aucun rendez-vous actif.</Text>
          </Card>
        </Reveal>
      )}

      {q.ticketId && (
        <Reveal delay={140}>
          <Card>
            <Text style={styles.h}>Rendez-vous en cours</Text>
            <View style={styles.statusRow}>
              <StatusPill label={statusLabel} tone={statusTone} />
              <StatusPill label={`Position ${q.position ?? "-"}`} tone="neutral" />
            </View>

            <Text style={styles.label}>Commerce : {getCommerceName(q.commerceId)}</Text>
            <Text style={styles.label}>Ticket : {q.ticketId}</Text>
            <Text style={styles.label}>Cree a : {fmtTime(q.joinedAt)}</Text>
            <Text style={styles.label}>Derniere MAJ : {q.serverTime ?? fmtTime(q.updatedAt)}</Text>
            {q.eta && <Text style={styles.label}>ETA : {fmtMin(q.eta.mean)} (plage {fmtMin(q.eta.low)} - {fmtMin(q.eta.high)})</Text>}

            {q.status === "called" && <Text style={styles.called}>Ton tour est en cours. Presente-toi au comptoir.</Text>}

            {q.status === "active" && (
              <View style={styles.progressRail}>
                <View style={[styles.progressFill, { width: `${Math.max(progressRatio * 100, q.position ? 10 : 0)}%` }]} />
              </View>
            )}

            {q.status === "active" && (
              <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]} onPress={confirmCancel}>
                <View style={styles.smallRow}>
                  <Ionicons name="trash-outline" size={16} color="white" />
                  <Text style={styles.smallText}>Annuler ce rendez-vous</Text>
                </View>
              </Pressable>
            )}
          </Card>
        </Reveal>
      )}

      <Reveal delay={220}>
        <Card>
          <Text style={styles.h}>Vue file d'attente</Text>
          {q.nowServing && <Text style={styles.called}>En service: {q.nowServing.id}</Text>}

          {q.queue.slice(0, 10).map((it, idx) => (
            <Text key={it.id} style={idx === 0 ? styles.next : styles.item}>
              {idx + 1}. {it.id}
            </Text>
          ))}

          {!q.queue.length && <Text style={styles.muted}>Aucun client en attente</Text>}
        </Card>
      </Reveal>

      {!!q.notice && (
        <Reveal delay={260}>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{q.notice}</Text>
          </View>
        </Reveal>
      )}

      {!!q.error && (
        <Reveal delay={280}>
          <Text style={styles.err}>{q.error}</Text>
        </Reveal>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 110 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  h: { fontSize: 18, fontWeight: "900", marginBottom: 8, color: ui.colors.text },
  label: { fontSize: 14, marginTop: 6, color: ui.colors.text, fontWeight: "600" },
  muted: { color: ui.colors.textMuted, fontSize: 13, fontWeight: "600" },
  called: { color: ui.colors.primaryDeep, marginTop: 8, fontWeight: "800" },
  err: { color: ui.colors.danger, marginTop: 8, fontWeight: "700" },
  cancelBtn: {
    marginTop: 12,
    padding: 12,
    borderRadius: ui.radius.md,
    backgroundColor: ui.colors.danger,
    alignItems: "center",
  },
  cancelBtnPressed: { opacity: 0.85 },
  smallRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  smallText: { color: "white", fontWeight: "800" },
  progressRail: {
    height: 8,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: ui.radius.pill,
    borderWidth: 1,
    borderColor: ui.colors.border,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.pill,
  },
  item: { color: ui.colors.textMuted, marginTop: 4, fontWeight: "600" },
  next: { color: ui.colors.primaryDeep, fontWeight: "900", marginTop: 4 },
  noticeBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.borderStrong,
    backgroundColor: ui.colors.primarySoft,
  },
  noticeText: { color: ui.colors.primaryDeep, fontWeight: "800" },
});
