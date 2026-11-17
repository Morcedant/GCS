// The strategy guide: how to win Fracture Lines: Dominion, with plans to follow. Its numbers come from the game's own
// data (src/data.js), so they stay true when the rules change. Writes dist/strategy.html.   node strategy.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { SHIPS, BUILDINGS, TECHS, FACTIONS, RULES, BATTERY, SIEGE, TRADE, SUPPLY, FUEL, STANCES, FOCUS, ADVANCES, RELICS, RELIC_SCORE,
  WILDS, WILD_LEVELS, PROTECTION, AI_PRESETS, ENGINE, YARDS, OUTPOST_BUY, OUTPOST_TRADE, CRISIS, FLEET_STYLES, shipLabel } from "./src/data.js";

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tech = (id) => TECHS.find((t) => t.id === id);
// 3d6 roll-under: a 3 or 4 always hits, a 17 or 18 always misses.
const ways = (() => { const w = Array(19).fill(0); for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) w[a + b + c]++; return w; })();
const hit = (need) => { let n = 0; for (let r = 3; r <= 18; r++) if (r <= 4 || (r < 17 && r <= need)) n += ways[r]; return n / 216; };
const pct = (x) => `${Math.round(x * 100)}%`;
const engineChain = (() => { const out = [], seen = new Set(); const visit = (id) => { if (seen.has(id)) return; seen.add(id); const t = tech(id); t.needs.forEach(visit); out.push(t); }; visit("engine"); return out; })();
const engineResearch = engineChain.reduce((s, t) => s + t.cost, 0);
const warships = ["frigate", "cruiser", "dreadnought"];
const value = (t) => { const s = SHIPS[t]; return (s.hull * s.dmg * hit(s.skill)) / s.cost; };

const traitOf = (id) => FACTIONS.find((f) => f.id === id);
const plans = {
  concord: { plan: "Expand fast, then the Engine or score.", how: [
    "Cheap colony ships: build two in the first 15 turns and settle every terran and ocean world near you. You start new colonies at 2 population, so they pay back quickly.",
    "Get Xenology early to open desert and arctic worlds, then Commerce guilds and Exchanges for credits.",
    "With a wide empire, go for the Corridor Engine (Plan A) or simply out-score everyone (Plan C)."] },
  tessan: { plan: "Trade your way to the top, then buy what you need.", how: [
    "Sign trade treaties with everyone who'll have you: they pay you double. Build Exchanges early, and keep colonies within 4 hexes of each other for trade links.",
    "Use the credits: rush key builds (the queue's Rush button), buy batteries and stations for outposts, pay pirates off when they're cheaper than a fleet.",
    "Your money makes Plan A (the Engine) easy: rush the Engine itself the turn the research lands."] },
  kel: { plan: "Out-breed everyone: the biggest worlds and the highest score.", how: [
    "Your worlds hold 2 more population and grow faster: settle big terran and ocean worlds, and build Factories and Labs on them.",
    "Habitat domes, Terraforming, Orbital habitats and Habitat engineering all stack with your trait.",
    "Plan C (score) suits you best; your population also makes Plan A fast. The other powers resent wide neighbours, so keep a defensive fleet."] },
  hegemony: { plan: "Conquest: your warships hit harder and your troops land twice the force.", how: [
    "Heavy hulls first, then Orbital shipyards (cheaper ships, and a Drydock for refits). Build cruisers in pairs.",
    "Your transports carry twice the troops, so two of them take most colonies once their guns are down.",
    "Follow Plan B. Pick on the nearest weak rival first: their worlds become yours, with their buildings."] },
  vael: { plan: "Raid deep: your living hulls need no fuel and heal anywhere.", how: [
    "Your ships move 1 hex farther and repair a point a turn anywhere, so you can fight far from home where others run dry.",
    "Strike enemy fuel depots and outposts to cut their supply, then pick off their stranded fleets.",
    "Plan B suits you, and your scouts reach ruins and relics first: race for the Founders' Star Chart."] },
};

const sec = (id, title, body) => `<section id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const ol = (items) => `<ol>${items.map((x) => `<li>${x}</li>`).join("")}</ol>`;
const ul = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const table = (head, rows) => `<table><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;

