# Full Wayborn delivery plan

Updated for the complete user vision on 22 November 2026. This replaces the former
six-wave exploration MVP plus indefinite social backlog. Nothing below is marked
complete solely because a mockup or specification exists.

Read [product experience](09-product-experience.md), [decisions](decisions/README.md),
[specifications](specifications/FEATURES.md), and [delivery/testing](testing/README.md).

## Delivery strategy

Build one integrated player outcome at a time. The first playable outcome is:
**open → map → sign in/start → walk → finish offline → restart → reconnect → receive
confirmed discovery XP → see retained progress.** Territory is added after this is
reliable; discovery XP does not depend on territory capture.

Two developers work concurrently on different parts of the same milestone:
**Hanan** owns GPS, geography, renderer/overlays and capture rules. **Ismar** owns
navigation, accounts, persistence, backend, economy and social/event integration.
Each reviews the other's changes. Ownership is expertise, not a permanent integration
queue: each PR includes its contract consumer and end-to-end acceptance evidence.

One active implementation task per developer; use small branches/worktrees and merge
reviewed slices frequently. Agree schemas and fixtures first. One owner edits shared
contracts/manifests/migrations per task. Avoid long parallel branches and whole-screen
mock implementations that defer integration. Product behavior and expected results
must be reviewed separately from making implementation output green.

## Milestone 0 — Decisions and reliable development baseline

Required feature IDs: `GEO, GPS`.

**Outcome:** both developers can run the same baseline; high-risk product choices have
owners, evidence criteria and deadlines before dependent implementation.

- Hanan: physical-device GPS spike, H3 size comparison using representative routes,
  signal-gap/recovery fixtures and screen-lock feasibility. Inventory actual test devices.
- Ismar: baseline protection/reporting, shared contract outline, local backend/bootstrap
  plan, migration conventions, secure environment configuration and first navigation map.
- Together: approve public-territory/private-activity policy, define target devices,
  freeze trial thresholds and development performance budgets in D01–D14.
- Deliverables: executable baseline gate; decision register; initial fixture catalog;
  one-command documented local setup for each service as soon as introduced.
- Acceptance: changed/removal/downgrade baseline checks demonstrably fail; scenario
  status report distinguishes pending work. Record GPS spike evidence on actual phones.
- Exit: unresolved choices may remain only if their dependent task has not started.
  No assumed app-store/background capability without a native test.

## Milestone 1 — Map-first shell and recording foundation

Required feature IDs: `MAP, AUTH, NAV, LIFE, STORE, ISOLATION, ACCESS, STARTUP`.

**Outcome:** open through branded loading into the map; browse territory placeholders
only in explicitly labeled development mode; begin a deliberate foreground activity.

- Hanan: explicit idle/waiting/active/paused/interrupted/finished lifecycle, valid-position
  presentation, accepted segmented track, max-sample-gap rules, map style/centering.
- Ismar: Expo Router shell (Map, Activity, Guild, Goals, Profile), session/account flow,
  permission entry points, local auth-backend bootstrap, initial access-control tests,
  incremental local draft persistence and migration 001.
- Shared contract: activity ID, mode, units, segment/sequence, device/account identity,
  recording timestamps and storage adapter. Start with walking; no fake permanent XP.
- Tests now: lifecycle/domain fixtures, permission UI, restart recovery, SQLite migration
  against actual storage, two-account local isolation, first outdoor walk.
- Exit: map opens without network-dependent infinite loading; start is explicit; denial
  allows browsing; recording survives restart; resume cannot bridge a gap.

