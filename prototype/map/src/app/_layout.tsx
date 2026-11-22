import React from "react";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import App from "../../App";
import { WalkSessionProvider } from "../WalkSession";

export default function Layout() {
  if (__DEV__ && process.env.EXPO_PUBLIC_WALKING_DEMO === "1") return <App />;
  return (
    <WalkSessionProvider>
      <StatusBar style="dark" />
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#141c30",
        tabBarInactiveTintColor: "#50596d",
        tabBarActiveBackgroundColor: "#ffcc43",
        tabBarStyle: { backgroundColor: "#f4f2ec" },
        tabBarIconStyle: { display: "none" },
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontSize: 13, fontWeight: "700", marginVertical: 8 },
      }}>
        <Tabs.Screen name="index" options={{ title: "Map" }} />
        <Tabs.Screen name="activity" options={{ title: "Activity" }} />
        <Tabs.Screen name="guild" options={{ title: "Guild" }} />
        <Tabs.Screen name="goals" options={{ title: "Goals" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
    </WalkSessionProvider>
  );
}
