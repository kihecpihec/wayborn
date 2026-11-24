import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Evidence-backed adapter for device-level scenarios. It does not simulate a phone:
// it passes only when the device evidence record names the device, OS, build, tester,
// reviewer and date, and has a row for the scenario whose result starts with "Passed".
// A missing, unreported or failed row fails the case. The row itself is written by a
// person from what the tester reported; review of that record is what makes it evidence.
const record = new URL("../../../docs/testing/m1-device-evidence.md", import.meta.url);
const missing = /not yet reported|not tested|^\s*$/i;

function rows(markdown: string) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

export function requireDeviceEvidence(id: string) {
  const table = rows(readFileSync(record, "utf8"));
  const field = (name: string) => table.find((cells) => cells[0] === name)?.[1] ?? "";
  for (const name of ["Build", "Device", "iOS version", "Tester", "Reviewer", "Date"])
    assert.doesNotMatch(field(name), missing, `${id}: device record lacks ${name}`);
  const row = table.find((cells) => cells[0] === id);
  assert.ok(row, `${id}: no row in the device evidence record`);
  const result = row.at(-1) ?? "";
  assert.match(result, /^Passed\b/, `${id}: device result is "${result}", not Passed`);
}
