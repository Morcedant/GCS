import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";
import * as E from "../../lab/encounter.js";
import * as S from "../../lab/stats.js";

const pack = JSON.parse(readFileSync(new URL("../../../packs/western/pack.json", import.meta.url)));
const lab = JSON.parse(readFileSync(new URL("../../../packs/western/lab.json", import.meta.url)));
// The published combat rules, merged as tools/build-legend.py does: the core's (engine/combat.json) with the pack's overrides.
const CORE = JSON.parse(readFileSync(new URL("../../combat.json", import.meta.url)));
const combatOf = (p) => { const r = JSON.parse(JSON.stringify(CORE.rules)); for (const [k, v] of Object.entries(p.combatRules || {})) r[k] = { ...(r[k] || {}), ...v }; return r; };
const weapons = Object.fromEntries(pack.arms.filter((a) => !a.hazard).map((a) => [a.id, a]));
const rulesFor = (cfg) => ({ ...X.buildRules(cfg, weapons, lab), jamOn18: pack.weapons.jamOn18 });
const published = rulesFor(X.PUBLISHED);
const labCfg = X.newLabConfig("western", lab);
labCfg.experiments.attackQualityDodge.on = true; labCfg.experiments.aim.on = true;
const experimental = rulesFor(labCfg);

function setup(config, seed = 1234) {
  const enc = E.newEncounter({ name: "Saloon", setting: "western", baseline: LD.CORE_BASELINE, config, seed });
  const outlaw = pack.threats.find((t) => t.id === "outlaw");
  E.addParticipant(enc, { kind: "pc", name: "Ames", agility: 12, dodge: 11, skills: { Shooting: 15, Brawling: 12 }, weapons: ["revolver", "fists"], points: 2, ammo: { revolver: 6 } });
  E.addParticipant(enc, { kind: "npc", name: "Outlaw", agility: 11, dodge: outlaw.dodge, skills: { Shooting: 13, Brawling: 11 }, weapons: outlaw.weapons, boxes: outlaw.boxes });
  return enc;
}

test("the threats and weapons in the published pack are usable data", () => {
  assert.equal(pack.threats.length, 10);
  assert.deepEqual(weapons.shotgun.damage.close, { boxes: 3, dying: true });
  assert.equal(LD.rangeModifier(weapons.derringer, "medium"), null);
  assert.ok(pack.threats.every((t) => t.weapons.every((w) => weapons[w])));
});

test("a full encounter under published rules: turns, attacks, log, summary", () => {
  const enc = setup(X.PUBLISHED);
  E.startCombat(enc, published);
  assert.equal(E.active(enc).name, "Ames", "Agility order");
  assert.ok(E.aim(enc, published, "p1", "p2").error, "no Aim action in the published rules");
  for (let i = 0; i < 6; i++) {
    const a = E.active(enc), d = a.pid === "p1" ? "p2" : "p1";
    const r = E.attack(enc, published, LD, { attacker: a.pid, defender: d, weapon: "revolver", band: "close" });
    assert.ok(r.event || r.error);
    if (r.event) {
      const e = r.event;
      assert.equal(e.rules.config, "published"); assert.deepEqual(e.rules.active, []);
      assert.equal(e.attackQualityMod, 0);
      if (e.attackDice) assert.equal(e.target, e.base + e.injuryMod);
    }
    E.nextTurn(enc);
    if (enc.participants.some(E.isOut)) break;
  }
  const s = S.summarize(enc);
  assert.equal(s.rules.kind, "published");
  assert.ok(s.attacks >= 1);
  assert.ok(S.attacksCsv(enc).split("\n")[0].startsWith("encounter,config,experiments"));
});

test("the same seed gives the same dice, and an experiment changes only what it should", () => {
  const a = setup(X.PUBLISHED, 77), b = setup(labCfg, 77);
  E.startCombat(a, published); E.startCombat(b, experimental);
  const ra = E.attack(a, published, LD, { attacker: "p1", defender: "p2", weapon: "revolver", band: "close" }).event;
  const rb = E.attack(b, experimental, LD, { attacker: "p1", defender: "p2", weapon: "revolver", band: "close" }).event;
  assert.deepEqual(ra.attackDice, rb.attackDice); assert.equal(ra.margin, rb.margin);
  if (ra.success) {
    assert.deepEqual(ra.dodgeDice, rb.dodgeDice);
    assert.equal(rb.effectiveDodge, ra.effectiveDodge + X.bandFor(ra.margin, X.EXPERIMENTS[0].params.bands));
  }
  assert.deepEqual(rb.rules.active.map((x) => x.scope), ["core", "core"]);
});

