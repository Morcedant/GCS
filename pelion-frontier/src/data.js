// The numbers: the crew (from the Players' Guide's ready-made crew), the ships (from its ship registry and the GM's
// Guide's enemy ships), what the Pelion can do at a system, the mission tables (the GM's Guide's mission seeds),
// refits and library records.

export const TOUR = 50;                      // turns in the tour; a turn is a week
export const STARDATE0 = 5212.4;             // campaign year 2268

/** The six ready-made crew. Skills are the targets from their sheets. */
export const CREW = [
  { id: "shvari", name: "Thelan sh'Vari", short: "sh'Vari", rank: "Lt. Commander", post: "First officer", species: "Andorian",
    skills: { Leadership: 16, Diplomacy: 14, Helm: 13, Phasers: 13, Navigation: 11, Psychology: 11, Sensors: 11, Communications: 11 },
    adv: "Crisis Leader", advText: "+2 to Leadership and Helm in ship combat.", advWhen: (ctx) => ctx.combat && ["Leadership", "Helm"].includes(ctx.skill) },
  { id: "sevek", name: "Sevek", short: "Sevek", rank: "Lieutenant", post: "Science officer", species: "Vulcan",
    skills: { "Physical Sciences": 16, Sensors: 14, Computers: 14, "Life Sciences": 14, Navigation: 14, Engineering: 14, Electronics: 14, Psychology: 14 },
    adv: "Eidetic Recall", advText: "+2 when investigating an anomaly or ruins.", advWhen: (ctx) => ctx.action === "investigate" },
  { id: "vessik", name: "Dr. Vessik", short: "Vessik", rank: "Lt. Commander", post: "Chief medical officer", species: "Denobulan",
    skills: { Medicine: 16, "Life Sciences": 14, Psychology: 14, Sensors: 14, Computers: 14, Electronics: 14, Survival: 14, Communications: 14, Diplomacy: 13, Leadership: 13 },
    adv: "Denobulan Pharmacopoeia", advText: "+2 to Medicine.", advWhen: (ctx) => ctx.skill === "Medicine" },
  { id: "grath", name: "Grath", short: "Grath", rank: "Lieutenant", post: "Chief engineer", species: "Tellarite",
    skills: { Engineering: 16, Electronics: 14, Computers: 14, "Physical Sciences": 14, Sensors: 14, Communications: 14, Survival: 14, Helm: 11 },
    adv: "Improvisational Engineer", advText: "+2 to Engineering for repairs.", advWhen: (ctx) => ctx.skill === "Engineering" && (ctx.action === "repair" || ctx.combat) },
  { id: "reyes", name: "Marisol Reyes", short: "Reyes", rank: "Lieutenant (j.g.)", post: "Security chief", species: "Human",
    skills: { Phasers: 16, "Unarmed Combat": 14, Stealth: 14, Helm: 14, Athletics: 13, Survival: 11, Sensors: 11, Medicine: 11, Leadership: 11, Communications: 11 },
    adv: "Careful Marksman", advText: "+2 to Phasers on an away team (stun).", advWhen: (ctx) => ctx.skill === "Phasers" && !ctx.combat },
  { id: "rrinn", name: "Rrinn", short: "Rrinn", rank: "Yeoman 2nd Class", post: "Captain's yeoman", species: "Caitian",
    skills: { Computers: 18, Communications: 14, Psychology: 14, Sensors: 14, Electronics: 14, Stealth: 13, Diplomacy: 12 },
    adv: "Keen Hearing", advText: "+2 when listening: hailing, and sweeps for cloaked ships and raiders.", advWhen: (ctx) => ctx.action === "sweep" || (ctx.skill === "Communications" && ctx.listen) },
];
/** You, the captain. */
export const CAPTAIN = { id: "captain", short: "Captain", skills: { Leadership: 14, Psychology: 13, Diplomacy: 13, Will: 12 } };

