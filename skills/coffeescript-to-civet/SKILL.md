---
name: coffeescript-to-civet
description: Convert CoffeeScript source files or Civet using coffeeCompat/coffee-compat or individual CoffeeScript compatibility modes to native Civet. Preserve compiled behavior and existing types. Use for migrations, removing CoffeeScript compatibility flags, and conversion reviews, not ordinary native-Civet style cleanup or unrelated feature work.
---

# CoffeeScript to Civet

Convert `.coffee` files or remove CoffeeScript compatibility modes from `.civet` files. Convert behavior first and syntax second. Native Civet resembles CoffeeScript, but several shared spellings have different semantics. A file that parses successfully can still emit incorrect JavaScript.

## Establish the project context

1. Inspect the pinned Civet version, build configuration, and nearby `.civet` files before editing.
2. Identify the starting point:
   - `.coffee`: use the original CoffeeScript compiler as the baseline; find imports, build entries, tests, documentation, and filename references that need migration.
   - `.civet`: use Civet with its original effective configuration as the baseline; keep filenames and existing types. Inventory `coffeeCompat`/`coffee-compat`, individual modes, and exclusions in source directives and project/build configuration.
3. Preserve unrelated worktree changes. Keep the migration focused unless the user asks for cleanup.
4. Produce native Civet without the compatibility modes being migrated. Preserve unrelated directives and configuration. For existing Civet, skip migration-only work such as renaming files or adding types unless requested.

