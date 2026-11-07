// The playtest kit in the GM view: everything for running a three-hour playtest of the game's first adventure with
// people who have never seen it. Plain script, inlined by tools/build-legend.py (/* PLAYTEST */) into the creators,
// and by tools/build-guide.py (between the page's PLAYTEST start and end markers) into the fan games; no modules, no globals.
//
// The kit (a pack's "playtest", or a fan game's playtest.json): { name, short, adv (the adventure), term, fan,
//   feedback (where players answer the questions), prep: [html],
//   cast: [[name, line]], castNote, run: [[time, title, html, cut?]] }.
// The prep ticks and the session notes are kept in this browser (<storeKey>.ticks, <storeKey>.notes).
//
// kit.maps (the four first adventures, tools/battlemap_scenes.py): { folder, scenes: [{ n, name, hex, hexText, area }],
//   tokens: [{ name, size, look }] }. The pictures are in the table server's bucket (battle-maps/<folder>/): a map named
//   with its scene's number first, or after the scene its name matches; a token named starting "token".
//
// kit.campaign (tools/playtest_campaigns.py): the adventure as a campaign for the Campaign tab: its premise, a step of the
//   outline for each scene, its people, places and factions, and the first session. kit.setup: what else the table needs
//   ({ clocks: [[name, size]], discovery: { name, phases }, threat: size, files: [{ on, holder, knows }] }).
//
// mountPlaytest(api) with api: { kit, root, esc, storeKey, toast(m, err), server?, map? (the battle map: useBackgroundUrl,
//   addPictureToken), showMap?() (opens the battle map), givePictures?(name, portrait, token),
//   loadCampaign?(campaign, label, setup) (into the Campaign tab, and the GM's table set up for it: true if it did), crew?() (the GM view's characters: [{ name, rank }]) }.
// Returns { refresh() (the GM view's characters changed: their cards follow), scenes (their names), setScene(i) (scene i on
//   the battle map: its map, the characters, and its people and enemies with their threats' numbers; resolves true) }.
//
// The characters' cards: everyone in the adventure the same way (the pregenerated characters, the people and creatures in
// its fights, the GM view's own characters, and anyone a picture is uploaded for), each with a portrait and a token,
// matched to their pictures by name ("portrait - <name>", "token - <name>"), forgiving a misspelling.
// Function declarations only.

function ptWrapRow() {
  return ["2:45", "Wrap up and questions", "<p>Say what happened. Then stop the game and ask the debrief questions below, out loud, before anyone leaves. Post the Playtest page link in the chat for anyone who'd rather write.</p>"];
}

