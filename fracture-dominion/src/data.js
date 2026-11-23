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
  { id: "mirrun", name: "The Mirrun Commonwealth", people: "Mirrun", color: "#2aa198",
    trait: "Pelagic scholars", traitText: "+20% science on every world, and Ocean worlds hold 3 more population.",
    homeworld: "Oluun" },
  { id: "ylith", name: "The Ylith Aeries", people: "Ylith", color: "#c9a0dc",
    trait: "Far sight", traitText: "Ships and worlds see 2 hexes farther, and scouts and colony ships move 1 faster.",
    homeworld: "Skyrrin" },
  { id: "zhaq", name: "The Zhaq Free Republics", people: "Zhaq", color: "#d07434",
    trait: "Never again", traitText: "Their worlds' garrisons are half again as strong and never weaken under siege, and a besieged world starves half as fast.",
    homeworld: "Zhaqar" },
];

// Worlds: what can live there, and what it gives. maxPop is per size point; rich worlds give more industry.
export const WORLDS = {
  terran: { name: "Terran", pop: 3, ind: 1, sci: 1, needs: null, color: "#5fa86a" },
  ocean: { name: "Ocean", pop: 3, ind: 0.8, sci: 1.2, needs: null, color: "#4a8fc4" },
  desert: { name: "Desert", pop: 2, ind: 1.2, sci: 0.8, needs: "xenology", color: "#d0a25a" },
  arctic: { name: "Arctic", pop: 2, ind: 1, sci: 1.2, needs: "xenology", color: "#bcd6e0" },
  barren: { name: "Barren", pop: 1, ind: 1.5, sci: 0.6, needs: "domes", color: "#8c8278" },
  gas: { name: "Gas giant", pop: 0, ind: 0, sci: 0, needs: null, color: "#c98f6a", outpostOnly: true },
  // A deep-space station's site (game.js foundStation): no world at all, just the station.
  void: { name: "Deep space", pop: 0, ind: 0, sci: 0, needs: null, color: "#8e9bb3", outpostOnly: true },
};

export const BUILDINGS = {
  factory: { name: "Factory", cost: 60, upkeep: 1, text: "+50% industry here." },
  lab: { name: "Research lab", cost: 60, upkeep: 1, text: "+2 science, and +50% science here." },
  market: { name: "Exchange", cost: 50, upkeep: 0, text: "+3 credits here." },
  shipyard: { name: "Shipyard", cost: 80, upkeep: 1, text: "Builds ships here." },
  battery: { name: "Orbital battery", cost: 100, upkeep: 1, needs: "batteries", anywhere: true, text: "A fortress in orbit: 6 hull, two shots a round at skill 13 for 2 damage each, and it repairs 2 a turn. While its guns stand, a siege can't blockade the world, and its garrison fights 2 points harder." },
  station: { name: "Orbital station", cost: 90, upkeep: 1, needs: "orbitalYards", anywhere: true, text: "A forward base in orbit, at a colony or an outpost (or, built by an outpost ship, in deep space): light guns (4 hull, one shot of 2, or +4 hull to a battery's), your ships here repair 2 hull a turn, it sees 2 hexes farther, and it gives supply like a fuel depot." },
  depot: { name: "Fuel depot", cost: 60, upkeep: 1, outpost: true, text: "Processes the system's volatiles into fuel: the outpost gives supply, and fleets refuel here." },
  barracks: { name: "Garrison barracks", cost: 60, upkeep: 0.5, text: "+3 to the garrison against invasion, and a siege wears it down to no less than 80%." },
  observatory: { name: "Deep-space observatory", cost: 80, upkeep: 1, needs: "sensors", text: "+3 science, and it studies one anomaly within 4 hexes every few turns, without a ship." },
  drydock: { name: "Drydock", cost: 90, upkeep: 1, needs: "orbitalYards", text: "The home yard: research reaches your existing ships only here (they're refitted with it the turn they spend here); ships here are repaired to full every turn, and ships built here cost 15% less." },
  habitat: { name: "Orbital habitat", cost: 110, upkeep: 1, needs: "domes", text: "+2 population room on this world." },
  refinery: { name: "Exotics refinery", cost: 90, upkeep: 1, needs: "refining", text: "+1 exotics if the system has a deposit." },
  engine: { name: "The Corridor Engine", cost: 1200, upkeep: 0, needs: "engine", exotics: 15, wonder: true,
    text: "Finish it and you open a corridor to everywhere at once: you win. In an open game, you hold the corridors instead: free corridor travel, a gate to any of your worlds, +2 credits on every colony, and score each turn, until someone takes or destroys it." },
  // Signature technologies' hubs (TECHS with `only`): one at a world, and that world is a prize.
  charterOffice: { name: "Charter Office", cost: 80, upkeep: 1, needs: "frontierCharters", hub: "frontierCharters", text: "The heart of frontier charters: +2 science here. Whoever takes this world learns frontier charters." },
  clearingHouse: { name: "Clearing House", cost: 80, upkeep: 1, needs: "creditNetworks", hub: "creditNetworks", text: "The heart of credit networks: +2 science here. Whoever takes this world learns credit networks." },
  broodHatchery: { name: "Brood Hatchery", cost: 80, upkeep: 1, needs: "broodYards", hub: "broodYards", text: "The heart of brood yards: +2 science here. Whoever takes this world learns brood yards." },
  legionMuster: { name: "Legion Muster", cost: 80, upkeep: 1, needs: "dropLegions", hub: "dropLegions", text: "The heart of drop legions: +2 science here. Whoever takes this world learns drop legions." },
  hullGarden: { name: "Hull Garden", cost: 80, upkeep: 1, needs: "bioticHulls", hub: "bioticHulls", text: "The heart of biotic hulls: +2 science here. Whoever takes this world learns biotic hulls." },
  resonanceLab: { name: "Resonance Lab", cost: 80, upkeep: 1, needs: "resonanceArrays", hub: "resonanceArrays", text: "The heart of resonance arrays: +2 science here. Whoever takes this world learns resonance arrays." },
  skyhookSpire: { name: "Skyhook Spire", cost: 80, upkeep: 1, needs: "skyhooks", hub: "skyhooks", text: "The heart of skyhook batteries: +2 science here. Whoever takes this world learns skyhook batteries." },
  torporVault: { name: "Torpor Vault", cost: 80, upkeep: 1, needs: "torporVaults", hub: "torporVaults", text: "The heart of torpor vaults: +2 science here. Whoever takes this world learns torpor vaults." }
};

