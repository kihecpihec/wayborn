import assert from "node:assert/strict";
import { getResolution, isValidCell, latLngToCell } from "h3-js";
import traces from "../fixtures/h3-trial.json";

export function exerciseH3Trial() {
  // H3's documented indexing example provides an independent expected ID.
  assert.equal(
    latLngToCell(37.775938728915946, -122.41795063018799, 9),
    "8928308280fffff",
  );
  for (const resolution of [10, 11]) {
    for (const trace of Object.values(traces)) {
      for (const [latitude, longitude] of trace) {
        const cell = latLngToCell(latitude, longitude, resolution);
        assert.equal(typeof cell, "string");
        assert.ok(isValidCell(cell));
        assert.equal(getResolution(cell), resolution);
      }
    }
  }
}

export async function exerciseVersionedGeography() {
  const { candidateCells } = await import("../src/candidateCells");
  const west = { latitude: 0, longitude: 179.99997 };
  const east = { latitude: 0, longitude: -179.99997 };
  const street = { latitude: 46.05042, longitude: 14.50572 };
  assert.deepEqual(candidateCells("h3-samples-v1", [west, east, street, west]), {
    cells: ["8b7eb57221a2fff", "8b1e1216b346fff"],
    reason: null,
  });
  assert.deepEqual(candidateCells("h3-samples-v1", [west, { latitude: 91, longitude: 0 }]), {
    cells: [],
    reason: "invalid_coordinate",
  });
  assert.deepEqual(candidateCells("unknown", [west]), {
    cells: [],
    reason: "unsupported_version",
  });
}
