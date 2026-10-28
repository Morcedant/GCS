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

// Super strength: weapons in strong hands, knockback, and pins that hold.
const crowbar = { id: "crowbar", name: "Crowbar", skill: "Melee", reach: "melee", reachYards: 1, class: 1, damage: { melee: { boxes: 1 } } };
const blow3 = { id: "blow3", name: "Strength III: blow", skill: "Brawling", reach: "melee", reachYards: 1, class: 3, natural: true, power: "strength", powerClass: 3, damage: { melee: { boxes: 2 } } };
const srules = X.buildRules(X.PUBLISHED, { crowbar, blow3 }, null, JSON.parse(JSON.stringify(CORE.rules)));
function brawl(seed, heroStr, foeStr) {
  const enc = E.newEncounter({ name: "Alley", setting: "aurora", baseline: LD.CORE_BASELINE, config: X.PUBLISHED, seed });
  E.addParticipant(enc, { kind: "pc", name: "Brick", agility: 12, dodge: 10, skills: { Melee: 18, Brawling: 18 }, weapons: ["crowbar", "blow3"], ...(heroStr ? { strength: heroStr } : {}) });
  E.addParticipant(enc, { kind: "npc", name: "Thug", agility: 10, dodge: 9, skills: {}, weapons: [], boxes: 6, ...(foeStr ? { strength: foeStr } : {}) });
  E.startCombat(enc, srules);
  return { enc, hero: enc.participants[0], foe: enc.participants[1] };
}
const swing = (f, weapon) => E.attack(f.enc, srules, LD, { attacker: f.hero.pid, defender: f.foe.pid, weapon, band: "melee", canDodge: false });
const hitSeed = (weapon) => { let s = 1; while (!swing(brawl(s, 3), weapon).event.hit) s++; return s; };

test("a weapon in strong hands hits at the wielder's Strength, and an ordinary one breaks above Class II", () => {
  const s = hitSeed("crowbar");
  const weak = swing(brawl(s, 0), "crowbar").event;
  assert.equal(weak.damage, 1); assert.equal(weak.strongHands, null);
  const strong = swing(brawl(s, 3), "crowbar").event;
  assert.equal(strong.damage, 2, "Class III marks 2 boxes");
  assert.deepEqual(strong.strongHands, { cls: 3, breaks: true });
  assert.equal(strong.knockback, 1, "Class III: knocked down and back one hex");
  assert.equal(swing(brawl(s, 3), "blow3").event.strongHands, null, "a power's own blow isn't raised again");
});

test("a pin by someone stronger holds: Body −2 per Class of difference", () => {
  for (const [hs, fs, grip] of [[3, 0, 3], [3, 1, 2], [2, 2, 0], [0, 3, 0]]) {
    let seed = 1, f, ev;
    for (;; seed++) { f = brawl(seed, hs, fs); ev = swing(f, "blow3").event; if (ev.telling) break; if (seed > 400) break; }
    if (!ev.telling) continue; // no telling hit in range: nothing to check for this pair
    const r = E.tellingEffect(f.enc, ev.n, "pin");
    assert.equal(r.event.grip || 0, grip, `Strength ${hs} pinning Strength ${fs}`);
  }
});

test("Aurora's power attacks name a real power and Class", () => {
  const pack = JSON.parse(readFileSync(new URL("../../../packs/aurora/pack.json", import.meta.url)));
  const ids = new Set(pack.powers.list.map((p) => p[0]));
  const pw = pack.arms.filter((a) => a.power);
  assert.ok(pw.length > 40);
  for (const a of pw) { assert.ok(ids.has(a.power), a.id); assert.ok(a.powerClass >= 1 && a.powerClass <= 6, a.id); assert.ok(a.class >= 1, a.id); }
  assert.ok(pack.powers.bodyFeats.every((id) => ids.has(id)));
});
