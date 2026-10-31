// Ship combat, from the Players' Guide's "The USS Pelion": exchanges; Power to spend on shields, phasers and
// torpedoes (and what's left over as a bonus); the captain's order; Helm to evade; Shields before Hull; a concussive
// roll for every hit that reaches the Hull; Engineering to repair mid-fight; a Helm contest to break away.
import { PELION, ENEMIES, SUPPORT, CAPTAIN, CREW } from "./data.js";
import { check, target, stationOfficer, hasRecord, sysPenalty, markCommand, log, sendHome, checkEnd, rand, pick, officer, registerHooks, harmWorld, sysAt } from "./game.js";

export const shieldsMax = (S) => PELION.shields + (S.pelion.refits.shields ? 1 : 0) + (hasRecord(S, "shield1") ? 1 : 0);
export const powerOf = (S) => Math.max(1, PELION.power + (S.pelion.refits.power ? 1 : 0) + (hasRecord(S, "power1") ? 1 : 0) - (S.pelion.powerLoss || 0));
/** The Pelion's numbers for this exchange, with who stands each station. */
export function battleStats(S) {
  const P = S.pelion, helmId = stationOfficer(S, "helm"), gunId = stationOfficer(S, "tactical"), engId = stationOfficer(S, "engineering");
  const helm = helmId ? target(S, helmId, "Helm", { combat: true }).total + Math.max(-6, sysPenalty(P.sys.engines)) : 8;
  const gun = gunId ? target(S, gunId, "Phasers", { combat: true }).total + (P.refits.phasers ? 1 : 0) + Math.max(-6, sysPenalty(P.sys.weapons)) : 8;
  const eng = engId ? target(S, engId, "Engineering", { combat: true }).total : 8;
  return { helmId, gunId, engId, helm, gun, eng, power: powerOf(S), shieldsMax: shieldsMax(S), maneuver: PELION.maneuver - (P.sys.engines ? 1 : 0), weaponsOut: P.sys.weapons >= 3 };
}

export function startBattle(S, enemyId, initiator) {
  const e = S.enemies[enemyId], E = ENEMIES[e.type];
  if (initiator === "pelion" && e.power === "klingon" && !e.hostile) {
    markCommand(S, 1, "the Pelion fired first on a Klingon ship. A diplomatic incident.");
    S.tension = Math.min(10, S.tension + 2); e.hostile = true;
  }
  const seenIt = e.cloaked && S.pelion.refits.inverter;   // the cloak inverter sees a cloaked ship coming
  const ambush = initiator === "enemy" && E.ambush && e.cloaked && !seenIt;
  if (seenIt && initiator === "enemy" && E.ambush) log(S, `The cloak inverter sees the ${E.name} coming before it decloaks: no ambush.`, "good");
  e.cloaked = false; e.revealed = false; e.seen = true;
  const P = S.pelion;
  S.battle = { enemy: enemyId, ex: 0, log: [], ambush, over: null, initiator, start: { hull: P.hull, torps: P.torps, sys: P.sys.weapons + P.sys.engines + P.sys.sensors } };
  log(S, `Battle: the Pelion against ${E.base ? "the Orion base" : (/^[AEIOU]/.test(E.name) ? "an " : "a ") + E.name}${ambush ? ", which decloaks firing" : ""}.`, "war");
}
registerHooks({ startBattle });

