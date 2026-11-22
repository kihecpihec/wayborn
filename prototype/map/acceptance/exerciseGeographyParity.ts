import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import traces from "../fixtures/h3-trial.json";
import { candidateCells } from "../src/candidateCells";

const ruleVersion = "h3-samples-v1";

function evaluateOnServer(version: string, samples: unknown) {
  const entry = fileURLToPath(new URL("../server/evaluateGeography.ts", import.meta.url));
  return JSON.parse(execFileSync(process.execPath, ["--import", "tsx", entry], {
    input: JSON.stringify({ version, samples }),
    encoding: "utf8",
    timeout: 5000,
  }));
}

export function exerciseGeographyParity() {
  const samples = Object.values(traces).flat().map(([latitude, longitude]) => ({ latitude, longitude }));
  const expected = candidateCells(ruleVersion, samples);
  assert.equal(expected.reason, null);
  assert.ok(expected.cells.length > 0);
  assert.deepEqual(evaluateOnServer(ruleVersion, samples), expected);
  const unsupported = { cells: [], reason: "unsupported_version" };
  assert.deepEqual(candidateCells("unknown", samples), unsupported);
  assert.deepEqual(evaluateOnServer("unknown", samples), unsupported);
}

export function exerciseGeographyBoundary() {
  const crossing = [179.99997, -179.99997, 180, -180].map((longitude) => ({ latitude: 0, longitude }));
  const expected = { cells: ["8b7eb57221a2fff"], reason: null };
  assert.deepEqual(candidateCells(ruleVersion, crossing), expected);
  assert.deepEqual(evaluateOnServer(ruleVersion, crossing), expected);

  const invalid = [...crossing, { latitude: 0, longitude: 181 }];
  const rejected = { cells: [], reason: "invalid_coordinate" };
  assert.deepEqual(candidateCells(ruleVersion, invalid), rejected);
  assert.deepEqual(evaluateOnServer(ruleVersion, invalid), rejected);
  assert.deepEqual(evaluateOnServer(ruleVersion, [null]), rejected);
}
