# USS Pelion: Frontier

A turn-based hex strategy game for the USS Pelion fan game: command the Pelion through a fifty-week tour of the
Corvan Sector (or open command, with no end), a frontier between the Federation, the Klingon Empire and the Romulan Neutral Zone. Solo, against the
other powers. An unofficial fan work inspired by *Star Trek*, for our table only (see `fan-games/README.md`).

It's built from the tabletop game's own books:

- **The crew** are the Players' Guide's six ready-made officers, with their skills and advantages. Every officer acts
  once a turn, on the bridge or with an away team, and each job can be tried once a turn; an officer who assists
  (+1) uses their turn. Every action is the tabletop roll: 3d6 at or under the officer's skill, 3–4 always succeeds, 17–18 always fails, success by 5 is a
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
- **Power and stores:** the warp core's Power (5) is shared out every week as in battle: the engines take what the
  warp factor needs (1 to warp 4, 2 to warp 6, 3 for warp 7–8), the rest goes to shields on standby, sensors, the
  science labs and operations (up to 2 each, each a bonus). The warp drive burns antimatter by the light-year, wears
  out dilithium crystals (fewer crystals, less Power and lower warp) and uses spare parts in repairs and at emergency
  warp. Starbase 23 refuels; colonies and friendly worlds sell; surveys find seams to mine; Engineering
  recrystallizes; Orion ships leave salvage; a fuel tender comes when the antimatter runs out. In battle, Power is
  split between shields (2: reinforced), phasers (2: overloaded), torpedoes and engines (evasion).
- **Campaigns:** Watchers of the Void runs from Corvan II; after it, *The Cold Fire* (the sector's dilithium dying)
  and *The Syndicate's Due* (the Orion Syndicate taxing the supply lines), each with its own rival, beats, finale and
  five new kinds of orders that stay in Starfleet's book (`src/campaigns.js`). In a tour, a new campaign starts only
  with twelve weeks to go; at the tour's end, *Keep command* turns the game into open command.
- **Starfleet Command track:** five boxes and you're relieved. Incidents (firing first on a Klingon ship), the
  Prime Directive, the Neutral Zone, lost colonies and failed orders mark it; carried-out orders clear it.

## Files

- `src/hex.js` hex maths and the seeded generator (shared with Fracture Lines: Dominion); `src/data.js` the numbers;
  `src/sector.js` the map; `src/campaigns.js` the campaigns after the first; `src/game.js` the rules (pure functions over one JSON state); `src/combat.js` ship
  combat; `src/arc.js` The Silence at Corvan II; `src/ai.js` the other powers; `src/turn.js` the end of a turn;
  `src/ui.js` the page.
- `index.html` markup and styles; `build.mjs` inlines the modules into `dist/index.html` (artifact) and
  `dist/play.html` (standalone; the fan-games site copies it to `/uss-pelion/frontier/`).

## Commands

    node build.mjs                    # build dist/
    node --test test/rules.test.mjs   # the rules' tests
    node test/sim.mjs 7 5             # five automatic tours, for balance
    MODE=open node test/sim.mjs 7 3   # three games of open command, retiring at week 120

Games save in the browser after every action; the menu gives a save code to move a game to another browser, and the
sector's seed to replay it.
