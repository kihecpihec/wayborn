import React, { useEffect, useRef, useState } from "react";
import { WebView } from "react-native-webview";
import { Coordinate } from "./geo";
import { mapDocument } from "./mapDocument";
export type MapProps = {
  point: Coordinate | null;
  path: Coordinate[];
  recenter: number;
  /** Render OSM features as Wayborn pixel art instead of raster tiles. */
  pixel: boolean;
};
export default function MapView(props: MapProps) {
  const ref = useRef<WebView<object>>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded)
      ref.current?.injectJavaScript(
        `window.updateWayborn && window.updateWayborn(${JSON.stringify({ type: "wayborn-location", ...props })});true;`,
      );
  }, [props, loaded]);
  return (
    <WebView<object>
      ref={ref}
      style={{ flex: 1, backgroundColor: "#e4eadc" }}
      source={{ html: mapDocument, baseUrl: "https://wayborn.demo/" }}
      onLoadEnd={() => setLoaded(true)}
      originWhitelist={["https://*"]}
      javaScriptEnabled
      scrollEnabled={false}
      userAgent="WaybornDemo/1.0 (React Native walking prototype)"
    />
  );
}
