import { exerciseSegmentCoverage } from "./exerciseSegmentCoverage";
import { exerciseGeographyBoundary, exerciseGeographyParity } from "./exerciseGeographyParity";
import { exerciseH3Trial, exerciseVersionedGeography } from "./exerciseH3Trial";
import { exerciseAccountIsolation, exerciseDraftRecovery, exerciseInterruptedFinish } from "./exerciseAccountIsolation";
import { exerciseWalkStorage } from "./exerciseWalkStorage";
import { exerciseSchemaUpgrade } from "./exerciseSchemaUpgrade";
import { requireDeviceEvidence } from "./deviceEvidence";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";
import { foregroundWalk, idleWalk } from "../src/foregroundWalk";
import { initial, walkReducer } from "../src/walkState";

type Step = {
  action: "sample" | "pause" | "resume" | "finish" | "elapsed" | "interrupt";
  latitude?: number;
  longitude?: number;
  timeMs?: number;
  accuracyM?: number | null;
  seconds?: number;
};
type Scenario = {
  id: string;
  given: string;
  when: string;
  then: string;
  steps?: Step[];
  expect?: Record<string, number | boolean | [number, number]>;
};
type Feature = { id: string; status: string; scenarios: Scenario[] };
const catalog = JSON.parse(
  readFileSync(
    new URL("../../../docs/specifications/features.json", import.meta.url),
    "utf8",
  ),
) as { features: Feature[] };

// Adapter only translates specification actions and observable results. Expected
// values come from the reviewed product scenarios, never from production helpers.
function exerciseWalk(scenario: Scenario) {
  assert.ok(
    scenario.steps?.length,
    `${scenario.id}: missing executable actions`,
  );
  assert.ok(
    scenario.expect && Object.keys(scenario.expect).length,
    `${scenario.id}: missing expected result`,
  );
  let walk = { ...initial };
  for (const step of scenario.steps) {
    switch (step.action) {
      case "sample":
        walk = walkReducer(walk, {
          type: "fix",
          fix: {
            latitude: step.latitude!,
            longitude: step.longitude!,
            timestamp: step.timeMs!,
            accuracy: step.accuracyM!,
          },
        });
        break;
      case "pause":
        if (walk.running) walk = walkReducer(walk, { type: "pause" });
        break;
      case "resume":
        if (!walk.running) walk = walkReducer(walk, { type: "pause" });
        break;
      case "interrupt":
        walk = walkReducer(walk, { type: "interrupt" });
        break;
      case "finish":
        walk = walkReducer(walk, { type: "end" });
        break;
      case "elapsed":
        walk = walkReducer(walk, { type: "tick", seconds: step.seconds! });
        break;
      default:
        assert.fail(`Unknown specification action: ${step.action}`);
    }
  }
  const observed: Record<string, number | boolean> = {
    distanceM: walk.meters,
    discoveryCount: walk.cells.length,
    elapsedSeconds: walk.elapsed,
    finished: walk.ended,
    running: walk.running,
    latitude: walk.position?.latitude ?? NaN,
    longitude: walk.position?.longitude ?? NaN,
  };
  for (const [key, expected] of Object.entries(scenario.expect!)) {
    assert.ok(key in observed, `Unknown observation: ${key}`);
    if (Array.isArray(expected)) {
      const value = observed[key];
      assert.ok(
        typeof value === "number" &&
          value >= expected[0] &&
          value <= expected[1],
        `${scenario.id}: ${key} expected ${expected[0]}..${expected[1]}, received ${value}`,
      );
    } else assert.equal(observed[key], expected, `${scenario.id}: ${key}`);
  }
}

// Execute the same JavaScript used by the iframe and WebView with a controlled clock.
async function exerciseMapLoading(scenario: Scenario) {
  const { mapLoadingSource } = await import("../src/mapLoading");
  const states: string[] = [];
  let expire: (() => void) | undefined;
  const create = runInNewContext(mapLoadingSource, {
    setTimeout(callback: () => void, delay: number) {
      assert.equal(delay, 3000);
      expire = callback;
      return 1;
    },
    clearTimeout() {
      expire = undefined;
    },
  }) as (show: (state: string) => void) => { begin(): void; tileDrawn(): void };
  const loading = create((state) => states.push(state));
  loading.begin();
  if (scenario.id === "MAP-04") {
    assert.ok(expire);
    expire();
    loading.begin();
  }
  loading.tileDrawn();
  expire?.();
  assert.deepEqual(
    states,
    scenario.id === "MAP-04"
      ? ["loading", "unavailable", "loading", "ready"]
      : ["loading", "ready"],
  );
}

// Explicit per-scenario registration prevents a new implemented case from being
// accidentally counted as covered. Future integration/UI adapters belong here or
// in their real service test suite; never use a mock as proof of the real feature.
const executable: Record<string, (scenario: Scenario) => void | Promise<void>> =
  Object.fromEntries(
    [
      "GPS-01",
      "GPS-02",
      "GPS-03",
      "GPS-04",
      "GPS-05",
      "GPS-06",
      "GPS-07",
      "GPS-08",
      "GPS-09",
      "GPS-10",
      "GPS-11",
      "GPS-12",
      "GPS-13",
      "GPS-14",
      "GPS-15",
      "GPS-16",
      "GPS-17",
    ].map((id) => [id, exerciseWalk]),
  );

