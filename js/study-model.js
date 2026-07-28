/* Sentence Forge — Study mode, the model layer.
 *
 * The engine behind a self-paced student unit: it turns a unit's declared stops
 * into an ordered list of steps, generates the passage-based questions from the
 * annotations a stop declares as its focus, checks answers, and keeps a small
 * local progress record.
 *
 * Three rules are worth reading before changing anything here:
 *
 *   1. NOTHING about a student's answers is stored. `progress` holds a resume
 *      point, a completion flag, and a score fraction per stop — that is all.
 *      There is no attempt log and no way to reconstruct what a student picked.
 *      tools/smoke-test.js asserts the stored shape by inspecting its keys.
 *   2. `check()` is pure and takes plain data. The view reads a token range out
 *      of the renderer's selection and hands over `{first,last}`; no element
 *      ever reaches this file. That is what keeps scoring testable.
 *   3. Question generation FILTERS BY LABEL, which is the whole reason this
 *      file exists. quiz.js and assignment-model.js both select by *layer*
 *      (annsForLayers / skills), so neither can ask "find the possessive noun"
 *      without also asking about every other part of speech in the passage.
 *
 * DOM-free and storage-free: tools/smoke-test.js runs it in a bare vm sandbox.
 * The one storage path is wjt.safeStorage, injected by app.js, and every call
 * is guarded so a locked-down browser yields a forgetful unit, not a blank page.
 */
