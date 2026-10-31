// The other powers in the Corvan Sector, each turn.
//  - The Klingon Empire: a cold war. Most of its ships court the independent worlds (lowering their accord); some
//    raid, more as tension rises. Firing first on one that hasn't fired is an incident.
//  - The Orion Syndicate: raiders from a hidden base strike colonies and member worlds, steal supplies and run.
//  - The Romulan Star Empire: now and then a cloaked bird-of-prey crosses the Neutral Zone to strike, and goes home.
import { distance } from "./hex.js";
import { ENEMIES, KINDS } from "./data.js";
import { rand, pick, findPath, spawnEnemy, harmWorld, log, sendHome, markCommand, closestOutpost, sysAt } from "./game.js";
import { inZone } from "./sector.js";
import { skirmish } from "./combat.js";

const EVERY = { easy: { k: 9, o: 8, r: 15 }, normal: { k: 7, o: 6, r: 11 }, hard: { k: 5, o: 5, r: 8 } };
const count = (S, power, type) => Object.values(S.enemies).filter((e) => e.power === power && (!type || e.type === type) && !ENEMIES[e.type].base).length;
const worlds = (S, kinds) => Object.values(S.systems).filter((s) => kinds.includes(s.kind));

export function aiTurn(S) {
  const ev = EVERY[S.difficulty] || EVERY.normal;
  // Klingons.
  const outposts = worlds(S, ["klingon", "claimed"]);
  if (outposts.length && S.turn % ev.k === 2 && count(S, "klingon") < 2 + Math.floor(S.turn / 15)) {
    const from = pick(S, outposts);
    const raid = rand(S) < 0.15 + S.tension * 0.06;
    const ind = worlds(S, ["independent"]).filter((s) => !Object.values(S.enemies).some((e) => e.target === s.at)).sort((a, b) => a.accord - b.accord || distance(a.at, from.at) - distance(b.at, from.at));
    const tgt = raid ? pick(S, worlds(S, ["colony", "member"]).length ? worlds(S, ["colony", "member"]) : ind) : ind[0];
    if (tgt) {
      const e = spawnEnemy(S, rand(S) < 0.45 ? "kbc" : "kbop", from.at, { goal: raid ? "raid" : "influence", target: tgt.at, hostile: raid, home: from.at });
      if (raid) log(S, `Intelligence: Klingon raiders are moving on ${tgt.name}.`, "war");
      else if (S.visible[from.at]) log(S, `A ${ENEMIES[e.type].name} leaves ${from.name}.`);
    }
  }
  if (S.tension >= 10) {
    S.tension = 6;
    for (const c of worlds(S, ["colony", "member"]).slice(0, 2)) { const o = closestOutpost(S, c.at); if (o) spawnEnemy(S, "kbc", o.at, { goal: "raid", target: c.at, hostile: true, home: o.at }); }
    log(S, "The Klingon Empire answers the incidents: battle cruisers cross the border.", "war");
  }
  // Orions.
  const base = Object.values(S.enemies).find((e) => e.type === "orionBase");
  if (base && S.turn % ev.o === 3 && count(S, "orion") < 2) {
    // Not a world raided in the last 6 turns: the Orions spread their raids around.
    const targets = worlds(S, ["colony", "member", "member", "independent"]).filter((s) => distance(s.at, S.pelion.at) >= 3 && !(s.raidedAt && S.turn - s.raidedAt < 6));
    const tgt = targets.length ? pick(S, targets) : null;
    if (tgt) spawnEnemy(S, "orion", base.at, { goal: "raid", target: tgt.at, hostile: true, home: base.at });
  }
  // Romulans.
  if (S.turn >= 9 && S.turn % ev.r === 9 && count(S, "romulan") < 1) {
    const targets = worlds(S, ["colony", "member"]);
    if (targets.length) {
      const tgt = pick(S, targets);
      const zone = Object.keys(S.hexes).filter(inZone).sort((a, b) => distance(a, tgt.at) - distance(b, tgt.at));
      spawnEnemy(S, "rbop", zone[0], { goal: "strike", target: tgt.at, hostile: true, cloaked: true, home: zone[0] });
    }
  }
  // Every ship moves and does its job.
  for (const e of Object.values(S.enemies)) {
    if (!S.enemies[e.id]) continue;
    const E = ENEMIES[e.type];
    if (e.cooldown) e.cooldown--;
    if (E.base || e.goal === "arc") continue;
    if (e.target && e.at !== e.target) step(S, e);
    if (e.at !== e.target) continue;
    const s = sysAt(S, e.at);
    if (e.goal === "home") {
      if (e.stay > 0) { e.stay--; continue; }
      delete S.enemies[e.id]; continue;
    }
    if (e.goal === "influence" && s && s.kind === "independent") {
      // A week of gifts and promises every other turn: accord −1.
      if (e.stay % 2 === 0) {
        s.accord = Math.max(-5, s.accord - 1);
        if (S.visible[s.at]) log(S, `A ${E.name} is courting ${s.name} with gifts and promises: its accord falls to ${s.accord}${s.accord <= -3 ? ". It's close to joining the Empire" : ""}.`, "war");
        if (s.accord <= -5) claim(S, s);
      }
      if (++e.stay >= 6 || s.kind !== "independent") sendHome(S, e, 0);
    } else if (e.goal === "raid" || e.goal === "strike") {
      const guard = Object.values(S.support).find((u) => u.at === e.at && u.type === "escort");
      if (S.pelion.at === e.at) continue;  // the Pelion is here: the fight comes at the end of the turn
      if (guard) { const r = skirmish(S, guard, e); if (r === "won" || r === "drove") continue; }
      if (!S.enemies[e.id]) continue;
      // One strike, then away: a raid harms a world once and the raider makes for home. Federation worlds have their own
      // defenses, which drive off a raid 30% of the time.
      if (s) s.raidedAt = S.turn;
      if (s && ["colony", "member"].includes(s.kind) && rand(S) < 0.3) {
        log(S, `${s.name}'s own defenses drive off the ${E.name} before it can do any harm.`, "good");
        if (e.goal === "strike") { e.cloaked = false; e.seen = true; }
        sendHome(S, e, 0); continue;
      }
      if (e.power === "orion") S.supplies = Math.max(0, S.supplies - 3);
      if (s) harmWorld(S, s, 1, e.goal === "strike" ? `a Romulan bird-of-prey decloaked over it, fired, and turned for the Neutral Zone`
        : e.power === "orion" ? `an Orion raider struck it, stole 3 supplies from the Federation's convoys, and ran for home` : `a ${E.name} raided it and turned for the border`);
      if (e.goal === "strike") { e.cloaked = false; e.seen = true; }
      sendHome(S, e, 0);
    } else if (e.goal === "claim" || e.goal === "watch") {
      if (!S.orders.some((o) => o.at === e.at) || ++e.stay >= 8) { if (e.goal === "watch") e.cloaked = true; sendHome(S, e, 0); }
    }
  }
}

