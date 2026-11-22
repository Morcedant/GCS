// The introduction: a short animated prologue over the main theme, or (when one has been uploaded) the intro video
// from the music bucket's video/ folder. It opens with a Play button, since browsers only play sound after a click,
// and can be skipped at any moment. ui.js shows it on a first visit, and from the Menu and the start screens.

/** The intro video, if there is one: an MP4 in the music bucket (cached at its public address). The day's date in the
 * address means one uploaded today is found by tomorrow at the latest, whatever the cache holds. */
export const INTRO_VIDEO = "https://music.legenddynamicsrpg.com/video/intro.mp4";

/**
 * Show the intro over everything. opts: { peoples: [{ name, token }] (token: SVG/HTML), onStart (the Play click: start
 * the theme), onVideo (a video is playing: hold the game's music), onDone (finished or skipped) }.
 */
export function showIntro(opts) {
  const old = document.getElementById("intro"); if (old) old.remove();
  const el = document.createElement("div"); el.id = "intro";
  el.innerHTML = `<canvas></canvas><div class="in-cap" aria-live="polite"></div><div class="in-ring"></div><div class="in-title"></div>
    <div class="in-start"><h1>Fracture Lines: Dominion</h1><div class="btn-row"><button class="btn primary big" id="in-play">▶ Play the intro</button><button class="btn" id="in-skip0">Skip</button></div></div>
    <button class="btn small in-skip" id="in-skip" hidden>Skip ›</button>`;
  document.body.appendChild(el);
  const cv = el.querySelector("canvas"), cx = cv.getContext("2d"), cap = el.querySelector(".in-cap"), ring = el.querySelector(".in-ring"), title = el.querySelector(".in-title");
  let raf = 0, done = false, video = null;
  const finish = () => {
    if (done) return; done = true; cancelAnimationFrame(raf);
    if (video) { try { video.pause(); } catch {} }
    el.classList.add("out"); setTimeout(() => el.remove(), 600);
    window.removeEventListener("keydown", key);
    opts.onDone && opts.onDone();
  };
  const key = (e) => { if (e.key === "Escape") finish(); };
  window.addEventListener("keydown", key);
  el.querySelector("#in-skip0").onclick = finish;
  el.querySelector("#in-skip").onclick = finish;
  el.querySelector("#in-play").onclick = () => {
    el.querySelector(".in-start").remove(); el.querySelector("#in-skip").hidden = false;
    // A video, if one has been uploaded; otherwise (or if it won't load within a few seconds) the animated prologue.
    const v = document.createElement("video"); v.playsInline = true; v.preload = "auto"; v.className = "in-video";
    v.src = `${INTRO_VIDEO}?d=${new Date().toISOString().slice(0, 10)}`;
    let settled = false;
    const animated = () => { if (settled || done) return; settled = true; v.remove(); opts.onStart && opts.onStart(); play(); };
    v.onerror = animated; const wait = setTimeout(animated, 4000);
    v.oncanplay = () => {
      if (settled || done) return; settled = true; clearTimeout(wait); video = v;
      opts.onVideo && opts.onVideo(); v.onended = finish;
      v.play().catch(() => { v.muted = true; v.play().catch(finish); });
    };
    el.appendChild(v);
  };

  // ---- the animated prologue: about 40 seconds ----
  const W = () => (cv.width = el.clientWidth * (window.devicePixelRatio || 1)), H = () => (cv.height = el.clientHeight * (window.devicePixelRatio || 1));
  let w = W(), h = H(); window.addEventListener("resize", () => { w = W(); h = H(); }, { once: false });
  const rnd = (() => { let a = 1234567; return () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296); })();
  const stars = Array.from({ length: 260 }, () => ({ x: rnd(), y: rnd(), r: rnd() * 1.4 + 0.2, tw: rnd() * 6 }));
  // Star clusters, and the corridors between their systems.
  const clusters = Array.from({ length: 6 }, (_, i) => ({ x: 0.5 + 0.32 * Math.cos(i * 1.05 + 0.4), y: 0.5 + 0.3 * Math.sin(i * 1.05 + 0.4) }));
  const sys = clusters.flatMap((c) => Array.from({ length: 5 }, () => ({ x: c.x + (rnd() - 0.5) * 0.12, y: c.y + (rnd() - 0.5) * 0.12 })));
  const links = []; sys.forEach((a, i) => { const near = sys.map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)]).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 2); for (const [j] of near) if (i < j) links.push([i, j, rnd()]); });
  for (let i = 0; i < clusters.length; i++) links.push([i * 5, ((i + 1) % clusters.length) * 5 + 2, rnd(), true]);   // the long corridors across the voids
  const broken = new Set([2, 9, 17, links.length - 2]);   // corridors (by their place in the list) that fail, red
  const lines = [
    [0, 6, "For a thousand years, the corridors held the galaxy together."],
    [6, 13, "Folds in space, from star to star. Whoever held them, held everything."],
    [13, 19, "Now the old empires are breaking. Corridors drift, and fail."],
    [19, 28, "Eight peoples reach for what is left."],
    [28, 34, "And beneath the rifts, something old is waking."],
  ];
  const t0 = performance.now();
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  function frame(now) {
    const t = (now - t0) / 1000, d = window.devicePixelRatio || 1;
    cx.fillStyle = "#04060c"; cx.fillRect(0, 0, w, h);
    // Stars, slowly drifting.
    for (const s of stars) { const a = 0.35 + 0.35 * Math.sin(t * 0.8 + s.tw); cx.fillStyle = `rgba(210,225,255,${a * ease(t / 2)})`; cx.beginPath(); cx.arc(((s.x + t * 0.002) % 1) * w, s.y * h, s.r * d, 0, 7); cx.fill(); }
    const P = (p) => [p.x * w, p.y * h];
    // Corridors draw in (6–12s); a few fail, red, after 13s.
    const grow = ease((t - 5) / 6);
    links.forEach(([i, j, r, long], li) => {
      const k = ease(grow * 1.4 - r * 0.4); if (k <= 0) return;
      const [x1, y1] = P(sys[i]), [x2, y2] = P(sys[j]), fail = broken.has(li) && t > 13.5;
      const fade = fail ? (t < 17 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 6)) : Math.max(0, 1 - (t - 17) / 2)) : 1;   // flicker red, then go dark
      cx.strokeStyle = fail ? `rgba(255,110,90,${0.8 * fade})` : `rgba(110,200,230,${(long ? 0.55 : 0.4) * (t > 34 ? Math.max(0.15, 1 - (t - 34) / 3) : 1)})`;
      cx.lineWidth = (long ? 1.6 : 1.1) * d; cx.setLineDash(fail ? [3 * d, 5 * d] : [6 * d, 5 * d]);
      cx.lineWidth = (fail ? 2.2 : long ? 1.6 : 1.1) * d;
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k); cx.stroke();
    });
    cx.setLineDash([]);
    for (const s of sys) { const [x, y] = P(s); cx.fillStyle = `rgba(200,220,255,${0.9 * ease((t - 3) / 3)})`; cx.beginPath(); cx.arc(x, y, 2.2 * d, 0, 7); cx.fill(); }
    // The rift and what wakes in it (28–36s): a red tear, and a pale light pulsing.
    if (t > 27) {
      const k = ease((t - 27) / 4), [rx, ry] = [w * 0.5, h * 0.52];
      const g = cx.createRadialGradient(rx, ry, 0, rx, ry, Math.min(w, h) * 0.28 * k);
      g.addColorStop(0, `rgba(255,240,200,${0.25 + 0.15 * Math.sin(t * 2.4)})`); g.addColorStop(0.35, `rgba(200,40,30,${0.35 * k})`); g.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = g; cx.fillRect(0, 0, w, h);
      cx.strokeStyle = `rgba(230,70,55,${0.85 * k})`; cx.lineWidth = 2.5 * d; cx.beginPath();
      for (let i = 0; i <= 12; i++) { const x = rx - w * 0.12 + (w * 0.24 * i) / 12, y = ry + Math.sin(i * 2.1) * h * 0.02; i ? cx.lineTo(x, y) : cx.moveTo(x, y); }
      cx.stroke();
    }
    // Captions.
    const L = lines.find(([a, b]) => t >= a && t < b);
    const text = L ? L[2] : "";
    if (cap.dataset.text !== text) { cap.dataset.text = text; cap.classList.remove("on"); setTimeout(() => { cap.textContent = text; if (text) cap.classList.add("on"); }, 350); }
    // The peoples (19–28s), one by one around the ring.
    if (t > 19 && !ring.dataset.on) { ring.dataset.on = "1"; ring.innerHTML = opts.peoples.map((p, i) => `<div class="in-tok" style="--i:${i};--n:${opts.peoples.length}">${p.token}<span>${p.name}</span></div>`).join(""); }
    if (t > 28 && ring.dataset.on === "1") { ring.dataset.on = "2"; ring.classList.add("out"); }
    // The title (34s on), then the end.
    if (t > 34 && !title.dataset.on) { title.dataset.on = "1"; title.innerHTML = `<h1>Fracture Lines</h1><h2>Dominion</h2>`; title.classList.add("on"); }
    if (t > 41) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }
  function play() { raf = requestAnimationFrame(frame); }
  return { close: finish };
}
