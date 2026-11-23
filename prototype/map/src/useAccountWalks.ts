import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createAccountWalkStore } from "./accountWalkStore";
import { openWalkDatabase } from "./walkDatabase";
import { migrateWalkStorage } from "./walkStorage";

let database: ReturnType<typeof openWalkDatabase> | undefined;
function shared() {
  if (!database) {
    const opening = openWalkDatabase().then(async (db) => {
      if (db) await migrateWalkStorage(db);
      return db;
    });
    database = opening;
    void opening.catch(() => {
      if (database === opening) database = undefined;
    });
  }
  return database;
}

export function useAccountWalks(accountId: string) {
  const controller = useMemo(
    () => createAccountWalkStore(accountId, shared),
    [accountId],
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    void controller.load();
    return () => controller.dispose();
  }, [controller]);
  return useMemo(
    () => ({
      ...snapshot,
      refresh: controller.refresh,
      retry: controller.load,
      settle: controller.settle,
    }),
    [snapshot, controller],
  );
}
