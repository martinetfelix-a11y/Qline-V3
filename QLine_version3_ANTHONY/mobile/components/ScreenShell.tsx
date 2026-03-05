import { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { ui } from "../theme/ui";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
};

export function ScreenShell({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled",
}: Props) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(driftA, { toValue: 1, duration: 7000, useNativeDriver: true }),
        Animated.timing(driftA, { toValue: 0, duration: 7000, useNativeDriver: true }),
      ])
    );
    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(driftB, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(driftB, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    );

    loopA.start();
    loopB.start();
    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [driftA, driftB]);

  const blobATranslateX = driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const blobATranslateY = driftA.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const blobBTranslateX = driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const blobBTranslateY = driftB.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={styles.bgLayer}>
        <Animated.View style={[styles.blobA, { transform: [{ translateX: blobATranslateX }, { translateY: blobATranslateY }] }]} />
        <Animated.View style={[styles.blobB, { transform: [{ translateX: blobBTranslateX }, { translateY: blobBTranslateY }] }]} />
        <View style={styles.stripes}>
          {Array.from({ length: 7 }).map((_, idx) => (
            <View key={idx} style={styles.stripe} />
          ))}
        </View>
      </View>

      {scroll ? (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, contentContainerStyle]} keyboardShouldPersistTaps={keyboardShouldPersistTaps}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blobA: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(31,159,99,0.15)",
    top: -80,
    right: -40,
  },
  blobB: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(17,119,70,0.12)",
    bottom: -70,
    left: -50,
  },
  stripes: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    opacity: 0.24,
  },
  stripe: {
    width: 1,
    backgroundColor: "rgba(17,119,70,0.14)",
  },
});
