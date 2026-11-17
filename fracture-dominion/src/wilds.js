// The wild things: threats that belong to no power. Pirate havens appear in empty systems and send out raiders, who
// hold the orbits of weak worlds (a blockade) and take their credits. Crystal swarms nest on the rich systems everyone
// wants. Void leviathans drift between the stars and feed on unguarded worlds. All of them are at war with every power
// (never with each other); destroying one pays a bounty in credits and research (game.js, bounty).
import { makeRng, distance } from "./hex.js";
import { SHIPS, WILDS, WILD_LEVELS } from "./data.js";
import { player, faction, fleetsOf, fleetsAt, spawnFleet, setDestination, guarded, log, rng, placeAnomalies, placeRelics } from "./game.js";

export const PIRATES = "pirates", BEASTS = "beasts";
const power = (id) => ({ id, name: WILDS[id].name, color: WILDS[id].color, ai: true, alive: true, wild: true, capital: null, credits: 0, exotics: 0,
  research: { current: null, progress: 0, done: [] }, explored: {}, visible: {}, relations: {}, met: {}, stats: { built: 0, lost: 0, won: 0 },
  focus: { industry: 0, science: 0, credits: 0, defense: 0 }, protos: {} });
const seenBy = (s, hex) => player(s).visible[hex];
const havens = (s) => fleetsOf(s, PIRATES).filter((f) => f.ships.some((x) => x.type === "haven"));
const isHaven = (f) => f.ships.some((x) => x.type === "haven");
const colonyMin = (s, hex) => Math.min(99, ...Object.values(s.systems).filter((x) => x.colony).map((x) => distance(x.at, hex)));

/** Where things stand, for the panels: the havens, swarms and leviathans the player has seen. */
export function wildsState(s) {
  if (!s.wilds) return null;
  const me = player(s), count = (fid, type) => fleetsOf(s, fid).filter((f) => f.ships.some((x) => x.type === type)).length;
  return { havens: count(PIRATES, "haven"), raiders: fleetsOf(s, PIRATES).filter((f) => !isHaven(f)).length,
    swarms: count(BEASTS, "swarm"), leviathans: count(BEASTS, "leviathan"),
    seen: [...fleetsOf(s, PIRATES), ...fleetsOf(s, BEASTS)].filter((f) => me.explored[f.at] && (isHaven(f) || f.ships.some((x) => x.type === "swarm") || me.visible[f.at])).length };
}

/** The game's setting: none, light (the default, and for games saved before there was a choice) or heavy. */
export const wildsLevel = (s) => (s.wildsOff ? "none" : WILD_LEVELS[s.wildsLevel] ? s.wildsLevel : "light");
const L = (s) => WILD_LEVELS[wildsLevel(s)];
/** Change the setting mid-game. Fewer: the havens and swarms beyond the new limit are gone (those nearest the settled
 * worlds first), with their raiders; None: every pirate and creature is gone. */
export function setWildsLevel(s, level) {
  if (!WILD_LEVELS[level]) return { error: "No such setting." };
  s.wildsLevel = level; s.wildsOff = level === "none";
  prune(s);
  log(s, null, `Pirates and creatures: ${WILD_LEVELS[level].name.toLowerCase()}. ${WILD_LEVELS[level].text}`, "war");
  return { ok: true };
}
function prune(s) {
  if (wildsLevel(s) === "none") { for (const f of [...fleetsOf(s, PIRATES), ...fleetsOf(s, BEASTS)]) delete s.fleets[f.id]; return; }
  const P = L(s), near = (f) => colonyMin(s, f.at);
  const cut = (list, max, also) => { list.sort((a, b) => near(a) - near(b)); while (list.length > max) { const f = list.shift(); if (also) also(f); delete s.fleets[f.id]; } };
  cut(havens(s), P.havens[s.size] || 1, (h) => { for (const r of fleetsOf(s, PIRATES)) if (!isHaven(r) && r.home === h.at) delete s.fleets[r.id]; });
  for (const h of havens(s)) cut(fleetsOf(s, PIRATES).filter((r) => !isHaven(r) && r.home === h.at), P.raidersPerHaven);
  cut(fleetsOf(s, BEASTS).filter((f) => f.ships[0].type === "swarm"), P.swarms[s.size] || 1);
  cut(fleetsOf(s, BEASTS).filter((f) => f.ships[0].type === "leviathan"), P.leviathans);
}

