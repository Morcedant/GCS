// Monte Carlo simulation of Legend Dynamics personal combat under the published core rules (engine/combat.json),
// driven by the engine's own attack resolution (core.js resolveAttack). This is mathematical analysis, not playtesting:
// it models simple tactics and stand-up fights, with no movement, cover, aiming or GM rulings.
//
//   node legend-dynamics/engine/rules/sim/balance-sim.mjs [fights per scenario, default 20000]
import { readFileSync } from "node:fs";
import * as LD from "../core.js";
import * as X from "../experiments.js";

const N = +process.argv[2] || 20000;
const CORE = JSON.parse(readFileSync(new URL("../../combat.json", import.meta.url)));
const RULES = X.buildRules(X.PUBLISHED, {}, null, CORE.rules);
// −2: Additional Defense's second defense. PREVIOUS=1 runs the rule before this revision (a second defense at no penalty).
const PREVIOUS = process.env.PREVIOUS === "1";
const EXTRA = PREVIOUS ? 0 : CORE.rules.oneDefense.extraPenalty;
const rng = LD.mulberry32(20261017);
const d6 = () => 1 + Math.floor(rng() * 6);
const roll = () => [d6(), d6(), d6()];

const W2 = { id: "revolver", band: "close", firearm: true, damage: { any: { boxes: 2 } } }; // a gun or a sword: 2 boxes
const W1 = { id: "club", reach: "melee", damage: { melee: { boxes: 1 } } }; // fists, a club, a knife: 1 box

/** A fighter. atk: attack target; dodge: Dodge; ad: Additional Defense; legend: points to reroll a failed defense (keep the second roll). */
const F = (name, atk, dodge, o = {}) => ({ name, atk, dodge, agility: o.agility ?? 12, weapon: o.weapon || W2, ad: !!o.ad, legend: o.legend || 0, effect: o.effect || null });

function fresh(f, side) { return { ...f, side, injury: 0, dying: false, dead: false, out: false, defUsed: 0, rattled: false, lostAction: false, legendLeft: f.legend }; }

/** One fight to the finish (or 30 rounds). Returns { winner, rounds, stats }. */
function fight(A, B) {
  // Highest Agility first; ties in a random order each fight (players and the GM settle them at the table).
  const all = [...A.map((f) => fresh(f, "A")), ...B.map((f) => fresh(f, "B"))].map((f) => ({ f, k: rng() })).sort((x, y) => y.f.agility - x.f.agility || x.k - y.k).map((x) => x.f);
  const st = { attacks: 0, landed: 0, defended: 0, telling: 0, perAttacker: new Map() };
  let round = 0;
  while (round < 30) {
    round++;
    for (const f of all) f.defUsed = 0;
    for (const f of all) {
      if (f.out) continue;
      if (f.lostAction) { f.lostAction = false; continue; } // pinned, disarmed or gear out of use: the action goes to fixing it
      const foes = all.filter((x) => x.side !== f.side && !x.out);
      if (!foes.length) break;
      const t = foes.sort((x, y) => y.injury - x.injury)[0]; // focus fire: the most hurt foe
      const allowed = 1 + (t.ad ? 1 : 0);
      const canDefend = t.dodge !== null && t.defUsed < allowed;
      const dmods = [];
      if (canDefend && t.defUsed >= 1 && EXTRA) dmods.push({ source: "oneDefense", label: "Second defense", value: EXTRA, scope: "core" });
      if (t.rattled) { dmods.push({ source: "telling", label: "Rattled", value: -2, scope: "core" }); }
      const amods = f.rattled ? [{ source: "telling", label: "Rattled", value: -2, scope: "core" }] : [];
      if (f.openedBy) amods.push({ source: "telling", label: "Opened up", value: 2, scope: "core" });
      const dice = [];
      const take = () => { const d = roll(); dice.push(d); return d; };
      const input = {
        attacker: { id: f.name, name: f.name, skill: "Fight", skillTarget: f.atk, injury: f.injury },
        defender: { id: t.name, name: t.name, dodgeBase: t.dodge, injury: t.injury, canDodge: canDefend, boxes: 3, dying: t.dying, dead: t.dead },
        defense: canDefend ? { kind: "dodge", label: "Dodge", base: t.dodge, mods: dmods } : null,
        weapon: f.weapon, band: f.weapon.reach === "melee" ? "melee" : "close", situational: amods,
      };
      let res = LD.resolveAttack(input, RULES.hooks, take);
      // Legend: reroll a failed defense once (the attack roll stands; keep the second defense roll, even if worse).
      if (res.dodge && !res.dodge.success && res.hit && t.legendLeft > 0) {
        t.legendLeft--; const atkDice = dice[0];
        res = LD.resolveAttack(input, RULES.hooks, (k) => (k === "attack" ? atkDice : roll()));
      }
      f.rattled = false; f.openedBy = false;
      if (canDefend && res.dodge) { t.defUsed++; if (t.rattled) t.rattled = false; }
      st.attacks++;
      const pa = st.perAttacker.get(f.name) || { attacks: 0, landed: 0 }; pa.attacks++;
      if (res.dodge && res.dodge.success) st.defended++;
      if (res.hit && res.damage) {
        st.landed++; pa.landed++;
        const h = LD.applyHit(t, { boxes: res.damage.boxes });
        Object.assign(t, { injury: h.injury, dying: h.dying, dead: h.dead, out: h.out });
        const telling = res.attack.margin >= 5 || res.attack.auto === "success";
        if (telling && !t.out) {
          st.telling++;
          if (f.effect === "lose-action") t.lostAction = true; // pin, disarm, break gear
          else if (f.effect === "rattle") t.rattled = true;
          else if (f.effect === "open") { const ally = all.find((x) => x.side === f.side && x !== f && !x.out); if (ally) ally.openedBy = t.name; }
          // knock down: standing uses the move, not the action: no effect in a stand-up fight
        }
      }
      st.perAttacker.set(f.name, pa);
    }
    const aUp = all.some((x) => x.side === "A" && !x.out), bUp = all.some((x) => x.side === "B" && !x.out);
    if (!aUp || !bUp) return { winner: aUp ? "A" : bUp ? "B" : "none", rounds: round, st };
  }
  return { winner: "none", rounds: round, st };
}

