// Decides whether a product page's text describes a "sustainable" garment.
// Rule: every fibre listed must be natural (or natural-origin like lyocell).
// Any plastic-based fibre (polyester, nylon, acrylic, elastane...) = not OK.
// To change what counts as OK, edit the two word lists below.

// Bump this whenever the rules below change, so saved results from older rules are thrown away.
const RULES_VERSION = 16;

// Words are written as small patterns; "[oó]" means "o or ó". Many languages are listed.
const NATURAL_FIBRES = [
  // cotton
  "cotton", "baumwolle", "algod[oó]n", "algod[aã]o", "coton", "katoen", "cotone", "bomull", "bomuld", "puuvilla",
  "bawe[lł]na", "bavlna", "pamuk", "хлопок", "хлопковый", "綿", "コットン", "木綿", "면", "코튼", "棉", "纯棉", "棉花", "pamut", "bumbac",
  // linen / hemp / flax
  "linen", "leinen", "lino", "lin", "linho", "vlas", "len", "keten", "лен", "льн\\w*", "麻", "リネン", "亚麻", "亞麻", "린넨", "마", "hanf", "hemp", "hennep",
  "c[aá]ñamo", "chanvre", "canapa", "cânhamo", "konopie", "kenevir", "大麻", "ヘンプ",
  // wool & animal hair
  "wool", "wolle", "schurwolle", "scheerwol", "\\p{L}+wolle", "\\p{L}+wool", "lana", "laine", "wol", "ull", "uld", "villa", "lambswool", "merino", "merinowolle", "merinos", "lã", "wełna", "vlna", "yün", "шерсть", "ウール", "毛", "羊毛", "울", "양모",
  "cashmere", "kaschmir", "cachemire", "kasjmier", "kasjmir", "cachemira", "caxemira", "kaszmir", "kašmír", "kaşmir", "кашемир", "カシミヤ", "カシミア", "캐시미어", "羊绒", "山羊绒", "kasmir",
  "alpaca", "alpaka", "mohair", "angora", "camel", "kamel", "yak", "каракуль", "モヘア", "アルパカ", "骆驼绒", "mohér",
  // silk
  "silk", "seide", "seda", "soie", "zijde", "seta", "silke", "silkki", "jedwab", "hedvábí", "ipek", "шёлк", "шелк", "絹", "シルク", "실크", "真丝", "蚕丝", "桑蚕丝",
  // regenerated / natural-origin cellulose
  "lyocell", "tencel", "modal", "cupro", "viscose", "viskose", "viskoos", "rayon", "viscosa", "wiskoza", "viskóza", "viskon", "вискоза", "レーヨン", "ビスコース", "비스코스", "레이온", "粘胶", "粘纤", "人造丝", "リヨセル", "テンセル", "キュプラ", "モダール", "モダル", "莱赛尔", "天丝", "莫代尔", "铜氨",
  "acetate", "triacetate", "azetat", "triazetat", "ac[eé]tate", "triac[eé]tate", "acetato", "triacetato", "acetaat", "triacetaat", "아세테이트", "트리아세테이트", "アセテート", "トリアセテート", "醋酸纤维", "醋酯纤维", "醋酸纖維", "三醋酸纤维",
  // other plant fibres
  "ramie", "jute", "kapok", "bamboo", "bambus", "bambu", "bambou", "竹", "バンブー", "苎麻", "ラミー", "ジュート", "黄麻",
  // leather
  "\\p{L}+leder", "\\p{L}+leather", "rind", "rinds", "rindsleder", "kalb", "kalbs\\p{L}*", "ziegenleder", "lammleder", "nappa", "vachette", "veau", "agneau", "piel", "ternera", "cuoio", "vitello", "vacchetta", "\\p{L}+leer", "leer", "couro", "bezerro", "vaca",
  "leather", "leder", "cuir","cuero", "pelle", "couro", "skóra", "kůže", "deri", "кожа", "suede", "nubuck", "革", "レザー", "本革", "가죽", "真皮", "皮革",
];

