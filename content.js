// Runs on every shopping page. When the button is ON, it reads each product's
// material list in the background and shows only products made purely from
// natural materials.

let hideUnknown = true;         // true = also hide items whose materials can't be read (can be switched in the popup)
const MAX_PARALLEL = 10;       // how many product pages we read at once
const LOOKAHEAD = 3;           // only check products up to this many screens below what you see (more as you scroll)
const MIN_TILES = 4;           // fewer similar product tiles than this = not a shopping list (a lookbook, a home page...)
const CACHE_DAYS = 14;          // remember results this long (instant on the next visit)
const CACHE_MAX = 4000;
const CACHE_KEY = "sffCache";
const FLUSH_MS = 200;           // show results in small batches, not one by one
const STREAM_HIT = new RegExp("(?:" + KEYWORDS.join("|") + ")[^%％]{0,3000}\\d\\s*[%％]", "iu");
const STREAM_EXTRA = 10000;     // keep reading this many characters past the list, then stop
const DEEP_PARALLEL = 4;        // hidden frames open at once (for shops that build pages with JavaScript)
const DEEP_TIMEOUT = 8000;      // give a page this long (ms) to build itself
let deepHosts = {};             // shops known to need hidden frames: host -> time learned
let staticMisses = 0, staticHits = 0;
let offHosts = {};              // shops the user switched off: host -> true
let forceHosts = {};            // shops the user switched ON although they do not look like clothing: host -> true
let pageKind = "";              // what this page is: "clothing" | "other" | "checking" | "off" | "" (not a shopping list)
const kindByPage = new Map();   // page address -> "clothing" | "other" (a shop can sell clothes and more: decided page by page)
let probingPage = null;

let enabled = false;
let store = {};                 // saved results: product address -> {v, r, t, ver}
const memory = new Map();       // results from this visit
const queue = [];               // jobs waiting: {key, href, cards:Set}
const inflight = new Map();     // jobs being read right now: key -> job
let idleFar = false;            // nothing left to do except products far below the screen
const ready = [];               // finished jobs waiting to be shown
let running = 0;
let scanTimer = null, flushTimer = null, saveTimer = null;
let currentKeys = [];           // products on the page right now
const failed = new Set();       // products we could not load (counted as finished, retried on a later scan)
const failedTries = new Map();  // product -> how many times loading it failed in this visit
// Some shops (Uniqlo) recycle their tiles: when we hide one, the list shifts and the same box now holds another product,
// which we then re-label and shift again. When tiles keep changing their mind, hide them without letting the page move
// (invisible, but their space stays) so the list holds still.
const FLIP_LIMIT = 6, FLIP_WINDOW = 10000;   // this many changes of mind within this many ms
let keepSpace = false;
const flipTimes = [];
function goKeepSpace() {
  if (keepSpace) return;
  keepSpace = true;
  document.querySelectorAll(".sff-hidden").forEach((el) => { el.classList.remove("sff-hidden"); el.classList.add("sff-ghost"); });
}
const diag = { scans: 0, scanTimes: [], observed: 0, flips: 0, flipExample: "", keysMin: Infinity, keysMax: 0 };   // numbers for the "copy report" button
const MAX_FAILED_VISITS = 2;    // after this many failed rounds (3 attempts each) a product is given up for this visit

// A shop that keeps answering "no" (403, 429, 503) is protecting itself against too many requests: stop asking for a while
// (and leave its page exactly as it is) instead of making it worse.
const BLOCK_LIMIT = 3, PAUSE_MS = 10 * 60 * 1000;
let blockHits = 0, pausedUntil = 0, pauseTimer = null;
const isPaused = () => Date.now() < pausedUntil;
function pauseShop(until) {
  pausedUntil = until || Date.now() + PAUSE_MS;
  try {
    chrome.storage.local.get("sffPaused", (d) => {
      const p = d.sffPaused || {};
      p[location.host] = pausedUntil;
      chrome.storage.local.set({ sffPaused: p });
    });
  } catch (e) { /* only used to remember the pause for the next page */ }
  clearTimeout(pauseTimer);
  pauseTimer = setTimeout(() => { blockHits = 0; pausedUntil = 0; scan(); }, pausedUntil - Date.now() + 500);
  document.querySelectorAll(".sff-pending").forEach((el) => { el.classList.remove("sff-pending"); delete el.dataset.sff; });
  updatePill();
}

// typical product addresses: /p/…, /product/…, /prd/…, …-p12345.html, long ID numbers.
// A plain ".html" ending is not enough on its own (category and promo tiles end that way too);
// those need a visible price on the tile instead (see tileShowsPrice).
const PRODUCT_HINT = /\/(p|pd|prd|product|products|productpage|pdp|item|items|detail|details|goods|good|art|article|buy|dp|listing|itm|t)[\/\.\-_]|[-_/]p[-_]?\d{4,}|\d{5,}|\d{3,}[-_]\d{3,}/i;

const STRICT_PRODUCT = /\/(p|pd|prd|product|products|productpage|pdp|item|dp)[\/.\-_]|[-_/]p[-_]?\d{4,}/i;   // an address that clearly says "one product"

// ---------- finding the product tiles ----------

