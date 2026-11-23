// The computer factions: each turn they pick research, fill their build queues, explore, settle, defend and, when
// they're strong enough and angry enough, go to war. Simple rules, read from what each faction can see.
import { distance, neighbors, hexLine, makeRng } from "./hex.js";
import { wardenIntel, shareIntel } from "./crisis.js";
import { SHIPS, WORLDS, TECHS, FUEL, AI_STATIONS, AI_CALM, SECTORS, INFLUENCE } from "./data.js";
import { findPath, aiOpt, canFoundStation, foundStation, missingFit, refitPlace, outpostOptions, buildAtOutpost, patrolling, faction, engineHeld, relicHeld, useRelic, shardTargets, canRaidDepot, raidDepot, coloniesOf, fleetsOf, fleetsAt, shipStats, canSettle, maxPop, availableTechs, availableAdvances, setResearch, enqueue, rush, totals,
  setDestination, settle, splitFleet, dropFleet, assignAdmiral, allied, invade, invasionOdds, barrage, barrageTargets, besieged, tradeExotics, marketPrice, buildDepot, inSupplyAt, fuelOf, supplySources, supplyRange, fleetSpeed, armed, atWar, declareWar, propose, militaryPower, player, has, log, yields, usesReserve, fuelStock, fuelCap, beaconSites, buildBeacon, canCrossSealed, engaged, setWithdraw, sendForRepairs, repairPlace, giveGift, amendsCost, makeAmends, joinWarPrice, askJoinWar, denounce, exactTribute, score } from "./game.js";

const PRIORITY = {
  // Orbital shipyards early: research reaches a power's existing ships only at a drydock.
  concord: ["xenology", "automation", "sensors", "orbitalYards", "domes", "commerce", "heavyHulls", "foldDrives", "terraforming", "refining"],
  tessan: ["commerce", "automation", "xenology", "orbitalYards", "sensors", "refining", "heavyHulls", "terraforming", "domes"],
  kel: ["automation", "xenology", "commerce", "orbitalYards", "domes", "terraforming", "sensors", "batteries", "heavyHulls"],
  hegemony: ["automation", "heavyHulls", "orbitalYards", "shields", "targeting", "xenology", "batteries", "refining", "capitalShips"],
  vael: ["sensors", "automation", "orbitalYards", "foldDrives", "xenology", "shields", "heavyHulls", "corridorTheory", "refining"],
  mirrun: ["automation", "sensors", "orbitalYards", "xenology", "domes", "commerce", "terraforming", "refining", "corridorTheory"],
  ylith: ["sensors", "foldDrives", "automation", "orbitalYards", "xenology", "commerce", "shields", "corridorTheory", "refining"],
  zhaq: ["automation", "batteries", "orbitalYards", "sensors", "shields", "heavyHulls", "xenology", "targeting", "refining"],
};
const AGGRESSION = { concord: 0.9, tessan: 0.7, kel: 0.9, hegemony: 1.4, vael: 1.0, mirrun: 0.7, ylith: 1.0, zhaq: 1.1 };
const DIFF = { easy: 0.7, normal: 1, hard: 1.35 };

export function aiTurn(s, F) {
  const diff = aiOpt(s, "strength") || DIFF[s.difficulty] || 1;
  research(s, F);
  relics(s, F);
  beacons(s, F);
  outposts(s, F);
  diplomacy(s, F, diff);
  influence(s, F);
  shareWardenIntel(s, F);
  production(s, F, diff);
  fleets(s, F);
}

/** A Rift beacon, when a world of ours sits by a sealed sector and the treasury can spare it (without Rift drives,
 * or with them but rich enough to want the corridor in). */
function beacons(s, F) {
  const B = SECTORS.beacon, site = beaconSites(s, F.id)[0];
  if (site && F.exotics >= B.exotics + 5 && F.credits >= B.credits + (has(s, F.id, "riftDrives") ? 300 : 120)) buildBeacon(s, F.id, site.sys.id);
}
function research(s, F) {
  if (F.research.current) return;
  const avail = availableTechs(s, F.id);
  // Every technology done (or nothing left worth more): an advance, the cheapest level first.
  if (!avail.length) { const adv = availableAdvances(s, F.id).sort((a, b) => a.cost - b.cost)[0]; if (adv) setResearch(s, F.id, adv.id); return; }
  // Its own signature technology, once the basics are in.
  const own = avail.find((t) => t.only === F.id);
  if (own && F.research.done.length >= 4) { setResearch(s, F.id, own.id); return; }
  // A sealed sector out there (or announced): Rift drives, to get in first.
  const sealedNear = Object.values(s.hexes).some((h) => h.sealed) || !!(s.sectors && s.sectors.coming && SECTORS.kinds[s.sectors.coming].sealed);
  if (sealedNear && avail.some((t) => t.id === "riftDrives")) { setResearch(s, F.id, "riftDrives"); return; }
  const pri = PRIORITY[F.id] || [];
  const want = pri.find((id) => avail.some((t) => t.id === id)) || [...avail].sort((a, b) => a.cost - b.cost)[0].id;
  // Late in the game, the Corridor Engine.
  setResearch(s, F.id, avail.some((t) => t.id === "engine") && s.turn > 90 ? "engine" : want);
}

/** Relics: the Star Chart is read as soon as it's found (game.js); the Gate Shard links the capital to the farthest
 * world of ours it can reach that isn't linked already. */
