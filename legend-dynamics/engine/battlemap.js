// Battle map for the GM view: a hex grid over an optional background image, with tokens for the posse
// and anyone else. One module for every creator (Grimm keeps a copy): the page passes in its characters,
// colors and range bands, and the map keeps its own state in this browser (the image in IndexedDB, which
// holds large pictures; the rest in localStorage) and in a map file the GM can save and open again.
//
// mountBattleMap({ root, key, esc, crew, bands, yardsPerHex, toast })
//   root: an empty element to draw into; key: a storage prefix (one map per setting)
//   crew(): [{ id, name, portrait, color, down, dying }] for "Add the posse" and live token state
//   bands: [[name, maxYards]] in order (the range bands), yardsPerHex: the map's scale
// Returns { refresh() } to call when the characters change.
function mountBattleMap(api) {
  const SVGNS = "http://www.w3.org/2000/svg", SQ3 = Math.sqrt(3);
  const esc = api.esc, KEY = api.key + ".battlemap.v1";
  const say = (m, err) => (api.toast ? api.toast(m, err) : null);
  const fresh = () => ({ size: 36, orient: "pointy", ox: 31.2, oy: 36, cols: 24, rows: 16, grid: true, gridAlpha: 0.45, view: { x: 0, y: 0, z: 1 }, tokens: [], bgW: 0, bgH: 0 });
  let st = Object.assign(fresh(), load());
  let bg = null; // the background image as a data URL (kept in IndexedDB)
  let sel = null, mode = "move", drag = null, measure = null, pointers = new Map();

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
  function rangeText(n) {
    const yd = n * (api.yardsPerHex || 1);
    const band = n <= 1 ? "in reach" : ((api.bands || []).find(([, max]) => yd <= max) || ["out of range"])[0];
    return `${n} hex${n === 1 ? "" : "es"} · ${yd} yd · ${band}`;
  }

  // ---- markup ----
  api.root.innerHTML = `
    <div class="bm-bar">
      <label class="btn bm-file">Background image…<input type="file" accept="image/*" data-bm="bg" hidden></label>
      <button class="btn" data-bm="posse">Add the posse</button>
      <button class="btn" data-bm="add">Add a token</button>
      <button class="btn" data-bm="measure" aria-pressed="false">Measure</button>
      <span class="bm-zoom"><button class="btn" data-bm="out" aria-label="Zoom out">−</button><button class="btn" data-bm="fit">Fit</button><button class="btn" data-bm="in" aria-label="Zoom in">+</button></span>
    </div>
    <div class="bm-add" hidden>
      <label>Name <input type="text" data-bmf="name" placeholder="e.g. Outlaw 1"></label>
      <label>Color <input type="color" data-bmf="color" value="#a33b2b"></label>
      <label>Size <select data-bmf="tsize"><option value="1">1 hex</option><option value="2">2 hexes</option><option value="3">3 hexes</option></select></label>
      <label class="btn bm-file">Image (optional)…<input type="file" accept="image/*" data-bmf="img" hidden></label>
      <button class="btn primary" data-bm="addgo">Place it</button>
    </div>
    <div class="bm-stage"><svg class="bm-svg" role="application" aria-label="Battle map. Drag the map to pan, scroll or pinch to zoom, drag a token to move it.">
      <defs><clipPath id="bm-clip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>
      <g class="bm-world"><image class="bm-bg" preserveAspectRatio="none"/><path class="bm-grid"/><g class="bm-tokens"></g><g class="bm-measure"></g></g>
    </svg><div class="bm-readout" aria-live="polite"></div></div>
    <div class="bm-sel" hidden></div>
    <details class="bm-gridset"><summary class="small">Grid and map</summary>
      <div class="bm-gridrow">
        <label>Hex size <input type="range" min="10" max="140" step="1" data-bmg="size"></label>
        <label>Hexes <select data-bmg="orient"><option value="pointy">Pointy top</option><option value="flat">Flat top</option></select></label>
        <label>Columns <input type="number" min="2" max="200" data-bmg="cols"></label>
        <label>Rows <input type="number" min="2" max="200" data-bmg="rows"></label>
        <label>Shift right <input type="number" step="1" data-bmg="ox"></label>
        <label>Shift down <input type="number" step="1" data-bmg="oy"></label>
        <label><input type="checkbox" data-bmg="grid"> Show grid</label>
        <label>Grid strength <input type="range" min="0.1" max="1" step="0.05" data-bmg="gridAlpha"></label>
      </div>
      <p class="small muted">One hex is ${api.yardsPerHex || 1} yard${(api.yardsPerHex || 1) === 1 ? "" : "s"}. To line the grid up with a map that has its own grid, set the hex size first, then shift it into place.</p>
      <div class="bm-bar"><button class="btn" data-bm="align">Fit the grid to the picture</button><button class="btn" data-bm="bgoff">Remove the image</button><button class="btn" data-bm="clear">Remove all tokens</button>
        <button class="btn" data-bm="savefile">Save map to file</button><label class="btn bm-file">Open a map file…<input type="file" accept=".json,application/json" data-bm="openfile" hidden></label></div>
    </details>`;
  const $ = (s) => api.root.querySelector(s);
  const svg = $(".bm-svg"), world = $(".bm-world"), gTok = $(".bm-tokens"), gMeas = $(".bm-measure"), readout = $(".bm-readout");
  const el = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v); return n; };

  // ---- drawing ----
  function viewBox() { const w = svg.clientWidth || 800, h = svg.clientHeight || 500; svg.setAttribute("viewBox", `0 0 ${w} ${h}`); }
  function drawWorld() { world.setAttribute("transform", `translate(${st.view.x} ${st.view.y}) scale(${st.view.z})`); }
  function drawGrid() {
    const g = $(".bm-grid");
    g.setAttribute("d", st.grid ? cells().map((h) => "M" + corners(toPx(h.q, h.r)).map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z").join("") : "");
    g.style.opacity = st.gridAlpha;
    const im = $(".bm-bg");
    if (bg) { im.setAttribute("href", bg); im.setAttribute("width", st.bgW); im.setAttribute("height", st.bgH); im.removeAttribute("display"); }
    else im.setAttribute("display", "none");
  }
  const live = (t) => (t.ref && api.crew().find((c) => c.id === t.ref)) || null;
  function drawTokens() {
    gTok.textContent = "";
    for (const t of st.tokens) {
      const c = live(t), p = toPx(t.q, t.r), rad = st.size * (0.8 + 0.95 * ((t.tsize || 1) - 1));
      const name = c ? c.name : t.name, color = c ? c.color : t.color, img = c ? c.portrait : t.img;
      const g = el("g", { class: "bm-tok" + (sel === t.id ? " sel" : "") + (c && c.down ? " down" : "") + (c && c.dying ? " dying" : ""), "data-tok": t.id, transform: `translate(${p.x} ${p.y})`, tabindex: "0", role: "button", "aria-label": name || "Token" });
      g.appendChild(el("circle", { r: rad, class: "bm-disc", style: `fill:${color || "#777"}` }));
      if (img) g.appendChild(el("image", { href: img, x: -rad * 0.9, y: -rad * 0.9, width: rad * 1.8, height: rad * 1.8, "clip-path": "url(#bm-clip)", preserveAspectRatio: "xMidYMid slice" }));
      else { const tx = el("text", { class: "bm-init", "font-size": rad * 0.8, dy: "0.35em" }); tx.textContent = (name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(); g.appendChild(tx); }
      g.appendChild(el("circle", { r: rad, class: "bm-ring" }));
      const lb = el("text", { class: "bm-label", y: rad + Math.max(10, st.size * 0.38), "font-size": Math.max(9, st.size * 0.32) }); lb.textContent = name || ""; g.appendChild(lb);
      gTok.appendChild(g);
    }
  }
  function drawMeasure() {
    gMeas.textContent = "";
    const m = drag && drag.kind === "token" && drag.moved ? { a: drag.from, b: drag.to } : measure;
    if (!m || !m.b) { readout.textContent = sel ? "" : ""; return; }
    const a = toPx(m.a.q, m.a.r), b = toPx(m.b.q, m.b.r), n = dist(m.a, m.b);
    gMeas.appendChild(el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "bm-mline" }));
    gMeas.appendChild(el("circle", { cx: b.x, cy: b.y, r: st.size * 0.25, class: "bm-mdot" }));
    readout.textContent = rangeText(n);
  }
  function drawSel() {
    const box = $(".bm-sel"), t = st.tokens.find((x) => x.id === sel);
    box.hidden = !t;
    if (!t) return;
    const c = live(t);
    box.innerHTML = `<b>${esc(c ? c.name : t.name || "Token")}</b>${c ? ` <span class="small muted">(from the posse${c.dying ? ", Dying" : c.down ? ", down" : ""})</span>` : ""}
      ${c ? "" : `<label>Name <input type="text" data-bms="name" value="${esc(t.name || "")}"></label><label>Color <input type="color" data-bms="color" value="${esc(t.color || "#777777")}"></label>`}
      <label>Size <select data-bms="tsize">${[1, 2, 3].map((n) => `<option value="${n}"${(t.tsize || 1) === n ? " selected" : ""}>${n} hex${n > 1 ? "es" : ""}</option>`).join("")}</select></label>
      <button class="btn" data-bm="dup">Copy</button><button class="btn" data-bm="del">Remove</button><button class="linkish" data-bm="desel">Done</button>`;
  }
  function draw() { viewBox(); drawWorld(); drawGrid(); drawTokens(); drawMeasure(); drawSel(); syncGridForm(); }
  function syncGridForm() {
    api.root.querySelectorAll("[data-bmg]").forEach((i) => { const k = i.dataset.bmg; if (document.activeElement === i) return; if (i.type === "checkbox") i.checked = !!st[k]; else i.value = st[k]; });
    $('[data-bm="measure"]').setAttribute("aria-pressed", mode === "measure");
  }

  // ---- coordinates: screen → map ----
  function mapPt(ev) {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, sx = vb.width / r.width, sy = vb.height / r.height;
    const x = (ev.clientX - r.left) * sx, y = (ev.clientY - r.top) * sy;
    return { sx: x, sy: y, x: (x - st.view.x) / st.view.z, y: (y - st.view.y) / st.view.z };
  }
  function zoomAt(f, sx, sy) {
    const z = Math.max(0.15, Math.min(6, st.view.z * f)); f = z / st.view.z;
    st.view.x = sx - (sx - st.view.x) * f; st.view.y = sy - (sy - st.view.y) * f; st.view.z = z; drawWorld();
  }
  function fit() {
    viewBox();
    const w = svg.clientWidth || 800, h = svg.clientHeight || 500;
    const last = toPx(pointy() ? st.cols : st.cols * 1, st.rows), mw = Math.max(st.bgW, last.x + st.size * 2), mh = Math.max(st.bgH, last.y + st.size * 2);
    st.view.z = Math.max(0.15, Math.min(6, Math.min(w / mw, h / mh))); st.view.x = (w - mw * st.view.z) / 2; st.view.y = (h - mh * st.view.z) / 2;
    drawWorld(); save();
  }
  const centerHex = () => { const w = svg.clientWidth || 800, h = svg.clientHeight || 500; return toHex((w / 2 - st.view.x) / st.view.z, (h / 2 - st.view.y) / st.view.z); };
  function freeHexNear(h) {
    const used = new Set(st.tokens.map((t) => t.q + "," + t.r));
    for (let ring = 0; ring < 30; ring++) for (let dq = -ring; dq <= ring; dq++) for (let dr = Math.max(-ring, -dq - ring); dr <= Math.min(ring, -dq + ring); dr++) {
      const q = h.q + dq, r = h.r + dr; if (dist({ q, r }, h) === ring && !used.has(q + "," + r)) return { q, r };
    }
    return h;
  }
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---- pointer: pan, zoom, drag tokens, measure ----
  svg.addEventListener("pointerdown", (ev) => {
    svg.setPointerCapture(ev.pointerId); pointers.set(ev.pointerId, mapPt(ev));
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag = { kind: "pinch", d: Math.hypot(a.sx - b.sx, a.sy - b.sy) }; return; }
    const p = mapPt(ev), tg = ev.target.closest && ev.target.closest("[data-tok]");
    if (mode === "measure") { const h = toHex(p.x, p.y); measure = { a: h, b: h }; drag = { kind: "measure" }; drawMeasure(); return; }
    if (tg) { const t = st.tokens.find((x) => x.id === tg.dataset.tok); sel = t.id; drag = { kind: "token", t, from: { q: t.q, r: t.r }, to: { q: t.q, r: t.r }, moved: false, off: { x: p.x - toPx(t.q, t.r).x, y: p.y - toPx(t.q, t.r).y } }; drawTokens(); drawSel(); return; }
    drag = { kind: "pan", sx: p.sx, sy: p.sy, vx: st.view.x, vy: st.view.y, moved: false };
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, mapPt(ev));
    if (!drag) return;
    const p = mapPt(ev);
    if (drag.kind === "pinch" && pointers.size === 2) { const [a, b] = [...pointers.values()], d = Math.hypot(a.sx - b.sx, a.sy - b.sy); zoomAt(d / drag.d, (a.sx + b.sx) / 2, (a.sy + b.sy) / 2); drag.d = d; return; }
    if (drag.kind === "pan") { st.view.x = drag.vx + p.sx - drag.sx; st.view.y = drag.vy + p.sy - drag.sy; drag.moved = drag.moved || Math.abs(p.sx - drag.sx) + Math.abs(p.sy - drag.sy) > 4; drawWorld(); return; }
    if (drag.kind === "measure") { measure.b = toHex(p.x, p.y); drawMeasure(); return; }
    if (drag.kind === "token") {
      const g = gTok.querySelector(`[data-tok="${drag.t.id}"]`); if (g) g.setAttribute("transform", `translate(${p.x - drag.off.x} ${p.y - drag.off.y})`);
      const h = toHex(p.x - drag.off.x, p.y - drag.off.y); drag.moved = true; drag.to = h; drawMeasure();
    }
  });
  const end = (ev) => {
    pointers.delete(ev.pointerId);
    if (!drag) return;
    if (drag.kind === "token") { if (drag.moved) { drag.t.q = drag.to.q; drag.t.r = drag.to.r; } const t = drag.t; drag = null; drawTokens(); drawMeasure(); readout.textContent = ""; save(); sel = t.id; drawSel(); return; }
    if (drag.kind === "pan" && !drag.moved && sel) { sel = null; drawTokens(); drawSel(); }
    if (drag.kind === "pinch" && pointers.size) { drag = null; return; }
    drag = null; save();
  };
  svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  svg.addEventListener("wheel", (ev) => { ev.preventDefault(); const p = mapPt(ev); zoomAt(ev.deltaY < 0 ? 1.12 : 1 / 1.12, p.sx, p.sy); clearTimeout(svg._t); svg._t = setTimeout(save, 300); }, { passive: false });
  svg.addEventListener("keydown", (ev) => {
    const tg = ev.target.closest && ev.target.closest("[data-tok]"); if (!tg) return;
    if (ev.key === "Delete" || ev.key === "Backspace") { st.tokens = st.tokens.filter((t) => t.id !== tg.dataset.tok); sel = null; save(); draw(); ev.preventDefault(); }
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
      bg = im.url; st.bgW = im.w; st.bgH = im.h;
      // A new picture: cover it with hexes at the current size, the first hex tucked into its top-left corner.
      alignToPicture();
      await idb.set(KEY + ".bg", bg); save(); draw(); fit(); say("Background set. Line the grid up under Grid and map if the picture has its own.");
    } catch { say("That file isn't an image this browser can read.", true); }
  }

  // ---- controls ----
  let pendingImg = null;
  api.root.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-bm]"); if (!b || b.tagName === "INPUT") return;
    const k = b.dataset.bm, t = st.tokens.find((x) => x.id === sel);
    if (k === "posse") {
      const crew = api.crew(), have = new Set(st.tokens.map((x) => x.ref).filter(Boolean)), add = crew.filter((c) => !have.has(c.id));
      if (!crew.length) { say("Add characters to the GM view first.", true); return; }
      let h = centerHex(); for (const c of add) { h = freeHexNear(h); st.tokens.push({ id: uid(), ref: c.id, q: h.q, r: h.r, tsize: 1 }); }
      save(); draw(); say(add.length ? `Placed ${add.length} from the posse.` : "The whole posse is already on the map.");
    } else if (k === "add") { const f = $(".bm-add"); f.hidden = !f.hidden; if (!f.hidden) $('[data-bmf="name"]').focus(); }
    else if (k === "addgo") {
      const name = $('[data-bmf="name"]').value.trim(), h = freeHexNear(centerHex());
      st.tokens.push({ id: uid(), ref: null, name: name || "Token", color: $('[data-bmf="color"]').value, img: pendingImg, tsize: +$('[data-bmf="tsize"]').value, q: h.q, r: h.r });
      // Numbered names count up, so "Outlaw 1" is followed by "Outlaw 2".
      const m = name.match(/^(.*?)(\d+)$/); $('[data-bmf="name"]').value = m ? m[1] + (+m[2] + 1) : name;
      save(); draw();
    } else if (k === "measure") { mode = mode === "measure" ? "move" : "measure"; measure = null; drawMeasure(); syncGridForm(); say(mode === "measure" ? "Drag from one hex to another to measure." : ""); }
    else if (k === "in" || k === "out") { viewBox(); zoomAt(k === "in" ? 1.25 : 0.8, (svg.clientWidth || 800) / 2, (svg.clientHeight || 500) / 2); save(); }
    else if (k === "fit") fit();
    else if (k === "align") { alignToPicture(); save(); draw(); }
    else if (k === "bgoff") { bg = null; st.bgW = st.bgH = 0; await idb.del(KEY + ".bg"); save(); draw(); }
    else if (k === "clear") { if (!st.tokens.length || confirm("Remove every token from the map?")) { st.tokens = []; sel = null; save(); draw(); } }
    else if (k === "savefile") {
      const blob = new Blob([JSON.stringify({ format: "legend-dynamics-battlemap", version: 1, map: st, background: bg })], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "battle-map.json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } else if (k === "del" && t) { st.tokens = st.tokens.filter((x) => x !== t); sel = null; save(); draw(); }
    else if (k === "dup" && t) { const h = freeHexNear({ q: t.q, r: t.r }); const n = { ...t, id: uid(), ref: null, q: h.q, r: h.r }; const c = live(t); if (c) Object.assign(n, { name: c.name, color: c.color, img: c.portrait }); st.tokens.push(n); sel = n.id; save(); draw(); }
    else if (k === "desel") { sel = null; draw(); }
  });
  api.root.addEventListener("change", async (ev) => {
    const i = ev.target;
    if (i.dataset.bm === "bg" && i.files[0]) { await setBackground(i.files[0]); i.value = ""; }
    else if (i.dataset.bmf === "img" && i.files[0]) { try { pendingImg = (await readImage(i.files[0], 256)).url; say("Image ready for the next token."); } catch { say("That file isn't an image.", true); } i.value = ""; }
    else if (i.dataset.bm === "openfile" && i.files[0]) {
      try { const d = JSON.parse(await i.files[0].text()); if (d.format !== "legend-dynamics-battlemap") throw 0;
        st = Object.assign(fresh(), d.map || {}); bg = d.background || null; if (bg) await idb.set(KEY + ".bg", bg); else await idb.del(KEY + ".bg"); sel = null; save(); draw(); fit(); say("Map opened.");
      } catch { say("That isn't a battle map file.", true); }
      i.value = "";
    } else if (i.dataset.bmg) { const k = i.dataset.bmg; st[k] = i.type === "checkbox" ? i.checked : i.tagName === "SELECT" ? i.value : +i.value; save(); draw(); }
    else if (i.dataset.bms) { const t = st.tokens.find((x) => x.id === sel); if (!t) return; const k = i.dataset.bms; t[k] = k === "tsize" ? +i.value : i.value; save(); drawTokens(); }
  });
  api.root.addEventListener("input", (ev) => { const i = ev.target; if (i.dataset.bmg && i.type === "range") { st[i.dataset.bmg] = +i.value; drawGrid(); drawTokens(); clearTimeout(i._t); i._t = setTimeout(save, 300); } });
  if (window.ResizeObserver) new ResizeObserver(() => { viewBox(); }).observe(svg);

  idb.get(KEY + ".bg").then((v) => { bg = v || null; draw(); if (!st.view || (st.view.z === 1 && st.view.x === 0 && st.view.y === 0)) fit(); });
  draw();
  return { refresh: () => { st.tokens = st.tokens.filter((t) => !t.ref || api.crew().some((c) => c.id === t.ref)); drawTokens(); drawSel(); viewBox(); } };
}
