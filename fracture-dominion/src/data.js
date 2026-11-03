// The game's numbers: factions, worlds, buildings, ships and research. Fracture Lines: Dominion is set in the
// Fracture Lines setting of the Legend Dynamics RPG; battles roll 3d6 roll-under, as the tabletop game does.

export const FACTIONS = [
  { id: "concord", name: "The Concord", people: "Human", color: "#3d7fbf",
    trait: "Restless energy", traitText: "Colony and outpost ships cost 25% less, and new colonies start with 2 population.",
    homeworld: "Earth" },
  { id: "tessan", name: "The Tessan Dynasties", people: "Tessan", color: "#c2902f",
    trait: "Old money", traitText: "+25% credits from every world, and trade treaties pay double.",
    homeworld: "Tessa Prime" },
  { id: "kel", name: "The Kel Hives", people: "Kel", color: "#5f9e4b",
    trait: "Hive-cities", traitText: "Worlds hold 2 more population, and population grows faster.",
    homeworld: "Kel'vaar" },
  { id: "hegemony", name: "The Hegemony Remnant", people: "Ozhvek and Dresh", color: "#a8342b",
    trait: "Imperial legions", traitText: "Warships hit on +1, and troop transports land twice the force.",
    homeworld: "Ozhvar" },
  { id: "vael", name: "The Vael Living Fleets", people: "Vael", color: "#8a5bb8",
    trait: "Living hulls", traitText: "Ships move 1 hex farther and repair a point of hull every turn, anywhere.",
    homeworld: "The Long Flotilla" },
];

// Worlds: what can live there, and what it gives. maxPop is per size point; rich worlds give more industry.
export const WORLDS = {
  terran: { name: "Terran", pop: 3, ind: 1, sci: 1, needs: null, color: "#5fa86a" },
  ocean: { name: "Ocean", pop: 3, ind: 0.8, sci: 1.2, needs: null, color: "#4a8fc4" },
  desert: { name: "Desert", pop: 2, ind: 1.2, sci: 0.8, needs: "xenology", color: "#d0a25a" },
  arctic: { name: "Arctic", pop: 2, ind: 1, sci: 1.2, needs: "xenology", color: "#bcd6e0" },
  barren: { name: "Barren", pop: 1, ind: 1.5, sci: 0.6, needs: "domes", color: "#8c8278" },
  gas: { name: "Gas giant", pop: 0, ind: 0, sci: 0, needs: null, color: "#c98f6a", outpostOnly: true },
};

export const BUILDINGS = {
  factory: { name: "Factory", cost: 60, upkeep: 1, text: "+50% industry here." },
  lab: { name: "Research lab", cost: 60, upkeep: 1, text: "+2 science, and +50% science here." },
  market: { name: "Exchange", cost: 50, upkeep: 0, text: "+3 credits here." },
  shipyard: { name: "Shipyard", cost: 80, upkeep: 1, text: "Builds ships here." },
  battery: { name: "Orbital battery", cost: 70, upkeep: 1, needs: "batteries", text: "Defends the world: it fires on enemies in orbit (skill 13, 3 hull)." },
  refinery: { name: "Exotics refinery", cost: 90, upkeep: 1, needs: "refining", text: "+1 exotics if the system has a deposit." },
  engine: { name: "The Corridor Engine", cost: 1200, upkeep: 0, needs: "engine", exotics: 15, wonder: true,
    text: "Finish it and you open a corridor to everywhere at once: you win." },
};

// Ships. skill: the 3d6 roll-under target to hit; dmg: hull a hit takes; hull: what it can take.
export const SHIPS = {
  scout: { name: "Scout", cost: 20, upkeep: 0.5, speed: 4, hull: 1, skill: 0, dmg: 0, sensors: 3, text: "Fast eyes. Unarmed." },
  colony: { name: "Colony ship", cost: 60, upkeep: 1, speed: 2, hull: 1, skill: 0, dmg: 0, sensors: 1, colonize: true, text: "Founds a colony on a world you can live on. Used up." },
  outpost: { name: "Outpost ship", cost: 30, upkeep: 0.5, speed: 2, hull: 1, skill: 0, dmg: 0, sensors: 1, outpost: true, text: "Claims any system as an outpost: its exotics and its territory. Used up." },
  frigate: { name: "Frigate", cost: 40, upkeep: 1, speed: 3, hull: 2, skill: 11, dmg: 1, sensors: 2, text: "The line of battle." },
  transport: { name: "Troop transport", cost: 45, upkeep: 1, speed: 3, hull: 1, skill: 0, dmg: 0, sensors: 1, troops: 2, text: "Takes an enemy world whose orbit you hold. Used up." },
  cruiser: { name: "Cruiser", cost: 90, exotics: 1, upkeep: 2, speed: 3, hull: 4, skill: 12, dmg: 2, sensors: 2, needs: "heavyHulls", text: "Heavier guns and hull." },
  dreadnought: { name: "Dreadnought", cost: 180, exotics: 3, upkeep: 4, speed: 2, hull: 8, skill: 13, dmg: 3, sensors: 2, needs: "capitalShips", text: "A fortress that moves." },
};

