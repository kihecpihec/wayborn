# Feature specifications

Generated from `features.json`. Edit the source, then run `python3 scripts/specifications.py --write`.

Implemented means the listed acceptance scenarios execute; it does not imply adjacent planned features exist.

## MAP: Map presentation

Owner: Hanan. Milestone: M1. Status: **planned**.

Goal: Show real geography in a readable pixel-art world.

Rules:

- Keep provider attribution visible in all styles.
- Camera changes never change gameplay position or rewards.
- Unavailable tiles must not lose recorded walks.
- Map opening does not start recording. Show labeled preview without a valid permitted fix.
- The first Expo entry slice opens a Ljubljana preview in pixel mode without requesting location or creating a walk.
- Give the initial basemap attempt 3 seconds to show a drawable raster or pixel tile, then offer retry. Keep the preview shell usable throughout.

End result: A usable map with explicit loading/error states and independently controlled camera.

Dependencies: none.

Acceptance scenarios:

- **MAP-01** (ui): Given A visible map and active walk; when pan, change style, and recenter; then position, discoveries and XP remain unchanged.
- **MAP-02** (integration): Given The tile provider is unavailable; when open the map and record a walk; then show failure/retry state and retain the walk.
- **MAP-03** (ui): Given A loaded map; when switch between pixel and normal styles; then both styles retain provider attribution.
- **MAP-04** (domain): Given An initial basemap attempt with no drawable tiles; when 3 seconds pass; then offer retry; retry begins a fresh loading attempt and the first visible tile clears the message.
- **MAP-05** (domain): Given The first drawable raster or pixel tile arrives before the deadline; when the initial deadline passes; then keep the map visible without an unavailable message.

## AUTH: Accounts and session recovery

Owner: Ismar. Milestone: M1. Status: **planned**.

Goal: Let a player securely return to their own progress.

Rules:

- Derive identity from authentication.
- Support sign-in/out and the selected flow’s verification and recovery.
- Never discard queued work on session expiration.

End result: A restored authenticated session or an actionable entry error.

Dependencies: none.

Acceptance scenarios:

- **AUTH-01** (integration): Given A new user; when register and verify using the chosen auth flow; then a single profile is created and map entry succeeds.
- **AUTH-02** (integration): Given Invalid credentials or expired session; when attempt sign-in or submission; then deny access, show a useful error, and preserve pending work.
- **AUTH-03** (integration): Given A player who lost access; when complete the supported recovery flow; then regain only their own account.
- **AUTH-04** (ui): Given A signed-out player; when open Map or a destination directly; then show account entry before any gameplay or location request.

## NAV: Navigation and app shell

Owner: Ismar. Milestone: M1. Status: **planned**.

Goal: Make the core player flow reachable and reversible.

Rules:

- Use Expo Router.
- Keep business logic outside routes.
- Unconfigured services fail clearly.
- Open into Map after bounded branded loading; browsing is available before account/permission prompts.
- Map, Activity, Guild, Goals and Profile are primary destinations. Require authentication to record durable rewarded activities, not to browse.

End result: Entry, map, permission, summary, territory and profile routes share one consistent state.

Dependencies: none.

Acceptance scenarios:

- **NAV-01** (ui): Given An active or paused expedition; when open finish confirmation and cancel; then restore the exact preceding lifecycle state and totals.
- **NAV-02** (ui): Given A persisted pending summary; when return to map then reopen the summary; then the same expedition remains queued and visible.
- **NAV-03** (ui): Given Map Home is open with a walk paused; when visit Activity and return to Map; then show the current session in Activity and retain the paused walk and totals on Map.
- **NAV-04** (ui): Given A signed-in player launches the development shell; when browse Map, Activity, Guild, Goals and Profile then return to Map; then all five destinations are reachable without location permission; unavailable services are explained and no walk starts.
- **NAV-05** (ui): Given A signed-in player on the full-height Map; when start, pause and finish a walk, open Activity, then record and finish a second walk; then Activity lists both completed walks from this session in order, and the Map keeps its Start walk control.

## GEO: Versioned geographic rules

Owner: Hanan. Milestone: M0. Status: **planned**.

Goal: Make client preview and server decisions reproducible.

Rules:

- H3 IDs are strings; never reinterpret demo cell keys.
- Record resolution, units, supported region and rules version.
- Field-test thresholds; define path coverage, boundaries and captured-interior discovery before persistence.
- The M0 sample-only trial uses h3-samples-v1 at resolution 11. Use H3 point containment for globally valid coordinates, deduplicate in first-seen order, and reject invalid coordinates or unknown versions. This trial derives no traversed or captured interior.
- h3-walk-segments-v1 reveals cells touched by reliable segments, using resolution 11 and straight lines in locally unwrapped WGS84 coordinates between accepted fixes. Segment changes, poor fixes, gaps over 15 seconds and speeds over 4 m/s break continuity. Latitude beyond 85 degrees is explicitly unsupported for this trial.

End result: Documented rule decisions and shared deterministic geographic fixtures.

Dependencies: none.

Acceptance scenarios:

