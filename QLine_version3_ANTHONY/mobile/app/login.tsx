import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { apiLogin } from "../features/auth/auth.api";
import { useAuth } from "../features/auth/AuthProvider";
import { AppHeader } from "../components/AppHeader";
import { Ionicons } from "@expo/vector-icons";


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
    <View style={styles.container}>
      <AppHeader subtitle="Connexion" />

      <Text style={styles.sub}>Login unique → redirige User ou Merchant</Text>

      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          value={password}
          onChangeText={setPassword}
          placeholder="Mot de passe"
          secureTextEntry={!showPassword}
        />
        <Pressable
          style={styles.eyeButton}
          onPress={() => setShowPassword((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
        </Pressable>
      </View>

      {error && <Text style={styles.err}>{error}</Text>}

      <Pressable style={styles.btn} onPress={submit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "..." : "Se connecter"}</Text>
      </Pressable>

      <Pressable style={styles.btnAlt} onPress={() => router.push("/signup")}>
        <Text style={styles.btnAltText}>Créer un compte</Text>
      </Pressable>

      <View style={{ marginTop: 14 }}>
        <Text style={styles.hint}>Comptes test:</Text>
        <Text style={styles.hint}>User: user@qline.dev / user1234</Text>
        <Text style={styles.hint}>Merchant c1: c1@qline.dev / merchant123</Text>
        <Text style={styles.hint}>Merchant c2: c2@qline.dev / merchant123</Text>
        <Text style={styles.hint}>Merchant c3: c3@qline.dev / merchant123</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#f3f4f6" },
  sub: { color: "#6b7280", marginBottom: 18 },
  input: { backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 10 },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  eyeButton: { paddingHorizontal: 12, paddingVertical: 12 },
  btn: { backgroundColor: "#22c55e", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 8 },
  btnText: { color: "white", fontWeight: "800" },
  btnAlt: { backgroundColor: "#111827", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 10 },
  btnAltText: { color: "white", fontWeight: "800" },
  err: { color: "#b91c1c", marginBottom: 8 },
  hint: { fontSize: 12, color: "#6b7280" }
});
