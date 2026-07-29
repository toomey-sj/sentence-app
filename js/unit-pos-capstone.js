/* Sentence Forge — Unit 1, the Capstone.
 *
 * One passage and one stop, and it is deliberately not shaped like the others.
 *
 *   • NO TEACH SCREENS. It is an assessment, not instruction. That single fact
 *     drives three others: `focus` is the whole 48-label budget rather than a set
 *     of labels this stop claims to teach, `tapPerLabel: 1` is what keeps that
 *     from generating a question for every (sentence, label) pair in the passage,
 *     and `itemsLast` puts the written questions after the generated practice
 *     because there is no screen for them to follow.
 *   • UNSEEN TEXT. The passage is drawn from the story's closing paragraphs, and
 *     not one of its sentences appears in any other stop's passage —
 *     tools/smoke-test.js asserts exactly that, because it is the only evidence
 *     the unit taught anything transferable.
 *   • RESULTS BY CLUSTER. `resultsBy: "cluster"` makes the results screen report
 *     "Words that modify — 4 of 7" with a link back into Review C, instead of a
 *     flat list of thirty rights and wrongs a student cannot act on.
 *
 * `focus` being the whole budget does NOT mean the passage contains all 48
 * labels — two paragraphs of Poe could not. It means any budgeted label found in
 * this passage is fair game, which is what a filter over unseen text should be.
 * The labels the passage really does carry are chosen to span all nine parts of
 * speech and all four clusters; the ones it cannot supply are covered by the
 * written items at the end, exactly as a focus lesson covers a gap.
 *
 * Split out of js/unit-pos.js, which holds the `line()` and `passage()` helpers
 * this uses, the cluster titles, and the `wjt.study.register` call. Read that
 * file's header first: the one-label-per-token rule and the three text
 * normalizations are stated there and they are load-bearing here.
 *
 * DOM-free: tools/smoke-test.js runs this in a bare vm sandbox.
 */
