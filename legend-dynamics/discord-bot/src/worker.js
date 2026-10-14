// Legend Dynamics dice bot: a Cloudflare Worker that answers Discord slash commands over HTTP.
// One self-contained file, so it can be pasted straight into the Cloudflare dashboard.
// Discord signs every request; unsigned or badly signed requests are rejected with 401.
// One bot serves every Legend Dynamics setting, plus USS Pelion and Grimm; the GM picks each server's game with /game.
//
// Settings (Cloudflare → Worker → Settings → Variables and Secrets):
//   DISCORD_PUBLIC_KEY       required, from the Discord Developer Portal
//   DISCORD_APPLICATION_ID   and DISCORD_BOT_TOKEN: only needed to register commands by visiting /register
//   DEFAULT_GAME             optional: the game a server starts on (western, spaceopera, fantasy, aurora, grimm or pelion); default western
// Binding (Settings → Bindings → KV namespace):
//   STORE                    optional; turns on /game, /points, /clock and /track, and makes rerolls spend real points
//                            (a USS Pelion or Grimm Worker's DUTY or GRIT binding works too)
//   LEGACY_COMMANDS          optional: "no" stops /register adding the old /pelion, /duty, /grimm and /grit names

// ---- Setting packs: written by tools/build-legend.py from legend-dynamics/packs/*/pack.json ----

