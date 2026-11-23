# Wayborn — Your World, Your Adventure

A mobile exploration RPG that turns real-world walking into a pixel-art map,
personal discoveries, territory capture, and character progression.

Team: Ismar Mujezinović (@ismarM) owns app/data integration; Hanan Mešič
(@kihecpihec) owns GPS/maps/geographic rules. They review each other's changes.

## Start here

- [Project and scope](docs/01-project.md)
- [Scenarios](docs/02-scenarios.md) and [interactive mockup](docs/mockups/index.html)
- [Architecture](docs/03-architecture.md)
- [Full two-developer milestone plan](docs/08-development-roadmap.md)
- [Product flow and landing-page alignment](docs/09-product-experience.md)
- [Decision register](docs/decisions/README.md) and [delivery workflow](docs/testing/README.md)
- [Feature specifications and acceptance testing](docs/specifications/README.md)
- [Agent instructions](AGENTS.md)
- [Task assignments](docs/06-tasks.md), [submission checklist](docs/05-submission.md), and [validation record](docs/07-validation.md)

## Run

Node 22.13+ and npm:

```sh
cd prototype/map
npm ci
npm run web
```

For a phone use `npm start` and a compatible Expo Go or development build.
See the [Expo app README](prototype/map/README.md). Map tiles require internet;
browser GPS requires localhost or HTTPS.

## Baseline checks

```sh
python3 scripts/check_docs.py
python3 scripts/specifications.py
python3 scripts/check_baseline.py
python3 scripts/test_baseline.py
cd prototype/map
npm ci
npm run typecheck
npm run lint
npm test
npm run build:web
```

`npm test` includes specification acceptance tests. Planned scenarios are reported
as TODO, never as working functionality. CI fails for missing coverage of a feature
marked implemented. Existing renderer/unit tests remain useful secondary checks.

After sign-in, the Expo app opens into a browsable Map Home preview. The walking prototype is available
through a development flag. Foreground walks can be started from Map Home after
email/password sign-in. Native SQLite keeps account-owned drafts and a local
completion outbox; browser walks stay in memory. H3 gameplay persistence, capture,
confirmed rewards and backend synchronization remain planned. See the
[validation record](docs/07-validation.md) for hosted auth checks and outstanding
device evidence. Mockups use sample data; a green baseline does not mean the
finished MVP is available.
