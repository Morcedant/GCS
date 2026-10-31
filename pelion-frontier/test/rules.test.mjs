import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, check, actionsFor, attempt, resolve, moveTo, reachable, target, markCommand, score } from "../src/game.js";
import { startBattle, exchange, battleStats } from "../src/combat.js";
import { endTurn, chooseEvent, closeBattle } from "../src/turn.js";
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
test("Corvan II: arriving brings the raider's hail; warning it off starts the pull", () => {
  const S = newGame({ seed: "cv" });
  S.pelion.mp = 99; moveTo(S, "pelion", S.systems[S.corvan].at);
  assert.equal(S.event.kind, "arc-arrive");
  let guard = 0;
  while (S.arc.stage === "travel" && guard++ < 50) {
    if (S.event && S.event.kind === "arc-arrive") chooseEvent(S, "warn");
    else if (S.battle) { if (S.battle.over) closeBattle(S); else exchange(S, { shields: true, phasers: true, torps: true }); }
  }
  assert.equal(S.arc.stage, "pull");
  assert.ok(actionsFor(S).some((a) => a.arc === "clue-logs"));
});
test("the score counts", () => { const S = newGame({ seed: "sc" }); assert.equal(score(S).total, 15); });
