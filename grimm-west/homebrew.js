// Homebrew: a GM's own threats, weapons and Edges, made in the GM view without touching any code. Plain script,
// inlined by tools/build-legend.py (/* HOMEBREW */) and tools/build-guide.py (HOMEBREW markers); no modules, no page globals.
//
// hbLoad(game) reads this browser's homebrew; hbApply(PACK, hb) adds it to the page's data before anything reads it,
// so the creator, the roller, the Encounter panel and the battle map treat it like the setting's own (marked
// "homebrew"). Changes take effect on the next page load.
// mountHomebrew(api) with api: { PACK (as built, before hbApply), game, gmRoot (the GM view's Homebrew card),
//   noteRoot (a card on the play tab for homebrew the GM shares), fileRoot (the Character file panel), esc, toast,
//   saveText(text, name, say), edges (false for a game without Edges) } returns { snapshot() (what the shared table
//   sends players, or null), receive(hb) }.
// Sharing: as a file (Save to file / Open file), or through the shared table: players who join get the GM's homebrew
// and choose to use it.
// Function declarations only, above mountHomebrew: hbLoad and hbApply run as the page starts, before this file's place.
function hbLimits() { return { threats: 30, weapons: 30, edges: 20 }; }
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
      boxes: hbInt(w.boxes, 1, 4, 1), note: hbText(w.note, 200) };
  }).filter(Boolean);
  const armIds = new Set([...(PACK.arms || []).filter((a) => !a.hazard && !a.homebrew).map((a) => a.id), ...weapons.map((w) => w.id)]);
  const threats = (Array.isArray(r.threats) ? r.threats : []).slice(0, hbLimits().threats).map((t) => {
    const name = hbText(t && t.name, 40); if (!name) return null;
    const ws = [...new Set((Array.isArray(t.weapons) ? t.weapons : []).filter((id) => armIds.has(id)))].slice(0, 3);
    if (!ws.length) return null;
    return { id: hbId(t.id, name, taken), name, minor: !!t.minor, target: hbInt(t.target, 3, 18, 12), dodge: hbInt(t.dodge, 3, 18, 8),
      boxes: t.minor ? 1 : hbInt(t.boxes, 1, 6, 3), weapons: ws, trait: hbText(t.trait, 40), traitText: hbText(t.traitText, 300) };
  }).filter(Boolean);
  const edges = (Array.isArray(r.edges) ? r.edges : []).slice(0, hbLimits().edges).map((x) => {
    const name = hbText(x && x.name, 40), text = hbText(x && x.text, 300); if (!name || !text) return null;
    return { id: hbId(x.id, name, taken), name, text, limit: hbInt(x.limit, 1, 3, 1) };
  }).filter(Boolean);
  return { threats, weapons, edges, from: r.from === "gm" ? "gm" : "mine" };
}
function hbCount(hb) { return hb ? hb.threats.length + hb.weapons.length + hb.edges.length : 0; }
function hbBody(hb) { return JSON.stringify({ threats: hb.threats, weapons: hb.weapons, edges: hb.edges }); }
function hbLoad(PACK) {
  try { return hbClean(JSON.parse(localStorage.getItem(hbKey(PACK.id)) || "null"), PACK); } catch { return hbClean(null, PACK); }
}
function hbSave(PACK, hb) { try { localStorage.setItem(hbKey(PACK.id), JSON.stringify(hb)); return true; } catch { return false; } }

/** Add homebrew to the page's data, as the setting's own entries are shaped. */
function hbApply(PACK, hb) {
  if (!hbCount(hb)) return;
  PACK.arms = PACK.arms || []; PACK.threats = PACK.threats || []; PACK.extraEdges = PACK.extraEdges || []; PACK.equipment = PACK.equipment || [];
  const band = (b) => (hbBands().find((x) => x[0] === b) || ["", b])[1];
  for (const w of hb.weapons) {
    const range = w.kind === "melee" ? `Melee, reach ${w.reach} yd` : band(w.band);
    PACK.arms.push({ id: w.id, name: w.name, skill: w.skill, homebrew: true, traits: [],
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
      weaponText: ws.map((a) => a.name).join(", "), weapons: ws.map((a) => a.id), trait: t.trait || "Homebrew", traitText: t.traitText || "A GM's own creation." });
  }
  for (const x of hb.edges) PACK.extraEdges.push([x.id, `${x.name} (homebrew)`, x.text, x.limit]);
}

