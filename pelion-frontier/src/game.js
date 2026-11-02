// The rules: one JSON state, changed only by these functions. Every roll is the tabletop game's: 3d6 at or under a
// skill target, 3 or 4 always succeeds, 17 or 18 always fails; the margin is how far under.
import { makeRng, neighbors, distance, within, hashString } from "./hex.js";
import { TOUR, STARDATE0, CREW, CAPTAIN, PELION, SUPPORT, SUPPORT_NAMES, ENEMIES, KINDS, ACTIONS, MISSIONS, STRANGE, KEYS, TWISTS, REFITS, RECORDS } from "./data.js";
import { makeSector, inZone, nearZone } from "./sector.js";
import { STORIES, CAMPAIGN, COMPLICATIONS, KORVATH_SITES, storyText, storyOf } from "./stories.js";
import { SERIES, SERIES_MISSIONS } from "./campaigns.js";

// ---------- dice ----------
export function rand(S) { const r = makeRng(0); r.setState(S.rng); const v = r.next(); S.rng = r.state(); return v; }
export const d6 = (S) => 1 + Math.floor(rand(S) * 6);
export const pick = (S, list) => list[Math.floor(rand(S) * list.length)];
/** A 3d6 check against a target. */
export function check(S, target) {
  const dice = [d6(S), d6(S), d6(S)], total = dice[0] + dice[1] + dice[2];
  const success = total <= 4 || (total <= target && total < 17);
  return { dice, total, target, success, margin: target - total };
}

// ---------- a new game ----------
export function newGame({ seed, difficulty = "normal", captain = "", mode = "tour" } = {}) {
  seed = seed || String(Math.floor(Math.random() * 1e9));
  const sec = makeSector(seed);
  const sb = sec.systems[sec.starbase];
  const S = {
    v: 1, seed: String(seed), difficulty, mode: mode === "open" ? "open" : "tour", captain: captain.trim() || "Captain", turn: 1, rng: hashString("dice:" + seed),
    hexes: sec.hexes, systems: sec.systems, sysAt: sec.sysAt, starbase: sec.starbase, corvan: sec.corvan,
    pelion: { at: sb.at, warp: CRUISE_WARP, days: 7, mp: lyPerWeek(CRUISE_WARP), acted: false, shields: 0, hull: 0, sys: { weapons: 0, engines: 0, sensors: 0 }, torps: PELION.torps, refits: {}, zoneMarked: false, docked: true,
      alloc: { shields: 1, sensors: 1, labs: 0, ops: 0 }, stores: { dilithium: 10, antimatter: STORES.antimatter.max, spares: 6 }, wear: 0, lyWeek: 0 },
    stations: { helm: "shvari", tactical: "reyes", science: "sevek", engineering: "grath", comms: "rrinn" },
    crew: Object.fromEntries(CREW.map((c) => [c.id, { inj: 0, duty: 2, xp: 0, plus: {}, acted: false }])),
    backlog: [],   // orders waiting their turn
    campaign: { threads: [], beats: [], finale: false, over: null },   // Watchers of the Void
    tried: {},   // actions tried this turn: each can be attempted once a turn
    support: {}, enemies: {}, nextId: 1,
    supplies: 20, science: 0, command: 0, tension: 2, commendations: 0,
    records: [], orders: [], done: 0, failed: 0, lostColonies: 0, lostWorlds: 0, joined: 0, arc: { stage: "travel", countdown: 0, clock: 0, clues: {}, seen: false },
    visible: {}, seenSys: {}, log: [], over: null, pending: null, battle: null, event: null, tutorial: { on: true },
  };
  for (const s of Object.values(S.systems)) if (KINDS[s.kind].known) S.seenSys[s.id] = true;
  // Dilithium deposits: about a third of the uncharted and anomalous systems have crystal seams, found by a survey.
  for (const s of Object.values(S.systems)) if (["empty", "anomaly", "orionBase"].includes(s.kind) && hashString(S.seed + ":dil:" + s.id) % 3 === 0) s.dilithium = 3 + (hashString(S.seed + ":dn:" + s.id) % 4);
  S.seenSys[S.corvan] = true; S.systems[S.corvan].surveyed = true;
  // The first orders: The Silence at Corvan II. An Orion raider is already in orbit there.
  const cv = S.systems[S.corvan];
  S.orders.push({ id: "o1", arc: true, title: "The Silence at Corvan II", at: cv.at, sys: cv.id, skills: [], segs: 0, have: 0, urgent: true,
    deadline: 1 + Math.ceil(distance(sb.at, cv.at) / lyPerWeek(8)) + 2,   // urgent: Starfleet expects maximum warp
    text: "The Federation research outpost on Corvan II, eight archaeologists studying the ruins of an extinct civilization, has missed three check-ins. Corvan II has a native people, the Ketari, at a bronze-age level: the outpost works under the Prime Directive. An Orion raider was reported in the sector last week.",
    twist: null, personal: "Rrinn's sister serves on the outpost's supply run.", issued: 1 });
  // The raider holds station on the far side of Corvan II's moon: passive sensors won't see it; an active sweep will.
  spawnEnemy(S, "orion", cv.at, { goal: "arc", hostile: true, home: cv.at, hidden: true, arcRaider: true });
  const ob = Object.values(S.systems).find((s) => s.kind === "orionBase");
  spawnEnemy(S, "orionBase", ob.at, { goal: "base", hostile: true, found: false });
  log(S, "Orders from Starfleet Command, urgent: the research outpost on Corvan II has gone silent. Proceed at maximum emergency warp and investigate.", "order");
  postsOf(S);   // the listening posts on the Neutral Zone
  // Starfleet's other orders for the Pelion are already waiting: in the backlog until Corvan II is done.
  for (let i = 0; i < 3; i++) newOrder(S);
  updateVisibility(S);
  return S;
}

// ---------- small helpers ----------
export const stardate = (S) => (STARDATE0 + (S.turn - 1) * 7.3).toFixed(1);
export const sysAt = (S, hex) => S.sysAt[hex] && S.systems[S.sysAt[hex]];
export const officer = (id) => CREW.find((c) => c.id === id);
export const hasRecord = (S, perk) => S.records.some((id) => RECORDS.find((r) => r.id === id)?.perk === perk);
/** The captain's log, oldest first. Discoveries are never trimmed: the log keeps the newest 300 other entries. */
export function log(S, text, kind = "", extra = null) {
  S.logSeq = (S.logSeq || 0) + 1;   // each entry is numbered, so the page can show what one choice led to
  S.log.push({ id: S.logSeq, t: S.turn, text, kind, ...(extra || {}) });
  let n = S.log.length - 300;
  for (let i = 0; i < S.log.length && n > 0; ) { if (S.log[i].kind !== "discovery") { S.log.splice(i, 1); n--; } else i++; }
}
/** A story scene: shown as a dialog, and written in full into the log. */
export function storyEvent(S, title, text, extra = null) {
  const ev = { kind: "story", title, text };
  if (S.event) (S.eventQueue = S.eventQueue || []).push(ev); else S.event = ev;   // a second scene waits for the first
  log(S, `${title}: ${text}`, "discovery", { ...(extra || {}), story: true });
}
export const available = (S, id) => S.crew[id].inj < 3;
/** Fit for duty and hasn't acted this turn: every officer acts once a turn, on the bridge or with the away team. */
export const free = (S, id) => available(S, id) && !S.crew[id].acted;
export function skillOf(S, id, skill) {
  if (id === "captain") return CAPTAIN.skills[skill] || 10;
  const base = officer(id).skills[skill];
  return base ? base + (S.crew[id].plus[skill] || 0) : 0;
}
/** The best available officer for one of these skills (highest target), and the skill. */
export function bestOfficer(S, skills, ctx = {}, ids = null, freeOnly = false) {
  let best = null;
  for (const c of CREW) {
    if (!(freeOnly ? free(S, c.id) : available(S, c.id)) || (ids && !ids.includes(c.id))) continue;
    for (const sk of skills) {
      const t = target(S, c.id, sk, ctx).total;
      if (skillOf(S, c.id, sk) && (!best || t > best.total)) best = { officer: c.id, skill: sk, total: t };
    }
  }
  return best;
}
/** Who stands a station in battle: the assigned officer, or the best available if they're in sickbay. */
export function stationOfficer(S, station) {
  const SK = { helm: "Helm", tactical: "Phasers", science: "Sensors", engineering: "Engineering", comms: "Communications" }[station];
  const id = S.stations[station];
  if (id && available(S, id)) return id;
  const b = bestOfficer(S, [SK]); return b ? b.officer : null;
}
export const sensorsRating = (S) => PELION.sensors + (S.pelion.refits.sensors ? 1 : 0);
export const sysPenalty = (boxes) => boxes >= 3 ? -99 : -2 * boxes;
/** A roll's target, with each modifier named. ctx: { action, combat, listen, unit } */
export function target(S, id, skill, ctx = {}) {
  const parts = [];
  const base = skillOf(S, id, skill); parts.push([id === "captain" ? "Captain" : officer(id).short + " · " + skill, base]);
  if (id !== "captain") {
    const o = officer(id);
    if (o.advWhen({ ...ctx, skill })) parts.push([o.adv, 2]);
    if (S.crew[id].inj === 2) parts.push(["Wounded", -2]);
  }
  const P = S.pelion;
  if (skill === "Sensors" && !ctx.unit) {
    const r = sensorsRating(S); if (r !== 2) parts.push(["Ship's sensors", r - 2]);
    if (P.sys.sensors) parts.push(["Sensors damaged", Math.max(-6, sysPenalty(P.sys.sensors))]);
  }
  if (!ctx.combat && !ctx.unit && id !== "captain") {   // the week's power
    const A = S.pelion.alloc || {};
    if (skill === "Sensors" && A.sensors) parts.push(["Power to sensors", A.sensors]);
    if (["Physical Sciences", "Life Sciences", "Computers"].includes(skill) && A.labs) parts.push(["Power to the labs", A.labs]);
    if (["Engineering", "Medicine"].includes(skill) && A.ops) parts.push(["Power to operations", A.ops]);
  }
  if (ctx.action === "repair" && !ctx.combat && storesOf(S).spares <= 0) parts.push(["No spare parts", -3]);
  if ((ctx.action === "survey" || ctx.action === "investigate") && hasRecord(S, "science1")) parts.push(["Graviton lensing", 1]);
  if (ctx.action === "envoy" && hasRecord(S, "envoy1")) parts.push(["A dead language", 1]);
  if (ctx.action === "sweep" && hasRecord(S, "sweep2")) parts.push(["Cloaked wake", 2]);
  if (ctx.action === "sweep" && S.pelion.refits.inverter) parts.push(["Cloak inverter", 2]);
  if (ctx.action === "sweep") parts.push(["Hunting the hidden", -2]);
  if (ctx.order && ctx.order.twist && ctx.order.twist.fx === "hard" && !ctx.order.oppose) parts.push([ctx.order.twist.text, -2]);
  if (ctx.order && enemiesAt(S, ctx.order.at).some((e) => e.power === "klingon" && !e.hostile)) parts.push(["Klingons in the way", -2]);
  if (ctx.extra) parts.push(...ctx.extra);
  return { parts, total: parts.reduce((t, p) => t + p[1], 0) };
}

// ---------- the map: movement and sight ----------
export function moveCost(S, hex, who = "pelion") {
  const h = S.hexes[hex]; if (!h) return Infinity;
  if (h.terrain === "nebula") return who === "pelion" && hasRecord(S, "eddies") ? 1 : 2;
  return 1;
}
// ---------- warp ----------
// Speed the original-series way: v = W³ × c, W the warp factor. A hex is a light-year and a turn is a week, so a week at
// warp W covers 7·W³/365.25 light-years: warp 6 (the Pelion's maximum stable speed, 216c) about 4.1, warp 8 (its maximum
// emergency speed, 512c) about 9.8. Impulse is sublight: for moving within a system, not between them.
export const CRUISE_WARP = 6;
export const lightSpeeds = (w) => (w > 0 ? w ** 3 : 0);                          // v = W³ × c
export const lyPerWeek = (w) => (7 * lightSpeeds(w)) / 365.25;
export const daysPerLy = (w) => (w > 0 ? 365.25 / lightSpeeds(w) : Infinity);
/** The highest warp the engines allow: warp 8, the emergency maximum, less 2 for each box of engine damage. */
export const EMERGENCY_WARP = 8;
export function maxWarp(S) {
  const P = S.pelion, e = P.sys.engines, st = storesOf(S), pw = reactorPower(S);
  let m = e >= 3 ? 1 : EMERGENCY_WARP - 2 * e;
  if (st.antimatter <= 0) m = Math.min(m, 2);          // running on the reserve
  if (st.dilithium <= 0) m = Math.min(m, 4); else if (st.dilithium <= 2) m = Math.min(m, 6);   // a failing matrix won't hold high warp
  if (pw < 3) m = Math.min(m, pw >= 2 ? 6 : 4);        // the engines need the power: warp 7 and 8 take 3
  return m;
}
/** Light-years the Pelion has left this turn: the days left in the week at its warp factor. */
export function syncMp(S) { const P = S.pelion; P.mp = P.days * lightSpeeds(P.warp) / 365.25; }
/** Change the warp factor: 0 is impulse. The days left in the week stay the same; the distance they cover changes. */
export function setWarp(S, w) {
  const P = S.pelion, m = maxWarp(S);
  w = Math.max(0, Math.min(m, Math.round(w)));
  P.warp = w;
  const took = balancePower(S, "warp");   // the engines take what they need from the other systems
  syncMp(S);
  return { ok: true, warp: P.warp, took };
}
/** How a warp factor reads: "Warp 6: 216 × the speed of light, 4.1 ly a week, 1.7 days a light-year". */
export function warpText(w) {
  if (!w) return "Impulse: sublight, for moving within a system. A light-year would take years.";
  const d = daysPerLy(w);
  return `Warp ${w}: ${lightSpeeds(w)} × the speed of light · ${lyPerWeek(w).toFixed(1)} ly a week · ${d >= 2 ? Math.round(d) + " days" : (d * 24).toFixed(0) + " hours"} a light-year`;
}
/** Orders that call for maximum warp. */
export const isUrgent = (o) => !!(o && (o.urgent || (o.twist && o.twist.fx === "urgent")));
/** Ly a week the Pelion makes at its current warp (what "speed" means now). */
// ---------- the ship's power ----------
// The warp core makes Power (5, more with refits and records, less with damage or failing dilithium), and every week it is
// shared out, as in battle: the engines take what the warp factor needs (1 up to warp 4, 2 up to warp 6, 3 for warp 7 and
// 8), and the rest goes to the shields on standby, the sensors, the science labs and operations, up to 2 each.
export const POWER_SYSTEMS = {
  shields: { name: "Shields on standby", blurb: ["Down: an ambush catches the Pelion cold.", "On standby: an ambush's first volley loses its edge (no +2).", "Raised: as standby, and +1 Shields box in any battle this week."] },
  sensors: { name: "Sensors", blurb: ["Passive only.", "+1 to Sensors rolls.", "+2 to Sensors rolls, sweeps reach a light-year further, and the Pelion sees a hex further."] },
  labs: { name: "Science labs", blurb: ["Dark.", "+1 to Physical Sciences, Life Sciences and Computers rolls.", "+2 to those rolls, and +2 science a week from the labs' own work."] },
  ops: { name: "Operations", blurb: ["Minimum: life support and the transporters.", "+1 to Engineering and Medicine rolls: repairs, relief, sickbay.", "+2 to Engineering and Medicine rolls."] },
};
export const warpPower = (w) => (w <= 0 ? 0 : w <= 4 ? 1 : w <= 6 ? 2 : 3);
/** What failing dilithium costs the reactor: −1 at 4 crystals or fewer, −2 at 2 or fewer, −3 with none. */
export const dilithiumPenalty = (S) => { const d = storesOf(S).dilithium; return d <= 0 ? 3 : d <= 2 ? 2 : d <= 4 ? 1 : 0; };
export const reactorPower = (S) => Math.max(1, PELION.power + (S.pelion.refits.power ? 1 : 0) + (hasRecord(S, "power1") ? 1 : 0) - (S.pelion.powerLoss || 0) - dilithiumPenalty(S));
export const allocOf = (S) => (S.pelion.alloc = S.pelion.alloc || { shields: 1, sensors: 1, labs: 0, ops: 0 });
export const powerUsed = (S) => warpPower(S.pelion.warp ?? CRUISE_WARP) + Object.values(allocOf(S)).reduce((t, n) => t + n, 0);
export const powerFree = (S) => reactorPower(S) - powerUsed(S);
/** Set the power to one system (0–2). */
export function setAlloc(S, sys, n) {
  const A = allocOf(S); if (!(sys in POWER_SYSTEMS)) return { error: "No such system." };
  n = Math.max(0, Math.min(2, Math.round(n)));
  if (n > A[sys] && powerFree(S) < n - A[sys]) return { error: `Not enough power: ${reactorPower(S)} in all, and the engines need ${warpPower(S.pelion.warp)} at warp ${S.pelion.warp}. Lower the warp or take power from another system.` };
  A[sys] = n;
  return { ok: true };
}
/**
 * Make the power add up: when the warp needs more, or the reactor makes less, the labs give it up first, then
 * operations, then the sensors, then the shields; if that isn't enough, the warp drops. Returns what was taken.
 */
