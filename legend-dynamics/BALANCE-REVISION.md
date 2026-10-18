# Balance revision (review branch)

A focused revision of the Legend Dynamics core, ready for focused playtesting. It closes specific gaps; it does not prove the system is balanced. The core design is unchanged: 3d6 roll-under, the skill tiers, three injury boxes, fixed weapon damage, attack quality against defenses, one defense a round, and Legend points.

Branch: `claude/balance-revision` (from `claude/legend-dynamics`). Nothing has been published or deployed.

## What changed

### 1. Fine weapons and tools

**Before:** "+2 to one named skill when it's used": a bonus to every use of a broad skill.
**Now:** "A fine weapon or tool grants +2 to one narrowly defined use of a named skill, agreed when chosen. It does not stack with an advantage bonus on the same roll and never improves Dodge, Parry, or Block." A new *Fine weapons and tools* section gives examples (aimed shots at Long range with a scoped rifle, delicate repairs with a watchmaker's instruments, field treatment with a surgeon's instruments, breaking shields and doors with an old great axe) and what each doesn't cover, plus two uses that are too broad.

- Creator: the Edge asks for the narrow use (readiness requires it); the sheet shows it; the dice roller offers the +2 only on that skill, never on a defense, and takes +2 once when the advantage also applies.
- The seven ready-made characters with the Edge each have a narrow use, chosen so none overlaps their own advantage (Dr. Webb's instruments cover field treatment, not surgery, which his Steady Hands already covers).

### 2. Additional Defense

**Before:** a second defense at no penalty, except a second Parry at −2.
**Now:** "You may attempt a second defense each round at −2, in addition to attack-quality and injury penalties. You cannot defend twice against the same attack." The separate second-Parry penalty is gone, so −2 is never applied twice. Cost stays one Edge.

- Data: `engine/combat.json` `oneDefense.extraPenalty: -2`, `parry.repeatPenalty: 0`. The rule is data, so USS Pelion and Grimm, which keep their own combat rules, are unchanged.
- Encounter panel: a second defense in a round carries "Second defense this round −2", whatever kind (`lab/encounter.js`).
- Creator: the roller has a "Second defense this round −2" box for characters with the Edge; the Dodge note says so.

### 3. Magic limits

- **Quicker hand:** "Reduce the interval between rolls for one specific working by one step, to a minimum of one minute. Its clock and required rolls remain unchanged. Combat release requires a charm." Same cost (1) and once per working. **Before**, it could take a working down to one action. The Magic chapter now also says a working is too slow for a fight: use a charm.
- **Defense or resistance:** every hostile burst names, in its description, either a defense ("Dodge applies") or a resistance ("Will resists"), never both, never chosen at casting. Against a defense, the casting roll is the attack roll and attack quality applies from its margin. Against a resistance, it's a contest (casting roll against the target's attribute roll, ties to the target), with no attack-quality penalty, because the margin already counts. **Before**, Aurora said "Dodge, Body or Will where it makes sense", and the Trails, Crown and Fracture Lines notes said "where it makes sense".
- **Harm limit:** personal-scale magic marks at most 3 boxes on one target from one burst, working or charm. Harder Boosts stop at 3; further Boosts go to range, duration or targets. Enforced in the engine (`MAGIC_HARM_CAP`). **Before**, a 2-box burst with two Harder Boosts marked 4.
- **Charms:** a charm skips the casting roll, not the target's defense or resistance. It counts as a success by 0: the target defends with no attack-quality penalty, or resists by succeeding on their roll (a tie goes to the target). A charm never marks more than 3 boxes.

### 4. Telling hits

Triggers, weapon damage and the need to survive a defense are unchanged.

- **Break gear:** the weapon, shield or tool is out of use until its owner spends an action putting it right; destroyed for good only if already vulnerable or through an established weakness. Armor still loses 1 protection until repaired.
- **Pin:** the target's next action goes to getting free, and then they're free (no roll). Keeping them pinned takes another successful attack.
- **Precise:** changes the situation, never the injury, defense or death rules.
- **Knock down:** standing uses the target's move on their next turn; they still take their action.
- **Limits** now say a telling hit never kills outright, disables a character for good, or destroys exceptional equipment.
- The Trails vampire lore card no longer says "a telling hit pins it": the stake is the vampire's established weakness.

