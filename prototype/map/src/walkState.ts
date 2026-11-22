import { cellKey, Coordinate, distance, Fix } from "./geo";

type Walk = {
  running: boolean;
  ended: boolean;
  meters: number;
  elapsed: number;
  path: Coordinate[];
  cells: string[];
  last: Fix | null;
  position: Fix | null;
  lastTimestamp: number | null;
};
export type WalkAction =
  | { type: "fix"; fix: Fix }
  | { type: "tick"; seconds: number }
  | { type: "pause" }
  | { type: "end" }
  | { type: "interrupt" }
  | { type: "reset" };
export const initial: Walk = {
  running: true,
  ended: false,
  meters: 0,
  elapsed: 0,
  path: [],
  cells: [],
  last: null,
  position: null,
  lastTimestamp: null,
};
export function validWalkFix(fix: Fix): boolean {
  return (
    Number.isFinite(fix.timestamp) &&
    fix.timestamp >= 0 &&
    !(
      !Number.isFinite(fix.latitude) ||
    Math.abs(fix.latitude) > 90 ||
    !Number.isFinite(fix.longitude) ||
    Math.abs(fix.longitude) > 180 ||
    fix.accuracy === null ||
    !Number.isFinite(fix.accuracy) ||
    fix.accuracy < 0 ||
    fix.accuracy > 50
    )
  );
}

export function walkReducer(state: Walk, action: WalkAction, demoCells = true): Walk {
  if (action.type === "reset") return { ...initial };
  if (state.ended) return state;
  if (action.type === "interrupt") return { ...state, last: null, path: [] };
  if (action.type === "pause")
    return { ...state, running: !state.running, last: null };
  if (action.type === "end")
    return { ...state, running: false, ended: true, last: null };
  if (action.type === "tick")
    return state.running &&
      Number.isFinite(action.seconds) &&
      action.seconds > 0
      ? { ...state, elapsed: state.elapsed + action.seconds }
      : state;
  const fix = action.fix;
  if (!state.running) return state;
  if (!Number.isFinite(fix.timestamp) || fix.timestamp < 0)
    return { ...state, last: null, path: [] };
  if (state.lastTimestamp !== null && fix.timestamp <= state.lastTimestamp)
    return state;
  const observed = { ...state, lastTimestamp: fix.timestamp };
  if (!validWalkFix(fix))
    return { ...observed, last: null, path: [] };
  // D05 trial: silence is an interruption even without an explicit error callback.
  const baseline =
    state.last && fix.timestamp - state.last.timestamp <= 15000
      ? state.last
      : null;
  const meters = baseline ? distance(baseline, fix) : 0;
  // Filter GPS jitter and impossible walking jumps. A teleport establishes a new baseline.
  const seconds = baseline ? (fix.timestamp - baseline.timestamp) / 1000 : 0;
  if (baseline && meters < 3) return observed;
  const jump = baseline && meters / seconds > 4;
  if (jump) return { ...observed, last: fix, path: [] };
  const key = demoCells ? cellKey(fix) : null;
  return {
    ...observed,
    last: fix,
    position: fix,
    meters: state.meters + meters,
    path: !baseline ? [fix] : [...state.path.slice(-1999), fix],
    cells: key === null || state.cells.includes(key) ? state.cells : [...state.cells, key],
  };
}
