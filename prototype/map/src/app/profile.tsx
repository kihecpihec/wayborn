import React, { useState } from "react";
import { Button, Text } from "react-native";
import Destination from "../Destination";
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
    <Destination title="Profile">
      <Button title="Sign out" onPress={logout} />
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </Destination>
  );
}
