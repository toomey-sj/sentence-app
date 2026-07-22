# Quick To-Do

1) ✅ Fix the delete lesson dialogue so it's in-app not browser initiated.
   Done — `wjt.confirmDialog` (centered in-app modal) replaces the browser
   `confirm()` for lesson delete, plus the two editor confirms (delete sentence,
   clear labels on text change) for consistency.

2) ✅ add a way to export individual lessons alongside export all.
   Already shipped — per-lesson ⬇ export on each Library card and "⬇ Export JSON"
   in the editor header. No new work needed.

3) ✅ let's add "add a lesson" and "importa a lesson" to our library screen.
   Done — "＋ New lesson" and "⬆ Import" now sit in the Library section head
   beside "Export all". Import logic factored into shared `wjt.importLessonFiles`.

4) ✅ prevent new lessons from saving if they're empty and un-named.
   Done — the editor discards a lesson on exit if it has no sentences AND is still
   "Untitled lesson"; a boot-time prune covers the hard-refresh edge case.

5) ✅ move the buy me a coffee button down to the footer.
   Done — the ko-fi badge moved from the topbar into `footer.appfoot`; the toggle
   cluster stays right-aligned via `margin-left:auto` on `#palette-toggle`.
