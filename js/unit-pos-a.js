/* Sentence Forge — Unit 1, Cluster A: words that name.
 *
 * Three passages and four stops: Nouns, Determiners, Pronouns, and Review A.
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

  /* Lesson 1 — Nouns. Every one of the six noun subtypes has at least one real
   * instance in these sentences; the base `noun` is used for the plain cases
   * introduced by the first teach screen. */
  function buildNouns() {
    return passage(
      "Unit 1 · Lesson 1 — Nouns",
      "Poe, \"The Cask of Amontillado\": common, proper, collective, abstract, concrete, and possessive nouns.",
      [
        line("The thousand injuries of Fortunato I had borne as I best could, but when he ventured upon insult, I vowed revenge.",
          ["determiner", "adjective", "common-noun", "preposition", "proper-noun",
            "pronoun", "verb", "verb", "conjunction", "pronoun", "adverb", "verb",
            "conjunction", "conjunction", "pronoun", "verb", "preposition",
            "abstract-noun", "pronoun", "verb", "abstract-noun"],
          {
            2: "\"Injuries\" names a general thing, not a specific one — a common noun.",
            4: "\"Fortunato\" names one particular person and is capitalized — a proper noun.",
            17: "You cannot touch an insult. It is an idea, so it is an abstract noun.",
            20: "\"Revenge\" is a feeling and a purpose — abstract, not concrete.",
          }),

        line("I must not only punish, but punish with impunity.",
          ["pronoun", "verb", "adverb", "adverb", "verb", "conjunction", "verb",
            "preposition", "abstract-noun"],
          { 8: "\"Impunity\" means freedom from punishment — an idea, so an abstract noun." }),

        line("A wrong is unredressed when retribution overtakes its redresser.",
          ["determiner", "abstract-noun", "verb", "adjective", "conjunction",
            "abstract-noun", "verb", "adjective", "common-noun"],
          {
            1: "\"Wrong\" is usually an adjective, but after \"A\" it names a thing — here it is a noun.",
            8: "A \"redresser\" is the person who puts a wrong right — a general person, so a common noun.",
          }),

        line("It hangs like moss upon the vaults.",
          ["pronoun", "verb", "preposition", "noun", "preposition", "determiner", "noun"],
          { 3: "Plain nouns like \"moss\" and \"vaults\" need no subtype to be nouns." }),

        line("\"The Montresors,\" I replied, \"were a great and numerous family.\"",
          ["determiner", "proper-noun", "pronoun", "verb", "verb", "determiner",
            "adjective", "conjunction", "adjective", "collective-noun"],
          {
            1: "\"Montresors\" names one particular family, so it is a proper noun.",
            9: "\"Family\" names a group of people as a single unit — a collective noun.",
          }),

        line("We are below the river's bed.",
          ["pronoun", "verb", "preposition", "determiner", "possessive-noun", "concrete-noun"],
          {
            4: "The apostrophe shows ownership: the bed belongs to the river — a possessive noun.",
            5: "A riverbed is something you could stand on, so it is a concrete noun.",
          }),

        line("The drops of moisture trickle among the bones.",
          ["determiner", "concrete-noun", "preposition", "concrete-noun", "verb",
            "preposition", "determiner", "concrete-noun"],
          { 1: "You can see and feel drops, moisture, and bones — all concrete nouns." }),
      ]
    );
  }

  /* Lesson 2 — Determiners.
   *
   * `article`, `definite-article` and `indefinite-article` are SIBLINGS under
   * `determiner`, not a chain, so a sentence that labelled one "the" as `article`
   * and another as `definite-article` would offer two right answers to one
   * question. The rule here, and it is load-bearing: within ONE sentence, every
   * word of the determiner family carries the SAME label. Sentences 1-2 use the
   * base, 3-4 the class label, 5-7 the definite/indefinite contrast — which is
   * safe to mix, because "the" and "a/an" cannot be confused for each other.
   *
   * Possessives (my, his, your) and demonstratives (this, these) are labelled
   * `adjective` here, matching Lesson 1 and Orientation; they are taught as
   * `possessive-adjective` / `demonstrative-adjective` in Lesson 5. Number words
   * are `adjective` here for the same reason. That is why this stop is about
   * articles and little else. */
  function buildDeterminers() {
    return passage(
      "Unit 1 · Lesson 2 — Determiners",
      "Poe, \"The Cask of Amontillado\": the determiner, the article, and the definite/indefinite contrast.",
      [
        line("It was about dusk, one evening during the supreme madness of the carnival season, that I encountered my friend.",
          ["pronoun", "verb", "preposition", "noun", "determiner", "noun",
            "preposition", "determiner", "adjective", "noun", "preposition",
            "determiner", "adjective", "noun", "conjunction", "pronoun", "verb",
            "adjective", "noun"],
          {
            4: "\"One evening\" does not mean a single evening — it means a certain evening. That is a determiner's job.",
            7: "Both \"the\"s here are determiners too. Every word that introduces a noun belongs to this family.",
          }),

        line("For me it is no matter.",
          ["preposition", "pronoun", "pronoun", "verb", "determiner", "noun"],
          { 4: "\"No\" introduces \"matter\" and tells you how much of it there is: none. A determiner." }),

        line("The vaults are insufferably damp.",
          ["article", "noun", "verb", "adverb", "adjective"],
          { 0: "\"A\", \"an\", and \"the\" are the three articles — by far the most common determiners in English." }),

        line("\"A mason,\" I replied.",
          ["article", "noun", "pronoun", "verb"],
          { 0: "Two words, and one of them is an article. You can hardly write a sentence without one." }),

        line("\"He is an ignoramus,\" interrupted my friend, as he stepped unsteadily forward, while I followed immediately at his heels.",
          ["pronoun", "verb", "indefinite-article", "noun", "verb", "adjective",
            "noun", "conjunction", "pronoun", "verb", "adverb", "adverb",
            "conjunction", "pronoun", "verb", "adverb", "preposition", "adjective",
            "noun"],
          { 2: "\"An\", not \"a\", because \"ignoramus\" starts with a vowel sound. It is still the indefinite article." }),

        line("It was not the cry of a drunken man.",
          ["pronoun", "verb", "adverb", "definite-article", "noun", "preposition",
            "indefinite-article", "adjective", "noun"],
          {
            3: "\"The cry\" — one particular cry you already know about. Definite.",
            6: "\"A drunken man\" — any drunken man, mentioned for the first time. Indefinite.",
          }),

        line("The wall was now nearly upon a level with my breast.",
          ["definite-article", "noun", "verb", "adverb", "adverb", "preposition",
            "indefinite-article", "noun", "preposition", "adjective", "noun"],
          { 0: "Both articles in one sentence: the wall we have been reading about, and a level we have not." }),
      ]
    );
  }

  /* Lesson 3 — Pronouns.
   *
   * TWO of this stop's focus labels have NO real instance anywhere in the story:
   * `possessive-pronoun` (mine, yours, hers — Poe writes only possessives that sit
   * in front of a noun, which are adjectives) and `interrogative-pronoun` (not one
   * question in the story opens with who, whom, whose, which, or what). They are
   * declared in the stop's `handTaught` list and covered by written items instead.
   * See the proposal's "As built — Phase 2". */
  function buildPronouns() {
    return passage(
      "Unit 1 · Lesson 3 — Pronouns",
      "Poe, \"The Cask of Amontillado\": personal, reflexive, relative, demonstrative, and indefinite pronouns.",
      [
        line("\"Drink,\" I said, presenting him the wine.",
          ["verb", "pronoun", "verb", "verb", "pronoun", "determiner", "noun"],
          { 4: "\"I\" and \"him\" both stand in for a name. Without pronouns this story would repeat \"Montresor\" and \"Fortunato\" in every line." }),

        line("He prided himself on his connoisseurship in wine.",
          ["personal-pronoun", "verb", "reflexive-pronoun", "preposition",
            "adjective", "noun", "preposition", "noun"],
          {
            0: "\"He\" is a personal pronoun: it names a specific person without naming them.",
            2: "\"Himself\" points straight back at the subject \"He\" — that is what makes it reflexive.",
          }),

        line("\"It is this,\" I answered, producing a trowel from beneath the folds of my roquelaire.",
          ["personal-pronoun", "verb", "demonstrative-pronoun", "personal-pronoun",
            "verb", "verb", "determiner", "noun", "preposition", "preposition",
            "determiner", "noun", "preposition", "adjective", "noun"],
          { 2: "\"This\" stands completely alone here — no noun after it. That is a demonstrative PRONOUN. In \"this trowel\" the same word would be an adjective." }),

        line("As I said these words I busied myself among the pile of bones of which I have before spoken.",
          ["conjunction", "personal-pronoun", "verb", "adjective", "noun",
            "personal-pronoun", "verb", "reflexive-pronoun", "preposition",
            "determiner", "noun", "preposition", "noun", "preposition",
            "relative-pronoun", "personal-pronoun", "verb", "adverb", "verb"],
          {
            3: "\"These words\" — a noun follows, so this one is an adjective, not a pronoun.",
            14: "\"Which\" starts a clause that describes \"bones.\" A relative pronoun does two jobs at once: it stands in for a noun and it joins.",
          }),

        line("I did this, and the clamourer grew still.",
          ["personal-pronoun", "verb", "demonstrative-pronoun", "conjunction",
            "determiner", "noun", "verb", "adverb"],
          { 2: "\"This\" means the whole thing he has just described. Standing alone, so a pronoun." }),

        line("If any one has a critical turn, it is he.",
          ["conjunction", "adjective", "indefinite-pronoun", "verb", "determiner",
            "adjective", "noun", "personal-pronoun", "verb", "personal-pronoun"],
          { 2: "\"Any one\" refers to no particular person at all — indefinite. Poe spells it as two words; today we would write \"anyone.\"" }),

        line("\"Enough,\" he said; \"the cough is a mere nothing; it will not kill me.",
          ["interjection", "personal-pronoun", "verb", "determiner", "noun", "verb",
            "determiner", "adjective", "indefinite-pronoun", "personal-pronoun",
            "verb", "adverb", "verb", "personal-pronoun"],
          { 8: "\"Nothing\" is an indefinite pronoun: it stands for no thing in particular." }),
      ]
    );
  }

  wjt.unitPos.examples([
    {
      id: "unit-pos-nouns",
      title: "Unit 1 · Lesson 1 — Nouns",
      subtitle: "Poe · common, proper, collective, abstract, concrete, possessive",
      group: "unit-pos",
      build: buildNouns,
    },
    {
      id: "unit-pos-determiners",
      title: "Unit 1 · Lesson 2 — Determiners",
      subtitle: "Poe · the determiner, the article, definite and indefinite",
      group: "unit-pos",
      build: buildDeterminers,
    },
    {
      id: "unit-pos-pronouns",
      title: "Unit 1 · Lesson 3 — Pronouns",
      subtitle: "Poe · personal, reflexive, relative, demonstrative, indefinite",
      group: "unit-pos",
      build: buildPronouns,
    },
  ]);

  wjt.unitPos.stops([
    {
      id: "nouns", n: 1, cluster: "A",
      title: "Nouns",
      blurb: "Person, place, thing, or idea — and the six kinds worth telling apart.",
      lessonId: "unit-pos-nouns",
      focus: ["noun", "common-noun", "proper-noun", "collective-noun",
        "abstract-noun", "concrete-noun", "possessive-noun"],
      tapPerScreen: 4,
      teach: [
        {
          heading: "A noun names something",
          body: "A <b>noun</b> names a person, a place, a thing, or an idea. It is the part of " +
            "speech that answers <i>who?</i> or <i>what?</i>" +
            "<p>A quick test: if you can put <b>the</b> or <b>a</b> in front of a word and it still " +
            "sounds like English, it is probably a noun. <i>The moss. A vault. The revenge.</i></p>" +
            "<p>Every noun below is a noun. The rest of this lesson is about the six labels that " +
            "say <i>what kind</i>.</p>",
          labels: ["noun"],
        },
        {
          heading: "Common and proper",
          body: "A <b>common noun</b> names a general one: <i>a family, a friend, a city</i>. " +
            "A <b>proper noun</b> names one particular one, and is <b>always capitalized</b>: " +
            "<i>Fortunato, Montresor, Paris</i>." +
            "<p>The capital letter is the giveaway, and it is the one rule in this lesson with no " +
            "exceptions. If it is capitalized mid-sentence, it is almost certainly proper.</p>",
          labels: ["common-noun", "proper-noun"],
        },
        {
          heading: "Concrete and abstract",
          body: "A <b>concrete noun</b> names something you could detect with your senses — " +
            "see, hear, touch, taste, or smell it: <i>bones, moisture, bells</i>." +
            "<p>An <b>abstract noun</b> names something real but untouchable: <i>revenge, " +
            "impunity, insult</i>. Poe's story runs on abstract nouns, which is part of why it " +
            "feels the way it does.</p>" +
            "<p>The test: <i>could I photograph it?</i> If yes, concrete. If no, abstract.</p>",
          labels: ["concrete-noun", "abstract-noun"],
        },
        {
          heading: "Collective and possessive",
          body: "A <b>collective noun</b> names a group as though it were one thing: " +
            "<i>a family, a flock, a brotherhood</i>. One word, many members." +
            "<p>A <b>possessive noun</b> shows ownership with an apostrophe: <i>the river's bed, " +
            "the Montresors' vaults</i>. Look for the apostrophe — and be careful, because " +
            "<i>its</i> has no apostrophe and is not a possessive noun at all.</p>",
          labels: ["collective-noun", "possessive-noun"],
        },
      ],
      items: [
        {
          after: "A noun names something",
          stem: "Which test most reliably suggests a word is a noun?",
          options: [
            { text: "\"The\" or \"a\" can go in front of it", correct: true,
              feedback: "Yes. Determiners introduce nouns, so if one fits, a noun usually follows." },
            { text: "It ends in -ing", feedback: "That is a verb form more often than a noun." },
            { text: "It comes first in the sentence", feedback: "Often true, but plenty of sentences open with something else." },
            { text: "It is longer than five letters", feedback: "Length tells you nothing about a word's job." },
          ],
        },
        {
          after: "Common and proper",
          stem: "Which of these is a <b>proper noun</b>?",
          options: [
            { text: "Montresors", correct: true, feedback: "Right — it names one particular family and is capitalized." },
            { text: "family", feedback: "\"Family\" names a group in general — common, and also collective." },
            { text: "friend", feedback: "A general person, so a common noun. \"Fortunato\" would be the proper one." },
            { text: "vaults", feedback: "A general place — common." },
          ],
        },
        {
          after: "Common and proper",
          stem: "Poe writes <i>“the Italian vintages.”</i> Is <b>Italian</b> a proper noun here?",
          options: [
            { text: "No — it is describing \"vintages,\" so it is an adjective", correct: true,
              feedback: "Exactly. A capitalized describing word is a proper <i>adjective</i>. Capital letters alone do not make a noun." },
            { text: "Yes, because it is capitalized", feedback: "Capitalization is a strong hint, but here \"Italian\" describes the vintages rather than naming a thing." },
            { text: "Yes, because Italy is a place", feedback: "\"Italy\" would be the proper noun. \"Italian\" is doing a describing job." },
            { text: "No — it is a verb", feedback: "It names no action." },
          ],
        },
        {
          after: "Concrete and abstract",
          stem: "Which word is an <b>abstract noun</b>?",
          options: [
            { text: "impunity", correct: true, feedback: "Yes — you cannot see or touch freedom from punishment." },
            { text: "trowel", feedback: "A trowel is a tool you could hold. Concrete." },
            { text: "bones", feedback: "You can see and touch bones. Concrete." },
            { text: "bells", feedback: "You can hear and touch them. Concrete." },
          ],
        },
        {
          after: "Concrete and abstract",
          stem: "What is the quickest test for concrete versus abstract?",
          options: [
            { text: "Could you photograph it?", correct: true,
              feedback: "A good test. You can photograph moisture; you cannot photograph revenge." },
            { text: "Is it capitalized?", feedback: "That test is for proper versus common." },
            { text: "Does it end in -tion?", feedback: "Many abstract nouns do, but plenty do not — <i>revenge</i>, <i>hope</i>, <i>wrong</i>." },
            { text: "Is it plural?", feedback: "Number has nothing to do with it." },
          ],
        },
        {
          after: "Collective and possessive",
          stem: "Which is a <b>collective noun</b>?",
          options: [
            { text: "family", correct: true, feedback: "Right — one word naming a group of people as a single unit." },
            { text: "Montresors", feedback: "Close thinking, but that is a proper noun — it names this particular family." },
            { text: "redresser", feedback: "That is one person, so it is a common noun." },
            { text: "moisture", feedback: "Not a group of members — a concrete noun." },
          ],
        },
        {
          after: "Collective and possessive",
          stem: "In <i>“We are below the river's bed,”</i> which word is the possessive noun?",
          options: [
            { text: "river's", correct: true, feedback: "Yes — the apostrophe shows the bed belongs to the river." },
            { text: "bed", feedback: "\"Bed\" is the thing owned, not the owner. It is a concrete noun." },
            { text: "We", feedback: "\"We\" is a pronoun." },
            { text: "the", feedback: "A determiner." },
          ],
        },
        {
          stem: "One last trap: is <b>its</b> a possessive noun?",
          options: [
            { text: "No — it is a pronoun-type word, and it has no apostrophe", correct: true,
              feedback: "Correct. <i>Its</i> shows ownership but is not a noun. And <i>it's</i> with an apostrophe means \"it is\"." },
            { text: "Yes, because it shows ownership", feedback: "It does show ownership — but a possessive <i>noun</i> has to be a noun, and <i>its</i> is not." },
            { text: "Yes, because possessives always have apostrophes", feedback: "<i>Its</i> is exactly the exception: possessive, no apostrophe." },
            { text: "Only when it starts a sentence", feedback: "Position makes no difference." },
          ],
        },
      ],
    },

    {
      id: "determiners", n: 2, cluster: "A",
      title: "Determiners",
      blurb: "The little words that introduce a noun — above all, the three articles.",
      lessonId: "unit-pos-determiners",
      focus: ["determiner", "article", "definite-article", "indefinite-article"],
      tapPerScreen: 3,
      teach: [
        {
          heading: "A determiner introduces a noun",
          body: "A <b>determiner</b> is a small word that goes in front of a noun and gets it " +
            "ready: it tells you <i>which one</i>, or <i>how many</i>, or <i>whose</i>." +
            "<p>You already used them in Lesson 1 without being told. In <i>“the river's bed”</i> " +
            "and <i>“a great and numerous family,”</i> the words <b>the</b> and <b>a</b> are doing " +
            "nothing but introducing the noun that follows.</p>" +
            "<p>Determiners are almost never the interesting word in a sentence. They are worth " +
            "knowing because they are a <b>signpost</b>: where you see one, a noun is coming.</p>",
          labels: ["determiner"],
        },
        {
          heading: "The three articles",
          body: "Three determiners are so common they get their own name. <b>A</b>, <b>an</b>, and " +
            "<b>the</b> are the <b>articles</b>, and between them they are two of the ten most " +
            "frequent words in English." +
            "<p>That frequency is why they are worth a whole screen: if you can spot an article, " +
            "you can find nouns in a sentence you do not even understand.</p>",
          labels: ["article"],
        },
        {
          heading: "Definite and indefinite",
          body: "The three articles split cleanly in two, and the split carries real meaning." +
            "<p><b>The</b> is the <b>definite article</b>. It points at one particular thing that " +
            "you and the reader both already have in mind: <i>the nitre, the vaults, the wall</i>.</p>" +
            "<p><b>A</b> and <b>an</b> are the <b>indefinite article</b>. They introduce something " +
            "for the first time, or any old one of its kind: <i>a bottle, a mason, an ignoramus</i>. " +
            "Use <b>an</b> when the next word starts with a vowel sound.</p>" +
            "<p>Watch Poe use the difference: <i>“It was not the cry of a drunken man.”</i> We know " +
            "which cry — we just heard it. We do not know which man.</p>",
          labels: ["definite-article", "indefinite-article"],
        },
      ],
      items: [
        {
          after: "A determiner introduces a noun",
          stem: "A determiner is a useful thing to spot because…",
          options: [
            { text: "a noun is almost always coming right after it", correct: true,
              feedback: "Exactly. That is what makes determiners a signpost rather than a destination." },
            { text: "it is always the most important word in the sentence", feedback: "Nearly the opposite — determiners carry very little meaning of their own." },
            { text: "it tells you the tense", feedback: "Tense lives on verbs. Determiners never carry it." },
            { text: "it is always capitalized", feedback: "Only when it happens to start a sentence." },
          ],
        },
        {
          after: "The three articles",
          stem: "How many articles does English have?",
          options: [
            { text: "Three: a, an, the", correct: true, feedback: "Right — and \"a\" and \"an\" are two forms of the same one, which is why some books say two." },
            { text: "One: the", feedback: "\"The\" is the most common, but \"a\" and \"an\" are articles too." },
            { text: "Nine, one per part of speech", feedback: "No — articles are all determiners, and there are only three." },
            { text: "As many as there are nouns", feedback: "No. The whole point is that a tiny handful of words does this job for every noun in the language." },
          ],
        },
        {
          after: "Definite and indefinite",
          stem: "Poe writes <i>“He is an ignoramus.”</i> Why <b>an</b> rather than <b>a</b>?",
          options: [
            { text: "Because \"ignoramus\" begins with a vowel sound", correct: true,
              feedback: "Right — and it is the sound that matters, not the letter. It is \"an hour\" but \"a university.\"" },
            { text: "Because \"ignoramus\" is an insult", feedback: "Meaning has nothing to do with it. \"An\" is about sound." },
            { text: "Because \"an\" is the definite article", feedback: "\"An\" is indefinite. \"The\" is the definite one." },
            { text: "Because the word is long", feedback: "Length makes no difference — it is \"a lengthy speech.\"" },
          ],
        },
        {
          after: "Definite and indefinite",
          stem: "In <i>“The wall was now nearly upon a level with my breast,”</i> which word is the <b>definite</b> article?",
          options: [
            { text: "The", correct: true, feedback: "Yes — one particular wall, the one he has been building all along." },
            { text: "a", feedback: "\"A\" is the indefinite one. Both articles really are in this sentence." },
            { text: "my", feedback: "\"My\" does show which one, but it is a possessive sitting in front of a noun — you will meet it as a possessive adjective in Lesson 5." },
            { text: "now", feedback: "\"Now\" is an adverb telling you when." },
          ],
        },
        {
          stem: "Is <b>my</b> a determiner or an adjective in <i>“my friend”</i>?",
          options: [
            { text: "Both descriptions are defended by real grammar books — this unit calls it an adjective", correct: true,
              feedback: "Honest answer. \"My\" introduces a noun like a determiner and describes it like an adjective. Lesson 5 teaches it as a possessive adjective, and this unit stays consistent with that." },
            { text: "Definitely a determiner, and calling it an adjective is a mistake", feedback: "Many modern grammars would agree with you — but plenty of school grammars call it a possessive adjective, and this unit does." },
            { text: "It is a pronoun", feedback: "\"Mine\" is the pronoun. \"My\" needs a noun after it." },
            { text: "It is a noun", feedback: "It names nothing on its own." },
          ],
        },
      ],
    },

    {
      id: "pronouns", n: 3, cluster: "A",
      title: "Pronouns",
      blurb: "Words that stand in for a noun — and the seven kinds.",
      lessonId: "unit-pos-pronouns",
      focus: ["pronoun", "personal-pronoun", "possessive-pronoun", "reflexive-pronoun",
        "relative-pronoun", "demonstrative-pronoun", "interrogative-pronoun",
        "indefinite-pronoun"],
      /* Poe's story contains no instance of either of these, so no `tap` question
       * can be generated for them and the written items below carry them instead.
       * tools/smoke-test.js checks both halves of that claim. */
      handTaught: ["possessive-pronoun", "interrogative-pronoun"],
      tapPerScreen: 2,
      teach: [
        {
          heading: "A pronoun saves you from repeating a noun",
          body: "A <b>pronoun</b> takes the place of a noun. Without them, this story would read: " +
            "<i>“Montresor took Fortunato's arm and led Fortunato through the vaults, and " +
            "Fortunato followed Montresor.”</i>" +
            "<p>The noun a pronoun stands in for is called its <b>antecedent</b> — the thing that " +
            "came before. Every pronoun needs one, or the sentence stops making sense.</p>" +
            "<p>There are seven kinds. You will meet five of them in Poe's own words; the last " +
            "two he never happens to use.</p>",
          labels: ["pronoun"],
        },
        {
          heading: "Personal and reflexive",
          body: "<b>Personal pronouns</b> are the ones you use every day: <i>I, you, he, she, it, " +
            "we, they</i>, and their object forms <i>me, him, her, us, them</i>. They stand for a " +
            "specific person or thing." +
            "<p>A <b>reflexive pronoun</b> ends in <b>-self</b> or <b>-selves</b> and points back " +
            "at whoever is doing the acting: <i>“He prided <b>himself</b>”</i>, <i>“I busied " +
            "<b>myself</b>”</i>. The doer and the receiver are the same person.</p>",
          labels: ["personal-pronoun", "reflexive-pronoun"],
        },
        {
          heading: "Relative and demonstrative",
          body: "A <b>relative pronoun</b> — <i>who, whom, whose, which, that</i> — starts a clause " +
            "that describes a noun, and does two jobs at once: it stands in for the noun and it " +
            "joins the clause on. <i>“the pile of bones of <b>which</b> I have before spoken.”</i>" +
            "<p>A <b>demonstrative pronoun</b> — <i>this, that, these, those</i> — points at " +
            "something and then <b>stands alone</b>. <i>“It is <b>this</b>,”</i> says Montresor, " +
            "showing the trowel.</p>" +
            "<p><b>Here is the trap,</b> and it is the point of Review A: those same four words " +
            "become <i>adjectives</i> the moment a noun follows them. <i>“<b>These</b> vaults”</i> " +
            "— adjective. <i>“one of <b>these</b>”</i> — pronoun. Look at what comes next, not at " +
            "the word.</p>",
          labels: ["relative-pronoun", "demonstrative-pronoun"],
        },
        {
          heading: "Indefinite pronouns",
          body: "An <b>indefinite pronoun</b> stands for nobody and nothing in particular: " +
            "<i>anyone, everyone, someone, none, nothing, some, all, one</i>." +
            "<p>Poe uses two of them within a few pages of each other: <i>“If <b>any one</b> has a " +
            "critical turn”</i> and <i>“the cough is a mere <b>nothing</b>.”</i> Neither points at " +
            "a person or a thing you could name.</p>",
          labels: ["indefinite-pronoun"],
        },
        {
          heading: "The two Poe never uses",
          body: "Two kinds of pronoun do not appear anywhere in <i>The Cask of Amontillado</i>, so " +
            "there is nothing in the story to point at. They are still worth five minutes." +
            "<p>A <b>possessive pronoun</b> shows ownership and <b>stands alone</b>: <i>mine, yours, " +
            "his, hers, ours, theirs</i>. Poe only ever writes the kind that leans on a noun " +
            "(<i>my arm, his cap</i>), which is a possessive <i>adjective</i>. The difference: " +
            "<i>“That trowel is <b>mine</b>”</i> versus <i>“That is <b>my</b> trowel.”</i></p>" +
            "<p>An <b>interrogative pronoun</b> asks a question: <i>who, whom, whose, which, what</i>. " +
            "The story is full of questions — <i>“How?”</i>, <i>“Whither?”</i>, <i>“And the " +
            "motto?”</i> — but not one of them opens with an interrogative pronoun.</p>",
          labels: ["possessive-pronoun", "interrogative-pronoun"],
        },
      ],
      items: [
        {
          after: "A pronoun saves you from repeating a noun",
          stem: "The noun that a pronoun stands in for is called its…",
          options: [
            { text: "antecedent", correct: true, feedback: "Right — literally \"the thing going before.\"" },
            { text: "object", feedback: "An object is a role in the sentence, not the noun a pronoun replaces." },
            { text: "subject", feedback: "Same problem — a subject is a role. A pronoun's antecedent can be either." },
            { text: "modifier", feedback: "A modifier describes. A pronoun replaces." },
          ],
        },
        {
          after: "Personal and reflexive",
          stem: "In <i>“He prided himself on his connoisseurship,”</i> why is <b>himself</b> reflexive?",
          options: [
            { text: "Because the one doing the priding and the one being prided are the same person", correct: true,
              feedback: "Yes — that is exactly what \"reflexive\" means. The action bends back on the doer." },
            { text: "Because it ends in -self", feedback: "The ending is the clue, but the reason is the meaning: the action comes back to the subject." },
            { text: "Because it comes after the verb", feedback: "Plenty of pronouns come after a verb without being reflexive — \"He praised him.\"" },
            { text: "Because \"He\" is a personal pronoun", feedback: "True, but that is a fact about \"He,\" not about \"himself.\"" },
          ],
        },
        {
          after: "Relative and demonstrative",
          stem: "In which of these is <b>these</b> a <b>pronoun</b> rather than an adjective?",
          options: [
            { text: "“From one of these depended a short chain.”", correct: true,
              feedback: "Right — no noun follows, so \"these\" is standing in for one itself. Pronoun." },
            { text: "“These vaults,” he said, “are extensive.”", feedback: "\"Vaults\" follows immediately, so here \"these\" is describing it — a demonstrative adjective." },
            { text: "“As I said these words…”", feedback: "\"Words\" follows, so this one is an adjective too." },
            { text: "“These orders were sufficient.”", feedback: "\"Orders\" follows. Adjective." },
          ],
        },
        {
          after: "Indefinite pronouns",
          stem: "Which word in <i>“the cough is a mere nothing”</i> is the indefinite pronoun?",
          options: [
            { text: "nothing", correct: true, feedback: "Yes. It stands for no particular thing at all — which is the whole idea." },
            { text: "cough", feedback: "\"Cough\" is a noun, and a very definite one." },
            { text: "mere", feedback: "\"Mere\" is an adjective describing how slight the nothing is." },
            { text: "a", feedback: "\"A\" is the indefinite article — a determiner, not a pronoun. Easy to confuse because both are called \"indefinite.\"" },
          ],
        },
        {
          after: "The two Poe never uses",
          label: "possessive-pronoun",
          stem: "Which sentence contains a <b>possessive pronoun</b>?",
          options: [
            { text: "That trowel is mine.", correct: true,
              feedback: "Yes — \"mine\" shows ownership and stands completely alone. That is a possessive pronoun." },
            { text: "That is my trowel.", feedback: "\"My\" leans on the noun \"trowel,\" which makes it a possessive adjective. Same idea, different job." },
            { text: "He took my arm.", feedback: "\"My\" again, and again with a noun after it." },
            { text: "The bells upon his cap jingled.", feedback: "\"His\" has \"cap\" after it — possessive adjective. \"His\" can be a pronoun, but only when it stands alone: \"the cap is his.\"" },
          ],
        },
        {
          after: "The two Poe never uses",
          label: "interrogative-pronoun",
          stem: "Which question opens with an <b>interrogative pronoun</b>?",
          options: [
            { text: "Which of these casks is the Amontillado?", correct: true,
              feedback: "Yes — \"which\" is asking, and it stands in for the answer. Who, whom, whose, which, and what are the five." },
            { text: "How long have you had that cough?", feedback: "\"How\" asks a question, but it is an adverb — it asks about manner or extent, not about a person or thing." },
            { text: "Whither?", feedback: "Poe's word for \"where to.\" An adverb, not a pronoun." },
            { text: "Impossible?", feedback: "An adjective on its own, said with a question mark." },
          ],
        },
      ],
    },

    {
      id: "review-a", n: 4, cluster: "A",
      title: "Review A — words that name",
      blurb: "Nouns, determiners, and pronouns together — and the words that are two of them.",
      reviews: ["nouns", "determiners", "pronouns"],
      focus: ["noun", "determiner", "pronoun", "possessive-noun", "definite-article",
        "proper-noun", "demonstrative-pronoun"],
      tapPerScreen: 1,
      teach: [
        {
          heading: "Three families, one job between them",
          body: "Cluster A was about the words that <b>name</b> things and the words that go with " +
            "them. A <b>noun</b> names; a <b>determiner</b> introduces a noun; a <b>pronoun</b> " +
            "replaces one." +
            "<p>The questions ahead are drawn from all three of your passages at once, so you will " +
            "not be told which lesson a sentence came from.</p>",
          labels: ["noun", "determiner", "pronoun"],
        },
        {
          heading: "The apostrophe and the article",
          body: "Two things worth pinning down before you move on." +
            "<p>A <b>possessive noun</b> has an apostrophe and is still a noun: <i>the river's bed</i>. " +
            "<i>Its</i> shows ownership with no apostrophe and is not a noun at all — and " +
            "<i>it's</i> means \"it is.\"</p>" +
            "<p><b>The</b> is the <b>definite article</b>: one particular thing, already known. If " +
            "you can swap in \"a\" without changing which thing you mean, it was not doing definite " +
            "work.</p>",
          labels: ["possessive-noun", "definite-article"],
        },
        {
          heading: "The same word, two parts of speech",
          body: "This is the thing that catches everyone out, and it is why Cluster A ends with a " +
            "review rather than a new lesson." +
            "<p><b>This, that, these, those</b> are <b>pronouns</b> when they stand alone and " +
            "<b>adjectives</b> when a noun follows: <i>“It is <b>this</b>”</i> against <i>“<b>these</b> " +
            "vaults.”</i></p>" +
            "<p>A <b>proper noun</b> is capitalized and names one particular thing — but a capital " +
            "letter alone proves nothing. <i>Fortunato</i> is a proper noun; <i>Italian</i> in " +
            "<i>“the Italian vintages”</i> is a proper <b>adjective</b>.</p>" +
            "<p><b>The rule underneath both:</b> look at what the word is doing in this sentence, " +
            "not at the word.</p>",
          labels: ["proper-noun", "demonstrative-pronoun"],
        },
      ],
      items: [
        {
          after: "Three families, one job between them",
          stem: "Which of these does a <b>determiner</b> never do?",
          options: [
            { text: "Replace a noun so you do not have to repeat it", correct: true,
              feedback: "Right — that is a pronoun's job. A determiner always has its noun right there after it." },
            { text: "Tell you which one", feedback: "It does: \"the\" vaults rather than \"a\" vault." },
            { text: "Tell you how many", feedback: "It does: \"no matter,\" \"one evening.\"" },
            { text: "Signal that a noun is coming", feedback: "It does, and that is the most useful thing about it." },
          ],
        },
        {
          after: "The apostrophe and the article",
          stem: "<i>Its</i>, <i>it's</i>, and <i>river's</i>. Which one is a possessive noun?",
          options: [
            { text: "river's", correct: true, feedback: "Yes — a noun, showing ownership, with an apostrophe. All three boxes ticked." },
            { text: "its", feedback: "Shows ownership, but it is not a noun and has no apostrophe." },
            { text: "it's", feedback: "That is a contraction of \"it is.\" It shows no ownership at all." },
            { text: "All three", feedback: "Only one of them is a noun." },
          ],
        },
        {
          after: "The same word, two parts of speech",
          stem: "In <i>“In this respect I did not differ from him,”</i> what is <b>this</b>?",
          options: [
            { text: "A demonstrative adjective — the noun \"respect\" follows it", correct: true,
              feedback: "Right. The word tells you nothing; the noun after it does." },
            { text: "A demonstrative pronoun", feedback: "It would be, if it stood alone — but \"respect\" is right there." },
            { text: "A definite article", feedback: "Only a, an, and the are articles." },
            { text: "A relative pronoun", feedback: "\"This\" never starts a describing clause. Who, whom, whose, which, and that do." },
          ],
        },
        {
          after: "The same word, two parts of speech",
          stem: "Poe writes <i>“the British and Austrian millionaires.”</i> What are <b>British</b> and <b>Austrian</b>?",
          options: [
            { text: "Proper adjectives — capitalized, but describing \"millionaires\"", correct: true,
              feedback: "Exactly the same trap as \"Italian vintages.\" A capital letter is a hint, never a proof." },
            { text: "Proper nouns, because they are capitalized", feedback: "\"Britain\" and \"Austria\" would be the proper nouns. These two describe." },
            { text: "Collective nouns, because they name groups", feedback: "\"Millionaires\" is the noun here, and it is a plain common noun." },
            { text: "Determiners", feedback: "They neither introduce the noun nor say which one." },
          ],
        },
        {
          stem: "One question that covers all of Cluster A: how do you decide a word's part of speech?",
          options: [
            { text: "By what it is doing in the sentence in front of you", correct: true,
              feedback: "That is the whole unit in one line. \"This\" is a pronoun or an adjective depending on nothing but the next word." },
            { text: "By looking it up — each word has one answer", feedback: "Most common English words can do two or three jobs. A dictionary lists all of them." },
            { text: "By its ending", feedback: "Endings help sometimes (-ly, -tion) but they are clues, not rules." },
            { text: "By where it sits in the sentence", feedback: "Position is a strong clue and it is often how you notice — but the test is the job, not the seat." },
          ],
        },
        {
          /* Every word here is unambiguous standing on its own, which is the
           * whole selection rule for a sort: `this` and `these` belong to two
           * parts of speech depending on what follows them, so they cannot be
           * sorted out of context and are deliberately absent. */
          kind: "sort",
          stem: "Six words from your three passages. Tap a word, then tap the part of " +
            "speech it is doing the job of.",
          buckets: ["noun", "determiner", "pronoun"],
          words: [
            { word: "revenge", bucket: "noun" },
            { word: "an", bucket: "determiner" },
            { word: "himself", bucket: "pronoun" },
            { word: "Montresors", bucket: "noun" },
            { word: "the", bucket: "determiner" },
            { word: "which", bucket: "pronoun" },
          ],
          note: "None of these six changes job depending on the sentence around it. " +
            "“This” and “these” do, which is why they are not in the list.",
        },
      ],
    },
  ]);
})();
