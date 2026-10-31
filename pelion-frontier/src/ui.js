// The page: the sector map on a canvas, the side panel's tabs, and the dialogs (new game, battle, story, the end).
import { key, toPixel, fromPixel, distance } from "./hex.js";
import { TOUR, STARDATE0, CREW, CAPTAIN, PELION, SUPPORT, ENEMIES, KINDS, REFITS, RECORDS, POWERS, chance } from "./data.js";
import { newGame, hourly, stardate, sysAt, officer, available, free, helperFor, skillOf, target, rollTarget, bestOfficer, actionsFor, attempt, resolve, canReroll, moveTo, reachable, findPath,
  speedOf, visibleEnemies, enemiesAt, requisition, fitRefit, setStation, score, rating, stationOfficer, sensorsRating } from "./game.js";
import { exchange, battleStats, shieldsMax, powerOf } from "./combat.js";
import { endTurn, canEndTurn, chooseEvent, dismissEvent, closeBattle } from "./turn.js";
import { arcEventChoices, COUNTDOWN, CLOCK, CLUES, beamDown, SITES, SITE_OF, THEORY_AT, cluesFound } from "./arc.js";
import { kindName } from "./ai.js";
import { RADIUS, inZone } from "./sector.js";

const SAVE_KEY = "pelion-frontier.save.v1";
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (t) => Math.round(chance(t) * 100) + "%";
const store = { get: () => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(SAVE_KEY, v); } catch {} }, clear: () => { try { localStorage.removeItem(SAVE_KEY); } catch {} } };

let mapMode = "sector";   // "sector", or "surface": the planetary map of Corvan II while an away team is down
let S = null, unit = "pelion", selHex = null, tab = "here", lastResult = null, eventResult = null, bchoice = null, hoverHex = null;
const view = { x: 0, y: 0, zoom: 1, size: 28 };
const U = () => (unit === "pelion" ? S.pelion : S.support[unit]) || (unit = "pelion", S.pelion);

// ---------- start ----------
function debugHook() {
  try { if (!/[?&]debug\b/.test(location.search)) return; } catch { return; }
  window.__pelion = { state: () => S, screenOf: (hex) => { const c = $("map"), r = c.getBoundingClientRect(), p = toPixel(hex, view.size); return { x: r.left + r.width / 2 + (p.x - view.x) * view.zoom, y: r.top + r.height / 2 + (p.y - view.y) * view.zoom }; }, centerOn: (h) => { centerOn(h); draw(); } };
}
function boot() { bindMap(); bindChrome(); debugHook(); showStarter(!!store.get()); }
function startGame(state) {
  S = state; unit = "pelion"; selHex = S.pelion.at; tab = "orders"; lastResult = null; bchoice = null;
  fitView();
  $("app").hidden = false; closeModal();
  after();
  if (S.turn === 1 && !S.log.some((l) => l.text.startsWith("Captain"))) toast(`Orders: Corvan II has gone silent. Double-click it (marked !) to set course.`);
}
function save() { if (S) store.set(JSON.stringify(S)); }
/** After anything changes: save, redraw, and open whatever dialog the state calls for. */
let report = null;   // { title, roll, lines }: what the last choice led to, shown before anything it set off
const mark = () => S.logSeq || 0;
/** Note what a choice led to: every log line since `since` (story scenes have their own pop-ups). */
function reportSince(title, since, roll) {
  const lines = S.log.filter((l) => l.id > since && !l.story).map((l) => l.text);
  if (lines.length || roll) report = { title, roll, lines };
}
function after() {
  save(); renderAll();
  if (report) showReport();
  else if (S.battle) showBattle();
  else if (S.event) showEvent();
  else if (S.over) showEnd();
}