/**
 * Deep-space stations (the "stations" option): where this power's supply runs short on the way to its nearest rival,
 * a station in open space a hex or two past the edge. At most AI_STATIONS.perColonies colonies to a station.
 */
export function stationTarget(s, F) {
  if (!aiOpt(s, "stations") || !has(s, F.id, "orbitalYards")) return null;
  const mine = coloniesOf(s, F.id), cols = mine.filter((x) => x.colony.kind === "colony");
  const have = mine.filter((x) => x.deep).length;
  if (have >= Math.min(AI_STATIONS.max, Math.floor(cols.length / AI_STATIONS.perColonies))) return null;
  const rivals = s.factions.filter((o) => o.alive && o.id !== F.id && F.met[o.id] && !allied(s, F.id, o.id));
  const range = supplyRange(s, F.id), sources = supplySources(s, F.id);
  // Approach lines: from our nearest world toward each rival's capital and its few worlds nearest us, shortest first.
  const lines = [];
  for (const o of rivals) {
    const theirs = coloniesOf(s, o.id); if (!theirs.length) continue;
    const near = (x) => Math.min(...cols.map((c) => distance(c.at, x.at)));
    const targets = [...new Set([s.systems[o.capital], ...theirs.sort((a, b) => near(a) - near(b)).slice(0, 3)])].filter((e) => e && e.colony && e.colony.owner === o.id);
    for (const e of targets) { const c = cols.slice().sort((a, b) => distance(a.at, e.at) - distance(b.at, e.at))[0]; if (c && distance(c.at, e.at) <= Math.max(18, Math.round(s.radius * 1.75))) lines.push({ c, e, theirs, d: distance(c.at, e.at) }); }
  }
  lines.sort((a, b) => a.d - b.d);
  // On each: open space 2–4 hexes out from our worlds (or just past the edge of our supply), 2 or more from theirs, not
  // near a station of ours; the most forward such hex on the shortest line that has one.
  for (const L of lines) {
    let pick = null;
    for (const k of hexLine(L.c.at, L.e.at)) {
      if (s.sysAt[k] || !s.hexes[k] || s.hexes[k].terrain !== "space") continue;
      const ours = Math.min(...mine.map((x) => distance(x.at, k))), gap = Math.min(99, ...sources.map((x) => distance(x.at, k)));
      if (ours < 2 || (ours > 4 && gap > range + 1)) continue;
      if (L.theirs.some((x) => distance(x.at, k) < 2)) continue;
      if (mine.some((x) => x.deep && distance(x.at, k) < 5) || fleetsOf(s, F.id).some((f) => f.stationAt === k)) continue;
      pick = k;
    }
    if (pick) return pick;
  }
  return null;
}
/** Outposts: at war, a frontier outpost near the enemy gets an Orbital battery (or station) when the treasury is full. */
function outposts(s, F) {
  if (!aiOpt(s, "fortify")) return;
  const foes = Object.entries(F.relations).filter(([, r]) => r.status === "war").map(([o]) => o); if (!foes.length) return;
  const enemyWorlds = foes.flatMap((o) => coloniesOf(s, o));
  for (const sys of coloniesOf(s, F.id).filter((x) => x.colony.kind === "outpost")) {
    if (!enemyWorlds.some((e) => distance(e.at, sys.at) <= 4)) continue;
    const o = outpostOptions(s, sys.id).sort((a, b) => (a.id === "battery" ? -1 : 1))[0];
    if (o && F.credits >= o.credits * 2.5) { buildAtOutpost(s, F.id, sys.id, o.id); return; }
  }
}
function relics(s, F) {
  if (!relicHeld(s, F.id, "shard")) return;
  const r = s.relics.shard; if (r.ready && s.turn < r.ready) return;
  const cap = s.systems[F.capital]; if (!cap || !cap.colony || cap.colony.owner !== F.id) return;
  const mineIds = new Set(coloniesOf(s, F.id).map((x) => x.id));
  const t = shardTargets(s, F.id, cap.id).filter((x) => mineIds.has(x.id)).sort((a, b) => distance(b.at, cap.at) - distance(a.at, cap.at))[0];
  if (t) useRelic(s, F.id, "shard", { from: cap.id, to: t.id });
}
/** A people's signature technology and its hub building: { tech, id } or null. */
const hubOf = (fid) => { const t = TECHS.find((x) => x.only === fid); return t ? { tech: t.id, id: t.hub } : null; };
/** Every few turns, while the Wardens are about: tell the powers it likes (and its allies) what it knows of them. */
function shareWardenIntel(s, F) {
  if (!s.crisis || s.turn - (F.lastIntel || -99) < 4) return;
  for (const O of s.factions) {
    if (!O.alive || O.id === F.id || !F.met[O.id] || atWar(s, F.id, O.id)) continue;
    const r = F.relations[O.id]; if (!(r.allied || r.score >= 5)) continue;
    if (wardenIntel(s, F.id, O.id).length && shareIntel(s, F.id, O.id).ok) F.lastIntel = s.turn;
  }
}
/**
 * Influence (the "influence" option): at most one move every INFLUENCE.ai.every turns, by its people's leanings. A power
 * that fears a stronger neighbour who dislikes it sends a gift, or makes amends for what it did to them; one losing a
 * war pays a friend to join it; one that resents the leader (or the Engine's holder) denounces it to others; a strong
 * one demands tribute from the weak (from the player only with the "tribute" option, through a message: envoys.js).
 */