export function balancePower(S, why = "") {
  const A = allocOf(S), P = S.pelion, took = [];
  for (const k of ["labs", "ops", "sensors", "shields"]) while (powerFree(S) < 0 && A[k] > 0) { A[k]--; took.push(POWER_SYSTEMS[k].name); }
  while (powerFree(S) < 0 && P.warp > 0) { P.warp--; took.push("warp"); }
  if (took.length && why !== "warp") log(S, `Power: the reactor makes ${reactorPower(S)}; ${[...new Set(took)].join(", ").toLowerCase()} lose power to make it add up.`, "bad");
  return [...new Set(took)];
}

// ---------- the ship's stores ----------
// What the warp drive eats. Antimatter is fuel: burned by the light-year, faster above warp 6. Dilithium regulates the
// reaction and wears with use (a crystal every four weeks at warp, sooner at emergency speed or in battle); with too few
// crystals the reactor makes less Power and won't hold high warp. Spare parts (plasma injectors, warp coils, coolant) go
// into every repair and every week at emergency warp. Starbase 23 refuels the antimatter; the rest is bought, traded,
// mined, salvaged or recrystallized.
export const STORES = {
  dilithium: { name: "Dilithium", max: 10, unit: "crystal", blurb: "Regulates the warp reaction. Wears: a crystal every four weeks at warp, every two at emergency warp, and a quarter of one each battle. At 4 or fewer the reactor makes 1 less Power; at 2 or fewer, 2 less and no more than warp 6; with none, 3 less and no more than warp 4." },
  antimatter: { name: "Antimatter", max: 20, unit: "unit", blurb: "The fuel: about 1 a week at warp 6, 4 a week at warp 8, and 1 a battle. With none, the Pelion limps on its reserve at warp 2 until it reaches fuel, or a tender reaches it." },
  spares: { name: "Spare parts", max: 10, unit: "crate", blurb: "Plasma injectors, warp coils, coolant. Every repair uses one (−3 to repair without), and so does every week at emergency warp." },
};
export const storesOf = (S) => (S.pelion.stores = S.pelion.stores || { dilithium: 10, antimatter: STORES.antimatter.max, spares: 6 });
/** Add (or take) stores, within their limits. Returns what actually changed. */
export function addStore(S, k, n) {
  const st = storesOf(S), was = st[k];
  st[k] = Math.max(0, Math.min(STORES[k].max, st[k] + n));
  if (k === "dilithium" && st[k] !== was) balancePower(S);
  return st[k] - was;
}
/** Where stores can be had, and at what price in supplies. */
export function marketAt(S) {
  const s = sysAt(S, S.pelion.at); if (!s) return null;
  const C = campaignOf(S), cold = (C.id === "coldfire" && !C.over) ? 2 : 1;   // while the cold spreads, dilithium is dear
  if (s.id === S.starbase) return { name: "Starbase 23", items: { dilithium: 4 * cold, spares: 3 } };
  if (s.kind === "colony" || s.kind === "member") return { name: s.name, items: { antimatter: 1, spares: 4 } };
  if (s.kind === "independent" && s.accord >= 1) return { name: s.name, items: { dilithium: 5 * cold, antimatter: 2 } };
  return null;
}
export function buyStore(S, k, n = 1) {
  const m = marketAt(S); if (!m || !m.items[k]) return { error: "Nobody here sells that." };
  if (S.battle || S.over) return { error: "Not now." };
  const st = storesOf(S), room = STORES[k].max - st[k], price = m.items[k];
  n = Math.min(n, room, Math.floor(S.supplies / price));
  if (room <= 0) return { error: "The holds are full." };
  if (n <= 0) return { error: `Needs ${price} supplies.` };
  S.supplies -= n * price; addStore(S, k, n);
  log(S, `Stores: ${n} ${STORES[k].unit}${n === 1 ? "" : "s"} of ${STORES[k].name.toLowerCase()} from ${m.name}, ${n * price} supplies. Now ${st[k]}/${STORES[k].max}.`, "good");
  return { ok: true, n };
}
/** A fuel tender from Starbase 23, when the antimatter runs low far from home: 10 supplies, here in two weeks. */
export function requestTender(S) {
  const st = storesOf(S);
  if (S.tender) return { error: "A tender is already on its way." };
  if (S.pelion.docked) return { error: "Docked: the starbase refuels the Pelion." };
  if (st.antimatter > 3) return { error: "The antimatter isn't low enough to call a tender." };
  if (S.supplies < 10) return { error: "Needs 10 supplies." };
  S.supplies -= 10; S.tender = { due: S.turn + 2 };
  log(S, "A fuel tender leaves Starbase 23 for the Pelion: 10 supplies, due in two weeks, wherever the Pelion is by then.", "order");
  return { ok: true };
}
/** The week's wear: antimatter by the light-year, dilithium by the week at warp and the battle, spares at emergency warp. */
export function consumeStores(S) {
  const P = S.pelion, st = storesOf(S), ly = P.lyWeek || 0, emerg = (P.strain || 0) > CRUISE_WARP, lines = [];
  if (ly > 0) {
    const am = Math.max(1, Math.round(ly * (emerg ? 0.4 : 0.25)));
    const used = -addStore(S, "antimatter", -am); lines.push(`${used} antimatter for ${ly.toFixed(1)} light-years`);
    P.wear = (P.wear || 0) + (emerg ? 2 : 1);
    if (emerg) { if (st.spares > 0) { addStore(S, "spares", -1); lines.push("a crate of spares burned out at emergency warp"); } else lines.push("no spares left to burn at emergency warp: the engines run hot"); }
  }
  while ((P.wear || 0) >= 4) { P.wear -= 4; if (addStore(S, "dilithium", -1)) lines.push("a dilithium crystal worn out"); }
  if ((S.pelion.alloc || {}).labs >= 2) { S.science += 2; lines.push("+2 science from the labs"); }
  P.lyWeek = 0;
  if (lines.length) log(S, `Stores this week: ${lines.join("; ")}. Dilithium ${st.dilithium}/10, antimatter ${st.antimatter}/${STORES.antimatter.max}, spares ${st.spares}/${STORES.spares.max}.`, "turn");
  if (st.antimatter <= 3 && st.antimatter > 0) log(S, `Antimatter low: ${st.antimatter} left. Refuel at Starbase 23 or a colony, or call a tender (the Ship tab).`, "bad");
  if (st.antimatter <= 0 && !P.docked) log(S, "Antimatter gone: the Pelion is running on its reserve, at warp 2 at most.", "bad");
  if (S.tender && S.turn + 1 >= S.tender.due) { S.tender = null; addStore(S, "antimatter", 12); addStore(S, "spares", 2); log(S, "The fuel tender reaches the Pelion: +12 antimatter, +2 spares.", "good"); }
  balancePower(S);
}

// ---------- the listening posts on the Neutral Zone ----------
// Three Federation listening posts watch the Romulan Neutral Zone from the row of hexes just outside it. When the Romulans
// strike, it's at them: a bird-of-prey crosses, decloaks, fires and goes home. Three hits and a post is lost.
const POST_NAMES = ["Listening Post Kappa", "Listening Post Sigma", "Listening Post Tau"];
export function postsOf(S) {
  if (S.posts) return S.posts;
  const row = Object.keys(S.hexes).filter((k) => nearZone(k) && !S.sysAt[k]).sort((a, b) => Number(a.split(",")[0]) - Number(b.split(",")[0]));
  S.posts = {};
  POST_NAMES.forEach((name, i) => { const at = row[Math.floor(((i + 0.5) * row.length) / POST_NAMES.length)]; if (at) S.posts["p" + i] = { id: "p" + i, name, at, harm: 0, lost: false }; });
  return S.posts;
}
export const postAt = (S, hex) => Object.values(postsOf(S)).find((p) => p.at === hex && !p.lost);
export const livePosts = (S) => Object.values(postsOf(S)).filter((p) => !p.lost);
/** What a ship is heading for, by name: a listening post or a world. */
export const targetAt = (S, hex) => postAt(S, hex) || sysAt(S, hex);
export function harmPost(S, p, why) {
  p.harm = Math.min(3, p.harm + 1);
  if (p.harm >= 3) { p.lost = true; log(S, `${p.name} is lost: ${why}. The Neutral Zone has one less pair of ears on it.`, "bad"); }
  else log(S, `${p.name} is hit: ${why}. Damage ${p.harm}/3 (at 3 the post is lost).`, "bad");
}
/**
 * The Romulans answer a provocation on their border the way they always do: a cloaked bird-of-prey crosses the Neutral
 * Zone and strikes one of the listening posts that watch it (a Federation world, if every post is lost). (Klingon tension is the Klingon Empire's; the Romulans keep their own accounts.)
 */