// ---------- the map ----------
/** Show the whole sector. */
function fitView() {
  const c = $("map"), W = c.clientWidth || 900, H = c.clientHeight || 700, size = view.size;
  view.x = 0; view.y = 0; view.zoom = Math.max(0.45, Math.min(1.4, Math.min(W / (Math.sqrt(3) * size * (2 * RADIUS + 2)), H / (1.5 * size * (2 * RADIUS + 1) + 2 * size))));
}
function centerOn(hex) { const p = toPixel(hex, view.size); view.x = p.x; view.y = p.y; }
function screenToHex(cx, cy) {
  const c = $("map"), r = c.getBoundingClientRect();
  return fromPixel((cx - r.left - r.width / 2) / view.zoom + view.x, (cy - r.top - r.height / 2) / view.zoom + view.y, view.size);
}
function bindMap() {
  const c = $("map"); let drag = null, moved = false, lastTap = 0, lastHex = null;
  c.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, button: e.button }; moved = false; c.setPointerCapture(e.pointerId); });
  c.addEventListener("pointermove", (e) => {
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) moved = true; if (moved) { view.x = drag.vx - dx / view.zoom; view.y = drag.vy - dy / view.zoom; draw(); } }
    const h = screenToHex(e.clientX, e.clientY); if (h !== hoverHex) { hoverHex = h; draw(); }
  });
  c.addEventListener("pointerup", (e) => {
    const d = drag; drag = null; if (!S || moved || !d) return;
    if (mapMode === "surface") { const r = c.getBoundingClientRect(); clickSurface(e.clientX - r.left, e.clientY - r.top); return; }
    const hex = screenToHex(e.clientX, e.clientY); if (!S.hexes[hex]) return;
    const now = Date.now(), dbl = hex === lastHex && now - lastTap < 400; lastTap = now; lastHex = hex;
    if (d.button === 2 || dbl) { goTo(hex); return; }
    selHex = hex; tab = "here"; lastResult = null; renderTabs(); renderPanel(); draw();
  });
  c.addEventListener("contextmenu", (e) => e.preventDefault());
  c.addEventListener("wheel", (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  new ResizeObserver(() => draw()).observe(c);
}
function zoomBy(f) { view.zoom = Math.max(0.4, Math.min(2.6, view.zoom * f)); draw(); }
/** Move the selected ship to a hex, or as far along the way as it can go this turn. */
function goTo(hex) {
  if (!S || S.over) return;
  const u = U();
  if (hex === u.at) { selHex = hex; renderPanel(); draw(); return; }
  const R = reachable(S, unit);
  let dest = R[hex] !== undefined ? hex : null;
  if (!dest) { const p = findPath(S, u.at, hex, unit === "pelion" ? "pelion" : "support"); if (p) for (const k of p.path) if (R[k] !== undefined) dest = k; }
  if (!dest || dest === u.at) { toast(u.mp ? "Can't get any closer this turn." : "No moves left this turn. End the turn to go on.", true); return; }
  const r = moveTo(S, unit, dest);
  if (r.error) { toast(r.error, true); return; }
  selHex = dest === hex ? hex : selHex; lastResult = null;
  if (dest !== hex) { selHex = hex; toast("Under way: you'll get there next turn or after."); }
  after();
}
function hexPath(ctx, cx, cy, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); i ? ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } ctx.closePath(); }
const SYS_COLOR = { starbase: "#9fd0ff", colony: "#6fb4ff", member: "#6fb4ff", independent: "#c9c3e8", klingon: "#e0564a", claimed: "#e0564a", prewarp: "#9ad48a", anomaly: "#c9a8ff", ruins: "#ffd36b", empty: "#8e9ab4", orionBase: "#8e9ab4", lost: "#555b6e" };
const shownKind = (s) => (S.seenSys[s.id] && (KINDS[s.kind]?.known || s.surveyed || ["member", "claimed", "lost"].includes(s.kind)) ? s.kind : null);
let stars = null;
function draw() {
  const c = $("map"); if (!c || !S) return;
  const dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#05060a"; ctx.fillRect(0, 0, W, H);
  syncSurface();
  if (mapMode === "surface") { drawSurface(ctx, W, H); return; }
  if (!stars) stars = Array.from({ length: 240 }, () => [Math.random(), Math.random(), Math.random()]);
  for (const [sx, sy, b] of stars) { ctx.fillStyle = `rgba(210,215,255,${0.15 + b * 0.5})`; ctx.fillRect(sx * W, sy * H, b > 0.85 ? 2 : 1, b > 0.85 ? 2 : 1); }
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(view.zoom, view.zoom); ctx.translate(-view.x, -view.y);
  const size = view.size, u = U(), R = S.over || S.battle ? {} : reachable(S, unit);
  for (const [k, h] of Object.entries(S.hexes)) {
    const { x, y } = toPixel(k, size); hexPath(ctx, x, y, size - 0.6);
    ctx.fillStyle = h.terrain === "zone" ? "rgba(120,30,45,.4)" : h.terrain === "nebula" ? "rgba(130,80,170,.34)" : "rgba(28,34,58,.38)"; ctx.fill();
    if (R[k] !== undefined && k !== u.at) { ctx.fillStyle = "rgba(242,193,78,.12)"; ctx.fill(); }
    if (!S.visible[k]) { ctx.fillStyle = "rgba(0,0,0,.32)"; ctx.fill(); }
    ctx.strokeStyle = h.terrain === "zone" ? "rgba(224,86,74,.35)" : "rgba(140,150,200,.14)"; ctx.lineWidth = 1; ctx.stroke();
  }
  // The Neutral Zone's label.
  if (view.zoom > 0.5) { const p = toPixel(key(4, -RADIUS), size); ctx.fillStyle = "rgba(255,150,140,.55)"; ctx.font = "600 12px Antonio, sans-serif"; ctx.textAlign = "center"; ctx.fillText("ROMULAN NEUTRAL ZONE", p.x, p.y + 4); ctx.textAlign = "left"; }
  // Orders.
  for (const o of S.orders) { const { x, y } = toPixel(o.at, size); ctx.strokeStyle = "#f2c14e"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); hexPath(ctx, x, y, size - 3); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#f2c14e"; ctx.font = "bold 13px system-ui, sans-serif"; ctx.fillText("!", x + size * 0.45, y - size * 0.35); }
  // Systems.
  for (const s of Object.values(S.systems)) {
    const { x, y } = toPixel(s.at, size), k = shownKind(s), col = k ? SYS_COLOR[k] : "#8e9ab4", r = k === "starbase" ? 7 : 6;
    ctx.fillStyle = col;
    if (k === "starbase") { ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.strokeRect(x - r, y - r, r * 2, r * 2); }
    else if (k === "klingon" || k === "claimed") { ctx.beginPath(); ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (k === "member" || k === "colony") { ctx.strokeStyle = "#6fb4ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke(); }
    if (k === "independent") { const a = s.accord; ctx.strokeStyle = a > 0 ? "#6fb4ff" : a < 0 ? "#e0564a" : "rgba(200,200,220,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.max(1, Math.abs(a))) / 5); ctx.stroke(); }
    if (s.harm > 0 && k && ["colony", "member", "independent"].includes(k)) { ctx.fillStyle = "#ff8a7a"; ctx.font = "bold 10px system-ui"; ctx.fillText("✕".repeat(s.harm), x + r + 3, y + r + 2); }
    if (!k) { ctx.fillStyle = "#05060a"; ctx.font = "bold 9px system-ui"; ctx.textAlign = "center"; ctx.fillText("?", x, y + 3); ctx.textAlign = "left"; }
    if (k === "lost") { ctx.strokeStyle = "#999"; ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke(); }
    if (view.zoom > 0.6) { ctx.font = `${selHex === s.at ? "bold " : ""}11px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = k ? "#e6e8f2" : "rgba(200,205,225,.6)"; ctx.fillText(s.name, x, y + r + 15); ctx.textAlign = "left"; }
  }
  // Course to the selected hex.
  if (selHex && selHex !== u.at && !S.battle) {
    const p = findPath(S, u.at, selHex, unit === "pelion" ? "pelion" : "support");
    if (p && p.path.length) {
      ctx.strokeStyle = "rgba(242,193,78,.8)"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
      let q = toPixel(u.at, size); ctx.moveTo(q.x, q.y); for (const k of p.path) { q = toPixel(k, size); ctx.lineTo(q.x, q.y); } ctx.stroke(); ctx.setLineDash([]);
      const sp = unit === "pelion" ? speedOf(S) : SUPPORT[u.type].speed, first = Math.min(u.mp, p.cost), turns = p.cost <= u.mp ? 0 : Math.ceil((p.cost - first) / sp);
      ctx.fillStyle = "#f2c14e"; ctx.font = "bold 11px system-ui"; ctx.fillText(turns ? `${turns + 1} turns` : "this turn", q.x + 9, q.y - 9);
    }
  }
  // Ships.
  const icon = (x, y, color, big, outline, dashed) => {
    const s = big ? 1.5 : 1; ctx.fillStyle = color; ctx.strokeStyle = outline || "rgba(0,0,0,.75)"; ctx.lineWidth = 1.5; if (dashed) ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(x + 9 * s, y); ctx.lineTo(x - 5 * s, y - 6 * s); ctx.lineTo(x - 2 * s, y); ctx.lineTo(x - 5 * s, y + 6 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  };
  const byHex = {};
  for (const e of visibleEnemies(S)) (byHex[e.at] = byHex[e.at] || []).push(e);
  for (const [hex, list] of Object.entries(byHex)) { const { x, y } = toPixel(hex, size); list.forEach((e, i) => {
    if (ENEMIES[e.type].base) { ctx.fillStyle = POWERS.orion.color; ctx.beginPath(); ctx.arc(x - 12, y - 12, 6, 0, Math.PI * 2); ctx.fill(); return; }
    icon(x - 12 + i * 10, y - 15, POWERS[e.power].color, false, e.hostile ? "#ff5040" : null, e.revealed); }); }
  for (const s of Object.values(S.support)) { const { x, y } = toPixel(s.at, size); icon(x - 2, y + 15, "#6fb4ff", false, unit === s.id ? "#fff" : null); }
  { const { x, y } = toPixel(S.pelion.at, size); icon(x + 4, y - 2, "#f2c14e", true, unit === "pelion" ? "#fff" : null); }
  // The away team on Corvan II: a small figure for each officer on the surface, in their division's color, under the world.
  const A = S.arc;
  if (A.team && ["pull", "orions", "caretaker"].includes(A.stage)) {
    const { x, y } = toPixel(S.systems[S.corvan].at, size), n = A.team.length, w = 13;
    const DIVCOL = { shvari: "#f2c14e", sevek: "#6fb4ff", vessik: "#6fb4ff", grath: "#e0564a", reyes: "#e0564a", rrinn: "#e0564a" };
    const x0 = x - ((n - 1) * w) / 2, y0 = y + 36;   // below the world's name
    ctx.fillStyle = "rgba(5,6,10,.8)"; ctx.strokeStyle = "rgba(242,193,78,.85)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 - 10, y0 - 10, (n - 1) * w + 20, 22, 6) : ctx.rect(x0 - 10, y0 - 10, (n - 1) * w + 20, 22); ctx.fill(); ctx.stroke();
    A.team.forEach((id, i) => {
      const px = x0 + i * w, hurt = !available(S, id);
      ctx.globalAlpha = hurt ? 0.35 : 1; ctx.fillStyle = DIVCOL[id] || "#ccc";
      ctx.beginPath(); ctx.arc(px, y0 - 4, 3.4, 0, Math.PI * 2); ctx.fill();             // head
      ctx.beginPath(); ctx.moveTo(px - 4.4, y0 + 8); ctx.lineTo(px, y0); ctx.lineTo(px + 4.4, y0 + 8); ctx.closePath(); ctx.fill();  // body
      ctx.globalAlpha = 1;
    });
    if (view.zoom > 0.75) { ctx.fillStyle = "#f2c14e"; ctx.font = "600 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Away team: " + A.team.map((id) => officer(id).short).join(", "), x, y0 + 25); ctx.textAlign = "left"; }
  }
  if (selHex) { const { x, y } = toPixel(selHex, size); hexPath(ctx, x, y, size - 1); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
  if (hoverHex && S.hexes[hoverHex] && hoverHex !== selHex) { const { x, y } = toPixel(hoverHex, size); hexPath(ctx, x, y, size - 1); ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore();
}

// ---------- the planetary map: Corvan II's surface, while an away team is down ----------
const surfaceUp = () => S && S.arc.team && ["pull", "orions", "caretaker"].includes(S.arc.stage) && S.pelion.at === S.systems[S.corvan].at;
/** Keep the map mode honest: no surface map without an away team on it; the button shows when there is one. */
function syncSurface() {
  const up = surfaceUp();
  if (!up && mapMode === "surface") mapMode = "sector";
  const b = $("surface"); if (b) { b.hidden = !up; b.textContent = mapMode === "surface" ? "Sector map" : "Corvan II surface"; }
  for (const id of ["zoom-in", "zoom-out", "find", "fit"]) { const x = $(id); if (x) x.hidden = mapMode === "surface"; }
  const hintEl = document.querySelector(".map-hint"); if (hintEl) hintEl.hidden = mapMode === "surface";
}
const DIVCOL = { shvari: "#f2c14e", sevek: "#6fb4ff", vessik: "#6fb4ff", grath: "#e0564a", reyes: "#e0564a", rrinn: "#e0564a" };
let surfaceBox = null;
function surfaceRect(W, H) { const m = 18, w = W - 2 * m, h = H - 2 * m; return { x: m, y: m, w, h }; }
function drawSurface(ctx, W, H) {
  const A = S.arc, R = surfaceRect(W, H); surfaceBox = R;
  const small = R.w < 560;   // a phone: smaller type, no subtitles, the status box in the bottom corner
  const P = (sx, sy) => ({ x: R.x + sx * R.w, y: R.y + sy * R.h });
  // The land: a dusk-lit valley. Grassland, hills, a river, a forest between the ruins and the village.
  const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, "#26331f"); g.addColorStop(1, "#1a2417");
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(R.x, R.y, R.w, R.h, 14) : ctx.rect(R.x, R.y, R.w, R.h); ctx.fill();
  ctx.save(); ctx.clip();
  const hill = (sx, sy, rx, ry, c) => { const p = P(sx, sy); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * R.w, ry * R.h, 0, 0, Math.PI * 2); ctx.fill(); };
  hill(0.12, 0.18, 0.16, 0.14, "#2f3d27"); hill(0.45, 0.12, 0.2, 0.12, "#31402a"); hill(0.9, 0.2, 0.14, 0.18, "#2c3a25"); hill(0.4, 0.9, 0.25, 0.12, "#22301d");
  // The river.
  ctx.strokeStyle = "#2f5f80"; ctx.lineWidth = Math.max(4, R.w * 0.012); ctx.lineCap = "round"; ctx.beginPath();
  let p = P(0.38, 0); ctx.moveTo(p.x, p.y); const q1 = P(0.30, 0.35), q2 = P(0.46, 0.62), e1 = P(0.42, 1); ctx.bezierCurveTo(q1.x, q1.y, q2.x, q2.y, e1.x, e1.y); ctx.stroke();
  // Forest.
  for (let i = 0; i < 70; i++) { const fx = 0.62 + ((i * 37) % 23) / 100, fy = 0.5 + ((i * 53) % 29) / 100; if (Math.hypot(fx - 0.7, fy - 0.66) < 0.05 || Math.hypot(fx - 0.86, fy - 0.78) < 0.06) continue; const t = P(fx, fy); ctx.fillStyle = i % 3 ? "#203a1f" : "#284526"; ctx.beginPath(); ctx.arc(t.x, t.y, 4 + (i % 4), 0, Math.PI * 2); ctx.fill(); }
  // The ruins: broken walls around a plaza.
  const ru = P(SITES.ruins.x, SITES.ruins.y), sw = R.w * 0.11, sh = R.h * 0.14;
  ctx.strokeStyle = "#8a8578"; ctx.lineWidth = 3;
  for (const [a, b, c2, d] of [[-1, -1, 0.2, -1], [0.5, -1, 1, -1], [1, -1, 1, 0.3], [1, 0.7, 1, 1], [-1, 1, 0.4, 1], [-1, -1, -1, 0.1], [-1, 0.5, -1, 1]]) { ctx.beginPath(); ctx.moveTo(ru.x + a * sw / 2, ru.y + b * sh / 2); ctx.lineTo(ru.x + c2 * sw / 2, ru.y + d * sh / 2); ctx.stroke(); }
  // The village: huts.
  const vi = P(SITES.village.x, SITES.village.y);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; ctx.fillStyle = "#8a6a44"; ctx.beginPath(); ctx.arc(vi.x + Math.cos(a) * 26, vi.y + Math.sin(a) * 16, 5, 0, Math.PI * 2); ctx.fill(); }
  // Paths between the places.
  ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(230,220,190,.35)"; ctx.lineWidth = 1.5;
  for (const [a, b] of [["outpost", "ruins"], ["ruins", "core"], ["ruins", "blind"], ["blind", "village"]]) { const u = P(SITES[a].x, SITES[a].y), v = P(SITES[b].x, SITES[b].y); ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(v.x, v.y); ctx.stroke(); }
  ctx.setLineDash([]);
  // What's known at each place.
  const notes = {
    outpost: [["Outpost logs", A.clues.logs], ["Empty bunks", A.clues.bunks]],
    ruins: [["The ruins' energy", A.clues.energy]].concat(A.stage === "orions" ? [["3 Orion pirates digging", "danger"]] : []),
    core: [].concat(A.theory ? [[A.stage === "caretaker" ? "The caretaker" : "The caretaker (Sevek's theory)", A.stage === "caretaker" ? "danger" : "info"]] : [["Unknown", null]], A.podsSeen ? [["8 scientists in stasis pods", "info"]] : A.theory && A.readings ? [["8 life signs below", "info"]] : []),
    blind: [["The village, observed", A.clues.village]],
    village: A.clues.village ? [["Armed with Orion phasers", "danger"]] : [],
  };
  for (const [k, site] of Object.entries(SITES)) {
    const s = P(site.x, site.y);
    ctx.fillStyle = k === "core" && !A.theory ? "rgba(120,120,130,.8)" : "#f2c14e"; ctx.strokeStyle = "#05060a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "#f3efe2"; ctx.font = `700 ${small ? 11 : 13}px Antonio, system-ui, sans-serif`; ctx.fillText((small ? site.name.replace(/^The /, "") : site.name).toUpperCase(), s.x, s.y - 12);
    ctx.fillStyle = "rgba(230,225,210,.7)"; ctx.font = `${small ? 10 : 11}px system-ui, sans-serif`;
    if (!small) ctx.fillText(site.sub, s.x, s.y + 22);
    (notes[k] || []).forEach(([t, st], i) => { const ny = s.y + (small ? 20 : 36) + i * (small ? 11 : 13);
      ctx.fillStyle = st === "danger" ? "#ff9a8f" : st === "info" ? "#a8d4ff" : st ? "#9fe0a2" : "rgba(230,225,210,.55)";
      ctx.fillText(`${st === true ? "✓ " : st === "danger" ? "! " : st === "info" ? "" : "· "}${t}`, s.x, ny);
    });
    ctx.textAlign = "left";
  }
  // The away team, where each last acted.
  const at = {}; for (const id of A.team) { const k = (A.pos && A.pos[id]) || "outpost"; (at[k] = at[k] || []).push(id); }
  for (const [k, ids] of Object.entries(at)) {
    const s = P(SITES[k].x, SITES[k].y), w = small ? 34 : 44, x0 = s.x - ((ids.length - 1) * w) / 2, y0 = s.y - (small ? 50 : 64);   // above the place's name
    ids.forEach((id, i) => {
      const px = x0 + i * w, hurt = !available(S, id);
      ctx.globalAlpha = hurt ? 0.4 : 1; ctx.fillStyle = DIVCOL[id] || "#ccc"; ctx.strokeStyle = "#05060a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, y0 - 6, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - 6, y0 + 9); ctx.lineTo(px, y0 - 1); ctx.lineTo(px + 6, y0 + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "600 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(officer(id).short + (hurt ? " (sickbay)" : ""), px, y0 + 21); ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    });
  }
  ctx.restore();
  // The ship overhead.
  ctx.fillStyle = "rgba(16,18,28,.92)"; ctx.strokeStyle = "rgba(242,193,78,.7)"; ctx.lineWidth = 1;
  if (small) {
    const bx = R.x + R.w - 158, by = R.y + R.h - 44;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, 150, 36, 8) : ctx.rect(bx, by, 150, 36); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f2c14e"; ctx.font = "700 11px Antonio, system-ui, sans-serif"; ctx.fillText("CORVAN II · SURFACE", bx + 10, by + 15);
    ctx.fillStyle = "#e6e8f2"; ctx.font = "10px system-ui, sans-serif"; ctx.fillText(`Countdown ${A.countdown}/${COUNTDOWN} · Clues ${cluesFound(A)}/${CLOCK}`, bx + 10, by + 29);
    return;
  }
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(R.x + 10, R.y + 10, 250, 64, 8) : ctx.rect(R.x + 10, R.y + 10, 250, 64); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f2c14e"; ctx.font = "700 14px Antonio, system-ui, sans-serif"; ctx.fillText("CORVAN II · SURFACE", R.x + 22, R.y + 30);
  ctx.fillStyle = "#e6e8f2"; ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`The Pelion in orbit · Countdown ${A.countdown}/${COUNTDOWN}`, R.x + 22, R.y + 48);
  ctx.fillText(`Clues ${cluesFound(A)}/${CLOCK}${A.theory ? " · Sevek's theory: a caretaker" : cluesFound(A) >= THEORY_AT ? " · Sevek can form a theory" : ""} · Click a place`, R.x + 22, R.y + 64);
}
function clickSurface(mx, my) {
  if (!surfaceBox) return;
  const R = surfaceBox;
  const hit = Object.entries(SITES).map(([k, s]) => ({ k, s, d: Math.hypot(R.x + s.x * R.w - mx, R.y + s.y * R.h - my) })).sort((a, b) => a.d - b.d)[0];
  if (!hit || hit.d > 60) return;
  selHex = S.systems[S.corvan].at; tab = "here"; lastResult = null; surfaceSite = hit.k; renderTabs(); renderPanel(); draw();
  toast(`${hit.s.name}: ${hit.s.sub}.`);
}
let surfaceSite = null;

// ---------- the bar and the tabs ----------
const boxes = (n, max, cls = "") => `<span class="boxes ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
function renderAll() { renderBar(); renderTabs(); renderPanel(); draw(); }
function renderBar() {
  $("bar-stats").innerHTML = `<span><b>Supplies</b>${S.supplies}</span><span><b>Science</b>${S.science}</span>`
    + `<span title="Starfleet Command: five boxes and you're relieved of command"><b>Starfleet Command</b>${boxes(S.command, 5)}</span>`
    + `<span title="Tension with the Klingon Empire"><b>Klingon tension</b>${boxes(S.tension, 10, "gold")}</span>`;
  const hr = hourly(S);
  $("bar-turn").textContent = `Stardate ${stardate(S)} · Turn ${Math.min(S.turn, TOUR)} of ${TOUR}${hr ? ` · Hour ${(S.hour || 0) + 1} on Corvan II` : ""}`;
  $("end-turn").disabled = !canEndTurn(S);
  $("end-turn").textContent = hr ? "End hour" : "End turn";
}
function renderTabs() {
  const aw = document.querySelector('[data-tab="away"]'); if (aw) aw.hidden = !awayActive();
  const due = S.orders.filter((o) => o.deadline - S.turn <= 2).length;
  document.querySelectorAll(".tabs button").forEach((b) => { b.setAttribute("aria-selected", String(b.dataset.tab === tab)); if (b.dataset.tab === "orders") b.innerHTML = `Orders${S.orders.length ? `<span class="badge" style="${due ? "" : "background:var(--blue)"}">${S.orders.length}</span>` : ""}`; });
}
function renderPanel() {
  if (tab === "away" && !awayActive()) tab = "orders";
  const html = { here: hereHTML, ship: shipHTML, crew: crewHTML, orders: ordersHTML, away: awayHTML, sector: sectorHTML, log: logHTML }[tab]();
  $("panel").innerHTML = html;
  if (tab === "log") $("panel").scrollTop = $("panel").scrollHeight;  // the latest entry
}

// ---------- Here: what's in the selected hex, and what the ship can do ----------
function units() {
  const list = [["pelion", "USS Pelion"], ...Object.values(S.support).map((u) => [u.id, u.name])];
  if (list.length < 2) return "";
  return `<div class="btn-row">${list.map(([id, n]) => `<button class="btn small ${unit === id ? "primary" : ""}" data-unit="${id}">${esc(n)}</button>`).join("")}</div>`;
}
function hint() {
  if (!S.tutorial.on || S.turn > 12) return "";
  const A = S.arc, cv = S.systems[S.corvan];
  let t = "";
  if (A.stage === "travel") t = S.pelion.at === cv.at ? "" : `<b>Next:</b> fly to Corvan II (the gold <b>!</b>). Double-click it on the map: the Pelion goes as far as it can this turn. Then <b>End turn</b>.`;
  else if (A.stage === "orbit") t = Object.values(S.enemies).some((e) => e.goal === "arc" && e.hidden) && !A.raiderMet
    ? "<b>Next:</b> passive sensors show nothing and the outpost is silent. A Sensor sweep checks the space around Corvan II (anything behind the moon?); sweeping the ruins finds out what happened below. Both are on the Here tab."
    : "<b>Next:</b> the outpost is silent. Sweep the ruins with the ship's sensors: the action on the Here tab.";
  else if (A.stage === "pull" && !A.team) t = "<b>Next:</b> choose an away team and beam them down to the outpost (the Here tab).";
  else if (A.stage === "pull" && cluesFound(A) >= THEORY_AT) t = "<b>Next:</b> there's enough evidence. Have Sevek form his theory of what's in the ruins (the Here tab), or find the last clue first for better odds.";
  else if (A.stage === "pull") t = `<b>Next:</b> the away team. Find clues on the Here tab (each officer can act once a turn): Sevek needs ${THEORY_AT} to form a theory of what's in the ruins, before the Countdown fills.`;
  else if (A.stage === "orions" || A.stage === "caretaker") t = "<b>Next:</b> finish it on Corvan II: the away team's actions on the Here tab.";
  else if (S.turn <= 12) t = "<b>Next:</b> Starfleet will send new orders (the Orders tab). Meanwhile: survey the unknown (?), court the independent worlds, and watch for raiders.";
  return t ? `<div class="card gold small">${t}</div>` : "";
}
function hereHTML() {
  const u = U(), hex = selHex || u.at, s = sysAt(S, hex), here = hex === u.at;
  let h = units() + hint();
  if (S.pending && S.pending.unit === unit) h += pendingHTML();
  else if (lastResult) h += resultHTML(lastResult);
  // The place.
  const k = s && shownKind(s);
  h += `<h2>${esc(s ? s.name : S.hexes[hex].terrain === "zone" ? "The Neutral Zone" : S.hexes[hex].terrain === "nebula" ? "Nebula" : "Open space")}</h2>`;
  h += `<p class="muted">${s ? esc(k ? kindName({ ...s, kind: k }) : "Uncharted system: survey it to find out") : ""}${S.hexes[hex].terrain === "nebula" ? " · Nebula: 2 moves to enter" : ""}${inZone(hex) ? " · Entering marks Starfleet Command, unless orders send you" : ""}</p>`;
  if (s && k === "independent") h += `<div class="kv"><span>Accord</span><span>${s.accord > 0 ? "+" : ""}${s.accord} (Federation at +5, Klingon Empire at −5)</span></div>`;
  if (s && s.harm) h += `<div class="kv"><span>Harm</span><span class="bad">${s.harm}/3</span></div>`;
  if (s && (k === "anomaly" || k === "ruins") && s.surveyed) h += `<div class="kv"><span>Discovery</span><span>${s.recorded ? "Recorded" : `${s.clock}/${s.need}`}</span></div>`;
  if (s && k === "prewarp") h += `<p class="small muted">The Prime Directive applies: observe them, don't be seen.${s.observed ? " Studied." : ""}</p>`;
  for (const e of visibleEnemies(S).filter((x) => x.at === hex)) { const E = ENEMIES[e.type]; h += `<div class="card red"><h4>${esc(E.base ? "Orion pirate base" : E.name)}</h4><div class="small">${E.base ? "Found." : e.hostile ? "Hostile." : "Not hostile: it hasn't fired on anyone."} Shields ${E.shields - e.shields}/${E.shields}, hull ${E.hull - e.hull}/${E.hull}.${e.goal === "influence" ? " Courting the world here." : ""}</div></div>`; }
  for (const o of S.orders.filter((x) => x.at === hex)) h += `<div class="card gold"><h4>Orders: ${esc(o.title)}</h4><div class="small">${o.arc ? "The first mission." : `${o.have}/${o.segs} done · due by turn ${o.deadline}`}</div></div>`;
  if (!here) {
    const p = findPath(S, u.at, hex, unit === "pelion" ? "pelion" : "support");
    if (p) { const R = reachable(S, unit); h += `<div class="btn-row"><button class="btn primary" data-go="${hex}">${R[hex] !== undefined ? `Move here (${R[hex]} of ${u.mp} moves)` : "Set course: as far as we can this turn"}</button></div>`; }
    return h;
  }
  // What the ship can do here.
  const acts = actionsFor(S, unit);
  if (unit === "pelion") { const freeNow = CREW.filter((c) => free(S, c.id)).map((c) => c.short); h += `<h3>Actions this turn</h3><p class="small muted">Every officer acts once a turn, here or with the away team; assisting uses a turn too. Free now: ${freeNow.length ? esc(freeNow.join(", ")) : "no one (end the turn)"}.</p>`; }
  else h += `<h3>The ${esc(u.name)}'s action</h3>`;
  if (!acts.length) h += `<p class="muted small">Nothing to do here. Fly somewhere: double-click a hex.</p>`;
  h += teamLine();
  // On the surface map, the place clicked comes first.
  const atSite = (a) => mapMode === "surface" && surfaceSite && SITE_OF[a.arc] === surfaceSite;
  if (acts.some(atSite)) h += `<p class="small gold">At ${esc(SITES[surfaceSite].name.toLowerCase())}:</p>`;
  for (const a of [...acts.filter((x) => x.id === "beam"), ...acts.filter(atSite), ...acts.filter((x) => x.id !== "beam" && !atSite(x))]) h += actionCard(a);
  return h;
}
function optionsFor(a) {
  if (unit !== "pelion") return [];
  const out = [];
  for (const c of CREW) { if (!free(S, c.id) || (a.who && !a.who.includes(c.id))) continue; for (const sk of a.skills) if (skillOf(S, c.id, sk)) { const t = rollTarget(S, a, c.id, sk), ta = rollTarget(S, a, c.id, sk, true), hp = helperFor(S, a, c.id, sk); out.push({ officer: c.id, skill: sk, total: t.total, parts: t.parts, helper: hp ? hp.id : null, assisted: { skill: sk, total: ta.total, parts: ta.parts } }); } }
  return out.sort((x, y) => y.total - x.total);
}
// Who's best on the surface: the clues' skills, the Orions' Phasers, the caretaker's Engineering and Psychology.
const AWAY_PICK = ["sevek", "vessik", "reyes", "rrinn"];
function beamCard(a) {
  const keys = { shvari: "Leadership, Diplomacy", sevek: "Physical Sciences, Sensors, Computers, Psychology", vessik: "Medicine, Sensors, Psychology", grath: "Engineering, Electronics", reyes: "Phasers, Unarmed Combat, Stealth", rrinn: "Computers, Psychology, Stealth" };
  return `<div class="card gold"><h4>${esc(a.name)}</h4><div class="small muted">${esc(a.blurb)}</div>
    <div style="display:grid;gap:4px;margin-top:8px">${CREW.map((c) => `<label class="chip ${available(S, c.id) ? "" : "off"}" style="border-radius:8px"><input type="checkbox" data-away="${c.id}" ${AWAY_PICK.includes(c.id) && available(S, c.id) ? "checked" : ""} ${available(S, c.id) ? "" : "disabled"}><span><b>${esc(c.short)}</b> <span class="small">${esc(c.role)}</span> <span class="muted small">· ${esc(keys[c.id])}</span></span></label>`).join("")}</div>
    <div class="roll-row"><button class="btn primary small" data-beam="1">Energize</button></div></div>`;
}
function teamLine() {
  const A = S.arc;
  if (!A.team || !["pull", "orions", "caretaker"].includes(A.stage) || S.pelion.at !== S.systems[S.corvan].at || unit !== "pelion") return "";
  return `<div class="card small"><b>Away team on Corvan II:</b> ${A.team.map((id) => esc(officer(id).short) + (available(S, id) ? "" : " (in sickbay)")).join(", ")}. Only they can act on the surface. The ship's other duties (sweeps, observation, repairs) wait until they beam back up.
    <div class="roll-row"><button class="btn small" data-beamup="1">Beam them up (choose again)</button></div></div>`;
}
/** "Computers 18 · Something here is wrong −2 · Sevek assists +1 = 17 (98%)": how a target is made. */
function breakdown(o) {
  const [first, ...rest] = o.parts;
  const sign = (v) => (v >= 0 ? "+" : "−") + Math.abs(v);
  return `${o.skill} ${first[1]}${rest.map(([n, v]) => ` · ${n} ${sign(v)}`).join("")} = ${o.total}, ${pct(o.total)} to succeed`;
}
/** The card's lines for the officer picked: how the skill is used, who could assist, and the target with or without them. */
function refreshCard(card) {
  const sel = card.querySelector("[data-who]"); if (!sel) return;
  const o = sel.selectedOptions[0].dataset, box = card.querySelector("[data-assist]"), wrap = card.querySelector("[data-assist-wrap]");
  if (wrap) { wrap.hidden = !o.helper; card.querySelector("[data-helper-name]").textContent = o.helper; if (!o.helper) box.checked = false; }
  const how = card.querySelector("[data-how-for]"); if (how) how.textContent = o.how;
  const out = card.querySelector("[data-breakdown-for]"); if (out) out.textContent = box && box.checked ? o.breakdownAssist : o.breakdown;
}
/** "Psychology: read their customs and who answers to whom, from the blind: no contact." */
const howLine = (a, skill) => (a.how && a.how[skill] ? `${skill}: ${a.how[skill]}` : "");
function actionCard(a) {
  if (a.id === "beam") return beamCard(a);
  const tone = a.id === "engage" ? "red" : a.id === "mission" || a.id === "arc" ? "gold" : a.id === "envoy" ? "green" : "";
  const enc = esc(JSON.stringify({ id: a.id, order: a.order, enemy: a.enemy, arc: a.arc }));
  let h = `<div class="card ${tone}"><h4>${a.bridge ? "Bridge: " : a.who && a.id === "arc" && a.arc !== "time" && a.arc !== "theory" && a.arc !== "scan" ? "" : ""}${esc(a.name)}</h4><div class="small muted">${esc(a.blurb || "")}</div>`;
  if (a.why) return h + `<div class="why">${esc(a.why)}</div></div>`;
  if (a.id === "engage") return h + `<div class="roll-row"><button class="btn red small" data-act="${enc}">Engage</button></div></div>`;
  const opts = optionsFor(a);
  if (unit === "pelion" && !opts.length) return h + `<div class="why">No one free has the training.</div></div>`;
  h += `<div class="roll-row">`;
  if (opts.length) h += `<select data-who aria-label="Who does it">${opts.map((o, i) => `<option value="${o.officer}|${o.skill}" data-breakdown="${esc(breakdown(o))}" data-breakdown-assist="${esc(breakdown(o.assisted))}" data-helper="${o.helper ? esc(officer(o.helper).short) : ""}" data-how="${esc(howLine(a, o.skill))}" ${i === 0 ? "selected" : ""}>${esc(officer(o.officer).short)} · ${esc(o.skill)} ${o.total} (${pct(o.total)})</option>`).join("")}</select>`;
  else h += `<span class="small muted">Its crew: 14 (${pct(14)})</span>`;
  const hp0 = opts.length && opts[0].helper ? officer(opts[0].helper).short : "";
  h += `<button class="btn primary small" data-act="${enc}">Roll</button></div>`;
  if (opts.length) h += `<label class="chip small" data-assist-wrap style="margin-top:6px;border-radius:8px" ${hp0 ? "" : "hidden"}><input type="checkbox" data-assist><span><b data-helper-name>${esc(hp0)}</b> assists: +1, and it uses their turn</span></label>`;
  return h + `${opts.length ? `${a.how ? `<div class="small" data-how-for style="margin-top:6px">${esc(howLine(a, opts[0].skill))}</div>` : ""}<div class="parts" data-breakdown-for>${esc(breakdown(opts[0]))}</div>` : ""}</div>`;
}
const diceHTML = (r) => `<span class="dice">${r.dice.map((d) => `<span class="die">${d}</span>`).join("")}</span>`;
function pendingHTML() {
  const p = S.pending, r = p.roll;
  return `<div class="result no"><b>${esc(p.name)}</b>: ${diceHTML(r)} ${r.total} against ${r.target}: <b class="bad">fails by ${-r.margin}</b>
    <div class="parts">${p.target.parts.map(([n, v]) => `${esc(n)} ${v >= 0 && n !== p.target.parts[0][0] ? "+" : ""}${v}`).join(" · ")}</div>
    <div class="btn-row">${canReroll(S) ? `<button class="btn primary small" data-resolve="reroll">Spend a Duty point: reroll (${esc(officer(p.officer).short)} has ${S.crew[p.officer].duty})</button>` : ""}<button class="btn small" data-resolve="accept">Accept it</button></div></div>`;
}
function resultHTML(res) {
  const r = res.roll;
  return `<div class="result ${r.success ? "ok" : "no"}"><b>${esc(res.name)}</b>: ${diceHTML(r)} ${r.total} against ${r.target}: <b class="${r.success ? "good" : "bad"}">${r.success ? `success by ${r.margin}` : `fails by ${-r.margin}`}</b>${res.rerolled ? " (rerolled)" : ""}
    <div class="parts">${res.target.parts.map(([n, v], i) => `${esc(n)} ${i && v >= 0 ? "+" : ""}${v}`).join(" · ")}</div><div>${esc(res.text || "")}</div></div>`;
}

// ---------- Ship ----------
function shipHTML() {
  const P = S.pelion, sm = shieldsMax(S);
  let h = `<h2>USS Pelion · ${PELION.reg}</h2><p class="muted">${PELION.cls}. ${P.docked ? "Docked at Starbase 23." : `At ${esc(sysAt(S, P.at)?.name || "sector " + P.at)}.`}</p>`;
  h += `<div class="kv"><span>Shields</span><span>${boxes(sm - P.shields, sm, "blue")}</span><span>Hull</span><span>${boxes(PELION.hull - P.hull, PELION.hull, "gold")}</span>`
    + ["weapons", "engines", "sensors"].map((k) => `<span>${k[0].toUpperCase() + k.slice(1)}</span><span>${boxes(P.sys[k], 3)} ${["", "Damaged", "Crippled", "Offline"][P.sys[k]]}</span>`).join("")
    + `<span>Power</span><span>${powerOf(S)}${P.powerLoss ? ` (−${P.powerLoss})` : ""}</span><span>Torpedoes</span><span>${P.torps}/${PELION.torps}</span><span>Speed</span><span>${speedOf(S)} hexes a turn</span><span>Sensors</span><span>rating ${sensorsRating(S)}; sees ${2 + (P.refits.sensors ? 1 : 0)} hexes</span></div>`;
  h += `<p class="small muted">Hull and systems are repaired at Starbase 23 (or by Engineering, a box at a time). Shields come back after each battle.</p>`;
  h += `<h3>Refits ${P.docked ? "" : "(at Starbase 23)"}</h3>`;
  for (const [id, R] of Object.entries(REFITS)) h += `<div class="card ${P.refits[id] ? "green" : "violet"}"><h4>${esc(R.name)}</h4><div class="small muted">${esc(R.blurb)}</div><div class="roll-row">${P.refits[id] ? `<span class="good small">Fitted</span>` : `<button class="btn small" data-refit="${id}" ${!P.docked || S.science < R.cost ? "disabled" : ""}>Fit it: ${R.cost} science</button>`}</div></div>`;
  h += `<h3>Your ships</h3>`;
  for (const u of Object.values(S.support)) { const T = SUPPORT[u.type]; h += `<div class="card"><h4>${esc(u.name)}</h4><div class="small muted">${T.name}: ${T.blurb} Hull ${T.hull - u.hull}/${T.hull}.</div><div class="roll-row"><button class="btn small" data-unit="${u.id}">Command it</button><button class="btn small" data-center="${u.at}">Find it</button></div></div>`; }
  if (!Object.keys(S.support).length) h += `<p class="small muted">Only the Pelion, for now.</p>`;
  for (const [id, T] of Object.entries(SUPPORT)) h += `<div class="card violet"><h4>Requisition: ${esc(T.name)}</h4><div class="small muted">${esc(T.blurb)}</div><div class="roll-row"><button class="btn small" data-req="${id}" ${!P.docked || S.supplies < T.cost || Object.keys(S.support).length >= 3 ? "disabled" : ""}>${T.cost} supplies</button>${P.docked ? "" : `<span class="small muted">At Starbase 23</span>`}</div></div>`;
  h += `<h3>Library records</h3>` + (S.records.length ? S.records.map((id) => { const r = RECORDS.find((x) => x.id === id); return `<div class="card green"><h4>${esc(r.name)}</h4><div class="small muted">${esc(r.text)}</div></div>`; }).join("") : `<p class="small muted">None yet. Investigate anomalies and ruins.</p>`);
  return h;
}

// ---------- Crew ----------
const DIV = { shvari: "", sevek: "sci", vessik: "sci", grath: "ops", reyes: "ops", rrinn: "ops" };
function crewHTML() {
  let h = `<h2>The crew</h2><p class="small muted">Each action is a roll: 3d6 at or under the officer's skill. A success earns experience; every five, +1 to the skill used. Duty points (2 each) reroll a failure, and come back every 8 turns or at Starbase 23. Hurt crew take −2 at 2 boxes and go to sickbay at 3.</p>`;
  h += `<h3>Bridge stations (for battle)</h3><div class="kv">`;
  const SK = { helm: "Helm", tactical: "Phasers", science: "Sensors", engineering: "Engineering", comms: "Communications" };
  for (const [st, sk] of Object.entries(SK)) {
    const cur = stationOfficer(S, st);
    h += `<span>${st[0].toUpperCase() + st.slice(1)}</span><span><select data-station="${st}">${CREW.filter((c) => skillOf(S, c.id, sk)).map((c) => `<option value="${c.id}" ${cur === c.id ? "selected" : ""} ${available(S, c.id) ? "" : "disabled"}>${esc(c.short)} · ${sk} ${target(S, c.id, sk, { combat: true }).total}</option>`).join("")}</select></span>`;
  }
  h += `<span>Captain</span><span>${esc(S.captain)}: Leadership ${CAPTAIN.skills.Leadership}, Psychology ${CAPTAIN.skills.Psychology}, Diplomacy ${CAPTAIN.skills.Diplomacy}</span></div><div class="crew" style="margin-top:12px">`;
  for (const c of CREW) {
    const st = S.crew[c.id];
    const stations = Object.keys(S.stations).filter((st) => stationOfficer(S, st) === c.id).map((st) => st[0].toUpperCase() + st.slice(1));
    h += `<div class="officer ${DIV[c.id]}"><h4>${esc(c.name)}</h4><div class="small muted" style="margin-bottom:8px">${esc(c.rank)} · ${esc(c.species)}</div>
      <div class="kv small" style="margin-bottom:8px"><span>Role</span><b>${esc(c.role)}</b><span>Position</span><b>${esc(c.post)}</b><span>Battle station</span><b class="gold">${stations.length ? esc(stations.join(", ")) : "None (on call)"}</b></div>
      <div class="small">${st.acted ? `<span class="muted">Acted this turn</span> · ` : available(S, c.id) ? `<span class="good">Free this turn</span> · ` : ""}${st.inj ? `<span class="bad">Hurt ${st.inj}/3${st.inj >= 3 ? ": in sickbay" : st.inj === 2 ? ": −2" : ""}</span> · ` : ""}Duty ${boxes(st.duty, 2, "gold")} · Experience ${st.xp}/5</div>
      <div class="skills">${Object.keys(c.skills).map((sk) => `<span>${esc(sk)} <b>${skillOf(S, c.id, sk)}</b></span>`).join("")}</div>
      <div class="small" style="margin-top:4px"><b>${esc(c.adv)}:</b> <span class="muted">${esc(c.advText)}</span></div></div>`;
  }
  return h + `</div>`;
}

// ---------- Orders ----------
// ---------- Away team: the Corvan II mission on the surface, apart from the orders ----------
const awayActive = () => S && ["orbit", "pull", "orions", "caretaker"].includes(S.arc.stage);
function awayHTML() {
  const A = S.arc;
  let h = `<h2>Away team: Corvan II</h2>`;
  if (A.stage === "orbit") h += `<p class="small muted">In orbit. Nobody has gone down yet: sweep the ruins with the ship's sensors first (the Here tab).</p>`;
  else h += `<div class="kv small"><span>Countdown</span><span>${boxes(A.countdown, COUNTDOWN)} the Pelion breaks orbit when it fills</span><span>Clues</span><span>${boxes(cluesFound(A), CLOCK, "blue")} ${A.theory ? "Sevek's theory: a caretaker" : cluesFound(A) >= THEORY_AT ? "enough for Sevek's theory" : `Sevek needs ${THEORY_AT} for a theory`}</span><span>Stage</span><span>${{ pull: "Investigating", orions: "The Orion diggers", caretaker: "The caretaker" }[A.stage]}</span></div>`;
  h += `<h3>Who's down there</h3>`;
  if (!A.team) h += `<p class="small muted">${A.stage === "orbit" ? "No one yet." : "No one: choose an away team on the Here tab."}</p>`;
  else {
    h += `<div class="crew">` + A.team.map((id) => { const c = officer(id), st = S.crew[id], where = SITES[(A.pos && A.pos[id]) || "outpost"];
      return `<div class="officer ${DIV[id]}" style="padding:8px 10px"><h4 style="font-size:15px;margin-bottom:4px">${esc(c.name)}</h4><div class="small muted" style="margin-bottom:4px">${esc(c.post)} · ${esc(c.role)}</div><div class="small">${st.acted ? "Acted this turn · " : available(S, id) ? `<span class="good">Free</span> · ` : ""}At ${esc(where.name.toLowerCase())}${st.inj ? ` · <span class="bad">hurt ${st.inj}/3${st.inj >= 3 ? ", beamed to sickbay" : ""}</span>` : ""} · Duty ${st.duty}</div></div>`; }).join("") + `</div>`;
    h += `<div class="btn-row"><button class="btn small" data-tab-go="here">Their actions (Here tab)</button>${mapMode === "surface" ? "" : `<button class="btn small" data-surface="1">Show the surface map</button>`}</div>`;
  }
  const found = Object.entries(CLUES).filter(([k]) => A.clues[k]);
  h += `<h3>What they've found</h3>` + (found.length ? found.map(([, c]) => `<details class="card green small"><summary><b>${esc(c.name)}:</b> ${esc(c.found)}</summary><p style="margin:8px 0 0;white-space:pre-line">${esc(c.detail)}</p></details>`).join("") : `<p class="small muted">Nothing yet.</p>`);
  const L = S.log.filter((l) => l.away);
  h += `<h3>Away team log</h3>` + (L.length ? `<ul class="log">${L.map((l) => `<li class="${l.kind}"><span class="t">${l.t}</span>${esc(l.text)}</li>`).join("")}</ul>` : `<p class="small muted">Nothing logged yet.</p>`);
  return h;
}
function ordersHTML() {
  let h = hint() + `<h2>Orders</h2>`;
  const A = S.arc;
  if (awayActive()) h += `<div class="card small">The away team's work on Corvan II (who's down, the Countdown, the clues, its log) is on the <button class="btn small" data-tab-go="away">Away team</button> tab.</div>`;
  if (!S.orders.length && (A.stage === "done" || A.stage === "travel")) h += `<p class="muted">No orders. Starfleet will send more; meanwhile, the sector is yours to patrol.</p>`;
  for (const o of S.orders) {
    const left = o.deadline - S.turn;
    h += `<div class="card ${left <= 2 && !o.arc ? "red" : "gold"}"><h4>${esc(o.title)}</h4>`;
    if (o.text) h += `<p class="small">${esc(o.text)}</p>`;
    if (!o.arc || A.stage === "travel" || A.stage === "orbit") h += `<div class="small">${o.arc ? "" : `${o.have}/${o.segs} done with ${esc(o.skills.join(", "))}. `}Due by turn ${o.deadline} (${left} turn${left === 1 ? "" : "s"} left).</div>`;
    h += o.personal ? `<div class="small"><b>A personal connection:</b> ${esc(o.personal)}</div>`
      : `<div class="small muted">${o.twist ? `Twist: ${esc(o.twist.text)}. ` : ""}Something strange: ${esc(o.strange)}. Key character: ${esc(o.key)}.</div>`;
    h += `<div class="roll-row"><button class="btn small" data-center="${o.at}">Find it</button><button class="btn small primary" data-go="${o.at}">Set course</button></div></div>`;
  }
  h += `<p class="small muted">Carried out: ${S.done}. Failed: ${S.failed}. Each success clears a Starfleet Command box; each failure marks one.</p>`;
  return h;
}

// ---------- Sector ----------
function sectorHTML() {
  const sc = score(S);
  let h = `<h2>The Corvan Sector</h2><p class="small muted">Turn ${Math.min(S.turn, TOUR)} of ${TOUR}. Score so far: <b class="gold">${sc.total}</b>.</p>`;
  h += `<table class="tbl"><tr><th>World</th><th>What</th><th>Status</th></tr>`;
  const order = { member: 0, colony: 1, starbase: 2, independent: 3, claimed: 4, klingon: 5, lost: 6 };
  for (const s of Object.values(S.systems).filter((x) => shownKind(x) && order[shownKind(x)] !== undefined).sort((a, b) => order[a.kind] - order[b.kind])) {
    const st = s.kind === "independent" ? `accord ${s.accord > 0 ? "+" : ""}${s.accord}` : s.harm ? `<span class="bad">harm ${s.harm}/3</span>` : "";
    h += `<tr data-hex="${s.at}"><td>${esc(s.name)}</td><td>${esc(kindName(s))}</td><td>${st}${s.harm && s.kind === "independent" ? `, <span class="bad">harm ${s.harm}</span>` : ""}</td></tr>`;
  }
  h += `</table><h3>Score</h3><table class="tbl">${sc.parts.filter((p) => p[1]).map(([n, v]) => `<tr><td>${esc(n)}</td><td style="text-align:right">${v}</td></tr>`).join("")}</table>`;
  h += `<h3>The powers</h3><p class="small muted"><b style="color:${POWERS.klingon.color}">Klingon Empire:</b> a cold war. Its ships court independent worlds; raiders strike when tension runs high. Firing first on a Klingon ship that hasn't fired is an incident. <b style="color:${POWERS.orion.color}">Orion Syndicate:</b> raiders from a hidden base; a sensor sweep near it hears where. <b style="color:${POWERS.romulan.color}">Romulans:</b> cloaked ships cross the Neutral Zone to strike; sweeps reveal them.</p>`;
  return h;
}
let logFilter = "all";
function logHTML() {
  const rows = logFilter === "discovery" ? S.log.filter((l) => l.kind === "discovery") : S.log;
  const n = S.log.filter((l) => l.kind === "discovery").length;
  // In order: oldest first, under a heading for each turn.
  let body = "", turn = null;
  for (const l of rows) {
    if (l.t !== turn) { if (turn !== null) body += "</ul>"; turn = l.t; body += `<h3 class="log-turn">Turn ${l.t} · Stardate ${(STARDATE0 + (l.t - 1) * 7.3).toFixed(1)}</h3><ul class="log">`; }
    body += `<li class="${l.kind}">${esc(l.text)}</li>`;
  }
  if (turn !== null) body += "</ul>";
  return `<h2>Captain's log</h2><div class="btn-row"><button class="btn small ${logFilter === "all" ? "primary" : ""}" data-logf="all">Everything</button><button class="btn small ${logFilter === "discovery" ? "primary" : ""}" data-logf="discovery">Discoveries (${n})</button></div>`
    + (rows.length ? body : `<p class="muted small">Nothing discovered yet: survey, investigate, observe and sweep.</p>`);
}

// ---------- the side panel's buttons ----------
function bindChrome() {
  document.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; tab = b.dataset.tab; renderTabs(); renderPanel(); });
  $("panel").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !S) return;
    if (b.dataset.logf) { logFilter = b.dataset.logf; renderPanel(); return; }
    if (b.dataset.tabGo) { tab = b.dataset.tabGo; renderTabs(); renderPanel(); return; }
    if (b.dataset.surface) { mapMode = "surface"; draw(); renderPanel(); return; }
    if (b.dataset.beam) { const since = mark(); const ids = [...b.closest(".card").querySelectorAll("[data-away]:checked")].map((x) => x.dataset.away); const r = beamDown(S, ids); if (r.error) toast(r.error, true); else { mapMode = "surface"; reportSince("Energize", since); } after(); return; }
    if (b.dataset.beamup) { const since = mark(); beamDown(S, []); reportSince("Beam them up", since); after(); return; }
    if (b.dataset.unit) { unit = b.dataset.unit; selHex = U().at; tab = "here"; lastResult = null; centerOn(U().at); renderAll(); return; }
    if (b.dataset.go) { selHex = b.dataset.go; goTo(b.dataset.go); return; }
    if (b.dataset.center) { centerOn(b.dataset.center); selHex = b.dataset.center; tab = "here"; renderAll(); return; }
    if (b.dataset.act) {
      const a = JSON.parse(b.dataset.act), sel = b.parentElement.querySelector("[data-who]");
      const [who, skill] = sel ? sel.value.split("|") : [];
      const since = mark();
      const assist = !!b.closest(".card").querySelector("[data-assist]:checked");
      const r = attempt(S, unit, a.id, { order: a.order, enemy: a.enemy, arc: a.arc, officer: who, skill, assist });
      if (r.error) { toast(r.error, true); return; }
      lastResult = r.done ? r.result : null;
      if (r.done) reportSince(r.result.name, since, { ...r.result.roll, officer: r.result.officer, skill: r.result.skill });
      else if (r.battle) reportSince(b.closest(".card")?.querySelector("h4")?.textContent || "Engage", since);
      after(); return;
    }
    if (b.dataset.resolve) { const since = mark(); const r = resolve(S, b.dataset.resolve === "reroll"); lastResult = r.done ? r.result : null; if (r.done) reportSince(r.result.name, since, { ...r.result.roll, officer: r.result.officer, skill: r.result.skill }); after(); return; }
    if (b.dataset.refit) { const since = mark(); const r = fitRefit(S, b.dataset.refit); if (r.error) toast(r.error, true); else reportSince(REFITS[b.dataset.refit].name, since); after(); return; }
    if (b.dataset.req) { const since = mark(); const r = requisition(S, b.dataset.req); if (r.error) toast(r.error, true); else reportSince("Requisition: " + SUPPORT[b.dataset.req].name, since); after(); return; }
  });
  // Picking someone else for an action shows how their target is made.
  $("panel").addEventListener("change", (e) => { const sel = e.target.closest("[data-who]"); if (!sel) return; refreshCard(sel.closest(".card")); });
  $("panel").addEventListener("change", (e) => { if (e.target.closest("[data-assist]")) refreshCard(e.target.closest(".card")); });
  $("panel").addEventListener("change", (e) => { const s = e.target.closest("[data-station]"); if (s) { setStation(S, s.dataset.station, s.value); after(); } });
  $("panel").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-hex]"); if (tr) { selHex = tr.dataset.hex; centerOn(selHex); tab = "here"; renderAll(); } });
  $("end-turn").onclick = doEndTurn;
  $("menu").onclick = showMenu;
  $("zoom-in").onclick = () => zoomBy(1.25); $("zoom-out").onclick = () => zoomBy(0.8);
  $("fit").onclick = () => { mapMode = "sector"; fitView(); draw(); };
  $("surface").onclick = () => { mapMode = mapMode === "surface" ? "sector" : "surface"; draw(); };
  $("find").onclick = () => { unit = "pelion"; centerOn(S.pelion.at); selHex = S.pelion.at; tab = "here"; renderAll(); };
  document.addEventListener("keydown", (e) => {
    if (!S || !$("modal").hidden || /input|select|textarea/i.test(e.target.tagName)) return;
    if (e.key === "Enter" && !e.repeat) { e.preventDefault(); doEndTurn(); }
  });
  $("modal").addEventListener("click", modalClick);
}
function doEndTurn() {
  if (!S || S.over) return;
  if (!canEndTurn(S)) { toast(S.pending ? "Accept the roll, or reroll it, first." : "Finish what's in front of you first.", true); return; }
  const before = S.log.length;
  const r = endTurn(S); if (r.error) { toast(r.error, true); return; }
  lastResult = null; unit = S.support[unit] ? unit : "pelion"; selHex = U().at;
  const news = S.log.slice(before).filter((l) => l.kind === "order" || l.kind === "war" || l.kind === "bad");
  if (news.length) toast(news[0].text, news[0].kind !== "order");
  after();
}