(function () {
  "use strict";
  var wjt = (window.wjt = window.wjt || {});
  var line = wjt.unitPos.line;
  var passage = wjt.unitPos.passage;

  /* The closing paragraphs — midnight, the last tier, the laugh out of the
   * niche, and the sentence that ends the story. Sentences are curated rather
   * than contiguous, which is what lets every one of them be labellable without
   * an infinitive marker in it: "I hastened to make an end of my labour" and "I
   * plastered it up" are both in these paragraphs and both had to go, the first
   * for its bare `to` and the second for a particle, and both of those are out of
   * this unit's budget.
   *
   * Per-sentence, per family, the labels are either ALL base or ALL subtype —
   * mixing them would give one tap question two right answers. That is the same
   * rule the nine lessons follow, and tools/smoke-test.js checks it. */
  function buildCapstone() {
    return passage(
      "Unit 1 · Capstone — All Nine at Once, Unseen",
      "Poe, \"The Cask of Amontillado\": the closing paragraphs, which no lesson uses.",
      [
        line("It was now midnight, and my task was drawing to a close.",
          ["pronoun", "verb", "adverb-of-time", "common-noun",
            "coordinating-conjunction", "possessive-adjective", "common-noun",
            "verb", "verb", "preposition", "indefinite-article", "common-noun"],
          {
            8: "\"Was drawing\" is two verbs doing one job. This sentence labels every verb in it with the plain base label, so either one is a right answer.",
            9: "\"To a close\" is a place this task is arriving at, so \"to\" is a preposition here — not the \"to\" of an infinitive.",
          }),

        line("I had completed the eighth, the ninth and the tenth tier.",
          ["personal-pronoun", "helping-verb", "transitive-verb", "definite-article",
            "quantitative-adjective", "definite-article", "quantitative-adjective",
            "conjunction", "definite-article", "quantitative-adjective",
            "common-noun"],
          {
            2: "Completed what? The tier. That answer makes it transitive.",
            4: "Eighth, ninth, tenth — ordinals answer how many, so they are adjectives of quantity.",
          }),

        line("But now there came from out the niche a low laugh that erected the hairs upon my head.",
          ["coordinating-conjunction", "adverb-of-time", "adverb-of-place",
            "irregular-verb", "preposition", "preposition", "definite-article",
            "concrete-noun", "indefinite-article", "descriptive-adjective",
            "concrete-noun", "relative-pronoun", "transitive-verb",
            "definite-article", "concrete-noun", "preposition",
            "possessive-adjective", "concrete-noun"],
          {
            3: "Come → came, not \"comed.\" Irregular.",
            4: "\"From out\" is two prepositions in a row, which Poe can do and you should not.",
            11: "\"That\" starts a clause describing the laugh, so it is a relative pronoun — not the \"that\" that points at something.",
          }),

        line("We will have many a rich laugh about it at the palazzo.",
          ["pronoun", "modal-verb", "transitive-verb", "quantitative-adjective",
            "indefinite-article", "descriptive-adjective", "common-noun",
            "preposition", "pronoun", "preposition", "definite-article",
            "common-noun"],
          { 1: "\"Will\" adds a promise to \"have\" — a modal. Fortunato means it; Montresor does not." }),

        line("No answer still.",
          ["determiner", "abstract-noun", "adverb-of-frequency"],
          {
            0: "\"No\" introduces \"answer\" and says how much of it there is: none. A determiner.",
            2: "\"Still\" answers how often — it has gone on being true. Frequency.",
          }),

        line("My heart grew sick; it was the dampness of the catacombs that made it so.",
          ["possessive-adjective", "concrete-noun", "linking-verb",
            "descriptive-adjective", "personal-pronoun", "linking-verb",
            "definite-article", "abstract-noun", "preposition", "definite-article",
            "concrete-noun", "relative-pronoun", "transitive-verb",
            "personal-pronoun", "adverb-of-manner"],
          {
            2: "\"Grew\" does no acting: it joins \"my heart\" to \"sick.\" Swap in \"seemed\" and it still works, which is the test.",
            14: "\"So\" means \"in that way\" here — it tells you how, so it is an adverb of manner.",
          }),

        line("\"Yes,\" I said, \"for the love of God!\"",
          ["interjection", "personal-pronoun", "irregular-verb", "preposition",
            "definite-article", "abstract-noun", "preposition", "proper-noun"],
          {
            0: "Thrown out on its own, \"Yes\" is an interjection. Lift it out and \"I said\" survives.",
            7: "\"God\" names one particular being and is capitalized. Proper.",
          }),
      ]
    );
  }

  wjt.unitPos.examples([
    {
      id: "unit-pos-capstone",
      title: "Unit 1 · Capstone — All Nine at Once, Unseen",
      subtitle: "Poe · the closing paragraphs, used by no lesson",
      group: "unit-pos",
      build: buildCapstone,
    },
  ]);

  wjt.unitPos.stops([
    {
      id: "capstone", n: 14, cluster: "end",
      title: "Capstone — all nine, unseen text",
      blurb: "The closing paragraphs of the story, which no lesson has used. " +
        "Thirty-odd questions, no teaching.",
      lessonId: "unit-pos-capstone",
      /* The whole 48-label budget — a filter over unseen text, not a claim about
       * what this stop teaches. See the header. */
      focus: wjt.unitPos.budget(),
      tapPerLabel: 1,
      itemsLast: true,
      resultsBy: "cluster",
      teach: [],
      items: [
        {
          label: "subordinating-conjunction",
          stem: "These paragraphs contain no <b>subordinating</b> conjunction, so here is one " +
            "on its own. Which word makes what follows it unable to stand alone?",
          options: [
            { text: "although", correct: true,
              feedback: "Right. <i>“Although the wall was finished”</i> is not a sentence — it leans on something else. Subordinating." },
            { text: "and", feedback: "One of the FANBOYS seven. It joins two things of equal weight, so either half can stand alone." },
            { text: "but", feedback: "Also coordinating: <i>“But now there came a low laugh”</i> could open a sentence." },
            { text: "so", feedback: "Coordinating too — the last of the seven." },
          ],
        },
        {
          label: "relative-pronoun",
          stem: "Poe writes <i>“a low laugh <b>that</b> erected the hairs upon my head.”</i> " +
            "What is <b>that</b> doing?",
          options: [
            { text: "Standing in for “laugh” and joining a clause that describes it — a relative pronoun", correct: true,
              feedback: "Yes, and it is doing both jobs at once, which is what makes a relative pronoun different from a plain conjunction." },
            { text: "Pointing at something, like in “that trowel” — a demonstrative",
              feedback: "A demonstrative points and then either stands alone or takes a noun. This \"that\" starts a whole clause." },
            { text: "Nothing — it could be deleted",
              feedback: "Try it: “a low laugh erected the hairs” changes the sentence into one where the laugh does the erecting directly." },
            { text: "Introducing the noun “hairs” — a determiner",
              feedback: "\"The\" is the determiner in front of \"hairs.\"" },
          ],
        },
        {
          label: "possessive-pronoun",
          stem: "The passage has <i>“<b>my</b> task”</i> and <i>“<b>my</b> head.”</i> Which " +
            "rewrite turns <b>my</b> into a possessive <b>pronoun</b>?",
          options: [
            { text: "“The task was mine.”", correct: true,
              feedback: "Right — <i>mine</i> stands completely alone, and that is the whole difference. Poe never writes one anywhere in the story." },
            { text: "“My own task.”", feedback: "Still leaning on a noun, so still a possessive adjective." },
            { text: "“The task was my.”", feedback: "Not English — which is a good way to feel that <i>my</i> cannot stand alone." },
            { text: "“I had a task.”", feedback: "That removes the possessive altogether." },
          ],
        },
        {
          label: "linking-verb",
          stem: "<i>“My heart <b>grew</b> sick”</i> and <i>“I had <b>completed</b> the tenth " +
            "tier.”</i> What is the difference between those two verbs?",
          options: [
            { text: "“Grew” links the heart to a description; “completed” acts on something", correct: true,
              feedback: "Exactly. Swap in <i>seemed</i>: “my heart seemed sick” works, “I had seemed the tenth tier” does not." },
            { text: "“Grew” is irregular and “completed” is not, and that is the only difference",
              feedback: "Both of those are true — grew is irregular, completed is regular — but that is a different question from what each verb is DOING." },
            { text: "“Grew” is a helping verb", feedback: "A helping verb props up a main verb. There is no other verb in “my heart grew sick.”" },
            { text: "There is no difference — both are action verbs", feedback: "Nobody does anything in “my heart grew sick.” Nothing is acted on." },
          ],
        },
        {
          /* Four buckets, one per cluster: nouns (A), verbs (B), adverbs (C),
           * prepositions (D). Every word is from the passage above and is
           * unambiguous standing on its own. */
          kind: "sort",
          stem: "Six words from the passage you have just worked through — one bucket per " +
            "cluster of the unit. Tap a word, then tap where it goes.",
          buckets: ["noun", "verb", "adverb", "preposition"],
          words: [
            { word: "midnight", bucket: "noun" },
            { word: "grew", bucket: "verb" },
            { word: "now", bucket: "adverb" },
            { word: "upon", bucket: "preposition" },
            { word: "catacombs", bucket: "noun" },
            { word: "came", bucket: "verb" },
          ],
          note: "Four buckets, one per cluster: the words that name, the word that acts, " +
            "the words that modify, and the words that connect.",
        },
        {
          /* The other five bases, so the two sorts between them cover all nine. */
          kind: "sort",
          stem: "The last question in the unit, and it is the other five parts of speech. " +
            "Same passage, same rules.",
          buckets: ["pronoun", "determiner", "adjective", "conjunction", "interjection"],
          words: [
            { word: "it", bucket: "pronoun" },
            { word: "a", bucket: "determiner" },
            { word: "low", bucket: "adjective" },
            { word: "and", bucket: "conjunction" },
            { word: "Yes", bucket: "interjection" },
            { word: "my", bucket: "adjective" },
          ],
          note: "Two of these are arguable and the unit has picked a side: “my” is a " +
            "possessive ADJECTIVE here (some grammars call it a determiner), and “Yes” is " +
            "an interjection because in this passage it stands on its own.",
        },
      ],
    },
  ]);
})();
