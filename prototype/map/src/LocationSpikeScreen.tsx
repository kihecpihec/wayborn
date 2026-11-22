import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Destination from "./Destination";
import { readSpike, spikeRunning, startSpike, stopSpike } from "./locationSpike";
import { emptySpikeStats } from "./locationSpikeTypes";

export default function LocationSpikeScreen() {
  const [stats, setStats] = useState(emptySpikeStats);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try {
        const active = await spikeRunning();
        if (mounted) { setRunning(active); setStats(readSpike()); }
      } catch {
        if (mounted) setError("Could not read the location test. Reopen the development build.");
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 1000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      if (running) await stopSpike();
      else await startSpike();
      setRunning(await spikeRunning());
      setStats(readSpike());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Location test failed.");
    } finally { setBusy(false); }
  }

  return (
    <Destination title="Screen-lock test">
      <Text>Start outdoors, lock the screen, and walk for two minutes. Unlock, then stop the test.</Text>
      <Text>The test saves update counts and the last fix time on this device. Coordinate values are discarded.</Text>
      <Text>{running ? "Recording test updates" : "Test stopped"}</Text>
      <Text>Updates received: {stats.samples}</Text>
      <Text>Updates delivered in background: {stats.background}</Text>
      <Text>Task errors: {stats.errors}</Text>
      <Text>Last GPS fix: {stats.lastFix ? new Date(stats.lastFix).toLocaleTimeString() : "Waiting"}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void toggle()} style={styles.button}>
        <Text>{busy ? "Please wait…" : running ? "Stop test" : "Start test"}</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </Destination>
  );
}
const styles = StyleSheet.create({
  button: { minHeight: 48, backgroundColor: "#ffcc43", padding: 14, borderRadius: 8 },
});
