# AGENTS.md

## Build/Lint/Test Commands
- **Build**: `npm install`
- **Test**: `npm run test` or `node src/index.js --data 2025-02`
- **Run**: `npm start -- --data <folder>` or `node src/index.js --data <folder>`

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