# Wayborn · Demo 01

Wayborn opens to account entry on iOS, Android and web. A verified player can browse the map and explicitly start a foreground walk.

## Run

Start the [local accounts backend and configure the app](../../docs/testing/accounts.md) first.

Use Node **22.13+** (the included `.nvmrc` selects 22.23.2):

```sh
cd prototype/map  # from the repository root
nvm use
npm ci
npm run web
```

Open the URL printed by Expo. After sign-in the map opens idle; press **Start walk** to request location access and record. Until a fix arrives, the map shows an explicitly labeled Ljubljana preview **without a user marker**. Browser location requires localhost or HTTPS. When testing over a LAN on a phone, use the native app or HTTPS rather than an insecure browser URL.

For a phone, run `npm start`, then open with an Expo Go version supporting SDK 58. Alternatively use `npm run ios` / `npm run android` with an installed simulator/emulator. A native development build can be created using `npx expo run:ios` or `npx expo run:android` if Expo Go on your device has a different SDK version. Native builds require the appropriate Xcode/Android toolchain.

## iPhone development build

The field demo is linked to
[@ismar_m/wayborn-field-demo](https://expo.dev/accounts/ismar_m/projects/wayborn-field-demo),
with bundle identifier `app.wayborn.fielddemo`. This is a development identity,
not an App Store release. `eas.json` has one `development` profile for physical
devices with `expo-dev-client` and internal distribution. Background recording
is not enabled. Web remains a demo, and Android device validation is pending.

From `prototype/map`, run:

```sh
npx eas-cli@latest whoami
npx eas-cli@latest build --platform ios --profile development
```

If Expo is signed out, use `npx eas-cli@latest login`. Complete Apple sign-in and
any two-factor verification directly in the interactive terminal. Do not paste
passwords, session cookies, signing keys or verification codes into chat or git.
The CLI creates/selects signing credentials and registered devices. Ensure the
iPhone 13 Pro Max is included; one enabled iPhone in the team's EAS inventory has
not yet been matched to the tester's phone. If needed, register the phone using
`npx eas-cli@latest device:create`, follow its link on the phone, then build again.

Open the completed build's installation link in Safari on the registered iPhone.
Enable Developer Mode if iOS requests it. Start Metro with `npx expo start --dev-client`
and open its QR/link in the installed Wayborn app. The phone needs network access
to Metro; this development build is not a standalone offline test release.

If the phone cannot reach the computer's LAN address, stop Metro and run
`npx expo start --dev-client --tunnel`, accept the `@expo/ngrok` installation if
prompted, wait for tunnel readiness and scan the new QR. Keep Metro running;
both devices need internet access. The tester successfully opened the installed
demo on the reference iPhone through a tunnel.

Share the Expo build installation link rather than committing the `.ipa`, signing
credentials or generated native directories. An iOS teammate's device must be
included in the provisioning profile. Register additional phones with
`npx eas-cli@latest device:create` and then rebuild or use
`npx eas-cli@latest build:resign`. A development app still needs a reachable Metro
server serving the matching source; sharing the binary alone does not share
uncommitted code. Android cannot install the iOS build.

On 22 November 2026, project linking and local iOS/web bundle exports succeeded,
but signing setup stopped because the cached Apple session had expired. No cloud
build or installation succeeded in that attempt. The reference device is
user-reported iPhone 13 Pro Max / iOS 27.0.1; compatibility remains untested.
Record build ID, OS/device, permission denial, poor signal, pause/resume,
background/foreground and restart observations in the
[validation record](../../docs/07-validation.md). The current demo does not save
walks across restarts; durable recovery is M1 work, not a passing baseline claim.

See [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
and [internal distribution](https://docs.expo.dev/build/internal-distribution/).

## Live location and spoofing

- **Device GPS** subscribes to foreground OS location updates with `expo-location`. Physically walking updates the explorer, camera, and dotted trail. Dragging the map changes only its camera; the target button restores following.
- In **Developer tools**, type latitude/longitude (decimal degrees) or choose a city preset, then press **Apply location**. Presets only populate the fields. Applying stops GPS and labels a camera preview as spoofed; it grants no distance, time, discoveries or XP. **Use device GPS / retry** restores GPS and breaks track continuity without clearing totals.
- To simulate actual movement through the **same OS location pipeline**, leave Device GPS enabled and use simulator location controls: on iOS Simulator choose **Features → Location**, or replay `fixtures/ljubljana-walk.gpx` through Xcode’s location simulation. On Android Emulator use **Extended controls → Location** to set points or play a route. For browser GPS testing, Chrome DevTools **Sensors → Location** overrides browser geolocation. A browser watcher may require the GPS retry button after changing its override.
- No movement joystick or map-tap relocation is implemented. Manual coordinate overrides are previews; simulated OS routes behave like walks only after explicit Start.

## Walk behavior

Start is explicit. Pause retains the accepted marker and suspends progress.
Resume starts a fresh movement baseline. End/New Walk resets progress and
continuity while retaining the marker until another valid fix. Fixes worse than
50 m accuracy, jitter under 3 m and speeds above 4 m/s do not add distance. Weak
fixes and jumps keep the accepted displayed position. Time begins after an
accepted baseline and stops on tracking interruptions and developer previews.
The displayed trail retains at most 2,000 points. Native map reloads replay the
latest marker/trail/style settings; a stalled cache open falls back to uncached
rendering. Pixel errors show retry status with standard tiles underneath.
These recovery changes still need a physical-device retest.

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

The status chip shows tiles drawn, cache hits and average ms per tile. Attribution: © OpenMapTiles © OpenStreetMap contributors · OpenFreeMap. Individually mapped trees and some small paths/land-use are not in the tiles; trees are scattered in parks and woods instead.

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

## M1 navigation shell

Entry uses Expo Router with Map, Activity, Guild, Goals and Profile tabs. Recording
state is held above routes; the other destinations currently explain unavailable
services. This remains a temporary foreground demo without accounts or storage.

This navigation change adds native dependencies. Rebuild the iPhone development
client with `npx eas-cli@latest build --platform ios --profile development`, install
it, then restart Metro with `npx expo start --dev-client --tunnel --clear`.
An older field-demo binary may not contain the navigation native modules.

Browser acceptance requires `npx playwright install chromium` once after `npm ci`.
`npm test` invokes the NAV-03 browser adapter; `npm run test:ui` runs it directly.
The runner starts its own Expo web server on port 8093. Do not occupy that port.

The Map tab now fills its available screen with a yellow Start/Pause/Resume
control. End adds a temporary summary to Activity; summaries survive tab changes
and new walks, but not app reload or termination. No server-confirmed rewards or
persistent history are implied. Wide zoom uses standard overview tiles; zoom
back to street level (16–19) for pixel detail. Cached pixel tiles now complete
asynchronously so Leaflet can register them before showing them.