test("Aim gives +1 to the next attack on the aimed target, once", () => {
  const enc = setup(labCfg);
  E.startCombat(enc, experimental);
  assert.ok(E.aim(enc, experimental, "p1", "p2").event);
  const e1 = E.attack(enc, experimental, LD, { attacker: "p1", defender: "p2", weapon: "revolver", band: "close" }).event;
  assert.equal(e1.aimMod, 1); assert.equal(e1.target, 16);
  const e2 = E.attack(enc, experimental, LD, { attacker: "p1", defender: "p2", weapon: "revolver", band: "close" }).event;
  assert.equal(e2.aimMod, 0);
});

test("Legend points: reroll keeps the second roll; reduce takes a box off; overrides are logged", () => {
  const enc = setup(X.PUBLISHED, 5);
  E.startCombat(enc, published);
  const e = E.attack(enc, published, LD, { attacker: "p1", defender: "p2", weapon: "revolver", band: "close" }).event;
  const rr = E.spendPoint(enc, published, LD, "p1", "reroll-attack", { event: e.n });
  assert.ok(rr.event); assert.equal(rr.event.reroll, "attack"); assert.equal(rr.event.replaces, e.n);
  assert.equal(E.find(enc, "p1").points, 1); assert.ok(e.superseded);
  assert.ok(E.spendPoint(enc, published, LD, "p1", "reroll-attack", { event: rr.event.n }).error, "one reroll per roll");
  assert.equal(S.summarize(enc).attacks, 1, "a rerolled attack counts once");
  // Force a hit on Ames from the outlaw and let Ames spend a point to reduce it.
  const o = E.attack(enc, published, LD, { attacker: "p2", defender: "p1", weapon: "revolver", band: "close", canDodge: false }).event;
  if (!o.hit) E.override(enc, published, LD, "outcome", { event: o.n, hit: true, reason: "test" });
  assert.equal(E.find(enc, "p1").injury, 2);
  assert.ok(E.spendPoint(enc, published, LD, "p1", "reduce", { event: o.n }).event);
  assert.equal(E.find(enc, "p1").injury, 1);
  const s = S.summarize(enc);
  assert.equal(s.pointsSpent, 2); assert.ok(s.overrides <= 1);
});

test("rerun under other rules replays the declared actions with the same dice", () => {
  const enc = setup(X.PUBLISHED, 99);
  E.startCombat(enc, published);
  for (let i = 0; i < 8 && !enc.participants.some(E.isOut); i++) {
    const a = E.active(enc);
    E.attack(enc, published, LD, { attacker: a.pid, defender: a.pid === "p1" ? "p2" : "p1", weapon: "revolver", band: "close" });
    E.nextTurn(enc);
  }
  const same = E.replay(enc, published, LD, X.PUBLISHED).encounter;
  const pick = (x) => x.events.filter((e) => e.type === "attack").map((e) => [e.attackTotal, e.dodgeTotal, e.outcome]);
  assert.deepEqual(pick(same), pick(enc), "same rules, same seed: identical encounter");
  const other = E.replay(enc, experimental, LD, labCfg).encounter;
  const pa = pick(enc), pb = pick(other);
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) assert.equal(pb[i][0], pa[i][0], "attack dice line up");
});

test("The Shattered Crown: Corruption on a failed cast, undone by a reroll; Ward on and off", () => {
  const crown = JSON.parse(readFileSync(new URL("../../../packs/fantasy/pack.json", import.meta.url)));
  const clab = JSON.parse(readFileSync(new URL("../../../packs/fantasy/lab.json", import.meta.url)));
  const W = Object.fromEntries(crown.arms.filter((a) => !a.hazard).map((a) => [a.id, a]));
  const r = { ...X.buildRules(X.PUBLISHED, W, clab), jamOn18: crown.weapons.jamOn18 };
  assert.equal(crown.threats.length, 11);
  assert.ok(crown.threats.every((t) => t.weapons.every((w) => W[w])));
  let failed = null;
  for (let seed = 1; seed < 400 && !failed; seed++) {
    const enc = E.newEncounter({ setting: "fantasy", baseline: LD.CORE_BASELINE, config: X.PUBLISHED, seed });
    E.addParticipant(enc, { kind: "pc", name: "Ithrann", agility: 12, dodge: 11, skills: { Sorcery: 9 }, weapons: ["shadowbolt"], points: 2, tracks: { Corruption: 0 } });
    const sorc = crown.threats.find((t) => t.id === "sorcerer");
    E.addParticipant(enc, { kind: "npc", name: "Sorcerer", agility: 10, dodge: sorc.dodge, skills: { Sorcery: 14 }, weapons: sorc.weapons, boxes: sorc.boxes, traits: sorc.traits.map((x) => ({ ...x, on: true })) });
    E.startCombat(enc, r);
    const ev = E.attack(enc, r, LD, { attacker: "p1", defender: "p2", weapon: "shadowbolt", band: "short" }).event;
    assert.equal(ev.attackMods.find((m) => m.source === "defender").value, -2, "the Ward");
    if (!ev.success) failed = { enc, ev };
  }
  assert.ok(failed, "found a failed cast");
  const { enc, ev } = failed, ith = E.find(enc, "p1");
  assert.deepEqual(ev.price, { track: "Corruption", boxes: ev.attackTotal === 18 ? 2 : 1 });
  assert.equal(ith.tracks.Corruption, ev.price.boxes);
  const rr = E.spendPoint(enc, r, LD, "p1", "reroll-attack", { event: ev.n }).event;
  assert.equal(ith.tracks.Corruption, rr.price ? rr.price.boxes : 0, "the reroll replaces the first cast's Corruption");
  E.setTrait(enc, "p2", 0, false);
  const again = E.attack(enc, r, LD, { attacker: "p1", defender: "p2", weapon: "shadowbolt", band: "short" }).event;
  assert.ok(!again.attackMods.some((m) => m.source === "defender"), "a broken Ward");
  assert.ok(S.attacksCsv(enc).split("\n")[0].includes("priceTrack"));
});

