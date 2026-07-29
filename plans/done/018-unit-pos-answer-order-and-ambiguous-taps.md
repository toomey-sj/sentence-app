---
status: done
created: 2026-07-29
updated: 2026-07-29
---

> **Done 2026-07-29.** Both faults found by **playing the unit**, which is worth
> noting: 460 dom-checks and a clean smoke test had nothing to say about either,
> because both were invariants nobody had thought to write down.
>
> `node tools/smoke-test.js` 0 failures, `tools/dom-check.html` **460 passed, 0
> failed** (was 445), every other check clean. No annotation changed — `samples/`
> regenerates byte-identical.
>
> Three things a later session needs:
>
> 1. **The option shuffle is SEEDED, not random**, and that is load-bearing rather
>    than fussy. `steps()` is called more than once for the same stop and callers
>    compare the results — `tools/dom-check.html` re-derives a step to work out
>    which option it must click in order to answer *wrong* on purpose. A per-call
>    `Math.random()` order would make it click the right answer while asserting a
>    wrong one, intermittently. If you ever want a fresh order per attempt, the
>    harness has to read the step out of the view instead.
> 2. **Items are still authored correct-answer-first.** That convention did not
>    change and should not — it is the readable way to write a question. The
>    shuffle happens on delivery, and the smoke test asserts *both* halves, so
>    "the source is correct-first" is a check, not a leftover.
> 3. **An `accept` entry now carries the span in both forms** (`{first,last}` token
>    indices *and* `{start,end}` character offsets). Anything that builds a `tap`
>    step must fill in all four, and `accept` must stay in reading order — the view
>    lists it.

# Unit 1 — randomize answer order, and own up to taps with several right answers

Two faults in the delivered questions of
[Unit 1 — The Nine Parts of Speech](../proposals/curriculum-unit-1-parts-of-speech.md),
both found by playing the finished unit rather than by any check.
[017](017-unit-pos-capstone-and-docs.md) is `done`, so nothing blocks this.

## Why

**1. The correct answer was always the first option.** All **77** authored
`choice` items in the unit put `correct: true` on option one — every single one,
across all fifteen stops. That is the readable way to write a question and a
catastrophe to play: a student who notices scores 100% on every multiple-choice
question in the unit without reading a word of it. The reviews and the capstone
included, which means the assessment measured nothing.

**2. A third of the tap questions asked for "the" noun when the sentence had
two.** `tapStepsFor` generates "Select the *preposition* in this sentence" from
each annotation, but the passages are real Poe — **42 of 131** generated questions
ask for a label that appears more than once in that sentence, one of them for an
interjection in a sentence with fifteen of them.

The scoring was already fair here: `accept` covered every same-label span, so any
of them counted. The *reporting* was not. `accept` held token ranges only, so the
reveal could only ever highlight the span the question was generated from — a
student who correctly picked "vaults." was told **"Correct"** and then shown
**"moss"**, with the feedback announcing 'the noun is "moss"'. A right answer that
gets contradicted reads as a broken app, and a prompt asking for "the" preposition
in a sentence with six of them is simply not a true question.

## Scope

### Task A — shuffle the delivered answer order

`js/study-model.js`. `steps()` shuffles a `choice`'s `options` and a `sort`'s
`words` on the way out. Authoring is untouched.

Also shuffle the **sort words**: they were authored cycling through the buckets in
order (`revenge→noun, an→determiner, himself→pronoun, Montresors→noun, …`), which
is the same giveaway in a different shape.

### Task B — say how many right answers a tap has

`js/study-model.js` + `js/study.js`. An `accept` entry carries both forms of the
span; the prompt states the count when there is more than one; the reveal
highlights the word the student actually picked.

### Out of scope

- **Rewriting any question.** No stem, option, feedback, note, or annotation
  changes. This is a delivery change end to end, which is why `samples/`
  regenerates identically.
- **Narrowing what a tap accepts.** See Q2.

## Open questions

