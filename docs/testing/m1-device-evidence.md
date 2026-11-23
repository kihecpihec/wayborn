# M1 physical-device evidence

Record what was actually observed on a phone. A browser test, a unit test or a
successful export is not device evidence. Leave a row as "Not yet reported" until the
tester reports it; never fill it in from expectations.

## Build under test

| Field | Value |
| --- | --- |
| Build | iOS development build `8871de65` (commit `fcd055f`) |
| JavaScript | Current `dev` through Metro: `npx expo start --dev-client --tunnel` |
| Backend | Hosted Supabase development project (`prototype/map/.env`) |
| Device | iPhone 13 Pro Max (owner) |
| iOS version | Not yet reported |
| Tester / date | Not yet reported |

## Checks

Use synthetic or sanitized routes; do not attach real tracks or exact home locations.

| Scenario | Steps | Result |
| --- | --- | --- |
| AUTH-01 | Create an account with an emailed code; close and reopen the app | Not yet reported |
| AUTH (keyboard) | Sign-up and sign-in fields stay visible above the keyboard | Not yet reported |
| AUTH (secure store) | Session survives a full app restart; sign-out returns to sign-in | Not yet reported |
| AUTH-02 | Wrong password message; walks stay on the device after sign-out | Not yet reported |
| STARTUP-01 | Reopen while signed in with poor or no network; map shows within 3 s, nothing records | Not yet reported |
| LIFE-01 | Fresh install, deny location at Start walk; denial message shown, map and tabs still usable, no walk listed | Not yet reported |
| LIFE-02 | Active walk: pause, background, return, resume; no gap distance, new segment | Not yet reported |
| ACCESS-01 | VoiceOver: location explanation is read; Start/Pause/Finish reachable and named | Not yet reported |
| ACCESS-02 | Largest text size and narrow layout: map controls and walk actions still reachable | Not yet reported |
| STORE-01 | Record a walk, force-quit, reopen; keep or discard the draft offered | Not yet reported |
| ISOLATION-01 | Sign out with a pending walk, sign in as a second account; the first account's walk is not shown | Not yet reported |
| GPS (poor signal) | Walk indoors or under cover; no distance from inaccurate fixes, signal-loss notice | Not yet reported |

When a row is reported, also note the rules version (D05 trial thresholds), the
observed result in the tester's words, any artifact location and limitations.
