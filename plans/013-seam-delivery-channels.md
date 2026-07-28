---
status: todo   # todo | doing | done | superseded
created: 2026-07-28
---

# S5 — the delivery-channel interface (and re-scoping Assignment Phases 4–5)

Seam **S5** of [the platform roadmap](../docs/roadmap-platform.md#seams-to-land-first),
step 3 of its sequencing. Depends on [008](done/008-assignment-phase-2-builder.md) and
[009](done/009-assignment-phase-3-print.md) — print and file have to exist before they
can be generalized into channels.

## Why

The assignment proposal treats a URL and a QR code as **the** digital delivery
method. That was a reasonable choice for an app with no server, but
[P4](../docs/roadmap-platform.md#decisions) says otherwise:

> **Delivery is a set of channels**, with URL/QR as the first implementation and
> file, print, and account-delivery as peers.

This is already structurally true and only needs to be made explicit.
`wjt.assignment` produces an assignment with **no idea a URL exists** —
`build()` returns a plain student-safe object, and
[js/assignment-codec.js](../js/assignment-codec.js) is one adapter over it.
Generalizing is a rename plus an interface, not a rewrite. Do it before there are
three copies of the same "can I send this?" reasoning scattered across views.

## Scope

### Task A — the channel shape

A common interface, per the roadmap: `available()`, `deliver()`, and a
size/readiness report. Three implementations:

| Channel | What it is | Notes |
|---|---|---|
| **print** | 009's worksheet + answer key | Always available. No size limit. |
| **file** | download the assignment as JSON | Always available. Reuse `wjt.downloadJson` ([js/store.js:331](../js/store.js#L331)). |
| **link** | the existing codec, wrapped unchanged | Size-limited; unavailable under `file://`. |

The report is where the codec's existing vocabulary surfaces:
`wjt.assignmentCodec.LIMITS` (payload 7,800 chars; url 8,000; 60 questions) and
`THRESHOLDS` (`easy` ≤ 1,300, `dense` ≤ 1,800 — the QR-capacity bands). Don't
invent a parallel set of numbers; those are measured and commented in the codec.

**Do not modify the codec's encode/decode.** It is smoke-tested, DOM-free,
storage-free, and asserted network-free by a source scan
([tools/smoke-test.js:752-757](../tools/smoke-test.js#L752-L757)). Wrap it.

### Task B — `available()` is where P3 becomes code

This is the single most load-bearing consequence of confirming
[P3](../docs/roadmap-platform.md#decisions), so build it deliberately rather than
as a `location.protocol` check buried in a view:

- Under `file://`, the **link** channel reports `available: false` **with a
  reason string the UI displays** — "Sharing a link needs the web version;
  printing works here." Not a disabled button with no explanation, and not a
  silent failure.
- **print** and **file** stay available under `file://`, always. That is the
  promise in
  [What does not change](../docs/roadmap-platform.md#what-does-not-change): a
  teacher with no login and no network can still build a lesson and print a
  worksheet.

This mirrors the `reason` convention `wjt.assignment.availableSkills()` already
uses — an unavailable thing explains itself in teacher language. Follow it.

### Task C — re-scope the proposal's Phases 4 and 5

**Edit [proposals/assignment-mode-proposal.md](proposals/assignment-mode-proposal.md#implementation-phases)**,
don't just refer to it. A proposal that still reads as "Phase 4 — Student URL is
the digital delivery" will be executed that way by a session with no other
context. That is exactly the stale-work-order hazard
[plans/README.md](README.md) warns about.

- Phase 4 (student URL) and Phase 5 (QR) become **implementations behind this
  interface**, not the digital delivery mechanism.
- Add a note that account-delivery is a future peer, gated on
  [P7 and P8](../docs/roadmap-platform.md#decisions).
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

## Notes

- **[SECURITY.md](../SECURITY.md) is owed a rewrite** — "no network, ever" stops
  being true once the teacher path reaches a server. It is **not** owed by this
  work order: nothing here adds a network call, and the roadmap's rule is *do not
  weaken a security document ahead of the thing it describes.* Whichever work
  order first adds a real network path inherits it. Recorded here so it isn't
  lost.
- Once this lands, "which channels can this assignment go out through?" has
  exactly one answer, in one place. That is the property worth protecting when
  account-delivery is added later.
