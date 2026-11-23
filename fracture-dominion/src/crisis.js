// The late-game crisis: the Wardens. Around turn 105–120, war machines the old empires left to guard the corridors
// wake in the rifts. Long before, the Signs: dormant Watchers appear by the rifts, and their transmissions grow. Awake,
// they spread like an empire: every world they burn becomes a Node, a forge that sends out hunters of its own. Breaking
// the Heart silences its waves, but while any Node stands a new, stronger Heart grows at one. It's over only when the
// Heart and every Node are gone. Six turns before, a signal gives warning. Then their Heart (it never moves) sends out a wave
// every few turns. The waves hunt the nearest worlds of every power and burn them while their orbits stand
// unguarded. The Wardens are at war with everyone and talk to no one. Break the Heart and they go dark.
// The player meets them in three scenes with choices (warning, waking, the Heart broken), shown like galactic events.
import { makeRng, distance, neighbors, within } from "./hex.js";
import { SHIPS, CRISIS, TECHS } from "./data.js";
import { shipStats, player, faction, coloniesOf, fleetsOf, fleetsAt, spawnFleet, setDestination, guarded, razeWorld, log, atWar, militaryPower, rng, has, remember, gunsMax, researchItem, score } from "./game.js";

export const WARDENS = "wardens";
const crMe = (s) => player(s);
const crAlive = (s) => s.factions.filter((f) => f.alive);
const crResearch = (s, F, n) => { F.research.progress += n; const cur = researchItem(s, F.id); return `+${n} research${cur ? ` toward ${cur.name}` : ", banked for your next technology"}`; };
const crPlace = (s, hex) => (s.sysAt[hex] ? s.systems[s.sysAt[hex]].name : (() => { const n = Object.values(s.systems).sort((a, b) => distance(a.at, hex) - distance(b.at, hex))[0]; return n ? `deep space near ${n.name}` : "deep space"; })());

/** Where things stand, for the panels: null before the warning. */
export function crisisState(s) {
  const C = s.crisis; if (!C || (C.stage === "quiet" && !C.signs)) return null;
  const heart = heartShip(s);
  return { stage: C.stage === "quiet" ? "signs" : C.stage, at: C.at, heart: C.heart, place: C.heart ? crPlace(s, C.heart) : null, hull: heart ? heart.hull : 0, max: C.heartMax || SHIPS.heart.hull,
    wave: C.wave || 0, nextWave: C.nextWave, ships: wardenFleets(s).reduce((t, f) => t + f.ships.length, 0), truce: !!C.truce, by: C.heartBy || null,
    watchers: stationOf(s, "watcher").length, nodes: stationOf(s, "node").map((f) => ({ at: f.at, place: crPlace(s, f.at) })), regrowAt: C.regrowAt || null, returns: C.returns || 0 };
}
const wardenFleets = (s) => fleetsOf(s, WARDENS);
/** The Wardens' machines that never move: Watchers (dormant) and Nodes (forges). */
const stationOf = (s, type) => wardenFleets(s).filter((f) => f.ships.some((x) => x.type === type));
/** Enemy warships on it: a Warden machine under siege doesn't mend. */
const underSiege = (s, f) => !!f && fleetsAt(s, f.at).some((o) => o.owner !== WARDENS && o.ships.some((x) => SHIPS[x.type].skill > 0));
const heartFleet = (s) => wardenFleets(s).find((f) => f.ships.some((x) => x.type === "heart"));
const stationary = (f) => f.ships.some((x) => x.type === "watcher" || x.type === "node");
/** How hard the Wardens come: a match for the whole galaxy together (its combined fleet strength, against
 * CRISIS.perStrength a point), not just its strongest power. Difficulty scales it. */
