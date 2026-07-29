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

  /* The step kinds. `teach` carries no answer; the rest are scored. */
  var KINDS = ["teach", "choice", "tap", "sort"];

  /* unitId -> { labelId: clusterId }, derived on first use. */
  var labelClusterCache = {};

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

    /** Clusters in path order: [{ id, title, shortTitle, reviewId, stops }].
     *  `reviewId` is the cluster's review stop, if it has one — which is also
     *  what makes it a TEACHING cluster (see labelClusters below). */
    clusters: function (unitId) {
      var u = this.unit(unitId);
      if (!u) return [];
      var order = [], byId = {};
      u.stops.forEach(function (s) {
        var cid = s.cluster || "";
        if (!byId[cid]) {
          var title = (u.clusters && u.clusters[cid]) || "";
          byId[cid] = {
            id: cid,
            title: title,
            shortTitle: (u.clusterShort && u.clusterShort[cid]) || title,
            reviewId: "",
            stops: [],
          };
          order.push(byId[cid]);
        }
        if (s.reviews && s.reviews.length) byId[cid].reviewId = s.id;
        byId[cid].stops.push(s);
      });
      return order;
    },

    /** Which cluster TAUGHT each label: { labelId: clusterId }.
     *
     * A teaching cluster is one that ends in a review, and a teaching stop is one
     * inside it with a passage of its own. That derivation is deliberate: it
     * excludes the orientation and the capstone, both of which re-use labels the
     * lessons own rather than owning any themselves, without this file having to
     * know their ids. tools/smoke-test.js asserts the result covers the whole
     * label budget exactly once. */
    labelClusters: function (unitId) {
      if (labelClusterCache[unitId]) return labelClusterCache[unitId];
      var reviewed = {}, map = {};
      var stops = this.stops(unitId);
      stops.forEach(function (s) {
        if (s.reviews && s.reviews.length) reviewed[s.cluster] = true;
      });
      stops.forEach(function (s) {
        if (!s.lessonId || (s.reviews && s.reviews.length) || !reviewed[s.cluster]) return;
        (s.focus || []).forEach(function (id) { map[id] = s.cluster; });
      });
      labelClusterCache[unitId] = map;
      return map;
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
  wjt.study.clearCache = function () { lessonCache = {}; labelClusterCache = {}; };

  /* ------------------------------------------------------------------ *
   * Generated `tap` questions.
   *
   * For each annotation whose label is in the stop's focus set, emit one
   * "select the <label> in this sentence" question. `accept` holds EVERY
   * same-label span in that sentence, so a passage with two possessive nouns
   * doesn't punish a student for picking the other one — the same fairness rule
   * quiz.js applies to its `find` questions.
   *
   * An `accept` entry carries BOTH forms of the span: `{first,last}` token
   * indices, which is what `check()` compares a student's selection against, and
   * `{start,end}` character offsets, which is what the view needs to highlight
   * and to name the word. Keeping them together is what lets the view reveal the
   * word the student ACTUALLY PICKED rather than the one the generator happened
   * to build the question from. A third of these questions have more than one
   * right answer — 42 of 131 as of this writing — and before `accept` carried the
   * character span, all of them could accept a pick and then contradict it by
   * highlighting a different word and announcing 'the preposition is "from"'.
   * `accept.length` is also how the view knows to ask for ANY ONE of six
   * prepositions instead of "the" preposition. Sorted in reading order, because
   * the view lists them.
   *
   * Two caps, and they do different jobs. `limit` is a ceiling on the whole
   * batch, which is how a teach screen keeps its practice to a few questions.
   * `perLabel` is a ceiling per label, which is what an assessment over a large
   * focus set needs: the capstone declares all 48 labels, and slicing the batch
   * would take every question from the first two sentences instead of one per
   * part of speech. Both default to no cap, which is the pre-existing behaviour.
   * ------------------------------------------------------------------ */
  function tapStepsFor(lesson, focus, limit, perLabel) {
    if (!lesson) return [];
    var want = {};
    (focus || []).forEach(function (id) { want[id] = true; });

    var out = [], countPerLabel = {};
    lesson.sentences.forEach(function (s, si) {
      var tokens = wjt.tokenize(s.text);
      var anns = s.annotations || [];

      // Every span in this sentence, grouped by label, so `accept` can be
      // shared by all questions about that label.
      var byLabel = {};
      anns.forEach(function (a) {
        var r = wjt.spanToTokens(tokens, a.start, a.end);
        if (!r) return;
        (byLabel[a.label] = byLabel[a.label] || []).push({
          first: r.first, last: r.last, start: a.start, end: a.end,
        });
      });
      Object.keys(byLabel).forEach(function (id) {
        byLabel[id].sort(function (x, y) { return x.start - y.start; });
      });

      anns.forEach(function (a) {
        if (!want[a.label] || !wjt.LABELS[a.label]) return;
        if (perLabel && (countPerLabel[a.label] || 0) >= perLabel) return;
        var r = wjt.spanToTokens(tokens, a.start, a.end);
        if (!r) return;
        // One question per (sentence, label) — a sentence with four common
        // nouns should not become four near-identical questions.
        var already = false;
        out.forEach(function (q) {
          if (q.sentenceIndex === si && q.label === a.label) already = true;
        });
        if (already) return;
        countPerLabel[a.label] = (countPerLabel[a.label] || 0) + 1;
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
   * Answer order.
   *
   * Authored items are written CORRECT ANSWER FIRST, and the same is true of a
   * sort's words, which are written cycling through the buckets in order. Both
   * are the readable way to write a question and a giveaway to play: a student
   * who notices scores full marks without reading an option. So the view never
   * sees authored order — `steps()` shuffles on the way out, and the authoring
   * convention stays. tools/smoke-test.js asserts both halves of that.
   *
   * THE SHUFFLE IS SEEDED FROM THE QUESTION'S OWN TEXT, not from Math.random(),
   * and that is load-bearing rather than fussy. `steps()` is called more than
   * once for the same stop, and callers compare the two: tools/dom-check.html
   * re-derives a step to find out which option it must click in order to answer
   * WRONG on purpose. Under a per-call random order it would click the right
   * answer while asserting a wrong one — intermittently, which is the worst kind
   * of red. Same seed, same permutation, every call.
   *
   * The student still never sees authored order and never a fixed position:
   * where the answer lands is decided by the stem it belongs to.
   * ------------------------------------------------------------------ */

  /** FNV-1a, 32-bit. A string in, a seed out. */
  function hashSeed(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h = (h ^ str.charCodeAt(i)) >>> 0;
      // h * 16777619 without Math.imul, which is ES6 — shift-and-add instead.
      h = (h + ((h << 1) >>> 0) + ((h << 4) >>> 0) + ((h << 7) >>> 0) +
        ((h << 8) >>> 0) + ((h << 24) >>> 0)) >>> 0;
    }
    return h >>> 0;
  }

  /** xorshift32. Plain ES5 operators, and plenty for permuting six things. */
  function prng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;      // 0 is xorshift's fixed point
    return function () {
      s = (s ^ ((s << 13) >>> 0)) >>> 0;
      s = (s ^ (s >>> 17)) >>> 0;
      s = (s ^ ((s << 5) >>> 0)) >>> 0;
      return s / 4294967296;
    };
  }

  /** Fisher-Yates over a COPY, seeded by `key`. Same key, same order. */
  function shuffled(list, key) {
    var out = (list || []).slice();
    var rnd = prng(hashSeed(key));
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  }

  wjt.study.shuffled = shuffled;

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

    /* An authored item is a `choice` unless it says `kind: "sort"`. Keeping both
     * in the one `items` array is what lets a sort be placed after a named teach
     * screen like every other written question.
     *
     * Both kinds leave here SHUFFLED — see "Answer order" above. `expected` is a
     * { word: bucket } map, so a sort's scoring is untouched by the word order;
     * a choice's `correct` flag travels on the option itself, so `check()` is
     * untouched by the option order. Nothing downstream may assume index 0. */
    function pushItems(list) {
      list.forEach(function (it, i) {
        var seed = unitId + "|" + stop.id + "|" + (it.stem || "") + "|" + i;
        if (it.kind === "sort") {
          var expected = {};
          (it.words || []).forEach(function (w) { expected[w.word] = w.bucket; });
          steps.push({
            kind: "sort",
            id: it.id || ("sort-" + steps.length + "-" + i),
            stem: it.stem,
            buckets: (it.buckets || []).slice(),
            words: shuffled((it.words || []).map(function (w) { return w.word; }), seed),
            expected: expected,
            note: it.note || "",
            label: it.label || "",
          });
          return;
        }
        steps.push({
          kind: "choice",
          id: it.id || ("choice-" + steps.length + "-" + i),
          stem: it.stem,
          options: shuffled(it.options, seed),
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

    /* Anything authored without an `after`, then a final applied set over the
     * stop's whole focus for the labels no teach screen claimed.
     *
     * `itemsLast` swaps those two. A stop with no teach screens has nothing for
     * its written items to follow, and standing them in front of the generated
     * practice would open an assessment with its own summary questions. */
    var loose = (stop.items || []).filter(function (it) { return !it.after; });
    if (!stop.itemsLast) pushItems(loose);

    /* Whatever no teach screen claimed. This pass has no batch cap on purpose —
     * a focus lesson whose screens name its whole focus never reaches it — but a
     * stop with a large focus and no screens at all (the capstone) MUST set
     * `tapPerLabel`, or it generates a question for every (sentence, label) pair
     * in its passage. */
    var unclaimed = (stop.focus || []).filter(function (id) { return !taught[id]; });
    if (unclaimed.length) {
      sources.forEach(function (src) {
        tapStepsFor(lessonFor(src.lessonId), unclaimed, 0, stop.tapPerLabel || 0)
          .forEach(function (q) { steps.push(q); });
      });
    }

    if (stop.itemsLast) pushItems(loose);

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
   * Reporting by cluster.
   *
   * A stop with `resultsBy: "cluster"` reports "Words that modify — 4 of 7"
   * instead of a flat list of every question. That is the only form of results a
   * 30-question assessment can act on: a cluster names a stop the student can
   * re-enter, and a list of thirty rights and wrongs names nothing.
   *
   * `records` is [{ step, correct }], built in memory by the view while a student
   * plays and dropped when the screen goes away. NOTHING here is written — see
   * rule 1 at the top of this file, and decision C6.
   * ------------------------------------------------------------------ */
  wjt.study.clusterReport = function (unitId, records) {
    if (!this.unit(unitId)) return [];
    var byLabel = this.labelClusters(unitId);
    var rows = [], byId = {};

    this.clusters(unitId).forEach(function (c) {
      if (!c.reviewId) return;               // not a teaching cluster
      byId[c.id] = { id: c.id, title: c.shortTitle, stopId: c.reviewId, right: 0, total: 0 };
      rows.push(byId[c.id]);
    });
    /* Anything whose label no cluster owns — a sort that spans the whole unit.
     * Left untitled on purpose: every other row's title comes from the unit's own
     * data, and inventing one here would be the only piece of screen prose in this
     * file. The view names it. */
    var mixed = { id: "", title: "", stopId: "", right: 0, total: 0 };
    rows.push(mixed);

    (records || []).forEach(function (r) {
      if (!r || !r.step) return;
      var row = byId[byLabel[r.step.label || ""] || ""] || mixed;
      row.total++;
      if (r.correct) row.right++;
    });

    return rows.filter(function (r) { return r.total > 0; });
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
      /* { word: bucketId } vs the step's expected map. Every word must be
       * placed and placed correctly — per-word bucket equality, and nothing
       * about the ORDER a student placed them in, which is not part of the
       * answer. `placed` lets the view refuse an incomplete response without
       * re-deriving the rule; `wrong` names the words for the feedback. */
      var expected = step.expected || {};
      var given = response || {};
      var words = Object.keys(expected);
      var wrong = words.filter(function (w) { return given[w] !== expected[w]; });
      var placed = words.filter(function (w) { return !!given[w]; });
      return {
        correct: words.length > 0 && wrong.length === 0,
        detail: { wrong: wrong, placed: placed.length, total: words.length },
      };
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
