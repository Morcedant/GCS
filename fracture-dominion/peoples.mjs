// The Peoples page: each empire's hex token and portrait, what its people look like, its trait, its leader and
// character, and its ships. Writes dist/peoples.html.   node peoples.mjs
// Painted portraits come from the music bucket's peoples/ folder (src/peoples.js, peopleArt), when there are any.
import { writeFileSync, mkdirSync } from "node:fs";
import { FACTIONS, PERSONALITIES, FLEET_STYLES, SHIPS, TECHS, BUILDINGS } from "./src/data.js";
import { peopleToken, peopleArt, installPeopleArt, PEOPLE_CLIP, LOOKS } from "./src/peoples.js";
import { readFileSync } from "node:fs";
// The table server (for the portraits list), as for the game's music.
let server = ""; try { server = readFileSync(new URL("../legend-dynamics/table-server/server-url.txt", import.meta.url), "utf8").trim(); } catch {}
if (!/^https:\/\/[\w.-]+(:\d+)?$/.test(server)) server = "";

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ORDER = ["scout", "frigate", "cruiser", "dreadnought", "colony", "outpost", "transport", "tanker"];
const HEX = "50,2 92,26 92,74 50,98 8,74 8,26";
const card = (f) => {
  const P = PERSONALITIES[f.id] || {}, St = FLEET_STYLES[f.id];
  return `<article class="people" id="${f.id}" style="--c:${f.color}">
  <div class="pic">${peopleArt(f.id, f.color, 180)}</div>
  <div class="txt">
    <h2>${esc(f.name)}</h2>
    <p class="sub">${esc(f.people)} · homeworld ${esc(f.homeworld)}</p>
    <p>${esc(LOOKS[f.id] || "")}</p>
    <dl>
      <dt>Trait</dt><dd><b>${esc(f.trait)}.</b> ${esc(f.traitText)}</dd>
      ${(() => { const T = TECHS.find((x) => x.only === f.id); return T ? `<dt>Signature</dt><dd><b>${esc(T.name)}.</b> ${esc(T.text.replace(/ Unique to this people.*$/, ""))} <span class="muted">Only they can research it. Its hub, the ${esc(BUILDINGS[T.hub].name)}, gives 2 science; whoever captures a world with one learns it.</span></dd>` : ""; })()}
      <dt>Leader</dt><dd><b>${esc((P.leader || "").replace(/^./, (c) => c.toUpperCase()))}</b>, ${esc((P.title || "").toLowerCase())}: ${esc(P.text || "")}</dd>
      <dt>Ships</dt><dd>${esc(St.style)} <span class="muted">${ORDER.map((t) => `${esc(St.classes[t])} ${esc(SHIPS[t].name.toLowerCase())}`).join(" · ")}</span></dd>
    </dl>
  </div></article>`;
};
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dominion peoples</title>
<style>:root{--bg:#0e1420;--fg:#e8edf5;--muted:#9aa7bb;--line:#2a3548;--accent:#6ec8e6;--card:#151d2c}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f7f8fb;--fg:#1b2230;--muted:#5d6878;--line:#d5dae3;--accent:#1f7aa6;--card:#fff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:900px;margin:0 auto;padding:20px 16px 60px}
h1{font-size:28px;margin:8px 0 4px}p.lede{color:var(--muted);margin-top:0}a{color:var(--accent)}
.row{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 6px}.row a{display:block;text-decoration:none;color:var(--fg);text-align:center;font-size:12.5px;width:84px}
.people{display:grid;grid-template-columns:190px 1fr;gap:18px;align-items:start;background:var(--card);border:1px solid var(--line);border-left:5px solid var(--c);border-radius:12px;padding:16px;margin:16px 0;break-inside:avoid}
.people h2{margin:0;font-size:21px}.sub{margin:2px 0 8px;color:var(--muted)}dl{margin:8px 0 0;display:grid;grid-template-columns:70px 1fr;gap:6px 10px}dt{color:var(--muted);font-size:13px;padding-top:2px}dd{margin:0}
.muted{color:var(--muted);font-size:13px;display:block;margin-top:3px}.pic{text-align:center}
@media (max-width:620px){.people{grid-template-columns:1fr}.pic svg{width:140px;height:140px}}
details{margin-top:30px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px}details li{margin:8px 0;font-size:13.5px}
@media print{body{background:#fff;color:#000}.people{border-color:#ccc}details,.row{display:none}}</style></head><body><main>
<h1>The peoples of Dominion</h1>
<p class="lede">The empires of the Fracture Lines, what their peoples look like, and what each brings to the game. Their hex tokens are on the <a href="tokens.html">token sheet</a> too.</p>
<p><a href="index.html">Play the game</a> · <a href="strategy.html">Strategy guide</a> · <a href="tokens.html">Printable tokens</a></p>
<div class="row">${FACTIONS.map((f) => `<a href="#${f.id}">${peopleArt(f.id, f.color, 72)}<br>${esc(f.people.replace(/ and .*/, ""))}</a>`).join("")}</div>
${FACTIONS.map(card).join("\n")}
<p class="muted" style="margin-top:30px">Fracture Lines: Dominion, a strategy game in the Fracture Lines setting of the Legend Dynamics RPG. The peoples are described in the setting's guide.</p>
</main><script>(${installPeopleArt.toString()})(${JSON.stringify(server)}, ${JSON.stringify(PEOPLE_CLIP)});</script></body></html>`;
mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("dist/peoples.html", import.meta.url), page);
console.log("wrote dist/peoples.html");