(function () {
  "use strict";
  var wjt = (window.wjt = window.wjt || {});

  var PROGRESS_VERSION = 1;

  /* The step kinds. `teach` carries no answer; the rest are scored.
   * `sort` is declared here and implemented in a later phase (see
   * plans/017) so the view can switch on a stable set. */
  var KINDS = ["teach", "choice", "tap", "sort"];

  wjt.study = {
    PROGRESS_VERSION: PROGRESS_VERSION,
    KINDS: KINDS,
    UNITS: {},

    /** Register a unit. Content files call this; nothing else should. */
    register: function (unit) {
      if (!unit || !unit.id) return null;
      this.UNITS[unit.id] = unit;
      return unit;
    },

    unit: function (unitId) {
      return this.UNITS[unitId] || null;
    },

    /** Every stop in path order, `todo` ones included. */
    stops: function (unitId) {
      var u = this.unit(unitId);
      return u ? u.stops.slice() : [];
    },

    stop: function (unitId, stopId) {
      var found = null;
      this.stops(unitId).forEach(function (s) {
        if (s.id === stopId) found = s;
      });
      return found;
    },

    /** The stop a student should be offered next: first not-done, not-todo. */
    nextStop: function (unitId, progress) {
      var done = (progress && progress.done) || {};
      var next = null;
      this.stops(unitId).forEach(function (s) {
        if (next || s.todo || done[s.id]) return;
        next = s;
      });
      return next;
    },

    /** Clusters in path order: [{ id, title, stops: [...] }]. */
    clusters: function (unitId) {
      var u = this.unit(unitId);
      if (!u) return [];
      var order = [], byId = {};
      u.stops.forEach(function (s) {
        var cid = s.cluster || "";
        if (!byId[cid]) {
          byId[cid] = { id: cid, title: (u.clusters && u.clusters[cid]) || "", stops: [] };
          order.push(byId[cid]);
        }
        byId[cid].stops.push(s);
      });
      return order;
    },
  };

  /* ------------------------------------------------------------------ *
   * Passage access. A stop names a lesson by its wjt.EXAMPLES id; we build
   * it on demand and cache it, so the study view never needs wjt.store and a
   * student can work the whole unit without saving anything to their library.
   * ------------------------------------------------------------------ */
  var lessonCache = {};

  function lessonFor(lessonId) {
    if (!lessonId) return null;
    if (lessonCache[lessonId]) return lessonCache[lessonId];
    var found = null;
    (wjt.EXAMPLES || []).forEach(function (ex) {
      if (ex.id === lessonId) found = ex;
    });
    if (!found) return null;
    lessonCache[lessonId] = found.build();
    return lessonCache[lessonId];
  }

  wjt.study.lessonFor = lessonFor;

  /** Forget built passages — only needed when a test rebuilds the registry. */
  wjt.study.clearCache = function () { lessonCache = {}; };

  /* ------------------------------------------------------------------ *
   * Generated `tap` questions.
   *
   * For each annotation whose label is in the stop's focus set, emit one
   * "select the <label> in this sentence" question. `accept` holds the token
   * range of EVERY same-label span in that sentence, so a passage with two
   * possessive nouns doesn't punish a student for picking the other one — the
   * same fairness rule quiz.js applies to its `find` questions.
   * ------------------------------------------------------------------ */
  function tapStepsFor(lesson, focus, limit) {
    if (!lesson) return [];
    var want = {};
    (focus || []).forEach(function (id) { want[id] = true; });

    var out = [];
    lesson.sentences.forEach(function (s, si) {
      var tokens = wjt.tokenize(s.text);
      var anns = s.annotations || [];

      // Token ranges of every span in this sentence, grouped by label, so
      // `accept` can be shared by all questions about that label.
      var byLabel = {};
      anns.forEach(function (a) {
        var r = wjt.spanToTokens(tokens, a.start, a.end);
        if (!r) return;
        (byLabel[a.label] = byLabel[a.label] || []).push(r);
      });

      anns.forEach(function (a) {
        if (!want[a.label] || !wjt.LABELS[a.label]) return;
        var r = wjt.spanToTokens(tokens, a.start, a.end);
        if (!r) return;
        // One question per (sentence, label) — a sentence with four common
        // nouns should not become four near-identical questions.
        var already = false;
        out.forEach(function (q) {
          if (q.sentenceIndex === si && q.label === a.label) already = true;
        });
        if (already) return;
        out.push({
          kind: "tap",
          id: "tap-" + si + "-" + a.label,
          label: a.label,
          sentenceIndex: si,
          sentence: s,
          start: a.start,
          end: a.end,
          note: a.note || "",
          accept: byLabel[a.label].slice(),
        });
      });
    });

    return limit ? out.slice(0, limit) : out;
  }

  wjt.study.tapStepsFor = tapStepsFor;

  /* ------------------------------------------------------------------ *
   * Step assembly.
   *
   * A focus stop interleaves: teach screen -> the authored `choice` items
   * belonging to it -> the generated `tap` items for the labels it just
   * taught. A review stop has no lesson of its own; it draws its `tap` items
   * from the stops it reviews.
   * ------------------------------------------------------------------ */
  wjt.study.steps = function (unitId, stopId) {
    var self = this;
    var stop = this.stop(unitId, stopId);
    if (!stop) return [];

    var steps = [];
    var taught = {};

    // Authored items keyed by the teach screen they follow. An item with no
    // `after` is held back for the end of the stop.
    function itemsAfter(heading) {
      return (stop.items || []).filter(function (it) { return it.after === heading; });
    }

    function pushItems(list) {
      list.forEach(function (it, i) {
        steps.push({
          kind: "choice",
          id: it.id || ("choice-" + steps.length + "-" + i),
          stem: it.stem,
          options: it.options.slice(),
          label: it.label || "",
        });
      });
    }

    // Where this stop's generated questions come from.
    var sources = stop.reviews && stop.reviews.length
      ? stop.reviews.map(function (rid) { return self.stop(unitId, rid); }).filter(Boolean)
      : [stop];

    (stop.teach || []).forEach(function (t) {
      steps.push({
        kind: "teach",
        id: "teach-" + steps.length,
        heading: t.heading,
        body: t.body,
        labels: (t.labels || []).slice(),
      });
      (t.labels || []).forEach(function (id) { taught[id] = true; });
      pushItems(itemsAfter(t.heading));

      // Generated practice on exactly what this screen introduced.
      sources.forEach(function (src) {
        tapStepsFor(lessonFor(src.lessonId), (t.labels || []), stop.tapPerScreen || 0)
          .forEach(function (q) { steps.push(q); });
      });
    });

    // Anything authored without an `after`, then a final applied set over the
    // stop's whole focus for the labels no teach screen claimed.
    pushItems((stop.items || []).filter(function (it) { return !it.after; }));

    var unclaimed = (stop.focus || []).filter(function (id) { return !taught[id]; });
    if (unclaimed.length) {
      sources.forEach(function (src) {
        tapStepsFor(lessonFor(src.lessonId), unclaimed, 0).forEach(function (q) {
          steps.push(q);
        });
      });
    }

    // Stable ids even if a stop repeats a label across screens.
    var seen = {};
    steps.forEach(function (s, i) {
      if (seen[s.id]) s.id = s.id + "-" + i;
      seen[s.id] = true;
    });

    return steps;
  };

  /** Scored steps only — what a stop's score is out of. */
  wjt.study.scorable = function (steps) {
    return (steps || []).filter(function (s) { return s.kind !== "teach"; });
  };

  /* ------------------------------------------------------------------ *
   * Answer checking. Pure: plain data in, plain verdict out.
   * ------------------------------------------------------------------ */
  wjt.study.check = function (step, response) {
    if (!step) return { correct: false, detail: {} };

    if (step.kind === "choice") {
      var picked = step.options[response];
      return {
        correct: !!(picked && picked.correct),
        detail: {
          picked: picked || null,
          answer: step.options.filter(function (o) { return o.correct; })[0] || null,
        },
      };
    }

    if (step.kind === "tap") {
      var ok = !!response && (step.accept || []).some(function (r) {
        return r.first === response.first && r.last === response.last;
      });
      return { correct: ok, detail: { label: step.label, note: step.note || "" } };
    }

    if (step.kind === "sort") {
      // { word: bucketId } vs the step's expected map. Every word must be
      // placed and placed correctly.
      var expected = step.expected || {};
      var given = response || {};
      var words = Object.keys(expected);
      var wrong = words.filter(function (w) { return given[w] !== expected[w]; });
      return { correct: wrong.length === 0, detail: { wrong: wrong } };
    }

    return { correct: false, detail: {} };
  };

  /* ------------------------------------------------------------------ *
   * Progress — a resume point, a done flag, and a score fraction. Nothing
   * about individual answers, deliberately (see rule 1 at the top).
   *
   * Read through wjt.safeStorage so a browser that refuses storage gives a
   * working, forgetful unit rather than an exception during boot.
   * ------------------------------------------------------------------ */
  function storage() {
    return wjt.safeStorage || { get: function () { return null; }, set: function () { return false; } };
  }

  function fresh() {
    return { v: PROGRESS_VERSION, at: "", done: {}, best: {}, updatedAt: "" };
  }

  wjt.study.progressKey = function (unitId) {
    return "sentenceForge.study." + unitId + ".v" + PROGRESS_VERSION;
  };

  wjt.study.progress = {
    /** Stored progress, or a fresh record. An unreadable or foreign-version
     *  value is DISCARDED rather than guessed at — it is disposable data. */
    read: function (unitId) {
      var raw = storage().get(wjt.study.progressKey(unitId));
      if (!raw) return fresh();
      var data;
      try { data = JSON.parse(raw); } catch (e) { return fresh(); }
      if (!data || typeof data !== "object" || data.v !== PROGRESS_VERSION) return fresh();
      return {
        v: PROGRESS_VERSION,
        at: typeof data.at === "string" ? data.at : "",
        done: data.done && typeof data.done === "object" ? data.done : {},
        best: data.best && typeof data.best === "object" ? data.best : {},
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
      };
    },

    write: function (unitId, rec) {
      rec.v = PROGRESS_VERSION;
      rec.updatedAt = new Date().toISOString();
      return storage().set(wjt.study.progressKey(unitId), JSON.stringify(rec));
    },

    /** Remember where the student is, without marking anything finished. */
    visit: function (unitId, stopId) {
      var rec = this.read(unitId);
      rec.at = stopId;
      this.write(unitId, rec);
      return rec;
    },

    /** Mark a stop finished and keep the BEST fraction, never the latest. */
    complete: function (unitId, stopId, fraction) {
      var rec = this.read(unitId);
      var f = Math.max(0, Math.min(1, +fraction || 0));
      rec.done[stopId] = 1;
      if (!(stopId in rec.best) || f > rec.best[stopId]) rec.best[stopId] = f;
      rec.at = stopId;
      this.write(unitId, rec);
      return rec;
    },

    reset: function (unitId) {
      var rec = fresh();
      this.write(unitId, rec);
      return rec;
    },
  };
})();