function mountPlaytest(api) {
  const { kit: K, root, esc } = api;
  if (!K || !root) return;
  if (!document.getElementById("pt-style")) {
    const st = document.createElement("style"); st.id = "pt-style";
    st.textContent = `.pt-sec { border-top: 1px solid var(--line); padding: 8px 0; } .pt-sec > summary { cursor: pointer; padding: 4px 0; }
      .pt-sec pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; font: inherit; font-size: .92rem; }
      .pt-check { list-style: none; padding: 0; margin: 8px 0; display: grid; gap: 6px; } .pt-check label { display: flex; gap: 8px; align-items: flex-start; font: inherit; font-size: .95rem; color: var(--fg); letter-spacing: normal; text-transform: none; }
      .pt-check input { margin-top: 5px; flex: none; }
      .pt-cast { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 8px; }
      .pt-cast > div { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; display: grid; min-width: 0; }
      .pt-run { list-style: none; padding: 0; margin: 8px 0; } .pt-run > li { display: grid; grid-template-columns: 3.6rem 1fr; gap: 10px; padding: 8px 0; border-top: 1px dashed var(--line); }
      .pt-run p { margin: 4px 0; } .pt-mark { color: var(--chrome); }
      .pt-maps { list-style: none; padding: 0; margin: 8px 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 10px; }
      .pt-maps > li { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto; min-width: 0; }
      .pt-pic { aspect-ratio: 16 / 9; max-width: 100%; display: grid; place-items: center; background: var(--line); font-size: .85rem; color: var(--fg); opacity: .85; }
      .pt-pic { overflow: hidden; } .pt-pic a { display: block; width: 100%; height: 100%; }
      .pt-pic img { width: 100%; height: 100%; object-fit: cover; display: block; } .pt-tok .pt-pic { aspect-ratio: 1; } .pt-tok .pt-pic img { object-fit: contain; }
      .pt-txt { padding: 6px 8px 0; display: grid; gap: 2px; font-size: .9rem; } .pt-acts { padding: 6px 8px 8px; display: flex; flex-wrap: wrap; gap: 6px; }
      .pt-acts .btn { font-size: .82rem; padding: 6px 9px; }
      .pt-pcpics { display: grid; grid-template-columns: 3fr 2fr; gap: 2px; background: var(--line); } .pt-pcpics .pt-pic { aspect-ratio: auto; height: 9rem; }
      .pt-pcpics img { object-fit: cover; } .pt-tokpic img { object-fit: contain; }
      .pt-load { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; margin: 4px 0 10px; } .pt-load .small { flex: 1 1 16rem; }
      .pt-cut { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; }`;
    document.head.appendChild(st);
  }
  const key = api.storeKey || "playtest";
  const get = (k) => { try { return localStorage.getItem(key + "." + k); } catch { return null; } };
  const set = (k, v) => { try { v === null ? localStorage.removeItem(key + "." + k) : localStorage.setItem(key + "." + k, v); } catch {} };
  const say = (m, err) => (api.toast ? api.toast(m, err) : null);
  let ticks = {};
  try { ticks = JSON.parse(get("ticks") || "{}") || {}; } catch { ticks = {}; }
  const sec = (id, title, body, open) => `<details class="pt-sec" data-sec="${id}"${open ? " open" : ""}><summary><b>${esc(title)}</b></summary>${body}</details>`;
  root.innerHTML = `<h3>Playtest kit: ${esc(K.adv)}</h3>
    <p class="small muted">Run a three-hour playtest of this ${esc(K.term)} with people who've never seen the game: prepare, follow the run sheet, and ask the right questions after. The ${esc(K.term)} itself is in the GM's Guide.</p>
    ${K.campaign && api.loadCampaign ? `<div class="pt-load"><button type="button" class="btn primary" data-pt-campaign>Load ${esc(K.adv)}</button><span class="small muted">The whole ${esc(K.term)} in one go. The Campaign tab gets its premise and the truth behind it, a step of the outline for each scene, ${K.campaign.people.length} people, ${K.campaign.places.length} places, ${K.campaign.factions.length} faction${K.campaign.factions.length === 1 ? "" : "s"} and the first session's plan; the table gets the ready-made characters, with their pictures${K.setup && K.setup.discovery ? ", the discovery clock" : ""}${K.setup && K.setup.clocks ? ", its clocks" : ""}${K.setup && K.setup.files ? " and the villains' files" : ""}. Nothing reaches the players until you share it.</span></div>` : ""}
    ${sec("prep", "1. Before the session", `<ul class="pt-check">${K.prep.map((t, i) => `<li><label><input type="checkbox" data-pttick="${i}"${ticks[i] ? " checked" : ""}> <span>${t}</span></label></li>`).join("")}</ul>
      <p class="small"><b>The cast, in one line each</b></p>
      <div class="pt-cast">${K.cast.map(([n, t]) => `<div><b>${esc(n)}</b><span class="small muted">${esc(t)}</span></div>`).join("")}</div>
      <p class="small muted">${esc(K.castNote || "")}</p>`, true)}
    ${K.maps && api.server ? sec("maps", "2. Characters, maps and tokens", `<p class="small">A portrait and a token for everyone in the ${esc(K.term)}, and a map for each scene, ready to use. <b>Give the pictures</b> puts a character's portrait on their sheet and their token on the battle map; <b>Set up on the battle map</b> puts a scene's map under the grid at its hex size, with the characters on one side and everyone in the scene on the other (enemies with their threat's boxes and numbers); <b>Add to the battle map</b> puts one more token on it. Download any of them to print, or for another table.</p>
      <p class="small muted" data-ptm-status>Looking for the pictures…</p>
      <h4>The characters</h4><p class="small muted">Everyone in the ${esc(K.term)}, each with a portrait and a token: name the pictures <i>Portrait - name</i> and <i>Token - name</i> in the bucket, and a picture for someone new gets a card of their own. A pregenerated character gets their pictures by themselves when they're loaded; <b>Give the pictures</b> gives them to copies already loaded.</p>
      <ol class="pt-maps" data-ptm-people></ol>
      <h4>Scenes</h4><ol class="pt-maps">${K.maps.scenes.map((x) => `<li data-ptm-scene="${x.n}"><div class="pt-pic">Map coming soon</div><div class="pt-txt"><b>${esc(x.name)}</b><span class="small muted">${x.hex ? `${x.hex} yard${x.hex === 1 ? "" : "s"} a hex` : esc(x.hexText)} · ${esc(x.area.replace(/^about /, ""))}</span>${ptWho(K.maps, x.n) ? `<span class="small">In it: ${esc(ptWho(K.maps, x.n))}</span>` : ""}</div><div class="pt-acts"></div></li>`).join("")}</ol>
      <div data-ptm-extra></div>`, true) : ""}
    ${sec("run", "3. The run sheet: three hours", `<p class="small">The full ${esc(K.term)} is written for one or two sessions; this is the cut for one evening. If you're running behind, take the cuts: they're only ever on side scenes. The story's main beats, its climax and its choice are never cut; shorten the talk around them instead.</p>
      <ol class="pt-run">${[...K.run, ptWrapRow()].map(([t, h, body, cut]) => `<li><span class="pt-mark num">${esc(t)}</span><div><b>${esc(h)}</b>${body}${cut ? `<p class="small"><span class="pt-cut">Cut</span> ${esc(cut)}</p>` : ""}</div></li>`).join("")}</ol>`)}
    ${sec("watch", "4. During the game", `<p class="small">Jot these down as they happen: every rule you had to look up, every time a player asked "what do I roll?", what nobody touched on their sheet, how long each scene took, and the moments people leaned in.</p>
      <div class="field"><label for="pt-notes">Your notes for this session</label><textarea id="pt-notes" rows="7" placeholder="0:52 — a player asked what Investigation covers"></textarea></div>
      <div class="btn-row"><button type="button" class="btn" id="pt-notes-copy">Copy notes</button><button type="button" class="btn" id="pt-notes-clear">Clear</button><span class="small muted">Kept in this browser as you type.</span></div>`)}
    ${sec("after", "5. After the game", `<p class="small"><b>Ask out loud, before anyone leaves:</b> What was confusing? What did you never use? What was the best moment? Would you play again, and what would you want to do next time? Listen more than you explain.</p>
      <p class="small"><b>Then the written answers:</b> players answer the same questions on <code>${esc(K.feedback)}</code>. Only you read them: on the main site's Dev blog Write page, sign in with your DEV code and press <b>Playtest feedback</b>.</p>
      <p class="small"><b>Say thank you</b> within a day: tell each player one thing you're changing because of them, and ask how they'd like their name in the credits.</p>`)}`;
  const maps = K.maps && api.server ? ptMaps(api, root) : null;
  const notes = root.querySelector("#pt-notes");
  notes.value = get("notes") || "";
  notes.addEventListener("input", () => set("notes", notes.value));
  const copy = (text, done) => { const p = navigator.clipboard && navigator.clipboard.writeText(text); if (p) p.then(() => done(true), () => done(false)); else done(false); };
  let armed = false;
  root.addEventListener("change", (e) => {
    const t = e.target.closest("[data-pttick]"); if (!t) return;
    if (t.checked) ticks[t.dataset.pttick] = 1; else delete ticks[t.dataset.pttick];
    set("ticks", JSON.stringify(ticks));
  });
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-pt-campaign]")) { api.loadCampaign(JSON.parse(JSON.stringify(K.campaign)), `the playtest's (${K.adv})`, K.setup || {}); return; }
    if (e.target.id === "pt-notes-copy") { copy(notes.value, (ok) => { if (!ok) notes.select(); say(ok ? "Notes copied." : "Selected: copy them yourself.", !ok); }); return; }
    if (e.target.id === "pt-notes-clear") {
      if (!armed) { armed = true; e.target.textContent = "Tap again to clear"; setTimeout(() => { armed = false; e.target.textContent = "Clear"; }, 3000); return; }
      armed = false; notes.value = ""; set("notes", null); e.target.textContent = "Clear"; say("Notes cleared.");
    }
  });
  return { refresh: () => { if (maps) maps.refresh(); }, scenes: K.maps ? K.maps.scenes.map((x) => x.name) : [], setScene: (i) => (maps ? maps.setScene(i) : Promise.resolve(false)) };
}

