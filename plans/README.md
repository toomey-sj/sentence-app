# Plans — work orders

A drop box for **work orders**: self-contained task descriptions committed to the
repo so any device (or any Claude Code session) can pull them and pick up the
work. No server, no external tracker — the git history *is* the queue.

## Why this exists

Sentence Forge is edited from more than one machine. A work order lets you write
down "here's the next thing to do, and everything needed to do it" on one device,
push it, and continue on another — or hand it straight to Claude Code with
"do `plans/012-…`".

## How to use it

1. Copy [TEMPLATE.md](TEMPLATE.md) to a new file named `NNN-short-slug.md`
   (`NNN` = the next number, zero-padded — `012-widen-quiz-cards.md`).
2. Fill it in. Be concrete about scope and "done" — the point is that someone
   with no other context can act on it.
3. Commit and push.
4. On the other device: `git pull`, open the file, do the work.
5. When it's finished, move the file to [done/](done/) in the same commit as the
   work (`git mv plans/012-….md plans/done/`). The open set is whatever is left
   directly under `plans/`.

## Conventions

- **One file per work order.** Keep them small; split a big effort into several.
- **`status:` frontmatter** — `todo` → `doing` → `done`. Set `doing` when you
  start so a second device doesn't double-pick it.
- **Not a substitute for the roadmap.** Design decisions and taxonomy rationale
  still live in [docs/roadmap.md](../docs/roadmap.md); a work order is the
  short-lived "go do this" note, not the durable record.
- During the pilot, respect the freeze in [CLAUDE.md](../CLAUDE.md): a work order
  that changes the taxonomy or lesson format needs a real, blocking reason.