function step(S, e) {
  // A raider closing on a world: the world calls for help, while there's time to answer.
  if ((e.goal === "raid" || (e.goal === "strike" && false)) && !e.warned && distance(e.at, e.target) <= 4) {
    const t = sysAt(S, e.target);
    if (t && ["colony", "member"].includes(t.kind)) { e.warned = true; log(S, `${t.name} reports ${/^[AEIOU]/.test(ENEMIES[e.type].name) ? "an" : "a"} ${ENEMIES[e.type].name} on long-range sensors, heading its way. It's about ${distance(e.at, e.target)} hexes out.`, "war"); }
  }
  const p = findPath(S, e.at, e.target, e.power === "romulan" ? "romulan" : e.power);
  if (!p) { delete S.enemies[e.id]; return; }
  let mp = ENEMIES[e.type].speed;
  for (const k of p.path) {
    const c = S.hexes[k].terrain === "nebula" ? 2 : 1;
    if (c > mp) break;
    mp -= c; e.at = k;
    if (k === S.pelion.at && e.hostile && !e.cloaked && e.goal !== "home") break;   // raiders stop to fight the Pelion
  }
}

function claim(S, s) {
  s.kind = "claimed"; s.accord = -5; S.lostWorlds++;
  log(S, `${s.name} joins the Klingon Empire.`, "war");
  markCommand(S, 1, `${s.name} went over to the Klingon Empire.`);
}
export { claim };
export const kindName = (s) => (s.kind === "claimed" ? "Klingon world" : s.kind === "member" ? "Federation member" : s.kind === "lost" ? "Evacuated colony" : KINDS[s.kind]?.name);
