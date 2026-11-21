/*
 * Wayborn pixel world renderer.
 *
 * Turns OpenFreeMap vector tiles (OpenMapTiles schema, Mapbox Vector Tile
 * format, max zoom 14) into hard-edged pixel art, one 256 screen-px display
 * tile at a time:
 *
 *   1. decode     MVT protobuf -> layers of features (hand-written decoder)
 *   2. prepare    classify OpenMapTiles layers/classes -> drawing instructions,
 *                 geometry in absolute z14 "world units" so that neighbouring
 *                 source tiles join up
 *   3. rasterize  for a display tile (zoom 16-19, 3 screen px per art pixel,
 *                 grid anchored to the world) the shapes of every source tile
 *                 overlapping tile + MARGIN are scaled and clipped into a class
 *                 grid: areas by even-odd scanline fill, lines by a hard brush
 *   4. paint      per-pixel rules from neighbours (kerbs, banks, grids, tufts),
 *                 deterministic world-anchored hash noise
 *   5. objects    buildings (extruded 3/4-view blocks) and scattered trees are
 *                 depth sorted by their foot; shadows first
 *
 * Every pixel only depends on world coordinates and on features within MARGIN
 * art pixels, so tiles drawn separately are identical across their borders.
 * Pass "ground" stops after step 4; pass "full" continues from that state.
 *
 * The source is plain ES2017 kept in a string, because it runs inside a Web
 * Worker and the Leaflet WebView / iframe document. Tests evaluate the same
 * string in Node. Do not use backticks or dollar-brace sequences below.
 */