/* PACKS:START */
export const PACKS = {
 "aurora": {
  "id": "aurora",
  "title": "Aurora",
  "point": "Spark",
  "mission": "Case",
  "trackTitle": "Collateral, Scrutiny and Backlash",
  "tracks": [
   {
    "name": "Collateral",
    "boxes": 4,
    "effects": [
     "Clean so far",
     "Property damage: insurance claims and angry owners",
     "Bystanders hurt: −2 to Media and Persuasion with the public",
     "Lawsuits and charges: someone is held liable",
     "An EPAOC hearing: start a clock; a team member may lose their status"
    ]
   },
   {
    "name": "Scrutiny",
    "boxes": 4,
    "effects": [
     "Nobody's looking",
     "Questions in a report",
     "Flagged: −2 at checkpoints, cordons and with federal agencies",
     "Investigated: ExLAW or the FBI opens a file on you",
     "Hunted: the Foundation or Raster Zero takes an interest; start a clock"
    ]
   },
   {
    "name": "Backlash",
    "boxes": 4,
    "effects": [
     "The public trusts you",
     "Talk shows ask hard questions",
     "Protests: −2 to Media and Leadership with crowds",
     "Anti-Operant laws proposed; Operant friends blame you",
     "Riots: the next case starts in a city that wants you gone"
    ]
   }
  ],
  "seeds": {
   "mission": [
    "The case",
    [
     "A breach opens where the Umkas came through",
     "Raster Zero's existence leaks",
     "Recover a Hephaestus Key before the Foundation",
     "A Raster Seven transfer goes wrong",
     "Bring in an Operant who just woke up, before someone else does",
     "An Operant bank robbery",
     "Protect an EPAOC witness",
     "Find a missing registration file",
     "Arrest a Non-registered vigilante",
     "Investigate a powers-related death",
     "Stop a Morcain shipment of Ambrosia",
     "Escort an Operant to a hearing",
     "A hero's sponsor wants a scandal buried",
     "A White Hand cell on US soil",
     "A Shadow Earth duplicate replaces someone important",
     "The Atomic Man asks for help"
    ]
   ],
   "place": [
    "Where",
    [
     "Raster Eight, in orbit",
     "Tesla's 1884 Paris, through a door",
     "A Foundation black lab, abandoned",
     "The Mad Forest's edge, south of Bloomington",
     "The Chicago Loop memorial",
     "A Manhattan rooftop at night",
     "An ExLAW regional office",
     "A small town in the Midwest",
     "A Los Angeles studio lot",
     "A Morcain casino in Macau",
     "The New Power Legion's tower",
     "A university archive",
     "A subway tunnel the city forgot",
     "Buenos Aires, White Hand territory",
     "A haven in Otherworld",
     "Shadow Earth's mirror of your city"
    ]
   ],
   "strange": [
    "The Operant angle",
    [
     "Two people with the same power and the same face",
     "A power the EMD says can't exist",
     "Someone's powers woke tonight",
     "A Shadow Earth duplicate",
     "An Operant who doesn't know they are one",
     "A stolen power: someone mimicked it",
     "A Lab-made escapee",
     "A Non-registered Operant hiding in plain sight",
     "A ritual done badly",
     "A bonded artifact looking for a new host",
     "A power for sale",
     "An Aegis suit that moves on its own",
     "A spirit riding someone",
     "A Class V power in an ordinary person",
     "The 1938 auroras, back for a night",
     "A third wave beginning"
    ]
   ],
   "twist": [
    "The twist",
    [
     "The Director knew all along",
     "One of you is in the Raster Zero files",
     "The victim is the culprit",
     "ExLAW wants it buried",
     "The Foundation is already there",
     "The villain is right",
     "A friend is being blackmailed",
     "The witness is lying for a good reason",
     "The press arrives first",
     "It was an accident",
     "The real target is someone else",
     "The local police want it more than you do",
     "A rival team is on the same case",
     "The Morcain want to help",
     "The culprit is a duplicate of someone on the team",
     "Shadow Earth planned this"
    ]
   ],
   "clock": [
    "Ticking clock",
    [
     [
      "The breach widens",
      8
     ],
     [
      "The Atomic Man loses patience",
      6
     ],
     [
      "The escapee's power destabilizes",
      6
     ],
     [
      "Raster Seven's transfer convoy leaves",
      4
     ],
     [
      "The press arrives",
      4
     ],
     [
      "The witness disappears",
      4
     ],
     [
      "The bomb goes off",
      6
     ],
     [
      "The mob forms",
      4
     ],
     [
      "Federal agents take the case",
      4
     ],
     [
      "The EPAOC subpoena",
      6
     ],
     [
      "The Morcain clean house",
      6
     ],
     [
      "The ritual completes at midnight",
      6
     ],
     [
      "The building comes down",
      4
     ],
     [
      "The sponsor pulls out",
      6
     ],
     [
      "Shadow Earth's rulers notice",
      8
     ],
     [
      "The third wave",
      8
     ]
    ]
   ],
   "who": [
    "Key character",
    [
     "Director Steven Humbacht",
     "Nikola Tesla, visiting",
     "A Foundation scientist with a conscience",
     "Celerity, on the run",
     "A frightened new Operant",
     "An EPAOC staffer",
     "A Morcain fixer who owes you",
     "A sheriff on the edge of the Mad Forest",
     "A reporter with a theory",
     "An ExLAW agent who doesn't trust Operants",
     "A New Power Legion star",
     "A Shadow Knight",
     "An Earth Warden",
     "Michael Lance, out of his time",
     "Steel Hawk, offering a deal",
     "Your own Shadow Earth duplicate"
    ]
   ]
  }
 },
 "fantasy": {
  "id": "fantasy",
  "title": "The Shattered Crown",
  "point": "Fortune",
  "mission": "Venture",
  "trackTitle": "Troubles",
  "tracks": [
   {
    "name": "Infamy",
    "boxes": 4,
    "effects": [
     "Unknown",
     "Talk in the taverns",
     "Wanted posters: −2 to Persuasion with the watch",
     "Bounty hunters on your trail",
     "Outlawed: start a Manhunt clock"
    ]
   },
   {
    "name": "Doom",
    "boxes": 4,
    "effects": [
     "Unnoticed",
     "Ill omens: ravens, black cats, bad dreams",
     "A sorcerer scries you: −2 to Stealth against magic",
     "Its servants come hunting",
     "It comes for you: start a clock"
    ]
   },
   {
    "name": "Debt",
    "boxes": 4,
    "effects": [
     "Paid up",
     "A reminder, politely delivered",
     "Collectors: −2 to Persuasion with merchants",
     "Your gear or mounts are seized",
     "A creditor names the price: a job you can't refuse"
    ]
   },
   {
    "name": "Hunger",
    "boxes": 4,
    "effects": [
     "Well supplied",
     "Short rations",
     "Hungry: −1 to all rolls on the road",
     "Starving: hirelings desert, mounts falter",
     "Collapse: find food today or someone dies"
    ]
   }
  ],
  "seeds": {
   "mission": [
    "Venture",
    [
     "Steal from a god",
     "Carry a shard back to the Ashlands",
     "Rob a merchant prince's vault",
     "Loot a tomb of the serpent kings",
     "Rescue a captive from a sorcerer's tower",
     "Escort a caravan across the Burning Sands",
     "Steal a shard of the Crown",
     "Hunt a beast that's eating a village",
     "Guard a prince who hired you to die for him",
     "Find a lost city in the jungle",
     "Break a friend out of the arena pits",
     "Deliver a cursed idol before the moon is full",
     "Win a war for a warlord who can't pay",
     "Recover a stolen god",
     "Kill a sorcerer-prince",
     "Crown a new king"
    ]
   ],
   "place": [
    "Place",
    [
     "The palace of a sorcerer-prince",
     "Inside a dead god",
     "A decadent city of the Gilded Coast",
     "A clan hall in the Frozen North",
     "A buried city in the Burning Sands",
     "A corsair haven in the Shattered Isles",
     "A Deepkin city under the mountains",
     "The blasted Ashlands where the Crown broke",
     "A sorcerer's tower above a swamp",
     "An arena and its slave pits",
     "A jungle temple strangled by vines",
     "A plague-struck port",
     "A ship becalmed on a black sea",
     "A monastery of a dying god",
     "A city on the back of a great beast",
     "The edge of the known world"
    ]
   ],
   "strange": [
    "The darkness",
    [
     "Two shards in one place",
     "A god returning",
     "A sorcerer-prince who holds a Crown shard",
     "A demon summoned and not dismissed",
     "A cult that feeds its god with the living",
     "Serpent-priests rising from the deep temples",
     "A tomb whose dead will not stay dead",
     "A thing from the Deep that dreams of the surface",
     "A curse on a royal bloodline",
     "A lotus that makes slaves of those who dream",
     "A god's corpse leaking power",
     "An Undying sorcerer and their phylactery",
     "A beast-cult of skinchangers",
     "A shard that whispers to whoever holds it",
     "The last emperor, Undying",
     "A demon prince walking free"
    ]
   ],
   "twist": [
    "Twist",
    [
     "A character holds a shard and didn't know it",
     "The prize is a god's trap",
     "The employer plans to betray you",
     "The treasure is a living thing",
     "A rival band wants the same prize",
     "The monster is protecting something",
     "The victim was the villain",
     "A character's complication comes into play",
     "The shard is a fake, or the real one is somewhere else",
     "The guards are already dead",
     "Someone in the party is marked by the darkness",
     "The sorcerer wants to be stopped",
     "The city is about to fall",
     "The god is listening",
     "The villain is a character's parent",
     "It's all a sorcerer's dream"
    ]
   ],
   "clock": [
    "Ticking clock",
    [
     [
      "The eclipse",
      6
     ],
     [
      "The god awakens",
      8
     ],
     [
      "The guards change watch",
      4
     ],
     [
      "The ritual completes at moonrise",
      6
     ],
     [
      "The tomb floods",
      4
     ],
     [
      "The mob storms the palace",
      6
     ],
     [
      "The ship sails at dawn",
      4
     ],
     [
      "The demon breaks its binding",
      6
     ],
     [
      "The sands bury the city again",
      8
     ],
     [
      "The plague reaches the port",
      8
     ],
     [
      "The rival band arrives",
      6
     ],
     [
      "The sorcerer finishes the scrying",
      4
     ],
     [
      "The tower collapses",
      4
     ],
     [
      "The water runs out",
      6
     ],
     [
      "The shard claims its bearer",
      6
     ],
     [
      "The city sinks",
      8
     ]
    ]
   ],
   "who": [
    "Key character",
    [
     "An emperor's ghost",
     "A god in mortal form",
     "A merchant prince with a hidden debt",
     "A sorcerer who needs one more sacrifice",
     "A slave who knows the way in",
     "A corsair queen",
     "A priest of a dead god",
     "A Northland jarl's runaway heir",
     "A Deepkin smith who forged something terrible",
     "A serpent-kin scholar",
     "A mercenary captain with a grudge",
     "A child who hears the Crown",
     "A demon in a human skin",
     "An old thief's last apprentice",
     "The Crown's last keeper",
     "A child who is a shard reborn"
    ]
   ]
  }
 },
 "spaceopera": {
  "id": "spaceopera",
  "title": "Fracture Lines",
  "point": "Resolve",
  "mission": "Job",
  "trackTitle": "Debt, Heat, Reputation and Hull",
  "tracks": [
   {
    "name": "Debt",
    "boxes": 4,
    "effects": [
     "No debts worth mentioning",
     "A payment comes due",
     "Collectors call: −2 to Commerce with lenders",
     "Liens: your ship or gear can be seized",
     "Default: a creditor names the price, a job you can't refuse"
    ]
   },
   {
    "name": "Heat",
    "boxes": 4,
    "effects": [
     "Nobody's looking",
     "Questions asked at the last port",
     "Flagged: −2 at checkpoints and screenings",
     "Hunted: a bounty, a warrant or an inquisitor",
     "Cornered: start a Manhunt clock"
    ]
   },
   {
    "name": "Reputation",
    "boxes": 4,
    "effects": [
     "Unknown",
     "Talked about in the ports",
     "Recognized: +2 to Diplomacy with admirers, −2 to Stealth",
     "Famous: everyone wants something from you",
     "Legend: someone powerful comes calling; start a clock"
    ]
   },
   {
    "name": "Hull",
    "boxes": 4,
    "effects": [
     "Sound",
     "Scarred: breaches sealed, no penalty yet",
     "A system hit: −2 to the drive, the weapons or the sensors",
     "Crippled: −2 to every ship roll; the corridor drive won't engage",
     "Breaking up: start an Abandon ship clock"
    ]
   }
  ],
  "seeds": {
   "mission": [
    "Job or mission",
    [
     "Recover an imperial fleet stranded for centuries",
     "Broker a peace inside the Hegemony",
     "Deliver cargo through a contested corridor",
     "Collect, or escape, a debt",
     "Find a missing ship",
     "Escort a refugee convoy",
     "Recover a stolen archive",
     "Smuggle a psionic past the Mandates",
     "Survey a newly opened corridor",
     "Negotiate a contract between peoples",
     "Rescue hostages",
     "Salvage a war wreck",
     "Expose a corporate crime",
     "Protect a witness",
     "Open a corridor no one has crossed",
     "Steal an Ozhvek house's seal"
    ]
   ],
   "place": [
    "Place",
    [
     "A province isolated for six centuries, newly reopened",
     "The Hegemony's throne world",
     "A Tessan exchange station",
     "A Concord colony on the frontier",
     "A Vael flotilla",
     "A Brulvek shipyard rusting in orbit",
     "A Veyari library world",
     "A Khaum cavern city",
     "A dead Hegemony fortress",
     "A Zhaq free city",
     "A derelict generation ship",
     "A Corvani restoration world",
     "The Vesh homeworld, newly opened",
     "A Draelin navigation guild-house",
     "The heart of a corridor collapse",
     "A Sen observatory older than the Hegemony"
    ]
   ],
   "strange": [
    "The trouble",
    [
     "The corridor network shifts across a whole region",
     "An imperial fleet stranded for 300 years emerges",
     "A corridor is collapsing",
     "A Hegemony fleet emerges from a reopened corridor",
     "Mandate inquisitors are screening everyone",
     "A rogue AI has taken over the systems",
     "A Kel radical cell plans an attack",
     "A plague engineered with biotech",
     "Two corporations at war by proxy",
     "An Ozhvek house's succession war",
     "Stolen corridor charts",
     "An unpayable debt changes hands",
     "Something old wakes in the ruins",
     "A cybernetic augment goes haywire",
     "An emperor dies without an heir",
     "A psionic awakening across a whole world"
    ]
   ],
   "twist": [
    "Twist",
    [
     "The corridors aren't natural",
     "A character is heir to an Ozhvek house",
     "The client is the target",
     "The cargo is a person",
     "A character's complication comes into play",
     "Both sides hired you",
     "The debt is forgeable",
     "The psionic is a child",
     "The Hegemony was right, this time",
     "The rescue isn't wanted",
     "The map is wrong",
     "The ally is a Mandate informant",
     "The ship is alive",
     "The wreck isn't empty",
     "The Tessan planned the war",
     "The AI is older than the Hegemony"
    ]
   ],
   "clock": [
    "Ticking clock",
    [
     [
      "The corridor network shifts",
      8
     ],
     [
      "The imperial ultimatum",
      4
     ],
     [
      "The corridor closes",
      6
     ],
     [
      "The debt comes due",
      4
     ],
     [
      "The fleet arrives",
      6
     ],
     [
      "The inquisitor's scan finishes",
      4
     ],
     [
      "The station's life support fails",
      6
     ],
     [
      "The AI copies itself out",
      4
     ],
     [
      "The evidence is erased",
      4
     ],
     [
      "The convoy is discovered",
      6
     ],
     [
      "The plague spreads",
      8
     ],
     [
      "The buyer walks away",
      4
     ],
     [
      "The corporation's lawyers arrive",
      6
     ],
     [
      "The corridor reopens",
      8
     ],
     [
      "The succession is decided",
      8
     ],
     [
      "The Mandate purge begins",
      6
     ]
    ]
   ],
   "who": [
    "Key character",
    [
     "The Emperor's exiled heir",
     "A Sen who remembers the Foundation",
     "A Tessan reformer",
     "A Kel radical",
     "A Dresh deserter",
     "A Veyari archivist",
     "A human entrepreneur",
     "A Shivar heretic",
     "A Draelin chart-seller",
     "A Vael flotilla elder",
     "An Ozhvek exile",
     "A Zhaq resistance cell",
     "A Vesh delegate",
     "An AI that wants to be free",
     "The first human to meet the Kel",
     "A psionic with no limits"
    ]
   ]
  }
 },
 "western": {
  "id": "western",
  "title": "Trails of Blood & Dust",
  "point": "Grit",
  "mission": "Job",
  "trackTitle": "Trouble",
  "tracks": [
   {
    "name": "Heat",
    "boxes": 4,
    "effects": [
     "The law isn't looking",
     "Questions at the sheriff's office",
     "Wanted posters: −2 to Persuasion with lawmen",
     "A posse is out",
     "A warrant and a manhunt: start a Manhunt clock"
    ]
   },
   {
    "name": "Whispers",
    "boxes": 4,
    "effects": [
     "Nobody's talking",
     "Talk of strange things in the saloon",
     "The preacher names you from the pulpit: −2 to Persuasion with townsfolk",
     "Folk bar their doors",
     "A mob with torches: start a Mob clock"
    ]
   },
   {
    "name": "The Dark",
    "boxes": 4,
    "effects": [
     "Nothing has noticed you",
     "Dogs howl at your door",
     "Signs and warnings: a marked door, a dead bird",
     "Something follows you at night",
     "It comes: start a clock"
    ]
   }
  ],
  "seeds": {
   "mission": [
    "Job",
    [
     "A whole town gone overnight",
     "A dead man hires you",
     "A body found drained of blood",
     "A stagecoach that never arrived",
     "Livestock torn apart in the night",
     "A child gone missing",
     "A miner raving about the dead walking",
     "A bounty on a man who died last year",
     "Travelers vanishing on the trail",
     "A traveling medicine show",
     "A new preacher packs the church",
     "A town where no one sleeps",
     "A hanging that went wrong",
     "A monster asks for help",
     "A train arrives with no one aboard",
     "A child asks you to kill their father, the monster"
    ]
   ],
   "place": [
    "Place",
    [
     "A town that isn't on any map",
     "A sanitarium in the hills",
     "A silver boomtown",
     "A logging camp in the deep woods",
     "A river steamboat",
     "The railroad's end-of-track camp",
     "A lonely homestead",
     "A ghost town",
     "A burned mission church",
     "A saloon and gambling hall",
     "A frontier fort",
     "A fog-bound waterfront",
     "A canyon cemetery",
     "A snowbound mountain pass",
     "A circus wintering in the badlands",
     "A mine sealed since the cave-in"
    ]
   ],
   "strange": [
    "The darkness",
    [
     "Something older than any of them, waking",
     "A hunter turned monster",
     "A werewolf that has acquired the taste",
     "A vampire who owns the town",
     "The dead rising from a flooded graveyard",
     "A witch's curse on a family",
     "A ghost that wants justice",
     "Ghouls in the mine",
     "A demon summoned by a desperate man",
     "A necromancer raising an army",
     "A revenant gunslinger",
     "A hellhound on someone's trail",
     "A cult in the church cellar",
     "A sorcerer's working gone wrong",
     "A town that made a pact",
     "A creature no one has a name for"
    ]
   ],
   "twist": [
    "Twist",
    [
     "A character is already cursed",
     "The monster is a character's kin",
     "The victim was the monster",
     "The law is in on it",
     "Two monsters are at war",
     "The client lied about everything",
     "A rich man pays for silence",
     "A character's complication comes into play",
     "The monster is protecting its family",
     "Someone is using the monster",
     "The town wants a hanging, any hanging",
     "The Order of the Iron Cross arrives to burn everything",
     "Another hunter is after the same prey",
     "The trail leads to someone a character loves",
     "The hunter is the monster",
     "It happened before, thirty years ago"
    ]
   ],
   "clock": [
    "Ticking clock",
    [
     [
      "The eclipse",
      4
     ],
     [
      "The last train out",
      6
     ],
     [
      "The mob forms",
      6
     ],
     [
      "Nightfall",
      4
     ],
     [
      "The full moon rises",
      4
     ],
     [
      "The next victim",
      6
     ],
     [
      "The dead finish rising",
      6
     ],
     [
      "The river floods",
      8
     ],
     [
      "The trail goes cold",
      4
     ],
     [
      "The hanging at dawn",
      4
     ],
     [
      "The ritual completes",
      6
     ],
     [
      "The fire spreads",
      4
     ],
     [
      "The curse takes hold",
      8
     ],
     [
      "The snows close the pass",
      8
     ],
     [
      "The body count doubles",
      6
     ],
     [
      "The pact comes due",
      8
     ]
    ]
   ],
   "who": [
    "Key character",
    [
     "A ghost who wants to help",
     "A monster who once saved a character's life",
     "A sheriff who wants it simple",
     "A widow who knows more than she says",
     "A traveling doctor",
     "A Pinkerton detective",
     "A railroad baron",
     "A frightened homesteader family",
     "A werewolf trying to stay human",
     "A child who saw it happen",
     "A preacher with a past",
     "A newspaperman who's close to the truth",
     "A witch who needs protection",
     "A dying hunter with a last request",
     "A senator with a secret",
     "The last of a hunter bloodline"
    ]
   ]
  }
 },
 "grimm": {
  "id": "grimm",
  "title": "Grimm",
  "point": "Grit",
  "mission": "Case",
  "trackTitle": "Trouble",
  "tracks": [
   {
    "name": "Suspicion",
    "boxes": 4,
    "effects": [
     "Nobody's looking",
     "Talk in the saloon",
     "Rumors: −2 to Persuasion with townsfolk",
     "The sheriff is watching you",
     "A warrant or a mob: start a Lynch mob clock"
    ]
   },
   {
    "name": "Exposure",
    "boxes": 4,
    "effects": [
     "The hidden world is hidden",
     "Odd stories going around",
     "The newspaper asks questions",
     "Wesen close ranks: −2 to Investigation among them",
     "The Wesen Council sends someone"
    ]
   },
   {
    "name": "Attention",
    "boxes": 4,
    "effects": [
     "No one's watching",
     "A stranger asks questions",
     "A mark or a warning",
     "They're in town",
     "They strike: start a clock"
    ]
   }
  ],
  "seeds": {
   "mission": [
    "Case",
    [
     "A Grimm's grave robbed",
     "The Wesen Council summons you",
     "A body torn apart at the edge of town",
     "A stagecoach that never arrived",
     "Livestock slaughtered in the night",
     "A child gone missing",
     "A miner raving about monsters",
     "A bounty on a man who isn't a man",
     "Travelers vanishing on the trail",
     "A traveling medicine show",
     "A new preacher packs the church",
     "A cattle drive spooked by something",
     "A hanging that went wrong",
     "A Wesen asks for help",
     "A Royal's child goes missing",
     "A town where everyone is Wesen"
    ]
   ],
   "place": [
    "Place",
    [
     "A Royal Family's estate",
     "A Wesen fight ring under a church",
     "A silver boomtown",
     "A logging camp in the deep woods",
     "A river steamboat",
     "The railroad's end-of-track camp",
     "A lonely homestead",
     "A ghost town",
     "A mission church",
     "A saloon and gambling hall",
     "A frontier fort",
     "A fog-bound waterfront",
     "A canyon ranch",
     "A snowbound mountain pass",
     "A Grimm's hidden library",
     "An abandoned asylum"
    ]
   ],
   "strange": [
    "The hidden world",
    [
     "A Hexenbiest queen",
     "The Wesen Council itself",
     "A Wendigo that has acquired the taste",
     "A Blutbad pack that's gone back to the hunt",
     "A Siegbarste whom bullets barely trouble",
     "A Mauvais Dentes, sent by a Royal Family",
     "A Spinnetod keeping herself young",
     "Geier selling organs to the highest bidder",
     "A Hexenbiest's curse",
     "A Ziegevolk swindler with half the town in thrall",
     "A Löwen fight ring",
     "A Hässlich demanding tolls at a bridge",
     "A Brotherhood of the Holy Earth rite against the railroad",
     "A Golden Dawn magician's working gone wrong",
     "A Grimm gone bad",
     "A Zauberbiest's working"
    ]
   ],
   "twist": [
    "Twist",
    [
     "A character has Wesen blood",
     "The Grimm is the target",
     "The victim was the monster",
     "The law is in on it",
     "Two Wesen clans are feuding",
     "The Wesen Council wants it hushed up",
     "A Royal Family's agent is behind it",
     "A character's complication comes into play",
     "The Wesen is protecting its family",
     "A human is using the Wesen",
     "The town wants a hanging, any hanging",
     "The Order of the Holy Knife arrives to cleanse",
     "Another Grimm hunts the same quarry",
     "The trail leads to someone a character loves",
     "The Royals want it to happen",
     "The Council wanted the Grimm to find it"
    ]
   ],
   "clock": [
    "Ticking clock",
    [
     [
      "The Royals arrive",
      6
     ],
     [
      "The full moon",
      4
     ],
     [
      "The mob forms",
      6
     ],
     [
      "Nightfall",
      4
     ],
     [
      "The next victim",
      6
     ],
     [
      "The stage leaves town",
      4
     ],
     [
      "The Reapers arrive",
      6
     ],
     [
      "The river floods",
      8
     ],
     [
      "The trail goes cold",
      4
     ],
     [
      "The hanging at dawn",
      4
     ],
     [
      "The newspaper prints the story",
      8
     ],
     [
      "The fire spreads",
      4
     ],
     [
      "The Wesen flees the territory",
      6
     ],
     [
      "The snows close the pass",
      8
     ],
     [
      "The Reapers' deadline",
      4
     ],
     [
      "The Council's verdict",
      6
     ]
    ]
   ],
   "who": [
    "Key character",
    [
     "A Royal heir in hiding",
     "A Grimm's long-lost sibling",
     "A sheriff who wants it simple",
     "A widow who knows more than she says",
     "A traveling doctor",
     "A Pinkerton detective",
     "A railroad baron",
     "A frightened Eisbiber family",
     "A Blutbad trying to stay clean",
     "A child who saw the woge",
     "A preacher with a past",
     "A newspaperman who's close to the truth",
     "An Incantare who needs protection",
     "A dying Grimm with a last request",
     "A Wesen Council judge",
     "A Hexenbiest who wants out"
    ]
   ]
  }
 },
 "pelion": {
  "id": "pelion",
  "title": "USS Pelion",
  "point": "Duty",
  "mission": "Mission",
  "trackTitle": "Ship status",
  "tracks": [
   {
    "name": "Shields",
    "boxes": 3,
    "effects": [
     "Up",
     "Weakened",
     "Failing",
     "Down: hits go to Hull and a system"
    ]
   },
   {
    "name": "Hull",
    "boxes": 4,
    "effects": [
     "Intact",
     "Scarred",
     "Minor breaches",
     "Serious breaches, decks lost",
     "Breaking up: start an Abandon ship clock"
    ]
   },
   {
    "name": "Weapons",
    "boxes": 3,
    "effects": [
     "Working",
     "Damaged: −2",
     "Crippled: −4, basic function only",
     "Offline"
    ]
   },
   {
    "name": "Engines",
    "boxes": 3,
    "effects": [
     "Working",
     "Damaged: −2",
     "Crippled: −4, basic function only",
     "Offline"
    ]
   },
   {
    "name": "Sensors",
    "boxes": 3,
    "effects": [
     "Working",
     "Damaged: −2",
     "Crippled: −4, basic function only",
     "Offline"
    ]
   },
   {
    "name": "Communications",
    "boxes": 3,
    "effects": [
     "Working",
     "Damaged: −2",
     "Crippled: −4, basic function only",
     "Offline"
    ]
   },
   {
    "name": "Transporters",
    "boxes": 3,
    "effects": [
     "Working",
     "Damaged: −2",
     "Crippled: −4, basic function only",
     "Offline"
    ]
   },
   {
    "name": "Life support",
    "boxes": 3,
    "effects": [
     "Working",
     "Damaged: −2",
     "Crippled: −4, basic function only",
     "Offline"
    ]
   }
  ],
  "seeds": {
   "mission": [
    "Mission",
    [
     "Answer a call from a ship lost a century ago",
     "Ferry a delegation to a world that left the Federation",
     "Answer a distress call",
     "Survey an uncharted system",
     "Make first contact",
     "Escort a diplomatic delegation",
     "Find a missing ship or outpost",
     "Deliver urgent medical supplies",
     "Evacuate a colony",
     "Patrol the Neutral Zone border",
     "Recover a lost probe or artifact",
     "Mediate a dispute between two worlds",
     "Test experimental technology",
     "Shore leave that goes wrong",
     "Carry a message across the Neutral Zone",
     "Host a first contact aboard the Pelion"
    ]
   ],
   "place": [
    "Place",
    [
     "The edge of the galaxy",
     "Inside a living starship",
     "A storm-wracked ocean world",
     "A dead world with ancient ruins",
     "A struggling frontier colony",
     "An asteroid mining station",
     "A drifting derelict starship",
     "An ice-covered moon of a gas giant",
     "A pre-warp civilization's world",
     "A nebula that blinds the sensors",
     "A starbase in crisis",
     "A world that seems too perfect",
     "A jungle planet thick with life",
     "Deep space between the stars",
     "A Klingon prison world",
     "A Romulan listening post"
    ]
   ],
   "strange": [
    "Something strange",
    [
     "The crew's past selves",
     "A dead star that sings",
     "A subspace anomaly that distorts time",
     "A non-corporeal life form",
     "An ancient machine that still works",
     "Duplicates of the crew",
     "A signal repeating a crew member's name",
     "A planet-wide illusion",
     "A rift into another universe",
     "A disease no one recognizes",
     "A gravity well that traps ships",
     "A godlike being testing the crew",
     "An alien probe draining power",
     "Memories that aren't the crew's own",
     "A crossing into a mirror universe",
     "A machine that remembers the Pelion"
    ]
   ],
   "twist": [
    "Twist",
    [
     "The captain has been replaced",
     "The enemy is a Federation colony",
     "Klingons arrive with their own claim",
     "The people asking for help are lying",
     "A crew member's complication comes into play",
     "Orders conflict with doing the right thing",
     "The Prime Directive forbids interfering",
     "A cloaked Romulan ship is watching",
     "Orion pirates want the same prize",
     "The Pelion's systems start failing",
     "A respected visitor has a hidden agenda",
     "The 'threat' is only defending itself",
     "Contact with Starfleet is cut off",
     "A civilian is trapped out of reach",
     "The mission was a test",
     "History must not change"
    ]
   ],
   "clock": [
    "Ticking clock",
    [
     [
      "The time loop resets",
      4
     ],
     [
      "The ship's power drains",
      6
     ],
     [
      "Orbit decays",
      6
     ],
     [
      "Warp core breach",
      4
     ],
     [
      "Klingon battle cruiser arrives",
      6
     ],
     [
      "The disease reaches the ship",
      8
     ],
     [
      "The storm closes the beam-out window",
      4
     ],
     [
      "Life support fails on the station",
      6
     ],
     [
      "The anomaly collapses",
      6
     ],
     [
      "Peace talks break down",
      8
     ],
     [
      "The hostages' air runs out",
      4
     ],
     [
      "The star goes nova",
      8
     ],
     [
      "Shields fail under bombardment",
      4
     ],
     [
      "The away team is discovered",
      6
     ],
     [
      "The duel at dawn",
      4
     ],
     [
      "The Klingon ultimatum",
      6
     ]
    ]
   ],
   "who": [
    "Key character",
    [
     "A crew member's future self",
     "A legend thought dead",
     "An idealistic Federation ambassador",
     "A Klingon captain with a grudge",
     "A stranded Orion trader",
     "A brilliant, reckless scientist",
     "A colony leader hiding a secret",
     "A former Starfleet officer gone rogue",
     "A local child who has seen too much",
     "A disapproving Vulcan observer",
     "An old friend of one of the crew",
     "A Romulan who wants to defect",
     "A Starfleet admiral with sealed orders",
     "An android that wants to be free",
     "A godlike child",
     "An admiral's spy aboard"
    ]
   ]
  }
 }
};
/* PACKS:END */

