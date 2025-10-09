# Agent Guidelines for GGE Youth Tournament Maker

## Build/Test Commands
- Install: `npm install`
- Run tests: `npm test` (runs core smoke scenario with sample data)
- Run single test: `node src/index.js --data <folder> --groups <group_definitions>` (e.g., `--data 2025-02 --groups u17/4,g16/3`)
- Audit raw numbers: `node src/index.js --data <folder> --raw`
- Debug mode: `node src/index.js --data <folder> --debug`

## Code Style Guidelines
- **Modules**: Use CommonJS (`require()`), not ES modules
- **Formatting**: 2-space indentation, single quotes, no semicolons
- **Naming**: camelCase for variables/functions, UPPER_SNAKE_CASE for constants
- **Functions**: camelCase, documented with concise JSDoc parameter notes
- **Imports**: Order - built-ins (`fs`, `path`), third-party (`minimist`), then local modules
- **Error Handling**: Explicit error checking, avoid implicit globals
- **Logic**: Break complex operations into documented helper functions
- **Types**: No TypeScript - use JSDoc for type hints when needed

## Testing Guidelines
CLI output is the test surface. After changes, run `npm test` and manually verify at least one scenario per modified data folder. Confirm age breakdowns, competition tables, and raw mode outputs match expectations. Document discrepancies in `docs/` or code comments.

## Commit Guidelines
Use conventional commits (e.g., `feat: add february groups`, `fix: correct g16 seed order`). Group related changes per commit with imperative summaries. Pull requests must include affected data folders, new flags/assumptions, and trimmed CLI output examples.
