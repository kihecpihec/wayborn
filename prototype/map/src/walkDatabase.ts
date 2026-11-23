import type { WalkDatabase } from "./walkStorage";

// Browser: durable local storage is not provided (expo-sqlite on web needs wasm and
// cross-origin isolation, which is a separate decision). Walks are recorded in memory only.
export async function openWalkDatabase(): Promise<WalkDatabase | null> {
  return null;
}
