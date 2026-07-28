---
status: in progress
created: 2026-07-27
updated: 2026-07-28
target: 1.0.0
---

# Assignment mode — printable worksheets or private, read-only URL delivery

> **2026-07-28 — Phases 1–3 delivered, and delivery is being generalized.**
> Phase 1 (model, generator, wire codec), Phase 2 (builder view, route, live
> preview), and Phase 3 (print worksheet and teacher answer key) are built; see
> [Phase 1 decisions](#phase-1-decisions), [As built — Phase 1](#as-built--phase-1),
> [As built — Phase 2](#as-built--phase-2), and
> [As built — Phase 3](#as-built--phase-3).
>
> With Phase 3 in, the entire Edit → Present → Assign → Print loop works with no
> network at all — which is the whole point of landing print before anything that
> needs one.
>
> This document treats a URL and QR code as *the* digital delivery method.
> [docs/roadmap-platform.md](../../docs/roadmap-platform.md) **P4** makes that one
> channel among several — file, print, link, and later account-delivery — behind
> the **S5** channel interface. Read Phases 4 and 5 with that in mind; the
> privacy boundary, question design, print requirements, and encoding rules are
> unaffected.

## Summary

Add an **Assignment** mode that turns an existing annotated lesson into a
student-facing, handwritten activity. A teacher builds the assignment once and
then chooses either delivery method:

1. **Print worksheet** — print directly or use the browser's Save as PDF.
2. **Share URL / QR code** — students open a read-only assignment on a device,
   write their answers on paper, and hand the paper to the teacher.

The two delivery methods must render the same passage, directions, numbering,
questions, and optional supports. Sentence Forge must not collect, transmit, or
store student names, responses, scores, or activity history.

This proposal deliberately does not turn Sentence Forge into a learning
management system. It creates an assignment artifact; the teacher distributes
it and collects handwritten work using existing classroom routines.

## Product goal

Complete the existing author-once workflow:

> Label a passage once, present it, practice it, or turn it into a handwritten
> assignment without authoring the grammar a second time.

Assignment mode has a distinct job from Practice:

| Mode | Job | Student output |
|---|---|---|
| Edit | Teacher creates the source analysis. | None |
| Present | Teacher explains the analysis live. | None |
| Practice | Student receives disposable, immediate feedback. | None retained |
| Assignment | Student answers teacher-selected questions. | Handwritten paper |

## Non-negotiable privacy boundary

Assignment mode must preserve the project's existing no-account, no-server, and
no-network model.

- No student answer fields.
- No student name field in the app.
- No submission button.
- No response or score persistence.
- No analytics, tracking pixels, telemetry, or URL-shortening service.
- No assignment database, access code service, or server-generated identifier.
- No teacher annotations, teaching notes, answer keys, lesson ids, or other
  hidden answers in a student URL.
- No automatic record that an assignment was created, opened, printed, or
  completed.

The printable worksheet may contain blank lines for **Name**, **Class**, and
**Date**. These are marks on paper, not data entered into Sentence Forge.

Every student URL view must state prominently:

> Write your answers on paper and hand them to your teacher. Sentence Forge does
> not collect or submit your answers.

The teacher builder should carry a shorter equivalent disclosure near its
delivery controls.

## Core user flow

### Teacher

1. Open a lesson from the Library.
2. Choose **Assignment**.
3. Select the sentences to include.
4. Select the skills to assess:
   - one or more annotation layers;
   - sentence structure and/or sentence purpose when present.
5. Choose the number of questions, up to the available pool.
6. Configure student supports and print layout.
7. Preview the exact student assignment.
8. Choose one or more outputs:
   - Print worksheet / Save as PDF;
   - Print answer key / Save as PDF;
   - Copy student URL;
   - show, print, or download a QR code for that URL.

### Student via URL

1. Open the URL directly or scan the QR code.
2. Read the directions, passage, and numbered questions.
3. Write numbered answers on separate paper.
4. Hand the paper to the teacher.

The student view is read-only. It must not expose Library, Edit, Present,
Practice, lesson-management controls, or the answer key.

### Student via worksheet

1. Receive the printed worksheet.
2. Write answers in the supplied spaces.
3. Hand the worksheet to the teacher.

## Assignment builder

The builder should be a new route, tentatively:

```text
#/assign/<lesson-id>
```

Add an **Assignment** action to each lesson card and, where it fits naturally,
to the Edit view.

### Required controls for 1.0

- Assignment title, defaulting to the lesson title.
- Optional teacher directions.
- Sentence selection, defaulting to all sentences.
- Skill selection:
  - Parts of Speech;
  - Sentence Parts;
  - Phrases;
  - Clauses;
  - Structure type;
  - Purpose type.
- Question count: 5, 10, 20, or All, constrained by the generated pool.
- Question order regeneration.
- Optional word numbering.
- Optional label word bank.
- Answer spacing: compact, standard, or generous.
- Print color mode: color or grayscale.
- Layout:
  - passage first, followed by questions;
  - questions grouped beneath each sentence.
- Live student preview.

Only offer a skill when the selected sentences contain usable source
annotations or sentence-type metadata for it. Never generate an unanswerable
question.

### Nice-to-have, not required for the first implementation

- Large-print preset.
- Teacher-authored custom questions.
- Definitions as an optional support.
- Difficulty presets.
- Multiple equivalent forms with reordered questions.

These should not delay the core print/URL workflow.

## Question design

Assignment questions must work without digital interaction or color. Each
question needs a stable, explicit answer that a student can write on paper.

### Required question families

1. **Identify a highlighted word or span**

   > What part of speech is the highlighted word in sentence 2?

   The print and URL renderers must use emphasis in addition to color.

2. **Find a named word or span**

   > Copy the complete subject from sentence 3.

   When more than one same-label span is valid, the generated answer key must
   list every acceptable answer.

3. **Classify sentence structure or purpose**

   > Is sentence 4 simple, compound, complex, or compound-complex?

4. **List multiple matching spans**

   > List the two prepositional phrases in sentence 1.

   Generate this form only when the source sentence contains multiple spans
   with the same label. State the expected number in the prompt.

The generator may adapt wording to the layer's unit, but should use a small set
of predictable templates. Do not use free-form AI generation.

### Word numbering

When enabled, display a small index with each token. The numbering must use the
same `wjt.tokenize()` boundaries as annotations and rendering. Questions may
instruct students to quote the answer or write a word range such as `1–3`.

Punctuation remains attached to its token, matching the existing token model.

### Question selection

Do not sample the annotation list uniformly. Common labels would dominate.
Build a candidate pool, then select questions with these priorities:

1. distribute questions across selected skills;
2. distribute across selected sentences;
3. avoid asking two forms of the same annotation unless the pool is exhausted;
4. avoid near-duplicate prompts;
5. use a deterministic seed stored in the temporary assignment object so the
   worksheet, answer key, URL, QR preview, and re-rendered preview never drift.

Regenerating question order deliberately creates a new seed.

## Shared temporary assignment model

The builder should produce one student-safe, serializable object consumed by
both delivery renderers. This is a new assignment payload, not a change to the
lesson JSON format.

Illustrative shape:

```js
{
  format: "sentence-forge-assignment",
  version: 1,
  title: "Sentence Parts Review",
  directions: "Answer each question on your own paper.",
  sentences: [
    { id: 1, text: "The curious fox crossed the frozen river." }
  ],
  questions: [
    {
      id: 1,
      sentence: 1,
      kind: "find",
      prompt: "Copy the complete subject from sentence 1."
    }
  ],
  options: {
    numberWords: true,
    wordBank: [],
    grouping: "passage-first"
  }
}
```

The final field names should favor compactness because the student-safe form is
encoded in the URL. Do not prematurely expose those abbreviated wire names to
view code; use explicit runtime names and encode/decode at one boundary.

### Answer key separation

The student-safe assignment object must be sufficient to render the student
view but insufficient to reconstruct answers.

Build a separate, teacher-only answer-key object in memory:

```js
{
  assignment: studentSafeAssignment,
  answers: [
    {
      question: 1,
      accepted: ["The curious fox"],
      note: "Complete subject"
    }
  ]
}
```

The teacher answer key may be printed during the builder session. It must never
be embedded in the shared URL, QR code, student DOM, query parameters, hidden
elements, comments, accessibility text, or browser storage.

## URL assignment format

Use a dedicated read-only route, tentatively:

```text
#/assignment/<encoded-student-payload>
```

The payload belongs in the **URL fragment**, not the query string. The fragment
is decoded entirely in the browser and is not normally sent to the static host
as part of the HTTP request.

### Base URL

- On an `http:` or `https:` deployment, construct the share URL from the
  current page URL with its existing hash removed. This preserves GitHub Pages
  subpaths and avoids absolute-path bugs.
- On `file:`, printing must still work, but URL/QR sharing must be disabled with
  a clear explanation: a local filesystem URL cannot open the teacher's copy on
  a student's device.
- Do not hard-code the GitHub Pages production URL.

### Encoding

Implement versioned UTF-8-safe encoding and decoding in a small DOM-free module
that can be exercised by `tools/smoke-test.js`.

For the first implementation, a compact JSON representation plus base64url is
acceptable if it satisfies the limits below. Do not call a compression service
or add a build dependency. If compression becomes necessary, use a small
vendored, reviewed, locally shipped implementation with its license preserved.

Decoder requirements:

- reject unknown formats and unsupported major versions;
- reject malformed base64url and malformed JSON without throwing through the
  router;
- enforce length and count limits before rendering;
- treat all decoded strings as untrusted and escape them through existing
  helpers;
- show a useful invalid-assignment screen with no link to an answer-bearing
  teacher lesson;
- never write the decoded assignment to `localStorage`.

### Size and QR readability

Self-contained URLs and QR codes have practical limits. The builder must measure
the final URL, not estimate from sentence count.

Use three visible states:

- **Easy to scan** — QR can be offered normally.
- **Dense** — URL remains copyable; warn the teacher to test the QR on a student
  device.
- **Too large for QR** — do not render a misleading QR code; keep Print
  available and offer URL copy only if it remains within the supported URL
  ceiling.

The implementation should choose and document conservative tested thresholds,
not rely on the theoretical maximum QR capacity. Initial testing should include
low-end phone cameras, printed letter-size output, and a projected QR code.

If the URL itself exceeds the supported ceiling, require the teacher to reduce
the number of sentences/questions. Do not silently omit content.

## QR-code requirements

QR generation must happen locally and must make no network request.

- No remote QR image endpoint.
- No CDN script.
- No runtime package download.
- Prefer a small, audited QR encoder committed to the repository, with license
  and provenance documented.
- Render with sufficient quiet zone and contrast.
- Provide visible fallback text containing the share URL.
- Provide **Download QR image** and a printable QR handout.
- Include the assignment title and the handwritten-response instruction beside
  the QR code.
- The QR code must encode exactly the URL shown by the Copy URL control.

The QR implementation is security-sensitive input handling. Test characters
outside ASCII, long punctuation, curly quotes, and emoji in titles/directions.

## Printable worksheet

The worksheet should be a purpose-built print view, not the existing app UI
with its navigation merely hidden.

### Student worksheet content

- Assignment title.
- Teacher directions.
- Blank paper fields for Name, Class, and Date.
- Numbered passage/sentences.
- Optional token numbers.
- Numbered questions.
- Optional label word bank.
- Sufficient handwriting space according to the selected spacing preset.
- Page numbers when supported reliably by the browser.
- A small “Created with Sentence Forge” footer.

Do not print:

- app navigation;
- editing controls;
- the lesson id;
- annotations that reveal answers;
- teacher notes;
- answer-key data;
- privacy or technical implementation details that distract from the worksheet.

### Teacher answer key

Use the same layout and numbering as the student worksheet, then add:

- every accepted answer;
- the source label/type;
- teacher notes only when explicitly enabled in the print controls.

The answer key should be visually unmistakable: **Teacher Answer Key — Do Not
Distribute** on every page if the browser supports repeated print headers
reliably, otherwise at least at the top of the document.

### Print behavior

- Support US Letter first; do not break A4.
- Use black text and borders in grayscale mode.
- Never rely on background-color printing being enabled.
- Avoid splitting one question from its answer space where practical.
- Avoid clipping long sentences; wrap them for worksheet output rather than
  reusing Present mode's projector layout assumptions.
- Use the browser print dialog for physical printing and Save as PDF.
- Restore the builder cleanly after `afterprint`, without losing its temporary
  assignment state.

## Student URL view

The read-only student page should be deliberately quieter than other app modes.

Required content and controls:

- assignment title and directions;
- privacy/handwritten-response statement;
- passage and questions matching the print worksheet;
- optional word bank;
- text-size controls;
- a print button so a family may print the same worksheet at home;
- no answer inputs or interactive selections;
- no answer checking;
- no lesson or answer-key navigation.

The page must remain understandable in grayscale and with CSS disabled enough to
retain logical reading order. It must be keyboard accessible and usable with
screen magnification.

## Architecture and likely file boundaries

Final names are at the implementer's discretion, but keep responsibilities
separate:

| Area | Suggested responsibility |
|---|---|
| `js/assignment.js` | Builder view, generation orchestration, preview, delivery controls |
| `js/assignment-codec.js` | DOM-free compact payload encoding, decoding, validation, limits |
| `js/assignment-render.js` | Shared student worksheet/read-only rendering and print variants |
| `js/qr.js` | Locally shipped QR encoding/rendering with provenance/license |
| `js/app.js` | New builder and student routes |
| `css/styles.css` | Builder, student page, QR handout, and `@media print` styles |
| `index.html` | Classic script tags in dependency order |
| `tools/smoke-test.js` | Codec/generator round trips and privacy invariants |
| `tools/dom-check.html` | Builder/student/print DOM and answer-leak checks |
| `docs/project/dom-structure.md` | New route and generated DOM map |
| `docs/product/teacher-guide.md` | Teacher workflow and privacy explanation |
| `docs/project/architecture.md` | File map, routes, assignment format boundaries |
| `SECURITY.md` | URL-fragment behavior and no-response-collection statement |

Do not put DOM access in `labels.js`, `tokenize.js`, `store.js`, `examples.js`,
or the proposed codec/generator logic. Keep the project compatible with classic
scripts and `file://`; do not introduce modules, a package manager, a build
step, or a network call.

## Lesson-format decision

**Decision:** Assignment mode does not change the existing lesson export format
for 1.0.

The builder's selections and generated question set are temporary. Reloading or
leaving the builder may discard them after warning the teacher. This avoids
silently turning lesson files into containers for distribution state and keeps
the 1.0 lesson-format freeze focused.

A later classroom need may justify saved assignment presets as a separate,
additive format. Do not add them speculatively in this implementation.

## Security and privacy threat checks

Treat “the student URL contains no answers” as a tested invariant, not a code
review assumption.

For every generated assignment:

- decode the final URL in a test;
- assert it contains only the allowed student-safe schema;
- assert no annotation label ids, offsets, notes, accepted answers, lesson id,
  timestamps, or teacher-only settings are present;
- assert strings resembling answers do not appear accidentally in hidden DOM;
- verify invalid/malicious payload strings render as text, never HTML;
- verify opening a student URL does not mutate `localStorage`;
- verify no network request is made by Assignment or QR code logic.

Some answer text necessarily appears in the passage itself. Leak tests should
therefore inspect schema keys and teacher-only structures, not naïvely reject
all occurrences of the correct words.

## Accessibility requirements

- Builder controls have visible labels and keyboard-operable grouping.
- Sentence-selection and skill-selection state is conveyed without color alone.
- Preview changes are announced without repeatedly stealing focus.
- Print output has logical heading and question order.
- Highlighted question targets use text decoration, weight, outline, or explicit
  wording in addition to color.
- QR output always has a selectable URL fallback.
- Student text-size controls do not cause clipped questions.
- Error screens receive programmatic heading focus consistent with other views.
- `prefers-reduced-motion` remains respected.

## Implementation phases

Keep the proposal as one product feature, but land it in independently testable
phases.

### Phase 1 — Assignment model and generator

- Define the temporary runtime and compact student-safe schemas.
- Generate balanced, deterministic paper-answer questions from a lesson.
- Build the answer key separately.
- Add logic tests, including multiple valid same-label spans.

### Phase 2 — Builder and preview

- Add the route and Library/Edit entry points.
- Implement sentence/skill/count/support/layout controls.
- Render a live student preview from the generated assignment.
- Add explicit regeneration and question-pool feedback.

### Phase 3 — Print worksheet and answer key

- Build purpose-specific worksheet rendering.
- Add print controls and print styles for Letter and A4.
- Verify color and grayscale output.
- Verify that student print DOM contains no answer-key material.

### Phase 4 — Student URL

- Implement versioned encoding, decoding, validation, and error handling.
- Add the read-only student route.
- Disable URL delivery on `file:` while retaining print.
- Add size/readability feedback.

### Phase 5 — QR delivery

- Add the local QR implementation and license/provenance.
- Add QR preview, image download, and printable handout.
- Test easy, dense, and rejected payloads on actual phones and paper.

### Phase 6 — Documentation and release verification

- Update the DOM map, architecture, teacher guide, privacy/security docs, and
  1.0 roadmap.
- Complete automated and manual acceptance matrices.
- Record an **As built** section in this proposal if implementation decisions
  diverge from it.

## Automated acceptance checks

Extend existing checks rather than introducing a test framework.

### Logic checks

- Identical lesson, selections, and seed produce byte-identical questions.
- Regeneration changes the seed and may change order without changing validity.
- Selected questions are balanced across skills and sentences when the pool
  permits.
- Same-label duplicate spans produce all acceptable paper answers.
- Student-safe payload round-trips Unicode through encode/decode.
- Malformed, oversized, and unsupported-version payloads are rejected safely.
- The student payload contains none of the forbidden teacher fields.
- The codec does not access the DOM or storage.

### Browser/DOM checks

- Assignment entry point opens the correct lesson.
- Builder disables unavailable skills and reports the real question pool.
- Preview, worksheet, answer key, and student URL use identical numbering.
- Print worksheet has no app chrome and no answer-bearing DOM.
- Answer key is clearly marked and contains expected answers.
- Student route has no inputs, submission controls, or answer checking.
- Student route does not write to `localStorage`.
- `file:` builder leaves Print enabled and disables URL/QR with an explanation.
- `https:` fixture produces a copyable URL from the current subpath.
- QR data equals the displayed URL.
- Oversized assignments never render a truncated QR or silently drop content.
- Keyboard focus and invalid-payload behavior are correct.

All existing smoke, generated-doc, lesson-validator, CVD, and DOM checks must
remain green.

## Manual acceptance matrix

Test at minimum:

- Edge/Chrome and Firefox desktop.
- Safari on iPad/iPhone or the closest available real Safari device.
- Android Chrome on a representative student phone.
- `file://` for builder and printing.
- GitHub Pages deployment for URL/QR sharing.
- US Letter and A4 print preview.
- Physical grayscale print.
- Save as PDF.
- QR scanned from:
  - a laptop screen;
  - a projector;
  - a black-and-white printed handout.
- Assignment content containing curly quotes, em dashes, apostrophes, accented
  characters, and emoji.
- Easy, dense, too-large-for-QR, and too-large-for-URL payloads.

For each student device, confirm that opening and scrolling the assignment does
not ask for a login, expose an answer, accept a response, or retain student
activity.

## Explicitly out of scope

- Digital student answers.
- Student names entered into the app.
- Submission, collection, or teacher inbox.
- Automatic grading or scoring.
- Rosters, classes, gradebooks, accounts, or authentication.
- Assignment analytics, open tracking, or completion tracking.
- Cloud storage, URL shorteners, dynamic links, or server-issued assignment ids.
- Email, LMS, Google Classroom, or other third-party submission integrations.
- Saving assignment presets into the lesson format in this iteration.
- PowerPoint or Google Slides export.
- AI-generated questions.
- Changes to the grammar taxonomy or annotation model.

## Done when

Assignment mode is ready for 1.0 when a teacher can:

1. open any suitably annotated lesson;
2. choose sentences, skills, question count, and basic supports;
3. preview one stable, numbered assignment;
4. print a usable student worksheet and matching teacher answer key;
5. from an HTTP(S) deployment, copy a self-contained student URL and produce a
   scannable local QR code;
6. open that URL on a student device and see the same assignment without any
   answers or response controls;
7. verify through automated tests and source inspection that Sentence Forge
   collects, transmits, and stores no student or teacher activity data.

The full existing check suite must report green, the new automated privacy
invariants must pass, and the manual browser/print/QR matrix must be recorded.

## Open implementation questions

Resolve these during Phase 1 and record the decisions before UI work.
**All five are answered in [Phase 1 decisions](#phase-1-decisions) below.**

1. **Compact wire schema:** What explicit field map gives useful URL savings
   without making validation brittle?
2. **Size thresholds:** What measured URL lengths define Easy, Dense, Too large
   for QR, and Too large for URL on supported devices?
3. **QR implementation:** Which locally shipped encoder meets capacity,
   licensing, accessibility, and no-build constraints?
4. **Answer space:** How many print lines should each question family receive
   under compact, standard, and generous presets?
5. **Stable highlighting:** What print-safe treatment identifies a target span
   in color and grayscale without revealing answers to other questions?

Do not solve QR size by adding a backend. If a self-contained assignment cannot
fit safely, the correct behavior is to reduce its scope or use Print.

## Phase 1 decisions

Resolved while building `js/assignment-model.js` and `js/assignment-codec.js`.
These constrain Phases 2–5; change one only deliberately.

### Q1 — Compact wire schema

**Decision: short single-letter keys over a whitelist, and the question prompt
travels as literal text.**

```text
f  format tag "sfa"        v  version (1)
t  title                   d  directions        (omitted when empty)
s  [sentence text, …]      in student numbering order
q  [{ k, s, p, m, n }, …]  k kind code (0 identify, 1 find, 2 classify, 3 list)
                           s 0-based index into `s`
                           p prompt text
                           m [firstToken, lastToken] to mark   (identify only)
                           n expected answer count             (list only)
o  { w, b, g, z }          w word numbering on, b word bank,
                           g grouping (1 = per-sentence), z spacing (0/2)
                           each key omitted at its default; `o` omitted if empty
```

`wjt.assignmentCodec.toWire()` is the only place this map exists, and it is a
whitelist rather than a rename pass: `seed`, the answer key, teacher notes,
label ids, annotation offsets, the lesson id, and the teacher's print color mode
have **no wire key at all**, so they cannot leak by accident — only by someone
adding a key here, which `tools/smoke-test.js` fails on.

Two rejected alternatives, both measured:

- **Question tuples instead of objects** (`[k, s, p, m, n]`) save ~16 bytes per
  question — about 210 URL characters on a 10-question assignment, ~13%. Not
  enough to change a size state, and it makes every validation branch positional.
- **Templated prompts** (send a template id + label id, rebuild the sentence
  client-side) would save far more: prompts are 558 of the 1,109 JSON bytes in a
  typical 10-question payload. Rejected anyway, for two reasons. It puts label
  ids in the payload for `find`/`list` questions, which destroys the simple,
  un-foolable invariant *"the payload carries no label id anywhere"* and replaces
  it with "label ids, but only on the question families where the label is the
  question" — exactly the kind of rule that rots. And a later wording change
  would silently alter what an already-shared URL says. Literal prompts are
  immutable and auditable. If the payload must shrink, **compress** it (Q2)
  rather than teaching the wire about grammar.

### Q2 — Size thresholds

**Decision, in characters of the whole share URL:**

| State | Length | Behavior |
|---|---|---|
| Easy to scan | ≤ 1,300 | Offer the QR code normally. |
| Dense | 1,301 – 1,800 | Render it, warn the teacher to test on a student device. |
| Too large for QR | 1,801 – 8,000 | No QR at all. Keep Print and URL copy. |
| Too large for URL | > 8,000 | Refuse; the teacher must reduce scope or Print. |

base64url is mixed-case, so a QR encoder must use **byte mode**; alphanumeric
mode is uppercase-only and does not apply. Byte-mode capacity at error-correction
level L is ≈1,273 bytes at version 25 and ≈1,732 at version 30 (2,953 at version
40, the ceiling). Past version 30 the module pitch stops being reliable off a
projector or a photocopied handout, which is where the offer stops — not at the
theoretical maximum. Phase 5 confirms all three against real scans.

Hard caps in the codec, enforced before anything renders: payload 7,800
characters, 40 sentences, 60 questions, 600 characters per sentence (the longest
sentence in the shipped examples is 406), 240 per prompt, 120 title, 600
directions, 40 word-bank entries.

Measured, on the built-in examples, base URL 39 characters (regenerate this
table with `node tools/smoke-test.js`):

| Lesson | Sent. | 10 questions | 20 questions |
|---|---:|---|---|
| fox | 4 | 1,531 dense | 2,451 too-large-qr |
| kinds-of-sentences | 7 | 1,498 dense | 2,510 too-large-qr |
| dracula-count-appears | 2 | 1,450 dense | 2,514 too-large-qr |
| great-gatsby-closing | 4 | 1,566 dense | 2,631 too-large-qr |
| frankenstein-creation | 3 | 1,603 dense | 2,716 too-large-qr |
| parts-of-speech-close-up | 7 | 1,771 dense | 2,856 too-large-qr |
| romeo-juliet-prologue | 14 | 2,038 too-large-qr | 3,082 too-large-qr |
| declaration-of-independence | 15 | 5,524 too-large-qr | 6,551 too-large-qr |

Read that table before designing the builder. The payload has **two terms**:

```text
size ≈ every selected sentence's full text  +  ~55 bytes per question
```

The student's device has nothing but the URL — no lesson, no storage, no server
— so the whole passage is carried literally, and **every selected sentence rides
along whether or not a question touches it.** Which term dominates depends on
sentence *length*, not sentence count: on the fox lesson the passage is 225 of
1,109 JSON bytes (20%, so the questions dominate), while on the Declaration it is
3,256 of 4,102 (79%). That is why a 15-sentence lesson is past QR range at 10
questions and a 2-sentence lesson is not.

So the builder has two size levers, and should show both: **deselect sentences**
(the only lever on a long-sentence lesson) and **ask fewer questions** (the only
one on a short-sentence lesson). Two related notes for Phase 2:

- A selected sentence with no question attached is pure payload weight. On the
  Declaration at 10 questions, 5 of the 15 sentences are never referenced;
  dropping them would cut the URL from 5,524 to 4,039 characters (−27%). Do
  **not** drop them automatically — the passage is reading context, and both
  delivery methods must render the same thing — but the builder should say
  "5 selected sentences have no questions" next to the size readout and let the
  teacher decide.
- Nothing here shrinks a long-sentence lesson enough to reach "easy to scan".
  Only compression would (see the As built note below).

### Q3 — QR implementation

**Decision: vendor `qrcode-generator` by Kazuhiko Arase (MIT)** into `js/qr.js`
in Phase 5, license header and upstream version preserved. It is a classic
script exporting one global, needs no build step or module system, does byte
mode with automatic version selection, and is the most widely reviewed encoder
that fits the constraints. Nayuki's *QR Code generator* (MIT) is the fallback if
the vendored copy disappoints; it is equally well audited but ships modern-JS
classes, which read oddly next to this repo's ES5 style.

Requirements the vendored copy must meet, verified in Phase 5 rather than
assumed here: byte mode to at least version 30 at ECC L (≈1,732 bytes), a
capacity table that can be queried so the builder never renders a truncated
code, and no network, canvas-only, or DOM-at-load-time dependency. Whether
"Easy" can afford ECC **M** instead of L — more robust on a photocopy, ~25% less
capacity — is a Phase 5 call once real scans exist.

### Q4 — Answer space

**Decision:** `wjt.assignment.linesFor(question, spacing)`, ruled lines per
question:

| Family | compact | standard | generous |
|---|---:|---:|---:|
| identify | 1 | 1 | 2 |
| classify | 1 | 1 | 2 |
| find | 1 | 2 | 3 |
| list | max(2, n) | max(3, n+1) | max(4, 2n) |

`identify` and `classify` are answered with one label name or one type name, so
they never need more than a line. `find` asks for copied text, which is longer
than students expect. `list` scales with the number of answers it asked for —
`n` is the count already stated in the prompt, so the space and the question can
never disagree.

### Q5 — Stable highlighting

**Decision: an `identify` question carries its own copy of the sentence with the
target marked, rendered with the question — not a highlight in the shared
passage.**

The payload carries a **token range** (`m: [first, last]`), never character
offsets and never a label. The mark is drawn with **bold + underline + square
brackets** around the span, so it survives grayscale printing, photocopying, and
CSS being stripped; color is decoration on top, never the signal. That satisfies
the color-independence rule the rest of the app already follows.

Rendering the sentence per question rather than marking the shared passage is
what keeps one question from answering another: a worksheet with six `identify`
questions on one sentence would otherwise need six simultaneous marks in the
passage, and a student could read the set of interesting spans straight off it.
It also disambiguates two questions whose prompts are word-for-word identical
("What part of speech is the marked word in sentence 1?" appears once per marked
word) — the mark, not the prompt, is what distinguishes them.

## As built — Phase 1

What the implementation revealed, beyond the decisions above.

- **Two modules, not one.** `js/assignment-model.js` (`wjt.assignment` — pool,
  balanced selection, answer key) and `js/assignment-codec.js`
  (`wjt.assignmentCodec` — wire map, base64url, validation, size states). Both
  are DOM-free and run in the smoke test's `vm` sandbox. The file the proposal
  called `js/assignment.js` stays free for the Phase 2 builder **view**.
- **Hand-rolled base64url and UTF-8.** `btoa`/`atob` mangle non-ASCII and
  `TextEncoder` does not exist in the bare `vm` sandbox, so the codec carries its
  own conversions (~60 lines). The decoder is strict: overlong sequences, lone
  surrogates, and out-of-charset characters are rejected rather than repaired.
- **Nothing throws.** `encode` and `decode` both return `{ ok: true, … }` or
  `{ ok: false, error }`. There is no exception path to leak through the router
  in Phase 4.
- **The assignment is renumbered over the selection.** Picking lesson sentences
  3 and 7 produces sentences 1 and 2, and the prompts say so. The student never
  learns that a lesson existed, let alone which parts were skipped.
- **`find` and `list` are two forms of one group.** Both are generated per
  (sentence, label): `find` accepts *every* same-label span in that sentence
  (proposal §Question design 2), `list` states the count and expects all of them
  (§4). Selection treats them as one group, so a single pass never asks both —
  that only happens once the pool is exhausted.
- **Unpluralizable label names.** "List the two **object of the prepositions**"
  is not English. Names containing a parenthetical, a slash, or an "of" phrase
  fall back to `List the two examples of “Object of the Preposition” in sentence
  1.` Everything else takes a plain `-s`.
- **The word bank is padded on purpose.** A bank containing exactly the correct
  label names is an answer sheet, especially with few questions. It now carries
  the answers plus two or three same-layer decoys (nearest family first, as
  Practice picks distractors), sorted alphabetically so its order maps to no
  question. This is the one place a payload intentionally contains answer text,
  it only happens when the teacher turns the bank on, and the smoke test asserts
  that the bank is the *only* such place.
- **Selection is two passes, not one.** Pass 1 takes at most one question per
  (sentence, label) group, rotating across skills and always feeding the sentence
  with the fewest questions so far; pass 2 relaxes the group rule to fill a large
  requested count. A prompt+target pair is never repeated in either pass, which
  is also what `poolSize` counts — so the count control cannot overstate what is
  available.
- **"All" is honest and therefore alarming.** The Declaration lesson's pool is
  745 questions. The model does not second-guess that, but the codec's 60-question
  cap means such an assignment is print-only. Phase 2 should show the pool size
  next to the count control rather than letting "All" surprise anyone.
- **Compression is now the obvious lever, and is still deferred.** A typical
  10-question assignment lands at ~1,530 characters — *dense*, not *easy*. A
  vendored LZ-style compressor plausibly moves most classroom-sized assignments
  into "easy to scan"; nothing else on the table would. Phase 4 should evaluate
  it with these measurements in hand rather than shrinking the schema.

## As built — Phase 2

The builder view (`js/assignment.js`, route `#/assign/<id>`, entry points on the
Library lesson card and in the editor header). What the implementation decided
beyond the work order:

- **The student renderer is a separate export in the same file.**
  `wjt.assignmentRender.sheet(assignment)` builds the worksheet DOM; the builder
  view only places it. That seam exists now rather than in Phase 3 because the
  print worksheet must share this numbering — the alternative was copying it and
  then fixing it twice. It takes the `assignment` half only, so "the preview
  contains no key material" is a property of one small function instead of a
  property of the whole view. Phase 3 can lift it into `js/assignment-render.js`
  or call it where it is; nothing in the view depends on which.
- **Control rows are built once and patched, never re-rendered.** Rebuilding a
  pill row on every change destroys the button the teacher just clicked and drops
  keyboard focus to `<body>`. Each row gets a `sync…()` that toggles `is-on` /
  `aria-pressed` (plus `disabled` and the count badge for skills). Only the sheet
  and the two readouts are rebuilt.
- **"At least one" is enforced on both sentences and skills**, with a toast. The
  model reads an *empty* `sentences`/`skills` list as "all", so an empty
  selection would silently mean the opposite of what the teacher just did. That
  state is simply unreachable in the UI.
- **Deselecting sentences prunes stranded skills.** A skill with nothing left to
  ask about is dropped from the selection (and disabled, showing the model's own
  reason). If pruning would empty the list it falls back to whatever is still
  available — never to `[]`, for the reason above.
- **Title and directions commit on `change`, not `input`.** They affect nothing
  but the sheet header, and `build()` re-pools the lesson — 745 questions on the
  Declaration — so a rebuild per keystroke was not worth it. This also matches
  how the editor's own title/description fields behave.
- **A lesson with no labels and no sentence types gets an empty state**, not an
  empty builder: the header plus "Label a few sentences in the editor and come
  back", with a link to it. Same shape as Practice's.
- **Two readouts beyond the required pool size.** "All" states the number it
  means (the Phase 1 note's point), and *n* selected sentences with no questions
  are counted next to the pool — the Q2 note's payload-weight lever, useful now
  because it also shortens the printed sheet. Neither drops a sentence
  automatically; the passage is reading context and both delivery methods must
  render the same thing.
- **Print color mode is not a control here.** `colorMode` exists in the model but
  every other control in the builder changes what the *student* sees; this one
  changes what the printer does. It belongs with the rest of the print controls
  in Phase 3, where it can be seen working.
- **Word numbers are 1-based on paper.** The wire mark is a 0-based token range;
  `sup.assign-tnum` prints `i + 1`. Nothing in a prompt cites a number yet, so
  this is currently cosmetic — but it is the numbering a "write the word range
  1–3" prompt would have to use.


## As built — Phase 3

The two print surfaces (`wjt.assignmentPrint` in `js/assignment.js`, the print
block at the end of `css/styles.css`, print controls in the builder). What the
implementation decided beyond the work order:

- **One shared body, three renderings.** Phase 2 split
  `wjt.assignmentRender.sheet()` out so the worksheet could share its numbering;
  Phase 3 pushed the split one level deeper into a private `sheetBody()` that the
  preview, the worksheet, **and the answer key** all call. "Preview, worksheet,
  and key are numbered identically" is therefore true by construction rather than
  by care, and `tools/dom-check.html` compares all three prompt lists to keep it
  that way. The key is the same body with an `answers` map passed in, which turns
  each question's ruled lines into its accepted answers — so the **entire** leak
  surface is one argument on one function. Every student-facing caller passes
  `null`.
- **The print document lives in `#print-root`, outside `#app`.** Mounted at print
  time, `display:none` on screen at all times, removed on `afterprint`, and also
  removed by `wjt.onViewCleanup` in case `afterprint` never fires (iOS Safari).
  Nothing rebuilds, so the seed survives and a reprint is the same sheet — the
  work order's actual requirement. A new window would have been the other option
  and is worse under `file://` and popup blockers.
- **No `@page { size }`, on purpose.** Fixing `size: letter` makes an A4 printer
  scale or clip; declaring only `margin: 0.6in` and letting the print dialog pick
  the paper is what makes "Letter first, don't break A4" true. Verified both:
  MediaBox `612 × 792` pt and `595 × 842` pt, same content, nothing clipped.
- **Print recolors by redefining the theme variables on `.print-doc`**, not rule
  by rule. The dark theme's `--muted` (`#9aa3bd`) and `--line` (`#2b3149`) are
  near-invisible on white paper, and the sheet classes are shared with the
  preview, so one block of variable overrides fixes every one of them at once.
  `data-color-mode="grayscale"` is then a two-property rule: the accents go to
  `#000`. Probed computed styles to confirm — text `rgb(0,0,0)`, every background
  `rgba(0,0,0,0)`.
- **The answer key is banner-marked, not per-page-marked, and that is a
  deliberate downgrade.** A repeated print header needs either a `position:fixed`
  running head — which every engine that repeats it also overlaps the body with
  from page 2 — or wrapping the document in a `<table><thead>`. Neither is
  reliable enough to bet a "do not distribute" on, so the key takes the work
  order's stated fallback: an unmissable boxed banner at the top. What *does*
  repeat per page is `document.title`, which the driver sets to
  `"<title> — Answer Key"` while printing (Chrome/Edge and Firefox print it in
  the page header when headers are on, and it names the Save-as-PDF file).
- **Block flow in print, not the preview's flex column.** `break-inside: avoid`
  on a question is what keeps a prompt with its answer space. Measured rather
  than assumed: a stress fixture of 0.6-page-tall questions pages one-per-page
  with the rule and 1.6-per-page without it, so Blink honours it — and it honours
  it on the flex column too. Blocks are kept anyway because flex fragmentation is
  the weaker path in other engines and nothing here needs flex.
- **Ctrl+P on the builder prints the worksheet.** A `beforeprint` listener mounts
  it when nothing is mounted yet. Without this, the most obvious way to reach for
  a printer produces a dark-theme screenshot of the builder. It never replaces a
  document already on its way to print, because both buttons mount before opening
  the dialog.
- **Name/Class/Date are on the worksheet only.** They are ruled lines for a
  student's pen; the key has no use for them, and their absence is one more thing
  that distinguishes the two sheets at a glance.
