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
test("what's in the ruins is earned: three clues and Sevek forms his theory, no roll; the caretaker only when it speaks", () => {
  const S = newGame({ seed: "th" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
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
  for (const m of MISSIONS) { const st = STORIES[m.text]; assert.ok(st, m.text); assert.equal(st.steps.length, m.segs, m.text); assert.equal(st.choice.options.length, 2); }
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
  for (let i = 0; i < CAMPAIGN.finaleAt; i++) { const o = newOrder(S); o.campaign = true; S.event = null; S.eventQueue = []; completeOrder(S, o, true); S.event = null; S.eventQueue = []; }
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