export const pixelRendererSource = String.raw`
var WaybornPixel = (function () {
'use strict';

/* Bump when the drawing rules or the decoded schema change: stored source tiles are keyed by it. */
var RENDER_VERSION = 'r1';
var TILE = 256, ART = 3, MARGIN = 28, ZREF = 14, UNITS = 4096;
/* Detail cells: OpenStreetMap extras the vector tiles lack are fetched per z16 tile. */
var DETAIL_Z = 16;

function rgb(hex) { return [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)]; }
function pal(o) { var r = {}; for (var k in o) r[k] = Array.isArray(o[k]) ? o[k].map(function (row) { return row.map(rgb); }) : rgb(o[k]); return r; }

/* Day palette, shared with the Wayborn pixel mockups. */
var P = pal({
  outline: '#12203A',
  grassA: '#8ED26B', grassB: '#A4DE7E', tuft: '#5DAE4F', flowerA: '#FFFFFF', flowerB: '#FFC83D',
  yard: '#B4DC8A', yardSpeck: '#9CCB72',
  forest: '#4FA055', forestSpeck: '#3C8A49',
  farm: '#DCD47E', farmLine: '#C4BA5F',
  sand: '#F3E2A9', sandSpeck: '#E0C98A',
  lot: '#DCD6C3', lotSpeck: '#CBC4AE',
  pitch: '#79C95E', pitchB: '#86D26A',
  street: '#E6E2D4', streetEdge: '#B4AE9A', streetSpeck: '#D2CDBC',
  road: '#DDD6C1', roadEdge: '#9E977F', roadLine: '#FFFFFF',
  path: '#F0DBA4', pathEdge: '#C9AD6E', pathSpeck: '#E0C98A',
  plaza: '#F1EEE4', plazaLine: '#D2CDBC',
  water: '#57B3EE', waterHi: '#C8ECFF', waterDeep: '#3A8FD6', bank: '#3F8A4B',
  ballast: '#A79F8F', tie: '#6E4526',
  leafL: '#9BE37F', leafM: '#4FB061', leafD: '#2F8552', trunkL: '#A06A3C', trunkD: '#6E4526',
  roofs: [['#F59C82', '#DD5F47', '#B44432'], ['#9DBBE3', '#5E7AA3', '#40598A'], ['#FFE79A', '#FFC83D', '#E08A1E'], ['#D3CCE3', '#A39BBF', '#756D96']],
  wall: '#FFF6DF', wallShade: '#E2D2AC', window: '#8FD3FF', door: '#8A5A33'
});
/* ------------------------------------------------------------ classes */
var BG = 0, GRASS = 1, FOREST = 2, FARM = 3, SAND = 4, PAVED = 5, WATER = 6, PATH = 7, STREET = 8, ROAD = 9,
    RAIL = 10, PITCH = 11, BRIDGE = 12, CENTER = 13, TIE = 14, YARD = 15, LOT = 16;
var C = { BG: BG, GRASS: GRASS, FOREST: FOREST, FARM: FARM, SAND: SAND, PAVED: PAVED, WATER: WATER, PATH: PATH, STREET: STREET,
          ROAD: ROAD, RAIL: RAIL, PITCH: PITCH, BRIDGE: BRIDGE, CENTER: CENTER, TIE: TIE, YARD: YARD, LOT: LOT };

function walkable(c) { return c === PATH || c === STREET || c === ROAD || c === PAVED || c === CENTER || c === BRIDGE; }
function wet(c) { return c === WATER || c === BRIDGE; }
/* true when any in-grid 4-neighbour is outside the class group f */
function border(f, n, s, w, e) { return (n !== -1 && !f(n)) || (s !== -1 && !f(s)) || (w !== -1 && !f(w)) || (e !== -1 && !f(e)); }

var ROAD_M = { motorway: 14, trunk: 13, primary: 12, secondary: 10, tertiary: 9 };
var WATER_M = { river: 18, canal: 10, stream: 3, stream_intermittent: 3, drain: 1.5, ditch: 1.5 };
var WANT = { water: 1, waterway: 1, landcover: 1, landuse: 1, park: 1, transportation: 1, building: 1 };
var PROPS = { 'class': 1, subclass: 1, brunnel: 1, render_height: 1, render_min_height: 1, ramp: 1 };

/*
 * OpenMapTiles (layer, properties, geometry type 2 = line / 3 = polygon) -> drawing instruction.
 * kind: 'area' | 'line' | 'building'. Returns null for what the pixel world does not draw.
 */
function classify(layer, p, gt) {
  p = p || {};
  var c = p['class'];
  if (layer === 'building') {
    if (gt !== 3 || +p.render_min_height > 0) return null;
    return { kind: 'building', z: 50 };
  }
  if (layer === 'water') return gt === 3 ? { kind: 'area', cls: WATER, z: 3 } : null;
  if (layer === 'waterway') {
    if (gt !== 2 || p.brunnel === 'tunnel') return null;
    return { kind: 'line', cls: WATER, meters: WATER_M[c] || 1.5, minW: 1, bridge: false, z: 8 };
  }
  if (gt !== 3 && layer !== 'transportation') return null;
  if (layer === 'landcover') {
    if (c === 'grass' || c === 'wetland') return { kind: 'area', cls: GRASS, z: 1 };
    if (c === 'wood') return { kind: 'area', cls: FOREST, z: 1 };
    if (c === 'farmland') return { kind: 'area', cls: FARM, z: 0 };
    if (c === 'sand') return { kind: 'area', cls: SAND, z: 1 };
    return null;
  }
  if (layer === 'landuse') {
    if (c === 'residential') return { kind: 'area', cls: YARD, z: 0 };
    if (c === 'education' || c === 'library' || c === 'garages' || c === 'bus_station') return { kind: 'area', cls: LOT, z: 0 };
    if (c === 'commercial' || c === 'retail' || c === 'industrial') return { kind: 'area', cls: LOT, z: 0 };
    if (c === 'cemetery' || c === 'playground' || c === 'garden') return { kind: 'area', cls: GRASS, z: 1 };
    if (c === 'pitch' || c === 'track' || c === 'stadium') return { kind: 'area', cls: PITCH, z: 2 };
    if (c === 'railway' || c === 'school' || c === 'university' || c === 'college' || c === 'hospital' || c === 'kindergarten')
      return { kind: 'area', cls: LOT, z: 0 };
    return null;
  }
  if (layer === 'park') return c === 'park' || c === 'nature_reserve' ? { kind: 'area', cls: GRASS, z: 1 } : null;
  if (layer === 'transportation') {
    if (p.brunnel === 'tunnel') return null;
    var bridge = p.brunnel === 'bridge';
    if (gt === 3) return c === 'pier' || c === 'bridge' || c === 'path' || c === 'pedestrian' || c === 'minor' || c === 'service' ? { kind: 'area', cls: PAVED, z: 4 } : null;
    if (gt !== 2) return null;
    var k = c === 'rail' || c === 'transit' ? RAIL : ROAD_M[c] ? ROAD : c === 'minor' || c === 'service' || c === 'busway' || c === 'raceway' ? STREET
      : c === 'path' && p.subclass === 'pedestrian' ? PAVED : c === 'path' || c === 'track' ? PATH : 0;
    if (!k) return null;
    if (k === RAIL) return { kind: 'line', cls: RAIL, meters: 3, minW: 2, bridge: bridge, z: bridge ? 24 : 13 };
    var m = k === ROAD ? (+p.ramp ? 7 : ROAD_M[c]) : c === 'service' ? 4 : k === STREET ? 7 : k === PAVED ? 6 : c === 'track' ? 3 : 2.5;
    return { kind: 'line', cls: k, meters: m, minW: k === PATH ? 1 : k === ROAD ? 3 : 2, bridge: bridge,
      z: (bridge ? 20 : 10) + (k === PATH ? 0 : k === ROAD ? 2 : 1) };
  }
  return null;
}

/* ---------------------------------------------------- OSM detail layer */
/*
 * The vector tiles leave out individually mapped trees, small paths and a lot of land use.
 * Those come from OpenStreetMap itself (Overpass), one z16 cell at a time, and are drawn on
 * top of the tile data. Roads, buildings and water always come from the tiles only.
 */
var OSM_PATH_M = { footway: 2.5, path: 2.5, cycleway: 2.5, steps: 2.5, bridleway: 2.5, track: 3, pedestrian: 6 };
function yes(v) { return v !== undefined && v !== 'no'; }
function closedWay(g) { return g && g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon; }

/* OSM tags -> drawing instruction for the detail layer (areas, small paths). Sidewalks and crossings are left out on purpose. */
function classifyOsm(t, closed) {
  if (!t) return null;
  if (yes(t.tunnel) || t.covered === 'yes' || (t.layer && +t.layer < 0 && !t.waterway && !t.natural)) return null;
  if (t.building) return null;
  var n = t.natural, l = t.landuse, s = t.leisure;
  if (t.highway) {
    var h = t.highway;
    if (closed && (t.area === 'yes' || (h === 'pedestrian' && t.area !== 'no'))) return { kind: 'area', cls: PAVED, z: 4 };
    if (h === 'footway' && (t.footway === 'sidewalk' || t.footway === 'crossing')) return null;
    var m = OSM_PATH_M[h]; if (!m) return null;
    var cls = h === 'pedestrian' ? PAVED : PATH, bridge = yes(t.bridge);
    return { kind: 'line', cls: cls, meters: m, minW: cls === PATH ? 1 : 2, bridge: bridge, z: (bridge ? 20 : 10) + (cls === PATH ? 0 : 1) };
  }
  if (!closed) return null;
  if (n === 'water' || t.water || l === 'basin' || l === 'reservoir' || t.waterway === 'riverbank' || t.waterway === 'dock' || s === 'swimming_pool')
    return { kind: 'area', cls: WATER, z: 3 };
  if (s === 'pitch' || s === 'track' || s === 'stadium') return { kind: 'area', cls: PITCH, z: 2 };
  if (t.amenity === 'parking' || t.amenity === 'marketplace' || t.place === 'square' || t.man_made === 'pier' || t.man_made === 'bridge')
    return { kind: 'area', cls: PAVED, z: 4 };
  if (n === 'wood' || l === 'forest') return { kind: 'area', cls: FOREST, z: 1 };
  if (n === 'beach' || n === 'sand' || s === 'beach_resort') return { kind: 'area', cls: SAND, z: 1 };
  if (/^(park|garden|common|dog_park|nature_reserve|golf_course|recreation_ground|playground)$/.test(s || '') ||
      /^(grassland|scrub|heath|wetland|meadow)$/.test(n || '') ||
      /^(grass|meadow|village_green|recreation_ground|cemetery|allotments|orchard|vineyard|greenfield|plant_nursery)$/.test(l || ''))
    return { kind: 'area', cls: GRASS, z: 1 };
  if (l === 'farmland' || l === 'farmyard') return { kind: 'area', cls: FARM, z: 0 };
  if (l === 'residential') return { kind: 'area', cls: YARD, z: 0 };
  if (/^(commercial|retail|industrial|construction|railway|garages|brownfield|education|religious|military)$/.test(l || ''))
    return { kind: 'area', cls: LOT, z: 0 };
  return null;
}

/* Overpass QL for the detail layer inside a south,west,north,east box. */
function overpassQuery(s, w, n, e) {
  var b = '(' + [s, w, n, e].map(function (v) { return v.toFixed(5); }).join(',') + ')';
  return '[out:json][timeout:25];(' +
    'node["natural"="tree"]' + b + ';' +
    'way["highway"~"^(footway|path|cycleway|steps|bridleway|track|pedestrian)$"]' + b + ';' +
    'way["natural"~"^(water|wood|scrub|grassland|heath|wetland|beach|sand)$"]' + b + ';' +
    'relation["natural"~"^(water|wood)$"]' + b + ';' +
    'way["landuse"]' + b + ';relation["landuse"]["type"="multipolygon"]' + b + ';' +
    'way["leisure"]' + b + ';relation["leisure"]["type"="multipolygon"]' + b + ';' +
    'way["amenity"~"^(parking|marketplace)$"]' + b + ';' +
    'way["place"="square"]' + b + ';way["man_made"~"^(pier|bridge)$"]' + b + ';' +
    'way["waterway"~"^(riverbank|dock)$"]' + b + ';' +
    ');out geom qt;';
}
function cellBounds(x, y) {
  var n = Math.pow(2, DETAIL_Z);
  function lat(yy) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * yy / n))) * 180 / Math.PI; }
  return { w: x / n * 360 - 180, e: (x + 1) / n * 360 - 180, n: lat(y), s: lat(y + 1) };
}
function detailKey(x, y, version) { return (version || RENDER_VERSION) + '/o/' + DETAIL_Z + '/' + x + '/' + y; }

/*
 * Overpass elements (out geom) -> { shapes, trees } in absolute z14 world units, JSON-serialisable
 * (this is what gets cached). trees is flat [x, y, id, ...].
 */
function prepareOsm(elements) {
  var shapes = [], trees = [];
  function proj(g) {
    var out = new Array(g.length * 2);
    for (var i = 0; i < g.length; i++) { var p = worldPx(g[i].lat, g[i].lon, ZREF); out[2 * i] = Math.round(p[0] * 160) / 10; out[2 * i + 1] = Math.round(p[1] * 160) / 10; }
    return out;
  }
  for (var e = 0; e < elements.length; e++) {
    var el = elements[e], t = el.tags;
    if (el.type === 'node') {
      if (t && t.natural === 'tree') { var p = worldPx(el.lat, el.lon, ZREF); trees.push(Math.round(p[0] * 160) / 10, Math.round(p[1] * 160) / 10, el.id % 2147483647); }
      continue;
    }
    var lists = [], closed = false, lat = 0;
    if (el.type === 'way' && el.geometry) { closed = closedWay(el.geometry); lists.push(proj(el.geometry)); lat = el.geometry[0].lat; }
    else if (el.type === 'relation' && el.members) {
      closed = true;
      for (var m = 0; m < el.members.length; m++) {
        var mb = el.members[m];
        if (mb.type === 'way' && mb.geometry && mb.geometry.length > 1 && (mb.role === 'outer' || mb.role === 'inner' || mb.role === '')) { lists.push(proj(mb.geometry)); lat = mb.geometry[0].lat; }
      }
    }
    if (!lists.length) continue;
    var c = classifyOsm(t, closed);
    if (!c || (c.kind !== 'line' && !closed)) continue;
    var bb = [Infinity, Infinity, -Infinity, -Infinity];
    for (var j = 0; j < lists.length; j++) for (var q = 0; q < lists[j].length; q += 2) {
      var x = lists[j][q], y = lists[j][q + 1];
      if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y;
    }
    shapes.push({ c: c, lists: lists, bb: bb, lat: lat, h: 0, d: 1, id: ihash(Math.round(lists[0][0] * 4), Math.round(lists[0][1] * 4), lists[0].length) });
  }
  return { shapes: shapes, trees: trees };
}

/* -------------------------------------------------------- projection */
function worldPx(lat, lon, zoom) {
  var size = 256 * Math.pow(2, zoom), s = Math.sin(Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180);
  return [(lon + 180) / 360 * size, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size];
}
function tileLat(sy, sz) { var n = Math.PI * (1 - 2 * (sy + 0.5) / Math.pow(2, sz)); return Math.atan(Math.sinh(n)) * 180 / Math.PI; }
function metersPerArt(lat, z) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z) * ART; }

/* The art pixels (world-anchored grid, ART screen px each) a 256 px display tile touches. Neighbours share the edge pixel. */
function tileRect(tx, ty) {
  return { ax0: Math.floor(TILE * tx / ART), ay0: Math.floor(TILE * ty / ART), ax1: Math.ceil(TILE * (tx + 1) / ART), ay1: Math.ceil(TILE * (ty + 1) / ART) };
}
/* Source tiles [sx, sy] (zoom sz) that cover a rect of art pixels at zoom z plus MARGIN. */
function sourceTiles(z, rect, sz) {
  var span = TILE * Math.pow(2, z - sz) / ART, max = Math.pow(2, sz) - 1, out = [];
  var x0 = Math.max(0, Math.floor((rect.ax0 - MARGIN) / span)), x1 = Math.min(max, Math.floor((rect.ax1 + MARGIN - 1) / span));
  var y0 = Math.max(0, Math.floor((rect.ay0 - MARGIN) / span)), y1 = Math.min(max, Math.floor((rect.ay1 + MARGIN - 1) / span));
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}

/* ------------------------------------------------------------- noise */
function hash(x, y, s) {
  var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function strHash(id) { var h = 0; id = String(id); for (var i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619); return h; }

/* ------------------------------------------------------ rasterizers */
/* Even-odd scanline fill over a flat edge list [x0,y0,x1,y1,...]; samples pixel centres. */
function fillEdges(E, w, h, cb) {
  var minY = Infinity, maxY = -Infinity, i;
  for (i = 0; i < E.length; i += 4) {
    if (E[i + 1] < minY) minY = E[i + 1]; if (E[i + 3] < minY) minY = E[i + 3];
    if (E[i + 1] > maxY) maxY = E[i + 1]; if (E[i + 3] > maxY) maxY = E[i + 3];
  }
  var y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(h - 1, Math.ceil(maxY)), xs = [];
  for (var y = y0; y <= y1; y++) {
    var yc = y + 0.5; xs.length = 0;
    for (i = 0; i < E.length; i += 4) {
      var ay = E[i + 1], by = E[i + 3];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(E[i] + (yc - ay) / (by - ay) * (E[i + 2] - E[i]));
    }
    if (xs.length < 2) continue;
    xs.sort(function (a, b) { return a - b; });
    for (var k = 0; k + 1 < xs.length; k += 2) {
      var xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (var x = xa; x <= xb; x++) cb(x, y);
    }
  }
}

/* Hard-edged thick polyline. width 1 uses a DDA so diagonals stay one pixel thin.
   cb(x, y, along) where along counts pixels from the start, for dashes. */
function strokeLine(pts, width, w, h, cb) {
  var along = 0;
  for (var i = 0; i + 3 < pts.length; i += 2) {
    var x0 = pts[i], y0 = pts[i + 1], x1 = pts[i + 2], y1 = pts[i + 3], dx = x1 - x0, dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (width <= 1) {
      var n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
      for (var s = 0; s <= n; s++) {
        var px = Math.floor(x0 + dx * s / n), py = Math.floor(y0 + dy * s / n);
        if (px >= 0 && py >= 0 && px < w && py < h) cb(px, py, along + len * s / n);
      }
    } else {
      var r = width / 2, r2 = r * r, L2 = dx * dx + dy * dy || 1e-9;
      var bx0 = Math.max(0, Math.floor(Math.min(x0, x1) - r)), bx1 = Math.min(w - 1, Math.ceil(Math.max(x0, x1) + r));
      var by0 = Math.max(0, Math.floor(Math.min(y0, y1) - r)), by1 = Math.min(h - 1, Math.ceil(Math.max(y0, y1) + r));
      for (var yy = by0; yy <= by1; yy++) for (var xx = bx0; xx <= bx1; xx++) {
        var cx = xx + 0.5 - x0, cy = yy + 0.5 - y0, t = Math.max(0, Math.min(1, (cx * dx + cy * dy) / L2));
        var ex = cx - t * dx, ey = cy - t * dy;
        if (ex * ex + ey * ey <= r2) cb(xx, yy, along + t * len);
      }
    }
    along += len;
  }
}
/* -------------------------------------------------------------- sprites */
var SPR = {
  small: ['..ooo..', '.oLLMo.', 'oLLLMMo', 'oLMMMDo', 'oMMMDDo', 'oMDDDDo', '.ooDoo.', '..oto..', '..ooo..'],
  big: ['.....oooooo.....', '...ooLLLLLLoo...', '..oLLLLLLMLMMo..', '.oLLLLLLMMMMMMo.', '.oLLLMLMMMMMMMo.',
    'oLLLMMMMMMMMMDDo', 'oLLMMMMMMMDMMDDo', 'oLMMMMMMMMMMDDDo', 'oMMMMMDMMMMDDDDo', 'oMMMMMMMMDDDDDDo', '.oMMDMMMDDDDDDo.',
    '.oDMMDDDDDDDDDo.', '..ooDDDDDDDDoo..', '....oootTooo....', '......otTo......', '......otTo......', '.....ootToo.....']
};
var CH = { o: 'outline', L: 'leafL', M: 'leafM', D: 'leafD', t: 'trunkL', T: 'trunkD' };

/* ------------------------------------------------------------- decode */
/* Minimal Mapbox Vector Tile reader (protobuf wire format). Only layers in WANT and only the PROPS keys are kept. */
function decodeTile(buf) {
  var pos = 0, dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), td = new TextDecoder(), layers = {};
  function vint() { var r = 0, m = 1, b; do { b = buf[pos++]; r += (b & 127) * m; m *= 128; } while (b & 128); return r; }
  function str(s, e) { return td.decode(buf.subarray(s, e)); }
  function skip(wt) { if (wt === 0) vint(); else if (wt === 1) pos += 8; else if (wt === 2) pos += vint(); else if (wt === 5) pos += 4; else throw new Error('bad wire type ' + wt); }
  function value(s, e) {
    pos = s; var v = null;
    while (pos < e) {
      var tag = vint(), f = tag >>> 3, wt = tag & 7;
      if (f === 1) { var l = vint(); v = str(pos, pos + l); pos += l; }
      else if (f === 2) { v = dv.getFloat32(pos, true); pos += 4; }
      else if (f === 3) { v = dv.getFloat64(pos, true); pos += 8; }
      else if (f === 4 || f === 5) v = vint();
      else if (f === 6) { var z = vint(); v = (z % 2 ? -(z + 1) : z) / 2; }
      else if (f === 7) v = vint() !== 0;
      else skip(wt);
    }
    return v;
  }
  function geometry(s, e, type) {
    pos = s; var x = 0, y = 0, lists = [], cur = null;
    while (pos < e) {
      var ci = vint(), cmd = ci & 7, cnt = ci >>> 3;
      if (cmd === 1 || cmd === 2) {
        for (var i = 0; i < cnt; i++) {
          var dx = vint(), dy = vint(); x += (dx >>> 1) ^ -(dx & 1); y += (dy >>> 1) ^ -(dy & 1);
          if (cmd === 1) { if (cur) lists.push(cur); cur = []; }
          if (!cur) cur = [];
          cur.push(x, y);
        }
      } else if (cmd === 7) { if (cur && cur.length) cur.push(cur[0], cur[1]); }
      else throw new Error('bad geometry command ' + cmd);
    }
    if (cur) lists.push(cur);
    return lists;
  }
  function layer(s, e) {
    pos = s; var name = '', extent = 4096, keys = [], vals = [], fr = [];
    while (pos < e) {
      var tag = vint(), f = tag >>> 3, wt = tag & 7, l;
      if (f === 1) { l = vint(); name = str(pos, pos + l); pos += l; }
      else if (f === 2) { l = vint(); fr.push(pos, pos + l); pos += l; }
      else if (f === 3) { l = vint(); keys.push(str(pos, pos + l)); pos += l; }
      else if (f === 4) { l = vint(); var vs = pos; vals.push(value(vs, vs + l)); pos = vs + l; }
      else if (f === 5) extent = vint();
      else skip(wt);
    }
    return { name: name, extent: extent, keys: keys, vals: vals, fr: fr };
  }
  while (pos < buf.length) {
    var tag = vint(), f = tag >>> 3, wt = tag & 7;
    if (f === 3 && wt === 2) {
      var len = vint(), end = pos + len, L = layer(pos, end);
      pos = end;
      if (!WANT[L.name]) continue;
      var feats = [];
      for (var i = 0; i < L.fr.length; i += 2) {
        pos = L.fr[i]; var fe = L.fr[i + 1], tags = [], type = 0, gs = 0, ge = 0;
        while (pos < fe) {
          var t2 = vint(), f2 = t2 >>> 3, w2 = t2 & 7;
          if (f2 === 2) { var tl = vint(), te = pos + tl; while (pos < te) tags.push(vint()); }
          else if (f2 === 3) type = vint();
          else if (f2 === 4) { var gl = vint(); gs = pos; ge = pos + gl; pos = ge; }
          else skip(w2);
        }
        var props = {};
        for (var k = 0; k + 1 < tags.length; k += 2) { var key = L.keys[tags[k]]; if (PROPS[key]) props[key] = L.vals[tags[k + 1]]; }
        feats.push({ type: type, props: props, lists: type >= 2 ? geometry(gs, ge, type) : [] });
      }
      layers[L.name] = { extent: L.extent, features: feats };
      pos = end;
    } else skip(wt);
  }
  return layers;
}

function ihash(a, b, n) { return (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(n | 0, 83492791)) >>> 0; }

/* Signed area of a flat ring: positive for MVT exterior rings, negative for holes. */
function ringArea(r) { var a = 0; for (var i = 0; i + 3 < r.length; i += 2) a += r[i] * r[i + 3] - r[i + 2] * r[i + 1]; return a; }

/*
 * Decoded layers of source tile sx,sy (zoom sz) -> classified shapes in absolute z14 world units.
 * OpenMapTiles merges buildings into multipolygons, so those are split into one shape per exterior ring.
 */
function prepareTile(raw, sx, sy, sz) {
  var unit = UNITS * Math.pow(2, ZREF - sz), shapes = [], lat = tileLat(sy, sz);
  function add(c, rings, sc, ext, h) {
    var bb = [Infinity, Infinity, -Infinity, -Infinity], lists = [];
    for (var j = 0; j < rings.length; j++) {
      var src = rings[j], dst = new Array(src.length);
      for (var q = 0; q < src.length; q += 2) {
        var x = (sx * ext + src[q]) * sc, y = (sy * ext + src[q + 1]) * sc;
        dst[q] = x; dst[q + 1] = y;
        if (j === 0 || c.kind !== 'building') { if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; }
      }
      lists.push(dst);
    }
    shapes.push({ c: c, lists: lists, bb: bb, lat: lat, h: h > 0 ? h : 0, id: ihash(Math.round(lists[0][0] * 4), Math.round(lists[0][1] * 4), lists[0].length) });
  }
  for (var name in raw) {
    var L = raw[name], sc = unit / L.extent;
    for (var i = 0; i < L.features.length; i++) {
      var ft = L.features[i], c = classify(name, ft.props, ft.type);
      if (!c || (c.kind !== 'line' && ft.type !== 3) || !ft.lists.length) continue;
      var h = +ft.props.render_height;
      if (c.kind === 'building') {
        var cur = null, rings = [];
        for (var j = 0; j < ft.lists.length; j++) {
          var ring = ft.lists[j];
          if (ring.length < 6) continue;
          if (ringArea(ring) > 0 || !cur) { cur = [ring]; rings.push(cur); } else cur.push(ring);
        }
        for (var g = 0; g < rings.length; g++) add(c, rings[g], sc, L.extent, h);
      } else add(c, ft.lists, sc, L.extent, h);
    }
  }
  return { sx: sx, sy: sy, sz: sz, lat: lat, shapes: shapes };
}

/* ------------------------------------------------------------ storage */
function cacheKey(sz, x, y, version) { return (version || RENDER_VERSION) + '/' + sz + '/' + x + '/' + y; }
/*
 * Capped store of raw source tiles over a key-value adapter:
 *   kv.get(k) -> buffer|undefined, kv.put(k, buf, meta), kv.del(k), kv.metas() -> [{k,v,n,t}], kv.touch(k, t)
 * Entries of another style version are purged on open(); the oldest go first when the cap is exceeded.
 */
function makeStore(kv, o) {
  o = o || {};
  var ver = o.version || RENDER_VERSION, cap = o.cap || 48 * 1024 * 1024, clock = o.now || Date.now;
  var store = {
    version: ver,
    open: async function () {
      var metas = await kv.metas();
      for (var i = 0; i < metas.length; i++) if (metas[i].v !== ver) await kv.del(metas[i].k);
    },
    get: async function (k) {
      var b = await kv.get(k);
      if (b) kv.touch(k, clock());
      return b;
    },
    put: async function (k, buf) {
      await kv.put(k, buf, { k: k, v: ver, n: buf.byteLength, t: clock() });
      var metas = await kv.metas(), total = 0, i;
      for (i = 0; i < metas.length; i++) total += metas[i].n;
      metas.sort(function (a, b) { return a.t - b.t; });
      for (i = 0; i < metas.length && total > cap; i++) { if (metas[i].k === k) continue; await kv.del(metas[i].k); total -= metas[i].n; }
    }
  };
  return store;
}

/* ------------------------------------------------------------- render */
function crop(img, w, x0, y0, cw, ch) {
  var out = new Uint8ClampedArray(cw * ch * 4);
  for (var y = 0; y < ch; y++) out.set(img.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x0 + cw) * 4), y * cw * 4);
  return out;
}

/* Side (art px) of the cells that hold at most one mapped tree; about a sprite wide. */
function treeCell(z) { return z >= 18 ? 11 : z === 17 ? 7 : 9; }

/* Ground pass over the region E = tile rect + MARGIN (origin ox,oy in world art px, size w,h). */
function ground(preps, detail, z, ox, oy, w, h) {
  var f = Math.pow(2, z - ZREF) / 48, list = [], counts = { areas: 0, lines: 0, buildings: 0, trees: 0 };
  var cls = new Uint8Array(w * h), p, i, j, e;
  /* detail (OSM) paths replace the tile paths from zoom 17; at zoom 16 they would only clutter */
  var detailLines = !!detail && z >= 17, groups = preps.map(function (q) { return q.shapes; });
  if (detail) detail.forEach(function (d) { groups.push(d.shapes); });
  for (var gi = 0; gi < groups.length; gi++) for (i = 0; i < groups[gi].length; i++) {
    var sh = groups[gi][i], bb = sh.bb, k = sh.c;
    if (k.kind === 'line' && (sh.d ? !detailLines : detailLines && (k.cls === PATH || k.cls === PAVED))) continue;
    var x0 = bb[0] * f - ox, y0 = bb[1] * f - oy, x1 = bb[2] * f - ox, y1 = bb[3] * f - oy;
    if (k.kind === 'building') { if (x1 < -6 || x0 > w + 6 || y1 < -4 || y0 > h + 18) continue; }
    else { var pad = k.kind === 'line' ? 12 : 2; if (x1 < -pad || x0 > w + pad || y1 < -pad || y0 > h + pad) continue; }
    var lists = new Array(sh.lists.length);
    for (j = 0; j < sh.lists.length; j++) {
      var s = sh.lists[j], d = new Array(s.length);
      for (e = 0; e < s.length; e += 2) { d[e] = s[e] * f - ox; d[e + 1] = s[e + 1] * f - oy; }
      lists[j] = d;
    }
    list.push({ c: k, lists: lists, bb: [x0, y0, x1, y1], area: (bb[2] - bb[0]) * (bb[3] - bb[1]), id: sh.id, lat: sh.lat, h: sh.h });
  }
  list.sort(function (a, b) { return (a.c.z - b.c.z) || (b.area - a.area) || (a.id - b.id); });
  var bshapes = [];
  for (var si = 0; si < list.length; si++) {
    var it = list[si], c = it.c;
    if (c.kind === 'area') {
      counts.areas++;
      var v = c.cls;
      fillEdges(edgesOf(it.lists), w, h, function (x, y) { cls[y * w + x] = v; });
    } else if (c.kind === 'line') {
      counts.lines++;
      var width = Math.min(16, Math.max(c.minW, Math.round(c.meters / metersPerArt(it.lat, z))));
      for (var li = 0; li < it.lists.length; li++) {
        var pts = it.lists[li];
        if (c.bridge) strokeLine(pts, width + 2, w, h, function (x, y) { cls[y * w + x] = BRIDGE; });
        var lc = c.cls;
        strokeLine(pts, width, w, h, function (x, y) { cls[y * w + x] = lc; });
        if (lc === ROAD && width >= 5) strokeLine(pts, 1, w, h, function (x, y, a) { if ((a % 6) < 3) cls[y * w + x] = CENTER; });
        if (lc === RAIL) strokeLine(pts, 1, w, h, function (x, y, a) { if ((a % 3) < 1) cls[y * w + x] = TIE; });
      }
    } else bshapes.push(it);
  }

  /* Mapped trees: skip water, roads and rails, and keep one tree per world-anchored cell so dense groves stay readable. */
  var mapped = [];
  if (detail) {
    var cell = {}, N = treeCell(z);
    detail.forEach(function (d) {
      var tr = d.trees;
      for (var ti = 0; ti + 2 < tr.length; ti += 3) {
        var tx = Math.floor(tr[ti] * f - ox), ty = Math.floor(tr[ti + 1] * f - oy);
        if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
        var under = cls[ty * w + tx];
        if (under === WATER || under === BRIDGE || under === ROAD || under === CENTER || under === RAIL || under === TIE) continue;
        var key = Math.floor((tx + ox) / N) + ',' + Math.floor((ty + oy) / N), hv = ihash(tr[ti + 2], 1, 2), cur = cell[key];
        if (!cur || hv < cur.hv || (hv === cur.hv && tr[ti + 2] < cur.id)) cell[key] = { x: tx, y: ty, hv: hv, id: tr[ti + 2] };
      }
    });
    for (var ck in cell) mapped.push(cell[ck]);
  }

  var img = new Uint8ClampedArray(w * h * 4);
  function put(x, y, col) { if (x < 0 || y < 0 || x >= w || y >= h) return; var q = (y * w + x) * 4; img[q] = col[0]; img[q + 1] = col[1]; img[q + 2] = col[2]; img[q + 3] = 255; }
  function at(x, y) { return (x < 0 || y < 0 || x >= w || y >= h) ? -1 : cls[y * w + x]; }
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var c0 = cls[y * w + x], X = x + ox, Y = y + oy, r = hash(X, Y, 1), col;
    var n = at(x, y - 1), so = at(x, y + 1), we = at(x - 1, y), ea = at(x + 1, y);
    switch (c0) {
      case BG: case GRASS:
        col = r < 0.03 ? P.tuft : r < 0.06 ? P.grassB : P.grassA;
        if (r < 0.03 && hash(X, Y - 1, 2) < 0.5) put(x + 1, y - 1, P.tuft);
        if (c0 === GRASS && r > 0.994) col = hash(X, Y, 9) < 0.5 ? P.flowerA : P.flowerB;
        break;
      case YARD: col = r < 0.04 ? P.yardSpeck : P.yard; break;
      case FOREST: col = r < 0.08 ? P.forestSpeck : P.forest; break;
      case FARM: col = (Y % 3 === 0) ? P.farmLine : P.farm; break;
      case SAND: col = r < 0.05 ? P.sandSpeck : P.sand; break;
      case LOT: col = r < 0.04 ? P.lotSpeck : P.lot; break;
      case PITCH: col = ((X >> 2) & 1) ? P.pitchB : P.pitch; break;
      case PAVED: col = (X % 6 === 0 || Y % 6 === 0) ? P.plazaLine : P.plaza; break;
      case WATER:
        if (border(wet, n, so, we, ea)) col = P.bank;
        else if (!wet(at(x, y - 2)) && at(x, y - 2) !== -1) col = P.waterDeep;
        else if ((X & 3) !== 3 && hash(X >> 2, Y, 7) < 0.05) col = P.waterHi;
        else col = P.water;
        break;
      case PATH: col = border(walkable, n, so, we, ea) ? P.pathEdge : r < 0.05 ? P.pathSpeck : P.path; break;
      case STREET: col = border(walkable, n, so, we, ea) ? P.streetEdge : r < 0.04 ? P.streetSpeck : P.street; break;
      case ROAD: col = border(walkable, n, so, we, ea) ? P.roadEdge : r < 0.04 ? P.streetSpeck : P.road; break;
      case CENTER: col = P.roadLine; break;
      case RAIL: col = P.ballast; break;
      case TIE: col = P.tie; break;
      case BRIDGE: col = P.outline; break;
      default: col = P.grassA;
    }
    put(x, y, col);
  }
  return { z: z, ox: ox, oy: oy, w: w, h: h, cls: cls, img: img, bshapes: bshapes, counts: counts, mapped: mapped, hasDetail: !!detail };
}

function edgesOf(lists) {
  var E = [];
  for (var j = 0; j < lists.length; j++) {
    var p = lists[j], n = p.length;
    for (var i = 0; i + 3 < n; i += 2) E.push(p[i], p[i + 1], p[i + 2], p[i + 3]);
    if (n >= 6 && (p[0] !== p[n - 2] || p[1] !== p[n - 1])) E.push(p[n - 2], p[n - 1], p[0], p[1]);
  }
  return E;
}

/*
 * Objects pass: buildings and trees over a copy of the ground image. Objects are drawn
 * wherever their pixels reach, so a block crossing a tile edge is painted by both tiles;
 * the tile that holds the foot point owns it (counts). Order is by foot, then x, then id,
 * which does not depend on which tile asks.
 */
function objectsPass(st, rx, ry, rw, rh) {
  var w = st.w, h = st.h, ox = st.ox, oy = st.oy, z = st.z, cls = st.cls, img = st.img.slice();
  var objs = [], counts = { areas: st.counts.areas, lines: st.counts.lines, buildings: 0, trees: 0 }, i;
  function put(x, y, col) { if (x < 0 || y < 0 || x >= w || y >= h) return; var q = (y * w + x) * 4; img[q] = col[0]; img[q + 1] = col[1]; img[q + 2] = col[2]; img[q + 3] = 255; }
  for (i = 0; i < st.bshapes.length; i++) { var bo = buildingObj(st.bshapes[i]); if (bo) objs.push(bo); }

  /* scattered trees in woods and parks, on a world-anchored jittered lattice */
  var N = treeCell(z), taken = {}, mi;
  for (mi = 0; mi < st.mapped.length; mi++) { var mt = st.mapped[mi]; taken[Math.floor((mt.x + ox) / N) + ',' + Math.floor((mt.y + oy) / N)] = 1; objs.push({ k: 'tree', x: mt.x, y: mt.y, foot: mt.y, sx: mt.x, fx: mt.x, id: mt.id }); }
  function crowded(x, y) {
    var cx = Math.floor((x + ox) / N), cy = Math.floor((y + oy) / N);
    for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) if (taken[(cx + a) + ',' + (cy + b)]) return true;
    return false;
  }
  var step = z >= 18 ? 12 : z === 17 ? 7 : 9, gx0 = Math.floor(ox / step) - 1, gy0 = Math.floor(oy / step) - 1;
  for (var gy = gy0; gy * step < oy + h + 20; gy++) for (var gx = gx0; gx * step < ox + w + 8; gx++) {
    var px = gx * step + Math.floor(hash(gx, gy, 3) * step) - ox, py = gy * step + Math.floor(hash(gx, gy, 4) * step) - oy;
    if (px < 0 || py < 0 || px >= w || py >= h) continue;
    var under = cls[py * w + px], chance = under === FOREST ? 0.85 : under === GRASS ? 0.22 : 0;
    if (!chance || hash(gx, gy, 5) > chance) continue;
    if (py >= 2 && cls[(py - 2) * w + px] !== under) continue;
    if (mi && crowded(px, py)) continue;
    objs.push({ k: 'tree', x: px, y: py, foot: py, sx: px, fx: px, id: ihash(gx, gy, 7) });
  }

  var shadow = new Uint8Array(w * h);
  function shade(x, y) { if (x >= 0 && y >= 0 && x < w && y < h) shadow[y * w + x] = 1; }
  objs.forEach(function (ob) {
    if (ob.k === 'tree') { for (var sx = -2; sx <= 3; sx++) shade(ob.x + sx, ob.y + 1); }
    else for (var q = 0; q < ob.mask.length; q++) if (ob.mask[q]) shade(ob.x0 + (q % ob.mw) + 2, ob.y0 + ((q / ob.mw) | 0) + 1);
  });
  for (var s = 0; s < shadow.length; s++) if (shadow[s] && cls[s] !== WATER) { img[s * 4] *= 0.8; img[s * 4 + 1] *= 0.8; img[s * 4 + 2] *= 0.86; }

  objs.sort(function (a, b) { return (a.foot - b.foot) || (a.sx - b.sx) || (a.id - b.id); });
  for (i = 0; i < objs.length; i++) {
    var it = objs[i];
    if (it.fx >= rx && it.fx < rx + rw && it.foot >= ry && it.foot < ry + rh) { if (it.k === 'tree') counts.trees++; else counts.buildings++; }
    if (it.k === 'tree') {
      var spr = z >= 18 ? SPR.big : SPR.small, sw = spr[0].length, x0 = it.x - (sw >> 1), y0 = it.y - spr.length + 1;
      for (var j = 0; j < spr.length; j++) for (var ii = 0; ii < sw; ii++) { var ch = spr[j][ii]; if (ch !== '.') put(x0 + ii, y0 + j, P[CH[ch]]); }
    } else paintBuilding(it);
  }
  return { img: img, counts: counts };

  /* Extrude a footprint upward by its height into a local mask: 1 wall, 2 roof. */
  function buildingObj(sh) {
    var mpp = metersPerArt(sh.lat, z), height = sh.h > 0 ? sh.h : 6;
    var bb = sh.bb, area = (bb[2] - bb[0]) * (bb[3] - bb[1]);
    if (z <= 17 && area < (z === 17 ? 3 : 10)) return null;   // zoomed out, sheds and tiny annexes are only dark speckle
    var hp = Math.max(z <= 16 ? 1 : 2, Math.min(14, Math.round(height / mpp * 0.7)));
    var x0 = Math.max(Math.floor(bb[0]) - 1, -4), xe = Math.min(Math.ceil(bb[2]) + 1, w + 4);
    var dy = Math.max(Math.floor(bb[1]) - 1, -hp - 6), ye = Math.min(Math.ceil(bb[3]) + 1, h + hp + 6);
    var mw = xe - x0 + 1, fh = ye - dy + 1;
    if (mw <= 0 || fh <= 0) return null;
    var y0 = dy - hp, mh = fh + hp, foot = new Uint8Array(mw * fh);
    var E = edgesOf(sh.lists).map(function (v, q) { return (q & 1) ? v - dy : v - x0; });
    var any = false;
    fillEdges(E, mw, fh, function (x, y) { foot[y * mw + x] = 1; any = true; });
    if (!any && bb[2] - bb[0] < 3 && bb[3] - bb[1] < 3) {   // sub-pixel building: keep one pixel so it still shows
      var cx = Math.floor((bb[0] + bb[2]) / 2) - x0, cy = Math.floor((bb[1] + bb[3]) / 2) - dy;
      if (cx >= 0 && cy >= 0 && cx < mw && cy < fh) { foot[cy * mw + cx] = 1; any = true; }
    }
    if (!any) return null;
    // mask row r is world row y0 + r. A footprint row y sits at mask row y + hp;
    // its roof is lifted to mask row y, the hp rows below it are wall.
    var mask = new Uint8Array(mw * mh);
    for (var y = 0; y < fh; y++) for (var x = 0; x < mw; x++) if (foot[y * mw + x]) {
      for (var d = 1; d <= hp; d++) if (!mask[(y + d) * mw + x]) mask[(y + d) * mw + x] = 1;
      mask[y * mw + x] = 2;
    }
    var roofs = P.roofs, tone = (sh.id >>> 3) % roofs.length;
    var footRow = Math.max(Math.floor(bb[1]), Math.ceil(bb[3] - 0.5) - 1);
    return { k: 'building', yoff: dy - (Math.floor(bb[1]) - 1), x0: x0, y0: y0, mw: mw, mh: mh, mask: mask, hp: hp, foot: footRow, sx: Math.floor(bb[0]), fx: Math.floor((bb[0] + bb[2]) / 2), id: sh.id, roof: roofs[tone], seed: sh.id };
  }

  function paintBuilding(b) {
    var mw = b.mw, mh = b.mh, M = b.mask, R = b.roof, OUT = z <= 16 ? R[2] : P.outline;   // zoomed out, a black outline on 3-pixel houses is just noise
    function m(x, y) { return (x < 0 || y < 0 || x >= mw || y >= mh) ? 0 : M[y * mw + x]; }
    for (var y = 0; y < mh; y++) for (var x = 0; x < mw; x++) {
      var v = M[y * mw + x]; if (!v) continue;
      var gx = b.x0 + x, gy = b.y0 + y, X = gx + ox, yy = y + b.yoff, col;   // X: world column, for stable patterns
      if (!m(x, y - 1) || !m(x, y + 1) || !m(x - 1, y) || !m(x + 1, y)) col = OUT;
      else if (v === 2) {
        var up = m(x, y - 1), dn = m(x, y + 1);
        if (dn === 1) col = OUT;                             // eave line
        else if (!m(x, y - 2) || !m(x - 2, y)) col = R[0];   // lit north/west rim
        else if (!m(x + 2, y) || m(x, y + 2) !== 2) col = R[2];
        else if (yy % 3 === 0 || (yy % 3 === 1 && ((X + ((yy / 3) | 0) * 2) % 5 === 0))) col = R[2];
        else col = R[1];
        if (up === 0 && col !== OUT) col = R[0];
      } else {
        // wall: depth below the eave decides shading and windows
        var dd = 0; while (m(x, y - dd - 1) === 1) dd++;
        if (dd === 0) col = P.wallShade;
        else if (!m(x, y + 2) && b.hp >= 3 && ((X + b.seed) % 9 === 4 || (X + b.seed) % 9 === 5)) col = P.door;
        else if (dd % 3 === 1 && (X % 3) === 1 && m(x, y + 1) === 1 && m(x - 1, y) && m(x + 1, y)) col = P.window;
        else col = P.wall;
      }
      put(gx, gy, col);
    }
  }
}

/*
 * Draw art pixels of rect {ax0,ay0,ax1,ay1} (world-anchored grid) from the prepared source tiles.
 * o: { zoom, rect, pass: 'ground' | 'full', detail?, state? }. detail: prepared OSM cells covering the rect + MARGIN
 * (all of them, or none). state is the ground result of the same call.
 * returns { ax0, ay0, aw, ah, data: RGBA, counts, state }
 */
function renderRegion(preps, o) {
  var r = o.rect, M = MARGIN, aw = r.ax1 - r.ax0, ah = r.ay1 - r.ay0, w = aw + 2 * M, h = ah + 2 * M;
  var st = o.state || ground(preps, o.detail || null, o.zoom, r.ax0 - M, r.ay0 - M, w, h);
  var out = { ax0: r.ax0, ay0: r.ay0, aw: aw, ah: ah, state: st, detail: st.hasDetail };
  if (o.pass === 'ground') { out.data = crop(st.img, w, M, M, aw, ah); out.counts = st.counts; return out; }
  var full = objectsPass(st, M, M, aw, ah);
  out.data = crop(full.img, w, M, M, aw, ah); out.counts = full.counts;
  return out;
}

return {
  decodeTile: decodeTile, prepareTile: prepareTile, classify: classify, classifyOsm: classifyOsm, prepareOsm: prepareOsm,
  overpassQuery: overpassQuery, cellBounds: cellBounds, detailKey: detailKey, DETAIL_Z: DETAIL_Z, renderRegion: renderRegion, tileRect: tileRect, sourceTiles: sourceTiles,
  fillEdges: fillEdges, strokeLine: strokeLine, worldPx: worldPx, hash: hash, C: C,
  RENDER_VERSION: RENDER_VERSION, cacheKey: cacheKey, makeStore: makeStore, MARGIN: MARGIN, TILE: TILE, ART: ART
};
})();
`;
