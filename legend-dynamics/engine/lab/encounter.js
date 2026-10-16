// @ts-check
/**
 * Rules Lab encounters: participants, rounds and turns, actions, and a structured event log.
 *
 * Pure state functions: no page code. The core rules (`core`, the LD module) and the rules in force
 * (`rules`, from LDX.buildRules) are passed in, so the same code runs any setting under any configuration.
 * Every change goes through these functions, so every change is logged; the GM can override any result,
 * and overrides are logged as overrides.
 */

/**
 * @typedef {{
 *   pid: string, ref: string | null, kind: "pc" | "npc", name: string, side: "party" | "foe",
 *   agility: number, dodge: number | null, skills: Record<string, number>, weapons: string[],
 *   boxes: number, injury: number, dying: boolean, dead: boolean, minor: boolean, points: number,
 *   conditions: string[], aim: { target: string } | null, dodgedRound: number, ammo: Record<string, number>, note?: string,
 *   traits: any[], tracks: Record<string, number>
 * }} Participant
 */

const clone = (/** @type {any} */ x) => JSON.parse(JSON.stringify(x));
export const isOut = (/** @type {Participant} */ p) => p.dead || p.injury >= p.boxes;

/** @param {{ name?: string, setting: string, baseline: string, config: any, seed?: string | number | null }} o */
export function newEncounter(o) {
  return {
    id: "enc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: o.name || "Encounter", setting: o.setting, baseline: o.baseline, config: clone(o.config),
    seed: o.seed === undefined || o.seed === "" ? null : o.seed, created: new Date().toISOString(),
    status: "setup", round: 0, turn: -1, order: /** @type {string[]} */ ([]), participants: /** @type {Participant[]} */ ([]),
    events: /** @type {any[]} */ ([]), commands: /** @type {any[]} */ ([]), setup: /** @type {any} */ (null), nextPid: 1, seq: 0,
  };
}

/** The rules record every combat event carries. @param {any} rules */
export const rulesTag = (rules) => ({ config: rules.config, label: rules.label, kind: rules.kind, active: rules.active.map((/** @type {any} */ a) => ({ id: a.id, scope: a.scope, params: a.params })) });

/** @param {any} enc @param {string} type @param {any} data */
function log(enc, type, data) {
  const ev = { n: ++enc.seq, type, encounter: enc.id, round: enc.round, turn: enc.turn, active: enc.order[enc.turn] || null, at: new Date().toISOString(), ...data };
  enc.events.push(ev);
  return ev;
}

export const find = (/** @type {any} */ enc, /** @type {string} */ pid) => /** @type {Participant} */ (enc.participants.find((/** @type {Participant} */ p) => p.pid === pid));
export const active = (/** @type {any} */ enc) => (enc.status === "combat" ? find(enc, enc.order[enc.turn]) : null);

/** @param {any} enc @param {Partial<Participant> & { name: string, kind: "pc" | "npc" }} p */
export function addParticipant(enc, p) {
  const pid = "p" + enc.nextPid++;
  /** @type {Participant} */
  const q = { ref: null, side: p.kind === "pc" ? "party" : "foe", agility: 10, dodge: null, skills: {}, weapons: [], boxes: 3, injury: 0, dying: false, dead: false,
    minor: false, points: 0, conditions: [], aim: null, dodgedRound: 0, ammo: {}, traits: [], tracks: {}, ...clone(p), pid };
  enc.participants.push(q);
  if (enc.status === "combat") enc.order.push(pid);
  log(enc, "join", { pid, name: q.name, kind: q.kind, side: q.side });
  return pid;
}

/** @param {any} enc @param {string} pid */
export function removeParticipant(enc, pid) {
  const p = find(enc, pid); if (!p) return;
  enc.participants = enc.participants.filter((/** @type {Participant} */ x) => x.pid !== pid);
  const i = enc.order.indexOf(pid);
  if (i >= 0) { enc.order.splice(i, 1); if (i < enc.turn || enc.turn >= enc.order.length) enc.turn = Math.max(0, enc.turn - 1); }
  log(enc, "leave", { pid, name: p.name });
}

/** Turn order: Agility, highest first; ties in the order they joined (the GM can move anyone). @param {any} enc @param {any} rules */
export function startCombat(enc, rules) {
  enc.order = [...enc.participants].sort((a, b) => b.agility - a.agility).map((p) => p.pid);
  enc.status = "combat"; enc.round = 1; enc.turn = 0;
  enc.setup = { participants: clone(enc.participants), order: [...enc.order] };
  enc.commands.push({ type: "start" });
  log(enc, "start", { rules: rulesTag(rules), seed: enc.seed, order: enc.order.map((pid) => find(enc, pid).name) });
  skipOut(enc);
}

/** Move a participant up (-1) or down (+1) the turn order. @param {any} enc @param {string} pid @param {number} dir */
export function moveInOrder(enc, pid, dir) {
  const i = enc.order.indexOf(pid), j = i + dir;
  if (i < 0 || j < 0 || j >= enc.order.length) return;
  const cur = enc.order[enc.turn];
  [enc.order[i], enc.order[j]] = [enc.order[j], enc.order[i]];
  enc.turn = enc.order.indexOf(cur);
  log(enc, "order", { order: enc.order.map((/** @type {string} */ x) => find(enc, x).name) });
}

