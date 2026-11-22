import { initial, validWalkFix, walkReducer, type WalkAction } from "./walkState";

type Phase = "idle" | "waiting" | "active" | "paused" | "interrupted" | "finished";
type Session = { phase: Phase; track: typeof initial };
type Action = Extract<WalkAction, { type: "fix" | "tick" | "interrupt" }> |
  { type: "start" | "pause" | "finish" | "cancel" };

export const idleWalk: Session = { phase: "idle", track: initial };

export function foregroundWalk(state: Session, action: Action): Session {
  const { phase, track } = state;
  switch (action.type) {
    case "start":
      if (phase === "waiting" || phase === "active") return state;
      return { phase: "waiting", track: phase === "finished" ? initial : track };
    case "cancel":
      if (phase !== "waiting") return state;
      return { phase: track.position ? "interrupted" : "idle", track };
    case "pause":
    case "interrupt":
      if (phase !== "active" && phase !== "waiting") return state;
      return {
        phase: action.type === "pause" ? "paused" : "interrupted",
        track: walkReducer(track, { type: "interrupt" }),
      };
    case "finish":
      return track.position ? { phase: "finished", track } : idleWalk;
    case "fix":
      if (phase === "waiting" && validWalkFix(action.fix) &&
          (track.lastTimestamp === null || action.fix.timestamp > track.lastTimestamp)) {
        return { phase: "active", track: walkReducer(track, action, false) };
      }
      if (phase !== "active") return state;
      if (!validWalkFix(action.fix)) return foregroundWalk(state, { type: "interrupt" });
      return { phase, track: walkReducer(track, action, false) };
    case "tick":
      return phase === "active" ? { phase, track: walkReducer(track, action) } : state;
  }
}
