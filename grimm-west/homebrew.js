// Homebrew: a GM's own threats, weapons, Edges, cards, spells (hexes, cantrips, psionic powers), powers and rituals, made in the GM view
// without touching any code. Plain script,
// inlined by tools/build-legend.py (/* HOMEBREW */) and tools/build-guide.py (HOMEBREW markers); no modules, no page globals.
//
// hbLoad(game) reads this browser's homebrew; hbApply(PACK, hb) adds it to the page's data before anything reads it,
// so the creator, the roller, the Encounter panel and the battle map treat it like the setting's own (marked
// "homebrew"). Changes take effect on the next page load.
// mountHomebrew(api) with api: { PACK (as built, before hbApply), game, gmRoot (the GM view's Homebrew card),
//   noteRoot (a card on the play tab for homebrew the GM shares), fileRoot (the Character file panel), esc, toast,
//   saveText(text, name, say), edges (false for a game without Edges), ritualRoot (where the creator lists the ritual
//   book, beside Rituals by heart), heartInput (that field) } returns { snapshot() (what the shared table
//   sends players, or null), receive(hb) }.
// Sharing: as a file (Save to file / Open file), or through the shared table: players who join get the GM's homebrew
// and choose to use it.
// Function declarations only, above mountHomebrew: hbLoad and hbApply run as the page starts, before this file's place.
function hbLimits() { return { threats: 30, weapons: 30, edges: 20, spells: 20, cards: 30, rituals: 30, powers: 20 }; }
function hbKinds() { return ["threats", "weapons", "edges", "spells", "cards", "rituals", "powers"]; }
function hbClasses() { return ["I", "II", "III", "IV", "V", "VI"]; }
// A ritual's weight sets its clock, as in the core rules' magic chapter.
function hbWeights() { return [["minor", "Minor", 2], ["significant", "Significant", 4], ["major", "Major", 6]]; }
// What a setting can take: spells need its spell list, cards its discovery cards, rituals its magic.
function hbHas(PACK) { return { spells: !!(PACK.spells && Array.isArray(PACK.spells.list)), cards: !!PACK.discovery, rituals: !!(PACK.magic && PACK.magic.workings),
  powers: !!(PACK.powers && Array.isArray(PACK.powers.list)) }; }
function hbBands() { return [["close", "Close"], ["short", "Short"], ["medium", "Medium"], ["long", "Long"], ["extreme", "Extreme"]]; }
function hbKey(game) { return game + ".homebrew.v1"; }
function hbInt(v, lo, hi, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; }
function hbText(v, max) { return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function hbSlug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "item"; }
function hbId(v, name, taken) {
  let id = typeof v === "string" && /^hb-[a-z0-9-]{1,40}$/.test(v) ? v : "hb-" + hbSlug(name);
  for (let i = 2; taken.has(id); i++) id = id.replace(/-\d+$/, "") + "-" + i;
  taken.add(id); return id;
}
// Bonuses the table works out, chosen from a menu: each maps onto something the rules engine already applies.
function hbMats(PACK, v) { const ok = new Set((PACK.materials || []).map((m) => m[0])); return [...new Set(Array.isArray(v) ? v : [])].filter((m) => ok.has(m)).slice(0, 4); }
function hbWeaponBonus(PACK, b) { b = b && typeof b === "object" ? b : {}; return { accuracy: hbInt(b.accuracy, 0, 2, 0), aimedOnly: !!b.aimedOnly, strong: !!b.strong, materials: hbMats(PACK, b.materials) }; }
function hbThreatBonus(PACK, b) { b = b && typeof b === "object" ? b : {};
  return { armor: !!b.armor, hardToHit: hbInt(b.hardToHit, 0, 2, 0), weak: hbMats(PACK, b.weak), onlyBy: hbMats(PACK, b.onlyBy), onlyMax: hbInt(b.onlyMax, 0, 1, 1), shrug: !!b.shrug, extraDefense: !!b.extraDefense }; }
function hbEdgeBonusClean(b, skills) { b = b && typeof b === "object" ? b : {};
  return { skill: skills.includes(b.skill) ? b.skill : "", skillValue: skills.includes(b.skill) ? hbInt(b.skillValue, 0, 2, 0) : 0, dodge: hbInt(b.dodge, 0, 1, 0), move: hbInt(b.move, 0, 3, 0), extraDefense: !!b.extraDefense, shrugTelling: !!b.shrugTelling }; }
// A character's bonus from homebrew Edges (count(id): how many times they have it): "skill" (for one skill), "dodge" or "move".
function hbEdgeBonus(PACK, count, kind, skill) {
  let n = 0;
  for (const x of PACK.hbEdges || []) { const k = count(x.id) || 0, b = x.bonus; if (!k || !b) continue;
    n += kind === "skill" ? (b.skill === skill ? b.skillValue : 0) * k : kind === "dodge" ? b.dodge * k : kind === "move" ? b.move * k : 0; }
  return n;
}
// The fight traits homebrew Edges give a character in the Encounter panel.
function hbEdgeTraits(PACK, count) {
  const out = [];
  for (const x of PACK.hbEdges || []) { if (!count(x.id) || !x.bonus) continue;
    if (x.bonus.extraDefense) out.push({ type: "extraDefense", value: 1, label: x.name });
    if (x.bonus.shrugTelling) out.push({ type: "shrugTelling", oncePerFight: true, label: x.name }); }
  return out;
}
// The skills a weapon can use: the ones the setting's own weapons use.
function hbSkills(PACK) { return [...new Set((PACK.arms || []).filter((a) => !a.hazard && !a.homebrew).map((a) => a.skill))]; }

