import { useCallback, useEffect, useReducer, useState } from "react";
import * as Location from "expo-location";
import { Coordinate, Fix } from "./geo";
import { initial, walkReducer } from "./walkState";

export function useWalk() {
  const [walk, dispatch] = useReducer(walkReducer, initial);
  const [source, setSource] = useState<"gps" | "spoof">("gps");
  const [fix, setFix] = useState<Fix | null>(null);
  const [status, setStatus] = useState("Requesting location permission…");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!walk.running) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      dispatch({ type: "tick", seconds: (now - last) / 1000 });
      last = now;
    }, 1000);
    return () => clearInterval(id);
  }, [walk.running]);
  useEffect(() => {
    if (source !== "gps") return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;
    async function start() {
      setStatus("Finding your location…");
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (permission.status !== "granted") {
          setStatus("Location permission denied. Allow location, then retry.");
          return;
        }
        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 3,
            timeInterval: 2000,
          },
          (location) => {
            if (cancelled) return;
            const next: Fix = {
              ...location.coords,
              timestamp: location.timestamp,
            };
            setFix(next);
            dispatch({ type: "fix", fix: next });
            setStatus(
              next.accuracy !== null && next.accuracy > 50
                ? "Weak GPS · waiting for a more accurate fix"
                : "",
            );
          },
          (error) => {
            if (!cancelled) setStatus(`GPS unavailable: ${error}`);
          },
        );
        if (cancelled) watcher.remove();
        else subscription = watcher;
      } catch (error) {
        if (!cancelled)
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not start GPS. Please retry.",
          );
      }
    }
    void start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [source, retry]);
  const spoof = useCallback((point: Coordinate) => {
    const next: Fix = { ...point, accuracy: 0, timestamp: Date.now() };
    // Each manual relocation starts a fresh walk, so a teleport never counts as walking.
    dispatch({ type: "reset" });
    dispatch({ type: "fix", fix: next });
    setSource("spoof");
    setFix(next);
    setStatus("Developer coordinates active · GPS disconnected");
  }, []);
  const enableGPS = useCallback(() => {
    dispatch({ type: "reset" });
    setFix(null);
    setSource("gps");
    setRetry((value) => value + 1);
  }, []);
  return { walk, source, fix, status, spoof, enableGPS, dispatch };
}
