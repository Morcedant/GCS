// The end of a turn: the other powers move, the crew heals, supplies come in, orders fall due, new orders arrive.
// Also the one place that ties the modules together, so the page imports this.
import { CREW, SUPPORT, ENEMIES } from "./data.js";
import { distance, within } from "./hex.js";
import { hourly, BACKLOG_MAX, check, target, CRUISE_WARP, daysPerLy, maxWarp, syncMp, isUrgent, available, log, storyEvent, completeOrder, newOrder, updateVisibility, checkEnd, speedOf, officer, markCommand, hasRecord, bestOfficer } from "./game.js";
import { startBattle, endBattle } from "./combat.js";
import { aiTurn, claim } from "./ai.js";
import { arcTurn, arcTick, arcEventChoose } from "./arc.js";

export function canEndTurn(S) { return !(S.over || S.battle || S.event || S.pending); }

export function endTurn(S) {
  if (!canEndTurn(S)) return { error: "Finish what's in front of you first." };
  if (hourly(S)) return endHour(S);
  S.hour = 0;
  aiTurn(S);
  // Income.
  const sys = Object.values(S.systems);
  const income = 3 + sys.filter((s) => s.kind === "colony").length + 2 * sys.filter((s) => s.kind === "member").length;
  S.supplies += income;
  const cols = sys.filter((s) => s.kind === "colony").length, mems = sys.filter((s) => s.kind === "member").length;
  log(S, `Supplies this week: +${income} (Starbase 23 +3${cols ? `, ${cols} colon${cols === 1 ? "y" : "ies"} +${cols}` : ""}${mems ? `, ${mems} member world${mems === 1 ? "" : "s"} +${2 * mems}` : ""}). Now ${S.supplies}; science ${S.science}.`, "turn");
  // Healing: the doctor works on the worst hurt; a sickbay upgrade or biostasis heals everyone a little more.
  const hurt = CREW.filter((c) => S.crew[c.id].inj > 0).sort((a, b) => S.crew[b.id].inj - S.crew[a.id].inj);
  if (hurt.length) {
    const doc = available(S, "vessik") ? "vessik" : bestOfficer(S, ["Medicine"])?.officer;
    if (doc) {
      const r = check(S, target(S, doc, "Medicine").total), pt = hurt[0];
      if (r.success) { S.crew[pt.id].inj--; log(S, `Sickbay: ${officer(doc).short} treats ${pt.name} (Medicine, ${r.total} against ${r.target}): ${S.crew[pt.id].inj === 0 ? "back on duty" : `hurt ${S.crew[pt.id].inj}/3`}.`, "good"); }
      else log(S, `Sickbay: ${officer(doc).short}'s treatment of ${pt.name} doesn't take this week (${r.total} against ${r.target}); still hurt ${S.crew[pt.id].inj}/3.`);
    }
    if (S.pelion.refits.sickbay || hasRecord(S, "heal")) for (const c of hurt) if (S.crew[c.id].inj > 0 && c !== hurt[0]) S.crew[c.id].inj--;
  }
  // Out of battle, the shields come back.
  S.pelion.shields = 0;
  for (const u of Object.values(S.support)) u.shields = 0;
  // Duty points: every 8 turns, as if a new session.
  if (S.turn % 8 === 0) { for (const id in S.crew) S.crew[id].duty = 2; log(S, "Duty points restored.", "good"); }
  arcTurn(S);
  // Orders fall due.
  for (const o of [...S.orders]) if (S.turn >= o.deadline) { log(S, `Orders failed: ${o.title}.`, "bad"); completeOrder(S, o, false, o.arc ? "Too late: another ship reached Corvan II first." : undefined); if (o.arc) { S.arc.stage = "done"; storyEvent(S, "Too late", "Another ship reached Corvan II first. Whatever happened to the eight scientists, the Pelion wasn't there for it, and Starfleet Command has noted it."); } }
  // The Klingon border pulls on nearby worlds.
  if (S.turn % 8 === 0) {
    const k = sys.filter((s) => s.kind === "klingon" || s.kind === "claimed");
    for (const s of sys.filter((x) => x.kind === "independent")) if (k.some((o) => distance(o.at, s.at) <= 3) && s.accord > -5) { s.accord--; if (s.accord <= -5) claim(S, s); }
  }
  // Worlds rebuild: with no raider overhead, a harm box clears every 4 turns.
  if (S.turn % 4 === 0) for (const s of sys) if (s.harm > 0 && !Object.values(S.enemies).some((e) => e.at === s.at && e.hostile)) { s.harm--; log(S, `${s.name} rebuilds: harm ${s.harm}/3.`, "good"); }
  if (S.turn % 6 === 0 && S.tension > 0) S.tension--;
  // New orders.
  // Starfleet sends orders every four weeks (every two while there's nothing to do); with two under way, or urgent
  // orders in hand, they wait in the backlog.
  const active = S.orders.filter((o) => !o.arc).length, waiting = (S.backlog || []).length;
  if (S.turn >= 3 && waiting < BACKLOG_MAX && (S.turn % 4 === 0 || active === 0 && !waiting && S.turn % 2 === 0)) newOrder(S);
  warpStrain(S);
  // Next turn.
  S.turn++;
  newWeek(S); S.pelion.engaged = false; S.pelion.zoneMarked = false;
  for (const id in S.crew) S.crew[id].acted = false; S.tried = {};   // a new turn: everyone can act again
  for (const u of Object.values(S.support)) { u.mp = SUPPORT[u.type].speed; u.acted = false; }
  updateVisibility(S);
  // A hostile ship sharing the Pelion's hex attacks.
  const foe = Object.values(S.enemies).find((e) => e.at === S.pelion.at && e.hostile && !e.cooldown && !ENEMIES[e.type].base && e.goal !== "home" && e.goal !== "arc");
  if (foe && !S.event) startBattle(S, foe.id, "enemy");
  arcTick(S);
  checkEnd(S);
  return { ok: true, income };
}

