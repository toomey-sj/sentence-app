---
status: proposed
created: 2026-07-29
---

# Unit 2 — How a Sentence Is Built

The design record for the second unit of the student-facing independent-study
curriculum: sentence **parts**, **phrases**, **clauses**, and the eight
sentence-type badges — everything above the word, which is exactly what
[Unit 1](curriculum-unit-1-parts-of-speech.md) left alone.

This is the durable document. It is written before any content exists, on the
precedent that paid for itself in Unit 1: ten numbered decisions up front, four
"As built" sections written back in afterwards, and the divergence notes turning
out to be the valuable part. Its handoff is
[020](../done/020-unit-2-groundwork.md); the build is phased into `021`–`024`
below and "As built" sections belong **here**, not in those orders.

- [Why](#why)
- [What the codebase already decides for us](#what-the-codebase-already-decides-for-us)
- [The passage](#the-passage)
- [Scope and sequence](#scope-and-sequence)
- [Label budget](#label-budget)
- [Sizing — the decision this document exists to make](#sizing--the-decision-this-document-exists-to-make)
- [Design](#design)
- [Open questions](#open-questions)
- [Out of scope](#out-of-scope)
- [Phasing](#phasing)

---

## Why

Unit 1 taught the `pos` layer and stopped there, deliberately: **C10** ruled out
`part`/`phrase`/`clause` labels and `types` badges on the grounds that sentence
structure is Unit 2's subject. That leaves three of the app's four layers, 32 of
its 87 labels, and both sentence-type axes with no student-facing teaching
anywhere in the product — in an app whose own home page calls itself *"a workshop
for the study of sentence structure."*

Two debts also come due here, both written down with this address on them:

- **C8** deferred `gerund`, `participle`, and `infinitive` to this unit. They live
  on `pos` under `verb`, but each one does the work of a *different* part of
  speech, which is a phrase-level idea — and the app already carries
  `gerund-phrase`, `infinitive-phrase`, and `participial-phrase` on the `phrase`
  layer for them to sit next to.
- **C11** — whether a student can select a multi-token span at all — was the
  precondition. [019](../done/019-multi-token-tap-spike.md) ran on 2026-07-29 and
  answered it yes, fixing two live faults in `attachSelection()` on the way. Its
  finding is carried into the table below as a decided row, not an open question.

And Unit 2 is the second sample **C2** said it was waiting for. Unit 1 declined a
generic course model on a sample size of one, on the grounds that `wjt.study`
already takes a unit id and that is where a second unit slots in. This document
tests that claim rather than assuming it — see [C13](#open-questions).

## What the codebase already decides for us

Six facts, each verified in the source or measured with a `vm` probe against the
real logic layer, that removed a design option. Facts 1–3 are the ones that decide
what this unit can afford.

### 1. Only a `types` badge triggers the completeness cascade — and `phrase` is never required

[tools/completeness.js](../../tools/completeness.js) runs three rules, and
[tools/smoke-test.js](../../tools/smoke-test.js) runs them as a **blocking**
`check()` on every entry in `wjt.EXAMPLES`:

| Rule | Applies to | Demands |
|---|---|---|
| 1 — POS coverage | **every** sentence, fragments included | each word-bearing token carries at least one `pos` annotation |
| 2 — clause coverage | only a sentence carrying `types.structure` or `types.purpose` | `clause`-layer spans cover every word-bearing token (interjections and pure punctuation exempt) |
| 3 — subject + predicate | the same badged sentences | every clause span contains a `subject`-family **and** a `predicate`-family span |

Two things follow that the handoff did not have, both measured:

**There is no `phrase` rule at all.** `kinds-of-sentences` ships seven fully
badged sentences of which four carry **zero** `phrase` annotations, and it passes.
The cascade is `pos` + `clause` + subject/predicate; the `phrase` layer, the
object family, and the complement family are entirely optional on any sentence.

**A sentence with no badge may still carry `part`, `phrase`, and `clause`
annotations.** Rules 2 and 3 are skipped for it, not the layers. Verified by
probe: an unbadged sentence carrying `noun-phrase`, `prepositional-phrase`, and
`independent-clause` spans but no subject or predicate passes clean, with only the
existing *"treated as a fragment"* note. `romeo-juliet-prologue` is the shipped
proof — 12 of its 14 sentences are unbadged verse fragments carrying `phrase` and
`clause` annotations, at 1.00–1.29 annotations per word.

**This is the lever the whole unit is sized on.** See
[Sizing](#sizing--the-decision-this-document-exists-to-make).

### 2. The measured cost of a badged sentence is 1.38–1.90 per word, not 3×

Unit 1's **C10** said badging *"triples the authoring cost."* Re-measured across
every entry in `wjt.EXAMPLES` (2026-07-29), it does not.

| Lesson | Layers | Sentences | Badged | Anns | Words | per word |
|---|---|---|---|---|---|---|
| Unit 1 (all 11 passages) | `pos` | 72 | 0 | 841 | 841 | **1.00** |
| `declaration-of-independence` | `pos` | 15 | 0 | 511 | 531 | 0.96 |
| `romeo-juliet-prologue` | all four | 14 | **2** | 138 | 106 | **1.30** |
| `dracula-count-appears` | all four | 2 | 2 | 73 | 45 | 1.62 |
| `great-gatsby-closing` | all four | 4 | 4 | 83 | 49 | 1.69 |
| `parts-of-speech-close-up` | all four | 7 | 7 | 130 | 73 | 1.78 |
| `frankenstein-creation` | all four | 3 | 3 | 97 | 52 | 1.87 |
| `fox` | all four | 4 | 4 | 72 | 38 | 1.89 |
| `kinds-of-sentences` | all four | 7 | 7 | 98 | 48 | 2.04 |
| `declaration-of-independence-full` | all four | 3 | 3 | 266 | 126 | 2.11 |

- All eight four-layer lessons together: **1.78** per word.
- The seven **fully** badged ones: **1.90** per word — the honest multiplier
  against Unit 1's 1.00, and the number **C10** should have said.
- The **floor**, measured by building minimum-legal sentences and running the real
  `checkLesson()`: a badged 8-word **simple** sentence needs **11** annotations
  (1.38/word — 8 `pos`, 1 subject, 1 predicate, 1 clause, and no `phrase` layer at
  all); a badged 8-word **complex** sentence needs **14** (1.75/word — two clauses,
  so two subjects and two predicates).

The gap between the 1.38 floor and the 1.90 average is **discretionary**: shipped
lessons annotate phrases, objects, and complements because a teacher wants them
visible, not because a rule demands them. Unit 2 chooses per stop.

### 3. Nothing in the app can ask about a sentence-type badge

The eight badge values live in `wjt.SENTENCE_TYPES`
([js/labels.js](../../js/labels.js) lines 565–628) — `structure`: simple,
compound, complex, compound-complex; `purpose`: declarative, interrogative,
imperative, exclamatory. **None of them is in `wjt.LABELS`**, whose 87 entries are
all span labels.

`tapStepsFor` ([js/study-model.js](../../js/study-model.js) lines 182–235) filters
a lesson's **annotations** by label id, so it cannot produce one question about a
badge. This is the same shape as Unit 1's
[fact #2](curriculum-unit-1-parts-of-speech.md#2-nothing-in-the-app-can-scope-questions-to-one-part-of-speech),
and it is decided in **C15** rather than closed with an engine change.

Easily missed and directly reusable: each axis already carries `question` and
`hint` text written for the worksheet builder — *"What is the structure of this
sentence?"*, *"How many clauses, and of what kind."* — and each of the eight
options carries `name`, `desc`, `example`, and a palette `color`. That is a teach
screen and eight stems already written. Read them before writing new prose.

### 4. The `part` layer is not the multi-token layer people assume

Measured over every shipped four-layer lesson:

| Layer | Spans | Mean tokens | Single-token |
|---|---|---|---|
| `pos` | 531 | 1.0 | 99% |
| `part` | 252 | 2.6 | **54%** |
| `phrase` | 110 | 3.5 | 0% |
| `clause` | 64 | 8.4 | 0% |

Per label, the two that matter most: **`simple-subject` is single-token 57/57**
and `simple-predicate` 50/59, while `complete-predicate` averages 5.9 tokens and
`independent-clause` 8.5.

So drag is not a cliff at the start of Unit 2 — it is a ramp. The first stop can
open on Unit 1's exact one-click mechanic (`simple-subject`), introduce a 2–3 word
drag (`complete-subject`, mean 2.9), and only reach 6–9 word spans in the clause
cluster. That ordering is deliberate in [Scope and sequence](#scope-and-sequence).

### 5. `tapStepsFor` emits one question per (sentence, label) — nesting does not multiply questions

This resolves a tension that looks fatal from the outside. 019's authoring rule is
*annotate every same-label span you would accept*, which sounds like it multiplies
questions: annotate five nested noun phrases and get five questions.

It does not. `tapStepsFor` skips an annotation when a question for that
`(sentenceIndex, label)` already exists, and puts **every** same-label span in that
sentence into `accept`. Five nested noun phrases produce **one** question with five
accepted answers. What nesting inflates is the *prompt*: `js/study.js` renders
*"Select any **one** noun phrase — there are 5."* 019 measured a real case with
18. That is a readability problem, addressed in **C12**, not a cost problem.

### 6. The router, the library grouping, and `sort` already take a second unit; the Home card does not

Verified by reading, not inferred:

| Surface | State |
|---|---|
| Router | **Generic.** [js/app.js](../../js/app.js) line 477: `parts[0] === "study" && parts[1]` → `wjt.views.study(container, parts[1], parts[2])`. No change. |
| Example library grouping | **Generic**, on one naming rule: line 409 resolves a group to a unit with `g.id.replace(/^unit-/, "")`. A group id of `unit-<unitId>` works with zero code change. |
| `wjt.study.register` | **Generic.** Keyed on `unit.id`. No change. |
| `sort` chips | **Arbitrary strings.** `expected[w.word] = w.bucket`, so a multi-word phrase chip needs no engine change (the smoke test's "no repeated word" rule then means no repeated *phrase*). |
| **Home splash card** | **Hard-codes `wjt.study.unit("pos")`** at line 192. One real change: two units, two cards, or a card that lists them. |
| `js/study.js` tap renderer | **Hard-codes `layers: ["pos"]`** at lines 469 and 506. Under `showAnnotations: false` it is very likely inert (`render.js` line 64 gates all row drawing on `show`), but it is a `pos`-shaped assumption sitting in the exact renderer every Unit 2 tap goes through. **Confirm it in phase 1**, do not assume it. |

## The passage

**Decided: continue in Poe's "The Cask of Amontillado."** Rationale is **C14**;
what follows is what phase 1 has to verify.

### The handoff's premise, corrected

[020](../done/020-unit-2-groundwork.md) §4 says the sentences Unit 1 had to drop
"are written down in that finding." They are not. Unit 1's Phase 2 finding 3
records that the bare **`to`** of an infinitive *"ruled out roughly a third of the
story"* and names **four** specific casualties across two phases:

- *"neither by word nor deed"* — the only *neither…nor* in the text
- *"…made bold to seize Fortunato by an arm…"*
- *"I hastened **to** make an end of my labour"*
- *"I plastered it **up**"* (a particle, not an infinitive)

That is a documented *reason* a third of the story was unusable, not a list of the
third. **`infinitive` and `particle` are the two labels that caused it, and
`infinitive` is in this unit's budget** (`particle` is Advanced and stays out, so
*"plastered it up"* is still unusable). The unlock is real; the shopping list has
to be rebuilt from the text.

### What phase 1 must verify, because this document cannot

`pg1063.txt` is not in the repo and neither is Unit 1's normalization probe —
Phase 3 finding 7 records that its own paragraph numbers could not be
re-verified. So **no sentence is committed here.** Phase 1 re-sources the text,
re-applies the three normalizations (join wrapped lines; `_italic_` → `italic`;
`--` → spaced em dash — all three are load-bearing and skipping any one makes a
word permanently unlabellable), and verifies:

1. Every candidate sentence tokenizes with no token holding two letter-runs glued
   by punctuation.
2. **No sentence appears in any of Unit 1's 72.** They are enumerable from
   `wjt.EXAMPLES` at any time; the capstone already asserts this property for
   itself and Unit 2 should assert it unit-wide from the start.
3. The story really supplies the structures cluster D needs — in particular a
   **compound-complex** sentence short enough to badge affordably, and an
   **imperative** (which is also the only source of `understood-subject`).
   Poe is a first-person narrator in past tense; interrogatives and imperatives
   are dialogue-only. If a value has no honest short instance, it goes to
   `handTaught` plus a `choice` item — the existing mechanism, and the one
   Unit 1's Phase 2 finding 1 built for exactly this.

### The known risk with Poe, stated up front

Poe's sentences are long and ornate, and a **badged** sentence pays the cascade
across its whole length. `declaration-of-independence-full` is what that looks
like at the extreme: 42 words per sentence, **88.7 annotations per sentence**.
Unit 1 avoided it by curating short sentences (11.7 words on average across 72).
Unit 2 must curate harder, and only where it badges — the fragment stops can take
long sentences cheaply. If cluster D cannot find short badged sentences in the
story, **use short ones and accept a thinner passage** rather than badging a
40-word sentence; a fallback to purpose-built prose for cluster D alone is
acceptable and should be recorded as a divergence, not hidden.

## Scope and sequence

**Seventeen stops**, numbered 0…16 in path order. Nine focus lessons and two
badge lessons, grouped into four clusters, each ending in a review. Cluster
reviews introduce no new passage; they re-draw from stops already completed.

| # | id | Stop | Focus | Widest span it asks for |
|---|---|---|---|---|
| 0 | `orientation` | **Orientation** — above the word | the 5 `part` bases + 2 `clause` bases, named only | 1 word |
| — | | *Cluster A — The parts of a sentence* | | |
| 1 | `subjects` | Subjects | `subject` · simple · complete · compound · understood | 1 → 3 words |
| 2 | `predicates` | Predicates | `predicate` · simple · complete · compound | 1 → 6 words |
| 3 | `objects` | Objects | `object` · direct · indirect · object-of-preposition | 2–3 words |
| 4 | `complements` | Complements | `complement` · subject-complement · predicate-nominative · predicate-adjective | 1–3 words |
| 5 | `review-a` | *Review A* | mixed, stops 1–4 | — |
| — | | *Cluster B — Phrases* | | |
| 6 | `phrases` | Noun, verb, and prepositional phrases | `noun-phrase` · `verb-phrase` · `prepositional-phrase` | 2–5 words |
| 7 | `verbals` | Verbals and verbal phrases | `gerund` · `participle` · `infinitive` · `verbal-phrase` · gerund- · infinitive- · participial-phrase | 1 → 6 words |
| 8 | `appositives` | Appositives and absolutes | `appositive` · `appositive-phrase` · `absolute-phrase` | 2–5 words |
| 9 | `review-b` | *Review B* | mixed, stops 6–8 | — |
| — | | *Cluster C — Clauses* | | |
| 10 | `clauses` | Independent and dependent clauses | `independent-clause` · `dependent-clause` | 5–10 words |
| 11 | `dependent-kinds` | Three kinds of dependent clause | `relative-clause` · `adverbial-clause` · `noun-clause` | 5–10 words |
| 12 | `review-c` | *Review C* | mixed, stops 10–11 | — |
| — | | *Cluster D — Kinds of sentence* | | |
| 13 | `structure` | Simple, compound, complex, compound-complex | the 4 `structure` badge values | *none — `choice` only* |
| 14 | `purpose` | Declarative, interrogative, imperative, exclamatory | the 4 `purpose` badge values | *none — `choice` only* |
| 15 | `review-d` | *Review D* | mixed, stops 13–14 | — |
| 16 | `capstone` | **Capstone** | all 35 labels + all 8 badges | all |

**Why this order.** A phrase cannot be described before the job it does in the
sentence has a name, so parts come before phrases; a clause is defined as a
subject-plus-predicate unit, so it cannot precede either; and the four structures
are counts of clauses, so cluster D is unteachable before cluster C. Verbals sit
in cluster B rather than cluster A because a gerund is only comprehensible next to
the gerund *phrase* it heads — which is exactly why **C8** moved them out of
Unit 1.

**The span width column is the other reason for this order** (fact 4). Stop 1
opens on `simple-subject`, which is one word 57/57 times in the shipped corpus —
the mechanic a Unit 1 graduate already owns — and introduces drag on
`complete-subject`, mean 2.9 tokens. Nobody meets a 9-word clause selection until
stop 10. That ramp is deliberate and should survive re-sequencing.

**Student time:** orientation ~10 min, nine focus lessons 20–25 min, two badge
lessons ~15 min, four reviews ~10 min, capstone ~30 min → roughly **4¾ hours**,
the same two-week independent study as Unit 1.

## Label budget

**35 labels.** 32 Essential across the three upper layers, plus the three verbals
Unit 1 deferred here. Every lesson sets `essentialOnly: true`, exactly as Unit 1
did, which drops the one Advanced `part` label on its own.

| Layer | Total | Essential | Advanced (excluded) |
|---|---|---|---|
| `part` | 19 | **18** | `object-complement` |
| `phrase` | 9 | **9** | — |
| `clause` | 5 | **5** | — |
| `pos` (verbals only) | — | **3** | — |

Verified against `wjt.labelsForLayer` / `wjt.filterTier` on 2026-07-29.
`particle` — the other label that made Poe sentences unusable — is Advanced on
`pos` and stays out.

Unit 1 taught 48; this unit teaches 35. **It is a smaller taxonomy over harder
material**, which is the right trade for a unit whose questions are span
selections.

### Nine of the 35 have never been annotated anywhere in this repo

Counted across every shipped lesson:

| Layer | Never used | Note |
|---|---|---|
| `part` | `subject` · `predicate` · `object` · `complement` · `indirect-object` · `appositive` | the four **base** labels, plus two genuinely rarer things |
| `phrase` | `verbal-phrase` · `gerund-phrase` · `absolute-phrase` | `verbal-phrase` is the base; the other two are real gaps |

The four bases being unused is not a gap — shipped lessons reach straight for the
subtype, and Unit 1's Orientation shows how a base gets taught before its subtypes
exist. `indirect-object`, `gerund-phrase`, and `absolute-phrase` are the ones with
real sourcing risk, and `absolute-phrase` (*"Her heart pounding, she opened the
door"*) is the single most likely `handTaught` in the unit.

### Two label-family hazards this unit walks into that Unit 1 only grazed

The smoke test asserts *"no passage sentence mixes a label with a narrower one"*
using `wjt.childrenOf` plus a declared `SIBLING_SUPERSETS` map, because `accept`
holds only same-label spans and a base-label question is unfair when a narrower
label is also on the page. Unit 2's families are deeper than `pos`'s, and two
things follow:

1. **`gerund`, `participle`, and `infinitive` are children of `verb`.** So a
   sentence teaching a gerund **cannot carry a plain `verb` label on any other
   word** — and rule 1 demands every word be labelled. Its main verb must take a
   sibling subtype (`linking-verb`, `action-verb`, …), which is honest and is
   already how Unit 1 labels verbs. This is a hard authoring constraint on the
   whole of stop 7 and it will bite on day one if it is not front-loaded.
2. **`subject-complement` is a *sibling* of `predicate-nominative` and
   `predicate-adjective` in the tree, but a superset of both in meaning** — the
   `article`/`definite-article` hazard exactly, and currently undeclared. Phase 1
   must add `"subject-complement": ["predicate-nominative", "predicate-adjective"]`
   to `SIBLING_SUPERSETS`. `compound-subject` versus `complete-subject` is the same
   shape and should be handled by an authoring rule (never both in one sentence)
   rather than by widening the map further.

A softer one worth a note in the source: when a complete subject is a single word
(*"she"*), `simple-subject` and `complete-subject` are the **same span**, and the
unit then asks two differently-named questions with one answer. Not unfair, but
confusing — **teach `complete-subject` only on multi-word subjects.**

## Sizing — the decision this document exists to make

The handoff's charge: *"Write down a sentence count and defend it."* Here it is.

### The premise it has to answer

A Unit 2 that badged every sentence at Unit 1's length — 72 sentences at the
measured 1.90 — is **~1,500 annotations**, roughly ten times the largest fully
badged passage ever shipped here (`kinds-of-sentences` and
`parts-of-speech-close-up`, seven badged sentences each). That is correctly
unaffordable.

**But a unit about sentence structure does not have to badge every sentence, and
badging is not what teaches the spans.** Fact 1: the badge triggers rules 2 and 3;
the `part`, `phrase`, and `clause` annotations that generate every `tap` question
are legal without it. `romeo-juliet-prologue` is the shipped proof.

### The rule this unit sizes on

> **Badge a passage when the badge's own rules police what that stop teaches.
> Otherwise leave it a fragment.**

Rule 2 (clause spans cover every token) *is* the clause cluster's teaching point,
and rule 3 (subject + predicate in every clause) *is* stops 1–2's. So those
passages badge, and the completeness checker becomes a proofreader for exactly the
analysis being taught. Objects, complements, phrases, and verbals are not policed
by any rule, so those passages stay fragments and cost ~1.2 per word.

**This buys affordability, and it costs something real: an unbadged passage's
clause and phrase analysis is not machine-checked.** A wrong `noun-phrase`
boundary in stop 6 fails no check. That is the trade, made deliberately, and the
mitigation is the one Unit 1 ended on — [someone plays the unit](#phasing).

### The number

| Stop | Sentences | Badged | Est. words | Est. anns | per word |
|---|---|---|---|---|---|
| 1 `subjects` | 5 | **yes** | 55 | 90 | 1.6 |
| 2 `predicates` | 5 | **yes** | 55 | 90 | 1.6 |
| 3 `objects` | 5 | no | 55 | 70 | 1.3 |
| 4 `complements` | 5 | no | 55 | 70 | 1.3 |
| 6 `phrases` | 5 | no | 60 | 78 | 1.3 |
| 7 `verbals` | 6 | no | 70 | 91 | 1.3 |
| 8 `appositives` | 4 | no | 50 | 65 | 1.3 |
| 10 `clauses` | 5 | **yes** | 60 | 105 | 1.75 |
| 11 `dependent-kinds` | 5 | **yes** | 60 | 105 | 1.75 |
| 13+14 `structure`/`purpose` (one shared passage) | 8 | **yes** | 75 | 115 | 1.5 |
| 16 `capstone` | 6 | **yes** | 75 | 140 | 1.9 |
| **Total** | **59** | **29** | **670** | **~1,020** | **1.52** |

Eleven passages, the same as Unit 1. **59 sentences to Unit 1's 72; ~1,020
annotations to its 841** — about 1.2× the authoring, not 1.8×, and a third of the
1,500 the naive reading feared. Stops 0, 5, 9, 12, 15 need no passage of their own.

**Defended against the seven-badged-sentence ceiling.** The largest fully badged
passage ever shipped here is 7 sentences. **No passage in this table exceeds 8, and
five of the eleven badge nothing at all.** The 29 badged sentences are spread
across six passages — the ceiling is a per-passage number, and it is respected
everywhere. Cluster D's shared 8-sentence passage is the one entry above 7, and it
is the cheapest kind: eight short sentences, one per badge value, at the 1.38–1.75
floor rather than the 1.90 average, because it needs no `phrase` layer.

Where the estimates come from: 1.3/word is `romeo-juliet-prologue`'s fragment rate
(1.11–1.29 measured) plus a margin; 1.6 and 1.75 are the measured badged floors
for simple and complex sentences; 1.9 is the fully-badged average, applied only to
the capstone, which is the one passage that should be richly annotated because its
`focus` is a filter over all 35 labels.

### Question bank

~170 generated `tap` questions and ~95 authored items, including 5–6 sorts. The
ratio inverts Unit 1's plan the way Unit 1 actually shipped (73 written, 131
generated), because it is the same generator. Cluster D is the exception and is
**100% authored** — see **C15**.

## Design

### Naming

Unit id **`sentence`**. It collides with nothing: `wjt.LAYERS` ids are
`pos`/`part`/`phrase`/`clause`, and the `SENTENCE_TYPES` axis ids are
`structure`/`purpose` — both of which `structure` would have collided with, and
`parts` would have collided with the `part` layer.

| | |
|---|---|
| Route | `#/study/sentence` and `#/study/sentence/<stopId>` — **no router change** (fact 6) |
| Storage key | `sentenceForge.study.sentence.v1`, through `wjt.safeStorage` |
| `wjt.EXAMPLES` group | **`unit-sentence`** — the `unit-` prefix is load-bearing; `app.js` line 409 strips it to find the unit |
| Lesson ids | `unit-sentence-<stopId>` |
| Files | `js/unit-sentence.js` + `-a` `-b` `-c` `-d` `-capstone` |

Unit 1's rule still holds: **"Unit" in prose, `study` in code, never a bare `unit`
property** — `wjt.LAYERS[].unit` is the linguistic unit and is referenced in five
docs.

### Six content files, split from the start

Unit 1 shipped `js/unit-pos.js` as one 2,325-line file and had to split it six
ways in phase 3, after the proposal had said to split at ~2,000 and phase 2
declined because it was content-only. **Do not repeat that.** Unit 2 ships six
files from its first commit, mirroring the cluster structure:
`unit-sentence.js` (defines `wjt.unitSentence`, registers the unit with an empty
`stops` array), then `-a`, `-b`, `-c`, `-d`, `-capstone`, each appending its stops.

The app goes from 21 JS files to **27**. That load order is carried in
**five** places and drifting any one of them is a silent reshuffle:

1. [index.html](../../index.html)
2. [tools/dom-check.html](../../tools/dom-check.html)
3. `UNIT_FILES` in [tools/smoke-test.js](../../tools/smoke-test.js)
4. [CLAUDE.md](../../CLAUDE.md) constraint #4
5. [architecture.md](../../docs/project/architecture.md)

The assertion that catches a drift is *"stops are numbered 0…N in path order"*.
**Write Unit 2's copy of it in phase 1**, before the second content file exists.

### Step kinds — the same four, no new one

`teach`, `choice`, `tap`, `sort`, unchanged. What changes is what they carry.

| Kind | Unit 2's use | Notes |
|---|---|---|
| `teach` | Same shape; `wjt.LABELS[id].desc`/`.example`/colour still supply it. Cluster D's screens come from `wjt.SENTENCE_TYPES[axis].options[…]` instead — same fields, different object. | |
| `choice` | Carries every cluster-D question, plus the concept and rule questions elsewhere. A cluster-D stem **quotes the sentence inline**, because a `choice` step has no sentence stage. | |
| `tap` | Generated, multi-token from stop 1 onward. The ramp in [Scope and sequence](#scope-and-sequence) is the whole accessibility story. | **C11**, **C12** |
| `sort` | Buckets are `part`-family or clause kinds; chips may be **phrases**, which needs no engine change (fact 6). | |

**`sort` is the one place a new mechanic is tempting and should still be resisted.**
Phase 3 finding 4 of Unit 1 — *a sort is only fair if each chip has exactly one
honest home* — is harder here, not easier: *"the bones"* is a noun phrase **and**
an object of a preposition **and** part of a complete predicate, all at once,
because the layers are simultaneous rather than alternative. **A Unit 2 sort must
be within one layer** (four `part`-family buckets, or three dependent-clause
kinds), never across layers.

### One annotation per span, per layer

Unit 1's **C5** — one `pos` label per word, never base *and* subtype — carries
over unchanged, and generalizes: **within a layer, one label per span.** Across
layers, overlap is the point; *"the bones"* is simultaneously a `noun-phrase` and
a `direct-object` and that is exactly what the four-layer app exists to show. The
smoke test's narrower-label rule already enforces the within-layer half.

### Progress, navigation, entry points

Unchanged from Unit 1 and inherited rather than redesigned: local storage only,
completion and a score fraction (**C6**, keeping `roadmap-platform.md` **P2**
literally true), open navigation with no gates (**C7**), a required "Reset my
progress" control, results by cluster.

One real change (fact 6): **the Home splash card hard-codes `unit("pos")`.** With
two units it must show both, or show the one in progress. Phase 1's job, and the
smallest honest version — two cards — is fine.

## Open questions

Numbered `C`, continuing Unit 1's sequence so the two units share one namespace
and **C1–C11** keep their meanings. They do not collide with `Q1–Q5` in
[roadmap.md](../../docs/roadmap.md) or `P1–P8` in
[roadmap-platform.md](../../docs/roadmap-platform.md).

| # | Question | Decision | Rationale |
|---|---|---|---|
| **C11** | At `phrase` and `clause` level a `tap` answer is a multi-token span, and spans nest by nature. Does the mechanic carry it? | **Decided (019): the drag mechanic carries it.** Verified with mouse and pen, including across a line wrap; unverified only on real touch hardware. Two faults in `attachSelection()` were fixed in the process. Exact boundary equality stays, with fairness supplied by `accept` and by an authoring rule: **annotate every same-label span you would accept.** A span-choice step kind is declined as the default. | [019](../done/019-multi-token-tap-spike.md), recorded in full at [Unit 1 §019's answer](curriculum-unit-1-parts-of-speech.md#019s-answer--multi-token-selection-measured-2026-07-29). A span-choice kind turns *production* into *recognition*, and the phrase half of the curriculum should not be the easier half. Unit 1 could tell us nothing here: all 841 of its annotations span one token, so its 131 taps never exercised drag once. |
| **C12** | 019 measured two costs that shape the item mix: a keyboard student spends **13 keystrokes** on one 7-word phrase question, and a fully annotated sentence produces *"Select any one noun phrase — there are 18."* | **Decided: bound both by authoring, not by code.** Keep taught spans at 2–5 tokens wherever the grammar allows; choose sentences where the taught label has **≤3** accepted spans; ask with `choice` where it cannot. Set `tapPerLabel` on the capstone as Unit 1 did. | Both are real and neither is an engine defect. 13 keystrokes is inherent to Shift+Arrow over 7 words; a smaller span is the only fix. And *"there are 18"* is a fair question that is a bad question — the fix is the sentence, not the prompt. Fact 5 means this costs nothing in question count. |
| **C13** | Does a second unit now justify a general course data model, reopening **C2**? | **Decided: no — and building Unit 2 against the existing registry is the test, not an assumption.** Nothing is extracted or generalized. Revisit at a third unit. | Fact 6: the router, `register`, and the library grouping are already unit-agnostic; only the Home card names `pos`. Unit 1's Phase 3 already rewrote `S-5` to push a synthetic stop *because* a second unit would land on that code. A model abstracted from two samples that already share one code path would be abstraction for its own sake. If phase 1 finds real friction, that is evidence and it goes in an "As built" note. |
| **C14** | Continue in "The Cask of Amontillado", or start a new text? | **Decided: continue in Poe.** | Three reasons. Continuity is a genuine asset for a student working both units — the language is already familiar, so the grammar is the only new thing. `infinitive` moving into budget genuinely unlocks material Unit 1 had to refuse. And the story is ~2,300 words against Unit 1's 72 sentences, so unseen text exists. The risk — Poe's long sentences are expensive **to badge** — is named in [The passage](#the-passage) with a recorded fallback for cluster D. |
| **C15** | The eight badge values are not labels, so no question can be generated about them (fact 3). Authored `choice` items only, or a new step kind that classifies a whole sentence? | **Decided: authored `choice` items only. No engine change.** Cluster D is 100% authored, ~24 items across two stops. | A `classify` step kind is a real engine change — a new kind in `steps()`, `check()`, and the view — bought for **8 values in one cluster of one unit**. Against that, the copy is already written (`SENTENCE_TYPES[axis].question`, and `name`/`desc`/`example`/`color` per option), a `choice` with the sentence quoted in its stem asks the identical question, and the badge is *by nature* a four-way classification, which is what `choice` is. Recorded as the thing to build first if a Unit 3 needs whole-sentence classification too — one use is not a pattern. |
| **C16** | Which passages carry a `types` badge? | **Decided: six of eleven — stops 1, 2, 10, 11, the shared cluster-D passage, and the capstone. 29 badged sentences of 59.** | Fact 1 and the rule in [Sizing](#sizing--the-decision-this-document-exists-to-make): badge where the badge's own rules police what the stop teaches, so the completeness checker proofreads the analysis being taught. Everywhere else the badge buys nothing and costs ~40%. **This is the decision that makes Unit 2 affordable**, and it is the one to revisit first if the unit turns out to be too big or too thin. |
| **C17** | Unit 1's **C10** said badging *"triples the authoring cost."* | **Corrected: it is 1.90× measured, and the floor is 1.38×.** | Measured 2026-07-29 across every `wjt.EXAMPLES` entry (fact 2). The 3× figure was an estimate and it was wrong in the direction that would have killed this unit. |
| **C18** | Is the capstone a seventeenth stop, as in Unit 1? | **Decided: yes, same shape** — no teach screens, `focus` as a filter over all 35 labels plus the 8 badges, `tapPerLabel: 1`, `itemsLast: true`, `resultsBy: "cluster"`, an unseen passage asserted to share no sentence with any other stop. | All five of those are Unit 1 Phase 3 findings that cost real time to discover. `focus`-as-filter is exempt from the coverage check by the honest rule Unit 1 landed on — *a stop with no teach screens cannot fail to teach a label it never claimed* — which self-repairs. Copy the shape; do not re-derive it. |
| **C19** | Do the badge stops (13, 14) share one passage? | **Decided: yes, one 8-sentence passage, one sentence per badge value.** | A sentence carries one `structure` **and** one `purpose` badge, so eight sentences cover all eight values twice over. Neither stop generates a `tap` (fact 3), so sharing creates no duplicate questions — the mechanism that would normally forbid it does not apply. It also halves the most expensive kind of authoring in the unit. |

## Out of scope

- **No taxonomy change.** No label added, renamed, reparented, or retired. The 87
  labels and the 8 badges are what this unit is built from, not something it edits.
  Adding `"subject-complement"` to `SIBLING_SUPERSETS` is a **test** declaration,
  not a taxonomy change.
- **No lesson-format change.** `group: "unit-sentence"` is a `wjt.EXAMPLES`
  registry field, which is app data, not the lesson file format.
- **No new step kind.** **C15** declines `classify`; **C11** declines span-choice.
- **No general course model.** **C13**.
- **No accounts, no network, no roster, no gradebook, nothing transmitted.** No
  teacher-visible view of any student's progress, on any surface.
- **No change to `quiz.js` or the three `assignment-*` modules.**
- **Restoring Practice, or correcting the docs that still advertise it.** Still a
  real pre-existing doc/reality mismatch, still not this unit's to fix. See Unit
  1's [Out of scope](curriculum-unit-1-parts-of-speech.md#out-of-scope).
- **The tablet walk.** 019 left every touch row honestly unverified and
  [pilot.md](../../docs/product/pilot.md) still names drag-on-an-iPad as the most
  likely broken thing in the product. This unit *depends* on that path more than
  anything shipped so far, but the walk is hardware time, not authoring time, and
  it belongs with [005](../005-presentation-ui-remediation.md)'s manual matrix.
- **Units 3+.**

## Phasing

Four orders. The split follows Unit 1's lesson — the phase that can go wrong is
the first one, so it ends with something a student can complete before the content
is written against the shape.

| Order | Contents |
|---|---|
| **021** | **The second unit, proven end to end.** Six content files with the load-order assertion in place from the start; the unit registered; the Home card generalized off `"pos"`; `layers: ["pos"]` in `study.js` confirmed or fixed; `SIBLING_SUPERSETS` extended; the Poe re-sourcing probe re-run and its passages verified unseen. **Stops 0–2 only** (orientation, subjects, predicates), complete and playable — which is also the first real multi-token `tap` a student has ever been asked for. |
| **022** | **Cluster A and B content.** Stops 3–9. Authoring, no new mechanics. The `verb`/`gerund` family constraint bites here (stop 7). |
| **023** | **Cluster C and D content.** Stops 10–15, including cluster D's shared badged passage and its ~24 authored items. The badged passages are here, so this is the order that meets the completeness cascade in anger. |
| **024** | **Finish.** The capstone; `docs/product/curriculum-unit-2.md`; amendments to [pilot.md](../../docs/product/pilot.md), [overview.md](../../docs/product/overview.md), [architecture.md](../../docs/project/architecture.md), [dom-structure.md](../../docs/project/dom-structure.md) if the Home card's structure changed, and [CLAUDE.md](../../CLAUDE.md). |

**Write `docs/product/curriculum-unit-2.md` in 021, not 024.** Unit 1's Phase 1
finding 6: amending `pilot.md` and `overview.md` created links to the student doc
before phase 3 was due to write it, and a dangling link in user-facing docs is
worse than an early doc. 024 extends it.

**Every order ends with someone playing the stops it added.** This is the one
thing to carry forward verbatim from Unit 1: *a passing check suite is not a played
unit.* Both faults [018](../done/018-unit-pos-answer-order-and-ambiguous-taps.md)
fixed — every `choice` delivered correct-answer-first, and 42 of 131 taps
contradicting their own reveal — were invariants nobody had written down, and 445
green checks were silent on both. Neither was found by a check; both were found by
playing.

After 024, [005](../005-presentation-ui-remediation.md)'s amended manual matrix
gets walked once with both units' surfaces in it.
