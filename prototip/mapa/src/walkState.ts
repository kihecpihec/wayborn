import { cellKey, Coordinate, distance, Fix } from "./geo";

type Walk = {
  running: boolean;
  ended: boolean;
  meters: number;
  elapsed: number;
  path: Coordinate[];
  cells: string[];
  last: Fix | null;
};
type Action =
  | { type: "fix"; fix: Fix }
  | { type: "tick"; seconds: number }
  | { type: "pause" }
  | { type: "end" }
  | { type: "reset" };
export const initial: Walk = {
  running: true,
  ended: false,
  meters: 0,
  elapsed: 0,
  path: [],
  cells: [],
  last: null,
};
export function walkReducer(state: Walk, action: Action): Walk {
  if (action.type === "reset") return { ...initial };
  if (action.type === "pause")
    return { ...state, running: !state.running, last: null };
  if (action.type === "end")
    return { ...state, running: false, ended: true, last: null };
  if (action.type === "tick")
    return state.running
      ? { ...state, elapsed: state.elapsed + action.seconds }
      : state;
  const fix = action.fix;
  if (!state.running || (fix.accuracy !== null && fix.accuracy > 50))
    return state;
  if (state.last && fix.timestamp <= state.last.timestamp) return state;
  const meters = state.last ? distance(state.last, fix) : 0;
  // Filter GPS jitter and impossible walking jumps. A teleport establishes a new baseline.
  const seconds = state.last
    ? (fix.timestamp - state.last.timestamp) / 1000
    : 0;
  if (state.last && meters < 3) return state;
  const jump = state.last && meters / Math.max(seconds, 1) > 4;
  const key = cellKey(fix);
  return {
    ...state,
    last: fix,
    meters: state.meters + (jump ? 0 : meters),
    path: jump || !state.last ? [fix] : [...state.path.slice(-1999), fix],
    cells: state.cells.includes(key) ? state.cells : [...state.cells, key],
  };
}
