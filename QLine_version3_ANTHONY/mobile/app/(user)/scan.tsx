import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { router } from "expo-router";
import { useUserQueue } from "../../features/queue/userQueue.store";

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
    setMsg(`Commerce détecté: ${cid}. Rejoindre...`);
    await q.join(cid);
    router.replace("/(user)/home");
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Demande permission caméra...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>Accès caméra refusé.</Text>
        <Pressable style={styles.btnAlt} onPress={() => router.back()}>
          <Text style={styles.btnAltText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanner un QR</Text>
      <Text style={styles.muted}>Scanne un code qui contient commerceId (ex: c1).</Text>

      <View style={styles.scanner}>
        <BarCodeScanner onBarCodeScanned={scanned ? undefined : onScan} style={{ flex: 1 }} />
      </View>

      {!!msg && <Text style={styles.msg}>{msg}</Text>}

      {scanned && (
        <Pressable style={styles.btn} onPress={() => { setScanned(false); setMsg(""); }}>
          <Text style={styles.btnText}>Scanner encore</Text>
        </Pressable>
      )}

      <Pressable style={styles.btnAlt} onPress={() => router.back()}>
        <Text style={styles.btnAltText}>Retour</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  muted: { color: "#6b7280", marginBottom: 12 },
  scanner: { height: 360, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "black" },
  msg: { marginTop: 12, color: "#111827", fontWeight: "700" },
  btn: { backgroundColor: "#22c55e", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 12 },
  btnText: { color: "white", fontWeight: "800" },
  btnAlt: { backgroundColor: "#111827", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 10 },
  btnAltText: { color: "white", fontWeight: "800" }
});
