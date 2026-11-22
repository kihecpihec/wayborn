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
