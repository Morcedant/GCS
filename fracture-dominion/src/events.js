// Galactic events: every few turns something happens to the player's empire that asks for a decision. Each event is a
// short scene and two or three choices; each choice does something real (credits, research, exotics, population,
// ships, relations, a few turns of a golden age) and says what came of it. Ruins of the old empires are events too:
// surveying one asks what to do with what's found there.
import { player, faction, coloniesOf, fleetsOf, spawnFleet, log, maxPop, atWar, militaryPower, rng } from "./game.js";
import { TECHS, SHIPS, PROTOTYPES } from "./data.js";
import { distance } from "./hex.js";
import { CRISIS_EVENTS } from "./crisis.js";

const evMe = (s) => player(s);
const evMetRivals = (s) => s.factions.filter((f) => f.id !== evMe(s).id && f.alive && evMe(s).met[f.id]);
const evRelate = (s, fid, n) => { const r = faction(s, fid).relations[evMe(s).id]; if (r) r.score = Math.max(-60, Math.min(40, r.score + n)); };
const evName = (s, fid) => faction(s, fid).name;
const evResearch = (s, n) => { evMe(s).research.progress += n; const cur = TECHS.find((t) => t.id === evMe(s).research.current); return `+${n} research${cur ? ` toward ${cur.name}` : ", banked for your next technology"}`; };
const evRoll3 = (R) => R.d6() + R.d6() + R.d6();

/**
 * Each event: when it can happen (`can` returns its context, or null), its scene, and its choices. A choice's `does`
 * says up front what it costs and brings; `apply` makes it so and returns what happened.
 */
