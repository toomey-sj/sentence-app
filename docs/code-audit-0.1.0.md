# Code audit: roadmap completion and 0.1.0 readiness

**Audit date:** 2026-07-22  
**Scope:** the two roadmap files, application code, test tooling, samples, and
active project/product documentation.  
**Verdict:** **Do not call `0.1.0` done yet.** The taxonomy roadmap is complete
within the app's declared scope, and the non-browser automated checks are green.
The release roadmap, however, overstates completion in data durability,
destructive-action safety, accessibility, browser verification, and documentation
consistency.

## Evidence and verification

The audit compared [the taxonomy roadmap](roadmap.md) and
[the 0.1.0 roadmap](roadmap-0.1.0.md) with the runtime paths they cite.

Local results:

| Check | Result |
|---|---|
| `node tools/smoke-test.js` | Pass; all assertions and examples passed |
| `node tools/gen-docs.js --check` | Pass; 87 labels and 8 sentence types |
| Lesson validation with all eight sample paths spelled out | Pass; no sample warnings |
| `node tools/cvd-check.js --check` | Pass |
| `node tools/cvd-check.js --palette=cbSafe --check` | Pass |
| Browser DOM check | **Not verified**; headless Edge again emitted no runnable dump |

The documented `samples/*.json` validator command does not work in this
PowerShell environment: Node receives the wildcard literally and fails with
`ENOENT`. The same command passes when the sample paths are listed explicitly.
That is a developer-experience defect, not a lesson-data failure.

## 1. Roadmap work that is not complete

### `docs/roadmap.md` — taxonomy coverage

Tiers 1, 1.5, and 2 are implemented. The passing taxonomy assertions confirm
the 87-label count, parent/child families, tier normalization and filtering, and
sample round trips. No promised work in those tiers was found missing.

