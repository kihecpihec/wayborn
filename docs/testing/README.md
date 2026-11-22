# Integrated delivery and acceptance workflow

## Work in playable slices

One task per developer at a time, paired around one milestone outcome. Agree the
smallest contract and fixture before parallel work. Integrate both sides frequently;
do not let mock services become a substitute for the first real request/database path.
Hanan owns geography/tracking; Ismar owns app/data/service integration; both review.

A task includes goal, milestone, feature/scenario IDs, dependencies, concrete expected
results, files/contracts owned, test boundary, migration/recovery impact and evidence.
A ready task has no unresolved decision blocking its behavior. A done task has working
integrated behavior, executed acceptance cases, required evidence and a reviewed PR.

## Testing layers and introduction gates

- **Domain:** fast deterministic fixtures; rules/state transitions and geography.
  Existing unit/renderer tests and `test:acceptance` run now. Never compute expected
  geometry or reward totals using the function being tested.
- **Storage:** real local database, migration from previous schema, interrupted writes,
  account isolation and recovery. Introduce in M1, alongside the first persistence code.
- **Backend:** real local Supabase/PostgreSQL, migrations and authenticated clients.
  RLS, idempotency, transactions, rollback/concurrent claims and pagination. Add a
  required CI service job with the first backend code (M1 auth, expanded in M2); mocks cannot satisfy it.
- **UI:** navigation, loading/empty/error states, accessible controls and pending versus
  confirmed results. Introduce the chosen runner in M1 and exercise real adapters in M2.
- **Device:** permission denial/revocation, outdoor GPS, lock/unlock, background/kill,
  offline/restart, battery and maximum-length activity. Start in M0/M1 and repeat at
  each affected milestone. Record device/OS/build and fixture/rule version.
- **Product playtest:** can a new player start without help, understand pending rewards,
  recognize ownership changes and want another walk? Record observed confusion and
  reward pacing each milestone; passing algorithms alone does not prove a useful game.

Device evidence fields: scenario ID, date, tester/reviewer, commit/build, OS/device,
rules version, steps, observed result, artifact location and limitations. Sanitize
real routes before attaching evidence. Device tests are not claimed by a Node runner.

## Protect the specification baseline

`docs/specifications/baseline.json` freezes each feature contract's digest, status
and scenario IDs. `python3 scripts/check_baseline.py` validates current contracts
against it and reports all implemented and pending features/scenarios separately.

For an intentional contract change, add a JSON record in `docs/specifications/changes/`
with feature, exact old/new digest, rationale, behavior impact and review requirement.
Update the manifest deliberately; normal test commands never regenerate it. In a PR,
the CI job additionally compares the base branch manifest/catalog with the new one,
so changing both implementation and expectations is visible and requires a matching
record. Feature removals and implemented-to-planned downgrades are flagged the same way.

The gate detects changes and checks review records; it cannot authenticate human
approval or decide whether an assertion is meaningful. Configure required PR review
and status checks in repository settings. Until configured remotely, do not claim
this enforcement exists. Neither developer self-approves their feature/contract change.
A scenario adapter with no meaningful assertion remains a review failure even if CI passes.

During the initial adoption, the previous branch may not contain a manifest. The
check uses its previous catalog if present; otherwise it explicitly reports initial
adoption. Do not mistake initial adoption for a comparison against absent history.

## PR and milestone gates

1. Draft/review specification and fixture; settle blocking decisions.
2. Add the executable case; demonstrate failure against incorrect/missing behavior.
3. Implement and run focused tests, then the full applicable baseline.
4. Review expected values separately from implementation. Include before/after behavior,
   schema compatibility and old-client/pending-work behavior.
5. Merge a small complete slice; run the shared demonstration on the integrated branch.
6. Mark implementation status only after all feature scenarios have real coverage and
   required backend/device evidence. Pending scenarios remain visible, not green proof.
7. At each milestone, replay the previous complete journey plus the new functionality.

Use `python3 scripts/check_baseline.py --milestone 2` (or 0–9) to fail on unfinished
features through a milestone. This is a status gate, not a replacement for executed
tests or evidence review. M10 catalog items are optional after v1.

For each milestone select required feature IDs in its implementation issue. Full
release requires all M1–M9 required features, not just today's GPS baseline. Optional
chests may remain planned and must be clearly absent from launch claims.

## Operational safeguards introduced with their features

Use separate environments and synthetic seed data; version migrations and contracts;
use immutable event/reward IDs; build idempotent server event outboxes for feed/push/
goals rather than client-triggered side effects. Monitor queue age, rejected expeditions,
duplicate conflicts, reward errors and notification/reset failures without raw coordinates.
Add backup/restore and kill switches before beta; keep rollout/rollback compatible with
old clients and queued expeditions. Avoid premature microservices: one modular backend
with explicit transaction boundaries is the starting design.

For M3–M8, test free preference changes independently from activity mode, permissions and historical rewards. Use D14 fairness fixtures for walking/running/cycling; cycling is a required full-release gate.

The M1 shell uses Playwright for rendered web acceptance. In `prototype/map`,
run `npx playwright install chromium`, then `npm run test:ui`. Its isolated Expo
server uses port 8093. Browser tests do not substitute for native device evidence.