// Ship outlines, bow pointing right (+x), in a box from −12 to 12: SVG path data, for the map (a canvas Path2D), the
// page and the printable token sheet (tokens.mjs).
export const SHIP_SHAPES = {
  scout: "M12 0 L-6 -3.5 L-3 0 L-6 3.5 Z M-3 0 L-11 0 M3 -1.6 L7 -6.5 M3 1.6 L7 6.5",
  colony: "M10 0 Q10 -6 0 -6 L-8 -6 Q-11 -6 -11 0 Q-11 6 -8 6 L0 6 Q10 6 10 0 Z M-4 -6 L-4 6 M2 -6 L2 6 M-11 -3 L-13 -3 M-11 3 L-13 3",
  outpost: "M9 -4 L9 4 L-9 4 L-9 -4 Z M9 0 L12 0 M-2 -4 L-2 -8 L2 -8 L2 -4 M0 -8 L0 -11.5 M-9 -1.5 L-12 -1.5 M-9 1.5 L-12 1.5",
  frigate: "M12 0 L-7 -5 L-10 -8.5 L-8 -3 L-8 3 L-10 8.5 L-7 5 Z M3 -1.8 L-4 -1.8 M3 1.8 L-4 1.8",
  transport: "M11 0 L6 -5 L-9 -5 L-9 5 L6 5 Z M-9 -3 L-12 -3 L-12 3 L-9 3 M-3 -5 L-3 -8 L1 -8 L1 -5 M-3 5 L-3 8 L1 8 L1 5",
  cruiser: "M12 0 L6 -3 L-2 -3 L-6 -9.5 L-9 -9.5 L-8 -3 L-11 -3 L-11 3 L-8 3 L-9 9.5 L-6 9.5 L-2 3 L6 3 Z M6 0 L-3 0",
  dreadnought: "M12 -5 L12 5 L6 5 L4 8.5 L-10 8.5 L-12 4 L-12 -4 L-10 -8.5 L4 -8.5 L6 -5 Z M-12 -2 L-13.5 -2 M-12 2 L-13.5 2 M4 -8.5 L4 8.5 M-4 -8.5 L-4 8.5 M12 0 L6 0",
};

// Research: three fields. cost in science; needs: earlier techs.
export const TECHS = [
  { id: "sensors", name: "Deep sensors", field: "Physics", cost: 150, needs: [], text: "+1 sensor range for ships and worlds." },
  { id: "foldDrives", name: "Fold drives", field: "Physics", cost: 300, needs: ["sensors"], text: "+1 speed for every ship." },
  { id: "shields", name: "Deflector shields", field: "Physics", cost: 375, needs: ["sensors"], text: "+1 hull for every warship." },
  { id: "targeting", name: "Targeting computers", field: "Physics", cost: 450, needs: ["shields"], text: "+1 to every ship's and battery's skill." },
  { id: "corridorTheory", name: "Corridor theory", field: "Physics", cost: 800, needs: ["foldDrives", "targeting"], text: "Moving along a corridor costs nothing." },
  { id: "engine", name: "The Corridor Engine", field: "Physics", cost: 1500, needs: ["corridorTheory", "refining"], text: "Lets your capital build the Corridor Engine: the science victory." },
  { id: "automation", name: "Automated factories", field: "Industry", cost: 175, needs: [], text: "+1 industry on every world." },
  { id: "heavyHulls", name: "Heavy hulls", field: "Industry", cost: 325, needs: ["automation"], text: "Unlocks the Cruiser." },
  { id: "orbitalYards", name: "Orbital shipyards", field: "Industry", cost: 400, needs: ["heavyHulls"], text: "Ships cost 20% less." },
  { id: "refining", name: "Exotics refining", field: "Industry", cost: 500, needs: ["automation"], text: "Unlocks the Exotics refinery." },
  { id: "capitalShips", name: "Capital ships", field: "Industry", cost: 750, needs: ["orbitalYards", "refining"], text: "Unlocks the Dreadnought." },
  { id: "xenology", name: "Xenology", field: "Society", cost: 175, needs: [], text: "Colonize desert and arctic worlds." },
  { id: "commerce", name: "Commerce guilds", field: "Society", cost: 275, needs: [], text: "+1 credit on every world, and Exchanges give +2 more." },
  { id: "batteries", name: "Planetary defense", field: "Society", cost: 300, needs: ["xenology"], text: "Unlocks the Orbital battery." },
  { id: "domes", name: "Habitat domes", field: "Society", cost: 400, needs: ["xenology"], text: "Colonize barren worlds." },
  { id: "terraforming", name: "Terraforming", field: "Society", cost: 650, needs: ["domes", "commerce"], text: "+2 population on every world." },
];

