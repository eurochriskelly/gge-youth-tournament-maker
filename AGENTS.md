# AGENTS.md

## Build/Lint/Test Commands
- **Build**: `npm install`
- **Test**: `npm run test` or `node src/index.js --data 2025-02`
- **Run**: `npm start -- --data <folder>` or `node src/index.js --data <folder>`
- **Run with Groups**: `node src/index.js --data <folder> --groups u17/4,g16/3,g14/4,u14/3,u12/3,u10/3,u8/3,u6/3`
- **Run with Raw Numbers**: `node src/index.js --data <folder> --groups ... --raw`

## Output Features
- **Age Breakdown**: Shows total players per age category (u17: 3, u16: 1, etc.) at the start
- **Combined Table**: Total players per age group/range with club breakdowns
- **Girls-Only Table**: Girls-only statistics per age group/range with club breakdowns
- **Competition Adjustments**: When not using --raw, shows adjustments in parentheses (removals/, additions!, loans to other clubs)

## Legacy Python Commands (if needed)
- **Build**: `python setup.py build` or `pip install -e .`
- **Lint**: `flake8 .` or `black --check .`
- **Test all**: `pytest`
- **Test single**: `pytest tests/test_file.py::TestClass::test_method`
- **Type check**: `mypy .`

## Code Style Guidelines

### Imports
- Standard library imports first, then third-party, then local imports
- Use absolute imports over relative imports
- Group imports with blank lines between groups

### Formatting
- Use Black for automatic formatting
- Line length: 88 characters
- Use double quotes for strings

### Types
- Use type hints for all function parameters and return values
- Use `typing` module for complex types
- Avoid `Any` type when possible

### Naming Conventions
- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: `_leading_underscore`

### Error Handling
- Use specific exceptions over generic `Exception`
- Provide meaningful error messages
- Use context managers for resource management

### Data Handling
- Tournament data uses TSV format: `id|status|name|birth_year|position`
- Validate data integrity when loading
- Handle missing fields gracefully

### Groups Parameter
- Format: `--groups category1/count1,category2/count2,...`
- Categories: `u{age}` (mixed gender), `g{age}` (girls-only)
- Example: `u17/4,g16/3` means u17 with 4 age groups, g16 with 3 age groups
- Age calculation: u17 means kids born in 2008 are u17 in tournament year 2025
- Filters output to show all age ranges belonging to specified tournament groups
- Ranges may appear under multiple categories if they belong to multiple groups
- Player count thresholds are not applied when groups are specified