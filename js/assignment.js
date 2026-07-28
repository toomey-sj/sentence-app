/* Sentence Forge — Assignment mode: the builder view, the student-safe
 * renderer, and the two print surfaces.
 *
 * The front door to js/assignment-model.js. A teacher picks sentences, skills,
 * a question count, supports, and a layout; the model turns those into an
 * assignment; this view renders the student half of it, live, and prints it.
 *
 * Two rules this file exists to keep:
 *
 *   1. It computes NOTHING about questions. Every number on screen — the pool
 *      size, a skill's availability and its reason, how many ruled lines a
 *      question gets — comes from wjt.assignment. Deriving any of it here is how
 *      the preview and the printed worksheet drift apart.
 *   2. wjt.assignment.build() returns { assignment, key, … }. Everything under
 *      wjt.assignmentRender takes the `assignment` half ONLY, so "the student
 *      never sees an answer" is a property of small functions rather than of the
 *      whole view. The one place the `key` is rendered is
 *      wjt.assignmentPrint.answerKey(), which exists to print it.
 *
 * Three renderings share one body builder — preview, printed worksheet, printed
 * answer key — so their numbering cannot drift; tools/dom-check.html asserts
 * that all three agree.
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};
  wjt.views = wjt.views || {};

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ------------------------------------------------------------------ *
   * Student-safe rendering (wjt.assignmentRender)
   * ------------------------------------------------------------------ */

  /* One sentence, token by token. `mark` (an identify question's token range)
   * is drawn with square brackets AND bold AND underline — the brackets are
   * literal text, so the target survives grayscale printing, photocopying, and
   * a stylesheet that never loads. Color is never the signal here. */
  function sentenceText(text, numberWords, mark) {
    var host = el("span", "assign-text");
    var tokens = wjt.tokenize(text);
    if (!tokens.length) {
      host.textContent = text;
      return host;
    }
    // The marked run is one wrapper element holding its tokens AND the spaces
    // between them, so the underline is continuous rather than one stub per
    // word — and it still wraps, which a nowrap span over a long clause would not.
    var target = host;
    tokens.forEach(function (token, i) {
      var marked = !!mark && i >= mark.first && i <= mark.last;
      if (marked && i === mark.first) {
        if (i) host.appendChild(document.createTextNode(" "));
        target = el("strong", "assign-mark");
        target.appendChild(el("span", "assign-bracket", "["));
        host.appendChild(target);
      } else if (i) {
        target.appendChild(document.createTextNode(" "));
      }
      var word = el("span", "assign-token");
      // Word numbers are 1-based on paper; the wire range is 0-based token indices.
      if (numberWords) word.appendChild(el("sup", "assign-tnum", String(i + 1)));
      word.appendChild(document.createTextNode(token.text));
      target.appendChild(word);
      if (marked && i === mark.last) {
        target.appendChild(el("span", "assign-bracket", "]"));
        target = host;
      }
    });
    return host;
  }

  function sentenceLine(sentence, assignment) {
    var row = el("div", "assign-sentence");
    row.appendChild(el("span", "assign-sentence-num", sentence.number + "."));
    row.appendChild(sentenceText(sentence.text, assignment.options.numberWords, null));
    return row;
  }

  function sentenceByNumber(assignment, number) {
    var found = null;
    assignment.sentences.forEach(function (s) { if (s.number === number) found = s; });
    return found;
  }

  /* A question and its handwriting space. An identify question carries its own
   * marked copy of the sentence (proposal Q5) rather than marking the shared
   * passage, so one question can't answer another.
   *
   * `answer` is a key entry, and is passed ONLY by the printed answer key: it
   * replaces the ruled lines with the accepted answers. Every student-facing
   * caller passes null, which is why the leak check is one argument wide. */
  function questionBlock(q, assignment, answer, notes) {
    var box = el("div", "assign-question");
    box.dataset.q = q.number;
    var head = el("div", "assign-q-head");
    head.appendChild(el("span", "assign-q-num", q.number + "."));
    head.appendChild(el("span", "assign-q-prompt", q.prompt));
    box.appendChild(head);

    if (q.mark) {
      var source = sentenceByNumber(assignment, q.sentence);
      var quote = el("div", "assign-q-mark");
      quote.appendChild(sentenceText(source ? source.text : "",
        assignment.options.numberWords, q.mark));
      box.appendChild(quote);
    }

    if (answer) {
      box.appendChild(answerBlock(answer, notes));
      return box;
    }

    var lines = el("div", "assign-lines");
    var n = wjt.assignment.linesFor(q, assignment.options.spacing);
    for (var i = 0; i < n; i++) lines.appendChild(el("div", "assign-line"));
    box.appendChild(lines);
    return box;
  }

  /* Teacher-only. Every accepted answer (a `find` question accepts every
   * same-label span in its sentence) plus the source label/type; the teacher's
   * own note only when the print controls asked for it. */
  function answerBlock(answer, notes) {
    var box = el("div", "print-answer");
    box.appendChild(el("span", "print-answer-label",
      answer.accepted.length > 1 ? "Accepted answers" : "Answer"));
    var list = el("ul", "print-accepted");
    answer.accepted.forEach(function (text) {
      list.appendChild(el("li", "print-accepted-item", text));
    });
    box.appendChild(list);
    box.appendChild(el("span", "print-source", answer.source));
    if (notes && answer.note) box.appendChild(el("p", "print-note", answer.note));
    return box;
  }

  /* The body all three renderings share: word bank, then the passage and
   * questions in the teacher's chosen grouping. Sharing it is what makes
   * "preview, worksheet, and answer key are numbered identically" true by
   * construction rather than by care. */
  function sheetBody(root, assignment, answers, notes) {
    var bank = assignment.options.wordBank || [];
    if (bank.length) {
      var bankBox = el("section", "assign-wordbank");
      bankBox.appendChild(el("h5", "assign-sheet-h", "Word bank"));
      var list = el("ul", "assign-bank");
      bank.forEach(function (name) { list.appendChild(el("li", "assign-bank-item", name)); });
      bankBox.appendChild(list);
      root.appendChild(bankBox);
    }

    function block(q) {
      return questionBlock(q, assignment, answers ? answers[q.number] : null, notes);
    }

    if (assignment.options.grouping === "per-sentence") {
      assignment.sentences.forEach(function (s) {
        var group = el("section", "assign-group");
        group.appendChild(sentenceLine(s, assignment));
        var qs = el("div", "assign-questions");
        assignment.questions.forEach(function (q) {
          if (q.sentence === s.number) qs.appendChild(block(q));
        });
        group.appendChild(qs);
        root.appendChild(group);
      });
    } else {
      var passage = el("section", "assign-passage");
      assignment.sentences.forEach(function (s) {
        passage.appendChild(sentenceLine(s, assignment));
      });
      root.appendChild(passage);
      var all = el("div", "assign-questions");
      assignment.questions.forEach(function (q) { all.appendChild(block(q)); });
      root.appendChild(all);
    }

    if (!assignment.questions.length) {
      root.appendChild(el("p", "assign-empty muted-note",
        "No questions yet — the selected sentences and skills produce an empty pool."));
    }
    return root;
  }

  wjt.assignmentRender = {
    /**
     * Render the student half of a built assignment.
     * Takes the `assignment` object from wjt.assignment.build() — never the key.
     * Returns a detached `article.assign-sheet` the caller places.
     */
    sheet: function (assignment) {
      var root = el("article", "assign-sheet");
      root.appendChild(el("h4", "assign-sheet-title", assignment.title));
      if (assignment.directions) {
        root.appendChild(el("p", "assign-sheet-directions", assignment.directions));
      }
      return sheetBody(root, assignment, null, false);
    },
  };

  /* ------------------------------------------------------------------ *
   * Print (wjt.assignmentPrint)
   *
   * Two purpose-built documents — not the app UI with its chrome hidden. Both
   * are mounted into a #print-root that is display:none on screen, printed, and
   * removed again on `afterprint`. Nothing rebuilds, so the seed survives and a
   * reprint is byte-for-byte the same sheet.
   * ------------------------------------------------------------------ */

  function printHead(assignment, fields) {
    var head = el("header", "print-head");
    head.appendChild(el("h1", "print-title", assignment.title));
    // Marks on paper, not data entered into Sentence Forge — the worksheet has
    // them and the answer key does not.
    if (fields) {
      var row = el("div", "print-fields");
      ["Name", "Class", "Date"].forEach(function (name) {
        var field = el("span", "print-field");
        field.appendChild(el("span", "print-field-label", name));
        field.appendChild(el("span", "print-rule"));
        row.appendChild(field);
      });
      head.appendChild(row);
    }
    if (assignment.directions) {
      head.appendChild(el("p", "print-directions", assignment.directions));
    }
    return head;
  }

  function printDoc(assignment, kind) {
    var doc = el("article", "print-doc print-" + kind);
    // Drives the grayscale override in css/styles.css. Grayscale removes color
    // only: the marks are brackets + bold + underline, so nothing is lost.
    doc.dataset.colorMode = assignment.options.colorMode || "color";
    return doc;
  }

  var printRoot = null;
  var savedTitle = null;

  function clearPrint() {
    window.removeEventListener("afterprint", clearPrint);
    if (printRoot && printRoot.parentNode) printRoot.parentNode.removeChild(printRoot);
    printRoot = null;
    document.documentElement.removeAttribute("data-print");
    if (savedTitle !== null) { document.title = savedTitle; savedTitle = null; }
  }

  wjt.assignmentPrint = {
    /**
     * The student worksheet. Takes the `assignment` half only — the same object
     * the on-screen preview gets — so it cannot carry answer-key material.
     */
    worksheet: function (assignment) {
      var doc = printDoc(assignment, "worksheet");
      doc.appendChild(printHead(assignment, true));
      var body = el("div", "assign-sheet print-body");
      sheetBody(body, assignment, null, false);
      doc.appendChild(body);
      doc.appendChild(el("footer", "print-foot", "Created with Sentence Forge"));
      return doc;
    },

    /**
     * The teacher answer key: the worksheet's layout and numbering, with each
     * question's ruled lines replaced by its accepted answers.
     * `key` is the teacher-only half of wjt.assignment.build().
     */
    answerKey: function (key, opts) {
      var assignment = key.assignment;
      var notes = !!(opts && opts.notes);
      var doc = printDoc(assignment, "key");
      doc.appendChild(el("div", "print-banner", wjt.assignmentPrint.KEY_BANNER));
      doc.appendChild(printHead(assignment, false));
      var answers = {};
      key.answers.forEach(function (a) { answers[a.question] = a; });
      var body = el("div", "assign-sheet print-body");
      sheetBody(body, assignment, answers, notes);
      doc.appendChild(body);
      doc.appendChild(el("footer", "print-foot",
        wjt.assignmentPrint.KEY_BANNER + " · Created with Sentence Forge"));
      return doc;
    },

    KEY_BANNER: "Teacher Answer Key — Do Not Distribute",

    /** Mount a print document without printing it (the DOM check's entry point). */
    mount: function (doc, mode, title) {
      clearPrint();
      printRoot = document.createElement("div");
      printRoot.id = "print-root";
      printRoot.appendChild(doc);
      document.body.appendChild(printRoot);
      document.documentElement.setAttribute("data-print", mode);
      // Chrome/Edge name a Save-as-PDF file after document.title, and print the
      // title in the page header when headers are on — which is how the answer
      // key gets marked on every page. Restored by clearPrint().
      savedTitle = document.title;
      document.title = title;
      window.addEventListener("afterprint", clearPrint);
      return printRoot;
    },

    /** Take the print document down and put the page back as it was. */
    clear: clearPrint,

    /** Mount, open the browser's print dialog, and clean up after it. */
    send: function (doc, mode, title) {
      this.mount(doc, mode, title);
      window.print();
    },
  };

  /* ------------------------------------------------------------------ *
   * The builder view
   * ------------------------------------------------------------------ */

  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  function snip(text) {
    return text.length > 34 ? text.slice(0, 33) + "…" : text;
  }

  wjt.views.assignment = function (container, lessonId) {
    var lesson = wjt.store.get(lessonId);
    if (!lesson) { location.hash = "#/"; return; }
    if (!lesson.sentences.length) {
      location.hash = "#/edit/" + lesson.id;
      wjt.toast("Add some sentences before building an assignment.");
      return;
    }

    container.innerHTML = "";
    var view = document.createElement("div");
    view.className = "view view-assignment";
    container.appendChild(view);

    var head =
      '<header class="present-head">' +
      '  <a class="btn btn-ghost" href="#/library">← Library</a>' +
      '  <div class="present-title">' +
      "    <h2>📝 Assignment: " + wjt.escapeHtml(lesson.title) + "</h2>" +
      '    <p class="muted-note">Build a paper assignment from this lesson. Students write ' +
      "their answers on paper — Sentence Forge never collects or stores them.</p>" +
      "  </div>" +
      '  <div class="present-actions">' +
      '    <a class="btn" href="#/present/' + lesson.id + '">▶ Present</a>' +
      '    <a class="btn" href="#/edit/' + lesson.id + '">✎ Edit</a>' +
      "  </div>" +
      "</header>";

    // Nothing to ask about: every skill is unavailable across the whole lesson.
    // Say so where the teacher can act on it rather than opening an empty builder.
    var lessonSkills = wjt.assignment.availableSkills(lesson, null);
    var anySkill = lessonSkills.some(function (s) { return s.available; });
    if (!anySkill) {
      view.innerHTML = head +
        '<div class="card empty-state"><div class="empty-emoji">📝</div>' +
        "<h3>Nothing to build an assignment from</h3>" +
        "<p>This lesson has no labels and no sentence types yet, so there are no " +
        "questions to ask. Label a few sentences in the editor and come back.</p>" +
        '<div class="btn-row btn-row-center"><a class="btn" href="#/library">← Library</a>' +
        '<a class="btn btn-primary" href="#/edit/' + lesson.id + '">Open editor</a></div></div>';
      return;
    }

    /* Every control below writes one field of this object; nothing else does.
     * `sentences` is always an explicit 1-based list (the model reads an empty
     * list as "all", which is not a state this UI can reach — at least one
     * sentence and at least one skill stay selected). */
    var selection = {
      title: lesson.title,
      directions: "",
      sentences: lesson.sentences.map(function (_, i) { return i + 1; }),
      skills: lessonSkills.filter(function (s) { return s.available; })
        .map(function (s) { return s.id; }),
      count: wjt.assignment.DEFAULT_COUNT,
      numberWords: false,
      wordBank: false,
      grouping: wjt.assignment.GROUPINGS[0],
      spacing: "standard",
      colorMode: wjt.assignment.COLOR_MODES[0],
      seed: wjt.assignment.newSeed(),
    };

    /* A print control, not a selection: it changes the answer key only, so it
     * never reaches the model and never triggers a rebuild. */
    var keyNotes = false;

    view.innerHTML = head +
      '<div class="assign-main">' +
      '  <section class="card assign-controls">' +
      '    <h3 class="assign-h">Assignment</h3>' +
      '    <label class="assign-field"><span class="assign-label">Title</span>' +
      '      <input class="assign-input" data-role="title" maxlength="120" /></label>' +
      '    <label class="assign-field"><span class="assign-label">Directions (optional)</span>' +
      '      <textarea class="text-edit" data-role="directions" rows="2" maxlength="600"' +
      '        placeholder="Answer each question on your own paper."></textarea></label>' +
      '    <div class="assign-h-row">' +
      '      <h3 class="assign-h">Sentences</h3>' +
      '      <span class="spacer"></span>' +
      '      <button class="btn btn-sm" data-act="sent-all">Select all</button>' +
      "    </div>" +
      '    <div class="layer-chips" data-role="sentences"></div>' +
      '    <h3 class="assign-h">Skills</h3>' +
      '    <div class="layer-chips" data-role="skills"></div>' +
      '    <div class="assign-reasons" data-role="reasons"></div>' +
      '    <h3 class="assign-h">How many questions</h3>' +
      '    <div class="layer-chips" data-role="count"></div>' +
      '    <p class="muted-note" data-role="pool"></p>' +
      '    <h3 class="assign-h">Student supports</h3>' +
      '    <div class="layer-toggles" data-role="supports"></div>' +
      '    <h3 class="assign-h">Layout</h3>' +
      '    <div class="layer-toggles" data-role="grouping"></div>' +
      '    <div class="layer-toggles" data-role="spacing"></div>' +
      '    <h3 class="assign-h">Print</h3>' +
      '    <div class="layer-toggles" data-role="colormode"></div>' +
      '    <div class="layer-toggles" data-role="keyopts"></div>' +
      '    <div class="btn-row assign-print-row">' +
      '      <button class="btn btn-primary" data-act="print-sheet">🖨 Print worksheet</button>' +
      '      <button class="btn" data-act="print-key">🔑 Print answer key</button>' +
      "    </div>" +
      '    <p class="muted-note">Both open your browser’s print dialog — pick a printer ' +
      "or “Save as PDF”. The answer key is a separate sheet and is never part of the " +
      "worksheet. No network needed for either.</p>" +
      "  </section>" +
      '  <section class="assign-preview">' +
      '    <div class="section-head">' +
      '      <h3 class="section-title">Student preview</h3>' +
      '      <span class="spacer"></span>' +
      '      <button class="btn btn-sm" data-act="regen"' +
      '        title="Draw a different set of questions from the same pool">🎲 Regenerate</button>' +
      "    </div>" +
      '    <p class="muted-note">Exactly what a student sees. The answer key is built ' +
      "separately and never appears here.</p>" +
      '    <p class="muted-note assign-status" role="status" aria-live="polite" data-role="status"></p>' +
      '    <div class="card assign-sheet-host" data-role="sheet"></div>' +
      "  </section>" +
      "</div>";

    var sentencesEl = view.querySelector('[data-role="sentences"]');
    var skillsEl = view.querySelector('[data-role="skills"]');
    var reasonsEl = view.querySelector('[data-role="reasons"]');
    var countEl = view.querySelector('[data-role="count"]');
    var poolEl = view.querySelector('[data-role="pool"]');
    var supportsEl = view.querySelector('[data-role="supports"]');
    var groupingEl = view.querySelector('[data-role="grouping"]');
    var spacingEl = view.querySelector('[data-role="spacing"]');
    var colorModeEl = view.querySelector('[data-role="colormode"]');
    var keyOptsEl = view.querySelector('[data-role="keyopts"]');
    var statusEl = view.querySelector('[data-role="status"]');
    var sheetEl = view.querySelector('[data-role="sheet"]');

    var titleInput = view.querySelector('[data-role="title"]');
    var directionsInput = view.querySelector('[data-role="directions"]');
    titleInput.value = selection.title;
    directionsInput.value = selection.directions;
    // `change`, not `input`: the wording affects nothing but the preview header,
    // and a rebuild per keystroke would re-pool a 700-question lesson each time.
    titleInput.addEventListener("change", function () {
      selection.title = titleInput.value;
      rebuild();
    });
    directionsInput.addEventListener("change", function () {
      selection.directions = directionsInput.value;
      rebuild();
    });

    /* ---------------- pill helpers ----------------
     * Every control row is built ONCE here and then patched by its sync
     * function. Re-creating a row on each change would destroy the button the
     * teacher just clicked and drop keyboard focus to <body> every time. */

    function pill(box, label, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pill pill-lg";
      b.setAttribute("aria-pressed", "false");
      if (typeof label === "string") b.textContent = label;
      else b.appendChild(label);
      b.addEventListener("click", onClick);
      box.appendChild(b);
      return b;
    }

    function setOn(btn, on) {
      btn.classList.toggle("is-on", !!on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }

    // A labelled row of mutually exclusive pills. Returns its sync function.
    function radioRow(box, caption, options, get, set) {
      box.appendChild(el("span", "layer-toggles-label", caption));
      var pills = options.map(function (opt) {
        return {
          id: opt.id,
          btn: pill(box, opt.name, function () { set(opt.id); rebuild(); }),
        };
      });
      return function () {
        pills.forEach(function (p) { setOn(p.btn, p.id === get()); });
      };
    }

    /* ---------------- sentences ---------------- */

    function toggleSentence(n) {
      var at = selection.sentences.indexOf(n);
      if (at === -1) {
        selection.sentences.push(n);
        selection.sentences.sort(function (a, b) { return a - b; });
      } else if (selection.sentences.length > 1) {
        selection.sentences.splice(at, 1);
      } else {
        wjt.toast("Keep at least one sentence in the assignment.");
        return;
      }
      rebuild();
    }

    var sentencePills = lesson.sentences.map(function (s, i) {
      var n = i + 1;
      var text = String(s.text || "").trim();
      var label = document.createDocumentFragment();
      label.appendChild(el("b", "assign-sent-num", String(n)));
      label.appendChild(el("span", "assign-sent-text", snip(text)));
      var btn = pill(sentencesEl, label, function () { toggleSentence(n); });
      btn.classList.add("assign-sent-pill");
      btn.title = text;
      return { n: n, btn: btn };
    });

    function syncSentences() {
      sentencePills.forEach(function (p) {
        setOn(p.btn, selection.sentences.indexOf(p.n) !== -1);
      });
    }

    view.querySelector('[data-act="sent-all"]').addEventListener("click", function () {
      selection.sentences = lesson.sentences.map(function (_, i) { return i + 1; });
      rebuild();
    });

    /* ---------------- skills ----------------
     * Availability, the per-skill count, and the wording all come from the
     * model. An unavailable skill is disabled and the model's own reason is
     * printed below the row — this view never invents a generic message. */

    function toggleSkill(id) {
      var at = selection.skills.indexOf(id);
      if (at === -1) selection.skills.push(id);
      else if (selection.skills.length > 1) selection.skills.splice(at, 1);
      else { wjt.toast("Keep at least one skill selected."); return; }
      rebuild();
    }

    var skillPills = lessonSkills.map(function (s) {
      var label = document.createDocumentFragment();
      label.appendChild(document.createTextNode(s.name));
      var count = el("span", "pill-count", String(s.count));
      label.appendChild(count);
      return {
        id: s.id,
        count: count,
        btn: pill(skillsEl, label, function () { toggleSkill(s.id); }),
      };
    });

    function syncSkills(skills) {
      reasonsEl.innerHTML = "";
      skills.forEach(function (s) {
        var p = null;
        skillPills.forEach(function (x) { if (x.id === s.id) p = x; });
        if (!p) return;
        p.count.textContent = String(s.count);
        p.btn.disabled = !s.available;
        p.btn.title = s.available ? "" : s.reason;
        setOn(p.btn, s.available && selection.skills.indexOf(s.id) !== -1);
        if (s.available) return;
        var why = el("p", "muted-note assign-reason");
        why.appendChild(el("b", null, s.name + " — "));
        why.appendChild(document.createTextNode(s.reason));
        reasonsEl.appendChild(why);
      });
    }

    /* ---------------- count, supports, layout ---------------- */

    var countPills = wjt.assignment.COUNTS.map(function (c) {
      return {
        c: c,
        btn: pill(countEl, c === "all" ? "All" : String(c), function () {
          selection.count = c;
          rebuild();
        }),
      };
    });

    function syncCount() {
      countPills.forEach(function (p) { setOn(p.btn, selection.count === p.c); });
    }

    supportsEl.appendChild(el("span", "layer-toggles-label", "Supports"));
    var supportPills = [
      { key: "numberWords", name: "Number the words" },
      { key: "wordBank", name: "Word bank" },
    ].map(function (opt) {
      return {
        key: opt.key,
        btn: pill(supportsEl, opt.name, function () {
          selection[opt.key] = !selection[opt.key];
          rebuild();
        }),
      };
    });

    function syncSupports() {
      supportPills.forEach(function (p) { setOn(p.btn, selection[p.key]); });
    }

    var GROUPING_NAMES = { "passage-first": "Passage first", "per-sentence": "Per sentence" };
    var SPACING_NAMES = { compact: "Compact", standard: "Standard", generous: "Generous" };

    function named(ids, names) {
      return ids.map(function (id) { return { id: id, name: names[id] || id }; });
    }

    var syncGrouping = radioRow(groupingEl, "Questions",
      named(wjt.assignment.GROUPINGS, GROUPING_NAMES),
      function () { return selection.grouping; },
      function (id) { selection.grouping = id; });

    var syncSpacing = radioRow(spacingEl, "Writing space",
      named(wjt.assignment.SPACINGS, SPACING_NAMES),
      function () { return selection.spacing; },
      function (id) { selection.spacing = id; });

    /* ---------------- print ----------------
     * Color mode is the one control that changes what the *printer* does rather
     * than what the student sees, which is why it waited for a print surface to
     * be seen working on. Grayscale only removes decoration: every cue on the
     * sheet is a bracket, a weight, or a border. */

    var COLOR_MODE_NAMES = { color: "Color", grayscale: "Grayscale" };
    var syncColorMode = radioRow(colorModeEl, "Ink",
      named(wjt.assignment.COLOR_MODES, COLOR_MODE_NAMES),
      function () { return selection.colorMode; },
      function (id) { selection.colorMode = id; });

    keyOptsEl.appendChild(el("span", "layer-toggles-label", "Answer key"));
    var keyNotesPill = pill(keyOptsEl, "Include teaching notes", function () {
      keyNotes = !keyNotes;
      setOn(keyNotesPill, keyNotes);
    });

    view.querySelector('[data-act="print-sheet"]').addEventListener("click", function () {
      wjt.assignmentPrint.send(wjt.assignmentPrint.worksheet(result.assignment),
        "worksheet", result.assignment.title);
    });

    view.querySelector('[data-act="print-key"]').addEventListener("click", function () {
      wjt.assignmentPrint.send(wjt.assignmentPrint.answerKey(result.key, { notes: keyNotes }),
        "key", result.assignment.title + " — Answer Key");
    });

    /* A teacher who reaches for Ctrl+P instead of the buttons should get the
     * worksheet, not a screenshot of the builder. If a print document is
     * already mounted — which is the case for both buttons above, since
     * `send()` mounts before it opens the dialog — this leaves it alone. */
    function onBeforePrint() {
      if (document.documentElement.hasAttribute("data-print")) return;
      wjt.assignmentPrint.mount(wjt.assignmentPrint.worksheet(result.assignment),
        "worksheet", result.assignment.title);
    }
    window.addEventListener("beforeprint", onBeforePrint);

    // Leaving the builder mid-print (or with a dialog that never fired
    // `afterprint`) must not strand a hidden print document in the page.
    wjt.onViewCleanup(function () {
      window.removeEventListener("beforeprint", onBeforePrint);
      wjt.assignmentPrint.clear();
    });

    /* ---------------- readouts ----------------
     * poolSize is the model's own count of distinct questions. Showing it beside
     * the count control is the point: on the Declaration lesson "All" means 745
     * questions, and a teacher should meet that number before choosing, not
     * after. */

    function renderPool(result) {
      var pool = result.poolSize;
      var drawn = result.assignment.questions.length;
      poolEl.innerHTML = "";
      poolEl.appendChild(document.createTextNode(
        plural(pool, "question") + " available from the selected sentences and skills."));

      if (result.requested === "all") {
        poolEl.appendChild(el("span", "assign-warn", " “All” means " + plural(pool, "question") + "."));
      } else if (drawn < result.requested) {
        poolEl.appendChild(el("span", "assign-warn",
          " Asked for " + result.requested + " — the pool only makes " + drawn + "."));
      }

      // A selected sentence with no question is still printed (it's reading
      // context), so say so rather than dropping it: deselecting is the teacher's
      // call, and it's the only lever that shortens a long-sentence assignment.
      var used = {};
      result.assignment.questions.forEach(function (q) { used[q.sentence] = true; });
      var idle = result.assignment.sentences.filter(function (s) { return !used[s.number]; }).length;
      if (idle) {
        poolEl.appendChild(el("span", "assign-note",
          " " + plural(idle, "selected sentence") +
          (idle === 1 ? " has" : " have") + " no questions."));
      }
    }

    /* ---------------- rebuild ---------------- */

    var result = null;

    function rebuild() {
      result = wjt.assignment.build(lesson, selection);

      // Deselecting sentences can strand a skill that no longer has anything to
      // ask about. Drop those from the selection (never silently widen it: an
      // empty list would read as "all" in the model).
      var available = result.skills.filter(function (s) { return s.available; })
        .map(function (s) { return s.id; });
      var kept = selection.skills.filter(function (id) { return available.indexOf(id) !== -1; });
      if (kept.length !== selection.skills.length) {
        selection.skills = kept.length ? kept : available;
        result = wjt.assignment.build(lesson, selection);
      }

      syncSentences();
      syncSkills(result.skills);
      syncCount();
      syncSupports();
      syncGrouping();
      syncSpacing();
      syncColorMode();
      setOn(keyNotesPill, keyNotes);
      renderPool(result);

      statusEl.textContent = plural(result.assignment.questions.length, "question") +
        " drawn from a pool of " + result.poolSize + ".";

      sheetEl.innerHTML = "";
      sheetEl.appendChild(wjt.assignmentRender.sheet(result.assignment));
    }

    // Selection is deterministic in the seed, so identical inputs keep producing
    // identical questions. This is the only way to get a different draw — and it
    // is explicit, never a side effect of touching another control.
    view.querySelector('[data-act="regen"]').addEventListener("click", function () {
      selection.seed = wjt.assignment.newSeed();
      rebuild();
    });

    rebuild();
  };
})();
