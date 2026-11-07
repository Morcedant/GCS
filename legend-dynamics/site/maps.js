// The playtest page's battle maps (built by tools/build-site.py; the pictures come from the table server's bucket,
// battle-maps/<setting>/, see table-server/src/maps.js). Each scene card shows its map once one is uploaded whose name
// starts with the scene's number, with a download; pictures without a number are listed after the scenes.
(() => {
  const root = document.querySelector("[data-maps]"); if (!root) return;
  const server = root.dataset.server || "";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const mb = (n) => (n / 1048576).toFixed(1) + " MB";
  const show = (slot, m) => {
    slot.querySelector(".ld-map-pic").innerHTML = `<a href="${esc(m.src)}" target="_blank" rel="noopener"><img src="${esc(m.src)}" alt="Battle map: ${esc(slot.dataset.name)}" loading="lazy"></a>`;
    slot.querySelector(".ld-map-dl").innerHTML = `<a class="ld-button ld-button--ghost" href="${esc(m.download)}" download>Download <span class="ld-note">${mb(m.bytes)}</span></a>`;
    slot.classList.add("has-map");
  };
  root.querySelectorAll("[data-map-folder]").forEach((adv) => {
    if (!server) return;
    fetch(`${server}/api/maps?folder=${encodeURIComponent(adv.dataset.mapFolder)}`).then((r) => r.json()).then((b) => {
      const maps = b.maps || [], used = new Set(), slots = [...adv.querySelectorAll("[data-scene]")], taken = new Set();
      // A map named with its scene's number goes there.
      for (const slot of slots) { const m = maps.find((x) => x.scene === +slot.dataset.scene); if (m) { show(slot, m); used.add(m.file); taken.add(slot); } }
      // Others go where their name's words best match a scene's (its title counts most, then what it shows), best match first.
      const words = (t) => new Set(String(t).toLowerCase().match(/[a-z]{4,}/g) || []);
      const pairs = [];
      for (const m of maps.filter((x) => !used.has(x.file) && x.scene == null)) {
        const w = words(m.title);
        for (const slot of slots) {
          const nw = new Set(slot.dataset.nameWords.split(" ")), dw = new Set(slot.dataset.descWords.split(" "));
          let score = 0; for (const x of w) score += nw.has(x) ? 3 : dw.has(x) ? 1 : 0;
          if (score >= 3) pairs.push({ m, slot, score, n: +slot.dataset.scene });
        }
      }
      pairs.sort((a, b) => b.score - a.score || a.n - b.n);
      for (const p of pairs) if (!used.has(p.m.file) && !taken.has(p.slot)) { show(p.slot, p.m); used.add(p.m.file); taken.add(p.slot); }
      const extra = maps.filter((m) => !used.has(m.file));
      if (extra.length) adv.querySelector(".ld-map-extra").innerHTML = `<h4>More maps</h4><ul class="ld-map-extras">${extra.map((m) => `<li><a href="${esc(m.src)}" target="_blank" rel="noopener">${esc(m.title)}</a> · <a href="${esc(m.download)}" download>Download</a> <span class="ld-note">${mb(m.bytes)}</span></li>`).join("")}</ul>`;
      const n = maps.length, c = adv.querySelector("[data-map-count]"); if (c) c.textContent = n ? `${n} map${n === 1 ? "" : "s"} ready` : "Maps coming soon";
    }).catch(() => { const c = adv.querySelector("[data-map-count]"); if (c) c.textContent = "The maps couldn't be loaded just now. Try again later."; });
  });
})();