// ---- Rules: 3d6 roll-under, as written in the Legend Dynamics core rules ----

export const MIN_TARGET = 1;
export const MAX_TARGET = 30;

export function rollDice(random = Math.random) {
  return [0, 0, 0].map(() => 1 + Math.floor(random() * 6));
}

/**
 * Resolve a roll against an adjusted target.
 * Natural 3–4 always succeeds; natural 17–18 always fails.
 * An automatic success above its target counts as margin 0 in a contest.
 */
export function resolve(dice, target) {
  const total = dice[0] + dice[1] + dice[2];
  const auto = total <= 4 ? "success" : total >= 17 ? "failure" : null;
  const success = auto === "success" || (auto === null && total <= target);
  const margin = target - total;
  return {
    dice,
    total,
    target,
    success,
    auto,
    margin,
    contestMargin: success ? Math.max(0, margin) : margin,
  };
}

// Ways to roll each total on 3d6, index 0 = total 3.
const WAYS = [1, 3, 6, 10, 15, 21, 25, 27, 27, 25, 21, 15, 10, 6, 3, 1];

/** Chance of success against a target, including the automatic results. */
export function odds(target) {
  let ways = 0;
  for (let t = 3; t <= 18; t++) if (t <= 4 || (t <= 16 && t <= target)) ways += WAYS[t - 3];
  return ways / 216;
}

