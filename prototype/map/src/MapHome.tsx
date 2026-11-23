import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView from "./MapView";
import { useWalkSession } from "./WalkSession";

export default function MapHome() {
  const [pixel, setPixel] = useState(true);
  const [recenter, setRecenter] = useState(0);

  const {
    session: { phase, track },
    notice,
    dispatch,
    start,
    finish,
    saving,
    canStart,
    saveError,
    walks,
  } = useWalkSession();
  const [confirmFinish, setConfirmFinish] = useState(false);
  const hasWalk = track.position !== null;
  const canFinish = hasWalk && phase !== "finished";
  const status = saving
    ? "Saving walk…"
    : phase === "waiting"
      ? "Waiting for a valid GPS fix…"
      : phase === "active"
        ? "Recording walk"
        : phase === "paused"
          ? "Walk paused"
          : phase === "interrupted"
            ? notice || "GPS signal lost. Resume when ready."
            : phase === "finished"
              ? "Walk finished"
              : "Ljubljana map preview";

  return (
    <SafeAreaView
      testID="map-home"
      style={styles.home}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Image
          source={require("../assets/wayborn-icon.png")}
          style={styles.logo}
          accessible={false}
        />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Wayborn
          </Text>
          <Text style={styles.preview} accessibilityLiveRegion="polite">
            {status}
          </Text>
        </View>
      </View>
      <View testID="map-screen" style={styles.map}>
        <MapView
          point={track.position}
          path={track.path}
          recenter={recenter}
          pixel={pixel}
        />
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Pixel map"
          accessibilityState={{ checked: pixel }}
          onPress={() => setPixel((value) => !value)}
          style={[styles.button, pixel && styles.selected]}
        >
          <Text style={styles.label}>
            {pixel ? "Pixel map" : "Standard map"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setRecenter((value) => value + 1)}
          style={styles.button}
        >
          <Text style={styles.label}>
            {hasWalk ? "Recenter on walk" : "Recenter preview"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.walk}>
        {hasWalk && (
          <Text style={styles.preview}>
            {Math.round(track.meters)} m · {Math.floor(track.elapsed)} s active
          </Text>
        )}
        <Text style={styles.preview}>
          {walks.status === "ready"
            ? "Walks are saved on this device. Sync is not available yet."
            : walks.status === "loading"
              ? "Opening saved walks…"
              : walks.status === "failed"
                ? "Storage is unavailable. Retry before starting a walk."
                : "Walks are kept for this browser session only."}
        </Text>
        {saveError !== "" && <Text accessibilityRole="alert">{saveError}</Text>}
        {walks.status === "failed" && (
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => void walks.retry()}
          >
            <Text style={styles.label}>Retry storage</Text>
          </Pressable>
        )}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={!canStart}
            accessibilityState={{ disabled: !canStart }}
            style={[styles.button, styles.selected]}
            onPress={() => {
              if (phase === "waiting") dispatch({ type: "cancel" });
              else if (phase === "active") dispatch({ type: "pause" });
              else start();
            }}
          >
            <Text style={styles.label}>
              {phase === "waiting"
                ? "Cancel GPS search"
                : phase === "active"
                  ? "Pause walk"
                  : canFinish
                    ? "Resume walk"
                    : "Start walk"}
            </Text>
          </Pressable>
          {canFinish && (
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              accessibilityState={{ disabled: saving }}
              style={styles.button}
              onPress={() => {
                if (confirmFinish || saveError) {
                  void finish().then((saved) => {
                    if (saved) setConfirmFinish(false);
                  });
                } else setConfirmFinish(true);
              }}
            >
              <Text style={styles.label}>
                {saving
                  ? "Saving walk…"
                  : saveError
                    ? "Retry saving walk"
                    : confirmFinish
                      ? "Confirm finish"
                      : "Finish walk"}
              </Text>
            </Pressable>
          )}
          {canFinish && confirmFinish && (
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={() => setConfirmFinish(false)}
            >
              <Text style={styles.label}>Keep walk</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  home: { flex: 1, backgroundColor: "#f4f2ec" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  heading: { flex: 1 },
  title: { color: "#141c30", fontSize: 24, fontWeight: "800" },
  preview: { color: "#444d60", fontSize: 14 },
  map: { flex: 1, backgroundColor: "#e4eadc" },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  walk: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#b8b5ac",
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: "#fcfbf8",
  },
  selected: { backgroundColor: "#ffcc43", borderColor: "#c39215" },
  label: { color: "#141c30", fontWeight: "700" },
});
