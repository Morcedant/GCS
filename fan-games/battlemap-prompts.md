# Battle map, portrait and token prompts for the fan games

Prompts for an image tool (ChatGPT, Midjourney, Gemini, or similar). Maps have no grid: the GM view's battle map draws its own hexes over the picture. Upload the pictures into the table server's bucket (**legend-music**, in the Cloudflare dashboard: R2), in each game's folder below; the GM view picks them up by name.

## USS Pelion: The Silence at Corvan II

Upload every picture into the table server's bucket, in **battle-maps/uss-pelion/**. The GM view finds them there.

**Series prompt**

```
I'm running a tabletop RPG adventure and need a series of battle maps, one image per scene. Make them one at a time, in the order below, and keep the same art style across the whole series so they look like a set.

Every map follows these rules: Top-down battle map for a tabletop roleplaying game, seen from directly overhead (orthographic, no perspective tilt, no horizon). Fill the whole frame edge to edge: no border, frame, vignette, compass or legend. No grid, no text, no labels, no numbers. Show only the place itself: no people, creatures, animals, figures or tokens, and no ships or vehicles that could take part in a fight (they are separate tokens placed on top of the map); only wrecked, parked or abandoned vehicles that the scene names. Floors and ground read clearly as open, walkable space; walls, furniture, rocks and other cover are easy to tell apart from above, with soft shadows that show their height. Landscape, 16:9.

Art style for this adventure: Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners.

The scenes (each with the area it should show):
1. Arrival: the raider in orbit (many kilometers across): High orbit over Corvan II, a green-and-ochre world with one small grey moon: the planet's curve filling one side, the moon's limb on the other, a drift of debris from an old survey satellite for cover, and open space between.
2. The outpost (about 40 by 22 yards): A small Federation research outpost on a hillside: three prefabricated modules in a row (a lab, a bunkhouse, a comms shack with a dish), a transporter pad, crates of survey gear, an empty shuttle landing pad; lights on, doors open, nobody there. At one edge, a camouflaged observation blind looking down into a valley.
3. The Ketari village (about 50 by 28 yards): A bronze-age village in a river valley: round mud-brick houses with thatched roofs, a central fire pit, a forge with bronze tools, drying racks, a palisade of sharpened stakes with a gate, a stone shrine at one end, and a path leading up the hill toward ruins.
4. The ruins: the Orions dig (about 40 by 22 yards): An ancient alien ruin half-buried in the hillside: tilted monoliths of smooth dark stone carved with geometric patterns, a sunken plaza, fallen pillars for cover, and a fresh excavation trench cut into the center, with a cutting rig, salvage crates and work lights around a glowing seam in the stone.
5. The caretaker's chamber (about 24 by 14 yards): A vaulted chamber deep inside the ruins: walls of the same dark stone lit by lines of soft blue light, eight stasis alcoves in an arc, each a shimmering field of pale light, and at the center a pedestal where the caretaker's machine core glows.

Start with scene 1. After each one, wait for me to say "next" before making the next. When a scene says it's the same place as an earlier one, keep that earlier map's layout exactly and change only what the scene describes.
```

### 1. Arrival: the raider in orbit

Battle map setting: ship scale (use the range track, or a large hex size).

Name the picture starting with its number, e.g. `1 - arrival.png`.

```
High orbit over Corvan II, a green-and-ochre world with one small grey moon: the planet's curve filling one side, the moon's limb on the other, a drift of debris from an old survey satellite for cover, and open space between. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. Top-down battle map for a tabletop roleplaying game, seen from directly overhead (orthographic, no perspective tilt, no horizon). Fill the whole frame edge to edge: no border, frame, vignette, compass or legend. No grid, no text, no labels, no numbers. Show only the place itself: no people, creatures, animals, figures or tokens, and no ships or vehicles that could take part in a fight (they are separate tokens placed on top of the map); only wrecked, parked or abandoned vehicles that the scene names. Floors and ground read clearly as open, walkable space; walls, furniture, rocks and other cover are easy to tell apart from above, with soft shadows that show their height. Landscape, 16:9.
```

### 2. The outpost

Battle map setting: **2 yards a hex**.

