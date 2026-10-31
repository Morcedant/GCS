// Directives: missions for the player from their own faction's authority, of the kinds that faction cares about (the
// Concord's Assembly wants new colonies; the Hegemony's Legion Command wants worlds taken), with a deadline and a reward. Two are under way at a time; the rest
// wait in a backlog, and the oldest moves up when one is finished (its clock starts then). Every directive's progress is
// measured from the moment it starts, so it asks for something new: one more colony, three more systems charted.
import { TECHS, BUILDINGS } from "./data.js";
import { player, faction, coloniesOf, availableTechs, log, militaryPower } from "./game.js";
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
};
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
  switch (d.kind) {
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
const rivalNeed = (d) => (d.kind === "research" ? 1 : d.need === 1 ? 2 : Math.ceil(d.need * 1.5));
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
  if (s.directives) return s.directives;
  s.directives = { active: [], backlog: [], history: [], reports: [], next: 1 };
  for (let i = 0; i < 3; i++) issue(s);
  return s.directives;
}
/** A new directive from the council: under way at once if there's room, otherwise to the backlog. */
export function issue(s) {
  const D = s.directives, F = player(s), cols = coloniesOf(s, F.id), all = D.active.concat(D.backlog), A = authorityOf(s);
  const taken = (k) => all.some((d) => d.kind === k);
  const met = s.factions.filter((x) => x.id !== F.id && x.alive && F.met[x.id]);
  const opts = [];
  for (const k of A.kinds) {
    if (taken(k)) continue;
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
  d.title = KINDS[kind].title(d);
  d.from = A.name;
  if (D.active.length < ACTIVE_MAX) start(s, d, `New directive from ${A.name}`);
  else { D.backlog.push(d); log(s, F.id, `New directive from ${A.name}, to the backlog: ${d.title}. It waits until a directive under way is finished, or until you take it on (the Mission tab).`, "turn"); }
  return d;
}
function start(s, d, why) {
  const D = s.directives;
  d.base = measure(s, d); d.issued = s.turn;
  d.rival = pickRival(s); if (d.rival) { d.rivalBase = measure(s, d, d.rival); d.rivalNeed = rivalNeed(d); } d.deadline = s.turn + KINDS[d.kind].turns; d.reward = KINDS[d.kind].reward;
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
    D.reports.push(rep);
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
    log(s, F.id, `Directive lost: ${op.name} got there first (${d.title}). ${cap(d.from || authorityOf(s).name)} takes note.`, "turn");
    D.reports.push({ result: "beaten", title: d.title, from: d.from || authorityOf(s).name, turn: s.turn, turns: Math.max(1, s.turn - d.issued + 1), by: op.name, progress: progress(s, d), need: d.need, rivalNeed: op.need, rewards: [] });
    const next = fill(s); if (next.length) D.reports[D.reports.length - 1].next = next;
  }
  for (const d of [...D.active]) if (s.turn > d.deadline) {
    D.active = D.active.filter((x) => x !== d);
    D.history.push({ title: d.title, result: "failed", turn: s.turn });
    log(s, F.id, `Directive not carried out by turn ${d.deadline}: ${d.title}. ${cap(d.from || authorityOf(s).name)} takes note.`, "turn");
    fill(s);
  }
  if (s.turn % EVERY === 0 && D.backlog.length < BACKLOG_MAX) issue(s);
  fill(s);
}

const cap = (t) => t[0].toUpperCase() + t.slice(1);
