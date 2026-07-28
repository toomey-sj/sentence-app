/* Sentence Forge — Assignment mode, the wire codec.
 *
 * One boundary, two schemas. `wjt.assignment` produces a *runtime* assignment
 * with readable field names; this file compacts it into the short-keyed **wire**
 * form that rides in a URL fragment, and back. View code never sees the
 * abbreviated names, and nothing but the whitelist below ever reaches a URL —
 * which is what makes "the student URL contains no answers" testable rather
 * than a code-review opinion.
 *
 * Nothing here throws. `encode` and `decode` return { ok: true, … } or
 * { ok: false, error: "reader-facing message" }, so a hostile fragment can't
 * throw up through the router.
 *
 * The base64url and UTF-8 conversions are hand-rolled on purpose: `btoa`/
 * `atob` mangle non-ASCII, `TextEncoder` isn't in the smoke test's bare vm
 * sandbox, and a dependency is not an option. DOM-free and storage-free.
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};

  var FORMAT = "sfa";            // compact wire tag ("sentence-forge-assignment")
  var VERSION = 1;
  var ROUTE = "#/assignment/";

  /* Wire question kinds — the index IS the wire code, so never reorder. */
  var KIND_CODES = ["identify", "find", "classify", "list"];
  var GROUPING_CODES = ["passage-first", "per-sentence"];
  var SPACING_CODES = ["compact", "standard", "generous"];

  /* Enforced before anything renders. Generous enough for a real double-page
   * worksheet, tight enough that a hostile fragment can't ask the renderer to
   * build a million nodes. */
  var LIMITS = {
    payload: 7800,        // encoded base64url characters — stays under `url`
    url: 8000,            // whole share URL, the supported ceiling
    sentences: 40,
    questions: 60,
    title: 120,
    directions: 600,
    sentenceChars: 600,   // the longest sentence in the shipped examples is 406
    promptChars: 240,
    bank: 40,
    bankChars: 60,
    expected: 50,
  };

  /* Share-URL lengths, in characters, mapped to how comfortably a QR code
   * carries them. base64url is mixed-case, so a QR encoder must use byte mode:
   * capacity at error-correction level L is 1,273 bytes at version 25 and
   * 1,732 at version 30. Past version 30 the module pitch gets unreliable off a
   * projector or a photocopied handout, so that is where the offer stops.
   * Measured payloads for the shipped examples are in tools/smoke-test.js
   * output; Phase 5 confirms these against real scans. */
  var THRESHOLDS = { easy: 1300, dense: 1800 };

  /* ------------------------------------------------------------------ *
   * UTF-8 <-> byte array
   * ------------------------------------------------------------------ */
  function utf8Bytes(str) {
    var out = [], i, c, c2;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) { out.push(c); continue; }
      if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 63)); continue; }
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
        c2 = str.charCodeAt(i + 1);
        if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
          var cp = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
          out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63),
            0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
          i++;
          continue;
        }
      }
      // A lone surrogate can't be encoded; substitute U+FFFD so the payload is
      // always well-formed UTF-8 rather than silently unparseable.
      if (c >= 0xD800 && c <= 0xDFFF) c = 0xFFFD;
      out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  /** Strict decoder: null on any malformed, overlong, or surrogate sequence. */
  function utf8String(bytes) {
    var out = "", i = 0, n = bytes.length;
    while (i < n) {
      var b = bytes[i++], cp, need, min;
      if (b < 0x80) { out += String.fromCharCode(b); continue; }
      if (b >= 0xC2 && b <= 0xDF) { cp = b & 31; need = 1; min = 0x80; }
      else if (b >= 0xE0 && b <= 0xEF) { cp = b & 15; need = 2; min = 0x800; }
      else if (b >= 0xF0 && b <= 0xF4) { cp = b & 7; need = 3; min = 0x10000; }
      else return null;
      if (i + need > n) return null;
      for (var k = 0; k < need; k++) {
        var cont = bytes[i++];
        if ((cont & 0xC0) !== 0x80) return null;
        cp = (cp << 6) | (cont & 63);
      }
      if (cp < min || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) return null;
      if (cp > 0xFFFF) {
        cp -= 0x10000;
        out += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 1023));
      } else {
        out += String.fromCharCode(cp);
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * base64url, unpadded — the only alphabet that survives a URL fragment
   * untouched by every browser, mail client, and QR scanner in the matrix.
   * ------------------------------------------------------------------ */
  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  function toB64url(bytes) {
    var out = "", i = 0, n;
    for (; i + 2 < bytes.length; i += 3) {
      n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63) +
        B64.charAt((n >> 6) & 63) + B64.charAt(n & 63);
    }
    var rest = bytes.length - i;
    if (rest === 1) {
      n = bytes[i] << 16;
      out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63);
    } else if (rest === 2) {
      n = (bytes[i] << 16) | (bytes[i + 1] << 8);
      out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63) + B64.charAt((n >> 6) & 63);
    }
    return out;
  }

  function fromB64url(str) {
    var vals = [], i, v;
    for (i = 0; i < str.length; i++) {
      v = B64.indexOf(str.charAt(i));
      if (v === -1) return null;
      vals.push(v);
    }
    if (vals.length % 4 === 1) return null;   // no valid base64 group is 1 char
    var bytes = [], n;
    for (i = 0; i + 3 < vals.length; i += 4) {
      n = (vals[i] << 18) | (vals[i + 1] << 12) | (vals[i + 2] << 6) | vals[i + 3];
      bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255);
    }
    var rest = vals.length - i;
    if (rest === 2) {
      n = (vals[i] << 18) | (vals[i + 1] << 12);
      bytes.push((n >> 16) & 255);
    } else if (rest === 3) {
      n = (vals[i] << 18) | (vals[i + 1] << 12) | (vals[i + 2] << 6);
      bytes.push((n >> 16) & 255, (n >> 8) & 255);
    }
    return bytes;
  }

  /* ------------------------------------------------------------------ *
   * Runtime <-> wire
   *
   * The wire form is the whitelist. `seed`, the answer key, teacher notes,
   * label ids, annotation offsets, the lesson id, and the teacher's print
   * color mode have no wire key at all, so they cannot leak by accident —
   * only by someone adding a key here, which the smoke test would catch.
   *
   *   f  format tag        v  version
   *   t  title             d  directions (omitted when empty)
   *   s  sentence texts, in student numbering order
   *   q  questions: k kind code, s 0-based sentence index, p prompt,
   *                 m [firstToken, lastToken] to mark, n expected count
   *   o  options: w word numbering, b word bank, g grouping, z spacing
   *               (each omitted at its default)
   * ------------------------------------------------------------------ */
  function toWire(assignment) {
    var a = assignment || {};
    var options = a.options || {};
    var wire = {
      f: FORMAT,
      v: VERSION,
      t: String(a.title || ""),
      s: (a.sentences || []).map(function (s) { return String(s.text || ""); }),
      q: (a.questions || []).map(function (q) {
        var out = {
          k: KIND_CODES.indexOf(q.kind),
          s: (q.sentence || 1) - 1,
          p: String(q.prompt || ""),
        };
        if (q.mark) out.m = [q.mark.first, q.mark.last];
        if (q.expected) out.n = q.expected;
        return out;
      }),
    };
    if (a.directions) wire.d = String(a.directions);

    var o = {};
    if (options.numberWords === true) o.w = 1;
    if (options.wordBank && options.wordBank.length) o.b = options.wordBank.slice();
    var g = GROUPING_CODES.indexOf(options.grouping);
    if (g > 0) o.g = g;
    var z = SPACING_CODES.indexOf(options.spacing);
    if (z !== -1 && z !== 1) o.z = z;          // 1 = "standard", the default
    if (Object.keys(o).length) wire.o = o;

    return wire;
  }

  function isInt(v) { return typeof v === "number" && isFinite(v) && Math.floor(v) === v; }
  function fail(msg) { return { ok: false, error: msg }; }

  /* Validate a decoded wire object and expand it to the runtime shape.
   * Every string stays exactly as received — escaping is the renderer's job,
   * through the existing helpers. */
  function fromWire(wire) {
    if (!wire || typeof wire !== "object" || Array.isArray(wire)) {
      return fail("That link doesn’t contain a Sentence Forge assignment.");
    }
    if (wire.f !== FORMAT) {
      return fail("That link doesn’t contain a Sentence Forge assignment.");
    }
    if (!isInt(wire.v) || wire.v < 1) return fail("That assignment link is damaged.");
    if (wire.v > VERSION) {
      return fail("That assignment was made with a newer version of Sentence Forge.");
    }

    if (wire.t != null && typeof wire.t !== "string") return fail("That assignment link is damaged.");
    var title = typeof wire.t === "string" ? wire.t.trim() : "";
    if (title.length > LIMITS.title) {
      return fail("The title is too long — keep it under " + LIMITS.title + " characters.");
    }
    var directions = typeof wire.d === "string" ? wire.d : "";
    if (wire.d != null && typeof wire.d !== "string") return fail("That assignment link is damaged.");
    if (directions.length > LIMITS.directions) {
      return fail("The directions are too long — keep them under " + LIMITS.directions + " characters.");
    }

    if (!Array.isArray(wire.s) || !wire.s.length) return fail("That assignment has no sentences.");
    if (wire.s.length > LIMITS.sentences) {
      return fail("That assignment covers too many sentences to share as a link (limit " +
        LIMITS.sentences + ").");
    }
    var sentences = [];
    for (var i = 0; i < wire.s.length; i++) {
      var text = wire.s[i];
      if (typeof text !== "string" || !text.trim()) return fail("That assignment link is damaged.");
      if (text.length > LIMITS.sentenceChars) {
        return fail("Sentence " + (i + 1) + " is too long to share as a link (limit " +
          LIMITS.sentenceChars + " characters).");
      }
      sentences.push({ number: i + 1, text: text });
    }

    if (!Array.isArray(wire.q) || !wire.q.length) return fail("That assignment has no questions.");
    if (wire.q.length > LIMITS.questions) {
      return fail("That assignment has too many questions to share as a link (limit " +
        LIMITS.questions + ").");
    }
    var questions = [];
    for (var j = 0; j < wire.q.length; j++) {
      var q = wire.q[j];
      if (!q || typeof q !== "object" || Array.isArray(q)) return fail("That assignment link is damaged.");
      if (!isInt(q.k) || q.k < 0 || q.k >= KIND_CODES.length) return fail("That assignment link is damaged.");
      if (!isInt(q.s) || q.s < 0 || q.s >= sentences.length) return fail("That assignment link is damaged.");
      if (typeof q.p !== "string" || !q.p.trim()) return fail("That assignment link is damaged.");
      if (q.p.length > LIMITS.promptChars) return fail("A question is too long to share as a link.");

      var out = { number: j + 1, sentence: q.s + 1, kind: KIND_CODES[q.k], prompt: q.p };

      if (q.m != null) {
        if (!Array.isArray(q.m) || q.m.length !== 2 || !isInt(q.m[0]) || !isInt(q.m[1])) {
          return fail("That assignment link is damaged.");
        }
        if (q.m[0] < 0 || q.m[1] < q.m[0]) return fail("That assignment link is damaged.");
        // A mark that runs past the end of its sentence would render nothing —
        // reject it here rather than let the renderer paper over it.
        if (typeof wjt.tokenize === "function") {
          var tokenCount = wjt.tokenize(sentences[q.s].text).length;
          if (q.m[1] >= tokenCount) return fail("That assignment link is damaged.");
        }
        out.mark = { first: q.m[0], last: q.m[1] };
      }
      if (q.n != null) {
        if (!isInt(q.n) || q.n < 2 || q.n > LIMITS.expected) return fail("That assignment link is damaged.");
        out.expected = q.n;
      }
      questions.push(out);
    }

    var o = wire.o;
    if (o != null && (typeof o !== "object" || Array.isArray(o))) {
      return fail("That assignment link is damaged.");
    }
    o = o || {};
    var bank = [];
    if (o.b != null) {
      if (!Array.isArray(o.b) || o.b.length > LIMITS.bank) return fail("That assignment link is damaged.");
      for (var k = 0; k < o.b.length; k++) {
        if (typeof o.b[k] !== "string" || o.b[k].length > LIMITS.bankChars) {
          return fail("That assignment link is damaged.");
        }
        bank.push(o.b[k]);
      }
    }
    var grouping = GROUPING_CODES[0];
    if (o.g != null) {
      if (!isInt(o.g) || !GROUPING_CODES[o.g]) return fail("That assignment link is damaged.");
      grouping = GROUPING_CODES[o.g];
    }
    var spacing = SPACING_CODES[1];
    if (o.z != null) {
      if (!isInt(o.z) || !SPACING_CODES[o.z]) return fail("That assignment link is damaged.");
      spacing = SPACING_CODES[o.z];
    }

    return {
      ok: true,
      assignment: {
        format: wjt.assignment ? wjt.assignment.FORMAT : "sentence-forge-assignment",
        version: wire.v,
        title: title || "Assignment",
        directions: directions,
        sentences: sentences,
        questions: questions,
        options: {
          numberWords: o.w === 1,
          wordBank: bank,
          grouping: grouping,
          spacing: spacing,
          colorMode: "color",     // a teacher print preference; never shared
        },
      },
    };
  }

  wjt.assignmentCodec = {
    FORMAT: FORMAT,
    VERSION: VERSION,
    ROUTE: ROUTE,
    LIMITS: LIMITS,
    THRESHOLDS: THRESHOLDS,
    KIND_CODES: KIND_CODES,

    toWire: toWire,
    fromWire: fromWire,

    /**
     * Runtime assignment -> URL-safe payload.
     * Returns { ok: true, payload, wire } or { ok: false, error }.
     * Never truncates: an assignment too big for the ceiling is refused so the
     * teacher reduces its scope instead of shipping half of it.
     */
    encode: function (assignment) {
      var wire, json, payload;
      try {
        wire = toWire(assignment);
        // Encode only what would survive a decode, so a bad build can't ship.
        var check = fromWire(wire);
        if (!check.ok) return fail("This assignment can’t be shared: " + check.error);
        json = JSON.stringify(wire);
        payload = toB64url(utf8Bytes(json));
      } catch (e) {
        return fail("This assignment couldn’t be turned into a link.");
      }
      if (payload.length > LIMITS.payload) {
        return { ok: false, tooLarge: true, payload: payload,
          error: "This assignment is too large to share as a link. " +
            "Use fewer sentences or questions, or print it instead." };
      }
      return { ok: true, payload: payload, wire: wire };
    },

    /**
     * URL-safe payload -> runtime assignment.
     * Returns { ok: true, assignment } or { ok: false, error }. Never throws:
     * every rejection path is a return, including a JSON parse failure.
     */
    decode: function (payload) {
      if (typeof payload !== "string") return fail("That assignment link is damaged.");
      var text = payload.trim();
      if (!text) return fail("That link has no assignment in it.");
      if (text.length > LIMITS.payload) return fail("That assignment is too long to open.");
      if (!/^[A-Za-z0-9_-]+$/.test(text)) return fail("That assignment link is damaged.");
      var bytes = fromB64url(text);
      if (!bytes) return fail("That assignment link is damaged.");
      var json = utf8String(bytes);
      if (json == null) return fail("That assignment link is damaged.");
      var wire;
      try {
        wire = JSON.parse(json);
      } catch (e) {
        return fail("That assignment link is damaged.");
      }
      try {
        return fromWire(wire);
      } catch (e) {
        return fail("That assignment link is damaged.");
      }
    },

    /** The share URL for a payload: the current page URL, hash removed. */
    shareUrl: function (baseUrl, payload) {
      return String(baseUrl || "").replace(/#.*$/, "") + ROUTE + payload;
    },

    /**
     * How comfortably a share URL fits a QR code (proposal §Size and QR
     * readability). Drives the three visible builder states — plus the fourth,
     * where even URL sharing is off the table.
     */
    sizeState: function (urlLength) {
      if (urlLength > LIMITS.url) return "too-large-url";
      if (urlLength > THRESHOLDS.dense) return "too-large-qr";
      if (urlLength > THRESHOLDS.easy) return "dense";
      return "easy";
    },

    /** Measure the real final URL — never estimate from sentence count. */
    measure: function (baseUrl, payload) {
      var url = this.shareUrl(baseUrl, payload);
      return { url: url, length: url.length, state: this.sizeState(url.length) };
    },
  };
})();
