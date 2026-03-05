import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { getQueueState, merchantOpen, merchantClose, merchantPause, merchantSetAvg } from "../../features/queue/queue.api";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";

export default function MerchantSettings() {
  const { auth, logout } = useAuth();
  const token = auth?.token;
  const commerceId = auth?.commerceId || "c1";

  const [state, setState] = useState<{ open: boolean; paused: boolean } | null>(null);
  const [avgMin, setAvgMin] = useState("10");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    if (!token) return;
    const data = await getQueueState(token, commerceId);
    setState(data.state ?? null);
    if (typeof data?.eta?.avgServiceSec === "number") {
      setAvgMin(String(Math.round(data.eta.avgServiceSec / 60)));
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, [token, commerceId]);

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const doOpen = async () => {
    if (!token) return;
    setMsg(null);
    await merchantOpen(token, commerceId);
    await refresh();
    setMsg("File ouverte.");
  };

  const doClose = async () => {
    if (!token) return;
    setMsg(null);
    await merchantClose(token, commerceId);
    await refresh();
    setMsg("File fermée (et vidée).");
  };

  const doTogglePause = async () => {
    if (!token) return;
    setMsg(null);
    await merchantPause(token, commerceId, !(state?.paused ?? false));
    await refresh();
    setMsg(state?.paused ? "File reprise." : "File en pause.");
  };

  const doSetAvg = async () => {
    if (!token) return;
    setMsg(null);
    const n = Number(avgMin);
    if (!Number.isFinite(n) || n <= 0) {
      setMsg("Avg invalide.");
      return;
    }
    await merchantSetAvg(token, commerceId, n);
    await refresh();
    setMsg("Moyenne mise à jour.");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppHeader subtitle={`Paramètres — ${commerceId}`} />

      <Card>
        <Text style={styles.h}>Compte</Text>
        <Text>Email: {auth?.email ?? "-"}</Text>
        <Text>Rôle: {auth?.role ?? "-"}</Text>
        <Text>CommerceId: {auth?.commerceId ?? "-"}</Text>

        <Pressable style={styles.btnDark} onPress={() => router.back()}>
          <Text style={styles.btnText}>← Dashboard</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.h}>État de la file</Text>
        <Text>Ouverte: {state ? (state.open ? "Oui" : "Non") : "-"}</Text>
        <Text>En pause: {state ? (state.paused ? "Oui" : "Non") : "-"}</Text>

        <View style={styles.row}>
          <Pressable style={styles.btnGreen} onPress={doOpen}>
            <Text style={styles.btnText}>Ouvrir</Text>
          </Pressable>
          <Pressable style={styles.btnAlt} onPress={doTogglePause}>
            <Text style={styles.btnText}>{state?.paused ? "Reprendre" : "Pause"}</Text>
          </Pressable>
          <Pressable style={styles.btnDanger} onPress={doClose}>
            <Text style={styles.btnText}>Fermer</Text>
          </Pressable>
        </View>

        <Text style={styles.muted}>La pause bloque les nouveaux tickets sans vider la file.</Text>
      </Card>

      <Card>
        <Text style={styles.h}>Modèle ETA (IA)</Text>
        <Text style={styles.muted}>Définis une moyenne initiale (en minutes). Le modèle s’ajuste ensuite avec les durées réelles.</Text>
        <TextInput style={styles.input} value={avgMin} onChangeText={setAvgMin} keyboardType="numeric" placeholder="avg minutes" />
        <Pressable style={styles.btnDark} onPress={doSetAvg}>
          <Text style={styles.btnText}>Mettre à jour</Text>
        </Pressable>
      </Card>

      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <Pressable style={styles.logout} onPress={doLogout}>
        <Text style={styles.btnText}>Retour au login</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  content: { padding: 16, paddingBottom: 24 },
  h: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  muted: { color: "#6b7280", fontSize: 12, marginTop: 6 },
  msg: { marginTop: 10, fontWeight: "800", color: "#111827" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  input: { backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", marginTop: 10 },
  btnGreen: { backgroundColor: "#22c55e", borderRadius: 999, padding: 12, alignItems: "center" },
  btnAlt: { backgroundColor: "#111827", borderRadius: 999, padding: 12, alignItems: "center" },
  btnDanger: { backgroundColor: "#ef4444", borderRadius: 999, padding: 12, alignItems: "center" },
  btnDark: { backgroundColor: "#374151", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 10 },
  btnText: { color: "white", fontWeight: "800" },
  logout: { marginTop: 16, backgroundColor: "#ef4444", borderRadius: 999, padding: 14, alignItems: "center" },
});
