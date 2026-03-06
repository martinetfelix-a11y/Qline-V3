import { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "../../features/auth/AuthProvider";
import { AppHeader } from "../../components/AppHeader";
import { Reveal } from "../../components/Reveal";
import { ScreenShell } from "../../components/ScreenShell";
import { StatusPill } from "../../components/StatusPill";
import { ui } from "../../theme/ui";

export default function MerchantQrScreen() {
  const { auth } = useAuth();
  const commerceId = auth?.commerceId || "";
  const qrPayload = `qline://join?commerceId=${commerceId}`;
  const qrRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);
  const qrSize = useMemo(() => Math.min(Dimensions.get("window").width - 96, 320), []);

  const onShareQr = async () => {
    if (!commerceId || sharing) return;
    if (!qrRef.current || typeof qrRef.current.toDataURL !== "function") {
      Alert.alert("Erreur", "Impossible de generer le QR pour le moment.");
      return;
    }

    setSharing(true);
    try {
      const base64Png = await new Promise<string>((resolve) => {
        qrRef.current.toDataURL((data: string) => resolve(data));
      });

      if (Platform.OS === "web") {
        const filename = `qline-${commerceId}-qr.png`;
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${base64Png}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}qline-${commerceId}-qr.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64Png, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Partage indisponible", "Le partage n'est pas disponible sur cet appareil.");
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Download / Share QR",
      });
    } catch {
      Alert.alert("Erreur", "Impossible d'exporter ce QR code.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <AppHeader subtitle="QR d'inscription" />

      <Reveal delay={70}>
        <View style={styles.badgeRow}>
          <StatusPill label={`Commerce ${commerceId || "-"}`} tone="success" />
          <StatusPill label="QR unique" tone="neutral" />
        </View>
      </Reveal>

      <Reveal delay={120}>
        <View style={styles.card}>
          <Text style={styles.title}>Code QR de la file</Text>
          <Text style={styles.muted}>Quand un client le scanne, l'app lui propose de rejoindre automatiquement votre file.</Text>

          <View style={styles.qrWrap}>
            {commerceId ? <QRCode value={qrPayload} size={qrSize} getRef={(c) => (qrRef.current = c)} /> : <Text style={styles.err}>Commerce introuvable pour ce compte.</Text>}
          </View>

          <Text style={styles.payloadLabel}>Contenu QR</Text>
          <Text style={styles.payloadValue}>{commerceId ? qrPayload : "-"}</Text>

          <Pressable
            disabled={!commerceId || sharing}
            style={({ pressed }) => [styles.btn, (!commerceId || sharing) && styles.btnDisabled, pressed && !sharing && styles.btnPressed]}
            onPress={onShareQr}
          >
            <View style={styles.rowBtn}>
              <Ionicons name="download-outline" size={18} color="white" />
              <Text style={styles.btnText}>{sharing ? "Preparation..." : "Download / Share QR"}</Text>
            </View>
          </Pressable>
        </View>
      </Reveal>

      <Reveal delay={170}>
        <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.back()}>
          <View style={styles.rowBtn}>
            <Ionicons name="arrow-back-outline" size={18} color={ui.colors.primaryDeep} />
            <Text style={styles.btnAltText}>Retour</Text>
          </View>
        </Pressable>
      </Reveal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  card: {
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.colors.border,
    padding: 16,
    ...ui.shadow.card,
  },
  title: { fontSize: 22, fontWeight: "900", marginBottom: 8, color: ui.colors.text },
  muted: { color: ui.colors.textMuted, lineHeight: 19, fontWeight: "600" },
  qrWrap: {
    marginTop: 16,
    marginBottom: 12,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: "white",
    padding: 16,
    alignItems: "center",
  },
  payloadLabel: { color: ui.colors.textMuted, fontWeight: "800", marginBottom: 6 },
  payloadValue: { color: ui.colors.text, fontWeight: "700" },
  err: { color: ui.colors.danger, fontWeight: "700" },
  btn: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.pill,
    padding: 14,
    alignItems: "center",
    marginTop: 14,
    ...ui.shadow.soft,
  },
  btnPressed: { backgroundColor: ui.colors.primaryPressed },
  btnDisabled: { backgroundColor: ui.colors.textMuted },
  btnText: { color: "white", fontWeight: "900" },
  btnAlt: {
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.pill,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: ui.colors.borderStrong,
  },
  btnAltPressed: { backgroundColor: ui.colors.primarySoft },
  rowBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnAltText: { color: ui.colors.primaryDeep, fontWeight: "900" },
});
