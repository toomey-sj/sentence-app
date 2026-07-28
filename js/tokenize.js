/* Sentence Forge — text utilities: sentence splitting and tokenization.
 * Annotations are stored as character offsets into a sentence's text;
 * tokens carry their offsets so the two can be mapped in both directions.
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};

  /**
   * Split a paragraph into sentence strings. Splits on ., !, ?, …
   * (keeping closing quotes/brackets with the sentence) and on newlines.
   * Naive on abbreviations — the editor lets teachers merge sentences.
   */
  wjt.splitSentences = function (paragraph) {
    var out = [];
    String(paragraph).split(/\n+/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var matches = line.match(/[^.!?…]+[.!?…]+["'”’)\]]*|[^.!?…]+$/g);
      (matches || [line]).forEach(function (s) {
        s = s.trim();
        if (s) out.push(s);
      });
    });
    return out;
  };

  /**
   * Tokenize a sentence into whitespace-separated tokens.
   * Each token: { text, start, end, i } with end exclusive.
   */
  wjt.tokenize = function (text) {
    var tokens = [];
    var re = /\S+/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length, i: tokens.length });
    }
    return tokens;
  };

  /**
   * Map a char-offset span to a token index range [first, last] (inclusive),
   * snapping outward to whole tokens. Returns null if it covers no token.
   */
  wjt.spanToTokens = function (tokens, start, end) {
    var first = -1;
    var last = -1;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.end > start && t.start < end) {
        if (first === -1) first = i;
        last = i;
      }
    }
    return first === -1 ? null : { first: first, last: last };
  };

  /** Char offsets covering tokens [first..last]. */
  wjt.tokensToSpan = function (tokens, first, last) {
    return { start: tokens[first].start, end: tokens[last].end };
  };

  /** Sentence text sliced for an annotation. */
  wjt.spanText = function (text, ann) {
    return text.slice(ann.start, ann.end);
  };

  /**
   * A fresh opaque id (seam S2). Three tiers, best first:
   *
   *   1. `crypto.randomUUID()`      — one call, 122 random bits.
   *   2. `crypto.getRandomValues()` — same entropy, formatted as a v4 UUID here.
   *   3. `Date.now()` + 6 chars of `Math.random()` — the original scheme.
   *
   * Tier 3 stays because ids are about to start crossing machines (a lesson
   * handed to the teacher next door, a library synced home-to-school), and a
   * collision there merges two teachers' annotations irreversibly. Tier 1 alone
   * would not do:
   *
   *   - `randomUUID()` requires a **secure context**, and `file://` is not
   *     reliably one. Double-clicking `index.html` on a school machine is a
   *     supported degraded mode (roadmap-platform P3), so a teacher there must
   *     still be able to create a lesson. `crypto` support under `file://`
   *     varies by browser, so tier 2 isn't guaranteed either.
   *   - `tools/smoke-test.js` runs this file in a bare `vm` sandbox. It now
   *     passes `crypto` through so tier 1 is exercised, and it also removes
   *     `crypto` (and `randomUUID` alone) to exercise tiers 3 and 2. A fallback
   *     nobody tests is a fallback that doesn't work.
   *
   * This is NOT the never-rename-a-label-id rule (CLAUDE.md #6). Label ids in
   * `js/labels.js` are stored inside every teacher's annotations, so renaming
   * one destroys work. These ids are volatile: `wjt.exportLesson()` drops
   * annotation ids entirely and `wjt.importLesson()` mints fresh ones on the way
   * back in. Changing the format of newly minted ids breaks nothing, and ids
   * minted by any earlier version stay valid forever, because nothing anywhere
   * parses one — every call site only ever compares an id to its siblings.
   */
  wjt.uid = function () {
    var c = window.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
    if (c && typeof c.getRandomValues === "function" && typeof Uint8Array === "function") {
      var b = new Uint8Array(16);
      c.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40;   // version 4
      b[8] = (b[8] & 0x3f) | 0x80;   // variant 1 (RFC 4122)
      var out = "";
      for (var i = 0; i < 16; i++) {
        out += (b[i] + 0x100).toString(16).slice(1);
        if (i === 3 || i === 5 || i === 7 || i === 9) out += "-";
      }
      return out;
    }
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  wjt.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
})();
