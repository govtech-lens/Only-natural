// What we can recognise: fibres, and certifications. Only patterns and ids live here.
// The wording shown to shoppers (names, explanations, tips) is in the language files: lang/en.js, lang/de.js ...

// ---------- fibres ----------
// words = how the fibre is written on shop pages, in many languages (patterns)
const SFF_FIBRES = {
  cotton: { words: ["cotton","baumwolle","algod[oó]n","algod[aã]o","coton","katoen","cotone","bomull","bomuld","綿","コットン","棉","纯棉","면"] },
  linen: { words: ["linen","leinen","lino","lin","linho","vlas","麻","リネン","亚麻"] },
  hemp: { words: ["hemp","hanf","c[aá]ñamo","chanvre","canapa","cânhamo","hennep","大麻","ヘンプ"] },
  wool: { words: ["wool","wolle","schurwolle","\\p{L}+wolle","scheerwol","lana","laine","wol","ull","uld","lambswool","merino","merinowolle","lã","ウール","羊毛","울"] },
  cashmere: { words: ["cashmere","kaschmir","cachemire","kasjmier","cachemira","caxemira","kaszmir","カシミヤ","カシミア","羊绒","캐시미어"] },
  alpaca: { words: ["alpaca","alpaka"] },
  mohair: { words: ["mohair","mohér","モヘア"] },
  angora: { words: ["angora"] },
  camel: { words: ["camel","kamel","yak","骆驼绒"] },
  silk: { words: ["silk","seide","seda","soie","zijde","seta","silke","絹","シルク","真丝","蚕丝","실크"] },
  lyocell: { words: ["lyocell","tencel","リヨセル","テンセル","莱赛尔","天丝"] },
  modal: { words: ["modal","モダール","モダル","莫代尔"] },
  viscose: { words: ["viscose","viskose","viskoos","rayon","viscosa","wiskoza","viskóza","вискоза","レーヨン","ビスコース","粘胶","비스코스"] },
  acetate: { words: ["acetate","triacetate","azetat","triazetat","ac[eé]tate","triac[eé]tate","acetato","triacetato","acetaat","triacetaat","아세테이트","トリアセテート","アセテート","醋酸纤维","醋酯纤维","醋酸纖維","三醋酸纤维"] },
  cupro: { words: ["cupro","キュプラ","铜氨"] },
  bamboo: { words: ["bamboo","bambus","bambu","bambou","竹"] },
  ramie: { words: ["ramie","jute","kapok","苎麻","ラミー","ジュート","黄麻"] },
  leather: { words: ["\\p{L}+leder","\\p{L}+leather","rind","rindsleder","kalb\\p{L}*","nappa","vachette","veau","agneau","piel","ternera","cuoio","vitello","vacchetta","\\p{L}*leer","bezerro","leather","leder","cuir","cuero","pelle","couro","skóra","suede","nubuck","革","レザー","本革","가죽","真皮","皮革"] },
};

