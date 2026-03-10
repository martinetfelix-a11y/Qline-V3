import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Card } from "./Card";
import { ui } from "../theme/ui";

export function buildCommerceQrValue(commerceId: string) {
  return `qline://join?commerceId=${encodeURIComponent(commerceId)}`;
}

export function CommerceQrCard({ commerceId, commerceName }: { commerceId: string; commerceName?: string | null }) {
  const qrValue = buildCommerceQrValue(commerceId);

  return (
    <Card>
      <Text style={styles.title}>QR client</Text>
      <Text style={styles.subtitle}>Les clients peuvent scanner ce code pour rejoindre la file de ce commerce.</Text>

      <View style={styles.qrWrap}>
        <View style={styles.qrFrame}>
          <QRCode value={qrValue} size={252} color={ui.colors.text} backgroundColor={ui.colors.surface} />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Commerce</Text>
        <Text style={styles.value}>{commerceName || commerceId}</Text>
        <Text style={styles.uri}>{qrValue}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: ui.colors.text,
    marginBottom: 6,
  },
  subtitle: {
    color: ui.colors.textMuted,
    lineHeight: 18,
    fontWeight: "600",
  },
  qrWrap: {
    marginTop: 14,
    width: "100%",
    minHeight: 320,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: ui.radius.xl,
    backgroundColor: ui.colors.bgSoft,
    borderWidth: 1,
    borderColor: ui.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qrFrame: {
    padding: 18,
    borderRadius: ui.radius.xl,
    backgroundColor: ui.colors.surface,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  infoBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: ui.radius.md,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
    gap: 4,
  },
  label: {
    color: ui.colors.textMuted,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },
  value: {
    color: ui.colors.text,
    fontWeight: "900",
  },
  uri: {
    color: ui.colors.primaryDeep,
    fontWeight: "700",
    fontSize: 12,
  },
});
