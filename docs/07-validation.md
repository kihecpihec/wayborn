# Validation record

## iPhone field-demo report and recovery patch — 22 November 2026

Ismar reports installation and launch on iPhone 13 Pro Max / iOS 27.0.1.
LAN connection to Metro failed; `npx expo start --dev-client --tunnel` opened
the app. EAS confirms development build `a57bc094-143e-4c35-b7e8-d37043b9f24d`
finished (version 1.0.0, build 1, source commit `69474a0` plus build-time working
tree). This confirms build availability and user-reported launch, not a complete
device acceptance pass. No reviewer, sanitized route artifact or controlled
permission/poor-signal/background/restart trial has been recorded.

Reported defects: recording starts immediately; the marker disappears during
rapid pause/end/new-walk use; standard tiles still load when pixel tiles fail.
The exact pixel failure cause is not yet established on the device.

The local patch opens idle with explicit Start, retains the accepted position
across progress resets, replays state on native document reload/process recovery,
and falls back to uncached rendering if optional IndexedDB opening stalls. It
also labels pixel retries while standard tiles remain available. Developer
coordinates now change preview only; they are never accepted samples or rewards.
No native dependency is changed by this recovery patch, so an installed matching
development build can load it from Metro without a new binary.

Added LIFE-04/05/06 and MAP-04/05 domain adapters. The cache-stall scenario failed
against existing behavior with `Pixel rendering stalled on optional storage`;
idle entry had no implementation. The new-walk test includes 20 repeated
pause/resume/end/reset cycles. These exercise the real reducer, map bridge and
tile engine with a synthetic tile/network/storage boundary; they do not claim
native WebView UI or physical GPS coverage. Existing scenarios are retained;
MAP and LIFE remain planned. Exact contract changes are in
`0003-demo-recording-map-recovery.json`; Hanan's review is pending.

Local checks: typecheck, lint, 34 unit/renderer cases, 23 acceptance passes
(including the coverage guard), 109 TODO, documentation/specification/frozen
baseline checks and six baseline-policy tests pass. PR-base comparison explicitly
flags MAP/LIFE for contract review. Physical retest and remote CI remain pending.

Retest: reload through Metro; confirm no permission request/progress before
Start; start and obtain a valid fix; repeat Pause/Resume and End/New Walk; verify
the marker stays visible without gap distance. Test pixel/standard styles and
reload while paused. Record pixel status counts if it still fails. Then run the
separate denial, poor-signal, background/foreground and restart device matrix.
Restart persistence is still absent in this demo. M0 and M1 are not complete.

The original milestone recorded 30 passing renderer/walk tests on 19 November 2026,
with typecheck, lint, documentation links, and web export passing locally. Mockup
flows were exercised at widths 360 and 760 px. These were not physical-device tests.

The subsequent GPS regression patch passed 34 tests plus typecheck, lint, web export,
and documentation checks. It did not implement full lifecycle, persistence, or backend.

The English specification baseline adds a separate acceptance suite and a coverage
gate. See [testing instructions](specifications/README.md). Test output distinguishes
executable baseline cases from planned TODO scenarios. Do not treat TODO as acceptance.

Every release must record actual commands/results, device/OS/build and backend rules
version, applicable scenario IDs, limitations, and a remote CI run after publication.
No physical GPS, production backend, or mobile release validation is claimed here.

## English specification baseline validation — 21 November 2026

- TypeScript and ESLint: passed after the directory migration.
- Existing unit/renderer tests: 34 passed.
- Acceptance suite: 13 executable GPS scenarios plus one coverage guard passed;
  64 planned scenarios are explicitly TODO, not completed features.
- Red/green evidence: GPS-12 initially failed with 3.3358477993367623 meters when
  the specification required zero for a move faster than 4 m/s. Correcting the
  elapsed-seconds calculation made it pass without changing the expectation.
- Coverage negative control: temporarily marking AUTH implemented without adapters
  caused failure for AUTH-01; original planned status was restored.
- Documentation links, specification validation/generated catalog, and web export: passed.
- English mockup JavaScript: parsed successfully; diagrams regenerated from English DOT.
- Browser visual inspection: not completed. The collaborative preview opened but
  snapshot requests timed out twice; no alternate browser tool was available.
- Physical-device and backend acceptance: not performed; the affected features remain planned.

These are local results. Publishing the branch and verifying remote CI are separate.


## Full-product plan and workflow revision — 22 November 2026

- Catalog expanded to 38 features / 111 behavior scenarios. One implemented GPS
  feature has 17 executable domain scenarios; 94 scenarios remain planned.
- Unit/renderer tests: 34 passed. Acceptance: 18 passed including coverage guard,
  94 TODO. Baseline-policy tests: 6 passed.
- GPS-14 through GPS-17 failed before implementation; they cover long silence,
  explicit interruption and preserving the accepted displayed position after a
  jump or weak fix. Implemented a trial 15-second continuity limit (D05), interrupt
  action and accepted-position output used by the location hook. All now pass.
- Typecheck, lint, web export, documentation links, generated specifications and
  frozen contract checks passed locally.
- Readiness negative control: `--milestone 2` fails because the walking alpha is
  unfinished. The PR-base check explicitly reports initial adoption when HEAD has
  no prior catalog/manifest; it does not pretend to compare absent history.
- Landing page content and CSS were fetched directly. Collaborative browser navigation
  succeeded; screenshot/snapshot inspection timed out. Visual pixel-level review is
  not claimed. No external landing-page edits or remote branch-setting changes made.
- No new physical-device/backend evidence. M0 device spikes and M1/M2 storage/service
  suites remain milestone tasks; the full social game has not been implemented here.

The milestone overview HTML was rendered at 728 px and 390 px with no console errors. This validates the planning artifact only, not the app UI.

