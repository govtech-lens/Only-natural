// Translations: the extension speaks the language of the browser.
// One file per language in the "lang" folder (lang/en.js, lang/de.js ...). English is the base:
// anything missing in another language falls back to English.
//
// In a language file:
//   ui     - the short texts of the popup, the status badge and the card ("{n}" etc. are filled in)
//   fibre  - id: [name, about, tip]
//   cert   - id: [plain, means, name, short]     (name and short only when they differ from English)

const SFF_I18N = {};

// The language to use: the browser's interface language, e.g. "de-DE" -> "de".
let sffLangCache = null;
function sffLang() {
  if (sffLangCache) return sffLangCache;
  let raw = "en";
  try { raw = (chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || navigator.language || "en"; }
  catch (e) { raw = (typeof navigator !== "undefined" && navigator.language) || "en"; }
  raw = String(raw).toLowerCase().replace("_", "-");
  const base = raw.split("-")[0];
  sffLangCache = SFF_I18N[raw] ? raw : SFF_I18N[base] ? base : "en";
  return sffLangCache;
}
function sffSetLang(l) { sffLangCache = SFF_I18N[l] ? l : "en"; }   // for tests

function sffFill(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
}

// a short interface text
function sffT(key, vars) {
  const text = (SFF_I18N[sffLang()].ui || {})[key] ?? SFF_I18N.en.ui[key] ?? key;
  return sffFill(text, vars);
}

// texts about one fibre or certification: part = "name" | "about" | "tip" (fibre) or "plain" | "means" | "name" | "short" (cert)
const SFF_FIBRE_PARTS = ["name", "about", "tip"];
const SFF_CERT_PARTS = ["plain", "means", "name", "short"];
function sffTextOf(kind, id, part, fallback) {
  const parts = kind === "fibre" ? SFF_FIBRE_PARTS : SFF_CERT_PARTS;
  const i = parts.indexOf(part);
  const mine = ((SFF_I18N[sffLang()][kind] || {})[id] || [])[i];
  if (mine) return mine;
  const en = ((SFF_I18N.en[kind] || {})[id] || [])[i];
  return en || fallback || "";
}

if (typeof module !== "undefined") module.exports = { SFF_I18N, sffT, sffTextOf, sffSetLang, sffLang };