The only unimplemented section is [Tier 3](roadmap.md#tier-3--out-of-scope-for-this-app-documented-for-a-sibling-tool):

- punctuation annotation;
- usage and sentence-boundary diagnostics;
- tense, aspect, voice, and mood as independent verb properties;
- Reed–Kellogg diagramming.

This is deliberately parked for a sibling tool because it does not fit the
whole-token, one-label-per-span model. It should not block `0.1.0`, but it is the
literal answer to what remains in this roadmap. It would be clearer as a parked
ideas/reference document rather than an unfinished tier in an otherwise shipped
roadmap.

### `docs/roadmap-0.1.0.md` — release polish

The file still says **Status: Planned** while every checkbox is marked complete
([lines 3 and 172–180](roadmap-0.1.0.md#definition-of-done-for-010)). More
importantly, these items are not actually closed:

1. **The required live browser DOM run remains outstanding.** The roadmap itself
   says to rerun the suite before tagging
   ([lines 219–225](roadmap-0.1.0.md#as-built)). This audit reproduced the empty
   headless dump rather than a `245 passed, 0 failed` result.

2. **P1 data durability is only partially complete.** Lesson writes catch quota
   failures in [`store.writeAll()`](../js/store.js#L39), but startup directly
   reads and writes `localStorage` for theme and palette preferences
   ([`app.js:115`](../js/app.js#L115), [`app.js:128`](../js/app.js#L128),
   [`app.js:367`](../js/app.js#L367)). If storage access itself is disabled, the
   `DOMContentLoaded` handler can throw before routing and leave the app blank.
   Duplicate and delete also invoke throwing store operations without a toast
   boundary ([`app.js:262`](../js/app.js#L262),
   [`app.js:266`](../js/app.js#L266)). That contradicts P1's claim that disabled
   storage is surfaced as a friendly error.

3. **Destructive editor paths still lose data silently.** “Merge next” copies
   text and annotations but discards the second sentence's `types` and `notes`,
   with no confirmation ([`editor.js:274`](../js/editor.js#L274)). Editing text
   replaces the sentence with `{ text, annotations: [] }`, also dropping its
   types and note; the warning mentions only labels
   ([`editor.js:304`](../js/editor.js#L304)). Deleting a sentence is unguarded
   whenever it has zero annotations, even if it has type badges or a note
   ([`editor.js:289`](../js/editor.js#L289)). These paths do not meet the
   destructive-action safety goal.

4. **P4 accessibility is incomplete.** Creating a span is pointer-only:
   `attachSelection()` listens only for `pointerdown`/move/up on non-focusable
   token spans ([`render.js:665`](../js/render.js#L665)). A keyboard user cannot
   add a label or answer a “find” quiz question. The confirmation dialog has no
   accessible name and no Tab focus trap; it only focuses the OK button and
   handles Escape ([`app.js:24`](../js/app.js#L24)). This conflicts with the
   roadmap's completed keyboard/ARIA sweep.

5. **The open-alpha documentation relabel is incomplete.** The public README
   still says “Feature-complete,” “classroom pilot,” and “frozen”
   ([`README.md:74`](../README.md#L74)); the product overview repeats the frozen
   pilot framing ([`overview.md:113`](product/overview.md#L113)); and deployment
   documentation says there are no versions
   ([`deploying.md:66`](project/deploying.md#L66)). Those statements contradict
   the 0.1.0 roadmap and `wjt.VERSION = "0.1.0"`. The testing guide also calls
   `234/0` healthy ([`testing.md:139`](project/testing.md#L139)), while the release
   roadmap and `CLAUDE.md` use `245/0`.

Explicit deferrals that do **not** block this release are the length-changing
dash/ellipsis importer mapping, the roadmap-file rename (Q4), the
student-as-creator pivot, a backend, and taxonomy Tier 3.

## 2. What can be streamlined or dropped

### Highest-value simplifications

1. **Use one active roadmap and archive shipped plans.** Rename the taxonomy
   document to something like `taxonomy-coverage.md`, move its Tier 3 material to
   `reference/parked-ideas.md`, and make the active roadmap contain only future
   work. Archive or delete completed trackers such as
   [`tier1-remaining-plan.md`](tier1-remaining-plan.md),
   [`plans/quick-todo.md`](../plans/quick-todo.md), and completed items 1, 2, and
   4 in [`to-do.md`](../to-do.md). Today the same state is maintained in roadmap
   checkboxes, “As built” prose, plan files, README status text, and product docs,
   which is why they disagree.

2. **Stop hard-coding test pass counts in prose.** “Zero failures” is the stable
   contract; `234`, `238`, and `245` are historical implementation details.
   Remove exact totals from active docs or generate them from the DOM suite.

3. **Replace the partial DOM harness with a runtime-level browser suite.** The
   current harness does not load `app.js`, `quiz.js`, or `display.js`, and it
   rebuilds palette groups inline instead of invoking the real editor palette
   path. That makes P4 regressions invisible even if `245/0` passes. A single
   browser suite should open the actual app and cover library → edit → present →
   quiz → export/import, including keyboard focus and `file://` operation. Keep
   the fast Node smoke test for model logic.

4. **Make lesson validation cross-platform.** Let `validate-lesson.js` accept a
   directory or expand globs itself, or add a small cross-platform wrapper. The
   primary README command currently works in Bash/CI but fails in the documented
   Windows/PowerShell development environment.

5. **Remove the duplicate fox sample artifact.** After regeneration,
   `samples/sample-lesson.json` and
   `samples/fox.sentence-forge.json` are byte-for-byte identical. Keep
   `sample-lesson.json` as the custom-GPT knowledge file and stop emitting the
   duplicate, or designate the `fox` filename as canonical and update the GPT
   instructions.

6. **Move sample construction out of the persistence module.** The 100-line
   `buildSampleLesson()` in [`store.js:283`](../js/store.js#L283) is example data,
   not storage/import/export logic. Moving it to `examples.js` gives `store.js`
   one responsibility and makes the example registry the single home for built-in
   lessons.

### Things to keep out

- Keep Tier 3 out of this app unless the annotation model is intentionally
  redesigned.
- Keep the student-creator and server work out of `0.1.0`.
- Do not add a framework or build pipeline solely for the release; the current
  no-build/file-openable constraint is coherent. The test harness and document
  ownership can be simplified without changing the runtime stack.

## 3. Standout blockers to declaring `0.1.0` done

Resolve these in order:

| Priority | Blocker | Minimum release condition |
|---|---|---|
| **P0** | Merge/edit/delete can silently discard sentence types and notes | Preserve metadata or explicitly confirm and name everything that will be cleared; add regression tests |
| **P0** | Storage-disabled startup and unhandled duplicate/delete failures | Wrap preference and boot storage access; ensure every write failure produces an in-app error and the app still renders |
| **P0** | Keyboard users cannot select tokens; modal semantics are incomplete | Provide a focusable keyboard selection path for editor/quiz and a named, focus-trapped confirmation dialog |
| **P0** | Required browser check is not green and does not cover the P4 runtime paths | Obtain a reproducible zero-failure run against actual app views on `file://`; record the result before tagging |
| **P1** | Public status/version docs contradict one another | Align README, product overview, deploying, testing, roadmap status, and supported-version wording |
| **P1** | Corrupt `localStorage` is silently treated as an empty library | Surface corruption and preserve/export the raw value instead of allowing the next save to overwrite it |

After those are fixed, rerun the five passing checks, the improved browser suite,
and the manual served-page plus `file://` flow. Then change the roadmap status
from “Planned” to “Shipped” and create the `v0.1.0` tag/release marker used by the
project. Until then, the footer version is an aspiration, not a verified release.
