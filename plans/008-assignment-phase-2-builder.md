---
status: todo   # todo | doing | done | superseded
created: 2026-07-28
---

# Assignment mode Phase 2 — builder view and live preview

Step 1 of the [platform roadmap's sequencing](../docs/roadmap-platform.md#sequencing),
and **Phase 2** of
[the assignment-mode proposal](proposals/assignment-mode-proposal.md#phase-2--builder-and-preview).
No network, no lesson-format change, no taxonomy change.

## Why

Phase 1 landed the whole engine — [js/assignment-model.js](../js/assignment-model.js)
(`wjt.assignment`: question pool, balanced selection, answer key) and
[js/assignment-codec.js](../js/assignment-codec.js) (`wjt.assignmentCodec`: wire
map, base64url, validation, size states) — and shipped it with **no way for a
teacher to reach any of it**. There is no route, no entry point, and no UI.

Everything downstream is blocked on this: the print worksheet (009) renders what
the builder produces, and the delivery-channel work (013) needs somewhere to put
a "share this" control. Build the front door first.

## Scope

One new view file, one route, two entry points. The model already exposes
everything the builder needs.

### Task A — the view file and its wiring

Create **`js/assignment.js`**. That name was deliberately left free by the Phase
1 "As built" note — the two logic modules took the hyphenated names precisely so
the plain one could be the Phase 2 **view**.

- It is a **view**, so it lives in the DOM layer and is *not* added to
  `LOGIC_FILES` in [tools/smoke-test.js](../tools/smoke-test.js). Do not put
  question logic in it.
- Follow the existing view shape exactly — see `wjt.views.present` at
  [js/display.js:10-25](../js/display.js#L10-L25): one IIFE, `"use strict"`,
  `wjt.views = wjt.views || {}`, signature `function (container, lessonId)`,
  `container.innerHTML = ""`, then an appended `div.view.view-assignment`.
- Bail the same way Present does: `wjt.store.get(lessonId)` returning null →
  `location.hash = "#/"`; a lesson with no sentences → back to the editor with a
  toast.
- Add the `<script>` tag to [index.html](../index.html) **after**
  `js/assignment-codec.js` and **before** `js/render.js` (the file currently has
  the two assignment modules at lines 29–30). Order matters: classic scripts, no
  modules.
- Register any timers/listeners through `wjt.onViewCleanup`
  ([js/app.js:130](../js/app.js#L130)).

### Task B — the route

Add `#/assign/:lessonId` to `route()` at
[js/app.js:409-417](../js/app.js#L409-L417), in the same `parts[0] === …` chain
as `edit`, `present`, `quiz`, and `library`:

```js
else if (parts[0] === "assign" && parts[1]) wjt.views.assignment(container, parts[1]);
```

### Task C — entry points

Two, mirroring how Present is reached today:

- **Library lesson card** — the grid built in `renderLessons()` from
  [js/app.js:274](../js/app.js#L274); the existing `location.hash = "#/present/"`
  handler at [js/app.js:366](../js/app.js#L366) is the pattern to copy.
- **Editor header** — alongside the existing Present link.

Note that Quiz is currently commented out of the Present header
([js/display.js:35](../js/display.js#L35), per `plans/quick-todo.md` item 4).
Assignment is a *new* control, not a replacement for that one — don't quietly
un-hide Quiz while you're in there.

### Task D — the controls

Every control maps 1:1 onto a field of the `selection` object that
`wjt.assignment.build(lesson, selection)` **already accepts**:

| Control | `selection` field |
|---|---|
| Title | `title` (defaults to the lesson title) |
| Directions | `directions` |
| Which sentences | `sentences` — **1-based lesson positions**; omit for all |
| Which skills | `skills` — omit for all |
| How many questions | `count` — `5 \| 10 \| 20 \| "all"`, see `wjt.assignment.COUNTS` |
| Number the words | `numberWords` (boolean) |
| Word bank | `wordBank` (boolean) |
| Grouping | `grouping` — `wjt.assignment.GROUPINGS` |
| Line spacing | `spacing` — `wjt.assignment.SPACINGS` |

**If the builder wants a computation `wjt.assignment` doesn't expose, stop and
re-read the model.** Deriving question data view-side is how the student preview
and the printed worksheet drift apart, which is exactly the failure 009's
"numbering matches" check exists to catch.

Two model calls the builder must use rather than reimplement:

- **`wjt.assignment.availableSkills(lesson, sentenceNumbers)`** returns
  `{ id, name, kind, count, available, reason }` per skill. Disable an
  unavailable skill and **show its real `reason` string** ("No adjective labels
  on the selected sentences.") — the model already writes teacher-readable
  prose; don't invent a generic message.
- **`wjt.assignment.poolSize(lesson, sentenceNumbers, skills)`** — show it next
  to the count control, live. The Phase 1 As-built note is blunt about why: the
  Declaration lesson's pool is **745 questions**, so `"all"` is honest and
  therefore alarming, and the codec's 60-question cap makes such an assignment
  print-only. The teacher should see the number *before* choosing, not discover
  it in a size warning afterwards.

### Task E — regenerate and preview

- An explicit **Regenerate** button calling `wjt.assignment.newSeed()` and
  rebuilding. Selection is deterministic in `seed`, so without this a teacher who
  dislikes the drawn questions has no recourse. Do not auto-reseed on every
  control change — same inputs plus same seed must keep producing byte-identical
  questions (that invariant is smoke-tested).
- A live **student preview** rendered from the returned `assignment` half.
  `build()` returns `{ assignment, key, poolSize, skills, requested }`;
  **`key` is teacher-only and must not appear in the preview DOM.**
- Show `poolSize` vs `requested` when the pool can't satisfy the request, rather
  than silently returning fewer questions.

## Out of scope

- **Printing** — that's [009](009-assignment-phase-3-print.md). The preview is
  on-screen only.
- **URL and QR delivery** — proposal Phases 4–5, re-scoped by
  [013](013-seam-delivery-channels.md). Do not call `wjt.assignmentCodec` from
  this view yet.
- **Saving assignment presets into the lesson format.** The proposal lists this
  as out of scope for the first iteration, and the alpha format freeze in
  [CLAUDE.md](../CLAUDE.md) applies.
- Any change to `js/assignment-model.js` or `js/assignment-codec.js`.

## Done when

- A teacher opens any annotated lesson from the Library, reaches the builder,
  changes sentences/skills/count/supports, sees the pool size update, and
  regenerates to a different draw.
- Unavailable skills are disabled with the model's own reason text.
- `node tools/smoke-test.js` still reports **0 failed** and `samples/` is
  unchanged (this work order touches no logic file).
- `tools/dom-check.html` reports **0 failed** at 1280×720, 1366×768, 1920×1080,
  and 1024×768 — the run recipe is in [CLAUDE.md](../CLAUDE.md); use the
  PowerShell `Start-Process` form, and read the result with
  `node tools/dom-check-report.js`, never by grepping the raw dump.
- New DOM checks assert: the route opens the right lesson; the builder disables
  unavailable skills and reports the real pool; the preview contains **no**
  answer-key material.
- [docs/project/dom-structure.md](../docs/project/dom-structure.md) gains the
  assignment view's element tree **in the same commit**. Nothing regenerates or
  checks that file, so stale is its default state.

## Notes

- The proposal's `## Assignment builder` section (`### Required controls for
  1.0`) is the authority on which controls are required; this order is the
  implementation route to it, not a replacement for it.
- Record an **As built** entry in the proposal if the implementation diverges —
  that convention is the valuable part of the Phase 1 write-up.
- The student preview here and the print worksheet in 009 must share numbering.
  Consider whether the number-rendering belongs in a small shared helper now
  rather than being copied and then fixed twice.
