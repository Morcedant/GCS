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
  "Kiln", "Loom", "Mire", "Nimbus", "Onyx", "Pyre", "Quarry", "Rook", "Shoal", "Tithe", "Usher", "Vale", "Wick", "Yew"];

export const RULES = { maxTurns: 200, growthPerTurn: 0.12, rushRate: 2, troopDefensePerPop: 0.5, engineTurnsHeld: 0 };
