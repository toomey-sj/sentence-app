/* Sentence Forge — Unit 1: The Nine Parts of Speech. The unit itself.
 *
 * The content of a self-paced student unit. This file holds the authoring
 * helpers, the cluster titles, the label budget, Orientation, and the
 * `wjt.study.register` call. The passages and stops of each cluster live in a
 * file of their own, because all of it together ran past 2,300 lines:
 *
 *   js/unit-pos.js            this file — helpers, Orientation, registration
 *   js/unit-pos-a.js          Cluster A — nouns, determiners, pronouns, Review A
 *   js/unit-pos-b.js          Cluster B — verbs, Review B
 *   js/unit-pos-c.js          Cluster C — adjectives, adverbs, Review C
 *   js/unit-pos-d.js          Cluster D — prepositions, conjunctions,
 *                             interjections, Review D
 *   js/unit-pos-capstone.js   the Capstone
 *
 * LOAD ORDER IS PATH ORDER. Each cluster file calls `wjt.unitPos.stops()`, which
 * appends to the array this file already handed to `wjt.study.register` — so the
 * order of the <script> tags in index.html is the order of the unit map. Nothing
 * reads the unit at load time, which is what makes filling it afterwards safe.
 * tools/smoke-test.js asserts the stops come out numbered 0…14 in order, so a
 * mis-ordered script tag fails a check rather than quietly reshuffling the unit.
 *
 * The engine that sequences and scores all of this is js/study-model.js; the
 * screens are js/study.js.
 *
 * Design record: plans/proposals/curriculum-unit-1-parts-of-speech.md.
 * Read it before editing any of these files — especially the label budget and
 * C5/C10.
 *
 * PASSAGE — Edgar Allan Poe, "The Cask of Amontillado" (1846), public domain,
 * from Project Gutenberg ebook 1063. Three typographic normalizations were
 * applied and NO word was changed:
 *   1. lines wrapped mid-sentence joined,
 *   2. _italic_ underscores stripped   (_very_ is otherwise ONE token),
 *   3. "--" -> " — " spaced em dash    (settled--but is otherwise ONE token).
 * Rules 2 and 3 are load-bearing: skip either and a word becomes permanently
 * unlabellable, silently.
 *
 * AUTHORING — every passage is labelled ONE POS LABEL PER TOKEN via the `line()`
 * helper below, which takes a label per token in order. That is deliberate on two
 * counts:
 *   • It cannot misresolve. The `sentence()` helper in examples.js matches
 *     substrings, and short function words collide — "he" matches inside "The",
 *     "in" inside "wine" — which silently labels the wrong word.
 *   • ONE label per word, never a base AND its subtype on the same token
 *     (decision C5). Two annotations over one span would generate two questions
 *     with the same highlighted word and two different correct answers, which is
 *     unfair in a quiz with no teacher in the room. parts-of-speech-close-up
 *     double-labels on purpose, to drive the renderer's two-row POS display;
 *     this unit trades that display for fair questions.
 *
 * No `types` badges and no part/phrase/clause annotations (decision C10):
 * sentence structure is Unit 2's subject, and a sentence with no badge is treated
 * by tools/completeness.js as an intentional fragment, so only the
 * POS-on-every-word rule applies here.
 *
 * DOM-free: tools/smoke-test.js runs this in a bare vm sandbox.
 */
