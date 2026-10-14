import assert from "node:assert/strict";
import test from "node:test";
import * as LD from "../core.js";
import * as X from "../experiments.js";

const weapons = { revolver: { id: "revolver", name: "Revolver", band: "close", damage: { any: { boxes: 2 } }, traits: [] },
  shotgun: { id: "shotgun", name: "Shotgun", band: "short", maxBand: "short", damage: { close: { boxes: 3, dying: true }, short: { boxes: 1 } }, traits: [] } };
const lab = { label: "Pact of Bones Test", experiments: ["labWeaponTraits"], weaponTraits: { shotgun: [{ type: "accuracy", value: 1, bands: ["close"], requires: { ammo: "shot" }, label: "Scattershot" }] } };
const allDice = [];
for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) allDice.push([a, b, c]);
const att = (t) => ({ id: "a", name: "A", skill: "Shooting", skillTarget: t });
const def = (d) => ({ id: "d", name: "D", dodgeBase: d, canDodge: true });

test("attack-quality bands, as specified", () => {
  const b = X.EXPERIMENTS[0].params.bands;
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 12].map((m) => X.bandFor(m, b)), [0, 0, 0, -1, -1, -2, -2, -3, -3]);
});

test("published config and a lab config with everything off give the published results, for every roll", () => {
  const pub = X.buildRules(X.PUBLISHED, weapons, lab), off = X.buildRules(X.newLabConfig("western", lab), weapons, lab);
  assert.equal(pub.active.length + off.active.length, 0);
  for (const ad of allDice) for (const dd of [[1, 1, 2], [3, 4, 5], [6, 6, 6]]) {
    const run = (r) => { const s = [ad, dd]; return LD.resolveAttack({ attacker: att(13), defender: def(10), weapon: r.weapons.shotgun, band: "close", ammo: "shot", aimed: 1 }, r.hooks, () => s.shift()); };
    const base = run({ weapons, hooks: LD.NO_HOOKS });
    assert.deepEqual(run(pub), base); assert.deepEqual(run(off), base);
  }
});

test("experiments only change what they're for, and are recorded with their scope", () => {
  const cfg = X.newLabConfig("western", lab);
  cfg.experiments.attackQualityDodge.on = true; cfg.experiments.aim.on = true; cfg.experiments.labWeaponTraits.on = true;
  const r = X.buildRules(cfg, weapons, lab);
  assert.deepEqual(r.active.map((a) => a.id + ":" + a.scope), ["attackQualityDodge:core", "aim:core", "labWeaponTraits:setting"]);
  assert.ok(r.actions.has("aim"));
  assert.equal(weapons.shotgun.traits.length, 0, "published weapon data is never modified");
  const s = [[2, 2, 3], [3, 3, 3]]; // attack 7 vs 13 +1 aim +1 scattershot = 15 → margin 8; dodge 9 vs 10 −3 = 7 → fails
  const res = LD.resolveAttack({ attacker: att(13), defender: def(10), weapon: r.weapons.shotgun, band: "close", ammo: "shot", aimed: 1 }, r.hooks, () => s.shift());
  assert.deepEqual(res.attackMods.map((m) => m.label + m.value), ["Scattershot1", "Aim1"]);
  assert.equal(res.target, 15); assert.equal(res.attack.margin, 8);
  assert.equal(res.dodgeTarget, 7); assert.equal(res.outcome, "hit");
  assert.deepEqual(res.damage, { boxes: 3, dying: true });
});

test("thresholds are configurable", () => {
  const cfg = X.newLabConfig("western", lab);
  cfg.experiments.attackQualityDodge = { on: true, params: { bands: [{ from: 0, mod: 0 }, { from: 4, mod: -2 }] } };
  const r = X.buildRules(cfg, weapons, lab);
  assert.equal(r.hooks.dodgeModifiers[0]({ margin: 5 })[0].value, -2);
  assert.equal(r.hooks.dodgeModifiers[0]({ margin: 3 }).length, 0);
});
