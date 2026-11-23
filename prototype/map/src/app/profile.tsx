import React, { useState } from "react";
import { Button, Text } from "react-native";
import Destination from "../Destination";
import { signOutOnRequest } from "../auth";

export default function Profile() {
  const [error, setError] = useState("");
  async function logout() {
    try {
      await signOutOnRequest();
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
