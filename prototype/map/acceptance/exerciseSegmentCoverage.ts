import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export async function exerciseSegmentCoverage() {
  const { segmentCells } = await import("../src/segmentCells");
  const start = { latitude: 0, longitude: -0.00025, timestamp: 1000, accuracy: 5, segment: "a" };
  const end = { ...start, longitude: 0.00025, timestamp: 16000 };
  // Independently checked against the published H3 polygon boundaries. The
  // middle cell contains neither endpoint but intersects latitude zero.
  const expected = { cells: ["8b754e649928fff", "8b754e649929fff", "8b754e64992dfff"], reason: null };
  const version = "h3-walk-segments-v1";
  assert.deepEqual(segmentCells(version, [start, end]), expected);
  const entry = fileURLToPath(new URL("../server/evaluateGeography.ts", import.meta.url));
  const server = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", entry], {
    input: JSON.stringify({ version, samples: [start, end] }), encoding: "utf8", timeout: 5000,
  }));
  assert.deepEqual(server, expected);
  const endpoints = { cells: ["8b754e649928fff", "8b754e64992dfff"], reason: null };
  assert.deepEqual(segmentCells(version, [start, { ...end, segment: "b" }]), endpoints);
  assert.deepEqual(segmentCells(version, [start, { ...end, timestamp: 16001 }]), endpoints);
  assert.deepEqual(segmentCells(version, [start, { ...start, accuracy: 70, timestamp: 5000 }, end]), endpoints);
  assert.deepEqual(segmentCells(version, [start, { ...end, timestamp: 2000 }]), {
    cells: ["8b754e649928fff"], reason: null,
  });
  assert.deepEqual(segmentCells(version, [{ ...start, latitude: 86 }]), {
    cells: [], reason: "unsupported_region",
  });
  assert.deepEqual(segmentCells("unknown", [start]), { cells: [], reason: "unsupported_version" });
  const crossing = [
    { ...start, longitude: 179.99997 },
    { ...end, longitude: -179.99997 },
  ];
  assert.deepEqual(segmentCells(version, crossing), { cells: ["8b7eb57221a2fff"], reason: null });
}
