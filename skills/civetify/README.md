# Civetify

A skill for porting JavaScript/TypeScript to Civet and making existing Civet code more idiomatic. It covers removing `esCompat`, simplifying syntax, and applying a consistent style while preserving behavior and types.

The skill checks proposed changes against compiled output with a bundled [AST comparison script](scripts/compare-ast.cjs), reviews comments separately, and runs relevant project checks. It uses the project's compiler and Civet configuration.

Example requests:

- "Use $civetify to clean up the syntax in src/example.civet."
- "Use $civetify to port src/example.ts to Civet."
- "Use $civetify to remove esCompat and clean up the Civet syntax in src/."

For CoffeeScript migration, use [coffeescript-to-civet](https://github.com/edemaine/agents-config/tree/main/skills/coffeescript-to-civet). See [SKILL.md](SKILL.md) for the style rules and verification workflow.
