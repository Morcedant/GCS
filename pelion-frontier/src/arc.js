// The first mission, from the GM's Guide: The Silence at Corvan II. An Orion raider in orbit; the pull on the ship's
// power and a Countdown of 6; the away team's investigation (a discovery clock of 4); Orion diggers in the ruins; and
// the caretaker machine, with a choice about what to do with it.
import { ENEMIES, CREW } from "./data.js";
import { log, check, markCommand, completeOrder, recordOrder, registerHooks, enemiesAt, available, officer, sendHome, storyEvent } from "./game.js";
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
  phasers: { Stealth: "Slip into the village by night and take the phasers back unseen.", Psychology: "Learn their routines, so no one is there when the phasers go." },
};
export const cluesFound = (A) => Object.values(A.clues || {}).filter(Boolean).length;
// The away team's own log: the same captain's log, with these entries marked so the Away team tab can show them.
const alog = (S, text, kind) => log(S, text, kind, { away: true });
const astory = (S, title, text) => storyEvent(S, title, text, { away: true });
/** The surface of Corvan II, for the planetary map: places (x, y from 0 to 1 across the map) and where each action happens. */
export const SITES = {
  outpost: { name: "The outpost", sub: "Federation research station: beam-in point", x: 0.24, y: 0.58 },
  ruins: { name: "The ruins", sub: "An extinct civilization's city", x: 0.58, y: 0.42 },
  core: { name: "The deep chamber", sub: "Beneath the ruins, where the field is strongest", x: 0.66, y: 0.22 },
  blind: { name: "The duck blind", sub: "A hidden post above the village", x: 0.70, y: 0.66 },
  village: { name: "The Ketari village", sub: "Bronze age; two kilometers from the ruins", x: 0.86, y: 0.78 },
};
export const SITE_OF = { phasers: "village", "clue-logs": "outpost", "clue-bunks": "outpost", "clue-energy": "ruins", "clue-village": "blind", stun: "ruins", kill: "ruins", shutdown: "core", reason: "core", leave: "village" };
const arcOrder = (S) => S.orders.find((o) => o.arc);
const raider = (S) => enemiesAt(S, S.systems[S.corvan].at).find((e) => e.goal === "arc");

