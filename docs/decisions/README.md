# Product and engineering decision register

A deadline is a milestone entry/exit gate until the team agrees calendar dates.
`Accepted direction` comes from the user's requested flow. `Trial` values permit
repeatable development tests, not a claim of validated production balance. Record
measured evidence, final value, rules version and reviewer before closing a decision.
A blocked dependent feature must not silently invent its own constants.

| ID | Decision and current direction | Owner / review | Deadline | Evidence required |
| --- | --- | --- | --- | --- |
| D01 | Accepted direction: map-first launch, foreground walking alpha; full v1 walking/running/cycling while screen locked. Force-quit is interrupted/recoverable, not uninterrupted tracking. | Hanan / Ismar | Spike M0; release support frozen before M3 exit | Actual iOS and Android devices, lock/permission/termination traces, battery measurements |
| D02 | Trial: compare H3 resolutions 10 and 11; choose one for both discovery and ownership. Define cell intersection/coverage, boundary inclusion, supported geography and projection. | Hanan / Ismar | Before M2 H3 persistence | Dense streets, park loop, boundary and high-latitude/antimeridian fixtures; no stored approximate demo keys |
| D03 | Trial capture thresholds from original design: 25 m closure, 150 m minimum path, 1 ha interior, 1 km perimeter; reject self-crossing interiors. Decide whether eligible interior becomes discovered. Suggested default: only visited cells yield discovery XP; capture is separate. | Hanan / Ismar | Before M4 capture code | Small/large/open/interrupted loops and privacy-consistent map previews |
| D04 | Accepted direction: anonymous public territory outside fog; private tracks/live positions; opt-in identities and activity sharing. Decide public update cadence and spatial precision. | Ismar / Hanan | Before M4 public API | Two-user access tests, rate/viewport limits, privacy walkthrough and identity/image audit |
| D05 | Trial: retain demo walking thresholds (50 m accuracy, 3 m jitter, 4 m/s speed), break accepted-sample continuity after more than 15 s. Running/cycling need separate versions; define wall-clock freshness and quarantine after jumps. | Hanan / Ismar | Walking before M2; running/cycling before M3 | Controlled route replay + real device traces, clock skew, long silence and recovery |
| D06 | Trial: 2-hour activities, up to 10,000 samples and 2 MB encoded payload per expedition; reject/explain limits before losing work. Decide chunking if measured traces exceed these bounds. | Ismar / Hanan | Before M2 submission | Real payload sizes; boundary/oversize tests, crash-safe finish and one maximum-length route |
| D07 | Trial: first-discovery XP once per user/cell; level schedule versioned. Earned coins only; purchases server-priced and atomic. Define coin sources/sinks, goal/season caps and late offline reward policy. | Ismar / Hanan | XP before M2; economy before M5 | Ledger/replay/concurrency tests; playtest progression pacing and abuse cases |
| D08 | Trial: one guild per player; individual cell ownership persists, current guild area is a union of current members' cells. Competition roster/contributions snapshot at event start; switching does not move earned competition score. | Ismar / Hanan | Before M7 | Join/leave/remove/overlap fixtures; define all exceptions and eligibility cooldown |
| D09 | Trial: schedules stored UTC and displayed in device timezone; server receipt time determines competition eligibility. No retroactive score from late offline activity; crossing activities need an explicit split/attribution rule. Daily/weekly goal windows and reset cadence must be published. | Ismar / Hanan | Goals before M5; events before M8 | DST/timezone/clock-skew/cutoff/tie cases, offline UX and scheduler retry rehearsal |
| D10 | Trial device budgets: cached map usable within 3 s after launch, local pause feedback within 200 ms, crash loses at most 5 s of accepted samples; two-hour screen-lock session adds at most 10 battery percentage points over idle, with no monotonic memory growth. Measure before promising. | Hanan / Ismar | Initial measurement M1; approved budgets M3 | Named reference devices/OS/build, cold/warm starts and matched idle measurement |
| D11 | Native iOS/Android are target products; web remains demo/inspection until a browser persistence and permission strategy passes the same recovery tests. Select one physical reference device per platform available to the team. | Ismar / Hanan | Before M1 implementation | Device inventory, native development build, documented supported OS range and CI tooling |
| D12 | Decide raw-track retention, deletion completion window, sanitized card/image retention, backup expiry and restore restrictions. No production collection until documented. Use synthetic data in dev/CI. | Ismar / Hanan | Before external beta data collection | Deletion/retention tests and backup/restore drill; document handling of public territory references |
| D13 | Accepted direction: free changeable Walker/Runner/Cyclist preference, displayed in guild separately from permissions. Choose Walk/Run/Cycle at every start; lock recorded mode; v1 switches by finishing and starting a new activity. No retroactive reward/score changes. | Ismar / Hanan | Preference/mode selection M3; guild display M7 | Cross-device preference, independent mode choice, unchanged permissions and immutable offline/retry payload tests |
| D14 | Open numeric balance: equal base first-discovery XP per eligible cell across modes; separate effort-balanced activity/goal rewards, cycling capture limits and mode-aware guild objectives. Define representative equal-duration fixtures, fairness tolerance, caps and exploit checks before formulas ship. No automatic multiplier merely for selecting a mode. | Hanan / Ismar | Mode limits M3; capture caps M4; rewards M5; competition scoring M8 | Representative walks/runs/rides, reviewed expected reward ranges, caps/replay tests and guild contribution playtests |

## Decision record format

ID; status (open/trial/accepted/superseded); concrete rule; alternatives and reason;
owner; reviewer; effective rules/schema version; supporting scenario IDs and evidence;
impact on old clients/pending expeditions; rollback or migration; milestone deadline.
Do not fill reviewer/evidence with invented approvals or unperformed device tests.

The product direction is accepted; numeric trial settings and policy details above
remain open until reviewed. Missing background support is a release blocker for full
v1, not permission to quietly narrow the user's requested product.

### D02 sample indexing trial

Status is trial. `h3-samples-v1` uses H3 resolution 11 for already accepted GPS
samples in WGS84 decimal degrees. H3 assigns boundary points to a cell. Both sides
of the antimeridian and high latitudes are valid for point indexing. The function
returns unique string IDs in first-seen order. Invalid coordinates and unknown
versions cause explicit rejection without returning partial results.

Resolution 11 distinguishes more cells on the synthetic street and park routes
than resolution 10. This contract indexes only observed positions. It does not
infer path intersections between samples, bridge gaps, project polygons, or
claim captured interiors. GEO-03 and GEO-04 cover sample indexing. Final
resolution, coverage, and client/server parity need Hanan and Ismar review
before M2 persistence. No stored gameplay uses this trial version, so changing the
version during evaluation requires no data migration.