function influence(s, F) {
  if (!aiOpt(s, "influence") || s.turn < 20 || s.turn - (F.lastInfluence || -99) < INFLUENCE.ai.every) return;
  const L = INFLUENCE.ai.leanings[F.id] || INFLUENCE.ai.leanings.concord, R = makeRng("influence:" + s.seed + ":" + s.turn + ":" + F.id);
  const go = (k) => R.next() < 0.5 * L[k];
  const mine = militaryPower(s, F.id), met = s.factions.filter((O) => O.alive && O.id !== F.id && F.met[O.id] && O.relations[F.id]);
  const done = () => { F.lastInfluence = s.turn; return true; };
  // Fear: a much stronger power, at peace with us, that doesn't like us.
  // (The player keeps no regard of its own: for the player, it's tension: we dislike them, or their worlds crowd ours.)
  const near = (O) => coloniesOf(s, O.id).some((x) => coloniesOf(s, F.id).some((y) => distance(x.at, y.at) <= 4));
  const uneasy = (O) => (O.ai ? O.relations[F.id].score < -8 : F.relations[O.id].score < 0 || near(O));
  for (const O of met.filter((O) => !atWar(s, F.id, O.id) && militaryPower(s, O.id) >= mine * 1.5 && uneasy(O)).sort((a, b) => militaryPower(s, b.id) - militaryPower(s, a.id))) {
    const mem = O.relations[F.id].memory || [], worst = mem.map((m, i) => ({ m, i, c: amendsCost(s, F.id, O.id, i) })).filter((x) => x.c !== null && x.m.d <= -8 && x.c <= F.credits * 0.5).sort((a, b) => a.m.d - b.m.d)[0];
    if (worst && go("amends") && makeAmends(s, F.id, O.id, worst.i).ok) return done();
    const c = Math.min(150, Math.round(F.credits * 0.25 / 25) * 25);
    if (c >= 25 && go("gift") && giveGift(s, F.id, O.id, { credits: c }).ok) return done();
  }
  // A war going badly: pay a friend to join it.
  for (const E of met.filter((E) => atWar(s, F.id, E.id) && militaryPower(s, E.id) > mine * 0.9)) {
    const Y = met.filter((Y) => Y.ai && Y.id !== E.id && Y.relations[E.id] && !atWar(s, Y.id, E.id) && !allied(s, Y.id, E.id)).map((Y) => ({ Y, p: joinWarPrice(s, F.id, Y.id, E.id) }))
      .filter((x) => x.p !== null && x.p <= F.credits * 0.5).sort((a, b) => a.p - b.p || militaryPower(s, b.Y.id) - militaryPower(s, a.Y.id))[0];
    if (Y && go("joinWar") && askJoinWar(s, F.id, Y.Y.id, E.id).ok) return done();
  }
  // The leader: whoever holds the Corridor Engine, or a clear front-runner on score, if we don't like them.
  const E = engineHeld(s), ranked = s.factions.filter((X) => X.alive).sort((a, b) => score(s, b.id) - score(s, a.id));
  const lead = E && E.owner !== F.id ? faction(s, E.owner) : ranked[0] && ranked[0].id !== F.id && ranked[1] && score(s, ranked[0].id) >= score(s, ranked[1].id) * 1.3 ? ranked[0] : null;
  if (lead && F.relations[lead.id] && F.relations[lead.id].score < 5 && go("denounce")) {
    const T = met.filter((T) => T.id !== lead.id && T.relations[lead.id] && !allied(s, T.id, lead.id)).sort((a, b) => militaryPower(s, b.id) - militaryPower(s, a.id))[0];
    if (T && denounce(s, F.id, lead.id, T.id).ok) return done();
  }
  // The weak: tribute (from another computer power; the player is asked by message instead).
  const prey = met.filter((O) => O.ai && !atWar(s, F.id, O.id) && !allied(s, F.id, O.id) && militaryPower(s, O.id) < mine * INFLUENCE.tribute.weaker && O.credits >= INFLUENCE.tribute.min).sort((a, b) => b.credits - a.credits)[0];
  if (prey && go("tribute") && exactTribute(s, F.id, prey.id).ok) return done();
}
/** How damaged a ship must be (share of its hull left) before each people sends it for repairs: the cautious sooner. */
const REPAIR_AT = { concord: 0.6, mirrun: 0.6, tessan: 0.6, ylith: 0.5, vael: 0.5, zhaq: 0.5, kel: 0.4, hegemony: 0.4 };
/** A war fleet out of combat, not on its way to strike an enemy world: its badly damaged ships go to the nearest
 * yard that can mend them within 6 turns, and come back to it. True if it sent them. */
