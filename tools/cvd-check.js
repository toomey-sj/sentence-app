/* Color-vision-deficiency screen for Sentence Forge's grammar palette.
 *
 * Simulates every grammar color under protanopia / deuteranopia / tritanopia
 * (Machado et al. 2009 severity-1.0 matrices, applied in linear RGB) and compares
 * pairs with CIEDE2000. Colors are read LIVE from js/labels.js, so this stays
 * honest as the palette changes — nothing is hardcoded.
 *
 *   node tools/cvd-check.js          report: pairs distinct in normal vision but
 *                                    collapsing under some CVD, per layer + axis.
 *   node tools/cvd-check.js --check  CI gate: exits non-zero ONLY if two labels in
 *                                    the same layer share an abbreviation (case-
 *                                    insensitive) AND their colors collapse under
 *                                    a CVD (min ΔE < CONCERN). Empty today.
 *
 * Background + tables: docs/reference/color-blind-proposal.md.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// --- load js/labels.js in a bare sandbox (same approach as smoke-test.js) ---
const root = path.join(__dirname, "..");
const sandbox = { window: {}, console, Object, Array, String, JSON, Math };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "labels.js"), "utf8"), sandbox, {
  filename: "labels.js",
});
const wjt = sandbox.wjt;

// --- CVD simulation + CIEDE2000 (ported verbatim from the proposal's cvd.js) ---
function hexToRgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function srgbToLinear(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function linearToSrgb(c){c=c<=0.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-0.055;return Math.min(255,Math.max(0,Math.round(c*255)));}

const M = {
  normal:[[1,0,0],[0,1,0],[0,0,1]],
  protan:[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
  deutan:[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
  tritan:[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]],
};
function simulate(hex,type){
  const [r,g,b]=hexToRgb(hex).map(srgbToLinear);
  const m=M[type];
  const out=[m[0][0]*r+m[0][1]*g+m[0][2]*b, m[1][0]*r+m[1][1]*g+m[1][2]*b, m[2][0]*r+m[2][1]*g+m[2][2]*b];
  return out.map(v=>linearToSrgb(Math.min(1,Math.max(0,v))));
}
// sRGB -> Lab (D65)
function rgbToLab(rgb){
  let [r,g,b]=rgb.map(srgbToLinear);
  let x=r*0.4124+g*0.3576+b*0.1805, y=r*0.2126+g*0.7152+b*0.0722, z=r*0.0193+g*0.1192+b*0.9505;
  x/=0.95047; z/=1.08883;
  const f=t=>t>0.008856?Math.cbrt(t):(7.787*t+16/116);
  const fx=f(x),fy=f(y),fz=f(z);
  return [116*fy-16,500*(fx-fy),200*(fy-fz)];
}
function deltaE2000(l1,l2){
  const [L1,a1,b1]=l1,[L2,a2,b2]=l2;
  const avgLp=(L1+L2)/2;
  const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),avgC=(C1+C2)/2;
  const G=0.5*(1-Math.sqrt(Math.pow(avgC,7)/(Math.pow(avgC,7)+Math.pow(25,7))));
  const a1p=a1*(1+G),a2p=a2*(1+G);
  const C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2),avgCp=(C1p+C2p)/2;
  const h=(a,b)=>{let hp=Math.atan2(b,a)*180/Math.PI;return hp<0?hp+360:hp;};
  const h1p=h(a1p,b1),h2p=h(a2p,b2);
  let dhp; if(C1p*C2p===0)dhp=0; else{dhp=h2p-h1p; if(dhp>180)dhp-=360; else if(dhp<-180)dhp+=360;}
  const dLp=L2-L1,dCp=C2p-C1p,dHp=2*Math.sqrt(C1p*C2p)*Math.sin(dhp*Math.PI/360);
  let avgHp; if(C1p*C2p===0)avgHp=h1p+h2p; else{if(Math.abs(h1p-h2p)>180)avgHp=(h1p+h2p+360)/2; else avgHp=(h1p+h2p)/2;}
  const T=1-0.17*Math.cos((avgHp-30)*Math.PI/180)+0.24*Math.cos((2*avgHp)*Math.PI/180)+0.32*Math.cos((3*avgHp+6)*Math.PI/180)-0.20*Math.cos((4*avgHp-63)*Math.PI/180);
  const dTheta=30*Math.exp(-Math.pow((avgHp-275)/25,2));
  const Rc=2*Math.sqrt(Math.pow(avgCp,7)/(Math.pow(avgCp,7)+Math.pow(25,7)));
  const Sl=1+(0.015*Math.pow(avgLp-50,2))/Math.sqrt(20+Math.pow(avgLp-50,2));
  const Sc=1+0.045*avgCp,Sh=1+0.015*avgCp*T;
  const Rt=-Math.sin(2*dTheta*Math.PI/180)*Rc;
  return Math.sqrt(Math.pow(dLp/Sl,2)+Math.pow(dCp/Sc,2)+Math.pow(dHp/Sh,2)+Rt*(dCp/Sc)*(dHp/Sh));
}
function dE(hex1,hex2,type){return deltaE2000(rgbToLab(simulate(hex1,type)),rgbToLab(simulate(hex2,type)));}

// A pair is a CONCERN if distinct in normal vision (>DISTINCT) but collapses
// under a CVD (<CONCERN). Same thresholds as the proposal run.
const CONCERN=12, DISTINCT=18;
const CVD=["protan","deutan","tritan"];
const CVD_LABEL={normal:"Normal",protan:"Protanopia",deutan:"Deuteranopia",tritan:"Tritanopia"};

// --- build the color sets from LIVE labels.js -----------------------------

// Each layer, as an ordered list of {name, color} deduped by color. Iterating in
// definition order means a base label (defined before its inheriting subtypes)
// names each color, so this reproduces the proposal's per-layer bases.
function layerSets() {
  const sets = [];
  wjt.LAYER_ORDER.forEach((layerId) => {
    const seen = {};
    const arr = [];
    Object.keys(wjt.LABELS).forEach((id) => {
      const l = wjt.LABELS[id];
      if (l.layer !== layerId || seen[l.color]) return;
      seen[l.color] = true;
      arr.push([l.name, l.color]);
    });
    if (arr.length > 1) sets.push(["Layer: " + wjt.LAYERS[layerId].name, arr]);
  });
  return sets;
}

// Each sentence-type axis, as {name, color} for its options.
function typeSets() {
  return wjt.SENTENCE_TYPE_ORDER.map((axis) => {
    const cat = wjt.SENTENCE_TYPES[axis];
    const arr = Object.keys(cat.options).map((oid) => [cat.options[oid].name, cat.options[oid].color]);
    return ["Sentence type: " + cat.name, arr];
  }).filter(([, arr]) => arr.length > 1);
}

function concernsIn(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    const a = arr[i], b = arr[j];
    const d = { normal: dE(a[1], b[1], "normal") };
    CVD.forEach((t) => { d[t] = dE(a[1], b[1], t); });
    const minCVD = Math.min(d.protan, d.deutan, d.tritan);
    if (d.normal > DISTINCT && minCVD < CONCERN) {
      const worst = CVD.reduce((w, t) => (d[t] < d[w] ? t : w), "protan");
      out.push({ a: a[0], b: b[0], d, worst, minCVD });
    }
  }
  out.sort((x, y) => x.minCVD - y.minCVD);
  return out;
}

// --- report mode ----------------------------------------------------------
function report() {
  const sets = layerSets().concat(typeSets());
  sets.forEach(([title, arr]) => {
    console.log("\n=== " + title + " ===");
    const concerns = concernsIn(arr);
    if (!concerns.length) {
      console.log("  no within-set collisions (all pairs stay distinguishable).");
      return;
    }
    concerns.forEach((c) => {
      console.log("  " + c.a + "  vs  " + c.b);
      console.log("     normal " + c.d.normal.toFixed(1) + " | protan " + c.d.protan.toFixed(1) +
        " | deutan " + c.d.deutan.toFixed(1) + " | tritan " + c.d.tritan.toFixed(1) +
        "  -> worst: " + CVD_LABEL[c.worst]);
    });
  });
  console.log("\n(ΔE2000. >18 distinct; <12 hard to tell apart at a glance for small/adjacent samples; JND~2.3)");
}

// --- check mode: the item-1 invariant -------------------------------------
// Fail if two labels in the SAME layer share an abbreviation (case-insensitive)
// and their colors collapse under some CVD (min ΔE < CONCERN). Those two would be
// told apart by color alone for a CVD viewer, and by nothing at all in the abbr.
function check() {
  const offenders = [];
  wjt.LAYER_ORDER.forEach((layerId) => {
    const ids = Object.keys(wjt.LABELS).filter((id) => wjt.LABELS[id].layer === layerId);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = wjt.LABELS[ids[i]], b = wjt.LABELS[ids[j]];
      if (!a.abbr || !b.abbr) continue;
      if (a.abbr.toLowerCase() !== b.abbr.toLowerCase()) continue;
      const minCVD = Math.min(dE(a.color, b.color, "protan"), dE(a.color, b.color, "deutan"), dE(a.color, b.color, "tritan"));
      if (minCVD < CONCERN) {
        offenders.push({ layer: wjt.LAYERS[layerId].name, abbr: a.abbr, a: a.name, b: b.name, minCVD });
      }
    }
  });
  if (!offenders.length) {
    console.log("cvd-check: OK — no same-abbreviation label pair collapses under CVD.");
    return 0;
  }
  console.error("cvd-check: FAIL — same-abbreviation pairs whose colors collapse under CVD:");
  offenders.forEach((o) => {
    console.error("  [" + o.layer + "] \"" + o.a + "\" and \"" + o.b + "\" both abbreviate \"" +
      o.abbr + "\"; min CVD ΔE = " + o.minCVD.toFixed(1) + " (< " + CONCERN + ").");
  });
  console.error("Fix: lengthen one abbreviation so the two are told apart by text, not color.");
  return 1;
}

if (process.argv.indexOf("--check") !== -1) {
  process.exit(check());
} else {
  report();
}