const toc = [["win", "How you win (and lose)"], ["opening", "The opening: your first 30 turns"], ["planA", "Plan A: the Corridor Engine"], ["planB", "Plan B: conquest"], ["planC", "Plan C: the highest score"], ["open", "Open games: holding the Engine"], ["peoples", "Each people's plan"], ["economy", "Running an economy"], ["war", "Fleets and battles"], ["defense", "Defending your worlds"], ["threats", "Pirates, creatures and the Wardens"], ["explore", "Exploring: ruins, anomalies and relics"], ["diplomacy", "Diplomacy"], ["difficulty", "Difficulty"], ["mistakes", "Common mistakes"]];

const body = [
  sec("win", "How you win (and lose)", `
<p>A standard game lasts ${RULES.maxTurns} turns. You win the moment one of these happens:</p>
${ul([
  `<b>The Corridor Engine</b>: research it, then finish it at your capital (${BUILDINGS.engine.cost} industry and ${BUILDINGS.engine.exotics} exotics). The computer powers aim for this too, and on Normal one usually finishes it somewhere between turn 110 and 165. <b>Beat that, or stop them.</b>`,
  `<b>Conquest</b>: be the last power with a world.`,
  `<b>Score</b>: lead on score when turn ${RULES.maxTurns} ends.`])}
<p>You lose if your last world falls, or a rival wins any of those ways. The Objectives tab tracks all three races, and its Threats list warns you when a rival starts building the Engine: <b>that warning is your signal to act</b>.</p>
<p><b>The short version:</b> expand hard for 30 turns, build an economy, research toward the Engine, and keep enough fleet to stop anyone else finishing theirs. You win most often by finishing the Engine before the computer does, or by taking the capital of the rival building it.</p>`),

  sec("opening", "The opening: your first 30 turns", `
<p>Every power starts with one world (population 4, a Shipyard), a scout, a frigate and a colony ship. This order works for every people:</p>
${ol([
  `<b>Turn 1.</b> Research <b>${tech("sensors").name}</b> (${tech("sensors").cost}): every ship and world sees farther. Send the scout out at once, toward the nearest unexplored corridor. Look for green (terran) and blue (ocean) worlds within 3–4 hexes.`,
  `<b>Turn 1.</b> Send the colony ship to the best world within reach: bigger is better, and terran or ocean worlds need no technology. Queue a <b>Factory</b> at your capital.`,
  `<b>Turns 2–10.</b> Queue a second colony ship, then an <b>outpost ship</b> for the nearest system with an exotics deposit (◆) or a gas giant. Outposts claim territory and exotics, and with a fuel depot they sell fuel (+${OUTPOST_TRADE.fuel} credits a turn, +${OUTPOST_TRADE.fuel + OUTPOST_TRADE.gas} on a gas giant).`,
  `<b>Research next:</b> ${tech("xenology").name} (opens desert and arctic worlds, doubling where you can settle), then ${tech("automation").name} (+1 industry on every world), then ${tech("commerce").name}.`,
  `<b>Turns 10–20.</b> Keep a colony ship in production until there's nowhere good left nearby. Put a Research lab on your capital once it reaches 4 population. Send the scout to every ruin (?) and anomaly (✦) you see: each is free research, and some hide relics.`,
  `<b>Turns 20–30.</b> Build an Exchange on worlds that trade (other colonies of yours within ${TRADE.range} hexes), a second warship or two, and fuel depots on your outposts. By turn 30 aim for <b>5–7 colonies and 2–3 outposts</b>.`])}
<p><b>Focus</b> (Empire tab): ${FOCUS.points} points, 2 at most on one. Early on, put 2 on Industry and 1 on Science. Move points to Defense only when a war reaches you.</p>`),

  sec("planA", "Plan A: the Corridor Engine", `