/** @param {any} enc */
function skipOut(enc) {
  for (let guard = 0; guard < enc.order.length; guard++) {
    const p = find(enc, enc.order[enc.turn]);
    if (p && !isOut(p)) return;
    advance(enc);
  }
}
/** @param {any} enc */
function advance(enc) {
  enc.turn++;
  if (enc.turn >= enc.order.length) { enc.turn = 0; enc.round++; log(enc, "round", { round: enc.round }); }
}

/** End the active participant's turn. @param {any} enc */
export function nextTurn(enc) {
  if (enc.status !== "combat") return;
  enc.commands.push({ type: "next" });
  advance(enc); skipOut(enc);
  const p = active(enc);
  log(enc, "turn", { pid: p && p.pid, name: p && p.name });
}

/** Aim (when the rules allow it): the next attack on this target gets the Aim bonus. @param {any} enc @param {any} rules @param {string} pid @param {string} target */
export function aim(enc, rules, pid, target) {
  if (!rules.actions.has("aim")) return { error: "Aim isn't part of these rules." };
  const p = find(enc, pid), t = find(enc, target);
  if (!p || !t) return { error: "Choose who is aiming, and at whom." };
  p.aim = { target };
  enc.commands.push({ type: "aim", pid, target });
  return { event: log(enc, "aim", { rules: rulesTag(rules), pid, name: p.name, target, targetName: t.name }) };
}

/**
 * The defenses open to a target against one attack, under these rules. Dodge is the published defense; Parry and
 * Block come from experiments; each option says whether it's already been used this round.
 * Each: { kind, label, base, mods, preview (base + its own modifiers), used }
 * @param {any} enc @param {any} rules @param {Participant} d @param {any} w the attacking weapon
 */
export function defenseOptions(enc, rules, d, w) {
  /** @type {any[]} */
  const out = [];
  if (!d || isOut(d)) return out;
  const live = (d.traits || []).filter((/** @type {any} */ t) => !t.toggle || t.on !== false);
  const flags = rules.flags || new Set(), D = rules.defenses || {};
  // One defense a round shared by Dodge, Parry and Block (with the rule on), more with extraDefense traits (an Edge).
  const shared = flags.has("oneDefense") && !flags.has("dodgeEveryAttack");
  const allowed = shared ? (rules.params.oneDefense.perRound || 1) + live.filter((/** @type {any} */ t) => t.type === "extraDefense").reduce((n, /** @type {any} */ t) => n + (t.value || 1), 0) : 0;
  const spent = shared && d.defRound === enc.round ? d.defCount || 0 : 0;
  const opt = (/** @type {any} */ o) => { o.preview = o.base + o.mods.reduce((/** @type {number} */ x, /** @type {any} */ m) => x + m.value, 0); if (shared) o.used = spent >= allowed; out.push(o); };
  if (d.dodge !== null) {
    const gear = live.filter((/** @type {any} */ t) => t.type === "dodgeBonus").map((/** @type {any} */ t) => ({ source: "gear", label: t.label || "Gear", value: t.value, scope: "setting", preview: true }));
    opt({ kind: "dodge", label: "Dodge", base: d.dodge, mods: gear, used: d.dodgedRound === enc.round && !flags.has("dodgeEveryAttack") });
  }
  const melee = !!w && w.reach === "melee";
  // The setting's skills for a weapon in hand and for bare hands (rules.skills; Melee and Brawling unless it says otherwise).
  // Where one skill covers both (Close Combat, Unarmed Combat), fists and natural weapons still don't count as a weapon in hand.
  const SK = rules.skills || { melee: "Melee", unarmed: "Brawling" }, oneSkill = SK.melee === SK.unarmed;
  const bareWeapon = (/** @type {any} */ x) => x.id === "fists" || x.unarmed || x.natural || (!oneSkill && x.skill === SK.unarmed);
  if (D.parry && melee) {
    const own = (d.weapons || []).map((id) => rules.weapons[id]).filter((/** @type {any} */ x) => x && x.reach === "melee" && !bareWeapon(x));
    const cands = own.map((/** @type {any} */ x) => ({ name: x.name, skill: x.skill, t: d.skills[x.skill] })).filter((c) => c.t !== undefined);
    // Bare hands parry fists (core), or claws and fangs too where the setting allows it (bareHanded: "natural").
    const unarmedAttack = w.unarmed || w.id === "fists" || (D.parry.bareHanded === "natural" && (w.natural || (!oneSkill && w.skill === SK.unarmed)));
    if (unarmedAttack && d.skills[SK.unarmed] !== undefined) cands.push({ name: "bare hands", skill: SK.unarmed, t: d.skills[SK.unarmed] });
    const best = cands.sort((x, y) => y.t - x.t)[0];
    if (best) {
      const n = d.parryRound === enc.round ? d.parries || 0 : 0;
      const mods = [{ source: "parry", label: "Parry", value: D.parry.mod, scope: D.parry.scope || "experiment" }];
      if (n && D.parry.repeatPenalty) mods.push({ source: "parry", label: `Parry ${n + 1} this round`, value: D.parry.repeatPenalty * n, scope: D.parry.scope || "experiment" });
      opt({ kind: "parry", label: `Parry (${best.name}, ${best.skill})`, base: best.t, mods, used: false });
    }
  }
  // The best shield still whole: a real one before an improvised one, which breaks when it stops a heavy hit.
  const shield = live.filter((/** @type {any} */ t) => t.type === "shield" && !t.used).sort((/** @type {any} */ x, /** @type {any} */ y) => (y.value || 0) - (x.value || 0))[0];
  if (D.block && shield && w && (melee || (!w.firearm && !w.spell)) && d.skills[SK.melee] !== undefined) {
    opt({ kind: "block", label: `Block (${(shield.label || "shield").toLowerCase()})`, shield: shield.label || "Shield", base: d.skills[SK.melee], used: d.blockedRound === enc.round,
      mods: [{ source: "block", label: "Block", value: D.block.mod, scope: D.block.scope || "experiment" }, { source: "gear", label: shield.label || "Shield", value: shield.value || 0, scope: "setting" }] });
  }
  return out;
}

