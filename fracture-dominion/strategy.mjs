// The strategy guide: the principles and the important steps that keep a player competitive in Fracture Lines:
// Dominion. General on purpose: no build orders or exact numbers to follow, so players find their own way to win.
// Writes dist/strategy.html.   node strategy.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { FACTIONS, RULES } from "./src/data.js";

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sec = (id, title, body) => `<section id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const ul = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;

// Each people's strengths, and the kind of game they suit: a direction, not a plan.
const peoples = {
  concord: "Settling is cheap for you and new colonies start strong. Your strength is growth: the wider you spread early, the more everything else pays off later.",
  tessan: "Credits are your strength, and trade multiplies them. Friends are worth more to you than to anyone, and money can buy what others must build.",
  kel: "Your worlds hold more people and grow faster. Big, well-developed worlds are your strength, and a large population serves every path to victory.",
  hegemony: "Your warships hit harder and your troops land in greater force. War is your strength: every world you take is one your rivals no longer have.",
  vael: "Your living ships go farther, heal anywhere and need no fuel. Reach is your strength: you can act where others can't follow.",
};

const toc = [["win", "Know how the game is won"], ["principles", "Principles"], ["early", "The early game"], ["middle", "The middle game"], ["late", "The late game"], ["paths", "Choosing a path to victory"], ["peoples", "Playing to your people's strengths"], ["war", "War"], ["defense", "Defense"], ["threats", "Threats from outside"], ["explore", "Exploration"], ["diplomacy", "Diplomacy"], ["mistakes", "Common mistakes"]];

const body = [
  sec("win", "Know how the game is won", `
