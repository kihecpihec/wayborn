import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateWalkStorage, walkStorage } from "../src/walkStorage";
import { openSqlite } from "./sqliteFixture";

const v1Schema = readFileSync(new URL("./walkStorageV1.sql", import.meta.url), "utf8");

// Rows written directly as a version-1 app left them, independent of today's storage code.
const seed = `
  INSERT INTO walk VALUES ('account-a', 'draft-a', 1000), ('account-a', 'queued-a', 500),
    ('account-b', 'queued-b', 700);
  INSERT INTO walk_sample VALUES
    ('account-a', 'draft-a', 0, 0, 46.05, 14.5, 5, 1000),
    ('account-a', 'draft-a', 1, 0, 46.0501, 14.5, 6, 11000),
    ('account-a', 'queued-a', 0, 0, 46.04, 14.49, 4, 500),
    ('account-b', 'queued-b', 0, 0, 46.03, 14.48, 3, 700);
  INSERT INTO walk_outbox VALUES ('account-a', 'queued-a', 900), ('account-b', 'queued-b', 800);
`;

function snapshot(sqlite: ReturnType<typeof openSqlite>["sqlite"]) {
  return ["walk", "walk_sample", "walk_outbox"].map((table) =>
    sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1, 2, 3`).all().map((row) => ({ ...row })));
}

// STORE-03: an existing database with pending work is opened by the current app.
export async function exerciseSchemaUpgrade() {
  const dir = mkdtempSync(join(tmpdir(), "wayborn-upgrade-"));
  const path = join(dir, "walks.sqlite");
  let { sqlite, db } = openSqlite(path);
  try {
    sqlite.exec(v1Schema);
    sqlite.exec(seed);
    const before = snapshot(sqlite);
    sqlite.close();

    ({ sqlite, db } = openSqlite(path));
    await migrateWalkStorage(db);
    assert.ok(Number((sqlite.prepare("PRAGMA user_version").get() as { user_version: number }).user_version) >= 1);
    assert.deepEqual(snapshot(sqlite), before, "upgrade must not change any stored row");

    const a = walkStorage(db, "account-a");
    const b = walkStorage(db, "account-b");
    assert.deepEqual(await a.drafts(), [{ id: "draft-a", startedAt: 1000 }]);
    assert.deepEqual(await a.pending(), [{ id: "queued-a", finishedAt: 900 }]);
    assert.deepEqual(await b.pending(), [{ id: "queued-b", finishedAt: 800 }]);
    assert.deepEqual(await b.drafts(), []);
    assert.deepEqual(await b.samples("draft-a"), []);
    assert.deepEqual(await a.samples("draft-a"), [
      { sequence: 0, segment: 0, latitude: 46.05, longitude: 14.5, accuracy: 5, timestamp: 1000 },
      { sequence: 1, segment: 0, latitude: 46.0501, longitude: 14.5, accuracy: 6, timestamp: 11000 },
    ]);

    // The upgraded draft keeps recording and finishes into the same account's queue.
    assert.equal(await a.append("draft-a",
      { sequence: 2, segment: 1, latitude: 46.06, longitude: 14.5, accuracy: 5, timestamp: 20000 }), true);
    assert.equal(await a.finish("draft-a", 21000), true);
    assert.deepEqual((await a.pending()).map((walk) => walk.id), ["queued-a", "draft-a"]);
    assert.deepEqual((await b.pending()).map((walk) => walk.id), ["queued-b"]);

    // Reopening an upgraded database is a no-op.
    sqlite.close();
    ({ sqlite, db } = openSqlite(path));
    const upgraded = snapshot(sqlite);
    await migrateWalkStorage(db);
    assert.deepEqual(snapshot(sqlite), upgraded);

    // A database from a newer app is refused without touching its rows or version.
    sqlite.exec("PRAGMA user_version = 99");
    await assert.rejects(migrateWalkStorage(db), /Unsupported walk database version/);
    assert.equal((sqlite.prepare("PRAGMA user_version").get() as { user_version: number }).user_version, 99);
    assert.deepEqual(snapshot(sqlite), upgraded);
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