export function romulanReprisal(S, why) {
  const posts = livePosts(S), targets = posts.length ? posts : Object.values(S.systems).filter((s) => s.kind === "colony" || s.kind === "member");
  if (!targets.length) return;
  const tgt = pick(S, targets), zone = Object.keys(S.hexes).filter(inZone).sort((a, b) => distance(a, tgt.at) - distance(b, tgt.at));
  if (!zone.length) return;
  spawnEnemy(S, "rbop", zone[0], { goal: "strike", target: tgt.at, hostile: true, cloaked: true, home: zone[0] });
  log(S, `Intelligence: after ${why}, Romulan traffic surges along the Neutral Zone. Somewhere out there, cloaked, a bird-of-prey is heading for ${posts.length ? "one of the listening posts on the Zone" : "a Federation world"}.`, "war");
}
// ---------- the cloak inverter, later ----------
// With the inverter fitted, a cloaked Romulan bird-of-prey on a strike that passes within its range is seen, and the
// captain chooses: pursue it, hail it, or warn the world it's heading for.
export function cloakContact(S, e) {
  if (!S.pelion.refits.inverter || e.type !== "rbop" || !e.cloaked || e.goal !== "strike" || e.contacted) return;
  if (distance(e.at, S.pelion.at) > sweepRange(S)) return;
  e.contacted = true; e.revealed = true;
  const ev = { kind: "cloak-contact", enemy: e.id };
  if (S.event || S.battle) (S.eventQueue = S.eventQueue || []).push(ev); else S.event = ev;
  log(S, `The cloak inverter paints a cloaked Romulan bird-of-prey ${distance(e.at, S.pelion.at) ? `${distance(e.at, S.pelion.at)} light-years off, on ${navBearing(S, S.pelion.at, e.at).text}` : "right beside the Pelion"}, heading for ${targetAt(S, e.target)?.name || "Federation space"}.`, "discovery");
}
export function cloakChoices(S, ev) {
  const e = S.enemies[ev.enemy]; if (!e) return null;
  const tgt = targetAt(S, e.target), d = distance(e.at, S.pelion.at);
  return { title: "A ghost on the inverter", text: `It starts as a flicker on the cloak inverter's display that Rrinn almost dismisses as noise, and then doesn't. She sits very still. \"Captain. There's something out there that isn't there.\"\n\nOn the main viewer, false-coloured by the inverter, a shape fills in: wings, a long hull, the painted bird on its belly. A Romulan bird-of-prey, cloaked, ${d ? `${d} light-year${d === 1 ? "" : "s"} off` : "almost alongside"}, running silent for ${tgt ? tgt.name : "Federation space"}. It has no idea it can be seen. Nobody on the bridge speaks above a whisper, as if it might hear them.\n\nsh'Vari is the first to say it. \"We could catch it.\"`,
    options: [
      { id: "pursue", name: "Pursue it", blurb: `Run it down before it reaches ${tgt ? tgt.name : "its target"}: Helm against its helmsman (Helm ${ENEMIES.rbop.helm}). Catch it, and the fight is on your terms: no ambush, and it can't hide.` },
      { id: "hail", name: "Hail it", blurb: `Tell its commander they've been seen: Communications against their Will ${ENEMIES.rbop.will + 2}. A Romulan seen is a Romulan who goes home.` },
      { id: "warn", name: `Warn ${tgt ? tgt.name : "its target"}`, blurb: "Send word ahead: the world's defenses will be ready, and drive the raid off when it comes." },
    ] };
}
export function chooseCloak(S, id) {
  const ev = S.event, e = ev && S.enemies[ev.enemy];
  S.event = null;
  if (!e) return { text: "The contact is gone." };
  const roll = (skill) => { const b = bestOfficer(S, [skill], {}, null) || { officer: "captain", skill }; const t = target(S, b.officer, skill); return { ...check(S, t.total), officer: b.officer, skill }; };
  const who = (r) => officer(r.officer)?.short || "The captain", tgt = targetAt(S, e.target);
  if (id === "pursue") {
    const r = roll("Helm"), o = opposed(S, r, { name: "the Romulan helmsman", skill: "Helm", target: ENEMIES.rbop.helm }, who(r));
    log(S, o.line, o.win ? "good" : "bad");
    if (o.win) { S.pelion.at = e.at; S.pelion.days = 0; syncMp(S); e.cloaked = false; log(S, `The Pelion runs the bird-of-prey down. With the inverter on it, its cloak is useless: it has to fight.`, "war");
      storyEvent(S, "The chase", `${who(r)} takes the Pelion in at full impulse, then warp, then full impulse again, matching every turn the Romulan makes before it makes it. On the bird-of-prey's bridge they must be wondering how: their cloak is perfect, their engines silent, and the Federation ship is still on them.\n\nWhen they finally understand, the bird-of-prey decloaks, all at once, a great green-grey shape against the stars, with its weapons already charging. There is nowhere left to hide. It has to fight.`);
      startBattleHook(S, e.id, "pelion"); e.hostile = true; return { text: o.line + " The Pelion runs it down: its cloak is useless against the inverter, and it has to fight." }; }
    log(S, `The bird-of-prey slips away toward ${tgt ? tgt.name : "its target"}.`, "bad");
    storyEvent(S, "The chase", `For an hour it's close. Then the Romulan commander does something no one on the Pelion's bridge expects: cuts engines entirely and drifts, cold and dark, into the debris of a dead comet, where even the inverter can only guess. By the time the guesses resolve, the ghost is gone, still cloaked, still heading for ${tgt ? tgt.name : "its target"}. Rrinn's tail lashes once. \"Clever,\" she says, and doesn't mean it as a compliment.`);
    return { text: o.line + " It's faster than it looks: it slips away, still cloaked, still heading for " + (tgt ? tgt.name : "its target") + "." };
  }
  if (id === "hail") {
    const r = roll("Communications"), o = opposed(S, r, { name: "the Romulan commander", skill: "Will", target: ENEMIES.rbop.will + 2 }, who(r));
    log(S, o.line, o.win ? "good" : "bad");
    if (o.win) { sendHome(S, e, 0); e.cloaked = true; S.commendations += 1; log(S, "The bird-of-prey turns for the Neutral Zone without a word: a Romulan seen is a Romulan who goes home. +1 commendation.", "good");
      storyEvent(S, "Seen", `${who(r)} opens a channel on the Romulan command frequency, and says, very politely, exactly where the bird-of-prey is: its heading, its speed, the name painted on its hull. Then waits.\n\nThere is no reply. There never would be. But after a long minute, on the inverter's display, the ghost banks, slowly, and turns for the Neutral Zone. A Romulan who has been seen is a Romulan who goes home to explain why.`);
      return { text: o.line + " Silence on the channel, and then the contact turns for the Neutral Zone. +1 commendation." }; }
    storyEvent(S, "Seen", `${who(r)} hails the bird-of-prey with its own position, heading and speed. The silence on the channel goes on and on. Then, deliberately, the ghost on the inverter's display adjusts its course by a single degree, toward ${tgt ? tgt.name : "its target"}, and keeps going. It has been seen. It doesn't care.`);
    return { text: o.line + " Silence. The contact holds its course." };
  }
  if (id === "warn" && tgt) { tgt.alerted = S.turn; log(S, `${tgt.name} is warned: its defenses are ready for the bird-of-prey.`, "good");
    storyEvent(S, "Word ahead", `The warning goes out on a tight beam, coded, to ${tgt.name} alone, so the Romulans can't hear it go. At the other end, someone reads it twice, then sounds general quarters. Shields come up. Weapons crews who were off duty come running, half-dressed. When the bird-of-prey decloaks, it will find them waiting.`); return { text: `Word goes ahead to ${tgt.name}. When the bird-of-prey decloaks, it will find the defenses ready.` }; }
  return { text: "The Pelion lets it go." };
}
/** How far a sensor sweep reaches for cloaked ships: 3 light-years, 5 with the tuned cloak inverter. */
export const sweepRange = (S) => 3 + ((S.pelion.refits.inverter || 0) >= 2 ? 2 : 0) + ((S.pelion.alloc || {}).sensors >= 2 ? 1 : 0);
export function speedOf(S) { return lyPerWeek(S.pelion.warp ?? CRUISE_WARP); }
/** Travel time, in days, for a number of light-years at a warp factor. */
export const travelDays = (ly, w) => ly * daysPerLy(w);
/** Cheapest path (list of hexes after `from`) and its cost. */
export function findPath(S, from, to, who = "pelion") {
  if (from === to) return { path: [], cost: 0 };
  const dist = { [from]: 0 }, prev = {}, open = [from];
  while (open.length) {
    open.sort((a, b) => dist[a] - dist[b]);
    const k = open.shift();
    if (k === to) break;
    for (const n of neighbors(k)) {
      if (!S.hexes[n]) continue;
      if (who === "klingon" || who === "orion") { if (inZone(n)) continue; }
      const c = dist[k] + moveCost(S, n, who);
      if (dist[n] === undefined || c < dist[n]) { dist[n] = c; prev[n] = k; if (!open.includes(n)) open.push(n); }
    }
  }
  if (dist[to] === undefined) return null;
  const path = []; for (let k = to; k !== from; k = prev[k]) path.unshift(k);
  return { path, cost: dist[to] };
}
/** Hexes the Pelion can reach this turn, with their cost. */
export function reachable(S, unit = "pelion") {
  const U = unit === "pelion" ? S.pelion : S.support[unit];
  const out = { [U.at]: 0 }, open = [U.at];
  while (open.length) {
    const k = open.shift();
    for (const n of neighbors(k)) {
      if (!S.hexes[n]) continue;
      const c = out[k] + moveCost(S, n, unit === "pelion" ? "pelion" : "support");
      if (c <= U.mp && (out[n] === undefined || c < out[n])) { out[n] = c; open.push(n); }
    }
  }
  return out;
}
/** While an away team is on Corvan II's surface, turns are hours, and the Pelion stays in orbit. */
export const hourly = (S) => !!(S.arc.team && ["pull", "orions", "caretaker", "phasers"].includes(S.arc.stage) && S.pelion.at === S.systems[S.corvan].at);
export function moveTo(S, unit, hex) {
  if (S.over || S.battle || S.event) return { error: "Finish what's in front of you first." };
  if (unit === "pelion" && hourly(S)) return { error: "The away team is on the surface. Beam them up before leaving orbit." };
  const U = unit === "pelion" ? S.pelion : S.support[unit];
  const r = reachable(S, unit);
  if (r[hex] === undefined) return { error: "Too far for this turn." };
  const p = findPath(S, U.at, hex, unit === "pelion" ? "pelion" : "support");
  // The ship now faces the hex side it last crossed.
  if (p && p.path.length) { const prev = p.path.length > 1 ? p.path[p.path.length - 2] : U.at, d = neighbors(prev).indexOf(hex); if (d >= 0) U.facing = d; }
  if (unit === "pelion") { U.days = Math.max(0, U.days - r[hex] * daysPerLy(U.warp)); syncMp(S); U.strain = Math.max(U.strain || 0, U.warp); U.lyWeek = (U.lyWeek || 0) + r[hex]; }
  else U.mp -= r[hex];
  U.at = hex;
  if (unit === "pelion") for (const o of S.orders) arriveAt(S, o);
  if (unit === "pelion") {
    S.pelion.docked = false;
    if (p && p.path.some(inZone) && !S.pelion.zoneMarked && !orderHere(S, hex, "border")) {
      S.pelion.zoneMarked = true; markCommand(S, 1, "The Pelion crossed into the Romulan Neutral Zone.");
    }
    arrive(S, hex);
  }
  updateVisibility(S);
  return { ok: true };
}
function arrive(S, hex) {
  const s = sysAt(S, hex);
  if (s) {
    const known = KINDS[s.kind]?.known || s.surveyed || ["member", "claimed", "lost"].includes(s.kind);
    const what = { member: "a Federation member world", claimed: "a world of the Klingon Empire", lost: "an evacuated colony", independent: `an independent world (accord ${signedAccord(s.accord)})` }[s.kind] || (known ? "a " + KINDS[s.kind].name.toLowerCase() : "an uncharted system");
    const there = Object.values(S.enemies).filter((e) => e.at === hex && !e.cloaked && !e.hidden && !ENEMIES[e.type].base).map((e) => (/^[AEIOU]/.test(ENEMIES[e.type].name) ? "an " : "a ") + ENEMIES[e.type].name);
    log(S, `The Pelion arrives at ${s.name}, ${what}${s.harm ? `, harmed ${s.harm}/3` : ""}.${there.length ? ` In orbit: ${there.join(", ")}.` : ""}`, "move");
  }
  if (s) S.seenSys[s.id] = true;
  if (s && s.id === S.starbase) dock(S);
  // Orders with a twist that bites on arrival.
  for (const o of S.orders) {
    if (o.at !== hex || o.arrived) continue;
    o.arrived = true;
    if (o.twist && o.twist.fx === "systems") { S.pelion.sys.sensors = Math.min(3, S.pelion.sys.sensors + 1); log(S, `${o.title}: the Pelion's sensors begin failing.`, "bad"); }
  }
  if (s && s.id === S.corvan && S.arc.stage === "travel") arcArriveHook(S);
}
function dock(S) {
  const P = S.pelion;
  P.docked = true;
  const fixed = P.shields + P.hull + P.sys.weapons + P.sys.engines + P.sys.sensors > 0 || P.torps < PELION.torps;
  P.shields = 0; P.hull = 0; P.sys = { weapons: 0, engines: 0, sensors: 0 }; P.torps = PELION.torps;
  for (const id in S.crew) { const c = S.crew[id]; c.inj = 0; c.duty = 2; }
  // Starfleet refuels the antimatter and issues spares up to six crates; dilithium is bought (the Ship tab).
  const st = storesOf(S), am = addStore(S, "antimatter", STORES.antimatter.max), sp = st.spares < 6 ? addStore(S, "spares", 6 - st.spares) : 0;
  log(S, `Docked at Starbase 23: ${fixed ? "repaired, rearmed and " : ""}crew rested; Duty points restored.${am ? ` Refuelled: +${am} antimatter.` : ""}${sp ? ` Spares issued: +${sp}.` : ""}${st.dilithium < 10 ? ` Dilithium ${st.dilithium}/10: the quartermaster has crystals, for supplies.` : ""}`, "good");
}
export function sightRange(S) { return 2 + (S.pelion.refits.sensors ? 1 : 0) + ((S.pelion.alloc || {}).sensors >= 2 ? 1 : 0); }
export function updateVisibility(S) {
  const v = {};
  const see = (hex, n) => { for (const k of within(hex, n)) if (S.hexes[k]) v[k] = true; };
  see(S.pelion.at, sightRange(S));
  for (const u of Object.values(S.support)) see(u.at, 2);
  for (const s of Object.values(S.systems)) if (["starbase", "colony", "member"].includes(s.kind)) see(s.at, 1);
  S.visible = v;
  for (const e of Object.values(S.enemies)) if (v[e.at] && !e.cloaked && !e.hidden && !ENEMIES[e.type].base) e.seen = true;
}
export const enemiesAt = (S, hex) => Object.values(S.enemies).filter((e) => e.at === hex);
/** Enemy ships the player can see. */
export const visibleEnemies = (S) => Object.values(S.enemies).filter((e) => !e.hidden && ((S.visible[e.at] && !e.cloaked && !ENEMIES[e.type].base) || e.revealed || (ENEMIES[e.type].base && e.found)));

// ---------- enemies ----------
export function spawnEnemy(S, type, at, extra = {}) {
  const id = "e" + S.nextId++;
  const E = ENEMIES[type];
  S.enemies[id] = { id, type, power: E.power, at, shields: 0, hull: 0, goal: "idle", target: null, hostile: false, cloaked: false, stay: 0, home: at, ...extra };
  return S.enemies[id];
}

// ---------- Starfleet Command ----------
export function markCommand(S, n, why) {
  S.command = Math.max(0, Math.min(5, S.command + n));
  // The captain's standing with Starfleet: five boxes and the captain is relieved of command.
  if (n > 0) log(S, `Starfleet Command marks ${n === 1 ? "a box" : n + " boxes"} against the captain: ${why} (${S.command} of 5${S.command >= 5 ? "" : `; at 5 the captain is relieved of command`}).`, "bad");
  else log(S, `Starfleet Command clears ${-n === 1 ? "a box" : -n + " boxes"}: ${why} (${S.command} of 5).`, "good");
  if (S.command >= 5 && !S.over) S.over = { win: false, why: "Starfleet Command has relieved you of command. The Pelion returns to Starbase 23 under another captain." };
}

