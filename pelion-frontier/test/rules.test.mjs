import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, check, actionsFor, attempt, resolve, moveTo, reachable, target, markCommand, score } from "../src/game.js";
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
test("Corvan II: arriving brings the raider's hail; the pull waits for a sensor sweep of the ruins", () => {
  const S = newGame({ seed: "cv" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  assert.equal(S.event.kind, "arc-arrive");
  let guard = 0;
  while (S.arc.stage === "travel" && guard++ < 50) {
    if (S.event && S.event.kind === "arc-arrive") chooseEvent(S, "warn");
    else if (S.battle) { if (S.battle.over) closeBattle(S); else exchange(S, { shields: true, phasers: true, torps: true }); }
  }
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

test("an ordinary sensor sweep over Corvan II also starts the pull", () => {
  const S = newGame({ seed: "sw" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  const e = Object.values(S.enemies).find((x) => x.goal === "arc"); delete S.enemies[e.id]; S.event = null;
  dismissEvent(S);
  assert.equal(S.arc.stage, "orbit");
  attempt(S, "pelion", "sweep"); if (S.pending) resolve(S, false);
  assert.equal(S.arc.stage, "pull");
});
test("the target an action card shows is the target the roll uses", async () => {
  const { rollTarget } = await import("../src/game.js");
  const S = newGame({ seed: "pv" });
  const a = actionsFor(S).find((x) => x.id === "sweep");
  const shown = rollTarget(S, a, "rrinn", "Computers");
  assert.equal(shown.total, 18 - 2 + 2 + 1);   // Computers 18, hunting the hidden −2, Keen Hearing +2, a helper +1
  attempt(S, "pelion", "sweep", { officer: "rrinn", skill: "Computers" });
  const p = S.pending || S.log.find((l) => l.text.startsWith("Rrinn"));
  if (S.pending) assert.equal(S.pending.target.total, shown.total);
  else assert.ok(p.text.includes(`against ${shown.total}`));
});
test("with the away team down, only the mission's actions are offered", () => {
  const S = newGame({ seed: "aw" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  const e = Object.values(S.enemies).find((x) => x.goal === "arc"); delete S.enemies[e.id]; S.event = null; dismissEvent(S);
  attempt(S, "pelion", "arc", { arc: "scan" }); if (S.pending) resolve(S, false); S.event = null; S.pelion.acted = false;
  assert.ok(actionsFor(S).some((a) => a.id === "sweep"));        // before beaming down, the ship's own actions are there
  beamDown(S, ["sevek", "vessik", "reyes", "rrinn"]);
  const ids = actionsFor(S).map((a) => a.id);
  assert.ok(ids.every((id) => ["arc", "engage", "hail"].includes(id)), ids.join(","));
  assert.ok(actionsFor(S).some((a) => a.arc === "clue-logs"));
  beamDown(S, []);
  assert.ok(actionsFor(S).some((a) => a.id === "sweep"));        // beamed back up: the ship's actions return
});
