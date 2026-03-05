import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { getQueueState, merchantNext, merchantClose, merchantOpen, merchantPause } from "../../features/queue/queue.api";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { Reveal } from "../../components/Reveal";
import { ScreenShell } from "../../components/ScreenShell";
import { ShimmerLine } from "../../components/ShimmerLine";
import { StatusPill } from "../../components/StatusPill";
import { ui } from "../../theme/ui";

function fmtMin(sec: number) {
  return `${Math.max(0, Math.round(sec / 60))} min`;
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function MerchantQueue() {
  const { auth } = useAuth();
  const token = auth?.token;
  const commerceId = auth?.commerceId || "c1";

  const [queue, setQueue] = useState<any[]>([]);
  const [nowServing, setNowServing] = useState<any | null>(null);
  const [avgServiceSec, setAvgServiceSec] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState("600");
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [state, setState] = useState<{ open: boolean; paused: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    if (!token) return;
    try {
      const data = await getQueueState(token, commerceId);
      setQueue(data.queue || []);
      setNowServing(data.nowServing ?? null);
      setAvgServiceSec(data.eta?.avgServiceSec ?? null);
      setServerTime(data.serverTime ?? null);
      setState(data.state ?? null);
      setErr(null);
    } catch {
      setErr("Mise a jour impossible.");
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [token, commerceId]);

  const callNext = async () => {
    if (!token) return;
    const sec = Number(durationSec);
    try {
      await merchantNext(token, commerceId, Number.isFinite(sec) ? sec : undefined);
      await refresh();
    } catch {
      setErr("Action impossible.");
    }
  };

  const close = async () => {
    if (!token) return;
    try {
      await merchantClose(token, commerceId);
      await refresh();
    } catch {
      setErr("Action impossible.");
    }
  };

  const open = async () => {
    if (!token) return;
    try {
      await merchantOpen(token, commerceId);
      await refresh();
    } catch {
      setErr("Action impossible.");
    }
  };

  const togglePause = async () => {
    if (!token) return;
    try {
      await merchantPause(token, commerceId, !(state?.paused ?? false));
      await refresh();
    } catch {
      setErr("Action impossible.");
    }
  };

  const booting = !serverTime && !err && !state && queue.length === 0;
  const nextClient = queue[0] || null;

  return (
    <ScreenShell contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppHeader subtitle={`Operations file - ${commerceId}`} />

      <Reveal delay={90}>
        <View style={styles.pillRow}>
          <StatusPill label={state?.open ? "File ouverte" : "File fermee"} tone={state?.open ? "success" : "danger"} />
          <StatusPill label={state?.paused ? "En pause" : "Service actif"} tone={state?.paused ? "warning" : "success"} />
          <StatusPill label={`En attente ${queue.length}`} tone="neutral" />
        </View>
      </Reveal>

      <Reveal delay={150}>
        <Card>
          <Text style={styles.h}>Vue operationnelle</Text>
          <Text style={styles.muted}>Heure serveur: {serverTime ?? "-"}</Text>
          <Text style={styles.muted}>Duree moyenne actuelle: {avgServiceSec ? fmtMin(avgServiceSec) : "-"}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client en cours</Text>
            {nowServing ? (
              <>
                <Text style={styles.rowStrong}>Ticket: {nowServing.id}</Text>
                <Text style={styles.rowMuted}>Appele a: {fmtTime(nowServing.calledAt)}</Text>
                {nowServing.userEmail ? <Text style={styles.rowMuted}>Client: {nowServing.userEmail}</Text> : null}
              </>
            ) : (
              <Text style={styles.rowMuted}>Aucun client en cours.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prochain client</Text>
            {nextClient ? (
              <>
                <Text style={styles.rowStrong}>Ticket: {nextClient.id}</Text>
                <Text style={styles.rowMuted}>Arrive a: {fmtTime(nextClient.joinedAt)}</Text>
                <Text style={styles.rowMuted}>Attente: {fmtMin(nextClient.waitSec ?? 0)}</Text>
                {nextClient.userEmail ? <Text style={styles.rowMuted}>Client: {nextClient.userEmail}</Text> : null}
              </>
            ) : (
              <Text style={styles.rowMuted}>Aucun client en attente.</Text>
            )}
          </View>
        </Card>
      </Reveal>

      <Reveal delay={230}>
        <Card>
          <Text style={styles.h}>File complete (top 20)</Text>
          {booting && (
            <View style={{ gap: 8, marginTop: 6 }}>
              <ShimmerLine width="92%" />
              <ShimmerLine width="88%" />
              <ShimmerLine width="84%" />
            </View>
          )}

          {!booting &&
            queue.slice(0, 20).map((it, idx) => (
              <View key={it.id} style={styles.ticketRow}>
                <Text style={idx === 0 ? styles.next : styles.item}>
                  {idx + 1}. {it.id}
                </Text>
                <Text style={styles.rowMuted}>{fmtMin(it.waitSec ?? 0)}</Text>
              </View>
            ))}

          {!booting && !queue.length && <Text style={styles.rowMuted}>Aucun client.</Text>}
        </Card>
      </Reveal>

      <Reveal delay={310}>
        <Card>
          <Text style={styles.h}>Actions file</Text>
          <Text style={styles.muted}>Entre la duree du service termine puis appelle le prochain client.</Text>

          <TextInput
            style={styles.input}
            value={durationSec}
            onChangeText={setDurationSec}
            keyboardType="numeric"
            placeholder="durationSec"
            placeholderTextColor={ui.colors.textMuted}
          />

          <View style={styles.row}>
            <Pressable style={({ pressed }) => [styles.btnDark, pressed && styles.btnDarkPressed]} onPress={() => router.back()}>
              <View style={styles.btnRow}>
                <Ionicons name="arrow-back-outline" size={18} color="white" />
                <Text style={styles.btnText}>Dashboard</Text>
              </View>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={togglePause}>
              <View style={styles.btnRow}>
                <Ionicons name={state?.paused ? "play-circle-outline" : "pause-circle-outline"} size={18} color="white" />
                <Text style={styles.btnText}>{state?.paused ? "Reprendre" : "Pause"}</Text>
              </View>
            </Pressable>
          </View>

          {!state?.open && (
            <Pressable style={({ pressed }) => [styles.btnGreen, pressed && styles.btnGreenPressed]} onPress={open}>
              <View style={styles.btnRow}>
                <Ionicons name="lock-open-outline" size={18} color="white" />
                <Text style={styles.btnText}>Ouvrir la file</Text>
              </View>
            </Pressable>
          )}

          <Pressable style={({ pressed }) => [styles.btnGreen, pressed && styles.btnGreenPressed]} onPress={callNext}>
            <View style={styles.btnRow}>
              <Ionicons name="play-forward-outline" size={18} color="white" />
              <Text style={styles.btnText}>Appeler le prochain</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.btnDanger, pressed && styles.btnDangerPressed]} onPress={close}>
            <View style={styles.btnRow}>
              <Ionicons name="close-circle-outline" size={18} color="white" />
              <Text style={styles.btnText}>Fermer et vider la file</Text>
            </View>
          </Pressable>
        </Card>
      </Reveal>

      {!!err && (
        <Reveal delay={360}>
          <Text style={styles.err}>{err}</Text>
        </Reveal>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  h: { fontSize: 18, fontWeight: "900", marginBottom: 8, color: ui.colors.text },
  pillRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  muted: { color: ui.colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18, fontWeight: "600" },
  err: { color: ui.colors.danger, marginTop: 8, fontWeight: "700" },
  section: {
    marginTop: 10,
    padding: 10,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
  },
  sectionTitle: { color: ui.colors.text, fontWeight: "900", marginBottom: 4 },
  rowStrong: { color: ui.colors.text, fontWeight: "800" },
  rowMuted: { color: ui.colors.textMuted, fontWeight: "700", marginTop: 2 },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  item: { color: ui.colors.textMuted, fontWeight: "700" },
  next: { fontWeight: "900", color: ui.colors.primaryDeep },
  row: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  input: {
    backgroundColor: ui.colors.bgSoft,
    borderRadius: ui.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    marginTop: 12,
    color: ui.colors.text,
    fontWeight: "700",
  },
  btnGreen: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.pill,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
    ...ui.shadow.soft,
  },
  btnGreenPressed: { backgroundColor: ui.colors.primaryPressed },
  btnAlt: { backgroundColor: ui.colors.primaryDeep, borderRadius: ui.radius.pill, padding: 14, alignItems: "center" },
  btnAltPressed: { opacity: 0.85 },
  btnDark: { backgroundColor: ui.colors.darkButton, borderRadius: ui.radius.pill, padding: 14, alignItems: "center" },
  btnDarkPressed: { opacity: 0.85 },
  btnDanger: { backgroundColor: ui.colors.danger, borderRadius: ui.radius.pill, padding: 14, alignItems: "center", marginTop: 10 },
  btnDangerPressed: { opacity: 0.85 },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: "white", fontWeight: "900", letterSpacing: 0.2 },
});
