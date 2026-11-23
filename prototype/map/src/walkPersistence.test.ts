import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openSqlite } from "../acceptance/sqliteFixture";
import { createAccountWalkStore } from "./accountWalkStore";
import { foregroundWalk, idleWalk } from "./foregroundWalk";
import { createWalkRecorder } from "./walkRecorder";
import { migrateWalkStorage, walkStorage } from "./walkStorage";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "wayborn-persistence-"));
  const { sqlite, db } = openSqlite(join(dir, "walks.sqlite"));
  return {
    sqlite,
    db,
    close() {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
const fix = (latitude: number, timestamp: number) =>
  ({
    type: "fix",
    fix: { latitude, longitude: 14, accuracy: 5, timestamp },
  }) as const;

test("storage blocks start until initialization and reads succeed; failure can be retried", async () => {
  const f = fixture();
  try {
    await migrateWalkStorage(f.db);
    let resolve!: (db: typeof f.db) => void;
    let attempts = 0;
    const state = createAccountWalkStore("account-a", () => {
      attempts++;
      return attempts === 1
        ? Promise.reject(new Error("open failed"))
        : new Promise((r) => {
            resolve = r;
          });
    });
    assert.equal(state.getSnapshot().canStart, false);
    await state.load();
    assert.equal(state.getSnapshot().status, "failed");
    assert.equal(state.getSnapshot().canStart, false);
    const retry = state.load();
    assert.equal(state.getSnapshot().status, "loading");
    assert.equal(state.getSnapshot().canStart, false);
    resolve(f.db);
    await retry;
    assert.equal(state.getSnapshot().status, "ready");
    assert.equal(state.getSnapshot().canStart, true);
    const readFailure = createAccountWalkStore("account-a", async () => ({
      ...f.db,
      all: async () => {
        throw Error("read failed");
      },
    }));
    await readFailure.load();
    assert.equal(readFailure.getSnapshot().status, "failed");
    assert.equal(readFailure.getSnapshot().canStart, false);
    const browser = createAccountWalkStore("account-a", async () => null);
    await browser.load();
    assert.equal(browser.getSnapshot().status, "unavailable");
    assert.equal(browser.getSnapshot().canStart, true);
  } finally {
    f.close();
  }
});

test("recovery errors stay actionable and retries preserve account isolation", async () => {
  const f = fixture();
  try {
    await migrateWalkStorage(f.db);
    const a = walkStorage(f.db, "account-a");
    await a.start("draft", 1000);
    await a.append("draft", {
      sequence: 0,
      segment: 0,
      latitude: 46,
      longitude: 14,
      accuracy: 5,
      timestamp: 1000,
    });
    const state = createAccountWalkStore("account-a", async () => f.db);
    await state.load();
    f.sqlite.exec(
      "CREATE TRIGGER reject_finish BEFORE INSERT ON walk_outbox BEGIN SELECT RAISE(ABORT, 'write failed'); END",
    );
    assert.equal(await state.settle("recover", "draft"), false);
    assert.notEqual(state.getSnapshot().error, "");
    assert.deepEqual(await a.pending(), []);
    f.sqlite.exec("DROP TRIGGER reject_finish");
    assert.equal(await state.settle("recover", "draft"), true);
    assert.equal(state.getSnapshot().error, "");
    const b = createAccountWalkStore("account-b", async () => f.db);
    await b.load();
    assert.deepEqual(b.getSnapshot().pending, []);
    assert.equal(await b.settle("discard", "draft"), false);
    assert.deepEqual(await a.pending(), [{ id: "draft", finishedAt: 1000 }]);
  } finally {
    f.close();
  }
});

test("finish waits for durable writes and retries failed samples without losing or duplicating them", async () => {
  const f = fixture();
  try {
    await migrateWalkStorage(f.db);
    const store = walkStorage(f.db, "account-a");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const recorder = createWalkRecorder(
      {
        ...store,
        async finish(id, at) {
          await gate;
          return store.finish(id, at);
        },
      },
      { newId: () => "walk", now: () => 20000 },
    );
    let state = idleWalk;
    for (const action of [{ type: "start" }, fix(46, 1000)] as const) {
      const next = foregroundWalk(state, action);
      recorder.observe(state, next);
      state = next;
    }
    await recorder.settled();
    f.sqlite.exec(
      "CREATE TRIGGER reject_sample BEFORE INSERT ON walk_sample BEGIN SELECT RAISE(ABORT, 'sample write failed'); END",
    );
    const next = foregroundWalk(state, fix(46.0001, 11000));
    recorder.observe(state, next);
    await recorder.settled();
    await assert.rejects(recorder.finish(), /sample write failed/);
    assert.deepEqual(await store.pending(), []);
    f.sqlite.exec("DROP TRIGGER reject_sample");
    let acknowledged = false;
    const finished = recorder.finish().then(() => {
      acknowledged = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(acknowledged, false);
    assert.deepEqual(await store.pending(), []);
    release();
    await finished;
    assert.equal(acknowledged, true);
    await recorder.finish();
    assert.deepEqual(await store.pending(), [
      { id: "walk", finishedAt: 20000 },
    ]);
    assert.deepEqual(
      (await store.samples("walk")).map((s) => s.sequence),
      [0, 1],
    );
  } finally {
    f.close();
  }
});

test("recorder excludes rejected jumps and keeps the following accepted fix in a new segment", async () => {
  const f = fixture();
  try {
    await migrateWalkStorage(f.db);
    const store = walkStorage(f.db, "account-a");
    const recorder = createWalkRecorder(store, {
      newId: () => "walk",
      now: () => 20000,
    });
    let state = idleWalk;
    for (const action of [
      { type: "start" },
      fix(46, 1000),
      fix(47, 2000),
      fix(47.0001, 12000),
    ] as const) {
      const next = foregroundWalk(state, action);
      recorder.observe(state, next);
      state = next;
    }
    await recorder.finish();
    assert.deepEqual(
      (await store.samples("walk")).map((s) => ({
        at: s.timestamp,
        segment: s.segment,
      })),
      [
        { at: 1000, segment: 0 },
        { at: 12000, segment: 1 },
      ],
    );
  } finally {
    f.close();
  }
});

test("discard transactions cannot absorb another account's concurrent recording writes", async () => {
  const f = fixture();
  try {
    await migrateWalkStorage(f.db);
    let entered!: () => void;
    const began = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const db = {
      ...f.db,
      async exec(sql: string) {
        await f.db.exec(sql);
        if (sql === "BEGIN IMMEDIATE") {
          entered();
          await gate;
        }
      },
    };
    const a = walkStorage(db, "account-a");
    const b = walkStorage(db, "account-b");
    await a.start("draft-a", 1000);
    const discarding = a.discard("draft-a");
    await began;
    const recording = b.start("draft-b", 2000);
    await new Promise((resolve) => setImmediate(resolve));
    const beforeCommit = await b.drafts();
    release();
    await Promise.all([discarding, recording]);
    assert.deepEqual(beforeCommit, []);
    assert.deepEqual(await a.drafts(), []);
    assert.deepEqual(await b.drafts(), [{ id: "draft-b", startedAt: 2000 }]);
  } finally {
    f.close();
  }
});

test("a list read failure after a durable save can be retried without blocking the next walk", async () => {
  const f = fixture();
  try {
    await migrateWalkStorage(f.db);
    let failReads = false;
    const db = {
      ...f.db,
      async all<T>(sql: string, ...args: (string | number)[]) {
        if (failReads) throw Error("read failed");
        return f.db.all<T>(sql, ...args);
      },
    };
    const state = createAccountWalkStore("account-a", async () => db);
    await state.load();
    const store = state.getSnapshot().store!;
    await store.start("walk", 1000);
    await store.finish("walk", 2000);
    failReads = true;
    await state.refresh();
    assert.equal(state.getSnapshot().refreshFailed, true);
    assert.equal(state.getSnapshot().canStart, true);
    failReads = false;
    await state.refresh();
    assert.equal(state.getSnapshot().refreshFailed, false);
    assert.equal(state.getSnapshot().error, "");
    assert.deepEqual(state.getSnapshot().pending, [{ id: "walk", at: 2000 }]);
  } finally {
    f.close();
  }
});
