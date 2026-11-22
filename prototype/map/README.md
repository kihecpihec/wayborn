# Wayborn Map Home

The Expo app opens to a Ljubljana preview on iOS, Android, and web. Browse, switch between pixel and standard tiles, or recenter the preview. Tap **Start walk** to request foreground location and wait for a valid fix. Pause or finish from the map. Walks are held in memory for the current session.

## Run

Use Node **22.13+** (the included `.nvmrc` selects 22.23.2):

```sh
cd prototype/map  # from the repository root
nvm use
npm ci
npm run web
```

Open the URL printed by Expo. The preview shell opens immediately. While pixel tiles render, standard tiles can fill the map first. If neither source produces a drawable tile within three seconds, use **Retry map** after checking your connection.

For a phone, run `npm start`, then open with an Expo Go version supporting SDK 58. Alternatively use `npm run ios` / `npm run android` with an installed simulator/emulator. A native development build can be created using `npx expo run:ios` or `npx expo run:android` if Expo Go on your device has a different SDK version. Native builds require the appropriate Xcode/Android toolchain.

For an iPhone that cannot reach Metro over Wi-Fi, run `npm run start:iphone` from this directory and scan the QR code. This starts the Expo Go tunnel on port 8092.

Map opens first. Activity shows the current walk and its totals. To test session continuity, start and pause a walk, open Activity, then return to Map and check that **Resume walk** and the same totals are still visible. Guild, Goals, and Profile show their availability.

## Walking demo

Run `EXPO_PUBLIC_WALKING_DEMO=1 npm run web` or `EXPO_PUBLIC_WALKING_DEMO=1 npm start` to open the existing walking prototype in development. Stop Expo and restart without the flag to return to Map Home. The demo requests foreground location and shows a Ljubljana preview until an accepted fix arrives. Browser location requires localhost or HTTPS. Use simulator location controls or the developer inputs described below.

### Live location and spoofing

- **Device GPS** subscribes to foreground OS location updates with `expo-location`. Physically walking updates the explorer, camera, and dotted trail. Dragging the map changes only its camera; the target button restores following.
- In **Developer tools**, type latitude/longitude (decimal degrees) or choose a city preset, then press **Apply location**. Presets only populate the fields. Applying stops GPS, labels the location as spoofed, and starts a fresh walk. **Use device GPS / retry** restores the OS location source and resets the session.
- To simulate actual movement through the **same OS location pipeline**, leave Device GPS enabled and use simulator location controls: on iOS Simulator choose **Features → Location**, or replay `fixtures/ljubljana-walk.gpx` through Xcode’s location simulation. On Android Emulator use **Extended controls → Location** to set points or play a route. For browser GPS testing, Chrome DevTools **Sensors → Location** overrides browser geolocation. A browser watcher may require the GPS retry button after changing its override.
- No movement joystick or map-tap relocation is implemented. Manual coordinate overrides are teleports and reset distance; simulated OS routes behave like walks.

### Walk behavior

Pause/resume and end/new-walk controls work. GPS fixes with accuracy worse than 50 m, jitter under 3 m, and walking speeds above 4 m/s do not add distance. A large jump starts a new trail segment. The map still shows the most recent location, including low-accuracy fixes; the status explains weak GPS. Pausing continues map following but suspends distance, discovery, and timer. Resuming establishes a new baseline and fresh trail segment, preserving totals. The displayed trail retains at most 2,000 points.

Steps are **estimates** using 0.75 m per step, not pedometer readings. “Places” are unique approximately 40 m grid cells visited during this session; each earns 25 demo XP, with 500 XP per level. These are illustrative game mechanics, not named real-world POIs or persistent exploration data. The coordinate grid is a simple prototype approximation. All progress resets on reload. Walk time measures the active session, including stationary time. Keep the app in the foreground: background location recording is not configured.

## Map