## Activity specialization specification update — 22 November 2026

Added changeable Walker/Runner/Cyclist preference, independent per-expedition mode,
separate guild permissions, immutable recorded mode, mode-balanced rewards and
cycling as required full-v1 scope. Added D13/D14 ownership and balancing gates.

Catalog: 40 features and 126 behavior scenarios; 17 executable GPS scenarios and
109 planned scenarios. Acceptance suite: 18 passed including the coverage guard,
109 TODO, no failures. Baseline-policy tests: 6 passed. Documentation, generated
catalog, frozen baseline and whitespace checks passed. Fifteen new planned cases
cover preference changes, mode locking, role/permission separation, historical
scoring, cycling device validation and reward fairness. The exact contract change
record is 0002-activity-specializations.json. No runtime role/economy implementation
or device validation is claimed by this documentation update.

## Rapid End/Start map animation regression — 22 November 2026

A follow-up phone report describes map glitches and stalled pixel loading during
rapid End/Start. The map update handler panned on every state delivery even when
coordinates were unchanged. A regression executing the actual document update
handler delivered 100 repeated reset-like updates and observed 101 pans instead
of one before the fix. Camera movement now requires changed coordinates or an
explicit recenter request. Real movement and recenter remain covered. This is
additional MAP regression coverage, not a changed feature contract or proof that
all observed pixel stalls are resolved. Physical retesting remains required.

Multi-user readiness remains unvalidated. Basemap requests go directly to external
providers, so a local animation fix does not establish provider capacity, caching
policy suitability, rate-limit behavior or production reliability. Before wider
release, validate those provider arrangements and measure loading/fallback under
slow networks, interruption and repeated controls on both reference platforms.

## Stationary timer and map-source recovery follow-up

The tester reports a stopped timer after repeated End/New Walk. The hook waited
for a new baseline but reused a movement-filtered watcher. New walk generations
now restart the watcher even when React batches rapid end/reset actions; pause
removes the watcher, resume restarts it, and stationary GPS updates are enabled.
The timer also resets its interval per walk generation. A 30-cycle reducer
regression checks fresh sessions, zero stationary distance and elapsed time.
Native callback timing and stationary fix delivery still need phone verification.

The rendering counter has been replaced by map-loading text explicitly separate
from walking progress. Zooming only changes map imagery; discoveries remain
sample-driven. TileJSON requests now abort after 15 seconds and can retry instead
of occupying every tile-loading slot indefinitely. A controlled transport test
checks timeout followed by successful recovery. This does not guarantee provider
availability or replace physical poor-network testing. Existing feature statuses
and acceptance contracts remain unchanged; these are regression refinements.

## First M1 navigation slice

Ismar reports the timer/map fixes work on the reference iPhone. This is a
user-reported retest, not a complete permission/background/recovery matrix.
The subsequent request to start the next step authorizes the first M1 shell slice.

Expo Router now supplies Map, Activity, Guild, Goals and Profile destinations.
A WalkProvider above navigation owns the existing demo session; active/paused
walks have a return-to-map link. Other destinations explain unavailable services
and temporary demo progress. Authentication, durable history and recovery remain
planned. NAV-03 runs a real Playwright browser against the Expo app and checks
all destinations, no geolocation calls while browsing and zero elapsed time.
Before implementation it failed waiting for the nonexistent Activity tab.
NAV remains planned because existing finish/queued-summary cases are unfinished.
CI installs Chromium before the acceptance suite. Native dependencies require a
new development build and native navigation retest; web tests do not prove that.

Shell verification: typecheck/lint pass, unit suite passes, acceptance reports
24 passes and 109 TODO (including the rendered NAV-03 adapter), web and iOS JS
exports pass. Documentation, specification generation, frozen baseline/PR-base
comparison and six baseline-policy checks pass. No native navigation pass or
remote CI result is claimed.

## Full-map layout, session Activity and cached-tile recovery

User requested a full-map screen with a yellow pixel-style Start walk control,
completed walks in Activity and reliable return to pixel tiles after zooming.
Map now fills its tab with floating controls; the active-walk banner appears
only on other tabs. End creates one in-memory summary; new walks preserve those
summaries across tab navigation. The UI explicitly states that app reload/close
clears this demo history. This is not STORE, SYNC or confirmed ACTIVITY delivery.

The cached tile path called Leaflet's completion callback synchronously inside
createTile, before Leaflet registered the returned tile. A real-controller
regression failed before the fix and passes with deferred cached-tile completion.
The renderer still intentionally uses standard overview tiles below zoom 16;
returning to zoom 16–19 should show pixels. Tile completion errors now retain
retry jobs. No new native modules are introduced by this patch.

NAV-04 exercises the rendered full-size map, explicit Start/End, one Activity
summary and retention after starting another walk. Local results: 39 unit tests,
25 acceptance passes, 109 TODO, typecheck/lint and web export pass. Documentation,
specifications, baseline-policy tests and PR-base contract comparison pass.
Reviewed mobile-width browser preview and moved zoom/status controls away from
the bottom Start button. Physical iPhone retest remains pending.

Phone checklist: reload; check full-map layout and Start; start and wait for GPS,
pause/resume, end; open Activity and verify one summary; start/end a second walk
and verify two summaries; zoom well out then back into street level repeatedly,
including while paused; verify pixels return and the marker remains. Reload once
and confirm the stated temporary history clears. Record failures separately.

Live browser zoom check: four zoom-out steps reached the labeled overview with
zero pixel tiles; four zoom-in steps restored 15 loaded pixel tiles and cleared
the loading status. Final web/iOS JS exports and full local checks pass. This
observes browser recovery only; iOS WebView verification remains the tester's next
step. No additional native rebuild is required beyond the navigation build.
