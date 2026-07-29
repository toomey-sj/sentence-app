/* Sentence Forge — Unit 1, Cluster C: words that modify.
 *
 * Two passages and three stops: Adjectives, Adverbs, and Review C.
 *
 * Split out of js/unit-pos.js, which holds the `line()` and `passage()` helpers
 * these use, the cluster titles, and the `wjt.study.register` call. Read that
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

  /* Lesson 5 — Adjectives. A sentence that carries ANY adjective subtype gives a
   * subtype to every adjective in it — otherwise a question about the base label
   * would have a subtype-labelled word as an equally good answer. Sentence 1 is
   * the only one that uses the base label, and it holds no subtypes.
   *
   * "most remote" and "less spacious" are labelled on the second word: "most" and
   * "less" are adverbs of degree doing the comparing, and the adjective is what is
   * being compared. One label per token forces the choice, and this is the honest
   * one. */
  function buildAdjectives() {
    return passage(
      "Unit 1 · Lesson 5 — Adjectives",
      "Poe, \"The Cask of Amontillado\": descriptive, proper, demonstrative, possessive, quantitative, comparative, and superlative adjectives.",
      [
        line("There was then a long and obstinate silence.",
          ["adverb", "verb", "adverb", "determiner", "adjective", "conjunction",
            "adjective", "noun"],
          { 4: "\"Long\" and \"obstinate\" both tell you what kind of silence. That is the whole job of an adjective." }),

        line("Against the new masonry I re-erected the old rampart of bones.",
          ["preposition", "determiner", "descriptive-adjective", "noun", "pronoun",
            "verb", "determiner", "descriptive-adjective", "noun", "preposition",
            "noun"],
          { 2: "New and old are qualities of the things they sit in front of — descriptive adjectives, the ordinary kind." }),

        line("His eyes flashed with a fierce light.",
          ["possessive-adjective", "noun", "verb", "preposition", "determiner",
            "descriptive-adjective", "noun"],
          {
            0: "\"His\" shows who the eyes belong to, and it sits in front of a noun — a possessive adjective, not a pronoun.",
            5: "\"Fierce\" describes the light. Descriptive.",
          }),

        line("In this respect I did not differ from him materially: I was skillful in the Italian vintages myself, and bought largely whenever I could.",
          ["preposition", "demonstrative-adjective", "noun", "pronoun", "verb",
            "adverb", "verb", "preposition", "pronoun", "adverb", "pronoun", "verb",
            "descriptive-adjective", "preposition", "determiner",
            "proper-adjective", "noun", "pronoun", "conjunction", "verb", "adverb",
            "conjunction", "pronoun", "verb"],
          {
            1: "\"This respect\" — a noun follows, so \"this\" is pointing rather than standing alone. Demonstrative adjective.",
            15: "\"Italian\" comes from the proper noun Italy, which is why it keeps its capital letter. A proper adjective still describes — it just began life as a name.",
          }),

        line("\"These vaults,\" he said, \"are extensive.\"",
          ["demonstrative-adjective", "noun", "pronoun", "verb", "verb",
            "descriptive-adjective"],
          { 0: "\"These\" points at which vaults. Compare \"From one of these\" — no noun, so that one would be a pronoun." }),

        line("\"Pass your hand,\" I said, \"over the wall; you cannot help feeling the nitre.",
          ["verb", "possessive-adjective", "noun", "pronoun", "verb", "preposition",
            "determiner", "noun", "pronoun", "verb", "verb", "verb", "determiner",
            "noun"],
          { 1: "My, your, his, her, its, our, their — all possessive adjectives when a noun follows them." }),

        line("Three sides of this interior crypt were still ornamented in this manner.",
          ["quantitative-adjective", "noun", "preposition", "demonstrative-adjective",
            "descriptive-adjective", "noun", "verb", "adverb", "verb", "preposition",
            "demonstrative-adjective", "noun"],
          { 0: "\"Three\" answers how many. Number words are adjectives of quantity." }),

        line("\"You jest,\" he exclaimed, recoiling a few paces.",
          ["pronoun", "verb", "pronoun", "verb", "verb", "determiner",
            "quantitative-adjective", "noun"],
          { 6: "\"Few\" answers how many without giving a number — still an adjective of quantity." }),

        line("At the most remote end of the crypt there appeared another less spacious.",
          ["preposition", "determiner", "adverb", "superlative-adjective", "noun",
            "preposition", "determiner", "noun", "adverb", "verb", "pronoun",
            "adverb", "comparative-adjective"],
          {
            3: "\"Most remote\" compares this end against every other end — a superlative. \"Most\" is the adverb doing the comparing; \"remote\" is the adjective being compared.",
            12: "\"Less spacious\" compares two crypts against each other, not many — so this one is comparative.",
          }),

        line("The earliest indication I had of this was a low moaning cry from the depth of the recess.",
          ["determiner", "superlative-adjective", "noun", "pronoun", "verb",
            "preposition", "pronoun", "verb", "determiner", "descriptive-adjective",
            "descriptive-adjective", "noun", "preposition", "determiner", "noun",
            "preposition", "determiner", "noun"],
          { 1: "\"Earliest\" — the -est ending is the giveaway for a superlative. Early, earlier, earliest." }),
      ]
    );
  }

  /* Lesson 6 — Adverbs. Same rule as Lesson 5: a sentence with any adverb subtype
   * gives every adverb in it a subtype. Sentence 1 exists to carry the base label,
   * and "nevertheless" is a good instance of it because it belongs to none of the
   * five kinds — it modifies the whole sentence. */
  function buildAdverbs() {
    return passage(
      "Unit 1 · Lesson 6 — Adverbs",
      "Poe, \"The Cask of Amontillado\": adverbs of manner, time, place, frequency, and degree.",
      [
        line("\"Let us go, nevertheless.",
          ["verb", "pronoun", "verb", "adverb"],
          { 3: "\"Nevertheless\" modifies the whole idea rather than one word. It is an adverb, but it is none of the five kinds below." }),

        line("He again took my arm, and we proceeded.",
          ["pronoun", "adverb-of-frequency", "verb", "adjective", "noun",
            "conjunction", "pronoun", "verb"],
          { 1: "\"Again\" tells you this has happened before — how often. An adverb of frequency." }),

        line("\"He is an ignoramus,\" interrupted my friend, as he stepped unsteadily forward, while I followed immediately at his heels.",
          ["pronoun", "verb", "determiner", "noun", "verb", "adjective", "noun",
            "conjunction", "pronoun", "verb", "adverb-of-manner", "adverb-of-place",
            "conjunction", "pronoun", "verb", "adverb-of-time", "preposition",
            "adjective", "noun"],
          {
            10: "\"Unsteadily\" tells you HOW he stepped. Manner, and the -ly ending is the usual clue.",
            11: "\"Forward\" tells you WHERE. Place.",
            15: "\"Immediately\" tells you WHEN. Time.",
          }),

        line("Then I must positively leave you.",
          ["adverb-of-time", "pronoun", "verb", "adverb-of-manner", "verb",
            "pronoun"],
          { 0: "\"Then\" answers when; \"positively\" answers how. Two kinds of adverb, six words apart." }),

        line("I again paused, and holding the flambeaux over the mason-work, threw a few feeble rays upon the figure within.",
          ["pronoun", "adverb-of-frequency", "verb", "conjunction", "verb",
            "determiner", "noun", "preposition", "determiner", "noun", "verb",
            "determiner", "adjective", "adjective", "noun", "preposition",
            "determiner", "noun", "adverb-of-place"],
          { 18: "\"Within\" here has no noun after it, so it is not a preposition — it is telling you where the figure is. Place." }),

        line("Withdrawing the key I stepped back from the recess.",
          ["verb", "determiner", "noun", "pronoun", "verb", "adverb-of-place",
            "preposition", "determiner", "noun"],
          { 5: "\"Back\" answers where he stepped." }),

        line("He accosted me with excessive warmth, for he had been drinking much.",
          ["pronoun", "verb", "pronoun", "preposition", "adjective", "noun",
            "conjunction", "pronoun", "verb", "verb", "verb", "adverb-of-degree"],
          { 11: "\"Much\" answers how much drinking. Degree." }),

        line("The wall was now nearly upon a level with my breast.",
          ["determiner", "noun", "verb", "adverb-of-time", "adverb-of-degree",
            "preposition", "determiner", "noun", "preposition", "adjective", "noun"],
          {
            3: "\"Now\" — when.",
            4: "\"Nearly\" — how nearly. Degree, and it is modifying a whole phrase rather than a verb.",
          }),
      ]
    );
  }

  wjt.unitPos.examples([
    {
      id: "unit-pos-adjectives",
      title: "Unit 1 · Lesson 5 — Adjectives",
      subtitle: "Poe · descriptive, proper, demonstrative, possessive, quantity, comparison",
      group: "unit-pos",
      build: buildAdjectives,
    },
    {
      id: "unit-pos-adverbs",
      title: "Unit 1 · Lesson 6 — Adverbs",
      subtitle: "Poe · manner, time, place, frequency, degree",
      group: "unit-pos",
      build: buildAdverbs,
    },
  ]);

  wjt.unitPos.stops([
    {
      id: "adjectives", n: 7, cluster: "C",
      title: "Adjectives",
      blurb: "Words that describe a noun or pronoun — seven kinds, and two of them you already met.",
      lessonId: "unit-pos-adjectives",
      focus: ["adjective", "descriptive-adjective", "proper-adjective",
        "demonstrative-adjective", "possessive-adjective", "quantitative-adjective",
        "comparative-adjective", "superlative-adjective"],
      tapPerScreen: 2,
      teach: [
        {
          heading: "An adjective describes a noun",
          body: "An <b>adjective</b> tells you something about a noun or a pronoun. It answers " +
            "<i>what kind? which one? how many?</i>" +
            "<p>Poe's story is dark mostly because of its adjectives. Strip them out of <i>“There was " +
            "then a long and obstinate silence”</i> and you are left with <i>“there was then a " +
            "silence”</i> — a fact instead of a feeling.</p>" +
            "<p>Adjectives usually sit right in front of their noun, but not always: after a linking " +
            "verb they sit at the other end. <i>“These vaults are <b>extensive</b>.”</i></p>",
          labels: ["adjective"],
        },
        {
          heading: "Descriptive — the ordinary kind",
          body: "A <b>descriptive adjective</b> names a quality: <i>new, old, fierce, long, low, " +
            "damp, obstinate</i>. This is what most people mean by \"adjective,\" and it is by far " +
            "the biggest group." +
            "<p>The other six kinds below are the ones worth learning to <i>name</i>, because each " +
            "one does something slightly different from plain describing.</p>",
          labels: ["descriptive-adjective"],
        },
        {
          heading: "Proper — capitalized, but still describing",
          body: "A <b>proper adjective</b> is made from a proper noun and keeps its capital letter: " +
            "<i>Italian</i> from Italy, <i>Austrian</i> from Austria, <i>Shakespearean</i> from " +
            "Shakespeare." +
            "<p>This is the single most reliable trap in the whole unit, and you met it in Lesson 1. " +
            "A capital letter mid-sentence is a strong hint that a word is <i>proper</i> — but not " +
            "the slightest evidence that it is a <i>noun</i>.</p>" +
            "<p><i>“I was skillful in the <b>Italian</b> vintages”</i>: <i>vintages</i> is the noun. " +
            "<i>Italian</i> only tells you which ones.</p>",
          labels: ["proper-adjective"],
        },
        {
          heading: "Pointing and owning",
          body: "Two kinds of adjective that many people first learn as something else." +
            "<p>A <b>demonstrative adjective</b> points: <i>this, that, these, those</i> — with a " +
            "noun right after them. <i>“<b>These</b> vaults”</i>, <i>“<b>this</b> interior crypt”</i>. " +
            "With no noun after them, the very same words are pronouns.</p>" +
            "<p>A <b>possessive adjective</b> shows ownership: <i>my, your, his, her, its, our, " +
            "their</i> — again, with a noun right after. <i>“<b>His</b> eyes”</i>, <i>“<b>your</b> " +
            "hand”</i>. Standing alone they would be possessive pronouns: <i>mine, yours, his, " +
            "hers</i>.</p>" +
            "<p><b>Both rules are the same rule:</b> is there a noun after it?</p>",
          labels: ["demonstrative-adjective", "possessive-adjective"],
        },
        {
          heading: "How many, how much",
          body: "An <b>adjective of quantity</b> answers <i>how many?</i> or <i>how much?</i> " +
            "That includes exact numbers (<i>two flambeaux, three sides</i>), vague amounts " +
            "(<i>a few paces, several suites, many minutes</i>), and ordinals (<i>the second tier, " +
            "the fourth side</i>)." +
            "<p>Do not confuse these with determiners. <i>“No matter”</i> and <i>“some size”</i> " +
            "introduce a noun without describing it; <i>“three sides”</i> genuinely tells you " +
            "something about the sides. The line between the two is one grammarians argue about, and " +
            "you are allowed to find it blurry.</p>",
          labels: ["quantitative-adjective"],
        },
        {
          heading: "Comparing two, comparing many",
          body: "A <b>comparative adjective</b> compares exactly <b>two</b> things: add <b>-er</b>, " +
            "or put <b>more</b> or <b>less</b> in front. <i>“another <b>less spacious</b>”</i> — this " +
            "crypt against that one." +
            "<p>A <b>superlative adjective</b> compares <b>three or more</b>, which usually means " +
            "\"against all of them\": add <b>-est</b>, or put <b>most</b> in front. <i>“the " +
            "<b>earliest</b> indication,”</i> <i>“the <b>most remote</b> end,”</i> <i>“the " +
            "<b>inmost</b> recesses.”</i></p>" +
            "<p>Notice the giveaway: a superlative almost always has <b>the</b> in front of it, " +
            "because there can only be one.</p>",
          labels: ["comparative-adjective", "superlative-adjective"],
        },
      ],
      items: [
        {
          after: "An adjective describes a noun",
          stem: "In <i>“These vaults are extensive,”</i> which noun does <b>extensive</b> describe?",
          options: [
            { text: "vaults — even though it sits at the far end of the sentence", correct: true,
              feedback: "Right. After a linking verb, the adjective reaches back over the verb to the subject." },
            { text: "It describes no noun — it describes the verb", feedback: "A word describing a verb would be an adverb. \"Extensive\" is telling you about the vaults." },
            { text: "These", feedback: "\"These\" is itself an adjective here, pointing at the vaults." },
            { text: "are", feedback: "\"Are\" is the linking verb doing the reaching." },
          ],
        },
        {
          after: "Proper — capitalized, but still describing",
          stem: "Why is <b>Italian</b> in <i>“the Italian vintages”</i> an adjective rather than a noun?",
          options: [
            { text: "Because \"vintages\" is the thing being named, and \"Italian\" only says which ones", correct: true,
              feedback: "Exactly. The capital letter makes it proper; the job it is doing makes it an adjective." },
            { text: "Because it is capitalized", feedback: "Capitalization is what makes it PROPER. It says nothing about whether it is a noun or an adjective." },
            { text: "Because Italy is a country", feedback: "\"Italy\" would be the noun. \"Italian\" is describing." },
            { text: "Because it ends in -an", feedback: "\"Human\" and \"artisan\" end in -an and are not adjectives." },
          ],
        },
        {
          after: "Pointing and owning",
          stem: "What single test separates <i>this</i>-the-adjective from <i>this</i>-the-pronoun?",
          options: [
            { text: "Whether a noun follows it", correct: true,
              feedback: "That is the whole test, and it works for my/mine, his/his, and these/these too." },
            { text: "Whether it starts the sentence", feedback: "\"It is this\" ends with the pronoun; \"This crypt\" starts with the adjective. Position does not decide it." },
            { text: "Whether it is singular or plural", feedback: "This and these both do both jobs." },
            { text: "Whether it is capitalized", feedback: "Neither one ever is, unless it opens a sentence." },
          ],
        },
        {
          after: "How many, how much",
          stem: "Which of these is an <b>adjective of quantity</b>?",
          options: [
            { text: "few, in \"recoiling a few paces\"", correct: true,
              feedback: "Yes — it answers how many paces without giving a number." },
            { text: "fierce, in \"a fierce light\"", feedback: "That names a quality. Descriptive." },
            { text: "Italian, in \"the Italian vintages\"", feedback: "That is a proper adjective." },
            { text: "this, in \"this interior crypt\"", feedback: "That points rather than counts. Demonstrative." },
          ],
        },
        {
          after: "Comparing two, comparing many",
          stem: "Poe writes <i>“At the most remote end … there appeared another less spacious.”</i> Which is the <b>superlative</b>?",
          options: [
            { text: "remote — \"most remote\" compares this end against every other end", correct: true,
              feedback: "Right. \"Most\" is the adverb doing the comparing; \"remote\" is the adjective being compared." },
            { text: "spacious — \"less spacious\" is stronger", feedback: "\"Less\" compares two things, which makes it comparative, not superlative. Stronger is not the test — how MANY things is." },
            { text: "another", feedback: "\"Another\" is standing in for a noun here, not comparing anything." },
            { text: "Neither — a superlative must end in -est", feedback: "\"-est\" is one way; \"most\" plus an adjective is the other." },
          ],
        },
        {
          stem: "One rule from Lesson 1 and one from this lesson keep colliding. Which pair is right?",
          options: [
            { text: "A possessive noun has an apostrophe and is a noun; a possessive adjective has no apostrophe and sits in front of a noun", correct: true,
              feedback: "That is the pair. \"the river's bed\" against \"his cap\" — different parts of speech doing the same job." },
            { text: "Both have apostrophes", feedback: "\"His,\" \"its,\" and \"their\" have none, and never should." },
            { text: "Neither has an apostrophe", feedback: "\"The river's bed\" and \"the Montresors' vaults\" both do." },
            { text: "They are two names for the same thing", feedback: "One is a noun and one is an adjective. That is as different as this unit gets." },
          ],
        },
      ],
    },

    {
      id: "adverbs", n: 8, cluster: "C",
      title: "Adverbs",
      blurb: "How, when, where, how often, how much — and the one that modifies everything.",
      lessonId: "unit-pos-adverbs",
      focus: ["adverb", "adverb-of-manner", "adverb-of-time", "adverb-of-place",
        "adverb-of-frequency", "adverb-of-degree"],
      tapPerScreen: 2,
      teach: [
        {
          heading: "An adverb modifies more than a verb",
          body: "The name is misleading. An <b>adverb</b> does modify verbs — but it also modifies " +
            "<b>adjectives</b> and <b>other adverbs</b>, and sometimes a whole sentence." +
            "<p>You saw this in Orientation: in <i>“it is <b>very</b> damp,”</i> <b>very</b> modifies " +
            "the adjective <i>damp</i>, not any verb.</p>" +
            "<p>Five kinds follow, sorted by the question they answer. A handful of adverbs — " +
            "<i>nevertheless, however, indeed</i> — answer none of the five and just get the plain " +
            "label.</p>",
          labels: ["adverb"],
        },
        {
          heading: "Manner — how?",
          body: "An <b>adverb of manner</b> tells you <i>how</i> something is done, and it is very " +
            "often the <b>-ly</b> word: <i>unsteadily, stupidly, positively, violently, heavily, " +
            "promiscuously</i>." +
            "<p>This is the biggest group and the easiest to spot. Careful, though: <i>-ly</i> is a " +
            "clue and not a rule. <i>Friendly</i> and <i>lovely</i> are adjectives, and <i>fast</i>, " +
            "<i>well</i>, and <i>hard</i> are adverbs with no <i>-ly</i> at all.</p>",
          labels: ["adverb-of-manner"],
        },
        {
          heading: "Time and frequency — when, and how often?",
          body: "An <b>adverb of time</b> answers <i>when</i>: <i>now, then, immediately, to-day, " +
            "soon, already, first</i>." +
            "<p>An <b>adverb of frequency</b> answers <i>how often</i>: <i>again, never, always, " +
            "once, still, sometimes</i>.</p>" +
            "<p>The two shade into each other and it is fine to have to think about it. The test: " +
            "\"when did it happen\" against \"how many times did it happen.\" <i>“He <b>again</b> " +
            "took my arm”</i> is telling you this has happened before, so it is frequency.</p>",
          labels: ["adverb-of-time", "adverb-of-frequency"],
        },
        {
          heading: "Place — where?",
          body: "An <b>adverb of place</b> answers <i>where</i>: <i>here, there, forward, back, " +
            "within, overhead, aloud, upwards</i>." +
            "<p>These cause the one genuinely hard confusion in the lesson, because most of them can " +
            "also be prepositions. The test is whether an object follows.</p>" +
            "<p><i>“the figure <b>within</b>”</i> — nothing follows, so it is an adverb of place.<br>" +
            "<i>“<b>within</b> the wall”</i> — \"the wall\" follows, so it is a preposition.</p>" +
            "<p>You will meet the other side of this in Lesson 7.</p>",
          labels: ["adverb-of-place"],
        },
        {
          heading: "Degree — how much?",
          body: "An <b>adverb of degree</b> answers <i>how much</i> or <i>to what extent</i>: " +
            "<i>very, too, quite, nearly, much, so, almost, rather</i>." +
            "<p>These are the adverbs that most often modify something other than a verb. <i>“<b>very</b> " +
            "damp”</i> modifies an adjective. <i>“<b>too</b> much”</i> modifies another adverb. " +
            "<i>“<b>nearly</b> upon a level”</i> modifies a whole phrase.</p>" +
            "<p>Also: <i>more</i> and <i>most</i> are adverbs of degree when they are doing the " +
            "comparing in <i>“more satisfaction”</i> or <i>“most remote.”</i></p>",
          labels: ["adverb-of-degree"],
        },
      ],
      items: [
        {
          after: "An adverb modifies more than a verb",
          stem: "In <i>“Indeed, it is very damp,”</i> what does <b>very</b> modify?",
          options: [
            { text: "damp — an adjective", correct: true,
              feedback: "Right, and this is the point: \"adverb\" does not mean \"modifies a verb only.\"" },
            { text: "is — the verb", feedback: "\"Very is\" makes no sense. It is attached to \"damp.\"" },
            { text: "it — the pronoun", feedback: "Adverbs never modify nouns or pronouns. That is an adjective's job." },
            { text: "Indeed", feedback: "An adverb can modify another adverb, but not this one — \"very\" is next to \"damp.\"" },
          ],
        },
        {
          after: "Manner — how?",
          stem: "Which of these <b>-ly</b> words is <i>not</i> an adverb?",
          options: [
            { text: "friendly", correct: true, feedback: "Right — \"a friendly man\" describes a noun, so it is an adjective. \"-ly\" is a clue, never a rule." },
            { text: "unsteadily", feedback: "\"He stepped unsteadily\" — how he stepped. An adverb of manner." },
            { text: "positively", feedback: "\"I must positively leave you\" — how he must leave. Manner." },
            { text: "immediately", feedback: "An adverb — of time rather than manner, but an adverb." },
          ],
        },
        {
          after: "Time and frequency — when, and how often?",
          stem: "In <i>“He again took my arm,”</i> is <b>again</b> time or frequency?",
          options: [
            { text: "Frequency — it tells you this has happened before", correct: true,
              feedback: "Yes. \"When did he take it\" has no answer here; \"how many times\" does." },
            { text: "Time — it tells you when he took it", feedback: "Reasonable instinct, and the two do shade together — but \"again\" is counting, not timing." },
            { text: "Manner — it tells you how he took it", feedback: "\"Again\" says nothing about the manner of the taking." },
            { text: "Degree", feedback: "Degree would be \"how much,\" as in \"he took it firmly.\"" },
          ],
        },
        {
          after: "Place — where?",
          stem: "Poe writes <i>“the figure within.”</i> Why is <b>within</b> an adverb here and not a preposition?",
          options: [
            { text: "Because nothing follows it — a preposition always needs an object", correct: true,
              feedback: "That is the whole test, and it works both directions: \"within the wall\" IS a preposition." },
            { text: "Because it comes last in the sentence", feedback: "Position is a hint, not the test. \"He leaned upon it\" ends with a pronoun, and \"upon\" is still a preposition." },
            { text: "Because \"figure\" is a noun", feedback: "There is a noun in both cases. What matters is whether the noun comes AFTER the word." },
            { text: "Because \"within\" is never a preposition", feedback: "It very often is: \"within itself,\" \"within the wall.\"" },
          ],
        },
        {
          after: "Degree — how much?",
          stem: "In <i>“The wall was now nearly upon a level with my breast,”</i> which is the adverb of <b>degree</b>?",
          options: [
            { text: "nearly", correct: true, feedback: "Yes — how nearly. \"Now\" is the other adverb here, and it answers when." },
            { text: "now", feedback: "\"Now\" answers when, so it is an adverb of time. Both adverbs really are in this sentence." },
            { text: "upon", feedback: "\"Upon\" has \"a level\" after it, so it is a preposition." },
            { text: "was", feedback: "\"Was\" is the verb." },
          ],
        },
      ],
    },

    {
      id: "review-c", n: 9, cluster: "C",
      title: "Review C — words that modify",
      blurb: "Adjectives and adverbs, and the words that could be either.",
      reviews: ["adjectives", "adverbs"],
      focus: ["adjective", "adverb", "descriptive-adjective", "adverb-of-manner",
        "demonstrative-adjective", "possessive-adjective", "adverb-of-degree"],
      tapPerScreen: 2,
      teach: [
        {
          heading: "One question sorts the whole cluster",
          body: "Both of Cluster C's parts of speech <b>modify</b> — they add information to another " +
            "word. Telling them apart is one question: <b>what are they modifying?</b>" +
            "<p>An <b>adjective</b> modifies a <b>noun or pronoun</b>. Nothing else, ever.</p>" +
            "<p>An <b>adverb</b> modifies a <b>verb, an adjective, or another adverb</b>. Never a " +
            "noun.</p>" +
            "<p>So in <i>“He stepped unsteadily,”</i> <b>unsteadily</b> must be an adverb — there is " +
            "no noun for it to attach to. And in <i>“a fierce light,”</i> <b>fierce</b> must be an " +
            "adjective, because <i>light</i> is a noun.</p>",
          labels: ["adjective", "adverb"],
        },
        {
          heading: "The five collisions worth remembering",
          body: "<p><b>1. -ly is a clue, not a rule.</b> <i>Friendly</i> and <i>lovely</i> are " +
            "adjectives; <i>fast</i> and <i>well</i> are adverbs.</p>" +
            "<p><b>2. This/that/these/those.</b> Noun after it → demonstrative adjective. Standing " +
            "alone → demonstrative pronoun (Lesson 3).</p>" +
            "<p><b>3. My/your/his/her/its/our/their.</b> Noun after it → possessive adjective. " +
            "Standing alone (<i>mine, yours, hers</i>) → possessive pronoun.</p>" +
            "<p><b>4. Within, back, overhead, on.</b> Object after it → preposition (Lesson 7). " +
            "Nothing after it → adverb of place.</p>" +
            "<p><b>5. More and most.</b> In front of an adjective they are adverbs of degree doing " +
            "the comparing — the adjective is the comparative or superlative, not the <i>more</i>.</p>",
          labels: ["descriptive-adjective", "adverb-of-manner", "demonstrative-adjective",
            "possessive-adjective", "adverb-of-degree"],
        },
      ],
      items: [
        {
          after: "One question sorts the whole cluster",
          stem: "Which of these can an adjective <b>never</b> modify?",
          options: [
            { text: "A verb", correct: true, feedback: "Right — a word modifying a verb is an adverb by definition. That is the cleanest line in the whole unit." },
            { text: "A noun", feedback: "That is exactly what adjectives do." },
            { text: "A pronoun", feedback: "They can: \"he was happy,\" \"it is damp.\"" },
            { text: "The subject of a sentence", feedback: "A subject is a noun or pronoun, so an adjective can certainly modify it." },
          ],
        },
        {
          after: "The five collisions worth remembering",
          stem: "In <i>“He stepped back from the recess,”</i> what is <b>back</b>?",
          options: [
            { text: "An adverb of place — nothing follows it", correct: true,
              feedback: "Right. Compare \"back of the wall,\" where an object follows and \"back\" is doing preposition work." },
            { text: "A preposition, because \"the recess\" follows", feedback: "\"From\" is the preposition taking \"the recess.\" \"Back\" has nothing of its own." },
            { text: "A noun", feedback: "It can be one — \"my back was turned\" — but not here." },
            { text: "An adjective describing \"He\"", feedback: "It is telling you where he stepped, not what he was like." },
          ],
        },
        {
          after: "The five collisions worth remembering",
          stem: "In <i>“that I might hearken to it with the more satisfaction,”</i> what is <b>more</b>?",
          options: [
            { text: "An adverb of degree — it is doing the comparing", correct: true,
              feedback: "Yes. \"Satisfaction\" is the noun, \"more\" says how much of it. Compare \"more remote,\" where it compares an adjective." },
            { text: "A comparative adjective describing \"satisfaction\"", feedback: "A defensible reading, and some books label it that way — but this unit treats \"more\" and \"most\" as the adverbs that do the comparing." },
            { text: "A determiner", feedback: "\"The\" is the determiner in this phrase." },
            { text: "A noun", feedback: "\"Satisfaction\" is the noun." },
          ],
        },
        {
          stem: "<i>Fast</i> has no <b>-ly</b>. Can it still be an adverb?",
          options: [
            { text: "Yes — \"he walked fast\" tells you how he walked", correct: true,
              feedback: "Right. A word's job decides its part of speech; its ending is only ever a hint." },
            { text: "No — an adverb must end in -ly", feedback: "Then \"well,\" \"hard,\" \"soon,\" \"here,\" and \"never\" would all be something else." },
            { text: "Only in poetry", feedback: "\"He walked fast\" is ordinary prose." },
            { text: "Only when it comes before the verb", feedback: "Position does not decide it." },
          ],
        },
        {
          stem: "You have now met seven of the nine. Which two are left?",
          options: [
            { text: "Prepositions and conjunctions — plus interjections, which makes three", correct: true,
              feedback: "Well caught. Cluster D is prepositions, conjunctions, AND interjections — three lessons, because the ninth stands outside the sentence altogether." },
            { text: "Prepositions and interjections", feedback: "Conjunctions are still to come too." },
            { text: "Conjunctions and interjections", feedback: "Prepositions as well." },
            { text: "Nouns and verbs", feedback: "Those were Clusters A and B." },
          ],
        },
        {
          /* Two buckets, because the cluster is two parts of speech and the whole
           * skill is telling them apart. "back" is the interesting one: it is an
           * adverb here and a preposition in Lesson 7. */
          kind: "sort",
          stem: "Six words from the two passages. Is each one modifying a <b>noun</b> " +
            "(adjective) or something else (adverb)?",
          buckets: ["adjective", "adverb"],
          words: [
            { word: "fierce", bucket: "adjective" },
            { word: "unsteadily", bucket: "adverb" },
            { word: "Italian", bucket: "adjective" },
            { word: "nearly", bucket: "adverb" },
            { word: "obstinate", bucket: "adjective" },
            { word: "back", bucket: "adverb" },
          ],
          note: "“Italian” is capitalized and still an adjective; “back” is an adverb here " +
            "and a noun in “my back was turned.” The job, never the word.",
        },
      ],
    },
  ]);
})();
