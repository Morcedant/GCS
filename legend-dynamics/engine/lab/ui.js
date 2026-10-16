// @ts-check
/**
 * Rules Lab: the Encounter panel in the GM tab.
 *
 * A thin layer over encounter.js and stats.js: it reads the form, calls the encounter functions, and draws
 * the results. Rules live in the core (LD) and the experiments (LDX); state changes live in the encounter
 * module; this file only connects them to the page it's mounted in (characters, clocks, storage).
 */

/**
 * @param {{
 *   PACK: any, T: any, LD: any, LDX: any, E: any, S: any, LAB: any, store: any, esc: (s: any) => string, signed: (n: number) => string,
 *   saveText: (text: string, name: string, say: (m: string, err?: boolean) => void) => void,
 *   crew: () => any[], saveCrew: () => void, renderCrew: () => void, calc: (c: any) => { skills: Record<string, number>, dodge: number, agility: number, defense?: number },
 *   clocks: { list: () => any[], set: (id: string, filled: number) => void, add: (name: string, size: number, kind: string) => void, listen: (fn: (c: any, from: number, to: number) => void) => void },
 *   injuryNames: string[], gritty?: () => boolean
 * }} api
 * With no test configuration (api.LAB null), the panel is the production Encounter manager: published rules only,
 * no experiments, and the setting's gritty combat option applied when the campaign has it switched on.
 */