**Q1 — random per attempt, or stable per question?**
**Decided: stable, seeded from the stem.** A per-call shuffle breaks
`tools/dom-check.html`, which calls `steps()` a second time to find the option it
must click to answer wrong on purpose, and would do so *intermittently* — the
worst kind of red. Seeding from content also keeps `steps()` a reproducible
function of the unit data, which is the property that makes the rest of the study
suite assertable at all. The student still never sees authored order and never a
fixed slot: measured spread over the 77 items is **18/16/19/24** across the four
positions, longest run of the same position **3**.

**Q2 — name the ordinal ("select the *second* preposition") and accept only that
one, or state the count and accept any?**
**Decided: state the count, accept any.** The ordinal reading is the more precise
question and it was the one first asked for, but it turns 42 grammar questions
into a counting exercise, and it does not survive its own worst case: Poe's
thirty-first paragraph is `"Ugh! ugh! ugh! — ugh! …"`, and "select the twelfth
interjection" of fifteen identical words is a joke. Stating the count keeps the
question about parts of speech, keeps the existing fairness rule instead of
narrowing it, and reads correctly at every count from 2 to 15. Ordinals stay
available if a later unit is built on sentences written to have one answer.

**Q3 — pluralize the label name in the prompt?**
**Decided: no — keep it singular and put the count in its own clause.** "Adverb of
Frequency" and "Particle (phrasal verb)" have no naive `+s` plural, and a
pluralizer is a lot of machinery to mis-render a label name. *"Select any **one**
adverb of frequency in this sentence — there are 3."* needs none.

## Done when

- No stop delivers its answers in authored order; the answer appears in all four
  slots across the unit, and no slot takes more than half.
- Two `steps()` calls for one stop agree.
- A tap with several right answers says how many, accepts any of them, and reveals
  and names **the one the student picked**.
- `node tools/smoke-test.js` clean and `samples/` unchanged; `tools/dom-check.html`
  0 failed; every other check clean.

## Verification at the close

| Check | Result |
|---|---|
| `node tools/smoke-test.js` | **0 failures**, and `samples/` regenerates byte-identical — no annotation changed |
| `node tools/gen-docs.js --check` | clean — the taxonomy really was untouched |
| `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md` | clean |
| `node tools/link-check.js --check` | clean |
| `node tools/cvd-check.js --check` | clean |
| `tools/dom-check.html` | **460 passed, 0 failed** (was 445), at all four matrix sizes |

Every new assertion was **falsified before being trusted**, per
[014](014-ui4-dom-check-settle.md)'s standard:

- making `shuffled()` return its input reddens four smoke checks — and reports the
  tally `77/0/0/0`, which is the original fault stated as a number — plus three
  `S-16` checks, including "clicking the first option is WRONG";
- **swapping the seeded PRNG for `Math.random()`** reddens the smoke check "two
  `steps()` calls for one stop deliver the SAME order", and then reddens
  `tools/dom-check.html` **2, 3, and 0 times over three consecutive runs**. That
  third run is the point of Q1: an unseeded shuffle is not reliably red, it is
  *flaky*, and the third run would have been committed as green;
- dropping `{start,end}` from an `accept` entry reddens all four of the new tap
  checks;
- restoring the old reveal — `shown = {start: step.start, end: step.end}`, with
  everything else in place — reddens exactly the two `S-17` checks that are about
  the defect, and **nothing else**, which is what makes them worth having.

That last falsification also caught a **weak check of my own**: "the feedback names
the word the student picked" passed under it, because the two-answer wording names
both words ("…is a noun. The other one is “moss”."), so a bare `indexOf` was
satisfied by the two being the wrong way round. It now asserts the picked word is
the *subject* — `“vaults.” is ` — and reddens as it should.

## Notes

Two prose bugs fell out of reading the real rendered feedback, both of which had
been shipping and neither of which any check would have caught:

- `"is a interjection"` — the new wording needed an `a`/`an` helper.
- `“vaults.”.` — Poe's tokens carry their own punctuation, so a full stop after the
  closing quote reads as a typo. `stopAfter()` takes the **raw** word, not the
  escaped one, or `&quot;` hides the quote mark that ends `ugh!"`.

The lesson worth keeping from this order: **play the thing.** Both faults were
invariants nobody had written down, and 445 passing checks were silent on both.