/** Once a turn, after the turn resolves: new havens and leviathans, the raids, the wandering. */
export function wildsTurn(s) {
  if (s.wildsOff || s.winner) return;
  placeAnomalies(s); placeRelics(s);
  // A game saved before the setting existed starts on Light, trimmed to it.
  if (!s.wildsLevel) { s.wildsLevel = "light"; if (s.wilds) prune(s); }
  const P = L(s);
  if (!s.wilds) {
    s.wilds = { pirates: power(PIRATES), beasts: power(BEASTS), nextHaven: Math.max(s.turn + 2, WILDS.havenFirst), nextLeviathan: Math.max(s.turn + 5, P.leviathanFirst) };
    nestSwarms(s);
  }
  const W = s.wilds, R = rng(s);
  if (s.turn >= W.nextHaven) {
    W.nextHaven = s.turn + P.havenEvery;
    if (havens(s).length < (P.havens[s.size] || 1)) newHaven(s, R);
  }
  if (s.turn >= W.nextLeviathan) {
    W.nextLeviathan = s.turn + WILDS.leviathanEvery;
    if (s.turn >= P.leviathanFirst && fleetsOf(s, BEASTS).filter((f) => f.ships.some((x) => x.type === "leviathan")).length < P.leviathans) newLeviathan(s, R);
  }
  for (const f of [...fleetsOf(s, PIRATES), ...fleetsOf(s, BEASTS)]) {
    if (!s.fleets[f.id]) continue;
    for (const x of f.ships) x.hull = Math.min(SHIPS[x.type].hull, x.hull + (x.type === "raider" && f.at !== f.home ? 0 : 1));
    const type = f.ships[0] && f.ships[0].type;
    if (type === "haven") launchRaiders(s, f);
    else if (type === "raider") raid(s, f, R);
    else if (type === "leviathan") wander(s, f, R);
  }
  R.save();
}

/** Crystal swarms nest, once, on rich or exotic systems no one holds, away from the starting worlds. */
function nestSwarms(s) {
  const R = makeRng("swarms:" + s.seed);
  const pool = Object.values(s.systems).filter((x) => !x.colony && (x.exotics || x.rich > 1) && colonyMin(s, x.at) >= 3 && !fleetsAt(s, x.at).length)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  for (let n = L(s).swarms[s.size] || 1; n > 0 && pool.length; n--) {
    const sys = pool.splice(R.int(pool.length), 1)[0];
    spawnFleet(s, BEASTS, sys.at, ["swarm"]).home = sys.at;
  }
}

function newHaven(s, R) {
  const taken = havens(s).map((f) => f.at);
  // An empty system 3–7 hexes from the nearest world; once the map fills up, an asteroid field in deep space 2 or more away.
  const ok = (k) => !fleetsAt(s, k).length && taken.every((h) => distance(h, k) >= 5);
  let pool = Object.values(s.systems).filter((x) => !x.colony && ok(x.at)).map((x) => ({ k: x.at, name: x.name, d: colonyMin(s, x.at) }))
    .filter((o) => o.d >= 3 && o.d <= 7);
  if (!pool.length) pool = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && ok(k)).map((k) => ({ k, name: null, d: colonyMin(s, k) }))
    .filter((o) => o.d >= 2 && o.d <= 6);
  pool.sort((a, b) => a.d - b.d || (a.k < b.k ? -1 : 1));
  const pick = pool[R.int(Math.min(pool.length, 5))]; if (!pick) return;
  const f = spawnFleet(s, PIRATES, pick.k, ["haven"]); f.home = pick.k; f.born = s.turn;
  const near = Object.values(s.systems).filter((x) => x.colony && distance(x.at, pick.k) <= WILDS.raidRange).sort((a, b) => distance(a.at, pick.k) - distance(b.at, pick.k));
  const where = pick.name || `an asteroid field near ${near[0] ? near[0].name : "the frontier"}`;
  for (const fid of new Set(near.map((x) => x.colony.owner))) log(s, fid, `Pirates have set up a haven at ${where}, close to your worlds. Its raiders will come for weak worlds until someone burns it (a bounty of ${WILDS.bounty.haven.credits} credits and ${WILDS.bounty.haven.research} research).`, "war");
}

function launchRaiders(s, haven) {
  const P = L(s);
  if ((s.turn - (haven.born || 0)) % P.raidEvery !== 0) return;
  const out = fleetsOf(s, PIRATES).filter((f) => !isHaven(f) && f.home === haven.at).length;
  if (out >= P.raidersPerHaven) return;
  const n = Math.min(P.raidMax, 2 + Math.floor(s.turn / 50));
  const f = spawnFleet(s, PIRATES, haven.at, []); f.home = haven.at; f.stay = 0;
  for (let i = 0; i < n; i++) f.ships.push({ type: "raider", hull: SHIPS.raider.hull });
}

