// Run with:  node test-clothing.js   (does the clothing detector tell clothes from other products?)
const { sffMentionsClothes, sffLooksLikeClothing } = require("./clothing.js");
let fail = 0;
const check = (name, got, want) => { const ok = got === want; if (!ok) fail++; console.log((ok ? "PASS " : "FAIL ") + name + " -> " + got + (ok ? "" : " (expected " + want + ")")); };

// single names
const clothes = [
  "Merino wool jumper", "Oversized cotton shirt", "Pullover aus Schurwolle", "Strickjacke mit Kaschmir", "Maglione in lana vergine", "Robe en laine",
  "Vestido de lino", "Trui van wol", "Kjole i bomull", "Sweter z wełny", "Kazak uzun kollu", "Свитер из шерсти", "니트 가디건", "ウールのニット", "纯棉衬衫",
  "Wide-leg jeans", "Puffer jacket", "Winter coat", "Leather boots", "Merino socks", "Strumpfhose 40 den", "T-shirt basic",
];
const others = [
  "Frosch Waschmittel Color 20 WL", "Balea Shampoo Repair 300 ml", "Elmex Zahnpasta Kariesschutz", "Dressing French Style 250 ml", "Tee Pfefferminze 20 Beutel",
  "Nivea Creme Soft", "Wollwaschmittel Sensitive", "Baumwollpads 120 Stück", "Duschgel Mandel & Honig", "Kaffee Crema 1 kg", "Hundefutter Rind", "Windeln Gr. 4",
  "Lipstick Matte Red", "Vitamin D3 Tropfen", "Rockstar Energy Drink", "Gartenschlauch 20 m",
];
clothes.forEach((n) => check("clothing name: " + n, sffMentionsClothes(n), true));
others.forEach((n) => check("not clothing: " + n, sffMentionsClothes(n), false));

// whole pages
const fashionPage = ["H&M Merino jumper 29.99", "Zara Wool coat", "Mango Cotton shirt", "Cashmere cardigan", "Linen trousers", "Wide jeans"];
const drugstorePage = ["Frosch Waschmittel", "Persil Pulver 20 WL", "Ariel Pods", "Lenor Weichspüler", "Vanish Gold", "Perwoll Wolle & Feines", "Denkmit Entkalker", "Domol Reiniger"];
const mixedPage = ["Persil Pulver", "Ariel Pods", "Merino socks", "Lenor", "Vanish", "Domol", "Denkmit", "Frosch"];
check("fashion page", sffLooksLikeClothing(fashionPage, ""), true);
check("drugstore page (laundry detergents)", sffLooksLikeClothing(drugstorePage, "Waschmittel"), false);
check("mostly non-clothing with one sock", sffLooksLikeClothing(mixedPage, ""), false);
check("page heading says knitwear", sffLooksLikeClothing(["Item 1", "Item 2"], "Women / Knitwear"), true);
check("no products", sffLooksLikeClothing([], ""), false);
check("Korean clothing page", sffLooksLikeClothing(["울 니트 스웨터", "코튼 셔츠", "와이드 데님 바지", "후드 집업"], ""), true);
check("Japanese clothing page", sffLooksLikeClothing(["ウールニット", "コットンシャツ", "デニムパンツ", "ワンピース"], ""), true);

// found while testing real shops: shop-interface words must never count as clothing
check("'Add to basket' button is not a clothing word", sffMentionsClothes("Olaplex No.4 Strengthening Shampoo 250ml (0) Add to basket Use code NEXT10"), false);
check("'Sweat' deodorant is not clothing", sffMentionsClothes("Antiperspirant Sweat Control 50 ml"), false);
check("the shop's own name is taken out before matching (Boots)", sffMentionsClothes("  Baby Shampoo 250ml  "), false);
// found while testing real shops
check("accent written as a separate mark (Liverpool)", sffMentionsClothes("Suéter cuello redondo para mujer"), true);
const { sffLooksLikeHome } = require("./clothing.js");
check("IKEA: cushion covers are home textiles", sffLooksLikeHome(["KLARASTINA cushion cover", "GURLI cushion cover", "RODARV cushion", "VILDKORN throw"]), true);
check("a clothing page is not home textiles", sffLooksLikeHome(["Merino jumper", "Cotton shirt", "Wide jeans", "Cushion-soft socks"]), false);
check("German bedding page is home textiles", sffLooksLikeHome(["Bettwäsche Set 135x200", "Kissenbezug Baumwolle", "Vorhang blickdicht"]), true);

// the rule used by the extension: home-textile words decide only when clothing words are scarce
const decide = (names) => (sffLooksLikeHome(names) && names.filter(sffMentionsClothes).length < names.length * 0.5 ? "other" : sffLooksLikeClothing(names, "") ? "clothing" : "unclear");
check("IKEA cushions -> other", decide(["KLARASTINA cushion cover", "GURLI cushion cover", "RODARV cushion", "VILDKORN throw"]), "other");
check("Noon 'wool sweater' search with blankets in it -> clothing", decide(["Sweaters Knitted Wool Throw Blanket", "Sweaters Wool Blanket", "Sweaters Round Neck Sweater", "Sweaters Merino Jumper", "Sweaters Wool Rug", "Sweaters Cardigan"]), "clothing");

console.log(fail ? fail + " problem(s)" : "all clothing checks pass");
process.exit(fail ? 1 : 0);
