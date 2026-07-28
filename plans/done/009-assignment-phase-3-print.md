---
status: done   # todo | doing | done | superseded
created: 2026-07-28
completed: 2026-07-28
---

> **Done 2026-07-28.** Built as specified; the divergences are recorded as
> [As built — Phase 3](../proposals/assignment-mode-proposal.md#as-built--phase-3).
> Two caveats on the bars below, both stated honestly rather than ticked:
>
> - `tools/dom-check.html` reports **327 passed / 1 failed** at all four matrix
>   sizes. The one failure is `UI-4` (the Present breakdown not wrapping), which
>   is **pre-existing** and unrelated — it was already red at 309/1 before this
>   work started. All 18 new print checks pass.
> - The [manual acceptance matrix](#manual-acceptance-matrix--print-rows) below
>   has unticked rows. Everything verified on this machine was verified with
>   Edge headless; **no physical grayscale print and no second browser** were
>   available, so those rows stay open.

# Assignment mode Phase 3 — print worksheet and teacher answer key

Step 1 of the [platform roadmap's sequencing](../../docs/roadmap-platform.md#sequencing),
and **Phase 3** of
[the assignment-mode proposal](../proposals/assignment-mode-proposal.md#phase-3--print-worksheet-and-answer-key).
Depends on [008](008-assignment-phase-2-builder.md).

## Why

Print is the delivery channel that works **everywhere**: from a double-clicked
`index.html`, in a room with no wifi, on a cart of Chromebooks that lost their
localStorage overnight. The platform roadmap pins this as something that
[does not change](../../docs/roadmap-platform.md#what-does-not-change):

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

Add to [tools/dom-check.html](../../tools/dom-check.html), in the style of the
existing privacy assertions:

- the student print DOM contains **no** answer-bearing material;
- the answer key is present, marked, and carries the expected answers;
- worksheet and answer-key numbering match each other and the 008 preview.

"We were careful" is not a check. The whole
[no-student-data promise](../../docs/roadmap-platform.md#what-does-not-change) rests
on these being *tested* invariants rather than prose, and a print path that
leaks the key is the most plausible way to break it by accident.

## Out of scope

- **Grayscale-vs-color palette rework** — that's
  [plans/006](../006-palette-scale-followup.md). Use the palette as it stands.
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
  the PowerShell `Start-Process` recipe in [CLAUDE.md](../../CLAUDE.md) and read the
  result via `node tools/dom-check-report.js`.
- `node tools/smoke-test.js` still **0 failed**, `samples/` unchanged.
- [docs/project/dom-structure.md](../../docs/project/dom-structure.md) updated in the
  same commit.
- The print rows of the proposal's `## Manual acceptance matrix` are recorded —
  in this file, with what was actually tested on what. An untested row stays
  unticked; report honestly.

## Notes

- The proposal's `## Printable worksheet` section is the content authority.
- After this lands, a teacher can do the entire Edit → Present → Assign → Print
  loop with no network at all. That is worth saying out loud in
  [docs/product/teacher-guide.md](../../docs/product/teacher-guide.md) — a small
  addition, and the first user-visible payoff of the whole assignment effort.

## Manual acceptance matrix — print rows

What was actually done, on what. An unticked row was **not** tested; nothing
below is inferred from a row above it.

| Row | Status | What was done |
|---|---|---|
| US Letter print preview | ✅ | `--print-to-pdf` from Edge 150.0.4078.99 headless. MediaBox `612 × 792` pt = 8.5 × 11 in, margins 0.6 in, 2 pages for a 10-question Gatsby worksheet. |
| A4 print preview | ✅ | Same, with `@page { size: A4 }` forced in a harness to stand in for an A4 printer. MediaBox `595 × 842` pt; same content, same 2 pages, nothing clipped. The shipped CSS sets **no** `size`, which is what lets both come out right. |
| Save as PDF | ✅ | This *is* `--print-to-pdf` — the same Skia print path the dialog's "Save as PDF" uses. Six documents rendered (worksheet/key × Letter/A4/grayscale, plus long-sentence and per-sentence-grouping cases). |
| Question not split from its answer space | ✅ | Measured, not assumed. A stress fixture of 0.6-page-tall questions pages one-per-page with `break-inside: avoid` (6 pages) and 1.6-per-page without it (4 pages), so Blink is honouring the rule on this exact DOM. |
| Grayscale output legible | ⚠️ partial | Verified **on screen and in PDF** — accents resolve to `#000`, every mark is brackets + bold + underline, and no cue depends on a background colour (computed styles probed: text `rgb(0,0,0)`, all backgrounds `rgba(0,0,0,0)`). **Not verified on paper.** The plan says this row has to be done on a physical printer; no printer was available here, so it stays partial. |
| Edge / Chrome desktop | ✅ | Edge 150.0.4078.99 headless (Chromium), all DOM and print checks. |
| Firefox desktop | ❌ | Not installed on this machine. |
| Safari (iPad/iPhone/macOS) | ❌ | No Apple device available. `afterprint` is the weakest link there; the builder also clears the print host on view teardown, so a missed `afterprint` cannot strand it. |
| Android Chrome | ❌ | No device available. |
| `file://` builder and printing | ✅ | Every check above ran from `file:///C:/dev/sentences/…`. Nothing in the print path fetches, and the print host is built in JS. |
| Curly quotes, em dashes, accents, emoji in titles/directions | ⚠️ partial | An **em dash** in the directions and the curly-quoted lesson titles (`The Great Gatsby — Closing Lines`) print correctly. **Curly quotes, accents, and emoji were not exercised.** All print DOM is built with `textContent`, so there is no escaping path here to get wrong — but that is an argument, not a test. |
| GitHub Pages deployment | n/a | URL/QR delivery is Phases 4–5. Print needs no deployment. |