// ---------- actions at a system ----------
/** What a unit can do where it is. Each entry: { id, name, skills, blurb, sys?, order?, why? (why it can't) }. */
export function actionsFor(S, unit = "pelion") {
  const U = unit === "pelion" ? S.pelion : S.support[unit];
  const s = sysAt(S, U.at), out = [];
  const add = (id, extra = {}) => out.push({ id, ...ACTIONS[id], ...extra });
  const sci = unit !== "pelion";
  if (s && !s.surveyed && s.kind !== "klingon") add("survey", { sys: s.id, oppose: surveyOpposition(S, s, U.at) });
  if (s && s.surveyed && (s.kind === "anomaly" || s.kind === "ruins") && !s.recorded) add("investigate", { sys: s.id, blurb: `Discovery clock ${s.clock}/${s.need}. Fill it for a library record. Lose by 3 or more and it bites back.`, oppose: s.kind === "ruins" ? { name: "the ruins' old defenses", skill: "Hazard", target: 12, why: "Whoever built this didn't want visitors." } : { name: "the anomaly", skill: "Strangeness", target: 12, why: "It doesn't follow the physics the sensors expect." } });
  if (sci) return out.map((a) => ({ ...a, why: U.acted ? "Already acted this turn." : null }));
  if (s && s.kind === "independent") add("envoy", { sys: s.id, blurb: `Accord ${signedAccord(s.accord)}. At +5 they petition to join the Federation; at −5 they join the Klingon Empire. The closer they come, the harder the last steps.`, oppose: envoyOpposition(S, s) });
  if (s && s.kind === "prewarp" && s.surveyed && !s.observed) add("observe", { sys: s.id });   // from orbit: nothing on the planet can oppose a starship
  if (s && s.harm > 0 && ["colony", "member", "independent"].includes(s.kind)) add("aid", { sys: s.id, blurb: `Harm ${s.harm}/3. Clear a box.`, oppose: aidOpposition(S, s) });
  const P = S.pelion;
  if (P.shields || P.sys.weapons || P.sys.engines || P.sys.sensors || P.hull) add("repair", { oppose: repairOpposition(S), blurb: ACTIONS.repair.blurb + ` Uses a crate of spares (${storesOf(S).spares} left)${storesOf(S).spares ? "" : ": none left, −3"}.` });
  if (s && s.surveyed && s.dilithium > 0 && s.kind !== "prewarp") add("mine", { sys: s.id, blurb: `A seam of about ${s.dilithium} crystal${s.dilithium === 1 ? "" : "s"} here. Cut 2 (3 on success by 5) for the Pelion's matrix (${storesOf(S).dilithium}/10). Lose by 3 or more and the seam bites back.`, oppose: { name: "the crystal seams", skill: "Instability", target: 10, why: "Living dilithium fractures if it's cut wrong, and sometimes the rock around it does too." } });
  if (storesOf(S).dilithium < STORES.dilithium.max && storesOf(S).spares > 0) add("recrystallize", { blurb: `Restore worn crystals with a field from the warp core: +1 dilithium (+2 on success by 5), for a crate of spares. Dilithium ${storesOf(S).dilithium}/10, spares ${storesOf(S).spares}.`, oppose: { name: "the fractured lattice", skill: "Fracture", target: 11, why: "A worn crystal's lattice has to be coaxed back, plane by plane." } });
  add("sweep", { blurb: `Listen for cloaked ships and raiders within ${sweepRange(S)} light-years: reveals them. Finds a hidden base here.${P.refits.inverter ? " The cloak inverter helps: +2." : ""}`, oppose: { name: "cloaks and subspace static", skill: "Concealment", target: 11, why: "Anything worth finding is trying not to be found, and the sector's background noise helps it." } });
  for (const e of enemiesAt(S, U.at)) if ((!e.cloaked || e.revealed) && !e.hidden && !ENEMIES[e.type].base) {
    if (ENEMIES[e.type].will) add("hail", { enemy: e.id, name: `Hail the ${ENEMIES[e.type].name}`, oppose: { name: `the ${ENEMIES[e.type].name}'s captain`, skill: "Will", target: ENEMIES[e.type].will + (e.power === "romulan" ? 2 : 0), why: e.power === "klingon" ? "A Klingon captain backs down from nothing lightly." : e.power === "romulan" ? "Romulans don't negotiate from weakness, and never think they're weak." : "Pirates weigh the odds, and the profit." } });
    out.push({ id: "engage", enemy: e.id, name: `Engage the ${ENEMIES[e.type].name}`, skills: [], blurb: engageNote(S, e) });
  }
  const base = Object.values(S.enemies).find((e) => ENEMIES[e.type].base && e.at === U.at && e.found);
  if (base) out.push({ id: "engage", enemy: base.id, name: "Attack the Orion base", skills: [], blurb: "Its guns and shields against yours. Destroy it and the raids stop." });
  for (const o of S.orders) if (!o.arc && o.at === U.at) add("mission", { order: o.id, name: `Orders: ${o.title}`, skills: o.skills, blurb: `${o.have}/${o.segs} done.`, ...(o.oppose ? { oppose: o.finale && S.pelion.refits.inverter && o.campaignId !== "syndicate" ? { ...o.oppose, target: o.oppose.target - 2, why: o.oppose.why + " But their cruiser's cloak is no use against the cloak inverter: −2 to them." } : o.oppose } : { extra: [["In the field", -2]] }) });
  if (s && s.id === S.corvan) out.push(...arcActionsHook(S));
  // With an away team on Corvan II's surface, the away team does the mission's work and the bridge crew (whoever stayed
  // aboard) runs the ship: its operations are theirs alone.
  const surface = s && s.id === S.corvan && S.arc.team && ["pull", "orions", "caretaker", "phasers"].includes(S.arc.stage);
  if (surface) { const aboard = CREW.map((c) => c.id).filter((id) => !S.arc.team.includes(id)); for (const x of out) if (x.id !== "arc" && x.id !== "beam" && !x.who) { x.who = aboard; x.bridge = true; } }
  return out.map((a) => ({ ...a, why: a.why || whyNot(S, a) }));
}
/** What a survey is up against: the system's radiation and distance, worse in a nebula or around something strange. */
function surveyOpposition(S, s, hex) {
  const nebula = S.hexes[hex] && S.hexes[hex].terrain === "nebula", odd = s.kind === "anomaly" || s.kind === "ruins";
  if (nebula) return { name: "the nebula's interference", skill: "Interference", target: 12, why: "Ionized gas scatters every sensor beam." };
  if (odd) return { name: "readings that don't add up", skill: "Distortion", target: 11, why: "Something here bends the sensor returns." };
  return { name: "the system's radiation and distance", skill: "Interference", target: 9, why: "Stellar radiation and light-hours of distance blur the readings." };
}
/** Repairs: the damage itself, worse the more there is. */
function repairOpposition(S) {
  const P = S.pelion, boxes = P.hull + P.sys.weapons + P.sys.engines + P.sys.sensors + (P.shields ? 1 : 0);
  return { name: "the damage itself", skill: "Severity", target: Math.min(13, 8 + boxes), why: boxes > 2 ? "One failure leads to the next: the worse the damage, the harder the fix." : "Burnt-out relays and buckled plating don't fix themselves." };
}
/** Relief work: the devastation, or raiders still overhead. */
function aidOpposition(S, s) {
  if (Object.values(S.enemies).some((e) => e.at === s.at && e.hostile && !ENEMIES[e.type].base)) return { name: "the raiders still overhead", skill: "Harassment", target: 12, why: "Relief teams under fire work slowly." };
  return { name: "the devastation", skill: "Severity", target: 8 + s.harm, why: s.harm >= 2 ? "Whole districts are down; every fix uncovers another failure." : "Fires, failed power and frightened people." };
}
/** Who works against the Pelion's envoys: Klingon envoys courting the same world, or the world's own doubters. */
function envoyOpposition(S, s) {
  const k = Object.values(S.enemies).find((e) => e.goal === "influence" && e.target === s.at && e.power === "klingon");
  if (k) return { name: "the Klingon envoys courting them", skill: "Persuasion", target: 12, why: "The Empire is making its own offer, with a battle cruiser in orbit to underline it." };
  return { name: "their council's doubters", skill: "Doubt", target: 9 + Math.max(0, s.accord), why: s.accord > 0 ? "The closer they come to the Federation, the louder the voices against it." : "Not everyone wants outsiders' promises." };
}
const sig = (a) => [a.id, a.arc || "", a.order || "", a.enemy || "", a.sys || ""].join(":");
/** Why an action can't be taken now: tried already this turn, or no one free (or fit) with the training. */
function whyNot(S, a) {
  if (a.free) return null;
  if (a.id === "engage") return S.pelion.engaged ? "The Pelion has already fought this turn." : null;
  if ((S.tried || {})["pelion:" + sig(a)]) return "Already tried this turn: try again next turn.";
  const group = a.who || CREW.map((c) => c.id), trained = (id) => a.skills.some((sk) => skillOf(S, id, sk));
  if (group.some((id) => free(S, id) && trained(id))) return null;
  return group.some((id) => available(S, id) && trained(id)) ? "Everyone with the training has acted this turn." : "Nobody fit for duty has the training.";
}
/** A second officer, free and trained in the skill (13 or better), who could assist: +1, and it uses their turn. */
export function helperFor(S, a, who, skill) { return CREW.find((c) => c.id !== who && free(S, c.id) && (!a.who || a.who.includes(c.id)) && skillOf(S, c.id, skill) >= 13); }
const signedAccord = (a) => (a > 0 ? "+" : a < 0 ? "−" : "") + Math.abs(a);
function engageNote(S, e) {
  const E = ENEMIES[e.type];
  if (e.power === "klingon" && !e.hostile) return "They haven't fired on anyone. Attacking first is a diplomatic incident: Starfleet Command marks a box, and tension with the Empire rises.";
  return `${E.name}: shields ${E.shields - e.shields}/${E.shields}, hull ${E.hull - e.hull}/${E.hull}.`;
}

const actionCtx = (S, a) => ({ action: a.id === "mission" ? "mission" : a.id, order: a.order && S.orders.find((o) => o.id === a.order), listen: a.id === "hail" || a.id === "sweep" });
const hailWill = (S, a) => { const e = S.enemies[a.enemy], will = ENEMIES[e.type].will + (e.power === "romulan" ? 2 : 0); return [`Their captain's Will ${will}`, 10 - will]; };
/**
 * The target for this officer doing this action, every modifier named: their skill, their advantage, wounds, the ship's
 * sensors, the action's own difficulty, a second trained officer helping (+1), a captain's Will. The page shows it before
 * the roll; the roll uses the same.
 */
