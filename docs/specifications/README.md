# Specification and acceptance baseline

[Read all feature specifications](FEATURES.md). The reviewable source is
[features.json](features.json); each feature defines an ID, owner, roadmap milestone (stored as `wave` in the catalog),
dependencies, goal, mandatory rules, expected end result, implementation status,
and Given/When/Then acceptance scenarios. Technical rules in the architecture and
roadmap still apply. Resolve conflicts in a reviewed specification change first.

## What this baseline proves

Implemented: `GPS` (accepted walking samples), and from M1 `STORE` (account-owned
SQLite drafts and queue), `LIFE` (foreground walk lifecycle) and `MAP` (map
presentation). This is not H3 discovery, sync or server validation.
Executable scenarios exercise actual production behavior through a thin adapter,
using expected observations written in the specification. They do not compute
expected answers with the implementation's distance, cell, or reward functions.
The equatorial walking fixture specifies an independent approximate distance range.

Other features are planned acceptance scenarios. The runner lists them as TODO;
they are not passing tests and must not be called working features. Existing map
and unit tests remain complementary regression checks, not proof of the planned
map UI, backend, or device acceptance criteria.

The baseline deliberately preserves an honest green starting point without pretending
the whole app is complete. No tests are silently skipped because a service is absent.
Marking a feature implemented without executable cases fails the coverage gate.
All feature contracts are frozen in `baseline.json`; status/expectation/scenario changes require an exact change record and PR-base comparison. Human review remains necessary.

## Required workflow for every functionality

1. Write or update the goal, rules, end result, dependencies, and observable scenarios
   **before implementation**. Include normal, invalid, interrupted/retry and privacy
   cases where relevant. Settle ambiguous product rules with a recorded decision.
2. Run `python3 scripts/specifications.py --write` from the repository root. Review
   the generated catalog diff as the product contract, not an implementation summary.
3. Add executable acceptance handlers for the named scenarios in
   `prototype/map/acceptance/specifications.test.ts`, or integrate a real backend/UI
   suite with this gate. Register each case explicitly. Assertions must check the
   specified result; do not assert source text, mirror private algorithms, or use a
   fake service as proof of a real service requirement.
4. Run the new cases and establish their expected failure against missing/wrong
   behavior. A handler runs even while its feature is planned, enabling red/green work.
5. Implement the smallest behavior that satisfies the contract. Do not change expected
   values merely to match output. Any product change needs a specification review.
6. Run all baseline checks. Mark a feature implemented only when every scenario runs
   against its real boundary and its required device/backend evidence is recorded.
   Split independently deliverable functionality into separate feature IDs when needed.
7. Update the baseline manifest deliberately and add an exact old/new digest change record for review. Link PRs to feature
   and scenario IDs; include test results and field evidence. Review both the contract
   and the behavior before merging. Keep prior acceptance cases on every future change.

## Commands

From the repository root:

```sh
python3 scripts/check_docs.py
python3 scripts/specifications.py
python3 scripts/check_baseline.py
python3 scripts/test_baseline.py
cd prototype/map
npm ci
npm run typecheck
npm run lint
npm test
npm run build:web
```

For focused acceptance work: `npm run test:acceptance`. For existing unit/renderer
checks: `npm run test:unit`. CI runs both through `npm test` and validates catalog
structure, IDs, dependency references/cycles, and generated-document freshness.
Missing implementations produce visible TODOs; missing coverage on an implemented
feature fails. New handlers must use assertions and real behavior—CI registration
checks alone cannot judge the quality of arbitrary test code; review is mandatory.

## Manual and service evidence

Scenarios labeled `device` require physical-device execution with scenario ID,
OS/device/build, rules version, steps, observed result, date and reviewer recorded
in the release validation record. `integration` requires the relevant actual local
or staging service, including migrations/RLS and concurrency where specified.
Domain tests and a web export cannot substitute for either. A device scenario of an
implemented feature is registered with `requireDeviceEvidence` in
`prototype/map/acceptance/deviceEvidence.ts`: it fails unless the device evidence
record is complete and the scenario's row starts with "Passed". It checks the
record, not the phone; reviewing the record is what makes it evidence. Add these environments
to CI as their features land; do not turn unavailable-service failures into passes.

## Full-product decisions and release scope

See the [decision register](../decisions/README.md) for concrete owners, trial values,
evidence and milestone deadlines. Full v1 includes screen-locked walking/running/cycling,
public territory, earned coins/shop, friends, guilds, competitions, resets and alerts.
Chests remain optional. Cycling is required for full v1. Paid currency and live friend tracking are not assumed.
See [delivery/testing](../testing/README.md) for test-layer introduction and review.
The current manifest is a specification snapshot, not a claim that planned features work.