function run(label, A, B) {
  let aWins = 0, rounds = 0, attacks = 0, landed = 0, telling = 0, bLanded = 0, bAttacks = 0;
  const roundsWhenB = [];
  for (let i = 0; i < N; i++) {
    const r = fight(A, B);
    if (r.winner === "A") aWins++;
    rounds += r.rounds; attacks += r.st.attacks; landed += r.st.landed; telling += r.st.telling;
    for (const f of B) { const p = r.st.perAttacker.get(f.name); if (p) { bAttacks += p.attacks; bLanded += p.landed; } }
    roundsWhenB.push(r.rounds);
  }
  roundsWhenB.sort((a, b) => a - b);
  return { label, aWin: aWins / N, rounds: rounds / N, median: roundsWhenB[N >> 1], land: landed / attacks, bLand: bAttacks ? bLanded / bAttacks : 0, telling: telling / attacks };
}

/** Exact chance that one attack lands: attack succeeds and the defense fails, with attack quality. */
function landChance(atk, dodge, extra = 0) {
  let p = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) {
    const r = LD.resolve([a, b, c], atk);
    if (!r.success) continue;
    const q = CORE.rules.attackQualityDodge.bands.filter((x) => r.margin >= x.from).pop().mod;
    p += (1 - (dodge === null ? 0 : LD.odds(dodge + q + extra))) / 216;
  }
  return p;
}

const pct = (x) => (x * 100).toFixed(1) + "%";
const out = [];
out.push(`# Legend Dynamics combat simulation${PREVIOUS ? " (previous Additional Defense: no penalty)" : ""}\n\nMonte Carlo, ${N.toLocaleString("en")} fights per scenario, published core rules (engine/combat.json)${PREVIOUS ? " with the second defense at no penalty" : ""}, engine attack resolution, ties in Agility broken at random. Mathematical analysis only: no movement, cover, aiming, called shots or GM rulings.\n`);

out.push("## Chance one attack lands (exact)\n\nAttack succeeds and the defense fails, with attack-quality penalties. Second defense = Additional Defense's −2.\n");
out.push("| Attack | vs Dodge 9 | vs Dodge 10 | vs Dodge 12 | vs Dodge 13 | vs Dodge 13, second defense | No defense left |");
out.push("|---|---|---|---|---|---|---|");
for (const atk of [11, 13, 14, 16]) out.push(`| ${atk} | ${pct(landChance(atk, 9))} | ${pct(landChance(atk, 10))} | ${pct(landChance(atk, 12))} | ${pct(landChance(atk, 13))} | ${pct(landChance(atk, 13, EXTRA))} | ${pct(landChance(atk, null))} |`);

