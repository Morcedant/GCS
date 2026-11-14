// The browser game: the hex map on a canvas, the side panel, the turn bar and the dialogs.
import { key, parse, toPixel, fromPixel, distance, within } from "./hex.js";
import { FACTIONS, WORLDS, BUILDINGS, SHIPS, TECHS, RULES, PROTOTYPES, FOCUS, STANCES, SHIP_SHAPES, PERSONALITIES, ADMIRAL_TRAITS, ADMIRAL_STEPS } from "./data.js";
import { newGame, endTurn, faction, player, coloniesOf, fleetsOf, fleetsAt, shipStats, fleetSpeed, armed, atWar, canSettle, maxPop, yields, totals,
  buildOptions, enqueue, dequeue, rush, rushCost, availableTechs, setResearch, setDestination, findPath, splitFleet, settle, invade, invasionOdds, barrage, barrageTargets,
  declareWar, propose, score, militaryPower, has, mergeFleets, DISCOVERY, focusOf, focusUsed, setFocus, inSupply, supplyRange, setStance, keepRuling, retire, proto, admTitle, admRank, admiralsOf, admiralCap, assignAdmiral, relieveAdmiral, allied } from "./game.js";
import { aiTurn } from "./ai.js";
import { eventsTurn, currentEvent, chooseEvent } from "./events.js";
import { crisisTurn, crisisState } from "./crisis.js";
import { envoysTurn, currentEnvoy, answerEnvoy, attitude } from "./envoys.js";
import { ensureDirectives, checkDirectives, directivesTurn, acceptDirective, progress, howText, authorityOf, opposition, ACTIVE_MAX, CAMPAIGNS, campaignDef, campaignText } from "./orders.js";
const VERSION = typeof BUILD === "string" ? BUILD : "development";
/** "Turn 12 of 200", or in open rule "Turn 212 · open rule". */
const turnText = () => (S.mode === "open" ? `Turn ${S.turn} · open rule` : `Turn ${S.turn} of ${RULES.maxTurns}`);

const SAVE_KEY = "fracture-dominion.save.v1";
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");
const signed = (n) => (n >= 0 ? "+" : "−") + fmt(Math.abs(n));
const store = { get: () => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(SAVE_KEY, v); } catch {} } };

let S = null;                 // the game
let sel = null;               // { kind: "system"|"fleet", id }
let moveMode = false;
let tab = "selected";
const view = { x: 0, y: 0, zoom: 1, size: 26 };
let hoverHex = null;

// ---------- start ----------
// For automated tests only (?debug in the address): the game state, and where a hex is on screen.
function debugHook() {
  try { if (!/[?&]debug\b/.test(location.search)) return; } catch { return; }
  window.__dominion = { state: () => S, screenOf: (hex) => { const c = canvas(), r = c.getBoundingClientRect(), p = toPixel(hex, view.size); return { x: r.left + r.width / 2 + (p.x - view.x) * view.zoom, y: r.top + r.height / 2 + (p.y - view.y) * view.zoom }; }, centerOn: (h) => { centerOn(h); draw(); } };
}
function boot() {
  bindMap();
  bindChrome();
  debugHook();
  const saved = store.get();
  if (saved) showNewGame(true); else showStarter(false);
}
function startGame(state) {
  S = state; sel = null; moveMode = false; tab = "selected";
  const cap = S.systems[player(S).capital];
  centerOn(cap.at); view.zoom = 1;
  select({ kind: "system", id: cap.id });
  tab = "objectives";   // the game opens on the race to win; the capital is selected, a click away
  ensureDirectives(S);
  $("app").hidden = false; closeModal();
  renderAll(); renderSteps();
  if (S.turn === 1 && !guideOn()) toast(`You lead ${player(S).name}. Explore, settle, and find out who else is out here.`);
}
function save() { if (S) store.set(JSON.stringify(S)); }

