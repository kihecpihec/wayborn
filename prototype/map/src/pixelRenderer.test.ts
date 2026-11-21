import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pixelRendererSource } from "./pixelRenderer";
import { tileEngineSource } from "./tileEngine";
import { mapDocument } from "./mapDocument";

const WP: any = new Function(`${pixelRendererSource}; return WaybornPixel;`)();
const { C } = WP;
const FIXTURE = new Uint8Array(readFileSync(join(__dirname, "..", "fixtures", "ljubljana-14-8852-5825.pbf")));
const SX = 8852,
  SY = 5825;

const poly = (x0: number, y0: number, x1: number, y1: number) => [x0, y0, x1, y0, x1, y1, x0, y1, x0, y0];
const feat = (type: number, props: Record<string, unknown>, ...lists: number[][]) => ({ type, props, lists });
const layer = (...features: any[]) => ({ extent: 4096, features });

/* a display tile near the middle of source tile 8852/5825, at zoom z */
const centreTile = (z: number) => {
  const n = Math.pow(2, z - 14);
  return { x: SX * n + Math.floor(n / 2) - 1, y: SY * n + Math.floor(n / 2) - 1 };
};

test("classifies OpenMapTiles layers and classes", () => {
  const cls = (l: string, p: object, gt = 3) => WP.classify(l, p, gt)?.cls;
  assert.equal(cls("water", {}), C.WATER);
  assert.equal(cls("waterway", { class: "river" }, 2), C.WATER);
  assert.equal(WP.classify("waterway", { class: "river" }, 3), null);
  assert.equal(WP.classify("waterway", { class: "drain", brunnel: "tunnel" }, 2), null);
  assert.equal(cls("landcover", { class: "grass" }), C.GRASS);
  assert.equal(cls("landcover", { class: "wood" }), C.FOREST);
  assert.equal(cls("landcover", { class: "farmland" }), C.FARM);
  assert.equal(cls("landcover", { class: "sand" }), C.SAND);
  assert.equal(cls("landcover", { class: "wetland" }), C.GRASS);
  assert.equal(WP.classify("landcover", { class: "ice" }, 3), null);
  assert.equal(cls("landuse", { class: "residential" }), C.YARD);
  for (const c of ["commercial", "retail", "industrial"]) assert.equal(cls("landuse", { class: c }), C.LOT);
  assert.equal(cls("landuse", { class: "pitch" }), C.PITCH);
  assert.equal(WP.classify("landuse", { class: "suburb" }, 3), null);
  assert.equal(cls("park", { class: "park" }), C.GRASS);
  for (const c of ["motorway", "trunk", "primary", "secondary", "tertiary"]) assert.equal(cls("transportation", { class: c }, 2), C.ROAD);
  for (const c of ["minor", "service"]) assert.equal(cls("transportation", { class: c }, 2), C.STREET);
  assert.equal(cls("transportation", { class: "path", subclass: "footway" }, 2), C.PATH);
  assert.equal(cls("transportation", { class: "track" }, 2), C.PATH);
  assert.equal(cls("transportation", { class: "path", subclass: "pedestrian" }, 2), C.PAVED);
  assert.equal(cls("transportation", { class: "path", subclass: "pedestrian" }), C.PAVED); // plaza polygon
  for (const c of ["rail", "transit"]) assert.equal(cls("transportation", { class: c }, 2), C.RAIL);
  assert.equal(WP.classify("transportation", { class: "primary", brunnel: "tunnel" }, 2), null);
  assert.equal(WP.classify("transportation", { class: "primary", brunnel: "bridge" }, 2).bridge, true);
  assert.equal(WP.classify("transportation", { class: "ferry" }, 2), null);
  assert.equal(WP.classify("building", { render_height: 12 }, 3).kind, "building");
  assert.equal(WP.classify("building", { render_height: 4, render_min_height: 8 }, 3), null); // floating part
  assert.equal(WP.classify("poi", { class: "bakery" }, 1), null);
});

