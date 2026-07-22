---
status: done   # todo | doing | done
created: 2026-07-22
---

# Tier B — opt-in CVD-tuned grammar palette

Implements **Tier B** of
[docs/reference/color-blind-proposal.md](../docs/reference/color-blind-proposal.md).
Additive and zero-migration — **no taxonomy or lesson-format change**; annotations
store label *ids*, never colors, so a palette is a pure presentation switch.

## Why

Tier A (shipped, [plans/done/002-tier-a-cvd.md](done/002-tier-a-cvd.md)) proved the
app already satisfies WCAG 1.4.1 — color is never the *only* carrier of meaning —
and added a standing CVD screen ([tools/cvd-check.js](../tools/cvd-check.js)) plus a
Present-mode legend. What it deliberately left parked is the **enhancement**: under
red-green CVD the 9 POS hues collapse to ~4–5 distinguishable buckets, so the fast
pre-attentive "all the amber words are nouns" glance the app is built to give
degrades. The proposal's recommended primary investment is an **alternate,
viewer-selectable palette** designed so every category stays distinct under all
three dichromacies — separating categories by **lightness** as well as hue, the
technique the subject/predicate subtype ladders already prove is CVD-safe.

The preference is a property of the viewer's eyes, so it lives in `localStorage`
(like `theme`), **not** in the lesson JSON — lessons stay byte-identical between a
color-blind teacher and a sighted one. Accessibility is in scope during open alpha.

**Decisions (from planning):**
- **Full CVD-safe redesign** — retune every color anchor, not just colliding pairs.
- **Present mode accepts the re-render reset** — a CVD teacher sets the palette once
  at the start; a rare reset to slide 1 is acceptable and documented.

## How the pieces work today (verified from exploration)

- Grammar colors are **not** CSS variables. Each label declares a hex `color:` in
  [labels.js](../js/labels.js); renderers read it live and write it inline as `--c`
  (`el.style.setProperty("--c", label.color)`). So a color change has **no effect
  until the element re-renders** — unlike the CSS-only `data-theme` toggle.