Name the picture starting with its number, e.g. `2 - the outpost.png`.

```
A small Federation research outpost on a hillside: three prefabricated modules in a row (a lab, a bunkhouse, a comms shack with a dish), a transporter pad, crates of survey gear, an empty shuttle landing pad; lights on, doors open, nobody there. At one edge, a camouflaged observation blind looking down into a valley. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. Top-down battle map for a tabletop roleplaying game, seen from directly overhead (orthographic, no perspective tilt, no horizon). Fill the whole frame edge to edge: no border, frame, vignette, compass or legend. No grid, no text, no labels, no numbers. Show only the place itself: no people, creatures, animals, figures or tokens, and no ships or vehicles that could take part in a fight (they are separate tokens placed on top of the map); only wrecked, parked or abandoned vehicles that the scene names. Floors and ground read clearly as open, walkable space; walls, furniture, rocks and other cover are easy to tell apart from above, with soft shadows that show their height. Landscape, 16:9.
```

### 3. The Ketari village

Battle map setting: **2 yards a hex**.

Name the picture starting with its number, e.g. `3 - the ketari village.png`.

```
A bronze-age village in a river valley: round mud-brick houses with thatched roofs, a central fire pit, a forge with bronze tools, drying racks, a palisade of sharpened stakes with a gate, a stone shrine at one end, and a path leading up the hill toward ruins. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. Top-down battle map for a tabletop roleplaying game, seen from directly overhead (orthographic, no perspective tilt, no horizon). Fill the whole frame edge to edge: no border, frame, vignette, compass or legend. No grid, no text, no labels, no numbers. Show only the place itself: no people, creatures, animals, figures or tokens, and no ships or vehicles that could take part in a fight (they are separate tokens placed on top of the map); only wrecked, parked or abandoned vehicles that the scene names. Floors and ground read clearly as open, walkable space; walls, furniture, rocks and other cover are easy to tell apart from above, with soft shadows that show their height. Landscape, 16:9.
```

### 4. The ruins: the Orions dig

Battle map setting: **2 yards a hex**.

Name the picture starting with its number, e.g. `4 - the ruins.png`.

```
An ancient alien ruin half-buried in the hillside: tilted monoliths of smooth dark stone carved with geometric patterns, a sunken plaza, fallen pillars for cover, and a fresh excavation trench cut into the center, with a cutting rig, salvage crates and work lights around a glowing seam in the stone. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. Top-down battle map for a tabletop roleplaying game, seen from directly overhead (orthographic, no perspective tilt, no horizon). Fill the whole frame edge to edge: no border, frame, vignette, compass or legend. No grid, no text, no labels, no numbers. Show only the place itself: no people, creatures, animals, figures or tokens, and no ships or vehicles that could take part in a fight (they are separate tokens placed on top of the map); only wrecked, parked or abandoned vehicles that the scene names. Floors and ground read clearly as open, walkable space; walls, furniture, rocks and other cover are easy to tell apart from above, with soft shadows that show their height. Landscape, 16:9.
```

### 5. The caretaker's chamber

Battle map setting: **1 yard a hex**.

Name the picture starting with its number, e.g. `5 - the caretaker's chamber.png`.

```
A vaulted chamber deep inside the ruins: walls of the same dark stone lit by lines of soft blue light, eight stasis alcoves in an arc, each a shimmering field of pale light, and at the center a pedestal where the caretaker's machine core glows. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. Top-down battle map for a tabletop roleplaying game, seen from directly overhead (orthographic, no perspective tilt, no horizon). Fill the whole frame edge to edge: no border, frame, vignette, compass or legend. No grid, no text, no labels, no numbers. Show only the place itself: no people, creatures, animals, figures or tokens, and no ships or vehicles that could take part in a fight (they are separate tokens placed on top of the map); only wrecked, parked or abandoned vehicles that the scene names. Floors and ground read clearly as open, walkable space; walls, furniture, rocks and other cover are easy to tell apart from above, with soft shadows that show their height. Landscape, 16:9.
```

### The characters

A portrait (for the sheet) and a token (for the battle map) for each ready-made character, named `portrait - <name>` and `token - <name>`.

