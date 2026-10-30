// The browser game: the hex map on a canvas, the side panel, the turn bar and the dialogs.
import { key, parse, toPixel, fromPixel, distance, within } from "./hex.js";
import { FACTIONS, WORLDS, BUILDINGS, SHIPS, TECHS, RULES } from "./data.js";
import { newGame, endTurn, faction, player, coloniesOf, fleetsOf, fleetsAt, shipStats, fleetSpeed, armed, atWar, canSettle, maxPop, yields, totals,
  buildOptions, enqueue, dequeue, rush, rushCost, availableTechs, setResearch, setDestination, findPath, splitFleet, settle, invade, invasionOdds,
  declareWar, propose, score, militaryPower, has, mergeFleets } from "./game.js";
import { aiTurn } from "./ai.js";

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
  showNewGame(!!saved);
}
function startGame(state) {
  S = state; sel = null; moveMode = false; tab = "selected";
  const cap = S.systems[player(S).capital];
  centerOn(cap.at); view.zoom = 1;
  select({ kind: "system", id: cap.id });
  $("app").hidden = false; closeModal();
  renderAll();
  if (S.turn === 1) toast(`You lead ${player(S).name}. Explore, settle, and find out who else is out here.`);
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
  if (r.error) toast(r.error, true); else if (hex !== f.at) toast(`On course: ${r.turns} turn${r.turns === 1 ? "" : "s"}.`);
  save(); renderPanel(); draw();
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
      const fx = x - 10 + i * 9, fy = y - 14;
      const war = f.owner !== me.id && atWar(S, me.id, f.owner);
      ctx.fillStyle = colorOf(f.owner); ctx.strokeStyle = sel && sel.id === f.id ? "#fff6b0" : war ? "#ff6b5b" : "rgba(0,0,0,.7)"; ctx.lineWidth = sel && sel.id === f.id ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(fx + 8, fy); ctx.lineTo(fx - 4, fy - 6); ctx.lineTo(fx - 1, fy); ctx.lineTo(fx - 4, fy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (f.ships.length > 1 && view.zoom > 0.5) { ctx.fillStyle = "#fff"; ctx.font = "bold 9px system-ui, sans-serif"; ctx.fillText(String(f.ships.length), fx + 8, fy - 4); }
    });
  }
  // Hover and selection rings.
  if (sel && sel.kind === "system") { const { x, y } = toPixel(S.systems[sel.id].at, size); hexPath(ctx, x, y, size - 1); ctx.strokeStyle = "#fff6b0"; ctx.lineWidth = 2; ctx.stroke(); }
  if (moveMode && hoverHex && S.hexes[hoverHex]) { const { x, y } = toPixel(hoverHex, size); hexPath(ctx, x, y, size - 1); ctx.strokeStyle = "rgba(255,230,140,.9)"; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}

