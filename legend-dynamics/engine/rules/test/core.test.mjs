// Run with: cd legend-dynamics/engine/rules && npm test
import assert from "node:assert/strict";
import test from "node:test";
import * as LD from "../core.js";
import * as bot from "../../../discord-bot/src/worker.js";

const allDice = [];
for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) allDice.push([a, b, c]);

test("parity: core resolve and odds match the Discord bot for every roll and target", () => {
  for (let t = 1; t <= 30; t++) {
    assert.equal(LD.odds(t), bot.odds(t), `odds ${t}`);
    for (const d of allDice) assert.deepEqual(LD.resolve(d, t), bot.resolve(d, t), `${d} vs ${t}`);
  }
});

test("published range modifiers", () => {
  const revolver = { band: "close" }, rifle = { band: "medium" }, derringer = { band: "close", maxBand: "short" }, knife = { reach: "melee" };
  assert.equal(LD.rangeModifier(revolver, "close"), 0);
  assert.equal(LD.rangeModifier(revolver, "melee"), 0, "a gun at arm's length is at Close");
  assert.equal(LD.rangeModifier(revolver, "short"), -2);
  assert.equal(LD.rangeModifier(revolver, "medium"), -4);
  assert.equal(LD.rangeModifier(revolver, "long"), null);
  assert.equal(LD.rangeModifier(rifle, "short"), 0);
  assert.equal(LD.rangeModifier(rifle, "extreme"), -4);
  assert.equal(LD.rangeModifier(derringer, "short"), -2);
  assert.equal(LD.rangeModifier(derringer, "medium"), null, "useless beyond Short");
  assert.equal(LD.rangeModifier(knife, "melee"), 0);
  assert.equal(LD.rangeModifier(knife, "close"), null);
});

test("published injury and Dying", () => {
  assert.deepEqual(LD.applyHit({ injury: 1 }, { boxes: 2 }), { injury: 3, dying: true, dead: false, out: true, change: "incapacitated and Dying" }, "the core example: Wounded, then a revolver");
  assert.equal(LD.applyHit({ injury: 2 }, { boxes: 1 }).dying, false, "a 1-box hit to three boxes isn't Dying");
  assert.equal(LD.applyHit({ injury: 0 }, { boxes: 3, dying: true }).dying, true, "shotgun at Close: 3 and Dying");
  assert.equal(LD.applyHit({ injury: 3 }, { boxes: 2 }).dead, true, "a 2-box hit at three boxes kills");
  assert.equal(LD.applyHit({ injury: 3 }, { boxes: 1 }).dead, false, "fists just keep you down");
  assert.equal(LD.applyHit({ injury: 0, minor: true, boxes: 1 }, { boxes: 1 }).out, true, "minor opponents drop to any hit");
});

test("seeded dice repeat by key, and differ by key", () => {
  assert.deepEqual(LD.diceFor(42, "r1|a|b|attack"), LD.diceFor(42, "r1|a|b|attack"));
  const many = new Set(Array.from({ length: 40 }, (_, i) => LD.diceFor(42, "k" + i).join("")));
  assert.ok(many.size > 20);
  for (const d of LD.diceFor(7, "x")) assert.ok(d >= 1 && d <= 6);
});

test("resolveAttack with no experiments follows the published sequence", () => {
  const seq = [[2, 3, 4], [5, 5, 5]]; // attack 9, dodge 15
  const roll = () => seq.shift();
  const r = LD.resolveAttack({
    attacker: { id: "a", name: "A", skill: "Shooting", skillTarget: 13, injury: 1 },
    defender: { id: "d", name: "D", dodgeBase: 9, injury: 0, canDodge: true },
    weapon: { id: "revolver", band: "close", damage: { any: { boxes: 2 } } }, band: "short", cover: "partial",
  }, LD.NO_HOOKS, roll);
  assert.equal(r.target, 13 - 2 - 2 - 1, "range −2, partial cover −2, Wounded −1");
  assert.equal(r.attack.margin, 8 - 9);
  assert.equal(r.outcome, "miss");
  const seq2 = [[1, 2, 3], [6, 6, 1]];
  const r2 = LD.resolveAttack({ attacker: { id: "a", name: "A", skill: "Shooting", skillTarget: 13 }, defender: { id: "d", name: "D", dodgeBase: 9, canDodge: true },
    weapon: { id: "revolver", band: "close", damage: { any: { boxes: 2 } } }, band: "close" }, LD.NO_HOOKS, () => seq2.shift());
  assert.equal(r2.attack.margin, 7);
  assert.equal(r2.dodgeTarget, 9, "no attack-quality modifier in the published rules");
  assert.equal(r2.outcome, "hit");
  assert.equal(r2.injury.injury, 2);
});
