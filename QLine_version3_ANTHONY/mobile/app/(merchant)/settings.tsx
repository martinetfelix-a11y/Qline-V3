import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { getQueueState, merchantOpen, merchantClose, merchantPause, merchantSetAvg } from "../../features/queue/queue.api";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { CommerceQrCard } from "../../components/CommerceQrCard";
import { Reveal } from "../../components/Reveal";
import { ScreenShell } from "../../components/ScreenShell";
import { ShimmerLine } from "../../components/ShimmerLine";
import { StatusPill } from "../../components/StatusPill";
import { ui } from "../../theme/ui";

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
    setMsg("File fermee (et videe).");
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
    setMsg("Moyenne mise a jour.");
  };

  return (
    <ScreenShell contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppHeader subtitle={`Parametres - ${commerceId}`} />

      <Reveal delay={90}>
        <Card>
          <Text style={styles.h}>Compte</Text>
          <Text style={styles.line}>Email: {auth?.email ?? "-"}</Text>
          <Text style={styles.line}>Role: {auth?.role ?? "-"}</Text>
          <Text style={styles.line}>CommerceId: {auth?.commerceId ?? "-"}</Text>

          <Pressable style={({ pressed }) => [styles.btnDark, pressed && styles.btnDarkPressed]} onPress={() => router.back()}>
            <View style={styles.btnRow}>
              <Ionicons name="arrow-back-outline" size={18} color="white" />
              <Text style={styles.btnText}>Retour dashboard</Text>
            </View>
          </Pressable>
        </Card>
      </Reveal>

      <Reveal delay={170}>
        <Card>
          <Text style={styles.h}>Etat de la file</Text>
          <View style={styles.pillRow}>
            <StatusPill label={state?.open ? "Ouverte" : "Fermee"} tone={state?.open ? "success" : "danger"} />
            <StatusPill label={state?.paused ? "En pause" : "Active"} tone={state?.paused ? "warning" : "success"} />
          </View>

          {!state && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <ShimmerLine width="65%" />
              <ShimmerLine width="70%" />
            </View>
          )}

          <View style={styles.row}>
            <Pressable style={({ pressed }) => [styles.btnGreen, pressed && styles.btnGreenPressed]} onPress={doOpen}>
              <View style={styles.btnRow}>
                <Ionicons name="lock-open-outline" size={18} color="white" />
                <Text style={styles.btnText}>Ouvrir</Text>
              </View>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={doTogglePause}>
              <View style={styles.btnRow}>
                <Ionicons name={state?.paused ? "play-circle-outline" : "pause-circle-outline"} size={18} color="white" />
                <Text style={styles.btnText}>{state?.paused ? "Reprendre" : "Pause"}</Text>
              </View>
            </Pressable>
          </View>

          <Text style={styles.muted}>La pause bloque les nouveaux tickets sans vider la file.</Text>
        </Card>
      </Reveal>

      <Reveal delay={250}>
        <Card>
          <Text style={styles.h}>Modele ETA (IA)</Text>
          <Text style={styles.muted}>Definis une moyenne initiale (en minutes). Le modele s ajuste ensuite avec les durees reelles.</Text>
          <TextInput
            style={styles.input}
            value={avgMin}
            onChangeText={setAvgMin}
            keyboardType="numeric"
            placeholder="avg minutes"
            placeholderTextColor={ui.colors.textMuted}
          />
          <Pressable style={({ pressed }) => [styles.btnDark, pressed && styles.btnDarkPressed]} onPress={doSetAvg}>
            <View style={styles.btnRow}>
              <Ionicons name="refresh-outline" size={18} color="white" />
              <Text style={styles.btnText}>Mettre a jour</Text>
            </View>
          </Pressable>
        </Card>
      </Reveal>

      <Reveal delay={290}>
        <CommerceQrCard commerceId={commerceId} />
      </Reveal>

      <Reveal delay={330}>
        <Card>
          <Text style={styles.h}>Danger zone</Text>
          <Text style={styles.muted}>Fermer la file supprime les rendez-vous en attente.</Text>
          <Pressable style={({ pressed }) => [styles.btnDanger, pressed && styles.btnDangerPressed]} onPress={doClose}>
            <View style={styles.btnRow}>
              <Ionicons name="close-circle-outline" size={18} color="white" />
              <Text style={styles.btnText}>Fermer et vider la file</Text>
            </View>
          </Pressable>
        </Card>
      </Reveal>

      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <Reveal delay={400}>
        <Pressable style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]} onPress={doLogout}>
          <View style={styles.btnRow}>
            <Ionicons name="log-out-outline" size={18} color="white" />
            <Text style={styles.btnText}>Retour au login</Text>
          </View>
        </Pressable>
      </Reveal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  h: { fontSize: 18, fontWeight: "900", marginBottom: 8, color: ui.colors.text },
  line: { color: ui.colors.text, fontWeight: "700", marginBottom: 2 },
  pillRow: { flexDirection: "row", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  muted: { color: ui.colors.textMuted, fontSize: 13, marginTop: 8, lineHeight: 18, fontWeight: "600" },
  msg: {
    marginTop: 2,
    marginBottom: 8,
    fontWeight: "800",
    color: ui.colors.primaryDeep,
    backgroundColor: ui.colors.primarySoft,
    borderWidth: 1,
    borderColor: ui.colors.borderStrong,
    borderRadius: ui.radius.md,
    padding: 12,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
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
  btnGreen: { backgroundColor: ui.colors.primary, borderRadius: ui.radius.pill, padding: 12, alignItems: "center", ...ui.shadow.soft },
  btnGreenPressed: { backgroundColor: ui.colors.primaryPressed },
  btnAlt: { backgroundColor: ui.colors.primaryDeep, borderRadius: ui.radius.pill, padding: 12, alignItems: "center" },
  btnAltPressed: { opacity: 0.85 },
  btnDanger: { backgroundColor: ui.colors.danger, borderRadius: ui.radius.pill, padding: 12, alignItems: "center" },
  btnDangerPressed: { opacity: 0.85 },
  btnDark: { backgroundColor: ui.colors.darkButton, borderRadius: ui.radius.pill, padding: 14, alignItems: "center", marginTop: 10 },
  btnDarkPressed: { opacity: 0.85 },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: "white", fontWeight: "900", letterSpacing: 0.2 },
  logout: { marginTop: 8, backgroundColor: ui.colors.darkButton, borderRadius: ui.radius.pill, padding: 14, alignItems: "center" },
  logoutPressed: { opacity: 0.85 },
});
