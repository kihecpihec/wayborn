import { cellToBoundary, gridDisk, latLngToCell } from "h3-js";
import { distance, type Coordinate, type Fix } from "./geo";
import { validWalkFix } from "./walkState";

export const SEGMENT_RULES_VERSION = "h3-walk-segments-v1";
export type SegmentFix = Fix & { segment: string };
type Result = { cells: string[]; reason: null } |
  { cells: []; reason: "unsupported_version" | "unsupported_region" | "coverage_limit" };

// Work in a local longitude interval so a short dateline crossing remains short.
function unwrap(longitude: number, origin: number) {
  return origin + ((longitude - origin + 540) % 360) - 180;
}

type Point = [number, number];

function orientation(a: Point, b: Point, c: Point) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function intersects(a: Point, b: Point, c: Point, d: Point) {
  if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) ||
      Math.max(c[0], d[0]) < Math.min(a[0], b[0]) ||
      Math.max(a[1], b[1]) < Math.min(c[1], d[1]) ||
      Math.max(c[1], d[1]) < Math.min(a[1], b[1])) return false;
  return orientation(a, b, c) * orientation(a, b, d) <= 0 &&
    orientation(c, d, a) * orientation(c, d, b) <= 0;
}

function crossedCells(start: Coordinate, end: Coordinate): string[] | null {
  const first = latLngToCell(start.latitude, start.longitude, 11);
  const last = latLngToCell(end.latitude, end.longitude, 11);
  const a: Point = [start.longitude, start.latitude];
  const b: Point = [unwrap(end.longitude, start.longitude), end.latitude];
  const queue = [first];
  const seen = new Set<string>();
  const crossed: string[] = [];
  // A reliable pair spans at most 60 metres under D05. This bound is a guard
  // against malformed geometry, not an activity-length limit.
  for (let index = 0; index < queue.length; index++) {
    const cell = queue[index];
    if (seen.has(cell)) continue;
    seen.add(cell);
    if (seen.size > 256) return null;
    const boundary: Point[] = cellToBoundary(cell).map(([lat, lng]) => [unwrap(lng, start.longitude), lat]);
    const touches = cell === first || cell === last ||
      boundary.some((point, i) => intersects(a, b, point, boundary[(i + 1) % boundary.length]));
    if (!touches) continue;
    crossed.push(cell);
    for (const neighbor of gridDisk(cell, 1)) {
      if (!seen.has(neighbor)) queue.push(neighbor);
    }
  }
  return crossed;
}

export function segmentCells(version: string, samples: readonly SegmentFix[]): Result {
  if (version !== SEGMENT_RULES_VERSION) return { cells: [], reason: "unsupported_version" };
  const cells = new Set<string>();
  let previous: SegmentFix | null = null;
  let lastTimestamp = -1;
  for (const sample of samples) {
    if (!validWalkFix(sample) || !sample.segment) {
      previous = null;
      continue;
    }
    if (Math.abs(sample.latitude) > 85) return { cells: [], reason: "unsupported_region" };
    if (sample.timestamp <= lastTimestamp) {
      previous = null;
      continue;
    }
    lastTimestamp = sample.timestamp;
    const continuous = previous && sample.segment === previous.segment &&
      sample.timestamp - previous.timestamp <= 15000;
    if (continuous && previous) {
      const metres = distance(previous, sample);
      if (metres / ((sample.timestamp - previous.timestamp) / 1000) > 4) {
        previous = null;
        continue;
      }
      if (metres < 3) continue;
      const crossed = crossedCells(previous, sample);
      if (!crossed) return { cells: [], reason: "coverage_limit" };
      for (const cell of crossed) cells.add(cell);
    } else {
      cells.add(latLngToCell(sample.latitude, sample.longitude, 11));
    }
    previous = sample;
  }
  return { cells: [...cells].sort(), reason: null };
}
