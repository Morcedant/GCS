// @ts-check
/**
 * Legend Dynamics core rules: pure functions, no page code.
 *
 * Every rule here is the published core (engine/core.md). Settings supply data (weapons, NPCs, terms);
 * experiments plug into resolveAttack() through its hook lists and never change these functions.
 * The build inlines this file into each creator page as `LD`; tests import it directly.
 */

export const CORE_BASELINE = "Legend Dynamics core, published 2026-10";

/** @typedef {[number, number, number]} Dice */
/** @typedef {{ dice: Dice, total: number, target: number, success: boolean, auto: "success" | "failure" | null, margin: number, contestMargin: number }} Roll */
/** @typedef {{ source: string, label: string, value: number, scope: "core" | "setting" | "experiment" | "situation" }} Modifier */

// ---- 3d6 roll-under ----

/** @param {() => number} [random] */
export function rollDice(random = Math.random) {
  return /** @type {Dice} */ ([0, 0, 0].map(() => 1 + Math.floor(random() * 6)));
}

/**
 * Resolve a roll against an adjusted target. Natural 3–4 always succeeds; natural 17–18 always fails.
 * An automatic success above its target counts as margin 0 in a contest.
 * @param {Dice} dice @param {number} target @returns {Roll}
 */
export function resolve(dice, target) {
  const total = dice[0] + dice[1] + dice[2];
  const auto = total <= 4 ? "success" : total >= 17 ? "failure" : null;
  const success = auto === "success" || (auto === null && total <= target);
  const margin = target - total;
  return { dice, total, target, success, auto, margin, contestMargin: success ? Math.max(0, margin) : margin };
}

// Ways to roll each total on 3d6, index 0 = total 3.
const WAYS = [1, 3, 6, 10, 15, 21, 25, 27, 27, 25, 21, 15, 10, 6, 3, 1];

/** Chance of success against a target, including the automatic results. @param {number} target */
export function odds(target) {
  let ways = 0;
  for (let t = 3; t <= 18; t++) if (t <= 4 || (t <= 16 && t <= target)) ways += WAYS[t - 3];
  return ways / 216;
}

/** @param {Modifier[]} mods */
export const sumMods = (mods) => mods.reduce((a, m) => a + (m.value || 0), 0);

// ---- dice sources ----

/** A seeded generator (mulberry32). @param {number} seed */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of a string (FNV-1a). @param {string} s */
export function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/**
 * Dice for one named roll. With a seed, the same seed and key always give the same dice, whatever else
 * happened in the encounter, so a rules change that adds or removes a roll doesn't shift every later one.
 * Without a seed, ordinary random dice.
 * @param {string | number | null | undefined} seed @param {string} key
 */
export function diceFor(seed, key) {
  if (seed === null || seed === undefined || seed === "") return rollDice();
  return rollDice(mulberry32(hash32(String(seed) + "|" + key)));
}

// ---- range ----

/** Range bands, nearest first. "melee" is reach: someone next to you. */
export const BANDS = ["melee", "close", "short", "medium", "long", "extreme"];
const bandIndex = (/** @type {string} */ b) => Math.max(1, BANDS.indexOf(b)); // a gun used at arm's length is at Close

/**
 * The published range modifier for a weapon at a band: 0 within its effective band, −2 one band beyond,
 * −4 two beyond, null when out of range (farther, past a weapon's maximum band, or a melee weapon not in reach).
 * @param {{ reach?: string, band?: string, maxBand?: string }} weapon @param {string} band
 * @returns {number | null}
 */
export function rangeModifier(weapon, band) {
  if (weapon.reach === "melee") return band === "melee" ? 0 : null;
  const at = bandIndex(band), eff = bandIndex(weapon.band || "close");
  if (weapon.maxBand && at > bandIndex(weapon.maxBand)) return null;
  const over = at - eff;
  return over <= 0 ? 0 : over === 1 ? -2 : over === 2 ? -4 : null;
}

/**
 * Boxes a hit marks at a band: the weapon's damage for that band, or its default.
 * @param {{ reach?: string, damage: Record<string, { boxes: number, dying?: boolean } | null> }} weapon @param {string} band
 * @returns {{ boxes: number, dying?: boolean } | null}
 */