<p>A standard game ends after ${RULES.maxTurns} turns. Before then, a power can win by finishing the <b>Corridor Engine</b>, or by <b>conquest</b>, being the last one standing. If neither happens, the highest <b>score</b> wins. The computer players are racing for these too.</p>
<p>Keep an eye on the <b>Objectives</b> tab. It shows where you stand in each race, and its Threats list tells you when a rival is getting close. Being competitive means knowing, at every stage, which race you're in and who you have to beat.</p>`),

  sec("principles", "Principles", ul([
    "<b>Growth compounds.</b> Every world you settle early keeps paying for the rest of the game. Early expansion is rarely wasted.",
    "<b>Have a goal, and keep a backup.</b> Pick the victory that suits your position, but keep your score healthy in case it slips away.",
    "<b>Balance your empire.</b> Industry, science, credits and defense all matter. An empire strong in one and starved in the others is easy to beat.",
    "<b>Information wins.</b> Explore constantly, and watch your rivals' progress. Most defeats come as a surprise.",
    "<b>Act on threats early.</b> A rival's plan is far easier to stop when it begins than when it's nearly done.",
    "<b>Don't waste what you have.</b> Idle yards, idle fleets, a growing debt or an unused Focus are all lost turns.",
    "<b>Adapt.</b> Your plan should follow the galaxy you're dealt: where the good worlds are, who your neighbours are, and what they're doing."])),

  sec("early", "The early game", ul([
    "<b>Explore first.</b> Find the good worlds, the ruins and anomalies, and your neighbours as soon as you can.",
    "<b>Settle steadily.</b> Keep claiming worlds and outposts while there's open space near you. Territory taken early is cheap; taken later, it means a war.",
    "<b>Lay the foundations.</b> Early research and buildings that raise industry, science and credits on every world make everything after them faster.",
    "<b>Keep some defense.</b> You don't need a big fleet yet, but you do need enough to answer raiders and opportunists.",
    "<b>Make contact.</b> Meeting your neighbours early opens trade and tells you who may become a threat."])),

  sec("middle", "The middle game", ul([
    "<b>Develop your best worlds.</b> Your largest worlds are your engines: build them up before spreading effort thin.",
    "<b>Connect your economy.</b> Trade between your worlds and with friendly powers adds up, and so do outposts that sell fuel and exotics.",
    "<b>Commit to a direction.</b> By now you should know which victory you're aiming for, and research and build toward it.",
    "<b>Keep your fleet current.</b> New research reaches ships already in service only when they're refitted. A modern fleet beats a larger outdated one.",
    "<b>Secure your borders.</b> Fortify the worlds that face your rivals, and keep a fleet where trouble is likeliest.",
    "<b>Watch the leader.</b> If someone is pulling ahead, decide whether you can out-race them or must slow them down."])),

  sec("late", "The late game", ul([
    "<b>Close out.</b> Whatever your path, the end is a race: concentrate everything on finishing first.",
    "<b>Stop the others.</b> If a rival is close to winning, nothing you build matters more than stopping them.",
    "<b>Prepare for the crisis.</b> If the Wardens are coming, have defenses and a strong fleet ready before they wake.",
    "<b>Protect what wins you the game.</b> Your capital, and whatever you've built or found there, are what rivals will come for."])),

  sec("paths", "Choosing a path to victory", `
<h3>The Corridor Engine</h3>
<p>A long research path, then a great work at your capital. It rewards a strong science economy, a well-developed capital and steady defense while you build. It's the path the computer players favour, so it's also the race you're most likely to have to win, or to stop.</p>
<h3>Conquest</h3>
<p>Taking worlds from others. It rewards a strong economy behind a modern fleet, careful preparation, and patience: a world's defenses must be overcome and its orbit held before it can be taken. Supply, fuel and refits decide how far you can reach. Each world you take adds to you and weakens a rival.</p>
<h3>Score</h3>
<p>The fallback that's always in play. Score grows with your worlds and their people, your research, your fleet, and the treasures and victories you collect. A balanced, wide empire scores well, whatever else it's doing.</p>
<h3>Open games</h3>
<p>In an open game the Engine is a prize to hold rather than a victory. Holding it brings great advantages, and the resentment of everyone else. Be ready to defend it, or to take it.</p>`),

  sec("peoples", "Playing to your people's strengths", FACTIONS.map((f) => `<h3><i class="dot" style="background:${f.color}"></i>${esc(f.name)}</h3>
<p class="small"><b>${esc(f.trait)}</b>: ${esc(f.traitText)}</p><p>${esc(peoples[f.id])}</p>`).join("") + `
<p>Any people can win any way. Your trait just makes some paths easier, so lean into it when you can.</p>`),

  sec("war", "War", ul([
    "<b>Fight on your terms.</b> Choose when and where. Attacking prepared defenses with too little is the fastest way to lose a fleet.",
    "<b>Concentrate.</b> Strength in one place beats the same strength spread thin.",
    "<b>Quality matters.</b> Better technology and refitted ships often matter more than numbers.",
    "<b>Mind your supply.</b> Fleets far from home run short. Plan how you'll keep them fuelled before you go.",
    "<b>Finish what you start.</b> Taking a world means winning its orbit, holding it, and bringing enough troops. Leave halfway and you'll start again.",
    "<b>Know when to make peace.</b> A war that costs more than it gains is worth ending."])),

  sec("defense", "Defense", ul([
    "<b>Defend where it matters.</b> Your capital, your best worlds and your borders come first.",
    "<b>Fixed defenses buy time.</b> Guns in orbit hold off small attacks and give your fleets time to arrive.",
    "<b>Respond quickly.</b> A world under siege loses output every turn. Break sieges early.",
    "<b>Don't leave your heart empty.</b> A rival who finds your capital unguarded can undo a whole game."])),

  sec("threats", "Threats from outside", ul([
    "<b>Pirates and creatures</b> belong to no one and trouble everyone. Deal with them when you're ready. They pay well when destroyed. Sometimes buying peace from pirates is the better use of your time. Neighbours can help each other against them.",
    "<b>The Wardens</b> are the late-game crisis, and they come for every power, the strongest and anyone building the Corridor Engine first. The signs come long before they wake: deal with what you can while it's still asleep. Awake, they spread like an empire, and they come back unless every trace of them is gone.",
    "<b>Adjust the challenge</b> to your taste: the number of pirates and creatures, the difficulty and the computer players' options are all settings."])),

  sec("explore", "Exploration", ul([
    "<b>Keep exploring all game.</b> Ruins and anomalies give research, and some hide relics of the old empires.",
    "<b>Relics are powerful</b>, and they stay with the world that keeps them. Guard yours; a rival's can be taken.",
    "<b>The galaxy may be bigger than it looks.</b> Be ready to move if new space opens."])),

  sec("diplomacy", "Diplomacy", ul([
    "<b>Friends are an economy.</b> Trade and good relations pay steadily and keep wars away from you.",
    "<b>Choose your enemies.</b> You can't fight everyone. Keep the peace where you can, so you can focus where you must.",
    "<b>Remember they remember.</b> Rivals recall how you've treated them, and it shapes how they'll treat you.",
    "<b>Alliances cut both ways.</b> An ally brings help, and their wars."])),

  sec("mistakes", "Common mistakes", ul([
    "Stopping expansion too early.",
    "Having no clear goal, or never changing it when the game changes.",
    "Noticing a rival's victory too late.",
    "Attacking without enough strength, or without a way to finish the job.",
    "Fighting with an outdated fleet.",
    "Letting the treasury fall into debt.",
    "Leaving the capital undefended.",
    "Ignoring threats from outside until they're at your door."])),
].join("\n");

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dominion strategy guide</title>
<style>:root{--bg:#0e1420;--fg:#e8edf5;--muted:#9aa7bb;--line:#2a3548;--accent:#6ec8e6;--card:#151d2c}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f7f8fb;--fg:#1b2230;--muted:#5d6878;--line:#d5dae3;--accent:#1f7aa6;--card:#fff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:820px;margin:0 auto;padding:20px 16px 60px}h1{font-size:28px;margin:8px 0 4px}h2{font-size:21px;margin:32px 0 8px;padding-top:10px;border-top:1px solid var(--line)}h3{font-size:16px;margin:16px 0 4px}
p.lede{color:var(--muted);margin-top:0}a{color:var(--accent)}nav.toc{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 16px;margin:16px 0}nav.toc ol{columns:2;margin:6px 0;padding-left:20px}
@media (max-width:600px){nav.toc ol{columns:1}}li{margin:5px 0}.small{font-size:13.5px;color:var(--muted)}i.dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px}
@media print{body{background:#fff;color:#000}h2{break-after:avoid}}</style></head><body><main>
<h1>Fracture Lines: Dominion · strategy guide</h1>
<p class="lede">The principles and the important steps that keep you competitive. There's no single right way to win, so this guide points the way and leaves the details to you.</p>
<p><a href="index.html">Play the game</a> · <a href="tokens.html">Printable ship tokens</a></p>
<nav class="toc"><b>Contents</b><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join("")}</ol></nav>
${body}
<p class="small" style="margin-top:40px">For how each rule works, see Menu → How to play in the game. Fracture Lines: Dominion, a strategy game in the Fracture Lines setting of the Legend Dynamics RPG.</p>
</main></body></html>`;
mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("dist/strategy.html", import.meta.url), page);
console.log("wrote dist/strategy.html");
