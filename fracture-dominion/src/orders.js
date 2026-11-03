// Directives: missions for the player from their own faction's authority, of the kinds that faction cares about (the
// Concord's Assembly wants new colonies; the Hegemony's Legion Command wants worlds taken), with a deadline and a reward. Two are under way at a time; the rest
// wait in a backlog, and the oldest moves up when one is finished (its clock starts then). Every directive's progress is
// measured from the moment it starts, so it asks for something new: one more colony, three more systems charted.
import { TECHS, BUILDINGS, PROTOTYPES } from "./data.js";
import { player, faction, coloniesOf, availableTechs, log, militaryPower, has, spawnFleet } from "./game.js";
import { distance } from "./hex.js";

export const ACTIVE_MAX = 2, BACKLOG_MAX = 3, EVERY = 5;

const KINDS = {
  colony: { title: () => "Found a new colony", need: 1, turns: 10, reward: 40, how: "Send a colony ship to a world you can live on and found a colony there." },
  outpost: { title: () => "Claim an outpost", need: 1, turns: 8, reward: 25, how: "Send an outpost ship to any unclaimed system and claim it." },
  explore: { title: (d) => `Chart ${d.need} more systems`, need: 4, turns: 6, reward: 25, how: "Send scouts (or any ship) into unexplored space." },
  ships: { title: (d) => `Commission ${d.need} new ships`, need: 2, turns: 8, reward: 30, how: "Build ships at a world with a shipyard (a world's build queue)." },
  research: { title: (d) => `Research ${TECHS.find((t) => t.id === d.arg).name}`, need: 1, turns: 10, reward: 35, how: "Choose it on the Research tab, if it isn't your current research." },
  building: { title: (d) => `Build a ${BUILDINGS[d.arg].name.toLowerCase()}`, need: 1, turns: 8, reward: 30, how: (d) => `Queue a ${BUILDINGS[d.arg].name.toLowerCase()} at one of your colonies (${BUILDINGS[d.arg].text})` },
  contact: { title: () => "Make contact with another power", need: 1, turns: 12, reward: 30, how: "Explore until your ships or borders meet a rival's." },
  growth: { title: (d) => `Grow your population by ${d.need}`, need: 3, turns: 10, reward: 35, how: "Colonies grow by themselves; more colonies and good worlds grow faster." },
  trade: { title: () => "Sign a trade treaty", need: 1, turns: 12, reward: 35, how: "Propose trade to a power you've met (the Diplomacy tab). They'll agree once they like you well enough." },
  treasury: { title: (d) => `Add ${d.need} credits to the treasury`, need: 120, turns: 10, reward: 30, how: "Spend less than you earn: exchanges, trade treaties and rich worlds fill the treasury." },
  fleet: { title: (d) => `Raise your fleet's strength by ${d.need}`, need: 12, turns: 10, reward: 35, how: "Build warships (frigates and better) and research better hulls and weapons." },
  conquest: { title: () => "Take a world from a rival", need: 1, turns: 15, reward: 60, how: "At war, clear a rival world's orbit of defenders, then land troop transports on it." },
  // Kinds that come into the council's book with the campaigns (see CAMPAIGNS).
  fortify: { title: () => "Fortify a world with an orbital battery", need: 1, turns: 10, reward: 35, how: "Queue an Orbital battery at one of your colonies (Planetary defense)." },
  exotics: { title: (d) => `Stockpile ${d.need} more exotics`, need: 4, turns: 12, reward: 35, how: "Claim systems with exotics deposits (outposts will do) and build refineries; don't spend them meanwhile." },
  ruins: { title: () => "Survey a ruin of the old empires", need: 1, turns: 12, reward: 35, how: "Send any ship to a system marked ? on the map: arriving surveys its ruins." },
  victories: { title: (d) => `Win ${d.need} battle${d.need === 1 ? "" : "s"}`, need: 2, turns: 14, reward: 45, how: "At war, fight where you outnumber them: a battle is won when they lose more ships than you do." },
  border: { title: (d) => `Claim ${d.need} systems on the border`, need: 2, turns: 14, reward: 45, how: "Found colonies or outposts within 5 hexes of the rival's worlds, before they fill the space between you." },
  // A field test for the research arm: carried out, it leaves a prototype, a unique upgrade.
  prototype: { title: (d) => `Field-test the ${PROTOTYPES[d.arg].name.toLowerCase()}`, need: 1, turns: 12, reward: 20, how: (d) => `${testHow(d)} The prototype stays with you: ${PROTOTYPES[d.arg].text}` },
  // A campaign's last directive: a lead over the campaign's rival (see CAMPAIGNS).
  finale: { title: (d) => campaignDef(d.arg).finaleTitle, need: 2, turns: 20, reward: 120, how: (d) => campaignDef(d.arg).finaleHow },
};
/** The field test a prototype asks for, in the same words as that kind of directive. */
const testHow = (d) => { const [k] = PROTOTYPES[d.arg].test; const h = KINDS[k].how; return typeof h === "function" ? h(d) : h; };