// ---------- the bar and the panels ----------
function renderAll() { renderBar(); renderTabs(); renderPanel(); draw(); }
function renderBar() {
  const me = player(S), t = totals(S, me.id), R = me.research, tech = R.current && TECHS.find((x) => x.id === R.current);
  $("bar-faction").innerHTML = `<span class="dot" style="background:${me.color}"></span>${esc(me.name)}`;
  $("bar-stats").innerHTML = [
    `<span title="Credits: income minus upkeep each turn"><b>Credits</b> ${fmt(me.credits)} <i class="${t.net < 0 ? "neg" : ""}">${signed(t.net)}</i></span>`,
    `<span title="Industry from all your worlds"><b>Industry</b> ${fmt(t.ind)}</span>`,
    `<span title="Research each turn"><b>Science</b> ${fmt(t.sci)}${tech ? ` → ${esc(tech.name)} ${Math.floor((R.progress / tech.cost) * 100)}%` : ` <i class="neg">pick research</i>`}</span>`,
    `<span title="Exotics: for cruisers, dreadnoughts and great works"><b>Exotics</b> ${me.exotics} <i>${signed(t.exo)}</i></span>`,
  ].join("");
  $("bar-turn").textContent = `Turn ${S.turn} of ${RULES.maxTurns}`;
  const idle = idleThings().length; $("next").textContent = idle ? `Next (${idle})` : "Next"; $("next").title = "Idle fleets, and worlds with nothing to build (N)";
  $("end-turn").disabled = !!S.winner;
}
function renderTabs() {
  const offers = S ? S.offers.filter((o) => o.to === player(S).id).length : 0;
  document.querySelectorAll("[data-tab]").forEach((b) => { b.setAttribute("aria-selected", String(b.dataset.tab === tab)); if (b.dataset.tab === "diplomacy") b.textContent = offers ? `Diplomacy (${offers})` : "Diplomacy"; });
}
function renderPanel() {
  const P = $("panel");
  if (tab === "selected") P.innerHTML = sel ? (sel.kind === "fleet" ? fleetHTML() : systemHTML()) : `<p class="muted">Select a world or a fleet on the map. Drag to pan, scroll or use the buttons to zoom. With a fleet selected, right-click a hex (or press <b>Move</b>) to send it there.</p>`;
  else if (tab === "empire") P.innerHTML = empireHTML();
  else if (tab === "research") P.innerHTML = researchHTML();
  else if (tab === "diplomacy") P.innerHTML = diplomacyHTML();
  else if (tab === "log") P.innerHTML = logHTML();
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
    h += `<h3>Add to the queue</h3><div class="opts">${opts.map((o) => `<button class="opt" data-build="${o.kind}:${o.id}" title="${esc(o.kind === "ship" ? SHIPS[o.id].text : BUILDINGS[o.id].text)}"><b>${esc(o.name)}</b><span>${o.cost}${o.exotics ? ` + ${o.exotics}◆` : ""}</span></button>`).join("")}</div>`;
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
  h += `<ul class="ships">${f.ships.map((x) => { const st = shipStats(S, f.owner, x.type); return `<li><b>${esc(st.name)}</b>${st.skill ? `<span class="small">skill ${st.skill}, ${st.dmg} dmg</span>` : ""}${bar(x.hull, st.hull, x.hull < st.hull ? "#e0a050" : "#7bc47f")}<span class="small">${x.hull}/${st.hull}</span></li>`; }).join("")}</ul>`;
  if (!mine) return h + (atWar(S, me.id, f.owner) ? `<p class="bad">At war with you.</p>` : "");
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
    h += `<p class="small">Invasion: your troops ${o.troops} against their defense ${o.defense}.${o.guarded ? " Their orbital guns or warships still hold the orbit." : ""}${!war ? " You're not at war with them." : ""}</p><button class="btn wide ${o.troops >= o.defense ? "primary" : ""}" data-invade ${!war || o.guarded ? "disabled" : ""}>Land the troops</button>`;
  }
  const others = fleetsAt(S, f.at).filter((o) => o.owner === me.id && o.id !== f.id);
  if (others.length) h += `<h3>Join with</h3>` + others.map((o) => `<button class="row" data-merge="${o.id}">${esc(fleetName(o))}</button>`).join("");
  const types = [...new Set(f.ships.map((x) => x.type))];
  if (f.ships.length > 1) h += `<h3>Split off</h3><div class="opts">${types.map((t) => `<button class="opt" data-split="${t}"><b>${esc(SHIPS[t].name)}</b></button>`).join("")}</div>`;
  return h;
}
function empireHTML() {
  const me = player(S), t = totals(S, me.id);
  const cols = coloniesOf(S, me.id).sort((a, b) => (b.colony.pop || 0) - (a.colony.pop || 0));
  let h = `<h2>${esc(me.name)}</h2><p class="small muted">${esc(FACTIONS.find((f) => f.id === me.id).trait)}: ${esc(FACTIONS.find((f) => f.id === me.id).traitText)}</p>
    <div class="yields"><span>Income <b>${fmt(t.cr)}</b></span><span>Upkeep <b>${fmt(t.upkeep)}</b></span><span>Score <b>${score(S, me.id)}</b></span><span>Fleet power <b>${militaryPower(S, me.id)}</b></span></div>
    <h3>Worlds (${cols.length})</h3><table class="tbl"><tr><th>World</th><th>Pop</th><th>Ind</th><th>Sci</th><th>Building</th></tr>
    ${cols.map((sys) => { const y = yields(S, sys); return `<tr data-selsys="${sys.id}"><td>${sys.colony.capital ? "★ " : ""}${esc(sys.name)}${sys.colony.kind === "outpost" ? " <i>(outpost)</i>" : ""}</td><td>${sys.colony.pop || "–"}</td><td>${fmt(y.ind)}</td><td>${fmt(y.sci)}</td><td>${esc(sys.colony.queue[0] ? sys.colony.queue[0].name : sys.colony.kind === "colony" ? "—" : "")}</td></tr>`; }).join("")}</table>
    <h3>Fleets (${fleetsOf(S, me.id).length})</h3>${fleetsOf(S, me.id).map((f) => `<button class="row" data-selfleet="${f.id}">${esc(fleetName(f))}<span class="small muted">${f.path.length ? " · moving" : " · idle"}</span></button>`).join("")}
    <h3>Rivals</h3><table class="tbl"><tr><th>Faction</th><th>Worlds</th><th>Score</th></tr>${S.factions.slice(1).map((F) => `<tr><td><span class="dot" style="background:${F.color}"></span>${me.met[F.id] ? esc(F.name) : "Unknown"}${F.alive ? "" : " †"}</td><td>${me.met[F.id] ? coloniesOf(S, F.id).length : "?"}</td><td>${me.met[F.id] ? score(S, F.id) : "?"}</td></tr>`).join("")}</table>`;
  return h;
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
    const mood = !F.alive ? "gone" : them.score > 15 ? "friendly" : them.score > -5 ? "wary" : them.score > -20 ? "hostile" : "furious";
    h += `<div class="dip"><h3><span class="dot" style="background:${F.color}"></span>${esc(F.name)}${F.alive ? "" : " †"}</h3>
      <p class="small">${r.status === "war" ? `<b class="bad">At war</b> for ${r.turnsAtWar} turns` : "<b>At peace</b>"}${r.treaty ? " · trading" : ""} · they are ${mood}. ${esc(FACTIONS.find((x) => x.id === F.id).trait)}. Worlds ${coloniesOf(S, F.id).length}, fleet power ${militaryPower(S, F.id)}.</p>
      ${F.alive ? `<div class="btn-row">${r.status === "war" ? `<button class="btn" data-dip="${F.id}:peace">Propose peace</button>` : `<button class="btn" data-dip="${F.id}:${r.treaty ? "endTrade" : "trade"}">${r.treaty ? "End the trade treaty" : "Propose trade"}</button><button class="btn danger" data-dip="${F.id}:war">Declare war</button>`}</div>` : ""}</div>`;
  }
  return h;
}
function logHTML() {
  const me = player(S);
  const rows = S.log.filter((l) => !l.fid || l.fid === me.id || l.kind === "war" || l.kind === "victory" || (l.kind === "diplo" && l.text.includes(me.name))).slice(-80).reverse();
  return `<h2>Log</h2><ul class="log">${rows.map((l) => `<li class="${l.kind}"><span class="t">T${l.turn}</span>${esc(l.text)}</li>`).join("")}</ul>`;
}

