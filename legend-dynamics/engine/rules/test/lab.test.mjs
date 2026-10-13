import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";
import * as E from "../../lab/encounter.js";
import * as S from "../../lab/stats.js";

const pack = JSON.parse(readFileSync(new URL("../../../packs/western/pack.json", import.meta.url)));
const lab = JSON.parse(readFileSync(new URL("../../../packs/western/lab.json", import.meta.url)));
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
