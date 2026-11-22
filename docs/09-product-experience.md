# Product experience and landing-page alignment

This is the full product direction requested on 21 November 2026. It supersedes the
older exploration-only MVP scope. It describes the target, not delivered functionality.

## The player's journey

1. **Open:** a brief branded pixel-art loading transition restores the session and
   local state. No artificial minimum delay. Reduced-motion users get a static
   version. Slow networks must not trap the player behind a splash screen.
   Players without a restored session sign in or create and verify an account before entering any tab.
2. **Map home:** show the player's location after permission and a valid fix; show
   a labeled preview otherwise. Show nearby confirmed territory, including other
   players' and guilds' territory. Personal exploration fog remains a separate layer.
   Start is prominent; browsing never starts a recording or earns rewards.
3. **Start activity:** returning authenticated players choose Walk, Run or Cycle and start
   immediately when prerequisites are met. First use asks for location permission when recording starts. Do not put repeated onboarding between player and activity.
4. **Record:** distance, active time, trail, discoveries and provisional captures update.
   Pause/resume, permission loss, poor signal, app interruptions and offline recording
   have explicit states. Full-release runs support screen locking after native validation.
5. **Finish:** review elapsed/active time, distance, newly discovered and captured area,
   a map image of the captured zone, and estimated rewards. Persist before leaving.
   Server confirmation supplies final XP, coins and ownership; retries never multiply them.
6. **Activity home/feed:** the Map is the default opening screen. A Home/Activity tab
   shows the player's expedition cards and friends' voluntarily shared captures. Each
   card includes zone thumbnail, confirmed area in m²/ha, duration, date, mode and result.
   Cards are historical snapshots; losing territory later does not rewrite the old card.
7. **Profile:** confirmed XP/level, coin balance, character appearance, achievements,
   personal statistics, owned cosmetics, shop, settings, privacy and account deletion.
8. **Guild:** membership, progress, contribution totals, current territory map filter,
   competition schedule/countdown, rules, current standings and archived results.
9. **Goals:** daily and weekly objectives, progress, remaining time, XP/coin rewards,
   and claim status. Achievements recognize longer-term milestones.
10. **Notifications:** in-app inbox and optional push for territory loss, competitions,
    goal events and relevant social activity. Open the corresponding current detail.
    A notification is a persisted event, not the source of ownership truth.
11. **Season/reset:** clear schedule and timezone-aware countdown. Reset seasonal
    ownership and standings, retain lifetime exploration, XP, cosmetics and history.
    New-season capture rewards must use their own capped policy; discovery XP is not
    awarded again merely because the ownership map reset.

## Navigation and screen ownership

Five main destinations: **Map**, **Activity**, **Guild**, **Goals**, **Profile**.
Notifications open from a shared inbox button; shop opens from Profile. Keep an
active-activity banner accessible across tabs. Territory details, activity detail,
finish confirmation and permission dialogs are secondary routes. Restore active
recordings before processing deep links; a notification must not discard a walk.

Hanan owns the map, geographic overlays, tracking and capture previews. Ismar owns
the shell, feed, profile, economy, guild workflows and event integration. Both own
integrated behavior and accessibility. Empty guild/friends/activity states need useful
next actions, not fabricated content or errors. Large text and reduced motion are required.

## Public territory versus private movement

The old rule hiding all foreign ownership behind personal fog conflicts with this
vision. Replace it with **public game territory, private movement**:

- Return bounded, simplified current territory cells and owner type (player/guild)
  even outside personal discovery. Keep fog from hiding this strategic overlay.
- By default public cells are anonymous at the identity layer. Public display names,
  guild labels and profile links follow an explicit visibility policy; never infer
  the right to publish a player's identity from a capture.
- Raw routes, exact live position, starting/ending points and precise capture timestamps
  are not public. Territory itself reveals areas of activity: explain that tradeoff
  before competitive participation. Do not promise that territory discloses nothing.
- Personal activity records are private by default. Friends/public posts require an
  explicit audience. Generate thumbnails from confirmed territory geometry, not raw
  route endpoints; server-side audience enforcement applies to images as well as JSON.
- Blocking removes social access and notifications; it does not erase public anonymous
  board state. Private profile/route APIs remain isolated. Anonymous browsing must be
  bounded, rate-limited and not offer an unrestricted identity/location export.

## Landing-page review

Source: [wayborn.app](https://wayborn.app/#questions), fetched on 21 November 2026.
The current page presents pixel-art real geography, personal fog and discovery XP.
Its FAQ describes multiple movement modes, optional sharing and no exact-location
visibility. Its map section describes foreground GPS. The live page is marketing,
not proof of implemented capabilities. No external landing-page edits were made.

The brand fits: calm exploration, cream (#f3f4ee), navy (#16243e), gold (#FFC83D),
pixel-art geography, friendly rounded presentation and clear movement statistics.
Keep these foundations. Add restrained guild colors, patterns/icons for ownership,
and distinct pending/confirmed treatments. Avoid turning the map into an unreadable
collection of reward badges; use bottom sheets and detail routes for complexity.

Required copy changes before full launch:

- Explain territory capture, friends, guilds, seasonal competition and cosmetics.
- Replace the implication that sharing is the only public geographic information:
  public territory is visible, while identity/activity sharing is controlled.
- State exactly which movement modes and background behavior are released. Walking,
  running and cycling are full-release requirements with separate validation.
- Do not describe a reset as losing lifetime discovery. Explain seasonal ownership.
- Keep exploration and welcoming language central; competitive activity is optional.

## Scope boundaries

**M2 playable alpha** proves durable walking and discovery rewards without capture.
**M4 territory alpha** adds capture and useful activity cards.
**M8 feature-complete beta** includes the requested economy, social/guild flows,
competitions, resets, goals and notifications. **M9 full v1** requires release evidence.
These are intermediate labels, not permission to call the early alpha the finished app.
Paid currency, trading, chat and live friend tracking are not implicit additions. Cycling is required for full v1.


## Activity specialization, mode and rewards

Players choose **Walker**, **Runner** or **Cyclist** as a saved profile specialization.
They can change it freely without spending coins or resetting progress. If skipped,
Walker is the editable default. Guild rosters display that badge separately from
**Leader**, **Officer** or **Member** permissions; specialization grants no authority.

Before every expedition, show **Walk**, **Run** and **Cycle** with the saved preference
preselected. A Walker can choose Cycle for one activity without changing their profile.
Lock the activity mode and rules version on start. In v1, switching requires finishing
and starting another activity; pause/resume, preference edits and offline retries must
not relabel it. Historical cards show the activity's recorded mode, not today's preference.

Use equal first-discovery base XP per eligible new cell across modes, awarded once per
user/cell. Separate activity/goal rewards may have mode-specific distance/time targets
and caps. Evaluate representative equal-duration walks, runs and rides against a
reviewed fairness tolerance before setting production amounts. Selecting Run alone
never awards a bonus. Cycling's larger reach needs explicit capture limits and balanced
coin/guild scoring so walking remains useful. The server validates eligibility and
never silently changes an invalid activity into a more rewarding mode.

Guild objectives may target different modes. Contributions retain the mode recorded
when earned, and published competition eligibility rules prevent specialization changes
from moving historical scores or duplicating rewards. D13 defines these product rules;
D14 owns the remaining numeric balance decisions. All three modes are full-v1 scope.
