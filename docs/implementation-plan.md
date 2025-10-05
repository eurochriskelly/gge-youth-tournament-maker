# Implementation Plan for GGE Youth Tournament Analyzer

## Overview
This plan outlines the steps to implement the GGE Youth Tournament Analyzer based on the requirements in `docs/requirements.txt`. The goal is to create a Node.js application that parses TSV data from clubs, calculates statistics with adjustments, and outputs tables for player distribution and team formation.

The plan is divided into phases: Setup, Parsing, Statistics, Output, and Testing. Each phase includes specific tasks, files to modify, and verification steps. A new coding session can execute this plan by following the steps sequentially.

## Phase 1: Setup and Dependencies
- **Objective**: Ensure the project is ready for development.
- **Tasks**:
  1. Verify Node.js and npm are installed.
  2. Install dependencies: Run `npm install` to install `minimist`.
  3. Review `AGENTS.md` for code style guidelines.
- **Files**: `package.json`, `AGENTS.md`.
- **Verification**: Run `npm start -- --help` to check basic functionality.

## Phase 2: TSV Parsing and Data Structures
- **Objective**: Implement parsing of TSV files into internal structures as per requirements (section 2).
- **Tasks**:
  1. Update `src/index.js` to parse command-line arguments (`--data`, `--groups`, `--raw`, `--debug`).
  2. Implement `parseGroupsParam()` to handle groups and generate column mappings.
  3. Implement `parsePlayerLine()` to parse TSV rows into player objects with `competitionData` as an object (e.g., `{ u17: '@', g16: '#' }`).
  4. Implement `loadTournamentData()` to read files, validate data, and build `allPlayers` and `clubData`.
  5. Handle eligibility markers ('#', '@') and adjustments ('/', '!', loans).
- **Files**: `src/index.js`.
- **Verification**: Test with sample data; log parsed structures in debug mode.

## Phase 3: Statistics Calculation
- **Objective**: Calculate age groups, stats, and adjustments as per requirements (section 4).
- **Tasks**:
  1. Implement `generateAgeGroups()` for ranges.
  2. Implement `calculateStatistics()` to aggregate counts, apply adjustments, and handle loans/eligibility.
  3. Implement `calculateAgeSummary()` for the age breakdown.
  4. Ensure separate handling for combined and girls-only stats.
  5. Support raw mode (no adjustments).
- **Files**: `src/index.js`.
- **Verification**: Run with test data; check stats output in debug mode.

## Phase 4: Output Implementation
- **Objective**: Generate tables and summaries as per requirements (section 5).
- **Tasks**:
  1. Implement age breakdown output.
  2. Implement combined and girls-only tables with fixed-width formatting.
  3. Add adjustments display in parentheses (unless raw).
  4. Implement groups mode aggregation.
  5. Implement amalgamated teams table: Show available players per team (home + loans - removals), including removal reasons.
  6. Implement debug mode JSON output.
  7. Handle thresholds (>=13 players) and imbalance highlighting.
- **Files**: `src/index.js`.
- **Verification**: Test table outputs; compare with expected formats.

## Phase 5: Error Handling and Edge Cases
- **Objective**: Add robustness as per requirements (section 6).
- **Tasks**:
  1. Add validation for data folder, invalid rows, and arguments.
  2. Handle missing columns, invalid symbols, and empty files.
  3. Ensure graceful skipping of unconfirmed/invalid players.
- **Files**: `src/index.js`.
- **Verification**: Test with malformed data; ensure no crashes.

## Phase 6: Testing and Finalization
- **Objective**: Verify the implementation meets requirements.
- **Tasks**:
  1. Run `npm test` with sample data.
  2. Test all modes: default, groups, raw, debug.
  3. Check code style against `AGENTS.md`.
  4. Update `AGENTS.md` if needed for new commands.
- **Files**: All modified files.
- **Verification**: Full end-to-end test; outputs match requirements.

## Dependencies and Prerequisites
- Node.js environment.
- Sample data in `data/` folder (e.g., `2025-02/` with TSV files).
- Reference `docs/requirements.txt` for detailed specs.

## Notes
- Follow code style from `AGENTS.md`.
- Commit changes incrementally.
- If issues arise, refer back to requirements for clarification.