export const EVENTS = {
  derelict: {
    title: "A derelict of the old empires",
    can: (s) => { const f = fleetsOf(s, evMe(s).id).find((x) => !s.sysAt[x.at]) || fleetsOf(s, evMe(s).id)[0]; return f ? { fleet: f.id } : null; },
    text: () => "Your long-range sensors find it tumbling in the dark: a ship of the old empires, three kilometres of hull, dead since before the Fracture. No power, no life signs. Its holds are sealed. Its engines are a design nobody has built in a thousand years.",
    options: [
      { id: "salvage", label: "Strip it for salvage", does: "Exotics, maybe a lot; its old defences may still bite.", apply: (s, c, R) => { const r = evRoll3(R); if (r <= 12) { const n = 2 + (r <= 7 ? 2 : 0); evMe(s).exotics += n; return `The salvage crews cut into the holds and find exotics, packed in crystal: +${n} exotics.`; } const f = s.fleets[c.fleet]; if (f) for (const x of f.ships) x.hull = Math.max(1, x.hull - 1); return "The derelict's defences wake when the cutters touch the hull. The crews get out, but the fleet that found it is battered: every ship loses a hull point."; } },
      { id: "study", label: "Study its engines", does: "+90 research, safely.", apply: (s) => `Your engineers spend months inside the drive section, drawing what they find. ${evResearch(s, 90)}.` },
      { id: "sell", label: "Sell the coordinates", does: "+60 credits now.", apply: (s) => { evMe(s).credits += 60; return "A salvage guild pays well for the coordinates and asks no questions: +60 credits."; } },
    ],
  },
  refugees: {
    title: "Refugees at the border",
    can: (s) => {
      const wars = s.factions.filter((a) => a.alive && a.id !== evMe(s).id && s.factions.some((b) => b.alive && b.id !== evMe(s).id && atWar(s, a.id, b.id)));
      const home = coloniesOf(s, evMe(s).id).find((x) => x.colony.kind === "colony" && x.colony.pop < maxPop(s, x));
      if (!home) return null;
      const from = wars[0] || evMetRivals(s)[0]; if (!from) return null;
      return { world: home.id, from: from.id };
    },
    text: (s, c) => `A column of ships, old freighters and liners lashed together, limps into orbit over ${s.systems[c.world].name}. They're fleeing ${evMe(s).met[c.from] ? evName(s, c.from) : "a war beyond your borders"}. Ten thousand people, out of food and fuel. Their spokeswoman asks only for somewhere to land.`,
    options: [
      { id: "take", label: "Take them in", does: "+2 population on that world; the power they fled won't thank you.", apply: (s, c) => { const w = s.systems[c.world]; w.colony.pop = Math.min(maxPop(s, w), w.colony.pop + 2); evRelate(s, c.from, -8); return `They land on ${w.name} and start building that night: +2 population there. ${evName(s, c.from)} take note of where they went.`; } },
      { id: "colony", label: "Give them a ship and a world of their own", does: "A free colony ship at your capital, for 40 credits of supplies.", apply: (s) => { evMe(s).credits -= 40; const cap = s.systems[evMe(s).capital]; spawnFleet(s, evMe(s).id, cap.at, ["colony"]); return `You fit out a colony ship for them at ${cap.name} (−40 credits). Send it to a good world, and they'll be your newest colony.`; } },
      { id: "away", label: "Turn them away", does: "No cost. Nobody will forget it.", apply: (s, c) => { evRelate(s, c.from, 4); return "The column turns back into the dark. Some of your own people watch it go and say nothing. The power they fled sends a short, cold note of thanks."; } },
    ],
  },
  plague: {
    title: "Sickness on a colony",
    can: (s) => { const w = coloniesOf(s, evMe(s).id).filter((x) => x.colony.kind === "colony" && x.colony.pop >= 3 && !x.colony.capital); return w.length ? { world: w[w.length - 1].id } : null; },
    text: (s, c) => `A fever is spreading through ${s.systems[c.world].name}'s cities: fast, and resistant to everything the clinics have. The governor asks for a decision before it reaches the spaceport.`,
    options: [
      { id: "cure", label: "Fund a cure", does: "−50 credits; no lives lost, and the doctors may learn something.", apply: (s, c, R) => { evMe(s).credits -= 50; const extra = R.next() < 0.5 ? ` What they learn goes into your labs: ${evResearch(s, 40)}.` : ""; return `The best doctors in your empire land within a week. The fever breaks (−50 credits).${extra}`; } },
      { id: "quarantine", label: "Quarantine the world", does: "−1 population there; it can't spread.", apply: (s, c) => { const w = s.systems[c.world]; w.colony.pop = Math.max(1, w.colony.pop - 1); return `${w.name} is sealed. The fever burns itself out inside the cordon, but not before it costs a population point.`; } },
      { id: "ignore", label: "Let it run its course", does: "No cost, unless it gets worse.", apply: (s, c, R) => { const w = s.systems[c.world]; if (R.next() < 0.5) { w.colony.pop = Math.max(1, w.colony.pop - 2); return `It gets worse. ${w.name} loses 2 population before it's over.`; } return `It fades on its own within a month. ${w.name} was lucky.`; } },
    ],
  },
  deposit: {
    title: "A rich deposit",
    can: (s) => { const w = coloniesOf(s, evMe(s).id).filter((x) => !x.exotics); return w.length ? { world: w[0].id } : null; },
    text: (s, c) => `Prospectors on ${s.systems[c.world].name} strike something deep under the crust: a seam of exotic matter nobody had found, because nobody had dug that far.`,
    options: [
      { id: "mine", label: "Open a mine", does: "−40 credits; the system yields exotics from now on.", apply: (s, c) => { evMe(s).credits -= 40; s.systems[c.world].exotics = true; return `The mine opens within the year (−40 credits). ${s.systems[c.world].name} now has an exotics deposit: +1 exotics a turn, more with a refinery.`; } },
      { id: "sell", label: "Sell the rights", does: "+80 credits now.", apply: (s) => { evMe(s).credits += 80; return "A mining consortium pays handsomely for the rights, and promptly runs into trouble getting at it: +80 credits."; } },
    ],
  },
  defector: {
    title: "An admiral wants to defect",
    can: (s) => { const r = evMetRivals(s).filter((f) => militaryPower(s, f.id) > 0); return r.length ? { from: r[0].id } : null; },
    text: (s, c) => `A message on a private channel, from an admiral of ${evName(s, c.from)}: tired of their government, she offers you her ships and her loyalty, in return for a place in your fleet.`,
    options: [
      { id: "accept", label: "Welcome her", does: "Two frigates join you at your capital; her old masters will be furious.", apply: (s, c) => { const cap = s.systems[evMe(s).capital]; spawnFleet(s, evMe(s).id, cap.at, ["frigate", "frigate"]); evRelate(s, c.from, -15); return `Her ships arrive at ${cap.name} with their old markings painted over: two frigates join your fleet. ${evName(s, c.from)} are furious.`; } },
      { id: "secrets", label: "Take her secrets, not her ships", does: "+70 research; they'll suspect.", apply: (s, c) => { evRelate(s, c.from, -5); return `She defects alone, with everything she knows. ${evResearch(s, 70)}.`; } },
      { id: "return", label: "Send her back", does: "Their trust: relations with them improve.", apply: (s, c) => { evRelate(s, c.from, 15); return `You hand her back. ${evName(s, c.from)} are grateful, in their way.`; } },
    ],
  },
  raiders: {
    title: "Raiders on the frontier",
    can: (s) => { const w = coloniesOf(s, evMe(s).id).filter((x) => !x.colony.capital); return w.length ? { world: w[0].id } : null; },
    text: (s, c) => `A band of raiders, deserters from the old wars, has set up in the asteroids near ${s.systems[c.world].name}. They've sent a price for leaving it alone.`,
    options: [
      { id: "pay", label: "Pay them off", does: "−50 credits; they leave.", apply: (s) => { evMe(s).credits -= 50; return "You pay. They leave, this time (−50 credits)."; } },
      { id: "hire", label: "Hire them", does: "−90 credits; two frigates join your fleet at that world.", apply: (s, c) => { evMe(s).credits -= 90; spawnFleet(s, evMe(s).id, s.systems[c.world].at, ["frigate", "frigate"]); return `For 90 credits and a pardon, they're yours: two frigates at ${s.systems[c.world].name}.`; } },
      { id: "refuse", label: "Refuse", does: "No cost, if the world's defences hold.", apply: (s, c, R) => { const w = s.systems[c.world], guarded = fleetsOf(s, evMe(s).id).some((f) => f.at === w.at && f.ships.some((x) => SHIPS[x.type].skill > 0)) || w.colony.defense > 0; if (guarded || R.next() < 0.4) return `They try their luck against ${w.name}, and think better of it.`; if (w.colony.kind === "colony") w.colony.pop = Math.max(1, w.colony.pop - 1); w.colony.queue = []; return `They raid ${w.name}: its build queue is lost${w.colony.kind === "colony" ? ", and a population point with it" : ""}. Guard your worlds.`; } },
    ],
  },
  trader: {
    title: "A trader from beyond the rifts",
    can: (s) => (evMe(s).credits >= 40 ? {} : null),
    text: () => "A single ship, old and beautifully kept, asks for permission to dock. Its captain trades in knowledge: star charts, formulas, the notebooks of dead scientists. Everything has a price.",
    options: [
      { id: "buy", label: "Buy what she knows", does: "−80 credits, +130 research.", apply: (s) => { evMe(s).credits -= 80; return `The notebooks are worth every credit (−80). ${evResearch(s, 130)}.`; } },
      { id: "sell", label: "Sell her your exotics", does: "−2 exotics, +90 credits.", apply: (s) => { if (evMe(s).exotics < 2) return "You have no exotics to spare. She shrugs and moves on."; evMe(s).exotics -= 2; evMe(s).credits += 90; return "She pays well for exotics: −2 exotics, +90 credits."; } },
      { id: "no", label: "Send her on", does: "Nothing.", apply: () => "She leaves the way she came, back toward the rifts." },
    ],
  },
  golden: {
    title: "A golden age",
    can: (s) => (coloniesOf(s, evMe(s).id).length >= 3 ? {} : null),
    text: (s) => `${evMe(s).name} is at peace with itself for a season: the harvests are good, the yards are busy, the universities are full. Where should the moment go?`,
    options: [
      { id: "industry", label: "Into the yards", does: "+25% industry for 6 turns.", apply: (s) => { evMe(s).boost = { kind: "industry", until: s.turn + 6 }; return "The yards work through the night: +25% industry for 6 turns."; } },
      { id: "science", label: "Into the universities", does: "+25% science for 6 turns.", apply: (s) => { evMe(s).boost = { kind: "science", until: s.turn + 6 }; return "A generation of scholars comes of age at once: +25% science for 6 turns."; } },
      { id: "credits", label: "Into trade", does: "+25% credits for 6 turns.", apply: (s) => { evMe(s).boost = { kind: "credits", until: s.turn + 6 }; return "The markets boom: +25% credits for 6 turns."; } },
    ],
  },
  incident: {
    title: "A border incident",
    can: (s) => { const r = evMetRivals(s).filter((f) => !atWar(s, evMe(s).id, f.id) && coloniesOf(s, f.id).some((x) => coloniesOf(s, evMe(s).id).some((y) => distance(x.at, y.at) <= 6))); return r.length ? { from: r[0].id } : null; },
    text: (s, c) => `A patrol of yours and a patrol of ${evName(s, c.from)} met on the border. Someone fired. Nobody agrees who. Their ambassador is waiting in your anteroom, and so are your admirals.`,
    options: [
      { id: "apologise", label: "Apologise", does: "−30 credits in compensation; they'll like you better.", apply: (s, c) => { evMe(s).credits -= 30; evRelate(s, c.from, 12); return `You pay compensation (−30 credits) and the ambassador leaves mollified. ${evName(s, c.from)} like you better for it.`; } },
      { id: "firm", label: "Stand firm", does: "No cost; they'll like you less.", apply: (s, c) => { evRelate(s, c.from, -12); return `You concede nothing. ${evName(s, c.from)} recall their ambassador for a while.`; } },
      { id: "demand", label: "Demand reparations", does: "Maybe +60 credits; maybe a much worse quarrel.", apply: (s, c, R) => { if (R.next() < 0.5) { evMe(s).credits += 60; evRelate(s, c.from, -5); return `They pay, through gritted teeth: +60 credits.`; } evRelate(s, c.from, -25); return `They refuse, loudly and in public. Relations with ${evName(s, c.from)} are worse than they've ever been.`; } },
    ],
  },
  ruins: {
    title: "Ruins of the old empires",
    can: () => null,   // only when a ruin is surveyed
    text: (s, c) => `Your survey team walks into the ruins at ${s.systems[c.sys].name}: halls cut into the rock, machines under a thousand years of dust, writing nobody living can read. Something here still has power.`,
    options: [
      { id: "study", label: "Study it carefully", does: "+70 research, safely.", apply: (s) => `Your scholars map every hall and copy every inscription. ${evResearch(s, 70)}.` },
      { id: "dig", label: "Dig for relics", does: "Exotics, maybe a prototype; the guardians may wake.", apply: (s, c, R) => {
        const r = evRoll3(R);
        if (r <= 6) { const p = Object.keys(PROTOTYPES).find((x) => !(evMe(s).protos || {})[x]); if (p) { evMe(s).protos = evMe(s).protos || {}; evMe(s).protos[p] = true; return `Deep in the vaults, a machine that still works: your engineers have it running in a month. A prototype: ${PROTOTYPES[p].name} (${PROTOTYPES[p].text})`; } }
        if (r <= 12) { evMe(s).exotics += 3; return "The diggers find a cache of exotic matter, sealed in glass: +3 exotics."; }
        const f = s.fleets[c.fleet]; if (f) for (const x of f.ships) x.hull = Math.max(1, x.hull - 1);
        return "The diggers wake something that should have stayed asleep. The ruins' guardians drive them out, and the fleet overhead takes fire: every ship loses a hull point.";
      } },
      { id: "seal", label: "Seal it and charge admission", does: "+25% credits for 6 turns.", apply: (s) => { evMe(s).boost = { kind: "credits", until: s.turn + 6 }; return "Scholars and pilgrims come from across your worlds to see it: +25% credits for 6 turns."; } },
    ],
  },
};

