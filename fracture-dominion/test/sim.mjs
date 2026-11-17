// An all-computer game, for balance and bugs: node test/sim.mjs [seed] [turns] [size]
import { newGame, endTurn, coloniesOf, fleetsOf, score, militaryPower, faction } from "../src/game.js";
import { aiTurn } from "../src/ai.js";
import { ensureDirectives, directivesTurn } from "../src/orders.js";
import { eventsTurn, currentEvent, chooseEvent } from "../src/events.js";
import { crisisTurn, crisisState } from "../src/crisis.js";
import { wildsTurn, wildsState } from "../src/wilds.js";
import { envoysTurn, currentEnvoy, answerEnvoy } from "../src/envoys.js";
import { admiralsOf } from "../src/game.js";
const seed = +(process.argv[2] || 7), turns = +(process.argv[3] || 200), size = process.argv[4] || "medium";
const s = newGame({ seed, size, player: "concord", rivals: 4, difficulty: "normal", mode: process.env.MODE || "standard" });
ensureDirectives(s);
s.factions[0].ai = true;
const t0 = Date.now(); let evs = 0; const msgs = {};
for (let i = 0; i < turns && !s.winner; i++) {
  endTurn(s, aiTurn); directivesTurn(s); crisisTurn(s); wildsTurn(s); s.directives.reports = []; s.battleReports = [];
  eventsTurn(s); if (s.galEvent) { const e = currentEvent(s); chooseEvent(s, e.options[s.turn % e.options.length].id); evs++; }
  envoysTurn(s); for (let m; (m = currentEnvoy(s)); ) { msgs[m.kind] = (msgs[m.kind] || 0) + 1; answerEnvoy(s, m.options[(s.turn + 1) % m.options.length].id); }
  if (process.env.CRISIS && s.crisis && s.crisis.stage === "awake" && s.turn % 5 === 0) { const c = crisisState(s); console.log(`  T${s.turn} heart ${c.hull}/${c.max} wave ${c.wave} warden ships ${c.ships}`); }
  if (s.turn % 25 === 0 || s.winner) console.log(`T${s.turn} ` + s.factions.map((F) => `${F.id}:${F.alive ? "" : "†"}c${coloniesOf(s, F.id).length} p${coloniesOf(s, F.id).reduce((t, x) => t + (x.colony.pop || 0), 0)} m${militaryPower(s, F.id)} t${F.research.done.length} $${Math.round(F.credits)} x${F.exotics} s${score(s, F.id)}`).join(" | "));
}
const wars = s.log.filter((l) => /declared war/.test(l.text)).length, battles = s.log.filter((l) => /^Battle/.test(l.text)).length, taken = s.log.filter((l) => / took /.test(l.text)).length;
const C = s.directives; console.log(`campaigns: ${(C.past || []).map((p) => p.id + ":" + p.over).concat(C.campaign ? [C.campaign.id + ":" + (C.campaign.over || C.campaign.threads.length)] : []).join(" ")}; directives done ${C.history.filter((h) => h.result === "done").length}, lost ${C.history.filter((h) => h.result !== "done").length}; prototypes ${Object.keys(s.factions[0].protos || {}).join(",") || "-"}`);
console.log(`events chosen: ${evs}; messages ${JSON.stringify(msgs)}`);
console.log(`admirals: ${s.factions.map((F) => F.id + ":" + admiralsOf(s, F.id).map((x) => x.a.traits.length + "/" + x.a.wins).join(",") + " fallen " + (F.fallen || []).length).join(" | ")}`);
console.log(`alliances: ${s.factions.flatMap((A) => Object.entries(A.relations).filter(([b, r]) => r.allied && A.id < b).map(([b]) => A.id + "+" + b)).join(" ") || "-"}`);
{ const K = s.crisis || {}; const burned = s.log.filter((l) => /burned/.test(l.text) && !l.fid).length + s.log.filter((l) => /burned .* to bare rock|burned .*outpost/.test(l.text)).length;
  console.log(`crisis: ${K.stage || "-"} (wakes ${K.woke || "-"}, ${K.wave || 0} waves${K.over ? `, broken turn ${K.over} by ${K.heartBy}` : ""}); worlds burned ${s.log.filter((l) => /to bare rock|burned .*outpost/.test(l.text)).length}; Warden kills ${s.factions.map((F) => F.id + ":" + (F.stats.wardens || 0)).join(" ")}`); }
  if (s.mode === "open") { const ev = s.log.filter((l) => /Corridor Engine at|took the Corridor Engine/.test(l.text)).map((l) => `T${l.turn ?? "?"}: ${l.text.slice(0, 70)}`); console.log(`engine: ${ev.length} events; held now by ${s.engine ? s.engine.owner : "nobody"}; turns held ${s.factions.map((F) => `${F.id}:${F.stats.engineTurns || 0}`).join(" ")}`); for (const e of ev.slice(0, 12)) console.log("  " + e); }
  { const w = wildsState(s) || {}, kills = s.factions.map((F) => `${F.id}:${F.stats.wild || 0}/${F.stats.anomalies || 0}/${Object.values(F.research.adv || {}).reduce((t, x) => t + x, 0)}`).join(" ");
    console.log(`wilds: havens ${w.havens} raiders ${w.raiders} swarms ${w.swarms} leviathans ${w.leviathans}; raids ${s.log.filter((l) => /Pirate raiders hold/.test(l.text)).length}, fed ${s.log.filter((l) => /leviathan is feeding/.test(l.text)).length}, havens burned ${s.log.filter((l) => /destroyed a pirate haven/.test(l.text)).length}; kills/anomalies/advances ${kills}`); }
console.log(`winner ${s.winner} (${s.winReason}) at turn ${s.turn}; wars ${wars}, battles ${battles}, worlds taken ${taken}; ${((Date.now() - t0) / s.turn).toFixed(1)} ms/turn; save ${Math.round(JSON.stringify(s).length / 1024)} KB`);
