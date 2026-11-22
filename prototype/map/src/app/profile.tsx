import React, { useState } from "react";
import { Button, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { accounts } from "../auth";

export default function Profile() {
  const [error, setError] = useState("");
  async function logout() {
    try {
      const result = await accounts?.auth.signOut({ scope: "local" });
      if (result?.error) throw result.error;
    } catch {
      setError("Sign-out failed. Please try again.");
    }
  }
  return (
    <SafeAreaView
      style={{ flex: 1, padding: 24, gap: 16, backgroundColor: "#f3f4ee" }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontSize: 30, fontWeight: "800" }}
      >
        Profile
      </Text>
      <Button title="Sign out" onPress={logout} />
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </SafeAreaView>
  );
}
