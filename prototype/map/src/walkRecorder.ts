import type { foregroundWalk } from "./foregroundWalk";
import type { walkStorage } from "./walkStorage";

type Session = ReturnType<typeof foregroundWalk>;
type Store = Pick<
  ReturnType<typeof walkStorage>,
  "start" | "append" | "finish"
>;
type Recording = {
  id: string;
  jobs: (() => Promise<unknown>)[];
  next: number;
  error: unknown;
  finishing: boolean;
};

/** Account-bound serialized writes. Failed jobs stay in memory for an explicit retry. */
export function createWalkRecorder(
  store: Store,
  options: {
    newId: () => string;
    now: () => number;
    onError?: (error: unknown) => void;
  },
) {
  let recording: Recording | null = null;
  let sequence = 0;
  let segment = 0;
  let lastTimestamp = 0;
  let queue: Promise<void> = Promise.resolve();
  function drain(walk: Recording) {
    queue = queue.then(async () => {
      if (walk.error) return;
      while (walk.next < walk.jobs.length) {
        try {
          if ((await walk.jobs[walk.next]()) === false)
            throw new Error("Walk storage refused the write");
          walk.next++;
        } catch (error) {
          walk.error = error;
          options.onError?.(error);
          return;
        }
      }
      walk.jobs = [];
      walk.next = 0;
    });
    return queue;
  }
  function enqueue(walk: Recording, job: () => Promise<unknown>) {
    walk.jobs.push(job);
    return drain(walk);
  }
  function finalize(walk: Recording) {
    if (!walk.finishing) {
      walk.finishing = true;
      const finishedAt = Math.max(options.now(), lastTimestamp);
      enqueue(walk, () => store.finish(walk.id, finishedAt));
    }
    return queue.then(() => {
      if (walk.error) throw walk.error;
    });
  }
  return {
    get activeId() {
      return recording?.id ?? null;
    },
    observe(previous: Session, next: Session) {
      const fix = next.track.last;
      // Rejected jumps can update the baseline without moving the accepted position.
      if (
        fix &&
        fix === next.track.position &&
        fix !== previous.track.last &&
        next.phase === "active"
      ) {
        if (!recording) {
          recording = {
            id: options.newId(),
            jobs: [],
            next: 0,
            error: null,
            finishing: false,
          };
          sequence = 0;
          segment = 0;
          const walk = recording;
          enqueue(walk, () => store.start(walk.id, fix.timestamp));
        } else if (next.track.path.length <= 1) segment++;
        const walk = recording;
        const sample = {
          sequence: sequence++,
          segment,
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy as number,
          timestamp: fix.timestamp,
        };
        lastTimestamp = fix.timestamp;
        enqueue(walk, () => store.append(walk.id, sample));
      }
      // Domain adapters can finish through observe. UI awaits finish() first.
      if (
        next.phase === "finished" &&
        previous.phase !== "finished" &&
        recording
      ) {
        const walk = recording;
        recording = null;
        void finalize(walk).catch(() => undefined);
      }
    },
    async finish() {
      const walk = recording;
      if (!walk) return;
      if (walk.error) {
        walk.error = null;
        drain(walk);
      }
      await finalize(walk);
      if (recording === walk) recording = null;
    },
    settled: () => queue,
  };
}