function repairNow(s, F, f, enemies) {
  if (!armed(f) || f.coalition || engaged(s, f)) return false;
  const dsys = f.dest && s.sysAt[f.dest] && s.systems[s.sysAt[f.dest]];
  if (dsys && dsys.colony && enemies.includes(dsys.colony.owner)) return false;   // on its way to strike: no stopping
  const at = REPAIR_AT[F.id] || 0.5;
  const bad = f.ships.filter((x) => x.hull <= shipStats(s, F.id, x.type, x).hull * at && shipStats(s, F.id, x.type, x).speed);
  if (!bad.length) return false;
  const sp = Math.min(...bad.map((x) => shipStats(s, F.id, x.type, x).speed)), rp = repairPlace(s, F.id, f.at, bad, sp);
  if (!rp || rp.turns > 6) return false;
  // Not with enemy warships close by: the trip has to be safe.
  if (Object.values(s.fleets).some((o) => armed(o) && atWar(s, F.id, o.owner) && distance(o.at, f.at) <= 3)) return false;
  // Only the badly damaged go, unless what would stay is too small to hold on its own: then the whole fleet goes.
  const stay = f.ships.length - bad.length;
  if (stay < 3 || stay < f.ships.length * 0.4) {
    if (f.at === rp.sys.at) return false;   // already there: it mends where it is
    if (!setDestination(s, f.id, rp.sys.at).ok) return false;
    f.repairAt = rp.sys.id; f.rejoin = null; return true;
  }
  return !!sendForRepairs(s, f.id, true, bad).ok;
}
function diplomacy(s, F, diff) {
  for (const [oid, r] of Object.entries(F.relations)) {
    const O = faction(s, oid); if (!O.alive || !F.met[oid]) continue;
    const mine = militaryPower(s, F.id), theirs = militaryPower(s, oid);
    if (r.status === "war") {
      // Tired of losing: offer peace. To another computer faction, settle it now; to the player, ask.
      if (r.turnsAtWar > 12 && mine < theirs * 1.1) {
        if (O.ai) propose(s, F.id, oid, "peace");
        else if (!s.offers.some((o) => o.from === F.id)) { s.offers.push({ from: F.id, to: oid, what: "peace", turn: s.turn }); log(s, oid, `${F.name} offers peace.`, "diplo"); }
      }
    } else {
      const angry = r.score < -18 / (AGGRESSION[F.id] || 1);
      // While the Heart of the Wardens lives and a truce holds, no one starts a war.
      if (s.crisis && s.crisis.stage === "awake" && s.crisis.truce) continue;
      if (allied(s, F.id, oid)) continue;
      const warFrom = AI_CALM.warFrom[diff >= 1.3 ? "fierce" : diff <= 0.8 ? "gentle" : "standard"];   // no early wars of their own...
      const provoked = r.score <= AI_CALM.provoked || (r.memory || []).some((m) => m.d <= AI_CALM.graveOffence && s.turn - m.turn <= AI_CALM.graveTurns);   // ...unless provoked
      if ((s.turn > warFrom || provoked) && angry && mine > 6 && mine >= theirs * 1.25 / diff) { declareWar(s, F.id, oid); continue; }
      // The holder of the Corridor Engine (an open game): after it's held a while, anyone strong enough comes for it.
      const E = engineHeld(s);
      // A coalition: everyone not allied with the holder, together, against it.
      const coalition = E && E.owner === oid ? s.factions.filter((X) => X.alive && X.id !== oid && !allied(s, X.id, oid)).reduce((t, X) => t + militaryPower(s, X.id), 0) : 0;
      if (aiOpt(s, "coalitions") && E && E.owner === oid && s.turn - E.built >= 8 && mine > 6 && mine >= theirs * 0.2 && coalition >= theirs * 0.9 / diff && s.turn % 4 === 0) {
        declareWar(s, F.id, oid); log(s, null, `${F.name} joins the war on ${O.name}, holder of the Corridor Engine.`, "war"); continue;
      }
      // A pirate patrol pact, while pirates are about.
      if (!r.patrol && r.score >= 0 && s.turn % 9 === 0 && s.wilds && fleetsOf(s, "pirates").length) {
        if (O.ai) propose(s, F.id, oid, "patrol");
        else if (!s.offers.some((o) => o.from === F.id && o.what === "patrol")) { s.offers.push({ from: F.id, to: oid, what: "patrol", turn: s.turn }); log(s, oid, `${F.name} propose a pirate patrol pact.`, "diplo"); }
      }
      if (!r.treaty && r.score >= 0 && s.turn % 7 === 0) {
        if (O.ai) propose(s, F.id, oid, "trade");
        else if (!s.offers.some((o) => o.from === F.id)) { s.offers.push({ from: F.id, to: oid, what: "trade", turn: s.turn }); log(s, oid, `${F.name} proposes a trade treaty.`, "diplo"); }
      }
    }
  }
}

/** Systems this faction knows of that it could settle, best first. */
function settleTargets(s, F, kind) {
  const cols = coloniesOf(s, F.id); if (!cols.length) return [];
  const claimed = new Set(fleetsOf(s, F.id).filter((f) => f.dest).map((f) => f.dest));
  return Object.values(s.systems).filter((sys) => F.explored[sys.at] && canSettle(s, F.id, sys, kind) && !claimed.has(sys.at) && !(s.hexes[sys.at].sealed && !canCrossSealed(s, F.id))
    && !fleetsAt(s, sys.at).some((f) => f.owner !== F.id && armed(f)))
    .map((sys) => {
      const d = Math.min(...cols.map((c) => distance(c.at, sys.at)));
      const w = WORLDS[sys.world];
      const value = kind === "colony" ? (w.pop + sys.size * 2) * sys.rich + (sys.exotics ? 3 : 0) : (sys.exotics ? 6 : 1) + (w.outpostOnly ? 1 : 0);
      return { sys, score: value / (1 + d / 3), d };
    }).filter((x) => x.d <= 14).sort((a, b) => b.score - a.score);
}
const count = (s, F, type) => fleetsOf(s, F.id).reduce((t, f) => t + f.ships.filter((x) => x.type === type).length, 0)
  + coloniesOf(s, F.id).reduce((t, c) => t + c.colony.queue.filter((q) => q.id === type).length, 0);

