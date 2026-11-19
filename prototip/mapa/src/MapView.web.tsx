import React, { useEffect, useRef, useState } from "react";
import type { MapProps } from "./MapView";
import { mapDocument } from "./mapDocument";
export default function MapView(props: MapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded)
      frame.current?.contentWindow?.postMessage(
        { type: "wayborn-location", ...props },
        "*",
      );
  }, [props, loaded]);
  return (
    <iframe
      ref={frame}
      title="OpenStreetMap walking map"
      srcDoc={mapDocument}
      onLoad={() => setLoaded(true)}
      style={{ width: "100%", height: "100%", border: 0 }}
    />
  );
}
