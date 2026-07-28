---
status: done   # todo | doing | done | superseded
created: 2026-07-28
updated: 2026-07-28
---

# S1 — a storage adapter behind `store.js`

Seam **S1** of [the platform roadmap](../../docs/roadmap-platform.md#seams-to-land-first),
step 2 of its sequencing. **No user-visible change.** Do this one first of the
seams — highest value, lowest cost.

## Why

[js/store.js](../../js/store.js) welds `localStorage` into the lesson model.
`readAll()` and `writeAll()` ([js/store.js:30-65](../../js/store.js#L30-L65)) are
whole-list reads and writes against a hardcoded `KEY`, and every method on
`wjt.store` calls straight through to them.

That is fine while a library lives in exactly one browser. It stops being fine
the moment the answer to
[P7 — where does teacher data actually live?](../../docs/roadmap-platform.md#decisions)
is anything other than "here." P7 is *deferred on purpose* — the fork between a
managed backend, self-hosting, and bring-your-own-cloud should be decided against
hosting cost and school procurement, none of which are answerable today. What is
**not** deferrable is stopping `localStorage` from being welded in while the
decision is pending.

This seam is cheap now and brutal after teachers have real work stored. That is
the whole argument for doing it before the pilot, and the roadmap says so
explicitly: *do not reorder step 4 ahead of step 2.*

## Scope

One file. `js/store.js` and nothing else.

### Task A — extract the interface

Introduce a storage adapter with four methods — `list()`, `get(id)`,
`save(lesson)`, `remove(id)` — and a localStorage implementation as #1.
`readAll()`/`writeAll()` become that implementation's internals rather than the
model's vocabulary.

**`wjt.store`'s public surface must stay byte-identical.** There are **24 call
sites outside `store.js`**, plus `wjt.exportAllLessons()` inside it. **Zero** of
them should need editing. If a call site changes, the extraction went too far.

| File | Calls | Methods used |
|---|---:|---|
| [js/app.js](../../js/app.js) | 15 | `list` ×4, `save` ×3, `corruptBackup` ×3, `remove` ×2, `create` ×2, `duplicate` |
| [js/editor.js](../../js/editor.js) | 5 | `get`, `save`, `remove`, `mergeSentence`, `rewriteSentenceText` |
| [js/assignment.js](../../js/assignment.js) | 1 | `get` |
| [js/display.js](../../js/display.js) | 1 | `get` |
| [js/quiz.js](../../js/quiz.js) | 1 | `get` |
| [js/examples.js](../../js/examples.js) | 1 | `create` |

Two of those are **not** in the original four-view list, because this order was
written before them:

- **`js/assignment.js`** is the Assignment builder view ([008](008-assignment-phase-2-builder.md)).
  Nothing special about its one `get()` — just don't forget the file exists.
- **`js/examples.js` calls `wjt.store.create()` and is a LOGIC file** — it runs in
  the smoke test's bare `vm` sandbox alongside `store.js`. So `create()` has to
  keep working with only the sandbox's `getItem`/`setItem`/`removeItem` shim
  (Task D), or `samples/` regeneration breaks and the "samples are up to date" CI
  step fails. Regenerate and diff `samples/` as part of this work, not after it.

The model-level behavior stays on `wjt.store`, not in the adapter: `create()`,
`duplicate()`, the `updatedAt` stamp in `save()`, the sort in `list()`, and the
two sentence transforms (`mergeSentence`, `rewriteSentenceText`). The adapter
knows about *persisting lesson objects*; it knows nothing about what a lesson
means.

### Task B — the one real design decision: keep it synchronous

**Record this rationale in the code comment, not just here.** It is the kind of
decision that gets silently reversed by a later session that "notices" the
adapter isn't async.

An async (`Promise`-returning) interface would be the obvious shape for a future
network adapter — and it would force a rewrite of every view, because
`wjt.store.list()` is called inline during render in all four of them. That is a
large, risky, entirely user-invisible change, which is precisely the failure mode
[P6](../../docs/roadmap-platform.md#decisions) exists to prevent: *spending the
pivot on tooling is how a direction change turns into a rewrite.*

A networked adapter later does **not** need the interface to be async. It needs a
read-through cache with a background flush: reads answer from memory, writes go
to memory and localStorage immediately and to the network in the background.
That keeps the synchronous surface, keeps the app working offline (which
[P3's degraded mode](../../docs/roadmap-platform.md#decisions) requires anyway), and
confines the change to this one file. Sync now is not a shortcut — it is the
design.

### Task C — preserve the corrupt-library salvage exactly

This is the part most likely to be lost in a refactor, and losing it destroys
recoverable teacher work.

Keep verbatim, from [js/store.js:44-53](../../js/store.js#L44-L53):

- the copy-aside to `KEY + ".corrupt"` **before** anything can overwrite the raw
  value;
- the once-only guard (`if (localStorage.getItem(CORRUPT_KEY) == null)`) so
  repeated reads never clobber the copy;
- the `wjt.store.corruptBackup` flag, which [js/app.js:472-482](../../js/app.js#L472-L482)
  reads at boot to offer the teacher a download;
- the "valid JSON but not our array shape" path, treated as corruption;
- the outer `try/catch` around `getItem` that returns `[]` when storage access
  itself is disabled — nothing to read *or* salvage.

**The storage key strings are asserted by the test**, not just the behavior: the
audit P1-2 checks in [tools/smoke-test.js:350-368](../../tools/smoke-test.js#L350-L368)
read `sentenceForge.lessons.v1` and `sentenceForge.lessons.v1.corrupt` out of the
sandbox map directly. Those checks must pass **unmodified**. If you find yourself
editing a check to make it green, the extraction is wrong — revert and try again.

### Task D — stay DOM-free

`store.js` is one of the six files [tools/smoke-test.js](../../tools/smoke-test.js)
runs in a bare `vm` sandbox (`LOGIC_FILES`, lines 32-33). A single `document`
reference breaks the whole suite. The sandbox provides `localStorage` as a `Map`
shim ([tools/smoke-test.js:16-20](../../tools/smoke-test.js#L16-L20)) — it has only
`getItem`/`setItem`/`removeItem`, so the adapter must not reach for `length`,
`key()`, or `clear()`.

### Task E — note the boundary with `wjt.safeStorage`

`wjt.safeStorage` ([js/app.js:146-156](../../js/app.js#L146-L156)) is a *different*
thing: a try/catch shim over **preference** keys (theme, palette, the `seeded`
flag) that lives in the DOM layer and flips `wjt.storageOK` so boot can warn once
(audit P0-2, DOM-checked at [tools/dom-check.html:279-295](../../tools/dom-check.html#L279-L295)).

Leave it alone, and leave a comment saying so. The two look mergeable and are
not: one guards small scalar preferences and may fail silently, the other holds
the teacher's actual work and must surface a `STORAGE_WRITE_FAILED` toast.

## Out of scope

- **Any second adapter.** One interface, one implementation. A stub "remote
  adapter" with no backend behind it is dead code that will be wrong by the time
  P7 resolves.
- `ownerId` and the migration runner — those are
  [012](../012-seam-owner-and-migrations.md), and they build on this.
- Changing `wjt.uid()` — that's [011](../011-seam-real-ids.md).
- Any change to the lesson format. `version: 1` stands.

## Done when

- `node tools/smoke-test.js` reports **0 failed** with the audit P1-2 checks
  **unedited**, and `samples/` regenerates unchanged.
- `git diff --name-only` lists **`js/store.js` only**.
- The app boots, creates, edits, duplicates, deletes, exports, and imports
  lessons exactly as before — verify in the browser, don't infer it from the
  smoke test.
- `tools/dom-check.html` reports 0 failed (it boots the real app, so a broken
  store shows up there).

  ✅ **That bar is clean again as of 2026-07-28.** `UI-4` had been failing on a
  clean tree and taking the whole run red; [014](014-ui4-dom-check-settle.md)
  fixed it (a harness bug — it measured Present before the wrap had run). The
  check now reports **328 passed / 0 failed** at all four matrix sizes, so take
  `0 failed` literally here: the DOM check is one of only two safety nets on the
  file that holds every teacher's work, and any failure is now yours.

## As built

Shipped 2026-07-28. The four-method interface landed as written; the parts worth
recording are where the plan under-specified something.

- **The adapter is reachable as `wjt.store.adapter`.** The plan said the public
  surface must stay byte-identical and zero call sites may change — both held
  (`git diff` touches no other `js/` file) — but a seam nothing can reach is not
  a seam, so the adapter is a named property rather than a closure variable.
  Swapping it is one assignment; the model logic above it never moves.
- **`corruptBackup` is published by the model, not the adapter.** The flag is
  part of `wjt.store`'s contract — [js/app.js:474-483](../../js/app.js#L474-L483)
  reads it at boot and the smoke test asserts it there — so the adapter takes an
  `onCorrupt(raw)` callback and the store decides where the flag lands. That
  keeps the adapter from having to know the name of the object that owns it, and
  keeps the once-only side-key copy where it belongs (in the implementation that
  knows what a side key is).
- **`store.js` was not the only file changed**, contrary to "Done when". The
  Notes clause won: the architecture doc's storage paragraph described
  `readAll()`/`writeAll()` as *the* persistence model, which is now false, so
  [docs/project/architecture.md](../../docs/project/architecture.md) gained a
  "Where lessons are kept" section carrying the sync-on-purpose rationale. Two
  files, one of them documentation.
- **The sync rationale is now in three places** — here, the doc, and a block
  comment at the top of the adapter in the code. That is deliberate
  over-recording: Task B predicted a later session would "notice" the adapter
  isn't async and helpfully fix it, and the code comment is the only one of the
  three that such a session is guaranteed to read.
- **Verification.** `node tools/smoke-test.js` green with the audit P1-2 checks
  unedited and `samples/` regenerated byte-identical; `tools/dom-check.html`
  **328 passed / 0 failed at all four matrix sizes** (1280×720, 1366×768,
  1920×1080, 1024×768). Browser behavior was checked with a throwaway harness
  beside `dom-check.html` (35 checks, all green, harness not committed): create,
  save, edit-in-place, list ordering, get, duplicate, remove, `exportAllLessons`
  → `importBundle` → re-save, the corrupt-salvage path against a real
  `localStorage` including the once-only guard and salvage via `get()` as well as
  `list()`, the `STORAGE_WRITE_FAILED` throw with `setItem` stubbed to fail, and
  a swapped in-memory adapter proving the seam works with no call-site edits.
- **One pre-existing wrinkle, unchanged and not a regression:** two lessons saved
  in the same millisecond tie on `updatedAt`, so `list()`'s sort leaves them in
  insertion order. It only shows up in a script that saves twice in a row; a real
  teacher can't hit it. Noting it because the harness did, and the next person to
  write one will hit it too.

## Notes

- [docs/project/architecture.md](../../docs/project/architecture.md) describes the
  storage layer; update it if the described shape changes.
- Nothing here requires P7 or P8 to be decided. That is the point — the seam is
  what makes the decision reversible.
