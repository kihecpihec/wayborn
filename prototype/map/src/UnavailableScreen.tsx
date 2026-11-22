import React from "react";
import { ScrollView, Text } from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export function UnavailableScreen({ title, description }: { title: string; description: string }) {
  const insets = useSafeAreaInsets();
  return <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 32, backgroundColor: "#f4f2ec", gap: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: "700", color: "#141c30" }}>{title}</Text>
    <Text style={{ fontSize: 17, lineHeight: 26, color: "#444d60" }}>{description} is not available yet.</Text>
    <Text style={{ fontSize: 16, lineHeight: 24 }}>You can explore the map and try a foreground demo walk. Demo progress is temporary and resets when the app reloads.</Text>
    <Link href="/" style={{ paddingVertical: 16, fontSize: 18, color: "#141c30", fontWeight: "600" }}>Return to Map</Link>
  </ScrollView>;
}