// ---------- the map ----------
const canvas = () => $("map");
function centerOn(hex) { const p = toPixel(hex, view.size); view.x = p.x; view.y = p.y; }
function screenToHex(cx, cy) {
  const c = canvas(), r = c.getBoundingClientRect();
  const x = (cx - r.left - r.width / 2) / view.zoom + view.x, y = (cy - r.top - r.height / 2) / view.zoom + view.y;
  return fromPixel(x, y, view.size);
}
function bindMap() {
  const c = canvas();
  let drag = null, moved = false;
  c.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, button: e.button }; moved = false; c.setPointerCapture(e.pointerId); });
  c.addEventListener("pointermove", (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      if (moved) { view.x = drag.vx - dx / view.zoom; view.y = drag.vy - dy / view.zoom; draw(); }
    }
    const h = screenToHex(e.clientX, e.clientY);
    if (h !== hoverHex) { hoverHex = h; if (moveMode || (sel && sel.kind === "fleet")) draw(); }
  });
  c.addEventListener("pointerup", (e) => {
    const d = drag; drag = null;
    if (!S || moved || !d) return;
    const hex = screenToHex(e.clientX, e.clientY);
    if (!S.hexes[hex]) return;
    if (d.button === 2 || moveMode) { orderMove(hex); return; }
    clickHex(hex);
  });
  c.addEventListener("contextmenu", (e) => e.preventDefault());
  c.addEventListener("wheel", (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  new ResizeObserver(() => draw()).observe(c);
}
function zoomBy(f) { view.zoom = Math.max(0.35, Math.min(2.6, view.zoom * f)); draw(); }
function clickHex(hex) {
  const me = player(S).id;
  const fl = fleetsAt(S, hex).filter((f) => f.owner === me || player(S).visible[hex]);
  const sid = S.sysAt[hex];
  // Click again on a hex with both: alternate between the fleet and the system.
  const mine = fl.filter((f) => f.owner === me);
  if (mine.length && !(sel && sel.kind === "fleet" && mine.some((f) => f.id === sel.id) && sid)) {
    const i = sel && sel.kind === "fleet" ? mine.findIndex((f) => f.id === sel.id) : -1;
    select({ kind: "fleet", id: mine[(i + 1) % mine.length].id });
  } else if (sid && player(S).explored[hex]) select({ kind: "system", id: sid });
  else if (fl.length) select({ kind: "fleet", id: fl[0].id });
  else { sel = null; renderPanel(); draw(); }
}
function select(x) { sel = x; moveMode = false; tab = "selected"; renderTabs(); renderPanel(); draw(); }
function orderMove(hex) {
  if (!sel || sel.kind !== "fleet") return;
  const f = S.fleets[sel.id];
  if (!f || f.owner !== player(S).id) return;
  const r = setDestination(S, f.id, hex);
  moveMode = false;
  if (!r.error && f.ships.some((x) => x.type === "scout") && S.tutorial) S.tutorial.scouted = true;
  if (r.error) toast(r.error, true); else if (hex !== f.at) toast(`On course: ${r.turns} turn${r.turns === 1 ? "" : "s"}.`);
  save(); renderPanel(); renderSteps(); draw(); renderCoach();
}

function territory() {
  // Each hex within 2 of a world belongs to the nearest one (ties: the bigger world).
  const own = {};
  for (const sys of Object.values(S.systems)) {
    if (!sys.colony) continue;
    const reach = sys.colony.kind === "colony" ? 2 : 1;
    for (const k of within(sys.at, reach)) {
      if (!S.hexes[k]) continue;
      const d = distance(k, sys.at), cur = own[k];
      if (!cur || d < cur.d) own[k] = { d, owner: sys.colony.owner };
    }
  }
  return own;
}
// ---------- ship outlines ----------
const SHIP_PATHS = {};
/** The biggest ship in a fleet: what the map draws for it. */
const flagship = (f) => f.ships.reduce((a, x) => (!a || SHIPS[x.type].cost > SHIPS[a].cost ? x.type : a), null) || "frigate";
function drawShip(ctx, kind, x, y, angle, scale, color, ring) {
  const p = SHIP_PATHS[kind] || (SHIP_PATHS[kind] = new Path2D(SHIP_SHAPES[kind] || SHIP_SHAPES.frigate));
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.lineJoin = "round"; ctx.lineWidth = (ring ? 3.6 : 2.8) / scale; ctx.strokeStyle = ring || "rgba(3,5,10,.85)"; ctx.stroke(p);
  ctx.globalAlpha = 0.35; ctx.fillStyle = color; ctx.fill(p); ctx.globalAlpha = 1;
  ctx.lineWidth = 1.4 / scale; ctx.strokeStyle = color; ctx.stroke(p);
  ctx.restore();
}
/** The same outline as a little SVG, for the panels. */
const shipSVG = (kind, color, px = 26) => `<svg width="${px}" height="${px}" viewBox="-13.5 -13.5 27 27" style="vertical-align:middle;flex:none" aria-hidden="true"><path d="${SHIP_SHAPES[kind]}" fill="${color}" fill-opacity=".25" stroke="${color}" stroke-width=".9" stroke-linejoin="round"/></svg>`;
function hexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath();
}
let stars = null;
function draw() {
  const c = canvas(); if (!c || !S) return;
  const dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#05070d"; ctx.fillRect(0, 0, W, H);
  if (!stars) { stars = Array.from({ length: 260 }, () => [Math.random(), Math.random(), Math.random()]); }
  for (const [sx, sy, b] of stars) { ctx.fillStyle = `rgba(200,210,255,${0.15 + b * 0.5})`; ctx.fillRect(sx * W, sy * H, b > 0.85 ? 2 : 1, b > 0.85 ? 2 : 1); }
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(view.zoom, view.zoom); ctx.translate(-view.x, -view.y);
  const me = player(S), size = view.size, own = territory();
  const colorOf = (fid) => faction(S, fid).color;
  // Hexes.
  for (const [k, h] of Object.entries(S.hexes)) {
    const { x, y } = toPixel(k, size);
    const explored = me.explored[k], visible = me.visible[k];
    hexPath(ctx, x, y, size - 0.5);
    if (!explored) { ctx.fillStyle = "#0a0d16"; ctx.fill(); ctx.strokeStyle = "rgba(90,110,160,.08)"; ctx.stroke(); continue; }
    ctx.fillStyle = h.terrain === "nebula" ? "rgba(120,70,160,.32)" : h.terrain === "rift" ? "rgba(150,30,30,.45)" : "rgba(30,40,70,.35)";
    ctx.fill();
    if (own[k]) { ctx.fillStyle = colorOf(own[k].owner) + (visible ? "33" : "22"); ctx.fill(); }
    if (!visible) { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill(); }
    ctx.strokeStyle = h.terrain === "rift" ? "rgba(220,70,60,.6)" : "rgba(120,140,200,.16)"; ctx.lineWidth = 1; ctx.stroke();
    if (h.terrain === "rift") { ctx.strokeStyle = "rgba(255,120,90,.55)"; ctx.beginPath(); ctx.moveTo(x - size * 0.5, y - size * 0.2); ctx.lineTo(x - size * 0.1, y + size * 0.15); ctx.lineTo(x + size * 0.15, y - size * 0.15); ctx.lineTo(x + size * 0.5, y + size * 0.2); ctx.stroke(); }
  }
  // Corridors between systems you know.
  ctx.lineWidth = 2.2;
  for (const [a, b] of S.corridors) {
    const A = S.systems[a], B = S.systems[b];
    if (!me.explored[A.at] || !me.explored[B.at]) continue;
    const p = toPixel(A.at, size), q = toPixel(B.at, size);
    ctx.strokeStyle = "rgba(110,200,230,.28)"; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Systems.
  for (const sys of Object.values(S.systems)) {
    if (!me.explored[sys.at]) continue;
    const { x, y } = toPixel(sys.at, size), w = WORLDS[sys.world], r = 5 + sys.size * 1.6;
    ctx.fillStyle = w.color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (sys.colony) {
      ctx.strokeStyle = colorOf(sys.colony.owner); ctx.lineWidth = sys.colony.kind === "colony" ? 3 : 2;
      ctx.setLineDash(sys.colony.kind === "outpost" ? [3, 3] : []);
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      if (sys.colony.capital) { ctx.fillStyle = colorOf(sys.colony.owner); ctx.beginPath(); ctx.moveTo(x, y - r - 13); ctx.lineTo(x + 5, y - r - 6); ctx.lineTo(x - 5, y - r - 6); ctx.closePath(); ctx.fill(); }
    }
    if (sys.exotics) { ctx.fillStyle = "#e9c7ff"; ctx.beginPath(); ctx.moveTo(x + r + 6, y - 4); ctx.lineTo(x + r + 9, y); ctx.lineTo(x + r + 6, y + 4); ctx.lineTo(x + r + 3, y); ctx.closePath(); ctx.fill(); }
    if (sys.ruins) { ctx.fillStyle = "#ffd36b"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.fillText("?", x - r - 10, y + 4); }
    if (view.zoom > 0.55) {
      ctx.font = `${sel && sel.id === sys.id ? "bold " : ""}11px system-ui, sans-serif`; ctx.textAlign = "center";
      ctx.fillStyle = sys.colony ? "#e8eefc" : "rgba(200,210,235,.7)"; ctx.fillText(sys.name, x, y + r + 15);
      if (sys.colony && sys.colony.kind === "colony" && (sys.colony.owner === me.id || me.visible[sys.at])) { ctx.fillStyle = "rgba(200,210,235,.75)"; ctx.font = "10px system-ui, sans-serif"; ctx.fillText(String(sys.colony.pop), x, y + 3.5); }
      ctx.textAlign = "left";
    }
  }
  // The selected fleet's course.
  const sf = sel && sel.kind === "fleet" && S.fleets[sel.id];
  if (sf && sf.owner === me.id) {
    let path = sf.path;
    if (moveMode && hoverHex && S.hexes[hoverHex]) path = findPath(S, sf.owner, sf.at, hoverHex) || [];
    if (path.length) {
      const sp = fleetSpeed(S, sf);
      ctx.strokeStyle = moveMode ? "rgba(255,230,140,.85)" : "rgba(140,230,255,.85)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); let p = toPixel(sf.at, size); ctx.moveTo(p.x, p.y);
      let used = 0, turn = 1;
      for (const st of path) {
        p = toPixel(st.hex, size); ctx.lineTo(p.x, p.y);
        used += st.cost;
        if (used > sp * turn + 1e-9) turn++;
      }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle; ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText(`${Math.ceil(used / sp)}t`, p.x + 8, p.y - 8);
    }
  }
  // Fleets you can see.
  const byHex = {};
  for (const f of Object.values(S.fleets)) if (f.owner === me.id || me.visible[f.at]) (byHex[f.at] = byHex[f.at] || []).push(f);
  for (const [hex, list] of Object.entries(byHex)) {
    const { x, y } = toPixel(hex, size);
    list.forEach((f, i) => {
      const fx = x - 11 + i * 13, fy = y - 15;
      const war = f.owner !== me.id && atWar(S, me.id, f.owner);
      // The fleet's outline: its biggest ship, pointing where it's going.
      const ring = sel && sel.id === f.id ? "#fff6b0" : war ? "#ff6b5b" : null;
      const to = f.path.length ? toPixel(f.path[0].hex, size) : null, angle = to ? Math.atan2(to.y - y, to.x - x) : 0;
      drawShip(ctx, flagship(f), fx, fy, angle, 0.62, colorOf(f.owner), ring);
      if (f.ships.length > 1 && view.zoom > 0.5) { ctx.fillStyle = "#fff"; ctx.font = "bold 9px system-ui, sans-serif"; ctx.fillText(String(f.ships.length), fx + 7, fy - 6); }
    });
  }
  // The Heart of the Wardens, once it's woken: a ring of their colour round its hex.
  const cr = S.crisis && S.crisis.stage === "awake" && S.crisis.heart;
  if (cr && me.explored[cr]) { const { x, y } = toPixel(cr, size); ctx.beginPath(); ctx.arc(x, y, size * 0.92, 0, Math.PI * 2); ctx.strokeStyle = colorOf("wardens"); ctx.lineWidth = 2.5; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    if (view.zoom > 0.45) { ctx.fillStyle = colorOf("wardens"); ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("THE HEART", x, y + size * 0.92 + 11); ctx.textAlign = "left"; } }
  // Hover and selection rings.
  if (sel && sel.kind === "system") { const { x, y } = toPixel(S.systems[sel.id].at, size); hexPath(ctx, x, y, size - 1); ctx.strokeStyle = "#fff6b0"; ctx.lineWidth = 2; ctx.stroke(); }
  if (moveMode && hoverHex && S.hexes[hoverHex]) { const { x, y } = toPixel(hoverHex, size); hexPath(ctx, x, y, size - 1); ctx.strokeStyle = "rgba(255,230,140,.9)"; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}

// ---------- the bar and the panels ----------
function renderAll() { renderBar(); renderTabs(); renderPanel(); renderSteps(); draw(); renderCoach(); }
function renderBar() {
  const me = player(S), t = totals(S, me.id), R = me.research, tech = R.current && TECHS.find((x) => x.id === R.current);
  $("bar-faction").innerHTML = `<span class="dot" style="background:${me.color}"></span>${esc(me.name)}`;
  $("bar-stats").innerHTML = [
    `<span title="Credits: income minus upkeep each turn"><b>Credits</b> ${fmt(me.credits)} <i class="${t.net < 0 ? "neg" : ""}">${signed(t.net)}</i></span>`,
    `<span title="Industry from all your worlds"><b>Industry</b> ${fmt(t.ind)}</span>`,
    `<span title="Research each turn"><b>Science</b> ${fmt(t.sci)}${tech ? ` → ${esc(tech.name)} ${Math.floor((R.progress / tech.cost) * 100)}%` : ` <i class="neg">pick research</i>`}</span>`,
    `<span title="Exotics: for cruisers, dreadnoughts and great works"><b>Exotics</b> ${me.exotics} <i>${signed(t.exo)}</i></span>`,
  ].join("");
  $("bar-turn").textContent = turnText();
  const idle = idleThings().length; $("next").textContent = idle ? `Next (${idle})` : "Next"; $("next").title = "Idle fleets, and worlds with nothing to build (N)";
  $("end-turn").disabled = !!S.winner;
}
function renderTabs() {
  const offers = S ? S.offers.filter((o) => o.to === player(S).id).length : 0;
  document.querySelectorAll("[data-tab]").forEach((b) => { b.setAttribute("aria-selected", String(b.dataset.tab === tab)); if (b.dataset.tab === "diplomacy") b.textContent = offers ? `Diplomacy (${offers})` : "Diplomacy"; });
}
function renderPanel() {
  const P = $("panel");
  if (tab === "objectives") P.innerHTML = objectivesHTML();
  else if (tab === "mission") P.innerHTML = missionHTML();
  else if (tab === "selected") P.innerHTML = sel ? (sel.kind === "fleet" ? fleetHTML() : systemHTML()) : `<p class="muted">Select a world or a fleet on the map. Drag to pan, scroll or use the buttons to zoom. With a fleet selected, right-click a hex (or press <b>Move</b>) to send it there.</p>`;
  else if (tab === "empire") P.innerHTML = empireHTML();
  else if (tab === "research") P.innerHTML = researchHTML();
  else if (tab === "diplomacy") P.innerHTML = diplomacyHTML();
  else if (tab === "log") { P.innerHTML = logHTML(); P.scrollTop = P.scrollHeight; }
}
const bar = (v, max, color) => `<span class="meter"><span style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%;background:${color || "var(--accent)"}"></span></span>`;
function systemHTML() {
  const sys = S.systems[sel.id], me = player(S), w = WORLDS[sys.world], c = sys.colony;
  const mine = c && c.owner === me.id, seen = me.visible[sys.at];
  let h = `<h2>${esc(sys.name)}</h2><p class="muted">${esc(w.name)} world, size ${sys.size}${sys.rich !== 1 ? `, ${sys.rich > 1 ? "rich" : "poor"} in minerals` : ""}${sys.exotics ? ", <b class=\"exo\">exotics deposit</b>" : ""}${sys.ruins ? ", <b class=\"gold\">ancient ruins</b>" : ""}.</p>`;
  if (!c) h += `<p>${w.outpostOnly ? "No one can live here, but an outpost can claim it." : w.needs && !has(S, me.id, w.needs) ? `Needs <b>${esc(TECHS.find((t) => t.id === w.needs).name)}</b> to settle; an outpost can claim it now.` : "Unclaimed. A colony ship can settle it."}</p>`;
  else if (!mine) h += `<p>Held by <b style="color:${faction(S, c.owner).color}">${esc(faction(S, c.owner).name)}</b>${c.kind === "outpost" ? " (outpost)" : seen ? `, population ${c.pop}${c.capital ? ", their capital" : ""}` : ""}.${seen && (c.buildings.battery || c.capital) ? ` Orbital guns: ${c.defense} hull.` : ""}</p>`;
  else if (c.kind === "outpost") h += `<p>Your outpost${sys.exotics ? ": +1 exotics a turn" : ""}. It extends your territory.</p>`;
  else {
    const y = yields(S, sys), max = maxPop(S, sys);
    h += `<div class="kv"><span>Population</span><b>${c.pop} / ${max}</b>${bar(c.pop + c.growth, max, "#7bc47f")}</div>
      <div class="yields"><span>Industry <b>${fmt(y.ind)}</b></span><span>Science <b>${fmt(y.sci)}</b></span><span>Credits <b>${fmt(y.cr)}</b></span>${y.exo ? `<span>Exotics <b>${y.exo}</b></span>` : ""}</div>
      <p class="small">${c.capital ? "<b>Capital.</b> " : ""}Buildings: ${Object.keys(c.buildings).filter((b) => c.buildings[b]).map((b) => esc(BUILDINGS[b].name)).join(", ") || "none"}.${c.defense ? ` Orbital guns ${c.defense} hull.` : ""}</p>
      <h3>Building</h3>`;
    if (!c.queue.length) h += `<p class="small muted">Nothing. Industry stockpiles (up to 40). Pick something below.</p>`;
    h += `<ol class="queue">${c.queue.map((q, i) => `<li><span>${esc(q.name)}${q.exotics ? ` <i class="exo">${q.exotics}◆</i>` : ""}</span>${bar(q.progress, q.cost)}<span class="small">${Math.floor(q.progress)}/${q.cost}${i === 0 ? ` · ${y.ind ? Math.max(1, Math.ceil((q.cost - q.progress) / y.ind)) + "t" : "—"}` : ""}</span><button class="x" data-deq="${i}" title="Remove">×</button></li>`).join("")}</ol>`;
    if (c.queue.length) { const rc = rushCost(S, sys.id); h += `<button class="btn small" data-rush ${me.credits < rc ? "disabled" : ""}>Rush ${esc(c.queue[0].name)} for ${rc} credits</button>`; }
    const opts = buildOptions(S, sys);
    h += `<h3>Add to the queue</h3><div class="opts">${opts.map((o) => `<button class="opt" data-build="${o.kind}:${o.id}" title="${esc(o.kind === "ship" ? SHIPS[o.id].text : BUILDINGS[o.id].text)}"><b>${o.kind === "ship" ? shipSVG(o.id, player(S).color, 18) + " " : ""}${esc(o.name)}</b><span>${o.cost}${o.exotics ? ` + ${o.exotics}◆` : ""}</span></button>`).join("")}</div>`;
    if (!c.buildings.shipyard) h += `<p class="small muted">Build a Shipyard here to build ships.</p>`;
  }
  const fl = fleetsAt(S, sys.at).filter((f) => f.owner === me.id || seen);
  if (fl.length) h += `<h3>In orbit</h3>` + fl.map((f) => `<button class="row" data-selfleet="${f.id}"><span class="dot" style="background:${faction(S, f.owner).color}"></span>${esc(fleetName(f))}</button>`).join("");
  return h;
}
function fleetName(f) {
  const counts = {}; for (const x of f.ships) counts[x.type] = (counts[x.type] || 0) + 1;
  return Object.entries(counts).map(([t, n]) => `${n > 1 ? n + " " : ""}${SHIPS[t].name}${n > 1 ? "s" : ""}`).join(", ");
}
function fleetHTML() {
  const f = S.fleets[sel.id], me = player(S);
  if (!f) { sel = null; return `<p class="muted">That fleet is gone.</p>`; }
  const mine = f.owner === me.id, F = faction(S, f.owner);
  const sid = S.sysAt[f.at], sys = sid && S.systems[sid];
  let h = `<h2><span class="dot" style="background:${F.color}"></span>${mine ? "Your fleet" : esc(F.name)}</h2><p class="muted">${sys ? `At ${esc(sys.name)}` : "In deep space"}${S.hexes[f.at].terrain === "nebula" ? ", inside a nebula" : ""}. Speed ${fleetSpeed(S, f)}.</p>`;
  h += `<ul class="ships">${f.ships.map((x) => { const st = shipStats(S, f.owner, x.type); return `<li><b>${shipSVG(x.type, F.color, 22)} ${esc(st.name)}</b>${st.skill ? `<span class="small">skill ${st.skill}, ${st.dmg} dmg</span>` : ""}${bar(x.hull, st.hull, x.hull < st.hull ? "#e0a050" : "#7bc47f")}<span class="small">${x.hull}/${st.hull}</span></li>`; }).join("")}</ul>`;
  if (f.admiral) h += admiralCard(f.admiral, mine);
  if (!mine) return h + (atWar(S, me.id, f.owner) ? `<p class="bad">At war with you.</p>` : "");
  const reserve = me.reserve || [];
  if (armed(f)) h += f.admiral ? `<div class="btn-row"><button class="btn small" data-relieve>Send ${esc(f.admiral.name)} to the reserve</button></div>`
    : reserve.length ? `<h3>Give it an admiral</h3>${reserve.map((a) => `<button class="row" data-assign="${a.id}">${esc(admTitle(a))}<span class="small muted"> · ${a.wins} win${a.wins === 1 ? "" : "s"}${a.traits.length ? " · " + a.traits.map((t) => ADMIRAL_TRAITS[t].name).join(", ") : ""}</span></button>`).join("")}`
    : `<p class="small muted">No admiral. A fleet of two warships or more that wins a battle may find one among its captains.</p>`;
  if (armed(f)) {
    const ok = inSupply(S, f), st = STANCES[f.stance] || STANCES.balanced;
    h += `<p class="small ${ok ? "" : "bad"}"><b>Supply:</b> ${ok ? `in supply (within ${supplyRange(S, f.owner)} hexes of a world or outpost of yours)` : `out of supply${f.out ? ` for ${f.out} turn${f.out === 1 ? "" : "s"}` : ""}: from the second turn its warships wear down a hull point a turn. Bring it within ${supplyRange(S, f.owner)} hexes of a world or outpost of yours.`}</p>`;
    h += `<h3>Battle stance</h3><div class="opts">${Object.entries(STANCES).map(([k, x]) => `<button class="opt ${(f.stance || "balanced") === k ? "on" : ""}" data-stance="${k}" aria-pressed="${(f.stance || "balanced") === k}"><b>${esc(x.name)}</b><small>${esc(x.text)}</small></button>`).join("")}</div>`;
  }
  if (f.path.length) h += `<p>Heading for ${esc(S.sysAt[f.dest] ? S.systems[S.sysAt[f.dest]].name : "a point in space")}: ${Math.ceil(f.path.reduce((t, x) => t + x.cost, 0) / fleetSpeed(S, f))} turn(s).</p>`;
  h += `<div class="btn-row"><button class="btn primary" data-move>${moveMode ? "Click a hex…" : "Move"}</button>${f.path.length ? `<button class="btn" data-stop>Stop</button>` : `<button class="btn" data-sentry>${f.sentry ? "Wake" : "Hold here"}</button>`}</div>`;
  if (sys && !sys.colony) {
    const col = f.ships.some((x) => x.type === "colony") && canSettle(S, me.id, sys, "colony"), out = f.ships.some((x) => x.type === "outpost" || x.type === "colony");
    if (col) h += `<button class="btn primary wide" data-settle>Found a colony on ${esc(sys.name)}</button>`;
    else if (out) h += `<button class="btn wide" data-settle>Claim ${esc(sys.name)} as an outpost</button>`;
  }
  const o = invasionOdds(S, f.id);
  if (o && o.troops) {
    const war = atWar(S, me.id, sys.colony.owner);
    const tr = f.ships.filter((x) => x.type === "transport").length, per = shipStats(S, me.id, "transport").troops;
    const defParts = sys.colony.kind === "outpost" ? "an outpost: 0.5" : `population ${sys.colony.pop} × ${RULES.troopDefensePerPop}${sys.colony.capital ? " + 2 for a capital" : ""}`;
    h += `<p class="small">Invasion: your troops ${o.troops} against their defense ${o.defense}.${o.guarded ? " Their orbital guns or warships still hold the orbit. Keep warships here: the battle at the end of the turn knocks the guns out, and a world under siege can't repair them, so you can land next turn." : ""}${!war ? " You're not at war with them." : ""}</p>
      <p class="small muted" style="margin-top:-4px">Troops: ${tr} transport${tr === 1 ? "" : "s"} × ${per} = ${o.troops}. Defense: ${defParts} = ${o.defense}. ${o.troops >= o.defense ? "<b class=\"good\">Enough: the landing takes it.</b>" : `<b class="bad">Not enough: ${fmt(o.defense - o.troops)} more troops needed, or the transports are lost.</b>`}</p><button class="btn wide ${o.troops >= o.defense ? "primary" : ""}" data-invade ${!war || o.guarded ? "disabled" : ""}>Land the troops</button>`;
  }
  // A targeted barrage: an enemy world's orbit held, one building destroyed (the Shipyard takes its queued ships with it).
  const bt = barrageTargets(S, f.id);
  if (bt.length) h += `<h3>Targeted barrage</h3><p class="small muted" style="margin-top:-4px">You hold the orbit: destroy one building, once a turn. The Shipyard takes the ships in its yards with it. No population is lost.</p>`
    + (f.barraged === S.turn ? `<p class="small">This fleet has fired its barrage this turn.</p>` : `<div class="opts">${bt.map((b) => `<button class="opt" data-barrage="${b}"><b>${esc(BUILDINGS[b].name)}</b></button>`).join("")}</div>`);
  const others = fleetsAt(S, f.at).filter((o) => o.owner === me.id && o.id !== f.id);
  if (others.length) h += `<h3>Join with</h3>` + others.map((o) => `<button class="row" data-merge="${o.id}">${esc(fleetName(o))}</button>`).join("");
  const types = [...new Set(f.ships.map((x) => x.type))];
  if (f.ships.length > 1) h += `<h3>Split off</h3><div class="opts">${types.map((t) => `<button class="opt" data-split="${t}"><b>${esc(SHIPS[t].name)}</b></button>`).join("")}</div>`;
  return h;
}
// ---------- Objectives: the race to win, at a glance ----------
/** Every technology the Corridor Engine needs, in an order you could research them. */
function engineChain() {
  const out = [], seen = new Set();
  const visit = (id) => { if (seen.has(id)) return; seen.add(id); const t = TECHS.find((x) => x.id === id); t.needs.forEach(visit); out.push(t); };
  visit("engine");
  return out;
}
const ibar = (v, max, color) => `<span class="meter" style="display:inline-block;width:100px;vertical-align:middle;margin:0 6px 0 0"><span style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%;background:${color}"></span></span>`;
const stepLi = (state, text) => `<li class="${state}"><span>${state === "done" ? "✓" : state === "now" ? "▶" : "○"}</span>${text}</li>`;
function objectivesHTML() {
  const me = player(S), alive = S.factions.filter((f) => f.alive), rivals = alive.filter((f) => f.id !== me.id), all = S.factions.filter((f) => f.id !== me.id);
  const turnsLeft = RULES.maxTurns - S.turn;
  const ranked = alive.map((f) => ({ f, sc: score(S, f.id) })).sort((a, b) => b.sc - a.sc), myRank = ranked.findIndex((x) => x.f.id === me.id) + 1, mine = score(S, me.id), lead = ranked[0];
  let h = `<h2>Objectives</h2>`;
  h += `<div class="kv small" style="margin-bottom:10px"><span>Game</span><span>${S.mode === "open" ? `${turnText()}: no end but the one you choose (Menu → Retire)` : `${ibar(S.turn, RULES.maxTurns, "var(--gold)")} Turn ${S.turn} of ${RULES.maxTurns} (${turnsLeft} left)`}</span>
    <span>Standing</span><span>Score <b>${mine}</b>, ${myRank === 1 ? `<b class="good">first</b> of ${alive.length}` : `<b>${ordinal(myRank)}</b> of ${alive.length}`}</span></div>`;
  h += `<p class="small muted">Win one of three ways. Lose if your last world falls, or if a rival wins first.</p>`;
  const live = S.crisis && (S.crisis.stage === "stirring" || S.crisis.stage === "awake");
  if (live) h += crisisHTML();
  // 1. Conquest.
  const met = all.filter((f) => me.met[f.id]).length, fallen = all.filter((f) => !f.alive).length, atWarWith = rivals.filter((f) => atWar(S, me.id, f.id)).length;
  const cBadge = rivals.length === 0 ? ["Won", "good"] : fallen ? ["Under way", "good"] : atWarWith ? ["At war", ""] : ["Not started", ""];
  h += `<div class="card obj"><h3 class="obj-h">Conquest <span class="badge-status ${cBadge[1]}">${cBadge[0]}</span></h3>
    <div class="kv small"><span>Rivals left</span><span>${ibar(fallen, all.length, "var(--bad)")} ${rivals.length} of ${all.length} still standing (${fallen} fallen)</span>
    <span>Known</span><span>${met} of ${all.length} met · at war with ${atWarWith}</span></div>
    <p class="small" style="margin-top:6px"><b class="good">Win:</b> be the last power standing: take every rival's last world (troop transports invade worlds you've cleared of defenders).</p></div>`;
  // 2. The Corridor Engine.
  const done = me.research.done, chain = engineChain(), cap = S.systems[me.capital];
  const q = cap && cap.colony ? cap.colony.queue.find((x) => x.id === "engine") : null, built = cap && cap.colony && cap.colony.buildings.engine;
  const techDone = chain.filter((t) => done.includes(t.id)).length;
  const eBadge = S.winner === me.id && S.winReason === "engine" ? ["Won", "good"] : q ? ["Building", "good"] : done.includes("engine") ? ["Ready to build", "good"] : techDone ? ["Researching", ""] : ["Not started", ""];
  let firstOpen = true;
  const step = (isDone, text) => { const st = isDone ? "done" : firstOpen ? (firstOpen = false, "now") : ""; return stepLi(st, text); };
  h += `<div class="card obj"><h3 class="obj-h">The Corridor Engine <span class="badge-status ${eBadge[1]}">${eBadge[0]}</span></h3>
    <div class="kv small"><span>Research</span><span>${ibar(techDone, chain.length, "#a8e0ff")} ${techDone} of ${chain.length} technologies</span>
    <span>Exotics</span><span>${fmt(me.exotics)} of ${BUILDINGS.engine.exotics} it needs</span></div>
    <ol class="steps-list">${chain.map((t) => step(done.includes(t.id), `Research ${esc(t.name)}${me.research.current === t.id ? ` (now: ${Math.round((me.research.progress / t.cost) * 100)}%)` : ""}`)).join("")}
    ${step(!!q || !!built, `Queue the Corridor Engine at your capital${cap ? `, ${esc(cap.name)}` : ""} (${BUILDINGS.engine.cost} industry, ${BUILDINGS.engine.exotics} exotics)`)}
    ${step(!!built, `Finish it${q ? `: ${Math.round((q.progress / q.cost) * 100)}% built` : ""}`)}</ol>
    <p class="small" style="margin-top:6px"><b class="good">Win:</b> finish the Corridor Engine at your capital. <b class="bad">Watch:</b> lose your capital and the work is lost.</p></div>`;
  // 3. Score.
  const gap = lead.f.id === me.id ? (ranked[1] ? mine - ranked[1].sc : mine) : lead.sc - mine;
  const sBadge = lead.f.id === me.id ? ["Leading", "good"] : ["Behind", "bad"];
  h += `<div class="card obj"><h3 class="obj-h">Highest score at turn ${RULES.maxTurns} <span class="badge-status ${sBadge[1]}">${sBadge[0]}</span></h3>
    <div class="kv small"><span>Yours</span><span>${ibar(mine, Math.max(1, lead.sc), "var(--accent)")} ${mine}</span>
    <span>${lead.f.id === me.id ? "Next best" : "Leader"}</span><span>${lead.f.id === me.id ? (ranked[1] ? `${me.met[ranked[1].f.id] ? esc(ranked[1].f.name) : "An unmet rival"}: ${ranked[1].sc} (you lead by ${gap})` : "No one") : `${me.met[lead.f.id] ? esc(lead.f.name) : "An unmet rival"}: ${lead.sc} (${gap} ahead of you)`}</span></div>
    <p class="small" style="margin-top:6px"><b class="good">Win:</b> lead on score when turn ${RULES.maxTurns} ends. Score: 5 per colony and 2 per population, 2 per outpost, 6 per technology, and a quarter of your fleet's strength${S.crisisOff ? "" : "; when the Wardens wake, points for every machine of theirs destroyed and 30 for breaking their Heart"}.</p></div>`;
  if (!live) h += crisisHTML();
  // The rivals' race.
  const threats = [];
  for (const f of rivals) {
    const theirCap = S.systems[f.capital], tq = theirCap && theirCap.colony ? theirCap.colony.queue.find((x) => x.id === "engine") : null;
    if (tq) threats.push(`<li class="bad"><b>${esc(f.name)}</b> is building the Corridor Engine at ${esc(theirCap.name)}${me.met[f.id] ? `: ${Math.round((tq.progress / tq.cost) * 100)}% done` : ""}. Take or blockade it before it's finished.</li>`);
  }
  if (rivals.length === 1) threats.push(`<li class="war">Only ${esc(rivals[0].name)} is left: one of you will win by conquest.</li>`);
  h += `<h3>Threats</h3>` + (threats.length ? `<ul class="log">${threats.join("")}</ul>` : `<p class="small muted">No rival is close to winning yet.</p>`);
  h += `<p class="small muted"><b>Defeat:</b> your last world falls; a rival finishes the Corridor Engine or stands alone; or a rival leads on score at turn ${RULES.maxTurns}.</p>`;
  return h;
}
/** The late-game crisis, on the Objectives tab: the warning, then the Heart, its waves and who is fighting them. */
function crisisHTML() {
  const c = crisisState(S); if (!c) return "";
  const me = player(S);
  if (c.stage === "stirring") return `<div class="card obj crisis"><h3 class="obj-h">The Wardens <span class="badge-status bad">Stirring</span></h3>
    <p class="small">A signal is coming out of the rifts: the Wardens, war machines of the old empires, wake in about ${Math.max(1, c.at - S.turn)} turn${c.at - S.turn === 1 ? "" : "s"}. They'll burn any world they reach, whoever's it is. Build warships, and put guns on your outer worlds.</p></div>`;
  const fighters = [me, ...S.factions.filter((f) => f.id !== me.id && me.met[f.id])].map((f) => ({ f, n: f.stats.wardens || 0 })).sort((a, b) => b.n - a.n);
  const table = `<table class="tbl"><tr><th>Fighting them</th><th>Machines destroyed</th></tr>${fighters.map(({ f, n }) => `<tr><td><span class="dot" style="background:${f.color}"></span>${f.id === me.id ? "You" : esc(f.name)}${f.alive ? "" : " †"}</td><td>${n}</td></tr>`).join("")}</table>`;
  if (c.stage === "over") return `<div class="card obj crisis"><h3 class="obj-h">The Wardens <span class="badge-status good">Broken</span></h3>
    <p class="small">${c.by ? `${c.by === me.id ? "You" : me.met[c.by] ? esc(faction(S, c.by).name) : "A power you haven't met"} broke the Heart` : "The Heart is broken"}${S.crisis.over ? ` on turn ${S.crisis.over}` : ""}. Every machine went dark.</p>${table}</div>`;
  return `<div class="card obj crisis"><h3 class="obj-h">The Wardens <span class="badge-status bad">Awake</span></h3>
    <div class="kv small"><span>The Heart</span><span>${ibar(c.hull, c.max, "var(--bad)")} ${c.hull} of ${c.max} hull, at <button class="linkish" data-center="${c.heart}">${esc(c.place)}</button></span>
    <span>Waves</span><span>${c.wave} sent · the next in ${Math.max(0, c.nextWave - S.turn)} turn${c.nextWave - S.turn === 1 ? "" : "s"} · ${c.ships} machines out there</span>
    <span>Truce</span><span>${c.truce ? "Holding: no power starts a new war while the Heart lives" : "None: wars go on"}</span></div>
    <ol class="steps-list">${stepLi("now", "Keep their waves off your worlds: a world with guns or warships in orbit can't be burned, only fought over")}${stepLi("", `Break the Heart: its guard must fall before it can be hit, it mends ${2 * (S.crisis.m || 1)} hull a turn, and it fires ${1 + (S.crisis.m || 1)} times a round`)}</ol>
    ${table}
    <p class="small" style="margin-top:6px"><b class="good">Reward:</b> score for every machine destroyed; breaking the Heart is worth 30 more, and its wreck.</p></div>`;
}
/** The Mission tab: the directives under way (progress, deadline, reward), the backlog, and past directives. */
function missionHTML() {
  const D = ensureDirectives(S), A = authorityOf(S);
  let h = `<h2>Mission</h2><p class="small muted">Directives from ${esc(A.name)}: what your people ask of you, beyond winning. ${ACTIVE_MAX} at a time; each pays credits when it's done.</p>` + campaignHTML();
  h += `<h3>Under way</h3>`;
  if (!D.active.length) h += `<p class="small muted">None under way.${D.backlog.length ? " Take one on from the backlog below." : ` ${esc(A.name[0].toUpperCase() + A.name.slice(1))} will send more.`}</p>`;
  for (const d of D.active) {
    const p = progress(S, d), left = d.deadline - S.turn, total = Math.max(1, d.deadline - d.issued);
    const badge = left <= 1 ? ["Due now", "bad"] : left <= 3 ? ["Running out of time", "bad"] : p ? ["Under way", "good"] : ["Not started", ""];
    h += `<div class="card obj"><h3 class="obj-h">${esc(d.title)} <span class="badge-status ${badge[1]}">${badge[0]}</span>${d.campaign ? ` <span class="badge-status good">${esc(campaignDef(d.campaign).title)}</span>` : ""}${d.kind === "prototype" ? ` <span class="badge-status">Prototype</span>` : ""}</h3>
      <ol class="steps-list">${stepLi(p >= d.need ? "done" : "now", `${esc(d.title)}: ${p} of ${d.need}`)}${stepLi(p >= d.need ? "now" : "", `Report to ${esc(d.from || A.name)}: ${d.reward} credits`)}</ol>
      <div class="kv small"><span>Progress</span><span>${ibar(p, d.need, "var(--accent)")} ${p} of ${d.need}</span>
      <span>Deadline</span><span>${ibar(Math.max(0, left), total, "var(--gold)")} turn ${d.deadline} (${left} turn${left === 1 ? "" : "s"} left)</span></div>
      ${(() => { const op = opposition(S, d); return op ? `<div class="kv small" style="margin-top:6px"><span class="bad">Opposition</span><span>${ibar(op.progress, op.need, "var(--bad)")} ${esc(op.name)}: ${op.progress} of ${op.need}${op.alive ? "" : " (fallen)"}</span></div><p class="small"><b class="bad">Racing you:</b> ${esc(op.why)} If they reach ${op.need} before you reach ${d.need}, the directive is lost.</p>` : ""; })()}
      <p class="small" style="margin-top:6px"><b>How:</b> ${esc(howText(d))}</p>
      <p class="small"><b class="good">Success:</b> +${d.reward} credits. <b class="bad">Failure:</b> not done by turn ${d.deadline}, or the opposition gets there first; ${esc(d.from || A.name)} takes note.</p></div>`;
  }
  h += `<h3>Backlog</h3>`;
  if (!D.backlog.length) h += `<p class="small muted">Nothing waiting. With ${ACTIVE_MAX} directives under way, new ones wait here.</p>`;
  else {
    h += `<p class="small muted">Waiting their turn: the oldest moves up when a directive under way is finished, and its clock starts then. Or take one on now.</p>`;
    for (const d of D.backlog) h += `<div class="card"><h4>${esc(d.title)}</h4><div class="small">Received turn ${d.received} · ${esc(howText(d))}</div><div class="btn-row"><button class="btn small primary" data-accept="${d.id}">Take it on now</button></div></div>`;
  }
  h += `<h3>Past directives</h3>` + (D.history.length ? `<ul class="log">${D.history.slice().reverse().map((x) => `<li class="${x.result === "done" ? "good" : "bad"}"><b>${x.result === "failed" ? "✗ Not done" : x.result === "beaten" ? `✗ Beaten by ${esc(x.by)}` : "✓ Done"}</b> · turn ${x.turn} · ${esc(x.title)}</li>`).join("")}</ul>` : `<p class="small muted">None yet.</p>`);
  return h;
}
/** The campaign under way: its rival, its threads, the rival's gains, and the story so far. */
function campaignHTML() {
  const D = ensureDirectives(S), C = D.campaign;
  if (!C) return `<div class="card obj"><h3 class="obj-h">Campaigns <span class="badge-status">Turn 8</span></h3><p class="small">The first campaign begins at turn 8: a race against your nearest rival, with directives of its own. Three campaigns follow one another, and each brings new kinds of directives.</p></div>`;
  const def = campaignDef(C.id), R = faction(S, C.rival), known = player(S).met[C.rival];
  const status = C.over === "won" ? ["Won", "good"] : C.over === "lost" ? ["Lost", "bad"] : C.finale ? ["The finale", "good"] : ["Under way", ""];
  const next = CAMPAIGNS[C.i + 1];
  let h = `<div class="card obj"><h3 class="obj-h">Campaign ${C.i + 1} of ${CAMPAIGNS.length}: ${esc(def.title)} <span class="badge-status ${status[1]}">${status[0]}</span></h3>
    <p class="small">${esc(campaignText(S, def.premise))}</p>
    <div class="kv small"><span>Rival</span><span><span class="dot" style="background:${R ? R.color : "#888"}"></span>${esc(known && R ? R.name : "your nearest rival, not yet met")}</span>
    <span>Threads</span><span>${ibar(Math.min(C.threads.length, def.finaleAt), def.finaleAt, "var(--accent)")} ${C.threads.length} of ${def.finaleAt}: directives marked with this campaign's name turn them up; then the finale</span>
    ${C.over ? "" : `<span class="bad">Their gains</span><span>${ibar(Math.min(C.gains, def.finaleAt + 1), def.finaleAt + 1, "var(--bad)")} ${C.gains}${C.finale ? "" : `; the next in about ${Math.max(1, C.nextGain - S.turn)} turn${C.nextGain - S.turn === 1 ? "" : "s"}. Each thread you turn up sets them back two turns`}</span>`}</div>
    ${C.over ? `<p class="small">${next ? (C.endedAt != null ? `The next campaign, ${esc(next.title)}, begins about turn ${C.endedAt + 5}.` : `The next campaign, ${esc(next.title)}, begins five turns after this one ends.`) : "That was the last campaign. The directives go on."}</p>` : ""}</div>`;
  if ((D.past || []).length) h += `<details class="card small"><summary>Earlier campaigns (${D.past.length})</summary>${D.past.map((p) => `<p><b>${esc(campaignDef(p.id).title)}</b>: ${p.over === "won" ? "won" : "lost"}, ${p.threads} thread${p.threads === 1 ? "" : "s"}.</p>`).join("")}</details>`;
  return h;
}
/** Mission Success reports, one after another, after whatever report is showing. */
function showNextMission() {
  if (S && S.galEvent && !S.winner) { showGalEvent(); return true; }
  if (S && !S.winner && currentEnvoy(S)) { showEnvoy(); return true; }
  const D = S && S.directives; if (!D || !D.reports.length) return false;
  const r = D.reports[0];
  if (r.result === "story") {
    modal(`<h2>${esc(r.title)}</h2><p class="small muted">Turn ${r.turn}</p><p style="white-space:pre-line">${esc(r.text)}</p><div class="btn-row"><button class="btn primary" id="mission-ok">Continue</button></div>`);
    $("mission-ok").onclick = () => { D.reports.shift(); closeModal(); save(); renderAll(); showNextMission(); };
    return true;
  }
  if (r.result === "beaten") {
    modal(`<h2>Directive lost</h2><h3 style="margin-top:0">${esc(r.title)}</h3><p class="small muted">Turn ${r.turn} · for ${esc(r.from)}</p>
      <p>${esc(r.by)} got there first: ${r.rivalNeed} of ${r.rivalNeed}, while you had ${r.progress} of ${r.need}. ${esc(r.from[0].toUpperCase() + r.from.slice(1))} takes note.</p>
      ${r.next ? `<p class="small"><b>Up next, from the backlog:</b> ${esc(r.next.join("; "))} (the Mission tab).</p>` : ""}
      <div class="btn-row"><button class="btn primary" id="mission-ok">Continue</button></div>`);
    $("mission-ok").onclick = () => { D.reports.shift(); closeModal(); save(); renderAll(); showNextMission(); };
    return true;
  }
  modal(`<h2>Mission success</h2><h3 style="margin-top:0">${esc(r.title)}</h3><p class="small muted">Turn ${r.turn} · ${r.turns} turn${r.turns === 1 ? "" : "s"} from directive to done · for ${esc(r.from)}</p>
    <h3>What was done</h3><ol class="steps-list">${stepLi("done", esc(r.title))}${stepLi("done", `Reported to ${esc(r.from)}`)}</ol>
    ${r.beat ? `<p class="small"><b>Against the opposition:</b> you got there first. ${esc(r.beat)}</p>` : ""}${r.thread ? `<p class="small"><b>Campaign:</b> ${esc(r.thread)}</p>` : ""}
    <h3>Reward</h3><ul class="small">${r.rewards.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    ${r.next ? `<p class="small"><b>Up next, from the backlog:</b> ${esc(r.next.join("; "))} (the Mission tab).</p>` : ""}
    <div class="btn-row"><button class="btn primary" id="mission-ok">Continue</button></div>`);
  $("mission-ok").onclick = () => { D.reports.shift(); closeModal(); save(); renderAll(); showNextMission(); };
  return true;
}
const ordinal = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th");
function empireHTML() {
  const me = player(S), t = totals(S, me.id);
  const cols = coloniesOf(S, me.id).sort((a, b) => (b.colony.pop || 0) - (a.colony.pop || 0));
  let h = `<h2>${esc(me.name)}</h2><p class="small muted">${esc(FACTIONS.find((f) => f.id === me.id).trait)}: ${esc(FACTIONS.find((f) => f.id === me.id).traitText)}</p>
    <div class="yields"><span>Income <b>${fmt(t.cr)}</b></span><span>Upkeep <b>${fmt(t.upkeep)}</b></span><span>Score <b>${score(S, me.id)}</b></span><span>Fleet power <b>${militaryPower(S, me.id)}</b></span></div>
    ${focusHTML()}${protosHTML()}
    <h3>Worlds (${cols.length})</h3><table class="tbl"><tr><th>World</th><th>Pop</th><th>Ind</th><th>Sci</th><th>Building</th></tr>
    ${cols.map((sys) => { const y = yields(S, sys); return `<tr data-selsys="${sys.id}"><td>${sys.colony.capital ? "★ " : ""}${esc(sys.name)}${sys.colony.kind === "outpost" ? " <i>(outpost)</i>" : ""}</td><td>${sys.colony.pop || "–"}</td><td>${fmt(y.ind)}</td><td>${fmt(y.sci)}</td><td>${esc(sys.colony.queue[0] ? sys.colony.queue[0].name : sys.colony.kind === "colony" ? "—" : "")}</td></tr>`; }).join("")}</table>
    <h3>Fleets (${fleetsOf(S, me.id).length})</h3>${fleetsOf(S, me.id).map((f) => `<button class="row" data-selfleet="${f.id}">${shipSVG(flagship(f), me.color, 18)} ${esc(fleetName(f))}${f.admiral ? ` <span class="small">· ${esc(admTitle(f.admiral))}</span>` : ""}<span class="small muted">${f.path.length ? " · moving" : " · idle"}</span></button>`).join("")}
    ${admiralsHTML()}
    <h3>Rivals</h3><table class="tbl"><tr><th>Faction</th><th>Worlds</th><th>Score</th></tr>${S.factions.slice(1).map((F) => `<tr><td><span class="dot" style="background:${F.color}"></span>${me.met[F.id] ? esc(F.name) : "Unknown"}${F.alive ? "" : " †"}</td><td>${me.met[F.id] ? coloniesOf(S, F.id).length : "?"}</td><td>${me.met[F.id] ? score(S, F.id) : "?"}</td></tr>`).join("")}</table>`;
  return h;
}
/** An admiral: rank, name, wins, traits, and how far to the next. */
function admiralCard(a, mine) {
  const next = ADMIRAL_STEPS.find((n) => n > a.wins);
  return `<div class="card small adm"><b>${esc(admTitle(a))}</b> · ${a.wins} win${a.wins === 1 ? "" : "s"}${mine && next && a.traits.length < 3 ? ` · next promotion at ${next}` : ""}
    ${a.traits.length ? `<ul>${a.traits.map((t) => `<li><b>${esc(ADMIRAL_TRAITS[t].name)}:</b> ${esc(ADMIRAL_TRAITS[t].text)}</li>`).join("")}</ul>` : `<div class="muted">No traits yet: each is earned by winning battles.</div>`}</div>`;
}
/** The Empire tab's admirals: in command, in reserve, and those who fell. */
function admiralsHTML() {
  const me = player(S), all = admiralsOf(S, me.id), fallen = me.fallen || [];
  return `<h3>Admirals (${all.length} of ${admiralCap(S, me.id)})</h3>
    <p class="small muted">Named commanders. They win promotions and traits (at ${ADMIRAL_STEPS.join(", ")} wins), and can be lost with their fleets. You can keep two, and one more for every four worlds.</p>
    ${all.map(({ a, fleet }) => fleet ? `<button class="row" data-selfleet="${fleet.id}"><b>${esc(admTitle(a))}</b><span class="small muted"> · ${a.wins} win${a.wins === 1 ? "" : "s"}${a.traits.length ? " · " + a.traits.map((t) => ADMIRAL_TRAITS[t].name).join(", ") : ""} · ${esc(fleetName(fleet))}</span></button>`
      : `<div class="row"><b>${esc(admTitle(a))}</b><span class="small muted"> · in reserve: select a war fleet without an admiral to give them its command</span></div>`).join("") || `<p class="small muted">None.</p>`}
    ${fallen.length ? `<details class="small"><summary>The fallen (${fallen.length})</summary><ul>${fallen.map((x) => `<li>${esc(x.name)}, at ${esc(x.at)} on turn ${x.turn} (${x.wins} win${x.wins === 1 ? "" : "s"})</li>`).join("")}</ul></details>` : ""}`;
}
/** The empire's Focus: three points to share between industry, science, credits and defense. */
function focusHTML() {
  const me = player(S), fo = focusOf(S, me.id), left = FOCUS.points - focusUsed(S, me.id);
  return `<h3>Focus: ${FOCUS.points - left} of ${FOCUS.points} points</h3><p class="small muted">Where the empire puts its effort this turn, 2 points at most to one priority. Change it whenever you like.</p>
    <div class="card small">${Object.entries(FOCUS.kinds).map(([k, x]) => `<div class="focus-row"><span><b>${esc(x.name)}</b></span><button class="btn small" data-focus="${k}" data-n="${fo[k] - 1}" ${fo[k] <= 0 ? "disabled" : ""} aria-label="Less to ${esc(x.name)}">−</button><span class="pips">${[0, 1].map((i) => `<i class="${i < fo[k] ? "on" : ""}"></i>`).join("")}</span><button class="btn small" data-focus="${k}" data-n="${fo[k] + 1}" ${fo[k] >= 2 || left <= 0 ? "disabled" : ""} aria-label="More to ${esc(x.name)}">+</button><span class="muted">${esc(x.text)}</span></div>`).join("")}
    <div class="muted" style="margin-top:4px">${left ? `${left} point${left === 1 ? "" : "s"} unassigned.` : "Every point is in use."}</div></div>`;
}
/** Prototypes: unique upgrades from field tests (prototype directives) and campaign wins. */
function protosHTML() {
  const me = player(S), have = Object.keys(PROTOTYPES).filter((k) => proto(S, me.id, k));
  return `<h3>Prototypes (${have.length} of ${Object.keys(PROTOTYPES).length})</h3>` + (have.length ? `<ul class="small">${have.map((k) => `<li><b>${esc(PROTOTYPES[k].name)}:</b> ${esc(PROTOTYPES[k].text)}</li>`).join("")}</ul>`
    : `<p class="small muted">None yet. Your research arm sends field tests as directives (the Mission tab); carry one out and its prototype stays with you. Winning a campaign brings one too.</p>`);
}
function researchHTML() {
  const me = player(S), R = me.research, cur = R.current && TECHS.find((t) => t.id === R.current), t = totals(S, me.id);
  let h = `<h2>Research</h2>`;
  h += cur ? `<p><b>${esc(cur.name)}</b>: ${Math.floor(R.progress)} / ${cur.cost}${t.sci ? ` · ${Math.ceil((cur.cost - R.progress) / t.sci)} turns` : ""}</p>${bar(R.progress, cur.cost)}` : `<p class="bad">Choose what to research next.${R.progress ? ` ${Math.floor(R.progress)} points are waiting.` : ""}</p>`;
  for (const field of ["Physics", "Industry", "Society"]) {
    h += `<h3>${field}</h3><div class="techs">` + TECHS.filter((x) => x.field === field).map((x) => {
      const done = R.done.includes(x.id), can = availableTechs(S, me.id).some((a) => a.id === x.id);
      return `<button class="tech ${done ? "done" : can ? "can" : "locked"} ${R.current === x.id ? "cur" : ""}" ${can ? `data-tech="${x.id}"` : "disabled"}><b>${esc(x.name)}</b><span>${done ? "Done" : x.cost}</span><small>${esc(x.text)}${!done && !can ? ` Needs ${x.needs.map((n) => TECHS.find((y) => y.id === n).name).join(", ")}.` : ""}</small></button>`;
    }).join("") + `</div>`;
  }
  return h;
}
function diplomacyHTML() {
  const me = player(S);
  let h = `<h2>Diplomacy</h2>`;
  const offers = S.offers.filter((o) => o.to === me.id);
  for (const o of offers) {
    const F = faction(S, o.from);
    h += `<div class="offer"><p><b style="color:${F.color}">${esc(F.name)}</b> ${o.what === "peace" ? "offers peace." : "proposes a trade treaty: +3 credits a turn each."}</p><div class="btn-row"><button class="btn primary" data-offer="${S.offers.indexOf(o)}:yes">Accept</button><button class="btn" data-offer="${S.offers.indexOf(o)}:no">Decline</button></div></div>`;
  }
  const met = S.factions.filter((F) => F.id !== me.id && me.met[F.id]);
  if (!met.length) h += `<p class="muted">You haven't met anyone yet. Send out scouts.</p>`;
  for (const F of met) {
    const r = me.relations[F.id], them = F.relations[me.id];
    const mood = !F.alive ? "gone" : attitude(S, F.id), P = PERSONALITIES[F.id] || {}, mem = (them.memory || []).slice(-5).reverse();
    h += `<div class="dip"><h3><span class="dot" style="background:${F.color}"></span>${esc(F.name)}${F.alive ? "" : " †"}</h3>
      <p class="small"><b>${esc((P.leader || "").replace(/^./, (c) => c.toUpperCase()))}</b> · ${esc(P.title || "")}: ${esc(P.text || "")}</p>
      <p class="small">${r.status === "war" ? `<b class="bad">At war</b> for ${r.turnsAtWar} turn${r.turnsAtWar === 1 ? "" : "s"}` : r.allied ? "<b class=\"good\">Allied</b>" : "<b>At peace</b>"}${r.treaty ? " · trading" : ""} · they are <b class="mood-${mood}">${mood}</b> (${Math.round(them.score)}). ${esc(FACTIONS.find((x) => x.id === F.id).trait)}. Worlds ${coloniesOf(S, F.id).length}, fleet power ${militaryPower(S, F.id)}.</p>
      ${mem.length ? `<p class="small muted" style="margin:4px 0 2px">They remember that you:</p><ul class="small mem">${mem.map((m) => `<li class="${m.d >= 0 ? "good" : "bad"}">${esc(m.text)} <span class="muted">(turn ${m.turn}, ${m.d >= 0 ? "+" : "−"}${Math.abs(m.d)})</span></li>`).join("")}</ul>` : ""}
      ${F.alive ? `<div class="btn-row">${r.status === "war" ? `<button class="btn" data-dip="${F.id}:peace">Propose peace</button>` : `<button class="btn" data-dip="${F.id}:${r.treaty ? "endTrade" : "trade"}">${r.treaty ? "End the trade treaty" : "Propose trade"}</button><button class="btn" data-dip="${F.id}:${r.allied ? "endAlliance" : "alliance"}">${r.allied ? "End the alliance" : "Propose an alliance"}</button><button class="btn danger" data-dip="${F.id}:war">${r.allied ? "Break the alliance: war" : "Declare war"}</button>`}</div>` : ""}</div>`;
  }
  return h;
}
let logFilter = "all";
function logHTML() {
  const me = player(S);
  const mine = S.log.filter((l) => !l.fid || l.fid === me.id || l.kind === "war" || l.kind === "victory" || ((l.kind === "diplo" || l.kind === "contact") && l.text.includes(me.name)));
  // Discoveries: every one, from the first turn. Everything: the latest 80 entries.
  const found = mine.filter((l) => l.fid === me.id && DISCOVERY.includes(l.kind));
  const rows = logFilter === "discovery" ? found : mine.slice(-150);
  // In order: oldest first, under a heading for each turn; the panel opens scrolled to the latest.
  let body = "", turn = null;
  for (const l of rows) {
    if (l.turn !== turn) { if (turn !== null) body += "</ul>"; turn = l.turn; body += `<h3 class="log-turn">Turn ${l.turn}</h3><ul class="log">`; }
    body += `<li class="${l.kind}">${esc(l.text)}</li>`;
  }
  if (turn !== null) body += "</ul>";
  return `<h2>Log</h2><div class="btn-row"><button class="btn small ${logFilter === "all" ? "primary" : ""}" data-logf="all">Everything</button><button class="btn small ${logFilter === "discovery" ? "primary" : ""}" data-logf="discovery">Discoveries (${found.length})</button></div>` + body;
}

// ---------- the panel's buttons ----------
function bindChrome() {
  $("panel").addEventListener("click", (e) => {
    const b = e.target.closest("button, tr[data-selsys]"); if (!b || !S) return;
    const d = b.dataset, me = player(S);
    if (d.logf) { logFilter = d.logf; renderPanel(); return; }
    if (d.focus) { const r = setFocus(S, me.id, d.focus, +d.n); if (r.error) toast(r.error, true); save(); renderAll(); return; }
    if (d.assign) { const r = assignAdmiral(S, sel.id, d.assign); if (r.error) toast(r.error, true); save(); renderAll(); return; }
    if (d.relieve !== undefined) { relieveAdmiral(S, sel.id); save(); renderAll(); return; }
    if (d.stance) { setStance(S, sel.id, d.stance); toast(`${STANCES[d.stance].name}: ${STANCES[d.stance].text}`); save(); renderAll(); return; }
    if (d.accept) { const r = acceptDirective(S, d.accept); if (r.error) toast(r.error, true); else toast("Directive taken on: its clock starts now."); checkDirectives(S); save(); renderAll(); showNextMission(); return; }
    if (d.center) { centerOn(d.center); draw(); return; }
    if (d.selfleet) { select({ kind: "fleet", id: d.selfleet }); const f = S.fleets[d.selfleet]; if (f) { centerOn(f.at); draw(); } return; }
    if (d.selsys) { select({ kind: "system", id: d.selsys }); centerOn(S.systems[d.selsys].at); draw(); return; }
    if (d.build) { const [k, id] = d.build.split(":"); const r = enqueue(S, sel.id, k, id); if (r.error) toast(r.error, true); }
    else if (d.deq !== undefined) dequeue(S, sel.id, +d.deq);
    else if (d.rush !== undefined) { const r = rush(S, sel.id); if (r.error) toast(r.error, true); }
    else if (d.move !== undefined) { moveMode = !moveMode; if (moveMode) toast("Click where to send this fleet. Esc cancels."); }
    else if (d.stop !== undefined) setDestination(S, sel.id, S.fleets[sel.id].at);
    else if (d.sentry !== undefined) { const f = S.fleets[sel.id]; f.sentry = !f.sentry; if (f.sentry) nextIdle(); }
    else if (d.settle !== undefined) { const since = mark(), at = S.fleets[sel.id].at, nm = S.systems[S.sysAt[at]].name, r = settle(S, sel.id); if (!r.error) reportSince(`${nm}`, since); if (r.error) toast(r.error, true); else { toast(`${S.systems[S.sysAt[at]].name} is yours.`); if (!S.fleets[sel.id]) sel = { kind: "system", id: S.sysAt[at] }; } }
    else if (d.invade !== undefined) {
      const since = mark(), o = invasionOdds(S, sel.id), nm = S.systems[S.sysAt[S.fleets[sel.id].at]].name, r = invade(S, sel.id);
      if (r.error) toast(r.error, true);
      else { reportSince(`Invasion of ${nm}`, since); if (report) report.lines.unshift(`Your troops ${o.troops} against their defense ${o.defense}: ${r.taken ? "the landing takes the world." : "the landing fails, and the transports are lost."}`); }
      if (!S.fleets[sel.id]) sel = null;
    }
    else if (d.barrage) { const r = barrage(S, sel.id, d.barrage); if (r.error) toast(r.error, true); else toast(`Barrage: the ${BUILDINGS[d.barrage].name.toLowerCase()} is gone${r.wrecked ? `, with ${r.wrecked} ship${r.wrecked > 1 ? "s" : ""} in its yards` : ""}.`); }
    else if (d.merge) { const r = mergeFleets(S, sel.id, d.merge); if (r.error) toast(r.error, true); }
    else if (d.split) { const r = splitFleet(S, sel.id, d.split); if (r.error) toast(r.error, true); else sel = { kind: "fleet", id: r.fleet }; }
    else if (d.tech) setResearch(S, me.id, d.tech);
    else if (d.dip) {
      const [fid, what] = d.dip.split(":");
      const since = mark(), F = faction(S, fid);
      if (what === "war") { if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Click again to declare war"; return; } declareWar(S, me.id, fid); reportSince(`War with ${F.name}`, since); if (report) report.lines.push(`Their worlds and fleets are fair targets now, and yours are theirs. Peace can be proposed from the Diplomacy tab; they'll consider it once the war has cost them.`); }
      else {
        const r = propose(S, me.id, fid, what);
        if (r.error) toast(r.error, true);
        else { reportSince(what === "peace" ? `Peace with ${F.name}?` : what === "trade" ? `A trade treaty with ${F.name}?` : `Trade with ${F.name}`, since);
          report = report || { title: F.name, lines: [] };
          if (what === "endTrade") report.lines.push(`The trade treaty with ${F.name} is over: +3 credits a turn less for each of you.`);
          else if (what === "endAlliance") report.lines.push(`The alliance with ${F.name} is over. They won't forget it soon.`);
          else if (what === "alliance" && r.accepted) report.lines.push(`If either of you is attacked, the other joins the war, and you see what their worlds see.`);
          else if (!r.accepted) report.lines.push(`${F.name} refuse${what === "peace" ? ": the war goes on" : ""}. ${F.relations[me.id].score < 0 ? "They don't trust you yet." : "Ask again later."}`); }
      }
    } else if (d.offer) {
      const [i, ans] = d.offer.split(":"); const o = S.offers[+i];
      if (o) { const since = mark(), F = faction(S, o.from); if (ans === "yes") propose(S, o.from, o.to, o.what); S.offers.splice(+i, 1); const own = F.name.endsWith("s") ? `${F.name}'` : `${F.name}'s`; reportSince(`${own} offer`, since); report = report || { title: `${own} offer`, lines: [] }; if (ans !== "yes") report.lines.push(`You decline ${own} offer of ${o.what === "peace" ? "peace: the war goes on" : "a trade treaty"}.`); }
    } else return;
    checkDirectives(S); save(); renderAll(); if (report) showReport(); else showNextMission();
  });
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; seeTab(tab); renderTabs(); renderPanel(); renderCoach(); }));
  $("coach").addEventListener("click", coachClick);
  $("steps").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !S) return;
    if (b.dataset.show) showMe(b.dataset.show);
    else if (b.hasAttribute("data-steps-off")) { S.tutorial.on = false; save(); renderSteps(); toast("Checklist hidden. The Menu brings it back."); }
  });
  $("end-turn").addEventListener("click", doEndTurn);
  $("zoom-in").addEventListener("click", () => zoomBy(1.25));
  $("zoom-out").addEventListener("click", () => zoomBy(0.8));
  $("home").addEventListener("click", () => { if (S) { centerOn(S.systems[player(S).capital].at); draw(); } });
  $("menu").addEventListener("click", () => showMenu());
  $("next").addEventListener("click", nextIdle);
  $("to-panel").addEventListener("click", () => document.querySelector(".side").scrollIntoView({ behavior: "smooth", block: "start" }));
  document.addEventListener("keydown", (e) => {
    if (!S || e.target.closest("input, textarea, select") || !$("modal").hidden) return;
    if (e.key === "Escape") { moveMode = false; renderPanel(); draw(); }
    if (e.key === "Enter" && !e.repeat) doEndTurn();
    if ((e.key === "m" || e.key === "M") && sel && sel.kind === "fleet") { moveMode = !moveMode; renderPanel(); draw(); }
    if (e.key === "n" || e.key === "N") nextIdle();
  });
}
function idleThings() {
  const me = player(S);
  return [...fleetsOf(S, me.id).filter((f) => !f.path.length && !f.sentry).map((f) => ({ kind: "fleet", id: f.id, at: f.at })),
    ...coloniesOf(S, me.id).filter((x) => x.colony.kind === "colony" && !x.colony.queue.length).map((x) => ({ kind: "system", id: x.id, at: x.at }))];
}
let nextIdx = 0;
function nextIdle() {
  const list = idleThings(); if (!list.length) { toast("Everyone has orders."); return; }
  const it = list[nextIdx++ % list.length]; select({ kind: it.kind, id: it.id }); centerOn(it.at); draw();
}
function doEndTurn() {
  if (!S || S.winner) return;
  const me = player(S);
  if (!me.research.current && availableTechs(S, me.id).length) { tab = "research"; renderTabs(); renderPanel(); toast("Choose what to research first.", true); return; }
  const before = { cols: coloniesOf(S, me.id).length, log: S.log.length };
  $("end-turn").disabled = true; $("end-turn").textContent = "Thinking…";
  setTimeout(() => {
    S.offers = S.offers.filter((o) => S.turn - o.turn < 3);
    endTurn(S, aiTurn);
    if (!S.winner) directivesTurn(S);
    if (!S.winner) crisisTurn(S);
    if (!S.winner) eventsTurn(S);
    if (!S.winner) envoysTurn(S);
    $("end-turn").textContent = "End turn";
    save();
    // News: what happened to you this turn.
    const news = S.log.slice(before.log).filter((l) => l.fid === me.id || l.kind === "victory" || (l.kind === "war" && (l.text.includes(me.name))) || ((l.kind === "diplo" || l.kind === "contact") && l.text.includes(me.name))).filter((l) => !l.text.startsWith("Charted ") && l.kind !== "turn");
    if (sel && sel.kind === "fleet" && !S.fleets[sel.id]) sel = null;
    renderAll();
    if (S.winner) { showEnd(); return; }
    // A report of the turn, when anything happened to you: the books first, then the rest; charted systems are counted.
    const charted = S.log.slice(before.log).filter((l) => l.fid === me.id && l.text.startsWith("Charted ")).length;
    const go = () => {
      if (news.length || charted) {
        const books = S.log.slice(before.log).find((l) => l.fid === me.id && l.kind === "turn");
        report = { title: `Turn ${S.turn - 1}: what happened`, lines: [...news.map((l) => l.text), ...(charted ? [`${charted} new system${charted === 1 ? "" : "s"} charted (see the Log).`] : []), ...(books ? [books.text] : [])] };
        showReport();
      } else showNextMission();
    };
    // Battles first, as they happened; then the turn's report; then any event and directive reports.
    if (S.battleReports && S.battleReports.length) showBattle(go); else go();
  }, 30);
}

