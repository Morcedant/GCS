// The end of a turn: the other powers move, the crew heals, supplies come in, orders fall due, new orders arrive.
// Also the one place that ties the modules together, so the page imports this.
import { CREW, SUPPORT, ENEMIES } from "./data.js";
import { distance, within } from "./hex.js";
import { check, target, available, log, storyEvent, completeOrder, newOrder, updateVisibility, checkEnd, speedOf, officer, markCommand, hasRecord, bestOfficer } from "./game.js";
import { startBattle, endBattle } from "./combat.js";
import { aiTurn, claim } from "./ai.js";
import { arcTurn, arcTick, arcEventChoose } from "./arc.js";

export function canEndTurn(S) { return !(S.over || S.battle || S.event || S.pending); }

export function endTurn(S) {
  if (!canEndTurn(S)) return { error: "Finish what's in front of you first." };
  aiTurn(S);
  // Income.
  const sys = Object.values(S.systems);
  const income = 3 + sys.filter((s) => s.kind === "colony").length + 2 * sys.filter((s) => s.kind === "member").length;
  S.supplies += income;
  // Healing: the doctor works on the worst hurt; a sickbay upgrade or biostasis heals everyone a little more.
  const hurt = CREW.filter((c) => S.crew[c.id].inj > 0).sort((a, b) => S.crew[b.id].inj - S.crew[a.id].inj);
  if (hurt.length) {
    const doc = available(S, "vessik") ? "vessik" : bestOfficer(S, ["Medicine"])?.officer;
    if (doc) { const r = check(S, target(S, doc, "Medicine").total); if (r.success) { S.crew[hurt[0].id].inj--; if (S.crew[hurt[0].id].inj === 0) log(S, `${hurt[0].short} is back on duty.`, "good"); } }
    if (S.pelion.refits.sickbay || hasRecord(S, "heal")) for (const c of hurt) if (S.crew[c.id].inj > 0 && c !== hurt[0]) S.crew[c.id].inj--;
  }
  // Out of battle, the shields come back.
  S.pelion.shields = 0;
  for (const u of Object.values(S.support)) u.shields = 0;
  // Duty points: every 8 turns, as if a new session.
  if (S.turn % 8 === 0) { for (const id in S.crew) S.crew[id].duty = 2; log(S, "Duty points restored.", "good"); }
  arcTurn(S);
  // Orders fall due.
  for (const o of [...S.orders]) if (S.turn >= o.deadline) { log(S, `Orders failed: ${o.title}.`, "bad"); completeOrder(S, o, false); if (o.arc) { S.arc.stage = "done"; storyEvent(S, "Too late", "Another ship reached Corvan II first. Whatever happened to the eight scientists, the Pelion wasn't there for it, and Starfleet Command has noted it."); } }
  // The Klingon border pulls on nearby worlds.
  if (S.turn % 8 === 0) {
    const k = sys.filter((s) => s.kind === "klingon" || s.kind === "claimed");
    for (const s of sys.filter((x) => x.kind === "independent")) if (k.some((o) => distance(o.at, s.at) <= 3) && s.accord > -5) { s.accord--; if (s.accord <= -5) claim(S, s); }
  }
  // Worlds rebuild: with no raider overhead, a harm box clears every 5 turns.
  if (S.turn % 5 === 0) for (const s of sys) if (s.harm > 0 && !Object.values(S.enemies).some((e) => e.at === s.at && e.hostile)) s.harm--;
  if (S.turn % 6 === 0 && S.tension > 0) S.tension--;
  // New orders.
  const active = S.orders.filter((o) => !o.arc).length;
  if (S.turn >= 3 && active < 2 && (S.turn % 4 === 0 || active === 0 && S.turn % 2 === 0)) newOrder(S);
  // Next turn.
  S.turn++;
  S.pelion.mp = speedOf(S); S.pelion.acted = false; S.pelion.zoneMarked = false;
  for (const u of Object.values(S.support)) { u.mp = SUPPORT[u.type].speed; u.acted = false; }
  updateVisibility(S);
  // A hostile ship sharing the Pelion's hex attacks.
  const foe = Object.values(S.enemies).find((e) => e.at === S.pelion.at && e.hostile && !e.cooldown && !ENEMIES[e.type].base && e.goal !== "home" && e.goal !== "arc");
  if (foe && !S.event) startBattle(S, foe.id, "enemy");
  arcTick(S);
  checkEnd(S);
  return { ok: true, income };
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
export function dismissEvent(S) { S.event = null; arcTick(S); checkEnd(S); }
export function closeBattle(S) { endBattle(S); arcTick(S); updateVisibility(S); checkEnd(S); }
