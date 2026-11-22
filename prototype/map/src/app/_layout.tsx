import { AccountGate } from "../AccountGate";
import React from "react";
import { Tabs, Link, usePathname } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WalkProvider, useWalkSession } from "../WalkProvider";
function Navigation() {
  const { walk } = useWalkSession();
  const pathname = usePathname();
  return <View style={{ flex: 1, backgroundColor: "#f4f2ec" }}>
    {pathname !== "/" && walk.started && !walk.ended && <Link href="/" accessibilityLabel="Return to current walk" style={{ padding: 12, color: "#141c30" }}>
      {walk.running ? "Walk active" : "Walk paused"} · Return to Map
    </Link>}
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#141c30", tabBarInactiveTintColor: "#636b7d", tabBarStyle: { backgroundColor: "#fcfbf8" } }}>
      {([['index','Map','◇'],['activity','Activity','≡'],['guild','Guild','♧'],['goals','Goals','◎'],['profile','Profile','○']] as const).map(([name,title,icon]) =>
        <Tabs.Screen key={name} name={name} options={{ title, tabBarAccessibilityLabel: title, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>{icon}</Text> }} />)}
    </Tabs>
  </View>;
}
export default function Layout() {
  return <SafeAreaProvider><AccountGate><WalkProvider><StatusBar style="dark" /><Navigation /></WalkProvider></AccountGate></SafeAreaProvider>;
}
