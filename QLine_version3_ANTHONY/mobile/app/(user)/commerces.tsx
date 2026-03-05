import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCommerces } from "../../features/commerces/commerces.store";
import { useUserQueue } from "../../features/queue/userQueue.store";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { Reveal } from "../../components/Reveal";
import { ScreenShell } from "../../components/ScreenShell";
import { ShimmerLine } from "../../components/ShimmerLine";
import { StatusPill } from "../../components/StatusPill";
import { useAuth } from "../../features/auth/AuthProvider";
import { ui } from "../../theme/ui";

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function CommercesPage() {
  const { commerces, loading } = useCommerces();
  const q = useUserQueue();
  const { logout } = useAuth();

  const selected = commerces.find((c: any) => c.id === q.commerceId) as any;
  const selectedName = selected?.name || q.commerceId || "-";
  const isOpen = selected?.open ?? true;
  const isPaused = selected?.paused ?? false;

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <AppHeader subtitle="Prendre un rendez-vous" />

      <Reveal delay={70}>
        <View style={styles.quickPills}>
          <StatusPill label={`Selection: ${selectedName}`} tone="success" />
          <StatusPill label={q.ticketId ? "Rendez-vous actif" : "Aucun rendez-vous"} tone={q.ticketId ? "warning" : "neutral"} />
        </View>
      </Reveal>

      <Reveal delay={140}>
        <Card>
          <Text style={styles.h}>Nouveau rendez-vous</Text>
          <Text style={styles.muted}>Choisis un commerce et valide. Ton suivi apparaitra dans "Rendez-vous".</Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Recapitulatif</Text>
            <Text style={styles.summaryLine}>Commerce: {selectedName}</Text>
            <View style={styles.summaryPills}>
              <StatusPill label={isOpen ? "Ouvert" : "Ferme"} tone={isOpen ? "success" : "danger"} />
              <StatusPill label={isPaused ? "En pause" : "Service actif"} tone={isPaused ? "warning" : "success"} />
            </View>
          </View>

          {loading && (
            <View style={{ gap: 8, marginTop: 10 }}>
              <ShimmerLine width="88%" />
              <ShimmerLine width="80%" />
            </View>
          )}

          <View style={styles.rowWrap}>
            {commerces.map((c) => (
              <Pressable key={c.id} style={[styles.pill, q.commerceId === c.id && styles.pillActive]} onPress={() => q.setCommerceId(c.id)}>
                <Text style={[styles.pillText, q.commerceId === c.id && styles.pillTextActive]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={() => q.join()}>
            <View style={styles.btnContent}>
              <Ionicons name="calendar-outline" size={18} color="white" />
              <Text style={styles.btnText}>Confirmer le rendez-vous</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.push("/(user)/scan")}>
            <View style={styles.btnContent}>
              <Ionicons name="scan-outline" size={18} color={ui.colors.primaryDeep} />
              <Text style={styles.btnAltText}>Scanner un QR commerce</Text>
            </View>
          </Pressable>

          {q.error && <Text style={styles.err}>{q.error}</Text>}
        </Card>
      </Reveal>

      {!!q.lastJoin && (
        <Reveal delay={210}>
          <Card>
            <Text style={styles.h}>Rendez-vous confirme</Text>
            <Text style={styles.label}>Ticket: {q.lastJoin.ticketId}</Text>
            <Text style={styles.label}>Position initiale: {q.lastJoin.position ?? "-"}</Text>
            <Text style={styles.label}>Heure de creation: {fmtTime(q.lastJoin.joinedAt)}</Text>
            <Text style={styles.label}>Heure serveur: {q.lastJoin.serverTime ?? "-"}</Text>
            {q.lastJoin.eta && <Text style={styles.label}>ETA initial: {Math.round(q.lastJoin.eta.mean / 60)} min</Text>}

            <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={() => router.push("/(user)/tickets")}>
              <View style={styles.btnContent}>
                <Ionicons name="list-outline" size={18} color="white" />
                <Text style={styles.btnText}>Suivre mon rendez-vous</Text>
              </View>
            </Pressable>
          </Card>
        </Reveal>
      )}

      {!!q.notice && (
        <Reveal delay={240}>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{q.notice}</Text>
          </View>
        </Reveal>
      )}

      <Reveal delay={300}>
        <Pressable
          style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <Text style={styles.logoutText}>Retour au menu login</Text>
        </Pressable>
      </Reveal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 110 },
  quickPills: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  h: { fontSize: 20, fontWeight: "900", marginBottom: 6, color: ui.colors.text },
  muted: { color: ui.colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18, fontWeight: "600" },
  label: { color: ui.colors.text, fontSize: 14, marginTop: 6, fontWeight: "700" },
  err: { color: ui.colors.danger, marginTop: 10, fontWeight: "700" },
  summaryBox: {
    marginTop: 8,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.md,
    padding: 12,
  },
  summaryTitle: { color: ui.colors.text, fontWeight: "900", marginBottom: 6 },
  summaryLine: { color: ui.colors.text, fontWeight: "700", marginBottom: 8 },
  summaryPills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  pillActive: { borderColor: ui.colors.primary, backgroundColor: ui.colors.primarySoft },
  pillText: { fontSize: 12, color: ui.colors.textMuted, fontWeight: "700" },
  pillTextActive: { color: ui.colors.primaryDeep, fontWeight: "900" },
  btn: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.pill,
    padding: 14,
    alignItems: "center",
    marginTop: 14,
    ...ui.shadow.soft,
  },
  btnPressed: { backgroundColor: ui.colors.primaryPressed },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: "white", fontWeight: "900", letterSpacing: 0.2 },
  btnAlt: {
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.pill,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: ui.colors.borderStrong,
  },
  btnAltPressed: { backgroundColor: ui.colors.primarySoft },
  btnAltText: { color: ui.colors.primaryDeep, fontWeight: "900" },
  noticeBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.borderStrong,
    backgroundColor: ui.colors.primarySoft,
  },
  noticeText: { color: ui.colors.primaryDeep, fontWeight: "800" },
  logout: {
    marginTop: 10,
    padding: 14,
    borderRadius: ui.radius.md,
    backgroundColor: ui.colors.darkButton,
    alignItems: "center",
    ...ui.shadow.soft,
  },
  logoutPressed: { opacity: 0.85 },
  logoutText: { color: "white", fontWeight: "800" },
});