// Ships. skill: the 3d6 roll-under target to hit; dmg: hull a hit takes; hull: what it can take.
export const SHIPS = {
  scout: { name: "Scout", cost: 20, fuel: 10, upkeep: 0.5, speed: 4, hull: 1, skill: 0, dmg: 0, sensors: 3, text: "Fast eyes. Unarmed." },
  colony: { name: "Colony ship", cost: 60, fuel: 6, upkeep: 1, speed: 2, hull: 1, skill: 0, dmg: 0, sensors: 1, colonize: true, text: "Founds a colony on a world you can live on. Used up." },
  outpost: { name: "Outpost ship", cost: 30, fuel: 6, upkeep: 0.5, speed: 2, hull: 1, skill: 0, dmg: 0, sensors: 1, outpost: true, text: "Claims any system as an outpost: its exotics and its territory. Used up." },
  frigate: { name: "Frigate", cost: 40, fuel: 6, upkeep: 1, speed: 3, hull: 2, skill: 11, dmg: 1, sensors: 2, text: "The line of battle." },
  transport: { name: "Troop transport", cost: 45, fuel: 5, upkeep: 1, speed: 3, hull: 1, skill: 0, dmg: 0, sensors: 1, troops: 2, text: "Takes an enemy world whose orbit you hold. Used up." },
  tanker: { name: "Fuel tanker", cost: 50, fuel: 12, upkeep: 1, speed: 3, hull: 2, skill: 0, dmg: 0, sensors: 1, cargo: 12, text: "Carries fuel: with a fleet, it tops up the tank when it runs dry; parked, it gives supply within 2 hexes (a unit of fuel per fleet a turn). Unarmed: escort it." },
  cruiser: { name: "Cruiser", cost: 90, fuel: 5, exotics: 1, upkeep: 2, speed: 3, hull: 4, skill: 12, dmg: 2, sensors: 2, needs: "heavyHulls", text: "Heavier guns and hull." },
  dreadnought: { name: "Dreadnought", cost: 180, fuel: 4, exotics: 3, upkeep: 4, speed: 2, hull: 10, skill: 13, dmg: 3, sensors: 2, needs: "capitalShips", text: "A fortress that moves." },
  // The wild things (wilds.js): pirates and the creatures of the deep. Nobody builds these either.
  raider: { name: "Raider", cost: 0, upkeep: 0, speed: 3, hull: 2, skill: 11, dmg: 1, sensors: 2, wild: true, text: "A pirate gunship: fast, lightly armed, and after your credits." },
  haven: { name: "Pirate haven", cost: 0, upkeep: 0, speed: 0, hull: 8, skill: 12, dmg: 2, shots: 2, sensors: 2, wild: true, text: "A fortified pirate base in an empty system. It sends out raiders until someone burns it." },
  swarm: { name: "Crystal swarm", cost: 0, upkeep: 0, speed: 0, hull: 5, skill: 11, dmg: 1, shots: 3, sensors: 1, wild: true, text: "Living crystal that nests on rich worlds and shreds anything that comes near. It never leaves." },
  husk: { name: "Warden husk", cost: 0, upkeep: 0, speed: 0, hull: 10, skill: 12, dmg: 2, shots: 2, sensors: 1, wild: true, text: "A dead Warden machine from an older war, half-awake in the Graveyard. It fires on any warship that comes near, and its wreck is full of old science." },
  leviathan: { name: "Void leviathan", cost: 0, upkeep: 0, speed: 1, hull: 12, skill: 12, dmg: 3, sensors: 2, wild: true, text: "A creature the size of a moon, drifting between the stars. It fights whatever it finds." },
  merchant: { name: "Merchant convoy", cost: 0, upkeep: 0, speed: 3, hull: 2, skill: 0, dmg: 0, sensors: 1, fuel: 99, trader: true, text: "Free traders, carrying goods between the Exchanges. They pay both ends when they arrive, if the pirates don't get them first." },
  // The Wardens' machines (the late-game crisis, crisis.js): nobody builds these.
  sentinel: { name: "Sentinel", cost: 0, upkeep: 0, speed: 3, hull: 3, skill: 12, dmg: 1, sensors: 2, warden: true, text: "A Warden hunter: quick, and never alone." },
  colossus: { name: "Colossus", cost: 0, upkeep: 0, speed: 2, hull: 6, skill: 13, dmg: 2, sensors: 2, warden: true, text: "A Warden war machine the size of a moon's mountain." },
  probe: { name: "Warden probe", cost: 0, upkeep: 0, speed: 4, hull: 3, skill: 0, dmg: 0, sensors: 4, warden: true, evasive: 3, text: "A Warden scout out of the rifts: it maps worlds and their defences, then goes back with what it saw. Unarmed, small and quick (−3 to hit it): only warships can catch it." },
  watcher: { name: "Watcher", cost: 0, upkeep: 0, speed: 0, hull: 6, skill: 12, dmg: 2, sensors: 3, warden: true, text: "A Warden machine half-buried by a rift, dormant but watching. It fights whatever comes near. When the Wardens wake, it wakes as a Node." },
  node: { name: "Warden Node", cost: 0, upkeep: 0, speed: 0, hull: 10, skill: 12, dmg: 2, shots: 2, sensors: 3, warden: true, text: "A Warden forge, built on a world they've burned. It sends out hunters and holds the system. While one stands, a new Heart can grow." },
  heart: { name: "Heart", cost: 0, upkeep: 0, speed: 0, hull: 20, skill: 14, dmg: 3, sensors: 3, warden: true, text: "The Wardens' mind and forge. It never moves, mends itself, and sends out the waves. Break it and they go dark." },
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
  sentinel: "M12 0 L2 -4 L-4 -10 L-2 -3 L-10 0 L-2 3 L-4 10 L2 4 Z M2 0 L-4 0",
  colossus: "M12 0 L7 -6 L0 -6 L-3 -11 L-8 -11 L-7 -6 L-12 -4 L-12 4 L-7 6 L-8 11 L-3 11 L0 6 L7 6 Z M7 0 L-7 0 M0 -6 L0 6",
  raider: "M11 0 L-4 -6 L-9 -9 L-6 -2 L-10 0 L-6 2 L-9 9 L-4 6 Z M1 0 L-5 0",
  haven: "M0 -11 L10 -4 L7 9 L-7 9 L-10 -4 Z M0 -5 L4 -2 L3 4 L-3 4 L-4 -2 Z M10 -4 L12.5 -6 M-10 -4 L-12.5 -6 M7 9 L9 11.5 M-7 9 L-9 11.5",
  swarm: "M0 -11 L3 -3 L11 -4 L5 2 L8 10 L0 5 L-8 10 L-5 2 L-11 -4 L-3 -3 Z",
  husk: "M0 -11 L9 -5 L9 5 L0 11 L-9 5 L-9 -5 Z M0 -5 L5 0 L0 5 L-5 0 Z M-9 -5 L-12 -9 M9 5 L11 10 M2 11 L3 13",
  leviathan: "M12 0 Q8 -8 -2 -7 Q-8 -6 -12 -10 Q-10 -3 -10 0 Q-10 3 -12 10 Q-8 6 -2 7 Q8 8 12 0 Z M6 -2 L4 -2 M-2 -7 Q0 0 -2 7",
  probe: "M12 0 L2 -4 L-4 -2 L-9 -6 L-7 0 L-9 6 L-4 2 L2 4 Z M2 -1.5 L5 0 L2 1.5 Z",
  watcher: "M0 -10 L7 -4 L7 4 L0 10 L-7 4 L-7 -4 Z M0 -4 A4 4 0 1 0 0 4 A4 4 0 1 0 0 -4 M0 -1.5 A1.5 1.5 0 1 0 0 1.5 A1.5 1.5 0 1 0 0 -1.5",
  node: "M0 -11 L4 -4 L11 -4 L6 1 L8 9 L0 5 L-8 9 L-6 1 L-11 -4 L-4 -4 Z M0 -3 L3 0 L0 3 L-3 0 Z",
  heart: "M0 -12 L8.5 -8.5 L12 0 L8.5 8.5 L0 12 L-8.5 8.5 L-12 0 L-8.5 -8.5 Z M0 -6 L6 0 L0 6 L-6 0 Z M0 -12 L0 -6 M12 0 L6 0 M0 12 L0 6 M-12 0 L-6 0",
};

// Outlines for ships that had none: the fuel tanker, and the free traders' merchant convoys.
SHIP_SHAPES.tanker = "M11 0 Q11 -5 6 -5 L-8 -5 Q-11 -5 -11 0 Q-11 5 -8 5 L6 5 Q11 5 11 0 Z M-11 -2 L-13 -2 M-11 2 L-13 2 M0 -5 L0 5";
SHIP_SHAPES.merchant = "M11 0 L7 -5 L-9 -5 L-11 -3 L-11 3 L-9 5 L7 5 Z M-3 -5 L-3 5 M2 -5 L2 5 M-11 0 L-13 0";

/**
 * Each people's own ships: its class names and outlines for every ship type (bow +x, −12 to 12, like SHIP_SHAPES).
 * The Concord build angular and modular; the Tessan in sweeping curves; the Kel grow segmented hulls; the Hegemony
 * heavy spiked prows; the Vael's living ships have fins and tails. What the ships do is the same for everyone.
 */
