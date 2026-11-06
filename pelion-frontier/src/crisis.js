// The late-tour crisis: the Sleepers. Somewhere in weeks 32–38 (in open command, once, at the same point), machines
// older than any power in the sector wake in the deepest nebula. Four weeks before, a signal gives warning. Then their
// Ark (it never moves, and mends itself) sends out hunters every four weeks, and the hunters burn the worlds nearest
// them: Federation colonies, independents, Klingon and Tholian outposts alike. They don't answer hails. Destroy the Ark
// and every hunter goes dark. The captain meets them in three scenes with choices: the warning, the waking, the end.
import { distance, hashString } from "./hex.js";
import { ENEMIES } from "./data.js";
import { log, rand, sysAt, spawnEnemy, harmWorld, registerChoices, pushChoice, remember, setCalm, standingOf, addStore, grantSupport, updateVisibility, storyEvent } from "./game.js";

export const SLEEPER = { warning: 4, waveEvery: 4, earliest: 32, spread: 7, awake: 16 };
const crList = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}` : a[0] || "");
const crArk = (S) => Object.values(S.enemies).find((e) => e.type === "ark");
const crHunters = (S) => Object.values(S.enemies).filter((e) => e.type === "sleeper");
const crTargets = (S) => Object.values(S.systems).filter((s) => ["colony", "member", "independent", "klingon", "claimed", "tholian"].includes(s.kind));

/** Where it stands, for the panels: null before the warning. */
export function crisisState(S) {
  const C = S.crisis; if (!C || C.stage === "quiet") return null;
  const a = crArk(S), E = ENEMIES.ark;
  return { stage: C.stage, at: C.at, ark: C.ark, place: C.ark ? (sysAt(S, C.ark) ? `at ${sysAt(S, C.ark).name}` : "in the deep nebula") : null, hull: a ? E.hull - a.hull : 0, max: E.hull, shields: a ? E.shields - a.shields : 0,
    wave: C.wave || 0, next: C.next, hunters: crHunters(S).length, truce: !!C.truce, burned: C.burned || 0, kills: C.kills || 0 };
}

/** Each week, after the powers move: the warning, the waking, the hunters, the burning. */
export function crisisTurn(S) {
  if (S.crisisOff || S.over) return;
  const C = S.crisis || (S.crisis = { stage: "quiet", at: Math.max(S.turn + SLEEPER.warning + 2, SLEEPER.earliest + (hashString("sleepers:" + S.seed) % SLEEPER.spread)) });
  if (C.stage === "quiet") {
    if (S.turn >= C.at - SLEEPER.warning) { C.stage = "stirring"; pushChoice(S, "crisis", "stirring"); log(S, "A signal from the deep nebula: the same pattern, over and over, on every subspace band.", "war"); }
    return;
  }
  if (C.stage === "stirring") { if (S.turn >= C.at) wake(S); return; }
  if (C.stage !== "awake") return;
  const ark = crArk(S);
  if (!ark) { breakArk(S); return; }
  // Sixteen weeks awake, and they sleep again, as the old records say they always have.
  if (S.turn - C.woke >= SLEEPER.awake && !S.battle) {
    C.stage = "over"; C.over = S.turn; C.slept = true;
    for (const e of Object.values(S.enemies)) if (e.power === "sleepers") delete S.enemies[e.id];
    for (const p of ["klingon", "romulan", "tholian"]) if (S.calm && S.calm[p] > S.turn + 3) S.calm[p] = S.turn + 3;
    storyEvent(S, "The Sleepers sleep again", `On the ${SLEEPER.awake}th week, between one sensor sweep and the next, the Ark's heart goes dark. Every hunter stops where it is, and falls silent. The old records said they always sleep again. They didn't say for how long. ${C.burned || 0} world${C.burned === 1 ? "" : "s"} burned before they did.`);
    return;
  }
  // The Ark mends: a box of shields a week, and a box of hull every other week.
  if (ark.shields > 0) ark.shields--; else if (ark.hull > 0 && S.turn % 2 === 0) ark.hull--;
  if (S.turn >= C.next) sendWave(S);
  // With a truce, the other powers fight them too.
  if (C.truce) for (const h of crHunters(S)) if (!(S.battle && S.battle.enemy === h.id) && rand(S) < 0.15) {
    delete S.enemies[h.id]; const s = sysAt(S, h.at);
    log(S, `${["Klingon battle cruisers", "A Romulan bird-of-prey, decloaking", "Tholian vessels"][Math.floor(rand(S) * 3)]} destroy a Sleeper hunter ${s ? `over ${s.name}` : "in deep space"}. The truce holds.`, "good");
  }
  S.seenSys = S.seenSys || {};
}

function wake(S) {
  const C = S.crisis;
  // The Ark wakes in a nebula, as far from every world as it can be (in space, if there's no nebula).
  const worlds = Object.values(S.systems);
  const far = (k) => Math.min(99, ...worlds.map((s) => distance(s.at, k)));
  const free = Object.keys(S.hexes).filter((k) => !S.sysAt[k] && !Object.values(S.enemies).some((e) => e.at === k) && k !== S.pelion.at);
  const neb = free.filter((k) => S.hexes[k].terrain === "nebula");
  C.ark = (neb.length ? neb : free).sort((a, b) => far(b) - far(a) || (a < b ? -1 : 1))[0];
  spawnEnemy(S, "ark", C.ark, { goal: "ark", hostile: true, found: true, revealed: true, seen: true });
  const a = crArk(S); if (C.studied && a) a.hull = 5;   // studied: it wakes with five hull boxes already broken
  C.stage = "awake"; C.woke = S.turn; C.wave = 0; C.next = S.turn;
  sendWave(S);
  log(S, `The Sleepers have woken in the deep nebula. Their Ark sends out its first hunters.`, "war");
  pushChoice(S, "crisis", "waking");
}

function sendWave(S) {
  const C = S.crisis; C.wave++; C.next = S.turn + SLEEPER.waveEvery;
  const n = Math.min(3, 1 + Math.floor(C.wave / 2)), taken = new Set(crHunters(S).map((h) => h.target));
  const list = crTargets(S).filter((s) => !taken.has(s.at)).sort((a, b) => distance(a.at, C.ark) - distance(b.at, C.ark));
  const names = [];
  for (let i = 0; i < n && list[i]; i++) { spawnEnemy(S, "sleeper", C.ark, { goal: "sleeper", target: list[i].at, hostile: true, home: C.ark, seen: true, revealed: true }); names.push(list[i].name); }
  if (names.length) log(S, `Wave ${C.wave}: ${names.length} Sleeper hunter${names.length === 1 ? "" : "s"} leave the Ark, bound for ${names.join(", ")}.`, "war");
}

/** A hunter at its target: it burns the world, and goes on to the next. (ai.js calls this.) */
export function sleeperStrike(S, e, s) {
  const C = S.crisis || {};
  if (s) {
    if (["colony", "member", "independent"].includes(s.kind)) { harmWorld(S, s, 1, "a Sleeper hunter burned its cities from orbit", true); if (s.kind === "lost") C.burned = (C.burned || 0) + 1; }
    else if (["klingon", "claimed", "tholian"].includes(s.kind)) {
      s.harm = (s.harm || 0) + 1;
      const who = s.kind === "tholian" ? "Tholian" : "Klingon";
      if (s.harm >= 3) { log(S, `The ${who} ${s.kind === "claimed" ? "world" : "outpost"} at ${s.name} is burned out by the Sleepers. Nothing is left there.`, "war"); s.was = s.kind; s.kind = "empty"; s.harm = 0; s.surveyed = true; C.burned = (C.burned || 0) + 1; }
      else log(S, `A Sleeper hunter strikes the ${who} ${s.kind === "claimed" ? "world" : "outpost"} at ${s.name} (damage ${s.harm}/3).`, "war");
    }
  }
  // On to the nearest world no other hunter is bound for.
  const taken = new Set(crHunters(S).filter((h) => h.id !== e.id).map((h) => h.target));
  const next = crTargets(S).filter((x) => x.at !== e.at && !taken.has(x.at)).sort((a, b) => distance(a.at, e.at) - distance(b.at, e.at))[0];
  if (next && (!s || ["empty", "lost"].includes(s.kind) || (s.harm || 0) === 0 || rand(S) < 0.5)) e.target = next.at;
}

/** The Ark destroyed (combat.js): every hunter goes dark. */
export function breakArk(S, byPelion) {
  const C = S.crisis; if (!C || C.stage !== "awake") return;
  C.stage = "over"; C.over = S.turn; C.byPelion = !!byPelion;
  const n = crHunters(S).length; for (const h of crHunters(S)) delete S.enemies[h.id];
  for (const p of ["klingon", "romulan", "tholian"]) if (S.calm && S.calm[p] > S.turn + 3) S.calm[p] = S.turn + 3;   // the truce winds down
  if (byPelion) { S.commendations += 8; S.science += 10; }
  log(S, `The Sleeper Ark is destroyed${byPelion ? " by the Pelion" : ""}. ${n ? `The ${n} hunter${n === 1 ? "" : "s"} still out there went dark at once.` : "Every hunter went dark."}${byPelion ? " +8 commendations, +10 science." : ""}`, "victory");
  pushChoice(S, "crisis", "broken");
}
/** A hunter destroyed by the Pelion (combat.js). */
export function sleeperKilled(S) { const C = S.crisis || {}; C.kills = (C.kills || 0) + 1; S.commendations += C.glory ? 4 : 2; return C.glory ? 4 : 2; }

const SCENES = {
  stirring: {
    title: "A signal in the nebula",
    text: () => "Every listening post in the sector reports it in the same hour: a signal from the deep nebula, one pattern repeated on every subspace band, growing stronger. Sevek finds it in the Federation's oldest records, in a file marked as legend: the Sleepers, machines built by no one anyone remembers, which wake every few thousand years and burn every world they can reach. Then sleep again. In four weeks, perhaps less, they wake. Not only Federation worlds will burn.",
    options: [
      { id: "study", name: "Study the signal", blurb: "+6 science, and the Ark wakes damaged (five hull boxes broken).", apply: (S) => { S.crisis.studied = true; S.science += 6; return "Sevek and Rrinn find the Ark's waking cycle in the noise: it will wake before it's finished. +6 science."; } },
      { id: "warn", name: "Warn the other powers", blurb: "+6 standing with the Klingons, Romulans and Tholians; they'll agree to a truce when the Sleepers wake.", apply: (S) => { S.crisis.warned = true; for (const p of ["klingon", "romulan", "tholian"]) remember(S, p, "warned us the Sleepers were waking", 6); return "The Pelion sends the records to Torgath, to t'Rehu, to the Assembly. None of them answers. All of them listen."; } },
      { id: "fortify", name: "Fortify the colonies", blurb: "Every Federation colony and member world drives off raids twice as often from now on.", apply: (S) => { let n = 0; for (const s of Object.values(S.systems)) if (s.kind === "colony" || s.kind === "member") { s.fortified = true; n++; } return `Starfleet Engineering ships phaser batteries and shield generators to ${n} worlds. They'll be ready.`; } },
    ],
  },
  waking: {
    title: "The Sleepers wake",
    text: (S) => `It comes out of the deep nebula ${sysAt(S, S.crisis.ark) ? `at ${sysAt(S, S.crisis.ark).name}` : "where the signal was"}: the Ark, a cracked octagon kilometres across with something burning at its heart, and its first hunters with it. It doesn't answer hails, in any language. The old records say they burn for a season, about sixteen weeks, and then sleep again. Every ${SLEEPER.waveEvery} weeks it will send more, and they'll burn whatever worlds are nearest, Federation, Klingon, Tholian alike. Destroy the Ark and they go dark.`,
    options: [
      { id: "truce", name: "Call a truce against them", blurb: "While the Ark lives, the Klingons, Romulans and Tholians hold back their raids, strikes and webs, and fight the hunters too. Klingon tension −3. (If you didn't warn them, they may not all agree.)", apply: (S) => {
        const C = S.crisis; C.truce = true; const yes = [], no = [];
        for (const p of ["klingon", "romulan", "tholian"]) {
          const ok = C.warned || standingOf(S, p).score >= -10 && !(p === "klingon" && S.tension >= 8);
          if (ok) { setCalm(S, p, 9999); remember(S, p, "made a truce with us against the Sleepers", 5); yes.push({ klingon: "Torgath", romulan: "t'Rehu", tholian: "the Assembly" }[p]); } else no.push({ klingon: "Torgath", romulan: "t'Rehu", tholian: "the Assembly" }[p]);
        }
        if (!yes.length) C.truce = false;
        S.tension = Math.max(0, S.tension - 3);
        return `${yes.length ? `${crList(yes)} agreed: while the Ark lives, their ships stand with yours.` : "Nobody agreed."}${no.length ? ` ${crList(no)} refused.` : ""} Klingon tension −3.`;
      } },
      { id: "arm", name: "Ask Starfleet for an escort", blurb: "−10 supplies: an escort joins the Pelion's command at Starbase 23 (if Starfleet can spare one).", apply: (S) => { const r = grantSupport(S, "escort"); if (!r) return "Starfleet can't spare another ship."; S.supplies -= 10; return `The ${r} joins the Pelion's command at Starbase 23.`; } },
      { id: "glory", name: "This is the Pelion's fight", blurb: "Nothing changes now, but every hunter the Pelion destroys is worth double the commendations.", apply: (S) => { S.crisis.glory = true; return "The captain tells the crew what's coming, and that the Pelion will meet it. Nobody argues."; } },
    ],
  },
  broken: {
    title: "The Ark is broken",
    text: (S) => `${S.crisis.byPelion ? "The Pelion's last volley breaks it open." : "It breaks."} The Ark hangs dead in the nebula, its heart gone cold, and every hunter it sent out has gone silent where it was. Whatever built the Sleepers, there's a great deal of it left to study, and to salvage.`,
    options: [
      { id: "study", name: "Study the wreck", blurb: "+12 science.", apply: (S) => { S.science += 12; return "Sevek's teams spend a week inside the wreck, and come out with more questions than they took in. +12 science."; } },
      { id: "salvage", name: "Salvage it", blurb: "+4 spares, +3 dilithium, +8 antimatter.", apply: (S) => { addStore(S, "spares", 4); addStore(S, "dilithium", 3); addStore(S, "antimatter", 8); return "Grath's crews strip the Ark's power cores. +4 spares, +3 dilithium, +8 antimatter."; } },
      { id: "memorial", name: "A memorial for every world it burned", blurb: "+6 standing with the Klingons, Romulans and Tholians; +2 commendations.", apply: (S) => { for (const p of ["klingon", "romulan", "tholian"]) remember(S, p, "honoured the dead of every power after the Sleepers", 6); S.commendations += 2; return "A beacon at the wreck names every world the Sleepers burned, Federation, Klingon, Tholian alike. The other powers notice. +2 commendations."; } },
    ],
  },
};
registerChoices("crisis", {
  view: (S, ev) => { const E = SCENES[ev.id]; return { title: E.title, kicker: "The Sleepers", text: E.text(S), options: E.options.map((o) => ({ id: o.id, name: o.name, blurb: o.blurb })) }; },
  choose: (S, ev, id) => { const E = SCENES[ev.id], o = E.options.find((x) => x.id === id) || E.options[0]; const text = o.apply(S); log(S, `${E.title}: ${o.name}. ${text}`, "discovery", { story: true }); updateVisibility(S); return { title: E.title, text, choice: o.name }; },
});