function production(s, F, diff) {
  // In debt, or paying out more than it earns: scrap warships (frigates first) until the books balance.
  for (let n = 0; n < 6 && (F.credits < 0 || totals(s, F.id).net < -1) && totals(s, F.id).net < 1; n++) {
    const f = fleetsOf(s, F.id).find((x) => x.ships.some((y) => y.type === "frigate")) || fleetsOf(s, F.id).find(armed);
    if (!f) break;
    const i = f.ships.findIndex((y) => y.type === "frigate"); f.ships.splice(i >= 0 ? i : f.ships.findIndex((y) => SHIPS[y.type].skill), 1);
    if (!f.ships.length) dropFleet(s, f);
  }
  // The exotics market: sell a surplus when short of credits; buy what a waiting build needs when flush.
  if (F.exotics > 8 && F.credits < 30) tradeExotics(s, F.id, -3);
  const waitingFor = Math.max(0, ...coloniesOf(s, F.id).flatMap((c) => c.colony.queue.filter((q) => q.waiting).map((q) => (q.exotics || 0) - F.exotics)));
  if (waitingFor > 0 && F.credits > marketPrice(s) * waitingFor + 40) tradeExotics(s, F.id, waitingFor);
  // Fuel depots: an outpost gives supply only with one. Buy them while the treasury allows, the nearest the frontier first.
  for (const o of coloniesOf(s, F.id).filter((x) => x.colony.kind === "outpost" && !x.colony.buildings.depot)) if (F.credits > FUEL.depotCost + 50) buildDepot(s, F.id, o.id);
  const cols = coloniesOf(s, F.id).filter((c) => c.colony.kind === "colony");
  const t = totals(s, F.id);
  const enemies = Object.entries(F.relations).filter(([oid, r]) => faction(s, oid).alive && r.status === "war").map(([oid]) => oid);
  const threat = Math.max(0, ...Object.keys(F.relations).filter((o) => faction(s, o).alive && F.met[o]).map((o) => militaryPower(s, o)));
  const power = militaryPower(s, F.id);
  const wardens = s.crisis && s.crisis.stage === "awake" ? militaryPower(s, "wardens") * 0.5 : 0;
  const fullWant = Math.max(4, wardens, threat * (enemies.length ? 1.2 : 0.7)) * diff * (AGGRESSION[F.id] || 1);
  // The early game, at peace: a defensive fleet, and the rest into the worlds (AI_CALM); easing into the arms race.
  const calm = enemies.length ? 0 : Math.max(0, Math.min(1, (AI_CALM.until - s.turn) / AI_CALM.ramp));
  const calmWant = Math.max(AI_CALM.floor, coloniesOf(s, F.id).length * AI_CALM.perColony) * diff;
  const wantPower = calm ? Math.min(fullWant, calmWant + (fullWant - calmWant) * (1 - calm)) : fullWant;
  const best = (list) => list.find((x) => x);
  for (const sys of cols) {
    const c = sys.colony;
    if (c.queue.length >= 2) continue;
    const ships = c.buildings.shipyard;
    const pick = best([
      ships && settleTargets(s, F, "colony").length && count(s, F, "colony") < (s.turn < 60 ? 2 : 1) && cols.length < 14 ? ["ship", "colony"] : null,
      ships && s.turn < 50 && count(s, F, "scout") < 2 ? ["ship", "scout"] : null,
      ships && count(s, F, "scout") < 1 && s.collapse && s.collapse.breaks.some((x) => !x.surveyed) ? ["ship", "scout"] : null,   // a scout to chart around a collapse
      ships && settleTargets(s, F, "outpost").filter((x) => x.sys.exotics || WORLDS[x.sys.world].outpostOnly).length && count(s, F, "outpost") < 1 ? ["ship", "outpost"] : null,
      ships && c.capital && count(s, F, "outpost") < 1 && F.credits >= 150 && stationTarget(s, F) ? ["ship", "outpost"] : null,   // for a deep-space station
      c.capital && has(s, F.id, "orbitalYards") && !c.buildings.drydock ? ["building", "drydock"] : null,   // one, at the capital: the refits
      ships && power < wantPower ? ["ship", has(s, F.id, "capitalShips") && F.exotics >= 3 ? "dreadnought" : has(s, F.id, "heavyHulls") && F.exotics >= 1 ? "cruiser" : "frigate"] : null,
      ships && enemies.length && power >= wantPower * 0.8 && count(s, F, "transport") < 2 ? ["ship", "transport"] : null,
      ships && enemies.length && power >= wantPower * 0.8 && count(s, F, "tanker") < 1 ? ["ship", "tanker"] : null,
      c.pop >= 3 && !c.buildings.factory ? ["building", "factory"] : null,
      t.net < 3 && !c.buildings.market ? ["building", "market"] : null,
      c.pop >= 4 && !c.buildings.lab ? ["building", "lab"] : null,
      c.pop >= 6 && !c.buildings.shipyard ? ["building", "shipyard"] : null,
      // Its signature technology's hub, at the capital: the science, and (guarded there) the hardest place to take it from.
      c.capital && hubOf(F.id) && has(s, F.id, hubOf(F.id).tech) && !coloniesOf(s, F.id).some((x) => x.colony.buildings[hubOf(F.id).id] || x.colony.queue.some((q) => q.id === hubOf(F.id).id)) ? ["building", hubOf(F.id).id] : null,
      enemies.length && has(s, F.id, "batteries") && !c.buildings.battery ? ["building", "battery"] : null,
      sys.exotics && has(s, F.id, "refining") && !c.buildings.refinery ? ["building", "refinery"] : null,
      c.capital && has(s, F.id, "engine") && !c.buildings.engine && s.turn >= AI_CALM.engineFrom[diff >= 1.3 ? "fierce" : diff <= 0.8 ? "gentle" : "standard"] ? ["building", "engine"] : null,
      ships && t.net > 2 && power < wantPower * 1.6 ? ["ship", has(s, F.id, "heavyHulls") && F.exotics >= 1 ? "cruiser" : "frigate"] : null,
      !c.buildings.market ? ["building", "market"] : null,
    ]);
    if (pick && !c.queue.some((q) => q.id === pick[1])) enqueue(s, sys.id, pick[0], pick[1]);
    // Spare money speeds the front of the queue.
    if (c.queue[0] && (F.credits > 300 || (F.credits > 120 && (c.queue[0].id === "colony" || enemies.length)))) rush(s, sys.id);
  }
}

