# Sentence Forge — the platform decision

**Status:** Direction set, no code committed to it yet · **Date:** 2026-07-28

Sentence Forge has been built as a *portable single-purpose app*: no build step,
no server, no network, runs from a double-clicked `index.html`. This document
records the decision to treat it instead as a **grammar teaching platform** — a
place a teacher builds, keeps, and sequences the material they teach from — and
what that does and does not change.

- [What forced the decision](#what-forced-the-decision)
- [What this supersedes](#what-this-supersedes)
- [Decisions](#decisions)
- [Seams to land first](#seams-to-land-first)
- [What does not change](#what-does-not-change)
- [Risks accepted](#risks-accepted)
- [Sequencing](#sequencing)

---

## What forced the decision

Not the file count. The app is 13 files that must travel together, which makes it
awkward to *distribute*, but it genuinely still runs from `file://` and always
did. That was a mild problem with a solved workaround (GitHub Pages).

The real pressure was already written down, in
[pilot.md](product/pilot.md) question 5:

> localStorage on shared, re-imaged, or roaming-profile machines is the biggest
> technical risk in the product. If lessons vanish overnight on a cart of
> Chromebooks, export/import is not a sufficient sharing story.

A tool for *building lesson plans* means a teacher's library has to survive a
re-image, follow them from home to school, and be handed to the teacher next
door. `localStorage` plus a JSON export is single-user, single-browser,
single-machine. **Portability of the app was never the hard problem;
portability of the work is.**

The second pressure came out of Assignment mode: the proposal treats a URL and a
QR code as *the* digital delivery method. That is one channel, chosen because it
needed no server. With a platform, delivery becomes a set of channels — file,
print, link, and eventually "assigned from my library" — and no single one should
be load-bearing.

## What this supersedes

[roadmap-0.1.0.md §4](roadmap-0.1.0.md#4-explicitly-out-of-scope-for-010) parked
this deliberately:

> **A server / backend** (shared libraries, identity, saved results) → the
> **1.0.0** path. This is where "no network, ever" gets revisited, and it's
> driven by real demand, not a hunch.

That line is now overtaken. It should be read as: *identity and a durable
library move onto the near path, ahead of demonstrated classroom demand, as a
deliberate product call.* The honesty in the original line still stands — the
pilot has not run, so this is direction ahead of evidence. See
[Risks accepted](#risks-accepted); the sequencing is built around that.

Nothing here changes `0.1.0`. That milestone stays what it is and ships on its
existing gate.

## Decisions

Numbered `P` so they don't collide with `Q1–Q5` in
[roadmap-0.1.0.md](roadmap-0.1.0.md#3-open-questions).

| # | Question | Decision | Rationale |
|---|---|---|---|
| P1 | Is this a portable app or a teaching platform? | **A platform.** A place to build, keep, and sequence teaching material — not a single-file utility. | The engine (taxonomy, annotation model, renderer, Edit/Present/Practice) is already a teaching tool. What is missing is everything *above* the lesson: durability, sequencing, and sharing. |
| P2 | Who gets an account? | **Teachers only.** Students stay anonymous. | Teachers are adults: teacher accounts buy a durable library, cross-machine sync, and colleague sharing at almost no compliance cost. Student accounts mean holding minors' PII — COPPA consent, a district DPA, retention and deletion policy, breach obligations — for value the anonymous channels already deliver. This also preserves "Sentence Forge never collects a student answer," which is currently a *tested invariant*, not a promise. |
| P3 | Does `file://` survive? | **Demoted from hard constraint to a supported degraded mode.** Authoring, the local library, and printing keep working from a double-clicked `index.html`. Accounts, sync, and link sharing require HTTP(S) and say so. | The constraint has been load-bearing for five other constraints (no ES modules, no `fetch()` of local data, hash routing, examples-as-JS, no build step). Keeping it as a *veto* would block the platform; dropping it entirely would break the USB-stick story for no gain. Degraded mode keeps both. **Confirm this one** — it is the decision with the widest blast radius. |
| P4 | Is URL delivery the digital channel? | **No. Delivery is a set of channels**, with URL/QR as the first implementation and file, print, and account-delivery as peers. | Already structurally true: `wjt.assignment` produces an assignment with no idea a URL exists, and `wjt.assignmentCodec` is one adapter. Generalizing is a rename, not a rewrite. |
| P5 | Does the `0.2.0` student-as-creator pivot need student accounts? | **No.** Students build and tag locally and hand work back through the anonymous channels. | Resolves half the fork parked in [roadmap-0.1.0.md §4](roadmap-0.1.0.md#4-explicitly-out-of-scope-for-010). Follows directly from P2 and keeps that milestone free of a compliance dependency. |
| P6 | Do we adopt a build step / ES modules now that `file://` is demoted? | **Deferred. Not part of this pivot.** | Nothing in P1–P5 requires either. Spending the pivot on tooling is how a direction change turns into a rewrite. Revisit only against a concrete need. |
| P7 | Where does teacher data actually live? | **Deferred — but the seam lands now.** A storage adapter behind `store.js` (see [S1](#seams-to-land-first)) makes the choice reversible. | The real fork is managed backend vs. self-host vs. bring-your-own-cloud, and it should be decided against hosting cost, uptime expectations, and school procurement — none of which are answerable today. What is *not* deferrable is stopping `localStorage` from being welded into the model. |
| P8 | Auth mechanism? | **Leaning school SSO (Google Sign-In).** Not committed. | It is what teachers in schools already have, it removes password reset and lockout support burden entirely, and it aligns with the districts most likely to adopt. Decide with P7. |

## Seams to land first

The expensive part of accounts is not auth — it is the seams that are brutal to
retrofit once teachers have real work stored. All five are **cheap now,
reversible, and worth doing regardless of how P7 and P8 resolve.** None is
user-visible.

- [ ] **S1 — A storage adapter behind [store.js](../js/store.js).** Today it
      hardcodes `localStorage` with whole-list `readAll()`/`writeAll()`. Extract a
      `list/get/save/remove` interface with localStorage as implementation #1.
      Highest value, lowest cost; do it first. The corrupt-library salvage
      behavior (audit P1-2) must survive the extraction.
- [ ] **S2 — Real ids.** [`wjt.uid()`](../js/tokenize.js#L69) is `Date.now()`
      plus six characters of `Math.random()`. Fine in one browser, collision-prone
      the moment two libraries merge. Move to `crypto.randomUUID()` with a
      `crypto.getRandomValues` fallback — note `randomUUID` needs a secure context
      and may be absent under `file://`, so the fallback is load-bearing, not
      decorative. Do this **before** lessons cross machines. It is the same lesson
      as the never-rename-a-label-id rule in [CLAUDE.md](../CLAUDE.md).
- [ ] **S3 — `ownerId` on the lesson.** Nullable while there is exactly one local
      owner. Additive to the format, so it costs nothing today.
- [ ] **S4 — A migration runner.** `version: 1` exists with nothing that acts on
      it. Once two clients sync at different versions you need one, and writing it
      retroactively means guessing what old data looked like.
- [ ] **S5 — The delivery-channel interface.** Generalize the assignment codec
      from "the URL encoder" to one channel behind a common shape (`available()`,
      `deliver()`, a size/readiness report). Print, file, and link are the first
      three; account-delivery slots in later.

Sharing a *lesson* teacher-to-teacher may not need a backend at all: the
assignment codec already proves the pattern — compact payload, base64url, URL
fragment, no server. Lessons are larger, so compression stops being optional, but
"send a colleague a link to this lesson" is achievable before P7 resolves and is
worth prototyping as a check on whether accounts are needed for sharing or only
for durability.

## What does not change

Pin these; a platform pivot is exactly when they erode quietly.

- **No student answers, names, scores, or activity — ever.** Assignment mode's
  privacy invariants stay tested in `tools/smoke-test.js`, not asserted in prose.
- **No analytics, telemetry, or third-party tracking.**
- **Print and file delivery never require an account.** A teacher with no login
  and no network can still build a lesson and print a worksheet.
- **The taxonomy and the lesson format stay additive.** `ownerId` is a new
  optional field, not a format break.
- **[SECURITY.md](../SECURITY.md) is owed a rewrite** — "no network, ever" stops
  being true for the teacher path — but only when the code changes, not before.
  Do not weaken a security document ahead of the thing it describes.

## Risks accepted

| Risk | Mitigation |
|---|---|
| Direction ahead of evidence — the pilot has not run a single class period. | Seams first (S1–S5), all invisible and reversible. Auth last. If the pilot says the Edit → Present → Practice loop doesn't survive, nothing here is wasted and nothing is committed. |
| Accounts create a permanent support burden (reset, lockout, "I can't get in" mid-period). | SSO-only (P8) removes most of it. No password path means no password support. |
| A backend means hosting cost and an uptime expectation from teachers mid-semester. | P7 deferred precisely so this is decided with numbers. Degraded mode (P3) means an outage costs sync, not the class period. |
| "No network, ever" is a real differentiator being spent. | Spend it only on the teacher path. The student path stays anonymous and offline-capable, which is where the claim actually matters to a district. |
| The pivot turns into a rewrite. | P6. No build step, no module system, no framework as part of this. |

## Sequencing

1. **Finish Assignment mode Phases 2–3** (builder, print worksheet, answer key).
   Print needs no network and is valuable in every scenario this document
   describes. Phase 1 is already delivery-agnostic.
2. **Land S1–S4.** No user-visible change; unblocks everything else.
3. **Re-scope Assignment Phases 4–5** as one channel behind S5 rather than *the*
   digital delivery.
4. **Run the pilot.** The questions in [pilot.md](product/pilot.md) are worth more
   after step 1 than before it, and Q5 is now the one that pays for this document.
5. **Decide P7 and P8**, then build teacher auth and sync.

Do not reorder 4 ahead of 2 — the seams are cheap now and expensive after real
lessons exist. Do not reorder 5 ahead of 4 without a deliberate note here saying
why.