const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");

/** Text lines for a result, shared by the first roll and a point reroll. */
export function describe(r) {
  const lines = [];
  if (r.auto === "success") lines.push(`Natural ${r.total}: automatic success.` + (r.margin < 0 ? " Counts as margin 0 in a contest." : ""));
  else if (r.auto === "failure") lines.push(`Natural ${r.total}: automatic failure.`);
  else lines.push(r.success ? `Succeeded by ${r.margin}.` : `Failed by ${-r.margin}.`);
  if (r.success && r.margin >= 5) lines.push("Margin 5+: as an assistant this gives +2; in medical care it clears an extra box.");
  if (r.total === 18) lines.push("As an assistant, an 18 introduces a complication.");
  if (!r.success && !r.auto && r.margin >= -2) lines.push(`Missed by ${-r.margin}: the GM may offer success at a cost.`);
  return lines;
}

/**
 * Opposed contest, as the guide states: one success beats one failure; if both succeed the larger
 * margin wins (an automatic success above its target counts as margin 0); a tie or two failures
 * favors the defender. Returns "me" or "opponent".
 */
export function contestWinner(me, opp, defender = "opponent") {
  if (me.success && !opp.success) return "me";
  if (opp.success && !me.success) return "opponent";
  if (me.success && opp.success && me.contestMargin !== opp.contestMargin) return me.contestMargin > opp.contestMargin ? "me" : "opponent";
  return defender;
}

