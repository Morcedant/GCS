// Envoys: the rivals speak. Each people has a leader and a personality (data.js PERSONALITIES), and now and then sends
// the player a message in its own voice: a greeting at first contact, a demand for tribute, a warning to move a fleet,
// an offer of alliance, a call to join a war, a gift, a declaration of war, or (for an ally) a call to arms. Most ask for
// an answer, and every answer is remembered (game.js remember()): it moves their standing with you, and the Diplomacy
// tab lists what they remember.
import { PERSONALITIES, TECHS } from "./data.js";
import { player, faction, coloniesOf, fleetsOf, armed, atWar, allied, militaryPower, declareWar, remember, log, rng, admiralsOf, admTitle, setDestination } from "./game.js";
import { distance } from "./hex.js";

const enMe = (s) => player(s);
const enP = (fid) => PERSONALITIES[fid] || PERSONALITIES.concord;
const enRivals = (s) => s.factions.filter((f) => f.id !== enMe(s).id && f.alive && enMe(s).met[f.id]);
const enScore = (s, fid) => faction(s, fid).relations[enMe(s).id].score;
/** Their best admiral, by wins, for a war message. */
const enAdmiral = (s, fid) => { const a = admiralsOf(s, fid).sort((x, y) => y.a.wins - x.a.wins)[0]; return a ? admTitle(a.a) : "our fleet"; };
/** A name inside a sentence ("the Concord"), and every sentence starting with a capital. */
const enIn = (n) => n.replace(/^The /, "the ");
const enCap = (t) => t.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
const enFill = (s, fid, kind, ctx) => enCap(enP(fid).voice[kind].replace(/\{you\}/g, enIn(enMe(s).name)).replace(/\{them\}/g, ctx.them ? enIn(faction(s, ctx.them).name) : "")
  .replace(/\{world\}/g, ctx.world ? s.systems[ctx.world].name : "").replace(/\{n\}/g, ctx.n || "").replace(/\{admiral\}/g, enAdmiral(s, fid)));
const ATTITUDES = [[25, "friendly"], [8, "cordial"], [-8, "neutral"], [-25, "wary"], [-99, "hostile"]];
/** One word for how a rival feels about you. */
export function attitude(s, fid) { const r = faction(s, fid).relations[enMe(s).id]; if (r.allied) return "allied"; return ATTITUDES.find(([n]) => r.score >= n)[1]; }

/** What a message would be about, if this rival sent one now (null: nothing to say). */
const CANDIDATES = {
  demand: (s, F) => {
    const me = enMe(s), n = Math.min(120, Math.round(30 + s.turn * 0.4));
    if (atWar(s, F.id, me.id) || allied(s, F.id, me.id) || me.credits < n || enScore(s, F.id) > 10 || s.turn - (F.lastDemand || -99) < 20) return null;
    return militaryPower(s, F.id) >= militaryPower(s, me.id) * 1.2 || enP(F.id).weights.demand >= 1.4 ? { n } : null;
  },
  warn: (s, F) => {
    if (atWar(s, F.id, enMe(s).id) || allied(s, F.id, enMe(s).id)) return null;
    for (const f of fleetsOf(s, enMe(s).id)) {
      if (!armed(f)) continue;
      const w = coloniesOf(s, F.id).find((x) => distance(x.at, f.at) <= 2);
      if (w && !(s.sysAt[f.at] && s.systems[s.sysAt[f.at]].colony && s.systems[s.sysAt[f.at]].colony.owner === enMe(s).id)) return { world: w.id, fleet: f.id };
    }
    return null;
  },
  alliance: (s, F) => {
    const me = enMe(s), sc = enScore(s, F.id);
    if (atWar(s, F.id, me.id) || allied(s, F.id, me.id) || sc < 18) return null;
    const common = s.factions.some((z) => z.alive && z.id !== me.id && z.id !== F.id && atWar(s, F.id, z.id) && atWar(s, me.id, z.id));
    return common || sc >= 28 || (s.crisis && s.crisis.stage === "awake") ? {} : null;
  },
  joint: (s, F) => {
    const me = enMe(s); if (atWar(s, F.id, me.id) || enScore(s, F.id) < 8) return null;
    const z = s.factions.find((x) => x.alive && x.id !== me.id && x.id !== F.id && me.met[x.id] && atWar(s, F.id, x.id) && !atWar(s, me.id, x.id) && !allied(s, me.id, x.id));
    return z ? { them: z.id } : null;
  },
  gift: (s, F) => (!atWar(s, F.id, enMe(s).id) && enScore(s, F.id) >= 15 ? { what: ["credits", "research", "exotics"][s.turn % 3] } : null),
};