// a price like "€29.99", "29,99 €", "£45", "¥3,990", "399 kr", "USD 59"
const CURRENCIES = "USD|EUR|GBP|CHF|CAD|AUD|NZD|JPY|CNY|RMB|INR|KRW|TWD|HKD|SGD|THB|MYR|IDR|PHP|VND|AED|SAR|QAR|KWD|BHD|OMR|EGP|ILS|TRY|TL|RUB|UAH|KZT|PLN|CZK|HUF|RON|BGN|SEK|NOK|DKK|ISK|MXN|BRL|ARS|CLP|COP|PEN|ZAR|PKR|BDT|LKR|Dhs|DH|Rs|Rp|RM|kr|zł|Kč|Ft|lei|руб|R\\$|[$€£¥₩₹₺₽₫฿₪₱₴₸₼₾]|원|円|元|圓";
const PRICE = new RegExp("(?:" + CURRENCIES + ")\\.?\\s?\\d|\\d[\\d.,\\s]*\\s?(?:" + CURRENCIES + ")(?![A-Za-z])");

// Does the box around this link show a price? (a product tile usually does)
function tileShowsPrice(a) {
  let el = a;
  for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
    const t = el.textContent || "";
    if (t.length > 600) return false;          // got too big: that is a whole list, not one tile
    if (PRICE.test(t)) return true;
  }
  return false;
}

// A product link (with a picture) -> its address without #tracking bits, else null.
function productKey(a) {
  if (!a.querySelector("img, picture")) return null;
  if (a.closest("header, nav, footer")) return null;
  let url;
  try { url = new URL(a.href, location.href); } catch (e) { return null; }
  if (url.origin !== location.origin) return null;
  if (url.pathname === location.pathname) return null;
  if (url.pathname.length < 2) return null;
  // typical product addresses, or (for shops with unusual addresses) a tile that shows a price
  if (!PRODUCT_HINT.test(url.pathname + url.search) && !tileShowsPrice(a)) return null;
  const key = url.origin + url.pathname + url.search;
  return { key, href: key };
}

// ---- finding the whole product tile ----
// Tiles often hold colour swatches that link to OTHER products, so "stop at the first foreign link"
// is unreliable. Instead: a tile is the lowest big box that has several similar siblings, each
// with a product link in it (that is what a product grid looks like).
const classOf = (e) => ([...e.classList].filter((c) => !/^sff-/.test(c))[0] || "").replace(/[-_]\d+$/, "");   // "grid-item-2" and "grid-item-3" are the same kind of box
const BIG = (r) => r.width === 0 || (r.width >= 100 && r.height >= 100);   // hidden boxes (0 wide) cannot be judged

// a box that only wraps the tile (a list item around a div) belongs to the tile
function wrapOutward(el) {
  while (el.parentElement && !/^(BODY|MAIN|HTML)$/.test(el.parentElement.tagName) && el.parentElement.children.length === 1) {
    el = el.parentElement;
  }
  return el;
}

function tileFor(a, p, linkSet, links, keyOf) {
  const linksIn = (box) => [...(linkSet.has(box) ? [box] : []), ...[...box.querySelectorAll("a[href]")].filter((x) => linkSet.has(x))];   // the box itself may be the link
  // does this box show just ONE product? (swatches are small; a row of products has several big pictures)
  const oneProduct = (box) => {
    const ls = linksIn(box).map((x) => { const r = x.getBoundingClientRect(); return { key: keyOf.get(x), area: r.width * r.height }; });
    const max = Math.max(0, ...ls.map((l) => l.area));
    if (!max) return true;
    return new Set(ls.filter((l) => l.area >= max * 0.5).map((l) => l.key)).size === 1;
  };
  const marked = a.closest("[data-sff]");        // a tile we already handled (hidden tiles have no size to measure)
  if (marked) {
    if (oneProduct(marked)) return marked;
    unmark(marked);                              // it was chosen when only one product of the row had appeared and now covers several: start again
  }
  // many shops use <article> for one product tile
  const art = a.closest("article");
  if (art && art.querySelectorAll("a[href]").length <= 30) return wrapOutward(art);
  // levels that look like a repeating grid cell (image-carousel slides count too), lowest first
  const levels = [];
  for (let el = a, i = 0; el.parentElement && i < 12; el = el.parentElement, i++) {
    const parent = el.parentElement;
    if (/^(BODY|MAIN|HTML)$/.test(parent.tagName)) break;
    if (!BIG(el.getBoundingClientRect())) continue;
    const same = [...parent.children].filter((s) => s.tagName === el.tagName && classOf(s) === classOf(el));
    if (same.length >= 3 && same.filter((s) => linksIn(s).length).length >= 3) levels.push(el);
  }
  // the tile = the outermost such level that still shows one product only
  for (let i = levels.length - 1; i >= 0; i--) if (oneProduct(levels[i])) return wrapOutward(levels[i]);
  if (levels.length) return wrapOutward(levels[0]);
  return null;   // no repeating grid around this link: not a product tile (a lookbook picture, a banner...)
}