export function rollTarget(S, a, who, skill, assist = false) {
  const t = target(S, who, skill, { ...actionCtx(S, a), extra: a.extra || [] });
  const helper = assist ? helperFor(S, a, who, skill) : null;
  if (helper) { t.parts.push([`${helper.short} assists`, 1]); t.total += 1; t.helper = helper.id; }
  if (a.id === "hail" && !a.oppose) { const w = hailWill(S, a); t.parts.push(w); t.total += w[1]; }
  return t;
}
/** Roll an action. Returns a pending result for the player to accept, or to reroll with a Duty point. */
export function attempt(S, unit, actionId, opts = {}) {
  if (S.over || S.battle || S.event || S.pending) return { error: "Finish what's in front of you first." };
  const list = unit === "pelion" ? actionsFor(S) : actionsFor(S, unit);
  const a = list.find((x) => x.id === actionId && (opts.order ? x.order === opts.order : true) && (opts.enemy ? x.enemy === opts.enemy : true) && (opts.arc ? x.arc === opts.arc : true));
  if (!a) return { error: "Not possible here." };
  if (a.why) return { error: a.why };
  if (actionId === "engage") { startBattleHook(S, a.enemy, "pelion"); S.pelion.engaged = true; return { ok: true, battle: true }; }
  const ctx = actionCtx(S, a);
  let who, skill, t;
  if (unit !== "pelion") { who = unit; skill = a.skills[0]; t = { parts: [["Science vessel's crew", SUPPORT.science.skill], ["Its sensors", 2]], total: SUPPORT.science.skill + 2 }; }
  else {
    // a.who: only these officers can do it (the away team on the surface, or those still aboard).
    who = opts.officer; skill = opts.skill;
    if (!who || !skill || !free(S, who) || !skillOf(S, who, skill) || !a.skills.includes(skill) || (a.who && !a.who.includes(who))) {
      const b = bestOfficer(S, a.skills, ctx, a.who, true); if (!b) return { error: "No one free has the training." }; who = b.officer; skill = b.skill;
    }
    t = rollTarget(S, a, who, skill, !!opts.assist);
    // The officer (and whoever assisted) has acted this turn; this action has been tried this turn.
    S.crew[who].acted = true; if (t.helper) S.crew[t.helper].acted = true;
  }
  (S.tried = S.tried || {})[unit + ":" + sig(a)] = true;
  if (actionId === "hail" && unit !== "pelion") { const w = hailWill(S, a); t.parts.push(w); t.total += w[1]; }
  const roll = check(S, t.total);
  S.pending = { unit, action: actionId, arc: a.arc, order: a.order, enemy: a.enemy, sys: a.sys, officer: who, skill, target: t, roll, rerolled: false, name: a.name, opposed: !!(a.oppose || a.contest), oppose: a.oppose || null };
  if (roll.success) return resolve(S, false);
  return { ok: true, pending: S.pending };
}
export function canReroll(S) { const p = S.pending; return p && !p.roll.success && !p.rerolled && p.unit === "pelion" && S.crew[p.officer] && S.crew[p.officer].duty > 0; }
/** Accept the pending roll, or spend the officer's Duty point to roll again (and keep the second). */
export function resolve(S, reroll) {
  const p = S.pending; if (!p) return { error: "Nothing to resolve." };
  if (reroll) {
    if (!canReroll(S)) return { error: "No Duty point to spend." };
    S.crew[p.officer].duty--; p.rerolled = true; p.first = p.roll; p.roll = check(S, p.target.total);
    if (!p.roll.success) return { ok: true, pending: p };
  }
  S.pending = null;
  const U = p.unit === "pelion" ? S.pelion : S.support[p.unit];
  if (p.unit !== "pelion") U.acted = true;
  const pre = S.log.length;
  // Opposition (outside Corvan II, which rolls its own): the action is won on the better margin, not the roll alone.
  if (p.oppose && !p.arc) {
    const nm = p.unit === "pelion" ? officer(p.officer)?.short || "The captain" : S.support[p.unit]?.name || "The science vessel";
    const o = opposed(S, p.roll, p.oppose, nm);
    p.rawRoll = p.roll; p.roll = { ...p.roll, success: o.win, margin: o.diff }; p.won = o.win; p.oppLine = o.line;
    log(S, o.line, o.win ? "good" : "bad");
  }
  const out = applyAction(S, p);
  if (p.action === "sweep" && p.unit === "pelion") arcSweepHook(S);   // a sweep over Corvan II wakes the ruins
  const where = sysAt(S, U.at)?.name || "open space";
  const who = p.unit === "pelion" ? (p.officer === "captain" ? S.captain : officer(p.officer).name) : S.support[p.unit]?.name || "The science vessel";
  const r = p.roll, head = p.opposed ? `${who} (${p.skill}) · ${p.name} at ${where}${p.rerolled ? `, after spending a Duty point to reroll${p.arc === "reason" ? " the first exchange" : ""}` : ""}:` : `${who} (${p.skill || "crew"}) · ${p.name} at ${where}: rolled ${r.dice.join("+")} = ${r.total} against ${r.target}, ${r.success ? `success by ${r.margin}` : `failed by ${-r.margin}`}${p.rerolled ? " after spending a Duty point to reroll" : ""}.`;
  if (S.log.length > pre) S.log[pre].text = head + " " + S.log[pre].text; else log(S, head);
  if (p.unit === "pelion" && p.roll.success && p.officer !== "captain") gainXp(S, p.officer, p.skill);
  updateVisibility(S);
  checkEnd(S);
  return { ok: true, done: true, result: { ...p, text: out } };
}
/** One exchange of opposed rolls: the crew's roll against the opposition's. Better margin wins; ties to the opposition. */
export function opposed(S, mine, o, who) {
  const its = check(S, o.target);
  const ms = mine.success ? mine.margin : Math.min(mine.margin, -1), mc = its.success ? its.margin : Math.min(its.margin, -1);
  const win = ms > mc;
  const plural = /s$/.test(o.name.split(" ").pop()) || / and /.test(o.name);
  const line = `${who} rolled ${mine.dice.join("+")} = ${mine.total} against ${mine.target} (${mine.success ? `by ${mine.margin}` : `failed by ${-mine.margin}`}); opposing, ${o.name} (${o.skill} ${o.target}) rolled ${its.dice.join("+")} = ${its.total} (${its.success ? `by ${its.margin}` : `failed by ${-its.margin}`}). ${win ? `${who} wins` : `${o.name[0].toUpperCase() + o.name.slice(1)} win${plural ? "" : "s"}`}${ms === mc ? " (a tie goes to the opposition)" : ""}.`;
  return { win, diff: ms - mc, its, line };
}
/** The chance to win one opposed roll at this target against this one, worked out exactly. */
export function exchangeOdds(T, them) {
  const dist = {}; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) dist[a + b + c] = (dist[a + b + c] || 0) + 1 / 216;
  const eff = (t, n) => (n <= 4 || (n <= t && n < 17) ? t - n : Math.min(t - n, -1));
  let p = 0; for (const x in dist) for (const y in dist) if (eff(T, +x) > eff(them, +y)) p += dist[x] * dist[y];
  return p;
}
function gainXp(S, id, skill) {
  const c = S.crew[id]; c.xp++;
  if (c.xp >= 5) {
    c.xp = 0;
    const cur = skillOf(S, id, skill), cap = Math.max(17, officer(id).skills[skill]);
    if (cur < cap) { c.plus[skill] = (c.plus[skill] || 0) + 1; log(S, `${officer(id).name} grows in the job: ${skill} ${cur} → ${cur + 1}.`, "good"); }
  }
}
function applyAction(S, p) {
  const r = p.roll, s = p.sys && S.systems[p.sys], big = r.margin >= 5;
  const name = p.unit === "pelion" ? officer(p.officer)?.short || "The captain" : S.support[p.unit].name;
  switch (p.action) {
    case "survey": {
      if (!r.success) return say(S, `${name} couldn't make sense of ${s.name}'s readings. Try again next turn.`);
      s.surveyed = true; S.seenSys[s.id] = true;
      if (s.dilithium) log(S, `${s.name} has a seam of living dilithium, about ${s.dilithium} crystals: the Pelion can mine it.`, "discovery");
      const sci = 4 + (big ? 3 : 0) + (p.unit !== "pelion" ? 2 : 0); S.science += sci;
      const what = { prewarp: "a pre-warp people. The Prime Directive applies.", anomaly: "an anomaly worth investigating.", ruins: "the ruins of a vanished civilization.", empty: "nothing but rock and starlight.", orionBase: "nothing but rock and starlight." }[s.kind] || "charted.";
      return say(S, `Survey of ${s.name}: ${what} +${sci} science.`, "discovery");
    }
    case "investigate": {
      if (!r.success) {
        if (r.margin <= -3) { const hurt = hazard(S, p); return say(S, `The ${s.kind === "ruins" ? "ruins" : "anomaly"} at ${s.name} bites back: ${hurt}`, "bad"); }
        return say(S, `No progress at ${s.name} this time.`);
      }
      s.clock = Math.min(s.need, s.clock + (big ? 2 : 1)); S.science += 2;
      if (s.clock >= s.need) { s.recorded = true; const rec = earnRecord(S); return say(S, `Discovery at ${s.name}! Library record: ${rec ? rec.name + ". " + rec.text : "a fascinating footnote."} +10 science.`, "discovery"); }
      return say(S, `Investigating ${s.name}: ${s.clock}/${s.need} on the discovery clock.`, "discovery");
    }
    case "envoy": {
      if (!r.success) { if (r.margin <= -4) { s.accord = Math.max(-5, s.accord - 1); return say(S, `The talks at ${s.name} went badly: accord ${signedAccord(s.accord)}.`, "bad"); } return say(S, `The envoys of ${s.name} listen politely and promise nothing.`); }
      s.accord = Math.min(5, s.accord + (big ? 2 : 1));
      if (s.accord >= 5) { join(S, s); return say(S, `${s.name} petitions to join the United Federation of Planets!`, "victory"); }
      return say(S, `Talks at ${s.name} go well: accord ${signedAccord(s.accord)}.`, "good");
    }
    case "observe": {
      if (r.success) { s.observed = true; S.science += 6; return say(S, `${name} studies ${s.name}'s people unseen: +6 science.`, "discovery"); }
      return say(S, `Nothing useful from ${s.name} this time.`);
    }
    case "aid": {
      if (!r.success) return say(S, `Relief work at ${s.name} goes slowly.`);
      s.harm = Math.max(0, s.harm - (big ? 2 : 1));
      if (s.kind === "independent") s.accord = Math.min(5, s.accord + 1);
      if (s.kind === "independent" && s.accord >= 5) { join(S, s); return say(S, `Grateful for the help, ${s.name} petitions to join the Federation!`, "victory"); }
      return say(S, `Relief at ${s.name}: harm ${s.harm}/3${s.kind === "independent" ? `, accord ${signedAccord(s.accord)}` : ""}.`, "good");
    }
    case "repair": {
      if (!r.success) return say(S, `${name}'s repairs don't hold.`);
      const P = S.pelion; let n = big ? 2 : 1; const fixed = [];
      const usedSpare = addStore(S, "spares", -1) < 0;
      for (const k of ["engines", "weapons", "sensors"]) while (n > 0 && P.sys[k] > 0) { P.sys[k]--; n--; fixed.push(k); }
      while (n > 0 && P.shields > 0) { P.shields--; n--; fixed.push("shields"); }
      if (n > 0 && P.hull > 0) { P.hull--; fixed.push("hull"); }
      return say(S, `Repairs: ${fixed.join(", ") || "nothing needed"}${usedSpare ? ` (a crate of spares used; ${storesOf(S).spares} left)` : ", improvised without spare parts"}.`, "good");
    }
    case "mine": {
      if (!r.success) {
        if (r.margin <= -3) { const hurt = hazard(S, p); return say(S, `The seam at ${s.name} fractures under the cutters: ${hurt}`, "bad"); }
        return say(S, `The crystals at ${s.name} won't come out clean this time.`);
      }
      const n = Math.min(s.dilithium, big ? 3 : 2), got = addStore(S, "dilithium", n); s.dilithium -= n;
      return say(S, `Mining at ${s.name}: ${n} crystal${n === 1 ? "" : "s"} cut from the seam${got < n ? ` (the matrix had room for ${got}; the rest go to the stores' trade)` : ""}. Dilithium ${storesOf(S).dilithium}/10.${s.dilithium ? ` About ${s.dilithium} left in the seam.` : " The seam is worked out."}`, "good");
    }
    case "recrystallize": {
      if (!r.success) return say(S, `${name} can't coax the crystals back this time.`);
      addStore(S, "spares", -1); const got = addStore(S, "dilithium", big ? 2 : 1);
      return say(S, `${name} recrystallizes the worn dilithium: +${got}, for a crate of spares. Dilithium ${storesOf(S).dilithium}/10, spares ${storesOf(S).spares}.`, "good");
    }
    case "sweep": {
      if (!r.success) return say(S, `The sweep finds nothing${r.margin <= -2 ? "" : " (or nothing that wants to be found)"}.`);
      const found = [];
      for (const e of Object.values(S.enemies)) {
        if (distance(e.at, S.pelion.at) > sweepRange(S)) continue;
        if (ENEMIES[e.type].base) { if (e.at === S.pelion.at && !e.found) { e.found = true; const sy = sysAt(S, e.at); if (sy) sy.surveyed = true; found.push("an Orion pirate base, hidden in " + (sy ? sy.name : "the dust")); } continue; }
        if (e.cloaked && !e.revealed) { e.revealed = true; found.push(`a cloaked ${ENEMIES[e.type].name}`); }
        if (e.hidden && e.at === S.pelion.at) { e.hidden = false; e.seen = true; found.push(`an ${ENEMIES[e.type].name} holding station on the far side of ${sysAt(S, e.at)?.name || "the"} moon, where passive sensors couldn't see it`); }
      }
      // A sweep also hears where the raiders come from.
      const base = Object.values(S.enemies).find((e) => ENEMIES[e.type].base && !e.found);
      if (!found.length && base) { const d = distance(base.at, S.pelion.at); return say(S, `Nothing nearby, but ${name} hears Orion traffic ${d <= 4 ? "very close: within " + d + " hexes" : d <= 7 ? "on " + navBearing(S, S.pelion.at, base.at).text + ", " + d + " hexes out" : "far off"}.`, "discovery"); }
      return say(S, found.length ? `Sweep: ${found.join("; ")}.` : "Sweep: all quiet.", found.length ? "discovery" : "");
    }
    case "hail": {
      const e = S.enemies[p.enemy];
      if (!r.success) { if (e.power !== "klingon" || e.hostile) { startBattleHook(S, e.id, "enemy"); return say(S, `The ${ENEMIES[e.type].name} answers with its guns.`, "bad"); } return say(S, `The Klingon captain laughs and cuts the channel.`); }
      sendHome(S, e, 4); return say(S, `${name} talks the ${ENEMIES[e.type].name} out of it: it withdraws.`, "good");
    }
    case "mission": return missionStep(S, p);
    default: if (p.arc) return arcStepHook(S, p);
  }
  return "";
}
const say = (S, text, kind = "") => { log(S, text, kind); return text; };
// ---------- Starfleet navigation ----------
const HEX_LY = 1;                                     // a hex is a light-year across
const PX = (k) => { const [q, r] = k.split(",").map(Number); return { x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r }; };
const zOf = (S, k) => ((hashString(S.seed + ":z:" + k) % 41) - 20) / 10;   // each hex's height off the sector's plane: ±2 hex widths
const ang = (y, x) => (Math.round(((Math.atan2(y, x) * 200) / Math.PI + 400) % 400) % 400);   // an angle in 400 degrees
/** A hex side's direction (0–5, as hex.js lists the neighbours), as an angle clockwise from galactic north. */
export const sideHeading = (i) => [100, 33.33, 366.67, 300, 233.33, 166.67][i];
/**
 * A flight path the Starfleet way: three values in 400 degrees, relative to the ship. The bearing goes around the ship:
 * 000 (400) dead ahead, 100 starboard, 200 astern, 300 port. The first mark is the climb or dip along the ship's
 * forward line, the second across its beam; both read 0 when level, and a dip reads near 400. "287 mark 15 mark 98".
 */
export function navBearing(S, from, to, facing = S.pelion.facing || 0) {
  const a = PX(from), b = PX(to), dx = b.x - a.x, dy = b.y - a.y, dz = zOf(S, to) - zOf(S, from);
  const abs = (Math.atan2(dx, -dy) * 200) / Math.PI, rel = ((abs - sideHeading(facing)) % 400 + 400) % 400;
  const flat = Math.hypot(dx, dy), t = (rel * Math.PI) / 200, fwd = flat * Math.cos(t), stb = flat * Math.sin(t);
  const bearing = Math.round(rel) % 400, mark1 = ang(dz, Math.abs(fwd) || 1e-9), mark2 = ang(dz, Math.abs(stb) || 1e-9);
  return { bearing, mark1, mark2, text: `${String(bearing).padStart(3, "0")} mark ${mark1} mark ${mark2}` };
}
/**
 * Where a hex is: x, y, z in light-years from the center of the Corvan Sector (the middle of the map: x east, y galactic
 * north, z above the sector's plane), and how far that is from Sector 001 (Sol), a little under 200 light-years away.
 */
export function position(S, hex) {
  const p = PX(hex), h = hashString("origin:" + S.seed);
  const x = (p.x * HEX_LY) / Math.sqrt(3), y = -(p.y * HEX_LY) / Math.sqrt(3), z = zOf(S, hex) * HEX_LY;
  const sol = { x: -(140 + (h % 40)), y: 120 + ((h >> 8) % 40), z: -(((h >> 16) % 21) - 10) };   // Sol, from the sector's center
  const f = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(1);
  const fromSol = Math.hypot(x - sol.x, y - sol.y, z - sol.z);
  return { x, y, z, fromSol, text: `${f(x)}, ${f(y)}, ${f(z)} ly from the sector's center · ${Math.round(fromSol)} ly from Sector 001 (Sol)` };
}
function hazard(S, p) {
  if (rand(S) < 0.5 && p.unit === "pelion") { const id = p.officer; S.crew[id].inj = Math.min(3, S.crew[id].inj + 1); return `${officer(id).short} is hurt (${S.crew[id].inj}/3).`; }
  if (p.unit !== "pelion") { const u = S.support[p.unit]; u.hull++; if (u.hull >= SUPPORT[u.type].hull) { delete S.support[p.unit]; return `the ${u.name} is lost with all hands.`; } return `the ${u.name} takes damage.`; }
  const k = pick(S, ["engines", "sensors", "weapons"]); S.pelion.sys[k] = Math.min(3, S.pelion.sys[k] + 1); return `the Pelion's ${k} are damaged.`;
}
function earnRecord(S) {
  const left = RECORDS.filter((r) => !r.story && !S.records.includes(r.id));
  S.science += 10;
  if (!left.length) return null;
  const rec = pick(S, left); S.records.push(rec.id); return rec;
}
function join(S, s) { s.kind = "member"; s.harm = 0; S.joined++; S.commendations += 2; S.seenSys[s.id] = true; log(S, `${s.name} joins the Federation: +2 commendations.`, "victory"); }

// ---------- orders ----------
export const orderHere = (S, hex, where) => S.orders.some((o) => o.at === hex && (!where || o.where === where));
function missionStep(S, p) {
  const o = S.orders.find((x) => x.id === p.order); if (!o) return "";
  if (!p.roll.success) {
    if (p.roll.margin <= -4 && o.twist && o.twist.fx === "urgent") { o.deadline--; return say(S, `${o.title}: a setback. One turn less.`, "bad"); }
    return say(S, `${o.title}: no progress this turn.`);
  }
  const was = o.have;
  o.have = Math.min(o.segs, o.have + (p.roll.margin >= 5 ? 2 : 1));
  const st = storyOf(o);
  if (st) for (let i = was; i < o.have; i++) if (st.steps[i]) storyEvent(S, `${o.title}: ${st.steps[i][0].toLowerCase()}`, storyText(S, o, st.steps[i][1]));
  // Partway through, something can go wrong: once an order, a third of the time.
  if (st && o.have < o.segs && !o.complicated && complicationOf(st) && rand(S) < 0.33) {
    o.complicated = true;
    const ev = { kind: "complication", orderId: o.id };
    if (S.event) (S.eventQueue = S.eventQueue || []).push(ev); else S.event = ev;
  }
  if (o.have < o.segs) return say(S, `${o.title}: ${o.have}/${o.segs}${st && st.steps[o.have] ? `. Next: ${st.steps[o.have][0].toLowerCase()}` : ""}.`, "good");
  if (st && st.choice) {   // the work is done; the decision is the captain's
    const ev = { kind: "mission-choice", orderId: o.id };
    if (S.event) (S.eventQueue = S.eventQueue || []).push(ev); else S.event = ev;
    return say(S, `${o.title}: the work is done. ${st.choice.title}: the decision is yours.`, "order");
  }
  completeOrder(S, o, true);
  return say(S, `Orders complete: ${o.title}. Commended.`, "victory");
}
/** Every finished order, for the Orders tab: { title, result: "done" | "partly" | "failed", turn, how }. */
export function recordOrder(S, o, result, how) { (S.history = S.history || []).push({ title: o.title, result, turn: S.turn, how }); }
/**
 * The Mission Success report: a pop-up when every task of an order is done, with what was done, how long it took and
 * what it earned. `extra` adds rewards an order earns beyond the usual (the arc's library record).
 */
export function missionReport(S, o, result, how, rewards) {
  const st = storyOf(o);
  const tasks = o.arc ? null : [`Reach ${o.sys ? S.systems[o.sys].name : "the border"}`].concat(st ? st.steps.map((x) => x[0]).concat(st.choice ? [`Decide: ${storyText(S, o, st.choice.title).toLowerCase()}`] : []) : [`${o.segs} successes with ${o.skills.join(", ")}: ${o.have || o.segs} of ${o.segs}`]);
  const ev = { kind: "success", orderId: o.id, arc: !!o.arc, result, title: o.title, how, tasks, rewards, weeks: Math.max(1, S.turn - (o.issued || 1) + 1), turn: S.turn };
  if (S.event) (S.eventQueue = S.eventQueue || []).push(ev); else S.event = ev;
  log(S, `Mission ${result === "partly" ? "partly successful" : "success"}: ${o.title}. ${how} Rewards: ${rewards.join("; ")}.`, "victory", { story: true });
  return ev;
}
// ---------- the campaign: Watchers of the Void ----------
export const campaignOf = (S) => (S.campaign = S.campaign || { threads: [], beats: [], finale: false, over: null });
/** A campaign's definition by id: Watchers of the Void, or one of the series that follows it. */
export const defOf = (id) => (!id || id === "watchers" ? { id: "watchers", ...CAMPAIGN, finale: "The Makers' Gate" } : SERIES.find((c) => c.id === id));
/** The campaign under way (or the last one, once it's over). */
export const campaignDef = (S) => defOf(campaignOf(S).id);
const campId = (x) => (x && x.id) || "watchers";
/** The current act, from the beats reached so far. */
export const campaignAct = (S) => { const C = campaignOf(S), D = campaignDef(S), b = D.beats.filter((x) => C.beats.includes(x.at)); return b.length ? b[b.length - 1].act : "Prologue: The Silence at Corvan II"; };
/** The order types Starfleet has: the first fourteen, and each new campaign's, from the moment it begins. */
export const missionPool = (S) => MISSIONS.concat(SERIES_MISSIONS.filter((m) => (S.unlocked || []).includes(m.campaign)));
/** Is the campaign known yet? Only once Corvan II is over: before that, nothing about it may show. */
export const campaignOpen = (S) => campaignOf(S).beats.includes(0);
/** Starfleet's reason for an order, tied to the campaign: only once the campaign is known. */
/** Is this order part of the campaign (and is that known yet)? About half are; the rest are the frontier's ordinary work. */
export const orderTied = (S, o) => !!(o && (o.finale || o.campaign) && campaignOpen(S) && (o.campaignId || "watchers") === campId(campaignOf(S)));
/** Starfleet's reason for an order: the campaign's, if it's part of it and the campaign is known; otherwise its own. */
export const orderReason = (S, o) => { const st = storyOf(o); if (!st) return null; return orderTied(S, o) && st.why ? st.why : st.reason || null; };
/** What kind of mission an order is: Diplomatic, Rescue, Technology, Exploration, Security, Crew, or the Campaign. */
export const orderType = (o) => (storyOf(o) && storyOf(o).type) || null;
/** A beat of the campaign's story, once. */
function campaignBeat(S, at) {
  const C = campaignOf(S), D = campaignDef(S), b = D.beats.find((x) => x.at === at);
  if (!b || C.beats.includes(at)) return;
  C.beats.push(at);
  const text = at === 2 && D.id === "watchers" ? actTwo(S) : b.text;
  C.beatText = C.beatText || {}; C.beatText[at] = text;   // the story so far shows what was actually said
  storyEvent(S, `${D.title}, ${b.act}: ${b.title}`, text);
}
/**
 * Act II, House Kor'vath: how the Pelion learns who is behind the digging, from what it actually has. The two threads it
 * has found, and a source that depends on what happened on Corvan II: Orion prisoners in the brig, the cutting gear of the
 * diggers who died there, or, failing either, the diggers' payments, traced by Rrinn and Starfleet Intelligence.
 */
function actTwo(S) {
  const C = campaignOf(S), A = S.arc, [t1, t2] = C.threads;
  const threads = [t1, t2].filter(Boolean).map((t) => `${t.title}: ${t.text}`).join("\n") || "The Pelion's own orders have turned up nothing yet: the diggers have been too fast. The evidence comes from closer to home.";
  const source = A.diggers === "prisoners"
    ? "The three Orion diggers taken on Corvan II are still in the Pelion's brig. Reyes questions them again, this time with the threads in front of her, and one of them breaks. The digging crews aren't working for themselves: they're paid in dilithium, by the kilo, through an Orion broker, and every payment chit he has ever seen carries the same Klingon house seal. Rrinn identifies it from the Pelion's library: House Kor'vath."
    : A.diggers === "killed"
    ? "The Orion diggers who died on Corvan II left their cutting gear behind, and Grath has had it in pieces on his bench ever since. It isn't Orion work: it's Klingon military disruptor-cutters, with a house maker's mark ground half off the casings. Rrinn restores the mark from the scoring that's left: House Kor'vath."
    : "Rrinn has been listening to Orion traffic ever since Corvan II. The broker channel the digging crews use pays out in dilithium, and Starfleet Intelligence has the dilithium's assay: it comes from a single mine on the Klingon side of the border, held by House Kor'vath.";
  return `The threads come together in the Pelion's briefing room.\n\n${threads}\n\n${source}\n\nStarfleet Intelligence fills in the rest from its own files: Kor'vath is a Klingon house that has been losing ground on the High Council for a decade, and wants something that will change that. And Sevek has the answer to what they want the machines for. Every site in Starfleet's reports, and the ruin on Corvan II, was cut open at the caretaker's power core, the way an engineer takes out a part, not the way a thief takes a prize. Kor'vath isn't collecting the Makers' machines. It's taking them apart.`;
}
/** An order carried out turns up a thread of the campaign; enough threads lead to the Makers' Gate. */
function campaignThread(S, o) {
  const st = storyOf(o), C = campaignOf(S);
  if (o.finale) return null;
  if (o.arc) { campaignBeat(S, 0); return null; }
  // Before Corvan II is over, nothing is known of the Makers: no threads, no reasons. Once the Gate is decided, it's over.
  if (!st || !st.thread || C.over || !C.beats.includes(0) || !o.campaign || (o.campaignId || "watchers") !== campId(C)) return null;
  const D = campaignDef(S);
  C.threads.push({ title: o.title, text: storyText(S, o, st.thread), turn: S.turn });
  const n = C.threads.length;
  log(S, `${D.title}, thread ${n}: ${storyText(S, o, st.thread)}`, "discovery");
  for (const b of D.beats) if (b.at > 0 && n >= b.at) campaignBeat(S, b.at);
  if (n >= D.finaleAt) issueFinale(S);
  // Every thread costs the diggers time: their next site is two weeks further off.
  if (C.korvathNext) C.korvathNext += 2;
  return storyText(S, o, st.thread);
}
/** The end of the campaign: once Corvan II is done, whatever happened there, and late in the tour if need be. */
export function campaignTick(S) {
  const C = campaignOf(S), D = campaignDef(S);
  if (D.id === "watchers") {
    if (S.arc.stage === "done") campaignBeat(S, 0);
    korvathTick(S);
    // In a fifty-week tour, the finale comes in time for the end of it; in open command, the race decides.
    if (S.mode !== "open" && S.arc.stage === "done" && !C.finale && S.turn >= TOUR - 14) { campaignBeat(S, CAMPAIGN.finaleAt); issueFinale(S); }
  } else rivalTick(S, D);
  // When a campaign is over, Starfleet's attention turns: the next begins three weeks later (in a tour, only with
  // twelve weeks or more still to go; in open command, always).
  if (C.over && !C.endedAt) C.endedAt = S.turn;
  if (C.over && S.turn >= C.endedAt + 3 && (S.mode === "open" || S.turn <= TOUR - 12)) startNextCampaign(S);
}
/** The next campaign in the series, with its own order types added to Starfleet's book. */
function startNextCampaign(S) {
  const C = campaignOf(S), i = campId(C) === "watchers" ? 0 : SERIES.findIndex((x) => x.id === C.id) + 1, next = SERIES[i];
  if (!next) return;
  (S.campaignsDone = S.campaignsDone || []).push({ id: campId(C), title: campaignDef(S).title, over: C.over, threads: C.threads.length, rival: C.korvath || 0, threadList: C.threads, beatText: C.beatText, beats: C.beats });
  S.campaign = { id: next.id, threads: [], beats: [], finale: false, over: null, started: S.turn };
  (S.unlocked = S.unlocked || []).push(next.id);
  campaignBeat(S, 0);
  const types = SERIES_MISSIONS.filter((m) => m.campaign === next.id).map((m) => m.text);
  log(S, `A new campaign: ${next.title}. New kinds of orders from Starfleet: ${types.join("; ")}.`, "order");
}
/**
 * The rival of a campaign after the first: every few weeks it gains ground on its own (the cold reaches another place, the
 * Syndicate takes another convoy), and each thread the Pelion turns up sets it back two weeks. If it reaches the finale
 * first, the finale begins with it ahead.
 */
function rivalTick(S, D) {
  const C = campaignOf(S), R = D.rival;
  if (!C.beats.includes(0) || C.over || C.finale) return;
  C.korvath = C.korvath || 0;   // the rival's count (named for Watchers' House Kor'vath, whose race it was first)
  const every = R.every[S.difficulty] || 5;
  if (!C.korvathNext) { C.korvathNext = S.turn + every; return; }
  if (S.turn < C.korvathNext) return;
  C.korvath++; C.korvathNext = S.turn + every;
  const [site, scene] = R.sites[(C.korvath - 1) % R.sites.length];
  const near = Object.values(S.systems).filter((s) => ["colony", "member", "independent"].includes(s.kind) && distance(s.at, S.pelion.at) >= 3);
  const w = near.length ? pick(S, near) : null;
  let cost = "";
  if (R.fx === "dilithium") {
    if (w) harmWorld(S, w, 1, "its reactors' crystals went grey overnight, and the power failed");
    const lost = -addStore(S, "dilithium", -1);
    cost = `${w ? `${w.name} is one of the places it reached: its power plant's crystals are grey. ` : ""}${lost ? `And aboard the Pelion, Grath reports one of the warp core's crystals gone grey in its housing overnight: dilithium ${storesOf(S).dilithium}/10.` : ""}`;
  } else {
    const took = Math.min(S.supplies, 6); S.supplies -= took;
    if (w) harmWorld(S, w, 1, "its convoy never came");
    cost = `${w ? `${w.name} was waiting for that convoy, and it's rationing now. ` : ""}${took ? `Starfleet's supply allotment to the Pelion is cut to cover the loss: −${took} supplies.` : ""}`;
  }
  const n = C.threads.length, ahead = C.korvath > n;
  storyEvent(S, `${D.title}: ${R.head}`, `Rrinn brings the report to the captain's ready room herself. Starfleet Intelligence, priority one: ${R.name} ${R.verb} ${site}.\n\n${scene}\n\n${cost}\n\nThat's ${C.korvath} for ${R.name}, against the Pelion's ${n} thread${n === 1 ? "" : "s"}.${ahead ? ` ${R.Name} is ahead, and every week it stays ahead makes the end harder.` : ""}${C.korvath >= D.finaleAt ? "" : " Every campaign order the Pelion carries out sets it back two weeks."}`);
  if (C.korvath >= D.finaleAt) { for (const b of D.beats) if (b.at > 0) campaignBeat(S, b.at); issueFinale(S); }
}
// ---------- the race: House Kor'vath ----------
// Once the campaign has begun, the diggers take another Makers' site every few weeks: a world nearby is harmed and Klingon
// tension rises. Each thread the Pelion turns up sets them back. If they reach six sites first, they find the lines to the
// Gate themselves, and the finale begins with them ahead.
export const KORVATH_EVERY = { easy: 7, normal: 5, hard: 4 };
export const diggersName = (S) => (campaignOf(S).beats.includes(2) ? "House Kor'vath" : "the diggers");
function korvathTick(S) {
  const C = campaignOf(S);
  if (!C.beats.includes(0) || C.over || C.finale) return;
  C.korvath = C.korvath || 0;
  if (!C.korvathNext) { C.korvathNext = S.turn + (KORVATH_EVERY[S.difficulty] || 5); return; }
  if (S.turn < C.korvathNext) return;
  C.korvath++; C.korvathNext = S.turn + (KORVATH_EVERY[S.difficulty] || 5);
  const [site, scene] = KORVATH_SITES[(C.korvath - 1) % KORVATH_SITES.length];
  const near = Object.values(S.systems).filter((s) => ["colony", "member", "independent"].includes(s.kind) && distance(s.at, S.pelion.at) >= 3);
  const w = near.length ? pick(S, near) : null;
  if (w) harmWorld(S, w, 1, `its Makers' site was dug up, and the ground hasn't been still since`);
  S.tension = Math.min(10, S.tension + 1);
  const who = diggersName(S), ahead = C.korvath > C.threads.length;
  const Who = who[0].toUpperCase() + who.slice(1);
  storyEvent(S, `${CAMPAIGN.title}: another site falls`, `Rrinn brings the report to the captain's ready room herself, which she only does when it's bad. Starfleet Intelligence, priority one: another Makers' site, ${site}${w ? `, two days' warp from ${w.name}` : ""}.\n\n${scene}\n\n${w ? `${w.name} has felt it already: the ground there hasn't been still since the caretaker was taken. ` : ""}${C.beats.includes(2) ? "On the Klingon side of the border, House Kor'vath is celebrating; Klingon tension rises." : "Across the border, the Klingon Empire takes note of the Federation's troubles: Klingon tension rises."}\n\nThat's ${C.korvath} site${C.korvath === 1 ? "" : "s"} to ${who}, against the Pelion's ${C.threads.length} thread${C.threads.length === 1 ? "" : "s"}.${ahead ? ` ${Who} are ahead, and every week they stay ahead makes the end harder.` : ""}${C.korvath >= CAMPAIGN.finaleAt ? "" : " Every campaign order the Pelion carries out sets them back two weeks."}`);
  if (C.korvath >= CAMPAIGN.finaleAt) { campaignBeat(S, 2); campaignBeat(S, 4); campaignBeat(S, CAMPAIGN.finaleAt); issueFinale(S); }
}
/** The final order: the Makers' Gate, in empty space where every relay points. */
function issueFinale(S) {
  const C = campaignOf(S); if (C.finale) return;
  if (campId(C) !== "watchers") return seriesFinale(S);
  C.finale = true;
  const sb = S.systems[S.starbase];
  const hexes = Object.keys(S.hexes).filter((k) => !S.sysAt[k] && !inZone(k) && S.hexes[k].terrain === "space" && distance(k, sb.at) >= 5);
  const at = pick(S, hexes) || sb.at, st = STORIES["The Makers' Gate"];
  const o = { id: "o" + S.nextId++, issued: S.turn, title: "The Makers' Gate", at, sys: null, place: "the Makers' Gate", where: "", skills: ["Physical Sciences", "Diplomacy", "Engineering"], segs: 3, have: 0,
    urgent: true, finale: true, twist: null, story: "The Makers' Gate", strange: st.strange[0], key: st.keys[0],
    oppose: { name: "House Kor'vath's expedition", skill: "Ruthlessness", target: 12 + Math.max(0, (C.korvath || 0) - C.threads.length), why: "A Klingon battle cruiser and a house with everything to gain." + ((C.korvath || 0) > C.threads.length ? ` They're ahead: they took ${C.korvath} sites to your ${C.threads.length} threads (+${C.korvath - C.threads.length}).` : "") } };
  if ((C.korvath || 0) > C.threads.length) o.korvathAhead = true;
  o.text = storyText(S, o, st.brief);
  activateOrder(S, o, "issued: the finale of Watchers of the Void");
}
/** The finale of a campaign after the first: its own story, in empty space far from the starbase. */
function seriesFinale(S) {
  const C = campaignOf(S), D = campaignDef(S); C.finale = true;
  const sb = S.systems[S.starbase];
  const hexes = Object.keys(S.hexes).filter((k) => !S.sysAt[k] && !inZone(k) && S.hexes[k].terrain === "space" && distance(k, sb.at) >= 5).sort((a, b) => distance(b, sb.at) - distance(a, sb.at)).slice(0, 12);
  const at = pick(S, hexes) || sb.at, st = STORIES[D.finale], ahead = (C.korvath || 0) > C.threads.length;
  const o = { id: "o" + S.nextId++, issued: S.turn, title: D.finale, at, sys: null, place: D.finale.replace(/^The /, "the "), where: "", skills: D.finaleSkills, segs: 3, have: 0,
    urgent: true, finale: true, campaign: true, campaignId: D.id, twist: null, story: D.finale, strange: st.strange[0], key: st.keys[0],
    oppose: { ...D.finaleOppose, target: D.finaleOppose.target + Math.max(0, (C.korvath || 0) - C.threads.length), why: D.finaleOppose.why + (ahead ? ` ${D.rival.Name} got ahead: +${(C.korvath || 0) - C.threads.length}.` : "") } };
  o.text = storyText(S, o, st.brief);
  activateOrder(S, o, `issued: the finale of ${D.title}`);
}
const complicationOf = (st) => st.complication || COMPLICATIONS[st.type];
/** A complication's choices: press on (an opposed roll) or fall back (a week lost). */
export function complicationChoices(S, ev) {
  const o = S.orders.find((x) => x.id === ev.orderId), st = storyOf(o), c = st && complicationOf(st);
  if (!o || !c) return null;
  return { order: o, title: c.title, text: c.text, options: [
    { id: "press", name: c.press, blurb: `Opposed by ${c.oppose.name} (${c.oppose.skill} ${c.oppose.target}), with ${c.skills.join(", ")}. Win: the work leaps ahead (+1 success). Lose: ${c.costText}.` },
    { id: "back", name: "Fall back and regroup", blurb: `Safe, but it costs a week: the deadline comes a turn closer (turn ${o.deadline - 1}).` },
  ] };
}
export function chooseComplication(S, optId) {
  const ev = S.event; S.event = null;
  const o = ev && S.orders.find((x) => x.id === ev.orderId), st = storyOf(o), c = st && complicationOf(st);
  if (!o || !c) return { text: "" };
  if (optId === "back") { o.deadline--; log(S, `${o.title}: ${c.title.toLowerCase()}. The captain orders everyone back to regroup: safe, but a week lost (due by turn ${o.deadline} now).`, "bad"); storyEvent(S, `${o.title}: falling back`, "The order goes out on every channel: pull back, regroup, nobody takes the risk. The crew obey, and nobody argues, and nobody is hurt. It takes a week to get back to where they were, and everyone aboard can feel the deadline coming closer while they do."); return { text: "" }; }
  const b = bestOfficer(S, c.skills, {}, null) || { officer: "captain", skill: c.skills[0] };
  const t = target(S, b.officer, b.skill), r = check(S, t.total), op = opposed(S, r, c.oppose, officer(b.officer)?.short || "The captain");
  log(S, op.line, op.win ? "good" : "bad");
  storyEvent(S, `${o.title}: ${c.title.toLowerCase()}`, storyText(S, o, op.win ? c.win : c.lose));
  if (op.win) {
    o.have = Math.min(o.segs - 1, o.have + 1);
    if (st.steps[o.have - 1]) storyEvent(S, `${o.title}: ${st.steps[o.have - 1][0].toLowerCase()}`, storyText(S, o, st.steps[o.have - 1][1]));
    log(S, `${o.title}: ${c.title.toLowerCase()}, and the crew push through it: ${o.have}/${o.segs}.`, "good");
    return { text: "" };
  }
  const s = o.sys && S.systems[o.sys];
  if (c.cost === "hurt") { const v = CREW.filter((x) => available(S, x.id)); const p = v[Math.floor(rand(S) * v.length)]; if (p) S.crew[p.id].inj = Math.min(3, S.crew[p.id].inj + 1); log(S, `${o.title}: ${c.costText}${p ? ` (${p.short}, hurt ${S.crew[p.id].inj}/3)` : ""}.`, "bad"); }
  else if (c.cost === "accord" && s && ["independent", "member"].includes(s.kind)) { s.accord = Math.max(-5, s.accord - 1); log(S, `${o.title}: ${c.costText} (${s.name} now ${s.accord}).`, "bad"); }
  else if (c.cost === "sensors" || c.cost === "engines") { S.pelion.sys[c.cost] = Math.min(3, S.pelion.sys[c.cost] + 1); log(S, `${o.title}: ${c.costText}.`, "bad"); }
  else if (c.cost === "tension") { S.tension = Math.min(10, S.tension + 1); log(S, `${o.title}: ${c.costText}.`, "bad"); }
  else if (c.cost === "romulan") { log(S, `${o.title}: ${c.costText}.`, "bad"); romulanReprisal(S, o.title); }
  else if (c.cost === "command") markCommand(S, 1, `${o.title}: ${c.costText}.`);
  else log(S, `${o.title}: ${c.costText}.`, "bad");
  return { text: "" };
}
/** The opening scene of a tour: the orders for Corvan II, read in the ready room. The page shows it when a tour begins. */
export function openingScene(S) { storyEvent(S, "Orders: The Silence at Corvan II", "The message comes in on the command frequency at 0300 ship's time, priority one, and the captain reads it in the ready room in a dressing gown.\n\nThe Federation research outpost on Corvan II, eight archaeologists studying the ruins of a vanished city, has missed three check-ins. No distress call. No message of any kind. The planet has a native people, the Ketari, at a bronze-age level of development, so the outpost works under the Prime Directive, and any rescue will have to as well. An Orion raider was reported in the sector a week ago. Proceed at maximum warp.\n\nThe captain calls the senior staff together. It's Rrinn who goes still at the name. Her sister, Mirrah, flies the outpost's supply run; she was due there the same week the messages stopped. Rrinn asks, very quietly, to be on whatever team goes down. Then she goes back to her station, and doesn't say anything else for the rest of the shift, and nobody on the bridge pretends not to notice."); }
/** The scene when the Pelion first reaches an order's location. */
function arriveAt(S, o) {
  const st = storyOf(o);
  if (!st || o.arrived || o.arc || S.pelion.at !== o.at) return;
  o.arrived = true;
  storyEvent(S, `${o.title}: arrival`, storyText(S, o, st.arrive));
}
/** The decision at the end of an order: the captain's choice, and what it does. */
export function missionChoices(S, ev) {
  const o = S.orders.find((x) => x.id === ev.orderId), st = storyOf(o);
  if (!o || !st || !st.choice) return null;
  return { order: o, title: st.choice.title, text: storyText(S, o, st.choice.text),
    options: st.choice.options.filter((x) => !x.needs || (x.needs === "inverter" && S.pelion.refits.inverter)).map((x) => ({ id: x.id, name: storyText(S, o, x.name), blurb: storyText(S, o, x.blurb) })) };
}
const FX_TEXT = { commendations: (n) => `${n > 0 ? "+" : ""}${n} commendation${Math.abs(n) === 1 ? "" : "s"}`, science: (n) => `+${n} science`, supplies: (n) => `+${n} supplies`,
  accord: (n, w) => `accord with ${w} ${n > 0 ? "+" : "−"}${Math.abs(n)}`, command: () => "a Starfleet Command box marked", tension: (n) => `tension with the Klingon Empire ${n > 0 ? "up" : "down"} ${Math.abs(n)}`, romulan: () => "the Romulans answer: a bird-of-prey crosses the Neutral Zone to strike", refit: (n) => `${REFITS[n] ? REFITS[n].name : n} fitted to the Pelion`, delay: (n) => `every other order's deadline ${n} weeks closer`,
  heal: (n, w) => `${w}'s harm −${n}`, dilithium: (n) => `${n > 0 ? "+" : "−"}${Math.abs(n)} dilithium`, antimatter: (n) => `${n > 0 ? "+" : "−"}${Math.abs(n)} antimatter`, spares: (n) => `${n > 0 ? "+" : "−"}${Math.abs(n)} spare parts`, orion: () => "the Syndicate answers: a raider strikes a Federation world", inverter: (n) => `a cloak inverter fitted to the Pelion: +2 to sensor sweeps${n >= 2 ? ", and sweeps reach 5 light-years" : ""}`, hurt: () => "a crew member hurt", sensors: () => "the sensors damaged" };
export function chooseMission(S, orderId, optId) {
  const o = S.orders.find((x) => x.id === orderId), st = storyOf(o), opt = st && st.choice.options.find((x) => x.id === optId && (!x.needs || S.pelion.refits.inverter));
  if (!o || !opt) return { error: "No such choice." };
  S.event = null;
  const s = o.sys && S.systems[o.sys], fx = opt.fx || {}, w = s ? s.name : "the border", lines = [];
  for (const [k, n] of Object.entries(fx)) {
    if (k === "commendations") S.commendations += n;
    else if (k === "science") S.science += n;
    else if (k === "supplies") S.supplies = Math.max(0, S.supplies + n);
    else if (k === "dilithium" || k === "antimatter" || k === "spares") addStore(S, k, n);
    else if (k === "orion") orionReprisal(S, o.title);
    else if (k === "accord" && s && ["independent", "member"].includes(s.kind)) { s.accord = Math.max(-5, Math.min(5, (s.accord || 0) + n)); if (s.accord >= 5 && s.kind === "independent") join(S, s); }
    else if (k === "accord") continue;
    else if (k === "command") markCommand(S, n, `${o.title}: ${opt.how.toLowerCase()}`);
    else if (k === "tension") S.tension = Math.max(0, Math.min(10, S.tension + n));
    else if (k === "heal" && s) s.harm = Math.max(0, s.harm - n);
    else if (k === "hurt") { const c = CREW.filter((x) => available(S, x.id) && x.id !== "captain"); const v = c[Math.floor(rand(S) * c.length)]; if (v) S.crew[v.id].inj = Math.min(3, S.crew[v.id].inj + n); }
    else if (k === "sensors") S.pelion.sys.sensors = Math.min(3, S.pelion.sys.sensors + n);
    else if (k === "romulan") romulanReprisal(S, o.title);
    else if (k === "refit") S.pelion.refits[n] = true;
    else if (k === "delay") { for (const x of S.orders) if (x !== o) x.deadline -= n; }
    else if (k === "inverter") S.pelion.refits.inverter = Math.max(S.pelion.refits.inverter || 0, n);
    lines.push(FX_TEXT[k] ? FX_TEXT[k](n, w) : k);
  }
  const recId = opt.record === true ? "makers" : opt.record;
  if (recId && !S.records.includes(recId)) { S.records.push(recId); lines.push(`Library record: ${RECORDS.find((r) => r.id === recId)?.name || recId}`); }
  if (o.finale) campaignOf(S).over = opt.id;
  storyEvent(S, `${o.title}: ${storyText(S, o, opt.name).toLowerCase()}`, storyText(S, o, opt.text));
  log(S, `${o.title}: the captain's decision, ${storyText(S, o, opt.name).toLowerCase()} (${lines.join(", ")}).`, "order");
  completeOrder(S, o, true, storyText(S, o, opt.how));
  const rep = [S.event].concat(S.eventQueue || []).find((e) => e && e.kind === "success" && e.orderId === o.id);
  if (rep) { rep.choice = `${storyText(S, o, st.choice.title)}: ${storyText(S, o, opt.name)}`; rep.rewards.push(...lines.map((x) => `The decision: ${x}`)); }
  return { ok: true };
}
export function completeOrder(S, o, ok, how) {
  S.orders = S.orders.filter((x) => x !== o);
  recordOrder(S, o, ok ? "done" : "failed", how || (ok ? "Carried out." : `Not carried out by turn ${o.deadline}.`));
  if (ok) {
    S.done++; S.commendations += o.arc ? 4 : 2; S.supplies += 10; S.science += 8;
    // Three orders carried out in a row clear a box on the Starfleet Command track (if one is marked). Orders carried
    // out with Starfleet out of contact don't count toward the run, but don't break it either.
    const credit = !(o.twist && o.twist.fx === "nocredit");
    let streakLine = "Out of contact with Starfleet: this one doesn't count toward three in a row.";
    if (credit) {
      S.streak = (S.streak || 0) + 1;
      if (S.streak >= 3) {
        S.streak = 0;
        if (S.command > 0) { markCommand(S, -1, "three orders carried out in a row."); streakLine = "Three orders carried out in a row: a Starfleet Command box cleared."; }
        else streakLine = "Three orders carried out in a row (no box to clear).";
      } else streakLine = `${S.streak} of 3 orders carried out in a row: at 3, a Starfleet Command box is cleared.`;
    }
    const ev = missionReport(S, o, "done", how || "Carried out.", ["+10 supplies", "+8 science", `+${o.arc ? 4 : 2} commendations`, streakLine]);
    const th = campaignThread(S, o); if (th) ev.thread = th;
    const had = new Set(S.orders.map((x) => x.id));
    fillFromBacklog(S);
    const next = S.orders.filter((x) => !had.has(x.id)); if (next.length) ev.next = next.map((x) => x.title);
  } else {
    S.failed++; S.streak = 0; markCommand(S, 1, `orders not carried out in time: ${o.title}.`);
    const st = storyOf(o); if (st) storyEvent(S, `Too late: ${o.title}`, storyText(S, o, st.fail));
    if (o.finale) { campaignOf(S).over = "lost"; if (campId(campaignOf(S)) === "watchers") S.tension = Math.min(10, S.tension + 2); }
    const s = o.sys && S.systems[o.sys];
    if (s && /Evacuate|distress|medical/i.test(o.title) && ["colony", "member", "independent"].includes(s.kind)) harmWorld(S, s, 1, "help never came");
    fillFromBacklog(S);
  }
}
// ---------- the backlog ----------
// Starfleet keeps sending orders. With two under way (or urgent orders in hand), new ones wait in the backlog; the
// oldest moves up when an order is finished, or the captain can take one on at once. Their clocks start then.
export const BACKLOG_MAX = 4;
const busy = (S) => S.orders.filter((o) => !o.arc).length >= 2 || S.orders.some((o) => o.arc);
export function fillFromBacklog(S) {
  S.backlog = S.backlog || [];
  while (S.backlog.length && !busy(S)) activateOrder(S, S.backlog.shift(), "from the backlog");
}
/** Take a backlogged order on now. */
export function acceptOrder(S, id) {
  const i = (S.backlog || []).findIndex((o) => o.id === id);
  if (i < 0) return { error: "No such order in the backlog." };
  const [o] = S.backlog.splice(i, 1); activateOrder(S, o, "taken on from the backlog");
  return { ok: true, order: o };
}
function activateOrder(S, o, why) {
  const urgent = o.urgent, dist = Math.ceil(distance(S.pelion.at, o.at) / lyPerWeek(urgent ? 8 : CRUISE_WARP));
  o.issued = S.turn; o.deadline = S.turn + dist + o.segs + (urgent ? 1 : 4); delete o.backlog;
  S.orders.push(o);
  arriveAt(S, o);
  const twist = o.twist, at = o.at;
  if (twist && twist.fx === "klingon") { const k = closestOutpost(S, at); if (k) spawnEnemy(S, "kbc", k.at, { goal: "claim", target: at }); }
  if (twist && twist.fx === "orion") { const b = Object.values(S.enemies).find((e) => ENEMIES[e.type].base); spawnEnemy(S, "orion", b ? b.at : at, { goal: "raid", target: at, hostile: true }); }
  if (twist && twist.fx === "romulan") { const z = Object.keys(S.hexes).filter(inZone); spawnEnemy(S, "rbop", pick(S, z), { goal: "watch", target: at, cloaked: true, hostile: true }); }
  log(S, `${why ? `Orders ${why}` : "New orders from Starfleet"}: ${o.title}.${urgent ? " Urgent: maximum emergency warp." : ""} Work it with ${o.skills.join(", ")} (${o.segs} successes), due by turn ${o.deadline}.${twist ? ` Twist: ${twist.text}.` : ""} Something strange: ${o.strange}. Key character: ${o.key}.`, "order");
}
/** A mission's opposition, made worse by its twist: rivals for the prize, a watcher, people who aren't telling the truth. */
function orderOpposition(base, twist) {
  if (!base) return null;
  const o = { ...base };
  const add = { klingon: [" and Klingon agents with their own claim", 1], orion: [" and Orion pirates after the same prize", 1], romulan: [", watched by a cloaked Romulan ship", 1], hard: [", and people who aren't telling the truth", 2] }[twist && twist.fx];
  if (add) { o.name += add[0]; o.target += add[1]; o.why += ` Twist: ${twist.text}.`; }
  return o;
}
/**
 * A new order from Starfleet. Every story is told once a tour: the 3d6 roll picks the kind of order (the nearest kind that
 * still has an untold story and somewhere to happen), then one of its untold stories. When every story has been told,
 * Starfleet has nothing new to send.
 */
export function newOrder(S) {
  const roll = d6(S) + d6(S) + d6(S);
  const used = (S.storiesUsed = S.storiesUsed || []);
  const untold = (m) => Object.keys(STORIES).filter((k) => STORIES[k].mission === m.text && !used.includes(k));
  const from = S.pelion.at;
  const placeFor = (m) => {
    if (m.where.includes("border")) {
      // Border orders go to a listening post on the Zone if one's still standing.
      const posts = livePosts(S).filter((p) => distance(p.at, from) >= 3);
      const hexes = posts.length ? posts.map((p) => p.at) : Object.keys(S.hexes).filter((k) => nearZone(k) && distance(k, from) >= 3);
      return hexes.length ? { at: pick(S, hexes), sys: null } : null;
    }
    const cands = Object.values(S.systems).filter((s) => (m.where.includes(s.kind) || (s.kind === "member" && m.where.includes("independent")) || (s.kind === "orionBase" && m.where.includes("empty")))
      && !S.orders.concat(S.backlog || []).some((o) => o.sys === s.id) && distance(s.at, from) >= 2 && distance(s.at, from) <= 10 && s.id !== S.corvan);
    if (!cands.length) return null;
    const sys = pick(S, cands); S.seenSys[sys.id] = true; return { at: sys.at, sys };
  };
  let m = null, place = null, storyKey = null;
  const C0 = campaignOf(S), pool = missionPool(S).sort((a, b) => Math.abs(a.roll - roll) - Math.abs(b.roll - roll));
  // While a campaign after the first is under way, more than half of Starfleet's orders are its own.
  const mine = campId(C0) !== "watchers" && !C0.over && rand(S) < 0.6 ? pool.filter((x) => x.campaign === C0.id) : [];
  for (const x of mine.concat(pool)) {
    const left = untold(x); if (!left.length) continue;
    const p = placeFor(x); if (!p) continue;
    m = x; place = p; storyKey = pick(S, left); break;
  }
  if (!m) { if (!S.quietLogged) { S.quietLogged = true; log(S, "Starfleet Command has no new orders for the Pelion: every story this sector had to tell has been told. The sector is yours to keep.", "order"); } return null; }
  used.push(storyKey);
  const st = STORIES[storyKey], at = place.at, sys = place.sys;
  const twist = rand(S) < 0.6 ? pick(S, TWISTS) : null;
  // Travel time: at the maximum stable speed (warp 6), or, for urgent orders, at emergency warp 8, which Starfleet expects.
  const urgent = !!(twist && twist.fx === "urgent");
  const dist = Math.ceil(distance(from, at) / lyPerWeek(urgent ? 8 : CRUISE_WARP));
  const o = { id: "o" + S.nextId++, issued: S.turn, title: m.text + (sys ? ` at ${sys.name}` : postAt(S, at) ? ` at ${postAt(S, at).name}` : /Neutral Zone/.test(m.text) ? "" : " near the Neutral Zone") + `: ${st.name}`, at, sys: sys && sys.id, where: m.where.includes("border") ? "border" : "", skills: m.skills, segs: m.segs, have: 0,
    deadline: S.turn + dist + m.segs + (urgent ? 1 : 4), urgent, twist, strange: pick(S, st.strange || STRANGE), key: pick(S, st.keys || KEYS), oppose: orderOpposition(m.oppose, twist) };
  if (postAt(S, at)) o.place = postAt(S, at).name;
  o.story = storyKey; o.text = storyText(S, o, st.brief);
  // About half of all orders are part of the campaign (once it has begun); the rest are the frontier's ordinary work.
  const C = campaignOf(S);
  if (st.campaign) { o.campaignId = st.campaign; o.campaign = st.campaign === campId(C) && !C.over; }
  else { o.campaignId = "watchers"; o.campaign = campId(C) === "watchers" && !C.over && rand(S) < 0.5; }
  S.backlog = S.backlog || [];
  if (busy(S)) {
    o.backlog = true; o.received = S.turn; S.backlog.push(o);
    log(S, `New orders from Starfleet, to the backlog: ${o.title}${urgent ? " (urgent)" : ""}. They wait until an order under way is finished, or until you take them on (the Orders tab).`, "order");
    return o;
  }
  activateOrder(S, o);
  return o;
}
/** The Syndicate answers an insult: an Orion raider strikes a Federation world, from its base or from the sector's edge. */
export function orionReprisal(S, why) {
  const targets = Object.values(S.systems).filter((s) => s.kind === "colony" || s.kind === "member");
  if (!targets.length) return;
  const tgt = pick(S, targets), b = Object.values(S.enemies).find((e) => ENEMIES[e.type].base);
  const edge = Object.keys(S.hexes).filter((k) => !inZone(k)).sort((a, c) => distance(c, tgt.at) - distance(a, tgt.at))[0];
  spawnEnemy(S, "orion", b ? b.at : edge, { goal: "raid", target: tgt.at, hostile: true });
  log(S, `Intelligence: after ${why}, an Orion raider has left ${b ? "the pirate base" : "the sector's edge"}, bound for ${tgt.name}. The Syndicate wants it known that it remembers.`, "war");
}
export const closestOutpost = (S, at) => Object.values(S.systems).filter((s) => s.kind === "klingon").sort((a, b) => distance(a.at, at) - distance(b.at, at))[0];
export function harmWorld(S, s, n, why) {
  if (!["colony", "member", "independent"].includes(s.kind)) return;
  s.harm = Math.min(3, s.harm + n);
  log(S, `${s.name} (${s.kind === "colony" ? "Federation colony" : s.kind === "member" ? "Federation member" : "independent world"}) is harmed: ${why}. Harm ${s.harm}/3${s.harm >= 3 ? "" : s.kind === "colony" ? " (at 3 it must be evacuated)" : s.kind === "member" ? " (at 3 it leaves the Federation)" : " (at 3 it loses faith in the Federation)"}.`, "bad");
  if (s.harm < 3) return;
  if (s.kind === "colony") { s.kind = "lost"; S.lostColonies++; markCommand(S, 2, `the colony on ${s.name} had to be evacuated.`); }
  else if (s.kind === "member") { s.kind = "independent"; s.accord = 1; s.harm = 1; S.joined--; markCommand(S, 1, `${s.name} leaves the Federation, which couldn't protect it.`); }
  else { s.accord = Math.max(-5, s.accord - 1); s.harm = 2; }
  if (!Object.values(S.systems).some((x) => x.kind === "colony") && !S.over) S.over = { win: false, why: "Every Federation colony in the sector has been lost. Starfleet withdraws from the Corvan Sector." };
}
export function sendHome(S, e, turns = 3) {
  e.goal = "home"; e.target = e.home; e.stay = turns; e.hostile = e.power !== "klingon" ? e.hostile : false;
}

// ---------- support ships ----------
export function requisition(S, type) {
  const T = SUPPORT[type];
  if (!S.pelion.docked) return { error: "Requisitions are made at Starbase 23." };
  if (Object.keys(S.support).length >= 3) return { error: "Starfleet can spare three ships at most." };
  if (S.supplies < T.cost) return { error: `Needs ${T.cost} supplies.` };
  S.supplies -= T.cost;
  const used = Object.values(S.support).map((u) => u.name);
  const name = SUPPORT_NAMES.find((n) => !used.includes(n)) || "USS " + S.nextId;
  const id = "u" + S.nextId++;
  S.support[id] = { id, type, name, at: S.systems[S.starbase].at, mp: 0, acted: true, shields: 0, hull: 0 };
  log(S, `The ${name} (${T.name}) joins the Pelion's command. It's ready next turn.`, "good");
  updateVisibility(S);
  return { ok: true, id };
}
export function fitRefit(S, id) {
  const R = REFITS[id];
  if (!S.pelion.docked) return { error: "Refits are fitted at Starbase 23." };
  if (S.pelion.refits[id]) return { error: "Already fitted." };
  if (S.science < R.cost) return { error: `Needs ${R.cost} science.` };
  S.science -= R.cost; S.pelion.refits[id] = true;
  log(S, `Refit at Starbase 23: ${R.name}.`, "good");
  updateVisibility(S);
  return { ok: true };
}
export function setStation(S, station, id) { if (!available(S, id)) return { error: "In sickbay." }; S.stations[station] = id; return { ok: true }; }

// ---------- scoring and the end ----------
export function score(S) {
  const sys = Object.values(S.systems);
  const parts = [
    ["Worlds joined the Federation", S.joined * 10],
    ["Library records", S.records.length * 6],
    ["Orders carried out", S.done * 4],
    ["Commendations", S.commendations],
    ["Colonies safe", sys.filter((s) => s.kind === "colony").length * 5],
    ["Systems surveyed", sys.filter((s) => s.surveyed && !KINDS[s.kind]?.known && s.id !== S.corvan).length],
    ["Starfleet Command track", -S.command * 4],
    ["Worlds lost to the Klingon Empire", -S.lostWorlds * 8],
    ["Colonies lost", -S.lostColonies * 10],
    ["Listening posts lost", -Object.values(postsOf(S)).filter((p) => p.lost).length * 5],
  ];
  const C = campaignOf(S), all = (S.campaignsDone || []).concat([{ id: campId(C), over: C.over, threads: C.threads.length }]);
  for (const c of all) {
    const D = defOf(c.id); if (c.id !== "watchers" && !c.threads && !c.over) continue;
    parts.push([`${D.title}: threads found`, Math.min(D.finaleAt, c.threads) * 2]);
    parts.push([`${D.title}: ${c.id === "watchers" ? "the Gate" : D.finale.replace(/^The /, "the ")}`, c.over && c.over !== "lost" ? 25 : c.over === "lost" ? -10 : 0]);
  }
  return { parts, total: parts.reduce((t, p) => t + p[1], 0) };
}
export function rating(total) {
  // Every officer acts each turn, so a good tour scores high: these thresholds assume it.
  return total >= 290 ? "Legendary: the Corvan Sector will tell stories about the Pelion" : total >= 210 ? "Commended: a fine tour, and a ship Starfleet is proud of"
    : total >= 140 ? "Satisfactory: the sector is no worse than you found it" : "Recalled: Starfleet Command has questions";
}
export function checkEnd(S) {
  if (S.over) return;
  if (S.pelion.hull >= PELION.hull) S.over = { win: false, why: "The Pelion's hull gave way. The crew abandoned ship, and Starfleet lost a Heavy Cruiser." };
  else if (S.mode !== "open" && S.turn > TOUR) S.over = { win: true, why: "The Pelion's tour of the Corvan Sector is over." };
}
/** At the end of a tour, keep command: the game goes on with no end, as open command. */
export function keepCommand(S) {
  if (!S.over || !S.over.win || S.mode === "open") return { error: "Only at the end of a tour." };
  S.mode = "open"; S.over = null;
  log(S, "Starfleet Command extends the Pelion's assignment to the Corvan Sector with no end date: open command. The tour's score stands; the sector goes on.", "order");
  return { ok: true };
}
/** In open command, the captain chooses when to hand the Pelion over. */
export function retire(S) {
  if (S.over) return { error: "Already over." };
  S.over = { win: true, why: `After ${S.turn - 1} weeks in the Corvan Sector, the captain hands the Pelion over at Starbase 23.` };
  return { ok: true };
}

// ---------- hooks set by the other modules (they import game.js, so they register here) ----------
let startBattleHook = () => {}, arcActionsHook = () => [], arcStepHook = () => "", arcSweepHook = () => {}, arcArriveHook = () => {};
export function registerHooks(h) { if (h.startBattle) startBattleHook = h.startBattle; if (h.arcActions) arcActionsHook = h.arcActions; if (h.arcStep) arcStepHook = h.arcStep; if (h.arcSweep) arcSweepHook = h.arcSweep; if (h.arcArrive) arcArriveHook = h.arcArrive; }
