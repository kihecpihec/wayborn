import { DatabaseSync } from "node:sqlite";
import type { WalkDatabase } from "../src/walkStorage";

// Real SQLite file through the same WalkDatabase boundary the app uses.
export function openSqlite(path: string) {
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