/** Who's in a scene, for its card: "Ghoul ×3, Ezra Quill". */
function ptWho(M, n) { return (M.tokens || []).filter((t) => t.scenes && t.scenes[n]).map((t) => t.name.split(",")[0] + (t.scenes[n].count > 1 ? ` ×${t.scenes[n].count}` : "")).join(", "); }

/** A name's words, for matching pictures to people: accents dropped, short words and the picture's kind left out. */
function ptWords(t) {
  const stop = ["token", "portrait", "the", "and", "for", "with", "png", "jpg", "jpeg", "webp"];
  return (String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{3,}/g) || []).filter((w) => !stop.includes(w));
}
/** How alike two words are, 0 to 1 (edit distance, a swapped pair of letters counting once). */
function ptSim(a, b) {
  if (a === b) return 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}
/** How well a picture's name names a person: the sum, over its words, of how alike each is to one of theirs (0: not them).
 *  "Token Sergie Graychov" still names Sergei Grachyov; "Bulldog" names Luis "Bulldog" Ortega. */
function ptNameScore(picName, personName) {
  const nw = ptWords(personName); let s = 0;
  for (const w of ptWords(picName)) { let best = 0; for (const x of nw) best = Math.max(best, ptSim(w, x)); if (best >= 0.7) s += best; }
  return s;
}
/** A picture's person: its title without the kind ("Token - Sergie Graychov" → "Sergie Graychov"). */
function ptPicName(p) { return String(p.title || p.file || "").replace(/^\s*(token|portrait)\b[\s:._-]*/i, "").trim(); }

