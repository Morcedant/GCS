// The rules of Fracture Lines: Dominion, as pure functions over one game state (plain JSON, so it saves as is).
// The player gives orders through these functions; endTurn() lets the computer factions give theirs, then resolves
// movement, battles, the economy, research and victory for everyone at once.
import { makeRng, distance, neighbors, within } from "./hex.js";
import { FACTIONS, WORLDS, BUILDINGS, SHIPS, TECHS, RULES } from "./data.js";
import { makeGalaxy } from "./galaxy.js";

// ---- a new game ----
/** opts: { seed, size: small|medium|large, player: faction id, rivals: number (1–4), difficulty: easy|normal|hard } */
export function newGame(opts) {
  const seed = opts.seed || Math.floor(Math.random() * 1e9);
  const pool = FACTIONS.filter((f) => f.id !== opts.player);
  const rng = makeRng("setup:" + seed);
  const rivals = [];
  while (rivals.length < Math.max(1, Math.min(4, opts.rivals || 3))) rivals.push(pool.splice(rng.int(pool.length), 1)[0]);
  const list = [FACTIONS.find((f) => f.id === opts.player) || FACTIONS[0], ...rivals];
  const g = makeGalaxy(seed, opts.size || "medium", list.length);
  const state = {
    version: 1, seed, turn: 1, size: opts.size || "medium", difficulty: opts.difficulty || "normal", radius: g.radius,
    hexes: g.hexes, systems: g.systems, sysAt: g.sysAt, corridors: g.corridors, adj: g.adj,
    factions: [], fleets: {}, nextId: 1, log: [], winner: null, winReason: null, rngState: makeRng("play:" + seed).state(), events: [], offers: [],
  };
  list.forEach((f, i) => {
    const home = g.homes[i];
    state.factions.push({ id: f.id, name: f.name, color: f.color, ai: i > 0, alive: true, capital: home,
      credits: 80, exotics: 0, research: { current: null, progress: 0, done: [] }, explored: {}, visible: {},
      relations: {}, met: {}, stats: { built: 0, lost: 0, won: 0 } });
    state.systems[home].colony = { owner: f.id, kind: "colony", pop: f.id === "concord" ? 4 : 4, growth: 0, buildings: { shipyard: true, factory: false, lab: false, market: false },
      queue: [], stock: 0, defense: 2, capital: true };
    state.systems[home].name = f.homeworld;
    for (const t of ["scout", "frigate", "colony"]) spawnFleet(state, f.id, state.systems[home].at, [t]);
  });
  for (const a of state.factions) for (const b of state.factions) if (a !== b) a.relations[b.id] = { status: "peace", treaty: false, score: 0, turnsAtWar: 0 };
  for (const f of state.factions) updateVision(state, f);
  log(state, null, "The corridors are open. Turn 1.");
  return state;
}

// ---- helpers ----
export const faction = (s, id) => s.factions.find((f) => f.id === id);
export const has = (s, fid, tech) => faction(s, fid).research.done.includes(tech);
export const player = (s) => s.factions[0];
function rng(s) { const r = makeRng(1); r.setState(s.rngState); return { ...r, save: () => { s.rngState = r.state(); } }; }
export function log(s, fid, text, kind = "info") { s.log.push({ turn: s.turn, fid, text, kind }); if (s.log.length > 400) s.log.splice(0, s.log.length - 400); }
export function coloniesOf(s, fid) { return Object.values(s.systems).filter((x) => x.colony && x.colony.owner === fid); }
export function fleetsOf(s, fid) { return Object.values(s.fleets).filter((f) => f.owner === fid); }
export function fleetsAt(s, hex) { return Object.values(s.fleets).filter((f) => f.at === hex); }
export const atWar = (s, a, b) => a !== b && faction(s, a).relations[b] && faction(s, a).relations[b].status === "war";