test("scanline fill covers a square exactly and honours even-odd holes", () => {
  const hits = new Set<string>();
  WP.fillEdges([1, 1, 5, 1, 5, 1, 5, 5, 5, 5, 1, 5, 1, 5, 1, 1], 10, 10, (x: number, y: number) => hits.add(`${x},${y}`));
  assert.equal(hits.size, 16);
  assert.ok(hits.has("1,1") && hits.has("4,4") && !hits.has("5,5"));
  const ring = new Set<string>();
  const outer = [0, 0, 8, 0, 8, 0, 8, 8, 8, 8, 0, 8, 0, 8, 0, 0];
  const inner = [2, 2, 6, 2, 6, 2, 6, 6, 6, 6, 2, 6, 2, 6, 2, 2];
  WP.fillEdges([...outer, ...inner], 10, 10, (x: number, y: number) => ring.add(`${x},${y}`));
  assert.equal(ring.size, 64 - 16);
  assert.ok(!ring.has("3,3"));
});

test("one-pixel lines stay one pixel thin on diagonals", () => {
  const px: string[] = [];
  WP.strokeLine([0.5, 0.5, 9.5, 9.5], 1, 20, 20, (x: number, y: number) => px.push(`${x},${y}`));
  assert.equal(new Set(px).size, 10);
});

test("decodes a real OpenFreeMap tile (z14 8852/5825)", () => {
  const raw = WP.decodeTile(FIXTURE);
  assert.deepEqual(Object.keys(raw).sort(), ["building", "landcover", "landuse", "park", "transportation", "water", "waterway"]);
  assert.equal(raw.building.extent, 4096);
  assert.ok(raw.transportation.features.length > 500);
  const roads = raw.transportation.features.filter((f: any) => f.type === 2 && f.props.class === "primary");
  assert.ok(roads.length > 10);
  for (const l of roads[0].lists) for (const v of l) assert.ok(Number.isInteger(v) && v > -1000 && v < 5200);
  assert.ok(raw.water.features.some((f: any) => f.props.class === "river"));
  assert.ok(raw.building.features.every((f: any) => f.type === 3 && typeof f.props.render_height === "number"));
  // merged building multipolygons are split into one shape per exterior ring
  const prep = WP.prepareTile(raw, SX, SY, 14);
  const buildings = prep.shapes.filter((s: any) => s.c.kind === "building");
  assert.ok(buildings.length > raw.building.features.length * 5);
  for (const b of buildings) assert.ok(b.bb[0] >= SX * 4096 - 200 && b.bb[2] <= (SX + 1) * 4096 + 200);
  assert.ok(prep.shapes.some((s: any) => s.c.cls === C.ROAD) && prep.shapes.some((s: any) => s.c.cls === C.WATER));
});

test("z14 geometry is rescaled and clipped for zoom 17 tiles", () => {
  // water square covering source units [2150..2400] x [2200..2450]; the z17 tile centreTile(17) spans units 2048..2560
  const raw = { water: layer(feat(3, { class: "lake" }, poly(2150, 2200, 2400, 2450))) };
  const prep = WP.prepareTile(raw, SX, SY, 14);
  const t = { x: SX * 8 + 4, y: SY * 8 + 4 }, rect = WP.tileRect(t.x, t.y);
  assert.deepEqual(WP.sourceTiles(17, rect, 14), [[SX, SY]]);
  const out = WP.renderRegion([prep], { zoom: 17, rect, pass: "ground" });
  const isWater = (x: number, y: number) => {
    const i = (y * out.aw + x) * 4;
    return out.data[i + 2] > out.data[i] + 40;
  };
  const artX = (u: number) => ((SX * 4096 + u) * 8) / 48 - out.ax0; // zoom 17 = 8x the z14 world, 3 screen px per art px
  const artY = (v: number) => ((SY * 4096 + v) * 8) / 48 - out.ay0;
  const midY = Math.round((artY(2200) + artY(2450)) / 2), midX = Math.round((artX(2150) + artX(2400)) / 2);
  assert.ok(artX(2150) > 5 && artX(2400) < out.aw - 5, "square sits inside the tile");
  for (let x = Math.ceil(artX(2150)) + 3; x < artX(2400) - 3; x++) assert.ok(isWater(x, midY), `water at ${x}`);
  assert.ok(!isWater(Math.floor(artX(2150)) - 3, midY) && !isWater(Math.ceil(artX(2400)) + 3, midY));
  for (let y = Math.ceil(artY(2200)) + 3; y < artY(2450) - 3; y++) assert.ok(isWater(midX, y), `water at row ${y}`);
  assert.ok(!isWater(midX, Math.floor(artY(2200)) - 3) && !isWater(midX, Math.ceil(artY(2450)) + 3));
  // a tile outside the square, same source: no water at all
  const far = WP.renderRegion([prep], { zoom: 17, rect: WP.tileRect(t.x + 2, t.y), pass: "ground" });
  for (let i = 0; i < far.data.length; i += 4) assert.ok(far.data[i + 2] <= far.data[i] + 40);
});

