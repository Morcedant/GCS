// The stories behind each kind of order, in the way of The Silence at Corvan II: a briefing, a scene on arrival, a scene
// for each stage of the work, a decision at the end with two ways to go, and what happens if the Pelion is too late.
// {world} is where it happens, {key} the key character, {strange} the strange thing, {captain} you. Each kind of order
// has its own key characters and strange things, chosen to fit its story.
// A choice's `fx` is what it does: commendations, science, supplies, accord (the world's), command (boxes marked),
// tension (with the Klingon Empire), heal (the world's harm).
/**
 * The campaign: Watchers of the Void. Corvan II's caretaker was one of many machines left by a vanished people, the Makers,
 * to watch over younger worlds. Others are hidden all over the sector, and the Orions are digging them up for a Klingon
 * house that wants what they guard. Every order the Pelion carries out turns up a thread; enough threads lead to the
 * Makers' Gate.
 */
export const CAMPAIGN = {
  title: "Watchers of the Void",
  premise: "The caretaker of Corvan II was not alone. A vanished people, the Makers, left machines like it across the Corvan Sector to watch over younger worlds. Two of those sites have already been dug up, and no one who was there is left to say by whom: a Federation survey team of six, gone without a trace, and a mining settlement of forty, its homes standing empty with the meals still on the tables. Starfleet Command is worried for three reasons. Someone is killing, or taking, everyone who sees them. The worlds those machines watched over are now unguarded, and one of them is already in trouble. And a machine that could pull a Heavy Cruiser out of orbit is a weapon in the wrong hands, on a border with the Klingon Empire. Every order Starfleet gives the Pelion this tour comes back to the same questions: who is doing this, and what are they looking for?",
  finaleAt: 6,
  beats: [
    { at: 0, act: "Act I: The Silence", title: "Two sites, and no witnesses", text: "The report from Corvan II reaches Starfleet Command, and Command reads it twice. A machine eleven thousand years old, left by a people who came from the stars, strong enough to drain a Heavy Cruiser in orbit. Starfleet Intelligence searches the sector's records for the same carrier wave and finds it at six more sites.\n\nTwo of them have already been dug up.\n\nAt Hadley's Reach, a Federation survey team of six was cataloguing ruins. Their last report was routine. When the supply ship arrived a week later, the camp was intact, the ruins had been cut open and emptied, and the six were gone: no bodies, no blood, no message, and the camp's logs wiped. At the second site, Thessaly Deep, a mining settlement of forty lived beside the ruins. The relief crew found the homes standing, the lights on, the meals still on the tables, and no one at all. The ruins had been cut open with the same tools.\n\nNo one who saw who did it is left to tell anyone. That's the first thing that worries Starfleet Command. The second is that the machines were guarding something: the world beside Thessaly Deep has had three earthquakes since its caretaker was taken, and it never had any before. The third is the Corvan II report itself. A machine that can pull a starship out of orbit is a weapon, and the Corvan Sector borders the Klingon Empire.\n\nYour orders from here on carry a second purpose. Whatever else you're doing, find out who is digging up the Makers' machines, what they want them for, and stop them before the next site, or the next forty people." },
    { at: 2, act: "Act II: The Diggers", title: "House Kor'vath", text: "The threads come together in the Pelion's briefing room. The Orion diggers aren't working for themselves: their buyer is House Kor'vath, a Klingon house that has been losing ground on the Council and wants something to change that. They're paying in dilithium for every Makers' machine they can get, and they're not keeping them. They're taking them apart." },
    { at: 4, act: "Act III: The Lines", title: "Every relay points one way", text: "Sevek lays the Makers' sites on the sector chart and draws a line from each relay along the direction it transmits. The lines meet at a single point in empty space. The caretakers weren't just watching the younger worlds: they were reporting to something. House Kor'vath has worked it out too, and so, Rrinn suspects, have the Romulans." },
    { at: 6, act: "Act IV: The Gate", title: "The Makers' Gate", text: "The last thread confirms it: at the point where every line meets is the Makers' Gate, the way they left, and the way back. Whoever controls it controls every caretaker in the sector, and every world they watch over. House Kor'vath's ships are already moving. Starfleet's orders are short: get there first." },
  ],
};
export const STORIES = {
  "The Makers' Gate": {
    type: "Campaign",
    keys: ["the Kor'vath commander, Captain Dakhar"], strange: ["the Makers' Gate"],
    why: "Every thread of this tour leads here. If House Kor'vath takes the Gate, it takes every caretaker in the sector with it.",
    thread: "The Watchers of the Void have finished their watch.",
    brief: "At the point where every Makers' relay meets, sensors find a ring of light a kilometre across, turning slowly in empty space: the Makers' Gate. House Kor'vath's battle cruiser is already on its way, under {key}. Get there first, and decide what happens to it.",
    arrive: "The Gate fills the viewer: a ring of light, turning, and through it stars that don't belong to this sky. Every caretaker in the sector is talking to it at once; Rrinn can hear them. On long-range sensors, the Kor'vath cruiser is eleven hours out.",
    steps: [
      ["Understand the Gate", "Sevek and Grath work through the night. The Gate is a door and a voice at once: through it, the Makers could reach every caretaker they left, and every caretaker could call them home."],
      ["Hold off House Kor'vath", "The Kor'vath cruiser arrives with its shields up and its guns hot. {key} wants the Gate, and the Pelion is in the way. Hours of feints and hails later, the cruiser holds position: neither ship can afford to fire first beside the Gate."],
      ["Reach the Makers", "The Gate answers. A voice like the Corvan II caretaker's, older and further away: the Makers are still out there, beyond it, and they want to know whether their watchers' work is done."],
    ],
    choice: { title: "The Gate", text: "The Makers ask the question their caretakers have been asking for eleven thousand years: are the younger worlds ready to look after themselves? Answer yes, and the Gate closes, and every caretaker in the sector goes quiet. Answer no, and the Gate stays open, and the watch goes on, with the Federation standing guard over it instead of House Kor'vath.",
      options: [
        { id: "close", name: "Let the watch end", blurb: "The Gate closes; the caretakers go quiet; no one can ever take them. +6 commendations, +20 science; Klingon tension falls.", how: "The Makers' Gate closed, and the watch ended.", fx: { commendations: 6, science: 20, tension: -2 }, text: "The ring of light narrows to a line, and the line to nothing. Across the sector, the caretakers fall silent one by one, their work done. {key} watches the Gate close from his bridge, salutes, and goes home with nothing. The younger worlds will have to look after themselves now. The Federation will help." },
        { id: "guard", name: "Keep the watch", blurb: "The Gate stays open under Starfleet's guard: +40 science, +3 commendations, a library record; Klingon tension rises.", how: "The Makers' Gate kept open under Starfleet's guard.", fx: { commendations: 3, science: 40, tension: 2 }, record: true, text: "The Gate stays open, and Starfleet raises a station beside it inside a month. The Makers' library opens to the Federation, page by page. House Kor'vath files a claim with the Klingon High Council and starts building ships. The watch goes on." },
      ] },
    fail: "House Kor'vath reached the Gate first. Within a month, the caretakers across the sector have started to go dark, one by one, and no one knows what they're being told to do instead.",
  },
  "Answer a distress call": {
    type: "Rescue",
    reason: "Forty people are dying in the dark, and the Pelion is the nearest ship. That's reason enough.",
    why: "Starfleet Intelligence has tracked the Calloway's Pride for a month: it has been buying salvage from Orion diggers. If it carries what they think it carries, the Makers' machines are being smuggled out of the sector.",
    thread: "The Pride's manifest names its buyer: a Klingon house, Kor'vath, paying in dilithium for anything that hums.",
    keys: ["the freighter's first mate", "a passenger travelling under a false name", "the cargo's anxious owner", "a former Starfleet officer working the freight lanes"],
    strange: ["a crystal that sings when it's cold", "a dormant alien life form", "dilithium of a purity no one mines", "a weapon component from a war a century gone"],
    brief: "A distress call from {world}, cut off mid-word: a freighter, the Calloway's Pride, with forty aboard, adrift and losing life support. The signal repeats every eleven minutes. Something in it doesn't match the freighter's registry.",
    arrive: "The Calloway's Pride hangs dark above {world}, venting atmosphere from a long scar down her flank. Life signs: thirty-one, clustered in the aft cargo hold where the last warm air is. And aboard, {key}, who says they know why the call was cut off.",
    steps: [
      ["Reach the survivors", "The boarding party cuts through to the aft hold. Thirty-one people, frightened and freezing, and a cargo manifest that lists nothing like what's actually in the crates: sealed containers humming with {strange}."],
      ["Stabilize the ship", "Grath's people seal the breach and get the reactor cold. The Pride will hold together long enough to make a choice about her, and about her cargo."],
    ],
    choice: { title: "The cargo", text: "The survivors are safe. The cargo is not what it claims to be, and {key} wants it left aboard, sealed, no questions asked. The freighter's owners will pay well to have it back untouched.",
      options: [
        { id: "inspect", name: "Open the crates", blurb: "Starfleet regulations: find out what was really being carried. +6 science, +1 commendation; the owners won't be pleased.", how: "The survivors rescued; the false cargo opened and logged for Starfleet.", fx: { science: 6, commendations: 1 }, text: "Inside the crates: {strange}, packed in shielding no freighter should carry. The log goes to Starfleet Intelligence, and {key} goes very quiet." },
        { id: "deliver", name: "Tow it home sealed", blurb: "Take the owners' word and their money: +12 supplies.", how: "The survivors rescued; the Pride towed home with her cargo sealed.", fx: { supplies: 12 }, text: "The Pride goes home under tow with her crates unopened, and her owners transfer a generous salvage fee. Whatever was in them is someone else's problem now." },
      ] },
    fail: "By the time anyone reaches the Calloway's Pride, her hold is cold and the signal has stopped. The inquiry asks why the Pelion took so long.",
  },
  "Survey an uncharted system": {
    type: "Exploration",
    reason: "Charting the frontier is what the Pelion is out here for: a system no one has mapped is a hazard to every ship that passes it, and a discovery waiting to be made.",
    why: "The Corvan II caretaker spoke of its makers coming from the stars. Sevek believes a system this impossibly stable is being held together by another of their machines.",
    thread: "The system's heart answers to the same carrier wave as Corvan II's ruins: another of the Makers' machines, still keeping its watch.",
    keys: ["a brilliant, reckless scientist", "a Vulcan astrophysicist observing the survey", "a survey specialist on loan from Memory Alpha", "the young ensign who spotted the readings first"],
    strange: ["a dead star that sings", "a gravity well older than the star", "a subspace anomaly that distorts time", "a machine the size of a moon"],
    brief: "{world} has never been properly charted: long-range scans show a system that shouldn't be stable, and a reading the computers file under {strange}. Chart it, and find out what keeps it together.",
    arrive: "{world} on the main viewer: orbits too tight, a star that flickers on a rhythm, and a sensor echo that answers the Pelion's own pings a half-second late.",
    steps: [
      ["Chart the orbits", "The orbits are impossible and stable anyway: every world sits in a gravitational well deeper than its mass explains. Something is holding them there."],
      ["Find the source", "The source is {strange}, deep in the system's heart, and it reacts to the Pelion's scans the way a sleeper turns away from a light."],
      ["Understand it", "Sevek's model fits at last: the system is held together by it, and has been for a hundred thousand years. Charting it is one thing. Disturbing it is another."],
    ],
    choice: { title: "What to report", text: "The survey is done. {key} wants a probe left in orbit to study the thing up close: the science would be extraordinary, and nobody knows what a probe's presence would do to a system balanced this finely.",
      options: [
        { id: "probe", name: "Leave a probe", blurb: "+12 science; a risk no one can measure yet.", how: "The system charted; a probe left to study its heart.", fx: { science: 12 }, text: "The probe settles into orbit and starts sending back data no one in the Federation has seen before. The system's rhythm stutters once, and steadies." },
        { id: "leave", name: "Chart it and leave it alone", blurb: "+5 science, +1 commendation for caution.", how: "The system charted and left undisturbed.", fx: { science: 5, commendations: 1 }, text: "The Pelion files its charts and leaves {world} as it found it. Starfleet notes the restraint." },
      ] },
    fail: "The survey of {world} never gets done. Another ship will chart it, eventually, and find whatever the Pelion missed.",
  },
  "Make first contact": {
    type: "Diplomatic",
    reason: "A new warp-capable people is the Federation's first chance to be a friend, and the Klingons' first chance to be something else. Starfleet wants the Federation's voice heard first.",
    why: "Their oldest myths speak of travellers who came from the stars and left a guardian behind. Starfleet wants to hear those stories before anyone else does, and to make sure no one else exploits them.",
    thread: "Their myth names the travellers' home: a gate in the sky, three days' light from their sun. It's the first time anyone has heard of the Makers' Gate.",
    keys: ["a Klingon captain with a grudge", "an Orion trader with an offer of his own", "a Tellarite trade consortium's envoy", "a Romulan observer in disguise"],
    strange: ["a myth of travellers from the stars", "a signal they've been receiving for centuries", "an ancient machine that still works", "a star chart carved into their oldest temple"],
    brief: "{world} has warp drive now: a test flight was detected last month. Starfleet wants first contact made before anyone else makes it for them, and before {key} gets there first.",
    arrive: "{world}'s first warp ship is still in orbit, ringed by news drones. Their government hails the Pelion before it hails them: polite, careful, and with a weapons lock that no one mentions.",
    steps: [
      ["Make the first approach", "The first meeting is in a neutral room aboard their station. Their delegates are curious and afraid in equal measure, and very interested in whether the Federation will take what it wants."],
      ["Win their trust", "A setback, then a breakthrough: a shared meal, a story about the first time humans met Vulcans, and {strange} that turns out to be part of their own history too."],
      ["Answer their question", "They ask the question every first contact comes to: what does joining cost, and what happens if they say no?"],
    ],
    choice: { title: "The offer", text: "Their council wants an answer before it votes. Be honest about the Federation's rules and the long road to membership, or promise them the Federation's help now and sort out the details later.",
      options: [
        { id: "honest", name: "The honest answer", blurb: "Slower, but true: +1 accord with {world}, +1 commendation.", how: "First contact made honestly: the long road explained.", fx: { accord: 1, commendations: 1 }, text: "They don't like everything they hear. But they vote to keep talking, and the vote is close to unanimous." },
        { id: "promise", name: "Promise them help", blurb: "+2 accord now; Starfleet Command marks a box for promises it didn't authorize.", how: "First contact made with promises Starfleet hadn't authorized.", fx: { accord: 2, command: 1 }, text: "The promise carries the vote by a landslide. Starfleet Command is less delighted: those weren't the captain's promises to make." },
      ] },
    fail: "Someone else reached {world} first. The Federation will be the second voice they hear, and second voices are easier to ignore.",
  },
  "Escort a diplomatic delegation": {
    type: "Diplomatic",
    reason: "These talks would open trade along the sector's spinward worlds. Someone has threatened the delegation, and Starfleet won't let a threat decide the sector's future.",
    why: "These talks would close a corridor the Orion diggers use to reach Makers' sites. Someone wants the corridor kept open, badly enough to stop the delegation.",
    thread: "The spy's masters pay for Makers' artifacts by the gram. The transmitter's address leads to an Orion broker who sells to Klingons.",
    keys: ["an aide nobody remembers hiring", "a journalist who talked their way aboard", "the ambassador's estranged son", "a translator with very good references"],
    strange: ["a sealed diplomatic pouch", "a gift no one will open", "a treaty draft with a missing page", "an heirloom both sides claim"],
    brief: "Ambassador Teresh and her delegation are bound for talks at {world}, and someone has made it clear they shouldn't arrive. Get them there, alive and on time.",
    arrive: "The delegation boards: eleven diplomats, too much luggage, and {key}: not on the manifest. The ambassador vouches for them. Reyes doesn't.",
    steps: [
      ["Keep them safe en route", "Halfway there, a sensor ghost shadows the Pelion: a ship running dark that won't answer hails. It peels away when the shields go up. Someone was watching."],
      ["Deliver them to the talks", "The delegation arrives, and the talks open. Then Rrinn finds a transmitter in the ambassador's luggage, sending the delegation's position to someone outside the system."],
    ],
    choice: { title: "The transmitter", text: "The transmitter was planted by someone in the delegation. Expose it now and the talks may collapse; keep it quiet and use it to feed false positions to whoever's listening.",
      options: [
        { id: "expose", name: "Expose it", blurb: "The truth, whatever it costs the talks: +1 commendation; −1 accord with {world}.", how: "The delegation delivered; a spy among them exposed.", fx: { commendations: 1, accord: -1 }, text: "The spy is {key}, and the talks stall for a day while everyone accuses everyone. They resume, a little colder." },
        { id: "use", name: "Use it", blurb: "Feed them false positions quietly: +1 accord; +4 science from what Rrinn traces.", how: "The delegation delivered; a spy's transmitter quietly turned.", fx: { accord: 1, science: 4 }, text: "The listeners chase ghosts across half the sector while the talks go well. Rrinn traces the signal to its source and files the address for Starfleet Intelligence." },
      ] },
    fail: "The delegation never reached {world}. The talks were cancelled, and someone, somewhere, got exactly what they wanted.",
  },
  "Find a missing ship or outpost": {
    type: "Rescue",
    reason: "Fourteen people are missing. Starfleet doesn't leave its own behind.",
    why: "The Arkwright was charting Makers' sites for Starfleet when it vanished. What took it may be what Corvan II's caretaker was protecting the Ketari from.",
    thread: "The Arkwright's crew all dreamed the same dream: a ring of light, and a voice counting down. The Makers left more than caretakers.",
    keys: ["the Arkwright's captain's husband", "a freighter pilot who passed them on the way out", "the survey's reckless sponsor", "an old friend of one of the crew"],
    strange: ["a non-corporeal life form", "a nebula that dreams", "a subspace anomaly that distorts time", "a cloud of light that sings"],
    brief: "The survey ship Arkwright stopped reporting near {world} nine days ago: fourteen crew, no distress call, no debris. {key} was the last to speak to them.",
    arrive: "Near {world} the Pelion's sensors find a faint ion trail, nine days cold, leading into a region where {strange} has been reported. The Arkwright's last log entry ends with the word \"beautiful\".",
    steps: [
      ["Pick up the trail", "The ion trail bends, impossibly, as if the Arkwright had been steered by something outside it. Rrinn follows the bends like a hunter following tracks."],
      ["Find the ship", "The Arkwright, intact, every light on, drifting in the heart of {strange}. Life signs: fourteen, all asleep."],
      ["Wake the crew", "Vessik brings the first of them round. They remember nothing after the word \"beautiful\", and they all have the same dream."],
    ],
    choice: { title: "The dream", text: "The Arkwright's crew are safe. Sevek wants to stay and study {strange}: whatever it is, it reached into fourteen minds. Grath wants to be very far away from it.",
      options: [
        { id: "study", name: "Study it", blurb: "+10 science; Vessik will be watching the crew closely.", how: "The Arkwright found and her crew woken; the phenomenon studied.", fx: { science: 10 }, text: "Sevek's study fills three data cores. For a week afterwards, half the Pelion's crew dream the same dream, and then it fades." },
        { id: "leave", name: "Get everyone out", blurb: "+1 commendation, +4 science from what's already recorded.", how: "The Arkwright found and her crew brought home.", fx: { commendations: 1, science: 4 }, text: "The Pelion tows the Arkwright clear and doesn't look back. Fourteen families get the news they were praying for." },
      ] },
    fail: "The Arkwright is still out there, still drifting. The search is called off.",
  },
  "Deliver urgent medical supplies": {
    type: "Rescue",
    reason: "An outbreak with no name, and the only stock of the retroviral in the sector is aboard the Pelion.",
    why: "The fever broke out downriver of a dig site where Orions sold the locals 'ancient medicine'. Starfleet suspects it came out of a disturbed Makers' cache.",
    thread: "The contaminant is a Makers' preservative: the same compound that kept the Corvan II scientists asleep. Someone is opening their stores.",
    keys: ["former Starfleet surgeon Dr. Imani Okafor", "an exhausted young doctor in charge for a week", "an elderly physician who has seen this fever before", "a brilliant, reckless epidemiologist"],
    strange: ["an unlicensed agricultural mutagen", "Orion spice with a contaminant", "ice from a comet no one had tested", "fertilizer from an unregistered supplier"],
    brief: "An outbreak on {world}: a fever their doctors can't name, spreading faster each day. The Pelion carries the only stock of a broad-spectrum retroviral in the sector.",
    arrive: "{world}'s capital is under quarantine; the streets are empty and the hospitals full. Their chief physician, {key}, meets the away team at the transporter with a single question: how much did you bring?",
    steps: [
      ["Distribute the supplies", "Vessik and the medical teams work through two days and a night. The retroviral slows the fever. It doesn't stop it."],
      ["Find the cause", "The fever isn't natural: it started at a single water plant, and the plant's logs show a shipment of {strange} a week before the first case."],
    ],
    choice: { title: "The cure", text: "Vessik can synthesize a cure from the samples, but there's only enough of the base compound for {world} or for the colony next door, where the first cases are just appearing. {key} begs the Pelion to stay.",
      options: [
        { id: "stay", name: "Cure {world} first", blurb: "+2 accord with {world}; the next colony will have to wait for Starfleet Medical.", how: "The outbreak on {world} cured; the cause found.", fx: { accord: 2, heal: 1 }, text: "The fever breaks across {world} within a week. {key} names the new hospital wing after the Pelion's doctor, which Vessik pretends to mind." },
        { id: "split", name: "Split it, and send for more", blurb: "+1 commendation, +4 science; both outbreaks slowed, neither cured yet.", how: "The outbreak slowed on two worlds; Starfleet Medical called in.", fx: { commendations: 1, science: 4 }, text: "Half a cure for each world, and a priority call to Starfleet Medical. It's the right call and the slower one, and Vessik doesn't sleep for a week." },
      ] },
    fail: "The supplies arrived too late for {world}. The fever has run its course, and the count is grim.",
  },
  "Evacuate a colony": {
    type: "Rescue",
    reason: "Twelve hundred colonists and a star that won't wait. Every hour counts.",
    why: "The colony's star began to flare the week an Orion crew was seen at a Makers' ruin on its outer moon. If they took the machine that steadied the star, more stars may follow.",
    thread: "The outer moon's ruin is empty: whatever steadied the star was cut out and carried off. The cutting tools match the ones on Corvan II.",
    keys: ["a governor who built the colony with her own hands", "a governor up for re-election in a month", "a stubborn old governor who has survived three flares", "a governor with a secret reason to stay"],
    strange: ["a field of glass flowers that sing at dawn", "a ruin older than any known civilization", "a spring whose water heals", "an ancient machine that still works"],
    brief: "{world}'s star is flaring, months ahead of every prediction. The colony has days, not months: twelve hundred people, three transports, and {key}. The governor doesn't believe the readings.",
    arrive: "The flare's first wave has already cooked {world}'s northern hemisphere. The colony's transports are on the ground, half-loaded. The governor wants proof.",
    steps: [
      ["Convince the governor", "Sevek's projections, shown on every screen in the colony, settle the argument. The governor gives the order to evacuate, and the colony starts to move."],
      ["Load the transports", "Twelve hundred people and the things they can't leave behind: a seed vault, a hospital, a colony library, and {strange} that the colonists swear is the reason they came here."],
      ["Get them clear", "The transports lift as the second wave hits. The Pelion's shields take the brunt of it, and hold."],
    ],
    choice: { title: "The last transport", text: "There's room for one more load: the colony's seed vault, the work of thirty years, or the forty colonists who refused to leave until the last moment and are now begging to.",
      options: [
        { id: "people", name: "The people", blurb: "Every colonist safe: +2 commendations; the colony starts again from nothing.", how: "Every colonist evacuated before the flare.", fx: { commendations: 2 }, text: "Every last colonist makes it off {world}. The seed vault burns with everything else. Thirty years of work, and twelve hundred lives." },
        { id: "vault", name: "Both: the shuttles go back", blurb: "Risk the shuttles for both: +1 commendation, +10 supplies from what's saved; a shuttle crew is hurt.", how: "The colony evacuated, its seed vault saved by a last shuttle run.", fx: { commendations: 1, supplies: 10, hurt: 1 }, text: "The shuttles go back down through the flare's leading edge. They come back scorched, with the vault and the forty colonists aboard, and one pilot in sickbay." },
      ] },
    fail: "The flare reached {world} before the transports cleared. Not everyone got out.",
  },
  "Patrol the Neutral Zone border": {
    type: "Security",
    reason: "The border outposts haven't seen a starship in months, and the Romulans notice when no one is watching. Show the flag.",
    why: "Romulan ships have been seen near three Makers' sites in a month. Starfleet wants to know what the Romulans know.",
    thread: "The Romulan ship was mapping shield frequencies, and something else: the bearings of every Makers' site on this side of the Zone.",
    keys: ["an outpost commander who hasn't slept in a week", "a nervous listening-post technician", "a disapproving Vulcan observer", "a Romulan who wants to defect"],
    strange: ["a ghost ship seen crossing the Zone", "lights in the Zone where there are no stars", "a Romulan buoy that wasn't there last week", "a signal repeating a crew member's name"],
    brief: "Romulan ships have been sighted along the Neutral Zone: a patrol is overdue. Show the flag, watch the border, and don't start a war.",
    arrive: "The border is quiet. Too quiet: the outpost listening stations report a gap in their coverage, as if something were jamming them on purpose, and {key} is waiting for the Pelion with a story about {strange}.",
    steps: [
      ["Sweep the border", "Rrinn hears it first: the faint echo of a cloaked ship, holding station on the Zone's edge, close enough to watch every outpost on the line."],
      ["Find out why", "It's a Romulan bird-of-prey, and it's mapping the outposts' shield frequencies. Whatever it's preparing for, it isn't a visit."],
    ],
    choice: { title: "The watcher", text: "The Romulan ship hasn't crossed the line, quite. Hail it and tell it that it's been seen, or quietly retune every outpost's shields and let it go home with useless data.",
      options: [
        { id: "hail", name: "Hail it", blurb: "Let them know they've been seen: +1 commendation; tension with the Empire's allies rises.", how: "The border patrolled; a Romulan watcher challenged and sent home.", fx: { commendations: 1 }, text: "The bird-of-prey decloaks long enough for its commander to say nothing at all, and leaves. Everyone on the line breathes out." },
        { id: "shadow", needs: "inverter", name: "Shadow it home", blurb: "Only with the cloak inverter: follow it, unseen, all the way to the Zone, and record everything. +10 science, +1 commendation.", how: "The border patrolled; a cloaked Romulan ship shadowed home by the inverter.", fx: { science: 10, commendations: 1 }, text: "For two days the Pelion follows a ship that thinks it's invisible, the inverter painting it on the main viewer like a ghost. Its course, its patrol pattern, the frequency it reports home on: all of it goes to Starfleet Intelligence. The Romulans never know." },
        { id: "retune", name: "Retune the shields", blurb: "Let them leave with bad data: +6 science, and the outposts are safer for it.", how: "The border patrolled; a Romulan spy sent home with bad data.", fx: { science: 6 }, text: "Every outpost on the line changes frequency the moment the Romulan ship turns for home. Months of their work, wasted. They'll never know when it happened." },
      ] },
    fail: "The patrol never happened. Whatever was watching the border has finished watching.",
  },
  "Recover a lost probe or artifact": {
    type: "Exploration",
    reason: "The probe's logs hold three years of deep-space survey data, and whoever reaches the wreck first owns them.",
    why: "The probe went down near a Makers' site, carrying a piece of whatever it found. A Klingon house and an Orion broker both want it.",
    thread: "The fragment carries a star chart: the Makers' sites in the Corvan Sector, and lines between them that all point to one place.",
    keys: ["a stranded Orion trader", "a salvage broker who asks no questions", "a former Starfleet officer gone rogue", "a collector of curiosities with deep pockets"],
    strange: ["a derelict of an unknown design", "a living crystal", "a fragment of a dead civilization's beacon", "a shard of a hull no one built"],
    brief: "A Federation deep-space probe went down near {world} carrying sensor logs from beyond the sector's edge, and something it was never meant to find: {strange}. Recover it before anyone else does.",
    arrive: "The probe's beacon is still pinging from {world}'s debris field, and the Pelion isn't the only ship listening: {key} is already there, in a ship with no registry.",
    steps: [
      ["Find it in the debris", "The probe is lodged in a tumbling asteroid, its casing cracked. Something inside it is still powered, and it isn't the probe's own reactor."],
      ["Get it aboard", "Grath's people cut it free and tractor it in. The cargo bay's lights dim when it crosses the threshold."],
      ["Find out what it found", "The probe's logs describe {strange}, and the probe brought a piece of it home."],
    ],
    choice: { title: "The fragment", text: "{key} makes an offer: a great deal of money for the fragment, no questions asked. Starfleet wants the whole thing sent to a research station under seal.",
      options: [
        { id: "starfleet", name: "Send it to Starfleet", blurb: "+8 science, +1 commendation.", how: "The probe recovered and sent to Starfleet under seal.", fx: { science: 8, commendations: 1 }, text: "The probe goes to Starbase 23's labs under a Starfleet seal. {key} watches it go and makes a note." },
        { id: "sell", name: "Take the money", blurb: "+20 supplies; Starfleet Command marks a box.", how: "The probe recovered, and its fragment sold.", fx: { supplies: 20, command: 1 }, text: "The money is very good. Starfleet's inquiry, when it comes, is very thorough." },
      ] },
    fail: "Someone else reached the probe first. Its logs, and whatever it brought home, are in other hands now.",
  },
  "Mediate a dispute between two worlds": {
    type: "Diplomatic",
    reason: "Two independent worlds are a week from war, and a war on the frontier draws in everyone, the Klingons first.",
    why: "The moon they're fighting over holds a Makers' machine in its mines. War would put it up for sale to whoever helps the winner.",
    thread: "Under the mines is a Makers' relay, still transmitting toward the same point in space as all the others.",
    keys: ["an idealistic Federation ambassador", "the moon's own mining guild boss", "a Vulcan arbiter sent to observe", "a retired admiral who brokered the last truce"],
    strange: ["a seam of pure dilithium", "an ancient machine that still works", "fossils of their shared ancestors", "a crystal that stores memories"],
    brief: "{world} and its neighbour are a week from war over a mining moon that orbits between them. Both have asked the Federation to mediate; neither trusts it.",
    arrive: "The talks are held aboard the Pelion, the only neutral ground in the system. The two delegations arrive within a minute of each other and refuse to share a turbolift. {key} sits with neither.",
    steps: [
      ["Get them to the table", "The first session lasts eleven minutes. The second, an hour. By the third, they're arguing about the moon instead of about each other, which Psychology counts as progress."],
      ["Find the real grievance", "The moon isn't the problem. Both sides found {strange} in its mines, and neither can bear the other having it."],
      ["Find common ground", "Sevek finds it: neither side can extract it alone. Together, they could."],
    ],
    choice: { title: "The settlement", text: "A settlement is close. Propose a shared mining treaty under Federation supervision, or let them divide the moon down the middle and keep the Federation out of it.",
      options: [
        { id: "treaty", name: "A shared treaty", blurb: "+2 accord with {world}; the Federation is in the middle of it for years.", how: "War averted: a shared mining treaty under Federation supervision.", fx: { accord: 2 }, text: "The treaty is signed in the Pelion's briefing room. It will take a Federation office on the moon and a decade of patience, and it will hold." },
        { id: "divide", name: "Divide the moon", blurb: "+1 commendation, +6 supplies in thanks; they'll be back at each other's throats someday.", how: "War averted: the moon divided between them.", fx: { commendations: 1, supplies: 6 }, text: "A line down the middle of a moon, and two delegations who don't have to talk to each other again. Both send gifts. Neither expects it to last." },
      ] },
    fail: "The talks failed. {world} and its neighbour are at war over a moon.",
  },
  "Test experimental technology": {
    type: "Technology",
    reason: "Starfleet R&D needs field trials before the prototype goes fleetwide, and the Pelion is the only Heavy Cruiser on this frontier.",
    why: "Starfleet R&D built the prototype from what the Pelion learned at Corvan II: a way to see through a Makers' field, and through a cloak.",
    thread: "At full power the prototype sees a Klingon ship trailing the Pelion, cloaked, for weeks: House Kor'vath is following the Pelion to the Makers' sites.",
    keys: ["a brilliant, reckless scientist", "a Daystrom Institute prodigy", "an engineer who designed the prototype in a weekend", "a Starfleet R&D commander with a deadline"],
    strange: ["a cloaked ship that shouldn't be there", "a hidden Orion cache", "a ships' graveyard nobody charted", "a signal repeating a crew member's name"],
    brief: "Starfleet R&D has a prototype for the Pelion to test near {world}: a sensor-cloak inverter, built by {key}, that should let a starship see through a cloak. It hasn't been tested outside a lab.",
    arrive: "{key} beams aboard with the prototype in three crates and a manner that suggests the Pelion should be grateful. Grath takes one look at the wiring and asks who signed off on it.",
    steps: [
      ["Install it", "The prototype goes into the sensor array. The first power-up blows every fuse on deck seven, and the second one works."],
      ["Run the trials", "It works: against a cloaked training drone, the inverter finds it in seconds. It also finds {strange}, which nobody was looking for."],
      ["Push it to the limit", "At full power the inverter sees through a cloak at three light-years. It also starts to overheat, and {key} won't say what happens if it keeps going."],
    ],
    choice: { title: "The prototype", text: "The trials are done. {key} wants to push it one more time, at full power for an hour, to prove it. Grath wants it shut down and crated before it melts the array.",
      options: [
        { id: "push", name: "One more run", blurb: "+12 science; the sensors take a box of damage. R&D leaves a field unit fitted, tuned by the full-power run: +2 to sensor sweeps, and sweeps reach 5 light-years instead of 3.", how: "The prototype tested to its limit; a tuned field unit left fitted to the Pelion.", fx: { science: 12, sensors: 1, inverter: 2 }, text: "An hour at full power, and the most complete data set R&D has ever seen. The sensor array smokes for a day afterwards. When the smoke clears, {key} leaves a field unit wired into the Pelion's sensors, tuned by everything that hour taught them: it sees through a cloak at twice the range of anything else in the fleet." },
        { id: "shut", name: "Shut it down", blurb: "+6 science, +1 commendation; the array is safe. R&D leaves a field unit fitted: +2 to sensor sweeps.", how: "The prototype tested and safely returned; a field unit left fitted to the Pelion.", fx: { science: 6, commendations: 1, inverter: 1 }, text: "Grath crates the prototype himself. {key} sulks all the way back to Starbase 23, and R&D sends a thank-you note to the chief engineer, and a field unit for the Pelion's sensors: a smaller, safer cloak inverter, fitted before the ship leaves dock." },
      ] },
    fail: "The trials never happened. R&D will find another ship, and another schedule.",
  },
  "Ferry a delegation to a world that left the Federation": {
    type: "Diplomatic",
    reason: "They left because the Federation failed them. Starfleet wants the chance to make it right, and they've asked for the Pelion by name.",
    why: "The disaster that drove them out of the Federation began when a Makers' machine on their moon failed. They want answers Starfleet has only just started to find.",
    thread: "Their machine didn't fail: it was switched off, from a distance, by a signal from the same point every Makers' relay points to.",
    keys: ["a first minister who lost family in the disaster", "a former Federation liaison who resigned in protest", "the spaceport's director", "a council elder who voted to leave"],
    strange: ["a Klingon raid that held every ship nearby", "an ion storm that grounded the relief fleet", "a priority order to protect a Federation ambassador", "a misfiled distress call"],
    brief: "{world} left the Federation two years ago, after a disaster Starfleet was too slow to answer. Now they've asked for a delegation to talk about coming back, and they've asked for the Pelion by name.",
    arrive: "The welcome at {world} is formal and cold. The spaceport still has the scorch marks from the disaster, unrepaired, as if on purpose. {key} meets the delegation and doesn't offer a hand.",
    steps: [
      ["Hear their grievance", "They want to be heard first: the disaster, the eleven days before help came, the people lost. The delegation listens, all of it."],
      ["Answer it", "Starfleet's records show why help was slow: {strange}, and a decision made far above the Pelion. It isn't an excuse. It is the truth."],
      ["Ask them back", "Their council meets. They want something the Federation can't easily give: an apology, in Starfleet's name, on the record."],
    ],
    choice: { title: "The apology", text: "The delegation can apologize in Starfleet's name, which it isn't authorized to do, or offer what it can: a promise to carry their grievance to Starfleet Command in person.",
      options: [
        { id: "apologize", name: "Apologize, on the record", blurb: "+2 accord with {world}; Starfleet Command marks a box.", how: "The delegation delivered; Starfleet's apology given, unauthorized.", fx: { accord: 2, command: 1 }, text: "The apology is given in the spaceport, in front of the scorch marks. Half the crowd weeps. Starfleet Command's reply is short and not pleased." },
        { id: "carry", name: "Carry it to Starfleet", blurb: "+1 accord, +1 commendation.", how: "The delegation delivered; their grievance carried to Starfleet.", fx: { accord: 1, commendations: 1 }, text: "It isn't what they wanted. But they believe the Pelion will carry it, and that's a start." },
      ] },
    fail: "The delegation never reached {world}. Its people will remember that too.",
  },
  "Shore leave that goes wrong": {
    type: "Crew",
    reason: "The crew have earned a week's liberty. Starfleet only asks that they come back on time and in one piece.",
    why: "Starfleet only meant this as shore leave, but the 'carnival of illusions' is powered by something an Orion sold the owners, and two of the crew walked into it.",
    thread: "The carnival's illusions run on a Makers' machine, bought from Orions who said there were many more where it came from.",
    keys: ["the local magistrate", "a market guild leader", "the owner of the gaming house", "a colony constable"],
    strange: ["a carnival of illusions", "a pleasure garden that grants wishes", "a casino where time runs slow", "a hall of mirrors that shows other lives"],
    brief: "Shore leave at {world}, at last: a week's liberty for the crew. Starfleet only asks that the Pelion's people come back on time and in one piece. {strange} is the local attraction.",
    arrive: "The crew scatters across {world}'s pleasure districts. By the second evening, six of them haven't checked in, and {key} is asking for the captain.",
    steps: [
      ["Find the missing crew", "Four of the six are found at once: a card game, a misunderstanding, a local magistrate who wants a fine paid. The other two are somewhere {strange} leads."],
      ["Bring them home", "The last two are found, dazed and delighted and with no memory of the last day. And one of them has something they shouldn't, which {key} says was stolen."],
    ],
    choice: { title: "The stolen thing", text: "{key} wants the crewman handed over to local justice. The crewman swears it was a gift. Local law is local law; Starfleet looks after its own.",
      options: [
        { id: "local", name: "Hand them over", blurb: "Respect local law: +1 accord with {world}; the crewman faces a local court.", how: "Shore leave sorted out under local law.", fx: { accord: 1 }, text: "The magistrate is fair, the fine is paid, and the crewman serves three days sweeping the market. {world} remembers that the Pelion played by its rules." },
        { id: "ship", name: "Starfleet handles it", blurb: "+1 commendation; the locals aren't happy.", how: "Shore leave sorted out under Starfleet discipline.", fx: { commendations: 1, accord: -1 }, text: "The crewman faces a captain's mast instead, and the item is returned with an apology. {key} calls it Starfleet arrogance, loudly." },
      ] },
    fail: "Shore leave ended badly, and late. The incident report is longer than the liberty was.",
  },
  "Carry a message across the Neutral Zone": {
    type: "Security",
    reason: "A message that can't go by subspace, to a contact who will only talk to a starship. Starfleet won't say what's in it.",
    why: "A Romulan officer has warned Starfleet that the Romulan Star Empire is searching for the Makers' Gate too. This is the reply.",
    thread: "The Romulan reply: the Gate is real, it's in the Corvan Sector, and the Klingons are close to finding it.",
    keys: ["a Starfleet admiral with sealed orders", "an admiral's intelligence aide", "a Federation ambassador who once served on the Romulan border", "a Vulcan diplomat with old Romulan contacts"],
    strange: ["a Romulan weapon test planned near the Zone", "a coup brewing in the Romulan Senate", "a plague on a Romulan colony world", "a fleet massing behind the Zone"],
    brief: "A sealed message for a Romulan contact on the far side of the Zone, near {world}. Crossing is an act of war if they catch you; Starfleet will deny sending you. {key} wrote the message.",
    arrive: "The Zone's edge on the viewer: empty space that every officer aboard has been trained to fear. Somewhere across it, a contact waits who will only talk to the Pelion.",
    steps: [
      ["Cross unseen", "Running dark, sensors passive, the Pelion slips across the line. Twice, the hull rings with a Romulan sensor sweep passing close. Twice, it passes."],
      ["Deliver the message", "The contact is a Romulan officer, frightened and very brave. The message is a warning about {strange}, and the reply is worse."],
    ],
    choice: { title: "The defector", text: "The Romulan officer wants to come back with you. Taking them means a chance to be caught on the way out, and an intelligence prize beyond price. Leaving them means they'll be dead in a month.",
      options: [
        { id: "take", name: "Bring them out", blurb: "+12 science from what they know, +1 commendation; tension with the Empire rises.", how: "The message delivered, and a Romulan officer brought out.", fx: { science: 12, commendations: 1, tension: 1 }, text: "The run back to the line is the longest hour of the tour. The Pelion makes it, with one passenger more than the manifest says." },
        { id: "leave", name: "Deliver and go", blurb: "+1 commendation; the officer stays behind.", how: "The message delivered across the Zone.", fx: { commendations: 1 }, text: "The Pelion slips back across the line as quietly as it came. The officer watches it go. Nobody aboard says anything for a long time." },
      ] },
    fail: "The message was never delivered. Whatever it warned about will come without warning now.",
  },
};
/** A story's text with the order's details filled in. */
export function storyText(S, o, text) {
  const world = o.place || (o.sys ? S.systems[o.sys].name : "the border");
  return text.replace(/\{world\}/g, world).replace(/\{key\}/g, (o.key || "a stranger").replace(/^A /, "a ").replace(/^An /, "an "))
    .replace(/\{strange\}/g, (o.strange || "something strange").replace(/^A /, "a ").replace(/^An /, "an ").replace(/^The /, "the ")).replace(/\{captain\}/g, S.captain || "the captain")
    .replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, (m, p, c) => p + c.toUpperCase());
}
export const storyOf = (o) => (o && o.story ? STORIES[o.story] : null);