// ---------- battles, exchange by exchange ----------
/** The first battle report waiting: both sides' ships and every roll, stepped through, then the result. */
function showBattle(then) {
  const B = S.battleReports && S.battleReports[0]; if (!B) { then(); return; }
  const me = player(S).id, n = B.events.length;
  let shown = 0;
  const unitName = (u) => { if (u.fid === "wardens") return u.type === "heart" ? "The Heart" : `Warden ${u.name.toLowerCase()}`; const who = u.fid === me ? "Your" : faction(S, u.fid).name.replace(/^The /, ""); return u.type === "guns" ? `${who} orbital guns at ${u.name.replace(/'s orbital guns$/, "")}` : `${who} ${u.name.toLowerCase()}`; };
  const hullAt = (k) => B.units.map((u, i) => Math.max(0, u.hull - B.events.slice(0, k).filter((e) => e.t === i).reduce((t, e) => t + e.dmg, 0)));
  const icon = (u) => (u.type === "guns" ? `<svg width="22" height="22" viewBox="-13.5 -13.5 27 27" aria-hidden="true"><circle r="7" fill="${faction(S, u.fid).color}" fill-opacity=".3" stroke="${faction(S, u.fid).color}" stroke-width="1"/><path d="M0 -7 V-12 M7 0 H12 M0 7 V12 M-7 0 H-12" stroke="${faction(S, u.fid).color}" stroke-width="1"/></svg>` : shipSVG(u.type, faction(S, u.fid).color, 22));
  const sideHTML = (fids, hull, title) => `<div class="bside"><h3>${title}</h3>${B.units.map((u, i) => fids.includes(u.fid) ? `<div class="bunit ${hull[i] <= 0 ? "dead" : ""}">${icon(u)}<span>${esc(unitName(u))}${u.stance && u.stance !== "balanced" ? ` <i class="small muted">(${esc(STANCES[u.stance].name.toLowerCase())})</i>` : ""}</span><span class="pips">${Array.from({ length: u.max }, (_, k) => `<i class="${k < hull[i] ? "on" : ""}"></i>`).join("")}</span></div>` : "").join("")}</div>`;
  const draw = () => {
    const hull = hullAt(shown), done = shown >= n;
    const mine = [me], theirs = B.sides.filter((x) => x !== me);
    const lines = B.events.slice(0, shown).map((e, k) => {
      const a = B.units[e.a], t = B.units[e.t], killed = e.hit && hullAt(k + 1)[e.t] <= 0 && hullAt(k)[e.t] > 0;
      const head = k === 0 || B.events[k - 1].round !== e.round ? `<li class="bround">Exchange ${e.round + 1}</li>` : "";
      return `${head}<li class="${e.hit ? (a.fid === me ? "good" : "bad") : "muted"}${k === shown - 1 ? " now" : ""}">${esc(unitName(a))} fires on ${esc(unitName(t).replace(/^Your /, "your "))}: <span class="dice">${e.dice.map((d) => `<span class="die">${d}</span>`).join("")}</span> ${e.dice.reduce((x, y) => x + y, 0)} against ${e.need}: <b>${e.hit ? (killed ? "destroyed!" : `hit, −${e.dmg}`) : "miss"}</b></li>`;
    }).join("");
    const lostMine = (B.lost || {})[me] || 0, lostTheirs = Object.entries(B.lost || {}).filter(([f]) => f !== me).reduce((t, [, x]) => t + x, 0);
    const result = B.won === "won" ? `<b class="good">Victory.</b> You lost ${lostMine} ship${lostMine === 1 ? "" : "s"}; they lost ${lostTheirs}.` : B.won === "lost" ? `<b class="bad">Defeat.</b> You lost ${lostMine} ship${lostMine === 1 ? "" : "s"}; they lost ${lostTheirs}.` : `<b>No clear winner.</b> You lost ${lostMine}; they lost ${lostTheirs}. The fight goes on next turn if both sides stay.`;
    modal(`<h1>Battle at ${esc(B.at)}</h1><p class="small muted">Turn ${B.turn} · ${esc(B.sides.map((f) => f === me ? "you" : faction(S, f).name).join(" against "))} · each shot is 3d6 at or under the gunner's skill</p>
      <div class="battle">${sideHTML(mine, hull, "Your side")}${sideHTML(theirs, hull, esc(theirs.map((f) => faction(S, f).name).join(", ")))}</div>
      <ol class="blog-list">${lines || `<li class="muted">The fleets close. Three exchanges of fire.</li>`}</ol>
      ${(B.admirals || []).length ? `<p class="small muted">Commanding: ${B.admirals.map((x) => `${x.fid === me ? "yours, " : `${esc(faction(S, x.fid).name)}, `}<b>${esc(x.name)}</b>${x.traits.length ? ` (${esc(x.traits.join(", "))})` : ""}`).join("; ")}</p>` : ""}
      ${done ? `<p>${result}</p>${(B.news || []).map((t) => `<p class="small"><b>${esc(t)}</b></p>`).join("")}` : ""}
      <div class="btn-row">${done ? `<button class="btn primary" id="b-ok">Continue</button>` : `<button class="btn primary" id="b-next">Next shot</button><button class="btn" id="b-round">Finish the exchange</button><button class="btn" id="b-all">Skip to the result</button>`}</div>`);
    const L = document.querySelector(".blog-list"); if (L) L.scrollTop = L.scrollHeight;
    if (done) $("b-ok").onclick = () => { S.battleReports.shift(); save(); closeModal(); renderAll(); showBattle(then); };
    else {
      $("b-next").onclick = () => { shown++; draw(); };
      $("b-round").onclick = () => { const r = B.events[shown].round; while (shown < n && B.events[shown].round === r) shown++; draw(); };
      $("b-all").onclick = () => { shown = n; draw(); };
    }
  };
  draw();
}