const R = (r) => `${r.total} vs ${r.target}`;
function hitEnemy(S, e, n, L, what) {
  const E = ENEMIES[e.type];
  for (let i = 0; i < n; i++) { if (e.shields < E.shields) e.shields++; else e.hull++; }
  L.push(`${what} hits: their shields ${E.shields - e.shields}/${E.shields}, hull ${Math.max(0, E.hull - e.hull)}/${E.hull}.`);
}
/** Mark boxes on the Pelion; return whether any reached the hull. */
function hitPelion(S, n, shieldsUp, L, what) {
  const P = S.pelion, max = shieldsMax(S);
  let hull = 0;
  for (let i = 0; i < n; i++) { if (shieldsUp && P.shields < max) P.shields++; else { P.hull++; hull++; } }
  L.push(`${what}: shields ${max - P.shields}/${max}, hull ${Math.max(0, PELION.hull - P.hull)}/${PELION.hull}.`);
  if (hull) concussive(S, L);
  return hull > 0;
}
/** The Players' Guide's concussive system damage table, for a hit that reaches the hull. */
function concussive(S, L) {
  const P = S.pelion, r = check(S, 0).total;
  const hurt = (n) => { const ids = ["helm", "tactical", "science", "engineering", "comms"].map((s) => stationOfficer(S, s)).filter(Boolean); const id = pick(S, ids); S.crew[id].inj = Math.min(3, S.crew[id].inj + n); return `${officer(id).short} is hurt (${S.crew[id].inj}/3)`; };
  const sys = (k, n) => { P.sys[k] = Math.min(3, P.sys[k] + n); };
  let t;
  if (r === 3) { P.powerLoss = Math.min(4, (P.powerLoss || 0) + 2); t = "warp core offline: emergency power"; }
  else if (r === 4) t = "a bridge station explodes: " + hurt(2);
  else if (r === 5) { sys("engines", 3); t = "impulse engines offline"; }
  else if (r === 6) { sys("sensors", 2); t = "computer offline"; }
  else if (r <= 8) { sys("engines", 1); t = r === 7 ? "deflector damaged" : "warp drive damaged"; }
  else if (r <= 10) { P.hull++; t = `hull breach: ${(check(S, 0).total) * 5} crew lost or hurt`; }
  else if (r <= 12) { P.shields = Math.min(shieldsMax(S), P.shields + 1); t = "shield emitter damaged"; }
  else if (r === 13) { P.powerLoss = Math.min(4, (P.powerLoss || 0) + 1); t = "power conduits damaged: Power −1"; }
  else if (r === 14) { sys("engines", 1); t = "impulse engine damaged"; }
  else if (r <= 16) t = "a bridge station sparks: " + hurt(1);
  else { sys("weapons", 1); t = "fire control damaged"; }
  L.push(`Concussive damage (${r}): ${t}.`);
}

/**
 * One exchange. choice: { order: "command"|"read"|"hail"|null, shields, phasers, torps, repair, breakOff }.
 * Returns the exchange's lines; S.battle.over is set when the battle ends.
 */