const PLASTIC_FIBRES = [
  "polyester", "\\p{L}+polyester", "\\p{L}+polyamid", "\\p{L}+elast\\p{L}*", "\\p{L}+acryl\\p{L}*", "poliester", "poli[eé]ster\\p{L}*", "poliammid\\p{L}*", "poliacril\\p{L}*", "elastan\\p{L}*", "elastomer\\p{L}*", "полиэстер", "ポリエステル", "폴리에스터", "폴리에스테르", "涤纶", "聚酯纤维", "聚酯", "涤", "poliéster",
  "polyamide", "polyamid", "poliamida", "poliammide", "poliamid", "полиамид", "ポリアミド", "폴리아미드", "聚酰胺", "锦纶", "尼龙",
  "nylon", "nailon", "naylon", "найлон", "ナイロン", "나일론",
  "acrylic", "acryl", "acrilico", "acr[iy]lique", "acr[ií]lico", "akryl", "akrylová", "akrilik", "акрил", "アクリル", "아크릴", "腈纶", "亚克力",
  "elastane", "elastan", "elasthan", "elastano", "[eé]lasthanne", "[eé]lastane", "elastam", "elastaan", "elast[aá]n", "elastodieno", "эластан", "エラスタン", "엘라스탄", "弹性纤维",
  "spandex", "lycra", "スパンデックス", "스판덱스", "氨纶", "ライクラ",
  "polyurethane", "polyurethan", "polyuretan", "polyur[eé]thane", "poliuretano", "poliuretan", "полиуретан", "ポリウレタン", "폴리우레탄", "聚氨酯", "uretano",
  "polypropylene", "polypropylen", "polyolefin", "polipropileno", "ポリプロピレン", "聚丙烯",
  "pvc", "vinyl", "polyvinyl", "vinil", "ビニール", "ビニル", "塑料",
  "metallic", "metallised", "metalized", "lurex", "metallisiert\\w*", "metallis[eé]\\w*", "metalizado", "metallizzat\\w*", "metaal\\w*", "gemetalliseerd", "metalli[sz]\\w*", "metalik", "металл\\w*", "メタリック", "金属",
  "synthetic", "synthetik", "synthétique", "sintetic\\w*", "sintético", "sintetico", "syntetisk", "synteettinen", "syntetyczn\\w*", "合成繊維", "合成纤维",
  "elastomultiester", "elastodiene", "microfib\\w*", "fleece", "polar", "フリース", "pu", "pes", "pa", "pan", "pp",
];

// Words that label a part of the garment rather than name a material,
// e.g. "Lining: 100% cotton" or "Futter: Polyester 100%".
const LABEL_WORDS = [
  "shell", "lining", "futter", "outer", "obermaterial", "exterior", "body", "main", "trim",
  "fabric", "material", "materials", "composition", "coating", "coated", "beschichtung",
  "filling", "padding", "pocket", "pockets", "contrast", "rib", "sleeve", "sleeves", "back", "front",
  "top", "bottom", "upper", "sole", "insole", "doublure", "rivestimento", "forro", "revestimiento", "fodera",
  "tessuto", "stoff", "content", "total", "weight", "least", "mindestens", "minimum",
  "and", "und", "of", "from", "aus", "de", "in", "is", "are", "was", "were", "only", "about", "around", "approx",
  "approximately", "just", "than", "over", "under", "up", "to", "at", "by", "ist", "nur", "etwa", "ca", "es", "est", "e", "o",
  "main", "face", "outside", "inside", "interior", "interno", "esterno", "externe", "interne", "ext", "int", "rembourrage",
  "fourrure", "garniture", "doublé", "tissu", "tejido", "tela", "forro", "relleno", "tecido", "forro", "obszycie",
  "wypełnienie", "podszewka", "materiał", "skład", "состав", "подкладка", "основной", "外側", "内側", "裏地", "表地", "겉감", "안감", "面料", "里料", "表布", "里布",
  "off", "sale", "discount", "save", "rabatt", "reduziert", "soldes", "sconto", "descuento", "korting", "\\p{L}+stoff", "\\p{L}+futter", "\\p{L}+material", "gewebe", "shoulder", "arm", "collar", "hood", "hem", "cuff", "cuffs", "waistband", "elastic", "lace", "mesh", "embroidery", "decoration", "applique",
];

// Words that can sit between the percentage and the fibre: "60% recycled cashmere".
const QUALIFIERS = [
  "recyc\\w*", "recycl\\w*", "recycelt\\w*", "recicl\\w*", "riciclat\\w*", "recycl[eé]\\w*", "gerecycl\\w*", "reciclad\\w*", "przetworzon\\w*", "переработанн\\w*", "再生", "リサイクル", "재활용", "回收",
  "organic", "organisch\\w*", "biologisch\\w*", "bio", "biologique", "biologico", "ecol[oó]gic\\w*", "orgânic\\w*", "organiczn\\w*", "органическ\\w*", "オーガニック", "유기농", "有机",
  "[oö]kologisch\\w*", "certified", "zertifiziert\\w*", "eco\\w*", "regenerated", "regenerierte\\w*", "regener\\w*",
  "virgin", "responsible", "sustainable", "nachhaltig\\w*", "gcs", "gots", "ocs", "rws", "rcs", "grs", "bci", "fsc", "lenzing", "ecovero", "livaeco",
  "neue", "new", "vergine", "virgen", "vierge", "nuova", "good", "standard", "pure", "reine\\w*", "puro", "pura", "premium", "fine", "superfine", "extra", "italian", "mongolian",
  "naturally", "natural", "natur\\w*",
].join("|");