const ord = (n, o) => F(n, 13, 10, o), high = (n, o) => F(n, 13, 13, o);
const rows = [
  run("Duel: ordinary vs ordinary (13 / Dodge 10, 2-box weapons)", [ord("A1")], [ord("B1")]),
  run("Duel: high-defense (Dodge 13) vs ordinary", [high("A1")], [ord("B1")]),
  run("Duel: high-defense + Additional Defense vs ordinary", [high("A1", { ad: true })], [ord("B1")]),
  run("Duel: ordinary vs ordinary, 1-box weapons", [ord("A1", { weapon: W1 })], [ord("B1", { weapon: W1 })]),
  run("Duel: ordinary vs ordinary, both reroll one failed defense (a Legend point)", [ord("A1", { legend: 1 })], [ord("B1", { legend: 1 })]),
  run("Duel: ordinary vs ordinary, only side A rerolls one failed defense", [ord("A1", { legend: 1 })], [ord("B1")]),
  run("Duel: ordinary vs ordinary, only side A rerolls up to two failed defenses", [ord("A1", { legend: 2 })], [ord("B1")]),
  run("2 vs 1: ordinary defender", [ord("A1")], [ord("B1"), ord("B2")]),
  run("2 vs 1: ordinary defender + Additional Defense", [ord("A1", { ad: true })], [ord("B1"), ord("B2")]),
  run("2 vs 1: high-defense defender", [high("A1")], [ord("B1"), ord("B2")]),
  run("2 vs 1: high-defense defender + Additional Defense", [high("A1", { ad: true })], [ord("B1"), ord("B2")]),
  run("Mixed: 4 characters vs 4 outlaws", [F("Gunfighter", 16, 12), F("Brawler", 14, 12), F("Scout", 14, 10), F("Doctor", 6, 8)],
      [F("Outlaw1", 13, 9, { agility: 11 }), F("Outlaw2", 13, 9, { agility: 11 }), F("Outlaw3", 13, 9, { agility: 11 }), F("Outlaw4", 13, 9, { agility: 11 })]),
  run("Mixed: same, gunfighter and brawler with Additional Defense", [F("Gunfighter", 16, 12, { ad: true }), F("Brawler", 14, 12, { ad: true }), F("Scout", 14, 10), F("Doctor", 6, 8)],
      [F("Outlaw1", 13, 9, { agility: 11 }), F("Outlaw2", 13, 9, { agility: 11 }), F("Outlaw3", 13, 9, { agility: 11 }), F("Outlaw4", 13, 9, { agility: 11 })]),
];
out.push("\n## Fights\n\nSide A is listed first. Rounds = rounds until one side is down (mean, median). Land = share of all attacks that marked boxes; Side B land = side B's attacks only.\n");
out.push("| Scenario | Side A wins | Rounds (mean / median) | Land, all | Land, side B | Telling hits per attack |");
out.push("|---|---|---|---|---|---|");
for (const r of rows) out.push(`| ${r.label} | ${pct(r.aWin)} | ${r.rounds.toFixed(1)} / ${r.median} | ${pct(r.land)} | ${pct(r.bLand)} | ${pct(r.telling)} |`);

const eff = [["none (boxes only)", null], ["lose an action (pin, disarm, break gear)", "lose-action"], ["rattle (−2 next roll)", "rattle"], ["knock down (move only)", "knock"]]
  .map(([n, e]) => run(`Duel, side A always picks: ${n}`, [ord("A1", { effect: e })], [ord("B1")]));
const effOpen = run("2 vs 1, side B always picks: open them up (+2 to the next attack)", [ord("A1")], [ord("B1", { effect: "open" }), ord("B2", { effect: "open" })]);
const effBase = rows.find((r) => r.label === "2 vs 1: ordinary defender");
out.push("\n## Telling-hit effects\n\nIn an equal duel, side A always picks the same effect on a telling hit; side B picks none. Precise isn't modeled (it changes the situation, not the numbers).\n");
out.push("| Effect side A picks | Side A wins |");
out.push("|---|---|");
for (const r of eff) out.push(`| ${r.label.replace("Duel, side A always picks: ", "")} | ${pct(r.aWin)} |`);
out.push(`\nIn 2 vs 1, with the pair always opening the defender up: the defender wins ${pct(effOpen.aWin)} (no effect: ${pct(effBase.aWin)}).`);
console.log(out.join("\n"));
