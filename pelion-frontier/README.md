# USS Pelion: Frontier

A turn-based hex strategy game for the USS Pelion fan game: command the Pelion through a fifty-week tour of the
Corvan Sector, a frontier between the Federation, the Klingon Empire and the Romulan Neutral Zone. Solo, against the
other powers. An unofficial fan work inspired by *Star Trek*, for our table only (see `fan-games/README.md`).

It's built from the tabletop game's own books:

- **The crew** are the Players' Guide's six ready-made officers, with their skills and advantages. Every action is
  the tabletop roll: 3d6 at or under the officer's skill, 3–4 always succeeds, 17–18 always fails, success by 5 is a
  great success. Pick who does it; a Duty point rerolls a failure. Successes earn experience (+1 to a skill every
  five); hurt officers take −2 at 2 boxes and go to sickbay at 3.
- **The ship** fights by the Players' Guide's *The USS Pelion* rules: Power spent on shields, phasers and torpedoes
  with the rest as a bonus, the captain's order (Command, Read the enemy, Hail), Helm to evade, Shields before Hull,
  the concussive system damage table, Engineering for damage control, a Helm contest to break away. Enemy ships are
  the GM's Guide's: Klingon battle cruiser and bird-of-prey, Romulan bird-of-prey, Orion raider (and an Orion base).
- **Orders** are rolled on the GM's Guide's mission seed tables (mission, twist, something strange, key character),
  with a deadline. The first is the GM's Guide's starter mission, **The Silence at Corvan II**, played beat by beat:
  the Orion raider, the pull and its Countdown of 6, the away team's record (4), the Orion diggers, the caretaker.
- **The sector:** survey the uncharted, investigate anomalies and ruins for **library records** (perks), court
  independent worlds (accord +5 joins the Federation, −5 joins the Empire), observe pre-warp peoples unseen,
  requisition escorts and science vessels and fit refits at Starbase 23.
- **Starfleet Command track:** five boxes and you're relieved. Incidents (firing first on a Klingon ship), the
  Prime Directive, the Neutral Zone, lost colonies and failed orders mark it; carried-out orders clear it.

## Files

- `src/hex.js` hex maths and the seeded generator (shared with Fracture Lines: Dominion); `src/data.js` the numbers;
  `src/sector.js` the map; `src/game.js` the rules (pure functions over one JSON state); `src/combat.js` ship
  combat; `src/arc.js` The Silence at Corvan II; `src/ai.js` the other powers; `src/turn.js` the end of a turn;
  `src/ui.js` the page.
- `index.html` markup and styles; `build.mjs` inlines the modules into `dist/index.html` (artifact) and
  `dist/play.html` (standalone; the fan-games site copies it to `/uss-pelion/frontier/`).

## Commands

    node build.mjs                    # build dist/
    node --test test/rules.test.mjs   # the rules' tests
    node test/sim.mjs 7 5             # five automatic tours, for balance

Games save in the browser after every action; the menu gives a save code to move a game to another browser, and the
sector's seed to replay it.