/** Homebrew as it may be kept and shared: everything checked against the game's limits; anything else dropped. */
function hbClean(raw, PACK) {
  const r = raw && typeof raw === "object" ? raw : {}, taken = new Set(), skills = hbSkills(PACK);
  const weapons = (Array.isArray(r.weapons) ? r.weapons : []).slice(0, hbLimits().weapons).map((w) => {
    const name = hbText(w && w.name, 40); if (!name) return null;
    const melee = w.kind !== "ranged";
    return { id: hbId(w.id, name, taken), name, skill: skills.includes(w.skill) ? w.skill : skills[0] || "Melee", kind: melee ? "melee" : "ranged",
      ...(melee ? { reach: hbInt(w.reach, 1, 3, 1) } : { band: hbBands().some((b) => b[0] === w.band) ? w.band : "close", rounds: hbInt(w.rounds, 0, 30, 0) }),
      boxes: hbInt(w.boxes, 1, 4, 1), note: hbText(w.note, 200), bonus: hbWeaponBonus(PACK, w.bonus) };
  }).filter(Boolean);
  const armIds = new Set([...(PACK.arms || []).filter((a) => !a.hazard && !a.homebrew).map((a) => a.id), ...weapons.map((w) => w.id)]);
  const threats = (Array.isArray(r.threats) ? r.threats : []).slice(0, hbLimits().threats).map((t) => {
    const name = hbText(t && t.name, 40); if (!name) return null;
    const ws = [...new Set((Array.isArray(t.weapons) ? t.weapons : []).filter((id) => armIds.has(id)))].slice(0, 3);
    if (!ws.length) return null;
    return { id: hbId(t.id, name, taken), name, minor: !!t.minor, target: hbInt(t.target, 3, 18, 12), dodge: hbInt(t.dodge, 3, 18, 8),
      boxes: t.minor ? 1 : hbInt(t.boxes, 1, 6, 3), weapons: ws, trait: hbText(t.trait, 40), traitText: hbText(t.traitText, 300), bonus: hbThreatBonus(PACK, t.bonus) };
  }).filter(Boolean);
  const edges = (Array.isArray(r.edges) ? r.edges : []).slice(0, hbLimits().edges).map((x) => {
    const name = hbText(x && x.name, 40), text = hbText(x && x.text, 300); if (!name || !text) return null;
    const allSkills = [...new Set([...skills, ...(PACK.skills || []).map((x) => x[0])])], bonus = hbEdgeBonusClean(x.bonus, allSkills);
    // An Edge with a number bonus is taken once, so it can't stack past the book's limits.
    return { id: hbId(x.id, name, taken), name, text, limit: bonus.skillValue || bonus.dodge || bonus.move ? 1 : hbInt(x.limit, 1, 3, 1), bonus };
  }).filter(Boolean);
  const list = (k) => (Array.isArray(r[k]) ? r[k] : []).slice(0, hbLimits()[k]);
  const spells = list("spells").map((x) => {
    const name = hbText(x && x.name, 40), text = hbText(x && x.text, 300); if (!name || !text) return null;
    const a = x.attack && typeof x.attack === "object" ? x.attack : {};
    // An attack spell: it can be cast as an attack in the Encounter panel, with the setting's spell skill.
    return { id: hbId(x.id, name, taken), name, text, attack: { boxes: hbInt(a.boxes, 0, 3, 0), band: hbBands().some((b) => b[0] === a.band) ? a.band : "short" } };
  }).filter(Boolean);
  const cards = list("cards").map((x) => {
    const name = hbText(x && x.name, 40), knowledge = hbText(x && x.knowledge, 300); if (!name || !knowledge) return null;
    return { id: hbId(x.id, name, taken), name, knowledge, permits: hbText(x.permits, 200) };
  }).filter(Boolean);
  const rituals = list("rituals").map((x) => {
    const name = hbText(x && x.name, 40), text = hbText(x && x.text, 300); if (!name || !text) return null;
    return { id: hbId(x.id, name, taken), name, weight: hbWeights().some((w) => w[0] === x.weight) ? x.weight : "minor", time: hbText(x.time, 40), text, price: hbText(x.price, 120) };
  }).filter(Boolean);
  // A power, as the setting's own: what it does at each Class, I to VI. Class I is needed; a blank Class goes on from the one before.
  const groups = (PACK.powers && PACK.powers.groups || []).map((g) => g[0]);
  const powers = list("powers").map((x) => {
    const name = hbText(x && x.name, 40), cls = hbClasses().map((_, i) => hbText(Array.isArray(x.classes) ? x.classes[i] : "", 200));
    if (!name || !cls[0]) return null;
    return { id: hbId(x.id, name, taken), name, group: groups.includes(x.group) ? x.group : groups[0] || "", classes: cls, gm: !!x.gm, variety: hbText(x.variety, 120) };
  }).filter(Boolean);
  return { threats, weapons, edges, spells, cards, rituals, powers, from: r.from === "gm" ? "gm" : "mine" };
}
function hbCount(hb) { return hb ? hbKinds().reduce((n, k) => n + (hb[k] || []).length, 0) : 0; }
function hbBody(hb) { return JSON.stringify(Object.fromEntries(hbKinds().map((k) => [k, hb[k] || []]))); }
function hbLoad(PACK) {
  try { return hbClean(JSON.parse(localStorage.getItem(hbKey(PACK.id)) || "null"), PACK); } catch { return hbClean(null, PACK); }
}
function hbSave(PACK, hb) { try { localStorage.setItem(hbKey(PACK.id), JSON.stringify(hb)); return true; } catch { return false; } }

