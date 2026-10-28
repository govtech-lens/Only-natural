// Run with:  node test-classify.js   (checks the material reader)
const { classifyPage } = require("./classify.js");
const cases = [
  ["acetate lining", "<h3>Composition</h3> Shell: 100% wool. Lining: 100% acetate", "ok"],
  ["triacetate+viscose", "<div>Material: 60% Triacetate, 40% Viskose</div>", "ok"],
  ["acetate with polyester", "<div>Composition: 70% Acetat, 30% Polyester</div>", "bad"],
  ["wool+cashmere", "<div>Composition: 70% Wool, 30% Cashmere</div>", "ok"],
  ["H&M wool/cashmere", "<h3>Composition</h3><span>Wool 90%, Cashmere 10%</span> Additional material information The total weight contains at least: 71% Recycled polyester", "ok"],
  ["lyocell", "<p>Material</p><p>100% Lyocell (TENCEL™)</p>", "ok"],
  ["poly lining", "<h3>Composition</h3> Shell: 100% organic cotton. Lining: 100% polyester", "bad"],
  ["poly blend", "<div>Composition 60% Cotton 40% Polyester</div>", "bad"],
  ["elastane", "<div>Materials: 95% cotton, 5% elastane</div>", "bad"],
  ["recycled poly", "<div>Composition: 100% recycled polyester</div>", "bad"],
  ["reverse", "<div>Material: Cotton 100%</div>", "ok"],
  ["lining word", "<div>Material: 100% linen. Lining: 100% cotton</div>", "ok"],
  ["none", "<div>Nice jumper, 50% off!</div>", "unknown"],
  // the page reported as wrongly passed (H&M Germany mini skirt)
  ["DE skirt", "Passform: Regular Fit Materialien Zusammensetzung Obermaterial: Viskose 98%, Metallisiertes Garn 2% Beschichtung: Polyurethan 100% Futter: Polyester 100% Pflegehinweise Bei Bedarf chlorfrei bleichen", "bad"],
  ["DE skirt, no lining", "Zusammensetzung Obermaterial: Viskose 98%, Metallisiertes Garn 2% Pflegehinweise Maschinenwäsche", "unknown"],
  ["DE coating only", "Zusammensetzung Obermaterial: Baumwolle 100% Beschichtung: Polyurethan 100% Pflegehinweise", "bad"],
  // reported as wrongly hidden (H&M Germany cashmere beanie): German "recycelter", and a (R) sign
  ["DE recycled cashmere", "Recycelter Kaschmir wird aus Garnspinnabfällen hergestellt – ohne Material zu verschwenden Obermaterial: 60 % recycelter Kaschmir, 40 % GCS® Kaschmir. Details ausgenommen/Handwäsche Umfang = 42 cm", "ok"],
  ["DE hyphen compound", "Obermaterial: 60 % recycelter Kaschmir, 40 % GCS-Kaschmir. Details ausgenommen/Handwäsche Umfang = 42 cm", "ok"],
  ["compound plastic", "Composition: 50% cotton, 50% Nylon-Mix", "bad"],
  ["DE page list", "Zusammensetzung Obermaterial: Kaschmir 100% Weitere Materialinformationen Das Gesamtgewicht enthält mindestens: 60% Recyceltes Kaschmir", "ok"],
  ["recycled poly still bad", "Composition: 60% recycled cotton, 40% recycled polyester", "bad"],
  // found while testing other shops
  ["ASOS: no heading", "\"aboutMeVisible\":true,\"aboutMe\":\"Main: 34% Alpaca, 34% Wool, 29% Nylon, 3% Elastane.\"};", "bad"],
  ["ASOS: natural, no heading", "\"aboutMe\":\"Main: 70% Wool, 30% Alpaca.\"};", "ok"],
  ["Matalan: '50% off' noise", "Up to 50% Off. Product Details Material 49% Acrylic 40% Polyester 7% Wool 4% Elastane Care instructions Machine Washable", "bad"],
  ["noise before a natural list", "Sale 50% Off Product Details Material 80% Wool 20% Cashmere Care instructions Machine Washable", "ok"],
  ["Ganni: under Details", "Details Open modal with product details 45% Wool, 35% Recycled Wool, 20% Recycled Polyamide Learn more about our materials Folded cuff", "bad"],
  ["FR: recycled polyester", "principale 100% polyester recyclé, doublure 100% coton, bord-côte 100% coton", "bad"],
  ["incomplete list is not ok", "Zusammensetzung Obermaterial: Viskose 98%, Metallisiertes Garn 2% Futter: Baumwolle 100% Pflegehinweise", "unknown"],
  ["JP", "素材 綿 60% ポリエステル 40% 洗濯", "bad"],
  ["JP natural", "素材 綿 70% ウール 30% 洗濯", "ok"],
  ["KR", "혼용률 면 100% 세탁", "ok"],
  // a percentage RANGE in a menu is not a composition
  ["menu range is not a list", "Shop by Material All Materials Women’s Organic Cotton 95–100% Men’s Organic Cotton 95–100% Organic Cotton +70% Recycled Nylon Responsible Wool", "unknown"],
  // Intrend (Germany): main fabric first, lining second. The label must show the main fabric.
  ["DE: Schurwolle + Viskose lining", "Pflege Stoff 100% schurwolle; futter 100% viskose. Kontaktieren Sie uns", "ok", "100% Schurwolle"],
  ["DE: lining listed first", "Zusammensetzung Futter 100% Viskose; Stoff 100% Schurwolle Pflegehinweise", "ok", "100% Schurwolle"],
  ["DE: Schurwolle + polyester lining", "Zusammensetzung Stoff 100% Schurwolle; Futter 100% Polyester Pflegehinweise", "bad"],
  ["unknown word with a real share is not ignored", "Zusammensetzung Stoff 60% Baumwolle; Futter 100% Viskose; Besatz 40% Zorbium Pflegehinweise", "unknown"],
  ["IT: poliestere (OVS)", "Composizione: 70% POLIESTERE, 30% LANA. Lavaggio a mano", "bad"],
  ["IT: poliammide + elastan", "Composizione: 95% COTONE 5% ELASTAN Lavaggio", "bad"],
  ["DE: Polyacryl", "Zusammensetzung: 60% Schurwolle, 40% Polyacryl Pflegehinweise", "bad"],
  ["IT: lana vergine", "Composizione: 100% lana vergine. Lavaggio a mano", "ok"],
  ["unknown fibre", "Composition: 60% Cotton, 40% Zorbium", "unknown"],
  ["DE natural", "Zusammensetzung Obermaterial: Baumwolle 60%, Leinen 40% Futter: Baumwolle 100% Pflegehinweise", "ok"],
];
// label checks: [name, text, expected label]
const labels = [
  ["label: real list beats description", "Obermaterial: 60 % recycelter Kaschmir, 40 % GCS® Kaschmir. Details ... Material und Pflege Zusammensetzung Obermaterial: Kaschmir 100% Weitere Materialinformationen 60% Recyceltes Kaschmir", "100% Kaschmir"],
  ["label: parts are added up", "Obermaterial: 60 % recycelter Kaschmir, 40 % GCS-Kaschmir. Details ausgenommen", "100% Kaschmir"],
  ["label: no double counting", "Composition: Wool 71%, Cashmere 29% Additional material information at least 29% cashmere", "71% Wool, 29% Cashmere"],
  ["label: shell + lining is not 200%", "Composition Shell: 100% Cotton Pocket lining: 100% Cotton Care instructions", "100% Cotton"],
  ["label: percent first", "Composition: 70% Wool, 30% Cashmere", "70% Wool, 30% Cashmere"],
];
cases.push(...labels.map(([n, t, l]) => [n, t, "ok", l]));
let fail = 0;
for (const [n, html, exp, label] of cases) {
  const r = classifyPage(html);
  const pass = r.verdict === exp && (!label || r.reason === label);
  if (!pass) fail++;
  console.log((pass ? "PASS " : "FAIL ") + n + " -> " + r.verdict + " (" + r.reason + ")");
}
if (fail) process.exitCode = 1;

