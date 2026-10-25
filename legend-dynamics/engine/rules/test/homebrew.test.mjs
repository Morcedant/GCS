// Homebrew (engine/homebrew.js): entries are checked against the game's limits, join the setting's data, and the
// bonuses they name are worked out by the rules engine like the setting's own.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import * as LD from "../core.js";

const here = new URL(".", import.meta.url);
const pack = (id) => JSON.parse(fs.readFileSync(new URL(`../../../packs/${id}/pack.json`, here), "utf8"));
const HB = (() => {
  const store = {}, localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)) };
  const src = fs.readFileSync(new URL("../../homebrew.js", here), "utf8");
  return new Function("localStorage", src + "\nreturn { hbClean, hbApply, hbEdgeBonus, hbEdgeTraits };")(localStorage); // a plain script, as the pages inline it
})();
const ROLL = (...seq) => () => seq.shift();

test("homebrew is held to the game's limits", () => {
  const P = pack("western");
  const hb = HB.hbClean({
    weapons: [{ name: "Silver saber", skill: "Melee", kind: "melee", boxes: 9, reach: 7, bonus: { accuracy: 5, materials: ["silver", "kryptonite"] } }],
    threats: [{ name: "Barrow wight", target: 40, dodge: 1, boxes: 9, weapons: ["claws", "nonsense"], bonus: { hardToHit: 5, weak: ["fire"] } }, { name: "No weapons", weapons: [] }],
    edges: [{ name: "Deadeye", text: "Sure aim.", limit: 3, bonus: { skill: "Shooting", skillValue: 9, dodge: 4, move: 9 } }, { name: "Nonsense skill", text: "x", bonus: { skill: "Juggling", skillValue: 2 } }],
    spells: [{ name: "Grave Bolt", text: "Cold.", attack: { boxes: 7, band: "nowhere" } }],
  }, P);
  const w = hb.weapons[0], t = hb.threats[0], e = hb.edges[0];
  assert.deepEqual([w.boxes, w.reach, w.bonus.accuracy, w.bonus.materials], [4, 3, 2, ["silver"]]);
  assert.deepEqual([t.target, t.dodge, t.boxes, t.weapons, t.bonus.hardToHit], [18, 3, 6, ["claws"], 2]);
  assert.equal(hb.threats.length, 1, "a threat needs a weapon");
  assert.deepEqual([e.bonus.skillValue, e.bonus.dodge, e.bonus.move, e.limit], [2, 1, 3, 1], "a number bonus caps out and is taken once");
  assert.equal(hb.edges[1].bonus.skillValue, 0, "a skill the game doesn't have gives nothing");
  assert.deepEqual(hb.spells[0].attack, { boxes: 3, band: "short" });
});

test("homebrew bonuses are worked out by the rules engine", () => {
  const P = pack("western");
  HB.hbApply(P, HB.hbClean({
    weapons: [{ name: "Silver saber", skill: "Melee", kind: "melee", boxes: 2, reach: 2, bonus: { accuracy: 1, strong: true, materials: ["silver"] } }],
    threats: [{ name: "Barrow wight", target: 13, dodge: 9, boxes: 4, weapons: ["claws"], bonus: { armor: true, hardToHit: 1, weak: ["silver"], shrug: true } }],
    edges: [{ name: "Deadeye", text: "Sure aim.", bonus: { skill: "Shooting", skillValue: 2, dodge: 1, move: 2, extraDefense: true } }],
    spells: [{ name: "Grave Bolt", text: "Cold.", attack: { boxes: 2, band: "short" } }],
  }, P));
  const saber = P.arms.find((a) => a.id === "hb-silver-saber"), wight = P.threats.find((t) => t.id === "hb-barrow-wight");
  assert.deepEqual(saber.materials, ["silver"]);
  assert.deepEqual(wight.traits.map((t) => t.type), ["armor", "attackPenalty", "weakness", "ignoreHits"]);
  // Melee 12, +1 accurate, −1 hard to hit: target 12. Dice 3 (success by 9), the wight's Dodge fails.
  const r = LD.resolveAttack({ attacker: { id: "a", name: "A", skill: "Melee", skillTarget: 12 }, defender: { id: "w", name: "Wight", dodgeBase: 9, canDodge: true, boxes: 4, traits: wight.traits.map((t) => ({ ...t })) },
    weapon: saber, band: "melee" }, LD.NO_HOOKS, ROLL([1, 1, 1], [6, 6, 6]));
  assert.equal(r.target, 12, "+1 accurate, −1 hard to hit");
  // Strong hit (by 5+) makes it 3 boxes, silver +1 = 4, the hard hide takes 1 = 3.
  assert.equal(r.damage.boxes, 3);
  assert.ok(r.weakness && r.armorUsed, "weakness and armour both applied");
  // The Edge: +2 Shooting, +1 Dodge, +2 yd Move for whoever has it, and a second defense in fights.
  const has = (id) => (id === "hb-deadeye" ? 1 : 0);
  assert.deepEqual([HB.hbEdgeBonus(P, has, "skill", "Shooting"), HB.hbEdgeBonus(P, has, "skill", "Melee"), HB.hbEdgeBonus(P, has, "dodge"), HB.hbEdgeBonus(P, has, "move")], [2, 0, 1, 2]);
  assert.equal(HB.hbEdgeBonus(P, () => 0, "dodge"), 0, "nothing without the Edge");
  assert.deepEqual(HB.hbEdgeTraits(P, has).map((t) => t.type), ["extraDefense"]);
  // An attack spell is cast with the setting's spell skill, by anyone who knows it.
  const bolt = P.arms.find((a) => a.cantrip === "hb-grave-bolt");
  assert.deepEqual([bolt.skill, bolt.band, bolt.damage.any.boxes], [P.spells.skill, "short", 2]);
});