export function arcActions(S) {
  const A = S.arc, out = [];
  const add = (arc, name, skills, blurb, extra, who, how) => out.push({ id: "arc", arc, name, skills, blurb, extra, who, how: how || (arc.startsWith("clue-") ? CLUES[arc.slice(5)].how : HOW[arc]) });
  const surface = ["pull", "orions", "caretaker", "phasers"].includes(A.stage);
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
  // The Orion phasers in the village: part of the orders, once the crew know about them, at any point on the surface.
  if (A.knowPhasers && !A.phasers && ["pull", "orions", "caretaker", "phasers"].includes(A.stage))
    add("phasers", "Recover the Orion phasers from the village", ["Stealth", "Psychology"], `Part of the orders: Starfleet weapons-grade disruptors can't stay in a bronze-age village. Take every one back without being seen. A failure costs time${A.stage === "phasers" ? "" : " (the Countdown fills)"}; fail by 3 or more and the Ketari see you.`, [["A whole village", -2]], team);
  if (A.stage === "caretaker") {
    add("shutdown", "Shut the caretaker down", ["Engineering", "Electronics"], "The scientists wake. The Ketari lose their protector.", [["Technology older than the Federation", -4]], team);
    // The paradox: Sevek argues it against the caretaker itself, in three exchanges of contested rolls.
    const ev = [].concat(cluesFound(A) >= CLOCK ? [["Every clue found", 1]] : [], A.readings ? [["The orbital readings", 1]] : [], A.argued ? [["Its last answer, studied", 1]] : []);
    const rs = { id: "arc", arc: "reason", name: "Sevek puts the paradox to the caretaker", skills: ["Psychology"], who: ["sevek"], extra: ev, contest: true,
      blurb: `A contest of logic: three exchanges, Sevek's Psychology against the caretaker's ${CARETAKER.name} ${CARETAKER.target}. Each side rolls; the better margin takes the exchange, and the caretaker wins ties. Win two, and it releases the scientists and goes on with its watch. Lose two, and it ends the argument for the hour: the Countdown fills a segment.`, paradox: PARADOX_TEXT };
    if (!team.includes("sevek")) rs.why = "Only Sevek can argue the paradox, and he isn't on the away team. Beam him down.";
    else if (!available(S, "sevek")) rs.why = "Sevek is in sickbay.";
    out.push(rs);
    if (A.phasers) add("leave", "Leave it be", ["Psychology", "Diplomacy"], "Keep Ketari history their own, and go. The scientists stay asleep: the orders only partly carried out.", [], team, { Psychology: "Persuade the caretaker that the Pelion will leave in peace.", Diplomacy: "Take formal leave of it, and promise it nothing will follow." });
    else add("leave", "Leave it be; take back the Orion phasers", ["Stealth", "Psychology"], "Keep Ketari history their own. The scientists stay asleep. Fail by 3 or more and the Ketari see you.", [["A whole village", -2]], team);
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
    if (k === "clue-village") A.knowPhasers = true;
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
    astory(S, "Sevek's theory: a guardian, not a weapon", `Sevek lays the evidence out in the outpost's lab, one piece at a time. \"The dampener test, then the spike: Dr. Haskel's device did not damage something in the ruins. It woke it. The scientists left calmly, at one moment, as if called: they were not attacked, they were collected. The field does not strike at the away team; it catalogues them, as it has catalogued the Ketari for centuries. And the village sits inside its range.\" He looks up. \"The evidence suggests a hypothesis, nothing more. Something in the ruins was set to watch over the Ketari, and it judged Dr. Haskel's device a threat to them and removed the threat. Whether it is a machine, a mind or a mechanism with no mind at all, I cannot say. Whether it harmed them, I cannot say either.${A.readings ? " The ship read eight life signs deep beneath the ruins. If they are the scientists, they are alive. How they are held, I cannot know until we see it." : " If the scientists are anywhere, they are beneath the ruins, where the field is strongest. What became of them, I cannot know until we see it."}\"\n\nA guardian, not a weapon, if Sevek is right; and only a hypothesis until someone goes down there. The Orions are in the ruins now, cutting their way toward whatever it is.`);
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
    if (!A.knowPhasers) { A.knowPhasers = true; alog(S, "The Orion diggers' gear includes a tally: eleven disruptor pistols traded to the Ketari for their labor. Starfleet weapons can't be left in a bronze-age village: the away team has to get them back.", "discovery"); }
    A.podsSeen = true;
    alog(S, "The deep chamber, seen at last: eight stasis pods in a ring around a column of light, and in each one a scientist from the outpost, asleep, unharmed, breathing once a minute. Rrinn's sister is in the third. Then a voice speaks: the caretaker, a machine left by the city's builders to watch over the Ketari. Sevek's hypothesis was right.", "discovery");
    astory(S, "The caretaker speaks", `${k === "kill" ? "The Orions are dead." : "The Orions are stunned and beamed to the brig."} Past their cutting gear a ramp spirals down, and the away team comes out into a chamber the size of a cathedral: eight stasis pods in a ring around a column of light, and in each one a scientist from the outpost, asleep and unharmed. Rrinn's sister is in the third.\n\nThe column brightens, and a figure steps out of it: an android shell, tall and featureless, its hands open. When it speaks, the voice comes from the walls as much as from the figure, calm and courteous and very old.\n\n${SPEECH}\n\nIt waits, perfectly still. It will not be threatened, and it has eternity to wait. The Countdown stands at ${A.countdown}/${COUNTDOWN}.`);
    return "";
  }
  if (k === "reason") return argue(S, p);
  if (k === "phasers") {
    if (!r.success) {
      if (r.margin <= -3 && !A.seen) { A.seen = true; markCommand(S, 1, "the Ketari saw the away team. The Prime Directive."); }
      if (A.stage === "phasers") { alog(S, `The village is awake tonight: ${who} can't get near the phasers without being seen.${A.seen ? " Worse: a sentry saw strangers, and the village talks of sky-demons." : " Try again next hour."}`, "bad"); return ""; }
      A.countdown++;
      alog(S, `The village is awake tonight: ${who} can't get near the phasers.${A.seen ? " Worse: a sentry saw strangers." : ""} The Countdown ${A.countdown}/${COUNTDOWN}.`, "bad");
      return checkCountdown(S);
    }
    A.phasers = true;
    alog(S, `${who} recovers the Orion phasers from the Ketari village: all eleven, from the chieftain's hall, the warriors' cords and the smithy, swapped for bronze copies. Come morning the talismans are still there; they just don't burn trees any more.`, "good");
    if (A.stage === "phasers") completeArc(S, A.resolved);
    return "";
  }
  if (k === "shutdown" || k === "leave") {
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
/** The caretaker's side of the contest. */
const CARETAKER = { name: "Logic", target: 13 };
/** What the paradox is, in full: shown on the action card. */
const PARADOX_TEXT = "The caretaker's one law: protect the Ketari from every influence from beyond their world, so that they become whatever they will become on their own. But the caretaker is itself from beyond their world: its makers were not Ketari, and they came to Corvan II from the stars. Everything it does is outside influence. Holding eight off-worlders beneath Ketari soil keeps outsiders here for good, and its own presence is what drew the Orions and set the Ketari digging. By its own law, the outsiders, the eight scientists among them, have to leave; and the guardian has to stop acting and only watch.";
/** The three exchanges: what Sevek argues, and what each side says when it takes the exchange. */
const EXCHANGES = [
  { name: "Your law", sevek: "\"State your purpose precisely.\" The caretaker does: protect the Ketari from every influence from beyond their world. Sevek has it repeat the words \"every\" and \"beyond\", and it agrees that it allows no exceptions.",
    machine: "\"My purpose is not yours to examine.\" The caretaker refuses to define itself to an outsider, and Sevek has nothing to build on." },
  { name: "Your makers", sevek: "\"Your makers were not Ketari. The star charts on your city's walls show where they came from. You are an influence from beyond this world.\" The caretaker's light dims; it does not deny it.",
    machine: "\"My makers are gone. I am the last of them, and I have become part of this world.\" Sevek can't show it otherwise, not yet." },
  { name: "Your remedy", sevek: "\"Eight off-worlders sleep beneath Ketari soil, and they will sleep there for as long as you hold them. Your presence drew the Orions; it set the Ketari digging for them. By your own law, what is not of this world must go: the eight, and every act of yours that is not watching.\"",
    machine: "\"If I release them, they will speak of what they found, and more outsiders will come. Holding them is the lesser influence.\" It is a fair answer, and Sevek has no reply ready." },
];
/** The chance Sevek wins the argument (two exchanges of three) at this target, worked out exactly. */
export function contestOdds(T, them = CARETAKER.target) {
  const dist = {}; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) dist[a + b + c] = (dist[a + b + c] || 0) + 1 / 216;
  const eff = (t, n) => (n <= 4 || (n <= t && n < 17) ? t - n : Math.min(t - n, -1));
  let p = 0; for (const x in dist) for (const y in dist) if (eff(T, +x) > eff(them, +y)) p += dist[x] * dist[y];
  return p * p * (3 - 2 * p);
}
/** Sevek against the caretaker: three exchanges of contested rolls; the first is the action's own roll. Best of three. */
function argue(S, p) {
  const A = S.arc; let sv = 0, ct = 0;
  for (let i = 0; i < EXCHANGES.length && sv < 2 && ct < 2; i++) {
    const x = EXCHANGES[i], mine = i === 0 ? p.roll : check(S, p.roll.target), its = check(S, CARETAKER.target);
    const ms = mine.success ? mine.margin : Math.min(mine.margin, -1), mc = its.success ? its.margin : Math.min(its.margin, -1);
    const win = ms > mc; win ? sv++ : ct++;
    alog(S, `Exchange ${i + 1}, "${x.name}": Sevek rolled ${mine.dice.join("+")} = ${mine.total} against ${mine.target} (${mine.success ? `by ${mine.margin}` : `failed by ${-mine.margin}`}); the caretaker rolled ${its.dice.join("+")} = ${its.total} against its ${CARETAKER.name} ${CARETAKER.target} (${its.success ? `by ${its.margin}` : `failed by ${-its.margin}`}). ${win ? "Sevek takes it" : "The caretaker takes it"}: ${win ? x.sevek : x.machine} (Sevek ${sv}, the caretaker ${ct}.)`, win ? "good" : "bad");
  }
  if (sv >= 2) { finishArc(S, "reason"); return ""; }
  A.argued = true; A.countdown++;
  alog(S, `The caretaker ends the argument for now: "I have heard you." Sevek can try again, and he has its answers to study (+1). The Countdown ${A.countdown}/${COUNTDOWN}.`, "bad");
  return checkCountdown(S);
}
/** The caretaker's first words to the away team, in full. */
const SPEECH = `"You have come a long way to be so careless. Be still; I will not harm you. I harm no one. I have watched this world for eleven thousand of its years.

"The people who built this city came here from the stars, as you have. They found the Ketari living in caves, and they loved them, and they understood too late that their love was changing them: the Ketari were learning to be smaller copies of their visitors, and forgetting how to be themselves. So the builders left, and they left me, with a single law: protect the Ketari from every influence from beyond their world, so that they may become whatever they will become, alone.

"For eleven thousand years I have kept that law. I turned aside the ships that came too close. I let the city fall to ruin so that it would be a story, not a lesson. Then your people built a station within sight of the village, and one of them, the one called Haskel, reached into me with a device to silence me and see what I was. That was a threat to my charges. I removed it. I removed all eight of them, gently. They sleep, they do not age, and they do not suffer. They will sleep until the Ketari no longer need me, and that will be a very long time.

"The pirates I could not stop so gently: they bribed my charges with weapons and set them digging at my walls. You have dealt with the pirates, and for that I thank you. Now I ask you to go, and to tell your people not to come back. Your ship is welcome to leave. I will release its power when it does."`;
function checkCountdown(S) {
  const A = S.arc;
  if (A.countdown < COUNTDOWN || A.stage === "done") return "";
  A.stage = "done";
  const o = arcOrder(S); if (o) completeOrder(S, o, false, "The Countdown ran out: the Pelion had to break orbit, and the scientists were left asleep.");
  astory(S, "Breaking orbit", "The Countdown runs out: the drain on the Pelion's power is too much, and the ship has to break orbit or fall. The away team beams up with nothing. The scientists sleep on in the ruins, and Rrinn never hears the end of that message.");
  return "";
}
/** The caretaker's fate is decided. The orders aren't carried out until the Orion phasers are back as well. */
function finishArc(S, how) {
  const A = S.arc;
  if (how !== "leave" && !A.phasers) {
    A.resolved = how; A.stage = "phasers"; A.knowPhasers = true;
    astory(S, how === "reason" ? "Equals" : "Silence, for good", resolvedText(how) + "\n\nThe drain on the Pelion stops. One part of the orders is left: eleven Orion disruptors are still in the Ketari village, worn as talismans. They have to come back before the Pelion leaves, without the Ketari seeing who takes them.");
    alog(S, "The scientists are safe. Still to do: recover the Orion phasers from the Ketari village.", "order");
    return;
  }
  completeArc(S, how, true);
}
const resolvedText = (how) => how === "reason"
  ? "The caretaker is silent for a long time: the longest, it says afterward, that it has been silent since its makers left. \"The argument holds. I am an outsider here, and the eight are outsiders, and what does not belong to this world must leave it. I release them. I will go on watching, and I will not act again. If harm comes to the Ketari, I will tell you, and you will decide; I find I would rather someone decided.\" The pods open one by one. Rrinn's sister is the first one out, and finally finishes that sentence."
  : "The caretaker goes dark. The eight scientists wake, cold and confused and alive, and the Ketari will never know what watched over them, or that it's gone. Rrinn's sister is among the sleepers, and finally finishes that sentence.";
/** Everything done: the orders carried out (or, leaving the scientists asleep, partly). */
function completeArc(S, how, fresh) {
  const A = S.arc; A.stage = "done";
  const o = arcOrder(S);
  if (how === "leave") {
    if (o) { S.orders = S.orders.filter((x) => x !== o); S.done++; S.commendations += 1; recordOrder(S, o, "partly", "Partly: the Orion phasers recovered and the Ketari left their history, but the scientists still asleep."); }
    S.science += 8;
    A.phasers = true;
    astory(S, "The Ketari's own history", "The away team has every Orion phaser back from the village, and leaves the caretaker to its watch. Ketari history stays their own. The eight scientists sleep on, and Starfleet will have to send a team that can wake them. Rrinn takes the news quietly.");
    alog(S, "The Silence at Corvan II: the Ketari are safe from the Orions' weapons; the scientists are still asleep.", "order");
  } else {
    if (o) completeOrder(S, o, true, (how === "reason" ? "The caretaker reasoned with: the scientists released, the Ketari still watched over" : "The caretaker shut down: the scientists awake and home") + "; the Orion phasers recovered.");
    if (how === "reason") { S.commendations += 4; S.science += 15; S.records.includes("caretaker") || S.records.push("caretaker"); }
    else S.commendations += 1;
    astory(S, fresh ? (how === "reason" ? "Equals" : "Silence, for good") : "Orders carried out", fresh ? resolvedText(how) + (how === "reason" ? " The Ketari keep their guardian, and the Federation has a library record no one else has." : "") : `The phasers are back aboard, and the away team beams up. ${how === "reason" ? "The caretaker goes on watching, the Ketari keep their guardian, and the Federation has a library record no one else has." : "The ruins are only ruins now."} The eight scientists are in sickbay, and Rrinn hasn't left her sister's side.`);
    alog(S, `The Silence at Corvan II: the eight scientists are safe and the Orion phasers recovered.${how === "reason" ? " Library record: the caretaker." : ""}`, "victory");
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
  if (!["pull", "orions", "caretaker", "phasers"].includes(A.stage) || S.pelion.at !== S.systems[S.corvan].at) return { error: "There's nowhere to beam down to." };
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
    if (r.success) S.arc.knowPhasers = true;
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
