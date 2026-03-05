import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiSignup } from "../features/auth/auth.api";
import { fetchPublicCommerces } from "../features/commerces/commerces.api";
import { useAuth } from "../features/auth/AuthProvider";
import { AppHeader } from "../components/AppHeader";
import { ScreenShell } from "../components/ScreenShell";
import { ui } from "../theme/ui";

type Role = "user" | "merchant";

export default function SignupScreen() {
  const { setAuth } = useAuth();

  const [role, setRole] = useState<Role>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [commerceId, setCommerceId] = useState("c1");
  const [commerces, setCommerces] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPublicCommerces()
      .then((d) => setCommerces(d.commerces || []))
      .catch(() => setCommerces([]));
  }, []);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiSignup({
        email: email.trim(),
        password,
        role,
        ...(role === "merchant" ? { commerceId } : {}),
      });
      await setAuth({ token: data.token, role: data.role, email: data.email, commerceId: data.commerceId });
      router.replace("/");
    } catch (e: any) {
      const code = e?.code || e?.message;
      if (code === "email_taken") setError("Email deja utilise.");
      else if (code === "invalid_commerceId") setError("Commerce invalide.");
      else setError("Inscription impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppHeader subtitle="Creer un compte" />

      <View style={styles.panel}>
        <View style={styles.toggleRow}>
          <Pressable style={[styles.toggle, role === "user" && styles.toggleActive]} onPress={() => setRole("user")}>
            <Text style={[styles.toggleText, role === "user" && styles.toggleTextActive]}>Utilisateur</Text>
          </Pressable>
          <Pressable style={[styles.toggle, role === "merchant" && styles.toggleActive]} onPress={() => setRole("merchant")}>
            <Text style={[styles.toggleText, role === "merchant" && styles.toggleTextActive]}>Commercant</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={ui.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe (min 6)"
            placeholderTextColor={ui.colors.textMuted}
            secureTextEntry={!showPassword}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={ui.colors.textMuted} />
          </Pressable>
        </View>

        {role === "merchant" && (
          <View style={styles.box}>
            <Text style={styles.h}>Commerce lie</Text>
            <Text style={styles.muted}>Choisis le commerce auquel le compte commercant appartient.</Text>
            <View style={styles.rowWrap}>
              {commerces.map((c) => (
                <Pressable key={c.id} style={[styles.pill, commerceId === c.id && styles.pillActive]} onPress={() => setCommerceId(c.id)}>
                  <Text style={[styles.pillText, commerceId === c.id && styles.pillTextActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {error && <Text style={styles.err}>{error}</Text>}

        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={submit} disabled={loading}>
          <View style={styles.btnRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color="white" />
            <Text style={styles.btnText}>{loading ? "..." : "Creer le compte"}</Text>
          </View>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.replace("/login")}>
          <View style={styles.btnRow}>
            <Ionicons name="arrow-back-outline" size={18} color={ui.colors.primaryDeep} />
            <Text style={styles.btnAltText}>Retour login</Text>
          </View>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  panel: {
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.xl,
    borderWidth: 1,
    borderColor: ui.colors.border,
    padding: ui.spacing.lg,
    ...ui.shadow.card,
  },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  toggle: {
    flex: 1,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.pill,
    padding: 12,
    alignItems: "center",
  },
  toggleActive: { borderColor: ui.colors.primary, backgroundColor: ui.colors.primarySoft },
  toggleText: { fontWeight: "800", color: ui.colors.textMuted },
  toggleTextActive: { color: ui.colors.primaryDeep },
  input: {
    backgroundColor: ui.colors.bgSoft,
    borderRadius: ui.radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    marginBottom: 10,
    color: ui.colors.text,
    fontWeight: "600",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ui.colors.bgSoft,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  eyeButton: { paddingHorizontal: 12, paddingVertical: 12 },
  box: {
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: ui.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    marginTop: 6,
    marginBottom: 10,
  },
  h: { fontSize: 14, fontWeight: "800", marginBottom: 6, color: ui.colors.text },
  muted: { color: ui.colors.textMuted, fontSize: 12, marginBottom: 10, lineHeight: 18 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.colors.surface,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  pillActive: { borderColor: ui.colors.primary, backgroundColor: ui.colors.primarySoft },
  pillText: { fontSize: 12, color: ui.colors.textMuted, fontWeight: "600" },
  pillTextActive: { color: ui.colors.primaryDeep, fontWeight: "800" },
  btn: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.pill,
    padding: 15,
    alignItems: "center",
    marginTop: 8,
    ...ui.shadow.soft,
  },
  btnPressed: { backgroundColor: ui.colors.primaryPressed },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: "white", fontWeight: "900", letterSpacing: 0.2 },
  btnAlt: {
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: ui.radius.pill,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: ui.colors.borderStrong,
  },
  btnAltPressed: { backgroundColor: ui.colors.primarySoft },
  btnAltText: { color: ui.colors.primaryDeep, fontWeight: "900", letterSpacing: 0.2 },
  err: { color: ui.colors.danger, marginBottom: 8, fontWeight: "700" },
});
