// A printable sheet of ship tokens, for playing on a table: each people's own ships (their outlines and class names,
// in their colour, with a plain one to colour in), then the ships that belong to no one (the free traders, pirates,
// creatures of the deep and the Wardens), and markers for stations, batteries and depots.
// Writes dist/tokens.html.   node tokens.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { peopleToken } from "./src/peoples.js";
import { SHIP_SHAPES, SHIPS, FACTIONS, CRISIS, FLEET_STYLES, WILDS, TRADERS, BUILDINGS, BATTERY, shipShape, shipLabel } from "./src/data.js";

const ORDER = ["scout", "frigate", "cruiser", "dreadnought", "torpedo", "stealth", "transport", "tanker", "miner", "colony", "outpost"];
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** One round token: the outline in a circle, tinted with the colour (or plain, to colour in), an arrow at the bow. */
const token = (d, color, size) => `<figure class="tok"><svg viewBox="-14 -14 28 28" style="width:${size};height:${size}"><circle r="13.4" fill="${color ? color + "26" : "none"}" stroke="#000" stroke-width=".35"/><g transform="scale(.84)"><path d="${d}" fill="${color || "none"}" fill-opacity="${color ? ".55" : "0"}" stroke="#000" stroke-width=".8" stroke-linejoin="round"/></g><path d="M13.4 0 L11.8 -1 L11.8 1 Z" fill="#000"/></svg></figure>`;
const stats = (t) => { const s = SHIPS[t]; return [s.skill ? `hull ${s.hull}, skill ${s.skill}, ${s.dmg} dmg${s.shots ? ` ×${s.shots}` : ""}` : `hull ${s.hull}, unarmed`, s.speed ? `speed ${s.speed}` : "never moves"].join(" · "); };

// Each people's ships: a row per ship type, with its class name.
const empire = (F) => {
  const st = FLEET_STYLES[F.id];
  return `<section class="empire"><h2><i style="background:${F.color}"></i>${esc(F.name)} <span>${esc(st.style)}</span></h2>
  ${ORDER.map((t) => `<div class="ship"><h3>${esc(shipLabel(F.id, t))} <span>${esc(stats(t))}</span></h3>
    <div class="row">${[1, 2, 3].map(() => token(shipShape(F.id, t), F.color, "0.9in")).join("")}${token(shipShape(F.id, t), null, "0.9in")}${[1, 2].map(() => token(shipShape(F.id, t), F.color, "0.7in")).join("")}</div></div>`).join("")}</section>`;
};

// Ships that belong to no one.
const common = (title, color, list, note) => `<section class="others"><h2><i style="background:${color}"></i>${esc(title)} <span>${esc(note)}</span></h2>
  ${list.map(([t, n, size]) => `<div class="ship"><h3>${esc(SHIPS[t].name)} <span>${esc(stats(t))}. ${esc(SHIPS[t].text)}</span></h3><div class="row">${Array.from({ length: n }, () => token(SHIP_SHAPES[t], color, size || "0.9in")).join("")}</div></div>`).join("")}</section>`;

// Markers for what sits in orbit: an orbital station (a square; also a deep-space station), a battery, a fuel depot.
const MARKERS = {
  station: { name: "Orbital station", d: "M-7 -7 L7 -7 L7 7 L-7 7 Z M-7 0 L-11 0 M7 0 L11 0 M0 -7 L0 -11 M0 7 L0 11 M-3 -3 L3 -3 L3 3 L-3 3 Z", text: BUILDINGS.station.text },
  battery: { name: "Orbital battery", d: "M0 -7 A7 7 0 1 0 0 7 A7 7 0 1 0 0 -7 M5 -5 L10 -10 M5 5 L10 10 M-5 -5 L-10 -10 M-5 5 L-10 10 M0 -3 L0 3 M-3 0 L3 0", text: `${BATTERY.hull} hull, ${BATTERY.shots} shots of ${BATTERY.dmg} a round, repairs ${BATTERY.repair} a turn.` },
  depot: { name: "Fuel depot", d: "M-6 -8 L6 -8 Q9 -8 9 -5 L9 5 Q9 8 6 8 L-6 8 Q-9 8 -9 5 L-9 -5 Q-9 -8 -6 -8 Z M-9 -2 L9 -2 M-9 2 L9 2 M0 -8 L0 -11", text: BUILDINGS.depot.text },
};
const markers = `<section class="others"><h2>Markers <span>Set one under a world's token, or (a station) on an empty hex for a deep-space station.</span></h2>
  ${Object.values(MARKERS).map((m) => `<div class="ship"><h3>${esc(m.name)} <span>${esc(m.text)}</span></h3><div class="row">${FACTIONS.map((F) => token(m.d, F.color, "0.7in")).join("")}${token(m.d, null, "0.7in")}${token(m.d, null, "0.7in")}</div></div>`).join("")}</section>`;

