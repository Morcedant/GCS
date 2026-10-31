import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, check, actionsFor, attempt, resolve, moveTo, reachable, target, markCommand, score, visibleEnemies } from "../src/game.js";
import { startBattle, exchange, battleStats } from "../src/combat.js";
import { beamDown } from "../src/arc.js";
import { endTurn, chooseEvent, closeBattle, dismissEvent } from "../src/turn.js";
import { chance } from "../src/data.js";

test("the same seed builds the same sector", () => {
  const a = newGame({ seed: "x" }), b = newGame({ seed: "x" });
  assert.deepEqual(Object.values(a.systems).map((s) => s.at + s.kind), Object.values(b.systems).map((s) => s.at + s.kind));
});
test("3d6 roll-under: 3 or 4 always succeeds, 17 or 18 always fails", () => {
  const S = newGame({ seed: "dice" });
  for (let i = 0; i < 2000; i++) { const r = check(S, 10); if (r.total <= 4) assert.ok(r.success); if (r.total >= 17) assert.ok(!r.success); if (r.total > 4 && r.total < 17) assert.equal(r.success, r.total <= 10); }
  assert.equal(chance(10), 0.5);
});
test("the sector has a starbase, three colonies, Corvan II and an Orion base", () => {
  const S = newGame({ seed: "s" }), k = Object.values(S.systems).map((s) => s.kind);
  assert.equal(k.filter((x) => x === "starbase").length, 1);
  assert.equal(k.filter((x) => x === "colony").length, 3);
  assert.equal(S.systems[S.corvan].name, "Corvan II");
  assert.ok(Object.values(S.enemies).some((e) => e.type === "orionBase"));
  assert.equal(S.orders[0].title, "The Silence at Corvan II");
});
test("targets add the officer's advantage and the ship's sensors", () => {
  const S = newGame({ seed: "t" });
  assert.equal(target(S, "sevek", "Sensors").total, 14 + 1);                       // sensors 3: +1
  assert.equal(target(S, "sevek", "Physical Sciences", { action: "investigate" }).total, 16 + 2);  // Eidetic Recall
  S.crew.sevek.inj = 2; assert.equal(target(S, "sevek", "Physical Sciences").total, 14);
});
test("moving costs moves, and a turn refills them", () => {
  const S = newGame({ seed: "m" });
  const far = Object.entries(reachable(S)).find(([, c]) => c === 3);
  assert.ok(far); moveTo(S, "pelion", far[0]); assert.equal(S.pelion.mp, 0);
  assert.ok(moveTo(S, "pelion", S.systems[S.starbase].at).error);
  endTurn(S); assert.equal(S.pelion.mp, 3);
});
test("one action a turn, with a reroll for a Duty point", () => {
  const S = newGame({ seed: "a" });
  const r = attempt(S, "pelion", "sweep");
  assert.ok(r.ok);
  if (S.pending) { const d = S.crew[S.pending.officer].duty; resolve(S, true); if (S.pending) resolve(S, false); assert.ok(S.crew[Object.keys(S.crew).find((k) => S.crew[k].duty < 2)] || d === 0); }
  assert.ok(attempt(S, "pelion", "sweep").error);
});
test("five Starfleet Command boxes end the game", () => {
  const S = newGame({ seed: "c" }); markCommand(S, 5, "test"); assert.equal(S.over.win, false);
});
test("a battle runs to an end and the Pelion's numbers come from the bridge crew", () => {
  const S = newGame({ seed: "b" });
  const e = Object.values(S.enemies).find((x) => x.type === "orion");
  e.at = S.pelion.at; startBattle(S, e.id, "pelion");
  assert.equal(battleStats(S).gun, 16);   // Reyes, Phasers 16
  for (let i = 0; i < 20 && !S.battle.over; i++) exchange(S, { shields: true, phasers: true, torps: true });
  assert.ok(S.battle.over); closeBattle(S); assert.equal(S.battle, null);
});
test("Corvan II: the raider hides behind the moon until an active sweep finds it; the pull waits for a sweep of the ruins", () => {
  const S = newGame({ seed: "cv" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  assert.equal(S.event, null);                                         // passive sensors: nothing
  assert.equal(S.arc.stage, "orbit");
  assert.ok(!visibleEnemies(S).some((e) => e.goal === "arc"));
  for (let i = 0; i < 20 && !S.event; i++) { S.tried = {}; for (const id in S.crew) S.crew[id].acted = false; attempt(S, "pelion", "sweep"); if (S.pending) resolve(S, false); }
  assert.equal(S.event.kind, "arc-arrive");                            // found, the raider hails
  assert.equal(S.arc.stage, "orbit");                                  // a sweep of space doesn't start the pull
  let guard = 0;
  while ((S.event || S.battle) && guard++ < 50) {
    if (S.event && S.event.kind === "arc-arrive") chooseEvent(S, "warn");
    else if (S.battle) { if (S.battle.over) closeBattle(S); else exchange(S, { shields: true, phasers: true, torps: true }); }
    else dismissEvent(S);
  }
  S.tried = {}; for (const id in S.crew) S.crew[id].acted = false;
  // Gone, the raider leaves the Pelion in orbit: nothing happens below until the sensors sweep the ruins.
  assert.equal(S.arc.stage, "orbit");
  assert.equal(S.event, null);
  assert.ok(!actionsFor(S).some((a) => a.arc === "clue-logs"));
  const r = attempt(S, "pelion", "arc", { arc: "scan" }); if (S.pending) resolve(S, false);
  assert.ok(r.ok);
  assert.equal(S.arc.stage, "pull");
  assert.equal(S.event.title, "The pull");
  // No clues until an away team beams down; then only the away team can work them.
  assert.ok(!actionsFor(S).some((a) => a.arc === "clue-logs"));
  assert.ok(actionsFor(S).some((a) => a.id === "beam"));
  assert.ok(beamDown(S, ["sevek"]).error);
  assert.ok(beamDown(S, ["vessik", "reyes"]).ok);
  const clue = actionsFor(S).find((a) => a.arc === "clue-logs");
  assert.deepEqual(clue.who, ["vessik", "reyes"]);
  S.event = null; S.pelion.acted = false;
  attempt(S, "pelion", "arc", { arc: "clue-logs", officer: "rrinn", skill: "Computers" });
  const p = S.pending || null, last = S.log[S.log.length - 1].text;
  assert.ok(p ? p.officer !== "rrinn" : !last.startsWith("Rrinn"));
});
test("the score counts", () => { const S = newGame({ seed: "sc" }); assert.equal(score(S).total, 15); });
test("every discovery is in the log, and trimming never drops one", async () => {
  const { log, storyEvent } = await import("../src/game.js");
  const S = newGame({ seed: "log" });
  storyEvent(S, "The pull", "Something below draws on the ship's power.");
  assert.ok(S.log.some((l) => l.kind === "discovery" && l.text.startsWith("The pull: Something below")));
  for (let i = 0; i < 500; i++) log(S, "noise " + i);
  assert.ok(S.log.some((l) => l.text.startsWith("The pull")));
  assert.ok(S.log.length <= 301);
});

test("left undetected, the raider comes around the moon firing before the day is out", () => {
  const S = newGame({ seed: "sw" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  assert.equal(S.battle, null);
  endTurn(S);                                                          // no sweep on the day of arrival
  assert.ok(S.battle);
  assert.equal(S.enemies[S.battle.enemy].goal, "arc");
});
test("the target an action card shows is the target the roll uses, with or without an assist", async () => {
  const { rollTarget } = await import("../src/game.js");
  const S = newGame({ seed: "pv" });
  const a = actionsFor(S).find((x) => x.id === "sweep");
  assert.equal(rollTarget(S, a, "rrinn", "Computers").total, 18 - 2 + 2);          // Computers 18, hunting the hidden −2, Keen Hearing +2
  assert.equal(rollTarget(S, a, "rrinn", "Computers", true).total, 18 - 2 + 2 + 1); // and a helper, if asked for
  attempt(S, "pelion", "sweep", { officer: "rrinn", skill: "Computers", assist: true });
  const shown = 19;
  if (S.pending) assert.equal(S.pending.target.total, shown);
  else assert.ok(S.log.some((l) => l.text.includes(`against ${shown}`)));
  assert.ok(S.crew.rrinn.acted);
  assert.equal(Object.values(S.crew).filter((c) => c.acted).length, 2);           // the helper used their turn too
});
test("every officer acts once a turn; each action can be tried once a turn", () => {
  const S = newGame({ seed: "op" });
  S.pelion.sys.engines = 1;   // something else to do: repairs
  attempt(S, "pelion", "sweep", { officer: "rrinn", skill: "Computers" }); if (S.pending) resolve(S, false);
  assert.ok(attempt(S, "pelion", "sweep").error);                                  // the sweep has been tried this turn
  assert.ok(S.crew.rrinn.acted && !S.crew.grath.acted);
  const r = attempt(S, "pelion", "repair", { officer: "grath", skill: "Engineering" });   // but another officer can do something else
  assert.ok(!r.error, r.error); if (S.pending) resolve(S, false);
  assert.ok(S.crew.grath.acted);
  endTurn(S);
  assert.ok(Object.values(S.crew).every((c) => !c.acted));                         // a new turn: everyone again
});
test("with the away team down, they work the surface and the bridge crew runs the ship", () => {
  const S = newGame({ seed: "aw" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  const e = Object.values(S.enemies).find((x) => x.goal === "arc"); delete S.enemies[e.id]; S.event = null; dismissEvent(S);
  attempt(S, "pelion", "arc", { arc: "scan" }); if (S.pending) resolve(S, false); S.event = null; S.eventQueue = [];
  beamDown(S, ["sevek", "vessik", "reyes", "rrinn"]);
  const acts = actionsFor(S);
  const clue = acts.find((a) => a.arc === "clue-logs"), sweep = acts.find((a) => a.id === "sweep");
  assert.deepEqual(clue.who, ["sevek", "vessik", "reyes", "rrinn"]);              // the surface: the away team only
  assert.ok(sweep && sweep.bridge);
  assert.deepEqual(sweep.who, ["shvari", "grath"]);                                // the ship: whoever stayed aboard
  beamDown(S, []);
  assert.ok(!actionsFor(S).find((a) => a.id === "sweep").bridge);                  // beamed back up: anyone again
});
test("what's in the ruins is earned: Sevek's theory needs three clues, and only then reveals the caretaker", () => {
  const S = newGame({ seed: "th" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  const e = Object.values(S.enemies).find((x) => x.goal === "arc"); delete S.enemies[e.id]; S.event = null; dismissEvent(S);
  attempt(S, "pelion", "arc", { arc: "scan" }); if (S.pending) resolve(S, false); S.event = null; S.eventQueue = [];
  beamDown(S, ["sevek", "vessik", "reyes", "rrinn"]);
  const theory = () => actionsFor(S).find((a) => a.arc === "theory");
  assert.ok(theory().why && /evidence/.test(theory().why));          // not after the scans alone
  S.arc.clues = { logs: true, bunks: true }; S.arc.clock = 2;
  assert.ok(theory().why);                                             // two clues: still not enough
  S.arc.clues.energy = true; S.arc.clock = 3; S.crew.sevek.acted = false; S.tried = {};
  assert.equal(theory().why, null);                                    // three: Sevek can try
  assert.deepEqual(theory().who, ["sevek"]);
  for (let i = 0; i < 20 && S.arc.stage === "pull"; i++) { S.tried = {}; S.crew.sevek.acted = false; S.event = null; S.arc.countdown = 0; attempt(S, "pelion", "arc", { arc: "theory" }); if (S.pending) resolve(S, false); }
  assert.equal(S.arc.stage, "orions");
  assert.ok(S.arc.theory);
  const th = S.log.find((l) => l.text.includes("Sevek's theory: a caretaker, not a weapon"));
  assert.ok(th);
  assert.ok(!/stasis/i.test(th.text));                                 // a theory can't know about the pods
  assert.ok(!S.arc.podsSeen);
  for (let i = 0; i < 20 && S.arc.stage === "orions"; i++) { S.tried = {}; for (const id in S.crew) { S.crew[id].acted = false; S.crew[id].inj = 0; } S.event = null; S.eventQueue = []; S.arc.countdown = 0; attempt(S, "pelion", "arc", { arc: "stun" }); if (S.pending) resolve(S, false); }
  assert.ok(S.arc.podsSeen);                                           // seen with their own eyes, past the Orions
  assert.ok(S.log.some((l) => l.text.includes("eight stasis pods")));
});
test("with the away team down, a turn is an hour: the week waits, the Countdown runs, the ship stays", async () => {
  const { hourly } = await import("../src/game.js");
  const S = newGame({ seed: "hr" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  const e = Object.values(S.enemies).find((x) => x.goal === "arc"); delete S.enemies[e.id];
  attempt(S, "pelion", "arc", { arc: "scan" }); if (S.pending) resolve(S, false); S.event = null; S.eventQueue = [];
  beamDown(S, ["sevek", "vessik", "reyes", "rrinn"]);
  assert.ok(hourly(S));
  const turn = S.turn, cd = S.arc.countdown, supplies = S.supplies;
  S.crew.rrinn.acted = true;
  endTurn(S);
  assert.equal(S.turn, turn);                    // the week hasn't moved
  assert.equal(S.hour, 1);
  assert.equal(S.arc.countdown, cd + 1);         // the drain, by the hour
  assert.equal(S.supplies, supplies);            // no week's income
  assert.ok(!S.crew.rrinn.acted);                // everyone acts again
  assert.ok(moveTo(S, "pelion", S.systems[S.starbase].at).error);   // not without the away team
  beamDown(S, []);
  assert.ok(!hourly(S));
  endTurn(S);
  assert.equal(S.turn, turn + 1);                // back aboard: weeks again
});
test("the Corvan II raider, chased off, leaves for good", () => {
  let checked = 0;
  for (let n = 0; n < 40 && checked < 3; n++) {
    const S = newGame({ seed: "chase" + n });
    S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
    const e = Object.values(S.enemies).find((x) => x.arcRaider); e.hidden = false;
    startBattle(S, e.id, "pelion");
    for (let i = 0; i < 20 && !S.battle.over; i++) exchange(S, { shields: true, phasers: true });
    const how = S.battle.over; closeBattle(S);
    if (how !== "fled" && how !== "hailed") continue;
    checked++;
    assert.ok(!S.enemies[e.id]);
    assert.ok(!actionsFor(S).some((a) => a.id === "engage" || a.id === "hail"));
  }
  assert.ok(checked > 0);
});
test("finished orders are kept, with how they ended", async () => {
  const { completeOrder, newOrder } = await import("../src/game.js");
  const S = newGame({ seed: "hist" });
  const o = newOrder(S) || newOrder(S);
  completeOrder(S, o, true);
  completeOrder(S, S.orders.find((x) => x.arc), false, "Too late.");
  assert.deepEqual(S.history.map((h) => h.result), ["done", "failed"]);
  assert.equal(S.history[1].how, "Too late.");
  assert.ok(!/Neutral Zone near the Neutral Zone/.test(o.title));
});
test("Starfleet bearings: 400 degrees, heading clockwise from galactic north, with a mark for the z axis", async () => {
  const { navBearing } = await import("../src/game.js");
  const S = newGame({ seed: "nav" });
  assert.equal(navBearing(S, "0,0", "1,-2").heading, 0);     // straight up the map
  assert.equal(navBearing(S, "0,0", "1,0").heading, 100);    // east
  assert.equal(navBearing(S, "0,0", "-1,2").heading, 200);   // south
  assert.equal(navBearing(S, "0,0", "-1,0").heading, 300);   // west
  const b = navBearing(S, "0,0", "3,-1");
  assert.match(b.text, /^bearing \d{3} mark \d{3}$/);
  assert.ok(b.mark < 100 || b.mark > 300);                   // a climb or a dip, never past the vertical
});
