---
status: done   # todo | doing | done
created: 2026-07-22
---

# P3 — Importer robustness (fold smart quotes + Unicode spaces in `match`)

Implements **workstream P3** of [docs/roadmap-0.1.0.md](../docs/roadmap-0.1.0.md),
folding in **items 1 & 2** of [to-do.md](../to-do.md). Additive, non-breaking,
and **offset-safe** — anything that matches today still matches; nothing changes
the stored passage text or the lesson format (`version: 1`).

## Why

`match` addressing resolves via a literal `String.prototype.indexOf` — an author
typing a **straight** quote in `match` fails to find a passage containing the
**curly** variant, and the annotation is dropped with only a `warnings` entry.
The same silent miss happens when web/Word text carries a non-breaking or
typographic space where the `match` string has a plain ASCII space. This is the
exact failure the docs currently *promise* at
[lesson-json.md:96-97](../docs/project/lesson-json.md#L96-L97) (a straight-quote
`match` won't find curly-quote text).

Curly-to-straight and NBSP-to-space are each **1 code unit -> 1 code unit**
substitutions, so folding both sides of the comparison preserves every index:
the resolved `start`/`end` still slice the *untouched* original text.

## Scope

One real touch point plus a small pure helper, a docs flip, and two tests. Keeps
[js/store.js](../js/store.js) **DOM-free** (pure string logic) — the smoke test's
`vm` sandbox stays green.

### The touch point

> **Line-number note:** to-do.md and the roadmap both cite `store.js:161`, but
> the actual `indexOf` is now at [store.js:168](../js/store.js#L168), inside the
> `if (typeof a.match === "string" && a.match)` block
> ([store.js:167-171](../js/store.js#L167-L171)). Verify before editing; the file
> has moved since those docs were written.

Current code:

```js
if (typeof a.match === "string" && a.match) {
  var at = text.indexOf(a.match);
  if (at === -1) { warnings.push('Text "' + a.match + '" not found (' + where + ")."); return; }
  start = at; end = at + a.match.length;
}
```

### Task A — a pure `foldForMatch()` helper

Add near the top of the [js/store.js](../js/store.js) IIFE (module-local
`function`, not on `wjt` — it's an internal detail). Folds both classes at once.
Use `\uXXXX` escapes, **not** literal glyphs — a literal curly `’` vs straight
`'` is invisible in a diff and unreviewable:

```js
// Fold typographic look-alikes to ASCII for the `match` lookup ONLY.
// Every substitution is 1 code unit -> 1 code unit, so length and all offsets
// are preserved: the resolved span still slices the untouched original text.
function foldForMatch(s) {
  return s
    .replace(/[‘’‛]/g, "'")        // ' ' left/right/reversed single -> '
    .replace(/[“”]/g, '"')              // " " left/right double -> "
    .replace(/[  -  ]/g, " ");// NBSP, en..hair, narrow NBSP -> space
}
```

- `‘ ’ ‛` — left/right/high-reversed single quotes and apostrophe.
- `“ ”` — left/right double quotes.
- ` ` NBSP, ` `–` ` (en/em/three-per-em/thin/hair, etc.),
  ` ` narrow NBSP. All single-code-unit -> single space.

### Task B — apply it at the touch point

Fold **both sides**; keep offsets from the original string. `a.match.length`
stays correct because `foldForMatch` preserves length:

```js
if (typeof a.match === "string" && a.match) {
  var at = foldForMatch(text).indexOf(foldForMatch(a.match));
  if (at === -1) { warnings.push('Text "' + a.match + '" not found (' + where + ")."); return; }
  start = at; end = at + a.match.length;
}
```

*Do not* fold `text` anywhere else — the stored `sentence.text`, the tokenizer
input, and the final `span` all continue to use the original, untouched string.
The fold exists only to locate the index.

### Task C — flip the docs note

**[docs/project/lesson-json.md:96-97](../docs/project/lesson-json.md#L96-L97)** —
replace the "no normalization" note with the new, honest behavior:

> `match` folds smart quotes (curly single/double -> straight) and Unicode
> spaces (NBSP, narrow NBSP, en/em/thin/hair spaces -> a plain space) before
> comparing, so a straight quote finds a curly one and pasted typographic spaces
> still match. It does **not** case-fold, and length-changing look-alikes are not
> handled: an ellipsis char vs three dots, and a Word-autocorrected `--` vs an em
> dash, will still miss (see [to-do.md](../../to-do.md) item 3).

### Task D — two smoke tests

**[tools/smoke-test.js](../tools/smoke-test.js)** — extend the existing
"import with match addressing" block (after
[smoke-test.js:239](../tools/smoke-test.js#L239)) with a curly-quote case and an
NBSP case. Build the source strings with `\u` escapes so the test file itself
stays ASCII and its intent is legible. Both assert the annotation resolves *and*
that the offsets slice the right region of the original text:

```js
// --- match folds smart quotes and Unicode spaces (P3) ---
var curlyText = "The dog didn’t bark.";           // curly apostrophe in the passage
var curly = wjt.importLesson({
  title: "Curly", sentences: [
    { text: curlyText, annotations: [ { match: "didn't", label: "verb" } ] },   // straight in match
  ],
});
check("import: straight-quote match finds curly text", curly.lesson.sentences[0].annotations.length === 1);
check("import: curly match offsets slice the original text",
  curlyText.slice(
    curly.lesson.sentences[0].annotations[0].start,
    curly.lesson.sentences[0].annotations[0].end).indexOf("didn’t") === 0);

var nbspText = "New York is big.";                 // NBSP between the words
var nbsp = wjt.importLesson({
  title: "NBSP", sentences: [
    { text: nbspText, annotations: [ { match: "New York", label: "noun" } ] },  // ASCII space in match
  ],
});
check("import: ASCII-space match finds NBSP text", nbsp.lesson.sentences[0].annotations.length === 1);
```

Notes for whoever writes these:

- Spans **snap outward to whole tokens** ([lesson-json.md:99](../docs/project/lesson-json.md#L99)),
  so the resolved `start`/`end` may be wider than the `match` string. The curly
  test asserts the slice *begins with* the folded target rather than equalling
  it — don't assert exact equality against the raw `match`. Confirm the actual
  values against the run and tighten if useful.
- These use `var` to match the surrounding smoke-test style; check whether that
  block uses `const` and follow whatever is local.

## Out of scope (recorded, not forgotten)

- **to-do.md item 3** — length-changing look-alikes (ellipsis char vs `...`,
  `--` vs em/en dash). These are **not** 1:1, so a naive fold would shift
  offsets; they need a normalized->original offset map. Explicitly **deferred**
  for 0.1.0.
- **to-do.md item 4** — colons/semicolons: **wontfix**, no English-prose
  look-alike.
- **Case-folding** — not in scope; the docs note above says so.
- Any change to `tokenize` — its `\S+` already splits on these spaces, so only
  the `match` lookup is affected.

## Done when

- `node tools/smoke-test.js` -> **All checks passed**, including the two new
  cases. It **regenerates `samples/`** — the fold is backward-compatible, so the
  samples should be byte-identical, but **commit any regenerated output**.
- `node tools/gen-docs.js --check` passes (no taxonomy change — should be a
  no-op; confirm it doesn't complain).
- `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`
  passes — nothing that validates today should regress.
- `node tools/cvd-check.js --check` and
  `node tools/cvd-check.js --palette=cbSafe --check` pass (unaffected — no color
  change — but they're in the standard bar).
- **Browser DOM check is NOT required:** this change is pure model logic in
  [store.js](../js/store.js); it touches no renderer, no element tree, no class
  names. [dom-structure.md](../docs/project/dom-structure.md) needs no update.
- Manual spot-check in the app (open `index.html` from `file://`): hand-write a
  lesson JSON with a straight-quote `match` against curly-quote text, import it,
  and confirm the annotation lands instead of dropping.
- Report results honestly, per [CLAUDE.md](../CLAUDE.md) — a red check is not
  "done."

## Notes

- Keep the ES5 house style: `var`, `function`, `"use strict"`, one IIFE. Match
  the surrounding code in [store.js](../js/store.js).
- After landing, tick the P3 boxes in
  [docs/roadmap-0.1.0.md](../docs/roadmap-0.1.0.md) (including the doc-follow-up
  and the "leave item 3 deferred" line), set `status: done` here, and
  `git mv plans/002-importer-fold.md plans/done/` in the same commit — the
  convention 001 followed.
- The **"As built"** section in the roadmap should note anything that diverged —
  in particular, correct the stale `store.js:161` reference if it survives
  anywhere else.