/** Once a turn: now and then (every four turns at most), one rival has something to say. */
export function envoysTurn(s) {
  if (s.winner) return;
  s.inbox = (s.inbox || []).filter((m) => ["hello", "war", "callToArms"].includes(m.kind) || s.turn - m.turn <= 3);
  if (s.turn < 8 || s.turn - (s.lastEnvoy || 0) < 4 || s.inbox.some((m) => CANDIDATES[m.kind])) return;
  const R = rng(s);
  if (R.next() > 0.4) { R.save(); return; }
  const options = [];
  for (const F of enRivals(s)) for (const [kind, can] of Object.entries(CANDIDATES)) {
    const ctx = can(s, F); if (ctx) options.push({ F, kind, ctx, w: enP(F.id).weights[kind] * ((s.envoysSeen || {})[kind] ? 1 / (1 + s.envoysSeen[kind]) : 1.5) });
  }
  if (options.length) {
    let roll = R.next() * options.reduce((t, o) => t + o.w, 0), pick = options[0];
    for (const o of options) { roll -= o.w; if (roll <= 0) { pick = o; break; } }
    (s.inbox = s.inbox || []).push({ kind: pick.kind, from: pick.F.id, ctx: pick.ctx, turn: s.turn });
    if (pick.kind === "demand") pick.F.lastDemand = s.turn;
    s.lastEnvoy = s.turn; s.envoysSeen = s.envoysSeen || {}; s.envoysSeen[pick.kind] = (s.envoysSeen[pick.kind] || 0) + 1;
  }
  R.save();
}

const enResearch = (s, n) => { const me = enMe(s); me.research.progress += n; const cur = TECHS.find((t) => t.id === me.research.current); return `+${n} research${cur ? ` toward ${cur.name}` : ""}`; };
/** The answers to each kind of message: what each does, and what came of it. */
const ANSWERS = {
  hello: [
    { id: "warm", label: "Greet them warmly", does: "+6 standing with them.", apply: (s, F) => { remember(s, F.id, enMe(s).id, "greeted us warmly", 6); return `${enP(F.id).leader} seems pleased. It's a start.`; } },
    { id: "charts", label: "Trade star charts", does: "You learn where their capital is; they learn about you too.", apply: (s, F) => { const cap = s.systems[F.capital]; if (cap) enMe(s).explored[cap.at] = 1; remember(s, F.id, enMe(s).id, "traded star charts with us", 2); return cap ? `Their charts show their capital: ${cap.name}.` : "Their charts are old and patchy."; } },
    { id: "cold", label: "Keep your distance", does: "Nothing promised, nothing given.", apply: (s, F) => `${enP(F.id).leader} notes your silence.` },
  ],
  demand: [
    { id: "pay", label: "Pay", does: "−{n} credits; +12 standing with them.", apply: (s, F, c) => { enMe(s).credits -= c.n; remember(s, F.id, enMe(s).id, `paid the ${c.n} credits we asked for`, 12); return `You pay ${c.n} credits. ${F.name} are satisfied, for now.`; } },
    { id: "refuse", label: "Refuse", does: "−10 standing; if they're much stronger and quick to anger, it may mean war.", apply: (s, F, c, R) => {
      remember(s, F.id, enMe(s).id, "refused our demand", -10);
      const angry = enP(F.id).weights.demand >= 1.4 && militaryPower(s, F.id) >= militaryPower(s, enMe(s).id) * 1.3 && R.next() < 0.5;
      if (angry) { declareWar(s, F.id, enMe(s).id); s.inbox = s.inbox.filter((m) => !(m.kind === "war" && m.from === F.id)); return `${F.name} don't take refusal well. They've declared war.`; }
      return `${F.name} won't forget it.`;
    } },
  ],
  warn: [
    { id: "withdraw", label: "Withdraw the fleet", does: "Your fleet heads for your nearest world; +6 standing.", apply: (s, F, c) => {
      const f = s.fleets[c.fleet], home = f && coloniesOf(s, enMe(s).id).sort((a, b) => distance(a.at, f.at) - distance(b.at, f.at))[0];
      if (f && home) setDestination(s, f.id, home.at);
      remember(s, F.id, enMe(s).id, "withdrew a fleet when we asked", 6); return home ? `Your fleet turns for ${home.name}.` : "You agree, though there's nowhere to send it.";
    } },
    { id: "stay", label: "Stay where you are", does: "−12 standing; the proud and the strong may take it as a challenge.", apply: (s, F, c, R) => {
      remember(s, F.id, enMe(s).id, "ignored our warning", -12);
      if (["hegemony", "kel"].includes(F.id) && militaryPower(s, F.id) >= militaryPower(s, enMe(s).id) && R.next() < 0.3) { declareWar(s, F.id, enMe(s).id); s.inbox = s.inbox.filter((m) => !(m.kind === "war" && m.from === F.id)); return `${F.name} take it as a challenge: they've declared war.`; }
      return `${F.name} watch your fleet, and remember.`;
    } },
  ],
  alliance: [
    { id: "accept", label: "Accept the alliance", does: "If either of you is attacked, the other joins the war; you see what their worlds see.", apply: (s, F) => { enMe(s).relations[F.id].allied = F.relations[enMe(s).id].allied = true; remember(s, F.id, enMe(s).id, "became our ally", 8); log(s, enMe(s).id, `${enMe(s).name} and ${F.name} are allies now.`, "diplo"); return `It's done: ${F.name} are your allies. Attack one of you and you attack both.`; } },
    { id: "decline", label: "Decline, politely", does: "−3 standing.", apply: (s, F) => { remember(s, F.id, enMe(s).id, "turned down our alliance", -3); return `${F.name} accept your answer, a little coolly.`; } },
  ],
  joint: [
    { id: "join", label: "Declare war on them too", does: "War with {them}; +15 standing with these.", apply: (s, F, c) => { declareWar(s, enMe(s).id, c.them); remember(s, F.id, enMe(s).id, `joined our war against ${faction(s, c.them).name}`, 15); return `You're at war with ${faction(s, c.them).name}, beside ${F.name}.`; } },
    { id: "decline", label: "Stay out of it", does: "−4 standing.", apply: (s, F, c) => { remember(s, F.id, enMe(s).id, `stayed out of our war with ${faction(s, c.them).name}`, -4); return "You keep out of their war."; } },
  ],
  gift: [
    { id: "thanks", label: "Thank them", does: "Accept the gift; +3 standing.", apply: (s, F, c) => {
      remember(s, F.id, enMe(s).id, "thanked us for a gift", 3);
      if (c.what === "credits") { enMe(s).credits += 40; return "+40 credits."; }
      if (c.what === "exotics") { enMe(s).exotics += 2; return "+2 exotics."; }
      return `${enResearch(s, 60)}.`;
    } },
  ],
  war: [{ id: "ok", label: "So be it", does: "Their worlds and fleets are fair targets now, and yours are theirs.", apply: (s, F) => `War with ${F.name}. Peace can be proposed from the Diplomacy tab once it has cost them.` }],
  callToArms: [
    { id: "honour", label: "Honour the alliance", does: "War with {enemy}; +15 standing with your ally.", apply: (s, F, c) => { if (!atWar(s, enMe(s).id, c.enemy)) declareWar(s, enMe(s).id, c.enemy, F.id); remember(s, F.id, enMe(s).id, "honoured our alliance", 15); return `You stand by ${F.name}: you're at war with ${faction(s, c.enemy).name}.`; } },
    { id: "abandon", label: "Stay out of it", does: "The alliance ends; −25 standing with them.", apply: (s, F) => { enMe(s).relations[F.id].allied = F.relations[enMe(s).id].allied = false; remember(s, F.id, enMe(s).id, "abandoned us when we were attacked", -25); return `${F.name} will remember that you left them alone.`; } },
  ],
};
const CALL_TO_ARMS = "{them} have attacked us. By our alliance, we call on {you} to stand with us. Will you?";

