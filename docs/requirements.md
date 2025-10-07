# Requirements for GGE Youth Tournament Analyzer

## Purpose
The CLI at `src/index.js` ingests club exports under `data/<yyyy-mm>` and produces tables that show whether each age category has enough confirmed players. All output is written to stdout; there is no database or cached state.

## Input Model
- Each data folder must contain one `*.tsv` per club (UTF-8, tab-delimited). Files with other extensions are ignored.
- Rows may start with a numeric player ID; otherwise the first column is the confirmation flag. Only rows where the confirmation column is exactly `x` are processed.
- Expected columns after optional ID: confirmation, player name, birth year, girl marker, age bracket, then one competition column per category defined in the active group configuration.
- Birth years outside 2008–2022 are skipped. Any non-empty girl marker counts the player as a girl. Position hints in parentheses are stripped from names but the original age bracket column is preserved.
- Missing competition columns are padded with `#` unless `--debug` is enabled (debug mode keeps the raw column list untouched).

## Group Configuration and Flags
- `--data <folder>` is required. The CLI exits with usage help if it is missing.
- `--groups cat/count,…` is optional. Categories start with `u` (mixed) or `g` (girls-only) followed by the oldest age (e.g. `u17`). `count` represents how many consecutive birth years belong to that category. When no groups are passed the tool defaults to `u17/4,g16/3,g14/4,u14/3,u12/3,u10/3,u8/3,u6/3`.
- Competition symbols in each row are read in the order the categories are declared. Symbols are interpreted per computed age category (e.g. `u13`) when scoring statistics.
- `--raw` counts every confirmed player without applying competition symbols. `--debug` returns a JSON dump (`{ statistics, clubData }`) and suppresses table formatting.

## Counting Rules
- Age categories are calculated as `u${2025 - birthYear}`. Age ranges are generated for every 1–4 year span within 2008–2022.
- In normal mode symbols modify participation: `#` and `@` exclude the player, `/` records a removal, `!` adds an extra participation, and single capital letters transfer the player to the club whose code matches that letter (loans). Any other value or blank counts as a normal appearance.
- Club codes in reports are derived from the first character of each club name (upper-cased). Keep club names distinct by initial to avoid collisions in tables.

## Output
- The tool always logs the source folder, the number of confirmed players, an age breakdown sorted from oldest to youngest, and the active group filter (if any).
- Without `--debug`, three sections are printed:
  - **Combined Table** shows mixed categories. When no explicit groups are provided, age ranges with fewer than 13 participants are suppressed.
  - **Girls-Only Table** mirrors the combined table but only includes girls counts (categories beginning with `g` when grouped).
  - **Amalgamated Teams Table** lists each club’s net players per category along with adjustment hints (`+!`, `-/`, loan codes).
- Counts display adjustment details and raw totals, for example `12(14,+1!, -1/)` for totals or `5(6L,-1/)` for club columns.

## Errors and Edge Handling
- Missing data folders or unreadable files cause an immediate exit with a descriptive message.
- Rows with too few columns, invalid birth years, or missing confirmation flags are skipped silently.
- Invalid or unknown competition symbols are treated as normal participation after padding.

## Dependencies & Tooling
- Runtime only depends on Node.js built-ins plus `minimist`. Install dependencies once with `npm install`.
- `npm start -- --data <folder>` runs the CLI manually; `npm run test` executes the bundled smoke scenario (`--data 2025-02` with the default groups).