// ---- certifications next to the material list ----
const certCases = [
  ["certs: RWS + GCS", "Composition Wool 90%, Cashmere 10% Additional material information 90% RWS wool TE-00047 and Good Cashmere Standard cashmere Care instructions", ["rws", "gcs"]],
  ["certs: GOTS organic cotton", "Composition: 100% organic cotton. Certified to the Global Organic Textile Standard (GOTS). Care instructions", ["gots", "organic"]],
  ["certs: none mentioned", "Composition: 100% Cotton. Machine wash 30. Care instructions", []],
  ["certs: ignores menu paths", "shop/seasonal fabrics/fair trade certified|shop/clothing/wool pants Composition: 100% Wool Care instructions", []],
  ["certs: brand programme is a claim only", "Part of our Conscious Choice collection. Composition: 100% Cotton. Care instructions", ["brand"]],
  ["certs: leather tannery", "Composition: 100% Leather. Tanned by a Leather Working Group gold-rated tannery. Care instructions", ["lwg"]],
  ["certs: TENCEL + FSC", "Composition: 100% Lyocell (TENCEL™). Wood pulp from FSC certified forests. Care instructions", ["tencel", "fsc"]],
];
const K = require("./knowledge.js");
let certFail = 0;
for (const [n, html, want] of certCases) {
  const got = classifyPage(html).certs || [];
  const pass = want.every((w) => got.includes(w)) && got.every((g) => want.includes(g));
  if (!pass) certFail++;
  console.log((pass ? "PASS " : "FAIL ") + n + " -> " + JSON.stringify(got) + (pass ? "" : " expected " + JSON.stringify(want)));
}
// every certification must have a plain-language explanation and every fibre must have notes
K.certs.forEach((c) => { if (!c.short || !c.re) { certFail++; console.log("FAIL incomplete cert " + c.id); } });
Object.entries(K.fibres).forEach(([k, f]) => { if (!f.words || !f.words.length) { certFail++; console.log("FAIL incomplete fibre " + k); } });
if (certFail) process.exit(1);

