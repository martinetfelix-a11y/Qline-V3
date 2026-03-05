import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiLogin } from "../features/auth/auth.api";
import { useAuth } from "../features/auth/AuthProvider";
import { AppHeader } from "../components/AppHeader";
import { ScreenShell } from "../components/ScreenShell";
import { ui } from "../theme/ui";

export default function LoginScreen() {
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("user@qline.dev");
  const [password, setPassword] = useState("user1234");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiLogin(email.trim(), password);
      await setAuth({ token: data.token, role: data.role, email: data.email, commerceId: data.commerceId });
      router.replace("/");
    } catch {
      setError("Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppHeader subtitle="Connexion" />

      <View style={styles.panel}>
        <Text style={styles.sub}>Connecte-toi pour acceder a ton espace client ou commerant.</Text>

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
            placeholder="Mot de passe"
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

        {error && <Text style={styles.err}>{error}</Text>}

        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={submit} disabled={loading}>
          <View style={styles.btnRow}>
            <Ionicons name="log-in-outline" size={18} color="white" />
            <Text style={styles.btnText}>{loading ? "..." : "Se connecter"}</Text>
          </View>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.btnAlt, pressed && styles.btnAltPressed]} onPress={() => router.push("/signup")}>
          <View style={styles.btnRow}>
            <Ionicons name="person-add-outline" size={18} color={ui.colors.primaryDeep} />
            <Text style={styles.btnAltText}>Creer un compte</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>Comptes test</Text>
        <Text style={styles.hint}>User: user@qline.dev / user1234</Text>
        <Text style={styles.hint}>Merchant c1: c1@qline.dev / merchant123</Text>
        <Text style={styles.hint}>Merchant c2: c2@qline.dev / merchant123</Text>
        <Text style={styles.hint}>Merchant c3: c3@qline.dev / merchant123</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 30, justifyContent: "center", flexGrow: 1 },
  panel: {
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.xl,
    borderWidth: 1,
    borderColor: ui.colors.border,
    padding: ui.spacing.lg,
    ...ui.shadow.card,
  },
  sub: { color: ui.colors.textMuted, marginBottom: 14, lineHeight: 20, fontWeight: "600" },
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
  btn: {
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.pill,
    padding: 15,
    alignItems: "center",
    marginTop: 6,
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
  hintBox: {
    marginTop: 14,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: ui.radius.lg,
    padding: ui.spacing.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  hintTitle: { fontSize: 12, color: ui.colors.text, marginBottom: 6, fontWeight: "800" },
  hint: { fontSize: 12, color: ui.colors.textMuted, marginBottom: 4, fontWeight: "600" },
});