<p>The most reliable win. You need ${engineChain.length} technologies (${engineResearch} research in all), then ${BUILDINGS.engine.cost} industry and ${BUILDINGS.engine.exotics} exotics at your capital.</p>
${table(["Research, in order", "Cost", "Why"], engineChain.map((t) => [esc(t.name), t.cost, esc(t.text)]))}
${ol([
  `<b>Science first.</b> Research labs on your three biggest worlds (+2 science and +50% there), Focus 2 on Science once you have 6+ colonies, and research pacts: each trade treaty adds 5% science, up to three.`,
  `<b>Grab free research:</b> scouts on ruins (+70, or a gamble for a prototype) and anomalies (40 early, up to 160 later); a Deep-space observatory studies nearby anomalies without a ship.`,
  `<b>Advances later:</b> once Deep sensors is done, <i>Unified theory</i> adds 5% science a level. Take a level or two only if you're waiting on industry.`,
  `<b>Collect exotics as you go.</b> Outposts on exotics deposits give 1 a turn (2 with an Exotics refinery). You need ${BUILDINGS.engine.exotics} at the end, plus any cruisers'. If you're short, the Exchange's market sells them.`,
  `<b>Build your capital up</b> before the Engine research lands: a Factory, an Orbital battery and, ideally, an Orbital station. While enemy warships hold your capital's orbit, its industry halves.`,
  `<b>Queue the Engine the turn the research finishes</b>, and <b>rush</b> it with credits if you can (the Rush button costs ${RULES.rushRate} credits per point of industry left). Every turn you wait is a turn for a rival to finish theirs.`,
  `<b>Watch the Threats list.</b> If a rival starts its Engine first, you have a race: take or blockade their capital (Plan B's siege), or out-build them with rushes.`])}`),

  sec("planB", "Plan B: conquest", `
<p>Take the nearest weak rival's worlds, then the next. Conquest needs three things: winning the orbit, keeping it, and enough troops.</p>
<h3>1. Win the orbit</h3>
${table(["Ship", "Cost", "Hull", "Skill", "Damage", "Hits on", "Damage per 100 credits"], warships.map((t) => { const s = SHIPS[t]; return [esc(s.name), s.cost + (s.exotics ? ` + ${s.exotics} exotic${s.exotics === 1 ? "" : "s"}` : ""), s.hull, s.skill, s.dmg, pct(hit(s.skill)), (value(t) * 100).toFixed(1)]; }))}
<p>Bigger ships hit harder for their price: a dreadnought gives the most damage per credit, but needs Capital ships and ${SHIPS.dreadnought.exotics} exotics. Cruisers are the workhorse from Heavy hulls on. Frigates are for numbers early, and for screening: they soak up hits aimed at your bigger ships. Deflector shields (+1 hull) and Targeting computers (+1 skill) matter a lot: going from skill 11 to 12 lifts the hit chance from ${pct(hit(11))} to ${pct(hit(12))}.</p>
<p><b>A world's guns:</b> a capital has ${BATTERY.capitalHull} hull of guns, and an Orbital battery has ${BATTERY.hull} hull with ${BATTERY.shots} shots of ${BATTERY.dmg} a round. Against a battery, bring <b>at least 3 cruisers, and 4 to be safe</b>. In test fights, 3 cruisers silence a battery 88% of the time for about one ship lost, and 4 do it every time. Frigates alone are a poor match: even 6 of them lose two fights in three. Each extra turn the battery survives, it can't repair while you hold the orbit, so a fleet that stays wears it down.</p>
<h3>2. Keep the orbit (the siege)</h3>
${ul([
  `Stay. While your warships hold the orbit, its guns <b>don't repair</b>, and whatever its yards finish can't launch.`,
  `Once its guns are silent it's <b>blockaded</b>: half industry and credits, no trade, no growth, and its garrison weakens ${Math.round(SIEGE.garrisonPerTurn * 100)}% a turn (to half at the most). Hold ${SIEGE.surrenderAfter} turns and an ordinary colony that's starved to ${SIEGE.surrenderPop} population surrenders on its own; a capital never does.`,
  `A <b>targeted barrage</b> (fleet panel) destroys a building a turn: hit the <b>Shipyard</b> first, which takes the ships in its queue with it, then the Battery.`])}