/**
 * Above warp 6, the Pelion's maximum stable speed, is emergency speed, and the engines strain: at the end of a week in which the Pelion flew at warp 7 or more,
 * the chief engineer rolls Engineering: −1 at warp 7, −3 at warp 8; nacelle tuning and a folded warp field give +2 each. A failure damages the engines (a box),
 * which lowers the maximum warp by 2 until repaired. Urgent orders are worth it; Starfleet expects maximum warp for them.
 */
function warpStrain(S) {
  const P = S.pelion, w = P.strain || 0;
  if (w <= CRUISE_WARP) return;
  const eng = available(S, "grath") ? "grath" : bestOfficer(S, ["Engineering"])?.officer;
  if (!eng) return;
  const extra = [[`Emergency warp ${w}`, -(2 * (w - CRUISE_WARP) - 1)]].concat(P.refits.warp ? [["Nacelle tuning", 2]] : [], hasRecord(S, "speed1") ? [["Folded warp field", 2]] : []);
  const t = target(S, eng, "Engineering", { extra }), r = check(S, t.total), urgent = S.orders.some(isUrgent);
  if (r.success) log(S, `Warp ${w} this week: ${officer(eng).short} keeps the engines in the green (Engineering, ${r.total} against ${r.target}).`, "good");
  else { P.sys.engines = Math.min(3, P.sys.engines + 1); log(S, `Warp ${w} this week strains the engines past their limit (${officer(eng).short}, Engineering, ${r.total} against ${r.target}): engines damaged ${P.sys.engines}/3, maximum warp now ${maxWarp(S)} until repaired.${urgent ? " The orders were urgent; Starfleet will understand." : ""}`, "bad"); }
}
/** A new week for the Pelion: seven days of travel, plus any part of a light-year it was partway through. */
function newWeek(S) {
  const P = S.pelion;
  if (P.warp === undefined) P.warp = CRUISE_WARP;
  const carry = P.strain !== undefined && P.strain > 0 ? Math.min(P.days || 0, daysPerLy(P.warp), 7) : 0;
  P.days = 7 + carry; P.strain = 0;
  if (P.warp > maxWarp(S)) { P.warp = maxWarp(S); log(S, `Engine damage: the Pelion can make warp ${P.warp} at most.`, "bad"); }
  syncMp(S);
}
/** An hour on Corvan II while the away team is down: everyone acts again, the drain goes on; the rest of the sector waits. */
function endHour(S) {
  S.hour = (S.hour || 0) + 1;
  for (const id in S.crew) S.crew[id].acted = false;
  S.tried = {}; S.pelion.engaged = false;
  log(S, `Hour ${S.hour} on Corvan II.`, "turn", { away: true });
  arcTurn(S, 1);
  updateVisibility(S);
  arcTick(S);
  checkEnd(S);
  return { ok: true, hour: S.hour };
}
/** The arrival event at Corvan II, rolled with the best officer. */
export function chooseEvent(S, id) {
  const roll = (skill, action, extra = []) => {
    const b = bestOfficer(S, [skill], { action, listen: action === "hail" }) || { officer: "captain", skill };
    const t = target(S, b.officer, skill, { action, listen: action === "hail", extra });
    const r = check(S, t.total);
    return { ...r, officer: b.officer, skill, parts: t.parts };
  };
  const out = arcEventChoose(S, id, roll);
  updateVisibility(S);
  return out;
}
export function dismissEvent(S) { if (S.event && S.event.kind === "mission-choice") return; S.event = (S.eventQueue && S.eventQueue.shift()) || null; if (!S.event) arcTick(S); checkEnd(S); }
export function closeBattle(S) { endBattle(S); arcTick(S); updateVisibility(S); checkEnd(S); }