/** "auto" picks the best defense not yet used this round. @param {any[]} opts @param {string} choice @param {boolean} allowUsed */
export function chooseDefense(opts, choice, allowUsed) {
  if (choice === "none") return null;
  const open = opts.filter((o) => !o.used), best = (/** @type {any[]} */ xs) => [...xs].sort((x, y) => y.preview - x.preview)[0] || null;
  if (!choice || choice === "auto") return best(open) || (allowUsed ? best(opts) : null);
  const o = opts.find((x) => x.kind === choice);
  return o && (!o.used || allowUsed) ? o : best(open);
}

const sumBy = (/** @type {any[]} */ mods, /** @type {string[]} */ sources) => mods.filter((m) => sources.includes(m.source)).reduce((a, m) => a + m.value, 0);

/**
 * Resolve an attack and apply its result.
 * cmd: { attacker, defender, weapon, band, mode?: {id,label,mod,cost}, ammo?, cover?, situational?: [{label,value}], canDodge?, skillTarget? }
 * opts.reroll: "attack" | "dodge" re-resolves an earlier attack (opts.replaces) with that roll rerolled, as a Legend point allows.
 * @param {any} enc @param {any} rules @param {any} core @param {any} cmd @param {{ reroll?: "attack" | "dodge", replaces?: number }} [opts]
 */