export function weaponDamage(weapon, band) {
  const b = weapon.reach === "melee" ? "melee" : BANDS[bandIndex(band)];
  if (b in weapon.damage) return weapon.damage[b];
  return weapon.damage.any ?? null;
}

/**
 * Core capability: accuracy traits on a weapon. The core knows how to read them; settings (or their test
 * configurations) supply the values. Published weapons carry none.
 * A trait: { type: "accuracy", value, bands?: string[], requires?: { aimed?: boolean, ammo?: string, mode?: string }, label? }
 * @param {{ name?: string, traits?: any[] }} weapon @param {{ band: string, aimed?: number | boolean, ammo?: string, mode?: { id: string } | null }} ctx
 * @returns {Modifier[]}
 */
export function weaponAccuracy(weapon, ctx) {
  /** @type {Modifier[]} */
  const out = [];
  for (const t of weapon.traits || []) {
    if (t.type !== "accuracy" || !t.value) continue;
    if (t.bands && t.bands.length && !t.bands.includes(ctx.band === "melee" ? "close" : ctx.band)) continue;
    const r = t.requires || {};
    if (r.aimed && !ctx.aimed) continue;
    if (r.ammo && r.ammo !== ctx.ammo) continue;
    if (r.mode && r.mode !== ctx.mode?.id) continue;
    out.push({ source: "weapon", label: t.label || `${weapon.name || "Weapon"} accuracy`, value: t.value, scope: "setting" });
  }
  return out;
}

// ---- injury ----

export const INJURY_MAX = 3;
/** Physical-action penalty for each injury level; null means Incapacitated. */
export const INJURY_PENALTY = [0, -1, -2, null];

/**
 * Apply a hit that got through, under the published injury and Dying rules.
 * Minor opponents go down to any hit. A hit marking 2+ boxes that brings you to three boxes leaves you Dying;
 * at three boxes, any further hit marking 2+ boxes kills.
 * @param {{ injury: number, dying?: boolean, dead?: boolean, minor?: boolean, boxes?: number }} who
 * @param {{ boxes: number, dying?: boolean }} hit
 */
export function applyHit(who, hit) {
  const max = who.boxes || INJURY_MAX;
  const before = who.injury || 0;
  if (who.dead) return { injury: before, dying: !!who.dying, dead: true, out: true, change: "already dead" };
  if (who.minor) return { injury: max, dying: false, dead: false, out: true, change: "minor opponent: out of the fight" };
  if (before >= max) {
    if (hit.boxes >= 2) return { injury: max, dying: false, dead: true, out: true, change: "killed: a 2+ box hit at three boxes" };
    return { injury: max, dying: !!who.dying, dead: false, out: true, change: "already down" };
  }
  const injury = Math.min(max, before + hit.boxes);
  const down = injury >= max;
  const dying = !!who.dying || (down && (hit.boxes >= 2 || !!hit.dying));
  return { injury, dying, dead: false, out: down, change: down ? (dying ? "incapacitated and Dying" : "incapacitated") : `${injury} box${injury > 1 ? "es" : ""}` };
}

/** Dodge: Agility −2, plus the Athletics bonus (+1 Trained, +2 Specialty or Expert). */
export const dodgeBase = (/** @type {number} */ agility, /** @type {number} */ athleticsBonus) => agility - 2 + athleticsBonus;

// ---- attack resolution ----

/**
 * @typedef {{
 *   attacker: { id: string, name: string, skill: string, skillTarget: number, injury?: number, traits?: any[] },
 *   defender: { id: string, name: string, dodgeBase: number | null, injury?: number, canDodge: boolean, minor?: boolean, boxes?: number, dying?: boolean, dead?: boolean, traits?: any[] },
 *   weapon: any, band: string, mode?: { id: string, label: string, mod: number } | null, aimed?: number, ammo?: string,
 *   cover?: "none" | "partial" | "solid", situational?: Modifier[], jamOn18?: boolean, boosts?: number,
 *   defense?: { kind: string, label: string, base: number, mods?: Modifier[] } | null
 * }} AttackInput
 * @typedef {{ attackModifiers: ((ctx: any) => Modifier[])[], dodgeModifiers: ((ctx: any) => Modifier[])[] }} Hooks
 */

