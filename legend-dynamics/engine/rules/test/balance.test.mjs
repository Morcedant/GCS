// The balance revision's mechanics: Additional Defense, the magic harm limit, and the published data behind them.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";
import * as E from "../../lab/encounter.js";

const CORE = JSON.parse(readFileSync(new URL("../../combat.json", import.meta.url)));
const pack = JSON.parse(readFileSync(new URL("../../../packs/western/pack.json", import.meta.url)));
const weapons = Object.fromEntries(pack.arms.filter((a) => !a.hazard).map((a) => [a.id, a]));
const combatOf = (p) => { const r = JSON.parse(JSON.stringify(CORE.rules)); for (const [k, v] of Object.entries(p.combatRules || {})) r[k] = { ...(r[k] || {}), ...v }; return r; };
const published = X.buildRules(X.PUBLISHED, weapons, null, combatOf(pack));

function duel(traits = []) {
  const enc = E.newEncounter({ name: "Street", setting: "western", baseline: LD.CORE_BASELINE, config: X.PUBLISHED, seed: 7 });
  E.addParticipant(enc, { kind: "pc", name: "Ames", agility: 12, dodge: 11, skills: { Melee: 14, Brawling: 12 }, weapons: ["blade", "fists"], traits, points: 2 });
  E.addParticipant(enc, { kind: "npc", name: "Outlaw", agility: 11, dodge: 9, skills: { Melee: 12 }, weapons: ["blade"], boxes: 3 });
  E.startCombat(enc, published);
  return { enc, ames: E.find(enc, enc.participants[0].pid) };
}
const kinds = (opts) => opts.map((o) => [o.kind, o.preview, !!o.used]);

test("core data: Additional Defense's second defense is −2, and the old second-parry penalty is gone", () => {
  assert.equal(CORE.rules.oneDefense.extraPenalty, -2);
  assert.equal(CORE.rules.parry.repeatPenalty, 0);
  assert.equal(published.params.oneDefense.extraPenalty, -2);
});

test("one defense a round without the Edge; the first defense with it carries no penalty", () => {
  const { enc, ames } = duel();
  assert.deepEqual(kinds(E.defenseOptions(enc, published, ames, weapons.blade)), [["dodge", 11, false], ["parry", 11, false]], "Melee 14 −3 parries at 11");
  ames.defRound = enc.round; ames.defCount = 1;
  assert.ok(E.defenseOptions(enc, published, ames, weapons.blade).every((o) => o.used), "no second defense without the Edge");
});

test("Additional Defense: a second defense at −2, whichever kind, and no third", () => {
  const { enc, ames } = duel([{ type: "extraDefense", value: 1, label: "Additional Defense" }]);
  ames.defRound = enc.round; ames.defCount = 1; // already defended once this round
  const second = E.defenseOptions(enc, published, ames, weapons.blade);
  assert.deepEqual(kinds(second), [["dodge", 9, false], ["parry", 9, false]], "−2 on Dodge and on Parry alike");
  assert.ok(second.every((o) => o.mods.some((m) => m.label === "Second defense this round" && m.value === -2)));
  assert.ok(!second.some((o) => o.mods.some((m) => /Parry 2 this round/.test(m.label))), "no separate second-parry penalty on top");
  ames.parryRound = enc.round; ames.parries = 1; // even after a first parry, a second parry is only the −2
  assert.equal(E.defenseOptions(enc, published, ames, weapons.blade).find((o) => o.kind === "parry").preview, 9);
  ames.defCount = 2;
  assert.ok(E.defenseOptions(enc, published, ames, weapons.blade).every((o) => o.used), "two defenses, then none");
});

test("a setting that keeps its own defense rules (no extraPenalty) is unchanged", () => {
  const own = X.buildRules(X.PUBLISHED, weapons, null, { ...combatOf(pack), oneDefense: { perRound: 1 }, parry: { mod: -3, repeatPenalty: -2 } });
  const { enc, ames } = duel([{ type: "extraDefense", value: 1 }]);
  ames.defRound = enc.round; ames.defCount = 1; ames.parryRound = enc.round; ames.parries = 1;
  const o = E.defenseOptions(enc, own, ames, weapons.blade);
  assert.equal(o.find((x) => x.kind === "dodge").preview, 11, "no second-defense penalty");
  assert.equal(o.find((x) => x.kind === "parry").preview, 9, "its own second-parry penalty");
});

test("magic marks at most 3 boxes on one target, whatever its Harder Boosts", () => {
  const roll = (...q) => () => q.shift();
  const bolt = { id: "bolt", band: "short", spell: true, damage: { any: { boxes: 2 } } };
  const cast = (boosts) => LD.resolveAttack({ attacker: { id: "a", name: "A", skillTarget: 16 }, defender: { id: "d", name: "D", dodgeBase: null, canDodge: false },
    weapon: bolt, band: "close", boosts }, { attackModifiers: [], dodgeModifiers: [] }, roll([3, 3, 3]));
  assert.equal(LD.MAGIC_HARM_CAP, 3);
  assert.equal(cast(0).damage.boxes, 2);
  assert.equal(cast(1).damage.boxes, 3);
  assert.equal(cast(2).damage.boxes, 3, "the second Harder Boost can't take it past 3");
  assert.equal(cast(2).harmCapped, true);
  const gun = { id: "buffalo", band: "long", damage: { any: { boxes: 3, dying: true } } };
  assert.equal(LD.resolveAttack({ attacker: { id: "a", name: "A", skillTarget: 16 }, defender: { id: "d", name: "D", dodgeBase: null, canDodge: false }, weapon: gun, band: "close" },
    { attackModifiers: [], dodgeModifiers: [] }, roll([3, 3, 3])).harmCapped, undefined, "weapons aren't magic: no cap applied");
});

test("published hostile bursts name a defense or a resistance, never both", () => {
  const hostile = { western: ["hellfire", "shove", "evileye", "chill", "hold"], fantasy: ["bolt", "hex", "charm", "dread", "sleep", "beast"],
    spaceopera: ["push", "read", "shove", "calm"], aurora: ["bolt", "bind", "glamour", "hex", "charm"] };
  for (const [pid, ids] of Object.entries(hostile)) {
    const p = JSON.parse(readFileSync(new URL(`../../../packs/${pid}/pack.json`, import.meta.url)));
    for (const id of ids) {
      const text = p.spells.list.find((x) => x[0] === id)[2];
      const def = /Dodge applies/.test(text), res = /(Will|Body|Presence|Intellect)('s)? resists|resist with Will|Will resists/.test(text);
      assert.ok(def !== res, `${pid} ${id}: exactly one of a defense or a resistance: "${text}"`);
    }
  }
});

test("revised telling-hit effects keep their limits", () => {
  const T = Object.fromEntries(X.TELLING_EFFECTS.map(([id, , text]) => [id, text]));
  assert.match(T.pin, /next action goes to getting free, then they're free/);
  assert.match(T.knockdown, /standing uses their next move, not their action/);
  assert.match(T.break, /until its owner spends an action/);
  assert.match(T.precise, /never the injury, defense or death rules/);
});
