# CoffeeScript to Civet

A skill for migrating CoffeeScript to native Civet (without `coffee-compat` flags) or removing `coffeeCompat`/`coffee-compat` and individual CoffeeScript compatibility modes from existing `.civet` files. It also supports conversion reviews. It handles syntax with different meanings in the two languages, along with declarations, functions, exports, documentation, types, and project references.

The skill compares emitted JavaScript for CoffeeScript migration, or TypeScript for existing Civet to preserve types, with a bundled [AST comparison script](scripts/compare-ast.cjs), reviews comments separately, and runs relevant project checks. Compiler-generated differences need review; matching syntax alone doesn't establish equivalent behavior.

Example requests:

- "Use $coffeescript-to-civet to migrate src/example.coffee."
- "Use $coffeescript-to-civet to remove CoffeeScript compatibility flags from src/example.civet."
- "Use $coffeescript-to-civet to review this conversion against the original CoffeeScript."

For JavaScript/TypeScript migration or style cleanup in native Civet, use [Civetify](https://github.com/edemaine/agents-config/tree/main/skills/civetify). See [SKILL.md](SKILL.md) for the migration rules and verification workflow.
