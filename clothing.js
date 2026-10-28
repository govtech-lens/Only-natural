// Does this page sell CLOTHES? Product names are checked against everyday clothing words in many languages.
// (Fibre words like "wool" or "cotton" are left out on purpose: shops also sell wool detergent and cotton pads.)

// Latin-script words. Each may carry its own endings; the whole word must end there (so "dress" is not "dressing").
const SFF_CLOTHES_WORDS = [
  // English
  "jumpers?", "sweaters?", "sweatshirts?", "pullovers?", "cardigans?", "hoodies?", "knitwear", "knitted", "t-?shirts?", "tee-?shirts?", "shirts?",
  "blouses?", "dress(?:es)?", "skirts?", "trousers?", "pants", "jeans", "denim", "jackets?", "coats?", "blazers?", "parkas?", "anoraks?",
  "gilets?", "scarf", "scarves", "shawls?", "gloves?", "beanies?", "leggings?", "tights", "socks?", "bodysuits?", "jumpsuits?", "dungarees",
  "pyjamas?", "pajamas?", "lingerie", "swimwear", "bikinis?", "underwear", "knickers", "polos?", "turtlenecks?", "crew-?necks?", "cashmere", "merino",
  "sneakers?", "boots?", "sandals?", "loafers?", "trainers?", "waistcoats?", "joggers", "chinos", "culottes", "shorts", "vests?",
  // German
  "pullover\\p{L}*", "strickjacke\\p{L}*", "kleid\\p{L}*", "r[oö]cke?", "hosen?", "jacken?", "m[aä]ntel", "hemd(?:en)?", "blusen?", "strick\\p{L}*", "schals?",
  "m[uü]tzen?", "handschuhe?", "socken", "str[uü]mpfe?", "strumpfhosen?", "unterw[aä]sche", "rollkragen\\p{L}*", "westen?", "anz[uü]ge?", "kaschmir\\p{L}*",
  "sweatjacke\\p{L}*", "leggins", "stiefel\\p{L}*", "schuhe?", "sneaker\\p{L}*",
  // French
  "robes?", "pantalons?", "vestes?", "manteaux?", "chemises?", "pulls?", "jupes?", "[eé]charpes?", "bonnets?", "gants", "chaussettes?", "collants?", "maillots?",
  "blousons?", "doudounes?", "tricots?", "cachemire", "chaussures?", "bottes?",
  // Spanish
  "vestidos?", "camisas?", "camisetas?", "pantal[oó]n(?:es)?", "abrigos?", "faldas?", "chaquetas?", "jerseis?", "jers[eé]y", "su[eé]ter(?:es)?", "cazadoras?", "calcetines", "bufandas?",
  "guantes", "gorros?", "sudaderas?", "vaqueros", "zapatos?", "botas?", "zapatillas?", "cardiganes?", "chalecos?",
  // Italian
  "maglia", "maglie", "maglion[ei]", "abit[oi]", "vestit[oi]", "camicie", "camicia", "giacche", "giacca", "cappott[oi]", "gonn[ae]", "pantaloni", "felp[ae]", "sciarp[ae]",
  "calzin[oi]", "piumin[oi]", "tut[ae]", "scarp[ae]", "stivali", "cappell[oi]", "maglietta", "magliette",
  // Dutch
  "trui(?:en)?", "jurk(?:en)?", "broek(?:en)?", "jas(?:sen)?", "rok(?:ken)?", "sjaals?", "muts(?:en)?", "handschoenen", "sokken", "vest(?:en)?", "schoenen", "laarzen", "overhemd(?:en)?",
  // Portuguese
  "cal[cç]as?", "casacos?", "saias?", "blusas?", "camisolas?", "cachecol(?:es)?", "luvas", "meias", "sapatos?",
  // Nordic
  "tr[oö]jor?", "tr[oö]ja", "kjol(?:ar)?", "byxor", "jacka", "jackor", "kl[aä]nning(?:ar)?", "genser", "gensere", "kjoler?", "bukser?", "jakker?", "frakker?", "nederdel(?:e)?",
  // Polish
  "sweter\\p{L}*", "swetry", "sukienk[aię]", "spodnie", "kurtk[aiię]", "p[lł]aszcz(?:e)?", "koszul[aei]", "sp[oó]dnic[aey]", "bluz[aey]", "szalik(?:i)?", "buty",
  // Turkish
  "kazak(?:lar)?", "elbise(?:ler)?", "pantolon(?:lar)?", "ceket(?:ler)?", "g[oö]mlek(?:ler)?", "etek(?:ler)?", "h[ıi]rka(?:lar)?", "mont(?:lar)?", "ti[sş][oö]rt(?:ler)?", "ayakkab[ıi]",
  // Russian
  "свитер\\p{L}*", "плать[яе]\\p{L}*", "куртк\\p{L}*", "пальто", "рубашк\\p{L}*", "брюки", "юбк\\p{L}*", "джемпер\\p{L}*", "кардиган\\p{L}*", "джинсы", "толстовк\\p{L}*",
];

