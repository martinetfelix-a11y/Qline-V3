import { View, Text, Image, StyleSheet } from "react-native";
import { ui } from "../theme/ui";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        <View style={styles.logoWrap}>
          <Image
            source={require("../app/assets/logo.jpg")}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>QLine</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: ui.spacing.lg },
  shell: {
    flexDirection: "row",
    alignItems: "center",
    gap: ui.spacing.sm,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: ui.radius.xl,
    borderWidth: 1,
    borderColor: ui.colors.border,
    padding: ui.spacing.sm,
    ...ui.shadow.soft,
  },
  logoWrap: {
    width: 54,
    height: 54,
    borderRadius: ui.radius.md,
    backgroundColor: ui.colors.surface,
    borderWidth: 1,
    borderColor: ui.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: ui.radius.sm,
  },
  copy: { flex: 1 },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: ui.colors.text,
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: 12,
    color: ui.colors.textMuted,
    marginTop: 1,
    fontWeight: "600",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.colors.primary,
  },
});
