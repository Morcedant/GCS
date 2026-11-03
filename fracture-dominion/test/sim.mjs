// An all-computer game, for balance and bugs: node test/sim.mjs [seed] [turns] [size]
import { newGame, endTurn, coloniesOf, fleetsOf, score, militaryPower, faction } from "../src/game.js";
import { aiTurn } from "../src/ai.js";
import { ensureDirectives, directivesTurn } from "../src/orders.js";
const seed = +(process.argv[2] || 7), turns = +(process.argv[3] || 200), size = process.argv[4] || "medium";
const s = newGame({ seed, size, player: "concord", rivals: 4, difficulty: "normal", mode: process.env.MODE || "standard" });
ensureDirectives(s);
s.factions[0].ai = true;
const t0 = Date.now();
for (let i = 0; i < turns && !s.winner; i++) {
  endTurn(s, aiTurn); directivesTurn(s); s.directives.reports = [];
  if (s.turn % 25 === 0 || s.winner) console.log(`T${s.turn} ` + s.factions.map((F) => `${F.id}:${F.alive ? "" : "†"}c${coloniesOf(s, F.id).length} p${coloniesOf(s, F.id).reduce((t, x) => t + (x.colony.pop || 0), 0)} m${militaryPower(s, F.id)} t${F.research.done.length} $${Math.round(F.credits)} x${F.exotics} s${score(s, F.id)}`).join(" | "));
}
const wars = s.log.filter((l) => /declared war/.test(l.text)).length, battles = s.log.filter((l) => /^Battle/.test(l.text)).length, taken = s.log.filter((l) => / took /.test(l.text)).length;
const C = s.directives; console.log(`campaigns: ${(C.past || []).map((p) => p.id + ":" + p.over).concat(C.campaign ? [C.campaign.id + ":" + (C.campaign.over || C.campaign.threads.length)] : []).join(" ")}; directives done ${C.history.filter((h) => h.result === "done").length}, lost ${C.history.filter((h) => h.result !== "done").length}; prototypes ${Object.keys(s.factions[0].protos || {}).join(",") || "-"}`);
console.log(`winner ${s.winner} (${s.winReason}) at turn ${s.turn}; wars ${wars}, battles ${battles}, worlds taken ${taken}; ${((Date.now() - t0) / s.turn).toFixed(1)} ms/turn; save ${Math.round(JSON.stringify(s).length / 1024)} KB`);
