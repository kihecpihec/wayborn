// Web fallback. Native bundling resolves locationSpike.native.ts.
import { emptySpikeStats } from "./locationSpikeTypes";
export function readSpike() { return emptySpikeStats; }
export async function spikeRunning() { return false; }
export async function startSpike() { throw new Error("Use the location-test native development build."); }
export async function stopSpike() {}