test("Dodge: one a round by default; the GM may allow another (logged); the experiment allows every attack", () => {
  const twice = (rules, cmdExtra) => {
    const enc = setup(rules === published ? X.PUBLISHED : labCfg, 11);
    E.startCombat(enc, rules);
    const res = [];
    for (let i = 0; i < 8 && res.filter((e) => e.success).length < 2; i++) res.push(E.attack(enc, rules, LD, { attacker: "p2", defender: "p1", weapon: "revolver", band: "close", ...cmdExtra }).event);
    return { enc, ok: res.filter((e) => e.success) };
  };
  let t = twice(published, {});
  assert.ok(t.ok[0].dodgeDice); assert.equal(t.ok[1].dodgeDice, null, "published: one Dodge a round");
  t = twice(published, { allowExtraDodge: true });
  assert.ok(t.ok[1].dodgeDice, "the GM allowed another");
  assert.ok(t.enc.events.some((e) => e.type === "override" && e.what === "dodge"));
  const cfg = X.newLabConfig("western", lab); cfg.experiments.dodgeEveryAttack.on = true;
  const every = rulesFor(cfg);
  const enc = setup(cfg, 11); E.startCombat(enc, every);
  const ok = [];
  for (let i = 0; i < 8 && ok.length < 2; i++) { const e = E.attack(enc, every, LD, { attacker: "p2", defender: "p1", weapon: "revolver", band: "close" }).event; if (e.success) ok.push(e); }
  assert.ok(ok[1].dodgeDice, "experiment: Dodge every attack");
  assert.ok(!enc.events.some((e) => e.type === "override"), "no override needed under the experiment");
});

test("a GM ruling of miss undoes the injury and is shown as the ruling", () => {
  const enc = setup(X.PUBLISHED, 3); E.startCombat(enc, published);
  let ev;
  for (let i = 0; i < 12; i++) { ev = E.attack(enc, published, LD, { attacker: "p2", defender: "p1", weapon: "revolver", band: "close", canDodge: false }).event; if (ev.hit) break; }
  assert.ok(ev.hit);
  E.override(enc, published, LD, "outcome", { event: ev.n, hit: false });
  assert.equal(ev.hit, false); assert.equal(ev.rolledHit, true); assert.equal(ev.overridden, true);
  assert.equal(E.find(enc, "p1").injury, ev.injuryBefore);
  E.override(enc, published, LD, "outcome", { event: ev.n, hit: true });
  assert.equal(ev.overridden, false, "ruling it back to what the dice said clears the override");
});

