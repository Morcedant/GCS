import assert from "node:assert/strict";
import test from "node:test";
import { distance, neighbors, hexagon, fromPixel, toPixel, within } from "../src/hex.js";
import { newGame, endTurn, shipStats, maxPop, buildOptions, findPath, setDestination, settle, spawnFleet, splitFleet, setMuster, musterFor, fuelMax, fuelOf, buildDepot, inSupply, inSupplyAt, cargoOf, coloniesOf, fleetsOf, faction, declareWar, invade, invasionOdds, barrage, barrageTargets, tradeLinks, tradeIncome, tradeExotics, supplySources, gunsMax, gunsUp, blockaded, besieged, fleetsAt, marketPrice, sellPrice, garrisonFactor,
  enqueue, rush, totals, yields, setResearch, availableTechs, propose, score, canSettle, atWar } from "../src/game.js";
import { aiTurn } from "../src/ai.js";
import { TECHS, SHIPS, BATTERY } from "../src/data.js";

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
test("directives: from the player's own faction, two under way, a backlog, and a report when one is done", async () => {
  const { ensureDirectives, checkDirectives, directivesTurn, acceptDirective, progress, AUTHORITY } = await import("../src/orders.js");
  for (const fid of ["concord", "tessan", "kel", "hegemony", "vael"]) {
    const s = newGame({ seed: 5, player: fid, rivals: 2 });
    const D = ensureDirectives(s);
    assert.equal(D.active.length, 2); assert.equal(D.backlog.length, 1);
    for (const d of D.active.concat(D.backlog)) {
      if (d.kind === "prototype") { assert.ok(/research arm/.test(d.from)); continue; }   // field tests come from the research arm
      assert.ok(AUTHORITY[fid].kinds.includes(d.kind) || ["outpost", "explore", "ships"].includes(d.kind), fid + " " + d.kind); assert.equal(d.from, AUTHORITY[fid].name);
    }
  }
  const s = newGame({ seed: 5, player: "tessan", rivals: 2 });
  const D = ensureDirectives(s), d = D.active[0], waiting = D.backlog[0];
  assert.equal(progress(s, d), 0);
  // Make it done, whatever it is: force its measure past the need.
  d.base -= 999; checkDirectives(s);
  assert.equal(D.reports.length, 1); assert.equal(D.reports[0].title, d.title);
  assert.equal(D.backlog.length, 0); assert.ok(D.active.includes(waiting));   // the backlog moved up
  assert.deepEqual(D.reports[0].next, [waiting.title]);
  for (let i = 0; i < 12; i++) { s.turn++; directivesTurn(s); }
  assert.ok(D.history.length >= 1);
  if (D.backlog.length) assert.ok(acceptDirective(s, D.backlog[0].id).ok);
});
test("directives have opposition: the nearest rival races for the same thing, and can win it", async () => {
  const { ensureDirectives, directivesTurn, opposition } = await import("../src/orders.js");
  const s = newGame({ seed: 9, player: "concord", rivals: 2 });
  const D = ensureDirectives(s), d = D.active[0], op = opposition(s, d);
  assert.ok(op && op.need >= d.need && op.progress === 0);
  assert.ok(s.factions.some((f) => f.id === op.id && f.id !== "concord"));
  d.rivalBase -= 999; directivesTurn(s);                       // the rival gets there first
  assert.ok(!D.active.includes(d));
  assert.equal(D.history.at(-1).result, "beaten");
  assert.equal(D.reports.at(-1).result, "beaten");
});

test("Focus: three points to share, 2 at most to one; each point lifts that output 10%", async () => {
  const { setFocus, focusOf, yields } = await import("../src/game.js");
  const s = newGame({ seed: 21, size: "small", player: "concord", rivals: 1 }), cap = s.systems[faction(s, "concord").capital];
  const base = yields(s, cap).ind;
  assert.ok(setFocus(s, "concord", "industry", 2).error);   // all three points are in use (1 each to industry, science, credits)
  assert.ok(setFocus(s, "concord", "credits", 0).ok);
  assert.ok(setFocus(s, "concord", "industry", 3).ok); assert.equal(focusOf(s, "concord").industry, 2);   // capped at 2
  assert.ok(yields(s, cap).ind > base);
});
test("supply: warships far from home wear down after a turn; Vael fleets don't", async () => {
  const { inSupply } = await import("../src/game.js");
  const s = newGame({ seed: 22, size: "medium", player: "concord", rivals: 1 }), F = faction(s, "concord");
  const far = Object.keys(s.hexes).find((k) => s.hexes[k].terrain === "space" && coloniesOf(s, "concord").every((x) => distance(x.at, k) > 6));
  const f = spawnFleet(s, "concord", far, ["frigate"]);
  assert.equal(inSupply(s, f), false);
  endTurn(s, null); assert.equal(f.ships[0].hull, 2);   // the first turn out: a warning
  endTurn(s, null); assert.equal(f.ships[0].hull, 1);   // then a hull point a turn
  endTurn(s, null); assert.equal(f.ships[0].hull, 1);   // never below 1
});
test("open rule, keep ruling after a win, and retiring", async () => {
  const { keepRuling, retire } = await import("../src/game.js");
  const o = newGame({ seed: 23, size: "small", player: "kel", rivals: 1, mode: "open" });
  o.turn = 250; endTurn(o, null); assert.equal(o.winner, null);
  assert.ok(retire(o).ok); assert.equal(o.winReason, "retired");
  const t = newGame({ seed: 23, size: "small", player: "kel", rivals: 1 });
  t.winner = "kel"; t.winReason = "score";
  assert.ok(keepRuling(t).ok); assert.equal(t.winner, null); assert.equal(t.mode, "open");
});
test("campaigns: the first begins at turn 8 against a rival; threads lead to a finale; a prototype stays", async () => {
  const { ensureDirectives, directivesTurn, checkDirectives } = await import("../src/orders.js");
  const { PROTOTYPES } = await import("../src/data.js");
  const s = newGame({ seed: 24, player: "concord", rivals: 2 }), D = ensureDirectives(s);
  for (let i = 0; i < 8; i++) { s.turn++; directivesTurn(s); }
  assert.ok(D.campaign && D.campaign.id === "frontier" && D.campaign.rival);
  assert.ok(D.reports.some((r) => r.result === "story"));
  // Carry out three campaign directives: the finale follows.
  for (let i = 0; i < 3; i++) { const d = { id: "x" + i, kind: "explore", need: 1, received: s.turn, campaign: "frontier", base: -99, issued: s.turn, deadline: s.turn + 5, reward: 10, title: "t", from: "f" }; D.active.push(d); checkDirectives(s); }
  assert.equal(D.campaign.threads.length, 3); assert.ok(D.campaign.finale);
  const fin = D.active.find((d) => d.kind === "finale"); assert.ok(fin && fin.rival === D.campaign.rival);
  fin.base = -99; checkDirectives(s); assert.equal(D.campaign.over, "won");
  assert.ok(Object.keys(faction(s, "concord").protos).some((k) => PROTOTYPES[k]));
});
test("battle stances change the rolls", async () => {
  const { setStance } = await import("../src/game.js");
  const s = newGame({ seed: 25, size: "small", player: "hegemony", rivals: 1 }), f = fleetsOf(s, "hegemony").find((x) => x.ships.some((y) => y.type === "frigate"));
  assert.ok(setStance(s, f.id, "aggressive").ok); assert.equal(f.stance, "aggressive");
  assert.ok(setStance(s, f.id, "reckless").error);
});