/** The nearest hex this faction hasn't seen, by steps. */
function nearestUnexplored(s, F, from) {
  const seen = { [from]: 1 }, q = [from];
  while (q.length) {
    const k = q.shift();
    if (!F.explored[k]) return k;
    for (const n of neighbors(k)) if (s.hexes[n] && !seen[n] && s.hexes[n].terrain !== "rift") { seen[n] = 1; q.push(n); }
  }
  return null;
}

function fleets(s, F) {
  // First, split the specialists off into their own fleets.
  for (const f of fleetsOf(s, F.id)) {
    if (f.ships.length < 2) continue;
    for (const type of ["colony", "outpost", "scout"]) while (f.ships.length > 1 && f.ships.some((x) => x.type === type)) splitFleet(s, f.id, type);
  }
  const enemies = Object.entries(F.relations).filter(([oid, r]) => faction(s, oid).alive && r.status === "war").map(([oid]) => oid);
  const cap = s.systems[F.capital];
  // Admirals in reserve take the biggest war fleets that have none.
  for (const a of [...(F.reserve || [])]) { const f = fleetsOf(s, F.id).filter((x) => armed(x) && !x.admiral).sort((x, y) => y.ships.length - x.ships.length)[0]; if (!f) break; assignAdmiral(s, f.id, a.id); }
  for (const f of fleetsOf(s, F.id)) {
    if (!s.fleets[f.id]) continue;
    if (f.repairAt) continue;   // away for repairs: it comes back by itself (game.js repairsTurn)
    // Answering a coalition against the Wardens: to the target, and hold there (no withdrawing) until it falls.
    const A = s.crisis && s.crisis.coalition;
    if (f.coalition && A && !A.done && A.from === f.coalition) { if (f.at !== A.at && (!f.path.length || f.dest !== A.at)) setDestination(s, f.id, A.at); continue; }
    // Engaged and clearly losing: withdraw (it fights the first exchange, then pulls back), rather than die there.
    if (engaged(s, f)) {
      const pw = (fl) => fl.ships.reduce((t, x) => t + (SHIPS[x.type].skill ? x.hull * SHIPS[x.type].dmg * (SHIPS[x.type].shots || 1) : 0), 0);
      const sid = s.sysAt[f.at], sys = sid && s.systems[sid];
      const foe = fleetsAt(s, f.at).filter((o) => armed(o) && atWar(s, F.id, o.owner)).reduce((t, o) => t + pw(o), 0) + (sys && sys.colony && atWar(s, F.id, sys.colony.owner) && sys.colony.defense > 0 ? sys.colony.defense * 2 : 0);
      const mine = fleetsAt(s, f.at).filter((o) => o.owner === F.id).reduce((t, o) => t + pw(o), 0);
      if (foe > 0 && mine < foe * 0.5 && !setWithdraw(s, f.id).error) continue;
    }
    const types = new Set(f.ships.map((x) => x.type));
    // An outpost ship on a station mission: build it when it gets there.
    if (f.stationAt && types.has("outpost")) {
      if (f.at === f.stationAt) { const r = foundStation(s, f.id); if (r.ok || !/credits/.test(r.error || "")) f.stationAt = null; continue; }
      if (!f.path.length && setDestination(s, f.id, f.stationAt).error) f.stationAt = null;
      continue;
    }
    if (types.has("outpost") && !types.has("colony") && !fleetsOf(s, F.id).some((g) => g.stationAt)) {
      const k = stationTarget(s, F); if (k && F.credits >= (canFoundStation(s, f.id).credits || 135)) { f.stationAt = k; setDestination(s, f.id, k); continue; }
    }
    if (types.has("colony") || types.has("outpost")) {
      const kind = types.has("colony") ? "colony" : "outpost";
      const here = s.sysAt[f.at] && s.systems[s.sysAt[f.at]];
      if (here && canSettle(s, F.id, here, kind) && (kind === "outpost" || f.dest === here.at || !f.dest)) { if (settle(s, f.id).ok) continue; }
      if (!f.path.length) { const t = settleTargets(s, F, kind)[0]; if (t) setDestination(s, f.id, t.sys.at); }
      continue;
    }
    if (types.size === 1 && types.has("scout")) {
      // A collapsed corridor nearby, not yet charted around: survey it (research, and the route back).
      const br = s.collapse && s.collapse.breaks.filter((x) => !x.surveyed).flatMap((x) => [s.systems[x.a], s.systems[x.b]]).filter((y) => y && F.explored[y.at] && distance(y.at, f.at) <= 12).sort((p, q) => distance(p.at, f.at) - distance(q.at, f.at))[0];
      if (br && distance(br.at, f.at) > 1) { if (f.dest !== br.at) setDestination(s, f.id, br.at); continue; }
      if (br) { f.path = []; f.dest = null; continue; }   // there: rest a turn and chart it
      if (!f.path.length) { const k = nearestUnexplored(s, F, f.at); if (k) setDestination(s, f.id, k); }
      continue;
    }
    // Tankers keep with the strongest war fleet, and park where it does: a supply point behind the front.
    if (types.size === 1 && types.has("tanker")) {
      const lead = fleetsOf(s, F.id).filter(armed).sort((a, b) => b.ships.length - a.ships.length)[0];
      if (lead && !f.path.length && lead.at !== f.at) setDestination(s, f.id, lead.dest || lead.at);
      continue;
    }
    if (types.has("transport") && !armed(f)) {
      const o = invasionOdds(s, f.id);
      if (o && !o.guarded && o.troops >= o.defense && atWar(s, F.id, s.systems[s.sysAt[f.at]].colony.owner)) { invade(s, f.id); continue; }
      // Follow the strongest war fleet.
      const lead = fleetsOf(s, F.id).filter(armed).sort((a, b) => b.ships.length - a.ships.length)[0];
      if (lead && !f.path.length && lead.at !== f.at) setDestination(s, f.id, lead.dest || lead.at);
      continue;
    }
    if (armed(f)) {
      const o = invasionOdds(s, f.id);
      if (o && !o.guarded && o.troops >= o.defense && atWar(s, F.id, s.systems[s.sysAt[f.at]].colony.owner)) { invade(s, f.id); continue; }
      // Holding an enemy's orbit without the troops to take it: a barrage on its shipyard (then its battery), and hold on.
      // A rival's Corridor Engine (an open game): with no troops coming to take it, bring it down.
      const noTroops = !fleetsOf(s, F.id).some((x) => x.ships.some((y) => y.type === "transport"));
      const bt = barrageTargets(s, f.id), aim = [noTroops ? "engine" : null, "shipyard", "battery"].find((b) => b && bt.includes(b));
      if (aiOpt(s, "raidDepots") && canRaidDepot(s, f.id)) raidDepot(s, f.id);   // an enemy's fuel depot, unguarded: take its fuel
      if (aim && f.barraged !== s.turn) { barrage(s, f.id, aim); if (!f.path.length) continue; }
      if (f.path.length) continue;
      if (huntWardens(s, F, f, 3)) continue;
      if (huntWilds(s, F, f, 4)) continue;
      // Relief: a world of ours under siege, and this fleet strong enough to break it.
      const mineHull = f.ships.reduce((t, x) => t + (SHIPS[x.type].skill ? shipStats(s, F.id, x.type).hull : 0), 0);
      const relief = coloniesOf(s, F.id).filter((sys) => besieged(s, sys)).map((sys) => ({ sys, d: distance(f.at, sys.at),
        foe: fleetsAt(s, sys.at).filter((g) => armed(g) && atWar(s, g.owner, F.id)).reduce((t, g) => t + g.ships.reduce((u, x) => u + (SHIPS[x.type].skill ? x.hull : 0), 0), 0) }))
        .filter((x) => x.foe <= mineHull * 1.2).sort((a, b) => a.d - b.d)[0];
      if (relief) { if (relief.sys.at !== f.at && setDestination(s, f.id, relief.sys.at).ok && usesReserve(F.id) && fuelStock(s, F.id) > fuelCap(s, F.id) / 2) f.burn = true; continue; }   // burn hard to the rescue while the reserve allows
      // Badly damaged ships off for repairs (then back to this fleet), when a yard is near and nothing urgent is on.
      if (repairNow(s, F, f, enemies)) continue;
      // Out of date: to the nearest drydock, for a refit with what's been researched since these ships were built
      // (before going on the attack; a world of ours under siege comes first).
      if (f.ships.some((x) => missingFit(s, F.id, x).length)) {
        const dock = refitPlace(s, F.id, f.at, f.ships.filter((x) => missingFit(s, F.id, x).length));
        if (dock && distance(dock.at, f.at) <= 12) { if (f.at !== dock.at) setDestination(s, f.id, dock.at); continue; }
      }
      if (enemies.length) {
        const mine = f.ships.reduce((t, x) => t + (SHIPS[x.type].skill ? shipStats(s, F.id, x.type).hull : 0), 0);
        const targets = enemies.flatMap((e) => coloniesOf(s, e)).filter((sys) => F.explored[sys.at])
          .map((sys) => ({ sys, d: distance(f.at, sys.at), guard: fleetsAt(s, sys.at).filter((g) => g.owner === sys.colony.owner).reduce((t, g) => t + g.ships.length * 2, 0) + (sys.colony.defense || 0) }))
          .filter((x) => x.guard <= mine * (engineHeld(s) && engineHeld(s).sys === x.sys.id ? 2 : 1.3))
          // A rival's Corridor Engine (an open game) draws every war fleet: it counts as five hexes nearer.
          .map((x) => (engineHeld(s) && engineHeld(s).sys === x.sys.id ? { ...x, d: x.d - 5 } : x))
          // Within reach on its fuel: a target beyond supply no farther than its tank carries it.
          .filter((x) => inSupplyAt(s, F.id, x.sys.at) || fuelOf(s, f) === Infinity || Math.min(...supplySources(s, F.id).map((c) => distance(c.at, x.sys.at))) - supplyRange(s, F.id) <= fuelOf(s, f) * fleetSpeed(s, f))
          .sort((a, b) => a.d - b.d);
        if (targets[0] && f.ships.length >= 2) { setDestination(s, f.id, targets[0].sys.at); continue; }
      }
      if (huntWardens(s, F, f, 7)) continue;
      // Otherwise guard the capital, or the world nearest an enemy.
      const guard = cap && cap.colony && cap.colony.owner === F.id ? cap : coloniesOf(s, F.id)[0];
      if (guard && f.at !== guard.at) setDestination(s, f.id, guard.at);
    }
  }
}

