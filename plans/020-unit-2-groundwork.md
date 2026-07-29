---
status: todo   # todo | doing | done | superseded
created: 2026-07-29
---

# Handoff: set Unit 2 up — groundwork now, the spike beside it, phasing after

Unit 1 is finished ([018](done/018-unit-pos-answer-order-and-ambiguous-taps.md) was
the last order). This file is the handoff for **what comes before Unit 2's first
line of content**, and it owns exactly one deliverable: a Unit 2 design record with
its mechanic question left honestly open.

It exists because two open orders already sit in front of Unit 2 and the order they
run in matters. Read this section and you know the sequence without reading the other
three files.

| # | Step | Who owns it | Blocked by |
|---|---|---|---|
| 1 | **Draft the Unit 2 proposal's 019-independent parts** — passage, sequence, label budget, the `types` sizing decision, the badge-question decision. Leave the step-kinds question open as `C11`. | **this order** | nothing |
| 2 | ~~**Run the multi-token tap spike.**~~ **Done, 2026-07-29** — its finding is `C11`'s decision plus rationale; see [§5](#5-c11-is-decided-019-has-run) below. | [019](done/019-multi-token-tap-spike.md) | — |
| 3 | **Phase the build** into numbered orders (`021…`), Unit 1's 015/016/017 shape. | a later order | steps 1 **and** 2 |
| 4 | **Walk [005](005-presentation-ui-remediation.md)'s amended manual matrix, once**, with both units' surfaces in it. | [005](005-presentation-ui-remediation.md) | step 3's content landing |

Steps 1 and 2 are independent and can run in either order or at once. **Do not
collapse step 1 into step 3** — Unit 1's whole phasing lesson was that the design
record comes first and the "As built" notes get written back into it.

## Why

The proposal-then-orders shape is not ceremony here; it paid for itself in Unit 1.
[curriculum-unit-1-parts-of-speech.md](proposals/curriculum-unit-1-parts-of-speech.md)
carried ten numbered decisions with rationale, and four "As built" sections written
back into it, and the divergence notes turned out to be the valuable part —
[CLAUDE.md](../CLAUDE.md) says so explicitly. Unit 2 gets the same treatment.

What makes Unit 2 *not* a copy of Unit 1 is that its subject changes what the
smoke test demands of a passage. Unit 1's passages were `pos`-only and carried no
`types` badge, which exempted them from two of the three completeness rules. Unit 2
teaches sentence structure, so it cannot take that exemption — and that, not the
tap mechanic, is the largest unknown in front of it.

## Scope

Write `plans/proposals/curriculum-unit-2-<slug>.md`, following the Unit 1 proposal's
shape: a **Why**, a **What the codebase already decides for us** section of verified
facts, the passage, scope and sequence, label budget, design, a numbered
open-questions table with decisions **and** rationale, out of scope, and phasing.