// ---------- dialogs ----------
function modal(html) { $("modal-body").innerHTML = html; $("modal").hidden = false; }
function closeModal() { $("modal").hidden = true; }
function showStarter(canContinue) {
  modal(`<h1>USS Pelion: Frontier</h1>
  <p class="lede">Stardate 5212.4. The Pelion, a Heavy Cruiser under your command, is assigned to the Corvan Sector for fifty weeks: a frontier between the Federation, the Klingon Empire and the Romulan Neutral Zone, full of worlds that haven't chosen a side and things no one has explained.</p>
  <div class="grid2">
    <div class="brief"><h3>The ship</h3><p>Double-click a hex to fly there (3 hexes a turn; nebulae cost 2). Then the crew goes to work where you are: every officer acts once a turn (survey, investigate, negotiate, sweep, repair), each job once. Starbase 23 repairs, rearms and refits you.</p></div>
    <div class="brief"><h3>The crew</h3><p>The six officers from the Players' Guide do the work. Every action is the tabletop roll: 3d6 at or under their skill. Pick who does it, and whether a second officer assists (+1, using their turn); a Duty point rerolls a failure.</p></div>
    <div class="brief"><h3>Orders</h3><p>Starfleet sends missions from the GM's Guide's tables, each with a deadline and a twist. The first is The Silence at Corvan II.</p></div>
    <div class="brief"><h3>The worlds</h3><p>Diplomatic missions bring independent worlds toward the Federation: at accord +5 they join. The Klingons court them too, and at −5 they're lost.</p></div>
    <div class="brief"><h3>Battles</h3><p>Ship combat from the Players' Guide: spend Power on shields, phasers and torpedoes, give the captain's order, and break away if it goes wrong.</p></div>
    <div class="brief"><h3>Starfleet Command</h3><p>Five boxes and you're relieved: incidents, the Prime Directive, lost colonies and failed orders mark it; success clears it. Survive the tour and earn your rating.</p></div>
  </div>
  <div class="ng-row"><label>Captain's name<input type="text" id="ng-name" placeholder="Captain" maxlength="30"></label>
  <label>Difficulty<select id="ng-diff"><option value="easy">Easy</option><option value="normal" selected>Normal</option><option value="hard">Hard</option></select></label>
  <label>Sector seed (optional)<input type="text" id="ng-seed" placeholder="random" maxlength="30"></label></div>
  <div class="btn-row" style="margin-top:16px"><button class="btn primary" data-m="new">Take command</button>${canContinue ? `<button class="btn" data-m="continue">Continue your tour</button>` : ""}</div>
  <p class="small muted">An unofficial fan game for the USS Pelion campaign, inspired by Star Trek. Not affiliated with or endorsed by Paramount or CBS Studios, who own Star Trek.</p>`);
}
function showMenu() {
  modal(`<h2>Menu</h2><p class="muted">${esc(S.captain)}, turn ${S.turn} of ${TOUR}. This sector's seed: <span class="seed">${esc(S.seed)}</span></p>
    <div class="btn-row"><button class="btn primary" data-m="close">Back to the bridge</button><button class="btn" data-m="help">How to play</button><button class="btn" data-m="restart">New tour</button><button class="btn" data-m="replay">Replay this sector</button></div>
    <h3>Save code</h3><p class="small muted">The game saves in this browser after every move. To move it to another browser, copy this code, then paste it there under Load.</p>
    <textarea id="code" rows="3" readonly>${esc(btoa(unescape(encodeURIComponent(JSON.stringify(S)))))}</textarea>
    <div class="btn-row"><button class="btn small" data-m="copy">Copy</button></div>
    <h3>Load</h3><textarea id="load" rows="2" placeholder="Paste a save code"></textarea><div class="btn-row"><button class="btn small" data-m="load">Load it</button></div>`);
}
function showHelp() { showStarter(true); $("modal-body").querySelector("[data-m=new]").textContent = "Start a new tour"; }
function showReport() {
  const r = report, roll = r.roll;
  modal(`<h2>${esc(r.title)}</h2>
    ${roll ? `<div class="result ${roll.success ? "ok" : "no"}">${roll.officer ? `<span class="small muted">${esc(officer(roll.officer)?.short || "The captain")}, ${esc(roll.skill)}:</span> ` : ""}${diceHTML(roll)} ${roll.total} against ${roll.target}: <b class="${roll.success ? "good" : "bad"}">${roll.success ? `success by ${roll.margin}` : `fails by ${-roll.margin}`}</b></div>` : ""}
    ${r.lines.map((t) => `<p style="white-space:pre-line">${esc(t)}</p>`).join("")}
    <div class="btn-row"><button class="btn primary" data-m="report-ok">Continue</button></div>`);
}
function showEvent() {
  const ev = S.event;
  if (ev.kind === "arc-arrive") {
    const ch = arcEventChoices(S);
    modal(`<h2>Corvan II</h2><p>The active sweep finds what passive sensors couldn't: an Orion raider holding station on the far side of the moon. Caught, it hails: they're "legitimate salvagers", and this is unclaimed space.</p>
      ${eventResult ? `<div class="result ${eventResult.roll ? (eventResult.roll.success ? "ok" : "no") : ""}">${eventResult.roll ? `${diceHTML(eventResult.roll)} ${eventResult.roll.total} against ${eventResult.roll.target} (${esc(officer(eventResult.roll.officer)?.short || "Captain")}, ${esc(eventResult.roll.skill)}). ` : ""}${esc(eventResult.text)}</div>` : ""}
      <div class="grid2">${ch.map((c) => `<div class="brief"><h3>${esc(c.name)}</h3><p>${esc(c.blurb)}</p><div class="btn-row"><button class="btn ${c.id === "engage" ? "red" : "primary"} small" data-ev="${c.id}" ${c.disabled ? "disabled" : ""}>${esc(c.name)}</button></div></div>`).join("")}</div>`);
    return;
  }
  modal(`<h2>${esc(ev.title || "")}</h2><p style="white-space:pre-line">${esc(ev.text || "")}</p><div class="btn-row"><button class="btn primary" data-m="event-ok">Continue</button></div>`);
}
function showBattle() {
  const B = S.battle, e = S.enemies[B.enemy], E = e ? ENEMIES[e.type] : null, P = S.pelion, st = battleStats(S), sm = shieldsMax(S);
  if (!bchoice) bchoice = { order: "command", shields: true, phasers: true, torps: P.torps > 0, repair: false, breakOff: false };
  const used = (bchoice.shields ? 1 : 0) + (bchoice.phasers && !bchoice.breakOff ? 1 : 0) + (bchoice.torps && !bchoice.breakOff ? 1 : 0), spare = Math.max(0, st.power - used);
  const chip = (k, label, dis) => `<label class="chip ${dis ? "off" : ""}"><input type="checkbox" data-b="${k}" ${bchoice[k] ? "checked" : ""} ${dis ? "disabled" : ""}>${label}</label>`;
  const ord = (k, label) => `<label class="chip"><input type="radio" name="ord" data-o="${k}" ${bchoice.order === k ? "checked" : ""}>${label}</label>`;
  const who = (id) => (id ? esc(officer(id).short) : "nobody");
  const over = B.over;
  modal(`<h2>Battle${E ? `: ${esc(E.base ? "the Orion base" : E.name)}` : ""}</h2>
  <div class="battle">
    <div class="ship-card"><h4 class="gold">USS Pelion</h4>
      <div class="track"><span>Shields</span>${boxes(sm - P.shields, sm, "blue")}</div><div class="track"><span>Hull</span>${boxes(PELION.hull - P.hull, PELION.hull, "gold")}</div>
      <div class="track"><span>Systems</span>Weapons ${P.sys.weapons} · Engines ${P.sys.engines} · Sensors ${P.sys.sensors}</div>
      <div class="small muted">Helm ${who(st.helmId)} ${st.helm} · Tactical ${who(st.gunId)} ${st.gun} · Engineering ${who(st.engId)} ${st.eng} · Power ${st.power} · Torpedoes ${P.torps}</div></div>
    ${E ? `<div class="ship-card"><h4 style="color:${POWERS[e.power].color}">${esc(E.base ? "Orion pirate base" : E.name)}</h4>
      <div class="track"><span>Shields</span>${boxes(E.shields - e.shields, E.shields, "blue")}</div><div class="track"><span>Hull</span>${boxes(Math.max(0, E.hull - e.hull), E.hull, "gold")}</div>
      <div class="small muted">Helm ${E.helm} · Gunner ${E.gunner} · Maneuver ${E.maneuver} vs your ${st.maneuver}${E.plasma ? " · Plasma torpedo: +2 to evade it" : ""}${E.relentless ? " · Relentless" : ""}${E.fast ? " · Fast: runs when its shields fall" : ""}</div></div>` : `<div class="ship-card"><h4>Gone</h4></div>`}
  </div>
  ${over ? `<div class="result ${over === "destroyed" || over === "hailed" || over === "escaped" || over === "fled" ? "ok" : "no"}"><b>${{ destroyed: "Destroyed.", fled: "They broke off.", hailed: "They stood down.", escaped: "The Pelion broke away.", lost: "The Pelion is lost." }[over]}</b></div><div class="btn-row"><button class="btn primary" data-m="battle-done">Continue</button></div>`
  : `<h3>The captain's order</h3><div class="orders-choice">${ord("command", `Command (Leadership ${CAPTAIN.skills.Leadership}, ${pct(CAPTAIN.skills.Leadership)}): +2 to Tactical`)}${ord("read", `Read the enemy (Psychology ${CAPTAIN.skills.Psychology}): +2 evade, +1 to hit`)}${E && !E.base && e.power !== "romulan" ? ord("hail", `Hail (Diplomacy ${CAPTAIN.skills.Diplomacy} vs Will ${E.will}): they may stand down`) : ""}${ord("none", "No order")}</div>
  <h3>Power: ${st.power} · ${used} spent · ${spare ? `+${Math.min(2, spare)} to ${bchoice.phasers && !bchoice.breakOff ? "phasers" : "evade"}` : "nothing spare"}</h3>
  <div class="orders-choice">${chip("shields", "Shields up")}${chip("phasers", `Phasers (${st.gun}, ${pct(st.gun)})`, st.weaponsOut || bchoice.breakOff)}${chip("torps", `Torpedoes (${st.gun + 1}; can't be evaded)`, !P.torps || st.weaponsOut || bchoice.breakOff)}${chip("repair", `Damage control (${st.eng})`)}${chip("breakOff", `Break away (Helm ${st.helm}): instead of firing`)}</div>
  <div class="btn-row"><button class="btn primary" data-m="exchange">Next exchange</button></div>`}
  <div class="blog">${B.log.slice().reverse().map((l) => `<div>${esc(l)}</div>`).join("") || `<span class="muted">${B.ambush ? "They decloak, firing." : "Both ships close. Your orders, Captain?"}</span>`}</div>`);
}
function showEnd() {
  const sc = score(S);
  modal(`<h1>${S.over.win ? "The tour is over" : "Relieved"}</h1><p class="lede">${esc(S.over.why)}</p>
  <h3>${esc(rating(sc.total))}</h3><table class="tbl">${sc.parts.map(([n, v]) => `<tr><td>${esc(n)}</td><td style="text-align:right">${v}</td></tr>`).join("")}<tr><td><b>Total</b></td><td style="text-align:right"><b>${sc.total}</b></td></tr></table>
  <p class="small muted" style="margin-top:10px">This sector's seed: <span class="seed">${esc(S.seed)}</span></p>
  <div class="btn-row"><button class="btn primary" data-m="restart">New tour</button><button class="btn" data-m="replay">Replay this sector</button><button class="btn" data-m="close">Look at the map</button></div>`);
}
function modalClick(e) {
  const b = e.target.closest("button"); if (!b) return;
  const m = b.dataset.m;
  if (b.dataset.ev) {
    const since = mark(), title = b.textContent.trim();
    eventResult = chooseEvent(S, b.dataset.ev);
    // While the arrival is still open (a scan), its own dialog shows the result; once it ends, a pop-up says what happened.
    if (!S.event || S.event.kind !== "arc-arrive") {
      const out = eventResult || {}; eventResult = null; report = null;
      reportSince(title, since, out.roll);
      if (out.text) { report = report || { title, roll: out.roll, lines: [] }; report.lines.unshift(out.text); }
    }
    after(); if (!report && !S.event && !S.battle && !S.over) closeModal(); return;
  }
  if (m === "report-ok") { report = null; closeModal(); after(); return; }
  if (m === "new") { const s = newGame({ seed: $("ng-seed").value.trim() || undefined, difficulty: $("ng-diff").value, captain: $("ng-name").value }); startGame(s); return; }
  if (m === "continue") { try { startGame(JSON.parse(store.get())); } catch { toast("That save couldn't be read.", true); } return; }
  if (m === "close") { closeModal(); return; }
  if (m === "help") { showHelp(); return; }
  if (m === "restart") { showStarter(false); return; }
  if (m === "replay") { startGame(newGame({ seed: S.seed, difficulty: S.difficulty, captain: S.captain })); return; }
  if (m === "copy") { const t = $("code"); t.select(); try { navigator.clipboard.writeText(t.value); toast("Copied."); } catch { document.execCommand("copy"); } return; }
  if (m === "load") { try { startGame(JSON.parse(decodeURIComponent(escape(atob($("load").value.trim()))))); } catch { toast("That code didn't load.", true); } return; }
  if (m === "event-ok") { dismissEvent(S); closeModal(); after(); return; }
  if (m === "exchange") { exchange(S, { ...bchoice, order: bchoice.order === "none" ? null : bchoice.order }); save(); renderAll(); showBattle(); return; }
  if (m === "battle-done") { closeBattle(S); bchoice = null; closeModal(); after(); return; }
}
document.addEventListener("change", (e) => {
  if (!S || !S.battle || !bchoice) return;
  const t = e.target;
  if (t.dataset.b) { bchoice[t.dataset.b] = t.checked; showBattle(); }
  if (t.dataset.o) { bchoice.order = t.dataset.o; showBattle(); }
});
let toastTimer = null;
function toast(msg, bad) { const t = $("toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : ""); clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = "toast"), 4200); }

boot();
