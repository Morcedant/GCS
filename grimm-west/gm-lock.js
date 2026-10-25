// The GM's Guide, for registered GMs only. Plain script, inlined by tools/build-legend.py (/* GMLOCK */)
// and tools/build-guide.py (GMLOCK markers); no modules, no page globals.
//
// mountGmLock(api) with api: { table (mountTable's handle: server(), access(), setAccess(code)), game (the id the table
//   server knows the game by), view (the GM view's element), book (the GM's Guide's empty, locked book, or null),
//   onBook() (show the book again once it's filled in), esc, toast }
// The GM view is open to everyone (starting a shared table from it still asks for the code, on the table server). So is
// the GM's Guide when the build puts it in the page (tools/gm_guides.py, GM_GUIDES_OPEN). Otherwise the guide isn't in the page: its book shows a code box, and the guide comes from the server
// (POST /api/gm/guide) once the table server accepts the GM access code (POST /api/gm). The code is the same one that
// starts a table, kept in this browser, so a GM types it once.
// Returns { open() } → whether a GM access code has been accepted.
//
// protectText(root, note, toast): the light copy deterrent on a guide: no selecting, copying or right-click menu
// in it (form fields aside), with a short note instead.
function mountGmLock(api) {
  const esc = api.esc, say = (m, err) => (api.toast ? api.toast(m, err) : null);
  let open = false, busy = false, msg = "", guideDone = !api.book || !api.book.dataset.locked; // an open guide is already in the page
  if (!document.getElementById("gm-lock-css")) {
    const css = document.createElement("style"); css.id = "gm-lock-css";
    css.textContent = `#${api.view.id}.gm-locked > :not(.gm-lock) { display: none !important; }
.gm-lock { max-width: 34rem; margin: 18px auto; display: grid; gap: 10px; }
.gm-lock form { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; }
.gm-lock input { flex: 1 1 12rem; min-width: 0; }
.gm-lock .gm-lock-msg:empty { display: none; }`;
    document.head.append(css);
  }
  const panel = (where) => `<div class="gm-lock card hud" data-gmlock="${where}">
    <h3>The GM's Guide is for registered GMs</h3>
    <p class="small">It holds the setting's secrets, so it's only sent to GMs with a GM access code.
      The code is the one that starts a shared table; type it once and this browser remembers it. To ask for one, join the
      <a href="https://legenddynamicsrpg.com/join" target="_blank" rel="noopener">Legend Dynamics Discord</a> or email <a href="mailto:contact@legenddynamicsrpg.com">contact@legenddynamicsrpg.com</a>.</p>
    <form data-gmlock-form><label class="field"><span class="label">GM access code</span>
      <input type="password" name="code" maxlength="100" autocomplete="off" spellcheck="false" aria-label="GM access code"></label>
      <button class="btn primary" type="submit"${busy ? " disabled" : ""}>${busy ? "Checking…" : "Unlock"}</button></form>
    <p class="small gm-lock-msg" role="status">${esc(msg)}</p></div>`;
  function render() {
    if (api.book && !guideDone) api.book.innerHTML = open ? `<p class="muted">Loading the GM's Guide…</p>` : panel("book");
  }
  const post = async (path, body) => {
    const base = api.table && api.table.server();
    if (!base) throw new Error("noserver");
    return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  };
  async function loadGuide() {
    if (guideDone || !open) return;
    try {
      const r = await post("/api/gm/guide", { access: api.table.access(), game: api.game });
      if (!r.ok) throw new Error(String(r.status));
      const g = await r.json();
      guideDone = true;
      api.book.innerHTML = g.html; delete api.book.dataset.locked; delete api.book.dataset.chapters;
      if (g.title) api.book.dataset.title = g.title;
      if (api.onBook) api.onBook();
    } catch { api.book.innerHTML = `<p class="muted">The GM's Guide couldn't be loaded from the table server. Check your connection, then open this page again.</p>`; }
  }
  async function check(code, quiet) {
    busy = true; msg = ""; if (!quiet) render();
    try {
      const r = await post("/api/gm", { access: code });
      if (r.ok) {
        open = true; msg = ""; api.table.setAccess(code);
        const b = await r.json().catch(() => ({}));
        if (!quiet) say(`GM access code accepted${b.name && b.name !== "GM" ? ` for ${b.name}` : ""}.`);
      } else if (r.status === 401) { msg = quiet ? "" : "That GM access code isn't recognised: check it, or ask for one."; if (!quiet) api.table.setAccess(""); }
      else msg = "The table server couldn't check the code just now. Try again in a moment.";
    } catch (e) {
      msg = e && e.message === "noserver" ? "This page has no table server set, so it can't check a GM access code."
        : "Couldn't reach the table server to check the code. Check your connection and try again.";
    }
    busy = false; render(); loadGuide();
  }
  document.addEventListener("submit", (e) => {
    const f = e.target.closest && e.target.closest("[data-gmlock-form]"); if (!f) return;
    e.preventDefault(); const code = f.elements.code.value.trim();
    if (!code) { msg = "Type your GM access code first."; render(); return; }
    check(code, false);
  });
  render();
  if (api.table && api.table.access()) check(api.table.access(), true); // a code this browser already has
  return { open: () => open };
}

function protectText(root, note, toast) {
  if (!root) return;
  if (!document.getElementById("protect-css")) {
    const css = document.createElement("style"); css.id = "protect-css";
    css.textContent = `.protected { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.protected input, .protected textarea { -webkit-user-select: text; user-select: text; }`;
    document.head.append(css);
  }
  root.classList.add("protected");
  const field = (e) => e.target.closest && e.target.closest("input, textarea, [contenteditable]");
  for (const ev of ["copy", "cut", "contextmenu", "dragstart"]) root.addEventListener(ev, (e) => {
    if (field(e)) return;
    e.preventDefault(); if (toast && ev !== "dragstart") toast(note);
  });
}
