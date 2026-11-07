// The music pages' player (/<setting>/music/, built by tools/build-site.py): one player for the page's tracks, with a
// playlist, play/pause, previous/next, a seek bar, volume, "repeat this track" (for ambience at the table) and "play
// on" (the next track when one ends). The lock screen and headphone buttons work too (Media Session). Without
// JavaScript, every track still has its own plain audio control and download link.
(() => {
  const root = document.querySelector("[data-music]"); if (!root) return;
  const rows = [...root.querySelectorAll("[data-track]")]; if (!rows.length) return;
  const $ = (s) => root.querySelector(s);
  const player = $(".ld-player"), audio = new Audio();
  audio.preload = "none";
  root.classList.add("ld-music--js");
  player.hidden = false;
  const store = { get: (k) => { try { return localStorage.getItem("ld-music:" + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("ld-music:" + k, v); } catch {} } };
  const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "–:––");
  const play = $("[data-act=play]"), prev = $("[data-act=prev]"), next = $("[data-act=next]"), loop = $("[data-act=loop]"), on = $("[data-act=on]");
  const seek = $(".ld-seek"), vol = $(".ld-vol"), now = $(".ld-now-title"), sub = $(".ld-now-sub"), time = $(".ld-time");
  let i = -1, playOn = store.get("on") !== "0", repeat = false;
  audio.volume = +(store.get("vol") ?? 0.8); vol.value = audio.volume;

  const setPressed = (b, v) => { b.setAttribute("aria-pressed", String(v)); };
  function load(n, start) {
    i = (n + rows.length) % rows.length;
    const r = rows[i];
    audio.src = r.dataset.src;
    repeat = r.dataset.loop === "1";   // each track starts with its own setting: ambience repeats, the rest play on
    audio.loop = repeat; setPressed(loop, repeat);
    rows.forEach((x, k) => { x.classList.toggle("is-current", k === i); x.querySelector(".ld-track-go").setAttribute("aria-current", k === i ? "true" : "false"); });
    now.textContent = r.dataset.title; sub.textContent = r.dataset.sub || "";
    if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: r.dataset.title, artist: r.dataset.credit || "Legend Dynamics", album: root.dataset.setting || "Legend Dynamics" });
    if (start) audio.play().catch(() => {});
  }
  function toggle() { if (i < 0) { load(0, true); return; } if (audio.paused) audio.play().catch(() => {}); else audio.pause(); }
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
  audio.addEventListener("error", () => { sub.textContent = "This track couldn't be played here. Try the download link."; });
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => toggle()); ms.setActionHandler("pause", () => audio.pause());
    ms.setActionHandler("previoustrack", () => load(i - 1, true)); ms.setActionHandler("nexttrack", () => load(i + 1, true));
  }
  load(0, false);
})();
