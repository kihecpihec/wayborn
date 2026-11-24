# Validation record

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

## M0 H3 trial and M1 field evidence

The synthetic traces in [h3-trial.json](../prototype/map/fixtures/h3-trial.json) are
shared input for the H3 comparison. `npm run test:acceptance` from `prototype/map`
runs GEO-03. With H3 4.x, the unique sample-cell counts were:

| Synthetic trace | Resolution 10 | Resolution 11 |
| --- | ---: | ---: |
| Dense street | 1 | 3 |
| Park loop | 2 | 3 |
| Antimeridian | 1 | 2 |
| High latitude | 1 | 2 |

These counts describe the fixture sample locations. Path traversal, boundary
policy, supported region, and independent server parity still require D02
review and implementation.

An iPhone Expo Go launch over the tunnel was reported by the user. The device model,
OS, build identifier, timing, and Android reference device are still to be recorded.
For the M0 and M1 field run, record these details alongside observations for permission
denial, outdoor fix, weak signal, pause and resume, lock and unlock, app backgrounding,
and termination and reopen after native recovery is wired. Record whether the active
timer or distance changes in each gap. Keep exact locations out of the validation log.

### M0 phone procedure

Run `npm run start:iphone` from `prototype/map` and scan its QR code. Use the
same build on an Android reference phone when available. Record the device, OS,
Expo Go version, Git revision and whether the working tree contains local changes.

1. Open Map and wait before tapping Start walk. Record whether a permission prompt
   or walk timer appears on its own.
2. Tap Start walk and deny location. Record the message and whether map browsing
   and a later retry remain available.
3. Grant location and start outdoors. Record time to the first usable fix. Walk a
   short route, pause, move, resume, and verify that the paused gap adds no distance.
4. With a walk active, lock the phone or background the app, move, and reopen
   Wayborn. Record the interruption message, active time, and distance before
   and after. Resume and verify that the route begins a separate segment.
5. Attempt a walk with poor reception. Record the waiting or interrupted state,
   and whether a later start or resume works when reception improves.

Record elapsed time and distance without attaching coordinates. This procedure
measures the foreground build's behavior. A native screen-lock feasibility spike
also needs a device build configured for background location and a separately
recorded result. Expo Go testing of the foreground build does not supply that evidence.

### Geographic parity check

GEO-01 runs the shared rule twice: once through the client-callable function and
once through the local Node evaluator in `prototype/map/server/evaluateGeography.ts`.
The Node process receives JSON and returns cell IDs or a rejection reason. GEO-02
checks a fixed cell across the antimeridian, rejects longitude 181, and verifies
that malformed coordinates are rejected at the process boundary. This is evidence
for the sample-only contract. The authenticated backend, trace validation, and
deployed parity are still pending.

### Review before integration

The user confirmed that the current app works on an iPhone through Expo Go.
This confirms the tested foreground app can be launched on the device. Device
model, OS, measured GPS interruptions and a native screen-lock test were not supplied.

The automated baseline, GPS cases, H3 sample evaluation and separate-process
parity tests pass. M0 remains open for field evidence and final path-coverage
decisions. The sample-only evaluator is a local contract check. M1 remains open
for authentication and native persistence integration. The SQLite adapter is
tested independently and has not been connected to the phone recording flow.

### User-reported iPhone test update

The user identified an iPhone 13 Pro Max and reported trying walking, pause/resume,
and screen lock successfully in Expo Go. They described iOS as the newest version.
The exact version and whether screen lock interrupted or continued recording are
awaiting clarification. No Android phone is currently available. The user has an
Apple Developer account.

A dedicated `location-test` EAS profile and screen are now prepared. The profile
enables background location in a separate application identifier. Its task stores
only counts, error count, and the most recent GPS timestamp in local SQLite.
To collect measured evidence, start outdoors, record counts, lock and walk for
two minutes, unlock, stop, and record the resulting counts and fix time. Background
delivery count measures when the task callback ran. Compare it with the reported
lock interval to assess screen-lock delivery. A completed iOS JS export verifies
bundling; installation, signing and actual execution still require the device.

## M1 storage/account pre-merge checks — 23 November 2026

Worktree branch `t3/ddf88be8`, based on `6e2e53e`; uncommitted integration changes.
The fetched `origin/dev` matched this base. PR #16 was merged with successful
documentation and map-prototype checks. These are historical CI results, not CI
evidence for the current uncommitted files.

