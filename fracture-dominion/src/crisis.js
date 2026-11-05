// The late-game crisis: the Wardens. Around turn 105–120, war machines the old empires left to guard the corridors
// wake in the rifts. Six turns before, a signal gives warning. Then their Heart (it never moves) sends out a wave
// every few turns. The waves hunt the nearest worlds of every power and burn them while their orbits stand
// unguarded. The Wardens are at war with everyone and talk to no one. Break the Heart and they go dark.
// The player meets them in three scenes with choices (warning, waking, the Heart broken), shown like galactic events.
import { makeRng, distance, neighbors, within } from "./hex.js";
import { SHIPS, CRISIS, TECHS } from "./data.js";
import { player, faction, coloniesOf, fleetsOf, fleetsAt, spawnFleet, setDestination, guarded, razeWorld, log, atWar, militaryPower, rng, has, remember } from "./game.js";

export const WARDENS = "wardens";
const crMe = (s) => player(s);
const crAlive = (s) => s.factions.filter((f) => f.alive);
const crResearch = (s, F, n) => { F.research.progress += n; const cur = TECHS.find((t) => t.id === F.research.current); return `+${n} research${cur ? ` toward ${cur.name}` : ", banked for your next technology"}`; };
const crPlace = (s, hex) => (s.sysAt[hex] ? s.systems[s.sysAt[hex]].name : (() => { const n = Object.values(s.systems).sort((a, b) => distance(a.at, hex) - distance(b.at, hex))[0]; return n ? `deep space near ${n.name}` : "deep space"; })());

/** Where things stand, for the panels: null before the warning. */
export function crisisState(s) {
  const C = s.crisis; if (!C || C.stage === "quiet") return null;
  const heart = heartShip(s);
  return { stage: C.stage, at: C.at, heart: C.heart, place: C.heart ? crPlace(s, C.heart) : null, hull: heart ? heart.hull : 0, max: C.heartMax || SHIPS.heart.hull,
    wave: C.wave || 0, nextWave: C.nextWave, ships: wardenFleets(s).reduce((t, f) => t + f.ships.length, 0), truce: !!C.truce, by: C.heartBy || null };
}
const wardenFleets = (s) => fleetsOf(s, WARDENS);
function heartShip(s) { for (const f of wardenFleets(s)) { const h = f.ships.find((x) => x.type === "heart"); if (h) return h; } return null; }

