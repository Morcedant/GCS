// The first mission, from the GM's Guide: The Silence at Corvan II. An Orion raider in orbit; the pull on the ship's
// power and a Countdown of 6; the away team's investigation (a discovery clock of 4); Orion diggers in the ruins; and
// the caretaker machine, with a choice about what to do with it.
import { ENEMIES, CREW } from "./data.js";
import { log, markCommand, completeOrder, recordOrder, registerHooks, enemiesAt, available, officer, sendHome, storyEvent } from "./game.js";
import { startBattle } from "./combat.js";

const CLUES = {
  // found: the one line (the GM's Guide's); detail: what the away team actually reads, sees and hears.
  logs: { name: "The outpost logs", skills: ["Computers"],
    how: { Computers: "Recover the outpost's personal and automated logs, including what was deleted or cut off." }, found: "Dr. Haskel's dampener test, then a power spike, then nothing.",
    detail: "Dr. Imre Haskel, personal log, day 212: \"The hum in the eastern vault isn't geological. Sixty years of survey reports called it background noise. It isn't noise; it's a carrier wave, and it's coming from under the plaza.\"\nDay 216: \"Lieutenant Grath's dampener design arrived today. Grath asked what it's for. I said calibration, which is nearly true. If I can quiet the carrier we'll finally get a clean scan of what's down there.\"\nDay 219, 0400: \"Dampener test. Field holding at thirty percent. Sixty. The hum is changing pitch, it's answering the—\"\n\nThe entry ends there. The automated record carries on: at 0412 a power spike from the ruins, off every scale the outpost has; at 0413 all eight biosigns leave the station, walking. After that, three weeks of empty entries.\n\nThe last line in the supply run's log is from Rrinn's sister, sent the same morning: \"Haskel's test did something to the ruins. The air hums. Everyone is walking toward the—\"" },
  bunks: { name: "The empty bunks", skills: ["Medicine", "Sensors"],
    how: { Medicine: "Examine the quarters as a doctor would: blood, tissue, any sign of injury or struggle.", Sensors: "Tricorder sweep of the quarters and corridors: traces, residue, the tracks in the dust." }, found: "No blood, no struggle, personal effects untouched. The scientists walked out.",
    detail: "Eight bunks, and nothing disturbed. A mug of tea gone cold and furred over on a desk; a padd face down on a pillow, mid-chapter; two pairs of boots still by the door.\n\nThe medical scan finds no blood, no tissue, no phaser residue, no sign that anyone was hurt or forced. In the dust of the corridor the footprints run in a calm single file, booted and bare, out of the east door and across the plaza toward the ruins. All of them left at the same moment, in the middle of the night, some without their shoes.\n\nThey weren't taken. They walked out, the way sleepwalkers do." },
  energy: { name: "The ruins' energy", skills: ["Physical Sciences", "Sensors"],
    how: { "Physical Sciences": "Work out what the field is, what it does and what powers it.", Sensors: "Map the field with tricorders: its reach, its frequency, how it changes." }, found: "A field that reads the away team's biology and records it. It knows them now.",
    detail: "The ruins hum on a frequency the tricorders have to be retuned to hear. The field covers the whole site and two kilometers beyond it, and the Ketari village sits inside it.\n\nWhen the away team steps into the plaza the field changes: it sweeps each of them three times, head to foot, and when it settles again its pattern carries a copy of every one of their biosigns. It is cataloguing them. Whatever drives the field draws more power whenever anything turns sensors on it, which is what the Pelion felt in orbit. It isn't an attack. It's attention, and it knows the away team now." },
  village: { name: "The Ketari village", skills: ["Psychology", "Stealth"],
    how: { Psychology: "Read their customs and who answers to whom, from the blind: no contact.", Stealth: "Get close enough to see, and stay unseen." }, found: "Ketari carrying Orion phasers. The chieftain's people dig at the ruins by night.",
    detail: "From the duck blind at dusk: cook fires, goats, a smithy pouring bronze. In front of the chieftain's hall stand four warriors carrying Orion disruptor pistols, and they wear them like jewelry, on cords around their necks, muzzles down.\n\nAt moonrise a column of twenty Ketari leaves the village with picks and baskets, heading for the ruins, and at its head walks a hooded figure too tall for a Ketari: an Orion. The chieftain's people dig for the Orions at night, and the Orions pay them in weapons the Ketari think are talismans. One young warrior fires his into the air to show off. The bolt sets a tree burning, and the whole village goes silent." },
};
export const COUNTDOWN = 6, CLOCK = 4;   // CLOCK: the four clues on the surface
// What's in the ruins has to be worked out: Sevek forms a theory once the away team has found at least THEORY_AT clues.
export const THEORY_AT = 3;
/** How each skill is used, for the actions that aren't clues. */
const HOW = {
  leave: { Stealth: "Slip into the village and take the phasers back unseen.", Psychology: "Learn their routines, so no one is there when the phasers go." },
};
export const cluesFound = (A) => Object.values(A.clues || {}).filter(Boolean).length;
// The away team's own log: the same captain's log, with these entries marked so the Away team tab can show them.
const alog = (S, text, kind) => log(S, text, kind, { away: true });
const astory = (S, title, text) => storyEvent(S, title, text, { away: true });
/** The surface of Corvan II, for the planetary map: places (x, y from 0 to 1 across the map) and where each action happens. */
export const SITES = {
  outpost: { name: "The outpost", sub: "Federation research station: beam-in point", x: 0.24, y: 0.58 },
  ruins: { name: "The ruins", sub: "An extinct civilization's city", x: 0.58, y: 0.42 },
  core: { name: "The caretaker's chamber", sub: "Deep in the ruins", x: 0.66, y: 0.22 },
  blind: { name: "The duck blind", sub: "A hidden post above the village", x: 0.70, y: 0.66 },
  village: { name: "The Ketari village", sub: "Bronze age; two kilometers from the ruins", x: 0.86, y: 0.78 },
};
export const SITE_OF = { "clue-logs": "outpost", "clue-bunks": "outpost", "clue-energy": "ruins", "clue-village": "blind", stun: "ruins", kill: "ruins", shutdown: "core", reason: "core", leave: "village" };
const arcOrder = (S) => S.orders.find((o) => o.arc);
const raider = (S) => enemiesAt(S, S.systems[S.corvan].at).find((e) => e.goal === "arc");