(function () {
  "use strict";
  var wjt = (window.wjt = window.wjt || {});

  /* ------------------------------------------------------------------ *
   * Authoring helpers
   * ------------------------------------------------------------------ */

  /**
   * One sentence, labelled by position.
   * `labels` holds one entry per token, in order: a label id, or "" for a
   * punctuation-only token that needs none. `notes` optionally maps a token
   * index to a teaching note.
   *
   * A length mismatch is a hard authoring error — it means the text changed
   * without the labels following. It warns here and tools/smoke-test.js fails.
   */
  function line(text, labels, notes) {
    var tokens = wjt.tokenize(text);
    var anns = [];

    if (labels.length !== tokens.length) {
      if (window.console) {
        console.warn("unit-pos: " + labels.length + " labels for " + tokens.length +
          " tokens in " + JSON.stringify(text));
      }
    }

    tokens.forEach(function (t, i) {
      var id = labels[i];
      if (!id) return;                       // punctuation-only token
      if (!wjt.LABELS[id]) {
        if (window.console) console.warn("unit-pos: unknown label " + id + " in " + JSON.stringify(text));
        return;
      }
      var span = wjt.tokensToSpan(tokens, i, i);
      anns.push({
        id: wjt.uid(),
        start: span.start,
        end: span.end,
        label: id,
        note: (notes && notes[i]) || "",
      });
    });

    return { text: text, annotations: anns };
  }

  /** Assemble a unit passage as a lesson. POS layer only, Essential palette. */
  function passage(title, description, sentences) {
    var lesson = wjt.store.create(title);
    lesson.description = description;
    lesson.sentences = sentences;
    lesson.layers = ["pos"];
    lesson.essentialOnly = true;
    return lesson;
  }

  var CLUSTERS = {
    start: "Getting started",
    A: "Cluster A — Words that name",
    B: "Cluster B — The word that acts",
    C: "Cluster C — Words that modify",
    D: "Cluster D — Words that connect and exclaim",
    end: "Showing what you know",
  };

  /* The six POS labels this unit deliberately does NOT teach. Asserted by
   * tools/smoke-test.js so the budget cannot drift.
   *   - verbals belong with phrases (Unit 2): they are verb FORMS doing another
   *     part of speech's job, which is a phrase-level idea;
   *   - the other three are tier: "advanced".  */
  var EXCLUDED = ["gerund", "participle", "infinitive",
    "particle", "relative-adverb", "emphatic-pronoun"];

  /* Filled in load order by the js/unit-pos-*.js files — see the note at the top
   * of this file. Registered below while still empty, on purpose: nothing reads
   * a unit's stops until a student opens the map. */
  var STOPS = [];

  /* The authoring surface the cluster files use, and the only thing they touch. */
  wjt.unitPos = {
    line: line,
    passage: passage,

    /** Append stops, in path order. */
    stops: function (list) {
      list.forEach(function (s) { STOPS.push(s); });
      return STOPS;
    },

    /** Register passages as ordinary examples, so a teacher can Present or Edit
     *  them and tools/smoke-test.js validates them for free. */
    examples: function (list) {
      wjt.EXAMPLES = (wjt.EXAMPLES || []).concat(list);
      return wjt.EXAMPLES;
    },

    /** The 48 labels this unit teaches: every POS label but the six excluded.
     *  Derived rather than listed, so a taxonomy change cannot leave a
     *  hand-written copy of the budget behind. The capstone uses it as its
     *  `focus`, which for an assessment means "anything in the budget is fair
     *  game" rather than "this stop teaches all of these". */
    budget: function () {
      return wjt.labelsForLayer("pos").filter(function (id) {
        return EXCLUDED.indexOf(id) === -1;
      });
    },
  };

  /* ------------------------------------------------------------------ *
   * Orientation — four short sentences that between them contain all nine
   * parts of speech, each labelled with its BASE label only.
   * ------------------------------------------------------------------ */
  function buildOrientation() {
    return passage(
      "Unit 1 · Orientation — All Nine at Once",
      "Poe, \"The Cask of Amontillado\": four short sentences containing all nine parts of speech.",
      [
        line("The man wore motley.",
          ["determiner", "noun", "verb", "noun"],
          { 3: "Motley is the patched costume of a jester — here it is a thing, so it is a noun." }),

        line("The wine sparkled in his eyes and the bells jingled.",
          ["determiner", "noun", "verb", "preposition", "adjective", "noun",
            "conjunction", "determiner", "noun", "verb"],
          {
            3: "\"In\" shows a relationship of place, so it is a preposition.",
            4: "\"His\" sits in front of a noun and describes it, so it works as an adjective here.",
            6: "\"And\" joins two complete ideas, so it is a conjunction.",
          }),

        line("Indeed, it is very damp.",
          ["adverb", "pronoun", "verb", "adverb", "adjective"],
          {
            1: "\"It\" stands in for a thing already named, so it is a pronoun.",
            3: "\"Very\" modifies the adjective \"damp\" — an adverb can modify more than a verb.",
          }),

        line("\"Good!\" he said.",
          ["interjection", "pronoun", "verb"],
          { 0: "An interjection expresses sudden feeling and stands outside the sentence's structure." }),
      ]
    );
  }

  wjt.unitPos.examples([
    {
      id: "unit-pos-orientation",
      title: "Unit 1 · Orientation — All Nine at Once",
      subtitle: "Poe · every part of speech in four sentences",
      group: "unit-pos",
      build: buildOrientation,
    },
  ]);

  /* `todo: true` marks a stop declared but not yet authored — the unit map
   * renders the whole path so a student sees where it goes. None are left.
   *
   * A focus stop's `teach` screens between them must name EVERY id in its
   * `focus`. That is not decoration: js/study-model.js falls back to generating
   * tap questions for any focus label no teach screen claimed, and that fallback
   * is capped only by `tapPerLabel`. `tapPerScreen` is the only thing keeping
   * the claimed labels down to a sitting. */
  wjt.unitPos.stops([
    {
      id: "orientation", n: 0, cluster: "start",
      title: "Orientation — all nine at once",
      blurb: "Meet the nine parts of speech in four sentences of Poe.",
      lessonId: "unit-pos-orientation",
      focus: ["noun", "verb", "adjective", "adverb", "pronoun",
        "preposition", "conjunction", "determiner", "interjection"],
      tapPerScreen: 3,
      teach: [
        {
          heading: "Nine jobs, not nine kinds of word",
          body: "English has about a million words, but every one of them is doing one of " +
            "<b>nine jobs</b> in the sentence it is sitting in. That is what a part of speech is: " +
            "not what a word <i>is</i>, but what it is <i>doing</i> right now." +
            "<p>The same word can change jobs. In <i>“the wine sparkled”</i> the word " +
            "<b>wine</b> names a thing. In <i>“a wine bottle”</i> it describes one. Nothing about " +
            "the word changed — its job did.</p>" +
            "<p>Over this unit you will meet all nine, one at a time, in a single Poe story. " +
            "Here they are together.</p>",
          labels: ["noun", "verb", "determiner"],
        },
        {
          heading: "The other six",
          body: "Nouns name, verbs act, determiners introduce. The remaining six either " +
            "<b>describe</b> (adjective, adverb), <b>stand in</b> (pronoun), <b>relate</b> " +
            "(preposition), <b>join</b> (conjunction), or <b>exclaim</b> (interjection)." +
            "<p>Do not worry about telling them apart yet. Right now, just notice that " +
            "every single word in a sentence has a job.</p>",
          labels: ["adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection"],
        },
      ],
      items: [
        {
          after: "Nine jobs, not nine kinds of word",
          stem: "A part of speech tells you…",
          options: [
            { text: "what job a word is doing in its sentence", correct: true,
              feedback: "Right. That is why the same word can be different parts of speech in different sentences." },
            { text: "what the word means", feedback: "Not quite — a dictionary tells you meaning. A part of speech tells you the word's job." },
            { text: "how the word is spelled", feedback: "No. Spelling never changes when a word changes jobs." },
            { text: "how long the word is", feedback: "No — length has nothing to do with it." },
          ],
        },
        {
          after: "Nine jobs, not nine kinds of word",
          stem: "In <i>“The man wore motley,”</i> which word names a person?",
          options: [
            { text: "man", correct: true, feedback: "Yes — a word that names a person, place, thing, or idea is a noun." },
            { text: "wore", feedback: "\"Wore\" is the action. That is a verb." },
            { text: "The", feedback: "\"The\" introduces the noun rather than naming it — that is a determiner." },
            { text: "motley", feedback: "\"Motley\" is a noun, but it names a costume, not a person." },
          ],
        },
        {
          after: "The other six",
          stem: "Which of these words is doing the job of <b>joining</b>?",
          options: [
            { text: "and", correct: true, feedback: "Correct — a conjunction joins words, phrases, or whole clauses." },
            { text: "in", feedback: "\"In\" shows a relationship of place. That is a preposition." },
            { text: "very", feedback: "\"Very\" strengthens another describing word — an adverb." },
            { text: "it", feedback: "\"It\" stands in for a noun — a pronoun." },
          ],
        },
        {
          after: "The other six",
          stem: "An interjection is unusual because it…",
          options: [
            { text: "stands outside the sentence's structure", correct: true,
              feedback: "Right — that is why <i>“Good!”</i> can be a whole utterance on its own." },
            { text: "must always come last", feedback: "No — an interjection usually comes first, but it can appear anywhere." },
            { text: "is always a single letter", feedback: "No. <i>Hearken</i>, <i>alas</i>, and <i>ugh</i> are all interjections." },
            { text: "can only appear in poetry", feedback: "No — Poe's characters use them in ordinary speech." },
          ],
        },
      ],
    },
  ]);

  wjt.study.register({
    id: "pos",
    title: "Unit 1 — The Nine Parts of Speech",
    subtitle: "An independent-study unit built on Poe's \"The Cask of Amontillado\".",
    intro: "Nine lessons, four reviews, and a capstone. Work at your own pace — " +
      "your place is remembered on this computer, and nothing you do here is sent anywhere " +
      "or seen by anyone.",
    source: "Edgar Allan Poe, \"The Cask of Amontillado\" (1846). Public domain.",
    clusters: CLUSTERS,
    stops: STOPS,
    excluded: EXCLUDED,
  });
})();
