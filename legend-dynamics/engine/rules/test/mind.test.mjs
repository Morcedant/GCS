// Aurora's mind powers in the encounter: psychic attacks are Will contests on the Mind track, with Mind Defense.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";
import * as E from "../../lab/encounter.js";

const CORE = JSON.parse(readFileSync(new URL("../../combat.json", import.meta.url)));
const stab = (cls) => ({ id: `stab${cls}`, name: `Psychic stab ${cls}`, skill: "Powers", band: "long", class: cls, mind: true, damage: { any: { boxes: cls >= 4 ? 3 : cls >= 2 ? 2 : 1 } } });
const rules = X.buildRules(X.PUBLISHED, { stab1: stab(1), stab2: stab(2), stab4: stab(4) }, null, JSON.parse(JSON.stringify(CORE.rules)));
function duel(seed, foe = {}) {
  const enc = E.newEncounter({ name: "Mind", setting: "aurora", baseline: LD.CORE_BASELINE, config: X.PUBLISHED, seed });
  E.addParticipant(enc, { kind: "pc", name: "Psi", agility: 12, dodge: 10, skills: { Powers: 16 }, weapons: ["stab1", "stab2", "stab4"], mind: 0, mindBoxes: 3, will: 12 });
  E.addParticipant(enc, { kind: "npc", name: "Tank", agility: 10, dodge: 9, skills: {}, weapons: [], boxes: 6, mind: 0, mindBoxes: 3, will: 10,
    traits: [{ type: "defenseClass", value: 6, label: "Defense VI" }], ...foe });
  E.startCombat(enc, rules);
  return { enc, psi: enc.participants[0], tank: enc.participants[1] };
}
const zap = (f, w = "stab2") => E.attack(f.enc, rules, LD, { attacker: f.psi.pid, defender: f.tank.pid, weapon: w, band: "close" });

test("a psychic attack ignores Toughness and Dodge, and marks the Mind track by contest", () => {
  let wins = 0, losses = 0;
  for (let s = 1; s <= 120; s++) {
    const f = duel(s), ev = zap(f).event;
    assert.equal(ev.mind, true); assert.equal(ev.canDodge, false);
    assert.equal(f.tank.injury, 0, "never the injury track");
    // The contest: a success beats a failure; if both succeed, the larger margin wins; ties go to the target.
    const a = LD.resolve(ev.attackDice, ev.target), d = ev.dodgeDice ? LD.resolve(ev.dodgeDice, ev.effectiveDodge) : null;
    const win = a.success && (!d || !d.success || a.contestMargin > d.contestMargin);
    assert.equal(ev.hit, win, `seed ${s}`);
    if (win) { wins++; assert.equal(f.tank.mind, 2); } else { losses++; assert.equal(f.tank.mind, 0); }
  }
  assert.ok(wins > 10 && losses > 10, `${wins} wins, ${losses} losses`);
});

test("Mind Defense: a weaker power does nothing, an equal one is resisted at +2; Class IV is −2 against no defense", () => {
  const md = (v) => ({ traits: [{ type: "mindDefense", value: v }] });
  const blocked = zap(duel(1, md(3))).event;
  assert.equal(blocked.hit, false); assert.match(blocked.outcome, /Mind Defense III/);
  const eq = zap(duel(1, md(2))).event;
  assert.deepEqual(eq.resistMods.map((m) => m.value), [2]);
  const big = zap(duel(1), "stab4").event;
  assert.deepEqual(big.resistMods.map((m) => m.value), [-2]);
  const bigVsDef = zap(duel(1, md(4)), "stab4").event;
  assert.deepEqual(bigVsDef.resistMods.map((m) => m.value), [2], "an equal Mind Defense, not the −2");
});

test("a full Mind track takes them out, never Dying; the Mind penalty applies to the next contest", () => {
  let s = 1, f;
  for (; s < 400; s++) { f = duel(s, { mind: 2 }); if (zap(f).event.hit) break; }
  assert.equal(f.tank.mind, 3); assert.equal(E.isOut(f.tank), true); assert.equal(f.tank.dying, false);
  const g = duel(5, { mind: 1 }), ev = zap(g).event;
  if (ev.dodgeDice) assert.ok(ev.resistMods.some((m) => m.label === "Mind track" && m.value === -1));
});

test("the Mind track changed by hand, and a psychic result can't be overridden as a hit", () => {
  const f = duel(2), ev = zap(f).event;
  assert.ok(E.override(f.enc, rules, LD, "outcome", { event: ev.n, hit: !ev.hit }).error);
  E.override(f.enc, rules, LD, "mind", { pid: f.tank.pid, mind: 1 });
  assert.equal(f.tank.mind, 1);
});

test("Aurora's mind data: the track, Mind Defense sources, psychic attacks one Class below, Lord Marrow's nightmare", () => {
  const pack = JSON.parse(readFileSync(new URL("../../../packs/aurora/pack.json", import.meta.url)));
  assert.equal(pack.mindTrack.boxes, 3); assert.equal(pack.mindTrack.effects.length, 4);
  for (const a of pack.arms.filter((x) => x.mind && x.power)) assert.equal(a.class, a.powerClass - 1, a.id);
  assert.equal(pack.arms.find((a) => a.id === "op-nightmare2").mind, true);
  assert.ok(pack.equipment.some((e) => e[0] === "psihelm"));
});
