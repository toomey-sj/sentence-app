/* Relative-link check for Sentence Forge's markdown.
 *
 * Every `[text](path)` in a .md file that points at a repo file — not a URL —
 * must resolve. This exists because moving a finished work order into
 * plans/done/ (which plans/README.md tells you to do) silently breaks every
 * `../` link inside it, and nothing noticed: 130 dead links accumulated across
 * plans/done/001-004 before anyone looked.
 *
 *   node tools/link-check.js          report: every broken link, grouped by file,
 *                                     with a suggested re-basing where one exists.
 *   node tools/link-check.js --check  CI gate: exits non-zero if any link is broken.
 *
 * What it deliberately does NOT check: http(s) URLs (that would need the network,
 * which this repo doesn't do), anchor fragments (`#heading` targets aren't
 * resolvable without parsing every heading), and `mailto:`.
 *
 * Code is stripped before scanning — fenced blocks and inline spans both. A
 * doc that shows the link *syntax* as an example (this file's own entry in
 * CLAUDE.md does) is not making a claim about a file that exists.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const SKIP_DIRS = new Set([".git", "node_modules"]);
const posix = (p) => p.split(path.sep).join("/");

/* A link's target as written, minus any #fragment. Fragments are dropped rather
 * than resolved: the file has to exist either way, and heading anchors would
 * need a markdown parser to verify. */
const LINK = /\]\(([^)\s]+?)(#[^)]*)?\)/g;

function isExternal(link) {
  return /^(https?:|data:|mailto:|#)/.test(link);
}

/* Blank out code so an example of the link syntax isn't read as a link. Fenced
 * blocks first (``` or ~~~, any info string), then inline `spans`. Newlines are
 * preserved so nothing shifts. */
function stripCode(text) {
  const blank = (s) => s.replace(/[^\n]/g, " ");
  return text
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blank)
    .replace(/`[^`\n]*`/g, blank);
}

/* Candidate re-basings, in the order a human would try them. Only used to
 * suggest a fix in the report — the check itself never rewrites anything. */
function suggest(dir, link) {
  const tries = ["../" + link, "../../" + link];
  if (link.startsWith("done/")) tries.push(link.slice(5));
  else {
    const d = path.posix.dirname(link);
    const base = path.posix.basename(link);
    tries.push(d === "." ? "done/" + base : d + "/done/" + base);
  }
  for (const t of tries) {
    if (fs.existsSync(path.resolve(dir, decodeURIComponent(t)))) return t;
  }
  return null;
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, out);
    } else if (name.endsWith(".md")) {
      out.push(p);
    }
  }
  return out;
}

function scan() {
  const results = [];
  for (const file of walk(root, [])) {
    const text = stripCode(fs.readFileSync(file, "utf8"));
    const dir = path.dirname(file);
    const broken = new Map();
    let m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(text))) {
      const link = m[1];
      if (isExternal(link)) continue;
      if (fs.existsSync(path.resolve(dir, decodeURIComponent(link)))) continue;
      broken.set(link, (broken.get(link) || 0) + 1);
    }
    if (broken.size) {
      results.push({
        file: posix(path.relative(root, file)),
        dir: dir,
        broken: broken,
      });
    }
  }
  return results;
}

function print(results) {
  let total = 0;
  for (const r of results) {
    let n = 0;
    for (const count of r.broken.values()) n += count;
    total += n;
    console.log("\n" + r.file + "  (" + n + " broken)");
    for (const [link, count] of r.broken) {
      const fix = suggest(r.dir, link);
      console.log("  " + link + (count > 1 ? "  x" + count : "") +
        (fix ? "\n      → try: " + fix : "\n      → no obvious target; the file may be gone"));
    }
  }
  return total;
}

const results = scan();
const isCheck = process.argv.indexOf("--check") !== -1;

if (!results.length) {
  console.log("link-check: OK — every relative markdown link resolves.");
  process.exit(0);
}

const total = print(results);
console.log("\n" + total + " broken link(s) in " + results.length + " file(s).");
if (isCheck) {
  console.error("link-check: FAILED. Re-base the links above (a moved file is the " +
    "usual cause) and re-run.");
  process.exit(1);
}