/** Assistance bonus from the helper's roll: success +1, success by 5 or more +2, failure +0. */
export function assistBonus(r) {
  return r.success ? (r.contestMargin >= 5 ? 2 : 1) : 0;
}

export function targetLine(base, modifier) {
  return modifier ? `${base} ${signed(modifier)} → **${base + modifier}**` : `**${base}**`;
}

// ---- Games ----

const GAME_IDS = () => Object.keys(PACKS);
const pickGame = (id) => PACKS[id] || PACKS[GAME_IDS()[0]] || { id: "core", title: "Legend Dynamics", point: "Legend", tracks: [], seeds: {} };
// Games that were renamed: a server that chose the old id keeps its game.
const GAME_ALIASES = { exlaw: "aurora" };
const unalias = (id) => GAME_ALIASES[id] || id;
const defaultGameId = (env) => (PACKS[unalias(String(env.DEFAULT_GAME || "").trim())] ? unalias(String(env.DEFAULT_GAME).trim()) : PACKS.western ? "western" : GAME_IDS()[0]);
async function gameOf(env, guild) {
  const stored = unalias(env.STORE ? await env.STORE.get(`game:${guild}`) : null);
  return pickGame(PACKS[stored] ? stored : defaultGameId(env));
}

// ---- Slash commands ----

const gameChoices = () => GAME_IDS().map((id) => ({ name: PACKS[id].title, value: id }));

export function commands() {
  return [
    {
      name: "roll",
      description: "Roll 3d6 under your target",
      options: [
        { type: 4, name: "target", description: "Skill or attribute from your sheet, e.g. 13 for Shooting 13", required: true, min_value: 1, max_value: 30 },
        { type: 4, name: "modifier", description: "Total of circumstance, assistance, advantage and injury modifiers, e.g. -2", required: false, min_value: -12, max_value: 12 },
        { type: 3, name: "label", description: "What you're rolling, e.g. Shooting", required: false, max_length: 40 },
      ],
    },
    {
      name: "contest",
      description: "Opposed roll: you against an opponent",
      options: [
        { type: 4, name: "target", description: "Your skill or attribute target", required: true, min_value: 1, max_value: 30 },
        { type: 4, name: "opponent", description: "The opponent's skill target", required: true, min_value: 1, max_value: 30 },
        { type: 4, name: "modifier", description: "Your total modifier, e.g. -2", required: false, min_value: -12, max_value: 12 },
        { type: 4, name: "opponent_modifier", description: "The opponent's total modifier", required: false, min_value: -12, max_value: 12 },
        { type: 3, name: "defender", description: "Who wins ties and double failures (default: the opponent)", required: false,
          choices: [{ name: "opponent", value: "opponent" }, { name: "me", value: "me" }] },
        { type: 3, name: "label", description: "What the contest is, e.g. Grapple or Bluff the guard", required: false, max_length: 40 },
        { type: 3, name: "opponent_name", description: "Who you're up against, e.g. Werewolf", required: false, max_length: 40 },
      ],
    },
    {
      name: "assist",
      description: "A helper rolls first, then you roll with their bonus",
      options: [
        { type: 4, name: "target", description: "Your (lead) skill target", required: true, min_value: 1, max_value: 30 },
        { type: 4, name: "helper_target", description: "The helper's relevant skill target", required: true, min_value: 1, max_value: 30 },
        { type: 6, name: "helper", description: "Who is helping", required: false },
        { type: 4, name: "modifier", description: "Your total modifier, e.g. -2", required: false, min_value: -12, max_value: 12 },
        { type: 4, name: "helper_modifier", description: "The helper's modifier", required: false, min_value: -12, max_value: 12 },
        { type: 3, name: "label", description: "What you're doing, e.g. Hold the door", required: false, max_length: 40 },
      ],
    },
    {
      name: "points",
      description: "Track Duty, Grit or Resolve points (start each session with 2)",
      options: [
        { type: 1, name: "show", description: "Show points", options: [{ type: 6, name: "player", description: "Whose points (default: yours)", required: false }] },
        { type: 1, name: "spend", description: "Spend one of your points" },
        { type: 1, name: "gain", description: "Gain a point (the GM can award one to a player)",
          options: [{ type: 6, name: "player", description: "GM only: who receives the point", required: false }] },
        { type: 1, name: "set", description: "GM: set a player's points",
          options: [{ type: 6, name: "player", description: "Player", required: true }, { type: 4, name: "points", description: "New total", required: true, min_value: 0, max_value: 20 }] },
        { type: 1, name: "newsession", description: "GM: start a new session; everyone goes back to 2" },
      ],
    },
    {
      name: "clock",
      description: "Progress and danger clocks for the table",
      options: [
        { type: 1, name: "new", description: "Start a clock",
          options: [
            { type: 3, name: "name", description: "e.g. The mob forms", required: true, max_length: 40 },
            { type: 4, name: "segments", description: "2 quick, 4 urgent, 6 substantial, 8 long", required: true, choices: [{ name: "2", value: 2 }, { name: "4", value: 4 }, { name: "6", value: 6 }, { name: "8", value: 8 }] },
            { type: 3, name: "kind", description: "Danger fills on failures; progress on successes", required: false, choices: [{ name: "danger", value: "danger" }, { name: "progress", value: "progress" }] },
          ] },
        { type: 1, name: "tick", description: "Fill segments on a clock",
          options: [
            { type: 3, name: "name", description: "Which clock", required: true },
            { type: 4, name: "segments", description: "How many (default 1; use -1 to undo)", required: false, min_value: -8, max_value: 8 },
          ] },
        { type: 1, name: "show", description: "Show all clocks" },
        { type: 1, name: "remove", description: "Remove a clock", options: [{ type: 3, name: "name", description: "Which clock", required: true }] },
      ],
    },
    {
      name: "track",
      description: "The game's shared tracks (Trouble, or the ship's status)",
      options: [
        { type: 1, name: "show", description: "Show every track and what it means now" },
        { type: 1, name: "mark", description: "Mark boxes on a track",
          options: [
            { type: 3, name: "name", description: "Which track, e.g. Heat", required: true, max_length: 40 },
            { type: 4, name: "boxes", description: "How many (default 1)", required: false, min_value: 1, max_value: 8 },
          ] },
        { type: 1, name: "clear", description: "Clear boxes on a track",
          options: [
            { type: 3, name: "name", description: "Which track, e.g. Heat", required: true, max_length: 40 },
            { type: 4, name: "boxes", description: "How many (default 1)", required: false, min_value: 1, max_value: 8 },
          ] },
        { type: 1, name: "reset", description: "GM: clear every track" },
      ],
    },
    { name: "seed", description: "Roll an adventure seed: 3d6 on each of the game's tables" },
    {
      name: "game",
      description: "Show or choose which game this server plays",
      options: [
        { type: 1, name: "show", description: "Show this server's game" },
        { type: 1, name: "set", description: "GM: choose this server's game",
          options: [{ type: 3, name: "game", description: "The setting", required: true, choices: gameChoices() }] },
      ],
    },
  ];
}
export const COMMANDS = commands();