export function mountLab(api) {
  const { PACK, T, LD, LDX, E, S, store, esc, signed } = api;
  const PROD = !api.LAB; // the production Encounter manager: published rules only
  const LAB = api.LAB || { label: "", experiments: ["grievousWounds"], ammo: {}, weaponTraits: {}, grievous: PACK.gritty || null };
  const $ = (/** @type {string} */ id) => /** @type {any} */ (document.getElementById(id));
  const KEY = PACK.id + (PROD ? ".encounter.v1" : ".lab.v1");
  const WEAPONS = Object.fromEntries(PACK.arms.filter((/** @type {any} */ a) => !a.hazard).map((/** @type {any} */ a) => [a.id, a]));
  const MODES = PACK.weapons.modes || []; // [id, name, rounds, only these ammo types or null, roll modifier]
  const PROT = PACK.protection || []; // published protective gear (a shield, a mail shirt) as data
  const protTraits = (/** @type {string[]} */ ids) => PROT.filter((/** @type {any} */ x) => ids.includes(x.id)).flatMap((/** @type {any} */ x) => x.traits.map((/** @type {any} */ t) => ({ ...t })));
  const PTRACK = PACK.personalTrack || null; // a setting's personal price track (Corruption, Strain), kept on the character
  const BAND_NAMES = { melee: "In reach", close: "Close", short: "Short", medium: "Medium", long: "Long", extreme: "Extreme" };

  /** @type {{ mode: "published" | "lab", cfg: any, enc: any, history: any[], compare: any }} */
  let lab = store.get(KEY, null) || { mode: "published", cfg: null, enc: null, history: [], compare: null };
  if (PROD) lab.mode = "published";
  // The published combat rules: the core's (engine/combat.json) with the setting's overrides. In production, the
  // setting's gritty combat option joins them while the campaign has it switched on.
  const PUB0 = PACK.combatRules || null;
  const pubRules = () => (PROD && PACK.gritty && api.gritty && api.gritty() ? { ...(PUB0 || {}), grievousWounds: {} } : PUB0);
  const PUB = PUB0;
  const fresh = LDX.newLabConfig(PACK.id, LAB, PUB);
  if (!lab.cfg) lab.cfg = fresh;
  for (const [id, st] of Object.entries(fresh.experiments)) {
    if (!lab.cfg.experiments[id]) lab.cfg.experiments[id] = st; // new experiments appear switched off
    else for (const [k, v] of Object.entries(st.params)) if (!(k in lab.cfg.experiments[id].params)) lab.cfg.experiments[id].params[k] = v; // and new settings at their defaults
  }
  lab.cfg.label = LAB.label || lab.cfg.label;
  const save = () => store.set(KEY, lab);
  if (PROD) {
    for (const id of ["lab-rules", "lab-banner", "lab-compare"]) $(id).hidden = true;
    $("lab-seed").closest(".field").hidden = true;
    $("lab-rerun-cfg").closest(".lab-row").hidden = true;
    $("lab-sub").hidden = true;
    $("lab-intro").textContent = "Run a fight with every roll shown: turn order, attacks, defenses, damage and the log. Hits land on the character cards and the battle map too.";
    $("lab-h-sum").textContent = "Fight summary";
    $("lab-export").textContent = "Save the fight (JSON)";
  }
  const HISTORY = PROD ? "this browser's history" : "this browser's lab history";
  const say = (/** @type {string} */ m, /** @type {boolean} */ err = false) => { $("lab-msg").textContent = m; $("lab-msg").className = "toast" + (err ? " err" : ""); };

  const rulesOf = (/** @type {any} */ cfg) => ({ ...LDX.buildRules(cfg && cfg.kind === "lab" ? cfg : LDX.PUBLISHED, WEAPONS, LAB, pubRules()), jamOn18: !!PACK.weapons.jamOn18 });
  const enc = () => lab.enc;
  // A running encounter keeps the rules it started with; otherwise the configuration chosen for the next one.
  const rules = () => rulesOf(enc() && enc().status !== "ended" ? enc().config : lab.mode === "lab" ? lab.cfg : LDX.PUBLISHED);
  const settingLine = (/** @type {any} */ r) => (r.settingRules.length ? ` (with the published combat rules: ${r.settingRules.map((/** @type {any} */ a) => a.label).join(", ")})` : "");
  const rulesLine = (/** @type {any} */ r) => r.kind === "lab" ? `${r.label}${r.active.length ? ": " + r.active.map((/** @type {any} */ a) => `${a.label} (${a.scope.toUpperCase()})`).join(", ") : ": no experiments on"}${settingLine(r)}` : "Published rules" + settingLine(r);

  // ---- rules configuration ----
  function renderRules() {
    document.querySelectorAll('input[name="lab-mode"]').forEach((/** @type {any} */ r) => { r.checked = r.value === lab.mode; });
    $("lab-cfg-label").textContent = lab.cfg.label;
    const r = rules();
    const banner = $("lab-banner");
    banner.className = "lab-banner " + (r.kind === "lab" ? "lab" : "published");
    banner.textContent = r.kind === "lab" ? `Rules: LAB · ${r.active.length} experiment${r.active.length === 1 ? "" : "s"} on` : "Rules: Published";
    banner.title = rulesLine(r);
    $("lab-cfg-note").textContent = enc() && enc().status !== "ended"
      ? `This encounter runs under: ${rulesLine(r)}. Changes here apply to the next encounter.`
      : lab.mode === "lab" ? "New encounters use the test configuration." : "New encounters use the published rules. Choose the test configuration to switch experiments on.";
    const on = lab.mode === "lab";
    const offered = LDX.available(PACK.id, LAB, PUB);
    $("lab-rules-hint").textContent = offered.length ? `${on ? "Testing" : "To test"}: ${offered.map((/** @type {any} */ x) => x.label).join(", ")}` : "";
    const pubRows = rules().settingRules.map((/** @type {any} */ x) => `<div class="exp"><label><input type="checkbox" checked disabled> <b>${esc(x.label)}</b></label>
        <span class="lab-scope setting">PUBLISHED</span><div class="small muted">Part of the published combat rules${(PACK.coreCombat || []).includes(x.id) ? " (core)" : ` (${esc(T.title)})`}, in every configuration.</div></div>`).join("");
    $("lab-exps").innerHTML = pubRows + LDX.available(PACK.id, LAB, PUB).map((/** @type {any} */ x) => {
      const st = lab.cfg.experiments[x.id];
      return `<div class="exp ${st.on && on ? "on" : ""}"><label><input type="checkbox" data-exp="${x.id}" ${st.on ? "checked" : ""} ${on ? "" : "disabled"}> <b>${esc(x.label)}</b></label>
        <span class="lab-scope ${x.scope}">${x.scope.toUpperCase()}</span><div class="small muted">${esc(x.summary)}</div>${on ? paramsEditor(x, st.params) : ""}</div>`;
    }).join("");
  }
  /** @param {any} x @param {any} p */
  function paramsEditor(x, p) {
    if (x.id === "attackQualityDodge") {
      return `<div class="small" style="margin-top:6px">${p.bands.map((/** @type {any} */ b, /** @type {number} */ i) => `<div class="lab-row">Succeeded by <input class="lab-mini" type="number" min="0" max="20" data-band="${i}" data-k="from" value="${b.from}" aria-label="From margin"> or more: Dodge
        <input class="lab-mini" type="number" min="-10" max="5" data-band="${i}" data-k="mod" value="${b.mod}" aria-label="Dodge modifier"> <button type="button" class="linkish danger" data-band-rm="${i}">Remove</button></div>`).join("")}
        <button type="button" class="linkish" data-band-add>Add a band</button></div>`;
    }
    if (x.id === "grievousWounds") return `<div class="small" style="margin-top:6px"><div class="lab-row">A hit of <input class="lab-mini" type="number" min="1" max="4" data-gw="minBoxes" value="${p.minBoxes}" aria-label="Minimum boxes"> or more boxes is grievous when it</div>
      <div class="lab-row">succeeds by <input class="lab-mini" type="number" min="1" max="20" data-gw="margin" value="${p.margin}" aria-label="Margin"> or more,</div>
      <div class="lab-row"><label><input type="checkbox" data-gw="natural" ${p.natural ? "checked" : ""}> rolls a natural 3–4,</label> <label><input type="checkbox" data-gw="onDying" ${p.onDying ? "checked" : ""}> or leaves the target Dying.</label></div>
      <div class="lab-row"><label><input type="checkbox" data-gw="limbTrade" ${p.limbTrade ? "checked" : ""}> A character left Dying or killed may lose a limb, or its use, instead (a complication, once a fight).</label></div>
      <div class="muted">Characters roll 3d6 on the table; opponents are taken out. Set the margin to 20 to leave clean hits out.</div></div>`;
    if (x.id === "aim") return `<div class="small lab-row" style="margin-top:6px">Aim bonus <input class="lab-mini" type="number" min="0" max="6" data-aim value="${p.bonus}" aria-label="Aim bonus"></div>`;
    if (x.id === "labWeaponTraits") {
      const rows = Object.entries(p.weaponTraits || {}).flatMap(([w, ts]) => /** @type {any[]} */ (ts).map((t, i) => ({ w, i, t })));
      return `<div class="small" style="margin-top:6px">${rows.length ? rows.map(({ w, i, t }) => `<div class="lab-row">${esc(WEAPONS[w] ? WEAPONS[w].name : w)}: <b>${signed(t.value)}</b> ${esc(t.label || "")}
          <span class="muted">${t.bands && t.bands.length ? "at " + t.bands.join(", ") : "any range"}${t.requires && t.requires.aimed ? ", after aiming" : ""}${t.requires && t.requires.ammo ? ", with " + esc(t.requires.ammo) : ""}${t.requires && t.requires.mode ? ", " + esc(t.requires.mode) : ""}</span>
          <button type="button" class="linkish danger" data-trait-rm="${w}|${i}">Remove</button></div>`).join("") : `<p class="muted">No traits yet: none have published values.</p>`}
        <div class="lab-row" style="margin-top:6px">
          <select data-tr="w" aria-label="Weapon">${Object.values(WEAPONS).map((/** @type {any} */ a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select>
          <input data-tr="label" placeholder="Label, e.g. Scattershot" aria-label="Trait label" style="width:12em">
          <input data-tr="value" type="number" class="lab-mini" value="1" min="-6" max="6" aria-label="Accuracy modifier">
          <select data-tr="band" aria-label="At range"><option value="">any range</option>${LD.BANDS.filter((/** @type {string} */ b) => b !== "melee").map((/** @type {string} */ b) => `<option value="${b}">${BAND_NAMES[b]}</option>`).join("")}</select>
          <label><input type="checkbox" data-tr="aimed"> after aiming</label>
          <input data-tr="ammo" placeholder="ammunition (optional)" aria-label="Only with this ammunition" style="width:10em">
          <button type="button" class="linkish" data-tr-add>Add trait</button></div></div>`;
    }
    return "";
  }
  document.addEventListener("change", (e) => {
    const t = /** @type {any} */ (e.target);
    if (!t.closest || !t.closest("#lab-rules")) return;
    if (t.name === "lab-mode") lab.mode = t.value;
    else if (t.dataset.exp) lab.cfg.experiments[t.dataset.exp].on = t.checked;
    else if (t.dataset.band !== undefined) lab.cfg.experiments.attackQualityDodge.params.bands[+t.dataset.band][t.dataset.k] = +t.value;
    else if ("aim" in t.dataset) lab.cfg.experiments.aim.params.bonus = +t.value;
    else if (t.dataset.gw) { const gp = lab.cfg.experiments.grievousWounds.params; gp[t.dataset.gw] = t.type === "checkbox" ? t.checked : +t.value; }
    else return;
    save(); renderRules(); renderAll();
  });
  $("lab-rules").addEventListener("click", (/** @type {any} */ e) => {
    const t = e.target, P = lab.cfg.experiments;
    if ("bandAdd" in t.dataset) P.attackQualityDodge.params.bands.push({ from: 9, mod: -4 });
    else if (t.dataset.bandRm !== undefined) P.attackQualityDodge.params.bands.splice(+t.dataset.bandRm, 1);
    else if (t.dataset.traitRm) { const [w, i] = t.dataset.traitRm.split("|"); P.labWeaponTraits.params.weaponTraits[w].splice(+i, 1); if (!P.labWeaponTraits.params.weaponTraits[w].length) delete P.labWeaponTraits.params.weaponTraits[w]; }
    else if ("trAdd" in t.dataset) {
      const box = t.closest(".lab-row"), v = (/** @type {string} */ k) => box.querySelector(`[data-tr="${k}"]`);
      const trait = { type: "accuracy", value: +v("value").value, label: v("label").value.trim() || "Accuracy", bands: v("band").value ? [v("band").value] : [], requires: {} };
      if (v("aimed").checked) trait.requires.aimed = true;
      if (v("ammo").value.trim()) trait.requires.ammo = v("ammo").value.trim();
      if (!trait.value) return;
      (P.labWeaponTraits.params.weaponTraits[v("w").value] ||= []).push(trait);
    } else return;
    save(); renderRules();
  });

  // ---- encounter setup ----
  /** A character from the GM's cards, as a participant. @param {any} c */
  function fromCharacter(c) {
    const k = api.calc(c), gun = c.play && c.play.gun;
    const weapons = ["fists", ...Object.values(WEAPONS).filter((/** @type {any} */ a) => a.id !== "fists" && (c.equipment[a.id] || (a.equip || []).some((/** @type {string} */ k) => c.equipment[k]) || (gun && a.ammo && a.ammo === gun.type) || (a.cantrip && (c.spells || []).includes(a.cantrip)))).map((/** @type {any} */ a) => a.id)];
    const ammo = gun && PACK.weapons.items[gun.type] ? { [gun.type]: gun.rounds } : {};
    return { kind: "pc", ref: c.id, name: c.name || "Unnamed", side: "party", agility: k.agility, dodge: k.dodge, skills: k.skills, weapons: [...new Set(weapons)],
      traits: [...protTraits(PROT.filter((/** @type {any} */ x) => c.equipment[x.equipment]).map((/** @type {any} */ x) => x.id)),
        ...(PUB && PUB.oneDefense && PUB.oneDefense.edge && (c.edges || {})[PUB.oneDefense.edge] ? [{ type: "extraDefense", value: c.edges[PUB.oneDefense.edge], label: "Additional Defense" }] : []),
        ...((c.edges || {}).survivor || (c.edgesBought || {}).survivor ? [{ type: "shrugTelling", oncePerFight: true, label: "Hard to put down" }] : []),
        ...(k.defense ? [{ type: "defenseClass", value: k.defense, label: `Defense ${["", "I", "II", "III", "IV", "V", "VI"][k.defense]}` }] : [])],
      gear: PROT.filter((/** @type {any} */ x) => c.equipment[x.equipment]).map((/** @type {any} */ x) => x.id),
      boxes: 3, injury: c.play.injury || 0, dying: !!c.play.dying, points: c.play.duty || 0, ammo, tracks: PTRACK ? { [PTRACK.name]: c.play.ptrack || 0 } : {} };
  }
  /** A threat from the setting's data. @param {any} t @param {string} name */
  function fromThreat(t, name) {
    const skills = Object.fromEntries(t.attacks.map((/** @type {any} */ a) => [a.skill, a.target]));
    const ammo = Object.fromEntries(t.weapons.map((/** @type {string} */ w) => WEAPONS[w] && WEAPONS[w].ammo).filter(Boolean).map((/** @type {string} */ a) => [a, PACK.weapons.items[a][1]]));
    return { kind: "npc", name, side: "foe", agility: t.dodge !== null ? t.dodge + 1 : 10, agilityEstimated: true, dodge: t.dodge, skills, weapons: t.weapons,
      boxes: t.minor ? 1 : t.boxes || 3, minor: !!t.minor, ammo, note: `${t.trait}: ${t.traitText}`,
      traits: (t.traits || []).map((/** @type {any} */ x) => (x.toggle ? { ...x, on: true } : { ...x })) };
  }
  function ensureEnc() {
    if (enc() && enc().status !== "ended") return enc();
    lab.enc = E.newEncounter({ name: $("lab-name").value.trim(), setting: PACK.id, baseline: LD.CORE_BASELINE,
      config: lab.mode === "lab" ? lab.cfg : LDX.PUBLISHED, seed: $("lab-seed").value.trim() || null });
    lab.compare = null;
    return lab.enc;
  }
  $("lab-new").onclick = () => {
    if (enc() && enc().status === "combat" && !confirm(`Start a new encounter? The current one is kept in ${HISTORY}.`)) return;
    if (enc() && enc().status !== "setup") lab.history = [enc(), ...lab.history].slice(0, 20);
    lab.enc = null; ensureEnc(); save(); renderAll(); say("New encounter. Add characters and opponents.");
  };
  $("lab-add-pc").onchange = (/** @type {any} */ e) => {
    const c = api.crew().find((x) => x.id === e.target.value); e.target.value = "";
    if (!c) return;
    const en = ensureEnc();
    if (en.participants.some((/** @type {any} */ p) => p.ref === c.id)) { say(`${c.name} is already in the encounter.`, true); return; }
    E.addParticipant(en, fromCharacter(c)); save(); renderAll();
  };
  $("lab-add-threat").onchange = (/** @type {any} */ e) => {
    const t = PACK.threats.find((/** @type {any} */ x) => x.id === e.target.value); e.target.value = "";
    if (!t) return;
    const en = ensureEnc(), n = Math.max(1, Math.min(12, +$("lab-add-n").value || 1));
    const have = en.participants.filter((/** @type {any} */ p) => p.name.startsWith(t.name)).length;
    for (let i = 0; i < n; i++) E.addParticipant(en, fromThreat(t, n > 1 || have ? `${t.name} ${have + i + 1}` : t.name));
    save(); renderAll();
  };
  $("lab-ah-add").onclick = () => {
    const name = $("lab-ah-name").value.trim(); if (!name) { $("lab-ah-name").focus(); return; }
    const w = WEAPONS[$("lab-ah-weapon").value], minor = $("lab-ah-minor").checked;
    E.addParticipant(ensureEnc(), { kind: "npc", name, side: "foe", agility: +$("lab-ah-agi").value, dodge: +$("lab-ah-dodge").value, skills: { [w.skill]: +$("lab-ah-skill").value },
      weapons: [w.id], boxes: minor ? 1 : +$("lab-ah-boxes").value, minor, ammo: w.ammo ? { [w.ammo]: PACK.weapons.items[w.ammo][1] } : {},
      traits: protTraits([...document.querySelectorAll("[data-ahprot]:checked")].map((/** @type {any} */ x) => x.dataset.ahprot)),
      gear: [...document.querySelectorAll("[data-ahprot]:checked")].map((/** @type {any} */ x) => x.dataset.ahprot) });
    $("lab-ah-name").value = ""; save(); renderAll();
  };

  // A character card edited above (injury, points) wins over the encounter's copy; the change is logged.
  function pullFromCards() {
    const en = enc(); if (!en || en.status === "ended") return;
    for (const p of en.participants) {
      if (p.kind !== "pc" || !p.ref) continue;
      const c = api.crew().find((x) => x.id === p.ref); if (!c) continue;
      if ((c.play.injury || 0) !== p.injury || !!c.play.dying !== p.dying) E.override(en, rules(), LD, "injury", { pid: p.pid, injury: c.play.injury || 0, dying: !!c.play.dying, dead: p.dead, reason: "changed on the character card" });
      if ((c.play.duty || 0) !== p.points) E.override(en, rules(), LD, "points", { pid: p.pid, points: c.play.duty || 0, reason: "changed on the character card" });
      if (PTRACK && (c.play.ptrack || 0) !== ((p.tracks || {})[PTRACK.name] || 0)) E.override(en, rules(), LD, "track", { pid: p.pid, track: PTRACK.name, value: c.play.ptrack || 0, reason: "changed on the character card" });
    }
  }
  // And the encounter writes its results back to the cards.
  function pushToCards() {
    const en = enc(); if (!en) return;
    let changed = false;
    for (const p of en.participants) {
      if (p.kind !== "pc" || !p.ref) continue;
      const c = api.crew().find((x) => x.id === p.ref); if (!c) continue;
      c.play.injury = Math.min(3, p.injury); c.play.dying = p.dying; c.play.duty = p.points;
      if (c.play.gun && p.ammo[c.play.gun.type] !== undefined) c.play.gun.rounds = p.ammo[c.play.gun.type];
      if (PTRACK && p.tracks) c.play.ptrack = Math.min(PTRACK.boxes, p.tracks[PTRACK.name] || 0);
      // Lasting wounds from gritty combat go on the card's list once each.
      if (Array.isArray(c.play.lasting)) (p.lasting || []).forEach((/** @type {any} */ w, /** @type {number} */ i) => {
        const key = `enc-${en.id}-${p.pid}-${w.about ?? i}`;
        if (!c.play.lasting.some((/** @type {any} */ x) => x.key === key)) c.play.lasting.push({ id: w.id || "", name: w.name, text: w.text || "", heal: w.heal || "", complication: !!w.complication, date: new Date().toISOString().slice(0, 10), key });
      });
      changed = true;
    }
    if (changed) { api.saveCrew(); api.renderCrew(); }
  }

  // ---- people ----
  function renderPeople() {
    const en = enc(), crew = api.crew();
    $("lab-add-pc").innerHTML = `<option value="">${crew.length ? "Choose…" : "Add characters to the GM view first"}</option>` + crew.map((c) => `<option value="${esc(c.id)}">${esc(c.name || "Unnamed")}</option>`).join("");
    // Only threats that fight (a screening post or a ghost has nothing to attack with) are offered.
    $("lab-add-threat").innerHTML = `<option value="">Choose…</option>` + PACK.threats.filter((/** @type {any} */ t) => (t.weapons || []).length).map((/** @type {any} */ t) => `<option value="${t.id}">${esc(t.label)}</option>`).join("");
    $("lab-ah-prot").innerHTML = PROT.map((/** @type {any} */ x) => `<label class="small"><input type="checkbox" data-ahprot="${x.id}"> ${esc(x.name)}</label>`).join(" ");
    $("lab-ah-weapon").innerHTML = Object.values(WEAPONS).map((/** @type {any} */ a) => `<option value="${a.id}">${esc(a.name)} (${esc(a.skill)})</option>`).join("");
    if (!en) { $("lab-people").innerHTML = `<p class="small muted">No encounter yet.</p>`; return; }
    if (document.activeElement !== $("lab-name")) $("lab-name").value = en.name;
    if (document.activeElement !== $("lab-seed")) $("lab-seed").value = en.seed ?? "";
    const act = E.active(en), list = en.status === "setup" ? en.participants : en.order.map((/** @type {string} */ pid) => E.find(en, pid));
    const gearList = [...PROT, ...(rules().protection || [])]; // published gear, plus test gear when its experiment is on
    // Enchantments (a setting's Significant enchantments as data): on a weapon the participant carries, or one that turns a hit.
    const EN = PACK.enchantments || null;
    const enchFor = (/** @type {any} */ p) => !EN ? [] : [
      ...(EN.ward ? [EN.ward] : []),
      ...p.weapons.filter((/** @type {string} */ w) => WEAPONS[w] && w !== "fists" && !(p.gear || []).some((/** @type {string} */ g) => g.startsWith(`ench-${w}-`)))
        .flatMap((/** @type {string} */ w) => EN.weapon.map((/** @type {any} */ x) => ({ id: `ench-${w}-${x.id}`, name: `Enchanted ${WEAPONS[w].name}: ${x.name}`,
          traits: [{ ...x.trait, weapon: w, label: `Enchanted ${WEAPONS[w].name}` }] })))];
    $("lab-people").innerHTML = list.length ? list.map((/** @type {any} */ p) => {
      const out = E.isOut(p), inj = Math.min(p.injury, 3);
      return `<div class="lab-p ${act && act.pid === p.pid ? "active" : ""} ${out ? "out" : ""}">
        <span class="lab-side">${p.side === "party" ? "Party" : "Foe"}</span>
        <span class="who"><b>${esc(p.name)}${p.minor ? " <span class='small muted'>(minor)</span>" : ""}</b>
          <span class="small muted">Dodge ${p.dodge ?? "—"} · Agility ${p.agilityEstimated ? "~" : ""}${p.agility}${Object.keys(p.skills).length ? " · " + Object.entries(p.skills).filter(([k]) => p.kind === "npc" || p.weapons.some((/** @type {string} */ w) => WEAPONS[w] && WEAPONS[w].skill === k)).map(([k, v]) => `${k} ${v}`).join(", ") : ""}</span></span>
        <span class="btn-row">${en.status === "combat" ? `<button class="linkish" data-up="${p.pid}" aria-label="Move ${esc(p.name)} up the turn order">▲</button><button class="linkish" data-down="${p.pid}" aria-label="Move ${esc(p.name)} down">▼</button>` : ""}
          <button class="linkish danger" data-rm="${p.pid}" aria-label="Remove ${esc(p.name)}">×</button></span>
        <span class="meta small"><span class="boxes">${Array.from({ length: p.boxes }, (_, i) => `<button class="box ${i < p.injury ? "on" : ""}" data-inj="${p.pid}" data-i="${i + 1}" aria-label="${esc(p.name)} box ${i + 1}"></button>`).join("")}</span>
          ${p.dead ? "<b style='color:var(--bad)'>Dead</b>" : p.dying ? "<b style='color:var(--bad)'>Dying</b>" : p.takenOut ? "<b style='color:var(--bad)'>Taken out</b>" : out ? "<b>Down</b>" : esc(api.injuryNames[inj] || "")}
          ${p.kind === "pc" ? ` · ${esc(T.point)} <button class="linkish" data-pt="${p.pid}" data-d="-1" aria-label="${esc(p.name)}: one ${esc(T.point)} point fewer">−</button><b>${p.points}</b><button class="linkish" data-pt="${p.pid}" data-d="1" aria-label="${esc(p.name)}: one ${esc(T.point)} point more">+</button>` : ""}
          ${Object.entries(p.ammo).map(([k, v]) => ` · ${esc(PACK.weapons.items[k] ? PACK.weapons.items[k][0] : k)} ${v}/${PACK.weapons.items[k] ? PACK.weapons.items[k][1] : "?"}`).join("")}
          ${Object.entries(p.tracks || {}).filter(([, v]) => v).map(([k, v]) => ` · <b>${esc(k)} ${v}</b>`).join("")}
          ${(p.traits || []).map((/** @type {any} */ t, /** @type {number} */ i) => t.type === "shield" ? "" : t.type === "armor" ? ` · ${esc(t.label)}${t.used ? " (used)" : ""}` : t.toggle ? ` · <button class="linkish" data-trait="${p.pid}" data-i="${i}" title="Switch on or off">${esc(t.label)}: ${t.on === false ? "off" : "on"}</button>` : ` · ${esc(t.label || t.type)}`).join("")}
          ${(p.lasting || []).map((/** @type {any} */ w) => ` · <b style='color:var(--bad)'>${esc(w.name)}</b>`).join("")}
          ${p.aim ? ` · <b>aiming at ${esc((E.find(en, p.aim.target) || {}).name || "?")}</b>` : ""}
          ${p.conditions.map((/** @type {string} */ c) => ` · <button class="linkish" data-cond-rm="${p.pid}" data-c="${esc(c)}" title="Remove">${esc(c)} ×</button>`).join("")}
          ${(() => { const can = [...gearList, ...enchFor(p)].filter((/** @type {any} */ g) => !(p.gear || []).includes(g.id)); return can.length && en.status !== "ended" ? ` · <select class="lab-mini" style="width:auto" data-gear="${p.pid}" aria-label="Give ${esc(p.name)} protective gear"><option value="">+ Gear</option>${can.map((/** @type {any} */ g) => `<option value="${g.id}" title="${esc(g.text || "")}">${esc(g.name)}</option>`).join("")}</select>` : ""; })()}
          ${p.note ? `<br><span class="muted">${esc(p.note)}</span>` : ""}</span></div>`;
    }).join("") : `<p class="small muted">Add characters and opponents.</p>`;
    $("lab-start").hidden = en.status !== "setup";
    $("lab-next").hidden = $("lab-end").hidden = en.status !== "combat";
    $("lab-round").textContent = en.status === "combat" ? `Round ${en.round} · ${act ? act.name + "'s turn" : ""}` : en.status === "ended" ? "Encounter ended." : `${en.participants.length} in the encounter`;
  }
  $("lab-people").addEventListener("click", (/** @type {any} */ e) => {
    const t = e.target.closest("button"); const en = enc(); if (!t || !en) return;
    const d = t.dataset;
    if (d.rm) E.removeParticipant(en, d.rm);
    else if (d.up || d.down) E.moveInOrder(en, d.up || d.down, d.up ? -1 : 1);
    else if (d.inj) { const p = E.find(en, d.inj), i = +d.i; E.override(en, rules(), LD, "injury", { pid: p.pid, injury: p.injury === i ? i - 1 : i, dying: false, dead: false, reason: "GM set injury" }); }
    else if (d.pt) { const p = E.find(en, d.pt); E.override(en, rules(), LD, "points", { pid: p.pid, points: p.points + +d.d, reason: "GM adjusted points" }); }
    else if (d.condRm) E.setCondition(en, d.condRm, d.c, false);
    else if (d.trait) { const p = E.find(en, d.trait); E.setTrait(en, d.trait, +d.i, p.traits[+d.i].on === false); }
    else return;
    pushToCards(); save(); renderAll();
  });
  $("lab-people").addEventListener("change", (/** @type {any} */ e) => {
    const sel = e.target.closest("[data-gear]"), en = enc(); if (!sel || !en || !sel.value) return;
    const p = E.find(en, sel.dataset.gear), EN = PACK.enchantments || null;
    const ench = !EN ? [] : [...(EN.ward ? [EN.ward] : []), ...p.weapons.filter((/** @type {string} */ w) => WEAPONS[w]).flatMap((/** @type {string} */ w) => EN.weapon.map((/** @type {any} */ x) => ({ id: `ench-${w}-${x.id}`, name: `Enchanted ${WEAPONS[w].name}: ${x.name}`, traits: [{ ...x.trait, weapon: w, label: `Enchanted ${WEAPONS[w].name}` }] })))];
    const item = [...PROT, ...(rules().protection || []), ...ench].find((/** @type {any} */ g) => g.id === sel.value);
    const res = E.addGear(en, sel.dataset.gear, item);
    if (res.error) { say(res.error, true); return; }
    save(); renderAll();
  });
  $("lab-start").onclick = () => {
    const en = enc(); if (!en || en.participants.length < 2) { say("Add at least two participants.", true); return; }
    en.name = $("lab-name").value.trim() || en.name;
    E.startCombat(en, rules()); save(); renderAll(); say(`Combat started under: ${rulesLine(rules())}.`);
  };
  $("lab-next").onclick = () => { E.nextTurn(enc()); save(); renderAll(); };
  $("lab-end").onclick = () => {
    const en = enc(); E.endEncounter(en, S.summarize(en));
    lab.history = [en, ...lab.history.filter((/** @type {any} */ h) => h.id !== en.id)].slice(0, 20);
    pushToCards(); save(); renderAll(); say(`Encounter ended. Its summary is below, and it's kept in ${HISTORY}.`);
  };

  // ---- actions ----
  const pickActor = () => { const en = enc(); return en ? E.find(en, $("lab-actor").value) : null; };
  function renderAction() {
    const en = enc(), wrap = $("lab-act-wrap");
    wrap.hidden = !en || en.status !== "combat";
    if (wrap.hidden) return;
    const r = rules(), act = E.active(en);
    const turnKey = `${en.id}.${en.round}.${en.turn}`; // a new turn (or encounter) starts with whoever's turn it is
    const prevActor = $("lab-actor").dataset.turn === turnKey ? $("lab-actor").value : act && act.pid;
    $("lab-actor").innerHTML = en.order.map((/** @type {string} */ pid) => { const p = E.find(en, pid); return `<option value="${pid}">${esc(p.name)}${act && act.pid === pid ? " (turn)" : ""}</option>`; }).join("");
    $("lab-actor").value = prevActor; $("lab-actor").dataset.turn = turnKey;
    const a = pickActor();
    const actions = [["attack", "Attack"], ...(r.actions.has("aim") ? [["aim", "Aim"]] : []), ["point", `Spend a ${T.point} point`], ["complication", "Complication comes into play"], ["condition", "Add a condition"], ["note", "Note"]];
    const pa = $("lab-action").value;
    $("lab-action").innerHTML = actions.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join("");
    $("lab-action").value = actions.some(([v]) => v === pa) ? pa : "attack";
    const action = $("lab-action").value, pt = $("lab-target").dataset.actor === (a && a.pid) ? $("lab-target").value : null;
    const targets = en.participants.filter((/** @type {any} */ p) => a && p.pid !== a.pid && !p.dead);
    $("lab-target").innerHTML = targets.map((/** @type {any} */ p) => `<option value="${p.pid}">${esc(p.name)}${E.isOut(p) ? " (down)" : ""}</option>`).join("");
    if (targets.some((/** @type {any} */ p) => p.pid === pt)) $("lab-target").value = pt;
    else { const foe = targets.find((/** @type {any} */ p) => a && p.side !== a.side && !E.isOut(p)); if (foe) $("lab-target").value = foe.pid; }
    $("lab-target").dataset.actor = a ? a.pid : "";
    $("lab-target").closest(".field").hidden = !["attack", "aim"].includes(action);
    $("lab-atk-row").hidden = action !== "attack";
    $("lab-text-row").hidden = !["point", "complication", "condition", "note"].includes(action);
    $("lab-text-label").textContent = { point: "What for (a small preparation, or other)", complication: "What happens", condition: "Condition", note: "Note" }[action] || "";
    if (action === "attack" && a) {
      const pw = $("lab-weapon").value;
      $("lab-weapon").innerHTML = a.weapons.filter((/** @type {string} */ w) => r.weapons[w]).map((/** @type {string} */ w) => `<option value="${w}">${esc(r.weapons[w].name)}</option>`).join("");
      if (a.weapons.includes(pw)) $("lab-weapon").value = pw;
      const w = r.weapons[$("lab-weapon").value];
      const bands = w && w.reach === "melee" ? ["melee"] : LD.BANDS;
      const pb = $("lab-band").dataset.weapon === (w && w.id) ? $("lab-band").value : null; // a new weapon starts at its natural range
      $("lab-band").dataset.weapon = w ? w.id : "";
      $("lab-band").innerHTML = bands.map((/** @type {string} */ b) => { const m = w ? LD.rangeModifier(w, b) : 0; return `<option value="${b}" ${m === null ? "disabled" : ""}>${BAND_NAMES[b]}${m ? " (" + signed(m) + ")" : m === null ? " (out of range)" : ""}</option>`; }).join("");
      $("lab-band").value = pb && bands.includes(pb) && (!w || LD.rangeModifier(w, pb) !== null) ? pb : bands.includes("close") ? "close" : bands[0];
      const modes = w && w.ammo ? MODES.filter((/** @type {any} */ m) => !m[3] || m[3].includes(w.ammo)) : [];
      $("lab-mode-wrap").hidden = !modes.length;
      $("lab-fmode").innerHTML = modes.map((/** @type {any} */ m) => `<option value="${m[0]}">${esc(m[1])} (${m[2]} ${m[2] > 1 ? esc(T.ammo || "rounds") : esc(T.ammoOne || "round")}${m[4] ? ", " + signed(m[4]) : ""})</option>`).join("");
      const ammoList = (w && LAB.ammo && LAB.ammo[w.id]) || [];
      $("lab-ammo-wrap").hidden = !ammoList.length;
      $("lab-ammo").innerHTML = ammoList.map((/** @type {string} */ x) => `<option>${esc(x)}</option>`).join("");
      $("lab-boost-wrap").hidden = !(w && w.spell);
      // Called shots (telling hits): name the effect first, at −2 (−4 for a small target).
      const TH = r.flags.has("telling") && r.params.tellingHits;
      $("lab-called-wrap").hidden = !TH;
      if (TH && !$("lab-called").options.length) $("lab-called").innerHTML = `<option value="">None</option>` + LDX.TELLING_EFFECTS.map((/** @type {any} */ [id, n]) => `<option value="${id}">${esc(n)} ${signed(TH.called)}</option><option value="${id}|small">${esc(n)}, small target ${signed(TH.small)}</option>`).join("");
      if (!TH) $("lab-called").value = "";
      if ($("lab-boost-wrap").hidden) $("lab-boost").value = "0";
      const base = w ? a.skills[w.skill] : undefined;
      if ($("lab-skill").dataset.for !== `${a.pid}|${w && w.id}`) { $("lab-skill").value = base ?? ""; $("lab-skill").dataset.for = `${a.pid}|${w && w.id}`; }
      $("lab-skill").previousElementSibling.textContent = w ? `${w.skill} target` : "Skill target";
      const d = E.find(en, $("lab-target").value);
      // The defenses open to this target against this weapon. Nothing is ever blocked: a defense already used this round
      // can still be chosen, and that's logged as a GM override.
      const opts = d ? E.defenseOptions(en, r, d, w) : [], best = E.chooseDefense(opts, "auto", false);
      const prevDef = $("lab-defense").value, key = `${en.id}|${d && d.pid}|${w && w.id}|${en.round}|${opts.map((o) => o.kind + o.used + o.preview).join()}`;
      $("lab-defense").innerHTML = `<option value="auto">Best available${best ? `: ${esc(best.label)} ${best.preview}` : ": none left"}</option>` +
        opts.map((o) => `<option value="${o.kind}">${esc(o.label)} ${o.preview}${o.used ? " (used this round: GM allows, logged)" : ""}</option>`).join("") +
        `<option value="none">No defense (unaware, or can't move)</option>`;
      $("lab-defense").value = $("lab-defense").dataset.key === key && [...$("lab-defense").options].some((o) => o.value === prevDef) ? prevDef : "auto";
      $("lab-defense").dataset.key = key;
      const used = opts.filter((o) => o.used).map((o) => o.kind);
      const sharedOut = r.flags.has("oneDefense") && !r.flags.has("dodgeEveryAttack") && opts.length > 0 && used.length === opts.length;
      $("lab-dodge-note").textContent = sharedOut ? `${d.name} has no defense left this round (one a round${d.traits && d.traits.some((/** @type {any} */ t) => t.type === "extraDefense") ? ", plus Additional Defense" : ""}). Choose one anyway to allow it: it's logged as a GM override.`
        : used.length ? `${d.name} has already used ${used.join(" and ")} this round${used.includes("dodge") ? " (one Dodge a round in the published rules)" : ""}. Choose it anyway to allow it: it's logged as a GM override.` : "";
    }
  }
  $("lab-act-wrap").addEventListener("change", (/** @type {any} */ e) => { if (["lab-actor", "lab-action", "lab-target", "lab-weapon"].includes(e.target.id)) renderAction(); });
  $("lab-go").onclick = () => {
    const en = enc(), r = rules(), a = pickActor(), action = $("lab-action").value, text = $("lab-text").value.trim();
    if (!en || !a) return;
    let res;
    if (action === "attack") {
      const w = r.weapons[$("lab-weapon").value], mode = MODES.find((/** @type {any} */ m) => m[0] === $("lab-fmode").value && !$("lab-mode-wrap").hidden);
      const skill = $("lab-skill").value === "" ? undefined : +$("lab-skill").value;
      res = E.attack(en, r, LD, {
        attacker: a.pid, defender: $("lab-target").value, weapon: w && w.id, band: $("lab-band").value,
        mode: mode ? { id: mode[0], label: mode[1], mod: mode[4] || 0, cost: mode[2] } : null, ammo: $("lab-ammo-wrap").hidden ? null : $("lab-ammo").value,
        called: $("lab-called-wrap").hidden || !$("lab-called").value ? null : { effect: $("lab-called").value.split("|")[0], small: $("lab-called").value.endsWith("|small") },
        cover: $("lab-cover").value, boosts: $("lab-boost-wrap").hidden ? 0 : +$("lab-boost").value, situational: +$("lab-sit").value ? [{ label: $("lab-sit-label").value.trim() || "Situation", value: +$("lab-sit").value }] : [],
        defense: $("lab-defense").value, allowExtraDodge: !["auto", "none"].includes($("lab-defense").value), skillTarget: skill !== undefined && skill !== a.skills[w && w.skill] ? skill : undefined });
      if (res.event && skill !== undefined && w && skill !== a.skills[w.skill]) E.override(en, r, LD, "skill", { pid: a.pid, skill: w.skill, from: a.skills[w.skill] ?? null, to: skill, reason: "GM set the target for this attack" });
    } else if (action === "aim") res = E.aim(en, r, a.pid, $("lab-target").value);
    else if (action === "point") res = E.spendPoint(en, r, LD, a.pid, "prep", { note: text });
    else if (action === "complication") res = E.invokeComplication(en, a.pid, text);
    else if (action === "condition") res = E.setCondition(en, a.pid, text, true);
    else if (action === "note") res = E.note(en, text);
    if (res.error) { say(res.error, true); return; }
    if (action !== "attack") $("lab-text").value = "";
    $("lab-sit").value = 0; $("lab-sit-label").value = "";
    pushToCards(); save(); renderAll();
    if (res.event && res.event.type === "attack") showResult(res.event.n); else { $("lab-result").innerHTML = ""; say(logText(res.event)); }
  };

  // ---- the calculation, shown in full ----
  const diceText = (/** @type {number[]} */ d) => `(${d.join(" + ")})`;
  /** @param {any} ev */
  function calcText(ev) {
    const L = [], r = ev.rules;
    L.push(`<span class="${r.kind === "lab" ? "x" : ""}">Rules: ${esc(r.kind === "lab" ? r.label + (r.active.length ? ": " + r.active.map((/** @type {any} */ a) => `${a.id} (${a.scope.toUpperCase()})`).join(", ") : ": no experiments") : "Published")}</span>`);
    L.push(`${esc(ev.attacker.name)} → ${esc(ev.defender.name)} · ${esc(ev.weapon.name)}${ev.ammo ? ", " + esc(ev.ammo) : ""} · ${BAND_NAMES[ev.band] || ev.band}${ev.reroll ? ` · <span class="x">${esc(T.point)} reroll of the ${ev.reroll}</span>` : ""}`);
    if (!ev.attackDice) { L.push(`<span class="bad">${esc(ev.outcome)}</span>`); return L.join("\n"); }
    L.push("", `${esc(ev.skill)}: ${ev.base}`);
    for (const m of ev.attackMods) L.push(`${esc(m.label)}: ${signed(m.value)}${m.scope === "experiment" ? ' <span class="x">[experiment]</span>' : ""}`);
    L.push(`Final attack target: <b>${ev.target}</b>`, "", `Attack roll: <b>${ev.attackTotal}</b> ${diceText(ev.attackDice)}${ev.auto ? ` · natural ${ev.attackTotal}: automatic ${ev.auto}` : ""}`);
    if (!ev.success) { L.push(`Failed by ${-ev.margin}`, `<span class="bad">Miss</span>`); }
    else {
      L.push(`Succeeded by ${ev.margin}`);
      if (ev.dodgeDice) {
        L.push("");
        for (const m of ev.dodgeMods) L.push(`${esc(m.label)}: ${signed(m.value)}${m.scope === "experiment" ? ' <span class="x">[experiment]</span>' : ""}`);
        const D = ev.defenseLabel || "Dodge", Dn = D.split(" (")[0];
        L.push(`Defender ${esc(D)}: ${ev.dodgeBase}`, `Effective ${esc(Dn)}: <b>${ev.effectiveDodge}</b>`, "", `${esc(Dn)} roll: <b>${ev.dodgeTotal}</b> ${diceText(ev.dodgeDice)}`);
        L.push(ev.dodged ? `<span class="bad">${esc({ Dodge: "Dodged", Parry: "Parried", Block: "Blocked" }[Dn] || "Defended")}: no hit</span>` : `<span class="ok">${esc(Dn)} failed: Hit</span>`);
      } else L.push(`No defense (${ev.cmd && ev.cmd.defense === "none" ? "the target couldn't defend" : "none available"})`, `<span class="ok">Hit</span>`);
    }
    if (ev.hit && !(ev.overridden && !ev.rolledHit && !ev.damage)) {
      L.push("", !ev.damage && /marks nothing/.test(ev.outcome) ? esc(ev.outcome[0].toUpperCase() + ev.outcome.slice(1)) : ev.damage ? `${esc(ev.weapon.name)} at ${BAND_NAMES[ev.band] || ev.band}: ${ev.damage} box${ev.damage > 1 ? "es" : ""}${ev.dyingWeapon ? ", and Dying" : ""}${ev.reduced ? ` (−1, a ${esc(T.point)} point)` : ""}` : "No effect at this range");
      if (ev.damage) L.push(`${esc(ev.defender.name)}: ${ev.injuryBefore} → <b>${ev.injuryAfter}</b> box${ev.injuryAfter === 1 ? "" : "es"}${ev.dead ? ", <span class='bad'>dead</span>" : ev.dying ? ", <span class='bad'>Dying</span>" : ""}${ev.injuryResult ? " · " + esc(ev.injuryResult) : ""}`);
    }
    if (ev.enchanted) L.push(`<span class="x">Enchanted weapon: +${ev.enchanted} box.</span>`);
    if (ev.armorUsed) L.push(`<span class="x">${esc(ev.armorUsed)}: one box fewer.</span>`);
    if (ev.shieldBroke) L.push(`<span class="x">${esc(ev.shieldBroke)} breaks: it took a hit of 2 or more boxes.</span>`);
    if (ev.marginTrait) L.push(`<span class="x">${esc(ev.marginTrait)}.</span>`);
    if (ev.defenseClass) L.push(`<span class="x">${esc(ev.defenseClass)}.</span>`);
    if (ev.price) L.push(`<span class="bad">Failed cast: ${esc(ev.attacker.name)} marks ${ev.price.boxes} ${esc(ev.price.track)}.</span>`);
    if (ev.jam) L.push(`<span class="bad">Natural ${ev.attackTotal}: ${ev.weapon && WEAPONS[ev.weapon.id] && WEAPONS[ev.weapon.id].ammo ? "the weapon jams or misfires" : "the weapon fails"}. Clearing it takes an action.</span>`);
    if (ev.grievous) {
      const g = ev.grievous;
      L.push("", g.pc ? `<b class="bad">Grievous wound (${esc(g.why)}): 3d6 = ${g.total} (${g.dice.join(" + ")}) → ${esc(g.name)}.</b> ${esc(g.text)}`
        : `<b class="bad">Taken out (${esc(g.why)}).</b> ${esc(g.text)}`);
    }
    if (ev.telling) {
      const t = ev.telling, fx = LDX.TELLING_EFFECTS.find((/** @type {any} */ x) => x[0] === t.effect);
      L.push("", `<b class="x">Telling hit (${esc(t.why)}):</b> ${fx ? `${esc(fx[1])}: ${esc(fx[2])}.` : `${esc(ev.attacker.name)} picks one effect below.`} No extra boxes.${ev.grievous ? " With a grievous wound, the attacker can choose which limb." : ""}`);
      if (t.shrugged) L.push(`<span class="x">${esc(ev.defender.name)} shrugs it off (${t.shrugged === "edge" ? "Hard to put down" : esc(T.point) + " point"}): the boxes stand, the effect doesn't.</span>`);
    }
    if (ev.grievous && ev.grievous.downgradedTo !== undefined) L.push(`<span class="x">${esc(T.point)} point: downgraded to ${esc(ev.grievous.downgradedTo || "no lasting wound")}.</span>`);
    if (ev.traded) L.push("", `<b class="x">Traded for a limb${ev.grievous && ev.grievous.pc ? " (instead of the grievous wound)" : ""}:</b> ${esc(ev.defender.name)} lives, Incapacitated but stable, and ${ev.traded === "crippled" ? "loses the use of a limb" : "loses a limb"} (the player says which). It's a complication now: when it causes real trouble, accept it and earn ${esc(T.point)}.`);
    if (ev.overridden) L.push("", `<b class="x">GM ruling: ${ev.hit ? "HIT" : "MISS"}</b> (the dice said ${ev.rolledHit ? "hit" : "miss"}). ${esc(ev.defender.name)}: ${ev.injuryAfter} box${ev.injuryAfter === 1 ? "" : "es"}${ev.dead ? ", dead" : ev.dying ? ", Dying" : ""}.`);
    return L.join("\n");
  }
  /** @param {number} n */
  function showResult(n) {
    const en = enc(), ev = en && en.events.find((/** @type {any} */ e) => e.n === n);
    if (!ev) { $("lab-result").innerHTML = ""; return; }
    const a = E.find(en, ev.attacker.pid), d = E.find(en, ev.defender.pid), live = !ev.superseded && en.status === "combat";
    const btns = [];
    const ruled = !!ev.overridden;
    if (live && !ruled && !ev.reroll && a && a.kind === "pc" && a.points > 0 && ev.attackDice) btns.push(`<button class="btn" data-fx="reroll-attack">${esc(a.name)}: reroll the attack (${esc(T.point)})</button>`);
    if (live && !ruled && !ev.reroll && d && d.kind === "pc" && d.points > 0 && ev.dodgeDice) btns.push(`<button class="btn" data-fx="reroll-dodge">${esc(d.name)}: reroll the Dodge (${esc(T.point)})</button>`);
    if (live && !ruled && d && d.kind === "pc" && d.points > 0 && ev.hit && ev.damage && !ev.reduced) btns.push(`<button class="btn" data-fx="reduce">${esc(d.name)}: one box fewer (${esc(T.point)})</button>`);
    const R = rules(), GW = R.flags.has("grievous") && R.params.grievousWounds;
    if (live && GW && GW.limbTrade && d && d.kind === "pc" && !ev.traded && d.limbTradedRound === undefined && ((ev.dying && !ev.pre.defender.dying) || ev.dead))
      btns.push(`<button class="btn" data-fx="trade-lost">${esc(d.name)}: lose a limb instead (complication)</button><button class="btn" data-fx="trade-crippled">${esc(d.name)}: lose a limb's use instead (complication)</button>`);
    if (live && ev.grievous && ev.grievous.pc && !ev.traded && ev.grievous.downgradedTo === undefined && d && d.points > 0) btns.push(`<button class="btn" data-fx="downgrade">${esc(d.name)}: downgrade the grievous wound (${esc(T.point)})</button>`);
    if (live && ev.telling && !ev.telling.shrugged) {
      if (!ev.telling.called) btns.push(`<label class="small">Effect <select data-telling>${[["", "Pick…"], ...LDX.TELLING_EFFECTS].map((/** @type {any} */ [id, n]) => `<option value="${id}"${id === (ev.telling.effect || "") ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`);
      if (d && d.kind === "pc" && (d.traits || []).some((/** @type {any} */ t) => t.type === "shrugTelling" && !t.used)) btns.push(`<button class="btn" data-fx="shrug-edge">${esc(d.name)}: shrug it off (Hard to put down)</button>`);
      if (d && d.kind === "pc" && d.points > 0) btns.push(`<button class="btn" data-fx="shrug-point">${esc(d.name)}: shrug it off (${esc(T.point)})</button>`);
    }
    if (live && ev.attackDice) btns.push(`<button class="btn" data-fx="${ev.hit ? "miss" : "hit"}">GM: make it a ${ev.hit ? "miss" : "hit"}</button>`);
    $("lab-result").innerHTML = `<div class="lab-calc" data-ev="${ev.n}">${calcText(ev)}</div>${btns.length ? `<div class="btn-row" style="margin-top:8px">${btns.join("")}</div>` : ""}`;
  }
  $("lab-result").addEventListener("change", (/** @type {any} */ e) => {
    const sel = e.target.closest("[data-telling]"), en = enc(); if (!sel || !en || !sel.value) return;
    const n = +$("lab-result").querySelector("[data-ev]").dataset.ev, res = E.tellingEffect(en, n, sel.value);
    if (res.error) { say(res.error, true); return; }
    save(); renderAll(); showResult(n);
  });
  $("lab-result").addEventListener("click", (/** @type {any} */ e) => {
    const b = e.target.closest("[data-fx]"), en = enc(); if (!b || !en) return;
    const n = +$("lab-result").querySelector("[data-ev]").dataset.ev, ev = en.events.find((/** @type {any} */ x) => x.n === n), fx = b.dataset.fx;
    let res;
    if (fx === "shrug-edge" || fx === "shrug-point") res = E.shrugTelling(en, n, fx === "shrug-edge" ? "edge" : "point");
    else if (fx === "trade-lost" || fx === "trade-crippled") res = E.tradeLimb(en, rules(), n, fx === "trade-lost" ? "lost" : "crippled");
    else if (fx === "hit" || fx === "miss") res = E.override(en, rules(), LD, "outcome", { event: n, hit: fx === "hit", reason: "GM ruling" });
    else res = E.spendPoint(en, rules(), LD, fx === "reroll-dodge" || fx === "reduce" || fx === "downgrade" ? ev.defender.pid : ev.attacker.pid, fx, { event: n });
    if (res.error) { say(res.error, true); return; }
    pushToCards(); save(); renderAll();
    showResult(res.event && res.event.type === "attack" ? res.event.n : n);
  });

  // ---- clocks: the page's own clocks ----
  function renderClocksHere() {
    const list = api.clocks.list();
    $("lab-clocks").innerHTML = list.length ? list.map((c) => `<span class="lab-clock"><b>${esc(c.name)}</b> <span class="small muted">${c.kind}</span>
      <button class="btn" data-clk="${c.id}" data-d="-1" aria-label="${esc(c.name)}: one segment less">−</button><span class="num">${c.filled}/${c.size}</span><button class="btn" data-clk="${c.id}" data-d="1" aria-label="${esc(c.name)}: one segment more">+</button></span>`).join("")
      : `<p class="small muted">No clocks running.</p>`;
  }
  $("lab-clocks").addEventListener("click", (/** @type {any} */ e) => {
    const b = e.target.closest("[data-clk]"); if (!b) return;
    const c = api.clocks.list().find((x) => x.id === b.dataset.clk); if (!c) return;
    api.clocks.set(c.id, Math.max(0, Math.min(c.size, c.filled + +b.dataset.d)));
  });
  $("lab-clk-add").onclick = () => { const n = $("lab-clk-name").value.trim(); if (!n) { $("lab-clk-name").focus(); return; } api.clocks.add(n, +$("lab-clk-size").value, $("lab-clk-kind").value); $("lab-clk-name").value = ""; };
  api.clocks.listen((c, from, to) => { const en = enc(); if (en && en.status !== "ended" && from !== to) { E.clockChange(en, c, from, to); save(); renderLog(); renderSummary(); } renderClocksHere(); });

  // ---- log, summary, export, rerun ----
  /** @param {any} e */
  function logText(e) {
    if (!e) return "";
    const pt = esc(T.point);
    switch (e.type) {
      case "join": return `${esc(e.name)} joins (${e.side === "party" ? "party" : "foe"}).`;
      case "leave": return `${esc(e.name)} leaves.`;
      case "start": return `Combat starts. Rules: ${esc(e.rules.kind === "lab" ? e.rules.label + " (" + (e.rules.active.map((/** @type {any} */ a) => `${a.id}, ${a.scope}`).join("; ") || "no experiments") + ")" : "Published")}${e.seed !== null && e.seed !== undefined ? ` · seed ${esc(e.seed)}` : ""}. Order: ${esc(e.order.join(", "))}.`;
      case "round": return `<b>Round ${e.round}.</b>`;
      case "turn": return `${esc(e.name || "")}'s turn.`;
      case "order": return `Turn order: ${esc(e.order.join(", "))}.`;
      case "aim": return `${esc(e.name)} aims at ${esc(e.targetName)}.`;
      case "attack": return `${esc(e.attacker.name)} → ${esc(e.defender.name)} (${esc(e.weapon.name)}, ${esc(BAND_NAMES[e.band] || e.band)}): ${e.attackDice ? `${e.attackTotal} vs ${e.target}${e.success ? `, by ${e.margin}` : ""}${e.dodgeDice ? `; ${esc((e.defenseLabel || "Dodge").split(" (")[0])} ${e.dodgeTotal} vs ${e.effectiveDodge}` : ""} → ` : ""}<b>${esc(e.overridden ? `GM: ${e.hit ? `hit, ${e.injuryBefore}→${e.injuryAfter}` : "miss"}` : e.hit ? (e.damage ? `hit, ${e.injuryBefore}→${e.injuryAfter}${e.dead ? " dead" : e.dying ? " Dying" : ""}` : e.stun ? "hit, stunned (Body −2)" : "hit, no effect") : e.outcome)}</b>${e.price ? ` · ${e.price.boxes} ${esc(e.price.track)}` : ""}${e.reroll ? ` (${pt} reroll)` : ""}${e.superseded ? " <span class='muted'>(rerolled)</span>" : ""}${e.overridden ? " <span class='muted'>(overridden)</span>" : ""}${e.grievous ? ` · <b class='bad'>${e.grievous.pc ? esc(e.grievous.name) : "taken out"}</b>` : ""}`;
      case "trade": return `<b>${esc(e.name)} trades a limb for their life:</b> ${esc(e.wound)}.`;
      case "telling": return `${esc(e.name)}'s telling hit on ${esc(e.target)}: ${esc((LDX.TELLING_EFFECTS.find((/** @type {any} */ x) => x[0] === e.effect) || [0, e.effect || "no effect"])[1])}.`;
      case "shrug": return `${esc(e.name)} shrugs off a telling hit (${esc(e.label)}).`;
      case "point": return `${esc(e.name)} spends a ${pt} point: ${esc({ "reroll-attack": "reroll the attack", "reroll-dodge": "reroll the Dodge", reduce: "one box fewer", prep: "a small preparation", downgrade: "downgrade a grievous wound", shrug: "shrug off a telling hit" }[e.use] || e.use)}${e.from ? ` (${esc(e.from)} → ${esc(e.to)})` : ""}${e.note ? ` (${esc(e.note)})` : ""}.`;
      case "complication": return `${esc(e.name)}'s complication comes into play${e.note ? `: ${esc(e.note)}` : ""}. +1 ${pt}.`;
      case "gear": return `${esc(e.name)} puts on ${esc(e.item)}.`;
      case "trait": return `${esc(e.name)}: ${esc(e.trait)} ${e.on ? "on" : "off"}.`;
      case "condition": return `${esc(e.name)}: ${e.on ? "+" : "−"} ${esc(e.condition)}.`;
      case "override": {
        const gm = `<span style="color:var(--warn)">GM</span>`;
        if (e.what === "outcome") return `${gm}: ${esc(e.attacker || "")}'s attack on ${esc(e.name || "")} is a <b>${e.to.hit ? "hit" : "miss"}</b> (the dice said ${e.from.hit ? "hit" : "miss"}); injury ${e.from.injury} → ${e.to.injury}.`;
        if (e.what === "dodge") return `${gm}: ${esc(e.name)} may ${esc(e.defense || "dodge")} again this round.`;
        if (e.what === "injury") return `${gm}: ${esc(e.name)}'s injury ${e.from.injury} → ${e.to.injury}${e.to.dead ? ", dead" : e.to.dying ? ", Dying" : ""}${e.reason ? ` (${esc(e.reason)})` : ""}.`;
        if (e.what === "points") return `${gm}: ${esc(e.name)}'s ${pt} ${e.from} → ${e.to}${e.reason ? ` (${esc(e.reason)})` : ""}.`;
        if (e.what === "track") return `${gm}: ${esc(e.name)}'s ${esc(e.track)} ${e.from} → ${e.to}${e.reason ? ` (${esc(e.reason)})` : ""}.`;
        if (e.what === "skill") return `${gm}: ${esc(e.name)}'s ${esc(e.skill)} target set to ${e.to} for an attack (sheet: ${e.from ?? "—"}).`;
        return `${gm} override: ${esc(e.what)}${e.name ? " for " + esc(e.name) : ""}${e.reason ? ` (${esc(e.reason)})` : ""}.`;
      }
      case "clock": return e.from < 0 ? `Clock “${esc(e.name)}” started (${e.kind}, ${e.size} segments).` : `Clock “${esc(e.name)}”: ${e.from} → ${e.to} of ${e.size}.`;
      case "note": return `Note: ${esc(e.text)}`;
      case "end": return `<b>Encounter ends.</b>`;
      default: return esc(e.type);
    }
  }
  function renderLog() {
    const en = enc();
    $("lab-log").innerHTML = en && en.events.length ? [...en.events].reverse().map((/** @type {any} */ e) => `<li${e.type === "attack" ? ` data-show="${e.n}" style="cursor:pointer" title="Show the calculation"` : ""}><span class="t">R${e.round}</span> ${logText(e)}</li>`).join("") : `<li class="muted" style="list-style:none">Nothing yet.</li>`;
  }
  $("lab-log").addEventListener("click", (/** @type {any} */ e) => { const li = e.target.closest("[data-show]"); if (li) { showResult(+li.dataset.show); $("lab-result").scrollIntoView({ block: "nearest" }); } });

  const pct = (/** @type {number | null} */ v) => (v === null ? "—" : v + "%");
  const TILES = [["rounds", "Rounds"], ["attacks", "Attacks"], ["attackSuccessRate", "Attack success", pct], ["dodgeNegatedRate", "Successes dodged", pct], ["finalHitRate", "Final hit rate", pct],
    ["averageMargin", "Average margin"], ["dodgeSuccessRate", "Dodge success", pct], ["averageEffectiveDodge", "Average effective Dodge"], ["damageFrequency", "Damage frequency", pct],
    ["injuryFrequency", "Injury frequency", pct], ["boxesMarked", "Boxes marked"], ["incapacitated", "Down"], ["dead", "Dead"], ["pointsSpent", "Points spent"], ["complications", "Complications"], ["overrides", "GM overrides"], ["jams", "Jams"], ["boostsSpent", "Boosts"],
    ["armorStops", "Armour stops"], ["grievous", "Grievous wounds"], ["takenOut", "Foes taken out"], ["limbTrades", "Limbs traded"], ["tellingHits", "Telling hits"], ["shrugged", "Shrugged off"], ["priceMarked", PTRACK ? PTRACK.name + " marked" : "Price marked", (/** @type {any} */ v) => Object.values(v || {}).reduce((/** @type {number} */ a, /** @type {any} */ b) => a + b, 0)]];
  /** @param {any} s */
  const tiles = (s) => `<div class="lab-sum">${TILES.map(([k, n, f]) => `<div><span>${n}</span><b>${f ? f(s[k]) : s[k] ?? "—"}</b></div>`).join("")}</div>`;
  function renderSummary() {
    const en = enc();
    if (!en || !en.events.some((/** @type {any} */ e) => e.type === "start")) { $("lab-summary").innerHTML = `<p class="small muted">Start an encounter to see its numbers.</p>`; $("lab-compare").innerHTML = ""; return; }
    const s = S.summarize(en);
    $("lab-summary").innerHTML = `<p class="small"><b>${esc(s.name)}</b> · ${esc(s.rules.kind === "lab" ? `${s.rules.label}: ${s.rules.experiments.join(", ") || "no experiments"}` : "Published rules")}${s.seed !== null && s.seed !== undefined ? ` · seed ${esc(s.seed)}` : " · random dice"}${en.status === "ended" ? "" : " · so far"}</p>${tiles(s)}
      ${Object.keys(s.byDefense || {}).length ? `<p class="small" style="margin:8px 0 0">Defenses: ${Object.entries(s.byDefense).map(([k, v]) => `${esc(k)} ${v.successes}/${v.attempts}`).join(" · ")}</p>` : ""}
      ${Object.keys(s.byWeapon).length ? `<div class="lab-scroll"><table class="lab-cmp" style="margin-top:8px"><tr><th>Weapon</th><th>Attacks</th><th>Succeeded</th><th>Dodged</th><th>Hits</th><th>Boxes</th></tr>${Object.values(s.byWeapon).map((/** @type {any} */ w) => `<tr><td>${esc(w.name)}</td><td>${w.attacks}</td><td>${w.successes}</td><td>${w.dodged}</td><td>${w.hits}</td><td>${w.boxes}</td></tr>`).join("")}</table></div>` : ""}`;
    renderCompare();
  }
  function renderCompare() {
    const c = lab.compare, en = enc();
    if (!c || !en || c.of !== en.id) { $("lab-compare").innerHTML = ""; return; }
    const a = S.summarize(en), b = c.summary;
    const row = (/** @type {string} */ k, /** @type {string} */ n) => { const x = a[k], y = b[k], d = typeof x === "number" && typeof y === "number" ? Math.round((y - x) * 100) / 100 : null; return `<tr><td>${n}</td><td>${x ?? "—"}</td><td>${y ?? "—"}</td><td>${d === null ? "" : d > 0 ? "+" + d : d}</td></tr>`; };
    $("lab-compare").innerHTML = `<p class="small" style="margin:8px 0 4px"><b>Rerun under:</b> ${esc(c.label)}</p><div class="lab-scroll"><table class="lab-cmp"><tr><th></th><th>This run</th><th>Rerun</th><th>Change</th></tr>
      ${TILES.map(([k, n]) => row(k, n)).join("")}</table></div><p class="small muted">Same seed, same declared actions; ${c.skipped} action${c.skipped === 1 ? "" : "s"} couldn't happen in the rerun. ${a.seed === null || a.seed === undefined ? "<b>This encounter used random dice, so the rerun's dice differ: set a seed for a fair comparison.</b>" : ""} Point spends and overrides aren't replayed.</p>`;
  }
  $("lab-rerun").onclick = () => {
    const en = enc(); if (!en) return;
    const cfg = $("lab-rerun-cfg").value === "lab" ? lab.cfg : LDX.PUBLISHED;
    const res = E.replay(en, rulesOf(cfg), LD, cfg);
    if (res.error) { say(res.error, true); return; }
    lab.compare = { of: en.id, label: cfg.kind === "lab" ? rulesLine(rulesOf(cfg)) : "Published rules", summary: S.summarize(res.encounter), skipped: res.encounter.skipped, encounter: res.encounter };
    save(); renderCompare();
  };
  const slug = (/** @type {string} */ s) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "encounter";
  $("lab-export").onclick = () => {
    const en = enc(); if (!en) { say("Nothing to save yet.", true); return; }
    api.saveText(JSON.stringify({ format: PACK.id + (PROD ? "-encounter" : "-lab-session"), version: 1, baseline: LD.CORE_BASELINE, setting: PACK.id, testConfiguration: LAB.label,
      encounter: en, summary: S.summarize(en), comparison: lab.compare && lab.compare.of === en.id ? lab.compare : null, history: lab.history.map((h) => S.summarize(h)) }, null, 2), slug(en.name) + (PROD ? "-encounter.json" : "-lab.json"), say);
  };
  $("lab-csv").onclick = () => { const en = enc(); if (!en) { say("Nothing to save yet.", true); return; } api.saveText(S.attacksCsv(en), slug(en.name) + "-attacks.csv", say); };
  $("lab-name").addEventListener("change", () => { const en = enc(); if (en) { en.name = $("lab-name").value.trim() || en.name; save(); renderSummary(); } });
  $("lab-seed").addEventListener("change", () => { const en = enc(); if (en && en.status === "setup") { en.seed = $("lab-seed").value.trim() || null; save(); } else if (en) { $("lab-seed").value = en.seed ?? ""; say("The seed is fixed once combat starts. Start a new encounter to change it.", true); } });

  function renderAll() { pullFromCards(); renderRules(); renderPeople(); renderAction(); renderClocksHere(); renderLog(); renderSummary(); }
  renderAll();
  return { refresh: renderAll };
}
