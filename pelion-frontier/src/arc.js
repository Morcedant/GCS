// The first mission, from the GM's Guide: The Silence at Corvan II. An Orion raider in orbit; the pull on the ship's
// power and a Countdown of 6; the away team's investigation (a discovery clock of 4); Orion diggers in the ruins; and
// the caretaker machine, with a choice about what to do with it.
import { ENEMIES } from "./data.js";
import { log, markCommand, completeOrder, registerHooks, enemiesAt, available, officer, sendHome, storyEvent } from "./game.js";
import { startBattle } from "./combat.js";

const CLUES = {
  logs: { name: "The outpost logs", skills: ["Computers"], found: "Dr. Haskel's dampener test, then a power spike, then nothing." },
  bunks: { name: "The empty bunks", skills: ["Medicine", "Sensors"], found: "No blood, no struggle, personal effects untouched. The scientists walked out." },
  energy: { name: "The ruins' energy", skills: ["Physical Sciences", "Sensors"], found: "A field that reads the away team's biology and records it. It knows them now." },
  village: { name: "The Ketari village", skills: ["Psychology", "Stealth"], found: "Ketari carrying Orion phasers. The chieftain's people dig at the ruins by night." },
};
export const COUNTDOWN = 6, CLOCK = 4;
const arcOrder = (S) => S.orders.find((o) => o.arc);
const raider = (S) => enemiesAt(S, S.systems[S.corvan].at).find((e) => e.goal === "arc");

export function arcActions(S) {
  const A = S.arc, out = [];
  const add = (arc, name, skills, blurb, extra) => out.push({ id: "arc", arc, name, skills, blurb, extra });
  if (A.stage === "pull") {
    for (const [k, c] of Object.entries(CLUES)) if (!A.clues[k]) add("clue-" + k, `Away team: ${c.name.toLowerCase()}`, c.skills, `A clue for the record (${A.clock}/${CLOCK}). A failure costs time: the Countdown fills.${k === "village" ? " Fail by 3 or more and the Ketari see you." : ""}`, [["Something here is wrong", -2]]);
    if (!A.boughtTime && A.countdown > 0) add("time", "Buy time: reroute power", ["Engineering"], "Clear a segment of the Countdown. Once.");
  }
  if (A.stage === "orions") {
    add("stun", "Stop the Orion diggers (phasers on stun)", ["Phasers", "Unarmed Combat", "Stealth"], "Three Orion pirates in the ruins. A failure hurts whoever leads it, and costs time.", [["Three of them", -3]]);
    add("kill", "Stop them, phasers on kill", ["Phasers"], "No −3, but Starfleet Command marks a box for the bodies.", []);
  }
  if (A.stage === "caretaker") {
    add("shutdown", "Shut the caretaker down", ["Engineering", "Electronics"], "The scientists wake. The Ketari lose their protector.", [["Technology older than the Federation", -4]]);
    add("reason", "Reason with it: the paradox", ["Psychology", "Diplomacy"], "It protects them from all outsiders, and it's an outsider itself. −4, but Sevek's logic gives +2. Success: it releases the scientists and goes on watching.",
      [["A machine's logic", -4]].concat(available(S, "sevek") ? [["Sevek's paradox", 2]] : []));
    add("leave", "Leave it be; take back the Orion phasers", ["Stealth", "Psychology"], "Keep Ketari history their own. The scientists stay asleep. Fail by 3 or more and the Ketari see you.", [["A whole village", -2]]);
  }
  return out;
}

