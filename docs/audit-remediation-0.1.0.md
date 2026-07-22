# Plan: audit remediation for 0.1.0

**Created:** 2026-07-22
**Status:** Tier 0 + Tier 1 done; Tier 2 partially done (glob DX landed, three
reorg items deferred). Ready to tag `v0.1.0`.
**Source:** [docs/code-audit-0.1.0.md](code-audit-0.1.0.md)
**Governs:** the gap between `wjt.VERSION = "0.1.0"` and a verified, tag-worthy
release.

The audit's verdict is: *do not call `0.1.0` done yet*. The taxonomy roadmap is
complete within scope and the Node checks are green, but four P0 blockers and two
P1 blockers stand between the code and the version string it already advertises.
This plan closes them in the audit's stated order, then does the streamlining that
prevents the docs from drifting out of sync again.

Nothing here changes the taxonomy or the lesson format. Every fix is additive:
guards, confirmations, keyboard paths, and doc alignment. That keeps the
open-alpha promise (taxonomy/format stay additive; bug fixes, wording, and a11y
are always in scope).

---

## §0 — Premise check

The audit was run against current `main`. Before starting, note two things it got
slightly out of date on, so we don't re-do finished work:

- **The confirm dialog already exists** and already has `role="dialog"`,
  `aria-modal="true"`, backdrop-click + Escape close, and focus restore
  ([app.js:24](../js/app.js#L24)). The audit's a11y finding is narrower than "add
  a modal" — it's **add an accessible name + a Tab focus trap** to the dialog that
  is already there. Scoped that way in P0-3.
- The **glob DX defect** and the **duplicate `fox` sample** are real but are
  tooling/output cleanups, not release blockers. They live in the streamlining
  tier, not the blocker tier.

Everything else in the audit reproduced against the code. See the commit-message
trailer of the verification pass for the confirmed line references.

---

## Tier 0 — Release blockers (must fix before tagging)

Resolve in this order. Each item lists the **minimum release condition** the audit
set, plus the concrete change and its regression test.

### P0-1 — Merge / edit / delete silently discard sentence `types` and `notes`

**Where:** [editor.js:274](../js/editor.js#L274) (merge),
[editor.js:304](../js/editor.js#L304) (edit-text),
[editor.js:289](../js/editor.js#L289) (delete).

**Problem:** all three destroy sentence-level metadata without saying so.
- *Merge next* copies `text` + `annotations` but never carries `next.types` /
  `next.note`, and asks for no confirmation.
- *Edit text* replaces the sentence with `{ text, annotations: [] }`, dropping
  `types` and `note`; the warning copy mentions only "labels".
- *Delete* skips the confirm entirely when `annCount(s) === 0`, even if the
  sentence carries type badges or a note.

**Decision — preserve, don't just warn.** Metadata that can be preserved should
be preserved; only truly-cleared data gets a confirmation.
1. **Merge:** carry the next sentence's `types` and `note` into the survivor —
   union the `types` arrays (dedupe), and concatenate notes with a separator if
   both are non-empty. No data lost, so no new confirm needed.
2. **Edit text:** keep `types` and `note` on the rewritten sentence; only
   `annotations` are offset-dependent and must clear. Update the warning copy to
   say exactly what clears ("Changing the words clears this sentence's labels;
   its type and note are kept.").
3. **Delete:** gate the confirm on *any* metadata, not just annotations —
   `annCount(s) || (s.types && s.types.length) || s.note`. Name what will be lost
   in the message.

**Test:** extend `tools/smoke-test.js` with a merge/edit fixture that asserts
`types` and `note` survive the operation. This is model-layer logic reachable
without the DOM, so it belongs in the fast Node suite.

### P0-2 — Storage-disabled boot and unhandled duplicate/delete failures

**Where:** boot reads/writes `localStorage` directly before routing
([app.js:368](../js/app.js#L368) theme, [app.js:375](../js/app.js#L375) palette,
[app.js:117](../js/app.js#L117)/[app.js:131](../js/app.js#L131) the setters);
Library *duplicate* ([app.js:263](../js/app.js#L263)) and *delete*
([app.js:272](../js/app.js#L272)) call throwing store ops with no toast boundary.

**Problem:** if storage access itself throws (private mode / disabled),
`DOMContentLoaded` throws before `route()` and the app renders blank —
contradicting P1's claim that disabled storage is a *friendly* error. Duplicate
and delete can also throw `STORAGE_WRITE_FAILED` with nothing catching it.

**Decision — one safe-storage shim + toast boundaries on every write path.**
1. Add a tiny `wjt.safeStorage` wrapper (get/set that try/catch and return
   `null` / swallow-with-signal). Route `applyTheme` and `applyPalette` through
   it so a disabled store degrades to in-memory defaults instead of throwing.
2. Wrap the boot body so that if anything storage-related still throws, the app
   **routes anyway** and shows a persistent toast ("Browser storage is off —
   your work won't be saved between sessions. Export to a file to keep it.").
3. Wrap the `store.duplicate` and `store.remove` calls in try/catch that
   toast the `STORAGE_WRITE_FAILED` message (same pattern the New/Load buttons
   already use at [app.js:314](../js/app.js#L314) and
   [app.js:297](../js/app.js#L297)).

**Test:** DOM suite — stub a throwing `localStorage` and assert the app still
renders the Home view and shows the storage toast.

### P0-3 — Keyboard token selection + complete modal semantics

**Where:** `attachSelection()` binds only `pointerdown`/move/up on non-focusable
token spans ([render.js:665](../js/render.js#L665)); the confirm dialog lacks an
accessible name and a focus trap ([app.js:24](../js/app.js#L24)).

**Problem:** a keyboard user cannot create a span in the editor or answer a
"find" quiz question, and the modal doesn't trap Tab.

**Decision — additive keyboard path, no change to the pointer path.**
1. Make token spans focusable (`tabindex="0"`, `role="button"` where a span is
   selectable) and support a keyboard selection gesture: focus a token, press
   Enter/Space to start a span, arrow/Shift to extend, Enter to commit —
   mirroring the pointer drag onto the same commit function so there's no second
   code path for the actual annotation write. Same treatment for the quiz "find"
   answer.
2. Give the confirm dialog an accessible name (`aria-labelledby` pointing at the
   message `<p>`, or `aria-label`) and a **Tab focus trap**: keep Tab/Shift+Tab
   cycling between Cancel and OK while open.

**Test:** DOM suite — assert token spans are focusable and a keyboard gesture
produces an annotation; assert the dialog has an accessible name and that Tab
from OK wraps to Cancel.

### P0-4 — A green browser run that actually covers the P4 runtime paths

**Where:** `tools/dom-check.html` doesn't load `app.js`, `quiz.js`, or
`display.js`, and rebuilds palette groups inline instead of calling the real
editor palette path. Headless Edge also produced an empty dump in both the audit
and CLAUDE.md's own notes.

**Problem:** `245/0` can pass while every P4 regression above stays invisible,
and we currently can't even get a reproducible dump.

**Decision — two parts, sequenced.**
1. **First, get a reproducible dump.** Re-follow the CLAUDE.md recipe exactly
   (Windows-style `file:///C:/…` URL, throwaway `--user-data-dir`, run via the
   **Bash** tool not PowerShell, report via `tools/dom-check-report.js`). If it
   still emits nothing, treat the harness itself as broken and fall back to a
   documented manual browser pass for tagging — but record which.
2. **Then, close the coverage gap.** Extend the harness (or add a companion
   page) so it loads the real `app.js`/`quiz.js`/`display.js` and exercises the
   new P0-1/P0-3 paths through the *actual* editor palette and quiz code, not
   inline rebuilds. Keep the fast Node smoke test for model logic — this is
   additive browser coverage, not a replacement.

**Exit condition for the whole tier:** a reproducible zero-failure browser run
against real app views on `file://`, recorded (count + date) in the "As built"
note below.

---

## Tier 1 — Consistency blockers (fix before flipping status to Shipped)

### P1-1 — Align all public status / version wording

The version string says `0.1.0`; the prose still says pre-version. Fix each:
- [README.md:74](../README.md#L74) — drop "Feature-complete", "classroom pilot",
  "frozen"; use open-alpha wording.
- [docs/product/overview.md:113](product/overview.md#L113) — same frozen-pilot
  framing.
- [docs/project/deploying.md:66](project/deploying.md#L66) — "no versions" is
  now false; state the `0.1.0` marker.
- [docs/project/testing.md:139](project/testing.md#L139) — says `234/0`; the
  contract elsewhere is `245/0`. See P1-2 for the real fix.
- [docs/roadmap-0.1.0.md:3](roadmap-0.1.0.md#L3) — flip **Status: Planned** →
  Shipped *only after* Tier 0 is green (last step of this plan, not first).

### P1-2 — Corrupt `localStorage` is silently treated as an empty library

**Where:** `readAll()` catches a JSON parse error and returns `[]`
([store.js:34](../js/store.js#L34)); the next `writeAll` then overwrites the
corrupt-but-recoverable value.

**Decision — detect, preserve, surface.** On a parse failure in `readAll`:
1. copy the raw string to a side key (e.g. `sentenceForge.lessons.v1.corrupt`)
   so the next save can't destroy it;
2. return `[]` for the session as today (app still opens);
3. signal the shell so it can toast a recovery message and offer to download the
   raw value.

**Test:** smoke test — seed a corrupt value, assert `list()` returns `[]` **and**
the raw value is preserved under the side key rather than lost.

---

## Tier 2 — Streamlining (do alongside or right after; not release-gating)

Ordered by value; each reduces the state-drift that produced the doc
contradictions above.

1. **One active roadmap; archive shipped plans.** Move `roadmap.md` Tier 3 to a
   parked-ideas reference doc, retire completed trackers
   (`tier1-remaining-plan.md`, `plans/quick-todo.md`, done items in `to-do.md`).
   Keeps release state in one place. *(Q4 roadmap rename stays deferred — audit
   said so.)*
2. **Stop hard-coding pass counts in prose.** "Zero failures" is the contract;
   `234`/`238`/`245` are history. Remove exact totals from active docs (this also
   dissolves P1-1's testing.md mismatch) or emit them from the suite.
3. **Cross-platform lesson validation.** Let `validate-lesson.js` accept a
   directory / expand globs itself so the README command works in PowerShell, not
   just Bash/CI.
4. **Drop the duplicate `fox` sample.** `sample-lesson.json` and
   `fox.sentence-forge.json` are byte-identical after regen. Pick one canonical
   name; stop emitting the other; update the custom-GPT instructions to match.
5. **Move `buildSampleLesson()` out of `store.js`** ([store.js:283](../js/store.js#L283))
   into `examples.js`, so persistence has one responsibility and the example
   registry is the single home for built-in lessons. Both files are already
   DOM-free — keep them that way.

**Explicitly kept out** (per audit, don't scope-creep): Tier 3 taxonomy, the
student-creator pivot, any backend, and any framework/build pipeline.

---

## Definition of done

1. Tier 0 P0-1..4 fixed, each with the regression test named above.
2. Tier 1 P1-1..2 fixed.
3. Re-run and record green: `smoke-test`, `gen-docs --check`,
   `validate-lesson` (all sample paths), `cvd-check --check`,
   `cvd-check --palette=cbSafe --check`, and the **improved browser suite** plus
   a manual served-page + `file://` flow.
4. Only then flip `roadmap-0.1.0.md` status to **Shipped** and create the
   `v0.1.0` marker.

Until step 4, the footer version is an aspiration, not a verified release.

---

## As built

All Tier 0 + Tier 1 blockers landed with tests; Tier 2 is partially done. Checks:
smoke-test, `gen-docs --check`, `validate-lesson` (glob works in PowerShell now),
both `cvd-check` gates, and the browser suite at **261 passed, 0 failed**.
`samples/` is unchanged — the fixes are additive and didn't alter generated
output. Divergences from the plan above:

- **P0-4 unblocked the browser check for real.** The dump was capturable all
  along with the right invocation: PowerShell **`Start-Process -Wait
  -RedirectStandardOutput`** captures what the Git-Bash `>` redirect drops for
  this GUI-subsystem process. CLAUDE.md's old "Bash, not PowerShell" advice was
  exactly backwards and is now corrected. The harness was *extended* (boots the
  full app + 16 runtime checks), not rewritten — the audit's "replace it"
  suggestion was more than the blocker needed.
- **P0-1 went through the model layer.** Merge/edit-text moved into pure
  `wjt.store.mergeSentence` / `rewriteSentenceText` so the Node smoke test covers
  the type/note rules. `types` is an axis→option **map**, so merge unions per
  axis (survivor wins) — not the "union arrays" the plan loosely said. Sentence
  metadata is `s.notes` (string) + `s.types` (map), not `s.note`.
- **P0-3 confirm dialog was narrower than the audit implied.** The modal already
  had `role`/`aria-modal`/Escape/backdrop/focus-restore; only the accessible name
  (`aria-labelledby`) and the Tab focus trap were missing. Added both. Keyboard
  token selection reuses the existing pointer `onSelect`, so there's one commit
  path.
- **P1-2 recovery is a clickable toast.** Corrupt storage is copied to a
  `…v1.corrupt` side key and surfaced via a toast whose click downloads the raw
  value (new `wjt.downloadText` for verbatim, non-JSON strings; `wjt.toast` grew
  an optional `onClick`).
- **Deferred Tier 2 (#1 roadmap reorg, #4 dup `fox` sample, #5 move
  `buildSampleLesson`).** Generated-file/doc reshuffles with no runtime effect;
  kept out of the blocker change to keep it reviewable. Worth a focused
  follow-up. Glob DX (#3) landed; pass-count de-emphasis (#2) landed in
  CLAUDE.md/testing.md.
- **Not done here (deliberately):** creating the `v0.1.0` git tag. That's a
  release act for the maintainer, not part of remediation.