// ---------- galactic events ----------
function showGalEvent() {
  const e = currentEvent(S); if (!e) return;
  modal(`<h1>${esc(e.title)}</h1><p style="white-space:pre-line">${esc(e.text)}</p>
    <div class="ev-opts">${e.options.map((o) => `<button class="ev-opt" data-ev="${o.id}"><b>${esc(o.label)}</b><small>${esc(o.does)}</small></button>`).join("")}</div>`);
  document.querySelectorAll("[data-ev]").forEach((b) => b.onclick = () => {
    const r = chooseEvent(S, b.dataset.ev); save();
    modal(`<h1>${esc(r.title)}</h1><p class="small muted">Your choice: ${esc(r.choice)}</p><p>${esc(r.text)}</p><div class="btn-row"><button class="btn primary" id="ev-ok">Continue</button></div>`);
    $("ev-ok").onclick = () => { closeModal(); renderAll(); showNextMission(); };
  });
}

// ---------- envoys: the rivals' messages ----------
function showEnvoy() {
  const m = currentEnvoy(S); if (!m) return;
  const head = { hello: "First contact", demand: "A demand", warn: "A warning", alliance: "An offer of alliance", joint: "A call to war", gift: "A gift", war: "A declaration of war", callToArms: "A call to arms" }[m.kind];
  modal(`<p class="small muted envoy-kicker"><span class="dot" style="background:${m.color}"></span>${esc(head)} · from ${esc(m.name)} · they are ${esc(m.attitude)}</p>
    <h1>${esc(m.leader[0].toUpperCase() + m.leader.slice(1))}</h1><p class="small muted" style="margin-top:-6px">${esc(m.title)}</p>
    <blockquote class="envoy">${esc(m.text)}</blockquote>
    <div class="ev-opts">${m.options.map((o) => `<button class="ev-opt" data-env="${o.id}"><b>${esc(o.label)}</b><small>${esc(o.does)}</small></button>`).join("")}</div>`);
  document.querySelectorAll("[data-env]").forEach((b) => b.onclick = () => {
    const r = answerEnvoy(S, b.dataset.env); save();
    modal(`<h1>${esc(r.name)}</h1><p class="small muted">Your answer: ${esc(r.choice)}</p><p>${esc(r.text)}</p><div class="btn-row"><button class="btn primary" id="env-ok">Continue</button></div>`);
    $("env-ok").onclick = () => { closeModal(); renderAll(); showNextMission(); };
  });
}