- **GEO-01** (integration): Given The same trace and rules version; when evaluate on client and server; then candidate cells and reasons agree exactly.
- **GEO-02** (integration): Given A boundary/antimeridian or unsupported-region trace; when evaluate coverage; then apply the documented boundary policy or explicit rejection without giant accidental capture.
- **GEO-03** (domain): Given Synthetic street, park, antimeridian and high-latitude samples; when index them with H3 at trial resolutions 10 and 11; then return valid string IDs at the requested resolution and match the documented H3 reference coordinate.
- **GEO-04** (domain): Given The versioned H3 sample-only rules; when evaluate duplicates, an antimeridian trace, invalid coordinates and an unknown version; then return first-seen unique string cells for valid samples, one local cell for the fixture crossing, and explicit reasons for incompatible input.
- **GEO-05** (integration): Given A reliable walking segment crosses three cells and its endpoints occupy two; when evaluate normally and with a pause, poor fix, long gap, jump or unsupported latitude; then include the middle cell only for the reliable segment, reject unsupported latitude, and match the local server result.

## GPS: Accepted walking samples

Owner: Hanan. Milestone: M0. Status: **implemented**.

Goal: Prevent invalid movement from creating demo progress.

Rules:

- Only finite, in-range coordinates with finite nonnegative timestamps and known accuracy from 0 through 50 m are accepted.
- Samples must have strictly increasing timestamps.
- Movement below 3 m is jitter and grants no distance.
- Movement faster than 4 m/s is rejected, using actual elapsed seconds even below one second.
- Weak/invalid fixes break continuity; recovery establishes a new baseline.
- A speed jump earns no cells or distance; it establishes a new baseline.
- Paused or finished walks ignore samples; finish requires explicit reset to start another demo walk.
- Elapsed-time updates must be finite and positive, and only count while running.
- An interval greater than 15 seconds since the accepted baseline starts a new segment and contributes no connecting distance (D05 trial).
- A location-service interruption explicitly clears continuity.
- Displayed accepted position does not move to a rejected fix; preserve the last accepted position with uncertainty handled by the UI.

End result: Only accepted movement contributes distance and sample-cell discovery; no bridge spans a rejected gap.

Dependencies: none.

Acceptance scenarios:

- **GPS-01** (domain): Given A new demo walk; when walk 0.0001 degrees north on the equator over ten seconds; then record approximately 11.12 meters.
- **GPS-02** (domain): Given An accepted starting point; when jump one latitude degree in one second; then award no distance or additional discovery.
- **GPS-03** (domain): Given An accepted start followed by weak GPS; when recover far away after the gap; then start a new segment without bridging the gap.
- **GPS-04** (domain): Given An accepted start; when send unknown accuracy; then do not grant any additional discovery.
- **GPS-05** (domain): Given An accepted start; when send out-of-range coordinates; then do not grant distance or discovery.
- **GPS-06** (domain): Given A paused walk; when send location and timer updates; then do not count movement or active time.
- **GPS-07** (domain): Given A paused walk; when resume at a distant location; then start from a new baseline.
- **GPS-08** (domain): Given A finished walk; when attempt resume and send samples; then remain finished without progress.
- **GPS-09** (domain): Given A valid baseline; when send an older sample; then ignore it entirely.
- **GPS-10** (domain): Given A weak-fix gap; when send a stale sample then recover; then do not reconnect through the stale sample.
- **GPS-11** (domain): Given A running walk; when send negative or zero elapsed updates then two valid seconds; then count exactly two seconds.
- **GPS-12** (domain): Given A valid starting point; when move about 3.34 meters in half a second; then reject movement faster than 4 m/s without discovery.
- **GPS-13** (domain): Given A valid starting point; when drift less than three meters; then do not add distance.
- **GPS-14** (domain): Given An accepted start followed by silence; when receive a plausible movement after 16 seconds; then start a new segment without connecting the unobserved interval.
- **GPS-15** (domain): Given An accepted start; when receive a location-service interruption then recover; then retain progress but establish a new baseline.
- **GPS-16** (domain): Given An accepted displayed position; when receive a speed jump; then keep the accepted displayed position instead of teleporting the marker.
- **GPS-17** (domain): Given An accepted displayed position; when receive weak accuracy; then keep the accepted displayed position.

## LIFE: Foreground expedition lifecycle

Owner: Hanan. Milestone: M1. Status: **planned**.

Goal: Record only deliberately started foreground walking.

Rules:

- Start idle and request permission only through the start flow.
- Permission alone is not a valid fix.
- Pause, signal loss and actual tracking interruptions break segments. The M1 foreground alpha interrupts on backgrounding; validated M3 background recording may continue across screen lock without inventing gap samples.
- Separate active time from wall-clock duration.

End result: Explicit idle/waiting/active/paused/interrupted/finished states with accurate statistics.

Dependencies: GPS, NAV.

Acceptance scenarios:

- **LIFE-01** (device): Given A fresh install with denied permission; when try to start; then show denial and permit browsing without recorded progress.
- **LIFE-02** (device): Given An active walk; when pause, background, return and resume; then in the foreground alpha, no background gap earns progress and resume starts a new segment; full background support is separately gated by BACKGROUND.
- **LIFE-03** (ui): Given An idle screen; when wait before explicitly starting; then no expedition time, discovery or XP accrues.
- **LIFE-04** (domain): Given The walk is idle; when submit a sample, then explicitly start and receive poor followed by usable GPS; then stay idle until start and start recording only on the usable sample.
- **LIFE-05** (domain): Given An active walk with about 11 metres recorded; when interrupt, wait, resume and receive a fix far away; then preserve distance, exclude interrupted time and begin a new display segment.

## STORE: Durable drafts and migrations

Owner: Ismar. Milestone: M1. Status: **planned**.

Goal: Protect an unfinished walk from app termination.

Rules:

- Persist samples incrementally.
- Finish and outbox insertion are atomic.
- Migrations preserve existing drafts; define mobile and browser support separately.

End result: Recoverable account-owned drafts and a durable completed expedition.

Dependencies: AUTH.