export function attack(enc, rules, core, cmd, opts = {}) {
  const a = find(enc, cmd.attacker), d = find(enc, cmd.defender), weapon = rules.weapons[cmd.weapon];
  if (!a || !d) return { error: "Choose an attacker and a target." };
  if (!weapon) return { error: "Choose a weapon." };
  if (!opts.reroll && isOut(a)) return { error: `${a.name} can't act.` };
  const skillTarget = cmd.skillTarget ?? a.skills[weapon.skill];
  if (skillTarget === undefined || skillTarget === null || Number.isNaN(+skillTarget)) return { error: `${a.name} has no ${weapon.skill} target: enter one.` };
  const prior = opts.replaces ? enc.events.find((/** @type {any} */ e) => e.n === opts.replaces) : null;
  if (opts.reroll && (!prior || prior.superseded)) return { error: "That attack can't be rerolled." };
  const cost = cmd.mode?.cost || 1;
  if (!opts.reroll && weapon.ammo && a.ammo[weapon.ammo] !== undefined && a.ammo[weapon.ammo] < cost) return { error: `${a.name} is out of ammunition for that.` };

  // A reroll starts from the moment before the original attack.
  if (prior) {
    const pd = find(enc, prior.defender.pid);
    if (prior.pre) { Object.assign(pd, prior.pre.defender); if (prior.pre.attackerTracks) a.tracks = clone(prior.pre.attackerTracks); }
    prior.superseded = true;
  }
  const n = prior ? prior.key : enc.events.filter((/** @type {any} */ e) => e.type === "attack" && !e.reroll && e.round === enc.round && e.attacker.pid === a.pid && e.defender.pid === d.pid).length;
  const key = (/** @type {string} */ kind) => `r${enc.round}|${a.pid}>${d.pid}|${n}|${kind}${opts.reroll === kind ? "|rr" : ""}`;
  const aimed = prior ? prior.aimed : (rules.actions.has("aim") && a.aim && a.aim.target === d.pid ? 1 : 0);
  // The defense. Published: one Dodge a round. Experiments add Parry and Block; the GM can allow a used one again (logged).
  const choice = cmd.canDodge === false ? "none" : cmd.defense || "auto";
  const chosen = prior ? prior.defenseChoice : chooseDefense(defenseOptions(enc, rules, d, weapon), choice, !!cmd.allowExtraDodge);
  const extraDodge = !prior && !!chosen && chosen.used;
  const canDodge = !!chosen;
  const pre = { defender: { injury: d.injury, dying: d.dying, dead: d.dead, dodgedRound: d.dodgedRound, parryRound: d.parryRound, parries: d.parries, blockedRound: d.blockedRound, defRound: d.defRound, defCount: d.defCount, traits: clone(d.traits || []),
    lasting: clone(d.lasting || []), conditions: clone(d.conditions || []), takenOut: !!d.takenOut, limbTradedRound: d.limbTradedRound },
    attackerTracks: clone(a.tracks || {}) };
  const res = core.resolveAttack({
    attacker: { id: a.pid, name: a.name, skill: weapon.skill, skillTarget: +skillTarget, injury: a.injury, traits: a.traits || [] },
    defender: { id: d.pid, name: d.name, dodgeBase: d.dodge, injury: d.injury, canDodge, minor: d.minor, boxes: d.boxes, dying: d.dying, dead: d.dead, traits: d.traits || [] },
    defense: chosen ? { kind: chosen.kind, label: chosen.label, base: chosen.base, mods: chosen.mods.filter((/** @type {any} */ m) => !m.preview) } : null,
    weapon, band: cmd.band, mode: cmd.mode || null, aimed, boosts: cmd.boosts || 0, ammo: cmd.ammo || null, cover: cmd.cover || "none",
    situational: (cmd.situational || []).filter((/** @type {any} */ m) => m && m.value).map((/** @type {any} */ m) => ({ source: "situation", label: m.label || "Situation", value: +m.value, scope: "situation" })),
    jamOn18: !!(weapon.firearm && rules.jamOn18),
    called: rules.flags.has("telling") && cmd.called ? { effect: cmd.called.effect || "", small: !!cmd.called.small } : null,
  }, rules.hooks, (/** @type {"attack" | "dodge"} */ kind) => (prior && opts.reroll !== kind && prior[kind + "Dice"] ? prior[kind + "Dice"] : core.diceFor(enc.seed, key(kind))));

  if (!prior) {
    if (res.attack && weapon.ammo && a.ammo[weapon.ammo] !== undefined) a.ammo[weapon.ammo] -= cost;
    if (a.aim) a.aim = null;
  }
  if (res.dodge && chosen) {
    d.defCount = d.defRound === enc.round ? (d.defCount || 0) + 1 : 1; d.defRound = enc.round;
    if (chosen.kind === "dodge") d.dodgedRound = enc.round;
    else if (chosen.kind === "parry") { d.parries = d.parryRound === enc.round ? (d.parries || 0) + 1 : 1; d.parryRound = enc.round; }
    else if (chosen.kind === "block") d.blockedRound = enc.round;
  }
  // An improvised shield (a chair, a slat) breaks the first time it blocks a hit of its breaking size.
  let shieldBroke = null;
  if (res.dodge && res.dodge.success && chosen && chosen.kind === "block") {
    const t = (d.traits || []).find((/** @type {any} */ x) => x.type === "shield" && !x.used && (x.label || "Shield") === chosen.shield);
    const dmg = core.weaponDamage(weapon, cmd.band);
    if (t && t.breaksOn && dmg && dmg.boxes >= t.breaksOn) { t.used = true; shieldBroke = t.label || "Shield"; }
  }
  if (res.shrugged) { const t = (d.traits || []).find((/** @type {any} */ x) => x.type === "ignoreHits" && x.oncePerFight && !x.used && (x.label || "ignoreHits") === res.shrugged); if (t) t.used = true; }
  if (res.armorUsed) { const t = (d.traits || []).find((/** @type {any} */ x) => x.type === "armor" && !x.used && (x.label || "Armour") === res.armorUsed); if (t && !t.always) t.used = true; }
  if (res.price) { a.tracks = a.tracks || {}; a.tracks[res.price.track] = (a.tracks[res.price.track] || 0) + res.price.boxes; }
  if (res.hit && res.injury) Object.assign(d, { injury: res.injury.injury, dying: res.injury.dying, dead: res.injury.dead });
  // Grievous wounds (experiment): a heavy, clean or crippling hit maims a character, or takes an opponent out.
  let grievous = null;
  const G = rules.flags.has("grievous") ? rules.params.grievousWounds : null, GT = rules.data && rules.data.grievousWounds;
  if (G && GT && res.hit && res.damage && res.damage.boxes >= (G.minBoxes || 2) && !d.dead) {
    const why = res.attack && res.attack.margin >= G.margin ? `succeeded by ${res.attack.margin}` : G.natural && res.attack && res.attack.auto === "success" ? `natural ${res.attack.total}`
      : G.onDying && d.dying && !pre.defender.dying ? "left Dying" : null;
    if (why) grievous = woundFor(d, weapon, GT, why, core.diceFor(enc.seed, key("grievous")));
  }

  // Telling hits: a hit by the margin (or a natural 3–4) that got past any defense (not a stun), or any hit from a called shot,
  // lets the attacker pick one effect. A character can shrug it off (Hard to put down, or a point).
  let telling = null;
  const TH = rules.flags.has("telling") ? rules.params.tellingHits : null;
  if (TH && res.hit && res.attack && !res.stun) {
    if (cmd.called) telling = { why: "called shot", effect: cmd.called.effect || null, called: true, small: !!cmd.called.small };
    else if (res.attack.margin >= TH.margin) telling = { why: `succeeded by ${res.attack.margin}`, effect: null };
    else if (TH.natural && res.attack.auto === "success") telling = { why: `natural ${res.attack.total}`, effect: null };
  }

  const am = res.attackMods || [], dm = res.dodgeMods || [];
  const ev = log(enc, "attack", {
    rules: rulesTag(rules), cmd: clone(cmd), key: n, reroll: opts.reroll || null, replaces: prior ? prior.n : null, pre,
    attacker: { pid: a.pid, name: a.name }, defender: { pid: d.pid, name: d.name }, weapon: { id: weapon.id, name: weapon.name }, ammo: res.ammo, mode: cmd.mode ? cmd.mode.id : null,
    band: cmd.band, skill: weapon.skill, base: +skillTarget, aimed, canDodge,
    aimMod: sumBy(am, ["aim"]), weaponMod: sumBy(am, ["weapon", "mode"]), rangeMod: sumBy(am, ["range"]),
    coverMod: sumBy(am, ["cover"]), injuryMod: sumBy(am, ["injury"]), otherMod: sumBy(am, ["situation"]) + am.filter((/** @type {any} */ m) => m.scope === "experiment" && m.source !== "aim").reduce((x, m) => x + m.value, 0),
    attackMods: am, target: res.target ?? null, attackDice: res.attack ? res.attack.dice : null, attackTotal: res.attack ? res.attack.total : null,
    margin: res.attack ? res.attack.margin : null, success: res.attack ? res.attack.success : false, auto: res.attack ? res.attack.auto : null,
    dodgeBase: res.dodgeBase ?? null, attackQualityMod: sumBy(dm, ["attackQuality"]), dodgeMods: dm, effectiveDodge: res.dodgeTarget ?? null,
    dodgeDice: res.dodge ? res.dodge.dice : null, dodgeTotal: res.dodge ? res.dodge.total : null, dodged: !!(res.dodge && res.dodge.success), // any defense that worked: Dodge, Parry or Block
    enchanted: res.enchanted || 0, defense: res.defense || null, defenseLabel: res.defenseLabel || null, defenseChoice: chosen, armorUsed: res.armorUsed || null, shieldBroke, grievous, telling,
    hit: !!res.hit, rolledHit: !!res.hit, outcome: res.outcome, jam: !!res.jam, boosts: res.boosts || 0, price: res.price || null, marginTrait: res.marginTrait || null, defenseClass: res.defenseClass || null, stun: !!res.stun,
    defenderTraits: (d.traits || []).filter((/** @type {any} */ t) => !t.toggle || t.on !== false).map((/** @type {any} */ t) => t.label || t.type),
    damage: res.damage ? res.damage.boxes : 0, dyingWeapon: !!(res.damage && res.damage.dying), rolledDamage: res.damage || null,
    injuryBefore: pre.defender.injury, injuryAfter: d.injury, dying: d.dying, dead: d.dead, injuryResult: res.injury ? res.injury.change : null,
  });
  if (grievous && grievous.pc) d.lasting[d.lasting.length - 1].about = ev.n;
  if (extraDodge) log(enc, "override", { what: "dodge", about: ev.n, pid: d.pid, name: d.name, defense: chosen.kind, from: `already used ${chosen.kind} this round`, to: `${chosen.kind} allowed`, reason: "GM allowed it again" });
  if (!prior) enc.commands.push({ type: "attack", cmd: clone(cmd) });
  return { event: ev };
}

