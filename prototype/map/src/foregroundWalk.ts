import { initial, validWalkFix, walkReducer, type WalkAction } from "./walkState";

type Phase = "idle" | "waiting" | "active" | "paused" | "interrupted" | "finished";
type Summary = { number: number; meters: number; elapsed: number };
type Session = { phase: Phase; track: typeof initial; completed: Summary[] };
type Action = Extract<WalkAction, { type: "fix" | "tick" | "interrupt" }> |
  { type: "start" | "pause" | "finish" | "cancel" };

export const idleWalk: Session = { phase: "idle", track: initial, completed: [] };

export function foregroundWalk(state: Session, action: Action): Session {
  const { phase, track, completed } = state;
  switch (action.type) {
    case "start":
      if (phase === "waiting" || phase === "active") return state;
      return { ...state, phase: "waiting", track: phase === "finished" ? initial : track };
    case "cancel":
      if (phase !== "waiting") return state;
      return { ...state, phase: track.position ? "interrupted" : "idle" };
    case "pause":
    case "interrupt":
      if (phase !== "active" && phase !== "waiting") return state;
      return {
        ...state,
        phase: action.type === "pause" ? "paused" : "interrupted",
        track: walkReducer(track, { type: "interrupt" }),
      };
    case "finish":
      // Finishing twice must not list the same walk twice.
      if (phase === "finished" || !track.position) return phase === "finished" ? state : { ...state, phase: "idle" };
      return {
        phase: "finished",
        track,
        completed: [...completed, { number: completed.length + 1, meters: track.meters, elapsed: track.elapsed }],
      };
    case "fix":
      if (phase === "waiting" && validWalkFix(action.fix) &&
          (track.lastTimestamp === null || action.fix.timestamp > track.lastTimestamp)) {
        return { ...state, phase: "active", track: walkReducer(track, action, false) };
      }
      if (phase !== "active") return state;
      if (!validWalkFix(action.fix)) return foregroundWalk(state, { type: "interrupt" });
      return { ...state, track: walkReducer(track, action, false) };
    case "tick":
      return phase === "active" ? { ...state, track: walkReducer(track, action) } : state;
  }
}
