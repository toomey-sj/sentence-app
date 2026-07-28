/* Sentence Forge — Assignment mode: the delivery channels.
 *
 * Seam S5 of docs/roadmap-platform.md. One question — "how can this assignment
 * reach a student?" — gets exactly one answer, here, in one shape. Before this
 * file, print lived in two buttons in the builder and the URL codec was treated
 * as *the* digital delivery method; now they are peers, and account-delivery
 * slots in as a fourth without touching a view.
 *
 * Every channel answers three things:
 *
 *   available(env)        Can this channel be used HERE AT ALL? This is where
 *                         P3 becomes code: under file:// the `link` channel is
 *                         unavailable and says why in teacher language, while
 *                         `print` and `file` stay available — always. The reason
 *                         string exists to be displayed, not logged.
 *   report(built, env)    Can THIS assignment go out through it? Size and
 *                         readiness, in the vocabulary wjt.assignmentCodec has
 *                         already measured — never a parallel set of numbers.
 *   deliver(built, opts)  Do it. Returns { ok: true, … } or { ok: false, error },
 *                         and never throws, exactly like the codec.
 *
 * `built` is the whole { assignment, key, … } from wjt.assignment.build(). Each
 * channel takes only the half it is entitled to: `file` and `link` carry the
 * student-safe `assignment` ONLY, and the answer key leaves the app through
 * exactly one channel — print — because a teacher asked for it on paper.
 *
 * The codec is *wrapped, never modified*: KIND_CODES order is the wire encoding,
 * and every limit and threshold quoted below is read from it at call time.
 *
 * This file touches no DOM, no storage, and no network of its own. The only
 * browser global it reads is `window.location`, and only to answer available();
 * delivery itself is delegated to wjt.assignmentPrint and wjt.downloadJson. That
 * is why tools/smoke-test.js can run it in the same bare vm sandbox as the model
 * and the codec, and why the source scan there covers this file too.
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};

  /* Only a real web origin can hand a student a link. file:// — and any other
   * scheme, including "none at all" — is the degraded mode P3 describes, so the
   * gate fails closed rather than guessing. */
  var WEB_PROTOCOLS = ["http:", "https:"];

  /* The one sentence a teacher sees when link sharing is off the table. It names
   * what still works, because "unavailable" with no alternative is precisely
   * what P3 was written to prevent. */
  var NO_LINK_REASON = "Sharing a link needs the web version; printing works here.";

  /* Said of a channel whose readiness reasoning is live but whose output has
   * nowhere to go yet. See `status` on the link channel. */
  var PLANNED_NOTE = "Not built yet — the student page a link opens is still to " +
    "come (proposal Phase 4). The size above is what it would be.";

  function ok() { return { available: true, reason: "" }; }
  function fail(msg) { return { ok: false, error: msg }; }

  /* The environment every available() is judged against. Passed explicitly by
   * the tests; read off the page otherwise. A page with no location at all
   * yields protocol "", which no channel treats as a web origin. */
  function currentEnv() {
    var loc = (typeof window !== "undefined" && window.location) || null;
    return {
      protocol: loc ? String(loc.protocol || "") : "",
      baseUrl: loc ? String(loc.href || "") : "",
    };
  }

  function commas(n) { return String(n).replace(/\B(?=(\d{3})+$)/g, ","); }

  function plural(n, word) { return commas(n) + " " + word + (n === 1 ? "" : "s"); }

  /* Characters, not UTF-8 bytes: the codec owns the byte counting, and at this
   * rounding the difference never shows on screen. */
  function size(chars) {
    return chars < 1024 ? commas(chars) + " bytes" : commas(Math.round(chars / 1024)) + " KB";
  }

  /* ------------------------------------------------------------------ *
   * print — always available, no size limit
   * ------------------------------------------------------------------ */
  var printChannel = {
    id: "print",
    name: "Print",
    what: "A worksheet, plus a separate teacher answer key. Paper or Save-as-PDF.",
    status: "ready",
    actions: [
      { id: "worksheet", name: "🖨 Print worksheet" },
      { id: "key", name: "🔑 Print answer key" },
    ],

    /* Always, on every protocol. This is the promise in the roadmap's "What does
     * not change": a teacher with no login and no network can still build a
     * lesson and print a worksheet. Nothing may be added here that can say no. */
    available: function () { return ok(); },

    report: function (built) {
      var a = built.assignment;
      return {
        ready: true, state: "unlimited", length: 0,
        detail: plural(a.questions.length, "question") + " on " +
          plural(a.sentences.length, "sentence") + " — no size limit.",
      };
    },

    /* opts: { variant: "worksheet" | "key", notes: bool }. `notes` is the
     * answer key's teaching-notes print control and reaches nothing else. */
    deliver: function (built, opts) {
      opts = opts || {};
      var wantKey = opts.variant === "key";
      if (!wjt.assignmentPrint) return fail("Printing isn’t available on this page.");
      try {
        if (wantKey) {
          wjt.assignmentPrint.send(
            wjt.assignmentPrint.answerKey(built.key, { notes: !!opts.notes }),
            "key", built.assignment.title + " — Answer Key");
        } else {
          wjt.assignmentPrint.send(wjt.assignmentPrint.worksheet(built.assignment),
            "worksheet", built.assignment.title);
        }
      } catch (e) {
        return fail("This assignment couldn’t be sent to the printer.");
      }
      return { ok: true, variant: wantKey ? "key" : "worksheet" };
    },
  };

  /* ------------------------------------------------------------------ *
   * file — always available, no size limit
   * ------------------------------------------------------------------ */
  var fileChannel = {
    id: "file",
    name: "File",
    what: "One .json file — a portable copy of exactly this assignment, to keep " +
      "or hand to a colleague.",
    status: "ready",
    actions: [{ id: "download", name: "⬇ Download assignment" }],

    available: function () { return ok(); },

    /* What gets written: the student-safe assignment, minus the seed.
     *
     * The seed is the teacher's regenerate handle — how the *same* questions
     * come back — not part of what a student receives, and the codec leaves it
     * off the wire for the same reason. Everything else goes out verbatim, with
     * no size limit: the codec's caps exist to stop a hostile URL fragment from
     * asking the renderer for a million nodes, and a file a teacher chose to
     * save is not that. */
    payload: function (built) {
      var a = built.assignment, out = {};
      Object.keys(a).forEach(function (k) { if (k !== "seed") out[k] = a[k]; });
      return out;
    },

    filename: function (built) {
      var slug = String((built.assignment && built.assignment.title) || "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return (slug || "untitled") + ".assignment.json";
    },

    report: function (built) {
      var chars = JSON.stringify(fileChannel.payload(built), null, 2).length;
      return {
        ready: true, state: "unlimited", length: chars,
        detail: "One .json file, about " + size(chars) + " — no size limit.",
      };
    },

    deliver: function (built) {
      var name = fileChannel.filename(built);
      if (typeof wjt.downloadJson !== "function") {
        return fail("Downloading isn’t available on this page.");
      }
      try {
        wjt.downloadJson(fileChannel.payload(built), name);
      } catch (e) {
        return fail("This assignment couldn’t be saved as a file.");
      }
      return { ok: true, filename: name };
    },
  };

  /* ------------------------------------------------------------------ *
   * link — the existing codec, wrapped
   *
   * Every number and every band below comes from wjt.assignmentCodec: LIMITS.url
   * is the supported ceiling, and THRESHOLDS.easy / .dense are the measured
   * QR-capacity bands. Read at call time so there is one copy of each.
   * ------------------------------------------------------------------ */
  var DETAIL = {
    easy: function (n) {
      return commas(n) + "-character link — scans easily as a QR code.";
    },
    dense: function (n) {
      return commas(n) + "-character link — it works, but the QR code is dense. " +
        "Print it large, or ask fewer questions.";
    },
    "too-large-qr": function (n) {
      return commas(n) + "-character link — too long for a QR code a class can " +
        "scan reliably. The link itself still works.";
    },
    "too-large-url": function (n) {
      return commas(n) + " characters — past the " +
        commas(wjt.assignmentCodec.LIMITS.url) + "-character link ceiling. " +
        "Use fewer sentences or questions, or print it instead.";
    },
  };

  var linkChannel = {
    id: "link",
    name: "Link",
    what: "A student link that carries the whole assignment in the address — no " +
      "server, no account, and no answers.",

    /* "planned", not "ready": available() and report() are live and correct, and
     * deliver() really produces the URL, but the read-only student page that
     * opens one is Phase 4 of the assignment proposal and does not exist yet.
     * Flip this to "ready" in the same change that adds that route and gives
     * this channel an action — the builder grows its button off these two fields
     * alone, and nothing else has to know. */
    status: "planned",
    actions: [],

    available: function (env) {
      env = env || currentEnv();
      if (WEB_PROTOCOLS.indexOf(env.protocol) !== -1) return ok();
      return { available: false, reason: NO_LINK_REASON };
    },

    report: function (built, env) {
      env = env || currentEnv();
      var enc = wjt.assignmentCodec.encode(built.assignment);
      // The codec's own refusal, in its own words — it knows which limit it hit.
      if (!enc.ok) return { ready: false, state: "refused", length: 0, detail: enc.error };
      var m = wjt.assignmentCodec.measure(env.baseUrl, enc.payload);
      return {
        ready: m.state !== "too-large-url",
        state: m.state,
        length: m.length,
        detail: DETAIL[m.state](m.length),
      };
    },

    deliver: function (built, opts) {
      opts = opts || {};
      var env = opts.env || currentEnv();
      var can = linkChannel.available(env);
      if (!can.available) return fail(can.reason);
      var enc, m;
      try {
        enc = wjt.assignmentCodec.encode(built.assignment);
        if (!enc.ok) return fail(enc.error);
        m = wjt.assignmentCodec.measure(env.baseUrl, enc.payload);
      } catch (e) {
        return fail("This assignment couldn’t be turned into a link.");
      }
      if (m.state === "too-large-url") return fail(DETAIL["too-large-url"](m.length));
      return { ok: true, url: m.url, payload: enc.payload, state: m.state, length: m.length };
    },
  };

  /* ------------------------------------------------------------------ *
   * Public API
   * ------------------------------------------------------------------ */
  var ORDER = ["print", "file", "link"];
  var CHANNELS = { print: printChannel, file: fileChannel, link: linkChannel };

  wjt.assignmentChannels = {
    /** Display order. A view iterates this, never its own list. */
    ORDER: ORDER,
    channels: CHANNELS,

    /** Published so a view and a check quote the same sentence, never a copy. */
    NO_LINK_REASON: NO_LINK_REASON,
    PLANNED_NOTE: PLANNED_NOTE,

    env: currentEnv,

    get: function (id) { return CHANNELS[id] || null; },

    /**
     * Every channel, in ORDER, flattened into what a view needs:
     * { id, name, what, status, actions, available, reason, ready, state,
     *   length, detail }.
     *
     * An unavailable channel is NOT measured — there is nothing to size up
     * about a link you can't send — so `detail` is empty and the view has one
     * thing to show: the reason.
     */
    list: function (built, env) {
      env = env || currentEnv();
      return ORDER.map(function (id) {
        var ch = CHANNELS[id];
        var can = ch.available(env);
        var rep = can.available ? ch.report(built, env)
          : { ready: false, state: "", length: 0, detail: "" };
        return {
          id: ch.id, name: ch.name, what: ch.what, status: ch.status,
          actions: ch.actions.slice(),
          available: can.available, reason: can.reason,
          ready: !!rep.ready, state: rep.state || "", length: rep.length || 0,
          detail: rep.detail || "",
        };
      });
    },
  };
})();