// The words a shopper can read in a box (script and style data is not text, however long it is).
function tileText(el, cap = 1600) {
  let out = "", n;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (t) => (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(t.parentNode.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  while ((n = walker.nextNode()) && out.length < cap) out += n.nodeValue + " ";
  return out;
}

// A real product tile is small: it never contains the page header, the menu or the whole page.
// A price can also be recognised by what the page calls it, when the currency is only an icon.
const PRICE_ELEMENT = '[class*="price" i], [data-testid*="price" i], [data-test*="price" i], [data-qa*="price" i], [itemprop="price"], [class*="amount" i], [aria-label*="price" i], [aria-label*="preis" i], [aria-label*="prix" i], [aria-label*="precio" i]';
const tileHasPrice = (el) => PRICE.test(tileText(el, 1500)) || !!el.querySelector(PRICE_ELEMENT);

function tileProblem(el) {
  const part = el.querySelector("header, nav, footer, main, [role=navigation], [role=main]");
  if (part) return "contains " + part.tagName.toLowerCase();
  if (tileText(el, 6100).length > 6000) return "too much text";
  const r = el.getBoundingClientRect();
  if (r.width > window.innerWidth * 0.95 && r.height > window.innerHeight * 1.2) return "as big as the page";
  return "";
}
const tileLooksSafe = (el) => !tileProblem(el);

// Zara draws its product tiles without links: a picture tile only carries a product id and a reference number
// ("565424818-02756117807-a1"), and the product page can be reached as /country/language/x-p<8 digits>.html
// (Zara sends it on to the real address). The name and price sit in a neighbouring box, so they are hidden along with the picture.
const followers = new WeakSet();   // boxes that are hidden with their product but get no label of their own
function linklessCards() {
  const cards = new Map();
  if (!/(^|\.)zara\.com$/.test(location.hostname)) return cards;
  const [, country, lang] = location.pathname.split("/");
  if (!/^[a-z]{2}$/i.test(country || "") || !/^[a-z]{2}$/i.test(lang || "")) return cards;
  document.querySelectorAll("li[data-productkey][data-productid]").forEach((li) => {
    const m = /^\d+-(\d{8})\d*-/.exec(li.dataset.productkey);                     // anything else is an editorial banner
    if (!m || li.closest("header, nav, footer") || /[^\d]/.test(li.dataset.productid)) return;
    const href = location.origin + "/" + country + "/" + lang + "/x-p" + m[1] + ".html?v1=" + li.dataset.productid;
    if (!cards.has(href)) cards.set(href, { href, cards: new Set() });
    const set = cards.get(href).cards;
    set.add(li);
    const block = li.closest(".products-category-grid-block");                    // name and price: the info box in the same place of the row
    if (block) {
      const pics = [...block.querySelectorAll("li[data-productkey]")], infos = [...block.querySelectorAll("li.product-grid-block-dynamic__product-info")];
      const info = pics.length === infos.length ? infos[pics.indexOf(li)] : null;
      if (info) { followers.add(info); set.add(info); }
    }
  });
  return cards;
}

// key -> { href, cards:Set }  one entry per product TILE (colour variants inside a tile are not separate products)
function findCards() {
  const links = [...document.querySelectorAll("a[href]")]
    .map((a) => ({ a, p: productKey(a) }))
    .filter((x) => x.p);
  const linkSet = new Set(links.map((x) => x.a));
  const keyOf = new Map(links.map((x) => [x.a, x.p.key]));
  const tiles = new Map();                       // tile element -> its product links
  links.forEach((l) => {
    const el = tileFor(l.a, l.p, linkSet, links, keyOf);
    if (!el) return;
    if (tileProblem(el)) return;
    // colour swatches and tiny thumbnails also link to products, but they are not product tiles
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 70 || r.height < 70)) return;
    if (!tiles.has(el)) tiles.set(el, []);
    tiles.get(el).push(l);
  });
  // a shopping list = several similar tiles, most of them showing a price. One or two tiles on a page
  // (a lookbook, an article, a home page) is not a list, and then we leave the page completely alone.
  const priced = [...tiles.keys()].filter(tileHasPrice).length;
  const linkless = linklessCards();
  if (tiles.size < MIN_TILES || priced < tiles.size * 0.5) return linkless.size >= MIN_TILES ? linkless : new Map();
  const cards = linkless;
  tiles.forEach((list, el) => {
    // the tile's own product = its biggest picture link
    const area = (l) => { const r = l.a.getBoundingClientRect(); return r.width * r.height; };
    const main = list.reduce((best, l) => (area(l) > area(best) ? l : best), list[0]);
    if (!cards.has(main.p.key)) cards.set(main.p.key, { href: main.p.href, cards: new Set() });
    cards.get(main.p.key).cards.add(el);
  });
  return cards;
}

// ---------- showing / hiding ----------

function unmark(el) {
  el.classList.remove("sff-pending", "sff-hidden", "sff-ghost", "sff-ok");
  el.querySelectorAll(":scope > .sff-badge").forEach((b) => b.remove());
  delete el.dataset.sff;
}