// Words that introduce a composition list (real headings)
const STRONG_KEYWORDS = [
  "composition", "composici[oó]n", "composizione", "composi[cç][aã]o", "zusammensetzung", "samenstelling",
  "sammensetning", "sammans[aä]ttning", "koostumus", "sk[lł]ad", "slo[zž]en[ií]", "bile[sş]im", "состав",
  "materials?\\s*(?:&|and|und|et|y|e)\\s*care", "fabric\\s*(?:&|and)\\s*care", "material\\s*(?:&|and)\\s*(?:care|pflege)",
  "outer\\s+fabric", "main\\s+fabric", "shell\\s*:", "mati[eè]re", "mat[eé]riau\\w*", "tissu\\s*:",
  "혼용률", "소재", "素材", "組成", "混用率", "成分", "材质", "面料", "原料名", "表地", "겉감",
];
// looser words that also show up in descriptions
const KEYWORDS = STRONG_KEYWORDS.concat([
  "material", "materiaal", "materiale", "materiais?", "fabric", "shell", "outer", "exterior", "content", "tejido", "tessuto",
  "stoff", "obermaterial", "materia\\w*", "tecido", "tkanina", "látka", "kumaş", "ткань", "lining", "futter",
]);

// Where the composition list ends (care instructions, extra info, reviews...).
const END_OF_LIST = new RegExp(
  "review|bewertung|rating|customer|kundenbewertung|avis|opini|recensi|pflege|care guide|care instructions|" +
  "care\\s*:|washing|wash at|machine wash|additional material|weitere material|materials in this|entretien|" +
  "cuidado|lavaggio|lavado|lavagem|istruzioni|origin|herkunft|wassen|tv[aä]tt|pesu|prani|ya[sş]|" +
  "stirare|ironing|bügeln|plancha|repassage|洗濯|洗涤|세탁|洗い方|取扱|手洗|品質表示|产地|产品详情|size\\s*(?:&|and)\\s*fit|shipping|delivery|returns",
  "i"
);

const FIBRE_ANY = NATURAL_FIBRES.concat(PLASTIC_FIBRES);
const WORD = "[\\p{L}\\p{M}\\-]+";

function wordMatches(list, word) {
  // whole word only, so "lining" is not mistaken for "lin" (linen);
  // for compounds like "GCS-Kaschmir" any part may match
  const parts = word.toLowerCase().split("-").filter(Boolean);
  return parts.some((w) => list.some((p) => new RegExp("^(?:" + p + ")$", "iu").test(w)));
}

// Pulls "60% cotton" (before) and "cotton 60%" (after) pairs out of a chunk of text,
// remembering where in the text each one sits.
function extractBoth(text) {
  const before = [], after = [];
  const reBefore = new RegExp(
    "(\\d{1,3}(?:[.,]\\d+)?)\\s*%\\s*(?:(?:" + QUALIFIERS + ")\\s+)*(" + WORD + ")",
    "giu"
  );
  const reAfter = new RegExp("(" + WORD + ")\\s*[:：\\-]?\\s*(\\d{1,3}(?:[.,]\\d+)?)\\s*%", "giud");
  // "95–100%" (a range) and "+70%" (a marketing claim) are not parts of a composition
  const notAPart = (numStart) => /(?:\d\s*(?:[-–—~]|to|bis|à)\s*|[+≥≤<>~]\s*)$/i.test(text.slice(Math.max(0, numStart - 6), numStart));
  let m;
  while ((m = reBefore.exec(text))) {
    if (notAPart(m.index)) continue;
    before.push({ pct: parseFloat(m[1].replace(",", ".")), name: m[2], start: m.index, end: m.index + m[0].length });
  }
  while ((m = reAfter.exec(text))) {
    if (notAPart(m.indices[2][0])) continue;      // where the number itself starts
    after.push({ pct: parseFloat(m[2].replace(",", ".")), name: m[1], start: m.index, end: m.index + m[0].length });
  }
  const hasLetter = (p) => /\p{L}/u.test(p.name);   // "-" or "—" is not a material name
  return { before: before.filter(hasLetter), after: after.filter(hasLetter) };
}