/** A homebrew threat's bonuses, as the engine's traits. */
function hbThreatTraits(PACK, t) {
  const b = t.bonus || {}, mat = (id) => ((PACK.materials || []).find((m) => m[0] === id) || [id, id])[1], out = [];
  if (b.armor) out.push({ type: "armor", always: true, minBoxes: 2, label: `${t.name}: hard hide` });
  if (b.hardToHit) out.push({ type: "attackPenalty", value: -b.hardToHit, label: `${t.name}: hard to hit` });
  for (const m of b.weak || []) out.push({ type: "weakness", material: m, extra: 1, label: `Weak to ${mat(m).toLowerCase()}` });
  if ((b.onlyBy || []).length) out.push({ type: "capBoxes", max: b.onlyMax, except: b.onlyBy, label: `Only ${b.onlyBy.map((m) => mat(m).toLowerCase()).join(" or ")} ${b.onlyMax ? "marks more than 1 box" : "hurts it"}` });
  if (b.shrug) out.push({ type: "ignoreHits", oncePerFight: true, maxBoxes: 1, label: `${t.name}: shrugs it off` });
  if (b.extraDefense) out.push({ type: "extraDefense", value: 1, label: `${t.name}: quick` });
  return out;
}

/** Add homebrew to the page's data, as the setting's own entries are shaped. */
function hbApply(PACK, hb) {
  if (!hbCount(hb)) return;
  PACK.arms = PACK.arms || []; PACK.threats = PACK.threats || []; PACK.extraEdges = PACK.extraEdges || []; PACK.equipment = PACK.equipment || [];
  const band = (b) => (hbBands().find((x) => x[0] === b) || ["", b])[1];
  for (const w of hb.weapons) {
    const range = w.kind === "melee" ? `Melee, reach ${w.reach} yd` : band(w.band);
    const bn = w.bonus || {}, traits = [];
    if (bn.accuracy) traits.push({ type: "accuracy", value: bn.accuracy, ...(bn.aimedOnly ? { requires: { aimed: true } } : {}), label: `${w.name}: accurate` });
    if (bn.strong) traits.push({ type: "marginDamage", margin: 5, damage: { boxes: w.boxes + 1 }, label: `${w.name}: strong hit` });
    PACK.arms.push({ id: w.id, name: w.name, skill: w.skill, homebrew: true, traits, ...(bn.materials && bn.materials.length ? { materials: bn.materials } : {}),
      ...(w.kind === "melee" ? { reach: "melee", reachYards: w.reach, damage: { melee: { boxes: w.boxes } } } : { band: w.band, damage: { any: { boxes: w.boxes } } }),
      ...(w.rounds ? { ammo: w.id, firearm: true } : {}),
      rows: [[`${w.name} (homebrew)`, range, String(w.boxes), w.note || "—"]] });
    if (w.rounds && PACK.weapons && PACK.weapons.items) PACK.weapons.items[w.id] = [w.name, w.rounds];
    PACK.equipment.push([w.id, `${w.name} (homebrew)`, `${w.note ? w.note + " " : ""}Hits mark ${w.boxes} box${w.boxes === 1 ? "" : "es"}. ${range}${w.rounds ? `; ${w.rounds} shots` : ""}.`]);
  }
  const arm = (id) => PACK.arms.find((a) => a.id === id);
  for (const t of hb.threats) {
    const ws = t.weapons.map(arm).filter(Boolean);
    PACK.threats.push({ id: t.id, name: t.name, label: `${t.name} (homebrew${t.minor ? ", minor" : ""})`, minor: t.minor, homebrew: true,
      attacks: [...new Set(ws.map((a) => a.skill))].map((skill) => ({ skill, target: t.target })), dodge: t.dodge, boxes: t.boxes, boxesText: String(t.boxes),
      weaponText: ws.map((a) => a.name).join(", "), weapons: ws.map((a) => a.id), trait: t.trait || "Homebrew", traitText: t.traitText || "A GM's own creation.", traits: hbThreatTraits(PACK, t) });
  }
  for (const x of hb.edges) PACK.extraEdges.push([x.id, `${x.name} (homebrew)`, x.text, x.limit]);
  PACK.hbEdges = hb.edges.map((x) => ({ id: x.id, name: x.name, bonus: x.bonus }));
  const has = hbHas(PACK);
  if (has.spells) for (const x of hb.spells) {
    PACK.spells.list.push([x.id, `${x.name} (homebrew)`, x.text]);
    if (x.attack && x.attack.boxes) PACK.arms.push({ id: x.id + "-attack", name: x.name, skill: PACK.spells.skill, cantrip: x.id, homebrew: true, traits: [], band: x.attack.band,
      damage: { any: { boxes: x.attack.boxes } }, rows: [[`${x.name} (homebrew)`, band(x.attack.band), String(x.attack.boxes), x.text]] });
  }
  if (has.cards && hb.cards.length) PACK.discovery.subjects = [...(PACK.discovery.subjects || []), ...hb.cards.map((x) => [x.id, x.name, x.knowledge, x.permits || ""])];
  if (has.rituals) PACK.ritualBook = hb.rituals.map((x) => ({ ...x }));
  if (has.powers) for (const x of hb.powers) {
    const cls = []; x.classes.forEach((c, i) => cls.push(c || `As Class ${hbClasses()[i - 1]}, stronger: the GM sets how much.`));
    PACK.powers.list.push([x.id, `${x.name} (homebrew)`, x.group, cls, x.gm ? { gm: true } : {}, x.variety || ""]);
  }
}