export function arcActions(S) {
  const A = S.arc, out = [];
  const add = (arc, name, skills, blurb, extra, who, how) => out.push({ id: "arc", arc, name, skills, blurb, extra, who, how: how || (arc.startsWith("clue-") ? CLUES[arc.slice(5)].how : HOW[arc]) });
  const surface = ["pull", "orions", "caretaker"].includes(A.stage);
  // The surface needs an away team: choosing and beaming them down is free, and done before anything below.
  if (surface && !A.team) { out.push({ id: "beam", name: "Beam down an away team", skills: [], free: true, blurb: "Choose two to four officers. Only the away team can act on the surface; whoever stays aboard runs the ship. The transporter takes no action." }); return out; }
  const team = A.team, aboard = surface ? CREW.map((c) => c.id).filter((id) => !team.includes(id)) : null;
  if (A.stage === "orbit") add("scan", "Sweep the ruins with the ship's sensors", ["Sensors", "Physical Sciences"], "Find out what's down there before anyone beams down. Whatever the roll, something in the ruins will notice.");
  if (A.stage === "pull") {
    for (const [k, c] of Object.entries(CLUES)) if (!A.clues[k]) add("clue-" + k, `Away team: ${c.name.toLowerCase()}`, c.skills, `Evidence for Sevek's theory (${cluesFound(A)}/${CLOCK} clues; he needs ${THEORY_AT}). A failure costs time: the Countdown fills.${k === "village" ? " Fail by 3 or more and the Ketari see you." : ""}`, [["Something here is wrong", -2]], team);
    // Sevek's theory: what's in the ruins. Earned by the evidence; Sevek works it out wherever he is.
    const n = cluesFound(A), sv = available(S, "sevek");
    const evidence = [["An uncatalogued civilization", -3]].concat(n > THEORY_AT ? [["Every clue found", n - THEORY_AT]] : [], A.strong ? [["Strong findings", Math.min(2, A.strong)]] : [], A.readings ? [["The orbital readings", 1]] : []);
    const th = { id: "arc", arc: "theory", name: "Sevek's theory: what's in the ruins", skills: ["Physical Sciences"], who: ["sevek"], extra: evidence,
      blurb: `Put the evidence together. Sevek alone, from the surface or the ship. Success tells you what the ruins hold; a failure costs time. The more clues found, the better the odds (${n}/${CLOCK} found).` };
    if (n < THEORY_AT) th.why = `Not enough evidence yet: ${n} of the ${THEORY_AT} clues Sevek needs.`;
    else if (!sv) th.why = "Sevek is in sickbay. The theory waits for him.";
    out.push(th);
    if (!A.boughtTime && A.countdown > 0) add("time", "Aboard: buy time, reroute power", ["Engineering"], "Clear a segment of the Countdown. Once. Done from the ship, by someone still aboard.", [], aboard);
  }
  if (A.stage === "orions") {
    add("stun", "Stop the Orion diggers (phasers on stun)", ["Phasers", "Unarmed Combat", "Stealth"], "Three Orion pirates in the ruins. A failure hurts whoever leads it, and costs time.", [["Three of them", -3]], team);
    add("kill", "Stop them, phasers on kill", ["Phasers"], "No −3, but Starfleet Command marks a box for the bodies.", [], team);
  }
  if (A.stage === "caretaker") {
    add("shutdown", "Shut the caretaker down", ["Engineering", "Electronics"], "The scientists wake. The Ketari lose their protector.", [["Technology older than the Federation", -4]], team);
    add("reason", "Reason with it: the paradox", ["Psychology", "Diplomacy"], "It protects them from all outsiders, and it's an outsider itself. −4, but Sevek's logic gives +2. Success: it releases the scientists and goes on watching.",
      [["A machine's logic", -4]].concat(available(S, "sevek") && team.includes("sevek") ? [["Sevek's paradox", 2]] : []), team);
    add("leave", "Leave it be; take back the Orion phasers", ["Stealth", "Psychology"], "Keep Ketari history their own. The scientists stay asleep. Fail by 3 or more and the Ketari see you.", [["A whole village", -2]], team);
  }
  return out;
}

