---
status: done   # todo | doing | done
created: 2026-07-22
---

# Tier A — Color-blind accessibility (cheap, do-now items)

Implements **Tier A** of
[docs/reference/color-blind-proposal.md](../docs/reference/color-blind-proposal.md).
Additive and format-safe throughout — **no taxonomy or lesson-format change**,
no `labels.js` color/id edits.

## Why

Sentence Forge already satisfies WCAG 1.4.1 (color is never the *only* carrier of
meaning — every chip/bar/quiz answer also shows text). The proposal simulated
every grammar hex under protanopia/deuteranopia/tritanopia and found the palette
is **enhancement, not remediation**: the fast pre-attentive "all the amber words
are nouns" glance degrades under red-green CVD, even though nothing becomes
unusable.

Tier A is the near-zero-cost slice that is safe during open alpha (accessibility
is explicitly in scope; recoloring is zero-migration because annotations store
label *ids*). **Tier B** (an opt-in CVD-tuned palette) remains the recommended
*primary* investment and is deliberately **out of scope here** — this order does
the three cheap items so they're not blocked on it.

### What's already settled (from exploration)

- **Item 1 passes today — no `labels.js` edit.** The only repeated abbreviations
  within a layer are all in POS: `prop`, `dem`, `poss`, `rel`. Every one pairs a
  warm-band label with a blue/purple-band label (e.g. `proper-noun` amber
  `#f5a623` vs `proper-adjective` blue `#4d9df4`; `relative-adverb` purple
  `#a06bf5` vs `relative-pronoun` orange `#f57f2c`), so none collapse under any
  CVD type. The deliverable is a **standing guard** (Task C), not a data edit.
- The proposal's `cvd.js` survives only in a prior session's scratchpad and
  **hardcodes** the palette. Task C re-homes it under `tools/` and wires it to
  read live colors from [js/labels.js](../js/labels.js).

## Scope

### Task A — Present-mode legend (toggle, all visible layers)

A "Key" toggle in Present mode that lists, for every layer currently switched on,
each distinct label present in the on-screen sentence as `swatch · abbr · name`.
Off by default. Removes the last color-only reliance (the abbr-only POS chip
row); bars already print names, but the key covers them too for consistency.