[Leaflet 1.9.4](https://leafletjs.com/) renders standard [OpenStreetMap](https://www.openstreetmap.org/copyright) raster tiles, with visible attribution. Web uses an iframe; native uses `react-native-webview`. Leaflet assets load from a version-pinned CDN and tiles require internet. Map loading failures display an inline message. There is no map API key, offline download, backend, analytics, or location upload; tile requests reveal the viewed map area to the tile provider. Follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) if expanding beyond this low-traffic demo.

### Pixel world

The map opens in **pixel mode** (toggle with the **Pixel / Map** button beside the target button). From zoom 16 up, `src/pixelRenderer.ts` turns [OpenFreeMap](https://openfreemap.org) vector tiles into pixel art, one 256 px Leaflet tile at a time.

1. **Data source.** OpenFreeMap (free, no key; [OpenMapTiles](https://openmaptiles.org) schema, Mapbox Vector Tile format). The tile URL template and max zoom come from the TileJSON at `https://tiles.openfreemap.org/planet` (cached 6 h in IndexedDB, re-read if a tile 404s). Tiles stop at zoom 14, so zooms 16–19 reuse z14 tiles: their geometry is scaled and clipped per display tile. A small hand-written MVT decoder lives in the renderer string, so there are no new dependencies and the same code runs in Node tests and the worker.
2. **Classify.** `water`/`waterway` → water; `landcover` grass/wood/farmland/sand/wetland; `landuse` residential → yard, commercial/retail/industrial (and schools etc.) → lot, pitches; `park` → grass; `transportation` motorway…tertiary → road, minor/service → street, path/track → path, pedestrian → paving, rail/transit → rail, bridges outlined, tunnels skipped; `building` with `render_height`. OpenMapTiles merges buildings into multipolygons, which are split back into one building per exterior ring.
3. **Draw per tile.** An `L.GridLayer` creates one canvas per tile. A tile draws the 3×3-screen-px art grid (anchored to the world, ~85×85 art px) from its source tile plus every neighbouring source tile within a 24-art-pixel margin, so kerbs, banks, shadows, extrusions and trees that cross edges match exactly; hash noise is world-anchored. Objects are drawn by every tile their pixels reach, owned (counted) by the tile holding their foot point, sorted by foot. Tests draw 2×2 blocks separately and as one area at zooms 16–19 and compare every pixel.
4. **Worker.** Decoding and drawing run in a Web Worker built from a Blob of the renderer + engine (`src/tileEngine.ts`), started before Leaflet loads so TileJSON and IndexedDB overlap the Leaflet download. Pixels come back as a transferable buffer. If Workers fail, the same engine runs on the main thread.
5. **Caching.** Drawn tiles: memory LRU of 300. Raw source tiles: IndexedDB keyed `RENDER_VERSION/z/x/y`, capped at 64 MB (source tiles and detail cells) (least recently used evicted); bumping `RENDER_VERSION` in `pixelRenderer.ts` makes old entries unreachable and they are purged on open. Failed fetches are retried with backoff (300 ms, 600 ms, 1.2 s, then the tile job retries up to 10 s apart), never cached, and never aborted by panning or GPS fixes. The normal OSM raster tile stays underneath until a pixel tile arrives, and below zoom 16.
6. **Detail layer.** The tiles lack individually mapped trees, small paths and a lot of land use, so those come from OpenStreetMap through [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API), one z16 cell at a time (`natural=tree`, footways/paths/steps/cycleways/tracks/pedestrian ways, gardens, orchards, pitches, parking, squares, piers and other land use; no sidewalks or crossings). Tiles are always drawn at once from the vector tiles; missing cells are fetched in the background (2 at a time, hedged across three mirrors, retried with backoff) and cached prepared in IndexedDB. When all cells a tile needs are on hand it is redrawn with them (about 5 ms). A busy or failing Overpass only delays the extras, never the map. From zoom 17 the OSM paths replace the tile paths; at zoom 16 the tile paths stay.
7. **Not too cluttered.** Mapped trees are thinned to one per world-anchored cell (7–11 art px, by zoom) and skipped on water, roads and rails; scattered park/wood trees stay out of their way. Zoomed out, sheds and tiny annexes are dropped (zoom 16 below 10 art px², zoom 17 below 3) and house outlines take the roof's dark shade instead of black at zoom 16.
8. **Prefetch.** One ring of tiles around the view (vector tiles only; their detail is fetched when they scroll in), plus 3 tiles ahead along the heading of the last GPS fixes (`path`), with their detail cells. The renderer supports a ground-then-objects two-pass draw (`TWO_PASS` in `mapDocument.ts`); measured gain was ~15 ms for a screenful, so it is off.

The status chip indicates when the pixel view is loading or when the zoom level is too low for pixel tiles. Attribution: © OpenMapTiles © OpenStreetMap contributors · OpenFreeMap. Individually mapped trees and some small paths/land-use are not in the tiles; trees are scattered in parks and woods instead.

Location handling follows [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/); the native map uses [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/).

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build:web
npx expo export --platform ios --platform android --output-dir dist-native
```

Tests cover OpenMapTiles classification, decoding a real tile (`fixtures/ljubljana-14-8852-5825.pbf`), z14→z17 rescaling, seamless tile edges, the OSM detail layer (classifier, query, seam-free tiles with detail, tree thinning, path replacement), cache keys/version invalidation/size cap, fills, thin lines, palette-only output and world-anchored rendering, as well as coordinate validation, walking distance, GPS jitter/accuracy, teleports, and pause/resume/end/reset behavior. Bundle export verifies compilation; real-device permissions and outdoor GPS need physical device testing. No native simulator is available in the current workspace environment.

## Walk storage integration

Migration 001 in `src/walkStorage.ts` defines SQLite tables for account-owned walks,
ordered samples with segment IDs, and a completion outbox. A completion row removes
a walk from the draft query and adds it to the outbox in one statement. The storage
adapter takes the authenticated account ID and an open SQLite connection. Run the
migration once when opening that connection, before starting reads or writes.

The on-disk acceptance test uses Node SQLite and checks reopen, cross-account
access, a failed completion write and a retried finish. The Expo UI still uses its
in-memory session while native database opening, authenticated session wiring, and
restart recovery are pending.

## M0 screen-lock test build

The `location-test` EAS profile creates a separate development app named
Wayborn Location Test with background location enabled. It is used to collect
M0 feasibility evidence. Its screen stores update counts and timestamps locally.
The ordinary Expo Go start command continues to open the foreground app.

After linking an EAS project and registering the iPhone for internal distribution:

```sh
npx eas-cli@latest build --platform ios --profile location-test
EXPO_PUBLIC_LOCATION_SPIKE=1 npx expo start --dev-client --tunnel
```

Install the signed build using its EAS link. Start the test outdoors, lock and walk
for two minutes, unlock, then stop. Record total/background updates, errors, last
fix time, device model and exact iOS version in the validation record.