test("render paints opaque pixels from a fixed palette, without anti-aliasing", () => {
  const prep = WP.prepareTile(WP.decodeTile(FIXTURE), SX, SY, 14);
  const t = centreTile(17), rect = WP.tileRect(t.x, t.y);
  const out = WP.renderRegion([prep], { zoom: 17, rect, pass: "full" });
  assert.equal(out.data.length, out.aw * out.ah * 4);
  assert.ok(out.counts.buildings > 0 && out.counts.lines > 0);
  const colours = new Set<string>();
  for (let i = 0; i < out.data.length; i += 4) {
    assert.equal(out.data[i + 3], 255);
    colours.add(`${out.data[i]},${out.data[i + 1]},${out.data[i + 2]}`);
  }
  assert.ok(colours.size < 90, `too many colours: ${colours.size}`);
});

const block = (z: number, prep: any) => {
  const c = centreTile(z), tiles = [];
  for (const dy of [0, 1]) for (const dx of [0, 1]) tiles.push({ x: c.x + dx, y: c.y + dy });
  const rects = tiles.map((t) => WP.tileRect(t.x, t.y));
  const union = {
    ax0: Math.min(...rects.map((r: any) => r.ax0)), ay0: Math.min(...rects.map((r: any) => r.ay0)),
    ax1: Math.max(...rects.map((r: any) => r.ax1)), ay1: Math.max(...rects.map((r: any) => r.ay1)),
  };
  for (const r of [...rects, union]) assert.equal(WP.sourceTiles(z, r, 14).length, 1, "block stays inside one source tile");
  return { tiles, rects, union, prep };
};

for (const z of [16, 17, 18, 19]) {
  test(`tiles drawn separately match one big area across borders (zoom ${z})`, () => {
    const { rects, union, prep } = block(z, WP.prepareTile(WP.decodeTile(FIXTURE), SX, SY, 14));
    for (const pass of ["ground", "full"]) {
      const big = WP.renderRegion([prep], { zoom: z, rect: union, pass });
      let compared = 0;
      for (const r of rects) {
        const t = WP.renderRegion([prep], { zoom: z, rect: r, pass });
        for (let y = 0; y < t.ah; y++)
          for (let x = 0; x < t.aw; x++) {
            const bi = ((r.ay0 + y - union.ay0) * big.aw + (r.ax0 + x - union.ax0)) * 4, ti = (y * t.aw + x) * 4;
            for (let k = 0; k < 4; k++) if (t.data[ti + k] !== big.data[bi + k]) assert.fail(`${pass} z${z} pixel ${r.ax0 + x},${r.ay0 + y} channel ${k}`);
            compared++;
          }
      }
      assert.ok(compared > 4 * 80 * 80);
    }
  });
}

