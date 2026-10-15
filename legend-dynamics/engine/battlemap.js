// Battle map for the GM view, with two kinds of map on one card:
//  - a hex map: a hex grid at any scale (a yard a hex, ten yards, a thousand kilometres in space) over an
//    optional background picture, with tokens dragged from hex to hex and distances read as range bands;
//  - a range track: one lane per range band, for chases and ship fights where only the band matters
//    (Fracture Lines' ship fights move the range a band at a time, from under 10 km to a light-second).
// One module for every creator (Grimm keeps a copy). The page passes in its characters, threats, tracks and
// bands; the map keeps its own state in this browser (pictures in IndexedDB, which holds large files; the
// rest in localStorage) and in a map file the GM can save and open again.
//
// mountBattleMap(api)
//   root: an empty element to draw into; key: a storage prefix (one map per setting); esc; toast(msg, err)
//   crew(): [{ id, name, portrait, color, down, dying, injury, boxes, stunned, points, ptrack, stats }]: the GM's
//     characters, for "Add the posse" (partyName: posse, party, crew, team), live token state and the tracks shown when one is selected;
//   setCrew(id, patch) writes a change back (patch: injury, dying, stunned, points, ptrack); pointName, stunName
//   threats: [{ id, name, boxes, dodge, attacks, trait }], the setting's opponents; vehicles: the same for ships
//   bands: [[name, maxYards]], the personal range bands; kmBands: [[name, maxKm]] where the setting has space
//   rangeTrack: { title, us, bands: [[name, distance text]], note, vehicleTrack } for the range track
//   groupTracks(): [{ name, boxes, value, effect }] and setGroupTrack(name, value): the crew's shared tracks (Hull)
// Returns { refresh() } to call when the characters or tracks change.
function mountBattleMap(api) {
  const SVGNS = "http://www.w3.org/2000/svg", SQ3 = Math.sqrt(3);
  const esc = api.esc, KEY = api.key + ".battlemap.v1";
  const say = (m, err) => (api.toast ? api.toast(m, err) : null);
  const PARTY = api.partyName || "party", Party = PARTY[0].toUpperCase() + PARTY.slice(1);
  const RT = Object.assign({ title: "Range track", us: "Us", note: "", bands: [["Close", "up to 10 yd"], ["Short", "up to 50 yd"], ["Medium", "up to 150 yd"], ["Long", "up to 500 yd"], ["Extreme", "up to a mile"]] }, api.rangeTrack || {});
  const UNITS = { yd: { name: "yards", one: "yard", bands: api.bands || [], presets: [1, 2, 5, 10, 50] } };
  if ((api.kmBands || []).length) UNITS.km = { name: "km", one: "km", bands: api.kmBands, presets: [1, 10, 100, 1000, 10000] };
  const fresh = () => ({ kind: "hex", scale: { n: 1, unit: "yd" }, size: 36, orient: "pointy", ox: 31.2, oy: 36, cols: 24, rows: 16, grid: true, gridAlpha: 0.45,
    view: { x: 0, y: 0, z: 1 }, tokens: [], bgW: 0, bgH: 0, rt: { tokens: [], view: { x: 0, y: 0, z: 1 } } });
  const normal = (v) => { const s = Object.assign(fresh(), v || {}); s.rt = Object.assign({ tokens: [], view: { x: 0, y: 0, z: 1 } }, s.rt || {});
    if (!s.scale || !UNITS[s.scale.unit] || !(s.scale.n > 0)) s.scale = { n: 1, unit: "yd" }; if (s.kind !== "range") s.kind = "hex"; return s; };
  let st = normal(load());
  const bgs = { hex: null, range: null }; // the pictures, as data URLs (kept in IndexedDB)
  let sel = null, mode = "move", drag = null, measure = null, pointers = new Map();
  const isRange = () => st.kind === "range";
  const toks = () => (isRange() ? st.rt.tokens : st.tokens);
  const setToks = (l) => { if (isRange()) st.rt.tokens = l; else st.tokens = l; };
  const V = () => (isRange() ? st.rt.view : st.view);
  const bgKey = (k = st.kind) => KEY + (k === "range" ? ".bgr" : ".bg");

  // ---- storage ----
  function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { say("The map is too large to keep in this browser; save it to a file.", true); } }
  const idb = (() => {
    let db = null;
    const open = () => new Promise((res, rej) => { if (db) return res(db); try { const r = indexedDB.open("legend-dynamics-maps", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("images"); r.onsuccess = () => res((db = r.result)); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
    const tx = (mode, fn) => open().then((d) => new Promise((res, rej) => { const t = d.transaction("images", mode), s = t.objectStore("images"), q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
    return { get: (k) => tx("readonly", (s) => s.get(k)).catch(() => null), set: (k, v) => tx("readwrite", (s) => s.put(v, k)).catch(() => null), del: (k) => tx("readwrite", (s) => s.delete(k)).catch(() => null) };
  })();

  // ---- hex math (axial q, r; offset rows/columns for the rectangle of the map) ----
  const pointy = () => st.orient !== "flat";
  const toPx = (q, r) => pointy() ? { x: st.ox + st.size * SQ3 * (q + r / 2), y: st.oy + st.size * 1.5 * r } : { x: st.ox + st.size * 1.5 * q, y: st.oy + st.size * SQ3 * (r + q / 2) };
  function round(fq, fr) {
    const fs = -fq - fr; let q = Math.round(fq), r = Math.round(fr), s = Math.round(fs);
    const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    return { q, r };
  }
  function toHex(x, y) {
    x -= st.ox; y -= st.oy;
    return pointy() ? round((SQ3 / 3 * x - y / 3) / st.size, (2 / 3 * y) / st.size) : round((2 / 3 * x) / st.size, (-x / 3 + SQ3 / 3 * y) / st.size);
  }
  const dist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  const cells = () => { const out = []; for (let row = 0; row < st.rows; row++) for (let col = 0; col < st.cols; col++)
    out.push(pointy() ? { q: col - Math.floor(row / 2), r: row } : { q: col, r: row - Math.floor(col / 2) }); return out; };
  const corners = (c) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - (pointy() ? 30 : 0)); return [c.x + st.size * Math.cos(a), c.y + st.size * Math.sin(a)]; });
  const fmt = (v) => (v >= 100 ? Math.round(v).toLocaleString("en-US") : String(Math.round(v * 10) / 10));
  const scaleText = () => { const u = UNITS[st.scale.unit]; return `${fmt(st.scale.n)} ${st.scale.n === 1 ? u.one : u.name}`; };
  // A distance in hexes, at the map's scale, as a range band.
  function rangeText(n) {
    const u = UNITS[st.scale.unit], d = n * st.scale.n;
    const band = st.scale.unit === "yd" && n <= 1 && d <= 2 ? "in reach" : (u.bands.find(([, max]) => d <= max) || ["out of range"])[0];
    return `${n} hex${n === 1 ? "" : "es"} · ${fmt(d)} ${d === 1 ? u.one : u.name} · ${band}`;
  }

  // ---- the range track: a lane for "us", then one per band ----
  const LW = 220, LH = 640, HEAD = 76;
  const lanes = () => [[RT.us, RT.vehicleTrack ? "" : `where the ${PARTY} stands`], ...RT.bands];
  const laneX = (i) => i * LW + LW / 2;
  const laneOf = (x) => Math.max(0, Math.min(lanes().length - 1, Math.round((x - LW / 2) / LW)));
  const laneName = (i) => (i === 0 ? RT.us : lanes()[i][0]);
  function moveText(name, a, b) {
    if (a === b) return `${name}: ${laneName(b)}`;
    if (a === 0 || b === 0) return `${name}: ${laneName(a)} → ${laneName(b)}`;
    const n = Math.abs(b - a);
    return `${name}: ${laneName(a)} → ${laneName(b)} · ${n} band${n > 1 ? "s" : ""} ${b > a ? "farther" : "closer"}`;
  }
  const posOf = (t) => (isRange() ? { x: laneX(t.lane || 0), y: t.y || HEAD + 50 } : toPx(t.q, t.r));
  const radOf = (t) => (isRange() ? 28 : st.size * 0.8) * (1 + (isRange() ? 0.45 : 1.19) * ((t.tsize || 1) - 1));

  // ---- the help: how to use the map, written for this setting (its point name, its units, its ship) ----
  function helpHtml() {
    const pt = esc(api.pointName || "Legend"), km = !!UNITS.km, veh = !!RT.vehicleTrack, rt = esc(RT.title), us = esc(RT.us);
    const sec = (h, items) => `<h4>${h}</h4><ul>${items.filter(Boolean).map((x) => `<li>${x}</li>`).join("")}</ul>`;
    return `<div class="bm-helpbody small">
      <p>Add characters to the GM view first: the map's tokens for the ${esc(PARTY)} come from there. The map is kept in this browser; save it to a file to keep a copy.</p>
      ${sec("1. Choose the kind of map", [
        `<b>Hex map</b> for a fight where position matters: who is behind cover, who can reach the door.`,
        `<b>${rt}</b> for a fight where only distance matters: ${veh ? "ships closing or opening the range, " : ""}a chase, a running fight across open country. Each lane is a range band from ${veh ? "your ship" : "the " + esc(PARTY)}.`,
        `The two keep their own tokens and pictures, so you can set up both and switch between them.`])}
      ${sec("2. Set up the hex map", [
        `<b>Background image…</b> puts a picture under the grid: a battle map, a sketch, a photo of a street. A new picture is covered with hexes at the current hex size.`,
        `Open <b>Scale, grid and map</b> and set <b>One hex is</b> to what a hex means: 1 yard for a brawl in a room, 5 or 10 for a street, 50 for open ground${km ? ", or a number of km for a fight in space" : ""}. Distances and range bands follow the scale.`,
        `If the picture has its own grid, set <b>Hex size on screen</b> until the hexes match it, choose pointy or flat tops, then use <b>Shift right</b> and <b>Shift down</b> to line them up. <b>Fit the grid to the picture</b> starts over at the top-left corner.`,
        `Turn <b>Show grid</b> off, or lower its strength, when the picture has a grid of its own.`])}
      ${sec("3. Place tokens", [
        `<b>Add the ${esc(PARTY)}</b> places every character in the GM view${veh ? "" : ", in the middle of the map"}. Their tokens show their portrait (or initials) and group color, and stay linked to the character.`,
        veh ? `<b>Add ${us.replace(/^Our /, "our ")}</b> places your ship, linked to the crew's ${esc(RT.vehicleTrack)} track.` : "",
        `<b>Add a token</b> opens a small form. Pick from <b>From the threats</b> to fill in the name, boxes and the threat's numbers${veh ? " (enemy ships are listed with the people)" : ""}, or leave it on <i>None</i> for a plain token. Names with a number count up, so pressing <b>Place it</b> again adds the next one.`,
        `Give a token a <b>color</b>, a <b>size</b> (Large or Huge for a horse, a monster, a ship) and, if you like, an <b>image</b>.`])}
      ${sec("4. Move, measure and look", [
        `Drag a token to move it. While you drag, the corner shows how far it went and the range band${veh ? "; on the " + rt + ", which band it moved into" : ""}.`,
        `<b>Measure</b> (hex map only): drag from one hex to another to read the distance. Press it again to go back to moving.`,
        `Drag the empty map to pan. Scroll, pinch, or use <b>−</b>, <b>+</b> and <b>Fit</b> to zoom.`,
        `From the keyboard: Tab to a token, Enter selects it, Delete removes it.`])}
      ${sec("5. Track the fight from a token", [
        `Click a token to open its panel underneath the map.`,
        `<b>A token from the ${esc(PARTY)}</b> shows the character's Injury boxes, Dying, the stunned condition, ${pt} points and any personal track. Changes there change the character in the GM view, and the other way round.`,
        veh ? `<b>Your ship</b> shows the ${esc(RT.vehicleTrack)} boxes and what the damage does; they are the crew's track, the same as on the sheet.` : "",
        `<b>Any other token</b> keeps its own boxes, shown as pips above it. When they are all marked it is taken out${veh ? " (or destroyed, for a ship)" : ""} and fades.`,
        `<b>Copy</b> makes another of the same, <b>Remove</b> takes it off the map, <b>Done</b> closes the panel.`])}
      ${sec("6. Keep the map", [
        `The map, its tokens and its pictures are kept in this browser for this setting, until you clear them.`,
        `<b>Save map to file</b> keeps everything (both maps, their pictures and tokens) in one file; <b>Open a map file…</b> brings it back here or on another computer. Use it to prepare fights ahead of time or send one to another GM.`,
        `<b>Remove the image</b> and <b>Remove all tokens</b> clear the map you are looking at.`])}
    </div>`;
  }
  // ---- markup ----
  const hasVehicle = () => !!(RT.vehicleTrack && api.groupTracks && api.groupTracks().some((x) => x.name === RT.vehicleTrack));
  api.root.innerHTML = `
    <details class="bm-help"><summary>How to use the map</summary>${helpHtml()}</details>
    <div class="bm-bar bm-kinds" role="group" aria-label="Kind of map">
      <button class="btn" data-bm="kind" data-kind="hex">Hex map</button><button class="btn" data-bm="kind" data-kind="range">${esc(RT.title)}</button>
      <span class="small muted bm-kindnote"></span>
    </div>
    <div class="bm-bar">
      <label class="btn bm-file" tabindex="0">Background image…<input type="file" accept="image/*" data-bm="bg" class="bm-hide"></label>
      <button class="btn" data-bm="posse">Add the ${esc(PARTY)}</button>
      <button class="btn" data-bm="vehicle" hidden>Add ${esc(RT.us.replace(/^Our /, "our "))}</button>
      <button class="btn" data-bm="add">Add a token</button>
      <button class="btn" data-bm="measure" aria-pressed="false">Measure</button>
      <span class="bm-zoom"><button class="btn" data-bm="out" aria-label="Zoom out">−</button><button class="btn" data-bm="fit">Fit</button><button class="btn" data-bm="in" aria-label="Zoom in">+</button></span>
    </div>
    <div class="bm-add" hidden>
      <label class="bm-threatwrap">From the threats <select data-bmf="threat"></select></label>
      <label>Name <input type="text" data-bmf="name" placeholder="e.g. Outlaw 1"></label>
      <label>Boxes <input type="number" min="1" max="12" value="1" data-bmf="boxes" style="width:4.5em"></label>
      <label>Color <input type="color" data-bmf="color" value="#a33b2b"></label>
      <label>Size <select data-bmf="tsize"><option value="1">Normal</option><option value="2">Large</option><option value="3">Huge</option></select></label>
      <label class="btn bm-file" tabindex="0">Image (optional)…<input type="file" accept="image/*" data-bmf="img" class="bm-hide"></label>
      <button class="btn primary" data-bm="addgo">Place it</button>
    </div>
    <div class="bm-stage"><svg class="bm-svg" role="application" aria-label="Battle map. Drag the map to pan, scroll or pinch to zoom, drag a token to move it.">
      <defs><clipPath id="bm-clip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>
      <g class="bm-world"><image class="bm-bg"/><g class="bm-lanes"></g><path class="bm-grid"/><g class="bm-tokens"></g><g class="bm-measure"></g></g>
    </svg><div class="bm-readout" aria-live="polite"></div></div>
    <div class="bm-sel" hidden></div>
    <details class="bm-gridset"><summary class="small">Scale, grid and map</summary>
      <div class="bm-hexonly">
        <div class="bm-gridrow">
          <label>One hex is <input type="number" min="0.1" step="any" data-bmscale="n" style="width:6.5em" list="bm-presets"></label>
          <select data-bmscale="unit" aria-label="Unit">${Object.entries(UNITS).map(([k, u]) => `<option value="${k}">${esc(u.name)}</option>`).join("")}</select>
          <datalist id="bm-presets"></datalist>
          <span class="small muted bm-presetbtns"></span>
        </div>
        <div class="bm-gridrow">
          <label>Hex size on screen <input type="range" min="10" max="140" step="1" data-bmg="size"></label>
          <label>Hexes <select data-bmg="orient"><option value="pointy">Pointy top</option><option value="flat">Flat top</option></select></label>
          <label>Columns <input type="number" min="2" max="200" data-bmg="cols"></label>
          <label>Rows <input type="number" min="2" max="200" data-bmg="rows"></label>
          <label>Shift right <input type="number" step="1" data-bmg="ox"></label>
          <label>Shift down <input type="number" step="1" data-bmg="oy"></label>
          <label><input type="checkbox" data-bmg="grid"> Show grid</label>
          <label>Grid strength <input type="range" min="0.1" max="1" step="0.05" data-bmg="gridAlpha"></label>
        </div>
        <p class="small muted">The scale sets what a hex means: distances and range bands follow it. To line the grid up with a map that has its own grid, set the hex size on screen first, then shift it into place.</p>
      </div>
      <p class="small muted bm-rangeonly">${esc(RT.note || `Each lane is a range band from the ${PARTY}. Drag a token into another lane to move it a band in or out.`)}</p>
      <div class="bm-bar"><button class="btn bm-hexonly" data-bm="align">Fit the grid to the picture</button><button class="btn" data-bm="bgoff">Remove the image</button><button class="btn" data-bm="clear">Remove all tokens</button>
        <button class="btn" data-bm="savefile">Save map to file</button><label class="btn bm-file" tabindex="0">Open a map file…<input type="file" accept=".json,application/json" data-bm="openfile" class="bm-hide"></label></div>
    </details>`;
  const $ = (s) => api.root.querySelector(s);
  const svg = $(".bm-svg"), world = $(".bm-world"), gTok = $(".bm-tokens"), gMeas = $(".bm-measure"), gLanes = $(".bm-lanes"), readout = $(".bm-readout");
  const el = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v); return n; };

  // ---- threats: people, and ships where the setting has them ----
  const allThreats = () => [...(api.vehicles || []), ...(api.threats || [])];
  function fillThreats() {
    const sel = $('[data-bmf="threat"]'), ppl = api.threats || [], veh = api.vehicles || [];
    $(".bm-threatwrap").hidden = !ppl.length && !veh.length;
    const opts = (l) => l.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
    // On the range track, ships come first; on the hex map, people do.
    const groups = isRange() ? [["Ships", veh], ["People", ppl]] : [["People", ppl], ["Ships", veh]];
    sel.innerHTML = `<option value="">None (a plain token)</option>` + (veh.length ? groups.filter(([, l]) => l.length).map(([g, l]) => `<optgroup label="${g}">${opts(l)}</optgroup>`).join("") : opts(ppl));
  }

  // ---- drawing ----
  function viewBox() { const w = svg.clientWidth || 800, h = svg.clientHeight || 500; svg.setAttribute("viewBox", `0 0 ${w} ${h}`); }
  function drawWorld() { const v = V(); world.setAttribute("transform", `translate(${v.x} ${v.y}) scale(${v.z})`); }
  function drawGrid() {
    const g = $(".bm-grid"), im = $(".bm-bg"), bg = bgs[st.kind];
    gLanes.textContent = "";
    if (isRange()) {
      g.setAttribute("d", "");
      lanes().forEach(([name, sub], i) => {
        gLanes.appendChild(el("rect", { class: "bm-lane" + (i ? (i % 2 ? " odd" : "") : " us"), x: i * LW, y: 0, width: LW, height: LH }));
        const t1 = el("text", { class: "bm-lname", x: laneX(i), y: 30 }); t1.textContent = name; gLanes.appendChild(t1);
        if (sub) { const t2 = el("text", { class: "bm-lsub", x: laneX(i), y: 52 }); t2.textContent = sub; gLanes.appendChild(t2); }
      });
      if (bg) { im.setAttribute("href", bg); im.setAttribute("width", lanes().length * LW); im.setAttribute("height", LH); im.setAttribute("preserveAspectRatio", "xMidYMid slice"); im.removeAttribute("display"); }
      else im.setAttribute("display", "none");
      return;
    }
    g.setAttribute("d", st.grid ? cells().map((h) => "M" + corners(toPx(h.q, h.r)).map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z").join("") : "");
    g.style.opacity = st.gridAlpha;
    if (bg) { im.setAttribute("href", bg); im.setAttribute("width", st.bgW); im.setAttribute("height", st.bgH); im.setAttribute("preserveAspectRatio", "none"); im.removeAttribute("display"); }
    else im.setAttribute("display", "none");
  }
  const live = (t) => (t.ref && api.crew().find((c) => c.id === t.ref)) || null;
  const trackOf = (t) => (t.track && api.groupTracks && api.groupTracks().find((x) => x.name === t.track)) || null;
  // What a token shows: a character's own state, a shared track's (the crew's ship), or its own boxes.
  function info(t) {
    const c = live(t), tr = trackOf(t);
    if (c) return { c, name: c.name, color: c.color, img: c.portrait, boxes: c.boxes || 3, inj: c.injury || 0, down: c.down, dying: c.dying };
    if (tr) return { tr, name: t.name || RT.us, color: t.color || "#3d7a9e", img: t.img, boxes: tr.boxes, inj: tr.value || 0, down: (tr.value || 0) >= tr.boxes };
    const boxes = t.boxes || 0, inj = t.injury || 0;
    return { name: t.name, color: t.color, img: t.img, boxes, inj, down: boxes && inj >= boxes };
  }
  function drawTokens() {
    gTok.textContent = "";
    for (const t of toks()) {
      const k = info(t), p = posOf(t), rad = radOf(t), unit = isRange() ? 36 : st.size;
      const g = el("g", { class: "bm-tok" + (sel === t.id ? " sel" : "") + (k.down ? " down" : "") + (k.dying ? " dying" : ""), "data-tok": t.id, transform: `translate(${p.x} ${p.y})`, tabindex: "0", role: "button", "aria-label": k.name || "Token" });
      g.appendChild(el("circle", { r: rad, class: "bm-disc", style: `fill:${k.color || "#777"}` }));
      if (k.img) g.appendChild(el("image", { href: k.img, x: -rad * 0.9, y: -rad * 0.9, width: rad * 1.8, height: rad * 1.8, "clip-path": "url(#bm-clip)", preserveAspectRatio: "xMidYMid slice" }));
      else { const tx = el("text", { class: "bm-init", "font-size": rad * 0.8, dy: "0.35em" }); tx.textContent = (k.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(); g.appendChild(tx); }
      g.appendChild(el("circle", { r: rad, class: "bm-ring" }));
      // Injury (or Hull) pips above the token: one per box, filled as they're marked.
      if (k.boxes) { const pr = Math.max(2.5, unit * 0.1), gap = pr * 2.6;
        for (let i = 0; i < k.boxes; i++) g.appendChild(el("circle", { class: "bm-pip" + (i < k.inj ? " on" : ""), r: pr, cx: (i - (k.boxes - 1) / 2) * gap, cy: -rad - pr * 1.8 })); }
      const lb = el("text", { class: "bm-label", y: rad + Math.max(10, unit * 0.38), "font-size": Math.max(9, unit * 0.32) }); lb.textContent = k.name || ""; g.appendChild(lb);
      gTok.appendChild(g);
    }
  }
  function drawMeasure() {
    gMeas.textContent = "";
    if (isRange()) {
      readout.textContent = drag && drag.kind === "token" && drag.moved ? moveText(info(drag.t).name || "Token", drag.from.lane, drag.to.lane) : "";
      return;
    }
    const m = drag && drag.kind === "token" && drag.moved ? { a: drag.from, b: drag.to } : measure;
    if (!m || !m.b) { readout.textContent = ""; return; }
    const a = toPx(m.a.q, m.a.r), b = toPx(m.b.q, m.b.r), n = dist(m.a, m.b);
    gMeas.appendChild(el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "bm-mline" }));
    gMeas.appendChild(el("circle", { cx: b.x, cy: b.y, r: st.size * 0.25, class: "bm-mdot" }));
    readout.textContent = rangeText(n);
  }
  function drawSel() {
    const box = $(".bm-sel"), t = toks().find((x) => x.id === sel);
    box.hidden = !t;
    if (!t) return;
    const k = info(t), c = k.c, tr = k.tr;
    const boxRow = (n, inj, attr, what) => `<span class="bm-boxes">${Array.from({ length: n }, (_, i) => `<button type="button" class="bm-box${i < inj ? " on" : ""}" ${attr}="${i + 1}" aria-label="${what} box ${i + 1}${i < inj ? ", marked" : ""}"></button>`).join("")}</span>`;
    let tracks;
    if (c) tracks = `<div class="bm-tracks"><span class="bm-stats small">${esc(c.stats || "")}</span>
        <span class="bm-track">Injury ${boxRow(c.boxes || 3, c.injury || 0, "data-bmc-injury", "Injury")}</span>
        <label><input type="checkbox" data-bmc="dying"${c.dying ? " checked" : ""}> Dying</label>
        <label><input type="checkbox" data-bmc="stunned"${c.stunned ? " checked" : ""}> ${esc(api.stunName || "Stunned")}</label>
        <span class="bm-track">${esc(api.pointName || "Points")} <button type="button" class="btn" data-bmc-points="-1" aria-label="One point fewer">−</button><b>${c.points ?? 0}</b><button type="button" class="btn" data-bmc-points="1" aria-label="One point more">+</button></span>
        ${c.ptrack ? `<span class="bm-track">${esc(c.ptrack.name)} ${boxRow(c.ptrack.max, c.ptrack.value || 0, "data-bmc-ptrack", c.ptrack.name)}</span>` : ""}</div>`;
    else if (tr) tracks = `<div class="bm-tracks"><span class="bm-track">${esc(tr.name)} ${boxRow(tr.boxes, tr.value || 0, "data-bmk-track", tr.name)}</span>
        ${tr.effect ? `<span class="bm-stats small">${esc(tr.effect)}</span>` : ""}</div>`;
    else tracks = `<div class="bm-tracks">${t.stats ? `<span class="bm-stats small">${esc(t.stats)}</span>` : ""}
        <span class="bm-track">${esc(t.boxLabel || "Injury")} ${boxRow(t.boxes || 1, t.injury || 0, "data-bmt-injury", t.boxLabel || "Injury")}</span>${(t.injury || 0) >= (t.boxes || 1) ? `<b class="small">${t.boxLabel === "Hull" ? "Destroyed" : "Taken out"}</b>` : ""}
        <label>Boxes <input type="number" min="1" max="12" data-bms="boxes" value="${t.boxes || 1}" style="width:4.5em"></label></div>`;
    const whose = c ? `(from the ${esc(PARTY)}${c.dying ? ", Dying" : c.down ? ", down" : ""}: changes here change the character)` : tr ? `(the ${esc(tr.name)} track: changes here change the crew's track)` : "";
    box.innerHTML = `<b>${esc(k.name || "Token")}</b>${whose ? ` <span class="small muted">${whose}</span>` : ""}${isRange() ? ` <span class="small muted">· ${esc(laneName(t.lane || 0))}</span>` : ""}
      ${tracks}
      ${c ? "" : `<label>Name <input type="text" data-bms="name" value="${esc(t.name || "")}"></label><label>Color <input type="color" data-bms="color" value="${esc(t.color || "#777777")}"></label>`}
      <label>Size <select data-bms="tsize">${[["1", "Normal"], ["2", "Large"], ["3", "Huge"]].map(([n, l]) => `<option value="${n}"${String(t.tsize || 1) === n ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <button class="btn" data-bm="dup">Copy</button><button class="btn" data-bm="del">Remove</button><button class="linkish" data-bm="desel">Done</button>`;
  }
  function syncForm() {
    api.root.querySelectorAll("[data-bmg]").forEach((i) => { const k = i.dataset.bmg; if (document.activeElement === i) return; if (i.type === "checkbox") i.checked = !!st[k]; else i.value = st[k]; });
    const n = $('[data-bmscale="n"]'); if (document.activeElement !== n) n.value = st.scale.n;
    $('[data-bmscale="unit"]').value = st.scale.unit;
    const pre = UNITS[st.scale.unit].presets;
    $("#bm-presets").innerHTML = pre.map((v) => `<option value="${v}">`).join("");
    $(".bm-presetbtns").innerHTML = "Quick: " + pre.map((v) => `<button type="button" class="linkish" data-bmpre="${v}">${fmt(v)}</button>`).join(" · ");
    $('[data-bm="measure"]').setAttribute("aria-pressed", mode === "measure");
    $('[data-bm="measure"]').hidden = isRange();
    $('[data-bm="vehicle"]').hidden = !hasVehicle();
    api.root.querySelectorAll('[data-bm="kind"]').forEach((b) => b.setAttribute("aria-pressed", b.dataset.kind === st.kind));
    api.root.querySelectorAll(".bm-hexonly").forEach((x) => (x.hidden = isRange()));
    api.root.querySelectorAll(".bm-rangeonly").forEach((x) => (x.hidden = !isRange()));
    $(".bm-kindnote").textContent = isRange() ? `Lanes are range bands: ${RT.bands.map((b) => b[0]).join(", ")}.` : `One hex is ${scaleText()}.`;
  }
  function draw() { viewBox(); drawWorld(); drawGrid(); drawTokens(); drawMeasure(); drawSel(); syncForm(); }

  // ---- coordinates: screen → map ----
  function mapPt(ev) {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, sx = vb.width / r.width, sy = vb.height / r.height, v = V();
    const x = (ev.clientX - r.left) * sx, y = (ev.clientY - r.top) * sy;
    return { sx: x, sy: y, x: (x - v.x) / v.z, y: (y - v.y) / v.z };
  }
  function zoomAt(f, sx, sy) {
    const v = V(); v.set = true;
    const z = Math.max(0.15, Math.min(6, v.z * f)); f = z / v.z;
    v.x = sx - (sx - v.x) * f; v.y = sy - (sy - v.y) * f; v.z = z; drawWorld();
  }
  function fit() {
    viewBox();
    const w = svg.clientWidth || 800, h = svg.clientHeight || 500, v = V();
    let mw, mh;
    if (isRange()) { mw = lanes().length * LW; mh = LH; }
    else {
      // The grid's real extent (offset rows or columns stagger by half a hex), or the picture's, whichever is larger.
      const gw = pointy() ? st.ox + st.size * SQ3 * (st.cols + 0.5) : st.ox + st.size * (1.5 * st.cols + 0.5);
      const gh = pointy() ? st.oy + st.size * (1.5 * st.rows + 0.5) : st.oy + st.size * SQ3 * (st.rows + 0.5);
      mw = Math.max(st.bgW, gw); mh = Math.max(st.bgH, gh);
    }
    v.z = Math.max(0.15, Math.min(6, Math.min(w / mw, h / mh))); v.x = (w - mw * v.z) / 2; v.y = (h - mh * v.z) / 2;
    drawWorld(); save();
  }
  // The hex in the middle of the view, kept inside the map's rectangle so new tokens land on the map.
  const centerHex = () => {
    const w = svg.clientWidth || 800, h = svg.clientHeight || 500, v = V(), x = toHex((w / 2 - v.x) / v.z, (h / 2 - v.y) / v.z);
    const row = pointy() ? x.r : x.q, col = pointy() ? x.q + Math.floor(x.r / 2) : x.r + Math.floor(x.q / 2);
    const R = Math.max(0, Math.min(st.rows - 1, pointy() ? row : col)), C = Math.max(0, Math.min(st.cols - 1, pointy() ? col : row));
    return pointy() ? { q: C - Math.floor(R / 2), r: R } : { q: C, r: R - Math.floor(C / 2) };
  };
  function freeHexNear(h) {
    const used = new Set(st.tokens.map((t) => t.q + "," + t.r));
    for (let ring = 0; ring < 30; ring++) for (let dq = -ring; dq <= ring; dq++) for (let dr = Math.max(-ring, -dq - ring); dr <= Math.min(ring, -dq + ring); dr++) {
      const q = h.q + dq, r = h.r + dr; if (dist({ q, r }, h) === ring && !used.has(q + "," + r)) return { q, r };
    }
    return h;
  }
  // A new token's place: the middle of the hex map, or the next free spot down a lane of the range track.
  function spot(lane) {
    if (!isRange()) return freeHexNear(centerHex());
    const n = st.rt.tokens.filter((t) => (t.lane || 0) === lane).length;
    return { lane, y: HEAD + 56 + (n % 6) * 96 };
  }
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---- pointer: pan, zoom, drag tokens, measure ----
  svg.addEventListener("pointerdown", (ev) => {
    svg.setPointerCapture(ev.pointerId); pointers.set(ev.pointerId, mapPt(ev));
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag = { kind: "pinch", d: Math.hypot(a.sx - b.sx, a.sy - b.sy) }; return; }
    const p = mapPt(ev), tg = ev.target.closest && ev.target.closest("[data-tok]");
    if (mode === "measure" && !isRange()) { const h = toHex(p.x, p.y); measure = { a: h, b: h }; drag = { kind: "measure" }; drawMeasure(); return; }
    if (tg) {
      const t = toks().find((x) => x.id === tg.dataset.tok), o = posOf(t); sel = t.id;
      const at = isRange() ? { lane: t.lane || 0, y: t.y } : { q: t.q, r: t.r };
      drag = { kind: "token", t, from: at, to: { ...at }, moved: false, off: { x: p.x - o.x, y: p.y - o.y } }; drawTokens(); drawSel(); return;
    }
    const v = V(); drag = { kind: "pan", sx: p.sx, sy: p.sy, vx: v.x, vy: v.y, moved: false };
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, mapPt(ev));
    if (!drag) return;
    const p = mapPt(ev);
    if (drag.kind === "pinch" && pointers.size === 2) { const [a, b] = [...pointers.values()], d = Math.hypot(a.sx - b.sx, a.sy - b.sy); zoomAt(d / drag.d, (a.sx + b.sx) / 2, (a.sy + b.sy) / 2); drag.d = d; return; }
    if (drag.kind === "pan") { const v = V(); v.set = true; v.x = drag.vx + p.sx - drag.sx; v.y = drag.vy + p.sy - drag.sy; drag.moved = drag.moved || Math.abs(p.sx - drag.sx) + Math.abs(p.sy - drag.sy) > 4; drawWorld(); return; }
    if (drag.kind === "measure") { measure.b = toHex(p.x, p.y); drawMeasure(); return; }
    if (drag.kind === "token") {
      const x = p.x - drag.off.x, y = p.y - drag.off.y, g = gTok.querySelector(`[data-tok="${drag.t.id}"]`);
      if (g) g.setAttribute("transform", `translate(${x} ${y})`);
      drag.moved = true;
      drag.to = isRange() ? { lane: laneOf(x), y: Math.max(HEAD + 30, Math.min(LH - 30, y)) } : toHex(x, y);
      drawMeasure();
    }
  });
  const end = (ev) => {
    pointers.delete(ev.pointerId);
    if (!drag) return;
    if (drag.kind === "token") {
      const t = drag.t;
      if (drag.moved) { if (isRange()) { t.lane = drag.to.lane; t.y = drag.to.y; } else { t.q = drag.to.q; t.r = drag.to.r; } }
      drag = null; drawTokens(); drawMeasure(); readout.textContent = ""; save(); sel = t.id; drawSel(); return;
    }
    if (drag.kind === "pan" && !drag.moved && sel) { sel = null; drawTokens(); drawSel(); }
    if (drag.kind === "pinch" && pointers.size) { drag = null; return; }
    drag = null; save();
  };
  svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  svg.addEventListener("wheel", (ev) => { ev.preventDefault(); const p = mapPt(ev); zoomAt(ev.deltaY < 0 ? 1.12 : 1 / 1.12, p.sx, p.sy); clearTimeout(svg._t); svg._t = setTimeout(save, 300); }, { passive: false });
  svg.addEventListener("keydown", (ev) => {
    const tg = ev.target.closest && ev.target.closest("[data-tok]"); if (!tg) return;
    if (ev.key === "Delete" || ev.key === "Backspace") { setToks(toks().filter((t) => t.id !== tg.dataset.tok)); sel = null; save(); draw(); ev.preventDefault(); }
    if (ev.key === "Enter" || ev.key === " ") { sel = tg.dataset.tok; drawTokens(); drawSel(); ev.preventDefault(); }
  });

  // ---- images ----
  const readImage = (file, max) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)); if (k === 1 && file.size < 4e6) return res({ url: fr.result, w: im.width, h: im.height });
      const cv = document.createElement("canvas"); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height); res({ url: cv.toDataURL("image/jpeg", 0.88), w: cv.width, h: cv.height }); };
      im.onerror = () => rej(new Error("not an image")); im.src = fr.result; };
    fr.onerror = () => rej(fr.error); fr.readAsDataURL(file);
  });
  function alignToPicture() {
    const w = pointy() ? st.size * SQ3 : st.size * 1.5, h = pointy() ? st.size * 1.5 : st.size * SQ3;
    st.ox = pointy() ? st.size * SQ3 / 2 : st.size; st.oy = pointy() ? st.size : st.size * SQ3 / 2;
    if (st.bgW) { st.cols = Math.max(2, Math.ceil((st.bgW - st.ox) / w) + (pointy() ? 0 : 1)); st.rows = Math.max(2, Math.ceil((st.bgH - st.oy) / h) + 1); }
  }
  async function setBackground(file) {
    try {
      const im = await readImage(file, 4096);
      bgs[st.kind] = im.url;
      // A new picture on the hex map: cover it with hexes at the current size, the first hex tucked into its top-left corner.
      if (!isRange()) { st.bgW = im.w; st.bgH = im.h; alignToPicture(); }
      await idb.set(bgKey(), im.url); save(); draw(); fit();
      say(isRange() ? "Background set behind the lanes." : "Background set. Line the grid up under Scale, grid and map if the picture has its own.");
    } catch { say("That file isn't an image this browser can read.", true); }
  }

  // ---- controls ----
  let pendingImg = null;
  api.root.addEventListener("click", async (ev) => {
    // Tracks in the selection panel: a posse token's go to the character, the crew's ship's to the crew's track,
    // and anyone else's stay on the token.
    const tb = ev.target.closest("[data-bmc-injury],[data-bmc-ptrack],[data-bmc-points],[data-bmt-injury],[data-bmk-track]");
    if (tb) {
      const t = toks().find((x) => x.id === sel); if (!t) return;
      const c = live(t), tr = trackOf(t), d = tb.dataset, toggle = (cur, v) => (cur === v ? v - 1 : v);
      if (d.bmtInjury) { t.injury = toggle(t.injury || 0, +d.bmtInjury); save(); drawTokens(); drawSel(); return; }
      if (d.bmkTrack && tr && api.setGroupTrack) { api.setGroupTrack(tr.name, toggle(tr.value || 0, +d.bmkTrack)); drawTokens(); drawSel(); return; }
      if (!c || !api.setCrew) return;
      if (d.bmcInjury) api.setCrew(t.ref, { injury: toggle(c.injury || 0, +d.bmcInjury) });
      else if (d.bmcPtrack) api.setCrew(t.ref, { ptrack: toggle(c.ptrack.value || 0, +d.bmcPtrack) });
      else if (d.bmcPoints) api.setCrew(t.ref, { points: Math.max(0, (c.points || 0) + +d.bmcPoints) });
      return;
    }
    const pre = ev.target.closest("[data-bmpre]");
    if (pre) { st.scale.n = +pre.dataset.bmpre; save(); draw(); return; }
    const b = ev.target.closest("[data-bm]"); if (!b || b.tagName === "INPUT") return;
    const k = b.dataset.bm, t = toks().find((x) => x.id === sel);
    if (k === "kind") {
      if (st.kind === b.dataset.kind) return;
      st.kind = b.dataset.kind; sel = null; measure = null; mode = "move"; fillThreats(); save(); draw();
      if (!V().set) fit();
    } else if (k === "posse") {
      const crew = api.crew(), have = new Set(toks().map((x) => x.ref).filter(Boolean)), add = crew.filter((c) => !have.has(c.id));
      if (!crew.length) { say("Add characters to the GM view first.", true); return; }
      for (const c of add) toks().push({ id: uid(), ref: c.id, tsize: 1, ...spot(0) });
      save(); draw(); say(add.length ? `Placed ${add.length} from the ${PARTY}.` : `The whole ${PARTY} is already on the map.`);
    } else if (k === "vehicle") {
      if (toks().some((x) => x.track === RT.vehicleTrack)) { say(`${RT.us} is already on the map.`); return; }
      toks().push({ id: uid(), track: RT.vehicleTrack, name: RT.us, color: "#3d7a9e", tsize: 2, ...spot(0) }); save(); draw();
    } else if (k === "add") { const f = $(".bm-add"); f.hidden = !f.hidden; if (!f.hidden) $('[data-bmf="name"]').focus(); }
    else if (k === "addgo") {
      const name = $('[data-bmf="name"]').value.trim(), th = allThreats().find((x) => x.id === $('[data-bmf="threat"]').value);
      const ship = !!(th && (api.vehicles || []).includes(th));
      toks().push({ id: uid(), ref: null, name: name || (th ? th.name : "Token"), color: $('[data-bmf="color"]').value, img: pendingImg, tsize: +$('[data-bmf="tsize"]').value,
        ...spot(RT.startLane || Math.min(3, lanes().length - 1)), boxes: Math.max(1, +$('[data-bmf="boxes"]').value || 1), injury: 0, threat: th ? th.id : null, boxLabel: ship ? "Hull" : "Injury",
        stats: th ? [th.attacks, th.dodge != null && th.dodge !== "" ? `Dodge ${th.dodge}` : "", th.trait].filter(Boolean).join(" · ") : "" });
      // Numbered names count up, so "Outlaw 1" is followed by "Outlaw 2".
      const m = name.match(/^(.*?)(\d+)$/); $('[data-bmf="name"]').value = m ? m[1] + (+m[2] + 1) : name;
      save(); draw();
    } else if (k === "measure") { mode = mode === "measure" ? "move" : "measure"; measure = null; drawMeasure(); syncForm(); say(mode === "measure" ? "Drag from one hex to another to measure." : ""); }
    else if (k === "in" || k === "out") { viewBox(); zoomAt(k === "in" ? 1.25 : 0.8, (svg.clientWidth || 800) / 2, (svg.clientHeight || 500) / 2); save(); }
    else if (k === "fit") fit();
    else if (k === "align") { alignToPicture(); save(); draw(); }
    else if (k === "bgoff") { bgs[st.kind] = null; if (!isRange()) st.bgW = st.bgH = 0; await idb.del(bgKey()); save(); draw(); }
    else if (k === "clear") { if (!toks().length || confirm("Remove every token from this map?")) { setToks([]); sel = null; save(); draw(); } }
    else if (k === "savefile") {
      const blob = new Blob([JSON.stringify({ format: "legend-dynamics-battlemap", version: 2, map: st, background: bgs.hex, backgroundRange: bgs.range })], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "battle-map.json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } else if (k === "del" && t) { setToks(toks().filter((x) => x !== t)); sel = null; save(); draw(); }
    else if (k === "dup" && t) {
      const n = { ...t, id: uid(), ref: null, track: null, injury: 0, name: (t.name || "").replace(/(\d+)$/, (d) => +d + 1), ...(isRange() ? spot(t.lane || 0) : freeHexNear({ q: t.q, r: t.r })) };
      const i = info(t); if (live(t) || trackOf(t)) Object.assign(n, { name: i.name, color: i.color, img: i.img, boxes: i.boxes });
      toks().push(n); sel = n.id; save(); draw();
    } else if (k === "desel") { sel = null; draw(); }
  });
  api.root.addEventListener("change", async (ev) => {
    const i = ev.target;
    if (i.dataset.bm === "bg" && i.files[0]) { await setBackground(i.files[0]); i.value = ""; }
    else if (i.dataset.bmf === "img" && i.files[0]) { try { pendingImg = (await readImage(i.files[0], 256)).url; say("Image ready for the next token."); } catch { say("That file isn't an image.", true); } i.value = ""; }
    else if (i.dataset.bm === "openfile" && i.files[0]) {
      try { const d = JSON.parse(await i.files[0].text()); if (d.format !== "legend-dynamics-battlemap") throw 0;
        st = normal(d.map); bgs.hex = d.background || null; bgs.range = d.backgroundRange || null;
        for (const kk of ["hex", "range"]) { if (bgs[kk]) await idb.set(bgKey(kk), bgs[kk]); else await idb.del(bgKey(kk)); }
        sel = null; fillThreats(); save(); draw(); fit(); say("Map opened.");
      } catch { say("That isn't a battle map file.", true); }
      i.value = "";
    } else if (i.dataset.bmscale) {
      if (i.dataset.bmscale === "unit") { st.scale.unit = i.value; st.scale.n = UNITS[i.value].presets[0]; }
      else if (+i.value > 0) st.scale.n = +i.value;
      save(); draw();
    } else if (i.dataset.bmg) { const k = i.dataset.bmg; st[k] = i.type === "checkbox" ? i.checked : i.tagName === "SELECT" ? i.value : +i.value; save(); draw(); }
    else if (i.dataset.bms) { const t = toks().find((x) => x.id === sel); if (!t) return; const k = i.dataset.bms; t[k] = k === "tsize" || k === "boxes" ? Math.max(1, +i.value || 1) : i.value; save(); drawTokens(); if (k === "boxes") drawSel(); }
    else if (i.dataset.bmc) { const t = toks().find((x) => x.id === sel); if (t && t.ref && api.setCrew) api.setCrew(t.ref, { [i.dataset.bmc]: i.checked }); }
    else if (i.dataset.bmf === "threat") {
      // Picking a threat fills in its name (numbered), boxes and a foe's color.
      const th = allThreats().find((x) => x.id === i.value); if (!th) return;
      const n = toks().filter((x) => x.threat === th.id).length + 1;
      $('[data-bmf="name"]').value = `${th.name.replace(/\s*\(.*\)$/, "")} ${n}`; $('[data-bmf="boxes"]').value = th.boxes || 1; $('[data-bmf="color"]').value = "#a33b2b";
    }
  });
  api.root.addEventListener("input", (ev) => { const i = ev.target; if (i.dataset.bmg && i.type === "range") { st[i.dataset.bmg] = +i.value; drawGrid(); drawTokens(); clearTimeout(i._t); i._t = setTimeout(save, 300); } });
  // The file buttons are labels around file pickers kept in the page (not hidden: some browsers, Safari
  // among them, won't open a picker that isn't); Enter or Space opens them from the keyboard.
  api.root.addEventListener("keydown", (ev) => { const l = ev.target.closest && ev.target.closest(".bm-file"); if (l && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); l.querySelector("input").click(); } });
  // The GM view starts hidden, so the map's real size is only known once it's shown: fit it then, unless the GM has moved the view.
  if (window.ResizeObserver) new ResizeObserver(() => { viewBox(); if (svg.clientWidth && !V().set) { fit(); V().set = false; } }).observe(svg);

  fillThreats();
  Promise.all([idb.get(bgKey("hex")), idb.get(bgKey("range"))]).then(([h, r]) => { bgs.hex = h || null; bgs.range = r || null; draw(); if (!V().set && svg.clientWidth) fit(); });
  draw();
  return { refresh: () => {
    const ids = new Set(api.crew().map((c) => c.id));
    st.tokens = st.tokens.filter((t) => !t.ref || ids.has(t.ref)); st.rt.tokens = st.rt.tokens.filter((t) => !t.ref || ids.has(t.ref));
    drawTokens(); drawSel(); viewBox(); syncForm();
  } };
}

