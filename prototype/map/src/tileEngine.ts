/*
 * Tile engine: everything between "draw display tile z/x/y" and the pixels.
 *
 *   TileJSON (URL template, max zoom; cached in IndexedDB) -> source tile bytes
 *   (IndexedDB cache keyed by RENDER_VERSION, capped; network with retry and
 *   backoff, never cached on failure) -> decode + prepare (small LRU) ->
 *   WaybornPixel.renderRegion.
 *
 *   Detail layer: trees, small paths and land use the vector tiles lack come from
 *   Overpass, one z16 cell at a time, cached prepared in IndexedDB. A tile is drawn
 *   at once from the vector tiles alone (and from the cached cells when all of them
 *   are on hand); draw() reports which cells are missing so the page can fetch them
 *   in the background and redraw. A slow or failing Overpass never delays or breaks a tile.
 *
 * It runs inside a Web Worker built from a Blob (see mapDocument.ts) and falls
 * back to the page's main thread when Workers are unavailable. It never aborts a
 * request because the view moved: a fetched tile is always useful later.
 * Plain ES2017 in a string; no backticks or dollar-brace sequences.
 */
export const tileEngineSource = String.raw`
var WaybornEngine = (function () {
'use strict';
var TILEJSON = 'https://tiles.openfreemap.org/planet';
var OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
var HEDGE_MS = 3000, OVERPASS_TIMEOUT = 45000;
var DB = 'wayborn-tiles', CAP = 64 * 1024 * 1024, TEMPLATE_TTL = 6 * 3600 * 1000, ATTEMPTS = 4;

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function now() { return (typeof performance !== 'undefined' ? performance : Date).now(); }
function reqP(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }

/* IndexedDB adapter for WaybornPixel.makeStore: raw tiles in 'tiles', their size/age/version in 'meta'. */
function idbKV() {
  var dbp = new Promise(function (res, rej) {
    // Optional basemap caching must not block rendering in a suspended WebView.
    var settled = false;
    var timer = setTimeout(function () { settled = true; rej(new Error('idb open timed out')); }, 2000);
    var r = indexedDB.open(DB, 1);
    r.onupgradeneeded = function () { var d = r.result; d.createObjectStore('tiles'); d.createObjectStore('meta'); d.createObjectStore('misc'); };
    r.onsuccess = function () { clearTimeout(timer); if (settled) { r.result.close(); return; } settled = true; res(r.result); };
    r.onerror = function () { clearTimeout(timer); settled = true; rej(r.error); };
    r.onblocked = function () { clearTimeout(timer); settled = true; rej(new Error('idb blocked')); };
  });
  function store(name, mode) { return dbp.then(function (db) { return db.transaction(name, mode).objectStore(name); }); }
  function done(tx) { return new Promise(function (res, rej) { tx.oncomplete = function () { res(); }; tx.onerror = tx.onabort = function () { rej(tx.error); }; }); }
  return {
    get: function (k) { return store('tiles', 'readonly').then(function (s) { return reqP(s.get(k)); }); },
    put: function (k, buf, meta) {
      return dbp.then(function (db) {
        var tx = db.transaction(['tiles', 'meta'], 'readwrite');
        tx.objectStore('tiles').put(buf, k); tx.objectStore('meta').put(meta, k);
        return done(tx);
      });
    },
    del: function (k) {
      return dbp.then(function (db) {
        var tx = db.transaction(['tiles', 'meta'], 'readwrite');
        tx.objectStore('tiles').delete(k); tx.objectStore('meta').delete(k);
        return done(tx);
      });
    },
    metas: function () { return store('meta', 'readonly').then(function (s) { return reqP(s.getAll()); }); },
    touch: function (k, t) {
      store('meta', 'readwrite').then(function (s) { var g = s.get(k); g.onsuccess = function () { if (g.result) { g.result.t = t; s.put(g.result, k); } }; }).catch(function () {});
    },
    getMisc: function (k) { return store('misc', 'readonly').then(function (s) { return reqP(s.get(k)); }); },
    putMisc: function (k, v) { return store('misc', 'readwrite').then(function (s) { return reqP(s.put(v, k)); }); }
  };
}

function create(opt) {
  opt = opt || {};
  var WP = WaybornPixel, kv = null, store = null, storeReady;
  try { if (typeof indexedDB !== 'undefined') { kv = idbKV(); store = WP.makeStore(kv, { cap: opt.cap || CAP }); } } catch (e) { kv = null; store = null; }
  storeReady = store ? store.open().catch(function () { store = null; kv = null; }) : Promise.resolve();

  var stats = { fetched: 0, fromDb: 0, retries: 0, decodeMs: 0, decoded: 0 };

  /* TileJSON: the tile URL template carries the planet version, so never hardcode it. */
  var tj = null;
  function tilejson(force) {
    if (tj && !force) return tj;
    tj = (async function () {
      await storeReady;
      var cached = null;
      if (!force && kv) { try { cached = await kv.getMisc('tilejson'); } catch (e) {} }
      if (cached && Date.now() - cached.t < TEMPLATE_TTL) { cached.fresh = false; return cached; }
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 15000);
      try {
        var r = await fetch(TILEJSON, { signal: controller.signal }), j = await r.json();
        if (!r.ok || !j.tiles || !j.tiles[0]) throw new Error('bad TileJSON');
        var rec = { tpl: j.tiles[0], maxzoom: j.maxzoom || 14, t: Date.now(), fresh: true };
        if (kv) kv.putMisc('tilejson', rec).catch(function () {});
        return rec;
      } catch (e) {
        if (cached) { cached.fresh = false; return cached; }
        tj = null; throw e;
      } finally { clearTimeout(timeout); }
    })();
    return tj;
  }

  async function network(sz, sx, sy) {
    var last, refreshed = false;
    for (var a = 0; a < ATTEMPTS; a++) {
      if (a) { stats.retries++; await sleep(300 * Math.pow(2, a - 1)); }
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : 0;
      try {
        var t = await tilejson();
        var url = t.tpl.replace('{z}', sz).replace('{x}', sx).replace('{y}', sy);
        var r = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
        if (r.status === 404 || r.status === 204) {
          if (!t.fresh && !refreshed) { refreshed = true; await tilejson(true); a--; continue; }   // old planet version removed?
          return new ArrayBuffer(0);                                                              // genuinely empty tile
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var buf = await r.arrayBuffer();
        stats.fetched++;
        return buf;
      } catch (e) { last = e; }
      finally { clearTimeout(timer); }
    }
    throw last || new Error('tile fetch failed');
  }

  var prepared = new Map(), PREP_MAX = 24;
  function prepare(sz, sx, sy) {
    var key = sz + '/' + sx + '/' + sy, hit = prepared.get(key);
    if (hit) { prepared.delete(key); prepared.set(key, hit); return hit; }
    var p = (async function () {
      await storeReady;
      var ck = WP.cacheKey(sz, sx, sy), buf = null, fromDb = false;
      if (store) { try { buf = await store.get(ck); fromDb = !!buf; } catch (e) { buf = null; } }
      for (var pass = 0; pass < 2; pass++) {
        if (!buf) { buf = await network(sz, sx, sy); fromDb = false; }
        var t0 = now();
        try {
          var out = WP.prepareTile(buf.byteLength ? WP.decodeTile(new Uint8Array(buf)) : {}, sx, sy, sz);
          stats.decodeMs += now() - t0; stats.decoded++;
          if (fromDb) stats.fromDb++;
          else if (store && buf.byteLength) store.put(ck, buf).catch(function () {});
          return out;
        } catch (e) {
          if (!fromDb) throw e;              // fresh bytes that do not decode: surface the error, cache nothing
          try { await kv.del(ck); }   // corrupt cached bytes: drop and refetch once
           catch (e2) {}
          buf = null; fromDb = false;
        }
      }
    })();
    prepared.set(key, p);
    p.catch(function () { if (prepared.get(key) === p) prepared.delete(key); });   // a failure never stays cached
    while (prepared.size > PREP_MAX) prepared.delete(prepared.keys().next().value);
    return p;
  }

  /* Hedged Overpass request: preferred server first, the next one after HEDGE_MS or as soon as one fails;
     the first good answer wins and the redundant requests are aborted. */
  var preferred = 0;
  function overpass(q) {
    return new Promise(function (resolve, reject) {
      var next = 0, live = 0, finished = false, hedge = 0, ctls = [];
      function finish() { finished = true; clearTimeout(hedge); ctls.forEach(function (c) { c.abort(); }); }
      function launch() {
        if (finished || next >= OVERPASS.length) return;
        var idx = (preferred + next++) % OVERPASS.length, c = new AbortController(), t = setTimeout(function () { c.abort(); }, OVERPASS_TIMEOUT);
        ctls.push(c); live++; clearTimeout(hedge); hedge = setTimeout(launch, HEDGE_MS);
        fetch(OVERPASS[idx], { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: c.signal })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (j) { if (!j || !j.elements) throw new Error('bad response'); if (finished) return; preferred = idx; finish(); resolve(j.elements); })
          .catch(function () { if (finished) return; if (--live === 0 && next >= OVERPASS.length) { finish(); reject(new Error('Overpass servers are busy')); } else launch(); })
          .finally(function () { clearTimeout(t); });
      }
      launch();
    });
  }

  var detailMem = new Map(), DETAIL_MAX = 24, detailInflight = new Map();
  function remember(key, d) { detailMem.delete(key); detailMem.set(key, d); while (detailMem.size > DETAIL_MAX) detailMem.delete(detailMem.keys().next().value); }
  /* A cell that is already on hand (memory or IndexedDB); never touches the network. */
  async function detailCached(cx, cy) {
    var key = cx + '/' + cy, hit = detailMem.get(key);
    if (hit) { remember(key, hit); return hit; }
    await storeReady;
    if (!store) return null;
    var b;
    try { b = await store.get(WP.detailKey(cx, cy)); } catch (e) { return null; }
    if (!b) return null;
    try { var d = JSON.parse(new TextDecoder().decode(b)); remember(key, d); return d; }
    catch (e) { try { await kv.del(WP.detailKey(cx, cy)); } catch (e2) {} return null; }
  }
  /* Fetch one detail cell from Overpass (or find it cached), prepare it and keep it. */
  function detail(cx, cy) {
    var key = cx + '/' + cy, inflight = detailInflight.get(key);
    if (inflight) return inflight;
    var p = (async function () {
      if (await detailCached(cx, cy)) return { cx: cx, cy: cy, cached: true };
      var b = WP.cellBounds(cx, cy), els = await overpass(WP.overpassQuery(b.s, b.w, b.n, b.e));
      var d = WP.prepareOsm(els);
      remember(key, d);
      if (store) store.put(WP.detailKey(cx, cy), new TextEncoder().encode(JSON.stringify(d)).buffer).catch(function () {});
      return { cx: cx, cy: cy, shapes: d.shapes.length, trees: d.trees.length / 3 };
    })();
    detailInflight.set(key, p);
    var clear = function () { detailInflight.delete(key); };
    p.then(clear, clear);
    return p;
  }

  var states = new Map(), STATE_MAX = 48;
  /* req: { z, x, y, pass: 'g' | 'f' } -> { z, x, y, pass, ax0, ay0, aw, ah, data, counts, ms } */
  async function draw(req) {
    var t = await tilejson(), z = req.z, sz = Math.min(t.maxzoom || 14, z), key = z + '/' + req.x + '/' + req.y;
    var rect = WP.tileRect(req.x, req.y), cells = WP.sourceTiles(z, rect, WP.DETAIL_Z), st = req.pass === 'f' ? states.get(key) : null, preps = [];
    var cellData = await Promise.all(cells.map(function (c) { return detailCached(c[0], c[1]); }));
    var missing = cells.filter(function (c, i) { return !cellData[i]; }), det = missing.length ? null : cellData;
    if (st && st.hasDetail !== !!det) st = null;     // detail arrived since the ground pass
    if (!st) preps = await Promise.all(WP.sourceTiles(z, rect, sz).map(function (s) { return prepare(sz, s[0], s[1]); }));
    var t0 = now(), r;
    if (req.pass === 'g') {
      r = WP.renderRegion(preps, { zoom: z, rect: rect, pass: 'ground', detail: det });
      states.set(key, r.state);
      while (states.size > STATE_MAX) states.delete(states.keys().next().value);
    } else {
      r = WP.renderRegion(preps, { zoom: z, rect: rect, pass: 'full', state: st, detail: det });
      states.delete(key);
    }
    return { z: z, x: req.x, y: req.y, pass: req.pass, ax0: r.ax0, ay0: r.ay0, aw: r.aw, ah: r.ah, data: r.data, counts: r.counts, detail: !!det, missing: missing, ms: now() - t0 };
  }

  tilejson().catch(function () {});   // warm the template while the page is still loading
  return { draw: draw, detail: detail, stats: stats, tilejson: tilejson };
}

return { create: create };
})();
`;