test("neighbouring tiles agree on the art pixels they share, two-pass equals one pass", () => {
  const prep = WP.prepareTile(WP.decodeTile(FIXTURE), SX, SY, 14);
  let c = centreTile(17);
  while ((256 * (c.x + 1)) % 3 === 0) c = { x: c.x + 1, y: c.y }; // 256 is not a multiple of 3: most tile pairs share one art column
  const a = WP.tileRect(c.x, c.y), b = WP.tileRect(c.x + 1, c.y);
  const A = WP.renderRegion([prep], { zoom: 17, rect: a, pass: "full" }), B = WP.renderRegion([prep], { zoom: 17, rect: b, pass: "full" });
  const lo = Math.max(a.ax0, b.ax0), hi = Math.min(a.ax1, b.ax1);
  assert.ok(hi > lo, "tiles overlap by a shared art column");
  for (let x = lo; x < hi; x++) for (let y = 0; y < A.ah; y++) for (let k = 0; k < 4; k++)
    assert.equal(A.data[(y * A.aw + x - a.ax0) * 4 + k], B.data[(y * B.aw + x - b.ax0) * 4 + k]);
  const g = WP.renderRegion([prep], { zoom: 17, rect: a, pass: "ground" });
  const two = WP.renderRegion([prep], { zoom: 17, rect: a, pass: "full", state: g.state });
  assert.deepEqual(Buffer.from(two.data), Buffer.from(A.data));
});

test("buildings and trees are drawn by every tile they reach, but counted once by their foot", () => {
  const prep = WP.prepareTile(WP.decodeTile(FIXTURE), SX, SY, 14), c = centreTile(18);
  let sum = 0, total = 0;
  const rects = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) rects.push(WP.tileRect(c.x + dx, c.y + dy));
  for (const r of rects) { const o = WP.renderRegion([prep], { zoom: 18, rect: r, pass: "full" }); sum += o.counts.buildings; }
  const whole = { ax0: rects[0].ax0, ay0: rects[0].ay0, ax1: rects[24].ax1, ay1: rects[24].ay1 };
  total = WP.renderRegion([prep], { zoom: 18, rect: whole, pass: "full" }).counts.buildings;
  assert.ok(total > 20);
  // tile rects overlap by a shared column, so foot points on it may count twice; never fewer
  assert.ok(sum >= total && sum < total * 1.15, `sum ${sum} vs whole ${total}`);
});

test("rendering is anchored to the world grid, so shifting the window does not shift the pattern", () => {
  const raw = {
    building: layer(feat(3, { render_height: 12 }, poly(2200, 2200, 2260, 2250))),
    transportation: layer(feat(2, { class: "minor" }, [1800, 2300, 2900, 2320])),
    landcover: layer(feat(3, { class: "grass" }, poly(1900, 2000, 2700, 2150))),
  };
  const prep = WP.prepareTile(raw, SX, SY, 14), t = centreTile(18), r = WP.tileRect(t.x, t.y);
  const shifted = { ax0: r.ax0 + 5, ay0: r.ay0 + 7, ax1: r.ax1 + 5, ay1: r.ay1 + 7 };
  const a = WP.renderRegion([prep], { zoom: 18, rect: r, pass: "full" }), b = WP.renderRegion([prep], { zoom: 18, rect: shifted, pass: "full" });
  for (let y = 0; y < a.ah - 7; y++) for (let x = 0; x < a.aw - 5; x++) for (let k = 0; k < 4; k++)
    assert.equal(b.data[(y * b.aw + x) * 4 + k], a.data[((y + 7) * a.aw + x + 5) * 4 + k]);
});

/* in-memory key-value adapter standing in for IndexedDB */
function memKV() {
  const tiles = new Map<string, ArrayBuffer>(), meta = new Map<string, any>();
  return {
    tiles, meta,
    get: async (k: string) => tiles.get(k),
    put: async (k: string, b: ArrayBuffer, m: any) => { tiles.set(k, b); meta.set(k, m); },
    del: async (k: string) => { tiles.delete(k); meta.delete(k); },
    metas: async () => [...meta.values()],
    touch: (k: string, t: number) => { const m = meta.get(k); if (m) m.t = t; },
  };
}

