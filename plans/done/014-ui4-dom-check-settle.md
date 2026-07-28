---
status: done   # todo | doing | done | superseded
created: 2026-07-28
updated: 2026-07-28
---

# UI-4 is a harness bug, not a renderer bug — settle the Present checks before measuring

> **As built (2026-07-28).** Done, and the diagnosis above held exactly: the only
> file changed to fix it is [tools/dom-check.html](../../tools/dom-check.html).
> `js/render.js` is untouched. The DOM check now reports **328 passed / 0 failed**
> at 1280×720, 1366×768, 1920×1080, and 1024×768, and UI-4 measures **0px worst
> overflow** across 6–11 wrapped lines (6 at 1920 wide, 11 at 1280) instead of one
> 5714px line.
>
> **What was built.** `presentationChecks()` is gone as a single synchronous
> function; the block is now seven step functions driven by a small `runSettled()`
> runner that puts a 100 ms timer between every step. A step asserts against the
> layout the *previous* step left behind, then makes its own change at the very
> end. The wrap-stress fixture and the assignment/print block are steps in the same
> chain, so `finish()` still runs exactly once. `SETTLE_MS` × 9 steps ≈ 900 ms of
> virtual time, comfortably inside CI's `--virtual-time-budget=5000`.
>
> **The audit of the other checks found no second victim, and that is a real
> result, not a shrug.** Both counts are 328 before and after, with `UI-4` the only
> line that flipped: `noDocScroll()` (all three calls), `inViewport(stage)`,
> the nav/controls/rail bounds, `inViewport(panel)` and the capped-stage scroll
> test all keep the same verdict against the settled layout. That is because they
> assert *containment* — and the pre-wrap single line is the one-line layout at its
> **widest and shortest**, so a check asking "does this stay inside the viewport?"
> is, if anything, harder to pass pre-wrap. UI-4 was the only assertion whose truth
> needed the wrap to have *happened*. They are converted anyway: the next
> containment check written here would not have been so lucky, and the fixture that
> changes the answer is one example lesson away.
>
> **Falsification, both ways** (the "a check that can't fail is not a check" bar):
>
> | Probe | UI-4 | wrap stress |
> |---|---|---|
> | Skip `refineOverflow()` (bar-label track growth unfixed) | **passes** (0px) | **FAILS** — 115px over |
> | Skip the whole reflow (single line stands) | **FAILS** — 1 line, **5714px** | **FAILS** — 902px over |
>
> The second row is the point: UI-4 goes red on exactly the historic number, so the
> guard still has teeth against the failure it was written for, and the old red was
> precisely the pre-wrap state. The first row is worth knowing too — against *this*
> fixture UI-4 does not catch a broken `refineOverflow()`; the purpose-built
> wrap-stress fixture (640px host, a `Prepositional Phrase` bar over every
> two-token pair) is what covers that, and it caught it in both probes. Two checks,
> two different teeth; keep both.
>
> **Not done here, deliberately:** nothing about the wrapping algorithm. There was
> nothing to fix — no real overflow appeared once the measurement moved.

**No dependencies.** It touches [tools/dom-check.html](../../tools/dom-check.html)
and nothing else; no other open work order modifies that file. But read
[Relationship to 005](#relationship-to-005) before starting — 005 is `doing`,
owns the audit item this check is named after, and records a green run that is no
longer true.

## Why

`tools/dom-check.html` has reported **1 failed** at every matrix size since
before work order 008, and the failure is always the same:

```text
FAIL  UI-4: no wrapped line runs off sideways (worst overflow 5714px)
```

That single failure makes `dom-check-report.js` exit 1, which turns the whole
`rendering layer (headless chrome)` job of
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) red. **CI has therefore
been red on every commit for weeks**, including docs-only ones, which means the
suite can no longer tell anyone about a *new* regression — 327 passing checks are
masked by one that is wrong. That is the real cost, and it is why this is worth
more than its "cosmetic layout bug" appearance.

[quick-todo item 5](../quick-todo.md) wrote this up as *possibly* a renderer bug in
`computeLines()`/`layoutFitted()`, with a harness artifact as the alternative. It
is the alternative. **The renderer is correct; the check measures the wrong
moment — and has done since it was written.**

### It did not "always fail", and that matters

[005](../005-presentation-ui-remediation.md) records the whole DOM check at **0
failed on 2026-07-22**, so something changed. Bisected: green at `60154eb`, red at
`34452b5`. But `34452b5` only touches CSS, and reverting its diff **does not fix
it** — checked out that tree with `css/styles.css` restored byte-identical to
`60154eb` and UI-4 still failed. `34452b5` is a coincidence of adjacency, not a
cause.

