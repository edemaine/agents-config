---
name: lean-abstract
description: Create or revise a human-readable Lean formal abstract with minimal definitions and main theorems in Abstract.lean, proved through AbstractBridge.lean. Use for independently understandable summaries of an existing formalization, not ordinary proof development or prose-only abstracts.
---

# Lean abstract

Write the formal equivalent of a paper abstract: a short file whose mathematical statements a human can understand without reading the implementation, with proofs checked against the existing development. Optimize for intuitive definitions and few concepts, rather than matching the proof's representations or minimizing character count.

## Choose the public definitions

Inspect the main theorem statements, their hypotheses, and the repository's build and axiom-checking conventions. Identify only the concepts needed to state the requested results. The abstract may use simpler representations, provided the bridge proves the correspondence without weakening or strengthening the intended claims.

- Give each concept one canonical public definition. Avoid alternative equivalent predicates, duplicate theorem formulations, and separate encoded and unencoded versions unless the requested results need them.
- Prefer ordinary functions, quantifiers, membership, and equalities over custom interfaces, dependent records, or implementation-specific machinery. State constraints on a function explicitly when this is clearer than packaging values and proofs into subtypes.
- For more than two homogeneous components, prefer `Fin n → α` over nested cross products. Give the index type a short descriptive alias and name meaningful indices. Group the index alias, index names, and object alias in one block. For example, `Direction := Fin 4`, indices `n/s/e/w`, and `Tile := Direction → ℕ` let a reader write `t n` instead of tuple projections.
- Choose representations that inherit the needed Mathlib encoding and computability instances when they are also intuitive. Keep explicit bijections, encoding instances, and coding lemmas in the bridge. Avoid an ugly public representation merely to simplify encoding.
- Use lists for finite input collections when this makes algorithms and encodings straightforward. Explain that lists are used instead of sets for algorithmic processing and that duplicates are harmless, when true.
- Define named mathematical properties needed by the results, rather than leaving them only as expanded theorem statements. Reuse standard Mathlib notions where they are already readable.
- Prefer direct answer-preservation statements over introducing another reduction interface just for the abstract.

These are readability preferences, not reasons to discard useful existing structures or essential hypotheses.

## Split statements from proof machinery

`Abstract.lean` contains the minimal definitions, concise explanatory comments, and actual `theorem` declarations whose short proofs invoke imported bridge theorems. It should be independently understandable in content; its imports may bring in the full proof. Do not replace checked theorems with axioms or leave placeholder proofs.

`AbstractBridge.lean` imports the established theorem endpoint and supplies the translations, correspondence proofs, and transferred results. For algorithmic claims, prove the translations computable under the relevant encodings; a set-theoretic equivalence alone does not transfer decidability or completeness. Prove inverse maps when useful, without assuming a bijection is necessary for every transfer.

Keep the import graph acyclic: when `Abstract.lean` imports the bridge, the bridge cannot import it. Use bridge statements parameterized over the public notions, or small internal predicates and expanded statements that the abstract's definitions match by definitional equality. Keep unavoidable internal duplication confined to the bridge; do not expose several equivalent presentations in the abstract or add a third definitions file by default.

## Write comments

Start each conceptual code block's comment with a human mathematical definition or statement. Then explain how the Lean expression represents it, only where needed. Group trivial aliases under one comment rather than documenting every line separately.

- Explain notation by connecting Lean expressions to the mathematical objects or relationships they represent.
- Use consistent, domain-specific names in prose. State relevant conventions near the object definition.
- Explain unfamiliar Mathlib predicates by their meaning, then name the predicate. When describing an algorithmic property, state its termination and correctness guarantees precisely.
- Explain reduction totality and answer preservation in words. If source inputs are natural numbers, explain their role as encodings without exposing coding details.
- Label main results as theorems and corollaries and give their intuitive consequences. Say the file “proves” the results, since their proofs are checked.
- Keep prose concise, grammatical, and free of repeated explanations. Prefer “introduces the needed definitions” to “defines the needed definitions.” Omit implementation history and proof-specific terminology from the abstract.

The module introduction should briefly identify the abstract's purpose, definitions, main results, and bridge. Explain that, to check whether the formalization proves the intended main results, the reader only needs to check this file's definitions and theorem statements; Lean verifies the proofs through the bridge and the rest of the project. Follow the repository's comment and header conventions. If updating the README is in scope, describe the same role and division between reader and Lean, link both files, and identify the import and build command without repeating the mathematical exposition.

## Verify and integrate

Compile the abstract and bridge, checking that the short public proofs establish exactly the displayed statements. Include the abstract in the default build, following existing target and import conventions. If the repository has an axiom audit, add the new main theorems so unfinished proofs and unexpected assumptions are caught there too. Report the checks actually completed and any remaining limitations; do not claim that a full build passed based only on a targeted build.

## Examples

Consult these for concrete examples of definitions, comments, and theorems proved through a bridge. Adapt the presentation to the current problem.

- [edemaine/lean-wang](https://github.com/edemaine/lean-wang/blob/main/LeanWang/Abstract.lean): Wang tiling is co-RE-complete and undecidable.
- [edemaine/translation-tiling-paper](https://github.com/edemaine/translation-tiling-paper/blob/main/lean/TranslationTiling/Abstract.lean): Tiling three-dimensional space by translates of a single connected polycube is co-RE-complete and undecidable.
- [slef/TilingPolyomino](https://github.com/slef/TilingPolyomino/blob/master/TilingPolyomino/Abstract.lean): Characterizations of L-tromino tileability for rectangles and rectangles with corner defects.
