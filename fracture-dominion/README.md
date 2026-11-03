# Fracture Lines: Dominion

A turn-based 4X strategy game for the web browser, set in the *Fracture Lines* setting of the Legend Dynamics RPG.
Lead one of five peoples (the Concord, the Tessan Dynasties, the Kel Hives, the Hegemony Remnant or the Vael Living
Fleets) from one world to an empire across a hex galaxy, against up to four computer rivals.

- **The galaxy:** a hex map with star systems linked by corridors (a jump along one costs a single move), nebulae that
  slow and hide ships, and rifts nothing crosses. Fog of war; ancient ruins to survey.
- **Worlds:** population grows and makes industry, science and credits; each world has a build queue (ships and
  buildings), and credits can rush the front of it. Exotics come from deposits and pay for heavy ships and great works.
- **Ships:** scouts, colony and outpost ships, frigates, cruisers, dreadnoughts and troop transports. Battles roll 3d6
  roll-under, as the tabletop game does: each armed ship rolls under its skill to hit, three exchanges a turn.
- **Research:** sixteen technologies in three fields.
- **Diplomacy:** contact, war and peace, trade treaties; settling next door makes neighbours angry.
- **Victory:** conquest, the Corridor Engine (a great work), or the highest score at turn 200. Or an **open game**
  with no end: retire when you choose. After a win, **Keep ruling** carries the game on in open rule.
- **Focus:** three points a turn to share between industry, science, credits and defense (2 at most to one).
- **Supply and stances:** warships more than 3 hexes from every world and outpost of theirs wear down a hull point a
  turn after the first (Vael fleets feed themselves). Each fleet fights balanced, aggressive (+1 to its rolls and to
  theirs against it) or defensive (−1 to both).
- **Directives and campaigns:** your faction's authority sends directives, each a race against a rival. Three
  campaigns follow one another from turn 8 (The Open Frontier, The Arms Race, The Old Empires' Secrets), each against
  your nearest rival, with threads, a rival that gains ground on its own, a finale (a lead over the rival) and new
  kinds of directives that stay in the book (fortify, win battles, stockpile exotics, survey ruins, claim the border).
- **Prototypes:** your research arm sends field tests as directives; carried out, each leaves a unique upgrade (fold
  lances, ablative plating, long-range scanners, supply tenders, yard drones, an orbital shield grid, hab
  arcologies). Winning a campaign brings one; the computer powers field-test their own every 25 turns.
- **Galaxies:** small, medium, large or vast (radius 19, 136 systems).

## Files

- `src/hex.js` hex maths and the seeded random generator; `src/data.js` the numbers; `src/galaxy.js` the map;
  `src/game.js` the rules (pure functions over one JSON state); `src/orders.js` directives, campaigns and prototypes; `src/ai.js` the computer factions; `src/ui.js` the page.
- `index.html` the page's markup and styles; `build.mjs` inlines the modules into `dist/index.html` (for an artifact)
  and `dist/play.html` (standalone; the website copies it to `/dominion/`).

## Commands

    node build.mjs                 # build dist/
    node --test test/*.test.mjs    # the rules' tests
    node test/sim.mjs 7 200 medium # an all-computer game, for balance

Games save in the browser after every action, and the menu gives a save code to copy and load elsewhere.
