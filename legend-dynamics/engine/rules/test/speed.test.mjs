// Aurora's Speed and Flight in the encounter: acting first, extra actions, dives, and fliers falling.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";
import * as E from "../../lab/encounter.js";

const CORE = JSON.parse(readFileSync(new URL("../../combat.json", import.meta.url)));
const blow = { id: "blow", name: "Blow", skill: "Brawling", reach: "melee", reachYards: 1, class: 2, natural: true, damage: { melee: { boxes: 2 } } };
const rules = X.buildRules(X.PUBLISHED, { blow }, null, JSON.parse(JSON.stringify(CORE.rules)));
function scene(seed, hero = {}, foe = {}) {
  const enc = E.newEncounter({ name: "Sky", setting: "aurora", baseline: LD.CORE_BASELINE, config: X.PUBLISHED, seed });
  E.addParticipant(enc, { kind: "pc", name: "Bolt", agility: 9, dodge: 10, skills: { Brawling: 18 }, weapons: ["blow"], ...hero });
  E.addParticipant(enc, { kind: "npc", name: "Brute", agility: 14, dodge: 9, skills: { Brawling: 12 }, weapons: ["blow"], boxes: 8, ...foe });
  E.startCombat(enc, rules);
  return { enc, hero: enc.participants[0], foe: enc.participants[1] };
}

test("Speed acts first, whatever the Agility", () => {
  assert.equal(E.active(scene(1).enc).name, "Brute", "Agility 14 goes first");
  assert.equal(E.active(scene(1, { actFirst: true }).enc).name, "Bolt", "Speed goes first");
});

test("two actions a round: the turn stays with them once, then moves on", () => {
  const { enc } = scene(1, { actFirst: true, actions: 2 });
  assert.equal(E.active(enc).name, "Bolt");
  E.nextTurn(enc); assert.equal(E.active(enc).name, "Bolt", "second action");
  assert.equal(enc.events.at(-1).action, 2);
  E.nextTurn(enc); assert.equal(E.active(enc).name, "Brute");
  E.nextTurn(enc); assert.equal(E.active(enc).name, "Bolt"); assert.equal(enc.round, 2);
  E.nextTurn(enc); assert.equal(E.active(enc).name, "Bolt", "two actions again in round 2");
});

const strike = (f, o = {}) => E.attack(f.enc, rules, LD, { attacker: f.hero.pid, defender: f.foe.pid, weapon: "blow", band: "melee", canDodge: false, ...o });
const hitSeed = (hero, foe) => { let s = 1; while (!strike(scene(s, hero, foe)).event.hit) s++; return s; };

test("a dive hits one Class higher, and hurts the diver unless their Defense is that high", () => {
  const s = hitSeed({ flies: true });
  const plain = strike(scene(s, { flies: true })).event;
  assert.equal(plain.dive, null);
  const dive = strike(scene(s, { flies: true }), { dive: true }).event;
  assert.deepEqual(dive.dive, { cls: 3, hurts: true });
  const tough = strike(scene(s, { flies: true, traits: [{ type: "defenseClass", value: 3 }] }), { dive: true }).event;
  assert.equal(tough.dive.hurts, false);
  assert.equal(strike(scene(s), { dive: true }).event.dive, null, "only a flier dives");
});

test("a flier knocked back falls; one on the ground doesn't", () => {
  const s = hitSeed({ flies: true });
  assert.equal(strike(scene(s, { flies: true }, { flies: true }), { dive: true }).event.flierFalls, true, "a Class III hit on a flier");
  assert.equal(strike(scene(s, { flies: true }), { dive: true }).event.flierFalls, false);
});

test("Aurora's Speed data: blows one Class below, and the fight table", () => {
  const pack = JSON.parse(readFileSync(new URL("../../../packs/aurora/pack.json", import.meta.url)));
  for (const a of pack.arms.filter((x) => x.power === "speed")) assert.equal(a.class, a.powerClass - 1, a.id);
  const F = pack.powers.fight;
  assert.deepEqual(F.actions.byClass, [1, 1, 1, 2, 3, 3]);
  assert.equal(pack.threats.find((t) => t.id === "op-celerity").actions, 2);
});