<h3>3. Land the troops</h3>
<p>A world's defense is <b>0.5 per population</b>, +2 for a capital, +${BATTERY.garrison} for a battery's troops and +3 for Garrison barracks, weakened by the siege. Each troop transport carries 2 (the Hegemony's carry 4). The fleet panel shows <i>your troops against their defense</i>: bring at least that many, <b>one turn behind the warships</b>, so they land the turn after the guns go down.</p>
<h3>Supply and fuel</h3>
<p>Fleets more than ${SUPPLY.range} hexes from your colonies and fuel depots burn fuel each turn they move, and crawl when it runs out. To reach farther, bring a <b>fuel tanker</b> or two with the fleet, or build a fuel depot (or a deep-space station) on the way. Enemy depots can be <b>raided</b>: that fills your tanks, and their depot is dry for 5 turns.</p>
<h3>Refits</h3>
<p>Research reaches ships already in service only at a Shipyard (sensors, drives, shields) or a Drydock (everything else). Before a big push, send the fleet home for a refit: the Empire tab's Refits card does it in one click.</p>`),

  sec("planC", "Plan C: the highest score", `
<p>If no one finishes the Engine and no one conquers everyone, the highest score at turn ${RULES.maxTurns} wins. Score is:</p>
${table(["For", "Points"], [["Each colony", "5, plus 2 per population"], ["Each outpost", "2"], ["Each technology", "6"], ["Fleet strength", "a quarter of it"], ["Each relic you hold", RELIC_SCORE], ["Each Warden machine destroyed, and the Heart", "by its size; 30 for the Heart"], ["Each turn holding the Corridor Engine (open games)", ENGINE.scorePerTurn]])}
<p>So: <b>settle wide, grow tall, research everything</b>, and keep a decent fleet. Population is the biggest lever: Habitat domes, Terraforming, Orbital habitats and Habitat engineering. Relics are worth ${RELIC_SCORE} each, and you can take them by taking the world that holds them. Even if you're playing for the Engine, a high score is your fallback.</p>`),

  sec("open", "Open games: holding the Engine", `
<p>In an open game the Engine doesn't win. Instead it's the galaxy's great prize: free corridor travel, a gate that jumps a fleet from the Engine world to any of yours every ${ENGINE.gateEvery} turns, +${ENGINE.tradePerColony} credits on every colony, and ${ENGINE.scorePerTurn} score a turn. Everyone resents its holder, and after a while they band together.</p>
${ul(["Build it, then <b>fortify its world</b> at once: battery, station, barracks, and a standing fleet.", "Use the gate to answer attacks anywhere.", "If a rival holds it, take its world (you get the Engine) or bombard it (it's destroyed, and the race starts again; any work you've done on your own Engine is kept)."])}`),

  sec("peoples", "Each people's plan", FACTIONS.map((f) => { const p = plans[f.id], st = FLEET_STYLES[f.id]; return `<h3><i class="dot" style="background:${f.color}"></i>${esc(f.name)}: ${esc(p.plan)}</h3>
<p class="small"><b>${esc(f.trait)}</b>: ${esc(f.traitText)} Ships: ${esc(shipLabel(f.id, "cruiser"))}s and ${esc(shipLabel(f.id, "dreadnought"))}s.</p>${ul(p.how.map(esc))}`; }).join("")),

  sec("economy", "Running an economy", `
${ul([
  `<b>Industry</b> builds things. Factories (+50% on that world) go on your biggest worlds first; Automated factories give +1 everywhere.`,
  `<b>Credits</b> pay upkeep (every ship and building costs a little each turn), rushes and purchases. Exchanges (+3, +5 with Commerce guilds), trade links (other colonies within ${TRADE.range} hexes: +${TRADE.perLink} each, doubled with an Exchange), trade treaties (+3 a turn each), merchant convoys between Exchanges, and outposts selling fuel and exotics. <b>Don't go into debt</b>: in debt, your yards and labs slow to three quarters.`,
  `<b>Outposts</b> can't build with industry, so they buy with credits at ${OUTPOST_BUY.rate}× the cost: a fuel depot ${FUEL.depotCost}, a battery ${Math.round(BUILDINGS.battery.cost * OUTPOST_BUY.rate)}, a station ${Math.round(BUILDINGS.station.cost * OUTPOST_BUY.rate)}.`,
  `<b>Muster points</b> (Empire tab) send every new warship to one place: your front. They join up there, so you don't have to move each one.`,
  `<b>Drydock</b> (Orbital shipyards) at your main yard: ships built there cost ${Math.round(YARDS.discount * 100)}% less, and it refits and fully repairs your fleets.`,
  `<b>Advances</b>, once their technology is done: research them again and again. The best value comes from Industrial efficiency, Unified theory and Interstellar banking (+5% a level each).`])}`),

  sec("war", "Fleets and battles", `
