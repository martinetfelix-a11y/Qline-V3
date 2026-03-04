import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { getQueueState, merchantNext, merchantClose, merchantOpen, merchantPause } from "../../features/queue/queue.api";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";

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
      setErr("Next refusé (vérifie login merchant).");
    }
  };

  const close = async () => {
    if (!token) return;
    try {
      await merchantClose(token, commerceId);
      await refresh();
    } catch {
      setErr("Close refusé.");
    }
  };

  const open = async () => {
    if (!token) return;
    try {
      await merchantOpen(token, commerceId);
      await refresh();
    } catch {
      setErr("Open refusé.");
    }
  };

  const togglePause = async () => {
    if (!token) return;
    try {
      await merchantPause(token, commerceId, !(state?.paused ?? false));
      await refresh();
    } catch {
      setErr("Pause/Resume refusé.");
    }
  };

  const fmt = (sec: number) => `${Math.round(sec / 60)} min`;

  return (
    <View style={styles.container}>
      <AppHeader subtitle={`Gestion de file — ${commerceId}`} />

      <Card>
        <Text style={styles.h}>État</Text>
        <Text>Ouverte: {state ? (state.open ? "Oui" : "Non") : "-"}</Text>
        <Text>En pause: {state ? (state.paused ? "Oui" : "Non") : "-"}</Text>
        <Text style={styles.muted}>Heure serveur: {serverTime ?? "-"}</Text>
        <Text style={styles.muted}>En attente: {queue.length}</Text>
        <Text style={styles.muted}>Service moyen appris: {avgServiceSec ? fmt(avgServiceSec) : "-"}</Text>
        {err && <Text style={styles.err}>{err}</Text>}

        <View style={styles.row}>
          <Pressable style={styles.btnDark} onPress={() => router.back()}>
            <Text style={styles.btnText}>← Dashboard</Text>
          </Pressable>

          <Pressable style={styles.btnAlt} onPress={togglePause}>
            <Text style={styles.btnText}>{state?.paused ? "Reprendre" : "Mettre en pause"}</Text>
          </Pressable>
        </View>

        {!state?.open && (
          <Pressable style={styles.btnGreen} onPress={open}>
            <Text style={styles.btnText}>Ouvrir la file</Text>
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
        <Text style={styles.h}>Entraîner l’ETA (AI)</Text>
        <Text style={styles.muted}>Entre la durée du service terminé (secondes), puis appelle le prochain.</Text>
        <TextInput style={styles.input} value={durationSec} onChangeText={setDurationSec} keyboardType="numeric" placeholder="durationSec" />

        <Pressable style={styles.btnGreen} onPress={callNext}>
          <Text style={styles.btnText}>Appeler le prochain</Text>
        </Pressable>

        <Pressable style={styles.btnDanger} onPress={close}>
          <Text style={styles.btnText}>Fermer la file</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },
  h: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  muted: { color: "#6b7280", fontSize: 12, marginTop: 6 },
  err: { color: "#b91c1c", marginTop: 8 },
  row: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
  item: { paddingVertical: 4 },
  next: { paddingVertical: 4, fontWeight: "800", color: "#15803d" },
  input: { backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", marginTop: 10 },
  btnGreen: { backgroundColor: "#22c55e", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 10 },
  btnAlt: { backgroundColor: "#111827", borderRadius: 999, padding: 14, alignItems: "center" },
  btnDark: { backgroundColor: "#374151", borderRadius: 999, padding: 14, alignItems: "center" },
  btnDanger: { backgroundColor: "#ef4444", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 10 },
  btnText: { color: "white", fontWeight: "800" },
});
