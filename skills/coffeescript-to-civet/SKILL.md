---
name: coffeescript-to-civet
description: Convert CoffeeScript source files to native Civet while preserving emitted JavaScript behavior and applying consistent Civet declarations, functions, documentation, exports, and type annotations. Use for .coffee-to-.civet migrations and conversion reviews, not for ordinary feature work already written in Civet.
---

# CoffeeScript to Civet

Convert behavior first and syntax second. Native Civet resembles CoffeeScript, but several shared spellings have different semantics. A file that parses successfully can still emit incorrect JavaScript.

## Establish the project context

1. Inspect the pinned Civet version, build configuration, and nearby `.civet` files before editing.
2. Find imports, build entries, tests, documentation, and other references to each `.coffee` filename.
3. Preserve unrelated worktree changes. Keep the migration focused unless the user asks for cleanup.
4. Prefer native Civet syntax. Use CoffeeScript compatibility mode only when the user explicitly requests it.

## Translate semantics deliberately

Do not perform blind global replacements. Operators can occur inside strings, regular expressions, comments, MongoDB keys such as `$in`, or unrelated JavaScript expressions.

Use these native Civet translations:

| CoffeeScript | Native Civet | Reason |
| --- | --- | --- |
| `# comment` or `## comment` | `// comment` | Civet uses JavaScript comments. |
| `value ? fallback` | `value ?? fallback` | Preserve nullish fallback. |
| `"Hello #{name}"` | `` `Hello ${name}` `` | Use JavaScript interpolation. |
| `a == b`, `a != b` | `a is b`, `a is not b` | CoffeeScript equality is strict; Civet `==` and `!=` remain loose. |
| `x in values` | `x is in values` | CoffeeScript tests array membership; Civet `in` tests object properties. |
| `x not in values` | `x is not in values` | Preserve negative array membership. |
| `key of object` | `key in object` | CoffeeScript `of` and Civet `in` test object properties. |
| `for x in values` | `for each x of values` | Iterate array or iterable values. |
| `for value, index in values` | `for each value, index of values` | Preserve value/index order with an indexed array loop. |
| `for key of object` | `for key in object` | Iterate an object's entries. |
| `for key, value of object` | `for key, value in object` | Iterate an object's entries. |
| `for own key, value of object` | `for own key, value in object` | Iterate an object's own entries. |
| `fn(args...)`, `[head, tail...]` | `fn(...args)`, `[head, ...tail]` | Civet prefers prefix spread and rest syntax. |

For array loops that use both the value and index, prefer `for each value, index of values` over destructuring `values.entries()`. For example, `for row, y in drawing.keys` becomes `for each row, y of drawing.keys`. This compiles to an indexed loop with a cached length, like CoffeeScript.

Treat CoffeeScript's implicit declarations as a separate migration step. In native Civet:

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

Remove CoffeeScript backslash continuations. Restructure them with an indented expression or an explicit `if`/`unless` block.

Convert CoffeeScript constructors such as `constructor: (@name) ->` to Civet method syntax such as `constructor(@name: string)`.

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

Add parameter and return annotations when they are clear and useful. Favor simple types such as `string`, `number`, `boolean`, `Date`, `string[]`, and small object or `Record` types. Use Civet's `T?` shorthand instead of `T | undefined`. Do not invent speculative types for framework-owned objects when the project lacks reliable declarations.

Be cautious with `: void`: Civet can suppress an implicit return when compiling it. Add `void` only when discarding the return value is intentional and behaviorally safe. Include early returns and client/server simulation behavior when choosing a return type.

## Validate emitted behavior

Use the project's pinned compiler rather than a globally installed version. Compile every converted file both normally and as JavaScript, writing to standard output so validation does not leave generated files beside the source. Adapt these commands to the project's package manager:

```sh
./node_modules/.bin/civet -c path/to/file.civet -o - >/dev/null
./node_modules/.bin/civet --js -c path/to/file.civet -o - \
  | node --input-type=module --check -
```

Inspect the emitted JavaScript at semantic hot spots instead of treating successful parsing as sufficient. Confirm:

- `is` and `is not` emit strict equality.
- `is in` and `is not in` emit value membership, normally `.includes(...)`.
- value-only iterable loops emit `for...of`, `for each value, index of array` emits an indexed array loop, and own-object loops enumerate own properties.
- every new binding has the intended scope and mutability.
- arrows are lexical except where dynamic `this` is required.
- multiline calls have the expected argument count and chaining.
- annotations have not changed implicit-return behavior.

Compile original CoffeeScript and generated Civet code and compare the relevant JavaScript behavior. Exact generated text need not match.

Use this skill's [compare-ast.cjs](scripts/compare-ast.cjs) for a conservative AST comparison. Invoke it directly from the skill with the original and candidate snapshots; filenames determine how each input is prepared:

```sh
node /path/to/coffeescript-to-civet/scripts/compare-ast.cjs /path/to/scratch/original.coffee /path/to/scratch/candidate.civet --project /path/to/project --out /path/to/scratch/check
```

Run `--help` for full usage. The script resolves the project's TypeScript package and whichever source compilers it needs. It compiles `.coffee` using CoffeeScript with `bare: true`, compiles `.civet` using Civet, and reads `.js`/`.jsx` directly. It never executes input files or installs packages. Parsing errors stop the comparison. Exit status: 0 match, 1 difference, 2 usage/compile/parse error. `--out` saves prepared code and normalized AST JSON for inspection.

For Civet inputs, configuration is loaded from `--project` or its `.config` subdirectory using Civet's config API, without searching ancestors. `--no-config` disables config loading. JS/Civet config files execute when loaded. Comparison mode overrides output-format options; other build transforms and `tsConfig` are not applied. If the build uses additional transforms or a CoffeeScript wrapper, reproduce that build and compare its emitted `.js`/`.jsx` files directly. Use the same logical `--filename` when comparing Civet snapshots.

The comparison ignores formatting, redundant expression/type parentheses, empty statements, semicolon tokens, and JSDoc nodes. It preserves types when present, declaration forms, bindings, argument structure, operators, optional chains, and literal contents. CoffeeScript and Civet often differ in generated helpers, declarations, loop structure, or temporary names even when behavior agrees. Review those differences and run targeted checks; don't weaken the comparator until it passes or treat a mismatch as proof of a bug. Check compiler wrappers separately. Compile and check proposed changes before applying them to project files.

Finally, search for stale `.coffee` references and accidental generated artifacts, review the diff, and run proportionate project checks.

Ordinary comments are source-text trivia, not AST nodes; JSDoc appears in `getChildren()` and is explicitly skipped. Compare comments in the source snapshots separately: their text must match apart from punctuation, including comment delimiters, and remain attached to the corresponding code.
