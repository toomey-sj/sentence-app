---
status: todo   # todo | doing | done | superseded
created: 2026-07-28
---

# Assignment mode Phase 3 — print worksheet and teacher answer key

Step 1 of the [platform roadmap's sequencing](../docs/roadmap-platform.md#sequencing),
and **Phase 3** of
[the assignment-mode proposal](proposals/assignment-mode-proposal.md#phase-3--print-worksheet-and-answer-key).
Depends on [008](008-assignment-phase-2-builder.md).

## Why

Print is the delivery channel that works **everywhere**: from a double-clicked
`index.html`, in a room with no wifi, on a cart of Chromebooks that lost their
localStorage overnight. The platform roadmap pins this as something that
[does not change](../docs/roadmap-platform.md#what-does-not-change):

> **Print and file delivery never require an account.** A teacher with no login
> and no network can still build a lesson and print a worksheet.

That makes it the right thing to land *before* anything that does need a
network. It is also the reason the roadmap's sequencing puts Assignment Phases
2–3 ahead of the storage seams rather than the other way round.

## Scope

Two print surfaces — student worksheet and teacher answer key — rendered from
the two halves `wjt.assignment.build()` already returns.

### Task A — render from the model, derive nothing

`build()` returns `{ assignment, key, poolSize, skills, requested }`:

- **`assignment`** is the student-safe half: `title`, `directions`,
  `sentences: [{ number, text }]`, `questions: [{ number, sentence, kind,
  prompt, mark?, expected? }]`, and `options` (`numberWords`, `wordBank`,
  `grouping`, `spacing`, `colorMode`).
- **`key`** is teacher-only and **never encoded**:
  `answers: [{ question, sentence, skill, accepted[], source, note? }]`, plus
  the whole `assignment` under `key.assignment` so the key can reuse identical
  numbering.

Handwriting space comes from **`wjt.assignment.linesFor(question, spacing)`** —
already implemented and covered by the smoke test. Do not re-derive line counts
in the view; the `list`-kind rule (lines scale with `question.expected`) is
non-obvious and will be got wrong on a second implementation.

### Task B — the student worksheet

A purpose-built print view, **not the app UI with navigation hidden** (the
proposal is explicit about this). Contents per proposal §Student worksheet
content: title, directions, blank Name/Class/Date fields, numbered sentences,
optional token numbers, numbered questions with handwriting space, optional word
bank, a small "Created with Sentence Forge" footer.

Must **not** print: app navigation, editing controls, the lesson id, teacher
notes, annotations that reveal answers, or any answer-key data.

Note that the assignment is **renumbered over the selection** — picking lesson
sentences 3 and 7 produces worksheet sentences 1 and 2. The model already does
this and the prompts already say so. The worksheet must not reintroduce the
lesson's own numbering anywhere; the student should never learn a lesson existed.

### Task C — the answer key

Same layout and numbering as the worksheet, plus every `accepted` answer and the
`source` label/type. Teacher `note` only when the print controls enable it.

Visually unmistakable: **Teacher Answer Key — Do Not Distribute**, repeated per
page where the browser supports print headers reliably, otherwise at least at
the top.

### Task D — print styles and behavior

- US Letter first; do not break A4.
- Black text and borders in grayscale mode; **never rely on background-color
  printing being enabled** — a school printer with backgrounds off must still
  produce a usable sheet.
- Avoid splitting a question from its answer space where practical.
- Wrap long sentences for worksheet output rather than reusing Present mode's
  projector layout assumptions.
- Restore the builder cleanly on `afterprint` without losing its temporary
  assignment state (including the seed — reprinting must give the same sheet).

### Task E — the invariant, asserted rather than assumed

Add to [tools/dom-check.html](../tools/dom-check.html), in the style of the
existing privacy assertions:

- the student print DOM contains **no** answer-bearing material;
- the answer key is present, marked, and carries the expected answers;
- worksheet and answer-key numbering match each other and the 008 preview.

"We were careful" is not a check. The whole
[no-student-data promise](../docs/roadmap-platform.md#what-does-not-change) rests
on these being *tested* invariants rather than prose, and a print path that
leaks the key is the most plausible way to break it by accident.

## Out of scope

- **Grayscale-vs-color palette rework** — that's
  [plans/006](006-palette-scale-followup.md). Use the palette as it stands.
- **Any network delivery.** URL and QR are proposal Phases 4–5, re-scoped by
  [013](013-seam-delivery-channels.md).
- Changes to `js/assignment-model.js` (`linesFor`, `build`, the key shape are all
  final for this phase).

## Done when

- Student worksheet and answer key both print correctly at US Letter and A4,
  and Save-as-PDF produces the same.
- A physical **grayscale** print is legible — this one has to be done on paper,
  not in a preview.
- DOM check reports **0 failed** and includes the Task E assertions. Run it with
  the PowerShell `Start-Process` recipe in [CLAUDE.md](../CLAUDE.md) and read the
  result via `node tools/dom-check-report.js`.
- `node tools/smoke-test.js` still **0 failed**, `samples/` unchanged.
- [docs/project/dom-structure.md](../docs/project/dom-structure.md) updated in the
  same commit.
- The print rows of the proposal's `## Manual acceptance matrix` are recorded —
  in this file, with what was actually tested on what. An untested row stays
  unticked; report honestly.

## Notes

- The proposal's `## Printable worksheet` section is the content authority.
- After this lands, a teacher can do the entire Edit → Present → Assign → Print
  loop with no network at all. That is worth saying out loud in
  [docs/product/teacher-guide.md](../docs/product/teacher-guide.md) — a small
  addition, and the first user-visible payoff of the whole assignment effort.
