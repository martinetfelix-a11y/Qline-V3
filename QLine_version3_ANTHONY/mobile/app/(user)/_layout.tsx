import { Tabs } from "expo-router";

export default function UserLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="commerces" options={{ title: "Commerces" }} />
      <Tabs.Screen name="tickets" options={{ title: "Mes tickets" }} />
      <Tabs.Screen name="scan" options={{ title: "Scanner" }} />
    </Tabs>
  );
}