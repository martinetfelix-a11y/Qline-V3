import { useEffect, useRef } from "react";
import { Animated, View, Text, Image, StyleSheet } from "react-native";
import { ui } from "../theme/ui";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const appear = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [appear, pulse]);

  const translateY = appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.shell, { opacity: appear, transform: [{ translateY }] }]}>
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
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale }], opacity: dotOpacity }]} />
      </Animated.View>
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
    fontFamily: ui.typography.display,
    color: ui.colors.text,
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: 12,
    color: ui.colors.textMuted,
    marginTop: 1,
    fontWeight: "600",
    fontFamily: ui.typography.body,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.colors.primary,
  },
});