/** Once a turn, after the turn resolves (and before galactic events): the warning, the waking, the waves, the burning. */
export function crisisTurn(s) {
  if (s.crisisOff || s.winner) return;
  const C = s.crisis || (s.crisis = { stage: "quiet", at: Math.max(s.turn + CRISIS.warning + 2, CRISIS.earliest + makeRng("crisis:" + s.seed).int(CRISIS.spread)) });
  if (C.stage === "quiet") {
    if (s.turn >= C.at - CRISIS.warning && !s.galEvent) {
      C.stage = "stirring"; s.galEvent = { id: "stirring", ctx: {}, turn: s.turn };
      log(s, null, "A signal is coming out of the rifts: the same pattern, over and over, on every band.", "war");
    }
    return;
  }
  if (C.stage === "stirring") { if (s.turn >= C.at && !s.galEvent) wake(s); return; }
  if (C.stage !== "awake") { if (C.queued && !s.galEvent) { s.galEvent = C.queued; C.queued = null; } return; }
  const heart = heartShip(s);
  if (!heart) { breakHeart(s); return; }
  heart.hull = Math.min(C.heartMax, heart.hull + CRISIS.heartHeal * (C.m || 1));
  const R = rng(s);
  // A wave every few turns, unless the Wardens already have plenty out.
  if (s.turn >= C.nextWave) { if (wardenFleets(s).reduce((t, f) => t + f.ships.length, 0) < 12 * (C.m || 1)) sendWave(s, R); else C.nextWave = s.turn + 1; }
  // The waves: burn the world they hold, or find the next one.
  for (const f of wardenFleets(s)) {
    if (f.ships.some((x) => x.type === "heart") || f.path.length) continue;
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
  C.heart = pool[0];
  C.F = { id: WARDENS, name: "The Wardens", color: CRISIS.color, ai: true, alive: true, crisis: true, capital: null, credits: 0, exotics: 0,
    research: { current: null, progress: 0, done: [] }, explored: {}, visible: {}, relations: {}, met: {}, stats: { built: 0, lost: 0, won: 0 },
    focus: { industry: 0, science: 0, credits: 0, defense: 0 }, protos: {} };
  // How hard they come: with the strength of the strongest power they wake among.
  const P = Math.max(0, ...crAlive(s).map((f) => militaryPower(s, f.id)));
  C.m = Math.max(1, Math.min(10, Math.round((P / 250) * ({ easy: 0.7, hard: 1.25 }[s.difficulty] || 1))));
  C.heartMax = SHIPS.heart.hull * C.m - (C.studied ? CRISIS.studied * C.m : 0);
  const hf = spawnFleet(s, WARDENS, C.heart, []);
  hf.ships.push({ type: "heart", hull: C.heartMax });
  for (let i = 0; i < C.m; i++) hf.ships.push({ type: "colossus", hull: SHIPS.colossus.hull });
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
  if (hf && C.wave > 1) for (let i = 0; i < m && hf.ships.filter((x) => x.type === "colossus").length < 2 * m; i++) hf.ships.push({ type: "colossus", hull: SHIPS.colossus.hull });
  hunt(s, f, R);
  const target = f.dest && s.sysAt[f.dest] ? s.systems[s.sysAt[f.dest]] : null;
  const mine = target && target.colony && target.colony.owner === crMe(s).id;
  log(s, crMe(s).id, `Wave ${C.wave} leaves the Heart: ${n} sentinel${n === 1 ? "" : "s"}${big ? ` and ${big} coloss${big === 1 ? "us" : "i"}` : ""}${mine ? `, heading for your world ${target.name}` : ""}.`, "war");
}

/** A wave picks one of the three nearest worlds of anyone's, and sets out. */
function hunt(s, f, R) {
  const near = Object.values(s.systems).filter((x) => x.colony).map((x) => ({ x, d: distance(f.at, x.at) - (x.colony.kind === "colony" ? x.colony.pop * 0.3 : 0) }))
    .sort((a, b) => a.d - b.d).slice(0, 3);
  for (const pick of [near[R.int(Math.max(1, near.length))], ...near]) if (pick && setDestination(s, f.id, pick.x.at).ok) return;
}

/** A world whose orbit the Wardens hold, unguarded: an outpost is gone at once; a colony loses a million people a turn
 * (and, every other turn, a building) until nothing is left. */
function burn(s, sys, R) {
  const c = sys.colony, owner = faction(s, c.owner), me = crMe(s), seen = me.visible[sys.at];
  const tell = (text) => { log(s, owner.id, text, "war"); if (owner.id !== me.id && seen) log(s, me.id, text, "war"); };
  if (c.kind === "outpost") { tell(`The Wardens burned ${owner.id === me.id ? "your" : `${owner.name}'s`} outpost at ${sys.name}.`); razeWorld(s, sys); return; }
  c.pop -= 1;
  if (c.pop % 2 === 0) { const b = Object.keys(c.buildings).filter((k) => c.buildings[k] && k !== "engine"); if (b.length) c.buildings[b[R.int(b.length)]] = false; }
  if (c.pop <= 0) { tell(`The Wardens burned ${sys.name} to bare rock. ${owner.id === me.id ? "Your" : `${owner.name}'s`} colony there is gone.`); razeWorld(s, sys); return; }
  tell(`The Wardens are burning ${owner.id === me.id ? "your world " : `${owner.name}'s world `}${sys.name}: population down to ${c.pop}. Drive them off, or put guns or warships in its orbit.`);
}

function breakHeart(s) {
  const C = s.crisis, by = C.heartBy && faction(s, C.heartBy), me = crMe(s), with_ = C.heartWith || [];
  C.stage = "over"; C.over = s.turn;
  const left = wardenFleets(s).reduce((t, f) => t + f.ships.length, 0);
  for (const f of wardenFleets(s)) delete s.fleets[f.id];
  if (by) { by.stats.heart = true; by.exotics += 6; if (by.ai) crResearch(s, by, 150); }
  log(s, null, `The Heart of the Wardens is broken${by ? `, by ${by.name}` : ""}. ${left ? `The ${left} machine${left === 1 ? "" : "s"} still out there went dark at once.` : "Every machine went dark."}`, "victory");
  const ev = { id: with_.includes(me.id) ? "broken" : "brokenBy", ctx: { by: C.heartBy || null }, turn: s.turn };
  if (s.galEvent) C.queued = ev; else s.galEvent = ev;
}

// ---- the three scenes: shown and chosen like galactic events (events.js looks here) ----
export const CRISIS_EVENTS = {
  stirring: {
    title: "Something stirs in the rifts",
    text: () => "Your listening posts on the rim of the rifts all report the same thing: a signal, one pattern repeated on every band, growing stronger each day. Your archivists know it. It's in the oldest records of the old empires: the call of the Wardens, the machines they built to guard the corridors and then could not stop. In six turns, perhaps less, they wake. They'll burn any world they can reach, yours and everyone's.",
    options: [
      { id: "study", label: "Study the signal", does: "+120 research, and the Wardens' Heart wakes weaker (−8 hull).", apply: (s) => { s.crisis.studied = true; return `Your cryptographers find the Heart's maintenance cycle in the noise: it will wake unfinished. ${crResearch(s, crMe(s), 120)}.`; } },
      { id: "warn", label: "Warn the other powers", does: "+12 standing with every rival you've met; they'll take a truce when the Wardens wake.", apply: (s) => { s.crisis.warned = true; const met = crAlive(s).filter((f) => f.id !== crMe(s).id && crMe(s).met[f.id]); for (const f of met) remember(s, f.id, crMe(s).id, "warned us the Wardens were waking", 12); return met.length ? `Your envoys carry the archives to ${met.map((f) => f.name).join(", ")}. They listen, and they remember who told them.` : "You send the warning out on every band. No one you know is there to answer, yet."; } },
      { id: "fortify", label: "Fortify the frontier", does: "Orbital batteries on your two most populous worlds besides the capital, now.", apply: (s) => { const w = coloniesOf(s, crMe(s).id).filter((x) => x.colony.kind === "colony" && !x.colony.capital && !x.colony.buildings.battery).sort((a, b) => b.colony.pop - a.colony.pop).slice(0, 2); for (const x of w) { x.colony.buildings.battery = true; x.colony.defense = 3; } return w.length ? `Crews work around the clock: ${w.map((x) => x.name).join(" and ")} now have orbital batteries.` : "You have no world besides your capital to fortify; the crews strengthen what you have."; } },
    ],
  },
  waking: {
    title: "The Wardens wake",
    text: (s) => `It came out of the rift at ${crPlace(s, s.crisis.heart)}: the Heart of the Wardens, a machine the size of a small moon, and the first wave of its hunters with it. It doesn't answer hails. Its waves will come every ${CRISIS.waveEvery} turns, each larger than the last, and they'll burn the worlds nearest them, whoever's they are. Break the Heart and they go dark. Every power has heard. Some are already making peace with each other.`,
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
  brokenBy: {
    title: "The Heart is broken",
    text: (s) => `${s.crisis.heartBy ? `${crMe(s).met[s.crisis.heartBy] ? faction(s, s.crisis.heartBy).name : "A power you haven't met"} broke the Heart of the Wardens.` : "The Heart of the Wardens is dead."} Every hunter it sent out has gone silent where it stood. The galaxy breathes again, and the wars it put off are still waiting.`,
    options: [{ id: "ok", label: "Back to the work of empire", does: "The crisis is over.", apply: () => "The Wardens are gone." }],
  },
};
