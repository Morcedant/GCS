// @ts-check
/**
 * Experimental rules for the Legend Dynamics Rules Lab.
 *
 * Each experiment says whether it changes the CORE (every setting) or one SETTING, and plugs into the core
 * attack pipeline only through its hook lists. Nothing here runs in normal play: the creator's roller and
 * sheet always use the published core, and the lab must be given a lab configuration explicitly.
 *
 * A setting can publish one of these rules for itself (pack.json "combatRules": { id: params }, as Pact of
 * Bones does). Then it is part of that setting's published rules, in every configuration, with the
 * published parameters, and it is no longer offered as an experiment there.
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
      return value ? [{ source: "attackQuality", label: `Attack quality (succeeded by ${ctx.margin})`, value, scope: p.scope || "experiment" }] : [];
    },
  },
  {
    id: "aim", scope: "core", label: "Aim action",
    summary: "Spend an action aiming at a target: a bonus to your next attack on it. Weapons may gain more after aiming (setting data).",
    params: { bonus: 1 },
    actions: ["aim"],
    /** @returns {Modifier[]} */
    attackModifiers: (/** @type {any} */ ctx, /** @type {any} */ p) => (ctx.aimed ? [{ source: "aim", label: "Aim", value: p.bonus, scope: p.scope || "experiment" }] : []),
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
    id: "oneDefense", scope: "core", label: "One defense a round",
    summary: "Dodge, Parry and Block share one defense a round; an Edge (Additional Defense) or trait adds more.",
    params: { perRound: 1 },
    flags: ["oneDefense"],
  },
  {
    id: "dodgeEveryAttack", scope: "core", label: "Dodge every attack",
    summary: "A target may try to Dodge every attack against it, not just once a round.",
    params: {},
    flags: ["dodgeEveryAttack"],
  },
  {
    id: "labProtection", scope: "setting", label: "Test protection",
    summary: "Protective gear from this setting's test configuration (a heavy coat, say), which the GM can put on anyone in the encounter.",
    params: {},
    /** The test configuration's protection items. */
    protection: (/** @type {any} */ lab) => (lab && lab.protection) || [],
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
export function newLabConfig(setting, lab, published) {
  const experiments = {};
  for (const x of available(setting, lab, published)) {
    const params = JSON.parse(JSON.stringify(x.params));
    if (x.id === "labWeaponTraits") params.weaponTraits = JSON.parse(JSON.stringify((lab && lab.weaponTraits) || {}));
    experiments[x.id] = { on: false, params };
  }
  return { id: "lab-" + Date.now().toString(36), label: (lab && lab.label) || "Test configuration", kind: "lab", setting, experiments };
}

/**
 * Experiments that apply to a setting: every core one, and setting ones the setting's test configuration offers,
 * less any the setting has published. @param {string} setting @param {any} [lab] @param {Record<string, any>} [published]
 */
export function available(setting, lab, published) {
  return EXPERIMENTS.filter((x) => (x.scope === "core" || ((lab && lab.experiments) || []).includes(x.id)) && !(published && x.id in published));
}

/**
 * Turn a configuration into what the core needs: hook lists, extra actions, the weapons in force, and a
 * record of exactly which experiments were active (with their scope and parameters) for the log.
 * The published configuration yields the setting's published rules (`published`, from pack.json "combatRules";
 * none for most settings) and the published weapons. `settingRules` lists those, `active` the experiments.
 * @param {any} config @param {Record<string, any>} weapons @param {any} [lab] @param {Record<string, any>} [published]
 */
export function buildRules(config, weapons, lab, published) {
  const rules = { config: config.id, label: config.label, kind: config.kind, hooks: { attackModifiers: [], dodgeModifiers: [] }, actions: new Set(), flags: new Set(),
    defenses: /** @type {Record<string, any>} */ ({}), params: /** @type {Record<string, any>} */ ({}), protection: /** @type {any[]} */ ([]), weapons, active: /** @type {any[]} */ ([]), settingRules: /** @type {any[]} */ ([]) };
  const apply = (/** @type {any} */ x, /** @type {any} */ p) => {
    if (x.attackModifiers) rules.hooks.attackModifiers.push((/** @type {any} */ ctx) => x.attackModifiers(ctx, p));
    if (x.dodgeModifiers) rules.hooks.dodgeModifiers.push((/** @type {any} */ ctx) => x.dodgeModifiers(ctx, p));
    for (const a of x.actions || []) rules.actions.add(a);
    for (const f of x.flags || []) rules.flags.add(f);
    if (x.defense) rules.defenses[x.defense] = p;
    rules.params[x.id] = p;
    if (x.protection) rules.protection = x.protection(lab);
    if (x.weapons) rules.weapons = x.weapons(rules.weapons, lab, p);
  };
  for (const [id, params] of Object.entries(published || {})) {
    const x = EXPERIMENTS.find((e) => e.id === id);
    if (!x) continue;
    const p = { ...x.params, ...(params || {}), scope: x.scope };
    apply(x, p);
    rules.settingRules.push({ id: x.id, label: x.label, params: p });
  }
  if (config.kind !== "lab") return rules;
  for (const x of available(config.setting, lab, published)) {
    const st = config.experiments[x.id];
    if (!st || !st.on) continue;
    const p = { ...x.params, ...(st.params || {}) };
    apply(x, p);
    rules.active.push({ id: x.id, scope: x.scope, label: x.label, params: p });
  }
  return rules;
}