Everything below is measured, not estimated. It is here so a cold session can
decide rather than re-derive; re-measure with the probes in [Notes](#notes) if the
tree has moved.

### 1. The label budget is already known, and it is smaller than Unit 1's

| Layer | Total | Essential | Bases | `LAYERS[].unit` |
|---|---|---|---|---|
| `part` | 19 | **18** | 5 | "group of words" |
| `phrase` | 9 | **9** | 6 | "phrase" |
| `clause` | 5 | **5** | 2 | "clause" |

**32 Essential labels across the three layers**, plus the three verbals Unit 1
deferred here by [C8](proposals/curriculum-unit-1-parts-of-speech.md#label-budget) —
`gerund`, `participle`, `infinitive`, which live on `pos` under `verb` — for a
working budget of **35**. Unit 1 taught 48. Set `essentialOnly: true` as Unit 1 did
and the one Advanced `part` label drops out on its own.

Decide and record: does Unit 2 claim all 35, and does it also teach the **eight
sentence-type badge values** (below), which are not labels at all.

### 2. The `types` cascade — the real sizing question

[tools/completeness.js](../tools/completeness.js) lines 104–174: a sentence carrying
a `types` badge (`structure` or `purpose`) must satisfy **all three** rules, not just
POS coverage.

- **Rule 2** — `clause`-layer spans must cover **every** token, with a conjunction
  joining two clauses absorbed into an adjacent span.
- **Rule 3** — **every** clause span must contain a `subject`-family span *and* a
  `predicate`-family span. Families: `simple-subject`, `complete-subject`,
  `compound-subject`, `understood-subject` (imperatives use that last one) and
  `simple-predicate`, `complete-predicate`, `compound-predicate`.

So there is no partially diagrammed Unit 2 sentence. A badged sentence is a fully
diagrammed sentence or it fails a blocking `check()` in
[tools/smoke-test.js](../tools/smoke-test.js).

**What that actually costs, measured across the repo's existing lessons:**

| Lesson | Layers | Sentences | Badged | Annotations | per word |
|---|---|---|---|---|---|
| Unit 1 (all 11 passages) | `pos` | 72 | 0 | 841 | **1.00** |
| `declaration-of-independence` | `pos` | 15 | 0 | 511 | 0.96 |
| `dracula-count-appears` | all four | 2 | 2 | 73 | 1.62 |
| `great-gatsby-closing` | all four | 4 | 4 | 83 | 1.69 |
| `parts-of-speech-close-up` | all four | 7 | 7 | 130 | 1.78 |
| `frankenstein-creation` | all four | 3 | 3 | 97 | 1.87 |
| `kinds-of-sentences` | all four | 7 | 7 | 98 | 2.04 |
| `declaration-of-independence-full` | all four | 3 | 3 | 266 | **2.11** |

Two conclusions, and the second is the one to design around:

- **The multiplier is ~1.8×, not 3×.** [C10](proposals/curriculum-unit-1-parts-of-speech.md#open-questions)
  said badging "triples the authoring cost." Measured against real lessons it is
  closer to double. Correct C10 in the new proposal rather than repeating it.
- **No fully diagrammed lesson in this repo exceeds seven sentences.** Unit 1 was
  **72**. A Unit 2 of comparable length would be ~1,500 annotations of four-layer
  diagramming — roughly ten times the largest fully badged passage that has ever
  shipped here. **That is the decision this order must make**: fewer and shorter
  passages, fewer stops, or a deliberate split of Unit 2 into two units. Write down
  a sentence count and defend it.

### 3. The badge gap — a second thing the engine cannot generate

The eight badge values live in `wjt.SENTENCE_TYPES`
([js/labels.js](../js/labels.js) lines 565–628) — `structure`: simple, compound,
complex, compound-complex; `purpose`: declarative, interrogative, imperative,
exclamatory — and **none of them is in `wjt.LABELS`** (87 labels, all layer labels).

`tapStepsFor` filters a lesson's **annotations** by label id
([js/study-model.js](../js/study-model.js) lines 182–235), so it cannot produce a
single question about a badge. This is the same shape as Unit 1's
[fact #2](proposals/curriculum-unit-1-parts-of-speech.md#2-nothing-in-the-app-can-scope-questions-to-one-part-of-speech),
which is what justified a new generator in the first place. Decide, with reasons:

- authored `choice` items only, and accept that the badge half of the unit has no
  generated questions; or
- a new step kind that classifies a whole sentence, which is a real engine change
  and needs its own numbered order.

Useful and easily missed: each axis already carries `question` and `hint` text in
`labels.js`, written for the worksheet builder. That is reusable teaching copy — do
not write new prose without reading it first.

### 4. The passage — and why Unit 1's rejects are Unit 2's best material

Unit 1 used Poe, "The Cask of Amontillado."
[Phase 2 finding 3](proposals/curriculum-unit-1-parts-of-speech.md#as-built--phase-2-2026-07-28)
records that the bare **`to`** of an infinitive had no honest POS label and therefore
ruled out roughly **a third of the story**, including the only *neither…nor* in the
text.

`infinitive` is **in** Unit 2's budget. So that discarded third is now not merely
usable but unusually well suited, and the sentences Unit 1 had to drop are written
down in that finding. Decide whether Unit 2 continues in the same story — the
continuity is a genuine asset for a student working through both units — and if so,
start from the passages Unit 1 rejected.

### 5. `C11` is decided: 019 has run

**This section was written when 019 was still open. It ran on 2026-07-29, so `C11`
is a decision with a rationale like every other row, not an open question.** Do not
copy the "Open — 019 decides" wording below into the proposal.

The finding, in one line: **the drag mechanic carries Unit 2, exact boundary
equality stays, and fairness comes from `accept` plus an authoring rule.** Two
faults in `attachSelection()` were found and fixed on the way, and the touch rows
are honestly *unverified* — no tablet was available. The full record, with the
per-input-path table and the numbers, is the
[019 section of the Unit 1 proposal](proposals/curriculum-unit-1-parts-of-speech.md#019s-answer--multi-token-selection-measured-2026-07-29),
and the suggested `C11` wording is at the end of it. Copy it from **there**, and
re-base its links: the proposal sits one directory deeper than this file.

Note in that row what Unit 1 could not tell us, which is still worth stating: all
841 of its annotations span one token, so its 131 taps never exercised drag at all.
And carry forward the two costs 019 measured, because they shape the item mix: a
keyboard student spends **13 keystrokes** on one 7-word phrase question, and a fully
annotated sentence makes the prompt read *"Select any one noun phrase — there are
18."*

### Out of scope for this order

- **Authoring any content.** No passage, teach screen, item, or stop. That is step 3.
- **Running 019.** Separate order — and it has already run; see
  [§5](#5-c11-is-decided-019-has-run).
- **Any code change at all**, including to `study-model.js`. This order writes a
  document.
- **Any taxonomy, label-id, or lesson-format change.** The 87 labels and the eight
  badges are what Unit 2 is built from, not something it edits.
- **[005](005-presentation-ui-remediation.md)'s manual matrix**, which is step 4.
- **Restoring Practice or fixing the docs that still advertise it** — still a real
  pre-existing mismatch, still not this unit's to fix. See Unit 1's
  [Out of scope](proposals/curriculum-unit-1-parts-of-speech.md#out-of-scope).

## Done when

- `plans/proposals/curriculum-unit-2-<slug>.md` exists, in the Unit 1 proposal's
  shape, with numbered `C` questions that each carry a **decision and a rationale** —
  `C11` included, since [019](done/019-multi-token-tap-spike.md) has answered it
  ([§5](#5-c11-is-decided-019-has-run)).
- It states a **sentence count and an annotation estimate**, and defends them against
  the seven-sentence ceiling measured above. A proposal that does not size itself has
  not done this order's main job.
- It decides how the eight sentence-type badges are taught and assessed.
- It corrects C10's "triples the cost" with the measured ~1.8×.
- Unit 1's proposal gains a link to it, so the
  [Unit 2 constraint note](proposals/curriculum-unit-1-parts-of-speech.md#what-unit-1-leaves-for-unit-2--one-measured-constraint-2026-07-29)
  has a forward address.
- `node tools/link-check.js --check` is clean. No code changed, so the other checks
  are unaffected — but run `node tools/smoke-test.js` once to confirm that, and
  confirm `git status` shows no `samples/` churn.
- This file moves to `plans/done/` with links re-based, per
  [plans/README.md](README.md) step 6.

## Notes

- **How the numbers here were measured.** A `vm` sandbox loading the smoke test's
  logic-file list (see `LOGIC_FILES` in [tools/smoke-test.js](../tools/smoke-test.js)),
  then: label budget from `wjt.labelsForLayer` / `wjt.filterTier` / `wjt.baseLabelsForLayer`;
  density by building each `wjt.EXAMPLES` entry and counting annotations against
  word-bearing tokens (`/[A-Za-z0-9]/`, the same test `completeness.js` uses); Unit 1
  via `wjt.study.lessonFor` over `wjt.study.unit("pos").stops`. Note that an
  annotation's `start`/`end` are **character** offsets — use `wjt.spanToTokens` for
  anything token-shaped.
- **The load-order list has six entries and three files carry it.** Adding a
  `unit-2*.js` file means [index.html](../index.html),
  [tools/dom-check.html](../tools/dom-check.html), and `UNIT_FILES` in the smoke
  test, plus [CLAUDE.md](../CLAUDE.md) constraint #4 and
  [architecture.md](../docs/project/architecture.md). Unit 1's Phase 3 note explains
  why the "stops are numbered 0…14 in path order" assertion is what catches a drift.
  Not this order's work — but the proposal's phasing should name it so step 3 does not
  discover it.
- **`wjt.study` already takes a unit id**, which is where a second unit slots in
  ([C2](proposals/curriculum-unit-1-parts-of-speech.md#open-questions) decided
  against a generic course model on a sample size of one). Unit 2 is the second
  sample. If a general model is now worth building, that is a decision for the new
  proposal to make deliberately — not to drift into.
- **The lesson from Unit 1 worth carrying forward verbatim:** *a passing check suite
  is not a played unit.* Both faults [018](done/018-unit-pos-answer-order-and-ambiguous-taps.md)
  fixed were invariants nobody had written down, and 445 green checks were silent on
  both. Whatever step 3 becomes, it ends with someone playing the unit.
- Unit 1's student-facing doc is [docs/product/curriculum-unit-1.md](../docs/product/curriculum-unit-1.md);
  Unit 2 will want its sibling, and [pilot.md](../docs/product/pilot.md) and
  [overview.md](../docs/product/overview.md) both describe the mode set and will need
  amending again. Phase that explicitly — Unit 1's Phase 1 finding 6 records that the
  doc had to be written earlier than planned because links to it already existed.
