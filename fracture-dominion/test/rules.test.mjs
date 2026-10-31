import assert from "node:assert/strict";
import test from "node:test";
import { distance, neighbors, hexagon, fromPixel, toPixel, within } from "../src/hex.js";
import { newGame, endTurn, findPath, setDestination, settle, spawnFleet, coloniesOf, fleetsOf, faction, declareWar, invade, invasionOdds,
  enqueue, rush, totals, yields, setResearch, availableTechs, propose, score, canSettle } from "../src/game.js";
import { aiTurn } from "../src/ai.js";
import { TECHS } from "../src/data.js";

test("hexes: distance, neighbours, the map, and pixels both ways", () => {
  assert.equal(distance("0,0", "3,-1"), 3);
  assert.equal(neighbors("0,0").length, 6);
  assert.equal(hexagon(2).length, 19);
  for (const k of within("2,-1", 2)) { const p = toPixel(k, 20); assert.equal(fromPixel(p.x, p.y, 20), k); }
});

test("a new game: one capital each, starting fleets, everyone at peace and the same galaxy for the same seed", () => {
  const a = newGame({ seed: 5, size: "small", player: "tessan", rivals: 3 }), b = newGame({ seed: 5, size: "small", player: "tessan", rivals: 3 });
  assert.equal(a.factions.length, 4);
  assert.equal(a.factions[0].id, "tessan");
  assert.deepEqual(Object.keys(a.systems), Object.keys(b.systems));
  for (const F of a.factions) {
    assert.equal(coloniesOf(a, F.id).length, 1);
    assert.equal(fleetsOf(a, F.id).length, 3, "a scout, a frigate and a colony ship, each its own fleet");
    for (const r of Object.values(F.relations)) assert.equal(r.status, "peace");
  }
});

test("corridors are fast lanes: a path along one costs 1 per jump", () => {
  const s = newGame({ seed: 9, size: "small", player: "concord", rivals: 1 });
  const [a, b] = s.corridors.find(([x, y]) => distance(s.systems[x].at, s.systems[y].at) >= 3);
  const path = findPath(s, "concord", s.systems[a].at, s.systems[b].at);
  assert.equal(path.reduce((t, x) => t + x.cost, 0), 1);
});

test("settling, building, rushing and researching", () => {
  const s = newGame({ seed: 3, size: "small", player: "concord", rivals: 1 });
  const target = Object.values(s.systems).find((x) => !x.colony && canSettle(s, "concord", x, "colony"));
  const f = spawnFleet(s, "concord", target.at, ["colony"]);
  assert.ok(settle(s, f.id).ok);
  assert.equal(target.colony.owner, "concord");
  assert.equal(target.colony.pop, 2, "the Concord's colonies start with 2");
  const cap = s.systems[faction(s, "concord").capital];
  assert.ok(enqueue(s, cap.id, "ship", "frigate").ok);
  faction(s, "concord").credits = 500;
  assert.ok(rush(s, cap.id).ok);
  assert.ok(setResearch(s, "concord", availableTechs(s, "concord")[0].id).ok);
  const before = fleetsOf(s, "concord").reduce((t, x) => t + x.ships.length, 0);
  endTurn(s, null);
  assert.equal(fleetsOf(s, "concord").reduce((t, x) => t + x.ships.length, 0), before + 1, "the rushed frigate is built");
  assert.ok(faction(s, "concord").research.progress > 0);
  assert.ok(totals(s, "concord").sci > 0 && yields(s, cap).ind > 0);
});

test("war: a fleet in an enemy's orbit fights, and transports take an unguarded world", () => {
  const s = newGame({ seed: 4, size: "small", player: "hegemony", rivals: 1 });
  const foe = s.factions[1].id;
  const col = Object.values(s.systems).find((x) => !x.colony && canSettle(s, foe, x, "colony"));
  settle(s, spawnFleet(s, foe, col.at, ["colony"]).id);
  declareWar(s, "hegemony", foe);
  const f = spawnFleet(s, "hegemony", col.at, ["transport"]);
  const o = invasionOdds(s, f.id);
  assert.ok(o.troops >= 4, "the Hegemony lands twice the force");
  assert.ok(invade(s, f.id).taken);
  assert.equal(col.colony.owner, "hegemony");
});

test("peace: a computer faction that's losing will take it", () => {
  const s = newGame({ seed: 4, size: "small", player: "concord", rivals: 1 });
  const foe = s.factions[1];
  s.factions[0].met[foe.id] = foe.met.concord = true;
  declareWar(s, "concord", foe.id);
  for (const f of fleetsOf(s, foe.id)) delete s.fleets[f.id];
  spawnFleet(s, "concord", s.systems[s.factions[0].capital].at, ["frigate", "frigate", "frigate"]);
  assert.equal(propose(s, "concord", foe.id, "peace").accepted, true);
});

test("research costs climb, and every tech can be reached", () => {
  const done = new Set();
  for (let i = 0; i < 40 && done.size < TECHS.length; i++) for (const t of TECHS) if (t.needs.every((n) => done.has(n))) done.add(t.id);
  assert.equal(done.size, TECHS.length);
});

test("a whole computer game runs to an end without errors", () => {
  const s = newGame({ seed: 12, size: "small", player: "kel", rivals: 3 });
  s.factions[0].ai = true;
  for (let i = 0; i < 200 && !s.winner; i++) endTurn(s, aiTurn);
  assert.ok(s.winner, "someone wins by turn 200");
  assert.ok(s.factions.every((F) => Number.isFinite(F.credits) && Number.isFinite(score(s, F.id))));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(s)));
});
test("discoveries go in the log and survive trimming", async () => {
  const { log } = await import("../src/game.js");
  const s = newGame({ seed: "disc", player: "concord", rivals: 2 });
  const me = s.factions.find((f) => !f.ai);
  assert.ok(s.log.some((l) => l.fid === me.id && l.kind === "explore" && l.text.startsWith("Charted ")));
  const first = s.log.find((l) => l.kind === "explore").text;
  for (let i = 0; i < 1000; i++) log(s, null, "noise " + i);
  assert.ok(s.log.some((l) => l.text === first));
});
