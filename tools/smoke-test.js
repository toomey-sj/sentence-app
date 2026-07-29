/* Logic-layer smoke test for Sentence Forge (no DOM needed).
 * Run with: node tools/smoke-test.js
 * Also regenerates samples/sample-lesson.json from the in-app sample. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { checkLesson } = require("./completeness.js");

const root = path.join(__dirname, "..");
const storage = new Map();
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
  Date,
  Math,
  JSON,
  String,
  Array,
  Object,
  setTimeout,
  // `wjt.uid()` prefers crypto.randomUUID(), then crypto.getRandomValues(),
  // then Date.now()+Math.random() (seam S2). Pass Node's WebCrypto through so
  // tier 1 is actually exercised here; the uid checks below strip it back down
  // to exercise tiers 2 and 3, which is what a teacher on file:// may get.
  crypto: require("crypto").webcrypto,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

/* Study mode's content files, in the same order index.html loads them — which is
 * the unit's path order, because each one appends its stops to the array
 * js/unit-pos.js registered. "study: stops are numbered 0…14 in path order"
 * below is what catches a wrong order in either list. */
const UNIT_FILES = ["unit-pos.js", "unit-pos-a.js", "unit-pos-b.js",
  "unit-pos-c.js", "unit-pos-d.js", "unit-pos-capstone.js"];

const LOGIC_FILES = ["labels.js", "tokenize.js", "store.js", "examples.js",
  "assignment-model.js", "assignment-codec.js", "assignment-channels.js",
  // Study mode: the engine, then the unit content that registers against it.
  // Running them here is what proves they are DOM-free.
  "study-model.js"].concat(UNIT_FILES);
for (const f of LOGIC_FILES) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), sandbox, { filename: f });
}
const wjt = sandbox.wjt;

let failures = 0;
function check(name, cond) {
  console.log((cond ? "  ok  " : " FAIL ") + name);
  if (!cond) failures++;
}

// --- tokenize / splitSentences ---
const sents = wjt.splitSentences('The fox ran. "Wait!" she said… Did it stop?\nNew line here');
check("splitSentences finds 5 sentences", sents.length === 5);
check("splitSentences keeps closing quote", sents[1] === '"Wait!"');

const toks = wjt.tokenize("The quick fox.");
check("tokenize: 3 tokens", toks.length === 3);
check("tokenize offsets", toks[2].start === 10 && toks[2].end === 14 && toks[2].text === "fox.");

const range = wjt.spanToTokens(toks, 5, 9); // "quick" exactly (chars 4..9)
check("spanToTokens snaps to token", range.first === 1 && range.last === 1);
const snap = wjt.spanToTokens(toks, 6, 11); // straddles quick+fox.
check("spanToTokens snaps outward", snap.first === 1 && snap.last === 2);
const span = wjt.tokensToSpan(toks, 1, 2);
check("tokensToSpan", span.start === 4 && span.end === 14);

// --- ids (seam S2) ---
// Every tier of wjt.uid() is exercised, because the app really does run in
// environments that only have the lower ones: randomUUID needs a secure context
// and file:// isn't reliably one. Ids only ever have to be unique and opaque —
// nothing in the app parses one — so that is exactly what's asserted.
const realCrypto = sandbox.crypto;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UID_TIERS = [
  { name: "tier 1 (crypto.randomUUID)", crypto: realCrypto, uuid: true, n: 5000, dupes: 0 },
  // getRandomValues but no randomUUID — an insecure context, e.g. file://.
  {
    name: "tier 2 (crypto.getRandomValues)", uuid: true, n: 5000, dupes: 0,
    crypto: { getRandomValues: (a) => realCrypto.getRandomValues(a) },
  },
  // No crypto at all: Date.now() + 6 base36 chars of Math.random(). This tier is
  // genuinely weaker — ~2.2e9 values per millisecond bucket, so ~1000 draws
  // collide about once in 9000 runs — which is the whole reason tiers 1-2 exist.
  // A small dupe allowance keeps the check from flaking while still catching any
  // real regression (drop the random part and you get ~1 distinct id, not 998).
  { name: "tier 3 (Date.now + Math.random)", crypto: null, uuid: false, n: 1000, dupes: 2 },
];
for (const tier of UID_TIERS) {
  if (tier.crypto) sandbox.crypto = tier.crypto;
  else delete sandbox.crypto;

  const seen = {};                       // an object, so ids prove usable as keys
  for (let i = 0; i < tier.n; i++) seen[wjt.uid()] = true;
  const ids = Object.keys(seen);
  const label = "uid " + tier.name + ": ";
  check(label + tier.n + " calls give " + tier.n + " distinct ids",
    ids.length >= tier.n - tier.dupes);
  check(label + "non-empty strings", ids.every((id) => typeof id === "string" && id.length > 0));
  // Ids go into the URL as #/edit/:id, so they must need no escaping.
  check(label + "safe as a URL hash segment", ids.every((id) => encodeURIComponent(id) === id));
  check(label + (tier.uuid ? "is a v4 UUID" : "is the legacy format"),
    ids.every((id) => UUID_V4.test(id) === tier.uuid));
}
sandbox.crypto = realCrypto;

// --- taxonomy sanity ---
const layerCounts = {};
for (const id of Object.keys(wjt.LABELS)) {
  const l = wjt.LABELS[id];
  check("label " + id + " has valid layer", !!wjt.LAYERS[l.layer]);
  layerCounts[l.layer] = (layerCounts[l.layer] || 0) + 1;
}
for (const layer of wjt.LAYER_ORDER) {
  check("layer " + layer + " has >= 4 labels (quiz distractors)", layerCounts[layer] >= 4);
}

// --- subtype (drill-down) taxonomy ---
for (const id of Object.keys(wjt.LABELS)) {
  const l = wjt.LABELS[id];
  if (!l.parent) continue;
  const p = wjt.LABELS[l.parent];
  check("subtype " + id + " has an existing parent", !!p);
  // Layer is always inherited. Color is inherited by default, but a subtype may
  // override it with its own shade (the subject/predicate/clause/phrase families
  // do, so their variants stay distinguishable in a rendered diagram).
  check("subtype " + id + " inherited layer, and has a color",
    !!l.layer && !!l.color && p && l.layer === p.layer);
  check("subtype " + id + " familyOf resolves to parent", wjt.familyOf(id) === l.parent);
  check("subtype " + id + " is not itself a parent (taxonomy stays one level deep)",
    wjt.childrenOf(id).length === 0);
}
// --- tier tagging (Tier 1e) ---
for (const id of Object.keys(wjt.LABELS)) {
  check("label " + id + " has a valid tier", wjt.TIERS.includes(wjt.LABELS[id].tier));
}
check("advanced labels are tagged advanced",
  ["object-complement", "particle", "relative-adverb", "emphatic-pronoun"]
    .every((id) => wjt.LABELS[id].tier === "advanced" && !wjt.isEssential(id)));
check("untagged labels default to essential",
  wjt.LABELS.noun.tier === "essential" && wjt.isEssential("gerund"));

// --- essential-only palette filter (Tier 1.5) ---
const posLabels = wjt.labelsForLayer("pos");
const posEssential = wjt.filterTier(posLabels, true);
check("filterTier drops advanced labels", posEssential.length < posLabels.length &&
  posEssential.every((id) => wjt.isEssential(id)) && !posEssential.includes("particle"));
check("filterTier is a pass-through when off", wjt.filterTier(posLabels, false) === posLabels);
check("every layer keeps labels under essential-only",
  wjt.LAYER_ORDER.every((layer) => wjt.filterTier(wjt.labelsForLayer(layer), true).length > 0));
check("every advanced label has an essential parent to hang under",
  Object.keys(wjt.LABELS).filter((id) => !wjt.isEssential(id))
    .every((id) => wjt.LABELS[id].parent && wjt.isEssential(wjt.LABELS[id].parent)));

// --- word-level verbals + POS gaps (Tier 1c/1d) ---
check("word-level verbals exist under verb",
  ["gerund", "participle", "infinitive"].every((id) => wjt.childrenOf("verb").includes(id)));
check("verbals are distinct from the verbal phrases",
  ["gerund-phrase", "participial-phrase", "infinitive-phrase"]
    .every((id) => wjt.LABELS[id].layer === "phrase") &&
  ["gerund", "participle", "infinitive"].every((id) => wjt.LABELS[id].layer === "pos"));
check("POS gaps filled",
  ["regular-verb", "irregular-verb", "particle"].every((id) => wjt.childrenOf("verb").includes(id)) &&
  wjt.childrenOf("adverb").includes("relative-adverb") &&
  wjt.childrenOf("pronoun").includes("emphatic-pronoun"));

check("articles exist under determiner",
  ["article", "definite-article", "indefinite-article"].every((id) => wjt.childrenOf("determiner").includes(id)));
check("noun/verb/pronoun/adjective/adverb have drill-down types",
  ["noun", "verb", "pronoun", "adjective", "adverb"].every((id) => wjt.childrenOf(id).length >= 4));
check("baseLabelsForLayer excludes subtypes",
  wjt.baseLabelsForLayer("pos").every((id) => !wjt.LABELS[id].parent) &&
  wjt.baseLabelsForLayer("pos").includes("noun"));

// --- consistent drill-down on every layer (Tier 2) ---
check("every layer advertises subtypes",
  wjt.LAYER_ORDER.every((layer) => wjt.layerHasSubtypes(layer)));
check("2a: subject family",
  ["simple-subject", "complete-subject", "compound-subject", "understood-subject"]
    .every((id) => wjt.childrenOf("subject").includes(id)));
check("2a: predicate family",
  ["simple-predicate", "complete-predicate", "compound-predicate"]
    .every((id) => wjt.childrenOf("predicate").includes(id)));
check("2a: parts layer reads as four families",
  wjt.baseLabelsForLayer("part").join(",") === "subject,predicate,object,complement,appositive");
check("2b: dependent-clause parents the three dependent subtypes",
  ["relative-clause", "adverbial-clause", "noun-clause"]
    .every((id) => wjt.childrenOf("dependent-clause").includes(id)) &&
  wjt.childrenOf("independent-clause").length === 0);
check("2c: verbal-phrase parents the three verbal phrases, others stay flat",
  ["gerund-phrase", "participial-phrase", "infinitive-phrase"]
    .every((id) => wjt.childrenOf("verbal-phrase").includes(id)) &&
  ["noun-phrase", "verb-phrase", "prepositional-phrase", "appositive-phrase", "absolute-phrase"]
    .every((id) => !wjt.LABELS[id].parent));
check("reparenting preserved every label id used by the samples",
  ["simple-subject", "complete-subject", "compound-subject", "simple-predicate",
   "complete-predicate", "compound-predicate", "relative-clause", "adverbial-clause",
   "noun-clause", "gerund-phrase", "participial-phrase", "infinitive-phrase"]
    .every((id) => !!wjt.LABELS[id]));

// --- sentence-type taxonomy ---
for (const cat of wjt.SENTENCE_TYPE_ORDER) {
  const c = wjt.SENTENCE_TYPES[cat];
  check("sentence type axis '" + cat + "' has options", !!c && Object.keys(c.options).length >= 2);
  for (const optId of Object.keys(c.options)) {
    const o = c.options[optId];
    check("type option " + cat + "." + optId + " has name/color/desc", !!(o.name && o.color && o.desc));
  }
}
check("sentenceTypeOption resolves", wjt.sentenceTypeOption("structure", "compound").name === "Compound");
check("isSentenceType rejects bad values",
  !wjt.isSentenceType("structure", "nope") && !wjt.isSentenceType("nope", "simple"));