// ---------- reports: what a choice led to, in a pop-up ----------
let report = null;
const mark = () => S.logSeq || 0;
function reportSince(title, since) {
  const me = player(S);
  const lines = S.log.filter((l) => l.id > since && (!l.fid || l.fid === me.id || l.text.includes(me.name))).map((l) => l.text);
  report = { title, lines };
}
function showReport() {
  const r = report;
  modal(`<h2>${esc(r.title)}</h2>${r.lines.map((t) => `<p>${esc(t)}</p>`).join("") || `<p class="muted">Nothing more came of it.</p>`}<div class="btn-row"><button class="btn primary" id="report-ok">Continue</button></div>`);
  $("report-ok").onclick = () => { report = null; closeModal(); renderAll(); showNextMission(); };
}

// ---------- dialogs ----------
function modal(html) { $("modal-body").innerHTML = html; $("modal").hidden = false; }
function closeModal() { $("modal").hidden = true; }
function showNewGame(canContinue, preset) {
  modal(`<h1>Fracture Lines: Dominion</h1>
    <p class="lede">The old empires are breaking along the corridors. Lead a people of the Fracture Lines from one world to an empire: explore, settle, trade, research and fight, turn by turn.</p>
    ${canContinue ? `<div class="btn-row"><button class="btn primary" id="ng-continue">Continue your game</button></div>` : ""}
    <h3>Choose your people</h3><div class="factions">${FACTIONS.map((f, i) => `<label class="fac"><input type="radio" name="fac" value="${f.id}" ${i === 0 ? "checked" : ""}><span><b><span class="dot" style="background:${f.color}"></span>${esc(f.name)}</b><small><b>${esc(f.trait)}:</b> ${esc(f.traitText)}</small></span></label>`).join("")}</div>
    <div class="ng-row">
      <label>Galaxy <select id="ng-size"><option value="small">Small</option><option value="medium" selected>Medium</option><option value="large">Large</option><option value="vast">Vast</option></select></label>
      <label>Game <select id="ng-mode"><option value="standard" selected>Standard: 200 turns</option><option value="open">Open: no end</option></select></label>
      <label>Rivals <select id="ng-rivals"><option>1</option><option>2</option><option selected>3</option><option>4</option></select></label>
      <label>Difficulty <select id="ng-diff"><option value="easy">Easy</option><option value="normal" selected>Normal</option><option value="hard">Hard</option></select></label>
      <label>Seed <input type="text" id="ng-seed" placeholder="random" size="10"></label>
    </div>
    <label class="small check-line"><input type="checkbox" id="ng-crisis" checked> A late-game crisis: around turn 110 the Wardens, old war machines, wake in the rifts and come for every world</label>
    <label class="small check-line"><input type="checkbox" id="ng-steps" ${canContinue ? "" : "checked"}> Guide me through my first game, step by step</label>
    <div class="btn-row"><button class="btn primary" id="ng-start">Begin</button><button class="btn" id="ng-guide">New here? The starter guide</button><button class="btn" id="ng-load">Load a saved game</button></div>
    <p class="small muted">Version: ${esc(VERSION)}</p>`);
  if (preset) {
    $("ng-seed").value = preset.seed; $("ng-size").value = preset.size; $("ng-rivals").value = String(preset.rivals); $("ng-diff").value = preset.difficulty; $("ng-mode").value = preset.mode || "standard"; $("ng-crisis").checked = !preset.crisisOff;
    const r = document.querySelector(`input[name="fac"][value="${preset.player}"]`); if (r) r.checked = true;
  }
  if ($("ng-continue")) $("ng-continue").onclick = () => { try { startGame(JSON.parse(store.get())); } catch { toast("That save couldn't be read.", true); } };
  $("ng-start").onclick = () => {
    const seedText = $("ng-seed").value.trim();
    const st = newGame({ seed: seedText ? (/^\d+$/.test(seedText) ? +seedText : seedText) : undefined, size: $("ng-size").value, rivals: +$("ng-rivals").value,
      difficulty: $("ng-diff").value, player: document.querySelector('input[name="fac"]:checked').value, mode: $("ng-mode").value, crisis: $("ng-crisis").checked });
    if ($("ng-steps").checked) st.tutorial = { on: true, guide: true, ack: {}, seen: {} };
    startGame(st); save();
  };
  $("ng-guide").onclick = () => showStarter(canContinue);
  $("ng-load").onclick = () => showLoad(() => showNewGame(canContinue));
}
// The starter guide: what the game is and how a turn goes, before the first game.
const ICONS = {
  goal: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="none" stroke="#5ec8e0" stroke-width="3"/><circle cx="32" cy="32" r="12" fill="none" stroke="#5ec8e0" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="#f0c85a"/></svg>`,
  turn: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M50 32a18 18 0 1 1-6-13.4" fill="none" stroke="#5ec8e0" stroke-width="4" stroke-linecap="round"/><path d="M44 8v12h12" fill="none" stroke="#f0c85a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  world: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 54 19v26L32 58 10 45V19z" fill="rgba(30,40,70,.6)" stroke="#5e7ab8" stroke-width="2"/><circle cx="32" cy="32" r="11" fill="#5fa86a"/><circle cx="32" cy="32" r="16" fill="none" stroke="#3d7fbf" stroke-width="3"/></svg>`,
  ships: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 50 54 14" stroke="rgba(110,200,230,.7)" stroke-width="3" stroke-dasharray="6 5"/><circle cx="10" cy="50" r="6" fill="#4a8fc4"/><circle cx="54" cy="14" r="6" fill="#d0a25a"/><path d="M40 34l-14-7 4 7-4 7z" fill="#3d7fbf" stroke="#000" stroke-width="1"/></svg>`,
  battle: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="20" width="16" height="16" rx="3" fill="#dfe7f7"/><rect x="26" y="28" width="16" height="16" rx="3" fill="#dfe7f7"/><rect x="44" y="18" width="16" height="16" rx="3" fill="#dfe7f7"/><circle cx="16" cy="28" r="2" fill="#070a12"/><circle cx="31" cy="33" r="2" fill="#070a12"/><circle cx="37" cy="39" r="2" fill="#070a12"/><circle cx="48" cy="22" r="2" fill="#070a12"/><circle cx="52" cy="26" r="2" fill="#070a12"/><circle cx="56" cy="30" r="2" fill="#070a12"/></svg>`,
  win: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 10h24v14a12 12 0 0 1-24 0z" fill="#f0c85a"/><path d="M20 14H10a8 8 0 0 0 10 10M44 14h10a8 8 0 0 1-10 10" fill="none" stroke="#f0c85a" stroke-width="3"/><path d="M32 36v10M22 54h20" stroke="#f0c85a" stroke-width="4" stroke-linecap="round"/></svg>`,
};
function showStarter(canContinue) {
  const card = (icon, title, body) => `<div class="sg-card"><div class="sg-icon">${ICONS[icon]}</div><div><h3>${title}</h3>${body}</div></div>`;
  modal(`<div class="starter"><h1>Fracture Lines: Dominion</h1>
    <p class="lede">A strategy game of empires in the Fracture Lines galaxy. You start with one world, a scout, a frigate and a colony ship. Everything else, you build.</p>
    <div class="sg-grid">
      ${card("goal", "Your goal", `<p>Grow from one world into the strongest people in the galaxy. Win by <b>conquest</b>, by building the <b>Corridor Engine</b>, or with the <b>best score</b> at turn ${RULES.maxTurns}.</p>`)}
      ${card("turn", "How a turn goes", `<p>Give your orders, then press <b>End turn</b>. Everyone moves at once; then worlds grow, build and research.</p>`)}
      ${card("world", "Worlds", `<p>Click a world to see it. Population makes <b>industry</b> (to build), <b>science</b> (to research) and <b>credits</b> (to pay upkeep). Each world has its own build queue.</p>`)}
      ${card("ships", "Ships and moving", `<p>Click your fleet, then <b>right-click</b> where it should go (or press <b>Move</b>). Dashed lines are <b>corridors</b>: one move takes you all the way along one.</p>`)}
      ${card("battle", "Battles", `<p>Fleets of peoples at war fight when they meet. Each warship rolls three dice and hits on its skill or less. Take worlds with troop transports.</p>`)}
      ${card("win", "Your first ten turns", `<p>Pick research. Build a scout or a factory. Send the scout into the dark. Fly the colony ship to a good world and found a colony. The <b>First steps</b> list in the game walks you through it.</p>`)}
    </div>
    <div class="sg-keys"><span><kbd>Drag</kbd> pan</span><span><kbd>Scroll</kbd> zoom</span><span><kbd>Click</kbd> select</span><span><kbd>Right-click</kbd> move</span><span><kbd>N</kbd> next idle</span><span><kbd>Enter</kbd> end turn</span></div>
    <div class="btn-row"><button class="btn primary big" id="sg-first">Start my first game</button><button class="btn" id="sg-choose">Choose my own settings</button>${canContinue ? `<button class="btn" id="sg-continue">Continue your game</button>` : ""}</div>
    <p class="small muted">The first game is set up to learn on: the Concord, a small galaxy, two easy rivals, and the First steps checklist.</p></div>`);
  $("sg-first").onclick = () => { const st = newGame({ player: "concord", size: "small", rivals: 2, difficulty: "easy" }); st.tutorial = { on: true, guide: true, ack: {}, seen: {} }; startGame(st); save(); };
  $("sg-choose").onclick = () => showNewGame(canContinue);
  if ($("sg-continue")) $("sg-continue").onclick = () => { try { startGame(JSON.parse(store.get())); } catch { toast("That save couldn't be read.", true); } };
}