export function shipStats(s, fid, type) {
  const base = SHIPS[type], warship = base.skill > 0;
  return { ...base,
    speed: base.speed + (has(s, fid, "foldDrives") ? 1 : 0) + (fid === "vael" ? 1 : 0),
    hull: base.hull + (warship && has(s, fid, "shields") ? 1 : 0),
    skill: warship ? base.skill + (has(s, fid, "targeting") ? 1 : 0) + (fid === "hegemony" ? 1 : 0) : 0,
    sensors: base.sensors + (has(s, fid, "sensors") ? 1 : 0),
    troops: (base.troops || 0) * (fid === "hegemony" ? 2 : 1),
    cost: Math.round(base.cost * (has(s, fid, "orbitalYards") ? 0.8 : 1) * ((type === "colony" || type === "outpost") && fid === "concord" ? 0.75 : 1)) };
}
export function spawnFleet(s, owner, at, types) {
  const id = "f" + s.nextId++;
  s.fleets[id] = { id, owner, at, ships: types.map((t) => ({ type: t, hull: shipStats(s, owner, t).hull })), path: [], dest: null };
  return s.fleets[id];
}
export const fleetSpeed = (s, f) => Math.min(...f.ships.map((x) => shipStats(s, f.owner, x.type).speed));
export const armed = (f) => f.ships.some((x) => SHIPS[x.type].skill > 0);

// ---- worlds ----
export function canSettle(s, fid, sys, kind) {
  if (sys.colony) return false;
  const w = WORLDS[sys.world];
  if (kind === "outpost") return true;
  return !w.outpostOnly && (!w.needs || has(s, fid, w.needs));
}
export function maxPop(s, sys) {
  const c = sys.colony; if (!c || c.kind !== "colony") return 0;
  return WORLDS[sys.world].pop + sys.size * 2 + (has(s, c.owner, "terraforming") ? 2 : 0) + (c.owner === "kel" ? 2 : 0);
}
/** What a world gives each turn: { ind, sci, cr, exo, upkeep }. */
export function yields(s, sys) {
  const c = sys.colony; if (!c) return { ind: 0, sci: 0, cr: 0, exo: 0, upkeep: 0 };
  const w = WORLDS[sys.world], fid = c.owner, B = c.buildings || {};
  let ind = 0, sci = 0, cr = 0;
  if (c.kind === "colony") {
    ind = c.pop * w.ind * sys.rich + (has(s, fid, "automation") ? 1 : 0) + (c.capital ? 2 : 0);
    sci = c.pop * 0.5 * w.sci + (B.lab ? 2 : 0) + (c.capital ? 1 : 0);
    cr = c.pop * 0.6 + (B.market ? 3 + (has(s, fid, "commerce") ? 2 : 0) : 0) + (has(s, fid, "commerce") ? 1 : 0) + (c.capital ? 2 : 0);
    if (B.factory) ind *= 1.5;
    if (B.lab) sci *= 1.5;
    if (fid === "tessan") cr *= 1.25;
  } else cr = 0.5;
  const exo = sys.exotics ? 1 + (B.refinery ? 1 : 0) : 0;
  const upkeep = Object.keys(B).filter((b) => B[b] && BUILDINGS[b]).reduce((t, b) => t + BUILDINGS[b].upkeep, 0) * 0.5;
  return { ind: round1(ind), sci: round1(sci), cr: round1(cr), exo, upkeep };
}
const round1 = (x) => Math.round(x * 10) / 10;

/** The empire's totals this turn: { cr, sci, ind, exo, upkeep, net }. */
export function totals(s, fid) {
  let cr = 0, sci = 0, ind = 0, exo = 0, upkeep = 0;
  for (const sys of coloniesOf(s, fid)) { const y = yields(s, sys); cr += y.cr; sci += y.sci; ind += y.ind; exo += y.exo; upkeep += y.upkeep; }
  for (const f of fleetsOf(s, fid)) for (const x of f.ships) upkeep += SHIPS[x.type].upkeep;
  const F = faction(s, fid);
  for (const [oid, r] of Object.entries(F.relations)) if (r.treaty && faction(s, oid).alive) cr += fid === "tessan" ? 6 : 3;
  return { cr: round1(cr), sci: round1(sci), ind: round1(ind), exo, upkeep: round1(upkeep), net: round1(cr - upkeep) };
}

