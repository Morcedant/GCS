import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, check, actionsFor, attempt, resolve, moveTo, reachable, target, markCommand, score, visibleEnemies, setWarp, maxWarp, lyPerWeek, isUrgent, CRUISE_WARP, newOrder, completeOrder, acceptOrder, missionChoices, chooseMission } from "../src/game.js";
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
test("the sector has a starbase, four colonies, Corvan II and an Orion base", () => {
  const S = newGame({ seed: "s" }), k = Object.values(S.systems).map((s) => s.kind);
  assert.equal(k.filter((x) => x === "starbase").length, 1);
  assert.equal(k.filter((x) => x === "colony").length, 4);
  assert.equal(S.systems[S.corvan].name, "Corvan II");
  assert.ok(Object.values(S.enemies).some((e) => e.type === "orionBase"));
  assert.equal(S.orders[0].title, "The Silence at Corvan II");
});
test("targets add the officer's advantage and the ship's sensors", () => {
  const S = newGame({ seed: "t" });
  assert.equal(target(S, "sevek", "Sensors").total, 14 + 1 + 1);                   // sensors 3: +1; a point of power to the sensors: +1
  S.pelion.alloc.sensors = 0; assert.equal(target(S, "sevek", "Sensors").total, 14 + 1);
  assert.equal(target(S, "sevek", "Physical Sciences", { action: "investigate" }).total, 16 + 2);  // Eidetic Recall
  S.crew.sevek.inj = 2; assert.equal(target(S, "sevek", "Physical Sciences").total, 14);
});
test("warp: v = W³ × c; a hex is a light-year, a turn a week; above cruising the engines strain", () => {
  const S = newGame({ seed: "m" });
  assert.equal(S.pelion.warp, CRUISE_WARP);
  assert.ok(Math.abs(lyPerWeek(6) - 7 * 216 / 365.25) < 1e-9);                  // warp 6: 216c, about 4.1 ly a week
  assert.ok(Math.abs(lyPerWeek(8) - 7 * 512 / 365.25) < 1e-9);                  // warp 8: 512c, about 9.8
  assert.equal(Math.floor(S.pelion.mp), 4);
  const far = Object.entries(reachable(S)).find(([, c]) => c === 4);
  assert.ok(far); moveTo(S, "pelion", far[0]);
  assert.ok(S.pelion.mp < 1 && S.pelion.days < 7 * 0.05);                      // most of the week used up
  assert.ok(moveTo(S, "pelion", S.systems[S.starbase].at).error);
  setWarp(S, 8); assert.ok(S.pelion.mp > 0 && S.pelion.mp < 1);               // same days left, more distance
  setWarp(S, 0); assert.equal(S.pelion.mp, 0);                                   // impulse: no light-years
  setWarp(S, 12); assert.equal(S.pelion.warp, 8);                                // the emergency maximum
  S.pelion.sys.engines = 1; assert.equal(maxWarp(S), 6);
  S.pelion.sys.engines = 0; setWarp(S, 8);
  endTurn(S);
  assert.ok(S.pelion.mp >= 9.8 - 1e-9);                                          // a new week at warp 8
  // The first orders are urgent; their deadline assumes maximum warp.
  assert.ok(isUrgent(S.orders.find((o) => o.arc)));
  const T = newGame({ seed: "strain" }); setWarp(T, 8);
  moveTo(T, "pelion", Object.entries(reachable(T)).find(([, c]) => c === 1)[0]);
  endTurn(T);
  assert.ok(T.log.some((l) => /Warp 8 this week/.test(l.text)));                // the strain check
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
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at); if (S.event && S.event.kind === "story") { assert.ok(/orbit/i.test(S.event.title)); S.event = null; S.eventQueue = []; }
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
  assert.ok([S.event].concat(S.eventQueue || []).some((e) => e && e.title === "The pull"));   // after the sweep's own scene
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
test("the score counts", () => { const S = newGame({ seed: "sc" }); assert.equal(score(S).total, 20); });   // four colonies safe
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
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at); if (S.event && S.event.kind === "story") { assert.ok(/orbit/i.test(S.event.title)); S.event = null; S.eventQueue = []; }
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
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at); if (S.event && S.event.kind === "story") { assert.ok(/orbit/i.test(S.event.title)); S.event = null; S.eventQueue = []; }
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
test("what's in the ruins is earned: three clues and Sevek forms his theory, no roll; the caretaker only when it speaks", () => {
  const S = newGame({ seed: "th" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at); if (S.event && S.event.kind === "story") { assert.ok(/orbit/i.test(S.event.title)); S.event = null; S.eventQueue = []; }
  const e = Object.values(S.enemies).find((x) => x.goal === "arc"); delete S.enemies[e.id]; S.event = null; dismissEvent(S);
  attempt(S, "pelion", "arc", { arc: "scan" }); if (S.pending) resolve(S, false); S.event = null; S.eventQueue = [];
  beamDown(S, ["sevek", "vessik", "reyes", "rrinn"]);
  const clue = (k) => { for (let i = 0; i < 20 && !S.arc.clues[k]; i++) { S.tried = {}; for (const id in S.crew) S.crew[id].acted = false; S.event = null; S.eventQueue = []; S.arc.countdown = 0; attempt(S, "pelion", "arc", { arc: "clue-" + k }); if (S.pending) resolve(S, false); } };
  assert.ok(!actionsFor(S).some((a) => a.arc === "theory"));          // no roll for the theory: the evidence earns it
  clue("logs"); clue("bunks");
  assert.equal(S.arc.stage, "pull"); assert.ok(!S.arc.theory);        // two clues: not enough
  clue("energy");                                                      // the third: Sevek's theory, at once
  assert.equal(S.arc.stage, "orions");
  assert.ok(S.arc.theory);
  const th = S.log.find((l) => l.text.includes("Sevek's theory: a guardian, not a weapon"));
  assert.ok(th);
  assert.ok(!/stasis/i.test(th.text));
  assert.ok(!S.log.some((l) => /caretaker/i.test(l.text)));            // not named until it speaks in the chamber                                 // a theory can't know about the pods
  assert.ok(!S.arc.podsSeen);
  for (let i = 0; i < 20 && S.arc.stage === "orions"; i++) { S.tried = {}; for (const id in S.crew) { S.crew[id].acted = false; S.crew[id].inj = 0; } S.event = null; S.eventQueue = []; S.arc.countdown = 0; attempt(S, "pelion", "arc", { arc: "stun" }); if (S.pending) resolve(S, false); }
  assert.ok(S.arc.podsSeen);                                           // seen with their own eyes, past the Orions
  assert.ok(S.log.some((l) => l.text.includes("eight stasis pods")));
  assert.ok(S.log.some((l) => l.text.includes("eleven thousand of its years")));   // the full speech
  // The paradox: Sevek alone, contested exchanges until one side takes two.
  const rs = actionsFor(S).find((a) => a.arc === "reason");
  assert.deepEqual(rs.who, ["sevek"]); assert.ok(rs.paradox);
  for (let i = 0; i < 30 && S.arc.stage === "caretaker"; i++) { S.tried = {}; S.crew.sevek.acted = false; S.event = null; S.eventQueue = []; S.arc.countdown = 0; attempt(S, "pelion", "arc", { arc: "reason" }); if (S.pending) resolve(S, false); }
  // The scientists are free, but the orders aren't done until the Orion phasers are back.
  assert.equal(S.arc.stage, "phasers");
  assert.ok(S.orders.some((o) => o.arc));
  assert.ok(actionsFor(S).find((a) => a.arc === "phasers"));
  for (let i = 0; i < 30 && S.arc.stage === "phasers"; i++) { S.tried = {}; for (const id in S.crew) S.crew[id].acted = false; S.event = null; S.eventQueue = []; attempt(S, "pelion", "arc", { arc: "phasers" }); if (S.pending) resolve(S, false); }
  assert.equal(S.arc.stage, "done");
  assert.ok(S.arc.phasers);
  assert.ok(!S.orders.some((o) => o.arc));
  assert.ok(S.history.some((h) => /phasers recovered/.test(h.how || h.text || JSON.stringify(h))));
  assert.ok(S.log.some((l) => /Exchange 2, "Your makers": Sevek rolled .* the caretaker rolled/.test(l.text)));
});
test("with the away team down, a turn is an hour: the week waits, the Countdown runs, the ship stays", async () => {
  const { hourly } = await import("../src/game.js");
  const S = newGame({ seed: "hr" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at); if (S.event && S.event.kind === "story") { assert.ok(/orbit/i.test(S.event.title)); S.event = null; S.eventQueue = []; }
  const e = Object.values(S.enemies).find((x) => x.goal === "arc"); delete S.enemies[e.id];
  attempt(S, "pelion", "arc", { arc: "scan" }); if (S.pending) resolve(S, false); S.event = null; S.eventQueue = [];
  beamDown(S, ["sevek", "vessik", "reyes", "rrinn"]); S.event = null; S.eventQueue = [];   // past the "Energize" scene
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
    S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at); if (S.event && S.event.kind === "story") { assert.ok(/orbit/i.test(S.event.title)); S.event = null; S.eventQueue = []; }
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
test("Starfleet flight paths: three values in 400 degrees, relative to the ship's bow; positions from the sector's center", async () => {
  const { navBearing, position } = await import("../src/game.js");
  const S = newGame({ seed: "nav" });
  const east = 0;                                               // facing the hex side toward the east
  assert.equal(navBearing(S, "0,0", "3,0", east).bearing, 0);   // dead ahead
  assert.equal(navBearing(S, "0,0", "-3,0", east).bearing, 200); // astern
  assert.equal(navBearing(S, "0,0", "1,-2", east).bearing, 300); // galactic north is to port when facing east
  assert.equal(navBearing(S, "0,0", "-1,2", east).bearing, 100); // and south to starboard
  assert.equal(navBearing(S, "0,0", "1,-2", 2).bearing, 33);     // facing north-west, north is a little to starboard
  assert.match(navBearing(S, "0,0", "2,-1").text, /^\d{3} mark \d+ mark \d+$/);
  const c = position(S, "0,0");
  assert.ok(Math.abs(c.x) < 0.05 && Math.abs(c.y) < 0.05);   // the center is the origin
  assert.ok(c.fromSol > 150 && c.fromSol < 260);
  assert.ok(position(S, "1,0").x > 0.99 && position(S, "1,0").x < 1.01);              // a light-year a hex
  assert.match(c.text, /ly from the sector's center · \d+ ly from Sector 001 \(Sol\)$/);
});
test("orders: a backlog when two are under way, a Mission Success report when one is done", () => {
  const S = newGame({ seed: "bk" });
  assert.equal(S.backlog.length, 3);                                 // orders already waiting behind Corvan II
  S.orders = S.orders.filter((o) => !o.arc); S.arc.stage = "done"; S.backlog = [];   // past the first mission
  S.turn = 4; const a = newOrder(S), b = newOrder(S), c = newOrder(S);
  assert.equal(S.orders.length, 2); assert.equal(S.backlog.length, 1); assert.equal(S.backlog[0], c);
  a.have = a.segs; completeOrder(S, a, true);
  assert.equal(S.event.kind, "success"); assert.equal(S.event.title, a.title);
  assert.ok(S.event.rewards.some((r) => /supplies/.test(r)));
  assert.equal(S.backlog.length, 0); assert.ok(S.orders.includes(c));        // the backlog moves up
  assert.deepEqual(S.event.next, [c.title]);
  assert.ok(c.deadline > S.turn);
  const d = newOrder(S); assert.ok(d.backlog);
  assert.ok(acceptOrder(S, d.id).ok); assert.equal(S.orders.length, 3);   // taken on at once
});
test("Starfleet Command: three orders carried out in a row clear a box; a failure starts the run again", () => {
  const S = newGame({ seed: "streak" });
  S.orders = []; S.backlog = []; S.arc.stage = "done"; S.command = 2;
  const ok = () => { const o = newOrder(S); S.event = null; S.eventQueue = []; o.twist = null; completeOrder(S, o, true); S.event = null; S.eventQueue = []; };
  ok(); ok(); assert.equal(S.command, 2); assert.equal(S.streak, 2);
  const f = newOrder(S); completeOrder(S, f, false); assert.equal(S.command, 3); assert.equal(S.streak, 0);
  ok(); ok(); ok(); assert.equal(S.command, 2); assert.equal(S.streak, 0);
});
test("every order type has a story: arrival, a scene for each step, a decision, and what the decision does", async () => {
  const { STORIES } = await import("../src/stories.js");
  const { MISSIONS } = await import("../src/data.js");
  for (const m of MISSIONS) { const st = STORIES[m.text]; assert.ok(st, m.text); assert.equal(st.steps.length, m.segs, m.text); assert.equal(st.choice.options.filter((x) => !x.needs).length, 2); }
  const S = newGame({ seed: "story" });
  S.orders = []; S.backlog = []; S.arc.stage = "done";
  const o = newOrder(S); S.event = null; S.eventQueue = [];
  assert.ok(o.story && o.text && !/\{/.test(o.text));
  S.pelion.mp = 99; moveTo(S, "pelion", o.at);
  assert.ok(S.event && /arrival/.test(S.event.title)); S.event = null; S.eventQueue = [];
  o.have = o.segs - 1;
  for (let i = 0; i < 30 && S.orders.includes(o) && !(S.event && S.event.kind === "mission-choice"); i++) { S.tried = {}; for (const id in S.crew) S.crew[id].acted = false; S.event = null; S.eventQueue = []; attempt(S, "pelion", "mission", { order: o.id }); if (S.pending) resolve(S, false); if (S.eventQueue && S.eventQueue.length) { const c = [S.event].concat(S.eventQueue).find((e) => e && e.kind === "mission-choice"); if (c) S.event = c; } }
  assert.equal(S.event.kind, "mission-choice");
  const c = missionChoices(S, S.event); assert.equal(c.options.length, 2);
  const before = S.done;
  assert.ok(chooseMission(S, o.id, c.options[1].id).ok);
  assert.equal(S.done, before + 1); assert.ok(!S.orders.includes(o));
  const rep = [S.event].concat(S.eventQueue).find((e) => e && e.kind === "success");
  assert.ok(rep && rep.choice && rep.rewards.some((r) => /decision/.test(r)));
});
test("the campaign: Corvan II opens it, each order adds a thread, six lead to the Makers' Gate, and the Gate ends it", async () => {
  const { CAMPAIGN } = await import("../src/stories.js");
  const S = newGame({ seed: "camp" });
  const arc = S.orders.find((o) => o.arc); S.arc.stage = "done"; completeOrder(S, arc, true, "Done."); S.event = null; S.eventQueue = [];
  assert.ok(S.campaign.beats.includes(0));
  S.orders = []; S.backlog = [];
  // Ordinary orders turn up nothing; orders that are part of the campaign turn up a thread each.
  const plain = newOrder(S); plain.campaign = false; S.event = null; S.eventQueue = []; completeOrder(S, plain, true); S.event = null; S.eventQueue = [];
  assert.equal(S.campaign.threads.length, 0);
  const { STORIES } = await import("../src/stories.js");
  for (let i = 0; i < 40 && S.campaign.threads.length < CAMPAIGN.finaleAt; i++) { const o = newOrder(S); S.event = null; S.eventQueue = []; if (!STORIES[o.story].thread) { S.orders = S.orders.filter((x) => x !== o); S.backlog = []; continue; } o.campaign = true; completeOrder(S, o, true); S.event = null; S.eventQueue = []; }   // R&D's prototypes have no thread to find
  assert.equal(S.campaign.threads.length, CAMPAIGN.finaleAt);
  assert.deepEqual(S.campaign.beats.sort(), [0, 2, 4, 6]);
  const gate = S.orders.find((o) => o.finale); assert.ok(gate && gate.urgent && gate.place === "the Makers' Gate");
  gate.have = gate.segs; S.event = { kind: "mission-choice", orderId: gate.id };
  assert.ok(chooseMission(S, gate.id, "guard").ok);
  assert.equal(S.campaign.over, "guard"); assert.ok(S.records.includes("makers"));
  assert.ok(score(S).parts.some(([n, v]) => /the Gate/.test(n) && v === 25));
});
test("the prologue shows nothing of the campaign: no reasons, no threads, until Corvan II is over", async () => {
  const { orderReason, campaignOpen } = await import("../src/game.js");
  const S = newGame({ seed: "pro" });
  assert.ok(!campaignOpen(S));
  for (const o of S.backlog) { assert.ok(orderReason(S, o)); assert.ok(!/Maker|caretaker|Kor'vath|dug up/i.test(orderReason(S, o))); }   // their own reasons only
  const o = S.backlog[0]; o.campaign = true; acceptOrder(S, o.id); S.event = null; S.eventQueue = []; completeOrder(S, o, true); S.event = null; S.eventQueue = [];
  assert.equal(S.campaign.threads.length, 0);                 // done during the prologue: no thread
  assert.ok(!S.log.some((l) => /Maker|caretaker|Kor'vath/i.test(l.text)));
  const arc = S.orders.find((x) => x.arc); S.arc.stage = "done"; completeOrder(S, arc, true, "Done.");
  assert.ok(campaignOpen(S));
  const tied = S.backlog[0] || S.orders.find((x) => !x.arc); tied.campaign = true;
  const { STORIES } = await import("../src/stories.js");
  assert.equal(orderReason(S, tied), STORIES[tied.story].why);              // part of the campaign: the campaign's reason
  tied.campaign = false; assert.equal(orderReason(S, tied), STORIES[tied.story].reason);   // ordinary work: its own
});
test("a successful technology trial leaves a cloak inverter on the Pelion: +2 sweeps; the full-power run reaches 5 ly", async () => {
  const { sweepRange } = await import("../src/game.js");
  for (const [choice, range] of [["shut", 3], ["push", 5]]) {
    const S = newGame({ seed: "inv" + choice });
    S.orders = []; S.backlog = []; S.arc.stage = "done";
    let o; for (let i = 0; i < 200 && !(o && o.story === "Test experimental technology"); i++) { o = newOrder(S); S.orders = []; }
    S.orders = [o]; S.event = { kind: "mission-choice", orderId: o.id }; o.have = o.segs;
    assert.equal(S.pelion.refits.inverter, undefined);
    assert.ok(chooseMission(S, o.id, choice).ok);
    assert.ok(S.pelion.refits.inverter >= 1); assert.equal(sweepRange(S), range);
    const sweep = actionsFor(S).find((a) => a.id === "sweep");
    assert.ok(target(S, "rrinn", "Computers", { action: "sweep" }).parts.some(([n, v]) => n === "Cloak inverter" && v === 2));
    assert.match(sweep.blurb, new RegExp(`within ${range} light-years`));
  }
});
test("the cloak inverter, later: it spots a cloaked bird-of-prey on a strike, no ambush, and the patrol can shadow it home", async () => {
  const { cloakContact, cloakChoices, chooseCloak, spawnEnemy } = await import("../src/game.js");
  const { startBattle } = await import("../src/combat.js");
  const S = newGame({ seed: "ghost" }); S.event = null; S.eventQueue = [];
  const tgt = Object.values(S.systems).find((s) => s.kind === "colony" || s.kind === "member");
  const e = spawnEnemy(S, "rbop", S.pelion.at, { goal: "strike", target: tgt.at, hostile: true, cloaked: true });
  cloakContact(S, e); assert.equal(S.event, null);                       // no inverter: unseen
  S.pelion.refits.inverter = 1; cloakContact(S, e);
  assert.equal(S.event.kind, "cloak-contact"); assert.equal(cloakChoices(S, S.event).options.length, 3);
  chooseCloak(S, "warn"); assert.equal(S.event.title, "Word ahead"); assert.equal(tgt.alerted, S.turn); S.event = null;
  const f = spawnEnemy(S, "rbop", S.pelion.at, { goal: "strike", target: tgt.at, hostile: true, cloaked: true });
  startBattle(S, f.id, "enemy"); assert.equal(S.battle.ambush, false);   // the inverter sees it coming
});
test("the patrol's third choice, shadowing the Romulan ship home, needs the cloak inverter", () => {
  const S = newGame({ seed: "shadow" }); S.orders = []; S.backlog = []; S.arc.stage = "done";
  let o; for (let i = 0; i < 300 && !(o && o.story === "Patrol the Neutral Zone border"); i++) { o = newOrder(S); S.orders = []; }
  S.orders = [o]; o.have = o.segs; const ev = { kind: "mission-choice", orderId: o.id };
  assert.equal(missionChoices(S, ev).options.length, 2);
  assert.ok(chooseMission(S, o.id, "shadow").error);
  S.pelion.refits.inverter = 1; assert.equal(missionChoices(S, ev).options.length, 3);
  S.event = ev; assert.ok(chooseMission(S, o.id, "shadow").ok);
});
test("tension: the diggers race the Pelion for the sites, complications mid-mission, and the Empire's warnings", async () => {
  const { complicationChoices, chooseComplication, campaignTick } = await import("../src/game.js");
  const S = newGame({ seed: "race" });
  const arc = S.orders.find((o) => o.arc); S.arc.stage = "done"; completeOrder(S, arc, true, "Done."); S.event = null; S.eventQueue = [];
  campaignTick(S); const first = S.campaign.korvathNext; assert.ok(first > S.turn);
  const t0 = S.tension; S.turn = first; campaignTick(S);
  assert.equal(S.campaign.korvath, 1); assert.equal(S.tension, t0 + 1);
  assert.ok([S.event].concat(S.eventQueue).some((e) => e && /another site falls/.test(e.title)));
  S.event = null; S.eventQueue = [];
  // A thread sets them back two weeks.
  S.orders = []; S.backlog = []; const before = S.campaign.korvathNext;
  const o = newOrder(S); o.campaign = true; S.event = null; S.eventQueue = []; completeOrder(S, o, true); S.event = null; S.eventQueue = [];
  assert.equal(S.campaign.korvathNext, before + 2);
  // A complication: falling back costs a week; pressing on rolls against the opposition.
  const p = newOrder(S); S.event = null; S.eventQueue = []; S.orders = [p]; p.have = 1;
  S.event = { kind: "complication", orderId: p.id }; const c = complicationChoices(S, S.event); assert.equal(c.options.length, 2);
  const d = p.deadline; chooseComplication(S, "back"); assert.equal(p.deadline, d - 1);
  S.event = { kind: "complication", orderId: p.id }; chooseComplication(S, "press");
  assert.ok(S.log.some((l) => /opposing/.test(l.text)));
});
test("Act II says how the Pelion knows: the threads it found, and a source from what happened on Corvan II", () => {
  for (const [d, re] of [["prisoners", /brig/], ["killed", /cutting gear/], [undefined, /assay/]]) {
    const S = newGame({ seed: "act2" }); S.arc.stage = "done"; S.arc.diggers = d; S.campaign.beats = [0];
    S.orders = []; S.backlog = [];
    for (let i = 0; i < 2; i++) { const o = newOrder(S); o.campaign = true; S.event = null; S.eventQueue = []; completeOrder(S, o, true); }
    const ev = [S.event].concat(S.eventQueue || []).find((e) => e && /Act II/.test(e.title));
    assert.ok(ev && re.test(ev.text) && ev.text.includes(S.campaign.threads[0].text));
    assert.equal(S.campaign.beatText[2], ev.text);
  }
});
test("bringing a Romulan defector out angers the Romulans, not the Klingons", () => {
  const S = newGame({ seed: "defect" }); S.orders = []; S.backlog = []; S.arc.stage = "done";
  let o; for (let i = 0; i < 300 && !(o && o.story === "Carry a message across the Neutral Zone"); i++) { o = newOrder(S); S.orders = []; }
  S.orders = [o]; o.have = o.segs; S.event = { kind: "mission-choice", orderId: o.id };
  const t = S.tension, rb = Object.values(S.enemies).filter((e) => e.type === "rbop" && e.goal === "strike").length;
  assert.ok(chooseMission(S, o.id, "take").ok);
  assert.equal(S.tension, t);                                                        // the Klingons don't care
  const strikes = Object.values(S.enemies).filter((e) => e.type === "rbop" && e.goal === "strike");
  assert.equal(strikes.length, rb + 1);                                              // the Romulans answer
  assert.ok(Object.values(S.posts).some((p) => p.at === strikes.at(-1).target));     // at a listening post on the Zone
});
test("every order is unique: no story is told twice in a tour, and each has its own name", async () => {
  const { STORIES } = await import("../src/stories.js");
  const S = newGame({ seed: "unique" }); S.orders = []; S.backlog = []; S.arc.stage = "done";
  const seen = new Set(), titles = new Set();
  for (let i = 0; i < 60; i++) { const o = newOrder(S); S.orders = []; S.backlog = []; if (!o) continue; assert.ok(!seen.has(o.story), "repeated " + o.story); seen.add(o.story); titles.add(o.title); assert.ok(!/\{/.test(o.text)); }
  const all = Object.keys(STORIES).filter((k) => k !== "The Makers' Gate" && !STORIES[k].campaign);   // the later campaigns' stories wait for their campaigns
  assert.ok(seen.size >= all.length - 4);             // nearly every story, each once (a few may have nowhere to happen)
});

test("power: the engines take what the warp needs; the rest is shared out, 2 at most to a system", async () => {
  const { reactorPower, powerFree, setAlloc, warpPower } = await import("../src/game.js");
  const S = newGame({ seed: "power" }), P = S.pelion;
  assert.equal(reactorPower(S), 5);
  assert.equal(warpPower(6), 2); assert.equal(warpPower(8), 3); assert.equal(warpPower(4), 1);
  assert.equal(powerFree(S), 5 - 2 - 2);                     // warp 6, shields 1, sensors 1
  assert.ok(setAlloc(S, "labs", 1).ok); assert.equal(powerFree(S), 0);
  assert.ok(setAlloc(S, "ops", 1).error);                    // nothing left
  const r = setWarp(S, 8);                                     // warp 8 needs 3: the labs give theirs up
  assert.equal(P.warp, 8); assert.ok(r.took.includes("Science labs")); assert.equal(P.alloc.labs, 0);
  assert.ok(setAlloc(S, "sensors", 2).error);                 // warp 8, shields 1, sensors 1: all 5 spent
  setWarp(S, 6); assert.ok(setAlloc(S, "sensors", 5).ok); assert.equal(P.alloc.sensors, 2);   // 2 at most
});
test("stores: dilithium wears, failing crystals cost Power and warp; antimatter burns by the light-year", async () => {
  const { reactorPower, storesOf, addStore, consumeStores } = await import("../src/game.js");
  const S = newGame({ seed: "stores" }), st = storesOf(S);
  st.dilithium = 4; assert.equal(reactorPower(S), 4);
  st.dilithium = 2; assert.equal(reactorPower(S), 3); assert.equal(maxWarp(S), 6);
  st.dilithium = 0; assert.equal(maxWarp(S), 4);
  st.dilithium = 10; st.antimatter = 0; assert.equal(maxWarp(S), 2);
  st.antimatter = 20; S.pelion.lyWeek = 4; S.pelion.strain = 6; consumeStores(S);
  assert.equal(st.antimatter, 19); assert.equal(S.pelion.wear, 1);
  S.pelion.wear = 3; S.pelion.lyWeek = 9; S.pelion.strain = 8; consumeStores(S);
  assert.equal(st.antimatter, 15); assert.equal(st.dilithium, 9); assert.equal(st.spares, 5);   // emergency warp: 4 antimatter, 2 wear, a spare
  assert.equal(addStore(S, "spares", 99), 5);                   // within the limit
});
test("stores: bought at the starbase, refuelled on docking, mined from a seam, used by repairs", async () => {
  const { storesOf, buyStore, marketAt } = await import("../src/game.js");
  const S = newGame({ seed: "market" }), st = storesOf(S);
  st.dilithium = 5; S.supplies = 40;
  assert.equal(marketAt(S).name, "Starbase 23");
  assert.ok(buyStore(S, "dilithium", 3).ok); assert.equal(st.dilithium, 8); assert.equal(S.supplies, 40 - 12);
  // A seam: survey reveals it, and mining cuts crystals.
  const seam = Object.values(S.systems).find((s) => s.dilithium && s.id !== S.corvan);
  assert.ok(seam);
  S.pelion.at = seam.at; S.pelion.docked = false; seam.surveyed = true; st.dilithium = 3;
  const a = actionsFor(S).find((x) => x.id === "mine"); assert.ok(a && a.oppose);
  // Repairs use a crate of spares, and without spares they're harder.
  S.pelion.sys.engines = 1; st.spares = 0;
  const rep = actionsFor(S).find((x) => x.id === "repair"); assert.ok(rep);
  assert.ok(target(S, "grath", "Engineering", { action: "repair" }).parts.some((p) => p[0] === "No spare parts"));
});
test("open command: no end at fifty weeks; a tour's end can become open command", async () => {
  const { keepCommand, retire, checkEnd } = await import("../src/game.js");
  const O = newGame({ seed: "open", mode: "open" }); O.turn = 60; checkEnd(O); assert.equal(O.over, null);
  assert.ok(retire(O).ok); assert.ok(O.over.win);
  const T = newGame({ seed: "tour" }); T.turn = 51; checkEnd(T); assert.ok(T.over && T.over.win);
  assert.ok(keepCommand(T).ok); assert.equal(T.over, null); assert.equal(T.mode, "open");
});
test("after Watchers of the Void, a new campaign begins with its own order types, threads and finale", async () => {
  const { campaignTick, campaignDef, missionPool } = await import("../src/game.js");
  const { SERIES } = await import("../src/campaigns.js");
  const S = newGame({ seed: "series", mode: "open" }); S.arc.stage = "done"; S.orders = []; S.backlog = [];
  campaignTick(S); S.campaign.over = "close"; campaignTick(S);
  const n0 = missionPool(S).length;
  S.turn += 3; S.event = null; S.eventQueue = []; campaignTick(S);
  assert.equal(S.campaign.id, "coldfire"); assert.equal(campaignDef(S).title, SERIES[0].title);
  assert.ok(missionPool(S).length > n0);                                   // new kinds of orders
  assert.ok(S.campaign.beats.includes(0));
  let tied = 0;
  for (let i = 0; i < 40 && S.campaign.threads.length < SERIES[0].finaleAt; i++) {
    const o = newOrder(S); S.event = null; S.eventQueue = [];
    if (!o) break;
    if (o.campaign) { tied++; assert.equal(o.campaignId, "coldfire"); }
    S.orders = S.orders.filter((x) => x !== o); S.backlog = [];
    if (o.campaign) { S.orders.push(o); completeOrder(S, o, true); S.event = null; S.eventQueue = []; }
  }
  assert.ok(tied >= SERIES[0].finaleAt);
  const fin = S.orders.find((o) => o.finale);
  assert.ok(fin && fin.title === "The Quiet Engine" && fin.campaignId === "coldfire" && !/\{/.test(fin.text));
});
test("battle power: split as numbers, reinforced shields and overloaded phasers", () => {
  const S = newGame({ seed: "bpower" });
  const e = Object.values(S.enemies).find((x) => x.type === "orion");
  e.at = S.pelion.at; e.hidden = false; startBattle(S, e.id, "pelion");
  const L = exchange(S, { order: null, shields: 2, phasers: 2, torps: false, engines: 1 });
  assert.ok(Array.isArray(L) && L.length);
  assert.ok(S.battle.log.some((l) => /Overloaded phasers|Phasers|evade/.test(l)) || S.battle.over);
});

test("the Tholian Assembly: outposts in the southeast, webs that annex worlds, and a vessel to see the Pelion out", async () => {
  const { tholianSpace, annex, releaseWebs } = await import("../src/game.js");
  const { aiTurn } = await import("../src/ai.js");
  const S = newGame({ seed: "tholian" });
  const out = Object.values(S.systems).filter((s) => s.kind === "tholian");
  assert.equal(out.length, 3);
  assert.ok(tholianSpace(S, out[0].at));
  // A web-spinner goes out, spins for three weeks, and the world is Tholian territory.
  S.turn = 14; aiTurn(S);   // 14 % 9 === 5 on normal
  const e = Object.values(S.enemies).find((x) => x.power === "tholian" && x.goal === "web");
  assert.ok(e, "a web-spinner goes out");
  const tgt = Object.values(S.systems).find((s) => s.at === e.target);
  e.at = tgt.at; for (let i = 0; i < 3; i++) { S.turn++; aiTurn(S); }
  assert.equal(tgt.kind, "annexed");
  assert.equal(releaseWebs(S, "all"), 1); assert.notEqual(tgt.kind, "annexed");
  // Entering Tholian space without orders: a vessel comes.
  const near = Object.keys(S.hexes).find((k) => tholianSpace(S, k) && !S.sysAt[k]);
  S.pelion.at = near; S.pelion.days = 7; S.pelion.warp = 6; S.pelion.mp = 9;
  const n0 = Object.values(S.enemies).filter((x) => x.goal === "intercept").length;
  const step = Object.keys(S.hexes).find((k) => tholianSpace(S, k) && k !== near && Math.abs(Number(k.split(",")[0]) - Number(near.split(",")[0])) + Math.abs(Number(k.split(",")[1]) - Number(near.split(",")[1])) <= 1);
  if (step) { moveTo(S, "pelion", step); assert.equal(Object.values(S.enemies).filter((x) => x.goal === "intercept").length, n0 + 1); }
  const lost0 = S.lostTholian || 0, cmd0 = S.command;
  annex(S, Object.values(S.systems).find((s) => s.kind === "independent"));
  assert.equal(S.lostTholian, lost0 + 1); assert.equal(S.command, cmd0 + 1);   // an independent world lost to the webs marks a box
});
test("Found a colony: a habitable world, surveyed, becomes a Federation colony", () => {
  const S = newGame({ seed: "colony" });
  const w = Object.values(S.systems).find((s) => s.kind === "empty" && s.habitable);
  assert.ok(w);
  S.pelion.at = w.at; S.pelion.docked = false; w.surveyed = true; S.supplies = 50;
  const a = actionsFor(S).find((x) => x.id === "colonize"); assert.ok(a && !a.why);
  for (let i = 0; i < 20 && w.kind === "empty"; i++) {
    S.tried = {}; for (const id in S.crew) S.crew[id].acted = false; S.supplies = 50;
    const r = attempt(S, "pelion", "colonize"); if (S.pending) resolve(S, false);
    assert.ok(!r.error, r.error);
  }
  assert.equal(w.kind, "colony"); assert.equal(S.founded, 1);
});
test("the campaigns follow the frontier's rivals: Klingon, then Romulan, then Tholian", async () => {
  const { SERIES } = await import("../src/campaigns.js");
  assert.deepEqual(SERIES.map((c) => c.id), ["coldfire", "web"]);
  const { STORIES } = await import("../src/stories.js");
  for (const c of SERIES) assert.ok(STORIES[c.finale] && STORIES[c.finale].complication, c.finale);
  assert.equal(STORIES["The Shipyard at the Edge"], undefined);
});
test("R&D's prototypes: each tech order can leave a unique upgrade aboard", async () => {
  const { TECH_MISSIONS } = await import("../src/campaigns.js");
  const { STORIES } = await import("../src/stories.js");
  const { PROTOTYPES } = await import("../src/data.js");
  const { maxWarp, weekPower, storeMax, consumeStores, storesOf } = await import("../src/game.js");
  for (const m of TECH_MISSIONS) { const st = STORIES[m.text]; assert.ok(st && st.type === "Technology" && st.choice.options.some((x) => x.fx.refit && PROTOTYPES[x.fx.refit]), m.text); }
  const S = newGame({ seed: "proto" }), P = S.pelion;
  P.refits.coils = true; assert.equal(maxWarp(S), 9);
  P.refits.aux = true; assert.equal(weekPower(S), 6);
  P.refits.containment = true; assert.equal(storeMax(S, "antimatter"), 28);
  P.refits.regulator = true; P.wear = 5; P.lyWeek = 0; consumeStores(S); assert.equal(storesOf(S).dilithium, 10);   // wear 5 < 6: no crystal lost
  P.refits.transporter = true; assert.ok(target(S, "grath", "Engineering", { action: "aid" }).parts.some((p) => /Transporter/.test(p[0])));
});