/**
 * Complications: partway through an order, something goes wrong. Press on (an opposed roll: win and you gain ground,
 * lose and it costs you) or fall back (safe, but a week lost). One set for each kind of mission.
 */
export const COMPLICATIONS = {
  Rescue: { title: "A second disaster", text: "Halfway through, it gets worse: a secondary explosion, a hull section giving way, a corridor filling with smoke, and people still on the far side of it.", oppose: { name: "the spreading disaster", skill: "Severity", target: 12 }, skills: ["Engineering", "Medicine", "Leadership"], cost: "hurt", costText: "a rescuer is hurt getting them out", press: "Send the team in now" },
  Diplomatic: { title: "A walkout", text: "One delegation stands up mid-session and walks out, citing an insult nobody else heard. If they reach their ship, the talks are over.", oppose: { name: "wounded pride", skill: "Grievance", target: 12 }, skills: ["Diplomacy", "Psychology", "Leadership"], cost: "accord", costText: "the talks sour: accord −1", press: "Go after them" },
  Exploration: { title: "The readings spike", text: "The sensors spike off every scale: something is reacting to the Pelion's scans, and the longer the ship stays, the harder it pushes back.", oppose: { name: "the phenomenon", skill: "Strangeness", target: 12 }, skills: ["Sensors", "Physical Sciences", "Computers"], cost: "sensors", costText: "the sensor array burns out a box", press: "Hold position and keep scanning" },
  Technology: { title: "Cascade failure", text: "The prototype's power draw spikes and a cascade starts running through the ship's systems, deck by deck. It can be shut down, or ridden out.", oppose: { name: "the cascade", skill: "Overload", target: 12 }, skills: ["Engineering", "Electronics", "Computers"], cost: "engines", costText: "the cascade reaches the warp drive: engines damaged", press: "Ride it out" },
  Security: { title: "Contact", text: "A contact on long-range sensors, closing fast and running dark. It could be a patrol. It could be a trap.", oppose: { name: "whoever is out there", skill: "Cunning", target: 12 }, skills: ["Sensors", "Helm", "Communications"], cost: "tension", costText: "an incident on the border: Klingon tension +1", press: "Hold course and find out" },
  Crew: { title: "It gets out of hand", text: "What started as a misunderstanding has the local constabulary involved, a crowd gathering, and a crewman who won't back down.", oppose: { name: "the crowd's temper", skill: "Anger", target: 11 }, skills: ["Leadership", "Psychology", "Diplomacy"], cost: "command", costText: "an incident report reaches Starfleet: a Command box", press: "Step in personally" },
  Campaign: { title: "Kor'vath moves first", text: "The Klingon cruiser runs its shields up and moves to cut the Pelion off from the Gate. Hold your ground, or give them room.", oppose: { name: "House Kor'vath's cruiser", skill: "Ruthlessness", target: 12 }, skills: ["Helm", "Leadership", "Diplomacy"], cost: "hurt", costText: "a disruptor hit on the bridge: a crew member is hurt", press: "Hold your ground" },
};
/** Each Makers' site House Kor'vath digs up, in turn: where it was and what was lost. */
export const KORVATH_SITES = [
  "a ruin on an airless moon, its caretaker cut out in a night",
  "a cave city on a frozen world, emptied, its watcher gone",
  "a sea-floor vault, flooded after the diggers left",
  "a mountain shrine the locals had guarded for a thousand years",
  "a derelict in a slow orbit, stripped to the frame",
  "a desert obelisk, toppled and hollow",
  "a ring of standing stones, every stone cut open",
  "a crater observatory, its lenses smashed",
];