// ---- what a world can build ----
export function buildOptions(s, sys) {
  const c = sys.colony, fid = c.owner, out = [];
  if (c.kind !== "colony") return out;
  if (c.buildings.shipyard) for (const [t, d] of Object.entries(SHIPS)) if (!d.needs || has(s, fid, d.needs)) out.push({ kind: "ship", id: t, name: d.name, cost: shipStats(s, fid, t).cost, exotics: d.exotics || 0 });
  for (const [b, d] of Object.entries(BUILDINGS)) {
    if (c.buildings[b] || (d.needs && !has(s, fid, d.needs)) || c.queue.some((q) => q.id === b)) continue;
    if (d.wonder && !c.capital) continue;
    out.push({ kind: "building", id: b, name: d.name, cost: d.cost, exotics: d.exotics || 0 });
  }
  return out;
}
export function enqueue(s, sysId, kind, id) {
  const sys = s.systems[sysId], opt = buildOptions(s, sys).find((o) => o.kind === kind && o.id === id);
  if (!opt) return { error: "That can't be built here." };
  if (sys.colony.queue.length >= 6) return { error: "The queue is full." };
  sys.colony.queue.push({ kind, id, name: opt.name, cost: opt.cost, exotics: opt.exotics, progress: 0 });
  if (id === "engine") log(s, null, `${faction(s, sys.colony.owner).name} has begun building the Corridor Engine at ${sys.name}.`, "victory");
  return { ok: true };
}
export function dequeue(s, sysId, i) { const q = s.systems[sysId].colony.queue; if (q[i]) { s.systems[sysId].colony.stock += q[i].progress; q.splice(i, 1); } }
export function rushCost(s, sysId) {
  const q = s.systems[sysId].colony.queue[0]; if (!q) return null;
  return Math.ceil((q.cost - q.progress) * RULES.rushRate);
}
export function rush(s, sysId) {
  const sys = s.systems[sysId], q = sys.colony.queue[0], F = faction(s, sys.colony.owner), c = rushCost(s, sysId);
  if (!q || c === null) return { error: "Nothing to rush." };
  if (F.credits < c) return { error: `Rushing it needs ${c} credits.` };
  F.credits -= c; q.progress = q.cost; return { ok: true };
}

// ---- research ----
export function availableTechs(s, fid) { const done = faction(s, fid).research.done; return TECHS.filter((t) => !done.includes(t.id) && t.needs.every((n) => done.includes(n))); }
export function setResearch(s, fid, techId) {
  if (!availableTechs(s, fid).some((t) => t.id === techId)) return { error: "Not available yet." };
  const R = faction(s, fid).research; if (R.current !== techId) { R.current = techId; } return { ok: true };
}

