#!/usr/bin/env node
'use strict';

/*
 * Compare JavaScript, TypeScript, Civet, and CoffeeScript source files by their
 * normalized ASTs, without executing them. Invoke this script from the skill.
 * Run with --help for examples, extension rules, dependencies, and exit statuses.
 *
 * If you change this file, make the same change in
 * ../../civetify/scripts/compare-ast.cjs too.
 */

const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const assert = require('node:assert/strict');

function canonical(ts, code, jsx = true) {
  const source = ts.createSourceFile(
    jsx ? 'comparison.tsx' : 'comparison.ts', code,
    ts.ScriptTarget.Latest, true, jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (source.parseDiagnostics.length) {
    throw new Error(source.parseDiagnostics.map(d => {
      const location = source.getLineAndCharacterOfPosition(d.start ?? 0);
      return `${location.line + 1}:${location.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
    }).join('\n'));
  }
  function walk(node) {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return null;
    if (ts.isEmptyStatement(node) || node.kind === ts.SyntaxKind.SemicolonToken) return null;
    if (ts.isParenthesizedTypeNode(node)) return walk(node.type);
    if (ts.isParenthesizedExpression(node)) {
      // Parentheses distinguish string expressions from directive prologues.
      let inner = node.expression;
      while (ts.isParenthesizedExpression(inner)) inner = inner.expression;
      if (!(ts.isStringLiteral(inner) && ts.isExpressionStatement(node.parent))) return walk(node.expression);
    }
    const children = node.getChildren(source).map(walk).filter(n => n !== null);
    // Optional-chain propagation is not fully represented by punctuation:
    // (x?.y).z and x?.y.z must remain different after removing parentheses.
    const optionalChain = Boolean(node.flags & ts.NodeFlags.OptionalChain);
    return children.length
      ? [node.kind, optionalChain, children]
      : [node.kind, optionalChain, node.kind === ts.SyntaxKind.SyntaxList ? '' : node.getText(source)];
  }
  return walk(source);
}

function selfTest(ts, civet) {
  const same = (a, b) => assert.deepEqual(canonical(ts, a), canonical(ts, b));
  const different = (a, b) => assert.notDeepEqual(canonical(ts, a), canonical(ts, b));
  same('const x = (a + b);', 'const x=a+b');
  same('// a comment\nconst x = 1;', '/* another comment */ const x=1');
  same('function f(): void { work(); }', 'function f():void { work() }');
  different('const x = a + b;', 'const x = a - b;');
  different('const x = 1;', 'let x = 1;');
  different('f(a, b);', 'f(g(a, b));');
  different('x?.y;', 'x.y;');
  different('(x?.y).z;', 'x?.y.z;');
  different('(x?.y)();', 'x?.y();');
  different('function f(){("use strict");work()}', 'function f(){"use strict";work()}');
  different('import type {X} from "x";', 'import {X} from "x";');
  different('export type {X};', 'export {X};');
  different('async function f() {}', 'function f() {}');
  different('function* f() {}', 'function f() {}');
  different('function f(): number { return 1; }', 'function f(): number { 1; }');
  different('const f = (x: number) => x;', 'const f = (x: string) => x;');
  different('const f = (x) => x;', 'const f = (x) => y;');
  different('const x = [1,,2];', 'const x = [1,2];');
  different('const x = "a b";', 'const x = "a  b";');
  different('tag`a\\nb`;', 'tag`a\nb`;');
  assert.throws(() => canonical(ts, 'const = ;'));
  const compile = s => civet.compile(s, {sync: true, filename: 'probe.civet', js: false});
  same(compile('x := f(a)'), compile('x := f a'));
  same(compile('function f(poll: () => void): void\n  poll()'), compile('function f(poll: => void): void\n  poll()'));
  different(compile('x := f(g(a), b)'), compile('x := f(g a, b)'));
  different(compile('items.map f .'), compile('items.map f'));
  const compareTypes = different;
  compareTypes(compile('function f(x: number): number\n  x'), compile('function f(x: string): string\n  x'));
  const jsxA = canonical(ts, 'const x = <div value={a}/>;');
  const jsxB = canonical(ts, 'const x = <div value={b}/>;');
  assert.notDeepEqual(jsxA, jsxB);
  assert.throws(() => canonical(ts, 'const x = <T>value;'));
  assert.doesNotThrow(() => canonical(ts, 'const x = <T>value;', false));
  console.log('AST self-tests passed, including Civet probes and semantic-difference checks.');
}

const HELP = `Compare normalized ASTs without executing either input.

Usage:
  node /path/to/skill/scripts/compare-ast.cjs BEFORE AFTER [options]
  node /path/to/skill/scripts/compare-ast.cjs --self-test --project PROJECT

Examples:
  compare-ast.cjs before.civet after.civet --project /path/to/project
  compare-ast.cjs original.coffee migrated.civet --project /path/to/project
  compare-ast.cjs actual.js expected.js --project /path/to/project --out /tmp/check
  compare-ast.cjs implementation.civet expected.tsx --project /path/to/project

Input extensions (case-insensitive):
  .civet       Compile with the project's @danielx/civet.
  .coffee      Compile with the project's coffeescript, using bare: true.
  .js / .jsx   Read directly; never compile as Civet.
  .ts / .tsx   Read directly for typed comparisons; otherwise erase types with
               TypeScript transpileModule (ESNext, preserved modules and JSX).

Comparison mode:
  If BOTH inputs are .civet/.ts/.tsx, preserve types (Civet js: false).
  Otherwise compare JavaScript (Civet js: true, erase any .ts/.tsx types).
  Civet/CoffeeScript output and .jsx/.tsx use TSX parsing by default.
  Plain .js/.ts use non-JSX parsing. Parsing errors stop the comparison.

Options:
  --project DIR     Resolve compilers and Civet config here (default: current dir).
  --filename NAME   Logical filename for Civet snapshots (default: comparison.civet).
  --out DIR         Save before/after prepared code and AST JSON in scratch DIR.
                    Existing named output files may be replaced; inputs are protected.
  --no-jsx          Disable JSX parsing for all inputs.
  --no-config       Skip Civet config loading.
  --self-test       Run AST and Civet checks; needs typescript and @danielx/civet.
  --help, -h        Show this help without loading compilers.

Dependencies: typescript always; other compilers only for matching extensions.
No packages are installed. For Civet inputs, load config from --project or its
.config subdirectory using Civet's config API (no ancestor search). JS/Civet config
files execute when loaded. Comparison mode overrides output-format options.
Other build transforms and tsConfig are not applied. Self-tests ignore config.
For a custom build, compare its actual .js/.jsx/.ts/.tsx outputs instead.
AST differences can be legitimate compiler differences: inspect, don't auto-apply.
Exit status: 0 match/self-test success; 1 mismatch; 2 usage/compile/parse error.
`;

const EXTENSIONS = new Set(['.civet', '.coffee', '.js', '.jsx', '.ts', '.tsx']);
const TYPED_EXTENSIONS = new Set(['.civet', '.ts', '.tsx']);

/** Choose one output language for both sides, before compiling either one. */
function comparisonMode(files) {
  const extensions = files.map(file => path.extname(file).toLowerCase());
  for (let i = 0; i < files.length; i++) {
    if (!EXTENSIONS.has(extensions[i])) throw new Error(`Unsupported extension: ${files[i]}. Expected ${[...EXTENSIONS].join(', ')}.`);
  }
  return {extensions, js: !extensions.every(ext => TYPED_EXTENSIONS.has(ext))};
}

/** Load only required packages; never fall back to a global or install one. */
function projectLoader(project) {
  const projectRequire = createRequire(path.resolve(project, 'package.json'));
  return name => {
    let resolved;
    try { resolved = projectRequire.resolve(name); }
    catch { throw new Error(`Cannot resolve ${name} from ${path.resolve(project)}. Select the project containing the required compiler with --project.`); }
    return projectRequire(resolved);
  };
}

/** Prepare one side. Keep original JS untouched, and validate TS before erasure. */
function prepare(file, extension, js, options, ts, load) {
  const source = fs.readFileSync(file, 'utf8');
  const jsx = !options.noJsx && ['.civet', '.coffee', '.jsx', '.tsx'].includes(extension);
  let code = source;
  if (extension === '.civet') {
    const compileOptions = {
      ...options.civetConfig,
      parseOptions: {...options.civetConfig?.parseOptions},
      sync: true, filename: options.filename, js,
    };
    // Omit output controls entirely: some Civet versions inspect property presence.
    for (const key of ['ast', 'sourceMap', 'inlineMap', 'upstreamSourceMap', 'errors']) delete compileOptions[key];
    code = load('@danielx/civet').compile(source, compileOptions);
  } else if (extension === '.coffee') {
    code = load('coffeescript').compile(source, {filename: file, bare: true});
  } else if (js && (extension === '.ts' || extension === '.tsx')) {
    canonical(ts, source, jsx); // Never compare error-recovered or silently repaired input.
    const result = ts.transpileModule(source, {
      fileName: jsx ? 'input.tsx' : 'input.ts', reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.Preserve,
        jsx: ts.JsxEmit.Preserve, verbatimModuleSyntax: true,
      },
    });
    const errors = result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) ?? [];
    if (errors.length) throw new Error(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
    code = result.outputText;
  }
  return {code, tree: canonical(ts, code, jsx), extension: (js ? 'js' : 'ts') + (jsx ? 'x' : '')};
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); return; }
  const options = {project: process.cwd(), filename: 'comparison.civet', noJsx: false};
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-jsx') options.noJsx = true;
    else if (arg === '--no-config') options.noConfig = true;
    else if (arg === '--self-test') options.selfTest = true;
    else if (['--project', '--filename', '--out'].includes(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}. Run with --help.`);
      options[arg.slice(2)] = argv[++i];
    } else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}. Input extensions select compilation; see --help.`);
    else files.push(arg);
  }
  if ((!options.selfTest && files.length !== 2) || (options.selfTest && files.length)) {
    throw new Error('Supply BEFORE and AFTER files, or --self-test. Run with --help for examples.');
  }
  const mode = options.selfTest ? null : comparisonMode(files);
  const load = projectLoader(options.project);
  const ts = load('typescript');
  if (options.selfTest) return selfTest(ts, load('@danielx/civet'));
  if (!options.noConfig && mode.extensions.includes('.civet')) {
    const {findInDir, loadConfig} = load('@danielx/civet/config');
    const configPath = await findInDir(path.resolve(options.project));
    if (configPath) {
      try { options.civetConfig = await loadConfig(configPath); }
      catch (error) { throw new Error(`${configPath}: ${error.message}`); }
      console.log(`Civet config: ${configPath}`);
    }
  }
  const prepared = files.map((file, i) => {
    try { return prepare(file, mode.extensions[i], mode.js, options, ts, load); }
    catch (error) { throw new Error(`${file}: ${error.message}`); }
  });
  console.log(`Comparing ${mode.js ? 'JavaScript behavior (types erased)' : 'TypeScript (types preserved)'}: ${mode.extensions.join(' vs ')}.`);
  if (options.out) {
    const directory = path.resolve(options.out);
    const outputs = ['before', 'after'].flatMap((name, i) => [
      path.join(directory, `${name}.${prepared[i].extension}`),
      path.join(directory, `${name}.ast.json`),
    ]);
    const identity = file => {
      const resolved = fs.existsSync(file) ? fs.realpathSync(file) : path.resolve(file);
      return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    };
    const inputs = files.map(identity);
    if (outputs.some(file => inputs.includes(identity(file)))) throw new Error('Output paths must not overwrite input files.');
    fs.mkdirSync(directory, {recursive: true});
    for (let i = 0; i < 2; i++) {
      fs.writeFileSync(outputs[i * 2], prepared[i].code);
      fs.writeFileSync(outputs[i * 2 + 1], JSON.stringify(prepared[i].tree, null, 2) + '\n');
    }
  }
  const a = JSON.stringify(prepared[0].tree);
  const b = JSON.stringify(prepared[1].tree);
  if (a === b) {
    console.log('Normalized ASTs match. Review comments and any semantic assumptions separately.');
    return;
  }
  let index = 0;
  while (index < Math.min(a.length, b.length) && a[index] === b[index]) index++;
  console.log(`ASTs differ near serialized offset ${index}. Inspect prepared output; do not apply automatically.`);
  console.log('Before: ' + a.slice(Math.max(0, index - 60), index + 160));
  console.log('After:  ' + b.slice(Math.max(0, index - 60), index + 160));
  process.exitCode = 1;
}

module.exports = {canonical, comparisonMode, prepare, selfTest};
if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message); process.exitCode = 2;
  });
}