<p>Battles are three exchanges of fire at the end of the turn. Each armed ship and world gun fires at a random enemy and rolls 3d6: it hits on its skill or less (a 3 or 4 always hits, a 17 or 18 always misses).</p>
${table(["Skill", "11", "12", "13", "14", "15"], [["Chance to hit", ...[11, 12, 13, 14, 15].map((n) => pct(hit(n)))]])}
${ul([
  `<b>Stances</b> (fleet panel): <i>Aggressive</i> is +1 to your rolls and +1 to theirs, good when you outnumber them. <i>Defensive</i> is −1 to both, good for holding a world until help comes.`,
  `<b>Admirals</b>: a fleet of two or more warships that wins may gain one, and admirals gain traits as they win (Gunnery master +1, Steady −1 to enemy rolls, Swift, Quartermaster, Shipwright). Keep your admiral's fleet alive.`,
  `<b>Concentrate.</b> Fleets in the same hex join up. One big fleet beats three small ones, because damage spreads across random targets.`,
  `<b>Refit before you fight.</b> Ships built before a technology don't have it until they visit a yard.`])}`),

  sec("defense", "Defending your worlds", `
${ul([
  `An <b>Orbital battery</b> (${BUILDINGS.battery.cost}) is a fortress: ${BATTERY.hull} hull, ${BATTERY.shots} shots of ${BATTERY.dmg}, it repairs ${BATTERY.repair} a turn, and while it stands the world can't be blockaded. Put one on your capital and your frontier worlds when war comes.`,
  `An <b>Orbital station</b> adds 4 hull of guns and supply, and repairs your ships ${YARDS.station} a turn. <b>Garrison barracks</b> add 3 to the defense against troops.`,
  `Keep a <b>home fleet</b> at the capital: a world with your warships in orbit can't be raided, besieged or invaded until they're gone.`,
  `Break a siege fast: every turn it lasts costs half the world's output and wears its garrison down.`])}`),

  sec("threats", "Pirates, creatures and the Wardens", `
${ul([
  `<b>Pirates</b> (Menu → Pirates and creatures: None, Light or Heavy). Havens appear from turn ${WILDS.havenFirst} and send raiders against established, unguarded colonies. <b>Pay</b> a ransom or tribute (20 turns' peace from that haven) when you're busy elsewhere; <b>fight</b> when you can, because a haven pays ${WILDS.bounty.haven.credits} credits and ${WILDS.bounty.haven.research} research. One warship at a world drives raiders off, and they shun a world where they've lost a ship. A <b>pirate patrol pact</b> (Diplomacy) lets a neighbour's warships guard your worlds too.`,
  `<b>Crystal swarms</b> sit on rich systems and block settling there. Clear one with 3+ warships for ${WILDS.bounty.swarm.research} research and the system. <b>Void leviathans</b> (12 hull, 3 damage) wander from turn ${WILD_LEVELS.light.leviathanFirst} on Light (${WILD_LEVELS.heavy.leviathanFirst} on Heavy): avoid them until you have cruisers, and then they're worth ${WILDS.bounty.leviathan.research} research.`,
  `<b>The Wardens</b> wake around turn ${CRISIS.earliest}–${CRISIS.earliest + CRISIS.spread}, with ${CRISIS.warning} turns' warning. Their waves burn unguarded worlds. Put batteries on your outer worlds before they wake, gather one big fleet, and break their <b>Heart</b> (worth 30 score, and they go dark). Studying the signal when you're warned weakens the Heart. The Warden Key relic makes them easier.`])}`),

  sec("explore", "Exploring: ruins, anomalies and relics", `
${ul([
  `Keep <b>two scouts</b> out all game. Ruins (?) and anomalies (✦) are free research, and ${Object.keys(RELICS).length} relics hide among them.`,
  `At a ruin, <i>study</i> it for safe research; <i>dig</i> for a chance at a prototype or exotics (or a hit to your fleet).`,
  `<b>The Founders' Star Chart</b> lies at the site farthest from every homeworld. Read it and the galaxy grows by four rings (the Outer Reach), with new systems and four more relics. Whoever reads it sees the Reach first: go there with colony ships.`,
  `Relics belong to the world that keeps them, your capital at first. Guard it: <b>take a rival's capital and you take its relics</b>.`])}`),

  sec("diplomacy", "Diplomacy", `
