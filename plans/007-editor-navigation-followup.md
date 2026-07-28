---
status: todo   # todo | doing | done
created: 2026-07-22
---

# Editor: compact sticky toolbar + sentence navigator (UI-10 follow-up)

## Why

The UI audit's UI-10 noted that long lessons in the Editor become a sequence of
very tall cards, so authoring means a lot of scrolling with no quick way to jump
between sentences or reach the lesson actions. The presentation-UI remediation
([plans/005-presentation-ui-remediation.md](005-presentation-ui-remediation.md))
deferred this — it is a P2 polish item, never a `0.1.0` slide blocker — but it is
worth a small dedicated pass because it reduces friction for exactly the dense
lessons the product is built around.

## Scope

In [`js/editor.js`](../js/editor.js) and [`css/styles.css`](../css/styles.css):

- A compact **sticky lesson toolbar** (title/save state + the header's actions)
  that stays reachable while scrolling a long lesson. As of 2026-07-28 those
  actions are **← Library · Present · Assignment · Export JSON** — Assignment
  (`#/assign/<id>`) was added by the builder work, and the Quiz link is commented
  out for now ([quick-todo](quick-todo.md) item 4), so pick the buttons up from
  `editor-head-top` rather than from this list.
- A **sentence navigator** — jump to a sentence without scrolling the full list.
- Optional: per-layer preview toggles so the author can collapse a card's
  breakdown while editing others.

No data-model change: this is layout/navigation only. Keep the existing keyboard
selection, save-flash live region, and layer/tier toggles working. Match the ES5
house style and update the DOM map for any new structure.

Two pieces of `editor-head` are load-bearing and must not be stranded outside a
sticky bar: the visually hidden `<h1>Lesson editor</h1>` that post-route focus
lands on (UI-5, from [004](done/004-finish-0.1.0-a11y-closeout.md) — moving or
dropping it puts a page-sized outline back), and the two `layer-toggles` rows
(layers, palette tier). The tier row is what keeps the label picker manageable
today, so it stays reachable; see [plans/006](006-palette-scale-followup.md).

Out of scope: taxonomy, label ids, lesson format, and the label palette
(that is [plans/006](006-palette-scale-followup.md)).

## Done when

- A long lesson keeps its primary actions and a sentence jump reachable without
  scrolling to the top; nothing regresses in the editor smoke/DOM checks.
- `node tools/smoke-test.js` and the browser DOM check report **0 failed**; the
  DOM map reflects any new sticky/navigator structure.

## Notes

- Split out of the 005 presentation-UI order (see its "Scope" and the audit's
  UI-10 "As remediated: Deferred" row).
- **Verified still current 2026-07-28**, after the platform seams
  ([roadmap-platform.md](../docs/roadmap-platform.md) S1–S5). They changed
  `store.js`, `tokenize.js`, and assignment delivery; the editor's card list and
  scrolling are untouched, so the problem this order describes is unchanged.
- Build the sticky bar and the navigator **once and patch them**, the way the
  assignment builder patches its control rows — re-rendering a row mid-edit drops
  keyboard focus to `<body>`. See
  [As built — Phase 2](proposals/assignment-mode-proposal.md#as-built--phase-2).
- A sentence navigator is the same shape as Present's sentence switcher (labelled
  buttons, `aria-current` on the current one, ≥40×40 hit area). Reuse that pattern
  from [005](005-presentation-ui-remediation.md)'s UI-9 rather than inventing a
  second convention.