// Ships. Systems take 3 boxes each: 1 Damaged (−2), 2 Crippled (−4), 3 Offline.
export const PELION = { name: "USS Pelion", reg: "NCC-1750", cls: "Heavy Cruiser", shields: 5, hull: 5, power: 5, maneuver: 3, sensors: 3, phaser: 2, torps: 40, torpBonus: 1, speed: 3 };
export const SUPPORT = {
  escort: { name: "Escort", cls: "Escort", cost: 30, shields: 2, hull: 3, maneuver: 5, helm: 12, gunner: 12, phaser: 1, speed: 3, blurb: "Guards a world: fights raiders that come to it, and joins the Pelion's battles." },
  science: { name: "Science vessel", cls: "Science vessel", cost: 25, shields: 2, hull: 3, maneuver: 5, helm: 11, gunner: 10, phaser: 1, speed: 3, skill: 12, blurb: "Surveys and investigates on its own (skill 12, sensors +2)." },
};
export const SUPPORT_NAMES = ["USS Kestrel", "USS Calder", "USS Ishikawa", "USS Tamsin", "USS Meridian Rose", "USS Okonkwo", "USS Halvard", "USS Sabre"];
export const ENEMIES = {
  kbc: { name: "Klingon battle cruiser", power: "klingon", shields: 5, hull: 5, maneuver: 3, helm: 12, gunner: 12, dmg: 2, torp: true, will: 12, cloak: true, relentless: true, speed: 3 },
  kbop: { name: "Klingon bird-of-prey", power: "klingon", shields: 2, hull: 3, maneuver: 5, helm: 13, gunner: 12, dmg: 1, will: 11, cloak: true, ambush: true, speed: 3 },
  rbop: { name: "Romulan bird-of-prey", power: "romulan", shields: 3, hull: 3, maneuver: 5, helm: 11, gunner: 12, dmg: 2, plasma: true, will: 13, cloak: true, ambush: true, speed: 3 },
  orion: { name: "Orion raider", power: "orion", shields: 2, hull: 3, maneuver: 6, helm: 13, gunner: 11, dmg: 1, will: 10, fast: true, speed: 4 },
  orionBase: { name: "Orion pirate base", power: "orion", shields: 4, hull: 4, maneuver: 0, helm: 0, gunner: 11, dmg: 2, will: 11, base: true, speed: 0 },
};
export const POWERS = {
  federation: { name: "Federation", color: "#6fb4ff" },
  klingon: { name: "Klingon Empire", color: "#e0564a" },
  romulan: { name: "Romulan Star Empire", color: "#59c48a" },
  orion: { name: "Orion Syndicate", color: "#e6a640" },
  independent: { name: "Independent", color: "#c9c3e8" },
};

/** What a system can be. `known`: on Starfleet's charts from the start. */
export const KINDS = {
  starbase: { name: "Starbase", known: true, color: "#9fd0ff" },
  colony: { name: "Federation colony", known: true, color: "#6fb4ff" },
  independent: { name: "Independent world", known: true, color: "#c9c3e8" },
  klingon: { name: "Klingon outpost", known: true, color: "#e0564a" },
  prewarp: { name: "Pre-warp world", color: "#9ad48a" },
  anomaly: { name: "Anomaly", color: "#d9a8ff" },
  ruins: { name: "Ancient ruins", color: "#ffd36b" },
  empty: { name: "Uncharted system", color: "#8e9ab4" },
  orionBase: { name: "Uncharted system", color: "#8e9ab4" },  // looks empty until a sweep finds the base
};

/** Things the Pelion (or a science vessel) can do at a system, one a turn. Each is a roll: 3d6 at or under the skill. */
export const ACTIONS = {
  survey: { name: "Survey the system", skills: ["Sensors", "Physical Sciences", "Navigation"], blurb: "Chart it: what's there, and science for the refits." },
  investigate: { name: "Investigate", skills: ["Physical Sciences", "Sensors", "Computers", "Life Sciences"], blurb: "Fill the discovery clock to earn a library record." },
  envoy: { name: "Diplomatic mission", skills: ["Diplomacy", "Psychology", "Communications"], blurb: "Bring the world closer to the Federation: +1 accord, +2 on success by 5." },
  observe: { name: "Observe from orbit", skills: ["Sensors", "Life Sciences", "Psychology", "Stealth"], blurb: "Study them unseen. Fail by 3 or more and they see you: the Prime Directive, and Starfleet Command, take note." },
  aid: { name: "Relief and repairs", skills: ["Engineering", "Medicine", "Leadership"], blurb: "Help a world that's been raided: clear a harm box." },
  repair: { name: "Repairs underway", skills: ["Engineering"], blurb: "Clear a box from the shields or a system (two on success by 5), or patch one hull box." },
  sweep: { name: "Sensor sweep", skills: ["Sensors", "Communications", "Computers"], blurb: "Listen for cloaked ships and raiders within 3: reveals them. Finds a hidden base here." },
  hail: { name: "Hail them", skills: ["Diplomacy", "Communications", "Psychology"], blurb: "Talk a ship into leaving, against its captain's Will. No shots, no incident." },
  mission: { name: "Carry out orders", skills: [], blurb: "Work on the mission here." },
};

