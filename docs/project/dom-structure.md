# DOM & HTML structure

A quick-reference map of the HTML the app produces at runtime, so a future
layout change can start from "here is what the tree looks like and who builds it"
instead of re-reading nine JS files. It documents *structure* — element nesting,
class names, and the data-attribute conventions. It is **not** a CSS reference;
for how these classes are styled, read [`css/styles.css`](../../css/styles.css)
directly (it's one file, ~900 lines, sectioned by the same names used here).

This describes generated DOM, so it can drift. If it disagrees with the code,
the code wins — and fix this file. The renderer section is the one most worth
keeping accurate, because everything visual depends on it.

- [The static shell](#the-static-shell-indexhtml)
- [Conventions](#conventions-read-this-first)
- [The sentence renderer](#the-sentence-renderer-the-grid) ← the important one
- [The popover](#the-popover)
- [Home view](#home-view)
- [Library view](#library-view)
- [Editor view](#editor-view)
- [Present view](#present-view)
- [Quiz view](#quiz-view)

---

## The static shell (`index.html`)

The only hand-written HTML in the project. Everything else is built in JS and
injected into `#app`. Full file: [`index.html`](../../index.html).

```
body
├─ a.skip-link[href="#app"]     ← "Skip to content"; off-screen until focused (CSS .skip-link)
├─ nav.topbar
│  ├─ a.brand[href="#/"]        ← svg.anvil + "Sentence Forge" wordmark
│  ├─ button#palette-toggle     ← 🎨, aria-pressed; toggles default/cbSafe grammar palette, wired in app.js
│  │                              carries margin-left:auto to pin the toggle cluster right
│  └─ button#theme-toggle       ← ☀️ / 🌙, wired in app.js
├─ main#app                     ← every view replaces this element's contents
├─ div#toasts[aria-live=polite] ← transient .toast children, added by wjt.toast()
├─ footer.appfoot               ← span[data-role=version] (set once at boot, "v" + wjt.VERSION)
│                                 + a.kofi (the only external link; inline base64 image)
└─ <script> ×9                  ← load order IS the dependency graph
```

A **confirm dialog** (`wjt.confirmDialog` in `app.js`) is the app's own
replacement for the browser `confirm()`. Like the popover and toasts it appends to
`document.body`, not inside a view:
`div.modal-backdrop > div.modal[role=dialog][aria-modal=true][aria-labelledby=<msg id>]`
containing `p.modal-msg` (its id names the dialog) + `div.btn-row.modal-actions`
(Cancel + confirm button, the confirm being `.btn-danger` for destructive
actions). It closes on confirm, cancel, backdrop click, or Escape, traps Tab
between the two buttons while open, and restores focus on close.

`#app` is the single mount point. `route()` in [`js/app.js`](../../js/app.js)
clears it and calls one view function per hash, then `focusView()` moves focus to
the new view's first `h1`/`h2` (given `tabindex="-1"`, focused with
`preventScroll`) — the editor supplies a visually hidden `h1.sr-only "Lesson
editor"` for this, so focus no longer falls back to the whole `#app` container.
This keeps keyboard/AT users on the content after a swap instead of dropping to
`<body>`. The programmatic `tabindex="-1"` focus target is styled without the
page-sized default outline (`[tabindex="-1"]:focus:not(:focus-visible)`), while
controls reached by keyboard keep their `:focus-visible` ring. `#toasts`, `#palette-toggle`,
`#theme-toggle`, and `.appfoot` live *outside* `#app`, so they persist across
navigations — the footer version string is written once at boot, not per route.
The palette toggle rewrites grammar colors in `wjt.LABELS`/`SENTENCE_TYPES` and
calls `wjt.rerender()` (= `route()`), so the current view repaints its inline
`--c` values in the chosen palette.

## Conventions (read this first)

The whole app leans on four attribute/class idioms. Learn them once and every
view reads the same way.

| Idiom | Meaning | Example |
|---|---|---|
| `data-role="x"` | A named slot a view queries after `innerHTML` assignment to fill or wire up. | `view.querySelector('[data-role="stage"]')` |
| `data-act="x"` | A button/link whose click handler the view attaches by name. | `[data-act="del"]`, `[data-act="next"]` |
| `data-layer="x"` | On a chip/bar/pill: which taxonomy layer (`pos`/`part`/`phrase`/`clause`) it belongs to. The renderer's `setLayers()` toggles these. | `pchip.dataset.layer = "pos"` |
| `data-ann="key"` | On a chip/bar: which annotation it represents (`id`, or `start:end:label`). | set via `annKey(ann)` |
| `--c` custom prop | **Label colour, threaded through inline `style`.** Nearly every coloured element sets `style="--c: …"` and the CSS reads `var(--c)`. This is how one renderer colours 87 labels with zero per-label CSS. | `el.style.setProperty("--c", label.color)` |
| `is-*` class | Transient state: `is-on`, `is-sel`, `is-hl`, `is-right`, `is-wrong`, `is-cont-left/right`, `is-fullscreen`. Toggled, never the base identity. | `pill.classList.toggle("is-on", …)` |
| `.gl-hidden` | `visibility:hidden` — reserves layout space but hides + disables. Used by Present-mode layer toggles. | see renderer |

Two structural rules that hold everywhere:

- **Each view function owns one `.view.view-<name>` root** inside `#app` and
  builds its subtree with a big `innerHTML` string, then `querySelector`s the
  `data-role` slots to attach behaviour. Editor and Quiz re-render sub-sections
  by re-assigning `innerHTML` on a slot.
- **`wjt.escapeHtml()` wraps every piece of user/lesson text** that goes into an
  `innerHTML` string. Label `desc`/`example` come from `labels.js` (trusted) and
  are sometimes injected raw — grep for `.desc` if that matters to a change.

---

## The sentence renderer (the grid)

`wjt.renderSentence(sentence, opts)` in [`js/render.js`](../../js/render.js) is
the heart of the app. Editor, Present, and Quiz all call it, which is why a label
looks identical in all three. **If you change one thing in this repo's layout,
it will probably be here.**

### The model: one grid per visual line, one column per token

A sentence is laid out as **a stack of `.gl-grid` elements — one per wrapped
visual line** — inside a `.gl-sentence` flex column. Each grid is a CSS grid with
**one column per token** on that line. Chips (above) and bars (below) are placed
into the *same columns* as the tokens they annotate (via `grid-column`), which is
what keeps every mark aligned under its words at any font size.

Row assignment within one line-grid, top to bottom:

| Rows | Content | When present |
|---|---|---|
| broad-class POS chips (`.gl-chip-parent`) | row 0 or 1 | only if some POS chip on the line has a parent (two-row POS) |
| specific POS chips (`.gl-chip`) | next row | if the `pos` layer is reserved |
| **the tokens** (`.gl-token`) | the "token row" | always |
| span bars (`.gl-bar`) | one grid row **per lane** | for `part`/`phrase`/`clause` layers |

Overlapping bars in a layer are **greedily packed into lanes** (each lane = one
grid row) so they stack instead of colliding. Lanes are recomputed per line;
lane numbers do not align across lines and needn't.

### The tree

```
div.gl-sentence  (.gl-size-lg in Present)
└─ div.gl-grid  (.is-interactive when drag-select is on)   ← one per visual line
   ├─ button.gl-chip.gl-chip-parent   [data-layer=pos][data-ann]   ← broad class, optional
   ├─ button.gl-chip                  [data-layer=pos][data-ann]   ← specific POS
   ├─ span.gl-token                   [data-i=<tokenIndex>]        ← one per token
   │     .has-pos .is-sel/.is-sel-first/.is-sel-last .is-hl/.is-hl-first/.is-hl-last
   │     when interactive: [role=button][tabindex=0|-1]  ← focusable, roving tabindex
   └─ button.gl-bar                   [data-layer=part|phrase|clause][data-ann]
         ├─ span.gl-bar-abbr          ← short label (e.g. "DO")
         ├─ span.gl-bar-name          ← full label ("Direct object")
         └─ span.gl-bar-note "✎"      ← only if the annotation has a note
```

Chips, bars, and tokens are all **direct children of the grid** — the nesting
above is visual (rows), not DOM depth. Placement is entirely via
`style.gridRow` / `style.gridColumn` set in JS.

A span that crosses a line break renders as **one squared segment per line**:
the segments get `.is-cont-left` / `.is-cont-right` (drop the cut corner and
border), and only the true-start segment carries the label text — continuations
are bare bars.

### What the `opts` flags do to the DOM

| Option | DOM effect |
|---|---|
| `layers: [...]` | Which layers are *visible*. Others in `reserve` render but get `.gl-hidden`. |
| `reserve: [...]` | Which layers are laid out at all (occupy rows/lanes). Present passes all of the lesson's layers so toggling never resizes the block. |
| `showAnnotations: false` | Plain tokens only — no chips, no bars. Used by every Quiz question stage. |
| `interactive: true` | Adds `.is-interactive` to each grid and attaches drag-selection (see below). |
| `highlight: {start,end}` | Adds `.is-hl` (+ `-first`/`-last`) to the spanned tokens, the pulsing highlight used in Quiz. |
| `size: "lg"` | Adds `.gl-size-lg` to `.gl-sentence` — the projector scale for Present. |

### Return value & re-layout

`renderSentence` returns `{ root, grid, tokens, tokenEls, selection, setLayers }`.

- **`setLayers(next)`** patches visibility in place — toggles `.gl-hidden` on
  `[data-layer]` elements and repaints POS underlines — **without a rebuild**.
  This is how Present toggles a layer with no flash and no vertical shift.
- A **`ResizeObserver`** on `root` recomputes line breaks when the container
  width changes. Relayout is deferred to `requestAnimationFrame` to avoid the
  "ResizeObserver loop" warning.
- **Line breaking is a two-stage fit.** `computeLines()` estimates breaks from
  token widths, then `layoutFitted()` lays that estimate out and **measures the
  result**, splitting any `.gl-grid` that still overflows its box. The second
  stage exists because a span bar carries its label's full *name*, which can be
  wider than the tokens it covers — the grid's `max-content` columns then grow to
  fit the bar, so a line the token-width estimate thought fit renders past the
  container and scrolls sideways in silence (`.gl-grid` hides its scrollbar).
  Each pass settles one line left-to-right and re-flows everything after it, so
  the tokens that didn't fit rejoin the following line instead of being orphaned
  onto one of their own. Net effect: a long sentence **spills onto another line**
  rather than running off the edge. A lone token can't wrap and is exempt — its
  bar label ellipsizes instead. `tools/dom-check.html` guards this with a "wrap
  stress" fixture (short tokens under wide `Prepositional Phrase` bars).

### Selection (`wjt.attachSelection`)

Attached when `interactive` is true. Pointer events (mouse + touch) on
`.gl-token` elements paint `.is-sel` / `.is-sel-first` / `.is-sel-last` across
the dragged range and call `onSelect({first,last})` on pointer-up. Ownership is
by `container.contains(tok)` — because a sentence's tokens now live across
several line-grids, not one. Returns `{ clear, set, get }`.

It is also **keyboard-operable**: each token is a focusable `[role=button]` with
a roving `tabindex` (only one token is in the Tab order at a time). Arrow moves
focus between words, **Shift+Arrow** extends a selection from the focused word,
**Enter/Space** commits (a single word if nothing was extended), and **Escape**
clears. Keyboard and pointer feed the *same* `onSelect`, so there is one commit
path — the editor palette and the Quiz "find" answer are both reachable without a
pointer.

### Type badges (`wjt.renderTypeBadges`)

Separate helper. Renders whole-sentence structure/purpose badges — **not** span
annotations, never inside a grid.

```
div.type-badges
└─ span.type-badge  (button if clickable)  [style="--c: …"]
   ├─ span.type-badge-cat    ← "Structure" / "Purpose"
   └─ span.type-badge-name   ← "Compound", "Interrogative", …
```

`wjt.renderSentenceNote(sentence, onClick?)` renders a sentence's free-text
note. With `onClick` (Present mode) it returns a `button.type-badge.type-badge-note`
("Note 📌", `--c: var(--accent)`) that opens the note in the explain card;
Present mode drops that chip into the same `.type-badges` row as the structure/
purpose badges. Without `onClick` it falls back to an inline
`div.sentence-note` (`span.sentence-note-tag "Note"` + text).

`wjt.renderLegend(sentence, layers)` builds the Present-mode Key legend: for each
shown layer (in `LAYER_ORDER`), a `div.legend-group` (a `div.legend-layer`
heading + a `div.legend-items` of `span.legend-item` — `span.swatch[style="--c: …"]`
+ `b` abbr + name) for the distinct labels annotated in that sentence. Returns
`null` when no shown layer has annotations, so the caller `hidden`s the container.

## The popover

One floating popover at a time, managed by `wjt.showPopover(rect, contentEl)` /
`wjt.closePopover()` in [`js/render.js`](../../js/render.js). It appends
`div.gl-popover` **to `document.body`** (not inside a view), positions it near the
anchor rect, and dismisses on outside-click or Escape. Callers supply the inner
content element; the editor uses it for the label palette and the annotation
details (below). The palette content is itself a focus-trapped modal dialog
(`role="dialog"`, see below); `wjt.showPopover` provides the positioning and the
outside-click/Escape dismiss, the caller adds the dialog semantics and the trap.

---

## Home view

The splash landing at `#/`, built by `wjt.views.home` in
[`js/app.js`](../../js/app.js). The three buttons sit *below* the animation.
"New lesson" creates a lesson and opens the editor; "Import JSON" opens the file
picker (then routes to `#/library`); "Library" routes to `#/library`.

```
div.view.view-home
├─ section.hero
│  ├─ h1                            ← "Sentence " + span.fx "Forge" + span.hero-alpha "Alpha"
│  │                                  span.fx carries the forge-heat gradient; .hero-alpha is the badge
│  ├─ p                             ← "A workshop for the study of sentence structure."
│  └─ input[type=file][data-role=file][hidden][multiple]
├─ section.blocks-demo[data-role=blocks-demo][aria-hidden]   ← self-playing layer demo
│  ├─ p.blocks-demo-cap
│  └─ div.blocks-demo-card.card[data-role=blocks-demo-host]  ← wjt.buildBlocksDemo() fills this
│     ├─ div.blocks-demo-stage → .gl-sentence (see Sentence grid)
│     └─ div.blocks-demo-steps  ← span.blocks-demo-pill ×4, .blocks-demo-arrow between
└─ div.btn-row.btn-row-center.hero-actions
   ├─ button[data-act=new]      "＋ New lesson"
   ├─ button[data-act=import]   "⬆ Import JSON"
   └─ button[data-act=library]  "📚 Library"
```

## Library view

Your lessons + the example library, at `#/library`, built by
`wjt.views.library` in [`js/app.js`](../../js/app.js). Reached from the Home
view's "Library" button and from the "← Library" back-links in every other view.

```
div.view.view-library
├─ section[data-role=my-lessons]
│  ├─ div.section-head              ← flex row: title + spacer + actions
│  │  ├─ h2.section-title "Your lessons"
│  │  ├─ span.spacer
│  │  ├─ button[data-act=new]        "＋ New lesson"   (.btn-primary)
│  │  ├─ button[data-act=import]     "⬆ Import"        ← triggers the hidden file input
│  │  ├─ button[data-act=export-all] "⬇ Export all"   ← wjt.exportAllLessons()
│  │  └─ input[type=file][data-role=file][hidden][multiple]  ← → wjt.importLessonFiles()
│  └─ div.lesson-grid[data-role=lessons]
│     └─ article.card.lesson-card    ×N   (or .empty-state card if none)
│        ├─ h3, p.lesson-desc
│        ├─ div.lesson-meta          ← "N sentences · M labels"
│        ├─ div.lesson-layers        ← span.mini-pill per layer
│        └─ div.btn-row.lesson-actions
│           ├─ a[href=#/present/ID]  a[href=#/edit/ID]   (a[href=#/quiz/ID] hidden for now)
│           ├─ span.spacer
│           └─ button[data-act=export|dup|del]  (.btn-sm; del is .btn-danger)
└─ section.examples-block[data-role=examples-block]
   ├─ h2.section-title, p.section-sub
   └─ div.lesson-grid[data-role=examples]
      └─ article.card.example-card   ×N   (button[data-act=load])
```

## Editor view

Built by `wjt.views.editor` in [`js/editor.js`](../../js/editor.js). The largest
view. `renderSentences()` rebuilds the `.sentence-list`; each card manages its
own sub-renders.

```
div.view.view-editor
├─ header.editor-head.card
│  ├─ h1.sr-only "Lesson editor"      ← programmatic focus target after a route swap
│  ├─ div.editor-head-top
│  │  ├─ a[href=#/library] "← Library"
│  │  ├─ span.saved-flash "Saved ✓"   ← flashes on save()
│  │  ├─ span.spacer
│  │  └─ a #/present · button[data-act=export]   (a #/quiz hidden for now)
│  ├─ input.title-input[data-role=title]
│  ├─ input.desc-input[data-role=desc]
│  ├─ div.layer-toggles[data-role=layers]        ← "Teaching levels:" + pill per layer
│  └─ div.layer-toggles[data-role=palette-tier]  ← "Palette:" + "Essential only" pill
├─ div.hint-strip
└─ div.sentence-list
   ├─ section.card.sentence-card    ×N
   │  ├─ div.sentence-card-head
   │  │  ├─ span.sentence-num, span.sentence-meta, span.spacer
   │  │  └─ button[data-act=edit|merge|del]      (merge omitted on last sentence)
   │  ├─ div.type-picker
   │  │  └─ div.type-picker-row   ×2 (structure, purpose)
   │  │     ├─ span.type-picker-label
   │  │     └─ button.pill.type-pill   ×options  (.is-on when set; style="--c")
   │  └─ div.sentence-card-body
   │     ├─ [ renderSentence root ]   ← interactive grid (drag to select)
   │     └─ div.sentence-tip          ← only when the sentence has 0 labels
   └─ section.card.add-text-card      ← always last: textarea + "＋ Add sentences"
```

The **text-editor mode** replaces a card body with a `textarea.text-edit` +
`.btn-row` (`[data-act=ok|cancel]`).

Two **popover contents** (shown via `wjt.showPopover`, so they live on
`document.body`, not in this tree):

```
div.palette[role=dialog][aria-modal=true][aria-label="Choose a label for “…”"]
│                                        ← label picker, opened on selection.
│                                          Modal: focus lands on the first label,
│                                          Tab is trapped, focus restored on close.
├─ div.palette-target "“selected text”"
└─ div.palette-group[role=group][aria-label=<layer name>]   ×visible-layer
   ├─ div.palette-group-name
   └─ div.palette-grid            (or .palette-grid.palette-grid-stacked for
      └─ button.palette-label       drill-down layers, wrapping .palette-subgroup
         (.palette-label-sub for indented subtypes; style="--c")   groups)

div.ann-details                          ← opened on clicking an existing label
├─ div.ann-details-head  (span.swatch + name + layer)
├─ div.ann-details-quote
├─ p.ann-details-desc
├─ textarea.text-edit                    ← teaching note
└─ div.btn-row  button[data-act=note|del]
```

## Present view

Built by `wjt.views.present` in [`js/display.js`](../../js/display.js).
Projector mode — `renderStage()` rebuilds the stage; layer toggles patch in
place via the renderer's `setLayers()` (no rebuild).

```
div.view.view-present   (.is-fullscreen when the Fullscreen API is active)
├─ header.present-head
│  ├─ a "← Library"
│  ├─ div.present-title  (h2 + optional p.muted-note)
│  └─ div.present-actions  (a #/edit · button[data-act=fullscreen])   (a #/quiz hidden for now)
├─ div.present-controls
│  ├─ div.layer-chips[data-role=chips]     ← pill.pill-lg[data-layer] per layer,
│  │                                          each with span.pill-count "x / y"
│  ├─ span.spacer
│  └─ button[data-act=all|none|key]  "Show all" / "Hide all" / "🔑 Key"
│                                     (key is aria-pressed, .is-on when the legend shows)
├─ div.present-main
│  ├─ section.card.stage[data-role=stage][tabindex=0][role=group]
│  │  │                          ← aria-label "Sentence breakdown"; it is the scroll
│  │  │                            container ≥641px, so it is focusable
│  │  ├─ [ div.slide-counter, div.slide-info — only ≤1024px; see "slide info" below ]
│  │  └─ [ renderSentence root, size:lg; reserve: all lesson layers in breakdown,
│  │       none in the clean phase (see below) ]
│  ├─ aside.present-panel.card[data-role=panel][aria-labelledby=present-panel-title]
│  │  │                          ← [hidden] only ≤1024px; ≥1025px it is pinned open
│  │  ├─ div.present-slide-meta[data-role=slide-meta]
│  │  │                          ← holds div.slide-counter while pinned; empty (and
│  │  │                            display:none) otherwise
│  │  ├─ div.present-panel-head
│  │  │  ├─ h3.present-panel-title[data-role=panel-title][tabindex=-1]  ← focused on open
│  │  │  └─ button[data-act=panel-close][aria-label="Close panel"] "✕"
│  │  │                          ← [hidden] while the drawer is pinned
│  │  └─ div.present-panel-body[data-role=panel-body]  ← Key legend, an explanation,
│  │                                                     or the idle div.slide-info
│  └─ nav.present-nav
│     ├─ button[data-act=prev] "↑"
│     ├─ div.dots[data-role=dots]  ← button.dot per sentence (.is-on = current;
│     │                               aria-label "Sentence i of N"; aria-current on current)
│     └─ button[data-act=next] "↓"
└─ div.sr-only[data-role=slide-live][aria-live=polite]  ← persistent (outside the
                                                     rebuilt stage) so paging to a
                                                     new sentence is announced;
                                                     renderStage() sets its text
```

**The slide info has two homes.** "Sentence i of N" (`div.slide-counter`) and the
badge/tip block below it —

```
div.slide-info
├─ [ div.type-badges, if any — structure/purpose badges + the 📌 note chip ]
└─ div.slide-tip     ← "Turn on a level…", hidden once a layer is on
```

— are **long-lived nodes** created once per view and refilled per sentence, not
rebuilt. `placeSlideInfo()` moves them on every render and every breakpoint change:

- **≥1025px (pinned):** the counter goes in `.present-slide-meta`, above the panel
  heading, so it survives an open Key/explanation. `.slide-info` becomes the
  drawer's idle body (`showSlideInfo()`), and is detached while Key or an
  explanation owns the body. The stage then holds nothing but the sentence.
- **≤1024px (unpinned):** both go back into the stage — counter first, sentence,
  then `.slide-info` — because the panel is `hidden` while idle down here and
  anything parked in it would simply disappear.

`renderStage()` may still clear the stage with `innerHTML = ""`: that detaches
these two nodes rather than destroying them, and `placeSlideInfo()` re-homes them.
The sentence root's parent must stay `.stage` itself (no wrapper div) — `render.js`
measures `root.parentNode.clientWidth` to decide line breaks.

**Clean vs breakdown.** With no layers shown (the clean phase) `renderStage()`
passes `reserve: visible` (nothing), so the sentence wraps naturally with no
hidden annotation lanes. The first reveal enters breakdown (`reserve:
lesson.layers`), reserving every layer's rows so later reveals/hides slot into a
stable diagram. Crossing that 0↔N boundary rebuilds the stage (`renderStage`);
toggles within breakdown are in-place patches (`applyVisible`/`setLayers`).

**One shared panel.** Key and every explanation render into the single
`.present-panel`, never a normal-flow block below the stage. Only one is active at
a time (`panelMode` = `"key" | "explain" | null`). `showExplain()` (annotation),
`showTypeExplain()` (sentence type) and `showNoteExplain()` (note chip) open it in
explain mode (reusing the `.ann-details-*` family); the `🔑 Key` button toggles it
in key mode (`wjt.renderLegend(currentSentence, visible)`). Opening focuses the
panel heading (`preventScroll`); dismissing it (Escape, the ✕ where shown, or a
sentence/route change) restores focus to the triggering control when it still
exists. Keyboard: ↑/← prev, ↓/→ next, Escape dismisses the panel, `f` fullscreen —
except that ↑/↓ fall through to native scrolling while `.stage` itself holds focus
and actually overflows, so a too-tall breakdown isn't mouse-only.

**Where the panel rests depends on the breakpoint**, tracked in JS by
`pinnedMq` / `isPinned()` (`matchMedia("(min-width: 1025px)")`) and settled by
`syncPinned()` on first render and on every `change`:

- **≥1025px — pinned drawer.** It sits beside the stage and is never hidden. Its
  idle state is the heading `Label details` over this sentence's `.slide-info` and
  a `.muted-note` hint ("Click a label to see more."), written by
  `showSlideInfo()`; `closePanel()` returns it there instead of hiding. The
  counter strip above the heading stays put in every state. The ✕ is `hidden`
  (nothing to close *to*), which needs
  `.btn[hidden]{display:none}` because `.btn`'s own `display` beats the UA rule.
  Because the drawer is always in flow the stage width never changes when a label
  is clicked, so the sentence doesn't re-wrap.
- **≤1024px — on-demand bottom sheet.** The panel starts `hidden`, overlays the
  lower part of the view when opened, and the ✕ is shown. Pinning it here would
  cover half the slide. `showSlideInfo()` is never used in this state — the slide
  info lives in the stage instead.

The presentation shell (`css/styles.css`, `@media (min-width:641px)`) route-scopes
via `:has(.view-present)`: it hides the global topbar and footer and makes
`.view-present` a grid of `auto auto minmax(0,1fr)` rows by a `minmax(0,1fr)`
column, at `height:100dvh; overflow:hidden`. `.stage` is the only scroller inside
it, and in the sentence rail only `.dots` scrolls — Prev/Next are pinned to its
ends. **Watch the source order in that stylesheet:** the base `.stage`, `.dots`
and `.present-nav` rules sit *after* the `@media (min-width:641px)` shell block,
and a media query adds no specificity, so a property declared in both is decided
by position, not by the breakpoint. Both the stage's `overflow` and the dot
strip's `flex-wrap` were silently reverted this way.

**The stage card owns the scroll; the page never moves.** The shell is sized so
the chrome around the slide stays put:

- `height:100dvh` + `overflow:hidden` + a `minmax(0,1fr)` stage row bound the row
  to what's left after the header and control rows. A breakdown shorter than that
  is centred like a slide (`justify-content: safe center`) with nothing to
  scroll; a taller one scrolls inside `.stage` (`overflow:auto`), so the header,
  layer chips, panel and sentence rail never scroll away mid-lesson.
- `.stage` carries **`scrollbar-gutter: stable`**, which is load-bearing: the
  renderer decides line breaks from this element's `clientWidth`
  (`computeLines()`), so a scrollbar appearing only *after* layout would make
  every line ~15px too wide. Reserving the gutter keeps the measured width honest.
- The **column is an explicit `minmax(0,1fr)`** and `.present-main` carries
  `min-width:0`: without them the stage's intrinsic min-content width (the whole
  unwrapped sentence) would widen the column and hand the renderer a bogus
  "available width", so nothing would ever wrap.
- The **`.present-nav` rail is `position:absolute`** within `.present-main` (which
  is `position:relative`). Its width is pinned (`--nav-w: 48px`) and the reserved
  `padding-right` is `calc(var(--nav-w) + 16px)`, so the panel→rail gutter equals
  the 16px flex `gap` between stage and panel. The rail is one dot per sentence,
  so it's intrinsically taller than the slide on a long lesson; being absolute
  keeps it out of the row's height math, and it scrolls within itself.
- Full screen (`.is-fullscreen`) is the same model — fixed `100dvh`,
  `overflow:hidden`, the stage scrolling inside it.

The `≤640px` phone breakpoint is the exception: it stacks the switcher below the
stage and keeps the **document**-scroll model (none of the shell's height lock,
stage overflow, or pinned rail width apply), because a phone viewport can't spare
the height to split between a stage and its chrome.

## Quiz view

Built by `wjt.views.quiz` in [`js/quiz.js`](../../js/quiz.js). Three screens
share `div.view.view-quiz` — each rebuilds it wholesale via `innerHTML`.

**Setup screen** (`renderSetup`):

```
div.view.view-quiz
├─ header.present-head        ← reuses Present's header classes
└─ section.card.quiz-setup
   ├─ h3 + div.layer-chips[data-role=layers]   ← pill.pill-lg per layer & type axis
   ├─ h3 + div.layer-chips[data-role=count]    ← 5 / 10 / 20 / All pills
   └─ div.btn-row  button[data-act=start] + span[data-role=poolinfo]
```

**Question screen** (`renderQuestion`):

```
div.view.view-quiz
├─ header.quiz-head
│  ├─ a "✕"
│  ├─ div.quiz-progress > div.quiz-progress-fill[style=width:%]
│  ├─ span.quiz-score "N ✓"
│  └─ span.quiz-streak "🔥 N"        ← only at streak ≥ 2
└─ section.card.quiz-card
   ├─ div.quiz-count#quiz-count "Question i of N"
   ├─ h3.quiz-prompt[data-role=prompt][tabindex=-1][aria-describedby=quiz-count]
   │                                        ← focused after each question render (the
   │                                          count is announced via aria-describedby);
   │                                          <mark> for "highlighted"; .prompt-label for "find"
   ├─ div.quiz-stage[data-role=stage]      ← renderSentence(showAnnotations:false)
   ├─ div.quiz-answers[data-role=answers][role=group][aria-label=<prompt text>]
   │  └─ button.quiz-option ×options       (mc / sentence-type)   .is-right/.is-wrong
   │     — OR —  button[data-act=check|clear]  (find: drag on the stage grid)
   │     After answering, each option's aria-label gains " — correct answer" /
   │     " — your choice, incorrect" so the outcome isn't color-only.
   └─ div.quiz-feedback[data-role=feedback][role=status][aria-live=polite][hidden]
      └─ text + optional p.ann-note + button[data-act=next]   .is-right/.is-wrong
```

Three question types share this frame: `mc` (highlighted span → multiple
choice), `sentence-type` (whole-sentence multiple choice), and `find` (drag the
matching words on an interactive stage, then Check).

**Results screen** (`renderResults`):

```
div.view.view-quiz
└─ section.card.quiz-results
   ├─ div.score-ring[style=--pct] > span "NN%"
   ├─ h2[tabindex=-1] (message)      ← focused after the results render
   │  + p.muted-note "N of M correct"
   ├─ div[data-role=missed]           ← h3 + div.missed-row per missed question
   │                                     (span.swatch + text)
   └─ div.btn-row.btn-row-center  button[data-act=retry|setup] + a #/
```

At ≥80% a transient `div.confetti` (spans of emoji) is appended and removed
after 4s.
