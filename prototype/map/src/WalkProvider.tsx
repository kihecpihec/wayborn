import React, { createContext, useContext } from "react";
import { useWalk } from "./useWalk";
const Context = createContext<ReturnType<typeof useWalk> | null>(null);
export function WalkProvider({ children }: { children: React.ReactNode }) {
  const value = useWalk();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWalkSession() {
  const value = useContext(Context);
  if (!value) throw new Error("WalkProvider is missing");
  return value;
}