// ---------- the panel's buttons ----------
function bindChrome() {
  $("panel").addEventListener("click", (e) => {
    const b = e.target.closest("button, tr[data-selsys]"); if (!b || !S) return;
    const d = b.dataset, me = player(S);
    if (d.selfleet) { select({ kind: "fleet", id: d.selfleet }); const f = S.fleets[d.selfleet]; if (f) { centerOn(f.at); draw(); } return; }
    if (d.selsys) { select({ kind: "system", id: d.selsys }); centerOn(S.systems[d.selsys].at); draw(); return; }
    if (d.build) { const [k, id] = d.build.split(":"); const r = enqueue(S, sel.id, k, id); if (r.error) toast(r.error, true); }
    else if (d.deq !== undefined) dequeue(S, sel.id, +d.deq);
    else if (d.rush !== undefined) { const r = rush(S, sel.id); if (r.error) toast(r.error, true); }
    else if (d.move !== undefined) { moveMode = !moveMode; if (moveMode) toast("Click where to send this fleet. Esc cancels."); }
    else if (d.stop !== undefined) setDestination(S, sel.id, S.fleets[sel.id].at);
    else if (d.sentry !== undefined) { const f = S.fleets[sel.id]; f.sentry = !f.sentry; if (f.sentry) nextIdle(); }
    else if (d.settle !== undefined) { const at = S.fleets[sel.id].at, r = settle(S, sel.id); if (r.error) toast(r.error, true); else { toast(`${S.systems[S.sysAt[at]].name} is yours.`); if (!S.fleets[sel.id]) sel = { kind: "system", id: S.sysAt[at] }; } }
    else if (d.invade !== undefined) { const r = invade(S, sel.id); if (r.error) toast(r.error, true); else toast(r.taken ? "The world is yours." : "The landing failed.", !r.taken); if (!S.fleets[sel.id]) sel = null; }
    else if (d.merge) { const r = mergeFleets(S, sel.id, d.merge); if (r.error) toast(r.error, true); }
    else if (d.split) { const r = splitFleet(S, sel.id, d.split); if (r.error) toast(r.error, true); else sel = { kind: "fleet", id: r.fleet }; }
    else if (d.tech) setResearch(S, me.id, d.tech);
    else if (d.dip) {
      const [fid, what] = d.dip.split(":");
      if (what === "war") { if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Click again to declare war"; return; } declareWar(S, me.id, fid); toast(`You are at war with ${faction(S, fid).name}.`, true); }
      else { const r = propose(S, me.id, fid, what); if (r.error) toast(r.error, true); else toast(what === "endTrade" ? "Trade ended." : r.accepted ? "They accept." : "They refuse.", !r.accepted); }
    } else if (d.offer) {
      const [i, ans] = d.offer.split(":"); const o = S.offers[+i];
      if (o) { if (ans === "yes") propose(S, o.from, o.to, o.what); S.offers.splice(+i, 1); toast(ans === "yes" ? "Agreed." : "Declined."); }
    } else return;
    save(); renderAll();
  });
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; renderTabs(); renderPanel(); }));
  $("end-turn").addEventListener("click", doEndTurn);
  $("zoom-in").addEventListener("click", () => zoomBy(1.25));
  $("zoom-out").addEventListener("click", () => zoomBy(0.8));
  $("home").addEventListener("click", () => { if (S) { centerOn(S.systems[player(S).capital].at); draw(); } });
  $("menu").addEventListener("click", () => showMenu());
  $("next").addEventListener("click", nextIdle);
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
    $("end-turn").textContent = "End turn";
    save();
    // News: what happened to you this turn.
    const news = S.log.slice(before.log).filter((l) => l.fid === me.id || l.kind === "victory" || (l.kind === "war" && (l.text.includes(me.name))) || (l.kind === "diplo" && l.text.includes(me.name)));
    if (sel && sel.kind === "fleet" && !S.fleets[sel.id]) sel = null;
    renderAll();
    if (S.winner) { showEnd(); return; }
    if (news.length) toast(news.slice(-3).map((l) => l.text).join(" "));
  }, 30);
}

