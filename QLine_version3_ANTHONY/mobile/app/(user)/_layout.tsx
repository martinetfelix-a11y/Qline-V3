import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, View, StyleSheet } from "react-native";
import { ui } from "../../theme/ui";

export default function UserLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ui.colors.primary,
        tabBarInactiveTintColor: ui.colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          height: 68,
          paddingTop: 6,
          borderRadius: ui.radius.xl,
          borderTopWidth: 1,
          borderColor: ui.colors.border,
          backgroundColor: "rgba(255,255,255,0.98)",
          ...ui.shadow.card,
        },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          fontFamily: ui.typography.title,
          marginBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="commerces"
        options={{
          title: "Commerces",
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Rendez-vous",
          tabBarIcon: ({ color, size }) => <Ionicons name="ticket-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scanner",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.scanIconWrap, focused && styles.scanIconWrapFocused]}>
              <Ionicons name="scan-outline" size={20} color={focused ? "white" : ui.colors.primaryDeep} />
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.scanLabel, focused && styles.scanLabelFocused]}>Scanner</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanIconWrap: {
    width: 36,
    height: 36,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.colors.primarySoft,
    borderWidth: 1,
    borderColor: ui.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  scanIconWrapFocused: {
    backgroundColor: ui.colors.primary,
    borderColor: ui.colors.primary,
    ...ui.shadow.soft,
  },
  scanLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: ui.colors.textMuted,
    marginBottom: 6,
    fontFamily: ui.typography.title,
  },
  scanLabelFocused: {
    color: ui.colors.primaryDeep,
  },
});
