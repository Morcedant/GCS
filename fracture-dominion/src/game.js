// The rules of Fracture Lines: Dominion, as pure functions over one game state (plain JSON, so it saves as is).
// The player gives orders through these functions; endTurn() lets the computer factions give theirs, then resolves
// movement, battles, the economy, research and victory for everyone at once.
import { makeRng, distance, neighbors, within, hexagon } from "./hex.js";
import { shipLabel, FACTIONS, WORLDS, BUILDINGS, SHIPS, TECHS, RULES, PROTOTYPES, FOCUS, STANCES, SUPPLY, TRADE, SIEGE, BATTERY, MARKET, INFLUENCE, FUEL, OUTPOST_BUY, YARDS, OUTPOST_TRADE, ADVANCES, SCIENCE, WILDS, ENGINE, RELICS, RELIC_SCORE, AI_PRESETS, REACH, SECTORS, STAR_NAMES, RAID_AVOID, DEPOT_RAID, PATROL, ADMIRAL_RANKS, ADMIRAL_STEPS, ADMIRAL_TRAITS, ADMIRAL_NAMES, CRISIS, ROLES, COUNTER, DETECT, MINING, HOME, ADMIRAL_POWERS, OFFICERS, SITES, SCORE_EXTRA } from "./data.js";
import { makeGalaxy } from "./galaxy.js";

// ---- a new game ----
/** opts: { seed, size: small|medium|large|vast, player: faction id, rivals: number (1–4), difficulty: easy|normal|hard, mode: standard|open } */
export function newGame(opts) {
  const seed = opts.seed || Math.floor(Math.random() * 1e9);
  const pool = FACTIONS.filter((f) => f.id !== opts.player);
  const rng = makeRng("setup:" + seed);
  const rivals = [];
  while (rivals.length < Math.max(1, Math.min(4, opts.rivals || 3))) rivals.push(pool.splice(rng.int(pool.length), 1)[0]);
  const list = [FACTIONS.find((f) => f.id === opts.player) || FACTIONS[0], ...rivals];
  const g = makeGalaxy(seed, opts.size || "medium", list.length);
  const state = {
    version: 1, seed, turn: 1, crisisOff: opts.crisis === false, sectorsOff: opts.sectors === false, collapsesOff: opts.collapses === false, wildsOff: opts.wilds === false || opts.wilds === "none", wildsLevel: typeof opts.wilds === "string" ? opts.wilds : opts.wilds === false ? "none" : "light", size: opts.size || "medium", difficulty: opts.difficulty || "normal", aiOpts: { ...(AI_PRESETS[opts.difficulty] || AI_PRESETS.normal), ...(opts.ai || {}) }, radius: g.radius, mode: opts.mode === "open" ? "open" : "standard",
    hexes: g.hexes, systems: g.systems, sysAt: g.sysAt, corridors: g.corridors, adj: g.adj,
    factions: [], fleets: {}, nextId: 1, log: [], winner: null, winReason: null, rngState: makeRng("play:" + seed).state(), events: [], offers: [],
  };
  list.forEach((f, i) => {
    const home = g.homes[i];
    state.factions.push({ id: f.id, name: f.name, color: f.color, ai: i > 0, alive: true, capital: home,
      credits: 80, exotics: 0, research: { current: null, progress: 0, done: [] }, explored: {}, visible: {},
      relations: {}, met: {}, stats: { built: 0, lost: 0, won: 0, ruins: 0 }, focus: { industry: 1, science: 1, credits: 1, defense: 0 }, protos: {} });
    state.systems[home].colony = { owner: f.id, kind: "colony", pop: f.id === "concord" ? 4 : 4, growth: 0, buildings: { shipyard: true, factory: false, lab: false, market: false },
      queue: [], stock: 0, defense: 2, capital: true };
    state.systems[home].name = f.homeworld;
    if (f.id === "mirrun") state.systems[home].world = "ocean";   // the Mirrun come from a deep-ocean world
    for (const t of ["scout", "frigate", "colony"]) spawnFleet(state, f.id, state.systems[home].at, [t]);
  });
  // Every power starts with one admiral, on its frigate.
  for (const F of state.factions) { const fr = fleetsOf(state, F.id).find(armed); if (fr) fr.admiral = makeAdmiral(state, F.id, rng); }
  for (const a of state.factions) for (const b of state.factions) if (a !== b) a.relations[b.id] = { status: "peace", treaty: false, score: 0, turnsAtWar: 0 };
  placeAnomalies(state);
  placeRelics(state);
  placeFields(state);
  placeSites(state);
  for (const F of state.factions) gainOfficer(state, F.id, "on your staff from the start", null, "engineer");
  for (const f of state.factions) updateVision(state, f);
  log(state, null, "The corridors are open. Turn 1.");
  return state;
}

// ---- helpers ----
// The Wardens (the late-game crisis, crisis.js) are a power of their own, kept out of s.factions: they have no worlds,
// no diplomacy and no score, and they're at war with everyone.
// The wild things (wilds.js: pirates, and the creatures of the deep) are kept out of s.factions the same way.
export const faction = (s, id) => s.factions.find((f) => f.id === id) || (s.crisis && s.crisis.F && s.crisis.F.id === id ? s.crisis.F : undefined) || (s.wilds && s.wilds[id]) || (id === "traders" ? s.traders : undefined) || undefined;
/** The Wardens, the pirates and the creatures of the deep: at war with every power, never with each other. */
/** The computer players' options for this game (a game saved before there was a choice: its difficulty's preset). */
export const aiOpt = (s, k) => { const o = s.aiOpts || AI_PRESETS[s.difficulty] || AI_PRESETS.normal; return o[k] ?? (AI_PRESETS.normal)[k]; };
/** "Easy", "Normal", "Hard", or "Custom" when the options differ from the difficulty's preset. */
export function difficultyLabel(s) {
  const P = AI_PRESETS[s.difficulty] || AI_PRESETS.normal, o = s.aiOpts || P;
  const same = Object.keys(P).every((k) => P[k] === o[k]);
  return same ? ({ easy: "Easy", normal: "Normal", hard: "Hard" }[s.difficulty] || "Normal") : "Custom";
}
export const isWild = (id) => id === "wardens" || id === "pirates" || id === "beasts";
/** The level of an advance (repeatable research) a power has. */
export const advLevel = (s, fid, id) => { const F = faction(s, fid); return (F && F.research.adv && F.research.adv[id]) || 0; };
export const has = (s, fid, tech) => { const F = faction(s, fid); return !!F && F.research.done.includes(tech); };
export const player = (s) => s.factions[0];
export function rng(s) { const r = makeRng(1); r.setState(s.rngState); return { ...r, save: () => { s.rngState = r.state(); } }; }
/** Discoveries (systems charted, ruins surveyed, contacts, technologies) are never trimmed from the log. */
export const DISCOVERY = ["explore", "research", "contact"];
export function log(s, fid, text, kind = "info") {
  s.logSeq = (s.logSeq || 0) + 1;   // each entry is numbered, so the page can show what one choice led to
  s.log.push({ id: s.logSeq, turn: s.turn, fid, text, kind });
  let n = s.log.length - 400;
  for (let i = 0; i < s.log.length && n > 0; ) { if (!DISCOVERY.includes(s.log[i].kind)) { s.log.splice(i, 1); n--; } else i++; }
}
export function coloniesOf(s, fid) { return Object.values(s.systems).filter((x) => x.colony && x.colony.owner === fid); }
export function fleetsOf(s, fid) { return Object.values(s.fleets).filter((f) => f.owner === fid); }
export function fleetsAt(s, hex) { const out = []; for (const id in s.fleets) { const f = s.fleets[id]; if (f.at === hex) out.push(f); } return out; }
// The free traders (traders.js) are at peace with everyone but the pirates.
export const atWar = (s, a, b) => a !== b && (a === "traders" || b === "traders" ? a === "pirates" || b === "pirates" : isWild(a) !== isWild(b) || !!(faction(s, a).relations[b] && faction(s, a).relations[b].status === "war"));

/** Does this faction have this prototype fitted? */
export const proto = (s, fid, id) => { const F = faction(s, fid); return !!(F && (F.protos || {})[id]); };
// ---- ships' systems: what research a ship is fitted with ----
/** The research that goes into a ship's systems: technologies, prototypes and advances. A ship is fitted with what its
 * power had when it was built; what's researched later reaches it only at a drydock (refitAt). */
const FIT = { sensors: "Deep sensors", foldDrives: "Fold drives", shields: "Deflector shields", targeting: "Targeting computers",
  plating: "Ablative plating", lances: "Fold lances", scanners: "Long-range scanners", armor: "Composite armor", fireControl: "Fire control", tanks: "Drive tuning" };
export function currentFit(s, fid) {
  return { sensors: has(s, fid, "sensors"), foldDrives: has(s, fid, "foldDrives"), shields: has(s, fid, "shields"), targeting: has(s, fid, "targeting"),
    plating: proto(s, fid, "plating"), lances: proto(s, fid, "lances"), scanners: proto(s, fid, "scanners"),
    armor: advLevel(s, fid, "armor"), fireControl: advLevel(s, fid, "fireControl"), tanks: advLevel(s, fid, "tanks") };
}
/** A ship's systems: its own fit, or (a ship being built now, or anyone without a fit) the power's current research. */
export const fitOf = (s, fid, ship) => (ship && ship.fit) || currentFit(s, fid);
/** The early systems any Shipyard can fit; everything else needs a Drydock. */
export const SHIPYARD_FIT = ["sensors", "foldDrives", "shields"];
const missingKeys = (s, fid, ship) => {
  if (!ship || !ship.fit) return [];
  const now = currentFit(s, fid), base = SHIPS[ship.type];
  return Object.keys(FIT).filter((k) => (now[k] || 0) > (ship.fit[k] || 0) && (base.skill > 0 || ["sensors", "foldDrives", "scanners", "tanks"].includes(k)));
};
/** Whether a ship's missing systems need a drydock (anything beyond the early ones a shipyard fits). */
export const needsDrydock = (s, fid, ship) => missingKeys(s, fid, ship).some((k) => !SHIPYARD_FIT.includes(k));
/** What research a ship is missing: the names, for the panels; [] when it's up to date. */
export function missingFit(s, fid, ship) {
  if (!ship || !ship.fit) return [];
  const now = currentFit(s, fid), base = SHIPS[ship.type];
  return Object.keys(FIT).filter((k) => (now[k] || 0) > (ship.fit[k] || 0) && (base.skill > 0 || ["sensors", "foldDrives", "scanners", "tanks"].includes(k))).map((k) => FIT[k]);
}
/** Refit a ship with everything its power has researched (or, with `keys`, only those systems): its hull grows with any
 * new armor. */
export function refitShip(s, fid, ship, keys) {
  const was = shipStats(s, fid, ship.type, ship).hull, now = currentFit(s, fid);
  ship.fit = keys ? { ...ship.fit, ...Object.fromEntries(keys.map((k) => [k, now[k]])) } : now;
  ship.hull = Math.max(1, ship.hull + Math.max(0, shipStats(s, fid, ship.type, ship).hull - was));
}
/** A fleet with ships that need a refit. */
export const needsRefit = (s, f) => f.ships.some((x) => missingFit(s, f.owner, x).length);
/** The nearest drydock of a power's that can refit now (no enemy warships in its orbit), or null. With `shipyardOk`, a
 * world with a Shipyard will do too (for ships that only lack the early systems). */
export const nearestDrydock = (s, fid, hex, shipyardOk = false) => coloniesOf(s, fid).filter((x) => (x.colony.buildings.drydock || (shipyardOk && x.colony.buildings.shipyard)) && !besieged(s, x)).sort((a, b) => distance(a.at, hex) - distance(b.at, hex))[0] || null;
/** Where these ships can be refitted, nearest first: a drydock, or (if they only lack early systems) any shipyard. */
export const refitPlace = (s, fid, hex, ships) => nearestDrydock(s, fid, hex, !ships.some((x) => needsDrydock(s, fid, x)));
/** Send a fleet to the nearest drydock for a refit; with onlyOld, split off just its out-of-date ships and send those. */
export function sendToDrydock(s, fleetId, onlyOld = false) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  const dock = refitPlace(s, f.owner, f.at, f.ships.filter((x) => missingFit(s, f.owner, x).length));
  if (!dock) return { error: "Nowhere can refit them now: a Shipyard fits the early systems (sensors, drives, shields); everything else needs a Drydock (Orbital shipyards)." };
  if (!needsRefit(s, f)) return { error: "These ships are up to date." };
  if (f.at === dock.at) return { error: `They're at ${dock.name}: they're refitted at the end of the turn.` };
  let go = f;
  const old = f.ships.filter((x) => missingFit(s, f.owner, x).length);
  if (onlyOld && old.length < f.ships.length) {
    const fu = fuelOf(s, f); f.ships = f.ships.filter((x) => !old.includes(x));
    go = spawnFleet(s, f.owner, f.at, []); go.ships.push(...old); go.fuel = Math.min(fu, fuelMax(s, go)); if (f.stance) go.stance = f.stance;
  }
  const r = setDestination(s, go.id, dock.at);
  if (r.error) { if (go !== f) { f.ships.push(...go.ships); delete s.fleets[go.id]; } return { error: `No way to ${dock.name} from here.` }; }
  go.sentry = false; go.refitTrip = true;
  return { ok: true, fleet: go.id, dock: dock.name, turns: r.turns, ships: go.ships.length, split: go !== f };
}
/**
 * Send a power's fleets to one place at once: its warship fleets (any with a warship in it; their transports and
 * tankers go with them), or every fleet. Fleets already there stay; fleets told to hold position are sent too. What
 * each fleet was doing is kept, so the order can be undone this turn (undoSendAll). Returns { fleets, ships, turns
 * (the longest trip), unreachable }.
 */
export function sendAllTo(s, fid, hex, kind = "war") {
  const out = { fleets: 0, ships: 0, turns: 0, unreachable: 0 }, before = [];
  for (const f of fleetsOf(s, fid)) {
    if (f.at === hex || (kind === "war" && !armed(f))) continue;
    const prev = { id: f.id, path: f.path, dest: f.dest, sentry: f.sentry };
    const r = setDestination(s, f.id, hex);
    if (r.error) { out.unreachable++; continue; }
    before.push(prev); f.sentry = false;
    out.fleets++; out.ships += f.ships.length; out.turns = Math.max(out.turns, r.turns || 0);
  }
  faction(s, fid).lastSendAll = { turn: s.turn, hex, before };
  return out;
}
/** Undo this turn's send-all: every fleet it sent goes back to what it was doing. */
export function undoSendAll(s, fid) {
  const L = faction(s, fid).lastSendAll;
  if (!L || L.turn !== s.turn) return { error: "There's nothing to undo this turn." };
  let n = 0;
  for (const p of L.before) { const f = s.fleets[p.id]; if (!f) continue; f.path = p.path; f.dest = p.dest; f.sentry = p.sentry; n++; }
  faction(s, fid).lastSendAll = null;
  return { ok: true, fleets: n };
}
/** Every out-of-date ship of a power's, split off its fleet and sent to the nearest drydock. Returns how many ships. */
export function sendAllToDrydock(s, fid) {
  let n = 0, fleets = 0;
  for (const f of fleetsOf(s, fid)) { if (!needsRefit(s, f) || f.refitTrip && f.path.length) continue; const r = sendToDrydock(s, f.id, true); if (r.ok) { n += r.ships; fleets++; } }
  return { ok: true, ships: n, fleets };
}
const newShip = (s, owner, type) => { const x = { type, hull: shipStats(s, owner, type).hull }; if (s.factions.some((F) => F.id === owner)) x.fit = currentFit(s, owner); return x; };
export function shipStats(s, fid, type, ship) {
  const base = SHIPS[type], warship = base.skill > 0;
  // The Heart of the Wardens grows with the galaxy it wakes in (crisis.js): more hull, more guns.
  if (type === "heart") { const m = (s.crisis && s.crisis.m) || 1; return { ...base, hull: s.crisis && s.crisis.heartMax || base.hull * m, shots: 1 + m }; }
  // Watchers and Nodes grow with it too: their hull and guns by the crisis's strength (set by the Signs, then the waking).
  if (type === "watcher" || type === "node") { const m = (s.crisis && (s.crisis.m || s.crisis.mSigns)) || 1; return { ...base, hull: base.hull * m, shots: (base.shots || 1) + Math.floor(m / 2) }; }
  // Research comes through the ship's own systems (fitOf); a people's traits and relics reach every ship at once.
  const k = fitOf(s, fid, ship);
  return { ...base,
    speed: base.speed + (k.foldDrives ? 1 : 0) + (fid === "vael" ? 1 : 0) + (fid === "ylith" && (type === "scout" || type === "colony") ? 1 : 0) + (base.speed > 0 && relicHeld(s, fid, "anchor") ? 1 : 0),
    hull: base.hull + (warship && k.shields ? 1 : 0) + (warship && k.plating ? 1 : 0) + (warship ? k.armor || 0 : 0) + (type === "frigate" && has(s, fid, "broodYards") ? 1 : 0),
    skill: warship ? base.skill + (k.targeting ? 1 : 0) + (fid === "hegemony" ? 1 : 0) + (k.lances ? 1 : 0) + (k.fireControl || 0) : 0,
    sensors: base.sensors + (k.sensors ? 1 : 0) + (k.scanners ? 1 : 0) + (relicHeld(s, fid, "oracle") ? 2 : 0) + (fid === "ylith" ? 2 : 0) + (has(s, fid, "resonanceArrays") ? 2 : 0),
    troops: (base.troops || 0) * (fid === "hegemony" ? 2 : 1) * (has(s, fid, "dropLegions") ? 1.5 : 1),
    cost: Math.round(base.cost * (has(s, fid, "orbitalYards") ? 0.8 : 1) * (proto(s, fid, "drones") ? 0.9 : 1) * ((type === "colony" || type === "outpost") && fid === "concord" ? 0.75 : 1) * (type === "frigate" && has(s, fid, "broodYards") ? 0.75 : 1) * (base.cost && sitesFor(s, fid, "shipyard").length ? 1 - SITES.kinds.shipyard.discount : 1)) };
}
// ---- the empire's Focus ----
export const focusOf = (s, fid) => (faction(s, fid).focus = faction(s, fid).focus || { industry: 1, science: 1, credits: 1, defense: 0 });
export const focusUsed = (s, fid) => Object.values(focusOf(s, fid)).reduce((t, n) => t + n, 0);
/** Set a priority's points (0–2), within the empire's Focus points. */
export function setFocus(s, fid, kind, n) {
  const fo = focusOf(s, fid); if (!(kind in FOCUS.kinds)) return { error: "No such priority." };
  n = Math.max(0, Math.min(2, Math.round(n)));
  if (focusUsed(s, fid) - fo[kind] + n > FOCUS.points) return { error: `Only ${FOCUS.points} Focus points: take one from another priority first.` };
  fo[kind] = n; return { ok: true };
}
// ---- supply ----
/** How far from its own colonies and fuel-depot outposts a faction's fleets stay in supply. */
export const supplyRange = (s, fid) => SUPPLY.range + (proto(s, fid, "tenders") ? 2 : 0);
/** The worlds that give a faction supply: its colonies, and its outposts with a Fuel depot. */
const isSupplySource = (s, x) => (x.colony.kind === "colony" || ((x.colony.buildings.depot || x.colony.buildings.station || x.site === "waystation") && !(x.colony.depotCut > s.turn))) && !blockaded(s, x);
export const supplySources = (s, fid) => coloniesOf(s, fid).filter((x) => isSupplySource(s, x));
/** A supply point is cut while an enemy at war has warships there. */
const cutAt = (s, fid, hex) => fleetsAt(s, hex).some((o) => armed(o) && atWar(s, fid, o.owner));
const cargoOf = (f) => f.ships.filter((x) => x.type === "tanker").reduce((t, x) => t + (x.cargo ?? SHIPS.tanker.cargo), 0);
/** Tankers parked (not moving) with fuel aboard, their system not cut: forward supply points. */
export const tankerPoints = (s, fid) => fleetsOf(s, fid).filter((f) => !f.path.length && cargoOf(f) > 0 && !cutAt(s, fid, f.at));
const baseSupplyAt = (s, fid, hex) => { const r = supplyRange(s, fid); return coloniesOf(s, fid).some((x) => distance(x.at, hex) <= r && isSupplySource(s, x)); };
export const inSupplyAt = (s, fid, hex) => fid === "vael" || isWild(fid) || fid === "traders" || baseSupplyAt(s, fid, hex) || tankerPoints(s, fid).some((t) => distance(t.at, hex) <= FUEL.tankerRange);
/** Draw a unit of fuel from a fleet's own tankers (the fullest first); false if they're dry. */
function drawCargo(f) {
  const t = f.ships.filter((x) => x.type === "tanker" && (x.cargo ?? SHIPS.tanker.cargo) > 0).sort((a, b) => (b.cargo ?? 12) - (a.cargo ?? 12))[0];
  if (!t) return false; t.cargo = (t.cargo ?? SHIPS.tanker.cargo) - 1; return true;
}
export { cargoOf };
export function inSupply(s, f) { return inSupplyAt(s, f.owner, f.at); }   // living hulls (the Vael) feed themselves
// ---- fuel ----
/** A fleet's fuel tank: its thirstiest ship's, in turns of travel beyond supply (living hulls and Warden machines need none). */
export const fuelMax = (s, f) => (f.owner === "vael" || isWild(f.owner) || f.owner === "traders" ? Infinity : Math.min(...f.ships.map((x) => (SHIPS[x.type].fuel || 99) + 2 * (fitOf(s, f.owner, x).tanks || 0))) + (hasOfficer(f, "navigator") ? 3 : 0));
export const fuelOf = (s, f) => Math.min(fuelMax(s, f), f.fuel ?? fuelMax(s, f));
// ---- the fuel reserve ----
/** Who keeps a fuel reserve: every power but the Vael (living hulls), the wild things and the traders. */
export const usesReserve = (fid) => fid !== "vael" && !isWild(fid) && fid !== "traders";
const isDepot = (s, x) => (x.colony.buildings.depot || x.colony.buildings.station || x.site === "waystation") && !(x.colony.depotCut > s.turn) && !blockaded(s, x);
/** The fuel a power's worlds make a turn: colonies a little, capitals and gas giants more, depots and stations most. */
export function fuelIncome(s, fid) {
  if (!usesReserve(fid)) return 0;
  let n = 0;
  for (const x of coloniesOf(s, fid)) {
    if (blockaded(s, x)) continue;
    const gas = x.world === "gas" ? FUEL.gas : 0;
    if (x.colony.kind === "colony") n += FUEL.perColony + (x.colony.capital ? FUEL.capital : 0) + gas;
    if (isDepot(s, x)) n += FUEL.perDepot + gas + (x.site === "waystation" ? SITES.kinds.waystation.fuel : 0);
  }
  return round1(n + miningIncome(s, fid).fuel);
}
/** How much fuel a power can store: more with every working depot or station. */
export const fuelCap = (s, fid) => FUEL.capBase + FUEL.capPerDepot * coloniesOf(s, fid).filter((x) => isDepot(s, x)).length;
export const fuelStock = (s, fid) => { const F = faction(s, fid); return F ? F.fuelStock ?? FUEL.start : 0; };
/** Take up to n from the reserve; returns what was taken. */
function drawReserve(s, fid, n) {
  if (!usesReserve(fid)) return n;
  const F = faction(s, fid), have = fuelStock(s, fid), d = Math.min(have, n);
  F.fuelStock = round1(have - d); return d;
}
/** What it costs to fill a fleet's tank from the reserve now. */
export const refuelCost = (s, f) => { const mx = fuelMax(s, f); return mx === Infinity || !usesReserve(f.owner) ? 0 : round1((mx - fuelOf(s, f)) * f.ships.length * FUEL.refuelPer); };
/** A fleet in supply refuels from the reserve, as far as the reserve allows. */
function refuel(s, f) {
  const mx = fuelMax(s, f);
  if (mx === Infinity || !usesReserve(f.owner) || !f.ships.length) { f.fuel = mx; return; }
  const miss = mx - fuelOf(s, f); if (miss <= 0) { delete f.dry; return; }
  const per = f.ships.length * FUEL.refuelPer, units = Math.min(miss, Math.floor((fuelStock(s, f.owner) + 1e-9) / per));
  if (units > 0) { drawReserve(s, f.owner, units * per); f.fuel = fuelOf(s, f) + units; }
  if (units < miss) f.dry = s.turn; else delete f.dry;
}
/** Burn hard: the fleet moves FUEL.burnSpeed farther each turn until it arrives, at a cost in fuel. */
export const burnCost = (s, f) => round1(f.ships.length * FUEL.burnPer * (hasOfficer(f, "navigator") ? 0.5 : 1));
export function setBurn(s, fleetId, on) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  if (!usesReserve(f.owner)) return { error: "Living hulls swim at their own pace: they can't be pushed." };
  f.burn = !!on; return { ok: true };
}
/** Buy a Fuel depot at an outpost of yours, with credits (an outpost has no industry). */
export function buildDepot(s, fid, sysId) {
  const sys = s.systems[sysId], c = sys && sys.colony, F = faction(s, fid);
  if (!c || c.owner !== fid) return { error: "That isn't yours." };
  if (c.kind !== "outpost") return { error: "A colony gives supply already; a fuel depot is for outposts." };
  if (c.buildings.depot) return { error: "It has a fuel depot." };
  if (F.credits < FUEL.depotCost) return { error: `A fuel depot costs ${FUEL.depotCost} credits.` };
  F.credits = round1(F.credits - FUEL.depotCost); c.buildings.depot = true;
  log(s, fid, `A fuel depot opened at ${sys.name}: the outpost gives supply, and fleets refuel there.`, "build");
  return { ok: true };
}
/** An outpost's sales a turn: { fuel, exotics, total } in credits. */
export function outpostSales(s, sys) {
  const c = sys.colony; if (!c || c.kind !== "outpost") return { fuel: 0, exotics: 0, total: 0 };
  if (blockaded(s, sys)) return { fuel: 0, exotics: 0, total: 0, blockaded: true };
  const pumps = (c.buildings.depot || c.buildings.station) && !(c.depotCut > s.turn);
  const fuel = pumps ? OUTPOST_TRADE.fuel + (sys.world === "gas" ? OUTPOST_TRADE.gas : 0) : 0, exotics = sys.exotics ? OUTPOST_TRADE.exotics : 0;
  return { fuel, exotics, total: OUTPOST_TRADE.base + fuel + exotics };
}
/** A deep-space station: an outpost ship, in an empty hex of open space (no system, no rift), with Orbital shipyards and
 * the credits for the station, founds one. It's an outpost with a station: guns, repairs, sight, supply, fuel sales,
 * territory. It can be invaded, blockaded and bombarded like any outpost; lose the station and the site is gone. */