/**
 * The attacker picks a telling hit's effect (or changes it). @param {any} enc @param {number} n @param {string} effect
 */
export function tellingEffect(enc, n, effect) {
  const ev = enc.events.find((/** @type {any} */ e) => e.n === n && e.type === "attack");
  if (!ev || !ev.telling || ev.superseded) return { error: "Only a telling hit has an effect to pick." };
  if (ev.telling.shrugged) return { error: `${ev.defender.name} already shrugged it off.` };
  const from = ev.telling.effect; ev.telling.effect = effect;
  return { event: log(enc, "telling", { about: n, pid: ev.attacker.pid, name: ev.attacker.name, target: ev.defender.name, effect, from }) };
}

/**
 * A character shrugs off a telling hit's effect, keeping the boxes: with Hard to put down (once a fight) or a point.
 * @param {any} enc @param {number} n @param {"edge" | "point"} via
 */
export function shrugTelling(enc, n, via) {
  const ev = enc.events.find((/** @type {any} */ e) => e.n === n && e.type === "attack");
  if (!ev || !ev.telling || ev.superseded || ev.telling.shrugged) return { error: "Shrug off a telling hit once." };
  const d = find(enc, ev.defender.pid);
  if (!d || d.kind !== "pc") return { error: "Only a character shrugs off a telling hit." };
  if (via === "edge") {
    const t = (d.traits || []).find((/** @type {any} */ x) => x.type === "shrugTelling" && !x.used);
    if (!t) return { error: `${d.name} has no Hard to put down left this fight.` };
    t.used = true; ev.telling.shrugged = "edge";
    return { event: log(enc, "shrug", { about: n, pid: d.pid, name: d.name, via, label: t.label || "Hard to put down" }) };
  }
  if (d.points <= 0) return { error: `${d.name} has no points left.` };
  d.points--; ev.telling.shrugged = "point";
  return { event: log(enc, "point", { pid: d.pid, name: d.name, use: "shrug", about: n }) };
}

