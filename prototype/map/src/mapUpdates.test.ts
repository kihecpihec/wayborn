import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { mapDocument } from "./mapDocument";

test("rapid walk resets do not restart camera animations; recenter still works", () => {
  let pans = 0;
  const start = mapDocument.indexOf("let following=true,last=null,nonce=-1;");
  const end = mapDocument.indexOf("window.updateWayborn=update;", start);
  const layer = { setLatLng() {}, addTo() {} };
  const context = {
    map: { on() {}, hasLayer: () => true, panTo: () => pans++, removeLayer() {} },
    marker: layer, halo: layer, route: { setLatLngs() {} },
    setPixel() {}, soonPlan() {}, pixelOn: true, pathPts: [],
    data: { type: "wayborn-location", point: { latitude: 46, longitude: 14 }, path: [], pixel: true, recenter: 0 },
  };
  runInNewContext(mapDocument.slice(start, end) + `
    update(data);
    for(let i=0;i<100;i++) update({...data,path:[]});
  `, context);
  assert.equal(pans, 1, "unchanged position must not restart map movement");
  runInNewContext(mapDocument.slice(start, end) + `
    update(data); update({...data,recenter:1});
    update({...data,recenter:1,point:{latitude:46.001,longitude:14}});
  `, { ...context });
  assert.equal(pans, 4, "explicit recenter and real movement still pan");
});