export function arcStep(S, p) {
  const A = S.arc, r = p.roll, k = p.arc, who = officer(p.officer)?.short || "The away team";
  // On the surface map, whoever did it is now where it happened.
  if (A.team && SITE_OF[k] && A.team.includes(p.officer)) { A.pos = A.pos || {}; A.pos[p.officer] = SITE_OF[k]; }
  if (k === "scan") {
    if (r.success) { A.readings = true; alog(S, `${who}'s sweep of the ruins at Corvan II: an energy source older than anything in the Federation's records, and eight life signs deep below it, barely there. Not an answer, but readings Sevek can use later (+1 to his theory).`, "discovery"); }
    else alog(S, `${who}'s sweep of the ruins at Corvan II: interference, and then the readings go strange.`);
    startPull(S);
    return "";
  }
  if (k.startsWith("clue-")) {
    const c = CLUES[k.slice(5)];
    if (!r.success) {
      A.countdown++;
      if (k === "clue-village" && r.margin <= -3) { A.seen = true; markCommand(S, 1, "the Ketari saw the away team. The Prime Directive."); }
      alog(S, `Corvan II: ${c.name} gives nothing up. The Countdown: ${A.countdown}/${COUNTDOWN}.`, "bad");
      return checkCountdown(S);
    }
    A.clues[k.slice(5)] = true; A.clock = cluesFound(A);
    if (r.margin >= 5) A.strong = (A.strong || 0) + 1;
    astory(S, c.name, c.detail);
    const n = A.clock;
    alog(S, `Corvan II, ${c.name.toLowerCase()}: ${c.found} Clues: ${n}/${CLOCK}.${r.margin >= 5 ? " A strong finding: +1 to Sevek's theory." : ""}${n === THEORY_AT ? " Sevek thinks there's enough now to form a theory of what's in the ruins (the Here tab)." : n < THEORY_AT ? ` Sevek needs ${THEORY_AT - n} more before he can form a theory.` : ""}`, "discovery");
    return "";
  }
  if (k === "theory") {
    if (!r.success) {
      A.countdown++;
      alog(S, `Sevek's theory doesn't hold together yet: one piece of the evidence contradicts another. The Countdown: ${A.countdown}/${COUNTDOWN}.${cluesFound(A) < CLOCK ? " Another clue would help." : ""}`, "bad");
      return checkCountdown(S);
    }
    A.stage = "orions"; A.theory = true;
    astory(S, "Sevek's theory: a caretaker, not a weapon", `Sevek lays the evidence out in the outpost's lab, one piece at a time. \"The dampener test, then the spike: Dr. Haskel's device did not damage something in the ruins. It woke it. The scientists left calmly, at one moment, as if called: they were not attacked, they were collected. The field does not strike at the away team; it catalogues them, as it has catalogued the Ketari for centuries. And the village sits inside its range.\" He looks up. \"Logic suggests a single explanation. The civilization that built this city left a caretaker: a machine set to protect the Ketari from harm. It judged Dr. Haskel's device a threat to its charges and removed the threat. Whether it harmed them, I cannot say.${A.readings ? " The ship read eight life signs deep beneath the ruins. If they are the scientists, they are alive. How they are held, I cannot know until we see it." : " If the scientists are anywhere, they are beneath the ruins, where the field is strongest. What became of them, I cannot know until we see it."}\"\n\nA caretaker, not a weapon, if Sevek is right. And the Orions, who came for the machine itself, are in the ruins now, cutting their way to its core.`);
    return "";
  }
  if (k === "time") {
    if (r.success) { A.countdown = Math.max(0, A.countdown - 1); A.boughtTime = true; alog(S, `${who} reroutes power around the drain: the Countdown ${A.countdown}/${COUNTDOWN}.`, "good"); }
    else { A.boughtTime = true; alog(S, `${who} can't find a way around the drain.`, "bad"); }
    return "";
  }
  if (k === "stun" || k === "kill") {
    if (!r.success) {
      A.countdown++; const id = p.officer; S.crew[id].inj = Math.min(3, S.crew[id].inj + 1);
      alog(S, `The Orions fight back: ${officer(id).short} is hurt (${S.crew[id].inj}/3). The Countdown ${A.countdown}/${COUNTDOWN}.`, "bad");
      return checkCountdown(S);
    }
    if (k === "kill") markCommand(S, 1, "Orion pirates killed on Corvan II when stun would have done.");
    A.stage = "caretaker";
    A.podsSeen = true;
    alog(S, "The caretaker's chamber, seen at last: eight stasis pods in a ring around a column of light, and in each one a scientist from the outpost, asleep, unharmed, breathing once a minute. Rrinn's sister is in the third. Sevek was right about the machine; now the away team knows what it did with them.", "discovery");
    astory(S, "The caretaker speaks", `${k === "kill" ? "The Orions are dead." : "The Orions are stunned and in the brig."} Past their cutting gear, the away team reaches the caretaker's chamber: eight stasis pods in a ring around a column of light, and in each one a scientist from the outpost, asleep and unharmed. Rrinn's sister is in the third. Then the machine speaks through an android shell: courteous, absolute. It will protect the Ketari from everything off-world, the Federation included. The Countdown stands at ${A.countdown}/${COUNTDOWN}.`);
    return "";
  }
  if (k === "shutdown" || k === "reason" || k === "leave") {
    if (!r.success) {
      A.countdown++;
      if (k === "leave" && r.margin <= -3 && !A.seen) { A.seen = true; markCommand(S, 1, "the Ketari saw the away team. The Prime Directive."); }
      alog(S, `The caretaker doesn't yield. The Countdown ${A.countdown}/${COUNTDOWN}.`, "bad");
      return checkCountdown(S);
    }
    finishArc(S, k);
    return "";
  }
  return "";
}
function checkCountdown(S) {
  const A = S.arc;
  if (A.countdown < COUNTDOWN || A.stage === "done") return "";
  A.stage = "done";
  const o = arcOrder(S); if (o) completeOrder(S, o, false, "The Countdown ran out: the Pelion had to break orbit, and the scientists were left asleep.");
  astory(S, "Breaking orbit", "The Countdown runs out: the drain on the Pelion's power is too much, and the ship has to break orbit or fall. The away team beams up with nothing. The scientists sleep on in the ruins, and Rrinn never hears the end of that message.");
  return "";
}
function finishArc(S, how) {
  const A = S.arc; A.stage = "done";
  const o = arcOrder(S);
  if (how === "leave") {
    if (o) { S.orders = S.orders.filter((x) => x !== o); S.done++; S.commendations += 1; recordOrder(S, o, "partly", "Partly: the Orion phasers recovered and the Ketari left their history, but the scientists still asleep."); }
    S.science += 8;
    astory(S, "The Ketari's own history", "The away team takes back every Orion phaser from the village and leaves the caretaker to its watch. Ketari history stays their own. The eight scientists sleep on, and Starfleet will have to send a team that can wake them. Rrinn takes the news quietly.");
    alog(S, "The Silence at Corvan II: the Ketari are safe from the Orions' weapons; the scientists are still asleep.", "order");
  } else {
    if (o) completeOrder(S, o, true, how === "reason" ? "The caretaker reasoned with: the scientists released, the Ketari still watched over." : "The caretaker shut down: the scientists awake and home.");
    if (how === "reason") { S.commendations += 4; S.science += 15; S.records.includes("caretaker") || S.records.push("caretaker"); }
    else S.commendations += 1;
    astory(S, how === "reason" ? "Equals" : "Silence, for good", how === "reason"
      ? "Sevek lays out the paradox, and the machine considers it for a long time. Then it releases the eight scientists and goes back to its watch: the Ketari keep their guardian, and the Federation has a library record no one else has. Rrinn's sister is the first one out, and finally finishes that sentence."
      : "The caretaker goes dark. The eight scientists wake, cold and confused and alive, and the Ketari will never know what watched over them, or that it's gone. Rrinn's sister is among the sleepers, and finally finishes that sentence.");
    alog(S, `The Silence at Corvan II: the eight scientists are safe.${how === "reason" ? " Library record: the caretaker." : ""}`, "victory");
  }
  if (!A.seen) markCommand(S, -1, "the Ketari never learned what the crew were.");
}

