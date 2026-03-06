import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUserQueue } from "../../features/queue/userQueue.store";
import { Reveal } from "../../components/Reveal";
import { ScreenShell } from "../../components/ScreenShell";
import { StatusPill } from "../../components/StatusPill";
import { ui } from "../../theme/ui";

function extractCommerceId(data: string): string | null {
  const trimmed = data.trim();
  if (/^c\d+$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const cid = url.searchParams.get("commerceId");
    if (cid && /^c\d+$/.test(cid)) return cid;
  } catch {}
  return null;
}

export default function ScanScreen() {
  const q = useUserQueue();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    requestPermission();
  }, []);

  const onScan = async ({ data }: { data: string }) => {
    setScanned(true);
    const cid = extractCommerceId(data);
    if (!cid) {
      setMsg("QR invalide. Ex: c1 ou qline://join?commerceId=c1");
      return;
    }
    setMsg(`Commerce detecte: ${cid}. Rejoindre...`);
    await q.join(cid);
    router.replace("/(user)/tickets");
  };

  if (!permission) {
    return (
      <ScreenShell scroll={false} contentContainerStyle={styles.centerContent}>
        <Text style={styles.stateText}>Demande permission camera...</Text>
      </ScreenShell>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenShell scroll={false} contentContainerStyle={styles.centerContent}>
        <Text style={styles.stateText}>Acces camera refuse.</Text>
        <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.back()}>
          <View style={styles.rowBtn}>
            <Ionicons name="arrow-back-outline" size={18} color={ui.colors.primaryDeep} />
            <Text style={styles.btnAltText}>Retour</Text>
          </View>
        </Pressable>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll={false} contentContainerStyle={styles.content}>
      <Reveal delay={70}>
        <View style={styles.badgeRow}>
          <StatusPill label={scanned ? "Scan termine" : "Scan en cours"} tone={scanned ? "warning" : "success"} />
          <StatusPill label="QR commerce" tone="neutral" />
        </View>
      </Reveal>

      <Reveal delay={130}>
        <View style={styles.hero}>
          <Text style={styles.title}>Scanner un QR</Text>
          <Text style={styles.muted}>Scanne un code qui contient commerceId (ex: c1).</Text>
        </View>
      </Reveal>

      <Reveal delay={190}>
        <View style={styles.scannerShell}>
          <View style={styles.scanner}>
            <CameraView
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : onScan}
              style={{ flex: 1 }}
            />
            <View pointerEvents="none" style={[styles.corner, styles.cornerTL]} />
            <View pointerEvents="none" style={[styles.corner, styles.cornerTR]} />
            <View pointerEvents="none" style={[styles.corner, styles.cornerBL]} />
            <View pointerEvents="none" style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
      </Reveal>

      {!!msg && <Text style={styles.msg}>{msg}</Text>}

      {scanned && (
        <Reveal delay={240}>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={() => {
              setScanned(false);
              setMsg("");
            }}
          >
            <View style={styles.rowBtn}>
              <Ionicons name="scan-outline" size={18} color="white" />
              <Text style={styles.btnText}>Scanner encore</Text>
            </View>
          </Pressable>
        </Reveal>
      )}

      <Reveal delay={260}>
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
  content: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  hero: {
    marginBottom: 10,
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.colors.border,
    padding: ui.spacing.md,
    ...ui.shadow.soft,
  },
  stateText: { color: ui.colors.text, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 6, color: ui.colors.text },
  muted: { color: ui.colors.textMuted, lineHeight: 18, fontWeight: "600" },
  scannerShell: {
    borderRadius: ui.radius.xl,
    padding: 8,
    backgroundColor: ui.colors.surface,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadow.card,
  },
  scanner: {
    height: 360,
    borderRadius: ui.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: "black",
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: "rgba(255,255,255,0.95)",
    borderWidth: 3,
  },
  cornerTL: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  msg: { marginTop: 12, color: ui.colors.text, fontWeight: "700" },
  btn: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.pill,
    padding: 14,
    alignItems: "center",
    marginTop: 14,
    ...ui.shadow.soft,
  },
  btnPressed: { backgroundColor: ui.colors.primaryPressed },
  rowBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: "white", fontWeight: "900" },
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
});
