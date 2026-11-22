import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";
import { idle, initial, walkReducer } from "../src/walkState";
import { createMapBridge } from "../src/mapBridge";
import { pixelRendererSource } from "../src/pixelRenderer";
import { tileEngineSource } from "../src/tileEngine";

const point = { latitude: 46, longitude: 14, timestamp: 1000, accuracy: 5 };
export function idleStart() {
  assert.equal(idle.running, false);
  assert.equal(idle.started, false);
  let walk = walkReducer(idle, { type: "fix", fix: point });
  walk = walkReducer(walk, { type: "tick", seconds: 10 });
  assert.equal(walk.elapsed, 0);
  assert.equal(walk.meters, 0);
  assert.deepEqual(walk.cells, []);
  assert.equal(walk.position, null);
  walk = walkReducer(walk, { type: "start" });
  assert.equal(walk.running, true);
  assert.equal(walk.started, true);
  assert.equal(walk.last, null);
}
export function pausePosition() {
  const active = walkReducer(initial, { type: "fix", fix: point });
  const paused = walkReducer(active, { type: "pause" });
  const resumed = walkReducer(paused, { type: "pause" });
  for (const walk of [paused, resumed]) {
    assert.deepEqual(walk.position, point);
    assert.equal(walk.meters, 0);
    assert.deepEqual(walk.cells, active.cells);
    assert.equal(walk.last, null);
  }
  const recovered = walkReducer(resumed, {
    type: "fix", fix: { ...point, latitude: 47, timestamp: 11000 },
  });
  assert.equal(recovered.meters, 0);
  assert.equal(recovered.path.length, 1);
}
export function newWalkPosition() {
  let walk = walkReducer(initial, { type: "fix", fix: point });
  walk = walkReducer(walk, { type: "tick", seconds: 10 });
  walk = walkReducer(walk, { type: "end" });
  walk = walkReducer(walk, { type: "reset" });
  assert.deepEqual(walk.position, point);
  assert.equal(walk.running, true);
  assert.equal(walk.ended, false);
  assert.equal(walk.elapsed, 0);
  assert.equal(walk.meters, 0);
  assert.equal(walk.last, null);
  assert.deepEqual(walk.cells, []);
  assert.deepEqual(walk.path, []);
  for (let i = 0; i < 20; i++) {
    walk = walkReducer(walk, { type: "pause" });
    walk = walkReducer(walk, { type: "pause" });
    walk = walkReducer(walk, { type: "end" });
    walk = walkReducer(walk, { type: "reset" });
    assert.deepEqual(walk.position, point);
    assert.equal(walk.last, null);
    assert.equal(walk.meters, 0);
    assert.equal(walk.elapsed, 0);
  }
}
export function mapReload() {
  const received: unknown[] = [];
  const bridge = createMapBridge((script: string) => {
    runInNewContext(script, { window: { updateWayborn: (p: unknown) => received.push(p) } });
  });
  const before = { point, path: [point], pixel: true, recenter: 2 };
  bridge.update(before);
  assert.equal(received.length, 0);
  bridge.loaded();
  assert.equal(received.length, 1);
  bridge.loading();
  const latest = { ...before, pixel: false, recenter: 3 };
  bridge.update(latest);
  assert.equal(received.length, 1);
  bridge.loaded();
  // JSON normalization avoids comparing objects from different JS realms.
  assert.deepEqual(JSON.parse(JSON.stringify(received)), [
    { type: "wayborn-location", ...before },
    { type: "wayborn-location", ...latest },
  ]);
  bridge.loading();
  bridge.loaded();
  assert.equal(received.length, 3, "reload replays even without a props change");
}
export async function unavailableCache() {
  const fixture = readFileSync(new URL("../fixtures/ljubljana-14-8852-5825.pbf", import.meta.url));
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const boundedTimer = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, Math.min(ms, 10));
    timers.add(id);
    return id;
  };
  const context = {
    indexedDB: { open: () => ({}) }, // Native cache open never answers.
    setTimeout: boundedTimer, clearTimeout,
    TextDecoder, TextEncoder, AbortController,
    fetch: async (url: string) => url.endsWith("/planet")
      ? { ok: true, json: async () => ({ tiles: ["https://fixture/{z}/{x}/{y}.pbf"], maxzoom: 14 }) }
      : { ok: true, arrayBuffer: async () => fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength) },
  };
  try {
    const engine = runInNewContext(pixelRendererSource + tileEngineSource + ";WaybornEngine.create();", context);
    const result = await Promise.race([
      engine.draw({ z: 17, x: 70819, y: 46603, pass: "f" }),
      new Promise<never>((_, reject) => {
        const id = setTimeout(() => reject(new Error("Pixel rendering stalled on optional storage")), 1000);
        timers.add(id);
      }),
    ]);
    assert.ok(result.aw > 0 && result.ah > 0);
    assert.equal(result.data.length, result.aw * result.ah * 4);
    assert.ok(result.data.some((value: number) => value > 0));
  } finally {
    for (const id of timers) clearTimeout(id);
  }
}
