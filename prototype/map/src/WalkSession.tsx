import React, { createContext, useContext, type ReactNode } from "react";
import { useForegroundWalk } from "./useForegroundWalk";

const WalkSession = createContext<ReturnType<typeof useForegroundWalk> | null>(null);

export function WalkSessionProvider({ children }: { children: ReactNode }) {
  const walk = useForegroundWalk();
  return <WalkSession.Provider value={walk}>{children}</WalkSession.Provider>;
}

export function useWalkSession() {
  const walk = useContext(WalkSession);
  if (!walk) throw new Error("WalkSessionProvider is required");
  return walk;
}