### 5. Medical treatment

Effectiveness is unchanged. Added: "Each set of injuries permits one field-treatment attempt and one proper-care attempt. Further rolls require a meaningful improvement in care, a new treatment, or recovery time. Simply waiting and trying again is insufficient."

- A set of injuries is the boxes from one encounter or harmful incident. A later injury starts a new set, whose attempts remove only its own boxes; it doesn't reopen wounds already treated.
- Stabilization stays separate: never limited, never removes boxes.
- **Before:** "Each injury receives one field-treatment attempt; further attempts need changed circumstances." This was partly in place already. The new text adds proper care, defines the set, and says what counts as a change.
- Healing bursts that said "once per wound" (Stanch, Mend, Healing Trance) now say "once per set of injuries", to use the same unit.

## Files changed

| File | What |
|---|---|
| `legend-dynamics/engine/core.md` | Edges table, *Fine weapons and tools*, Additional Defense, Parry, telling-hit table and limits, *Treatment attempts*, Encounter panel text, quick reference |
| `tools/build-legend.py` | Magic chapter (defense or resistance, harm limit, Harder Boost, charms, Quicker hand, workings too slow for a fight), quick-reference lines, ready-made characters' fine-tool text |
| `legend-dynamics/engine/combat.json` | `oneDefense.extraPenalty`, `parry.repeatPenalty` |
| `legend-dynamics/engine/rules/core.js` | `MAGIC_HARM_CAP`: spells capped at 3 boxes |
| `legend-dynamics/engine/rules/experiments.js` | `oneDefense` parameters and summary; revised telling-hit effect texts |
| `legend-dynamics/engine/lab/encounter.js` | The second defense's −2 |
| `legend-dynamics/engine/creator.html` | Edge texts, fine-tool use field and readiness, roller (second defense, fine tool, no stacking), sheet, Boost and Quicker-hand help |
| `legend-dynamics/packs/*/pack.json`, `setting.md` | Burst defense/resistance wording, casting notes, healing bursts, ready-made characters' fine-tool uses, Trails example and vampire lore card |
| `legend-dynamics/engine/rules/test/balance.test.mjs` | New focused tests |
| `legend-dynamics/engine/rules/sim/balance-sim.mjs` | New combat simulation |
| Built output | Each setting's `index.html`, guides and Word files, and the core rules (`Legend_Dynamics_Core_Rules.md`/`.docx`), rebuilt from the sources above |

Not changed: USS Pelion and Grimm (their own guides and combat data), the website build in `legend-dynamics/site/`, the Discord bot.

## Validation

**Automated tests.** Rules tests 18 pass (11 existing, 7 new in `balance.test.mjs`): Additional Defense's −2 for any second defense and no third; no extra second-Parry penalty; a setting with its own rules unchanged; the 3-box magic cap (and no cap on weapons); every published hostile burst names exactly one of a defense or a resistance; the revised telling-hit texts. Discord bot tests 16 pass.

**Browser checks** (the built creators). Every ready-made character in all four settings reads Ready under the new fine-tool rule (27 characters). The roller: Isaiah Booker's rifle offers +2 only on Shooting, not on Dodge; Dr. Webb's Medicine stays at +2 with both his advantage and his instruments ticked; with Additional Defense, Dodge 12 becomes 10 on a second defense. Encounter panel fights, Tough and materials, the Discovery panel and phone layouts run without errors in all four settings.

**Simulation** (`node legend-dynamics/engine/rules/sim/balance-sim.mjs 40000`; `PREVIOUS=1` runs the old Additional Defense). This is mathematical analysis with the engine's own attack resolution, **not playtesting**.

Assumptions: everyone uses a 2-box weapon at Close (no range penalty), except the 1-box row; no armor, cover, aiming or called shots; a defender always Dodges the first hit(s) each round while a defense remains; attackers focus the most-hurt foe; injury penalties apply; 3 boxes takes a fighter out; Agility ties break at random. "Ordinary" is attack 13 / Dodge 10; "high-defense" is attack 13 / Dodge 13. The mixed fight is the Trails ready-made numbers (Shooting 16 / Dodge 12, 14 / 12, 14 / 10, a non-combatant at 6 / 8) against four outlaws (Shooting 13, Dodge 9, from the threats table). Legend points are spent only where a row says so, as a reroll of one failed defense.

