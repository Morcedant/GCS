// An automatic captain plays a whole tour: heads for the nearest order, does the most useful thing where it is,
// fights with everything up. For balance and to shake out crashes.  node test/sim.mjs [seed] [games]
import { newGame, actionsFor, attempt, resolve, canReroll, moveTo, reachable, findPath, score, rating, requisition, fitRefit, chooseMission, missionChoices, chooseCloak, chooseComplication } from "../src/game.js";
import { exchange } from "../src/combat.js";
import { beamDown } from "../src/arc.js";
import { endTurn, chooseEvent, dismissEvent, closeBattle } from "../src/turn.js";
import { distance } from "../src/hex.js";
import { REFITS } from "../src/data.js";

function play(seed) {
  const S = newGame({ seed });
  let guard = 0;
  while (!S.over && guard++ < 2000) {
    if (S.event) { if (S.event.kind === "arc-arrive") chooseEvent(S, "warn"); else if (S.event.kind === "cloak-contact") chooseCloak(S, "pursue"); else if (S.event.kind === "complication") chooseComplication(S, "press"); else if (S.event.kind === "mission-choice") chooseMission(S, S.event.orderId, missionChoices(S, S.event).options[0].id); else dismissEvent(S); continue; }
    if (S.battle) { if (S.battle.over) closeBattle(S); else exchange(S, { order: "command", shields: true, phasers: true, torps: true, repair: S.pelion.shields > 2 }); continue; }
    if (S.pending) { resolve(S, canReroll(S)); continue; }
    // Docked: refits and an escort.
    if (S.pelion.docked) { for (const id of Object.keys(REFITS)) fitRefit(S, id); if (Object.keys(S.support).length < 1) requisition(S, "escort"); }
    // Corvan II: beam an away team down when one's needed.
    if (actionsFor(S).some((a) => a.id === "beam")) { beamDown(S, ["sevek", "vessik", "reyes", "rrinn"].filter((id) => S.crew[id].inj < 3)); if (!S.arc.team) beamDown(S, Object.keys(S.crew).filter((id) => S.crew[id].inj < 3).slice(0, 4)); continue; }
    // Act here if worth it.
    if (!S.pelion.acted) {
      const acts = actionsFor(S).filter((a) => !a.why);
      const pref = ["arc", "mission", "engage", "investigate", "envoy", "aid", "survey", "observe", "repair"];
      const a = pref.map((id) => acts.find((x) => x.id === id && !(x.id === "engage" && S.enemies[x.enemy]?.power === "klingon" && !S.enemies[x.enemy]?.hostile))).find(Boolean);
      if (a) { const r = attempt(S, "pelion", a.id, { order: a.order, enemy: a.enemy, arc: a.arc }); if (!r.error) continue; }
    }
    // Move toward the goal.
    if (S.pelion.mp > 0) {
      const P = S.pelion;
      let goal = S.arc.stage === "travel" ? S.systems[S.corvan].at : null;
      if (!goal && (P.hull >= 3 || P.sys.engines >= 2)) goal = S.systems[S.starbase].at;
      if (!goal && S.orders.length) goal = S.orders.filter((o) => !o.arc).sort((a, b) => distance(a.at, P.at) - distance(b.at, P.at))[0]?.at;
      if (!goal) { const c = Object.values(S.systems).filter((s) => (s.kind === "independent") || (!s.surveyed) || ((s.kind === "anomaly" || s.kind === "ruins") && !s.recorded)).sort((a, b) => distance(a.at, P.at) - distance(b.at, P.at)); goal = c[0]?.at; }
      if (goal && goal !== P.at && !(S.arc.stage !== "travel" && S.arc.stage !== "done" && P.at === S.systems[S.corvan].at)) {
        const R = reachable(S); const p = findPath(S, P.at, goal);
        let best = null; if (p) for (const k of p.path) if (R[k] !== undefined) best = k;
        if (best && best !== P.at) { moveTo(S, "pelion", best); continue; }
      }
    }
    endTurn(S);
  }
  const sc = score(S);
  return { seed, turn: S.turn, over: S.over?.why.slice(0, 60), score: sc.total, joined: S.joined, records: S.records.length, done: S.done, failed: S.failed, command: S.command, lost: S.lostColonies, klingon: S.lostWorlds, arc: S.arc.stage, arcEnd: (S.log.find((l) => /Silence at Corvan II:|Breaking orbit|Too late/.test(l.text)) || {}).text?.slice(0, 50), countdown: S.arc.countdown, hull: S.pelion.hull, korvath: (S.campaign || {}).korvath, tension: S.tension, threads: (S.campaign || {}).threads?.length, gate: (S.campaign || {}).over || ((S.campaign || {}).finale ? "open" : "-"), parts: score(S).parts.filter((p) => p[1]).map((p) => p[0].slice(0, 14) + ":" + p[1]).join(" ") };
}
const [seed0 = "1", n = "5"] = process.argv.slice(2);
for (let i = 0; i < +n; i++) console.log(JSON.stringify(play(seed0 + "-" + i)));
