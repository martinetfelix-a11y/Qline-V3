import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { ui } from "../theme/ui";

export function Card({ children }: { children: React.ReactNode }) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const translateY = appear.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={[styles.card, { opacity: appear, transform: [{ translateY }] }]}>
      <View pointerEvents="none" style={styles.gloss} />
      {children}
    </Animated.View>
  );
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
    overflow: "hidden",
  },
  gloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(31,159,99,0.08)",
  },
});
