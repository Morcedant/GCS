// The computer factions: each turn they pick research, fill their build queues, explore, settle, defend and, when
// they're strong enough and angry enough, go to war. Simple rules, read from what each faction can see.
import { distance, neighbors } from "./hex.js";
import { SHIPS, WORLDS, TECHS, FUEL } from "./data.js";
import { missingFit, outpostOptions, buildAtOutpost, patrolling, faction, engineHeld, relicHeld, useRelic, shardTargets, canRaidDepot, raidDepot, coloniesOf, fleetsOf, fleetsAt, shipStats, canSettle, maxPop, availableTechs, availableAdvances, setResearch, enqueue, rush, totals,
  setDestination, settle, splitFleet, dropFleet, assignAdmiral, allied, invade, invasionOdds, barrage, barrageTargets, besieged, tradeExotics, marketPrice, buildDepot, inSupplyAt, fuelOf, supplySources, supplyRange, fleetSpeed, armed, atWar, declareWar, propose, militaryPower, player, has, log, yields } from "./game.js";

const PRIORITY = {
  // Orbital shipyards early: research reaches a power's existing ships only at a drydock.
  concord: ["xenology", "automation", "sensors", "orbitalYards", "domes", "commerce", "heavyHulls", "foldDrives", "terraforming", "refining"],
  tessan: ["commerce", "automation", "xenology", "orbitalYards", "sensors", "refining", "heavyHulls", "terraforming", "domes"],
  kel: ["automation", "xenology", "commerce", "orbitalYards", "domes", "terraforming", "sensors", "batteries", "heavyHulls"],
  hegemony: ["automation", "heavyHulls", "orbitalYards", "shields", "targeting", "xenology", "batteries", "refining", "capitalShips"],
  vael: ["sensors", "automation", "orbitalYards", "foldDrives", "xenology", "shields", "heavyHulls", "corridorTheory", "refining"],
};
const AGGRESSION = { concord: 0.9, tessan: 0.7, kel: 0.9, hegemony: 1.4, vael: 1.0 };
const DIFF = { easy: 0.7, normal: 1, hard: 1.35 };

export function aiTurn(s, F) {
  const diff = DIFF[s.difficulty] || 1;
  research(s, F);
  relics(s, F);
  outposts(s, F);
  diplomacy(s, F, diff);
  production(s, F, diff);
  fleets(s, F);
}

function research(s, F) {
  if (F.research.current) return;
  const avail = availableTechs(s, F.id);
  // Every technology done (or nothing left worth more): an advance, the cheapest level first.
  if (!avail.length) { const adv = availableAdvances(s, F.id).sort((a, b) => a.cost - b.cost)[0]; if (adv) setResearch(s, F.id, adv.id); return; }
  const pri = PRIORITY[F.id] || [];
  const want = pri.find((id) => avail.some((t) => t.id === id)) || [...avail].sort((a, b) => a.cost - b.cost)[0].id;
  // Late in the game, the Corridor Engine.
  setResearch(s, F.id, avail.some((t) => t.id === "engine") && s.turn > 90 ? "engine" : want);
}

/** Relics: the Star Chart is read as soon as it's found (game.js); the Gate Shard links the capital to the farthest
 * world of ours it can reach that isn't linked already. */