**New renderer helper — [js/render.js](../js/render.js)** (render.js already uses
`document`; it is *not* one of the four DOM-free files). Add near
`renderTypeBadges` (~[render.js:561](../js/render.js#L561)):

```js
/**
 * Legend for one sentence: per shown layer (in LAYER_ORDER), the distinct
 * labels actually annotated in that sentence, each as swatch · abbr · name.
 * Returns a DOM element, or null if nothing is shown/annotated.
 */
wjt.renderLegend = function (sentence, layers) { … };
```

- Iterate `wjt.LAYER_ORDER`, keep only layers in `layers` (the visible set).
- Per layer, collect the distinct `wjt.LABELS[a.label]` for annotations whose
  `wjt.layerOf(a.label).id` matches, de-duped by label id, first-appearance order.
- Emit one row group per layer: the layer `name` heading, then per label a
  `<span class="legend-item"><span class="swatch" style="--c:…"></span>
  <b>abbr</b> name</span>`. Reuse the existing **`.swatch`** class (already used
  in `display.js` explain cards) and `wjt.escapeHtml`.
- Return `null` when no shown layer has annotations, so callers can `hidden` it.

**Wire into Present — [js/display.js](../js/display.js):**

- Add a Key button to the `present-controls` row (currently
  [display.js:41-46](../js/display.js#L41-L46)), beside Show all / Hide all:
  `<button class="btn btn-sm" data-act="key" aria-pressed="false">🔑 Key</button>`.
- Add a legend container to `present-main` (after the stage `<section>`,
  [display.js:47-54](../js/display.js#L47-L54)):
  `<div class="present-legend" data-role="legend" hidden></div>`.
- Hold state in the view closure: `var legendOn = false;`.
- A local `renderLegend()` rebuilds the container from
  `wjt.renderLegend(currentSentence, visible)` and sets
  `hidden = !legendOn || !content`. Call it from **both** `renderStage()` (sentence
  changed) and `applyVisible()` (visible layers changed) so it syncs on the exact
  same triggers as the chips — [display.js:184-191](../js/display.js#L184-L191)
  and [display.js:193-228](../js/display.js#L193-L228).
- Key handler: flip `legendOn`, set `aria-pressed`, call the local `renderLegend()`.

**CSS — [css/styles.css](../css/styles.css):** add `.present-legend` (wrapped
flex row, muted panel, generous gap so it reads on a projector) and
`.legend-item` (inline-flex swatch + abbr + name). Reuse existing tokens
(`--muted`, `--card`, the `.swatch` sizing) — don't invent new ones.

**Out of scope for the legend:** listing labels *not present* in the sentence
(the full 54-item POS taxonomy); any persistent per-lesson preference (it's a
transient view toggle, like Show all).

### Task B — item 1 verified, no code change

The four within-layer repeated abbreviations each pair a warm-band with a
blue/purple-band label, so no pair is distinguished by a *collapsing* color.
Nothing to lengthen. The invariant becomes an automated assertion in **Task C**
so a future taxonomy edit can't silently introduce a colliding-abbr /
collapsing-color pair. Record this as an "As built" note in the proposal (§2,
Tier A item 1).

### Task C — Commit the CVD screen as a standing check

**New file — `tools/cvd-check.js`.** Port the math verbatim from the scratchpad
`cvd.js` (Machado 2009 severity-1.0 simulation + CIEDE2000; keep `simulate` /
`rgbToLab` / `deltaE2000` / `dE` and the `CONCERN=12`, `DISTINCT=18` thresholds
unchanged), but **replace the hardcoded palette** with live data:

- Load [js/labels.js](../js/labels.js) in a `vm` sandbox exactly as
  [tools/smoke-test.js:5-36](../tools/smoke-test.js#L5-L36) does; read `wjt.LABELS`
  (grouped by `wjt.layerOf(id).id`) and `wjt.SENTENCE_TYPES` for the type axes.
- **Report mode (default):** per layer and per sentence-type axis, print the pairs
  distinct in normal vision (>18) but collapsing under some CVD (<12) —
  reproducing the proposal's tables from live colors, so the doc stays honest as
  the palette changes.
- **`--check` mode (CI gate):** exit non-zero **only** on the item-1 invariant —
  two labels in the same layer sharing an abbreviation (case-insensitive) whose
  colors collapse (min CVD ΔE < `CONCERN`). Today that set is empty, so `--check`
  passes; it fails the moment such a pair appears. Print the offending pair(s).

**Wire into the check suite** alongside `gen-docs.js --check`: add the command to
[docs/roadmap-0.1.0.md §2](../docs/roadmap-0.1.0.md) and to
[CLAUDE.md "Checks"](../CLAUDE.md) so it's a documented gate, not folklore.

**Ship the document.** [docs/reference/color-blind-proposal.md](../docs/reference/color-blind-proposal.md)
is currently untracked — commit it (it belongs beside `7-20-findings.md` as a
design record). Update its **Method note** (~proposal lines 210-214) to point at
`tools/cvd-check.js` instead of "kept in the session scratchpad," and add the
Task B "As built" outcome to §2.

**Cleanup:** `docs/reference/color-blind-design-research` is a stale working copy
of [docs/project/style-guide.md](../docs/project/style-guide.md) (the proposal
cites the real file). Remove it rather than tracking a duplicate.

## Done when

- `node tools/cvd-check.js` prints the collapse report from live `labels.js`
  colors; `node tools/cvd-check.js --check` exits 0 (no same-abbr collapse today).
- `node tools/smoke-test.js` → **All checks passed** (commit any regenerated
  `samples/`); `node tools/gen-docs.js --check` and
  `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`
  both pass. *(Tasks A/C don't touch the taxonomy — confirm, don't assume.)*
- Browser DOM check via `tools/dom-check.html` (per the CLAUDE.md recipe — Windows
  drive path, temp `--user-data-dir`, Bash tool, `dom-check-report.js`, never grep
  the raw dump): **0 failed.** The Key button + legend add DOM, so the pass
  **count moves off 238** — expected here; confirm 0 failed and record the new
  baseline.
- [docs/project/dom-structure.md](../docs/project/dom-structure.md) updated for the
  Present view: the `🔑 Key` button in `present-controls` and the
  `.present-legend` (`data-role="legend"`) container in `present-main`.
- Manual smoke (open `index.html` from `file://`): in Present, toggle layers on,
  click **Key** → the legend lists exactly the shown layers' labels with correct
  swatches; page to another sentence and toggle layers → the legend tracks both;
  Key off hides it. Fullscreen still works.
- Report results honestly per [CLAUDE.md](../CLAUDE.md); a red check is not "done."

## Notes

- **Scope guard:** no taxonomy or lesson-format change; no `labels.js` color/id
  edits. Tier B (opt-in CVD palette) and Tier C (shape/texture channel) stay
  parked — this order is only the cheap A items.
- ES5 house style in the app files: `var`, `function`, one IIFE per file, match
  surrounding code. `cvd-check.js` is a Node build tool, so it may use the same
  modern JS as the other `tools/*.js`.
- When finished: set `status: done` and `git mv plans/002-tier-a-cvd.md
  plans/done/` in the same commit as the work (per [plans/README.md](README.md)).
