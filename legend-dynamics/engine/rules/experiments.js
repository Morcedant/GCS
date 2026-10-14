// @ts-check
/**
 * Experimental rules for the Legend Dynamics Rules Lab.
 *
 * Each experiment says whether it changes the CORE (every setting) or one SETTING, and plugs into the core
 * attack pipeline only through its hook lists. Nothing here runs in normal play: the creator's roller and
 * sheet always use the published core, and the lab must be given a lab configuration explicitly.
 */

/** @typedef {{ source: string, label: string, value: number, scope: string }} Modifier */

/** Published rules: frozen, nothing switchable. */
export const PUBLISHED = Object.freeze({ id: "published", label: "Published rules", kind: "published", experiments: Object.freeze({}) });

/** Margin bands for attack quality: from this margin up, this Dodge modifier. @param {number} margin @param {{ from: number, mod: number }[]} bands */
export function bandFor(margin, bands) {
  let mod = 0;
  for (const b of [...bands].sort((x, y) => x.from - y.from)) if (margin >= b.from) mod = b.mod;
  return mod;
}

export const EXPERIMENTS = [
  {
    id: "attackQualityDodge", scope: "core", label: "Attack quality modifies defense",
    summary: "When an attack succeeds, its margin makes it harder to Dodge (or Parry, or Block).",
    params: { bands: [{ from: 0, mod: 0 }, { from: 3, mod: -1 }, { from: 5, mod: -2 }, { from: 7, mod: -3 }] },
    /** @returns {Modifier[]} */
    dodgeModifiers: (/** @type {any} */ ctx, /** @type {any} */ p) => {
      const value = bandFor(ctx.margin, p.bands);
      return value ? [{ source: "attackQuality", label: `Attack quality (succeeded by ${ctx.margin})`, value, scope: "experiment" }] : [];
    },
  },
  {
    id: "aim", scope: "core", label: "Aim action",
    summary: "Spend an action aiming at a target: a bonus to your next attack on it. Weapons may gain more after aiming (setting data).",
    params: { bonus: 1 },
    actions: ["aim"],
    /** @returns {Modifier[]} */
    attackModifiers: (/** @type {any} */ ctx, /** @type {any} */ p) => (ctx.aimed ? [{ source: "aim", label: "Aim", value: p.bonus, scope: "experiment" }] : []),
  },
  {
    id: "parry", scope: "core", label: "Parry",
    summary: "Against a melee or unarmed attack, defend with your weapon skill (or Brawling against fists) instead of Dodge. Every attack, with a penalty for each extra parry in a round.",
    params: { mod: -3, repeatPenalty: -2 },
    defense: "parry",
  },
  {
    id: "block", scope: "core", label: "Block",
    summary: "With a shield, defend against melee attacks and missiles (not bullets) with Melee, plus the shield's bonus. Once a round.",
    params: { mod: -2 },
    defense: "block",
  },
  {
    id: "dodgeEveryAttack", scope: "core", label: "Dodge every attack",
    summary: "A target may try to Dodge every attack against it, not just once a round.",
    params: {},
    flags: ["dodgeEveryAttack"],
  },
  {
    id: "labWeaponTraits", scope: "setting", label: "Test weapon traits",
    summary: "Apply the accuracy traits in this setting's test configuration (by range, ammunition, fire mode, or after aiming).",
    params: { weaponTraits: {} }, // filled from the setting's test configuration; edited in the lab and logged with every attack
    /** Overlays the configured traits onto the setting's weapons (copies; the published data is never touched). */
    weapons: (/** @type {Record<string, any>} */ weapons, /** @type {any} */ lab, /** @type {any} */ p) => {
      const out = { ...weapons };
      for (const [id, traits] of Object.entries((p && p.weaponTraits) || (lab && lab.weaponTraits) || {})) if (out[id]) out[id] = { ...out[id], traits: [...(out[id].traits || []), ...traits] };
      return out;
    },
  },
];

/** A fresh lab configuration for a setting, every experiment off, parameters at their defaults. @param {string} setting @param {any} [lab] */
export function newLabConfig(setting, lab) {
  const experiments = {};
  for (const x of available(setting, lab)) {
    const params = JSON.parse(JSON.stringify(x.params));
    if (x.id === "labWeaponTraits") params.weaponTraits = JSON.parse(JSON.stringify((lab && lab.weaponTraits) || {}));
    experiments[x.id] = { on: false, params };
  }
  return { id: "lab-" + Date.now().toString(36), label: (lab && lab.label) || "Test configuration", kind: "lab", setting, experiments };
}

/** Experiments that apply to a setting: every core one, and setting ones the setting's test configuration offers. @param {string} setting @param {any} [lab] */
export function available(setting, lab) {
  return EXPERIMENTS.filter((x) => x.scope === "core" || ((lab && lab.experiments) || []).includes(x.id));
}

/**
 * Turn a configuration into what the core needs: hook lists, extra actions, the weapons in force, and a
 * record of exactly which experiments were active (with their scope and parameters) for the log.
 * The published configuration always yields empty hooks and the published weapons.
 * @param {any} config @param {Record<string, any>} weapons @param {any} [lab]
 */
export function buildRules(config, weapons, lab) {
  const rules = { config: config.id, label: config.label, kind: config.kind, hooks: { attackModifiers: [], dodgeModifiers: [] }, actions: new Set(), flags: new Set(),
    defenses: /** @type {Record<string, any>} */ ({}), weapons, active: [] };
  if (config.kind !== "lab") return rules;
  for (const x of available(config.setting, lab)) {
    const st = config.experiments[x.id];
    if (!st || !st.on) continue;
    const p = { ...x.params, ...(st.params || {}) };
    if (x.attackModifiers) rules.hooks.attackModifiers.push((/** @type {any} */ ctx) => x.attackModifiers(ctx, p));
    if (x.dodgeModifiers) rules.hooks.dodgeModifiers.push((/** @type {any} */ ctx) => x.dodgeModifiers(ctx, p));
    for (const a of x.actions || []) rules.actions.add(a);
    for (const f of x.flags || []) rules.flags.add(f);
    if (x.defense) rules.defenses[x.defense] = p;
    if (x.weapons) rules.weapons = x.weapons(rules.weapons, lab, p);
    rules.active.push({ id: x.id, scope: x.scope, label: x.label, params: p });
  }
  return rules;
}
