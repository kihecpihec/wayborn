import React, { useEffect, useRef, useState } from "react";
import { WebView } from "react-native-webview";
import { mapDocument } from "./mapDocument";
import { createMapBridge, MapProps } from "./mapBridge";
export type { MapProps } from "./mapBridge";
const source = { html: mapDocument, baseUrl: "https://wayborn.demo/" };
export default function MapView(props: MapProps) {
  const ref = useRef<WebView<object>>(null);
  const [bridge] = useState(() => createMapBridge());
  useEffect(() => {
    bridge.connect((script) => ref.current?.injectJavaScript(script));
    return () => { bridge.loading(); bridge.connect(() => {}); };
  }, [bridge]);
  useEffect(() => {
    bridge.update(props);
  }, [props, bridge]);
  return (
    <WebView<object>
      ref={ref}
      style={{ flex: 1, backgroundColor: "#e4eadc" }}
      source={source}
      onLoadStart={() => bridge.loading()}
      onLoadEnd={() => bridge.loaded()}
      onContentProcessDidTerminate={() => {
        bridge.loading();
        ref.current?.reload();
      }}
      originWhitelist={["https://*"]}
      javaScriptEnabled
      scrollEnabled={false}
      userAgent="WaybornDemo/1.0 (React Native walking prototype)"
    />
  );
}