// The setting's opponents, read from a table in the Players' Guide on the page (for settings that keep them only
// in the guide): the table after the heading named (Threats, or Enemy ships), columns found by their headings.
// People: Threat, Attack (target), Dodge, Boxes, Defense, Trait. Ships: Ship, Pilot / Gunner, Hull, Weapons, Trait.
function threatsFromGuide(guide, heading = "Threats", prefix = "guide-") {
  const h = guide && [...guide.querySelectorAll("h1, h2, h3")].find((x) => x.textContent.trim() === heading);
  let t = h && h.nextElementSibling;
  while (t && t.tagName !== "TABLE" && !/^H[123]$/.test(t.tagName)) t = t.nextElementSibling;
  if (!t || t.tagName !== "TABLE") return [];
  const raw = [...t.querySelectorAll("thead th, tr:first-child th")].map((x) => x.textContent.trim()), head = raw.map((x) => x.toLowerCase());
  const col = (re) => head.findIndex((x) => re.test(x));
  const [cName, cAtk, cPilot, cDodge, cBoxes, cDef, cWeap, cTrait] = [/^threat|^ship|^name/, /^attack/, /^pilot/, /^dodge/, /^boxes|^hull/, /^defen/, /^weapons$/, /^trait/].map(col);
  return [...t.querySelectorAll("tbody tr")].map((tr, i) => {
    const td = [...tr.children].map((x) => x.textContent.trim()), at = (c) => (c >= 0 ? td[c] : "");
    const def = at(cDef) && at(cDef) !== "—" ? `Defense ${at(cDef)}` : "";
    const pilot = cPilot >= 0 ? `${raw[cPilot]} ${at(cPilot)}` : "", weap = cWeap >= 0 && at(cWeap) ? at(cWeap) : "";
    return { id: prefix + i, name: at(cName), attacks: [at(cAtk), pilot, weap, def].filter(Boolean).join(" · "), dodge: at(cDodge) || null, boxes: parseInt(at(cBoxes), 10) || 1, trait: at(cTrait) };
  }).filter((x) => x.name);
}
