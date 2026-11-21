# Wayborn development instructions

## Read before implementation

Read `README.md`, `docs/01-project.md`, `02-scenarios.md`,
`03-architecture.md`, and `08-development-roadmap.md` in `docs/`.
Read any narrower AGENTS.md before editing its directory; the Expo-specific
instructions are in `prototype/map/AGENTS.md`.
Use the current code and task acceptance criteria to establish what exists.
Mockups and architecture diagrams describe intent, not completed functionality.

## Working routine

1. Inspect git status, the relevant implementation, tests, and current roadmap dependencies.
2. Pick one roadmap task. State scope, acceptance criteria, owned files, dependencies,
   and the interface needed by the other developer in the issue/PR.
3. Preserve unrelated changes. Use a separate branch/worktree per developer.
4. Implement the smallest complete behavior, including loading, empty, error,
   offline, and recovery states where applicable. Keep demo data out of production flows.
5. Add meaningful regression tests for gameplay, persistence, authorization, and sync.
6. Run applicable checks below; report actual results and untested device behavior.
7. Update affected docs and provide a handoff with changed contracts, migrations,
   test evidence, remaining risks, and next task. Never mark a milestone complete
   based solely on a mocked screen or a successful web build.

## Invariants

- The first alpha is foreground walking; full v1 includes walking/running/cycling with validated native screen-lock support. Follow M0–M9 and the decision register.
- H3 IDs are strings. The demo's approximate grid is not H3 and cannot be reused as H3 data.
- GPS permission is not a valid fix. Pause, backgrounding, bad signal, and jumps
  break segments; never bridge gaps into distance, discoveries, or capture polygons.
- Panning/centering the map and developer coordinate controls must not grant progress.
- Discovery is personal and permanent; ownership is mutable and separate.
- The server derives identity from authentication and recomputes accepted cells and XP.
  Client previews are provisional. Never trust submitted owners, XP, or user IDs.
- Expedition retries must be idempotent, including after a lost response or concurrent requests.
  Discovery, ownership, rewards, and final status commit atomically.
- Raw tracks and exact live locations are private. Public anonymous territory can appear beyond fog; identities, activity cards and images require audience authorization. Never expose credentials or coordinates in routine logs.
- Persist pending work before acknowledging completion. Partition local data by account;
  logout or switching users must never send another user's queue.
- Preserve map provider attribution and handle unavailable tiles. Offline recording does
  not imply offline basemaps. Do not silently promise background tracking or offline maps.
- Rules and thresholds need versioning and recorded decisions. Proposed values in the
  project design are not approved production constants.

## Checks

Documentation: `python3 scripts/check_docs.py` from repository root.
App changes: in `prototype/map`, use `npm ci` when dependencies need installing,
then `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build:web`.
Add backend/migration checks when that implementation lands; these app checks do
not validate RLS, transactions, or a deployed backend.
GPS/lifecycle changes require physical-device evidence, including permission denial,
poor signal, pause/resume, background/foreground, and recovery after restart.
Before modifying Expo/React Native APIs, follow the versioned-documentation rule in
the nested AGENTS.md. Do not change dependencies or rewrite the renderer incidentally.

## Parallel development

Follow the two tracks and merge gates in the roadmap. One owner edits shared
contracts, package manifests/lockfiles, root navigation, and migrations per milestone.
Agree interface changes before coding; notify the other developer when they change.
Review each other's PRs and test the integrated commit before starting dependent work.

## Specification-first acceptance (required)

Read `docs/specifications/README.md` and the applicable entries in
`docs/specifications/features.json` before implementation. Define goal, rules,
expected result, and Given/When/Then scenarios first. Add executable acceptance
cases that fail for missing/incorrect behavior, then implement. Do not derive
expected values from production helpers or weaken assertions to make code pass.
Run `python3 scripts/specifications.py` plus the standard baseline checks.
`npm test` includes acceptance tests; TODO means planned, never implemented.
Every implemented scenario needs an explicit real-behavior adapter. Deliberately update the frozen baseline manifest with an exact contract change record; PR review must examine removals, changed expectations and status downgrades. Retain existing cases
on future changes. Record backend/device evidence where the specification requires it.
Use English for new paths, identifiers, docs, UI copy, issues and workflow names;
preserve proper names, external URLs, and historical authorship.


## Full-product delivery rules

Read `docs/09-product-experience.md`, `docs/decisions/README.md` and
`docs/testing/README.md`. The user-requested flow takes precedence over historical
exploration mockups. Integrate discovery rewards/sync before capture, test storage
and backend with their first implementation, and test devices from M0/M1 onward.
Run `python3 scripts/check_baseline.py` and `python3 scripts/test_baseline.py`.
CI compares contract snapshots against the PR base; normal tests must never rewrite
expected results or baseline manifests. Human review is still required; a registered
handler alone is not proof that its assertions are meaningful.

- Keep changeable Walker/Runner/Cyclist specialization separate from guild permissions and immutable expedition mode. V1 mode switching starts a new activity. Never recalculate historical rewards from the current preference; follow D13/D14.