/** Every turn: a ruin surveyed becomes an event; otherwise, now and then, something happens. */
export function eventsTurn(s) {
  if (s.winner || s.galEvent) return;
  const found = (s.ruinsFound || []).shift();
  if (found) { s.galEvent = { id: "ruins", ctx: found, turn: s.turn }; return; }
  if (s.turn < 6 || s.turn - (s.lastEvent || 0) < 6) return;
  const R = rng(s);
  const roll = R.next();
  if (roll > 0.25) { R.save(); return; }
  const seen = (s.eventsSeen = s.eventsSeen || {});
  const pool = Object.keys(EVENTS).filter((k) => k !== "ruins").sort((a, b) => (seen[a] || 0) - (seen[b] || 0));   // the least seen first
  const fresh = pool.filter((k) => (seen[k] || 0) === (seen[pool[0]] || 0));
  for (const k of [...fresh.sort(() => R.next() - 0.5), ...pool]) {
    const ctx = EVENTS[k].can(s);
    if (ctx) { s.galEvent = { id: k, ctx, turn: s.turn }; seen[k] = (seen[k] || 0) + 1; s.lastEvent = s.turn; break; }
  }
  R.save();
}
/** The event waiting for the player: its scene and its choices, ready to show. */
export function currentEvent(s) {
  const e = s.galEvent; if (!e) return null;
  const E = EVENTS[e.id] || CRISIS_EVENTS[e.id];
  return { title: E.title, text: E.text(s, e.ctx), options: E.options.map((o) => ({ id: o.id, label: o.label, does: o.does })) };
}
/** The player's choice: what it does, and what came of it. */
export function chooseEvent(s, optId) {
  const e = s.galEvent; if (!e) return { error: "Nothing is waiting." };
  const E = EVENTS[e.id] || CRISIS_EVENTS[e.id], o = E.options.find((x) => x.id === optId); if (!o) return { error: "No such choice." };
  const R = rng(s), text = o.apply(s, e.ctx, R); R.save();
  s.galEvent = null;
  log(s, evMe(s).id, `${E.title}: ${o.label}. ${text}`, "contact");
  return { ok: true, title: E.title, choice: o.label, text };
}
