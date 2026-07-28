---
status: in progress
created: 2026-07-27
updated: 2026-07-28
source: plans/proposals/assignment-mode-proposal.md
---

# Goal prompt — Assignment mode

> ## ⚠️ Read this before pasting anything
>
> **Phase 1 is done** (2026-07-28) — `js/assignment-model.js`,
> `js/assignment-codec.js`, 64 checks in `tools/smoke-test.js`. Do **not** paste
> Phase 1 into a session; it would rebuild work that exists. Its decisions and an
> **As built** note are recorded in the proposal.
>
> **Next block to paste: Phase 2.**

The proposal is the spec. This file is the **prompt**: what to paste into a fresh
Opus 5 session to get the work done.

**How to use it:** paste [§ Standing context](#standing-context) at the top of
every Assignment-mode session, then exactly one phase block below it. One phase
per session — the whole feature does not fit in one context, and each phase is
independently testable on purpose. Do not paste two phase blocks at once.

---

## Standing context

> **Goal.** Ship **Assignment mode** in Sentence Forge: a teacher opens a lesson
> they have already annotated, picks sentences and skills, and gets a
> student-facing handwritten activity delivered two ways that render identically
> — a **printed worksheet** (plus a matching teacher answer key) and a
> **read-only student URL with a locally generated QR code**. The app never
> collects, transmits, or stores a student name, answer, score, or activity
> record.
>
> **Read before touching code:**
>
> - `plans/proposals/assignment-mode-proposal.md` — the full spec. It is
>   authoritative on *requirements*; file names, wire-format details, and
>   thresholds are yours to decide.
> - `CLAUDE.md` — hard constraints and the exact check commands.
> - `docs/project/architecture.md` — how the nine files fit together.
> - `docs/project/dom-structure.md` — the DOM map you will be extending.
> - `js/tokenize.js` and `js/labels.js` — the token and annotation models every
>   generated question depends on.
>
> **Non-negotiable, in priority order:**
>
> 1. **Privacy is the product.** No answer fields, no name field, no submit
>    button, no persistence of student input, no analytics, no third-party
>    service, no server-issued id. No answer key, teacher note, annotation, or
>    lesson id in the student URL, QR payload, student DOM, hidden elements,
>    comments, accessibility text, or storage. Treat "the student URL contains no
>    answers" as a **test**, not a code-review opinion.
> 2. **No network calls of any kind**, including for QR generation. No CDN, no
>    remote image endpoint, no URL shortener.
> 3. **No build step, no bundler, no `package.json`, no ES modules.** Classic
>    `<script>` tags under the `wjt` global, in dependency order. The app must
>    still work when a teacher double-clicks `index.html` from `file://`.
> 4. Every path relative — absolute paths 404 under GitHub Pages' `/<repo>/`.
> 5. `labels.js`, `tokenize.js`, `store.js`, `examples.js` stay **DOM-free**, and
>    so does any new codec/generator module: `tools/smoke-test.js` runs them in a
>    bare `vm` sandbox.
> 6. **Never rename or remove a label id.** Annotations store ids and there is no
>    server to migrate.
> 7. **No lesson-format change.** Assignment state is temporary and in-memory;
>    saved assignment presets are explicitly deferred.
> 8. Match the surrounding style: `var`, `function`, `"use strict"`, one IIFE per
>    file, ES5-flavored on purpose.
>
> **How to work:**
>
> - Plan before building, and say so if the phase's scope looks wrong — a
>   corrected premise is worth more than executed busywork here.
> - Run the real checks and report them honestly. A failing check is a failing
>   phase; show the output rather than summarizing red as done. `node
>   tools/smoke-test.js` also regenerates `samples/` — commit the result.
>   `tools/dom-check.html` needs the PowerShell `Start-Process` recipe in
>   `CLAUDE.md`; the Bash `>` redirect silently yields an empty dump.
> - Update `docs/project/dom-structure.md` **in the same change** as any
>   structural DOM change. Nothing regenerates or checks it.
> - When your implementation diverges from the proposal or teaches you something
>   it got wrong, append an **As built** note to the proposal. The divergences are
>   the valuable part.
>
> **The feature is done (all phases) when a teacher can:** open any suitably
> annotated lesson; choose sentences, skills, question count, and supports;
> preview one stable numbered assignment; print a usable worksheet and matching
> answer key; from an HTTP(S) deployment copy a self-contained student URL and
> get a scannable local QR code; open that URL on a student device and see the
> same assignment with no answers and no response controls; and verify by test
> and by source inspection that nothing about student or teacher activity is
> collected, transmitted, or stored.

---

## Phase 1 — Assignment model and generator ✅ done 2026-07-28

> **Do not paste this block.** Delivered as `js/assignment-model.js` and
> `js/assignment-codec.js`, with 64 checks in `tools/smoke-test.js`. The five
> open questions it required are answered in the proposal's **Phase 1 decisions**
> section, and what diverged is in **As built — Phase 1**. Kept below for the
> record only.

> **Goal.** From a lesson plus a set of teacher selections, deterministically
> generate a balanced set of questions a student can answer **on paper**, and a
> separate teacher answer key. Logic only — no UI, no routes, no DOM.
>
> Deliver two schemas: a **runtime** assignment object with explicit readable
> field names, and a **compact student-safe wire** form for the URL. Encode and
> decode at exactly one boundary; view code never sees abbreviated names. The
> student-safe form must be sufficient to render the student view and
> insufficient to reconstruct answers.
>
> Support the four required question families in the proposal (identify a
> highlighted span, find a named span, classify structure/purpose, list multiple
> matching spans), driven by a small set of predictable templates. Never generate
> an unanswerable question: offer a skill only when the selected sentences
> actually carry usable annotations or sentence-type metadata for it. When
> several same-label spans are valid, the answer key lists **every** acceptable
> answer.
>
> Do not sample annotations uniformly — common labels would swamp the set.
> Distribute across selected skills, then across selected sentences, avoid two
> forms of the same annotation and near-duplicate prompts until the pool is
> exhausted, and drive selection from a **seed stored on the assignment object**
> so worksheet, answer key, URL, and re-rendered preview never drift.
> Regeneration mints a new seed deliberately.
>
> **Decide and record these in the proposal before any UI work** (they constrain
> Phases 2–5): the explicit compact field map; measured URL-length thresholds for
> Easy / Dense / Too-large-for-QR / Too-large-for-URL; which locally shipped QR
> encoder meets capacity, license, and no-build constraints; print lines per
> question family under compact/standard/generous; and the print-safe treatment
> that marks a target span in both color and grayscale without giving away other
> questions' answers.
>
> **Done when** `tools/smoke-test.js` covers, and passes: identical lesson +
> selections + seed produce byte-identical questions; regeneration changes the
> seed without producing an invalid set; selection is balanced across skills and
> sentences when the pool allows; same-label duplicates yield all acceptable
> answers; the student payload round-trips Unicode; malformed, oversized, and
> unsupported-version payloads are rejected without throwing; the payload
> contains **none** of the forbidden teacher fields; and the new modules touch
> neither DOM nor storage. Leak assertions inspect schema keys and teacher-only
> structures — some answer text legitimately appears in the passage, so do not
> naïvely reject every occurrence of a correct word. Full existing suite stays
> green.

---

## Phase 2 — Builder and preview

> **Goal.** A teacher can reach Assignment mode from a lesson card (and from Edit
> where it fits), configure an assignment, and see a live preview of exactly what
> the student will get.
>
> New route, tentatively `#/assign/<lesson-id>`. Controls: assignment title
> defaulting to the lesson title; optional directions; sentence selection
> defaulting to all; skill selection across Parts of Speech, Sentence Parts,
> Phrases, Clauses, Structure type, Purpose type; question count 5 / 10 / 20 /
> All clamped to the real pool; regenerate order; optional word numbering using
> `wjt.tokenize()` boundaries; optional label word bank; answer spacing compact /
> standard / generous; print color mode color / grayscale; layout passage-first
> or questions-under-each-sentence.
>
> Skills with no usable source annotations are **disabled and explained**, not
> silently empty. Show the real question pool size so the count control never
> lies. Carry a short privacy disclosure near the delivery controls.
> Builder state is temporary: warn before discarding it on leave or reload.
>
> Accessibility is in scope now, not retrofitted: visible labels,
> keyboard-operable grouping, selection state conveyed without color alone,
> preview updates announced without stealing focus repeatedly,
> `prefers-reduced-motion` respected.
>
> **Done when** `tools/dom-check.html` covers, and passes: the entry point opens
> the correct lesson; unavailable skills are disabled with the real pool
> reported; the preview renders from the generated assignment and re-renders
> stably; keyboard focus behaves like other views. `docs/project/dom-structure.md`
> documents the new route's DOM. Full existing suite green.

---

## Phase 3 — Print worksheet and answer key

> **Goal.** Print a worksheet a student can actually write on, and a teacher
> answer key that matches it question-for-question.
>
> Build a **purpose-made print view**, not the app UI with navigation hidden.
> Worksheet: title, directions, blank Name/Class/Date lines (marks on paper, not
> app fields), numbered sentences, optional token numbers, numbered questions,
> optional word bank, handwriting space per the spacing preset, page numbers where
> the browser is reliable, small "Created with Sentence Forge" footer. It must not
> print app chrome, editing controls, the lesson id, answer-revealing
> annotations, teacher notes, answer-key data, or privacy/implementation
> boilerplate.
>
> Answer key: same layout and numbering, plus every accepted answer, the source
> label or type, and teacher notes only when explicitly enabled. Mark it
> unmistakably — **Teacher Answer Key — Do Not Distribute** on every page if
> repeated print headers are reliable, at minimum at the top.
>
> US Letter first, don't break A4. Black text and borders in grayscale; never
> depend on background-color printing being enabled. Avoid splitting a question
> from its answer space; wrap long sentences for paper rather than inheriting
> Present mode's projector assumptions. Restore the builder cleanly on
> `afterprint` without losing its temporary state.
>
> **Done when** `tools/dom-check.html` proves the student print DOM contains no
> answer-key material and no app chrome, and that the answer key is marked and
> carries the expected answers; worksheet, answer key, and preview use identical
> numbering; Letter and A4 print previews and a grayscale render are checked by
> hand and recorded. Full existing suite green.

---

## Phase 4 — Student URL

> **Goal.** A teacher on an HTTP(S) deployment copies one self-contained URL that
> opens the same assignment, read-only, on any student device.
>
> Payload lives in the **URL fragment**, never the query string, so it is not
> normally sent to the static host. Build the share URL from the current page URL
> with its hash removed — that preserves GitHub Pages subpaths; do not hard-code
> the production URL. On `file:`, printing keeps working and URL/QR sharing is
> **disabled with a clear explanation**, since a local filesystem path cannot open
> on a student's device.
>
> Versioned UTF-8-safe encode/decode in the DOM-free codec: compact JSON plus
> base64url is fine if it meets the thresholds from Phase 1. If compression turns
> out to be necessary, vendor a small reviewed implementation with its license —
> no service, no dependency. The decoder rejects unknown formats and unsupported
> major versions, rejects malformed base64url and JSON without throwing through
> the router, enforces length and count limits **before** rendering, treats every
> decoded string as untrusted and escapes it through the existing helpers, shows a
> useful invalid-assignment screen that does not link to an answer-bearing
> teacher lesson, and never writes to `localStorage`.
>
> The student route is deliberately quiet: title, directions, the prominent
> statement *"Write your answers on paper and hand them to your teacher. Sentence
> Forge does not collect or submit your answers."*, the passage and questions
> matching print, optional word bank, text-size controls, and a print button so a
> family can print at home. No inputs, no interactive selection, no answer
> checking, no Library/Edit/Present/Practice/answer-key navigation. Readable in
> grayscale, logical reading order with CSS mostly stripped, keyboard accessible,
> usable under magnification, and text-size changes must not clip questions.
>
> Measure the **actual final URL**, never estimate from sentence count, and
> surface Easy to scan / Dense / Too large. If the URL exceeds the supported
> ceiling, make the teacher reduce scope — never silently drop content.
>
> **Done when** dom-check proves: the student route has no inputs, submission
> controls, or answer checking; it does not write to `localStorage`; an `https:`
> fixture produces a copyable URL from the current subpath; the `file:` builder
> keeps Print and explains the disabled sharing; invalid and hostile payloads
> render as text and never as HTML; error screens take programmatic heading focus
> like other views; and no network request is made. Full existing suite green.

---

## Phase 5 — QR delivery

> **Goal.** The teacher can put the assignment on the projector or a handout as a
> QR code that a low-end student phone can actually scan — generated entirely
> locally.
>
> Commit a small audited QR encoder with **license and provenance documented**.
> No remote endpoint, no CDN script, no runtime download. Render with adequate
> quiet zone and contrast, always with selectable fallback text containing the
> share URL, plus **Download QR image** and a printable handout carrying the
> assignment title and the handwritten-response instruction beside the code.
>
> The QR must encode **exactly** the URL the Copy URL control shows. Use the three
> states from Phase 1: offer the QR normally when Easy; keep the URL copyable and
> warn the teacher to test on a student device when Dense; and when Too large,
> **do not render a misleading QR at all** — keep Print, and offer URL copy only
> while it stays inside the supported ceiling.
>
> This is security-sensitive input handling: test non-ASCII, long punctuation
> runs, curly quotes, and emoji in titles and directions.
>
> **Done when** dom-check proves QR data equals the displayed URL and that
> oversized assignments never produce a truncated QR or silently dropped content;
> and easy / dense / rejected payloads have been scanned for real from a laptop
> screen, a projector, and a black-and-white printed handout, with results
> recorded. Full existing suite green.
>
> Never solve a QR size problem with a backend. If a self-contained assignment
> cannot fit safely, the correct answer is a smaller assignment or Print.

---

## Phase 6 — Documentation and release verification

> **Goal.** Leave the repo in a state where the next person — teacher or
> maintainer — can find, trust, and verify Assignment mode.
>
> Update `docs/project/dom-structure.md` (new routes and generated DOM),
> `docs/project/architecture.md` (file map, routes, assignment-format
> boundaries), `docs/product/teacher-guide.md` (the workflow and a plain-language
> privacy explanation for teachers), `SECURITY.md` (URL-fragment behavior and an
> explicit no-response-collection statement), and the 1.0 roadmap. Product docs
> and project docs stay separate — don't cross-post.
>
> Then run the whole suite — `tools/smoke-test.js`, `tools/gen-docs.js --check`,
> `tools/validate-lesson.js`, `tools/cvd-check.js --check`, and the PowerShell
> dom-check recipe — and work the manual matrix: Edge/Chrome and Firefox desktop,
> real Safari on iPad or iPhone, Android Chrome on a representative student
> phone, `file://` builder and print, a GitHub Pages deployment for URL/QR,
> Letter and A4 preview, a physical grayscale print, Save as PDF, QR from screen
> / projector / B&W handout, content with curly quotes and em dashes and accents
> and emoji, and easy / dense / too-large-for-QR / too-large-for-URL payloads. For
> each student device confirm that opening and scrolling asks for no login,
> exposes no answer, accepts no response, and retains no activity.
>
> **Done when** dom-check reports **0 failed**, every other check is green, the
> manual matrix is **recorded** rather than asserted, and the proposal carries an
> **As built** section describing where the implementation diverged and what it
> revealed.

---

## Out of scope for every phase

Digital student answers; a student name field in the app; submission, collection,
or a teacher inbox; grading or scoring; rosters, classes, gradebooks, accounts,
or auth; assignment/open/completion analytics; cloud storage, URL shorteners,
dynamic links, or server-issued ids; email, LMS, or Google Classroom
integrations; saved assignment presets in the lesson format; PowerPoint or Slides
export; AI-generated questions; any change to the grammar taxonomy or annotation
model.

Deferred, and not worth delaying the core print/URL workflow: large-print preset,
teacher-authored custom questions, definitions as a support, difficulty presets,
multiple equivalent reordered forms.