// ---- movement ----
const corridorCost = (s, fid) => (has(s, fid, "corridorTheory") ? 0.25 : 1);
/** The cheapest path from a hex to another: [{ hex, cost }] steps (the first step's hex is the next hex). */
export function findPath(s, fid, from, to) {
  if (!s.hexes[to] || s.hexes[to].terrain === "rift") return null;
  const dist = { [from]: 0 }, prev = {}, open = [[0, from]], cc = corridorCost(s, fid);
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [d, k] = open.shift();
    if (k === to) break;
    if (d > dist[k]) continue;
    const steps = neighbors(k).filter((n) => s.hexes[n] && s.hexes[n].terrain !== "rift").map((n) => [n, s.hexes[n].terrain === "nebula" ? 2 : 1]);
    const sid = s.sysAt[k];
    if (sid) for (const o of s.adj[sid]) steps.push([s.systems[o].at, cc]);
    for (const [n, c] of steps) {
      const nd = d + c;
      if (dist[n] === undefined || nd < dist[n] - 1e-9) { dist[n] = nd; prev[n] = k; open.push([nd, n]); }
    }
  }
  if (dist[to] === undefined) return null;
  const path = []; let k = to;
  while (k !== from) { const p = prev[k]; path.unshift({ hex: k, cost: round1(dist[k] - dist[p]) }); k = p; }
  return path;
}
export function setDestination(s, fleetId, hex) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  if (hex === f.at) { f.path = []; f.dest = null; return { ok: true }; }
  const path = findPath(s, f.owner, f.at, hex);
  if (!path) return { error: "No way there." };
  f.path = path; f.dest = hex; return { ok: true, turns: Math.ceil(path.reduce((t, x) => t + x.cost, 0) / fleetSpeed(s, f)) };
}
export function mergeFleets(s, intoId, fromId) {
  const a = s.fleets[intoId], b = s.fleets[fromId];
  if (!a || !b || a.owner !== b.owner || a.at !== b.at) return { error: "They need to be in the same place." };
  a.ships.push(...b.ships); delete s.fleets[fromId]; return { ok: true };
}
export function splitFleet(s, fleetId, type) {
  const f = s.fleets[fleetId]; const i = f.ships.findIndex((x) => x.type === type);
  if (i < 0 || f.ships.length < 2) return { error: "Nothing to split off." };
  const [ship] = f.ships.splice(i, 1);
  const nf = spawnFleet(s, f.owner, f.at, []); nf.ships.push(ship);
  return { ok: true, fleet: nf.id };
}
function moveFleets(s) {
  for (const f of Object.values(s.fleets)) {
    let mp = fleetSpeed(s, f);
    while (f.path.length && mp + 1e-9 >= f.path[0].cost) {
      const step = f.path[0];
      // A fleet stops where an enemy at war guards the hex.
      mp -= step.cost; f.at = step.hex; f.path.shift();
      if (fleetsAt(s, f.at).some((o) => atWar(s, f.owner, o.owner) && armed(o))) { f.path = []; break; }
    }
    if (!f.path.length) f.dest = null;
  }
  // Fleets of one faction resting in the same hex join up.
  const byHex = {};
  // Warships only: colony ships, outposts, scouts and transports keep their own fleets until the player joins them.
  const warOnly = (f) => f.ships.every((x) => SHIPS[x.type].skill > 0);
  for (const f of Object.values(s.fleets)) { if (f.path.length || !warOnly(f)) continue; const k = f.owner + "|" + f.at; if (byHex[k]) { byHex[k].ships.push(...f.ships); delete s.fleets[f.id]; } else byHex[k] = f; }
}