test("cache keys carry the render version; bumping it invalidates stored tiles", async () => {
  assert.equal(WP.cacheKey(14, 8852, 5825), `${WP.RENDER_VERSION}/14/8852/5825`);
  assert.notEqual(WP.cacheKey(14, 1, 2, "r1"), WP.cacheKey(14, 1, 2, "r2"));
  const kv = memKV();
  let tick = 0;
  const v1 = WP.makeStore(kv, { version: "v1", now: () => ++tick });
  await v1.open();
  await v1.put(WP.cacheKey(14, 1, 1, "v1"), new ArrayBuffer(100));
  assert.ok(await v1.get(WP.cacheKey(14, 1, 1, "v1")));
  const v2 = WP.makeStore(kv, { version: "v2", now: () => ++tick });
  assert.equal(await v2.get(WP.cacheKey(14, 1, 1, "v2")), undefined);
  await v2.open(); // purges the old style version
  assert.equal(kv.tiles.size, 0);
});

test("stored size is capped, evicting the least recently used tile first", async () => {
  const kv = memKV();
  let tick = 0;
  const s = WP.makeStore(kv, { version: "v", cap: 250, now: () => ++tick });
  await s.put("a", new ArrayBuffer(100));
  await s.put("b", new ArrayBuffer(100));
  await s.get("a"); // a is now newer than b
  await s.put("c", new ArrayBuffer(100));
  assert.deepEqual([...kv.tiles.keys()].sort(), ["a", "c"]);
  const total = [...kv.meta.values()].reduce((n, m) => n + m.n, 0);
  assert.ok(total <= 250);
});

/* ---------------------------------------------------------------- OSM detail layer */
const pt = (lat: number, lon: number) => ({ lat, lon });
const tree = (id: number, lat: number, lon: number) => ({ type: "node", id, lat, lon, tags: { natural: "tree" } });
const way = (id: number, tags: Record<string, string>, ...p: number[][]) => ({ type: "way", id, tags, geometry: p.map(([a, b]) => pt(a, b)) });
/* lat/lon of the shared corner of the 2x2 block of display tiles used in the seam tests */
function corner(z: number) {
  const c = centreTile(z), n = Math.pow(2, z) * 256, x = (c.x + 1) * 256, y = (c.y + 1) * 256;
  return { lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, lon: (x / n) * 360 - 180 };
}
function detailElements(lat0: number, lon0: number) {
  const els: any[] = [];
  let id = 1;
  for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) els.push(tree(id++, lat0 + j * 0.00006, lon0 + i * 0.0001));
  els.push(way(5000, { highway: "footway" }, [lat0 - 0.0006, lon0 - 0.0012], [lat0 + 0.0004, lon0 + 0.0011]));
  els.push(way(5001, { highway: "footway", footway: "sidewalk" }, [lat0 - 0.0003, lon0 - 0.0012], [lat0 - 0.0003, lon0 + 0.0012]));
  els.push(way(5002, { leisure: "garden" }, [lat0 + 0.0002, lon0 - 0.0003], [lat0 + 0.0002, lon0 + 0.0004], [lat0 - 0.0004, lon0 + 0.0004], [lat0 - 0.0004, lon0 - 0.0003], [lat0 + 0.0002, lon0 - 0.0003]));
  els.push(way(5003, { amenity: "parking" }, [lat0 + 0.0005, lon0 + 0.0005], [lat0 + 0.0005, lon0 + 0.0009], [lat0 + 0.0003, lon0 + 0.0009], [lat0 + 0.0003, lon0 + 0.0005], [lat0 + 0.0005, lon0 + 0.0005]));
  return els;
}