// The USS Pelion and Grimm bots' old command names keep working: /pelion and /grimm roll, /duty and /grit track points.
const ALIASES = { pelion: "roll", grimm: "roll", duty: "points", grit: "points" };
const aliasOf = (name, target, game) => {
  const base = COMMANDS.find((c) => c.name === target);
  return { ...base, name, description: target === "roll" ? `Roll 3d6 under your target (same as /roll)` : `Track ${game} points (same as /points)` };
};

/** The commands to register: the full set plus the four old names, unless LEGACY_COMMANDS is "no". */
export function commandsFor(env = {}) {
  if (String(env.LEGACY_COMMANDS || "").trim().toLowerCase() === "no") return [...COMMANDS];
  return [...COMMANDS, aliasOf("pelion", "roll"), aliasOf("duty", "points", "Duty"), aliasOf("grimm", "roll"), aliasOf("grit", "points", "Grit")];
}
const commandList = (cmds) => { const n = cmds.map((c) => `/${c.name}`); return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`; };

// ---- Discord request handling ----

const PING = 1, COMMAND = 2, COMPONENT = 3;
const PONG = 1, MESSAGE = 4, UPDATE_MESSAGE = 7;
const EPHEMERAL = 64;
const GREEN = 0x52e3a0, RED = 0xff6a5c, NEUTRAL = 0x8aa2c2;

// The USS Pelion and Grimm bots kept their storage as DUTY and GRIT. Pasting this file into one of those
// Workers keeps working: that binding becomes the storage, and the server starts on that bot's game.
export function withLegacy(env) {
  if (env.STORE || !(env.DUTY || env.GRIT)) return env;
  return { ...env, STORE: env.DUTY || env.GRIT, rawStore: env.DUTY ? "DUTY" : "GRIT", DEFAULT_GAME: env.DEFAULT_GAME || (env.DUTY ? "pelion" : "grimm") };
}

export default {
  async fetch(request, rawEnv) {
    const env = withLegacy(rawEnv);
    if (request.method === "GET" && new URL(request.url).pathname === "/register") return registerCommands(rawEnv);
    if (request.method !== "POST") return statusPage(env);
    const body = await request.text();
    const ok = await verify(request, body, env.DISCORD_PUBLIC_KEY);
    if (!ok) return new Response("Bad request signature.", { status: 401 });

    const interaction = JSON.parse(body);
    if (interaction.type === PING) return json({ type: PONG });
    if (interaction.type === COMPONENT && interaction.data?.custom_id?.startsWith("reroll|")) return json(await reroll(interaction, env));
    if (interaction.type === COMMAND) {
      const handler = HANDLERS[interaction.data?.name] || HANDLERS[ALIASES[interaction.data?.name]];
      if (handler) return json(await handler(interaction, env, await gameOf(env, guildOf(interaction))));
    }
    const name = interaction.data?.name || interaction.data?.custom_id || "that";
    return json({ type: MESSAGE, data: { content: `This bot doesn't know /${name}. Discord may be showing an old command list: the GM can open the Worker's /register page to refresh it.`, flags: EPHEMERAL } });
  },
};

async function verify(request, body, publicKeyHex) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const keyHex = cleanKey(publicKeyHex);
  if (!signature || !timestamp || !keyHex) return false;
  const data = new TextEncoder().encode(timestamp + body);
  // Standard Ed25519 first; older Workers runtimes only know the NODE-ED25519 name.
  for (const alg of [{ name: "Ed25519" }, { name: "NODE-ED25519", namedCurve: "NODE-ED25519" }]) {
    try {
      const key = await crypto.subtle.importKey("raw", hex(keyHex), alg, false, ["verify"]);
      return await crypto.subtle.verify(alg, key, hex(signature), data);
    } catch {
      // try the next algorithm name
    }
  }
  return false;
}

// Copying the Public Key often brings spaces or a line break along; Discord's key is 64 hex characters.
const cleanKey = (k) => {
  const v = String(k || "").replace(/\s+/g, "").toLowerCase();
  return /^[0-9a-f]{64}$/.test(v) ? v : "";
};

const rawStoreName = (env) => (env.rawStore || "STORE");

// Visiting the Worker's address shows which settings it can see, without revealing them.
function statusPage(env) {
  const check = (ok, good, bad) => `${ok ? "OK " : "!! "} ${ok ? good : bad}`;
  const lines = [
    "Legend Dynamics dice bot is running.",
    `Games: ${GAME_IDS().map((id) => PACKS[id].title).join(", ") || "none"}. New servers start on ${pickGame(defaultGameId(env)).title}.`,
    "",
    check(!!cleanKey(env.DISCORD_PUBLIC_KEY), "DISCORD_PUBLIC_KEY is set and looks right.",
      env.DISCORD_PUBLIC_KEY ? "DISCORD_PUBLIC_KEY is set but isn't 64 hex characters. Copy the Public Key again from General Information."
        : "DISCORD_PUBLIC_KEY is missing. Add it under Settings > Variables and Secrets."),
    check(/^\d{15,25}$/.test(String(env.DISCORD_APPLICATION_ID || "").trim()), "DISCORD_APPLICATION_ID is set.",
      "DISCORD_APPLICATION_ID is missing or not a number (only needed for /register)."),
    check(!!env.STORE, `${rawStoreName(env)} storage is connected: /game, /points, /clock and /track work, and rerolls spend points.`,
      "STORE storage isn't connected (optional): bind a KV namespace named STORE to turn on /game, /points, /clock and /track."),
    check(!env.DEFAULT_GAME || !!PACKS[String(env.DEFAULT_GAME).trim()], "DEFAULT_GAME is fine.",
      `DEFAULT_GAME isn't one of: ${GAME_IDS().join(", ")}.`),
    check(!!env.DISCORD_BOT_TOKEN, "DISCORD_BOT_TOKEN is set (you can delete it after /register works).",
      "DISCORD_BOT_TOKEN is not set (only needed for /register)."),
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

const rerollButton = (game, userId, base, modifier, label) => ({
  type: 1,
  components: [{ type: 2, style: 2, label: `Spend ${article(game.point)} point to reroll`, custom_id: `reroll|${userId}|${base}|${modifier}|${label}` }],
});
const article = (w) => `${/^[aeiou]/i.test(w) ? "an" : "a"} ${w}`;

function rollCommand(interaction, env, game) {
  const opts = optsOf(interaction);
  const base = clampInt(opts.target);
  const modifier = intOr0(opts.modifier);
  const label = cleanLabel(opts.label);
  const user = userOf(interaction);
  const r = resolve(rollDice(), base + modifier);

  return {
    type: MESSAGE,
    data: {
      embeds: [{
        title: `${label || "3d6 roll"}: target ${base + modifier}`,
        color: r.success ? GREEN : RED,
        description: `<@${user.id}> rolls 3d6 under ${targetLine(base, modifier)}\n` +
          `🎲 ${r.dice.join(" + ")} = **${r.total}**  ·  **${r.success ? "SUCCESS" : "FAILURE"}**\n` + describe(r).join("\n"),
        footer: { text: `${Math.round(odds(base + modifier) * 100)}% chance · ${game.title}` },
      }],
      components: [rerollButton(game, user.id, base, modifier, label)],
    },
  };
}

const rollLine = (r) => `🎲 ${r.dice.join(" + ")} = **${r.total}** vs ${r.target}  ·  **${r.success ? "SUCCESS" : "FAILURE"}**` +
  (r.auto ? ` (natural ${r.total})` : r.success ? `, margin ${r.contestMargin}` : `, missed by ${-r.margin}`);
const optsOf = (interaction) => Object.fromEntries((interaction.data.options || []).map((o) => [o.name, o.value]));
const subOf = (interaction) => {
  const sub = interaction.data.options?.[0] || {};
  return [sub.name, Object.fromEntries((sub.options || []).map((o) => [o.name, o.value]))];
};
const intOr0 = (v) => (Number.isInteger(v) ? v : 0);
const cleanLabel = (v) => String(v || "").replace(/\|/g, "/").trim().slice(0, 40);
const reply = (content, priv = false) => ({ type: MESSAGE, data: { content, flags: priv ? EPHEMERAL : 0, allowed_mentions: { parse: [] } } });
const needsStore = (what) => reply(`${what} need the bot's storage. Bind a KV namespace named STORE to the Worker (see the bot's README).`, true);
const gmOnly = () => reply("Only the GM (someone with Manage Server) can do that.", true);

function contestCommand(interaction, env, game) {
  const o = optsOf(interaction), user = userOf(interaction);
  const mine = resolve(rollDice(), clampInt(o.target) + intOr0(o.modifier));
  const theirs = resolve(rollDice(), clampInt(o.opponent) + intOr0(o.opponent_modifier));
  const defender = o.defender === "me" ? "me" : "opponent";
  const winner = contestWinner(mine, theirs, defender);
  const foe = cleanLabel(o.opponent_name) || "The opponent";
  const why = mine.success !== theirs.success ? "one success beats one failure"
    : mine.success ? (mine.contestMargin === theirs.contestMargin ? "equal margins: the defender wins" : "the larger margin wins")
    : "both failed: the defender holds";
  return {
    type: MESSAGE,
    data: {
      allowed_mentions: { parse: [] },
      embeds: [{
        title: `${cleanLabel(o.label) || "Contest"}: ${winner === "me" ? "you win" : `${foe.toLowerCase() === "the opponent" ? "the opponent" : foe} wins`}`,
        color: winner === "me" ? GREEN : RED,
        description: `<@${user.id}>: ${targetLine(clampInt(o.target), intOr0(o.modifier))}\n${rollLine(mine)}\n\n` +
          `${foe}: ${targetLine(clampInt(o.opponent), intOr0(o.opponent_modifier))}\n${rollLine(theirs)}\n\n` +
          `**${winner === "me" ? `<@${user.id}> wins` : `${foe} wins`}** (${why}). Defender: ${defender === "me" ? `<@${user.id}>` : foe}.`,
        footer: { text: `Opposed contest · ${game.title}` },
      }],
    },
  };
}

function assistCommand(interaction, env, game) {
  const o = optsOf(interaction), user = userOf(interaction);
  const base = clampInt(o.target), mod = intOr0(o.modifier), label = cleanLabel(o.label);
  const help = resolve(rollDice(), clampInt(o.helper_target) + intOr0(o.helper_modifier));
  const bonus = assistBonus(help);
  const lead = resolve(rollDice(), base + mod + bonus);
  const helper = o.helper ? `<@${o.helper}>` : "The helper";
  const helpNote = help.total === 18 ? "A natural 18: no bonus, and the GM introduces a complication."
    : bonus === 2 ? "Success by 5 or more: +2 to the lead roll." : bonus === 1 ? "Success: +1 to the lead roll." : "Failure: no bonus.";
  return {
    type: MESSAGE,
    data: {
      allowed_mentions: { parse: [] },
      embeds: [{
        title: `${label || "Assisted roll"}: target ${base + mod + bonus}`,
        color: lead.success ? GREEN : RED,
        description: `**Assist.** ${helper} rolls under ${targetLine(clampInt(o.helper_target), intOr0(o.helper_modifier))}\n${rollLine(help)}\n${helpNote}\n\n` +
          `**Lead.** <@${user.id}> rolls under ${targetLine(base, mod + bonus)}\n🎲 ${lead.dice.join(" + ")} = **${lead.total}**  ·  **${lead.success ? "SUCCESS" : "FAILURE"}**\n` + describe(lead).join("\n"),
        footer: { text: `One assistant per roll · ${game.title}` },
      }],
      components: [rerollButton(game, user.id, base, mod + bonus, label)],
    },
  };
}

async function reroll(interaction, env) {
  const [, ownerId, baseStr, modStr] = interaction.data.custom_id.split("|");
  const user = userOf(interaction), guild = guildOf(interaction);
  const game = await gameOf(env, guild);
  if (user.id !== ownerId) {
    return { type: MESSAGE, data: { content: `Only the player who rolled can spend their ${game.point} point on this roll.`, flags: EPHEMERAL } };
  }
  let left = null;
  if (env.STORE) {
    const have = await getPoints(env, guild, user.id);
    if (have <= 0) return { type: MESSAGE, data: { content: `You have no ${game.point} points left this session.`, flags: EPHEMERAL } };
    left = have - 1;
    await setPoints(env, guild, user.id, left);
  }
  const target = Number(baseStr) + Number(modStr);
  const r = resolve(rollDice(), target);
  const embed = { ...(interaction.message?.embeds?.[0] || {}) };
  embed.color = r.success ? GREEN : RED;
  embed.description = (embed.description || "") +
    `\n\n**${game.point} point reroll** (this result stands${left === null ? "" : ` · ${pointsText(game, left)} left`})\n🎲 ${r.dice.join(" + ")} = **${r.total}**  ·  **${r.success ? "SUCCESS" : "FAILURE"}**\n` +
    describe(r).join("\n");
  return { type: UPDATE_MESSAGE, data: { embeds: [embed], components: [] } };
}

// ---- Points (Grit, Resolve, ...) ----
// Stored per server and player. Each server has a session number; a player's record from an
// earlier session counts as the starting 2, so /points newsession is a single write.

const START_POINTS = 2;
const MANAGE_GUILD = 1n << 5n;
const guildOf = (interaction) => interaction.guild_id || "dm";
const isGM = (interaction) => !interaction.guild_id || (BigInt(interaction.member?.permissions || "0") & MANAGE_GUILD) !== 0n;
const pointsText = (game, n) => `${n} ${game.point} point${n === 1 ? "" : "s"}`;

async function sessionOf(env, guild) {
  return Number(await env.STORE.get(`session:${guild}`)) || 1;
}
async function getPoints(env, guild, userId) {
  const [rec, session] = await Promise.all([env.STORE.get(`points:${guild}:${userId}`, "json"), sessionOf(env, guild)]);
  return rec && rec.session === session ? rec.points : START_POINTS;
}
async function setPoints(env, guild, userId, points) {
  await env.STORE.put(`points:${guild}:${userId}`, JSON.stringify({ points, session: await sessionOf(env, guild) }));
}

async function pointsCommand(interaction, env, game) {
  if (!env.STORE) return needsStore(`${game.point} points`);
  const [sub, opt] = subOf(interaction);
  const me = userOf(interaction).id, guild = guildOf(interaction);
  const pts = (n) => pointsText(game, n);

  switch (sub) {
    case "show": {
      const who = opt.player || me;
      return reply(`<@${who}> has **${pts(await getPoints(env, guild, who))}**.`);
    }
    case "spend": {
      const have = await getPoints(env, guild, me);
      if (have <= 0) return reply(`You have no ${game.point} points left this session.`, true);
      await setPoints(env, guild, me, have - 1);
      return reply(`<@${me}> spends ${article(game.point)} point and has **${pts(have - 1)}** left.`);
    }
    case "gain": {
      const who = opt.player || me;
      if (who !== me && !isGM(interaction)) return gmOnly();
      const now = (await getPoints(env, guild, who)) + 1;
      await setPoints(env, guild, who, now);
      return reply(`<@${who}> gains ${article(game.point)} point and now has **${pts(now)}**.`);
    }
    case "set": {
      if (!isGM(interaction)) return gmOnly();
      await setPoints(env, guild, opt.player, opt.points);
      return reply(`<@${opt.player}> now has **${pts(opt.points)}**.`);
    }
    case "newsession": {
      if (!isGM(interaction)) return gmOnly();
      await env.STORE.put(`session:${guild}`, String((await sessionOf(env, guild)) + 1));
      return reply(`New session. Everyone starts with **${pts(START_POINTS)}** (players with Extra ${game.point}: /points gain once); unused points from last session are gone.`);
    }
  }
  return reply("Unknown /points option.", true);
}

// ---- Clocks ----
// Stored per server: { [lowercased name]: {name, size, filled, kind} }.

const clockBar = (c) => "●".repeat(Math.min(c.filled, c.size)) + "○".repeat(Math.max(0, c.size - c.filled));
const clockLine = (c) => `**${c.name}** (${c.kind}) ${clockBar(c)} ${c.filled}/${c.size}` +
  (c.filled >= c.size ? (c.kind === "danger" ? "  **It happens.**" : "  **Done.**") : "");

async function clockCommand(interaction, env) {
  if (!env.STORE) return needsStore("Clocks");
  const [sub, opt] = subOf(interaction);
  const key = `clocks:${guildOf(interaction)}`;
  const all = (await env.STORE.get(key, "json")) || {};
  const id = String(opt.name || "").trim().toLowerCase();
  const save = () => env.STORE.put(key, JSON.stringify(all));
  switch (sub) {
    case "new": {
      if (Object.keys(all).length >= 20 && !all[id]) return reply("This server already has 20 clocks. Remove one first.", true);
      all[id] = { name: String(opt.name).trim().slice(0, 40), size: opt.segments, filled: 0, kind: opt.kind === "progress" ? "progress" : "danger" };
      await save();
      return reply(`New clock: ${clockLine(all[id])}`);
    }
    case "tick": {
      const c = all[id];
      if (!c) return reply(`No clock called "${opt.name}". Use /clock show to see them.`, true);
      c.filled = Math.max(0, Math.min(c.size, c.filled + (Number.isInteger(opt.segments) ? opt.segments : 1)));
      await save();
      return reply(clockLine(c));
    }
    case "show": {
      const list = Object.values(all);
      return reply(list.length ? list.map(clockLine).join("\n") : "No clocks running. Start one with /clock new.");
    }
    case "remove": {
      if (!all[id]) return reply(`No clock called "${opt.name}".`, true);
      const name = all[id].name; delete all[id]; await save();
      return reply(`Removed the clock **${name}**.`);
    }
  }
  return reply("Unknown /clock option.", true);
}

// ---- Tracks ----
// The game's shared tracks (from its pack), stored per server and game: { [track name]: boxes marked }.

/** Find a track by name: exact, then by the start of a word ("dark" finds The Dark). */
export function findTrack(game, name) {
  const q = String(name || "").trim().toLowerCase();
  if (!q) return null;
  return game.tracks.find((t) => t.name.toLowerCase() === q)
    || game.tracks.find((t) => t.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || t.name.toLowerCase().startsWith(q))
    || null;
}
const trackLine = (t, marked) => `**${t.name}** ${"■".repeat(marked)}${"□".repeat(t.boxes - marked)} ${marked}/${t.boxes}: ${t.effects[marked] || ""}`;

async function trackCommand(interaction, env, game) {
  if (!game.tracks.length) return reply(`${game.title} has no shared tracks.`, true);
  if (!env.STORE) return needsStore("Tracks");
  const [sub, opt] = subOf(interaction);
  const key = `tracks:${guildOf(interaction)}:${game.id}`;
  const state = (await env.STORE.get(key, "json")) || {};
  const marked = (t) => Math.max(0, Math.min(t.boxes, state[t.name] || 0));
  const title = `**${game.trackTitle || "Tracks"}** · ${game.title}`;
  switch (sub) {
    case "show":
      return reply([title, ...game.tracks.map((t) => trackLine(t, marked(t)))].join("\n"));
    case "mark":
    case "clear": {
      const t = findTrack(game, opt.name);
      if (!t) return reply(`No track called "${opt.name}". ${game.title}'s tracks: ${game.tracks.map((x) => x.name).join(", ")}.`, true);
      const n = Number.isInteger(opt.boxes) ? opt.boxes : 1;
      state[t.name] = Math.max(0, Math.min(t.boxes, marked(t) + (sub === "mark" ? n : -n)));
      await env.STORE.put(key, JSON.stringify(state));
      return reply(trackLine(t, state[t.name]));
    }
    case "reset": {
      if (!isGM(interaction)) return gmOnly();
      await env.STORE.put(key, "{}");
      return reply(`Every track is clear.\n${game.tracks.map((t) => trackLine(t, 0)).join("\n")}`);
    }
  }
  return reply("Unknown /track option.", true);
}

// ---- Seeds ----

/** One 3d6 roll per table: 16 entries, read by the total (3-18). */
export function rollSeed(game, random = Math.random) {
  return Object.values(game.seeds).map(([label, items]) => {
    const total = [0, 0, 0].reduce((a) => a + 1 + Math.floor(random() * 6), 0);
    return [label, items[Math.min(items.length - 1, total - 3)], total];
  });
}

function seedCommand(interaction, env, game) {
  const rows = rollSeed(game);
  if (!rows.length) return reply(`${game.title} has no seed tables.`, true);
  // A clock entry is [name, segments]: show its size and the command that starts it.
  const clock = rows.map(([, item]) => item).find(Array.isArray);
  const text = (item) => (Array.isArray(item) ? `${item[0]} (${item[1]} segments)` : item);
  return {
    type: MESSAGE,
    data: {
      allowed_mentions: { parse: [] },
      embeds: [{
        title: `${game.mission || "Adventure"} seed`,
        color: NEUTRAL,
        description: rows.map(([label, item, total]) => `**${label}** (${total}): ${text(item)}`).join("\n") +
          (clock ? `\n\nStart the clock: \`/clock new name:${clock[0]} segments:${clock[1]}\`` : ""),
        footer: { text: `Roll again for another · ${game.title}` },
      }],
    },
  };
}

// ---- Game ----

async function gameCommand(interaction, env, game) {
  const [sub, opt] = subOf(interaction);
  if (sub === "show") {
    return reply(`This server plays **${game.title}**: ${game.point} points${game.tracks.length ? `; tracks ${game.tracks.map((t) => t.name).join(", ")}` : ""}.` +
      (env.STORE ? "" : " (Connect the bot's storage to change it.)"));
  }
  if (sub === "set") {
    if (!env.STORE) return reply("Choosing a game needs the bot's storage: bind a KV namespace to the Worker as STORE (or keep the Pelion bot's DUTY / Grimm bot's GRIT binding). Until then every server plays " + pickGame(defaultGameId(env)).title + ".", true);
    if (!isGM(interaction)) return reply("Only the GM can change the game: that's anyone with the Manage Server permission on this Discord server.", true);
    if (!PACKS[opt.game]) return reply(`Unknown game. Choose one of: ${GAME_IDS().map((id) => PACKS[id].title).join(", ")}.`, true);
    await env.STORE.put(`game:${guildOf(interaction)}`, opt.game);
    const g = PACKS[opt.game];
    return reply(`This server now plays **${g.title}**. Rerolls spend ${g.point} points; /track shows ${g.tracks.map((t) => t.name).join(", ") || "no tracks"}.`);
  }
  return reply("Unknown /game option.", true);
}

const HANDLERS = {
  roll: rollCommand, contest: contestCommand, assist: assistCommand, points: pointsCommand,
  clock: clockCommand, track: trackCommand, seed: seedCommand, game: gameCommand,
};

const userOf = (interaction) => interaction.member?.user || interaction.user || { id: "0" };
const clampInt = (v) => Math.max(MIN_TARGET, Math.min(MAX_TARGET, Number.isInteger(v) ? v : 10));
const json = (data) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
const hex = (s) => new Uint8Array(s.match(/../g).map((b) => parseInt(b, 16)));

// Registers the commands with Discord. Safe to repeat: it replaces the command list with the same one.
async function registerCommands(env) {
  if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_BOT_TOKEN) {
    return new Response("Add DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN to the Worker's settings, then reload this page.", { status: 400 });
  }
  const cmds = commandsFor(env);
  const put = () => fetch(`https://discord.com/api/v10/applications/${String(env.DISCORD_APPLICATION_ID).trim()}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${String(env.DISCORD_BOT_TOKEN).trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  let res = await put();
  // Discord rate-limits command registration. Wait out a short limit once instead of failing.
  if (res.status === 429) {
    const wait = Number((await res.clone().json().catch(() => ({}))).retry_after) || 0;
    if (wait > 0 && wait <= 60) {
      await new Promise((r) => setTimeout(r, Math.ceil(wait * 1000) + 500));
      res = await put();
    }
  }
  if (res.ok) return new Response(`Registered ${commandList(cmds)}. They can take a minute to appear in Discord.`);
  const detail = await res.text();
  const hint = res.status === 429 ? "\n\nDiscord is rate-limiting registration. Wait a minute or two, then reload this page once."
    : res.status === 401 ? "\n\nThe bot token is wrong or was reset. Reset it on the Bot page and update DISCORD_BOT_TOKEN." : "";
  return new Response(`Discord refused the command (${res.status}): ${detail}${hint}`, { status: 502 });
}