// --- sample lesson integrity ---
let warned = false;
const origWarn = console.warn;
console.warn = (...a) => { warned = true; origWarn(...a); };
const sample = wjt.buildSampleLesson();
console.warn = origWarn;
check("sample lesson: no unmatched annotation text", !warned);
check("sample lesson: 4 sentences", sample.sentences.length === 4);
for (const s of sample.sentences) {
  for (const a of s.annotations) {
    const tokens = wjt.tokenize(s.text);
    const r = wjt.spanToTokens(tokens, a.start, a.end);
    const sp = wjt.tokensToSpan(tokens, r.first, r.last);
    check("sample ann on token boundaries: " + a.label + " '" + s.text.slice(a.start, a.end) + "'",
      sp.start === a.start && sp.end === a.end && !!wjt.LABELS[a.label]);
  }
  if (s.types) {
    for (const cat of Object.keys(s.types)) {
      check("sample sentence type valid: " + cat + "=" + s.types[cat], wjt.isSentenceType(cat, s.types[cat]));
    }
  }
}
check("sample lesson: every sentence carries a type", sample.sentences.every((s) => s.types && s.types.structure && s.types.purpose));

const sampleComp = checkLesson(sample, wjt);
sampleComp.notes.forEach((n) => console.log("  note: " + n));
check("sample lesson: complete at every layer (POS on every word, subject+predicate per clause)", sampleComp.errors.length === 0);
sampleComp.errors.forEach((e) => console.log("       · " + e));

// --- export -> import round trip ---
const exported = wjt.exportLesson(sample);
const { lesson: reimported, warnings } = wjt.importLesson(exported);
check("round trip: no warnings", warnings.length === 0);
check("round trip: sentence count", reimported.sentences.length === sample.sentences.length);
check("round trip: annotation counts", reimported.sentences.every(
  (s, i) => s.annotations.length === sample.sentences[i].annotations.length));
check("round trip: offsets preserved", reimported.sentences.every(
  (s, i) => s.annotations.every((a, j) => {
    const o = sample.sentences[i].annotations[j];
    return a.start === o.start && a.end === o.end && a.label === o.label;
  })));
check("round trip: sentence types preserved", reimported.sentences.every(
  (s, i) => JSON.stringify(s.types || null) === JSON.stringify(sample.sentences[i].types || null)));

// --- essentialOnly round trip ---
check("new lessons default to the full palette", wjt.store.create("x").essentialOnly === false);
check("export omits essentialOnly when off", !("essentialOnly" in exported));
const essOn = wjt.exportLesson(Object.assign({}, sample, { essentialOnly: true }));
check("export writes essentialOnly when on", essOn.essentialOnly === true);
check("import restores essentialOnly", wjt.importLesson(essOn).lesson.essentialOnly === true);
check("import defaults essentialOnly to false", wjt.importLesson(exported).lesson.essentialOnly === false);

// --- ownerId (seam S3) ---
// Nullable, additive, and written only when set — the same contract as
// essentialOnly above, which is what keeps every existing file round-tripping
// byte-identically. If `export omits ownerId` fails, samples/ churns too.
check("new lessons have no owner", wjt.store.create("x").ownerId === null);
check("export omits ownerId when unset", !("ownerId" in exported));
const owned = wjt.exportLesson(Object.assign({}, sample, { ownerId: "teacher-1" }));
check("export writes ownerId when set", owned.ownerId === "teacher-1");
check("import preserves a string ownerId", wjt.importLesson(owned).lesson.ownerId === "teacher-1");
check("import ignores an ownerId that isn't a non-empty string",
  [42, "", null, {}, ["a"], true].every((v) =>
    wjt.importLesson(Object.assign({}, exported, { ownerId: v })).lesson.ownerId === null));
check("import of a file with no ownerId leaves it unowned",
  wjt.importLesson(exported).lesson.ownerId === null);
// Absence is meaningful: "no owner", not "unknown owner". Nothing may invent one.
check("no built-in lesson exports an owner",
  wjt.EXAMPLES.every((ex) => !("ownerId" in wjt.exportLesson(ex.build()))) &&
  !("ownerId" in wjt.exportLesson(wjt.buildSampleLesson())));

// --- import with "match" addressing + bad data ---
const handWritten = {
  format: "sentence-forge-lesson",
  title: "Hand written",
  sentences: [
    { text: "The dog barked loudly.", annotations: [
      { match: "dog", label: "noun" },
      { match: "barked loudly.", label: "predicate" },
      { match: "not present", label: "noun" },
      { start: 0, end: 3, label: "bogus-label" },
      { start: 900, end: 901, label: "verb" },
    ]},
    "A bare string sentence works too.",
  ],
};
const hw = wjt.importLesson(handWritten);
check("import: match addressing resolves", hw.lesson.sentences[0].annotations.length === 2);
check("import: match offsets correct",
  hw.lesson.sentences[0].annotations[0].start === 4 && hw.lesson.sentences[0].annotations[0].end === 7);
check("import: bad entries produce warnings", hw.warnings.length === 3);
check("import: bare string sentence accepted", hw.lesson.sentences[1].text === "A bare string sentence works too.");
check("import: layers inferred", hw.lesson.layers.includes("part"));

// --- match folds smart quotes and Unicode spaces (P3) ---
// Source strings use \u escapes so this file stays ASCII; they evaluate to the
// real curly-apostrophe / NBSP glyphs at runtime.
const curlyText = "The dog didn\u2019t bark."; // curly apostrophe in the passage
const curly = wjt.importLesson({
  title: "Curly",
  sentences: [{ text: curlyText, annotations: [{ match: "didn't", label: "verb" }] }], // straight quote in match
});
check("import: straight-quote match finds curly text", curly.lesson.sentences[0].annotations.length === 1);
check("import: curly match offsets slice the original text",
  curlyText.slice(
    curly.lesson.sentences[0].annotations[0].start,
    curly.lesson.sentences[0].annotations[0].end).indexOf("didn\u2019t") === 0);

const nbspText = "New\u00A0York is big."; // NBSP between the words of the target
const nbsp = wjt.importLesson({
  title: "NBSP",
  sentences: [{ text: nbspText, annotations: [{ match: "New York", label: "noun" }] }], // ASCII space in match
});
check("import: ASCII-space match finds NBSP text", nbsp.lesson.sentences[0].annotations.length === 1);

let threw = false;
try { wjt.importLesson({ title: "no sentences" }); } catch (e) { threw = true; }
check("import: missing sentences throws", threw);

// --- import sentence types (valid, partial, bogus) ---
const withTypes = wjt.importLesson({
  format: "sentence-forge-lesson",
  title: "Types",
  sentences: [
    { text: "The dog barked.", types: { structure: "simple", purpose: "declarative" } },
    { text: "Run fast!", types: { structure: "compound", purpose: "bogus" } },
    { text: "No types here." },
  ],
});
check("import: valid types kept", withTypes.lesson.sentences[0].types.purpose === "declarative");
check("import: partial types — good kept, bad dropped",
  withTypes.lesson.sentences[1].types.structure === "compound" && !withTypes.lesson.sentences[1].types.purpose);
check("import: bad type produces warning", withTypes.warnings.some((w) => /bogus/.test(w)));
check("import: sentence without types has none", !withTypes.lesson.sentences[2].types);

// --- import/export sentence notes (present, trimmed, empty, omitted) ---
const withNotes = wjt.importLesson({
  format: "sentence-forge-lesson",
  title: "Notes",
  sentences: [
    { text: "It was here that it happened.", notes: "  A cleft sentence.  " },
    { text: "Plain sentence.", notes: "   " },
    { text: "No notes key at all." },
  ],
});
check("import: note kept and trimmed", withNotes.lesson.sentences[0].notes === "A cleft sentence.");
check("import: whitespace-only note dropped", !("notes" in withNotes.lesson.sentences[1]));
check("import: sentence without notes has none", !("notes" in withNotes.lesson.sentences[2]));
const notesOut = wjt.exportLesson(withNotes.lesson);
check("export: emits notes when present", notesOut.sentences[0].notes === "A cleft sentence.");
check("export: omits notes when empty", !("notes" in notesOut.sentences[1]) && !("notes" in notesOut.sentences[2]));

// --- store CRUD ---
const l1 = wjt.store.save(wjt.store.create("Test A"));
wjt.store.save(wjt.store.create("Test B"));
check("store: list has 2", wjt.store.list().length === 2);
check("store: get", wjt.store.get(l1.id).title === "Test A");
const dup = wjt.store.duplicate(l1.id);
check("store: duplicate", dup.title === "Test A (copy)" && wjt.store.list().length === 3);
wjt.store.remove(l1.id);
check("store: remove", wjt.store.list().length === 2 && !wjt.store.get(l1.id));

// --- sentence transforms preserve types/notes (audit P0-1) ---
const mergeS = [
  { text: "The dog ran.", annotations: [{ start: 0, end: 3, label: "determiner", note: "art" }], types: { structure: "simple" }, notes: "first" },
  { text: "It barked.", annotations: [{ start: 0, end: 2, label: "pronoun" }], types: { purpose: "declarative" }, notes: "second" },
];
wjt.store.mergeSentence(mergeS, 0);
check("merge: sentences collapse to 1", mergeS.length === 1);
check("merge: text concatenated", mergeS[0].text === "The dog ran. It barked.");
check("merge: annotations re-offset", mergeS[0].annotations.length === 2 &&
  mergeS[0].annotations[1].start === 13);
check("merge: next sentence's type carried", mergeS[0].types.structure === "simple" &&
  mergeS[0].types.purpose === "declarative");
check("merge: notes concatenated", mergeS[0].notes === "first second");

// Survivor's type wins per axis; next only fills axes the survivor left unset.
const mergeConflict = [
  { text: "A.", annotations: [], types: { structure: "simple" } },
  { text: "B.", annotations: [], types: { structure: "compound" } },
];
wjt.store.mergeSentence(mergeConflict, 0);
check("merge: survivor's type wins on axis conflict", mergeConflict[0].types.structure === "simple");

const rewriteS = [
  { text: "Old words here.", annotations: [{ start: 0, end: 3, label: "determiner" }], types: { structure: "simple" }, notes: "keep me" },
];
wjt.store.rewriteSentenceText(rewriteS, 0, ["New words entirely."]);
check("rewrite: annotations cleared", rewriteS[0].annotations.length === 0);
check("rewrite: text replaced", rewriteS[0].text === "New words entirely.");
check("rewrite: type preserved", rewriteS[0].types.structure === "simple");
check("rewrite: note preserved", rewriteS[0].notes === "keep me");

// A reword that splits into several sentences keeps type/note on the first.
const rewriteSplit = [{ text: "One.", annotations: [], types: { purpose: "declarative" }, notes: "n" }];
wjt.store.rewriteSentenceText(rewriteSplit, 0, ["First part.", "Second part."]);
check("rewrite: split produces 2 sentences", rewriteSplit.length === 2);
check("rewrite: split keeps meta on first piece",
  rewriteSplit[0].types.purpose === "declarative" && rewriteSplit[0].notes === "n" &&
  !rewriteSplit[1].types && !rewriteSplit[1].notes);