Acceptance scenarios:

- **STORE-01** (integration): Given A recorded active draft; when terminate the process and reopen; then offer recovery or explicit discard; recovery starts a fresh segment.
- **STORE-02** (integration): Given A draft during finish; when interrupt the local transaction; then recover either the draft or the complete queued expedition, never a half-finished record.
- **STORE-03** (integration): Given An existing database with pending work; when upgrade the schema; then preserve samples, account ownership and queue contents.
- **STORE-04** (integration): Given An account has a draft with a stored sample; when reopen SQLite, try a different account, then fail and retry finalization; then the owner retains the draft after the failed write and one pending result after retry, and the other account sees neither.

## ISOLATION: Local account isolation

Owner: Ismar. Milestone: M1. Status: **planned**.

Goal: Keep each player’s private data and queue separate.

Rules:

- Partition local data by account.
- Never submit under the wrong session.

End result: Switching accounts does not leak or lose another account’s data.

Dependencies: STORE, AUTH.

Acceptance scenarios:

- **ISOLATION-01** (integration): Given Account A has a pending walk; when sign out and enter account B; then B cannot read or submit A’s walk.
- **ISOLATION-02** (integration): Given A has preserved pending work; when sign back into A; then A can resume synchronization of the same expedition ID.

## FOG: Persistent personal discovery

Owner: Hanan. Milestone: M2. Status: **planned**.

Goal: Let players retain the world they have explored.

Rules:

- Use approved H3 traversal of valid segments.
- Separate pending discovery from confirmed discovery.
- Ownership changes never erase personal discovery.
- Record the captured-interior discovery policy before M4; first-discovery rewards remain separate from seasonal capture rewards.

End result: Persistent, account-specific revealed cells across restarts and devices.

Dependencies: GEO, STORE, GPS.

Acceptance scenarios:

- **FOG-01** (integration): Given A confirmed discovered cell; when restart or change its owner; then the cell remains personally discovered.
- **FOG-02** (integration): Given A weak fix or interrupted segment; when process the trace; then no intervening cells become discovered.
- **FOG-03** (integration): Given An already visited cell; when visit again; then do not count another first discovery.

## API: Validated expedition submission

Owner: Ismar. Milestone: M2. Status: **planned**.

Goal: Accept immutable authenticated traces within explicit limits.

Rules:

- Derive owner from auth; do not trust submitted XP/owners.
- Validate coordinates, order, time, segments, mode, rules version and payload limits.
- Define clock skew, rate limits and retryable versus terminal errors.
- Discovery-only submission and result lookup must work before territory capture is available.

End result: An authorized accepted payload or actionable rejection without reward.

Dependencies: AUTH, GEO.

Acceptance scenarios:

- **API-01** (integration): Given A payload claiming another user or fabricated rewards; when submit it; then deny impersonation and ignore/reject client reward authority.
- **API-02** (integration): Given Invalid, oversized, reordered or unsupported-version input; when submit it; then reject with a stable reason and no database effects.
- **API-03** (integration): Given An ID already submitted; when resubmit altered content; then reject the conflict without altering the original result.

## CAPTURE: Territory capture and preview

Owner: Hanan. Milestone: M4. Status: **planned**.

Goal: Convert eligible walking geometry into bounded territory.

Rules:

- Use approved closure, minimum distance, area and perimeter thresholds.
- Small simple loops may capture interior; large/open routes capture only the approved path band.
- Reject self-crossing interiors and gaps.
- Client previews remain provisional; zero capture is valid.

End result: Deterministic eligible cell sets and clear reasons, confirmed only by the server.

Dependencies: GEO, GPS.

Acceptance scenarios:

- **CAPTURE-01** (integration): Given A fixture within approved small-loop thresholds; when evaluate capture; then include the approved interior and route cells.
- **CAPTURE-02** (integration): Given A large or open-route fixture; when evaluate capture; then include only the approved path band.
- **CAPTURE-03** (integration): Given A self-crossing or interrupted loop; when evaluate capture; then do not capture the interior across crossings or gaps.
- **CAPTURE-04** (ui): Given An expedition with no eligible cells; when finish and preview; then show zero capture without inventing a failure or reward.

## CLAIM: Partial and concurrent takeover

Owner: Ismar. Milestone: M4. Status: **planned**.

Goal: Transfer only legitimately captured cells.

Rules:

- Finalize discovery, ownership, reward and result atomically.
- Lock contested cells in stable order; document commit ordering.

End result: Consistent cell-level ownership with no partial transactions.

Dependencies: CAPTURE, API.

Acceptance scenarios:

- **CLAIM-01** (integration): Given A foreign territory with ten cells and a capture of two; when finalize capture; then only those two change owner.
- **CLAIM-02** (integration): Given Two players capture overlapping cells concurrently; when commit both requests; then results obey documented ordering without deadlock-induced partial writes.
- **CLAIM-03** (integration): Given A failure during finalization; when roll back; then no discovery, ownership, XP or final result is partially committed.

## XP: Authoritative unique rewards

Owner: Ismar. Milestone: M2. Status: **planned**.

Goal: Reward confirmed first discoveries exactly once.

Rules:

- First-discovery identity is user + cell + reason, independent of expedition.
- Only authoritative expedition finalization updates confirmed totals. Discovery-only XP ships in M2 without capture; M4 extends that transaction with ownership.
- Profile level derives from the approved reward/level schedule.
- First-discovery base XP and uniqueness remain consistent per user/cell across all modes; mode-based activity/goal rewards are separate reward reasons.