/** Outposts: at war, a frontier outpost near the enemy gets an Orbital battery (or station) when the treasury is full. */
function outposts(s, F) {
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
      if (s.turn > 25 && angry && mine > 6 && mine >= theirs * 1.25 / diff) { declareWar(s, F.id, oid); continue; }
      // The holder of the Corridor Engine (an open game): after it's held a while, anyone strong enough comes for it.
      const E = engineHeld(s);
      // A coalition: everyone not allied with the holder, together, against it.
      const coalition = E && E.owner === oid ? s.factions.filter((X) => X.alive && X.id !== oid && !allied(s, X.id, oid)).reduce((t, X) => t + militaryPower(s, X.id), 0) : 0;
      if (E && E.owner === oid && s.turn - E.built >= 8 && mine > 6 && mine >= theirs * 0.2 && coalition >= theirs * 0.9 / diff && s.turn % 4 === 0) {
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
  return Object.values(s.systems).filter((sys) => F.explored[sys.at] && canSettle(s, F.id, sys, kind) && !claimed.has(sys.at)
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
  const wantPower = Math.max(4, wardens, threat * (enemies.length ? 1.2 : 0.7)) * diff * (AGGRESSION[F.id] || 1);
  const best = (list) => list.find((x) => x);
  for (const sys of cols) {
    const c = sys.colony;
    if (c.queue.length >= 2) continue;
    const ships = c.buildings.shipyard;
    const pick = best([
      ships && settleTargets(s, F, "colony").length && count(s, F, "colony") < (s.turn < 60 ? 2 : 1) && cols.length < 14 ? ["ship", "colony"] : null,
      ships && s.turn < 50 && count(s, F, "scout") < 2 ? ["ship", "scout"] : null,
      ships && settleTargets(s, F, "outpost").filter((x) => x.sys.exotics || WORLDS[x.sys.world].outpostOnly).length && count(s, F, "outpost") < 1 ? ["ship", "outpost"] : null,
      c.capital && has(s, F.id, "orbitalYards") && !c.buildings.drydock ? ["building", "drydock"] : null,   // one, at the capital: the refits
      ships && power < wantPower ? ["ship", has(s, F.id, "capitalShips") && F.exotics >= 3 ? "dreadnought" : has(s, F.id, "heavyHulls") && F.exotics >= 1 ? "cruiser" : "frigate"] : null,
      ships && enemies.length && power >= wantPower * 0.8 && count(s, F, "transport") < 2 ? ["ship", "transport"] : null,
      ships && enemies.length && power >= wantPower * 0.8 && count(s, F, "tanker") < 1 ? ["ship", "tanker"] : null,
      c.pop >= 3 && !c.buildings.factory ? ["building", "factory"] : null,
      t.net < 3 && !c.buildings.market ? ["building", "market"] : null,
      c.pop >= 4 && !c.buildings.lab ? ["building", "lab"] : null,
      c.pop >= 6 && !c.buildings.shipyard ? ["building", "shipyard"] : null,
      enemies.length && has(s, F.id, "batteries") && !c.buildings.battery ? ["building", "battery"] : null,
      sys.exotics && has(s, F.id, "refining") && !c.buildings.refinery ? ["building", "refinery"] : null,
      c.capital && has(s, F.id, "engine") && !c.buildings.engine ? ["building", "engine"] : null,
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
    const types = new Set(f.ships.map((x) => x.type));
    if (types.has("colony") || types.has("outpost")) {
      const kind = types.has("colony") ? "colony" : "outpost";
      const here = s.sysAt[f.at] && s.systems[s.sysAt[f.at]];
      if (here && canSettle(s, F.id, here, kind) && (kind === "outpost" || f.dest === here.at || !f.dest)) { if (settle(s, f.id).ok) continue; }
      if (!f.path.length) { const t = settleTargets(s, F, kind)[0]; if (t) setDestination(s, f.id, t.sys.at); }
      continue;
    }
    if (types.size === 1 && types.has("scout")) {
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
      if (canRaidDepot(s, f.id)) raidDepot(s, f.id);   // an enemy's fuel depot, unguarded: take its fuel
      if (aim && f.barraged !== s.turn) { barrage(s, f.id, aim); if (!f.path.length) continue; }
      if (f.path.length) continue;
      if (huntWardens(s, F, f, 3)) continue;
      if (huntWilds(s, F, f, 4)) continue;
      // Relief: a world of ours under siege, and this fleet strong enough to break it.
      const mineHull = f.ships.reduce((t, x) => t + (SHIPS[x.type].skill ? shipStats(s, F.id, x.type).hull : 0), 0);
      const relief = coloniesOf(s, F.id).filter((sys) => besieged(s, sys)).map((sys) => ({ sys, d: distance(f.at, sys.at),
        foe: fleetsAt(s, sys.at).filter((g) => armed(g) && atWar(s, g.owner, F.id)).reduce((t, g) => t + g.ships.reduce((u, x) => u + (SHIPS[x.type].skill ? x.hull : 0), 0), 0) }))
        .filter((x) => x.foe <= mineHull * 1.2).sort((a, b) => a.d - b.d)[0];
      if (relief) { if (relief.sys.at !== f.at) setDestination(s, f.id, relief.sys.at); continue; }
      // Out of date: to the nearest drydock, for a refit with what's been researched since these ships were built
      // (before going on the attack; a world of ours under siege comes first).
      if (f.ships.some((x) => missingFit(s, F.id, x).length)) {
        const dock = coloniesOf(s, F.id).filter((x) => x.colony.buildings.drydock && !besieged(s, x)).sort((a, b) => distance(a.at, f.at) - distance(b.at, f.at))[0];
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
  if (!s.crisis || s.crisis.stage !== "awake") return false;
  const hullOf = (fl, fid) => fl.ships.reduce((t, x) => t + (SHIPS[x.type].skill ? shipStats(s, fid, x.type).hull * SHIPS[x.type].dmg : 0), 0);
  const mine = hullOf(f, F.id), cols = coloniesOf(s, F.id);
  const waves = fleetsOf(s, "wardens").map((w) => ({ w, heart: w.ships.some((x) => x.type === "heart"), near: Math.min(99, ...cols.map((c) => distance(c.at, w.at))), d: distance(f.at, w.at) }));
  const heartAt = (waves.find((x) => x.heart) || {}).w;
  const pick = waves.filter((x) => !x.heart && (!heartAt || x.w.at !== heartAt.at) && x.near <= reach && hullOf(x.w, "wardens") <= mine * 1.1).sort((a, b) => a.d - b.d)[0]
    || (reach > 3 && s.turn >= s.crisis.woke + 12 ? waves.filter((x) => x.heart && x.d <= 14 && hullOf(x.w, "wardens") <= mine * 0.9)[0] : null);
  return !!(pick && pick.w.at !== f.at && setDestination(s, f.id, pick.w.at).ok);
}