test("classifies OSM detail tags: areas, small paths, no sidewalks, no buildings", () => {
  const k = (t: object, closed = true) => WP.classifyOsm(t, closed);
  assert.equal(k({ leisure: "garden" }).cls, C.GRASS);
  assert.equal(k({ landuse: "orchard" }).cls, C.GRASS);
  assert.equal(k({ landuse: "farmland" }).cls, C.FARM);
  assert.equal(k({ landuse: "residential" }).cls, C.YARD);
  assert.equal(k({ landuse: "commercial" }).cls, C.LOT);
  assert.equal(k({ natural: "wood" }).cls, C.FOREST);
  assert.equal(k({ natural: "water" }).cls, C.WATER);
  assert.equal(k({ leisure: "pitch" }).cls, C.PITCH);
  assert.equal(k({ amenity: "parking" }).cls, C.PAVED);
  assert.equal(k({ highway: "footway" }, false).cls, C.PATH);
  assert.equal(k({ highway: "steps" }, false).cls, C.PATH);
  assert.equal(k({ highway: "pedestrian" }, false).cls, C.PAVED);
  assert.equal(k({ highway: "footway", footway: "sidewalk" }, false), null);
  assert.equal(k({ highway: "footway", footway: "crossing" }, false), null);
  assert.equal(k({ highway: "footway", tunnel: "yes" }, false), null);
  assert.equal(k({ highway: "residential" }, false), null); // roads come from the vector tiles
  assert.equal(k({ building: "yes" }), null);
  assert.equal(k({ leisure: "garden" }, false), null); // open way is not an area
});

test("overpass query, cell bounds and cache keys for the detail layer", () => {
  const b = WP.cellBounds(35408, 23301), q: string = WP.overpassQuery(b.s, b.w, b.n, b.e);
  assert.ok(b.w < 14.51 && b.e > b.w && b.n > b.s && Math.abs(b.e - b.w - 360 / 65536) < 1e-9);
  assert.match(q, /^\[out:json\]/);
  assert.ok(q.includes('node["natural"="tree"]') && q.includes("footway|path|cycleway|steps") && q.endsWith("out geom qt;"));
  assert.ok(!q.includes('["building"]') && !q.includes("railway")); // buildings and roads stay with the vector tiles
  assert.equal(WP.detailKey(1, 2), `${WP.RENDER_VERSION}/o/16/1/2`);
  assert.notEqual(WP.detailKey(1, 2, "r1"), WP.detailKey(1, 2, "r2"));
});

test("prepared detail is plain JSON (it is cached that way)", () => {
  const d = WP.prepareOsm(detailElements(46.0514, 14.506));
  assert.equal(d.trees.length, 19 * 19 * 3);
  assert.equal(d.shapes.length, 3); // footway, garden, parking: the sidewalk is skipped
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
});

for (const z of [16, 17, 18, 19]) {
  test(`with the detail layer, tiles still match one big area across borders (zoom ${z})`, () => {
    const { rects, union, prep } = block(z, WP.prepareTile(WP.decodeTile(FIXTURE), SX, SY, 14));
    const cn = corner(z), detail = [WP.prepareOsm(detailElements(cn.lat, cn.lon))];
    let trees = 0;
    for (const pass of ["ground", "full"]) {
      const big = WP.renderRegion([prep], { zoom: z, rect: union, pass, detail });
      for (const r of rects) {
        const t = WP.renderRegion([prep], { zoom: z, rect: r, pass, detail });
        if (pass === "full") trees += t.counts.trees;
        for (let y = 0; y < t.ah; y++)
          for (let x = 0; x < t.aw; x++) {
            const bi = ((r.ay0 + y - union.ay0) * big.aw + (r.ax0 + x - union.ax0)) * 4, ti = (y * t.aw + x) * 4;
            for (let k = 0; k < 4; k++) if (t.data[ti + k] !== big.data[bi + k]) assert.fail(`${pass} z${z} pixel ${r.ax0 + x},${r.ay0 + y} channel ${k}`);
          }
      }
    }
    assert.ok(trees > 0);
  });
}