// ---- soles ----
const soleCases = [
  ["shoe: leather upper + leather sole", "<p>Material: Obermaterial 100% Rindleder. Sohle: Leder</p>", "ok", ""],
  ["shoe: sole rubber -> ok with note", "<p>Composition: 100% Leather. Rubber sole</p>", "ok", "soleRubber"],
  ["shoe: Gummisohle -> ok with note", "<p>Material: Obermaterial 100% Leder. Gummisohle</p>", "ok", "soleRubber"],
  ["shoe: Sohle aus Gummi", "<p>Composition: 100% Rind. Sohle aus Gummi</p>", "ok", "soleRubber"],
  ["shoe: natural rubber sole", "<p>Composition: 100% Cotton. Sole: natural rubber</p>", "ok", ""],
  ["shoe: cork + jute sole", "<p>Composition: 100% Cotton. Sole: jute</p>", "ok", ""],
  ["shoe: PU sole -> bad", "<p>Composition: 100% Leather. Sole: PU</p>", "bad", ""],
  ["shoe: TPU outsole -> bad", "<p>Composition: 100% Leather. TPU outsole</p>", "bad", ""],
  ["shoe: EVA sole -> bad", "<p>Composition: 100% Cotton. Sole: EVA</p>", "bad", ""],
  ["shoe: synthetic sole -> bad", "<p>Composition: 100% Leather. Synthetic sole</p>", "bad", ""],
  ["shoe: Kunststoffsohle -> bad", "<p>Zusammensetzung: 100% Leder. Kunststoffsohle</p>", "bad", ""],
  ["shoe: rubber sole with leather lining stays a note", "<p>Composition: 100% Leather. Rubber sole with leather lining</p>", "ok", "soleRubber"],
  ["shirt: no sole mentioned", "<p>Composition: 100% Cotton</p>", "ok", ""],
  ["max mara: leather upper, viscose+silk lining -> label is the outer", "<p>Zusammensetzung Vorderblatt aus lammleder; futter aus 72% viskose, 28% seide</p>", "ok", ""],
  ["lining plastic still bad (percent list)", "<p>Composition: Vorderblatt aus Rind; Futter 60% Polyester, 40% Polyurethan; Sohle aus Gummi</p>", "bad", ""],
];
let soleFail = 0;
for (const [n, html, want, note] of soleCases) {
  const r = classifyPage(html);
  const pass = r.verdict === want && (r.note || "") === note;
  if (!pass) soleFail++;
  console.log((pass ? "PASS " : "FAIL ") + n + " -> " + r.verdict + " " + (r.note || "") + " " + (r.reason || "") + (pass ? "" : " (expected " + want + " " + note + ")"));
}
if (soleFail) process.exit(1);

