// Run with:  node test-i18n.js   (checks that every language is complete and picked correctly)
const fs = require("fs");
const path = require("path");
const { SFF_I18N, sffT, sffTextOf, sffSetLang } = require("./i18n.js");
const K = require("./knowledge.js");

const files = fs.readdirSync(path.join(__dirname, "lang")).filter((f) => f.endsWith(".js")).sort();
files.forEach((f) => require("./lang/" + f));
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const popup = fs.readFileSync("popup.html", "utf8");

let fail = 0;
const bad = (msg) => { fail++; console.log("FAIL " + msg); };
const slots = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const en = SFF_I18N.en;
const langs = Object.keys(SFF_I18N);
console.log("languages:", langs.join(" "));

// every language file is loaded by the extension and by the popup
langs.forEach((l) => {
  if (!manifest.content_scripts[0].js.includes("lang/" + l + ".js")) bad(l + ": missing in manifest.json");
  if (!popup.includes("lang/" + l + ".js")) bad(l + ": missing in popup.html");
});

langs.forEach((l) => {
  const L = SFF_I18N[l];
  // short texts: every key, with the same {placeholders} as English
  Object.keys(en.ui).forEach((k) => {
    if (!L.ui || !L.ui[k]) return bad(l + ": ui." + k + " missing");
    if (slots(L.ui[k]) !== slots(en.ui[k])) bad(l + ": ui." + k + " placeholders differ: " + L.ui[k]);
  });
  Object.keys(L.ui || {}).forEach((k) => { if (!(k in en.ui)) bad(l + ": ui." + k + " is not an English key"); });
  // fibres: name + about always, a tip wherever English has one
  Object.keys(K.fibres).forEach((id) => {
    const a = (L.fibre || {})[id], e = en.fibre[id];
    if (!a || !a[0] || !a[1]) return bad(l + ": fibre." + id + " name/about missing");
    if (e[2] && !a[2]) bad(l + ": fibre." + id + " tip missing");
    if (!e[2] && a[2]) bad(l + ": fibre." + id + " has a tip but English has none");
  });
  // certifications: plain + means always
  K.certs.forEach((c) => {
    const a = (L.cert || {})[c.id];
    if (!a || !a[0] || !a[1]) bad(l + ": cert." + c.id + " plain/means missing");
    else {
      if (a[0].length > 60) bad(l + ": cert." + c.id + " plain is too long for a quick read (" + a[0].length + ")");
      if (a[1].length > 170) bad(l + ": cert." + c.id + " means is too long (" + a[1].length + ")");
    }
  });
});

// the language follows the browser
[["de-DE", "de"], ["de", "de"], ["pt-BR", "pt"], ["pt-PT", "pt"], ["zh-TW", "zh"], ["zh-CN", "zh"], ["ko-KR", "ko"], ["ja", "ja"], ["nl-BE", "nl"], ["en-GB", "en"], ["sv-SE", "en"], ["", "en"]].forEach(([raw, want]) => {
  delete require.cache[require.resolve("./i18n.js")];
  Object.defineProperty(globalThis, "navigator", { value: { language: raw || "en" }, configurable: true, writable: true });
  const mod = require("./i18n.js");
  Object.keys(SFF_I18N).forEach((l) => { mod.SFF_I18N[l] = SFF_I18N[l]; });
  const got = mod.sffLang();
  if (got !== want) bad("language for '" + raw + "': got " + got + ", wanted " + want);
});

// the texts really switch, and fall back to English where something is missing
sffSetLang("de");
if (sffT("more") !== "Mehr Details ▾") bad("German 'more' is " + sffT("more"));
if (sffT("done", { ok: 3, total: 36 }) !== "3 von 36 sind nachhaltig") bad("German 'done': " + sffT("done", { ok: 3, total: 36 }));
if (sffTextOf("cert", "rws", "plain") !== "Wohl der Schafe geprüft") bad("German rws plain");
if (sffTextOf("cert", "rws", "name") !== "RWS") bad("name falls back to English acronym: " + sffTextOf("cert", "rws", "name"));
sffSetLang("xx");
if (sffT("more") !== "More details ▾") bad("unknown language should give English");

console.log(fail ? fail + " problem(s)" : "all languages complete and consistent (" + langs.length + " languages)");
process.exit(fail ? 1 : 0);
