import { View, StyleSheet } from "react-native";
import { ui } from "../theme/ui";

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.lg,
    padding: ui.spacing.md,
    marginBottom: ui.spacing.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadow.card,
  },
});