The two commits in between are what did it: **`5409707` and `8d55297`, which add
the Declaration of Independence example lessons.** UI-4's fixture is whichever
example has the most annotations, and the Declaration took that title:

| | densest example | its longest sentence |
|---|---|---:|
| before | `romeo-juliet-prologue` (138 anns) | **53 chars** |
| after | `declaration-of-independence` (511 anns) | **406 chars** |

A 53-character sentence laid out on one line fits inside the 718px stage, so the
pre-wrap measurement was *indistinguishable from a correct one* and the check
passed. A 406-character sentence on one line is about 5,700px wide — which is
exactly the `worst overflow 5714px` in the failure message.

So UI-4 was **passing by luck for its entire life**, and adding example data
removed the luck. Keep that in mind for the audit item below: this is direct
evidence that a geometry check in this block can be green without being right.

## What was actually measured (2026-07-28)

Four experiments, all on Edge 150.0.4078.99 headless at 1280×720, against the
densest example lesson — the same one the check picks.

**1. More time changes nothing.** `--virtual-time-budget` of 5000, 8000, 20000,
and 40000 ms all produce byte-identical output: `worst overflow 5714px`, 327
passed / 1 failed. So it is not a slow settle and not flake.

**2. It is already wrong before any layer is toggled.** UI-4 runs after
`[data-act="all"]`, so the obvious suspect was `setLayers()` — its comment at
[js/render.js:439-442](../../js/render.js#L439-L442) claims line breaks can't move
because toggling visibility doesn't change token widths, which is *false* for
`refineOverflow()`, since a span bar's label does grow its grid tracks.
Measuring both states kills that theory:

| Measurement | Grids | Worst overflow |
|---|---:|---:|
| Present as first rendered, layers hidden | 1 | 5533px |
| After clicking **All** (what UI-4 measures) | 1 | 5714px |

One grid in both. The sentence never wrapped *at all* — the toggle is innocent.

**3. The renderer wraps correctly when it gets the chance.**

| Measurement | Grids | Worst overflow |
|---|---:|---:|
| After forcing a reflow (width moved past the hysteresis) | 13 | **0px** |
| Fresh `renderSentence()` into a 718px host, all layers visible | 10 | **0px** |
| Present, measured 600 ms after `rerender()` instead of synchronously | 11 | — |

**4. The async plumbing works fine in headless.** Instrumenting the app before it
loads: `requestAnimationFrame` requested 3 / fired 2, ResizeObserver callbacks
fired 3, and the post-render microtask saw `root.isConnected === true` on both
renders. Nothing is being starved.

## The diagnosis

[`js/render.js:373-375`](../../js/render.js#L373-L375) lays every sentence out as
**one line on purpose** — "byte-for-byte the legacy layout, and the state we
measure from once the caller has inserted `root`". The wrap then happens in the
post-render microtask ([render.js:429-433](../../js/render.js#L429-L433)) or, failing
that, in the ResizeObserver's first callback.

Both of those are **later tasks**. `presentationChecks()` in
[tools/dom-check.html](../../tools/dom-check.html) renders the Present view and
measures it *in one synchronous run*, never yielding — so every layout assertion
in it sees the deliberate pre-wrap single-line state. UI-4 is the only check in
that block whose truth depends on wrapping having happened, so it is the only one
that fails.

The wrap-stress fixture passes because it is built in one task and asserted in a
*later* one (`buildWrapStress()` before the settle timer, `checkWrapStress()`
inside it) — which is exactly the shape UI-4 needs.

## Scope

Fix the harness. **Do not change `js/render.js`** — experiments 3 and 4 show the
renderer produces 0px overflow across 10–13 wrapped lines once its reflow has run.

In [tools/dom-check.html](../../tools/dom-check.html):

- Give the Present layout assertions a settle, in the style
  `buildWrapStress()`/`checkWrapStress()` already uses: render and drive the view,
  yield, then measure. A plain `setTimeout` is the right tool — headless virtual
  time fast-forwards it inside `--virtual-time-budget`, and experiment 1 shows
  the budget is not the constraint.
- Audit the *other* checks in `presentationChecks()` for the same latent problem.
  UI-1's `inViewport(stage)` and the `noDocScroll()` calls also read geometry in
  the same synchronous run; they pass today, but they may be passing against the
  single-line layout rather than the real one. **This is not hypothetical — UI-4
  itself passed for months that way**, and only a change to example *data*
  exposed it. Convert them deliberately and note which ones changed verdict, if
  any (a check that starts failing here is a real find, not a setback).
- Keep the assertion itself. UI-4 exists because a wide span label silently
  scrolled a line sideways under `.gl-grid`'s hidden scrollbar; that guard should
  survive, just against the settled layout.

Then update the **Known red** note and the pass count in
[CLAUDE.md](../../CLAUDE.md), and remove [quick-todo item 5](../quick-todo.md) — it now
points at this file, and once this lands there is nothing left for it to track.

**Leave the caveat blockquotes in
[plans/done/008](008-assignment-phase-2-builder.md) and
[plans/done/009](009-assignment-phase-3-print.md) alone.** They record what
was true when that work shipped, which is the point of an As-built note. Don't
rewrite history to look tidier than it was.

### Out of scope

- **Any change to the wrapping algorithm.** If a real overflow shows up once the
  check measures the settled layout, that is a *new* finding and gets its own work
  order — don't fold a renderer fix into this one and lose the distinction.
- The rest of the assignment/print work; unrelated.

## Done when

- `tools/dom-check.html` reports **0 failed** at 1280×720, 1366×768, 1920×1080,
  and 1024×768 — the PowerShell `Start-Process` recipe in
  [CLAUDE.md](../../CLAUDE.md), read with `node tools/dom-check-report.js`, never by
  grepping the raw dump.
- The `checks` workflow is **green on GitHub**, not just locally. That is the
  actual point of the work order; verify it on the Actions tab after pushing.
- UI-4 still fails if the guard is genuinely broken — prove it by reverting the
  `refineOverflow()` call (or forcing the single-line layout) and watching it go
  red. A check that can't fail is not a check.
- [quick-todo item 5](../quick-todo.md) removed, `CLAUDE.md`'s Known-red note
  updated, and the pass count in `CLAUDE.md` refreshed.

## Relationship to 005

[005 — presentation UI remediation](../005-presentation-ui-remediation.md) is
`doing`, and this is its territory in two ways. Neither blocks this work, but
neither should be discovered halfway through it.

- **`UI-4` is one of 005's audit items, not just a check name.** 005 Task B is
  *"Give Present a real viewport shell (UI-1, UI-4, UI-8)"*, and the check names in
  `presentationChecks()` were taken from
  [docs/ui-audit-0.1.0.md](../../docs/ui-audit-0.1.0.md). So "UI-4" means the audit
  finding in 005 and the assertion in the harness. This work order is about the
  **assertion**; the audit item it guards is remediated and is not being reopened.
- **005's recorded status is now wrong, and its code work is not the reason.**
  Its implementation-status blockquote says the automated gate is green at all four
  matrix sizes — true on 2026-07-22, false since `8d55297`. 005's Tasks A–F are
  implemented; its only remaining gate is the **manual** cross-browser matrix. So
  there is no in-flight code to collide with, but 005 needs a one-line note that
  its automated gate went red for a fixture reason and that 014 owns it.
  Do that in the same commit as this work, so the two files can't disagree.

Also add 014 to the sequencing table in
[docs/roadmap-platform.md](../../docs/roadmap-platform.md#sequencing) — it was filed
outside that queue and is currently invisible to anyone reading the roadmap as
the work list. It belongs ahead of step 2, because
[010](../done/010-seam-storage-adapter.md) refactors the file holding every teacher's
lesson and wants a clean DOM check as its gate.

## Notes

- Reproduce the four experiments with a scratch harness beside
  `tools/dom-check.html` — it needs the same real page chrome (`nav.topbar`,
  `main#app`, `#toasts`, `footer.appfoot`) or `app.js` won't boot, and a
  Windows-style `file:///C:/…` URL plus a throwaway `--user-data-dir`. Instrument
  `requestAnimationFrame`/`ResizeObserver` *before* the app's scripts load if you
  want experiment 4.
- The `worst overflow` number is stable to the pixel across runs and budgets,
  which is a useful signal: if it starts varying, something genuinely timing-
  dependent has been introduced and this diagnosis no longer holds.
- CI runs `--virtual-time-budget=5000` against Linux `google-chrome`, and its
  `rendering layer` job fails at the same step — so this is not a
  Windows/Edge-only artifact, which is consistent with a same-task measurement
  rather than an engine difference.