function wardenStrength(s) {
  const all = crAlive(s).reduce((t, f) => t + militaryPower(s, f.id), 0);
  const d = s.aiOpts ? Math.max(0.7, Math.min(1.25, s.aiOpts.strength)) : { easy: 0.7, hard: 1.25 }[s.difficulty] || 1;
  return Math.max(1, Math.min(CRISIS.maxStrength, Math.round((all / CRISIS.perStrength) * d)));
}
/** The Wardens as a power (out of s.factions): made the first time they're needed, by the Signs or the waking. */
function wardenPower(s) {
  const C = s.crisis;
  if (!C.F) C.F = { id: WARDENS, name: "The Wardens", color: CRISIS.color, ai: true, alive: true, crisis: true, capital: null, credits: 0, exotics: 0,
    research: { current: null, progress: 0, done: [] }, explored: {}, visible: {}, relations: {}, met: {}, stats: { built: 0, lost: 0, won: 0 },
    focus: { industry: 0, science: 0, credits: 0, defense: 0 }, protos: {} };
  return C.F;
}
const TRANSMISSIONS = [
  "The rift-watch hears it again: a pulse, regular as a heartbeat, from somewhere under the rifts.",
  "Your archivists match the pulse to the oldest records of the old empires. They won't say what they think it is.",
  "A survey crew near the rifts reports a machine half-buried in the dust. Its eye was open. It hadn't been, the day before.",
  "Every listening post on the rim now hears the same pattern. It is getting louder, and it is counting down.",
  "Static on every band, then one word in a language dead a thousand years. The translators agree on it: \u201csoon\u201d.",
];
/** The Signs: Watchers wake one by one by the rifts, and the transmissions grow. */
function signs(s, R) {
  const C = s.crisis; wardenPower(s);
  if (!C.signs) { C.signs = s.turn; C.nextWatcher = s.turn; }
  // The Watchers' strength follows the galaxy's, as the Heart's will.
  C.mSigns = wardenStrength(s);
  if (s.turn >= C.nextWatcher && stationOf(s, "watcher").length < (CRISIS.watchers[s.size] || 3)) {
    C.nextWatcher = s.turn + CRISIS.watcherEvery;
    const cols = Object.values(s.systems).filter((x) => x.colony), taken = stationOf(s, "watcher").map((f) => f.at);
    const open = (k, gap) => s.hexes[k].terrain === "space" && !s.sysAt[k] && !fleetsAt(s, k).length && Math.min(99, ...cols.map((c) => distance(c.at, k))) >= gap && taken.every((h) => distance(h, k) >= 4);
    // By a rift if it can, away from the worlds; failing that, any open space a little way off.
    let pool = Object.keys(s.hexes).filter((k) => open(k, 2) && neighbors(k).some((n) => s.hexes[n] && s.hexes[n].terrain === "rift")).sort();
    if (!pool.length) pool = Object.keys(s.hexes).filter((k) => open(k, 2)).sort();
    const k = pool[R.int(Math.max(1, pool.length))];
    if (k) { const f = spawnFleet(s, WARDENS, k, ["watcher"]); f.born = s.turn;
      const near = cols.filter((c) => distance(c.at, k) <= 6).map((c) => c.colony.owner);
      for (const fid of new Set(near)) log(s, fid, `A Warden Watcher has surfaced by the rift near ${crPlace(s, k)}. It doesn't move, but it's armed, and it's watching. Destroy it now, or it wakes as a Node when the Wardens do.`, "war"); }
  }
  for (const f of stationOf(s, "watcher")) if (!underSiege(s, f)) for (const x of f.ships) x.hull = Math.min(shipStats(s, WARDENS, "watcher").hull, x.hull + C.mSigns);
  const i = Math.floor((s.turn - C.signs) / 7);
  if ((s.turn - C.signs) % 7 === 0 && TRANSMISSIONS[i]) log(s, null, TRANSMISSIONS[i], "war");
  probesTurn(s, R);
}
// ---- the probes: the Wardens' scouts, out of the rifts during the Signs ----
const probes = (s) => wardenFleets(s).filter((f) => f.ships.some((x) => x.type === "probe"));
/** Where the Heart will rise: beside a rift, in space, as far from every world as it can be. */
function heartSite(s) {
  const cols = Object.values(s.systems).filter((x) => x.colony);
  const space = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && distance(k, "0,0") <= s.radius - 2 && !fleetsAt(s, k).some((f) => f.owner !== WARDENS));
  const byRift = space.filter((k) => neighbors(k).some((n) => s.hexes[n] && s.hexes[n].terrain === "rift"));
  const far = (k) => Math.min(99, ...cols.map((c) => distance(c.at, k)));
  return (byRift.length ? byRift : space).sort((a, b) => far(b) - far(a) || (a < b ? -1 : 1))[0];
}
/** Probes: out of a rift, to a few worlds (lingering to scan each), then home with what they saw. */
function probesTurn(s, R) {
  const C = s.crisis, P = CRISIS.probes, me = crMe(s);
  C.intel = C.intel || 0; C.nextProbe = C.nextProbe || s.turn;
  if (s.turn >= C.nextProbe && probes(s).length < P.max) {
    C.nextProbe = s.turn + P.every;
    const cols = Object.values(s.systems).filter((x) => x.colony), gap = (k) => Math.min(99, ...cols.map((c) => distance(c.at, k)));
    const rifty = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && !fleetsAt(s, k).length && gap(k) >= 4 && neighbors(k).some((n) => s.hexes[n] && s.hexes[n].terrain === "rift")).sort();
    const k = rifty[R.int(Math.max(1, rifty.length))];
    if (k) { const f = spawnFleet(s, WARDENS, k, ["probe"]); f.probe = { home: k, seen: [], stay: 0 }; }
  }
  for (const f of probes(s)) {
    const p = f.probe || (f.probe = { home: f.at, seen: [], stay: 0 });
    if (f.path.length) continue;
    // Beside its target world (it scans from a hex away, out of the guns' and guard fleets' reach): scan it for a while.
    const sys = p.target && s.systems[p.target] && distance(s.systems[p.target].at, f.at) <= 1 ? s.systems[p.target] : null;
    if (sys && sys.colony && !p.seen.includes(sys.id)) {
      p.stay++; sys.colony.scanned = s.turn;
      if (p.stay === 1) {
        const O = sys.colony.owner;
        if (O === me.id) log(s, O, `A Warden probe is scanning ${sys.name}: it is mapping the world and its defences. Shoot it down before it gets back to the rift: what it sees, the Wardens will know.`, "war");
        if (C.learn && C.learn[O]) { const F = faction(s, O); if (F) { F.research.progress += P.study; if (O === me.id) log(s, O, `Your scientists study the probe as it studies ${sys.name}: +${P.study} research.`, "research"); } }
        if (O === me.id && C.contactDue && !C.contacted && !s.galEvent) { C.contacted = s.turn; C.contactAt = sys.id; s.galEvent = { id: "contact", ctx: { world: sys.id }, turn: s.turn }; }
      }
      if (p.stay >= P.stay) { p.seen.push(sys.id); p.stay = 0; }
      continue;
    }
    // Home again with what it saw: the Wardens will wake knowing more.
    if (p.seen.length >= P.visits || (f.at === p.home && p.seen.length)) {
      if (f.at === p.home) {
        delete s.fleets[f.id]; C.intel++;
        const k = Math.min(P.intelMax, C.intel * P.intel);
        log(s, null, `A Warden probe slipped back into the rift with what it saw. The Wardens will wake knowing more of the galaxy (${Math.round(k * 100)}% stronger, so far).`, "war");
        continue;
      }
      if (setDestination(s, f.id, p.home).ok) continue;
    }
    // The next world: the most populous within reach it hasn't seen (capitals and big worlds first).
    const next = Object.values(s.systems).filter((x) => x.colony && !p.seen.includes(x.id) && distance(x.at, f.at) <= 12)
      .sort((a, b) => distance(a.at, f.at) - (a.colony.capital ? 3 : 0) - (distance(b.at, f.at) - (b.colony.capital ? 3 : 0)));   // the nearest, capitals a little first
    // To a hex beside it, in open space with no warships there.
    const beside = (x) => neighbors(x.at).filter((k) => s.hexes[k] && s.hexes[k].terrain !== "rift" && !s.sysAt[k] && !fleetsAt(s, k).length).sort((a, c) => distance(a, f.at) - distance(c, f.at));
    let went = false;
    for (const x of next.slice(0, 3)) { for (const k of beside(x)) if (setDestination(s, f.id, k).ok) { p.target = x.id; went = true; break; } if (went) break; }
    if (!went) { p.seen.push("none"); setDestination(s, f.id, p.home); }
  }
  // The first probe the player sees: a choice about what to do with them.
  if (!C.probeEvent && !s.galEvent && probes(s).some((f) => me.visible[f.at])) { C.probeEvent = s.turn; s.galEvent = { id: "probes", ctx: {}, turn: s.turn }; }
  // Later, one of them will stop at a world of the player's and speak.
  if (!C.contactDue && s.turn >= C.at - P.contactLead) C.contactDue = s.turn;
}
/** A world the Wardens burned to bare rock becomes a Node: a forge that holds the system and sends out hunters. */
function newNode(s, hex) {
  if (fleetsAt(s, hex).some((f) => f.owner === WARDENS && stationary(f))) return;
  if (stationOf(s, "node").length >= (CRISIS.maxNodes[s.size] || 8)) return;   // there are only so many forges
  const f = spawnFleet(s, WARDENS, hex, ["node"]); f.born = s.turn;
  log(s, null, `The Wardens have raised a Node at ${crPlace(s, hex)}, on what's left of the world they burned. It will send out hunters of its own.`, "war");
}
/** Each Node sends out a pair of hunters (times the crisis's strength) every few turns, after the worlds near it. */
function nodesTurn(s, R) {
  const m = s.crisis.m || 1;
  for (const f of [...stationOf(s, "node"), ...stationOf(s, "watcher")]) if (!underSiege(s, f)) for (const x of f.ships) x.hull = Math.min(shipStats(s, WARDENS, x.type).hull, x.hull + Math.ceil(m / 2));
  const out = () => wardenFleets(s).filter((f) => !stationary(f) && !f.ships.some((x) => x.type === "heart")).reduce((t, f) => t + f.ships.length, 0);
  for (const f of stationOf(s, "node")) {
    if ((s.turn - (f.born || 0)) % CRISIS.nodeEvery !== CRISIS.nodeEvery - 1) continue;
    if (out() >= CRISIS.huntersPerStrength * m) break;   // a limit to the hunters out at once
    const h = spawnFleet(s, WARDENS, f.at, []); for (let i = 0; i < 2 * m; i++) h.ships.push({ type: "sentinel", hull: SHIPS.sentinel.hull });
    hunt(s, h, R);
  }
}
function heartShip(s) { for (const f of wardenFleets(s)) { const h = f.ships.find((x) => x.type === "heart"); if (h) return h; } return null; }

