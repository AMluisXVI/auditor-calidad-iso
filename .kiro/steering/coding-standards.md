# Coding Standards

## TypeScript
- Strict mode always enabled (`strict: true`)
- ESM only — no CommonJS (`require`, `module.exports`)
- Explicit return types on all exported functions
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `const` over `let`; never use `var`

## Naming
- Files: kebab-case (`analysis-result.ts`)
- Interfaces: PascalCase (`AnalysisResult`)
- Functions/variables: camelCase (`getAnalysisResult`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- Descriptive names — avoid abbreviations

## Analyzers Output
- All analyzer Lambda functions MUST return JSON output
- Use the shared `Finding` and `Recommendation` interfaces
- Include ISO 25010 characteristic and sub-characteristic in every finding

## Error Handling
- Never swallow errors silently
- Lambda handlers must catch and return structured error responses
- Use specific error types where possible

## Code Organization
- One concern per file
- Shared logic goes in `@auditor/shared`
- Lambda-specific logic stays in its package