function extractFibres(text) {
  const { before, after } = extractBoth(text);
  return before.concat(after);
}

const isKnown = (p) => wordMatches(FIBRE_ANY, p.name);
const isPlastic = (p) => wordMatches(PLASTIC_FIBRES, p.name);
const isNatural = (p) => wordMatches(NATURAL_FIBRES, p.name);
const isJunkName = (p) => wordMatches(LABEL_WORDS, p.name) || wordMatches(QUALIFIERS.split("|"), p.name);
const near100s = (sum) => sum >= 98.5 && Math.abs(sum - 100 * Math.round(sum / 100)) <= 1.5;

// A material list has a recognisable shape: a run of "N% fibre" entries that adds up to 100%
// (or 200% when it lists shell + lining...). Finds those runs, wherever they are on the page.
// mode "A": the known fibres add up on their own.  mode "B": they only add up when an
// unfamiliar word is counted too (so something in the list is not understood).
function findRuns(pairs) {
  const P = pairs.filter((p) => isKnown(p) || !isJunkName(p)).sort((a, b) => a.start - b.start);
  const GAP = 60, SECTION_GAP = 300;
  const scan = (mode) => {
    const groups = [];
    let i = 0, lastEnd = -1e9;
    while (i < P.length) {
      if (groups.length && P[i].start - lastEnd > SECTION_GAP) break;
      let sumK = 0, sumAll = 0, hit = -1;
      for (let j = i; j < P.length; j++) {
        if (j > i && P[j].start - P[j - 1].end > GAP) break;
        sumAll += P[j].pct;
        if (isKnown(P[j])) sumK += P[j].pct;
        if (mode === "A" ? isKnown(P[i]) && isKnown(P[j]) && near100s(sumK) : near100s(sumAll)) { hit = j; break; }
      }
      if (hit >= 0) {
        groups.push({ pairs: P.slice(i, hit + 1), mode });
        lastEnd = P[hit].end;
        i = hit + 1;
      } else i++;
    }
    return groups;
  };
  let groups = scan("A");
  if (!groups.length) groups = scan("B");
  if (!groups.length) return { groups: [], leftover: [], strays: [], P };
  // known fibres that sit inside the list's area but were not part of any run = an incomplete list
  const first = groups[0].pairs[0].start, last = groups[groups.length - 1].pairs.slice(-1)[0].end;
  let from = first;
  for (let k = P.indexOf(groups[0].pairs[0]) - 1; k >= 0 && P[k + 1].start - P[k].end <= GAP; k--) from = P[k].start;
  const used = new Set(groups.flatMap((g) => g.pairs));
  const inside = (p) => !used.has(p) && p.start >= from && p.start <= last;
  const leftover = P.filter((p) => inside(p) && isKnown(p));
  // an unfamiliar word with a real percentage inside the list: we cannot tell what that part is made of
  const strays = P.filter((p) => inside(p) && !isKnown(p) && p.pct >= 5);
  return { groups, leftover, strays, P };
}

// The group to put on the label: the main fabric, not the lining or the filling.
// Returns { pairs: the main group, liningOnly: only a lining list was found, lining: the lining as a short text (or "") }.
function mainGroup(groups, text) {
  const notMain = /(?:futter|lining|doublure|forro|fodera|voering|innen|inside|inner|padding|filling|f[uü]llung|wattierung|rembourrage|relleno|imbottitura|裏|里料|안감)(?:\s*(?:aus|of|in|de|en|di|van|:|[-–]))?\W{0,12}$/i;
  const isLining = (g) => notMain.test(text.slice(Math.max(0, g.pairs[0].start - 34), g.pairs[0].start));
  const main = groups.find((g) => !isLining(g));
  const lined = groups.find(isLining);
  const liningText = lined ? labelFromPairs(lined.pairs.filter(isKnown)) : "";
  if (main) return { pairs: main.pairs, liningOnly: false, lining: liningText };
  return { pairs: groups[0].pairs, liningOnly: isLining(groups[0]), lining: "" };
}