- Only **base** labels + a few subtype **overrides** declare a color; other subtypes
  inherit via the pass at [labels.js:503-514](../js/labels.js#L503-L514)
  (`if (!l.color) l.color = p.color`). The **color anchors** = the ~35 entries that
  declare `color:` today (9 POS bases; subject/predicate ladders + object /
  complement / appositive bases in `part`; 9 phrase; 5 clause) plus the **8
  sentence-type option** colors in `wjt.SENTENCE_TYPES`.
- The central re-render is `route()` at [app.js:223-236](../js/app.js#L223-L236): it
  drains view cleanups, rebuilds `#app` from the current hash, and every view clears
  `container.innerHTML` and re-reads colors — so **re-running `route()` repaints
  every inline `--c`.** It is private to the IIFE and must be exposed. Re-assigning
  the same `location.hash` does **not** fire `hashchange`.
- Theme toggle is the UX model to mirror: header button
  ([index.html:14](../index.html#L14)), `applyTheme()`
  ([app.js:28-34](../js/app.js#L28-L34)) writing `localStorage["sentenceForge.theme"]`,
  boot-applied in `DOMContentLoaded` ([app.js:239-243](../js/app.js#L239-L243)).
- [tools/cvd-check.js](../tools/cvd-check.js) loads `labels.js` in a `vm` sandbox and
  reads colors live; it already has `concernsIn()` (all normally-distinct pairs that
  collapse under a CVD) and a `--check` gate for same-abbr collisions.

## Scope

### Task A — palette data model + switch, in [labels.js](../js/labels.js) (DOM-free)

Keep the default palette where it is (inline `color:` — single source of truth).
Add, **after** the inheritance pass ([labels.js:503-514](../js/labels.js#L503-L514)):

```js
// Snapshot the resolved default so switching back is exact and un-duplicated.
wjt.PALETTES = {
  default: { labels: {}, types: {} },
  cbSafe:  { labels: { /* ~35 anchor id -> hex, hand-tuned (Task D) */ },
             types:  { structure: {/*4*/}, purpose: {/*4*/} } },
};
Object.keys(wjt.LABELS).forEach(function (id) {
  wjt.PALETTES.default.labels[id] = wjt.LABELS[id].color;   // every id, fully resolved
});
wjt.SENTENCE_TYPE_ORDER.forEach(function (axis) {
  var o = wjt.SENTENCE_TYPES[axis].options, m = (wjt.PALETTES.default.types[axis] = {});
  Object.keys(o).forEach(function (oid) { m[oid] = o[oid].color; });
});

wjt.PALETTE_ORDER = ["default", "cbSafe"];

wjt.applyPalette = function (name) {
  var p = wjt.PALETTES[name] || wjt.PALETTES.default;
  Object.keys(p.labels).forEach(function (id) {
    if (wjt.LABELS[id]) wjt.LABELS[id].color = p.labels[id];
  });
  // cbSafe lists only anchors -> non-listed subtypes re-inherit from updated parents.
  Object.keys(wjt.LABELS).forEach(function (id) {
    var l = wjt.LABELS[id];
    if (l.parent && !(id in p.labels)) l.color = wjt.LABELS[l.parent].color;
  });
  Object.keys(p.types).forEach(function (axis) {
    var o = wjt.SENTENCE_TYPES[axis] && wjt.SENTENCE_TYPES[axis].options;
    if (o) Object.keys(p.types[axis]).forEach(function (oid) {
      if (o[oid]) o[oid].color = p.types[axis][oid];
    });
  });
  wjt.activePalette = name;
};
```

`cbSafe.labels` lists the **anchor ids only** (the entries that declare `color:`
today); subtypes without their own entry re-inherit — the same rule the file uses.
This keeps ladders (subject/predicate) as retuned ladders and lets the
object/complement families keep one hue per family.

### Task B — header toggle + boot wiring: [app.js](../js/app.js), [index.html](../index.html), [styles.css](../css/styles.css)

- **[index.html:14](../index.html#L14)** — add a sibling button before `#theme-toggle`
  (flex toolbar, `gap:12px`, no layout change):
  `<button id="palette-toggle" title="Toggle color-blind-friendly grammar colors" aria-pressed="false">🎨</button>`.
- **[styles.css](../css/styles.css)** — add `#palette-toggle` to the existing
  `#theme-toggle` button rule (~[styles.css:119-130](../css/styles.css#L119-L130));
  no new tokens.
- **[app.js](../js/app.js)** — mirror `applyTheme`:
  ```js
  function applyPalette(name) {
    if (name !== "cbSafe") name = "default";
    wjt.applyPalette(name);
    localStorage.setItem("sentenceForge.palette", name);
    var btn = document.getElementById("palette-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", name === "cbSafe" ? "true" : "false");
      btn.title = name === "cbSafe"
        ? "Grammar colors: color-blind-friendly (click for default)"
        : "Grammar colors: default (click for color-blind-friendly)";
    }
  }
  ```
- Expose the re-render: add `wjt.rerender = route;` inside the IIFE after `route` is
  defined. Keep `route` otherwise private.
- **Boot** ([app.js:239-243](../js/app.js#L239-L243)), **before** the first `route()`
  ([app.js:255](../js/app.js#L255)) so the first paint honors the stored choice:
  ```js
  applyPalette(localStorage.getItem("sentenceForge.palette") || "default");
  document.getElementById("palette-toggle").addEventListener("click", function () {
    applyPalette(wjt.activePalette === "cbSafe" ? "default" : "cbSafe");
    wjt.rerender();               // full repaint; Present resets to slide 1 (accepted)
  });
  ```

### Task C — extend [tools/cvd-check.js](../tools/cvd-check.js) to validate the alternate palette

`labels.js` is in the sandbox, so `wjt.applyPalette` is available there.

- Parse an optional `--palette=<name>` arg (alongside the existing `--check` dispatch
  at [cvd-check.js:183-187](../tools/cvd-check.js#L183-L187)); after the sandbox load
  ([:30](../tools/cvd-check.js#L30)) call `wjt.applyPalette(name)` so `report()` /
  `check()` run against that palette — zero hardcoding, same live-read property.
- Add the **CB acceptance gate**: `node tools/cvd-check.js --palette=cbSafe --check`
  fails if **any** within-set pair collapses — i.e. `concernsIn(arr)` is non-empty for
  any `layerSets()`/`typeSets()` entry, not just same-abbr pairs. (Default `--check`
  keeps its current same-abbr semantics for the shipped palette.) Print the offending
  pairs and their worst-CVD ΔE.
- This gate **is** the acceptance test for Task D.

### Task D — generate + validate the `cbSafe` palette (the design work)

Fill `wjt.PALETTES.cbSafe` iteratively against the Task-C gate:
- **Hard floor:** every normally-distinct within-layer/axis pair has min-CVD ΔE2000
  ≥ `CONCERN` (12) — no collapse. **Goal:** ≥ 15 where achievable.
- Nine POS categories can't be separated by hue alone for a dichromat — **spread L\***
  (light noun vs dark verb clears ΔE even when hue merges), as the subject/predicate
  ladders do today.
- Preserve family ladders as ladders; keep chips/underlines legible against **both**
  light and dark UI themes.
- Deliverable: the exact `cbSafe` map + a before/after `node tools/cvd-check.js`
  report (default vs `--palette=cbSafe`) showing the collisions cleared.

### Task E — docs

- **[docs/project/dom-structure.md](../docs/project/dom-structure.md)** — record the
  `🎨 #palette-toggle` button in the static `.topbar`.
- **[docs/reference/color-blind-proposal.md](../docs/reference/color-blind-proposal.md)**
  — add a Tier B **"As built"** note under §2 (data model, the `--palette` gate, the
  shipped `cbSafe` values or a pointer).
- **[CLAUDE.md](../CLAUDE.md) "Checks"** and
  **[docs/roadmap-0.1.0.md §2](../docs/roadmap-0.1.0.md)** — add
  `node tools/cvd-check.js --palette=cbSafe --check` as a documented gate.
- No change to `docs/coverage-brief.md` / `docs/custom-gpt-instructions.md` (taxonomy
  unchanged; colors aren't in the label list there — confirm, don't assume).

### Out of scope
- Changing the **default** palette (teachers are learning it) — this is opt-in.
- Per-CVD-type palettes (one `cbSafe` clears all three, per the proposal).
- Moving grammar colors into CSS variables / a `[data-palette]` CSS swap — the
  inline-`--c` + re-render path is smaller and already proven.
- Tier C (shape/texture redundancy channel) — stays parked.
- Preserving Present-mode slide/layer state across the toggle (accept reset).
- Persisting the palette in lesson JSON (viewer property, stays in `localStorage`
  like `theme`; contrast `essentialOnly`, which *is* lesson data).

## Done when

- `node tools/cvd-check.js --palette=cbSafe --check` exits 0 (no within-set collapse).
  Default `node tools/cvd-check.js` still reports; default `--check` still passes.
- `node tools/smoke-test.js` → **All checks passed** (commit any regenerated
  `samples/`); `node tools/gen-docs.js --check` and
  `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md` pass.
  *(Tier B doesn't touch the taxonomy — confirm.)*
- Browser DOM check via `tools/dom-check.html` (CLAUDE.md recipe — Windows drive path,
  temp `--user-data-dir`, Bash tool, `dom-check-report.js`, never grep the raw dump):
  **0 failed.** One static header button shouldn't move the pass count; if it does,
  record the new baseline.
- Manual smoke (`file://`, both light and dark theme):
  1. Editor/Present/Quiz render default colors; click **🎨** → all grammar chips,
     bars, swatches, quiz options, and sentence-type badges repaint to `cbSafe` live.
  2. Reload → choice persists and the **first** paint is already in the chosen palette
     (no flash of default).
  3. In Present, toggling resets to slide 1 with layers hidden — expected; confirm no
     crash and re-revealing works.
  4. Toggle back → exact default hexes restored (snapshot round-trips).
  5. `aria-pressed` / `title` reflect state.
- [docs/project/dom-structure.md](../docs/project/dom-structure.md) + proposal
  "As built" + CLAUDE.md / roadmap-0.1.0 check list updated.
- Results reported honestly per [CLAUDE.md](../CLAUDE.md) — a red check is not "done."

## Notes / risks

- **ES5 house style** in app/labels files: `var`, `function`, one IIFE per file.
  `cvd-check.js` is a Node tool and may use modern JS like the other `tools/*.js`.
- **[labels.js](../js/labels.js) stays DOM-free** — `applyPalette` touches only
  `wjt.*` data ([smoke-test.js](../tools/smoke-test.js) runs it in a bare `vm`; a
  `document` reference would break it).
- **9-hue feasibility:** the hard part is Task D. If a POS pair genuinely can't clear
  ΔE 12 under one CVD without an ugly color, note it rather than silently shipping a
  collapse — but L\*-spread should reach the floor for all pairs; the gate enforces it.
- **First-paint order:** boot `applyPalette` must precede the first `route()`, else the
  initial view flashes default.
- When finished: set `status: done` and `git mv plans/003-tier-b-cvd-palette.md
  plans/done/` in the same commit as the work (per [plans/README.md](README.md)).

## As built

Shipped close to plan; no scope changes. Notes on where reality was more specific
than the plan:

- **Palette block placement.** The plan's snippet said "after the inheritance
  pass," but the `default` snapshot reads `wjt.SENTENCE_TYPES`, which is defined
  lower in the file — so `wjt.PALETTES` / `wjt.applyPalette` went at the **end of
  the IIFE** (after the sentence-type definitions), still DOM-free.
- **Task D was an optimization, not hand-tuning.** Nine POS + a 12-color part
  layer against three dichromacies is over-constrained for eyeballing, so the
  `cbSafe` map was found by simulated annealing over a shared-slot model
  (scratch script), with the objective *mirroring* `concernsIn` (only
  normal-distinct pairs must clear the CVD floor) and hard side-constraints the
  plan implied but didn't enumerate:
  - **Ladders locked to their family hue, varying only L\*/chroma** — otherwise
    the optimizer scattered a "ladder" across unrelated hues. This is the
    "vary lightness, not hue" technique made mechanical.
  - **Per-layer render-aware lightness bounds.** POS chips + type badges are
    filled pills with *fixed dark text* (`.gl-chip`), so those colors are capped
    to L\* ≥ 56 (≈ the default palette's darkest chip) to avoid a contrast
    regression; part/phrase/clause **bars** use `--c` as border/abbr-text and
    tolerate darker colors, so bar-only slots (the ladders, object/complement/
    appositive) get L\*-spread headroom. This tension isn't in the plan but is
    load-bearing for "legible against both themes."
  - **The four blues are split** (adjective / subject-family / independent-clause
    / declarative never co-occur in one layer, as in the default palette) so the
    subject ladder spans L\* from its own mid base instead of being pinned light.
  Result: every normally-distinct within-set pair clears **ΔE2000 ≥ 13** under
  all three dichromacies (floor 12). Before/after: default collapses ~35 pairs,
  `cbSafe` collapses **zero**.
- **Verification.** Logic gate (`--palette=cbSafe --check`) exits 0; default
  `--check`, `smoke-test`, `gen-docs --check`, `validate-lesson` all pass; browser
  DOM check **245 passed, 0 failed**. `applyPalette` round-trips to the exact
  default hexes (0 mismatches) and a headless render confirmed the real
  `render.js` path emits cbSafe `--c` values under `cbSafe`. A live in-browser
  click-through of the toggle is the one step left to the operator; every
  mechanism it relies on is verified above.
- **Unrelated working-tree change.** `docs/custom-gpt-instructions.md` showed up
  modified during this work and is **not** part of Tier B — left untouched.
