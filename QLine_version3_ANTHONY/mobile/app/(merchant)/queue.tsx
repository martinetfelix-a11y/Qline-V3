import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { getQueueState, merchantNext, merchantClose, merchantOpen, merchantPause } from "../../features/queue/queue.api";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { ScreenShell } from "../../components/ScreenShell";
import { ui } from "../../theme/ui";

export default function MerchantQueue() {
  const { auth } = useAuth();
  const token = auth?.token;
  const commerceId = auth?.commerceId || "c1";

  const [queue, setQueue] = useState<any[]>([]);
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
      setAvgServiceSec(data.eta?.avgServiceSec ?? null);
      setServerTime(data.serverTime ?? null);
      setState(data.state ?? null);
      setErr(null);
    } catch {
      setErr("Erreur refresh (API)");
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
      setErr("Next refuse (verifie login merchant).");
    }
  };

  const close = async () => {
    if (!token) return;
    try {
      await merchantClose(token, commerceId);
      await refresh();
    } catch {
      setErr("Close refuse.");
    }
  };

  const open = async () => {
    if (!token) return;
    try {
      await merchantOpen(token, commerceId);
      await refresh();
    } catch {
      setErr("Open refuse.");
    }
  };

  const togglePause = async () => {
    if (!token) return;
    try {
      await merchantPause(token, commerceId, !(state?.paused ?? false));
      await refresh();
    } catch {
      setErr("Pause/Resume refuse.");
    }
  };

  const fmt = (sec: number) => `${Math.round(sec / 60)} min`;

  return (
    <ScreenShell contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppHeader subtitle={`Gestion de file - ${commerceId}`} />

      <Card>
        <Text style={styles.h}>Etat</Text>
        <Text style={styles.line}>Ouverte: {state ? (state.open ? "Oui" : "Non") : "-"}</Text>
        <Text style={styles.line}>En pause: {state ? (state.paused ? "Oui" : "Non") : "-"}</Text>
        <Text style={styles.muted}>Heure serveur: {serverTime ?? "-"}</Text>
        <Text style={styles.muted}>En attente: {queue.length}</Text>
        <Text style={styles.muted}>Service moyen appris: {avgServiceSec ? fmt(avgServiceSec) : "-"}</Text>
        {err && <Text style={styles.err}>{err}</Text>}

        <View style={styles.row}>
          <Pressable style={({ pressed }) => [styles.btnDark, pressed && styles.btnDarkPressed]} onPress={() => router.back()}>
            <View style={styles.btnRow}>
              <Ionicons name="arrow-back-outline" size={18} color="white" />
              <Text style={styles.btnText}>Retour dashboard</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={togglePause}>
            <View style={styles.btnRow}>
              <Ionicons name={state?.paused ? "play-circle-outline" : "pause-circle-outline"} size={18} color="white" />
              <Text style={styles.btnText}>{state?.paused ? "Reprendre" : "Mettre en pause"}</Text>
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
      </Card>

      <Card>
        <Text style={styles.h}>File (top 12)</Text>
        {queue.slice(0, 12).map((it, idx) => (
          <Text key={it.id} style={idx === 0 ? styles.next : styles.item}>
            {idx + 1}. {it.id}
          </Text>
        ))}
        {!queue.length && <Text style={styles.muted}>Aucun client.</Text>}
      </Card>

      <Card>
        <Text style={styles.h}>Entrainer l ETA (AI)</Text>
        <Text style={styles.muted}>Entre la duree du service termine (secondes), puis appelle le prochain.</Text>
        <TextInput
          style={styles.input}
          value={durationSec}
          onChangeText={setDurationSec}
          keyboardType="numeric"
          placeholder="durationSec"
          placeholderTextColor={ui.colors.textMuted}
        />

        <Pressable style={({ pressed }) => [styles.btnGreen, pressed && styles.btnGreenPressed]} onPress={callNext}>
          <View style={styles.btnRow}>
            <Ionicons name="play-forward-outline" size={18} color="white" />
            <Text style={styles.btnText}>Appeler le prochain</Text>
          </View>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.btnDanger, pressed && styles.btnDangerPressed]} onPress={close}>
          <View style={styles.btnRow}>
            <Ionicons name="close-circle-outline" size={18} color="white" />
            <Text style={styles.btnText}>Fermer la file</Text>
          </View>
        </Pressable>
      </Card>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  h: { fontSize: 18, fontWeight: "900", marginBottom: 8, color: ui.colors.text },
  line: { color: ui.colors.text, fontWeight: "700", marginBottom: 2 },
  muted: { color: ui.colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18, fontWeight: "600" },
  err: { color: ui.colors.danger, marginTop: 8, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  item: { paddingVertical: 4, color: ui.colors.textMuted, fontWeight: "600" },
  next: { paddingVertical: 4, fontWeight: "900", color: ui.colors.primaryDeep },
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
