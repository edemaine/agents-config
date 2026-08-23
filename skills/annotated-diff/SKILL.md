---
name: annotated-diff
description: Create or maintain a standalone Markdown document that explains a Git diff, groups related changes by purpose, presents readable diff excerpts, and accounts for the complete change set. Use when the user asks for an annotated diff, an explanatory diff document, to refresh one after code changes, or continues implementation in a task where one is already being maintained.
---

# Annotated Diff

Create a reviewable Markdown artifact for readers who have the repository but
not the surrounding conversation. Explain both what changed and why.

## Establish the comparison

- Respect a user-specified base, scope, and output path.
- Otherwise infer the base from the current branch's PR or upstream metadata;
  use the repository's normal main branch as a fallback. Record the resolved
  base ref and short commit hash in the document.
- Include committed changes after the base plus staged and unstaged tracked
  changes. Ignore untracked files by default, but report their paths as omitted
  so the user can decide whether they belong in scope. Include one only when the
  user requests it or the specified scope clearly includes it. Exclude the
  annotated-diff document itself from its inventory unless the user explicitly
  asks to document that file too.
- Read repository instructions and any existing annotated-diff document before
  editing. Preserve useful prose, organization, and user edits when updating.
- This skill authorizes creating or updating the requested documentation, not
  changing the underlying implementation.

## Inventory before writing

Inspect the complete diff, not only its stat or the first tool-sized chunk.
Start with the status, name/status list, and stat, then read every changed file's
diff. Continue paginated or truncated output until every hunk has been seen.
Use status to identify untracked paths for the omission warning; do not inspect
their contents unless they are in scope.

Maintain a private coverage ledger while writing: every in-scope changed file
and hunk must have a destination section. Do not silently omit small supporting
edits, tests, comments, imports, renames, deletions, or in-scope newly added
files. Generated or mechanical changes may be summarized instead of reproduced
only when showing them would materially reduce readability; identify them
explicitly and state what caused them.

## Organize by rationale

Group changes by behavior, invariant, or design purpose rather than Git order or
filename. A file may appear in several sections when its changes support
different ideas. Put tests next to the behavior they verify. Collect truly
mechanical supporting changes, such as imports and exports, only when they do
not belong more naturally with their use.

For each group:

1. Give it a descriptive heading.
2. Explain the previous limitation or inaccurate model.
3. Explain the new approach and why it is preferable.
4. State any behavior change, preserved invariant, downstream use, or test that
   makes the reason concrete.
5. Show the relevant diff excerpts with a filename caption immediately above
   each fence, for example `**\`source/parser.civet\`**` followed by a
   `diff`-language fence.

Move back and forth between explanatory prose and diff blocks within a section
as needed. Explain each conceptual step near the excerpt it interprets instead
of forcing all prose before all code or all code into one block.

Write for a reader outside the current conversation. Avoid references such as
"the cast that motivated this refactor", "our earlier discussion", or "the
change above" when the referent is not self-contained. Do not infer a rationale
that the code does not support; inspect callers or history when necessary.

## Edit diff excerpts for comprehension

Diff blocks are explanatory excerpts, not a pasted chronological dump. They
must remain faithful to the actual before and after code.

- Split large raw hunks into smaller blocks when they contain independent
  concepts.
- Include enough unchanged context to identify the declaration, rule, or call
  site. Use `...` only to mark omitted unchanged context, never to conceal an
  unexplained changed line.
- Pair independent one-line replacements as `-`, `+`, `-`, `+` when raw Git
  output groups them as `-`, `-`, `+`, `+`. This is especially useful for
  parallel field or type edits:

  ```diff
  -  name: string
  +  name?: string
  -  id: Identifier
  +  id?: BindingIdentifier
  ```

  Do not reorder lines when their relative order changed, when additions and
  deletions are not one-to-one, or when pairing would imply a false
  correspondence.
- Keep related additions together when their ordering or combined shape is the
  point of the change.
- Do not invent diff lines, normalize away meaningful formatting, or show a
  proposed version that differs from the workspace.
- Use a plain filename caption because fenced Markdown has no portable filename
  metadata.

## Maintain an existing document

Recompute the comparison rather than appending only the latest edit. Update the
base hash if needed, revise explanations whose implementation changed, remove
stale excerpts, add newly introduced hunks to the appropriate semantic groups,
and renumber sections consistently. Prefer integrating a new change into an
existing rationale over creating a chronological "follow-up" section.

When this skill is active during an ongoing implementation task, keep the
annotated diff synchronized through later code changes before final handoff; do
not require a separate refresh request for every intermediate edit.

After editing, reread the Markdown and the complete current diff side by side.
Verify:

- every file and hunk in the inventory is represented or explicitly accounted
  for;
- every displayed removal and addition still matches the real comparison;
- filenames and the recorded base are correct;
- prose describes the final code rather than an abandoned intermediate design;
- tests appear with the behavior they cover;
- the document renders with balanced fences and coherent headings; and
- the working tree contains no unintended implementation edits.

Report the output path, comparison base, any deliberately summarized generated
files, and any untracked paths omitted by default when handing off the document.