#### Thelan sh'Vari

Portrait:

```
Thelan sh'Vari, Lieutenant Commander: a command officer, Andorian (blue-skinned, antennaed people from the icy moon Andoria). First officer: keeps the crew moving when the captain's plan meets reality, and keeps the captain honest. Carrying: communicator, hand phaser. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Thelan sh'Vari, Lieutenant Commander: a command officer, Andorian (blue-skinned, antennaed people from the icy moon Andoria). First officer: keeps the crew moving when the captain's plan meets reality, and keeps the captain honest. Carrying: communicator, hand phaser. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Sevek

Portrait:

```
Sevek, Lieutenant: a science officer, Vulcan (physically stronger than humans and trained from childhood in logic and emotional control). Ship's sciences officer: reads the anomaly, names the risk, and calculates the odds no one asked for. Carrying: communicator, tricorder, hand phaser. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Sevek, Lieutenant: a science officer, Vulcan (physically stronger than humans and trained from childhood in logic and emotional control). Ship's sciences officer: reads the anomaly, names the risk, and calculates the odds no one asked for. Carrying: communicator, tricorder, hand phaser. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Dr. Vessik

Portrait:

```
Dr. Vessik, Lieutenant Commander: a medical officer, Denobulan (cheerful, sociable people with large extended families). Chief medical officer: patches up the crew, argues with the captain, and keeps an alarming menagerie of medicinal creatures in sickbay. Carrying: communicator, tricorder, medical scanner. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Dr. Vessik, Lieutenant Commander: a medical officer, Denobulan (cheerful, sociable people with large extended families). Chief medical officer: patches up the crew, argues with the captain, and keeps an alarming menagerie of medicinal creatures in sickbay. Carrying: communicator, tricorder, medical scanner. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Grath

Portrait:

```
Grath, Lieutenant: an engineering officer, Tellarite (stocky, stubborn, and fond of argument as a form of respect). Engineer: keeps the Pelion's power flowing and will tell you, at length, exactly why your idea won't work. Carrying: communicator, hand phaser. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Grath, Lieutenant: an engineering officer, Tellarite (stocky, stubborn, and fond of argument as a form of respect). Engineer: keeps the Pelion's power flowing and will tell you, at length, exactly why your idea won't work. Carrying: communicator, hand phaser. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Marisol Reyes

Portrait:

```
Marisol Reyes, Lieutenant (j.g.): a security officer, Human (adaptable and widespread across Starfleet). Security officer: first through the door on every away mission, and the last to set a phaser to kill. Carrying: communicator, hand phaser. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Marisol Reyes, Lieutenant (j.g.): a security officer, Human (adaptable and widespread across Starfleet). Security officer: first through the door on every away mission, and the last to set a phaser to kill. Carrying: communicator, hand phaser. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Rrinn

Portrait:

```
Rrinn, Yeoman 2nd Class: a general services crewman, Caitian (a feline species with keen senses and quick reflexes; Lt). Captain's yeoman: keeps the records, carries the orders, and hears everything said on the bridge. Carrying: communicator, tricorder. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Rrinn, Yeoman 2nd Class: a general services crewman, Caitian (a feline species with keen senses and quick reflexes; Lt). Captain's yeoman: keeps the records, carries the orders, and hears everything said on the bridge. Carrying: communicator, tricorder. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

### Tokens for The Silence at Corvan II

Everyone and everything else that fights or moves in a scene, made apart from the maps. Name each starting `token`, for example `token - uss pelion.png`.

#### USS Pelion

On the map: ship · 1. Arrival: the raider in orbit.

```
A Federation starship: a saucer hull, a slim secondary hull and two long warp nacelles on pylons, white hull with pale grey panel lines. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single top-down token of a starship for a tabletop roleplaying game, square image (1:1): the ship seen from directly above, bow pointing straight up, centered, filling most of the frame, with a faint shadow. Plain flat white background (or transparent, if the tool can), so it cuts out cleanly. No text, no name, no numbers, no stars or other ships.
```

#### Orion raider

On the map: ship · 1. Arrival: the raider in orbit.