### Chance one attack lands (exact)

Attack succeeds and the defense fails, with attack-quality penalties. Second defense = Additional Defense's −2.

| Attack | vs Dodge 9 | vs Dodge 10 | vs Dodge 12 | vs Dodge 13 | vs Dodge 13, second defense | No defense left |
|---|---|---|---|---|---|---|
| 11 | 43.1% | 35.7% | 20.6% | 14.0% | 28.0% | 62.5% |
| 13 | 61.3% | 52.0% | 31.9% | 22.6% | 42.0% | 83.8% |
| 14 | 68.7% | 59.1% | 37.5% | 27.1% | 48.4% | 90.7% |
| 16 | 79.7% | 70.4% | 47.6% | 36.0% | 59.4% | 98.1% |

### Fights

Side A is listed first. Rounds = rounds until one side is down (mean, median). Land = share of all attacks that marked boxes; Side B land = side B's attacks only.

| Scenario | Side A wins | Rounds (mean / median) | Land, all | Land, side B | Telling hits per attack |
|---|---|---|---|---|---|
| Duel: ordinary vs ordinary (13 / Dodge 10, 2-box weapons) | 50.0% | 2.7 / 2 | 50.3% | 50.3% | 9.8% |
| Duel: high-defense (Dodge 13) vs ordinary | 78.4% | 3.2 / 3 | 38.9% | 22.3% | 8.1% |
| Duel: high-defense + Additional Defense vs ordinary | 78.8% | 3.2 / 3 | 38.9% | 22.0% | 8.1% |
| Duel: ordinary vs ordinary, 1-box weapons | 49.9% | 4.3 / 4 | 50.8% | 50.9% | 11.8% |
| Duel: ordinary vs ordinary, both reroll one failed defense (a Legend point) | 50.1% | 3.1 / 3 | 40.8% | 40.7% | 9.3% |
| Duel: ordinary vs ordinary, only side A rerolls one failed defense | 61.2% | 2.9 / 3 | 45.5% | 37.8% | 9.5% |
| Duel: ordinary vs ordinary, only side A rerolls up to two failed defenses | 65.5% | 3.0 / 3 | 43.8% | 33.9% | 9.3% |
| 2 vs 1: ordinary defender | 2.1% | 1.8 / 2 | 57.8% | 62.8% | 11.1% |
| 2 vs 1: ordinary defender + Additional Defense | 2.7% | 1.9 / 2 | 55.8% | 59.9% | 10.8% |
| 2 vs 1: high-defense defender | 9.1% | 2.6 / 2 | 45.3% | 44.1% | 8.9% |
| 2 vs 1: high-defense defender + Additional Defense | 19.8% | 3.3 / 3 | 39.0% | 32.3% | 8.3% |
| Mixed: 4 characters vs 4 outlaws | 86.6% | 4.5 / 4 | 59.9% | 56.1% | 14.1% |
| Mixed: same, gunfighter and brawler with Additional Defense | 89.9% | 4.4 / 4 | 58.9% | 52.1% | 14.1% |

### Telling-hit effects

In an equal duel, side A always picks the same effect on a telling hit; side B picks none. Precise isn't modeled (it changes the situation, not the numbers).

| Effect side A picks | Side A wins |
|---|---|
| none (boxes only) | 50.1% |
| lose an action (pin, disarm, break gear) | 53.4% |
| rattle (−2 next roll) | 51.3% |
| knock down (move only) | 49.8% |

In 2 vs 1, with the pair always opening the defender up: the defender wins 1.9% (no effect: 2.1%).


**Additional Defense under the previous rule (no penalty), for comparison:**

| Scenario | Side A wins | Rounds (mean / median) | Land, all | Land, side B | Telling hits per attack |
|---|---|---|---|---|---|
| Duel: high-defense + Additional Defense vs ordinary | 78.8% | 3.2 / 3 | 38.9% | 22.0% | 8.1% |
| 2 vs 1: ordinary defender + Additional Defense | 3.5% | 2.1 / 2 | 53.2% | 55.7% | 10.4% |
| 2 vs 1: high-defense defender + Additional Defense | 27.8% | 3.9 / 4 | 35.8% | 26.1% | 7.7% |
| Mixed: same, gunfighter and brawler with Additional Defense | 92.4% | 4.3 / 4 | 58.1% | 49.1% | 14.1% |

