import { latLngToCell } from "h3-js";
import type { Coordinate } from "./geo";

export const SAMPLE_RULES_VERSION = "h3-samples-v1";
const RESOLUTION = 11;

type CandidateResult =
  | { cells: string[]; reason: null }
  | { cells: []; reason: "unsupported_version" | "invalid_coordinate" };

/** Index already accepted samples. The trial leaves gaps and interiors unfilled. */
export function candidateCells(version: string, samples: readonly Coordinate[]): CandidateResult {
  if (version !== SAMPLE_RULES_VERSION) return { cells: [], reason: "unsupported_version" };

  const cells = new Set<string>();
  for (const { latitude, longitude } of samples) {
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      return { cells: [], reason: "invalid_coordinate" };
    }
    cells.add(latLngToCell(latitude, longitude, RESOLUTION));
  }
  return { cells: [...cells], reason: null };
}
