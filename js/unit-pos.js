/* Sentence Forge — Unit 1: The Nine Parts of Speech.
 *
 * The content of a self-paced student unit: the passages, the teach screens, and
 * the hand-written question bank. The engine that sequences and scores it is
 * js/study-model.js; the screens are js/study.js.
 *
 * Design record: plans/proposals/curriculum-unit-1-parts-of-speech.md.
 * Read it before editing this file — especially the label budget and C5/C10.
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
 * AUTHORING — every passage here is labelled ONE POS LABEL PER TOKEN via the
 * `line()` helper below, which takes a label per token in order. That is
 * deliberate on two counts:
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

  /* ------------------------------------------------------------------ *
   * Passages
   * ------------------------------------------------------------------ */

  /* Orientation — four short sentences that between them contain all nine
   * parts of speech, each labelled with its BASE label only. */
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

  /* Lesson 4 — Verbs. The heaviest stop in the unit: eight subtypes across three
   * crossing axes. One label per token means each verb gets exactly ONE of them,
   * so each sentence below is dedicated to a single contrast and every verb in it
   * is labelled from that contrast only. That is what keeps the questions fair —
   * an action verb is also transitive or intransitive, so the two ideas never
   * share a sentence. */
  function buildVerbs() {
    return passage(
      "Unit 1 · Lesson 4 — Verbs",
      "Poe, \"The Cask of Amontillado\": action, linking, helping, modal, transitive, intransitive, regular, and irregular verbs.",
      [
        line("I again paused, and holding the flambeaux over the mason-work, threw a few feeble rays upon the figure within.",
          ["pronoun", "adverb", "verb", "conjunction", "verb", "determiner", "noun",
            "preposition", "determiner", "noun", "verb", "determiner", "adjective",
            "adjective", "noun", "preposition", "determiner", "noun", "adverb"],
          { 2: "Three verbs in one sentence: paused, holding, threw. A sentence can carry as many as it needs." }),

        line("He accosted me with excessive warmth, for he had been drinking much.",
          ["pronoun", "action-verb", "pronoun", "preposition", "adjective", "noun",
            "conjunction", "pronoun", "helping-verb", "helping-verb", "action-verb",
            "adverb"],
          {
            1: "\"Accosted\" is something he did — an action verb.",
            8: "\"Had been\" does no acting of its own. It props up \"drinking\" and tells you when — helping verbs.",
          }),

        line("You are rich, respected, admired, beloved; you are happy, as once I was.",
          ["pronoun", "linking-verb", "adjective", "adjective", "adjective",
            "adjective", "pronoun", "linking-verb", "adjective", "conjunction",
            "adverb", "pronoun", "linking-verb"],
          { 1: "\"Are\" is not an action. It links \"You\" to the words that describe you — a linking verb. Every form of BE can do this." }),

        line("We will go back; you will be ill, and I cannot be responsible.",
          ["pronoun", "modal-verb", "action-verb", "adverb", "pronoun", "modal-verb",
            "linking-verb", "adjective", "conjunction", "pronoun", "modal-verb",
            "linking-verb", "adjective"],
          {
            1: "\"Will\" and \"cannot\" are modals: they add possibility, ability, or necessity to the verb they sit in front of.",
            10: "\"Cannot\" is one token here, and it is a modal with the negative fused onto it." }),

        line("He laughed and threw the bottle upwards with a gesticulation I did not understand.",
          ["pronoun", "intransitive-verb", "conjunction", "transitive-verb",
            "determiner", "noun", "adverb", "preposition", "determiner", "noun",
            "pronoun", "helping-verb", "adverb", "transitive-verb"],
          {
            1: "\"Laughed\" what? The question has no answer — nothing receives the laughing. Intransitive.",
            3: "\"Threw\" what? The bottle. That answer is a direct object, which makes \"threw\" transitive.",
          }),

        line("For a brief moment I hesitated — I trembled.",
          ["preposition", "determiner", "adjective", "noun", "pronoun",
            "intransitive-verb", "", "pronoun", "intransitive-verb"],
          { 5: "You cannot hesitate something or tremble something. Both verbs stop where they are." }),

        line("I placed my hand upon the solid fabric of the catacombs, and felt satisfied.",
          ["pronoun", "regular-verb", "adjective", "noun", "preposition",
            "determiner", "adjective", "noun", "preposition", "determiner", "noun",
            "conjunction", "irregular-verb", "adjective"],
          {
            1: "Place → placed. Add -ed and you have the past tense: a regular verb.",
            12: "Feel → felt, not \"feeled.\" The word itself changes, so it is irregular.",
          }),

        line("I laid the second tier, and the third, and the fourth; and then I heard the furious vibrations of the chain.",
          ["pronoun", "irregular-verb", "determiner", "adjective", "noun",
            "conjunction", "determiner", "adjective", "conjunction", "determiner",
            "adjective", "conjunction", "adverb", "pronoun", "irregular-verb",
            "determiner", "adjective", "noun", "preposition", "determiner", "noun"],
          {
            1: "Lay → laid. Hear → heard. Neither one just adds -ed, so both are irregular.",
          }),
      ]
    );
  }

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

  /* ------------------------------------------------------------------ *
   * Register the passages as ordinary examples, so a teacher can Present or
   * Edit them and tools/smoke-test.js validates them for free.
   * ------------------------------------------------------------------ */
  wjt.EXAMPLES = (wjt.EXAMPLES || []).concat([
    {
      id: "unit-pos-orientation",
      title: "Unit 1 · Orientation — All Nine at Once",
      subtitle: "Poe · every part of speech in four sentences",
      group: "unit-pos",
      build: buildOrientation,
    },
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
    {
      id: "unit-pos-verbs",
      title: "Unit 1 · Lesson 4 — Verbs",
      subtitle: "Poe · action, linking, helping, modal, transitive, regular, irregular",
      group: "unit-pos",
      build: buildVerbs,
    },
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

  /* ------------------------------------------------------------------ *
   * The unit
   *
   * `todo: true` marks a stop declared but not yet authored — the unit map
   * renders the whole path so a student sees where it goes. Only `capstone` is
   * left; it lands in plans/017 along with the `sort` step kind.
   *
   * A focus stop's `teach` screens between them must name EVERY id in its
   * `focus`. That is not decoration: js/study-model.js falls back to generating
   * UNLIMITED tap questions for any focus label no teach screen claimed, and
   * `tapPerScreen` is the only thing keeping a stop down to a sitting.
   * ------------------------------------------------------------------ */
  var CLUSTERS = {
    start: "Getting started",
    A: "Cluster A — Words that name",
    B: "Cluster B — The word that acts",
    C: "Cluster C — Words that modify",
    D: "Cluster D — Words that connect and exclaim",
    end: "Showing what you know",
  };

  var STOPS = [
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
      ],
    },

    {
      id: "verbs", n: 5, cluster: "B",
      title: "Verbs",
      blurb: "Action and being: the word the whole sentence turns on. Eight kinds — take it in two sittings.",
      lessonId: "unit-pos-verbs",
      focus: ["verb", "action-verb", "linking-verb", "helping-verb", "transitive-verb",
        "intransitive-verb", "modal-verb", "regular-verb", "irregular-verb"],
      tapPerScreen: 4,
      teach: [
        {
          heading: "The one part of speech a sentence cannot do without",
          body: "A <b>verb</b> is an action or a state of being. It is the only part of speech a " +
            "sentence genuinely cannot manage without: <i>“I trembled”</i> is a whole sentence, and " +
            "<i>“the furious vibrations of the chain”</i> is not." +
            "<p>This is the biggest lesson in the unit — <b>eight</b> kinds of verb. They are not " +
            "eight separate boxes: they are three different questions you can ask about the same " +
            "verb. <i>What is it doing in the clause? Does anything receive it? How does it form " +
            "its past tense?</i></p>" +
            "<p>Take this lesson in two sittings if you need to. The first four screens are the " +
            "first question; the last two are the other two.</p>",
          labels: ["verb"],
        },
        {
          heading: "Sitting one · action, linking, and helping",
          body: "An <b>action verb</b> shows something being done, in the body or in the head: " +
            "<i>accosted, threw, hesitated, thought</i>." +
            "<p>A <b>linking verb</b> does no acting. It hooks the subject to a word that renames or " +
            "describes it: <i>“you <b>are</b> happy,”</i> <i>“the cough <b>is</b> a mere nothing.”</i> " +
            "Every form of <b>be</b> can do this, and so can <i>seem, feel, grow, become</i>.</p>" +
            "<p>A <b>helping verb</b> props up a main verb to build tense or voice: <i>“he <b>had " +
            "been</b> drinking.”</i> Two helpers, one main verb, one action.</p>" +
            "<p><b>The test for linking:</b> swap in <i>seems</i>. <i>“You seem happy”</i> works, so " +
            "<i>are</i> is linking. <i>“He seems accosted me”</i> does not.</p>",
          labels: ["action-verb", "linking-verb", "helping-verb"],
        },
        {
          heading: "Modals — the helpers that mean something",
          body: "A <b>modal verb</b> is a special helper that adds possibility, ability, permission, " +
            "or necessity: <i>can, could, may, might, must, shall, should, will, would</i>." +
            "<p>Montresor's whole plan is made of them. <i>“I <b>must</b> not only punish”</i> — " +
            "necessity. <i>“We <b>will</b> go back”</i> — a promise he does not mean. <i>“I " +
            "<b>cannot</b> be responsible”</i> — a refusal.</p>" +
            "<p>Modals are odd in one useful way: they never change their form. There is no " +
            "\"musted\" and no \"he musts.\"</p>",
          labels: ["modal-verb"],
        },
        {
          heading: "Sitting two · does anything receive the action?",
          body: "Ask a verb <i>“…what?”</i> If there is an answer, the verb is <b>transitive</b> and " +
            "the answer is its direct object. If there is no answer, it is <b>intransitive</b>." +
            "<p><i>“He <b>threw</b> the bottle”</i> — threw what? The bottle. Transitive.<br>" +
            "<i>“He <b>laughed</b>”</i> — laughed what? Nothing. Intransitive.</p>" +
            "<p>Both of those are in the same sentence of Poe's, which is the neatest example of the " +
            "difference in the story. And note: the same verb can be either, depending on the " +
            "sentence. <i>“He grew still”</i> against <i>“He grew a beard.”</i></p>",
          labels: ["transitive-verb", "intransitive-verb"],
        },
        {
          heading: "Sitting two · regular and irregular",
          body: "This last question is about spelling, and it has nothing to do with the other two." +
            "<p>A <b>regular verb</b> makes its past tense by adding <b>-ed</b>: <i>place → placed, " +
            "reapproach → reapproached, subside → subsided</i>.</p>" +
            "<p>An <b>irregular verb</b> changes instead: <i>feel → felt, lay → laid, hear → heard, " +
            "throw → threw</i>. English has a few hundred of them and they are the most common verbs " +
            "in the language, which is why children learn them last.</p>" +
            "<p>Poe puts one of each side by side: <i>“I <b>placed</b> my hand … and <b>felt</b> " +
            "satisfied.”</i></p>",
          labels: ["regular-verb", "irregular-verb"],
        },
      ],
      items: [
        {
          after: "The one part of speech a sentence cannot do without",
          stem: "Why are there eight kinds of verb rather than eight boxes to sort verbs into?",
          options: [
            { text: "Because they answer three different questions, and one verb gets an answer to each", correct: true,
              feedback: "Right. \"Threw\" is an action verb, a transitive verb, and an irregular verb, all at once." },
            { text: "Because grammarians could not agree", feedback: "They mostly do agree here. The three questions are genuinely independent." },
            { text: "Because some are more advanced than others", feedback: "All eight are Essential in this app's taxonomy." },
            { text: "Because a verb changes kind as the sentence goes on", feedback: "A verb keeps its job for the whole sentence." },
          ],
        },
        {
          after: "Sitting one · action, linking, and helping",
          stem: "Which test tells you a verb is <b>linking</b>?",
          options: [
            { text: "You can swap in \"seems\" and the sentence still works", correct: true,
              feedback: "The best single test there is. \"You seem happy\" works; \"he seems accosted me\" does not." },
            { text: "It is a form of \"be\"", feedback: "Every form of \"be\" CAN link — but it can also help, as in \"had been drinking.\"" },
            { text: "It comes first in the sentence", feedback: "Position tells you nothing here." },
            { text: "It has no -ing form", feedback: "\"Being\" and \"seeming\" both exist." },
          ],
        },
        {
          after: "Sitting one · action, linking, and helping",
          stem: "In <i>“he had been drinking much,”</i> how many helping verbs are there?",
          options: [
            { text: "Two — had and been", correct: true, feedback: "Right. \"Drinking\" is the main verb; the other two are only there to build the tense." },
            { text: "One — had", feedback: "\"Been\" is helping too. English stacks them." },
            { text: "Three", feedback: "\"Drinking\" is the main verb, not a helper." },
            { text: "None — \"had\" means possessed", feedback: "It can mean that elsewhere. Here it has a main verb after it to prop up." },
          ],
        },
        {
          after: "Modals — the helpers that mean something",
          stem: "What makes a modal different from an ordinary helping verb?",
          options: [
            { text: "It adds a meaning of its own — possibility, ability, or necessity", correct: true,
              feedback: "Yes. \"Had\" just builds tense; \"must\" tells you something about the world." },
            { text: "It is always the last verb in the sentence", feedback: "A modal comes before the verb it helps, never after." },
            { text: "It can be an action verb too", feedback: "Modals never act. They only ever help." },
            { text: "It only appears in questions", feedback: "\"I must not only punish\" is not a question." },
          ],
        },
        {
          after: "Sitting two · does anything receive the action?",
          stem: "Poe writes <i>“He laughed and threw the bottle upwards.”</i> Which verb is <b>intransitive</b>?",
          options: [
            { text: "laughed", correct: true, feedback: "Right — laughed what? There is no answer, so nothing receives it." },
            { text: "threw", feedback: "Threw what? The bottle. That answer makes it transitive." },
            { text: "Both", feedback: "Only one of them has nothing receiving it." },
            { text: "Neither — a verb cannot be intransitive if there is a noun nearby", feedback: "\"Upwards\" and \"bottle\" are both nearby, but only one of them receives an action." },
          ],
        },
        {
          after: "Sitting two · regular and irregular",
          stem: "Which of these is an <b>irregular</b> verb?",
          options: [
            { text: "feel → felt", correct: true, feedback: "Yes — the word changes rather than taking -ed. \"Feeled\" is not English." },
            { text: "place → placed", feedback: "Straight -ed. Regular." },
            { text: "subside → subsided", feedback: "Regular — the silent e just drops." },
            { text: "reapproach → reapproached", feedback: "Regular, however long the word is." },
          ],
        },
        {
          stem: "Is <b>regular</b> versus <b>irregular</b> connected to <b>transitive</b> versus <b>intransitive</b>?",
          options: [
            { text: "No — they are completely independent questions about the same verb", correct: true,
              feedback: "Right, and this is the thing to hold on to. \"Threw\" is transitive and irregular; \"laughed\" is intransitive and regular; but \"laid\" is transitive and irregular." },
            { text: "Yes — irregular verbs are always transitive", feedback: "\"Went\" is irregular and cannot take an object." },
            { text: "Yes — regular verbs are always intransitive", feedback: "\"Placed\" is regular and needs an object." },
            { text: "Only in the past tense", feedback: "Tense does not connect them either." },
          ],
        },
      ],
    },

    {
      id: "review-b", n: 6, cluster: "B",
      title: "Review B — the word that acts",
      blurb: "Every kind of verb, mixed, and the three questions that sort them out.",
      reviews: ["verbs"],
      focus: ["verb", "action-verb", "linking-verb", "helping-verb", "modal-verb",
        "transitive-verb", "intransitive-verb", "regular-verb", "irregular-verb"],
      tapPerScreen: 3,
      teach: [
        {
          heading: "Question one · what is it doing in the clause?",
          body: "Cluster B was one lesson, because there is one part of speech in it — but eight " +
            "labels, and they come from three separate questions." +
            "<p><b>Question one:</b> is it acting (<b>action</b>), joining a subject to a description " +
            "(<b>linking</b>), propping up another verb (<b>helping</b>), or none of those in " +
            "particular (just <b>verb</b>)?</p>",
          labels: ["verb", "action-verb", "linking-verb", "helping-verb"],
        },
        {
          heading: "Question two · does anything receive it?",
          body: "<b>Transitive</b> if you can answer <i>“…what?”</i>, <b>intransitive</b> if you " +
            "cannot. And <b>modal</b> is its own thing: a helper that carries meaning." +
            "<p>Watch out for the overlap. Every transitive and intransitive verb is <i>also</i> an " +
            "action verb — this unit labels each one with whichever idea the sentence is teaching, " +
            "never both at once.</p>",
          labels: ["modal-verb", "transitive-verb", "intransitive-verb"],
        },
        {
          heading: "Question three · how does it form its past?",
          body: "<b>-ed</b> and it is <b>regular</b>; anything else and it is <b>irregular</b>." +
            "<p>This question has nothing to do with the first two, and that independence is the " +
            "single most useful thing to take out of Cluster B.</p>",
          labels: ["regular-verb", "irregular-verb"],
        },
      ],
      items: [
        {
          after: "Question one · what is it doing in the clause?",
          stem: "In <i>“you are happy,”</i> what is <b>are</b>?",
          options: [
            { text: "A linking verb", correct: true, feedback: "Right — it joins \"you\" to \"happy\" and no action happens at all." },
            { text: "A helping verb", feedback: "It would be, if a main verb followed it: \"you are going.\" Here nothing follows but a description." },
            { text: "An action verb", feedback: "Nobody does anything in this sentence." },
            { text: "A modal verb", feedback: "Modals are can, could, may, might, must, shall, should, will, would." },
          ],
        },
        {
          after: "Question two · does anything receive it?",
          stem: "\"Grew\" appears twice in the story: <i>“the clamourer grew still”</i> and <i>“My own fancy grew warm.”</i> Are these transitive?",
          options: [
            { text: "No — nothing receives the growing in either one", correct: true,
              feedback: "Correct. Both are intransitive, and \"grew\" here is doing linking work: it joins a subject to a description." },
            { text: "Yes — \"still\" and \"warm\" are the objects", feedback: "Those are describing the subject, not receiving an action. An object is a thing the verb happens TO." },
            { text: "The first is, the second is not", feedback: "The two sentences have exactly the same shape." },
            { text: "Only if you count the subject", feedback: "A subject is never the object of its own verb — except with a reflexive pronoun." },
          ],
        },
        {
          after: "Question three · how does it form its past?",
          stem: "Which pair correctly describes <b>threw</b> in <i>“he threw the bottle”</i>?",
          options: [
            { text: "Transitive and irregular", correct: true, feedback: "Threw what? The bottle — transitive. Throw → threw, not \"throwed\" — irregular. Two questions, two answers." },
            { text: "Intransitive and irregular", feedback: "The bottle receives the throwing, so it is transitive." },
            { text: "Transitive and regular", feedback: "\"Throwed\" is not English. Irregular." },
            { text: "Linking and irregular", feedback: "\"The bottle\" is not a description of \"he.\" Nothing is being linked." },
          ],
        },
        {
          stem: "Which of the eight verb labels can a single verb <i>never</i> hold at the same time as \"action verb\"?",
          options: [
            { text: "Linking verb", correct: true,
              feedback: "Right — those two are genuine opposites. A verb either does something or links something; it cannot do both. Transitive, intransitive, modal, regular and irregular all sit on other axes." },
            { text: "Transitive verb", feedback: "Every transitive verb IS an action verb. That is why this unit only ever labels one of the two." },
            { text: "Irregular verb", feedback: "\"Threw\" is both." },
            { text: "Intransitive verb", feedback: "\"Laughed\" is both." },
          ],
        },
      ],
    },

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
      ],
    },

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
      ],
    },

    { id: "capstone", n: 14, cluster: "end", todo: true,
      title: "Capstone — all nine, unseen text",
      blurb: "The closing paragraphs of the story, which no lesson has used.",
      lessonId: "unit-pos-capstone", focus: [] },
  ];

  /* The six POS labels this unit deliberately does NOT teach. Asserted by
   * tools/smoke-test.js so the budget cannot drift.
   *   - verbals belong with phrases (Unit 2): they are verb FORMS doing another
   *     part of speech's job, which is a phrase-level idea;
   *   - the other three are tier: "advanced".  */
  var EXCLUDED = ["gerund", "participle", "infinitive",
    "particle", "relative-adverb", "emphatic-pronoun"];

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
