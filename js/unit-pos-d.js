/* Sentence Forge — Unit 1, Cluster D: words that connect and exclaim.
 *
 * Three passages and four stops: Prepositions, Conjunctions, Interjections, and Review D.
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

  /* Lesson 7 — Prepositions. No subtypes at all, so every preposition here is the
   * base label and every question about the sentence accepts any of them. The
   * teaching work is done by the sheer count: sentence 2 holds seven. */
  function buildPrepositions() {
    return passage(
      "Unit 1 · Lesson 7 — Prepositions",
      "Poe, \"The Cask of Amontillado\": the words that relate one thing to another in place, time, and direction.",
      [
        line("I took from their sconces two flambeaux, and giving one to Fortunato, bowed him through several suites of rooms to the archway that led into the vaults.",
          ["pronoun", "verb", "preposition", "adjective", "noun", "adjective",
            "noun", "conjunction", "verb", "pronoun", "preposition", "noun", "verb",
            "pronoun", "preposition", "adjective", "noun", "preposition", "noun",
            "preposition", "determiner", "noun", "pronoun", "verb", "preposition",
            "determiner", "noun"],
          { 2: "From, to, through, of, to, into — six prepositions, and every one of them starts a little phrase that says where." }),

        line("We came at length to the foot of the descent, and stood together on the damp ground of the catacombs of the Montresors.",
          ["pronoun", "verb", "preposition", "noun", "preposition", "determiner",
            "noun", "preposition", "determiner", "noun", "conjunction", "verb",
            "adverb", "preposition", "determiner", "adjective", "noun",
            "preposition", "determiner", "noun", "preposition", "determiner",
            "noun"],
          { 7: "\"Of\" is the commonest preposition in English, and this one sentence uses it three times to hook nouns onto each other." }),

        line("Its walls had been lined with human remains, piled to the vault overhead, in the fashion of the great catacombs of Paris.",
          ["adjective", "noun", "verb", "verb", "verb", "preposition", "adjective",
            "noun", "adjective", "preposition", "determiner", "noun", "adverb",
            "preposition", "determiner", "noun", "preposition", "determiner",
            "adjective", "noun", "preposition", "noun"],
          { 12: "\"Overhead\" looks like it belongs with the prepositions, but nothing follows it — no object, so it is an adverb." }),

        line("He leaned upon it heavily.",
          ["pronoun", "verb", "preposition", "pronoun", "adverb"],
          { 2: "A preposition always takes an object: \"upon\" has \"it.\" That is the test that separates a preposition from an adverb." }),
      ]
    );
  }

  /* Lesson 8 — Conjunctions. Coordinating, subordinating and correlative do not
   * overlap, so a sentence may safely carry more than one of them; the base label
   * still gets a sentence of its own (1).
   *
   * "not only … but" in sentence 5 is the only correlative pair anywhere in the
   * story that does not drag an infinitive in with it — "neither by word nor deed"
   * sits in a sentence containing "to doubt", and this unit does not teach the
   * infinitive. The pair's second half, "but", carries the label. */
  function buildConjunctions() {
    return passage(
      "Unit 1 · Lesson 8 — Conjunctions",
      "Poe, \"The Cask of Amontillado\": coordinating, subordinating, and correlative conjunctions.",
      [
        line("He again took my arm, and we proceeded.",
          ["pronoun", "adverb", "verb", "adjective", "noun", "conjunction",
            "pronoun", "verb"],
          { 5: "\"And\" joins two complete ideas: he took my arm, we proceeded. Joining is the whole job." }),

        line("The gait of my friend was unsteady, and the bells upon his cap jingled as he strode.",
          ["determiner", "noun", "preposition", "adjective", "noun", "verb",
            "adjective", "coordinating-conjunction", "determiner", "noun",
            "preposition", "adjective", "noun", "verb", "subordinating-conjunction",
            "pronoun", "verb"],
          {
            7: "\"And\" joins two ideas of EQUAL weight — either could stand alone as a sentence. Coordinating.",
            14: "\"As\" makes what follows depend on what came before: \"as he strode\" cannot stand alone. Subordinating.",
          }),

        line("I laid the second tier, and the third, and the fourth; and then I heard the furious vibrations of the chain.",
          ["pronoun", "verb", "determiner", "adjective", "noun",
            "coordinating-conjunction", "determiner", "adjective",
            "coordinating-conjunction", "determiner", "adjective",
            "coordinating-conjunction", "adverb", "pronoun", "verb", "determiner",
            "adjective", "noun", "preposition", "determiner", "noun"],
          { 5: "Three \"and\"s in a row. Poe is using them to make the walling-up feel slow and steady." }),

        line("A wrong is unredressed when retribution overtakes its redresser.",
          ["determiner", "noun", "verb", "adjective", "subordinating-conjunction",
            "noun", "verb", "adjective", "noun"],
          { 4: "\"When retribution overtakes its redresser\" is not a sentence on its own. \"When\" is what makes it depend on the rest." }),

        line("I must not only punish, but punish with impunity.",
          ["pronoun", "verb", "adverb", "adverb", "verb",
            "correlative-conjunction", "verb", "preposition", "noun"],
          { 5: "Correlative conjunctions work in pairs. Here the pair is \"not only … but\" — and \"but\" is the half that does the joining." }),
      ]
    );
  }

  /* Lesson 9 — Interjections. No subtypes. Sentence 1 is Poe's paragraph of
   * coughing exactly as he wrote it: fifteen interjections and four dashes.
   *
   * Note that wjt.splitSentences would break every one of these lines into
   * several cards, because it splits on "!" — a built lesson supplies its own
   * sentences array and never goes through the splitter, which is the only reason
   * these read as single utterances. */
  function buildInterjections() {
    return passage(
      "Unit 1 · Lesson 9 — Interjections",
      "Poe, \"The Cask of Amontillado\": the one part of speech that stands outside the sentence.",
      [
        line("\"Ugh! ugh! ugh! — ugh! ugh! ugh! — ugh! ugh! ugh! — ugh! ugh! ugh! — ugh! ugh! ugh!\"",
          ["interjection", "interjection", "interjection", "",
            "interjection", "interjection", "interjection", "",
            "interjection", "interjection", "interjection", "",
            "interjection", "interjection", "interjection", "",
            "interjection", "interjection", "interjection"],
          { 0: "Fifteen interjections and not one other part of speech. This is a whole paragraph of Poe's story, and there is no subject and no verb anywhere in it." }),

        line("\"Ha! ha! ha! — he! he! he! — a very good joke indeed — an excellent jest.",
          ["interjection", "interjection", "interjection", "",
            "interjection", "interjection", "interjection", "",
            "determiner", "adverb", "adjective", "noun", "adverb", "",
            "determiner", "adjective", "noun"],
          {
            4: "\"He!\" here is laughter, not the pronoun \"he.\" Same three letters, completely different job — which is what a part of speech is about.",
            8: "Once the laughing stops, ordinary parts of speech start again: a determiner, an adverb, an adjective, a noun.",
          }),

        line("\"Good!\" he said.",
          ["interjection", "pronoun", "verb"],
          { 0: "Remove \"Good!\" and \"he said\" is still a complete sentence. That is the test: an interjection can always be lifted out." }),

        line("\"Yes, yes,\" I said; \"yes, yes.\"",
          ["interjection", "interjection", "pronoun", "verb", "interjection",
            "interjection"],
          { 0: "Yes and no are interjections when they stand on their own like this." }),

        line("\"Enough,\" he said; \"the cough is a mere nothing; it will not kill me.",
          ["interjection", "pronoun", "verb", "determiner", "noun", "verb",
            "determiner", "adjective", "pronoun", "pronoun", "verb", "adverb",
            "verb", "pronoun"],
          { 0: "\"Enough\" is usually a determiner or an adjective. Thrown out on its own, with feeling, it is an interjection." }),
      ]
    );
  }

  wjt.unitPos.examples([
    {
      id: "unit-pos-prepositions",
      title: "Unit 1 · Lesson 7 — Prepositions",
      subtitle: "Poe · the words that relate, and how to tell one from an adverb",
      group: "unit-pos",
      build: buildPrepositions,
    },
    {
      id: "unit-pos-conjunctions",
      title: "Unit 1 · Lesson 8 — Conjunctions",
      subtitle: "Poe · coordinating, subordinating, correlative",
      group: "unit-pos",
      build: buildConjunctions,
    },
    {
      id: "unit-pos-interjections",
      title: "Unit 1 · Lesson 9 — Interjections",
      subtitle: "Poe · the part of speech that stands outside the sentence",
      group: "unit-pos",
      build: buildInterjections,
    },
  ]);

  wjt.unitPos.stops([
    {
      id: "prepositions", n: 10, cluster: "D",
      title: "Prepositions",
      blurb: "Place, time, and direction — the words that relate. No subtypes at all.",
      lessonId: "unit-pos-prepositions",
      focus: ["preposition"],
      tapPerScreen: 4,
      teach: [
        {
          heading: "A preposition relates one thing to another",
          body: "A <b>preposition</b> shows how one thing stands in relation to another — in " +
            "<b>place</b> (<i>under, upon, among, within, beneath</i>), in <b>time</b> (<i>during, " +
            "after, until, before</i>), or in <b>direction</b> (<i>to, from, into, through, towards</i>)." +
            "<p>This is the only part of speech in the unit with <b>no subtypes</b>. There is one " +
            "label, and there are about seventy prepositions in English — a closed list you could " +
            "learn in an afternoon.</p>" +
            "<p>They are also everywhere. Count them in <i>“We came at length to the foot of the " +
            "descent, and stood together on the damp ground of the catacombs of the Montresors”</i>: " +
            "there are seven, in twenty-three words.</p>" +
            "<p>A preposition never travels alone. It always drags a noun or pronoun along behind " +
            "it — its <b>object</b> — and the two together make a phrase: <i>upon the mould</i>, " +
            "<i>among the bones</i>, <i>upon it</i>.</p>",
          labels: ["preposition"],
        },
        {
          heading: "The test, and the word this unit leaves out",
          body: "Most prepositions can also be adverbs, and the difference is one question: " +
            "<b>is there an object after it?</b>" +
            "<p><i>“He leaned <b>upon</b> it”</i> — \"it\" is the object, so <b>upon</b> is a " +
            "preposition.<br><i>“the figure <b>within</b>”</i> — nothing follows, so <b>within</b> is " +
            "an adverb of place.</p>" +
            "<p>There is a third possibility, and this unit is going to name it and then leave it " +
            "alone. In <i>“she looked <b>up</b> the word”</i> and <i>“he gave <b>up</b>,”</i> the " +
            "word <i>up</i> is neither: it is glued to the verb and changes what the verb means. " +
            "Grammarians call that a <b>particle</b>, and this app has a label for it — filed as " +
            "<b>Advanced</b>, which is why you will not be asked about it here.</p>" +
            "<p>It is worth knowing the word exists, because it explains the sentences where neither " +
            "the preposition test nor the adverb test seems to work.</p>",
          labels: [],
        },
      ],
      items: [
        {
          after: "A preposition relates one thing to another",
          stem: "What always follows a preposition?",
          options: [
            { text: "A noun or pronoun — its object", correct: true,
              feedback: "Right, and this is the definition rather than a tendency. No object, no preposition." },
            { text: "A verb", feedback: "\"To go\" looks like a counterexample, but that \"to\" is an infinitive marker, not a preposition." },
            { text: "An adjective", feedback: "One can come in between — \"upon the damp ground\" — but the phrase always ends on a noun." },
            { text: "Nothing in particular", feedback: "That is exactly what separates a preposition from an adverb." },
          ],
        },
        {
          after: "A preposition relates one thing to another",
          stem: "Roughly how many prepositions does English have?",
          options: [
            { text: "About seventy — it is a closed list", correct: true,
              feedback: "Yes, and \"closed\" is the interesting part: English gains new nouns and verbs constantly and almost never a new preposition." },
            { text: "Thousands", feedback: "That is nouns. Prepositions are a small, fixed set." },
            { text: "Nine, one per part of speech", feedback: "Nine is the number of parts of speech, not of prepositions." },
            { text: "Three: to, of, and in", feedback: "Those are three of the commonest, but Poe uses at least a dozen others." },
          ],
        },
        {
          after: "The test, and the word this unit leaves out",
          stem: "In <i>“Its walls had been lined with human remains, piled to the vault overhead,”</i> what is <b>overhead</b>?",
          options: [
            { text: "An adverb — nothing follows it, so it has no object", correct: true,
              feedback: "Right. \"To the vault\" is the prepositional phrase; \"overhead\" is just telling you where the vault is." },
            { text: "A preposition, because it describes position", feedback: "Describing position is not enough — a preposition also needs an object, and there is none here." },
            { text: "A noun", feedback: "It names nothing." },
            { text: "A particle", feedback: "A particle is glued to a verb and changes its meaning. \"Overhead\" is not attached to \"piled\" that way." },
          ],
        },
        {
          after: "The test, and the word this unit leaves out",
          stem: "<i>“She looked up the word.”</i> Is <b>up</b> a preposition?",
          options: [
            { text: "No — it belongs to the verb. \"Look up\" means something \"look\" alone does not", correct: true,
              feedback: "Right, and that is a particle. Notice you can also say \"she looked the word up,\" which no preposition would allow." },
            { text: "Yes — \"the word\" is its object", feedback: "\"The word\" is the object of \"looked up,\" not of \"up.\" Try moving it: \"she looked the word up\" still works." },
            { text: "Yes — \"up\" is always a preposition", feedback: "In \"he threw the bottle upwards\" and \"he gave up\" it is not." },
            { text: "No — it is a conjunction", feedback: "Nothing is being joined." },
          ],
        },
      ],
    },

    {
      id: "conjunctions", n: 11, cluster: "D",
      title: "Conjunctions",
      blurb: "Joining words, phrases, and whole clauses — and the pairs that work together.",
      lessonId: "unit-pos-conjunctions",
      focus: ["conjunction", "coordinating-conjunction", "subordinating-conjunction",
        "correlative-conjunction"],
      tapPerScreen: 3,
      teach: [
        {
          heading: "A conjunction joins",
          body: "A <b>conjunction</b> joins things: two words, two phrases, or two whole clauses. " +
            "That is its entire job." +
            "<p>Without conjunctions every sentence would be short. <i>“He again took my arm, " +
            "<b>and</b> we proceeded”</i> is two complete statements welded into one, and the weld " +
            "is a single word.</p>" +
            "<p>Three kinds follow, and unlike the adjectives and the verbs, these three do " +
            "<b>not</b> overlap. A conjunction is exactly one of them.</p>",
          labels: ["conjunction"],
        },
        {
          heading: "Coordinating and subordinating",
          body: "A <b>coordinating conjunction</b> joins two things of <b>equal weight</b> — either " +
            "side could stand on its own. There are exactly seven, and they spell <b>FANBOYS</b>: " +
            "<i>for, and, nor, but, or, yet, so</i>." +
            "<p>A <b>subordinating conjunction</b> makes what follows <b>depend</b> on what came " +
            "before, so that half can no longer stand alone: <i>because, although, when, if, since, " +
            "while, as, until, unless</i>.</p>" +
            "<p>Poe puts one of each in a single sentence: <i>“The gait of my friend was unsteady, " +
            "<b>and</b> the bells upon his cap jingled <b>as</b> he strode.”</i> Say the two halves " +
            "aloud: <i>“the bells jingled”</i> is a sentence; <i>“as he strode”</i> is not.</p>" +
            "<p><b>The test:</b> can the part after the conjunction stand alone? Yes → coordinating. " +
            "No → subordinating.</p>",
          labels: ["coordinating-conjunction", "subordinating-conjunction"],
        },
        {
          heading: "Correlative — the ones that come in pairs",
          body: "A <b>correlative conjunction</b> is a matched pair, and both halves have to be " +
            "there: <i>either…or</i>, <i>neither…nor</i>, <i>both…and</i>, <i>not only…but also</i>, " +
            "<i>whether…or</i>." +
            "<p>Montresor opens the story with one: <i>“I must <b>not only</b> punish, <b>but</b> " +
            "punish with impunity.”</i> And a page later, another: <i>“<b>neither</b> by word " +
            "<b>nor</b> deed had I given Fortunato cause to doubt my good will.”</i></p>" +
            "<p>Correlatives are how you say two things are being weighed against each other, which " +
            "is exactly what a narrator planning a murder needs.</p>",
          labels: ["correlative-conjunction"],
        },
      ],
      items: [
        {
          after: "A conjunction joins",
          stem: "How much does a conjunction tell you about the things it joins?",
          options: [
            { text: "Only how they relate — it never names or describes anything itself", correct: true,
              feedback: "Right. \"And\" adds, \"but\" contrasts, \"because\" explains. None of them names a thing." },
            { text: "It describes the first one", feedback: "That would make it an adjective." },
            { text: "It names both of them", feedback: "That is what the nouns on either side are for." },
            { text: "Nothing at all", feedback: "It does tell you something: whether the two ideas add up, clash, or explain each other." },
          ],
        },
        {
          after: "Coordinating and subordinating",
          stem: "What does <b>FANBOYS</b> stand for?",
          options: [
            { text: "The seven coordinating conjunctions: for, and, nor, but, or, yet, so", correct: true,
              feedback: "Yes — and it really is only seven. The subordinating list is much longer and has no acronym." },
            { text: "The seven subordinating conjunctions", feedback: "There are dozens of those. FANBOYS is the coordinating seven." },
            { text: "The nine parts of speech", feedback: "Different list, and one letter short." },
            { text: "The correlative pairs", feedback: "Those come in twos, not sevens." },
          ],
        },
        {
          after: "Coordinating and subordinating",
          stem: "In <i>“A wrong is unredressed when retribution overtakes its redresser,”</i> what kind of conjunction is <b>when</b>?",
          options: [
            { text: "Subordinating — \"when retribution overtakes its redresser\" cannot stand alone", correct: true,
              feedback: "Exactly the test. Say it by itself and you can hear that something is missing." },
            { text: "Coordinating, because it joins two clauses", feedback: "It does join two clauses — but not two EQUAL ones. Only one of them is a sentence." },
            { text: "Correlative, because \"when\" pairs with \"then\"", feedback: "Not here — there is no \"then\" in this sentence." },
            { text: "It is not a conjunction at all", feedback: "It is joining a clause on, so it is." },
          ],
        },
        {
          after: "Correlative — the ones that come in pairs",
          stem: "Which of these is a <b>correlative</b> pair?",
          options: [
            { text: "neither … nor", correct: true, feedback: "Yes — and both halves must appear. \"Neither by word nor deed\" is Poe's." },
            { text: "and … but", feedback: "Both are coordinating conjunctions, but they are not a pair — each works alone." },
            { text: "because … although", feedback: "Two subordinating conjunctions, and putting them together makes nonsense." },
            { text: "the … a", feedback: "Those are articles, not conjunctions." },
          ],
        },
        {
          stem: "One word, three parts of speech. In which sentence is <b>as</b> a <b>conjunction</b>?",
          options: [
            { text: "“the bells jingled as he strode”", correct: true,
              feedback: "Right — a whole clause follows, so \"as\" is joining it on. Subordinating." },
            { text: "“I had borne as I best could”", feedback: "Careful — this one is a conjunction too. Both of the first two options join clauses; the difference between them is not the part of speech." },
            { text: "“as for Luchesi”", feedback: "Here \"as for\" is doing preposition work — a noun follows and no clause does." },
            { text: "“He was too much astounded”", feedback: "There is no \"as\" in this sentence at all." },
          ],
        },
      ],
    },

    {
      id: "interjections", n: 12, cluster: "D",
      title: "Interjections",
      blurb: "The part of speech that stands outside the sentence — which is why it is last.",
      lessonId: "unit-pos-interjections",
      focus: ["interjection"],
      tapPerScreen: 4,
      teach: [
        {
          heading: "The ninth one is not like the other eight",
          body: "An <b>interjection</b> expresses sudden feeling: <i>Ugh! Ha! Good! Yes. No. Oh. " +
            "Alas. Enough.</i>" +
            "<p>Every other part of speech in this unit has a <b>job inside the sentence</b>. A noun " +
            "is the subject or the object; a verb is what happens; an adjective attaches to a noun. " +
            "An interjection attaches to <b>nothing</b>. Lift it out and what remains is still a " +
            "complete sentence.</p>" +
            "<p><i>“<b>Good!</b>” he said.</i> → <i>He said.</i> Nothing broke.</p>" +
            "<p>That is why this lesson comes last rather than first. \"A word that belongs to no " +
            "part of the sentence\" is a useful thing to say once you know what the parts of a " +
            "sentence are, and a baffling thing to say before.</p>",
          labels: ["interjection"],
        },
        {
          heading: "Spotting one, and one last trap",
          body: "Interjections are easy to find and easy to over-find. Three habits will keep you " +
            "right." +
            "<p><b>1. Look for the punctuation.</b> An interjection is usually cut off by an " +
            "exclamation mark or a comma, and often sits at the very start.</p>" +
            "<p><b>2. Try lifting it out.</b> If the rest of the sentence survives untouched, you " +
            "have one.</p>" +
            "<p><b>3. Most interjections are ordinary words on holiday.</b> <i>Enough</i> is usually " +
            "a determiner. <i>Good</i> is usually an adjective. <i>Yes</i> and <i>no</i> do several " +
            "jobs. They become interjections only when they are thrown out on their own, with " +
            "feeling.</p>" +
            "<p><b>The trap:</b> in Poe's last exchange, <i>“Ha! ha! ha! — <b>he! he! he!</b>”</i>, " +
            "those three <i>he</i>s are laughter, not the pronoun <i>he</i>. Same three letters. " +
            "Completely different part of speech. If you have taken one thing from this unit, let it " +
            "be that.</p>",
          labels: [],
        },
      ],
      items: [
        {
          after: "The ninth one is not like the other eight",
          stem: "What makes an interjection unlike the other eight parts of speech?",
          options: [
            { text: "It has no grammatical job inside the sentence — remove it and nothing breaks", correct: true,
              feedback: "Right. Every other part of speech is holding something up. This one is standing beside the building." },
            { text: "It is always one syllable", feedback: "\"Hearken\" and \"nevertheless\" put paid to that." },
            { text: "It must come first", feedback: "It usually does, but \"a very good joke indeed — he! he! he!\" ends with three." },
            { text: "It only appears in dialogue", feedback: "It very often does, because it is a spoken thing — but that is a tendency, not a rule." },
          ],
        },
        {
          after: "The ninth one is not like the other eight",
          stem: "Poe's whole thirty-first paragraph is <i>“Ugh! ugh! ugh! — ugh! ugh! ugh! …”</i>. What parts of speech are in it?",
          options: [
            { text: "One — interjections, fifteen of them, and nothing else", correct: true,
              feedback: "No subject, no verb, no sentence. And yet you know exactly what is happening, which is what interjections are for." },
            { text: "Two — interjections and verbs", feedback: "There is no verb anywhere in the paragraph." },
            { text: "None — it is not language", feedback: "It is language, and English has a label for it." },
            { text: "Nine — all of them", feedback: "Only one part of speech appears." },
          ],
        },
        {
          after: "Spotting one, and one last trap",
          stem: "In <i>“Enough,” he said</i>, why is <b>Enough</b> an interjection when it is usually not one?",
          options: [
            { text: "Because it is standing alone with feeling rather than introducing a noun", correct: true,
              feedback: "Right. \"Enough wine\" would be a determiner. Thrown out on its own, the same word is an interjection." },
            { text: "Because it is capitalized", feedback: "It is capitalized because it opens the quotation." },
            { text: "Because \"enough\" is always an interjection", feedback: "\"Enough wine\" and \"enough of this\" are not." },
            { text: "Because it comes before \"he said\"", feedback: "Position is a clue, not the reason." },
          ],
        },
        {
          after: "Spotting one, and one last trap",
          stem: "In <i>“a very good joke indeed — he! he! he!”</i>, what part of speech is <b>he</b>?",
          options: [
            { text: "An interjection — it is laughter, not a person", correct: true,
              feedback: "The best question in the unit, and Poe wrote it by accident. The word tells you nothing; the job tells you everything." },
            { text: "A personal pronoun, standing for Fortunato", feedback: "It looks exactly like one. But nobody is being referred to — he is laughing." },
            { text: "A noun", feedback: "It names nothing." },
            { text: "It depends on who is speaking", feedback: "It depends on what the word is doing, and here it is doing laughter." },
          ],
        },
      ],
    },

    {
      id: "review-d", n: 13, cluster: "D",
      title: "Review D — words that connect and exclaim",
      blurb: "Prepositions, conjunctions, and interjections together.",
      reviews: ["prepositions", "conjunctions", "interjections"],
      focus: ["preposition", "conjunction", "interjection", "coordinating-conjunction",
        "subordinating-conjunction", "correlative-conjunction"],
      tapPerScreen: 1,
      teach: [
        {
          heading: "Two that connect, one that does not",
          body: "Cluster D held three parts of speech, and two of them look similar until you ask " +
            "what they connect." +
            "<p>A <b>preposition</b> connects a <b>noun</b> to the rest of the sentence, and always " +
            "takes that noun as its object: <i>among the bones</i>, <i>upon it</i>.</p>" +
            "<p>A <b>conjunction</b> connects <b>two things of the same kind</b> — two words, two " +
            "phrases, two clauses — and takes no object at all.</p>" +
            "<p>An <b>interjection</b> connects nothing. It stands outside the sentence, which is " +
            "the one thing that makes it unique among all nine.</p>",
          labels: ["preposition", "conjunction", "interjection"],
        },
        {
          heading: "The three kinds of joining",
          body: "<p><b>Coordinating</b> — the FANBOYS seven, joining equals: <i>for, and, nor, but, " +
            "or, yet, so</i>. Either side could stand alone.</p>" +
            "<p><b>Subordinating</b> — <i>because, although, when, if, as, while</i>. What follows " +
            "cannot stand alone.</p>" +
            "<p><b>Correlative</b> — matched pairs: <i>neither…nor</i>, <i>not only…but</i>, " +
            "<i>either…or</i>, <i>both…and</i>.</p>",
          labels: ["coordinating-conjunction", "subordinating-conjunction"],
        },
        {
          heading: "The pairs",
          body: "One last look at the pairs, because they are the kind you are most likely to read " +
            "straight past." +
            "<p>Both halves have to be present. <i>“Neither by word nor deed”</i> would collapse if " +
            "you removed either word, and that mutual dependence is what makes the pair a single " +
            "conjunction rather than two.</p>",
          labels: ["correlative-conjunction"],
        },
      ],
      items: [
        {
          after: "Two that connect, one that does not",
          stem: "What is the difference between a preposition and a conjunction, in one line?",
          options: [
            { text: "A preposition takes an object; a conjunction takes none", correct: true,
              feedback: "That is the whole difference, and it decides every hard case." },
            { text: "A preposition joins clauses; a conjunction joins nouns", feedback: "The other way around. A conjunction is the one that can join clauses." },
            { text: "Prepositions are short and conjunctions are long", feedback: "\"And\" and \"beneath\" would both disagree." },
            { text: "A preposition can start a sentence and a conjunction cannot", feedback: "Both can: \"Within the wall…\" and \"But I must first…\"" },
          ],
        },
        {
          after: "The three kinds of joining",
          stem: "Which of these could <i>not</i> be a coordinating conjunction?",
          options: [
            { text: "although", correct: true, feedback: "Right — \"although\" always makes what follows depend on what came before. Subordinating." },
            { text: "yet", feedback: "One of the FANBOYS seven: \"And yet some fools will have it…\"" },
            { text: "nor", feedback: "One of the seven, and it also does correlative duty with \"neither.\"" },
            { text: "so", feedback: "One of the seven." },
          ],
        },
        {
          after: "The pairs",
          stem: "Why is <i>neither…nor</i> counted as <b>one</b> conjunction rather than two?",
          options: [
            { text: "Because neither half works without the other", correct: true,
              feedback: "That is what \"correlative\" means — they relate to each other, and the pair does one job." },
            { text: "Because they are next to each other", feedback: "They are not — \"neither by word nor deed\" has two words between them." },
            { text: "Because \"nor\" is not really a conjunction", feedback: "It is: one of the FANBOYS seven." },
            { text: "Because they mean the same thing", feedback: "They do different halves of the same job." },
          ],
        },
        {
          stem: "You have finished all nine. Which one can be removed from a sentence without breaking it?",
          options: [
            { text: "The interjection", correct: true,
              feedback: "The only one. Every other part of speech is load-bearing somewhere." },
            { text: "The adjective", feedback: "Often you can, and the sentence gets duller — but an adjective after a linking verb cannot go: \"these vaults are\" is broken." },
            { text: "The adverb", feedback: "Usually removable too, but that is a tendency. An interjection is removable by definition." },
            { text: "The determiner", feedback: "Try it: \"man wore motley\" is not English." },
          ],
        },
        {
          stem: "One question left, and it is the one this whole unit was about. What is a part of speech?",
          options: [
            { text: "The job a word is doing in the sentence in front of you", correct: true,
              feedback: "That is it. \"He\" is a pronoun in one line of Poe and an interjection three pages later, and the word never changed." },
            { text: "A category every word permanently belongs to", feedback: "Most common words belong to two or three, depending on the sentence." },
            { text: "A rule about where a word may sit", feedback: "Position is a clue to the job, not the job itself." },
            { text: "A way of spelling", feedback: "Spelling never changes when a word changes jobs." },
          ],
        },
        {
          /* "as" would be the obvious sixth word and it is left out: it is a
           * conjunction in one of these passages and does preposition work in
           * "as for Luchesi", so it cannot be sorted out of context. Item 5
           * above is where it belongs, with a sentence attached. */
          kind: "sort",
          stem: "Six words from Cluster D. Tap a word, then tap its part of speech.",
          buckets: ["preposition", "conjunction", "interjection"],
          words: [
            { word: "through", bucket: "preposition" },
            { word: "and", bucket: "conjunction" },
            { word: "Ugh!", bucket: "interjection" },
            { word: "when", bucket: "conjunction" },
            { word: "upon", bucket: "preposition" },
            { word: "Enough", bucket: "interjection" },
          ],
          note: "“As” is missing on purpose — it is a conjunction in one of these " +
            "passages and does preposition work in “as for Luchesi,” so it needs a " +
            "sentence around it before it can be sorted.",
        },
      ],
    },
  ]);
})();