**Reading the numbers**

- **Landing attacks.** An ordinary attacker (13) lands about half its attacks on an ordinary defender (Dodge 10) and under a quarter on a high-defense one (Dodge 13). With no defense left, 84% land.
- **Rounds to incapacitation.** Equal ordinary fighters with 2-box weapons go down in 2–3 rounds (median 2); with 1-box weapons, about 4. One defender against two goes down in about 2 rounds unless their Dodge is high.
- **Additional Defense.** It does almost nothing in a one-on-one fight (one attack a round) and matters most for a high-defense character facing several attackers: the lone defender's chance rises from 9% to 20% now, against 28% under the old free second defense. The revision roughly halves its value there and in the mixed fight (+3.3 points now, +5.8 before), while keeping it worth an Edge for a defensive build.
- **Legend points.** One defense reroll moves an equal duel from 50% to 61%; two, to 66%. Note that spending a point to take one box off a 2-box hit rarely saves a character from going down to the next 2-box hit; its real value is avoiding Dying and death.
- **Telling hits.** They come on 8–14% of attacks. No single effect dominates. Pin, disarm and break gear all cost the target an action, so they behave the same (about +3 points of win chance in a duel). Rattle is about +1. Knock down does nothing in a stand-up fight (its value is positional). Open them up does little under focus fire, where the next attack on that target usually comes a round later.

## Unresolved ambiguities and setting conflicts

These need individual rulings; none was invented.

- **Long magical holds against the new Pin.** Hold (Trails), Bind (Aurora) and Kinetic Shove's knock down and disarm (Fracture Lines) last a scene or follow their own text. They don't say how to break free, while a telling-hit Pin now ends after one action.
- **Witchfire (Crown)** sets things burning for 1 box a round. Its ignition is now an attack (Dodge applies), but ongoing fire can pass 3 boxes over several rounds. Treated as ordinary fire (a hazard), not as the burst's harm.
- **Charm** resists with Presence in Crown (from "Presence contest") and Will in Aurora. Glamour (Aurora) said "Will or Intellect"; it now says Intellect. Both need a deliberate choice.
- **Shatter (Crown)** destroys a lock, blade or door permanently: a magical exception to the Break gear limit, kept as lore. Against an object in someone's hand it is now an attack (Dodge applies).
- **Sleep (Crown)** still drops minor opponents without resisting, an existing exception.
- **Pact-Bound (Trails)** works a minor magical effect once a scene with one roll and no clock. That's faster than any working, and outside the Quicker-hand and charm limits.
- **Aurora's Healing power** clears a box once a scene by its own rules, and **Dhampir** fast healing is its own rate. Neither is bound by the treatment attempts.
- **Shield cantrip (Aurora)** and powers that add Defense: how they combine with Additional Defense isn't stated.
- **Lore cards** (Trails) permit actions like cutting out a wendigo's heart. These rest on established weaknesses, which the new telling-hit limits allow, but a GM should require the creature to be down first.
- **The Encounter panel** applies the second-defense −2 and the harm cap, but doesn't track Pin, Disarm, Break gear or Knock down; the GM does.
- **USS Pelion and Grimm** still have the old rules (a second parry at −2, a broad fine tool where present, a single treatment attempt per injury). They're separate games; bring them in line only if wanted.

## Origin adjustments recommended for later review

Assessed against what an Edge buys (+1 attribute point, a Trained skill, a second advantage, Extra Legend, a friend, a fine tool, Additional Defense, Hard to put down): how often the gift matters, whether it's permission, a number or extra actions, what it replaces, and how often its weaknesses bite. Complications a player may decline (and that pay Legend) aren't counted as weaknesses. No origin has been changed.

**Possibly underpriced**