test("Parry, Block, shield and mail", () => {
  const crown = JSON.parse(readFileSync(new URL("../../../packs/fantasy/pack.json", import.meta.url)));
  const clab = JSON.parse(readFileSync(new URL("../../../packs/fantasy/lab.json", import.meta.url)));
  const W = Object.fromEntries(crown.arms.filter((a) => !a.hazard).map((a) => [a.id, a]));
  const prot = Object.fromEntries((crown.protection || []).map((x) => [x.id, x]));
  assert.ok(prot.shield && prot.mail, "published shield and mail are data");
  const pub = { ...X.buildRules(X.PUBLISHED, W, clab), jamOn18: true };
  const cfg = X.newLabConfig("fantasy", clab); cfg.experiments.parry.on = true; cfg.experiments.block.on = true;
  const exp = { ...X.buildRules(cfg, W, clab), jamOn18: true };
  const mk = (config) => {
    const enc = E.newEncounter({ setting: "fantasy", baseline: LD.CORE_BASELINE, config, seed: 5 });
    E.addParticipant(enc, { kind: "npc", name: "Bandit", agility: 10, dodge: 8, skills: { Melee: 12 }, weapons: ["sword"] });
    E.addParticipant(enc, { kind: "pc", name: "Gorrum", agility: 10, dodge: 9, skills: { Melee: 16, Brawling: 14 }, weapons: ["sword", "fists"], points: 0,
      traits: [...prot.shield.traits, ...prot.mail.traits].map((t) => ({ ...t })) });
    return enc;
  };
  // Published: Dodge only, with the shield's +1.
  let enc = mk(X.PUBLISHED); E.startCombat(enc, pub);
  let o = E.defenseOptions(enc, pub, E.find(enc, "p2"), W.sword);
  assert.deepEqual(o.map((x) => [x.kind, x.preview]), [["dodge", 10]], "Dodge 9 +1 shield");
  // Lab: Parry (Melee 16 −3 = 13) and Block (16 −2 +1 shield = 15) join in; best available is Block.
  enc = mk(cfg); E.startCombat(enc, exp);
  o = E.defenseOptions(enc, exp, E.find(enc, "p2"), W.sword);
  assert.deepEqual(o.map((x) => [x.kind, x.preview]), [["dodge", 10], ["parry", 13], ["block", 15]]);
  assert.deepEqual(E.defenseOptions(enc, exp, E.find(enc, "p2"), W.pistol).map((x) => x.kind), ["dodge"], "no parrying or blocking bullets");
  assert.deepEqual(E.defenseOptions(enc, exp, E.find(enc, "p2"), W.bow).map((x) => x.kind), ["dodge", "block"], "a shield blocks arrows");
  // Repeated parries get harder; Block once a round.
  let seen = { parry: [], block: 0 };
  for (let i = 0; i < 30 && seen.parry.length < 2; i++) {
    const ev = E.attack(enc, exp, LD, { attacker: "p1", defender: "p2", weapon: "sword", band: "melee", defense: "parry" }).event;
    if (ev.defense === "parry") seen.parry.push(ev.dodgeBase + ev.dodgeMods.filter((m) => m.source === "parry").reduce((a, m) => a + m.value, 0));
  }
  assert.deepEqual(seen.parry, [13, 11], "second parry in a round at −2");
  const b1 = E.attack(enc, exp, LD, { attacker: "p1", defender: "p2", weapon: "sword", band: "melee", defense: "block" }).event;
  const b2 = E.attack(enc, exp, LD, { attacker: "p1", defender: "p2", weapon: "sword", band: "melee", defense: "block" }).event;
  if (b1.defense === "block") assert.notEqual(b2.defense, "block", "Block once a round");
  // Mail: a 2-box hit marks one fewer, once.
  const enc2 = mk(X.PUBLISHED); E.startCombat(enc2, pub);
  const hits = [];
  for (let i = 0; i < 40 && hits.length < 2; i++) { const ev = E.attack(enc2, pub, LD, { attacker: "p1", defender: "p2", weapon: "sword", band: "melee", canDodge: false }).event; if (ev.hit) hits.push(ev); }
  assert.equal(hits[0].armorUsed, "Mail shirt"); assert.equal(hits[0].damage, 1);
  assert.equal(hits[1].armorUsed, null, "once per fight"); assert.equal(hits[1].damage, 2);
  assert.equal(S.summarize(enc2).armorStops, 1);
});

test("Heavy coat (published Trails of Blood & Dust gear): turns blades and claws, not bullets, once a fight; mail still stops everything", () => {
  const coat = pack.protection.find((g) => g.id === "coat");
  assert.equal(coat.equipment, "coat"); assert.ok(pack.equipment.some((e) => e[0] === "coat"), "the creator offers it as gear");
  assert.ok(!lab.protection && !lab.experiments.includes("labProtection"), "no longer test gear");
  const r = published;
  const one = (weapon) => {
    const enc = setup(X.PUBLISHED, 21); E.startCombat(enc, r);
    E.addGear(enc, "p1", coat);
    for (let i = 0; i < 40; i++) { const ev = E.attack(enc, r, LD, { attacker: "p2", defender: "p1", weapon, band: weapon === "revolver" ? "close" : "melee", canDodge: false }).event; if (ev.hit && ev.damage !== undefined) return ev; }
  };
  const claw = one("claws"), gun = one("revolver");
  assert.equal(claw.armorUsed, "Heavy coat"); assert.equal(claw.damage, 1);
  assert.equal(gun.armorUsed, null, "a coat doesn't stop a bullet"); assert.equal(gun.damage, 2);
  assert.equal(LD.resolveAttack({ attacker: { id: "a", name: "A", skillTarget: 14 }, defender: { id: "d", name: "D", dodgeBase: null, canDodge: false, traits: [{ type: "armor", minBoxes: 2, reduce: 1, label: "Mail" }] },
    weapon: { id: "g", firearm: true, band: "close", damage: { any: { boxes: 2 } } }, band: "close" }, LD.NO_HOOKS, () => [3, 3, 3]).armorUsed, "Mail", "no 'against': everything");
});

