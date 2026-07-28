---
status: todo   # todo | doing | done | superseded
created: 2026-07-28
---

# S2 — real ids (`crypto.randomUUID` with a load-bearing fallback)

Seam **S2** of [the platform roadmap](../docs/roadmap-platform.md#seams-to-land-first),
step 2 of its sequencing. **No user-visible change.**

## Why

`wjt.uid()` ([js/tokenize.js:69-71](../js/tokenize.js#L69-L71)) is:

```js
wjt.uid = function () {
  return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};
```

`Date.now()` plus **six** characters of `Math.random()`. Inside one browser that
is fine — ids are only ever compared to their own siblings. It stops being fine
the moment two libraries merge, which is the entire premise of the platform
direction: a lesson handed to the teacher next door, a library synced from home
to school, a bundle imported on top of an existing one.

Do this **before** lessons cross machines. Retrofitting id uniqueness after a
collision has already merged two teachers' annotations is not a fix — the data
is gone.

## Scope

One function, plus the test-sandbox change it forces.

### Task A — the new `wjt.uid()`

Three tiers, in order:

1. **`crypto.randomUUID()`** where available.
2. **`crypto.getRandomValues()`** into a byte array, formatted as a v4 UUID.
3. **Today's implementation**, unchanged, as the last resort.

### Task B — the fallback is load-bearing, not decorative

Two concrete reasons, both of which must be in the code comment:

- **`randomUUID` requires a secure context**, and may be absent under `file://` —
  which is exactly the mode
  [P3](../docs/roadmap-platform.md#decisions) just committed to supporting as a
  degraded mode. A teacher double-clicking `index.html` on a school machine must
  still be able to create a lesson. Browser support for `crypto` under `file://`
  varies; do not assume tier 2 is always there either.
- **The smoke test's `vm` sandbox exposes no `crypto` at all.** See
  [tools/smoke-test.js:13-28](../tools/smoke-test.js#L13-L28) — the sandbox is
  `window`, `console`, `localStorage`, `Date`, `Math`, `JSON`, `String`, `Array`,
  `Object`, `setTimeout`. Nothing else. An implementation that assumes `crypto`
  exists takes the whole logic suite down.

**Adding `crypto` to the sandbox is part of this work order** — pass through
Node's `crypto.webcrypto` (or `require("crypto")` for `randomUUID`) so tier 1 is
exercised, **and** add a test that the tier-3 path still produces unique ids when
`crypto` is removed. A fallback nobody tests is a fallback that doesn't work.

Suggested checks:

- `wjt.uid()` returns a distinct value across a few thousand calls;
- with `crypto` deleted from the sandbox, the same holds;
- the id is a non-empty string usable as an object key and as a URL hash segment
  (it goes into `#/edit/:id`).

### Task C — say plainly that this is not the label-id rule

The roadmap's phrasing — *"It is the same lesson as the never-rename-a-label-id
rule in CLAUDE.md"* — is about the *principle* (an id that crosses a boundary is
data, treat it as such), and it reads like a warning that changing `uid()` is
dangerous. It is not. Put the distinction in the commit message and the code
comment:

- **Label ids** in [js/labels.js](../js/labels.js) are stored inside every
  teacher's annotations. Renaming one silently destroys work, with no server to
  migrate it. Constraint #6 in [CLAUDE.md](../CLAUDE.md). **Untouched here.**
- **`wjt.uid()` values** are volatile. `wjt.exportLesson()` drops annotation ids
  entirely ([js/store.js:284-288](../js/store.js#L284-L288)) and `importLesson`
  mints fresh ones on the way back in. Changing the *format* of newly minted ids
  breaks nothing, and old ids stay valid forever because nothing parses them.

### Task D — the call sites

`wjt.uid()` is called from [js/store.js](../js/store.js) (lesson id in
`create()`, annotation ids in import, merge, and the sample builder),
[js/editor.js:396](../js/editor.js#L396), and
[js/examples.js:25](../js/examples.js#L25). None of them inspect or parse the
value. Confirm that stays true — a call site that does string surgery on an id
is a bug this change would expose.

## Out of scope

- **Rewriting existing stored ids.** Old ids remain valid. There is no migration
  here and there should not be one.
- Any id *semantics* — no embedded timestamps, no ordering, no owner prefix.
  `ownerId` is a separate field and is [012](012-seam-owner-and-migrations.md).
- Changing the lesson format. `version: 1` stands.

## Done when

- `node tools/smoke-test.js` reports **0 failed**, including the new uniqueness
  checks on both the crypto path and the no-crypto path.
- `samples/` regenerates unchanged in content (ids are stripped on export, so a
  diff here means something else moved).
- The app boots and creates a lesson under **both** `file://` (double-click
  `index.html`) and `http://` (the local server used for the DOM check). Verify
  both by hand — this is the one seam whose failure mode is environment-specific.
- `tools/dom-check.html` reports 0 failed.

## Notes

- Ordering against [010](done/010-seam-storage-adapter.md) doesn't strictly matter,
  but 010 first is easier: it isolates the storage churn from the id churn, so a
  regression in either is unambiguous.
- Worth a line in [docs/project/architecture.md](../docs/project/architecture.md)
  once landed — the id scheme is the sort of thing a future session will want to
  find written down rather than infer.
