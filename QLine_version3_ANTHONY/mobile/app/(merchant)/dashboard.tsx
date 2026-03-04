import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../features/auth/AuthProvider";
import { AppHeader } from "../../components/AppHeader";

export default function MerchantDashboard() {
  const { auth, logout } = useAuth();

  return (
    <View style={styles.container}>
      <AppHeader subtitle={`Commerce : ${auth?.commerceId ?? "-"}`} />

      <Text style={styles.menuTitle}>Menu commerçant</Text>

      <Pressable style={styles.card} onPress={() => router.push("/(merchant)/queue")}>
        <Text style={styles.cardText}>📋 Gestion de la file</Text>
        <Text style={styles.cardSub}>Appeler le prochain, enregistrer la durée, fermer/ouvir la file</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push("/(merchant)/stats")}>
        <Text style={styles.cardText}>📊 Statistiques</Text>
        <Text style={styles.cardSub}>KPI, heures de pointe, distribution des durées</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push("/(merchant)/settings")}>
        <Text style={styles.cardText}>⚙ Paramètres</Text>
        <Text style={styles.cardSub}>Pause/ouverture, moyenne initiale, infos du compte</Text>
      </Pressable>

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        <Text style={styles.logoutText}>Retour au menu login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },
  menuTitle: { fontSize: 18, fontWeight: "800", marginBottom: 14 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardText: { fontSize: 16, fontWeight: "800", marginBottom: 4, color: "#111827" },
  cardSub: { fontSize: 12, color: "#6b7280" },
  logout: { marginTop: 18, backgroundColor: "#ef4444", borderRadius: 999, padding: 14, alignItems: "center" },
  logoutText: { color: "white", fontWeight: "800" },
});