export const FLEET_STYLES = {
  concord: { style: "Angular, modular hulls: Earth's yards build what works, and bolt on more.",
    classes: { scout: "Wayfarer", colony: "Mayflower", outpost: "Homestead", frigate: "Lancer", transport: "Marathon", tanker: "Wellspring", cruiser: "Aegis", dreadnought: "Sovereign" },
    shapes: {
      scout: "M12 0 L2 -3 L-8 -3 L-10 -5 L-11 -2 L-11 2 L-10 5 L-8 3 L2 3 Z M-2 -3 L-2 3",
      colony: "M11 0 L7 -5 L-9 -5 L-11 -2 L-11 2 L-9 5 L7 5 Z M-1 -5 L-1 5 M-5 -5 L-5 5 M3 -5 L3 5",
      outpost: "M8 -5 L8 5 L-8 5 L-8 -5 Z M8 0 L12 0 M0 -5 L0 -10 M-4 -10 L4 -10 M-8 -2 L-11 -2 M-8 2 L-11 2",
      frigate: "M12 0 L4 -3 L-6 -3 L-6 -7 L-10 -7 L-10 7 L-6 7 L-6 3 L4 3 Z M-3 -3 L-3 3",
      transport: "M11 0 L7 -6 L-10 -6 L-10 6 L7 6 Z M-10 -3 L-12 -3 L-12 3 L-10 3 M-4 -6 L-4 6 M2 -6 L2 6",
      tanker: "M11 0 Q11 -5 6 -5 L-8 -5 Q-11 -5 -11 0 Q-11 5 -8 5 L6 5 Q11 5 11 0 Z M-11 -2 L-13 -2 M-11 2 L-13 2 M0 -5 L0 5",
      cruiser: "M12 0 L6 -4 L-4 -4 L-4 -10 L-9 -10 L-9 -4 L-12 -4 L-12 4 L-9 4 L-9 10 L-4 10 L-4 4 L6 4 Z M0 -4 L0 4 M6 -4 L6 4",
      dreadnought: "M12 -3 L12 3 L8 6 L-2 6 L-2 11 L-10 11 L-10 6 L-12 6 L-12 -6 L-10 -6 L-10 -11 L-2 -11 L-2 -6 L8 -6 Z M4 -6 L4 6 M-6 -6 L-6 6" } },
  tessan: { style: "Sweeping curves and crescent wings: old money builds to be admired.",
    classes: { scout: "Envoy", colony: "Dowry", outpost: "Tollhouse", frigate: "Courtier", transport: "Retinue", tanker: "Cistern", cruiser: "Magistrate", dreadnought: "Dynast" },
    shapes: {
      scout: "M12 0 Q4 -4 -8 -2 Q-4 0 -8 2 Q4 4 12 0 Z",
      colony: "M11 0 Q9 -6 0 -6 Q-9 -6 -11 0 Q-9 6 0 6 Q9 6 11 0 Z M-11 0 L-13 0 M1 -6 L1 6",
      outpost: "M0 -9 Q8 -9 8 0 Q8 9 0 9 Q-8 9 -8 0 Q-8 -9 0 -9 Z M0 -4 A4 4 0 1 0 0 4 A4 4 0 1 0 0 -4 M8 0 L12 0",
      frigate: "M12 0 Q6 -3 -2 -3 Q-8 -9 -11 -8 Q-7 -4 -8 0 Q-7 4 -11 8 Q-8 9 -2 3 Q6 3 12 0 Z",
      transport: "M11 0 Q9 -6 -2 -6 L-10 -5 Q-12 0 -10 5 L-2 6 Q9 6 11 0 Z M-3 -6 L-3 6 M4 -6 L4 6",
      tanker: "M11 0 Q10 -7 0 -7 Q-10 -7 -11 0 Q-10 7 0 7 Q10 7 11 0 Z M-5 -6 L-5 6 M3 -7 L3 7",
      cruiser: "M12 0 Q8 -5 0 -5 Q-6 -11 -12 -10 Q-8 -5 -9 0 Q-8 5 -12 10 Q-6 11 0 5 Q8 5 12 0 Z M4 0 A3 3 0 1 0 -2 0 A3 3 0 1 0 4 0",
      dreadnought: "M12 0 Q10 -7 2 -8 Q-4 -12 -12 -11 Q-9 -6 -10 -3 L-12 0 L-10 3 Q-9 6 -12 11 Q-4 12 2 8 Q10 7 12 0 Z M6 0 A4 4 0 1 0 -2 0 A4 4 0 1 0 6 0 M-6 -6 L-6 6" } },
  kel: { style: "Segmented hulls grown in the hive-yards, bristling with mandibles.",
    classes: { scout: "Drone", colony: "Swarmseed", outpost: "Burrow", frigate: "Stinger", transport: "Broodcarrier", tanker: "Nectar", cruiser: "Mandible", dreadnought: "Hivemother" },
    shapes: {
      scout: "M11 0 Q8 -3 5 0 Q8 3 11 0 Z M5 0 Q0 -4 -5 0 Q0 4 5 0 Z M-5 0 Q-9 -3 -11 0 Q-9 3 -5 0 Z",
      colony: "M10 0 Q8 -7 0 -7 Q-8 -7 -10 0 Q-8 7 0 7 Q8 7 10 0 Z M-2 -3 A2 2 0 1 0 -2 1 A2 2 0 1 0 -2 -3 M4 -1 A1.5 1.5 0 1 0 4 2 A1.5 1.5 0 1 0 4 -1",
      outpost: "M0 -9 Q9 -6 9 0 Q9 6 0 9 Q-9 6 -9 0 Q-9 -6 0 -9 Z M0 -4 Q4 0 0 4 Q-4 0 0 -4 Z M9 0 L12 0",
      frigate: "M12 0 Q9 -4 5 0 Q9 4 12 0 Z M5 0 Q0 -5 -6 0 Q0 5 5 0 Z M-6 0 Q-10 -4 -12 0 Q-10 4 -6 0 Z M2 -3 L5 -8 M2 3 L5 8",
      transport: "M11 0 Q8 -6 2 -6 Q-2 -2 -6 -6 Q-11 -5 -11 0 Q-11 5 -6 6 Q-2 2 2 6 Q8 6 11 0 Z",
      tanker: "M10 0 Q10 -8 0 -8 Q-10 -8 -10 0 Q-10 8 0 8 Q10 8 10 0 Z M10 0 L13 0 M-2 -8 L-2 8",
      cruiser: "M12 0 Q8 -5 4 0 Q8 5 12 0 Z M4 0 Q-1 -7 -7 0 Q-1 7 4 0 Z M-7 0 Q-11 -5 -13 0 Q-11 5 -7 0 Z M0 -5 L4 -11 M0 5 L4 11 M-4 -5 L-6 -10 M-4 5 L-6 10",
      dreadnought: "M12 0 Q9 -5 5 0 Q9 5 12 0 Z M5 0 Q0 -9 -6 0 Q0 9 5 0 Z M-6 0 Q-10 -7 -13 0 Q-10 7 -6 0 Z M1 -7 L6 -12 M1 7 L6 12 M-3 -8 L-5 -12 M-3 8 L-5 12 M-8 -5 L-12 -9 M-8 5 L-12 9" } },
  hegemony: { style: "Heavy armoured prows and spiked fins: the legions' ships are built to frighten.",
    classes: { scout: "Outrider", colony: "Colonia", outpost: "Castellum", frigate: "Gladius", transport: "Cohort", tanker: "Aqueduct", cruiser: "Praetor", dreadnought: "Imperator" },
    shapes: {
      scout: "M12 0 L0 -4 L-6 -4 L-10 -7 L-8 0 L-10 7 L-6 4 L0 4 Z",
      colony: "M10 -6 L10 6 L-10 6 L-12 3 L-12 -3 L-10 -6 Z M10 0 L13 0 M-4 -6 L-4 6 M3 -6 L3 6",
      outpost: "M-7 -7 L7 -7 L7 7 L-7 7 Z M-7 -7 L-10 -10 M7 -7 L10 -10 M7 7 L10 10 M-7 7 L-10 10 M7 0 L12 0",
      frigate: "M12 0 L6 -2 L6 -5 L-4 -5 L-8 -9 L-10 -5 L-10 5 L-8 9 L-4 5 L6 5 L6 2 Z M-2 -5 L-2 5",
      transport: "M12 0 L8 -6 L-10 -6 L-12 -3 L-12 3 L-10 6 L8 6 Z M-5 -6 L-5 6 M1 -6 L1 6 M8 -6 L8 6",
      tanker: "M11 -4 L11 4 L8 7 L-9 7 L-12 4 L-12 -4 L-9 -7 L8 -7 Z M-3 -7 L-3 7 M11 0 L13 0",
      cruiser: "M13 0 L7 -3 L7 -6 L-2 -6 L-6 -11 L-9 -6 L-12 -6 L-12 6 L-9 6 L-6 11 L-2 6 L7 6 L7 3 Z M2 -6 L2 6 M-5 -6 L-5 6",
      dreadnought: "M13 0 L9 -4 L9 -8 L-1 -8 L-4 -12 L-7 -8 L-12 -8 L-12 8 L-7 8 L-4 12 L-1 8 L9 8 L9 4 Z M3 -8 L3 8 M-6 -8 L-6 8 M9 -4 L9 4" } },
  vael: { style: "Living ships: rays and fish the size of towers, with fins and trailing tails.",
    classes: { scout: "Mote", colony: "Spore", outpost: "Coral", frigate: "Darter", transport: "Shoal", tanker: "Wellfin", cruiser: "Manta", dreadnought: "Abyssal" },
    shapes: {
      scout: "M12 0 Q6 -3 -4 -1 Q-9 -5 -12 -4 Q-8 0 -12 4 Q-9 5 -4 1 Q6 3 12 0 Z",
      colony: "M11 0 Q8 -7 -2 -6 Q-10 -6 -11 0 Q-10 6 -2 6 Q8 7 11 0 Z M-11 0 L-13 -5 M-11 0 L-13 5",
      outpost: "M0 -10 Q6 -4 9 0 Q6 4 0 10 Q-6 4 -9 0 Q-6 -4 0 -10 Z M0 -4 Q2 0 0 4 Q-2 0 0 -4 Z",
      frigate: "M12 0 Q7 -5 -2 -3 Q-6 -9 -10 -10 Q-8 -4 -12 0 Q-8 4 -10 10 Q-6 9 -2 3 Q7 5 12 0 Z",
      transport: "M11 0 Q7 -7 -3 -6 Q-11 -5 -11 0 Q-11 5 -3 6 Q7 7 11 0 Z M0 -6 L0 6 M-5 -5 L-5 5",
      tanker: "M11 0 Q9 -8 -1 -7 Q-11 -6 -11 0 Q-11 6 -1 7 Q9 8 11 0 Z M-11 0 L-13 -3 M-11 0 L-13 3",
      cruiser: "M12 0 Q8 -4 2 -4 Q-2 -12 -10 -11 Q-6 -5 -8 0 Q-6 5 -10 11 Q-2 12 2 4 Q8 4 12 0 Z M-8 0 L-13 0",
      dreadnought: "M12 0 Q10 -6 4 -7 Q-2 -13 -12 -12 Q-7 -6 -9 0 Q-7 6 -12 12 Q-2 13 4 7 Q10 6 12 0 Z M-9 0 L-13 -2 M-9 0 L-13 2 M1 -3 L1 3" } },
  mirrun: { style: "Smooth teardrop hulls with fins and gill-vents: built to slip through pressure, in water or in the fold.",
    classes: { scout: "Ripple", colony: "Tidepool", outpost: "Buoy", frigate: "Barracuda", transport: "Current", tanker: "Reservoir", cruiser: "Leviathan", dreadnought: "Trench" },
    shapes: {
      scout: "M12 0 Q6 -4 -6 -3 L-11 -6 L-9 0 L-11 6 L-6 3 Q6 4 12 0 Z",
      colony: "M11 0 Q9 -7 -3 -6 Q-11 -5 -11 0 Q-11 5 -3 6 Q9 7 11 0 Z M-2 -3 Q2 0 -2 3",
      outpost: "M0 -9 Q7 -7 7 0 Q7 7 0 9 Q-7 7 -7 0 Q-7 -7 0 -9 Z M0 9 L0 12 M-3 12 L3 12",
      frigate: "M12 0 Q6 -4 -5 -3 L-10 -8 L-8 -2 L-12 0 L-8 2 L-10 8 L-5 3 Q6 4 12 0 Z",
      transport: "M11 0 Q8 -7 -4 -6 Q-11 -4 -11 0 Q-11 4 -4 6 Q8 7 11 0 Z M-4 -6 Q-1 0 -4 6 M3 -6 Q6 0 3 6",
      tanker: "M10 0 Q10 -7 0 -7 Q-11 -7 -11 0 Q-11 7 0 7 Q10 7 10 0 Z M10 0 L13 0 M-5 -7 L-5 7",
      cruiser: "M12 0 Q8 -5 0 -5 L-4 -11 L-7 -5 Q-12 -4 -12 0 Q-12 4 -7 5 L-4 11 L0 5 Q8 5 12 0 Z M2 -2 Q4 0 2 2",
      dreadnought: "M12 0 Q10 -7 1 -7 L-3 -12 L-7 -7 Q-12 -6 -12 0 Q-12 6 -7 7 L-3 12 L1 7 Q10 7 12 0 Z M-12 0 L-9 0 M3 -3 Q6 0 3 3 M-3 -3 Q0 0 -3 3" } },
  ylith: { style: "Swept wings and feathered vanes: the Ylith build ships that look ready to glide.",
    classes: { scout: "Kestrel", colony: "Nestling", outpost: "Eyrie", frigate: "Harrier", transport: "Flock", tanker: "Updraft", cruiser: "Condor", dreadnought: "Skylord" },
    shapes: {
      scout: "M12 0 L-6 -8 L-3 -2 L-10 0 L-3 2 L-6 8 Z",
      colony: "M11 0 L2 -4 L-6 -10 L-5 -4 L-10 -3 L-10 3 L-5 4 L-6 10 L2 4 Z",
      outpost: "M0 -10 L4 -3 L10 0 L4 3 L0 10 L-4 3 L-10 0 L-4 -3 Z M0 -3 L3 0 L0 3 L-3 0 Z",
      frigate: "M12 0 L0 -3 L-8 -11 L-6 -3 L-11 -2 L-11 2 L-6 3 L-8 11 L0 3 Z",
      transport: "M11 0 L3 -5 L-4 -11 L-4 -5 L-10 -4 L-10 4 L-4 5 L-4 11 L3 5 Z M-1 -5 L-1 5",
      tanker: "M11 0 Q7 -5 0 -5 L-5 -10 L-5 -5 Q-10 -4 -10 0 Q-10 4 -5 5 L-5 10 L0 5 Q7 5 11 0 Z",
      cruiser: "M12 0 L3 -3 L-6 -12 L-6 -5 L-12 -6 L-9 0 L-12 6 L-6 5 L-6 12 L3 3 Z M-2 -6 L-2 6",
      dreadnought: "M12 0 L4 -4 L-4 -12 L-6 -6 L-12 -9 L-10 0 L-12 9 L-6 6 L-4 12 L4 4 Z M-1 -7 L-1 7 M-6 -6 L-6 6" } },
  zhaq: { style: "Three-pronged, segmented hulls: Zhaq ships stand on three struts, like their builders on three legs.",
    classes: { scout: "Watcher", colony: "Seedvault", outpost: "Tripod", frigate: "Sentinel", transport: "Cohort", tanker: "Cache", cruiser: "Bastion", dreadnought: "Republic" },
    shapes: {
      scout: "M12 0 L0 -3 L-10 -6 L-6 0 L-10 6 L0 3 Z M-6 0 L-12 0",
      colony: "M11 0 L5 -5 L-5 -5 L-11 -9 L-9 0 L-11 9 L-5 5 L5 5 Z M-1 -5 L-1 5",
      outpost: "M0 -9 L8 5 L-8 5 Z M0 -9 L0 -12 M8 5 L11 7 M-8 5 L-11 7 M0 -2 L0 2",
      frigate: "M12 0 L4 -4 L-6 -4 L-12 -10 L-9 0 L-12 10 L-6 4 L4 4 Z M-2 -4 L-2 4 M-6 0 L-12 0",
      transport: "M11 0 L6 -6 L-6 -6 L-11 -10 L-9 0 L-11 10 L-6 6 L6 6 Z M-2 -6 L-2 6 M2 -6 L2 6",
      tanker: "M10 0 L5 -6 L-6 -6 L-6 6 L5 6 Z M-6 -6 L-11 -10 M-6 6 L-11 10 M-6 0 L-12 0 M-1 -6 L-1 6",
      cruiser: "M12 0 L6 -5 L-4 -5 L-8 -12 L-9 -5 L-12 -4 L-10 0 L-12 4 L-9 5 L-8 12 L-4 5 L6 5 Z M0 -5 L0 5 M-10 0 L-13 0",
      dreadnought: "M12 -3 L12 3 L6 7 L-4 7 L-6 13 L-10 7 L-12 0 L-10 -7 L-6 -13 L-4 -7 L6 -7 Z M2 -7 L2 7 M-4 -7 L-4 7 M-12 0 L-14 0" } },
};
/** A ship's outline for its owner: the people's own, or the common one (the Wardens, pirates, creatures, traders). */
export const shipShape = (fid, type) => (FLEET_STYLES[fid] && FLEET_STYLES[fid].shapes[type]) || SHIP_SHAPES[type] || SHIP_SHAPES.frigate;
/** "Aegis-class cruiser" (plural: "Aegis-class cruisers"); a ship with no class keeps its plain name. */
export function shipLabel(fid, type, plural = false) {
  const c = FLEET_STYLES[fid] && FLEET_STYLES[fid].classes[type], n = SHIPS[type].name;
  const base = c ? `${c}-class ${n.toLowerCase()}` : n;
  return plural && !base.endsWith("s") ? base + "s" : base;
}