/** What kind of wound a weapon deals, for an opponent's description. @param {any} w */
// How a hit wounds, for the gritty combat tables: a weapon can name it (wound: "energy", "power"), or it follows from the weapon.
const woundKind = (w) => (w.wound || (w.firearm ? "gun" : w.reach === "melee" ? (w.id === "fists" || w.id === "club" || w.id === "baton" ? "blunt" : w.natural || w.skill === "Brawling" ? "claw" : "blade") : "missile"));

/**
 * A grievous wound. A character rolls 3d6 on the table and suffers it (Dying, a condition, a lasting wound);
 * an opponent is taken out, with a description picked by the same dice.
 * @param {any} d @param {any} w @param {any} GT @param {string} why @param {number[]} dice
 */
function woundFor(d, w, GT, why, dice) {
  const total = dice[0] + dice[1] + dice[2];
  if (d.kind !== "pc") {
    const list = GT.enemy[woundKind(w)] || GT.enemy.gun || ["{name} is taken out."];
    d.injury = d.boxes; d.takenOut = true;
    return { pc: false, why, dice, total, text: list[total % list.length].replaceAll("{name}", d.name) };
  }
  const entry = GT.table.find((/** @type {any} */ x) => total >= x.from && total <= x.to);
  return { pc: true, why, dice, total, ...applyWound(d, entry) };
}
/** @param {any} d @param {any} entry */
function applyWound(d, entry) {
  const dyingBefore = !!d.dying, condAdded = entry.condition && !(d.conditions || []).includes(entry.condition) ? entry.condition : null;
  if (entry.dying) d.dying = true;
  if (condAdded) d.conditions = [...(d.conditions || []), condAdded];
  d.lasting = [...(d.lasting || []), { id: entry.id, name: entry.name }];
  return { id: entry.id, name: entry.name, text: entry.text, dyingBefore, condAdded };
}

/**
 * Trade death for a limb (grievous wounds): a character just left Dying or killed by this hit lives instead,
 * Incapacitated but stable, and loses a limb ("lost") or its use ("crippled"), which becomes a complication.
 * Once a fight. @param {any} enc @param {any} rules @param {number} n the attack event @param {"lost" | "crippled"} kind
 */
export function tradeLimb(enc, rules, n, kind) {
  const G = rules.flags.has("grievous") ? rules.params.grievousWounds : null;
  if (!G || !G.limbTrade) return { error: "Trading a limb isn't part of these rules." };
  const ev = enc.events.find((/** @type {any} */ e) => e.n === n && e.type === "attack");
  if (!ev || ev.superseded || ev.traded) return { error: "Choose the hit to trade, once." };
  const d = find(enc, ev.defender.pid);
  if (!d || d.kind !== "pc") return { error: "Only a character can trade a limb for their life." };
  if (!((ev.dying && !ev.pre.defender.dying) || ev.dead)) return { error: "Only a hit that left them Dying or dead can be traded." };
  if (d.limbTradedRound !== undefined) return { error: `${d.name} has already traded a limb this fight.` };
  const name = kind === "crippled" ? "Crippled limb (complication)" : "Lost limb (complication)";
  // If the same hit was grievous, the trade replaces its table result: one wound for one hit.
  const g = ev.grievous && ev.grievous.pc ? ev.grievous : null;
  if (g) {
    d.lasting = (d.lasting || []).filter((/** @type {any} */ w) => w.about !== ev.n);
    const cond = g.downgraded ? g.downgraded.condAdded : g.condAdded;
    if (cond) d.conditions = (d.conditions || []).filter((/** @type {string} */ c) => c !== cond);
    g.replacedByTrade = true;
  }
  Object.assign(d, { dying: false, dead: false, injury: Math.min(d.injury, d.boxes), limbTradedRound: enc.round });
  d.lasting = [...(d.lasting || []), { id: "limb-" + kind, name, complication: true, about: ev.n }];
  ev.traded = kind; ev.dying = false; ev.dead = false;
  return { event: log(enc, "trade", { pid: d.pid, name: d.name, about: ev.n, kind, wound: name }) };
}