function mountHomebrew(api) {
  const { PACK, esc } = api, say = (m, err) => (api.toast ? api.toast(m, err) : null);
  let hb = hbLoad(PACK), changed = false, offered = null, editing = null; // editing: [kind, id] being edited
  const EDGES = api.edges !== false, HAS = hbHas(PACK), M = PACK.magic || {}, D = PACK.discovery || {};
  const cap = (x) => (x ? x[0].toUpperCase() + x.slice(1) : x);
  // A setting's own words: hexes or cantrips or psionic powers; lore cards or data records; rituals or workings.
  const W = { spell: M.burst || (HAS.spells ? PACK.spells.plural.toLowerCase().replace(/s$/, "") : "spell"), spells: M.bursts || (HAS.spells ? PACK.spells.plural.toLowerCase() : "spells"),
    card: D.card || "card", cards: D.cards || "cards", ritual: M.working || "ritual", rituals: M.workings || "rituals" };
  const SKILLS = hbSkills(PACK);
  const armsBuilt = (PACK.arms || []).filter((a) => !a.hazard && !a.homebrew);
  const opts = (list, sel) => list.map(([v, n]) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(n)}</option>`).join("");
  const store = () => { if (!hbSave(PACK, hb)) say("This browser won't keep the homebrew: save it to a file.", true); changed = true; render(); };
  const summary = (h) => [[h.threats.length, "threat", "threats"], [h.weapons.length, "weapon", "weapons"], ...(EDGES ? [[h.edges.length, "Edge", "Edges"]] : []),
    ...(HAS.cards ? [[h.cards.length, W.card, W.cards]] : []), ...(HAS.powers ? [[h.powers.length, "power", "powers"]] : []), ...(HAS.spells ? [[h.spells.length, W.spell, W.spells]] : []), ...(HAS.rituals ? [[h.rituals.length, W.ritual, W.rituals]] : [])]
    .filter(([n]) => n).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`).join(", ") || "nothing yet";
  const weightOf = (k) => hbWeights().find((w) => w[0] === k) || hbWeights()[0];
  const ritualLine = (x) => `${weightOf(x.weight)[1]} (${weightOf(x.weight)[2]} segments)${x.time ? `, ${x.time}` : ""}: ${x.text}${x.price ? ` Price: ${x.price}` : ""}`;
  const weaponLine = (w) => `${w.skill}; ${w.kind === "melee" ? `melee, reach ${w.reach} yd` : (hbBands().find((b) => b[0] === w.band) || [])[1] + " range"}; ${w.boxes} box${w.boxes === 1 ? "" : "es"}${w.rounds ? `; ${w.rounds} shots` : ""}`;
  const threatLine = (t) => `${t.minor ? "Minor; " : ""}attacks at ${t.target}, Dodge ${t.dodge}, ${t.boxes} box${t.boxes === 1 ? "" : "es"}; ${t.weapons.map((id) => (hb.weapons.find((w) => w.id === id) || armsBuilt.find((a) => a.id === id) || {}).name || id).join(", ")}`;
  const item = (kind, x, line) => `<li><b>${esc(x.name)}</b> <span class="muted small">${esc(line)}</span>
    <span class="btn-row" style="display:inline-flex;margin:0 0 0 6px"><button type="button" class="linkish" data-hbedit="${kind}" data-id="${esc(x.id)}">Edit</button><button type="button" class="linkish" data-hbdel="${kind}" data-id="${esc(x.id)}">Delete</button></span></li>`;
  const find = (kind, id) => (hb[kind] || []).find((x) => x.id === id) || null;
  // The bonus menus: what's chosen here, the table works out.
  const MATS = PACK.materials || [], matName = (id) => ((MATS.find((m) => m[0] === id) || [id, id])[1]);
  const box = (name, on, label) => `<label><input type="checkbox" name="${name}"${on ? " checked" : ""}> ${label}</label>`;
  const matBoxes = (name, sel) => MATS.length ? `<div class="checks">${MATS.map(([id, n]) => box(`${name}:${id}`, (sel || []).includes(id), esc(n))).join("")}</div>` : "";
  const bonusBlock = (inner) => `<fieldset class="field wide hb-bonus"><legend class="label">Bonuses the table works out</legend>${inner}</fieldset>`;
  const plus = (n) => (n > 0 ? "+" + n : String(n));
  const weaponBonusLine = (b) => !b ? "" : [b.accuracy ? `${plus(b.accuracy)} to hit${b.aimedOnly ? " when aimed" : ""}` : "", b.strong ? "+1 box on success by 5" : "", (b.materials || []).length ? b.materials.map(matName).join(", ") : ""].filter(Boolean).join("; ");
  const threatBonusLine = (b) => !b ? "" : [b.armor ? "hard hide" : "", b.hardToHit ? `${plus(-b.hardToHit)} to hit it` : "", (b.weak || []).length ? `weak to ${b.weak.map(matName).join(", ")}` : "",
    (b.onlyBy || []).length ? `only ${b.onlyBy.map(matName).join(" or ")} ${b.onlyMax ? "marks more than 1" : "hurts it"}` : "", b.shrug ? "shrugs off a 1-box hit once" : "", b.extraDefense ? "a second defense" : ""].filter(Boolean).join("; ");
  const edgeBonusLine = (b) => !b ? "" : [b.skillValue ? `${plus(b.skillValue)} ${b.skill}` : "", b.dodge ? `${plus(b.dodge)} Dodge` : "", b.move ? `+${b.move} yd Move` : "", b.extraDefense ? "a second defense in fights" : "", b.shrugTelling ? "shrugs off a telling hit once a fight" : ""].filter(Boolean).join("; ");
  const withBonus = (line, b) => (b ? `${line}. Bonuses: ${b}` : line);
  const checkedMats = (f, name) => MATS.map(([id]) => id).filter((id) => f.elements[`${name}:${id}`] && f.elements[`${name}:${id}`].checked);

  function weaponForm() {
    const w = editing && editing[0] === "weapons" ? find("weapons", editing[1]) : null, melee = !w || w.kind === "melee";
    return `<form data-hbform="weapons" class="fields">
      <div class="field"><label>Name</label><input name="name" maxlength="40" required value="${esc(w ? w.name : "")}" placeholder="e.g. Silver-edged saber"></div>
      <div class="field"><label>Skill</label><select name="skill">${opts(SKILLS.map((s) => [s, s]), w ? w.skill : SKILLS[0])}</select></div>
      <div class="field"><label>Kind</label><select name="kind">${opts([["melee", "In hand (melee)"], ["ranged", "Ranged"]], melee ? "melee" : "ranged")}</select></div>
      <div class="field"><label>Hits mark (boxes)</label><select name="boxes">${opts([1, 2, 3, 4].map((n) => [String(n), String(n)]), String(w ? w.boxes : 1))}</select></div>
      <div class="field" data-hbmelee${melee ? "" : " hidden"}><label>Reach (yards)</label><select name="reach">${opts([1, 2, 3].map((n) => [String(n), String(n)]), String(w && w.reach ? w.reach : 1))}</select></div>
      <div class="field" data-hbranged${melee ? " hidden" : ""}><label>Range</label><select name="band">${opts(hbBands(), w && w.band ? w.band : "close")}</select></div>
      <div class="field" data-hbranged${melee ? " hidden" : ""}><label>Shots before reloading (0 = none to track)</label><input name="rounds" type="number" min="0" max="30" value="${w && w.rounds ? w.rounds : 0}"></div>
      <div class="field wide"><label>Note (what a hit does, any special rule, agreed at the table)</label><input name="note" maxlength="200" value="${esc(w ? w.note : "")}"></div>
      ${bonusBlock(`<div class="fields"><div class="field"><label>Accuracy</label><select name="b-accuracy">${opts([["0", "None"], ["1", "+1 to hit"], ["2", "+2 to hit"]], String(w && w.bonus ? w.bonus.accuracy : 0))}</select></div>
        <div class="field"><div class="checks">${box("b-aimed", w && w.bonus && w.bonus.aimedOnly, "Only when aimed")}${box("b-strong", w && w.bonus && w.bonus.strong, "Strong hit: success by 5 marks 1 more box")}</div></div></div>
        ${MATS.length ? `<span class="small muted">Made of (counts against weaknesses):</span>${matBoxes("b-mat", w && w.bonus && w.bonus.materials)}` : ""}`)}
      <div class="btn-row field wide"><button class="btn primary" type="submit">${w ? "Save changes" : "Add the weapon"}</button>${w ? `<button type="button" class="linkish" data-hbcancel>Cancel</button>` : ""}</div></form>`;
  }
  function threatForm() {
    const t = editing && editing[0] === "threats" ? find("threats", editing[1]) : null;
    const arms = [...armsBuilt.map((a) => [a.id, a.name]), ...hb.weapons.map((w) => [w.id, `${w.name} (homebrew)`])];
    const sel = (i) => `<select name="w${i}">${i ? `<option value="">None</option>` : ""}${opts(arms, t ? t.weapons[i] || "" : i ? "" : arms[0] && arms[0][0])}</select>`;
    return `<form data-hbform="threats" class="fields">
      <div class="field"><label>Name</label><input name="name" maxlength="40" required value="${esc(t ? t.name : "")}" placeholder="e.g. Ghoul"></div>
      <div class="field"><label><input type="checkbox" name="minor"${t && t.minor ? " checked" : ""}> Minor (1 box, goes down fast)</label></div>
      <div class="field"><label>Attack target (3–18)</label><input name="target" type="number" min="3" max="18" value="${t ? t.target : 12}"></div>
      <div class="field"><label>Dodge (3–18)</label><input name="dodge" type="number" min="3" max="18" value="${t ? t.dodge : 8}"></div>
      <div class="field"><label>Injury boxes (1–6)</label><input name="boxes" type="number" min="1" max="6" value="${t ? t.boxes : 3}"></div>
      <div class="field"><label>Weapon</label>${sel(0)}</div><div class="field"><label>Second weapon</label>${sel(1)}</div><div class="field"><label>Third weapon</label>${sel(2)}</div>
      <div class="field"><label>Special trait</label><input name="trait" maxlength="40" value="${esc(t ? t.trait : "")}" placeholder="e.g. Grave-cold"></div>
      <div class="field wide"><label>What it does (the GM applies it)</label><input name="traitText" maxlength="300" value="${esc(t ? t.traitText : "")}" placeholder="e.g. Fire marks 1 more box; ordinary weapons 1 fewer (minimum 1)."></div>
      ${(() => { const b = (t && t.bonus) || {}; return bonusBlock(`<div class="checks">${box("b-armor", b.armor, "Hard hide: a hit of 2 or more boxes marks 1 fewer")}${box("b-shrug", b.shrug, "Shrugs off a 1-box hit once a fight")}${box("b-xdef", b.extraDefense, "Quick: a second defense each round")}</div>
        <div class="field"><label>Hard to hit</label><select name="b-hard">${opts([["0", "No"], ["1", "Attacks at −1"], ["2", "Attacks at −2"]], String(b.hardToHit || 0))}</select></div>
        ${MATS.length ? `<span class="small muted">Weak to (marks 1 more box):</span>${matBoxes("b-weak", b.weak)}
        <span class="small muted">Only hurt by:</span>${matBoxes("b-only", b.onlyBy)}<div class="field"><label>Anything else</label><select name="b-onlymax">${opts([["1", "marks at most 1 box"], ["0", "marks nothing"]], String(b.onlyMax ?? 1))}</select></div>` : ""}`); })()}
      <div class="btn-row field wide"><button class="btn primary" type="submit">${t ? "Save changes" : "Add the threat"}</button>${t ? `<button type="button" class="linkish" data-hbcancel>Cancel</button>` : ""}</div></form>`;
  }
  function edgeForm() {
    const x = editing && editing[0] === "edges" ? find("edges", editing[1]) : null;
    return `<form data-hbform="edges" class="fields">
      <div class="field"><label>Name</label><input name="name" maxlength="40" required value="${esc(x ? x.name : "")}" placeholder="e.g. Iron stomach"></div>
      <div class="field"><label>Can be taken</label><select name="limit">${opts([["1", "Once"], ["2", "Up to twice"], ["3", "Up to three times"]], String(x ? x.limit : 1))}</select></div>
      <div class="field wide"><label>What it gives (the GM applies it)</label><input name="text" maxlength="300" required value="${esc(x ? x.text : "")}" placeholder="e.g. Once per session, ignore a poison or bad water."></div>
      ${(() => { const b = (x && x.bonus) || {}, skills = (PACK.skills || []).map((k) => [k[0], k[0]]); return bonusBlock(`<div class="fields">
        <div class="field"><label>Skill bonus</label><select name="b-skill"><option value="">None</option>${opts(skills, b.skill || "")}</select></div>
        <div class="field"><label>By</label><select name="b-skillv">${opts([["1", "+1"], ["2", "+2"]], String(b.skillValue || 1))}</select></div>
        <div class="field"><label>Move</label><select name="b-move">${opts([["0", "No change"], ["1", "+1 yd"], ["2", "+2 yd"], ["3", "+3 yd"]], String(b.move || 0))}</select></div></div>
        <div class="checks">${box("b-dodge", b.dodge, "+1 Dodge")}${box("b-xdef", b.extraDefense, "A second defense in fights")}${box("b-shrugt", b.shrugTelling, "Shrug off a telling hit once a fight")}</div>
        <span class="small muted">An Edge with a number bonus is taken once.</span>`); })()}
      <div class="btn-row field wide"><button class="btn primary" type="submit">${x ? "Save changes" : "Add the Edge"}</button>${x ? `<button type="button" class="linkish" data-hbcancel>Cancel</button>` : ""}</div></form>`;
  }
  const formOf = (kind, fields, label) => {
    const x = editing && editing[0] === kind ? find(kind, editing[1]) : null;
    return `<form data-hbform="${kind}" class="fields">${fields(x)}
      <div class="btn-row field wide"><button class="btn primary" type="submit">${x ? "Save changes" : label}</button>${x ? `<button type="button" class="linkish" data-hbcancel>Cancel</button>` : ""}</div></form>`;
  };
  const input = (x, name, label, max, ph, wide) => `<div class="field${wide ? " wide" : ""}"><label>${label}</label><input name="${name}" maxlength="${max}" value="${esc(x ? x[name] || "" : "")}" placeholder="${esc(ph)}"></div>`;
  const spellForm = () => formOf("spells", (x) => input(x, "name", "Name", 40, "e.g. Grave Chill") + input(x, "text", "What it does (range, boxes, who resists)", 300, "e.g. A creeping cold at Close range; 1 box, and the target is Stunned (Will resists).", true) +
    bonusBlock(`<div class="fields"><div class="field"><label>An attack?</label><select name="b-atk">${opts([["0", "No: the GM applies it"], ["1", "Yes: marks 1 box"], ["2", "Yes: marks 2 boxes"], ["3", "Yes: marks 3 boxes"]], String(x && x.attack ? x.attack.boxes : 0))}</select></div>
      <div class="field"><label>Range</label><select name="b-band">${opts(hbBands(), x && x.attack ? x.attack.band : "short")}</select></div></div>
      <span class="small muted">An attack ${esc(W.spell)} can be cast in the Encounter panel by anyone who knows it, with ${esc(PACK.spells ? PACK.spells.skill : "the spell skill")}; Dodge applies.</span>`), `Add the ${W.spell}`);
  const cardForm = () => formOf("cards", (x) => input(x, "name", "Subject", 40, "e.g. Ghoul") + input(x, "knowledge", "What's true", 300, "e.g. Fire hurts it; it can't cross running water.", true) + input(x, "permits", "What it permits", 200, "e.g. Burning or drowning one with fire or a river crossing.", true), `Add the ${W.card}`);
  const ritualForm = () => formOf("rituals", (x) => input(x, "name", "Name", 40, "e.g. Salt Circle") +
    `<div class="field"><label>Weight</label><select name="weight">${opts(hbWeights().map(([k, n, seg]) => [k, `${n} (${seg} segments)`]), x ? x.weight : "minor")}</select></div>` +
    input(x, "time", "Time a roll", 40, "e.g. ten minutes") + input(x, "text", "What it does", 300, "e.g. Nothing unnatural crosses the circle until dawn.", true) + input(x, "price", "Price", 120, "e.g. a box of The Dark if it fails", true), `Add the ${W.ritual}`);
  const powerForm = () => formOf("powers", (x) => input(x, "name", "Name", 40, "e.g. Shadow Step") +
    `<div class="field"><label>Group</label><select name="group">${opts((PACK.powers && PACK.powers.groups) || [], x ? x.group : "")}</select></div>` +
    hbClasses().map((c, i) => `<div class="field wide"><label>Class ${c}${i ? " (blank: the GM decides)" : ""}</label><input name="c${i}" maxlength="200" value="${esc(x ? x.classes[i] : "")}" placeholder="${i ? "" : "e.g. Step from one shadow to another you can see, up to 10 yd."}"></div>`).join("") +
    `<div class="field"><label><input type="checkbox" name="gm"${x && x.gm ? " checked" : ""}> Needs the GM's approval</label></div>` +
    input(x, "variety", "Kinds it comes in (optional)", 120, "e.g. darkness, smoke or mirrors", true), "Add the power");
  const section = (kind, title, list, line, form) => `<details class="hb-sec"${editing && editing[0] === kind ? " open" : ""}><summary class="label">${title} (${list.length})</summary>
    <ul class="small adv-list">${list.map((x) => item(kind, x, line(x))).join("") || `<li class="muted">None yet.</li>`}</ul>${list.length >= hbLimits()[kind] && !(editing && editing[0] === kind) ? `<p class="small muted">That's the most this keeps (${hbLimits()[kind]}).</p>` : form()}</details>`;

  function render() {
    if (api.gmRoot) {
      api.gmRoot.innerHTML = `<h3>Homebrew</h3>
        <p class="small muted">Your own threats, weapons${EDGES ? ", Edges" : ""}${HAS.cards ? `, ${W.cards}` : ""}${HAS.powers ? ", powers" : ""}${HAS.spells ? `, ${W.spells}` : ""}${HAS.rituals ? ` and ${W.rituals}` : ""}, made here: no code. They work like the setting's own, marked <i>homebrew</i>: threats in the Encounter panel and on the battle map, weapons in characters' gear${EDGES ? " and the roller, Edges in the creator" : ""}${HAS.cards ? `, ${W.cards} where you record findings` : ""}${HAS.powers ? ", powers among the creator's choices" : ""}${HAS.spells ? `, ${W.spells} among the creator's choices` : ""}${HAS.rituals ? `, ${W.rituals} in a ${W.ritual} book beside Rituals by heart` : ""}. Keep numbers in line with the setting's (see <i>Making your own</i> in the core rules); anything special is a note you apply at the table.</p>
        <p class="small"><b>In this browser:</b> ${esc(summary(hb))}${hb.from === "gm" ? " (shared by your GM)" : ""}. Players get it when they join your shared table, or from a file.</p>
        ${changed ? `<p class="small hb-reload"><b>Saved.</b> Reload the page to use the changes. <button type="button" class="btn" data-hbreload>Reload now</button></p>` : ""}
        <div class="btn-row"><button type="button" class="btn" data-hbexport${hbCount(hb) ? "" : " disabled"}>Save to file</button>
          <label class="btn" tabindex="0">Open file<input type="file" accept=".json,application/json,text/plain" class="visually-hidden" data-hbimport></label></div>
        ${section("threats", "Threats", hb.threats, (t) => withBonus(threatLine(t), threatBonusLine(t.bonus)), threatForm)}
        ${section("weapons", "Weapons", hb.weapons, (w) => withBonus(weaponLine(w), weaponBonusLine(w.bonus)), weaponForm)}
        ${EDGES ? section("edges", "Edges", hb.edges, (x) => withBonus(`${x.limit === 1 ? "once" : `up to ${x.limit}×`}: ${x.text}`, edgeBonusLine(x.bonus)), edgeForm) : ""}
        ${HAS.cards ? section("cards", cap(W.cards), hb.cards, (x) => `${x.knowledge}${x.permits ? ` Permits: ${x.permits}` : ""}`, cardForm) : ""}
        ${HAS.powers ? section("powers", "Powers", hb.powers, (x) => `${x.gm ? "GM's approval; " : ""}Class I: ${x.classes[0]}`, powerForm) : ""}
        ${HAS.spells ? section("spells", cap(W.spells), hb.spells, (x) => withBonus(x.text, x.attack && x.attack.boxes ? `an attack, ${x.attack.boxes} box${x.attack.boxes === 1 ? "" : "es"} at ${(hbBands().find((b) => b[0] === x.attack.band) || [])[1]} range` : ""), spellForm) : ""}
        ${HAS.rituals ? section("rituals", cap(W.rituals), hb.rituals, ritualLine, ritualForm) : ""}`;
    }
    if (api.fileRoot) {
      api.fileRoot.innerHTML = `<div class="eyebrow">Homebrew</div>
        <p class="small muted">${hbCount(hb) ? `${esc(summary(hb))}${hb.from === "gm" ? ", from your GM" : ""}.` : "Your GM's own threats, weapons and more, if they share a file."}</p>
        <div class="btn-row"><label class="btn" tabindex="0">Open homebrew file<input type="file" accept=".json,application/json,text/plain" class="visually-hidden" data-hbimport></label>
        ${hbCount(hb) ? `<button type="button" class="linkish" data-hbclear>Remove it</button>` : ""}</div>
        ${changed ? `<p class="small"><button type="button" class="btn" data-hbreload>Reload to use it</button></p>` : ""}`;
    }
    if (api.ritualRoot) {
      const book = PACK.ritualBook || [];
      api.ritualRoot.hidden = !book.length;
      api.ritualRoot.innerHTML = book.length ? `<details><summary class="label">Your GM's ${esc(W.ritual)} book (${book.length})</summary><ul class="small adv-list">${book.map((x) =>
        `<li><b>${esc(x.name)}</b> <span class="muted">${esc(ritualLine(x))}</span>${api.heartInput ? ` <button type="button" class="linkish" data-hbheart="${esc(x.name)}">Know it by heart</button>` : ""}</li>`).join("")}</ul></details>` : "";
    }
    if (api.noteRoot) {
      api.noteRoot.hidden = !offered;
      api.noteRoot.innerHTML = offered ? `<h3>Homebrew from your GM</h3><p class="small">${esc(summary(offered))}: their own additions to this game.</p>
        <div class="btn-row"><button type="button" class="btn primary" data-hbuse>Use it</button><button type="button" class="linkish" data-hbskip>Not now</button></div>` : "";
    }
  }
  const replaceWith = (raw, from) => { const next = hbClean({ ...raw, from }, PACK); hb = next; editing = null; store(); return next; };
  function readForm(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value : ""), kind = f.dataset.hbform, id = editing && editing[0] === kind ? editing[1] : undefined;
    const on = (n) => !!(f.elements[n] && f.elements[n].checked);
    if (kind === "weapons") return { id, name: v("name"), skill: v("skill"), kind: v("kind"), boxes: v("boxes"), reach: v("reach"), band: v("band"), rounds: v("rounds"), note: v("note"),
      bonus: { accuracy: v("b-accuracy"), aimedOnly: on("b-aimed"), strong: on("b-strong"), materials: checkedMats(f, "b-mat") } };
    if (kind === "threats") return { id, name: v("name"), minor: f.elements.minor.checked, target: v("target"), dodge: v("dodge"), boxes: v("boxes"), weapons: [v("w0"), v("w1"), v("w2")].filter(Boolean), trait: v("trait"), traitText: v("traitText"),
      bonus: { armor: on("b-armor"), hardToHit: v("b-hard"), weak: checkedMats(f, "b-weak"), onlyBy: checkedMats(f, "b-only"), onlyMax: v("b-onlymax") || 1, shrug: on("b-shrug"), extraDefense: on("b-xdef") } };
    if (kind === "spells") return { id, name: v("name"), text: v("text"), attack: { boxes: v("b-atk"), band: v("b-band") } };
    if (kind === "powers") return { id, name: v("name"), group: v("group"), classes: hbClasses().map((_, i) => v("c" + i)), gm: f.elements.gm.checked, variety: v("variety") };
    if (kind === "cards") return { id, name: v("name"), knowledge: v("knowledge"), permits: v("permits") };
    if (kind === "rituals") return { id, name: v("name"), weight: v("weight"), time: v("time"), text: v("text"), price: v("price") };
    return { id, name: v("name"), limit: v("limit"), text: v("text"),
      bonus: { skill: v("b-skill"), skillValue: v("b-skill") ? v("b-skillv") : 0, dodge: on("b-dodge") ? 1 : 0, move: v("b-move"), extraDefense: on("b-xdef"), shrugTelling: on("b-shrugt") } };
  }
  const roots = () => [api.gmRoot, api.fileRoot, api.noteRoot, api.ritualRoot].filter(Boolean);
  for (const root of roots()) {
    root.addEventListener("submit", (e) => {
      const f = e.target.closest("[data-hbform]"); if (!f) return; e.preventDefault();
      const kind = f.dataset.hbform, entry = readForm(f), list = hb[kind].slice();
      const at = entry.id ? list.findIndex((x) => x.id === entry.id) : -1;
      if (at >= 0) list[at] = entry; else list.push(entry);
      const next = hbClean({ ...hb, [kind]: list }, PACK);
      if (next[kind].length < list.length) { say({ threats: "A threat needs a name and at least one weapon.", edges: "An Edge needs a name and what it gives.", weapons: "A weapon needs a name.",
        spells: `A ${W.spell} needs a name and what it does.`, powers: "A power needs a name and what it does at Class I.", cards: `A ${W.card} needs a subject and what's true.`, rituals: `A ${W.ritual} needs a name and what it does.` }[kind], true); return; }
      hb = next; editing = null; hb.from = "mine"; store(); say(at >= 0 ? "Saved." : "Added.");
    });
    root.addEventListener("change", async (e) => {
      const t = e.target;
      if (t.name === "kind" && t.closest("[data-hbform]")) { const f = t.closest("form"); f.querySelectorAll("[data-hbmelee]").forEach((x) => (x.hidden = t.value !== "melee")); f.querySelectorAll("[data-hbranged]").forEach((x) => (x.hidden = t.value === "melee")); return; }
      if (!t.matches("[data-hbimport]") || !t.files || !t.files[0]) return;
      try {
        const d = JSON.parse(await t.files[0].text());
        if (!d || d.format !== PACK.id + "-homebrew") throw new Error(d && /-homebrew$/.test(d.format || "") ? "That homebrew is for another game." : "That isn't a homebrew file for this game.");
        if (hbCount(hb) && !confirm(`Replace this browser's homebrew (${summary(hb)}) with the file's?`)) return;
        const n = replaceWith(d, api.gmRoot && root === api.gmRoot ? "mine" : "gm");
        say(`Homebrew loaded: ${summary(n)}. Reload to use it.`);
      } catch (err) { say(err.message && !/JSON/.test(err.message) ? err.message : "That file couldn't be read.", true); }
      finally { t.value = ""; }
    });
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.matches("[data-hbreload]")) { location.reload(); return; }
      if (b.matches("[data-hbheart]") && api.heartInput) { // add the ritual to Rituals by heart, as if typed there
        const f = api.heartInput, have = f.value.split(",").map((x) => x.trim()).filter(Boolean);
        if (!have.includes(b.dataset.hbheart)) { f.value = [...have, b.dataset.hbheart].join(", "); f.dispatchEvent(new Event("input", { bubbles: true })); }
        return;
      }
      if (b.matches("[data-hbexport]")) { api.saveText(JSON.stringify({ format: PACK.id + "-homebrew", version: 1, ...JSON.parse(hbBody(hb)) }, null, 1), `${PACK.terms.title} homebrew.json`, say); return; }
      if (b.matches("[data-hbedit]")) { editing = [b.dataset.hbedit, b.dataset.id]; render(); return; }
      if (b.matches("[data-hbcancel]")) { editing = null; render(); return; }
      if (b.matches("[data-hbdel]")) {
        const kind = b.dataset.hbdel, x = find(kind, b.dataset.id); if (!x) return;
        if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to delete"; return; }
        hb = hbClean({ ...hb, [kind]: hb[kind].filter((y) => y.id !== x.id) }, PACK); store(); say(`${x.name} deleted.`); return;
      }
      if (b.matches("[data-hbclear]")) { if (confirm("Remove this browser's homebrew?")) { hb = hbClean(null, PACK); store(); } return; }
      if (b.matches("[data-hbuse]") && offered) { replaceWith(offered, "gm"); offered = null; location.reload(); return; }
      if (b.matches("[data-hbskip]")) { offered = null; render(); }
    });
  }
  render();
  return {
    snapshot: () => (hbCount(hb) && hb.from === "mine" ? JSON.parse(hbBody(hb)) : null),
    /** The GM's homebrew, from the shared table: offered once, if it differs from what this browser has. */
    receive: (raw) => {
      if (!raw || typeof raw !== "object") return;
      const n = hbClean(raw, PACK);
      if (!hbCount(n) || hbBody(n) === hbBody(hb) || (offered && hbBody(n) === hbBody(offered))) return;
      offered = n; render(); say("Your GM shared their homebrew: see the play tab.");
    },
  };
}
