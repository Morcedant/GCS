// Move and reach: Move from Agility, Body, Athletics and origin speed; each weapon in hand's reach.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";

test("Move: 5 yards, +1 per 2 points of Agility + Body above 20, plus Athletics and origin speed", () => {
  assert.equal(LD.moveYards(9, 9, 0), 5, "never less than 5 from attributes");
  assert.equal(LD.moveYards(10, 10, 0), 5);
  assert.equal(LD.moveYards(11, 10, 0), 5, "rounded down");
  assert.equal(LD.moveYards(11, 11, 1), 7, "typical: 22, Trained");
  assert.equal(LD.moveYards(13, 12, 2), 9, "athletic: 25, Specialty");
  assert.equal(LD.moveYards(15, 15, 2, 1), 13, "top end");
  assert.equal(LD.moveYards(10, 10, 0, -1), 4, "a slow origin");
  assert.equal(LD.THREAT_MOVE, 8);
});

test("every weapon in hand in the four settings has a reach of 1 to 3 yards, shown in its table row", () => {
  for (const pid of ["western", "fantasy", "spaceopera", "aurora"]) {
    const p = JSON.parse(readFileSync(new URL(`../../../packs/${pid}/pack.json`, import.meta.url)));
    for (const a of p.arms.filter((x) => x.reach === "melee")) {
      assert.ok([1, 2, 3].includes(a.reachYards), `${pid} ${a.id}: reach ${a.reachYards}`);
      assert.equal(LD.reachYards(a), a.reachYards);
      for (const r of a.rows || []) if (/^Melee/.test(r[1])) assert.match(r[1], new RegExp(`reach ${a.reachYards} yd`), `${pid} ${a.id} row`);
    }
    assert.equal(LD.reachYards(p.arms.find((x) => x.band)), null, "a ranged weapon has no reach");
  }
});

test("telling-hit effects follow the weapon: a shot can't pin, bare hands don't break gear", async () => {
  const X = await import("../experiments.js");
  const ids = (w, sk) => X.tellingEffectsFor(w, sk).map(([id]) => id);
  const western = JSON.parse(readFileSync(new URL("../../../packs/western/pack.json", import.meta.url)));
  const W = Object.fromEntries(western.arms.filter((a) => a.id).map((a) => [a.id, a]));
  assert.deepEqual(ids(W.blade), ["disarm", "knockdown", "pin", "rattle", "break", "open", "precise"], "a saber: everything");
  assert.deepEqual(ids(W.fists), ["disarm", "knockdown", "pin", "rattle", "open", "precise"], "fists: no breaking gear");
  assert.ok(!ids(W.claws).includes("break"), "claws are natural (Brawling)");
  assert.deepEqual(ids(W.revolver), ["disarm", "knockdown", "rattle", "break", "open", "precise"], "a 2-box shot: no pin");
  assert.deepEqual(ids(W.bow), ["disarm", "rattle", "break", "open", "precise"], "a 1-box arrow: no pin, no knock down");
  const so = JSON.parse(readFileSync(new URL("../../../packs/spaceopera/pack.json", import.meta.url)));
  const S = Object.fromEntries(so.arms.filter((a) => a.id).map((a) => [a.id, a]));
  assert.ok(ids(S.stunner).includes("knockdown"), "a stunner knocks down by its own entry");
  assert.ok(!ids(S.fists, { melee: "Close Combat", unarmed: "Close Combat" }).includes("break"), "fists, where one skill covers both");
  assert.ok(ids(S.knife, { melee: "Close Combat", unarmed: "Close Combat" }).includes("break"), "a knife, where one skill covers both");
  assert.equal(X.tellingEffectsFor(null).length, 7, "no weapon given: every effect");
});

test("injury slows Move: −2 yards wounded, half seriously wounded, none incapacitated, never below 1 while acting", () => {
  assert.equal(LD.injuredMove(8, 0), 8);
  assert.equal(LD.injuredMove(8, 1), 6);
  assert.equal(LD.injuredMove(9, 2), 4, "half, rounded down");
  assert.equal(LD.injuredMove(8, 3), 0);
  assert.equal(LD.injuredMove(2, 1), 1, "never below 1 yard");
});

test("distances fall in the range bands", () => {
  assert.deepEqual([1, 10, 11, 25, 26, 100, 300, 1000].map(LD.bandForYards), ["close", "close", "short", "short", "medium", "medium", "long", "extreme"]);
  assert.equal(LD.bandForYards(1001), null);
});