export function arcStep(S, p) {
  const A = S.arc, r = p.roll, k = p.arc, who = officer(p.officer)?.short || "The away team";
  if (k.startsWith("clue-")) {
    const c = CLUES[k.slice(5)];
    if (!r.success) {
      A.countdown++;
      if (k === "clue-village" && r.margin <= -3) { A.seen = true; markCommand(S, 1, "the Ketari saw the away team. The Prime Directive."); }
      log(S, `Corvan II: ${c.name} gives nothing up. The Countdown: ${A.countdown}/${COUNTDOWN}.`, "bad");
      return checkCountdown(S);
    }
    A.clues[k.slice(5)] = true; A.clock = Math.min(CLOCK, A.clock + (r.margin >= 5 ? 2 : 1));
    log(S, `Corvan II, ${c.name.toLowerCase()}: ${c.found} (${A.clock}/${CLOCK})`, "discovery");
    if (A.clock >= CLOCK) {
      A.stage = "orions";
      storyEvent(S, "A caretaker, not a weapon", "The pieces fit. The ruins hold a caretaker machine, left by the vanished civilization to watch over the Ketari. Dr. Haskel's dampener woke it, and it judged the outpost a threat: all eight scientists are in stasis, unharmed, deep in the ruins. And in the ruins now, three Orion pirates are cutting their way to the machine's core.");
    }
    return "";
  }
  if (k === "time") {
    if (r.success) { A.countdown = Math.max(0, A.countdown - 1); A.boughtTime = true; log(S, `${who} reroutes power around the drain: the Countdown ${A.countdown}/${COUNTDOWN}.`, "good"); }
    else { A.boughtTime = true; log(S, `${who} can't find a way around the drain.`, "bad"); }
    return "";
  }
  if (k === "stun" || k === "kill") {
    if (!r.success) {
      A.countdown++; const id = p.officer; S.crew[id].inj = Math.min(3, S.crew[id].inj + 1);
      log(S, `The Orions fight back: ${officer(id).short} is hurt (${S.crew[id].inj}/3). The Countdown ${A.countdown}/${COUNTDOWN}.`, "bad");
      return checkCountdown(S);
    }
    if (k === "kill") markCommand(S, 1, "Orion pirates killed on Corvan II when stun would have done.");
    A.stage = "caretaker";
    storyEvent(S, "The caretaker speaks", `${k === "kill" ? "The Orions are dead." : "The Orions are stunned and in the brig."} Then the machine speaks through an android shell: courteous, absolute. It will protect the Ketari from everything off-world, the Federation included. The Countdown stands at ${A.countdown}/${COUNTDOWN}.`);
    return "";
  }
  if (k === "shutdown" || k === "reason" || k === "leave") {
    if (!r.success) {
      A.countdown++;
      if (k === "leave" && r.margin <= -3 && !A.seen) { A.seen = true; markCommand(S, 1, "the Ketari saw the away team. The Prime Directive."); }
      log(S, `The caretaker doesn't yield. The Countdown ${A.countdown}/${COUNTDOWN}.`, "bad");
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
  const o = arcOrder(S); if (o) completeOrder(S, o, false);
  storyEvent(S, "Breaking orbit", "The Countdown runs out: the drain on the Pelion's power is too much, and the ship has to break orbit or fall. The away team beams up with nothing. The scientists sleep on in the ruins, and Rrinn never hears the end of that message.");
  return "";
}
function finishArc(S, how) {
  const A = S.arc; A.stage = "done";
  const o = arcOrder(S);
  if (how === "leave") {
    if (o) { S.orders = S.orders.filter((x) => x !== o); S.done++; S.commendations += 1; }
    S.science += 8;
    storyEvent(S, "The Ketari's own history", "The away team takes back every Orion phaser from the village and leaves the caretaker to its watch. Ketari history stays their own. The eight scientists sleep on, and Starfleet will have to send a team that can wake them. Rrinn takes the news quietly.");
    log(S, "The Silence at Corvan II: the Ketari are safe from the Orions' weapons; the scientists are still asleep.", "order");
  } else {
    if (o) completeOrder(S, o, true);
    if (how === "reason") { S.commendations += 4; S.science += 15; S.records.includes("caretaker") || S.records.push("caretaker"); }
    else S.commendations += 1;
    storyEvent(S, how === "reason" ? "Equals" : "Silence, for good", how === "reason"
      ? "Sevek lays out the paradox, and the machine considers it for a long time. Then it releases the eight scientists and goes back to its watch: the Ketari keep their guardian, and the Federation has a library record no one else has. Rrinn's sister is the first one out, and finally finishes that sentence."
      : "The caretaker goes dark. The eight scientists wake, cold and confused and alive, and the Ketari will never know what watched over them, or that it's gone. Rrinn's sister is among the sleepers, and finally finishes that sentence.");
    log(S, `The Silence at Corvan II: the eight scientists are safe.${how === "reason" ? " Library record: the caretaker." : ""}`, "victory");
  }
  if (!A.seen) markCommand(S, -1, "the Ketari never learned what the crew were.");
}

/** After anything happens: move the story on. */
export function arcTick(S) {
  const A = S.arc, cv = S.systems[S.corvan];
  if (A.stage === "travel" && S.pelion.at === cv.at && !raider(S) && !S.battle) {
    A.stage = "pull";
    const o = arcOrder(S); if (o) o.deadline = 999;
    storyEvent(S, "The pull", "The moment the Pelion's sensors sweep the ruins, the lights flicker: something below is drawing on the ship's power, and the orbit begins to decay. The Countdown has started (6): it fills a segment each turn the Pelion stays in orbit, and with each failure on the surface. When it fills, the Pelion has to break orbit. The away team beams down to an empty outpost.");
  }
}
/** End of turn: the drain on the ship while it stays in orbit. */
export function arcTurn(S) {
  const A = S.arc;
  if (["pull", "orions", "caretaker"].includes(A.stage) && S.pelion.at === S.systems[S.corvan].at) { A.countdown++; log(S, `Corvan II drains the Pelion: the Countdown ${A.countdown}/${COUNTDOWN}.`); checkCountdown(S); }
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

registerHooks({ arcActions, arcStep });
export { CLUES };
export const raiderName = ENEMIES.orion.name;
