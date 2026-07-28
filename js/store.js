/* Sentence Forge — lesson model, localStorage persistence, import/export.
 *
 * Lesson JSON format (also what teachers upload):
 * {
 *   "format": "sentence-forge-lesson",
 *   "version": 1,                                    // lesson format version; acted on by wjt.migrateLesson() on read
 *   "title": "My Lesson",
 *   "description": "optional",
 *   "layers": ["pos", "part", "phrase", "clause"],   // which levels this lesson teaches
 *   "essentialOnly": true,                           // optional: hide Advanced labels from the editor palette
 *   "ownerId": "…",                                  // optional: who owns this lesson. Absent means no owner.
 *   "sentences": [
 *     {
 *       "text": "The curious fox darted across the frozen river.",
 *       "annotations": [
 *         { "start": 0, "end": 3, "label": "determiner", "note": "optional teaching note" }
 *       ]
 *     }
 *   ]
 * }
 * start/end are character offsets into the sentence text (end exclusive).
 * Offsets are snapped outward to whole words on import.
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};

  /* ------------------------------------------------------------------ *
   * Storage adapter (seam S1)
   *
   * `wjt.store` below is the *model*: it knows what a lesson is, stamps
   * `updatedAt`, sorts the library, duplicates, merges sentences. It does not
   * know where lessons are kept. That is the adapter's whole job, and its
   * whole vocabulary is four methods:
   *
   *   list()          -> array of stored lessons, in no particular order
   *   get(id)         -> one lesson, or null
   *   save(lesson)    -> persist it (insert or replace by id); returns it
   *   remove(id)      -> delete it
   *
   * plus `onCorrupt(raw)`, which an adapter calls when it finds stored data it
   * cannot read (see the localStorage implementation).
   *
   * WHY IT IS SYNCHRONOUS — and must stay that way.
   * A Promise-returning interface looks like the obvious shape for a future
   * networked adapter. It isn't worth it: `wjt.store.list()`/`get()` are called
   * inline during render in every view, so going async rewrites all of them —
   * a large, risky, entirely user-invisible change.
   * A networked adapter does not need async here. It needs a read-through
   * cache with a background flush: reads answer from memory, writes go to
   * memory and localStorage immediately and to the network in the background.
   * That keeps this surface synchronous, keeps the app working offline (which
   * the file:// degraded mode requires anyway), and confines the change to this
   * file. Sync is the design, not a shortcut — don't "fix" it.
   *
   * NOT the same thing as `wjt.safeStorage` (js/app.js). That is a try/catch
   * shim over small *preference* keys (theme, palette, the first-run seed flag)
   * that lives in the DOM layer and may fail silently, flipping `wjt.storageOK`
   * so boot can warn once. This holds the teacher's actual work and must throw
   * STORAGE_WRITE_FAILED so the editor can toast. They look mergeable; they are
   * not. Leave both.
   * ------------------------------------------------------------------ */

  var KEY = "sentenceForge.lessons.v1";
  var CORRUPT_KEY = KEY + ".corrupt";

  // Adapter #1, and for now the only one: the whole library in one
  // localStorage key. Deliberately whole-list — readAll() -> mutate ->
  // writeAll(). At classroom scale (tens of lessons) that's fine, and it
  // removes a whole class of partial-write bugs.
  //
  // Only getItem/setItem/removeItem are used: the smoke test runs this file in
  // a bare `vm` sandbox whose localStorage shim is a Map with exactly those
  // three methods. No `length`, no `key()`, no `clear()`, and no DOM.
  function localStorageAdapter(opts) {
    var onCorrupt = (opts && opts.onCorrupt) || function () {};

    function readAll() {
      var raw;
      try {
        raw = localStorage.getItem(KEY);
      } catch (e) {
        return [];   // storage access itself is disabled — nothing to read or salvage
      }
      if (!raw) return [];
      try {
        var list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
        // Valid JSON but not our array shape — treat like corruption below.
      } catch (e) { /* not parseable — fall through to preserve */ }

      // The stored library is unreadable (hand-editing, a truncated write, a
      // foreign value). Returning [] keeps the app usable as before — but the very
      // next save would overwrite this raw value and destroy any recoverable
      // lessons. Copy it aside FIRST and flag it so the shell can surface recovery
      // (audit P1-2). Only back up once, so repeated reads never clobber the copy.
      try {
        if (localStorage.getItem(CORRUPT_KEY) == null) localStorage.setItem(CORRUPT_KEY, raw);
      } catch (e2) { /* best effort — couldn't preserve, but still don't crash */ }
      onCorrupt(raw);
      return [];
    }

    function writeAll(list) {
      try {
        localStorage.setItem(KEY, JSON.stringify(list));
      } catch (e) {
        var err = new Error("Couldn’t save — browser storage is full or disabled. " +
          "Export your lessons to a file so you don’t lose work.");
        err.code = "STORAGE_WRITE_FAILED";
        throw err;
      }
    }

    return {
      name: "localStorage",

      list: function () {
        return readAll();
      },

      get: function (id) {
        return readAll().find(function (l) { return l.id === id; }) || null;
      },

      save: function (lesson) {
        var list = readAll();
        var i = list.findIndex(function (l) { return l.id === lesson.id; });
        if (i === -1) list.push(lesson); else list[i] = lesson;
        writeAll(list);
        return lesson;
      },

      remove: function (id) {
        writeAll(readAll().filter(function (l) { return l.id !== id; }));
      },
    };
  }

  /* ------------------------------------------------------------------ *
   * Migrations (seam S4)
   *
   * `version` has been in the lesson format since the first release with
   * nothing acting on it. This is the thing that acts on it.
   *
   * WHERE IT RUNS. On read, in `wjt.store.list()`/`get()` below — so a lesson
   * is brought up to date on its way out of storage, before any view sees it.
   * Not on write: a lesson a teacher hasn't opened in a year must still migrate
   * when they finally do. And not inside the adapter, though the work order
   * suggested there — the adapter's job is *persisting lesson objects*, and what
   * a `version` number means is model knowledge. Running it in the model means
   * the next adapter (the networked one P7 eventually picks) gets migration for
   * free instead of having to remember it, so "no view ever sees an unmigrated
   * lesson" holds no matter what is plugged in underneath.
   *
   * THE READ DOES NOT WRITE BACK. At classroom scale re-running the chain on
   * every read is free, and a silent storage write during render is not
   * something a render should do. The migrated shape lands in storage the next
   * time the teacher saves — the only moment they'd want it to.
   *
   * THE REGISTRY is a plain object: version number -> pure (lesson) -> lesson.
   * `wjt.migrations[n]` takes a lesson stored at version `n` and returns it one
   * step closer to `LESSON_VERSION`, stamping the new `version` itself; the
   * runner then looks up the next step. The entry for `LESSON_VERSION` is the
   * identity step. It is how the loop terminates, and it is what keeps this
   * runner *live code*: every read of every current lesson runs through it, so
   * the machinery is exercised from day one instead of executing for the first
   * time on the day it finally matters. Don't "optimize" it away.
   *
   * A VERSION THIS BUILD DOESN'T KNOW is refused, not guessed at — both a lesson
   * from a newer build (a teacher opening their synced library on an older
   * machine, which P7 makes the normal case rather than an edge case) and a gap
   * in the registry. The lesson comes back exactly as stored and the refusal is
   * published on `wjt.store.unsupportedVersion` for the shell, the way
   * `corruptBackup` is. Refusing leaves the data intact and readable on the
   * machine that *can* read it; a half-applied guess does not.
   * ------------------------------------------------------------------ */

  // The lesson format version this build reads and writes. Bumping it is a
  // format change — read the alpha rule in CLAUDE.md first.
  var LESSON_VERSION = 1;

  wjt.LESSON_VERSION = LESSON_VERSION;

  wjt.migrations = {
    // v1 IS the current format, so there is nothing to do — and it still runs.
    1: function (lesson) { return lesson; },
  };

  // `version` shipped with the format, so an absent one can only mean 1.
  function versionOf(lesson) {
    var v = lesson && lesson.version;
    return typeof v === "number" && isFinite(v) ? v : LESSON_VERSION;
  }

  /**
   * Run a stored lesson through the registry.
   * Returns { lesson, from, migrated, ok, reason } and never throws.
   * `ok: false` means this build refused to touch it, and `lesson` is then the
   * value exactly as it was stored.
   */
  wjt.migrateLesson = function (stored) {
    var from = versionOf(stored);
    var out = { lesson: stored, from: from, migrated: false, ok: true, reason: "" };
    if (!stored || typeof stored !== "object") return out;

    var name = 'Lesson "' + (stored.title || stored.id || "untitled") + '"';
    function refuse(reason) {
      out.lesson = stored;        // as stored — a half-applied guess is worse
      out.migrated = false;
      out.ok = false;
      out.reason = reason;
      return out;
    }

    var v = from;
    // Bounded, so a migration that fails to advance `version` can't hang a
    // render. 64 steps is far more than any real chain will ever be.
    for (var i = 0; i < 64; i++) {
      var fn = wjt.migrations[v];
      if (typeof fn !== "function") {
        return refuse(v > LESSON_VERSION
          ? name + " was saved by a newer version of Sentence Forge (lesson format " +
            v + "; this one reads " + LESSON_VERSION + "). It was left untouched — " +
            "open it there, or export it from there and import the file here."
          : name + " has an unknown lesson format version (" + v + "). It was left untouched.");
      }
      var next = fn(out.lesson) || out.lesson;
      var nv = versionOf(next);
      out.lesson = next;
      if (nv === v) return out;   // the identity step: already current
      out.migrated = true;
      v = nv;
    }
    return refuse(name + " did not settle after 64 migration steps (format " + from + ").");
  };

  // Every lesson leaves storage through here — the one place a migration runs.
  // A refusal is published for the shell, and warned once per lesson+version so
  // a re-render can't spam the console.
  var warnedVersions = {};
  function onRead(stored) {
    var r = wjt.migrateLesson(stored);
    if (!r.ok) {
      var id = stored && stored.id;
      wjt.store.unsupportedVersion = { id: id, version: r.from, reason: r.reason };
      if (!warnedVersions[id + ":" + r.from]) {
        warnedVersions[id + ":" + r.from] = true;
        if (window.console && console.warn) console.warn("[Sentence Forge] " + r.reason);
      }
    }
    return r.lesson;
  }

  // Fold typographic look-alikes to ASCII for the `match` lookup ONLY.
  // Every substitution is 1 code unit -> 1 code unit, so length and all offsets
  // are preserved: the resolved span still slices the untouched original text.
  function foldForMatch(s) {
    return s
      .replace(/[\u2018\u2019\u201B]/g, "'")     // left/right/reversed single quote & apostrophe -> '
      .replace(/[\u201C\u201D]/g, '"')            // left/right double quote -> "
      .replace(/[\u00A0\u2000-\u200A\u202F]/g, " "); // NBSP, en..hair spaces, narrow NBSP -> space
  }

  wjt.store = {
    /* Where lessons are kept. Swap this for a different implementation of the
     * four-method interface above and nothing else in the app changes — that is
     * the point of the seam. Everything below is model logic and stays put. */
    adapter: localStorageAdapter({
      // The corrupt-library flag is part of the store's public contract, not
      // the adapter's: app.js reads `wjt.store.corruptBackup` at boot to offer
      // the teacher a download of the unreadable raw value (audit P1-2). The
      // adapter just reports; the model publishes.
      onCorrupt: function (raw) { wjt.store.corruptBackup = raw; },
    }),

    list: function () {
      return this.adapter.list().map(function (l) { return onRead(l); }).sort(function (a, b) {
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
    },

    get: function (id) {
      var stored = this.adapter.get(id);
      return stored ? onRead(stored) : null;
    },

    save: function (lesson) {
      lesson.updatedAt = new Date().toISOString();
      return this.adapter.save(lesson);
    },

    remove: function (id) {
      this.adapter.remove(id);
    },

    create: function (title) {
      var now = new Date().toISOString();
      return {
        format: "sentence-forge-lesson",
        version: 1,
        id: wjt.uid(),
        title: title || "Untitled lesson",
        description: "",
        layers: ["pos", "part", "phrase", "clause"],
        essentialOnly: false,
        // Nullable while there is exactly one local owner (seam S3). `null`
        // means "no owner", not "owner unknown" — nothing writes a real value
        // until P8 (teacher accounts) resolves.
        ownerId: null,
        sentences: [],
        createdAt: now,
        updatedAt: now,
      };
    },

    duplicate: function (id) {
      var src = this.get(id);
      if (!src) return null;
      var copy = JSON.parse(JSON.stringify(src));
      copy.id = wjt.uid();
      copy.title = src.title + " (copy)";
      copy.createdAt = new Date().toISOString();
      return this.save(copy);
    },

    /* -------- sentence transforms (pure model logic, DOM-free) --------
     * Kept here rather than inline in the editor so the smoke test can cover
     * them. Both mutate `sentences` in place. */

    // Merge the sentence at idx+1 into idx: concatenate text, re-offset and
    // append the next sentence's annotations, and carry its grammar `types` and
    // `notes` instead of discarding them (audit P0-1). `types` is an
    // axis->option map: the survivor's choice per axis wins; `next` fills any
    // axis it hasn't set. Notes are concatenated. No-op if either is missing.
    mergeSentence: function (sentences, idx) {
      var s = sentences[idx], next = sentences[idx + 1];
      if (!s || !next) return sentences;
      var offset = s.text.length + 1;
      s.text = s.text + " " + next.text;
      s.annotations = s.annotations || [];
      (next.annotations || []).forEach(function (a) {
        s.annotations.push({
          id: wjt.uid(), start: a.start + offset, end: a.end + offset,
          label: a.label, note: a.note || "",
        });
      });
      if (next.types) {
        s.types = s.types || {};
        Object.keys(next.types).forEach(function (cat) {
          if (!s.types[cat]) s.types[cat] = next.types[cat];
        });
        if (!Object.keys(s.types).length) delete s.types;
      }
      if (next.notes) s.notes = s.notes ? s.notes + " " + next.notes : next.notes;
      sentences.splice(idx + 1, 1);
      return sentences;
    },

    // Replace the sentence at idx with `parts` (new text, possibly split into
    // several sentences). Annotations are offset-dependent and clear; the
    // sentence `types` and `notes` survive on the first piece (audit P0-1).
    // Returns the replacement array spliced in.
    rewriteSentenceText: function (sentences, idx, parts) {
      var s = sentences[idx];
      var replacements = parts.map(function (p) { return { text: p, annotations: [] }; });
      if (s && replacements.length) {
        if (s.types) replacements[0].types = s.types;
        if (s.notes) replacements[0].notes = s.notes;
      }
      sentences.splice.apply(sentences, [idx, 1].concat(replacements));
      return replacements;
    },
  };

  /* ------------------------------------------------------------------ *
   * Import / export
   * ------------------------------------------------------------------ */

  /**
   * Validate + normalize an uploaded lesson object.
   * Returns { lesson, warnings } or throws Error with a readable message.
   */
  wjt.importLesson = function (data) {
    if (!data || typeof data !== "object") throw new Error("File is not a JSON object.");
    if (data.format && data.format !== "sentence-forge-lesson") {
      throw new Error('Unrecognized "format" — expected "sentence-forge-lesson".');
    }
    if (!Array.isArray(data.sentences)) {
      throw new Error('Missing "sentences" array.');
    }

    var warnings = [];
    var lesson = wjt.store.create(String(data.title || "Imported lesson"));
    lesson.description = String(data.description || "");

    if (Array.isArray(data.layers) && data.layers.length) {
      var layers = data.layers.filter(function (l) { return wjt.LAYERS[l]; });
      if (layers.length !== data.layers.length) warnings.push("Some layer names were unrecognized and skipped.");
      if (layers.length) lesson.layers = layers;
    }
    lesson.essentialOnly = data.essentialOnly === true;
    // Preserved when the uploaded file carries one; anything that isn't a
    // non-empty string is ignored and create()'s `null` stands (seam S3).
    if (typeof data.ownerId === "string" && data.ownerId) lesson.ownerId = data.ownerId;

    data.sentences.forEach(function (s, si) {
      var text = typeof s === "string" ? s : String(s && s.text || "");
      text = text.trim();
      if (!text) { warnings.push("Sentence " + (si + 1) + " is empty — skipped."); return; }

      var tokens = wjt.tokenize(text);
      var sentence = { text: text, annotations: [] };

      // Optional whole-sentence classification: { structure, purpose }.
      if (s && s.types && typeof s.types === "object") {
        var types = {};
        wjt.SENTENCE_TYPE_ORDER.forEach(function (cat) {
          var val = s.types[cat];
          if (val == null || val === "") return;
          if (wjt.isSentenceType(cat, val)) types[cat] = val;
          else warnings.push('Skipped unknown ' + cat + ' type "' + val + '" (sentence ' + (si + 1) + ").");
        });
        if (Object.keys(types).length) sentence.types = types;
      }

      // Optional free-text note about the sentence itself (special handling,
      // e.g. a cleft construction). Omitted when empty, never a reason to reject.
      if (s && s.notes != null) {
        var notes = String(s.notes).trim();
        if (notes) sentence.notes = notes;
      }

      var anns = (s && Array.isArray(s.annotations)) ? s.annotations : [];

      anns.forEach(function (a, ai) {
        var where = "sentence " + (si + 1) + ", annotation " + (ai + 1);
        if (!a || typeof a !== "object") { warnings.push("Skipped invalid annotation (" + where + ")."); return; }
        var label = String(a.label || "");
        if (!wjt.LABELS[label]) { warnings.push('Skipped unknown label "' + label + '" (' + where + ")."); return; }

        var start = a.start, end = a.end;
        // Alternative addressing: { "match": "the frozen river" } finds the
        // first occurrence of that text (handy when writing JSON by hand).
        if (typeof a.match === "string" && a.match) {
          var at = foldForMatch(text).indexOf(foldForMatch(a.match));
          if (at === -1) { warnings.push('Text "' + a.match + '" not found (' + where + ")."); return; }
          start = at; end = at + a.match.length;
        }
        if (typeof start !== "number" || typeof end !== "number" || end <= start) {
          warnings.push("Skipped annotation with bad offsets (" + where + ")."); return;
        }
        var range = wjt.spanToTokens(tokens, Math.max(0, start), Math.min(text.length, end));
        if (!range) { warnings.push("Annotation covers no words (" + where + ")."); return; }
        var span = wjt.tokensToSpan(tokens, range.first, range.last);

        var layerId = wjt.LABELS[label].layer;
        if (lesson.layers.indexOf(layerId) === -1) lesson.layers.push(layerId);

        sentence.annotations.push({
          id: wjt.uid(),
          start: span.start,
          end: span.end,
          label: label,
          note: a.note ? String(a.note) : "",
        });
      });

      lesson.sentences.push(sentence);
    });

    if (!lesson.sentences.length) throw new Error("No usable sentences found in the file.");
    return { lesson: lesson, warnings: warnings };
  };

  /** Serializable export copy (drops volatile ids). */
  wjt.exportLesson = function (lesson) {
    var doc = {
      format: "sentence-forge-lesson",
      version: 1,
      title: lesson.title,
      description: lesson.description || "",
      layers: lesson.layers.slice(),
      sentences: lesson.sentences.map(function (s) {
        var out = {
          text: s.text,
          annotations: s.annotations.map(function (a) {
            var ann = { start: a.start, end: a.end, label: a.label };
            if (a.note) ann.note = a.note;
            return ann;
          }),
        };
        if (s.types && Object.keys(s.types).length) out.types = s.types;
        if (s.notes) out.notes = s.notes;
        return out;
      }),
    };
    // Only written when on, so the default (full palette) stays implicit.
    if (lesson.essentialOnly) doc.essentialOnly = true;
    // Same rule, same reason (seam S3): written only when set, so an ownerless
    // lesson — which is every lesson today — exports byte-identically to before
    // the field existed. That is what makes ownerId additive, not a format change.
    if (typeof lesson.ownerId === "string" && lesson.ownerId) doc.ownerId = lesson.ownerId;
    return doc;
  };

  /** One document holding every stored lesson (volatile ids dropped per lesson). */
  wjt.exportAllLessons = function () {
    return {
      format: "sentence-forge-bundle",
      version: 1,
      exportedAt: new Date().toISOString(),
      lessons: wjt.store.list().map(wjt.exportLesson),
    };
  };

  /** Normalize an uploaded doc (bundle | array | single lesson) into lessons. */
  wjt.importBundle = function (data) {
    var docs;
    if (data && Array.isArray(data.lessons)) docs = data.lessons;   // { lessons: [...] }
    else if (Array.isArray(data)) docs = data;                       // bare array
    else docs = [data];                                              // single lesson (existing shape)

    var lessons = [], warnings = [], failed = 0;
    docs.forEach(function (d, i) {
      try {
        var r = wjt.importLesson(d);
        lessons.push(r.lesson);
        r.warnings.forEach(function (w) { warnings.push("Lesson " + (i + 1) + ": " + w); });
      } catch (e) {
        failed++;
        warnings.push("Lesson " + (i + 1) + " skipped: " + e.message);
      }
    });
    return { lessons: lessons, warnings: warnings, failed: failed };
  };

  wjt.downloadJson = function (obj, filename) {
    wjt.downloadText(JSON.stringify(obj, null, 2), filename, "application/json");
  };

  // Download an already-serialized string verbatim (no re-stringify) — used to
  // rescue a corrupt saved library, whose raw text may not even be JSON (P1-2).
  wjt.downloadText = function (text, filename, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  };

  /* ------------------------------------------------------------------ *
   * Sample lesson — offsets computed by substring search so they are
   * always exact.
   * ------------------------------------------------------------------ */

  wjt.buildSampleLesson = function () {
    function sentence(text, specs, types, notes) {
      var anns = [];
      specs.forEach(function (spec) {
        var match = spec[0], label = spec[1], note = spec[2];
        var nth = spec[3] || 1; // which occurrence of `match`
        var at = -1;
        for (var n = 0; n < nth; n++) at = text.indexOf(match, at + 1);
        if (at === -1) { if (window.console) console.warn("sample: no match for", match); return; }
        anns.push({ id: wjt.uid(), start: at, end: at + match.length, label: label, note: note || "" });
      });
      var s = { text: text, annotations: anns };
      if (types) s.types = types;
      if (notes) s.notes = notes;
      return s;
    }

    var lesson = wjt.store.create("Sample: The Fox and the River");
    lesson.description = "A four-sentence demo annotated at every level — parts of speech, sentence parts (simple, complete, and compound subjects and predicates), phrases, clauses, and each sentence's type. Duplicate it, present it, or quiz on it.";
    lesson.sentences = [
      sentence("The curious fox darted across the frozen river.", [
        ["The", "determiner"],
        ["curious", "adjective"],
        ["fox", "noun"],
        ["darted", "verb"],
        ["across", "preposition"],
        ["the", "determiner"],
        ["frozen", "adjective"],
        ["river.", "noun"],
        ["The curious fox", "complete-subject", "The simple subject plus its modifiers."],
        ["fox", "simple-subject", "The one main noun the sentence is about."],
        ["darted across the frozen river.", "complete-predicate"],
        ["darted", "simple-predicate", "The verb by itself."],
        ["The curious fox", "noun-phrase"],
        ["across the frozen river.", "prepositional-phrase", "Acts as an adverb: it tells where the fox darted."],
        ["The curious fox darted across the frozen river.", "independent-clause", "A complete thought that stands on its own."],
      ], { structure: "simple", purpose: "declarative" }),
      sentence("Because the ice was thin, she moved carefully.", [
        ["Because", "conjunction", "A subordinating conjunction — it makes the clause dependent."],
        ["the", "determiner"],
        ["ice", "noun"],
        ["was", "verb"],
        ["thin,", "adjective"],
        ["she", "pronoun"],
        ["moved", "verb"],
        ["carefully.", "adverb"],
        ["the ice", "complete-subject", "The dependent clause has its own subject and predicate."],
        ["ice", "simple-subject"],
        ["was thin,", "complete-predicate"],
        ["was", "simple-predicate"],
        ["she", "complete-subject", "Here the complete and simple subject are the same single word."],
        ["moved carefully.", "complete-predicate"],
        ["moved", "simple-predicate"],
        ["thin,", "complement", "A subject complement: it completes “the ice was…”"],
        ["Because the ice was thin,", "dependent-clause", "It has a subject and verb but can’t stand alone."],
        ["Because the ice was thin,", "adverbial-clause", "It tells WHY she moved carefully."],
        ["she moved carefully.", "independent-clause"],
      ], { structure: "complex", purpose: "declarative" }),
      sentence("Her paws, quick and silent, barely touched the icy surface.", [
        ["Her", "pronoun", "A possessive pronoun acting as a determiner."],
        ["paws,", "noun"],
        ["quick", "adjective"],
        ["and", "conjunction"],
        ["silent,", "adjective"],
        ["barely", "adverb"],
        ["touched", "verb"],
        ["the", "determiner"],
        ["icy", "adjective"],
        ["surface.", "noun"],
        ["Her paws, quick and silent,", "complete-subject"],
        ["paws,", "simple-subject"],
        ["barely touched the icy surface.", "complete-predicate"],
        ["touched", "simple-predicate"],
        ["the icy surface.", "direct-object", "It receives the action: what did the paws touch?"],
        ["Her paws,", "noun-phrase"],
        ["the icy surface.", "noun-phrase"],
        ["Her paws, quick and silent, barely touched the icy surface.", "independent-clause"],
      ], { structure: "simple", purpose: "declarative" }),
      sentence("The fox and the hare raced downhill and leaped over the log.", [
        ["The", "determiner"],
        ["fox", "noun"],
        ["and", "conjunction"],
        ["the", "determiner"],
        ["hare", "noun"],
        ["raced", "verb"],
        ["downhill", "adverb"],
        ["and", "conjunction", "", 2],
        ["leaped", "verb"],
        ["over", "preposition"],
        ["the", "determiner", "", 2],
        ["log.", "noun"],
        ["The fox and the hare", "compound-subject", "Two subjects, one verb — joined by “and.”"],
        ["fox", "simple-subject"],
        ["hare", "simple-subject"],
        ["raced downhill and leaped over the log.", "compound-predicate", "Two verbs, one subject — joined by “and.”"],
        ["raced", "simple-predicate"],
        ["leaped", "simple-predicate"],
        ["over the log.", "prepositional-phrase"],
        ["The fox and the hare raced downhill and leaped over the log.", "independent-clause", "Still ONE clause — a compound subject and predicate do not make a compound sentence."],
      ], { structure: "simple", purpose: "declarative" }),
    ];
    return lesson;
  };
})();