export function canFoundStation(s, fleetId) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  if (!f.ships.some((x) => x.type === "outpost")) return { error: "It takes an outpost ship." };
  if (s.sysAt[f.at]) return { error: "That's a system: claim it as an outpost instead." };
  if (s.hexes[f.at].terrain === "rift") return { error: "Nothing can be built in a rift." };
  if (!has(s, f.owner, "orbitalYards")) return { error: "Deep-space stations need Orbital shipyards." };
  if (fleetsAt(s, f.at).some((o) => armed(o) && atWar(s, f.owner, o.owner))) return { error: "Not with hostile ships here." };
  const credits = Math.round(BUILDINGS.station.cost * OUTPOST_BUY.rate);
  if (faction(s, f.owner).credits < credits) return { error: `The station costs ${credits} credits, as well as the outpost ship.`, credits };
  return { ok: true, credits };
}
export function foundStation(s, fleetId) {
  const c = canFoundStation(s, fleetId); if (c.error) return c;
  const f = s.fleets[fleetId], F = faction(s, f.owner);
  f.ships.splice(f.ships.findIndex((x) => x.type === "outpost"), 1);
  F.credits = round1(F.credits - c.credits);
  const near = Object.values(s.systems).filter((x) => !x.deep).sort((a, b) => distance(a.at, f.at) - distance(b.at, f.at))[0];
  const base = `${near ? near.name : "Deep"} Station`, taken = new Set(Object.values(s.systems).map((x) => x.name));
  let name = base, n = 2; while (taken.has(name)) name = `${base} ${n++}`;
  s.deepSeq = (s.deepSeq || 0) + 1;
  const id = "d" + s.deepSeq;
  s.systems[id] = { id, name, at: f.at, world: "void", size: 1, rich: 1, exotics: false, ruins: false, deep: true,
    colony: { owner: f.owner, kind: "outpost", founded: s.turn, pop: 0, growth: 0, buildings: { station: true }, queue: [], stock: 0, defense: 0, capital: false } };
  s.sysAt[f.at] = id; s.adj[id] = [];
  s.systems[id].colony.defense = gunsMax(s, s.systems[id].colony);
  if (!f.ships.length) dropFleet(s, f);
  log(s, f.owner, `${F.name} built ${name} in deep space: ${BUILDINGS.station.text}`, "build");
  return { ok: true, id, name };
}
/** A deep-space site with no station (bombarded) or no owner (burned) is gone: nothing's left out there. */
function clearDeepSites(s) {
  for (const sys of Object.values(s.systems)) {
    if (!sys.deep || (sys.colony && sys.colony.buildings.station)) continue;
    if (sys.colony) log(s, sys.colony.owner, `${sys.name} is gone: without its station there's nothing left in that patch of space.`, "war");
    delete s.systems[sys.id]; delete s.sysAt[sys.at];
    for (const k of Object.keys(s.adj)) s.adj[k] = s.adj[k].filter((x) => x !== sys.id);
    delete s.adj[sys.id]; s.corridors = s.corridors.filter(([a, b]) => a !== sys.id && b !== sys.id);
  }
}
/** What an outpost of yours can buy with credits: the `anywhere` buildings it hasn't got, whose technology you have. */
export function outpostOptions(s, sysId) {
  const sys = s.systems[sysId], c = sys && sys.colony; if (!c || c.kind !== "outpost") return [];
  return Object.entries(BUILDINGS).filter(([b, d]) => d.anywhere && !c.buildings[b] && (!d.needs || has(s, c.owner, d.needs))).map(([b, d]) => ({ id: b, name: d.name, credits: Math.round(d.cost * OUTPOST_BUY.rate) }));
}
/** Buy an Orbital battery or station for an outpost of yours, with credits. Not while enemy warships hold its orbit. */
export function buildAtOutpost(s, fid, sysId, b) {
  const sys = s.systems[sysId], c = sys && sys.colony, F = faction(s, fid);
  if (!c || c.owner !== fid) return { error: "That isn't yours." };
  const o = outpostOptions(s, sysId).find((x) => x.id === b); if (!o) return { error: "That can't be built here." };
  if (besieged(s, sys)) return { error: "Not while enemy warships hold its orbit." };
  if (F.credits < o.credits) return { error: `It costs ${o.credits} credits.` };
  F.credits = round1(F.credits - o.credits); c.buildings[b] = true; c.defense = gunsMax(s, c);
  log(s, fid, `${sys.name} has ${/^[AEIOU]/.test(o.name) ? "an" : "a"} ${o.name.toLowerCase()} now: ${BUILDINGS[b].text}`, "build");
  return { ok: true };
}
/** Set a fleet's battle stance. */
export function setStance(s, fleetId, stance) { const f = s.fleets[fleetId]; if (!f || !STANCES[stance]) return { error: "No such stance." }; f.stance = stance; return { ok: true }; }
/** Open mode: no turn limit. After a win, keep ruling; in open mode, retire when you choose. */
export function keepRuling(s) {
  if (!s.winner || s.winner !== player(s).id) return { error: "Only after a victory of your own." };
  s.kept = (s.kept || []).concat([{ turn: s.turn, reason: s.winReason }]);
  const engineWin = s.winReason === "engine";
  s.winner = null; s.winReason = null; s.mode = "open";
  if (engineWin) { const at = coloniesOf(s, player(s).id).find((x) => x.colony.buildings.engine); if (at) s.engine = { sys: at.id, owner: player(s).id, built: s.turn, gate: s.turn }; }
  log(s, player(s).id, "The game goes on: open rule, with no end but the one you choose.", "victory");
  return { ok: true };
}
export function retire(s) {
  if (s.winner) return { error: "The game is already over." };
  s.winner = player(s).id; s.winReason = "retired";
  log(s, player(s).id, `${player(s).name} sets down the crown at turn ${s.turn}.`, "victory");
  return { ok: true };
}
// ---- admirals ----
/** Does this fleet's admiral have this trait? */
export const admTrait = (f, t) => !!(f && f.admiral && f.admiral.traits.includes(t));
export const admRank = (a) => ADMIRAL_RANKS[Math.min(a.traits.length, ADMIRAL_RANKS.length - 1)];
export const admTitle = (a) => `${admRank(a)} ${a.name}`;
/** Every admiral of a faction: commanding fleets, and in reserve. */
export function admiralsOf(s, fid) {
  return [...fleetsOf(s, fid).filter((f) => f.admiral).map((f) => ({ a: f.admiral, fleet: f })), ...((faction(s, fid).reserve || []).map((a) => ({ a, fleet: null })))];
}
/** How many admirals a power can keep: two, and one more for every four worlds, five at most. */
export const admiralCap = (s, fid) => Math.min(5, 2 + Math.floor(coloniesOf(s, fid).length / 4));
export function makeAdmiral(s, fid, R) {
  const pool = ADMIRAL_NAMES[fid] || ADMIRAL_NAMES.concord, F = faction(s, fid);
  const used = new Set([...(F ? admiralsOf(s, fid).map((x) => x.a.name) : []), ...((F && F.fallen) || []).map((x) => x.name)]);
  let name = "";
  for (let i = 0; i < 40 && (!name || used.has(name)); i++) name = `${pool.first[R.int(pool.first.length)]} ${pool.last[R.int(pool.last.length)]}`;
  return { id: "a" + s.nextId++, name, wins: 0, traits: [], since: s.turn, power: Object.keys(ADMIRAL_POWERS)[R.int(Object.keys(ADMIRAL_POWERS).length)] };
}
/** Two fleets join: the more seasoned admiral commands; the other goes to the reserve. */
function joinAdmirals(s, into, from) {
  // Officers come aboard the joined fleet, as many as it has room for; the rest go back to the pool.
  if (officersOf(from).length) { const all = [...officersOf(into), ...officersOf(from)]; into.officers = all.slice(0, OFFICERS.slots); officerPool(s, into.owner).push(...all.slice(OFFICERS.slots)); from.officers = []; }
  if (!from.admiral) return;
  if (!into.admiral) { into.admiral = from.admiral; return; }
  const [keep, spare] = into.admiral.wins >= from.admiral.wins ? [into.admiral, from.admiral] : [from.admiral, into.admiral];
  into.admiral = keep; const F = faction(s, into.owner); (F.reserve = F.reserve || []).push(spare);
}
/** A fleet that's no longer needed (used up, scrapped): its admiral goes to the reserve. */
export function dropFleet(s, f) {
  if (f.admiral) { const F = faction(s, f.owner); if (F) (F.reserve = F.reserve || []).push(f.admiral); }
  if (officersOf(f).length && faction(s, f.owner)) officerPool(s, f.owner).push(...f.officers);
  delete s.fleets[f.id];
}
export function assignAdmiral(s, fleetId, admId) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  const F = faction(s, f.owner), i = (F.reserve || []).findIndex((a) => a.id === admId);
  if (i < 0) return { error: "That admiral isn't in the reserve." };
  if (!armed(f)) return { error: "Admirals command warships." };
  const [a] = F.reserve.splice(i, 1);
  if (f.admiral) F.reserve.push(f.admiral);
  f.admiral = a; return { ok: true };
}
export function relieveAdmiral(s, fleetId) {
  const f = s.fleets[fleetId]; if (!f || !f.admiral) return { error: "No admiral here." };
  const F = faction(s, f.owner); (F.reserve = F.reserve || []).push(f.admiral); f.admiral = null; return { ok: true };
}
/** After a battle: the winners' admirals learn (a trait at 2, 4 and 7 wins); a winning fleet without one may find one;
 * an admiral whose fleet is destroyed is usually lost with it. Returns lines for the battle report. */
function admiralsAfterBattle(s, fleets, outcome, at, R) {
  const news = [], me = player(s).id;
  const say = (fid, text) => { news.push({ fid, text }); log(s, fid, text, "war"); };
  for (const f of fleets) {
    const F = faction(s, f.owner); if (!F || F.crisis || F.wild) continue;
    const gone = !s.fleets[f.id];
    if (f.admiral && gone) {
      const a = f.admiral; f.admiral = null;
      if (R.next() < 0.66) { (F.fallen = F.fallen || []).push({ name: admTitle(a), turn: s.turn, at, wins: a.wins }); say(F.id, `${F.id === me ? "Your" : F.name + "'s"} ${admTitle(a)} went down with the fleet at ${at}.`); }
      else { (F.reserve = F.reserve || []).push(a); say(F.id, `${admTitle(a)} escaped the wreck of ${F.id === me ? "your" : "their"} fleet at ${at}, and is back in the reserve.`); }
      continue;
    }
    if (gone || !armed(f)) continue;
    const res = outcome[F.id];
    if (res === "won") {
      if (f.admiral) {
        const a = f.admiral; a.wins++;
        if (ADMIRAL_STEPS.includes(a.wins)) {
          const fought = (s.battleWith || []).includes("wardens");
          const pool = Object.keys(ADMIRAL_TRAITS).filter((t) => !a.traits.includes(t) && (t !== "hunter" || fought || (s.crisis && s.crisis.stage === "awake")));
          if (pool.length) { const t = pool[R.int(pool.length)]; a.traits.push(t); if (F.id === me || player(s).met[F.id]) say(F.id, `For the victory at ${at}, ${a.name} is promoted to ${admRank(a)}: ${ADMIRAL_TRAITS[t].name} (${ADMIRAL_TRAITS[t].text})`); }
        }
      } else if (f.ships.filter((x) => SHIPS[x.type].skill).length >= 2 && admiralsOf(s, F.id).length < admiralCap(s, F.id) && R.next() < 0.35) {
        f.admiral = makeAdmiral(s, F.id, R); f.admiral.wins = 1;
        if (F.id === me) say(F.id, `Captain ${f.admiral.name} held the line at ${at}, and is given command of the fleet: ${admTitle(f.admiral)}.`);
      }
    } else if (res === "lost" && f.admiral && R.next() < 0.1) {
      const a = f.admiral; f.admiral = null; (F.fallen = F.fallen || []).push({ name: admTitle(a), turn: s.turn, at, wins: a.wins });
      say(F.id, `${F.id === me ? "Your" : F.name + "'s"} ${admTitle(a)} was killed on the bridge at ${at}. The fleet fights on without them.`);
    }
  }
  return news;
}

export function spawnFleet(s, owner, at, types) {
  const id = "f" + s.nextId++;
  s.fleets[id] = { id, owner, at, ships: types.map((t) => newShip(s, owner, t)), path: [], dest: null };
  return s.fleets[id];
}
export const fleetSpeed = (s, f) => Math.min(...f.ships.map((x) => shipStats(s, f.owner, x.type, x).speed)) + (admTrait(f, "swift") && f.ships.every((x) => SHIPS[x.type].speed > 0) ? 1 : 0);
export const armed = (f) => f.ships.some((x) => SHIPS[x.type].skill > 0);
// ---- cloaking and detection ----
/** A fleet of nothing but cloaked ships (stealth corvettes, Warden probes). */
export const cloaked = (f, s) => (!!s && powerOn(s, f, "ghost")) || (f.ships.length > 0 && f.ships.every((x) => SHIPS[x.type].cloak));
/** Whether power F sees fleet f: its own and its allies', anything in view that isn't cloaked, and a cloaked fleet only
 * inside F's detection range (F.detect, set with its vision each turn). */
export function seesFleet(s, F, f) {
  if (!F || f.owner === F.id) return true;
  if (!(F.visible || {})[f.at]) return false;
  if (!cloaked(f, s)) return true;
  if (s.factions.some((x) => x.id === f.owner) && s.factions.includes(F) && allied(s, F.id, f.owner)) return true;
  return !!(F.detect || {})[f.at];
}
// ---- home territory ----
let terrCache = null;
/** Who each hex belongs to: within 2 of a colony (1 of an outpost; the Kel's old colonies 3), the nearest world's
 * owner. { hex: { owner, d } }. Worked out again only when the worlds change. */
