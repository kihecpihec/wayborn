import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { foregroundWalk, idleWalk } from "../src/foregroundWalk";
import { createWalkRecorder } from "../src/walkRecorder";
import { migrateWalkStorage, walkStorage } from "../src/walkStorage";
import { openSqlite } from "./sqliteFixture";

const fix = (latitude: number, timestamp: number) =>
  ({ type: "fix", fix: { latitude, longitude: 14, timestamp, accuracy: 5 } }) as const;

// Records a real walk through the production reducer and recorder: two moving fixes.
async function walkAs(accountId: string, db: Parameters<typeof walkStorage>[0], id: string) {
  const recorder = createWalkRecorder(walkStorage(db, accountId), { newId: () => id, now: () => 20000 });
  let state = idleWalk;
  for (const action of [{ type: "start" }, fix(46, 1000), fix(46.0001, 11000), { type: "finish" }] as const) {
    const next = foregroundWalk(state, action);
    recorder.observe(state, next);
    state = next;
  }
  await recorder.settled();
}

export async function exerciseAccountIsolation() {
  const dir = mkdtempSync(join(tmpdir(), "wayborn-isolation-"));
  const path = join(dir, "walks.sqlite");
  let { sqlite, db } = openSqlite(path);
  try {
    await migrateWalkStorage(db);
    // ISOLATION-01: A has a pending walk; B signs in on the same device.
    await walkAs("account-a", db, "walk-a");
    const a = () => walkStorage(db, "account-a");
    const b = () => walkStorage(db, "account-b");
    assert.deepEqual(await a().pending(), [{ id: "walk-a", finishedAt: 20000 }]);
    assert.deepEqual(await b().pending(), []);
    assert.deepEqual(await b().drafts(), []);
    assert.deepEqual(await b().samples("walk-a"), []);
    assert.equal(await b().finish("walk-a", 25000), false);
    assert.equal(await b().discard("walk-a"), false);
    await walkAs("account-b", db, "walk-b");
    assert.deepEqual((await b().pending()).map((walk) => walk.id), ["walk-b"]);

    // ISOLATION-02: after a restart A still owns the same expedition ID, unchanged.
    sqlite.close();
    ({ sqlite, db } = openSqlite(path));
    await migrateWalkStorage(db);
    assert.deepEqual(await a().pending(), [{ id: "walk-a", finishedAt: 20000 }]);
    assert.equal((await a().samples("walk-a")).length, 2);
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

// STORE-01: an interrupted process leaves a draft; recovery queues it, discard removes it.
export async function exerciseDraftRecovery() {
  const dir = mkdtempSync(join(tmpdir(), "wayborn-recovery-"));
  const path = join(dir, "walks.sqlite");
  let { sqlite, db } = openSqlite(path);
  try {
    await migrateWalkStorage(db);
    const recorder = createWalkRecorder(walkStorage(db, "account-a"), { newId: () => "draft-1", now: () => 5000 });
    let state = idleWalk;
    for (const action of [{ type: "start" }, fix(46, 1000), fix(46.0001, 11000), { type: "interrupt" }, { type: "start" }, fix(46.01, 61000), fix(46.0101, 71000)] as const) {
      const next = foregroundWalk(state, action);
      recorder.observe(state, next);
      state = next;
    }
    await recorder.settled(); // process is killed here: no finish was ever requested
    sqlite.close();
    ({ sqlite, db } = openSqlite(path));
    await migrateWalkStorage(db);
    const store = walkStorage(db, "account-a");
    assert.deepEqual(await store.drafts(), [{ id: "draft-1", startedAt: 1000 }]);
    assert.deepEqual(await store.pending(), []);
    const samples = await store.samples("draft-1");
    // The gap between 11 s and 61 s must not be bridged: the later samples are a fresh segment.
    assert.deepEqual(samples.map((s) => s.segment), [0, 0, 1, 1]);
    assert.equal(await store.recover("draft-1"), true);
    assert.deepEqual(await store.pending(), [{ id: "draft-1", finishedAt: 71000 }]);
    assert.deepEqual(await store.drafts(), []);
    assert.equal(await store.discard("draft-1"), false); // queued work is never discarded here
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

// STORE-02: a failed sample write must not publish an incomplete expedition.
// After reopening, retain the durable prefix as an unfinished recoverable draft.
export async function exerciseInterruptedFinish() {
  const dir = mkdtempSync(join(tmpdir(), "wayborn-interrupted-finish-"));
  const path = join(dir, "walks.sqlite");
  let { sqlite, db } = openSqlite(path);
  try {
    await migrateWalkStorage(db);
    const errors: unknown[] = [];
    const recorder = createWalkRecorder(walkStorage(db, "account-a"), {
      newId: (() => { let id = 0; return () => `walk-${++id}`; })(),
      now: () => 20000,
      onError: (error) => errors.push(error),
    });
    let state = idleWalk;
    function observe(action: Parameters<typeof foregroundWalk>[1]) {
      const next = foregroundWalk(state, action);
      recorder.observe(state, next);
      state = next;
    }
    observe({ type: "start" });
    observe(fix(46, 1000));
    await recorder.settled();
    sqlite.exec("CREATE TRIGGER reject_sample BEFORE INSERT ON walk_sample BEGIN SELECT RAISE(ABORT, 'sample write failed'); END");
    observe(fix(46.0001, 11000));
    observe({ type: "finish" });
    await recorder.settled();
    assert.equal(errors.length, 1);
    assert.deepEqual(await walkStorage(db, "account-a").pending(), []);
    assert.deepEqual(await walkStorage(db, "account-a").drafts(), [{ id: "walk-1", startedAt: 1000 }]);

    // Failure is scoped to this walk; another walk can still persist successfully.
    sqlite.exec("DROP TRIGGER reject_sample");
    observe({ type: "start" });
    observe(fix(46, 1000));
    observe(fix(46.0001, 11000));
    observe({ type: "finish" });
    await recorder.settled();
    assert.equal(errors.length, 1);
    assert.deepEqual(await walkStorage(db, "account-a").pending(), [{ id: "walk-2", finishedAt: 20000 }]);
    sqlite.close();
    ({ sqlite, db } = openSqlite(path));
    await migrateWalkStorage(db);
    const store = walkStorage(db, "account-a");
    assert.deepEqual(await store.drafts(), [{ id: "walk-1", startedAt: 1000 }]);
    assert.equal((await store.samples("walk-1")).length, 1);
    assert.equal((await store.samples("walk-2")).length, 2);
    assert.equal(await store.recover("walk-1"), true);
    assert.deepEqual(await store.pending(), [
      { id: "walk-1", finishedAt: 1000 },
      { id: "walk-2", finishedAt: 20000 },
    ]);
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
