// The playtest kit in the GM view: everything for running a three-hour playtest of the game's first adventure with
// people who have never seen it. Plain script, inlined by tools/build-legend.py (/* PLAYTEST */) into the creators,
// and by tools/build-guide.py (between the page's PLAYTEST start and end markers) into the fan games; no modules, no globals.
//
// The kit (a pack's "playtest", or a fan game's playtest.json): { name, short, adv (the adventure), term, fan,
//   feedback (where players answer the questions), prep: [html],
//   cast: [[name, line]], castNote, run: [[time, title, html, cut?]] }.
// The prep ticks and the session notes are kept in this browser (<storeKey>.ticks, <storeKey>.notes).
//
// mountPlaytest(api) with api: { kit, root, esc, storeKey, toast(m, err) }.
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
    ${sec("prep", "1. Before the session", `<ul class="pt-check">${K.prep.map((t, i) => `<li><label><input type="checkbox" data-pttick="${i}"${ticks[i] ? " checked" : ""}> <span>${t}</span></label></li>`).join("")}</ul>
      <p class="small"><b>The cast, in one line each</b></p>
      <div class="pt-cast">${K.cast.map(([n, t]) => `<div><b>${esc(n)}</b><span class="small muted">${esc(t)}</span></div>`).join("")}</div>
      <p class="small muted">${esc(K.castNote || "")}</p>`, true)}
    ${sec("run", "2. The run sheet: three hours", `<p class="small">The full ${esc(K.term)} is written for one or two sessions; this is the cut for one evening. If you're running behind, take the cuts.</p>
      <ol class="pt-run">${[...K.run, ptWrapRow()].map(([t, h, body, cut]) => `<li><span class="pt-mark num">${esc(t)}</span><div><b>${esc(h)}</b>${body}${cut ? `<p class="small"><span class="pt-cut">Cut</span> ${esc(cut)}</p>` : ""}</div></li>`).join("")}</ol>`)}
    ${sec("watch", "3. During the game", `<p class="small">Jot these down as they happen: every rule you had to look up, every time a player asked "what do I roll?", what nobody touched on their sheet, how long each scene took, and the moments people leaned in.</p>
      <div class="field"><label for="pt-notes">Your notes for this session</label><textarea id="pt-notes" rows="7" placeholder="0:52 — a player asked what Investigation covers"></textarea></div>
      <div class="btn-row"><button type="button" class="btn" id="pt-notes-copy">Copy notes</button><button type="button" class="btn" id="pt-notes-clear">Clear</button><span class="small muted">Kept in this browser as you type.</span></div>`)}
    ${sec("after", "4. After the game", `<p class="small"><b>Ask out loud, before anyone leaves:</b> What was confusing? What did you never use? What was the best moment? Would you play again, and what would you want to do next time? Listen more than you explain.</p>
      <p class="small"><b>Then the written answers:</b> players answer the same questions on <code>${esc(K.feedback)}</code>. Only you read them: on the main site's Dev blog Write page, sign in with your DEV code and press <b>Playtest feedback</b>.</p>
      <p class="small"><b>Say thank you</b> within a day: tell each player one thing you're changing because of them, and ask how they'd like their name in the credits.</p>`)}`;
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
    if (e.target.id === "pt-notes-copy") { copy(notes.value, (ok) => { if (!ok) notes.select(); say(ok ? "Notes copied." : "Selected: copy them yourself.", !ok); }); return; }
    if (e.target.id === "pt-notes-clear") {
      if (!armed) { armed = true; e.target.textContent = "Tap again to clear"; setTimeout(() => { armed = false; e.target.textContent = "Clear"; }, 3000); return; }
      armed = false; notes.value = ""; set("notes", null); e.target.textContent = "Clear"; say("Notes cleared.");
    }
  });
}