test("homebrew powers join Aurora's list, with every Class filled in", () => {
  const P = pack("aurora");
  HB.hbApply(P, HB.hbClean({ powers: [{ name: "Shadow Step", group: "body", classes: ["Step between shadows, 10 yd.", "", "Bring a friend."], gm: true }] }, P));
  const p = P.powers.list.find((x) => x[0] === "hb-shadow-step");
  assert.equal(p[3].length, 6);
  assert.match(p[3][1], /As Class I, stronger/);
  assert.deepEqual(p[4], { gm: true });
});

test("homebrew advantages and origins join the creator's choices, held to the setting's shape", () => {
  const P = pack("western"), skills = P.skills.map((k) => k[0]), n = P.origins.length;
  const trait = { name: "Night Eyes", skill: "Tracking", text: "+2 to Tracking in the dark.", compName: "Sun-Dazzled", compText: "Bright light blinds you." };
  const hb = HB.hbClean({
    advantages: [{ name: "Trail Cook", skill: "Survival", text: "+2 to Survival to feed a party." }, { name: "No text" }],
    origins: [{ name: "Cave-born", desc: "From under the hills.", tier: 9, adj: { Agility: 1, Presence: -1 }, skills: ["Tracking", "Juggling", "Stealth"], traits: [trait, { name: "half done" }] },
      { name: "Lopsided", desc: "x", adj: { Body: 2 }, skills: ["Stealth"], traits: [trait] },
      { name: "No advantage", desc: "x", adj: {}, skills: ["Stealth"], traits: [] }],
  }, P);
  assert.equal(hb.advantages.length, 1);
  assert.equal(hb.origins.length, 1, "attributes must total 0, and an origin needs an advantage with its complication");
  const o = hb.origins[0];
  assert.deepEqual([o.tier, o.adj, o.skills, o.traits.length], [Math.max(...P.origins.map((x) => x.tier)), { Agility: 1, Presence: -1 }, ["Tracking", "Stealth"], 1]);
  HB.hbApply(P, hb);
  const added = P.origins[n];
  assert.equal(added.name, "Cave-born (homebrew)");
  assert.deepEqual(added.traits[0], ["hb-cave-born-1", "Night Eyes", "+2 to Tracking in the dark.", "Tracking", true, "Sun-Dazzled", "Bright light blinds you."]);
  assert.ok(added.skills.every((s) => skills.includes(s)));
  assert.deepEqual(P.advantages.at(-1), ["hb-trail-cook", "Trail Cook (homebrew)", "+2 to Survival to feed a party.", "Survival"]);
});

test("a homebrew origin in Aurora takes its powers from one of the setting's origins", () => {
  const P = pack("aurora"), like = P.origins.find((o) => o.powerSlots);
  HB.hbApply(P, HB.hbClean({ origins: [{ name: "Star-touched", desc: "Hit by a falling star.", adj: {}, skills: [P.skills[0][0]], powersLike: like.id,
    traits: [{ name: "Glow", text: "You shine.", compName: "Seen", compText: "Hard to hide." }] }] }, P));
  const o = P.origins.at(-1);
  assert.deepEqual(o.powerSlots, like.powerSlots);
  assert.equal(o.traits[0][4], false, "an advantage with no skill gives no roll bonus");
});
