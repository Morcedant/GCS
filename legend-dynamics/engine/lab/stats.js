// @ts-check
/**
 * Rules Lab playtest summary, computed only from an encounter's event log.
 * Rerolled attacks count once, as their final result.
 */

const avg = (/** @type {number[]} */ xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
const rate = (/** @type {number} */ n, /** @type {number} */ d) => (d ? Math.round((n / d) * 1000) / 10 : null); // percent, one decimal

/** @param {any} enc */
export function summarize(enc) {
  const ev = enc.events;
  const attacks = ev.filter((/** @type {any} */ e) => e.type === "attack" && !e.superseded);
  const rolled = attacks.filter((/** @type {any} */ e) => e.attackDice);
  const succ = rolled.filter((/** @type {any} */ e) => e.success);
  const dodges = rolled.filter((/** @type {any} */ e) => e.dodgeDice);
  const dodged = rolled.filter((/** @type {any} */ e) => e.dodged);
  const hits = attacks.filter((/** @type {any} */ e) => e.hit);
  const damaging = hits.filter((/** @type {any} */ e) => e.damage > 0);
  const injuring = hits.filter((/** @type {any} */ e) => e.injuryAfter > e.injuryBefore || e.dead);
  const byWeapon = /** @type {Record<string, any>} */ ({});
  const byAttacker = /** @type {Record<string, any>} */ ({});
  for (const e of attacks) {
    for (const [map, k, name] of [[byWeapon, e.weapon.id, e.weapon.name], [byAttacker, e.attacker.pid, e.attacker.name]]) {
      const r = (map[k] ||= { name, attacks: 0, successes: 0, dodged: 0, hits: 0, boxes: 0 });
      r.attacks++; if (e.success) r.successes++; if (e.dodged) r.dodged++; if (e.hit) { r.hits++; r.boxes += e.damage || 0; }
    }
  }
  const byDefense = /** @type {Record<string, any>} */ ({});
  for (const e of dodges) { const r = (byDefense[e.defense || "dodge"] ||= { attempts: 0, successes: 0 }); r.attempts++; if (e.dodged) r.successes++; }
  const startEv = ev.find((/** @type {any} */ e) => e.type === "start");
  const rules = startEv ? startEv.rules : null;
  const ps = enc.participants;
  return {
    encounter: enc.id, name: enc.name, setting: enc.setting, baseline: enc.baseline, seed: enc.seed, replayOf: enc.replayOf || null,
    rules: rules ? { config: rules.config, label: rules.label, kind: rules.kind, experiments: rules.active.map((/** @type {any} */ a) => `${a.id} (${a.scope})`) } : null,
    rounds: enc.round,
    attacks: attacks.length,
    attacksRolled: rolled.length,
    outOfRangeOrBlocked: attacks.length - rolled.length,
    attackSuccessRate: rate(succ.length, rolled.length),
    dodgeNegatedRate: rate(dodged.length, succ.length),
    finalHitRate: rate(hits.length, rolled.length),
    averageMargin: avg(succ.map((/** @type {any} */ e) => e.margin)),
    dodgeAttempts: dodges.length,
    dodgeSuccessRate: rate(dodged.length, dodges.length),
    averageEffectiveDodge: avg(dodges.map((/** @type {any} */ e) => e.effectiveDodge)),
    averageAttackQualityMod: avg(dodges.map((/** @type {any} */ e) => e.attackQualityMod)),
    damageFrequency: rate(damaging.length, rolled.length),
    injuryFrequency: rate(injuring.length, rolled.length),
    boxesMarked: damaging.reduce((/** @type {number} */ a, /** @type {any} */ e) => a + e.damage, 0),
    incapacitated: ps.filter((/** @type {any} */ p) => p.injury >= p.boxes && !p.dead).length,
    dying: ps.filter((/** @type {any} */ p) => p.dying && !p.dead).length,
    dead: ps.filter((/** @type {any} */ p) => p.dead).length,
    pointsSpent: ev.filter((/** @type {any} */ e) => e.type === "point").length,
    pointsByUse: ev.filter((/** @type {any} */ e) => e.type === "point").reduce((/** @type {any} */ a, /** @type {any} */ e) => ((a[e.use] = (a[e.use] || 0) + 1), a), {}),
    rerolls: attacks.filter((/** @type {any} */ e) => e.reroll).length,
    complications: ev.filter((/** @type {any} */ e) => e.type === "complication").length,
    overrides: ev.filter((/** @type {any} */ e) => e.type === "override").length,
    clockChanges: ev.filter((/** @type {any} */ e) => e.type === "clock").length,
    jams: attacks.filter((/** @type {any} */ e) => e.jam).length,
    priceMarked: attacks.filter((/** @type {any} */ e) => e.price).reduce((/** @type {any} */ m, /** @type {any} */ e) => ((m[e.price.track] = (m[e.price.track] || 0) + e.price.boxes), m), {}),
    boostsSpent: attacks.reduce((/** @type {number} */ n, /** @type {any} */ e) => n + (e.boosts || 0), 0),
    skippedOnRerun: enc.skipped || 0,
    byWeapon, byAttacker, byDefense,
    armorStops: attacks.filter((/** @type {any} */ e) => e.armorUsed).length,
  };
}

/** One row per attack, for a spreadsheet. @param {any} enc */
export function attacksCsv(enc) {
  const cols = ["encounter", "config", "experiments", "round", "turn", "attacker", "defender", "weapon", "ammo", "mode", "band", "skill", "base", "aimMod", "weaponMod", "rangeMod",
    "coverMod", "injuryMod", "otherMod", "target", "attackTotal", "margin", "success", "defense", "dodgeBase", "attackQualityMod", "effectiveDodge", "dodgeTotal", "dodged", "armorUsed", "hit",
    "damage", "injuryBefore", "injuryAfter", "dying", "dead", "boosts", "priceTrack", "priceBoxes", "jam", "reroll", "overridden", "outcome"];
  const cell = (/** @type {any} */ v) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = enc.events.filter((/** @type {any} */ e) => e.type === "attack" && !e.superseded).map((/** @type {any} */ e) => ({
    ...e, config: e.rules.config, experiments: e.rules.active.map((/** @type {any} */ a) => `${a.id}:${a.scope}`).join(" "),
    attacker: e.attacker.name, defender: e.defender.name, weapon: e.weapon.name, reroll: e.reroll || "", priceTrack: e.price ? e.price.track : "", priceBoxes: e.price ? e.price.boxes : "", overridden: e.overridden ? "yes" : "" }));
  return [cols.join(","), ...rows.map((/** @type {any} */ r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}
