import { useCallback, useEffect, useReducer, useState } from "react";
import * as Location from "expo-location";
import { Coordinate, Fix } from "./geo";
import { idle, walkReducer } from "./walkState";

export function useWalk() {
  const [walk, dispatch] = useReducer(walkReducer, idle);
  const [source, setSource] = useState<"gps" | "spoof">("gps");
  const [preview, setPreview] = useState<Fix | null>(null);
  const fix = walk.position;
  const [status, setStatus] = useState("Map preview · press Start walk to use GPS.");
  const [retry, setRetry] = useState(0);
  const trackingReady = walk.running && walk.last !== null && source === "gps";
  useEffect(() => {
    if (!trackingReady) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      dispatch({ type: "tick", seconds: (now - last) / 1000 });
      last = now;
    }, 1000);
    return () => clearInterval(id);
  }, [trackingReady, walk.session]);
  useEffect(() => {
    if (source !== "gps" || !walk.started || !walk.running) return;
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
            distanceInterval: 0,
            timeInterval: 2000,
          },
          (location) => {
            if (cancelled) return;
            const next: Fix = {
              ...location.coords,
              timestamp: location.timestamp,
            };
            dispatch({ type: "fix", fix: next });
            setStatus(
              next.accuracy === null ||
                !Number.isFinite(next.accuracy) ||
                next.accuracy < 0 ||
                next.accuracy > 50
                ? "Weak GPS · waiting for a more accurate fix"
                : "",
            );
          },
          (error) => {
            if (!cancelled) {
              dispatch({ type: "interrupt" });
              setStatus(`GPS unavailable: ${error}`);
            }
          },
        );
        if (cancelled) watcher.remove();
        else subscription = watcher;
      } catch (error) {
        if (!cancelled) {
          dispatch({ type: "interrupt" });
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not start GPS. Please retry.",
          );
        }
      }
    }
    void start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [source, retry, walk.started, walk.running, walk.session]);
  const spoof = useCallback((point: Coordinate) => {
    const next: Fix = { ...point, accuracy: 0, timestamp: Date.now() };
    // Developer coordinates are camera previews and never accepted track samples.
    setSource("spoof");
    setStatus("Developer coordinates active · GPS disconnected");
    setPreview(next);
  }, []);
  const enableGPS = useCallback(() => {
    dispatch({ type: "interrupt" });
    setSource("gps");
    setRetry((value) => value + 1);
  }, []);
  return { walk, source, fix: source === "spoof" ? preview : fix, status, spoof, enableGPS, dispatch };
}
