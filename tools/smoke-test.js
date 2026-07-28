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

const LOGIC_FILES = ["labels.js", "tokenize.js", "store.js", "examples.js",
  "assignment-model.js", "assignment-codec.js"];
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

// --- the new modules stay DOM-free and storage-free ---
["assignment-model.js", "assignment-codec.js"].forEach((f) => {
  const src = fs.readFileSync(path.join(root, "js", f), "utf8");
  check(f + ": touches no DOM, storage, or network",
    !/\bdocument\b|localStorage|sessionStorage|\bfetch\s*\(|XMLHttpRequest|navigator/.test(src));
});

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