// The GM's Guide's mission seeds, turned into orders the game can run. Each `kind` says where it goes and which
// skills work it; `segs` is how many successes it takes.
export const MISSIONS = [
  { roll: 5, text: "Answer a distress call", where: ["colony", "independent", "empty"], skills: ["Engineering", "Medicine", "Helm"], segs: 2 },
  { roll: 6, text: "Survey an uncharted system", where: ["empty", "anomaly", "ruins"], skills: ["Sensors", "Physical Sciences", "Navigation"], segs: 3 },
  { roll: 7, text: "Make first contact", where: ["independent"], skills: ["Diplomacy", "Psychology", "Communications"], segs: 3 },
  { roll: 8, text: "Escort a diplomatic delegation", where: ["independent"], skills: ["Diplomacy", "Leadership", "Helm"], segs: 2 },
  { roll: 9, text: "Find a missing ship or outpost", where: ["empty", "anomaly"], skills: ["Sensors", "Navigation", "Computers"], segs: 3 },
  { roll: 10, text: "Deliver urgent medical supplies", where: ["colony", "independent"], skills: ["Medicine", "Life Sciences", "Helm"], segs: 2 },
  { roll: 11, text: "Evacuate a colony", where: ["colony"], skills: ["Leadership", "Engineering", "Helm"], segs: 3 },
  { roll: 12, text: "Patrol the Neutral Zone border", where: ["border"], skills: ["Sensors", "Communications", "Navigation"], segs: 2 },
  { roll: 13, text: "Recover a lost probe or artifact", where: ["anomaly", "ruins", "empty"], skills: ["Sensors", "Engineering", "Computers"], segs: 3 },
  { roll: 14, text: "Mediate a dispute between two worlds", where: ["independent"], skills: ["Diplomacy", "Psychology", "Leadership"], segs: 3 },
  { roll: 15, text: "Test experimental technology", where: ["empty", "anomaly"], skills: ["Engineering", "Physical Sciences", "Computers"], segs: 3 },
  { roll: 4, text: "Ferry a delegation to a world that left the Federation", where: ["independent"], skills: ["Diplomacy", "Psychology", "Communications"], segs: 3 },
  { roll: 16, text: "Shore leave that goes wrong", where: ["colony", "starbase"], skills: ["Leadership", "Medicine", "Psychology"], segs: 2 },
  { roll: 17, text: "Carry a message across the Neutral Zone", where: ["border"], skills: ["Communications", "Helm", "Diplomacy"], segs: 2 },
];
export const STRANGE = ["The crew's past selves", "A dead star that sings", "A subspace anomaly that distorts time", "A non-corporeal life form",
  "An ancient machine that still works", "Duplicates of the crew", "A signal repeating a crew member's name", "A planet-wide illusion",
  "A rift into another universe", "A disease no one recognizes", "A gravity well that traps ships", "A godlike being testing the crew",
  "An alien probe draining power", "Memories that aren't the crew's own", "A crossing into a mirror universe", "A machine that remembers the Pelion"];
export const KEYS = ["A crew member's future self", "A legend thought dead", "An idealistic Federation ambassador", "A Klingon captain with a grudge",
  "A stranded Orion trader", "A brilliant, reckless scientist", "A colony leader hiding a secret", "A former Starfleet officer gone rogue",
  "A local child who has seen too much", "A disapproving Vulcan observer", "An old friend of one of the crew", "A Romulan who wants to defect",
  "A Starfleet admiral with sealed orders", "An android that wants to be free", "A godlike child", "An admiral's spy aboard"];
