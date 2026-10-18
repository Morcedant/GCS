// The shared table, in the page: join a table from the play tab, start one from the GM view, and see every
// roll at the table as it happens. Rolls made while connected are rolled by the table server, so everyone sees
// the same dice. Plain script, inlined by tools/build-legend.py (/* TABLECLIENT */); no modules, no page globals.
//
// mountTable(api) with api: { playRoot, gmRoot (elements), key (storage prefix), game (the setting's id), title,
//   server (the default table server, may be ""), character() → the sheet's character name, esc, toast }
// Phase 2, shared characters: api.onSheet(entry) and api.onPlay(key, play) hear the table's characters; the page
// calls shareMine(key, sheet, play) after a player's sheet changes and pushPlay(key, play) after the GM's cards change.
// Only what changed is sent; what the table sends back is remembered, so it isn't sent again.
// Phase 3, the fight: the GM's page calls pushScene({ map, fight }) when the battle map or the encounter changes; players
// hear it through api.onScene(scene) and send sendMove(key, to) and sendAsk(request); the GM hears api.onMove(move), and
// a player's requests wait in the GM's panel until fillAsk(ask) puts one into the encounter panel.
// Returns { live(), roll(req) → Promise<entry>, setCharacter(name), shareMine, pushPlay, isHere(ownerName), role(),
//   pushScene, sendMove, sendAsk, scene() }.
function mountTable(api) {
  const esc = api.esc, KEY = api.key + ".table.v1";
  const say = (m, err) => (api.toast ? api.toast(m, err) : null);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const st = Object.assign({ server: api.server || "", code: "", name: "", role: "player", gmKeys: {}, joined: false }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* private window: works for this visit */ } };
  // This browser's private id: the table knows a player's characters by it, so nobody can change them by typing the same name.
  if (!st.pid) { const b = new Uint8Array(18); crypto.getRandomValues(b); st.pid = btoa(String.fromCharCode(...b)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]); save(); }
  let ws = null, live = false, status = "", table = null, you = null, players = [], log = [], retry = 0, retryTimer = null, pingTimer = null, leaving = false, character = "", otherServer = false, moved = false;
  const pending = new Map(); // req → { resolve, reject, timer }
  const lastPlay = {}, lastSheet = {}; // key → the play state / sheet (JSON) the table last had
  let scene = null, lastSceneJson = "", sceneTimer = null, asks = []; // phase 3
  let sheetTimer = null;
  const base = () => (st.server || api.server || "").trim().replace(/\/+$/, "");
  const wsUrl = () => `${base().replace(/^http/, "ws")}/api/tables/${encodeURIComponent(st.code)}/ws`;
  const shareLink = () => `${location.href.split("#")[0]}#table=${st.code}`;

  // A share link (#table=CODE) fills in the code.
  const fromHash = (location.hash.match(/table=([A-Za-z0-9]{6})/) || [])[1];
  if (fromHash && fromHash.toUpperCase() !== st.code) { st.code = fromHash.toUpperCase(); st.joined = false; st.role = "player"; save(); }

  function connect() {
    clearTimeout(retryTimer);
    if (!base()) { status = "Set the table server's address first."; render(); return; }
    if (ws) { leaving = true; try { ws.close(); } catch { /* closed */ } }
    leaving = false; status = "Connecting…"; render();
    let sock;
    try { sock = new WebSocket(wsUrl()); } catch { status = "That table server address doesn't work."; render(); return; }
    ws = sock;
    sock.onopen = () => {
      sock.send(JSON.stringify({ type: "hello", role: st.role, name: st.name, character: st.role === "gm" ? "" : character, game: api.game, key: st.role === "gm" ? st.gmKeys[st.code] : undefined, pid: st.pid }));
      clearInterval(pingTimer); pingTimer = setInterval(() => { if (sock.readyState === 1) sock.send('{"type":"ping"}'); }, 30000);
    };
    sock.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === "welcome") {
        live = true; retry = 0; table = m.table; you = m.you; log = m.log || []; players = m.players || []; status = ""; st.joined = true; save(); render();
        for (const k in lastSheet) delete lastSheet[k];
        for (const e of m.sheets || []) { lastPlay[e.key] = e.play; if (api.onSheet) api.onSheet(e); }
        scene = m.scene || null; lastSceneJson = JSON.stringify(scene); if (api.onScene) api.onScene(scene);
        if (api.onConnected) api.onConnected(you.role);
      }
      else if (m.type === "sheet") { lastPlay[m.entry.key] = m.entry.play; if (api.onSheet) api.onSheet(m.entry); }
      else if (m.type === "scene") { scene = m.scene; if (api.onScene) api.onScene(scene); }
      else if (m.type === "move") { if (api.onMove) api.onMove(m.move); }
      else if (m.type === "ask") { asks = [m.ask, ...asks.filter((a) => a.key !== m.ask.key)].slice(0, 8); renderAsks(); say(`${m.ask.by} asks: ${askText(m.ask)}`); }
      else if (m.type === "play") { lastPlay[m.key] = m.play; if (api.onPlay) api.onPlay(m.key, m.play); }
      else if (m.type === "roll") {
        log.push(m.entry); if (log.length > 200) log.shift();
        const p = m.req && pending.get(m.req); if (p) { clearTimeout(p.timer); pending.delete(m.req); p.resolve(m.entry); }
        renderLog();
      } else if (m.type === "rerolled") { const x = log.find((l) => l.n === m.n); if (x) x.rerolled = true; renderLog(); }
      else if (m.type === "players") { players = m.players || []; renderPlayers(); if (api.onPlayers) api.onPlayers(); }
      else if (m.type === "unshared") { for (const k of m.keys || []) delete lastPlay[k]; if (api.onUnshared) api.onUnshared(m.keys || []); }
      else if (m.type === "kicked") { st.joined = false; save(); status = "The GM removed you from this table."; leaving = true; }
      else if (m.type === "moved") { // the GM changed the code: follow it
        const old = st.code; st.code = m.code;
        if (st.gmKeys[old]) { st.gmKeys[m.code] = st.gmKeys[old]; delete st.gmKeys[old]; }
        save(); retry = 0; moved = true; status = `The table's code is now ${m.code}.`;
        if (location.hash.includes("table=")) history.replaceState(null, "", location.href.split("#")[0]);
      }
      else if (m.type === "error") {
        const p = m.req && pending.get(m.req);
        if (p) { clearTimeout(p.timer); pending.delete(m.req); p.reject(new Error(m.error)); }
        else { status = m.error; if (!live) { st.joined = false; save(); } render(); }
      }
    };
    sock.onclose = () => {
      if (ws !== sock) return;
      const was = live; live = false; ws = null; clearInterval(pingTimer);
      for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new Error("the connection dropped")); }
      pending.clear();
      if (leaving || !st.joined) { if (!status || status === "Connecting…") status = was ? "" : "Couldn't reach the table."; render(); return; }
      if (!was && retry >= 5) { st.joined = false; save(); status = "Couldn't reach the table. Try joining again in a moment."; render(); return; }
      if (moved) { moved = false; connect(); return; } // the GM changed the code: straight back in with the new one
      retry = Math.min(retry + 1, 5); status = `Connection lost. Reconnecting in ${[1, 2, 4, 8, 15][retry - 1]}s…`; render();
      retryTimer = setTimeout(connect, [1, 2, 4, 8, 15][retry - 1] * 1000);
    };
  }
  // Joining checks the table exists first, so a mistyped code says so instead of retrying.
  async function join() {
    if (!base()) { status = "Set the table server's address first."; render(); return; }
    status = "Looking for the table…"; render();
    try {
      const r = await fetch(`${base()}/api/tables/${encodeURIComponent(st.code)}`), b = await r.json();
      if (!r.ok) throw new Error(b.error || "the server refused");
      if (b.game && b.game !== api.game) throw new Error(`that table plays a different game (${b.game}). Open that game's creator to join`);
    } catch (e) { status = /fetch|network|load/i.test(e.message) ? "Couldn't reach the table server: check its address and your connection." : e.message; st.joined = false; save(); render(); return; }
    st.joined = true; save(); connect();
  }
  function leave() { leaving = true; st.joined = false; save(); clearTimeout(retryTimer); if (ws) try { ws.close(); } catch { /* closed */ } live = false; table = null; status = ""; render(); }

  async function start(name) {
    if (!base()) { say("Set the table server's address first.", true); return; }
    status = "Starting a table…"; render();
    try {
      const r = await fetch(base() + "/api/tables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, game: api.game }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "the server refused");
      st.code = b.code; st.gmKeys[b.code] = b.gmKey; st.role = "gm"; st.name = st.name || "GM"; st.joined = true; save(); connect();
    } catch (e) { status = `Couldn't start a table: ${e.message}.`; render(); }
  }

  /** A roll by the table's dice. req: { label, target, base?, mod?, attack?, called?, of? } */
  function roll(req) {
    return new Promise((resolve, reject) => {
      if (!live || !ws) { reject(new Error("not connected")); return; }
      const id = Math.random().toString(36).slice(2, 10);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("no answer from the table")); }, 6000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ type: "roll", req: id, ...req }));
    });
  }
  // ---- shared characters ----
  const diff = (key, play) => { const was = lastPlay[key] || {}, d = {};
    for (const k of Object.keys(play)) if (JSON.stringify(play[k]) !== JSON.stringify(was[k])) d[k] = play[k];
    return d; };
  const sendJSON = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  /** A player's own character: the sheet when it changes (a moment after the last edit), the play state at once. */
  function shareMine(key, sheet, play) {
    if (!live || !you || you.role !== "player" || !key) return;
    const js = JSON.stringify(sheet);
    if (lastSheet[key] !== js) {
      clearTimeout(sheetTimer);
      const first = lastSheet[key] === undefined && !lastPlay[key];
      sheetTimer = setTimeout(() => { lastSheet[key] = js; sendJSON({ type: "sheet", key, sheet, play: first ? play : undefined }); }, lastSheet[key] === undefined ? 0 : 700);
      if (first) return; // the first share carries the play state
    }
    if (!lastPlay[key]) return;
    const d = diff(key, play);
    if (Object.keys(d).length) { lastPlay[key] = { ...lastPlay[key], ...d }; sendJSON({ type: "play", key, play: d }); }
  }
  /** The GM's copy of a shared character changed (a card, the encounter panel, the map). */
  function pushPlay(key, play) {
    if (!live || !you || you.role !== "gm" || !lastPlay[key]) return;
    const d = diff(key, play);
    if (Object.keys(d).length) { lastPlay[key] = { ...lastPlay[key], ...d }; sendJSON({ type: "play", key, play: d }); }
  }
  // ---- phase 3: the fight ----
  /** The GM's map and fight, sent a moment after the last change (and only when something the players see changed). */
  function pushScene(next) {
    if (!live || !you || you.role !== "gm") return;
    clearTimeout(sceneTimer);
    sceneTimer = setTimeout(() => { const s = next(), js = JSON.stringify(s); if (js === lastSceneJson) return; lastSceneJson = js; scene = s; sendJSON({ type: "scene", ...s }); }, 400);
  }
  const sendMove = (key, to) => { if (live && you && you.role === "player") sendJSON({ type: "move", key, to }); };
  const sendAsk = (q) => { if (live && you && you.role === "player") sendJSON({ type: "ask", ...q }); };
  const askText = (a) => { const f = scene && scene.fight, nm = (pid) => ((f && f.people.find((p) => p.pid === pid)) || {}).name || "";
    const w = ((f && (f.people.find((p) => p.pid === a.pid) || {}).weapons) || []).find(([id]) => id === a.weapon);
    return a.action === "attack" ? `attack ${nm(a.target) || "someone"}${w ? ` with the ${w[1].toLowerCase()}` : ""}` : a.action === "aim" ? `aim at ${nm(a.target) || "someone"}` : a.note || "something else"; };
  function renderAsks() {
    const el = api.gmRoot && api.gmRoot.querySelector(".tbl-asks"); if (!el) return;
    el.innerHTML = asks.length ? `<div class="label">Players ask</div><ul class="log tbl-log">${asks.map((a, i) => `<li><b>${esc(a.by)}</b>: ${esc(askText(a))}${a.note && a.action !== "other" ? ` <span class="muted">(${esc(a.note)})</span>` : ""}
      <button class="btn small" data-tbl="fillask" data-i="${i}">Put it in the encounter panel</button> <button class="linkish small" data-tbl="dropask" data-i="${i}">Dismiss</button></li>`).join("")}</ul>` : "";
  }

  const isHere = (owner) => players.some((p) => p.role === "player" && p.name === owner);

  // A different character on the sheet joins under its own name.
  function setCharacter(name) {
    const n = String(name || "").trim();
    if (n === character) return;
    character = n;
    if (st.joined && st.role === "player" && live) connect();
  }

  // ---- what it looks like ----
  const time = (t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const who = (e) => esc(e.character || e.name || e.by || "GM");
  function entryHtml(e) {
    const res = e.auto === "success" ? `natural ${e.total}: success` : e.auto === "failure" ? `natural ${e.total}: failure` : e.success ? `success by ${e.margin}` : `failure by ${-e.margin}`;
    const mods = e.base !== null && e.base !== undefined && e.mod ? ` <span class="muted">(${e.base} ${e.mod > 0 ? "+" : "−"} ${Math.abs(e.mod)})</span>` : "";
    return `<li class="tbl-e${e.rerolled ? " tbl-old" : ""}"><span class="muted small">${time(e.at)}</span> <b>${who(e)}</b>${e.by && e.character ? ` <span class="muted small">(${esc(e.by)})</span>` : ""}: ${esc(e.label)} vs ${e.target}${mods}
      → <span class="num">${e.dice.join(" ")} = ${e.total}</span> <span class="${e.success ? "s" : "f"}">${res}</span>${e.telling ? " · <b>telling hit</b>" : ""}${e.called && e.success ? " · called shot lands" : ""}${e.reroll ? ` · <i>point reroll of #${e.reroll}</i>` : ""}${e.rerolled ? " · <i>rerolled</i>" : ""}</li>`;
  }
  function renderLog() {
    for (const [root, n] of [[api.playRoot, 12], [api.gmRoot, 60]]) {
      const ul = root && root.querySelector(".tbl-log");
      if (ul) ul.innerHTML = log.length ? log.slice(-n).reverse().map(entryHtml).join("") : `<li class="muted">No rolls at the table yet.</li>`;
    }
  }
  function renderPlayers() {
    const t = players.length ? players.map((p) => (p.role === "gm" ? `${esc(p.name || "GM")} (GM)` : `${esc(p.character || p.name)}${p.character && p.name ? ` <span class="muted">(${esc(p.name)})</span>` : ""}`)).join(", ") : "nobody yet";
    for (const root of [api.playRoot, api.gmRoot]) { const el = root && root.querySelector(".tbl-players"); if (el) el.innerHTML = `At the table: ${t}`; }
    // The GM can remove a player.
    const gmList = api.gmRoot && api.gmRoot.querySelector(".tbl-remove");
    if (gmList) { const ps = players.filter((p) => p.role === "player");
      gmList.innerHTML = ps.length ? ps.map((p) => `<button class="btn small" data-tbl="kick" data-cid="${esc(p.cid || "")}" data-who="${esc(p.character || p.name)}">Remove ${esc(p.character || p.name)}</button>`).join(" ") : ""; }
  }
  const serverField = (id) => `<div class="field wide"><label for="${id}">Table server</label><input type="url" id="${id}" data-tbl="server" placeholder="https://legend-table.example.workers.dev" value="${esc(st.server || api.server || "")}"></div>`;
  function render() {
    const statusP = status ? `<p class="small ${/couldn|isn't|lost|doesn't|refus|different|first/i.test(status) ? "bad" : "muted"}" role="status">${esc(status)}</p>` : "";
    const showServer = otherServer || !api.server || (!!st.server && st.server !== api.server);
    if (api.playRoot) {
      api.playRoot.innerHTML = live ? `<h3>Shared table</h3>
          <p class="small">Connected to <b>${esc(table.name)}</b> (code <b class="num">${esc(st.code)}</b>)${you.role === "gm" ? " as the GM" : ` as ${esc(character || st.name)}`}. Your rolls are rolled by the table, and everyone sees them.${you.role === "gm" ? "" : " Your character is shared with the GM: injuries, points, ammo and form stay in step with the GM's card."}</p>
          <p class="small muted tbl-players"></p><div class="btn-row"><button class="btn" data-tbl="leave">Leave the table</button></div>${statusP}
          <div class="field"><span class="label">At the table</span><ul class="log tbl-log"></ul></div>`
        : `<h3>Shared table</h3><p class="small muted">Join your GM's table to roll where everyone can see it. Without one, the roller works as usual.</p>
          <div class="fields"><div class="field"><label for="tbl-code">Table code</label><input type="text" id="tbl-code" data-tbl="code" maxlength="6" autocomplete="off" spellcheck="false" style="text-transform:uppercase" value="${esc(st.role === "player" ? st.code : "")}"></div>
            <div class="field"><label for="tbl-name">Your name</label><input type="text" id="tbl-name" data-tbl="name" maxlength="40" value="${esc(st.name)}"></div>
            ${showServer ? serverField("tbl-server") : ""}</div>
          <div class="btn-row"><button class="btn primary" data-tbl="join">Join</button>${!showServer ? `<button class="linkish small" data-tbl="showserver">Another table server…</button>` : ""}</div>${statusP}`;
    }
    if (api.gmRoot) {
      const isGM = live && you && you.role === "gm";
      api.gmRoot.innerHTML = isGM ? `<div class="eyebrow">Shared table</div>
          <p><b>${esc(table.name)}</b> · code <b class="num" style="font-size:1.25rem;letter-spacing:.12em">${esc(st.code)}</b></p>
          <p class="small muted">Players open their character, go to the ${esc(api.playTab || "play")} tab and join with this code, or use the link. Their characters appear under Characters below, marked <b>at the table</b>, and stay in step both ways: mark a box or a point here or in an encounter and the player's sheet changes too.</p>
          <div class="btn-row"><button class="btn" data-tbl="copycode">Copy code</button><button class="btn" data-tbl="copylink">Copy link</button><button class="btn" data-tbl="recode">Change code</button><button class="btn" data-tbl="leave">Leave</button></div>
          <div class="btn-row tbl-remove"></div><div class="tbl-asks"></div>
          <p class="small tbl-players"></p>${statusP}<ul class="log tbl-log"></ul>`
        : `<div class="eyebrow">Shared table</div>
          <p class="small muted">Start a table and give the players its code. Every roll they make from their sheet shows up here as it happens, rolled by the table so nobody can fudge it.</p>
          <div class="fields"><div class="field"><label for="tbl-tname">Table name</label><input type="text" id="tbl-tname" data-tbl="tname" maxlength="60" placeholder="Saturday's game"></div>${showServer ? serverField("tbl-gserver") : ""}</div>
          <div class="btn-row"><button class="btn primary" data-tbl="start">Start a table</button>${st.gmKeys[st.code] ? `<button class="btn" data-tbl="rejoin">Rejoin ${esc(st.code)} as GM</button>` : ""}${!showServer ? `<button class="linkish small" data-tbl="showserver">Another table server…</button>` : ""}</div>${statusP}`;
    }
    for (const [root, who] of [[api.playRoot, "player"], [api.gmRoot, "gm"]]) if (root)
      root.insertAdjacentHTML("beforeend", `<p class="small tbl-helpline"><button type="button" class="linkish" data-tbl="help" data-who="${who}">How a shared game works</button></p>`);
    renderPlayers(); renderLog(); renderAsks();
  }

  // ---- the tutorial: a pop-up for the GM and for players ----
  function helpHtml(who) {
    const P = esc(api.playTab || "play"), pt = esc(api.pointName || "point"), party = esc(api.partyName || "party");
    const step = (h, body) => `<li><b>${h}</b> ${body}</li>`;
    const gm = `<ol class="tbl-steps">
      ${step("Start the table.", `Open the <b>GM view</b>. In <b>Shared table</b>, give the game a name and press <b>Start a table</b>. You get a six-character code.`)}
      ${step("Invite the players.", `Press <b>Copy link</b> and send it to them (a message, a chat, an email), or read out the code. Keep this page open; if you close it, <b>Rejoin as GM</b> brings you back from this same browser.`)}
      ${step("Watch them arrive.", `Each player's character appears under <b>Characters</b>, marked <i>at the table</i>. Their injuries, ${pt} points and ammunition stay in step both ways: mark a box on their card and it shows on their sheet, and the other way round.`)}
      ${step("Roll.", `Every roll from a player's sheet is rolled by the table and lands in the log here, with the dice, the target and any telling hit. A ${pt} point reroll answers its roll once.`)}
      ${step("Set up a fight.", `On the <b>Battle map</b>, press <b>Add the ${party}</b> and place the threats. In the <b>Encounter</b> panel, add the characters and threats and start. The players now see the map, the turn order and what happens.`)}
      ${step("Run the turns.", `On a player's turn, what they want to do appears under <b>Players ask</b>. Press <b>Put it in the encounter panel</b>, check it, and run it as usual. Players move their own tokens; you move everyone else.`)}
      ${step("If you need to.", `<b>Remove</b> takes a player off the table (that browser can't rejoin). <b>Change code</b> gives the table a new code: everyone at the table follows it, and the old one stops working.`)}
    </ol>`;
    const player = `<ol class="tbl-steps">
      ${step("Open your character.", `Load your character in the creator and go to the <b>${P}</b> tab.`)}
      ${step("Join.", `In <b>Shared table</b>, type the code your GM gave you and your name, and press <b>Join</b>. If the GM sent a link, opening it fills in the code.`)}
      ${step("Play as usual.", `Roll from your sheet as always: the table rolls the dice, and everyone sees the result. Spend a ${pt} point to reroll from the result, as usual.`)}
      ${step("Your sheet and the GM's card stay in step.", `When the GM marks an injury or gives you a ${pt} point, your sheet changes too; when you mark one, the GM sees it.`)}
      ${step("In a fight.", `The <b>Map and fight</b> card shows the GM's map and whose turn it is. Drag <b>your own</b> token to move. On your turn, choose what you'll do (attack, aim or something else, the target, the weapon) and press <b>Send to the GM</b>; the GM runs it.`)}
      ${step("Leaving.", `<b>Leave the table</b> goes back to rolling on your own. A reload or a dropped connection rejoins by itself.`)}
    </ol>`;
    return `<div class="tbl-help-head"><b>How a shared game works</b><button type="button" class="btn small" data-tblhelp="close" aria-label="Close">Close</button></div>
      <div class="btn-row" role="tablist"><button type="button" class="btn${who === "gm" ? " primary" : ""}" role="tab" aria-selected="${who === "gm"}" data-tblhelp="gm">Running the game (GM)</button><button type="button" class="btn${who === "player" ? " primary" : ""}" role="tab" aria-selected="${who === "player"}" data-tblhelp="player">Playing (players)</button></div>
      ${who === "gm" ? gm : player}
      <p class="small muted">Everyone needs this game's creator open (a table takes characters only from its own game) and an internet connection. Anyone with the code can join, so share it only with your players. Without a table, everything works as before, on your own device.</p>`;
  }
  function openHelp(who) {
    let d = document.getElementById("tbl-help");
    if (!d) {
      if (!document.getElementById("tbl-help-css")) document.head.insertAdjacentHTML("beforeend", `<style id="tbl-help-css">
        #tbl-help { max-width: min(42rem, calc(100vw - 32px)); width: 100%; border: 1px solid var(--line, #888); border-radius: 12px; padding: 16px 18px; background: var(--space, #101318); color: var(--fg, #eee); box-shadow: 0 10px 40px rgba(0, 0, 0, .6); }
        #tbl-help b { color: var(--chrome, inherit); } #tbl-help .muted { color: var(--muted, #999); }
        #tbl-help::backdrop { background: rgba(0, 0, 0, .55); }
        #tbl-help .tbl-help-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
        #tbl-help .tbl-steps { padding-left: 1.3em; line-height: 1.5; } #tbl-help .tbl-steps li { margin: 6px 0; }
      </style>`);
      d = document.createElement("dialog"); d.id = "tbl-help"; d.setAttribute("aria-label", "How a shared game works"); document.body.appendChild(d);
      d.addEventListener("click", (e) => {
        if (e.target === d) { d.close(); return; } // a click on the backdrop
        const b = e.target.closest("[data-tblhelp]"); if (!b) return;
        if (b.dataset.tblhelp === "close") d.close(); else { d.innerHTML = helpHtml(b.dataset.tblhelp); d.querySelector(`[data-tblhelp="${b.dataset.tblhelp}"]`).focus(); }
      });
    }
    d.innerHTML = helpHtml(who);
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }
  function onClick(e) {
    const b = e.target.closest("[data-tbl]"); if (!b || b.tagName === "INPUT") return;
    const root = b.closest("#" + (api.playRoot && api.playRoot.id) + ", #" + (api.gmRoot && api.gmRoot.id));
    const val = (k) => { const i = root && root.querySelector(`[data-tbl="${k}"]`); return i ? i.value.trim() : ""; };
    const k = b.dataset.tbl;
    if (val("server")) { st.server = val("server"); }
    if (k === "join") {
      const code = val("code").toUpperCase(), name = val("name");
      if (!/^[A-Z0-9]{6}$/.test(code)) { status = "A table code has six letters and numbers."; render(); return; }
      if (!name && !character) { status = "Give your name (or name your character)."; render(); return; }
      st.code = code; st.name = name; st.role = "player"; save(); join();
    } else if (k === "start") start(val("tname"));
    else if (k === "rejoin") { st.role = "gm"; st.joined = true; save(); connect(); }
    else if (k === "leave") leave();
    else if (k === "help") { openHelp(b.dataset.who); return; }
    else if (k === "fillask") { const a = asks[+b.dataset.i]; if (a && api.fillAsk && api.fillAsk(a)) { asks.splice(+b.dataset.i, 1); renderAsks(); } else say("Start the encounter with that character in it first.", true); }
    else if (k === "dropask") { asks.splice(+b.dataset.i, 1); renderAsks(); }
    else if (k === "kick") {
      if (!confirm(`Remove ${b.dataset.who} from the table? They're disconnected, their character stops being shared, and this browser of theirs can't rejoin. Change the code too if they might come back another way.`)) return;
      sendJSON({ type: "kick", cid: b.dataset.cid });
    } else if (k === "recode") {
      if (!confirm("Give the table a new code? Everyone here now moves with it; anyone else needs the new code to join, and the old one stops working.")) return;
      sendJSON({ type: "recode" });
    }
    else if (k === "copycode") copy(st.code, "Table code copied.");
    else if (k === "copylink") copy(shareLink(), "Link copied: send it to the players.");
    else if (k === "showserver") { // keep what was typed
      if (val("code")) st.code = val("code").toUpperCase(); if (val("name")) st.name = val("name"); const tn = val("tname");
      otherServer = true; render(); const t = api.gmRoot && api.gmRoot.querySelector('[data-tbl="tname"]'); if (t && tn) t.value = tn; }
    save();
  }
  function copy(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => say(done), () => say(text));
    else say(text);
  }
  for (const root of [api.playRoot, api.gmRoot]) if (root) {
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("input[data-tbl]")) { e.preventDefault(); const b = root.querySelector('[data-tbl="join"], [data-tbl="start"]'); if (b) b.click(); } });
  }
  character = String(api.character() || "").trim();
  render();
  if (st.joined && st.code && base()) connect(); // back at the table after a reload
  return { live: () => live, roll, setCharacter, shareMine, pushPlay, isHere, role: () => (live && you ? you.role : null), pushScene, sendMove, sendAsk, scene: () => scene };
}
