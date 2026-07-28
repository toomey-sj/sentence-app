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
        promptEl.innerHTML = "Select the " +
          '<span class="prompt-label" style="--c:' + label.color + '">' +
          wjt.escapeHtml(label.name.toLowerCase()) + "</span> in this sentence.";

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

          // Reveal the answer by highlighting it on a fresh render.
          stageEl.innerHTML = "";
          var reveal = wjt.renderSentence(step.sentence, {
            layers: ["pos"],
            showAnnotations: false,
            highlight: { start: step.start, end: step.end },
          });
          stageEl.appendChild(reveal.root);

          settle(verdict.correct,
            "The " + wjt.escapeHtml(label.name.toLowerCase()) + " is “<b>" +
            wjt.escapeHtml(step.sentence.text.slice(step.start, step.end)) + "</b>”. " +
            label.desc +
            (step.note ? '<p class="ann-note">📌 ' + wjt.escapeHtml(step.note) + "</p>" : ""));
        });
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

      if (missed.length) {
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
        i = 0; correct = 0; answered = 0; missed = [];
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
