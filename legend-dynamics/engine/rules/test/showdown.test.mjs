// Trails of Blood & Dust showdowns: a staredown (Will), a draw (Shooting), and shots that can't be dodged.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";
import * as E from "../../lab/encounter.js";

const CORE = JSON.parse(readFileSync(new URL("../../combat.json", import.meta.url)));
const revolver = { id: "revolver", name: "Revolver", skill: "Shooting", firearm: true, range: { short: 0, medium: -2, long: -4 }, damage: { short: { boxes: 2 }, medium: { boxes: 2 }, long: { boxes: 1 } } };
const rules = X.buildRules(X.PUBLISHED, { revolver }, null, JSON.parse(JSON.stringify(CORE.rules)));

function street(seed, o = {}) {
  const enc = E.newEncounter({ name: "Main Street", setting: "western", baseline: LD.CORE_BASELINE, config: X.PUBLISHED, seed });
  E.addParticipant(enc, { kind: "pc", name: "Ruth", agility: 13, dodge: 11, will: o.ruthWill ?? 11, skills: { Shooting: o.ruthGun ?? 15 }, weapons: ["revolver"], ...(o.ruth || {}) });
  E.addParticipant(enc, { kind: "npc", name: "Kid Lassiter", agility: 13, dodge: 10, will: o.kidWill ?? 10, skills: { Shooting: o.kidGun ?? 14 }, weapons: ["revolver"], ...(o.kid || {}) });
  E.startCombat(enc, rules);
  const [ruth, kid] = enc.participants;
  return { enc, ruth, kid };
}
const stare = (f) => E.showdown(f.enc, rules, LD, { phase: "stare", attacker: f.ruth.pid, defender: f.kid.pid });
const draw = (f) => E.showdown(f.enc, rules, LD, { phase: "draw", attacker: f.ruth.pid, defender: f.kid.pid, weapon: "revolver", defWeapon: "revolver", band: "short" });

test("the staredown's winner gets +2 on the draw", () => {
  for (let seed = 1; seed < 60; seed++) {
    const f = street(seed), s = stare(f).event;
    if (!s.winner) continue;
    const d = draw(f).event, mine = d.rolls.find((r) => r.pid === s.winner.pid), theirs = d.rolls.find((r) => r.pid !== s.winner.pid);
    assert.ok(mine.mods.some((m) => m.label === "Won the staredown" && m.value === 2));
    assert.ok(!theirs.mods.some((m) => m.label === "Won the staredown"));
    return;
  }
  assert.fail("no staredown had a winner");
});

test("the shots can't be dodged, and the winner fires first", () => {
  let checked = 0;
  for (let seed = 1; seed < 200 && checked < 10; seed++) {
    const f = street(seed), r = draw(f);
    assert.ok(!r.error, r.error);
    if (!r.event.winner || r.event.fumbled.length) continue;
    checked++;
    assert.ok(r.shots.length >= 1);
    assert.equal(r.shots[0].attacker.pid, r.event.winner.pid);
    for (const s of r.shots) assert.equal(s.canDodge, false);
    // The one fired on shoots back only if still standing.
    const loser = r.event.winner.pid === f.ruth.pid ? f.kid : f.ruth;
    if (E.isOut(loser)) assert.equal(r.shots.length, 1);
    else assert.equal(r.shots.length, 2);
  }
  assert.ok(checked >= 5);
});

test("a tied draw fires together; the Gunslinger's quick draw wins it", () => {
  for (let seed = 1; seed < 2000; seed++) {
    const f = street(seed), r = draw(f).event;
    if (r.winner || r.fumbled.length) continue;
    assert.equal(draw(street(seed)).shots.length, 2, "both fire on a tie");
    const g = street(seed, { ruth: { drawFirst: true } }), q = draw(g);
    assert.equal(q.event.winner.pid, g.ruth.pid);
    assert.equal(q.event.tieBreak, true);
    assert.equal(q.shots[0].attacker.pid, g.ruth.pid);
    return;
  }
  assert.fail("no tie found");
});

test("Quick Draw adds to the draw, and a fumble fires no shot", () => {
  const f = street(5, { ruth: { drawBonus: 2 } }), r = draw(f).event;
  assert.ok(r.rolls[0].mods.some((m) => m.label === "Quick Draw" && m.value === 2));
  for (let seed = 1; seed < 500; seed++) {
    const g = street(seed, { kidGun: 8 }), x = draw(g);
    if (!x.event.fumbled.includes(g.kid.pid)) continue;
    assert.ok(x.shots.every((s) => s.attacker.pid !== g.kid.pid));
    return;
  }
  assert.fail("no fumble found");
});

test("a broken nerve is logged, and the showdown replays the same", () => {
  for (let seed = 1; seed < 500; seed++) {
    const f = street(seed, { kidWill: 6 }), s = stare(f).event;
    if (!s.broke.some((b) => b.pid === f.kid.pid)) continue;
    draw(f);
    const again = E.replay(f.enc, rules, LD, X.PUBLISHED);
    const shots = (e) => e.events.filter((x) => x.type === "attack").map((x) => [x.attacker.pid, x.hit, x.damage]);
    assert.equal(again.encounter.skipped, 0);
    assert.deepEqual(shots(again.encounter), shots(f.enc));
    return;
  }
  assert.fail("no broken nerve found");
});

test("a showdown needs two duelists still standing", () => {
  const f = street(1);
  assert.ok(E.showdown(f.enc, rules, LD, { phase: "stare", attacker: f.ruth.pid, defender: f.ruth.pid }).error);
  f.kid.injury = 3;
  assert.ok(stare(f).error);
});
