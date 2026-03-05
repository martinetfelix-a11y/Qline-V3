import { Platform } from "react-native";

export const ui = {
  colors: {
    bg: "#eef7f1",
    bgSoft: "#f7fcf9",
    surface: "#ffffff",
    surfaceMuted: "#f1f8f4",
    border: "#d4e6db",
    borderStrong: "#a8ccb8",
    text: "#102418",
    textMuted: "#5f7567",
    primary: "#1f9f63",
    primaryPressed: "#198854",
    primarySoft: "#d8f3e4",
    primaryDeep: "#117746",
    danger: "#d94f4f",
    darkButton: "#21392d",
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  shadow: {
    card: {
      shadowColor: "#0b3d24",
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    soft: {
      shadowColor: "#0b3d24",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
  },
  typography: {
    display: Platform.select({
      ios: "AvenirNext-Heavy",
      android: "sans-serif-black",
      default: "System",
    }),
    title: Platform.select({
      ios: "AvenirNext-DemiBold",
      android: "sans-serif-medium",
      default: "System",
    }),
    body: Platform.select({
      ios: "AvenirNext-Regular",
      android: "sans-serif",
      default: "System",
    }),
  },
};