/** Worth a raid: an established colony (population preyPop or more, and not newly founded). Outposts and young colonies
 * have nothing worth taking, so the frontier can still be settled. */
const worthRaiding = (s, x) => !!(x.colony && x.colony.kind === "colony" && x.colony.pop >= WILDS.preyPop && !(x.colony.founded && s.turn - x.colony.founded < WILDS.youngTurns)
  && !(s.wilds && s.wilds.avoid && s.wilds.avoid[x.id] > s.turn));   // a world that cost them ships: they stay away a while
/** Raiders: hold an unguarded orbit for a few turns, taking credits each turn (the blockade halves the world's yields
 * too); hurt or done, go home; otherwise pick the next weak world within reach of the haven. */
function raid(s, f, R) {
  if (f.path.length) return;
  const sys = s.sysAt[f.at] && s.systems[s.sysAt[f.at]];
  const hurt = f.ships.reduce((t, x) => t + x.hull, 0) < f.ships.length * SHIPS.raider.hull * 0.5;
  if (sys && worthRaiding(s, sys) && !guarded(s, sys, PIRATES) && !hurt && (f.stay || 0) < WILDS.raidStay) {
    const c = sys.colony, F = faction(s, c.owner), take = Math.min(Math.max(0, Math.floor(F.credits)), WILDS.raidCredits + (c.kind === "colony" ? c.pop * WILDS.raidPerPop : 0));
    f.stay = (f.stay || 0) + 1;
    if (take > 0) { F.credits -= take; log(s, F.id, `Pirate raiders hold the orbit of ${sys.name} and took ${take} credits. Send warships, or give it guns.`, "war"); }
    else if (f.stay === 1) log(s, F.id, `Pirate raiders hold the orbit of ${sys.name}: it's blockaded until they're driven off.`, "war");
    return;
  }
  f.stay = 0;
  const haven = s.fleets && havens(s).find((h) => h.at === f.home);
  if (hurt && haven && f.at !== haven.at) { setDestination(s, f.id, haven.at); return; }
  const from = haven ? haven.at : f.at;
  const prey = Object.values(s.systems).filter((x) => worthRaiding(s, x) && x !== sys && distance(x.at, from) <= WILDS.raidRange && !guarded(s, x, PIRATES))
    .map((x) => ({ x, v: (x.colony.kind === "colony" ? x.colony.pop : 1) - distance(x.at, f.at) * 0.5 })).sort((a, b) => b.v - a.v).slice(0, 3);
  const pick = prey[R.int(Math.max(1, prey.length))];
  if (pick && setDestination(s, f.id, pick.x.at).ok) return;
  if (haven && f.at !== haven.at) setDestination(s, f.id, haven.at);
}

function newLeviathan(s, R) {
  const pool = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && !fleetsAt(s, k).length && colonyMin(s, k) >= 4);
  const k = pool.sort()[R.int(Math.max(1, pool.length))]; if (!k) return;
  const f = spawnFleet(s, BEASTS, k, ["leviathan"]); f.stay = 0;
  const near = Object.values(s.systems).filter((x) => x.colony && distance(x.at, k) <= 8).map((x) => x.colony.owner);
  for (const fid of new Set(near)) log(s, fid, `Something vast has come out of the dark between the stars: a void leviathan, drifting toward the settled worlds. It feeds on worlds with no guns or warships to drive it off.`, "war");
}

/** A leviathan drifts from system to system; at an unguarded colony it feeds (a population every other turn). */
function wander(s, f, R) {
  if (f.path.length) return;
  const sys = s.sysAt[f.at] && s.systems[s.sysAt[f.at]];
  f.stay = (f.stay || 0) + 1;
  if (sys && sys.colony && sys.colony.kind === "colony" && !guarded(s, sys, BEASTS) && f.stay <= 4) {
    if (f.stay % 2 === 0 && sys.colony.pop > 1) { sys.colony.pop--; log(s, sys.colony.owner, `The void leviathan is feeding on ${sys.name}: its population falls to ${sys.colony.pop}.`, "war"); }
    return;
  }
  if (f.stay < 2) return;
  const near = Object.values(s.systems).filter((x) => x.at !== f.at && distance(x.at, f.at) <= 6);
  for (let i = 0; i < 4 && near.length; i++) { const x = near[R.int(near.length)]; if (setDestination(s, f.id, x.at).ok) { f.stay = 0; if (x.colony && seenBy(s, f.at)) log(s, x.colony.owner, `The void leviathan is drifting toward ${x.name}.`, "war"); return; } }
}