test("Trails of Blood & Dust's published combat rules: in force under Published and Lab alike, not offered as experiments", () => {
  const C = combatOf(pack);
  assert.deepEqual(Object.keys(C).sort(), ["aim", "attackQualityDodge", "block", "oneDefense", "parry", "tellingHits"]);
  for (const cfg of [X.PUBLISHED, X.newLabConfig("western", lab, C)]) {
    const r = X.buildRules(cfg, weapons, lab, C);
    assert.deepEqual(r.settingRules.map((x) => x.id).sort(), Object.keys(C).sort());
    assert.ok(r.flags.has("oneDefense") && !r.flags.has("dodgeEveryAttack") && r.actions.has("aim"));
    assert.equal(r.defenses.parry.mod, -3); assert.equal(r.defenses.parry.repeatPenalty, -2); assert.equal(r.defenses.parry.scope, "core");
    assert.equal(r.hooks.dodgeModifiers.length, 1); assert.equal(r.hooks.attackModifiers.length, 2, "Aim and called shots");
    assert.equal(r.active.length, 0, "no experiments on");
  }
  const ids = X.available("western", lab, C).map((x) => x.id);
  assert.ok(!ids.includes("parry") && !ids.includes("aim") && !ids.includes("block") && ids.includes("labWeaponTraits"));
  // A clean hit (margin 5) puts the Dodge at -2, logged as a setting rule; a parry is Brawling -3.
  const r = { ...X.buildRules(X.PUBLISHED, weapons, lab, C), jamOn18: true };
  const [mod] = r.hooks.dodgeModifiers[0]({ margin: 5 });
  assert.equal(mod.value, -2); assert.equal(mod.scope, "core");
  const enc = setup(X.PUBLISHED, 8); E.startCombat(enc, r);
  const opts = E.defenseOptions(enc, r, E.find(enc, "p1"), weapons.fists);
  assert.deepEqual(opts.map((o) => [o.kind, o.preview]), [["dodge", 11], ["parry", 9]]);
  // Other settings publish none of this.
  const crown = JSON.parse(readFileSync(new URL("../../../packs/fantasy/pack.json", import.meta.url)));
  // Every setting publishes the core rules; Trails of Blood & Dust adds bare-handed parries against claws.
  assert.equal(crown.combatRules, undefined);
  const cr = combatOf(crown);
  assert.deepEqual(Object.keys(cr).sort(), Object.keys(C).sort());
  assert.equal(cr.parry.bareHanded, "unarmed"); assert.equal(C.parry.bareHanded, "natural");
  const rc = { ...X.buildRules(X.PUBLISHED, weapons, lab, cr), jamOn18: true }, ec = setup(X.PUBLISHED, 8); E.startCombat(ec, rc);
  assert.deepEqual(E.defenseOptions(ec, rc, E.find(ec, "p1"), weapons.claws).map((o) => o.kind), ["dodge"], "core: no bare-handed parry against claws");
  assert.deepEqual(E.defenseOptions(ec, rc, E.find(ec, "p1"), weapons.fists).map((o) => o.kind), ["dodge", "parry"], "core: bare hands parry fists");
});

test("Enchanted weapons: +2 to hit or +1 box with that weapon only", () => {
  const roll = (...q) => () => q.shift();
  const w = { id: "sword", name: "Sword", reach: "melee", damage: { melee: { boxes: 2 } } }, other = { ...w, id: "dagger" };
  const att = (traits) => ({ id: "a", name: "A", skillTarget: 12, traits });
  const def = { id: "d", name: "D", dodgeBase: null, canDodge: false };
  const acc = LD.resolveAttack({ attacker: att([{ type: "weaponBonus", weapon: "sword", accuracy: 2, label: "Enchanted Sword" }]), defender: def, weapon: w, band: "melee" }, LD.NO_HOOKS, roll([4, 4, 4]));
  assert.equal(acc.target, 14); assert.deepEqual(acc.attackMods.map((m) => m.label), ["Enchanted Sword"]);
  const bite = LD.resolveAttack({ attacker: att([{ type: "weaponBonus", weapon: "sword", extraBox: 1 }]), defender: def, weapon: w, band: "melee" }, LD.NO_HOOKS, roll([3, 3, 3]));
  assert.equal(bite.damage.boxes, 3); assert.equal(bite.enchanted, 1);
  const no = LD.resolveAttack({ attacker: att([{ type: "weaponBonus", weapon: "sword", extraBox: 1 }]), defender: def, weapon: other, band: "melee" }, LD.NO_HOOKS, roll([3, 3, 3]));
  assert.equal(no.damage.boxes, 2, "only the enchanted weapon");
});

