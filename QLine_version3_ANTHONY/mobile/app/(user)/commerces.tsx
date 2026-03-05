import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useCommerces } from "../../features/commerces/commerces.store";
import { useUserQueue } from "../../features/queue/userQueue.store";
import { Card } from "../../components/Card";
import { AppHeader } from "../../components/AppHeader";
import { useAuth } from "../../features/auth/AuthProvider";
import { ui } from "../../theme/ui";

export default function CommercesPage() {
  const { commerces, loading } = useCommerces();
  const q = useUserQueue();
  const { logout } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader subtitle="Choisir un commerce" />

      <Card>
        <Text style={styles.h}>Ou veux-tu prendre ton ticket ?</Text>
        <Text style={styles.muted}>Selectionne un commerce puis confirme ton ticket virtuel.</Text>

        {loading && <Text style={styles.muted}>Chargement...</Text>}

        <View style={styles.rowWrap}>
          {commerces.map((c) => (
            <Pressable key={c.id} style={[styles.pill, q.commerceId === c.id && styles.pillActive]} onPress={() => q.setCommerceId(c.id)}>
              <Text style={[styles.pillText, q.commerceId === c.id && styles.pillTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={() => q.join()}>
          <Text style={styles.btnText}>Prendre un ticket</Text>
        </Pressable>

        {q.ticketId && (
          <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={() => router.push("/(user)/tickets")}>
            <Text style={styles.btnText}>Voir mes tickets</Text>
          </Pressable>
        )}

        <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.push("/(user)/scan")}>
          <Text style={styles.btnAltText}>Scanner un QR</Text>
        </Pressable>

        {q.error && <Text style={styles.err}>{q.error}</Text>}
      </Card>

      <Pressable
        style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
        onPress={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        <Text style={styles.logoutText}>Retour au menu login</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.colors.bg },
  content: { padding: 16, paddingBottom: 110 },
  h: { fontSize: 20, fontWeight: "900", marginBottom: 6, color: ui.colors.text },
  muted: { color: ui.colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18, fontWeight: "600" },
  err: { color: ui.colors.danger, marginTop: 10, fontWeight: "700" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  pillActive: { borderColor: ui.colors.primary, backgroundColor: ui.colors.primarySoft },
  pillText: { fontSize: 12, color: ui.colors.textMuted, fontWeight: "700" },
  pillTextActive: { color: ui.colors.primaryDeep, fontWeight: "900" },
  btn: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.pill,
    padding: 14,
    alignItems: "center",
    marginTop: 14,
    ...ui.shadow.soft,
  },
  btnPressed: { backgroundColor: ui.colors.primaryPressed },
  btnText: { color: "white", fontWeight: "900", letterSpacing: 0.2 },
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
  logout: {
    marginTop: 10,
    padding: 14,
    borderRadius: ui.radius.md,
    backgroundColor: ui.colors.darkButton,
    alignItems: "center",
    ...ui.shadow.soft,
  },
  logoutPressed: { opacity: 0.85 },
  logoutText: { color: "white", fontWeight: "800" },
});
