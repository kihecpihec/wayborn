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
  assert.equal(weak.last, null);
  assert.equal(weak.meters, state.meters);
  assert.deepEqual(weak.cells, state.cells);
  const jitter = walkReducer(state, {
    type: "fix",
    fix: fix(46.051501, 12000),
  });
  assert.equal(jitter.meters, state.meters);
  assert.deepEqual(jitter.cells, state.cells);
});
test("teleports reset the trail baseline without adding distance", () => {
  const start = walkReducer(initial, { type: "fix", fix: fix(46, 1000) });
  const teleported = walkReducer(start, { type: "fix", fix: fix(47, 2000) });
  assert.equal(teleported.meters, 0);
  assert.equal(teleported.path.length, 0);
  assert.deepEqual(teleported.cells, start.cells);
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
  assert.deepEqual(walkReducer(state, { type: "reset" }), {
    ...initial, session: 1, history: [{ session: 0, meters: 0, elapsed: 0 }], position: fix(46.001, 11000),
  });
});

test("weak GPS breaks continuity and stale fixes cannot restore it", () => {
  const start = walkReducer(initial, { type: "fix", fix: fix(46, 1000) });
  const weak = walkReducer(start, {
    type: "fix",
    fix: fix(46.001, 20000, 100),
  });
  assert.equal(
    walkReducer(weak, { type: "fix", fix: fix(46.0001, 10000) }),
    weak,
  );
  const recovered = walkReducer(weak, { type: "fix", fix: fix(46.001, 30000) });
  assert.equal(recovered.meters, 0);
  assert.equal(recovered.path.length, 1);
});

test("invalid GPS cannot corrupt distance or discover a cell", () => {
  const start = walkReducer(initial, { type: "fix", fix: fix(46, 1000) });
  for (const patch of [
    { latitude: NaN },
    { longitude: Infinity },
    { latitude: 91 },
    { longitude: -181 },
    { accuracy: null },
    { accuracy: -1 },
    { accuracy: NaN },
    { timestamp: NaN },
  ]) {
    const next = walkReducer(start, {
      type: "fix",
      fix: { ...fix(46.001, 20000), ...patch },
    });
    assert.equal(next.meters, start.meters);
    assert.deepEqual(next.cells, start.cells);
    assert.equal(next.last, null);
  }
});

test("finished walks ignore pause and movement until explicit reset", () => {
  const ended = walkReducer(initial, { type: "end" });
  assert.equal(walkReducer(ended, { type: "pause" }), ended);
  assert.equal(walkReducer(ended, { type: "fix", fix: fix(46, 1000) }), ended);
  assert.equal(walkReducer(ended, { type: "tick", seconds: 10 }), ended);
});

test("elapsed time rejects invalid or negative timer deltas", () => {
  for (const seconds of [-1, NaN, Infinity, 0])
    assert.equal(walkReducer(initial, { type: "tick", seconds }), initial);
  assert.equal(walkReducer(initial, { type: "tick", seconds: 2 }).elapsed, 2);
});

test("each rapid new walk requests a fresh GPS session and counts stationary time", () => {
  let state = initial;
  for (let i = 1; i <= 30; i++) {
    state = walkReducer(state, { type: "end" });
    state = walkReducer(state, { type: "reset" });
    assert.equal(state.session, i);
    state = walkReducer(state, { type: "fix", fix: fix(46, i * 10000) });
    state = walkReducer(state, { type: "tick", seconds: 2 });
    assert.equal(state.elapsed, 2);
    assert.equal(state.meters, 0);
  }
});

test('finish adds one session summary and new walk preserves history', () => {
  let state = walkReducer(initial, { type: 'tick', seconds: 12 });
  state = walkReducer(state, { type: 'end' });
  state = walkReducer(state, { type: 'end' });
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].elapsed, 12);
  state = walkReducer(state, { type: 'reset' });
  assert.equal(state.history.length, 1);
  assert.equal(state.elapsed, 0);
});