// Reads one chunk of text: which fibres, and is anything unfamiliar?
// returns { pairs (the fibres that make up the list), unknownNames, grouped }
function readList(text) {
  const { before, after } = extractBoth(text);
  const known = (l) => l.filter(isKnown).length;
  // read in the direction ("60% wool" or "wool 60%") that makes more sense of the text
  const order = known(before) > known(after) ? [before, after] : [after, before];
  for (const pairs of order) {
    const { groups, leftover, strays } = findRuns(pairs);
    if (!groups.length) continue;
    const all = groups.flatMap((g) => g.pairs);
    const fibres = all.filter(isKnown).concat(leftover);
    const unknownNames = all.filter((p) => !isKnown(p)).map((p) => p.name);
    if (leftover.length && !fibres.some(isPlastic)) unknownNames.push("(incomplete list)");
    if (!fibres.some(isPlastic)) strays.forEach((p) => unknownNames.push(p.name));
    // the label shows the main fabric only (not the lining), so shell + lining never add up to "200%"
    const mg = mainGroup(groups, text);
    return { fibres, unknownNames, grouped: true, pairs: mg.pairs.filter(isKnown), liningOnly: mg.liningOnly, lining: mg.lining };
  }
  // nothing in this chunk has the shape of a material list: ignore it and keep looking elsewhere
  // (reading stray percentages such as "50% off" as materials would only produce false alarms)
  return { fibres: [], unknownNames: [], grouped: false, pairs: [] };
}

// For the green label: repeated fibres added up: "60% cashmere + 40% cashmere" -> "100% cashmere".
function labelFromPairs(pairs) {
  const totals = new Map();
  pairs.filter(isNatural).forEach((f) => {
    const part = f.name.toLowerCase().split("-").filter((w) => wordMatches(NATURAL_FIBRES, w))[0] || f.name.toLowerCase();
    totals.set(part, (totals.get(part) || 0) + f.pct);
  });
  return [...totals].map(([n, p]) => Math.round(p * 10) / 10 + "% " + n.charAt(0).toUpperCase() + n.slice(1)).join(", ");
}

// Splits the found "name + percent" pairs into known fibres and
// names we have never heard of (those make us say "not sure").
function splitFibres(pairs) {
  const fibres = [], unknownNames = [];
  pairs.forEach((f) => {
    if (isKnown(f)) fibres.push(f);
    else if (!isJunkName(f) && f.pct > 0) unknownNames.push(f.name);
  });
  return { fibres, unknownNames };
}

function pageToText(html) {
  return html
    .replace(/\\u003c/gi, "<").replace(/\\u003e/gi, ">").replace(/\\u0026/gi, "&").replace(/\\"/g, '"')
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[®™©]/g, "")
    .replace(/％/g, "%")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#37;|&percnt;/g, "%").replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ");
}

// The knowledge file (certifications, fibre notes) is loaded before this one in the browser;
// in tests it is loaded with require.
function knowledge() {
  if (typeof SFF_KNOWLEDGE !== "undefined") return SFF_KNOWLEDGE;
  if (typeof require !== "undefined") { try { return require("./knowledge.js"); } catch (e) { /* none */ } }
  return null;
}

// Certifications mentioned close to the material list (not site-wide banners and footers)
function certsNear(text, at) {
  const k = knowledge();
  if (!k) return [];
  return k.findCerts(text.slice(Math.max(0, at - 1200), at + 3000));
}

// "Wool" -> key of the fibre notes ("wool"), for the info card
function fibreKeysOf(pairs) {
  const k = knowledge();
  if (!k) return [];
  const keys = [];
  pairs.filter(isNatural).forEach((p) => {
    p.name.toLowerCase().split("-").forEach((part) => {
      const key = k.fibreKey(part);
      if (key && !keys.includes(key)) keys.push(key);
    });
  });
  return keys;
}

// at = where in the page text the material list was found (used to look for certifications near it)
function verdictFor(list, strong, text, at) {
  const { fibres, unknownNames, pairs } = list;
  const plastics = fibres.filter((f) => f.pct > 0 && isPlastic(f));
  if (plastics.length) {
    const p = plastics[0];
    return { verdict: "bad", fibres, reason: p.pct + "% " + p.name, strong };
  }
  if (unknownNames.length) return { verdict: "unknown", fibres, reason: "Unrecognised material: " + unknownNames[0], strong };
  if (!fibres.filter(isNatural).length) return { verdict: "unknown", fibres, reason: "Materials not recognised", strong };
  return {
    verdict: "ok", fibres, reason: labelFromPairs(pairs), strong,
    certs: text ? certsNear(text, at) : [],
    fibreKeys: fibreKeysOf(pairs),         // the main fabric only, so the card's notes are about it and not the lining
    liningOnly: !!list.liningOnly,         // the only list found was the lining's (e.g. a shoe whose upper is "aus Lammleder")
    lining: list.lining || "",             // the lining as a short text, for the card
  };
}