/**
 * The price some attacks carry on a failure (a setting's magic: Corruption, Strain, The Dark).
 * Core capability; the setting's weapon data says which track and how much. @param {any} weapon @param {Roll} roll
 * @returns {{ track: string, boxes: number } | null}
 */
export function priceFor(weapon, roll) {
  const p = weapon.price;
  if (!p || roll.success) return null;
  return { track: p.track, boxes: roll.total === 18 && p.natural18 ? p.natural18 : p.fail };
}

/** Defender traits that are switched on (a trait with toggle: true can be switched off, e.g. a Ward once broken). @param {any} defender */
const liveTraits = (defender) => (defender.traits || []).filter((/** @type {any} */ t) => !t.toggle || t.on !== false);

const DEFENDED = /** @type {Record<string, string>} */ ({ dodge: "dodged", parry: "parried", block: "blocked", deflect: "deflected" });

/** Published core: no extra modifiers. */
export const NO_HOOKS = /** @type {Hooks} */ ({ attackModifiers: [], dodgeModifiers: [] });

/**
 * Resolve one attack, start to finish, and say how every number was reached.
 * Base skill → modifiers → final target → 3d6 → margin → Dodge modifiers → Dodge roll → damage.
 * @param {AttackInput} input @param {Hooks} hooks @param {(kind: "attack" | "dodge") => Dice} roll
 */
