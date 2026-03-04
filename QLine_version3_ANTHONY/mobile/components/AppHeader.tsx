import { View, Text, Image, StyleSheet } from "react-native";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Image
          source={require("../app/assets/logo.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>QLine</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 14, backgroundColor: "white" },
  title: { fontSize: 24, fontWeight: "800" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 2 }
});
