# Architecture and data model

## Layers

- Client: React Native, Expo, TypeScript; current demo uses Expo 58.
- Navigation: Expo Router with Map, Activity, Guild, Goals and Profile tabs; accounts gate entry.
- Location: foreground Expo Location in the current demo; full v1 requires separately validated native screen-lock recording (M3).
- Map: existing Leaflet/WebView or iframe and pixel renderer, OpenFreeMap/OSM data.
- Local persistence: native SQLite with account-partitioned drafts and local completion outbox;
  browser recordings are in-memory only. Persisted H3 gameplay is planned for M2.
- Backend: Supabase Auth and private PostgreSQL profiles protected by RLS. Authoritative
  expedition validation and reward transactions remain planned.
- Geography: planned H3; resolution remains a field-test decision. IDs are strings.

Device GPS → client → local store/outbox → authenticated submission → server
validation → atomic database finalization → confirmed client reconciliation.
Map providers receive requests for viewed areas; preserve attribution and evaluate
provider conditions before wider use. Recording offline does not imply offline tiles.
Choose a browser persistence strategy before promising web gameplay parity.

## Planned entities (not implemented migrations)

- Profile: UUID referencing auth user, display name, avatar key, created time.
- Expedition: device-generated UUID, user, mode, start/end time, status, validated
  distance and immutable rules version.
- TrackPoint: expedition + sequence primary key, latitude/longitude, accuracy,
  recorded time, segment ID.
- Cell: H3 string primary key and resolution; geometry derived from H3.
- Discovery: user + cell primary key, discovery time and source expedition.
- Ownership: cell primary key, owner, claim time, source expedition and version.
- XpEvent: ID, user, expedition, reason, amount, unique reward key.

Use foreign keys, coordinate bounds, and appropriate amount constraints. Personal
discovery is separate from mutable ownership. First-discovery reward identity is
user + cell + reason, independent of expedition ID. Only newly inserted discoveries
produce first-discovery rewards, including under concurrent different expeditions.

## Persistence, security, and synchronization

Persist active points incrementally. On finish, save the immutable expedition and
outbox entry atomically. Recover interrupted drafts as new segments or explicitly
discard them. Never lose a queue on logout or send another account's data.

Derive caller identity from auth. Validate payload limits, ordering, times, accuracy,
speed, segments, mode, and rules version. Client coordinates are not tamper-proof;
advanced anti-cheat is future work. Reject changed payloads reusing an existing ID.

One transaction records discovery, eligible cell ownership, unique rewards, and
final result. Lock contested cells in stable order. Define commit-order semantics
for competing captures. Return the same result after retries or response loss.
Apply versioned/cursor-based reconciliation so stale clients cannot overwrite newer
ownership or erase discovery. Define old-rule acceptance and reset-event boundaries.

RLS protects raw tracks and personal discovery. A bounded public-territory projection
returns anonymous current cells even outside personal fog; identities and activity media
use explicit audience checks. Never expose unrestricted private ownership metadata or
raw tracks. Block client reward/owner writes.
Service credentials never enter the client or repository. Redact coordinates from
routine logging; define retention/deletion and backup/restore before production.

Captured-interior discovery semantics remain a recorded decision before A3/A4/B4.
See [specifications](specifications/README.md) and [roadmap](08-development-roadmap.md).


## Full-product modules and contracts

Keep a modular app and one modular backend initially; no premature microservices.
Separate pure geography/rules from device hooks, map rendering, storage, transport
and screen code. Local/server shared rules must carry an explicit version, but the
server still independently validates identity and eligibility. DTOs use UTC epoch
milliseconds, meters, square meters, integer currency units and H3 strings.

Extend the planned schema in owning milestones, never all at once:

- **M2:** immutable ExpeditionResult plus request hash, Discovery/XpEvent ledger and
  a server EventOutbox row committed with finalization; cursor/version for reconciliation.
- **M4:** CaptureEvent, versioned Ownership (season dimension when seasons arrive),
  ActivitySnapshot and MediaAsset. Store confirmed cell union/area/duration, not a
  screenshot of the player's live map. Thumbnail work retries from the outbox; images
  are audience-controlled and deletable. Public territory is a sanitized read projection.
- **M5:** WalletEvent with unique source key, CatalogItem/version, Purchase/idempotency
  key, Inventory unique user/item, EquippedAppearance, ObjectiveDefinition/Window,
  ObjectiveProgress/RewardClaim and AchievementUnlock. Atomic debit plus unlock; no
  separate client balance update. Consumers deduplicate by committed event ID.
- **M6:** Friendship state, Block, ActivityAudience, Report/ModerationAction,
  NotificationInbox, DeviceToken and NotificationPreference. Account-bound tokens are
  revoked on logout; notification transport retries never mutate gameplay rewards.
- **M7:** Guild, Membership/Role and Contribution records. Individual ownership stays
  the starting source; current guild territory is a union projection under D08.
- **M8:** Competition, EligibilitySnapshot, ScoreEvent, FinalStanding, Season and
  ScheduledJob/ExecutionKey. Archive results; move active season in an idempotent
  transaction rather than partially clearing the world in an unbounded request.
  Define how old-season pending expeditions are handled before this schema ships.

No push, feed image or goal-processing job runs from an uncommitted client prediction.
Commit game effects and durable outbox events together, then process with bounded
retries, deduplication and failure visibility. Historical cards retain original captures;
current ownership uses a different query. A season reset changes current ownership
and competitive standings, not lifetime discovery/XP, wallet or inventory.

## First integrated API slice

M2 needs authenticate/restore session, submit immutable expedition, get result by ID,
and page confirmed discovery/XP/history changes. M4 extends versioned finalization
with capture; it does not create a second competing award transaction. Later endpoints
cover bounded territory views, activity/media access, purchases, objective claims,
friend/guild membership, schedules and notifications. Each endpoint gets runtime schema
validation, authorization, limits and stable retryable/terminal reason codes.

## Testing and operations

Real SQLite migration/recovery checks land with M1. A real local backend, seed data,
migration reset and initial two-user RLS checks land with M1 auth; submission/concurrency CI expands in M2. Use synthetic fixtures
for two players and later two guilds. Do not claim those services exist yet.
Track queue age, validation/reward conflicts and event-delivery/reset failures with
redacted metadata; avoid location in logs. Feature flags, backup/restore, old-client
compatibility and staged rollout belong to the milestone that first needs them.


## Activity specialization and immutable mode

M3 adds `Profile.preferred_activity` (walk/run/cycle; displayed as Walker/Runner/Cyclist).
This is separate from `GuildMembership.permission_role` (leader/officer/member).
Only the preference is freely editable; it must not authorize guild actions.
`Expedition.mode` and `rules_version` are fixed on start and persisted in drafts,
submission hashes and results. V1 switches modes by starting a new expedition, not
by rewriting the existing one. Snapshot contribution/activity mode in competition
score events and historical cards; never derive old rewards from the current profile.

Keep first-discovery ledger uniqueness independent of mode. Mode-specific activity,
goal and competition rewards use distinct reason/eligibility keys, approved caps and
versioned balance parameters. A preference edit is not a reward event. Guild badges
reflect the current preference while earned scores retain their original category.
