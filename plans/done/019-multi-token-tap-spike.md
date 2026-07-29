---
status: done   # todo | doing | done | superseded
created: 2026-07-29
completed: 2026-07-29
---

# Spike: can a student select a multi-token span? (Unit 2 precondition)

> **Answered, 2026-07-29. Yes — and two faults were fixed on the way.**
>
> The durable record is
> [019's answer in the Unit 1 proposal](../proposals/curriculum-unit-1-parts-of-speech.md#019s-answer--multi-token-selection-measured-2026-07-29):
> the Q-A table per input path, the two faults, and Q-B's decision with the
> `C11` wording for the Unit 2 proposal. Read that, not this — this file is the
> question and the method.
>
> In short: **Q-A** — a multi-token drag works with a mouse and a pen, including
> across a line wrap, and the keyboard path reaches a span at a cost of 13
> keystrokes; the **touch and zoom rows are honestly *not verified*,** because no
> tablet was available and a synthetic touch-type pointer event is not a finger.
> **Q-B** — keep exact boundary equality; `accept` already holds every same-label
> span, so fairness at phrase level is an authoring rule ("annotate every
> same-label span you would accept"), not an engine change. A span-choice step kind
> was considered and declined as the default: it turns production into recognition.
>
> **The two faults**, both in [`js/render.js`](../../js/render.js)
> `attachSelection()`, both reachable in the Unit 1 that shipped, both fixed here
> with regression checks (`MT-3`, `MT-4`) that are red on the pre-fix code:
> a **`pointercancel` leak** that let the selection follow an unpressed pointer and
> be scored by Check, and a **plain Arrow that did not abandon the selection
> anchor**, so a keyboard retry was measured from the abandoned one. `MT-1`, `MT-2`
> and `MT-5` in [tools/dom-check.html](../../tools/dom-check.html) now hold the
> multi-token drag itself, which had shipped unexercised.
>
> The tap tip at [`js/study.js`](../../js/study.js) line 476 was **left alone**:
> nothing here falsified it. The tablet walk is still owed — see
> [005](../005-presentation-ui-remediation.md#deferred-and-what-the-matrix-is-missing).

**This order's deliverable is a decision, not a feature.** It answers one question
and writes the answer down. If it ends in "no, drag is not good enough — Unit 2
needs a different mechanic," that is a **success**: it is the outcome that saves
the authoring.

> **Where this sits in the sequence:** [020](../020-unit-2-groundwork.md) is the
> handoff for Unit 2 and carries the whole running order. This order is its step 2
> and is **not blocked by step 1** — the two can run in either order or at once.
> This order's finding becomes `C11`'s decision in the Unit 2 proposal that step 1
> drafts.

## Why

Unit 1 taught the `pos` layer, where every annotation is one word. Unit 2's subject
is sentence parts, phrases, and clauses — spans that are **multi-token by
definition**. That makes a mechanic load-bearing that the finished unit never once
exercised.

Measured, not assumed (see [Notes](#notes) for the probe):

| | |
|---|---|
| Unit 1 annotations | **841**, across 11 passages and 72 sentences |
| …spanning more than one token | **0** |
| Generated `tap` questions | **131** |
| …requiring a multi-token selection | **0** |

So every `tap` in the shipped unit is a single click on a single word. The
drag-to-select path in [`js/render.js`](../../js/render.js) `attachSelection()`
(~line 784: `pointerdown` → `pointermove` → `pointerup`, with tokens set
`touch-action: none` in CSS) has **never been exercised by a student**, on any
device, in the one student-facing surface that exists.

Three things make that worth an afternoon before authoring Unit 2 rather than
during it:

1. **[pilot.md](../../docs/product/pilot.md) names this exact thing as the product's
   least-tested surface** — *"Drag-to-select on an iPad is…"* (line 157). It has
   been a known risk since before Study mode existed.
2. **`sort` was designed specifically to avoid it.** Phase 3 finding 3 of the
   [Unit 1 proposal](../proposals/curriculum-unit-1-parts-of-speech.md#as-built--phase-3-2026-07-29)
   records that the chips deliberately never move, *because* drag is the thing most
   likely to be broken on a tablet. Unit 2 cannot dodge it the same way: a phrase
   question is a question about a span.
3. **The app already tells students to drag.** The tap tip at
   [`js/study.js`](../../js/study.js) line 476 reads *"Click a word (or drag across
   several; or Tab to a word and use Shift+Arrow)"* — an instruction no question in
   the unit currently requires, and which nobody has confirmed works on touch.

**The engine is very likely already fine, which is what makes this a spike and not
a build.** `tapStepsFor` resolves spans with `wjt.spanToTokens` and stores
`{ first, last, start, end }`; `wjt.study.check` compares
`r.first === response.first && r.last === response.last`
([`js/study-model.js`](../../js/study-model.js) lines 196–228 and 474–479). Both are
already token-range generic. The open question is the **student's** side —
input on touch, and fairness at phrase boundaries — not the model's.

## Scope

Build the smallest thing that produces a real answer, then throw the content away.

### 1. A throwaway multi-token passage

One short passage with `phrase`- and/or `clause`-layer annotations over real
multi-token spans, wired far enough to produce generated `tap` steps. **Do not
author Unit 2 content, do not add a stop to the registered unit, and do not touch
[`js/labels.js`](../../js/labels.js).** A scratch lesson used only by the probe is
enough; if it is easier to reach through the existing unit machinery, add it and
remove it in the same session the way `S-5` pushes and pops its synthetic stop.

### 2. Answer the two questions

**Q-A — Does multi-token selection work on real touch hardware?** Walk it on an
iPad or Android tablet if one is available. Record per input path:

| Path | What to record |
|---|---|
| Touch drag across 2–4 tokens | Does the selection start, extend, and commit? Does the page scroll instead? |
| Touch drag spanning a **line wrap** | The grid wraps; a span crossing a wrap is the case most likely to break |
| Mouse drag | Regression baseline — expected to work |
| Tab + Shift+Arrow, Enter to commit | Already the documented keyboard path; confirm it reaches a multi-token span |
| 125% / 150% zoom | Hit areas shrink relative to fingers |

If no touch hardware is available, **record it as *not verified* and say so** — do
not substitute a devtools touch emulator and call it verified. That distinction is
the whole value of the row.

**Q-B — Is exact-boundary equality fair at phrase level?** `check()` requires the
student's `first`/`last` to equal an accepted span's exactly. For one word that is
unambiguous. For *"of the vaults"* versus *"the vaults"*, a student can be right
about the grammar and wrong about the boundary, and phrase boundaries are arguable
in a way single words are not. Decide, with reasons:

- exact equality (and prompt wording that makes the boundary unambiguous), or
- an accepted-boundary set per question, the way `accept` already holds every
  same-label span, or
- a different step kind for phrases — the `sort`-shaped answer, where the student
  chooses among candidate spans rather than producing one.

Do not implement the answer here. Q-B's output is a paragraph in the Unit 2 design
record.

### Out of scope

- **Authoring any Unit 2 content.** Passages, teach screens, items, stops.
- **Any change to the taxonomy, lesson format, or label ids.**
- **Any change to `wjt.study.check`, `tapStepsFor`, or `attachSelection`** — unless
  the spike finds an outright *bug* on a path Unit 1 already depends on, which is a
  fix worth landing on its own and noting here.
- **The Unit 2 proposal itself.** This order feeds it; it does not write it.
- **[005](../005-presentation-ui-remediation.md)'s manual matrix.** That walk is
  deferred and waits on this answer — see its
  [Deferred, and what the matrix is missing](../005-presentation-ui-remediation.md#deferred-and-what-the-matrix-is-missing).

## Done when

- A multi-token `tap` has been produced and attempted through the real
  `attachSelection()`, and Q-A is answered per input path — each row either
  **verified** on named hardware or explicitly **not verified**, never inferred.
- Q-B has a decision with a reason, in prose.
- Both answers are written into a durable record: the Unit 2 design document if it
  exists by then, otherwise appended to the Unit 1 proposal beside the existing
  Unit 2 deferral note, so the finding does not live only in this file.
- All scratch content is removed. `node tools/smoke-test.js` and the browser DOM
  check report **0 failed**, and `git status` shows no stray passage.
- This file is moved to `plans/done/` with its links re-based, per
  [plans/README.md](../README.md) step 6.

A spike that concludes "drag is unusable on a tablet; Unit 2 should use a
span-choice step kind" is **done**, not failed.

## Notes

- **Why this order precedes the Unit 2 proposal, which is the reverse of the usual
  sequence.** [015](015-study-view-and-first-lesson.md)–[018](018-unit-pos-answer-order-and-ambiguous-taps.md)
  were all written against an existing design record, and
  [plans/README.md](../README.md) is right that design decisions belong in a durable
  document rather than a work order. This one runs first deliberately: the answer
  to Q-A and Q-B changes what the Unit 2 proposal can *say* about its item mix and
  step kinds, so writing the proposal first means rewriting its design section.
  [014](014-ui4-dom-check-settle.md) is the precedent — a numbered order that
  unblocked an acceptance bar rather than implementing a designed feature. Recorded
  because a future session would otherwise read the ordering as a process slip.
- **How the numbers above were measured, so they can be re-measured.** A `vm`
  sandbox loading the smoke test's `LOGIC_FILES` list plus the six `unit-pos*.js`
  files, then for every stop: `wjt.study.lessonFor(...)` for the passage and
  `wjt.study.steps("pos", stop.id)` for the questions, counting tokens per
  annotation with `wjt.tokenize` and comparing each span's token range. Note that
  an annotation's `start`/`end` are **character** offsets, not token indices — a
  naive `end - start > 1` says 779 of 841 and is measuring word length, not span
  width. Use `wjt.spanToTokens`.
- **The teach-screen/`focus` machinery is not in question here.** Phase 2 finding 4
  (unlimited fallback taps) and Phase 3 finding 2 (`tapPerLabel`) both still apply
  and will matter to Unit 2's authoring, but neither depends on span width.
- **`js/study.js` line 476's tip is the one line of shipped text this spike could
  falsify.** If drag turns out not to work on touch, that instruction is wrong
  today — for Unit 1, on a tablet, with no Unit 2 in sight. Worth fixing
  immediately if so, independently of everything else here.
  *As run: not falsified, so not touched.*
- **How the throwaway passage was reached, in case a later spike wants the same
  trick.** The probe lived outside the repo (a session scratchpad HTML file loading
  `js/*.js` by absolute `file:///` path, so no stray file could be left behind) and
  pushed a scratch entry onto `wjt.EXAMPLES` plus a scratch stop onto
  `wjt.study.unit("pos").stops`, called `wjt.study.clearCache()`, routed to
  `#/study/pos/<scratch>`, and popped both again — the same push/pop `S-5` uses for
  its synthetic stop. `focus: ["prepositional-phrase"]` over a phrase-annotated
  passage is all it takes to make `steps()` generate multi-token `tap` questions;
  no taxonomy, engine, or unit-content change is involved. Two things cost an hour
  each and are now written into
  [testing.md](../../docs/project/testing.md#toolsdom-checkhtml): a fixture below
  the fold makes every drag collapse to a single tap (`elementFromPoint` only
  answers for on-screen coordinates), and pointer moves must be dispatched at the
  *pressed* element, not the one under the pointer.