- **Werewolf (Trails, tier 2).** Tough in form takes a box off every 2+ box hit (a revolver marks 1), all fight, plus 2-box claws at will and Keen senses. Its weaknesses are situational (silver) or monthly (the moon). The Dresh pays the same tier for armor once per fight. Proposal: Tough once per fight, or tier 3.
- **Draelin (Fracture Lines, tier 1).** A free Trained skill (Navigation), which is the whole of one Edge, plus Field sense. Proposal: keep one gift, or tier 2.
- **Sighted (Trails, tier 1).** Worth more now that the Sight advances discovery clocks where nothing else can. Proposal: watch in play; no change yet.

**Possibly overpriced**

- **Corvani (Fracture Lines, tier 1).** Lists only a weakness (weakens without light), no gift. Proposal: tier 0, or add a gift.
- **Vael (Fracture Lines, tier 1).** The zero-g benefit is niche, while −1 to physical rolls in standard gravity applies in most scenes. Proposal: tier 0.
- **Sen (Fracture Lines, tier 2).** Armor once per fight, but always acts last in every fight, which is unavoidable. Proposal: tier 1.
- **Serpentkin, Demonmarked, Giantblood (Crown, tier 2).** Each gift is narrow: a 1-box venomous bite; fire −1 box offset by holy +1 box; 2-box fists, which any sword matches. Proposal: tier 1.
- **Godblooded (Crown, tier 3).** One GM-granted miracle per venture for three Edges, and hunted on sight. Proposal: tier 2.
- **Dhampir (Trails, tier 2).** Undead sense and faster healing, mostly between sessions. Proposal: tier 1.
- **Lab-made (Aurora, tier 2).** The same tier as Aurora-born, plus an unavoidable Strain risk on 17–18. Proposal: review with Aurora's power slots.

## Playtest checklist

1. Run one equal duel, one 2-against-1 and one full party fight with the Encounter panel. Note rounds to the first character down, and whether fights feel too quick.
2. Give one character Additional Defense and one a high Dodge. Is the second defense at −2 still worth an Edge? Does anyone forget the −2?
3. Have each fine-tool owner state their narrow use at the table. Are the uses arguable mid-fight, and does "not with an advantage" come up?
4. Use every telling-hit effect at least once, especially Pin, Break gear and Knock down. Are players always picking the action-costing ones?
5. Cast a hostile burst of each kind: one with a defense, one resisted, one from a charm. Is the contest quick at the table, and does the 3-box cap feel right with Harder Boosts?
6. Wound a character in two separate fights, treat both, and try a second treatment. Is "set of injuries" easy to track on the sheet?
7. Try Quicker hand on a ritual. Does "combat release requires a charm" stop a working being used mid-fight?
8. Check the flagged items above (Hold, Witchfire, Charm, Pact-Bound, Healing) as they come up, and record the rulings.

## Follow-up after the playtest: range, Move, reach and telling hits

Made after the playtest checks above, so the simulation numbers don't include them.

- **Range bands:** Close 10 yd, Short 25, Medium 100, Long 300, Extreme 1,000 (were 50, 150, 500 and a mile). Weapon bands and penalties unchanged.
- **Move:** 5 yards, +1 per 2 points of Agility + Body above 20, +1 Trained or +2 Specialty/Expert Athletics, plus an origin speed adjustment. Run is twice Move; threats move 8 yards. Origin speeds: Werewolf and Skinchanger forms +1, Vesh +1, Sen −1, Qor −1 (Sen was already flagged as overpriced above; this makes that case stronger).
- **Injury and terrain:** wounded −2 yards; seriously wounded half and no running; hard going halves Move. Stepping away from a fight is free.
- **Reach:** weapons in hand reach 1 yard (fists, knives, clubs, claws), 2 (swords, axes, maces) or 3 (spears, polearms), shown in each weapons table.
- **Mounts and vehicles:** riders use the mount's Move, attacks from a moving mount are −2, and each setting lists its mounts or vehicles. Starships, aircraft and car chases stay on range tracks and chase clocks.
- **Telling hits by weapon:** Pin needs a weapon in hand, fists or a grapple; knock down needs one of those or a shot of 2+ boxes (taser and stunner add it); bare hands and natural weapons don't break gear. The Encounter panel offers only the weapon's effects.
- **Encounter panel and battle map:** with both people on the map, the attack form checks the distance against the weapon's reach and the attacker's Move (after injury), or sets a ranged weapon's band.

Tests: `rules/test/move.test.mjs` (Move, injury, bands, reach in every weapons table, telling effects by weapon).
