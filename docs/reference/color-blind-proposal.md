# Proposal — applying color-blind design to Sentence Forge

**Status:** Review / recommendation, not a committed plan · **Date:** 2026-07-22
**Findings reviewed:** the documented current palette in
[`../project/style-guide.md`](../project/style-guide.md).
**Method:** every hex in that guide simulated under protanopia, deuteranopia, and
tritanopia (Machado 2009 severity-1.0 matrices in linear RGB) and compared with
ΔE2000. Numbers below are from that run; the script and its caveats are in the
[method note](#method-note-and-caveats).

This is a review of what the palette findings imply for color-blind viewers and
which parts are worth acting on — in the spirit of [`../roadmap.md`](../roadmap.md)
§0: correct the premise first, then scope the work.

---

## 0. The premise correction: this is enhancement, not remediation

The most important finding is what is *not* wrong. Sentence Forge already follows
the single most important rule of accessible color — **color is never the only
carrier of meaning** — and the code backs that up, not just the style guide's
rule #5:

- **Rendered diagram** ([`render.js:200`](../../js/render.js#L200),
  [`:217`](../../js/render.js#L217), [`:261-267`](../../js/render.js#L261-L267)):
  every POS chip shows the label `abbr` (and full `name` on `title`); every
  part/phrase/clause bar prints both the `abbr` and the spelled-out `name`.
- **Quiz** ([`quiz.js:257-258`](../../js/quiz.js#L257-L258),
  [`:286-287`](../../js/quiz.js#L286-L287)): every answer button sets the color
  *and* `textContent = name`, and the correct answer is matched by **text**
  (`o.textContent === label.name`, [`:265`](../../js/quiz.js#L265)), never by
  color. Review swatches are paired with the bold name.
- **Subtype families already vary lightness, not just hue** — and the simulation
  confirms that choice is CVD-robust (see §2). The subject and predicate shade
  ladders survive all three dichromacies with zero collisions.

So the app already satisfies WCAG 2.2 **1.4.1 Use of Color**. Nothing here is a
compliance gap, and nothing is unusable for a color-blind teacher or student.
Two consequences worth stating up front:

- **Recoloring is a zero-migration data edit.** Annotations store label *ids*,
  never colors ([`store.js`](../../js/store.js) persists ids). Changing a
  `color:` in [`labels.js`](../../js/labels.js) repaints every existing lesson
  with no data loss — the same "reparenting is free, renaming ids is not"
  property the roadmap relies on. Recoloring is free.
- **Accessibility is explicitly in scope during the pilot** ([CLAUDE.md](../../CLAUDE.md),
  "The pilot"). This work does not touch the frozen taxonomy or lesson format.

The honest framing for everything below: color is the **fast, pre-attentive
grouping channel**. A sighted teacher scans a dense sentence and sees "all the
amber words are nouns" before reading a single chip. That glance is exactly what
color-vision deficiency degrades — the text is still there, but the at-a-glance
structure the app is *built to show* gets muddier. That is the thing worth
improving, and it is a usability improvement, not a bug fix.

---

## 1. The findings — where the current palette collapses under CVD

ΔE2000 reading guide: **> 18** = comfortably distinct; **< 12** = hard to tell
apart at a glance for small or adjacent samples (JND ≈ 2.3). A "concern" is a
pair that is distinct in normal vision but collapses under at least one CVD type.

### Parts of Speech — the 9 base hues (highest impact)

These nine co-occur constantly in a single POS-tagged sentence, so their mutual
distinctness is what the layer depends on. Under **deuteranopia/protanopia**
(red-green, ~6% of males) the warm hues collapse into one band and blue/purple
collapse together:

| Pair | Normal | Protan | Deutan | Tritan | Collapses under |
|---|--:|--:|--:|--:|---|
| Determiner `#8fc93a` vs Interjection `#e3c229` | 20.5 | **1.6** | **5.6** | 39.1 | red-green (near-identical) |
| Noun `#f5a623` vs Determiner `#8fc93a` | 33.9 | **4.4** | **3.9** | 44.6 | red-green |
| Pronoun `#f57f2c` vs Determiner `#8fc93a` | 48.1 | **13.7** | **4.0** | 50.9 | deuteranopia |
| Preposition `#1fbfa5` vs Conjunction `#ef5da8` | 57.1 | 28.5 | **3.9** | 68.0 | deuteranopia |
| Adjective `#4d9df4` vs Adverb `#a06bf5` | 25.0 | **9.4** | **4.4** | 31.6 | red-green (blue vs purple) |
| Verb `#f4574d` vs Determiner `#8fc93a` | 64.1 | 26.2 | **9.4** | 56.3 | deuteranopia (red vs green) |
| Verb `#f4574d` vs Pronoun `#f57f2c` | 18.4 | 14.1 | **7.4** | **7.5** | deutan + tritan (red vs orange) |
| Pronoun `#f57f2c` vs Interjection `#e3c229` | 28.9 | 14.9 | **8.2** | 17.5 | deuteranopia |
| Verb `#f4574d` vs Conjunction `#ef5da8` | 23.3 | 34.7 | 28.3 | **7.7** | tritanopia (red vs pink) |
| Pronoun `#f57f2c` vs Conjunction `#ef5da8` | 39.6 | 44.4 | 32.4 | **6.1** | tritanopia |
| Adjective `#4d9df4` vs Preposition `#1fbfa5` | 34.5 | 32.6 | 23.4 | **9.4** | tritanopia (blue vs teal) |

Read structurally: for a red-green viewer the POS palette effectively has
**~4–5 distinguishable buckets**, not 9 — a warm band (noun/verb/pronoun/
determiner/interjection largely merged), and blue/purple (adjective/adverb)
merged. This is the core finding. It is a hard limit of hue-only qualitative
palettes: a dichromat's usable color space is close to one-dimensional, so nine
saturated hues **cannot** be made mutually distinct by hue alone.

### Sentence Parts — bases

| Pair | Normal | Protan | Deutan | Tritan | Collapses under |
|---|--:|--:|--:|--:|---|
| Predicate `#fb7185` vs Object `#34d399` | 71.8 | 20.3 | **5.8** | 69.2 | deuteranopia (red vs green) |
| Subject `#38bdf8` vs Complement `#c084fc` | 35.3 | **10.6** | **3.4** | 44.7 | red-green (blue vs purple) |
| Subject `#38bdf8` vs Object `#34d399` | 36.8 | 38.8 | 35.0 | **6.9** | tritanopia |

### Sentence-type badges (quiz answer options)

| Pair | Normal | Protan | Deutan | Tritan | Collapses under |
|---|--:|--:|--:|--:|---|
| Compound `#3b82f6` vs Complex `#a855f7` | 22.9 | **5.2** | **1.0** | 39.6 | red-green (near-identical) |
| Declarative `#0ea5e9` vs Imperative `#14b8a6` | 27.4 | 26.5 | 19.2 | **6.3** | tritanopia |

### The positive result — subtype shade ladders are already CVD-safe

The subject family (`#38bdf8 / #0ea5e9 / #7dd3fc / #2563eb / #bae6fd`) and the
predicate family produced **zero** within-family collisions under any CVD type.
The reason is exactly the technique to generalize: those ladders vary **lightness
and saturation**, not just hue, so they stay ordered even when the hue axis
disappears. This is an in-repo, already-shipped proof of the right method.

---

## 2. What could be applied — tiered by cost and risk

### Tier A — near-zero cost, do now (accessibility is in-scope during the pilot)

1. **Guarantee text disambiguation wherever two colors can collapse.** The abbrs
   already repeat across families and lean on color to disambiguate (roadmap Q4:
   `prop`, `dem`, `poss`). That is fine for sighted users; for a CVD user it means
   two same-abbr chips in colliding colors are told apart only by position. The
   cheap fix is to confirm — as a checklist, not a redesign — that within any one
   *layer* palette no two labels share an abbreviation. Where they do and the
   colors collapse, lengthen one abbr. Pure data edit in `labels.js`.
2. **Add a persistent legend to Present mode** (if a teacher wants it). The bars
   already print full names, but the POS layer shows abbr-only chips; a small
   toggleable "abbr → name, with swatch" key removes the last color-only reliance
   for a projected diagram. Small `render.js` + CSS addition; no data change.
3. **Ship this document + the simulation script** so the palette has a standing
   CVD check, the way `gen-docs.js --check` guards the derived docs.

> **As built** (Tier A shipped via [`plans/002-tier-a-cvd.md`](../../plans/done/002-tier-a-cvd.md)):
>
> - **Item 1 — no data edit needed.** [`tools/cvd-check.js --check`](../../tools/cvd-check.js)
>   enumerated every within-layer pair sharing an abbreviation (case-insensitive)
>   and found none whose colors collapse under any CVD. The four repeats
>   (`prop`, `dem`, `poss`, `rel`) are all in POS and each pairs a warm-band label
>   with a blue/purple-band one (e.g. `proper-noun` amber vs `proper-adjective`
>   blue), so no abbr is disambiguated by a *collapsing* color. Nothing was
>   lengthened; the invariant is now the `--check` gate, so a future taxonomy edit
>   can't silently introduce a colliding-abbr / collapsing-color pair.
> - **Item 2 — legend shipped.** Present mode gained a `🔑 Key` toggle
>   ([`display.js`](../../js/display.js)) driving `wjt.renderLegend`
>   ([`render.js`](../../js/render.js)): off by default, it lists — per shown
>   layer, for the on-screen sentence — each distinct label as swatch · abbr · name.
> - **Item 3 — committed.** This document and the screening script are now tracked;
>   the script reads colors live from `labels.js` and is wired into the check suite
>   in [CLAUDE.md](../../CLAUDE.md) and [roadmap-0.1.0.md §2](../roadmap-0.1.0.md).

### Tier B — an opt-in CVD-tuned palette (recommended primary investment)

Rather than change the default hues mid-pilot (teachers are actively learning
them), add an **alternate grammar palette selectable by the viewer** — a header
toggle modeled on the existing ☀️/🌙 theme control
([`app.js:29-32`](../../js/app.js#L29-L32), [`:240-242`](../../js/app.js#L240-L242)).
Because annotations store ids, this is a presentation-layer switch with no lesson
impact.

- **It must be a manual toggle — there is no auto-detect.** Dark mode can follow
  the OS `prefers-color-scheme`; there is no equivalent browser signal for
  color-vision deficiency. An explicit control is the only option.
- **Same *control* as the theme toggle, different *mechanism*.** Light/dark is a
  pure-CSS swap: the two `:root[data-theme=…]` blocks exchange the **interface**
  custom properties. Grammar colors are not CSS tokens — they live in
  [`labels.js`](../../js/labels.js) as data and are injected inline by the
  renderers (`el.style.setProperty("--c", label.color)`). So the toggle flips
  *which* color field feeds `--c` (see mechanics), a small JS change plus a
  view re-render, not a `:root` swap.
- **Design principle** (proven by the subtype ladders in §1): a CVD-safe
  qualitative set spreads across **lightness** as well as hue, since the hue axis
  is what CVD flattens. Nine categories is at the edge of what is achievable even
  so; the realistic target is a set where every pair clears ΔE ≈ 15 under all
  three dichromacies, which forces some categories to differ mainly in lightness.
- **Mechanics:** add a second `cbColor` (or a whole alternate map) alongside
  `color` in [`labels.js`](../../js/labels.js), plumbed through the existing `--c`
  custom property — renderers already read one variable, so the switch is "which
  value feeds `--c`," not new rendering code.
- **Where the preference lives:** in `localStorage` beside the theme
  (`app.js` sets `localStorage["sentenceForge.theme"]`), **not** in the per-lesson
  model in [`store.js`](../../js/store.js). Unlike `essentialOnly` (lesson data,
  exported), the CVD palette is a property of the viewer's eyes, so it stays out
  of the lesson JSON — lessons remain byte-identical and portable between a
  color-blind teacher and a non-color-blind one.
- **Validation gate:** the [method-note](#method-note-and-caveats) script becomes
  the acceptance test — any candidate palette must pass the same ΔE2000 screen
  before it ships. I can generate and validate a candidate 9-hue set as the
  concrete next step if you want to move from review to plan.

> **As built** (Tier B shipped via [`plans/003-tier-b-cvd-palette.md`](../../plans/done/003-tier-b-cvd-palette.md)):
>
> - **Data model, not CSS.** Grammar colors live in [`labels.js`](../../js/labels.js)
>   and are injected inline as `--c`, so the switch is a data rewrite plus a
>   re-render, not a `:root` swap. `wjt.PALETTES` holds a `default` snapshot
>   (taken from the resolved inline `color:` fields — still the single source of
>   truth) and a hand-tuned `cbSafe` map of the ~35 color *anchors*;
>   `wjt.applyPalette(name)` writes anchor colors onto `wjt.LABELS` /
>   `SENTENCE_TYPES` and re-inherits non-anchor subtypes, exactly mirroring the
>   file's own inheritance pass. Round-trips exactly (verified: 0 mismatches
>   back to default). `labels.js` stays DOM-free.
> - **The toggle.** A 🎨 `#palette-toggle` header button beside ☀️/🌙
>   ([`index.html`](../../index.html)), wired in [`app.js`](../../js/app.js)
>   (`applyPalette` mirrors `applyTheme`; `wjt.rerender = route` repaints). The
>   choice persists in `localStorage["sentenceForge.palette"]` and is applied
>   *before* the first `route()` so the opening view paints in the chosen palette
>   with no flash of default. Toggling in Present accepts a reset to slide 1.
> - **The gate.** [`tools/cvd-check.js`](../../tools/cvd-check.js) grew a
>   `--palette=<name>` arg (it calls `wjt.applyPalette` in-sandbox and screens
>   live) and a stricter acceptance mode: `node tools/cvd-check.js
>   --palette=cbSafe --check` fails if **any** normally-distinct within-layer /
>   within-axis pair collapses under a CVD, not just same-abbr pairs. It exits 0.
> - **The `cbSafe` design.** Every category is fanned across **L\*** (the axis all
>   three dichromacies preserve) as well as hue; the subject/predicate families
>   are lightness ladders, determiner is a near-neutral grey, and POS/type colors
>   stay light enough for the fixed dark chip/badge text. The shipped set clears
>   ΔE2000 ≥ 13 for every normally-distinct pair under protan/deutan/tritan
>   (floor 12). Before/after: default collapses ~35 pairs across the six sets
>   (run `node tools/cvd-check.js`); `--palette=cbSafe` reports **zero**.

### Tier C — redundant *shape/texture* channel (highest-density views only)

For the projected diagram, where the most spans coexist, a second non-color
channel (e.g. underline style — solid/dashed/dotted/double — keyed to layer, or a
small glyph per layer) makes structure legible with no color at all. This is the
strongest accessibility win but the largest surface-area change to `render.js` and
the DOM map, so it is a deliberate "later, if the pilot surfaces the need" item,
not a pilot-time change.

### Out of scope / declined

- **Replacing the default palette outright during the pilot.** Data-safe, but it
  resets the color associations teachers are mid-way through learning, for a
  problem the redundancy layer already keeps from being blocking. Prefer the Tier B
  opt-in.
- **Recoloring the interface tokens** (`--accent`, `--ok`, `--danger`, …). These
  already pair with icons, text, and position (correct/incorrect answers show a
  check/✗ and a message, not color alone). Low CVD risk; not worth churn.
- **The forge-heat brand gradient and decorative washes.** Identity/atmosphere,
  no semantic load — explicitly out (style guide rule #6).

---

## 3. Recommended next step

If this review lands, the highest-value single move is **Tier B**: I generate a
candidate CVD-tuned 9-hue POS palette plus the handful of colliding
sentence-part / sentence-type values, validate it against the ΔE2000 gate for all
three dichromacies, and return it as a concrete plan (with the exact `labels.js`
diff and a before/after simulation). Tier A items 1 and 3 are cheap enough to
fold into that same change. Tier C stays parked unless the pilot asks for it.

---

## Method note and caveats

- **Simulation:** Machado et al. (2009) severity-1.0 matrices for protan/deutan/
  tritan, applied in linearized sRGB, re-encoded, then compared with CIEDE2000.
  Script: [`tools/cvd-check.js`](../../tools/cvd-check.js) — the math ported here
  verbatim, now reading colors **live** from [`labels.js`](../../js/labels.js)
  instead of a hardcoded palette, so this table stays honest as the palette
  changes. `node tools/cvd-check.js` prints the collapse report above from the
  current colors; `node tools/cvd-check.js --check` is the CI gate (Tier A item 1).
- **Caveats:** dichromacy (severity 1.0) is the worst case; most color-blind
  people are *anomalous trichromats* with milder shifts, so real-world confusion
  is somewhat less severe than the table's low numbers. ΔE2000 was designed for
  large solid samples under controlled lighting; thin colored underlines on a word
  are harder than a solid swatch, which cuts the other way. Treat the numbers as a
  **screen for "which pairs to worry about,"** not as perceptual guarantees. The
  structural conclusion — hue-only can't separate 9 categories for a dichromat, so
  vary lightness — is robust to all of these caveats.
