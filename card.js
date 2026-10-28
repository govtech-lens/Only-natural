// What you see: the chips on the green label, and the small card that opens when you click it.
// All wording comes from the language files (lang/*.js) in the language of the browser;
// page text is only ever shown with textContent.
//
// The card answers two things in plain words:
//   1. Is anything independently certified?   (✓ lines)
//   2. Is there something worth asking about? (one tip, only when it matters)

const SFF_TYPE_ORDER = ["welfare", "production", "footprint", "recycled", "chemicals", "social", "vegan", "claim"];
const SFF_WELFARE_IDS = ["rws", "zq", "ras", "rms", "gcs", "sfa", "rds"];
const SFF_LEATHER_IDS = ["lwg", "vegtan", "chromefree"];
const SFF_COTTON_IDS = ["gots", "ocs", "organic", "bci", "cmia", "fairtrade"];
const SFF_WOOD_IDS = ["fsc", "canopy", "ecovero", "tencel"];

const sffChecked = (c) => c.strength !== "claim";     // checked by an independent body (otherwise: "brand says")

// texts in the browser's language (English where a translation is missing)
const sffCertText = (c, part) => sffTextOf("cert", c.id, part, part === "short" ? c.short : "");
const sffFibreText = (key, part) => sffTextOf("fibre", key, part, "");

function sffEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ids -> certification objects: independently checked first, then the most relevant kinds
function sffRank(ids) {
  const certs = SFF_KNOWLEDGE.certs;
  return (ids || [])
    .map((id) => certs.find((c) => c.id === id))
    .filter(Boolean)
    .sort((a, b) =>
      (sffChecked(b) - sffChecked(a)) ||
      SFF_TYPE_ORDER.indexOf(a.type) - SFF_TYPE_ORDER.indexOf(b.type));
}

function sffChip(cert) {
  const c = sffEl("span", "sff-chip sff-t-" + cert.type, sffCertText(cert, "short"));
  c.title = sffCertText(cert, "plain");
  return c;
}

// the green label on a product tile: composition + up to two chips for things that were independently checked
function sffBadge(info) {
  const b = sffEl("div", "sff-badge");
  b.appendChild(sffEl("div", "sff-badge-main", "🌿 " + info.reason));
  const chips = sffRank(info.certs).filter(sffChecked).filter((c) => c.type !== "vegan");
  if (chips.length) {
    const row = sffEl("div", "sff-chips");
    chips.slice(0, 2).forEach((c) => row.appendChild(sffChip(c)));
    if (chips.length > 2) row.appendChild(sffEl("span", "sff-chip sff-more", "+" + (chips.length - 2)));
    b.appendChild(row);
  }
  b.title = sffT("clickCert");
  b.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sffOpenCard(b, info);
  }, true);
  return b;
}

// one practical tip, only when the page does not mention the thing a careful shopper would look for
function sffTip(keys, ids) {
  const has = (list) => ids.some((i) => list.includes(i));
  for (const k of keys) {
    const tip = sffFibreText(k, "tip");
    if (!tip) continue;
    if (["wool", "cashmere", "alpaca", "mohair", "angora", "silk"].includes(k) && has(SFF_WELFARE_IDS)) continue;
    if (k === "leather" && has(SFF_LEATHER_IDS)) continue;
    if (k === "cotton" && has(SFF_COTTON_IDS)) continue;
    if (["viscose", "modal", "bamboo", "acetate"].includes(k) && has(SFF_WOOD_IDS)) continue;
    return { text: tip, key: k };
  }
  return null;
}

// the labels a tip talks about -> explained on request (the "i" button next to the tip)
const SFF_TIP_EXPLAINS = {
  leather: ["lwg", "vegtan"], wool: ["rws", "zq"], cashmere: ["gcs", "sfa"], alpaca: ["ras"], mohair: ["rms"],
  cotton: ["gots", "ocs", "fairtrade"], viscose: ["fsc", "ecovero", "tencel"], modal: ["fsc", "tencel"], bamboo: ["fsc"], acetate: ["fsc"],
};

function sffTipBox(card, tip) {
  const box = sffEl("div", "sff-tip");
  box.appendChild(sffEl("span", null, "💡 " + tip.text));
  const certs = (SFF_TIP_EXPLAINS[tip.key] || []).map((id) => SFF_KNOWLEDGE.certs.find((c) => c.id === id)).filter(Boolean);
  if (certs.length) {
    const more = sffEl("div", "sff-tip-more");
    certs.forEach((c) => {
      const p = sffEl("p");
      const plain = sffCertText(c, "plain"), short = sffCertText(c, "short");
      p.appendChild(sffEl("b", null, (short && short !== plain ? short + " – " : "") + plain + ": "));
      p.appendChild(document.createTextNode(sffCertText(c, "means")));
      more.appendChild(p);
    });
    more.style.display = "none";
    const i = sffEl("button", "sff-i", "i");
    i.setAttribute("aria-label", sffT("more"));
    i.addEventListener("click", () => {
      more.style.display = more.style.display === "none" ? "block" : "none";
      const r = card.getBoundingClientRect();                       // keep the card on screen after it grows
      if (r.bottom > window.innerHeight - 8) card.style.top = Math.max(8, window.innerHeight - 8 - r.height) + "px";
    });
    box.appendChild(i);
    box.appendChild(more);
  }
  return box;
}

