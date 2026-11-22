import { cellKey, Coordinate, distance, Fix } from "./geo";

type Walk = {
  history: { session: number; meters: number; elapsed: number }[];
  session: number;
  started: boolean;
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
type Action =
  | { type: "start" }
  | { type: "fix"; fix: Fix }
  | { type: "tick"; seconds: number }
  | { type: "pause" }
  | { type: "end" }
  | { type: "interrupt" }
  | { type: "reset" };
export const initial: Walk = {
  history: [],
  session: 0,
  started: true,
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
// The sample reducer's `initial` represents an explicitly started demo walk.
// App entry uses idle: opening the map never starts recording or GPS permission.
export const idle: Walk = { ...initial, started: false, running: false };
export function walkReducer(state: Walk, action: Action): Walk {
  if (action.type === "reset") return { ...initial, session: state.session + 1, history: state.history, position: state.position };
  if (action.type === "start")
    return state.started ? state : { ...initial, position: state.position };
  if (state.ended) return state;
  if (!state.started) return state;
  if (action.type === "interrupt") return { ...state, last: null, path: [] };
  if (action.type === "pause")
    return { ...state, running: !state.running, last: null };
  if (action.type === "end")
    return { ...state, running: false, ended: true, last: null, history: [...state.history, { session: state.session, meters: state.meters, elapsed: state.elapsed }] };
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
  if (
    !Number.isFinite(fix.latitude) ||
    Math.abs(fix.latitude) > 90 ||
    !Number.isFinite(fix.longitude) ||
    Math.abs(fix.longitude) > 180 ||
    fix.accuracy === null ||
    !Number.isFinite(fix.accuracy) ||
    fix.accuracy < 0 ||
    fix.accuracy > 50
  )
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
  const key = cellKey(fix);
  return {
    ...observed,
    last: fix,
    position: fix,
    meters: state.meters + meters,
    path: !baseline ? [fix] : [...state.path.slice(-1999), fix],
    cells: state.cells.includes(key) ? state.cells : [...state.cells, key],
  };
}