/** Pirates and creatures near this faction's worlds (havens and swarms a little farther): go after the nearest this
 * fleet can beat, for the bounty and to keep its worlds safe. */
function huntWilds(s, F, f, reach) {
  const power = (fl, fid) => fl.ships.reduce((t, x) => { const st = shipStats(s, fid, x.type); return t + (st.skill ? (fl.owner === F.id ? st.hull : x.hull) * st.dmg * (st.shots || 1) : 0); }, 0);
  const mine = power(f, F.id), cols = s.factions.filter((P) => P.alive && patrolling(s, F.id, P.id)).flatMap((P) => coloniesOf(s, P.id)); if (!cols.length || f.ships.length < 2) return false;
  const pick = [...fleetsOf(s, "pirates"), ...fleetsOf(s, "beasts")].filter((w) => F.explored[w.at] && armed(w))
    .map((w) => ({ w, near: Math.min(99, ...cols.map((c) => distance(c.at, w.at))), d: distance(f.at, w.at), still: w.ships.some((x) => !SHIPS[x.type].speed) }))
    .filter((x) => x.near <= reach + (x.still ? 2 : 0) && power(x.w, x.w.owner) * 1.4 <= mine).sort((a, b) => a.d - b.d)[0];
  return !!(pick && pick.w.at !== f.at && setDestination(s, f.id, pick.w.at).ok);
}
/** While the Wardens are awake: go after a wave within `reach` hexes of one of this faction's worlds, if this fleet can
 * take it; a strong fleet goes for the Heart itself, once the powers have had time to see what they face. */
