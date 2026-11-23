import { walkStorage, type WalkDatabase } from "./walkStorage";

type Entry = { id: string; at: number };
type Snapshot = {
  status: "loading" | "unavailable" | "failed" | "ready";
  canStart: boolean;
  store: ReturnType<typeof walkStorage> | null;
  drafts: Entry[];
  pending: Entry[];
  error: string;
  busy: boolean;
  refreshFailed: boolean;
};

// React and tests use the same account-scoped initialization/recovery boundary.
export function createAccountWalkStore(
  accountId: string,
  open: () => Promise<WalkDatabase | null>,
) {
  let snapshot: Snapshot = {
    status: "loading",
    canStart: false,
    store: null,
    drafts: [],
    pending: [],
    error: "",
    busy: false,
    refreshFailed: false,
  };
  let generation = 0;
  const listeners = new Set<() => void>();
  function update(patch: Partial<Snapshot>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }
  async function read(store: ReturnType<typeof walkStorage>) {
    const [drafts, pending] = await Promise.all([
      store.drafts(),
      store.pending(),
    ]);
    return {
      drafts: drafts.map((w) => ({ id: w.id, at: w.startedAt })),
      pending: pending.map((w) => ({ id: w.id, at: w.finishedAt })),
    };
  }
  async function refresh() {
    const store = snapshot.store;
    const current = generation;
    if (!store) return;
    try {
      const entries = await read(store);
      if (current === generation)
        update({ ...entries, error: "", refreshFailed: false });
    } catch {
      if (current === generation)
        update({
          error:
            "Saved walks could not be refreshed. Retry the list. Your recorded data is kept.",
          refreshFailed: true,
        });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      generation++;
    },
    async load() {
      const current = ++generation;
      update({
        status: "loading",
        canStart: false,
        store: null,
        error: "",
        refreshFailed: false,
      });
      try {
        const db = await open();
        if (current !== generation) return;
        if (!db) return update({ status: "unavailable", canStart: true });
        const store = walkStorage(db, accountId);
        const entries = await read(store);
        if (current === generation)
          update({ ...entries, store, status: "ready", canStart: true });
      } catch {
        if (current === generation)
          update({
            status: "failed",
            canStart: false,
            error:
              "Saved walks could not be opened on this device. Retry storage to continue.",
          });
      }
    },
    refresh,
    async settle(action: "recover" | "discard", id: string) {
      if (!snapshot.store || snapshot.busy) return false;
      update({ busy: true, error: "" });
      try {
        if (!(await snapshot.store[action](id)))
          throw new Error("Draft is unavailable");
        await refresh();
        return true;
      } catch {
        update({
          error:
            "This saved walk could not be updated. Retry the action. Your recorded data is kept.",
        });
        return false;
      } finally {
        update({ busy: false });
      }
    },
  };
}