// --- corrupt library is preserved, not silently emptied (audit P1-2) ---
// The sandbox localStorage is backed by the `storage` Map declared up top.
const BAD = "{ this is not valid json ]";
storage.set("sentenceForge.lessons.v1", BAD);
delete wjt.store.corruptBackup;
const salvaged = wjt.store.list();
check("corrupt store: list falls back to empty", Array.isArray(salvaged) && salvaged.length === 0);
check("corrupt store: raw value preserved under side key",
  storage.get("sentenceForge.lessons.v1.corrupt") === BAD);
check("corrupt store: flagged on wjt.store for the shell", wjt.store.corruptBackup === BAD);
// A valid but wrong-shaped value (object, not array) is treated the same way.
storage.delete("sentenceForge.lessons.v1.corrupt");
storage.set("sentenceForge.lessons.v1", '{"not":"an array"}');
delete wjt.store.corruptBackup;
check("corrupt store: non-array JSON also falls back to empty", wjt.store.list().length === 0);
check("corrupt store: non-array JSON is preserved too",
  storage.get("sentenceForge.lessons.v1.corrupt") === '{"not":"an array"}');
// Clean up so the sample-file write below starts from a good state.
storage.delete("sentenceForge.lessons.v1");
storage.delete("sentenceForge.lessons.v1.corrupt");

/* --- the migration runner (seam S4) ---------------------------------------
 * The point of these checks is that the runner is LIVE CODE, not a registry
 * that exists. So the registered migration is swapped for a spy and the lesson
 * is read back through the real wjt.store, which is the only path the app uses. */
check("the build declares the lesson format version it writes", wjt.LESSON_VERSION === 1);
check("an identity migration is registered for the current version",
  typeof wjt.migrations[wjt.LESSON_VERSION] === "function");
check("the identity migration returns the lesson untouched", (() => {
  const l = wjt.store.create("Identity");
  const r = wjt.migrateLesson(l);
  return r.ok && r.lesson === l && r.from === 1 && r.migrated === false;
})());
check("a lesson with no version field is read as version 1", (() => {
  const l = wjt.store.create("No version");
  delete l.version;
  return wjt.migrateLesson(l).from === 1 && wjt.migrateLesson(l).ok;
})());

const migrated = wjt.store.save(wjt.store.create("Migrate me"));
const realMigration = wjt.migrations[1];
let ran = 0;
wjt.migrations[1] = (lesson) => { ran++; lesson.title = "the migration ran"; return lesson; };
const gotMigrated = wjt.store.get(migrated.id);
check("migration: the registered migration actually runs on get()",
  ran === 1 && gotMigrated.title === "the migration ran");
ran = 0;
const listedMigrated = wjt.store.list();
check("migration: and on list(), once per lesson",
  ran === listedMigrated.length && listedMigrated.every((l) => l.title === "the migration ran"));
wjt.migrations[1] = realMigration;
check("migration: the read is a view — storage itself is not rewritten",
  JSON.parse(storage.get("sentenceForge.lessons.v1"))
    .find((l) => l.id === migrated.id).title === "Migrate me");

// A version this build doesn't know is refused, never guessed at.
[["newer than this build", 99], ["older with no step registered", 0]].forEach(([why, v]) => {
  const l = wjt.store.save(Object.assign(wjt.store.create("Unknown format"), { version: v }));
  delete wjt.store.unsupportedVersion;
  const r = wjt.migrateLesson(l);
  const back = wjt.store.get(l.id);
  check("migration: a lesson " + why + " comes back exactly as stored",
    !r.ok && r.lesson === l && back.version === v && back.title === "Unknown format");
  check("migration: a lesson " + why + " is reported, not silently accepted",
    !!wjt.store.unsupportedVersion && wjt.store.unsupportedVersion.id === l.id &&
    wjt.store.unsupportedVersion.version === v && !!wjt.store.unsupportedVersion.reason);
  wjt.store.remove(l.id);
});
check("migration: a newer-version refusal says so in teacher language",
  /newer version of Sentence Forge/.test(
    wjt.migrateLesson({ id: "x", title: "T", version: 2 }).reason));

// A chain of steps runs to completion; a step that never advances `version`
// is caught by the loop bound instead of hanging a render.
check("migration: steps chain until the lesson reaches the current version", (() => {
  wjt.migrations[-2] = (l) => Object.assign(l, { version: -1, seen: (l.seen || "") + "a" });
  wjt.migrations[-1] = (l) => Object.assign(l, { version: 1, seen: (l.seen || "") + "b" });
  const r = wjt.migrateLesson({ id: "chain", title: "Chain", version: -2 });
  delete wjt.migrations[-2];
  delete wjt.migrations[-1];
  return r.ok && r.migrated && r.from === -2 && r.lesson.version === 1 && r.lesson.seen === "ab";
})());
check("migration: a step that never advances the version is refused, not looped", (() => {
  wjt.migrations[-3] = (l) => Object.assign(l, { version: -4 });
  wjt.migrations[-4] = (l) => Object.assign(l, { version: -3 });
  const r = wjt.migrateLesson({ id: "loop", title: "Loop", version: -3 });
  delete wjt.migrations[-3];
  delete wjt.migrations[-4];
  return !r.ok && /did not settle/.test(r.reason);
})());
check("migrateLesson never throws on junk", (() => {
  let threwHere = false;
  try {
    [null, undefined, 42, "lesson", [], { version: "1" }, { version: NaN }]
      .forEach((x) => wjt.migrateLesson(x));
  } catch (e) { threwHere = true; }
  return !threwHere;
})());

// ownerId survives storage, which is what a sync backend will eventually read.
const ownedStored = wjt.store.save(Object.assign(wjt.store.create("Owned"), { ownerId: "teacher-1" }));
check("store: ownerId survives a save/get round trip",
  wjt.store.get(ownedStored.id).ownerId === "teacher-1");
check("store: duplicate() carries the owner", wjt.store.duplicate(ownedStored.id).ownerId === "teacher-1");

// Back to a clean library so the sample-file write below starts fresh.
storage.delete("sentenceForge.lessons.v1");
storage.delete("sentenceForge.lessons.v1.corrupt");
delete wjt.store.unsupportedVersion;

/* ============================ Assignment mode ============================
 * Phase 1: the model + the wire codec. Two things are being defended here —
 * that a given (lesson, selections, seed) always produces the same questions,
 * and that the student-safe payload can't carry an answer. The leak checks
 * inspect schema keys and exact field values, never "does the correct word
 * appear anywhere", because answer text legitimately appears in the passage. */
console.log("\n-- assignment mode --");

const ALL_SKILLS = ["pos", "part", "phrase", "clause", "structure", "purpose"];
const asgBase = {
  title: "Sentence Parts Review",
  directions: "Answer each question on your own paper.",
  skills: ALL_SKILLS,
  count: 10,
  seed: 12345,
};

// Every structural invariant a rendered assignment relies on.
function assignmentIsValid(built) {
  const a = built.assignment;
  if (a.format !== "sentence-forge-assignment" || a.version !== 1) return false;
  if (!a.sentences.length || !a.questions.length) return false;
  return a.questions.every((q, i) => {
    if (q.number !== i + 1) return false;
    if (wjt.assignment.KINDS.indexOf(q.kind) === -1) return false;
    if (q.sentence < 1 || q.sentence > a.sentences.length) return false;
    if (!q.prompt || !/sentence \d+/.test(q.prompt)) return false;
    if (q.kind === "identify" && !q.mark) return false;
    if (q.kind !== "identify" && q.mark) return false;
    if (q.mark) {
      const toks = wjt.tokenize(a.sentences[q.sentence - 1].text);
      if (q.mark.first < 0 || q.mark.last < q.mark.first || q.mark.last >= toks.length) return false;
    }
    if (q.kind === "list" && !(q.expected >= 2)) return false;
    const ans = built.key.answers[i];
    return ans.question === q.number && ans.accepted.length > 0 &&
      ans.accepted.every((t) => typeof t === "string" && t.length > 0);
  });
}

// --- determinism ---
const asgA = wjt.assignment.build(sample, asgBase);
const asgB = wjt.assignment.build(sample, asgBase);
check("assignment: same lesson + selections + seed is byte-identical",
  JSON.stringify(asgA.assignment) === JSON.stringify(asgB.assignment));
check("assignment: the answer key is byte-identical too",
  JSON.stringify(asgB.key.answers) === JSON.stringify(asgA.key.answers));
check("assignment: honors the requested count", asgA.assignment.questions.length === 10);
check("assignment: questions and answers line up 1..N",
  assignmentIsValid(asgA) && asgA.key.answers.length === asgA.assignment.questions.length);
check("assignment: the seed is stored on the assignment", asgA.assignment.seed === 12345);
check("assignment: the key references the same assignment object",
  asgA.key.assignment === asgA.assignment && asgA.key.format === "sentence-forge-answer-key");

// --- regeneration mints a new seed and a still-valid set ---
const asgC = wjt.assignment.build(sample, Object.assign({}, asgBase, { seed: 987654 }));
check("assignment: a new seed changes the question set",
  JSON.stringify(asgC.assignment.questions) !== JSON.stringify(asgA.assignment.questions));
check("assignment: the regenerated set is still valid",
  assignmentIsValid(asgC) && asgC.assignment.questions.length === 10);
const seeds = new Set([0, 0, 0, 0, 0].map(() => wjt.assignment.newSeed()));
check("assignment: newSeed mints distinct seeds", seeds.size >= 4);
const noSeed = wjt.assignment.build(sample, { skills: ALL_SKILLS, count: 5 });
check("assignment: omitting the seed mints one", Number.isInteger(noSeed.assignment.seed));

// --- balance across skills and sentences ---
const bal = wjt.assignment.build(sample, { skills: ["pos", "part", "phrase", "clause"], count: 8, seed: 7 });
const perSkill = {}, perSentence = {};
bal.key.answers.forEach((a) => {
  perSkill[a.skill] = (perSkill[a.skill] || 0) + 1;
  perSentence[a.sentence] = (perSentence[a.sentence] || 0) + 1;
});
check("assignment: 8 questions spread over all 4 label skills",
  Object.keys(perSkill).length === 4 && Object.values(perSkill).every((n) => n === 2));
check("assignment: and over all 4 sentences",
  Object.keys(perSentence).length === 4 && Object.values(perSentence).every((n) => n <= 3));
check("assignment: not one question per annotation — the pool is much bigger",
  bal.poolSize > 40 && bal.assignment.questions.length === 8);

// --- pool feedback: the count control can't lie ---
const capped = wjt.assignment.build(sample, { skills: ALL_SKILLS, count: 999, seed: 4 });
check("assignment: count clamps to the real pool",
  capped.assignment.questions.length === capped.poolSize &&
  capped.poolSize === wjt.assignment.poolSize(sample, null, ALL_SKILLS));
const everyPrompt = new Set(capped.assignment.questions.map(
  (q) => q.prompt + "|" + (q.mark ? q.mark.first + "-" + q.mark.last : "")));
check("assignment: an exhausted pool repeats no prompt+target",
  everyPrompt.size === capped.assignment.questions.length);

// --- unanswerable skills are reported, never generated ---
const skillsForS2 = wjt.assignment.availableSkills(sample, [2]);
const phraseSkill = skillsForS2.find((s) => s.id === "phrase");
check("assignment: a skill with no source annotations is unavailable, with a reason",
  !phraseSkill.available && phraseSkill.count === 0 && /Phrases/.test(phraseSkill.reason));
check("assignment: sentence-type skills stay available when a type is set",
  skillsForS2.find((s) => s.id === "structure").available &&
  skillsForS2.find((s) => s.id === "purpose").available);
