---
status: done
created: 2026-07-28
updated: 2026-07-28
---

<!-- Landed 2026-07-28. Divergence notes live in the proposal's
     "As built — Phase 1"; the important one is summarized below. -->

> **Done 2026-07-28**, with one task deliberately not done. **Task C — exporting
> `sentence()`/`make()` from `examples.js` — was skipped**, and `js/examples.js`
> is untouched. Authoring the first passage showed that substring matching is the
> wrong tool for a fully labelled lesson: short function words collide (`"he"`
> matches inside `"The"`), each collision needs a hand-counted `nth`, and a wrong
> count silently mislabels a word. `js/unit-pos.js` uses its own
> `line(text, labelsInTokenOrder)` helper instead, which cannot misresolve.
> Full reasoning and six other findings:
> [As built — Phase 1](../proposals/curriculum-unit-1-parts-of-speech.md#as-built--phase-1-2026-07-28).
> `docs/product/curriculum-unit-1.md` was also written here rather than in 017,
> because amending `pilot.md` and `overview.md` created links to it.

# Unit 1 Phase 1 — the study view, proven end to end on one lesson

Phase 1 of [Unit 1 — The Nine Parts of Speech](../proposals/curriculum-unit-1-parts-of-speech.md).
Builds the whole machinery for a student-facing, self-paced unit, then authors
**only Orientation and Lesson 1 (Nouns)** — so the shape is proven by a lesson a
student can actually finish before ~190 questions are written against it.

Read the proposal first. It carries the four codebase facts that decide this
design, the label budget, and decisions **C1–C10**. This order does not repeat
them.

## Why

A lesson is the largest artifact in the app; there is nothing above it, and
`roadmap-platform.md` **P1** names sequencing as the gap. Students have no
self-paced path through the taxonomy, and neither existing question generator can
scope practice to a single part of speech — both select by *layer*
(`annsForLayers`, [js/quiz.js:29](../../js/quiz.js#L29); `skills`,
[js/assignment-model.js:79](../../js/assignment-model.js#L79)). So a unit on the nine
parts of speech needs its own surface, and this is it.

## Scope

### Task A — `js/study-model.js`, the DOM-free engine

New file. Zero DOM, zero direct storage access (it takes `wjt.safeStorage` as its
only storage path, which is already a shim). Must run in the smoke test's bare
`vm` sandbox.

Public surface on `wjt.study`:

```js
wjt.study.UNITS                       // { pos: <the unit object from js/unit-pos.js> }
wjt.study.unit(unitId)                // -> unit | null
wjt.study.stop(unitId, stopId)        // -> stop | null
wjt.study.steps(unitId, stopId)       // -> ordered step list, teach + choice + generated tap
wjt.study.check(step, response)       // -> { correct: bool, detail: {…} }   pure
wjt.study.progress.read()             // -> { v, at, done, best, updatedAt } | fresh default
wjt.study.progress.complete(stopId, fraction)
wjt.study.progress.visit(stopId)
wjt.study.progress.reset()
```

Three things to get right:

- **`steps()` generates the `tap` items.** Take the stop's lesson (built via its
  `build()`), keep annotations whose `label` is in the stop's `focus` array, and
  emit one `tap` step each. For every such step precompute `accept` — the token
  range of **every** same-label span in that sentence — exactly as
  [js/quiz.js:69-73](../../js/quiz.js#L69-L73) does, so a sentence with two instances
  does not punish picking the other one. Interleave: teach → its `choice` items →
  the `tap` items for the subtypes just taught.
- **`check()` is pure and DOM-free.** `choice` compares an option index; `tap`
  compares `{first,last}` token ranges against `accept`. No element ever reaches
  it — the view reads `selection.get()` and passes the plain range.
- **Deterministic order, no `Math.random()` at module scope.** Shuffling a
  `choice` item's options is allowed inside `steps()`, but the smoke test calls
  `steps()` and asserts on its contents, so keep the *step sequence* stable and
  shuffle only the option order.

### Task B — `js/unit-pos.js`, the content

New file, DOM-free. Registers its lessons into `wjt.EXAMPLES` and its unit into
`wjt.study.UNITS`.

Shape per stop:

```js
{ id: "nouns", n: 1, cluster: "A", title: "Nouns",
  blurb: "…",                    // one line for the unit map
  focus: ["noun", "common-noun", … ],
  lessonId: "unit-pos-nouns",    // the wjt.EXAMPLES id whose build() holds the passage
  teach: [ { heading, body, labels: ["common-noun", …] }, … ],
  items: [ { stem, options: [{ text, correct?, feedback }], … }, … ] }
```

In this phase author **`orientation` and `nouns` only**, plus their two Poe
lessons. Every other stop is declared in the sequence with `todo: true` so the
unit map can render the whole path greyed out — a student sees where they are
going, and Phase 2 has an explicit checklist.

Passage rules, all from the proposal — **do not re-derive them:**

- Source is Project Gutenberg ebook 1063, normalized three ways: join wrapped
  lines, strip `_italic_` underscores, and `--` → ` — ` (spaced em dash). Rules 2
  and 3 are load-bearing: `_very_` and `settled--but` are each **one token** and
  become permanently unlabellable if skipped.
- Verify with the tokenizer, not by eye. A token must never hold two letter-runs
  glued by punctuation, and no token may contain `_`.
- **One POS annotation per word** — subtype where it is the teaching point, base
  label elsewhere, never both (decision **C5**).
- **No `types` badges, no `part`/`phrase`/`clause` annotations** (decision
  **C10**). That is what keeps `tools/completeness.js` satisfiable: a sentence with
  no badge is an intentional fragment and only Rule 1 (POS on every word) applies.
- `essentialOnly: true` on every unit lesson.
- Registry entries carry `group: "unit-pos"`.

Passages for this phase: Orientation ¶3, 49, 50, 71; Nouns ¶0, 24, 44, 51
(paragraph indices are 0-based from "The thousand injuries of Fortunato…").

### Task C — export the authoring helpers from `js/examples.js`

`sentence()` and `make()` are private to that IIFE
([js/examples.js:15-48](../../js/examples.js#L15-L48)). Add one additive line
exporting `wjt.exampleAuthoring = { sentence: sentence, make: make }` and have
`js/unit-pos.js` use them. **Do not copy the helpers** — one place computes
annotation offsets, and it is already the place the smoke test trusts.

### Task D — `js/study.js`, the view

New file, DOM-ful. Registers `wjt.views.study(container, unitId, stopId)`.

- **Unit map** (`#/study/pos`): the four clusters, each stop a card showing its
  number, title, blurb, a done tick, and its best score. The next unstarted stop
  is highlighted. `todo: true` stops render disabled with "coming soon". A **Reset
  my progress** button using `wjt.confirmDialog`.
- **A stop** (`#/study/pos/<stopId>`): one step at a time with a progress bar,
  Back/Next, and a results screen at the end reporting the fraction and listing
  what was missed. Reuse `wjt.renderSentence` for every sentence — `interactive:
  true` plus `selection.get()`/`.clear()` for `tap`, matching
  [js/quiz.js:314-351](../../js/quiz.js#L314-L351).
- **Accessibility is not optional here** — it is a student-facing surface and the
  repo has already paid for this once (`docs/audit-remediation-0.1.0.md` P0-1/P0-3).
  Match what `quiz.js` does: move focus to the new step's heading after each
  `innerHTML` swap, `aria-live` on feedback, correct/incorrect carried in the
  accessible name and not by color alone, and the keyboard token-selection path
  (Tab to a word, Shift+Arrow) working for `tap`.
- Register any document-level listener with `wjt.onViewCleanup`.

### Task E — wiring

- `index.html`: three `<script>` tags in load order — `unit-pos.js` and
  `study-model.js` before `study.js`, all after `examples.js` (it provides the
  helpers) and before `app.js`.
- Router ([js/app.js:411-419](../../js/app.js#L411-L419)): one line for
  `parts[0] === "study"`, passing `parts[1]` and `parts[2]`. `hash.split("/")`
  already yields three segments.
- `renderExamples` ([js/app.js:352](../../js/app.js#L352)): group the grid by the new
  `group` field. Ungrouped literature examples keep their current heading and
  order; the `unit-pos` group gets its own heading and a "Start the unit →" link
  to `#/study/pos`.
- A Home splash card in `wjt.views.home` pointing at the unit.

### Task F — checks

- **`tools/smoke-test.js`**: load `js/unit-pos.js` and `js/study-model.js` into
  the `vm` sandbox — which is what proves they are DOM-free — then assert:
  - every stop's `focus` ids exist in `wjt.LABELS` and every one is layer `pos`;
  - **for each authored stop, its lesson carries at least one annotation for each
    of its `focus` labels.** This is the check that catches a lesson quietly
    failing to teach what it claims;
  - no stop's `focus` contains any of the six excluded ids (`gerund`,
    `participle`, `infinitive`, `particle`, `relative-adverb`, `emphatic-pronoun`);
  - the union of every stop's `focus` is exactly the 48 budgeted labels **once all
    stops are authored** — until then, assert it is a subset of the 48 and that no
    id appears in two stops' `focus`;
  - every `choice` item has exactly one `correct` option and feedback on all of
    them;
  - `check()` returns `true` for each `tap` step's own `accept` range and `false`
    for a deliberately wrong range.
  - The eleven new lessons flow through the existing example loop for free, so
    they also get boundary, round-trip, and completeness validation, and
    `samples/*.json` is regenerated. **Commit the regenerated samples.**
- **`tools/dom-check.html`**: `S-*` checks, following the existing `D-*` pattern.
  It loads over `file:///`, which makes it the right place to assert degraded mode
  ([P3](../../docs/roadmap-platform.md#decisions)): the unit map renders all fifteen
  stops; a `tap` accepts a correct range and rejects a wrong one; a `choice`
  scores; progress survives a re-render and Reset clears it; the whole thing still
  works with `wjt.safeStorage` forced to fail.
  **Never measure layout in the task that rendered it** — see
  [014](014-ui4-dom-check-settle.md); `renderSentence()` wraps in a later
  task.

### Task G — docs

- [docs/project/architecture.md](../../docs/project/architecture.md) — file map (now
  sixteen JS files), the routes table, the new view, the new storage key, and the
  DOM-free set.
- [docs/project/dom-structure.md](../../docs/project/dom-structure.md) — the study
  view's element tree. Nothing regenerates or checks this file, so stale is its
  default failure mode.
- [CLAUDE.md](../../CLAUDE.md) — constraint #4's file list and the "thirteen files"
  count.
- [docs/roadmap-platform.md](../../docs/roadmap-platform.md) `#sequencing` — why this
  runs beside step 4 (the pilot) rather than displacing it: decision **C9**.
- **Two documented promises this breaks. Amend them in this change, not before
  it**, the pattern `CLAUDE.md` sets for `SECURITY.md` and the first network call:
  1. *"The three modes. No fourth mode, no gradebook, no accounts"* —
     [pilot.md](../../docs/product/pilot.md). This is a fourth mode. Amend that
     clause; leave the gradebook and accounts clauses intact.
  2. *"No gradebook, no rosters, no student accounts. Practice mode scores a
     session and forgets it"* — [overview.md](../../docs/product/overview.md). Still
     true of accounts and rosters, and nothing is ever transmitted, but a best
     score now persists on one device. Reword precisely: no accounts, no rosters,
     nothing transmitted, nothing a teacher can read; a resume point and a personal
     best on the student's own machine.

## Out of scope

- **The other thirteen stops.** They are declared with `todo: true` and authored in
  [016](016-unit-pos-remaining-lessons.md). Resist authoring "just the easy ones"
  — the point of this phase is that the machinery is proven before the content
  scales.
- **The `sort` step kind.** Deferred to [017](017-unit-pos-capstone-and-docs.md);
  it is the only mechanic that needs tap-to-assign UI, and Phase 1 should ship on
  the two mechanics `quiz.js` already proved.
- **A general course/unit data model.** Decision **C2** — one unit, hard-coded.
- **Any change to `quiz.js` or the `assignment-*` modules.** Practice stays hidden.
- **Correcting the docs that still advertise Practice as live.** A real
  pre-existing mismatch, explicitly not this order's to fix — see the proposal's
  Out of scope. Do not quietly paper over it while editing `overview.md` for the
  item above.
- **A teacher-facing view of student progress.** Never, on any surface.

## Done when

- A student can open `index.html` **by double-clicking it** (`file://`), reach the
  unit from the Home card or the Example library, complete Orientation and Lesson 1
  end to end, close the tab, reopen, and be offered their place back.
- The unit map shows all fifteen stops, with thirteen greyed as coming soon.
- Reset my progress returns the map to stop 0.
- `node tools/smoke-test.js` — **0 failures**, including the new `unit-pos`
  assertions and completeness on both new lessons. `samples/` regenerated and
  committed.
- `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`
  — clean, no warnings.
- `node tools/validate-lesson.js --complete samples/*.json` — clean.
- `node tools/gen-docs.js --check` — clean (the taxonomy is untouched, so this
  proves it).
- `node tools/link-check.js --check` — clean, including this order and the proposal.
- `node tools/cvd-check.js --check` — clean.
- `tools/dom-check.html` reports **0 failed** with the new `S-*` checks present,
  run from PowerShell per [CLAUDE.md](../../CLAUDE.md).
- A teacher can open one of the two new Poe lessons from the Example library and
  Present and Edit it like any other lesson.
- Every doc in Task G updated, including both promise amendments.

Report the check output honestly. A red run is reported red, with the output.

## Notes

- The DOM check must be run from **PowerShell** with `Start-Process -Wait
  -RedirectStandardOutput` and a Windows-style `file:///C:/…` URL. The Bash `>`
  redirect yields a zero-byte dump, and grepping the raw dump for `FAIL` is a
  false positive — the harness's own inline script contains the literal strings.
  Use `node tools/dom-check-report.js $dump`.
- The passage-normalization probe (join lines / strip `_` / `--` → ` — `, then run
  the result through the real `splitSentences` and `tokenize`) is worth keeping as
  a scratch script for Phase 2, which normalizes nine more passages.
- `essentialOnly: true` only narrows the editor palette; it never hides an
  annotation already placed.
