// Aurora's Foundation hardware, from the pack's own data: neuroguns go through the nerves (a Will contest on the Mind
// track, past Toughness), flechette rifles are Class III and get through Toughness II, and stun grenades mark no box.
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

test("a flechette rifle (Class III) gets through Toughness II, a box fewer", () => {
  let seed = 1;
  while (!shoot(fight(seed), "flechette").event.hit) seed++;
  const f = fight(seed), ev = shoot(f, "flechette").event;
  assert.equal(ev.damage, 1, "2 boxes, one fewer through Defense II");
  assert.equal(f.hero.injury, 1);
});

test("a neurogun ignores Toughness: a Will contest that marks the Mind track", () => {
  let hits = 0;
  for (let s = 1; s <= 60; s++) {
    const f = fight(s), ev = shoot(f, "neurogun").event;
    assert.equal(ev.mind, true);
    assert.equal(f.hero.injury, 0, "never the injury track");
    if (ev.hit) { hits++; assert.equal(f.hero.mind, 2, "Class II: two Mind boxes"); }
  }
  assert.ok(hits > 0, "it lands sometimes, Toughness or not");
});

test("a stun grenade marks no box", () => {
  for (let s = 1; s <= 20; s++) { const f = fight(s); shoot(f, "stungrenade"); assert.equal(f.hero.injury, 0); }
});