// Returns { verdict: "ok" | "bad" | "unknown", fibres: [...], reason, strong }
// ---- material lists written in words, with no percentages ----
// e.g. "Vorderblatt aus Kalb; Futter aus Lammleder, Ziegenleder; Sohle aus Leder und Gummi" (shoes, bags).
// Every part is read: plastic in the outside or the lining = not OK, an unfamiliar word = unknown, otherwise OK.
// The sole is judged separately (soleCheck), "other materials" is ignored.
const PART_LABELS = [
  ["lining", "futter|lining|doublure|forro|fodera|voering|안감|裏地|里料"],
  ["sole", "\\p{L}*sohle|\\p{L}*sole|semelle|suela|suola|sola|zool|밑창|靴底|鞋底"],
  ["outer", "vorderblatt|obermaterial|au[sß]+enmaterial|oberstoff|schaft|upper|outer\\s+material|empeigne|tomaia|bovenwerk|bovenmateriaal|cabedal|겉감|表地|鞋面|アッパー"],
].map(([kind, words]) => [kind, new RegExp("(?<![\\p{L}])(?:" + words + ")(?![\\p{L}])\\s*(?:aus|of|in|de|di|van|:|-|–)?\\s*(?:aus|of|in)?\\s*(.*)$", "iu")]);
const NOT_A_MATERIAL = /andere|other|sonstige|autres|otros|altri|overige|outros|detail|weitere|mit\b|with|avec|con\b|met\b/i;
const capital = (w) => w.charAt(0).toUpperCase() + w.slice(1);

function partsRead(text) {
  const kw = new RegExp("(?:" + STRONG_KEYWORDS.join("|") + ")", "giu");
  let m, tries = 0;
  while ((m = kw.exec(text)) && tries++ < 8) {
    let win = text.slice(m.index + m[0].length, m.index + m[0].length + 500);
    const cut = Math.min(...[win.search(/[.。]\s/), win.search(END_OF_LIST)].filter((i) => i >= 0), win.length);
    win = win.slice(0, cut);
    const outer = [], lining = [], plastic = [], unknown = [];
    let outerParts = 0;
    for (const part of win.split(/[;；]/)) {
      let kind = "other", rest = part, at = 1e9;
      for (const [k, re] of PART_LABELS) { const mm = re.exec(part); if (mm && mm.index < at) { kind = k; rest = mm[1]; at = mm.index; } }
      if (kind === "outer") outerParts++;
      for (const piece of rest.split(/[,/&]|\s(?:und|and|et|y|e|en|sowie|oder)\s/i).map((s) => s.trim()).filter(Boolean)) {
        const words = piece.toLowerCase().split(/[^\p{L}\p{M}-]+/u).filter(Boolean);
        if (!words.length) continue;
        const plasticWord = words.find((w) => wordMatches(PLASTIC_FIBRES, w));
        if (plasticWord && kind !== "sole") { plastic.push(plasticWord); continue; }
        const naturalWord = words.find((w) => wordMatches(NATURAL_FIBRES, w));
        if (kind === "sole") continue;
        if (naturalWord) { if (kind === "outer") outer.push(naturalWord); else if (kind === "lining") lining.push(naturalWord); continue; }
        if (kind !== "other" && !NOT_A_MATERIAL.test(piece)) unknown.push(piece);
      }
    }
    if (!outerParts) continue;
    if (plastic.length) return { verdict: "bad", fibres: [], reason: plastic[0], strong: true };
    if (unknown.length) return { verdict: "unknown", fibres: [], reason: "Unrecognised material: " + unknown[0], strong: true };
    if (!outer.length) continue;
    const uniq = (l) => [...new Set(l)];
    const k = knowledge();
    const keys = [];
    uniq(outer).forEach((w) => { const key = k && k.fibreKey(w); if (key && !keys.includes(key)) keys.push(key); });
    return {
      verdict: "ok", fibres: [], strong: true,
      reason: uniq(outer).slice(0, 2).map(capital).join(", "),
      lining: uniq(lining).map(capital).join(", "),
      fibreKeys: keys, certs: certsNear(text, m.index),
    };
  }
  return null;
}

