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

test("Crown capabilities: margin damage, per-weapon jams, price, Boosts, defender traits", () => {
  const roll = (...seq) => () => seq.shift();
  const atk = { id: "a", name: "A", skill: "Melee", skillTarget: 14 }, def = (x = {}) => ({ id: "d", name: "D", dodgeBase: 3, canDodge: false, ...x });
  const great = { id: "great", reach: "melee", damage: { melee: { boxes: 2 } }, traits: [{ type: "marginDamage", margin: 5, damage: { boxes: 3, dying: true } }] };
  assert.deepEqual(LD.resolveAttack({ attacker: atk, defender: def(), weapon: great, band: "melee" }, LD.NO_HOOKS, roll([3, 3, 3])).damage, { boxes: 3, dying: true }, "hit by 5");
  assert.deepEqual(LD.resolveAttack({ attacker: atk, defender: def(), weapon: great, band: "melee" }, LD.NO_HOOKS, roll([4, 4, 4])).damage, { boxes: 2 }, "hit by 2");
  const arq = { id: "arq", band: "short", damage: { any: { boxes: 3, dying: true } }, jamOn: [17, 18] };
  assert.equal(LD.resolveAttack({ attacker: atk, defender: def(), weapon: arq, band: "short" }, LD.NO_HOOKS, roll([6, 6, 5])).jam, true, "arquebus misfires on 17");
  const bolt = { id: "bolt", band: "short", spell: true, damage: { any: { boxes: 2 } }, price: { track: "Corruption", fail: 1, natural18: 2 } };
  assert.deepEqual(LD.resolveAttack({ attacker: atk, defender: def(), weapon: bolt, band: "short" }, LD.NO_HOOKS, roll([6, 6, 6])).price, { track: "Corruption", boxes: 2 });
  assert.equal(LD.resolveAttack({ attacker: atk, defender: def(), weapon: bolt, band: "short" }, LD.NO_HOOKS, roll([1, 2, 3])).price, null);
  const b = LD.resolveAttack({ attacker: atk, defender: def(), weapon: bolt, band: "short", boosts: 1 }, LD.NO_HOOKS, roll([2, 3, 3]));
  assert.equal(b.target, 13, "Harder Boost: −1 to the roll"); assert.equal(b.damage.boxes, 3, "and +1 box");
  const ward = [{ type: "attackPenalty", value: -2, label: "Ward", toggle: true }];
  assert.equal(LD.resolveAttack({ attacker: atk, defender: def({ traits: ward }), weapon: bolt, band: "short" }, LD.NO_HOOKS, roll([3, 3, 3])).target, 12);
  assert.equal(LD.resolveAttack({ attacker: atk, defender: def({ traits: [{ ...ward[0], on: false }] }), weapon: bolt, band: "short" }, LD.NO_HOOKS, roll([3, 3, 3])).target, 14, "a broken Ward");
  const fist = { id: "fist", reach: "melee", damage: { melee: { boxes: 1 } } };
  const huge = LD.resolveAttack({ attacker: atk, defender: def({ traits: [{ type: "ignoreHits", maxBoxes: 1, label: "Huge" }] }), weapon: fist, band: "melee" }, LD.NO_HOOKS, roll([3, 3, 3]));
  assert.equal(huge.outcome, "hit, marks nothing (Huge)"); assert.equal(huge.damage, null);
});

test("stun weapons, Defense Classes and always-on armor", () => {
  // Attack dice 3 (a natural success), defense dice 18 (a natural failure): every attack lands.
  const roll = (/** @type {string} */ k) => (k === "attack" ? [1, 1, 1] : [6, 6, 6]);
  const atk = { id: "a", skillTarget: 12, injury: 0 };
  const def = (/** @type {any[]} */ traits) => ({ id: "d", canDodge: true, dodgeBase: 9, injury: 0, traits });
  const hit = (/** @type {any} */ weapon, /** @type {any[]} */ traits = []) => LD.resolveAttack({ attacker: atk, defender: def(traits), weapon, band: weapon.reach === "melee" ? "melee" : "close" }, LD.NO_HOOKS, roll);
  const stunner = { id: "stunner", band: "close", stun: true, damage: { any: { boxes: 0 } } };
  const s = hit(stunner);
  assert.equal(s.hit, true); assert.equal(s.stun, true); assert.equal(s.damage, null);
  const claws2 = { id: "claws2", reach: "melee", class: 2, damage: { melee: { boxes: 2 } } }, pistol = { id: "pistol", band: "close", class: 1, damage: { any: { boxes: 2 } } };
  const D2 = [{ type: "defenseClass", value: 2 }];
  assert.equal(hit(pistol, D2).damage, null, "a Class I attack does nothing to Defense II");
  assert.equal(hit(claws2, D2).damage.boxes, 1, "an equal Class marks one box fewer");
  assert.equal(hit({ ...claws2, class: 3 }, D2).damage.boxes, 2, "a higher Class hits in full");
  const chromed = [{ type: "armor", minBoxes: 2, reduce: 1, always: true, label: "Chromed" }];
  assert.equal(hit(claws2, chromed).damage.boxes, 1);
  assert.equal(hit(claws2, chromed).armorUsed, "Chromed");
});