For `.civet`, apply a compatibility translation only when its mode is currently enabled and is being removed, individually or through removal of `coffeeCompat`/`coffee-compat`. Leave syntax governed by retained or already-disabled modes alone. A file with only `coffeeInterpolation` still uses native loop and operator meanings. The aggregate `coffeeCompat` enables a collection of modes, including `autoVar`; exclusions can disable individual features. Consult the [compatibility reference](https://civet.dev/reference#coffeescript-compatibility) and the pinned compiler for the actual enabled set. Recognize both camelCase and kebab-case spellings.

Remove individual modes in checked batches when useful. For an aggregate flag, either remove it and adapt all affected syntax together, or temporarily disable individual features while retaining the aggregate. Check each intermediate state and the final result. Don't remove independently configured `autoVar`, `iife`, or other general options merely because CoffeeScript compatibility is being removed; preserve their behavior and follow the requested scope.

## Translate semantics deliberately

Do not perform blind global replacements. Operators can occur inside strings, regular expressions, comments, MongoDB keys such as `$in`, or unrelated JavaScript expressions.

Use these native Civet translations. For `.civet`, each compatibility row applies only when removing the listed mode, either individually or as part of full `coffeeCompat`/`coffee-compat` removal. Modes already excluded from the aggregate do not qualify. For `.coffee`, apply the relevant translations directly; there are no Civet mode flags to remove.

| CoffeeScript syntax | Native Civet | Mode being removed | Check |
| --- | --- | --- | --- |
| `# comment` or `## comment` | `// comment` | `coffeeComment` | Preserve comment text; inspect comments inside regexes too. |
| `value ? fallback` | `value ?? fallback` | `coffeeBinaryExistential` | Preserve nullish fallback. |
| `"Hello #{name}"` | `` `Hello ${name}` `` | `coffeeInterpolation` | Preserve escaping and multiline string/regex contents. |
| `a == b`, `a != b` | `a is b`, `a is not b` | `coffeeEq` | Preserve strict equality and chained comparisons. |
| `a isnt b` | `a is not b` | `coffeeIsnt` | Preserve inequality. |
| `a // b` | `a %/ b` | `coffeeDiv` | Preserve floor division, including negative inputs. |
| `x in values` | `x is in values` | `coffeeOf` | Conditional: see membership caveat below. |
| `x not in values` | `x is not in values` | `coffeeOf` | Same membership caveat, with negation. |
| `key of object` | `key in object` | `coffeeOf` | Preserve property membership. |
| `for x in values` | `for each x of values` | `coffeeForLoops` | Preserve indexed array traversal. |
| `for value, index in values` | `for each value, index of values` | `coffeeForLoops` | Preserve value/index order. |
| `for item from iterable` | `for item of iterable` | `coffeeForLoops` | Preserve iterator traversal. |
| `for key of object` | `for key in object` | `coffeeForLoops` | Preserve property enumeration. |
| `for key, value of object` | `for key, value in object` | `coffeeForLoops` | Preserve key/value lookup. |
| `for own key, value of object` | `for own key, value in object` | `coffeeForLoops` | Preserve own-property filtering. |
| `yes` / `on`, `no` / `off` | `true`, `false` | `coffeeBooleans` | Only rewrite boolean tokens, not identifiers or text. |
| `X::`, `X::name` | `X.prototype`, `X.prototype.name` | `coffeePrototype` | Preserve receiver and lookup. |
| `fn(args...)`, `[head, tail...]` | `fn(...args)`, `[head, ...tail]` | No coffee mode required | Optional style change; check rest/spread behavior. |

* Membership: compatibility mode `in` emits `Array.prototype.indexOf.call`, while native `is in` emits `.includes`. These differ for `NaN`, sparse arrays, and overridden methods. Inspect the baseline and transform only when equivalence is established.
* `coffeeForLoops`: check loop-variable scope, values used after the loop, callback captures, and mutation of the index or collection. With implicit declarations, the original loop can reuse a function-scoped variable; native `for each` can introduce a fresh binding per iteration, changing what closures capture and whether the variable remains available after the loop.
* `coffeeNot`: negation precedence differs. Group the intended operand explicitly before removing the mode; inspect compound comparisons.
* `coffeeRange`: ranges can choose ascending or descending order at runtime. Preserve direction, inclusive/exclusive endpoints, evaluation order, and side effects; use explicit direction or conditional code when needed.
* `coffeeDo`: preserve immediate invocation, captured arguments, and evaluation timing. Native `do` blocks aren't interchangeable with CoffeeScript `do` calls.
* `coffeeClasses`: preserve bound methods, constructor behavior, `super`, static members, and class-local bindings when converting to native methods. A bound method isn't equivalent to an ordinary method.
* `coffeeJSX`: preserve the emitted JSX tree, text, and whitespace when switching to native indentation rules. Don't simply remove closing tags.

Treat CoffeeScript's implicit declarations, or removal of Civet's `autoVar`, as a separate migration step. Preserve function scope and hoisting where observed; explicit `var` may be needed before adopting block-scoped declarations. In native Civet:

- Use `name := expression` for a new constant.
- Use `name .= expression` for a new mutable binding.
- Continue assigning with `name = expression` after the declaration.
- Declare a binding outside a `try`, conditional, or callback when later code uses it.

For example:

```civet
file .= undefined
try
  file = lookupFile id
catch error
  file = null
use file
```

When migrating `.coffee` or disabling `coffeeLineContinuation`, remove backslash continuations. Restructure them with an indented expression or an explicit `if`/`unless` block.

When migrating `.coffee` or disabling `coffeeClasses`, convert ordinary class methods and constructors to native method syntax:

- `method: (x) -> ...` → `method(x) ...`.
- `constructor: (@name) -> ...` → `constructor(@name) ...`.
- Preserve parameter and return types where present. Bound `=>` methods need separate handling to preserve binding; see the `coffeeClasses` caveat above.

Take special care with multiline calls. Put a separating comma on its own line before the next argument, and inspect the emitted call arity:

```civet
collection.find
  group: groupName
,
  fields:
    title: true
.forEach (message) => process message
```

## Apply the preferred Civet style

Use multiline function declarations for named functions:

```civet
/** Return whether the requested format is supported. */
export function supports(format: string, formats: string[]): boolean
  format is in formats
```

Follow these conventions:

- Prefer `function name(...)` over `name := (...) =>` for multiline named functions.
- Prefer `=>` for anonymous callbacks and new functions.
- Use `->` only when the function needs dynamic `this`, such as framework callbacks that read `@userId`, `@ready`, or a template data context.
- When documenting a named function, class, type, or variable declaration, put a `/** ... */` comment immediately before it so the documentation appears in tooling.
- Use `//` for flow, sequencing, and implementation comments.
- Prefer module exports such as `export function name(...)` and `export value := ...`. Do not also create a global with `@name =`.
- Preserve existing globals during an otherwise mechanical conversion unless changing them is part of the task.

For `.coffee` migration, add parameter and return annotations when they are clear and useful. For compatibility removal in `.civet`, preserve existing types and inferred contracts. Favor simple types such as `string`, `number`, `boolean`, `Date`, `string[]`, and small object or `Record` types. Use Civet's `T?` shorthand instead of `T | undefined`. Do not invent speculative types for framework-owned objects when the project lacks reliable declarations.

Be cautious with `: void`: Civet suppresses an implicit return when compiling it. Add `void` only when discarding the return value is intentional and behaviorally safe. Include early returns and client/server simulation behavior when choosing a return type.

## Validate emitted behavior

Use the project's pinned compiler rather than a globally installed version. Compile every converted file both normally and as JavaScript, writing to standard output so validation does not leave generated files beside the source. Adapt these commands to the project's package manager. For JSX output, preserve JSX and use the project's JSX build check instead of Node's syntax check:

```sh
./node_modules/.bin/civet -c path/to/file.civet -o - >/dev/null
./node_modules/.bin/civet --js -c path/to/file.civet -o - \
  | node --input-type=module --check -
```

Inspect the emitted JavaScript at semantic hot spots instead of treating successful parsing as sufficient. Confirm:

- equality and negation preserve the baseline operators and grouping.
- membership preserves the baseline behavior, including any justified use of `.includes(...)`.
- value-only iterable loops emit `for...of`, `for each value, index of array` emits an indexed array loop, and own-object loops enumerate own properties.
- every new binding has the intended scope and mutability.
- arrows are lexical except where dynamic `this` is required.
- multiline calls have the expected argument count and chaining.
- annotations have not changed implicit-return behavior.

Compile the original under its original compiler/configuration and the candidate under its intended configuration. Compare JavaScript for `.coffee` migration and TypeScript for `.civet` compatibility removal, preserving existing types. Exact generated text need not match.

Use this skill's [compare-ast.cjs](scripts/compare-ast.cjs) for a conservative AST comparison. Invoke it directly from the skill with the original and candidate snapshots; filenames determine how each input is prepared:

```sh
node /path/to/coffeescript-to-civet/scripts/compare-ast.cjs /path/to/scratch/original.coffee /path/to/scratch/candidate.civet --project /path/to/project --out /path/to/scratch/check
node /path/to/coffeescript-to-civet/scripts/compare-ast.cjs /path/to/scratch/original.civet /path/to/scratch/candidate.civet --project /path/to/project --out /path/to/scratch/check
```

For two `.civet` snapshots, the script compares typed output (`js: false`); no CoffeeScript compiler is needed.

Run `--help` for full usage. The script resolves the project's TypeScript package and whichever source compilers it needs. It compiles `.coffee` using CoffeeScript with `bare: true`, compiles `.civet` using Civet, and reads `.js`/`.jsx` directly. It never executes input files or installs packages. Parsing errors stop the comparison. Exit status: 0 match, 1 difference, 2 usage/compile/parse error. `--out` saves prepared code and normalized AST JSON for inspection.

For Civet inputs, configuration is loaded from `--project` or its `.config` subdirectory using Civet's config API, without searching ancestors. `--no-config` disables config loading. JS/Civet config files execute when loaded. Comparison mode overrides output-format options; other build transforms and `tsConfig` are not applied. If the build uses additional transforms or a CoffeeScript wrapper, reproduce that build and compare its emitted `.js`/`.jsx` files directly. Use the same logical `--filename` when comparing Civet snapshots.

When modes come from project/build configuration, deleting a source directive may leave them enabled. The comparator loads one project configuration for both inputs, so don't change it and then recompile the baseline under the new settings. Save original emitted `.ts`/`.tsx` before changing configuration, compile the candidate under the intended settings, and compare those saved outputs directly. Alternatively, use isolated configuration snapshots. Verify the final build has no unintended compatibility modes enabled. `--no-config` alone isn't equivalent to removing selected modes: it also drops unrelated configuration.

The comparison ignores formatting, redundant expression/type parentheses, empty statements, semicolon tokens, and JSDoc nodes. It preserves types when present, declaration forms, bindings, argument structure, operators, optional chains, and literal contents. CoffeeScript and Civet often differ in generated helpers, declarations, loop structure, or temporary names even when behavior agrees. Review those differences and run targeted checks; don't weaken the comparator until it passes or treat a mismatch as proof of a bug. Check compiler wrappers separately. Compile and check proposed changes before applying them to project files.

Finally, search for stale `.coffee` references when filenames changed, unintended remaining compatibility flags, and accidental generated artifacts, review the diff, and run proportionate project checks.

Ordinary comments are source-text trivia, not AST nodes; JSDoc appears in `getChildren()` and is explicitly skipped. Compare comments in the source snapshots separately: their text must match apart from punctuation, including comment delimiters, and remain attached to the corresponding code.
