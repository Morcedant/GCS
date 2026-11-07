# The playtest adventures (the GM's Guides' first jobs), scene by scene: a battle-map prompt for each, the hex size to set in the
# GM view's battle map, and the art style per adventure. Used by tools/build-legend.py (the GM view's playtest kit: Battle maps and tokens) and
# for legend-dynamics/battlemap-prompts.md.
RULES = ("Top-down battle map for a tabletop roleplaying game, seen from directly overhead (orthographic, no perspective tilt, no horizon). "
         "Fill the whole frame edge to edge: no border, frame, vignette, compass or legend. No grid, no text, no labels, no numbers. "
         "Show only the place itself: no people, creatures, animals, figures or tokens, and no ships or vehicles that could take part in a fight "
         "(they are separate tokens placed on top of the map); only wrecked, parked or abandoned vehicles that the scene names. Floors and ground read clearly as open, walkable space; walls, furniture, rocks and other cover are easy to "
         "tell apart from above, with soft shadows that show their height. Landscape, 16:9.")
# id: the game; folder: the bucket folder its maps go in (battle-maps/<folder>/), named as its address on the site.
ADVENTURES = [
 {"id": "western", "folder": "trails-of-blood-and-dust", "setting": "Trails of Blood & Dust", "title": "Dead Man's Wages",
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
 {"id": "spaceopera", "folder": "fracture-lines", "setting": "Fracture Lines", "title": "Salvage Rights",
  "style": "Painted science-fiction illustration, worn and lived-in: scuffed alloy, cable runs, warning stripes, teal emergency light and amber work light. The colony ship Long Patience is different: 140 years old, its hull grown over with a bark-like living lattice, warm, faintly glowing, like the inside of a tree.",
  "scenes": [
   ("1. The offer: the dockside tea house", "1 yard", "about 20 by 11 yards",
    "A tea house on a busy space station dock: low tables with cushions, a counter with steaming samovars, a departures board along one wall, a long window onto docked ships, a back door to a cargo corridor stacked with crates."),
   ("2. Company: the derelict and the frigate", "ship scale (use the range track, or a large hex size)", "many kilometers across",
    "Deep space at the far end of a shimmering corridor: on one side, the colossal colony ship Long Patience, its hull grown over with bark-like living growth; around it, a drift of old wreckage, ice and debris for cover; on the other side, empty space and the faint glowing mouth of the corridor. No other ships: the crew's ship and the corporate frigate are separate tokens. Seen from directly above, flat, like a tactical chart painted as art."),
   ("3. Boarding: the cryo decks", "2 yards", "about 40 by 22 yards",
    "Inside the Long Patience: a long cryo deck with rows of frosted cryo pods, feeding tubes running between them, tanks of cloudy fluid, maintenance alcoves, a raised catwalk along one side. Bark-like living growth covers the walls and climbs over the pods, glowing softly amber. Warm, humid, breathing."),
   ("4. Vantor boards: the grown corridors", "1 yard", "about 30 by 17 yards",
    "A junction of the Long Patience's corridors, overgrown with bark-like living growth that narrows the passages into knots and alcoves. On one edge, a fresh breach cut through the hull, its edges glowing and sparking, with salvage crates and a cutting rig beside it. An emergency bulkhead half closed; a passage leading toward the cryo deck. Plenty of cover from the growths and crates."),
   ("5. The Warden: the bridge", "1 yard", "about 24 by 14 yards",
    "The Long Patience's round bridge: crew consoles in a ring, overgrown with living growth, the helm and navigator's stations at the center, a great viewport at one edge showing the corridor's shimmer. In the middle, a column of glowing lattice where the ship's AI lives, pulsing softly."),
   ("6. The seed vault", "1 yard", "about 20 by 11 yards",
    "A cold vault deep in the ship: walls of sealed seed drawers in rows, cold mist on the floor, a central catalogue console, frost on the metal, a heavy round door. The living growth has stopped at the threshold, as if it knew to keep out."),
  ]},
 {"id": "fantasy", "folder": "the-shattered-crown", "setting": "The Shattered Crown", "title": "The Thirsting Well",
  "style": "Painted sword-and-sorcery illustration: sun-bleached sandstone, ochre dunes, faded lapis and gold, deep black tomb shadows, torchlight and harsh desert sun.",
  "scenes": [
   ("1. Qasreth: Ysolde's barge", "1 yard", "about 30 by 17 yards",
    "A merchant princess's river barge moored at a stone quay: a deck under silk awnings, cushions and low tables, gold-chased rails, chests and bales of cargo, a gangplank to the quay, the river on the far side."),
   ("2. The road: the second night", "2 yards", "about 50 by 28 yards",
    "A night camp in a hollow between dunes, under moonlight: a campfire, two tents, baggage and water skins, a low rocky outcrop on one side, dune ridges on two edges. Camel saddles and hobbling ropes, but no animals. Fresh footprints come over a dune crest toward the camp."),
   ("3. Ain Haddu: the dying oasis", "5 yards", "about 120 by 70 yards",
    "A shrinking oasis pool among a few palms, its cracked mud margin showing where the water used to reach. A herders' camp of tents and empty goat pens at a distance from the water. A small shrine with a guttering flame near the pool. A crack in the rock at the pool's edge where the water drains away. A sheer cliff along one edge of the map, with a dark tomb entrance at its foot."),
   ("4. Into the tomb: the broken door", "2 yards", "about 40 by 22 yards",
    "The tomb's lower entrance and first hall: a stone door broken open from outside, rubble and grave robbers' abandoned tools, worn stairs going down, walls carved with serpent kings, dust, one shaft of daylight from the entrance, torch brackets on the walls."),
   ("5. The library", "1 yard", "about 20 by 11 yards",
    "A dry stone room lined with niches full of scroll cases, a reading table, a fallen shelf, scattered scrolls, a sealed doorway with a long inscription above it, half chiseled away. Torchlight."),
   ("6. The hall of kings", "2 yards", "about 50 by 28 yards",
    "A long pillared hall in a serpent-king tomb: burial niches along both walls, sarcophagi, a dais heaped with gold, serpent carvings coiled around the pillars, torches guttering. A side passage leads off one wall; a stair goes down at the far end."),
   ("7. Ssethra: the drowned chamber", "2 yards", "about 40 by 22 yards",
    "A vaulted chamber half flooded with dark, still water that drips from cracks in the ceiling, where the oasis drains in. A coiled stone dais rises from the water in the middle; stepping stones and a ledge around the walls; holes in the walls where snakes nest; fallen stone where the ceiling is starting to give way."),
  ]},
 {"id": "aurora", "folder": "aurora", "setting": "Aurora", "title": "Static on the Line",
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

# Tokens: everyone and everything that takes part in an encounter, made separately from the maps and placed on top of them.
# (name, how big on the map, what it looks like, the scenes it's in)
TOKEN_RULES = ("A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly "
               "overhead, the way it would look on the map below it, centered and filling most of a circle with a thin {rim} rim. Outside the "
               "circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no "
               "scenery beyond a hint of ground or deck under the subject.")
SHIP_RULES = ("A single top-down token of a starship for a tabletop roleplaying game, square image (1:1): the ship seen from directly above, "
              "bow pointing straight up, centered, filling most of the frame, with a faint shadow. Plain flat white background (or transparent, "
              "if the tool can), so it cuts out cleanly. No text, no name, no numbers, no stars or other ships.")
TOKENS = {
  "western": {"rim": "tarnished brass", "tokens": [
    ("Ghoul", "1 hex", "a pale, hairless, long-armed ghoul crouched on all fours, grave dirt under its claws, eyes shining", [3, 5]),
    ("Ezra Quill, the revenant foreman", "1 hex", "a dead mine foreman in a dusty black burial suit, grey skin, a revolver drawn, grave dirt on his shoulders", [3, 5, 6]),
    ("Cyrus Pruitt, gunman", "1 hex", "a lean outlaw gunman in a long duster and flat-brimmed hat, hand resting on a low-slung revolver", [2]),
    ("Hired gun", "1 hex", "a hired gunman in a vest and hat, carrying a shotgun", [6]),
    ("Sheriff Hiram Vance", "1 hex", "a heavyset frontier sheriff with a tin star, a gun belt and a nervous look", [2]),
    ("Augustus Crane, the mine owner", "1 hex", "a mine owner in a fine three-piece suit and silk waistcoat, holding a derringer", [6]),
  ]},
  "spaceopera": {"rim": "scuffed steel", "tokens": [
    ("The crew's ship", "ship", "a battered, much-repaired tramp freighter with cargo pods and patched hull plates", [2]),
    ("Vantor corporate frigate", "ship", "a sleek, angular corporate frigate, clean grey hull with orange corporate markings and turret blisters", [2]),
    ("Syndicate enforcer", "1 hex", "a heavily augmented enforcer in armored vest, cybernetic arm, carrying a heavy carbine", [4]),
    ("Combat drone", "1 hex", "a four-rotor combat drone with a slung gun pod and a red sensor eye", [4]),
    ("Corporate assassin", "1 hex", "a slim assassin in a matte black stealth suit, mask and long-barreled pistol", [4]),
    ("Ves Oro-Lan, the debt-broker", "1 hex", "a smiling Tessan debt-broker in rich robes and jewelry, a data tablet in hand", [1]),
    ("The Warden", "1 hex", "the colony ship's AI made visible: an orb of glowing amber lattice, like living bark lit from inside", [5]),
  ]},
  "fantasy": {"rim": "worn gold", "tokens": [
    ("Cultist of the Burning God", "1 hex", "a desert cultist in red robes and a sun mask, carrying a curved knife and a torch", [2]),
    ("Blessed cultist", "1 hex", "a cultist leader in red and gold robes, hands wreathed in holy fire", [2]),
    ("Dask, the sellsword captain", "1 hex", "a scarred sellsword captain in a mail shirt and desert cloak, scimitar drawn", [1, 6]),
    ("Guardsman", "1 hex", "a caravan guard in a leather coat and turban, with a spear and round shield", [6]),
    ("Tomb-dead", "1 hex", "a dried, mummified warrior risen from a burial niche, in rotted wrappings and old bronze armor", [6]),
    ("Ssethra, the serpent-priest", "3 hexes", "a huge serpent-priest of the old kings, a man's torso on a coiled snake's body, wet and scaled, a crown of gold on its hood", [7]),
    ("Ysolde Varr, the merchant princess", "1 hex", "a merchant princess in silks and gold, a fan in one hand", [1]),
  ]},
  "aurora": {"rim": "chrome", "tokens": [
    ("Lupe Herrera", "1 hex", "a frightened fifteen-year-old girl in a hoodie, wreathed in crackling electric-blue lightning", [1, 2, 3]),
    ("Foundation retrieval agent", "1 hex", "an agent in unmarked black tactical gear and a faceless helmet, carrying a stun rifle", [3]),
    ("Sergei Grachyov", "1 hex", "a calm, broad man in a long dark coat, hands in his pockets, faint distortion in the air around him", [3]),
  ]},
}


def kit_maps(gid):
    """What the GM view's playtest kit needs for an adventure's maps and tokens: its bucket folder, the scenes (number,
    name, yards a hex or None) and the tokens (name, size in hexes or "ship")."""
    a = next((x for x in ADVENTURES if x["id"] == gid), None)
    if not a: return None
    hexy = lambda h: int(h.split()[0]) if h.split()[0].isdigit() else None
    return {"folder": a["folder"], "scenes": [{"n": k + 1, "name": n, "hex": hexy(h), "hexText": h, "area": ar} for k, (n, h, ar, _d) in enumerate(a["scenes"])],
            "tokens": [{"name": n, "size": z, "look": l} for n, z, l, _sc in TOKENS[gid]["tokens"]]}