/** Once a turn, after the turn resolves (and before galactic events): the warning, the waking, the waves, the burning. */
export function crisisTurn(s) {
  if (s.crisisOff || s.winner) return;
  const C = s.crisis || (s.crisis = { stage: "quiet", at: Math.max(s.turn + CRISIS.warning + 2, CRISIS.earliest + makeRng("crisis:" + s.seed).int(CRISIS.spread)) });
  coalitionTurn(s);
  callsToArms(s);
  if (C.stage === "quiet") {
    if (s.turn >= C.at - CRISIS.signsLead) { const R = rng(s); signs(s, R); R.save(); }
    if (s.turn >= C.at - CRISIS.warning && !s.galEvent) {
      C.stage = "stirring"; s.galEvent = { id: "stirring", ctx: {}, turn: s.turn };
      log(s, null, "A signal is coming out of the rifts: the same pattern, over and over, on every band.", "war");
    }
    return;
  }
  if (C.stage === "stirring") { const R = rng(s); probesTurn(s, R); R.save(); if (s.turn >= C.at && !s.galEvent) wake(s); return; }
  if (C.stage === "dormant") { dormantTurn(s); return; }
  if (C.stage !== "awake") { if (C.queued && !s.galEvent) { s.galEvent = C.queued; C.queued = null; } return; }
  const heart = heartShip(s);
  if (!heart) { breakHeart(s); return; }
  // The Heart mends only when no one's at it: a siege wears it down, and breaking off lets it recover.
  if (!underSiege(s, heartFleet(s))) heart.hull = Math.min(C.heartMax, heart.hull + Math.ceil(CRISIS.heartHeal * (C.m || 1) / 4));
  const R = rng(s);
  // A wave every few turns, unless the Wardens already have plenty out.
  if (s.turn >= C.nextWave) { if (wardenFleets(s).reduce((t, f) => t + f.ships.length, 0) < 12 * (C.m || 1)) sendWave(s, R); else C.nextWave = s.turn + 1; }
  // The waves: burn the world they hold, or find the next one.
  nodesTurn(s, R);
  for (const f of wardenFleets(s)) {
    if (f.ships.some((x) => x.type === "heart") || stationary(f) || f.path.length) continue;
    const sys = s.sysAt[f.at] && s.systems[s.sysAt[f.at]];
    if (sys && sys.colony) { if (!guarded(s, sys, WARDENS)) burn(s, sys, R); continue; }
    hunt(s, f, R);
  }
  reveal(s);
  R.save();
}

/** The Heart's hex is always in view once it's woken: everyone saw where the signal came from. */
function reveal(s) { const me = crMe(s); for (const k of within(s.crisis.heart, 1)) if (s.hexes[k]) { me.explored[k] = 1; me.visible[k] = 1; } }

