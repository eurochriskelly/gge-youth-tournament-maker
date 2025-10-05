# Repository Guidelines

## Project Structure & Module Organization
The CLI lives in `src/index.js`, which handles argument parsing, TSV loading, and report generation. Tournament inputs sit under `data/<yyy-mm>` as tab-delimited exports from clubs; add new folders to test fresh tournaments. Documentation artifacts and planning notes belong in `docs/`. Generated output prints to stdout, so keep `node_modules/` and `package-lock.json` committed to capture dependency state.

## Build, Test, and Development Commands
Run `npm install` once per environment to install dependencies. Use `npm start -- --data 2025-02` (or another folder) for an interactive dry run, and append `--groups u17/4,g16/3,...` to scope columns. `npm run test` executes the bundled sample data check (`node src/index.js --data 2025-02 --groups ...`) and is the minimum smoke test before commits. Prefer `node src/index.js --data <folder> --raw` when auditing unadjusted numbers.

## Coding Style & Naming Conventions
Match the existing Node style: two-space indentation, single quotes for strings, and descriptive constant names in `UPPER_SNAKE_CASE` when values never change. Keep modules free of implicit globals and favor small helper functions with JSDoc-style parameter notes when logic grows. Follow import order: built-ins (e.g., `fs`, `path`), then third-party (`minimist`), then local modules.

## Testing Guidelines
There is no separate unit-test harness; the CLI output is the primary verification channel. Before opening a PR, run `npm run test` plus at least one scenario per new data folder you touched (e.g., `node src/index.js --data 2025-03 --groups u14/3,u12/3`). Confirm the age breakdown and competition tables reflect your expected adjustments and that raw mode still renders.

## Commit & Pull Request Guidelines
The history follows a conventional `type: short summary` pattern (`feat:`, `fix:`, `doc:`). Keep commit messages imperative, referencing the feature or fix succinctly. Pull requests should describe the change, list affected data folders, and call out any new flags or assumptions. When UI-facing output changes, attach trimmed CLI snippets demonstrating the before/after tables.

## Data & Configuration Notes
Incoming TSV rows must match `id\tstatus\tname\tbirth_year\tposition` (plus optional competition columns). Validate that confirmed players use `x`, birth years fall between 2008 and 2022, and girls have a non-empty marker. Store secure or private exports outside the repo and reference them via redacted samples in `data/` when documenting issues.
