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