export const STAR_NAMES = ["Achernar", "Brannoc", "Calyx", "Draeven", "Esk", "Fennick", "Gallow", "Halvane", "Ixion", "Jhess", "Korvath", "Lumen", "Merrow", "Nadir",
  "Oberth", "Pallas", "Quessa", "Rhune", "Sable", "Tarn", "Ulric", "Vesper", "Wyrd", "Xantha", "Ysolde", "Zhaq", "Ashkarr", "Bellwether", "Corvan", "Dunmere",
  "Ember", "Faro", "Gethsem", "Harrow", "Ione", "Jubal", "Kestrel", "Lattice", "Morrow", "Noct", "Orrin", "Peregrine", "Quill", "Rasp", "Sere", "Thule",
  "Umber", "Varro", "Weald", "Xeno", "Yarrow", "Zenith", "Aster", "Brine", "Cinder", "Dusk", "Eyrie", "Flint", "Gloam", "Hearth", "Isle", "Juniper",
  "Kiln", "Loom", "Mire", "Nimbus", "Onyx", "Pyre", "Quarry", "Rook", "Shoal", "Tithe", "Usher", "Vale", "Wick", "Yew",
  "Anvil", "Bastion", "Cairn", "Delve", "Embral", "Fathom", "Garnet", "Halcyon", "Ingot", "Jasper", "Kythera", "Lodestar", "Meridian", "Nocturne",
  "Ossuary", "Palisade", "Quorra", "Reliquary", "Solstice", "Talon", "Undertow", "Verdigris", "Wraith", "Xerxes", "Yarrowmere", "Zephyr",
  "Alcove", "Brimstone", "Cobalt", "Driftwood", "Equinox", "Foundry", "Gyre", "Hollow", "Iolite", "Jetsam", "Keel", "Lantern", "Monolith",
  "Nacre", "Obelisk", "Perihelion", "Quiver", "Rampart", "Sextant", "Tamarind", "Umbra", "Vigil", "Wellspring", "Xyst", "Yonder", "Zircon",
  "Aurel", "Bracken", "Crucible", "Dross", "Escarp", "Ferrule", "Gantry", "Hyssop", "Inlet", "Jade"];

/**
 * Prototypes: unique upgrades a faction gets by carrying out a prototype directive (a field test for its research arm).
 * `test`: the directive kind the field test asks for, and how much of it.
 */
export const PROTOTYPES = {
  lances: { name: "Fold lances", text: "+1 to every warship's skill.", test: ["fleet", 6] },
  plating: { name: "Ablative plating", text: "+1 hull for every warship.", test: ["ships", 2] },
  scanners: { name: "Long-range scanners", text: "+1 sensor range for every ship.", test: ["explore", 3] },
  tenders: { name: "Supply tenders", text: "Fleets stay in supply 2 hexes farther from your worlds.", test: ["outpost", 1] },
  drones: { name: "Yard drones", text: "Every ship costs 10% less.", test: ["ships", 3] },
  grid: { name: "Orbital shield grid", text: "+1 to every world's orbital guns, and +1 defense on every world with guns.", test: ["exotics", 3] },
  arcologies: { name: "Hab arcologies", text: "+1 population on every colony.", test: ["growth", 3] },
};
/** The empire's Focus: points to share between its priorities each turn, 2 at most to one. */
export const FOCUS = {
  points: 3,
  kinds: {
    industry: { name: "Industry", text: "+10% industry on every world for each point." },
    science: { name: "Science", text: "+10% science for each point." },
    credits: { name: "Credits", text: "+10% credits for each point." },
    defense: { name: "Defense", text: "+1 to your worlds' orbital guns for each point." },
  },
};
/** Battle stances: how a fleet fights. atk: to its own rolls; def: to the rolls of those shooting at it. */
export const STANCES = {
  balanced: { name: "Balanced", atk: 0, def: 0, text: "No change." },
  aggressive: { name: "Aggressive", atk: 1, def: 1, text: "+1 to its rolls, but +1 to the enemy's rolls against it." },
  defensive: { name: "Defensive", atk: -1, def: -1, text: "−1 to its rolls, and −1 to the enemy's rolls against it." },
};
/** Fleets out of supply (farther than this from every world and outpost of theirs) wear down. */
export const SUPPLY = { range: 3, graceTurns: 1 };
export const RULES = { maxTurns: 200, growthPerTurn: 0.12, rushRate: 2, troopDefensePerPop: 0.5, engineTurnsHeld: 0 };