/** After anything happens: move the story on. */
export function arcTick(S) {
  const A = S.arc, cv = S.systems[S.corvan];
  if (A.stage === "travel" && S.pelion.at === cv.at && !S.battle) {
    // In orbit. Passive sensors show nothing; the raider behind the moon takes an active sweep to find, and nothing
    // happens below until the Pelion's sensors sweep the ruins.
    A.stage = "orbit";
    const o = arcOrder(S); if (o) o.deadline = 999;
    alog(S, "Standard orbit over Corvan II. Passive sensors show nothing in orbit but the moon's shadow, and the outpost doesn't answer hails. The ruins are two kilometers from the Ketari village. A Sensor sweep would check the space around the planet; sweeping the ruins would tell you what happened below (the Here tab).", "order");
  }
}
export function arcArrive(S) { arcTick(S); }
/** The sweep that wakes what's in the ruins: the arc's own scan of the surface. */
function startPull(S) {
  const A = S.arc; if (A.stage !== "orbit") return;
  A.stage = "pull";
  astory(S, "The pull", "The moment the Pelion's sensors sweep the ruins, the lights flicker: something below is drawing on the ship's power, and the orbit begins to decay. The Countdown has started (6): it fills a segment every hour the Pelion stays in orbit, and with each failure on the surface. When it fills, the Pelion has to break orbit. Below, the outpost is dark: choose an away team and beam them down to find out what happened.");
}
/** Beam an away team down (2 to 4 officers fit for duty), or beam them all back up (ids empty). Takes no action. */
export function beamDown(S, ids) {
  const A = S.arc;
  if (!["pull", "orions", "caretaker"].includes(A.stage) || S.pelion.at !== S.systems[S.corvan].at) return { error: "There's nowhere to beam down to." };
  if (!ids || !ids.length) { if (A.team) alog(S, `The away team (${A.team.map((id) => officer(id).short).join(", ")}) beams back aboard.`, "move"); A.team = null; return { ok: true }; }
  ids = [...new Set(ids)].filter((id) => available(S, id));
  if (ids.length < 2 || ids.length > 4) return { error: "An away team is two to four officers fit for duty." };
  A.team = ids; A.pos = Object.fromEntries(ids.map((id) => [id, "outpost"]));
  alog(S, `Away team: ${ids.map((id) => officer(id).name).join(", ")} beam down to the outpost on Corvan II. ${CREW.filter((c) => !ids.includes(c.id)).map((c) => c.short).join(", ")} stay${CREW.length - ids.length === 1 ? "s" : ""} aboard.`, "move");
  return { ok: true };
}
/** An active sensor sweep around Corvan II: if it found the raider behind the moon, the raider, caught, hails. */
export function arcSweep(S) {
  const e = raider(S);
  if (e && !e.hidden && !S.arc.raiderMet && S.pelion.at === S.systems[S.corvan].at) { S.arc.raiderMet = true; S.event = { kind: "arc-arrive" }; }
}
/** End of turn: the drain on the ship while it stays in orbit. */
export function arcTurn(S, hours = 0) {
  // Left undetected, the raider makes its move within a day of the Pelion's arrival: 24 hours in orbit, or the end of the
  // week it arrives, whichever comes first, it comes around the moon, firing.
  const e = raider(S);
  if (e && e.hidden && S.pelion.at === S.systems[S.corvan].at) {
    S.arc.raiderHours = (S.arc.raiderHours || 0) + (hours || 24);
    if (S.arc.raiderHours >= 24) { e.hidden = false; e.seen = true; S.arc.raiderMet = true; alog(S, "Before the day is out, an Orion raider swings out from behind Corvan II's moon, where it was hiding all along, and opens fire. An active sweep would have found it.", "war"); startBattle(S, e.id, "enemy"); }
  }
  const A = S.arc;
  // The drain decays the orbit each turn the Pelion stays (an hour while the away team is down); failures on the surface
  // cost time as well.
  if (["pull", "orions", "caretaker"].includes(A.stage) && S.pelion.at === S.systems[S.corvan].at) {
    A.countdown++; alog(S, `Corvan II drains the Pelion and the orbit decays: the Countdown ${A.countdown}/${COUNTDOWN}.`); checkCountdown(S);
  }
}