function mark(card, verdict, reason, info) {
  if (info && info.blocked) {                                  // the shop would not tell us: leave the tile as the shop made it
    card.classList.remove("sff-pending", "sff-hidden", "sff-ghost", "sff-ok");
    card.querySelectorAll(".sff-badge").forEach((b) => b.remove());
    delete card.dataset.sff;
    return;
  }
  // do nothing if already in this state (otherwise our own badge would retrigger the page watcher forever)
  const certs = info && info.certs ? info.certs.join(",") : "";
  const state = verdict + "|" + (reason || "") + "|" + certs + "|" + ((info && info.note) || "") + "|" + ((info && info.lining) || "");
  if (enabled && card.dataset.sff === state) return;
  const before = card.dataset.sff;
  if (before && before !== state && !before.startsWith("pending") && !state.startsWith("pending")) {     // a tile changing its mind (used by the report)
    diag.flips++;
    const now = Date.now();
    flipTimes.push(now);
    while (flipTimes.length && now - flipTimes[0] > FLIP_WINDOW) flipTimes.shift();
    if (flipTimes.length >= FLIP_LIMIT) goKeepSpace();
    if (!diag.flipExample) diag.flipExample = before.split("|").slice(0, 2).join("|") + " -> " + state.split("|").slice(0, 2).join("|");
  }
  card.classList.remove("sff-pending", "sff-hidden", "sff-ghost", "sff-ok");
  card.querySelectorAll(".sff-badge").forEach((b) => b.remove());
  delete card.dataset.sff;
  if (!enabled) return;
  card.dataset.sff = state;
  if (verdict === "ok") {
    card.classList.add("sff-ok");
    if (followers.has(card)) return;
    if (getComputedStyle(card).position === "static") card.style.position = "relative";   // the label needs a positioned tile; one the shop already positions (a carousel slide) stays as it is
    card.appendChild(sffBadge({ reason, certs: (info && info.certs) || [], fibreKeys: (info && info.fibreKeys) || [], note: (info && info.note) || "", lining: (info && info.lining) || "" }));
  } else if (verdict === "pending") {
    card.classList.add("sff-pending");
  } else if (verdict === "bad" || hideUnknown) {
    card.classList.add(keepSpace ? "sff-ghost" : "sff-hidden");
  }
}

function pill() {
  let el = document.getElementById("sff-pill");
  if (!el) {
    el = document.createElement("div");
    el.id = "sff-pill";
    document.documentElement.appendChild(el);
  }
  return el;
}

// ---- when you are looking at ONE product page: show its own verdict next to the page ----
let pageResult = null, pageUrl = "", pageTries = 0, pageTimer = null, pageLast = 0;

function probeThisPage() {
  if (!enabled) return;
  if (pageUrl !== location.href) {                      // moved to another page (also in single-page shops)
    pageUrl = location.href; pageResult = null; pageTries = 0;
    const old = document.getElementById("sff-pill");
    if (old) old.remove();
    sffCloseCard();
  }
  if (pageResult || pageTries >= 5) return;
  if (Date.now() - pageLast < 1500) return;                              // a retry is already scheduled
  const productAddress = STRICT_PRODUCT.test(location.pathname);        // a number alone ("...-l19644.html", "...-mkt20169.html") is a category or a lookbook
  // several tiles = a listing, unless the address itself says this is a product ("you may also like" grids are big too)
  if (currentKeys.length >= MIN_TILES && !productAddress) return;
  // a feed whose products are not links shows many prices; a bare number in the address (".../for-you-ou18722.html") does not make it one product
  if (!STRICT_PRODUCT.test(location.pathname) && (document.body.innerText.match(new RegExp(PRICE.source, "g")) || []).length > 12) return;
  pageLast = Date.now();
  const html = document.documentElement.outerHTML;
  if (!productAddress && (!/"@type"\s*:\s*"Product"/.test(html) || /"@type"\s*:\s*"ItemList"/.test(html))) return;   // a list of products is not one product
  pageTries++;
  const r = classifyPage(html);
  // a clear "Composition" heading is required, unless the page address itself says "this is a product"
  if (r.verdict !== "unknown" && (r.strong || productAddress)) { pageResult = r; updatePill(); }
  else { clearTimeout(pageTimer); pageTimer = setTimeout(probeThisPage, 1800); }   // the page may still be building
}

function renderPagePill() {
  const r = pageResult, el = pill();
  el.className = "sff-page sff-page-" + r.verdict;
  let text;
  if (r.verdict === "ok") {
    const chips = sffRank(r.certs).filter(sffChecked).filter((c) => c.type !== "vegan").slice(0, 2).map((c) => sffCertText(c, "short"));
    text = "🌿 " + r.reason + (chips.length ? " · " + chips.join(" · ") : "") + "  ⓘ";
    el.title = sffT("clickCert");
    el.onclick = (e) => { e.stopPropagation(); sffOpenCard(el, r); };
  } else {
    text = "✖ " + sffT("contains", { x: r.reason });
    el.title = sffT("plasticTip");
    el.onclick = null;
  }
  if (el.textContent !== text) el.textContent = text;
}

function updatePill() {
  if (!enabled) return;
  if (pageKind === "off" || pageKind === "other") {      // switched off, or not clothes: never show a badge
    const old = document.getElementById("sff-pill");
    if (old) old.remove();
    return;
  }
  // a single-product verdict only stays while the page is not a list (tiles can show up after the first look)
  if (pageResult && pageUrl === location.href && !(currentKeys.length >= MIN_TILES && !STRICT_PRODUCT.test(location.pathname))) { renderPagePill(); return; }
  let done = 0, ok = 0;
  currentKeys.forEach((k) => {
    const r = memory.get(k);
    if (r || failed.has(k)) done++;
    if (r && r.verdict === "ok") ok++;
  });
  const total = currentKeys.length;
  const left = total - done;
  if (total === 0) {                       // not a product listing (yet): no badge
    const old = document.getElementById("sff-pill");
    if (old) old.remove();
    return;
  }
  const el = pill();
  if (el.classList.contains("sff-page")) { el.className = ""; el.onclick = null; el.title = ""; }   // back to listing mode
  if (isPaused()) {
    el.classList.remove("sff-busy");
    const text = "⏸ " + sffT("paused");
    if (el.textContent !== text) el.textContent = text;
    return;
  }
  const busy = left > 0 && !idleFar;
  el.classList.toggle("sff-busy", busy);
  const text = busy
    ? sffT("checking", { done, total, ok })
    : "🌿 " + sffT("done", { ok, total: idleFar ? done : total });
  if (el.textContent !== text) el.textContent = text; // only when changed, to keep the page watcher quiet
}