executable["MAP-04"] = exerciseMapLoading;
executable["MAP-05"] = exerciseMapLoading;

const sample = (latitude: number, timestamp: number, accuracy = 5) =>
  ({ type: "fix", fix: { latitude, longitude: 0, timestamp, accuracy } }) as const;

executable["LIFE-04"] = () => {
  assert.deepEqual(foregroundWalk(idleWalk, sample(0, 1000)), idleWalk);
  const waiting = foregroundWalk(idleWalk, { type: "start" });
  assert.equal(waiting.phase, "waiting");
  assert.equal(foregroundWalk(waiting, sample(0, 1000, 60)).phase, "waiting");
  assert.equal(foregroundWalk(waiting, sample(0, 2000)).phase, "active");
};

executable["LIFE-05"] = () => {
  let walk = foregroundWalk(idleWalk, { type: "start" });
  walk = foregroundWalk(walk, sample(0, 1000));
  walk = foregroundWalk(walk, sample(0.0001, 11000));
  assert.ok(walk.track.meters > 11 && walk.track.meters < 12);
  walk = foregroundWalk(walk, { type: "interrupt" });
  assert.equal(walk.phase, "interrupted");
  assert.equal(walk.track.path.length, 0);
  assert.deepEqual(foregroundWalk(walk, { type: "tick", seconds: 60 }), walk);
  walk = foregroundWalk(walk, { type: "start" });
  walk = foregroundWalk(walk, sample(0.01, 71000));
  assert.ok(walk.track.meters > 11 && walk.track.meters < 12);
  assert.equal(walk.track.path.length, 1);
  assert.deepEqual(walk.track.cells, []);
};

executable["STORE-01"] = exerciseDraftRecovery;
executable["STORE-02"] = exerciseInterruptedFinish;
executable["STORE-03"] = exerciseSchemaUpgrade;
executable["STORE-04"] = exerciseWalkStorage;
executable["ISOLATION-01"] = exerciseAccountIsolation;
executable["ISOLATION-02"] = exerciseAccountIsolation;
executable["GEO-01"] = exerciseGeographyParity;
executable["GEO-02"] = exerciseGeographyBoundary;
executable["GEO-03"] = exerciseH3Trial;
executable["GEO-04"] = exerciseVersionedGeography;
executable["GEO-05"] = exerciseSegmentCoverage;

for (const id of [
  "AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04", "NAV-03", "NAV-04", "NAV-05",
  "MAP-01", "MAP-02", "MAP-03", "LIFE-01", "LIFE-03", "ACCESS-03", "STARTUP-01",
]) {
  executable[id] = async () => {
    try {
      await promisify(execFile)(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--grep", id], {
        cwd: new URL("..", import.meta.url), timeout: 180000,
      });
    } catch (error) {
      // Surface Playwright's own report so a CI failure says which assertion failed.
      const { stdout = "" } = error as { stdout?: string };
      throw new Error(`${id} browser test failed:\n${stdout.slice(-4000)}`, { cause: error });
    }
  };
}

// Device-level scenarios: LIFE-02 has no automated equivalent; LIFE-01 runs its
// browser case above and also needs the recorded phone result.
executable["LIFE-02"] = () => requireDeviceEvidence("LIFE-02");
const lifeBrowser = executable["LIFE-01"];
executable["LIFE-01"] = async (scenario) => {
  await lifeBrowser(scenario);
  requireDeviceEvidence("LIFE-01");
};

test("specification baseline has complete implemented coverage and no orphan tests", () => {
  const ids = new Set<string>();
  for (const feature of catalog.features) {
    assert.ok(["planned", "implemented"].includes(feature.status));
    assert.ok(feature.scenarios.length);
    for (const scenario of feature.scenarios) {
      assert.ok(!ids.has(scenario.id), `Duplicate scenario: ${scenario.id}`);
      ids.add(scenario.id);
      if (feature.status === "implemented")
        assert.ok(
          executable[scenario.id],
          `Missing acceptance adapter: ${scenario.id}`,
        );
    }
  }
  for (const id of Object.keys(executable))
    assert.ok(ids.has(id), `Orphan acceptance test: ${id}`);
  const baseline = JSON.parse(
    readFileSync(
      new URL("../../../docs/specifications/baseline.json", import.meta.url),
      "utf8",
    ),
  ) as { features: Record<string, { status: string; scenarios: string[] }> };
  for (const [id, contract] of Object.entries(baseline.features)) {
    const feature = catalog.features.find((f) => f.id === id);
    assert.ok(feature, `Baseline feature removed: ${id}`);
    assert.equal(
      feature.status,
      contract.status,
      `Baseline status changed: ${id}`,
    );
    assert.deepEqual(
      feature.scenarios.map((s) => s.id),
      contract.scenarios,
      `Baseline scenarios changed: ${id}`,
    );
  }
});

for (const feature of catalog.features) {
  for (const scenario of feature.scenarios) {
    const title = `${scenario.id}: Given ${scenario.given}; when ${scenario.when}; then ${scenario.then}`;
    const execute = executable[scenario.id];
    if (execute) test(title, () => execute(scenario));
    else if (feature.status === "planned") test.todo(title);
    else
      test(title, () =>
        assert.fail(
          `Implemented feature lacks acceptance test: ${scenario.id}`,
        ),
      );
  }
}
