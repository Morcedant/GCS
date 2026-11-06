// Events: every few weeks, something happens to the Pelion that the captain has to decide about. Each is a short scene
// and two or three choices; most choices are a roll by the best officer for the job, and each says up front what it
// risks and what it brings. Shown as dialogs (game.js pushChoice); the week can't end until the captain decides.
import { distance } from "./hex.js";
import { CREW, ENEMIES } from "./data.js";
import { log, rand, sysAt, storesOf, addStore, spawnEnemy, markCommand, available, officer, registerChoices, pushChoice, sceneRoll, remember, syncMp } from "./game.js";

const evRolled = (r) => `(${r.who}, ${r.skill}: ${r.total} against ${r.target}, ${r.success ? `success by ${r.margin}` : `fails by ${-r.margin}`})`;
const evHurt = (S) => { const v = CREW.filter((c) => available(S, c.id)); const p = v[Math.floor(rand(S) * v.length)]; if (p) S.crew[p.id].inj = Math.min(3, S.crew[p.id].inj + 1); return p; };
/** Days lost from this week's travel. */
const evDays = (S, n) => { S.pelion.days = Math.max(0, (S.pelion.days || 0) - n); syncMp(S); };
const evWorld = (S, kinds) => Object.values(S.systems).filter((s) => kinds.includes(s.kind)).sort((a, b) => distance(a.at, S.pelion.at) - distance(b.at, S.pelion.at))[0];