test("Trails of Blood & Dust Block: a real shield +1, an improvised one breaks on a 2-box hit, never against bullets", () => {
  const C = combatOf(pack), r = { ...X.buildRules(X.PUBLISHED, weapons, lab, C), jamOn18: true };
  assert.equal(r.defenses.block.mod, -2);
  const shield = pack.protection.find((g) => g.id === "shield"), chair = pack.protection.find((g) => g.id === "improvised");
  const enc = setup(X.PUBLISHED, 5); E.startCombat(enc, r);
  const ames = E.find(enc, "p1"); ames.skills.Melee = 13; E.find(enc, "p2").weapons.push("blade", "club"); E.find(enc, "p2").skills.Melee = 14;
  E.addGear(enc, "p1", chair);
  assert.deepEqual(E.defenseOptions(enc, r, ames, weapons.revolver).map((o) => o.kind), ["dodge"], "no block against a bullet");
  const blk = E.defenseOptions(enc, r, ames, weapons.blade).find((o) => o.kind === "block");
  assert.equal(blk.preview, 11, "Melee 13 -2, no bonus");
  E.addGear(enc, "p1", shield);
  assert.equal(E.defenseOptions(enc, r, ames, weapons.blade).find((o) => o.kind === "block").preview, 12, "the real shield is preferred: +1");
  // The chair alone, against a 2-box blade: block until one succeeds, and it breaks.
  ames.traits = ames.traits.filter((t) => t.label !== "Shield");
  let ev;
  for (let i = 0; i < 60 && !(ev && ev.shieldBroke); i++) { ames.blockedRound = null; ames.injury = 0; ames.dying = false; ames.dead = false; ev = E.attack(enc, r, LD, { attacker: "p2", defender: "p1", weapon: "blade", band: "melee", defense: "block" }).event; }
  assert.equal(ev.shieldBroke, "Improvised shield"); assert.equal(ev.dodged, true);
  assert.ok(!E.defenseOptions(enc, r, ames, weapons.blade).some((o) => o.kind === "block"), "broken: nothing left to block with");
  // A 1-box club doesn't break it.
  const enc2 = setup(X.PUBLISHED, 6); E.startCombat(enc2, r); const a2 = E.find(enc2, "p1"); a2.skills.Melee = 18; E.find(enc2, "p2").weapons.push("club"); E.find(enc2, "p2").skills.Melee = 14; E.addGear(enc2, "p1", chair);
  for (let i = 0; i < 10; i++) { a2.blockedRound = null; const e = E.attack(enc2, r, LD, { attacker: "p2", defender: "p1", weapon: "club", band: "melee", defense: "block" }).event; assert.equal(e.shieldBroke, null); }
});

test("Trails of Blood & Dust: one defense a round across Dodge, Parry and Block; Additional Defense gives a second", () => {
  const r = { ...X.buildRules(X.PUBLISHED, weapons, lab, combatOf(pack)), jamOn18: true };
  assert.equal(CORE.rules.oneDefense.edge, "extradefense", "a core Edge");
  const run = (extra) => {
    const enc = setup(X.PUBLISHED, 31); E.startCombat(enc, r);
    const ames = E.find(enc, "p1"); if (extra) ames.traits.push({ type: "extraDefense", value: 1, label: "Additional Defense" });
    const out = [];
    for (let i = 0; i < 3; i++) {
      const ev = E.attack(enc, r, LD, { attacker: "p2", defender: "p1", weapon: "fists", band: "melee" }).event;
      out.push(ev.success ? (ev.defenseChoice ? ev.defenseChoice.kind : "none") : "missed");
      ames.injury = 0; ames.dying = false;
    }
    return { out, opts: E.defenseOptions(enc, r, ames, weapons.fists) };
  };
  const one = run(false), two = run(true);
  const defended = (o) => o.out.filter((k) => k === "dodge" || k === "parry").length;
  assert.ok(defended(one) <= 1, "one defense: " + one.out);
  assert.ok(one.opts.every((o) => o.used) || defended(one) === 0);
  assert.ok(defended(two) <= 2, "two defenses: " + two.out);
  // Directly: after one defense, all options are used; with the Edge, not until two.
  const enc = setup(X.PUBLISHED, 2); E.startCombat(enc, r); const d = E.find(enc, "p1");
  d.defRound = enc.round; d.defCount = 1;
  assert.ok(E.defenseOptions(enc, r, d, weapons.fists).every((o) => o.used));
  d.traits.push({ type: "extraDefense", value: 1 });
  assert.ok(E.defenseOptions(enc, r, d, weapons.fists).every((o) => !o.used));
  d.defCount = 2; assert.ok(E.defenseOptions(enc, r, d, weapons.fists).every((o) => o.used));
  // Next round, it's back.
  d.defRound = enc.round - 1; assert.ok(E.defenseOptions(enc, r, d, weapons.fists).every((o) => !o.used));
});