/** The message waiting for the player: who sends it, what they say, the answers. */
export function currentEnvoy(s) {
  const m = (s.inbox || [])[0]; if (!m) return null;
  const F = faction(s, m.from); if (!F || !F.alive) { s.inbox.shift(); return currentEnvoy(s); }
  const ctx = { ...m.ctx, them: m.ctx.them || m.ctx.enemy };
  const text = m.kind === "callToArms" ? CALL_TO_ARMS.replace("{them}", faction(s, m.ctx.enemy).name).replace("{you}", enMe(s).name)
    : m.kind === "war" && m.ctx.joining ? `${enFill(s, m.from, "war", ctx)} We stand with ${faction(s, m.ctx.joining).name}.` : enFill(s, m.from, m.kind, ctx);
  const fill = (t) => t.replace("{n}", m.ctx.n || "").replace("{them}", ctx.them ? faction(s, ctx.them).name : "").replace("{enemy}", m.ctx.enemy ? faction(s, m.ctx.enemy).name : "");
  return { from: F.id, name: F.name, color: F.color, leader: enCap(enP(F.id).leader), title: enP(F.id).title, kind: m.kind, text, attitude: attitude(s, F.id),
    options: ANSWERS[m.kind].map((o) => ({ id: o.id, label: o.label, does: fill(o.does) })) };
}
/** The player's answer: what it does, and what came of it. */
export function answerEnvoy(s, optId) {
  const m = (s.inbox || [])[0]; if (!m) return { error: "No message is waiting." };
  const o = ANSWERS[m.kind].find((x) => x.id === optId); if (!o) return { error: "No such answer." };
  const F = faction(s, m.from), R = rng(s);
  s.inbox.shift();
  const text = enCap(o.apply(s, F, m.ctx, R)); R.save();
  if (m.kind !== "war") log(s, enMe(s).id, `${enP(F.id).leader} of ${F.name}: you answered "${o.label}". ${text}`, "diplo");
  return { ok: true, name: F.name, choice: o.label, text };
}