test("detail changes the picture: trees, garden and paths appear", () => {
  const prep = WP.prepareTile(WP.decodeTile(FIXTURE), SX, SY, 14), c = centreTile(18), rect = WP.tileRect(c.x, c.y);
  const cn = corner(18), detail = [WP.prepareOsm(detailElements(cn.lat, cn.lon))];
  const base = WP.renderRegion([prep], { zoom: 18, rect, pass: "full" }), rich = WP.renderRegion([prep], { zoom: 18, rect, pass: "full", detail });
  assert.equal(base.detail, false);
  assert.equal(rich.detail, true);
  assert.notDeepEqual(Buffer.from(rich.data), Buffer.from(base.data));
  assert.ok(rich.counts.trees > base.counts.trees);
});

test("mapped trees are thinned to one per cell and kept off water", () => {
  const z = 18, n = Math.pow(2, z - 14), tx = SX * n + n / 2, ty = SY * n + n / 2, rect = WP.tileRect(tx, ty);
  const px = (rect.ax0 + 40) * 3, py = (rect.ay0 + 40) * 3; // art pixel 40,40 of the tile, as z18 screen px
  const size = 256 * Math.pow(2, z);
  const latOf = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI, lonOf = (x: number) => (x / size) * 360 - 180;
  const run = (els: any[], raw: any = {}) => {
    const prep = WP.prepareTile(raw, SX, SY, 14);
    return WP.renderRegion([prep], { zoom: z, rect, pass: "full", detail: [WP.prepareOsm(els)] }).counts.trees;
  };
  const near = [tree(1, latOf(py), lonOf(px)), tree(2, latOf(py + 3), lonOf(px + 3))];
  assert.equal(run(near), 1);
  assert.equal(run([tree(1, latOf(py), lonOf(px)), tree(2, latOf(py + 90), lonOf(px + 90))]), 2);
  const lake = { water: layer(feat(3, { class: "lake" }, poly(0, 0, 4096, 4096))) };
  assert.equal(run(near, lake), 0);
});

test("from zoom 17 detail paths replace the tile paths; at zoom 16 the tile paths stay", () => {
  const raw = { transportation: layer(feat(2, { class: "path", subclass: "footway" }, [1000, 2300, 3000, 2310])) };
  const withPath = WP.prepareTile(raw, SX, SY, 14), noPath = WP.prepareTile({}, SX, SY, 14);
  const empty = [{ shapes: [], trees: [] }];
  for (const [z, same] of [[17, true], [16, false]] as const) {
    const n = Math.pow(2, z - 14), rect = WP.tileRect(SX * n + Math.floor(n / 2), SY * n + Math.floor((n * 2300) / 4096));
    const a = WP.renderRegion([withPath], { zoom: z, rect, pass: "full", detail: empty }), b = WP.renderRegion([noPath], { zoom: z, rect, pass: "full", detail: empty });
    assert.equal(Buffer.from(a.data).equals(Buffer.from(b.data)), same, `zoom ${z}`);
  }
});

test("map document: every inline script parses, detail layer is wired, attribution is present", () => {
  const scripts = [...mapDocument.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 4);
  for (const s of scripts) assert.doesNotThrow(() => new Function(s));
  // the worker blob is renderer + engine + glue, evaluated as plain script text
  const glue = /const GLUE="(.*?)";/.exec(mapDocument)![1];
  assert.doesNotThrow(() => new Function(pixelRendererSource + tileEngineSource + glue.replace(/\\"/g, '"')));
  assert.ok(mapDocument.includes("var WaybornPixel") && mapDocument.includes("var WaybornEngine"));
  assert.ok(tileEngineSource.includes("overpass-api.de") && mapDocument.includes("overpass-api.de"));
  assert.ok(mapDocument.includes("OpenMapTiles") && mapDocument.includes("OpenStreetMap") && mapDocument.includes("OpenFreeMap"));
  assert.ok(tileEngineSource.includes("https://tiles.openfreemap.org/planet") && !/\/planet\/\d{8}/.test(tileEngineSource));
});