```
A lean, predatory green-hulled raider with swept-forward wings and mismatched salvaged plating. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single top-down token of a starship for a tabletop roleplaying game, square image (1:1): the ship seen from directly above, bow pointing straight up, centered, filling most of the frame, with a faint shadow. Plain flat white background (or transparent, if the tool can), so it cuts out cleanly. No text, no name, no numbers, no stars or other ships.
```

#### Orion pirate

On the map: 1 hex · 4. The ruins: the Orions dig.

```
A green-skinned pirate in leather and scavenged armor plates, a disruptor pistol in hand. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Ketari warrior

On the map: 1 hex · 3. The Ketari village; 4. The ruins: the Orions dig.

```
A bronze-age warrior in leather armor with a bronze-tipped spear and a stolen energy pistol tucked in the belt. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### The Ketari chieftain

On the map: 1 hex · 3. The Ketari village.

```
A proud chieftain in a feathered cloak and a bronze torc, holding a stolen energy pistol like a talisman. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### The caretaker

On the map: 1 hex · 5. The caretaker's chamber.

```
A tall, smooth android shell of dark stone veined with soft blue light, faceless but courteous. Painted 1960s-style starship science fiction: bold saturated gold, blue and red, painted alien skies in ochre and violet, studio-like rock formations, clean geometric Federation outpost modules with rounded corners. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin brushed gold rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

## Grimm

Upload every picture into the table server's bucket, in **battle-maps/grimm/**. The GM view finds them there.

### The characters

A portrait (for the sheet) and a token (for the battle map) for each ready-made character, named `portrait - <name>` and `token - <name>`.

#### Eliza Kessler

Portrait:

```
Eliza Kessler, Deputy U.S. Marshal: a lawman, Grimm (a descendant of the old hunters, the Decapitare: stronger and faster than ordinary people, able to see the Wesen hidden among us, and feared by them). Wears the badge: the law, and the Code, in one person. Carrying: revolver, rifle, grimm's journals. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Eliza Kessler, Deputy U.S. Marshal: a lawman, Grimm (a descendant of the old hunters, the Decapitare: stronger and faster than ordinary people, able to see the Wesen hidden among us, and feared by them). Wears the badge: the law, and the Code, in one person. Carrying: revolver, rifle, grimm's journals. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Gus Brandt

Portrait:

```
Gus Brandt, Blacksmith and gunsmith: a tinker, Blutbad (wolf-like Wesen with keen senses and a predator's appetite; the root of the werewolf legend). Shoes the horses, fixes the guns, and hasn't hunted in eleven years. Carrying: shotgun, knife, tool roll. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Gus Brandt, Blacksmith and gunsmith: a tinker, Blutbad (wolf-like Wesen with keen senses and a predator's appetite; the root of the werewolf legend). Shoes the horses, fixes the guns, and hasn't hunted in eleven years. Carrying: shotgun, knife, tool roll. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Roz Vey

Portrait:

```
Roz Vey, Spice and tea merchant: an apothecary, Fuchsbau (fox-like Wesen, clever and quick, with a long tradition of trade in herbs, remedies and harder-to-find ingredients). Sells tea out front, and other things in the back. Carrying: doctor's bag, knife, lantern and matches. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Roz Vey, Spice and tea merchant: an apothecary, Fuchsbau (fox-like Wesen, clever and quick, with a long tradition of trade in herbs, remedies and harder-to-find ingredients). Sells tea out front, and other things in the back. Carrying: doctor's bag, knife, lantern and matches. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Dr. Thaddeus Whitlock

Portrait:

```
Dr. Thaddeus Whitlock, Town physician: a doctor, Human (most people are human). Army surgeon in the war; now he digs bullets out of his friends and asks too many questions about what made the other wounds. Carrying: doctor's bag, lantern and matches. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Dr. Thaddeus Whitlock, Town physician: a doctor, Human (most people are human). Army surgeon in the war; now he digs bullets out of his friends and asks too many questions about what made the other wounds. Carrying: doctor's bag, lantern and matches. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Cora Ridgeway

Portrait:

```
Cora Ridgeway, Scout: a scout, Coyotl (coyote-like Wesen of the plains and desert country who live in clans bound by old customs, and fight together like a pack). Knows the desert and the high country, and keeps her clan's ways close. Carrying: rifle, knife. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Cora Ridgeway, Scout: a scout, Coyotl (coyote-like Wesen of the plains and desert country who live in clans bound by old customs, and fight together like a pack). Knows the desert and the high country, and keeps her clan's ways close. Carrying: rifle, knife. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Silas Thorne

Portrait:

```
Silas Thorne, Professional gambler: a gambler, Ziegevolk (goat-like Wesen whose pheromones, working even in human form, make them unnaturally persuasive and unnaturally popular). Charming, well-dressed, and in debt to the wrong people. Carrying: revolver. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Silas Thorne, Professional gambler: a gambler, Ziegevolk (goat-like Wesen whose pheromones, working even in human form, make them unnaturally persuasive and unnaturally popular). Charming, well-dressed, and in debt to the wrong people. Carrying: revolver. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Magdalena "Lena" Baer

Portrait:

```
Magdalena "Lena" Baer, Braucher: an occultist, Incantare (a human who works real magic through a Lens: a tradition and a way of seeing). Came west from Lancaster County with a wagon, a Bible and her grandmother's Long Lost Friend. Heals for gifts, and breaks hexes for no one's money. Carrying: shotgun, lantern and matches, himmelsbrief. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A character portrait for a tabletop roleplaying game, portrait orientation (3:4): head and shoulders to the waist, facing the viewer, a clear, characterful face and pose, the gear they carry visible where it fits. A plain, softly lit background in the adventure's palette. No text, no name, no frame or border, no other people.
```

Token:

```
Magdalena "Lena" Baer, Braucher: an occultist, Incantare (a human who works real magic through a Lens: a tradition and a way of seeing). Came west from Lancaster County with a wagon, a Bible and her grandmother's Long Lost Friend. Heals for gifts, and breaks hexes for no one's money. Carrying: shotgun, lantern and matches, himmelsbrief. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

### Tokens

Everyone and everything else that fights or moves in a scene, made apart from the maps. Name each starting `token`, for example `token - hired gun.png`.

#### Hired gun

On the map: 1 hex.

```
A hard-faced hired gun in a duster and flat-brimmed hat, a revolver drawn. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Outlaw

On the map: 1 hex.

```
A scarred outlaw with a bandana over the face and a lever-action rifle. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Blutbad

On the map: 1 hex.

```
A Wesen in full woge, half man, half wolf: a lupine face with fangs and burning red eyes, in a workman's shirt and suspenders. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Siegbarste

On the map: 1 hex.

```
A huge, hulking Wesen in full woge, with a heavy brow, thick grey skin and a wooden club. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Mauvais Dentes

On the map: 1 hex.

```
A feline Wesen in full woge with long saber teeth and a sleek black coat, crouched to spring. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Hexenbiest

On the map: 1 hex.

```
A woman in a dark Victorian dress mid-woge, half her face decayed to the skull, eyes clouded, one hand raised. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Hundjager

On the map: 1 hex.

```
A dog-like Wesen hunter in full woge, in a long grey coat with a crossbow. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Wendigo

On the map: 1 hex.

```
A gaunt, ravenous Wesen in full woge with sunken eyes, long fingers and torn clothes. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Order of the Holy Knife assassin

On the map: 1 hex.

```
A hooded assassin in a dark robe with a curved dagger and a cross on a chain. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```

#### Brotherhood druid

On the map: 1 hex.

```
A robed druid with a staff of twisted oak and roots curling around the feet. Hand-painted gothic horror illustration of the American West in the 1880s, with old-country German touches: lamplight and long shadows, weathered timber, iron and brass, oxblood, bone white and lamp amber, like a hand-colored engraving. A single round token for a tabletop roleplaying game's battle map, square image (1:1). The subject is seen from directly overhead, the way it would look on the map below it, centered and filling most of a circle with a thin tarnished silver rim. Outside the circle, plain flat white (or transparent, if the tool can), so the token cuts out cleanly. No text, no name, no numbers, no scenery beyond a hint of ground or deck under the subject.
```
