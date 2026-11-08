// Aurora's Foundation hardware, from the pack's own data: a neurogun is an advanced taser (a Class II physical stun,
// Body −4), flechette rifles are Class III and get through Toughness II, and stun grenades mark no box.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";
import * as E from "../../lab/encounter.js";

const CORE = JSON.parse(readFileSync(new URL("../../combat.json", import.meta.url)));
const PACK = JSON.parse(readFileSync(new URL("../../../packs/aurora/pack.json", import.meta.url)));
const ARMS = Object.fromEntries(PACK.arms.map((a) => [a.id, a]));
const rules = X.buildRules(X.PUBLISHED, ARMS, null, JSON.parse(JSON.stringify(CORE.rules)));
const team = PACK.threats.find((t) => t.id === "retrieval");

function fight(seed) {
  const enc = E.newEncounter({ name: "Under the tracks", setting: "aurora", baseline: LD.CORE_BASELINE, config: X.PUBLISHED, seed });
  E.addParticipant(enc, { kind: "npc", name: "Agent", agility: 11, dodge: team.dodge, skills: { Firearms: 13, Athletics: 11 }, weapons: team.weapons, boxes: 1 });
  E.addParticipant(enc, { kind: "pc", side: "party", name: "Bulletproof", agility: 10, dodge: 8, skills: {}, weapons: [], boxes: 3, mind: 0, mindBoxes: 3, will: 10,
    traits: [{ type: "defenseClass", value: 2, covers: ["physical"], label: "Toughness II" }] });
  E.startCombat(enc, rules);
  const [agent, hero] = enc.participants;
  return { enc, agent, hero };
}
const shoot = (f, weapon, band = "close") => E.attack(f.enc, rules, LD, { attacker: f.agent.pid, defender: f.hero.pid, weapon, band, canDodge: false });

test("the retrieval team carries the hardware", () => {
  for (const w of ["tranq", "neurogun", "flechette", "stungrenade"]) assert.ok(team.weapons.includes(w) && ARMS[w], w);
  assert.match(team.traitText, /kill/);
});

test("a flechette rifle (Class II, piercing) gets through Toughness II, a box fewer", () => {
  let seed = 1;
  while (!shoot(fight(seed), "flechette").event.hit) seed++;
  const f = fight(seed), ev = shoot(f, "flechette").event;
  assert.equal(ev.damage, 1, "2 boxes, one fewer through Defense II");
  assert.equal(f.hero.injury, 1);
});

test("a neurogun is a physical stun: Body −4 against no Defense, and Toughness II stops it", () => {
  const hit = (traits) => LD.resolveAttack({ attacker: { id: "a", skillTarget: 13, injury: 0 }, defender: { id: "d", canDodge: false, injury: 0, traits }, weapon: ARMS.neurogun, band: "close" }, LD.NO_HOOKS, () => [1, 1, 1]);
  const bare = hit([]);
  assert.equal(bare.stun, true); assert.equal(bare.damage, null); assert.match(bare.outcome, /Body −4/);
  const tough = hit([{ type: "defenseClass", value: 2, covers: ["physical"] }]);
  assert.ok(!tough.stun); assert.match(tough.outcome, /marks nothing \(Defense II against a Class II stun\)/);
  assert.equal(hit([{ type: "defenseClass", value: 1, covers: ["physical"] }]).stun, true, "Toughness I doesn't stop a Class II stun");
  assert.equal(LD.resolveAttack({ attacker: { id: "a", skillTarget: 13, injury: 0 }, defender: { id: "d", canDodge: false, injury: 0, traits: [{ type: "defenseClass", value: 2 }] }, weapon: ARMS.taser, band: "close" }, LD.NO_HOOKS, () => [1, 1, 1]).stun, true, "a plain taser, with no Class, is as before");
});

test("piercing: one Class higher against Defense, its own Class's boxes, and straight through a plain vest", () => {
  const hit = (weapon, traits) => LD.resolveAttack({ attacker: { id: "a", skillTarget: 13, injury: 0 }, defender: { id: "d", canDodge: false, injury: 0, traits }, weapon, band: "long" }, LD.NO_HOOKS, () => [1, 1, 1]);
  const T2 = [{ type: "defenseClass", value: 2, covers: ["physical"] }], T3 = [{ type: "defenseClass", value: 3, covers: ["physical"] }];
  assert.equal(hit(ARMS.flechette, T2).damage.boxes, 1, "Class II piercing through Toughness II: 2 boxes, one fewer");
  assert.equal(hit(ARMS.flechette, T3).damage, null, "Toughness III stops it");
  assert.equal(hit({ ...ARMS.flechette, piercing: false }, T2).damage, null, "without Piercing, Toughness II stops a Class II rifle");
  const vest = [{ type: "armor", minBoxes: 1, reduce: 1, label: "Body armor" }];
  assert.equal(hit(ARMS.flechette, vest).damage.boxes, 2, "a plain vest does nothing against it");
  assert.equal(hit({ ...ARMS.flechette, piercing: false }, vest).damage.boxes, 1, "but stops a box from an ordinary round");
});

test("a stun grenade marks no box", () => {
  for (let s = 1; s <= 20; s++) { const f = fight(s); shoot(f, "stungrenade"); assert.equal(f.hero.injury, 0); }
});