- `npm test`: 39 unit tests passed; acceptance reported 38 passed, 101 TODO and
  zero failures. AUTH-01/02/03/04 and NAV-04/05 run browser flows against the real
  local Supabase stack; storage cases use real on-disk SQLite.
- `npm run test:ui`: nine tests passed in a separate sequential run. The first
  attempt conflicted with acceptance Playwright on port 8093; rerunning after
  acceptance finished resolved the conflict.
- `npm run lint` and `npm run build:web`: passed after the recorder fix.
- `npm run typecheck`: passed after the recorder fix. A concurrent typecheck/build
  attempt hit disappearing generated `dist` files; the successful final typecheck
  ran sequentially after export.
- `python3 scripts/check_docs.py`, `python3 scripts/specifications.py`,
  `python3 scripts/check_baseline.py --base-ref origin/dev`,
  `python3 scripts/test_baseline.py` (six tests), and `git diff --check`: passed.
  The base comparison flags NAV's added cases for human contract review.
- STORE-02 red/green: a real SQLite trigger aborting sample writes first produced
  an incorrect pending expedition; the new assertion failed. After the recorder
  fix, the failed walk retains its durable draft prefix, another walk can finish,
  and reopen/explicit recovery preserves ownership and recorded samples.
- Hosted checks: custom SMTP settings persisted; email signup and confirmation
  are enabled, Google is disabled. The profiles endpoint returned HTTP 404 with
  `PGRST205`, so the hosted profile migration is not verified/deployed there.
  Resend still showed no sent email; real inbox delivery remains unverified.

No new physical-device, hosted RLS, complete hosted signup/recovery, or native
termination evidence was collected. No commit, push, new PR or merge was performed.
See the [remaining code and release gates](pre-merge-checklist.md). Full features
remain planned; passing cases do not complete M1.

## M1 publication candidate — 23 November 2026

This supersedes the earlier readiness findings for this worktree; historical test
counts above describe earlier snapshots. The final candidate retains planned
feature status and the same SQLite schema version 1.

- Final unit suite: 45 passed, including six real-SQLite persistence integration
  regressions. Acceptance: 39 passed, 100 TODO, zero failures. NAV-03 now executes
  paused-walk navigation in addition to NAV-04/05. Standalone UI: 10 passed.
- Typecheck, lint, web export and iOS/Android JavaScript/Hermes exports passed.
  Exports do not prove a signed app can install or run on a physical device.
- Documentation/specification/baseline checks and six baseline-policy tests passed;
  NAV's added cases still require human contract review.
- Recorder red/green evidence: failed sample insertion previously allowed incorrect
  outbox publication. Completion now waits for writes, preserves failed operations
  for explicit retry, and never acknowledges a failed save as a completed walk.
- A concurrent-discard regression failed before serializing connection writes:
  another account's recording entered the open transaction. The fixed test proves
  it starts only after discard commits. Initialization/read failures, delayed finish,
  rejected GPS jumps, account isolation and list-refresh retry also have real tests.
- The first NAV-03 test attempt failed because the Map and retained Activity screen
  both contain the same totals in the DOM. Scoping the final assertion to MapHome
  preserves the exact expected totals and verifies the correct destination.
- Read SDK 58 reference/SQLite/Crypto documentation before native API changes.
  Added only `expo-crypto` ~58.0.8 using `expo install` for native-safe UUIDs; no
  renderer rewrite or incidental dependency upgrade.
- Hosted migration `202611220001_private_profiles.sql` was applied through the
  linked CLI after dry-run, and hosted migration history matches local history.
  Hosted schema lint found no errors.
- Hosted two-account checks passed: trigger-created profiles, real password sign-in,
  owner-only SELECT, cross-account invisibility, anonymous denial and client-write
  denial. Temporary users/profiles were removed and cleanup verified. The service
  role's lack of a profile SELECT grant was preserved; cleanup used linked SQL.
- Real SMTP/browser check: a temporary Neoserv mailbox received signup and recovery
  messages from Wayborn via Resend. Both messages were marked delivered. The app
  verified the signup code, retrieved only its own hosted profile, rejected a wrong
  recovery code, changed the password, rejected the old password and accepted the
  new one. The test user and temporary mailbox were removed afterward.

No physical-device verification or code-expiry timing test is claimed. iPhone
keyboard layout, secure session storage, offline finish, restart/account switching,
permission denial and poor-signal/background recovery still need an exact OS/build
record. Google OAuth, schema-upgrade coverage and M2 synchronization remain open.
The PR must receive Hanan's review and green CI for its actual head before merging;
this publication candidate does not complete M1.