test("Ignoring 1-box hits once per fight (Fracture Lines' commercial powered armor)", () => {
  const fl = JSON.parse(readFileSync(new URL("../../../packs/spaceopera/pack.json", import.meta.url)));
  const com = fl.protection.find((g) => g.id === "powercom"), leg = fl.protection.find((g) => g.id === "powerarmor");
  assert.ok(com.traits.find((t) => t.type === "ignoreHits").oncePerFight);
  const r = { ...X.buildRules(X.PUBLISHED, weapons, lab, combatOf(fl)), jamOn18: true };
  const hits = (suit) => {
    const enc = setup(X.PUBLISHED, 41); E.startCombat(enc, r); E.addGear(enc, "p1", suit);
    const out = [];
    for (let i = 0; i < 80 && out.length < 3; i++) { const ev = E.attack(enc, r, LD, { attacker: "p2", defender: "p1", weapon: "fists", band: "melee", canDodge: false }).event; if (ev.hit) { out.push(ev.damage || 0); const a = E.find(enc, "p1"); a.injury = 0; } }
    return out;
  };
  assert.deepEqual(hits(leg), [0, 0, 0], "legion-grade: every 1-box hit marks nothing");
  assert.deepEqual(hits(com), [0, 1, 1], "commercial: only the first");
});

test("Grievous wounds (Trails experiment): characters roll the table and can downgrade; opponents are taken out", () => {
  const cfg = X.newLabConfig("western", lab, combatOf(pack)); cfg.experiments.grievousWounds.on = true;
  const r = { ...X.buildRules(cfg, weapons, lab, combatOf(pack)), jamOn18: true };
  assert.ok(r.flags.has("grievous") && r.data.grievousWounds.table.length === 6);
  const off = { ...X.buildRules(X.newLabConfig("western", lab, combatOf(pack)), weapons, lab, combatOf(pack)), jamOn18: true };
  // An opponent hit cleanly by a 2-box weapon is taken out, described by weapon.
  let found = null;
  for (let seed = 1; seed < 400 && !found; seed++) {
    const enc = setup(cfg, seed); E.startCombat(enc, r);
    const ev = E.attack(enc, r, LD, { attacker: "p1", defender: "p2", weapon: "revolver", band: "close", canDodge: false }).event;
    if (ev.grievous) found = { ev, out: E.find(enc, "p2") };
  }
  assert.ok(found, "a grievous hit happens");
  assert.equal(found.ev.grievous.pc, false); assert.ok(found.out.takenOut && E.isOut(found.out)); assert.match(found.ev.grievous.text, /Outlaw/);
  // A character who takes one rolls the table; a point downgrades it one step.
  let pcEv = null, enc2 = null;
  for (let seed = 1; seed < 600 && !pcEv; seed++) {
    enc2 = setup(cfg, seed); E.startCombat(enc2, r); E.find(enc2, "p2").weapons.push("blade"); E.find(enc2, "p2").skills.Melee = 16;
    const ev = E.attack(enc2, r, LD, { attacker: "p2", defender: "p1", weapon: "blade", band: "melee", canDodge: false }).event;
    if (ev.grievous && ev.grievous.pc && r.data.grievousWounds.table.find((x) => x.id === ev.grievous.id).down) pcEv = ev;
  }
  assert.ok(pcEv, "a character's grievous wound with a milder step");
  const ames = E.find(enc2, "p1"), before = ames.points, entry = r.data.grievousWounds.table.find((x) => x.id === pcEv.grievous.id);
  assert.equal(ames.lasting[0].id, entry.id);
  const res = E.spendPoint(enc2, r, LD, "p1", "downgrade", { event: pcEv.n });
  assert.ok(!res.error, res.error); assert.equal(ames.points, before - 1);
  assert.equal(ames.lasting.length, 1); assert.equal(ames.lasting[0].id, entry.down);
  assert.ok(E.spendPoint(enc2, r, LD, "p1", "downgrade", { event: pcEv.n }).error, "once");
  assert.equal(S.summarize(enc2).grievous, 1);
  // Off: no grievous wounds at all.
  const enc3 = setup(X.newLabConfig("western", lab, combatOf(pack)), found.ev.key ?? 1); E.startCombat(enc3, off);
  assert.ok(!E.attack(enc3, off, LD, { attacker: "p1", defender: "p2", weapon: "revolver", band: "close", canDodge: false }).event.grievous);
});

