# Quick To-Do

When implementing the items in this file,  give them a completed date stamp.

1) move the version number to the far right and center it vertically. — done 2026-07-23
2) move the ko-fi button to the far left and center it vertically. — done 2026-07-23
3) hide the light/dark mode toggle for now and just keep it in dark mode. — done 2026-07-23
4) hide the "quiz" interface for now. — done 2026-07-23
5) **`tools/dom-check.html` UI-4 fails — the Present breakdown never wraps.**
   Found 2026-07-28 while running the checks for
   [008](done/008-assignment-phase-2-builder.md); **pre-existing**, reproduced on
   a clean `main` (298 passed / 1 failed) before that work started, and it fails
   at all four matrix sizes. Symptom: after `[data-act="all"]` in Present, the
   densest example renders as **one** `.gl-grid` overflowing its 718px stage by
   ~5,700px — i.e. `computeLines()` put the whole sentence on a single line
   rather than the two-stage fit splitting it. The wrap-stress fixture (fixed
   640px host) still passes, so it looks like *when* the width is measured, not
   the algorithm. Diagnose against `js/render.js` `computeLines()` /
   `layoutFitted()`; check whether the rAF-deferred relayout is what the shell
   depends on (headless virtual time may not service it, in which case this is a
   harness artifact and the check needs a settle, not the renderer).