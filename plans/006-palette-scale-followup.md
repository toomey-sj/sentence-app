---
status: todo   # todo | doing | done
created: 2026-07-22
---

# Palette scale: make label picking fast at 87 labels (UI-6 follow-up)

## Why

The UI audit's UI-6 flagged that the open label palette is a tall vertical
catalogue: at 1366×768 only the Parts-of-Speech section is visible and the other
three layers require scrolling. The presentation-UI remediation
([plans/005-presentation-ui-remediation.md](005-presentation-ui-remediation.md))
deferred this because the palette is **already** grouped one level deep by layer
(`openPalette()` iterates `lesson.layers`, each an aria-group with a heading), so
the audit's core "layer-first" ask is largely met and it is not a `0.1.0` slide
blocker (see [plans/005](005-presentation-ui-remediation.md)). What remains is
authoring *speed*, which every downstream artifact (worksheets, slide export)
depends on.

## Scope

In [`js/editor.js`](../js/editor.js) `openPalette()` (currently lines 375–486: the
per-layer build loop at ~408–449, `labelButton()` at ~387, and the focus
trap/restore at ~451–486):

- Reveal one layer's groups at a time — layer tabs or an accordion — instead of
  one continuous catalogue, so the picked word stays in view.
- Add an explicit **Close** button to the modal and to the Tab focus-trap order.
- Add a visible result/label count per layer.
- Optional, if cheap: a search box and a "recent / repeat-last label" affordance.

**Preserve** the completed a11y contract: `role="dialog"`, `aria-modal`, group
labels, the Tab trap, Escape/outside dismissal, and focus restoration
(`prevFocus`). Keep the parent/subtype grouping *inside* a layer and the two
per-layer layouts (subtype drill-down vs flat grid).

Out of scope: Study Focus (limiting a lesson's relevant layers) and any taxonomy,
label-id, or lesson-format change.

## Done when

- Opening the palette shows one layer's labels at a time with a clear way to
  switch layers; no full-catalogue scroll to reach Clauses.
- The modal has a labelled Close in the trap order; dialog semantics, Escape,
  outside-dismiss, and focus restore keep working — **and are asserted, which they
  are not today** (see the Notes).
- `node tools/smoke-test.js` and the browser DOM check report **0 failed**; the
  DOM map ([docs/project/dom-structure.md](../docs/project/dom-structure.md))
  reflects the new palette structure.

## Notes

- Split out of the 005 presentation-UI order (see its "Scope" and the audit's
  UI-6 "As remediated: Deferred" row).
- **Verified still current 2026-07-28**, after the platform seams
  ([roadmap-platform.md](../docs/roadmap-platform.md) S1–S5). Nothing in them
  touches the editor: the palette is still one continuous run of per-layer groups,
  still has no Close button, and still shows no per-layer counts.
- **`tools/dom-check.html` does not currently exercise the real palette.** Its
  four "palette layer …" checks recompute expected group/button counts from
  `labels.js` helpers — they never call `openPalette()`, so `role="dialog"`,
  `aria-modal`, the Tab trap, and `prevFocus` restore have **no** coverage today.
  (`wjt.confirmDialog` does, at check 8 — copy that shape.) Adding those
  assertions is part of this order, not an existing safety net to lean on.
- One thing already reduces the 87-label problem and should survive: the
  Essential-only tier filter (`lesson.essentialOnly` → `wjt.filterTier`) narrows
  the picker without touching saved annotations. Layer-first navigation composes
  with it; don't replace it.
- Follow the assignment builder's control-row pattern rather than inventing one:
  build each row once and `sync…()` it in place (`is-on` / `aria-pressed` /
  `disabled` / count badge), never re-render it. Re-rendering a row destroys the
  button the teacher just clicked and drops focus to `<body>` — see
  [As built — Phase 2](proposals/assignment-mode-proposal.md#as-built--phase-2).
  Layer tabs and per-layer counts are exactly that shape.
