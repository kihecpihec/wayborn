# M0 completion record

## Verified

- Baseline protection detects changed expectations, removals, and status downgrades.
- GPS fixtures cover jitter, poor accuracy, jumps, pauses, signal gaps and ordering.
- H3 resolutions 10 and 11 were compared with synthetic routes.
- Versioned sample indexing produces string IDs and handles antimeridian coordinates.
- A local Node process returns the same sample-rule result as the client-callable function.
- The user reports the app works on iPhone through Expo Go.

## Work still needed

| Item | Next action | Completion evidence |
| --- | --- | --- |
| Geographic coverage | User selected crossed cells. GEO-05 now verifies the segment trial; review resolution and supported latitude before persistence | Reviewed D02 rule and independent expected fixtures |
| Device inventory | iPhone 13 Pro Max confirmed. Exact iOS and Expo Go version pending. No Android phone available. | Named devices and build used |
| Foreground GPS spike | Run the procedure in the validation record | Observed denial, fix, poor-signal, pause/resume and background results |
| Screen-lock feasibility | Location-test profile and counters prepared. EAS signing/build and measured device run pending. | Actual lock/unlock recording result |
| Service bootstrap outline | Use the agreed Supabase Auth/PostgreSQL architecture for the M1 bootstrap | Reproducible setup when the service is introduced |

M0 is a preparation milestone. Full authenticated backend implementation belongs
to M1 and discovery finalization belongs to M2. The M0 parity result currently
covers the local sample-only rule. Later production parity must cover the final
accepted-track and coverage rules.

Trial walking thresholds remain 50 m accuracy, 3 m jitter, 4 m/s speed and a
15 s continuity limit under D05. D10 records the trial performance budgets.
Changing these values requires a versioned decision and fixture update.

The current phone build supports foreground recording. The screen-lock spike
will determine the native implementation path for M3. Its result must be recorded
even if background recording is unavailable on a tested configuration.

## M1 handoff: account entry (22 November 2026)

Done and tested locally against a Supabase stack on the developer machine:
required sign-in/sign-up, email-code verification, password recovery, private
`profiles` table with row-level security, secure session storage, sign-out, and the
landing-page styled entry screens (see [accounts](accounts.md)). AUTH-01, AUTH-03
and AUTH-04 run in a real browser against the local service. AUTH-02 (invalid
credentials, expired session, pending work preserved) remains planned.

Not done: Google sign-in (plan: hosted dev Supabase project, Google web OAuth
client, `wayborn-field-demo://auth/callback`), a hosted development backend, the
account-partitioned storage check (STORE/ISOLATION), and the server-side expedition
API. The keyboard layout on the iPhone sign-up screen and a development build with
`expo-secure-store` still need physical-device confirmation. CI starts the local
backend, but this workflow has not run remotely yet.

Contract changes: AUTH-04 added (change record 0009). `app.json` slug is now
`wayborn-field-demo` with a URL scheme, EAS owner and project ID. Next task:
account-partitioned storage and server-derived identity for expeditions (M1).