// ---------- reading product pages ----------

function loadStore(cb) {
  chrome.storage.local.get([CACHE_KEY, "enabled", "hideUnverified", "sffDeepHosts", "offHosts", "forceHosts", "sffPaused"], (d) => {
    const until = (d.sffPaused || {})[location.host] || 0;
    if (until > Date.now()) { pausedUntil = until; clearTimeout(pauseTimer); pauseTimer = setTimeout(() => { blockHits = 0; pausedUntil = 0; scan(); }, until - Date.now() + 500); }
    store = d[CACHE_KEY] || {};
    offHosts = d.offHosts || {};
    forceHosts = d.forceHosts || {};
    deepHosts = d.sffDeepHosts || {};
    hideUnknown = d.hideUnverified !== false;
    cb(d.enabled);
  });
}

function saveStoreSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const cutoff = Date.now() - CACHE_DAYS * 864e5;
    let entries = Object.entries(store).filter(([, e]) => e.t > cutoff && e.ver === RULES_VERSION);
    if (entries.length > CACHE_MAX) entries = entries.sort((a, b) => b[1].t - a[1].t).slice(0, CACHE_MAX);
    store = Object.fromEntries(entries);
    chrome.storage.local.set({ [CACHE_KEY]: store });
  }, 1500);
}

function remembered(key) {
  if (memory.has(key)) return memory.get(key);
  const e = store[key];
  if (e && e.ver === RULES_VERSION && Date.now() - e.t < CACHE_DAYS * 864e5) {
    const r = { verdict: e.v, reason: e.r, certs: e.c || [], fibreKeys: e.k || [], note: e.n || "", lining: e.l || "" };
    memory.set(key, r);
    return r;
  }
  return null;
}

