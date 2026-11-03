// A printable sheet of ship tokens: each ship's outline, plain and in every people's colour, for playing on a table.
// Writes dist/tokens.html.   node tokens.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { SHIP_SHAPES, SHIPS, FACTIONS } from "./src/data.js";
const token = (k, color, size) => `<figure class="tok" style="width:${size};height:${size}"><svg viewBox="-14 -14 28 28"><circle r="13.4" fill="${color ? color + "22" : "none"}" stroke="#000" stroke-width=".35"/><path d="${SHIP_SHAPES[k]}" fill="${color || "none"}" fill-opacity="${color ? ".35" : "0"}" stroke="${color || "#000"}" stroke-width=".75" stroke-linejoin="round"/>${color ? `<path d="${SHIP_SHAPES[k]}" fill="none" stroke="#000" stroke-width=".25" stroke-linejoin="round"/>` : ""}</svg></figure>`;
const rows = Object.keys(SHIP_SHAPES).map((k) => `<section><h2>${SHIPS[k].name} <span>${SHIPS[k].text}</span></h2>
  <div class="row">${Array.from({ length: 4 }, () => token(k, null, "1in")).join("")}${FACTIONS.map((f) => token(k, f.color, "1in")).join("")}</div>
  <div class="row">${FACTIONS.flatMap((f) => [token(k, f.color, "0.75in"), token(k, f.color, "0.75in")]).join("")}</div></section>`).join("\n");
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fracture Lines: Dominion · ship tokens</title>
<style>@page{size:letter;margin:.5in}body{font:12px/1.4 system-ui,sans-serif;color:#000;background:#fff;margin:0 auto;max-width:7.5in;padding:0 8px}
h1{font-size:18px;margin:12px 0 4px}p{margin:0 0 12px}h2{font-size:12px;margin:10px 0 4px}h2 span{font-weight:400;color:#555}section{break-inside:avoid}
.row{display:flex;gap:.1in;flex-wrap:wrap;margin-bottom:.08in}.tok{margin:0}.tok svg{width:100%;height:100%;display:block}
.key{display:flex;flex-wrap:wrap;gap:4px 14px;margin:0 0 10px}.key span{display:inline-flex;align-items:center;gap:5px}.key i{width:12px;height:12px;border-radius:50%;display:inline-block;border:1px solid #000}
@media print{.noprint{display:none}}</style></head><body>
<h1>Fracture Lines: Dominion · ship tokens</h1>
<p>Every ship in the game: four plain outlines (colour them in yourself), then one in each people's colour at 1 inch, and two each at ¾ inch. Print at 100% (no scaling), cut along the circles, and point the bow the way the ship is heading. <a class="noprint" href="#" onclick="print();return false">Print this page</a></p>
<div class="key">${FACTIONS.map((f) => `<span><i style="background:${f.color}"></i>${f.name}</span>`).join("")}</div>
${rows}
<p style="margin-top:14px;font-size:10px;color:#555">Fracture Lines: Dominion, a strategy game in the Fracture Lines setting of the Legend Dynamics RPG.</p>
</body></html>`;
mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("dist/tokens.html", import.meta.url), page);
console.log("wrote dist/tokens.html");