// Korean, Japanese and Chinese are written without spaces, so these are matched anywhere in the name.
const SFF_CLOTHES_CJK = [
  "니트", "원피스", "자켓", "재킷", "코트", "셔츠", "티셔츠", "바지", "스커트", "치마", "가디건", "맨투맨", "후드", "청바지", "스웨터", "블라우스", "점퍼", "패딩", "양말", "신발",
  "ニット", "ワンピース", "ジャケット", "コート", "シャツ", "スカート", "パンツ", "カーディガン", "セーター", "パーカー", "ブラウス", "ジーンズ", "ソックス", "靴下", "靴",
  "毛衣", "连衣裙", "連衣裙", "外套", "衬衫", "襯衫", "裤", "裙", "针织", "針織", "卫衣", "衛衣", "大衣", "夹克", "夾克", "羽绒", "羽絨", "袜", "鞋", "T恤",
];

const SFF_CLOTHES_RE = new RegExp(
  "(?<![\\p{L}])(?:" + SFF_CLOTHES_WORDS.join("|") + ")(?![\\p{L}])|" + SFF_CLOTHES_CJK.join("|"),
  "iu"
);

const sffMentionsClothes = (text) => SFF_CLOTHES_RE.test(String(text || "").normalize("NFC"));

// Home textiles and furniture have material lists too (cushion covers, bedding, curtains) but are not clothes.
const SFF_HOME_WORDS = [
  "cushions?", "pillows?", "pillowcases?", "curtains?", "drapes?", "rugs?", "carpets?", "duvets?", "bedding", "bed ?linen", "bed ?sheets?", "sheets?", "towels?", "tablecloths?",
  "blankets?", "throws?", "mattress(?:es)?", "sofas?", "armchairs?", "lamp(?:shade)?s?",
  "kissen\\p{L}*", "vorh[aä]nge?", "gardinen?", "teppich\\p{L}*", "bettw[aä]sche", "bettdecken?", "decken?", "handt[uü]cher?", "tischdecken?", "matratzen?", "sofa\\p{L}*",
  "coussins?", "rideaux", "tapis", "couettes?", "draps?", "serviettes?", "housses?", "plaids?",
  "cojines?", "cortinas?", "alfombras?", "edredones?", "s[aá]banas?", "toallas?", "mantas?",
  "cuscin[oi]", "tend[ae]", "tappet[oi]", "piumon[ei]", "lenzuol[ao]", "asciugaman[oi]",
  "kussens?", "gordijnen", "tapijt\\p{L}*", "dekbed\\p{L}*", "handdoeken?", "lakens?",
];
const SFF_HOME_RE = new RegExp("(?<![\\p{L}])(?:" + SFF_HOME_WORDS.join("|") + ")(?![\\p{L}])", "iu");
const sffMentionsHome = (text) => SFF_HOME_RE.test(String(text || "").normalize("NFC"));
function sffLooksLikeHome(names) {
  const list = (names || []).slice(0, 60);
  return list.length > 0 && list.filter(sffMentionsHome).length >= Math.max(2, Math.ceil(list.length * 0.3));
}

// names of the products on a page (and the page heading) -> does this page sell clothes?
// A clothing page has clothing words in a good share of its product names (or in its heading).
function sffLooksLikeClothing(names, heading) {
  if (heading && sffMentionsClothes(heading)) return true;
  const list = (names || []).slice(0, 60);
  if (!list.length) return false;
  const hits = list.filter(sffMentionsClothes).length;
  return hits >= Math.max(2, Math.ceil(list.length * 0.15));
}

if (typeof module !== "undefined") module.exports = { sffMentionsClothes, sffLooksLikeClothing, sffLooksLikeHome, SFF_CLOTHES_RE };