// Reads the page as it arrives and stops as soon as the material list is
// in, so we download a small part of each page instead of all of it.
async function readAndClassify(href) {
  const res = await fetch(href, { credentials: "include" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  if (!res.body || !res.body.getReader) return withPresence(await res.text());
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "", hit = -1, tried = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    if (hit < 0) {
      const m = STREAM_HIT.exec(html);
      if (m) hit = m.index;
    }
    if (hit >= 0 && !tried && html.length >= hit + STREAM_EXTRA) {
      tried = true;
      const early = classifyPage(html);
      if (early.verdict !== "unknown") { reader.cancel(); return early; }
    }
  }
  return withPresence(html);
}

// "No list found" although the downloaded page does have a material text: waiting for the page to build itself won't help
function withPresence(html) {
  const r = classifyPage(html);
  if (r.verdict === "unknown" && r.reason === "No material list found") r.present = materialsPresent(html);
  return r;
}

// Some shops build their product pages with JavaScript (the downloaded page is an empty shell).
// For those, open the product in a hidden frame inside this shop's own page, let it build
// itself, and read the finished result. Only a few frames at a time, and only when needed.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let deepRunning = 0;
const deepQueue = [];
async function deepSlot() {
  if (deepRunning >= DEEP_PARALLEL) await new Promise((r) => deepQueue.push(r));
  deepRunning++;
}
function deepRelease() {
  deepRunning--;
  const next = deepQueue.shift();
  if (next) next();
}

async function renderAndClassify(href) {
  await deepSlot();
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1280px;height:900px;border:0;opacity:0;pointer-events:none";
  frame.src = href;
  document.documentElement.appendChild(frame);
  try {
    const t0 = Date.now();
    while (Date.now() - t0 < DEEP_TIMEOUT) {
      await sleep(300);
      let html;
      try { html = frame.contentDocument && frame.contentDocument.documentElement.outerHTML; }
      catch (e) { return { verdict: "unknown", reason: "Page cannot be opened in the background" }; }
      if (!html || html.length < 5000) continue;            // still blank
      if (STREAM_HIT.test(html)) {
        const r = classifyPage(html);
        if (r.verdict !== "unknown") return r;
      }
    }
    try { return classifyPage(frame.contentDocument.documentElement.outerHTML); }
    catch (e) { return { verdict: "unknown", reason: "Page cannot be opened in the background" }; }
  } finally {
    frame.remove();
    deepRelease();
  }
}

const noList = (r) => r.verdict === "unknown" && r.reason === "No material list found";

async function check(job) {
  failed.delete(job.key);
  const known = remembered(job.key);
  if (known) return known;
  const started = Date.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let result;
      if (deepHosts[location.host]) {
        result = await renderAndClassify(job.href);            // this shop is known to need it
      } else {
        result = await readAndClassify(job.href);
        let viaDeep = false;
        if (noList(result) && !result.present) {
          staticMisses++;
          await sleep(250);                                     // shops sometimes send a stripped-down page: one more plain look
          result = await readAndClassify(job.href);
          if (noList(result) && staticHits === 0) {
            // nothing readable in the downloaded page of this shop so far: let the page build itself (slower)
            viaDeep = true;
            result = await renderAndClassify(job.href);
            if (staticMisses >= 3 && staticHits === 0) {        // every product so far: remember for this shop
              deepHosts[location.host] = Date.now();
              chrome.storage.local.set({ sffDeepHosts: deepHosts });
            }
          }
        }
        if (!viaDeep && (result.verdict !== "unknown" || result.present)) staticHits++;     // only plain page reads count as "this shop shows materials in the page"
      }
      // the shop briefly refused the hidden frame (often when several load at once): try again
      if (result.reason && result.reason.startsWith("Page cannot be opened") && attempt < 2) {
        throw new Error("frame blocked");
      }
      memory.set(job.key, result);
      if (result.verdict !== "unknown") blockHits = 0;           // the shop answers again
      if (result.verdict !== "unknown") {
        store[job.key] = { v: result.verdict, r: result.reason, c: result.certs || [], k: result.fibreKeys || [], n: result.note || "", l: result.lining || "", t: Date.now(), ver: RULES_VERSION };
        saveStoreSoon();
      }
      return result;
    } catch (e) {
      if (/^HTTP (403|429|503)$/.test(e.message)) {            // the shop says no: do not try this one again right now, and count it
        if (++blockHits >= BLOCK_LIMIT) pauseShop();
        const tries = (failedTries.get(job.key) || 0) + 1;
        failedTries.set(job.key, tries);
        if (tries >= MAX_FAILED_VISITS) memory.set(job.key, { verdict: "unknown", reason: "Could not load" });
        return { verdict: "unknown", reason: "Shop is limiting access", blocked: true };
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  const result = { verdict: "unknown", reason: "Could not load" };
  const tries = (failedTries.get(job.key) || 0) + 1;
  failedTries.set(job.key, tries);
  if (tries >= MAX_FAILED_VISITS) memory.set(job.key, result);   // the shop keeps refusing (bot check, outage): stop asking on this page visit
  else failed.add(job.key);                                      // not remembered, so a later scan retries
  return result;
}

// closest to the top of the screen first, so what you look at is checked first
function takeNext() {
  let best = -1, bestScore = Infinity;
  const n = Math.min(queue.length, 300);
  for (let i = 0; i < n; i++) {
    const c = [...queue[i].cards][0];
    if (!c || !c.isConnected) { queue.splice(i, 1); return takeNext(); }      // the tile is gone from the page
    const top = c.getBoundingClientRect().top;
    const near = top < window.innerHeight * LOOKAHEAD && top > -window.innerHeight * 2;
    if (!near) continue;                                                      // far away: later, when you scroll there
    const score = top < -200 ? 1e6 - top : Math.abs(top);
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best < 0 ? null : queue.splice(best, 1)[0];
}

function pump() {
  if (isPaused()) return;
  const wasIdle = idleFar;
  idleFar = false;
  while (enabled && running < MAX_PARALLEL && queue.length) {
    const job = takeNext();
    if (!job) { idleFar = running === 0; break; }
    running++;
    inflight.set(job.key, job);
    check(job).then((r) => {
      running--;
      inflight.delete(job.key);
      ready.push({ job, r });
      if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS);
      pump();
    });
  }
  if (idleFar !== wasIdle) updatePill();
}

// apply finished results in one go, so the page changes in a few smooth steps
function flush() {
  flushTimer = null;
  const batch = ready.splice(0);
  requestAnimationFrame(() => {
    if (pageKind === "off" || pageKind === "other") return;       // results that arrive after switching off are dropped
    batch.forEach(({ job, r }) => job.cards.forEach((c) => mark(c, r.verdict, r.reason, r)));
    updatePill();
    pump();           // hidden tiles close gaps: products further down may now be within reach
  });
}

// ---------- is this a shop at all? ----------
// Search engines, social networks and price-comparison pages can show product pictures with prices too,
// but they are not shopping malls: the extension must leave them alone.
const NOT_SHOPS = new Set([
  "google", "bing", "yahoo", "duckduckgo", "baidu", "naver", "daum", "yandex", "ecosia", "startpage", "qwant",
  "brave", "aol", "seznam", "sogou", "so", "pinterest", "facebook", "instagram", "youtube", "reddit", "twitter",
  "tiktok", "linkedin", "tumblr", "wikipedia", "idealo", "kelkoo", "shopzilla", "pricerunner", "pricegrabber",
  "danawa", "enuri", "google-analytics", "msn", "ask", "dogpile", "lens",
]);
// A shop shows a cart / bag / basket link or button, in the many words shops use for it.
const SHOP_SIGNS = [
  'a[href*="cart" i]', 'a[href*="/bag" i]', 'a[href*="basket" i]', 'a[href*="warenkorb" i]', 'a[href*="panier" i]',
  'a[href*="carrito" i]', 'a[href*="carrello" i]', 'a[href*="winkelwagen" i]', 'a[href*="winkelmand" i]',
  'a[href*="koszyk" i]', 'a[href*="einkaufskorb" i]', 'a[href*="shopping-bag" i]', 'a[href*="shoppingbag" i]', 'a[href*="checkout" i]',
  'a[aria-label*="cart" i]', 'a[aria-label*="bag" i]', 'a[aria-label*="basket" i]', 'a[aria-label*="warenkorb" i]',
  'a[aria-label*="panier" i]', 'a[aria-label*="carrito" i]', 'a[aria-label*="carrello" i]', 'a[aria-label*="korb" i]',
  'button[aria-label*="cart" i]', 'button[aria-label*="bag" i]', 'button[aria-label*="basket" i]',
  '[aria-label*="장바구니"]', '[aria-label*="カート"]', '[aria-label*="买"]', '[aria-label*="购物"]', '[aria-label*="корзин" i]',
  '[class*="minicart" i]', '[class*="mini-cart" i]', '[class*="cart-icon" i]', '[class*="shopping-bag" i]',
  '[data-testid*="cart" i]', '[data-testid*="bag" i]', '[data-test*="cart" i]', '[data-qa*="cart" i]',
  'meta[property="og:type"][content*="product" i]', 'meta[property^="product:"]',
].join(",");
let shopYes = false;     // once a shop sign has been seen on this site, it stays a shop for this visit
// the words shops put on a cart button that has no link or label ("Cart (0)", "Bag", "Warenkorb"...)
const CART_WORDS = /^(?:my |mein |mon |mi |il mio |shopping )?(?:cart|bag|basket|trolley|warenkorb|einkaufskorb|einkaufstasche|panier|carrito|cesta|carrello|winkelwagen|winkelmand|koszyk|sepet|cos|kosz|장바구니|カート|买|购物车|購物車|корзина)\b/i;
function cartByWords() {
  const els = document.querySelectorAll("header a, header button, nav a, nav button, [role=banner] a, [role=banner] button, a, button");
  for (let i = 0; i < els.length && i < 600; i++) {
    const t = (els[i].textContent || "").trim();
    if (t.length > 0 && t.length <= 26 && CART_WORDS.test(t)) return true;
  }
  return false;
}
const siteBlocked = () => location.hostname.toLowerCase().split(".").some((label) => NOT_SHOPS.has(label));
const STRONG_LIST = 8;   // a site with no cart sign still counts as a shop if it shows a grid this big of priced products
function siteIsShop() {
  if (siteBlocked()) return false;
  if (shopYes) return true;
  try { if (document.querySelector(SHOP_SIGNS) || cartByWords()) shopYes = true; } catch (e) { /* odd page: treat as not a shop */ }
  if (!shopYes) {
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].some((t) => /"@type"\s*:\s*"(Product|ProductGroup|Offer)"/.test(t.textContent || ""));
    if (ld) shopYes = true;
  }
  return shopYes;
}

// ---------- clothes, or something else? ----------
// A drugstore or a supermarket has product lists too, but no fibre lists: hiding "everything we cannot verify"
// there would empty the whole shop. So a page is only touched when it is about clothes:
//   1. clothing words in the product names or in the page heading, or else
//   2. at least 3 of the first 8 products have a real material list when we look.
const pageAddress = () => location.origin + location.pathname + location.search;
function pageHeading() {
  const bits = [document.title];
  document.querySelectorAll("h1, [aria-current=page], nav[aria-label*=bread i] li").forEach((e, i) => { if (i < 8) bits.push(e.textContent); });
  return withoutShopName(bits.join(" "));
}
const SHOP_NAME_PARTS = () => location.hostname.toLowerCase().split(".").filter((l) => l.length >= 4 && !["www", "shop", "store", "online", "mobile"].includes(l));
function withoutShopName(text) {
  let t = text;
  SHOP_NAME_PARTS().forEach((p) => { t = t.replace(new RegExp("(?<![\\p{L}])" + p.replace(/[^a-z0-9]/g, "") + "(?![\\p{L}])", "giu"), " "); });   // a shop called "Boots" or "Next" is not selling boots
  return t;
}
function productNames(found) {
  return [...found.values()].slice(0, 60).map((v) => {
    const el = [...v.cards][0];
    const extra = [...el.querySelectorAll("img[alt], a[title], a[aria-label]")].slice(0, 4)
      .map((x) => x.getAttribute("alt") || x.getAttribute("title") || x.getAttribute("aria-label") || "").join(" ");
    return withoutShopName(tileText(el, 300) + " " + extra);
  });
}
async function probeClothing(found, address) {
  if (probingPage === address) return;
  probingPage = address;
  const hrefs = [...found.values()].slice(0, 8).map((v) => v.href);
  const results = await Promise.all(hrefs.map((h) => readAndClassify(h).catch(() => null)));
  const readable = results.filter((r) => r && (r.verdict !== "unknown" || (r.fibres && r.fibres.length))).length;
  kindByPage.set(address, readable >= Math.min(3, hrefs.length) ? "clothing" : "other");
  probingPage = null;
  if (enabled) scan();
}

// The product tiles of this page, but only if it is a shopping list on a shopping site; otherwise null.
function shopAndCards() {
  if (siteBlocked()) return null;                         // search engines, social networks, price comparison
  const signs = siteIsShop();
  if (!signs && document.querySelectorAll("a[href] img").length < STRONG_LIST) return null;   // quick: too few pictures
  const found = findCards();
  if (!signs && found.size < STRONG_LIST) return null;    // no cart sign and no big list of priced products
  if (!signs) shopYes = true;
  return found;
}

function scan() {
  if (!enabled) return;
  diag.scans++;
  diag.scanTimes.push(Date.now());
  if (diag.scanTimes.length > 40) diag.scanTimes.shift();
  if (offHosts[location.host]) {                          // switched off for this website by the user
    pageKind = "off";
    if (document.querySelector("[data-sff], #sff-pill")) clearAll();
    return;
  }
  const found = shopAndCards();
  if (!found) {                                           // not a shop: do nothing at all (and undo anything done before)
    if (document.querySelector("[data-sff], #sff-pill")) clearAll();
    return;
  }
  if (!found.size && document.querySelector("[data-sff]")) clearAll();      // moved to a page that is not a shopping list
  pageKind = "";
  if (found.size && !forceHosts[location.host]) {
    const address = pageAddress();
    let kind = kindByPage.get(address);
    if (!kind) {
      const names = productNames(found);
      // cushions, curtains, bedding... decide only when clothing words are scarce (a mixed page with sweaters stays clothing)
      if (sffLooksLikeHome(names) && names.filter(sffMentionsClothes).length < names.length * 0.5) { kind = "other"; kindByPage.set(address, kind); }
      else if (sffLooksLikeClothing(names, pageHeading())) { kind = "clothing"; kindByPage.set(address, kind); }
      else { pageKind = "checking"; probeClothing(found, address); return; }    // untouched while we find out
    }
    if (kind === "other") {                                // not clothes: leave the page exactly as the shop made it
      pageKind = "other";
      if (document.querySelector("[data-sff], #sff-pill")) clearAll();
      return;
    }
  }
  if (found.size) pageKind = "clothing";
  currentKeys = [...found.keys()];
  diag.keysMin = Math.min(diag.keysMin, currentKeys.length);
  diag.keysMax = Math.max(diag.keysMax, currentKeys.length);
  found.forEach(({ href, cards }, key) => {
    const known = remembered(key);
    cards.forEach((card) => {
      if (known) mark(card, known.verdict, known.reason, known);
      else if (!isPaused() && !card.classList.contains("sff-hidden") && !card.classList.contains("sff-ghost")) mark(card, "pending");
    });
    if (known) return;
    const job = queue.find((q) => q.key === key) || inflight.get(key);
    if (job) cards.forEach((c) => job.cards.add(c));
    else queue.push({ key, href, cards: new Set(cards) });
  });
  updatePill();
  probeThisPage();
  pump();
}

// What the popup's "copy report" button hands over: counts and shapes only. The address has no query part,
// and no page text, names or prices are included.
function buildReport() {
  const now = Date.now(), verdicts = {};
  memory.forEach((r) => { const k = r.verdict + (r.verdict === "unknown" ? "|" + r.reason : ""); verdicts[k] = (verdicts[k] || 0) + 1; });
  const tiles = [...document.querySelectorAll("[data-sff]")];
  return {
    report: "Only Natural", version: chrome.runtime.getManifest().version,
    page: location.origin + location.pathname, viewport: innerWidth + "x" + innerHeight,
    kind: pageKind, enabled, paused: isPaused(),
    pill: (document.getElementById("sff-pill") || {}).textContent || null,
    products: currentKeys.length, tiles: tiles.length,
    ok: document.querySelectorAll(".sff-ok").length, hidden: document.querySelectorAll(".sff-hidden, .sff-ghost").length, keepSpace, pending: document.querySelectorAll(".sff-pending").length,
    queue: queue.length, running, deepRunning, failed: failed.size, failedTries: failedTries.size, blockHits, verdicts,
    scans: diag.scans, scansLast10s: diag.scanTimes.filter((t) => now - t < 10000).length, pageChanges: diag.observed,
    flips: diag.flips, flipExample: diag.flipExample, productRange: (diag.keysMin === Infinity ? 0 : diag.keysMin) + "-" + diag.keysMax,
    tileSample: tiles.slice(0, 6).map((t) => { const r = t.getBoundingClientRect(); return t.tagName.toLowerCase() + "." + classOf(t).slice(0, 30) + " " + Math.round(r.width) + "x" + Math.round(r.height); }),
  };
}

function clearAll() {
  queue.length = 0;
  ready.length = 0;
  document.querySelectorAll(".sff-pending, .sff-hidden, .sff-ghost, .sff-ok").forEach((el) => {
    el.classList.remove("sff-pending", "sff-hidden", "sff-ghost", "sff-ok");
    delete el.dataset.sff;
  });
  document.querySelectorAll(".sff-badge, #sff-pill").forEach((b) => b.remove());
  sffCloseCard();
  pageResult = null; pageUrl = ""; pageTries = 0; clearTimeout(pageTimer);
}

function setEnabled(on) {
  enabled = !!on;
  if (enabled) scan(); else clearAll();
}

// pick up products loaded later (scrolling, page changes)
const ours = (n) => n.nodeType === 1 && (n.id === "sff-pill" || n.id === "sff-card" || n.classList.contains("sff-badge"));
new MutationObserver((records) => {
  if (!enabled) return;
  // ignore changes we made ourselves (status bubble, labels, info card)
  const mine = records.every((r) =>
    (r.target.closest && r.target.closest("#sff-pill, #sff-card")) ||
    (r.addedNodes.length + r.removedNodes.length > 0 &&
      [...r.addedNodes, ...r.removedNodes].every(ours)));
  if (mine) return;
  clearTimeout(scanTimer);
  diag.observed++;
  scanTimer = setTimeout(scan, 400);
}).observe(document.documentElement, { childList: true, subtree: true });

let scrollTimer = null;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => { if (enabled && queue.length) pump(); }, 120);
}, { passive: true });

loadStore(setEnabled);
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg && msg.type === "sff-status") respond({ host: location.host, kind: pageKind, off: !!offHosts[location.host], forced: !!forceHosts[location.host] });
  if (msg && msg.type === "sff-report") respond(buildReport());
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.offHosts || changes.forceHosts) {
    offHosts = (changes.offHosts ? changes.offHosts.newValue : offHosts) || {};
    forceHosts = (changes.forceHosts ? changes.forceHosts.newValue : forceHosts) || {};
    if (enabled) { clearAll(); scan(); }
  }
  if (changes.hideUnverified) {
    hideUnknown = changes.hideUnverified.newValue !== false;
    if (enabled) { clearAll(); scan(); } // results are remembered, so this is instant
  }
  if (changes.enabled) setEnabled(changes.enabled.newValue);
});
