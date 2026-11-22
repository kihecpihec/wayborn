import { useEffect, useReducer, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { foregroundWalk, idleWalk } from "./foregroundWalk";

export function useForegroundWalk() {
  const [session, dispatch] = useReducer(foregroundWalk, idleWalk);
  const [notice, setNotice] = useState("");
  const watching = session.phase === "waiting" || session.phase === "active";

  useEffect(() => {
    if (!watching) return;
    let stopped = false;
    let signalDeadline: ReturnType<typeof setTimeout> | undefined;
    let subscription: Location.LocationSubscription | undefined;
    function stop() {
      stopped = true;
      clearTimeout(signalDeadline);
      subscription?.remove();
    }
    function fail(message: string) {
      if (stopped) return;
      stop();
      setNotice(message);
      dispatch({ type: "interrupt" });
    }
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "background") fail("Walk interrupted when the app went into the background.");
    });

    function awaitSignal() {
      clearTimeout(signalDeadline);
      signalDeadline = setTimeout(() => fail("GPS signal timed out. Try again when ready."), 15000);
    }

    async function watch() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (stopped) return;
        if (!permission.granted) {
          fail(permission.canAskAgain
            ? "Location permission is needed to start a walk."
            : "Enable location for Wayborn in Settings, then try again.");
          return;
        }
        awaitSignal();
        const watcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000 },
          ({ coords, timestamp }) => {
            if (stopped) return;
            awaitSignal();
            dispatch({ type: "fix", fix: { ...coords, timestamp } });
          },
          () => fail("GPS unavailable. Try again when you have a clear signal."),
        );
        if (stopped) watcher.remove();
        else subscription = watcher;
      } catch {
        fail("Location unavailable. Check your location settings and try again.");
      }
    }
    void watch();
    return () => {
      stop();
      listener.remove();
    };
  }, [watching]);

  useEffect(() => {
    if (session.phase !== "active") return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", seconds: (now - last) / 1000 });
      last = now;
    }, 1000);
    return () => clearInterval(timer);
  }, [session.phase]);

  return { session, notice, dispatch, start() {
    setNotice("");
    dispatch({ type: "start" });
  } };
}
