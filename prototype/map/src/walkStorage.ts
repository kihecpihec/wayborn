type Value = string | number;
export interface WalkDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, ...values: Value[]): Promise<{ changes: number }>;
  all<T>(sql: string, ...values: Value[]): Promise<T[]>;
}

type WalkSample = {
  sequence: number;
  segment: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export async function migrateWalkStorage(db: WalkDatabase) {
  await db.exec("PRAGMA foreign_keys = ON");
  await db.exec("BEGIN IMMEDIATE");
  try {
    const [{ user_version: version }] = await db.all<{ user_version: number }>("PRAGMA user_version");
    if (version === 1) {
      await db.exec("COMMIT");
      return;
    }
    if (version !== 0) throw new Error("Unsupported walk database version");
    await db.exec(`
      CREATE TABLE walk (
        account_id TEXT NOT NULL,
        id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        PRIMARY KEY (account_id, id)
      );
      CREATE TABLE walk_sample (
        account_id TEXT NOT NULL,
        walk_id TEXT NOT NULL,
        sequence INTEGER NOT NULL CHECK (sequence >= 0),
        segment INTEGER NOT NULL CHECK (segment >= 0),
        latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
        longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
        accuracy REAL NOT NULL CHECK (accuracy >= 0),
        recorded_at INTEGER NOT NULL,
        PRIMARY KEY (account_id, walk_id, sequence),
        FOREIGN KEY (account_id, walk_id) REFERENCES walk(account_id, id)
      );
      CREATE TABLE walk_outbox (
        account_id TEXT NOT NULL,
        walk_id TEXT NOT NULL,
        finished_at INTEGER NOT NULL,
        PRIMARY KEY (account_id, walk_id),
        FOREIGN KEY (account_id, walk_id) REFERENCES walk(account_id, id)
      );
      PRAGMA user_version = 1;
    `);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

export function walkStorage(db: WalkDatabase, accountId: string) {
  if (!accountId.trim()) throw new Error("An account is required for walk storage");
  return {
    async start(id: string, startedAt: number) {
      await db.run("INSERT INTO walk VALUES (?, ?, ?)", accountId, id, startedAt);
    },
    async append(id: string, sample: WalkSample) {
      const result = await db.run(`
        INSERT INTO walk_sample
        SELECT account_id, id, ?, ?, ?, ?, ?, ? FROM walk
        WHERE account_id = ? AND id = ? AND NOT EXISTS (
          SELECT 1 FROM walk_outbox WHERE account_id = walk.account_id AND walk_id = walk.id
        )
      `, sample.sequence, sample.segment, sample.latitude, sample.longitude,
        sample.accuracy, sample.timestamp, accountId, id);
      return result.changes === 1;
    },
    drafts() {
      return db.all<{ id: string; startedAt: number }>(`
        SELECT id, started_at AS startedAt FROM walk
        WHERE account_id = ? AND NOT EXISTS (
          SELECT 1 FROM walk_outbox WHERE account_id = walk.account_id AND walk_id = walk.id
        )
        ORDER BY started_at, id
      `, accountId);
    },
    samples(id: string) {
      return db.all<WalkSample>(`
        SELECT sequence, segment, latitude, longitude, accuracy, recorded_at AS timestamp
        FROM walk_sample WHERE account_id = ? AND walk_id = ? ORDER BY sequence
      `, accountId, id);
    },
    // Outbox existence defines completion, so both transitions share one SQLite statement.
    async finish(id: string, finishedAt: number) {
      const result = await db.run(`
        INSERT INTO walk_outbox
        SELECT account_id, id, ? FROM walk
        WHERE account_id = ? AND id = ? AND started_at <= ?
        ON CONFLICT (account_id, walk_id) DO NOTHING
      `, finishedAt, accountId, id, finishedAt);
      return result.changes === 1;
    },
    pending() {
      return db.all<{ id: string; finishedAt: number }>(`
        SELECT walk_id AS id, finished_at AS finishedAt FROM walk_outbox
        WHERE account_id = ? ORDER BY finished_at, walk_id
      `, accountId);
    },
  };
}