// ---- settling and invading ----
export function settle(s, fleetId) {
  const f = s.fleets[fleetId], sid = s.sysAt[f.at], sys = sid && s.systems[sid];
  if (!sys) return { error: "There's no system here." };
  const ci = f.ships.findIndex((x) => x.type === "colony"), oi = f.ships.findIndex((x) => x.type === "outpost");
  if (sys.colony) return { error: "Someone already holds this system." };
  if (ci >= 0 && canSettle(s, f.owner, sys, "colony")) {
    f.ships.splice(ci, 1);
    sys.colony = { owner: f.owner, kind: "colony", pop: f.owner === "concord" ? 2 : 1, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
    log(s, f.owner, `${faction(s, f.owner).name} founded a colony on ${sys.name}.`, "settle");
  } else if (oi >= 0 || ci >= 0) {
    if (oi < 0 && !canSettle(s, f.owner, sys, "outpost")) return { error: "Nothing here to settle with." };
    f.ships.splice(oi >= 0 ? oi : ci, 1);
    sys.colony = { owner: f.owner, kind: "outpost", pop: 0, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
    log(s, f.owner, `${faction(s, f.owner).name} claimed ${sys.name} as an outpost.`, "settle");
  } else return { error: "This fleet has no colony or outpost ship." };
  if (!f.ships.length) delete s.fleets[f.id];
  noticeSettling(s, f.owner, sys);
  updateVision(s, faction(s, f.owner));
  return { ok: true };
}
/** Others don't like it when you settle next door. */
function noticeSettling(s, fid, sys) {
  for (const o of s.factions) if (o.id !== fid && o.alive && coloniesOf(s, o.id).some((x) => distance(x.at, sys.at) <= 4)) o.relations[fid].score -= 8;
}
export function invasionOdds(s, fleetId) {
  const f = s.fleets[fleetId], sid = s.sysAt[f.at], sys = sid && s.systems[sid];
  if (!sys || !sys.colony || sys.colony.owner === f.owner) return null;
  const troops = f.ships.filter((x) => x.type === "transport").reduce((t, x) => t + shipStats(s, f.owner, "transport").troops, 0);
  const defense = sys.colony.kind === "outpost" ? 0.5 : sys.colony.pop * RULES.troopDefensePerPop + (sys.colony.capital ? 2 : 0);
  return { troops, defense: round1(defense), guarded: guarded(s, sys, f.owner) };
}
function guarded(s, sys, attacker) {
  return (sys.colony.buildings.battery || sys.colony.capital) && sys.colony.defense > 0
    || fleetsAt(s, sys.at).some((o) => o.owner === sys.colony.owner && armed(o));
}
export function invade(s, fleetId) {
  const f = s.fleets[fleetId], o = invasionOdds(s, fleetId);
  if (!o) return { error: "There's no enemy world here." };
  const sys = s.systems[s.sysAt[f.at]], def = sys.colony.owner;
  if (!atWar(s, f.owner, def)) return { error: "You're not at war with them." };
  if (!o.troops) return { error: "This fleet carries no troops." };
  if (o.guarded) return { error: "Its defenses still hold the orbit: destroy them first." };
  f.ships = f.ships.filter((x) => x.type !== "transport");
  if (!f.ships.length) delete s.fleets[f.id];
  if (o.troops >= o.defense) {
    capture(s, sys, f.owner);
    return { ok: true, taken: true };
  }
  sys.colony.pop = Math.max(1, sys.colony.pop - 1);
  log(s, f.owner, `The landing on ${sys.name} failed.`, "war");
  return { ok: true, taken: false };
}
function capture(s, sys, by) {
  const was = sys.colony.owner, wasCapital = sys.colony.capital;
  log(s, by, `${faction(s, by).name} took ${sys.name} from ${faction(s, was).name}.`, "war");
  sys.colony.owner = by; sys.colony.capital = false; sys.colony.queue = []; sys.colony.stock = 0;
  if (sys.colony.kind === "colony") sys.colony.pop = Math.max(1, sys.colony.pop - 1);
  delete sys.colony.buildings.engine;
  if (wasCapital) {
    const rest = coloniesOf(s, was).filter((x) => x.colony.kind === "colony").sort((a, b) => b.colony.pop - a.colony.pop);
    if (rest[0]) { rest[0].colony.capital = true; rest[0].colony.buildings.shipyard = true; faction(s, was).capital = rest[0].id; log(s, was, `${faction(s, was).name} moved its capital to ${rest[0].name}.`, "war"); }
  }
  checkAlive(s, was);
}
function checkAlive(s, fid) {
  const F = faction(s, fid);
  if (F.alive && !coloniesOf(s, fid).some((x) => x.colony.kind === "colony")) {
    F.alive = false;
    for (const f of fleetsOf(s, fid)) delete s.fleets[f.id];
    for (const sys of coloniesOf(s, fid)) sys.colony = null;
    log(s, fid, `${F.name} has fallen.`, "war");
  }
}

// ---- battles: 3d6 roll-under, three exchanges ----
const r3d6 = (R) => R.d6() + R.d6() + R.d6();
function battles(s) {
  const R = rng(s), hexes = new Set(Object.values(s.fleets).map((f) => f.at));
  for (const hex of hexes) {
    const sid = s.sysAt[hex], sys = sid && s.systems[sid];
    const sides = {};
    for (const f of fleetsAt(s, hex)) (sides[f.owner] = sides[f.owner] || []).push(f);
    const owners = new Set(Object.keys(sides));
    if (sys && sys.colony) owners.add(sys.colony.owner);
    const list = [...owners];
    if (!list.some((a) => list.some((b) => atWar(s, a, b)))) continue;
    // Units: ships, and the world's guns.
    const units = [];
    for (const [fid, fl] of Object.entries(sides)) for (const f of fl) for (const sh of f.ships) units.push({ fid, fleet: f, ship: sh, st: shipStats(s, fid, sh.type) });
    const worldGuns = sys && sys.colony && (sys.colony.buildings.battery || sys.colony.capital) && sys.colony.defense > 0;
    if (worldGuns) units.push({ fid: sys.colony.owner, world: sys, st: { skill: 13 + (has(s, sys.colony.owner, "targeting") ? 1 : 0), dmg: 1, name: "Orbital guns" } });
    const hp = (u) => (u.world ? u.world.colony.defense : u.ship.hull);
    const hit = (u, n) => { if (u.world) u.world.colony.defense = Math.max(0, u.world.colony.defense - n); else u.ship.hull -= n; };
    let fights = 0;
    for (let round = 0; round < 3; round++) {
      const live = units.filter((u) => hp(u) > 0);
      for (const u of live) {
        if (!u.st.skill || hp(u) <= 0) continue;
        const foes = live.filter((v) => hp(v) > 0 && atWar(s, u.fid, v.fid));
        if (!foes.length) continue;
        const t = foes[R.int(foes.length)], roll = r3d6(R);
        fights++;
        if (roll <= 4 || (roll < 17 && roll <= u.st.skill)) hit(t, u.st.dmg);
      }
    }
    if (!fights) continue;
    // The dead are removed; who was there hears about it.
    const lost = {};
    for (const u of units) if (u.ship && u.ship.hull <= 0) { lost[u.fid] = (lost[u.fid] || 0) + 1; u.fleet.ships = u.fleet.ships.filter((x) => x !== u.ship); }
    for (const f of fleetsAt(s, hex)) if (!f.ships.length) delete s.fleets[f.id];
    for (const [fid, n] of Object.entries(lost)) faction(s, fid).stats.lost += n;
    const where = sys ? sys.name : "deep space";
    const names = list.map((x) => faction(s, x).name).join(" and ");
    log(s, null, `Battle at ${where} between ${names}: ${Object.entries(lost).map(([fid, n]) => `${faction(s, fid).name} lost ${n} ship${n > 1 ? "s" : ""}`).join("; ") || "no ships lost"}.`, "war");
    s.events.push({ turn: s.turn, kind: "battle", hex, sides: list });
  }
  R.save();
}

// ---- diplomacy ----
export function declareWar(s, a, b) {
  const A = faction(s, a), B = faction(s, b);
  A.relations[b].status = "war"; B.relations[a].status = "war"; A.relations[b].treaty = B.relations[a].treaty = false;
  A.relations[b].turnsAtWar = B.relations[a].turnsAtWar = 0;
  B.relations[a].score -= 30;
  log(s, a, `${A.name} declared war on ${B.name}.`, "war");
  return { ok: true };
}
/** Ask for peace or a trade treaty. The computer says yes or no now. */
export function propose(s, from, to, what) {
  const A = faction(s, from), B = faction(s, to), rel = B.relations[from];
  if (!A.met[to]) return { error: "You haven't met them yet." };
  let yes;
  if (what === "peace") {
    if (rel.status !== "war") return { error: "You're already at peace." };
    const mine = militaryPower(s, to), theirs = militaryPower(s, from);
    yes = !B.ai || rel.turnsAtWar >= 8 || mine < theirs * 0.8 || rel.score > -10;
    if (yes) { A.relations[to].status = B.relations[from].status = "peace"; rel.score += 10; log(s, from, `${A.name} and ${B.name} made peace.`, "diplo"); }
  } else if (what === "trade") {
    if (rel.status === "war") return { error: "Not while you're at war." };
    if (rel.treaty) return { error: "You already trade." };
    yes = !B.ai || rel.score >= -5;
    if (yes) { A.relations[to].treaty = B.relations[from].treaty = true; rel.score += 5; log(s, from, `${A.name} and ${B.name} signed a trade treaty.`, "diplo"); }
  } else if (what === "endTrade") {
    A.relations[to].treaty = B.relations[from].treaty = false; rel.score -= 5; yes = true;
  }
  return { ok: true, accepted: !!yes };
}
export function militaryPower(s, fid) {
  return fleetsOf(s, fid).reduce((t, f) => t + f.ships.reduce((u, x) => u + (SHIPS[x.type].skill ? shipStats(s, fid, x.type).hull * SHIPS[x.type].dmg * 2 : 0), 0), 0);
}

// ---- seeing ----
export function updateVision(s, F) {
  const vis = {};
  const see = (hex, n) => { for (const k of within(hex, n)) if (s.hexes[k]) { vis[k] = 1; F.explored[k] = 1; } };
  const bonus = has(s, F.id, "sensors") ? 1 : 0;
  for (const sys of coloniesOf(s, F.id)) see(sys.at, (sys.colony.kind === "colony" ? 2 : 1) + bonus);
  for (const f of fleetsOf(s, F.id)) see(f.at, Math.max(...f.ships.map((x) => shipStats(s, F.id, x.type).sensors)));
  F.visible = vis;
  // Meeting: anyone whose world or fleet you can see.
  for (const o of s.factions) if (o.id !== F.id && o.alive && !F.met[o.id]) {
    const seen = coloniesOf(s, o.id).some((x) => vis[x.at]) || fleetsOf(s, o.id).some((f) => vis[f.at]);
    if (seen) { F.met[o.id] = true; o.met[F.id] = true; log(s, F.id, `${F.name} made contact with ${o.name}.`, "diplo"); }
  }
  // Ruins: the first to see them learns something.
  for (const sys of Object.values(s.systems)) if (sys.ruins && vis[sys.at] && fleetsAt(s, sys.at).some((f) => f.owner === F.id)) {
    sys.ruins = false; F.research.progress += 60;
    log(s, F.id, `${F.name} surveyed the ruins at ${sys.name}: +60 research.`, "explore");
  }
}

// ---- the end of a turn ----
/** aiTurn(state, faction) gives each computer faction's orders (ai.js); the player has given theirs. */
export function endTurn(s, aiTurn) {
  if (s.winner) return;
  for (const F of s.factions) if (F.ai && F.alive && aiTurn) aiTurn(s, F);
  moveFleets(s);
  battles(s);
  for (const F of s.factions) if (F.alive) economy(s, F);
  for (const F of s.factions) if (F.alive) updateVision(s, F);
  // Relations drift: borders rub, trade warms, wars wear on everyone.
  for (const A of s.factions) for (const [bid, r] of Object.entries(A.relations)) {
    if (r.status === "war") r.turnsAtWar++;
    if (r.treaty) r.score = Math.min(40, r.score + 0.5);
    const B = faction(s, bid);
    if (A.alive && B.alive && coloniesOf(s, A.id).some((x) => coloniesOf(s, bid).some((y) => distance(x.at, y.at) <= 3))) r.score = Math.max(-60, r.score - 0.4);
  }
  checkVictory(s);
  s.turn++;
}
function economy(s, F) {
  const t = totals(s, F.id);
  const strike = F.credits < 0 ? 0.75 : 1; // in debt: the yards and the labs slow down
  F.credits = round1(F.credits + t.net);
  F.exotics += t.exo;
  // Research.
  const R = F.research;
  if (R.current) {
    R.progress += t.sci * strike;
    const tech = TECHS.find((x) => x.id === R.current);
    if (R.progress >= tech.cost) {
      R.progress -= tech.cost; R.done.push(tech.id); R.current = null;
      log(s, F.id, `${F.name} discovered ${tech.name}.`, "research");
      if (tech.id === "shields") for (const f of fleetsOf(s, F.id)) for (const x of f.ships) if (SHIPS[x.type].skill) x.hull += 1;
    }
  }
  // Each world: production, growth, defenses.
  for (const sys of coloniesOf(s, F.id)) {
    const c = sys.colony, y = yields(s, sys);
    if (c.kind === "colony") {
      c.stock += y.ind * strike;
      while (c.queue.length) {
        const q = c.queue[0];
        const need = q.cost - q.progress, put = Math.min(need, c.stock);
        q.progress += put; c.stock -= put;
        if (q.progress + 1e-9 < q.cost) break;
        if (q.exotics && F.exotics < q.exotics) { if (!q.waiting) log(s, F.id, `${q.name} at ${sys.name} waits for ${q.exotics} exotics.`, "build"); q.waiting = true; break; }
        F.exotics -= q.exotics || 0;
        c.queue.shift();
        if (q.kind === "ship") {
          const warship = SHIPS[q.id].skill > 0;
          const here = (warship && fleetsAt(s, sys.at).find((f) => f.owner === F.id && !f.path.length && f.ships.every((x) => SHIPS[x.type].skill > 0))) || spawnFleet(s, F.id, sys.at, []);
          here.ships.push({ type: q.id, hull: shipStats(s, F.id, q.id).hull });
          F.stats.built++;
        } else {
          c.buildings[q.id] = true;
          if (q.id === "battery") c.defense = 3;
          if (q.id === "engine") { s.winner = F.id; s.winReason = "engine"; log(s, F.id, `${F.name} finished the Corridor Engine.`, "victory"); }
        }
        if (!F.ai || q.kind === "building") log(s, F.id, `${sys.name} finished ${q.name}.`, "build");
      }
      c.stock = Math.min(c.stock, 40); // a world can only stockpile so much
      // Growth.
      const max = maxPop(s, sys);
      if (c.pop < max) { c.growth += RULES.growthPerTurn * (F.id === "kel" ? 1.5 : 1) * (1 + (max - c.pop) / max); if (c.growth >= 1) { c.growth -= 1; c.pop++; } }
      else c.growth = 0;
    }
    const maxDef = c.buildings.battery ? 3 : c.capital ? 2 : 0;
    if (c.defense < maxDef) c.defense = Math.min(maxDef, c.defense + 1);
  }
  // Living hulls heal anywhere; others at their own worlds.
  for (const f of fleetsOf(s, F.id)) {
    const home = s.sysAt[f.at] && s.systems[s.sysAt[f.at]].colony && s.systems[s.sysAt[f.at]].colony.owner === F.id;
    if (home || F.id === "vael") for (const x of f.ships) x.hull = Math.min(shipStats(s, F.id, x.type).hull, x.hull + 1);
  }
}

// ---- winning ----
export function score(s, fid) {
  const cols = coloniesOf(s, fid);
  return Math.round(cols.reduce((t, x) => t + (x.colony.kind === "colony" ? 5 + x.colony.pop * 2 : 2), 0) + faction(s, fid).research.done.length * 6 + militaryPower(s, fid) / 4);
}
function checkVictory(s) {
  if (s.winner) return;
  const alive = s.factions.filter((f) => f.alive);
  if (alive.length === 1) { s.winner = alive[0].id; s.winReason = "conquest"; log(s, alive[0].id, `${alive[0].name} stands alone. Conquest victory.`, "victory"); return; }
  if (!player(s).alive) { s.winner = "none"; s.winReason = "fallen"; return; }
  if (s.turn >= RULES.maxTurns) {
    const best = alive.sort((a, b) => score(s, b.id) - score(s, a.id))[0];
    s.winner = best.id; s.winReason = "score"; log(s, best.id, `Turn ${RULES.maxTurns}: ${best.name} leads on score.`, "victory");
  }
}
