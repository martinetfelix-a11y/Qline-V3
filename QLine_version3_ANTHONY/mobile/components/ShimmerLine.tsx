import { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { ui } from "../theme/ui";

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function ShimmerLine({ width = "100%", height = 12, radius = 8, style }: Props) {
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);

  const translateX = shift.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 240],
  });

  return (
    <View style={[styles.base, { width, height, borderRadius: radius }, style]}>
      <Animated.View style={[styles.highlight, { transform: [{ translateX }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  highlight: {
    position: "absolute",
    top: -8,
    left: 0,
    width: 90,
    height: 38,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
