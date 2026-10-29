// Frontier tools for the GM view: wanted posters (PACK.wanted) and the trail (PACK.trail). Plain script, inlined by
// tools/build-legend.py (/* FRONTIER */); no modules, no page globals. Trails of Blood & Dust uses both.
//
// Wanted posters: when the law's track (wanted.track, Heat) reaches wanted.from, the GM can put a poster out on a
// character: the name the law knows them by, what they're wanted for, and a reward that climbs with the track
// (wanted.rewards: [[boxes, amount]]), "Dead or Alive" from wanted.doaFrom. The poster goes on the character's sheet
// (c.play.wanted), so the player sees it, and comes down when the GM takes it down.
// The trail: a ride between towns as a progress clock (trail.lengths: [[name, segments]]). Each day the guide rolls
// (trail.skill, Survival): a success fills a segment, by 5 or more two; a failure fills none and draws a hazard (1d6 on
// trail.hazards). Supplies count down a day at a time; out of them, rolls on the trail are at −2.
//
// mountWanted(api) with api: { PACK, root, esc, crew() (the GM view's characters), level() (the track's boxes now),
//   setWanted(c, wanted or null) (puts it on the card and saves), toast(m, err) }
// mountTrail(api) with api: { PACK, root, esc, crew(), skillOf(c, skill) (a character's target), addClock(name, size)
//   (returns its id), clockOf(id) ({ filled, size } or null), fillClock(id, n), toast(m, err) }
// wantedClean(raw) checks a poster from a file; wantedHTML(w, esc, PACK) draws one (the GM view and the sheet).
// Function declarations only.

function wantedClean(raw) {
  if (!raw || typeof raw !== "object") return null;
  const line = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const crimes = (Array.isArray(raw.crimes) ? raw.crimes : []).map((x) => line(x, 60)).filter(Boolean).slice(0, 4);
  const reward = Math.max(0, Math.min(100000, Math.round(+raw.reward || 0)));
  if (!crimes.length && !reward) return null;
  return { alias: line(raw.alias, 60), crimes, reward, doa: !!raw.doa, by: line(raw.by, 80) };
}
/** The reward the track's level calls for, and whether it's Dead or Alive. */
function wantedReward(W, level) {
  let reward = 0;
  for (const [boxes, amount] of W.rewards || []) if (level >= boxes) reward = amount;
  return { reward, doa: W.doaFrom ? level >= W.doaFrom : false };
}
function wantedList(items) { return items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + " and " + items[items.length - 1]; }
function wantedHTML(w, esc, PACK, name) {
  const W = PACK.wanted || {}, cur = W.currency || "$";
  return `<div class="wanted-poster" role="img" aria-label="Wanted poster: ${esc(w.alias || name || "")}">
    <span class="wp-top">${esc(W.title || "Wanted")}</span>
    ${w.doa ? `<span class="wp-doa">Dead or Alive</span>` : ""}
    <b class="wp-name">${esc(w.alias || name || "Unknown")}</b>
    ${w.alias && name && w.alias !== name ? `<span class="wp-aka">also known as ${esc(name)}</span>` : ""}
    <span class="wp-for">for ${esc(wantedList(w.crimes.map((c) => c.toLowerCase())) || "crimes against the peace")}</span>
    ${w.reward ? `<span class="wp-reward">${esc(cur)}${w.reward.toLocaleString("en-US")} Reward</span>` : ""}
    ${w.by ? `<span class="wp-by">${esc(w.by)}</span>` : ""}
  </div>`;
}