// Does the downloaded page already contain a material list (in words we may not understand)?
// If so, building the page in a hidden frame would only show the same text again.
function materialsPresent(html) {
  const text = pageToText(html);
  const kw = new RegExp("(?:" + STRONG_KEYWORDS.join("|") + ")", "giu");
  let m, n = 0;
  while ((m = kw.exec(text)) && n++ < 10) {
    if (text.slice(m.index, m.index + 400).toLowerCase().split(/[^\p{L}\p{M}-]+/u).some((w) => w && wordMatches(FIBRE_ANY, w))) return true;
  }
  return false;
}

function classifyText(text) {
  // a "weak" reading = real fibres were found but something in the list was not understood.
  // It is kept in case nothing better turns up, but a clean list found later wins.
  let weak = null;
  // 1) look near real "Composition" headings, then looser words like "material"
  for (const words of [STRONG_KEYWORDS, KEYWORDS]) {
    const strong = words === STRONG_KEYWORDS;
    const kw = new RegExp("(?:" + words.join("|") + ")", "giu");
    let m;
    while ((m = kw.exec(text))) {
      // look at the text just after the keyword (and a little before it),
      // but stop where the care instructions / extra info begin
      const start = Math.max(0, m.index - 60);
      const keywordEnd = m.index - start + m[0].length;
      let window = text.slice(start, m.index + 1000);
      const cut = window.slice(keywordEnd).search(END_OF_LIST);
      if (cut >= 0) window = window.slice(0, keywordEnd + cut);
      const list = readList(window);
      if (!list.fibres.length) continue;                 // no known fibre here: just stray text
      const v = verdictFor(list, strong, text, start);
      if (v.verdict === "unknown") { weak = weak || v; continue; }
      return v;
    }
  }
  if (weak) return weak;
  // 2) no heading found: look for a list-shaped run of percentages anywhere on the page
  const { before, after } = extractBoth(text);
  const known = (l) => l.filter(isKnown).length;
  for (const pairs of known(before) > known(after) ? [before, after] : [after, before]) {
    const { groups, leftover, strays } = findRuns(pairs);
    if (!groups.length) continue;
    const all = groups.flatMap((g) => g.pairs);
    const fibres = all.filter(isKnown).concat(leftover);
    const unknownNames = all.filter((p) => !isKnown(p)).map((p) => p.name);
    if (leftover.length && !fibres.some(isPlastic)) unknownNames.push("(incomplete list)");
    if (!fibres.some(isPlastic)) strays.forEach((p) => unknownNames.push(p.name));
    const mg = mainGroup(groups, text);
    return verdictFor({ fibres, unknownNames, pairs: mg.pairs.filter(isKnown), liningOnly: mg.liningOnly, lining: mg.lining }, false, text, groups[0].pairs[0].start);
  }
  const byWords = partsRead(text);
  if (byWords) return byWords;
  return { verdict: "unknown", fibres: [], reason: "No material list found", strong: false };
}

// ---- soles (shoes) ----
// A sole is judged on its own words, not percentages. Clearly plastic (PU, TPU, EVA, PVC, "synthetic"...) = not OK, like a lining.
// Clearly natural (leather, cork, jute, natural rubber...) = OK. Just "rubber" cannot be told apart, so it passes with a note.
const SOLE_WORD = new RegExp(
  "(?<![\\p{L}])(?:\\p{L}*sohlen?|outsoles?|insoles?|soles?|semelles?|suelas?|suole?|solas?|\\p{L}*zolen?|zool|sulas?|podeszw\\p{L}*|taban\\p{L}*|подошв\\p{L}*)(?![\\p{L}])|靴底|鞋底|外底|밑창|아웃솔|インソール|ソール",
  "giu"
);
const SOLE_PLASTIC_EXTRA = ["eva", "tpu", "tpr", "tr", "pvc", "kunststoff\\p{L}*", "plastic\\p{L}*", "plastik\\p{L}*", "thermoplast\\p{L}*", "polymer\\p{L}*", "synthese\\p{L}*", "plastique", "pl[aá]stico", "plastica", "합성", "合成", "塑料", "ポリウレタン"];
const SOLE_NATURAL_EXTRA = ["kork", "cork", "li[eè]ge", "corcho", "sughero", "kurk", "cortiça", "cortica", "holz", "wood", "bois", "madera", "legno", "hout", "latex", "látex", "naturkautschuk", "naturgummi", "natuurrubber", "natural\\s+rubber", "caoutchouc\\s+naturel", "caucho\\s+natural", "gomma\\s+naturale", "borracha\\s+natural", "코르크", "天然", "コルク", "软木"];
const SOLE_RUBBER = new RegExp("(?<![\\p{L}])(?:\\p{L}*gummi\\p{L}*|rubber\\p{L}*|kautschuk\\p{L}*|caoutchouc|caucho|gomma|borracha|guma|kau[cç]uk|резин\\p{L}*)(?![\\p{L}])|ゴム|고무|橡胶|橡皮", "iu");