End result: A durable ledger whose totals cannot be inflated by replay or concurrency.

Dependencies: API, FOG.

Acceptance scenarios:

- **XP-01** (integration): Given Two different expeditions for one user reveal the same new cell; when finalize concurrently; then award one first-discovery reward total.
- **XP-02** (integration): Given A finalized expedition; when submit its identical payload repeatedly; then return the same result without additional XP.
- **XP-03** (ui): Given A pending expedition; when view profile; then pending XP is separate from confirmed XP.
- **XP-04** (integration): Given A cell already rewarded during a walk; when revisit it during running and cycling; then grant no additional first-discovery reward in either mode.

## SYNC: Durable outbox and retry

Owner: Ismar. Milestone: M2. Status: **planned**.

Goal: Eventually deliver completed expeditions without duplicate effects.

Rules:

- Retry with bounded backoff under the original account and ID.
- Continue after summary closes.
- Preserve immutable payload; handle response loss, offline state and expired auth.

End result: Each queued walk reaches a visible confirmed or rejected state.

Dependencies: STORE, API, XP.

Acceptance scenarios:

- **SYNC-01** (integration): Given A walk finished offline; when restart, close summary, then reconnect; then submit persisted work and show its authoritative result.
- **SYNC-02** (integration): Given Server commits but its response is lost; when restart and retry; then recover one result and one reward.
- **SYNC-03** (integration): Given A terminal rejection; when run the worker again; then show reason without retrying forever or blocking unrelated valid entries.

## RECONCILE: Multi-device reconciliation

Owner: Hanan. Milestone: M2. Status: **planned**.

Goal: Display current server state without losing personal progress.

Rules:

- Use versioned snapshots or cursors with pagination and deletion handling.
- Stale caches cannot overwrite newer ownership.
- Rollback rejected provisional overlays.

End result: Two devices converge to the same confirmed discoveries, ownership and totals.

Dependencies: SYNC, FOG.

Acceptance scenarios:

- **RECONCILE-01** (integration): Given A second device with no local walks; when sign in and synchronize; then download existing confirmed discovery and XP.
- **RECONCILE-02** (integration): Given A stale ownership cache; when apply newer results then an older response; then retain newer ownership and permanent personal discovery.
- **RECONCILE-03** (ui): Given A rejected provisional claim; when reconcile the server result; then remove the claim preview without erasing confirmed discovery.

## PROFILE: Profile, history and summaries

Owner: Ismar. Milestone: M5. Status: **planned**.

Goal: Explain progress and every expedition outcome.

Rules:

- Validate profile edits.
- Show pending, accepted and rejected outcomes distinctly.
- History must paginate without duplicate or missing expeditions.
- Full profile adds server-confirmed coin balance, inventory/shop links, achievements and statistics; never merge pending rewards into spendable balance.
- Show the saved Walker, Runner or Cyclist specialization; allow free changes without resetting XP, wallet, inventory or history.

End result: Editable identity, confirmed level/XP and recoverable expedition history.

Dependencies: PROGRESS, WALLET.

Acceptance scenarios:

- **PROFILE-01** (ui): Given Confirmed and pending expeditions; when open profile and history; then show confirmed totals and separately labeled pending estimates.
- **PROFILE-02** (ui): Given A rejected result and an invalid display name; when open summary and save the edit; then show rejection reason and reject invalid profile input.

## PRIVACY: Server access control

Owner: Ismar. Milestone: M2. Status: **planned**.

Goal: Keep tracks, discovery and hidden ownership private.

Rules:

- RLS restricts private rows to their owner.
- Public territory projection is bounded and anonymous by default even outside personal fog; private routes, exact live location, identity links and activity media remain audience-controlled.
- Block direct reward/ownership writes; never ship server secrets.

End result: Two-user isolation verified against a real test backend.

Dependencies: AUTH, API.

Acceptance scenarios:

- **PRIVACY-01** (integration): Given Two users with different discoveries and private activity histories; when query tracks, discoveries, identity links and public territory as the other user; then deny private rows and unauthorized identity/media; permit only bounded anonymous territory outside fog.
- **PRIVACY-02** (integration): Given An authenticated client; when directly write XP or ownership; then database authorization rejects it.

## DELETE: Retention and account deletion

Owner: Ismar. Milestone: M9. Status: **planned**.

Goal: Let players remove private data with defined retention.

Rules:

- Define retention before production collection.
- Deletion clears local data and handles server references deliberately.
- Redact coordinates and credentials in routine logs.

End result: Documented, exercised removal of user data and expiration of retained tracks.

Dependencies: STORE, PRIVACY.

Acceptance scenarios:

- **DELETE-01** (integration): Given A player with tracks and queued work; when delete the account; then remove private data and local queue under the documented ownership/reference policy.
- **DELETE-02** (integration): Given Tracks older than the approved retention period; when run retention cleanup; then delete eligible tracks without corrupting retained reward totals.

## ACCESS: Safe and accessible interaction

Owner: Ismar. Milestone: M1. Status: **planned**.

Goal: Support understandable walking without unsafe attention demands.

Rules:

- Explain foreground location use and safe/private access boundaries.
- Use readable text, accessible labels and adequate targets.
- Do not promise safe/public routing.

End result: Core flows usable with a screen reader and without continuous map attention.

Dependencies: NAV.

Acceptance scenarios:

- **ACCESS-01** (device): Given A new player; when complete onboarding with a screen reader; then understand location use and safety; reach start/pause/finish controls.
- **ACCESS-02** (device): Given Large text or a narrow screen; when open all core screens; then essential text and actions remain readable and reachable.