check("assignment: an unavailable skill generates nothing",
  wjt.assignment.build(sample, { sentences: [2], skills: ["phrase"], count: 5, seed: 1 })
    .assignment.questions.length === 0);
const noTypes = wjt.importLesson({ title: "No types", sentences: [{ text: "The dog barked.", annotations: [{ match: "dog", label: "noun" }] }] }).lesson;
check("assignment: a lesson with no sentence types disables both type skills",
  wjt.assignment.availableSkills(noTypes, null)
    .filter((s) => s.kind === "type").every((s) => !s.available));

// --- selection renumbers: a student never sees the sentences left out ---
const only4 = wjt.assignment.build(sample, { sentences: [4], skills: ["pos"], count: "all", seed: 3 });
check("assignment: the selection is renumbered from 1",
  only4.assignment.sentences.length === 1 && only4.assignment.sentences[0].number === 1 &&
  only4.assignment.questions.every((q) => q.sentence === 1 && /sentence 1/.test(q.prompt)));

// --- same-label duplicates yield every acceptable answer ---
// Sentence 4 of the sample carries three determiners.
const detFind = only4.key.answers.find((a, i) =>
  /^Determiner/.test(a.source) && only4.assignment.questions[i].kind === "find");
const detListAt = only4.key.answers.findIndex((a, i) =>
  /^Determiner/.test(a.source) && only4.assignment.questions[i].kind === "list");
check("assignment: find accepts every same-label span",
  !!detFind && detFind.accepted.length === 3 && /Copy one determiner from sentence 1\./.test(
    only4.assignment.questions[detFind.question - 1].prompt));
check("assignment: list states the count and accepts all of them",
  detListAt !== -1 && only4.key.answers[detListAt].accepted.length === 3 &&
  only4.assignment.questions[detListAt].expected === 3 &&
  /List the three determiners in sentence 1\./.test(only4.assignment.questions[detListAt].prompt));
// "Copy the noun" only when there is exactly one; otherwise "Copy one noun".
check("assignment: find wording matches how many answers are acceptable",
  capped.assignment.questions.filter((q) => q.kind === "find").every((q) => {
    const many = capped.key.answers[q.number - 1].accepted.length > 1;
    return many ? /^Copy one .+ from sentence \d+\.$/.test(q.prompt)
      : /^Copy the .+ from sentence \d+\.$/.test(q.prompt);
  }));

// --- the four question families, and the classify wording ---
const families = new Set(capped.assignment.questions.map((q) => q.kind));
check("assignment: all four question families are generated",
  wjt.assignment.KINDS.every((k) => families.has(k)));
const structureQ = capped.assignment.questions[
  capped.key.answers.findIndex((a) => a.skill === "structure")];
check("assignment: classify lists every option in the prompt",
  /^Is sentence \d+ simple, compound, complex, or compound-complex\?$/.test(structureQ.prompt));
const purposeQ = capped.assignment.questions[
  capped.key.answers.findIndex((a) => a.skill === "purpose")];
check("assignment: purpose classify reads the same way",
  /^Is sentence \d+ declarative, interrogative, imperative, or exclamatory\?$/.test(purposeQ.prompt));
check("assignment: identify names the layer's unit, never the answer",
  capped.assignment.questions.filter((q) => q.kind === "identify").every((q, i) => {
    const answer = capped.key.answers[q.number - 1].accepted[0];
    return /marked (word|group of words|phrase|clause)/.test(q.prompt) &&
      q.prompt.indexOf(answer) === -1;
  }));

// A label name that can't take a plural falls back to a quotable form.
const opLesson = wjt.importLesson({
  title: "Objects", sentences: [{
    text: "The keys are under the mat by the door.",
    annotations: [{ match: "the mat", label: "object-of-preposition" },
      { match: "the door.", label: "object-of-preposition" }],
  }],
}).lesson;
const opBuilt = wjt.assignment.build(opLesson, { skills: ["part"], count: "all", seed: 2 });
check("assignment: an unpluralizable label reads as “examples of …”",
  opBuilt.assignment.questions.some((q) =>
    q.prompt === "List the two examples of “Object of the Preposition” in sentence 1."));

// --- handwriting space per family (proposal Q4) ---
const listQ = { kind: "list", expected: 3 };
check("assignment: spacing presets give a list room for every answer",
  wjt.assignment.linesFor(listQ, "compact") === 3 &&
  wjt.assignment.linesFor(listQ, "standard") === 4 &&
  wjt.assignment.linesFor(listQ, "generous") === 6 &&
  wjt.assignment.linesFor({ kind: "find" }, "standard") === 2 &&
  wjt.assignment.linesFor({ kind: "identify" }, "unknown-preset") === 1);

// --- word bank: a support, not an answer sheet ---
const banked = wjt.assignment.build(sample, { skills: ["pos"], count: 6, seed: 5, wordBank: true });
const bank = banked.assignment.options.wordBank;
const bankAnswers = [...new Set(banked.key.answers
  .filter((a, i) => banked.assignment.questions[i].kind === "identify")
  .map((a) => a.accepted[0]))];
check("assignment: the word bank holds every identify answer",
  bank.length > 0 && bankAnswers.every((n) => bank.includes(n)));
check("assignment: the word bank is padded with decoys", bank.length >= bankAnswers.length + 2);
check("assignment: the word bank is alphabetical, so it maps to no question",
  JSON.stringify(bank) === JSON.stringify([...bank].sort((a, b) => a.localeCompare(b))));
check("assignment: no word bank unless it was asked for",
  asgA.assignment.options.wordBank.length === 0);

/* ------------------------------ the codec ------------------------------ */
const codec = wjt.assignmentCodec;
const b64wire = (obj) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");

const enc = codec.encode(asgA.assignment);
check("codec: encodes to URL-safe characters only",
  enc.ok && /^[A-Za-z0-9_-]+$/.test(enc.payload));
const dec = codec.decode(enc.payload);
check("codec: round-trips the whole assignment", dec.ok &&
  JSON.stringify(dec.assignment.questions) === JSON.stringify(asgA.assignment.questions) &&
  JSON.stringify(dec.assignment.sentences) === JSON.stringify(asgA.assignment.sentences) &&
  dec.assignment.title === asgA.assignment.title &&
  dec.assignment.directions === asgA.assignment.directions);
check("codec: options survive the trip", (() => {
  const opts = wjt.assignment.build(sample, {
    skills: ALL_SKILLS, count: 6, seed: 8, wordBank: true,
    numberWords: true, grouping: "per-sentence", spacing: "generous",
  }).assignment;
  const back = codec.decode(codec.encode(opts).payload);
  return back.ok && back.assignment.options.numberWords === true &&
    back.assignment.options.grouping === "per-sentence" &&
    back.assignment.options.spacing === "generous" &&
    JSON.stringify(back.assignment.options.wordBank) === JSON.stringify(opts.options.wordBank);
})());
check("codec: defaults are omitted from the wire and restored on decode", (() => {
  const wire = codec.toWire(asgA.assignment);
  return !("o" in wire) && dec.assignment.options.grouping === "passage-first" &&
    dec.assignment.options.spacing === "standard" && dec.assignment.options.numberWords === false;
})());

// Unicode: curly quotes, an em dash, accents, and an astral-plane emoji.
const uniLesson = wjt.importLesson({
  title: "Unicode", sentences: [{
    text: "The café didn’t open — the fox 🦊 waited.",
    annotations: [{ match: "fox", label: "noun" }, { match: "waited.", label: "verb" }],
  }],
}).lesson;
const uni = wjt.assignment.build(uniLesson, {
  title: "Curly “quotes” — café 🦊",
  directions: "Écrivez vos réponses sur papier 🖊️",
  skills: ["pos"], count: "all", seed: 6,
});
const uniBack = codec.decode(codec.encode(uni.assignment).payload);
check("codec: Unicode round-trips exactly (curly quotes, accents, emoji)",
  uniBack.ok && uniBack.assignment.title === uni.assignment.title &&
  uniBack.assignment.directions === uni.assignment.directions &&
  uniBack.assignment.sentences[0].text === uni.assignment.sentences[0].text);

// --- rejection: malformed, hostile, oversized, wrong version ---
const badPayloads = ["", "   ", "A", "abc*def", "eyJ", "!!!!", "%%%%", "../../etc/passwd",
  "<script>alert(1)</script>", "x".repeat(codec.LIMITS.payload + 1), null, 42, {}, [], undefined];
let rejectedAll = true, threwSomewhere = false;
badPayloads.forEach((p) => {
  let r;
  try { r = codec.decode(p); } catch (e) { threwSomewhere = true; return; }
  if (!r || r.ok !== false || typeof r.error !== "string" || !r.error) rejectedAll = false;
});
check("codec: every malformed payload is rejected with a message", rejectedAll);
check("codec: nothing throws out of decode — the router can't be wedged", !threwSomewhere);

const goodWire = codec.toWire(asgA.assignment);
function wireVariant(mutate) {
  const w = JSON.parse(JSON.stringify(goodWire));
  mutate(w);
  return codec.decode(b64wire(w));
}
check("codec: an unsupported major version is rejected by name",
  /newer version/.test(wireVariant((w) => { w.v = 2; }).error));
check("codec: an unknown format tag is rejected",
  wireVariant((w) => { w.f = "not-ours"; }).ok === false);
check("codec: structural damage is rejected",
  wireVariant((w) => { w.s = []; }).ok === false &&
  wireVariant((w) => { w.q = []; }).ok === false &&
  wireVariant((w) => { w.q[0].s = 99; }).ok === false &&
  wireVariant((w) => { w.q[0].k = 9; }).ok === false &&
  wireVariant((w) => { w.q[0].p = ""; }).ok === false &&
  wireVariant((w) => { w.q[0] = null; }).ok === false);
check("codec: a mark that runs past its sentence is rejected",
  wireVariant((w) => {
    const q = w.q.find((x) => x.m);
    q.m = [0, 500];
  }).ok === false);
check("codec: counts and lengths are capped before anything renders",
  wireVariant((w) => { w.s = new Array(codec.LIMITS.sentences + 1).fill("A sentence."); }).ok === false &&
  wireVariant((w) => { w.q = new Array(codec.LIMITS.questions + 1).fill(w.q[0]); }).ok === false &&
  wireVariant((w) => { w.t = "T".repeat(codec.LIMITS.title + 1); }).ok === false &&
  wireVariant((w) => { w.d = "D".repeat(codec.LIMITS.directions + 1); }).ok === false &&
  wireVariant((w) => { w.o = { b: new Array(codec.LIMITS.bank + 1).fill("Noun") }; }).ok === false);
check("codec: hostile strings decode as data, never as structure", (() => {
  const evil = wireVariant((w) => {
    w.t = "<img src=x onerror=alert(1)>";
    w.q[0].p = "</p><script>alert(1)</script>";
  });
  return evil.ok && evil.assignment.title === "<img src=x onerror=alert(1)>" &&
    evil.assignment.questions[0].prompt === "</p><script>alert(1)</script>";
})());
check("codec: an over-ceiling assignment is refused, never truncated", (() => {
  const big = wjt.assignment.build(sample, { skills: ALL_SKILLS, count: "all", seed: 9 }).assignment;
  big.directions = "x".repeat(codec.LIMITS.directions + 1);
  const r = codec.encode(big);
  return r.ok === false && /too long/.test(r.error);
})());