${ul([
  `<b>Trade treaties</b> early with everyone (+3 credits a turn each, and they warm relations). Each one also counts as a research pact.`,
  `<b>Alliances</b> mean both of you join each other's wars. Ally with your neighbour's neighbour, not with your neighbour.`,
  `Settling right next to a rival angers them. War is likelier with a strong, angry neighbour: watch the Diplomacy tab's mood and what they remember.`,
  `Answer envoys with care: paying a demand buys goodwill, refusing a strong, proud power can mean war.`,
  `Make peace once a war has cost them. They accept more readily when they're losing, or after a long war.`])}`),

  sec("difficulty", "Difficulty", `
${table(["", "Easy", "Normal", "Hard"], [["Strength (fleet size, readiness for war)", ...["easy", "normal", "hard"].map((d) => `${AI_PRESETS[d].strength}×`)], ...["stations", "fortify", "raidDepots", "payPirates"].map((k) => [{ stations: "Build deep-space stations", fortify: "Fortify frontier outposts", raidDepots: "Raid your fuel depots", payPirates: "Pay pirates instead of fighting" }[k], ...["easy", "normal", "hard"].map((d) => (AI_PRESETS[d][k] ? "yes" : "no"))])])}
<p>On Hard the computer powers build bigger fleets, war sooner, and put stations on the approaches: <b>build batteries earlier</b>, and expect your fuel lines to be raided.</p>`),

  sec("mistakes", "Common mistakes", ul([
    "Stopping colony ships too early. Expansion compounds: a world founded on turn 15 is worth far more than one on turn 60.",
    "Ignoring the Threats list until a rival's Engine is nearly done. Act when it starts.",
    "Throwing frigates at an Orbital battery. Bring 3–4 cruisers, and transports one turn behind.",
    "Leaving the orbit before the troops land: the guns repair, and you start again.",
    "Fighting with ships that missed their refit. Check the Refits card first.",
    "Flying beyond supply without a tanker, and ending up crawling a hex a turn.",
    "Going into debt: everything slows down.",
    "Leaving the capital unguarded. It holds your relics, your Engine and your best yard."])),
].join("\n");

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dominion strategy guide</title>
<style>:root{--bg:#0e1420;--fg:#e8edf5;--muted:#9aa7bb;--line:#2a3548;--accent:#6ec8e6;--card:#151d2c}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f7f8fb;--fg:#1b2230;--muted:#5d6878;--line:#d5dae3;--accent:#1f7aa6;--card:#fff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:20px 16px 60px}h1{font-size:28px;margin:8px 0 4px}h2{font-size:21px;margin:34px 0 8px;padding-top:10px;border-top:1px solid var(--line)}h3{font-size:16px;margin:18px 0 6px}
p.lede{color:var(--muted);margin-top:0}a{color:var(--accent)}nav.toc{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 16px;margin:16px 0}nav.toc ol{columns:2;margin:6px 0;padding-left:20px}
@media (max-width:600px){nav.toc ol{columns:1}}table{border-collapse:collapse;width:100%;margin:8px 0 12px;font-size:14px;display:block;overflow-x:auto}th,td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}th{background:var(--card)}
li{margin:4px 0}.small{font-size:13.5px;color:var(--muted)}i.dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;vertical-align:baseline}
@media print{body{background:#fff;color:#000}nav.toc{break-after:page}h2{break-after:avoid}}</style></head><body><main>
<h1>Fracture Lines: Dominion · strategy guide</h1>
<p class="lede">How to win: an opening that works for every people, three complete plans to victory, each people's best plan, and how the systems underneath work. Every number here comes from the game itself.</p>
<p><a href="index.html">Play the game</a> · <a href="tokens.html">Printable ship tokens</a></p>
<nav class="toc"><b>Contents</b><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join("")}</ol></nav>
${body}
<p class="small" style="margin-top:40px">Fracture Lines: Dominion, a strategy game in the Fracture Lines setting of the Legend Dynamics RPG.</p>
</main></body></html>`;
mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("dist/strategy.html", import.meta.url), page);
console.log("wrote dist/strategy.html");