// ---------- dialogs ----------
function modal(html) { $("modal-body").innerHTML = html; $("modal").hidden = false; }
function closeModal() { $("modal").hidden = true; }
function showNewGame(canContinue) {
  modal(`<h1>Fracture Lines: Dominion</h1>
    <p class="lede">The old empires are breaking along the corridors. Lead a people of the Fracture Lines from one world to an empire: explore, settle, trade, research and fight, turn by turn.</p>
    ${canContinue ? `<div class="btn-row"><button class="btn primary" id="ng-continue">Continue your game</button></div>` : ""}
    <h3>Choose your people</h3><div class="factions">${FACTIONS.map((f, i) => `<label class="fac"><input type="radio" name="fac" value="${f.id}" ${i === 0 ? "checked" : ""}><span><b><span class="dot" style="background:${f.color}"></span>${esc(f.name)}</b><small><b>${esc(f.trait)}:</b> ${esc(f.traitText)}</small></span></label>`).join("")}</div>
    <div class="ng-row">
      <label>Galaxy <select id="ng-size"><option value="small">Small</option><option value="medium" selected>Medium</option><option value="large">Large</option></select></label>
      <label>Rivals <select id="ng-rivals"><option>1</option><option>2</option><option selected>3</option><option>4</option></select></label>
      <label>Difficulty <select id="ng-diff"><option value="easy">Easy</option><option value="normal" selected>Normal</option><option value="hard">Hard</option></select></label>
      <label>Seed <input type="text" id="ng-seed" placeholder="random" size="10"></label>
    </div>
    <div class="btn-row"><button class="btn primary" id="ng-start">Begin</button><button class="btn" id="ng-help">How to play</button><button class="btn" id="ng-load">Load a saved game</button></div>`);
  if ($("ng-continue")) $("ng-continue").onclick = () => { try { startGame(JSON.parse(store.get())); } catch { toast("That save couldn't be read.", true); } };
  $("ng-start").onclick = () => {
    const seedText = $("ng-seed").value.trim();
    startGame(newGame({ seed: seedText ? (/^\d+$/.test(seedText) ? +seedText : seedText) : undefined, size: $("ng-size").value, rivals: +$("ng-rivals").value,
      difficulty: $("ng-diff").value, player: document.querySelector('input[name="fac"]:checked').value }));
    save();
  };
  $("ng-help").onclick = () => showHelp(() => showNewGame(canContinue));
  $("ng-load").onclick = () => showLoad(() => showNewGame(canContinue));
}
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
function showMenu() {
  modal(`<h1>Menu</h1><div class="btn-row col">
    <button class="btn" id="m-resume">Back to the game</button>
    <button class="btn" id="m-help">How to play</button>
    <button class="btn" id="m-export">Save code (copy)</button>
    <button class="btn" id="m-load">Load a saved game</button>
    <button class="btn danger" id="m-new">New game</button></div>
    <p class="small muted">Your game saves itself in this browser after every action.</p>`);
  $("m-resume").onclick = closeModal;
  $("m-help").onclick = () => showHelp(showMenu);
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
  const why = { conquest: "by conquest", engine: "by finishing the Corridor Engine", score: `with the highest score at turn ${RULES.maxTurns}`, fallen: "" }[S.winReason] || "";
  modal(`<h1>${won ? "Victory" : "Defeat"}</h1><p class="lede">${won ? `You win ${why}.` : W ? `${esc(W.name)} wins ${why}.` : "Your people have fallen."}</p>
    <table class="tbl"><tr><th>Faction</th><th>Worlds</th><th>Score</th></tr>${S.factions.map((F) => `<tr><td><span class="dot" style="background:${F.color}"></span>${esc(F.name)}${F.alive ? "" : " †"}</td><td>${coloniesOf(S, F.id).length}</td><td>${score(S, F.id)}</td></tr>`).join("")}</table>
    <div class="btn-row"><button class="btn primary" id="end-new">New game</button><button class="btn" id="end-look">Look at the map</button></div>`);
  $("end-new").onclick = () => showNewGame(false);
  $("end-look").onclick = closeModal;
}
let toastTimer = null;
function toast(msg, bad) { const t = $("toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : ""); clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = "toast"), 4200); }

if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot); else boot();
