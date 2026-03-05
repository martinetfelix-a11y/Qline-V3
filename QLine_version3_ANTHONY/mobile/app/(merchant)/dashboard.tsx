import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { AppHeader } from "../../components/AppHeader";
import { ScreenShell } from "../../components/ScreenShell";
import { ui } from "../../theme/ui";

export default function MerchantDashboard() {
  const { auth, logout } = useAuth();

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <AppHeader subtitle={`Commerce : ${auth?.commerceId ?? "-"}`} />

      <Text style={styles.menuTitle}>Espace commercant</Text>

      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.push("/(merchant)/queue")}>
        <View style={styles.iconWrap}>
          <Ionicons name="list-circle-outline" size={20} color={ui.colors.primaryDeep} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.cardText}>Gestion de la file</Text>
          <Text style={styles.cardSub}>Appeler le prochain, enregistrer la duree, fermer ou ouvrir la file.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={ui.colors.textMuted} style={styles.chevron} />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.push("/(merchant)/stats")}>
        <View style={styles.iconWrap}>
          <Ionicons name="bar-chart-outline" size={20} color={ui.colors.primaryDeep} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.cardText}>Statistiques</Text>
          <Text style={styles.cardSub}>KPI, heures de pointe et distribution des durees.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={ui.colors.textMuted} style={styles.chevron} />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.push("/(merchant)/settings")}>
        <View style={styles.iconWrap}>
          <Ionicons name="settings-outline" size={20} color={ui.colors.primaryDeep} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.cardText}>Parametres</Text>
          <Text style={styles.cardSub}>Pause, ouverture, moyenne initiale et informations de compte.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={ui.colors.textMuted} style={styles.chevron} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
        onPress={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        <Text style={styles.logoutText}>Retour au menu login</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  menuTitle: { fontSize: 22, fontWeight: "900", marginBottom: 14, color: ui.colors.text },
  card: {
    flexDirection: "row",
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadow.card,
  },
  cardPressed: { backgroundColor: ui.colors.primarySoft },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: ui.radius.md,
    backgroundColor: ui.colors.primarySoft,
    borderWidth: 1,
    borderColor: ui.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  copy: { flex: 1 },
  chevron: { alignSelf: "center" },
  cardText: { fontSize: 17, fontWeight: "900", marginBottom: 4, color: ui.colors.text },
  cardSub: { fontSize: 13, color: ui.colors.textMuted, lineHeight: 19, fontWeight: "600" },
  logout: {
    marginTop: 10,
    backgroundColor: ui.colors.darkButton,
    borderRadius: ui.radius.pill,
    padding: 14,
    alignItems: "center",
  },
  logoutPressed: { opacity: 0.85 },
  logoutText: { color: "white", fontWeight: "800" },
});