function soleKindOf(context) {
  const words = context.toLowerCase().split(/[^\p{L}\p{M}\-]+/u).filter(Boolean);
  const anyWord = (list) => words.some((w) => w.split("-").some((part) => list.some((p) => new RegExp("^(?:" + p + ")$", "iu").test(part))));
  if (anyWord(PLASTIC_FIBRES.filter((p) => p !== "pa" && p !== "pan" && p !== "pp" && p !== "pes").concat(SOLE_PLASTIC_EXTRA)) || /synth/i.test(context)) return "plastic";
  if (anyWord(NATURAL_FIBRES.concat(SOLE_NATURAL_EXTRA)) || /natural\s+rubber|caoutchouc\s+naturel|caucho\s+natural|gomma\s+naturale|borracha\s+natural/i.test(context)) return "natural";
  if (SOLE_RUBBER.test(context)) return "rubber";
  return "";
}

// Looks at what the page says about the sole(s): { kind: "plastic" | "rubber" | "natural" | "", word }
function soleCheck(text) {
  let worst = "", word = "", m, n = 0;
  SOLE_WORD.lastIndex = 0;
  while ((m = SOLE_WORD.exec(text)) && n++ < 12) {
    const before = text.slice(Math.max(0, m.index - 22), m.index).split(/[;.,|()\n:]/).pop();
    let after = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const cut = after.slice(1).search(/\b(?:with|mit|and|und|et|con|avec|met|e)\b|[;.,|()\n]/i);
    if (cut >= 0) after = after.slice(0, cut + 1);
    const kind = soleKindOf(before.split(/\s+/).slice(-2).join(" ") + " " + m[0] + " " + after);
    if (kind === "plastic") return { kind, word: (before.split(/\s+/).slice(-1)[0] + " " + m[0]).trim() };
    if (kind === "rubber" && worst !== "rubber") { worst = "rubber"; word = m[0]; }
    else if (kind === "natural" && !worst) { worst = "natural"; word = m[0]; }
  }
  return { kind: worst, word };
}

// the sole can only turn a good shoe into a bad one, or add a note; it never makes anything good
// "Vorderblatt aus Lammleder" / "Upper: calf leather" - the outer material written as words, without a percentage
const OUTER_WORD = new RegExp(
  "(?<![\\p{L}])(?:vorderblatt|obermaterial|au[sß]+enmaterial|oberstoff|schaft|upper|outer\\s+material|main\\s+material|empeigne|tomaia|bovenwerk|bovenmateriaal|cabedal|parte\\s+superior)" +
  "\\s*(?:aus|of|in|de|en|di|van|:|-|–)?\\s*(?:aus|of|in)?\\s*([\\p{L}][\\p{L}\\p{M}-]{2,})|(?:겉감|表地|鞋面|アッパー)\\s*[:：]?\\s*([\\p{L}\\p{M}]{1,12})",
  "giu"
);
function outerFrom(text) {
  OUTER_WORD.lastIndex = 0;
  let m, n = 0;
  while ((m = OUTER_WORD.exec(text)) && n++ < 12) {
    const w = (m[1] || m[2] || "").toLowerCase();
    if (w && wordMatches(NATURAL_FIBRES, w)) return w.charAt(0).toUpperCase() + w.slice(1);
  }
  return "";
}

function classifyPage(html) {
  const text = pageToText(html);
  const r = classifyText(text);
  if (r.verdict !== "ok") return r;
  // only the lining was found as a list: the label should say what the outside is made of, and the lining goes in the card
  if (r.liningOnly) {
    const outer = outerFrom(text);
    if (outer) {
      r.lining = r.reason;
      r.reason = outer;
      const k = knowledge();
      r.fibreKeys = k && k.fibreKey(outer.toLowerCase()) ? [k.fibreKey(outer.toLowerCase())] : [];
    }
  }
  const s = soleCheck(text);
  if (s.kind === "plastic") return { verdict: "bad", fibres: r.fibres, reason: s.word, strong: r.strong };
  if (s.kind === "rubber") r.note = "soleRubber";
  return r;
}

if (typeof module !== "undefined") module.exports = { classifyPage, extractFibres, soleCheck, materialsPresent, STRONG_KEYWORDS, RULES_VERSION };