/** Twists. `fx` is what the game does about it; the rest is for the story. */
export const TWISTS = [
  { text: "Klingons arrive with their own claim", fx: "klingon" },
  { text: "Orion pirates want the same prize", fx: "orion" },
  { text: "A cloaked Romulan ship is watching", fx: "romulan" },
  { text: "The people asking for help are lying", fx: "hard" },
  { text: "The Pelion's systems start failing", fx: "systems" },
  { text: "Contact with Starfleet is cut off", fx: "nocredit" },
  { text: "Orders conflict with doing the right thing", fx: "hard" },
  { text: "The 'threat' is only defending itself", fx: "none" },
  { text: "A respected visitor has a hidden agenda", fx: "none" },
  { text: "A civilian is trapped out of reach", fx: "urgent" },
  { text: "The mission was a test", fx: "none" },
  { text: "A crew member's complication comes into play", fx: "none" },
];

/** Refits: fitted at the starbase, paid for in science. */
export const REFITS = {
  sensors: { name: "Sensor refit", cost: 40, blurb: "Sensors rating 3 → 4: +1 more to Sensors rolls, and you see a hex farther." },
  phasers: { name: "Phaser refit", cost: 50, blurb: "+1 to hit with phasers." },
  shields: { name: "Shield emitters", cost: 50, blurb: "Shields 5 → 6." },
  warp: { name: "Warp nacelle tuning", cost: 60, blurb: "Speed 3 → 4 hexes a turn." },
  power: { name: "Power couplings", cost: 60, blurb: "Power 5 → 6 in battle." },
  sickbay: { name: "Sickbay upgrade", cost: 30, blurb: "Injured crew heal a box every turn." },
};

/** Library records: what investigating the strange earns. `perk` is what it changes. */
export const RECORDS = [
  { id: "eddies", name: "Subspace eddies", text: "Nebulae cost the Pelion 1 move, not 2.", perk: "nebula" },
  { id: "harmonics", name: "Shield harmonics of an ion storm", text: "+1 Shields box in battle.", perk: "shield1" },
  { id: "cloakwake", name: "The wake of a cloaked ship", text: "+2 to sensor sweeps.", perk: "sweep2" },
  { id: "xenoling", name: "A dead language, deciphered", text: "+1 to every diplomatic mission.", perk: "envoy1" },
  { id: "biostasis", name: "Biostasis fields", text: "Injured crew heal a box every turn.", perk: "heal" },
  { id: "graviton", name: "Graviton lensing", text: "+1 to Survey and Investigate.", perk: "science1" },
  { id: "dilithium", name: "Dilithium resonance", text: "+1 Power in battle.", perk: "power1" },
  { id: "warpfield", name: "A folded warp field", text: "+1 move a turn.", perk: "speed1" },
  { id: "caretaker", name: "The caretaker of Corvan II", text: "A machine's account of a vanished civilization: +1 to diplomatic missions.", perk: "envoy1", story: true },
];

/** 3d6 odds: the chance a roll is at or under each total. */
export const ODDS = (() => {
  const n = Array(19).fill(0);
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) n[a + b + c]++;
  const cum = []; let t = 0;
  for (let i = 0; i <= 18; i++) { t += n[i]; cum[i] = t / 216; }
  return cum;
})();
/** Chance to succeed against a target: 3–4 always succeed, 17–18 always fail. */
export const chance = (target) => target >= 16 ? ODDS[16] : target < 4 ? ODDS[4] : ODDS[Math.floor(target)];

export const NAMES = ["Corvan", "Tessaly", "Marrow's Reach", "Hadley", "Ilyra", "Brennus", "Okafor", "Saltire", "Veyl", "Kerrigan", "Drummond",
  "Ashkelon", "Penhallow", "Rigaud", "Thessaly", "Calloway", "Imbrium", "Zan'tor", "Sorrel", "Halcyon", "Quillon", "Vasquez", "Ostrava",
  "Delmar", "Kethis", "Nadir", "Erebus", "Tarsus", "Larkspur", "Yarrow", "Oberth", "Fennimore", "Castellan", "Rho Draconis", "Iota Pavonis",
  "Mendez", "Aldana", "Talgorn", "Brightwater", "Usher"];