function wake(s) {
  const C = s.crisis, R = rng(s);
  // The Heart wakes beside a rift, in space, as far from every world as it can be.
  const cols = Object.values(s.systems).filter((x) => x.colony);
  const space = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && distance(k, "0,0") <= s.radius - 2 && !fleetsAt(s, k).length);
  const byRift = space.filter((k) => neighbors(k).some((n) => s.hexes[n] && s.hexes[n].terrain === "rift"));
  const far = (k) => Math.min(99, ...cols.map((c) => distance(c.at, k)));
  const pool = (byRift.length ? byRift : space).sort((a, b) => far(b) - far(a) || (a < b ? -1 : 1));
  C.heart = C.heartSite && s.hexes[C.heartSite] && !fleetsAt(s, C.heartSite).some((f) => f.owner !== WARDENS) ? C.heartSite : pool[0];
  for (const f of probes(s)) delete s.fleets[f.id];   // the probes go home: the Wardens have what they came for
  wardenPower(s);
  // Every Watcher still standing wakes as a Node.
  for (const f of stationOf(s, "watcher")) { f.ships = [{ type: "node", hull: shipStats(s, WARDENS, "node").hull }]; f.born = s.turn; }
  // How hard they come: with the strength of the strongest power they wake among.
  const P = Math.max(0, ...crAlive(s).map((f) => militaryPower(s, f.id)));
  C.m = Math.max(1, Math.round(wardenStrength(s) * (1 + Math.min(CRISIS.probes.intelMax, (C.intel || 0) * CRISIS.probes.intel))));   // what the probes saw
  C.heartMax = SHIPS.heart.hull * C.m - (C.studied ? CRISIS.studied * C.m : 0);
  const hf = spawnFleet(s, WARDENS, C.heart, []);
  hf.ships.push({ type: "heart", hull: C.heartMax });
  // The Heart raises Nodes of its own around it: while any Node stands, nothing can harm it.
  const ring = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain !== "rift" && distance(k, C.heart) >= 3 && distance(k, C.heart) <= 6 && !fleetsAt(s, k).length && !(s.sysAt[k] && s.systems[s.sysAt[k]].colony)).sort();
  for (let i = 0, placed = []; i < (CRISIS.wakeNodes[s.size] || 2) && ring.length; i++) {
    const pick = ring.filter((k) => placed.every((p) => distance(p, k) >= 3)); if (!pick.length) break;
    const k = pick[R.int(pick.length)]; placed.push(k); const nf = spawnFleet(s, WARDENS, k, ["node"]); nf.born = s.turn;
  }
  for (let i = 0; i < Math.ceil(C.m / 2); i++) hf.ships.push({ type: "colossus", hull: SHIPS.colossus.hull });
  C.stage = "awake"; C.woke = s.turn; C.wave = 0; C.nextWave = s.turn;
  sendWave(s, R);
  // The rivals' own wars: most of them stop, for now.
  const ended = [];
  for (const A of crAlive(s)) for (const B of crAlive(s)) if (A.ai && B.ai && A.id < B.id && atWar(s, A.id, B.id) && R.next() < 0.6) {
    A.relations[B.id].status = B.relations[A.id].status = "peace"; ended.push(`${A.name} and ${B.name}`);
  }
  if (ended.length) log(s, null, `Against the common threat, ${ended.join("; ")} made peace.`, "diplo");
  log(s, null, `The Wardens have woken at ${crPlace(s, C.heart)}. Their Heart sends out the first wave.`, "war");
  s.galEvent = { id: "waking", ctx: {}, turn: s.turn };
  reveal(s);
  R.save();
}

function sendWave(s, R) {
  const C = s.crisis; C.wave++; C.nextWave = s.turn + CRISIS.waveEvery;
  const m = C.m || 1, n = Math.min(7, 2 + C.wave) * m, big = Math.min(4, Math.ceil(C.wave / 2)) * m;
  const f = spawnFleet(s, WARDENS, C.heart, []);
  for (let i = 0; i < n; i++) f.ships.push({ type: "sentinel", hull: SHIPS.sentinel.hull });
  for (let i = 0; i < big; i++) f.ships.push({ type: "colossus", hull: SHIPS.colossus.hull });
  // The Heart keeps a guard of its own, growing to two (times the crisis's strength).
  const hf = wardenFleets(s).find((x) => x.ships.some((y) => y.type === "heart"));
  // ...rebuilt a little each wave, to at most half the crisis's strength.
  if (hf && C.wave > 1) for (let i = 0; i < Math.ceil(m / 4) && hf.ships.filter((x) => x.type === "colossus").length < Math.ceil(m / 2); i++) hf.ships.push({ type: "colossus", hull: SHIPS.colossus.hull });
  hunt(s, f, R);
  const target = f.dest && s.sysAt[f.dest] ? s.systems[s.sysAt[f.dest]] : null;
  const mine = target && target.colony && target.colony.owner === crMe(s).id;
  log(s, crMe(s).id, `Wave ${C.wave} leaves the Heart: ${n} sentinel${n === 1 ? "" : "s"}${big ? ` and ${big} coloss${big === 1 ? "us" : "i"}` : ""}${mine ? `, heading for your world ${target.name}` : ""}.`, "war");
}

/** A wave picks one of the three nearest worlds of anyone's, and sets out. */
function hunt(s, f, R) {
  const C = s.crisis;
  // The power that answered the probe's call: the Wardens' first waves know its name.
  if (C.answeredBy && (C.firstWaves || 0) < 2) { const w = coloniesOf(s, C.answeredBy).sort((a, b) => distance(a.at, f.at) - distance(b.at, f.at))[0]; if (w && setDestination(s, f.id, w.at).ok) { C.firstWaves = (C.firstWaves || 0) + 1; return; } }
  // Worlds the probes scanned come first: the Wardens know where to strike.
  const near = Object.values(s.systems).filter((x) => x.colony).map((x) => ({ x, d: distance(f.at, x.at) - (x.colony.kind === "colony" ? x.colony.pop * 0.3 : 0) - (x.colony.scanned ? 4 : 0) }))
    .sort((a, b) => a.d - b.d).slice(0, 3);
  // They were left to guard the corridors: a power building the Corridor Engine draws them before anyone.
  const builders = crAlive(s).map((F) => s.systems[F.capital]).filter((c) => c && c.colony && c.colony.queue.some((q) => q.id === "engine"));
  const eb = builders.sort((a, b) => distance(a.at, f.at) - distance(b.at, f.at))[0];
  if (eb && R.next() < CRISIS.engineHunt && setDestination(s, f.id, eb.at).ok) return;
  // They come for the strongest, too: one in three waves goes after the leading power's nearest world.
  const lead = crAlive(s).sort((a, b) => score(s, b.id) - score(s, a.id))[0];
  const theirs = lead && coloniesOf(s, lead.id).sort((a, b) => distance(a.at, f.at) - distance(b.at, f.at))[0];
  if (theirs && R.next() < 1 / 3 && distance(theirs.at, f.at) <= 16 && setDestination(s, f.id, theirs.at).ok) return;
  for (const pick of [near[R.int(Math.max(1, near.length))], ...near]) if (pick && setDestination(s, f.id, pick.x.at).ok) return;
}

/** A world whose orbit the Wardens hold, unguarded: an outpost is gone at once; a colony loses a million people a turn
 * (and, every other turn, a building) until nothing is left. */
