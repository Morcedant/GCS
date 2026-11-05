import assert from "node:assert/strict";
import test from "node:test";
import { distance, neighbors, hexagon, fromPixel, toPixel, within } from "../src/hex.js";
import { newGame, endTurn, findPath, setDestination, settle, spawnFleet, coloniesOf, fleetsOf, faction, declareWar, invade, invasionOdds,
  enqueue, rush, totals, yields, setResearch, availableTechs, propose, score, canSettle, atWar } from "../src/game.js";
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