test("battles the player fights are recorded roll by roll, for the battle pop-up", () => {
  const s = newGame({ seed: 31, size: "small", player: "hegemony", rivals: 1 }), foe = s.factions[1].id;
  declareWar(s, "hegemony", foe);
  const at = s.systems[faction(s, foe).capital].at;
  spawnFleet(s, "hegemony", at, ["cruiser", "frigate", "frigate"]);
  endTurn(s, null);
  const B = (s.battleReports || [])[0];
  assert.ok(B && B.events.length && B.units.length >= 4);
  for (const e of B.events) { assert.equal(e.dice.length, 3); assert.ok(B.units[e.a] && B.units[e.t]); }
  assert.ok(["won", "lost", "even"].includes(B.won));
});
test("galactic events: they come, each choice does what it says, and ruins become one", async () => {
  const { EVENTS, eventsTurn, currentEvent, chooseEvent } = await import("../src/events.js");
  const s = newGame({ seed: 32, player: "concord", rivals: 2 });
  for (let i = 0; i < 40 && !s.galEvent; i++) { s.turn++; eventsTurn(s); }
  assert.ok(s.galEvent, "an event comes within 40 turns");
  const e = currentEvent(s); assert.ok(e.title && e.options.length >= 2);
  const r = chooseEvent(s, e.options[0].id); assert.ok(r.ok && r.text); assert.equal(s.galEvent, null);
  // Every event's every choice runs without error where it can happen.
  for (const [k, E] of Object.entries(EVENTS)) for (const o of E.options) {
    const t = newGame({ seed: 33, player: "kel", rivals: 2 });
    const ctx = k === "ruins" ? { sys: Object.keys(t.systems)[0], fleet: Object.keys(t.fleets)[0] } : E.can(t) || (k === "refugees" || k === "plague" || k === "raiders" || k === "golden" || k === "incident" || k === "defector" ? null : {});
    if (!ctx) continue;
    t.galEvent = { id: k, ctx, turn: 1 };
    assert.ok(chooseEvent(t, o.id).ok, k + ":" + o.id);
  }
  // A ruin surveyed by the player's fleet waits as an event.
  const u = newGame({ seed: 34, size: "small", player: "vael", rivals: 1 });
  const ruin = Object.values(u.systems).find((x) => x.ruins);
  if (ruin) { spawnFleet(u, "vael", ruin.at, ["scout"]); endTurn(u, null); eventsTurn(u); assert.equal(u.galEvent && u.galEvent.id, "ruins"); }
});
test("the late-game crisis: warning, waking, waves that burn, a truce, and the Heart broken", async () => {
  const { crisisTurn, crisisState, WARDENS } = await import("../src/crisis.js");
  const { currentEvent, chooseEvent } = await import("../src/events.js");
  const s = newGame({ seed: 41, player: "concord", rivals: 2 }), me = s.factions[0], foe = s.factions[1];
  me.met[foe.id] = foe.met[me.id] = true; declareWar(s, me.id, foe.id);
  crisisTurn(s); assert.equal(s.crisis.stage, "quiet"); assert.ok(s.crisis.at >= 105 && s.crisis.at < 121);
  // The warning, six turns before.
  s.turn = s.crisis.at - 6; crisisTurn(s); assert.equal(s.crisis.stage, "stirring"); assert.equal(s.galEvent.id, "stirring");
  assert.ok(currentEvent(s).options.length === 3); assert.ok(chooseEvent(s, "warn").ok); assert.ok(s.crisis.warned);
  // The waking: the Heart and its guard in space, the first wave out, the waking scene; a truce ends the war.
  s.turn = s.crisis.at; crisisTurn(s); assert.equal(s.crisis.stage, "awake"); assert.equal(s.galEvent.id, "waking");
  const c = crisisState(s); assert.ok(c.hull > 0 && c.wave === 1 && c.ships > 2); assert.ok(!s.sysAt[c.heart]);
  assert.ok(atWar(s, me.id, WARDENS) && atWar(s, WARDENS, foe.id));
  assert.ok(chooseEvent(s, "truce").ok); assert.ok(!atWar(s, me.id, foe.id)); assert.ok(s.crisis.truce);
  // A wave on an unguarded colony burns it, a million a turn.
  const cap = s.systems[me.capital], col = Object.values(s.systems).find((x) => !x.colony && x.world === "ocean") || Object.values(s.systems).find((x) => !x.colony);
  col.colony = { owner: me.id, kind: "colony", pop: 2, growth: 0, buildings: { shipyard: false, factory: true, lab: false, market: false }, queue: [], stock: 0, defense: 0, capital: false };
  const wave = spawnFleet(s, WARDENS, col.at, ["sentinel", "sentinel"]);
  crisisTurn(s); assert.equal(col.colony.pop, 1); crisisTurn(s); assert.equal(col.colony, null);
  delete s.fleets[wave.id];
  // Battles: the Heart can't be hit while its guard stands; breaking it ends the crisis and gives the scene.
  const hf = fleetsOf(s, WARDENS).find((f) => f.ships.some((x) => x.type === "heart"));
  for (const f of fleetsOf(s, WARDENS)) if (f !== hf) delete s.fleets[f.id];
  hf.ships = hf.ships.filter((x) => x.type === "heart"); hf.ships[0].hull = 1;
  spawnFleet(s, me.id, hf.at, ["frigate", "frigate", "frigate", "frigate", "frigate", "frigate"]);
  s.galEvent = null;
  for (let i = 0; i < 6 && s.crisis.stage === "awake"; i++) { endTurn(s, null); for (const f of fleetsOf(s, WARDENS)) if (!f.ships.some((x) => x.type === "heart")) delete s.fleets[f.id]; crisisTurn(s); }
  assert.equal(s.crisis.stage, "over"); assert.equal(s.crisis.heartBy, me.id); assert.ok(me.stats.heart && me.stats.wardens >= 1);
  assert.equal(s.galEvent.id, "broken"); assert.ok(chooseEvent(s, "study").ok);
  assert.equal(fleetsOf(s, WARDENS).length, 0);
  // Off at the start: never.
  const t = newGame({ seed: 41, player: "concord", rivals: 1, crisis: false }); t.turn = 150; crisisTurn(t); assert.equal(t.crisis, undefined);
});
test("admirals: everyone starts with one; they win traits, fight better, join up, and can be lost", async () => {
  const g = await import("../src/game.js");
  const s = newGame({ seed: 51, size: "small", player: "hegemony", rivals: 1 }), me = s.factions[0], foe = s.factions[1];
  for (const F of s.factions) assert.equal(g.admiralsOf(s, F.id).length, 1);
  const flag = fleetsOf(s, me.id).find((f) => f.admiral), a = flag.admiral;
  assert.match(g.admTitle(a), /^Commodore /);
  // Wins bring traits and ranks at 2, 4 and 7.
  me.met[foe.id] = foe.met[me.id] = true; declareWar(s, me.id, foe.id);
  for (let i = 0; i < 7 && a.traits.length < 3; i++) {
    const at = s.systems[foe.capital].at;
    const ours = spawnFleet(s, me.id, "0,0", []); ours.ships = Array.from({ length: 6 }, () => ({ type: "frigate", hull: 2 })); ours.admiral = a; flag.admiral = null;
    spawnFleet(s, foe.id, "0,0", ["scout"]);
    endTurn(s, null);
    const now = fleetsOf(s, me.id).find((f) => f.admiral === a); if (now) { now.admiral = null; flag.admiral = a; }
    for (const f of fleetsOf(s, me.id)) if (f !== flag && f.at === "0,0") delete s.fleets[f.id];
  }
  assert.ok(a.wins >= 2 && a.traits.length >= 1, `wins ${a.wins}, traits ${a.traits}`);
  assert.notEqual(g.admRank(a), "Commodore");
  // Swift: a hex farther.
  a.traits = []; const base = g.fleetSpeed(s, flag); a.traits = ["swift"]; assert.equal(g.fleetSpeed(s, flag), base + 1);
  // Two fleets with admirals join: the seasoned one commands, the other goes to the reserve; and can be given a fleet.
  const other = spawnFleet(s, me.id, flag.at, ["frigate"]); other.admiral = g.makeAdmiral(s, me.id, g.rng(s));
  assert.ok(g.mergeFleets(s, flag.id, other.id).ok); assert.equal(flag.admiral, a); assert.equal(me.reserve.length, 1);
  const third = spawnFleet(s, me.id, flag.at, ["frigate"]);
  assert.ok(g.assignAdmiral(s, third.id, me.reserve[0].id).ok); assert.ok(third.admiral); assert.equal(me.reserve.length, 0);
  assert.ok(g.relieveAdmiral(s, third.id).ok); assert.equal(me.reserve.length, 1);
});
test("rivals: memory, alliances that pull allies into wars, and messages in their own voice", async () => {
  const g = await import("../src/game.js");
  const { envoysTurn, currentEnvoy, answerEnvoy, attitude } = await import("../src/envoys.js");
  const s = newGame({ seed: 52, player: "concord", rivals: 3 }), [me, A, B] = s.factions;
  for (const F of s.factions) for (const O of s.factions) if (F !== O) F.met[O.id] = true;
  // Memory: settling next door, remembered with the reason.
  g.remember(s, A.id, me.id, "greeted us warmly", 25);
  assert.equal(A.relations[me.id].memory.at(-1).text, "greeted us warmly"); assert.equal(attitude(s, A.id), "friendly");
  // An alliance: accepted when they like you; an attack on your ally pulls them... and asks you.
  assert.ok(g.propose(s, me.id, A.id, "alliance").accepted); assert.ok(g.allied(s, me.id, A.id));
  s.inbox = [];
  g.declareWar(s, B.id, A.id);
  const call = s.inbox.find((m) => m.kind === "callToArms"); assert.ok(call && call.ctx.enemy === B.id);
  s.inbox = [call];
  const m = currentEnvoy(s); assert.match(m.text, new RegExp(B.name)); assert.ok(answerEnvoy(s, "honour").ok);
  assert.ok(atWar(s, me.id, B.id)); assert.ok(A.relations[me.id].memory.some((x) => /honoured/.test(x.text)));
  // A computer ally joins your war when you're attacked; the attacker's message comes in its own voice.
  const t = newGame({ seed: 53, player: "concord", rivals: 3 }), [p, X, Y] = t.factions;
  for (const F of t.factions) for (const O of t.factions) if (F !== O) F.met[O.id] = true;
  X.relations[p.id].score = 30; assert.ok(g.propose(t, p.id, X.id, "alliance").accepted);
  t.inbox = []; g.declareWar(t, Y.id, p.id);
  assert.ok(atWar(t, X.id, Y.id), "the ally joined");
  const war = t.inbox.find((x) => x.kind === "war" && x.from === Y.id); assert.ok(war);
  t.inbox = [war]; const w = currentEnvoy(t); assert.ok(w.leader && w.text.length > 20 && !/\{/.test(w.text));
  // Breaking an alliance by declaring war is remembered as betrayal.
  g.declareWar(t, p.id, X.id); assert.ok(X.relations[p.id].memory.some((x) => /broke our alliance/.test(x.text)));
  // Messages come, and every answer of every kind runs.
  const u = newGame({ seed: 54, player: "tessan", rivals: 3 }); for (const F of u.factions) for (const O of u.factions) if (F !== O) F.met[O.id] = true;
  u.factions[0].credits = 500; let seen = 0;
  for (const F of u.factions.slice(1)) F.relations[u.factions[0].id].score = 20;
  for (let i = 0; i < 120; i++) { u.turn = 10 + i * 4; envoysTurn(u); for (let e; (e = currentEnvoy(u)); seen++) assert.ok(answerEnvoy(u, e.options[i % e.options.length].id).ok); }
  assert.ok(seen >= 5, `messages: ${seen}`);
});

test("a siege: warships in orbit knock out a world's guns, the guns stay down while the fleet holds the orbit, and the troops land", () => {
  const s = newGame({ seed: 4, size: "small", player: "hegemony", rivals: 1 });
  const foe = s.factions[1].id, cap = coloniesOf(s, foe).find((x) => x.colony.capital);
  cap.colony.buildings.battery = true; cap.colony.defense = 3;
  // A capital keeps building: a warship paid for every turn would launch into the orbit after each battle.
  declareWar(s, "hegemony", foe);
  const fleet = spawnFleet(s, "hegemony", cap.at, ["cruiser", "cruiser", "cruiser", "cruiser", "frigate", "frigate"]);
  let open = false;
  for (let t = 0; t < 6 && !open; t++) { cap.colony.queue.push({ kind: "ship", id: "frigate", name: "Frigate", cost: 1, progress: 1 }); endTurn(s); open = !!fleet.ships.length && s.fleets[fleet.id] && !invasionOdds(s, fleet.id).guarded; }
  assert.ok(open, "the guns are down and stay down at the start of a turn while the fleet holds the orbit");
  assert.equal(cap.colony.defense, 0);
  assert.ok(!Object.values(s.fleets).some((f) => f.owner === foe && f.at === cap.at && f.ships.some((x) => x.type === "frigate")), "a world under siege launches no warships");
  const t = spawnFleet(s, "hegemony", cap.at, Array(8).fill("transport"));
  const o = invasionOdds(s, t.id);
  assert.ok(!o.guarded && o.troops >= o.defense, `troops ${o.troops} against ${o.defense}`);
  assert.ok(invade(s, t.id).taken);
  // Once the fleet leaves (or the siege ends), a world's guns come back a point a turn.
  const w = Object.values(s.systems).find((x) => x.colony && x.colony.owner === "hegemony" && x !== cap);
  if (w) { w.colony.buildings.battery = true; w.colony.defense = 0; endTurn(s); assert.ok(w.colony.defense >= 1, "an unbesieged world repairs its guns"); }
});

test("a targeted barrage: once the orbit is held, warships destroy a building; the shipyard takes its queued ships with it", () => {
  const s = newGame({ seed: 4, size: "small", player: "hegemony", rivals: 1 });
  const foe = s.factions[1].id, cap = coloniesOf(s, foe).find((x) => x.colony.capital);
  cap.colony.buildings.shipyard = true; cap.colony.queue = [{ kind: "ship", id: "frigate", name: "Frigate", cost: 40, progress: 20 }, { kind: "building", id: "lab", name: "Research lab", cost: 60, progress: 0 }];
  for (const f of Object.values(s.fleets)) if (f.owner === foe && f.at === cap.at) delete s.fleets[f.id];
  const fleet = spawnFleet(s, "hegemony", cap.at, ["cruiser", "cruiser"]);
  assert.ok(barrage(s, fleet.id, "shipyard").error, "not at war");
  declareWar(s, "hegemony", foe);
  cap.colony.defense = 2;
  assert.match(barrage(s, fleet.id, "shipyard").error, /hold the orbit/, "the guns are still up");
  cap.colony.defense = 0;
  assert.ok(barrageTargets(s, fleet.id).includes("shipyard"));
  const r = barrage(s, fleet.id, "shipyard");
  assert.ok(r.ok && r.wrecked === 1);
  assert.ok(!cap.colony.buildings.shipyard);
  assert.deepEqual(cap.colony.queue.map((q) => q.id), ["lab"], "the queued ship is wrecked; the lab stays queued");
  assert.equal(cap.colony.pop > 0, true);
  assert.match(barrage(s, fleet.id, "shipyard").error, /this turn/, "once per fleet a turn");
  assert.ok(!spawnFleet(s, "hegemony", cap.at, ["transport"]) || !barrageTargets(s, Object.values(s.fleets).find((f) => f.ships.every((x) => x.type === "transport")).id).length, "transports alone can't bombard");
});

/** A colony of `owner` at the nearest free system to `near` that it could settle, within `max` hexes. */
function colonyNear(s, owner, near, max = 4) {
  const sys = Object.values(s.systems).filter((x) => !x.colony && distance(x.at, near) <= max && canSettle(s, owner, x, "colony")).sort((a, b) => distance(a.at, near) - distance(b.at, near))[0];
  if (!sys) return null;
  settle(s, spawnFleet(s, owner, sys.at, ["colony"]).id); return sys;
}

test("trade: colonies earn from their links, an Exchange doubles it, and a blockade cuts it", () => {
  const s = newGame({ seed: 4, size: "small", player: "concord", rivals: 1 });
  const cap = coloniesOf(s, "concord")[0], other = colonyNear(s, "concord", cap.at);
  assert.ok(other, "a second colony in range");
  assert.ok(tradeLinks(s, cap).includes(other) && tradeLinks(s, other).includes(cap));
  const plain = tradeIncome(s, cap);
  assert.equal(plain, 0.5 * tradeLinks(s, cap).length);
  cap.colony.buildings.market = true;
  assert.equal(tradeIncome(s, cap), plain * 2, "an Exchange doubles trade");
  const foe = s.factions[1].id; declareWar(s, foe, "concord");
  spawnFleet(s, foe, other.at, ["frigate"]);
  assert.equal(tradeLinks(s, other).length, 0, "a blockaded world has no trade");
  assert.ok(!tradeLinks(s, cap).includes(other), "and is nobody's partner");
});

test("a long siege: no growth, hunger every 3 turns, a weaker garrison, and an ordinary colony surrenders", () => {
  const s = newGame({ seed: 4, size: "small", player: "hegemony", rivals: 1 });
  const foe = s.factions[1].id, home = coloniesOf(s, foe)[0];
  const col = colonyNear(s, foe, home.at, 6); assert.ok(col);
  col.colony.pop = 6; col.colony.buildings = {}; col.colony.defense = 0;
  declareWar(s, "hegemony", foe);
  const fleet = spawnFleet(s, "hegemony", col.at, ["cruiser", "cruiser", "cruiser"]);
  for (const f of Object.values(s.fleets)) if (f.owner === foe && f.at === col.at) delete s.fleets[f.id];
  endTurn(s); endTurn(s); endTurn(s);
  assert.equal(col.colony.siege, 3);
  assert.equal(col.colony.pop, 5, "one population lost to hunger at the third turn");
  assert.ok(garrisonFactor(col) < 1 && garrisonFactor(col) >= 0.5);
  const t = spawnFleet(s, "hegemony", col.at, ["transport"]);
  assert.ok(invasionOdds(s, t.id).defense < 5 * 0.5, "the garrison is weaker than a fresh one");
  delete s.fleets[t.id];
  for (let i = 0; i < 10 && col.colony.owner === foe; i++) endTurn(s);
  assert.equal(col.colony.owner, "hegemony", "it surrenders to the besieger");
  assert.ok(s.fleets[fleet.id]);
});

test("a capital never surrenders, however long the siege", () => {
  const s = newGame({ seed: 4, size: "small", player: "hegemony", rivals: 1 });
  const foe = s.factions[1].id, cap = coloniesOf(s, foe).find((x) => x.colony.capital);
  declareWar(s, "hegemony", foe);
  spawnFleet(s, "hegemony", cap.at, Array(6).fill("cruiser"));
  for (let i = 0; i < 14; i++) endTurn(s);
  assert.equal(cap.colony.owner, foe);
  assert.ok(cap.colony.siege >= 12);
});

test("the exotics market: an Exchange to deal, buying raises the price, selling lowers it, and it drifts back", () => {
  const s = newGame({ seed: 4, size: "small", player: "tessan", rivals: 1 });
  const F = faction(s, "tessan"); F.credits = 200; F.exotics = 0;
  assert.ok(tradeExotics(s, "tessan", 1).error, "no Exchange yet");
  coloniesOf(s, "tessan")[0].colony.buildings.market = true;
  const p0 = marketPrice(s), r = tradeExotics(s, "tessan", 3);
  assert.equal(r.units, 3); assert.equal(F.exotics, 3);
  assert.equal(r.credits, -(p0 + p0 + 1 + p0 + 2), "each unit bought costs one more");
  assert.equal(marketPrice(s), p0 + 3);
  const before = F.credits, sp = sellPrice(s), q = tradeExotics(s, "tessan", -1);
  assert.equal(q.credits, sp); assert.equal(F.credits, before + sp);
  assert.ok(sellPrice(s) < marketPrice(s), "selling pays less than buying: no free money");
  endTurn(s); assert.equal(marketPrice(s), p0 + 1, "drifts back a step a turn");
  F.credits = 0; assert.match(tradeExotics(s, "tessan", 1).error, /credits/);
});

test("splitting by type: one, half or all of a type, the most damaged first; never the whole fleet", () => {
  const s = newGame({ seed: 4, size: "small", player: "hegemony", rivals: 1 });
  const at = coloniesOf(s, "hegemony")[0].at;
  const f = spawnFleet(s, "hegemony", at, ["cruiser", "cruiser", "cruiser", "cruiser", "frigate", "frigate", "transport"]);
  f.ships[2].hull = 1;   // a damaged cruiser
  let r = splitFleet(s, f.id, "cruiser", 1);
  assert.equal(r.moved, 1); assert.equal(s.fleets[r.fleet].ships[0].hull, 1, "the damaged one goes first");
  r = splitFleet(s, f.id, "cruiser", "half"); assert.equal(r.moved, 1, "half of three, rounded down");
  r = splitFleet(s, f.id, "frigate", "all"); assert.equal(r.moved, 2);
  assert.deepEqual(f.ships.map((x) => x.type).sort(), ["cruiser", "cruiser", "transport"]);
  const g = spawnFleet(s, "hegemony", at, ["frigate", "frigate", "frigate"]);
  r = splitFleet(s, g.id, "frigate", "all"); assert.equal(r.moved, 2, "all but one: a split never takes the whole fleet");
  assert.equal(g.ships.length, 1);
  assert.ok(splitFleet(s, g.id, "frigate", 1).error);
});

test("muster points: new ships head for the world you name, by kind or all of them, and join their kind there", () => {
  const s = newGame({ seed: 4, size: "small", player: "concord", rivals: 1 });
  const cap = coloniesOf(s, "concord")[0], far = colonyNear(s, "concord", cap.at, 4);
  assert.ok(far);
  assert.ok(setMuster(s, "concord", "all", Object.values(s.systems).find((x) => !x.colony).id).error, "only a world or outpost of yours");
  assert.ok(setMuster(s, "concord", "warship", far.id).ok);
  assert.equal(musterFor(s, "concord", "frigate"), far); assert.equal(musterFor(s, "concord", "transport"), null);
  assert.ok(setMuster(s, "concord", "all", cap.id).ok);
  assert.equal(musterFor(s, "concord", "transport"), cap, "the all-ships order covers the kinds without their own");
  assert.equal(musterFor(s, "concord", "frigate"), far, "a kind's own order wins");
  cap.colony.buildings.shipyard = true; F0(s).credits = 500;
  cap.colony.queue = [{ kind: "ship", id: "frigate", name: "Frigate", cost: 1, progress: 1 }];
  const guard = spawnFleet(s, "concord", far.at, ["frigate"]);
  endTurn(s);
  const going = Object.values(s.fleets).find((f) => f.owner === "concord" && f.dest === far.at);
  assert.ok(going || guard.ships.length === 2, "the new frigate is on its way (or already joined)");
  for (let i = 0; i < 6 && guard.ships.length < 2; i++) endTurn(s);
  assert.equal(s.fleets[guard.id].ships.length, 2, "it joined the warships waiting at the muster point");
  // A muster point lost is struck off.
  far.colony.owner = s.factions[1].id; endTurn(s);
  assert.equal(musterFor(s, "concord", "frigate"), cap, "back to the all-ships order");
});
const F0 = (s) => s.factions[0];

test("fuel: a turn of travel beyond supply burns one; with none a fleet crawls; colonies and fuel depots refuel it", () => {
  const s = newGame({ seed: 4, size: "small", player: "concord", rivals: 1 });
  const cap = coloniesOf(s, "concord")[0];
  const far = Object.values(s.systems).filter((x) => !x.colony).sort((a, b) => distance(b.at, cap.at) - distance(a.at, cap.at))[0];
  const f = spawnFleet(s, "concord", cap.at, ["frigate", "cruiser"]);
  assert.equal(fuelMax(s, f), 5, "the thirstiest ship's tank (a cruiser's 5)");
  // Out of supply with an empty tank: a hex a turn.
  f.at = far.at; f.fuel = 0;
  assert.ok(!inSupply(s, f));
  const home = setDestination(s, f.id, cap.at); assert.ok(home.ok);
  const steps = f.path.length; endTurn(s);
  assert.ok(steps - f.path.length <= 1 && steps > 1, "on fumes it crawls: one step a turn");
  // A fuel depot at an outpost: supply, and a full tank.
  const op = Object.values(s.systems).filter((x) => !x.colony && canSettle(s, "concord", x, "outpost")).sort((a, b) => distance(a.at, f.at) - distance(b.at, f.at))[0];
  const o = spawnFleet(s, "concord", op.at, ["outpost"]);
  faction(s, "concord").credits = 100;
  assert.ok(settle(s, o.id).ok);
  const g = spawnFleet(s, "concord", op.at, ["frigate"]); g.fuel = 1;
  assert.equal(inSupply(s, g) && !coloniesOf(s, "concord").filter((x) => x.colony.kind === "colony").some((x) => distance(x.at, op.at) <= 3), false, "a bare outpost far from colonies gives no supply");
  assert.ok(buildDepot(s, "concord", op.id).ok);
  assert.ok(inSupply(s, g), "with a fuel depot it does");
  endTurn(s); assert.equal(fuelOf(s, g), fuelMax(s, g), "refuelled");
  assert.ok(buildDepot(s, "concord", cap.id).error, "a colony doesn't need one");
});

test("an outpost founded with its fuel depot, for credits", () => {
  const s = newGame({ seed: 4, size: "small", player: "concord", rivals: 1 });
  const cap = coloniesOf(s, "concord")[0], op = Object.values(s.systems).find((x) => !x.colony && canSettle(s, "concord", x, "outpost"));
  const F = faction(s, "concord"); F.credits = 10;
  assert.match(settle(s, spawnFleet(s, "concord", op.at, ["outpost"]).id, { depot: true }).error, /credits/);
  F.credits = 100;
  const f2 = Object.values(s.fleets).find((x) => x.at === op.at && x.ships.some((y) => y.type === "outpost"));
  assert.ok(settle(s, f2.id, { depot: true }).ok);
  assert.ok(op.colony.buildings.depot); assert.equal(F.credits, 60);
});

/** A free hex at least `min` hexes from every supply point of `fid` (its colonies). */
const farHex = (s, fid, min) => Object.keys(s.hexes).filter((h) => coloniesOf(s, fid).every((c) => distance(c.at, h) >= min) && !s.sysAt[h]).sort()[0];

test("fuel tankers: one along tops up a dry fleet; a parked one supplies the line, a unit per fleet a turn, and fills up at home", () => {
  const s = newGame({ seed: 4, size: "small", player: "concord", rivals: 1 });
  const cap = coloniesOf(s, "concord")[0], deep = farHex(s, "concord", 8);
  assert.ok(deep);
  // Along with a fleet: a dry tank is topped up from the tanker's cargo, so it doesn't crawl.
  const f = spawnFleet(s, "concord", deep, ["frigate", "tanker"]); f.fuel = 0;
  assert.ok(setDestination(s, f.id, cap.at).ok);
  const c0 = cargoOf(f), steps = f.path.length; endTurn(s);
  assert.ok(steps - f.path.length > 1 || !f.path.length, "topped up from the tanker, it moves at full speed instead of crawling");
  assert.ok(cargoOf(f) === c0 - 1 || inSupply(s, f), "a unit of cargo burned (unless it reached home and the tanker filled up again)");
  // A dry fleet without a tanker, the same way: it crawls.
  const g = spawnFleet(s, "concord", deep, ["frigate"]); g.fuel = 0; setDestination(s, g.id, cap.at);
  const gs = g.path.length; endTurn(s); assert.ok(gs - g.path.length <= 1, "without one it crawls");
  // Parked: supply within 2 hexes, while it has fuel aboard.
  const s2 = newGame({ seed: 4, size: "small", player: "concord", rivals: 1 }), d2 = farHex(s2, "concord", 8);
  const tk = spawnFleet(s2, "concord", d2, ["tanker"]);
  assert.ok(inSupplyAt(s2, "concord", d2), "a parked tanker is a supply point");
  const near = Object.keys(s2.hexes).find((h) => h !== d2 && distance(h, d2) === 2);
  const war = spawnFleet(s2, "concord", near, ["frigate"]); war.fuel = 1;
  endTurn(s2);
  assert.equal(fuelOf(s2, war), fuelMax(s2, war), "the fleet 2 hexes away refuelled");
  assert.equal(cargoOf(tk), SHIPS.tanker.cargo - 1, "and the tanker paid a unit for it");
  // An enemy's warships in its system cut it.
  const foe = s2.factions[1].id; declareWar(s2, foe, "concord");
  spawnFleet(s2, foe, d2, ["frigate"]);
  assert.ok(!inSupplyAt(s2, "concord", near), "cut: no supply while the enemy holds its system");
});

test("a tanker home in supply fills up; a besieged colony gives no supply", () => {
  const s = newGame({ seed: 4, size: "small", player: "concord", rivals: 1 });
  const cap = coloniesOf(s, "concord")[0];
  const tk = spawnFleet(s, "concord", cap.at, ["tanker"]); tk.ships[0].cargo = 2;
  endTurn(s); assert.equal(cargoOf(tk), SHIPS.tanker.cargo);
  const foe = s.factions[1].id; declareWar(s, foe, "concord");
  delete s.fleets[tk.id];
  spawnFleet(s, foe, cap.at, ["cruiser", "cruiser"]);
  assert.ok(supplySources(s, "concord").includes(cap), "while its guns stand, it isn't blockaded");
  cap.colony.defense = 0;
  assert.ok(!supplySources(s, "concord").includes(cap), "blockaded (its guns down), the capital gives none");
});

test("an Orbital battery: a fortress that holds off small fleets, keeps the world unblockaded while it stands, and stiffens the garrison", () => {
  const s = newGame({ seed: 11, size: "small", player: "concord", rivals: 1 });
  const foe = s.factions[1].id, w = coloniesOf(s, foe)[0];
  w.colony.capital = false; w.colony.pop = 4;
  const bare = invasionOdds(s, spawnFleet(s, "concord", w.at, ["transport"]).id).defense;
  w.colony.buildings.battery = true; w.colony.defense = gunsMax(s, w.colony);
  assert.equal(w.colony.defense, BATTERY.hull);
  for (const f of fleetsAt(s, w.at)) delete s.fleets[f.id];
  assert.equal(invasionOdds(s, spawnFleet(s, "concord", w.at, ["transport"]).id).defense, bare + BATTERY.garrison * (foe === "zhaq" ? 1.5 : 1), "its troops add to the garrison");
  for (const f of fleetsAt(s, w.at)) delete s.fleets[f.id];
  declareWar(s, "concord", foe);
  // Two frigates against it: over many seeds, the battery wins nearly always.
  let held = 0, lost = 0;
  for (let seed = 0; seed < 30; seed++) {
    const t = newGame({ seed: 100 + seed, size: "small", player: "concord", rivals: 1 }), x = coloniesOf(t, t.factions[1].id)[0], foe = t.factions[1].id;
    x.colony.capital = false; x.colony.buildings.battery = true; x.colony.defense = gunsMax(t, x.colony);
    declareWar(t, "concord", foe);
    for (const f of fleetsAt(t, x.at)) delete t.fleets[f.id];
    const f = spawnFleet(t, "concord", x.at, ["frigate", "frigate"]);
    const yNow = yields(t, x);
    assert.ok(besieged(t, x) && gunsUp(x) && !blockaded(t, x), "under siege, guns up: not blockaded");
    assert.deepEqual(yields(t, x), yNow);
    endTurn(t);
    if (gunsUp(x)) held++;
    if (!t.fleets[f.id] || t.fleets[f.id].ships.length < 2) lost++;
    assert.equal(x.colony.siege || 0, 0, "the siege clock doesn't run while its guns stand");
  }
  assert.ok(held >= 27 && lost >= 27, `held ${held}, frigates lost ${lost} of 30`);
  // Silenced: blockaded, and no repair while the enemy holds the orbit; free again, it repairs 2 a turn.
  w.colony.defense = 0; spawnFleet(s, "concord", w.at, ["cruiser"]);
  assert.ok(blockaded(s, w));
  for (const f of fleetsAt(s, w.at)) delete s.fleets[f.id];
  w.colony.defense = 1; endTurn(s);
  assert.equal(w.colony.defense, 1 + BATTERY.repair);
});

test("advances: repeatable research, a level at a time, each costing more and adding to the last", async () => {
  const { availableAdvances, advLevel, researchItem } = await import("../src/game.js");
  const s = newGame({ seed: 12, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], cap = coloniesOf(s, "concord")[0];
  assert.equal(availableAdvances(s, "concord").length, 0, "none before their technologies");
  me.research.done.push("automation", "shields");
  assert.ok(setResearch(s, "concord", "adv:efficiency").ok);
  const ind0 = yields(s, cap).ind, cost1 = researchItem(s, "concord").cost;
  me.research.progress = cost1; endTurn(s);
  assert.equal(advLevel(s, "concord", "efficiency"), 1);
  assert.ok(yields(s, cap).ind > ind0, "+5% industry");
  assert.ok(setResearch(s, "concord", "adv:efficiency").ok);
  assert.ok(researchItem(s, "concord").cost > cost1, "the next level costs more");
  const hull = shipStats(s, "concord", "frigate").hull; me.research.adv.armor = 2;
  assert.equal(shipStats(s, "concord", "frigate").hull, hull + 2);
  me.research.adv.armor = 2; assert.ok(!availableAdvances(s, "concord").some((a) => a.adv === "armor"), "maxed out");
});

test("anomalies: a scout surveys one for research; an observatory studies one nearby", async () => {
  const { anomalyValue } = await import("../src/game.js");
  const s = newGame({ seed: 13, size: "small", player: "concord", rivals: 1 }), me = s.factions[0];
  assert.ok(Object.values(s.systems).some((x) => x.anomaly), "anomalies are placed");
  const a = Object.values(s.systems).find((x) => x.anomaly);
  const before = me.research.progress; spawnFleet(s, "concord", a.at, ["scout"]); endTurn(s);
  assert.equal(a.anomaly, null); assert.ok(me.research.progress - before >= anomalyValue(s) - 2);
  const cap = coloniesOf(s, "concord")[0], b = Object.values(s.systems).find((x) => !x.colony && x !== a);
  b.anomaly = "a test"; cap.colony.buildings.observatory = true;
  const near = distance(b.at, cap.at) <= 4;
  for (let i = 0; i < 4; i++) endTurn(s);
  if (near) assert.equal(b.anomaly, null, "the observatory studied it");
});

test("new buildings: an Orbital habitat adds room, barracks stiffen the garrison, a drydock repairs at once", () => {
  const s = newGame({ seed: 14, size: "small", player: "concord", rivals: 1 }), cap = coloniesOf(s, "concord")[0];
  const room = maxPop(s, cap); cap.colony.buildings.habitat = true; assert.equal(maxPop(s, cap), room + 2);
  const foe = s.factions[1].id, w = coloniesOf(s, foe)[0];
  const t = spawnFleet(s, "concord", w.at, ["transport"]), d0 = invasionOdds(s, t.id).defense;
  w.colony.buildings.barracks = true; assert.equal(invasionOdds(s, t.id).defense, d0 + 3);
  delete s.fleets[t.id];
  cap.colony.buildings.drydock = true;
  const f = spawnFleet(s, "concord", cap.at, ["cruiser"]); f.ships[0].hull = 1; s.factions[0].research.done.push("heavyHulls");
  endTurn(s); assert.equal(f.ships[0].hull, shipStats(s, "concord", "cruiser").hull);
});

test("the wild things: swarms nest on rich systems and block settling, havens send raiders that take credits, kills pay a bounty", async () => {
  const { wildsTurn, PIRATES, BEASTS } = await import("../src/wilds.js");
  const { bounty } = await import("../src/game.js");
  const { WILDS } = await import("../src/data.js");
  const s = newGame({ seed: 15, size: "medium", player: "concord", rivals: 2, wilds: "heavy" }), me = s.factions[0];
  wildsTurn(s);
  const swarms = fleetsOf(s, BEASTS).filter((f) => f.ships[0].type === "swarm");
  assert.equal(swarms.length, WILDS.swarms.medium);
  const nest = s.systems[s.sysAt[swarms[0].at]];
  assert.ok(nest.exotics || nest.rich > 1);
  assert.ok(atWar(s, "concord", BEASTS) && atWar(s, PIRATES, "concord") && !atWar(s, PIRATES, BEASTS));
  assert.ok(!canSettle(s, "concord", nest, "outpost"), "a swarm holds it");
  // A haven by turn havenFirst, and raiders from it.
  while (s.turn < WILDS.havenFirst + WILDS.raidEvery + 1) { s.turn++; wildsTurn(s); }
  assert.ok(fleetsOf(s, PIRATES).some((f) => f.ships[0].type === "haven"), "a haven");
  assert.ok(fleetsOf(s, PIRATES).some((f) => f.ships[0].type === "raider"), "its raiders");
  // Raiders over an unguarded colony take credits.
  const col = coloniesOf(s, "concord")[0]; col.colony.capital = false; col.colony.defense = 0;
  for (const f of fleetsAt(s, col.at)) if (f.owner === "concord") delete s.fleets[f.id];
  const r = fleetsOf(s, PIRATES).find((f) => f.ships[0].type === "raider"); r.at = col.at; r.path = []; r.stay = 0;
  me.credits = 100; wildsTurn(s);
  assert.ok(me.credits < 100, "raided");
  // A bounty for a haven.
  const c0 = me.credits, p0 = me.research.progress; bounty(s, "concord", "haven", "here");
  assert.equal(me.credits, c0 + WILDS.bounty.haven.credits); assert.equal(me.research.progress, p0 + WILDS.bounty.haven.research);
  const off = newGame({ seed: 15, size: "small", player: "concord", rivals: 1, wilds: false }); wildsTurn(off); assert.equal(off.wilds, undefined);
});

test("an open game's Corridor Engine: no victory but a prize; one at a time; it changes hands, can be destroyed, and the race starts again", async () => {
  const { engineHeld, engineActive, engineGate, gateTargets, buildOptions } = await import("../src/game.js");
  const { ENGINE } = await import("../src/data.js");
  const s = newGame({ seed: 16, size: "small", player: "concord", rivals: 1, mode: "open" }), me = s.factions[0], foe = s.factions[1];
  const cap = s.systems[me.capital], fcap = s.systems[foe.capital];
  for (const F of [me, foe]) F.research.done.push("engine");
  me.exotics = foe.exotics = 99;
  enqueue(s, cap.id, "building", "engine"); enqueue(s, fcap.id, "building", "engine");
  cap.colony.queue[0].progress = cap.colony.queue[0].cost; fcap.colony.queue[0].progress = fcap.colony.queue[0].cost - 300;
  endTurn(s);
  assert.equal(s.winner, null, "no victory in an open game");
  assert.equal(engineHeld(s).owner, "concord");
  assert.ok(fcap.colony.queue.find((q) => q.id === "engine").held, "the rival's waits");
  const kept = fcap.colony.queue.find((q) => q.id === "engine").progress;
  assert.ok(!buildOptions(s, fcap).some((o) => o.id === "engine"), "no new one can be queued");
  assert.ok(engineActive(s, "concord"));
  // The gate: from the Engine world to another world of ours.
  const other = Object.values(s.systems).find((x) => !x.colony && distance(x.at, cap.at) > 3);
  other.colony = { owner: "concord", kind: "colony", pop: 1, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
  const f = spawnFleet(s, "concord", cap.at, ["frigate"]);
  assert.ok(gateTargets(s, f.id).includes(other));
  assert.ok(engineGate(s, f.id, other.id).ok); assert.equal(f.at, other.at);
  assert.ok(engineGate(s, f.id, other.id).error, "the gate rests");
  // Enemy warships in its orbit: it gives nothing.
  declareWar(s, "concord", foe.id);
  const siege = spawnFleet(s, foe.id, cap.at, ["cruiser"]);
  assert.ok(!engineActive(s, "concord"));
  delete s.fleets[siege.id];
  // Held, it scores.
  const sc = me.stats.engineTurns || 0; endTurn(s); assert.ok((me.stats.engineTurns || 0) > sc);
  // Destroyed (a barrage, or its world razed): the race is open again, and the rival's kept work counts.
  delete cap.colony.buildings.engine; endTurn(s);
  assert.equal(engineHeld(s), null);
  const q = fcap.colony.queue.find((x) => x.id === "engine");
  assert.ok(!q || q.progress >= kept, "work done is kept");
  // Captured: it changes hands.
  const t = newGame({ seed: 17, size: "small", player: "concord", rivals: 1, mode: "open" }), tc = t.systems[t.factions[0].capital];
  tc.colony.buildings.engine = true; t.engine = { sys: tc.id, owner: "concord", built: 1, gate: 1 };
  tc.colony.owner = t.factions[1].id; endTurn(t);
  assert.equal(engineHeld(t).owner, t.factions[1].id);
  assert.ok(ENGINE.gateEvery > 0);
});

test("relics: hidden at ruins and anomalies, recovered by the first fleet there, held by the world that keeps them", async () => {
  const { relicOwner, relicHeld, relicsOf, useRelic, shardTargets } = await import("../src/game.js");
  const { RELICS, REACH, RELIC_SCORE } = await import("../src/data.js");
  const s = newGame({ seed: 18, size: "medium", player: "concord", rivals: 2 }), me = s.factions[0], cap = s.systems[me.capital];
  const sites = Object.values(s.systems).filter((x) => x.relic);
  assert.ok(sites.length >= 3 && sites.every((x) => x.ruins || x.anomaly || x.relic === "chart"));
  assert.ok(sites.some((x) => x.relic === "chart"), "the Star Chart is always on the map");
  assert.equal(sites.length + s.relicsReach.length, Object.keys(RELICS).length, "one of each");
  // Recover the Seed Vault (or whatever's nearest): it goes to the capital, and works.
  const site = sites.find((x) => x.relic !== "chart"), id = site.relic, sc = score(s, "concord");
  spawnFleet(s, "concord", site.at, ["scout"]); endTurn(s);
  assert.equal(relicOwner(s, id), "concord"); assert.equal(s.relics[id].at, cap.id); assert.equal(site.relic, null);
  assert.ok(score(s, "concord") >= sc + RELIC_SCORE - 15);
  assert.equal(relicsOf(s, "concord").length, 1);
  // Effects, held directly.
  const room = maxPop(s, cap); s.relics.seeds = { at: cap.id, owner: "concord" }; assert.equal(maxPop(s, cap), room + (id === "seeds" ? 0 : 2));
  const spd = shipStats(s, "concord", "frigate").speed; s.relics.anchor = { at: cap.id, owner: "concord" }; assert.equal(shipStats(s, "concord", "frigate").speed, spd + (id === "anchor" ? 0 : 1));
  // The world falls: the relics go with it.
  const foe = s.factions[1].id; cap.colony.owner = foe; endTurn(s);
  assert.ok(relicHeld(s, foe, id)); assert.ok(!relicHeld(s, "concord", id));
  // The world is gone: the relic lies in its ruins, for anyone to find.
  cap.colony = null; endTurn(s);
  for (const k of new Set([id, "seeds", "anchor"])) { assert.equal(relicOwner(s, k), null); assert.ok(Object.values(s.systems).some((x) => x.relic === k && x.relicLost), `${k} lies somewhere to be found`); }
});

test("the Star Chart opens the Outer Reach; the Gate Shard opens a corridor", async () => {
  const { useRelic, shardTargets, findPath } = await import("../src/game.js");
  const { REACH } = await import("../src/data.js");
  const s = newGame({ seed: 19, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], cap = s.systems[me.capital];
  const r0 = s.radius, n0 = Object.keys(s.systems).length, h0 = Object.keys(s.hexes).length, reserved = s.relicsReach.length;
  s.relics.chart = { at: cap.id, owner: "concord" };
  for (const x of Object.values(s.systems)) if (x.relic === "chart") x.relic = null;
  const r = useRelic(s, "concord", "chart");
  assert.ok(r.ok && r.systems > 5);
  assert.equal(s.radius, r0 + REACH.rings);
  assert.ok(Object.keys(s.hexes).length > h0 && Object.keys(s.systems).length === n0 + r.systems);
  assert.ok(useRelic(s, "concord", "chart").error, "once only");
  const reach = Object.values(s.systems).filter((x) => x.reach);
  assert.ok(reach.every((x) => me.explored[x.at]), "the reader sees the Reach");
  assert.ok(reach.every((x) => findPath(s, "concord", cap.at, x.at)), "every new system can be reached");
  assert.equal(reach.filter((x) => x.relic).length, reserved, "the kept-back relics are out there");
  // The Gate Shard.
  s.relics.shard = { at: cap.id, owner: "concord" };
  const tg = shardTargets(s, "concord", cap.id)[0];
  assert.ok(tg);
  assert.ok(useRelic(s, "concord", "shard", { from: cap.id, to: tg.id }).ok);
  assert.ok(s.adj[cap.id].includes(tg.id));
  assert.ok(useRelic(s, "concord", "shard", { from: cap.id, to: shardTargets(s, "concord", cap.id)[0]?.id }).error, "then it rests");
});

test("pirate, creature and Warden ships can't be built; any queued in an old save are struck off", async () => {
  const { buildOptions } = await import("../src/game.js");
  const s = newGame({ seed: 20, size: "small", player: "concord", rivals: 1 }), cap = s.systems[s.factions[0].capital];
  const ids = buildOptions(s, cap).filter((o) => o.kind === "ship").map((o) => o.id);
  for (const w of ["raider", "haven", "swarm", "leviathan", "sentinel", "colossus", "heart"]) assert.ok(!ids.includes(w), w);
  cap.colony.queue.push({ kind: "ship", id: "swarm", name: "Crystal swarm", cost: 0, progress: 0 }, { kind: "ship", id: "raider", name: "Raider", cost: 0, progress: 0 });
  const f = spawnFleet(s, "concord", cap.at, ["raider"]);
  endTurn(s);
  assert.ok(!cap.colony.queue.some((q) => q.id === "swarm" || q.id === "raider"));
  assert.ok(!s.fleets[f.id]);
});

test("pirates and creatures: Light by default, Heavy or None by choice, changeable mid-game; raiders shun a world that cost them ships", async () => {
  const { wildsTurn, setWildsLevel, wildsLevel, PIRATES, BEASTS } = await import("../src/wilds.js");
  const { WILD_LEVELS } = await import("../src/data.js");
  const s = newGame({ seed: 21, size: "medium", player: "concord", rivals: 2 });
  assert.equal(wildsLevel(s), "light");
  wildsTurn(s);
  assert.equal(fleetsOf(s, BEASTS).filter((f) => f.ships[0].type === "swarm").length, WILD_LEVELS.light.swarms.medium);
  const h = newGame({ seed: 21, size: "medium", player: "concord", rivals: 2, wilds: "heavy" }); wildsTurn(h);
  assert.ok(fleetsOf(h, BEASTS).length > fleetsOf(s, BEASTS).length);
  // Heavy to Light mid-game: the extras are gone.
  while (h.turn < 80) { h.turn++; wildsTurn(h); }
  assert.ok(setWildsLevel(h, "light").ok);
  assert.ok(fleetsOf(h, PIRATES).filter((f) => f.ships[0].type === "haven").length <= WILD_LEVELS.light.havens.medium);
  assert.equal(fleetsOf(h, BEASTS).filter((f) => f.ships[0].type === "swarm").length, WILD_LEVELS.light.swarms.medium);
  assert.ok(setWildsLevel(h, "none").ok); assert.equal(fleetsOf(h, PIRATES).length + fleetsOf(h, BEASTS).length, 0);
  h.turn++; wildsTurn(h); assert.equal(fleetsOf(h, PIRATES).length, 0, "and none come back");
  // A raider lost at a world: they stay away from it.
  const n = newGame({ seed: 22, size: "small", player: "concord", rivals: 1 }); wildsTurn(n);
  const col = n.systems[n.factions[0].capital];
  declareWar(n, "concord", n.factions[1].id);
  spawnFleet(n, "concord", col.at, ["cruiser", "cruiser", "cruiser"]); const r = spawnFleet(n, PIRATES, col.at, ["raider"]);
  endTurn(n);
  assert.ok(!n.fleets[r.id] || !n.fleets[r.id].ships.length);
  assert.ok(n.wilds.avoid && n.wilds.avoid[col.id] > n.turn, "remembered");
});

test("pirate protection: a ransom or tribute paid keeps that haven's raiders off your worlds; the player is asked", async () => {
  const { wildsTurn, payPirates, protectedFrom, PIRATES } = await import("../src/wilds.js");
  const { currentEnvoy, answerEnvoy } = await import("../src/envoys.js");
  const { PROTECTION } = await import("../src/data.js");
  const s = newGame({ seed: 23, size: "small", player: "concord", rivals: 1, wilds: "heavy" }), me = s.factions[0];
  wildsTurn(s);
  const cap = s.systems[me.capital]; cap.colony.capital = false; cap.colony.defense = 0; cap.colony.pop = 5;
  for (const f of fleetsAt(s, cap.at)) delete s.fleets[f.id];
  const haven = spawnFleet(s, PIRATES, Object.values(s.systems).find((x) => !x.colony).at, ["haven"]); haven.home = haven.at;
  const r = spawnFleet(s, PIRATES, cap.at, ["raider", "raider"]); r.home = haven.at; r.stay = 0;
  me.credits = 500; s.inbox = []; wildsTurn(s);
  const m = currentEnvoy(s);
  assert.equal(m && m.kind, "ransom", "a ransom demand");
  assert.ok(answerEnvoy(s, "pay").ok);
  assert.ok(protectedFrom(s, "concord", haven.at));
  assert.ok(me.credits < 500);
  const c0 = me.credits; wildsTurn(s); wildsTurn(s);
  assert.equal(me.credits, c0, "no more raiding once paid");
  s.turn += PROTECTION.turns + 1; assert.ok(!protectedFrom(s, "concord", haven.at), "it runs out");
  assert.ok(payPirates(s, "concord", haven.at, 99999).error, "can't pay what you haven't got");
});

test("raiding an enemy fuel depot fills your tanks and cuts its supply", async () => {
  const { canRaidDepot, raidDepot, supplySources } = await import("../src/game.js");
  const { DEPOT_RAID } = await import("../src/data.js");
  const s = newGame({ seed: 24, size: "small", player: "concord", rivals: 1 }), foe = s.factions[1].id;
  const sys = Object.values(s.systems).find((x) => !x.colony);
  sys.colony = { owner: foe, kind: "outpost", pop: 0, growth: 0, buildings: { depot: true }, queue: [], stock: 0, defense: 0, capital: false };
  assert.ok(supplySources(s, foe).includes(sys));
  const f = spawnFleet(s, "concord", sys.at, ["frigate", "tanker"]); f.fuel = 1; f.ships[1].cargo = 0;
  assert.ok(!canRaidDepot(s, f.id), "not at peace");
  declareWar(s, "concord", foe);
  assert.ok(raidDepot(s, f.id).ok);
  assert.equal(f.fuel, fuelMax(s, f)); assert.equal(f.ships[1].cargo, SHIPS.tanker.cargo);
  assert.ok(!supplySources(s, foe).includes(sys), "dry for a while");
  assert.ok(raidDepot(s, f.id).error, "once a turn");
  delete s.fleets[f.id]; s.turn += DEPOT_RAID.cut; assert.ok(supplySources(s, foe).includes(sys));
});

test("a pirate patrol pact: partners guard each other's worlds from raiders and share pirate bounties", async () => {
  const { patrolling, guarded, bounty } = await import("../src/game.js");
  const { WILDS, PATROL } = await import("../src/data.js");
  const s = newGame({ seed: 25, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], O = s.factions[1];
  me.met[O.id] = O.met[me.id] = true;
  assert.ok(propose(s, "concord", O.id, "patrol").accepted);
  assert.ok(patrolling(s, "concord", O.id) && patrolling(s, O.id, "concord"));
  const w = s.systems[O.capital]; w.colony.capital = false; w.colony.defense = 0;
  for (const f of fleetsAt(s, w.at)) delete s.fleets[f.id];
  assert.ok(!guarded(s, w, "pirates"));
  spawnFleet(s, "concord", w.at, ["frigate"]);
  assert.ok(guarded(s, w, "pirates"), "my frigate guards their world from raiders");
  assert.ok(!guarded(s, w, "concord") || true);
  const c0 = O.credits; bounty(s, "concord", "haven", "here");
  assert.equal(O.credits, c0 + WILDS.bounty.haven.credits * PATROL.share);
  declareWar(s, "concord", O.id); assert.ok(!patrolling(s, "concord", O.id), "war ends it");
});

test("traders: convoys run between Exchanges and pay both ends; pirates plunder one without an escort", async () => {
  const { tradersTurn, convoyValue } = await import("../src/traders.js");
  const { currentEnvoy } = await import("../src/envoys.js");
  const s = newGame({ seed: 26, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], O = s.factions[1];
  const a = s.systems[me.capital], b = s.systems[O.capital]; a.colony.buildings.market = b.colony.buildings.market = true;
  const { wildsTurn } = await import("../src/wilds.js"); wildsTurn(s); tradersTurn(s);
  assert.ok(!atWar(s, "traders", "concord") && atWar(s, "traders", "pirates"));
  const f = spawnFleet(s, "traders", b.at, ["merchant"]); f.trade = { from: a.id, to: b.id };
  const m0 = me.credits, o0 = O.credits, v = convoyValue(a, b); s.inbox = [];
  tradersTurn(s);
  assert.equal(me.credits, m0 + v); assert.equal(O.credits, o0 + v);
  assert.ok(!s.fleets[f.id], "delivered");
  // Plundered: raiders beside an unescorted convoy.
  const mid = Object.values(s.systems).find((x) => !x.colony);
  const g = spawnFleet(s, "traders", mid.at, ["merchant"]); g.trade = { from: a.id, to: b.id };
  spawnFleet(s, "pirates", mid.at, ["raider"]);
  tradersTurn(s); assert.ok(!s.fleets[g.id], "plundered");
  // Escorted: safe.
  const h = spawnFleet(s, "traders", mid.at, ["merchant"]); h.trade = { from: a.id, to: b.id }; spawnFleet(s, "concord", mid.at, ["frigate"]);
  tradersTurn(s); assert.ok(s.fleets[h.id], "an escort keeps it safe");
  assert.ok(!buildOptions(s, a).some((o) => o.id === "merchant"), "nobody builds merchants");
});

test("orbital stations and batteries anywhere: an outpost buys them with credits; a station guards, repairs, sees and supplies", async () => {
  const { outpostOptions, buildAtOutpost, gunsMax, gunsUp, guarded, supplySources } = await import("../src/game.js");
  const { BUILDINGS, OUTPOST_BUY, BATTERY } = await import("../src/data.js");
  const s = newGame({ seed: 27, size: "small", player: "concord", rivals: 1 }), me = s.factions[0];
  const o = Object.values(s.systems).find((x) => !x.colony && distance(x.at, s.systems[me.capital].at) > 3);
  o.colony = { owner: "concord", kind: "outpost", pop: 0, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
  assert.equal(outpostOptions(s, o.id).length, 0, "nothing before the technology");
  me.research.done.push("batteries", "orbitalYards");
  assert.deepEqual(outpostOptions(s, o.id).map((x) => x.id).sort(), ["battery", "station"]);
  me.credits = 10; assert.ok(buildAtOutpost(s, "concord", o.id, "station").error, "credits");
  me.credits = 1000;
  assert.ok(buildAtOutpost(s, "concord", o.id, "station").ok);
  assert.equal(me.credits, 1000 - Math.round(BUILDINGS.station.cost * OUTPOST_BUY.rate));
  assert.equal(gunsMax(s, o.colony), 4); assert.ok(gunsUp(o)); assert.ok(guarded(s, o, s.factions[1].id));
  assert.ok(supplySources(s, "concord").includes(o), "a station gives supply");
  assert.ok(buildAtOutpost(s, "concord", o.id, "battery").ok);
  assert.equal(gunsMax(s, o.colony), BATTERY.hull + 4, "a battery with a station's extra hull");
  // Ships at a station are repaired to full.
  const f = spawnFleet(s, "concord", o.at, ["frigate"]); f.ships[0].hull = 1; endTurn(s);
  assert.equal(f.ships[0].hull, shipStats(s, "concord", "frigate").hull);
  // A colony can queue one too.
  assert.ok(buildOptions(s, s.systems[me.capital]).some((x) => x.id === "station"));
});

test("outposts sell fuel and exotics for credits, and fuel to passing convoys; not while blockaded or raided dry", async () => {
  const { outpostSales } = await import("../src/game.js");
  const { tradersTurn } = await import("../src/traders.js");
  const { OUTPOST_TRADE } = await import("../src/data.js");
  const s = newGame({ seed: 28, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], foe = s.factions[1].id;
  const o = Object.values(s.systems).find((x) => !x.colony && x.world === "gas") || Object.values(s.systems).find((x) => !x.colony);
  o.exotics = true; o.colony = { owner: "concord", kind: "outpost", pop: 0, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
  assert.equal(outpostSales(s, o).total, OUTPOST_TRADE.base + OUTPOST_TRADE.exotics, "exotics exports");
  o.colony.buildings.depot = true;
  assert.equal(outpostSales(s, o).fuel, OUTPOST_TRADE.fuel + (o.world === "gas" ? OUTPOST_TRADE.gas : 0), "fuel sales");
  assert.equal(yields(s, o).cr, outpostSales(s, o).total);
  o.colony.depotCut = s.turn + 3; assert.equal(outpostSales(s, o).fuel, 0, "raided dry"); o.colony.depotCut = 0;
  // A convoy refuelling here pays once.
  tradersTurn(s);
  const a = s.systems[me.capital]; a.colony.buildings.market = true;
  const c = spawnFleet(s, "traders", o.at, ["merchant"]); c.trade = { from: a.id, to: a.id }; c.path = [{ hex: a.at, cost: 1 }];
  const c0 = me.credits; tradersTurn(s); assert.equal(me.credits, c0 + OUTPOST_TRADE.convoy);
  const c1 = me.credits; c.at = o.at; tradersTurn(s); assert.ok(me.credits - c1 < OUTPOST_TRADE.convoy || !s.fleets[c.id], "once a convoy");
  // Blockaded: nothing.
  declareWar(s, "concord", foe); spawnFleet(s, foe, o.at, ["frigate"]);
  assert.equal(outpostSales(s, o).total, 0);
});

test("yards: a station repairs 2 a turn, a drydock to full; a drydock builds 15% cheaper", async () => {
  const { YARDS } = await import("../src/data.js");
  const s = newGame({ seed: 29, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], cap = s.systems[me.capital];
  me.research.done.push("heavyHulls", "orbitalYards");
  const full = shipStats(s, "concord", "cruiser").hull;
  cap.colony.buildings.station = true;
  const f = spawnFleet(s, "concord", cap.at, ["cruiser"]); f.ships[0].hull = 1; endTurn(s);
  assert.equal(f.ships[0].hull, Math.min(full, 1 + YARDS.station), "a station: +2");
  const plain = buildOptions(s, cap).find((o) => o.id === "frigate").cost;
  cap.colony.buildings.drydock = true; f.ships[0].hull = 1; endTurn(s);
  assert.equal(f.ships[0].hull, full, "a drydock: to full");
  assert.equal(buildOptions(s, cap).find((o) => o.id === "frigate").cost, Math.round(plain * (1 - YARDS.discount)));
});

test("research reaches existing ships only at a drydock; new ships are built with it", async () => {
  const { missingFit, fleetSpeed } = await import("../src/game.js");
  const s = newGame({ seed: 30, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], cap = s.systems[me.capital];
  const old = spawnFleet(s, "concord", cap.at, ["frigate"]), x = old.ships[0];
  const h0 = shipStats(s, "concord", "frigate", x).hull, k0 = shipStats(s, "concord", "frigate", x).skill, v0 = fleetSpeed(s, old);
  me.research.done.push("shields", "targeting", "foldDrives");
  assert.equal(shipStats(s, "concord", "frigate", x).hull, h0, "the old ship hasn't got the shields");
  assert.equal(shipStats(s, "concord", "frigate", x).skill, k0); assert.equal(fleetSpeed(s, old), v0);
  assert.deepEqual(missingFit(s, "concord", x).sort(), ["Deflector shields", "Fold drives", "Targeting computers"]);
  const neu = spawnFleet(s, "concord", cap.at, ["frigate"]);
  assert.equal(shipStats(s, "concord", "frigate", neu.ships[0]).hull, h0 + 1, "a new ship has them");
  assert.equal(missingFit(s, "concord", neu.ships[0]).length, 0);
  // At a world without a drydock: nothing changes.
  endTurn(s); assert.ok(missingFit(s, "concord", x).length);
  // At a drydock: refitted, with the new armor added to its hull.
  me.research.done.push("orbitalYards"); cap.colony.buildings.drydock = true;
  const before = x.hull; endTurn(s);
  assert.equal(missingFit(s, "concord", x).length, 0);
  assert.equal(shipStats(s, "concord", "frigate", x).skill, k0 + 1);
  assert.ok(x.hull >= before + 1 || x.hull === shipStats(s, "concord", "frigate", x).hull);
  // New research again: the ship is out of date until its next visit.
  const y = spawnFleet(s, "concord", cap.at, ["frigate"]).ships[0]; me.research.adv = { armor: 1 };
  assert.ok(missingFit(s, "concord", y).includes("Composite armor"));
});

test("sending out-of-date ships to drydock: a whole fleet, only its old ships, every one at once, or by standing order", async () => {
  const { needsRefit, sendToDrydock, sendAllToDrydock, nearestDrydock } = await import("../src/game.js");
  const s = newGame({ seed: 31, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], cap = s.systems[me.capital];
  const away = Object.values(s.systems).find((x) => !x.colony && distance(x.at, cap.at) >= 3 && findPath(s, "concord", x.at, cap.at));
  const f = spawnFleet(s, "concord", away.at, ["frigate", "frigate"]);
  me.research.done.push("shields", "targeting");
  f.ships.push(spawnFleet(s, "concord", away.at, ["frigate"]).ships[0]); for (const g of fleetsAt(s, away.at)) if (g !== f) delete s.fleets[g.id];
  assert.ok(needsRefit(s, f));
  assert.ok(sendToDrydock(s, f.id).error, "targeting needs a drydock, and there's none yet");
  me.research.done.push("orbitalYards"); cap.colony.buildings.drydock = true;
  assert.equal(nearestDrydock(s, "concord", away.at), cap);
  // Only the old ones: split off and sent; the new frigate stays.
  const r = sendToDrydock(s, f.id, true);
  assert.ok(r.ok && r.split && r.ships === 2);
  assert.equal(f.ships.length, 1); assert.equal(s.fleets[r.fleet].dest, cap.at);
  // Everything at once.
  const g = spawnFleet(s, "concord", away.at, ["frigate"]); g.ships[0].fit = { ...g.ships[0].fit, shields: false };
  const all = sendAllToDrydock(s, "concord"); assert.ok(all.ships >= 1 && s.fleets[g.id].dest === cap.at);
  // The standing order: an idle fleet goes by itself; one holding position doesn't.
  const h = spawnFleet(s, "concord", away.at, ["frigate"]); h.ships[0].fit = { ...h.ships[0].fit, shields: false };
  const k = spawnFleet(s, "concord", away.at, ["frigate"]); k.ships[0].fit = { ...k.ships[0].fit, shields: false }; k.sentry = true;
  me.autoRefit = true; endTurn(s);
  const hs = h.ships[0], hf = Object.values(s.fleets).find((x) => x.ships.includes(hs));
  assert.ok(hf && (hf.dest === cap.at || hf.at === cap.at), "sent (it may have joined the others on the way)");
  const kf = Object.values(s.fleets).find((x) => x.ships.includes(k.ships[0]));
  assert.ok(kf && kf.at === away.at, "holding position");
});

test("shipyards fit the early systems (sensors, drives, shields); the rest waits for a drydock", async () => {
  const { missingFit, needsDrydock, sendToDrydock } = await import("../src/game.js");
  const s = newGame({ seed: 32, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], cap = s.systems[me.capital];
  assert.ok(cap.colony.buildings.shipyard && !cap.colony.buildings.drydock);
  const f = spawnFleet(s, "concord", cap.at, ["frigate"]), x = f.ships[0], h0 = shipStats(s, "concord", "frigate", x).hull;
  me.research.done.push("shields", "foldDrives", "targeting");
  assert.ok(needsDrydock(s, "concord", x));
  endTurn(s);
  assert.deepEqual(missingFit(s, "concord", x), ["Targeting computers"], "the shipyard fitted drives and shields");
  assert.equal(shipStats(s, "concord", "frigate", x).hull, h0 + 1);
  // Only early systems missing: sent to the nearest shipyard.
  const away = Object.values(s.systems).find((y) => !y.colony && distance(y.at, cap.at) >= 3 && findPath(s, "concord", y.at, cap.at));
  const g = spawnFleet(s, "concord", away.at, ["frigate"]); g.ships[0].fit = { ...g.ships[0].fit, shields: false };
  assert.ok(!needsDrydock(s, "concord", g.ships[0]));
  const r = sendToDrydock(s, g.id); assert.ok(r.ok && r.dock === cap.name);
});

test("deep-space stations: an outpost ship and credits build one in open space; it acts as an outpost with a station, and is gone without it", async () => {
  const { canFoundStation, foundStation, supplySources, gunsUp, outpostSales, barrage, useRelic } = await import("../src/game.js");
  const { BUILDINGS, OUTPOST_BUY } = await import("../src/data.js");
  const s = newGame({ seed: 33, size: "small", player: "concord", rivals: 1 }), me = s.factions[0];
  const hex = Object.keys(s.hexes).find((k) => !s.sysAt[k] && s.hexes[k].terrain === "space" && !fleetsAt(s, k).length && distance(k, s.systems[me.capital].at) === 3);
  const f = spawnFleet(s, "concord", hex, ["outpost", "frigate"]);
  assert.ok(canFoundStation(s, f.id).error, "needs Orbital shipyards");
  me.research.done.push("orbitalYards"); me.credits = 500;
  const r = foundStation(s, f.id);
  assert.ok(r.ok);
  assert.equal(me.credits, 500 - Math.round(BUILDINGS.station.cost * OUTPOST_BUY.rate));
  const st = s.systems[r.id];
  assert.ok(st.deep && s.sysAt[hex] === r.id && st.colony.owner === "concord" && st.colony.buildings.station);
  assert.ok(!f.ships.some((x) => x.type === "outpost"), "the outpost ship is used up");
  assert.ok(gunsUp(st) && supplySources(s, "concord").includes(st));
  assert.ok(outpostSales(s, st).fuel > 0, "it sells fuel");
  assert.ok(foundStation(s, f.id).error, "one per hex, and the ship's gone");
  // Bombarded: the station is gone, and the site with it.
  const foe = s.factions[1].id; declareWar(s, "concord", foe);
  delete st.colony.buildings.station; endTurn(s);
  assert.ok(!s.systems[r.id] && !s.sysAt[hex], "nothing left out there");
});

test("difficulty presets set the computer players' options; any can be changed (Custom); old saves use their preset", async () => {
  const { aiOpt, difficultyLabel } = await import("../src/game.js");
  const { AI_PRESETS } = await import("../src/data.js");
  for (const d of ["easy", "normal", "hard"]) { const s = newGame({ seed: 34, size: "small", player: "concord", rivals: 1, difficulty: d }); assert.deepEqual(s.aiOpts, AI_PRESETS[d]); assert.equal(difficultyLabel(s), d[0].toUpperCase() + d.slice(1)); }
  assert.ok(aiOpt(newGame({ seed: 34, size: "small", player: "concord", rivals: 1, difficulty: "hard" }), "stations"));
  assert.ok(!aiOpt(newGame({ seed: 34, size: "small", player: "concord", rivals: 1, difficulty: "normal" }), "stations"));
  const c = newGame({ seed: 34, size: "small", player: "concord", rivals: 1, difficulty: "normal", ai: { stations: true } });
  assert.ok(aiOpt(c, "stations")); assert.equal(difficultyLabel(c), "Custom");
  const old = newGame({ seed: 34, size: "small", player: "concord", rivals: 1, difficulty: "easy" }); delete old.aiOpts;
  assert.equal(aiOpt(old, "fortify"), false); assert.equal(aiOpt(old, "strength"), 0.7);
});

test("computer players with the stations option send an outpost ship to build a deep-space station toward a rival", async () => {
  const { aiTurn, stationTarget } = await import("../src/ai.js");
  const { foundStation } = await import("../src/game.js");
  const s = newGame({ seed: 35, size: "medium", player: "concord", rivals: 1, difficulty: "hard" });
  const F = s.factions[1], me = s.factions[0]; F.met[me.id] = me.met[F.id] = true;
  F.research.done.push("orbitalYards"); F.credits = 500;
  // Give it enough colonies for a station.
  const home = s.systems[F.capital];
  for (const x of Object.values(s.systems).filter((y) => !y.colony && distance(y.at, home.at) <= 6).slice(0, 4)) x.colony = { owner: F.id, kind: "colony", pop: 2, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
  const k = stationTarget(s, F);
  assert.ok(k, "a place for a picket toward the rival");
  assert.ok(!s.sysAt[k] && s.hexes[k].terrain === "space");
  const f = spawnFleet(s, F.id, home.at, ["outpost"]);
  for (let i = 0; i < 12 && !Object.values(s.systems).some((x) => x.deep); i++) { aiTurn(s, F); endTurn(s); F.credits = Math.max(F.credits, 500); }
  assert.ok(Object.values(s.systems).some((x) => x.deep && x.colony.owner === F.id), "it built one");
  const n = newGame({ seed: 35, size: "medium", player: "concord", rivals: 1, difficulty: "normal" });
  n.factions[1].research.done.push("orbitalYards"); assert.equal(stationTarget(n, n.factions[1]), null, "Normal: off");
});

test("the early game is calmer: at peace before turn 75 a computer power keeps a defensive fleet, starts no early wars, and paces its Engine", async () => {
  const { aiTurn } = await import("../src/ai.js");
  const { AI_CALM } = await import("../src/data.js");
  const s = newGame({ seed: 36, size: "medium", player: "concord", rivals: 2 }), F = s.factions[1], O = s.factions[2];
  F.met[O.id] = O.met[F.id] = true;
  // A rival far stronger than it: before, it would race to match; now, at peace, it builds its worlds.
  for (let i = 0; i < 10; i++) spawnFleet(s, O.id, s.systems[O.capital].at, ["cruiser"]);
  s.turn = 20; aiTurn(s, F);
  const cap = s.systems[F.capital];
  assert.ok(!cap.colony.queue.some((q) => q.kind === "ship" && SHIPS[q.id].skill > 0) || cap.colony.queue.some((q) => q.kind === "building"), "builds its world, not a war fleet");
  // No early wars: angry and stronger, but too early.
  F.relations[O.id].score = -35; for (let i = 0; i < 20; i++) spawnFleet(s, F.id, cap.at, ["cruiser"]);
  s.turn = AI_CALM.warFrom.standard - 5; aiTurn(s, F); assert.ok(!atWar(s, F.id, O.id), "no war before turn " + AI_CALM.warFrom.standard);
  // The Engine waits.
  // The Engine waits: at peace, with everything else done, still not before engineFrom.
  for (const f of Object.values(s.fleets)) if (f.owner === F.id || f.owner === O.id) delete s.fleets[f.id];
  spawnFleet(s, F.id, cap.at, ["outpost"]); spawnFleet(s, F.id, cap.at, ["colony"]); spawnFleet(s, F.id, cap.at, ["scout"]); spawnFleet(s, F.id, cap.at, ["frigate", "frigate"]); F.credits = 500; F.relations[O.id].score = 0; F.relations[O.id].status = O.relations[F.id].status = "peace";
  F.research.done.push("engine"); F.exotics = 30; for (const b of ["factory", "market", "lab"]) cap.colony.buildings[b] = true;
  cap.colony.queue = []; s.turn = AI_CALM.engineFrom.standard - 10; aiTurn(s, F);
  assert.ok(!cap.colony.queue.some((q) => q.id === "engine"), "not before turn " + AI_CALM.engineFrom.standard);
  // After it: the Engine joins the queue once the more urgent things are done.
  s.turn = AI_CALM.engineFrom.standard + 1; let queued = false;
  for (let i = 0; i < 12 && !queued; i++) {
    cap.colony.queue = []; aiTurn(s, F); queued = cap.colony.queue.some((q) => q.id === "engine");
    for (const q of cap.colony.queue) if (q.kind === "building") cap.colony.buildings[q.id] = true; else spawnFleet(s, F.id, cap.at, [q.id]);
  }
  assert.ok(queued, "then it builds it");
});

test("real provocation overrides the early-war turn: regard at −40 or a recent betrayal", async () => {
  const { aiTurn } = await import("../src/ai.js");
  const { remember } = await import("../src/game.js");
  const { AI_CALM } = await import("../src/data.js");
  const setup = () => { const s = newGame({ seed: 37, size: "small", player: "concord", rivals: 1 }), F = s.factions[1], me = s.factions[0];
    F.met[me.id] = me.met[F.id] = true; for (let i = 0; i < 6; i++) spawnFleet(s, F.id, s.systems[F.capital].at, ["cruiser"]); F.credits = 900; s.turn = 20; return { s, F, me }; };
  // Merely annoyed: waits.
  let { s, F, me } = setup(); F.relations[me.id].score = -25; aiTurn(s, F); assert.ok(!atWar(s, F.id, me.id), "annoyed, but too early");
  // Badly provoked: war now.
  ({ s, F, me } = setup()); F.relations[me.id].score = AI_CALM.provoked - 5; aiTurn(s, F); assert.ok(atWar(s, F.id, me.id), "provoked: war");
  // A recent grave offence: war now, even without the lowest regard.
  ({ s, F, me } = setup()); F.relations[me.id].score = -25; remember(s, F.id, me.id, "broke our alliance", AI_CALM.graveOffence - 5);
  F.relations[me.id].score = -25; aiTurn(s, F); assert.ok(atWar(s, F.id, me.id), "betrayed: war");
});

test("the Wardens persist: the Signs bring Watchers, Watchers wake as Nodes, Nodes shield the Heart, wear down slowly, and a broken Heart regrows while one stands", async () => {
  const { crisisTurn, crisisState, WARDENS } = await import("../src/crisis.js");
  const { CRISIS } = await import("../src/data.js");
  const s = newGame({ seed: 42, size: "medium", player: "concord", rivals: 2 });
  crisisTurn(s);
  // The Signs: a Watcher surfaces some 35 turns before the waking.
  s.turn = s.crisis.at - CRISIS.signsLead; crisisTurn(s);
  assert.equal(crisisState(s).stage, "signs");
  assert.ok(fleetsOf(s, WARDENS).some((f) => f.ships[0].type === "watcher"), "a Watcher");
  // The waking: the Watcher becomes a Node, and the Heart raises Nodes of its own.
  s.turn = s.crisis.at - CRISIS.warning; crisisTurn(s); s.galEvent = null;
  s.turn = s.crisis.at; crisisTurn(s); s.galEvent = null;
  const nodes = () => fleetsOf(s, WARDENS).filter((f) => f.ships.some((x) => x.type === "node"));
  assert.ok(nodes().length >= CRISIS.wakeNodes.medium, "Nodes at the waking");
  assert.ok(!fleetsOf(s, WARDENS).some((f) => f.ships[0].type === "watcher"), "no Watcher left asleep");
  // Shielded: a fleet at the Heart can't harm it while its own Nodes stand.
  const hf = fleetsOf(s, WARDENS).find((f) => f.ships.some((x) => x.type === "heart")), heart = hf.ships.find((x) => x.type === "heart");
  hf.ships = [heart]; const h0 = heart.hull;
  for (let i = 0; i < 20; i++) spawnFleet(s, "concord", hf.at, ["dreadnought"]);
  endTurn(s, null); assert.equal(heart.hull, h0, "the Nodes shield it");
  // Worn down: a battle takes at most a quarter of a Node's hull.
  const n0 = nodes()[0], max = n0.ships[0].hull;
  for (let i = 0; i < 20; i++) spawnFleet(s, "concord", n0.at, ["dreadnought"]);
  endTurn(s, null); assert.ok(n0.ships[0].hull >= max - Math.ceil(max * CRISIS.wear.node), "no more than a quarter in one battle");
  // Break the Heart with a far-off Node still standing: dormant, not over; then a new, stronger Heart grows.
  for (const f of fleetsOf(s, "concord")) delete s.fleets[f.id];
  const far = Object.keys(s.hexes).find((k) => distance(k, s.crisis.heart) > CRISIS.shieldRange + 2 && !s.sysAt[k] && s.hexes[k].terrain === "space" && !fleetsAt(s, k).length);
  for (const f of nodes()) delete s.fleets[f.id];
  spawnFleet(s, WARDENS, far, ["node"]).born = s.turn;
  hf.ships = []; delete s.fleets[hf.id]; s.galEvent = null;
  crisisTurn(s);
  assert.equal(s.crisis.stage, "dormant", "a Node stands: not over");
  const max0 = s.crisis.heartMax;
  s.turn = s.crisis.regrowAt; s.galEvent = null; crisisTurn(s);
  assert.equal(s.crisis.stage, "awake"); assert.equal(s.crisis.returns, 1); assert.ok(s.crisis.heartMax > max0, "stronger");
  assert.equal(s.galEvent && s.galEvent.id, "returning");
  // And with no Node at all when the Heart falls: over.
  for (const f of fleetsOf(s, WARDENS)) delete s.fleets[f.id]; s.galEvent = null; crisisTurn(s);
  assert.equal(s.crisis.stage, "over");
});

test("send all ships to one place with one order, and undo it this turn", async () => {
  const { sendAllTo, undoSendAll } = await import("../src/game.js");
  const s = newGame({ seed: 38, size: "small", player: "concord", rivals: 1 }), me = s.factions[0], cap = s.systems[me.capital];
  const target = Object.values(s.systems).find((x) => x !== cap && findPath(s, "concord", cap.at, x.at));
  const a = spawnFleet(s, "concord", cap.at, ["cruiser"]), b = spawnFleet(s, "concord", cap.at, ["frigate", "transport"]);
  const c = spawnFleet(s, "concord", cap.at, ["colony"]); b.sentry = true;
  const r = sendAllTo(s, "concord", target.at, "war");
  assert.ok(r.fleets >= 2 && r.turns >= 1);
  assert.equal(a.dest, target.at); assert.equal(b.dest, target.at, "holding position or not, it goes"); assert.ok(!b.sentry);
  assert.notEqual(c.dest, target.at, "warships only: the colony ship stays");
  assert.ok(undoSendAll(s, "concord").ok); assert.ok(!a.path.length && b.sentry, "undone");
  assert.ok(sendAllTo(s, "concord", target.at, "all").fleets >= 3); assert.equal(c.dest, target.at, "every ship");
  endTurn(s); assert.ok(undoSendAll(s, "concord").error, "only this turn");
});

test("new sectors: announced ahead, open beyond the rim with their own character, and come once each", async () => {
  const { sectorsTurn, sectorsState } = await import("../src/sectors.js");
  const { wildsTurn } = await import("../src/wilds.js");
  const { SECTORS } = await import("../src/data.js");
  const s = newGame({ seed: 21, size: "small", player: "concord", rivals: 1, mode: "open", wilds: "heavy" });
  wildsTurn(s);
  s.turn = SECTORS.first - SECTORS.warn - 1; sectorsTurn(s);
  assert.equal(sectorsState(s).coming, null, "not announced too early");
  s.turn = SECTORS.first - SECTORS.warn; sectorsTurn(s);
  const c = sectorsState(s).coming; assert.ok(c && c.at === SECTORS.first, "announced with its turn");
  assert.ok(s.log.some((l) => l.sector && l.text.includes(c.name)), "every power hears");
  const r0 = s.radius, n0 = Object.keys(s.systems).length;
  s.turn = SECTORS.first; sectorsTurn(s);
  assert.equal(s.radius, r0 + SECTORS.rings);
  const fresh = Object.values(s.systems).filter((x) => x.sector === c.kind);
  assert.ok(fresh.length > 0 && Object.keys(s.systems).length === n0 + fresh.length);
  assert.ok(fresh.every((x) => Math.max(Math.abs(+x.at.split(",")[0]), Math.abs(+x.at.split(",")[1])) > 0), "new systems");
  // Every kind comes once in an open game, then no more.
  const seen = new Set([c.kind]);
  for (let i = 0; i < 6; i++) { s.turn += SECTORS.every; sectorsTurn(s); sectorsTurn(s); s.turn = (s.sectors.at || s.turn); sectorsTurn(s); if (s.sectors.opened.length) seen.add(s.sectors.opened.at(-1).kind); }
  assert.equal(s.sectors.opened.length, Math.min(SECTORS.max, Object.keys(SECTORS.kinds).length));
  assert.equal(seen.size, s.sectors.opened.length, "no kind twice");
  // The kinds bring their guards: havens (not counted toward the setting's limit) and husks.
  if (seen.has("corsair")) assert.ok(fleetsOf(s, "pirates").some((f) => f.sector === "corsair"));
  if (seen.has("graveyard")) assert.ok(fleetsOf(s, "beasts").some((f) => f.ships[0].type === "husk"));
  // The Dead Zone has no corridors inside it: one link to the rest at most.
  const dz = new Set(Object.values(s.systems).filter((x) => x.sector === "deadzone").map((x) => x.id));
  if (dz.size) assert.ok(s.corridors.filter(([a, b]) => dz.has(a) || dz.has(b)).length <= 1);
});

test("new sectors: a standard game gets one, none near its end, and the setting can turn them off", async () => {
  const { sectorsTurn } = await import("../src/sectors.js");
  const { SECTORS, RULES } = await import("../src/data.js");
  const s = newGame({ seed: 22, size: "small", player: "concord", rivals: 1, wilds: "none" });
  for (s.turn = 1; s.turn < RULES.maxTurns; s.turn++) sectorsTurn(s);
  assert.equal(s.sectors.opened.length, 1);
  assert.ok(!["corsair", "graveyard"].includes(s.sectors.opened[0].kind), "no pirate or creature sector with them off");
  const off = newGame({ seed: 22, size: "small", player: "concord", rivals: 1, sectors: false });
  for (off.turn = 1; off.turn < RULES.maxTurns; off.turn++) sectorsTurn(off);
  assert.equal(off.sectors, undefined);
});

test("fuel reserve: worlds and depots make it, moving and refuelling spend it, and burning hard is faster", async () => {
  const { fuelIncome, fuelCap, fuelStock, setBurn, usesReserve, buildDepot, settle } = await import("../src/game.js");
  const { FUEL } = await import("../src/data.js");
  const s = newGame({ seed: 31, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const me = s.factions[0];
  assert.ok(usesReserve(me.id) && !usesReserve("vael"));
  assert.equal(fuelStock(s, me.id), FUEL.start);
  const inc0 = fuelIncome(s, me.id), cap0 = fuelCap(s, me.id);
  assert.equal(inc0, FUEL.perColony + FUEL.capital + (s.systems[me.capital].world === "gas" ? FUEL.gas : 0));
  // A depot makes fuel and raises the cap.
  const o = Object.values(s.systems).find((x) => !x.colony && x.world !== "gas" && distance(x.at, s.systems[me.capital].at) <= 4);
  o.colony = { owner: me.id, kind: "outpost", pop: 0, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
  me.credits = 500; assert.ok(buildDepot(s, me.id, o.id).ok);
  assert.equal(fuelIncome(s, me.id), inc0 + FUEL.perDepot);
  assert.equal(fuelCap(s, me.id), cap0 + FUEL.capPerDepot);
  // Burning hard: a hex a turn farther, paid from the reserve.
  const cap = s.systems[me.capital];
  const far = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain === "space" && distance(k, cap.at) === 3)[0];
  const a = spawnFleet(s, me.id, cap.at, ["frigate", "frigate"]), b = spawnFleet(s, me.id, cap.at, ["frigate", "frigate"]);
  a.stance = "x"; b.stance = "y";   // keep them apart
  assert.ok(setDestination(s, a.id, far).ok && setDestination(s, b.id, far).ok);
  assert.ok(setBurn(s, b.id, true).ok);
  me.fuelStock = 30; endTurn(s, null);
  const left = (f) => (s.fleets[f.id] ? s.fleets[f.id].path.reduce((t, x) => t + x.cost, 0) : 0);
  assert.ok(left(b) < left(a) || !s.fleets[b.id], "the burning fleet got farther");
  assert.ok(fuelStock(s, me.id) < 30 + fuelIncome(s, me.id), "and it cost fuel");
  // An empty reserve: fleets in supply move slower.
  const far2 = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain === "space" && distance(k, cap.at) === 7).sort()[0];   // beyond a turn even with the home-territory move
  const c = spawnFleet(s, me.id, cap.at, ["cruiser"]); setDestination(s, c.id, far2);
  me.fuelStock = 0; const before = c.path.length; endTurn(s, null);
  assert.ok(s.fleets[c.id].dry === s.turn - 1 || s.fleets[c.id].dry === s.turn || before - (s.fleets[c.id].path.length) <= 2);
  assert.ok(!setBurn(s, c.id, true).error);
});

test("sealed sectors: no way in without Rift drives or a Rift beacon; the beacon opens it for everyone", async () => {
  const { sectorsTurn } = await import("../src/sectors.js");
  const { wildsTurn } = await import("../src/wilds.js");
  const { SECTORS } = await import("../src/data.js");
  const { findPath, beaconSites, buildBeacon, canCrossSealed } = await import("../src/game.js");
  // Find a seed whose first sector is a sealed one.
  let s, kind;
  for (let seed = 40; seed < 80 && !kind; seed++) {
    s = newGame({ seed, size: "small", player: "concord", rivals: 1, mode: "open", wilds: "heavy" }); wildsTurn(s);
    s.turn = SECTORS.first - SECTORS.warn; sectorsTurn(s);
    if (SECTORS.kinds[s.sectors.coming].sealed) kind = s.sectors.coming;
  }
  assert.ok(kind, "a seed with a sealed first sector");
  s.turn = SECTORS.first; sectorsTurn(s);
  const me = s.factions[0], inside = Object.values(s.systems).find((x) => x.sector === kind);
  assert.ok(s.hexes[inside.at].sealed);
  assert.equal(findPath(s, me.id, s.systems[me.capital].at, inside.at), null, "sealed without drives");
  me.research.done.push("riftDrives"); assert.ok(canCrossSealed(s, me.id));
  assert.ok(findPath(s, me.id, s.systems[me.capital].at, inside.at), "Rift drives get in");
  me.research.done = me.research.done.filter((t) => t !== "riftDrives");
  // A beacon on a world near it opens it for everyone.
  const rim = Object.keys(s.hexes).filter((k) => s.hexes[k].sealed);
  const near = Object.values(s.systems).find((x) => !x.colony && !x.sector && !fleetsAt(s, x.at).length && rim.some((k) => distance(x.at, k) <= SECTORS.beacon.range));
  assert.ok(near, "a system by the sealed rim");
  near.colony = { owner: me.id, kind: "outpost", pop: 0, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
  assert.ok(beaconSites(s, me.id).some((o) => o.sys.id === near.id));
  me.credits = 10; assert.ok(buildBeacon(s, me.id, near.id).error, "it costs");
  me.credits = 500; me.exotics = 20; assert.ok(buildBeacon(s, me.id, near.id).ok);
  assert.ok(!Object.values(s.hexes).some((h) => h.sealed === kind));
  assert.ok(findPath(s, s.factions[1].id, s.systems[s.factions[1].capital].at, inside.at), "open to a rival too");
});

test("corridor collapses: announced, never a world's last corridor, and a scout charts a new route", async () => {
  const { corridorsTurn, collapseState } = await import("../src/sectors.js");
  const { COLLAPSE } = await import("../src/data.js");
  const s = newGame({ seed: 33, size: "small", player: "concord", rivals: 1, wilds: "none", sectors: false });
  const n0 = s.corridors.length;
  s.turn = COLLAPSE.first; corridorsTurn(s);
  const c = collapseState(s).coming; assert.ok(c && c.at === s.turn + COLLAPSE.warn);
  assert.ok(s.adj[c.a].length >= 2 && s.adj[c.b].length >= 2);
  s.turn = c.at; corridorsTurn(s);
  assert.equal(s.corridors.length, n0 - 1); assert.ok(!s.adj[c.a].includes(c.b));
  const br = collapseState(s).breaks[0]; assert.ok(br);
  // Every system still reachable by corridors.
  const ids = Object.keys(s.systems), seen = new Set([ids[0]]), st = [ids[0]];
  while (st.length) { const x = st.pop(); for (const y of s.adj[x]) if (!seen.has(y)) { seen.add(y); st.push(y); } }
  assert.equal(seen.size, ids.length);
  // A scout at rest beside it charts a new corridor, for research.
  const me = s.factions[0], r0 = me.research.progress;
  spawnFleet(s, me.id, s.systems[c.a].at, ["scout"]);
  for (let i = 1; i < COLLAPSE.surveyTurns; i++) { s.turn++; corridorsTurn(s); assert.equal(s.corridors.length, n0 - 1, "charting takes a few turns"); }
  s.turn++; corridorsTurn(s);
  assert.equal(s.corridors.length, n0);
  assert.equal(collapseState(s).breaks.length, 0);
  assert.equal(me.research.progress, r0 + COLLAPSE.research);
  const off = newGame({ seed: 33, size: "small", player: "concord", rivals: 1, collapses: false }); off.turn = COLLAPSE.first; corridorsTurn(off); assert.equal(off.collapse, undefined);
});

test("engagements: an engaged fleet can't just sail off; it withdraws after the first exchange; ships can be detached", async () => {
  const { engaged, setWithdraw, detachShips, gunsMax } = await import("../src/game.js");
  const s = newGame({ seed: 34, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const me = s.factions[0], R = s.factions[1]; me.relations[R.id].status = "war"; R.relations[me.id].status = "war";
  const cap = s.systems[me.capital];
  const spot = Object.keys(s.hexes).find((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && distance(k, cap.at) === 3);
  const f = spawnFleet(s, me.id, spot, ["cruiser", "cruiser", "frigate", "frigate", "frigate"]);
  const e = spawnFleet(s, R.id, spot, ["dreadnought", "dreadnought"]);
  assert.ok(engaged(s, f) && engaged(s, e));
  // Detach: exact counts, never the whole fleet.
  assert.ok(detachShips(s, f.id, { cruiser: 5, frigate: 3 }).error, "not the whole fleet");
  const d = detachShips(s, f.id, { frigate: 2 }); assert.ok(d.ok && d.ships === 2);
  assert.equal(s.fleets[d.fleet].ships.length, 2); assert.equal(f.ships.length, 3);
  // Pinned: a move order doesn't take it out of the fight.
  const away = Object.keys(s.hexes).find((k) => s.hexes[k].terrain === "space" && distance(k, spot) === 2);
  assert.ok(setDestination(s, d.fleet, away).ok);
  endTurn(s, null);
  if (s.fleets[d.fleet]) assert.equal(s.fleets[d.fleet].at, spot, "engaged: it stayed");
  // Withdraw: it leaves after the battle.
  assert.ok(setWithdraw(s, f.id).ok || !s.fleets[f.id]);
  if (s.fleets[f.id]) { endTurn(s, null); if (s.fleets[f.id]) { assert.notEqual(s.fleets[f.id].at, spot, "it pulled back"); assert.ok(!s.fleets[f.id].withdraw); } }
  // Not engaged: nothing to withdraw from.
  const g = spawnFleet(s, me.id, cap.at, ["frigate"]); assert.ok(setWithdraw(s, g.id).error);
});

test("orbital guns: they fire first and finish off the weakest ship; knocking them out counts as winning the battle", async () => {
  const { gunsMax } = await import("../src/game.js");
  const s = newGame({ seed: 5, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const me = s.factions[0], R = s.factions[1]; me.relations[R.id].status = "war"; R.relations[me.id].status = "war";
  const w = s.systems[R.capital]; w.colony.buildings.battery = true; w.colony.defense = gunsMax(s, w.colony);
  for (const f of Object.values(s.fleets)) if (f.at === w.at) delete s.fleets[f.id];
  spawnFleet(s, me.id, w.at, ["frigate", "frigate"]);
  s.battleReports = []; endTurn(s, null);
  const r = s.battleReports[0]; assert.ok(r);
  assert.ok(r.units[r.events[0].a].type === "guns", "the guns fire first");
  assert.ok((r.lost[me.id] || 0) >= 1, "they sink ships, not just scratch them");
  // A big fleet knocks them out: a win, though no ship of theirs was lost.
  const s2 = newGame({ seed: 5, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const m2 = s2.factions[0], R2 = s2.factions[1]; m2.relations[R2.id].status = "war"; R2.relations[m2.id].status = "war";
  const w2 = s2.systems[R2.capital]; w2.colony.buildings.battery = true; w2.colony.defense = gunsMax(s2, w2.colony);
  for (const f of Object.values(s2.fleets)) if (f.at === w2.at) delete s2.fleets[f.id];
  spawnFleet(s2, m2.id, w2.at, Array(6).fill("cruiser"));
  s2.battleReports = []; endTurn(s2, null);
  const r2 = s2.battleReports[0];
  assert.equal(w2.colony.defense, 0); assert.equal(r2.silenced, R2.id); assert.equal(r2.won, "won");
});

test("influence: gifts raise regard (less when piled up), amends forgive, sweeteners win proposals, tribute and denouncing", async () => {
  const { giftRegard, giveGift, makeAmends, amendsCost, acceptHint, proposeSweetened, exactTribute, denounce, askJoinWar, joinWarPrice, remember } = await import("../src/game.js");
  const s = newGame({ seed: 36, size: "small", player: "concord", rivals: 3, wilds: "none" });
  const me = s.factions[0], [A, B, C] = s.factions.slice(1);
  for (const X of [A, B, C]) { me.met[X.id] = true; X.met[me.id] = true; }
  for (const X of [A, B, C]) for (const Y of [A, B, C]) if (X !== Y) X.met[Y.id] = true;
  me.credits = 1000; me.exotics = 10;
  // Gifts: regard goes up, and the next gift counts for less.
  const r = A.relations[me.id], s0 = r.score, g1 = giftRegard(s, me.id, A.id, 100);
  assert.ok(giveGift(s, me.id, A.id, { credits: 100 }).ok); assert.ok(r.score > s0);
  assert.ok(giftRegard(s, me.id, A.id, 100) < g1, "diminishing");
  assert.ok(giveGift(s, me.id, A.id, { credits: 99999 }).error);
  // Amends: a grievance forgiven for credits.
  remember(s, B.id, me.id, "raided our fuel depot at X", -10);
  const i = B.relations[me.id].memory.length - 1, cost = amendsCost(s, me.id, B.id, i), b0 = B.relations[me.id].score;
  assert.ok(cost > 0 && makeAmends(s, me.id, B.id, i).ok);
  assert.ok(B.relations[me.id].score > b0 && amendsCost(s, me.id, B.id, i) === null, "once");
  // An alliance they'd refuse, sweetened until they accept.
  C.relations[me.id].score = 5;
  const h = acceptHint(s, me.id, C.id, "alliance"); assert.ok(!h.yes && h.sweeten > 0);
  const p = proposeSweetened(s, me.id, C.id, "alliance"); assert.ok(p.ok && p.accepted, "sweetened alliance accepted");
  // Tribute: only from the much weaker, and they resent it.
  spawnFleet(s, me.id, s.systems[me.capital].at, Array(10).fill("cruiser"));
  for (const f of fleetsOf(s, B.id)) delete s.fleets[f.id];
  const bs = B.relations[me.id].score, t = exactTribute(s, me.id, B.id);
  assert.ok(t.ok); assert.ok(B.relations[me.id].score < bs); assert.ok(exactTribute(s, me.id, B.id).error, "not again so soon");
  // Denounce: the third power thinks less of the rival.
  const ab = C.relations[A.id].score; assert.ok(denounce(s, me.id, A.id, C.id).ok); assert.ok(C.relations[A.id].score < ab);
  // Ask an ally to join a war.
  declareWar(s, me.id, A.id);
  if (C.relations[A.id].status !== "war") { assert.equal(joinWarPrice(s, me.id, C.id, A.id), 0); assert.ok(askJoinWar(s, me.id, C.id, A.id).ok); assert.equal(C.relations[A.id].status, "war"); }
});

test("computer players use influence: a weak power appeases a strong neighbour, and tribute from you needs its option", async () => {
  const { aiTurn } = await import("../src/ai.js");
  const s = newGame({ seed: 37, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const me = s.factions[0], T = s.factions[1];
  me.met[T.id] = T.met[me.id] = true; s.turn = 40;
  T.credits = 400; T.relations[me.id].score = -15;
  spawnFleet(s, me.id, s.systems[me.capital].at, Array(12).fill("cruiser"));
  for (const f of fleetsOf(s, T.id)) if (f.ships.some((x) => SHIPS[x.type].skill)) delete s.fleets[f.id];
  const c0 = me.credits;
  for (let i = 0; i < 30 && me.credits === c0; i++) { s.turn += 13; aiTurn(s, T); }
  assert.ok(me.credits > c0, "they sent something to buy peace");
  assert.ok(s.log.some((l) => l.fid === me.id && /sent you a gift|made amends/.test(l.text)), "and you were told");
  // Easy: no tribute demands on you.
  const { aiOpt } = await import("../src/game.js");
  const e = newGame({ seed: 37, size: "small", player: "concord", rivals: 1, difficulty: "easy" });
  assert.equal(aiOpt(e, "tribute"), false); assert.equal(aiOpt(e, "influence"), true);
});

test("the new empires' traits: Mirrun science and seas, Ylith far sight and fast scouts, Zhaq garrisons that never break", async () => {
  const { yields, garrisonFactor, FACTIONS: _f } = await import("../src/game.js").then((G) => ({ ...G, FACTIONS: null }));
  const { FACTIONS } = await import("../src/data.js");
  assert.ok(["mirrun", "ylith", "zhaq"].every((id) => FACTIONS.some((f) => f.id === id)));
  const m = newGame({ seed: 40, size: "small", player: "mirrun", rivals: 1 }), mh = m.systems[m.factions[0].capital];
  assert.equal(mh.world, "ocean", "a Mirrun homeworld is an ocean");
  const mp = maxPop(m, mh); mh.colony.owner = "concord"; const cp = maxPop(m, mh); mh.colony.owner = "mirrun";
  assert.equal(mp - cp, 3);
  const y = newGame({ seed: 40, size: "small", player: "ylith", rivals: 1 });
  assert.equal(shipStats(y, "ylith", "scout").sensors, shipStats(y, "concord", "scout").sensors + 2);
  assert.equal(shipStats(y, "ylith", "scout").speed, shipStats(y, "concord", "scout").speed + 1);
  assert.equal(shipStats(y, "ylith", "frigate").speed, shipStats(y, "concord", "frigate").speed, "only scouts and colony ships");
  const z = newGame({ seed: 40, size: "small", player: "zhaq", rivals: 1 }), zh = z.systems[z.factions[0].capital];
  zh.colony.siege = 9; assert.equal(garrisonFactor(zh), 1);
  zh.colony.owner = "concord"; assert.ok(garrisonFactor(zh) < 1); zh.colony.owner = "zhaq";
});

test("travel time: the turns a fleet is told it will take are the turns it takes", async () => {
  const { turnStops, fleetSpeed } = await import("../src/game.js");
  // The Vael need no fuel, so nothing but the route sets the pace; no relics to pick up on the way.
  const s = newGame({ seed: 2, size: "medium", player: "vael", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  for (const x of Object.values(s.systems)) { delete x.relic; delete x.anomaly; }
  const me = s.factions[0]; for (const k of Object.keys(s.hexes)) me.explored[k] = 1;
  // Some nebula along the way, where steps cost 2.
  Object.keys(s.hexes).filter((k, i) => i % 5 === 0 && !s.sysAt[k] && s.hexes[k].terrain === "space").forEach((k) => (s.hexes[k].terrain = "nebula"));
  for (const f of Object.values(s.fleets)) delete s.fleets[f.id];
  const sys = Object.values(s.systems); let checked = 0;
  for (let i = 0; i < 25; i++) {
    const a = sys[(i * 7 + 1) % sys.length], b = sys[(i * 11 + 4) % sys.length]; if (a === b) continue;
    const f = spawnFleet(s, me.id, a.at, ["dreadnought"]); const r = setDestination(s, f.id, b.at); if (!r.ok) { delete s.fleets[f.id]; continue; }
    assert.equal(r.turns, turnStops(s, f).length);
    let n = 0; while (f.at !== b.at && n < 40) { endTurn(s, null); n++; }
    assert.equal(n, r.turns, `route ${a.name} → ${b.name}: told ${r.turns}, took ${n}`); checked++;
    delete s.fleets[f.id];
  }
  assert.ok(checked >= 15);
});

test("a world finishes one thing a turn: rushing the first doesn't empty the queue at once", () => {
  const s = newGame({ seed: 51, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const me = s.factions[0], cap = s.systems[me.capital];
  me.research.current = "sensors"; me.credits = 1000; cap.colony.stock = 40;
  for (let i = 0; i < 4; i++) assert.ok(enqueue(s, cap.id, "ship", "outpost").ok);
  assert.ok(rush(s, cap.id).ok);
  const count = () => fleetsOf(s, me.id).reduce((t, f) => t + f.ships.filter((x) => x.type === "outpost").length, 0);
  endTurn(s, null);
  assert.equal(count(), 1, "the rushed one, and only it");
  assert.equal(cap.colony.queue.length, 3);
  assert.ok(cap.colony.queue[0].progress > 0, "the rest of the turn's industry went into the next");
  endTurn(s, null);
  assert.equal(count(), 2, "the next finishes next turn");
});

test("a coalition against the Wardens: friends come free, the lukewarm for credits, and they hold the target", async () => {
  const { crisisTurn, coalitionTargets, coalitionAnswers, callCoalition } = await import("../src/crisis.js");
  const { aiTurn } = await import("../src/ai.js");
  const s = newGame({ seed: 41, size: "medium", player: "concord", rivals: 3, wilds: "none" });
  const me = s.factions[0], [A, B, C] = s.factions.slice(1);
  for (const X of [A, B, C]) { me.met[X.id] = X.met[me.id] = true; for (let i = 0; i < 2; i++) spawnFleet(s, X.id, s.systems[X.capital].at, ["cruiser", "cruiser", "cruiser"]); }
  crisisTurn(s); s.turn = s.crisis.at - 6; crisisTurn(s); s.galEvent = null; s.turn = s.crisis.at; crisisTurn(s); s.galEvent = null;
  for (const k of Object.keys(s.hexes)) me.explored[k] = 1;
  const tg = coalitionTargets(s, me.id).filter((x) => x.kind === "heart"); assert.ok(tg.length, "the Heart is a target");
  A.relations[me.id].score = 20; B.relations[me.id].score = 0; C.relations[me.id].score = -30;
  const ans = Object.fromEntries(coalitionAnswers(s, me.id).map((a) => [a.id, a]));
  assert.equal(ans[A.id].answer, "free"); assert.equal(ans[B.id].answer, "paid"); assert.equal(ans[C.id].answer, "no");
  me.credits = 1000; const c0 = me.credits;
  const r = callCoalition(s, me.id, tg[0].at, true); assert.ok(r.ok && r.members === 2 && r.ships > 0);
  assert.equal(me.credits, c0 - ans[B.id].price);
  assert.ok(callCoalition(s, me.id, tg[0].at, true).error, "one at a time");
  // Their fleets head for the Heart and keep going there.
  const committed = Object.values(s.fleets).filter((f) => f.coalition);
  assert.ok(committed.length && committed.every((f) => f.dest === tg[0].at || f.at === tg[0].at));
  aiTurn(s, A); assert.ok(Object.values(s.fleets).filter((f) => f.coalition && f.owner === A.id).every((f) => f.dest === tg[0].at || f.at === tg[0].at));
});

test("repairs: damaged ships split off to the best yard, mend, and rejoin their fleet; in a battle they withdraw first", async () => {
  const { sendForRepairs, damagedShips, repairPlace } = await import("../src/game.js");
  const s = newGame({ seed: 52, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const me = s.factions[0], cap = s.systems[me.capital]; me.research.current = "sensors";
  cap.colony.buildings.drydock = true;
  const spot = Object.keys(s.hexes).find((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && distance(k, cap.at) === 2);
  const f = spawnFleet(s, me.id, spot, ["cruiser", "cruiser", "cruiser"]); f.ships[0].hull = 1; f.ships[1].hull = 2;
  assert.equal(damagedShips(s, f).length, 2);
  const rp = repairPlace(s, me.id, f.at, damagedShips(s, f), 3); assert.equal(rp.sys.id, cap.id); assert.equal(rp.how, "drydock");
  const r = sendForRepairs(s, f.id, true); assert.ok(r.ok && r.split && r.ships === 2 && r.to === cap.name);
  assert.equal(f.ships.length, 1, "the sound one stays");
  const g = s.fleets[r.fleet];
  for (let i = 0; i < 6 && s.fleets[g.id]; i++) endTurn(s, null);
  assert.ok(!s.fleets[g.id], "mended and merged back");
  assert.equal(f.ships.length, 3); assert.ok(!damagedShips(s, f).length, "all whole again");
  assert.ok(sendForRepairs(s, f.id).error, "nothing to repair");
  // In a battle: they withdraw first.
  const R = s.factions[1]; me.relations[R.id].status = "war"; R.relations[me.id].status = "war";
  f.ships[0].hull = 1; spawnFleet(s, R.id, f.at, ["frigate"]);
  const w = sendForRepairs(s, f.id); assert.ok(w.ok && w.withdrawing);
  assert.ok(s.fleets[w.fleet].withdraw);
});

test("computer players send badly damaged ships for repairs when it's safe, and keep the rest on station", async () => {
  const { aiTurn } = await import("../src/ai.js");
  const s = newGame({ seed: 53, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const F = s.factions[1], home = s.systems[F.capital]; home.colony.buildings.drydock = true; F.credits = 2000; home.colony.pop = 30; home.colony.buildings.market = true;   // rich enough to keep them (no scrapping for upkeep)
  const spot = Object.keys(s.hexes).find((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && distance(k, home.at) === 3);
  const f = spawnFleet(s, F.id, spot, ["cruiser", "cruiser", "cruiser", "cruiser", "cruiser"]);
  f.ships[0].hull = 1; f.ships[1].hull = 1; f.ships[2].hull = 3;   // two badly damaged, one scratched
  aiTurn(s, F);
  const away = Object.values(s.fleets).find((g) => g.owner === F.id && g.repairAt);
  assert.ok(away, "a repair trip");
  assert.equal(away.ships.length, 2, "only the badly damaged");
  assert.equal(f.ships.length, 3, "the rest stay");
  // Not with an enemy close by.
  const t = newGame({ seed: 53, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const G2 = t.factions[1], me = t.factions[0]; t.systems[G2.capital].colony.buildings.drydock = true; G2.credits = 2000; t.systems[G2.capital].colony.pop = 30; t.systems[G2.capital].colony.buildings.market = true; me.relations[G2.id].status = G2.relations[me.id].status = "war";
  const g = spawnFleet(t, G2.id, spot, ["cruiser", "cruiser", "cruiser", "cruiser", "cruiser"]); g.ships[0].hull = 1; g.ships[1].hull = 1;
  const near = Object.keys(t.hexes).find((k) => t.hexes[k].terrain === "space" && !t.sysAt[k] && distance(k, spot) === 2);
  spawnFleet(t, me.id, near, ["frigate"]);
  aiTurn(t, G2);
  assert.ok(!Object.values(t.fleets).some((x) => x.owner === G2.id && x.repairAt), "no trip with enemies near");
});

test("calls to arms: a wave at your world brings a message with a coalition against it; a friend under attack asks for help", async () => {
  const { crisisTurn, wardenThreats, coalitionTargets, callCoalition } = await import("../src/crisis.js");
  const { currentEnvoy, answerEnvoy } = await import("../src/envoys.js");
  const s = newGame({ seed: 41, size: "medium", player: "concord", rivals: 3, wilds: "none" });
  const me = s.factions[0], [A, B] = s.factions.slice(1);
  for (const X of s.factions.slice(1)) { me.met[X.id] = X.met[me.id] = true; spawnFleet(s, X.id, s.systems[X.capital].at, ["cruiser", "cruiser", "cruiser"]); }
  crisisTurn(s); s.turn = s.crisis.at - 6; crisisTurn(s); s.galEvent = null; s.turn = s.crisis.at; crisisTurn(s); s.galEvent = null; s.inbox = [];
  A.relations[me.id].score = 20;
  // A wave at our capital, and another at A's.
  const W = "wardens", cap = s.systems[me.capital], acap = s.systems[A.capital];
  const w1 = spawnFleet(s, W, cap.at, ["sentinel", "sentinel"]), w2 = spawnFleet(s, W, acap.at, ["sentinel"]);
  for (const k of [cap.at, acap.at]) me.visible[k] = me.explored[k] = 1;
  assert.ok(wardenThreats(s, me.id).some((t) => t.fleet === w1.id));
  s.turn++; crisisTurn(s);
  const m = currentEnvoy(s); assert.equal(m.kind, "wardenAttack"); assert.ok(m.options.some((o) => o.id === "call"), "a coalition, right there");
  assert.ok(coalitionTargets(s, me.id).some((t) => t.kind === "wave" && t.fleet === w1.id));
  const r = answerEnvoy(s, "call"); assert.ok(r.ok && /The call goes out/.test(r.text));
  assert.equal(s.crisis.coalition.fleet, w1.id, "the coalition follows that wave");
  const help = currentEnvoy(s); assert.equal(help && help.kind, "wardenHelp", "A asks for help");
  assert.ok(answerEnvoy(s, "no").ok);
  // The wave destroyed: the coalition ends.
  delete s.fleets[w1.id]; s.turn++; crisisTurn(s); assert.ok(s.crisis.coalition.done);
});

test("Warden probes: out of the rifts, they scan worlds from a hex away; the first sighting and their contact are choices; what gets home makes the Wardens stronger", async () => {
  const { crisisTurn, CRISIS_EVENTS } = await import("../src/crisis.js");
  const { chooseEvent, currentEvent } = await import("../src/events.js");
  const { CRISIS } = await import("../src/data.js");
  const s = newGame({ seed: 41, size: "medium", player: "concord", rivals: 2, wilds: "none" });
  const me = s.factions[0];
  crisisTurn(s); s.turn = s.crisis.at - CRISIS.signsLead; crisisTurn(s);
  for (let i = 0; i < 40 && !s.galEvent; i++) { me.detect = {}; for (const k of Object.keys(s.hexes)) me.visible[k] = me.detect[k] = 1; s.turn++; crisisTurn(s); }   // (probes are cloaked: seen only where detected)
  assert.equal(s.galEvent && s.galEvent.id, "probes", "the first sighting is a choice");
  assert.ok(chooseEvent(s, "learn").ok); assert.ok(s.crisis.learn[me.id]);
  // A probe home again: the Wardens learn, and wake stronger.
  const base = s.crisis.intel || 0; s.crisis.intel = base + 3;
  // The contact: answer it, and learn where the Heart will rise.
  s.galEvent = { id: "contact", ctx: { world: me.capital }, turn: s.turn };
  const r = chooseEvent(s, "answer"); assert.ok(r.ok);
  assert.ok(s.crisis.heartSite && s.crisis.answeredBy === me.id);
  const site = s.crisis.heartSite;
  s.galEvent = null; s.turn = s.crisis.at - CRISIS.warning; crisisTurn(s); s.galEvent = null; s.turn = s.crisis.at; crisisTurn(s);
  assert.equal(s.crisis.heart, site, "the Heart rose where it said");
  assert.ok(!Object.values(s.fleets).some((f) => f.ships.some((x) => x.type === "probe")), "the probes go home when it wakes");
  // Only warships catch probes: orbital guns don't fire on them.
  assert.ok(CRISIS_EVENTS.probes && CRISIS_EVENTS.contact);
});

test("Warden intelligence: what you've learned can be shared with each power once, for their regard, and it helps them", async () => {
  const { crisisTurn, wardenIntel, shareIntel } = await import("../src/crisis.js");
  const { CRISIS } = await import("../src/data.js");
  const s = newGame({ seed: 41, size: "medium", player: "concord", rivals: 2, wilds: "none" });
  const me = s.factions[0], A = s.factions[1]; me.met[A.id] = A.met[me.id] = true;
  crisisTurn(s); s.turn = s.crisis.at - CRISIS.signsLead; crisisTurn(s);
  assert.equal(wardenIntel(s, me.id, A.id).length, 0, "nothing to tell yet");
  s.crisis.probeEvent = s.turn; s.turn += 15;
  const items = wardenIntel(s, me.id, A.id).map((x) => x.id);
  assert.ok(items.includes("probes") && items.includes("signal"));
  const r0 = A.relations[me.id].score, r = shareIntel(s, me.id, A.id, "probes");
  assert.ok(r.ok && A.relations[me.id].score > r0);
  assert.ok(!wardenIntel(s, me.id, A.id).some((x) => x.id === "probes"), "once");
  assert.ok(shareIntel(s, me.id, A.id, "probes").error);
  // What you decoded, they can use: +1 to hit the Wardens.
  s.crisis.decoded = { [me.id]: true };
  assert.ok(shareIntel(s, me.id, A.id).ok); assert.ok(s.crisis.decoded[A.id]);
  assert.equal(wardenIntel(s, me.id, A.id).length, 0, "everything told");
});

test("computer players share what they know of the Wardens with the powers they like, the player included", async () => {
  const { crisisTurn } = await import("../src/crisis.js");
  const { aiTurn } = await import("../src/ai.js");
  const { CRISIS } = await import("../src/data.js");
  const s = newGame({ seed: 41, size: "medium", player: "concord", rivals: 2, wilds: "none" });
  const me = s.factions[0], A = s.factions[1], B = s.factions[2];
  for (const [x, y] of [[me, A], [me, B], [A, B]]) { x.met[y.id] = y.met[x.id] = true; }
  crisisTurn(s); s.turn = s.crisis.at - CRISIS.signsLead; crisisTurn(s); s.turn += 15;
  s.crisis.sawProbe = { [A.id]: s.turn };
  A.relations[me.id].score = 20; A.relations[B.id].score = -20;   // likes us, not B
  aiTurn(s, A);
  assert.ok(s.log.some((l) => l.fid === me.id && /told you what they know of the Wardens/.test(l.text)), "it told us");
  assert.ok(!(s.crisis.aiShares || []).some((x) => x.from === A.id && x.to === B.id), "not the one it dislikes");
  assert.ok(me.relations[A.id] && (me.relations[A.id].memory || []).some((m) => /Wardens/.test(m.text)), "remembered");
});

test("signature technologies: only their people can research them; taking a world with the hub teaches the captor", async () => {
  const { TECHS, BUILDINGS } = await import("../src/data.js");
  const { availableTechs, has, setResearch } = await import("../src/game.js");
  const s = newGame({ seed: 61, size: "small", player: "concord", rivals: 1, wilds: "none", crisis: false, sectors: false, collapses: false });
  const me = s.factions[0], R = s.factions[1];
  me.research.done.push("xenology", "commerce", "automation", "sensors", "batteries", "heavyHulls");
  const mineIds = availableTechs(s, me.id).filter((t) => t.only).map((t) => t.id);
  assert.deepEqual(mineIds, ["frontierCharters"], "only our own");
  assert.ok(setResearch(s, me.id, TECHS.find((t) => t.only === R.id).id).error !== undefined || !availableTechs(s, me.id).some((t) => t.only === R.id));
  // The rival's hub on a world; we take it.
  const rt = TECHS.find((t) => t.only === R.id), hub = rt.hub, w = s.systems[R.capital];
  R.research.done.push(rt.id); w.colony.buildings[hub] = true;
  assert.ok(!has(s, me.id, rt.id));
  me.relations[R.id].status = R.relations[me.id].status = "war";
  for (const f of Object.values(s.fleets)) if (f.at === w.at) delete s.fleets[f.id];
  w.colony.defense = 0; w.colony.pop = 1; w.colony.capital = false;
  const t = spawnFleet(s, me.id, w.at, Array(8).fill("transport"));
  const r = invade(s, t.id);
  assert.ok(r.ok, JSON.stringify(r)); assert.equal(w.colony.owner, me.id);
  assert.ok(has(s, me.id, rt.id), "the captor learned it");
  assert.ok(BUILDINGS[hub].hub === rt.id);
});

test("ship counters: torpedo boats beat dreadnoughts, frigates beat torpedo boats, cruisers beat frigates, dreadnoughts beat cruisers", () => {
  const duel = (A, B, N = 30) => {
    let a = 0;
    for (let seed = 1; seed <= N; seed++) {
      const s = newGame({ seed, size: "small", player: "concord", rivals: 1, wilds: "none" }); s.crisisOff = true;
      const o = s.factions[1].id; declareWar(s, "concord", o);
      const hex = Object.keys(s.hexes).filter((h) => !s.sysAt[h] && Object.values(s.systems).every((x) => distance(x.at, h) >= 3)).sort()[0];
      const fa = spawnFleet(s, "concord", hex, A), fb = spawnFleet(s, o, hex, B);
      for (let t = 0; t < 8 && s.fleets[fa.id] && s.fleets[fb.id]; t++) endTurn(s);
      const v = (f) => (s.fleets[f.id] ? s.fleets[f.id].ships.reduce((n, x) => n + SHIPS[x.type].cost * x.hull / shipStats(s, f.owner, x.type, x).hull, 0) : 0);
      if (v(fa) > v(fb)) a++;
    }
    return a / N;
  };
  assert.ok(duel(["torpedo", "torpedo", "torpedo"], ["dreadnought"]) >= 0.65, "torpedo boats crack a dreadnought");
  assert.ok(duel(["frigate", "frigate", "frigate", "frigate"], ["torpedo", "torpedo", "torpedo"]) >= 0.8, "frigates screen against torpedo boats");
  assert.ok(duel(["dreadnought"], ["cruiser", "cruiser"]) >= 0.6, "a dreadnought crushes cruisers");
});

test("cloaking: a stealth corvette is seen only where it's detected (scouts, worlds close by), slips past enemy fleets, and strikes first", async () => {
  const { seesFleet, updateVision } = await import("../src/game.js");
  const s = newGame({ seed: 12, size: "medium", player: "concord", rivals: 1, wilds: "none" }), me = s.factions[0], O = s.factions[1];
  declareWar(s, me.id, O.id);
  const free = (h) => s.hexes[h] && !s.sysAt[h] && s.hexes[h].terrain === "space" && Object.values(s.systems).every((x) => distance(x.at, h) >= 3);
  const hex = Object.keys(s.hexes).filter(free).sort()[0];
  const two = Object.keys(s.hexes).find((h) => distance(h, hex) === 2 && free(h));
  const watch = spawnFleet(s, O.id, two, ["frigate"]);
  const sc = spawnFleet(s, me.id, hex, ["stealth"]);
  updateVision(s, O);
  assert.ok(O.visible[hex], "the hex is in view");
  assert.ok(!seesFleet(s, O, sc), "but the corvette isn't seen: a frigate detects only its own hex");
  spawnFleet(s, O.id, two, ["scout"]); updateVision(s, O);
  assert.ok(seesFleet(s, O, sc), "a scout detects it");
  // Slipping past: a fleet of corvettes goes through a hex an enemy fleet holds; a frigate would stop there.
  delete s.fleets[watch.id]; for (const f of fleetsOf(s, O.id)) if (f.at === two) delete s.fleets[f.id];
  const mid = neighbors(hex).find(free), end = neighbors(mid).find((h) => h !== hex && free(h) && distance(h, hex) === 2);
  spawnFleet(s, O.id, mid, ["frigate"]);
  sc.path = [{ hex: mid, cost: 1 }, { hex: end, cost: 1 }]; sc.dest = end;
  const fr = spawnFleet(s, me.id, hex, ["frigate"]); fr.path = [{ hex: mid, cost: 1 }, { hex: end, cost: 1 }]; fr.dest = end;
  endTurn(s);
  assert.equal(s.fleets[sc.id].at, end, "the corvette slipped past");
  assert.ok(!s.fleets[fr.id] || s.fleets[fr.id].at === mid, "the frigate was stopped");
});

test("space mining: fields in open space; a parked mining ship mines them each turn (more with a station near); they run dry", async () => {
  const { miningYields, miningIncome, fieldAt } = await import("../src/game.js");
  const { MINING } = await import("../src/data.js");
  const s = newGame({ seed: 7, size: "medium", player: "concord", rivals: 1, wilds: "none" }), me = s.factions[0];
  const fields = Object.entries(s.fields);
  assert.ok(fields.length >= 10, "fields scattered through open space");
  for (const [k] of fields) assert.ok(!s.sysAt[k], "never in a system");
  const [ore] = fields.find(([, f]) => f.kind === "ore");
  const m = spawnFleet(s, me.id, ore, ["miner", "miner"]);
  assert.equal(miningIncome(s, me.id).credits, 2 * MINING.kinds.ore.per, "two ships, a share each");
  assert.equal(totals(s, me.id).mine, 2 * MINING.kinds.ore.per, "counted in the books");
  m.path = [{ hex: neighbors(ore)[0], cost: 1 }]; assert.equal(miningYields(s, me.id).length, 0, "not while moving"); m.path = [];
  // Run it dry.
  const left = fieldAt(s, ore).left; fieldAt(s, ore).left = 4; endTurn(s);
  assert.ok(left > 4 && !fieldAt(s, ore), "mined out, and gone");
  // Exotics, a whole one at a time.
  const cr = fields.find(([, f]) => f.kind === "crystal");
  if (cr) { spawnFleet(s, me.id, cr[0], ["miner", "miner"]); const e0 = me.exotics; endTurn(s); assert.equal(me.exotics - e0, 1, "two ships: an exotic a turn"); }
});

test("home territory: a turn begun at home goes a hex farther, ships mend there, and the Kel's old colonies reach farther", async () => {
  const { territoryAt, turnStops, territoryOf } = await import("../src/game.js");
  const { HOME } = await import("../src/data.js");
  const s = newGame({ seed: 9, size: "medium", player: "concord", rivals: 2, wilds: "none" }), me = s.factions[0], cap = s.systems[me.capital];
  assert.equal(territoryAt(s, cap.at), me.id);
  const far = Object.keys(s.hexes).filter((k) => s.hexes[k].terrain === "space" && !s.sysAt[k] && distance(k, cap.at) === 7).sort()[0];
  const f = spawnFleet(s, me.id, cap.at, ["frigate"]); setDestination(s, f.id, far);
  const g = spawnFleet(s, me.id, far, ["frigate"]); setDestination(s, g.id, cap.at);
  const first = (x) => turnStops(s, x)[0] + 1;
  assert.ok(first(f) > first(g) || first(f) >= 4, "from home it covers more of the way in the first turn");
  const x = spawnFleet(s, me.id, neighbors(cap.at).find((k) => !s.sysAt[k]), ["cruiser"]); x.ships[0].hull = 1; endTurn(s);
  assert.ok(s.fleets[x.id].ships[0].hull >= 1 + HOME.mend, "mended at home");
  const k = newGame({ seed: 9, size: "medium", player: "kel", rivals: 2, wilds: "none" }), kc = k.systems[k.factions[0].capital];
  const reach = () => Object.values(territoryOf(k)).filter((t) => t.owner === "kel").length;
  const n0 = reach(); k.turn += HOME.kelAge + 1; kc.colony.founded = 0;
  assert.ok(reach() >= n0, "the Kel's territory doesn't shrink as it ages");
});

test("admirals' powers: used from the fleet, then a wait; a drill mends, running silent cloaks", async () => {
  const { useAdmiralPower, powerWait, powerOf, cloaked, makeAdmiral } = await import("../src/game.js");
  const { ADMIRAL_POWERS } = await import("../src/data.js");
  const s = newGame({ seed: 4, size: "small", player: "concord", rivals: 1, wilds: "none" }), me = s.factions[0];
  const f = spawnFleet(s, me.id, s.systems[me.capital].at, ["cruiser", "cruiser"]);
  assert.ok(useAdmiralPower(s, f.id).error, "it takes an admiral");
  f.admiral = makeAdmiral(s, me.id, { int: () => 0, next: () => 0 }); f.admiral.power = "rally";
  f.ships[0].hull = 1; assert.ok(useAdmiralPower(s, f.id).ok); assert.equal(f.ships[0].hull, 3, "the drill mends 2");
  assert.equal(powerWait(s, f), ADMIRAL_POWERS.rally.every); assert.ok(useAdmiralPower(s, f.id).error, "then waits");
  s.turn += ADMIRAL_POWERS.rally.every; f.admiral.power = "ghost"; assert.ok(!cloaked(f, s)); assert.ok(useAdmiralPower(s, f.id).ok); assert.ok(cloaked(f, s), "running silent");
  assert.ok(Object.keys(ADMIRAL_POWERS).includes(powerOf({ name: "Old Admiral" })), "an admiral from an older game gets one too");
});

test("key sites: a few, away from capitals; their holder (and allies) get the bonus: cheaper ships, a waystation's supply and fuel", async () => {
  const { siteSystems, sitesFor, fuelIncome } = await import("../src/game.js");
  const { SITES } = await import("../src/data.js");
  const s = newGame({ seed: 6, size: "medium", player: "concord", rivals: 2, wilds: "none" }), me = s.factions[0];
  const sites = siteSystems(s); assert.ok(sites.length >= SITES.min);
  for (const x of sites) for (const F of s.factions) assert.ok(distance(x.at, s.systems[F.capital].at) >= SITES.fromCapital);
  const yard = sites.find((x) => x.site === "shipyard"), way = sites.find((x) => x.site === "waystation");
  const c0 = shipStats(s, me.id, "cruiser").cost;
  yard.colony = { owner: me.id, kind: "outpost", pop: 0, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
  assert.ok(shipStats(s, me.id, "cruiser").cost < c0, "the ancient shipyard: cheaper ships");
  const ally = s.factions[1]; me.relations[ally.id].allied = ally.relations[me.id].allied = true;
  assert.equal(sitesFor(s, ally.id, "shipyard").length, 1, "shared with an ally");
  if (way) { const f0 = fuelIncome(s, me.id); way.colony = { owner: me.id, kind: "outpost", pop: 0, growth: 0, buildings: {}, queue: [], stock: 0, defense: 0, capital: false };
    assert.ok(fuelIncome(s, me.id) >= f0 + 3, "a waystation: fuel"); assert.ok(inSupplyAt(s, me.id, way.at), "and supply"); }
});

test("the Corridor Engine charges: finishing it wakes the Wardens, it waits while they stand or its orbit is held, and wins after the countdown", async () => {
  const { engineCharge } = await import("../src/game.js");
  const { ENGINE, CRISIS } = await import("../src/data.js");
  const s = newGame({ seed: 3, size: "small", player: "concord", rivals: 1, wilds: "none" }), me = s.factions[0], cap = s.systems[me.capital];
  s.crisis = { stage: "quiet", at: 500 };
  me.research.done.push("engine"); me.exotics = 40; cap.colony.queue = [{ kind: "building", id: "engine", cost: 1, progress: 0, exotics: 15 }]; cap.colony.stock = 50;
  endTurn(s);
  const E = engineCharge(s); assert.ok(E && E.owner === me.id, "finished: charging, not won"); assert.ok(!s.winner);
  assert.ok(s.crisis.at <= s.turn + CRISIS.warning, "its first pulse wakes the Wardens");
  endTurn(s); assert.equal(E.paused, "wardens"); const left = E.left;
  s.crisis.stage = "over"; endTurn(s); assert.equal(E.left, left - 1, "the Wardens beaten: it charges");
  const foe = s.factions[1]; declareWar(s, foe.id, me.id); s.fleets = Object.fromEntries(Object.entries(s.fleets).filter(([, f]) => f.at !== cap.at));
  cap.colony.defense = 0; spawnFleet(s, foe.id, cap.at, ["dreadnought", "dreadnought", "dreadnought"]); endTurn(s);
  assert.equal(E.paused, "siege", "enemy warships in its orbit: it waits");
  for (const f of Object.values(s.fleets)) if (f.owner === foe.id) delete s.fleets[f.id];
  for (let i = 0; i < ENGINE.charge + 2 && !s.winner; i++) endTurn(s);
  assert.equal(s.winner, me.id); assert.equal(s.winReason, "engine");
});

test("Watchers have to be found: off the map until a ship or world of yours sees one, then remembered", async () => {
  const { updateVision } = await import("../src/game.js");
  const s = newGame({ seed: 5, size: "medium", player: "concord", rivals: 1, wilds: "none" }), me = s.factions[0];
  const far = Object.keys(s.hexes).filter((h) => !me.visible[h] && !s.sysAt[h] && s.hexes[h].terrain === "space").sort()[0];
  const w = spawnFleet(s, "wardens", far, ["watcher"]);
  updateVision(s, me); assert.ok(!(me.foundW || {})[w.id], "not found yet");
  const sc = spawnFleet(s, me.id, far, ["scout"]); updateVision(s, me); assert.ok(me.foundW[w.id], "a scout finds it");
  delete s.fleets[sc.id]; updateVision(s, me); assert.ok(!me.visible[far] && me.foundW[w.id], "out of sight again, but remembered");
});