export function territoryOf(s) {
  const cols = Object.values(s.systems).filter((x) => x.colony);
  const sig = s.turn + "|" + cols.map((x) => x.id + x.colony.owner + x.colony.kind[0]).join(",");
  if (terrCache && terrCache.s === s && terrCache.sig === sig) return terrCache.map;
  const own = {};
  for (const sys of cols) {
    const c = sys.colony, reach = c.kind === "colony" ? 2 + (c.owner === "kel" && c.founded !== undefined && s.turn - c.founded >= HOME.kelAge ? 1 : 0) + (c.owner === "kel" && c.capital ? 1 : 0) : 1;
    for (const k of within(sys.at, reach)) { if (!s.hexes[k]) continue; const d = distance(k, sys.at), cur = own[k]; if (!cur || d < cur.d) own[k] = { d, owner: c.owner }; }
  }
  terrCache = { s, sig, map: own };
  return own;
}
export const territoryAt = (s, hex) => { const t = territoryOf(s)[hex]; return t ? t.owner : null; };
/** A fleet starting its turn in its own territory moves farther. */
const homeSpeed = (s, fid, hex) => (territoryAt(s, hex) === fid ? HOME.speed : 0);
// ---- admirals' powers ----
export const powerOf = (a) => a && (a.power || Object.keys(ADMIRAL_POWERS)[[...a.name].reduce((t, c) => t + c.charCodeAt(0), 0) % 4]);
export const powerOn = (s, f, id) => !!(f.power && f.power.id === id && f.power.turn === s.turn);
/** Turns until this fleet's admiral can use their power again (0: ready), or null with no admiral. */
export const powerWait = (s, f) => (f.admiral ? Math.max(0, (f.admiral.readyAt || 0) - s.turn) : null);
export function useAdmiralPower(s, fleetId) {
  const f = s.fleets[fleetId]; if (!f || !f.admiral) return { error: "It takes an admiral." };
  const id = powerOf(f.admiral), P = ADMIRAL_POWERS[id], w = powerWait(s, f);
  if (w > 0) return { error: `${P.name}: ready again in ${w} turn${w === 1 ? "" : "s"}.` };
  f.admiral.power = id; f.admiral.readyAt = s.turn + P.every; f.power = { id, turn: s.turn };
  if (id === "rally") for (const x of f.ships) x.hull = Math.min(shipStats(s, f.owner, x.type, x).hull, x.hull + 2);
  if (!faction(s, f.owner).ai) log(s, f.owner, `${admTitle(f.admiral)}: ${P.name}. ${P.text}`, "war");
  return { ok: true, id };
}
// ---- officers ----
export const officersOf = (f) => (f && f.officers) || [];
export const hasOfficer = (f, kind) => !!(f && f.officers && f.officers.some((o) => o.kind === kind));
export const officerPool = (s, fid) => { const F = faction(s, fid); return (F && (F.officers = F.officers || [])) || []; };
/** A new officer joins a power's pool (why: "from the ruins at X", ...). kind: one of OFFICERS.kinds, or picked by R. */
export function gainOfficer(s, fid, why, R, kind) {
  const F = faction(s, fid); if (!F || !s.factions.includes(F)) return null;
  const kinds = Object.keys(OFFICERS.kinds), r = R || makeRng("officer:" + s.seed + ":" + s.turn + ":" + fid + ":" + (F.officersGot || 0));
  kind = kind || kinds[r.int(kinds.length)];
  const used = new Set([...officerPool(s, fid), ...fleetsOf(s, fid).flatMap(officersOf)].map((o) => o.name)), free = OFFICERS.names.filter((n) => !used.has(n));
  const o = { id: "o" + s.nextId++, kind, name: free.length ? free[r.int(free.length)] : OFFICERS.names[r.int(OFFICERS.names.length)] };
  F.officersGot = (F.officersGot || 0) + 1; officerPool(s, fid).push(o);
  if (!F.ai) log(s, fid, `A new officer: ${OFFICERS.kinds[kind].name} ${o.name}, ${why}. ${OFFICERS.kinds[kind].text} Assign them to a fleet from its panel.`, "build");
  return o;
}
export function assignOfficer(s, fleetId, offId) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  const pool = officerPool(s, f.owner), i = pool.findIndex((o) => o.id === offId); if (i < 0) return { error: "No such officer in the pool." };
  if (officersOf(f).length >= OFFICERS.slots) return { error: `A fleet has room for ${OFFICERS.slots} officers.` };
  (f.officers = f.officers || []).push(pool.splice(i, 1)[0]); return { ok: true };
}
export function recallOfficer(s, fleetId, offId) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  const i = officersOf(f).findIndex((o) => o.id === offId); if (i < 0) return { error: "No such officer aboard." };
  officerPool(s, f.owner).push(f.officers.splice(i, 1)[0]); return { ok: true };
}
// ---- key sites ----
/** Mark a few systems as key sites, away from the capitals and from each other. */
export function placeSites(s) {
  if (s.sitesPlaced) return; s.sitesPlaced = true;
  const R = makeRng("sites:" + s.seed), caps = s.factions.map((F) => s.systems[F.capital] && s.systems[F.capital].at).filter(Boolean);
  const pool = Object.values(s.systems).filter((x) => !x.deep && !x.colony && !s.hexes[x.at].sealed && caps.every((c) => distance(c, x.at) >= SITES.fromCapital)).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (let i = pool.length - 1; i > 0; i--) { const j = R.int(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const want = Math.max(SITES.min, Math.round(Object.values(s.systems).filter((x) => !x.deep).length / SITES.per)), kinds = Object.keys(SITES.kinds), got = [];
  for (const x of pool) { if (got.length >= want) break; if (got.some((y) => distance(y.at, x.at) < SITES.apart)) continue; x.site = kinds[got.length % kinds.length]; got.push(x); }
  s.siteList = got.map((x) => x.id);
}
export const siteSystems = (s) => (s.siteList || []).map((id) => s.systems[id]).filter(Boolean);
/** Key sites of this kind whose bonus this power has: held by it, or by an ally. */
export const sitesFor = (s, fid, kind) => siteSystems(s).filter((x) => x.site === kind && x.colony && (x.colony.owner === fid || (s.factions.some((F) => F.id === x.colony.owner) && s.factions.some((F) => F.id === fid) && allied(s, fid, x.colony.owner))));
/** Tell the powers when a key site changes hands. */
function sitesTurn(s) {
  for (const x of siteSystems(s)) {
    const now = x.colony ? x.colony.owner : null; if (now === (x.siteHolder ?? null)) continue;
    const K = SITES.kinds[x.site];
    if (now) log(s, now, `${faction(s, now).name} holds the ${K.name} at ${x.name}: ${K.text}`, "build");
    if (x.siteHolder && faction(s, x.siteHolder)) log(s, x.siteHolder, `The ${K.name} at ${x.name} is lost${now ? ` to ${faction(s, now).name}` : ""}.`, "war");
    x.siteHolder = now;
  }
}
// ---- space mining ----
export const fieldAt = (s, hex) => (s.fields && s.fields[hex]) || null;
/** Scatter mining fields through open space: MINING.near hexes from a system, apart from each other and from capitals. */
export function placeFields(s, hexes = null, tag = "", want = null) {
  s.fields = s.fields || {};
  const R = makeRng("fields:" + s.seed + tag);
  const sysAt = Object.values(s.systems).filter((x) => !x.deep).map((x) => x.at);
  const caps = s.factions.map((F) => s.systems[F.capital] && s.systems[F.capital].at).filter(Boolean);
  const pool = (hexes || Object.keys(s.hexes)).filter((k) => s.hexes[k] && s.hexes[k].terrain !== "rift" && !s.sysAt[k]).sort();
  for (let i = pool.length - 1; i > 0; i--) { const j = R.int(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  let n = want ?? Math.round(sysAt.length * MINING.density);
  const kinds = Object.entries(MINING.kinds);
  for (const k of pool) {
    if (n <= 0) break;
    const d = Math.min(...sysAt.map((h) => distance(h, k)));
    if (d < MINING.near[0] || d > MINING.near[1] || caps.some((c) => distance(c, k) < 3) || Object.keys(s.fields).some((h) => distance(h, k) < MINING.apart)) continue;
    let roll = R.next(), kind = kinds[0][0]; for (const [id, K] of kinds) { if (roll < K.odds) { kind = id; break; } roll -= K.odds; }
    const K = MINING.kinds[kind], size = K.size[0] + R.int(K.size[1] - K.size[0] + 1);
    s.fields[k] = { kind, left: size, size }; n--;
  }
}
/** What a power's mining ships take this turn: one entry per field being mined. A ship mines only parked (not moving),
 * and not while enemy warships hold the field. */
export function miningYields(s, fid) {
  const out = []; if (!s.fields) return out;
  const at = {};
  for (const f of fleetsOf(s, fid)) {
    const fd = s.fields[f.at]; if (!fd || fd.left <= 0 || f.path.length) continue;
    const n = f.ships.filter((x) => SHIPS[x.type].mine).length; if (!n) continue;
    if (fleetsAt(s, f.at).some((o) => o.owner !== fid && armed(o) && atWar(s, fid, o.owner))) continue;
    at[f.at] = (at[f.at] || 0) + n;
  }
  for (const [hex, n0] of Object.entries(at)) {
    const fd = s.fields[hex], K = MINING.kinds[fd.kind], n = Math.min(n0, MINING.perField);
    const station = coloniesOf(s, fid).some((x) => x.deep && x.colony.buildings.station && distance(x.at, hex) <= MINING.stationRange);
    out.push({ hex, kind: fd.kind, res: K.res, n, idle: n0 - n, station, amt: round1(Math.min(fd.left, n * K.per * (station ? 1 + MINING.stationBonus : 1))) });
  }
  return out;
}
export const miningIncome = (s, fid) => { const t = { credits: 0, fuel: 0, exotics: 0 }; for (const y of miningYields(s, fid)) t[y.res] = round1(t[y.res] + y.amt); return t; };
/** After the economy (which counted the credits and fuel): exotics (a whole one at a time), and the fields run down. */
function miningTurn(s) {
  if (!s.fields) return;
  for (const F of s.factions) if (F.alive) for (const y of miningYields(s, F.id)) {
    const fd = s.fields[y.hex]; if (!fd) continue;
    if (y.res === "exotics") { F.exoCarry = round1((F.exoCarry || 0) + y.amt); const w = Math.floor(F.exoCarry + 1e-9); if (w) { F.exotics += w; F.exoCarry = round1(F.exoCarry - w); } }
    F.stats.mined = round1((F.stats.mined || 0) + y.amt);
    fd.left = round1(fd.left - y.amt);
    if (fd.left <= 0) { delete s.fields[y.hex]; log(s, F.id, `The ${MINING.kinds[fd.kind].name.toLowerCase()} near ${nearestName(s, y.hex)} is mined out. Send its mining ships on to another field.`, "build"); }
  }
}

// ---- worlds ----
export function canSettle(s, fid, sys, kind) {
  if (sys.colony) return false;
  if (fleetsAt(s, sys.at).some((o) => armed(o) && atWar(s, fid, o.owner))) return false;   // a swarm (or an enemy) holds it: clear it first
  const w = WORLDS[sys.world];
  if (kind === "outpost") return true;
  return !w.outpostOnly && (!w.needs || has(s, fid, w.needs));
}
export function maxPop(s, sys) {
  const c = sys.colony; if (!c || c.kind !== "colony") return 0;
  return WORLDS[sys.world].pop + sys.size * 2 + (has(s, c.owner, "terraforming") ? 2 : 0) + (c.owner === "kel" ? 2 : 0) + (c.owner === "mirrun" && sys.world === "ocean" ? 3 : 0) + (proto(s, c.owner, "arcologies") ? 1 : 0)
    + (c.buildings.habitat ? 2 : 0) + advLevel(s, c.owner, "habitats") + (relicHeld(s, c.owner, "seeds") ? 2 : 0);
}
/** What a world gives each turn: { ind, sci, cr, exo, upkeep }. */
export function yields(s, sys) {
  const c = sys.colony; if (!c) return { ind: 0, sci: 0, cr: 0, exo: 0, upkeep: 0 };
  const w = WORLDS[sys.world], fid = c.owner, B = c.buildings || {};
  let ind = 0, sci = 0, cr = 0;
  if (c.kind === "colony") {
    ind = c.pop * w.ind * sys.rich + (has(s, fid, "automation") ? 1 : 0) + (c.capital ? 2 : 0);
    sci = c.pop * 0.5 * w.sci + (B.lab ? 2 : 0) + (B.observatory ? 3 : 0) + (c.capital ? 1 : 0) + Object.keys(B).filter((b) => B[b] && BUILDINGS[b] && BUILDINGS[b].hub).length * 2;   // a signature technology's hub
    cr = c.pop * 0.6 + (B.market ? 3 + (has(s, fid, "commerce") ? 2 : 0) : 0) + (has(s, fid, "commerce") ? 1 : 0) + (c.capital ? 2 : 0);
    if (B.factory) ind *= 1.5;
    if (B.lab) sci *= 1.5;
    if (fid === "tessan") cr *= 1.25;
    if (fid === "mirrun") sci *= 1.2;
    const fo = focusOf(s, fid);   // the empire's Focus
    ind *= 1 + 0.1 * fo.industry; sci *= 1 + 0.1 * fo.science; cr *= 1 + 0.1 * fo.credits;
    if (relicHeld(s, fid, "forge")) ind *= s.relics.forge.at === sys.id ? 1.5 : 1.1;
    if (relicHeld(s, fid, "archive")) sci *= 1.2;
    if (relicHeld(s, fid, "crown")) cr *= 1.2;
    ind *= 1 + 0.05 * advLevel(s, fid, "efficiency"); sci *= 1 + 0.05 * advLevel(s, fid, "theory"); cr *= 1 + 0.05 * advLevel(s, fid, "banking");
    const bo = faction(s, fid).boost;   // a golden age from a galactic event: +25% to one output for a few turns
    if (bo && s.turn <= bo.until) { if (bo.kind === "industry") ind *= 1.25; else if (bo.kind === "science") sci *= 1.25; else cr *= 1.25; }
    cr += tradeIncome(s, sys);
    if (engineActive(s, fid)) cr += ENGINE.tradePerColony;   // the corridor network
    if (blockaded(s, sys)) { ind *= SIEGE.industry; cr *= SIEGE.credits; }
  } else cr = outpostSales(s, sys).total;
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
  sci *= 1 + SCIENCE.pactBonus * pacts(s, fid);
  const mine = miningIncome(s, fid).credits; cr += mine;
  return { cr: round1(cr), sci: round1(sci), ind: round1(ind), exo, upkeep: round1(upkeep), net: round1(cr - upkeep), mine };
}

// ---- what a world can build ----
export function buildOptions(s, sys) {
  const c = sys.colony, fid = c.owner, out = [];
  if (c.kind !== "colony") return out;
  if (c.buildings.shipyard) for (const [t, d] of Object.entries(SHIPS)) if (!d.warden && !d.wild && !d.trader && (!d.needs || has(s, fid, d.needs))) out.push({ kind: "ship", id: t, name: shipLabel(fid, t), cost: Math.round(shipStats(s, fid, t).cost * (c.buildings.drydock ? 1 - YARDS.discount : 1)), exotics: d.exotics || 0 });
  for (const [b, d] of Object.entries(BUILDINGS)) {
    if (d.outpost || c.buildings[b] || (d.needs && !has(s, fid, d.needs)) || c.queue.some((q) => q.id === b)) continue;   // a depot is for outposts (buildDepot)
    if (d.wonder && !c.capital) continue;
    if (b === "engine" && engineStanding(s)) continue;   // only one can stand (or charge) at a time
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
export function availableTechs(s, fid) { const done = faction(s, fid).research.done; return TECHS.filter((t) => !done.includes(t.id) && (!t.only || t.only === fid) && t.needs.every((n) => done.includes(n))); }
/** An advance as something to research: { id: "adv:<id>", name, cost, text, level (the one it gives), max, field }. */
export function advanceItem(s, fid, id) {
  const a = ADVANCES.find((x) => x.id === id); if (!a) return null;
  const lv = advLevel(s, fid, id);
  return { ...a, id: "adv:" + id, adv: id, level: lv + 1, have: lv, name: `${a.name} ${["I", "II", "III", "IV", "V", "VI"][lv] || lv + 1}`, cost: Math.round(a.cost * (1 + 0.5 * lv)) };
}
/** The advances a power can research now: their technology done, and levels left. */
export function availableAdvances(s, fid) {
  return ADVANCES.filter((a) => has(s, fid, a.needs) && advLevel(s, fid, a.id) < a.max).map((a) => advanceItem(s, fid, a.id));
}
/** What a power is researching now (a technology or an advance), or null. */
export function researchItem(s, fid) {
  const cur = faction(s, fid).research.current; if (!cur) return null;
  return cur.startsWith("adv:") ? advanceItem(s, fid, cur.slice(4)) : TECHS.find((x) => x.id === cur) || null;
}
/** Research pacts: each trade treaty with a living power, up to SCIENCE.pactMax, adds SCIENCE.pactBonus to science. */
export const pacts = (s, fid) => Math.min(SCIENCE.pactMax, Object.entries(faction(s, fid).relations || {}).filter(([o, r]) => r.treaty && faction(s, o) && faction(s, o).alive).length);
export function setResearch(s, fid, techId) {
  if (String(techId).startsWith("adv:")) {
    if (!availableAdvances(s, fid).some((a) => a.id === techId)) return { error: "Not available yet." };
    faction(s, fid).research.current = techId; return { ok: true };
  }
  if (!availableTechs(s, fid).some((t) => t.id === techId)) return { error: "Not available yet." };
  const R = faction(s, fid).research; if (R.current !== techId) { R.current = techId; } return { ok: true };
}

// ---- movement ----
const corridorCost = (s, fid) => (engineActive(s, fid) ? 0 : has(s, fid, "corridorTheory") ? 0.25 : 1);
/** The cheapest path from a hex to another: [{ hex, cost }] steps (the first step's hex is the next hex). */
/** Sealed sectors: only the wild things, and powers with Rift drives, cross into one before a Rift beacon opens it. */
export const canCrossSealed = (s, fid) => isWild(fid) || has(s, fid, "riftDrives");
/** Where a power could build a Rift beacon: its worlds within SECTORS.beacon.range of a sealed sector. */
export function beaconSites(s, fid) {
  const sealed = Object.keys(s.hexes).filter((k) => s.hexes[k].sealed); if (!sealed.length) return [];
  return coloniesOf(s, fid).filter((x) => !blockaded(s, x)).map((x) => { const near = sealed.filter((k) => distance(k, x.at) <= SECTORS.beacon.range); return near.length ? { sys: x, kind: s.hexes[near[0]].sealed } : null; }).filter(Boolean);
}
/** Build a Rift beacon: the sealed sector next to this world opens for everyone, with a corridor from here into it. */
export function buildBeacon(s, fid, sysId) {
  const F = faction(s, fid), site = beaconSites(s, fid).find((o) => o.sys.id === sysId);
  if (!site) return { error: `A Rift beacon goes on a world of yours within ${SECTORS.beacon.range} hexes of a sealed sector.` };
  const B = SECTORS.beacon;
  if (F.credits < B.credits || F.exotics < B.exotics) return { error: `A Rift beacon costs ${B.credits} credits and ${B.exotics} exotics.` };
  F.credits = round1(F.credits - B.credits); F.exotics -= B.exotics;
  const kind = site.kind;
  for (const h of Object.values(s.hexes)) if (h.sealed === kind) delete h.sealed;
  const inner = Object.values(s.systems).filter((x) => x.sector === kind).sort((a, b) => distance(a.at, site.sys.at) - distance(b.at, site.sys.at))[0];
  if (inner && !s.adj[site.sys.id].includes(inner.id)) { s.adj[site.sys.id].push(inner.id); s.adj[inner.id].push(site.sys.id); s.corridors.push([site.sys.id, inner.id]); }
  site.sys.colony.beacon = s.turn;
  (s.sectors.unsealed = s.sectors.unsealed || {})[kind] = { turn: s.turn, by: fid, at: site.sys.id };
  const name = SECTORS.kinds[kind] ? SECTORS.kinds[kind].name : "the sealed sector";
  log(s, null, `${F.name} lit a Rift beacon at ${site.sys.name}: ${name} is open to every power now${inner ? `, with a corridor from ${site.sys.name} to ${inner.name}` : ""}.`, "explore");
  s.log[s.log.length - 1].sector = true;
  return { ok: true };
}
export function findPath(s, fid, from, to) {
  if (!s.hexes[to] || s.hexes[to].terrain === "rift") return null;
  if (s.hexes[to].sealed && !canCrossSealed(s, fid)) return null;
  const dist = { [from]: 0 }, prev = {}, open = [[0, from]], cc = corridorCost(s, fid), cross = canCrossSealed(s, fid);
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [d, k] = open.shift();
    if (k === to) break;
    if (d > dist[k]) continue;
    const steps = neighbors(k).filter((n) => s.hexes[n] && s.hexes[n].terrain !== "rift" && (!s.hexes[n].sealed || cross)).map((n) => [n, s.hexes[n].terrain === "nebula" ? 2 : 1]);
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
// ---- muster points: standing orders for where newly built ships go ----
export const MUSTER_KINDS = { warship: "Warships", transport: "Troop transports", tanker: "Fuel tankers", settler: "Colony and outpost ships", scout: "Scouts" };
export const musterKind = (type) => (SHIPS[type].skill > 0 ? "warship" : type === "transport" ? "transport" : type === "tanker" ? "tanker" : type === "colony" || type === "outpost" ? "settler" : "scout");
const musterOk = (s, fid, id) => !!(id && s.systems[id] && s.systems[id].colony && s.systems[id].colony.owner === fid);
/** Send every new ship (kind "all"), or every new ship of one kind, to one of your worlds or outposts; null clears it. */
export function setMuster(s, fid, kind, sysId) {
  if (kind !== "all" && !MUSTER_KINDS[kind]) return { error: "No such kind of ship." };
  if (sysId && !musterOk(s, fid, sysId)) return { error: "A muster point has to be one of your worlds or outposts." };
  const F = faction(s, fid); F.muster = F.muster || {};
  if (sysId) F.muster[kind] = sysId; else delete F.muster[kind];
  return { ok: true };
}
/** Where a new ship of this type goes: its kind's muster point, else the one for all ships, else nowhere (null). */
export function musterFor(s, fid, type) {
  const M = faction(s, fid).muster || {}, id = M[musterKind(type)] || M.all;
  return musterOk(s, fid, id) ? s.systems[id] : null;
}
/** Where a fleet ends each turn along a path, moving step by step as moveFleets does (a step it can't afford waits
 * for the next turn): the index of the last step reached each turn. Its length is the turns the trip takes. */
export function turnStops(s, f, path = f.path, speed = fleetSpeed(s, f) + (f.burn ? FUEL.burnSpeed : 0)) {
  const stops = []; let i = 0;
  while (i < path.length && stops.length < 200) {
    let mp = speed + homeSpeed(s, f.owner, i ? path[i - 1].hex : f.at), moved = false;   // a turn begun in home territory goes farther
    while (i < path.length && mp + 1e-9 >= path[i].cost) { mp -= path[i].cost; i++; moved = true; }
    if (!moved) { mp = speed; if (path[i].cost > speed) i++; }   // a step that costs more than a whole turn's move still takes a turn
    stops.push(i - 1);
  }
  return stops;
}
export function setDestination(s, fleetId, hex) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  if (hex === f.at) { f.path = []; f.dest = null; return { ok: true }; }
  const path = findPath(s, f.owner, f.at, hex);
  if (!path && s.hexes[hex] && s.hexes[hex].sealed && !canCrossSealed(s, f.owner)) return { error: "That sector is sealed: it takes Rift drives, or a Rift beacon on a world near it, to get in." };
  if (!path) return { error: "No way there." };
  f.path = path; f.dest = hex; return { ok: true, turns: turnStops(s, f).length };
}
export function mergeFleets(s, intoId, fromId) {
  const a = s.fleets[intoId], b = s.fleets[fromId];
  if (!a || !b || a.owner !== b.owner || a.at !== b.at) return { error: "They need to be in the same place." };
  const fu = Math.min(fuelOf(s, a), fuelOf(s, b)); a.ships.push(...b.ships); a.fuel = Math.min(fu, fuelMax(s, a)); joinAdmirals(s, a, b); delete s.fleets[fromId]; return { ok: true };
}
/**
 * Split ships of one type off into a new fleet at the same place: n of them (1 by default), "half", or "all". The most
 * damaged go first, so a fleet can send its wounded home. The admiral stays; at least one ship stays with them.
 */
// ---- engagements: withdrawing, and detaching ships to send them on ----
/** A fleet is engaged when it's armed and shares its hex with armed enemies at war, or an enemy world's working guns:
 * the battle goes on each turn, and it can't simply sail away. It can withdraw (setWithdraw). */
export function engaged(s, f) {
  if (!f || !armed(f) || isWild(f.owner) || f.owner === "traders") return false;
  if (fleetsAt(s, f.at).some((o) => o.owner !== f.owner && armed(o) && atWar(s, f.owner, o.owner))) return true;
  const sid = s.sysAt[f.at], sys = sid && s.systems[sid];
  return !!(sys && sys.colony && atWar(s, f.owner, sys.colony.owner) && gunsUp(sys));
}
/** Withdraw from an engagement: the fleet fights the next battle's first exchange (defensively), then breaks off and
 * pulls back toward the nearest world of its power's (or where it came from); the enemy gets no more shots at it. */
export function setWithdraw(s, fleetId, on = true) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  if (!on) { delete f.withdraw; return { ok: true }; }
  if (!engaged(s, f)) return { error: "It isn't in an engagement: just move it." };
  if (f.ships.some((x) => !shipStats(s, f.owner, x.type, x).speed)) return { error: "It can't move, so it can't withdraw." };
  f.withdraw = s.turn; f.path = []; f.dest = null; f.sentry = false; return { ok: true };
}
/** After the battles: fleets that withdrew pull back, as far as a turn's move takes them. */
function withdrawals(s) {
  for (const f of Object.values(s.fleets)) {
    if (!f.withdraw) continue;
    delete f.withdraw;
    if (!f.ships.length) continue;
    const here = f.at, home = (f.repairAt && s.systems[f.repairAt] && s.systems[f.repairAt].colony && s.systems[f.repairAt].colony.owner === f.owner ? [s.systems[f.repairAt]] : coloniesOf(s, f.owner)).filter((x) => x.at !== here && !fleetsAt(s, x.at).some((o) => armed(o) && atWar(s, f.owner, o.owner)))
      .map((x) => ({ x, p: findPath(s, f.owner, here, x.at) })).filter((o) => o.p).sort((a, b) => a.p.reduce((t, y) => t + y.cost, 0) - b.p.reduce((t, y) => t + y.cost, 0))[0];
    const to = home ? home.x.at : f.from && f.from !== here ? f.from : null;
    const path = to ? (home ? home.p : findPath(s, f.owner, here, to)) : null;
    if (!path || !path.length) { log(s, f.owner, `Your fleet at ${nearestName(s, here)} tried to withdraw, but had nowhere to go.`, "war"); continue; }
    let mp = fleetSpeed(s, f);
    f.path = path; f.dest = to;
    while (f.path.length && mp + 1e-9 >= f.path[0].cost) { const st = f.path.shift(); mp -= st.cost; f.from = f.at; f.at = st.hex; if (fleetsAt(s, f.at).some((o) => atWar(s, f.owner, o.owner) && armed(o))) { f.path = []; break; } }
    if (!f.path.length) f.dest = null;
    log(s, f.owner, `Your fleet withdrew from ${nearestName(s, here)}${home ? ` toward ${home.x.name}` : ""}.`, "war");
  }
}
// ---- repairs: damaged ships to the yards ----
export const damagedShips = (s, f) => f.ships.filter((x) => x.hull < shipStats(s, f.owner, x.type, x).hull);
/** The best place to repair these ships from here: the soonest done, counting the trip and the repair (a drydock
 * mends everything at once, a station 2 hull a turn, any other world of the power's 1). { sys, turns, how } or null. */
export function repairPlace(s, fid, hex, ships, speedOf) {
  const worst = Math.max(0, ...ships.map((x) => shipStats(s, fid, x.type, x).hull - x.hull));
  let best = null;
  for (const x of coloniesOf(s, fid)) {
    if (besieged(s, x)) continue;
    const path = x.at === hex ? [] : findPath(s, fid, hex, x.at); if (!path) continue;
    const trip = path.length ? turnStops(s, { ships, owner: fid, burn: false }, path, speedOf).length : 0;
    const B = x.colony.buildings, how = B.drydock ? "drydock" : B.station ? "station" : "world";
    const turns = trip + (how === "drydock" ? 1 : how === "station" ? Math.ceil(worst / YARDS.station) : worst);
    if (!best || turns < best.turns) best = { sys: x, turns, how };
  }
  return best;
}
/** Send a fleet's damaged ships for repairs: split off (the soundest stay, with the admiral), to the best place to
 * repair, withdrawing first if the fleet is engaged; with rejoin, they come back to the fleet once mended. */
export function sendForRepairs(s, fleetId, rejoin = false, only = null) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  const hurt = damagedShips(s, f).filter((x) => !only || only.includes(x)); if (!hurt.length) return { error: "No ship in this fleet is damaged." };
  if (hurt.some((x) => !shipStats(s, f.owner, x.type, x).speed)) return { error: "These can't move." };
  const speed = Math.min(...hurt.map((x) => shipStats(s, f.owner, x.type, x).speed)) + (admTrait(f, "swift") ? 1 : 0);
  const place = repairPlace(s, f.owner, f.at, hurt, speed); if (!place) return { error: "There's nowhere of yours to repair them that they can reach." };
  let go = f;
  if (hurt.length < f.ships.length) {
    const fu = fuelOf(s, f); f.ships = f.ships.filter((x) => !hurt.includes(x));
    go = spawnFleet(s, f.owner, f.at, []); go.ships.push(...hurt); if (f.stance) go.stance = f.stance;
    go.fuel = Math.min(fu, fuelMax(s, go)); f.fuel = Math.min(fu, fuelMax(s, f));
  }
  go.repairAt = place.sys.id; go.rejoin = rejoin && go !== f ? f.id : null; go.sentry = false;
  const engagedNow = engaged(s, go);
  if (engagedNow) { const w = setWithdraw(s, go.id); if (w.error) return w; }
  else if (go.at !== place.sys.at && setDestination(s, go.id, place.sys.at).error) return { error: `No way to ${place.sys.name} from here.` };
  return { ok: true, fleet: go.id, ships: hurt.length, to: place.sys.name, how: place.how, turns: place.turns, withdrawing: engagedNow, split: go !== f };
}
/** Each turn: ships sent for repairs that are mended go back to their fleet (if asked), following it if it moved. */
function repairsTurn(s) {
  for (const f of Object.values(s.fleets)) {
    if (!f.repairAt || f.withdraw) continue;
    const place = s.systems[f.repairAt], mended = !damagedShips(s, f).length;
    if (!mended) { if (place && place.colony && place.colony.owner === f.owner && f.at !== place.at && !f.path.length) setDestination(s, f.id, place.at); continue; }
    const back = f.rejoin && s.fleets[f.rejoin];
    if (!f.rejoined && !faction(s, f.owner).ai) log(s, f.owner, `Your ships at ${place ? place.name : "the yards"} are repaired${back ? ", and heading back to their fleet" : ""}.`, "build");
    f.rejoined = true;
    if (!back) { delete f.repairAt; delete f.rejoin; delete f.rejoined; continue; }
    if (back.at === f.at && !back.path.length) { back.ships.push(...f.ships); joinAdmirals(s, back, f); delete s.fleets[f.id]; continue; }
    if (f.dest !== back.at) setDestination(s, f.id, back.at);
  }
}
/** Detach ships from a fleet into a fleet of their own, to send somewhere: counts by type ({ cruiser: 3, frigate: 2 }).
 * The soundest ships go (they're going to fight); the admiral stays with the fleet. */
export function detachShips(s, fleetId, counts) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  const go = [];
  for (const [type, n] of Object.entries(counts || {})) {
    const k = Math.floor(+n) || 0; if (k <= 0) continue;
    const max = shipStats(s, f.owner, type).hull;
    go.push(...f.ships.filter((x) => x.type === type).sort((a, b) => b.hull / max - a.hull / max).slice(0, k));
  }
  if (!go.length) return { error: "Choose how many ships to detach." };
  if (go.length >= f.ships.length) return { error: "That's the whole fleet: just move it." };
  const fu = fuelOf(s, f);
  f.ships = f.ships.filter((x) => !go.includes(x));
  const nf = spawnFleet(s, f.owner, f.at, []); nf.ships.push(...go);
  if (f.stance) nf.stance = f.stance;
  nf.fuel = Math.min(fu, fuelMax(s, nf)); f.fuel = Math.min(fu, fuelMax(s, f));
  return { ok: true, fleet: nf.id, ships: go.length };
}
export function splitFleet(s, fleetId, type, n = 1) {
  const f = s.fleets[fleetId]; if (!f) return { error: "No such fleet." };
  const of = f.ships.filter((x) => x.type === type);
  if (!of.length || f.ships.length < 2) return { error: "Nothing to split off." };
  let k = n === "all" ? of.length : n === "half" ? Math.max(1, Math.floor(of.length / 2)) : Math.max(1, Math.min(of.length, Math.floor(+n) || 1));
  if (k >= f.ships.length) k = f.ships.length - 1;   // never the whole fleet: that's just moving it
  if (k < 1) return { error: "Nothing to split off." };
  const max = shipStats(s, f.owner, type).hull;
  const go = of.slice().sort((a, b) => a.hull / max - b.hull / max).slice(0, k);
  f.ships = f.ships.filter((x) => !go.includes(x));
  const fu = fuelOf(s, { ...f, ships: [...f.ships, ...go] }), nf = spawnFleet(s, f.owner, f.at, []); nf.ships.push(...go);
  if (f.stance) nf.stance = f.stance;
  nf.fuel = Math.min(fu, fuelMax(s, nf)); f.fuel = Math.min(fu, fuelMax(s, f));
  return { ok: true, fleet: nf.id, moved: k };
}
/** Ships that reached their muster point join a resting fleet of their own kind there (warships already do). */
function joinMustered(s) {
  for (const f of Object.values(s.fleets)) {
    if (!f.muster || f.path.length || !s.fleets[f.id]) continue;
    const kind = f.muster; delete f.muster;
    const into = fleetsAt(s, f.at).find((o) => o !== f && o.owner === f.owner && !o.path.length && !o.muster && o.ships.length && o.ships.every((x) => musterKind(x.type) === kind));
    if (into) { const fu = Math.min(fuelOf(s, into), fuelOf(s, f)); into.ships.push(...f.ships); into.fuel = Math.min(fu, fuelMax(s, into)); joinAdmirals(s, into, f); delete s.fleets[f.id]; }
  }
}
function moveFleets(s) {
  for (const f of Object.values(s.fleets)) {
    if (f.withdraw) continue;   // it fights the first exchange, then pulls back (withdrawals)
    // Engaged: it can't just sail away from the battle; withdrawing is the way out.
    if (f.path.length && engaged(s, f) && !powerOn(s, f, "jump")) { if (!faction(s, f.owner).ai && f.pinned !== s.turn) log(s, f.owner, `Your fleet at ${nearestName(s, f.at)} is engaged and can't just leave: fight on, or order it to withdraw.`, "war"); f.pinned = s.turn; continue; }
    let mp = fleetSpeed(s, f) + homeSpeed(s, f.owner, f.at) + (powerOn(s, f, "jump") ? 2 : 0);   // home territory; an emergency jump
    // Fuel: a turn's travel beyond supply burns one; with none left the fleet crawls.
    const out = f.path.length && !inSupply(s, f) && fuelMax(s, f) !== Infinity;
    let fumes = false;
    // In supply, a fleet on the move draws on the reserve; short of it, it goes slower.
    if (f.path.length && !out && usesReserve(f.owner) && fuelMax(s, f) !== Infinity) { const c = round1(f.ships.length * FUEL.movePer); if (fuelStock(s, f.owner) >= c) drawReserve(s, f.owner, c); else { mp = Math.max(1, mp - FUEL.shortSlow); f.dry = s.turn; } }
    if (out) { if (fuelOf(s, f) > 0) f.fuel = fuelOf(s, f) - 1; else if (!drawCargo(f)) { mp = Math.min(mp, FUEL.fumesSpeed); fumes = true; } }   // a tanker along tops it up
    // Burning hard: an extra turn of its own fuel beyond supply, or fuel from the reserve within it.
    if (f.burn && f.path.length && !fumes && usesReserve(f.owner)) {
      if (out) { if (fuelOf(s, f) > 0) { f.fuel = fuelOf(s, f) - 1; mp += FUEL.burnSpeed; } }
      else { const c = burnCost(s, f); if (fuelStock(s, f.owner) >= c) { drawReserve(s, f.owner, c); mp += FUEL.burnSpeed; } else f.dry = s.turn; }
    }
    while (f.path.length && mp + 1e-9 >= f.path[0].cost) {
      const step = f.path[0];
      // A fleet stops where an enemy at war guards the hex.
      mp -= step.cost; f.from = f.at; f.at = step.hex; f.path.shift();
      // (A cloaked fleet slips past.)
      if (!cloaked(f, s) && fleetsAt(s, f.at).some((o) => atWar(s, f.owner, o.owner) && armed(o))) { f.path = []; break; }
    }
    if (!f.path.length) { f.dest = null; delete f.burn; }
    if (inSupply(s, f)) refuel(s, f);   // refuelled, from the reserve
  }
  // Fleets of one faction resting in the same hex join up.
  const byHex = {};
  // Warships only: colony ships, outposts, scouts and transports keep their own fleets until the player joins them.
  const warOnly = (f) => f.ships.every((x) => SHIPS[x.type].skill > 0);
  // (Ships away for repairs keep to themselves, to go back to their own fleet.)
  for (const f of Object.values(s.fleets)) { if (f.path.length || !warOnly(f) || f.owner === "pirates" || f.owner === "beasts" || f.repairAt) continue; const k = f.owner + "|" + f.at; if (byHex[k]) { const g = byHex[k], fu = Math.min(fuelOf(s, g), fuelOf(s, f)); g.ships.push(...f.ships); g.fuel = Math.min(fu, fuelMax(s, g)); joinAdmirals(s, g, f); delete s.fleets[f.id]; } else byHex[k] = f; }
}

// ---- settling and invading ----
export function settle(s, fleetId, opts = {}) {
  const f = s.fleets[fleetId], sid = s.sysAt[f.at], sys = sid && s.systems[sid];
  if (!sys) return { error: "There's no system here." };
  const ci = f.ships.findIndex((x) => x.type === "colony"), oi = f.ships.findIndex((x) => x.type === "outpost");
  if (sys.colony) return { error: "Someone already holds this system." };
  if (fleetsAt(s, sys.at).some((o) => armed(o) && atWar(s, f.owner, o.owner))) return { error: "Hostile ships hold this system: clear them first." };
  if (ci >= 0 && canSettle(s, f.owner, sys, "colony")) {
    f.ships.splice(ci, 1);
    sys.colony = { owner: f.owner, kind: "colony", founded: s.turn, pop: (f.owner === "concord" ? 2 : 1) + (has(s, f.owner, "frontierCharters") ? 1 : 0), growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
    log(s, f.owner, `${faction(s, f.owner).name} founded a colony on ${sys.name}, ${worldDesc(sys)}.`, "settle");
  } else if (oi >= 0 || ci >= 0) {
    if (oi < 0 && !canSettle(s, f.owner, sys, "outpost")) return { error: "Nothing here to settle with." };
    const F = faction(s, f.owner), depot = !!opts.depot && F.credits >= FUEL.foundWithDepot;
    if (opts.depot && !depot) return { error: `Founding it with a fuel depot costs ${FUEL.foundWithDepot} credits.` };
    f.ships.splice(oi >= 0 ? oi : ci, 1);
    if (depot) F.credits = round1(F.credits - FUEL.foundWithDepot);
    sys.colony = { owner: f.owner, kind: "outpost", founded: s.turn, pop: 0, growth: 0, buildings: depot ? { depot: true } : {}, queue: [], stock: 0, defense: 0, capital: false };
    log(s, f.owner, `${F.name} claimed ${sys.name} as an outpost: ${worldDesc(sys)}. It extends your borders${sys.exotics ? " and mines its exotics" : ""}${depot ? ", and its fuel depot gives supply" : ""}.`, "settle");
  } else return { error: "This fleet has no colony or outpost ship." };
  if (!f.ships.length) dropFleet(s, f);
  noticeSettling(s, f.owner, sys);
  updateVision(s, faction(s, f.owner));
  return { ok: true };
}
/** Others don't like it when you settle next door. */
function noticeSettling(s, fid, sys) {
  for (const o of s.factions) if (o.id !== fid && o.alive && coloniesOf(s, o.id).some((x) => distance(x.at, sys.at) <= 4)) remember(s, o.id, fid, `settled ${sys.name}, close to our worlds`, o.id === "kel" ? -12 : -8);
}
// ---- trade ----
/** A colony's trade partners: other colonies within range, its own power's or a treaty partner's, neither blockaded. */
export function tradeLinks(s, sys) {
  const c = sys.colony; if (!c || c.kind !== "colony" || blockaded(s, sys)) return [];
  const F = faction(s, c.owner), ok = (o) => o === c.owner || !!(F.relations[o] && F.relations[o].treaty);
  return Object.values(s.systems).filter((x) => x !== sys && x.colony && x.colony.kind === "colony" && ok(x.colony.owner)
    && distance(x.at, sys.at) <= TRADE.range && !blockaded(s, x)).sort((a, b) => distance(a.at, sys.at) - distance(b.at, sys.at)).slice(0, TRADE.maxLinks + (has(s, sys.colony.owner, "creditNetworks") ? 1 : 0));
}
export function tradeIncome(s, sys) {
  const n = tradeLinks(s, sys).length; if (!n) return 0;
  return n * TRADE.perLink * (sys.colony.buildings.market ? TRADE.exchange : 1) * (has(s, sys.colony.owner, "creditNetworks") ? 1.5 : 1);
}
// ---- the exotics market ----
export const marketPrice = (s) => Math.round(s.market ? s.market.price : MARKET.base);
export const sellPrice = (s) => Math.max(1, Math.floor(marketPrice(s) * MARKET.sellRate));
const hasExchange = (s, fid) => coloniesOf(s, fid).some((x) => x.colony.buildings.market);
/** Buy (n > 0) or sell (n < 0) exotics, one unit at a time: each moves the price. Needs an Exchange somewhere. */
export function tradeExotics(s, fid, n) {
  const F = faction(s, fid); s.market = s.market || { price: MARKET.base };
  if (!hasExchange(s, fid)) return { error: "You need an Exchange on one of your worlds to deal on the market." };
  let done = 0, credits = 0;
  for (let i = 0; i < Math.abs(n); i++) {
    if (n > 0) { const p = marketPrice(s); if (F.credits < p) break; F.credits -= p; F.exotics += 1; credits -= p; s.market.price = Math.min(MARKET.max, s.market.price + MARKET.step); }
    else { if (F.exotics < 1) break; const p = sellPrice(s); F.exotics -= 1; F.credits += p; credits += p; s.market.price = Math.max(MARKET.min, s.market.price - MARKET.step); }
    done++;
  }
  if (!done) return { error: n > 0 ? "Not enough credits." : "No exotics to sell." };
  F.credits = round1(F.credits);
  return { ok: true, units: done, credits };
}
// ---- sieges ----
/** How far a long siege has worn down a world's garrison: 1 at the start, down to SIEGE.garrisonMin. */
export const garrisonFactor = (sys) => sys.colony && sys.colony.owner === "zhaq" ? 1 : Math.max(sys.colony && sys.colony.buildings.barracks ? 0.8 : SIEGE.garrisonMin, 1 - SIEGE.garrisonPerTurn * ((sys.colony && sys.colony.siege) || 0));
/** The besieger who would take a world's surrender: the power with the most warships in its orbit. */
function besiegerOf(s, sys) {
  const n = {};
  for (const f of fleetsAt(s, sys.at)) if (armed(f) && atWar(s, f.owner, sys.colony.owner) && !isWild(f.owner)) n[f.owner] = (n[f.owner] || 0) + f.ships.filter((x) => SHIPS[x.type].skill > 0).length;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
export function invasionOdds(s, fleetId) {
  const f = s.fleets[fleetId], sid = s.sysAt[f.at], sys = sid && s.systems[sid];
  if (!sys || !sys.colony || sys.colony.owner === f.owner) return null;
  const troops = f.ships.filter((x) => x.type === "transport").reduce((t, x) => t + shipStats(s, f.owner, "transport").troops, 0);
  const defense = (sys.colony.owner === "zhaq" ? 1.5 : 1) * (sys.colony.kind === "outpost" ? 0.5 : sys.colony.pop * RULES.troopDefensePerPop + (sys.colony.capital ? 2 : 0) + (sys.colony.buildings.battery ? BATTERY.garrison : 0) + (sys.colony.buildings.barracks ? 3 : 0) + (has(s, sys.colony.owner, "torporVaults") ? 2 : 0)) * garrisonFactor(sys);
  return { troops, defense: round1(defense), guarded: guarded(s, sys, f.owner), siege: sys.colony.siege || 0 };
}
/** An enemy at war with a world's owner has warships in its orbit. */
export const besieged = (s, sys) => { for (const id in s.fleets) { const f = s.fleets[id]; if (f.at === sys.at && armed(f) && atWar(s, f.owner, sys.colony.owner)) return true; } return false; };
/** A world's orbital guns at full strength: an Orbital battery's, or a capital's smaller ones; the shield grid adds hull. */
export function gunsMax(s, c) {
  const grid = proto(s, c.owner, "grid");
  return (c.buildings.battery ? BATTERY.hull + (grid ? BATTERY.gridHull : 0) : c.capital ? BATTERY.capitalHull + (grid ? 1 : 0) : 0) + (c.aegis ? 6 : 0) + (c.buildings.station ? 4 : 0);
}
/** The world's guns still fire. */
export const gunsUp = (sys) => !!(sys.colony && (sys.colony.buildings.battery || sys.colony.buildings.station || sys.colony.capital || sys.colony.aegis) && sys.colony.defense > 0);
/** Blockaded: besieged, and its guns are silent. While they stand, the world still trades, grows and makes its full
 * yields, and the siege clock doesn't run. */
export const blockaded = (s, sys) => besieged(s, sys) && !gunsUp(sys);
export function guarded(s, sys, attacker) {
  return (sys.colony.buildings.battery || sys.colony.buildings.station || sys.colony.capital || sys.colony.aegis) && sys.colony.defense > 0
    || fleetsAt(s, sys.at).some((o) => armed(o) && (o.owner === sys.colony.owner || (attacker === "pirates" && patrolling(s, o.owner, sys.colony.owner))));
}
export function invade(s, fleetId) {
  const f = s.fleets[fleetId], o = invasionOdds(s, fleetId);
  if (!o) return { error: "There's no enemy world here." };
  const sys = s.systems[s.sysAt[f.at]], def = sys.colony.owner;
  if (!atWar(s, f.owner, def)) return { error: "You're not at war with them." };
  if (!o.troops) return { error: "This fleet carries no troops." };
  if (o.guarded) return { error: "Its defenses still hold the orbit: destroy them first. Keep warships in orbit through the end of the turn; under siege, its guns stay down." };
  f.ships = f.ships.filter((x) => x.type !== "transport");
  if (!f.ships.length) dropFleet(s, f);
  if (o.troops >= o.defense) {
    capture(s, sys, f.owner);
    return { ok: true, taken: true };
  }
  sys.colony.pop = Math.max(1, sys.colony.pop - 1);
  log(s, f.owner, `The landing on ${sys.name} failed.`, "war");
  return { ok: true, taken: false };
}
/** Partners in a pirate patrol pact (a power counts as patrolling with itself). */
export const patrolling = (s, a, b) => a === b || !!(faction(s, a) && faction(s, a).relations && faction(s, a).relations[b] && faction(s, a).relations[b].patrol);
/** Raid an enemy's fuel depot: an armed fleet at war with the owner, holding the system unopposed, takes its fuel (the
 * fleet and its tankers fill up) and leaves it dry: no supply from it for DEPOT_RAID.cut turns. Once a fleet a turn. */
export function canRaidDepot(s, fleetId) {
  const f = s.fleets[fleetId], sys = f && s.sysAt[f.at] && s.systems[s.sysAt[f.at]], c = sys && sys.colony;
  return !!(c && c.buildings.depot && c.owner !== f.owner && armed(f) && atWar(s, f.owner, c.owner) && !guarded(s, sys, f.owner) && f.depotRaid !== s.turn && !(c.depotCut > s.turn));
}
export function raidDepot(s, fleetId) {
  const f = s.fleets[fleetId];
  if (!f) return { error: "No such fleet." };
  if (!canRaidDepot(s, fleetId)) return { error: "Raid an enemy's fuel depot: be at war with them, with warships in its system and none of theirs." };
  const sys = s.systems[s.sysAt[f.at]], c = sys.colony;
  f.fuel = fuelMax(s, f); for (const x of f.ships) if (x.type === "tanker") x.cargo = SHIPS.tanker.cargo;
  c.depotCut = s.turn + DEPOT_RAID.cut; f.depotRaid = s.turn;
  // The depot's stores: a share of its owner's reserve goes into the raider's.
  const took = usesReserve(c.owner) ? drawReserve(s, c.owner, Math.min(DEPOT_RAID.steal, fuelStock(s, c.owner))) : 0;
  if (took && usesReserve(f.owner)) { const R = faction(s, f.owner); R.fuelStock = round1(Math.min(fuelCap(s, f.owner) + took, fuelStock(s, f.owner) + took)); }
  remember(s, c.owner, f.owner, `raided our fuel depot at ${sys.name}`, -4);
  log(s, f.owner, `Your fleet raided the fuel depot at ${sys.name}: its tanks are full${took && usesReserve(f.owner) ? `, ${took} fuel went into your reserve` : ""}, and the depot gives no supply for ${DEPOT_RAID.cut} turns.`, "war");
  log(s, c.owner, `${faction(s, f.owner).name} raided your fuel depot at ${sys.name}: ${took ? `${took} fuel taken from your reserve, and ` : ""}it gives no supply for ${DEPOT_RAID.cut} turns.`, "war");
  return { ok: true };
}
/**
 * A targeted barrage: warships holding an enemy world's orbit (its guns down, no warships of its own there) destroy one
 * of its buildings, once per fleet a turn. The Shipyard takes the ships in its queue with it; the Orbital battery is gone
 * for good (a capital keeps its own guns). Precise: no population is lost.
 */
export function barrageTargets(s, fleetId) {
  const f = s.fleets[fleetId], sys = f && s.sysAt[f.at] && s.systems[s.sysAt[f.at]];
  if (!sys || !sys.colony || sys.colony.owner === f.owner || !armed(f) || !atWar(s, f.owner, sys.colony.owner) || guarded(s, sys, f.owner)) return [];
  return Object.keys(sys.colony.buildings).filter((b) => sys.colony.buildings[b] && BUILDINGS[b] && (!BUILDINGS[b].wonder || (b === "engine" && (s.mode === "open" || engineCharge(s)))));
}
export function barrage(s, fleetId, building) {
  const f = s.fleets[fleetId];
  if (!f) return { error: "No such fleet." };
  if (f.barraged === s.turn) return { error: "This fleet has fired its barrage this turn." };
  const sys = s.sysAt[f.at] && s.systems[s.sysAt[f.at]];
  if (!sys || !sys.colony || sys.colony.owner === f.owner) return { error: "There's no enemy world here." };
  if (!armed(f)) return { error: "A barrage needs warships." };
  if (!atWar(s, f.owner, sys.colony.owner)) return { error: "You're not at war with them." };
  if (guarded(s, sys, f.owner)) return { error: "Its guns or warships still hold the orbit: win it first (keep warships here through the end of the turn)." };
  if (!barrageTargets(s, fleetId).includes(building)) return { error: "There's no such building to hit." };
  const c = sys.colony, owner = c.owner;
  delete c.buildings[building];
  let wrecked = 0;
  if (building === "shipyard") { wrecked = c.queue.filter((q) => q.kind === "ship").length; c.queue = c.queue.filter((q) => q.kind !== "ship"); }
  if (building === "battery") c.defense = Math.min(c.defense, 0);
  f.barraged = s.turn;
  remember(s, owner, f.owner, `bombarded ${sys.name}`, -5);
  log(s, f.owner, `A barrage from orbit destroyed ${sys.name}'s ${BUILDINGS[building].name.toLowerCase()}${wrecked ? `, and the ${wrecked} ship${wrecked > 1 ? "s" : ""} in its yards` : ""}.`, "war");
  if (owner !== f.owner) log(s, owner, `${faction(s, f.owner).name} bombarded ${sys.name} from orbit: its ${BUILDINGS[building].name.toLowerCase()} is gone.`, "war");
  return { ok: true, wrecked };
}
function capture(s, sys, by) {
  const was = sys.colony.owner, wasCapital = sys.colony.capital;
  log(s, by, `${faction(s, by).name} took ${sys.name} from ${faction(s, was).name}.`, "war");
  faction(s, by).stats.taken = (faction(s, by).stats.taken || 0) + 1;
  remember(s, was, by, `took ${sys.name} from us`, -15);
  sys.colony.owner = by; sys.colony.capital = false; sys.colony.queue = []; sys.colony.stock = 0;
  if (sys.colony.kind === "colony") gainOfficer(s, by, `who came over to you when ${sys.name} fell`);
  // A signature technology's hub: whoever takes it learns the technology.
  for (const [b, on] of Object.entries(sys.colony.buildings)) {
    const tech = on && BUILDINGS[b] && BUILDINGS[b].hub; if (!tech || has(s, by, tech)) continue;
    const B = faction(s, by), T = TECHS.find((x) => x.id === tech); B.research.done.push(tech);
    log(s, by, `In the ${BUILDINGS[b].name} at ${sys.name}, ${B.name} found everything it needed: ${B.name} has learned ${T.name} (${T.text.split(" Unique")[0]}).`, "research");
    if (was !== by) log(s, was, `${faction(s, was).name}'s ${T.name} is no longer theirs alone: ${B.name} took the ${BUILDINGS[b].name} at ${sys.name}.`, "war");
  }
  if (sys.colony.kind === "colony") sys.colony.pop = Math.max(1, sys.colony.pop - 1);
  if (s.mode !== "open") delete sys.colony.buildings.engine;   // in an open game the Engine changes hands (checkEngine)
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

/** A world burned to nothing (the Wardens do this): the colony is gone; a capital moves; a power with no colony falls. */
export function razeWorld(s, sys) {
  const was = sys.colony.owner, wasCapital = sys.colony.capital;
  sys.colony = null;
  if (wasCapital) {
    const rest = coloniesOf(s, was).filter((x) => x.colony.kind === "colony").sort((a, b) => b.colony.pop - a.colony.pop);
    if (rest[0]) { rest[0].colony.capital = true; rest[0].colony.buildings.shipyard = true; faction(s, was).capital = rest[0].id; log(s, was, `${faction(s, was).name} moved its capital to ${rest[0].name}.`, "war"); }
  }
  checkAlive(s, was);
}

// ---- battles: 3d6 roll-under, three exchanges ----
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
    for (const [fid, fl] of Object.entries(sides)) for (const f of fl) for (const sh of f.ships) units.push({ fid, fleet: f, ship: sh, st: shipStats(s, fid, sh.type, sh) });
    const worldGuns = sys && sys.colony && (sys.colony.buildings.battery || sys.colony.buildings.station || sys.colony.capital || sys.colony.aegis) && sys.colony.defense > 0;
    if (worldGuns) { const o = sys.colony.owner, bat = !!sys.colony.buildings.battery; units.push({ fid: o, world: sys, st: { skill: 13 + (has(s, o, "targeting") ? 1 : 0) + focusOf(s, o).defense + (proto(s, o, "grid") ? 1 : 0) + (relicHeld(s, o, "aegis") ? 1 : 0), dmg: bat || sys.colony.buildings.station ? BATTERY.dmg : 1, shots: bat ? BATTERY.shots + (has(s, o, "skyhooks") ? 1 : 0) : 1, name: bat ? "Orbital battery" : sys.colony.buildings.station ? "Orbital station" : "Orbital guns" } }); }
    // Deep in an enemy's territory (at war with them), and out of one's own supply: −HOME.deep to hit.
    const terrHere = territoryAt(s, hex), deepCache = {};
    const deepIn = (fid) => (deepCache[fid] ??= !!(terrHere && terrHere !== fid && s.factions.some((F) => F.id === fid) && atWar(s, fid, terrHere) && !inSupplyAt(s, fid, hex)));
    const stance = (u) => (u.fleet && u.fleet.withdraw ? STANCES.defensive : (u.fleet && STANCES[u.fleet.stance]) || STANCES.balanced);
    const leaving = (u) => !!(u.fleet && u.fleet.withdraw);
    // The Nodes the Heart raised around itself shield it (CRISIS.shieldRange); Nodes on burned worlds far off don't.
    const nodesUp = !!(s.crisis && s.crisis.heart) && Object.values(s.fleets).some((f) => f.owner === "wardens" && distance(f.at, s.crisis.heart) <= CRISIS.shieldRange && f.ships.some((x) => x.type === "node" && x.hull > 0));
    const hp = (u) => (u.world ? u.world.colony.defense : u.ship.hull);
    // Warden Nodes and the Heart can only be worn down: a battle takes at most a share of their full hull (CRISIS.wear).
    const hit = (u, n) => {
      if (u.world) { u.world.colony.defense = Math.max(0, u.world.colony.defense - n); return; }
      const w = CRISIS.wear[u.ship.type];
      if (w) { const cap = Math.ceil(u.st.hull * w) - (u.taken || 0); n = Math.max(0, Math.min(n, cap)); u.taken = (u.taken || 0) + n; }
      u.ship.hull -= n;
    };
    // A battle the player is in is recorded roll by roll, for the battle pop-up.
    const where = sys ? sys.name : s.crisis && s.crisis.heart === hex ? "the Heart of the Wardens" : "deep space";
    const me = player(s).id, rec = list.includes(me) ? { turn: s.turn, at: where, hex, sides: list,
      units: units.map((u) => ({ fid: u.fid, type: u.world ? "guns" : u.ship.type, name: u.world ? `${u.world.name}'s orbital guns` : shipLabel(u.fid, u.ship.type), hull: hp(u), max: u.world ? gunsMax(s, u.world.colony) : u.st.hull, stance: u.fleet ? u.fleet.stance || "balanced" : null })), events: [],
      admirals: [...new Set(units.filter((u) => u.fleet && u.fleet.admiral).map((u) => u.fleet))].map((f) => ({ fid: f.owner, name: admTitle(f.admiral), traits: f.admiral.traits.map((t) => ADMIRAL_TRAITS[t].name) })) } : null;
    let fights = 0;
    for (let round = 0; round < 3; round++) {
      const live = units.filter((u) => hp(u) > 0 && !(round > 0 && leaving(u)));   // the withdrawing are gone after the first exchange
      live.sort((a, b) => (b.world ? 1 : 0) - (a.world ? 1 : 0));   // dug-in guns fire first in each exchange
      for (const u of live) {
        for (let shot = 0; shot < (u.st.shots || 1); shot++) {
        if (!u.st.skill || hp(u) <= 0) continue;
        // The Heart of the Wardens can't be fired on while its guard still stands, nor while its own Nodes do.
        // Pirates, crystal swarms and Warden husks don't fire on unarmed ships: colony ships, outposts, scouts, transports and tankers pass.
        const foes = live.filter((v) => hp(v) > 0 && atWar(s, u.fid, v.fid) && !(v.ship && !SHIPS[v.ship.type].skill && ((u.fid === "pirates" && !SHIPS[v.ship.type].mine) || (u.ship && (u.ship.type === "swarm" || u.ship.type === "husk")))) && !(v.ship && v.ship.type === "heart" && (live.some((g) => g !== v && g.fid === v.fid && hp(g) > 0) || nodesUp)) && !(u.world && v.ship && v.ship.type === "probe"));   // a probe scans from high orbit: only warships can catch it
        if (!foes.length) continue;
        // A world's guns are laid by its gunnery officers: they finish off the most damaged ship in range. Ships pick at random.
        let t = foes[R.int(foes.length)];
        if (u.world) { const ships = foes.filter((v) => v.ship); if (ships.length) { const low = Math.min(...ships.map(hp)), weakest = ships.filter((v) => hp(v) === low); t = weakest[R.int(weakest.length)]; } }
        // Counters: a ship aims first for what it's built to beat (COUNTER), and hits it more easily.
        const beats = (u.ship && COUNTER.beats[ROLES[u.ship.type]]) || [], roleOf = (v) => ROLES[v.world ? "guns" : v.ship.type];
        if (beats.length) { const pref = foes.filter((v) => beats.includes(roleOf(v))); if (pref.length) t = pref[R.int(pref.length)]; }
        const ctr = beats.includes(roleOf(t)) ? COUNTER.bonus : 0, ambush = round === 0 && u.ship && SHIPS[u.ship.type].cloak ? DETECT.ambush : 0;   // a cloaked ship strikes first from the dark
        const dice = [R.d6(), R.d6(), R.d6()], roll = dice[0] + dice[1] + dice[2];
        fights++;
        const need = u.st.skill + stance(u).atk + stance(t).def + (admTrait(u.fleet, "gunnery") ? 1 : 0) - (admTrait(t.fleet, "steady") ? 1 : 0) + (t.fid === "wardens" && admTrait(u.fleet, "hunter") ? 2 : 0) + (t.fid === "wardens" && s.crisis && s.crisis.decoded && s.crisis.decoded[u.fid] ? 1 : 0) - (t.ship && SHIPS[t.ship.type].evasive || 0) - (u.fid === "wardens" && relicHeld(s, t.fid, "key") ? 2 : 0) + ctr + ambush + (u.fleet && powerOn(s, u.fleet, "overcharge") ? 2 : 0) + (round === 0 && hasOfficer(u.fleet, "tactical") ? 1 : 0) - (u.fleet && deepIn(u.fid) ? HOME.deep : 0), landed = roll <= 4 || (roll < 17 && roll <= need);
        const dmg = u.st.dmg + (ctr ? (COUNTER.dmg[ROLES[u.ship.type]] || 0) : 0);
        if (landed) {
          const was = hp(t); hit(t, dmg);
          // The assault on the Heart: who did how much (to it, or to the Nodes shielding it).
          if (t.fid === "wardens" && u.fid !== "wardens" && s.crisis && s.factions.some((F) => F.id === u.fid) && (t.ship.type === "heart" || (t.ship.type === "node" && s.crisis.heart && distance(hex, s.crisis.heart) <= CRISIS.shieldRange))) { const A = (s.crisis.assault = s.crisis.assault || {}); A[u.fid] = (A[u.fid] || 0) + Math.max(0, was - Math.max(0, hp(t))); }
          // A Warden machine destroyed counts for whoever destroyed it; the Heart, for everyone who fought it.
          if (was > 0 && hp(t) <= 0 && t.fid === "wardens" && u.fid !== "wardens") {
            const K = faction(s, u.fid); K.stats.wardens = (K.stats.wardens || 0) + 1;
            // Score: by what the machine was worth, against how hard the Wardens came (a hunter is worth less in a swarm).
            K.stats.wardenPts = (K.stats.wardenPts || 0) + (SHIPS[t.ship.type].hull * SHIPS[t.ship.type].dmg / 3) / ((s.crisis && s.crisis.m) || 1) * (K.glory ? 2 : 1);
            if (t.ship.type === "heart" && s.crisis) { s.crisis.heartBy = u.fid; s.crisis.heartWith = list.filter((x) => x !== "wardens"); }
            // A Watcher or a Node: what it was built from teaches something (CRISIS.bounty, in research).
            if (CRISIS.bounty[t.ship.type]) { const bx = t.ship.type === "probe" && s.crisis && s.crisis.huntProbes && s.crisis.huntProbes[u.fid] ? 2 : 1; K.research.progress += CRISIS.bounty[t.ship.type] * bx; log(s, u.fid, `${K.name} destroyed a Warden ${SHIPS[t.ship.type].name.replace(/^Warden /, "")} at ${where}: +${CRISIS.bounty[t.ship.type] * bx} research.`, "war"); }
          }
          // A pirate or a creature destroyed: its bounty (credits), and what its wreck teaches (research), to whoever did it.
          if (was > 0 && hp(t) <= 0 && (t.fid === "pirates" || t.fid === "beasts") && !isWild(u.fid)) bounty(s, u.fid, t.ship.type, where);
          // Raiders who lose ships at a world remember it, and stay away for a while.
          if (was > 0 && hp(t) <= 0 && t.fid === "pirates" && sys && sys.colony && s.wilds) (s.wilds.avoid = s.wilds.avoid || {})[sys.id] = s.turn + RAID_AVOID;
        }
        if (rec) rec.events.push({ round, a: units.indexOf(u), t: units.indexOf(t), dice, need, hit: landed, dmg: landed ? dmg : 0, ctr: ctr > 0, ambush: ambush > 0 });
        }
      }
    }
    if (!fights) continue;
    // The dead are removed; who was there hears about it.
    const inBattle = [...new Set(units.filter((u) => u.fleet).map((u) => u.fleet))];
    const lost = {};
    for (const u of units) if (u.ship && u.ship.hull <= 0) { lost[u.fid] = (lost[u.fid] || 0) + 1; u.fleet.ships = u.fleet.ships.filter((x) => x !== u.ship); }
    for (const f of fleetsAt(s, hex)) if (!f.ships.length) { if (officersOf(f).length && !faction(s, f.owner).ai) log(s, f.owner, `Lost with the fleet at ${where}: ${f.officers.map((o) => `${OFFICERS.kinds[o.kind].name} ${o.name}`).join(", ")}.`, "war"); delete s.fleets[f.id]; }
    for (const [fid, n] of Object.entries(lost)) faction(s, fid).stats.lost += n;
    // A world's guns knocked out count in the reckoning like ships lost (by their strength): the orbit is the attacker's now.
    const gunUnit = units.find((u) => u.world), silenced = gunUnit && gunUnit.world.colony && gunUnit.world.colony.defense <= 0 ? gunUnit.fid : null;
    const tally = { ...lost }; if (silenced) tally[silenced] = (tally[silenced] || 0) + Math.max(1, Math.round(gunsMax(s, gunUnit.world.colony) / 3));   // worth a ship for every 3 hull of guns
    const outcome = {};
    for (const fid of list) { const theirs = Object.entries(tally).filter(([o]) => atWar(s, fid, o)).reduce((t, [, n]) => t + n, 0), mine = tally[fid] || 0; outcome[fid] = theirs > mine ? "won" : mine > theirs ? "lost" : "even"; }
    s.battleWith = list;
    const news = admiralsAfterBattle(s, inBattle, outcome, where, R);
    // A battle won: you destroyed ships of theirs, and lost fewer than they did.
    for (const fid of list) if (outcome[fid] === "won") faction(s, fid).stats.won = (faction(s, fid).stats.won || 0) + 1;
    const names = list.map((x) => faction(s, x).name).join(" and ");
    log(s, null, `Battle at ${where} between ${names}: ${Object.entries(lost).map(([fid, n]) => `${faction(s, fid).name} lost ${n} ship${n > 1 ? "s" : ""}`).join("; ") || "no ships lost"}${silenced ? `; ${faction(s, silenced).name}'s orbital guns at ${where} are knocked out` : ""}.`, "war");
    s.events.push({ turn: s.turn, kind: "battle", hex, sides: list });
    if (rec) { rec.news = news.filter((x) => x.fid === me || x.text.includes("Your")).map((x) => x.text); rec.lost = lost; rec.silenced = silenced; rec.won = outcome[me] || "even"; (s.battleReports = s.battleReports || []).push(rec); }
  }
  R.save();
}

/** A wild thing destroyed: credits, research and exotics, as WILDS.bounty says. */
export function bounty(s, fid, type, where) {
  const b = WILDS.bounty[type], K = faction(s, fid); if (!b || !K) return;
  K.credits = round1(K.credits + (b.credits || 0)); K.research.progress += b.research || 0; K.exotics += b.exotics || 0;
  K.stats.wild = (K.stats.wild || 0) + 1;
  if (type === "haven") gainOfficer(s, fid, `freed from the pirate haven at ${where}`);
  const got = [b.credits && `${b.credits} credits`, b.research && `${b.research} research`, b.exotics && `${b.exotics} exotics`].filter(Boolean).join(", ");
  // A pirate patrol pact: each partner gets a share of a pirate bounty.
  if (type === "raider" || type === "haven") for (const P of s.factions) if (P.alive && P.id !== fid && patrolling(s, fid, P.id)) {
    const c = Math.round((b.credits || 0) * PATROL.share), r = Math.round((b.research || 0) * PATROL.share);
    P.credits = round1(P.credits + c); P.research.progress += r;
    if (!P.ai && (c || r)) log(s, P.id, `Your patrol partner ${K.name} destroyed ${type === "haven" ? "a pirate haven" : "a raider"} at ${where}: your share is ${[c && `${c} credits`, r && `${r} research`].filter(Boolean).join(" and ")}.`, "explore");
  }
  if (got && (type !== "raider" || !K.ai)) log(s, fid, `${K.name} destroyed ${type === "haven" ? "a pirate haven" : `a ${SHIPS[type].name.toLowerCase()}`} at ${where}: ${got}.`, type === "raider" ? "war" : "explore");
}
// ---- diplomacy ----
/** `holder` remembers something `about` did: their standing changes by `delta`, and the act is kept (the last 12). */
export function remember(s, holder, about, text, delta) {
  const H = faction(s, holder), r = H && H.relations[about]; if (!r) return;
  r.score = Math.max(-60, Math.min(40, r.score + delta));
  (r.memory = r.memory || []).push({ turn: s.turn, text, d: delta });
  if (r.memory.length > 12) r.memory.shift();
}
export const allied = (s, a, b) => !!(faction(s, a).relations[b] && faction(s, a).relations[b].allied);
/** A message waiting for the player from a rival (envoys.js shows and answers them). */
export function sendEnvoy(s, from, kind, ctx = {}) { (s.inbox = s.inbox || []).push({ kind, from, ctx, turn: s.turn }); }
/** War. Breaking an alliance to do it is remembered for a long time. The one attacked calls on its allies: a computer
 * ally joins the war; the player is asked (a message). */
export function declareWar(s, a, b, joining) {
  const A = faction(s, a), B = faction(s, b);
  const betrayal = allied(s, a, b);
  A.relations[b].status = "war"; B.relations[a].status = "war"; A.relations[b].treaty = B.relations[a].treaty = false;
  A.relations[b].allied = B.relations[a].allied = false;
  A.relations[b].patrol = B.relations[a].patrol = false;
  A.relations[b].turnsAtWar = B.relations[a].turnsAtWar = 0;
  remember(s, b, a, betrayal ? "broke our alliance and declared war on us" : joining ? `joined the war against us, for ${faction(s, joining).name}` : "declared war on us", betrayal ? -50 : -30);
  log(s, a, `${A.name} declared war on ${B.name}${betrayal ? ", breaking their alliance" : joining ? (allied(s, a, joining) ? `, honouring its alliance with ${faction(s, joining).name}` : `, on behalf of ${faction(s, joining).name}`) : ""}.`, "war");
  if (B.id === player(s).id && A.ai) sendEnvoy(s, a, "war", { joining: joining || null });
  if (!joining) for (const X of s.factions) {
    if (!X.alive || X.id === a || X.id === b || !allied(s, X.id, b) || atWar(s, X.id, a) || allied(s, X.id, a)) continue;
    if (X.ai) declareWar(s, X.id, a, b);
    else sendEnvoy(s, b, "callToArms", { enemy: a });
  }
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
    if (yes) { A.relations[to].status = B.relations[from].status = "peace"; remember(s, to, from, "made peace with us", 10); if (B.ai === false) remember(s, from, to, "made peace with us", 10); log(s, from, `${A.name} and ${B.name} made peace.`, "diplo"); }
  } else if (what === "trade") {
    if (rel.status === "war") return { error: "Not while you're at war." };
    if (rel.treaty) return { error: "You already trade." };
    yes = !B.ai || rel.score >= -5;
    if (yes) { A.relations[to].treaty = B.relations[from].treaty = true; remember(s, to, from, "signed a trade treaty with us", 5); log(s, from, `${A.name} and ${B.name} signed a trade treaty.`, "diplo"); }
  } else if (what === "endTrade") {
    A.relations[to].treaty = B.relations[from].treaty = false; remember(s, to, from, "ended our trade treaty", -5); yes = true;
  } else if (what === "alliance") {
    if (rel.status === "war") return { error: "Not while you're at war." };
    if (rel.allied) return { error: "You're already allies." };
    yes = !B.ai || rel.score >= 20;
    if (yes) { A.relations[to].allied = B.relations[from].allied = true; remember(s, to, from, "became our ally", 8); log(s, from, `${A.name} and ${B.name} are allies now: if either is attacked, the other joins the war.`, "diplo"); }
  } else if (what === "patrol") {
    if (rel.status === "war") return { error: "Not while you're at war." };
    if (rel.patrol) return { error: "You already patrol together." };
    yes = !B.ai || rel.score >= -5;
    if (yes) { A.relations[to].patrol = B.relations[from].patrol = true; remember(s, to, from, "joined us in a pirate patrol pact", 4); log(s, from, `${A.name} and ${B.name} agreed a pirate patrol pact: their warships guard each other's worlds from raiders, and they share pirate bounties.`, "diplo"); }
  } else if (what === "endPatrol") {
    if (!rel.patrol) return { error: "You don't patrol together." };
    A.relations[to].patrol = B.relations[from].patrol = false; remember(s, to, from, "ended our pirate patrol pact", -4); yes = true;
  } else if (what === "endAlliance") {
    if (!rel.allied) return { error: "You're not allies." };
    A.relations[to].allied = B.relations[from].allied = false; remember(s, to, from, "ended our alliance", -15); yes = true;
    log(s, from, `${A.name} ended its alliance with ${B.name}.`, "diplo");
  }
  return { ok: true, accepted: !!yes };
}
// ---- influence: moving a rival's regard on demand ----
/** What a gift of credits is worth in regard now (less the more you've given them lately). */
export function giftRegard(s, from, to, credits) {
  const r = faction(s, to).relations[from], G = INFLUENCE.gift;
  const recent = (r.gifts || []).filter((g) => s.turn - g.turn < G.window).reduce((t, g) => t + g.value, 0);
  return Math.round((credits / G.perRegard) / (1 + recent / G.fade) * 10) / 10;
}
/** Give credits and/or exotics. Returns { ok, regard }. */
export function giveGift(s, from, to, { credits = 0, exotics = 0 } = {}) {
  const A = faction(s, from), B = faction(s, to), r = B && B.relations[from];
  if (!B || !B.alive || !r || !A.met[to]) return { error: "You haven't met them." };
  credits = Math.max(0, Math.floor(credits)); exotics = Math.max(0, Math.floor(exotics));
  if (!credits && !exotics) return { error: "Choose a gift." };
  if (A.credits < credits) return { error: "You don't have the credits." };
  if (A.exotics < exotics) return { error: "You don't have the exotics." };
  const value = credits + exotics * marketPrice(s), gain = giftRegard(s, from, to, value);
  A.credits = round1(A.credits - credits); A.exotics -= exotics; B.credits = round1(B.credits + credits); B.exotics += exotics;
  (r.gifts = r.gifts || []).push({ turn: s.turn, value }); r.gifts = r.gifts.filter((g) => s.turn - g.turn < INFLUENCE.gift.window);
  remember(s, to, from, `sent us a gift (${[credits && `${credits} credits`, exotics && `${exotics} exotics`].filter(Boolean).join(", ")})`, gain);
  if (!A.ai) log(s, from, `You sent ${B.name} a gift: their regard for you rises ${gain}.`, "diplo");
  if (!B.ai) log(s, to, `${A.name} sent you a gift: ${[credits && `${credits} credits`, exotics && `${exotics} exotics`].filter(Boolean).join(" and ")}.`, "diplo");
  return { ok: true, regard: gain };
}
/** The price of making amends for one grievance they remember (index into their memory of you). */
export function amendsCost(s, from, to, i) {
  const m = ((faction(s, to).relations[from] || {}).memory || [])[i];
  return m && m.d < 0 && !m.forgiven ? Math.round(-m.d * INFLUENCE.amends.perPoint * (1 + s.turn * INFLUENCE.amends.perTurn)) : null;
}
export function makeAmends(s, from, to, i) {
  const A = faction(s, from), r = faction(s, to).relations[from], m = r && (r.memory || [])[i], cost = amendsCost(s, from, to, i);
  if (cost === null) return { error: "Nothing to make amends for there." };
  if (A.credits < cost) return { error: `Making amends costs ${cost} credits.` };
  A.credits = round1(A.credits - cost); faction(s, to).credits = round1(faction(s, to).credits + cost);
  const back = Math.round(-m.d * INFLUENCE.amends.back); m.forgiven = s.turn;
  r.score = Math.min(40, r.score + back);
  if (!A.ai) log(s, from, `You made amends to ${faction(s, to).name} for what they held against you (that you ${m.text}): ${cost} credits, and +${back} regard.`, "diplo");
  if (!faction(s, to).ai) log(s, to, `${A.name} made amends for having ${m.text.replace(/^(\w+) us/, "$1 you").replace(/ our /g, " your ").replace(/ us\b/g, " you")}: they paid you ${cost} credits.`, "diplo");
  return { ok: true, regard: back, cost };
}
/** Would they accept this proposal now? { yes, short (regard missing, if any), sweeten (credits to make up for it) }. */
export function acceptHint(s, from, to, what) {
  const B = faction(s, to), rel = B.relations[from]; if (!B.ai) return { yes: true };
  const need = what === "alliance" ? 20 : what === "peace" ? -9 : what === "trade" || what === "patrol" ? -5 : null;
  if (need === null) return { yes: true };
  if (what === "peace" && (rel.turnsAtWar >= 8 || militaryPower(s, to) < militaryPower(s, from) * 0.8)) return { yes: true };
  const short = Math.max(0, Math.ceil(need - rel.score));
  if (!short) return { yes: true };
  // What a gift big enough to close the gap would cost now (gifts lose value as they pile up: search for it).
  let c = short * INFLUENCE.gift.perRegard; for (let k = 0; k < 40 && giftRegard(s, from, to, c) < short; k++) c = Math.ceil(c * 1.15);
  return { yes: false, short, sweeten: c };
}
/** Propose, with a gift first that makes up what they'd want. */
export function proposeSweetened(s, from, to, what) {
  const h = acceptHint(s, from, to, what);
  if (!h.yes) { const g = giveGift(s, from, to, { credits: h.sweeten }); if (g.error) return g; }
  return propose(s, from, to, what);
}
/** Demand tribute from a much weaker power. */
export function exactTribute(s, from, to) {
  const A = faction(s, from), B = faction(s, to), r = B.relations[from], T = INFLUENCE.tribute;
  if (!A.met[to] || !B.alive) return { error: "You haven't met them." };
  if (r.status === "war") return { error: "You're at war: take it instead." };
  if (r.lastTribute && s.turn - r.lastTribute < T.every) return { error: `You asked them on turn ${r.lastTribute}: wait until turn ${r.lastTribute + T.every}.` };
  const mine = militaryPower(s, from), theirs = militaryPower(s, to);
  if (theirs >= mine * T.weaker) return { error: "They're not afraid of you: your fleet needs to be far stronger than theirs." };
  r.lastTribute = s.turn;
  const pay = Math.min(Math.round(B.credits), Math.max(T.min, Math.round(B.credits * T.share)));
  const yes = pay > 0 && (theirs < mine * T.weaker / 2 || r.score > -20 || allied(s, to, from));
  remember(s, to, from, yes ? "forced tribute out of us" : "demanded tribute from us", T.regard);
  if (yes) { B.credits = round1(B.credits - pay); A.credits = round1(A.credits + pay); }
  if (!A.ai) log(s, from, yes ? `${B.name} paid you ${pay} credits in tribute, and resent it.` : `${B.name} refused your demand for tribute.`, "diplo");
  else if (player(s).met[from] && player(s).met[to]) log(s, null, yes ? `${A.name} forced ${pay} credits of tribute out of ${B.name}.` : `${B.name} refused ${A.name}'s demand for tribute.`, "diplo");
  return { ok: true, accepted: yes, credits: yes ? pay : 0 };
}
/** Denounce `about` to `to`: turn a third power against a rival. */
export function denounce(s, from, about, to) {
  const A = faction(s, from), T = faction(s, to), X = faction(s, about), D = INFLUENCE.denounce;
  if (!A.met[to] || !A.met[about] || to === about || to === from || about === from) return { error: "Choose two powers you've met." };
  const r = T.relations[from], rx = T.relations[about];
  if (!rx) return { error: `${T.name} hasn't met ${X.name}.` };
  const last = (A.denounced || {})[about];
  if (last && s.turn - last < D.every) return { error: `You denounced ${X.name} on turn ${last}: wait until turn ${last + D.every}.` };
  (A.denounced = A.denounced || {})[about] = s.turn;
  remember(s, to, about, `was denounced to us by ${A.name}`, D.them);
  remember(s, about, from, `denounced us to ${T.name}`, D.target);
  if (rx.score < 0) remember(s, to, from, `warned us about ${X.name}`, D.ally);
  if (!A.ai) log(s, from, `You denounced ${X.name} to ${T.name}. ${T.name} thinks less of them; ${X.name} won't forget it.`, "diplo");
  if (!X.ai) log(s, about, `${A.name} denounced you to ${T.name}: ${T.name} thinks less of you now.`, "diplo");
  if (!T.ai) log(s, to, `${A.name} warned you about ${X.name}.`, "diplo");
  return { ok: true };
}
/** The price for `ally` to declare war on `enemy` for you (null: they won't, at any price). */
export function joinWarPrice(s, from, ally, enemy) {
  const r = faction(s, ally).relations[from], J = INFLUENCE.joinWar;
  if (!r || r.score < 0) return null;
  return r.score >= J.regard || allied(s, ally, from) ? 0 : Math.round(J.cost * (1 - r.score / J.regard * 0.5));
}
export function askJoinWar(s, from, ally, enemy) {
  const A = faction(s, from), Y = faction(s, ally), E = faction(s, enemy);
  if (!atWar(s, from, enemy)) return { error: `You're not at war with ${E.name}.` };
  if (!Y.relations[enemy] || atWar(s, ally, enemy)) return { error: `${Y.name} can't join that war.` };
  if (allied(s, ally, enemy)) return { error: `${Y.name} is allied with ${E.name}.` };
  const price = joinWarPrice(s, from, ally, enemy);
  if (price === null) return { error: `${Y.name} won't fight for you: they don't like you enough.` };
  if (A.credits < price) return { error: `${Y.name} wants ${price} credits to join the war.` };
  A.credits = round1(A.credits - price); Y.credits = round1(Y.credits + price);
  declareWar(s, ally, enemy, from);
  remember(s, ally, from, price ? "paid us to join their war" : "asked us to stand with them", price ? 1 : 3);
  return { ok: true, price };
}
export function militaryPower(s, fid) {
  return fleetsOf(s, fid).reduce((t, f) => t + f.ships.reduce((u, x) => u + (SHIPS[x.type].skill ? shipStats(s, fid, x.type, x).hull * SHIPS[x.type].dmg * 2 : 0), 0), 0);
}

// ---- seeing ----
// ---- anomalies ----
const ANOMALY_KINDS = ["a derelict from before the Fracture", "a pulsar that sings in prime numbers", "a pocket of folded space",
  "a field of frozen exotic matter", "an ancient signal beacon, still sending", "a star that shouldn't be there", "the wreck of a colony ark", "a lens of bent light around nothing"];
/** Anomalies: about one empty system in six, studied for research by a scout (or an observatory nearby). */
export function placeAnomalies(s) {
  if (s.anomaliesPlaced) return; s.anomaliesPlaced = true;
  const R = makeRng("anomalies:" + s.seed);
  for (const sys of Object.values(s.systems).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (sys.colony || sys.ruins || R.next() >= 0.17) continue;
    sys.anomaly = ANOMALY_KINDS[R.int(ANOMALY_KINDS.length)];
  }
}
/** What an anomaly is worth: more the later it's studied. */
export const anomalyValue = (s) => Math.round(Math.min(SCIENCE.anomalyMax, SCIENCE.anomalyBase + s.turn * SCIENCE.anomalyPerTurn));
function studyAnomaly(s, F, sys, how, share = 1) {
  const n = Math.round(anomalyValue(s) * share), what = sys.anomaly;
  sys.anomaly = null; F.research.progress += n; F.stats.anomalies = (F.stats.anomalies || 0) + 1;
  if (makeRng("anomaly-officer:" + s.seed + ":" + sys.id).next() < OFFICERS.odds.anomaly) gainOfficer(s, F.id, `who joined after studying ${what} at ${sys.name}`);
  const cur = researchItem(s, F.id);
  log(s, F.id, `${how} ${what} at ${sys.name}: +${n} research${cur ? ` toward ${cur.name}` : ", banked for your next research"}.`, "explore");
}
export function updateVision(s, F) {
  const vis = {};
  const charted = [];
  const see = (hex, n) => { for (const k of within(hex, n)) if (s.hexes[k]) { vis[k] = 1; if (!F.explored[k] && !F.ai && s.sysAt[k]) charted.push(s.systems[s.sysAt[k]]); F.explored[k] = 1; } };
  const bonus = (has(s, F.id, "sensors") ? 1 : 0) + (F.id === "ylith" ? 2 : 0) + (has(s, F.id, "resonanceArrays") ? 1 : 0);
  for (const sys of coloniesOf(s, F.id)) see(sys.at, (sys.colony.kind === "colony" ? 2 : 1) + bonus + (sys.colony.buildings.station ? 2 : 0));
  for (const f of fleetsOf(s, F.id)) see(f.at, Math.max(...f.ships.map((x) => shipStats(s, F.id, x.type, x).sensors)) + (hasOfficer(f, "science") ? 2 : 0));
  // Listening posts (key sites) held by this power or an ally: everything within range.
  for (const x of sitesFor(s, F.id, "listening")) see(x.at, SITES.kinds.listening.range);
  // Allies share what their worlds see.
  for (const o of s.factions) if (o.id !== F.id && o.alive && allied(s, F.id, o.id)) for (const sys of coloniesOf(s, o.id)) see(sys.at, 1);
  F.visible = vis;
  // Detection (cloaked ships): worlds a hex or so out, scouts farther, other ships only in their own hex.
  const det = {}, mark = (hex, n) => { for (const k of within(hex, n)) det[k] = 1; };
  const plus = (has(s, F.id, "sensors") ? DETECT.sensors : 0) + (has(s, F.id, "resonanceArrays") ? DETECT.resonance : 0) + (F.id === "ylith" ? DETECT.ylith : 0);
  for (const sys of coloniesOf(s, F.id)) mark(sys.at, DETECT.world + plus + (sys.colony.buildings.station ? DETECT.station : 0));
  for (const f of fleetsOf(s, F.id)) mark(f.at, Math.max(f.ships.some((x) => x.type === "scout") ? DETECT.scout + plus : DETECT.ship, hasOfficer(f, "science") ? 2 : 0));
  for (const x of sitesFor(s, F.id, "listening")) mark(x.at, SITES.kinds.listening.range);
  F.detect = det;
  // Every system the player charts goes into the log, with what's there.
  for (const sys of charted) {
    const what = [worldDesc(sys)];
    if (sys.ruins) what.push("ancient ruins to survey");
    if (sys.colony && sys.colony.owner !== F.id) what.push(`${sys.colony.kind === "colony" ? "a colony" : "an outpost"} of ${faction(s, sys.colony.owner).name}`);
    log(s, F.id, `Charted ${sys.name}: ${what.join(", ")}.`, "explore");
  }
  // Meeting: anyone whose world or fleet you can see.
  for (const o of s.factions) if (o.id !== F.id && o.alive && !F.met[o.id]) {
    const seen = coloniesOf(s, o.id).some((x) => vis[x.at]) || fleetsOf(s, o.id).some((f) => seesFleet(s, F, f));
    if (seen) {
      F.met[o.id] = true; o.met[F.id] = true;
      if (!F.ai && o.ai) sendEnvoy(s, o.id, "hello"); else if (!o.ai && F.ai) sendEnvoy(s, F.id, "hello");
      const w = coloniesOf(s, o.id).find((x) => vis[x.at]), fl = fleetsOf(s, o.id).find((f) => seesFleet(s, F, f));
      const where = w ? `their world ${w.name}` : `${fl.ships.length > 1 ? "a fleet" : "a ship"} of theirs${s.sysAt[fl.at] ? ` at ${s.systems[s.sysAt[fl.at]].name}` : " in deep space"}`;
      log(s, F.id, `${F.name} made contact with ${o.name}: ${where} came into view. Diplomacy is open with them now.`, "contact");
    }
  }
  // Relics: the first fleet to end its turn at one's site recovers it.
  for (const sys of Object.values(s.systems)) if (sys.relic && fleetsAt(s, sys.at).some((f) => f.owner === F.id)) recoverRelic(s, F, sys);
  // Anomalies: a scout that ends its turn at one surveys it.
  for (const sys of Object.values(s.systems)) if (sys.anomaly && fleetsAt(s, sys.at).some((f) => f.owner === F.id && f.ships.some((x) => x.type === "scout")))
    studyAnomaly(s, F, sys, "Your scouts surveyed");
  // Ruins: the first to see them learns something.
  for (const sys of Object.values(s.systems)) if (sys.ruins && vis[sys.at] && fleetsAt(s, sys.at).some((f) => f.owner === F.id)) {
    sys.ruins = false; F.stats.ruins = (F.stats.ruins || 0) + 1;
    if (makeRng("ruins-officer:" + s.seed + ":" + sys.id).next() < OFFICERS.odds.ruins) gainOfficer(s, F.id, `found among the survivors at the ruins of ${sys.name}`);
    // The player decides what to do with a ruin (a galactic event, events.js); the computer powers study it.
    if (!F.ai) { (s.ruinsFound = s.ruinsFound || []).push({ sys: sys.id, fleet: fleetsAt(s, sys.at).find((f) => f.owner === F.id).id, turn: s.turn }); log(s, F.id, `${F.name} found ruins of the old empires at ${sys.name}: what to do with them is yours to decide.`, "explore"); continue; }
    F.research.progress += 60;
    const cur = researchItem(s, F.id);
    log(s, F.id, `${F.name} surveyed the ruins at ${sys.name}: what the old empires left there is worth +60 research${cur ? ` toward ${cur.name}` : ", banked for your next technology"}.`, "explore");
  }
}

// ---- the end of a turn ----
/** aiTurn(state, faction) gives each computer faction's orders (ai.js); the player has given theirs. */
export function endTurn(s, aiTurn) {
  if (s.winner) return;
  if (!s.fields) placeFields(s);   // a game from before space mining
  if (!s.sitesPlaced) placeSites(s);   // ... or before key sites
  for (const F of s.factions) if (F.ai && F.alive && aiTurn) aiTurn(s, F);
  // The standing order: idle fleets with out-of-date ships go to the nearest drydock (not ones told to hold).
  for (const F of s.factions) if (!F.ai && F.alive && F.autoRefit) for (const f of fleetsOf(s, F.id)) if (!f.path.length && !f.sentry && needsRefit(s, f)) sendToDrydock(s, f.id);
  moveFleets(s);
  joinMustered(s);
  battles(s);
  withdrawals(s);
  repairsTurn(s);
  for (const F of s.factions) if (F.alive) economy(s, F);
  miningTurn(s);
  sitesTurn(s);
  checkEngine(s);
  checkCharge(s);
  checkRelics(s);
  clearDeepSites(s);
  // The exotics market drifts back toward its usual price.
  if (s.market) s.market.price += Math.sign(MARKET.base - s.market.price) * Math.min(MARKET.drift, Math.abs(MARKET.base - s.market.price));
  for (const F of s.factions) if (F.alive) updateVision(s, F);
  // Relations drift: borders rub, trade warms, wars wear on everyone.
  for (const A of s.factions) for (const [bid, r] of Object.entries(A.relations)) {
    if (r.status === "war") r.turnsAtWar++;
    if (r.treaty) r.score = Math.min(40, r.score + 0.5);
    if (r.patrol) r.score = Math.min(40, r.score + PATROL.regard);
    const B = faction(s, bid);
    if (A.alive && B.alive && coloniesOf(s, A.id).some((x) => coloniesOf(s, bid).some((y) => distance(x.at, y.at) <= 3))) r.score = Math.max(-60, r.score - 0.4);
  }
  checkVictory(s);
  s.turn++;
}
/** "an ocean world, size 2, rich, an exotics deposit" */
export function worldDesc(sys) {
  const w = WORLDS[sys.world], what = [`${/^[AEIOU]/.test(w.name) ? "an" : "a"} ${w.name.toLowerCase()} world`, `size ${sys.size}`];
  if (sys.rich > 1) what.push("rich"); else if (sys.rich < 1) what.push("poor");
  if (sys.exotics) what.push("an exotics deposit");
  return what.join(", ");
}
function economy(s, F) {
  // A muster point lost (taken, razed) is struck off the standing orders.
  for (const [kind, id] of Object.entries(F.muster || {})) if (!musterOk(s, F.id, id)) {
    delete F.muster[kind];
    if (!F.ai) log(s, F.id, `${s.systems[id] ? s.systems[id].name : "A world"} is no longer yours: new ${kind === "all" ? "ships" : MUSTER_KINDS[kind].toLowerCase()} stay where they're built until you set a new muster point.`, "build");
  }
  const t = totals(s, F.id);
  if (!F.ai) {
    const cur = researchItem(s, F.id);
    log(s, F.id, `The books: ${t.net >= 0 ? "+" : "−"}${Math.abs(round1(t.net))} credits (treasury ${round1(F.credits + t.net)}), +${round1(t.sci)} science ${cur ? `toward ${cur.name} (${Math.round(F.research.progress + t.sci)}/${cur.cost})` : "with nothing to research: choose a technology"}${t.exo ? `, +${round1(t.exo)} exotics` : ""}.`, "turn");
  }
  const strike = F.credits < 0 ? 0.75 : 1; // in debt: the yards and the labs slow down
  F.credits = round1(F.credits + t.net);
  F.exotics += t.exo;
  // Research.
  const R = F.research;
  if (R.current) {
    R.progress += t.sci * strike;
    const tech = researchItem(s, F.id);
    if (tech && tech.adv && R.progress >= tech.cost) {
      R.progress -= tech.cost; R.adv = R.adv || {}; R.adv[tech.adv] = tech.level; R.current = null;
      log(s, F.id, `${F.name} reached ${tech.name}: ${tech.text}${["sensors", "foldDrives", "shields", "targeting", "armor", "fireControl", "tanks"].includes(tech.adv || tech.id) ? " New ships are built with it; ships already in service get it at a drydock." : ""}`, "research");
    } else if (tech && !tech.adv && R.progress >= tech.cost) {
      R.progress -= tech.cost; R.done.push(tech.id); R.current = null;
      log(s, F.id, `${F.name} discovered ${tech.name}: ${tech.text}${["sensors", "foldDrives", "shields", "targeting", "armor", "fireControl", "tanks"].includes(tech.adv || tech.id) ? " New ships are built with it; ships already in service get it at a drydock." : ""}`, "research");
    }
  }
  // Pirate, creature and Warden ships were never anyone's to build (an old bug listed them): any queued are struck off,
  // their industry returned, and any built are gone.
  for (const sys of coloniesOf(s, F.id)) {
    const c = sys.colony, bad = c.queue.filter((q) => q.kind === "ship" && SHIPS[q.id] && (SHIPS[q.id].wild || SHIPS[q.id].warden || SHIPS[q.id].trader));
    if (bad.length) { c.queue = c.queue.filter((q) => !bad.includes(q)); c.stock += bad.reduce((n, q) => n + q.progress, 0); }
  }
  for (const f of fleetsOf(s, F.id)) { f.ships = f.ships.filter((x) => !SHIPS[x.type].wild && !SHIPS[x.type].warden && !SHIPS[x.type].trader); if (!f.ships.length) delete s.fleets[f.id]; }
  // Ships from before systems were fitted one by one keep what they had: today's research.
  for (const f of fleetsOf(s, F.id)) for (const x of f.ships) if (!x.fit) x.fit = currentFit(s, F.id);
  // Each world: production, growth, defenses.
  for (const sys of coloniesOf(s, F.id)) {
    const c = sys.colony, y = yields(s, sys);
    if (c.kind === "colony") {
      c.stock += y.ind * strike;
      // While another Engine stands, one in the queue waits (its progress kept) at the back, and the rest goes ahead.
      if (engineStanding(s) && c.queue[0] && c.queue[0].id === "engine" && c.queue.length > 1) c.queue.push(c.queue.shift());
      // One thing finished a turn: what's left over goes into the next in line, ready to finish next turn.
      let finished = false;
      while (c.queue.length) {
        const q = c.queue[0];
        if (finished) { const put = Math.min(q.cost - q.progress, c.stock); if (put > 0) { q.progress += put; c.stock -= put; } break; }
        if (q.id === "engine" && engineStanding(s)) { if (!q.held) log(s, F.id, `Work on the Corridor Engine at ${sys.name} stops: another stands. What's built is kept, ready for when it falls.`, "build"); q.held = true; break; }
        q.held = false;
        const need = q.cost - q.progress, put = Math.min(need, c.stock);
        q.progress += put; c.stock -= put;
        if (q.progress + 1e-9 < q.cost) break;
        if (q.exotics && F.exotics < q.exotics) { if (!q.waiting) log(s, F.id, `${q.name} at ${sys.name} waits for ${q.exotics} exotics.`, "build"); q.waiting = true; break; }
        // Under siege, nothing finished leaves the yards and no battery goes up: it waits until the orbit is free.
        if ((q.kind === "ship" || q.id === "battery" || q.id === "station") && besieged(s, sys)) { if (!q.blockaded) log(s, F.id, `${q.name} at ${sys.name} is ready, but the siege holds it in the yards.`, "build"); q.blockaded = true; break; }
        q.blockaded = false;
        F.exotics -= q.exotics || 0;
        c.queue.shift(); finished = true;
        if (q.kind === "ship") {
          const warship = SHIPS[q.id].skill > 0, dest = musterFor(s, F.id, q.id);
          if (dest && dest !== sys) {   // a standing order: it leaves for the muster point as soon as it's built
            const nf = spawnFleet(s, F.id, sys.at, [q.id]), r = setDestination(s, nf.id, dest.at);
            if (r.error) log(s, F.id, `${q.name} built at ${sys.name} can't find a way to the muster point at ${dest.name}: it waits here.`, "build");
            else { nf.muster = musterKind(q.id); q.mustered = dest.name; }
          } else {
            const here = (warship && fleetsAt(s, sys.at).find((f) => f.owner === F.id && !f.path.length && f.ships.every((x) => SHIPS[x.type].skill > 0))) || spawnFleet(s, F.id, sys.at, []);
            here.ships.push(newShip(s, F.id, q.id));
          }
          F.stats.built++;
        } else {
          c.buildings[q.id] = true;
          if (q.id === "battery" || q.id === "station") c.defense = gunsMax(s, c);
          if (q.id === "engine" && s.mode === "open") claimEngine(s, sys, F);
          else if (q.id === "engine") startCharge(s, sys, F);
        }
        if (!F.ai || q.kind === "building") {
          const what = (q.kind === "ship" ? SHIPS : BUILDINGS)[q.id];
          log(s, F.id, `${sys.name} finished ${/^[AEIOU]/.test(q.name) ? "an" : "a"} ${q.name}${what && what.text ? `: ${what.text}` : "."}${q.kind === "ship" && !F.ai ? (q.mustered ? ` It's on its way to the muster point at ${q.mustered}.` : " It's in orbit, waiting for orders.") : ""}`, "build");
        }
      }
      c.stock = Math.min(c.stock, 40); // a world can only stockpile so much
      // Growth (nothing grows under siege).
      const max = maxPop(s, sys);
      if (blockaded(s, sys)) { /* the blockade: no growth */ }
      else if (c.pop < max) { c.growth += RULES.growthPerTurn * (F.id === "kel" ? 1.5 : 1) * (has(s, F.id, "frontierCharters") ? 1.15 : 1) * (1 + (max - c.pop) / max); if (c.growth >= 1) { c.growth -= 1; c.pop++; } }
      else c.growth = 0;
    }
    const maxDef = gunsMax(s, c);
    // A world under siege (an enemy's warships in its orbit) can't repair its guns: the battle at the end of a turn knocks
    // them out, and they stay out for the attacker's next turn, so the troops can land.
    if (c.defense < maxDef && !besieged(s, sys)) c.defense = Math.min(maxDef, c.defense + (c.buildings.battery ? BATTERY.repair : 1));
    // The siege, counted in turns once the guns are silent: hunger every few turns, and at last an ordinary colony's surrender.
    if (blockaded(s, sys) && besiegerOf(s, sys)) {   // pirates and creatures blockade, but don't besiege a world into hunger
      c.siege = (c.siege || 0) + 1;
      const by = besiegerOf(s, sys);
      if (c.kind === "colony" && !has(s, c.owner, "torporVaults") && c.siege % (SIEGE.starveEvery * (c.owner === "zhaq" ? 2 : 1)) === 0 && c.pop > 1) {
        c.pop--; log(s, F.id, `${sys.name} is starving under the siege: its population falls to ${c.pop}.`, "war");
        if (by) log(s, by, `${sys.name} is starving under your siege: its population falls to ${c.pop}.`, "war");
      }
      if (by && !c.capital && c.siege >= SIEGE.surrenderAfter && (c.kind !== "colony" || c.pop <= SIEGE.surrenderPop)) {
        log(s, by, `${sys.name} surrendered after ${c.siege} turns of siege.`, "war");
        capture(s, sys, by); c.siege = 0;
      }
    } else if (!besieged(s, sys)) c.siege = 0;
  }
  // Living hulls heal anywhere; others at their own worlds.
  for (const f of fleetsOf(s, F.id)) {
    const home = s.sysAt[f.at] && s.systems[s.sysAt[f.at]].colony && s.systems[s.sysAt[f.at]].colony.owner === F.id;
    // A drydock repairs to full; a station 2 a turn; any world of yours (and the Vael, a shipwright, the Living Keel) 1.
    const here = home && s.systems[s.sysAt[f.at]], free = here && !besieged(s, here);
    const step = free && here.colony.buildings.drydock ? Infinity : free && here.colony.buildings.station ? YARDS.station : 1;
    // A drydock refits every ship there with what's been researched since it was built.
    if (free && here.colony.buildings.drydock) { const n = f.ships.filter((x) => missingFit(s, F.id, x).length).length; if (n) { for (const x of f.ships) refitShip(s, F.id, x); f.refitTrip = false; if (!F.ai) log(s, F.id, `${n} ship${n === 1 ? "" : "s"} refitted at the drydock at ${here.name}: their systems are up to date.`, "build"); } }
    // A shipyard fits the early systems (sensors, drives, shields); the rest waits for a drydock.
    else if (free && here.colony.buildings.shipyard) {
      const early = f.ships.filter((x) => missingKeys(s, F.id, x).some((k) => SHIPYARD_FIT.includes(k)));
      if (early.length) { for (const x of early) refitShip(s, F.id, x, SHIPYARD_FIT); if (!f.ships.some((x) => missingFit(s, F.id, x).length)) f.refitTrip = false;
        if (!F.ai) log(s, F.id, `${early.length} ship${early.length === 1 ? "" : "s"} refitted at the shipyard at ${here.name} with the early systems${f.ships.some((x) => needsDrydock(s, F.id, x)) ? "; the rest needs a drydock" : ""}.`, "build"); }
    }
    if (home || F.id === "vael" || has(s, F.id, "bioticHulls") || admTrait(f, "shipwright") || relicHeld(s, F.id, "keel") || hasOfficer(f, "engineer") || territoryAt(s, f.at) === F.id) for (const x of f.ships) x.hull = Math.min(shipStats(s, F.id, x.type, x).hull, x.hull + (home ? step : 1));
  }
  // Observatories study a nearby anomaly every few turns, without a ship (half what a survey gives).
  if (s.turn % SCIENCE.observatoryEvery === 0) for (const sys of coloniesOf(s, F.id)) {
    if (!sys.colony.buildings.observatory || blockaded(s, sys)) continue;
    const a = Object.values(s.systems).filter((x) => x.anomaly && distance(x.at, sys.at) <= SCIENCE.observatoryRange).sort((x, y) => distance(x.at, sys.at) - distance(y.at, sys.at))[0];
    if (a) studyAnomaly(s, F, a, `The observatory at ${sys.name} studied`, SCIENCE.observatoryShare);
  }
  // The computer powers' research arms field-test prototypes too: one every 25 turns.
  if (F.ai && s.turn % 25 === 12) {
    const p = Object.keys(PROTOTYPES).find((x) => !(F.protos || {})[x]);
    if (p) { F.protos = F.protos || {}; F.protos[p] = true; if (player(s).met[F.id]) log(s, player(s).id, `${F.name} field-tested a prototype: ${PROTOTYPES[p].name} (${PROTOTYPES[p].text})`, "research"); }
  }
  // Tankers: those in supply from a colony or depot fill up; a parked one pays a unit of fuel for each fleet of ours it
  // alone keeps in supply.
  for (const f of fleetsOf(s, F.id)) if (baseSupplyAt(s, F.id, f.at)) for (const x of f.ships) if (x.type === "tanker") { const want = SHIPS.tanker.cargo - (x.cargo ?? SHIPS.tanker.cargo); if (want > 0) x.cargo = (x.cargo ?? SHIPS.tanker.cargo) + Math.floor(drawReserve(s, F.id, want)); }
  // The fuel reserve: what the worlds made this turn, up to what the depots can store.
  if (usesReserve(F.id)) F.fuelStock = round1(Math.min(fuelCap(s, F.id), fuelStock(s, F.id) + fuelIncome(s, F.id)));
  for (const f of fleetsOf(s, F.id)) {
    if (F.id === "vael" || baseSupplyAt(s, F.id, f.at)) continue;
    const tp = tankerPoints(s, F.id).filter((t) => distance(t.at, f.at) <= FUEL.tankerRange).sort((a, b) => cargoOf(b) - cargoOf(a))[0];
    if (tp && tp !== f) drawCargo(tp);
  }
  // Supply: warships too far from every colony and fuel depot of theirs wear down, a hull point a turn after the first
  // (never below 1). Scouts, colony ships, outposts and transports carry what they need.
  for (const f of fleetsOf(s, F.id)) {
    if (!armed(f) || inSupply(s, f) || admTrait(f, "quartermaster")) { f.out = 0; continue; }
    f.out = (f.out || 0) + 1;
    if (f.out <= SUPPLY.graceTurns) { if (!F.ai) log(s, F.id, `A fleet near ${nearestName(s, f.at)} is out of supply: from next turn its warships wear down a hull point a turn.`, "war"); continue; }
    let worn = 0;
    for (const x of f.ships) if (SHIPS[x.type].skill > 0 && x.hull > 1) { x.hull--; worn++; }
    if (worn && !F.ai) log(s, F.id, `Out of supply near ${nearestName(s, f.at)}: ${worn} warship${worn === 1 ? "" : "s"} wear down a hull point. Bring them back within ${supplyRange(s, F.id)} hexes of a world or outpost of yours.`, "war");
  }
}

const nearestName = (s, hex) => { const n = Object.values(s.systems).sort((a, b) => distance(a.at, hex) - distance(b.at, hex))[0]; return n ? n.name : "deep space"; };
// ---- winning ----
export function score(s, fid) {
  const cols = coloniesOf(s, fid);
  const F = faction(s, fid);
  return Math.round(cols.reduce((t, x) => t + (x.colony.kind === "colony" ? 5 + x.colony.pop * 2 : 2), 0) + F.research.done.length * 6 + militaryPower(s, fid) / 4
    + (F.stats.wardenPts || 0) + (F.stats.heart ? 30 : 0) + (F.stats.engineTurns || 0) * ENGINE.scorePerTurn + relicsOf(s, fid).length * RELIC_SCORE
    + siteSystems(s).filter((x) => x.colony && x.colony.owner === fid).length * SCORE_EXTRA.site + (F.stats.won || 0) * SCORE_EXTRA.battle);
}
// ---- relics of the old empires ----
/** Who holds a relic: the owner of the world it's kept at, or null (lost, or not yet found). */
export function relicOwner(s, id) {
  const r = s.relics && s.relics[id]; if (!r || !r.at) return null;
  const c = s.systems[r.at] && s.systems[r.at].colony; return c ? c.owner : null;
}
export const relicHeld = (s, fid, id) => !!s.relics && relicOwner(s, id) === fid;
/** The relics a power holds: [{ id, name, text, at (system), used, ready }]. */
export const relicsOf = (s, fid) => (s.relics ? Object.keys(s.relics).filter((id) => relicOwner(s, id) === fid).map((id) => ({ id, ...RELICS[id], ...s.relics[id] })) : []);
/** Hide the relics: the Star Chart always on the map, a few kept back for the Outer Reach, the rest in ruins and anomalies. */
export function placeRelics(s) {
  if (s.relics) return;
  s.relics = {}; s.relicsReach = [];
  const R = makeRng("relics:" + s.seed);
  const homes = new Set(s.factions.map((F) => F.capital));
  // Not on a homeworld's doorstep: sites 3 or more hexes from every homeworld (unless there are too few).
  const far0 = (x) => Math.min(...[...homes].map((h) => distance(s.systems[h].at, x.at)));
  const all = Object.values(s.systems).filter((x) => (x.ruins || x.anomaly) && !homes.has(x.id) && !x.colony).sort((a, b) => (a.id < b.id ? -1 : 1));
  const sites = all.filter((x) => far0(x) >= 3).length >= 5 ? all.filter((x) => far0(x) >= 3) : all;
  const rest = Object.keys(RELICS).filter((id) => id !== "chart");
  for (let i = 0; i < REACH.reserved && rest.length > 1; i++) s.relicsReach.push(rest.splice(R.int(rest.length), 1)[0]);
  // The Star Chart lies at the site farthest from every homeworld: no one stumbles on it in the first turns.
  const far = (x) => Math.min(...[...homes].map((h) => distance(s.systems[h].at, x.at)));
  sites.sort((a, b) => far(b) - far(a) || (a.id < b.id ? -1 : 1));
  const chartAt = sites.shift() || Object.values(s.systems).filter((x) => !x.colony).sort((a, b) => far(b) - far(a))[0];
  if (chartAt) { chartAt.relic = "chart"; s.relics.chart = { at: null }; }
  for (const id of rest) {
    if (!sites.length) { s.relicsReach.push(id); continue; }
    const sys = sites.splice(R.int(sites.length), 1)[0]; sys.relic = id; s.relics[id] = { at: null };
  }
}
function recoverRelic(s, F, sys) {
  const id = sys.relic, home = s.systems[F.capital] && s.systems[F.capital].colony && s.systems[F.capital].colony.owner === F.id ? s.systems[F.capital] : coloniesOf(s, F.id).find((x) => x.colony.kind === "colony");
  if (!home) return;
  sys.relic = null; sys.relicLost = false;
  s.relics[id] = { ...(s.relics[id] || {}), at: home.id, found: s.turn, owner: F.id };
  F.stats.relics = (F.stats.relics || 0) + 1;
  log(s, F.id, `${F.name} recovered a relic of the old empires at ${sys.name}: ${RELICS[id].name}. It's kept at ${home.name}. ${RELICS[id].text}`, "explore");
  for (const O of s.factions) if (O.id !== F.id && O.met[F.id]) log(s, O.id, `${F.name} has recovered ${RELICS[id].name} from the old empires. It's kept at ${home.name}.`, "explore");
  relicGained(s, F.id, id);
}
function relicGained(s, fid, id) {
  if (id === "oracle") revealAll(s, faction(s, fid));
  if (id === "chart" && faction(s, fid).ai && !s.relics.chart.used) useRelic(s, fid, "chart");
}
const revealAll = (s, F) => { for (const k of Object.keys(s.hexes)) F.explored[k] = 1; };
/** Once a turn: a relic whose world fell changes hands; one whose world is gone lies in the ruins; the Lens keeps the
 * map charted; the Crown wins regard; the Aegis Lattice marks its world. */
function checkRelics(s) {
  if (!s.relics) return;
  for (const sys of Object.values(s.systems)) if (sys.colony) sys.colony.aegis = false;
  for (const [id, r] of Object.entries(s.relics)) {
    if (!r.at) continue;
    const sys = s.systems[r.at];
    if (!sys.colony) {
      // One relic to a site: the others the world held are scattered to the nearest empty systems.
      const to = !sys.relic ? sys : Object.values(s.systems).filter((x) => !x.relic && !x.colony).sort((a, b) => distance(a.at, sys.at) - distance(b.at, sys.at))[0] || sys;
      to.relic = id; to.relicLost = true; r.at = null; r.owner = null;
      log(s, null, `${RELICS[id].name} lies ${to === sys ? `in the ruins of ${sys.name}` : `adrift at ${to.name}, thrown clear when ${sys.name} fell`}: the first fleet to reach it recovers it.`, "explore");
      continue;
    }
    if (sys.colony.owner !== r.owner) {
      const was = r.owner && faction(s, r.owner), now = faction(s, sys.colony.owner);
      log(s, null, `${now.name} took ${RELICS[id].name} with ${sys.name}${was ? ` from ${was.name}` : ""}.`, "explore");
      r.owner = sys.colony.owner; relicGained(s, r.owner, id);
    }
    if (id === "oracle") revealAll(s, faction(s, r.owner));
    if (id === "aegis") sys.colony.aegis = true;
    if (id === "crown") for (const O of s.factions) if (O.alive && O.id !== r.owner && O.relations[r.owner]) O.relations[r.owner].score = Math.min(40, O.relations[r.owner].score + 0.5);
  }
}
/** Use a relic: the Star Chart (once), or the Gate Shard ({ from, to }: a world of yours, an explored system within 8). */
export function useRelic(s, fid, id, opts = {}) {
  const r = s.relics && s.relics[id], F = faction(s, fid);
  if (!r || relicOwner(s, id) !== fid) return { error: "You don't hold it." };
  if (id === "chart") {
    if (r.used) return { error: "The Star Chart has been used: the Outer Reach is open." };
    r.used = s.turn; const n = expandGalaxy(s, F).length;
    log(s, null, `The galaxy is larger than anyone knew. ${F.name} read the Founders' Star Chart, and the Outer Reach opens beyond the rim: ${n} new systems, uncharted.`, "explore");
    return { ok: true, systems: n };
  }
  if (id === "shard") {
    if (r.ready && s.turn < r.ready) return { error: `The Gate Shard is spent until turn ${r.ready}.` };
    const a = s.systems[opts.from], b = s.systems[opts.to];
    if (!a || !a.colony || a.colony.owner !== fid) return { error: "Open it from a world of yours." };
    if (!shardTargets(s, fid, a.id).includes(b)) return { error: "Choose an explored system within 8 hexes that isn't already linked." };
    s.adj[a.id].push(b.id); s.adj[b.id].push(a.id); s.corridors.push([a.id, b.id]);
    r.ready = s.turn + RELICS.shard.every;
    log(s, null, `${F.name} opened a new corridor with the Gate Shard: ${a.name} to ${b.name}.`, "explore");
    return { ok: true };
  }
  return { error: "That relic works by being held." };
}
export const shardTargets = (s, fid, fromId) => { const a = s.systems[fromId], F = faction(s, fid);
  return a ? Object.values(s.systems).filter((x) => x !== a && F.explored[x.at] && distance(x.at, a.at) <= 8 && !s.adj[a.id].includes(x.id)) : []; };
/** The Outer Reach: REACH.rings new rings of hexes beyond the rim, with nebulae, rifts and new systems (ruins, anomalies,
 * and the relics kept back), linked into the corridor network. The chart's reader sees all of it. Returns the count. */
export function expandGalaxy(s, reader, P = {}) {
  const R = makeRng("reach:" + s.seed + ":" + s.turn + (P.kind ? ":" + P.kind : "")), R0 = s.radius, R1 = R0 + (P.rings || REACH.rings);
  const fresh = hexagon(R1).filter((k) => !s.hexes[k]);
  for (const k of fresh) s.hexes[k] = P.sealed ? { terrain: "space", sealed: P.kind } : { terrain: "space" };
  const blob = (terrain, count, len) => { for (let i = 0; i < count; i++) { let k = fresh[R.int(fresh.length)]; for (let j = 0; j < len; j++) { if (s.hexes[k] && distance(k, "0,0") > R0 && distance(k, "0,0") < R1) s.hexes[k].terrain = terrain; const n = neighbors(k).filter((x) => s.hexes[x] && distance(x, "0,0") > R0); if (!n.length) break; k = n[R.int(n.length)]; } } };
  blob("nebula", Math.round(R1 * 0.5 * (P.nebula || 1)), 6); blob("rift", Math.round(R1 * 0.25), 3);
  const old = Object.values(s.systems).filter((x) => !x.deep);
  const density = old.length / (3 * R0 * (R0 + 1) + 1), want = Math.round(density * fresh.length * (P.density || 1));
  const used = new Set(Object.values(s.systems).map((x) => x.name)), names = STAR_NAMES.filter((n) => !used.has(n));
  const syl = [["Ul", "Var", "Thes", "Ory", "Kae", "Mor", "Ix", "Sel", "Dra", "Ny", "Qor", "Ves"], ["dren", "os", "ith", "ara", "on", "ex", "uun", "ia", "el", "ok"]];
  const nameOf = () => { if (names.length) return names.splice(R.int(names.length), 1)[0]; let n; do n = syl[0][R.int(12)] + syl[1][R.int(10)]; while (used.has(n)); used.add(n); return n; };
  const odds = (k) => (P[k] ?? REACH[k]);
  let made = [], tries = 0, next = Object.keys(s.systems).length;
  while (made.length < want && tries++ < 5000) {
    const k = fresh[R.int(fresh.length)];
    if (s.hexes[k].terrain === "rift" || distance(k, "0,0") > R1 - 1 || Object.keys(s.sysAt).some((h) => distance(h, k) < 3)) continue;
    let id = "s" + next++; while (s.systems[id]) id = "s" + next++;
    const roll = R.next(), world = P.habitable ? (roll < 0.3 ? "terran" : roll < 0.52 ? "ocean" : roll < 0.68 ? "desert" : roll < 0.8 ? "arctic" : roll < 0.9 ? "barren" : "gas")
      : roll < 0.16 ? "terran" : roll < 0.3 ? "ocean" : roll < 0.46 ? "desert" : roll < 0.6 ? "arctic" : roll < 0.8 ? "barren" : "gas";
    const rich = P.rich ? P.rich[R.int(P.rich.length)] : [0.6, 1, 1.4, 1.4][R.int(4)];
    s.systems[id] = { id, name: nameOf(), at: k, world, size: 1 + R.int(4), rich, exotics: R.next() < odds("exotics"), ruins: R.next() < odds("ruins"), colony: null, reach: true };
    if (P.kind) s.systems[id].sector = P.kind;
    if (!s.systems[id].ruins && R.next() < odds("anomalies")) s.systems[id].anomaly = ANOMALY_KINDS[R.int(ANOMALY_KINDS.length)];
    s.hexes[k].terrain = "space"; s.sysAt[k] = id; s.adj[id] = []; made.push(s.systems[id]);
  }
  const link = (a, b) => { if (a === b || s.adj[a].includes(b)) return; s.adj[a].push(b); s.adj[b].push(a); s.corridors.push([a, b]); };
  if (P.sealed && P.corridors === false) {
    // Sealed, with no corridors inside: nothing at all until it's opened.
  } else if (P.corridors === false) {
    // No corridors inside: a single one out, from the old map's nearest system.
    let best = null;
    for (const x of made) for (const y of old) { const d = distance(x.at, y.at); if (!best || d < best[2]) best = [x.id, y.id, d]; }
    if (best) link(best[0], best[1]);
  } else {
    // Corridors: each new system to its two nearest within 6, and the new space joined to the old network at its nearest points.
    const shut = (y) => y.sector && y.sector !== P.kind && SECTORS.kinds[y.sector] && (SECTORS.kinds[y.sector].corridors === false || s.hexes[y.at].sealed);   // the Dead Zone stays shut, and a sealed sector till it's opened
    const all = P.sealed ? made : Object.values(s.systems).filter((y) => !y.deep && !shut(y));   // deep-space stations sit off the corridors; a sealed sector links only inside itself
    for (const x of made) all.filter((y) => y !== x).map((y) => [y, distance(x.at, y.at)]).sort((p, q) => p[1] - q[1]).filter(([, d]) => d <= 6).slice(0, 2).forEach(([y]) => link(x.id, y.id));
    const ids = Object.keys(s.systems).filter((i) => !s.systems[i].deep && !shut(s.systems[i]));
    const isNew = new Set(made.map((x) => x.id));
    const comp = () => { const c = {}; let n = 0; for (const a of ids) if (c[a] === undefined) { const st = [a]; c[a] = n; while (st.length) { const x = st.pop(); for (const y of s.adj[x]) if (c[y] === undefined) { c[y] = n; st.push(y); } } n++; } return [c, n]; };
    for (let [c, n] = comp(), guard = 0; !P.sealed && n > 1 && guard < 200; [c, n] = comp(), guard++) {
      const main = c[ids.find((i) => !isNew.has(i))]; let best = null;
      for (const a of ids) if (c[a] === main) for (const b of ids) if (c[b] !== main && isNew.has(b)) { const d = distance(s.systems[a].at, s.systems[b].at); if (!best || d < best[2]) best = [a, b, d]; }
      if (!best) break;
      link(best[0], best[1]);
    }
  }
  // The relics kept back go to the new space's ruins and anomalies.
  const sites = made.filter((x) => x.ruins || x.anomaly);
  for (const id of s.relicsReach || []) { const pool = sites.length ? sites : made; if (!pool.length) break; const x = pool.splice(R.int(pool.length), 1)[0]; x.relic = id; s.relics[id] = { at: null }; }
  s.relicsReach = [];
  placeFields(s, fresh, ":" + s.turn + (P.kind || ""), Math.round(made.length * MINING.density));
  s.radius = R1;
  if (reader) for (const k of fresh) reader.explored[k] = 1;
  return made;
}
// ---- the Corridor Engine's countdown (a standard game) ----
/** The finished Engine charging toward victory: { sys, owner, built, left, paused: null | "wardens" | "siege" }. */
export const engineCharge = (s) => (s.mode !== "open" && s.charge ? s.charge : null);
/** An Engine stands somewhere (an open game's, or a charging one): no other can be built. */
export const engineStanding = (s) => engineHeld(s) || engineCharge(s);
/** The Wardens aren't beaten yet: still to wake, or their Heart stands. (A game without them: never.) */
export const wardensStand = (s) => !!(s.crisis && !s.crisisOff && ["quiet", "stirring", "awake"].includes(s.crisis.stage));
function startCharge(s, sys, F) {
  s.charge = { sys: sys.id, owner: F.id, built: s.turn, left: ENGINE.charge, paused: null };
  // Its first pulse wakes the Wardens, if they're still to come.
  const C = s.crisis; if (C && !s.crisisOff && (C.stage === "quiet" || C.stage === "stirring")) C.at = Math.min(C.at, s.turn + CRISIS.warning);
  log(s, null, `${F.name} finished the Corridor Engine at ${sys.name}. It must charge for ${ENGINE.charge} turns, and it can't while the Wardens stand${C && !s.crisisOff && C.stage !== "over" && C.stage !== "dormant" ? ` (its first pulse has woken them, if they weren't already)` : ""}. Take ${sys.name}, or bring the Engine down from its orbit, before it's done.`, "victory");
  for (const O of s.factions) if (O.alive && O.id !== F.id && O.ai && !allied(s, O.id, F.id)) remember(s, O.id, F.id, "finished the Corridor Engine", ENGINE.grudgeCharge);
}
/** Once a turn: the countdown runs on, pauses, changes hands with its world, or ends (destroyed, or won). */
function checkCharge(s) {
  const E = engineCharge(s); if (!E) return;
  const sys = s.systems[E.sys];
  if (!sys || !sys.colony || !sys.colony.buildings.engine) { s.charge = null; log(s, null, `The Corridor Engine at ${sys ? sys.name : "its world"} is destroyed before it could charge. The race is open again.`, "victory"); return; }
  if (sys.colony.owner !== E.owner) { log(s, null, `${faction(s, sys.colony.owner).name} took the Corridor Engine at ${sys.name} from ${faction(s, E.owner).name}: its charge starts again, for them.`, "victory"); E.owner = sys.colony.owner; E.left = ENGINE.charge; }
  const was = E.paused;
  E.paused = wardensStand(s) ? "wardens" : besieged(s, sys) ? "siege" : null;
  if (E.paused && E.paused !== was) log(s, null, `The Corridor Engine at ${sys.name} stops charging: ${E.paused === "wardens" ? "the Wardens stand, and it can't open the corridors while they do" : "enemy warships hold its orbit"}. ${E.left} turn${E.left === 1 ? "" : "s"} still to go.`, "victory");
  if (E.paused) return;
  E.left--;
  if (E.left <= 0) { s.winner = E.owner; s.winReason = "engine"; log(s, E.owner, `${faction(s, E.owner).name}'s Corridor Engine is charged: the corridors answer to them now.`, "victory"); return; }
  if (E.left <= 3 || was) log(s, null, `The Corridor Engine at ${sys.name} (${faction(s, E.owner).name}): ${E.left} turn${E.left === 1 ? "" : "s"} left to charge.`, "victory");
}
// ---- the Corridor Engine in an open game ----
/** The Engine that stands (open games only), or null: { sys, owner, built, gate }. */
export const engineHeld = (s) => (s.mode === "open" && s.engine ? s.engine : null);
/** This power holds the Engine and no enemy warships hold its orbit: its gifts work. */
export function engineActive(s, fid) {
  const E = engineHeld(s); if (!E || E.owner !== fid) return false;
  const sys = s.systems[E.sys]; return !!(sys && sys.colony) && !besieged(s, sys);
}
function claimEngine(s, sys, F) {
  s.engine = { sys: sys.id, owner: F.id, built: s.turn, gate: s.turn };
  F.stats.enginesBuilt = (F.stats.enginesBuilt || 0) + 1;
  log(s, null, `${F.name} finished the Corridor Engine at ${sys.name}. It holds the corridors now: whoever takes the world takes the Engine, and a barrage from its orbit can bring it down.`, "victory");
}
/** Once a turn: the Engine changes hands with its world, or is gone (destroyed, or its world burned); held, it scores, and
 * the others' regard for its holder sours. */
function checkEngine(s) {
  const E = engineHeld(s); if (!E) return;
  const sys = s.systems[E.sys];
  if (!sys || !sys.colony || !sys.colony.buildings.engine) {
    s.engine = null; (s.enginesLost = s.enginesLost || []).push({ turn: s.turn, owner: E.owner, at: sys ? sys.name : "?" });
    log(s, null, `The Corridor Engine at ${sys ? sys.name : "its world"} is destroyed. The race to build it is open again: any power with the technology can build one at its capital, and work already done counts.`, "victory");
    return;
  }
  if (sys.colony.owner !== E.owner) {
    const was = faction(s, E.owner), now = faction(s, sys.colony.owner);
    log(s, null, `${now.name} took the Corridor Engine at ${sys.name} from ${was.name}.`, "victory");
    E.owner = sys.colony.owner; E.gate = s.turn;
  }
  const H = faction(s, E.owner); H.stats.engineTurns = (H.stats.engineTurns || 0) + 1;
  if ((s.turn - E.built) % ENGINE.grudgeEvery === ENGINE.grudgeEvery - 1)
    for (const O of s.factions) if (O.alive && O.id !== E.owner && O.ai) remember(s, O.id, E.owner, "holds the Corridor Engine", ENGINE.grudge);
}
/** The gate: a fleet at the Engine world jumps to any world of its holder's, now. Once every ENGINE.gateEvery turns. */
export function gateTargets(s, fleetId) {
  const f = s.fleets[fleetId], E = engineHeld(s);
  if (!f || !E || f.owner !== E.owner || f.at !== s.systems[E.sys].at || !engineActive(s, f.owner)) return [];
  return coloniesOf(s, f.owner).filter((x) => x.id !== E.sys);
}
export function engineGate(s, fleetId, sysId) {
  const f = s.fleets[fleetId], E = engineHeld(s);
  if (!f || !E) return { error: "There's no Corridor Engine." };
  if (f.owner !== E.owner) return { error: "The Engine isn't yours." };
  if (!engineActive(s, f.owner)) return { error: "Enemy warships hold the Engine's orbit: the gate is shut." };
  if (s.turn < E.gate) return { error: `The gate opens again on turn ${E.gate}.` };
  const to = gateTargets(s, fleetId).find((x) => x.id === sysId);
  if (!to) return { error: "The gate opens from the Engine world to your other worlds." };
  f.at = to.at; f.path = []; f.dest = null; f.fuel = fuelMax(s, f);
  E.gate = s.turn + ENGINE.gateEvery;
  log(s, f.owner, `A fleet went through the Corridor Engine's gate to ${to.name}. The gate opens again on turn ${E.gate}.`, "war");
  return { ok: true };
}
function checkVictory(s) {
  if (s.winner) return;
  const alive = s.factions.filter((f) => f.alive);
  if (alive.length === 1 && !(s.kept || []).some((k) => k.reason === "conquest")) { s.winner = alive[0].id; s.winReason = "conquest"; log(s, alive[0].id, `${alive[0].name} stands alone. Conquest victory.`, "victory"); return; }
  if (!player(s).alive) { s.winner = "none"; s.winReason = "fallen"; return; }
  if (s.mode !== "open" && s.turn >= RULES.maxTurns) {
    const best = alive.sort((a, b) => score(s, b.id) - score(s, a.id))[0];
    s.winner = best.id; s.winReason = "score"; log(s, best.id, `Turn ${RULES.maxTurns}: ${best.name} leads on score.`, "victory");
  }
}