// --- privacy invariants: the wire form IS the whitelist ---
const ALLOWED_TOP = ["f", "v", "t", "d", "s", "q", "o"];
const ALLOWED_Q = ["k", "s", "p", "m", "n"];
const ALLOWED_O = ["w", "b", "g", "z"];
const fullWire = codec.toWire(capped.assignment);
check("wire: only whitelisted top-level keys",
  Object.keys(fullWire).every((k) => ALLOWED_TOP.includes(k)));
check("wire: only whitelisted question keys",
  fullWire.q.every((q) => Object.keys(q).every((k) => ALLOWED_Q.includes(k))));
check("wire: only whitelisted option keys",
  !fullWire.o || Object.keys(fullWire.o).every((k) => ALLOWED_O.includes(k)));
check("wire: no seed, lesson id, notes, or annotation offsets",
  !("seed" in fullWire) && !("id" in fullWire) && !("lesson" in fullWire) &&
  !("answers" in fullWire) && !("key" in fullWire) &&
  !/"(seed|note|notes|label|annotations|start|end|lessonId|accepted|answers)"/.test(JSON.stringify(fullWire)));
check("wire: carries no label id anywhere",
  Object.keys(wjt.LABELS).every((id) => JSON.stringify(fullWire).indexOf('"' + id + '"') === -1));

// Every string the payload carries, so the leak check can look at values, not
// at "does the correct word appear in the passage" (it legitimately does).
function wireStrings(node, out) {
  out = out || [];
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => wireStrings(n, out));
  else if (node && typeof node === "object") Object.keys(node).forEach((k) => wireStrings(node[k], out));
  return out;
}
const LABEL_NAMES = Object.keys(wjt.LABELS).map((id) => wjt.LABELS[id].name);
const TYPE_NAMES = wjt.SENTENCE_TYPE_ORDER.reduce((acc, cat) =>
  acc.concat(Object.keys(wjt.SENTENCE_TYPES[cat].options)
    .map((o) => wjt.SENTENCE_TYPES[cat].options[o].name)), []);
check("wire: with the bank off, no value IS an answer (label or type name)",
  wireStrings(fullWire).every((s) => !LABEL_NAMES.includes(s) && !TYPE_NAMES.includes(s)));
check("wire: with the bank on, the bank is the only place an answer name appears",
  wireStrings(codec.toWire(banked.assignment))
    .filter((s) => LABEL_NAMES.includes(s))
    .every((s) => banked.assignment.options.wordBank.includes(s)));
check("wire: the answer key never rides along",
  JSON.stringify(fullWire).indexOf(capped.key.answers[0].source) === -1);
check("assignment: the runtime object carries no answers either",
  !JSON.stringify(capped.assignment).includes('"accepted"') &&
  !JSON.stringify(capped.assignment).includes('"note"') &&
  !JSON.stringify(capped.assignment).includes('"source"'));

// --- share URL, size states, and the measured thresholds ---
const BASE = "https://example.github.io/sentence-app/";
check("codec: the share URL is built from the current page, hash removed",
  codec.shareUrl(BASE + "#/assign/abc123", "PAYLOAD") === BASE + "#/assignment/PAYLOAD");
check("codec: size states sit on the documented boundaries",
  codec.sizeState(codec.THRESHOLDS.easy) === "easy" &&
  codec.sizeState(codec.THRESHOLDS.easy + 1) === "dense" &&
  codec.sizeState(codec.THRESHOLDS.dense) === "dense" &&
  codec.sizeState(codec.THRESHOLDS.dense + 1) === "too-large-qr" &&
  codec.sizeState(codec.LIMITS.url) === "too-large-qr" &&
  codec.sizeState(codec.LIMITS.url + 1) === "too-large-url");
// All three QR states, on the same real lesson: the size control has to react
// to the actual URL, not to a guess from the sentence count.
function stateFor(count, sentences) {
  const built = wjt.assignment.build(sample, { skills: ALL_SKILLS, count, sentences, seed: 42 });
  const r = codec.encode(built.assignment);
  return r.ok ? codec.measure(BASE, r.payload) : { state: "refused", length: 0, error: r.error };
}
check("codec: a short assignment scans easily", stateFor(5, [1, 2]).state === "easy");
check("codec: the default 10 questions on 4 sentences is dense", stateFor(10).state === "dense");
check("codec: 20 questions is past what a QR code should carry",
  stateFor(20).state === "too-large-qr");
check("codec: measure() reports the real URL it built",
  codec.measure(BASE, enc.payload).length === codec.shareUrl(BASE, enc.payload).length);

// Report real URL lengths for every built-in lesson, so the thresholds above
// stay honest as the examples grow. 10 questions is the builder's default.
console.log("  note: measured share-URL length, base " + BASE.length + " chars" +
  " (easy ≤ " + codec.THRESHOLDS.easy + ", dense ≤ " + codec.THRESHOLDS.dense +
  ", url ceiling " + codec.LIMITS.url + ")");
wjt.EXAMPLES.forEach((ex) => {
  const lesson = ex.build();
  const cells = [10, 20, "all"].map((count) => {
    const built = wjt.assignment.build(lesson, { skills: ALL_SKILLS, count, seed: 42 });
    const r = codec.encode(built.assignment);
    const n = String(built.assignment.questions.length).padStart(3) + "q ";
    return r.ok
      ? n + String(codec.shareUrl(BASE, r.payload).length).padStart(5) + " " +
        codec.sizeState(codec.shareUrl(BASE, r.payload).length).padEnd(13)
      : n + "refused".padStart(5) + " " +
        (/too many questions/.test(r.error) ? "over question cap" :
          /Sentence \d+ is too long/.test(r.error) ? "sentence over cap" : "over url cap").padEnd(13);
  });
  console.log("        " + ex.id.padEnd(34) +
    String(lesson.sentences.length).padStart(3) + " sent | " + cells.join("| "));
});

/* --------------------- delivery channels (seam S5) ---------------------
 * The interface print, file, and link all satisfy, and the two things it exists
 * to make testable: that `available()` is where P3 lives (so a teacher on
 * file:// keeps print and file, and is TOLD why the link is off), and that the
 * link channel wraps wjt.assignmentCodec rather than reimplementing it. */
const channels = wjt.assignmentChannels;
const byId = (list, id) => list.find((c) => c.id === id);
const FILE_ENV = { protocol: "file:", baseUrl: "file:///C:/lessons/sentence-forge/index.html" };
const WEB_ENV = { protocol: "https:", baseUrl: BASE };
const grouped = (n) => String(n).replace(/\B(?=(\d{3})+$)/g, ",");
// Small on purpose: a 5-question, 2-sentence assignment is the "easy" QR band.
const small = wjt.assignment.build(sample, { skills: ALL_SKILLS, count: 5, sentences: [1, 2], seed: 42 });

check("channels: three channels, in the order a view shows them",
  JSON.stringify(channels.ORDER) === JSON.stringify(["print", "file", "link"]));
check("channels: every one satisfies the same interface", channels.ORDER.every((id) => {
  const ch = channels.get(id);
  return ch && ch.id === id && typeof ch.name === "string" && ch.name &&
    typeof ch.what === "string" && ch.what &&
    /^(ready|planned)$/.test(ch.status) && Array.isArray(ch.actions) &&
    typeof ch.available === "function" && typeof ch.report === "function" &&
    typeof ch.deliver === "function";
}));
check("channels: list() is in ORDER and carries everything a view needs",
  JSON.stringify(channels.list(small, WEB_ENV).map((c) => c.id)) === JSON.stringify(channels.ORDER) &&
  channels.list(small, WEB_ENV).every((c) =>
    typeof c.available === "boolean" && typeof c.reason === "string" &&
    typeof c.ready === "boolean" && typeof c.detail === "string" &&
    typeof c.length === "number" && Array.isArray(c.actions)));

// --- P3 as code: file:// keeps print and file, and explains the link ---
const onFile = channels.list(small, FILE_ENV);
check("channels: print and file are available under file:// — the P3 promise",
  byId(onFile, "print").available && byId(onFile, "file").available);
check("channels: print and file are available under every protocol, including none",
  ["file:", "http:", "https:", "", "chrome-extension:"].every((protocol) =>
    channels.get("print").available({ protocol }).available &&
    channels.get("file").available({ protocol }).available));
check("channels: link is unavailable under file://, with a reason a teacher can read",
  byId(onFile, "link").available === false &&
  byId(onFile, "link").reason === channels.NO_LINK_REASON &&
  /printing works here/.test(channels.NO_LINK_REASON));
check("channels: an unavailable channel is never measured",
  byId(onFile, "link").detail === "" && byId(onFile, "link").length === 0);
check("channels: the file:// gate is in the channel, not in a view — deliver() refuses too",
  channels.get("link").deliver(small, { env: FILE_ENV }).ok === false &&
  channels.get("link").deliver(small, { env: FILE_ENV }).error === channels.NO_LINK_REASON);
check("channels: env() survives a page with no location, and the link gate fails closed",
  channels.env().protocol === "" && channels.env().baseUrl === "" &&
  channels.get("link").available().available === false);
check("channels: link is available on a web origin — the protocol is the whole gate",
  byId(channels.list(small, WEB_ENV), "link").available === true &&
  channels.get("link").available({ protocol: "http:" }).available === true);

// --- the link channel is the codec, wrapped: same payload, same URL, same words ---
const linkOut = channels.get("link").deliver(small, { env: WEB_ENV });
const smallEnc = codec.encode(small.assignment);
check("channels: link.deliver() returns the codec's own payload and share URL",
  linkOut.ok && linkOut.payload === smallEnc.payload &&
  linkOut.url === codec.shareUrl(BASE, smallEnc.payload) &&
  linkOut.length === linkOut.url.length && linkOut.state === codec.sizeState(linkOut.length));
check("channels: a delivered link decodes back to the same assignment", (() => {
  const back = codec.decode(linkOut.url.split(codec.ROUTE)[1]);
  return back.ok &&
    JSON.stringify(back.assignment.questions) === JSON.stringify(small.assignment.questions) &&
    JSON.stringify(back.assignment.sentences) === JSON.stringify(small.assignment.sentences);
})());
const STATE_WORDING = {
  easy: /scans easily/, dense: /the QR code is dense/,
  "too-large-qr": /too long for a QR code/, "too-large-url": /link ceiling/,
};
check("channels: the size report is the codec's own band, in teacher wording",
  [[5, [1, 2], "easy"], [10, null, "dense"], [20, null, "too-large-qr"]].every(([count, sentences, want]) => {
    const built = wjt.assignment.build(sample, { skills: ALL_SKILLS, count, sentences, seed: 42 });
    const rep = channels.get("link").report(built, WEB_ENV);
    // The number leads the sentence, comma-grouped, so a teacher can compare it
    // to the thresholds without counting digits.
    return rep.state === want && rep.ready === true && STATE_WORDING[want].test(rep.detail) &&
      rep.detail.indexOf(grouped(rep.length)) === 0;
  }));
check("channels: past the URL ceiling the link is not ready, and names the ceiling", (() => {
  // A long base URL, not a bigger assignment: this exercises `too-large-url`
  // deterministically, without depending on how the examples happen to grow.
  const longBase = { protocol: "https:", baseUrl: "https://example.test/" + "a".repeat(codec.LIMITS.url) + "/" };
  const rep = channels.get("link").report(small, longBase);
  const out = channels.get("link").deliver(small, { env: longBase });
  return rep.ready === false && rep.state === "too-large-url" &&
    STATE_WORDING["too-large-url"].test(rep.detail) &&
    rep.detail.indexOf(grouped(codec.LIMITS.url)) !== -1 &&
    out.ok === false && STATE_WORDING["too-large-url"].test(out.error);
})());
check("channels: an assignment the codec refuses is reported in the codec's own words", (() => {
  const big = wjt.assignment.build(sample, { skills: ALL_SKILLS, count: "all", seed: 9 });
  big.assignment.directions = "x".repeat(codec.LIMITS.directions + 1);
  const rep = channels.get("link").report(big, WEB_ENV);
  return rep.ready === false && rep.state === "refused" && /too long/.test(rep.detail);
})());