export function resolveAttack(input, hooks, roll) {
  const { attacker, defender, weapon, band } = input;
  const out = /** @type {any} */ ({ attacker: attacker.id, defender: defender.id, weapon: weapon.id, band, ammo: input.ammo || null, mode: input.mode?.id || null });
  const range = rangeModifier(weapon, band);
  if (range === null) return { ...out, outcome: "out of range", hit: false, attackMods: [], dodgeMods: [] };
  if (input.cover === "solid") return { ...out, outcome: "blocked by solid cover", hit: false, attackMods: [], dodgeMods: [] };

  /** @type {Modifier[]} */
  const mods = [];
  if (range) mods.push({ source: "range", label: `Range (${band})`, value: range, scope: "core" });
  if (input.mode && input.mode.mod) mods.push({ source: "mode", label: input.mode.label, value: input.mode.mod, scope: "setting" });
  for (const m of weaponAccuracy(weapon, input)) mods.push(m);
  // An enchanted weapon (setting data on the attacker): +N to hit with that weapon.
  const ench = (attacker.traits || []).filter((/** @type {any} */ t) => t.type === "weaponBonus" && (!t.weapon || t.weapon === weapon.id));
  for (const t of ench) if (t.accuracy) mods.push({ source: "enchantment", label: t.label || "Enchantment", value: t.accuracy, scope: "setting" });
  if (input.cover === "partial") mods.push({ source: "cover", label: "Partial cover", value: -2, scope: "core" });
  const atkInj = INJURY_PENALTY[attacker.injury || 0] || 0;
  if (atkInj) mods.push({ source: "injury", label: "Attacker's injury", value: atkInj, scope: "core" });
  for (const m of input.situational || []) if (m.value) mods.push(m);
  for (const t of liveTraits(defender)) if (t.type === "attackPenalty" && t.value) mods.push({ source: "defender", label: t.label || "Defender", value: t.value, scope: "setting" });
  const boosts = weapon.spell ? Math.max(0, Math.min(2, input.boosts || 0)) : 0; // Harder Boosts: −1 to the roll and +1 box each (core magic)
  if (boosts) mods.push({ source: "boost", label: `Harder Boost${boosts > 1 ? " ×" + boosts : ""}`, value: -boosts, scope: "core" });
  const ctx = { ...input, range, margin: 0 };
  for (const h of hooks.attackModifiers) for (const m of h(ctx)) if (m.value) mods.push(m);
  const target = attacker.skillTarget + sumMods(mods);
  const atk = resolve(roll("attack"), target);
  out.attackMods = mods; out.base = attacker.skillTarget; out.target = target; out.attack = atk;
  out.jam = (weapon.jamOn || (input.jamOn18 ? [18] : [])).includes(atk.total);
  out.price = priceFor(weapon, atk);
  out.boosts = boosts;
  if (!atk.success) return { ...out, outcome: "miss", hit: false, dodgeMods: [] };

  /** @type {Modifier[]} */
  const dmods = [];
  const dctx = { ...ctx, margin: atk.margin, attack: atk };
  // The defense: published Dodge unless the caller chose another (Parry, Block: lab experiments). One roll, whichever it is.
  const def = input.defense !== undefined ? input.defense
    : defender.canDodge && defender.dodgeBase !== null ? { kind: "dodge", label: "Dodge", base: defender.dodgeBase, mods: [] } : null;
  if (def) {
    for (const m of def.mods || []) if (m.value) dmods.push(m);
    // Published gear: a shield's +1 to Dodge against attacks you can see.
    if (def.kind === "dodge") for (const t of liveTraits(defender)) if (t.type === "dodgeBonus" && t.value) dmods.push({ source: "gear", label: t.label || "Gear", value: t.value, scope: "setting" });
    const defInj = INJURY_PENALTY[defender.injury || 0] || 0;
    if (defInj) dmods.push({ source: "injury", label: "Defender's injury", value: defInj, scope: "core" });
    for (const h of hooks.dodgeModifiers) for (const m of h({ ...dctx, defense: def.kind })) if (m.value) dmods.push(m);
    const eff = def.base + sumMods(dmods);
    const dg = resolve(roll("dodge"), eff);
    out.defense = def.kind; out.defenseLabel = def.label;
    out.dodgeBase = def.base; out.dodgeTarget = eff; out.dodge = dg;
    if (dg.success) return { ...out, dodgeMods: dmods, outcome: DEFENDED[def.kind] || "defended", hit: false };
  }
  out.dodgeMods = dmods;
  let dmg = weaponDamage(weapon, band);
  // A weapon's margin trait (setting data) can make a strong hit worse, e.g. "a hit by 5 or more leaves the target Dying".
  for (const t of weapon.traits || []) if (t.type === "marginDamage" && atk.margin >= t.margin && dmg && t.damage.boxes >= dmg.boxes) { dmg = { ...t.damage }; out.marginTrait = t.label || "Strong hit"; }
  if (dmg && boosts) dmg = { ...dmg, boxes: dmg.boxes + boosts };
  const bite = ench.reduce((/** @type {number} */ n, /** @type {any} */ t) => n + (t.extraBox || 0), 0);
  if (dmg && dmg.boxes && bite) { dmg = { ...dmg, boxes: dmg.boxes + bite }; out.enchanted = bite; }
  if (!dmg || !dmg.boxes) return { ...out, outcome: "hit, no effect at this range", hit: true, damage: null };
  // A trait that ignores small hits: always, or once per fight (oncePerFight; the encounter marks it used).
  const shrug = liveTraits(defender).find((/** @type {any} */ t) => t.type === "ignoreHits" && !t.used && dmg && dmg.boxes <= t.maxBoxes);
  if (shrug) return { ...out, outcome: `hit, marks nothing (${shrug.label || "too tough"})`, hit: true, damage: null, shrugged: shrug.label || "ignoreHits" };
  // Published armour (setting data): e.g. a mail shirt, "hits of 2 or more boxes mark one fewer, once per fight".
  // Armour can say what it works against: "melee", "missile" (bows, slings, thrown) or "firearm". No list: everything.
  const kind = weapon.firearm ? "firearm" : weapon.reach === "melee" ? "melee" : "missile";
  const armour = liveTraits(defender).find((/** @type {any} */ t) => t.type === "armor" && !t.used && dmg && dmg.boxes >= (t.minBoxes || 1) && (!t.against || t.against.includes(kind)));
  if (armour) { dmg = { ...dmg, boxes: Math.max(0, dmg.boxes - (armour.reduce || 1)) }; out.armorUsed = armour.label || "Armour"; }
  if (!dmg.boxes) return { ...out, outcome: `hit, stopped by ${out.armorUsed}`, hit: true, damage: null };
  return { ...out, outcome: "hit", hit: true, damage: dmg, injury: applyHit(defender, dmg) };
}
