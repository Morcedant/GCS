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
//   outline for each scene, its people, places and factions, and the first session.
//
// mountPlaytest(api) with api: { kit, root, esc, storeKey, toast(m, err), server?, map? (the battle map: useBackgroundUrl,
//   addPictureToken), showMap?() (opens the battle map), givePictures?(name, portrait, token),
//   loadCampaign?(campaign, label) (into the Campaign tab: true if it did) }.
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
    ${K.campaign && api.loadCampaign ? `<div class="pt-load"><button type="button" class="btn primary" data-pt-campaign>Load ${esc(K.adv)} into the Campaign tab</button><span class="small muted">The whole ${esc(K.term)} in one go: its premise and the truth behind it, a step of the outline for each scene, ${K.campaign.people.length} people, ${K.campaign.places.length} places, ${K.campaign.factions.length} faction${K.campaign.factions.length === 1 ? "" : "s"}, and the first session's plan. Nothing reaches the players until you share it.</span></div>` : ""}
    ${sec("prep", "1. Before the session", `<ul class="pt-check">${K.prep.map((t, i) => `<li><label><input type="checkbox" data-pttick="${i}"${ticks[i] ? " checked" : ""}> <span>${t}</span></label></li>`).join("")}</ul>
      <p class="small"><b>The cast, in one line each</b></p>
      <div class="pt-cast">${K.cast.map(([n, t]) => `<div><b>${esc(n)}</b><span class="small muted">${esc(t)}</span></div>`).join("")}</div>
      <p class="small muted">${esc(K.castNote || "")}</p>`, true)}
    ${K.maps && api.server ? sec("maps", "2. Characters, maps and tokens", `<p class="small">A portrait and a token for each pregenerated character, a map for each scene and a token for everyone in its fights, ready to use. <b>Give the pictures</b> puts a character's portrait on their sheet and their token on the battle map; <b>Use on the battle map</b> puts a scene's map under the grid at its hex size; <b>Add to the battle map</b> puts a token on it. Download any of them to print, or for another table.</p>
      <p class="small muted" data-ptm-status>Looking for the pictures…</p>
      ${(K.maps.pregens || []).length ? `<h4>The characters</h4><p class="small muted">A character loaded from the pregenerated characters, on a sheet or in the GM view, gets their pictures by itself; the button gives them to copies already loaded.</p><ol class="pt-maps">${K.maps.pregens.map((x, i) => `<li class="pt-pc" data-ptm-pc="${i}"><div class="pt-pcpics"><div class="pt-pic pt-portrait">Portrait coming soon</div><div class="pt-pic pt-tokpic">Token coming soon</div></div><div class="pt-txt"><b>${esc(x.name)}</b><span class="small muted">${esc(x.rank || "")}</span></div><div class="pt-acts"></div></li>`).join("")}</ol>` : ""}
      <h4>Scenes</h4><ol class="pt-maps">${K.maps.scenes.map((x) => `<li data-ptm-scene="${x.n}"><div class="pt-pic">Map coming soon</div><div class="pt-txt"><b>${esc(x.name)}</b><span class="small muted">${x.hex ? `${x.hex} yard${x.hex === 1 ? "" : "s"} a hex` : esc(x.hexText)} · ${esc(x.area.replace(/^about /, ""))}</span></div><div class="pt-acts"></div></li>`).join("")}</ol>
      <h4>Tokens</h4><ol class="pt-maps">${K.maps.tokens.map((x, i) => `<li class="pt-tok" data-ptm-token="${i}"><div class="pt-pic">Token coming soon</div><div class="pt-txt"><b>${esc(x.name)}</b><span class="small muted">${x.size === "ship" ? "A ship" : esc(x.size)}</span></div><div class="pt-acts"></div></li>`).join("")}</ol>
      <div data-ptm-extra></div>`, true) : ""}
    ${sec("run", "3. The run sheet: three hours", `<p class="small">The full ${esc(K.term)} is written for one or two sessions; this is the cut for one evening. If you're running behind, take the cuts.</p>
      <ol class="pt-run">${[...K.run, ptWrapRow()].map(([t, h, body, cut]) => `<li><span class="pt-mark num">${esc(t)}</span><div><b>${esc(h)}</b>${body}${cut ? `<p class="small"><span class="pt-cut">Cut</span> ${esc(cut)}</p>` : ""}</div></li>`).join("")}</ol>`)}
    ${sec("watch", "4. During the game", `<p class="small">Jot these down as they happen: every rule you had to look up, every time a player asked "what do I roll?", what nobody touched on their sheet, how long each scene took, and the moments people leaned in.</p>
      <div class="field"><label for="pt-notes">Your notes for this session</label><textarea id="pt-notes" rows="7" placeholder="0:52 — a player asked what Investigation covers"></textarea></div>
      <div class="btn-row"><button type="button" class="btn" id="pt-notes-copy">Copy notes</button><button type="button" class="btn" id="pt-notes-clear">Clear</button><span class="small muted">Kept in this browser as you type.</span></div>`)}
    ${sec("after", "5. After the game", `<p class="small"><b>Ask out loud, before anyone leaves:</b> What was confusing? What did you never use? What was the best moment? Would you play again, and what would you want to do next time? Listen more than you explain.</p>
      <p class="small"><b>Then the written answers:</b> players answer the same questions on <code>${esc(K.feedback)}</code>. Only you read them: on the main site's Dev blog Write page, sign in with your DEV code and press <b>Playtest feedback</b>.</p>
      <p class="small"><b>Say thank you</b> within a day: tell each player one thing you're changing because of them, and ask how they'd like their name in the credits.</p>`)}`;
  if (K.maps && api.server) ptMaps(api, root);
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
    if (e.target.closest("[data-pt-campaign]")) { api.loadCampaign(JSON.parse(JSON.stringify(K.campaign)), `the playtest's (${K.adv})`); return; }
    if (e.target.id === "pt-notes-copy") { copy(notes.value, (ok) => { if (!ok) notes.select(); say(ok ? "Notes copied." : "Selected: copy them yourself.", !ok); }); return; }
    if (e.target.id === "pt-notes-clear") {
      if (!armed) { armed = true; e.target.textContent = "Tap again to clear"; setTimeout(() => { armed = false; e.target.textContent = "Clear"; }, 3000); return; }
      armed = false; notes.value = ""; set("notes", null); e.target.textContent = "Clear"; say("Notes cleared.");
    }
  });
}

