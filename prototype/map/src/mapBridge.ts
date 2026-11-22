import type { Coordinate } from "./geo";

export type MapProps = {
  point: Coordinate | null;
  path: Coordinate[];
  recenter: number;
  pixel: boolean;
};

/** Keep map state independent of the document's loading/recovery lifecycle. */
export function createMapBridge(initialInject: (script: string) => void = () => {}) {
  let inject = initialInject;
  let ready = false;
  let latest: MapProps | null = null;
  const send = () => {
    if (ready && latest)
      inject(`window.updateWayborn && window.updateWayborn(${JSON.stringify({ type: "wayborn-location", ...latest })});true;`);
  };
  return {
    connect(callback: (script: string) => void) { inject = callback; },
    update(props: MapProps) { latest = props; send(); },
    loading() { ready = false; },
    loaded() { ready = true; send(); },
  };
}
