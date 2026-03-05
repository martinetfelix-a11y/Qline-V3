import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { router } from "expo-router";
import { useUserQueue } from "../../features/queue/userQueue.store";
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
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
    router.replace("/(user)/home");
  };

  if (hasPermission === null) {
    return (
      <View style={styles.containerCenter}>
        <Text style={styles.stateText}>Demande permission camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.containerCenter}>
        <Text style={styles.stateText}>Acces camera refuse.</Text>
        <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.back()}>
          <Text style={styles.btnAltText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Scanner un QR</Text>
        <Text style={styles.muted}>Scanne un code qui contient commerceId (ex: c1).</Text>
      </View>

      <View style={styles.scannerShell}>
        <View style={styles.scanner}>
          <BarCodeScanner onBarCodeScanned={scanned ? undefined : onScan} style={{ flex: 1 }} />
        </View>
      </View>

      {!!msg && <Text style={styles.msg}>{msg}</Text>}

      {scanned && (
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={() => {
            setScanned(false);
            setMsg("");
          }}
        >
          <Text style={styles.btnText}>Scanner encore</Text>
        </Pressable>
      )}

      <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.back()}>
        <Text style={styles.btnAltText}>Retour</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: ui.colors.bg },
  containerCenter: {
    flex: 1,
    padding: 16,
    backgroundColor: ui.colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
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