**Open M1 work after the account PR (#15), 22 November 2026:**

- Accounts: AUTH-02 is covered for email/password (wrong password message; expired or revoked
  session returns to sign-in with a notice; saved walks stay with their owner, tested against
  the local backend and real SQLite). The submission half waits for M2 sync, and AUTH stays
  planned until device evidence exists. Still open: Google
  sign-in via a hosted development Supabase project and `wayborn-field-demo://auth/callback`;
  keyboard layout, secure-store development build and sign-out
  on the iPhone; verify CI on the new PR head.
- Hosted auth infrastructure: private-profile migration `202611220001` is deployed;
  real two-account profile/RLS checks pass and both SMTP code flows were verified
  through a real temporary mailbox and hosted web app. This is not device evidence.
- Storage and identity: the signed-in user now owns account-partitioned SQLite storage on
  native builds (recorder, draft recovery/discard, pending list on Activity; acceptance
  STORE-01, STORE-02 write-failure recovery, STORE-04, ISOLATION-01/02 run against real SQLite).
  STORE-03 now upgrades a frozen version-1 database with pending work (24 November).
  Still open: physical-device restart/termination evidence,
  browser storage (not provided; walks
  are in-memory there) and server-derived identity for expeditions (M2).
- Carried over from `t3/check-m0-start-m1`, ported onto `dev`'s own shell: Activity lists
  every walk completed in the session; browser tests NAV-04 (five tabs, no GPS request)
  and NAV-05 (several finished walks in Activity), added as new scenarios so NAV-03's
  paused-walk expectation is kept; map-document fixes for the tile-job cleanup race and
  pan-only-when-moved; tile-source and cache-open timeouts; unit tests `mapUpdates`,
  `pixelReload` and `tileLoading`. Not ported because `dev` already covers them or the
  layout differs: cached-tile paint ordering (`dev` uses `requestAnimationFrame`), pixel
  status wording, zoom/status controls (the walk panel is outside the map on `dev`).

- 24 November 2026: browser cases now run for MAP-01..03, LIFE-01, LIFE-03,
  ACCESS-03 (new: location-use explanation, labeled 44 px walk controls) and
  STARTUP-01 (saved account opens the map without waiting for a token refresh, behind
  a static branded screen). MAP-04/05 already ran. Still open for M1: every device
  scenario (see [the M1 device evidence record](testing/m1-device-evidence.md)),
  STARTUP-02 (needs notifications), Google sign-in, and AUTH-02's submission half (M2).

## Milestone 2 — First complete walking-and-discovery alpha

Required feature IDs: `FOG, API, XP, SYNC, RECONCILE, PRIVACY, PROGRESS`.

**Outcome:** a real account walks offline and receives durable confirmed discovery XP
when reconnecting. A second device can recover the same progress.

- Hanan: approved H3 traversal, personal fog, durable segmented trail versus bounded
  display buffer; provisional-to-confirmed map reconciliation.
- Ismar: extend the local Supabase environment and migrations/RLS with authenticated submission,
  idempotency/result lookup, discovery reward transaction, durable outbox, profile totals
  and basic private expedition history. Move synchronization here from the old wave 5.
- Shared contract: immutable payload/hash, rule version, stable result/rejection codes,
  discovery deltas, reward ledger, pagination/cursor policy and session-expiry behavior.
- Tests now: real local database/RLS in CI; two concurrent expeditions sharing one new
  cell; duplicate request and changed-payload reuse; response loss after commit; restart
  offline; account switching; transaction rollback; second-device synchronization.
- Exit: demonstrate the complete loop on two devices, with zero duplicate rewards and
  no data loss. Capture, coins and social screens remain clearly unavailable, not mocked
  as live features. This is the first playable alpha, not the finished product.

## Milestone 3 — Activity specializations, three modes and screen-lock reliability

Required feature IDs: `MODE, BACKGROUND, CYCLING, SPECIALIZATION`.

**Outcome:** a normal walking/running/cycling session works with the phone in a pocket on
supported native builds. Background execution is limited to an explicitly active session.

- Hanan: mode-specific validation, native background sample ingestion, permission loss,
  delayed/batched fixes, interrupted-session boundaries and outdoor route comparison.
- Ismar: changeable Walker/Runner/Cyclist preference, per-start mode chooser, session
  recovery UX, background permission education, native build configuration,
  local write scheduling, complete support-state messaging and energy/performance evidence.
- Tests: supported iOS/Android devices, lock/unlock, low-power mode, OS interruption,
  revoked permissions, explicit force-quit/restart, two-hour walk/run/ride and network changes.
- Exit: no promise of uninterrupted tracking after OS termination; persisted data is
  recoverable and gaps are explicit. Battery/memory budgets pass. If screen-lock behavior
  fails, remain a clearly labeled foreground alpha; do not ship full v1 as a running app.
- Cycling has its own required M3 validation gate. Do not loosen walking rules to accommodate running or cycling.

## Milestone 4 — Territory capture and activity cards

Required feature IDs: `CAPTURE, CLAIM, TERRITORY, ACTIVITY`.

**Outcome:** run/walk to capture cells, see competitors' territory, and review a card
showing the confirmed captured shape, area and duration.

- Hanan: capture geometry/fixtures; small-loop interior versus route-band rules; partial
  takeover; own/other/guild map layers; territory detail; confirmed shape thumbnail geometry.
- Ismar: atomic capture extension to existing expedition finalization, public bounded
  territory projection, capture-event history, private activity cards and image generation.
- Keep one transaction boundary for final expedition effects. Preserve M2 discovery-only
  payload compatibility via explicit rules versions; no second independent award path.
- Freeze D14 mode-specific capture caps before this milestone’s capture implementation.
- Tests: boundary/large/open/self-crossing/gap cases; two-user overlapping commits; image
  area matches confirmed cell union; public territory reveals no private routes/identity;
  historical cards remain stable after later takeovers or resets.
- Exit: two real players can partially capture each other's zone; only eligible cells
  change. Map, card, server and profile agree after retry and on another device.

## Milestone 5 — Progression, coins, cosmetics and goals

Required feature IDs: `PROFILE, CHALLENGE, COSMETIC, WALLET, GOALS, MODE_REWARDS`.

**Outcome:** Profile has confirmed XP/coins, inventory/shop and achievements; Goals
has daily/weekly progress and reliable one-time rewards.

- Hanan: effort-balanced mode rewards (D14), confirmed-event aggregation for achievements and daily/weekly objectives;
  test fixtures for overlapping goals, repeated cells, resets and time boundaries.
- Ismar: immutable coin ledger, server-priced cosmetics catalog, atomic purchase/unlock,
  equip UI, wallet history, goal reward claims and profile presentation.
- Agree catalog version, rounding, server time windows, reward caps and spending policy
  before UI integration. Use earned coins only for v1; no real-money purchase assumptions.
- Tests: insufficient funds; simultaneous spends; duplicate purchase; negative/overflow
  amounts; late offline submissions; day/week rollover; device timezone manipulation;
  one expedition completing several distinct goals; replayed achievement events.
- Exit: balances cannot go negative or duplicate; owned cosmetics sync across devices;
  goals clearly distinguish progress, completion and claimed reward.

## Milestone 6 — Friends, activity sharing and notifications

Required feature IDs: `FRIENDS, FEED, NOTIFY`.

**Outcome:** Activity shows friends' opted-in capture cards; an inbox and optional push
notify a player when their confirmed territory is taken.

- Hanan: map/card filtering, sanitized territory thumbnails, zone-loss grouping and
  geographic event fixtures, historical-versus-current territory presentation.
- Ismar: friendship requests/accept/remove/block, audience-aware feed/pagination,
  image access control, reporting/moderation workflow, notification inbox, push tokens,
  preferences, quiet hours and deep links. A server event outbox drives delivery.
- Tests: friend-only cards cannot be fetched by strangers; revoked friendship/blocking
  also revokes image access; duplicate/failing push deliveries do not duplicate inbox
  events; logout revokes account-bound device tokens; reset causes no takeover-alert storm.
- Exit: a real takeover creates one understandable grouped notification and opens current
  territory detail; it never reveals the attacker's live position or discards an active walk.

## Milestone 7 — Guild membership, progress and territory

Required feature IDs: `TEAM`.

**Outcome:** players join/create a guild, see member contributions and guild territory,
with clear membership and role rules.

- Hanan: guild map aggregation and contribution calculations based on authoritative
  capture events, overlap/double-counting fixtures and membership-change cases.
- Ismar: guild creation/invites, permission roles separate from activity specializations,
  changeable roster badges, join/leave/remove, limits, moderation, roster,
  progress overview and secure guild API. Keep individual ownership as the initial
  source of truth; guild aggregation semantics are frozen in D08 before implementation.
- Tests: removed members lose private access; contribution snapshots do not transfer
  unfairly when switching guilds; archived results are not rewritten; two members'
  overlapping cells are not counted twice in current area.
- Exit: two guilds can inspect accurate progress/territory while privacy and role checks
  hold through membership changes and app restarts.

## Milestone 8 — Competitions, seasons and reset events

Required feature IDs: `EVENT, COMPETITION`.

**Outcome:** Guild shows upcoming competitions/standings; Map shows reset timing; a
season ends predictably while preserving lifetime progress and history.

- Hanan: scoring rules, area snapshots, scoring windows, tie/late-submission cases,
  map transition and season-aware capture fixtures.
- Ismar: scheduled event administration, UTC lifecycle/scheduler, eligibility and roster
  snapshots, leaderboards, archival, idempotent reward distribution, reset job and inbox.
- Tests: reset job retries midway; two workers start it; client clock skew; activity
  crossing cutoff; submission after allowed grace; guild switch; ties; reward rerun;
  notification aggregation and old-result replay after season change.
- Exit: rehearsal with two guilds: publish schedule → compete → freeze/finalize scores
  → award once → reset ownership → start new season. Discovery, lifetime XP, wallet,
  cosmetics and historical cards remain intact. New-season captures use capped seasonal
  rewards, never a replay of first-discovery rewards. This is feature-complete beta.

## Milestone 9 — Launch readiness and product validation

Required feature IDs: `DELETE, RELEASE`.

**Outcome:** the entire requested experience is reliable, understandable and enjoyable
on the supported devices; marketing matches delivered capabilities.

- Hanan: broad outdoor testing, density/poor-signal scenarios, long-session performance,
  readable map overlays, accessibility and synthetic anti-abuse regression fixtures.
- Ismar: retention/deletion, backup/restore rehearsal, deployment rollback, redacted
  observability, push/economy/event operational tools, release signing/distribution and
  landing-page copy handoff. Verify account/image deletion and blocked-user behavior.
- Together: full journey playtest; classify failures, review fairness/reward pacing,
  verify branch protections/required checks, archive evidence against exact builds.
- Exit: no open data-loss, authorization, duplicate-reward or broken-core-flow defects;
  restoration and reset drills pass; device matrix and decision register are closed for
  launch. Feature flags can disable broken subsystems without corrupting existing data.
- Full v1 includes the requested splash/map/start, capture, XP/coins/shop/achievements,
  guild progress/map/competitions, resets, goals, own/friend cards and takeover alerts.

## Optional expansion after v1

Exploration chests after eligibility/reward decisions. Cycling is part of full v1
and must pass independent mode/balance/device validation in M3–M5. Paid currency, trading, chat and live friend locations are
not authorized scope by implication. Do not let these delay the requested full experience.

## Milestone acceptance and estimation

Each milestone receives a demonstration on the integrated branch and scenario evidence,
not a percentage inferred from files/screens. PRs identify milestone, feature and scenario
IDs, prerequisites, changed contracts, expected result, red/green evidence and rollback.
Keep a small demonstration dataset with two accounts, two guilds, one contested zone,
one offline expedition, one goal rollover and one upcoming season. Synthetic data only.

Do not invent calendar deadlines. At M0 each developer estimates small tasks after the
spikes; measure actual completion in M1/M2 and forecast the remaining milestones from
that evidence. Re-estimate when decisions change. Leave explicit integration/field-test
capacity within each milestone rather than reserving it for M9.

## First implementation queue

1. M0: finish the contract baseline guard and coverage report; review D01–D14.
2. Hanan M0: device screen-lock spike + H3/accepted-track fixtures.
3. Ismar M1: map-first shell + session/storage adapter and first migration.
4. Hanan M1: explicit lifecycle + accepted-location presentation; integrate with storage.
5. Both M2: deliver the first full offline-to-confirmed-discovery loop before capture.

The current repository still contains the technical demo and domain acceptance baseline.
The workflow/plan changes in this revision do not claim the M1–M9 app is implemented.