function burn(s, sys, R) {
  const c = sys.colony, owner = faction(s, c.owner), me = crMe(s), seen = me.visible[sys.at];
  const tell = (text) => { log(s, owner.id, text, "war"); if (owner.id !== me.id && seen) log(s, me.id, text, "war"); };
  if (c.kind === "outpost") { tell(`The Wardens burned ${owner.id === me.id ? "your" : `${owner.name}'s`} outpost at ${sys.name}.`); razeWorld(s, sys); newNode(s, sys.at); return; }
  c.pop -= 1;
  if (c.pop % 2 === 0) { const b = Object.keys(c.buildings).filter((k) => c.buildings[k] && k !== "engine"); if (b.length) c.buildings[b[R.int(b.length)]] = false; }
  if (c.pop <= 0) { tell(`The Wardens burned ${sys.name} to bare rock. ${owner.id === me.id ? "Your" : `${owner.name}'s`} colony there is gone.`); razeWorld(s, sys); newNode(s, sys.at); return; }
  tell(`The Wardens are burning ${owner.id === me.id ? "your world " : `${owner.name}'s world `}${sys.name}: population down to ${c.pop}. Drive them off, or put guns or warships in its orbit.`);
}

function breakHeart(s) {
  const C = s.crisis, by = C.heartBy && faction(s, C.heartBy), me = crMe(s), with_ = C.heartWith || [];
  // Its hunters go dark; the Nodes don't. While one stands, the Heart will grow again.
  const left = wardenFleets(s).filter((f) => !stationary(f)).reduce((t, f) => t + f.ships.length, 0);
  for (const f of wardenFleets(s)) if (!stationary(f)) delete s.fleets[f.id];
  for (const f of stationOf(s, "watcher")) delete s.fleets[f.id];
  const nodes = stationOf(s, "node").length;
  if (nodes) { C.stage = "dormant"; C.regrowAt = s.turn + CRISIS.regrow; } else { C.stage = "over"; C.over = s.turn; }
  if (by) { by.stats.heart = true; by.exotics += 6; if (by.ai) crResearch(s, by, 150); }
  log(s, null, `The Heart of the Wardens is broken${by ? `, by ${by.name}` : ""}. ${left ? `The ${left} hunter${left === 1 ? "" : "s"} it sent out went dark at once.` : "Its hunters went dark."}${nodes ? ` But ${nodes} Node${nodes === 1 ? "" : "s"} still burn${nodes === 1 ? "s" : ""}: destroy ${nodes === 1 ? "it" : "them"} within ${CRISIS.regrow} turns, or a new Heart will grow.` : " Nothing of theirs is left: the Wardens are silent."}`, "victory");
  const ev = { id: with_.includes(me.id) ? "broken" : "brokenBy", ctx: { by: C.heartBy || null, nodes }, turn: s.turn };
  if (s.galEvent) C.queued = ev; else s.galEvent = ev;
}

// ---- the three scenes: shown and chosen like galactic events (events.js looks here) ----
export const CRISIS_EVENTS = {
  probes: {
    title: "Something is watching",
    text: (s) => `It came out of the rift and went straight for the nearest world: a machine no bigger than a scout, silent, unarmed and quick. It hangs just off the world for a day, beyond the reach of its guns, sweeping every surface with something your instruments can't name, then moves on to the next. There are others. Your archivists have a name for them from the oldest records: the Wardens' eyes. Whatever sent them is still asleep. It won't be for long, and what these see, it will know.`,
    options: [
      { id: "hunt", label: "Shoot them down on sight", does: "Orbital guns can't reach them, so hunt them with warships: each one you destroy gives twice the research (60), and tells the Wardens nothing.", apply: (s) => { const C = s.crisis; (C.huntProbes = C.huntProbes || {})[crMe(s).id] = true; return "Orders go out to every fleet and battery: Warden probes are to be destroyed on sight. Each wreck is worth studying."; } },
      { id: "alarm", label: "Warn the other powers", does: "+6 standing with every power you've met, and a truce will come easier when the Wardens wake.", apply: (s) => { const me = crMe(s); s.crisis.warned = true; const met = crAlive(s).filter((f) => f.id !== me.id && me.met[f.id]); for (const f of met) remember(s, f.id, me.id, "warned us about the Warden probes", 6); return met.length ? `You send word to ${met.map((f) => f.name).join(", ")}. They're listening.` : "There's no one to warn yet."; } },
      { id: "learn", label: "Let them look, and learn from them", does: `Each time one scans a world of yours, your scientists study it back: +${CRISIS.probes.study} research. But the worlds they scan are the Wardens' first targets.`, apply: (s) => { const C = s.crisis; (C.learn = C.learn || {})[crMe(s).id] = true; return "Your observatories turn to the probes. Let them look. You'll be looking back."; } },
    ],
  },
  contact: {
    title: "It speaks",
    text: (s, c) => `The probe over ${s.systems[c.world] ? s.systems[c.world].name : "your world"} stopped scanning, and turned to face the planet. Then it spoke: on every band at once, in a language dead a thousand years, and then, haltingly, in yours. It asked who rules here. It asked how many ships you have. It asked, last, whether you would answer when the others come. Then it waited.`,
    options: [
      { id: "answer", label: "Answer it", does: "You learn where the Heart will rise, and when (marked on your map now). But the Wardens will know your name: their first waves come for you.", apply: (s) => { const C = s.crisis, me = crMe(s); C.heartSite = heartSite(s); C.answeredBy = me.id; if (C.heartSite) for (const k of within(C.heartSite, 1)) if (s.hexes[k]) me.explored[k] = 1; return `You answer. The probe is silent for a long time. Then it sends a single point of light, deep by the rifts at ${crPlace(s, C.heartSite)}, and a count that ends on turn ${C.at}. It knows your name now.`; } },
      { id: "jam", label: `Jam it (${CRISIS.probes.jam} credits)`, does: `Every band drowned out: the Wardens wake ${CRISIS.probes.jamDelay} turns later than they would have, for everyone.`, apply: (s) => { const C = s.crisis, me = crMe(s); if (me.credits < CRISIS.probes.jam) return "There's no money for the jammers. The probe goes on waiting, then leaves."; me.credits -= CRISIS.probes.jam; C.at += CRISIS.probes.jamDelay; return `Your jammers howl on every band. The probe falls silent, turns and goes. Somewhere under the rifts, something has lost its count: the Wardens will wake around turn ${C.at}.`; } },
      { id: "decode", label: "Record it, and decode it", does: "+120 research, and your warships fire on the Wardens at +1 for the rest of the war: you've learned how they think.", apply: (s) => { const C = s.crisis, me = crMe(s); me.research.progress += 120; (C.decoded = C.decoded || {})[me.id] = true; return "You say nothing, and record everything. Your cryptographers work for weeks. What they find is how the machines think: their targeting, their patterns. Your gunners will know where to aim."; } },
    ],
  },
  stirring: {
    title: "Something stirs in the rifts",
    text: () => "Your listening posts on the rim of the rifts all report the same thing: a signal, one pattern repeated on every band, growing stronger each day. Your archivists know it. It's in the oldest records of the old empires: the call of the Wardens, the machines they built to guard the corridors and then could not stop. In six turns, perhaps less, they wake. They'll burn any world they can reach, yours and everyone's.",
    options: [
      { id: "study", label: "Study the signal", does: "+120 research, and the Wardens' Heart wakes weaker (−8 hull).", apply: (s) => { s.crisis.studied = true; return `Your cryptographers find the Heart's maintenance cycle in the noise: it will wake unfinished. ${crResearch(s, crMe(s), 120)}.`; } },
      { id: "warn", label: "Warn the other powers", does: "+12 standing with every rival you've met; they'll take a truce when the Wardens wake.", apply: (s) => { s.crisis.warned = true; const met = crAlive(s).filter((f) => f.id !== crMe(s).id && crMe(s).met[f.id]); for (const f of met) remember(s, f.id, crMe(s).id, "warned us the Wardens were waking", 12); return met.length ? `Your envoys carry the archives to ${met.map((f) => f.name).join(", ")}. They listen, and they remember who told them.` : "You send the warning out on every band. No one you know is there to answer, yet."; } },
      { id: "fortify", label: "Fortify the frontier", does: "Orbital batteries on your two most populous worlds besides the capital, now.", apply: (s) => { const w = coloniesOf(s, crMe(s).id).filter((x) => x.colony.kind === "colony" && !x.colony.capital && !x.colony.buildings.battery).sort((a, b) => b.colony.pop - a.colony.pop).slice(0, 2); for (const x of w) { x.colony.buildings.battery = true; x.colony.defense = gunsMax(s, x.colony); } return w.length ? `Crews work around the clock: ${w.map((x) => x.name).join(" and ")} now have orbital batteries.` : "You have no world besides your capital to fortify; the crews strengthen what you have."; } },
    ],
  },
  waking: {
    title: "The Wardens wake",
    text: (s) => `It came out of the rift at ${crPlace(s, s.crisis.heart)}: the Heart of the Wardens, a machine the size of a small moon, and the first wave of its hunters with it. It doesn't answer hails. Its waves will come every ${CRISIS.waveEvery} turns, each larger than the last, and they'll burn the worlds nearest them, whoever's they are. Break the Heart and they go dark. Every power has heard. Some are already making peace with each other. The red bar over the map follows them from now on: from it you can call the other powers into a coalition, and see what is attacking your worlds.`,
    options: [
      { id: "truce", label: "Call a truce against them", does: "Your wars end where the rival will listen, and no one declares a new war while the Heart lives.", apply: (s) => {
        const me = crMe(s), C = s.crisis; C.truce = true;
        const yes = [], no = [];
        for (const f of crAlive(s)) if (f.ai && atWar(s, me.id, f.id)) {
          const r = f.relations[me.id];
          if (C.warned || r.score >= -30 || militaryPower(s, f.id) < militaryPower(s, me.id) * 1.5) { f.relations[me.id].status = me.relations[f.id].status = "peace"; remember(s, f.id, me.id, "made a truce with us against the Wardens", 10); yes.push(f.name); } else no.push(f.name);
        }
        return `Your envoys go out under white flags. ${yes.length ? `${yes.join(", ")} agreed: your wars with them are over.` : "You weren't at war with anyone who'd listen."}${no.length ? ` ${no.join(", ")} refused: that war goes on.` : ""} While the Heart lives, no power will start a new war.`;
      } },
      { id: "arm", label: "Arm for the fight", does: "−60 credits: two warships (cruisers, if you can build them) at your capital now.", apply: (s) => {
        const me = crMe(s), cap = s.systems[me.capital]; if (!cap) return "You have no capital to arm.";
        const t = has(s, me.id, "heavyHulls") ? "cruiser" : "frigate"; me.credits -= 60;
        const f = spawnFleet(s, me.id, cap.at, [t, t]); for (const x of f.ships) x.hull = SHIPS[t].hull + (has(s, me.id, "shields") ? 1 : 0);
        return `The yards at ${cap.name} turn out two ${SHIPS[t].name.toLowerCase()}s in record time: they're in orbit, waiting for orders.`;
      } },
      { id: "glory", label: "Let the others bleed first", does: "Nothing changes now, but every Warden machine you destroy is worth double the score.", apply: (s) => { crMe(s).glory = true; return "You keep your fleets close and your wars as they are. Let the rivals take the first blows; the glory will be yours."; } },
    ],
  },
  broken: {
    title: "The Heart is broken",
    text: (s) => `${s.crisis.heartBy === crMe(s).id ? "Your guns broke it." : `${faction(s, s.crisis.heartBy).name} landed the last blow, but your fleet was in the fight.`} The Heart of the Wardens hangs dead in the dark, split open, and every hunter it sent out has gone silent where it stood. What's left of the Heart is the greatest wreck since the Fracture.`,
    options: [
      { id: "salvage", label: "Salvage the Heart", does: "+8 exotics.", apply: (s) => { crMe(s).exotics += 8; return "Your salvage crews strip the Heart's forges: +8 exotics."; } },
      { id: "study", label: "Study what's left", does: "+250 research.", apply: (s) => `Your engineers live inside the wreck for a year. ${crResearch(s, crMe(s), 250)}.` },
      { id: "memorial", label: "Raise a memorial for the fallen", does: "+12 standing with every rival you've met.", apply: (s) => { const met = crAlive(s).filter((f) => f.id !== crMe(s).id && crMe(s).met[f.id]); for (const f of met) remember(s, f.id, crMe(s).id, "raised a memorial to all who fell against the Wardens", 12); return "A beacon at the wreck names every ship that fell fighting the Wardens, whoever's it was. The other powers notice."; } },
    ],
  },
  returning: {
    title: "The Wardens return",
    text: (s) => `The Node at ${crPlace(s, s.crisis.heart)} has been building something. Now it's done. A new Heart rises out of the forge, larger than the first, and the waves begin again. ${s.crisis.returns > 1 ? `This is the ${s.crisis.returns === 2 ? "third" : "next"} Heart; each is stronger. ` : ""}Break it, and burn out every Node, or they will keep coming back.`,
    options: [
      { id: "hold", label: "Hold the line", does: "Every world of yours with orbital guns has them repaired to full, now.", apply: (s) => { const me = crMe(s); let n = 0; for (const x of coloniesOf(s, me.id)) { const g = gunsMax(s, x.colony); if (g && x.colony.defense < g) { x.colony.defense = g; n++; } } return n ? `Gun crews work through the night: ${n} world${n === 1 ? "'s" : "s'"} guns are back to full.` : "Your guns are already at full strength."; } },
      { id: "hunt", label: "Hunt the Nodes", does: "You learn where every Node is.", apply: (s) => { const me = crMe(s); for (const f of fleetsOf(s, WARDENS)) for (const k of within(f.at, 1)) if (s.hexes[k]) me.explored[k] = 1; return "Your analysts trace the signal back to every Node: they're on your map."; } },
    ],
  },
  brokenBy: {
    title: "The Heart is broken",
    text: (s) => `${s.crisis.heartBy ? `${crMe(s).met[s.crisis.heartBy] ? faction(s, s.crisis.heartBy).name : "A power you haven't met"} broke the Heart of the Wardens.` : "The Heart of the Wardens is dead."} Every hunter it sent out has gone silent where it stood. The galaxy breathes again, and the wars it put off are still waiting.`,
    options: [{ id: "ok", label: "Back to the work of empire", does: "The Heart's waves are over, but any Node left can grow a new one.", apply: (s) => (s.crisis.stage === "dormant" ? "The Heart is gone, but its Nodes still burn." : "The Wardens are gone.") }],
  },
};

/** The Heart is broken but Nodes stand: they keep sending hunters, and after CRISIS.regrow turns a new, stronger Heart
 * grows at the oldest. With no Node left, it's over. */
function dormantTurn(s) {
  const C = s.crisis, R = rng(s);
  if (C.queued && !s.galEvent) { s.galEvent = C.queued; C.queued = null; }
  const nodes = stationOf(s, "node");
  if (!nodes.length) { C.stage = "over"; C.over = s.turn; log(s, null, "The last Warden Node is gone. The signal from the rifts has stopped: the Wardens are silent at last.", "victory"); R.save(); return; }
  nodesTurn(s, R);
  for (const f of wardenFleets(s)) { if (stationary(f) || f.path.length) continue; const sys = s.sysAt[f.at] && s.systems[s.sysAt[f.at]]; if (sys && sys.colony) { if (!guarded(s, sys, WARDENS)) burn(s, sys, R); continue; } hunt(s, f, R); }
  if (s.turn === C.regrowAt - 10) log(s, null, `The Warden Nodes are building something. In 10 turns, a new Heart.`, "war");
  if (s.turn >= C.regrowAt) {
    const seed = nodes.sort((a, b) => (a.born || 0) - (b.born || 0))[0];
    C.returns = (C.returns || 0) + 1; C.heart = seed.at; C.heartMax = Math.round((C.heartMax || SHIPS.heart.hull) * CRISIS.regrowGain);
    seed.ships = [{ type: "heart", hull: C.heartMax }]; for (let i = 0; i < (C.m || 1); i++) seed.ships.push({ type: "colossus", hull: SHIPS.colossus.hull });
    C.stage = "awake"; C.heartBy = null; C.heartWith = null; C.nextWave = s.turn + 2; C.regrowAt = null;
    log(s, null, `A new Heart of the Wardens has grown at ${crPlace(s, seed.at)}, stronger than the last. The waves will come again.`, "war");
    const ev = { id: "returning", ctx: {}, turn: s.turn }; if (s.galEvent) C.queued = ev; else s.galEvent = ev;
  }
  R.save();
}

// ---- a coalition against the Wardens ----
const CO = () => CRISIS.coalition;
/** The Warden machines a coalition can be called against: the Heart and the Nodes, where the caller can see them. */
export function coalitionTargets(s, fid) {
  const F = faction(s, fid), out = [];
  for (const f of wardenFleets(s)) {
    const t = f.ships.some((x) => x.type === "heart") ? "heart" : f.ships.some((x) => x.type === "node") ? "node" : stationary(f) ? null : "wave";
    if (!t) continue;
    if (t === "wave" ? F.visible[f.at] : F.explored[f.at]) out.push({ at: f.at, kind: t, fleet: t === "wave" ? f.id : null, place: crPlace(s, f.at), name: t === "heart" ? "the Heart" : t === "node" ? `the Node at ${crPlace(s, f.at)}` : `the Warden wave at ${crPlace(s, f.at)}` });
  }
  // The waves first, nearest our worlds first (they're the ones burning worlds), then the Heart, then the Nodes.
  const order = { wave: 0, heart: 1, node: 2 }, cols = coloniesOf(s, fid), gap = (h) => Math.min(99, ...cols.map((c) => distance(c.at, h)));
  return out.sort((a, b) => order[a.kind] - order[b.kind] || (a.kind === "wave" ? gap(a.at) - gap(b.at) : 0));
}
/** Who would answer a call from `fid`: [{ id, name, answer: "free" | "paid" | "no", price, why }]. */
export function coalitionAnswers(s, fid) {
  const C = CO(), m = (s.crisis && s.crisis.m) || 1, F = faction(s, fid);
  return s.factions.filter((X) => X.alive && X.id !== fid && F.met[X.id]).map((X) => {
    const r = X.relations[fid], war = militaryPower(s, X.id);
    if (atWar(s, X.id, fid)) return { id: X.id, name: X.name, answer: "no", why: "at war with you" };
    if (!war) return { id: X.id, name: X.name, answer: "no", why: "no warships to send" };
    if (!X.ai) return { id: X.id, name: X.name, answer: "no", why: "not a computer power" };
    if (r.score >= C.free || r.allied) return { id: X.id, name: X.name, answer: "free" };
    if (r.score >= C.paid) return { id: X.id, name: X.name, answer: "paid", price: Math.round(C.price + C.perM * m) };
    return { id: X.id, name: X.name, answer: "no", why: "they don't like you enough" };
  });
}
/** Call a coalition against a Warden machine at `hex`. With pay, the lukewarm are paid to come too. */
export function callCoalition(s, fid, hex, pay = false) {
  const K = s.crisis, F = faction(s, fid), C = CO();
  if (!K || !["awake", "dormant"].includes(K.stage)) return { error: "There's nothing to fight: the Wardens aren't awake." };
  const target = coalitionTargets(s, fid).find((t) => t.at === hex); if (!target) return { error: "Choose the Heart or one of its Nodes that you've seen." };
  if (K.coalition && K.coalition.until > s.turn) return { error: `A coalition is already under way, until turn ${K.coalition.until}.` };
  if (K.lastCall && K.lastCall[fid] && s.turn - K.lastCall[fid] < C.every) return { error: `You called one on turn ${K.lastCall[fid]}: wait until turn ${K.lastCall[fid] + C.every}.` };
  const ans = coalitionAnswers(s, fid), cost = pay ? ans.filter((a) => a.answer === "paid").reduce((t, a) => t + a.price, 0) : 0;
  if (F.credits < cost) return { error: `Paying them all needs ${cost} credits.` };
  const members = ans.filter((a) => a.answer === "free" || (pay && a.answer === "paid"));
  if (!members.length) return { error: "No one would answer the call." };
  F.credits -= cost;
  (K.lastCall = K.lastCall || {})[fid] = s.turn;
  K.coalition = { by: fid, at: hex, kind: target.kind, fleet: target.fleet || null, name: target.name, until: s.turn + C.turns, members: members.map((a) => a.id), from: s.turn };
  let ships = 0;
  for (const a of members) {
    const X = faction(s, a.id); if (a.answer === "paid") X.credits += a.price;
    // Its strongest war fleets, up to its share of its warships; the rest stay home.
    const fleets = fleetsOf(s, X.id).filter((f) => f.ships.some((x) => SHIPS[x.type].skill > 0)).sort((p, q) => q.ships.length - p.ships.length);
    const total = fleets.reduce((t, f) => t + f.ships.length, 0); let sent = 0;
    for (const f of fleets) { if (sent >= total * C.share && sent > 0) break; if (setDestination(s, f.id, hex).ok || f.at === hex) { f.coalition = K.coalition.from; sent += f.ships.length; } }
    ships += sent;
    remember(s, X.id, fid, a.answer === "paid" ? "paid us to fight the Wardens with them" : "called us to fight the Wardens together", 2);
  }
  log(s, null, `${F.name} called a coalition against ${target.name}: ${members.map((a) => faction(s, a.id).name).join(", ")} answered, with ${ships} ships, for the next ${C.turns} turns.`, "war");
  return { ok: true, members: members.length, ships, cost };
}
/** Once a turn: the coalition holds its target until it falls or the time runs out; members who fought earn regard. */
export function coalitionTurn(s) {
  const K = s.crisis, A = K && K.coalition; if (!A || A.done) return;
  // A wave moves: the coalition follows it. A Node or the Heart stays put.
  const wave = A.fleet && s.fleets[A.fleet];
  if (wave) A.at = wave.at;
  const there = A.fleet ? !!wave : wardenFleets(s).some((f) => f.at === A.at && f.ships.some((x) => x.type === A.kind));
  if (there && s.turn < A.until) return;
  A.done = true; A.until = s.turn;
  for (const f of Object.values(s.fleets)) if (f.coalition === A.from) delete f.coalition;
  if (!there) {
    const side = [A.by, ...A.members];
    for (const a of side) for (const b of side) if (a !== b && faction(s, a) && faction(s, a).ai) remember(s, a, b, `fought beside us against ${A.name}`, CO().regard);
    log(s, null, `The coalition's target has fallen: ${A.name}. ${side.map((x) => faction(s, x).name).join(", ")} fought it together.`, "war");
  } else log(s, null, `The coalition against ${A.name} has broken up: its time ran out with the machine still standing.`, "war");
}

// ---- calls to arms: the Wardens at a power's worlds ----
/** Warden machines on the move at (or within 2 hexes of, or heading for) a power's worlds: [{ fleet, world, n }]. */
export function wardenThreats(s, fid) {
  const cols = coloniesOf(s, fid), out = [];
  for (const f of wardenFleets(s)) {
    if (stationary(f) || f.ships.some((x) => x.type === "heart")) continue;
    const world = cols.filter((x) => distance(x.at, f.at) <= 2 || f.dest === x.at).sort((a, b) => distance(a.at, f.at) - distance(b.at, f.at))[0];
    if (world) out.push({ fleet: f.id, world: world.id, n: f.ships.length });
  }
  return out;
}
/** Once a turn while the Wardens are about: tell the player when their machines come for a world of theirs, and let a
 * friendly power under attack ask the player for help (each wave once; each power at most every 10 turns). */
function callsToArms(s) {
  const C = s.crisis; if (!C || !["awake", "dormant"].includes(C.stage)) return;
  const me = crMe(s); C.alerted = C.alerted || {}; C.asked = C.asked || {};
  s.inbox = s.inbox || [];
  for (const t of wardenThreats(s, me.id)) {
    const k = t.fleet + ":" + me.id; if (C.alerted[k]) continue; C.alerted[k] = s.turn;
    if (!s.inbox.some((m) => m.kind === "wardenAttack")) s.inbox.push({ kind: "wardenAttack", from: WARDENS, ctx: t, turn: s.turn });
  }
  if (s.inbox.some((m) => m.kind === "wardenHelp")) return;
  for (const F of crAlive(s)) {
    if (!F.ai || F.id === me.id || !me.met[F.id] || atWar(s, F.id, me.id) || (C.asked[F.id] && s.turn - C.asked[F.id] < 10)) continue;
    const r = F.relations[me.id]; if (!(r.allied || r.score >= 5)) continue;
    const t = wardenThreats(s, F.id).find((x) => !C.alerted[x.fleet + ":" + F.id]); if (!t) continue;
    C.alerted[t.fleet + ":" + F.id] = s.turn; C.asked[F.id] = s.turn;
    s.inbox.push({ kind: "wardenHelp", from: F.id, ctx: t, turn: s.turn }); break;
  }
}
/** Send the player's strongest idle war fleet (that can get there) to a world under Warden attack. */
export function sendHelp(s, fid, worldId) {
  const w = s.systems[worldId]; if (!w) return { error: "No such world." };
  const fleets = fleetsOf(s, fid).filter((f) => f.ships.some((x) => SHIPS[x.type].skill > 0) && !f.path.length && !f.repairAt && !f.coalition).sort((a, b) => b.ships.length - a.ships.length);
  for (const f of fleets) { const r = setDestination(s, f.id, w.at); if (r.ok) return { ok: true, fleet: f.id, ships: f.ships.length, turns: r.turns }; }
  return { error: "None of your war fleets is free to go (they're all moving, at the yards, or can't reach it)." };
}
