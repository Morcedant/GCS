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
- **Victory:** conquest, the Corridor Engine (a great work), or the highest score at turn 200.

## Files

- `src/hex.js` hex maths and the seeded random generator; `src/data.js` the numbers; `src/galaxy.js` the map;
  `src/game.js` the rules (pure functions over one JSON state); `src/ai.js` the computer factions; `src/ui.js` the page.
- `index.html` the page's markup and styles; `build.mjs` inlines the modules into `dist/index.html` (for an artifact)
  and `dist/play.html` (standalone; the website copies it to `/dominion/`).

## Commands

    node build.mjs                 # build dist/
    node --test test/*.test.mjs    # the rules' tests
    node test/sim.mjs 7 200 medium # an all-computer game, for balance

Games save in the browser after every action, and the menu gives a save code to copy and load elsewhere.