/** The playtest kit's maps and tokens: fetch the list, put each picture on its card, wire up the buttons. */
function ptMaps(api, root) {
  const { kit: K, esc } = api, M = K.maps, say = (m, err) => (api.toast ? api.toast(m, err) : null);
  const status = root.querySelector("[data-ptm-status]"), size = (n) => (n >= 104858 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const words = (t) => new Set(String(t).toLowerCase().match(/[a-z]{3,}/g) || []);   // three letters, for names like Nyx
  const STOP = new Set(["token", "portrait", "battle", "overhead", "view", "scene", "map", "the", "and", "for", "with", "from", "into", "over", "that", "this", "their", "where"]);
  const best = (pics, items, text) => {   // each picture to the item its name matches best (the item's own name counts most)
    const pairs = [];
    for (const p of pics) { const w = [...words(p.title)].filter((x) => !STOP.has(x));
      items.forEach((it, i) => { const nw = words(it.name), dw = words(text(it)); let sc = 0; for (const x of w) sc += nw.has(x) ? 3 : dw.has(x) ? 1 : 0; if (sc >= 3) pairs.push({ p, i, sc }); }); }
    pairs.sort((a, b) => b.sc - a.sc || a.i - b.i);
    const out = new Map(), used = new Set();
    for (const x of pairs) if (!used.has(x.p.file) && !out.has(x.i)) { out.set(x.i, x.p); used.add(x.p.file); }
    return out;
  };
  const card = (li, p, buttons) => {
    li.querySelector(".pt-pic").innerHTML = `<a href="${esc(p.src)}" target="_blank" rel="noopener"><img src="${esc(p.src)}" alt="" loading="lazy"></a>`;
    li.querySelector(".pt-acts").innerHTML = buttons + `<a class="btn" href="${esc(p.download)}" download>Download <span class="small muted">${size(p.bytes)}</span></a>`;
  };
  fetch(`${api.server}/api/maps?folder=${encodeURIComponent(M.folder)}`).then((r) => r.json()).then((b) => {
    const pics = b.maps || [], isTok = (p) => /^token\b/i.test(p.file), isPortrait = (p) => /^portrait\b/i.test(p.file), used = new Set();
    const maps = pics.filter((p) => !isTok(p) && !isPortrait(p)), PCS = M.pregens || [];
    // The characters first: a portrait and a token each, matched by name.
    const pcPortraits = best(pics.filter(isPortrait), PCS, () => ""), pcTokens = best(pics.filter(isTok), PCS, () => "");
    for (const p of [...pcPortraits.values(), ...pcTokens.values()]) used.add(p.file);
    PCS.forEach((x, i) => {
      const li = root.querySelector(`[data-ptm-pc="${i}"]`), pp = pcPortraits.get(i), tp = pcTokens.get(i); if (!li || (!pp && !tp)) return;
      const pic = (el, p) => { if (p) el.innerHTML = `<a href="${esc(p.src)}" target="_blank" rel="noopener"><img src="${esc(p.src)}" alt="" loading="lazy"></a>`; };
      pic(li.querySelector(".pt-portrait"), pp); pic(li.querySelector(".pt-tokpic"), tp);
      li.querySelector(".pt-acts").innerHTML = (api.givePictures ? `<button type="button" class="btn primary" data-ptm-give="${i}">Give the pictures to ${esc(x.name.replace(/^(Dr|Rev)\.\s+/, "").split(/[\s,]/)[0])}</button>` : "")
        + [pp && `<a class="btn" href="${esc(pp.download)}" download>Portrait <span class="small muted">${size(pp.bytes)}</span></a>`, tp && `<a class="btn" href="${esc(tp.download)}" download>Token <span class="small muted">${size(tp.bytes)}</span></a>`].filter(Boolean).join("");
    });
    const toks = pics.filter((p) => isTok(p) && !used.has(p.file));
    const byScene = new Map();
    for (const x of M.scenes) { const p = maps.find((m) => m.scene === x.n); if (p) { byScene.set(x.n - 1, p); used.add(p.file); } }
    for (const [i, p] of best(maps.filter((m) => !used.has(m.file) && m.scene == null), M.scenes.map((x, i) => (byScene.has(i) ? { name: "", area: "" } : x)), (x) => x.area || "")) { byScene.set(i, p); used.add(p.file); }
    for (const [i, p] of byScene) card(root.querySelector(`[data-ptm-scene="${M.scenes[i].n}"]`), p, api.map ? `<button type="button" class="btn primary" data-ptm-use="${i}">Use on the battle map</button>` : "");
    const byTok = best(toks, M.tokens, (x) => x.look || "");
    for (const [i, p] of byTok) { card(root.querySelector(`[data-ptm-token="${i}"]`), p, api.map ? `<button type="button" class="btn primary" data-ptm-add="${i}">Add to the battle map</button>` : ""); used.add(p.file); }
    const extra = pics.filter((p) => !used.has(p.file));
    if (extra.length) root.querySelector("[data-ptm-extra]").innerHTML = `<h4>More pictures</h4><ul class="small">${extra.map((p) => `<li><a href="${esc(p.src)}" target="_blank" rel="noopener">${esc(p.title)}</a> · <a href="${esc(p.download)}" download>Download</a></li>`).join("")}</ul>`;
    const pcN = PCS.filter((x, i) => pcPortraits.has(i) || pcTokens.has(i)).length;
    status.textContent = pics.length ? `${PCS.length ? `${pcN} of ${PCS.length} characters, ` : ""}${byScene.size} of ${M.scenes.length} maps and ${byTok.size} of ${M.tokens.length} tokens ready.` : "No pictures uploaded yet: the cards fill in as they are.";
    root.addEventListener("click", async (e) => {
      const u = e.target.closest("[data-ptm-use]"), a = e.target.closest("[data-ptm-add]"), g = e.target.closest("[data-ptm-give]");
      if (!u && !a && !g) return;
      const btn = u || a || g, was = btn.textContent; btn.disabled = true; btn.textContent = "Loading…";
      try {
        if (g) {
          const i = +g.dataset.ptmGive, x = PCS[i], pp = pcPortraits.get(i), tp = pcTokens.get(i);
          const n = await api.givePictures(x.name, pp ? pp.src : "", tp ? tp.src : "");
          say(n ? `${x.name}: pictures given to ${n === 1 ? "the copy" : `all ${n} copies`} in this browser.` : `${x.name} isn't loaded here yet. Load them from the pregenerated characters, on a sheet or in the GM view, and the pictures come with them.`, !n);
          btn.disabled = false; btn.textContent = was; return;
        }
        if (u) { const i = +u.dataset.ptmUse, x = M.scenes[i]; await api.map.useBackgroundUrl(byScene.get(i).src, x.hex); say(`${x.name.replace(/^\d+\.\s*/, "")}: on the battle map${x.hex ? `, ${x.hex} yard${x.hex === 1 ? "" : "s"} a hex` : ""}.`); }
        else { const i = +a.dataset.ptmAdd, x = M.tokens[i]; await api.map.addPictureToken(x.name.split(",")[0], byTok.get(i).src, x.size === "ship" ? 2 : parseInt(x.size, 10) || 1); say(`${x.name.split(",")[0]} is on the battle map.`); }
        if (api.showMap) api.showMap();
      } catch { say("That picture couldn't be loaded. Try again, or download it and use Background image… on the battle map.", true); }
      btn.disabled = false; btn.textContent = was;
    });
  }).catch(() => { status.textContent = "The maps couldn't be loaded just now (no connection to the table server)."; });
}