// --- print and file: always available, no size limit, and honest readouts ---
const printDetail = byId(onFile, "print").detail;
check("channels: the print report counts the questions and sentences really drawn",
  printDetail.indexOf(small.assignment.questions.length + " question") === 0 &&
  printDetail.indexOf(small.assignment.sentences.length + " sentence") !== -1 &&
  /no size limit\.$/.test(printDetail));
check("channels: the file report measures the real serialized size",
  byId(onFile, "file").ready === true &&
  /^One \.json file, about [\d,]+ (bytes|KB) — no size limit\.$/.test(byId(onFile, "file").detail) &&
  byId(onFile, "file").length ===
    JSON.stringify(channels.get("file").payload(small), null, 2).length);

// The file channel is a delivery channel, so the same rule applies to it as to
// the wire form: the student half only, and never the key.
const filePayload = channels.get("file").payload(capped);
const fileText = JSON.stringify(filePayload);
check("channels: the file carries no answer-key material",
  !/"accepted"|"source"|"answers"|"note"/.test(fileText) &&
  capped.key.answers.every((a) => fileText.indexOf(a.source) === -1) &&
  fileText.indexOf(capped.key.format) === -1);
check("channels: the file drops the seed — a teacher's regenerate handle, not a student's",
  !("seed" in filePayload) && "seed" in capped.assignment &&
  Object.keys(capped.assignment).filter((k) => k !== "seed")
    .every((k) => JSON.stringify(filePayload[k]) === JSON.stringify(capped.assignment[k])));
check("channels: the file is self-describing, so something can read it back later",
  filePayload.format === wjt.assignment.FORMAT && filePayload.version === wjt.assignment.VERSION);
check("channels: the download filename is a slug of the title, and says what it is",
  /^[a-z0-9-]+\.assignment\.json$/.test(channels.get("file").filename(small)) &&
  channels.get("file").filename({ assignment: { title: "Sentence 3 — “Fox” practice!" } }) ===
    "sentence-3-fox-practice.assignment.json" &&
  channels.get("file").filename({ assignment: { title: "!!!" } }) === "untitled.assignment.json");

// --- status: what can reach a student today, and what is only measured ---
check("channels: print and file are ready; link is measured but has nowhere to send yet",
  channels.get("print").status === "ready" && channels.get("print").actions.length === 2 &&
  channels.get("file").status === "ready" && channels.get("file").actions.length === 1 &&
  channels.get("link").status === "planned" && channels.get("link").actions.length === 0 &&
  /Phase 4/.test(channels.PLANNED_NOTE));
check("channels: nothing throws out of deliver() — a click handler can't be wedged", (() => {
  // No DOM in this sandbox, so print and file must FAIL rather than throw. That
  // is the same contract for a browser that refuses a Blob or a print dialog.
  let threw = false, allAnswered = true;
  [FILE_ENV, WEB_ENV].forEach((env) => {
    channels.ORDER.forEach((id) => {
      ["worksheet", "key", "download", undefined].forEach((variant) => {
        let r;
        try { r = channels.get(id).deliver(small, { env, variant }); }
        catch (e) { threw = true; return; }
        if (!r || typeof r.ok !== "boolean") allAnswered = false;
        if (r.ok === false && (typeof r.error !== "string" || !r.error)) allAnswered = false;
      });
    });
  });
  return !threw && allAnswered;
})());

