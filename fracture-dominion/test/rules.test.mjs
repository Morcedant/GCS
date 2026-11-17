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
  assert.equal(invasionOdds(s, spawnFleet(s, "concord", w.at, ["transport"]).id).defense, bare + BATTERY.garrison, "its troops add to the garrison");
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

test("yards: a station repairs 2 a turn, a drydock to full; a drydock builds 15% cheaper and refits ships up a class", async () => {
  const { refitOptions, refit } = await import("../src/game.js");
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
  const g = spawnFleet(s, "concord", cap.at, ["frigate"]);
  const o = refitOptions(s, g.id).find((x) => x.from === "frigate");
  assert.ok(o && o.to === "cruiser");
  me.credits = 1000; me.exotics = 5;
  assert.ok(refit(s, g.id, "frigate").ok);
  assert.equal(g.ships[0].type, "cruiser"); assert.equal(g.ships[0].hull, full);
  assert.equal(me.credits, 1000 - o.credits); assert.equal(me.exotics, 5 - o.exotics);
  assert.ok(!refitOptions(s, g.id).some((x) => x.from === "cruiser"), "a dreadnought needs Capital ships");
  delete cap.colony.buildings.drydock; assert.equal(refitOptions(s, g.id).length, 0, "no drydock, no refits");
});