## RELEASE: Operational release readiness

Owner: Ismar. Milestone: M9. Status: **planned**.

Goal: Ship a recoverable and measured mobile release.

Rules:

- Separate development/staging/production.
- Prove backup/restore and rollback.
- Measure long-walk memory, battery and responsiveness against recorded budgets.
- Disable reward-producing development controls.

End result: A reproducible release with recorded device evidence and recovery procedures.

Dependencies: STARTUP, SYNC, BACKGROUND, TERRITORY, ACTIVITY, PROFILE, WALLET, GOALS, COSMETIC, CHALLENGE, FEED, TEAM, COMPETITION, EVENT, NOTIFY, DELETE, ACCESS, CYCLING, SPECIALIZATION, MODE_REWARDS.

Acceptance scenarios:

- **RELEASE-01** (integration): Given A production build; when inspect configuration and developer controls; then no server secrets or reward-producing simulation controls are exposed.
- **RELEASE-02** (integration): Given A staging backup and failed deployment; when restore and roll back; then recover consistent data and executable service.
- **RELEASE-03** (device): Given The maximum supported expedition; when walk on supported physical devices; then meet documented budgets and retain the full durable track.

## CHALLENGE: Challenges and achievements

Owner: Hanan. Milestone: M5. Status: **planned**.

Goal: Recognize confirmed exploration milestones.

Rules:

- Derive completion from confirmed events.
- Version challenge definitions; prevent repeated unlocks.
- Achievements are permanent; daily/weekly objective windows and claims are specified by GOALS.

End result: Durable challenge progress and achievements.

Dependencies: XP.

Acceptance scenarios:

- **CHALLENGE-01** (integration): Given A completed challenge event; when replay it after restart; then award and unlock once.
- **CHALLENGE-02** (integration): Given A pending or rejected expedition; when evaluate challenge progress; then do not count it as confirmed completion.

## COSMETIC: Inventory and cosmetics

Owner: Ismar. Milestone: M5. Status: **planned**.

Goal: Let players personalize their character.

Rules:

- Persist earned unlocks across devices.
- Cosmetics do not silently modify movement/capture rules.
- No payments assumed.
- Price and availability come from server catalog; purchase debits and unlocks atomically with a stable idempotency key.

End result: Authorized inventory and persistent selected appearance.

Dependencies: PROFILE, WALLET.

Acceptance scenarios:

- **COSMETIC-01** (integration): Given An unlocked cosmetic; when equip then sign in on another device; then show the same selection.
- **COSMETIC-02** (integration): Given A locked item; when attempt to equip by API; then reject without changing gameplay or selection.

## CHEST: Exploration chests

Owner: Hanan. Milestone: M10. Status: **planned**.

Goal: Provide optional exploration rewards after MVP.

Rules:

- Define placement, eligibility and reward balance before implementation.
- Server verifies claim and grants each eligible reward once.
- Use explicit chest visibility policy separate from public territory; private chest eligibility never leaks through public board queries.

End result: Server-confirmed eligible chest rewards without replay farming.

Dependencies: XP, PRIVACY.

Acceptance scenarios:

- **CHEST-01** (integration): Given An eligible discovered chest; when claim concurrently twice; then grant one reward.
- **CHEST-02** (integration): Given A hidden or ineligible chest; when query or claim it; then do not disclose hidden placement or award a reward.

## TEAM: Teams and social privacy

Owner: Ismar. Milestone: M7. Status: **planned**.

Goal: Enable opt-in group play without exposing raw movement.

Rules:

- Authorize membership, invitations and roles.
- Define capture aggregation semantics before team ownership changes.
- Provide privacy settings, blocking/reporting and moderation.
- Display each member’s saved Walker, Runner or Cyclist specialization separately from Leader, Officer or Member permissions.
- Specialization changes update the guild badge and future defaults only; they never grant permissions or rewrite historical contributions.

End result: Consistent team views limited to authorized members and chosen visibility.

Dependencies: PRIVACY, CLAIM, FRIENDS, SPECIALIZATION.

Acceptance scenarios:

- **TEAM-01** (integration): Given A removed member; when request team-only data; then deny access and reconcile cached membership.
- **TEAM-02** (integration): Given A player who has not opted into social visibility; when view team maps or public APIs; then do not expose precise live location or raw traces.
- **TEAM-03** (integration): Given An abusive interaction; when block and report the sender; then enforce blocking and create a reviewable moderation report.
- **TEAM-04** (integration): Given A guild Member with Walker specialization; when switch specialization to Cyclist; then update the guild activity badge while permissions and recorded contributions remain unchanged.

## MODE: Walk, Run and Cycle activity selection

Owner: Hanan. Milestone: M3. Status: **planned**.

Goal: Choose a validated movement mode independently for each expedition.

Rules:

- Version walking, running and cycling validation independently; all three modes are required for full v1.
- Validate on physical devices; reject unknown modes.
- Before every start show Walk, Run and Cycle, defaulting to the saved specialization. A different choice changes this expedition only.
- Lock activity mode and rules version on start; v1 mode changes require finishing the expedition and starting another. No mid-session relabeling or implicit mixed-mode segments.
- Persist the chosen mode through pause, interruption, offline submission and retry. Reject conflicting mode changes under the same expedition ID.
- Selecting a mode is not proof of effort and never grants a reward multiplier on its own.

End result: Correct mode-specific progress without weakening walking checks.

Dependencies: GEO, API, SPECIALIZATION.

Acceptance scenarios:

- **MODE-01** (integration): Given A trace acceptable only for running under the approved running rules; when submit it first as walking then as running; then walking rejects disallowed movement and running uses its own approved rules.
- **MODE-02** (integration): Given An unsupported mode; when submit; then reject without rewards.
- **MODE-03** (ui): Given A player whose preferred specialization is Walker; when choose Cycle before starting; then record a cycling expedition while the saved specialization remains Walker.
- **MODE-04** (integration): Given A started Run expedition saved offline; when change mode in a retry payload under the same ID; then reject the conflicting payload without changing original mode or rewards.
- **MODE-05** (ui): Given A paused Run expedition; when resume or try changing mode; then resume as Run; require finish and a new expedition to switch.

## EVENT: Ownership-reset events

Owner: Ismar. Milestone: M8. Status: **planned**.

Goal: Refresh territory competition while preserving exploration.

Rules:

- Reset ownership, never personal discovery.
- Define event boundaries for pending work and retries.
- Preserve lifetime XP, wallet, cosmetics and historical activity snapshots.
- Seasonal recapture rewards use a separate capped identity including season; never re-award first-discovery XP after ownership reset.

End result: Deterministic reset outcomes and stable expedition results.

Dependencies: CLAIM, SYNC, COMPETITION.

Acceptance scenarios:

- **EVENT-01** (integration): Given A player with owned and discovered cells; when run the reset event twice; then clear affected ownership once and preserve discovery.
- **EVENT-02** (integration): Given A pending expedition spanning an event boundary; when submit and replay after the event; then apply documented event policy and return the same result on replay.

## STARTUP: Branded loading and map-first entry

Owner: Ismar. Milestone: M1. Status: **planned**.

Goal: Open into a useful map quickly without pretending that browsing starts an expedition.

Rules:

- Use the landing-page cream/navy/gold pixel-art style; respect reduced motion.
- No forced animation delay, permission loop or infinite network-dependent splash.
- Restore local active work before following deep links; first-time account/location requests are contextual.

End result: A restored map/home with clear preview, loading, offline and recovery states.

Dependencies: NAV.

Acceptance scenarios:

- **STARTUP-01** (ui): Given A returning player with cached state and slow network; when open the app; then show a usable map or labeled offline preview within D10 budget; no automatic recording.
- **STARTUP-02** (ui): Given Reduced motion and an interrupted activity; when launch from a notification; then show static loading, recover activity and safely open the linked detail.

## BACKGROUND: Screen-lock activity recording

Owner: Hanan. Milestone: M3. Status: **planned**.

Goal: Allow a real run with the phone in a pocket.

Rules:

- Only an explicitly active session records in background.
- Use supported native builds and platform permissions; foreground fallback is labeled.
- OS termination cannot be promised uninterrupted tracking; recover persisted work with explicit gaps.
- Screen-lock evidence must cover walking, running and cycling before full release.

End result: Measured walking/running recording through lock/unlock on the supported device matrix.

Dependencies: LIFE, STORE, MODE.

Acceptance scenarios:

- **BACKGROUND-01** (device): Given An active permitted native run; when lock for ten minutes, unlock and finish; then retain accepted samples and correct stats without duplicate segments or rewards.
- **BACKGROUND-02** (device): Given Background access is denied or revoked; when start or continue recording; then explain foreground-only/interrupted behavior and retain prior samples.
- **BACKGROUND-03** (device): Given OS terminates the app; when reopen; then recover persisted draft without connecting the missing interval.

## TERRITORY: Public territory map and detail

Owner: Hanan. Milestone: M4. Status: **planned**.

Goal: Show competition on the map without publishing private movement.

Rules:

- Separate personal fog from public game-board cells.
- Use anonymous ownership by default and explicit identity visibility.
- Filter mine/others/guild; limit viewport size and pagination.

End result: Current simplified captured areas with correct authorized detail.

Dependencies: CLAIM, PRIVACY, MAP.

Acceptance scenarios:

- **TERRITORY-01** (integration): Given An unexplored viewport containing foreign territory; when open the map; then show anonymous territory but no raw path, exact live marker or private identity.
- **TERRITORY-02** (ui): Given A newer takeover followed by a stale response; when refresh detail; then keep current version and correct own/foreign style.

## ACTIVITY: Personal capture cards and zone images

Owner: Ismar. Milestone: M4. Status: **planned**.

Goal: Make every completed activity understandable and reviewable.

Rules:

- Cards use confirmed capture geometry, area, duration, mode and reward result.
- Area is derived from the union of confirmed cells, not a bounding box.
- Preserve historical snapshots after later takeovers/reset; mark pending results clearly.
- Private by default; thumbnails cannot expose raw endpoints or bypass audience checks.

End result: A personal activity feed and detail with accurate zone image, area and time.

Dependencies: SYNC, CLAIM, PROGRESS.

Acceptance scenarios:

- **ACTIVITY-01** (integration): Given A confirmed irregular capture; when open its activity card; then image depicts the confirmed cell union with its area and active/elapsed duration clearly labeled.
- **ACTIVITY-02** (ui): Given That territory is later lost or reset; when open the old card; then preserve historical capture and label current ownership separately.
- **ACTIVITY-03** (integration): Given An unauthorized user with a private thumbnail URL; when request the image; then deny access, including after audience revocation.

## WALLET: Earned coins and wallet ledger

Owner: Ismar. Milestone: M5. Status: **planned**.

Goal: Provide a durable currency balance that cannot be duplicated or overspent.

Rules:

- Server-authoritative append-only transaction ledger with stable reward/purchase keys.
- Amounts are bounded nonnegative integers; balance never goes negative.
- No paid currency, trading or client-priced purchases in v1.

