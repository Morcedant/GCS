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
- **Battle pop-ups:** a battle you're in opens a report after the turn: both sides' ships and hulls, then every
  shot with its three dice, which you can step through one at a time, a round at a time, or skip to the result.
- **Galactic events:** every nine turns or so, from turn 6, something happens that you decide about: a derelict of
  the old empires, refugees, a plague, a rich deposit, a defecting admiral, raiders, a trader, a golden age, a border
  incident. Surveying ruins is a scene with a choice too (rivals' surveys still give plain research).
- **The late-game crisis (the Wardens):** around turn 105–120 the old empires' war machines wake beside a rift, after a
  warning six turns before. Their Heart never moves; every 6 turns it sends a wave that hunts the nearest worlds of
  every power and burns any whose orbit is unguarded. They grow with the strongest power in the galaxy. The player
  chooses how to meet them (study the signal, warn the rivals, fortify; then a truce, an arms drive, or glory).
  The Heart can't be hit while its guard stands, and breaking it makes every machine go dark. Destroyed machines
  and the Heart count toward score. It can be switched off on the new-game screen. `src/crisis.js`.
- **Rivals with personalities:** each people has a leader and a character (the Concord's idealists, the Tessan merchant
  princes, the patient Kel hive, the proud Hegemony legions, the Vael wanderers). They send messages in their own voice:
  a greeting at first contact, demands for tribute, warnings to move a fleet, offers of alliance, calls to join a war,
  gifts, declarations of war. Every answer, and every act (wars, peace, treaties, settling next door, taking worlds),
  is remembered: the Diplomacy tab shows their mood and what they remember. Alliances pull allies into each other's
  defensive wars (the player is asked) and share vision; breaking one to declare war is remembered as betrayal.
  `src/envoys.js`.
- **Admirals:** every power starts with one; a fleet of two or more warships that wins a battle may find another
  (two, plus one per four worlds, five at most). They earn a rank and a trait at 2, 4 and 7 wins (gunnery, steady,
  swift, quartermaster, shipwright, Warden hunter), usually die with their fleet, and can move to and from the reserve.
- **Directives and campaigns:** your faction's authority sends directives, each a race against a rival. Three
  campaigns follow one another from turn 8 (The Open Frontier, The Arms Race, The Old Empires' Secrets), each against
  your nearest rival, with threads, a rival that gains ground on its own, a finale (a lead over the rival) and new
  kinds of directives that stay in the book (fortify, win battles, stockpile exotics, survey ruins, claim the border).
- **Prototypes:** your research arm sends field tests as directives; carried out, each leaves a unique upgrade (fold
  lances, ablative plating, long-range scanners, supply tenders, yard drones, an orbital shield grid, hab
  arcologies). Winning a campaign brings one; the computer powers field-test their own every 25 turns.
- **Galaxies:** small, medium, large or vast (radius 19, 136 systems).
- **The guide:** a first game, step by step: a coach card walks a new player through the first turns (research,
  building, the scout, a second colony, ending a turn, the ways to win, directives and campaigns, Focus, stances and
  supply), rings what to use next and moves on by itself. On by default for a first game; the menu restarts it.
- **Ship outlines:** each of the seven ships has its own outline, on the map (a fleet shows its biggest ship, pointing
  where it's going), in the panels, and on a printable token sheet (`tokens.mjs` writes `dist/tokens.html`; the
  menu links to it).

## Files

- `src/hex.js` hex maths and the seeded random generator; `src/data.js` the numbers; `src/galaxy.js` the map;
  `src/game.js` the rules (pure functions over one JSON state); `src/orders.js` directives, campaigns and prototypes; `src/ai.js` the computer factions; `src/ui.js` the page.
- `index.html` the page's markup and styles; `tokens.mjs` the printable ship tokens; `build.mjs` inlines the modules into `dist/index.html` (for an artifact)
  and `dist/play.html` (standalone; the website copies it to `/dominion/`).

## Commands

    node build.mjs                 # build dist/
    node --test test/*.test.mjs    # the rules' tests
    node test/sim.mjs 7 200 medium # an all-computer game, for balance

Games save in the browser after every action, and the menu gives a save code to copy and load elsewhere.
