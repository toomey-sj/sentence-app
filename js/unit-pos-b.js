/* Sentence Forge — Unit 1, Cluster B: the word that acts.
 *
 * One passage and two stops: Verbs — the heaviest stop in the unit — and Review B.
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

  wjt.unitPos.examples([
    {
      id: "unit-pos-verbs",
      title: "Unit 1 · Lesson 4 — Verbs",
      subtitle: "Poe · action, linking, helping, modal, transitive, regular, irregular",
      group: "unit-pos",
      build: buildVerbs,
    },
  ]);

  wjt.unitPos.stops([
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
        {
          /* Question one only — action, linking, helping, modal. Transitive and
           * intransitive are deliberately not buckets here: every transitive verb
           * is ALSO an action verb, so a word could honestly go in two places and
           * the question would have two right answers. Each word below carries
           * exactly the label its passage gives it. */
          kind: "sort",
          stem: "Six verbs from the Verbs passage. Which of the four jobs is each one doing?",
          buckets: ["action-verb", "linking-verb", "helping-verb", "modal-verb"],
          words: [
            { word: "accosted", bucket: "action-verb" },
            { word: "are", bucket: "linking-verb" },
            { word: "been", bucket: "helping-verb" },
            { word: "cannot", bucket: "modal-verb" },
            { word: "drinking", bucket: "action-verb" },
            { word: "will", bucket: "modal-verb" },
          ],
          note: "Transitive and intransitive are not buckets here on purpose: every " +
            "transitive verb is also an action verb, so those words would have two homes.",
        },
      ],
    },
  ]);
})();
