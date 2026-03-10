import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { AppHeader } from "../../components/AppHeader";
import { CommerceQrCard } from "../../components/CommerceQrCard";
import { Reveal } from "../../components/Reveal";
import { ScreenShell } from "../../components/ScreenShell";
import { ui } from "../../theme/ui";

export default function MerchantQrPage() {
  const { auth } = useAuth();
  const commerceId = auth?.commerceId ?? "c1";

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <AppHeader subtitle={`QR client - ${commerceId}`} />

      <Reveal delay={90}>
        <View style={styles.hero}>
          <Text style={styles.title}>Partage du QR</Text>
          <Text style={styles.muted}>Affiche ce QR a l'accueil. Les clients le scannent puis confirment leur entree dans la file.</Text>
        </View>
      </Reveal>

      <Reveal delay={150}>
        <CommerceQrCard commerceId={commerceId} />
      </Reveal>

      <Reveal delay={220}>
        <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.back()}>
          <View style={styles.rowBtn}>
            <Ionicons name="arrow-back-outline" size={18} color={ui.colors.primaryDeep} />
            <Text style={styles.btnAltText}>Retour dashboard</Text>
          </View>
        </Pressable>
      </Reveal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  hero: {
    marginBottom: 10,
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.colors.border,
    padding: ui.spacing.md,
    ...ui.shadow.soft,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
    color: ui.colors.text,
    fontFamily: ui.typography.display,
  },
  muted: { color: ui.colors.textMuted, lineHeight: 18, fontWeight: "600" },
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
  rowBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnAltText: { color: ui.colors.primaryDeep, fontWeight: "900" },
});