/** Each event: when it can happen (`can` → its context or null), its scene, and its choices. */
export const PELION_EVENTS = {
  distress: {
    title: "A distress call",
    can: (S) => ({}),
    text: () => "Rrinn hears it first, under the static: an automated distress beacon, Federation pattern, from a freighter that should have made port at Starbase 23 a week ago. Its position is off the Pelion's course, in a stretch of space where the Orions like to wait. It could be real. It could be bait.",
    options: [
      { id: "answer", name: "Answer it", blurb: "Two days off course. +2 commendations if it's real; if it's an Orion trap, a raider is waiting.", apply: (S) => {
        evDays(S, 2);
        if (rand(S) < 0.7) { S.commendations += 2; return "It's real: the freighter Calloway, her reactor dead, eleven crew breathing canned air. The Pelion tows her to safety. +2 commendations."; }
        spawnEnemy(S, "orion", S.pelion.at, { goal: "raid", target: S.pelion.at, hostile: true, home: S.pelion.at }); return "It's bait: the beacon is bolted to a hulk, and an Orion raider comes out of the dark behind it. It'll attack at the end of the week.";
      } },
      { id: "scan", name: "Scan it first", blurb: "A Sensors roll from here: if it's real, answer it in time (+2 commendations); if not, no harm done.", apply: (S) => {
        const r = sceneRoll(S, ["Sensors", "Communications"], [], { listen: true });
        if (!r.success) return `The scan can't tell ${evRolled(r)}. By the time it might have, the beacon has gone quiet. Nobody will ever know.`;
        S.commendations += 2; evDays(S, 1); return `The scan reads eleven life signs and a dead reactor ${evRolled(r)}: real. The Pelion gets there with a day to spare. +2 commendations.`;
      } },
      { id: "pass", name: "Report it and hold course", blurb: "Starbase 23 sends someone. Safe; nothing gained.", apply: () => "The Pelion relays the beacon to Starbase 23 and holds course. Someone else will answer it." },
    ],
  },
  storm: {
    title: "An ion storm",
    can: () => ({}),
    text: () => "It comes up off the port bow faster than the sensors said it could: an ion storm, a wall of charged particles light-hours wide, crackling on every band. The Pelion could ride it out, go around, or (Sevek points out, with something close to enthusiasm) study it from the inside.",
    options: [
      { id: "ride", name: "Ride it out", blurb: "An Engineering roll: fail and the storm costs a crate of spares and damages the sensors.", apply: (S) => {
        const r = sceneRoll(S, ["Engineering", "Helm"]);
        if (r.success) return `The Pelion bucks and groans and comes out the other side intact ${evRolled(r)}.`;
        addStore(S, "spares", -1); S.pelion.sys.sensors = Math.min(3, S.pelion.sys.sensors + 1); return `The storm burns out a bank of relays and a sensor array ${evRolled(r)}: a crate of spares gone, sensors damaged ${S.pelion.sys.sensors}/3.`;
      } },
      { id: "around", name: "Go around", blurb: "Three days lost this week. Safe.", apply: (S) => { evDays(S, 3); return "The Pelion goes the long way round: three days lost, and nothing else."; } },
      { id: "study", name: "Study it from inside", blurb: "A Physical Sciences roll: +8 science on success; fail and the sensors are damaged.", apply: (S) => {
        const r = sceneRoll(S, ["Physical Sciences", "Sensors"]);
        if (r.success) { S.science += 8; return `Sevek's readings are the best anyone has taken of an ion storm from the inside ${evRolled(r)}. +8 science.`; }
        S.pelion.sys.sensors = Math.min(3, S.pelion.sys.sensors + 1); return `The storm wins ${evRolled(r)}: sensors damaged ${S.pelion.sys.sensors}/3.`;
      } },
    ],
  },
  defector: {
    title: "A defector",
    can: (S) => (Object.values(S.systems).some((s) => s.kind === "klingon") ? {} : null),
    text: () => "A Klingon shuttle, alone, damaged, transmitting a Federation code that went out of use ten years ago. Its pilot is a Klingon science officer, Kalvek, and asks for asylum. Kalvek says the Empire's outposts in this sector are building something Starfleet should know about. The Empire will want Kalvek back.",
    options: [
      { id: "grant", name: "Grant asylum", blurb: "Klingon tension +2; +3 commendations; Kalvek's intelligence shows you every Klingon ship in the sector this week.", apply: (S) => {
        S.tension = Math.min(10, S.tension + 2); S.commendations += 3; for (const e of Object.values(S.enemies)) if (e.power === "klingon") { e.revealed = true; e.seen = true; }
        remember(S, "klingon", "took in a Klingon defector", -8); return "Kalvek is beamed aboard and given quarters, and talks for two days straight. The Empire protests on every channel. +3 commendations; Klingon tension +2.";
      } },
      { id: "return", name: "Return Kalvek to the Empire", blurb: "Klingon tension −2; the Empire thinks better of you. Starfleet won't like it.", apply: (S) => {
        S.tension = Math.max(0, S.tension - 2); remember(S, "klingon", "handed a defector back to us", 8); markCommand(S, 1, "the Pelion handed a defector back to the Klingon Empire.");
        return "A Klingon cruiser collects Kalvek at the border. The commander thanks the Pelion, which nobody aboard has heard a Klingon do before. Klingon tension −2. Starfleet Command's note is short.";
      } },
      { id: "quiet", name: "Pass Kalvek on to Starfleet Intelligence, quietly", blurb: "A Diplomacy roll: success means +2 commendations and no incident; fail and the Empire finds out (tension +1).", apply: (S) => {
        const r = sceneRoll(S, ["Diplomacy", "Psychology", "Stealth"]);
        if (r.success) { S.commendations += 2; return `A quiet transfer at Starbase 23, logged as a shuttle recovery ${evRolled(r)}. +2 commendations.`; }
        S.tension = Math.min(10, S.tension + 1); remember(S, "klingon", "hid a defector from us", -5); return `The Empire finds out anyway ${evRolled(r)}. Klingon tension +1.`;
      } },
    ],
  },
  trader: {
    title: "A dilithium trader",
    can: (S) => (S.supplies >= 6 ? {} : null),
    text: () => "A battered independent hauler hails the Pelion with a cheerful offer: crystals, real dilithium, cut from a seam the trader won't name. Grath scans the sample and grunts, which from a Tellarite is nearly praise.",
    options: [
      { id: "buy", name: "Buy at their price", blurb: "−6 supplies, +3 dilithium.", apply: (S) => { S.supplies -= 6; addStore(S, "dilithium", 3); return "Six supplies' worth of trade goods for three crystals. Grath fits them personally. +3 dilithium."; } },
      { id: "haggle", name: "Haggle", blurb: "A Diplomacy roll: success, −3 supplies for 3 dilithium; fail, the trader leaves insulted.", apply: (S) => {
        const r = sceneRoll(S, ["Diplomacy", "Psychology"]);
        if (r.success) { S.supplies -= 3; addStore(S, "dilithium", 3); return `The trader laughs and agrees ${evRolled(r)}: −3 supplies, +3 dilithium.`; }
        return `The trader takes offence and the crystals with them ${evRolled(r)}.`;
      } },
      { id: "no", name: "Decline", blurb: "Nothing spent.", apply: () => "The trader shrugs and goes on looking for a buyer." },
    ],
  },
  probe: {
    title: "An old probe",
    can: () => ({}),
    text: () => "Something tumbling in the dark between systems: a probe, centuries old, of a design not in any database. Its power cells are dead, but its memory core might not be.",
    options: [
      { id: "study", name: "Bring it aboard and study it", blurb: "A Computers roll: +10 science on success; fail and its old defences damage the shuttle bay (a crate of spares).", apply: (S) => {
        const r = sceneRoll(S, ["Computers", "Physical Sciences"]);
        if (r.success) { S.science += 10; return `Rrinn coaxes the memory core awake ${evRolled(r)}: star charts of a sector as it was before the Federation. +10 science.`; }
        addStore(S, "spares", -1); return `Its defences wake first ${evRolled(r)}: a fire in the shuttle bay, a crate of spares lost.`;
      } },
      { id: "salvage", name: "Salvage it for parts", blurb: "+2 crates of spares, safely.", apply: (S) => { addStore(S, "spares", 2); return "Grath's team strips it in an afternoon. +2 crates of spares."; } },
      { id: "report", name: "Log it for the Federation's museums", blurb: "+1 commendation.", apply: (S) => { S.commendations += 1; return "The probe goes home on the next supply run, to a museum that will be very glad of it. +1 commendation."; } },
    ],
  },
  shoreleave: {
    title: "A place to rest",
    can: (S) => (CREW.some((c) => S.crew[c.id].inj > 0 || S.crew[c.id].duty < 2) ? {} : null),
    text: () => "The survey charts show a world nobody lives on: blue seas, warm beaches, a breathable sky. Dr. Vessik, in the ready room, makes the case that the crew have earned a few days of it, and is not subtle about it.",
    options: [
      { id: "rest", name: "Shore leave", blurb: "Four days this week. Everyone heals a box, and gets their duty points back.", apply: (S) => {
        evDays(S, 4); for (const c of CREW) { const st = S.crew[c.id]; st.inj = Math.max(0, st.inj - 1); st.duty = 2; }
        return "Four days of sand and sunlight. Grath is found asleep in a hammock. Everyone comes back better than they left. Every officer heals a box and gets their duty points back.";
      } },
      { id: "on", name: "Press on", blurb: "No time lost. The crew understand.", apply: () => "The captain says no, kindly. The crew understand. Vessik makes a note." },
    ],
  },
  petition: {
    title: "A colony asks for help",
    can: (S) => { const w = evWorld(S, ["colony", "member"]); return w ? { sys: w.id } : null; },
    text: (S, c) => `A message from ${S.systems[c.sys].name}'s governor: a bad harvest, a failing reactor, a hard winter coming. They're not in danger yet. They'd like not to be. Can the Pelion spare anything?`,
    options: [
      { id: "give", name: "Send supplies", blurb: "−6 supplies; +2 commendations, and the colony clears a harm box.", apply: (S, c) => { const s = S.systems[c.sys]; S.supplies -= 6; S.commendations += 2; if (s.harm) s.harm--; return `The supplies go out on the next runabout. ${s.name} gets through the winter. +2 commendations.`; } },
      { id: "advise", name: "Send engineers' advice", blurb: "An Engineering roll: success, +1 commendation and nothing spent.", apply: (S, c) => {
        const r = sceneRoll(S, ["Engineering", "Life Sciences"]);
        if (r.success) { S.commendations += 1; return `Grath talks their engineers through rebuilding the reactor over subspace ${evRolled(r)}. +1 commendation.`; }
        return `The advice doesn't help enough ${evRolled(r)}. ${S.systems[c.sys].name} has a hard winter.`;
      } },
      { id: "no", name: "Nothing to spare", blurb: "No cost. They'll remember.", apply: (S, c) => `The governor thanks the Pelion for its time. ${S.systems[c.sys].name} has a hard winter.` },
    ],
  },
  stowaway: {
    title: "A stowaway",
    can: (S) => (S.pelion.docked || S.turn > 6 ? {} : null),
    text: () => "Security finds her in a cargo pod: an Orion girl of fifteen or so, half-starved, who slipped aboard at the last port. She says she ran from a pirate crew. She also, Reyes notes, knows a great deal about Orion ships.",
    options: [
      { id: "listen", name: "Hear her out", blurb: "A Psychology roll: if she's telling the truth, she knows where the pirate base is.", apply: (S) => {
        const r = sceneRoll(S, ["Psychology", "Medicine"]);
        const b = Object.values(S.enemies).find((e) => ENEMIES[e.type].base);
        if (r.success && b && !b.found) { b.found = true; const sy = sysAt(S, b.at); if (sy) { sy.surveyed = true; S.seenSys[sy.id] = true; } log(S, `The Orion pirate base is found: ${sy ? `hidden at ${sy.name}` : "in the dust"}. It's on the charts now.`, "discovery"); return `She's telling the truth ${evRolled(r)}. She draws the way to the pirate base on a padd, and it's on the charts now.`; }
        if (r.success) return `She's telling the truth ${evRolled(r)}, and has nothing to tell that the Pelion doesn't already know. She's sent on to a family at Starbase 23.`;
        return `Nobody can tell if she's lying ${evRolled(r)}. She's sent on to Starbase 23 and the authorities there.`;
      } },
      { id: "home", name: "Take her to Starbase 23", blurb: "+1 commendation. The kindest thing.", apply: (S) => { S.commendations += 1; return "She's handed over at the starbase with a letter from the captain. +1 commendation."; } },
    ],
  },
};