// outer material on the label, lining in the card
const mm = classifyPage("<p>Zusammensetzung und Waschanleitung Vorderblatt aus lammleder; futter aus 72% viskose, 28% seide Ledersohle</p>");
const chk = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); if (!ok) process.exit(1); };
chk("label shows the outer material (" + mm.reason + ")", mm.reason === "Lammleder");
chk("lining kept for the card (" + mm.lining + ")", /72% Viskose/.test(mm.lining) && /28% Seide/.test(mm.lining));
chk("leather note is about leather", (mm.fibreKeys || []).includes("leather"));
const cl = classifyPage("<h3>Composition</h3> Shell: 100% wool. Lining: 100% cupro");
chk("clothes with shell + lining lists: label = shell, lining in card (" + cl.reason + " / " + cl.lining + ")", cl.reason === "100% Wool" && cl.lining === "100% Cupro");
const bad = classifyPage("<p>Vorderblatt aus Rind; futter aus 60% polyester, 40% polyurethan; Sohle aus Gummi</p>");
chk("plastic lining still hides the shoe", bad.verdict === "bad");

// ---- material lists in words (Max Mara shoes) ----
const words = [
  ["all leather shoe", "<p>Zusammensetzung und Waschanleitung Vorderblatt aus kalb; futter aus lammleder, ziegenleder; sohle aus leder und gummi. Vertrieb: Max Mara S.r.l.</p>", "ok", "Kalb"],
  ["with details + leather sole", "<p>Zusammensetzung und Waschanleitung Vorderblatt aus kalb; mit details aus rind; futter aus lammleder, ziegenleder; sohle aus obersohlenleder und andere materialien. Vertrieb: x</p>", "ok", "Kalb"],
  ["rubber sole gets a note", "<p>Zusammensetzung und Waschanleitung Vorderblatt aus kalb; futter aus lammleder, ziegenleder; sohle aus gummi. Vertrieb: x</p>", "ok", "Kalb"],
  ["plastic lining in words", "<p>Zusammensetzung Vorderblatt aus rind; futter aus polyurethan; sohle aus gummi. Vertrieb: x</p>", "bad", ""],
  ["plastic sole in words", "<p>Zusammensetzung Vorderblatt aus lammleder; futter aus lammleder; sohle aus pu. Vertrieb: x</p>", "bad", ""],
  ["unknown outer word", "<p>Zusammensetzung Vorderblatt aus zebrastoff; futter aus lammleder. Vertrieb: x</p>", "unknown", ""],
  ["perfume is not a material list", "<p>Zusammensetzung und Inhaltsstoffe ALCOHOL, PARFUM (FRAGRANCE), AQUA (WATER), LINALOOL, VANILLIN, COUMARIN</p>", "unknown", ""],
];
for (const [n, html, want, label] of words) {
  const r = classifyPage(html);
  const pass = r.verdict === want && (!label || r.reason === label);
  console.log((pass ? "PASS " : "FAIL ") + n + " -> " + r.verdict + " " + r.reason + " " + (r.lining || "") + " " + (r.note || ""));
  if (!pass) process.exit(1);
}
const { materialsPresent } = require("./classify.js");
chk("perfume page: no material words", !materialsPresent("<p>Zusammensetzung und Inhaltsstoffe ALCOHOL, PARFUM, AQUA, LINALOOL</p>"));
chk("shoe page: material words present", materialsPresent("<p>Zusammensetzung Vorderblatt aus zebraleder; futter aus lammleder</p>"));
chk("rubber note for sole aus gummi", classifyPage(words[2][1]).note === "soleRubber");