/** Spend a Legend point. use: "reroll-attack" | "reroll-dodge" | "reduce" (a hit by one box) | "prep" | "other". @param {any} enc @param {any} rules @param {any} core @param {string} pid @param {string} use @param {{ event?: number, note?: string }} [o] */
export function spendPoint(enc, rules, core, pid, use, o = {}) {
  const p = find(enc, pid); if (!p) return { error: "Who is spending the point?" };
  if (p.kind === "pc" && p.points <= 0) return { error: `${p.name} has no points left.` };
  const ev = o.event ? enc.events.find((/** @type {any} */ e) => e.n === o.event) : null;
  if (use === "reroll-attack" || use === "reroll-dodge") {
    if (!ev || ev.superseded || ev.reroll) return { error: "Each roll can be rerolled once, with one point." };
    if (use === "reroll-dodge" && !ev.dodgeDice) return { error: "There was no Dodge roll to reroll." };
    if (p.kind === "pc") p.points--;
    log(enc, "point", { pid, name: p.name, use, about: ev.n });
    return attack(enc, rules, core, ev.cmd, { reroll: use === "reroll-attack" ? "attack" : "dodge", replaces: ev.n });
  }
  if (use === "downgrade") {
    const g = ev && ev.grievous;
    if (!g || !g.pc || g.downgradedTo !== undefined || ev.superseded) return { error: "Downgrade a character's grievous wound, once." };
    const d = find(enc, ev.defender.pid), GT = rules.data && rules.data.grievousWounds;
    if (!d || !GT) return { error: "Grievous wounds aren't part of these rules." };
    if (p.kind === "pc") p.points--;
    const from = GT.table.find((/** @type {any} */ x) => x.id === g.id), to = from && from.down ? GT.table.find((/** @type {any} */ x) => x.id === from.down) : null;
    d.dying = g.dyingBefore; // undo this wound's own effects…
    if (g.condAdded) d.conditions = d.conditions.filter((/** @type {string} */ c) => c !== g.condAdded);
    d.lasting = (d.lasting || []).filter((/** @type {any} */ w) => w.about !== ev.n);
    let now = null;
    if (to) { now = applyWound(d, to); d.lasting[d.lasting.length - 1].about = ev.n; } // …and suffer the milder one instead
    g.downgradedTo = to ? to.name : null; g.downgraded = now;
    return { event: log(enc, "point", { pid, name: p.name, use, about: ev.n, from: g.name, to: to ? to.name : "no lasting wound" }) };
  }
  if (use === "reduce") {
    if (!ev || !ev.hit || !ev.damage || ev.reduced || ev.superseded) return { error: "Reduce a hit that marked boxes, once." };
    const d = find(enc, ev.defender.pid);
    if (p.kind === "pc") p.points--;
    const r = core.applyHit({ ...ev.pre.defender, minor: d.minor, boxes: d.boxes }, { boxes: ev.damage - 1, dying: ev.dyingWeapon && ev.damage - 1 >= 2 });
    Object.assign(d, ev.damage - 1 > 0 ? { injury: r.injury, dying: r.dying, dead: r.dead } : { injury: ev.pre.defender.injury, dying: ev.pre.defender.dying, dead: ev.pre.defender.dead });
    ev.reduced = 1; ev.injuryAfter = d.injury; ev.dying = d.dying; ev.dead = d.dead;
    return { event: log(enc, "point", { pid, name: p.name, use, about: ev.n, injuryAfter: d.injury }) };
  }
  if (p.kind === "pc") p.points--;
  return { event: log(enc, "point", { pid, name: p.name, use, note: o.note || "" }) };
}

/** Switch a participant's trait on or off (e.g. a Ward that has been broken). @param {any} enc @param {string} pid @param {number} i @param {boolean} on */
export function setTrait(enc, pid, i, on) {
  const p = find(enc, pid); if (!p || !p.traits[i]) return { error: "No such trait." };
  p.traits[i].on = on;
  return { event: log(enc, "trait", { pid, name: p.name, trait: p.traits[i].label || p.traits[i].type, on }) };
}

/** Put protective gear on a participant (its traits join theirs). @param {any} enc @param {string} pid @param {{ id: string, name: string, traits: any[] }} item */
export function addGear(enc, pid, item) {
  const p = find(enc, pid); if (!p || !item) return { error: "Choose the gear." };
  if ((p.gear || []).includes(item.id)) return { error: `${p.name} already has ${item.name}.` };
  p.gear = [...(p.gear || []), item.id];
  p.traits = [...(p.traits || []), ...clone(item.traits)];
  return { event: log(enc, "gear", { pid, name: p.name, item: item.name, on: true }) };
}

/** A complication comes into play; accepting it earns a Legend point. @param {any} enc @param {string} pid @param {string} note */
export function invokeComplication(enc, pid, note) {
  const p = find(enc, pid); if (!p) return { error: "Whose complication?" };
  if (p.kind === "pc") p.points++;
  return { event: log(enc, "complication", { pid, name: p.name, note: note || "" }) };
}

/** @param {any} enc @param {string} pid @param {string} condition @param {boolean} on */
export function setCondition(enc, pid, condition, on) {
  const p = find(enc, pid); if (!p || !condition) return { error: "Name the condition." };
  p.conditions = on ? [...new Set([...p.conditions, condition])] : p.conditions.filter((c) => c !== condition);
  return { event: log(enc, "condition", { pid, name: p.name, condition, on }) };
}

/**
 * The GM's word overrides any result. Each override is logged with what it replaced.
 * what: "injury" { pid, injury, dying?, dead? } | "outcome" { event, hit } | "points" { pid, points } | "ammo" { pid, ammo, rounds } | "skill" { pid, skill, from, to } (a target set by hand for one attack)
 * @param {any} enc @param {any} rules @param {any} core @param {string} what @param {any} o
 */
