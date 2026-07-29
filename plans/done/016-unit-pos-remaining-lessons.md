---
status: done
created: 2026-07-28
updated: 2026-07-28
---

<!-- Landed 2026-07-28. Divergence notes live in the proposal's
     "As built — Phase 2"; the important ones are summarized below. -->

> **Done 2026-07-28.** All twelve stops authored; `capstone` is the only `todo`
> left. `node tools/smoke-test.js` 0 failures, `tools/dom-check.html`
> **408 passed, 0 failed** (was 376), every other check clean.
>
> Three things a later session needs, all detailed in
> [As built — Phase 2](../proposals/curriculum-unit-1-parts-of-speech.md#as-built--phase-2-2026-07-28):
>
> 1. **The story cannot supply `possessive-pronoun` or `interrogative-pronoun`** —
>    the proposal's passage table was wrong about the latter. A stop may now
>    declare `handTaught: [ids]`; the smoke test asserts the missing set equals
>    the declared set exactly, in both directions.
> 2. **A sentence must never carry both a label and a narrower one**, or a tap
>    question gets two right answers. Now asserted over every unit passage.
> 3. **`js/unit-pos.js` is 2,325 lines** — past the ~2,000 at which the proposal
>    said to split it per cluster. Deliberately left whole here (this order is
>    content-only) and handed to [017](017-unit-pos-capstone-and-docs.md).
>
> The **hand walk-through** in Done-when was done as automation instead: dom-check
> **S-13** walks all fourteen authored stops to their results screens over
> `file:///`, and **S-12** proves each review's questions really come from the
> passages of the stops it reviews.

# Unit 1 Phase 2 — author stops 2–13

Phase 2 of [Unit 1 — The Nine Parts of Speech](../proposals/curriculum-unit-1-parts-of-speech.md).
**Content only. No new mechanics.** [015](015-study-view-and-first-lesson.md) built
and proved the machinery on Orientation and Lesson 1; this order fills in the
remaining twelve stops against the same shapes.

Do not start until 015 is `done`. If a step kind turns out to be missing something
an authored stop needs, that is a finding worth recording in the proposal's **As
built** — not a reason to redesign mid-authoring.

## Why

The unit map currently shows thirteen stops greyed out as "coming soon". A
parts-of-speech unit that teaches only nouns is not a unit.

## Scope

Author these twelve stops in `js/unit-pos.js`, each following Lesson 1's structure
exactly: a `focus` array, one Poe lesson, `teach` screens, and hand-written
`choice` items. Remove each stop's `todo: true` as it lands.

| # | id | Focus labels | Passage (¶) |
|---|---|---|---|
| 2 | `determiners` | `determiner` + article · definite-article · indefinite-article | 3, 67 |
| 3 | `pronouns` | `pronoun` + personal · possessive · reflexive · relative · demonstrative · interrogative · indefinite | 0, 2, 34, 57, 71 |
| 4 | `review-a` | mixed, stops 1–3 — **no new passage** | — |
| 5 | `verbs` | `verb` + action · linking · helping · transitive · intransitive · modal · regular · irregular | 34, 75 |
| 6 | `review-b` | mixed, stop 5 — **no new passage** | — |
| 7 | `adjectives` | `adjective` + descriptive · proper · demonstrative · possessive · quantitative · comparative · superlative | 2, 67, 75 |
| 8 | `adverbs` | `adverb` + manner · time · place · frequency · degree | 3, 70, 71, 75, 76 |
| 9 | `review-c` | mixed, stops 7–8 — **no new passage** | — |
| 10 | `prepositions` | `preposition` | 24, 67 |
| 11 | `conjunctions` | `conjunction` + coordinating · subordinating · correlative | 0, 1, 2, 66 |
| 12 | `interjections` | `interjection` | 31, 35, 49, 60, 78 |
| 13 | `review-d` | mixed, stops 10–12 — **no new passage** | — |

Paragraph indices are 0-based from the first line of prose, "The thousand injuries
of Fortunato…", in the normalized text (see 015 Task B and the proposal).

### The four review stops draw, they do not re-author

A review stop has no `lessonId` of its own. Its steps are assembled by
`study-model.js` from the `focus` sets and lessons of the stops it reviews — that
is why `steps()` takes a stop rather than a lesson. It carries a short `teach`
recap and a handful of cross-cutting `choice` items ("Both *this* and *these* can
be two different parts of speech — which two?"), and takes its `tap` items from the
cluster's existing passages. **If this needs an engine change, stop and record it
in the proposal before writing all four.**

### Rules that carry over unchanged — do not re-derive

- **Label with `line(text, labelsInTokenOrder)`, the helper in `js/unit-pos.js` —
  not with `sentence()` from `examples.js`.** This is the one thing 015 changed
  from its own plan; the reason is in the proposal's
  [As built](../proposals/curriculum-unit-1-parts-of-speech.md#as-built--phase-1-2026-07-28)
  note 1. Short function words collide under substring matching (`"he"` matches
  inside `"The"`), and a miscounted `nth` silently mislabels a word.
- **Normalization:** join wrapped lines, strip `_italic_` underscores, `--` → ` — `.
  Rules 2 and 3 are load-bearing — `_very_` and `settled--but` are each one token
  and become permanently unlabellable if skipped. **Verify with the tokenizer, not
  by eye.**
- **Change the passage, never the labelling, when a sentence contains something
  out of budget.** 015 dropped a noun sentence for containing the infinitive *"to
  seize"*. Expect this to recur, especially in the verb stop.
- **One POS annotation per word** — subtype where it is the teaching point, base
  label elsewhere, never both (**C5**).
- **No `types` badges and no `part`/`phrase`/`clause` annotations** (**C10**) —
  this is what keeps completeness satisfiable.
- `essentialOnly: true`; registry `group: "unit-pos"`.
- **Never alter Poe's wording** to make a label fit. If a focus subtype has no
  real instance in the chosen passage, cover it with a hand-written `choice` item,
  which is free to use an invented example sentence.
- **None of the six excluded ids** (`gerund`, `participle`, `infinitive`,
  `particle`, `relative-adverb`, `emphatic-pronoun`) appears in any `focus`. Where
  a passage contains a verbal, label it with the base `verb`.

### Watch items specific to these stops

- **`verbs` is the heaviest stop** — eight subtypes, roughly double the others.
  Split its `teach` screens into two sittings within the one stop rather than
  cutting subtypes.
- **`determiners` and `adjectives` overlap on purpose.** `this`/`these` are a
  `demonstrative-adjective` before a noun and a `demonstrative-pronoun` standing
  alone; `my`/`his` are `possessive-adjective` before a noun. Those distinctions
  are the teaching point of Review A and Review C, not a labelling error. Be
  consistent with what the passage actually shows and say so in the note.
- **`prepositions` has no subtypes** (nor does `interjection`). Its lesson is
  about the base label plus the preposition/particle boundary — mention that
  `particle` exists and is Advanced without teaching it.
- **`interjections` sits outside the sentence's structure.** `completeness.js`
  already knows this and exempts interjections from clause coverage; since unit
  lessons carry no clause labels it does not bite here, but it is the reason this
  stop is last.

## Out of scope

- **The capstone** (stop 14) and the `sort` step kind — both in
  [017](017-unit-pos-capstone-and-docs.md).
- **Any new step kind, engine change, or view change.** If one seems necessary,
  that is a finding to record, not to implement here.
- Every exclusion in 015 still holds: no taxonomy change, no lesson-format change,
  no change to `quiz.js` or the `assignment-*` modules, no teacher-facing progress.

## Done when

- All twelve stops authored; no `todo: true` remains except `capstone`.
- The union of every authored stop's `focus` is a subset of the 48 budgeted labels
  with no id in two stops' `focus` — the smoke test asserts this already.
- Each of the nine focus stops carries at least one real annotation for every one
  of its `focus` labels (asserted).
- `node tools/smoke-test.js` — **0 failures**, completeness clean on all eleven
  unit lessons; `samples/` regenerated and **committed**.
- `node tools/validate-lesson.js --complete samples/*.json` — clean.
- `node tools/link-check.js --check` and `node tools/gen-docs.js --check` — clean.
- `tools/dom-check.html` — **0 failed**.
- By hand, from a double-clicked `index.html`: walk stops 2 through 13 end to end,
  including all four reviews, and confirm each review draws real questions from its
  cluster's passages.

Report check output honestly; a red run is reported red with its output.

## Notes

- Keep the normalization probe script from 015 — nine more passages go through it.
- The proposal's passage table lists, per label, a verified real instance in the
  story. Use it; it was built by reading the text.