function huntWardens(s, F, f, reach) {
  // Any Warden machine: the waves and the Heart once they're awake, the Watchers before, the Nodes until the last falls.
  if (!s.crisis || !fleetsOf(s, "wardens").length) return false;
  const hullOf = (fl, fid) => fl.ships.reduce((t, x) => t + (SHIPS[x.type].skill ? shipStats(s, fid, x.type).hull * SHIPS[x.type].dmg : 0), 0);
  const mine = hullOf(f, F.id), cols = coloniesOf(s, F.id);
  // Only what it can see (or, for the machines that never move, has found): no chasing what's out of sight.
  // A probe (quick, and gone again) is worth chasing only if it's close by.
  const known = (w) => (F.visible[w.at] || (F.explored[w.at] && w.ships.some((x) => !SHIPS[x.type].speed))) && !(w.ships.some((x) => x.type === "probe") && distance(w.at, f.at) > (s.crisis.alerted2 && s.crisis.alerted2[F.id] ? 5 : 2));   // warned of them: chase them farther
  const waves = fleetsOf(s, "wardens").filter(known).map((w) => ({ w, heart: w.ships.some((x) => x.type === "heart"), near: Math.min(99, ...cols.map((c) => distance(c.at, w.at))), d: distance(f.at, w.at) }));
  const heartAt = (waves.find((x) => x.heart) || {}).w;
  const pick = waves.filter((x) => !x.heart && (!heartAt || x.w.at !== heartAt.at) && x.near <= reach && hullOf(x.w, "wardens") <= mine * 1.1).sort((a, b) => a.d - b.d)[0]
    // Once they've had time to see what they face, strong fleets lay siege to the Nodes that shield the Heart.
    || (reach > 3 && s.turn >= s.crisis.woke + 8 && s.crisis.heart ? waves.filter((x) => x.w.ships.some((y) => y.type === "node") && distance(x.w.at, s.crisis.heart) <= 6 && x.d <= 16 && hullOf(x.w, "wardens") <= mine * 1.5).sort((a, b) => a.d - b.d)[0] : null)
    || (reach > 3 && s.turn >= s.crisis.woke + 12 && !waves.some((x) => x.w.ships.some((y) => y.type === "node") && s.crisis.heart && distance(x.w.at, s.crisis.heart) <= 6) ? waves.filter((x) => x.heart && x.d <= 20 && hullOf(x.w, "wardens") <= mine * 2)[0] : null);   // the Heart is worn down over many battles: commit
  return !!(pick && pick.w.at !== f.at && setDestination(s, f.id, pick.w.at).ok);
}
