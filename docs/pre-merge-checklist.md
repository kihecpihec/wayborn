# M1 worktree handoff and merge checklist

Date: 23 November 2026. Branch: `t3/ddf88be8`; intended PR base: `dev`.
This is a development slice, not a claim that M1 is complete.

## Scope and contracts

Continue M1 storage and account integration: authenticated account identity scopes
native SQLite rows, unfinished drafts and pending walks. Carry over multi-walk
Activity/navigation coverage and map-loading fixes. Document hosted authentication
email configuration. Ismar owns integration; Hanan reviews the GPS/map boundary.

Dependencies are the merged account shell and SQLite schema 001 already on `dev`.
Expected behavior: account B cannot read account A's pending work; reopening SQLite
retains the owner's drafts; failed writes do not publish an incomplete expedition.
The app must explain unavailable browser persistence and retain provider attribution.

Owned implementation areas in this worktree include AccountContext/AccountGate,
WalkSession/useAccountWalks/walkRecorder/walkDatabase, Activity/Profile, auth errors,
walkStorage, foregroundWalk, mapDocument/tileEngine, acceptance/UI tests, and EAS
development configuration. Shared specification files add NAV-04/NAV-05; review
change record `0010-navigation-browser-coverage.json`. No scenario was removed or
marked implemented. Do not recalculate or weaken the existing expected results.

For the other developer: identity comes from AccountProvider's signed-in user ID;
native walk storage is account-scoped. No expedition submission or server reward
contract is introduced. Browser walks remain in memory. A pending row is a local
outbox entry, not server-confirmed progress. SQLite remains schema version 1.

## Automated verification

The separate validation record contains final test counts and executed commands.
The branch started from fetched `origin/dev` at `6e2e53e`; PR #16's
documentation and map-prototype checks were successful.

Run UI suites sequentially with `npm test`: acceptance handlers start Playwright
on port 8093. Starting `npm run test:ui` concurrently causes a port conflict. The
sequential standalone run passed all nine UI tests.

A new STORE-02 fault-injection adapter uses real SQLite. Before the fix, a failed
sample insert still produced a pending walk, despite its incomplete saved track.
After the fix, later writes for that walk stop, the durable prefix stays a draft,
and a subsequent independent walk can finish. Reopening and explicitly recovering
the failed draft queues only its recorded prefix. This is write-failure/reopen
evidence, not a native OS-kill experiment or complete STORE milestone acceptance.

## Resolved storage integration findings

- Native recording is gated on successful database opening and initial reads;
  browser recording remains explicitly in memory.
- Finish pauses recording and waits for all accepted samples and the outbox write
  before adding a completed Activity summary. Failure leaves the walk retryable;
  queued operations are retained in memory until retry succeeds.
- Initialization, recovery, discard and list-read failures have retry/error states.
  Failed list reads do not undo a successful save or block the next walk.
- Write transactions are serialized across accounts on the shared SQLite connection.
- Rejected GPS jumps are excluded from accepted samples; subsequent accepted fixes
  start a separate segment. Native UUID generation uses SDK-compatible expo-crypto.
- Six new real-SQLite regression tests cover initialization gating, recovery errors,
  delayed completion, retry without sample loss, rejected jumps, concurrent discard
  and list-read recovery. NAV-03 now has a browser adapter for paused continuity.

## Hosted backend and email evidence

Neoserv DNS, verified Resend sending domain, Supabase SMTP and code templates are
configured. The exact repository private-profile migration was previewed and
applied through the linked CLI; hosted/local histories match at `202611220001`.
`supabase db lint --linked` found no schema errors.

The explicit hosted account script verified profile creation, two real authenticated
sessions, own-profile visibility, cross-account isolation, anonymous denial and
client-write denial. Its synthetic users and profiles were cleaned up and verified.
No grant was broadened to make the test pass: service_role lacks SELECT on this
private table, so cleanup was checked through the linked database.

The desktop web app was connected to the hosted backend. A temporary mailbox on
ismarr.eu received both signup and recovery emails through Resend SMTP. Registration
verified the delivered code and private profile. Recovery rejected an incorrect code,
accepted the valid code, rejected the old password and accepted the new password.
Resend marked both messages delivered. The temporary test account and mailbox were
removed. Code expiry timing and physical-device behavior remain untested.

See [authentication email setup](auth-email-setup.md) for repeatable instructions.
SMTP credentials, codes and session tokens were not committed or put in evidence.
Google sign-in remains disabled and outside this storage/email development slice.

## Physical-device gates

Build/install the iOS `development` profile with the hosted public configuration.
On the iPhone 13 Pro Max, record exact OS/build and test signup keyboard layout,
code entry, recovery, secure session restoration, sign-out, account switching,
offline finish and restart recovery. Include permission denial, weak GPS,
pause/resume and background/foreground gaps. Validate that no gap adds progress.
An Expo Go launch or desktop SQLite test does not prove native persistence.

STORE-03 schema-upgrade coverage and the remaining planned M1 scenarios stay open.
Google OAuth and M2 server-derived expedition identity/sync remain separate work;
do not require M2 completion for a correctly scoped M1 development PR.

## Publication sequence

1. Run the final applicable checks for the scoped development slice.
2. Review the staged diff, including every intended new file. Exclude generated
   browser reports, credentials and unrelated work. Review specification snapshots
   and their exact change record separately from implementation.
3. Commit and push the scoped branch; open a PR against `dev` with behavior,
   contracts, migrations, test evidence and explicit device/hosted limitations.
4. Get Hanan's peer review and green CI for the actual pushed commit. Review the
   added NAV cases; do not treat handler registration alone as meaningful coverage.
5. Merge only the reviewed commit, test the integrated result and update milestone
   evidence. Do not mark M1 complete while its required gates remain open.

Publication and remote CI status are recorded in the PR. Peer review and required
physical-device evidence are still merge gates; a green desktop baseline alone
does not authorize declaring M1 complete.
