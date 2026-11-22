# M0 audit and first M1 task

Audit date: 22 November 2026. Source commit: `69474a0`.
This is a local handoff, not a completed milestone or an approved contract.

## M0 readiness

`python3 scripts/check_baseline.py --milestone 0` fails with
`M0 is NOT complete: GEO`. GPS has 17 implemented domain scenarios;
GEO-01 and GEO-02 remain planned. The demo's approximate cell keys are not H3.

Documentation links, generated specifications, frozen baseline validation and all
six baseline-policy tests pass. The policy tests exercise changed expectations,
removals, status downgrades and mismatched review records. This establishes the
local guard, not remote branch protection or physical-device behavior.

Local rerun: `npm ci`, typecheck, lint, unit/renderer tests, acceptance tests and
web export passed. Acceptance reports 18 passes (17 GPS scenarios plus coverage
guard), 109 TODO and zero failures. Documentation checks and `git diff --check`
also pass. No phone, backend or remote CI execution was performed.

The [validation record](../07-validation.md) contains no physical-phone spike.
D01 screen-lock feasibility, D02 H3 comparison and the D11 reference-device/native
build inventory still need evidence. D05 and D10 are trial settings, not approved
production thresholds. Do not close these decisions by inferring results from web
builds. Later decisions can remain open until their dependent tasks start.

## D11 device inventory

On 22 November 2026, Ismar reported an available iPhone 13 Pro Max running
iOS 27.0.1. This records user-reported availability, not compatibility or test
evidence. Native development-build installation has not been confirmed.
An Android reference device and OS version remain unconfirmed. The supported OS
range and native build/CI plan remain open; D11 is not closed by this inventory.

Ismar subsequently confirmed Expo Go is installed and Apple Developer Program
membership is available. Expo CLI authentication was verified in this environment;
an Apple authentication cache exists, but valid signing credentials and registered
device coverage have not yet been verified. No secrets are stored in this handoff.

### M0 native build preparation task

Owner: Ismar; review pending. Scope: SDK 58 development-client dependency, physical
iOS internal-distribution profile, separate field-demo bundle identity and linked
Expo project. Owned files: `prototype/map/app.json`, `eas.json`, package manifest/
lockfile and setup documentation. This prerequisite tooling work does not begin
M1 gameplay implementation or close D11. The existing renderer stays intact.

Expected checks: Expo resolves the development-client plugin/configuration;
typecheck, lint, existing acceptance/unit tests and bundle exports still pass.
Given the development profile, when requesting an iOS build, it must target a real
device with internal distribution, without App Store submission or background
location entitlements. If signing/device registration is missing, report the exact
setup blocker rather than claim an installable build. A successful cloud build
still needs installation and permission/GPS tests on the named phone.

No product specification status or expected gameplay outcome changes. Record the
exact build and observations when physical testing occurs.

Preparation result: created and linked `@ismar_m/wayborn-field-demo` (project
`0bfd9468-d134-4fb5-872c-6eaf677f9b36`), added SDK-compatible
`expo-dev-client` 58.0.21, and configured physical-device internal distribution
with bundle ID `app.wayborn.fielddemo`. Existing app dependencies were retained.
The Apple team's EAS inventory lists one enabled iPhone, but its identity has not
been matched to the reported reference phone. The noninteractive build request
failed because no internal-distribution signing credentials exist for this app;
interactive setup found the cached Apple session expired and stopped at password
entry. No cloud build was queued, certificate created or device test performed.
The [app setup guide](../../prototype/map/README.md) has the interactive continuation.

Typecheck, lint, existing unit/acceptance tests, web export, iOS JS bundle export,
documentation/specification/baseline checks and six baseline-policy tests passed.
An initial typecheck raced the web export removing its previous generated bundle;
rerunning after export completed passed. Future checks should run those stages
sequentially. An iOS JS export does not validate native compilation/signing.

## First M1 task: map-first shell

Subsequent user-requested demo repair: Ismar installed the development build and
opened it through a tunnel, then reported automatic start, marker loss after
pause/end/new-walk and pixel failure with functioning standard tiles. This
authorizes the narrow demo regression patch while the full D11/M1 gate remains
open. Scope/owned files: walk reducer/hook and Start controls; native map bridge,
cache-open fallback; explicit domain acceptance adapters and exact MAP/LIFE
contract change record. Hanan reviews GPS/map changes. No migrations or server
contracts change. See the [validation record](../07-validation.md) for build ID,
retest steps and evidence limits. Full lifecycle, persistent accounts, storage and
navigation remain separate M1 tasks.

