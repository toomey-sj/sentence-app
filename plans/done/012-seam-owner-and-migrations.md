---
status: done   # todo | doing | done | superseded
created: 2026-07-28
updated: 2026-07-28
---

# S3 + S4 — `ownerId` on the lesson, and a migration runner

Seams **S3** and **S4** of [the platform roadmap](../../docs/roadmap-platform.md#seams-to-land-first),
step 2 of its sequencing. **No user-visible change.** Depends on
[010](010-seam-storage-adapter.md), which is where the runner is invoked.

## Why

Both are additive, both cost roughly nothing today, and both are **guesswork if
written later**:

- **`ownerId`** is trivial while there is exactly one local owner and the field
  is nullable. Adding it after a sync backend exists means backfilling rows whose
  owner you have to infer.
- **A migration runner.** `version: 1` exists in the lesson format with nothing
  that acts on it. The moment two clients sync at different versions you need
  one — and writing it retroactively means guessing what old data looked like,
  from data you no longer have a clean copy of.

They ship together because each alone is too small for its own work order, and
because S4 has nothing to prove itself against without a field like S3 to
migrate.

## Scope

### Task A — S3: nullable `ownerId`

- Add it in `wjt.store.create()` ([js/store.js:101-115](../../js/store.js#L101-L115)),
  defaulting to `null`. One local owner means nothing sets it yet.
- Preserve it through `wjt.importLesson()` when the uploaded file carries one,
  ignoring anything that isn't a string.
- **`wjt.exportLesson()` writes it only when set.** That is the pattern
  `essentialOnly` already uses at [js/store.js:295-296](../../js/store.js#L295-L296):

  ```js
  // Only written when on, so the default (full palette) stays implicit.
  if (lesson.essentialOnly) doc.essentialOnly = true;
  ```

  Follow it exactly. It means every existing sample and every teacher's exported
  file keeps round-tripping **byte-identically**, which is what makes this
  additive rather than a format change.

### Task B — S4: the migration runner

- A registry keyed by lesson `version`, invoked **on read** inside the S1 adapter
  — so a lesson is migrated once, on the way out of storage, before any view sees
  it. Not on write; a lesson that never gets opened should still migrate when it
  eventually is.
- **Register the identity migration for `version: 1`** and let it actually run.
  A runner with an empty registry is dead code that has never executed; the first
  time it matters is the worst time to find out it doesn't work.
- Migrations are pure functions `(lesson) -> lesson` and live in the logic layer.
  `store.js` stays DOM-free — it is in `LOGIC_FILES` at
  [tools/smoke-test.js:32-33](../../tools/smoke-test.js#L32-L33) and runs in a bare
  `vm` sandbox.
- Decide and write down what happens to a lesson whose `version` is **higher**
  than this build knows (a teacher opening their library on an older machine).
  Refusing to touch it and surfacing that clearly beats silently mangling it.

### Task C — docs

Update [docs/project/lesson-json.md](../../docs/project/lesson-json.md): `ownerId` as
a new optional field, what writes it, and that its absence is meaningful (no
owner, not "unknown owner"). Note the `version` field is now acted on.

## Out of scope

- **Bumping the lesson format version.** It stays `version: 1`. This change is
  additive by construction — that is the point, and the alpha rule in
  [CLAUDE.md](../../CLAUDE.md) is to keep the format additive.
- Writing an actual value into `ownerId`. Nothing has an identity to put there
  until [P8](../../docs/roadmap-platform.md#decisions) resolves. Nullable now, real
  later.
- Any migration that transforms real data. Identity only.

## Done when

- `node tools/smoke-test.js` reports **0 failed**, including a check that a
  registered migration **actually runs** on read (not merely that the registry
  exists).
- `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`
  passes.
- `samples/` regenerates **byte-identically** — if a sample file changes, the
  `exportLesson` guard in Task A is wrong.
- `git diff` covers `js/store.js` and `docs/project/lesson-json.md` (plus the
  smoke test), and nothing else.

## As built

Shipped 2026-07-28. Both tasks landed as written; three things are worth
recording.

- **The runner lives in the model, not the adapter — a deliberate divergence.**
  Task B said "invoked on read inside the S1 adapter." It is invoked on read, but
  from `wjt.store.list()`/`get()`, one level above `wjt.store.adapter`. The
  reason is [010](010-seam-storage-adapter.md)'s own division of labor: *the
  adapter knows about persisting lesson objects; it knows nothing about what a
  lesson means* — and what a `version` number means is exactly model knowledge.
  Putting the runner in the adapter would make every future adapter responsible
  for remembering to migrate; putting it in the model makes "no view ever sees an
  unmigrated lesson" hold no matter what is plugged in underneath. Every reason
  the task gave (once, on the way out of storage, before any view, not on write)
  is satisfied either way, so the stronger invariant won.
- **The read is a view — it does not write back.** Not specified either way, and
  worth pinning down: re-running the chain on every read is free at classroom
  scale, and a silent storage write during render is not something a render
  should do. The migrated shape reaches storage at the teacher's next save. The
  smoke test asserts this directly (`the read is a view — storage itself is not
  rewritten`), because "helpfully" persisting the migration is the obvious later
  change and it would make a render able to corrupt a library.
- **Unknown versions: refused, and the refusal is a published fact.** The
  decision Task B asked for is now written down in three places — the code
  comment, [lesson-json.md](../../docs/project/lesson-json.md#compatibility), and
  [architecture.md](../../docs/project/architecture.md). A lesson whose `version`
  this build doesn't have a step for comes back **exactly as stored** — including
  the case where a chain partially applied and *then* hit a gap, which restores
  the original rather than handing back a half-migrated object — and
  `wjt.store.unsupportedVersion` carries `{ id, version, reason }` for the shell,
  the same shape `corruptBackup` uses. The message is in teacher language
  ("saved by a newer version of Sentence Forge… open it there"). Nothing reads
  the flag yet; wiring it into a toast is a user-visible change and this work
  order was explicitly not one. The console gets a warning, once per
  lesson+version so a re-render can't spam it.
- **Registry shape.** Keyed by the version the lesson *has*, each step stamping
  the version it produced, and the runner following the chain until the version
  stops changing. That is what lets the identity step for the current version be
  a real registered entry that really runs, instead of a `while (v < CURRENT)`
  loop whose body never executes on a current lesson — which is what Task B was
  guarding against. The loop is bounded at 64 steps so a migration that forgets
  to advance `version` is refused rather than hanging a render; both the chaining
  and the non-advancing cases are tested with throwaway negative-numbered
  versions.
- **Two files beyond the plan's "Done when" list**, for the same reason
  [010](010-seam-storage-adapter.md) had one:
  [architecture.md](../../docs/project/architecture.md) described the stored
  lesson shape and said the export form "only writes `essentialOnly` when true"
  — both now false — and its storage section described `list()`/`get()` as
  pass-throughs, which they no longer are. It gained an `ownerId` line, a
  corrected export paragraph, and a *Migrations on read* section.
  [roadmap-platform.md](../../docs/roadmap-platform.md#seams-to-land-first) ticks
  S3 and S4, which completes sequencing step 2.
- **Verification.** `node tools/smoke-test.js` green — 22 new checks, and
  `samples/` regenerated **byte-identically** (`git status` shows no sample file
  touched), which is the real proof the `exportLesson` guard is right.
  `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`
  passes. `node tools/link-check.js --check` OK *after* re-basing this file's
  links and fixing the two work orders that pointed at it — the failure mode
  CLAUDE.md warns about, hit exactly as advertised. `tools/dom-check.html`
  **328 passed / 0 failed** at all four matrix sizes, which is what proves the
  real app still boots, lists, edits, and saves through a read path that now has
  a migration in it.

## Notes

- The runner is the thing that makes [P7](../../docs/roadmap-platform.md#decisions)
  survivable: once teacher data lives somewhere shared, two clients on different
  builds is the normal case, not an edge case.
- Keep the registry small and obvious. A migration framework is not wanted here —
  a plain object mapping a version number to a function is enough, and is what a
  cold session six months from now will be able to read.
