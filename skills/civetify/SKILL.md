---
name: civetify
description: Clean up existing Civet code into idiomatic Civet, including removing esCompat when requested, while checking emitted TypeScript for behavioral changes. Use for Civet style passes and syntax simplification, not CoffeeScript migration or unrelated feature work.
---

# Civetify

Apply Civet shorthand without changing meaning. Work through the rules in turn; search beyond the user's example when the request is a general cleanup. Use the project's installed compiler.

Compile and check proposed changes **before applying them to project files**. Compare emitted TypeScript ASTs, especially when removing parentheses. Keep a baseline so the final comparison covers the combined edits.

## Compatibility and parsing

When removing `esCompat`, first compile the original with its original directive/options. Remove the flag in a candidate, inspect the emitted differences, and fix the syntax before applying it. Don't assume removing the flag preserves JS/TS parsing. Check the installed compiler against [Civet's comparison](https://civet.dev/comparison), particularly single-argument arrows, implicit returns, operator spacing, indentation, braced blocks, and semicolons.

Operators need consistent spacing: `x + y` and `x +y` mean different things. Use small compiler probes instead of guessing.

## Declarations and expressions

* `const x = y` → `x := y`.
* `let x = y` → `x .= y`.
* `&&` → `and`.
* `||` → `or`.
* `!` → `not`.
* `===` → `is`.
* `!==` → `is not`.
* `y.includes(x)` → `x is in y`.
* `not y.includes(x)` → `x is not in y`.
* `foo != null` → `foo?`.
* `foo == null` → `not foo?`.
* `T | undefined` → `T?`.
* `x.length` → `x#`.
* `typeof x === "foo"` → `x <? "foo"`.
* `typeof x !== "foo"` → `x !<? "foo"`.
* `this.x` → `@x`.
* `this` → `@`.
* Statements generally don't need leading/trailing `;`. Check implicit returns before removing trailing semicolons.
* Braces generally aren't needed: blocks are indented. Keep braces for object literals with advanced properties or where they clarify parsing.
* In braced objects: `b: a.b` → `a.b`.
* Adjacent properties in braced objects: `b: a.b, c: a.c` → `a.{b,c}`.
* `{options: obj.options ?? {}}` → `{obj.options ?? {}}`. Property shorthand supports defaults too.
* Omit trailing commas on separate lines in object and array literals.
* In imports, omit `import` and quotes around module names where supported. Preserve type-only imports and import semantics.

## Functions and calls

* Prefer `function` declarations over assigned arrows for named functions. Keep inline callbacks as arrows or shorthand.
  * Conversion changes hoisting, lexical `this`/`arguments`/`super`/`new.target`, constructibility, and possibly function name/scope behavior. Check uses as well as bodies; preserve parameter/default/rest/generic/return types.
* `() => work()` → `=> work()`. Remove the adjoining extra space too.
* `poll: () => void` → `poll: => void`. Remove the adjoining extra space too.
* Keep parameter parentheses in `(x) => ...`; bare `x => x + 1` is an implicit call with a zero-argument arrow.
* `return` is implicit at the end of a function unless its return type is `void`. Preserve early returns and intentional no-value returns.
  * Removing a trailing semicolon, changing braces, or moving an inline expression into a block can add a return.
  * Use `void` or an explicit no-value `return` to preserve the original contract; don't add `void` if it changes an API's inferred type.
  * Empty arrow bodies may need `=> return` to remain empty functions rather than object-returning expressions.
  * When moving an inline multiline expression into a function body, indent its continuation lines too. Distinguish an object return from a braced block; `return { ... }` can disambiguate it. Put crowded fields on separate lines.
* `f(x, y)` → `f x, y`, unless later syntax must stay outside the call.
  * Keep `()` in argumentless calls.
  * `f(g(x), y)` is not `f(g x, y)`: the latter passes both arguments to `g`. Chained access and ternaries also constrain how far an implicit call extends.
* `new X()` → `new X`; retain grouping for chained access, e.g. `(new X).f()`.
* `(x) => f(x)` → `f(.)`, often `f .`.
  * `items.map f .` compiles to a unary wrapper, e.g. `items.map($ => f($))`; `items.map f` passes the array index and array too, which can be misinterpreted as optional arguments.
* `(x) => f(x, fixed)` → `f ., fixed`.
  * `f ., fixed` keeps the fixed second argument inside the callback. Inspect the emitted arrow and parameter scope; a placeholder isn't automatically equivalent to passing or binding the function.
* `(x) => x.y` → `.y`; e.g. `items.map .value`.
* For accessor/placeholder shorthand:
  * Generated parameters can be renamed. Check binding identity, not just spelling; never globally replace an identifier to make an AST comparison pass.

## Control flow and ranges

* `if`/`switch`/`for`/`while` don't need condition/header parentheses for indented bodies.
* `for (i .= 0; i < args#; i++)` → `for i .= 0; i < args#; i++`, with an indented body.
* `if (condition) return` → `return if condition`, and similarly for other short conditional statements. Expand long statements and multiline objects into an indented body.
* `if not condition` → `unless condition`, when the **whole** condition is negated.
* `while not condition` → `until condition`, when the **whole** condition is negated.
* `if a is not b` → `unless a is b`.
* `while a is not b` → `until a is b`.
* `while true` → `loop`.
* Use `switch`/`when` for equality chains on the same value. Keep simple branches adjacent without blank lines; preserve the default and lack of fallthrough.
  * The discriminant is evaluated once, while an equality chain can read it repeatedly.
  * Prefer stable values without observable getters; check strict matching, case scopes, and generated breaks.
* `for const ...` → `for ...`.
* `for (item of items) if condition` → `for item of items when condition`, with an indented body. Invert an `unless` guard without changing short-circuit behavior.
  * `when` often emits `if (!condition) continue`; compare scope, labels, and surrounding statements with the original guarded body.
* Before converting to range loops:
  * Range loops usually generate an internal counter and a per-iteration `const` index. Complex endpoints can be cached.
  * Check whether the original index is assigned in the body, read after the loop, or captured by a callback.
  * Check whether the collection/bound grows during traversal. Keep dynamic queue loops C-style; a cached length can truncate breadth-first traversal.
  * Check whether the body advances the index to consume input, e.g. CLI options. Keep that loop C-style too.
  * Check whether endpoints have side effects or change during the body. Preserve their evaluation order and frequency.
* `for (i = a; i <= b; i++)` → `for i of [a..b]`.
* `for (i = a; i < b; i++)` → `for i of [a..<b]`.
* `for (i = a; i >= b; i--)` → `for i of [a..>=b]`.
* `for (i = a; i > b; i--)` → `for i of [a..>b]`.
* `[items# - 1..>0]` → `[items#>..>0]`; similarly use `[a<..b]` when it simplifies a bound.
  * `[n>..>=0]` may emit `n + -1` rather than `n - 1`; confirm numeric bounds before treating those forms as equal.
* `for index of [0..<array#]` followed by `item := array[index]` → `for each item, index of array`.
  * Destructuring works: `for each [a, b], i of pairs`.
  * `for each` also caches length and may cache the collection reference. Ensure replacing `array[index]` doesn't skip getter calls, change lookup timing, or substitute a stale array. Don't slice merely to force a nonzero-start traversal into `for each`.

## Slices

* `x.slice(a)` → `x[>=a]`.
* `x.slice(0, b)` → `x[<b]`.
* `x.slice()` → `x[..]`.
  * `x[..]` compiles to `x.slice(0)`, not literally `x.slice()`. They copy the same elements for ordinary arrays; retain the optional chain as `x?[..]`. Check custom `slice` methods separately.
* `x.slice(a, b)` → `x[a..<b]`; choose `<` or `<=` to simplify expressions, after checking endpoint behavior.
  * Inclusive slice bounds are not always simple `end + 1`: a two-ended inclusive slice can generate `end + 1 || Infinity` to handle an endpoint of `-1`. Probe negative endpoints, empty/reversed ranges, and inclusive/exclusive boundaries before simplifying arithmetic.

## JSX

* Use indentation instead of closing tags. Keep an explicit closing `</pre>` to avoid an extra newline.
* Omit `/` on self-closing tags, provided nothing more on the same line.
* `foo={bar}` → `foo=bar`, for simple attribute values without spaces.
* `foo={bar()}` → `foo=bar()`, for simple attribute values without spaces.
* `foo={foo}` → `{foo}`.
* `foo={foo()}` → `{foo()}`.
* `foo={props.foo}` → `{props.foo}`.
* `{foo} {bar}` → `{foo, bar}`
* `class="foo bar"` → `.foo .bar`.
* `id="foo"` → `#foo`.

## Presentation and scope

* Keep README examples in TypeScript unless asked otherwise; don't relabel them `civet`. Use `text` fences for Civet snippets in Markdown where highlighting isn't supported.
* Keep JavaScript embedded in strings/templates as JavaScript; likewise preserve regexes, prose, and comments. Regex searches find candidates, not safe edit locations.
* Keep `.civet` and `.md` files LF-only. Remove double spaces and trailing whitespace introduced by edits; preserve indentation.
* Extract repeated helpers into an appropriately scoped utility module when requested or clearly part of the cleanup. Compare implementations first: similarly named helpers may have different semantics. Don't silently standardize them.
* Report the changes, meaningful exceptions, and checks actually run. A structural comparison is evidence, not a formal equivalence proof.

## Compilation and AST checks

### Working loop

1. Inspect repository instructions, compiler version/config, and check scripts. Snapshot the current working files, including the user's uncommitted edits; don't use an older Git revision as their baseline.
2. Work rule by rule. Compile a small probe with the local compiler, e.g. `pnpm exec civet -c -e 'items.map f .'`. For quoting-sensitive or multiline input, use a temporary file or the JS API rather than interpolating shell strings.
3. Prepare before/after whole-file snapshots in a scratch directory. Use the same logical filename/options on both sides, except the compatibility option deliberately being migrated.
4. Run the skill's [compare-ast.cjs](scripts/compare-ast.cjs) on the snapshots before applying changes to project files, as shown below. It compiles both variants, parses the emitted TypeScript as TSX with `typescript.createSourceFile`, stops if parsing reports errors, and compares normalized ASTs. Successful compilation alone doesn't establish equivalence.
5. If the comparison fails, inspect the emitted diff. Reject or revise the candidate unless the difference is understood. Validate a batch before applying it; split a failing batch to isolate the cause. Recheck the combined result against the snapshot.
6. Run the project's typecheck and suitable existing tests. For syntax-only edits with identical output, don't invent redundant tests. Broader control-flow/function changes justify the existing suite. For helper extraction, check edge cases and real consumers; report regeneration against saved inputs can be more useful than lengthy benchmarks.
7. Check the final diff, comments, documentation, LF line endings, double spaces, and trailing whitespace. Compare source comments separately; their text must match apart from punctuation. Whitespace inside string/template literals must remain data.

Keep snapshots and compiled output in an ignored scratch directory. Do not commit verification artifacts unless requested. When mapping emitted nodes back to source, Civet's `sourceMap: true` returns `{code, sourceMap}`. Mappings for generated tokens and closing delimiters can be absent or approximate: verify the exact source span, avoid overlapping edits, and compile every proposed edit. Never trust source offsets or broad string replacement alone; renaming a helper must not rename words in report prose.

### Reusable conservative comparator

Run [compare-ast.cjs](scripts/compare-ast.cjs) directly from this skill's `scripts/` directory, using its full path. Don't copy it into the project. Pass `--project` with the project root to resolve its compiler packages. Run `--help` for usage, examples, extension rules, and exit statuses. The script does not install packages or execute inputs.

| Input | Preparation |
| --- | --- |
| `.civet` | Compile with the project's Civet. |
| `.coffee` | Compile with the project's CoffeeScript, using `bare: true`. |
| `.js` / `.jsx` | Read directly. |
| `.ts` / `.tsx` | Read directly in typed mode; otherwise erase types with TypeScript. |

If both inputs are `.civet`, `.ts`, or `.tsx`, preserve types (Civet `js: false`). If either input is `.coffee`, `.js`, or `.jsx`, compare JavaScript instead (Civet `js: true`). Mixed TypeScript/JavaScript comparisons use `transpileModule` with ESNext target, preserved module syntax, and preserved JSX. Keep the project's typecheck: JavaScript comparison cannot verify type equivalence.

Civet/CoffeeScript output and `.jsx`/`.tsx` inputs use TSX parsing by default. Plain `.js`/`.ts` inputs use non-JSX parsing. `--no-jsx` disables JSX parsing for all inputs. The exported `canonical(ts, code, jsx)` defaults to TSX; pass `false` for plain TypeScript.

`--project` selects packages and Civet configuration. For Civet inputs, the script uses Civet�s config API to load configuration from that directory or its `.config` subdirectory, without searching ancestors. `--no-config` disables config loading. JS/Civet config files execute when loaded. Comparison mode overrides output-format options; source directives still apply. Other build transforms and `tsConfig` are not applied. For preprocessing, wrappers, or cross-file TypeScript transforms, compile through the actual build first and compare its `.js`/`.jsx`/`.ts`/`.tsx` outputs directly. No input-mode flag is needed.

```sh
node /path/to/civetify/scripts/compare-ast.cjs /path/to/scratch/before.civet /path/to/scratch/candidate.civet --project /path/to/project --filename src/example.civet --out /path/to/scratch/check
node /path/to/civetify/scripts/compare-ast.cjs /path/to/scratch/actual.js /path/to/scratch/expected.js --project /path/to/project
node /path/to/civetify/scripts/compare-ast.cjs --self-test --project /path/to/project
```

`--out` saves prepared code as `before`/`after` with `.ts`, `.tsx`, `.js`, or `.jsx` extensions according to output language and parsing mode, plus AST JSON files. Choose a scratch directory whose named outputs may be replaced. Exit status: 0 match, 1 mismatch, 2 usage/compile/parse error.

The script preserves syntax kinds, token text, declaration forms, modifiers, types, argument structure, operators, and optional-chain punctuation. It removes parentheses represented by parenthesized expression/type nodes, empty statements, semicolon tokens, and JSDoc nodes; other token spelling differences can still produce conservative mismatches. It deliberately doesn't equate arbitrary blocks, rename bindings, or transform control flow.

Ordinary comments are source-text trivia, not AST nodes; JSDoc appears in `getChildren()` and is explicitly skipped. Compare comments in the source snapshots separately: their text must match apart from punctuation, including comment delimiters, and remain attached to the corresponding code.

### Accounting for expected differences

The original cleanup also used tailored normalized JSON comparisons. Those went beyond parentheses: concise arrows versus explicit returns, accessor parameter renaming, single-statement branches versus blocks, loop scaffolding, switches, and function declarations. Apply such normalization **only to the reviewed transformation**, not as a growing global equivalence filter:

* **Accessor/placeholder:** alpha-rename just the wrapper's bound parameter and its references. Preserve captures, shadowing, argument count, return type, and the exact expression.
* **Loop guard:** compare `if (condition) {body}` with a leading `if (!condition) continue; body` only within the same loop and after checking scope/control transfers.
* **Range:** match the specific generated counter, bound cache, and alias. Compare initialization, bound/operator, update, and body after local substitution. Separately verify that index writes, closure captures, and changing endpoints don't invalidate it.
* **Switch:** compare cases to strict-equality branches only after checking discriminant evaluation, case scope, breaks, and default behavior.
* **Named function:** compare parameters, modifiers, types, and normalized bodies; separately audit lexical bindings, hoisting, and usage. Arrow and declaration ASTs should not be globally treated as interchangeable.
* **Slice / negation:** inspect the narrow emitted difference, e.g. ordinary-array `.slice()` versus `.slice(0)`, or `!(a === b)` versus `a !== b`. Don't assume a custom method or arbitrary arithmetic obeys the same equivalence.

Preserve all meaningful fields when writing custom serializers: `const`/`let`, type-only imports/exports, optional chains, async/generator modifiers, operator kinds, literal/template contents, binding structure, and declaration types. Simply serializing child node kinds can omit semantic flags. Require reviewed mappings for generated variable names; don't rename by spelling throughout a file. Save enough evidence to explain the comparison honestly: structural regression checks plus targeted reasoning/tests, not a formal proof.
