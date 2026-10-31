// A printable sheet of ship tokens: outlines only, for the tabletop. Writes dist/tokens.html.
//   node tokens.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { SHIP_SHAPES, SHIP_LABELS } from "./src/ships.js";
const sizes = [["1 inch", "1in", 4], ["¾ inch", "0.75in", 6]];
const token = (k, size) => `<figure class="tok" style="width:${size};height:${size}"><svg viewBox="-14 -14 28 28"><circle r="13.4" fill="none" stroke="#000" stroke-width=".35"/><path d="${SHIP_SHAPES[k]}" fill="none" stroke="#000" stroke-width=".6" stroke-linejoin="round"/></svg></figure>`;
const rows = Object.keys(SHIP_SHAPES).map((k) => `<section><h2>${SHIP_LABELS[k]}</h2>${sizes.map(([, sz, n]) => `<div class="row">${Array.from({ length: n }, () => token(k, sz)).join("")}</div>`).join("")}</section>`).join("");
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>USS Pelion: Frontier · ship tokens</title>
<style>@page{size:letter;margin:.5in}body{font:12px/1.4 system-ui,sans-serif;color:#000;background:#fff;margin:0 auto;max-width:7.5in}
h1{font-size:18px;margin:0 0 4px}p{margin:0 0 12px}h2{font-size:12px;margin:10px 0 4px}section{break-inside:avoid}
.row{display:flex;gap:.12in;flex-wrap:wrap;margin-bottom:.08in}.tok{margin:0}.tok svg{width:100%;height:100%;display:block}</style></head><body>
<h1>USS Pelion: Frontier · ship tokens</h1>
<p>Outlines of every ship in the game, at 1 inch and ¾ inch. Print at 100% (no scaling), cut along the circles, and point the bow the way the ship is heading. Colour them in by power if you like: gold for the Pelion, blue for Starfleet support, red for the Klingons, green for the Romulans, orange for the Orions.</p>
${rows}
<p style="margin-top:14px;font-size:10px;color:#555">An unofficial fan game for the USS Pelion campaign, inspired by Star Trek. Not affiliated with or endorsed by Paramount or CBS Studios, who own Star Trek.</p>
</body></html>`;
mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("dist/tokens.html", import.meta.url), page);
console.log("wrote dist/tokens.html");