export function exchange(S, choice = {}) {
  const B = S.battle; if (!B || B.over) return [];
  const e = S.enemies[B.enemy], E = ENEMIES[e.type], P = S.pelion, st = battleStats(S), L = [];
  B.ex++;
  // Power: shields, phasers, torpedoes; what's left is a bonus to one roll (+2 at most).
  let power = st.power;
  const up = !!choice.shields && power > 0; if (up) power--;
  const phas = !!choice.phasers && !st.weaponsOut && power > 0 && !choice.breakOff; if (phas) power--;
  const torp = !!choice.torps && P.torps > 0 && !st.weaponsOut && power > 0 && !choice.breakOff; if (torp) power--;
  const spare = Math.min(2, power);
  let hit = 0, evade = 0;
  // The captain's order.
  if (choice.order === "command") {
    const r = check(S, CAPTAIN.skills.Leadership);
    if (r.success) { hit += 2; if (r.margin >= 5) evade += 2; L.push(`Captain's order, Command (${R(r)}): +2 to Tactical${r.margin >= 5 ? " and Helm" : ""}.`); } else L.push(`Captain's order, Command (${R(r)}): the bridge is rattled.`);
  } else if (choice.order === "read") {
    const r = check(S, CAPTAIN.skills.Psychology);
    if (r.success) { evade += 2; hit += 1; L.push(`Captain's order, Read the enemy (${R(r)}): you see their next move coming. +2 to evade, +1 to hit.`); } else L.push(`Captain's order, Read the enemy (${R(r)}): they're hard to read.`);
  } else if (choice.order === "hail") {
    const r = check(S, CAPTAIN.skills.Diplomacy), them = check(S, E.will);
    const wins = r.success && (!them.success || r.margin > them.margin);
    if (wins && !(E.relentless && e.hull < 3) && e.power !== "romulan" && !E.base) {
      L.push(`Hail (${R(r)} against their Will, ${R(them)}): they stand down and withdraw.`);
      sendHome(S, e, 4); B.over = "hailed"; return finish(S, L);
    }
    L.push(`Hail (${R(r)} against their Will, ${R(them)}): ${e.power === "romulan" ? "silence on every channel" : E.relentless && e.hull < 3 ? "the Klingon captain laughs at you" : "they won't listen"}.`);
  }
  const md = st.maneuver - (E.maneuver || 0);
  // Breaking away: a Helm contest instead of firing.
  if (choice.breakOff) {
    const r = check(S, st.helm + spare + evade + Math.max(0, md)), them = E.base ? { success: false, margin: -99, total: "-", target: "-" } : check(S, E.helm + Math.max(0, -md));
    if (r.success && (!them.success || r.margin > them.margin)) { L.push(`Break away (Helm ${R(r)} against theirs, ${R(them)}): the Pelion goes to warp.`); e.cooldown = 2; B.over = "escaped"; return finish(S, L); }
    L.push(`Break away (Helm ${R(r)} against theirs, ${R(them)}): they stay on you.`);
  }
  // The Pelion fires.
  if (phas) {
    const r = check(S, st.gun + hit + spare);
    if (!r.success) L.push(`Phasers (${R(r)}): miss.`);
    else {
      const ev = E.base ? null : check(S, E.helm + Math.max(0, -md));
      if (ev && ev.success) L.push(`Phasers (${R(r)}): on target, but they evade (${R(ev)}).`);
      else hitEnemy(S, e, PELION.phaser, L, `Phasers (${R(r)})`);
    }
  }
  if (torp) {
    P.torps--;
    const r = check(S, st.gun + hit + PELION.torpBonus);
    if (r.success) hitEnemy(S, e, 2, L, `Photon torpedoes (${R(r)})`); else L.push(`Photon torpedoes (${R(r)}): wide.`);
  }
  for (const u of Object.values(S.support)) {
    if (u.at !== P.at || e.hull >= E.hull) continue;
    const T = SUPPORT[u.type], r = check(S, T.gunner);
    if (r.success && !(E.base ? false : check(S, E.helm).success)) hitEnemy(S, e, T.phaser, L, `The ${u.name}'s phasers (${R(r)})`);
  }
  if (e.hull >= E.hull) { B.over = "destroyed"; return finish(S, L); }
  // Do they run?
  const runs = (e.type === "orion" && e.shields >= E.shields) || (e.type === "kbop" && e.hull >= 2) || (e.type === "kbc" && e.hull >= 3);
  if (runs) {
    const r = check(S, E.helm + Math.max(0, -md) + (E.fast ? 2 : 0)), us = check(S, st.helm + Math.max(0, md));
    if (r.success && (!us.success || r.margin > us.margin)) { L.push(`The ${E.name} breaks off and runs (${R(r)} against your Helm, ${R(us)}).`); sendHome(S, e, 5); e.cooldown = 2; B.over = "fled"; return finish(S, L); }
    L.push(`The ${E.name} tries to break away, but the Pelion holds it (${R(us)}).`);
  }
  if (e.type === "rbop" && e.hull >= 2) { L.push("The Romulan commander overloads the warp core rather than be taken."); e.hull = E.hull; B.over = "destroyed"; return finish(S, L); }
  // They fire: at the Pelion, or at an escort beside it.
  const escorts = Object.values(S.support).filter((u) => u.at === P.at);
  const tgt = escorts.length && rand(S) < 0.3 ? pick(S, escorts) : null;
  const gun = E.gunner + (B.ambush && B.ex === 1 ? 2 : 0);
  const volley = (label, dmg, evadable) => {
    const r = check(S, gun + (label === "torpedo" ? 1 : 0));
    const name = { kbc: "Disruptors", kbop: "Disruptors", rbop: "Plasma torpedo", orion: "Disruptors", orionBase: "The base's guns" }[e.type];
    const what = label === "torpedo" ? "Photon torpedo" : name;
    if (!r.success) { L.push(`Their ${what.toLowerCase()} (${R(r)}): miss.`); return; }
    if (tgt) {
      const T = SUPPORT[tgt.type];
      if (evadable && check(S, T.helm).success) { L.push(`Their ${what.toLowerCase()} (${R(r)}): the ${tgt.name} evades.`); return; }
      for (let i = 0; i < dmg; i++) { if (tgt.shields < T.shields) tgt.shields++; else tgt.hull++; }
      if (tgt.hull >= T.hull) { L.push(`Their ${what.toLowerCase()} (${R(r)}): the ${tgt.name} is destroyed.`); delete S.support[tgt.id]; markCommand(S, 1, `the ${tgt.name} was lost.`); }
      else L.push(`Their ${what.toLowerCase()} (${R(r)}): the ${tgt.name} is hit.`);
      return;
    }
    if (evadable) {
      const ev = check(S, st.helm + evade + (phas ? 0 : spare) + Math.max(0, md) + (E.plasma ? 2 : 0));
      if (ev.success) { L.push(`Their ${what.toLowerCase()} (${R(r)}): Helm evades (${R(ev)}).`); return; }
    }
    hitPelion(S, dmg, up, L, `Their ${what.toLowerCase()} (${R(r)}) hits`);
  };
  volley("main", E.dmg, true);
  if (e.type === "kbc" && B.ex % 2 === 0) volley("torpedo", 2, false);
  // Damage control.
  if (choice.repair && st.engId) {
    const r = check(S, st.eng);
    if (r.success) {
      let n = r.margin >= 5 ? 2 : 1; const fixed = [];
      if (P.powerLoss && n) { P.powerLoss--; n--; fixed.push("power"); }
      for (const k of ["weapons", "engines", "sensors"]) while (n && P.sys[k]) { P.sys[k]--; n--; fixed.push(k); }
      while (n && P.shields) { P.shields--; n--; fixed.push("shields"); }
      L.push(`Damage control, ${officer(st.engId).short} (${R(r)}): ${fixed.join(", ") || "nothing left to fix"}.`);
    } else L.push(`Damage control (${R(r)}): no luck.`);
  }
  if (P.hull >= PELION.hull) { B.over = "lost"; return finish(S, L); }
  if (B.ex >= 12) { L.push("Both ships pull back to lick their wounds."); sendHome(S, e, 3); e.cooldown = 2; B.over = "fled"; }
  return finish(S, L);
}