/** The playtest kit's pictures: fetch the list, put each picture on its card, wire up the buttons. Returns { refresh() }. */
function ptMaps(api, root) {
  const { kit: K, esc } = api, M = K.maps, say = (m, err) => (api.toast ? api.toast(m, err) : null);
  const status = root.querySelector("[data-ptm-status]"), size = (n) => (n >= 104858 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const words = (t) => new Set(String(t).toLowerCase().match(/[a-z]{3,}/g) || []);   // three letters, for names like Nyx
  const STOP = new Set(["token", "portrait", "battle", "overhead", "view", "scene", "map", "the", "and", "for", "with", "from", "into", "over", "that", "this", "their", "where"]);
  const best = (pics, items, text) => {   // each map to the scene its name matches best (the scene's own name counts most)
    const pairs = [];
    for (const p of pics) { const w = [...words(p.title)].filter((x) => !STOP.has(x));
      items.forEach((it, i) => { const nw = words(it.name), dw = words(text(it)); let sc = 0; for (const x of w) sc += nw.has(x) ? 3 : dw.has(x) ? 1 : 0; if (sc >= 3) pairs.push({ p, i, sc }); }); }
    pairs.sort((a, b) => b.sc - a.sc || a.i - b.i);
    const out = new Map(), used = new Set();
    for (const x of pairs) if (!used.has(x.p.file) && !out.has(x.i)) { out.set(x.i, x.p); used.add(x.p.file); }
    return out;
  };
  const picHTML = (p) => `<a href="${esc(p.src)}" target="_blank" rel="noopener"><img src="${esc(p.src)}" alt="" loading="lazy"></a>`;
  const card = (li, p, buttons) => {
    li.querySelector(".pt-pic").innerHTML = picHTML(p);
    li.querySelector(".pt-acts").innerHTML = buttons + `<a class="btn" href="${esc(p.download)}" download>Download <span class="small muted">${size(p.bytes)}</span></a>`;
  };
  const isTok = (p) => /^\s*token\b/i.test(p.file), isPortrait = (p) => /^\s*portrait\b/i.test(p.file);
  const first = (n) => n.replace(/^(Dr|Rev|Mr|Mrs|Ms|Sgt|Capt)\.?\s+/, "").split(/[\s,]/)[0];
  let pics = null, people = [], crewSeen = "";

  /** Everyone, in order: the pregenerated characters, the adventure's people and creatures, the GM view's own
   *  characters, then anyone a picture is uploaded for; each with the portrait and token that name them best. */
  function cast() {
    const out = [], same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const add = (x) => { if (!out.some((y) => same(y.name, x.name))) out.push({ portrait: null, token: null, ...x }); };
    for (const x of M.pregens || []) add({ name: x.name, sub: x.rank || "", pc: true });
    for (const x of M.tokens || []) add({ name: x.name.split(",")[0], sub: x.size === "ship" ? "A ship" : `${x.size || "1 hex"}${x.name.includes(",") ? " · " + x.name.split(",").slice(1).join(",").trim() : ""}`, size: x.size === "ship" ? 2 : parseInt(x.size, 10) || 1 });
    for (const x of (api.crew ? api.crew() : [])) if (x && x.name) add({ name: x.name, sub: x.rank || "A character in the GM view", pc: true, own: true });
    if (!pics) return out;
    for (const [kind, test] of [["portrait", isPortrait], ["token", isTok]]) {
      const pairs = [];
      for (const p of pics.filter(test)) out.forEach((x, i) => { const sc = ptNameScore(ptPicName(p), x.name); if (sc) pairs.push({ p, i, sc }); });
      pairs.sort((a, b) => b.sc - a.sc || a.i - b.i);
      const used = new Set();
      for (const { p, i } of pairs) if (!used.has(p.file) && !out[i][kind]) { out[i][kind] = p; used.add(p.file); }
      for (const p of pics.filter(test)) if (!used.has(p.file)) {   // someone new: a card of their own (their other picture joins it)
        const name = ptPicName(p) || p.title, at = out.findIndex((x) => x.picked && !x[kind] && ptNameScore(name, x.name));
        if (at >= 0) out[at][kind] = p; else out.push({ name, sub: "1 hex", size: 1, picked: true, portrait: null, token: null, [kind]: p });
      }
    }
    return out;
  }
  function renderPeople() {
    people = cast();
    const list = root.querySelector("[data-ptm-people]"); if (!list) return;
    list.innerHTML = people.map((x, i) => {
      const pic = (p, cls, word) => `<div class="pt-pic ${cls}">${p ? picHTML(p) : `${word} coming soon`}</div>`;
      const tok = x.token || x.portrait;
      const acts = [x.pc && api.givePictures && (x.portrait || x.token) ? `<button type="button" class="btn primary" data-ptm-give="${i}">Give the pictures to ${esc(first(x.name))}</button>` : "",
        !x.pc && api.map && tok ? `<button type="button" class="btn primary" data-ptm-add="${i}">Add to the battle map</button>` : "",
        x.portrait ? `<a class="btn" href="${esc(x.portrait.download)}" download>Portrait <span class="small muted">${size(x.portrait.bytes)}</span></a>` : "",
        x.token ? `<a class="btn" href="${esc(x.token.download)}" download>Token <span class="small muted">${size(x.token.bytes)}</span></a>` : ""].join("");
      return `<li class="pt-pc"><div class="pt-pcpics">${pic(x.portrait, "pt-portrait", "Portrait")}${pic(x.token, "pt-tokpic", "Token")}</div><div class="pt-txt"><b>${esc(x.name)}</b><span class="small muted">${esc(x.sub || "")}</span></div><div class="pt-acts">${acts}</div></li>`;
    }).join("");
  }
  renderPeople();
  let byScene = new Map(), ready;
  /** Scene i on the battle map: its map, the characters, and everyone in it, each with their token picture and threat. */
  async function setScene(i) {
    if (!api.map || !api.map.setScene) return false;
    await ready;
    const x = M.scenes[i]; if (!x) return false;
    const pieces = (M.tokens || []).filter((t) => t.scenes && t.scenes[x.n]).map((t) => {
      const nm = t.name.split(",")[0], who = people.find((p) => p.name === nm), pic = who && (who.token || who.portrait);
      return { name: nm, url: pic ? pic.src : "", tsize: t.size === "ship" ? 2 : parseInt(t.size, 10) || 1, threat: t.threat || "", count: t.scenes[x.n].count, foe: t.scenes[x.n].foe };
    });
    const r = await api.map.setScene({ url: byScene.has(i) ? byScene.get(i).src : "", yards: x.hex, pieces });
    say(`${x.name.replace(/^\d+\.\s*/, "")} is on the battle map${r.map ? "" : " (no map picture for it yet: the plain grid)"}${x.hex ? `, ${x.hex} yard${x.hex === 1 ? "" : "s"} a hex` : ""}, with ${r.placed ? `${r.placed} in the scene` : "the characters"}.`);
    return true;
  }
  ready = fetch(`${api.server}/api/maps?folder=${encodeURIComponent(M.folder)}`).then((r) => r.json()).then((b) => {
    pics = b.maps || [];
    const maps = pics.filter((p) => !isTok(p) && !isPortrait(p)), used = new Set();
    renderPeople();
    for (const x of M.scenes) { const p = maps.find((m) => m.scene === x.n); if (p) { byScene.set(x.n - 1, p); used.add(p.file); } }
    for (const [i, p] of best(maps.filter((m) => !used.has(m.file) && m.scene == null), M.scenes.map((x, i) => (byScene.has(i) ? { name: "", area: "" } : x)), (x) => x.area || "")) { byScene.set(i, p); used.add(p.file); }
    const setBtn = (i) => (api.map ? `<button type="button" class="btn primary" data-ptm-use="${i}">Set up on the battle map</button>` : "");
    M.scenes.forEach((x, i) => { const li = root.querySelector(`[data-ptm-scene="${x.n}"]`); if (byScene.has(i)) card(li, byScene.get(i), setBtn(i)); else li.querySelector(".pt-acts").innerHTML = setBtn(i); });
    const extra = maps.filter((p) => !used.has(p.file));
    if (extra.length) root.querySelector("[data-ptm-extra]").innerHTML = `<h4>More maps</h4><ul class="small">${extra.map((p) => `<li><a href="${esc(p.src)}" target="_blank" rel="noopener">${esc(p.title)}</a> · <a href="${esc(p.download)}" download>Download</a></li>`).join("")}</ul>`;
    const ready = people.filter((x) => x.portrait || x.token).length;
    status.textContent = pics.length ? `${ready} of ${people.length} characters and ${byScene.size} of ${M.scenes.length} maps have pictures.` : "No pictures uploaded yet: the cards fill in as they are.";
  }).catch(() => { status.textContent = "The pictures couldn't be loaded just now (no connection to the table server)."; pics = pics || []; });
  root.addEventListener("click", async (e) => {
    const u = e.target.closest("[data-ptm-use]"), a = e.target.closest("[data-ptm-add]"), g = e.target.closest("[data-ptm-give]");
    if (!u && !a && !g) return;
    const btn = u || a || g, was = btn.textContent; btn.disabled = true; btn.textContent = "Loading…";
    try {
      if (g) {
        const x = people[+g.dataset.ptmGive];
        const n = await api.givePictures(x.name, x.portrait ? x.portrait.src : "", x.token ? x.token.src : "");
        say(n ? `${x.name}: pictures given to ${n === 1 ? "the copy" : `all ${n} copies`} in this browser.` : `${x.name} isn't loaded here yet. Load them from the pregenerated characters, on a sheet or in the GM view, and the pictures come with them.`, !n);
        btn.disabled = false; btn.textContent = was; return;
      }
      if (u) await setScene(+u.dataset.ptmUse);
      else { const x = people[+a.dataset.ptmAdd]; await api.map.addPictureToken(x.name, (x.token || x.portrait).src, x.size || 1); say(`${x.name} is on the battle map.`); }
      if (api.showMap) api.showMap();
    } catch { say("That picture couldn't be loaded. Try again, or download it and use Background image… on the battle map.", true); }
    btn.disabled = false; btn.textContent = was;
  });
  return { setScene, refresh: () => { const n = (api.crew ? api.crew() : []).map((x) => x.name).join("|"); if (n !== crewSeen) { crewSeen = n; renderPeople(); } } };
}