export function override(enc, rules, core, what, o) {
  if (what === "injury" || what === "points" || what === "ammo") {
    const p = find(enc, o.pid); if (!p) return { error: "Who?" };
    const from = what === "injury" ? { injury: p.injury, dying: p.dying, dead: p.dead } : what === "points" ? p.points : p.ammo[o.ammo];
    if (what === "injury") Object.assign(p, { injury: Math.max(0, Math.min(p.boxes, +o.injury)), dying: !!o.dying, dead: !!o.dead });
    else if (what === "points") p.points = Math.max(0, +o.points);
    else p.ammo[o.ammo] = Math.max(0, +o.rounds);
    const to = what === "injury" ? { injury: p.injury, dying: p.dying, dead: p.dead } : what === "points" ? p.points : p.ammo[o.ammo];
    return { event: log(enc, "override", { what, pid: p.pid, name: p.name, from, to, reason: o.reason || "" }) };
  }
  if (what === "track") {
    const p = find(enc, o.pid); if (!p) return { error: "Who?" };
    const from = (p.tracks || {})[o.track] || 0; p.tracks = { ...(p.tracks || {}), [o.track]: Math.max(0, +o.value) };
    return { event: log(enc, "override", { what, pid: p.pid, name: p.name, track: o.track, from, to: p.tracks[o.track], reason: o.reason || "" }) };
  }
  if (what === "skill") {
    const p = find(enc, o.pid); if (!p) return { error: "Who?" };
    return { event: log(enc, "override", { what, pid: p.pid, name: p.name, skill: o.skill, from: o.from ?? null, to: o.to, reason: o.reason || "" }) };
  }
  if (what === "outcome") {
    const ev = enc.events.find((/** @type {any} */ e) => e.n === o.event && e.type === "attack");
    if (!ev || ev.superseded) return { error: "Choose an attack to override." };
    const d = find(enc, ev.defender.pid), from = { hit: ev.hit, injury: d.injury };
    if (o.hit && !ev.hit) {
      const dmg = ev.rolledDamage || core.weaponDamage(rules.weapons[ev.weapon.id], ev.band) || { boxes: 0 }; // the damage the dice gave, if they gave a hit
      const r = dmg.boxes ? core.applyHit({ ...ev.pre.defender, minor: d.minor, boxes: d.boxes }, dmg) : null;
      if (r) Object.assign(d, { injury: r.injury, dying: r.dying, dead: r.dead });
      Object.assign(ev, { hit: true, damage: dmg.boxes, dyingWeapon: !!dmg.dying, injuryAfter: d.injury, injuryResult: r ? r.change : "no effect at this range" });
    } else if (!o.hit && ev.hit) {
      Object.assign(d, ev.pre.defender);
      Object.assign(ev, { hit: false, damage: 0, injuryAfter: d.injury, injuryResult: null });
    }
    ev.overridden = ev.hit === ev.rolledHit ? false : true;
    return { event: log(enc, "override", { what, about: ev.n, name: d.name, attacker: ev.attacker.name, from, to: { hit: ev.hit, injury: d.injury }, reason: o.reason || "" }) };
  }
  return { error: "Unknown override." };
}

/** A clock changed (the page's existing clocks; nothing here keeps a second set). @param {any} enc @param {{ id: string, name: string, kind: string, size: number }} c @param {number} from @param {number} to */
export function clockChange(enc, c, from, to) {
  return { event: log(enc, "clock", { clock: c.id, name: c.name, kind: c.kind, size: c.size, from, to }) };
}

/** @param {any} enc @param {string} text */
export function note(enc, text) { return text ? { event: log(enc, "note", { text }) } : { error: "Write the note first." }; }

/** @param {any} enc @param {any} summary */
export function endEncounter(enc, summary) {
  enc.status = "ended";
  enc.summary = summary;
  return { event: log(enc, "end", { summary }) };
}

/**
 * Rerun an encounter's declared actions (turns, Aim, attacks) from its starting state under other rules,
 * with the same seed: the same roll for the same attacker, target and round, so differences come from the rules.
 * Point spends and overrides depend on outcomes, so they're not replayed; actions that can't happen any more
 * (the attacker is down) are skipped and counted.
 * @param {any} enc @param {any} rules @param {any} core @param {any} config
 */
export function replay(enc, rules, core, config) {
  if (!enc.setup) return { error: "Start the encounter before rerunning it." };
  const r = newEncounter({ name: enc.name + " (rerun)", setting: enc.setting, baseline: enc.baseline, config, seed: enc.seed });
  r.participants = clone(enc.setup.participants); r.nextPid = enc.nextPid;
  r.replayOf = enc.id;
  let skipped = 0;
  for (const c of enc.commands) {
    if (c.type === "start") { startCombat(r, rules); r.order = [...enc.setup.order]; r.turn = 0; skipOut(r); }
    else if (c.type === "next") nextTurn(r);
    else if (c.type === "aim") { if (aim(r, rules, c.pid, c.target).error) skipped++; }
    else if (c.type === "attack") { if (attack(r, rules, core, c.cmd).error) skipped++; }
  }
  r.skipped = skipped;
  return { encounter: r };
}
