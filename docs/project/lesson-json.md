# Lesson JSON — format specification

The lesson file is the only interface Sentence Forge exposes: it is what
**⬇ Export** writes, what **⬆ Import JSON** reads, what the samples in
[`samples/`](../../samples/) are, and what a custom GPT produces.

The authoritative implementation is `wjt.importLesson` / `wjt.exportLesson` in
[`js/store.js`](../../js/store.js). This document describes it; where the two
disagree, the code wins and this document is a bug.

- [Complete example](#complete-example)
- [Top level](#top-level)
- [Sentence objects](#sentence-objects)
- [Annotation objects](#annotation-objects)
- [Completeness](#completeness)
- [What the importer skips vs. rejects](#what-the-importer-skips-vs-rejects)
- [Export differs from import](#export-differs-from-import)
- [Compatibility](#compatibility)

---

## Complete example

```json
{
  "format": "sentence-forge-lesson",
  "version": 1,
  "title": "The Fox and the River",
  "description": "A one-sentence starter labeled at every level.",
  "layers": ["pos", "part", "phrase", "clause"],
  "essentialOnly": false,
  "sentences": [
    {
      "text": "The curious fox darted across the frozen river.",
      "types": { "structure": "simple", "purpose": "declarative" },
      "annotations": [
        { "match": "fox", "label": "simple-subject" },
        { "match": "The curious fox", "label": "complete-subject", "note": "Ask: who is this sentence about?" },
        { "match": "across the frozen river", "label": "prepositional-phrase" },
        { "start": 0, "end": 46, "label": "independent-clause" }
      ]
    }
  ]
}
```

## Top level

| Field | Type | Required | Behavior |
|---|---|---|---|
| `format` | string | recommended | If present it **must** be `"sentence-forge-lesson"`, or the import is rejected outright. Absent is fine. |
| `version` | number | optional | The lesson format version — currently `1`. Absent means `1`. Not validated on import, but **acted on when a lesson is read out of storage** — see [Compatibility](#compatibility). |
| `title` | string | recommended | Defaults to `"Imported lesson"`. Coerced with `String()`. |
| `description` | string | optional | Shown on the lesson card. Defaults to `""`. |
| `layers` | string[] | optional | Which teaching levels the lesson uses: any of `pos`, `part`, `phrase`, `clause`. Unrecognized entries are dropped with a warning. An empty or absent array falls back to all four, and **any layer actually used by an annotation is added automatically** — so you can omit this entirely. |
| `essentialOnly` | boolean | optional | Default `false`. Strictly `=== true` to enable. Narrows the *editor palette* to Essential labels; never hides an existing annotation. |
| `ownerId` | string | optional | Who owns this lesson. Preserved on import when it's a non-empty string, ignored otherwise; written on export **only when set**. See below. |
| `sentences` | array | **required** | Must be an array or the import is rejected. Must yield at least one usable sentence. |

### `ownerId`

**Absence is meaningful: it means *no owner*, not *unknown owner*.** Nothing in
the app writes a real value yet — `wjt.store.create()` sets it to `null`, and it
stays `null` until teacher accounts exist
([P8](../roadmap-platform.md#decisions)). So today every lesson is ownerless and
no exported file contains the field at all.

It exists now, ahead of the thing that fills it, because adding it later means
backfilling rows whose owner has to be *inferred* — see seam **S3** in
[roadmap-platform.md](../roadmap-platform.md#seams-to-land-first). The only thing
that can set it is a file that already carries one, which today only happens if
someone hand-wrote it.

Two consequences worth stating plainly:

- **An `ownerId` in a lesson file is not a permission.** There is no server and
  no identity to check it against; it is a label the importer carries through.
  Anyone who can open the file can open the lesson.
- **Ownerless lessons export byte-identically to before the field existed**,
  which is the whole reason this was additive rather than a format change.

## Sentence objects

Each entry in `sentences` is either a **string** (treated as `text` with no
annotations) or an object:

| Field | Type | Required | Behavior |
|---|---|---|---|
| `text` | string | **yes** | The exact sentence, punctuation included. Trimmed. An empty result is skipped with a warning. |
| `types` | object | optional | `{ "structure": …, "purpose": … }`. Either key may be omitted. |
| `notes` | string | optional | A short free-text note about the sentence itself (special handling — e.g. a cleft construction). Trimmed; omitted when empty. Surfaces under the type badges in Present mode and in Practice feedback. This is **whole-sentence** — distinct from an annotation's `note`, which is about one span. |
| `annotations` | array | optional | Defaults to empty. |

### `types` values

| Key | Valid values |
|---|---|
| `structure` | `simple` · `compound` · `complex` · `compound-complex` |
| `purpose` | `declarative` · `interrogative` · `imperative` · `exclamatory` |

An unknown value is skipped with a warning; the other axis still applies. These
are whole-sentence badges — **never** put them in `annotations`.

## Annotation objects

An annotation marks one span of the sentence and gives it one label.

| Field | Type | Required | Behavior |
|---|---|---|---|
| `label` | string | **yes** | A label id from [grammar-reference.md](../product/grammar-reference.md). Unknown ids are skipped with a warning. |
| `match` | string | one of | The **first occurrence** of this exact substring of `text` becomes the span. |
| `start` / `end` | number | one of | 0-based character offsets into `text`; `end` is **exclusive**. |
| `note` | string | optional | A teaching note. Surfaces in Present mode and in quiz feedback. |

**`match` wins.** If both `match` and `start`/`end` are present, `match` is
resolved and the offsets are overwritten. Use `start`/`end` only when the text
you want appears more than once and you need a later occurrence.

`match` folds smart quotes (curly single/double → straight) and Unicode spaces
(NBSP, narrow NBSP, en/em/thin/hair spaces → a plain space) before comparing, so
a straight quote finds a curly one and pasted typographic spaces still match. It
does **not** case-fold, and length-changing look-alikes are not handled: an
ellipsis char vs three dots, and a Word-autocorrected `--` vs an em dash, will
still miss (see [to-do.md](../../to-do.md) item 3).

### Spans snap outward to whole words

Whatever you supply, the stored span is expanded to cover **complete tokens**.
A token is whitespace-delimited and includes trailing punctuation, so `"river."`
is one token.

This means offsets don't have to be exact — `{"start": 6, "end": 11}` over
`"The curious fox"` snaps out to cover `curious fox`. It also means **you cannot
label part of a word**, and it's why the example above can write `"end": 46`
(stopping before the period) and still get the whole sentence.

Annotations may freely **overlap**, both within a layer and across layers. The
same words being a `noun`, a `noun-phrase`, and part of a `complete-subject` is
the normal case, not a conflict.

## Completeness

The importer's bias is **partial success** (see the next section): it accepts a
lesson with unlabelled words or a subject-less sentence. That is right for a
teacher's in-progress file, but the lessons this project *ships* — everything
built from [`js/examples.js`](../../js/examples.js) (and the Fox demo in
[`js/store.js`](../../js/store.js)) into [`samples/`](../../samples/) — are held
to a stricter **completeness** standard, enforced by
[`tools/completeness.js`](../../tools/completeness.js): blocking inside
`node tools/smoke-test.js`, and opt-in as `node tools/validate-lesson.js --complete`
(see [testing.md](testing.md)).

The standard was added after an audit found the Sentence-Parts and Clause layers
were thin across the samples — many sentences had a part of speech on every word
but no subject, predicate, or clause span, and some complete sentences carried no
type badge. For **every sentence that carries a `types` badge**:

1. **Part of speech on every word** — every word-bearing token is covered by a
   `pos` annotation. Pure-punctuation tokens are exempt; a contraction is one
   token, labelled once by its head word.
2. **Clause coverage** — the sentence has at least one clause span, and the
   clause spans together cover every token except interjections and stray
   punctuation. By convention a coordinating conjunction joining two clauses is
   absorbed into the clause it introduces, so it counts as covered.
3. **A subject and predicate per clause** — every clause span contains a
   `subject`-family span and a `predicate`-family span. A command satisfies the
   subject rule with `understood-subject` on the commanded verb.

**Fragments opt out by having no `types` badge.** A sentence with neither
`structure` nor `purpose` is treated as an intentional fragment — a line of
verse, a caption — and is exempt from rules 2–3, though rule 1 still applies.
This is why the
[Romeo & Juliet sample](../../samples/romeo-juliet-prologue.sentence-forge.json)
leaves most of its lines unbadged, while its two stand-alone sentences are fully
resolved. A genuine sentence always carries both axes.

This is a **curation standard, not a format rule.** Nothing here changes what the
importer accepts; a teacher's partial lesson is still valid. It is the bar for
lessons we author and for what a custom GPT should produce (see
[custom-gpt-instructions.md](../custom-gpt-instructions.md)).

## What the importer skips vs. rejects

**Rejected** — the whole file fails with a message in a toast:

- Not a JSON object.
- `format` present and not `"sentence-forge-lesson"`.
- `sentences` missing or not an array.
- No usable sentences after processing.

**Skipped with a warning** — the rest of the file still imports, and the warning
goes to the browser console (`[Sentence Forge import]`) with a count in the toast:

- An unrecognized entry in `layers`.
- An empty sentence.
- An unknown `types` value.
- An annotation that isn't an object.
- An unknown `label` id.
- A `match` string not found in `text`.
- Non-numeric offsets, or `end <= start`.
- A span that covers no tokens.

The design bias is **partial success**: a teacher gets the 48 annotations that
worked rather than a rejected file, and finds the 2 that didn't in the console.

## Export differs from import

`wjt.exportLesson` writes a strict subset:

- **Drops** `id`, `createdAt`, `updatedAt`, and each annotation's `id` — those
  are per-device and regenerated on import.
- **Always** writes `start`/`end`, never `match`. (`match` is an import-side
  convenience for hand-authoring.)
- **Omits** `note` when empty, `notes` (the sentence-level note) when empty,
  `types` when empty, `essentialOnly` unless it's `true`, and `ownerId` unless
  it's a non-empty string — so the defaults stay implicit and adding those fields
  didn't change any existing file.

Round-tripping a lesson through export → import is lossless except for those ids
and, in the general case, a re-derived `layers` array.

## Compatibility

There is still exactly **one version**, and the rule stands: keep changes
**additive and optional**, the way `types`, `notes`, `essentialOnly`, and
`ownerId` were added. An old file must keep importing, and a file written by a
newer app should degrade to skipped-with-a-warning in an older one rather than
being rejected.

What changed is that `version` is no longer inert. There is a **migration
runner** in [`js/store.js`](../../js/store.js) — seam **S4** of
[roadmap-platform.md](../roadmap-platform.md#seams-to-land-first) — and this is
what it does:

- **`wjt.migrations` is a plain object**, keyed by version number, whose values
  are pure `(lesson) -> lesson` functions. `wjt.migrations[n]` takes a lesson at
  version `n` and returns it one step closer to `wjt.LESSON_VERSION`, stamping
  the new `version` itself; the runner then looks up the next step.
- **`wjt.migrations[1]` is the identity step** and it really runs, on every read
  of every lesson. That is deliberate: a runner whose registry has never executed
  is dead code, and the first time it matters is the worst moment to discover it
  doesn't work.
- **It runs on read, not on write** — in `wjt.store.list()`/`get()`, so nothing
  reaches a view unmigrated, and a lesson a teacher hasn't opened in a year still
  migrates when they finally do. The read is a *view*: storage is not rewritten,
  and the migrated shape lands on disk at the teacher's next save.
- **A version this build doesn't know is refused, not guessed at.** That covers a
  lesson from a newer build (a teacher opening a synced library on an older
  machine) and a gap in the registry. The lesson comes back **exactly as stored**,
  and the refusal is published on `wjt.store.unsupportedVersion` as
  `{ id, version, reason }` — the same pattern as `corruptBackup`. Refusing keeps
  the data intact and readable on the machine that *can* read it; a half-applied
  guess doesn't.

The runner is on the **storage** path only. `importLesson` still does not branch
on `version` — an uploaded file is normalized field by field, and an unrecognized
field is ignored rather than migrated. If a future version needs import-side
handling, that is a separate decision from this one.
