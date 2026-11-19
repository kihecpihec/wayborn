import { test } from "node:test";
import assert from "node:assert/strict";
import { distance, parseCoordinate, Fix } from "./geo";
import { initial, walkReducer } from "./walkState";
const fix = (latitude: number, timestamp: number, accuracy = 5): Fix => ({
  latitude,
  longitude: 14.506,
  timestamp,
  accuracy,
});
test("coordinates reject empty, nonfinite, or out-of-range input", () => {
  for (const pair of [
    ["", "0"],
    ["91", "0"],
    ["0", "-181"],
    ["NaN", "0"],
    ["Infinity", "0"],
  ])
    assert.equal(parseCoordinate(...(pair as [string, string])), null);
  assert.deepEqual(parseCoordinate("0", "0"), { latitude: 0, longitude: 0 });
});
test("GPS walking counts ground distance and discards jitter and weak fixes", () => {
  const a = fix(46.0514, 1000),
    b = fix(46.0515, 11000);
  let state = walkReducer(initial, { type: "fix", fix: a });
  state = walkReducer(state, { type: "fix", fix: b });
  assert.ok(Math.abs(state.meters - distance(a, b)) < 0.01);
  assert.equal(state.path.length, 2);
  const weak = walkReducer(state, {
    type: "fix",
    fix: fix(46.052, 21000, 100),
  });
  assert.equal(weak, state);
  assert.equal(
    walkReducer(state, { type: "fix", fix: fix(46.051501, 12000) }),
    state,
  );
});
test("teleports reset the trail baseline without adding distance", () => {
  const start = walkReducer(initial, { type: "fix", fix: fix(46, 1000) });
  const teleported = walkReducer(start, { type: "fix", fix: fix(47, 2000) });
  assert.equal(teleported.meters, 0);
  assert.equal(teleported.path.length, 1);
});
test("pause and end exclude movement; resume establishes a fresh baseline", () => {
  let state = walkReducer(initial, { type: "fix", fix: fix(46, 1000) });
  state = walkReducer(state, { type: "pause" });
  assert.equal(
    walkReducer(state, { type: "fix", fix: fix(46.001, 10000) }),
    state,
  );
  assert.equal(walkReducer(state, { type: "tick", seconds: 10 }), state);
  state = walkReducer(state, { type: "pause" });
  state = walkReducer(state, { type: "fix", fix: fix(46.001, 11000) });
  assert.equal(state.meters, 0);
  state = walkReducer(state, { type: "end" });
  assert.equal(state.ended, true);
  assert.equal(state.running, false);
  assert.deepEqual(walkReducer(state, { type: "reset" }), initial);
});