function finish(S, L) {
  const B = S.battle; B.log.push(...L.map((t) => `${B.ex}. ${t}`));
  if (!B.over) return L;
  const e = S.enemies[B.enemy], E = ENEMIES[e.type];
  if (B.over === "destroyed") {
    delete S.enemies[e.id];
    if (e.type === "orionBase") { S.commendations += 6; S.supplies += 15; S.orionBaseDown = true; log(S, "The Orion pirate base is destroyed. The raids on the sector will stop.", "victory"); }
    else if (e.power === "orion") { S.commendations += 2; S.supplies += 6; log(S, `The Pelion destroys an Orion raider. Salvage: +6 supplies.`, "good"); }
    else if (e.power === "romulan") { S.commendations += 3; log(S, "The Romulan bird-of-prey is destroyed.", "good"); }
    else { S.tension = Math.min(10, S.tension + 2); if (e.hostile && B.initiator !== "pelion") S.commendations += 2; log(S, `The ${E.name} is destroyed. The Empire will remember.`, "war"); }
  } else if (B.over === "lost") log(S, "The Pelion's hull is breaking up.", "bad");
  else if (e.arcRaider && (B.over === "fled" || B.over === "hailed")) {
    // Chased off from Corvan II, the raider leaves for good: no coming back to orbit while the away team works.
    delete S.enemies[e.id];
    log(S, `The ${E.name} ${B.over === "fled" ? "breaks off" : "stands down"} and runs for the sector's edge. It won't be back.`, "good");
  }
  else log(S, { fled: `The ${E.name} breaks off.`, hailed: `The ${E.name} stands down.`, escaped: "The Pelion breaks away." }[B.over] || "The battle ends.");
  // What the battle cost: one line for the log.
  const P = S.pelion, st = B.start || { hull: P.hull, torps: P.torps, sys: 0 };
  const hullLost = P.hull - st.hull, sysHit = P.sys.weapons + P.sys.engines + P.sys.sensors - st.sys, torps = st.torps - P.torps;
  log(S, `The battle took ${B.ex} exchange${B.ex === 1 ? "" : "s"}${B.initiator === "enemy" ? ", and they fired first" : ""}. The Pelion ${hullLost > 0 ? `lost ${hullLost} hull box${hullLost === 1 ? "" : "es"} (hull ${Math.max(0, PELION.hull - P.hull)}/${PELION.hull})` : "kept its hull intact"}${sysHit > 0 ? `, took ${sysHit} system damage` : ""}${torps > 0 ? `, and fired ${torps} torpedo${torps === 1 ? "" : "es"} (${P.torps} left)` : ""}.`, B.over === "lost" ? "bad" : "");
  checkEnd(S);
  return L;
}
export function endBattle(S) { const B = S.battle; S.battle = null; return B; }

/** A fight the Pelion isn't in: an escort guarding a world against a raider. Rolled out in full. */
export function skirmish(S, u, e) {
  const T = SUPPORT[u.type], E = ENEMIES[e.type];
  e.cloaked = false;
  for (let ex = 1; ex <= 4; ex++) {
    if (check(S, T.gunner).success && !check(S, E.helm).success) { if (e.shields < E.shields) e.shields++; else e.hull++; }
    if (e.hull >= E.hull) { delete S.enemies[e.id]; S.commendations += 1; log(S, `The ${u.name} destroys the ${E.name}.`, "good"); return "won"; }
    if (e.type === "orion" && e.shields >= E.shields) { sendHome(S, e, 5); log(S, `The ${u.name} drives off the ${E.name}.`, "good"); return "drove"; }
    if (check(S, E.gunner).success && !check(S, T.helm).success) { for (let i = 0; i < E.dmg; i++) { if (u.shields < T.shields) u.shields++; else u.hull++; } }
    if (u.hull >= T.hull) { delete S.support[u.id]; markCommand(S, 1, `the ${u.name} was lost defending ${sysAt(S, u.at)?.name || "its post"}.`); return "lost"; }
  }
  sendHome(S, e, 3); log(S, `The ${u.name} holds off the ${E.name}.`, "good"); return "held";
}
