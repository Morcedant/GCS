// Music for the settings (built by tools/build-site.py; the tracks come from the table server's R2 bucket, see
// table-server/src/music.js, and from any files built into the site from legend-dynamics/<game>/music/).
//
//  - A setting's music page ([data-music]): the list, fetched from the server and added to any tracks built into the
//    page, then one player for them all: play/pause, previous/next, seek, volume, "repeat this track" (for ambience)
//    and "play on" (the next when one ends). Lock-screen and headphone buttons work too (Media Session).
//  - Anywhere else, [data-music-count="<folder>"] shows once that setting has tracks, its count in [data-n];
//    [data-music-none] shows if no setting has any.
(() => {
  const server = (document.querySelector("[data-music-server]") || {}).dataset?.musicServer || "";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const mb = (n) => (n / 1048576).toFixed(1) + " MB";

  // ---- counts, for the music hub and the settings' pages ----
  const counters = [...document.querySelectorAll("[data-music-count]")];
  if (counters.length) {
    const show = (counts) => {
      let any = false;
      for (const el of counters) { const n = (counts[el.dataset.musicCount] || 0) + (+el.dataset.static || 0); el.hidden = !n; any = any || !!n; const t = el.querySelector("[data-n]"); if (t) t.textContent = `${n} track${n === 1 ? "" : "s"}`; }
      document.querySelectorAll("[data-music-none]").forEach((x) => { x.hidden = any; });
    };
    if (server) fetch(server + "/api/music").then((r) => r.json()).then((b) => show(b.folders || {})).catch(() => show({}));
    else show({});
  }

  // ---- a setting's music page ----
  const root = document.querySelector("[data-music]"); if (!root) return;
  const list = root.querySelector(".ld-tracks"), empty = root.querySelector("[data-empty]"), status = root.querySelector("[data-status]");
  const rowHTML = (t, k) => `<li class="ld-track" data-track data-src="${esc(t.src)}" data-title="${esc(t.title)}" data-sub="${esc(t.mood || "")}" data-credit="${esc(t.credit || "")}" data-loop="${t.loop ? 1 : 0}">`
    + `<button class="ld-track-go" type="button"><span class="ld-track-n">${k + 1}</span><span class="ld-track-name"><b>${esc(t.title)}</b>${t.mood ? `<small>${esc(t.mood)}</small>` : ""}</span></button>`
    + (t.use ? `<span class="ld-track-use">${esc(t.use)}</span>` : "") + ((t.credit || t.license) ? `<small class="ld-track-fine">${[t.credit, t.license].filter(Boolean).map(esc).join(" · ")}</small>` : "")
    + `<a class="ld-track-dl" href="${esc(t.download || t.src)}" download>Download <span class="ld-note">${t.bytes ? mb(t.bytes) : ""}</span></a></li>`;

  const start = (extra, intro) => {
    if (extra.length) {
      const have = new Set([...list.querySelectorAll("[data-track]")].map((r) => r.dataset.src.split("/").pop()));
      const n = list.querySelectorAll("[data-track]").length;
      list.insertAdjacentHTML("beforeend", extra.filter((t) => !have.has(encodeURIComponent(t.file)) && !have.has(t.file)).map((t, k) => rowHTML(t, n + k)).join(""));
    }
    if (intro) { const l = root.querySelector(".ld-lede"); if (l) l.textContent = intro; }
    const rows = [...list.querySelectorAll("[data-track]")];
    if (status) status.hidden = true;
    if (!rows.length) { if (empty) empty.hidden = false; return; }
    player(rows);
  };
  if (server && root.dataset.folder) {
    if (status) status.hidden = false;
    fetch(`${server}/api/music?folder=${encodeURIComponent(root.dataset.folder)}`).then((r) => r.json()).then((b) => start(b.tracks || [], b.intro)).catch(() => start([], ""));
  } else start([], "");

  function player(rows) {
    const $ = (s) => root.querySelector(s);
    const box = $(".ld-player"), audio = new Audio();
    audio.preload = "none";
    root.classList.add("ld-music--js"); box.hidden = false;
    const store = { get: (k) => { try { return localStorage.getItem("ld-music:" + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("ld-music:" + k, v); } catch {} } };
    const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "–:––");
    const play = $("[data-act=play]"), prev = $("[data-act=prev]"), next = $("[data-act=next]"), loop = $("[data-act=loop]"), on = $("[data-act=on]");
    const seek = $(".ld-seek"), vol = $(".ld-vol"), now = $(".ld-now-title"), sub = $(".ld-now-sub"), time = $(".ld-time");
    let i = -1, playOn = store.get("on") !== "0", repeat = false;
    audio.volume = +(store.get("vol") ?? 0.8); vol.value = audio.volume;
    const setPressed = (b, v) => b.setAttribute("aria-pressed", String(v));
    function load(n, go) {
      i = (n + rows.length) % rows.length;
      const r = rows[i];
      audio.src = r.dataset.src;
      repeat = r.dataset.loop === "1";   // each track starts with its own setting: ambience repeats, the rest play on
      audio.loop = repeat; setPressed(loop, repeat);
      rows.forEach((x, k) => { x.classList.toggle("is-current", k === i); x.querySelector(".ld-track-go").setAttribute("aria-current", k === i ? "true" : "false"); });
      now.textContent = r.dataset.title; sub.textContent = r.dataset.sub || ""; time.textContent = "0:00 / –:––"; seek.value = 0;
      if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: r.dataset.title, artist: r.dataset.credit || "Legend Dynamics", album: root.dataset.setting || "Legend Dynamics" });
      if (go) audio.play().catch(() => {});
    }
    const toggle = () => { if (i < 0) { load(0, true); return; } if (audio.paused) audio.play().catch(() => {}); else audio.pause(); };
    play.addEventListener("click", toggle);
    prev.addEventListener("click", () => { if (audio.currentTime > 3 && i >= 0) audio.currentTime = 0; else load(i - 1, true); });
    next.addEventListener("click", () => load(i + 1, true));
    loop.addEventListener("click", () => { repeat = !repeat; audio.loop = repeat; setPressed(loop, repeat); });
    setPressed(on, playOn);
    on.addEventListener("click", () => { playOn = !playOn; setPressed(on, playOn); store.set("on", playOn ? "1" : "0"); });
    rows.forEach((r, k) => r.querySelector(".ld-track-go").addEventListener("click", () => { if (k === i) toggle(); else load(k, true); }));
    vol.addEventListener("input", () => { audio.volume = +vol.value; store.set("vol", vol.value); });
    seek.addEventListener("input", () => { if (isFinite(audio.duration)) audio.currentTime = (+seek.value / 1000) * audio.duration; });
    audio.addEventListener("timeupdate", () => { if (isFinite(audio.duration)) seek.value = Math.round((audio.currentTime / audio.duration) * 1000); time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`; });
    audio.addEventListener("loadedmetadata", () => { time.textContent = `0:00 / ${fmt(audio.duration)}`; });
    const paint = () => { const p = !audio.paused; play.textContent = p ? "Pause" : "Play"; play.setAttribute("aria-label", p ? "Pause" : "Play"); rows.forEach((x, k) => { x.querySelector(".ld-track-go").dataset.state = k === i && p ? "playing" : ""; }); };
    audio.addEventListener("play", paint); audio.addEventListener("pause", paint);
    audio.addEventListener("ended", () => { if (playOn) load(i + 1, true); else paint(); });
    audio.addEventListener("error", () => { if (i >= 0) sub.textContent = "This track couldn't be played here. Try its download link."; });
    if ("mediaSession" in navigator) {
      const ms = navigator.mediaSession;
      ms.setActionHandler("play", () => toggle()); ms.setActionHandler("pause", () => audio.pause());
      ms.setActionHandler("previoustrack", () => load(i - 1, true)); ms.setActionHandler("nexttrack", () => load(i + 1, true));
    }
    load(0, false);
  }
})();