// ---------- campaigns ----------
// Three in a row, each a race against one rival (the nearest, when it begins): directives marked with the campaign's
// name turn up its threads; enough threads and the finale is issued, a lead over the rival to win. Every few turns the
// rival gains ground on its own. Each campaign brings new kinds of directives into the council's book for good.
export const CAMPAIGNS = [
  { id: "frontier", title: "The Open Frontier", finaleAt: 3, kinds: ["colony", "outpost", "explore", "growth"], unlock: [], gain: "outpost",
    premise: "Between your worlds and {rival}'s lies open space: unclaimed systems, empty worlds, corridors nobody holds. Whoever settles it first owns the border for a generation. {authority} wants it to be you.",
    beats: { 0: "{authority} lays the star charts on the table. Between your capital and {rival}'s there are a dozen systems nobody has claimed, and both of you have colony ships in your yards. The race for the frontier has begun.", 2: "Your surveyors report what {rival}'s are doing: outposts on every corridor junction, colony ships following close behind. They mean to fence you in.", finale: "The frontier is nearly full. One more push, and the border between you and {rival} will be drawn where your colonies stand." },
    finaleTitle: "Lead the frontier: hold 2 more worlds than your rival", finaleHow: "Have 2 more colonies and outposts than the campaign's rival. Settle, claim, or take theirs.",
    gainText: "{rival} has claimed another system on the frontier: a free outpost ship leaves their capital." },
  { id: "arms", title: "The Arms Race", finaleAt: 3, kinds: ["fleet", "ships", "fortify", "victories"], unlock: ["fortify", "victories", "exotics"], gain: "frigate",
    premise: "{rival} is arming. Their yards work through the night, and their fleets drill on your border. {authority} will not be outgunned: build, fortify, and be ready.",
    beats: { 0: "The intelligence is unmistakable: {rival}'s yards have doubled their output. {authority} orders the same of yours.", 2: "Your fleets shadow theirs along the border. Neither side has fired. Both are counting.", finale: "It comes down to strength. Whoever has the bigger fleet when the counting stops will have the other's respect, or their worlds." },
    finaleTitle: "Out-arm your rival: a fleet 10 stronger than theirs", finaleHow: "Raise your fleet strength 10 above the campaign rival's: build warships, research hulls and weapons, or sink theirs.",
    gainText: "{rival}'s yards launch another frigate." },
  { id: "secrets", title: "The Old Empires' Secrets", finaleAt: 3, kinds: ["ruins", "research", "exotics", "border"], unlock: ["ruins", "border"], gain: "science",
    premise: "The old empires that broke along the corridors left ruins, and in the ruins, knowledge. {rival} has begun digging. {authority} wants what they find found first.",
    beats: { 0: "A survey team brings back a fragment from a ruin: a map of the corridors as they were before the Fracture. {rival} has one too.", 2: "Your scientists and {rival}'s are reading the same ruins. Whoever reads them faster will understand the corridors first.", finale: "The secrets are nearly read. The power that knows more will shape what the corridors become." },
    finaleTitle: "Out-research your rival: 2 more technologies than theirs", finaleHow: "Know 2 more technologies than the campaign rival: research, and survey ruins for the head start they give.",
    gainText: "{rival}'s scholars decode another ruin: +80 research for them." },
];
export const campaignDef = (id) => CAMPAIGNS.find((c) => c.id === id) || CAMPAIGNS[0];
export const campaignOf = (s) => ensureDirectives(s).campaign || null;
const ctext = (s, C, t) => t.replace(/\{rival\}/g, faction(s, C.rival) && player(s).met[C.rival] ? faction(s, C.rival).name : "your nearest rival").replace(/\{authority\}/g, cap(authorityOf(s).name));
export const campaignText = (s, t) => { const C = campaignOf(s); return C ? ctext(s, C, t) : t; };
/** Start the next campaign (or the first): against the nearest rival, with its kinds of directives unlocked. */
function startCampaign(s, i) {
  const D = s.directives, def = CAMPAIGNS[i]; if (!def) return;
  const rival = pickRival(s); if (!rival) return;
  D.campaign = { i, id: def.id, rival, threads: [], gains: 0, finale: false, over: null, started: s.turn, nextGain: s.turn + 8 };
  for (const k of def.unlock) if (!D.unlocked.includes(k)) D.unlocked.push(k);
  story(s, `${def.title}`, ctext(s, D.campaign, def.premise + "\n\n" + def.beats[0]) + (def.unlock.length ? `\n\nNew kinds of directives from ${authorityOf(s).name}: ${def.unlock.map((k) => KINDS[k].title({ need: KINDS[k].need, arg: null }).replace(/ 1 /, " a ")).join("; ")}.` : ""));
}
function story(s, title, text) { s.directives.reports.push({ result: "story", title, text, turn: s.turn }); log(s, player(s).id, `${title}: ${text}`, "contact"); }
function campaignTick(s) {
  const D = s.directives;
  if (!D.campaign) { if (s.turn >= 8) startCampaign(s, 0); return; }
  const C = D.campaign, def = campaignDef(C.id);
  if (C.over) { if (C.endedAt == null) C.endedAt = s.turn; if (s.turn >= C.endedAt + 5 && CAMPAIGNS[C.i + 1]) { D.past.push({ id: C.id, over: C.over, threads: C.threads.length }); startCampaign(s, C.i + 1); } return; }
  const R = faction(s, C.rival);
  if (!R || !R.alive) { C.over = "won"; story(s, `${def.title}: over`, ctext(s, C, "{rival} has fallen, and the campaign with them.")); return; }
  // The rival gains ground on its own.
  if (!C.finale && s.turn >= C.nextGain) {
    C.nextGain = s.turn + 8; C.gains++;
    const home = s.systems[R.capital];
    if (home) { if (def.gain === "outpost") spawnFleet(s, R.id, home.at, ["outpost"]); else if (def.gain === "frigate") spawnFleet(s, R.id, home.at, ["frigate"]); else R.research.progress += 80; }
    log(s, player(s).id, `${def.title}: ${ctext(s, C, def.gainText)}`, "turn");
    if (C.gains > def.finaleAt) issueFinale(s);
  }
}
function issueFinale(s) {
  const D = s.directives, C = D.campaign; if (!C || C.finale) return;
  C.finale = true;
  const def = campaignDef(C.id);
  story(s, `${def.title}: the finale`, ctext(s, C, def.beats.finale));
  const d = { id: "d" + D.next++, kind: "finale", arg: C.id, need: 2, received: s.turn, campaign: C.id, from: authorityOf(s).name };
  if (C.id === "arms") d.need = 10;
  d.title = KINDS.finale.title(d);
  start(s, d, `${def.title}, the finale`);
}
/** Who gives the directives, and what each faction's authority asks for (its kinds, weighted by repetition). */
export const AUTHORITY = {
  concord: { name: "the Concord Assembly", kinds: ["colony", "colony", "outpost", "explore", "growth", "contact", "building"] },
  tessan: { name: "the Dynastic Exchange", kinds: ["treasury", "treasury", "trade", "building", "outpost", "research"] },
  kel: { name: "the Hive Overmind", kinds: ["growth", "growth", "colony", "building", "ships", "outpost"] },
  hegemony: { name: "Legion Command", kinds: ["fleet", "fleet", "ships", "conquest", "outpost", "research"] },
  vael: { name: "the Flotilla Choir", kinds: ["explore", "explore", "contact", "ships", "research", "outpost"] },
};
export const authorityOf = (s) => AUTHORITY[player(s).id] || { name: "your council", kinds: Object.keys(KINDS) };
/** How far along a faction (the player, unless named) is on a directive's measure, right now. */
function measure(s, d, fid) {
  const F = fid ? faction(s, fid) : player(s), cols = coloniesOf(s, F.id);
  // The other side of the race: the rival measures against the player, and the player against the rival.
  const other = F.id === player(s).id ? (d.rival && faction(s, d.rival)) : player(s);
  switch (d.kind) {
    case "fortify": return cols.filter((x) => x.colony.buildings && x.colony.buildings.battery).length;
    case "exotics": return F.exotics;
    case "ruins": return F.stats.ruins || 0;
    case "victories": return F.stats.won || 0;
    case "border": { const theirs = other ? coloniesOf(s, other.id) : []; return cols.filter((x) => theirs.some((y) => distance(x.at, y.at) <= 5)).length; }
    case "prototype": return measure(s, { ...d, kind: PROTOTYPES[d.arg].test[0] }, fid);
    case "finale": {
      if (!other) return 0;
      if (d.arg === "frontier") return coloniesOf(s, F.id).length - coloniesOf(s, other.id).length;
      if (d.arg === "arms") return militaryPower(s, F.id) - militaryPower(s, other.id);
      return F.research.done.length - other.research.done.length;
    }
    case "colony": return cols.filter((x) => x.colony.kind === "colony").length;
    case "outpost": return cols.filter((x) => x.colony.kind === "outpost").length;
    case "explore": return Object.keys(F.explored).filter((k) => s.sysAt[k]).length;
    case "ships": return F.stats.built;
    case "research": return F.research.done.includes(d.arg) ? 1 : 0;
    case "building": return cols.filter((x) => x.colony.buildings && x.colony.buildings[d.arg]).length;
    case "contact": return Object.keys(F.met).filter((k) => F.met[k]).length;
    case "growth": return cols.reduce((t, x) => t + (x.colony.pop || 0), 0);
    case "trade": return Object.values(F.relations).filter((r) => r.treaty).length;
    case "treasury": return Math.floor(F.credits);
    case "fleet": return militaryPower(s, F.id);
    case "conquest": return F.stats.taken || 0;
  }
  return 0;
}
export const progress = (s, d) => Math.max(0, Math.min(d.need, measure(s, d) - d.base));
// ---------- opposition ----------
// Every directive is a race: a rival power (the nearest to your capital) is after the same thing, measured the same way
// from the same turn. They need a little more than you do; if they get there first, the directive is lost.
const rivalNeed = (d) => (d.kind === "finale" ? d.need : d.kind === "research" ? 1 : d.need === 1 ? 2 : Math.ceil(d.need * 1.5));
export function opposition(s, d) {
  if (!d.rival) return null;
  const R = faction(s, d.rival); if (!R) return null;
  const p = R.alive ? Math.max(0, Math.min(d.rivalNeed, measure(s, d, R.id) - d.rivalBase)) : 0;
  return { id: R.id, name: player(s).met[R.id] ? R.name : "An unmet rival", known: !!player(s).met[R.id], alive: R.alive, progress: p, need: d.rivalNeed,
    why: OPP_WHY[d.kind] || "They want the same thing, and they're working at it." };
}
const OPP_WHY = {
  colony: "They're settling the same frontier: every good world they take is one you can't.",
  outpost: "They're claiming the same empty systems.", explore: "Their scouts are charting the same space.",
  ships: "They're building up their own yards.", research: "Their scientists are chasing the same breakthrough.",
  building: "They're building up their own worlds.", contact: "They're reaching out to the same powers.",
  growth: "Their worlds are growing too.", trade: "They're courting the same trading partners.",
  treasury: "Their treasury is growing too, and markets follow the richer power.", fleet: "They're arming as fast as you are.",
  conquest: "They're on the march as well.",
  fortify: "They're fortifying their own worlds.", exotics: "They're hoarding exotics too.", ruins: "Their survey ships are after the same ruins.",
  victories: "They're spoiling for a fight as well.", border: "They're claiming the same border space.", prototype: "Their engineers are testing prototypes of their own.",
  finale: "It's a straight race: their lead over you, against yours over them.",
};
function pickRival(s) {
  const F = player(s), home = s.systems[F.capital];
  const rivals = s.factions.filter((x) => x.id !== F.id && x.alive).map((x) => ({ x, d: home && s.systems[x.capital] ? distance(home.at, s.systems[x.capital].at) : 99 }));
  rivals.sort((a, b) => a.d - b.d);
  return rivals[0] && rivals[0].x.id;
}
export const kindOf = (d) => KINDS[d.kind];
export const howText = (d) => { const h = KINDS[d.kind].how; return typeof h === "function" ? h(d) : h; };

