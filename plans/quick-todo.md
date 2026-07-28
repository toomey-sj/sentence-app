# Quick To-Do

When implementing the items in this file,  give them a completed date stamp.

1) move the version number to the far right and center it vertically. — done 2026-07-23
2) move the ko-fi button to the far left and center it vertically. — done 2026-07-23
3) hide the light/dark mode toggle for now and just keep it in dark mode. — done 2026-07-23
4) hide the "quiz" interface for now. — done 2026-07-23
5) **`tools/dom-check.html` UI-4 fails — the Present breakdown never wraps.**
   Found 2026-07-28 while running the checks for
   [008](done/008-assignment-phase-2-builder.md); **pre-existing**, and it fails
   at all four matrix sizes and in CI. → **Promoted to a real work order:
   [014](014-ui4-dom-check-settle.md).** Diagnosed 2026-07-28: it is a *harness*
   bug, not a renderer bug — `presentationChecks()` measures in the same
   synchronous task it renders in, so it reads the deliberate pre-wrap
   single-line layout. Don't touch `js/render.js`; the reasoning and the four
   measurements are in 014. Too big for this list — leave it here only as a
   pointer.