// Research: three fields. cost in science; needs: earlier techs.
export const TECHS = [
  { id: "sensors", name: "Deep sensors", field: "Physics", cost: 150, needs: [], text: "+1 sensor range for ships and worlds." },
  { id: "foldDrives", name: "Fold drives", field: "Physics", cost: 300, needs: ["sensors"], text: "+1 speed for every ship." },
  { id: "shields", name: "Deflector shields", field: "Physics", cost: 375, needs: ["sensors"], text: "+1 hull for every warship." },
  { id: "targeting", name: "Targeting computers", field: "Physics", cost: 450, needs: ["shields"], text: "+1 to every ship's and battery's skill." },
  { id: "riftDrives", name: "Rift drives", field: "Physics", cost: 600, needs: ["foldDrives"], text: "Your ships can cross into sealed sectors (the Dead Zone, the Warden Graveyard) without a Rift beacon." },
  { id: "corridorTheory", name: "Corridor theory", field: "Physics", cost: 800, needs: ["foldDrives", "targeting"], text: "Moving along a corridor costs nothing." },
  { id: "engine", name: "The Corridor Engine", field: "Physics", cost: 1500, needs: ["corridorTheory", "refining"], text: "Lets your capital build the Corridor Engine: the science victory. In an open game it's the galaxy's great prize instead, and only one can stand at a time." },
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
  // Each people's signature technology: only it can research it; anyone who takes a world with its hub learns it.
  { id: "frontierCharters", name: "Frontier charters", field: "Society", cost: 350, needs: ["xenology"], only: "concord", hub: "charterOffice", text: "New colonies start with 1 more population, and grow 15% faster. Unique to this people: others learn it only by taking a world with its Charter Office." },
  { id: "creditNetworks", name: "Credit networks", field: "Society", cost: 350, needs: ["commerce"], only: "tessan", hub: "clearingHouse", text: "Each colony trades with one more partner, and trade pays 50% more. Unique to this people: others learn it only by taking a world with its Clearing House." },
  { id: "broodYards", name: "Brood yards", field: "Industry", cost: 350, needs: ["automation"], only: "kel", hub: "broodHatchery", text: "Frigates cost 25% less, and have 1 more hull. Unique to this people: others learn it only by taking a world with its Brood Hatchery." },
  { id: "dropLegions", name: "Drop legions", field: "Industry", cost: 400, needs: ["heavyHulls"], only: "hegemony", hub: "legionMuster", text: "Troop transports land half again as many troops. Unique to this people: others learn it only by taking a world with its Legion Muster." },
  { id: "bioticHulls", name: "Biotic hulls", field: "Physics", cost: 400, needs: ["sensors"], only: "vael", hub: "hullGarden", text: "Every ship mends 1 hull a turn, anywhere. Unique to this people: others learn it only by taking a world with its Hull Garden." },
  { id: "resonanceArrays", name: "Resonance arrays", field: "Physics", cost: 350, needs: ["sensors"], only: "mirrun", hub: "resonanceLab", text: "Ships see 2 hexes farther, and worlds 1. Unique to this people: others learn it only by taking a world with its Resonance Lab." },
  { id: "skyhooks", name: "Skyhook batteries", field: "Society", cost: 400, needs: ["batteries"], only: "ylith", hub: "skyhookSpire", text: "Orbital batteries fire one more shot a round. Unique to this people: others learn it only by taking a world with its Skyhook Spire." },
  { id: "torporVaults", name: "Torpor vaults", field: "Society", cost: 350, needs: ["xenology"], only: "zhaq", hub: "torporVault", text: "Besieged worlds never starve, and their garrisons are 2 stronger. Unique to this people: others learn it only by taking a world with its Torpor Vault." },
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
  grid: { name: "Orbital shield grid", text: "+1 to every world's orbital guns, and +1 hull on every world with guns (+2 with an Orbital battery).", test: ["exotics", 3] },
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
/** Fleets out of supply (farther than this from every colony and fuel-depot outpost of theirs) wear down, and burn fuel. */
export const SUPPLY = { range: 3, graceTurns: 1 };
// Fuel: a fleet carries enough for so many turns of travel beyond supply (its thirstiest ship's). Each turn it moves out
// of supply burns one; with none left it crawls a hex a turn. In supply it refuels. Colonies give supply; an outpost
// gives supply only once it has a Fuel depot (bought with credits, or founded with the outpost).
/** Outposts have no industry: what they get (an Orbital battery or station, `anywhere` buildings) is bought with credits,
 * at `rate` credits per point of the building's cost. */
export const OUTPOST_BUY = { rate: 1.5 };
/** Yards: a station repairs `station` hull a turn; a drydock repairs to full, takes `discount` off ships built there, and
 * refits ships with what's been researched since they were built (game.js refitShip): nowhere else can. */
export const YARDS = { station: 2, discount: 0.15 };
/** What an outpost sells: fuel (with a fuel depot or a station; more from a gas giant's volatiles), exotics (from a
 * deposit), and fuel to each passing merchant convoy. Nothing while blockaded, or while a raided depot is dry. */
export const OUTPOST_TRADE = { base: 0.5, fuel: 2, gas: 1, exotics: 2, convoy: 2 };
export const FUEL = { depotCost: 60, foundWithDepot: 40, fumesSpeed: 1, tankerRange: 2,
  // The fuel reserve: each power's stock of fuel. Colonies make a little (a capital and gas giants more); each fuel depot
  // or station makes more and raises how much can be stored. Refuelling a fleet in supply costs `refuelPer` a ship for
  // each turn of fuel put back; filling a tanker, one a unit. A fleet told to burn hard moves `burnSpeed` hexes farther
  // a turn: `burnPer` a ship from the reserve in supply, or an extra turn of its own fuel beyond it. Moving in supply
  // costs `movePer` a ship a turn from the reserve; a power whose reserve can't pay moves its fleets `shortSlow` slower.
  start: 30, perColony: 0.2, capital: 1, gas: 1, perDepot: 1, capBase: 40, capPerDepot: 15, refuelPer: 0.5, burnPer: 0.5, burnSpeed: 1, movePer: 0.3, shortSlow: 1 };
// A supply point (a colony, a fuel depot, a parked tanker) with an enemy's warships in its system is cut: it gives no supply.
// Trade: a colony earns credits for each trade link, another colony within range that's its own power's or a treaty
// partner's (an Exchange doubles it). A blockaded world (under siege) has no trade, and is no partner for anyone.
export const TRADE = { range: 4, perLink: 0.5, maxLinks: 4, exchange: 2 };
// Sieges: an enemy's warships in a world's orbit. Each turn of it the world's industry and credits are halved and it
// grows nothing; every few turns it loses a population; its garrison weakens; an ordinary colony, starved down to a
// few millions, surrenders at last.
// The orbital battery: its guns' hull, shots a round and damage a shot, repair a turn, the shield grid's extra hull, and its
// troops' share of the garrison. A capital without one has smaller guns (capitalHull, one shot of 1).
export const BATTERY = { hull: 6, shots: 2, dmg: 2, repair: 2, gridHull: 2, garrison: 2, capitalHull: 2 };
export const SIEGE = { industry: 0.5, credits: 0.5, starveEvery: 3, garrisonPerTurn: 0.1, garrisonMin: 0.5, surrenderAfter: 10, surrenderPop: 3 };
// The exotics market: buy at the price, sell at three quarters of it; each unit moves the price, which drifts back.
export const MARKET = { base: 12, step: 1, min: 4, max: 30, drift: 1, sellRate: 0.75 };
/** The late-game crisis: when the Wardens wake, and how hard they come. */
/**
 * Advances: research you can take again and again, a level at a time, once the technology it builds on is done.
 * Each level costs more (cost × (1 + 0.5 × the level you have)); max is the last level.
 */
export const ADVANCES = [
  { id: "efficiency", name: "Industrial efficiency", field: "Industry", cost: 350, max: 5, needs: "automation", text: "+5% industry on every world, per level." },
  { id: "theory", name: "Unified theory", field: "Physics", cost: 350, max: 5, needs: "sensors", text: "+5% science on every world, per level." },
  { id: "banking", name: "Interstellar banking", field: "Society", cost: 350, max: 5, needs: "commerce", text: "+5% credits on every world, per level." },
  { id: "armor", name: "Composite armor", field: "Industry", cost: 500, max: 2, needs: "shields", text: "+1 hull on every warship, per level." },
  { id: "fireControl", name: "Fire control", field: "Physics", cost: 700, max: 2, needs: "targeting", text: "+1 to every warship's skill, per level." },
  { id: "habitats", name: "Habitat engineering", field: "Society", cost: 450, max: 3, needs: "domes", text: "+1 population room on every world, per level." },
  { id: "tanks", name: "Drive tuning", field: "Physics", cost: 300, max: 3, needs: "foldDrives", text: "+2 fuel in every ship's tank, per level." },
];
/** Research from other sources: anomalies (a scout surveys one), research pacts (each trade treaty, up to 3). */
export const SCIENCE = { anomalyBase: 40, anomalyPerTurn: 0.6, anomalyMax: 160, observatoryRange: 4, observatoryEvery: 4, observatoryShare: 0.5, pactBonus: 0.05, pactMax: 3 };
/**
 * The wild things (wilds.js). Raiders only go after colonies of preyPop or more that are at least youngTurns old, and
 * neither pirates nor swarms fire on unarmed ships: they don't stop anyone settling. Pirate havens: the first at `havenFirst`, another every `havenEvery` turns, up to
 * havens[size] at once; each sends out raiders every `raidEvery` turns. Crystal swarms nest on rich systems from the
 * start; void leviathans wake from `leviathanFirst`. Destroying one pays a bounty: credits and research.
 */
export const WILDS = {
  havenFirst: 30, havenEvery: 22, preyPop: 3, youngTurns: 12, havens: { small: 2, medium: 3, large: 4, vast: 5 }, raidEvery: 5, raidersPerHaven: 2,
  raidCredits: 12, raidPerPop: 3, raidStay: 3, raidRange: 6,
  swarms: { small: 2, medium: 3, large: 5, vast: 7 }, leviathanFirst: 40, leviathanEvery: 35, leviathans: 2,
  bounty: { haven: { credits: 100, research: 50 }, raider: { credits: 10, research: 0 }, swarm: { credits: 0, research: 90, exotics: 2 }, leviathan: { credits: 40, research: 160, exotics: 4 }, husk: { credits: 20, research: 120, exotics: 1 } },
  pirates: { name: "Pirates", color: "#d8d14a" }, beasts: { name: "The creatures of the deep", color: "#4ec9b0" },
};
/**
 * How many wild things a game has (the new-game form, and Menu → Pirates and creatures, at any time). Light is the
 * default: one haven at a time on most maps, one raider fleet each, and fewer swarms. Heavy is the full WILDS numbers.
 */
export const WILD_LEVELS = {
  none: { name: "None", text: "No pirates or creatures." },
  light: { name: "Light", text: "A few: one pirate haven at a time (two on large maps) with one raider fleet, a couple of crystal swarms, and a single void leviathan late on.",
    havens: { small: 1, medium: 1, large: 2, vast: 2 }, havenEvery: 35, raidersPerHaven: 1, raidEvery: 8, raidMax: 3,
    swarms: { small: 1, medium: 2, large: 2, vast: 3 }, leviathans: 1, leviathanFirst: 70 },
  heavy: { name: "Heavy", text: "Plenty: up to 2–5 havens, each with two raider fleets, swarms on many rich systems, and two leviathans from turn 40.",
    havens: { small: 2, medium: 3, large: 4, vast: 5 }, havenEvery: 22, raidersPerHaven: 2, raidEvery: 5, raidMax: 5,
    swarms: { small: 2, medium: 3, large: 5, vast: 7 }, leviathans: 2, leviathanFirst: 40 },
};
/**
 * Pirate protection: raiders holding a world demand a ransom (ransomBase + ransomPerPop × population) to leave it;
 * a new haven demands tribute from the powers near it (tributeBase + tributePerTurn × the turn). Either buys
 * `turns` turns in which that haven's raiders leave all your worlds alone.
 */
export const PROTECTION = { ransomBase: 15, ransomPerPop: 6, tributeBase: 25, tributePerTurn: 0.4, turns: 20 };
/** Raiding an enemy's fuel depot: the fleet and its tankers fill up, and the depot gives no supply for `cut` turns. */
export const DEPOT_RAID = { cut: 5, steal: 15 };
/** A pirate patrol pact: partners' warships guard each other's worlds against raiders, and each partner gets `share` of
 * the bounty when the other destroys a pirate ship. */
export const PATROL = { share: 0.5, regard: 0.3 };
/**
 * Influence: ways to move a rival's regard when you need to (the Diplomacy tab).
 *   gift: `perRegard` credits buy a point of regard (exotics at the market price), worth less the more you've given them
 *     in the last `window` turns (halved after `fade` credits' worth).
 *   amends: pay `perPoint` credits a point (plus `perTurn` a turn of game) to make up for one grievance they remember;
 *     `back` of what it cost you in regard comes back, and the grievance is forgiven.
 *   tribute: from a power with under `weaker` of your fleet strength: `share` of their treasury (at least `min`). They
 *     pay or refuse; either way they resent it (`regard`), and they can't be asked again for `every` turns.
 *   denounce: tell a third power what a rival is: the third power's regard for the rival falls `them`; the rival's for
 *     you falls `target`; the third power likes you `ally` more if it already disliked the rival. Every `every` turns.
 *   joinWar: ask a power at peace with your enemy to declare war on it: yes at `regard` or better, or for `cost` credits
 *     (less the better they like you) when they're at least neutral.
 */
export const INFLUENCE = { gift: { perRegard: 8, window: 20, fade: 120 }, amends: { perPoint: 5, perTurn: 0.05, back: 0.75 },
  tribute: { weaker: 0.6, share: 0.15, min: 20, regard: -12, every: 15 }, denounce: { them: -8, target: -12, ally: 3, every: 10 },
  joinWar: { regard: 15, cost: 150 },
  // The computer players: one move of influence every `every` turns at most, each people with its own leanings.
  ai: { every: 12, leanings: {
    concord: { gift: 1.2, amends: 1.2, denounce: 0.8, tribute: 0.4, joinWar: 1 },
    tessan: { gift: 1.6, amends: 1.3, denounce: 1, tribute: 0.6, joinWar: 1.2 },
    kel: { gift: 0.7, amends: 0.8, denounce: 0.8, tribute: 1.3, joinWar: 1 },
    hegemony: { gift: 0.3, amends: 0.4, denounce: 1.2, tribute: 1.6, joinWar: 1.1 },
    vael: { gift: 0.9, amends: 0.9, denounce: 1, tribute: 0.9, joinWar: 0.9 },
    mirrun: { gift: 1.4, amends: 1.3, denounce: 0.9, tribute: 0.4, joinWar: 0.9 },
    ylith: { gift: 1.0, amends: 0.9, denounce: 1.1, tribute: 0.8, joinWar: 1.0 },
    zhaq: { gift: 0.8, amends: 0.8, denounce: 1.3, tribute: 0.6, joinWar: 1.3 } } } };
/**
 * Traders: a convoy leaves a colony with an Exchange every `every` turns or so for another colony with an Exchange
 * within `range` hexes whose owner isn't at war with the sender (perPower convoys on the lanes per living power at most),
 * and pays both ends base + perHex × distance when it arrives. Raiders within `hunt` hexes go after convoys with no
 * warships beside them, and plunder one that ends its turn within `reach` hexes of them. A convoy reaching one of your
 * worlds sometimes offers a deal (`offer` chance).
 */
export const TRADERS = { every: 15, range: 10, maxPerExchange: 1, perPower: 2, base: 4, perHex: 1, hunt: 4, reach: 1, offer: 0.35, color: "#e6a8d7", name: "The Free Traders" };
/** Raiders who lose ships at a world stay away from it this many turns. */
export const RAID_AVOID = 15;
/**
 * The Wardens (crisis.js). The Signs: from `signsLead` turns before they wake, a dormant Watcher appears by a rift every
 * `watcherEvery` turns, up to watchers[size]. Awake: the Heart sends waves; a burned world becomes a Node, and each
 * Node sends hunters every `nodeEvery` turns. The Heart wakes with wakeNodes[size] Nodes of its own around it, and can't
 * be harmed while one within `shieldRange` stands. Nodes and the Heart can only be worn down: a battle takes at most
 * wear[type] of their full hull. Waves go for a power building the Corridor Engine (`engineHunt` of them) before anyone else.
 * Breaking the Heart silences the waves, but while a Node stands, a new
 * Heart grows at one after `regrow` turns, `regrowGain` times stronger. It's over only when the Heart and every Node
 * are gone.
 */
export const CRISIS = { earliest: 105, spread: 16, warning: 6, waveEvery: 6, heartHeal: 2, studied: 8, color: "#e8e4d0",
  signsLead: 35, watcherEvery: 6, watchers: { small: 2, medium: 3, large: 4, vast: 5 }, nodeEvery: 8, regrow: 30, regrowGain: 1.25,
  wakeNodes: { small: 2, medium: 3, large: 4, vast: 5 }, engineHunt: 0.5, perStrength: 300, maxStrength: 40,
  wear: { node: 0.25, heart: 0.2 }, shieldRange: 6, maxNodes: { small: 5, medium: 8, large: 10, vast: 12 }, huntersPerStrength: 10,
  bounty: { watcher: 40, node: 80, probe: 30 },
  // Probes (the Signs): one out of the rifts every `every` turns (at most `max` out), each scanning up to `visits` worlds
  // for `stay` turns, then home. Each that gets home makes the Wardens wake `intel` stronger (up to `intelMax`), and its
  // scanned worlds are the waves' first targets. `study`: research a scan gives a power that chose to learn from them.
  probes: { every: 5, max: 3, stay: 1, visits: 2, intel: 0.04, intelMax: 0.24, study: 40, contactLead: 18, jam: 60, jamDelay: 6 },
  // A coalition against the Wardens (a power calls it on a Node or the Heart): powers that like the caller at least
  // `free` come for nothing; those at `paid` or better for `price` credits (plus `perM` for each point of Warden
  // strength). Each member sends its strongest war fleets, up to `share` of its warships, and holds them on the target
  // for `turns` turns or until it falls. One call every `every` turns. Fighting together: `regard` each way.
  coalition: { free: 10, paid: -10, price: 60, perM: 5, share: 0.6, turns: 20, every: 10, regard: 6 } };
/**
 * The Corridor Engine in an open game: not a victory but the galaxy's great prize. Only one can stand. Its holder's
 * fleets travel corridors for nothing and can jump through the gate from the Engine world to any of its worlds (every
 * gateEvery turns); every colony of the holder earns tradePerColony credits; holding it scores scorePerTurn a turn; the
 * other powers' regard for the holder falls by `grudge` every grudgeEvery turns. While enemy warships hold its orbit, it
 * gives nothing. Capture the world and it's yours; a barrage destroys it, and the race to build it starts again.
 */
export const ENGINE = { gateEvery: 5, tradePerColony: 2, scorePerTurn: 2, grudgeEvery: 5, grudge: -3 };
/**
 * Relics of the old empires: one of each, hidden in ruins and anomalies (a few out in the Outer Reach, which only the
 * Star Chart opens). The first fleet to end its turn at a relic's site recovers it, and it goes to its finder's capital.
 * A relic belongs to the world that holds it: take the world and you take the relic; burn the world and the relic lies
 * in its ruins for anyone to find. `use` relics are used from the Empire tab; the rest work by being held. Each held
 * relic is worth RELIC_SCORE.
 */
export const RELICS = {
  chart: { name: "The Founders' Star Chart", use: "once", text: "Use it once: the galaxy grows. Four rings of uncharted space open beyond the rim (the Outer Reach), with new systems, ruins, anomalies and more relics, and you see the new region first." },
  shard: { name: "The Gate Shard", use: "every", every: 15, text: "Every 15 turns: open a new corridor from a world of yours to any system you've explored within 8 hexes." },
  keel: { name: "The Living Keel", text: "Your ships repair a point of hull every turn, anywhere." },
  oracle: { name: "The Oracle Lens", text: "Every system in the galaxy is charted for you, and your ships see 2 hexes farther." },
  key: { name: "The Warden Key", text: "Warden machines fight your ships and worlds at −2 skill." },
  forge: { name: "The Forge of Ages", text: "+50% industry at the world that holds it, and +10% on all your worlds." },
  archive: { name: "The Last Archive", text: "+20% science on every world." },
  crown: { name: "The Crown of the First Empire", text: "+20% credits on every world, and every power thinks a little better of you each turn." },
  anchor: { name: "The Fold Anchor", text: "+1 speed for all your ships." },
  aegis: { name: "The Aegis Lattice", text: "The world that holds it gets orbital guns with 6 more hull (guns even without a battery), and all your worlds' guns fire at +1 skill." },
  seeds: { name: "The Seed Vault", text: "+2 population room on every world of yours." },
};
export const RELIC_SCORE = 10;
/** The Outer Reach (the Star Chart): how many rings it adds, and how often its systems have ruins and anomalies. */
/**
 * New sectors: the map keeps growing in a long game. From turn `first`, and every `every` turns after in an open game,
 * `rings` rings of new space open beyond the rim (none within `endGap` turns of a standard game's last turn). Every
 * power hears `warn` turns ahead what kind of sector is coming. Each kind comes once (at most `max`); the pirate and
 * creature kinds only when the game has them. Off at the new-game form with "New sectors: off".
 *   density: systems, against the rest of the map; exotics, ruins, anomalies: the chance of each on a new system;
 *   rich: the yields to pick from; habitable: more good worlds; nebula: how much more nebula; corridors: false for none
 *   inside (one link to the old network); havens: pirate havens; husks: Warden husks, by map size.
 * A sealed sector can't be entered at all until a power researches Rift drives (its own ships only) or someone builds a
 * Rift beacon on a world near it (`beacon`: credits and exotics), which opens it for everyone with a corridor in.
 */
/**
 * Corridor collapses: rare, and they hurt. From turn `first`, every `every` turns or so (a range), a corridor fails:
 * one of the few that matter most (the longest detour without it, between settled worlds). Every power hears `warn`
 * turns ahead. Never one a system can't do without (each end keeps another corridor, and the network stays in one
 * piece). A new route takes a scout resting `surveyTurns` turns within `surveyRange` hexes of either end; it charts a
 * corridor from that end to a system within `linkRange` (the one nearest the other end), and its power gets `research`.
 */
export const COLLAPSE = { first: 70, every: [60, 90], warn: 5, surveyRange: 2, surveyTurns: 3, linkRange: 6, research: 60 };
export const SECTORS = { beacon: { credits: 200, exotics: 10, range: 3 }, first: 110, every: 80, warn: 10, rings: 3, max: 4, endGap: 40,
  kinds: {
    corsair: { name: "the Corsair Reach", wilds: true, density: 1, exotics: 0.45, ruins: 0.15, anomalies: 0.15, havens: 2,
      text: "Pirate strongholds hold this sector, and its worlds are rich in exotics. Settle it with warships close." },
    graveyard: { name: "the Warden Graveyard", wilds: true, sealed: true, density: 0.9, exotics: 0.3, ruins: 0.6, anomalies: 0.4, husks: { small: 2, medium: 3, large: 4, vast: 5 },
      text: "The wreck-field of an older war: ruins everywhere, guarded by Warden husks that still fire. Their wrecks pay in research." },
    frontier: { name: "the Golden Frontier", density: 1.3, exotics: 0.2, ruins: 0.15, anomalies: 0.2, rich: [1, 1.4, 1.4], habitable: true,
      text: "Rich, open, good worlds and nothing guarding them. Whoever settles it first grows fastest, so expect a race and a war." },
    deadzone: { name: "the Dead Zone", sealed: true, density: 0.6, exotics: 0.85, ruins: 0.3, anomalies: 0.3, nebula: 3, corridors: false,
      text: "No corridors, thick nebula, few worlds, and almost every one of them full of exotics. Bring fuel tankers." },
  } };
export const REACH = { rings: 4, ruins: 0.25, anomalies: 0.25, exotics: 0.3, reserved: 4 };
/**
 * Computer players: what each difficulty preset switches on, and how strong they are (fleet size and readiness for war).
 * The new-game form starts from a preset and lets each option be changed (then it's "Custom"). Fixed for the game.
 */
export const AI_OPTIONS = {
  stations: { name: "Build deep-space stations", text: "They put stations in open space on the approaches toward a rival: longer reach, more sight, pickets with guns." },
  fortify: { name: "Fortify frontier outposts", text: "At war, they buy guns for outposts near the enemy." },
  coalitions: { name: "Form coalitions against the Engine holder", text: "In an open game, they band together against whoever holds the Corridor Engine." },
  raidDepots: { name: "Raid your fuel depots", text: "At war, their fleets loot unguarded fuel depots." },
  payPirates: { name: "Pay pirates instead of fighting", text: "When they're rich, they pay ransom and tribute (off: they always fight)." },
  influence: { name: "Use influence", text: "They send gifts to powers they fear, make amends, denounce the leader, and pay friends to join their wars, with each other and with you." },
  tribute: { name: "Demand tribute from you", text: "A power whose fleet is far stronger than yours may demand credits, and resent a refusal." },
};
export const AI_PRESETS = {
  easy: { strength: 0.7, stations: false, fortify: false, coalitions: true, raidDepots: false, payPirates: true, influence: true, tribute: false },
  normal: { strength: 1, stations: false, fortify: true, coalitions: true, raidDepots: true, payPirates: true, influence: true, tribute: true },
  hard: { strength: 1.35, stations: true, fortify: true, coalitions: true, raidDepots: true, payPirates: false, influence: true, tribute: true },
};
/**
 * The early game: before turn `until`, a computer power at war with no one keeps a defensive fleet (`perColony` fleet
 * strength for each of its worlds, at least `floor`) and puts the rest into its worlds, instead of matching the
 * strongest power it has met. Over the `ramp` turns before `until` it eases into the usual arms race. At war, or
 * after, it arms as usual. Difficulty's strength still scales it. Nor do they start wars of their own before
 * `warFrom` (by strength: gentle Easy, standard Normal, fierce Hard), or start building the Corridor Engine before
 * `engineFrom`: the stronger economies a calm early game gives them shouldn't end the game sooner. Real provocation
 * overrides the early-war turn: regard at `provoked` or worse, or a grave offence (a remembered act of `graveOffence`
 * or worse, such as breaking an alliance) within the last `graveTurns` turns.
 */
export const AI_CALM = { until: 75, ramp: 20, perColony: 2, floor: 4, warFrom: { gentle: 60, standard: 50, fierce: 35 }, engineFrom: { gentle: 120, standard: 100, fierce: 80 },
  provoked: -40, graveOffence: -30, graveTurns: 20 };
/** Deep-space stations for computer players: at most one per `perColonies` colonies, and `max` in all. */
export const AI_STATIONS = { perColonies: 4, max: 4 };
export const RULES = { maxTurns: 200, growthPerTurn: 0.12, rushRate: 2, troopDefensePerPop: 0.5, engineTurnsHeld: 0 };

/**
 * Rivals' personalities: who speaks for each people, what they care about, and how they say it. `weights` lean their
 * choice of message (demand, warn, alliance, joint war, gift); `voice` is each kind of message in their words, with
 * {you} (your people), {them} (a third power), {world}, {n} and {admiral} filled in.
 */
export const PERSONALITIES = {
  concord: { title: "Idealists", leader: "First Speaker Amara Voss", text: "They prize treaties and keep their word; they don't forgive a broken one.",
    weights: { demand: 0.3, warn: 0.8, alliance: 1.4, joint: 0.8, gift: 1.2 },
    voice: {
      hello: "First Speaker Amara Voss, for the Concord. We came out here to build, not to burn. If {you} want the same, you'll find no better neighbours.",
      demand: "The Concord's frontier worlds are struggling, and {you} are rich. A contribution of {n} credits would be remembered. So would a refusal.",
      warn: "Your warships are holding station off {world}. Our people are frightened. Please move them, and we'll say no more about it.",
      alliance: "We've watched {you} long enough to trust you. Stand with the Concord: an attack on one of us is an attack on both.",
      joint: "{them} have shown what they are. We're at war with them. Join us, and we'll end it sooner.",
      gift: "Our research council sends you its findings, freely. Knowledge should travel.",
      war: "You've left us no choice. The Concord is at war with {you}. {admiral} has our fleet.",
    } },
  tessan: { title: "Merchant princes", leader: "Dynast Oruvel Tess", text: "Everything has a price with them, and they remember every debt, both ways.",
    weights: { demand: 1.4, warn: 0.7, alliance: 0.8, joint: 0.6, gift: 1.4 },
    voice: {
      hello: "Dynast Oruvel Tess greets {you}. The Dynasties trade with anyone who pays on time. Shall we find out which kind you are?",
      demand: "Our ledgers show {you} owe the Dynasties for the corridors you use. {n} credits settles the account. Unsettled accounts are... collected.",
      warn: "Your fleet near {world} is frightening our insurers, and frightened insurers raise prices. Move it.",
      alliance: "Our partnership has been profitable. Let's make it formal: the Dynasties will stand behind {you}, and you behind us.",
      joint: "{them} have been very bad for business. The Dynasties are at war with them. Join us, and we'll split what's left.",
      gift: "A gift from the Dynast's own treasury, for good customers. Spend it well.",
      war: "The Dynasties have closed your account. We're at war with {you}. {admiral} will collect.",
    } },
  kel: { title: "The patient hive", leader: "the Speaker-Mind of Kel'vaar", text: "Slow to anger and slower to forget. They hate anyone who settles near the hives.",
    weights: { demand: 0.6, warn: 1.6, alliance: 0.9, joint: 0.7, gift: 0.9 },
    voice: {
      hello: "The Speaker-Mind of Kel'vaar speaks for ten billion. We have noted {you}. We will go on noting you.",
      demand: "The hives are growing. They need what {you} have. {n} credits. The hives do not ask twice.",
      warn: "Your ships are near {world}. The hives feel them. Take them away.",
      alliance: "The hives have decided {you} are not prey. Stand with us. The hives protect what is theirs.",
      joint: "{them} have harmed the hives. The hives will end them. You may help.",
      gift: "The hives have more than they need of this. Take it.",
      war: "The hives have decided. We are at war with {you}. {admiral} leads the swarm.",
    } },
  hegemony: { title: "Proud legions", leader: "Warlord Ozhan Dresh", text: "They respect strength and despise weakness. Refuse them and be ready to back it up.",
    weights: { demand: 1.8, warn: 1.2, alliance: 0.7, joint: 1.5, gift: 0.4 },
    voice: {
      hello: "I am Warlord Ozhan Dresh of the Hegemony. Once, all of this was ours. Remember that when you speak to us.",
      demand: "The Hegemony requires tribute: {n} credits, as the old empires paid it. Pay, and keep your worlds.",
      warn: "Your warships are off {world}. If they're still there tomorrow, I'll take it as a challenge.",
      alliance: "You've fought well. The legions honour that. Stand with the Hegemony and no one will dare touch you.",
      joint: "We march on {them}. Join the legions, and share the spoils.",
      gift: "Spoils of the last campaign. The Warlord shares with those who've earned it.",
      war: "Your weakness offends the legions. The Hegemony is at war with {you}. {admiral} leads the attack.",
    } },
  vael: { title: "The wanderers", leader: "Shipmother Ilae", text: "Curious and proud of their freedom; they hate being fenced in, and love a fellow traveller.",
    weights: { demand: 0.5, warn: 1.0, alliance: 1.1, joint: 0.9, gift: 1.3 },
    voice: {
      hello: "Shipmother Ilae of the Long Flotilla. We've drifted a long way to meet {you}. Let's see if it was worth it.",
      demand: "The Flotilla needs hull-feed for the young ships, and {you} have plenty. {n} credits, and we'll drift on.",
      warn: "Your guns are pointed at {world}, our resting place. Point them somewhere else.",
      alliance: "The Flotilla has sailed beside {you} long enough. Sail with us, and we'll guard each other's wakes.",
      joint: "{them} have hunted the Flotilla's young. We hunt them now. Hunt with us.",
      gift: "The Flotilla found this in the dark between stars. We think you'll know what to do with it.",
      war: "The Flotilla turns against {you}. We are at war. {admiral} leads the hunt.",
    } },
  mirrun: { title: "The deliberators", leader: "Tidecaller Veshu", text: "Witty, patient and hard to rush; they defend ocean worlds fiercely and despise strip-miners.",
    weights: { demand: 0.4, warn: 1.1, alliance: 1.2, joint: 0.7, gift: 1.4 },
    voice: {
      hello: "Tidecaller Veshu, for the Commonwealth. We felt your ships in the fold before we saw them. You hum a little off-key, {you}, but we can work with that.",
      demand: "The Commonwealth's reef-cities need rebuilding, and {you} have done well lately. {n} credits would buy a great deal of goodwill. And a great deal of patience.",
      warn: "Your warships off {world} are making the whole sea nervous. We'd take it kindly if you moved them before we stop being kind.",
      alliance: "We've talked it over for a long time, which is how we do things. The Commonwealth would like to stand with {you}.",
      joint: "{them} have been poisoning seas that aren't theirs. The Commonwealth is at war with them. Swim with us.",
      gift: "Our resonance labs found something you'll like. Consider it a joke between friends: the punchline is free research.",
      war: "We deliberated. We decided. The Commonwealth is at war with {you}. {admiral} speaks for us now.",
    } },
  ylith: { title: "The high watchers", leader: "Windmarshal Kirrae", text: "Proud, far-seeing and restless; they love open space and hate being boxed in.",
    weights: { demand: 0.6, warn: 1.4, alliance: 1.0, joint: 0.9, gift: 1.0 },
    voice: {
      hello: "Windmarshal Kirrae of the Aeries. We saw {you} coming from a long way off. We see most things from a long way off.",
      demand: "The Aeries charted half the corridors you fly. {n} credits seems a small fee for the view.",
      warn: "We can see your fleet near {world} very clearly. Everyone in the Aeries can. Move it.",
      alliance: "From up here, {you} look like the kind of power worth flying beside. Join the Aeries' wing.",
      joint: "{them} have crowded our skies. The Aeries are at war with them. Fly with us.",
      gift: "Star charts from our navigators, the best there are. Don't get lost.",
      war: "The Aeries take to the wind against {you}. We are at war. {admiral} leads the flight.",
    } },
  zhaq: { title: "The defiant", leader: "First Citizen Thrix-Ammol", text: "Free, stubborn and suspicious of empires; they never forgive anyone who tries to rule them.",
    weights: { demand: 0.5, warn: 1.3, alliance: 1.1, joint: 1.2, gift: 0.9 },
    voice: {
      hello: "First Citizen Thrix-Ammol, of the Free Republics. We slept six hundred years and woke up free. We intend to stay that way. What do {you} intend?",
      demand: "The Republics defend a long border, and {you} sit safely behind it. {n} credits toward its upkeep would be fair.",
      warn: "Three eyes are watching your fleet at {world}, and all of them are unhappy. Take it home.",
      alliance: "{you} haven't tried to rule us. That's rare. The Republics would stand with you.",
      joint: "{them} think they can make us bow. The Republics are at war with them. Join us, and they'll learn otherwise.",
      gift: "From the Republics' archives: what we learned while the galaxy forgot us.",
      war: "Never again. The Free Republics are at war with {you}. {admiral} commands.",
    } },
};

/** Admirals: named commanders who learn from every battle they win, and can be lost. */
export const ADMIRAL_RANKS = ["Commodore", "Rear Admiral", "Vice Admiral", "Fleet Admiral"];
/** Wins after which an admiral gains a trait (and a rank). */
export const ADMIRAL_STEPS = [2, 4, 7];
export const ADMIRAL_TRAITS = {
  gunnery: { name: "Gunnery master", text: "+1 to the fleet's rolls." },
  steady: { name: "Steady", text: "−1 to enemy rolls against the fleet." },
  swift: { name: "Swift", text: "The fleet moves 1 hex farther." },
  quartermaster: { name: "Quartermaster", text: "The fleet never wears down out of supply." },
  shipwright: { name: "Shipwright", text: "The fleet mends a hull point a turn, anywhere." },
  hunter: { name: "Warden hunter", text: "+2 to the fleet's rolls against the Wardens." },
};
export const ADMIRAL_NAMES = {
  concord: { first: ["Mara", "Idris", "Leni", "Tomas", "Ayo", "Sun-hee", "Rafael", "Ingrid", "Kofi", "Priya", "Eamon", "Yusuf"], last: ["Okafor", "Lindqvist", "Ruiz", "Tanaka", "Haddad", "Mbeki", "Novak", "Castell", "Asante", "Reyes", "Moreau", "Iqbal"] },
  tessan: { first: ["Oru", "Tesmé", "Valan", "Isk", "Merrah", "Sollo", "Dace", "Prenna"], last: ["of House Tess", "of House Varr", "of House Quill", "of House Ossan", "of House Merrow", "of House Dahl"] },
  kel: { first: ["Brood-Marshal", "Swarm-Leader", "Hive-Warden", "Brood-Mother"], last: ["Vekk'a", "Th'rii", "Ossk", "Kaa'vel", "Zhirr", "Ul'tek", "Mmor", "Ix'ka"] },
  hegemony: { first: ["Ozhan", "Drezh", "Vorak", "Ishka", "Tal", "Kurro", "Zhenna", "Ruvek"], last: ["Dresh", "Ozhvar", "Kael", "Morrud", "Vash", "Torr", "Ixhal", "Brannoc"] },
  vael: { first: ["Ilae", "Senn", "Oruë", "Tavi", "Wren", "Lio", "Maë", "Fael"], last: ["of the Long Wake", "Drift-born", "of the Seventh Hull", "Star-sung", "of the Quiet Reach", "Tide-runner"] },
  mirrun: { first: ["Veshu", "Olla", "Pim", "Sarrow", "Tull", "Mee", "Quoll", "Nai"], last: ["of the Deep Reef", "Tidewise", "of the Trench", "Brightgill", "of the Long Current", "Saltsong"] },
  ylith: { first: ["Kirrae", "Shree", "Talon", "Vyx", "Aeri", "Sko", "Liri", "Hesk"], last: ["of the High Aerie", "Farsight", "of the Updraft", "Stormwing", "of the Ninth Spire", "Skycut"] },
  zhaq: { first: ["Thrix", "Ammol", "Kesh", "Vura", "Tolq", "Zhenn", "Irra", "Qaz"], last: ["of the Long Sleep", "Thrice-sworn", "of Free Zhaqar", "Unbowed", "of the Waking", "Ironstride"] },
};
