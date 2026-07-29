/* Sentence Forge — Study mode: a self-paced student unit.
 *
 * Two screens behind one view:
 *   #/study/<unitId>            the unit map — clusters, stops, progress
 *   #/study/<unitId>/<stopId>   one stop — teach screens and quizzes, one step
 *                               at a time, then a results screen
 *
 * Sequencing, question generation, and scoring live in js/study-model.js; this
 * file only draws. It reuses wjt.renderSentence for every passage and the
 * existing .quiz-* chrome for the question screens, so a question here looks and
 * behaves like a question everywhere else in the app.
 *
 * Design record: plans/proposals/curriculum-unit-1-parts-of-speech.md
 */
(function () {
  "use strict";
  var wjt = (window.wjt = window.wjt || {});
  wjt.views = wjt.views || {};

  function pct(n) { return Math.round(n * 100); }

  /** "a" or "an" in front of a label's name. A plain vowel test is enough for
   *  this taxonomy — every name it has to handle is "an adjective", "an adverb
   *  of manner", "an irregular verb", "a helping (auxiliary) verb". */
  function article(name) { return /^[aeiou]/i.test(name) ? "an" : "a"; }

  /** A full stop, unless the text already ends in punctuation of its own. Poe's
   *  tokens carry theirs — "vaults." and 'ugh!"' — and “vaults.”. reads as a
   *  typo. Takes the RAW word, not the escaped one, so &quot; can't hide the
   *  quote mark that ends it. */
  function stopAfter(raw) { return /[.!?,;:"'”’]$/.test(raw) ? "" : "."; }

  /** A label's swatch + name + description + example, as used on teach screens. */
  function labelCardHtml(id) {
    var l = wjt.LABELS[id];
    if (!l) return "";
    return '<div class="study-label">' +
      '<div class="study-label-head">' +
      '<span class="swatch" style="--c:' + l.color + '"></span>' +
      "<b>" + wjt.escapeHtml(l.name) + "</b>" +
      '<code class="study-label-id">' + wjt.escapeHtml(id) + "</code>" +
      "</div>" +
      "<p>" + l.desc + "</p>" +
      '<p class="study-label-eg">' + l.example + "</p>" +
      "</div>";
  }

  /* ------------------------------------------------------------------ *
   * The unit map
   * ------------------------------------------------------------------ */
  function renderMap(view, unit) {
    var progress = wjt.study.progress.read(unit.id);
    var next = wjt.study.nextStop(unit.id, progress);
    var doneCount = 0, total = 0;

    wjt.study.stops(unit.id).forEach(function (s) {
      if (s.todo) return;
      total++;
      if (progress.done[s.id]) doneCount++;
    });

    var html =
      '<header class="study-head">' +
      '  <div>' +
      "    <h2>" + wjt.escapeHtml(unit.title) + "</h2>" +
      '    <p class="muted-note">' + wjt.escapeHtml(unit.subtitle) + "</p>" +
      "  </div>" +
      '  <a class="btn btn-ghost" href="#/library">Library</a>' +
      "</header>" +
      '<section class="card study-intro">' +
      "  <p>" + wjt.escapeHtml(unit.intro) + "</p>" +
      '  <p class="muted-note study-source">' + wjt.escapeHtml(unit.source) + "</p>" +
      '  <div class="btn-row">' +
      (next
        ? '    <a class="btn btn-primary btn-big" href="#/study/' + unit.id + "/" + next.id + '">' +
          (progress.done[next.id] || doneCount ? "Continue" : "Start") + ": " +
          wjt.escapeHtml(next.title) + " →</a>"
        : '    <span class="muted-note">Every lesson available so far is complete. 🏆</span>') +
      '    <span class="spacer"></span>' +
      '    <span class="muted-note">' + doneCount + " of " + total + " complete</span>" +
      (doneCount ? '    <button class="btn btn-sm" data-act="reset">Reset my progress</button>' : "") +
      "  </div>" +
      "</section>";

    wjt.study.clusters(unit.id).forEach(function (cluster) {
      html += '<section class="study-cluster">' +
        '<h3 class="section-title">' + wjt.escapeHtml(cluster.title) + "</h3>" +
        '<div class="study-stops">';

      cluster.stops.forEach(function (s) {
        var isDone = !!progress.done[s.id];
        var isNext = next && next.id === s.id;
        var cls = "study-stop" + (s.todo ? " is-todo" : "") +
          (isDone ? " is-done" : "") + (isNext ? " is-next" : "");
        var body =
          '<div class="study-stop-n">' + (s.todo ? "•" : isDone ? "✓" : s.n) + "</div>" +
          "<div class=\"study-stop-body\"><b>" + wjt.escapeHtml(s.title) + "</b>" +
          '<p class="muted-note">' + wjt.escapeHtml(s.blurb) + "</p>" +
          (s.todo
            ? '<p class="study-stop-state">Coming soon</p>'
            : isDone
              ? '<p class="study-stop-state">Best score ' + pct(progress.best[s.id] || 0) + "%</p>"
              : "") +
          "</div>";

        html += s.todo
          ? '<div class="' + cls + '" aria-disabled="true">' + body + "</div>"
          : '<a class="' + cls + '" href="#/study/' + unit.id + "/" + s.id + '">' + body + "</a>";
      });

      html += "</div></section>";
    });

    view.innerHTML = html;

    var resetBtn = view.querySelector('[data-act="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        wjt.confirmDialog({
          message: "Reset your progress through this unit? Your place and your scores " +
            "on this computer will be cleared. Nothing else is affected.",
          confirmText: "Reset",
          danger: true,
          onConfirm: function () {
            wjt.study.progress.reset(unit.id);
            renderMap(view, unit);
            wjt.toast("Progress reset.");
          },
        });
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * The `sort` step: several words, one bucket per part of speech.
   *
   * TAP TO ASSIGN, NEVER DRAG. pilot.md names drag-to-select on a tablet as the
   * single most likely broken thing in the product, and this is a student-facing
   * surface with no teacher in the room to work around it. Tap a word to pick it
   * up, tap a bucket to drop it in, tap a placed word to take it back out.
   *
   * THE CHIPS NEVER MOVE. Where a word has been placed shows as a tag on the chip
   * itself and in its accessible name — so the answer is never carried by colour
   * or by position alone, and a keyboard user's focus is never yanked away to a
   * re-parented element. Every control here is a real <button>: Tab reaches it,
   * Enter and Space activate it, and the arrow keys walk a group as a convenience.
   * ------------------------------------------------------------------ */
  function renderSort(step, promptEl, stageEl, answersEl, settle) {
    var assigned = {};                       // { word: bucketId }
    var picked = "";                         // the word waiting for a bucket
    var scored = false;

    promptEl.innerHTML = step.stem;

    stageEl.innerHTML =
      '<div class="sort-words" data-role="words" role="group" aria-label="Words to sort"></div>' +
      '<div class="sort-buckets" data-role="buckets" role="group" aria-label="Parts of speech"></div>' +
      '<p class="sort-status muted-note" data-role="status" role="status" aria-live="polite"></p>';

    var wordsEl = stageEl.querySelector('[data-role="words"]');
    var bucketsEl = stageEl.querySelector('[data-role="buckets"]');
    var statusEl = stageEl.querySelector('[data-role="status"]');

    function nameOf(id) { return (wjt.LABELS[id] || {}).name || id; }
    function colorOf(id) { return (wjt.LABELS[id] || {}).color || "var(--muted)"; }
    function placedCount() {
      return step.words.filter(function (w) { return !!assigned[w]; }).length;
    }
    function announce(msg) {
      statusEl.textContent = msg + " " + placedCount() + " of " + step.words.length + " placed.";
    }
    function noteHtml() {
      return step.note ? '<p class="ann-note">📌 ' + wjt.escapeHtml(step.note) + "</p>" : "";
    }

    function onWord(w) {
      if (scored) return;
      if (assigned[w]) {
        delete assigned[w];
        picked = "";
        paint();
        announce("“" + w + "” taken back out.");
        return;
      }
      picked = picked === w ? "" : w;
      paint();
      announce(picked ? "“" + w + "” picked up — now choose a part of speech."
        : "“" + w + "” put down.");
    }

    function onBucket(id) {
      if (scored) return;
      if (!picked) { wjt.toast("Tap a word first, then tap where it goes."); return; }
      var w = picked;
      assigned[w] = id;
      picked = "";
      paint();
      announce("“" + w + "” placed in " + nameOf(id) + ".");
    }

    /** Redraw both groups from `assigned` and `picked`. Element identity is
     *  preserved, so whatever had focus keeps it. */
    function paint() {
      var counts = {};
      Array.prototype.forEach.call(wordsEl.querySelectorAll(".sort-word"), function (el) {
        var w = el.getAttribute("data-word");
        var at = assigned[w] || "";
        if (at) counts[at] = (counts[at] || 0) + 1;
        el.className = "sort-word" + (picked === w ? " is-picked" : "") + (at ? " is-placed" : "");
        el.setAttribute("aria-pressed", picked === w ? "true" : "false");
        el.style.setProperty("--c", at ? colorOf(at) : "var(--line)");
        el.innerHTML = "<span>" + wjt.escapeHtml(w) + "</span>" +
          '<span class="sort-word-tag">' +
          (at ? wjt.escapeHtml(nameOf(at)) : "not placed") + "</span>";
        el.setAttribute("aria-label", w + " — " + (at
          ? "placed in " + nameOf(at) + ". Activate to take it out."
          : picked === w
            ? "picked up. Choose a part of speech."
            : "not placed. Activate to pick it up."));
      });
      Array.prototype.forEach.call(bucketsEl.querySelectorAll(".sort-bucket"), function (el) {
        var id = el.getAttribute("data-bucket");
        var n = counts[id] || 0;
        el.querySelector('[data-role="n"]').textContent = n ? String(n) : "";
        el.setAttribute("aria-label", nameOf(id) + " — " + n + " word" + (n === 1 ? "" : "s") +
          (picked ? ". Activate to put “" + picked + "” here." : ""));
      });
    }

    /** Arrow keys walk one group. Every button stays tabbable, so this only ever
     *  adds a way to move — it never takes the Tab route away. */
    function arrowKeys(host) {
      host.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!dir) return;
        var all = Array.prototype.slice.call(host.querySelectorAll("button"));
        var at = all.indexOf(document.activeElement);
        if (at === -1) return;
        e.preventDefault();
        all[(at + dir + all.length) % all.length].focus();
      });
    }

    step.words.forEach(function (w) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sort-word";
      b.setAttribute("data-word", w);
      b.addEventListener("click", function () { onWord(w); });
      wordsEl.appendChild(b);
    });

    step.buckets.forEach(function (id) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sort-bucket";
      b.setAttribute("data-bucket", id);
      b.style.setProperty("--c", colorOf(id));
      b.innerHTML = '<span class="swatch" style="--c:' + colorOf(id) + '"></span>' +
        "<b>" + wjt.escapeHtml(nameOf(id)) + "</b>" +
        '<span class="sort-bucket-n" data-role="n"></span>';
      b.addEventListener("click", function () { onBucket(id); });
      bucketsEl.appendChild(b);
    });

    arrowKeys(wordsEl);
    arrowKeys(bucketsEl);
    paint();
    statusEl.textContent = "Tap a word, then tap the part of speech it belongs to. " +
      "0 of " + step.words.length + " placed.";

    answersEl.innerHTML =
      '<button class="btn btn-primary" data-act="check">Check ✓</button>' +
      '<button class="btn" data-act="clear">Start over</button>';

    answersEl.querySelector('[data-act="clear"]').addEventListener("click", function () {
      if (scored) return;
      assigned = {};
      picked = "";
      paint();
      announce("Cleared.");
    });

    answersEl.querySelector('[data-act="check"]').addEventListener("click", function () {
      var verdict = wjt.study.check(step, assigned);
      // An unfinished answer is refused rather than marked wrong — the same
      // contract as pressing Check on a `tap` with nothing selected.
      if (verdict.detail.placed < verdict.detail.total) {
        wjt.toast("Place every word first — " + verdict.detail.placed + " of " +
          verdict.detail.total + " so far.");
        return;
      }
      scored = true;
      var wrong = verdict.detail.wrong;

      Array.prototype.forEach.call(wordsEl.querySelectorAll(".sort-word"), function (el) {
        var w = el.getAttribute("data-word");
        var ok = wrong.indexOf(w) === -1;
        el.disabled = true;
        el.classList.add(ok ? "is-right" : "is-wrong");
        el.style.setProperty("--c", colorOf(step.expected[w]));
        el.querySelector(".sort-word-tag").textContent = ok
          ? nameOf(step.expected[w])
          : nameOf(assigned[w]) + " → " + nameOf(step.expected[w]);
        el.setAttribute("aria-label", w + " — " + (ok
          ? "correct, " + nameOf(step.expected[w]) + "."
          : "incorrect. You placed it in " + nameOf(assigned[w]) + "; it belongs in " +
            nameOf(step.expected[w]) + "."));
      });
      Array.prototype.forEach.call(bucketsEl.querySelectorAll("button"), function (b) {
        b.disabled = true;
      });
      Array.prototype.forEach.call(answersEl.querySelectorAll("button"), function (b) {
        b.disabled = true;
      });

      settle(verdict.correct, verdict.correct
        ? "All " + step.words.length + " words in the right place." + noteHtml()
        : wrong.length + " of " + step.words.length + " ended up in the wrong place. " +
          wrong.map(function (w) {
            return "“<b>" + wjt.escapeHtml(w) + "</b>” is a " +
              wjt.escapeHtml(nameOf(step.expected[w]).toLowerCase());
          }).join("; ") + "." + noteHtml());
    });
  }

  /* ------------------------------------------------------------------ *
   * One stop
   * ------------------------------------------------------------------ */
  function renderStop(view, unit, stop) {
    var steps = wjt.study.steps(unit.id, stop.id);
    var scorable = wjt.study.scorable(steps);

    if (!steps.length) {
      view.innerHTML =
        '<div class="card empty-state"><div class="empty-emoji">🚧</div>' +
        "<h3>" + wjt.escapeHtml(stop.title) + " isn’t ready yet</h3>" +
        "<p>This lesson is still being written. The ones before it are ready.</p>" +
        '<div class="btn-row btn-row-center">' +
        '<a class="btn btn-primary" href="#/study/' + unit.id + '">← Back to the unit</a></div></div>';
      return;
    }

    wjt.study.progress.visit(unit.id, stop.id);

    var i = 0;
    var correct = 0;
    var answered = 0;
    var missed = [];
    /* Every verdict, in play order, so the results screen can report by cluster.
     * In memory only, and dropped when this screen goes away — see decision C6:
     * no per-question record is ever written, even locally. */
    var records = [];

    function renderStep() {
      var step = steps[i];
      var scoredSoFar = steps.slice(0, i).filter(function (s) { return s.kind !== "teach"; }).length;

      view.innerHTML =
        '<header class="quiz-head">' +
        '  <a class="btn btn-ghost btn-sm" href="#/study/' + unit.id + '" title="Back to the unit">✕</a>' +
        '  <div class="quiz-progress"><div class="quiz-progress-fill" style="width:' +
        Math.round((i / steps.length) * 100) + '%"></div></div>' +
        '  <span class="muted-note study-stop-label">' + wjt.escapeHtml(stop.title) + "</span>" +
        (answered ? '  <span class="quiz-score">' + correct + " ✓</span>" : "") +
        "</header>" +
        '<section class="card quiz-card">' +
        '  <div class="quiz-count" id="study-count">Step ' + (i + 1) + " of " + steps.length +
        (step.kind === "teach" ? "" : " · question " + (scoredSoFar + 1) + " of " + scorable.length) +
        "</div>" +
        '  <h3 class="quiz-prompt" data-role="prompt" aria-describedby="study-count"></h3>' +
        '  <div class="study-body" data-role="body"></div>' +
        '  <div class="quiz-stage" data-role="stage"></div>' +
        '  <div class="quiz-answers" data-role="answers" role="group"></div>' +
        '  <div class="quiz-feedback" data-role="feedback" role="status" aria-live="polite" hidden></div>' +
        "</section>";

      var promptEl = view.querySelector('[data-role="prompt"]');
      var bodyEl = view.querySelector('[data-role="body"]');
      var stageEl = view.querySelector('[data-role="stage"]');
      var answersEl = view.querySelector('[data-role="answers"]');
      var feedbackEl = view.querySelector('[data-role="feedback"]');

      function advance() {
        i++;
        if (i < steps.length) renderStep();
        else finish();
      }

      /** Show the verdict, then a button to move on. */
      function settle(isCorrect, detailHtml) {
        answered++;
        if (isCorrect) correct++;
        else missed.push(step);
        records.push({ step: step, correct: isCorrect });

        feedbackEl.hidden = false;
        feedbackEl.className = "quiz-feedback " + (isCorrect ? "is-right" : "is-wrong");
        feedbackEl.innerHTML =
          "<b>" + (isCorrect ? "Correct." : "Not quite.") + "</b> " + detailHtml +
          '<div class="btn-row"><button class="btn btn-primary" data-act="next">' +
          (i + 1 < steps.length ? "Next →" : "See results →") + "</button></div>";
        var nextBtn = feedbackEl.querySelector('[data-act="next"]');
        nextBtn.addEventListener("click", advance);
        nextBtn.focus();
      }

      if (step.kind === "teach") {
        promptEl.textContent = step.heading;
        bodyEl.innerHTML = step.body +
          (step.labels.length
            ? '<div class="study-labels">' + step.labels.map(labelCardHtml).join("") + "</div>"
            : "");
        answersEl.innerHTML =
          '<button class="btn btn-primary btn-big" data-act="next">' +
          (i + 1 < steps.length ? "Got it →" : "Finish →") + "</button>";
        answersEl.querySelector('[data-act="next"]').addEventListener("click", advance);

      } else if (step.kind === "choice") {
        promptEl.innerHTML = step.stem;
        step.options.forEach(function (opt, oi) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "quiz-option study-choice";
          b.innerHTML = opt.text;
          b.addEventListener("click", function () {
            answersEl.querySelectorAll("button").forEach(function (o) { o.disabled = true; });
            var verdict = wjt.study.check(step, oi);
            b.classList.add(verdict.correct ? "is-right" : "is-wrong");
            // Colour alone doesn't reach a screen reader.
            b.setAttribute("aria-label", b.textContent +
              (verdict.correct ? " — correct answer" : " — your choice, incorrect"));
            if (!verdict.correct) {
              answersEl.querySelectorAll("button").forEach(function (o, oj) {
                if (step.options[oj] && step.options[oj].correct) {
                  o.classList.add("is-right");
                  o.setAttribute("aria-label", o.textContent + " — correct answer");
                }
              });
            }
            settle(verdict.correct, opt.feedback);
          });
          answersEl.appendChild(b);
        });

      } else if (step.kind === "tap") {
        var label = wjt.LABELS[step.label];
        var name = wjt.escapeHtml(label.name.toLowerCase());
        var accept = step.accept || [];
        var howMany = accept.length;

        /* A sentence with six prepositions must not ask for "the" preposition.
         * Every one of them scores right (see tapStepsFor), so the question says
         * how many there are and asks for any one. That is also the honest thing
         * to ask of real Poe rather than of a sentence built to have one answer.
         *
         * The label name stays SINGULAR here on purpose: "adverb of frequency"
         * and "particle (phrasal verb)" have no naive +s plural, so the count
         * goes in a clause of its own instead of into the noun. */
        var chip = '<span class="prompt-label" style="--c:' + label.color + '">' +
          name + "</span>";
        promptEl.innerHTML = howMany > 1
          ? "Select any <b>one</b> " + chip + " in this sentence — there are " +
            howMany + "."
          : "Select the " + chip + " in this sentence.";

        var r = wjt.renderSentence(step.sentence, {
          layers: ["pos"],
          showAnnotations: false,
          interactive: true,
        });
        stageEl.appendChild(r.root);
        var tip = document.createElement("div");
        tip.className = "sentence-tip";
        tip.textContent = "Click a word (or drag across several; or Tab to a word and use " +
          "Shift+Arrow), then press Check.";
        stageEl.appendChild(tip);

        answersEl.innerHTML =
          '<button class="btn btn-primary" data-act="check">Check ✓</button>' +
          '<button class="btn" data-act="clear">Clear</button>';
        answersEl.querySelector('[data-act="clear"]').addEventListener("click", function () {
          r.selection.clear();
        });
        answersEl.querySelector('[data-act="check"]').addEventListener("click", function () {
          var sel = r.selection.get();
          if (!sel) { wjt.toast("Select a word first."); return; }
          answersEl.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

          var verdict = wjt.study.check(step, sel);

          /* Reveal the word the STUDENT picked when it was one of the right ones,
           * and the generator's own when it wasn't. Accepting a pick and then
           * highlighting a different word — which is what this did while `accept`
           * held only token ranges — is what made a third of these questions read
           * as broken: "Correct." over a sentence pointing somewhere else. */
          var shown = null;
          accept.forEach(function (r) {
            if (r.first === sel.first && r.last === sel.last) shown = r;
          });
          if (!shown) shown = { start: step.start, end: step.end };

          stageEl.innerHTML = "";
          var reveal = wjt.renderSentence(step.sentence, {
            layers: ["pos"],
            showAnnotations: false,
            highlight: { start: shown.start, end: shown.end },
          });
          stageEl.appendChild(reveal.root);

          function rawAt(r) { return step.sentence.text.slice(r.start, r.end); }
          function wordAt(r) { return wjt.escapeHtml(rawAt(r)); }

          /* Name the alternatives when there are few enough to be worth reading:
           * one of them by name when there are two, a list up to six, and nothing
           * beyond that — the interjection passage has fifteen identical "ugh!"s,
           * and reciting them teaches nothing the count hasn't already said. */
          var others = "";
          if (howMany === 2) {
            var other = accept.filter(function (r) { return r.start !== shown.start; })[0];
            others = " The other one is “<b>" + wordAt(other) + "</b>”" +
              stopAfter(rawAt(other));
          } else if (howMany > 2 && howMany <= 6) {
            others = " All " + howMany + " here: " + accept.map(wordAt).join(", ") +
              stopAfter(rawAt(accept[accept.length - 1]));
          }

          settle(verdict.correct,
            (howMany > 1
              ? (verdict.correct
                ? "“<b>" + wordAt(shown) + "</b>” is " + article(label.name) + " " +
                  name + " — one of the " + howMany + " in this sentence." + others
                : "One of the " + howMany + " is “<b>" + wordAt(shown) + "</b>”" +
                  stopAfter(rawAt(shown)) + others)
              : "The " + name + " is “<b>" + wordAt(shown) + "</b>”" +
                stopAfter(rawAt(shown))) + " " +
            label.desc +
            (step.note ? '<p class="ann-note">📌 ' + wjt.escapeHtml(step.note) + "</p>" : ""));
        });

      } else if (step.kind === "sort") {
        renderSort(step, promptEl, stageEl, answersEl, settle);
      }

      answersEl.setAttribute("aria-label", promptEl.textContent);

      // Each step replaces innerHTML, which drops focus to <body>. Land it on
      // the heading, which describes itself with the "Step N of M" count.
      promptEl.setAttribute("tabindex", "-1");
      try { promptEl.focus({ preventScroll: true }); } catch (e) { promptEl.focus(); }
    }

    /* -------- results -------- */
    function finish() {
      var fraction = scorable.length ? correct / scorable.length : 1;
      wjt.study.progress.complete(unit.id, stop.id, fraction);

      var p = pct(fraction);
      var msg = p === 100 ? "Perfect. 🏆"
        : p >= 80 ? "Strong work. 🌟"
        : p >= 60 ? "Getting there — worth another pass. 💪"
        : "Review this one and go again. 📚";

      var next = wjt.study.nextStop(unit.id, wjt.study.progress.read(unit.id));

      view.innerHTML =
        '<section class="card quiz-results">' +
        '  <div class="score-ring" style="--pct:' + p + '"><span>' + p + "%</span></div>" +
        "  <h2>" + msg + "</h2>" +
        '  <p class="muted-note">' + correct + " of " + scorable.length +
        " correct · " + wjt.escapeHtml(stop.title) + "</p>" +
        '  <div data-role="missed"></div>' +
        '  <div class="btn-row btn-row-center">' +
        (next && next.id !== stop.id
          ? '    <a class="btn btn-primary btn-big" href="#/study/' + unit.id + "/" + next.id +
            '">Next: ' + wjt.escapeHtml(next.title) + " →</a>"
          : "") +
        '    <button class="btn" data-act="again">↻ Try this again</button>' +
        '    <a class="btn" href="#/study/' + unit.id + '">← The unit</a>' +
        "  </div>" +
        "</section>";

      var heading = view.querySelector("h2");
      heading.setAttribute("tabindex", "-1");
      try { heading.focus({ preventScroll: true }); } catch (e) { heading.focus(); }

      /* An assessment reports by CLUSTER, not by item. Thirty rights and wrongs
       * are not something a student can act on; "Words that modify — 4 of 7,
       * revisit Review C" is, because navigation is open and that stop is one
       * click away. Focus lessons keep the flat list, which is the right shape
       * for a stop with ten questions about one part of speech. */
      if (stop.resultsBy === "cluster") {
        var report = wjt.study.clusterReport(unit.id, records);
        var cbox = view.querySelector('[data-role="missed"]');
        var ch = document.createElement("h3");
        ch.textContent = "How each part of the unit held up:";
        cbox.appendChild(ch);
        var list = document.createElement("div");
        list.className = "cluster-report";
        report.forEach(function (r) {
          var row = document.createElement("div");
          var clean = r.right === r.total;
          row.className = "cluster-row" + (clean ? " is-clean" : "");
          row.innerHTML =
            // A row the model left untitled is the cross-cluster one.
            "<div><b>" + wjt.escapeHtml(r.title || "Everything at once") + "</b>" +
            '<div class="muted-note">' + r.right + " of " + r.total + " correct</div></div>" +
            (clean
              ? '<span class="cluster-tick" aria-hidden="true">✓</span>'
              : r.stopId
                ? '<a class="btn btn-sm" href="#/study/' + unit.id + "/" + r.stopId +
                  '">Revisit →</a>'
                : "");
          list.appendChild(row);
        });
        cbox.appendChild(list);

      } else if (missed.length) {
        var box = view.querySelector('[data-role="missed"]');
        var h = document.createElement("h3");
        h.textContent = "Worth another look:";
        box.appendChild(h);
        missed.forEach(function (s) {
          var row = document.createElement("div");
          row.className = "missed-row";
          if (s.kind === "tap") {
            var l = wjt.LABELS[s.label];
            row.innerHTML =
              '<span class="swatch" style="--c:' + l.color + '"></span>' +
              "<div><b>" + wjt.escapeHtml(l.name) + "</b>: “" +
              wjt.escapeHtml(s.sentence.text.slice(s.start, s.end)) + "”" +
              '<div class="muted-note">' + wjt.escapeHtml(s.sentence.text) + "</div></div>";
          } else if (s.kind === "sort") {
            row.innerHTML =
              '<span class="swatch" style="--c:var(--muted)"></span>' +
              "<div>" + s.stem +
              '<div class="muted-note">Answer: ' +
              s.words.map(function (w) {
                return wjt.escapeHtml(w) + " → " +
                  wjt.escapeHtml((wjt.LABELS[s.expected[w]] || {}).name || s.expected[w]);
              }).join(" · ") + "</div></div>";
          } else {
            var answer = s.options.filter(function (o) { return o.correct; })[0];
            row.innerHTML =
              '<span class="swatch" style="--c:var(--muted)"></span>' +
              "<div>" + s.stem +
              '<div class="muted-note">Answer: ' + (answer ? answer.text : "") + "</div></div>";
          }
          box.appendChild(row);
        });
      }

      view.querySelector('[data-act="again"]').addEventListener("click", function () {
        i = 0; correct = 0; answered = 0; missed = []; records = [];
        steps = wjt.study.steps(unit.id, stop.id);
        scorable = wjt.study.scorable(steps);
        renderStep();
      });
    }

    renderStep();
  }

  /* ------------------------------------------------------------------ *
   * View entry
   * ------------------------------------------------------------------ */
  wjt.views.study = function (container, unitId, stopId) {
    var unit = wjt.study.unit(unitId);
    if (!unit) { location.hash = "#/"; return; }

    container.innerHTML = "";
    var view = document.createElement("div");
    view.className = "view view-study";
    container.appendChild(view);

    if (!stopId) { renderMap(view, unit); return; }

    var stop = wjt.study.stop(unitId, stopId);
    if (!stop) { location.hash = "#/study/" + unitId; return; }
    renderStop(view, unit, stop);
  };
})();
