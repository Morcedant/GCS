// The rules: one JSON state, changed only by these functions. Every roll is the tabletop game's: 3d6 at or under a
// skill target, 3 or 4 always succeeds, 17 or 18 always fails; the margin is how far under.
import { makeRng, neighbors, distance, within, hashString } from "./hex.js";
import { TOUR, STARDATE0, CREW, CAPTAIN, PELION, SUPPORT, SUPPORT_NAMES, ENEMIES, KINDS, ACTIONS, MISSIONS, STRANGE, KEYS, TWISTS, REFITS, RECORDS } from "./data.js";
import { makeSector, inZone, nearZone } from "./sector.js";

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
export function newGame({ seed, difficulty = "normal", captain = "" } = {}) {
  seed = seed || String(Math.floor(Math.random() * 1e9));
  const sec = makeSector(seed);
  const sb = sec.systems[sec.starbase];
  const S = {
    v: 1, seed: String(seed), difficulty, captain: captain.trim() || "Captain", turn: 1, rng: hashString("dice:" + seed),
    hexes: sec.hexes, systems: sec.systems, sysAt: sec.sysAt, starbase: sec.starbase, corvan: sec.corvan,
    pelion: { at: sb.at, mp: PELION.speed, acted: false, shields: 0, hull: 0, sys: { weapons: 0, engines: 0, sensors: 0 }, torps: PELION.torps, refits: {}, zoneMarked: false, docked: true },
    stations: { helm: "shvari", tactical: "reyes", science: "sevek", engineering: "grath", comms: "rrinn" },
    crew: Object.fromEntries(CREW.map((c) => [c.id, { inj: 0, duty: 2, xp: 0, plus: {} }])),
    support: {}, enemies: {}, nextId: 1,
    supplies: 20, science: 0, command: 0, tension: 2, commendations: 0,
    records: [], orders: [], done: 0, failed: 0, lostColonies: 0, lostWorlds: 0, joined: 0, arc: { stage: "travel", countdown: 0, clock: 0, clues: {}, seen: false },
    visible: {}, seenSys: {}, log: [], over: null, pending: null, battle: null, event: null, tutorial: { on: true },
  };
  for (const s of Object.values(S.systems)) if (KINDS[s.kind].known) S.seenSys[s.id] = true;
  S.seenSys[S.corvan] = true; S.systems[S.corvan].surveyed = true;
  // The first orders: The Silence at Corvan II. An Orion raider is already in orbit there.
  const cv = S.systems[S.corvan];
  S.orders.push({ id: "o1", arc: true, title: "The Silence at Corvan II", at: cv.at, sys: cv.id, skills: [], segs: 0, have: 0, deadline: 12,
    text: "The Federation research outpost on Corvan II, eight archaeologists studying the ruins of an extinct civilization, has missed three check-ins. Corvan II has a native people, the Ketari, at a bronze-age level: the outpost works under the Prime Directive. An Orion raider was reported in the sector last week.",
    twist: null, strange: "An ancient machine that still works", key: "Rrinn's sister, on the outpost's supply run" });
  spawnEnemy(S, "orion", cv.at, { goal: "arc", hostile: true, home: cv.at });
  const ob = Object.values(S.systems).find((s) => s.kind === "orionBase");
  spawnEnemy(S, "orionBase", ob.at, { goal: "base", hostile: true, found: false });
  log(S, "Orders from Starfleet Command: the research outpost on Corvan II has gone silent. Investigate.", "order");
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
  S.log.push({ t: S.turn, text, kind, ...(extra || {}) });
  let n = S.log.length - 300;
  for (let i = 0; i < S.log.length && n > 0; ) { if (S.log[i].kind !== "discovery") { S.log.splice(i, 1); n--; } else i++; }
}
/** A story scene: shown as a dialog, and written in full into the log. */
export function storyEvent(S, title, text, extra = null) {
  const ev = { kind: "story", title, text };
  if (S.event) (S.eventQueue = S.eventQueue || []).push(ev); else S.event = ev;   // a second scene waits for the first
  log(S, `${title}: ${text}`, "discovery", extra);
}
export const available = (S, id) => S.crew[id].inj < 3;
export function skillOf(S, id, skill) {
  if (id === "captain") return CAPTAIN.skills[skill] || 10;
  const base = officer(id).skills[skill];
  return base ? base + (S.crew[id].plus[skill] || 0) : 0;
}
/** The best available officer for one of these skills (highest target), and the skill. */
export function bestOfficer(S, skills, ctx = {}, ids = null) {
  let best = null;
  for (const c of CREW) {
    if (!available(S, c.id) || (ids && !ids.includes(c.id))) continue;
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
  if ((ctx.action === "survey" || ctx.action === "investigate") && hasRecord(S, "science1")) parts.push(["Graviton lensing", 1]);
  if (ctx.action === "envoy" && hasRecord(S, "envoy1")) parts.push(["A dead language", 1]);
  if (ctx.action === "sweep" && hasRecord(S, "sweep2")) parts.push(["Cloaked wake", 2]);
  if (ctx.action === "sweep") parts.push(["Hunting the hidden", -2]);
  if (ctx.order && ctx.order.twist && ctx.order.twist.fx === "hard") parts.push([ctx.order.twist.text, -2]);
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
export function speedOf(S) {
  const e = S.pelion.sys.engines;
  if (e >= 3) return 1;
  return PELION.speed + (S.pelion.refits.warp ? 1 : 0) + (hasRecord(S, "speed1") ? 1 : 0) - e;
}
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
export function moveTo(S, unit, hex) {
  if (S.over || S.battle || S.event) return { error: "Finish what's in front of you first." };
  const U = unit === "pelion" ? S.pelion : S.support[unit];
  const r = reachable(S, unit);
  if (r[hex] === undefined) return { error: "Too far for this turn." };
  const p = findPath(S, U.at, hex, unit === "pelion" ? "pelion" : "support");
  U.mp -= r[hex]; U.at = hex;
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
    const there = Object.values(S.enemies).filter((e) => e.at === hex && !e.cloaked && !ENEMIES[e.type].base).map((e) => (/^[AEIOU]/.test(ENEMIES[e.type].name) ? "an " : "a ") + ENEMIES[e.type].name);
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
  if (s && s.id === S.corvan && S.arc.stage === "travel") S.event = { kind: "arc-arrive" };
}
function dock(S) {
  const P = S.pelion;
  P.docked = true;
  const fixed = P.shields + P.hull + P.sys.weapons + P.sys.engines + P.sys.sensors > 0 || P.torps < PELION.torps;
  P.shields = 0; P.hull = 0; P.sys = { weapons: 0, engines: 0, sensors: 0 }; P.torps = PELION.torps;
  for (const id in S.crew) { const c = S.crew[id]; c.inj = 0; c.duty = 2; }
  log(S, `Docked at Starbase 23: ${fixed ? "repaired, rearmed and " : ""}crew rested; Duty points restored.`, "good");
}
export function sightRange(S) { return 2 + (S.pelion.refits.sensors ? 1 : 0); }
export function updateVisibility(S) {
  const v = {};
  const see = (hex, n) => { for (const k of within(hex, n)) if (S.hexes[k]) v[k] = true; };
  see(S.pelion.at, sightRange(S));
  for (const u of Object.values(S.support)) see(u.at, 2);
  for (const s of Object.values(S.systems)) if (["starbase", "colony", "member"].includes(s.kind)) see(s.at, 1);
  S.visible = v;
  for (const e of Object.values(S.enemies)) if (v[e.at] && !e.cloaked && !ENEMIES[e.type].base) e.seen = true;
}
export const enemiesAt = (S, hex) => Object.values(S.enemies).filter((e) => e.at === hex);
/** Enemy ships the player can see. */
export const visibleEnemies = (S) => Object.values(S.enemies).filter((e) => (S.visible[e.at] && !e.cloaked && !ENEMIES[e.type].base) || e.revealed || (ENEMIES[e.type].base && e.found));

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
  if (n > 0) log(S, `Starfleet Command marks ${n === 1 ? "a box" : n + " boxes"}: ${why}`, "bad");
  else log(S, `Starfleet Command clears ${-n === 1 ? "a box" : -n + " boxes"}: ${why}`, "good");
  if (S.command >= 5 && !S.over) S.over = { win: false, why: "Starfleet Command has relieved you of command. The Pelion returns to Starbase 23 under another captain." };
}

// ---------- actions at a system ----------
/** What a unit can do where it is. Each entry: { id, name, skills, blurb, sys?, order?, why? (why it can't) }. */
export function actionsFor(S, unit = "pelion") {
  const U = unit === "pelion" ? S.pelion : S.support[unit];
  const s = sysAt(S, U.at), out = [];
  const add = (id, extra = {}) => out.push({ id, ...ACTIONS[id], ...extra });
  const sci = unit !== "pelion";
  if (s && !s.surveyed && s.kind !== "klingon") add("survey", { sys: s.id });
  if (s && s.surveyed && (s.kind === "anomaly" || s.kind === "ruins") && !s.recorded) add("investigate", { sys: s.id, blurb: `Discovery clock ${s.clock}/${s.need}. Fill it for a library record. Fail by 3 or more and it bites back.`, extra: [["The unknown", -3]] });
  if (sci) return out.map((a) => ({ ...a, why: U.acted ? "Already acted this turn." : null }));
  if (s && s.kind === "independent") add("envoy", { sys: s.id, blurb: `Accord ${signedAccord(s.accord)}. At +5 they petition to join the Federation; at −5 they join the Klingon Empire. The closer they come, the harder the last steps.`, extra: [["Their reluctance", -(1 + Math.max(0, s.accord))]] });
  if (s && s.kind === "prewarp" && s.surveyed && !s.observed) add("observe", { sys: s.id, extra: [["Unseen", -2]] });
  if (s && s.harm > 0 && ["colony", "member", "independent"].includes(s.kind)) add("aid", { sys: s.id, blurb: `Harm ${s.harm}/3. Clear a box.` });
  const P = S.pelion;
  if (P.shields || P.sys.weapons || P.sys.engines || P.sys.sensors || P.hull) add("repair");
  add("sweep");
  for (const e of enemiesAt(S, U.at)) if ((!e.cloaked || e.revealed) && !ENEMIES[e.type].base) {
    if (ENEMIES[e.type].will) add("hail", { enemy: e.id, name: `Hail the ${ENEMIES[e.type].name}` });
    out.push({ id: "engage", enemy: e.id, name: `Engage the ${ENEMIES[e.type].name}`, skills: [], blurb: engageNote(S, e) });
  }
  const base = Object.values(S.enemies).find((e) => ENEMIES[e.type].base && e.at === U.at && e.found);
  if (base) out.push({ id: "engage", enemy: base.id, name: "Attack the Orion base", skills: [], blurb: "Its guns and shields against yours. Destroy it and the raids stop." });
  for (const o of S.orders) if (!o.arc && o.at === U.at) add("mission", { order: o.id, name: `Orders: ${o.title}`, skills: o.skills, blurb: `${o.have}/${o.segs} done.`, extra: [["In the field", -2]] });
  if (s && s.id === S.corvan) out.push(...arcActionsHook(S));
  return out.map((a) => ({ ...a, why: P.acted && !a.free ? "The Pelion has already acted this turn." : null }));
}
const signedAccord = (a) => (a > 0 ? "+" : a < 0 ? "−" : "") + Math.abs(a);
function engageNote(S, e) {
  const E = ENEMIES[e.type];
  if (e.power === "klingon" && !e.hostile) return "They haven't fired on anyone. Attacking first is a diplomatic incident: Starfleet Command marks a box, and tension with the Empire rises.";
  return `${E.name}: shields ${E.shields - e.shields}/${E.shields}, hull ${E.hull - e.hull}/${E.hull}.`;
}

/** Roll an action. Returns a pending result for the player to accept, or to reroll with a Duty point. */
export function attempt(S, unit, actionId, opts = {}) {
  if (S.over || S.battle || S.event || S.pending) return { error: "Finish what's in front of you first." };
  const list = unit === "pelion" ? actionsFor(S) : actionsFor(S, unit);
  const a = list.find((x) => x.id === actionId && (opts.order ? x.order === opts.order : true) && (opts.enemy ? x.enemy === opts.enemy : true) && (opts.arc ? x.arc === opts.arc : true));
  if (!a) return { error: "Not possible here." };
  if (a.why) return { error: a.why };
  if (actionId === "engage") { startBattleHook(S, a.enemy, "pelion"); S.pelion.acted = true; return { ok: true, battle: true }; }
  const order = a.order && S.orders.find((o) => o.id === a.order);
  const ctx = { action: actionId === "mission" ? "mission" : actionId, order, listen: actionId === "hail" || actionId === "sweep" };
  let who, skill, t;
  if (unit !== "pelion") { who = unit; skill = a.skills[0]; t = { parts: [["Science vessel's crew", SUPPORT.science.skill], ["Its sensors", 2]], total: SUPPORT.science.skill + 2 }; }
  else {
    // a.who: only these officers can do it (the away team on the surface, or those still aboard).
    who = opts.officer; skill = opts.skill;
    if (!who || !skill || !available(S, who) || !skillOf(S, who, skill) || !a.skills.includes(skill) || (a.who && !a.who.includes(who))) {
      const b = bestOfficer(S, a.skills, ctx, a.who); if (!b) return { error: a.who ? "No one there has the training." : "Nobody fit for duty has the training." }; who = b.officer; skill = b.skill;
    }
    t = target(S, who, skill, { ...ctx, extra: a.extra || [] });
    // A second officer trained in the skill helps: +1.
    const helper = CREW.find((c) => c.id !== who && available(S, c.id) && (!a.who || a.who.includes(c.id)) && skillOf(S, c.id, skill) >= 13);
    if (helper && opts.assist !== false) { t.parts.push([`${helper.short} assists`, 1]); t.total += 1; }
  }
  if (actionId === "hail") {
    const e = S.enemies[a.enemy]; const will = ENEMIES[e.type].will + (e.power === "romulan" ? 2 : 0);
    t.parts.push([`Their captain's Will ${will}`, 10 - will]); t.total += 10 - will;
  }
  const roll = check(S, t.total);
  S.pending = { unit, action: actionId, arc: a.arc, order: a.order, enemy: a.enemy, sys: a.sys, officer: who, skill, target: t, roll, rerolled: false, name: a.name };
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
  U.acted = true;
  const pre = S.log.length;
  const out = applyAction(S, p);
  if (p.action === "sweep" && p.unit === "pelion") arcSweepHook(S);   // a sweep over Corvan II wakes the ruins
  const where = sysAt(S, U.at)?.name || "open space";
  const who = p.unit === "pelion" ? (p.officer === "captain" ? S.captain : officer(p.officer).name) : S.support[p.unit]?.name || "The science vessel";
  const r = p.roll, head = `${who} (${p.skill || "crew"}) · ${p.name} at ${where}: rolled ${r.dice.join("+")} = ${r.total} against ${r.target}, ${r.success ? `success by ${r.margin}` : `failed by ${-r.margin}`}${p.rerolled ? " after spending a Duty point to reroll" : ""}.`;
  if (S.log.length > pre) S.log[pre].text = head + " " + S.log[pre].text; else log(S, head);
  if (p.unit === "pelion" && p.roll.success && p.officer !== "captain") gainXp(S, p.officer, p.skill);
  updateVisibility(S);
  checkEnd(S);
  return { ok: true, done: true, result: { ...p, text: out } };
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
      if (r.margin <= -3) { markCommand(S, 1, `${s.name}'s people saw the Pelion's away team. The Prime Directive.`); return say(S, `Contact at ${s.name}!`, "bad"); }
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
      for (const k of ["engines", "weapons", "sensors"]) while (n > 0 && P.sys[k] > 0) { P.sys[k]--; n--; fixed.push(k); }
      while (n > 0 && P.shields > 0) { P.shields--; n--; fixed.push("shields"); }
      if (n > 0 && P.hull > 0) { P.hull--; fixed.push("hull"); }
      return say(S, `Repairs: ${fixed.join(", ") || "nothing needed"}.`, "good");
    }
    case "sweep": {
      if (!r.success) return say(S, `The sweep finds nothing${r.margin <= -2 ? "" : " (or nothing that wants to be found)"}.`);
      const found = [];
      for (const e of Object.values(S.enemies)) {
        if (distance(e.at, S.pelion.at) > 3) continue;
        if (ENEMIES[e.type].base) { if (e.at === S.pelion.at && !e.found) { e.found = true; const sy = sysAt(S, e.at); if (sy) sy.surveyed = true; found.push("an Orion pirate base, hidden in " + (sy ? sy.name : "the dust")); } continue; }
        if (e.cloaked && !e.revealed) { e.revealed = true; found.push(`a cloaked ${ENEMIES[e.type].name}`); }
      }
      // A sweep also hears where the raiders come from.
      const base = Object.values(S.enemies).find((e) => ENEMIES[e.type].base && !e.found);
      if (!found.length && base) { const d = distance(base.at, S.pelion.at); return say(S, `Nothing nearby, but ${name} hears Orion traffic ${d <= 4 ? "very close: within " + d + " hexes" : d <= 7 ? "to the " + bearing(S.pelion.at, base.at) : "far off"}.`, "discovery"); }
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
const bearing = (a, b) => { const [aq, ar] = a.split(",").map(Number), [bq, br] = b.split(",").map(Number); const x = (bq - aq) + (br - ar) / 2, y = br - ar; return (y < -1 ? "north" : y > 1 ? "south" : "") + (x > 1 ? "east" : x < -1 ? "west" : "") || "nearby"; };
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
function join(S, s) { s.kind = "member"; s.harm = 0; S.joined++; S.commendations += 2; S.seenSys[s.id] = true; markCommand(S, -1, `${s.name} joins the Federation.`); }

// ---------- orders ----------
export const orderHere = (S, hex, where) => S.orders.some((o) => o.at === hex && (!where || o.where === where));
function missionStep(S, p) {
  const o = S.orders.find((x) => x.id === p.order); if (!o) return "";
  if (!p.roll.success) {
    if (p.roll.margin <= -4 && o.twist && o.twist.fx === "urgent") { o.deadline--; return say(S, `${o.title}: a setback. One turn less.`, "bad"); }
    return say(S, `${o.title}: no progress this turn.`);
  }
  o.have = Math.min(o.segs, o.have + (p.roll.margin >= 5 ? 2 : 1));
  if (o.have < o.segs) return say(S, `${o.title}: ${o.have}/${o.segs}.`, "good");
  completeOrder(S, o, true);
  return say(S, `Orders complete: ${o.title}. Commended.`, "victory");
}
export function completeOrder(S, o, ok) {
  S.orders = S.orders.filter((x) => x !== o);
  if (ok) {
    S.done++; S.commendations += o.arc ? 4 : 2; S.supplies += 10; S.science += 8;
    if (!(o.twist && o.twist.fx === "nocredit")) markCommand(S, -1, `orders carried out: ${o.title}.`);
  } else {
    S.failed++; markCommand(S, 1, `orders not carried out in time: ${o.title}.`);
    const s = o.sys && S.systems[o.sys];
    if (s && /Evacuate|distress|medical/i.test(o.title) && ["colony", "member", "independent"].includes(s.kind)) harmWorld(S, s, 1, "help never came");
  }
}
export function newOrder(S) {
  const roll = d6(S) + d6(S) + d6(S);
  const m = MISSIONS.reduce((best, x) => (Math.abs(x.roll - roll) < Math.abs(best.roll - roll) ? x : best), MISSIONS[0]);
  let at = null, sys = null;
  const from = S.pelion.at;
  if (m.where.includes("border")) {
    const hexes = Object.keys(S.hexes).filter((k) => nearZone(k) && distance(k, from) >= 3);
    at = pick(S, hexes);
  } else {
    const cands = Object.values(S.systems).filter((s) => (m.where.includes(s.kind) || (s.kind === "member" && m.where.includes("independent")) || (s.kind === "orionBase" && m.where.includes("empty")))
      && !S.orders.some((o) => o.sys === s.id) && distance(s.at, from) >= 2 && distance(s.at, from) <= 10 && s.id !== S.corvan);
    if (!cands.length) return null;
    sys = pick(S, cands); at = sys.at; S.seenSys[sys.id] = true;
  }
  const twist = rand(S) < 0.6 ? pick(S, TWISTS) : null;
  const dist = Math.ceil(distance(from, at) / speedOf(S));
  const o = { id: "o" + S.nextId++, title: m.text + (sys ? ` at ${sys.name}` : " near the Neutral Zone"), at, sys: sys && sys.id, where: m.where.includes("border") ? "border" : "", skills: m.skills, segs: m.segs, have: 0,
    deadline: S.turn + dist + m.segs + 4 - (twist && twist.fx === "urgent" ? 2 : 0), twist, strange: pick(S, STRANGE), key: pick(S, KEYS) };
  S.orders.push(o);
  if (twist && twist.fx === "klingon") { const k = closestOutpost(S, at); if (k) spawnEnemy(S, "kbc", k.at, { goal: "claim", target: at }); }
  if (twist && twist.fx === "orion") { const b = Object.values(S.enemies).find((e) => ENEMIES[e.type].base); spawnEnemy(S, "orion", b ? b.at : at, { goal: "raid", target: at, hostile: true }); }
  if (twist && twist.fx === "romulan") { const z = Object.keys(S.hexes).filter(inZone); spawnEnemy(S, "rbop", pick(S, z), { goal: "watch", target: at, cloaked: true, hostile: true }); }
  log(S, `New orders from Starfleet: ${o.title}. Work it with ${o.skills.join(", ")} (${o.segs} successes), due by turn ${o.deadline}.${twist ? ` Twist: ${twist.text}.` : ""} Something strange: ${o.strange}. Key character: ${o.key}.`, "order");
  return o;
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
  ];
  return { parts, total: parts.reduce((t, p) => t + p[1], 0) };
}
export function rating(total) {
  return total >= 110 ? "Legendary: the Corvan Sector will tell stories about the Pelion" : total >= 75 ? "Commended: a fine tour, and a ship Starfleet is proud of"
    : total >= 40 ? "Satisfactory: the sector is no worse than you found it" : "Recalled: Starfleet Command has questions";
}
export function checkEnd(S) {
  if (S.over) return;
  if (S.pelion.hull >= PELION.hull) S.over = { win: false, why: "The Pelion's hull gave way. The crew abandoned ship, and Starfleet lost a Heavy Cruiser." };
  else if (S.turn > TOUR) S.over = { win: true, why: "The Pelion's tour of the Corvan Sector is over." };
}

// ---------- hooks set by the other modules (they import game.js, so they register here) ----------
let startBattleHook = () => {}, arcActionsHook = () => [], arcStepHook = () => "", arcSweepHook = () => {};
export function registerHooks(h) { if (h.startBattle) startBattleHook = h.startBattle; if (h.arcActions) arcActionsHook = h.arcActions; if (h.arcStep) arcStepHook = h.arcStep; if (h.arcSweep) arcSweepHook = h.arcSweep; }