// First steps: a checklist that ticks itself off as the player does each thing.
function stepsList() {
  const me = player(S), cols = coloniesOf(S, me.id);
  return [
    { id: "research", label: "Choose what to research", done: !!me.research.current || me.research.done.length > 0 },
    { id: "build", label: "Build something at your capital", done: cols.some((x) => x.colony.queue.length) || me.stats.built > 0 },
    { id: "scout", label: "Send your scout into the dark", done: !!(S.tutorial && S.tutorial.scouted) || S.turn > 12 },
    { id: "colony", label: "Found a second colony", done: cols.filter((x) => x.colony.kind === "colony").length >= 2 },
    { id: "turn", label: "End your turn", done: S.turn >= 2 },
  ];
}
function renderSteps() {
  const el = $("steps");
  if (!S || !S.tutorial || !S.tutorial.on || guideOn()) { el.hidden = true; return; }   // the guide does this job while it runs
  const list = stepsList(), n = list.filter((x) => x.done).length;
  el.hidden = false;
  if (n === list.length) {
    el.innerHTML = `<div class="steps-head"><b>First steps: done</b><button class="x" data-steps-off title="Hide">×</button></div>
      <p class="small">You're off. Next: build a Factory and a Research lab at your capital, keep two or three frigates at home, and look for your neighbours under <b>Diplomacy</b>.</p>
      <button class="btn small" data-steps-off>Hide the checklist</button>`;
    return;
  }
  const next = list.find((x) => !x.done);
  el.innerHTML = `<div class="steps-head"><b>First steps</b><span class="small muted">${n} of ${list.length}</span><button class="x" data-steps-off title="Hide the checklist">×</button></div>
    <span class="meter"><span style="width:${(n / list.length) * 100}%;background:var(--good)"></span></span>
    <ol class="steps">${list.map((x) => `<li class="${x.done ? "done" : x === next ? "now" : ""}"><span>${x.done ? "✓" : ""}</span>${esc(x.label)}${x === next ? ` <button class="btn small" data-show="${x.id}">Show me</button>` : ""}</li>`).join("")}</ol>`;
}
function showMe(id) {
  const me = player(S), cap = S.systems[me.capital];
  if (id === "research") { tab = "research"; renderTabs(); renderPanel(); toast("Click a technology to research it. Deep sensors and Xenology are good first picks."); return; }
  if (id === "build") { select({ kind: "system", id: cap.id }); centerOn(cap.at); draw(); toast("Under Add to the queue, click a Scout, a Factory or a Colony ship."); return; }
  if (id === "scout") {
    const f = fleetsOf(S, me.id).find((x) => x.ships.some((y) => y.type === "scout"));
    if (!f) { select({ kind: "system", id: cap.id }); toast("Build a Scout at your capital first."); return; }
    select({ kind: "fleet", id: f.id }); centerOn(f.at); moveMode = true; renderPanel(); draw();
    toast("Your scout is selected. Click a dark hex far from home to send it there."); return;
  }
  if (id === "colony") {
    const f = fleetsOf(S, me.id).find((x) => x.ships.some((y) => y.type === "colony"));
    if (!f) { select({ kind: "system", id: cap.id }); toast("Build a Colony ship at your capital (Add to the queue)."); return; }
    const here = S.sysAt[f.at] && S.systems[S.sysAt[f.at]];
    if (here && canSettle(S, me.id, here, "colony")) { select({ kind: "fleet", id: f.id }); toast(`Your colony ship is at ${here.name}: press Found a colony.`); return; }
    const best = Object.values(S.systems).filter((x) => me.explored[x.at] && canSettle(S, me.id, x, "colony"))
      .sort((a, b) => (WORLDS[b.world].pop + b.size * 2) / (1 + distance(f.at, b.at) / 3) - (WORLDS[a.world].pop + a.size * 2) / (1 + distance(f.at, a.at) / 3))[0];
    select({ kind: "fleet", id: f.id });
    if (best) { setDestination(S, f.id, best.at); centerOn(best.at); save(); renderPanel(); draw(); toast(`Your colony ship is on its way to ${best.name}, a good world nearby. When it arrives, select it and press Found a colony.`); }
    else { centerOn(f.at); moveMode = true; renderPanel(); draw(); toast("No good world seen yet: explore, or click a world to send the colony ship there."); }
    return;
  }
  if (id === "turn") { const b = $("end-turn"); b.classList.add("pulse"); setTimeout(() => b.classList.remove("pulse"), 2400); toast("Press End turn (or Enter) when your orders are given."); }
}

