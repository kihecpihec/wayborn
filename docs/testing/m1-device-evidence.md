# M1 physical-device evidence

Record what was actually observed on a phone. A browser test, a unit test or a
successful export is not device evidence. Leave a row as "Not yet reported" until the
tester reports it; never fill it in from expectations.

Device-level scenarios of implemented features are registered in
`prototype/map/acceptance/specifications.test.ts` through `requireDeviceEvidence`
(`acceptance/deviceEvidence.ts`). That adapter only checks this record: the build
table must be complete and the scenario's row must start with "Passed". It is not
an automated device test; reviewing the rows below is what makes them evidence.
Record a new build in a new section or replace the table and rows together.

## Build under test

| Field | Value |
| --- | --- |
| Build | iOS development build `8871de65` (commit `fcd055f`) |
| JavaScript | Current `dev` through Metro: `npx expo start --dev-client --tunnel` |
| Backend | Hosted Supabase development project (`prototype/map/.env`) |
| Device | iPhone 13 Pro Max (owner) |
| iOS version | iOS 26 (minor version not reported) |
| Rules version | D05 walking trial thresholds (50 m accuracy, 3 m jitter, 4 m/s speed, 15 s continuity) |
| Tester | Ismar (owner) |
| Reviewer | Ismar (owner, also the tester); no independent review |
| Date | 24 November 2026 |

## Checks

Use synthetic or sanitized routes; do not attach real tracks or exact home locations.

| Scenario | Steps | Result |
| --- | --- | --- |
| AUTH-01 | Create an account with an emailed code; close and reopen the app | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |
| AUTH (keyboard) | Sign-up and sign-in fields stay visible above the keyboard | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |
| AUTH (secure store) | Session survives a full app restart; sign-out returns to sign-in | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |
| AUTH-02 | Wrong password message; walks stay on the device after sign-out | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |
| STARTUP-01 | Reopen while signed in with poor or no network; map shows within 3 s, nothing records | Not tested. The development build loads its JavaScript from Metro, so an offline cold start cannot be tried; needs a build with the bundle embedded. |
| LIFE-01 | Fresh install, deny location at Start walk; denial message shown, map and tabs still usable, no walk listed | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |
| LIFE-02 | Active walk: pause, background, return, resume; no gap distance, new segment | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |
| ACCESS-01 (map only) | VoiceOver: location explanation is read; Start/Pause/Finish reachable and named | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. Covers only the map and walk controls in this row, not the whole scenario. |
| ACCESS-01 | VoiceOver from a fresh install: create an account and sign in, hear the location explanation, start, pause and finish a walk | Not yet reported |
| ACCESS-02 (map only) | Largest text size and narrow layout: map controls and walk actions still reachable | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. Covers only the map and walk controls in this row, not the whole scenario. |
| ACCESS-02 | Largest text size: open sign-in, sign-up, Map, Activity, Guild, Goals and Profile; every essential text and action is readable and reachable | Not yet reported |
| STORE-01 | Record a walk, force-quit, reopen; keep or discard the draft offered | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |
| ISOLATION-01 | Sign out with a pending walk, sign in as a second account; the first account's walk is not shown | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |
| GPS (poor signal) | Walk indoors or under cover; no distance from inaccurate fixes, signal-loss notice | Passed. Owner's report for the whole checklist: "everything works properly"; no per-check notes. |

The 24 November report was one summary for the whole checklist after PR #18
(JavaScript from Metro; the exact commit was not recorded). Nothing behaved unexpectedly. The ACCESS rows
above were narrower than ACCESS-01/02, and the tester could not say whether sign-up
or the other tabs were covered, so the full-scope rows remain open.

When a row is reported, also note the rules version (D05 trial thresholds), the
observed result in the tester's words, any artifact location and limitations.