// ---------- certifications and claims ----------
// short    = the label shown on the chip (acronyms are not translated; see lang files for the others)
// strength = "independent" / "limited": checked by an independent body  |  "claim": only the shop says so
// type     = what it is about, which sets the chip colour: production | welfare | footprint | chemicals | social | recycled | vegan
// re       = how it is written on shop pages (pattern)
const SFF_CERTS = [
  { id: "gots", short: "GOTS", type: "production", strength: "independent", re: "\\bGOTS\\b|global organic textile standard" },
  { id: "ocs", short: "OCS", type: "production", strength: "limited", re: "\\bOCS\\b|organic content standard" },
  { id: "organic", short: "Organic", type: "production", strength: "claim", re: "organic (?:cotton|wool|linen|hemp)|(?:biologische|bio)[- ]?baumwolle|coton biologique|algod[oó]n org[aá]nico|cotone biologico|bio[- ]?katoen|(?:オーガニック|有机|유기농)" },
  { id: "bci", short: "Better Cotton", type: "production", strength: "limited", re: "better cotton|\\bBCI\\b" },
  { id: "cmia", short: "CmiA", type: "production", strength: "limited", re: "cotton made in africa|\\bCmiA\\b" },
  { id: "fairtrade", short: "Fairtrade", type: "social", strength: "independent", re: "fair ?trade" },
  { id: "rws", short: "RWS", type: "welfare", strength: "independent", re: "\\bRWS\\b|responsible wool standard" },
  { id: "zq", short: "ZQ", type: "welfare", strength: "independent", re: "\\bZQ\\b|ZQ ?merino" },
  { id: "mulesing", short: "No mulesing", type: "welfare", strength: "claim", re: "mulesing[- ]free|non[- ]?mulesed|ohne mulesing|sans mulesing" },
  { id: "ras", short: "RAS", type: "welfare", strength: "independent", re: "\\bRAS\\b(?=[^.]{0,40}alpaca)|responsible alpaca standard" },
  { id: "rms", short: "RMS", type: "welfare", strength: "independent", re: "\\bRMS\\b(?=[^.]{0,40}mohair)|responsible mohair standard" },
  { id: "gcs", short: "GCS", type: "welfare", strength: "limited", re: "\\bGCS\\b|good cashmere standard" },
  { id: "sfa", short: "SFA", type: "welfare", strength: "limited", re: "\\bSFA\\b(?=[^.]{0,60}cashmere)|sustainable fibre alliance" },
  { id: "rds", short: "RDS", type: "welfare", strength: "independent", re: "\\bRDS\\b|responsible down standard" },
  { id: "lwg", short: "LWG", type: "chemicals", strength: "limited", re: "leather working group|\\bLWG\\b" },
  { id: "vegtan", short: "Plant-tanned", type: "chemicals", strength: "claim", re: "vegetable[- ]tanned|vegetabil gegerbt|pflanzlich gegerbt|tann[eé] v[eé]g[eé]tal|curtido vegetal" },
  { id: "chromefree", short: "Chrome-free", type: "chemicals", strength: "claim", re: "chrome[- ]free|chromfrei|sans chrome" },
  { id: "tencel", short: "TENCEL™", type: "footprint", strength: "limited", re: "tencel|lenzing" },
  { id: "ecovero", short: "ECOVERO™", type: "footprint", strength: "limited", re: "ecovero" },
  { id: "fsc", short: "FSC", type: "footprint", strength: "independent", re: "\\bFSC\\b|forest stewardship|\\bPEFC\\b" },
  { id: "canopy", short: "Canopy", type: "footprint", strength: "limited", re: "canopy ?style|canopy(?:'s)? hot button|canopy green shirt" },
  { id: "c2c", short: "Cradle to Cradle", type: "footprint", strength: "independent", re: "cradle to cradle|\\bC2C\\b" },
  { id: "grs", short: "GRS", type: "recycled", strength: "independent", re: "\\bGRS\\b|global recycled standard" },
  { id: "rcs", short: "RCS", type: "recycled", strength: "limited", re: "\\bRCS\\b|recycled claim standard" },
  { id: "recycled", short: "Recycled", type: "recycled", strength: "claim", re: "recycled (?:wool|cashmere|cotton|linen)|(?:recycelte[rs]?|recyceltes) (?:wolle|kaschmir|baumwolle)|(?:laine|cachemire|coton) recycl[eé]e?|(?:lana|cashmere|algod[oó]n) reciclad[oa]" },
  { id: "regen", short: "Regenerative", type: "production", strength: "claim", re: "regenerative (?:agricultur|cotton|wool|organic)|regenerativ" },
  { id: "oekotex", short: "OEKO-TEX", type: "chemicals", strength: "independent", re: "oeko[- ]?tex|[öo]ko[- ]?tex" },
  { id: "bluesign", short: "bluesign", type: "chemicals", strength: "independent", re: "bluesign" },
  { id: "fairwear", short: "Fair Wear", type: "social", strength: "independent", re: "fair wear" },
  { id: "bcorp", short: "B Corp", type: "social", strength: "limited", re: "\\bb[- ]?corp\\b" },
  { id: "vegan", short: "Vegan", type: "vegan", strength: "limited", re: "peta[- ]approved vegan|vegan society|(?:100% )?vegan(?! leather)" },
  { id: "carbon", short: "Carbon-neutral", type: "footprint", strength: "claim", re: "carbon[- ]neutral|climate[- ]neutral|co2[- ]neutral|klimaneutral" },
  { id: "brand", short: "Brand label", type: "claim", strength: "claim", re: "conscious (?:choice|collection|edit)|join life|committed collection|responsible edit|eco edit|sustainable (?:edit|capsule)" },
];

const sffCompiledCerts = SFF_CERTS.map((c) => Object.assign({}, c, { rx: new RegExp(c.re, "iu") }));

// Looks for certifications and claims in a piece of text around the material list.
// Mentions inside web addresses or menu paths ("shop/fair trade certified|shop/...") are ignored.
function sffFindCerts(text) {
  const found = [];
  sffCompiledCerts.forEach((c) => {
    const rx = new RegExp(c.re, "giu");
    let m;
    while ((m = rx.exec(text))) {
      const before = text[m.index - 1] || " ", after = text[m.index + m[0].length] || " ";
      if (!/[\/|=_\\]/.test(before) && !/[\/|=_\\]/.test(after)) { found.push(c.id); break; }
    }
  });
  return found;
}

// fibre name (as written on the page) -> key in SFF_FIBRES
function sffFibreKey(name) {
  const w = String(name).toLowerCase();
  for (const key of Object.keys(SFF_FIBRES)) {
    if (SFF_FIBRES[key].words.some((p) => new RegExp("^(?:" + p + ")$", "iu").test(w))) return key;
  }
  return null;
}

const SFF_KNOWLEDGE = { fibres: SFF_FIBRES, certs: SFF_CERTS, findCerts: sffFindCerts, fibreKey: sffFibreKey };
if (typeof module !== "undefined") module.exports = SFF_KNOWLEDGE;
