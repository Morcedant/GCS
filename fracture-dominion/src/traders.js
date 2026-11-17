// The free traders: merchant convoys that belong to no power. A colony with an Exchange sends one now and then to
// another colony with an Exchange, of its own power or another's at peace with it; when it arrives, both worlds'
// owners are paid. They're at peace with every power and at war only with the pirates, whose raiders go after a convoy
// with no warships beside it (game.js atWar; wilds.js raid). A convoy that reaches one of the player's worlds sometimes
// offers a deal (envoys.js TRADER_OFFERS).
import { distance } from "./hex.js";
import { TRADERS, SHIPS, OUTPOST_TRADE } from "./data.js";
import { player, faction, fleetsOf, fleetsAt, spawnFleet, setDestination, log, rng, atWar, armed } from "./game.js";

const TRADERS_ID = "traders";
const traderPower = () => ({ id: TRADERS_ID, name: TRADERS.name, color: TRADERS.color, ai: true, alive: true, trader: true, capital: null, credits: 0, exotics: 0,
  research: { current: null, progress: 0, done: [] }, explored: {}, visible: {}, relations: {}, met: {}, stats: { built: 0, lost: 0, won: 0 },
  focus: { industry: 0, science: 0, credits: 0, defense: 0 }, protos: {} });
const exchanges = (s) => Object.values(s.systems).filter((x) => x.colony && x.colony.kind === "colony" && x.colony.buildings.market);
/** What a convoy pays each end when it arrives. */
export const convoyValue = (from, to) => Math.round(TRADERS.base + TRADERS.perHex * distance(from.at, to.at));
const escorted = (s, hex) => fleetsAt(s, hex).some((o) => o.owner !== TRADERS_ID && o.owner !== "pirates" && armed(o));

/** Once a turn, after the pirates have moved: plunder, arrivals, and new convoys. */
export function tradersTurn(s) {
  if (s.winner) return;
  if (!s.traders) s.traders = traderPower();
  const R = rng(s), me = player(s);
  // Convoys refuel at outposts along the way: each fuel depot or station within a hex sells it fuel, once a convoy.
  const pumps = Object.values(s.systems).filter((x) => x.colony && x.colony.kind === "outpost" && (x.colony.buildings.depot || x.colony.buildings.station) && !(x.colony.depotCut > s.turn));
  let sold = 0;
  for (const f of fleetsOf(s, TRADERS_ID)) for (const x of pumps) {
    if (distance(x.at, f.at) > 1 || (f.fuelled || []).includes(x.id) || fleetsAt(s, x.at).some((o) => armed(o) && atWar(s, o.owner, x.colony.owner))) continue;
    (f.fuelled = f.fuelled || []).push(x.id);
    const F = faction(s, x.colony.owner); F.credits += OUTPOST_TRADE.convoy; F.stats.fuelSold = (F.stats.fuelSold || 0) + OUTPOST_TRADE.convoy;
    if (F.id === me.id) sold += OUTPOST_TRADE.convoy;
  }
  if (sold) log(s, me.id, `Your outposts sold fuel to passing merchant convoys: +${sold} credits.`, "trade");
  for (const f of fleetsOf(s, TRADERS_ID)) {
    const from = s.systems[f.trade.from], to = s.systems[f.trade.to];
    // Pirates in the same hex, and no warships beside it: plundered.
    if (Object.values(s.fleets).some((o) => o.owner === "pirates" && armed(o) && distance(o.at, f.at) <= TRADERS.reach) && !escorted(s, f.at)) {
      delete s.fleets[f.id]; s.tradeStats = s.tradeStats || { arrived: 0, plundered: 0 }; s.tradeStats.plundered++;
      for (const fid of new Set([from && from.colony && from.colony.owner, to && to.colony && to.colony.owner].filter(Boolean)))
        log(s, fid, `Pirates plundered a merchant convoy bound from ${from ? from.name : "?"} to ${to ? to.name : "?"}. Warships beside a convoy keep it safe.`, "war");
      continue;
    }
    // The other end is gone, or at war with the sender now: the convoy goes home, or (if that's gone too) disbands.
    if (!to || !to.colony || !from || !from.colony || atWar(s, from.colony.owner, to.colony.owner)) { delete s.fleets[f.id]; continue; }
    if (f.at === to.at) {
      const v = convoyValue(from, to);
      for (const fid of new Set([from.colony.owner, to.colony.owner])) { const F = faction(s, fid); F.credits += v; F.stats.tradeIn = (F.stats.tradeIn || 0) + v; }
      s.tradeStats = s.tradeStats || { arrived: 0, plundered: 0 }; s.tradeStats.arrived++;
      if (from.colony.owner === me.id || to.colony.owner === me.id) log(s, me.id, `A merchant convoy from ${from.name} reached ${to.name}: +${v} credits${from.colony.owner === to.colony.owner ? "" : " (and as much for the other world's owner)"}.`, "trade");
      if (to.colony.owner === me.id && R.next() < TRADERS.offer) offer(s, to, R);
      delete s.fleets[f.id];
      continue;
    }
    if (!f.path.length) setDestination(s, f.id, to.at);
  }
  // New convoys: from each Exchange, now and then, up to a few on the lanes at once.
  const ex = exchanges(s), cap = TRADERS.perPower * s.factions.filter((F) => F.alive).length;
  for (const from of ex) {
    if (fleetsOf(s, TRADERS_ID).length >= cap) break;
    if ((s.turn + from.id.length + Number(from.id.slice(1))) % TRADERS.every !== 0) continue;
    if (fleetsOf(s, TRADERS_ID).filter((f) => f.trade.from === from.id).length >= TRADERS.maxPerExchange) continue;
    const dests = ex.filter((x) => x !== from && distance(x.at, from.at) <= TRADERS.range && !atWar(s, from.colony.owner, x.colony.owner));
    if (!dests.length) continue;
    const to = dests[R.int(dests.length)], f = spawnFleet(s, TRADERS_ID, from.at, ["merchant"]);
    f.trade = { from: from.id, to: to.id }; f.dest = to.at;
    if (setDestination(s, f.id, to.at).error) delete s.fleets[f.id];
  }
  R.save();
}

/** A deal for the player, from a convoy that just reached one of their worlds. */
function offer(s, world, R) {
  const me = player(s), kinds = ["buyExotics", "frigate", "charts"];
  if (me.exotics >= 2) kinds.push("sellExotics");
  const site = Object.values(s.systems).filter((x) => x.relic && !me.explored[x.at] && distance(x.at, world.at) <= 14).sort((a, b) => distance(a.at, world.at) - distance(b.at, world.at))[0];
  if (site) kinds.push("rumor", "rumor");
  const kind = kinds[R.int(kinds.length)];
  const n = { buyExotics: 30, sellExotics: 36, frigate: 30, rumor: 25, charts: 20 }[kind];
  (s.inbox = s.inbox || []).push({ kind: "trader", from: TRADERS_ID, ctx: { offer: kind, n, world: world.id, site: site ? site.id : null }, turn: s.turn });
}
export { TRADERS_ID };
export const convoysOf = (s) => fleetsOf(s, TRADERS_ID);
export const SHIP_MERCHANT = SHIPS.merchant;
