// The computer factions: each turn they pick research, fill their build queues, explore, settle, defend and, when
// they're strong enough and angry enough, go to war. Simple rules, read from what each faction can see.
import { distance, neighbors } from "./hex.js";
import { SHIPS, WORLDS, TECHS } from "./data.js";
import { faction, coloniesOf, fleetsOf, fleetsAt, shipStats, canSettle, maxPop, availableTechs, setResearch, enqueue, rush, totals,
  setDestination, settle, splitFleet, dropFleet, assignAdmiral, allied, invade, invasionOdds, armed, atWar, declareWar, propose, militaryPower, player, has, log, yields } from "./game.js";

const PRIORITY = {
  concord: ["xenology", "automation", "sensors", "domes", "commerce", "heavyHulls", "foldDrives", "terraforming", "refining", "orbitalYards"],
  tessan: ["commerce", "automation", "xenology", "sensors", "refining", "heavyHulls", "terraforming", "orbitalYards", "domes"],
  kel: ["automation", "xenology", "commerce", "domes", "terraforming", "sensors", "batteries", "heavyHulls"],
  hegemony: ["automation", "heavyHulls", "shields", "targeting", "orbitalYards", "xenology", "batteries", "refining", "capitalShips"],
  vael: ["sensors", "foldDrives", "automation", "xenology", "shields", "heavyHulls", "corridorTheory", "refining"],
};
const AGGRESSION = { concord: 0.9, tessan: 0.7, kel: 0.9, hegemony: 1.4, vael: 1.0 };
const DIFF = { easy: 0.7, normal: 1, hard: 1.35 };

export function aiTurn(s, F) {
  const diff = DIFF[s.difficulty] || 1;
  research(s, F);
  diplomacy(s, F, diff);
  production(s, F, diff);
  fleets(s, F);
}

function research(s, F) {
  if (F.research.current) return;
  const avail = availableTechs(s, F.id); if (!avail.length) return;
  const pri = PRIORITY[F.id] || [];
  const want = pri.find((id) => avail.some((t) => t.id === id)) || [...avail].sort((a, b) => a.cost - b.cost)[0].id;
  // Late in the game, the Corridor Engine.
  setResearch(s, F.id, avail.some((t) => t.id === "engine") && s.turn > 90 ? "engine" : want);
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
      ships && power < wantPower ? ["ship", has(s, F.id, "capitalShips") && F.exotics >= 3 ? "dreadnought" : has(s, F.id, "heavyHulls") && F.exotics >= 1 ? "cruiser" : "frigate"] : null,
      ships && enemies.length && power >= wantPower * 0.8 && count(s, F, "transport") < 2 ? ["ship", "transport"] : null,
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
      if (f.path.length) continue;
      if (huntWardens(s, F, f, 3)) continue;
      if (enemies.length) {
        const mine = f.ships.reduce((t, x) => t + (SHIPS[x.type].skill ? shipStats(s, F.id, x.type).hull : 0), 0);
        const targets = enemies.flatMap((e) => coloniesOf(s, e)).filter((sys) => F.explored[sys.at])
          .map((sys) => ({ sys, d: distance(f.at, sys.at), guard: fleetsAt(s, sys.at).filter((g) => g.owner === sys.colony.owner).reduce((t, g) => t + g.ships.length * 2, 0) + (sys.colony.defense || 0) }))
          .filter((x) => x.guard <= mine * 1.3).sort((a, b) => a.d - b.d);
        if (targets[0] && f.ships.length >= 2) { setDestination(s, f.id, targets[0].sys.at); continue; }
      }
      if (huntWardens(s, F, f, 7)) continue;
      // Otherwise guard the capital, or the world nearest an enemy.
      const guard = cap && cap.colony && cap.colony.owner === F.id ? cap : coloniesOf(s, F.id)[0];
      if (guard && f.at !== guard.at) setDestination(s, f.id, guard.at);
    }
  }
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
