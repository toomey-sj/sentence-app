---
status: doing
created: 2026-07-28
updated: 2026-07-28
---

# Unit 1 — The Nine Parts of Speech

The design record for the first unit of a student-facing independent-study
curriculum: a self-paced course inside Sentence Forge that teaches each part of
speech and immediately checks recall with interactive quizzes.

This is the durable document. The work is split across
[015](../done/015-study-view-and-first-lesson.md),
[016](../016-unit-pos-remaining-lessons.md), and
[017](../017-unit-pos-capstone-and-docs.md); "As built" sections are written back
into **this** file, following the precedent of
[assignment-mode-proposal.md](assignment-mode-proposal.md).

- [Why](#why)
- [What the codebase already decides for us](#what-the-codebase-already-decides-for-us)
- [The passage: Poe](#the-passage-poe-the-cask-of-amontillado-1846)
- [Scope and sequence](#scope-and-sequence)
- [Label budget](#label-budget)
- [Design](#design)
- [Open questions](#open-questions)
- [Out of scope](#out-of-scope)
- [Phasing](#phasing)

---

## Why

Sentence Forge is a teacher's authoring tool. **A lesson — one passage — is the
largest artifact in the app, and there is nothing above it.** No unit, no
sequence, no course; the repo has zero occurrences of "curriculum",
"independent study", or "scope and sequence" as product concepts. The only
sequencing that exists is one paragraph of advice in
[teacher-guide.md](../../docs/product/teacher-guide.md) — *"Building a unit
across a week: enable only Parts of Speech on Monday…"*.

[roadmap-platform.md](../../docs/roadmap-platform.md) **P1** names the gap
directly: *"What is missing is everything **above** the lesson: durability,
sequencing, and sharing."* Durability and sharing got seams S1–S5. Sequencing has
never been designed. This is the first attempt at it, and it is deliberately
attempted as **content plus one new student-facing surface**, not as a data model
for arbitrary courses — because we do not yet know what a second unit needs.

The fit with the existing taxonomy is unusually clean. The `pos` layer has
**exactly nine base labels** ([js/labels.js](../../js/labels.js) lines 52–324):

| # | id | name | abbr | color |
|---|---|---|---|---|
| 1 | `noun` | Noun | `N` | `#f5a623` |
| 2 | `verb` | Verb | `V` | `#f4574d` |
| 3 | `adjective` | Adjective | `Adj` | `#4d9df4` |
| 4 | `adverb` | Adverb | `Adv` | `#a06bf5` |
| 5 | `pronoun` | Pronoun | `Pro` | `#f57f2c` |
| 6 | `preposition` | Preposition | `Prep` | `#1fbfa5` |
| 7 | `conjunction` | Conjunction | `Conj` | `#ef5da8` |
| 8 | `determiner` | Determiner | `Det` | `#8fc93a` |
| 9 | `interjection` | Interjection | `Int` | `#e3c229` |

`determiner` occupies the slot a textbook calls "articles", which is why the
traditional count of nine comes out exactly right. **No label is added, renamed,
reparented, or retired. The taxonomy is not touched by this unit.**

## What the codebase already decides for us

Four facts, each verified in the source, that removed a design option.

### 1. A built-in lesson must label every word

[tools/smoke-test.js](../../tools/smoke-test.js) line 1105 runs `checkLesson()`
from [tools/completeness.js](../../tools/completeness.js) as a **blocking**
`check()` on every entry in `wjt.EXAMPLES`. Rule 1 applies to every sentence,
fragments included: each word-bearing token needs at least one `pos` annotation.

**Consequence:** a deliberately partial "nouns-only" passage cannot ship as a
built-in example. Every unit passage is fully labelled at the POS layer.

The escape hatch that makes this affordable is already in use: a sentence with
**no `types` badge** is treated as an intentional fragment and is exempt from the
clause and subject/predicate rules. That is how `declaration-of-independence`
ships as a `pos`-only lesson with 15 sentences. **Unit passages set no `types`
and use no `part`/`phrase`/`clause` annotations** — sentence structure is Unit 2's
subject, and carrying it here would triple the authoring cost for content the unit
never teaches.

### 2. Nothing in the app can scope questions to one part of speech

Both question generators select by **layer**, never by label family:

- `annsForLayers` in [js/quiz.js](../../js/quiz.js) line 29 — Practice mode.
- `skills` = `LAYER_ORDER.concat(SENTENCE_TYPE_ORDER)` in
  [js/assignment-model.js](../../js/assignment-model.js) line 79 — the worksheet
  builder.

So neither can run a "nouns only" check, and a lesson-of-the-day cannot narrow
either of them. **This is the single strongest reason the unit needs its own
question generator.** It is also small: filter a lesson's annotations to a set of
label ids and emit one question each — roughly twenty lines in
`js/study-model.js`.

### 3. The renderer is reusable exactly as it stands

`wjt.renderSentence(sentence, opts)` ([js/render.js](../../js/render.js) line 52)
returns `{ root, grid, tokens, tokenEls, selection, setLayers }` and already
supports every mechanic the unit needs:

- `showAnnotations: false` — a bare sentence with no labels showing.
- `highlight: { start, end }` — spotlight a span for an identify-style question.
- `interactive: true` — attaches `wjt.attachSelection`, giving
  `selection.get()` / `selection.clear()` with mouse, touch, click, and
  Tab + Shift+Arrow keyboard paths.

Quiz mode's `find` question is the working precedent
([js/quiz.js](../../js/quiz.js) lines 314–351). The unit copies its shape rather
than inventing one, which also inherits its accessibility work.

### 4. Authoring in JS avoids an open importer bug

[to-do.md](../../to-do.md) items 1–3 record that `match` resolution in
hand-written lesson JSON still misses on `…` versus `...` and on an em dash versus
`--`, because those substitutions change string length and cannot use the
offset-preserving fold. The `sentence()` helper in
[js/examples.js](../../js/examples.js) resolves matches with
`text.indexOf(match)` against **the same JS string literal**, so the bug cannot
fire. Authoring the unit in JavaScript rather than JSON sidesteps it entirely —
and this passage is full of dashes.

## The passage: Poe, "The Cask of Amontillado" (1846)

One continuing story across every stop. Public domain, a 9th-grade staple, and
short enough (~2,300 words) to source all eleven passages from.

**Chosen over "The Tell-Tale Heart" for a concrete reason: proper nouns.**
"Tell-Tale Heart" names no character, city, or object at all, which leaves
`proper-noun` and `collective-noun` with nothing real to point at.
"Amontillado" supplies, in the text itself:

| Label needing a real instance | Instance in the story |
|---|---|
| `proper-noun` | Fortunato · Luchesi · Montresors · Amontillado · Medoc · De Grave · Paris · Italians |
| `collective-noun` | "a great and numerous family" · "the brotherhood" · "the masons" · "A succession of… screams" |
| `abstract-noun` | revenge · insult · impunity · retribution · madness · astonishment |
| `concrete-noun` | flambeaux · trowel · bones · padlock · bells · granite |
| `possessive-noun` | "the river's bed" |
| `proper-adjective` | "the Italian vintages" · "the British and Austrian millionaires" |
| `correlative-conjunction` | "neither by word nor deed" · "rather to glow than flame" |
| `superlative-adjective` | "the earliest indication" · "the most remote end" · "the inmost recesses" |
| `comparative-adjective` | "another less spacious" · "the more satisfaction" · "A moment more" |
| `adverb-of-frequency` | "I should never have done wringing his hand" · "Once more" |
| `reflexive-pronoun` | "He prided himself" · "I busied myself" · "within itself" |
| `interrogative-pronoun` | "How?" · "And the motto?" · "You?" |
| `indefinite-pronoun` | "If any one has a critical turn" · "a mere nothing" · "one and all" |
| `interjection` | "Ugh! ugh! ugh!" · "Good!" · "Enough" · "Ha! ha! ha!" · "Yes, yes" |

That table is the reason to use this story, and it was built by reading the text,
not from memory.

### Sourcing and normalization — verified, not assumed

Source: Project Gutenberg [ebook 1063](https://www.gutenberg.org/ebooks/1063)
(`pg1063.txt`). That edition needs **three typographic normalizations**, and two of
them are load-bearing — skip either and a word becomes permanently unlabellable,
silently:

| # | Normalization | Why it is required |
|---|---|---|
| 1 | Join lines wrapped mid-sentence into one string | The source hard-wraps at ~72 columns. |
| 2 | `_italic_` → `italic` (strip underscores) | `wjt.tokenize` splits on whitespace, so `_very_` is **one token including the underscores** and can never be labelled as the word *very*. |
| 3 | `--` → ` — ` (spaced em dash) | This edition uses double hyphens, so `settled--but` is **one token** and neither word can be labelled. Spacing the dash makes it its own pure-punctuation token, which `completeness.js` correctly exempts (`/[A-Za-z0-9]/` test). |

No word, no comma, and no capital is changed. Hyphenated compounds
(`to-day`, `tight-fitting`, `parti-striped`, `mason-work`, `re-echoed`) are left
alone — they are single tokens on purpose and are labelled as single words.

**This was verified rather than reasoned about.** The normalized paragraphs were
run through the real `wjt.splitSentences` and `wjt.tokenize` in a `vm` sandbox and
asserted to contain no leftover underscore and no token holding two
letter-runs glued by punctuation. `settled — but` correctly yields three tokens.
Re-run that probe if the passage set changes.

### A passage is a curated set of sentences, in story order

Not necessarily contiguous. The lesson format is an ordered `sentences` array with
no contiguity requirement, and `declaration-of-independence` already ships 15
selected sentences. Curating lets every stop guarantee **at least one real
instance of each of its focus labels**, which is what makes the smoke-test
assertion below satisfiable by construction.

Paragraph indices below refer to the normalized paragraph list (0-based, from the
first line of prose, "The thousand injuries of Fortunato…").

## Scope and sequence

Fifteen stops. Nine focus lessons in a building order — the words that name, then
the word that acts, then the words that modify, then the words that connect —
grouped into four clusters. **Cluster reviews introduce no new passage**; they
re-draw from lessons already completed.

| # | id | Stop | Focus labels | Passage (¶) |
|---|---|---|---|---|
| 0 | `orientation` | **Orientation** | all nine bases, named only | 3, 49, 50, 71 |
| — | | *Cluster A — Words that name* | | |
| 1 | `nouns` | Nouns | `noun` + common · proper · collective · abstract · concrete · possessive | 0, 24, 44, 51 |
| 2 | `determiners` | Determiners | `determiner` + article · definite-article · indefinite-article | 3, 67 |
| 3 | `pronouns` | Pronouns | `pronoun` + personal · possessive · reflexive · relative · demonstrative · interrogative · indefinite | 0, 2, 34, 57, 71 |
| 4 | `review-a` | *Review A* | mixed, stops 1–3 | — |
| — | | *Cluster B — The word that acts* | | |
| 5 | `verbs` | Verbs | `verb` + action · linking · helping · transitive · intransitive · modal · regular · irregular | 34, 75 |
| 6 | `review-b` | *Review B* | mixed, stop 5 | — |
| — | | *Cluster C — Words that modify* | | |
| 7 | `adjectives` | Adjectives | `adjective` + descriptive · proper · demonstrative · possessive · quantitative · comparative · superlative | 2, 67, 75 |
| 8 | `adverbs` | Adverbs | `adverb` + manner · time · place · frequency · degree | 3, 70, 71, 75, 76 |
| 9 | `review-c` | *Review C* | mixed, stops 7–8 | — |
| — | | *Cluster D — Words that connect and exclaim* | | |
| 10 | `prepositions` | Prepositions | `preposition` | 24, 67 |
| 11 | `conjunctions` | Conjunctions | `conjunction` + coordinating · subordinating · correlative | 0, 1, 2, 66 |
| 12 | `interjections` | Interjections | `interjection` | 31, 35, 49, 60, 78 |
| 13 | `review-d` | *Review D* | mixed, stops 10–12 | — |
| 14 | `capstone` | **Capstone** | all nine, all 48 | 77, 88 |

**Why nouns first and interjections last.** Determiners introduce nouns and
pronouns replace them, so they are unteachable before nouns; adjectives modify
nouns and pronouns, and adverbs modify verbs, so both clusters depend on the two
before them. Prepositions and conjunctions are relational and read most easily
once the things being related are named. Interjection is last because it is the
only part of speech that sits **outside** the sentence's structure — which is a
useful thing to say at the end and a confusing thing to say at the start.

**Student time:** orientation ~10 min, each focus lesson 20–25 min, each review
~10 min, capstone ~30 min → roughly **5 hours**, a two-week independent study.

**Question bank:** ~260 items, of which ~190 are hand-written and ~70 are
generated from passage annotations at run time.

## Label budget

The POS layer holds **54** labels: 9 base + 45 subtypes. Unit 1 teaches **48** —
the 9 bases plus 39 subtypes. The remaining 6 are excluded deliberately, and the
smoke test asserts both numbers so the budget cannot drift.

**Deferred to Unit 2 (Sentence Parts and Phrases): `gerund`, `participle`,
`infinitive`.** The taxonomy files these under `verb` because textbooks introduce
them as verb forms, but each one *does the work of a different part of speech* —
which is a phrase-level idea, and the app already carries `gerund-phrase`,
`participial-phrase`, and `infinitive-phrase` on the `phrase` layer. Teaching them
inside a parts-of-speech unit invites exactly the confusion the unit exists to
prevent ("*Skating* is a noun? but it's a verb!"). Where a passage contains one,
it is labelled with the base `verb` so POS completeness still passes.

**Excluded as Advanced tier: `particle`, `relative-adverb`, `emphatic-pronoun`** —
the three POS labels carrying `tier: "advanced"`. Every unit lesson sets
`essentialOnly: true`, the existing flag for precisely this, which also narrows
the editor palette for a teacher who opens one of these passages.

## Design

### Naming — do not add another `unit`

`unit` is taken. `wjt.LAYERS[].unit` is the **linguistic** unit of a layer
("word", "group of words", "phrase", "clause") and is referenced in five docs.

- **"Unit" in student- and teacher-facing prose.** It is the right curriculum word.
- **`study` in all code.** `wjt.views.study`, `wjt.study`, `js/study-model.js`,
  route `#/study/pos/<stopId>`, storage key `sentenceForge.study.pos.v1`.
- **Never a bare `unit` property.**

### Three new files

| File | DOM? | Responsibility |
|---|---|---|
| `js/unit-pos.js` | **DOM-free** | The content: eleven Poe lesson builders registered into `wjt.EXAMPLES`, the teach screens, the hand-written question bank, and each stop's focus-label set. |
| `js/study-model.js` | **DOM-free** | The engine: assemble a stop's step list, generate passage questions from annotations filtered to the focus labels, check answers, score, read and write progress. |
| `js/study.js` | DOM | `wjt.views.study` — the unit map, teach screens, quiz screens, results. |

The app becomes **sixteen** JS files. Both DOM-free files join the smoke test's
`vm` sandbox list, which is what proves they are DOM-free; that means
[CLAUDE.md](../../CLAUDE.md) constraint #4 and the file map in
[architecture.md](../../docs/project/architecture.md) both need updating in the
same change.

**Split `js/unit-pos.js` per cluster if it passes ~2,000 lines.** For scale,
`js/examples.js` is 1,776 lines for nine lessons, and this file carries eleven
lessons *plus* ~190 authored questions.

`sentence()` and `make()` are private to the `examples.js` IIFE (lines 15–48).
Export them additively as `wjt.exampleAuthoring = { sentence, make }` so there is
one authoring idiom and one place where annotation offsets are computed. Do not
copy them.

### The unit's lessons are ordinary lessons

Each passage is a normal lesson object built by `make()`, so it inherits
everything: the smoke test validates its annotations, boundaries, round-trip, and
completeness; `samples/<id>.sentence-forge.json` is regenerated for teachers who
want the file; and a teacher can Present or Edit it. Registry entries gain one
additive field, `group: "unit-pos"`.

**The study view builds its passages directly from `js/unit-pos.js` and never
reads `wjt.store`.** A student completes the whole unit without adding anything to
their library; the Example library cards are a separate convenience for teachers.

### Step kinds

Four. The first is not a question.

| Kind | The student sees | Checked by |
|---|---|---|
| `teach` | A concept screen: what this part of speech does, then each focus subtype with its `wjt.LABELS[id].desc`, its `.example`, and a swatch of its real palette color. No answer. | — |
| `choice` | A hand-written stem, 3–4 options, feedback on every option. Carries the concept and rule questions the app cannot generate — "Which of these is a collective noun?" | index equality |
| `tap` | A real Poe sentence rendered `showAnnotations:false, interactive:true`: "Select the possessive noun in this sentence." | token-range equality against **any** same-label span in that sentence — the `q.accept` pattern from [js/quiz.js](../../js/quiz.js) line 338, so a sentence with two instances does not punish picking the other one |
| `sort` | Several words from the passage and one bucket per part of speech; tap a word, then tap a bucket. | per-word bucket equality |

`tap` items are **generated** by `study-model.js` from the stop's lesson: keep
annotations whose label is in the focus set, emit one question each. This is the
gap from fact #2, closed.

**`sort` uses tap-to-assign, never drag.**
[pilot.md](../../docs/product/pilot.md) names drag-to-select on a tablet as the
single most likely broken thing in the product; a new student-facing surface must
not bet on it. `sort` is deferred to [017](../017-unit-pos-capstone-and-docs.md)
so Phase 1 ships on two proven mechanics.

### One POS annotation per word — a deliberate divergence

Use the **subtype** where the subtype is the teaching point and the **base** label
everywhere else. Never both on one token.

`parts-of-speech-close-up` does the opposite: it puts `noun` *and* `proper-noun`
on the same token, which drives the renderer's two-row POS display (a POS-only
treatment, [render.js](../../js/render.js)). For a teacher-led lesson that is
good. For a self-checking quiz with no teacher in the room it is not, because two
annotations over one span generate **two questions with the same highlighted word
and two different correct answers** — and the base-label question can even offer
the subtype as a distractor, since distractors are drawn from the same family.

Completeness requires only *at least one* `pos` annotation per token, so
single-labelling passes. The cost is the two-row display on unit passages; the
benefit is that no question is unfair. Recorded here because a future session
looking at `parts-of-speech-close-up` will otherwise "fix" this.

### Progress — local, and only completion plus score

Key `sentenceForge.study.pos.v1`, written through `wjt.safeStorage`
([js/app.js](../../js/app.js) line 147) so a locked-down browser degrades to a
working, forgetful unit rather than a blank page:

```js
{ v: 1, at: "<stopId>", done: { nouns: 1 }, best: { nouns: 0.9 }, updatedAt: "…" }
```

Under 2 KB. On a parse failure or `v !== 1`, **discard and start fresh** — never
guess. This is preference-shaped data, not teacher work: it must stay away from
`wjt.store`, its adapter, and the migration runner, all three of which exist to
protect a teacher's lessons.

**Only completion and a score fraction are stored. No per-question record,
ever.** That keeps `roadmap-platform.md` **P2** — *"Sentence Forge never collects
a student answer"* — literally true: nothing is transmitted, and nothing
per-answer is written even locally.

**A "Reset my progress" control is required, not optional** (via
`wjt.confirmDialog`). School machines are shared and re-imaged; without it the
next student at that seat silently inherits someone else's unit. The unit map
must show progress plainly enough that they notice it is not theirs.

### Navigation — open

Every stop is reachable at any time from the unit map. Completed stops are marked
and the next unstarted one is highlighted. No gates: a stalled student has no
teacher to unstick them, and a teacher may want to assign stop 7 directly.

### Entry points

- **Routes.** `#/study/pos` (the unit map) and `#/study/pos/<stopId>` (one stop).
  Two lines in the router at [js/app.js](../../js/app.js) lines 411–419; the
  existing `hash.split("/")` already yields `parts[2]`.
- **A grouped Example library.** `renderExamples` (line 352) renders one flat
  grid; give it a section per `group`, with the ungrouped literature examples
  keeping their current heading and the `unit-pos` group getting its own heading
  plus a "Start the unit →" link. ~25 lines, no new view.
- **A Home splash card** in `wjt.views.home` pointing at the unit.

Any document-level listener the tap mechanic attaches must be torn down through
`wjt.onViewCleanup` (line 130).

## Open questions

Numbered `C` so they do not collide with `Q1–Q5` in
[roadmap.md](../../docs/roadmap.md) / [roadmap-0.1.0.md](../../docs/roadmap-0.1.0.md)
or `P1–P8` in [roadmap-platform.md](../../docs/roadmap-platform.md).

| # | Question | Decision | Rationale |
|---|---|---|---|
| **C1** | Reuse Practice mode, the Assignment worksheet, or build a new surface? | **Decided: a new surface,** separate from all three existing modes. | Neither generator can scope to a part of speech (fact #2), and Practice has been hidden from the UI since 2026-07-23. Reuse would mean rewriting the thing being reused. |
| **C2** | Does the unit need a general "course" data model? | **Decided: no.** One unit, hard-coded in `js/unit-pos.js`, behind a `study` view that takes a unit id. | We have one unit. A generic model built now would be designed against a sample size of one; the view already takes `pos` as a parameter, which is where a second unit would slot in. |
| **C3** | Nine lessons, or four cluster lessons? | **Decided: nine,** clustered for review. | One part of speech per lesson is the only split where "what am I practising?" has a one-word answer. Clusters give the reviews something to be about. |
| **C4** | Original prose or public-domain literature? | **Decided: Poe, "The Cask of Amontillado".** | Original prose would let us control density, but the product principle is real material, and the story's own vocabulary covers every Essential subtype (see the table above). Where it does not, hand-written items cover the gap. |
| **C5** | Base + subtype on the same token, as `parts-of-speech-close-up` does? | **Decided: no — one POS label per word.** | Double-labelling generates two questions with one highlighted span and two correct answers. Unfair without a teacher present. |
| **C6** | Store per-question answers to build a review list? | **Decided: no.** Completion and a score fraction only. | Keeps P2's tested invariant literally true. A missed-item list is rebuilt in memory for the results screen and then dropped, exactly as `quiz.js` does. |
| **C7** | Gate progress on a checkpoint score? | **Decided: no.** Open navigation. | Independent study means no teacher to unlock a stuck student. |
| **C8** | Teach verbals (`gerund`, `participle`, `infinitive`) here? | **Decided: no — deferred to Unit 2.** | They are phrase-level ideas filed under `verb`. See [Label budget](#label-budget). |
| **C9** | Does this jump the queue ahead of the pilot? | **Decided: no — it runs beside it.** Record the reason in `roadmap-platform.md#sequencing`. | The declared next step is step 4, run the pilot. This is the `0.2.0` student-facing track that **P5** already says needs no accounts, and it produces material a pilot can run. It does not displace step 4. |
| **C10** | Should the unit's passages carry `part`/`phrase`/`clause` labels too? | **Decided: no.** POS layer only, no `types` badges. | Sentence structure is Unit 2's subject. Adding it triples authoring cost for content this unit never teaches, and the no-`types` route keeps completeness satisfiable (fact #1). |

## Out of scope

- **No taxonomy change.** No label added, renamed, reparented, or retired.
- **No lesson-format change.** `group:` is added to the `wjt.EXAMPLES` registry,
  which is app data, not the lesson file format.
- **No accounts, no network, no roster, no gradebook, nothing transmitted.** No
  teacher-visible view of any student's progress, on any surface.
- **No change to `quiz.js` or the three `assignment-*` modules.** Practice stays
  hidden; this unit does not restore, reuse, or replace it.
- **Units 2+.** Named in the docs so the deferrals above have an address; nothing
  is built for them.
- **Restoring Practice, or correcting the docs that still advertise it.**
  [overview.md](../../docs/product/overview.md) describes Practice as one of three
  live modes, but its three entry points were commented out on 2026-07-23
  ([js/app.js](../../js/app.js) line 316) and only `#/quiz/<id>` still reaches it.
  That is a real pre-existing doc/reality mismatch and it is **not** this unit's
  to fix — the honest options are restoring the mode or marking it hidden, and
  that is a decision of its own. Do not quietly paper over it while editing these
  files.

## Phasing

| Order | Contents |
|---|---|
| [015](../done/015-study-view-and-first-lesson.md) | **The machinery, proven end to end.** Three new files; `teach` + `choice` + `tap`; progress; router, grouped Example library, Home card; **Orientation and Lesson 1 (Nouns) only**, complete and playable. |
| [016](../016-unit-pos-remaining-lessons.md) | **The content.** Stops 2–13. Authoring, no new mechanics. |
| [017](../017-unit-pos-capstone-and-docs.md) | **Finish.** The capstone, the `sort` step kind, and every doc. |

Phase 1 is the one that can go wrong, which is why it ends with one lesson a
student can actually complete — before ~190 questions are written against the
shape.

## As built — Phase 1 (2026-07-28)

Orientation and Lesson 1 ship, playable end to end from a double-clicked
`index.html`. Seven divergences and findings, in descending order of how much they
would cost someone who didn't know them.

**1. Passages are labelled one-label-per-token by a new `line()` helper, not by
`sentence()` — and Task C of [015](../done/015-study-view-and-first-lesson.md) (exporting
`sentence()`/`make()` from `examples.js`) was NOT done.** The plan assumed reusing
the existing substring-matching helper. Writing the first passage showed why that is
the wrong tool for a *fully* labelled lesson: `sentence()` resolves
`text.indexOf(match)`, and short function words collide constantly — `"he"` matches
inside `"The"`, `"in"` inside `"wine"`, `"as"` inside almost anything. Each collision
needs a hand-counted `nth`, across ~90 tokens per passage, and a wrong count is a
*silently mislabelled word*. `line(text, labelsInTokenOrder)` cannot misresolve, and
its length mismatch against the real token count is itself an error the smoke test
catches. `examples.js` was left untouched, which is a smaller change than the plan
called for. **Phase 2 should keep using `line()`.**

**2. The smoke test's "no label is claimed by two stops" assertion was wrong, and
had to be replaced.** Orientation deliberately re-uses the nine base labels to
introduce them, so a flat uniqueness check over all stops fails by design. It is now
a partition check over the **nine focus lessons only**, plus a separate check that
Orientation's focus is exactly the nine bases. Worth knowing: because every stop
*declares* its focus up front so the map can render the whole path, the 48-label
budget is verified **exactly** right now — the "tightens itself once all stops are
authored" mechanism the work order described was never needed.

**3. `"Good!" he said.` splits into two sentences under `wjt.splitSentences`.** The
splitter breaks on `!` plus an optional closing quote. Harmless here — a built lesson
supplies its own `sentences` array and never goes through the splitter — but a
teacher who re-pasted that line would get two cards, and Phase 2's interjection stop
is made almost entirely of lines like it.

**4. The Gutenberg edition uses `--`, not em dashes.** The proposal predicted the
hazard; the text turned out to be worse than expected, with `settled--but`-style
double hyphens throughout rather than occasionally. Normalization rule 3 is therefore
doing real work on nearly every paragraph. All three rules were verified by running
the normalized text through the real `splitSentences` and `tokenize` and asserting no
token holds two letter-runs glued by punctuation.

**5. A candidate noun passage was dropped for containing an infinitive.** *"…made
bold to seize Fortunato by an arm…"* — labelling `to` as a preposition would be
wrong, and `infinitive` is deliberately out of this unit's budget (**C8**). Replaced
with *"The drops of moisture trickle among the bones."*, which is three concrete
nouns and no verbals. **Expect this to recur in Phase 2**; the rule is to change the
passage, never the labelling.

**6. `docs/product/curriculum-unit-1.md` was written in Phase 1, not Phase 3.**
Amending `pilot.md` and `overview.md` created links to it, and a dangling link in
user-facing docs is worse than an early doc. [017](../017-unit-pos-capstone-and-docs.md)
now extends it instead of creating it.

**7. A headless screenshot of any view is faded, and this is not a bug.**
`.view { animation: view-in 0.3s both }` holds the view at its `from` state
(`opacity: 0`) until the animation advances, which it never does under
`--virtual-time-budget`. Measured: `#/library`, `#/study/pos`, and
`#/study/pos/<stop>` all compute `opacity: 0` immediately after render, while the
stop-card text computes to full-brightness `rgb(237,239,247)`. This is the same
family of trap as [014](../done/014-ui4-dom-check-settle.md) — **the harness measured
the wrong moment.** To photograph a view, neutralize `.view`'s animation in the
*harness*, not the app. Related: setting `location.hash` fires `hashchange`
asynchronously and app.js re-routes on it, so a script that sets the hash and then
drives the view synchronously has its work thrown away — wait a tick first.

One small styling fix fell out of it: `.study-body:empty` and
`.view-study .quiz-stage:empty` are hidden, because a teach screen has no sentence
and a question has no prose, and `.quiz-stage` carries its own padding and background.

### Verification at the close of Phase 1

| Check | Result |
|---|---|
| `node tools/smoke-test.js` | **0 failures.** 46 new study assertions; both new lessons complete at the POS layer (22 and 70 annotations, all on token boundaries, clean round-trip) |
| `node tools/validate-lesson.js samples …` | clean, no warnings |
| `node tools/validate-lesson.js --complete samples` | clean |
| `node tools/gen-docs.js --check` | clean — the taxonomy really was untouched |
| `node tools/link-check.js --check` | clean |
| `node tools/cvd-check.js --check` | clean |
| `tools/dom-check.html` | **376 passed, 0 failed** (was 339) |

Both new suites were **falsified before being trusted**, per
[014](../done/014-ui4-dom-check-settle.md)'s standard: removing `concrete-noun` from
a passage reddens *"nouns has a real instance of all 7 focus labels (missing:
concrete-noun)"*; giving two focus lessons the same label reddens the partition
check; dropping the `progress.complete()` call reddens `S-10`; making `nextStop()`
ignore completed stops reddens `S-3`.

## As built — Phase 2 (2026-07-28)

Stops 2–13 ship. Fourteen of the fifteen stops are playable end to end from a
`file://` page; only the capstone is left, and it is [017](../017-unit-pos-capstone-and-docs.md)'s.
Phase 2 adds **eight Poe passages** (58 sentences, 740 annotations), **42 teach
screens** and **61 written items**. Unit totals across both phases: ten lessons,
65 sentences, 762 annotations, 48 teach screens, 73 written items, and **104
generated `tap` questions**.

Six findings, in descending order of how much they would cost someone who did not
know them.

**1. The story cannot supply two of the 48 labels, and the smoke test had to learn
that.** Poe never writes a possessive pronoun (*mine, yours, hers* — he only ever
writes the kind that leans on a noun, which is a possessive *adjective*), and not
one of the story's many questions opens with an interrogative pronoun. **The
passage table above is wrong on that row:** *"How?"*, *"And the motto?"* and
*"You?"* are an adverb, a bare noun phrase, and a personal pronoun — none of them
is an interrogative pronoun.

The plan's rule for this case is *"cover it with a hand-written `choice` item"* —
but the smoke test's *"every focus label has a real instance"* assertion made that
unsatisfiable, so a stop may now declare `handTaught: [ids]`. Both halves are
asserted, and the assertion is an equality rather than a subset in **either**
direction: the set of focus labels missing from the passage must be **exactly**
the declared set, so a real gap cannot hide behind the declaration and the
declaration cannot rot when a passage changes. Each declared label must also be
claimed by an item's `label`. This is the only change to a check's contract in
Phase 2, and no engine or view code changed at all.

**2. A sentence must never carry both a label and a narrower one — and this is now
checked.** `accept` holds only the *same-label* spans in a sentence, so a
"select the noun" question in a sentence where another noun is tagged
`proper-noun` has two right answers and marks one wrong. Phase 1 obeyed this per
sentence without stating it; Phase 2 broke it within an hour of starting, because
the determiner family makes it unavoidable — `article`, `definite-article` and
`indefinite-article` are **siblings** under `determiner`, not a chain, so the
label tree cannot even tell you they overlap. The determiner passage now uses one
label from that family per sentence, and `tools/smoke-test.js` asserts the rule
over every unit passage (parent/child from the tree, plus `article`'s two
siblings declared explicitly).

**3. The infinitive marker, not the verbal, is what makes a sentence unusable.**
Phase 1 dropped a sentence for containing *"to seize"*; Phase 2 confirms the
constraint is narrower and sharper than that. A participle or a gerund is fine —
label it `adjective` when it is purely adjectival (*a drunken man*, *piled to the
vault*), `noun` when it is doing a noun's job, `verb` when it sits in a verb
phrase. But the bare **`to`** of an infinitive has no honest label at all, and
completeness demands every word-bearing token carry one. That single word ruled
out roughly a third of the story, including *"neither by word nor deed"* — the
only *neither…nor* in the text — which is why the correlative conjunction is
taught on *"not only … but"* instead.

**4. `steps()` generates UNLIMITED taps for any focus label no teach screen
claimed.** `tapPerScreen` caps the per-screen generation, but the fallback pass at
the end of `wjt.study.steps` runs with no limit. A stop whose `teach` screens do
not between them name every id in its `focus` therefore silently becomes two or
three times longer than intended. Every stop here claims its whole focus, and
`js/unit-pos.js` says so where the stops are declared. Nothing was changed in
`study-model.js` — the behaviour is reasonable, it is just not discoverable.

**5. Teach-screen order and sentence order are load-bearing, because `tapPerScreen`
slices.** `tapStepsFor` walks sentences in array order and takes the first *N*
matches, so a screen naming two labels gets one question of each only if the
passage's sentences are ordered to match the screens. The adjectives and adverbs
passages are ordered by teach screen for exactly this reason, and the pronouns
passage puts its demonstrative sentence before its relative one so the shared
screen draws one of each rather than two relatives. Reordering a passage's
sentences is not cosmetic.

**6. The review stops needed no engine change, and the four of them cost about a
tenth of what a focus lesson costs.** `steps()` already resolves `stop.reviews`
into source lessons, so a review is a `focus` list, two or three recap screens,
and a handful of items. Two new `tools/dom-check.html` suites cover them, because
that indirection was the one genuinely new thing this phase leaned on:
**S-12** asserts every generated review question is traceable to a sentence in a
stop that review actually reviews, and that a review draws from *every* cluster it
names; **S-13** walks all fourteen authored stops to their results screens over
`file:///`, which is the automated form of the hand walk-through the work order
asks for.

**Two divergences from the plan's own numbers, both benign.** The proposal
estimated ~190 hand-written items and ~70 generated ones; the unit ships **73**
written and **104** generated — the ratio is inverted, because the generated `tap`
questions carry more of the load than expected. The *totals* land where they
should: a focus lesson runs 10–24 steps and a review 13–16, which is the 20–25 and
~10 minutes the plan wanted.
And `js/unit-pos.js` is now **2,325 lines**, past the ~2,000 at which the proposal
said to split it per cluster. It was left whole: the split costs edits to
`index.html`, the smoke test's sandbox list, `CLAUDE.md` constraint #4 and
`architecture.md`, and [016](../016-unit-pos-remaining-lessons.md) is explicitly
content-only. **It should be split in [017](../017-unit-pos-capstone-and-docs.md)**,
which adds the capstone on top.

### Verification at the close of Phase 2

| Check | Result |
|---|---|
| `node tools/smoke-test.js` | **0 failures.** Eight new lessons, all complete at the POS layer, all on token boundaries, clean round-trip |
| `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md` | clean, no warnings |
| `node tools/validate-lesson.js --complete samples/*.json` | clean (fragment notes only, per **C10**) |
| `node tools/gen-docs.js --check` | clean — the taxonomy really was untouched |
| `node tools/link-check.js --check` | clean |
| `node tools/cvd-check.js --check` | clean |
| `tools/dom-check.html` | **408 passed, 0 failed** (was 376) |

Every new assertion was **falsified before being trusted**, per
[014](../done/014-ui4-dom-check-settle.md)'s standard:

- relabelling one `determiner` as `definite-article` in a sentence that already
  holds both reddens the narrower-label check, and names the sentence;
- dropping `possessive-pronoun` from `handTaught` reddens the instance check;
  *adding* `reflexive-pronoun` to it — a label the passage does supply — reddens it
  too, which is the direction that stops the declaration rotting;
- removing an item's `label` reddens the hand-taught-coverage check;
- making `steps()` ignore `stop.reviews` reddens all eight **S-12** assertions;
- pointing `review-c` at a stop with no built passage reddens its cluster-coverage
  assertion alone (1/2);
- giving one `choice` item no options reddens four **S-13** assertions and names
  the stop that stalled.

One check that did **not** falsify as expected, recorded because it bounds what
S-12 proves: narrowing a review's teach-screen labels does *not* reduce the
clusters it draws from, because finding 4's unlimited fallback regenerates the
questions the screens stopped claiming. S-12's cluster-coverage assertion is
sensitive to a review's **sources**, not to its screens.

## As built — Phase 3

_Pending._