End result: Confirmed coin balance with auditable rewards/spending and safe concurrent transactions.

Dependencies: XP.

Acceptance scenarios:

- **WALLET-01** (integration): Given A reward event delivered twice; when apply it concurrently; then credit exactly once.
- **WALLET-02** (integration): Given Two purchases exceed the available balance together; when submit concurrently; then only affordable transactions succeed; balance remains nonnegative.
- **WALLET-03** (integration): Given A client proposes a cheaper price or negative amount; when purchase; then use server price or reject without changing balance/inventory.

## GOALS: Daily and weekly objectives

Owner: Hanan. Milestone: M5. Status: **planned**.

Goal: Offer repeatable goals with understandable XP/coin rewards.

Rules:

- Define server-time windows, timezone presentation, late-offline policy and eligibility.
- Use confirmed activity events only; reward once per user/objective/window.
- Show progress, completion, claimed state and time remaining; do not double-credit replays.
- Mode-specific distance/time targets use the confirmed expedition mode, not the player’s current specialization. Shared and mode-specific goals have explicit eligibility and caps.

End result: Daily/weekly goals that roll over predictably and grant each eligible reward once.

Dependencies: XP, WALLET, CHALLENGE.

Acceptance scenarios:

- **GOALS-01** (integration): Given One confirmed expedition meets two distinct objectives; when process and replay its event; then advance each eligible goal once and grant each reward once.
- **GOALS-02** (integration): Given A client changes timezone/clock across rollover; when claim rewards; then server windows prevent duplicate daily/weekly rewards.
- **GOALS-03** (integration): Given An offline expedition arrives after a goal cutoff; when submit; then apply the published late-arrival rule and explain eligibility.
- **GOALS-04** (integration): Given A running goal and a completed walking expedition; when change specialization to Runner and replay the event; then do not make the walking expedition eligible or grant another reward.

## FRIENDS: Friendship and social access

Owner: Ismar. Milestone: M6. Status: **planned**.

Goal: Let players intentionally connect and control access.

Rules:

- Explicit request/accept/remove/block lifecycle with server authorization.
- Blocked users lose social access and notifications; anonymous public territory remains public.
- Provide reporting and reviewable moderation; no chat required.

End result: A controlled friend graph usable by feed and notifications.

Dependencies: AUTH, PRIVACY.

Acceptance scenarios:

- **FRIENDS-01** (integration): Given A pending friend request; when try to fetch friend-only activity; then deny access until accepted.
- **FRIENDS-02** (integration): Given An accepted friend is removed or blocked; when query cached feed and image endpoints; then revoke social access and future relevant notifications.

## FEED: Friends activity feed and sharing

Owner: Ismar. Milestone: M6. Status: **planned**.

Goal: See friends’ captured areas without sharing raw movement by default.

Rules:

- Audience private/friends/public is explicit; private is default.
- Enforce audience on cards, media and pagination, not only UI.
- Show historical zone snapshots; no live tracking or raw route endpoints.

End result: A paginated own/friends feed with safe sharing and revocation.

Dependencies: ACTIVITY, FRIENDS.

Acceptance scenarios:

- **FEED-01** (integration): Given A private confirmed activity; when choose friends sharing; then authorized friends see its sanitized card and strangers cannot fetch it.
- **FEED-02** (integration): Given A post is unshared while its image is cached; when refresh or fetch again; then server revokes access according to the defined cache-expiry policy.
- **FEED-03** (integration): Given New events arrive during pagination; when load more; then avoid duplicate or missing stable card IDs.

## NOTIFY: Territory-loss alerts and event inbox

Owner: Ismar. Milestone: M6. Status: **planned**.

Goal: Inform players of important changes without duplicate or invasive alerts.

Rules:

- Persist inbox event with stable ID from committed server event outbox.
- Push is optional transport; retry delivery cannot repeat game effects.
- Preferences, quiet hours, token/account isolation, grouping and safe deep links are required.
- Reset events do not emit a per-cell territory-loss storm.

End result: An inbox and optional grouped push that opens current relevant detail.

Dependencies: CLAIM, FRIENDS.

Acceptance scenarios:

- **NOTIFY-01** (integration): Given Another player takes several adjacent owned cells in one expedition; when commit and retry event delivery; then create one grouped territory-loss event with no live attacker position.
- **NOTIFY-02** (integration): Given Push delivery fails and the user changes account; when retry sending; then retain inbox truth and do not send the old account’s alert to the new session.
- **NOTIFY-03** (ui): Given A player opens a loss alert during recording; when follow the deep link; then retain the active recording and show current territory.

## COMPETITION: Guild competitions and standings

Owner: Ismar. Milestone: M8. Status: **planned**.

Goal: Run scheduled fair competitions with understandable progress and rewards.

Rules:

- Server UTC schedule and published scoring, ties, eligibility, cutoff and offline rules.
- Snapshot roster/eligibility so switching guilds cannot transfer earned competition score.
- Use confirmed events; standings finalize once and rewards are idempotent.
- Publish mode-specific objectives or scoring normalization so walking remains a useful contribution alongside running/cycling.
- Record contribution mode when earned and snapshot competition eligibility under published rules. Free specialization changes never relabel scores, move categories retroactively or duplicate rewards.

End result: Upcoming/active/completed competitions, guild standings and archived results.

Dependencies: TEAM, NOTIFY, WALLET.

Acceptance scenarios:

- **COMPETITION-01** (integration): Given Two guilds capture overlapping territory during a scheduled event; when score and replay events; then use documented score/overlap rules without double counting.
- **COMPETITION-02** (integration): Given A member switches guild before finalization; when compute results; then apply the eligibility snapshot and prevent score transfer.
- **COMPETITION-03** (integration): Given The event closes with a tie and late offline submission; when finalize twice; then apply published tie/cutoff rules and pay rewards once.
- **COMPETITION-04** (integration): Given A scored walking contribution and a later specialization change; when change to Cyclist before finalization and replay the contribution; then retain the original mode/category and award once.

## CYCLING: Validated cycling gameplay

Owner: Hanan. Milestone: M3. Status: **planned**.

Goal: Deliver cycling as a balanced, physically validated full-release mode.

Rules:

- Do not advertise cycling as delivered until field tests and balance are accepted.
- Use independent mode limits and capture policy.
- Cycling is required for full v1, not an optional post-launch expansion. Larger travel reach must not automatically dominate capture or rewards.

End result: A validated cycling mode that does not weaken walking/running rules.

Dependencies: MODE, BACKGROUND, GEO.

Acceptance scenarios:

- **CYCLING-01** (integration): Given A cycling-speed trace; when submit under walking and cycling rules; then walking rejects it and cycling follows its approved policy.
- **CYCLING-02** (device): Given A permitted active cycling session on each supported reference device; when lock the screen, pause/resume, then finish a representative ride; then meet approved cycling recording/battery budgets and preserve chosen mode and accepted track.

## PROGRESS: Confirmed discovery progress and private history

Owner: Ismar. Milestone: M2. Status: **planned**.

Goal: Prove the complete walk-to-confirmed-XP loop before capture or economy.

Rules:

- Show confirmed XP and level using the approved versioned schedule.
- Pending rewards remain separate; account data is private and recoverable on a second device.
- Basic private history can exist without capture cards, coins or cosmetics.

End result: A durable confirmed profile total and private expedition result history.

Dependencies: AUTH, SYNC.

Acceptance scenarios:

- **PROGRESS-01** (integration): Given A walk finished offline and restored after restart; when reconnect and retry submission; then show one confirmed reward and one private expedition entry.
- **PROGRESS-02** (integration): Given Confirmed progress on one device; when sign in on a second device; then show the same confirmed XP and history without needing a new local walk.

## SPECIALIZATION: Changeable player and guild activity specialization

Owner: Ismar. Milestone: M3. Status: **planned**.

Goal: Express a preferred activity without restricting what the player can do.

Rules:

- Choose Walker, Runner or Cyclist at setup or in profile settings; Walker is the initial default if setup is skipped.
- Changing specialization is free and does not reset progress, currency, inventory or history. Persist it across devices.
- Use the preference to preselect the next activity mode, but allow any supported mode before starting.
- Guilds display this specialization separately from permission roles. An ongoing activity retains its original mode after preference changes.
- Specialization is descriptive, not an administrative permission, reward entitlement or retroactive competition category.

End result: A durable, freely changeable specialization displayed on profile and guild roster, with independent activity choice.

Dependencies: AUTH.

Acceptance scenarios:

- **SPECIALIZATION-01** (integration): Given A player with XP, coins, inventory and history; when change Walker to Runner then sign in on another device; then retain all progress and show Runner as the saved preference.
- **SPECIALIZATION-02** (integration): Given A running expedition is active; when change the saved specialization to Cyclist; then keep the current expedition Run and default the next expedition to Cycle.
- **SPECIALIZATION-03** (ui): Given A player without a chosen specialization; when open activity setup; then show Walk as the editable default without forcing onboarding.

## MODE_REWARDS: Effort-balanced mode rewards and capture limits

Owner: Hanan. Milestone: M5. Status: **planned**.

Goal: Keep walking, running and cycling rewarding without rewarding speed or role switching by itself.

Rules:

- Separate first-discovery XP from activity/goal/season rewards; first-discovery XP cannot be repeated by changing modes.
- Publish versioned mode-specific distance/time targets, eligibility, capture limits and reward caps after representative field tests. Do not invent production multipliers before evidence.
- Server recomputes eligibility from validated activity and immutable recorded mode/rules version; the saved specialization never determines historical rewards.
- Compare equal-duration representative walks, runs and rides against an approved fairness tolerance (D14). More distance must not automatically mean proportionally greater coins or guild score.
- Cycling capture limits are reviewed in M4; combined XP/coin/goal pacing is reviewed in M5 before economy release.
- Reject implausible traces under their selected mode; do not silently reclassify a rejected activity into a more lucrative one. GPS validation alone is not proof against all spoofing.

End result: Reviewed mode-specific progression and capture rules with reproducible fairness fixtures and no duplicate reward path.

Dependencies: MODE, CYCLING, XP, WALLET, CLAIM.

Acceptance scenarios:

- **MODE_REWARDS-01** (integration): Given Approved equal-duration walking, running and cycling fixtures and fairness tolerance; when calculate server-authoritative rewards; then stay within the approved normalized reward bounds and published caps.
- **MODE_REWARDS-02** (integration): Given A fixed recorded Walk activity and rules version; when change preference to Runner or Cyclist before submitting and retrying; then return the same Walk rewards exactly once.
- **MODE_REWARDS-03** (integration): Given A trace outside selected walking limits; when submit as Walk with a claimed bonus; then reject ineligible movement/bonus without auto-upgrading its mode.
- **MODE_REWARDS-04** (integration): Given A cycling capture exceeding its approved area or reward cap; when finalize and replay it; then enforce mode-specific capture/reward limits and return an unchanged final result.
