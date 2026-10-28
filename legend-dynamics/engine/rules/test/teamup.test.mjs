// Aurora's team-ups: a power with a Class strikes one Class higher, marking boxes and meeting Defense as that Class.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";
import * as E from "../../lab/encounter.js";

const CORE = JSON.parse(readFileSync(new URL("../../combat.json", import.meta.url)));
const blast = { id: "blast2", name: "Blast II", skill: "Powers", band: "close", class: 2, damage: { any: { boxes: 2 } } };
const rules = X.buildRules(X.PUBLISHED, { blast2: blast }, null, JSON.parse(JSON.stringify(CORE.rules)));

function fight(seed) {
  const enc = E.newEncounter({ name: "Rooftop", setting: "aurora", baseline: LD.CORE_BASELINE, config: X.PUBLISHED, seed });
  for (const [name, side] of [["Volt", "pc"], ["Tide", "pc"]]) E.addParticipant(enc, { kind: "pc", side, name, agility: 12, dodge: 10, skills: { Powers: 18 }, weapons: ["blast2"] });
  E.addParticipant(enc, { kind: "npc", name: "Bulwark", agility: 10, dodge: 9, skills: {}, weapons: [], boxes: 4, traits: [{ type: "defenseClass", value: 3 }] });
  E.startCombat(enc, rules);
  const [volt, tide, foe] = enc.participants;
  return { enc, volt, tide, foe };
}
const shot = (f, teamUp) => E.attack(f.enc, rules, LD, { attacker: f.volt.pid, defender: f.foe.pid, weapon: "blast2", band: "close", canDodge: false, teamUp });

test("a team-up raises the Class by one against Defense, and logs the partner", () => {
  let seed = 1;
  while (!shot(fight(seed)).event.hit) seed++;
  const alone = shot(fight(seed)).event;
  assert.ok(!alone.damage, "Class II against Defense III does nothing");
  const f = fight(seed), together = shot(f, f.tide.pid).event;
  assert.equal(together.hit, true);
  assert.equal(together.damage, 1, "Class III against Defense III: 2 boxes, one fewer");
  assert.deepEqual(together.teamUp, { pid: f.tide.pid, name: "Tide", cls: 3 });
  assert.equal(f.foe.injury, 1);
});

test("a team-up names a partner who is in the encounter", () => {
  const f = fight(3);
  assert.ok(shot(f, "nobody").error);
});
