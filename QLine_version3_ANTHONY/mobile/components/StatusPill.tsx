import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ui } from "../theme/ui";

type Tone = "success" | "warning" | "danger" | "neutral";

type Props = {
  label: string;
  tone?: Tone;
};

const tones: Record<Tone, { bg: string; border: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: "rgba(31,159,99,0.14)", border: "rgba(31,159,99,0.45)", text: ui.colors.primaryDeep, icon: "checkmark-circle-outline" },
  warning: { bg: "rgba(245,158,11,0.16)", border: "rgba(245,158,11,0.45)", text: "#9a5b00", icon: "alert-circle-outline" },
  danger: { bg: "rgba(217,79,79,0.16)", border: "rgba(217,79,79,0.45)", text: ui.colors.danger, icon: "close-circle-outline" },
  neutral: { bg: ui.colors.surfaceMuted, border: ui.colors.borderStrong, text: ui.colors.textMuted, icon: "ellipse-outline" },
};

export function StatusPill({ label, tone = "neutral" }: Props) {
  const t = tones[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Ionicons name={t.icon} size={14} color={t.text} />
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: ui.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
});
