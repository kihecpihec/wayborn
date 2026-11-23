import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { tileEngineSource } from "./tileEngine";

test("stalled map-source request times out and a later request recovers", async () => {
  let calls = 0;
  const engine = runInNewContext(tileEngineSource + ";WaybornEngine.create()", {
    WaybornPixel: {}, AbortController, clearTimeout,
    setTimeout: (fn: () => void) => setTimeout(fn, 10),
    fetch: async (_url: string, options: { signal: AbortSignal }) => {
      calls++;
      if (calls === 1) return new Promise((_, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("timeout")));
      });
      return { ok: true, json: async () => ({ tiles: ["https://fixture/{z}/{x}/{y}"], maxzoom: 14 }) };
    },
  });
  await assert.rejects(engine.tilejson(), /timeout/);
  const recovered = await engine.tilejson();
  assert.equal(recovered.tpl, "https://fixture/{z}/{x}/{y}");
  assert.equal(calls, 2);
});
