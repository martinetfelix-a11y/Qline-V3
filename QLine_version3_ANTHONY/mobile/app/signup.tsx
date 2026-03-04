import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { apiSignup } from "../features/auth/auth.api";
import { fetchPublicCommerces } from "../features/commerces/commerces.api";
import { useAuth } from "../features/auth/AuthProvider";
import { AppHeader } from "../components/AppHeader";

type Role = "user" | "merchant";

export default function SignupScreen() {
  const { setAuth } = useAuth();

  const [role, setRole] = useState<Role>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (code === "email_taken") setError("Email déjà utilisé.");
      else if (code === "invalid_commerceId") setError("Commerce invalide.");
      else setError("Inscription impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Créer un compte" />

      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggle, role === "user" && styles.toggleActive]} onPress={() => setRole("user")}>
          <Text style={[styles.toggleText, role === "user" && styles.toggleTextActive]}>Utilisateur</Text>
        </Pressable>
        <Pressable style={[styles.toggle, role === "merchant" && styles.toggleActive]} onPress={() => setRole("merchant")}>
          <Text style={[styles.toggleText, role === "merchant" && styles.toggleTextActive]}>Commerçant</Text>
        </Pressable>
      </View>

      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Mot de passe (min 6)" secureTextEntry />

      {role === "merchant" && (
        <View style={styles.box}>
          <Text style={styles.h}>Commerce lié</Text>
          <Text style={styles.muted}>Choisis le commerce auquel le compte commerçant appartient.</Text>
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

      <Pressable style={styles.btn} onPress={submit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "..." : "Créer le compte"}</Text>
      </Pressable>

      <Pressable style={styles.btnAlt} onPress={() => router.replace("/login")}>
        <Text style={styles.btnAltText}>Retour login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  toggle: { flex: 1, backgroundColor: "white", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 999, padding: 12, alignItems: "center" },
  toggleActive: { borderColor: "#22c55e", backgroundColor: "#ecfdf5" },
  toggleText: { fontWeight: "800", color: "#374151" },
  toggleTextActive: { color: "#15803d" },
  input: { backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 10 },
  box: { backgroundColor: "white", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", marginTop: 6, marginBottom: 10 },
  h: { fontSize: 14, fontWeight: "800", marginBottom: 6 },
  muted: { color: "#6b7280", fontSize: 12, marginBottom: 10 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "white", borderWidth: 1, borderColor: "#e5e7eb" },
  pillActive: { borderColor: "#22c55e", backgroundColor: "#ecfdf5" },
  pillText: { fontSize: 12, color: "#374151" },
  pillTextActive: { color: "#15803d", fontWeight: "800" },
  btn: { backgroundColor: "#22c55e", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 8 },
  btnText: { color: "white", fontWeight: "800" },
  btnAlt: { backgroundColor: "#111827", borderRadius: 999, padding: 14, alignItems: "center", marginTop: 10 },
  btnAltText: { color: "white", fontWeight: "800" },
  err: { color: "#b91c1c", marginBottom: 8 },
});