// --- the new modules stay DOM-free and storage-free ---
["assignment-model.js", "assignment-codec.js", "assignment-channels.js",
  "study-model.js"].concat(UNIT_FILES).forEach((f) => {
  const src = fs.readFileSync(path.join(root, "js", f), "utf8");
  check(f + ": touches no DOM, storage, or network",
    !/\bdocument\b|localStorage|sessionStorage|\bfetch\s*\(|XMLHttpRequest|navigator/.test(src));
});

/* ====================================================================
 * Study mode — Unit 1: The Nine Parts of Speech
 * Design record: plans/proposals/curriculum-unit-1-parts-of-speech.md
 * ==================================================================== */
console.log("\n-- study: unit 1 --");
{
  const unit = wjt.study.unit("pos");
  check("study: unit `pos` is registered", !!unit);

  const stops = wjt.study.stops("pos");
  check("study: 15 stops declared", stops.length === 15);
  check("study: stop ids are unique",
    new Set(stops.map((s) => s.id)).size === stops.length);
  check("study: every stop has a title and a blurb",
    stops.every((s) => !!s.title && !!s.blurb));

  /* The unit is assembled from six files, each appending its stops in load
   * order, so the <script> tags in index.html ARE the path order. This is what
   * makes a mis-ordered or missing tag fail a check instead of quietly
   * reshuffling the unit map. */
  check("study: stops are numbered 0…14 in path order",
    stops.every((s, i) => s.n === i));

  // --- the label budget cannot drift ---
  const POS = wjt.labelsForLayer("pos");
  check("study: the POS layer still holds 54 labels", POS.length === 54);

  const EXCLUDED = unit.excluded;
  check("study: 6 labels are excluded, and each one really exists",
    EXCLUDED.length === 6 && EXCLUDED.every((id) => !!wjt.LABELS[id]));
  const budget = POS.filter((id) => EXCLUDED.indexOf(id) === -1);
  check("study: the budget is 48 labels", budget.length === 48);

  const focusUnion = [];
  stops.forEach((s) => (s.focus || []).forEach((id) => focusUnion.push(id)));
  check("study: every focus label exists and is a POS label",
    focusUnion.every((id) => wjt.LABELS[id] && wjt.LABELS[id].layer === "pos"));
  check("study: no focus label is one of the six excluded",
    focusUnion.every((id) => EXCLUDED.indexOf(id) === -1));
  check("study: every focus label is inside the 48-label budget",
    focusUnion.every((id) => budget.indexOf(id) !== -1));

  /* The nine focus lessons partition the budget: each of the 48 labels is
   * taught by exactly one of them. Orientation deliberately re-uses the nine
   * base labels to introduce them, so it is exempt from the partition — and the
   * reviews and capstone carry no focus of their own.
   *
   * This is checkable now even though only two stops are authored, because every
   * stop DECLARES its focus up front so the unit map can render the whole path. */
  const focusLessons = stops.filter((s) => "ABCD".indexOf(s.cluster) !== -1 && s.lessonId);
  const lessonFocus = [];
  focusLessons.forEach((s) => (s.focus || []).forEach((id) => lessonFocus.push(id)));
  check("study: nine focus lessons, one per part of speech", focusLessons.length === 9);
  check("study: no two focus lessons claim the same label",
    new Set(lessonFocus).size === lessonFocus.length);
  check("study: the nine focus lessons cover the budget exactly (48)",
    lessonFocus.length === budget.length &&
    budget.every((id) => lessonFocus.indexOf(id) !== -1));

  const orientation = wjt.study.stop("pos", "orientation");
  const bases = wjt.baseLabelsForLayer("pos");
  check("study: the POS layer has exactly nine base labels", bases.length === 9);
  check("study: orientation introduces exactly the nine bases",
    orientation.focus.length === 9 && bases.every((id) => orientation.focus.indexOf(id) !== -1));

  const authored = stops.filter((s) => !s.todo);

  /* --- an authored stop really teaches what it claims ---
   *
   * The check that catches a lesson quietly failing to cover a focus label.
   *
   * A stop may declare `handTaught` for labels the STORY CANNOT SUPPLY — Poe uses
   * no possessive pronoun and asks no question opening with an interrogative
   * pronoun, and the proposal's rule is to change the passage, never the labelling,
   * and never Poe's words. Those labels are covered by a written `choice` item
   * instead, and both halves of that bargain are asserted here: the missing set
   * must be EXACTLY the declared set (so a real gap cannot hide behind the
   * declaration, and the declaration cannot rot once a passage changes), and every
   * declared label must be claimed by an item.
   *
   * A stop with NO TEACH SCREENS is exempt, and there is exactly one — the
   * capstone. Its `focus` is the whole 48-label budget because it is a filter over
   * unseen text, not a list of labels it claims to teach, and no two paragraphs of
   * Poe could carry all 48. What it is held to instead is asserted below: unseen
   * sentences, one tap per label, and coverage of all nine parts of speech and all
   * four clusters. Add a teach screen to the capstone and this check starts
   * applying to it again, which is the right way round. */
  authored.forEach((stop) => {
    if (!stop.lessonId || !(stop.teach || []).length) return;
    const lesson = wjt.study.lessonFor(stop.lessonId);
    check("study: " + stop.id + " has its passage", !!lesson);
    if (!lesson) return;
    const used = {};
    lesson.sentences.forEach((s) => (s.annotations || []).forEach((a) => { used[a.label] = true; }));
    const hand = (stop.handTaught || []).slice().sort();
    const missing = (stop.focus || []).filter((id) => !used[id]).sort();
    check("study: " + stop.id + " has a real instance of every focus label the story " +
      "can supply (" + (stop.focus.length - hand.length) + " of " + stop.focus.length + ")" +
      (missing.join(",") !== hand.join(",") ? " — missing: [" + missing.join(", ") +
        "], declared hand-taught: [" + hand.join(", ") + "]" : ""),
      missing.join(",") === hand.join(","));

    hand.forEach((id) => {
      check("study: " + stop.id + " covers hand-taught " + id + " with a written item",
        (stop.items || []).some((it) => it.label === id));
      check("study: " + stop.id + " hand-taught " + id + " is still a focus label",
        (stop.focus || []).indexOf(id) !== -1);
    });
  });

  // --- authored questions are well formed ---
  authored.forEach((stop) => {
    (stop.items || []).forEach((it, i) => {
      const where = "study: " + stop.id + " item " + (i + 1);
      if (it.kind === "sort") {
        /* A sort is only fair if a word can go in exactly one bucket, so the
         * things asserted here are the ways that breaks: a word that appears
         * twice collapses in the { word: bucket } map and silently drops a
         * question; a bucket nothing is sorted into is a decoy the student can
         * never be right about; an expected bucket that is not on offer is
         * unanswerable. */
        const words = (it.words || []).map((w) => w.word);
        const buckets = it.buckets || [];
        check(where + " (sort) has a stem, 2+ buckets, and 3+ words",
          !!it.stem && buckets.length >= 2 && words.length >= 3);
        check(where + " (sort) has no repeated word",
          new Set(words).size === words.length);
        check(where + " (sort) every bucket is a real POS label",
          buckets.every((b) => wjt.LABELS[b] && wjt.LABELS[b].layer === "pos"));
        check(where + " (sort) every word's bucket is one of the buckets on offer",
          (it.words || []).every((w) => buckets.indexOf(w.bucket) !== -1));
        check(where + " (sort) every bucket gets at least one word",
          buckets.every((b) => (it.words || []).some((w) => w.bucket === b)));
        check(where + " (sort) no bucket is one of the six excluded labels",
          buckets.every((b) => EXCLUDED.indexOf(b) === -1));
        return;
      }
      const correct = it.options.filter((o) => o.correct);
      check(where + " has exactly one correct option", correct.length === 1);
      check(where + " has a stem and feedback on every option",
        !!it.stem && it.options.length >= 2 && it.options.every((o) => !!o.text && !!o.feedback));
    });
    (stop.teach || []).forEach((t, i) => {
      check("study: " + stop.id + " teach screen " + (i + 1) + " names only real focus labels",
        (t.labels || []).every((id) => (stop.focus || []).indexOf(id) !== -1));
    });
  });

  // --- step assembly and scoring ---
  authored.forEach((stop) => {
    const steps = wjt.study.steps("pos", stop.id);
    const scorable = wjt.study.scorable(steps);
    check("study: " + stop.id + " assembles steps (" + steps.length + ", " +
      scorable.length + " scored)", steps.length > 0 && scorable.length > 0);
    check("study: " + stop.id + " step ids are unique",
      new Set(steps.map((s) => s.id)).size === steps.length);
    check("study: " + stop.id + " generates at least one tap question",
      steps.some((s) => s.kind === "tap"));
    check("study: " + stop.id + " every tap question is about a focus label",
      steps.filter((s) => s.kind === "tap")
        .every((s) => stop.focus.indexOf(s.label) !== -1));

    // A check that can't fail is not a check: assert BOTH verdicts.
    const taps = steps.filter((s) => s.kind === "tap");
    /* EVERY accepted range, not just the first. A third of these questions have
     * more than one right answer, and "accept any of them" is the fairness rule
     * the prompt now promises out loud ("there are 6"). */
    check("study: " + stop.id + " check() accepts every range a tap allows",
      taps.every((s) => s.accept.every((r) => wjt.study.check(s, r).correct)));
    check("study: " + stop.id + " check() rejects a deliberately wrong range",
      taps.every((s) => {
        const bad = { first: s.accept[0].first + 7, last: s.accept[0].last + 9 };
        return !wjt.study.check(s, bad).correct;
      }));
    check("study: " + stop.id + " check() rejects an empty tap response",
      taps.every((s) => !wjt.study.check(s, null).correct));

    const choices = steps.filter((s) => s.kind === "choice");
    check("study: " + stop.id + " check() scores every choice both ways",
      choices.every((s) => {
        const right = s.options.reduce((acc, o, i) => (o.correct ? i : acc), -1);
        const wrong = s.options.reduce((acc, o, i) => (!o.correct ? i : acc), -1);
        return wjt.study.check(s, right).correct && !wjt.study.check(s, wrong).correct;
      }));

    /* `sort` scores per-word bucket equality and nothing else, so all four
     * verdicts are worth pinning: the right map passes, ONE word moved fails and
     * is named, a half-finished map is not correct AND reports how far along it
     * is (which is what lets the view refuse it rather than mark it wrong), and
     * placing every word in one bucket fails. */
    const sorts = steps.filter((s) => s.kind === "sort");
    if (!sorts.length) return;               // most stops have none; don't assert vacuously
    check("study: " + stop.id + " check() accepts a fully correct sort",
      sorts.every((s) => wjt.study.check(s, s.expected).correct));
    check("study: " + stop.id + " check() fails a sort with one word moved, and names it",
      sorts.every((s) => {
        const words = Object.keys(s.expected);
        const moved = words.find((w) => s.buckets.some((b) => b !== s.expected[w]));
        const given = Object.assign({}, s.expected);
        given[moved] = s.buckets.filter((b) => b !== s.expected[moved])[0];
        const v = wjt.study.check(s, given);
        return !v.correct && v.detail.wrong.length === 1 && v.detail.wrong[0] === moved;
      }));
    check("study: " + stop.id + " check() reports a half-placed sort as unfinished",
      sorts.every((s) => {
        const words = Object.keys(s.expected);
        const given = {};
        words.slice(0, words.length - 1).forEach((w) => { given[w] = s.expected[w]; });
        const v = wjt.study.check(s, given);
        return !v.correct && v.detail.placed === words.length - 1 &&
          v.detail.total === words.length;
      }));
    check("study: " + stop.id + " check() fails a sort with everything in one bucket",
      sorts.every((s) => {
        const given = {};
        Object.keys(s.expected).forEach((w) => { given[w] = s.buckets[0]; });
        return !wjt.study.check(s, given).correct;
      }));
    check("study: " + stop.id + " check() rejects an empty sort response",
      sorts.every((s) => !wjt.study.check(s, null).correct));
  });

  /* --- answer order ---
   *
   * Items are AUTHORED correct-answer-first, and a sort's words are authored
   * cycling through the buckets, because that is the readable way to write them.
   * Both are a giveaway to PLAY, so `steps()` shuffles on the way out. What is
   * asserted here is that pair: the source keeps the convention, the delivered
   * step doesn't, and repeated calls agree with each other.
   *
   * That last one is not a nicety. tools/dom-check.html calls `steps()` a second
   * time to work out which option it must click in order to answer wrong on
   * purpose; if the two calls disagreed it would click the right answer and
   * assert a wrong one, intermittently. */
  console.log("\n-- study: answer order --");
  {
    /* Delivered steps paired with the item each came from. Paired BY STEM, never
     * by index: `steps()` orders items by the teach screen they follow, and
     * `itemsLast` moves a whole group, so the two lists are not parallel. */
    const pairs = [], sortPairs = [];
    authored.forEach((stop) => {
      const items = stop.items || [];
      wjt.study.steps("pos", stop.id).forEach((s) => {
        if (s.kind !== "choice" && s.kind !== "sort") return;
        const src = items.filter((it) => it.stem === s.stem &&
          (it.kind === "sort") === (s.kind === "sort"));
        if (src.length !== 1) {
          check("study: " + stop.id + " step “" + String(s.stem).slice(0, 40) +
            "” traces back to exactly one authored item", false);
          return;
        }
        (s.kind === "sort" ? sortPairs : pairs).push({ step: s, item: src[0], stop: stop.id });
      });
    });

    const authoredItems = authored.reduce((acc, stop) =>
      acc.concat((stop.items || []).filter((it) => it.kind !== "sort")), []);
    check("study: every authored item is still written correct-answer-first (" +
      authoredItems.length + ")",
      authoredItems.length > 0 &&
      authoredItems.every((it) => it.options.findIndex((o) => o.correct) === 0));
    check("study: every authored item reaches the student exactly once (" +
      pairs.length + ")", pairs.length === authoredItems.length);

    const at = pairs.map((p) => p.step.options.findIndex((o) => o.correct));
    check("study: delivered choices are shuffled — the answer is not always first",
      at.length > 0 && at.some((i) => i !== 0));
    /* Every slot gets used. A shuffle that only ever swapped the first two would
     * pass the check above and still be guessable. */
    check("study: the answer lands in every slot of a four-option question (" +
      [0, 1, 2, 3].map((i) => at.filter((x) => x === i).length).join("/") + ")",
      [0, 1, 2, 3].every((i) => at.filter((x) => x === i).length > 0));
    check("study: no slot takes more than half of all the answers",
      [0, 1, 2, 3].every((i) => at.filter((x) => x === i).length <= at.length / 2));
    check("study: shuffling preserves exactly one correct option per choice",
      pairs.every((p) => p.step.options.filter((o) => o.correct).length === 1));
    check("study: shuffling loses no option and invents none",
      pairs.every((p) =>
        JSON.stringify(p.item.options.map((o) => o.text).sort()) ===
        JSON.stringify(p.step.options.map((o) => o.text).sort())));
    check("study: the shuffled option keeps its OWN feedback",
      pairs.every((p) => p.step.options.every((o) =>
        p.item.options.some((src) => src.text === o.text && src.feedback === o.feedback &&
          !!src.correct === !!o.correct))));

    check("study: a sort's words are shuffled out of their authored bucket order",
      sortPairs.length > 0 &&
      sortPairs.some((p) => p.item.words.map((w) => w.word).join("|") !== p.step.words.join("|")));
    check("study: a shuffled sort still asks about exactly its own words",
      sortPairs.every((p) =>
        p.step.words.slice().sort().join("|") === Object.keys(p.step.expected).sort().join("|") &&
        p.step.words.slice().sort().join("|") ===
          p.item.words.map((w) => w.word).sort().join("|")));

    let stable = true;
    authored.forEach((stop) => {
      const a = wjt.study.steps("pos", stop.id);
      const b = wjt.study.steps("pos", stop.id);
      a.forEach((s, i) => {
        if (s.kind === "choice" &&
          s.options.map((o) => o.text).join("|") !== b[i].options.map((o) => o.text).join("|")) stable = false;
        if (s.kind === "sort" && s.words.join("|") !== b[i].words.join("|")) stable = false;
      });
    });
    check("study: two steps() calls for one stop deliver the SAME order", stable);
  }

  /* --- `tap` questions with more than one right answer ---
   *
   * 42 of 131 as of this writing. `accept` holds all of them in both forms, so
   * the view can highlight the word the student picked instead of contradicting
   * an answer it just accepted. */
  {
    const taps = [];
    authored.forEach((stop) => {
      wjt.study.steps("pos", stop.id).forEach((s) => { if (s.kind === "tap") taps.push(s); });
    });
    check("study: every accepted range carries BOTH a token range and a char span",
      taps.length > 0 && taps.every((s) => s.accept.length > 0 &&
        s.accept.every((r) => [r.first, r.last, r.start, r.end]
          .every((v) => typeof v === "number"))));
    check("study: the span a tap was built from is among the ones it accepts",
      taps.every((s) => s.accept.some((r) => r.start === s.start && r.end === s.end)));
    check("study: accepted ranges are in reading order, which is how the view lists them",
      taps.every((s) => s.accept.every((r, i) => i === 0 || s.accept[i - 1].start < r.start)));
    check("study: an accepted range names the same text its token range covers",
      taps.every((s) => {
        const tokens = wjt.tokenize(s.sentence.text);
        return s.accept.every((r) => {
          const span = wjt.tokensToSpan(tokens, r.first, r.last);
          return span.start === r.start && span.end === r.end;
        });
      }));
    const many = taps.filter((s) => s.accept.length > 1);
    check("study: some tap questions really do have several right answers (" +
      many.length + " of " + taps.length + ")", many.length > 0);
  }

  // A `tap` question must never ask about a span that carries two POS labels —
  // that would be two right answers for one highlighted word (decision C5).
  check("study: no passage token carries two POS labels", (() => {
    let clean = true;
    stops.filter((s) => !s.todo && s.lessonId).forEach((stop) => {
      const lesson = wjt.study.lessonFor(stop.lessonId);
      lesson.sentences.forEach((s) => {
        const seen = {};
        (s.annotations || []).forEach((a) => {
          if (wjt.layerOf(a.label).id !== "pos") return;
          const key = a.start + ":" + a.end;
          if (seen[key]) clean = false;
          seen[key] = true;
        });
      });
    });
    return clean;
  })());

  /* A `tap` question about a BASE label must not be answerable by a word this
   * passage labelled with one of that base's own subtypes — "select the noun"
   * cannot be fair in a sentence where another noun is tagged `proper-noun`,
   * because `accept` holds only the same-label spans. Phase 1 kept this rule
   * implicitly, per sentence; Phase 2 made it explicit because the determiner
   * family breaks the moment you forget it.
   *
   * `article` is the same hazard without the parent link: it, `definite-article`
   * and `indefinite-article` are all SIBLINGS under `determiner`, so the tree
   * cannot tell you that "the" labelled `article` and "the" labelled
   * `definite-article` are two right answers to one question. Declared instead. */
  const SIBLING_SUPERSETS = { article: ["definite-article", "indefinite-article"] };
  check("study: no passage sentence mixes a label with a narrower one", (() => {
    let clean = true;
    stops.filter((s) => !s.todo && s.lessonId).forEach((stop) => {
      const lesson = wjt.study.lessonFor(stop.lessonId);
      lesson.sentences.forEach((s) => {
        const here = new Set((s.annotations || []).map((a) => a.label));
        here.forEach((id) => {
          const narrower = wjt.childrenOf(id);
          narrower.concat(SIBLING_SUPERSETS[id] || []).forEach((sub) => {
            if (here.has(sub)) {
              console.log("       " + stop.id + ": " + id + " + " + sub + " in " +
                JSON.stringify(s.text.slice(0, 60)));
              clean = false;
            }
          });
        });
      });
    });
    return clean;
  })());

  /* ------------------------------------------------------------------ *
   * The capstone — the one stop that is an assessment rather than a lesson.
   * ------------------------------------------------------------------ */
  {
    const cap = wjt.study.stop("pos", "capstone");
    const steps = wjt.study.steps("pos", "capstone");
    const taps = steps.filter((s) => s.kind === "tap");
    const scorable = wjt.study.scorable(steps);

    check("study: capstone is authored", !!cap && !cap.todo);
    check("study: capstone carries NO teach screens — it assesses, it does not teach",
      !(cap.teach || []).length);
    check("study: capstone focus is exactly the 48-label budget",
      cap.focus.length === budget.length && budget.every((id) => cap.focus.indexOf(id) !== -1));
    check("study: capstone reports by cluster", cap.resultsBy === "cluster");

    /* THE point of a capstone. Every sentence must be text the student has not
     * already been quizzed on, or it measures memory of the lessons instead of
     * transfer to new prose. */
    const seen = {};
    stops.forEach((s) => {
      if (!s.lessonId || s.id === "capstone") return;
      const lesson = wjt.study.lessonFor(s.lessonId);
      (lesson ? lesson.sentences : []).forEach((x) => { seen[x.text] = s.id; });
    });
    const capLesson = wjt.study.lessonFor("unit-pos-capstone");
    const reused = (capLesson ? capLesson.sentences : [])
      .filter((x) => seen[x.text]).map((x) => seen[x.text]);
    check("study: capstone is UNSEEN TEXT — no sentence of it appears in another stop" +
      (reused.length ? " (shared with: " + reused.join(", ") + ")" : ""),
      !!capLesson && capLesson.sentences.length > 0 && reused.length === 0);

    /* `tapPerLabel: 1` is the only thing standing between a 48-label focus and a
     * question for every (sentence, label) pair in the passage. */
    const perLabel = {};
    taps.forEach((s) => { perLabel[s.label] = (perLabel[s.label] || 0) + 1; });
    check("study: capstone generates exactly one tap per label (" + taps.length + ")",
      taps.length > 0 && Object.keys(perLabel).every((id) => perLabel[id] === 1));
    check("study: capstone asks ~30 questions (" + scorable.length + ")",
      scorable.length >= 25 && scorable.length <= 40);
    check("study: capstone is tap-heavy — finding a word in real prose, not reciting",
      taps.length > scorable.length / 2);

    // Across all nine parts of speech, and across all four teaching clusters.
    const familyOf = (id) => {
      let at = id;
      while (wjt.LABELS[at] && wjt.LABELS[at].parent) at = wjt.LABELS[at].parent;
      return at;
    };
    const asked = {};
    steps.forEach((s) => { if (s.label) asked[familyOf(s.label)] = true; });
    (cap.items || []).forEach((it) => {
      (it.buckets || []).forEach((b) => { asked[familyOf(b)] = true; });
    });
    const missingBase = bases.filter((id) => !asked[id]);
    check("study: capstone asks about all nine parts of speech" +
      (missingBase.length ? " (missing: " + missingBase.join(", ") + ")" : ""),
      missingBase.length === 0);

    const byCluster = wjt.study.labelClusters("pos");
    const clusterHits = {};
    taps.forEach((s) => { if (byCluster[s.label]) clusterHits[byCluster[s.label]] = true; });
    check("study: capstone's tap questions reach all four teaching clusters (" +
      Object.keys(clusterHits).sort().join(",") + ")",
      Object.keys(clusterHits).length === 4);

    /* labelClusters() is what the results screen groups by, so it must cover the
     * whole budget and attribute each label to exactly one cluster. */
    check("study: every budgeted label is owned by exactly one teaching cluster",
      budget.every((id) => !!byCluster[id]));

    /* The report itself: a fabricated all-correct run, then an all-wrong one. It
     * is built from in-memory records and must add up to the scorable count —
     * nothing may be silently dropped out of a results screen. */
    const allRight = scorable.map((s) => ({ step: s, correct: true }));
    const rowsRight = wjt.study.clusterReport("pos", allRight);
    const total = rowsRight.reduce((n, r) => n + r.total, 0);
    check("study: clusterReport accounts for every scored question (" + total + "/" +
      scorable.length + ")", total === scorable.length);
    check("study: clusterReport names a title and a stop to revisit for each cluster row",
      rowsRight.filter((r) => r.id).every((r) => !!r.stopId && !!r.title));
    check("study: clusterReport leaves the cross-cluster row untitled for the view to name",
      rowsRight.filter((r) => !r.id).every((r) => r.title === "" && r.stopId === ""));
    check("study: clusterReport counts a clean run as clean",
      rowsRight.every((r) => r.right === r.total));
    const rowsWrong = wjt.study.clusterReport("pos",
      scorable.map((s) => ({ step: s, correct: false })));
    check("study: clusterReport counts a failed run as failed",
      rowsWrong.length === rowsRight.length && rowsWrong.every((r) => r.right === 0));
    check("study: clusterReport drops rows nothing was asked about",
      wjt.study.clusterReport("pos", []).length === 0);
  }

  // --- progress: a resume point and a score, and nothing else ---
  const P = wjt.study.progress;
  // The sandbox has no wjt.safeStorage (that lives in app.js), so the model must
  // degrade to a working, forgetful unit rather than throw. Give it one.
  let mem = {};
  wjt.safeStorage = {
    get: (k) => (k in mem ? mem[k] : null),
    set: (k, v) => { mem[k] = String(v); return true; },
  };

  check("study: progress starts fresh", (() => {
    const r = P.read("pos");
    return r.v === 1 && r.at === "" && Object.keys(r.done).length === 0;
  })());
  check("study: visit() records a resume point without completing anything", (() => {
    P.visit("pos", "nouns");
    const r = P.read("pos");
    return r.at === "nouns" && !r.done.nouns;
  })());
  check("study: complete() marks done and keeps the BEST score, not the latest", (() => {
    P.complete("pos", "nouns", 0.9);
    P.complete("pos", "nouns", 0.4);
    const r = P.read("pos");
    return r.done.nouns === 1 && r.best.nouns === 0.9;
  })());
  check("study: stored record holds NO per-answer data", (() => {
    const raw = JSON.parse(mem[wjt.study.progressKey("pos")]);
    const allowed = ["v", "at", "done", "best", "updatedAt"];
    return Object.keys(raw).every((k) => allowed.indexOf(k) !== -1);
  })());
  check("study: a foreign version is discarded, not guessed at", (() => {
    mem[wjt.study.progressKey("pos")] = JSON.stringify({ v: 99, done: { nouns: 1 } });
    const r = P.read("pos");
    return r.v === 1 && Object.keys(r.done).length === 0;
  })());
  check("study: unparseable progress is discarded, not thrown on", (() => {
    mem[wjt.study.progressKey("pos")] = "{not json";
    const r = P.read("pos");
    return r.v === 1 && r.at === "";
  })());
  check("study: reset() clears everything", (() => {
    P.complete("pos", "nouns", 1);
    P.reset("pos");
    const r = P.read("pos");
    return Object.keys(r.done).length === 0 && Object.keys(r.best).length === 0;
  })());
  check("study: nextStop() skips done and todo stops", (() => {
    P.reset("pos");
    const first = wjt.study.nextStop("pos", P.read("pos"));
    P.complete("pos", "orientation", 1);
    const second = wjt.study.nextStop("pos", P.read("pos"));
    return first.id === "orientation" && second.id === "nouns";
  })());
  check("study: the model survives storage being refused outright", (() => {
    const saved = wjt.safeStorage;
    wjt.safeStorage = { get: () => null, set: () => false };
    let threw = false;
    try {
      P.complete("pos", "nouns", 1);
      P.visit("pos", "nouns");
      P.read("pos");
      P.reset("pos");
    } catch (e) { threw = true; }
    wjt.safeStorage = saved;
    return !threw;
  })());
  P.reset("pos");

  check("study: clusters group the stops in path order", (() => {
    const cl = wjt.study.clusters("pos");
    const flat = [];
    cl.forEach((c) => c.stops.forEach((s) => flat.push(s.id)));
    return cl.length === 6 && flat.join(",") === stops.map((s) => s.id).join(",");
  })());
}

// --- write the sample JSON file for the samples/ folder ---
fs.mkdirSync(path.join(root, "samples"), { recursive: true });
fs.writeFileSync(
  path.join(root, "samples", "sample-lesson.json"),
  JSON.stringify(exported, null, 2) + "\n"
);
console.log("\nWrote samples/sample-lesson.json");

// --- validate every built-in example + emit its JSON ---
console.log("\n-- examples --");
wjt.EXAMPLES.forEach((ex) => {
  let warned = false;
  const w = console.warn;
  console.warn = (...a) => { warned = true; w(...a); };
  const lesson = ex.build();
  console.warn = w;
  check("example " + ex.id + ": no unmatched annotation text", !warned);
  check("example " + ex.id + ": has sentences", lesson.sentences.length > 0);

  let allOnBoundaries = true;
  let total = 0;
  let typesOk = true;
  lesson.sentences.forEach((s) => {
    const tokens = wjt.tokenize(s.text);
    s.annotations.forEach((a) => {
      total++;
      const r = wjt.spanToTokens(tokens, a.start, a.end);
      if (!r) { allOnBoundaries = false; return; }
      const sp = wjt.tokensToSpan(tokens, r.first, r.last);
      if (sp.start !== a.start || sp.end !== a.end || !wjt.LABELS[a.label]) allOnBoundaries = false;
    });
    if (s.types) Object.keys(s.types).forEach((cat) => {
      if (!wjt.isSentenceType(cat, s.types[cat])) typesOk = false;
    });
  });
  check("example " + ex.id + ": all " + total + " annotations valid & on boundaries", allOnBoundaries);
  check("example " + ex.id + ": sentence types valid", typesOk);

  const rt = wjt.importLesson(wjt.exportLesson(lesson));
  check("example " + ex.id + ": round-trips with no warnings", rt.warnings.length === 0);

  const comp = checkLesson(lesson, wjt);
  comp.notes.forEach((n) => console.log("  note: " + n));
  check("example " + ex.id + ": complete at every layer (POS on every word, subject+predicate per clause)", comp.errors.length === 0);
  comp.errors.forEach((e) => console.log("       · " + e));

  fs.writeFileSync(
    path.join(root, "samples", ex.id + ".sentence-forge.json"),
    JSON.stringify(wjt.exportLesson(lesson), null, 2) + "\n"
  );
  console.log("  wrote samples/" + ex.id + ".sentence-forge.json");
});

console.log(failures ? "\n" + failures + " FAILURE(S)" : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