function sffLine(kind, strong, rest) {
  const r = sffEl("div", "sff-line");
  r.appendChild(sffEl("span", "sff-ico sff-ico-" + kind, kind === "ok" ? "✓" : kind === "says" ? "“" : "–"));
  const t = sffEl("span", "sff-line-text");
  t.appendChild(sffEl("b", null, strong));
  if (rest) t.appendChild(document.createTextNode(" " + rest));
  r.appendChild(t);
  return r;
}

function sffBuildCard(info) {
  const keys = info.fibreKeys || [];
  const ids = info.certs || [];
  const ranked = sffRank(ids).filter((c) => c.type !== "vegan");
  const checked = ranked.filter(sffChecked);
  const says = ranked.filter((c) => !sffChecked(c) && c.id !== "brand");

  const card = sffEl("div");
  card.id = "sff-card";
  card.setAttribute("role", "dialog");

  const head = sffEl("div", "sff-card-head");
  head.appendChild(sffEl("strong", null, "🌿 " + info.reason));
  const x = sffEl("button", "sff-card-x", "×");
  x.setAttribute("aria-label", sffT("close"));
  x.addEventListener("click", sffCloseCard);
  head.appendChild(x);
  card.appendChild(head);

  // 1) what an independent body has checked
  const lines = sffEl("div", "sff-lines");
  checked.slice(0, 3).forEach((c) => lines.appendChild(sffLine("ok", sffCertText(c, "short"), "— " + sffCertText(c, "plain"))));
  if (checked.length > 3) lines.appendChild(sffEl("div", "sff-more-count", sffT("moreCount", { n: checked.length - 3 })));
  // 2) what the shop only says
  if (says.length) lines.appendChild(sffLine("says", sffT("brandSays"), says.slice(0, 2).map((c) => sffCertText(c, "plain").toLowerCase()).join(", ")));
  if (!checked.length && !says.length) lines.appendChild(sffLine("none", sffT("nothing"), sffT("mentioned")));
  if (info.lining) lines.insertBefore(sffLine("none", sffT("lining") + ":", info.lining), lines.firstChild);
  if (info.note) lines.insertBefore(sffLine("none", sffT(info.note)), lines.firstChild);
  card.appendChild(lines);

  // 3) one tip, if it helps
  const tip = sffTip(keys, ids);
  if (tip) card.appendChild(sffTipBox(card, tip));

  // 4) a little more, only if asked for
  const details = sffEl("div", "sff-more");
  keys.forEach((k) => {
    const name = sffFibreText(k, "name");
    if (!name) return;
    const p = sffEl("p");
    p.appendChild(sffEl("b", null, name + ": "));
    p.appendChild(document.createTextNode(sffFibreText(k, "about")));
    details.appendChild(p);
  });
  ranked.forEach((c) => {
    const p = sffEl("p");
    p.appendChild(sffEl("b", null, (sffCertText(c, "name") || sffCertText(c, "short")) + ": "));
    p.appendChild(document.createTextNode(sffCertText(c, "means")));
    details.appendChild(p);
  });
  details.appendChild(sffEl("p", "sff-foot", sffT("basedOn")));
  details.style.display = "none";

  const more = sffEl("button", "sff-more-btn", sffT("more"));
  more.addEventListener("click", () => {
    const open = details.style.display === "none";
    details.style.display = open ? "block" : "none";
    more.textContent = open ? sffT("fewer") : sffT("more");
    const r = card.getBoundingClientRect();                       // keep the card on screen after it grows
    if (r.bottom > window.innerHeight - 8) card.style.top = Math.max(8, window.innerHeight - 8 - r.height) + "px";
  });
  card.appendChild(more);
  card.appendChild(details);
  return card;
}

let sffCardAnchor = null;
function sffCloseCard() {
  const old = document.getElementById("sff-card");
  if (old) old.remove();
  sffCardAnchor = null;
  document.removeEventListener("keydown", sffOnKey, true);
  document.removeEventListener("click", sffOnOutside, true);
}
function sffOnKey(e) { if (e.key === "Escape") sffCloseCard(); }
function sffOnOutside(e) {
  const card = document.getElementById("sff-card");
  if (card && !card.contains(e.target) && !(sffCardAnchor && sffCardAnchor.contains(e.target))) sffCloseCard();
}

function sffOpenCard(anchor, info) {
  const wasOpenHere = sffCardAnchor === anchor;
  sffCloseCard();
  if (wasOpenHere) return;                       // a second click closes it
  const card = sffBuildCard(info);
  card.style.visibility = "hidden";
  document.documentElement.appendChild(card);
  const a = anchor.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
  const left = Math.min(Math.max(8, a.left), window.innerWidth - w - 8);
  let top = a.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, a.top - h - 8);   // not enough room below: open above
  card.style.left = left + "px";
  card.style.top = top + "px";
  card.style.visibility = "visible";
  sffCardAnchor = anchor;
  document.addEventListener("keydown", sffOnKey, true);
  setTimeout(() => document.addEventListener("click", sffOnOutside, true), 0);
}
