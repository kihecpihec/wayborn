import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { mapDocument } from './mapDocument';
test('cached pixel tiles finish after Leaflet registers the returned canvas', async () => {
  const start = mapDocument.indexOf('const S=3,TS=256');
  const end = mapDocument.indexOf('const pixelGrid=', start);
  let registered = false;
  let completed = false;
  const context = {
    window: {}, map: { createPane: () => ({ style: {} }) },
    document: { getElementById: () => ({ style: {} }), createElement: () => ({ getContext: () => ({ clearRect() {}, drawImage() {} }) }) },
    L: { GridLayer: { extend: (methods: unknown) => methods } },
    setTimeout, clearTimeout, requestAnimationFrame: (run: () => void) => setTimeout(run, 0), loading: { tileDrawn() {} }, soonStatus() {}, needDetail() {}, cellsOf: () => [], want() {},
    finish: () => { assert.equal(registered, true); completed = true; },
  };
  runInNewContext(mapDocument.slice(start, end) + `
    lru.set('17/1/1', { pass:2, cv:{}, aw:1, ah:1, ax0:0, ay0:0 });
    PixelGrid.createTile({z:17,x:1,y:1},finish);
  `, context);
  registered = true;
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(completed, true);
});
