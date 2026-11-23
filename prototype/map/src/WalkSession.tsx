import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { randomUUID } from "expo-crypto";
import { useAccountId } from "./AccountContext";
import { useAccountWalks } from "./useAccountWalks";
import { useForegroundWalk } from "./useForegroundWalk";
import { createWalkRecorder } from "./walkRecorder";

type Value = ReturnType<typeof useForegroundWalk> & {
  walks: ReturnType<typeof useAccountWalks>;
  saveError: string;
  saving: boolean;
  canStart: boolean;
  activeWalkId: string | null;
  finish: () => Promise<boolean>;
};
const WalkSession = createContext<Value | null>(null);

export function WalkSessionProvider({ children }: { children: ReactNode }) {
  const accountId = useAccountId();
  const walk = useForegroundWalk();
  const { dispatch } = walk;
  const walks = useAccountWalks(accountId);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const finishing = useRef(false);
  const { store, refresh } = walks;
  const recorder = useMemo(
    () =>
      store &&
      createWalkRecorder(store, {
        newId: randomUUID,
        now: Date.now,
        onError: () => {
          setSaveError(
            "This walk could not be fully saved. Retry saving before leaving this session.",
          );
          dispatch({ type: "interrupt" });
        },
      }),
    [store, dispatch],
  );
  const previous = useRef(walk.session);
  useEffect(() => {
    const before = previous.current;
    previous.current = walk.session;
    if (recorder && before !== walk.session)
      recorder.observe(before, walk.session);
  }, [walk.session, recorder]);

  async function finish() {
    if (
      finishing.current ||
      !walks.canStart ||
      walk.session.phase === "finished"
    )
      return false;
    finishing.current = true;
    setSaving(true);
    setSaveError("");
    // Stop accepting fixes before waiting for outstanding disk operations.
    recorder?.observe(previous.current, walk.session);
    previous.current = walk.session;
    dispatch({ type: "pause" });
    try {
      await recorder?.finish();
      dispatch({ type: "finish" });
      await refresh();
      return true;
    } catch {
      setSaveError(
        "This walk could not be fully saved. Retry saving before leaving this session.",
      );
      return false;
    } finally {
      finishing.current = false;
      setSaving(false);
    }
  }
  return (
    <WalkSession.Provider
      value={{
        ...walk,
        walks,
        saveError,
        saving,
        finish,
        canStart: walks.canStart && !saving && !saveError,
        activeWalkId: recorder?.activeId ?? null,
        start() {
          if (walks.canStart && !finishing.current && !saveError) walk.start();
        },
      }}
    >
      {children}
    </WalkSession.Provider>
  );
}

export function useWalkSession() {
  const walk = useContext(WalkSession);
  if (!walk) throw new Error("WalkSessionProvider is required");
  return walk;
}