/** Every week: now and then (every five weeks at most, a chance in four), something happens. */
export function eventsTurn(S) {
  if (S.over || S.event || S.battle || S.turn < 5 || S.turn - (S.lastEvent || 0) < 5) return;
  if (rand(S) > 0.25) return;
  const seen = (S.eventsSeen = S.eventsSeen || {});
  const keys = Object.keys(PELION_EVENTS).sort((a, b) => (seen[a] || 0) - (seen[b] || 0) || rand(S) - 0.5);
  for (const k of keys) {
    const ctx = PELION_EVENTS[k].can(S);
    if (ctx) { seen[k] = (seen[k] || 0) + 1; S.lastEvent = S.turn; pushChoice(S, "event", k, ctx); return; }
  }
}
registerChoices("event", {
  view: (S, ev) => { const E = PELION_EVENTS[ev.id]; return { title: E.title, kicker: "Something happens", text: E.text(S, ev.ctx), options: E.options.map((o) => ({ id: o.id, name: o.name, blurb: o.blurb })) }; },
  choose: (S, ev, id) => {
    const E = PELION_EVENTS[ev.id], o = E.options.find((x) => x.id === id) || E.options[0];
    const text = o.apply(S, ev.ctx); log(S, `${E.title}: ${o.name}. ${text}`, "discovery", { story: true });
    return { title: E.title, text, choice: o.name };
  },
});
