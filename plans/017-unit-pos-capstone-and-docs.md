---
status: todo
created: 2026-07-28
---

# Unit 1 Phase 3 — the capstone, the `sort` step, and the docs

Phase 3 of [Unit 1 — The Nine Parts of Speech](proposals/curriculum-unit-1-parts-of-speech.md).
Finishes the unit: the cumulative capstone, the one step kind deliberately held
back, and the teacher- and student-facing documentation.

[016](done/016-unit-pos-remaining-lessons.md) is `done` as of 2026-07-28, so this
order is unblocked. Read its closing note first — it hands over a file split and
two new invariants.

## Why

Fourteen stops teach the nine parts of speech one at a time. Nothing yet asks a
student to tell them apart **all at once on unseen text**, which is the only
evidence that the unit worked. And the unit is not usable by a teacher who did not
build it until it is written down.

## Scope

### Task A — the capstone (stop 14)

`focus`: all 48 budgeted labels. Passage: ¶77 and ¶88 — the closing paragraphs,
which no earlier stop uses, so the capstone is genuinely unseen text.

Structure differs from a focus lesson on purpose:

- **No `teach` screens.** It is an assessment, not instruction.
- **~30 items, drawn across all nine parts**, `tap`-heavy: the transferable skill
  is finding a part of speech in a real sentence, not reciting a definition.
- **Its results screen names clusters, not items.** "Words that modify — 4 of 7"
  points a student back at a stop they can re-enter, which is what an open-navigation
  unit can act on. A flat list of 30 rights and wrongs is not actionable.

### Task B — the `sort` step kind

Held back from Phase 1 so the unit shipped on the two mechanics `quiz.js` had
already proved.

- Several words from the current passage, one bucket per part of speech in play.
- **Tap-to-assign, never drag.** [pilot.md](../docs/product/pilot.md) names
  drag-to-select on a tablet as the single most likely broken thing in the product;
  this is a student-facing surface and must not bet on it. Tap a word to select it,
  tap a bucket to assign it; tap an assigned word to unassign.
- **Full keyboard path**, matching the standard the rest of the app is held to:
  arrow/Tab to a word, Enter to pick it up, arrow to a bucket, Enter to drop.
  Assignment state must be in the accessible name, not conveyed by color or
  position alone.
- `check()` stays pure: per-word bucket equality, computed in `study-model.js` from
  a plain `{ word: bucketId }` map the view hands it.
- Add `sort` steps to the capstone and to the four review stops. Do **not**
  retrofit them into the nine focus lessons — those are proven, and churning them
  risks a regression for no teaching gain.

### Task C — split `js/unit-pos.js`

**Handed over from [016](done/016-unit-pos-remaining-lessons.md), which was content-only
and deliberately did not do it.** The file is **2,325 lines** — past the ~2,000 at
which the proposal says to split it per cluster, and this phase adds the capstone
on top of that.

Split the passages and stops per cluster (`unit-pos.js` keeping the unit
registration, `CLUSTERS`, `EXCLUDED` and the `line()`/`passage()` helpers). It is a
mechanical move, but it touches four things outside the file and every one of them
is load-bearing:

- `index.html` — a `<script>` tag per new file, in load order, all after
  `study-model.js` (which owns `wjt.study.register`) and before `app.js`.
- `tools/smoke-test.js` — the `LOGIC_FILES` sandbox list *and* the DOM-free source
  scan list. Being in that sandbox is the only thing that proves a file is DOM-free.
- [CLAUDE.md](../CLAUDE.md) — constraint #4's file list and the JS file count.
- [docs/project/architecture.md](../docs/project/architecture.md) — the file map.

Do this **before** authoring the capstone, not after, so the capstone lands in a
file that is already the right size.

### Task D — docs

Already written in [015](done/015-study-view-and-first-lesson.md), because amending
`pilot.md` and `overview.md` created links to it:

- **[`docs/product/curriculum-unit-1.md`](../docs/product/curriculum-unit-1.md)**
  — the unit for teachers and students, and its row in
  [docs/README.md](../docs/README.md). **Extend it here**, don't rewrite it:
  drop the "Orientation and Lesson 1 are complete" status blockquote once every
  stop is authored, and add whatever the capstone needs (it is currently listed in
  the sequence table but not described as an assessment).

Updated:

- [docs/product/teacher-guide.md](../docs/product/teacher-guide.md) — a section on
  assigning the unit, and a cross-reference from the existing "Building a unit
  across a week" recipe, which is the closest thing that existed before this.
- [docs/product/overview.md](../docs/product/overview.md) — "What's built today"
  gains the unit.
- [docs/project/architecture.md](../docs/project/architecture.md) and
  [docs/project/dom-structure.md](../docs/project/dom-structure.md) — the `sort`
  step's DOM, if 015's entries need extending.
- The proposal's **As built** section: what diverged, and anything authoring 260
  questions revealed about the step kinds. Per [CLAUDE.md](../CLAUDE.md) the
  divergence notes are the valuable part — do not tidy a caveat away.

### Task E — a teacher's honest picture of the limits

State these plainly in `curriculum-unit-1.md`; each one will otherwise be
discovered in a classroom:

- **Progress is per-browser, per-machine.** Same constraint as lessons. A student
  on a different machine starts over, and a shared machine hands the next student
  the last one's progress — which is why Reset exists and is prominent.
- **Nothing is collected.** No score reaches the teacher. If a teacher needs
  evidence, the printed Assignment worksheet is the tool for that, and the unit
  does not pretend otherwise.
- **The unit teaches 48 of the taxonomy's 54 POS labels**, and says which six it
  does not and why.

## Out of scope

- **Unit 2.** Named as the home for verbals and sentence structure so the deferral
  has an address; nothing built.
- **Restoring Practice, or correcting the docs that still advertise it as live** —
  a real pre-existing mismatch ([js/app.js:316](../js/app.js#L316)), and a decision
  of its own. See the proposal's Out of scope. Do not paper over it while editing
  `overview.md` for Task D.
- **A teacher-facing progress view, export of progress, or any transmission of it.**
- Every exclusion in 015 and 016 still holds.

## Done when

- The capstone is playable end to end on unseen text, and its results screen
  reports by cluster.
- `sort` works with mouse, touch, **and** keyboard, and appears in the capstone and
  all four reviews.
- The union of every stop's `focus` is **exactly** the 48 budgeted labels — the
  smoke test's full-coverage assertion, which only becomes checkable now.
- `js/unit-pos.js` is split per cluster (Task C), and all four of the outside
  references it has — `index.html`, both lists in `tools/smoke-test.js`,
  `CLAUDE.md` constraint #4, `architecture.md` — are updated in the same change.
- `node tools/smoke-test.js` — **0 failures**; `samples/` regenerated and committed.
- `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`
  and `--complete` — both clean.
- `node tools/gen-docs.js --check`, `node tools/link-check.js --check`,
  `node tools/cvd-check.js --check` — clean.
- `tools/dom-check.html` — **0 failed**, including `S-*` checks for `sort` and its
  keyboard path.
- A full pass of all fifteen stops from a **double-clicked** `index.html`, then the
  same on the served copy.
- `docs/product/curriculum-unit-1.md` exists, is linked from `docs/README.md`, and
  a reader who has never seen the app could assign the unit from it.
- The proposal's **As built** section is written, and **this order** is `git mv`'d
  into `plans/done/` **with its relative links re-based one level deeper** — then
  `node tools/link-check.js`. Skipping that step is how 130 dead links accumulated
  once already. (015 and 016 were moved when each finished, which is the practice
  worth keeping: a plan's status lives in where the file sits, not only in its
  frontmatter. Batching the moves into this order was the wrong idea.)
- The proposal's own `status:` goes from `doing` to `done`.

Report check output honestly; a red run is reported red with its output.

## Notes

- `sort` is the only new mechanic in this phase. If it turns out to be more than
  a day's work, it is a legitimate candidate to split into its own order rather
  than to hold the capstone and the docs behind it.
