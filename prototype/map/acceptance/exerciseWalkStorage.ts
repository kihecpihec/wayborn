import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrateWalkStorage, walkStorage, type WalkDatabase } from "../src/walkStorage";

function open(path: string) {
  const sqlite = new DatabaseSync(path);
  const db: WalkDatabase = {
    async exec(sql) { sqlite.exec(sql); },
    async run(sql, ...values) { return { changes: Number(sqlite.prepare(sql).run(...values).changes) }; },
    async all<T>(sql: string, ...values: (string | number)[]) {
      return sqlite.prepare(sql).all(...values).map((row) => ({ ...row })) as T[];
    },
  };
  return { sqlite, db };
}

export async function exerciseWalkStorage() {
  const dir = mkdtempSync(join(tmpdir(), "wayborn-store-"));
  const path = join(dir, "walks.sqlite");
  let { sqlite, db } = open(path);
  try {
    await migrateWalkStorage(db);
    const first = walkStorage(db, "account-a");
    await first.start("walk-1", 1000);
    await first.append("walk-1", { sequence: 0, segment: 0, latitude: 46, longitude: 14, accuracy: 5, timestamp: 1000 });
    sqlite.close();
    ({ sqlite, db } = open(path));
    await migrateWalkStorage(db);
    const owner = walkStorage(db, "account-a");
    const other = walkStorage(db, "account-b");
    assert.deepEqual(await other.drafts(), []);
    assert.equal(await other.finish("walk-1", 2000), false);
    assert.deepEqual(await owner.drafts(), [{ id: "walk-1", startedAt: 1000 }]);
    assert.equal((await owner.samples("walk-1")).length, 1);
    sqlite.exec("CREATE TRIGGER reject_queue BEFORE INSERT ON walk_outbox BEGIN SELECT RAISE(ABORT, 'write failed'); END");
    await assert.rejects(owner.finish("walk-1", 2000), /write failed/);
    assert.equal((await owner.drafts()).length, 1);
    assert.deepEqual(await owner.pending(), []);
    sqlite.exec("DROP TRIGGER reject_queue");
    assert.equal(await owner.finish("walk-1", 2000), true);
    assert.equal(await owner.finish("walk-1", 3000), false);
    assert.deepEqual(await owner.drafts(), []);
    assert.deepEqual(await owner.pending(), [{ id: "walk-1", finishedAt: 2000 }]);
    assert.deepEqual(await other.pending(), []);
    assert.deepEqual(await other.samples("walk-1"), []);
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