// Each people's hex token, to mark the worlds they hold: four each, and one large for the empire's card.
const peoples = `<section class="others"><h2>Peoples <span>Hex tokens to mark whose a world is: set one on the world's hex. Portraits and traits are on the <a href="peoples.html">Peoples page</a>.</span></h2>
  ${FACTIONS.map((F) => `<div class="ship"><h3>${esc(F.name)} <span>${esc(F.people)} · ${esc(F.trait)}: ${esc(F.traitText)}</span></h3><div class="row">${peopleToken(F.id, F.color, 120)}${[1, 2, 3, 4].map(() => peopleToken(F.id, F.color, 82)).join("")}</div></div>`).join("")}</section>`;
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fracture Lines: Dominion · ship tokens</title>
<style>@page{size:letter;margin:.45in}body{font:11px/1.35 system-ui,sans-serif;color:#000;background:#fff;margin:0 auto;max-width:7.6in;padding:0 8px}
h1{font-size:18px;margin:12px 0 4px}p{margin:0 0 10px}h2{font-size:14px;margin:14px 0 4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}h2 span,h3 span{font-weight:400;color:#555}
h2 i,.key i{width:12px;height:12px;border-radius:50%;display:inline-block;border:1px solid #000;flex:none}h3{font-size:11px;margin:6px 0 2px}
section.empire{break-before:page}.ship{break-inside:avoid}
.row{display:flex;gap:.08in;flex-wrap:wrap;align-items:flex-end;margin-bottom:.04in}.tok{margin:0}.tok svg{display:block}
.key{display:flex;flex-wrap:wrap;gap:4px 14px;margin:0 0 10px}.key span{display:inline-flex;align-items:center;gap:5px}
table.classes{border-collapse:collapse;margin:6px 0 10px;font-size:10px}table.classes td,table.classes th{border:1px solid #bbb;padding:2px 5px;text-align:left}</style></head><body>
<h1>Fracture Lines: Dominion · ship tokens</h1>
<p>Every people builds its own ships, with its own outlines and class names (what each ship does is the same for everyone). Each empire's section has three tokens of each ship in its colour at 0.9 inch, one plain to colour in, and two at 0.7 inch. Then the ships that belong to no one, and markers for what sits in orbit. Print at 100% (no scaling), cut along the circles, and point the arrow on the rim the way the ship is heading.</p>
<div class="key">${FACTIONS.map((f) => `<span><i style="background:${f.color}"></i>${esc(f.name)}</span>`).join("")}</div>
<table class="classes"><tr><th>Ship</th>${FACTIONS.map((f) => `<th>${esc(f.name.replace(/^The /, ""))}</th>`).join("")}</tr>
${ORDER.map((t) => `<tr><td>${esc(SHIPS[t].name)}</td>${FACTIONS.map((f) => `<td>${esc(FLEET_STYLES[f.id].classes[t])}</td>`).join("")}</tr>`).join("")}</table>
${peoples}
${markers}
${common(TRADERS.name, TRADERS.color, [["merchant", 6]], "At peace with everyone but the pirates.")}
${common(WILDS.pirates.name, WILDS.pirates.color, [["raider", 7], ["haven", 2, "1.1in"]], "At war with every power.")}
${common(WILDS.beasts.name, WILDS.beasts.color, [["swarm", 4], ["leviathan", 2, "1.1in"], ["husk", 3]], "At war with every power.")}
${common("The Wardens", CRISIS.color, [["watcher", 3], ["node", 4, "1.1in"], ["sentinel", 7], ["colossus", 4], ["heart", 1, "1.3in"]], "The late-game crisis: the Signs, then the waking.")}
${FACTIONS.map(empire).join("\n")}
<p style="margin-top:14px;font-size:10px;color:#555">Fracture Lines: Dominion, a strategy game in the Fracture Lines setting of the Legend Dynamics RPG.</p>
</body></html>`;
mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("dist/tokens.html", import.meta.url), page);
console.log("wrote dist/tokens.html");
