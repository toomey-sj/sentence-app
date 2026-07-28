---
status: todo   # todo | doing | done | superseded
created: 2026-07-28
---

# S3 + S4 — `ownerId` on the lesson, and a migration runner

Seams **S3** and **S4** of [the platform roadmap](../docs/roadmap-platform.md#seams-to-land-first),
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

- Add it in `wjt.store.create()` ([js/store.js:101-115](../js/store.js#L101-L115)),
  defaulting to `null`. One local owner means nothing sets it yet.
- Preserve it through `wjt.importLesson()` when the uploaded file carries one,
  ignoring anything that isn't a string.
- **`wjt.exportLesson()` writes it only when set.** That is the pattern
  `essentialOnly` already uses at [js/store.js:295-296](../js/store.js#L295-L296):

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
  [tools/smoke-test.js:32-33](../tools/smoke-test.js#L32-L33) and runs in a bare
  `vm` sandbox.
- Decide and write down what happens to a lesson whose `version` is **higher**
  than this build knows (a teacher opening their library on an older machine).
  Refusing to touch it and surfacing that clearly beats silently mangling it.

### Task C — docs

Update [docs/project/lesson-json.md](../docs/project/lesson-json.md): `ownerId` as
a new optional field, what writes it, and that its absence is meaningful (no
owner, not "unknown owner"). Note the `version` field is now acted on.

## Out of scope

- **Bumping the lesson format version.** It stays `version: 1`. This change is
  additive by construction — that is the point, and the alpha rule in
  [CLAUDE.md](../CLAUDE.md) is to keep the format additive.
- Writing an actual value into `ownerId`. Nothing has an identity to put there
  until [P8](../docs/roadmap-platform.md#decisions) resolves. Nullable now, real
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

## Notes

- The runner is the thing that makes [P7](../docs/roadmap-platform.md#decisions)
  survivable: once teacher data lives somewhere shared, two clients on different
  builds is the normal case, not an edge case.
- Keep the registry small and obvious. A migration framework is not wanted here —
  a plain object mapping a version number to a function is enough, and is what a
  cold session six months from now will be able to read.
