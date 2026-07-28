---
status: done   # todo | doing | done | superseded
created: 2026-07-28
updated: 2026-07-28
---

# S5 — the delivery-channel interface (and re-scoping Assignment Phases 4–5)

Seam **S5** of [the platform roadmap](../../docs/roadmap-platform.md#seams-to-land-first),
step 3 of its sequencing. Depends on [008](008-assignment-phase-2-builder.md) and
[009](009-assignment-phase-3-print.md) — print and file have to exist before they
can be generalized into channels.

## Why

The assignment proposal treats a URL and a QR code as **the** digital delivery
method. That was a reasonable choice for an app with no server, but
[P4](../../docs/roadmap-platform.md#decisions) says otherwise:

> **Delivery is a set of channels**, with URL/QR as the first implementation and
> file, print, and account-delivery as peers.

This is already structurally true and only needs to be made explicit.
`wjt.assignment` produces an assignment with **no idea a URL exists** —
`build()` returns a plain student-safe object, and
[js/assignment-codec.js](../../js/assignment-codec.js) is one adapter over it.
Generalizing is a rename plus an interface, not a rewrite. Do it before there are
three copies of the same "can I send this?" reasoning scattered across views.

## Scope

### Task A — the channel shape

A common interface, per the roadmap: `available()`, `deliver()`, and a
size/readiness report. Three implementations:

| Channel | What it is | Notes |
|---|---|---|
| **print** | 009's worksheet + answer key | Always available. No size limit. |
| **file** | download the assignment as JSON | Always available. Reuse `wjt.downloadJson` ([js/store.js:331](../../js/store.js#L331)). |
| **link** | the existing codec, wrapped unchanged | Size-limited; unavailable under `file://`. |

The report is where the codec's existing vocabulary surfaces:
`wjt.assignmentCodec.LIMITS` (payload 7,800 chars; url 8,000; 60 questions) and
`THRESHOLDS` (`easy` ≤ 1,300, `dense` ≤ 1,800 — the QR-capacity bands). Don't
invent a parallel set of numbers; those are measured and commented in the codec.

**Do not modify the codec's encode/decode.** It is smoke-tested, DOM-free,
storage-free, and asserted network-free by a source scan
([tools/smoke-test.js:752-757](../../tools/smoke-test.js#L752-L757)). Wrap it.

### Task B — `available()` is where P3 becomes code

This is the single most load-bearing consequence of confirming
[P3](../../docs/roadmap-platform.md#decisions), so build it deliberately rather than
as a `location.protocol` check buried in a view:

- Under `file://`, the **link** channel reports `available: false` **with a
  reason string the UI displays** — "Sharing a link needs the web version;
  printing works here." Not a disabled button with no explanation, and not a
  silent failure.
- **print** and **file** stay available under `file://`, always. That is the
  promise in
  [What does not change](../../docs/roadmap-platform.md#what-does-not-change): a
  teacher with no login and no network can still build a lesson and print a
  worksheet.

This mirrors the `reason` convention `wjt.assignment.availableSkills()` already
uses — an unavailable thing explains itself in teacher language. Follow it.

### Task C — re-scope the proposal's Phases 4 and 5

**Edit [proposals/assignment-mode-proposal.md](../proposals/assignment-mode-proposal.md#implementation-phases)**,
don't just refer to it. A proposal that still reads as "Phase 4 — Student URL is
the digital delivery" will be executed that way by a session with no other
context. That is exactly the stale-work-order hazard
[plans/README.md](../README.md) warns about.

- Phase 4 (student URL) and Phase 5 (QR) become **implementations behind this
  interface**, not the digital delivery mechanism.
- Add a note that account-delivery is a future peer, gated on
  [P7 and P8](../../docs/roadmap-platform.md#decisions).
- Carry forward the measurement Phase 4 is owed, from the Phase 1 As-built note:
  a typical 10-question assignment lands at **~1,530 characters — *dense*, not
  *easy***. A vendored LZ-style compressor is the only lever on the table that
  moves most classroom-sized assignments into the easy band; shrinking the schema
  will not. Evaluate it with those measurements in hand.

### Task D — the sharing-a-lesson question

The roadmap raises a check worth running while you are in this code:

> Sharing a *lesson* teacher-to-teacher may not need a backend at all: the
> assignment codec already proves the pattern — compact payload, base64url, URL
> fragment, no server.

Lessons are much larger than assignments, so compression stops being optional.
This is **out of scope to build here**, but if the channel interface makes a
lesson-link channel obviously cheap, say so in the notes below. It is a real
check on whether accounts are needed for *sharing* or only for *durability* —
and that distinction changes what P7 has to buy.

## Out of scope

- **Account delivery.** It slots in after P7/P8; the interface only has to not
  preclude it.
- Building Phase 4 or Phase 5 themselves. This work order creates the seam and
  re-scopes the plan; the URL view and the QR encoder are their own orders.
- Compression. Deferred, with the measurement recorded so the decision has
  numbers.
- Changing the wire format. `KIND_CODES` order **is** the wire encoding —
  reordering it silently breaks every link already in the wild.

## Done when

- Print, file, and link all satisfy one interface, and the builder from 008 asks
  the channel rather than sniffing the protocol itself.
- Under `file://` the builder shows print and file enabled, link disabled with a
  visible reason. Verify by double-clicking `index.html`, not by reasoning about
  it.
- The codec's privacy and round-trip invariants in `tools/smoke-test.js` pass
  **unchanged** — including the source scan asserting the assignment modules are
  DOM-, storage-, and network-free.
- The proposal's Implementation phases section reflects the re-scoping.
- `node tools/smoke-test.js` and `tools/dom-check.html` both report 0 failed.

## As built

Shipped 2026-07-28. All four tasks landed; six things are worth recording.

- **The interface has two availability words, not one, and that was the real
  design decision.** Task A asked for `available()`, `deliver()`, and "a
  size/readiness report". Those collapse badly into one boolean, so they are kept
  apart on purpose:

  ```js
  channel.available(env)         // -> { available, reason }  can it be used HERE?
  channel.report(built, env)     // -> { ready, state, length, detail }  how big?
  channel.deliver(built, opts)   // -> { ok: true, … } | { ok: false, error }
  ```

  `available` is about the *environment* (P3), `ready` is about *this
  assignment* (size). A link under `file://` and a link that is 9,000 characters
  long are different facts, they need different sentences on screen, and only one
  of them changes when the teacher deselects a sentence. An unavailable channel is
  never measured, which is also why `file://` does no encoding work at all.

- **`status: "ready" | "planned"` — the honest answer to "what does the Link
  button do?"** Phase 4 (the student route) is explicitly out of scope here, so a
  link channel that was simply *available* under `https:` would have shipped a
  button producing a URL that opens nothing. Instead the channel carries a
  `status` and an `actions` list; `link` is `"planned"` with no actions, so the
  builder renders its size and its reason and no button. Verified in a real
  browser over `http://`: the row reads *"1,444-character link — it works, but the
  QR code is dense…"* above *"Not built yet — the student page a link opens is
  still to come (proposal Phase 4)."* That is the field Phase 4 flips; **no view
  code changes when it does**, which is the property the Notes below asked to
  protect.

- **The builder grew a Delivery section — a user-visible change, and the required
  one.** "Done when" asks that `file://` show print and file enabled with link
  disabled *and a visible reason*, which cannot be done invisibly. The two print
  buttons are now the `print` channel's two actions (`[data-act="deliver"]
  [data-channel][data-variant]`), so every existing `P-*` print check now runs
  through `deliver()` as a side effect. `js/assignment.js` gained a third rule at
  the top of the file to match the two it already had: **it decides nothing about
  delivery** — no `location.protocol`, no payload measurement, no refusal wording
  of its own.

- **The file channel drops the `seed`, and that is the one place its payload
  differs from the runtime assignment.** The seed is a teacher's regenerate
  handle, and the codec already leaves it off the wire; a delivered file should
  not carry more than a delivered link. Routing the file *through* the codec was
  considered and rejected: `fromWire()` enforces the 40-sentence / 60-question URL
  caps, and inheriting those would have broken this work order's own "file: always
  available, no size limit". So the whitelist is the runtime assignment minus the
  seed, and the no-answers property is asserted directly on it — in the smoke test
  and again in the DOM check, where the real button's download is intercepted.

- **`assignment-channels.js` is in the logic layer, which took a deliberate shape
  choice.** It delegates every actual delivery to `wjt.assignmentPrint` and
  `wjt.downloadJson`, so the only browser global it touches is `window.location` —
  and only inside `available()`. That earned it a place in `LOGIC_FILES` *and* in
  the DOM/storage/network source scan, which now covers three `assignment-*`
  modules instead of two. The two existing scan checks pass unchanged, as the
  acceptance bar required; a third was added rather than either weakened.
  `deliver()` never throws, matching the codec's rule — in the bare `vm` sandbox
  print and file return `{ ok: false, error }` because there is no DOM, and that
  is the same contract as a browser refusing a Blob or a print dialog.

- **Two stale references in this work order, for the record.** `wjt.downloadJson`
  is at [js/store.js:538](../../js/store.js#L538), not `:331`, and the source scan
  is near the end of [tools/smoke-test.js](../../tools/smoke-test.js), not at
  `:752`. Both were wrong when written; the reuse and the wrap-don't-modify
  instruction were right, which is what mattered.

### Task D answered — is a lesson link cheap?

Measured while in this code, since the roadmap asked for a check rather than a
build. A minified lesson export, base64url'd, against the codec's
**7,800-character payload ceiling**:

| Lesson | export | minified | base64url | × ceiling |
|---|---:|---:|---:|---:|
| `dracula-count-appears` | 8,571 | 4,334 | 5,779 | **0.7×** |
| `fox` | 9,401 | 4,998 | 6,664 | **0.9×** |
| `great-gatsby-closing` | 10,192 | 5,243 | 6,991 | **0.9×** |
| `kinds-of-sentences` | 12,010 | 6,071 | 8,095 | 1.0× |
| `frankenstein-creation` | 11,305 | 5,708 | 7,611 | **1.0×** |
| `parts-of-speech-close-up` | 16,134 | 8,407 | 11,210 | 1.4× |
| `romeo-juliet-prologue` | 16,690 | 8,415 | 11,220 | 1.4× |
| `declaration-of-independence-full` | 33,612 | 18,165 | 24,220 | 3.1× |
| `declaration-of-independence` | 56,003 | 27,386 | 36,515 | 4.7× |

So: **a lesson-link channel is plausible, and cheaper than expected.** Five of the
nine shipped examples already fit *uncompressed*, and an LZ-style compressor
closes the gap for the rest. Three findings worth carrying:

1. **QR is off the table for lessons at any size.** The smallest lesson is 5,779
   characters against an 1,800-character *dense* band. A lesson link is a link you
   paste, not a code you project — which is fine, because the recipient is a
   colleague at a keyboard, not a class holding phones.
2. **The channel *shape* transfers; the *work* is a codec.** `available()` /
   `report()` / `deliver()` fit a lesson channel unchanged, and `report()` is
   exactly where the size verdict belongs. But this interface is typed to an
   assignment (`built.assignment`), and a lesson needs its own wire whitelist plus
   validation — with a *different* safety argument, because a lesson is teacher IP
   rather than a student-safe-vs-not question. Not a rename of this file; a sibling
   of `assignment-codec.js`.
3. **Therefore P7 has to buy durability, not sharing.** That was the real question
   behind Task D, and the numbers answer it: "send a colleague a link to this
   lesson" is reachable before P7 resolves, so an account cannot be justified by
   sharing alone. Recorded in
   [roadmap-platform.md](../../docs/roadmap-platform.md#seams-to-land-first).

### Verification

- `node tools/smoke-test.js` — green, **23 new channel checks**, and `samples/`
  regenerated byte-identically (`git status` shows no sample touched).
- `tools/dom-check.html` — **339 passed / 0 failed at all four matrix sizes**
  (328 before; 11 new `D-*` checks). The DOM check is itself loaded over
  `file:///`, so `D-1`–`D-5` measure the P3 promise *in the environment it is
  about*: print and file enabled with working buttons, link disabled with the
  channel's own reason string, no size readout on an unavailable channel, and the
  File button's payload carrying no answer-key material.
- **The real app, from a real `file://` origin** — not the harness, and not
  reasoning. `index.html` booted headlessly from `file:///C:/dev/sentences/`,
  first-run seeding, then `#/assign/<id>`: `print` and `file` rows both
  `data-state="ready"` with enabled buttons, `link` row `data-state="unavailable"`
  with *"Sharing a link needs the web version; printing works here."* visible and
  no button at all. The `http://` counterpart was checked too, through a throwaway
  local static server (a dev tool, not repo code): the same row flips to
  `data-state="planned"` with the 1,444-character size report.
- `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`,
  `node tools/gen-docs.js --check`, `node tools/link-check.js --check`, and
  `node tools/cvd-check.js --check` all pass.

## Notes

- **[SECURITY.md](../../SECURITY.md) is owed a rewrite** — "no network, ever" stops
  being true once the teacher path reaches a server. It is **not** owed by this
  work order: nothing here adds a network call, and the roadmap's rule is *do not
  weaken a security document ahead of the thing it describes.* Whichever work
  order first adds a real network path inherits it. Recorded here so it isn't
  lost.
- Once this lands, "which channels can this assignment go out through?" has
  exactly one answer, in one place. That is the property worth protecting when
  account-delivery is added later.