function mountWanted(api) {
  const { PACK, root, esc } = api, W = PACK.wanted;
  if (!W || !root) return { render() {} };
  let pick = "", draft = null;
  const say = (m, err) => (api.toast ? api.toast(m, err) : null);
  const rnd = (list) => list[Math.floor(Math.random() * list.length)];
  const rollCrimes = () => { const a = rnd(W.crimes), b = Math.random() < 0.5 ? rnd(W.crimes) : ""; return [...new Set([a, b].filter(Boolean))]; };
  const fresh = (c) => { const { reward, doa } = wantedReward(W, api.level()); return { alias: c ? c.name || "" : "", crimes: rollCrimes(), reward, doa, by: rnd(W.issuers || [""]) }; };
  function render() {
    const crew = api.crew(), level = api.level(), c = crew.find((x) => x.id === pick) || null, on = c && c.play && c.play.wanted;
    const { reward, doa } = wantedReward(W, level);
    if (c && !draft) draft = on ? { ...on } : fresh(c);
    root.innerHTML = `<h3>${esc(W.cardTitle || "Wanted posters")}</h3>
      <p class="small muted">${esc(W.track)} is at ${level}: ${level >= W.from ? `posters pay ${reward ? `${esc(W.currency || "$")}${reward.toLocaleString("en-US")}` : "nothing yet"}${doa ? ", Dead or Alive" : ""}` : `posters go up at ${W.from}`}. A poster goes on the character's sheet, where the player sees it.${W.hunters ? " " + esc(W.hunters) : ""}</p>
      <div class="field"><label for="wp-who">Who</label><select id="wp-who"><option value="">Choose a character</option>${crew.map((x) => `<option value="${esc(x.id)}"${x.id === pick ? " selected" : ""}>${esc(x.name || "Unnamed")}${x.play && x.play.wanted ? " (posted)" : ""}</option>`).join("")}</select></div>
      ${c ? `<div class="wp-edit">
        <div class="field"><label for="wp-alias">The name on the poster</label><input type="text" id="wp-alias" maxlength="60" value="${esc(draft.alias)}"></div>
        <div class="field"><label for="wp-crimes">Wanted for (comma between)</label><input type="text" id="wp-crimes" maxlength="200" value="${esc(draft.crimes.join(", "))}"></div>
        <div class="field"><label for="wp-reward">Reward (${esc(W.currency || "$")})</label><input type="number" id="wp-reward" min="0" max="100000" step="50" value="${draft.reward}"></div>
        <div class="field"><label for="wp-by">Issued by</label><input type="text" id="wp-by" maxlength="80" value="${esc(draft.by)}"></div>
        <label class="small"><input type="checkbox" id="wp-doa"${draft.doa ? " checked" : ""}> Dead or Alive</label>
      </div>
      ${wantedHTML(wantedClean(draft) || { alias: draft.alias, crimes: [], reward: 0, doa: draft.doa, by: draft.by }, esc, PACK, c.name)}
      <div class="btn-row">
        <button class="btn" id="wp-roll">Roll the crimes</button>
        <button class="btn" id="wp-level">Reward for ${esc(W.track)} ${level}</button>
        <button class="btn primary" id="wp-post">${on ? "Update the poster" : "Put up the poster"}</button>
        ${on ? `<button class="btn danger" id="wp-down">Take it down</button>` : ""}
      </div>` : ""}`;
  }
  const read = () => { const g = (id) => root.querySelector("#" + id); return { alias: g("wp-alias").value, crimes: g("wp-crimes").value.split(",").map((x) => x.trim()).filter(Boolean), reward: +g("wp-reward").value || 0, doa: g("wp-doa").checked, by: g("wp-by").value }; };
  root.addEventListener("change", (e) => {
    if (e.target.id === "wp-who") { pick = e.target.value; draft = null; render(); return; }
    if (e.target.closest(".wp-edit")) { draft = read(); render(); }
  });
  root.addEventListener("click", (e) => {
    const c = api.crew().find((x) => x.id === pick); if (!c) return;
    const id = e.target.id;
    if (id === "wp-roll") { draft = { ...read(), crimes: rollCrimes() }; render(); }
    else if (id === "wp-level") { draft = { ...read(), ...wantedReward(W, api.level()) }; render(); }
    else if (id === "wp-post") { const w = wantedClean(read()); if (!w) { say("Give the poster a crime or a reward.", true); return; } api.setWanted(c, w); draft = { ...w }; render(); say(`The poster for ${c.name || "them"} is up, and on their sheet.`); }
    else if (id === "wp-down") { api.setWanted(c, null); draft = null; render(); say("Poster taken down."); }
  });
  render();
  return { render: () => { draft = null; render(); } };
}

