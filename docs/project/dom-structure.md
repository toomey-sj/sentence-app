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
├─ nav.topbar
│  ├─ a.brand[href="#/"]        ← svg.anvil + "Sentence Forge" wordmark
│  ├─ a.kofi                    ← the only external link; inline base64 image
│  └─ button#theme-toggle       ← ☀️ / 🌙, wired in app.js
├─ main#app                     ← every view replaces this element's contents
├─ div#toasts[aria-live=polite] ← transient .toast children, added by wjt.toast()
└─ <script> ×9                  ← load order IS the dependency graph
```

`#app` is the single mount point. `route()` in [`js/app.js`](../../js/app.js)
clears it and calls one view function per hash. `#toasts` and `#theme-toggle`
live *outside* `#app`, so they persist across navigations.

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
  width changes (measures real token widths, re-runs `layout()`). Relayout is
  deferred to `requestAnimationFrame` to avoid the "ResizeObserver loop" warning.

### Drag-selection (`wjt.attachSelection`)

Attached when `interactive` is true. Pointer events (mouse + touch) on
`.gl-token` elements paint `.is-sel` / `.is-sel-first` / `.is-sel-last` across
the dragged range and call `onSelect({first,last})` on pointer-up. Ownership is
by `container.contains(tok)` — because a sentence's tokens now live across
several line-grids, not one. Returns `{ clear, set, get }`.

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

## The popover

One floating popover at a time, managed by `wjt.showPopover(rect, contentEl)` /
`wjt.closePopover()` in [`js/render.js`](../../js/render.js). It appends
`div.gl-popover` **to `document.body`** (not inside a view), positions it near the
anchor rect, and dismisses on outside-click or Escape. Callers supply the inner
content element; the editor uses it for the label palette and the annotation
details (below).

---

## Library view

Built by `wjt.views.library` in [`js/app.js`](../../js/app.js).

```
div.view.view-library
├─ section.hero
│  ├─ h1, p
│  ├─ div.btn-row.btn-row-center
│  │  ├─ button[data-act=new]      "＋ New lesson"
│  │  ├─ button[data-act=import]   "⬆ Import JSON"
│  │  └─ button[data-act=examples] "📚 Browse examples"
│  └─ input[type=file][data-role=file][hidden][multiple]
├─ section[data-role=my-lessons]
│  ├─ h2.section-title "Your lessons"
│  └─ div.lesson-grid[data-role=lessons]
│     └─ article.card.lesson-card    ×N   (or .empty-state card if none)
│        ├─ h3, p.lesson-desc
│        ├─ div.lesson-meta          ← "N sentences · M labels"
│        ├─ div.lesson-layers        ← span.mini-pill per layer
│        └─ div.btn-row.lesson-actions
│           ├─ a[href=#/present/ID]  a[href=#/quiz/ID]  a[href=#/edit/ID]
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
│  ├─ div.editor-head-top
│  │  ├─ a[href=#/] "← Library"
│  │  ├─ span.saved-flash "Saved ✓"   ← flashes on save()
│  │  ├─ span.spacer
│  │  └─ a #/present · a #/quiz · button[data-act=export]
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
div.palette                              ← label picker, opened on selection
├─ div.palette-target "“selected text”"
└─ div.palette-group   ×visible-layer
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
│  └─ div.present-actions  (a #/edit · a #/quiz · button[data-act=fullscreen])
├─ div.present-controls
│  ├─ div.layer-chips[data-role=chips]     ← pill.pill-lg[data-layer] per layer,
│  │                                          each with span.pill-count "x / y"
│  ├─ span.spacer
│  └─ button[data-act=all|none]  "Show all" / "Hide all"
├─ div.present-main
│  ├─ section.card.stage[data-role=stage]
│  │  ├─ div.stage-counter "Sentence i of N"
│  │  ├─ [ renderSentence root, size:lg, reserve: all lesson layers ]
│  │  ├─ [ div.type-badges, if any — structure/purpose badges + note chip ]
│  │  └─ div.stage-tip              ← "Turn on a level…", hidden once a layer is on
│  └─ nav.present-nav
│     ├─ button[data-act=prev] "↑"
│     ├─ div.dots[data-role=dots]  ← button.dot per sentence (.is-on = current)
│     └─ button[data-act=next] "↓"
└─ aside.explain.card[data-role=explain][hidden]   ← label explainer, filled on chip click
```

The `.explain` aside is filled by `showExplain()` (annotation),
`showTypeExplain()` (sentence type), or `showNoteExplain()` (the sentence note
chip); all reuse the `.ann-details-*` class family. Keyboard: ↑/← prev, ↓/→
next, `f` fullscreen.

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
   ├─ div.quiz-count "Question i of N"
   ├─ h3.quiz-prompt[data-role=prompt]     ← <mark> for "highlighted"; .prompt-label for "find"
   ├─ div.quiz-stage[data-role=stage]      ← renderSentence(showAnnotations:false)
   ├─ div.quiz-answers[data-role=answers]
   │  └─ button.quiz-option ×options       (mc / sentence-type)   .is-right/.is-wrong
   │     — OR —  button[data-act=check|clear]  (find: drag on the stage grid)
   └─ div.quiz-feedback[data-role=feedback][hidden]   .is-right/.is-wrong
      └─ text + optional p.ann-note + button[data-act=next]
```

Three question types share this frame: `mc` (highlighted span → multiple
choice), `sentence-type` (whole-sentence multiple choice), and `find` (drag the
matching words on an interactive stage, then Check).

**Results screen** (`renderResults`):

```
div.view.view-quiz
└─ section.card.quiz-results
   ├─ div.score-ring[style=--pct] > span "NN%"
   ├─ h2 (message) + p.muted-note "N of M correct"
   ├─ div[data-role=missed]           ← h3 + div.missed-row per missed question
   │                                     (span.swatch + text)
   └─ div.btn-row.btn-row-center  button[data-act=retry|setup] + a #/
```

At ≥80% a transient `div.confetti` (spans of emoji) is appended and removed
after 4s.
