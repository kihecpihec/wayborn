import * as SQLite from "expo-sqlite";
import type { WalkDatabase } from "./walkStorage";

export async function openWalkDatabase(): Promise<WalkDatabase | null> {
  const db = await SQLite.openDatabaseAsync("wayborn-walks.db");
  return {
    exec: (sql) => db.execAsync(sql),
    async run(sql, ...values) {
      const { changes } = await db.runAsync(sql, values);
      return { changes };
    },
    all: <T,>(sql: string, ...values: (string | number)[]) => db.getAllAsync<T>(sql, values),
  };
}