function mountTrail(api) {
  const { PACK, root, esc } = api, TR = PACK.trail;
  if (!TR || !root) return { render() {} };
  const KEY = PACK.id + ".trail.v1", say = (m, err) => (api.toast ? api.toast(m, err) : null);
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && typeof v === "object" ? v : null; } catch { return null; } };
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(ride)); } catch {} };
  let ride = load(), last = null;
  const d6 = () => 1 + Math.floor(Math.random() * 6), roll3 = () => [d6(), d6(), d6()];
  function render() {
    const crew = api.crew(), clk = ride ? api.clockOf(ride.clock) : null;
    if (ride && !clk) { ride = null; keep(); }
    const guide = ride && crew.find((c) => c.id === ride.guide);
    root.innerHTML = `<h3>${esc(TR.title || "The trail")}</h3>
      <p class="small muted">${esc(TR.intro || "")}</p>
      ${!ride ? `<div class="lab-row">
          <div class="field"><label for="tr-name">Where to</label><input type="text" id="tr-name" maxlength="40" placeholder="e.g. Silver Gulch"></div>
          <div class="field"><label for="tr-len">How far</label><select id="tr-len">${TR.lengths.map(([n, s], i) => `<option value="${i}">${esc(n)} (${s})</option>`).join("")}</select></div>
          <div class="field"><label for="tr-sup">Days of supplies</label><input type="number" id="tr-sup" min="0" max="30" value="${TR.lengths[0][1] + 2}"></div>
        </div>
        <div class="btn-row"><button class="btn primary" id="tr-start">Start the ride</button><button class="btn" id="tr-hazard">Roll a hazard</button></div>`
      : `<p><b>${esc(ride.name)}</b>: ${clk.filled} of ${clk.size} on the clock · supplies for <b>${ride.supplies}</b> day${ride.supplies === 1 ? "" : "s"}${ride.supplies <= 0 ? ` <span class="bad">(out: −2 on the trail)</span>` : ""}${ride.push ? " · pushed on last night: −2 today unless you rest" : ""}</p>
        <div class="lab-row">
          <div class="field"><label for="tr-guide">Guide</label><select id="tr-guide">${crew.map((c) => `<option value="${esc(c.id)}"${guide && guide.id === c.id ? " selected" : ""}>${esc(c.name || "Unnamed")} (${esc(TR.skill)} ${api.skillOf(c, TR.skill) ?? "—"})</option>`).join("") || `<option value="">No characters in the GM view</option>`}</select></div>
          <div class="field" style="flex:0 0 7em"><label for="tr-mod">Other ±</label><input type="number" id="tr-mod" min="-10" max="10" value="0"></div>
          <label class="small"><input type="checkbox" id="tr-pushon"> Push on through the night (+2, −2 tomorrow)</label>
        </div>
        <div class="btn-row"><button class="btn primary" id="tr-day">Roll the day</button><button class="btn" id="tr-rest">Rest a day</button><button class="btn" id="tr-hazard">Roll a hazard</button><button class="btn" id="tr-resupply">Resupply</button><button class="linkish danger" id="tr-end">End the ride</button></div>`}
      ${last ? `<div class="lab-calc">${last}</div>` : ""}`;
  }
  const hazard = () => { const n = d6(), [t, x] = TR.hazards[n - 1]; return `<b>Hazard (${n}): ${esc(t)}.</b> ${esc(x)}`; };
  root.addEventListener("click", (e) => {
    const id = e.target.id, g = (k) => root.querySelector("#" + k);
    if (id === "tr-hazard") { last = hazard(); render(); return; }
    if (id === "tr-start") {
      const [n, size] = TR.lengths[+g("tr-len").value], name = (g("tr-name").value.trim() || n).slice(0, 40);
      ride = { name: `The trail: ${name}`, clock: api.addClock(`The trail: ${name}`, size), supplies: Math.max(0, Math.min(30, +g("tr-sup").value || 0)), guide: (api.crew()[0] || {}).id || "", push: false };
      keep(); last = null; render(); say(`The ride is on the clocks: ${size} segments to ${name}.`); return;
    }
    if (!ride) return;
    if (id === "tr-day") {
      const c = api.crew().find((x) => x.id === g("tr-guide").value); if (!c) { say("Add the riders to the GM view first.", true); return; }
      const base = api.skillOf(c, TR.skill); if (base === undefined || base === null) { say(`${c.name} has no ${TR.skill} target.`, true); return; }
      const push = g("tr-pushon").checked, mods = [...(push ? [["Pushing on", 2]] : []), ...(ride.push ? [["Tired from last night", -2]] : []), ...(ride.supplies <= 0 ? [["Out of supplies", -2]] : []), ...(+g("tr-mod").value ? [["Other", +g("tr-mod").value]] : [])];
      const target = base + mods.reduce((s, m) => s + m[1], 0), dice = roll3(), total = dice[0] + dice[1] + dice[2];
      const ok = total <= 4 || (total < 17 && total <= target), margin = target - total, fill = ok ? (margin >= 5 ? 2 : 1) : 0;
      api.fillClock(ride.clock, fill); ride.supplies = Math.max(0, ride.supplies - 1); ride.guide = c.id; ride.push = push; keep();
      const clk = api.clockOf(ride.clock), there = clk && clk.filled >= clk.size;
      last = `${esc(c.name)}: ${esc(TR.skill)} ${base}${mods.map(([l, v]) => ` · ${esc(l)} ${v > 0 ? "+" : "−"}${Math.abs(v)}`).join("")} → target <b>${target}</b>. Rolled <b>${total}</b> (${dice.join(" + ")}): ${ok ? `success by ${margin}, ${fill} segment${fill > 1 ? "s" : ""}` : `failed by ${-margin}: no progress, and a hazard`}.${!ok ? `<br>${hazard()}` : ""}${there ? `<br><b>You arrive.</b>` : ""}`;
      if (there) { ride = null; keep(); }
      render(); return;
    }
    if (id === "tr-rest") { ride.supplies = Math.max(0, ride.supplies - 1); ride.push = false; keep(); last = "A day's rest: the horses recover, and a day's supplies are gone."; render(); return; }
    if (id === "tr-resupply") { ride.supplies = Math.min(30, ride.supplies + (TR.lengths[0][1] + 2)); keep(); last = "Resupplied: water found, game shot, or a store along the way."; render(); return; }
    if (id === "tr-end") { ride = null; keep(); last = null; render(); }
  });
  render();
  return { render };
}
