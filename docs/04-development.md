# Development organization

Hanan Mešič (@kihecpihec) owns GPS, geography, maps and capture rules.
Ismar Mujezinović (@ismarM) owns navigation, accounts, storage, backend, economy,
synchronization and social/event integration. Each reviews the other's changes.
Repository administration remains with Hanan.

Follow [M0–M9 in the full roadmap](08-development-roadmap.md) and the
[integrated delivery workflow](testing/README.md). Build one shared playable outcome
at a time with two concurrent tasks, small reviewed PRs and frequent integration.
Real synchronization and database testing arrive in M2; device testing starts in M0/M1.

Task: specification/scenario IDs → reviewed contract/fixture → failing acceptance case
→ smallest implementation → applicable checks/device evidence → reviewed PR → shared
milestone demonstration. A passing mock or web export is not device/backend evidence.

Keep one active implementation task per developer. Agree shared interfaces and file
ownership first. P0 blocks the current milestone, P1 is important follow-up, P2 is
optional expansion. Decide dependencies through the milestone and decision registers,
not old umbrella issue dates. Forecast dates only after M0 spikes and observed M1/M2 pace.