## M1 storage upgrade, map, permission, startup and access checks — 24 November 2026

Branch `t3/m1-store03-startup-access` from `dev` at `c69d794`.

- STORE-03 runs against real SQLite. A frozen copy of the shipped version-1 schema
  (`prototype/map/acceptance/walkStorageV1.sql`) is filled with a draft and queued
  walks for two accounts, then opened by the current app. Every row, each account's
  drafts, samples and queue are unchanged; the draft keeps recording and finishes
  into its owner's queue; reopening is a no-op; a newer (unknown) version is refused
  without touching rows or version. Two temporary mutations of the migration (queue
  cleared on open; version 1 rejected) both made STORE-03 fail. No migration 002 was
  added: nothing in M1 needs a schema change.
- Browser checks against the local Supabase stack, written before the app changes:
  MAP-01 (pan, style switch and recenter keep the walk distance), MAP-02 (blocked tile
  hosts show "Map tiles unavailable" with Retry, a walk is still recorded and listed,
  Retry with tiles back clears the message), MAP-03 (attribution in both styles) and
  LIFE-03 (two idle minutes on a fake clock accrue nothing) already passed on the
  unchanged app. LIFE-01, ACCESS-03 and STARTUP-01 failed first.
- LIFE-01 fix: a denied permission now returns the walk to idle with a message that
  browsing continues, instead of an "interrupted" walk that never started.
- ACCESS-03 (new scenario, change record 0011): the idle map explains foreground-only
  location use and gives no safe-route promise before any location request; walk
  buttons are at least 44 px high.
- STARTUP-01 fix: Supabase reports a saved session only after refreshing an expired
  token over the network, which kept a returning player on the sign-in form for as
  long as the network took. The app now opens the map for the account in Supabase's
  saved session at once and shows a static branded screen while that is read. If the
  refresh is rejected, the player returns to sign-in with the expiry notice (new
  AUTH-02 browser regression; removing the fix made it fail). The ID comes only from
  the auth library's saved session; the server still authenticates every request.
- Results: typecheck, lint, web export; unit 45 passed; acceptance 47 passed, 93 TODO,
  0 failed; Playwright 18 passed. Documentation, specification and baseline checks passed.

Not tested: none of this on a phone. LIFE-01 and ACCESS-01/02 are device scenarios,
and STARTUP-01's 3 s budget still needs a cold start on the reference iPhone. No
iPhone results for development build `8871de65` have been reported yet; the form is
in [the M1 device evidence record](testing/m1-device-evidence.md). STARTUP-02 needs
notifications (M6) and stays a TODO. All M1 features remain planned.

## M1 iPhone evidence and status update — 24 November 2026

Branch `t3/m1-device-evidence` from `dev` at `1fb9dbc`.

- Device: iPhone 13 Pro Max, iOS 26 (minor version not reported), iOS development
  build `8871de65` (commit `fcd055f`) with JavaScript from Metro, hosted Supabase
  development project, D05 walking trial thresholds. Tester: Ismar (owner), who also
  reviewed the record; no independent reviewer.
- Reported after PR #18: "everything works properly" for the checklist in
  [the M1 device evidence record](testing/m1-device-evidence.md) (location deny and
  allow, pause/background/resume, force-quit recovery, finish to pending, account
  switch, session restart, keyboard, wrong password, VoiceOver, largest text, poor
  signal). One summary, no per-check notes; nothing behaved unexpectedly.
- Not tested on the phone: STARTUP-01 offline or slow cold start (the development
  build loads JavaScript from Metro). The VoiceOver and largest-text rows covered the
  map and walk controls; whether sign-up and the other tabs were covered is unknown,
  so ACCESS-01/02 stay open with full-scope rows.
- New evidence-backed adapter `acceptance/deviceEvidence.ts`: LIFE-02 passes only if
  the record has a complete build table and a "Passed" row; LIFE-01 also needs it
  after its browser case. Both failed against the unfilled record ("device record
  lacks iOS version") before it was filled, then passed.
- Status (change record 0012): STORE, LIFE and MAP implemented. ISOLATION, NAV,
  ACCESS, STARTUP and AUTH stay planned (reasons in the roadmap).
- Results: typecheck, lint, web export; unit 45 passed; acceptance 48 passed, 92 TODO,
  0 failed (including the Playwright cases against the local Supabase). Documentation,
  specification and baseline checks passed.