test("Grievous wounds: a character left Dying or killed may trade a limb, once a fight", () => {
  const cfg = X.newLabConfig("western", lab, combatOf(pack)); cfg.experiments.grievousWounds.on = true;
  const r = { ...X.buildRules(cfg, weapons, lab, combatOf(pack)), jamOn18: true };
  let enc, ev;
  for (let seed = 1; seed < 300 && !ev; seed++) {
    enc = setup(cfg, seed); E.startCombat(enc, r); const a = E.find(enc, "p1"); a.injury = 2;
    const e = E.attack(enc, r, LD, { attacker: "p2", defender: "p1", weapon: "revolver", band: "close", canDodge: false }).event;
    if (e.dying) ev = e;
  }
  assert.ok(ev, "a hit that leaves Ames Dying");
  const ames = E.find(enc, "p1");
  const res = E.tradeLimb(enc, r, ev.n, "crippled");
  assert.ok(!res.error, res.error);
  assert.equal(ames.dying, false); assert.equal(ames.injury, 3);
  assert.ok(ames.lasting.some((w) => w.id === "limb-crippled" && w.complication));
  assert.equal(ames.lasting.filter((w) => w.about === ev.n).length, 1, "one wound for one hit, even if it was grievous");
  assert.ok(E.tradeLimb(enc, r, ev.n, "lost").error, "once");
  assert.equal(S.summarize(enc).limbTrades, 1);
  const off = { ...X.buildRules(X.newLabConfig("western", lab, combatOf(pack)), weapons, lab, combatOf(pack)), jamOn18: true };
  assert.ok(E.tradeLimb(enc, off, ev.n, "lost").error, "not without the experiment");
});

test("Telling hits (core): by 5+ or a natural 3-4 past the defense; called shots at -2/-4; shrug off with the Edge or a point", () => {
  const C = combatOf(pack), r = { ...X.buildRules(X.PUBLISHED, weapons, lab, C), jamOn18: true };
  assert.ok(r.flags.has("telling")); assert.equal(r.params.tellingHits.margin, 5);
  let enc, big, small;
  for (let seed = 1; seed < 400 && !(big && small); seed++) {
    enc = setup(X.PUBLISHED, seed); E.startCombat(enc, r);
    const ev = E.attack(enc, r, LD, { attacker: "p1", defender: "p2", weapon: "revolver", band: "close", canDodge: false }).event;
    if (ev.hit && ev.margin >= 5 && !big) big = ev;
    if (ev.hit && ev.margin < 5 && ev.auto !== "success" && !small) small = ev;
  }
  assert.ok(big.telling && big.telling.effect === null, "the attacker picks"); assert.equal(small.telling, null, "an ordinary hit isn't telling");
  // A called shot: -2 (or -4) on the roll, and any hit gets the effect.
  let called;
  for (let seed = 1; seed < 400 && !called; seed++) {
    enc = setup(X.PUBLISHED, seed); E.startCombat(enc, r);
    E.find(enc, "p1").traits = [{ type: "shrugTelling", oncePerFight: true, label: "Hard to put down" }];
    const ev = E.attack(enc, r, LD, { attacker: "p2", defender: "p1", weapon: "revolver", band: "close", canDodge: false, called: { effect: "disarm", small: true } }).event;
    assert.equal(ev.attackMods.find((m) => m.source === "called").value, -4);
    if (ev.hit) called = ev;
  }
  assert.deepEqual([called.telling.called, called.telling.effect], [true, "disarm"]);
  assert.ok(E.tellingEffect(enc, called.n, "pin").event, "the attacker can change it");
  // The defender shrugs it off once with the Edge; the boxes stand.
  const boxes = E.find(enc, "p1").injury;
  assert.ok(!E.shrugTelling(enc, called.n, "edge").error);
  assert.equal(called.telling.shrugged, "edge"); assert.equal(E.find(enc, "p1").injury, boxes);
  assert.ok(E.shrugTelling(enc, called.n, "point").error, "once per hit");
  assert.ok(E.tellingEffect(enc, called.n, "rattle").error, "nothing to change once shrugged off");
  const s = S.summarize(enc); assert.equal(s.tellingHits, 1); assert.equal(s.shrugged, 1);
  // A point works too, and only a character shrugs one off.
  let again;
  for (let i = 0; i < 60 && !again; i++) { const ev = E.attack(enc, r, LD, { attacker: "p2", defender: "p1", weapon: "revolver", band: "close", canDodge: false, called: { effect: "rattle" } }).event; if (ev.hit) again = ev; }
  if (again && !E.find(enc, "p1").dead) {
    assert.ok(E.shrugTelling(enc, again.n, "edge").error, "Hard to put down: once a fight");
    const pts = E.find(enc, "p1").points; assert.ok(!E.shrugTelling(enc, again.n, "point").error); assert.equal(E.find(enc, "p1").points, pts - 1);
  }
  assert.ok(E.shrugTelling(enc, big.n, "point").error, "an opponent doesn't");
});
