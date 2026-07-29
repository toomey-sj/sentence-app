# Architecture

Sentence Forge is ~8,300 lines of plain ES5-flavored JavaScript in thirteen files,
no dependencies, no build step. This document explains the shape of it and the
handful of decisions that everything else follows from.

- [The five constraints](#the-five-constraints)
- [File map](#file-map)
- [The `wjt` namespace](#the-wjt-namespace)
- [The data model](#the-data-model)
- [The annotation model](#the-annotation-model-char-offsets-snapped-to-tokens)
- [The taxonomy](#the-taxonomy)
- [Rendering](#rendering-one-css-grid-per-sentence)
- [Routing and views](#routing-and-views)
- [Delivery channels](#delivery-channels-wjtassignmentchannels)
- [Quiz generation](#quiz-generation)
- [Study mode](#study-mode-a-self-paced-unit-above-the-lesson)
- [Where docs must stay in sync](#the-taxonomy-is-documented-in-five-places)

---

## The five constraints

Everything below is downstream of these. Change one only with a deliberate
decision, because each has load-bearing consequences.

1. **It must run from `file://`.** A teacher double-clicks `index.html` off a USB
   stick on a locked-down school machine. This is why there are **no ES modules**
   (`file://` blocks them under CORS), no bundler, and no `fetch()` of local JSON
   — the example lessons are *built in JavaScript* (`js/examples.js`) rather than
   loaded from `samples/`.
2. **No dependencies and no build.** `<script>` tags in `index.html`, loaded in
   order. Node is used only to run the checks in `tools/`; there is no
   `package.json` because there is nothing to install.
3. **No network access, ever.** No analytics, no CDN, no fonts, no telemetry. The
   only `http` string in the whole app is the SVG namespace in the favicon data
   URI. See [SECURITY.md](../../SECURITY.md) for why this matters more than usual.
4. **Every annotation is a span over whole tokens.** This is the single most
   load-bearing model decision — it's why punctuation, usage errors, and verb
   tense are out of scope
   ([roadmap Tier 3](../roadmap.md#tier-3--out-of-scope-for-this-app-documented-for-a-sibling-tool)).
5. **The taxonomy is data.** `js/labels.js` is the only place a grammar label is
   defined. Adding a label is a data edit; the palette, the renderer, the quiz,
   and the exports all derive from it.

## File map

Load order matters — each file only depends on the ones above it.

| File | Lines | Responsibility |
|---|---:|---|
| `index.html` | 52 | The whole app shell: nav, `#app` mount, `#toasts`, twenty-one script tags. |
| `css/styles.css` | — | Design system, both themes, driven by CSS custom properties on `:root[data-theme]`. |
| `js/labels.js` | 767 | **The taxonomy.** `wjt.LAYERS`, `wjt.LABELS`, `wjt.SENTENCE_TYPES`, and the helpers over them. Zero DOM. |
| `js/tokenize.js` | 122 | Sentence splitting, tokenizing, and span↔token conversion. Zero DOM. |
| `js/store.js` | 664 | Lesson model, the storage adapter (`localStorage` implementation), the migration runner, JSON import/export, the built-in sample lesson. Nearly zero DOM. |
| `js/examples.js` | 1,776 | The seven example lessons, each as a `build()` that returns a lesson object. |
| `js/assignment-model.js` | 583 | Assignment question pool, balanced seeded selection, and the separate answer key. Zero DOM. |
| `js/assignment-codec.js` | 423 | Compact student-safe wire map, base64url, validation, and URL size states. Zero DOM. |
| `js/assignment-channels.js` | 307 | The delivery channels — print, file, link — behind one `available()` / `report()` / `deliver()` shape (seam S5). Reads `window.location` and nothing else. |
| `js/assignment.js` | 834 | 📝 Assignment builder view, `wjt.assignmentRender` (the student-safe sheet), and `wjt.assignmentPrint` (the printed worksheet and teacher answer key). |
| `js/render.js` | 860 | The shared sentence renderer: one grid per sentence, POS chips above, span bars below. Plus the label popover. |
| `js/editor.js` | 523 | ✎ Edit view — selection, the drill-down palette, notes, sentence type chips, merge/delete. |
| `js/display.js` | 494 | ▶ Present view — one sentence at a time, layer toggles, keyboard nav. |
| `js/quiz.js` | 461 | 🎯 Practice view — question generation, distractor choice, scoring, results. |
| `js/study-model.js` | 569 | **Study mode's engine.** Step assembly, label-scoped question generation, answer shuffling, answer checking, per-cluster reporting, local progress. Zero DOM. |
| `js/unit-pos.js` | 314 | **Unit 1 — The Nine Parts of Speech.** The `line()`/`passage()` authoring helpers, `wjt.unitPos`, the cluster titles, the label budget, Orientation, and the `wjt.study.register` call. Zero DOM. |
| `js/unit-pos-a.js` | 723 | Cluster A — nouns, determiners, pronouns, Review A. Zero DOM. |
| `js/unit-pos-b.js` | 351 | Cluster B — verbs, Review B. Zero DOM. |
| `js/unit-pos-c.js` | 566 | Cluster C — adjectives, adverbs, Review C. Zero DOM. |
| `js/unit-pos-d.js` | 578 | Cluster D — prepositions, conjunctions, interjections, Review D. Zero DOM. |
| `js/unit-pos-capstone.js` | 240 | The Capstone — the closing paragraphs, no teach screens, results by cluster. Zero DOM. |
| `js/study.js` | 683 | 🎓 Study view — the unit map, teach screens, quiz screens, the `sort` surface, results. |
| `js/app.js` | 546 | Hash routing, the library view, import, theme, toasts, first-run seeding. |

`tools/` is **not shipped** — it holds the two check suites, the doc generator,
and a lesson validator. `samples/` is documentation and hand-off material, not app input:
the app never reads it (see constraint 1), and `tools/smoke-test.js` regenerates
it from `js/examples.js`.

## The `wjt` namespace

Every file is an IIFE that hangs its exports on one global:

```js
(function () {
  "use strict";
  window.wjt = window.wjt || {};
  wjt.somethingNew = function () { /* … */ };
})();
```

Views register themselves as `wjt.views.<name>` and take `(container, lessonId)`.
There is no module system and no dependency injection — the load order in
`index.html` *is* the dependency graph.

This is also what makes the headless checks possible: `tools/smoke-test.js`
`vm.runInContext`s `labels.js`, `tokenize.js`, `store.js`, `examples.js`,
`assignment-model.js`, `assignment-codec.js`, and `assignment-channels.js` into a
sandbox with a fake `localStorage` and gets the whole logic layer with no DOM.
**Keep DOM access out of those seven files** or you break the smoke test.
The three `assignment-*` modules are held to the stricter bar by a source scan in
the same file: no `document`, no storage, no network, at all.

## The data model

A lesson, as stored in `localStorage` under `sentenceForge.lessons.v1`:

```js
{
  format: "sentence-forge-lesson", version: 1,
  id: "…", title: "…", description: "…",
  layers: ["pos", "part", "phrase", "clause"],  // which levels this lesson teaches
  essentialOnly: false,                         // narrows the editor palette only
  ownerId: null,                                // null means NO owner, not "unknown" (seam S3)
  sentences: [{
    text: "The curious fox darted across the frozen river.",
    types: { structure: "simple", purpose: "declarative" },   // optional
    notes: "…",                                               // optional whole-sentence note
    annotations: [
      { id: "…", start: 0, end: 15, label: "complete-subject", note: "…" }
    ]
  }],
  createdAt: "…", updatedAt: "…"
}
```

The **export** form drops `id`, `createdAt`, `updatedAt`, and per-annotation
`id`s, and only writes `essentialOnly` when it's `true` and `ownerId` when it's
set — so the defaults stay implicit and existing files stay byte-identical when a
field is added. The **import** form additionally accepts `{ "match": "text" }` in
place of `start`/`end`. Full spec: [lesson-json.md](lesson-json.md).

### Where lessons are kept: the storage adapter

`wjt.store` is the **model** — it knows what a lesson is: it stamps `updatedAt`,
sorts the library newest-first, duplicates, and runs the two sentence
transforms. It does **not** know where lessons live. That is
`wjt.store.adapter`, whose entire vocabulary is four methods:

```js
adapter.list()          // -> array of stored lessons, unordered
adapter.get(id)         // -> one lesson, or null
adapter.save(lesson)    // insert or replace by id; returns the lesson
adapter.remove(id)
```

The one implementation is `localStorage`, and it is deliberately whole-list:
`readAll()` → mutate → `writeAll()` against `sentenceForge.lessons.v1`. At
classroom scale (tens of lessons) that's fine and it removes a whole class of
partial-write bugs. It also throws `STORAGE_WRITE_FAILED` when the browser
refuses a write, and owns the corrupt-library salvage: an unreadable stored
value is copied aside to `sentenceForge.lessons.v1.corrupt` **before** anything
can overwrite it (once only), and reported through `wjt.store.corruptBackup`,
which boot reads to offer the teacher a download (audit P1-2).

**The interface is synchronous on purpose, and must stay that way.** Async is
the obvious shape for a future networked adapter and it is the wrong trade:
`list()`/`get()` are called inline during render in every view, so a Promise
surface rewrites all of them for no user-visible gain. A networked adapter
doesn't need it — it needs a read-through cache with a background flush (reads
from memory; writes to memory and `localStorage` immediately, to the network in
the background), which keeps this surface sync, keeps `file://` working, and
confines the change to `store.js`. This is seam **S1** of
[roadmap-platform.md](../roadmap-platform.md); it exists so the answer to "where
does teacher data live?" stays reversible.

Not to be confused with `wjt.safeStorage` in `app.js`: that is a try/catch shim
over small **preference** keys (theme, palette, the first-run seed flag) that
fails silently and flips `wjt.storageOK`. This one holds the teacher's work and
must surface failures.

### Migrations on read: `wjt.migrations`

`list()` and `get()` are not pass-throughs. Every lesson leaves storage through
the migration runner (seam **S4**), so no view ever sees an unmigrated lesson.

`wjt.migrations` is a plain object keyed by version number; each value is a pure
`(lesson) -> lesson` that takes a lesson at that version and returns it one step
closer to `wjt.LESSON_VERSION`, stamping the new `version` itself. The entry for
the current version is the **identity step**, and it runs on every read — that is
what keeps the runner live code instead of a registry that has never executed.

Three properties to preserve:

- **On read, not on write.** A lesson untouched for a year still migrates the day
  it's opened.
- **The read is a view.** Storage is not rewritten; the migrated shape lands on
  disk at the teacher's next save. A render must not trigger a silent write.
- **An unknown version is refused, not guessed at** — a lesson from a newer build,
  or a gap in the registry. It comes back exactly as stored and the refusal is
  published on `wjt.store.unsupportedVersion` (`{ id, version, reason }`), the
  same shape as `corruptBackup`.

The runner lives in the **model**, not the adapter, deliberately: persisting
lesson objects is the adapter's job, and what a `version` number means is model
knowledge. So the networked adapter P7 eventually picks gets migration for free
rather than having to remember it.

### Ids: `wjt.uid()`

Lesson ids and annotation ids both come from `wjt.uid()` in `tokenize.js`. It is
a v4 UUID, generated by `crypto.randomUUID()` where that exists, else formatted
by hand out of `crypto.getRandomValues()`, else — and only else — the original
`Date.now()` + six base36 characters of `Math.random()`.

Both fallbacks are load-bearing. `randomUUID()` requires a **secure context**,
which `file://` is not guaranteed to be (Edge happens to grant it; don't rely on
that), and `crypto` itself may be missing there, so a teacher who double-clicked
`index.html` must still be able to create a lesson. `tools/smoke-test.js` forces
all three tiers: it passes Node's WebCrypto into the `vm` sandbox for tier 1,
hides `randomUUID` for tier 2, and deletes `crypto` for tier 3.

Two properties hold for every id, and every call site depends on them:

- **Opaque.** Nothing anywhere parses an id, slices it, or infers order from it.
  Ids are only ever compared to their siblings with `===`; the library sorts on
  `updatedAt`. That is what made the format change above a one-function edit.
- **Volatile.** Export drops lesson and annotation ids; import mints fresh ones.
  So changing the format of *new* ids costs nothing and needs no migration, and
  ids minted by older versions stay valid forever.

This is **not** the never-rename-a-label-id rule ([CLAUDE.md](../../CLAUDE.md)
constraint #6). Label ids are stored inside every teacher's annotations and there
is no server to migrate them; these ids are the opposite kind of thing. Seam
**S2** of [roadmap-platform.md](../roadmap-platform.md), landed because ids are
about to start crossing machines, where a collision merges two teachers' work
irreversibly.

## The annotation model: char offsets snapped to tokens

An annotation is `{ start, end, label }` where `start`/`end` are **character
offsets into that sentence's `text`**, `end` exclusive.

The invariant: **stored offsets always sit on token boundaries.** Nothing in the
app ever stores a span that cuts a word in half. Two functions in `tokenize.js`
enforce it, and every entry point runs the pair:

```js
var range = wjt.spanToTokens(tokens, start, end);   // snaps OUTWARD to whole tokens
var span  = wjt.tokensToSpan(tokens, range.first, range.last);
```

Editor selection, JSON import, and `match` resolution all funnel through those
two. The payoff is that the renderer can assume a span covers whole grid columns,
which is what keeps every bar aligned under its words.

A "token" is whitespace-delimited and **includes its trailing punctuation** —
`"river."` is one token. That's why annotations in the samples often end with a
period.

**Sentence splitting is deliberately naive** (`wjt.splitSentences`). It splits on
`.?!…` plus optional closing quote, and on newlines. "Mr. Darcy" splits early;
the editor's **⤵ Merge next** button is the intended fix rather than a smarter
regex, because a regex that handles abbreviations still fails on the next case
and costs a class period when it does.

## The taxonomy

`js/labels.js` holds three data structures plus a normalization pass:

- **`wjt.LAYERS`** — four teaching levels, each with `name`, `short`, `unit`,
  `order`, `hint`.
- **`wjt.LABELS`** — 87 span labels keyed by id: `{ layer, parent, name, abbr,
  color, desc, example, tier }`.
- **`wjt.SENTENCE_TYPES`** — two axes (structure, purpose) of whole-sentence
  badges. These are *not* span labels and never appear in `annotations`.

The **normalization pass at the bottom of the file** is where inheritance
happens. A child inherits its parent's `layer` and `tier`, and its `color` unless
it sets its own. Anything untagged defaults to `tier: "essential"`. So
`wjt.LABELS[id].layer`, `.color`, and `.tier` are *always* populated at read time
and no consumer needs to walk the parent chain.

Two rules the smoke test enforces:

- **The tree is exactly one level deep.** A subtype's parent is always a base.
  No grandchildren. (`predicate-nominative` is conceptually a kind of
  `subject-complement` but is filed as a sibling under `complement` to keep this
  true — see [roadmap §1a](../roadmap.md#1a-complement-subtypes--the-most-cited-gap--completed-2026-07-20).)
- **Every Advanced label's parent is Essential**, so the Essential-only filter
  can never orphan a subtype.

The drill-down palette is **layer-agnostic**: `editor.js` renders the stacked
parent→child layout for any layer where `wjt.layerHasSubtypes()` is true. Adding a
`parent:` key is all it takes to restructure a palette — no engine change. (All
four layers use it today.)

Colors do double duty: `wjt.familyOf()` groups by base label, and `quiz.js` prefers
same-family distractors, so wrong answers come from the same color family a
student is looking at.

## Rendering: one CSS grid per sentence

`render.js` builds **one CSS grid per sentence, one column per token**:

- **Above** the words: POS chips, in a two-row arrangement when a token carries
  both a broad class and a specific subtype (this two-row treatment is
  **POS-only**).
- **The words** themselves, one per column.
- **Below**: span bars for the part / phrase / clause layers, packed **greedily
  into lanes** so overlapping spans stack instead of colliding.

Consequence: **long sentences scroll horizontally inside their card** rather than
wrapping. That is intentional — wrapping would break the column alignment the
whole visual depends on. Don't "fix" it without replacing the grid model.

The same renderer serves Edit, Present, and Practice, which is why a label looks
identical in all three.

For the actual element tree the renderer emits — grid rows, chip/bar/token
classes, the `data-*` and `--c` conventions — and the DOM of every view, see
[dom-structure.md](dom-structure.md).

## Routing and views

`app.js` owns a hash router with five routes:

| Hash | View |
|---|---|
| `#/` (anything else) | `wjt.views.library` |
| `#/edit/<id>` | `wjt.views.editor` |
| `#/present/<id>` | `wjt.views.present` |
| `#/quiz/<id>` | `wjt.views.quiz` |
| `#/assign/<id>` | `wjt.views.assignment` |
| `#/study/<unitId>` | `wjt.views.study` — the unit map |
| `#/study/<unitId>/<stopId>` | `wjt.views.study` — one stop |

Each view **replaces `#app` wholesale**. Any view that attaches a document-level
listener or a timer must register teardown with `wjt.onViewCleanup(fn)`; the
router runs those before rendering the next view, and swallows exceptions from
them so a broken teardown can never wedge navigation.

Hash routing (not the History API) is another `file://` consequence — there's no
server to rewrite paths.

## Delivery channels: `wjt.assignmentChannels`

Seam **S5** of [roadmap-platform.md](../roadmap-platform.md#seams-to-land-first).
"How can this assignment reach a student?" has exactly one answer, in one file,
and three implementations behind one shape:

```js
channel.available(env)         // -> { available, reason }   can it be used HERE?
channel.report(built, env)     // -> { ready, state, length, detail }   how big?
channel.deliver(built, opts)   // -> { ok: true, … } | { ok: false, error }
```

| Channel | What it is | Availability | Size |
|---|---|---|---|
| `print` | the worksheet + the separate answer key | always, every protocol | no limit |
| `file` | the assignment as one `.json` | always, every protocol | no limit |
| `link` | `assignment-codec.js`, wrapped | `http:`/`https:` only | the codec's `LIMITS` / `THRESHOLDS` |

Three properties are worth not breaking:

- **`available()` is where [P3](../roadmap-platform.md#decisions) is code.** Under
  `file://` the link channel returns `available: false` with a *displayed* reason
  in teacher language, and print and file stay available — that is the roadmap's
  "a teacher with no login and no network can still print a worksheet", enforced
  rather than promised. The gate lives here and nowhere else: no view reads
  `location.protocol`, and `available()` fails closed on an unknown protocol.
- **The codec is wrapped, never re-derived.** Every number the link channel
  reports comes from `wjt.assignmentCodec` at call time — `LIMITS.url` and the
  measured `THRESHOLDS.easy` / `.dense` QR bands. A parallel set of thresholds is
  how the builder and the QR encoder would start disagreeing.
- **A channel takes only the half it is entitled to.** `file` and `link` carry the
  student-safe `assignment`; the answer key leaves the app through exactly one
  channel — `print` — because a teacher asked for it on paper. `file`
  additionally drops the `seed`, which is a teacher's regenerate handle.

A channel's `status` is `"ready"` or `"planned"`. `link` is **planned**: its
availability and size reasoning are live and tested, and `deliver()` really
returns the URL, but the read-only student page that opens one is proposal
Phase 4 and doesn't exist yet. The builder renders a channel's buttons from
`actions` and enables them from `status` + `available` + `ready`, so that phase
flips two fields and changes no view code. Account-delivery slots in the same way
once [P7/P8](../roadmap-platform.md#decisions) resolve.

## Quiz generation

`quiz.js` generates questions *from the annotations already present*, which is
why authoring a lesson is the only authoring step. Three generators:

| Type | Prompt | Answer mechanism |
|---|---|---|
| Identify | "What is the **highlighted** word/phrase?" | multiple choice |
| Select | "Select the direct object" | drag across the words, press Check |
| Classify | "What is the structure/purpose of this sentence?" | multiple choice |

Distractors always come from the **answer's own layer**, ranked by
`wjt.familyOf()` match first and "already used elsewhere in this lesson" second —
so a gerund's alternatives are other verbals rather than "Interjection", and a
student can't rule an option out just because it's exotic. For a *select*
question, **every same-label span in the sentence is an acceptable answer**, so a
sentence with two prepositional phrases doesn't punish picking the other one. A
teaching `note` is surfaced in the feedback for a missed question, which is why
notes are worth writing.

Nothing is persisted. There's no attempt log, no score history, and deliberately
no way to reconstruct an individual student's answers.

## Study mode: a self-paced unit above the lesson

`roadmap-platform.md` **P1** names sequencing as the thing missing *above* the
lesson. Study mode is the first of it: **Unit 1 — The Nine Parts of Speech**, a
student-facing course that teaches a part of speech and then checks recall.
Design record: [curriculum-unit-1-parts-of-speech.md](../../plans/proposals/curriculum-unit-1-parts-of-speech.md).

It exists as a separate surface for one concrete reason. **Both existing question
generators select by *layer*, never by label family** — `annsForLayers` in
`quiz.js`, `skills` in `assignment-model.js` — so neither can ask "find the
possessive noun" without also asking about every other part of speech in the
passage. `study-model.js` filters by label id, which is the whole difference.

Three responsibilities, mirroring the assignment split — but the content half is
now **six files**, because all of it together ran past 2,300 lines:

- **`unit-pos.js` + `unit-pos-a…d.js` + `unit-pos-capstone.js`** — content. Eleven
  Poe passages, each an ordinary lesson registered into `wjt.EXAMPLES` with an
  additive `group: "unit-pos"`, plus the teach screens and the authored question
  bank. `unit-pos.js` holds the authoring helpers, the cluster titles, the label
  budget, Orientation, and the `wjt.study.register` call; each other file appends
  its cluster's stops through `wjt.unitPos.stops()`. **Load order is path order** —
  a cluster file appends to the array `unit-pos.js` already registered, so the
  `<script>` tag order in `index.html` is the order of the unit map. Nothing reads
  a unit's stops at load time, which is what makes filling it afterwards safe, and
  the smoke test asserts the stops come out numbered 0…14 in sequence so a drifted
  tag fails a check rather than reshuffling the unit.

  Passages are labelled **one POS label per token** by a `line()` helper that takes
  a label per token in order: substring matching silently mislabels short function
  words (`"he"` matches inside `"The"`), and a base *and* its subtype on one span
  would generate two questions with one highlighted word and two right answers.
- **`study-model.js`** — the engine. `steps()` assembles a stop, generating one
  `tap` question per (sentence, focus label) with `accept` covering every
  same-label span, the fairness rule `quiz.js` uses. `check()` is pure and takes
  plain data — the view reads `selection.get()` and hands over `{first,last}` for a
  `tap` or a `{ word: bucketId }` map for a `sort`, so no element ever reaches the
  model. `clusterReport()` groups a finished run by the cluster that taught each
  label, which is what the capstone's results screen renders.
- **`study.js`** — the view. Reuses `wjt.renderSentence` and the `.quiz-*` chrome,
  so a question here behaves like a question anywhere else.

### Answer order: authored one way, delivered another

Items are **authored correct-answer-first**, and a `sort`'s words are authored
cycling through the buckets in order. Both are the readable way to write a
question and a giveaway to *play* — all 77 items in Unit 1 were written that way,
so clicking the first button scored 100% on every choice question in the unit
without reading a word of it. `steps()` therefore **shuffles on the way out**:
the authoring convention stays, the student never sees it.

The shuffle is **seeded from the question's own stem**, not from `Math.random()`,
and that is load-bearing. `steps()` is called more than once for the same stop and
callers compare the results — `tools/dom-check.html` re-derives a step to work out
which option it must click in order to answer *wrong* on purpose. Under a per-call
random order it would click the right answer while asserting a wrong one,
intermittently. Same seed, same permutation, every call; where the answer lands is
decided by the stem it belongs to, which is why it isn't a fixed slot either.

`check()` and the results screen read the `correct` flag off the option itself and
`expected` off a `{ word: bucket }` map, so neither cares about order — **nothing
downstream may assume index 0.** The smoke test asserts both halves: the source is
still written correct-first, and the delivered order isn't.

### Four step kinds, and why `sort` is built the way it is

`teach` (no answer), `choice` (index equality), `tap` (token-range equality against
any same-label span), and `sort` (per-word bucket equality).

**A `tap` often has several right answers** — 42 of Unit 1's 131 as of this
writing, because the passages are real Poe and a sentence of it has six
prepositions in it. `accept` holds them all, so the prompt says so out loud
("Select any **one** preposition in this sentence — there are 6.") rather than
asking for "the" preposition and hoping. Each `accept` entry carries the span in
**both forms** — `{first,last}` token indices for `check()`, `{start,end}`
character offsets for the view — which is what lets the reveal highlight *the word
the student picked*. Before it did, `accept` held token ranges only, so the reveal
could only ever spotlight the span the question was generated from: a student who
correctly picked "vaults." was told "Correct" and then shown "moss".

`sort` is **tap-to-assign, never drag**: tap a word to pick it up, tap a bucket to
drop it in, tap a placed word to take it back out. `pilot.md` names drag-to-select
on a tablet as the single most likely broken thing in the product, and this is a
student-facing surface with no teacher in the room. Two consequences worth knowing
before changing it:

- **The chips never move.** Where a word has been placed shows as a tag on the chip
  and in its `aria-label`, so the answer is never carried by colour or position
  alone and a keyboard user's focus is never yanked to a re-parented element.
- **Every control is a real `<button>`**, which is what makes Enter and Space work;
  the arrow keys walk a group on top of that. Nothing has its own Enter handler,
  because that would fire alongside the browser's native activation.

Two stop fields shape generation, and both exist for the capstone: `tapPerLabel`
caps generated questions **per label** rather than per batch (a 48-label focus over
one passage would otherwise emit a question for every sentence×label pair), and
`itemsLast` puts the written items after the generated practice, since a stop with
no teach screens has nothing for them to follow.

Unit passages carry **no `types` badges and no part/phrase/clause annotations**.
That is what keeps `tools/completeness.js` satisfiable: a sentence with no badge
is treated as an intentional fragment, so only the POS-on-every-word rule applies.
Sentence structure is a later unit's subject.

### What study mode stores, and what it refuses to

One key, `sentenceForge.study.<unitId>.v1`, through `wjt.safeStorage` — so a
browser that refuses storage yields a *forgetful* unit, never a blank page:

```js
{ v: 1, at: "<stopId>", done: { nouns: 1 }, best: { nouns: 0.9 }, updatedAt: "…" }
```

A resume point, a done flag, and a best score. **No per-question record, ever** —
which keeps `roadmap-platform.md` **P2** ("Sentence Forge never collects a student
answer") literally true: nothing is transmitted, and nothing per-answer is written
even locally. An unreadable or foreign-version value is **discarded, not guessed
at**; this is disposable data, unlike a teacher's lessons, so it stays well away
from `wjt.store`, its adapter, and the migration runner.

Because school machines are shared, a prominent **Reset my progress** control is
part of the contract, not a nicety.

## The taxonomy is documented in five places

Adding or renaming a label touches more than `labels.js`. Three of the five are
**generated** — run `node tools/gen-docs.js` and they're correct by construction:

| Place | How it's maintained |
|---|---|
| `js/labels.js` | The source of truth. Hand-edited. |
| `docs/coverage-labels.{json,csv}` | **Generated** by `tools/gen-docs.js`. |
| `docs/product/grammar-reference.md` | **Generated** by `tools/gen-docs.js`. |
| `docs/coverage-brief.md` | Hand-maintained — counts and per-layer lists. |
| `docs/custom-gpt-instructions.md` | Hand-maintained — the label list in the prompt. |

CI fails if the generated three are stale. The last two are on you; the
step-by-step is in [taxonomy-workflow.md](taxonomy-workflow.md).