export function ensureDirectives(s) {
  if (s.directives) { const D = s.directives; D.unlocked = D.unlocked || []; D.past = D.past || []; D.protosOffered = D.protosOffered || []; return D; }
  s.directives = { active: [], backlog: [], history: [], reports: [], next: 1, unlocked: [], past: [], protosOffered: [] };
  for (let i = 0; i < 3; i++) issue(s);
  return s.directives;
}
/** A new directive from the council: under way at once if there's room, otherwise to the backlog. */
export function issue(s) {
  const D = s.directives, F = player(s), cols = coloniesOf(s, F.id), all = D.active.concat(D.backlog), A = authorityOf(s);
  D.unlocked = D.unlocked || []; D.protosOffered = D.protosOffered || [];
  const taken = (k) => all.some((d) => d.kind === k);
  // A field test from the research arm, now and then: each prototype once, one at a time.
  const freshProto = Object.keys(PROTOTYPES).find((p) => !D.protosOffered.includes(p) && !(F.protos || {})[p]);
  if (freshProto && !taken("prototype") && (s.turn + D.next) % 3 === 0) {
    D.protosOffered.push(freshProto);
    return place(s, { id: "d" + D.next++, kind: "prototype", arg: freshProto, need: PROTOTYPES[freshProto].test[1], received: s.turn }, `${A.name}'s research arm`);
  }
  const C = D.campaign, def = C && !C.over && !C.finale ? campaignDef(C.id) : null;
  const met = s.factions.filter((x) => x.id !== F.id && x.alive && F.met[x.id]);
  const opts = [];
  const fits = (k) => {
    if (k === "fortify") return has(s, F.id, "batteries");
    if (k === "ruins") return Object.values(s.systems).some((x) => x.ruins);
    if (k === "victories") return s.factions.some((x) => x.id !== F.id && x.alive && F.relations[x.id] && F.relations[x.id].status === "war");
    if (k === "border" || k === "exotics") return true;
    return null;
  };
  // While a campaign runs, its kinds come first, more often than not.
  const pool = def && (s.turn + D.next) % 5 < 3 ? def.kinds.concat(A.kinds) : A.kinds.concat(D.unlocked);
  for (const k of [...new Set(pool)]) {
    if (taken(k)) continue;
    const f = fits(k); if (f === false) continue; if (f === true) { opts.push([k]); continue; }
    if (k === "research") { const techs = availableTechs(s, F.id).filter((t) => t.id !== "engine"); if (techs.length) opts.push([k, techs[(s.turn + D.next) % techs.length].id]); continue; }
    if (k === "building") { const prefer = F.id === "tessan" ? ["market", "factory", "lab"] : F.id === "kel" ? ["factory", "lab", "market"] : ["lab", "factory", "market"];
      const b = prefer.find((x) => cols.some((c) => c.colony.kind === "colony" && !c.colony.buildings[x])); if (b) opts.push([k, b]); continue; }
    if (k === "contact" && !s.factions.some((x) => x.id !== F.id && x.alive && !F.met[x.id])) continue;
    if (k === "trade" && !met.some((x) => !F.relations[x.id].treaty && F.relations[x.id].status !== "war")) continue;
    if (k === "conquest" && !met.length) continue;
    opts.push([k]);
  }
  if (!opts.length) for (const k of ["outpost", "explore", "ships"]) if (!taken(k)) opts.push([k]);
  if (!opts.length) return null;
  const [kind, arg] = opts[(s.turn * 7 + D.next * 3) % opts.length];
  const d = { id: "d" + D.next++, kind, arg, need: KINDS[kind].need, received: s.turn };
  if (def && def.kinds.includes(kind)) d.campaign = C.id;
  return place(s, d, A.name);
}
function place(s, d, from) {
  const D = s.directives, F = player(s);
  d.title = KINDS[d.kind].title(d); d.from = from;
  if (D.active.length < ACTIVE_MAX) start(s, d, `New directive from ${from}`);
  else { D.backlog.push(d); log(s, F.id, `New directive from ${from}, to the backlog: ${d.title}. It waits until a directive under way is finished, or until you take it on (the Mission tab).`, "turn"); }
  return d;
}
function start(s, d, why) {
  const D = s.directives;
  d.issued = s.turn;
  // A campaign's directives race the campaign's rival; the others, the nearest.
  const C = D.campaign; d.rival = (d.campaign && C && C.rival) || pickRival(s);
  d.base = d.kind === "finale" ? 0 : measure(s, d);
  if (d.rival) { d.rivalBase = d.kind === "finale" ? 0 : measure(s, d, d.rival); d.rivalNeed = rivalNeed(d); } d.deadline = s.turn + KINDS[d.kind].turns; d.reward = KINDS[d.kind].reward;
  D.active.push(d);
  log(s, player(s).id, `${why}: ${d.title}, by turn ${d.deadline}, for ${d.reward} credits.`, "turn");
}
/** Take a directive on now, from the backlog. */
export function acceptDirective(s, id) {
  const D = ensureDirectives(s), i = D.backlog.findIndex((d) => d.id === id);
  if (i < 0) return { error: "No such directive in the backlog." };
  const [d] = D.backlog.splice(i, 1); start(s, d, "Directive taken on from the backlog");
  return { ok: true };
}
function fill(s) {
  const D = s.directives, moved = [];
  while (D.backlog.length && D.active.length < ACTIVE_MAX) { const d = D.backlog.shift(); start(s, d, "Directive from the backlog"); moved.push(d.title); }
  return moved;
}
/** Anything finished? A Mission Success report for each, and the backlog moves up. Call after anything the player does. */
export function checkDirectives(s) {
  const D = ensureDirectives(s), F = player(s);
  for (const d of [...D.active]) {
    if (progress(s, d) < d.need) continue;
    D.active = D.active.filter((x) => x !== d);
    F.credits += d.reward;
    D.history.push({ title: d.title, result: "done", turn: s.turn });
    log(s, F.id, `Mission success: ${d.title}. ${cap(d.from || authorityOf(s).name)} pays ${d.reward} credits.`, "victory");
    const op = opposition(s, d);
    const rep = { result: "done", title: d.title, from: d.from || authorityOf(s).name, kind: d.kind, how: howText(d), need: d.need, turns: Math.max(1, s.turn - d.issued + 1), turn: s.turn, rewards: [`+${d.reward} credits`],
      beat: op ? `${op.name} had ${op.progress} of the ${op.need} they needed.` : null };
    if (d.kind === "prototype") { F.protos = F.protos || {}; F.protos[d.arg] = true; rep.rewards.push(`The ${PROTOTYPES[d.arg].name.toLowerCase()} stays with you: ${PROTOTYPES[d.arg].text}`); log(s, F.id, `Prototype fitted: ${PROTOTYPES[d.arg].name}. ${PROTOTYPES[d.arg].text}`, "research"); }
    D.reports.push(rep);
    campaignDone(s, d, rep);
    const next = fill(s); if (next.length) rep.next = next;
  }
}
/** End of turn: check, then the opposition, then deadlines, then the council's next directive. */
export function directivesTurn(s) {
  const D = ensureDirectives(s), F = player(s);
  checkDirectives(s);
  for (const d of [...D.active]) {
    const op = opposition(s, d);
    if (!op || !op.alive || op.progress < op.need) continue;
    D.active = D.active.filter((x) => x !== d);
    D.history.push({ title: d.title, result: "beaten", turn: s.turn, by: op.name });
    if (d.kind === "finale" && D.campaign) { D.campaign.over = "lost"; story(s, `${campaignDef(d.arg).title}: lost`, ctext(s, D.campaign, "{rival} got there first. The campaign is theirs; {authority} will not forget it.")); }
    log(s, F.id, `Directive lost: ${op.name} got there first (${d.title}). ${cap(d.from || authorityOf(s).name)} takes note.`, "turn");
    D.reports.push({ result: "beaten", title: d.title, from: d.from || authorityOf(s).name, turn: s.turn, turns: Math.max(1, s.turn - d.issued + 1), by: op.name, progress: progress(s, d), need: d.need, rivalNeed: op.need, rewards: [] });
    const next = fill(s); if (next.length) D.reports[D.reports.length - 1].next = next;
  }
  for (const d of [...D.active]) if (s.turn > d.deadline) {
    D.active = D.active.filter((x) => x !== d);
    D.history.push({ title: d.title, result: "failed", turn: s.turn });
    log(s, F.id, `Directive not carried out by turn ${d.deadline}: ${d.title}. ${cap(d.from || authorityOf(s).name)} takes note.`, "turn");
    if (d.kind === "finale" && D.campaign) { D.campaign.over = "lost"; story(s, `${campaignDef(d.arg).title}: lost`, ctext(s, D.campaign, "The deadline passed with {rival} still ahead. The campaign is theirs.")); }
    fill(s);
  }
  campaignTick(s);
  if (s.turn % EVERY === 0 && D.backlog.length < BACKLOG_MAX) issue(s);
  fill(s);
}
/** A campaign directive carried out turns up a thread; the finale won ends the campaign. */
function campaignDone(s, d, rep) {
  const D = s.directives, C = D.campaign; if (!C || C.over || d.campaign !== C.id) return;
  const def = campaignDef(C.id);
  if (d.kind === "finale") {
    C.over = "won"; F_bonus(s, rep);
    story(s, `${def.title}: won`, ctext(s, C, "You got there first, and {rival} knows it. {authority} has a new name for this campaign in the histories: yours."));
    return;
  }
  C.threads.push({ title: d.title, turn: s.turn });
  rep.thread = `${def.title}: ${C.threads.length} of ${def.finaleAt}.`;
  C.nextGain += 2;   // every thread sets the rival back two turns
  if (C.threads.length === 2) story(s, `${def.title}`, ctext(s, C, def.beats[2]));
  if (C.threads.length >= def.finaleAt) issueFinale(s);
}
/** The finale's reward: credits (paid with the directive) and a prototype, if one is left to give. */
function F_bonus(s, rep) {
  const F = player(s), p = Object.keys(PROTOTYPES).find((x) => !(F.protos || {})[x]);
  if (!p) return;
  F.protos = F.protos || {}; F.protos[p] = true;
  rep.rewards.push(`And a prototype, for winning the campaign: the ${PROTOTYPES[p].name.toLowerCase()} (${PROTOTYPES[p].text})`);
}

const cap = (t) => t[0].toUpperCase() + t.slice(1);
