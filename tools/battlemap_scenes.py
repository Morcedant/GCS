# The playtest adventures (the GM's Guides' first jobs), scene by scene: a battle-map prompt for each, the hex size to set in the
# GM view's battle map, and the art style per adventure. Used by tools/build-site.py (the playtest page's Battle maps) and
# for legend-dynamics/battlemap-prompts.md.
RULES = ("Top-down battle map for a tabletop roleplaying game, seen from directly overhead (orthographic, no perspective tilt, no horizon). "
         "Fill the whole frame edge to edge: no border, frame, vignette, compass or legend. No grid, no text, no labels, no numbers, no people, "
         "creatures, figures or tokens. Floors and ground read clearly as open, walkable space; walls, furniture, rocks and other cover are easy to "
         "tell apart from above, with soft shadows that show their height. Landscape, 16:9.")
# id: the game; folder: the bucket folder its maps go in (battle-maps/<folder>/), named as its address on the site.
ADVENTURES = [
 {"id": "western", "setting": "Trails of Blood & Dust", "title": "Dead Man's Wages",
  "style": "Hand-painted Gothic Western illustration. Palette: dust ochre, sun-bleached timber, bone white and oxblood, with lamp-amber light at night. Gritty texture, like a hand-colored engraving.",
  "scenes": [
   ("1. The ride in: something on the trail", "5 yards", "about 150 by 85 yards",
    "A wagon trail through dry scrub hills in late-afternoon light, long shadows. A dry wash crosses the trail; boulders, mesquite and a broken fence line give cover. Long drag marks in the dust leave the trail and run toward a cluster of rocks, ending at a dark crevice. A single miner's boot lies beside the marks. On the far edge, the trail drops toward a distant valley."),
   ("2. Mercy Springs at noon: the showdown", "5 yards", "about 120 by 70 yards",
    "The main street of a quiet silver boomtown at high noon, harsh light and short shadows. Along the street: the Silver Dollar saloon with a covered porch, the sheriff's office, a general store, a boarding house, and a livery stable with a corral. A small wooden church stands at one end with its graveyard behind it. Water troughs, hitching rails, a parked wagon and stacked crates for cover. A dirt mine road leaves town at the far end toward the hills. Doors and windows barred."),
   ("3. Mercy Springs by night: the night watch", "5 yards", "about 120 by 70 yards",
    "The same town street at night: every window shuttered and dark except the saloon's, moonlight on the dust, a few lanterns. Behind the livery stable, a fresh sinkhole has opened in the ground, with a rough tunnel mouth going down into the dark. (If your image tool can edit, start from the noon map and change it, so the layout matches.)"),
   ("4. The graveyard: the empty grave", "2 yards", "about 40 by 22 yards",
    "A small frontier graveyard behind a wooden church at night, lit by one lantern and moonlight. Wooden crosses and a few stone markers in uneven rows, a sagging picket fence, a dead tree. One fresh grave is dug out from below, its coffin lid split and scratched; three older graves beside it have collapsed inward, opened from beneath and empty. The church's back door and steps at one edge."),
   ("5. The Lazarus mine: the burial cave", "2 yards", "about 50 by 28 yards",
    "Underground, almost dark: pools of light from a dropped oil lamp and a lantern on a timber. On one side, the lowest drift of a silver mine: timber supports, ore-cart rails, a cart on its side, a crate of dynamite. A broken wall opens from the drift into a much older natural cave lined with burial niches cut into the rock, old bones and grave goods in them, scattered miners' gear on the floor. At the back of the cave, a heap of stones covers something large. Narrow places and pillars of rock for cover."),
   ("6. Midnight at the Crane house", "2 yards", "about 45 by 25 yards",
    "A wealthy mine owner's house at midnight, the roof removed so the ground floor shows from above: a front porch, entry hall and staircase, a parlor with a piano and fireplace, a study with a desk and an iron safe, a kitchen and back door. Outside: a gravel drive with a carriage, a picket fence, a garden. Moonlight outside; one lamp lit in the study."),
  ]},
 {"id": "spaceopera", "setting": "Fracture Lines", "title": "Salvage Rights",
  "style": "Painted science-fiction illustration, worn and lived-in: scuffed alloy, cable runs, warning stripes, teal emergency light and amber work light. The colony ship Long Patience is different: 140 years old, its hull grown over with a bark-like living lattice, warm, faintly glowing, like the inside of a tree.",
  "scenes": [
   ("1. The offer: the dockside tea house", "1 yard", "about 20 by 11 yards",
    "A tea house on a busy space station dock: low tables with cushions, a counter with steaming samovars, a departures board along one wall, a long window onto docked ships, a back door to a cargo corridor stacked with crates."),
   ("2. Company: the derelict and the frigate", "ship scale (use the range track, or a large hex size)", "many kilometers across",
    "Deep space at the far end of a shimmering corridor: on one side, the colossal colony ship Long Patience, its hull grown over with bark-like living growth; around it, a drift of old wreckage, ice and debris for cover; on the other side, empty space and the faint glowing mouth of the corridor. Seen from directly above, flat, like a tactical chart painted as art."),
   ("3. Boarding: the cryo decks", "2 yards", "about 40 by 22 yards",
    "Inside the Long Patience: a long cryo deck with rows of frosted cryo pods, feeding tubes running between them, tanks of cloudy fluid, maintenance alcoves, a raised catwalk along one side. Bark-like living growth covers the walls and climbs over the pods, glowing softly amber. Warm, humid, breathing."),
   ("4. Vantor boards: the grown corridors", "1 yard", "about 30 by 17 yards",
    "A junction of the Long Patience's corridors, overgrown with bark-like living growth that narrows the passages into knots and alcoves. On one edge, a fresh breach cut through the hull, its edges glowing and sparking, with salvage crates and a cutting rig beside it. An emergency bulkhead half closed; a passage leading toward the cryo deck. Plenty of cover from the growths and crates."),
   ("5. The Warden: the bridge", "1 yard", "about 24 by 14 yards",
    "The Long Patience's round bridge: crew consoles in a ring, overgrown with living growth, the helm and navigator's stations at the center, a great viewport at one edge showing the corridor's shimmer. In the middle, a column of glowing lattice where the ship's AI lives, pulsing softly."),
   ("6. The seed vault", "1 yard", "about 20 by 11 yards",
    "A cold vault deep in the ship: walls of sealed seed drawers in rows, cold mist on the floor, a central catalogue console, frost on the metal, a heavy round door. The living growth has stopped at the threshold, as if it knew to keep out."),
  ]},
 {"id": "fantasy", "setting": "The Shattered Crown", "title": "The Thirsting Well",
  "style": "Painted sword-and-sorcery illustration: sun-bleached sandstone, ochre dunes, faded lapis and gold, deep black tomb shadows, torchlight and harsh desert sun.",
  "scenes": [
   ("1. Qasreth: Ysolde's barge", "1 yard", "about 30 by 17 yards",
    "A merchant princess's river barge moored at a stone quay: a deck under silk awnings, cushions and low tables, gold-chased rails, chests and bales of cargo, a gangplank to the quay, the river on the far side."),
   ("2. The road: the second night", "2 yards", "about 50 by 28 yards",
    "A night camp in a hollow between dunes, under moonlight: a campfire, two tents, kneeling camels, baggage and water skins, a low rocky outcrop on one side, dune ridges on two edges. Fresh footprints come over a dune crest toward the camp."),
   ("3. Ain Haddu: the dying oasis", "5 yards", "about 120 by 70 yards",
    "A shrinking oasis pool among a few palms, its cracked mud margin showing where the water used to reach. A herders' camp of tents and goat pens at a distance from the water. A small shrine with a guttering flame near the pool. A crack in the rock at the pool's edge where the water drains away. A sheer cliff along one edge of the map, with a dark tomb entrance at its foot."),
   ("4. Into the tomb: the broken door", "2 yards", "about 40 by 22 yards",
    "The tomb's lower entrance and first hall: a stone door broken open from outside, rubble and grave robbers' abandoned tools, worn stairs going down, walls carved with serpent kings, dust, one shaft of daylight from the entrance, torch brackets on the walls."),
   ("5. The library", "1 yard", "about 20 by 11 yards",
    "A dry stone room lined with niches full of scroll cases, a reading table, a fallen shelf, scattered scrolls, a sealed doorway with a long inscription above it, half chiseled away. Torchlight."),
   ("6. The hall of kings", "2 yards", "about 50 by 28 yards",
    "A long pillared hall in a serpent-king tomb: burial niches along both walls, sarcophagi, a dais heaped with gold, serpent carvings coiled around the pillars, torches guttering. A side passage leads off one wall; a stair goes down at the far end."),
   ("7. Ssethra: the drowned chamber", "2 yards", "about 40 by 22 yards",
    "A vaulted chamber half flooded with dark, still water that drips from cracks in the ceiling, where the oasis drains in. A coiled stone dais rises from the water in the middle; stepping stones and a ledge around the walls; holes in the walls where snakes nest; fallen stone where the ceiling is starting to give way."),
  ]},
 {"id": "aurora", "setting": "Aurora", "title": "Static on the Line",
  "style": "Painted modern superhero illustration: a Chicago neighborhood at night in a blackout. Wet asphalt, dead streetlights, brick and steel, red and blue emergency lights, electric-blue light where power surges.",
  "scenes": [
   ("1. The bridge in the blackout", "2 yards", "about 60 by 34 yards",
    "A city street bridge at night in a blackout, with an elevated train line running beside it. A two-car commuter train stands stalled on the elevated track, doors open. Dead streetlights, a scorched utility pole and a blown transformer throwing sparks, abandoned cars at angles across the lanes, a police cordon with barricades at one end, a TV news van at the other."),
   ("2. The bridge, after the surges", "2 yards", "about 60 by 34 yards",
    "The same bridge after the power surges: the train's front car burning, a downed power line across the road, sparking; a car on fire; scorch marks across the asphalt. (If your image tool can edit, start from the first bridge map and change it, so the layout matches.)"),
   ("3. Under the tracks: the retrieval", "2 yards", "about 50 by 28 yards",
    "The street under the elevated train tracks at night: steel pillars in rows, parked cars, the shuttered fronts of a taqueria and a laundromat, an alley mouth, a vacant lot behind a chain-link fence, and an unmarked white van with its side door open. Deep shadows between the pillars; one working light far off."),
  ]},
]
MASTER = """I'm running a tabletop RPG adventure and need a series of battle maps, one image per scene. Make them one at a time, in the order below, and keep the same art style across the whole series so they look like a set.

Every map follows these rules: {rules}

Art style for this adventure: {style}

The scenes (each with the area it should show):
{scenes}

Start with scene 1. After each one, wait for me to say "next" before making the next. When a scene says it's the same place as an earlier one, keep that earlier map's layout exactly and change only what the scene describes."""