/** The arrival at Corvan II: the raider hails first. */
export function arcEventChoices(S) {
  if (!S.event || S.event.kind !== "arc-arrive") return [];
  return [
    { id: "warn", name: "Warn them off", blurb: "Communications or Diplomacy against their captain's Will. Fail, and they open fire." + (S.arc.scanned ? " +2: you know what they've been selling." : "") },
    { id: "scan", name: "Scan them first", blurb: "Sensors: what is an Orion raider doing over a pre-warp world?", disabled: S.arc.scanned },
    { id: "engage", name: "Engage", blurb: "Raise shields and fire. They're pirates: no incident." },
  ];
}
export function arcEventChoose(S, id, roll) {
  const e = raider(S);
  if (!e) { S.event = null; arcTick(S); return { text: "The raider is gone." }; }
  if (id === "scan") {
    const r = roll("Sensors", "scan"); S.arc.scanned = true;
    if (r.success) log(S, "Scan of the Orion raider at Corvan II: its hold is full of digging gear, and its manifest lists Starfleet-pattern phasers \"traded\" planetside. They're arming the natives.", "discovery");
    return { roll: r, text: r.success ? "Their hold is full of digging gear, and their manifest lists Starfleet-pattern phasers \"traded\" planetside. They're arming the natives." : "Their hull scatters the scan." };
  }
  if (id === "warn") {
    const r = roll("Communications", "hail", [["Their captain's Will 10", 0]].concat(S.arc.scanned ? [["You know what they've done", 2]] : []));
    S.event = null;
    if (r.success) { sendHome(S, e, 6); e.goal = "home"; delete S.enemies[e.id]; log(S, "The Orion raider runs for the sector's edge.", "good"); arcTick(S); return { roll: r, text: "\"Legitimate salvagers\" don't argue with a Heavy Cruiser. The raider runs." }; }
    startBattle(S, e.id, "enemy"); return { roll: r, text: "The Orion captain cuts the channel, and the raider opens fire." };
  }
  if (id === "engage") { S.event = null; startBattle(S, e.id, "pelion"); return { text: "Shields up." }; }
  return {};
}

registerHooks({ arcActions, arcStep, arcSweep, arcArrive });
export { CLUES };
export const raiderName = ENEMIES.orion.name;