// ---------- the guide: a first game, step by step ----------
// A card that walks a new player through the first turns. Each step says what to do and why, puts a gold ring on what
// to use, and moves on by itself once it's done ("read" steps wait for Got it). Skippable; the menu starts it again.
const GUIDE = [
  { id: "welcome", read: true, title: "Welcome to the Fracture Lines", text: "You lead one world, a scout, a frigate and a colony ship. Rivals are out there in the dark, building the same way. This guide walks you through your first turns; it moves on by itself as you do each thing. Tap Got it on the ones that only explain." },
  { id: "bar", read: true, target: ".bar", title: "Your empire at a glance", text: "Across the top: Credits (income less upkeep), Industry (what your worlds build with), Science (research) and Exotics (for heavy ships and great works), and the turn." },
  { id: "research", target: '[data-tab="research"]', tab: "research", show: "research", title: "Choose what to research", text: "Open the Research tab and pick a technology. Deep sensors or Xenology (harsher worlds to settle) are good first picks. You can't end a turn with nothing to research.", done: () => !!player(S).research.current || player(S).research.done.length > 0 },
  { id: "build", target: "#panel", show: "build", title: "Build something at your capital", text: "Your capital is selected: under Add to the queue, pick a Scout, a Factory or a Colony ship. Industry fills the queue a little every turn; credits can rush the front of it.", done: () => coloniesOf(S, player(S).id).some((x) => x.colony.queue.length) || player(S).stats.built > 0 },
  { id: "scout", target: "#map", show: "scout", title: "Send your scout into the dark", text: "Select your scout, then click a dark hex far from home (or press Move, then the hex). Dashed lines are corridors: one move takes a ship all the way along one.", done: () => !!(S.tutorial && S.tutorial.scouted) || S.turn > 12 },
  { id: "colony", target: "#map", show: "colony", title: "Found a second colony", text: "Send the colony ship to a good world nearby (Show me picks one), and when it arrives, select it and press Found a colony. More worlds mean more of everything.", done: () => coloniesOf(S, player(S).id).filter((x) => x.colony.kind === "colony").length >= 2 || fleetsOf(S, player(S).id).some((f) => f.dest && f.ships.some((x) => x.type === "colony")) },
  { id: "end", target: "#end-turn", title: "End the turn", text: "Press End turn (or Enter). Everyone moves at once; then worlds grow, build and research, and a report tells you what happened.", done: () => S.turn >= 2 },
  { id: "objectives", target: '[data-tab="objectives"]', tab: "objectives", title: "Three ways to win", text: "The Objectives tab: conquest (the last power standing), the Corridor Engine (research it, then build it at your capital), or the best score at turn 200. It shows how close everyone is.", done: () => S.tutorial.seen && S.tutorial.seen.objectives },
  { id: "mission", target: '[data-tab="mission"]', tab: "mission", title: "Directives and campaigns", text: "Your people send directives (the Mission tab): each pays credits, and each is a race against a rival. From turn 8, campaigns: three in a row, each against your nearest rival. Your research arm sends field tests that leave a prototype upgrade.", done: () => S.tutorial.seen && S.tutorial.seen.mission },
  { id: "empire", target: '[data-tab="empire"]', tab: "empire", title: "Focus", text: "The Empire tab: share three Focus points between industry, science, credits and defense (2 at most to one). Change it whenever you like. Your prototypes are listed here too.", done: () => S.tutorial.seen && S.tutorial.seen.empire },
  { id: "fleets", read: true, title: "Fleets: stance and supply", text: "Select a fleet to set its battle stance (aggressive, balanced, defensive). Warships more than 3 hexes from your worlds and outposts are out of supply and wear down: outposts push your supply line out." },
  { id: "done", read: true, title: "The galaxy is yours", text: "That's the turn: research, build, move, end the turn. Next: a Factory and a Research lab at your capital, two or three frigates at home, and meet your neighbours (Diplomacy). Menu → Restart the guide brings this back any time." },
];
const guideOn = () => S && S.tutorial && S.tutorial.guide && !S.tutorial.guideDone;
function guideStep() {
  const T = S.tutorial; T.ack = T.ack || {}; T.done = T.done || {};
  // A step once done stays done (a colony ship that arrives no longer has a course, but it was sent).
  for (let i = 0; i < GUIDE.length; i++) { const g = GUIDE[i]; if (!g.read && !T.done[g.id] && g.done()) T.done[g.id] = true; if (g.read ? !T.ack[g.id] : !T.done[g.id]) return [g, i]; }
  return [null, GUIDE.length];
}
function renderCoach() {
  const el = $("coach"); document.querySelectorAll(".coach-target").forEach((x) => x.classList.remove("coach-target"));
  if (!guideOn()) { el.hidden = true; return; }
  const [g, i] = guideStep();
  if (!g) { S.tutorial.guideDone = true; el.hidden = true; save(); return; }
  if (S.tutorial.minFor && S.tutorial.minFor !== g.id) { S.tutorial.min = false; S.tutorial.minFor = null; }   // a new step opens the card again
  el.hidden = false; el.classList.toggle("min", !!S.tutorial.min);
  el.innerHTML = `<div class="coach-step">Your first game · step ${i + 1} of ${GUIDE.length}</div><h4>${esc(g.title)}</h4><p>${esc(g.text)}</p>
    <div class="btn-row">${g.read ? `<button class="btn small primary" data-coach="ack">Got it</button>` : g.target ? `<button class="btn small primary" data-coach="show">Show me</button>` : ""}<button class="btn small" data-coach="min">${S.tutorial.min ? "Open" : "Hide for now"}</button><button class="coach-skip" data-coach="skip">End the guide</button></div>`;
  if (g.target) document.querySelectorAll(g.target).forEach((x) => x.classList.add("coach-target"));
}
const seeTab = (t) => { if (S && S.tutorial) { (S.tutorial.seen = S.tutorial.seen || {})[t] = true; save(); } };
function coachClick(e) {
  const b = e.target.closest("[data-coach]"); if (!b || !S) return;
  const [g] = guideStep(), a = b.dataset.coach, T = S.tutorial;
  if (a === "ack" && g) T.ack[g.id] = true;
  else if (a === "skip") { T.guideDone = true; toast("Guide ended. Menu → Restart the guide brings it back."); }
  else if (a === "min") T.min = !T.min;
  else if (a === "show" && g) {
    if (g.show && g.id !== "research") showMe(g.show);
    if (g.tab) { tab = g.tab; seeTab(tab); renderTabs(); renderPanel(); }
    if (g.id === "research") toast("Click a technology to research it. Deep sensors and Xenology are good first picks.");
    if (g.id === "end") showMe("turn");
    const t = g.target && document.querySelector(g.target); if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
    // On a phone the card would cover the map: fold it down while the map step is done.
    if (g.target === "#map" && matchMedia("(max-width: 820px)").matches) { T.min = true; T.minFor = g.id; window.scrollTo({ top: 0, behavior: "smooth" }); }
  }
  save(); renderAll();
}
function startGuide() { S.tutorial = { ...(S.tutorial || {}), on: true, guide: true, guideDone: false, ack: {}, seen: {}, done: {}, min: false }; save(); renderAll(); }