function mountHomebrew(api) {
  const { PACK, esc } = api, say = (m, err) => (api.toast ? api.toast(m, err) : null);
  let hb = hbLoad(PACK), changed = false, offered = null, editing = null; // editing: [kind, id] being edited
  const EDGES = api.edges !== false;
  const SKILLS = hbSkills(PACK);
  const armsBuilt = (PACK.arms || []).filter((a) => !a.hazard && !a.homebrew);
  const opts = (list, sel) => list.map(([v, n]) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(n)}</option>`).join("");
  const store = () => { if (!hbSave(PACK, hb)) say("This browser won't keep the homebrew: save it to a file.", true); changed = true; render(); };
  const summary = (h) => [[h.threats.length, "threat"], [h.weapons.length, "weapon"], ...(EDGES ? [[h.edges.length, "Edge"]] : [])].filter(([n]) => n).map(([n, w]) => `${n} ${w}${n === 1 ? "" : "s"}`).join(", ") || "nothing yet";
  const weaponLine = (w) => `${w.skill}; ${w.kind === "melee" ? `melee, reach ${w.reach} yd` : (hbBands().find((b) => b[0] === w.band) || [])[1] + " range"}; ${w.boxes} box${w.boxes === 1 ? "" : "es"}${w.rounds ? `; ${w.rounds} shots` : ""}`;
  const threatLine = (t) => `${t.minor ? "Minor; " : ""}attacks at ${t.target}, Dodge ${t.dodge}, ${t.boxes} box${t.boxes === 1 ? "" : "es"}; ${t.weapons.map((id) => (hb.weapons.find((w) => w.id === id) || armsBuilt.find((a) => a.id === id) || {}).name || id).join(", ")}`;
  const item = (kind, x, line) => `<li><b>${esc(x.name)}</b> <span class="muted small">${esc(line)}</span>
    <span class="btn-row" style="display:inline-flex;margin:0 0 0 6px"><button type="button" class="linkish" data-hbedit="${kind}" data-id="${esc(x.id)}">Edit</button><button type="button" class="linkish" data-hbdel="${kind}" data-id="${esc(x.id)}">Delete</button></span></li>`;
  const find = (kind, id) => (hb[kind] || []).find((x) => x.id === id) || null;

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
      <div class="btn-row field wide"><button class="btn primary" type="submit">${t ? "Save changes" : "Add the threat"}</button>${t ? `<button type="button" class="linkish" data-hbcancel>Cancel</button>` : ""}</div></form>`;
  }
  function edgeForm() {
    const x = editing && editing[0] === "edges" ? find("edges", editing[1]) : null;
    return `<form data-hbform="edges" class="fields">
      <div class="field"><label>Name</label><input name="name" maxlength="40" required value="${esc(x ? x.name : "")}" placeholder="e.g. Iron stomach"></div>
      <div class="field"><label>Can be taken</label><select name="limit">${opts([["1", "Once"], ["2", "Up to twice"], ["3", "Up to three times"]], String(x ? x.limit : 1))}</select></div>
      <div class="field wide"><label>What it gives (the GM applies it)</label><input name="text" maxlength="300" required value="${esc(x ? x.text : "")}" placeholder="e.g. Once per session, ignore a poison or bad water."></div>
      <div class="btn-row field wide"><button class="btn primary" type="submit">${x ? "Save changes" : "Add the Edge"}</button>${x ? `<button type="button" class="linkish" data-hbcancel>Cancel</button>` : ""}</div></form>`;
  }
  const section = (kind, title, list, line, form) => `<details class="hb-sec"${editing && editing[0] === kind ? " open" : ""}><summary class="label">${title} (${list.length})</summary>
    <ul class="small adv-list">${list.map((x) => item(kind, x, line(x))).join("") || `<li class="muted">None yet.</li>`}</ul>${list.length >= hbLimits()[kind] && !(editing && editing[0] === kind) ? `<p class="small muted">That's the most this keeps (${hbLimits()[kind]}).</p>` : form()}</details>`;

  function render() {
    if (api.gmRoot) {
      api.gmRoot.innerHTML = `<h3>Homebrew</h3>
        <p class="small muted">Your own threats, weapons${EDGES ? " and Edges" : ""}, made here: no code. They work like the setting's own, marked <i>homebrew</i>: threats in the Encounter panel and on the battle map, weapons in characters' gear${EDGES ? " and the roller, Edges in the creator" : ""}. Keep numbers in line with the setting's (see <i>Making your own</i> in the core rules); anything special is a note you apply at the table.</p>
        <p class="small"><b>In this browser:</b> ${esc(summary(hb))}${hb.from === "gm" ? " (shared by your GM)" : ""}. Players get it when they join your shared table, or from a file.</p>
        ${changed ? `<p class="small hb-reload"><b>Saved.</b> Reload the page to use the changes. <button type="button" class="btn" data-hbreload>Reload now</button></p>` : ""}
        <div class="btn-row"><button type="button" class="btn" data-hbexport${hbCount(hb) ? "" : " disabled"}>Save to file</button>
          <label class="btn" tabindex="0">Open file<input type="file" accept=".json,application/json,text/plain" class="visually-hidden" data-hbimport></label></div>
        ${section("threats", "Threats", hb.threats, threatLine, threatForm)}
        ${section("weapons", "Weapons", hb.weapons, weaponLine, weaponForm)}
        ${EDGES ? section("edges", "Edges", hb.edges, (x) => `${x.limit === 1 ? "once" : `up to ${x.limit}×`}: ${x.text}`, edgeForm) : ""}`;
    }
    if (api.fileRoot) {
      api.fileRoot.innerHTML = `<div class="eyebrow">Homebrew</div>
        <p class="small muted">${hbCount(hb) ? `${esc(summary(hb))}${hb.from === "gm" ? ", from your GM" : ""}.` : `Your GM's own threats, weapons${EDGES ? " and Edges" : ""}, if they share a file.`}</p>
        <div class="btn-row"><label class="btn" tabindex="0">Open homebrew file<input type="file" accept=".json,application/json,text/plain" class="visually-hidden" data-hbimport></label>
        ${hbCount(hb) ? `<button type="button" class="linkish" data-hbclear>Remove it</button>` : ""}</div>
        ${changed ? `<p class="small"><button type="button" class="btn" data-hbreload>Reload to use it</button></p>` : ""}`;
    }
    if (api.noteRoot) {
      api.noteRoot.hidden = !offered;
      api.noteRoot.innerHTML = offered ? `<h3>Homebrew from your GM</h3><p class="small">${esc(summary(offered))}: their own threats, weapons${EDGES ? " and Edges" : ""} for this game.</p>
        <div class="btn-row"><button type="button" class="btn primary" data-hbuse>Use it</button><button type="button" class="linkish" data-hbskip>Not now</button></div>` : "";
    }
  }
  const replaceWith = (raw, from) => { const next = hbClean({ ...raw, from }, PACK); hb = next; editing = null; store(); return next; };
  function readForm(f) {
    const v = (n) => (f.elements[n] ? f.elements[n].value : ""), kind = f.dataset.hbform, id = editing && editing[0] === kind ? editing[1] : undefined;
    if (kind === "weapons") return { id, name: v("name"), skill: v("skill"), kind: v("kind"), boxes: v("boxes"), reach: v("reach"), band: v("band"), rounds: v("rounds"), note: v("note") };
    if (kind === "threats") return { id, name: v("name"), minor: f.elements.minor.checked, target: v("target"), dodge: v("dodge"), boxes: v("boxes"), weapons: [v("w0"), v("w1"), v("w2")].filter(Boolean), trait: v("trait"), traitText: v("traitText") };
    return { id, name: v("name"), limit: v("limit"), text: v("text") };
  }
  const roots = () => [api.gmRoot, api.fileRoot, api.noteRoot].filter(Boolean);
  for (const root of roots()) {
    root.addEventListener("submit", (e) => {
      const f = e.target.closest("[data-hbform]"); if (!f) return; e.preventDefault();
      const kind = f.dataset.hbform, entry = readForm(f), list = hb[kind].slice();
      const at = entry.id ? list.findIndex((x) => x.id === entry.id) : -1;
      if (at >= 0) list[at] = entry; else list.push(entry);
      const next = hbClean({ ...hb, [kind]: list }, PACK);
      if (next[kind].length < list.length) { say(kind === "threats" ? "A threat needs a name and at least one weapon." : kind === "edges" ? "An Edge needs a name and what it gives." : "A weapon needs a name.", true); return; }
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
