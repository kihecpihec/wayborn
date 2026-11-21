# Project definition and release scope

Wayborn is a map-first social exploration and territory RPG. Real walking and running
reveal personal geography, capture zones, earn XP/coins and contribute to guild play.
The player can review capture cards, share with friends, pursue goals and receive
territory-loss alerts. See the [full experience](09-product-experience.md).

## Delivery targets

- **M2 walking alpha:** real accounts, deliberately started foreground activity,
  durable H3 discovery, offline/restart recovery, authoritative discovery XP and profile
  totals. No capture dependency is required for this first complete loop.
- **M4 territory alpha:** validated walking/running/cycling and screen-lock support, territory
  capture/partial takeover, public anonymous territory and private historical zone cards.
- **M8 feature-complete beta:** coins/shop/cosmetics, achievements/daily/weekly goals,
  friends and sharing, alerts, guild progress/maps, competitions and ownership resets.
- **M9 full v1:** the entire requested experience passes device, backend, privacy,
  operational and playtest gates. Earlier alphas are not the finished requested app.

Current implementation remains a technical map/GPS demo and acceptance baseline.
Accounts, durable game storage, H3 gameplay and backend are not yet implemented.
New specifications and milestones describe authorized target behavior, not shipped code.

## Core rules

Use one approved H3 grid for discovery and ownership, with string IDs. Personal
exploration, current ownership and historical activity are separate concepts. The
server validates traces and commits final discoveries/rewards/ownership atomically.
First-discovery XP is once per user/cell; a map reset must not recreate that reward.

Public game-board cells can be viewed beyond personal fog. Raw routes, precise live
location and private identities remain protected. Sharing activities and identity is
explicit and audience-controlled. Explain public-territory exposure before competition.

Numeric rules, supported devices and limits are tracked in the
[decision register](decisions/README.md), with owners and milestone deadlines.
Foreground-only tracking is acceptable for the early alpha; full v1 must validate
screen-locked walking/running/cycling. Force-quit or OS termination creates recoverable gaps.

Chests are optional after v1; payments, trading, chat and live friend
tracking are not implicit scope. Preserve map-provider attribution and the landing
page's exploration-focused cream/navy/gold pixel-art style.