function showHelp(back) {
  modal(`<h1>How to play</h1>
    <ul class="help">
      <li><b>Each turn</b>, give orders, then press <b>End turn</b> (or Enter). Everyone moves at once.</li>
      <li><b>Worlds</b> grow population, which makes <b>industry</b> (to build), <b>science</b> (to research) and <b>credits</b> (to pay upkeep). Pick what each world builds in its queue; rush the first item with credits.</li>
      <li><b>Corridors</b> (the dashed lines) link systems: a jump along one costs 1 move, however far. Nebulae cost 2 and hide ships; red rifts block.</li>
      <li><b>Colony ships</b> settle worlds you can live on; <b>outpost ships</b> claim any system, for its exotics ◆ and territory. Xenology and Habitat domes open harsher worlds.</li>
      <li><b>Exotics</b> ◆ come from deposits. Cruisers, dreadnoughts and the Corridor Engine need them.</li>
      <li><b>Battles</b> happen when fleets of factions at war share a hex. Each armed ship rolls 3d6 under its skill to hit (3–4 always hits, 17–18 always misses), three exchanges a turn. Worlds with guns fire back.</li>
      <li><b>Invading:</b> clear the orbit (warships and guns), then land troop transports whose troops match the defense.</li>
      <li><b>Diplomacy:</b> meet rivals by seeing them. Trade for credits; settling next to them makes them angry.</li>
      <li><b>Win</b> by conquest (the last people standing), by building the <b>Corridor Engine</b> (research it, then build it at your capital), or with the highest score at turn ${RULES.maxTurns}.</li>
      <li><b>Map:</b> drag to pan, scroll to zoom, click to select, right-click to move the selected fleet. <b>M</b> toggles move, <b>Esc</b> cancels.</li>
    </ul><div class="btn-row"><button class="btn primary" id="help-back">Back</button></div>`);
  $("help-back").onclick = back;
}
/** This game's galaxy: its seed and the settings that, with it, rebuild the same map. */
function galaxyInfo() {
  const size = { small: "Small", medium: "Medium", large: "Large", vast: "Vast" }[S.size] || S.size, rivals = S.factions.length - 1;
  const diff = { easy: "Easy", normal: "Normal", hard: "Hard" }[S.difficulty] || S.difficulty;
  return { seed: String(S.seed), text: `Seed ${S.seed} · ${size} galaxy · ${rivals} rival${rivals === 1 ? "" : "s"} · ${diff}`,
    preset: { seed: String(S.seed), size: S.size, rivals, difficulty: S.difficulty, player: player(S).id, mode: S.mode || "standard", crisisOff: !!S.crisisOff } };
}
function galaxyBox() {
  const g = galaxyInfo();
  return `<div class="seedbox"><h3>This galaxy</h3><p><b class="seed" id="seed-text">${esc(g.seed)}</b></p><p class="small muted">${esc(g.text)}. The same seed and settings build the same map.</p>
    <div class="btn-row"><button class="btn small" id="seed-copy">Copy the seed</button><button class="btn small" id="seed-replay">Replay this galaxy</button></div></div>`;
}
function bindGalaxyBox() {
  const g = galaxyInfo();
  $("seed-copy").onclick = () => {
    const text = `Fracture Lines: Dominion — ${g.text}`, p = navigator.clipboard && navigator.clipboard.writeText(text);
    const fail = () => { const r = document.createRange(); r.selectNodeContents($("seed-text")); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r); toast("Copying is blocked here: the seed is selected, copy it yourself."); };
    if (p) p.then(() => toast("Seed copied, with its settings."), fail); else fail();
  };
  $("seed-replay").onclick = () => showNewGame(true, g.preset);
}
function showMenu() {
  modal(`<h1>Menu</h1><div class="btn-row col">
    <button class="btn" id="m-resume">Back to the game</button>
    <button class="btn" id="m-help">How to play</button>
    <button class="btn" id="m-guide">The starter guide</button>
    <button class="btn" id="m-guide-go">${guideOn() ? "Restart" : "Start"} the guide</button>
    <button class="btn" id="m-steps">${S && S.tutorial && S.tutorial.on ? "Hide" : "Show"} the First steps checklist</button>
    <a class="btn" href="tokens.html" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">Printable ship tokens</a>
    <button class="btn" id="m-export">Save code (copy)</button>
    <button class="btn" id="m-load">Load a saved game</button>
    ${S && S.mode === "open" && !S.winner ? `<button class="btn" id="m-retire">Retire: end the game here</button>` : ""}
    <button class="btn danger" id="m-new">New game</button></div>
    <p class="small muted">Your game saves itself in this browser after every action. Version: ${esc(VERSION)}</p>${galaxyBox()}`);
  if ($("m-retire")) $("m-retire").onclick = () => { retire(S); save(); closeModal(); renderAll(); showEnd(); };
  bindGalaxyBox();
  $("m-resume").onclick = closeModal;
  $("m-help").onclick = () => showHelp(showMenu);
  $("m-guide").onclick = () => showStarter(true);
  $("m-guide-go").onclick = () => { closeModal(); startGuide(); };
  $("m-steps").onclick = () => { S.tutorial = S.tutorial || {}; S.tutorial.on = !S.tutorial.on; save(); closeModal(); renderSteps(); };
  $("m-new").onclick = () => showNewGame(!!S);
  $("m-load").onclick = () => showLoad(showMenu);
  $("m-export").onclick = () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    modal(`<h1>Save code</h1><p class="small">Keep this text somewhere safe; paste it into <b>Load a saved game</b> to come back to this turn.</p><textarea id="save-code" rows="8" readonly>${esc(code)}</textarea><div class="btn-row"><button class="btn primary" id="sc-copy">Copy</button><button class="btn" id="sc-back">Back</button></div>`);
    $("sc-back").onclick = showMenu;
    $("sc-copy").onclick = () => { const p = navigator.clipboard && navigator.clipboard.writeText(code); const fail = () => { $("save-code").select(); toast("Copying is blocked here: the code is selected, copy it yourself."); }; if (p) p.then(() => toast("Copied."), fail); else fail(); };
  };
}
function showLoad(back) {
  modal(`<h1>Load a saved game</h1><p class="small">Paste a save code.</p><textarea id="load-code" rows="8"></textarea><div class="btn-row"><button class="btn primary" id="ld-go">Load</button><button class="btn" id="ld-back">Back</button></div>`);
  $("ld-back").onclick = back;
  $("ld-go").onclick = () => {
    try { const st = JSON.parse(decodeURIComponent(escape(atob($("load-code").value.trim())))); if (!st.factions || !st.systems) throw 0; startGame(st); save(); toast("Loaded."); }
    catch { toast("That isn't a save code.", true); }
  };
}
function showEnd() {
  const me = player(S), won = S.winner === me.id, W = S.winner && S.winner !== "none" ? faction(S, S.winner) : null;
  const why = { conquest: "by conquest", engine: "by finishing the Corridor Engine", score: `with the highest score at turn ${RULES.maxTurns}`, fallen: "", retired: `on your own terms, at turn ${S.turn}` }[S.winReason] || "";
  modal(`<h1>${won ? "Victory" : "Defeat"}</h1><p class="lede">${won ? `You win ${why}.` : W ? `${esc(W.name)} wins ${why}.` : "Your people have fallen."}</p>
    <table class="tbl"><tr><th>Faction</th><th>Worlds</th><th>Score</th></tr>${S.factions.map((F) => `<tr><td><span class="dot" style="background:${F.color}"></span>${esc(F.name)}${F.alive ? "" : " †"}</td><td>${coloniesOf(S, F.id).length}</td><td>${score(S, F.id)}</td></tr>`).join("")}</table>
    ${won && S.winReason !== "retired" ? `<p class="small">Keep ruling and the game goes on in open rule, with no end but the one you choose. The directives and campaigns go on too.</p>` : ""}
    <div class="btn-row">${won && S.winReason !== "retired" ? `<button class="btn primary" id="end-keep">Keep ruling</button>` : ""}<button class="btn ${won && S.winReason !== "retired" ? "" : "primary"}" id="end-new">New game</button><button class="btn" id="end-look">Look at the map</button></div>${galaxyBox()}`);
  bindGalaxyBox();
  if ($("end-keep")) $("end-keep").onclick = () => { keepRuling(S); save(); closeModal(); renderAll(); };
  $("end-new").onclick = () => showNewGame(false);
  $("end-look").onclick = closeModal;
}
let toastTimer = null;
function toast(msg, bad) { const t = $("toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : ""); clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = "toast"), 4200); }

if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot); else boot();
