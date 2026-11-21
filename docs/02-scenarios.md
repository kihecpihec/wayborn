# User scenarios and navigation

The normative flow is in [Product experience](09-product-experience.md); concrete
Given/When/Then cases live in [Feature specifications](specifications/FEATURES.md).

1. Open → bounded branded loading → restored Map home; preview if permission/fix is missing.
2. Browse own/other/guild territory → inspect authorized detail without starting recording.
3. Start Walk/Run/Cycle → contextual sign-in and permission checks → valid fix → active activity.
4. Pause/resume or recover interrupted work → finish confirmation → durable pending summary.
5. Reconnect → server validation → confirmed XP/coins/discovery/capture or explained rejection.
6. Review private Activity card with zone thumbnail, area and duration → optionally share.
7. Profile → level/wallet/achievements → cosmetics catalog → atomic purchase/equip.
8. Goals → daily/weekly progress/window → one-time eligible rewards.
9. Friends Activity → authorized cards → optional reporting/blocking.
10. Guild → membership/progress/map → competition schedule/standings → archived outcome.
11. Notification → current territory/event detail, preserving any active recording.
12. Season reset → new ownership competition without losing lifetime discovery or inventory.

Map, Activity, Guild, Goals and Profile are primary tabs. Notifications and shop are
secondary destinations. Empty states, denied permissions, revoked sessions, offline
operation and reduced motion are part of the behavior, not optional polish.

## Existing mockup and diagrams

[Clickable exploration mockup](mockups/index.html), [use-case diagram](diagrams/use-cases.svg)
and [navigation diagram](diagrams/navigation.svg) are historical exploration-alpha
artifacts. They simulate data and cover only a subset of the full plan; they are not
proof of current app functionality or the full v1 navigation. Their expansion is M1
screen design work. Do not implement the full social flow by treating these samples
as live services. The product experience/specifications take precedence.