Owner: Ismar. Reviewer: Hanan (review pending).
Umbrella: [navigation and accounts issue](https://github.com/kihecpihec/wayborn/issues/2).
This brief is local; no remote issue or PR has been updated.

Goal: open into a browsable Map without automatically starting GPS or gameplay;
provide Map, Activity, Guild, Goals and Profile routes using Expo Router.
Scope: the first navigation/entry slice of NAV, STARTUP and LIFE-03. This does
not complete those features, authentication, durable recording or M1.

Entry dependency: record D11's actual iOS/Android reference devices, OS versions,
native development-build availability and supported OS/CI plan before runtime
implementation. Read Expo 58's versioned API documentation before changing APIs.
Resolve the UI test runner and its actual rendered-app boundary before tests.

Owned files: app entry/configuration, package manifest/lockfile, new `src/app/`
routes, shell components outside the route directory and their UI acceptance
adapters. Ismar is the sole manifest/root-navigation owner for this slice.
Preserve the existing renderer; coordinate any hook interface edits with Hanan.

Rules and expected results:

- Browsing requires neither sign-in nor location permission. Mounting Map must not
  start a watcher, timer, discovery or XP. Developer coordinates cannot earn progress.
- Startup cannot wait indefinitely for tiles or an unconfigured service. Show a
  labeled preview/offline state and actionable retry when unavailable.
- Unimplemented tabs have honest empty/unavailable states and useful navigation;
  no sample rewards, accounts, territory or activity cards presented as live data.
- The shell owns navigation; a shared activity provider outside route components
  will own recording. Route changes must not recreate a recording session.

Acceptance to write before implementation:

1. Given an idle map, when waiting and navigating all five tabs, then no location
   request, expedition time, discovery or XP occurs (LIFE-03; real rendered UI).
2. Given a first launch without permission/account, when opening Map, then browsing
   is available and Start exposes contextual prerequisites without fake recording.
3. Given unavailable tiles/services, when opening and retrying Map, then the shell
   remains usable with an explicit preview/error state (partial STARTUP coverage).

The latter two cases refine the slice and need explicit catalog scenarios and exact
baseline change records before implementation. Retain all existing cases. Do not
mark NAV/STARTUP implemented: existing finish-cancel, queued-summary, restoration
and reduced-motion scenarios still require their real storage/lifecycle adapters.
Demonstrate failure against current automatic recording before implementing fixes.

## Interface handoff and following slices

Proposed interface for review with Hanan: navigation reads lifecycle status and
totals from one provider and sends explicit start/pause/resume/finish requests.
Permission success is separate from accepted-fix readiness. Interruption/resume
must create a fresh segment; camera actions never supply track samples. No shared
interface has been changed or accepted by the other developer in this audit.

Before persistence, agree activity UUID, authenticated account partition, local
device ID, immutable walking mode/rules version, UTC millisecond timestamps,
sequence/segment identifiers, meter units and transactional storage operations.
Never persist demo cell IDs as H3 or treat a display buffer as the durable track.
Auth/bootstrap and real two-user access tests precede account-owned storage;
SQLite migration 001, atomic finish/outbox and restart tests land with storage.

This preparation changes no runtime contract and introduces no migration. Remaining
risks are missing device evidence, unresolved D11, no selected UI runner, and no real
auth/storage backend. Next action: record device inventory, settle the shell test
boundary, add failing UI acceptance cases, then implement the shell slice.

## Authorized first shell slice

After reporting the phone fixes work, Ismar requested starting the next step.
Proceed with the first M1 shell slice; unresolved Android inventory and other
M0 evidence remain tracked, not claimed complete. Owner: Ismar; reviewer: Hanan
pending. Scope: Expo Router entry and five primary routes, one shared walk
provider, honest unavailable-service states and an active-walk return link.
Owned files: root navigation, manifests/lockfile, route files and UI test runner.
The interface exposes the existing demo hook through a provider above navigation;
no persistence/auth contract or migration is introduced. NAV-03 tests the rendered
web shell; native navigation still needs a rebuilt development client and retest.
