// The stories behind each kind of order, in the way of The Silence at Corvan II: a briefing, a scene on arrival, a scene
// for each stage of the work, a decision at the end with two ways to go, and what happens if the Pelion is too late.
// {world} is where it happens, {key} the key character, {strange} the strange thing, {captain} you. Each kind of order
// has its own key characters and strange things, chosen to fit its story.
// A choice's `fx` is what it does: commendations, science, supplies, accord (the world's), command (boxes marked),
// tension (with the Klingon Empire), romulan (a Romulan reprisal: a cloaked bird-of-prey crosses the Zone to strike a
// Federation world), heal (the world's harm).
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
    { at: 4, act: "Act III: The Lines", title: "Every relay points one way", text: "Sevek takes the relay readings the Pelion has logged at every Makers' site so far, the transmission bearings each machine was still sending on, and lays them on the sector chart. Each relay transmits along a single line. The lines meet at a single point in empty space. The caretakers weren't just watching the younger worlds: they were reporting to something.\n\nThe same night, Rrinn pulls a burst of Klingon traffic out of the noise near the border: House Kor'vath's diggers being sent coordinates. Decrypted, they're the same bearings. Kor'vath has worked it out too. And the Neutral Zone patrol logs show Romulan ships near three Makers' sites in a month: Rrinn suspects the Romulans have as well." },
    { at: 6, act: "Act IV: The Gate", title: "The Makers' Gate", text: "The last thread closes the triangle. Sevek's lines no longer meet near a point: they meet at one, to within a light-hour. The Pelion's long-range sensors turn toward it and find a ring of light a kilometre across, turning slowly in empty space: the Makers' Gate, the way they left and the way back. Whoever controls it controls every caretaker in the sector, and every world they watch over.\n\nAn hour later, Rrinn hears House Kor'vath's battle cruiser leave its border station on a heading straight for it. Starfleet's orders are short: get there first." },
  ],
};
export const STORIES = {
  "The Makers' Gate": {
    type: "Campaign",
    keys: ["Captain Dakhar|commander of the Kor'vath cruiser"], strange: ["the Makers' Gate"],
    why: "Every thread of this tour leads here. If House Kor'vath takes the Gate, it takes every caretaker in the sector with it.",
    thread: "The Watchers of the Void have finished their watch.",
    brief: "At the point where every Makers' relay meets, sensors find a ring of light a kilometre across, turning slowly in empty space: the Makers' Gate. House Kor'vath's battle cruiser is already on its way, under {key}. Get there first, and decide what happens to it.",
    arrive: "The Gate fills the main viewer: a ring of light a kilometre across, turning slowly in empty space, and through it, stars that don't belong to this sky. Nobody on the bridge says anything for a while.\n\nRrinn has her hands pressed over her ears. \"They're all talking to it, Captain. Every caretaker in the sector, all at once. It's like standing inside a choir.\"\n\nOn long-range sensors, eleven hours out and coming fast, is the Kor'vath battle cruiser.",
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
    keys: ["Tomas Kell|the freighter's first mate", "Ysra Dane|a passenger travelling under a false name", "Corwin Bask|the cargo's anxious owner", "Mara Olin|a former Starfleet officer working the freight lanes"],
    strange: ["a crystal that sings when it's cold", "a dormant alien life form", "dilithium of a purity no one mines", "a weapon component from a war a century gone"],
    brief: "A distress call from {world}, cut off mid-word: a freighter, the Calloway's Pride, with forty aboard, adrift and losing life support. The signal repeats every eleven minutes. Something in it doesn't match the freighter's registry.",
    arrive: "The Calloway's Pride hangs dark above {world}, turning end over end, venting a white plume of atmosphere from a long scar down her flank. Her running lights are out. Her transponder is still shouting.\n\n\"Thirty-one life signs,\" Sevek reports, \"clustered in the aft cargo hold, where the last warm air is. The forward sections are open to space.\" A pause. \"There were forty.\"\n\nRrinn's ears are flat against her skull. \"Captain, there's someone on the emergency channel. Not the crew. A passenger.\" The voice that comes through is calm in the way people are calm when they've been terrified for too long: {key}, who says they know why the call was cut off, and won't say it over an open channel.",
    steps: [
      ["Reach the survivors", "The boarding party cuts in through the cargo lock, Reyes first, phaser up, Vessik a step behind with the medkit. The air is thin and bitterly cold. In the aft hold thirty-one people are huddled around a single heater, wrapped in cargo tarps, and when the lights of the boarding party reach them a child starts to cry with relief.\n\nVessik moves through them like water, a hand on a shoulder, a hypospray, a word. Reyes isn't watching the survivors. She's watching the crates: sealed, stencilled MACHINE PARTS, and humming. She puts a tricorder against one and frowns. \"Captain, these aren't machine parts. They're {strange}.\""],
      ["Stabilize the ship", "Grath goes into the Pride's engine room muttering, and comes out four hours later covered in coolant and, for him, almost cheerful. \"Breach sealed. Reactor cold. She'll hold together long enough to tow, which is more than her owners deserved. Whoever maintained this ship should be maintained themselves, out an airlock.\"\n\nThe survivors are aboard the Pelion, fed and warm. The Pride is safe. Which leaves the crates, and {key}, who has asked to speak to the captain alone."],
    ],
    choice: { title: "The cargo", text: "In the observation lounge, {key} doesn't sit down. \"The crates stay sealed. That's all I'm asking. The owners will pay salvage, generously, and nobody needs to know what was aboard.\" A glance at the stars. \"You don't want to know, Captain. Believe me.\"\n\nReyes, by the door, has her own view: Starfleet regulations say a vessel found carrying undeclared cargo is searched. Grath, over the comm, has his: the salvage fee would refit half the ship.",
      options: [
        { id: "inspect", name: "Open the crates", blurb: "Starfleet regulations: find out what was really being carried. +6 science, +1 commendation; the owners won't be pleased.", how: "The survivors rescued; the false cargo opened and logged for Starfleet.", fx: { science: 6, commendations: 1 }, text: "Reyes cracks the first crate herself. Inside, packed in shielding no freighter should carry, is {strange}, and the tricorders go wild. Sevek logs everything for Starfleet Intelligence while {key} watches in silence, and then, very quietly, asks to be put ashore at the next starbase. They don't say another word all the way home." },
        { id: "deliver", name: "Tow it home sealed", blurb: "Take the owners' word and their money: +12 supplies.", how: "The survivors rescued; the Pride towed home with her cargo sealed.", fx: { supplies: 12 }, text: "The Pride goes home under tow with her crates unopened. Her owners transfer the salvage fee before she's even docked, and add a little more, unasked. Grath spends it with joy. Reyes doesn't say anything, but she logs the cargo manifest anyway, just in case someone, someday, asks what was aboard." },
      ] },
    fail: "By the time anyone reaches the Calloway's Pride, the hold is cold and the transponder has stopped. The boarding party finds the thirty-one around a heater that ran out of power two days before. Rrinn plays the last distress call back once, in the silence of the bridge, and then turns it off. The inquiry asks why the Pelion took so long, and nobody has a good answer.",
  },
  "Survey an uncharted system": {
    type: "Exploration",
    reason: "Charting the frontier is what the Pelion is out here for: a system no one has mapped is a hazard to every ship that passes it, and a discovery waiting to be made.",
    why: "The Corvan II caretaker spoke of its makers coming from the stars. Sevek believes a system this impossibly stable is being held together by another of their machines.",
    thread: "The system's heart answers to the same carrier wave as Corvan II's ruins: another of the Makers' machines, still keeping its watch.",
    keys: ["Dr. Pell Annix|a brilliant, reckless scientist", "T'Sora|a Vulcan astrophysicist observing the survey", "Dr. Ines Halloran|a survey specialist on loan from Memory Alpha", "Ensign Kofi Mensah|the young ensign who spotted the readings first"],
    strange: ["a dead star that sings", "a gravity well older than the star", "a subspace anomaly that distorts time", "a machine the size of a moon"],
    brief: "{world} has never been properly charted: long-range scans show a system that shouldn't be stable, and a reading the computers file under {strange}. Chart it, and find out what keeps it together.",
    arrive: "{world} fills the main viewer and something about it is wrong in a way that takes a moment to see. The orbits are too tight: planets packed around their star like beads on a string, so close they should have torn each other apart long ago. The star flickers, faintly, on a rhythm.\n\n\"Eleven point four seconds,\" Sevek says. \"Precisely. Stars do not keep time, Captain.\"\n\nRrinn tilts her head. \"Something's answering our pings. Half a second late, every time. Like an echo that's thinking about it first.\"",
    steps: [
      ["Chart the orbits", "Sevek works for a day and a night and comes to the bridge with a model he plainly doesn't like. \"Every world in this system sits in a gravitational well deeper than its own mass can explain. Something is holding them in place. Has been holding them in place.\" He turns the model in the air between them. \"For a hundred thousand years, at least.\""],
      ["Find the source", "They find it at the system's heart, where the star's corona should make sensors useless: {strange}, and around it a field that turns as the Pelion's scans touch it, the way a sleeper turns away from a light. Grath reads the power curve and goes quiet. \"Captain. If that thing let go, every planet in this system would fall into the sun in about a week.\""],
      ["Understand it", "Sevek's model fits at last, and it's simple, and it's terrifying. The system isn't stable. It's being kept stable, deliberately, by the thing at its heart, against a hundred thousand years of physics trying to pull it apart. Charting it is one thing. Disturbing it is another."],
    ],
    choice: { title: "What to report", text: "{key} has a proposal, and it's a good one: leave a probe in close orbit, and let it study the thing at the system's heart for a year. The science would be extraordinary. Nothing like it is known anywhere in the Federation.\n\nSevek's reservation is equally precise. \"We do not know what attention it pays to observers, Captain. Our scans changed its behaviour. A permanent observer might change it permanently.\"",
      options: [
        { id: "probe", name: "Leave a probe", blurb: "+12 science; a risk no one can measure yet.", how: "The system charted; a probe left to study its heart.", fx: { science: 12 }, text: "The probe drops into orbit and starts sending data no one in the Federation has seen before. For an hour, nothing. Then the star's rhythm stutters, once, eleven point four seconds becoming eleven point six, and every soul on the bridge holds their breath. It steadies. It holds. Sevek doesn't sleep that night, and in the morning he says only: \"It noticed.\"" },
        { id: "leave", name: "Chart it and leave it alone", blurb: "+5 science, +1 commendation for caution.", how: "The system charted and left undisturbed.", fx: { science: 5, commendations: 1 }, text: "The Pelion files its charts and leaves {world} exactly as it found it, ticking away on its eleven-second rhythm. {key} is disappointed and says so at length. Starfleet notes the restraint, and in Sevek's report there's a line that the captain reads twice: whatever holds that system together has been doing it alone for a very long time, and deserved not to be disturbed." },
      ] },
    fail: "The survey of {world} never gets done. The charts stay blank, and the next ship to pass through the system will meet its strange, stuttering star with no warning at all.",
  },
  "Make first contact": {
    type: "Diplomatic",
    reason: "A new warp-capable people is the Federation's first chance to be a friend, and the Klingons' first chance to be something else. Starfleet wants the Federation's voice heard first.",
    why: "Their oldest myths speak of travellers who came from the stars and left a guardian behind. Starfleet wants to hear those stories before anyone else does, and to make sure no one else exploits them.",
    thread: "Their myth names the travellers' home: a gate in the sky, three days' light from their sun. It's the first time anyone has heard of the Makers' Gate.",
    keys: ["Captain Kurr|a Klingon captain with a grudge", "Davo Seln|an Orion trader with an offer of his own", "Envoy Grelk|a Tellarite trade consortium's envoy", "Tal Vereth|a Romulan observer in disguise"],
    strange: ["a myth of travellers from the stars", "a signal they've been receiving for centuries", "an ancient machine that still works", "a star chart carved into their oldest temple"],
    brief: "{world} has warp drive now: a test flight was detected last month. Starfleet wants first contact made before anyone else makes it for them, and before {key} gets there first.",
    arrive: "{world}'s first warp ship is still in orbit, a slender thing ringed by news drones, and it's the most watched object in its star system. When the Pelion drops out of warp, every one of those drones turns.\n\nTheir government hails before the Pelion can: a woman in a high-collared coat, composed, careful. Behind her, someone is pretending not to stand at a weapons console. \"You are welcome,\" she says, \"to explain yourselves.\"\n\nsh'Vari, at the captain's shoulder, murmurs: \"They've locked weapons on us. Politely.\"",
    steps: [
      ["Make the first approach", "The first meeting is in a neutral room aboard their station: bare walls, a long table, water nobody touches. Their delegates are curious and afraid in equal measure, and very interested in one question, asked in seven different ways: will the Federation take what it wants? Vessik, of all people, breaks the ice, by asking about the paintings in the corridor outside and listening to the answer for twenty minutes."],
      ["Win their trust", "A setback first: a journalist publishes a story that the visitors have come to strip the planet's moons, and a crowd gathers outside the station. Then a breakthrough, from somewhere no one expected. At a shared meal, sh'Vari tells the story of the first time Andorians and humans met, and how badly it went, and how it was mended. And the delegates' oldest scholar leans forward and tells of {strange}, part of their own history, and the room changes."],
      ["Answer their question", "Then they ask the question every first contact comes to, sooner or later. The minister puts it plainly. \"What does joining cost us? And what happens if we say no?\""],
    ],
    choice: { title: "The offer", text: "Their council votes tomorrow. The minister wants an answer tonight.\n\nThe honest answer is long and not entirely welcome: the Federation has rules, the road to membership takes years, and they would have to change things they may not want to change. The easier answer is the Federation's help, now, with the details to be sorted later. It would carry the vote. It isn't the captain's to give.",
      options: [
        { id: "honest", name: "The honest answer", blurb: "Slower, but true: +1 accord with {world}, +1 commendation.", how: "First contact made honestly: the long road explained.", fx: { accord: 1, commendations: 1 }, text: "The captain gives them all of it: the rules, the years, the things that would have to change. The minister listens without expression. The council debates until dawn, and the vote, when it comes, is to keep talking. Not to join. To keep talking. sh'Vari calls it a better result than a yes." },
        { id: "promise", name: "Promise them help", blurb: "+2 accord now; Starfleet Command marks a box for promises it didn't authorize.", how: "First contact made with promises Starfleet hadn't authorized.", fx: { accord: 2, command: 1 }, text: "The promise carries the vote by a landslide. There is singing in the streets of the capital that night. Starfleet Command's reply arrives two days later, short and very cold: those were not the captain's promises to make, and now someone else will have to keep them." },
      ] },
    fail: "Someone else reached {world} first. The Federation will be the second voice they hear, and second voices are always easier to ignore.",
  },
  "Escort a diplomatic delegation": {
    type: "Diplomatic",
    reason: "These talks would open trade along the sector's spinward worlds. Someone has threatened the delegation, and Starfleet won't let a threat decide the sector's future.",
    why: "These talks would close a corridor the Orion diggers use to reach Makers' sites. Someone wants the corridor kept open, badly enough to stop the delegation.",
    thread: "The spy's masters pay for Makers' artifacts by the gram. The transmitter's address leads to an Orion broker who sells to Klingons.",
    keys: ["Neris Vole|an aide nobody remembers hiring", "Jory Tamsin|a journalist who talked their way aboard", "Aren Teresh|the ambassador's estranged son", "Silas Oduya|a translator with very good references"],
    strange: ["a sealed diplomatic pouch", "a gift no one will open", "a treaty draft with a missing page", "an heirloom both sides claim"],
    brief: "Ambassador Teresh and her delegation are bound for talks at {world}, and someone has made it clear they shouldn't arrive. Get them there, alive and on time.",
    arrive: "Ambassador Teresh comes aboard with eleven diplomats, a great deal too much luggage, and {key}: not on the manifest. The ambassador waves the discrepancy away. \"Mine. I vouch for them.\"\n\nReyes, watching the luggage go past on anti-grav sleds, says nothing, which is how the captain knows she has a great deal to say.",
    steps: [
      ["Keep them safe en route", "Halfway to {world}, Rrinn's ears come up. \"Sensor ghost, Captain. Aft, port side. Running dark.\" It's there and not there: a ship with its engines damped down to nothing, keeping pace, close enough to watch. It doesn't answer hails. When the shields come up, it peels away into the dark. Someone knew exactly where the delegation would be."],
      ["Deliver them to the talks", "The delegation reaches {world} on time, and the talks open in a hall of carved stone with all the ceremony the ambassador could want. And that night Rrinn finds it, in a case in the ambassador's own luggage: a transmitter, smaller than a fingernail, sending the delegation's position to someone outside the system, every hour on the hour."],
    ],
    choice: { title: "The transmitter", text: "The transmitter was planted by someone inside the delegation. Expose it now, and the talks may collapse in recrimination before they've begun. Keep it quiet, and Rrinn can turn it: feed the listeners false positions, let them chase shadows, and trace where the signal goes.",
      options: [
        { id: "expose", name: "Expose it", blurb: "The truth, whatever it costs the talks: +1 commendation; −1 accord with {world}.", how: "The delegation delivered; a spy among them exposed.", fx: { commendations: 1, accord: -1 }, text: "The captain lays the transmitter on the conference table in front of everyone. It belongs to {key}. The hall erupts; the talks stall for a full day while every delegation accuses every other. When they resume, they're colder, and slower, but they're honest, and the ambassador thanks the captain in a voice that makes clear she'll never forgive it." },
        { id: "use", name: "Use it", blurb: "Feed them false positions quietly: +1 accord; +4 science from what Rrinn traces.", how: "The delegation delivered; a spy's transmitter quietly turned.", fx: { accord: 1, science: 4 }, text: "For a week the listeners chase the delegation's ghost across half the sector while the real talks go well in the carved stone hall. Rrinn traces the signal hop by hop to its source and files the address for Starfleet Intelligence with a small, satisfied flick of her tail." },
      ] },
    fail: "The delegation never reached {world}. The talks were cancelled, and somewhere, someone got exactly what they wanted.",
  },
  "Find a missing ship or outpost": {
    type: "Rescue",
    reason: "Fourteen people are missing. Starfleet doesn't leave its own behind.",
    why: "The Arkwright was charting Makers' sites for Starfleet when it vanished. What took it may be what Corvan II's caretaker was protecting the Ketari from.",
    thread: "The Arkwright's crew all dreamed the same dream: a ring of light, and a voice counting down. The Makers left more than caretakers.",
    keys: ["Marcus Hale|the Arkwright's captain's husband", "Bel Rennick|a freighter pilot who passed them on the way out", "Dr. Pell Annix|the survey's reckless sponsor", "Lio Santos|an old friend of one of the crew"],
    strange: ["a non-corporeal life form", "a nebula that dreams", "a subspace anomaly that distorts time", "a cloud of light that sings"],
    brief: "The survey ship Arkwright stopped reporting near {world} nine days ago: fourteen crew, no distress call, no debris. {key} was the last to speak to them.",
    arrive: "Near {world}, the Pelion's sensors find it: a faint ion trail, nine days cold, leading away into a region where {strange} has been reported. Rrinn plays the Arkwright's last log entry on the bridge speakers. The captain's voice, tired, ordinary, then wondering: \"Sensors are picking up something off the port bow. It's... it's beautiful.\"\n\nThen nothing. Fourteen people, and the last word any of them said was \"beautiful\".",
    steps: [
      ["Pick up the trail", "The ion trail bends. Impossibly: no helmsman would fly a course like it, curves that waste fuel and gain nothing, as if the Arkwright had been steered by something outside her, gently, toward somewhere. Rrinn follows the bends the way a hunter follows tracks, nose almost touching her console, and the Pelion follows Rrinn."],
      ["Find the ship", "And there she is: the Arkwright, intact, every light on, drifting slow in the heart of {strange}. No damage. No distress. Fourteen life signs aboard, all steady, all asleep. Vessik reads the biosigns three times. \"They're dreaming,\" he says. \"All of them. The same rhythm. As if they were all dreaming the same thing.\""],
      ["Wake the crew", "Vessik brings the first of them round in the Arkwright's sickbay: the navigator, who sits up, blinks, and asks what day it is. Nine days, he's told. He doesn't believe it. None of them remember anything after the word \"beautiful\". And when Vessik asks, carefully, each of them describes the same dream."],
    ],
    choice: { title: "The dream", text: "The Arkwright's crew are safe and coming home. Sevek wants to stay: whatever {strange} is, it reached into fourteen human minds and gave them the same dream. That's a discovery of the first order. Grath wants to be very far away from it, as fast as warp will carry them, and says so in terms that strain the bridge's tolerance.",
      options: [
        { id: "study", name: "Study it", blurb: "+10 science; Vessik will be watching the crew closely.", how: "The Arkwright found and her crew woken; the phenomenon studied.", fx: { science: 10 }, text: "Sevek's study fills three data cores. For a week afterwards, half the Pelion's crew wake at night from the same dream, a dream none of them can quite describe in the morning. Vessik is worried. Sevek is fascinated. And then, slowly, the dream fades, and leaves only the data, and a question nobody can answer." },
        { id: "leave", name: "Get everyone out", blurb: "+1 commendation, +4 science from what's already recorded.", how: "The Arkwright found and her crew brought home.", fx: { commendations: 1, science: 4 }, text: "The Pelion tows the Arkwright clear and doesn't look back. Fourteen families get the call they've been praying for. The navigator sends the captain a message from Starbase 23: he still has the dream sometimes, he says. He doesn't mind it. It's beautiful." },
      ] },
    fail: "The Arkwright is still out there, drifting, dreaming. The search is called off, and fourteen families stop waiting by the comm.",
  },
  "Deliver urgent medical supplies": {
    type: "Rescue",
    reason: "An outbreak with no name, and the only stock of the retroviral in the sector is aboard the Pelion.",
    why: "The fever broke out downriver of a dig site where Orions sold the locals 'ancient medicine'. Starfleet suspects it came out of a disturbed Makers' cache.",
    thread: "The contaminant is a Makers' preservative: the same compound that kept the Corvan II scientists asleep. Someone is opening their stores.",
    keys: ["Dr. Imani Okafor|a former Starfleet surgeon", "Dr. Teo Marsh|an exhausted young doctor in charge for a week", "Dr. Hesk Ulan|an elderly physician who has seen this fever before", "Dr. Ruth Calder|a brilliant, reckless epidemiologist"],
    strange: ["an unlicensed agricultural mutagen", "Orion spice with a contaminant", "ice from a comet no one had tested", "fertilizer from an unregistered supplier"],
    brief: "An outbreak on {world}: a fever their doctors can't name, spreading faster each day. The Pelion carries the only stock of a broad-spectrum retroviral in the sector.",
    arrive: "{world}'s capital is under quarantine. From orbit the streets are empty and still; the only movement is the ambulances. The away team beams down into a hospital courtyard full of cots.\n\nTheir chief physician, {key}, meets them at the transporter pad with hollow eyes and a single question, before any greeting: \"How much did you bring?\"\n\nVessik, who has seen a great deal in his life, looks at the courtyard and answers gently: \"Enough to start.\"",
    steps: [
      ["Distribute the supplies", "Vessik and the medical teams work through two days and a night without stopping. The retroviral slows the fever: the cots stop filling quite so fast, and some of the earliest cases sit up and ask for water. It doesn't stop it. On the third morning Vessik, grey with tiredness, tells the captain plainly: \"We're buying time. We're not winning.\""],
      ["Find the cause", "Reyes and Sevek trace it, house by house, street by street, back to a single water treatment plant. The plant's logs show a delivery a week before the first case: {strange}, signed for by a night shift supervisor who has since died of the fever. It wasn't a natural outbreak. Someone poisoned the water, by carelessness or by design."],
    ],
    choice: { title: "The cure", text: "Vessik can synthesize a true cure from the samples. But the base compound is rare, and there's only enough for one place: {world}, where the fever is at its peak, or the colony next door, where the first cases appeared this morning and could be stopped before they spread.\n\n{key} doesn't ask. Just looks at the captain, across a courtyard of cots.",
      options: [
        { id: "stay", name: "Cure {world} first", blurb: "+2 accord with {world}; the next colony will have to wait for Starfleet Medical.", how: "The outbreak on {world} cured; the cause found.", fx: { accord: 2, heal: 1 }, text: "The cure goes into {world}'s water within a day, and the fever breaks within a week. The courtyard empties, cot by cot. {key} names the hospital's new wing after the Pelion's doctor, which Vessik pretends to find embarrassing and keeps a holo of on his desk. The colony next door waits for Starfleet Medical, and waits, and lives." },
        { id: "split", name: "Split it, and send for more", blurb: "+1 commendation, +4 science; both outbreaks slowed, neither cured yet.", how: "The outbreak slowed on two worlds; Starfleet Medical called in.", fx: { commendations: 1, science: 4 }, text: "Half a cure for each world, and a priority call to Starfleet Medical. It's the right call, and the slower one: both outbreaks slowed, neither stopped, for three long weeks. Vessik doesn't sleep. When the Medical ships finally arrive, he hands over his notes, goes to his quarters, and is not seen for two days." },
      ] },
    fail: "The supplies arrive too late for {world}. The fever has run its course, and the count is grim, and {key} doesn't come to the transporter pad this time.",
  },
  "Evacuate a colony": {
    type: "Rescue",
    reason: "Twelve hundred colonists and a star that won't wait. Every hour counts.",
    why: "The colony's star began to flare the week an Orion crew was seen at a Makers' ruin on its outer moon. If they took the machine that steadied the star, more stars may follow.",
    thread: "The outer moon's ruin is empty: whatever steadied the star was cut out and carried off. The cutting tools match the ones on Corvan II.",
    keys: ["Hal Brandt|who built the colony with his own hands", "Sela Moro|up for re-election in a month", "Jonah Price|who has survived three flares", "Anya Kestrel|who has a secret reason to stay"],
    strange: ["a field of glass flowers that sing at dawn", "a ruin older than any known civilization", "a spring whose water heals", "an ancient machine that still works"],
    brief: "{world}'s star is flaring, months ahead of every prediction. The colony has days, not months: twelve hundred people, three transports, and a governor who doesn't believe the readings: {key}.",
    arrive: "The flare's first wave has already come and gone. {world}'s northern hemisphere is scorched brown, its forests smoking. In the south, the colony's three transports sit on their pads, half loaded, and the colonists stand around them in the strange, slow way people move when they don't believe what's happening.\n\nThe governor, {key}, is waiting at the landing field. \"Starfleet tells me my star is going to kill us,\" the governor says. \"My own instruments say it'll settle. Show me why I should believe you.\"",
    steps: [
      ["Convince the governor", "Sevek doesn't argue. He puts his projections on every public screen in the colony at once: the star's curve, the next flare's arrival, the temperature at ground level, minute by minute, until it reaches a number that doesn't need explaining. The governor watches it twice. Then turns and gives the order, and the colony starts to move."],
      ["Load the transports", "Twelve hundred people, and the things they can't bear to leave: a seed vault, the work of thirty years; a hospital's worth of equipment; a colony library; and {strange}, which the colonists swear is the reason they came to this world at all. Reyes runs the loading like a battle, and nobody argues with her twice."],
      ["Get them clear", "The transports lift as the second wave hits. The sky goes white. The Pelion puts herself between the flare and the transports, shields screaming, and Grath on the comm: \"Shields at forty percent! Thirty! Captain, whatever you're going to do, do it now!\" The transports clear the atmosphere. The shields hold. Just."],
    ],
    choice: { title: "The last transport", text: "There's room for one more trip. On the ground: the colony's seed vault, thirty years of work, the thing that would let them start again anywhere. And forty colonists who refused to leave until the last moment, standing at the landing field now, waving, begging to be taken.\n\nThe next wave is eleven minutes out. The shuttles could try for both. They might not come back.",
      options: [
        { id: "people", name: "The people", blurb: "Every colonist safe: +2 commendations; the colony starts again from nothing.", how: "Every colonist evacuated before the flare.", fx: { commendations: 2 }, text: "Every last colonist makes it off {world}. The seed vault burns with everything else, thirty years of work gone in an afternoon. At the refugee camp on Starbase 23, the governor finds the captain and shakes their hand for a long time without saying anything. Twelve hundred people, and every one of them alive." },
        { id: "vault", name: "Both: the shuttles go back", blurb: "Risk the shuttles for both: +1 commendation, +10 supplies from what's saved; a shuttle crew is hurt.", how: "The colony evacuated, its seed vault saved by a last shuttle run.", fx: { commendations: 1, supplies: 10, hurt: 1 }, text: "The shuttles go back down through the flare's leading edge. They come back scorched black, with the vault and all forty colonists aboard, and one pilot carried out of the shuttle bay on a stretcher. Vessik says the pilot will live. The colony will start again, with its seeds and its people, and a name to add to the founders' wall." },
      ] },
    fail: "The flare reached {world} before the transports cleared. Not everyone got out. The colony's name goes on a list at Starfleet Command, and the captain's goes beside it.",
  },
  "Patrol the Neutral Zone border": {
    type: "Security",
    reason: "The border outposts haven't seen a starship in months, and the Romulans notice when no one is watching. Show the flag.",
    why: "Romulan ships have been seen near three Makers' sites in a month. Starfleet wants to know what the Romulans know.",
    thread: "The Romulan ship was mapping shield frequencies, and something else: the bearings of every Makers' site on this side of the Zone.",
    keys: ["Commander Ilse Varga|who hasn't slept in a week", "Lieutenant Pip Doyle|in charge since the commander fell ill", "Commander Soren|a Vulcan, unimpressed by everything", "Lieutenant Commander Aiko Rhee|twenty years on the line"],
    strange: ["a ghost ship seen crossing the Zone", "lights in the Zone where there are no stars", "a Romulan buoy that wasn't there last week", "a signal repeating a crew member's name"],
    brief: "Romulan ships have been sighted along the Neutral Zone: a patrol is overdue. Show the flag, watch the border, and don't start a war.",
    arrive: "{world} is a cluster of sensor dishes bolted to an asteroid, turning slowly on the edge of the Romulan Neutral Zone, and the six people who staff it haven't seen a starship in four months. The post's commanding officer, {key}, meets the captain at the airlock with coffee that tastes of the asteroid, and a story about {strange}.\n\n\"And there's a gap,\" {key} adds. \"In our coverage. Twelve degrees of the Zone we can't hear. It wasn't there last month. Something's sitting in it, and I think it's listening to us.\"",
    steps: [
      ["Sweep the border", "Rrinn takes the sweep herself, ears forward, eyes half closed. For an hour, nothing but the hiss of the Zone. Then her tail goes still. \"There. Holding station on the Zone's edge, close enough to watch every post on the line. Cloaked. It's breathing, Captain. Its engines, I mean. Very quietly.\""],
      ["Find out why", "Sevek cross-references the gap in the post's coverage with the contact's position, and his eyebrow goes up a very small distance, which for Sevek is alarm. \"It is mapping the shield frequencies of every listening post on the line, Captain. Methodically. One by one. The only reason to want those frequencies is to be able to pass through the shields when the time comes.\""],
    ],
    choice: { title: "The watcher", text: "The Romulan ship hasn't crossed the line, quite. It's sitting on it, cloaked, collecting the means to make the line meaningless.\n\nsh'Vari wants to hail it and tell it plainly that it's been seen. Sevek suggests something quieter: retune every post's shields the moment it leaves, and let it carry useless data home.",
      options: [
        { id: "hail", name: "Hail it", blurb: "Let them know they've been seen: +1 commendation. The Romulans don't forget being caught.", how: "The border patrolled; a Romulan watcher challenged and sent home.", fx: { commendations: 1 }, text: "The bird-of-prey decloaks long enough for its commander to appear on the viewscreen, look at the captain for a long, measuring moment, and say nothing at all. The screen goes dark. The contact turns for home. On the listening post, six people breathe out together, and {key} pours the captain another cup of terrible coffee." },
        { id: "shadow", needs: "inverter", name: "Shadow it home", blurb: "Only with the cloak inverter: follow it, unseen, all the way to the Zone, and record everything. +10 science, +1 commendation.", how: "The border patrolled; a cloaked Romulan ship shadowed home by the inverter.", fx: { science: 10, commendations: 1 }, text: "For two days the Pelion follows a ship that believes it's invisible, the cloak inverter painting it on the main viewer like a ghost. Its course, its patrol pattern, the frequency it reports home on: all of it goes to Starfleet Intelligence. The Romulans never know. Rrinn names the ghost, privately, and won't tell anyone what she called it." },
        { id: "retune", name: "Retune the shields", blurb: "Let them leave with bad data: +6 science, and the outposts are safer for it.", how: "The border patrolled; a Romulan spy sent home with bad data.", fx: { science: 6 }, text: "Every post on the line changes its shield frequencies the moment the Romulan ship turns for home. Months of patient work, and the bird-of-prey carries home nothing but noise. The Romulans will never know when it happened. {key} sends the Pelion a crate of the asteroid coffee by way of thanks. Grath uses it to clean plasma conduits." },
      ] },
    fail: "The patrol never happened. Whatever was sitting in the gap in {world}'s coverage has finished listening, and gone home with everything it came for.",
  },
  "Recover a lost probe or artifact": {
    type: "Exploration",
    reason: "The probe's logs hold three years of deep-space survey data, and whoever reaches the wreck first owns them.",
    why: "The probe went down near a Makers' site, carrying a piece of whatever it found. A Klingon house and an Orion broker both want it.",
    thread: "The fragment carries a star chart: the Makers' sites in the Corvan Sector, and lines between them that all point to one place.",
    keys: ["Davo Seln|an Orion trader with a very fast ship", "Merrick|a salvage broker who asks no questions", "Jessa Vane|a former Starfleet officer gone rogue", "Ostrander|a collector of curiosities with deep pockets"],
    strange: ["a derelict of an unknown design", "a living crystal", "a fragment of a dead civilization's beacon", "a shard of a hull no one built"],
    brief: "A Federation deep-space probe went down near {world} carrying sensor logs from beyond the sector's edge, and something it was never meant to find: {strange}. Recover it before anyone else does.",
    arrive: "The probe's beacon is still pinging from {world}'s debris field, faint and steady, a lost child calling home. And the Pelion isn't the only ship listening. Holding station on the far side of the field is a ship with no registry, no transponder, and weapons ports that have been very carefully painted over.\n\nIt hails first: {key}, smiling. \"Captain! What a coincidence. I was just about to pick that up myself.\"",
    steps: [
      ["Find it in the debris", "The probe has buried itself in a tumbling asteroid, its casing cracked open like an egg. The away team suits up and goes in on tethers, Grath swearing steadily in Tellarite the whole way down. Something inside the probe is still powered. It isn't the probe's own reactor; that died months ago. Something else is keeping it warm."],
      ["Get it aboard", "Grath's people cut it free and the tractor beam draws it in. As it crosses the cargo bay threshold, every light in the bay dims, just for a second, and Grath steps back from it with an expression the captain has never seen on him before. \"It took power from the ship,\" he says. \"Just a sip. Like it was thirsty.\""],
      ["Find out what it found", "Sevek reads the probe's logs in the cargo bay with the lights low. Three years of deep-space survey, ordinary, routine, and then the last month: {strange}, beyond the sector's edge. The probe studied it, the way probes do. And then, against every line of its programming, it brought a piece of it home."],
    ],
    choice: { title: "The fragment", text: "{key} makes an offer over subspace, generous and friendly and entirely without questions: a great deal of money for the fragment, delivered anywhere the captain likes. Grath does a quick sum and the number would refit half the ship.\n\nStarfleet wants the whole thing sealed and sent to a research station, under guard, and no questions asked of Starfleet either.",
      options: [
        { id: "starfleet", name: "Send it to Starfleet", blurb: "+8 science, +1 commendation.", how: "The probe recovered and sent to Starfleet under seal.", fx: { science: 8, commendations: 1 }, text: "The probe goes to Starbase 23's labs under a Starfleet seal and a security detail. {key} watches it go from the far side of the debris field, makes a note of the Pelion's registry with every appearance of goodwill, and leaves. Sevek has a feeling they will meet again, and Vulcans don't have feelings." },
        { id: "sell", name: "Take the money", blurb: "+20 supplies; Starfleet Command marks a box.", how: "The probe recovered, and its fragment sold.", fx: { supplies: 20, command: 1 }, text: "The money is very good. The transfer is very quiet. And three weeks later Starfleet's inquiry arrives, very thorough indeed, with a list of questions about where the fragment went that the captain can't answer, because {key} never said." },
      ] },
    fail: "Someone else reached the probe first. Its logs, and whatever it carried home from beyond the edge, are in other hands now, and nobody at Starfleet knows whose.",
  },
  "Mediate a dispute between two worlds": {
    type: "Diplomatic",
    reason: "Two independent worlds are a week from war, and a war on the frontier draws in everyone, the Klingons first.",
    why: "The moon they're fighting over holds a Makers' machine in its mines. War would put it up for sale to whoever helps the winner.",
    thread: "Under the mines is a Makers' relay, still transmitting toward the same point in space as all the others.",
    keys: ["Ambassador Lena Corvo|an idealistic Federation ambassador", "Brask|the moon's own mining guild boss", "Arbiter Syl|a Vulcan sent to observe", "Juno Hatch|a retired admiral who brokered the last truce"],
    strange: ["a seam of pure dilithium", "an ancient machine that still works", "fossils of their shared ancestors", "a crystal that stores memories"],
    brief: "{world} and its neighbour are a week from war over a mining moon that orbits between them. Both have asked the Federation to mediate; neither trusts it.",
    arrive: "The talks are held aboard the Pelion, the only neutral ground in the {world} system. The two delegations beam aboard within a minute of each other, and refuse to share a turbolift. In the briefing room they sit at opposite ends of the table and talk only to the captain, never to each other, as if the other side were weather.\n\n{key} sits with neither, takes notes, and says almost nothing, which sh'Vari finds suspicious and Vessik finds restful.",
    steps: [
      ["Get them to the table", "The first session lasts eleven minutes before one delegation walks out. The second lasts an hour. By the third, they're arguing about the moon itself instead of about each other's grandparents, and Vessik, observing from the corner, counts it as remarkable progress. \"They're shouting at the same thing now,\" he tells the captain. \"That's practically a treaty.\""],
      ["Find the real grievance", "It comes out late at night, over drinks neither side admits to enjoying. The moon isn't the problem. Both sides sent survey teams into its mines last year, and both found {strange} deep in the rock. Neither can bear the other having it. Neither can bear to tell the other they found it."],
      ["Find common ground", "Sevek finds the answer in the survey data, and lays it on the table without ceremony. Neither world can reach it alone: one has the drilling technology, the other has the only route down that doesn't collapse. Together, they could. Separately, they'll fight a war over something neither can touch. The room goes very quiet."],
    ],
    choice: { title: "The settlement", text: "A settlement is close enough to touch. The captain can propose a shared mining treaty under Federation supervision, binding, slow, and likely to last. Or let them divide the moon down the middle, each to their own half, and keep the Federation out of it entirely: quick, popular, and fragile.",
      options: [
        { id: "treaty", name: "A shared treaty", blurb: "+2 accord with {world}; the Federation is in the middle of it for years.", how: "War averted: a shared mining treaty under Federation supervision.", fx: { accord: 2 }, text: "The treaty is signed in the Pelion's briefing room at three in the morning, both delegations too tired to argue about the pens. It will take a Federation office on the moon and a decade of patience. It will hold. Before they beam home, the two lead negotiators share a turbolift, and Reyes swears she heard one of them laugh." },
        { id: "divide", name: "Divide the moon", blurb: "+1 commendation, +6 supplies in thanks; they'll be back at each other's throats someday.", how: "War averted: the moon divided between them.", fx: { commendations: 1, supplies: 6 }, text: "A line drawn down the middle of a moon, and two delegations who never have to speak to each other again. Both send gifts to the Pelion: fine wine from one, finer wine from the other, as if even that were a contest. Neither expects the line to last. sh'Vari gives it five years." },
      ] },
    fail: "The talks failed. {world} and its neighbour are at war over a moon, and the first casualties are already being counted.",
  },
  "Test experimental technology": {
    type: "Technology",
    reason: "Starfleet R&D needs field trials before the prototype goes fleetwide, and the Pelion is the only Heavy Cruiser on this frontier.",
    why: "Starfleet R&D built the prototype from what the Pelion learned at Corvan II: a way to see through a Makers' field, and through a cloak.",
    thread: "At full power the prototype sees a Klingon ship trailing the Pelion, cloaked, for weeks: House Kor'vath is following the Pelion to the Makers' sites.",
    keys: ["Dr. Pell Annix|a brilliant, reckless scientist", "Dr. Liss Aranne|a Daystrom Institute prodigy", "Lieutenant Teo Brackett|who designed the prototype in a weekend", "Commander Ida Vosk|of Starfleet R&D, with a deadline"],
    strange: ["a cloaked ship that shouldn't be there", "a hidden Orion cache", "a ships' graveyard nobody charted", "a signal repeating a crew member's name"],
    brief: "Starfleet R&D has a prototype for the Pelion to test near {world}: a sensor-cloak inverter, built by {key}, that should let a starship see through a cloak. It hasn't been tested outside a lab.",
    arrive: "{key} beams aboard with the prototype in three crates, and a manner that suggests the Pelion should be grateful for the honour. Grath takes one look inside the first crate, at the wiring, and asks in a dangerously quiet voice who signed off on this.\n\n\"I did,\" {key} says.\n\n\"Of course you did,\" says Grath.",
    steps: [
      ["Install it", "The prototype goes into the sensor array over Grath's objections, which are many and detailed. The first power-up blows every fuse on deck seven and sets off the fire alarms in the crew lounge. The second one works. Grath declares this a coincidence and refuses to discuss it further."],
      ["Run the trials", "It works. Against a cloaked training drone, a target the Pelion's own sensors couldn't find in a week, the inverter finds it in four seconds. There's a cheer on the bridge. Then it finds {strange}, which nobody was looking for, and the cheering stops."],
      ["Push it to the limit", "At full power the inverter sees through a cloak at three light-years, an achievement that will rewrite Starfleet's tactics manuals. It is also running eleven degrees hotter than its own specifications, and climbing, and {key} won't say what happens if it keeps climbing."],
    ],
    choice: { title: "The prototype", text: "The trials are a success. {key} wants one more run: a full hour at full power, to prove beyond argument what the inverter can do. \"The data,\" {key} says, \"would be definitive.\"\n\nGrath wants it shut down and crated before it melts the sensor array and takes the ship's eyes with it. \"Definitive,\" he says, \"is what they'll write on our hull.\"",
      options: [
        { id: "push", name: "One more run", blurb: "+12 science; the sensors take a box of damage. R&D leaves a field unit fitted, tuned by the full-power run: +2 to sensor sweeps, and sweeps reach 5 light-years instead of 3.", how: "The prototype tested to its limit; a tuned field unit left fitted to the Pelion.", fx: { science: 12, sensors: 1, inverter: 2 }, text: "An hour at full power, the sensor array glowing faintly through the hull plating. The most complete data set Starfleet R&D has ever seen. The array smokes for a day afterwards. When the smoke clears, {key} leaves a field unit wired into the Pelion's sensors, tuned by everything that hour taught them, and for once says thank you to Grath, who doesn't know where to look." },
        { id: "shut", name: "Shut it down", blurb: "+6 science, +1 commendation; the array is safe. R&D leaves a field unit fitted: +2 to sensor sweeps.", how: "The prototype tested and safely returned; a field unit left fitted to the Pelion.", fx: { science: 6, commendations: 1, inverter: 1 }, text: "Grath crates the prototype himself, gently, the way you'd put away something that bit you. {key} sulks all the way back to Starbase 23. A week later R&D sends a thank-you note addressed to the chief engineer, and a field unit for the Pelion's sensors: a smaller, safer cloak inverter. Grath fits it personally and won't let anyone else touch it." },
      ] },
    fail: "The trials never happened. R&D will find another ship and another schedule, and the Pelion will go on not seeing what's cloaked.",
  },
  "Ferry a delegation to a world that left the Federation": {
    type: "Diplomatic",
    reason: "They left because the Federation failed them. Starfleet wants the chance to make it right, and they've asked for the Pelion by name.",
    why: "The disaster that drove them out of the Federation began when a Makers' machine on their moon failed. They want answers Starfleet has only just started to find.",
    thread: "Their machine didn't fail: it was switched off, from a distance, by a signal from the same point every Makers' relay points to.",
    keys: ["First Minister Calla Ren|who lost family in the disaster", "Oren Fask|a former Federation liaison who resigned in protest", "Ama Quill|the spaceport's director", "Elder Moor|who voted to leave"],
    strange: ["a Klingon raid that held every ship nearby", "an ion storm that grounded the relief fleet", "a priority order to protect a Federation ambassador", "a misfiled distress call"],
    brief: "{world} left the Federation two years ago, after a disaster Starfleet was too slow to answer. Now they've asked for a delegation to talk about coming back, and they've asked for the Pelion by name.",
    arrive: "The welcome at {world} is formal and cold. The spaceport still bears the scorch marks of the disaster that drove them out of the Federation, unrepaired, as if kept that way on purpose for exactly this moment. There are no flags. There's no band.\n\n{key} meets the delegation at the foot of the ramp and doesn't offer a hand. \"You asked to talk,\" {key} says. \"So talk.\"",
    steps: [
      ["Hear their grievance", "They want to be heard first, and the delegation lets them. For a whole day in a cold council hall they tell it: the disaster, the eleven days of calls for help, the people they lost while they waited for a Federation that didn't come. Names. Faces. A child's drawing passed hand to hand. Nobody from the Pelion speaks. Vessik, at the back, doesn't take his eyes off the speakers once."],
      ["Answer it", "Then the delegation answers, with Starfleet's own records, unredacted. Why help was slow: {strange}, and a decision made far above the Pelion, by people who will never come to {world}. It isn't an excuse, and the delegation doesn't offer it as one. It's the truth. The hall is silent when they finish."],
      ["Ask them back", "Their council meets through the night. In the morning they give their answer: they will consider returning. But first they want something the Federation finds very hard to give. An apology, in Starfleet's name, on the record, spoken here."],
    ],
    choice: { title: "The apology", text: "The delegation can give the apology, here, in Starfleet's name, which it isn't authorized to do. Or it can offer what it can honestly give: a promise to carry their grievance to Starfleet Command in person, and to stand beside it when it's heard.",
      options: [
        { id: "apologize", name: "Apologize, on the record", blurb: "+2 accord with {world}; Starfleet Command marks a box.", how: "The delegation delivered; Starfleet's apology given, unauthorized.", fx: { accord: 2, command: 1 }, text: "The apology is given on the spaceport apron, in front of the scorch marks, in front of everyone. Half the crowd weeps. {key} doesn't, but nods once, slowly, and at last offers a hand. Starfleet Command's reply to the captain is short, and not pleased, and the captain reads it, and puts it away, and does not regret a word." },
        { id: "carry", name: "Carry it to Starfleet", blurb: "+1 accord, +1 commendation.", how: "The delegation delivered; their grievance carried to Starfleet.", fx: { accord: 1, commendations: 1 }, text: "It isn't what they asked for, and the disappointment in the hall is a physical thing. But {key} walks the captain to the transporter afterwards and says, quietly: \"I believe you'll carry it. That's more than we had yesterday.\" It's a start." },
      ] },
    fail: "The delegation never reached {world}. Its people will remember that, too, on the scorched apron where nobody came.",
  },
  "Shore leave that goes wrong": {
    type: "Crew",
    reason: "The crew have earned a week's liberty. Starfleet only asks that they come back on time and in one piece.",
    why: "Starfleet only meant this as shore leave, but the 'carnival of illusions' is powered by something an Orion sold the owners, and two of the crew walked into it.",
    thread: "The carnival's illusions run on a Makers' machine, bought from Orions who said there were many more where it came from.",
    keys: ["Magistrate Oona Pell|the local magistrate", "Guildmaster Dray|of the market guild", "Mistress Vey|who owns the gaming house", "Constable Haro Finch|of the colony constabulary"],
    strange: ["a carnival of illusions", "a pleasure garden that grants wishes", "a casino where time runs slow", "a hall of mirrors that shows other lives"],
    brief: "Shore leave at {world}, at last: a week's liberty for the crew. Starfleet only asks that the Pelion's people come back on time and in one piece. {strange} is the local attraction.",
    arrive: "Shore leave at {world}, at last: a week's liberty, warm air, food that didn't come out of a replicator. The crew scatters across the pleasure districts like children let out of school.\n\nBy the second evening, six of them haven't checked in. And {key} is at the transporter station, asking for the captain, with an expression that suggests the week is about to get longer.",
    steps: [
      ["Find the missing crew", "Four of the six turn up within the hour, in a card room, sheepish and broke, with a magistrate's fine to be paid for a disagreement about what the rules of the game actually were. The other two are somewhere {strange} leads, and nobody who's gone in after them has come out with a straight story."],
      ["Bring them home", "Reyes brings the last two out herself, one under each arm: dazed, delighted, and with no memory of the last day at all. And one of them has something in his pocket he shouldn't: a carved figurine, very old, which {key} says was stolen from a shrine, and which he swears was a gift from someone he can't describe."],
    ],
    choice: { title: "The stolen thing", text: "{key} wants the crewman handed over to local justice: local law is local law. The crewman, white-faced, swears it was a gift. Starfleet looks after its own, and the captain could deal with him under Starfleet discipline instead. Either way, someone is going to feel betrayed.",
      options: [
        { id: "local", name: "Hand them over", blurb: "Respect local law: +1 accord with {world}; the crewman faces a local court.", how: "Shore leave sorted out under local law.", fx: { accord: 1 }, text: "The magistrate turns out to be fair, the fine is paid, and the crewman spends three days sweeping the shrine he's accused of robbing. On the third day the shrine's keeper brings him tea. {world} remembers that the Pelion played by its rules, and the crewman comes back aboard oddly at peace." },
        { id: "ship", name: "Starfleet handles it", blurb: "+1 commendation; the locals aren't happy.", how: "Shore leave sorted out under Starfleet discipline.", fx: { commendations: 1, accord: -1 }, text: "The crewman faces a captain's mast instead, and the figurine is returned with a formal apology. {key} calls it Starfleet arrogance, loudly and at length, in public, and the story follows the Pelion around the sector for months." },
      ] },
    fail: "Shore leave ended badly, and late, and with two crew members still unaccounted for until the very last day. The incident report is longer than the liberty was.",
  },
  "Carry a message across the Neutral Zone": {
    type: "Security",
    reason: "A message that can't go by subspace, to a contact who will only talk to a starship. Starfleet won't say what's in it.",
    why: "A Romulan officer has warned Starfleet that the Romulan Star Empire is searching for the Makers' Gate too. This is the reply.",
    thread: "The Romulan reply: the Gate is real, it's in the Corvan Sector, and the Klingons are close to finding it.",
    keys: ["Admiral Rhys Caldwell|with sealed orders", "Lieutenant Sabine Aube|an admiral's intelligence aide", "Ambassador Tomas Rhee|who once served on the Romulan border", "Ambassador Sorvek|a Vulcan diplomat with old Romulan contacts"],
    strange: ["a Romulan weapon test planned near the Zone", "a coup brewing in the Romulan Senate", "a plague on a Romulan colony world", "a fleet massing behind the Zone"],
    brief: "A sealed message for a Romulan contact on the far side of the Zone, near {world}. Crossing is an act of war if they catch you; Starfleet will deny sending you. {key} wrote the message.",
    arrive: "The Zone's edge on the viewer: nothing. Empty space, stars, the faint glitter of a marker buoy. It looks like any other piece of the sky, and every officer on the bridge has been trained since the Academy to fear it.\n\nThe message is sealed in a case on the captain's ready-room desk. {key} wrote it, and Starfleet will deny sending it. Somewhere on the far side of that empty space, a contact is waiting who will only talk to the Pelion.",
    steps: [
      ["Cross unseen", "Running dark: lights low, voices low, sensors passive, the Pelion slides across the line like a held breath. Twice the hull rings, faintly, with a Romulan sensor sweep passing close. The second time, nobody on the bridge breathes for eleven seconds. Rrinn counts them under her breath. Twice, it passes."],
      ["Deliver the message", "The contact is a Romulan officer, alone in a small ship with a damaged cloak, frightened and very brave. The meeting is in the Pelion's transporter room, because the officer won't come further in. The message changes hands. The reply is a warning about {strange}, and it is worse than anything Starfleet feared."],
    ],
    choice: { title: "The defector", text: "The Romulan officer asks, quietly, to come back with the Pelion. Taking them means risking discovery on the way out, and an act the Romulans will answer. It also means an intelligence prize beyond price. Leaving them means they'll be dead within a month, and everyone in the transporter room knows it.",
      options: [
        { id: "take", name: "Bring them out", blurb: "+12 science from what they know, +1 commendation; the Romulans will answer: a bird-of-prey crosses the Zone to strike a Federation world.", how: "The message delivered, and a Romulan officer brought out.", fx: { science: 12, commendations: 1, romulan: 1 }, text: "The run back to the line is the longest hour of the tour. Three Romulan ships sweep the space the Pelion has just left. The line passes beneath them, and they're across, and someone on the bridge laughs out loud from sheer relief. The Pelion makes it home with one passenger more than the manifest says. Somewhere behind them, the Romulans are already deciding how to answer." },
        { id: "leave", name: "Deliver and go", blurb: "+1 commendation; the officer stays behind.", how: "The message delivered across the Zone.", fx: { commendations: 1 }, text: "The Pelion slips back across the line as quietly as it came. The officer watches it go from the small ship with the damaged cloak, and lifts one hand. Nobody on the bridge says anything for a long time. Rrinn's ears stay flat all the way home." },
      ] },
    fail: "The message was never delivered. Whatever it warned about will come without warning now.",
  },
};
/** A story's text with the order's details filled in. */
export function storyText(S, o, text) {
  const world = o.place || (o.sys ? S.systems[o.sys].name : "the border");
  // A key character is "Name|who they are": introduced in full the first time in a scene, by name after that. The
  // introduction is set off with commas ("Dr. Liss Aranne, a Daystrom Institute prodigy, wants...").
  const [kname, kdesc] = (o.key || "a stranger").split("|");
  let first = true;
  return text.replace(/\{world\}/g, world).replace(/\{key\}(?=(.?))/g, (m, next) => {
    if (!kdesc) return kname.replace(/^A /, "a ").replace(/^An /, "an ");
    if (!first) return kname;
    first = false;
    return `${kname}, ${kdesc}` + (/^[\s\w"]/.test(next || "") && next !== "" ? "," : "");
  })
    .replace(/\{strange\}/g, (o.strange || "something strange").replace(/^A /, "a ").replace(/^An /, "an ").replace(/^The /, "the ")).replace(/\{captain\}/g, S.captain || "the captain")
    .replace(/(^|[.!?]\s+|\n\s*)([a-z])(?!h')/g, (m, p, c) => p + c.toUpperCase());
}
export const storyOf = (o) => (o && o.story ? STORIES[o.story] : null);


// ---------- second stories ----------
// Every kind of order has two stories, and a tour never tells the same one twice. These are the second ones; `mission`
// names the kind of order each belongs to. Each story has a name of its own, shown in the order's title.
const FIRST_NAMES = {
  "Answer a distress call": "The Calloway's Pride", "Survey an uncharted system": "The ticking star", "Make first contact": "The first warp ship",
  "Escort a diplomatic delegation": "Ambassador Teresh", "Find a missing ship or outpost": "The Arkwright", "Deliver urgent medical supplies": "The nameless fever",
  "Evacuate a colony": "The flaring star", "Patrol the Neutral Zone border": "The gap in the coverage", "Recover a lost probe or artifact": "The thirsty probe",
  "Mediate a dispute between two worlds": "The contested moon", "Test experimental technology": "The cloak inverter", "Ferry a delegation to a world that left the Federation": "The scorched spaceport",
  "Shore leave that goes wrong": "The carnival", "Carry a message across the Neutral Zone": "The sealed message", "The Makers' Gate": "The Makers' Gate",
};
for (const [k, n] of Object.entries(FIRST_NAMES)) if (STORIES[k]) { STORIES[k].name = n; STORIES[k].mission = k; }
Object.assign(STORIES, {
  "Answer a distress call#2": {
    mission: "Answer a distress call", name: "The singing mine", type: "Rescue",
    reason: "A mining colony's call for help, from deep underground: thirty miners trapped by a cave-in, and air for four days.",
    why: "The mine broke into a sealed chamber the day before the collapse. The miners' last report describes a hum in the rock, and a machine. Starfleet wants the miners out, and wants to know what they found.",
    thread: "The chamber the miners broke into held a caretaker, still asleep. Its carrier wave matches Corvan II's exactly. The diggers will want this one, and now they know where it is.",
    keys: ["Foreman Agda Hollis|who refused to leave her crew below", "Kemal Arsen|the mine's young geologist", "Brother Tuck|the colony's chaplain, and its only doctor", "Raina Voss|the mining company's representative"],
    strange: ["a hum in the rock that the miners call the song", "a chamber walled in metal no one can scratch", "lights in the deep tunnels that move against the air", "a seam of crystal that grows back overnight"],
    brief: "{world}'s mining colony calls for help: a cave-in at the deep face, thirty miners trapped two kilometres down, air for four days. Their rescue equipment is buried with them.",
    arrive: "{world}'s mining town clings to the side of a canyon, its lights all on in the middle of the day, its people gathered at the pithead in silence. {key} meets the away team at the lift cage, filthy, hoarse, and furious at the rock.\n\n\"They broke into something the day before,\" {key} says. \"A chamber. Sealed. And it's been humming ever since. The men call it {strange}. Then the roof came down.\"\n\nGrath puts his palm flat on the cage wall and frowns. \"I can feel it,\" he says. \"In the steel.\"",
    steps: [
      ["Reach the trapped miners", "The transporter can't lock through two kilometres of ore, so they go down the old way: lift cage, then ladders, then hands and knees through a crawlway Reyes widens with a phaser on low, a few centimetres at a time. At the bottom, behind a wall of fallen rock, someone is tapping. Three short, three long, three short. Over and over."],
      ["Bring them up", "Grath shores the roof with a forcefield he swears is not rated for this, and they bring the miners out one at a time, through the crawlway, up the ladders, into the light. Thirty go in. Thirty come up. The last one out is the youngest, and on the pithead she turns and looks back down the shaft, and says what all of them say: the hum stopped when the roof came down. As if it had been waiting."],
    ],
    choice: { title: "The chamber", text: "The miners are safe. Behind them, two kilometres down, the chamber is still there, sealed again by the collapse, and whatever is in it has gone quiet.\n\n{key} wants it sealed for good: the colony has had enough of the deep face. Sevek wants a sensor drone sent down before the rock settles, while there's still a way in. \"We may not get another chance,\" he says. \"Nor may it.\"",
      options: [
        { id: "seal", name: "Seal the deep face", blurb: "The colony's wish: +1 accord with {world}, +1 commendation.", how: "Thirty miners rescued; the deep face sealed.", fx: { accord: 1, commendations: 1 }, text: "The colony brings the deep face down with its own charges, deliberately, and holds a service at the pithead afterwards for the thing it never saw. {key} shakes the captain's hand. \"Some things should stay buried,\" {key} says. Sevek, behind the captain, says nothing at all." },
        { id: "drone", name: "Send the drone down", blurb: "+10 science; the colony isn't pleased.", how: "Thirty miners rescued; the deep chamber surveyed.", fx: { science: 10, accord: -1 }, text: "The drone goes down through the crawlway on its own and finds the chamber: walls of metal no tool can scratch, and at its heart a shape asleep, still faintly warm. The data fills a core. Up at the pithead, the colonists watch the drone come back out of the dark, and some of them make signs against bad luck." },
      ] },
    fail: "The rescue came too late. The tapping stopped on the fourth day, and the colony sealed the deep face with the miners still behind it.",
  },
  "Survey an uncharted system#2": {
    mission: "Survey an uncharted system", name: "The garden world", type: "Exploration",
    reason: "A planet on long-range sensors with a breathable atmosphere and no recorded survey, three light-years from the nearest colony. If it's what it looks like, it could be the sector's next home.",
    why: "The planet's ecology is too perfect: tended, Sevek thinks, for a very long time. The Makers tended worlds. Starfleet wants to know if this was one of them, before the diggers do.",
    thread: "Under the garden world's oldest forest, the roots grow around a buried shape: a caretaker, its watch long finished, the garden it kept still growing. The Makers didn't only watch peoples. They grew worlds.",
    keys: ["Dr. Hana Ito|a xenobotanist who has waited her whole career for this", "Ensign Bo Daly|the youngest of the survey team", "Dr. Osei Brandt|a terraforming engineer with plans", "Elin Sorrow|a colony scout from the nearest settlement"],
    strange: ["trees that turn to follow the away team", "a meadow where every flower is the same age", "a river that runs uphill for a kilometre", "birdsong in a pattern Sevek can't stop counting"],
    brief: "A world at {world} with a breathable atmosphere, oceans, forests, and no survey on record. It could be the best colony site in the sector. It could also be something else.",
    arrive: "The planet turns below the Pelion green and blue and perfect, and something about the perfection makes the bridge uneasy. \"No volcanoes,\" Sevek says. \"No deserts. No storms of any size. Every forest at the same stage of growth.\" He looks up. \"Worlds are not this tidy, Captain.\"\n\n{key} is already at the transporter room door, field kit packed, practically vibrating.",
    steps: [
      ["Walk the garden", "The away team beams into a meadow and stands for a long moment just breathing. The air smells of rain and something sweet. Then Reyes notices it: {strange}. Nobody says anything for a while after that, and nobody touches anything they don't have to."],
      ["Read its history", "Sevek takes core samples from a hillside, and the layers tell a story that makes him sit down on the grass. Ten thousand years of stillness. Before that, chaos: ash, flood, a dead world. And between them, a single layer, a hand's width thick, where everything changed at once."],
      ["Find the gardener", "Under the oldest forest, where the roots go deepest, the tricorders find it: a buried shape, metal and very old, the roots grown all around it like hands. It isn't awake. It isn't dead. Its work, Sevek says quietly, appears to be finished. The garden simply goes on growing."],
    ],
    choice: { title: "The garden's future", text: "It's the finest colony site in the sector, and Starfleet will want it. {key} is already drafting the report.\n\nBut it was made, and someone made it for a reason, and Vessik puts the question everyone is avoiding: \"Whose garden is it?\" The captain can recommend it for settlement, or recommend that it be left exactly as it is.",
      options: [
        { id: "settle", name: "Recommend it for settlement", blurb: "+8 supplies' worth of survey contracts, +6 science; the garden will change.", how: "The garden world surveyed and recommended for settlement.", fx: { supplies: 8, science: 6 }, text: "The report goes in with a recommendation, and within a year the first colony ships are on their way. {key} goes with them. The colonists will build carefully, Starfleet promises. The garden will be changed by it anyway. Sevek files a separate note about the shape under the forest, marked: do not disturb." },
        { id: "preserve", name: "Leave it as it is", blurb: "+2 commendations, +6 science; the sector loses a colony site.", how: "The garden world surveyed and left as it was made.", fx: { commendations: 2, science: 6 }, text: "The captain recommends the world be left untouched, a preserve, studied from orbit only, and Starfleet, a little to everyone's surprise, agrees. {key} is bitterly disappointed. Years later, someone will find that the garden world is the only one in the sector that never suffered a single bad harvest, and wonder why." },
      ] },
    fail: "The survey never happened. The garden world waits, unnamed, for whoever comes next, and what they'll want from it.",
  },
  "Make first contact#2": {
    mission: "Make first contact", name: "The listeners", type: "Diplomatic",
    reason: "A signal from {world}: a pre-warp people who have been listening to Federation subspace traffic for years, and have finally worked out how to answer.",
    why: "The listeners learned to hear subspace from a machine they dug up in their northern hills. Starfleet wants contact made before anyone else learns what they've been listening with.",
    thread: "The listeners' machine is a Makers' caretaker, cracked open by their scientists and wired, ingeniously, into their radio telescopes. It still remembers who made it. It has been listening for them.",
    keys: ["Dr. Iru Mak|the scientist who built their transmitter", "Old Senna|who first heard the voices in the static", "Colonel Brach|their military, and suspicious of all of it", "Archivist Pell Oru|keeper of a decade of recordings"],
    strange: ["a machine their scientists dug from the northern hills", "a voice in the static that answered back once", "star charts in their oldest temple that match Federation ones", "a decade of recorded Federation traffic, every word"],
    brief: "A signal from {world}: a people without warp drive who have been listening to Federation subspace traffic for ten years, and have taught themselves how to reply. Their message is short. \"We have heard you. Will you hear us?\"",
    arrive: "The signal comes from a valley full of radio dishes, hundreds of them, hand-built, every one pointed at the sky. When the Pelion answers, the whole valley lights up.\n\nSpeaker Anan Teve speaks for them, in careful, perfect Federation Standard, learned entirely from subspace traffic and old news broadcasts, with {key} at the speaker's side. \"We know your songs,\" the speaker says. \"We know your wars. We know the names of your starships. We have been waiting a very long time to know you.\"",
    steps: [
      ["Answer their call", "The first conversation lasts nine hours. They know astonishing things: ship names, admirals, the scores of Federation sporting events a decade old. And they've misunderstood almost all of it. Vessik spends an hour gently explaining that a famous serial drama is not, in fact, a historical record. They take it well."],
      ["Learn how they listened", "They show the away team how they did it, proudly: {strange}, wired into their radio telescopes by their own scientists. Sevek examines it for a long time, and when he steps back his face is even more composed than usual, which is how the captain knows he is shaken."],
      ["Face their question", "Their council has one question, and it's not the one Starfleet expected. They don't ask what joining costs. They ask whether the Federation will let them keep what they found, or take it away from them, as every story they've overheard says the strong always do."],
    ],
    choice: { title: "What they found", text: "Their machine is far older than they are, and far more than they know. Starfleet's standing orders say artifacts like it are to be secured. The listeners built their whole new age around it.\n\nThe captain can ask them to give it into Federation keeping, safely, or promise them it stays theirs, with all the risk that brings.",
      options: [
        { id: "theirs", name: "It stays theirs", blurb: "+2 accord with {world}, +1 commendation; the machine stays where anyone can find it.", how: "First contact made; the listeners keep what they found.", fx: { accord: 2, commendations: 1 }, text: "The valley of dishes erupts in light and noise, every dish blinking at once, which {key} explains is how they cheer. The machine stays in their northern hills. Reyes quietly recommends a Starfleet watch on the system, and gets it." },
        { id: "keep", name: "Ask to keep it safe", blurb: "+12 science; they agree, but they'll remember being asked.", how: "First contact made; the listeners' machine given into Federation keeping.", fx: { science: 12, accord: -1 }, text: "They agree. It's clear they think it's the price of friendship, and clear it costs them. The machine leaves their hills under Starfleet guard, and {key} watches it go with an expression the captain will remember for a long time." },
      ] },
    fail: "Nobody answered the listeners. They went on listening, for a while. Then their dishes went quiet, one by one.",
  },
  "Escort a diplomatic delegation#2": {
    mission: "Escort a diplomatic delegation", name: "The heir", type: "Diplomatic",
    reason: "The heir to {world}'s throne is travelling to a summit that could bring her world into the Federation's orbit. There have been two attempts on her life this month.",
    why: "The heir's assassins were paid in dilithium through an Orion broker: the same channel the diggers use. Someone doesn't want {world} looking to the Federation, and Starfleet wants to know who.",
    thread: "The would-be assassin had a map in his boots: three Makers' sites near {world}, two of them already crossed off. The diggers didn't want the heir dead for politics. They wanted the summit to fail, so no one would be watching those hills.",
    keys: ["Lord Chancellor Vey|the heir's advisor, very protective", "Captain Arno Fell|commander of her personal guard", "Mira Tolland|the heir's lady-in-waiting, and her oldest friend", "Brother Anselm|the heir's tutor since she was six"],
    strange: ["a poison that doesn't show up on tricorders", "a gift box that hums when no one is near it", "a guard who appears on no roster", "a message in a code nobody aboard has seen"],
    brief: "The heir to {world}'s throne is bound for a summit, and needs a ride that nobody can intercept. Two attempts on her life this month. The Pelion is the safest ship in the sector, and everyone knows it.",
    arrive: "Princess Ilyse comes aboard with {key}, a guard of twelve, a wardrobe of forty trunks, and an expression of resigned boredom that lasts exactly until she sees the bridge. Then she asks sh'Vari eleven questions about the helm in a row, and sh'Vari, who has no patience for royalty, answers every one.\n\nReyes reviews the guard roster and the trunk manifest and comes to the captain afterwards. \"Something's off,\" she says. \"I don't know what yet.\"",
    steps: [
      ["Keep her safe en route", "Two days out, Vessik catches it: {strange}, in the heir's evening meal. She'd eaten two bites. Vessik works for an hour and she lives, and is furious, and then, alone with the captain, frightened. \"It's someone on this ship,\" she says. \"Isn't it?\""],
      ["Deliver her to the summit", "Reyes runs the trap herself, with the heir's blessing. A rumour that the princess will walk the arboretum alone at midnight; a figure in the shadows with a blade; Reyes, already there. It's one of the heir's own guards. He doesn't say who paid him. He doesn't have to: there's a dilithium chit in his boot."],
    ],
    choice: { title: "The guard", text: "The heir arrives at the summit alive. The would-be assassin is in the Pelion's brig. Princess Ilyse, and {key} with her, want him handed to {world}'s justice, which is swift and not merciful. The Federation can hold him instead, and find out who paid him, slowly, properly.",
      options: [
        { id: "hand", name: "Hand him to {world}", blurb: "Their law, their decision: +2 accord with {world}.", how: "The heir delivered safely; her would-be assassin handed to her people.", fx: { accord: 2 }, text: "The guard goes down to {world} in chains, and the heir watches him go without expression. At the summit, she speaks of the Federation with a warmth that surprises everyone, and the talks go better than anyone hoped. Nobody ever finds out who paid the guard." },
        { id: "hold", name: "The Federation holds him", blurb: "+8 science from what he gives up, +1 commendation; {world} feels slighted.", how: "The heir delivered safely; her would-be assassin held for questioning.", fx: { science: 8, commendations: 1, accord: -1 }, text: "The guard stays in the brig. Under questioning, slowly, he gives up the broker, the channel, the dilithium, and a name that makes Starfleet Intelligence very interested indeed. {key} is coldly polite about it at the summit, and doesn't send the Pelion a farewell." },
      ] },
    fail: "The heir never reached the summit. Whoever paid for that got their money's worth.",
  },
  "Find a missing ship or outpost#2": {
    mission: "Find a missing ship or outpost", name: "The silent station", type: "Rescue",
    reason: "A Federation relay station near {world} has stopped answering: a crew of nine, and the only subspace link for the colonies spinward.",
    why: "The relay's last message was a sensor log: a ship approaching with no transponder, and a reading the relay's computer classified as a Makers' carrier wave. Then silence.",
    thread: "The relay's attackers weren't after the relay. They wanted its sensor logs: eleven years of readings, which show the bearing of every Makers' carrier wave the station ever picked up. The diggers have a map now.",
    keys: ["Chief Lia Doran|the relay's chief, who sent the last log", "Ensign Paulo Reis|the youngest of the nine", "Torvald Henk|a supply pilot who was due to dock that week", "Dr. Ama Seth|the station's medical officer"],
    strange: ["a sensor log that ends mid-sentence", "a docking clamp cut through from outside", "nine coffee cups, all still half full", "a message scratched into a bulkhead: THEY WANTED THE LOGS"],
    brief: "The relay station near {world} has stopped answering. Nine crew, and the only subspace link for the colonies spinward. Its last transmission was a sensor log that ends mid-sentence.",
    arrive: "The relay hangs in the dark, lights on, every system green, and silent. No answer on any frequency. Its docking clamps have been cut through from outside.\n\nRrinn plays the last log on the bridge, in the voice of {key}: calm, professional. \"Unidentified vessel on approach, no transponder. Their hull's reading a carrier wave I've never... wait. They're...\" Then the log ends.",
    steps: [
      ["Board the station", "The boarding party goes in with phasers drawn and finds no one: {strange}, nine bunks, every personal effect in its place. The station's main computer has been opened, carefully, by someone who knew exactly what they were looking for. They took the sensor archives. They left everything else."],
      ["Follow the trail", "Rrinn finds the attackers' ion wake, and finds something else in it: an escape pod's beacon, faint, three hexes off. Inside, alive, frozen half to death, are four of the nine. They saw the attackers' faces. Orions, they say. And one who wasn't: a Klingon, standing back, giving orders."],
      ["Find the rest", "The other five are on a barren moon two systems away, left in an emergency shelter with three days' air and no transmitter. Reyes gets them out with a day to spare. They're the first witnesses anyone has found alive, and every one of them wants to talk."],
    ],
    choice: { title: "The relay", text: "All nine are alive. The relay is intact but compromised: whoever took its archives knows its codes, its frequencies, its blind spots. Grath can rebuild its security from scratch, which will take the Pelion a week. Or the station can be left as it is and watched, in case they come back for more.",
      options: [
        { id: "rebuild", name: "Rebuild it", blurb: "+1 commendation, +6 supplies from the grateful colonies; a week of Grath's time.", how: "The relay's crew rescued and the station rebuilt.", fx: { commendations: 1, supplies: 6 }, text: "Grath rebuilds the relay's security from the ground up, cursing its original designers in detail, and the spinward colonies come back on the network a week later to a flood of grateful messages. {key} stays on as chief. The new codes are Grath's. Nobody will be getting in again." },
        { id: "watch", name: "Leave it as bait", blurb: "+10 science from what comes back; a risk to the relay.", how: "The relay's crew rescued; the station left as bait.", fx: { science: 10 }, text: "The relay goes back on line with its old codes, and Rrinn sets a listening post a light-year off. Three weeks later, someone tries the old codes again. The listening post records everything: the ship, its heading, the voice that gives the order. It's Klingon." },
      ] },
    fail: "Nobody reached the relay in time. When Starfleet does, the station is empty, and so is the moon two systems away.",
  },
  "Deliver urgent medical supplies#2": {
    mission: "Deliver urgent medical supplies", name: "The sleeping town", type: "Rescue",
    reason: "A whole town on {world} has fallen asleep: four hundred people, and no one can wake them. Their doctor called for help before she went under too.",
    why: "The town sits on a hillside above a Makers' ruin. The sleep is the same one that held the Corvan II scientists: someone has been digging, and something below has woken.",
    thread: "Under the town's hill, the diggers cut too close to a caretaker and woke it. It did what it was made to do: it protected the town from them, the only way it knew. It put everyone to sleep.",
    keys: ["Dr. Rhea Vance|the town's doctor, who called for help", "Mayor Tobin Ash|asleep at his desk", "Pell Garrow|a trader who arrived after it happened", "Lena Quist|a child who woke on her own"],
    strange: ["a hum from under the hill", "a sleep that looks exactly like stasis", "dreams that every sleeper shares", "a child who woke up and remembers a voice"],
    brief: "Four hundred people on {world} have fallen asleep and can't be woken. The town's doctor called for help before she went under too. The Pelion carries the sector's best medical team.",
    arrive: "The town is beautiful and quiet: flowers in window boxes, a market with its stalls still open, and everywhere people asleep. In chairs, on benches, at the market stalls, in the street where they lay down. Breathing slowly. Smiling, some of them.\n\nAnd in the middle of the square, sitting cross-legged beside her sleeping mother, a single small girl wide awake: {key}. \"They're dreaming,\" she tells Vessik, very seriously. \"I woke up. I didn't like it.\"",
    steps: [
      ["Keep them alive", "Four hundred sleepers need water, warmth, turning. Vessik turns the town hall into a ward and the away team into nurses, and they work in shifts round the clock. The sleepers' bodies are slowed almost to stillness: {strange}. Vessik has seen it once before, in the reports from Corvan II."],
      ["Find the cause", "The girl leads them to it: a door in the hillside behind the town, newly cut, with Orion cutting tools abandoned in the mud outside. Beyond it, a tunnel going down, and a hum. Someone dug in here, and something woke, and put everyone to sleep to keep them safe."],
    ],
    choice: { title: "The thing in the hill", text: "Sevek can reach the caretaker and reason with it: the diggers are gone, the town is safe, it can let them wake. It'll take time, and the sleepers are weakening. Or Grath can cut its power, now, and they'll wake at once, and the hill will have no watcher any more.",
      options: [
        { id: "reason", name: "Talk to it", blurb: "Slower, but the hill keeps its watcher: +1 commendation, +8 science.", how: "The sleeping town woken; its watcher reasoned with.", fx: { commendations: 1, science: 8 }, text: "Sevek sits in the hum for two days, talking quietly to the dark. On the third morning, the town wakes all at once, stretching, confused, a little rested. The hill goes quiet, but not dead. {key} tells everyone that the voice said goodbye to her. Nobody quite believes her except Sevek." },
        { id: "cut", name: "Cut its power", blurb: "They wake at once: +2 accord with {world}; the hill's watcher is gone.", how: "The sleeping town woken; its watcher shut down.", fx: { accord: 2 }, text: "Grath cuts the power, and the hum stops, and up in the town four hundred people wake at the same moment with a single gasp. They're grateful. They're whole. And the hill is just a hill now, which is what the diggers wanted all along." },
      ] },
    fail: "Help came too late. The town sleeps on, and fewer of its people breathe every day.",
  },
  "Evacuate a colony#2": {
    mission: "Evacuate a colony", name: "The sinking island", type: "Rescue",
    reason: "{world}'s island colony is sinking: the seabed beneath it has started to slip, and the sea is coming in faster every day. Twelve hundred people, and a single harbour.",
    why: "The island's seabed was stable for ten thousand years, until the diggers cut a Makers' anchor out of the reef. Starfleet wants the colony out, and wants to know what was holding the island up.",
    thread: "The island was held up by a caretaker in the reef, keeping the seabed still. The diggers cut it out a month ago. The colony is sinking because the thing that watched over it is gone.",
    keys: ["Harbourmaster Ines Keel|who has run the harbour for thirty years", "Councillor Abe Ruiz|who wants to save the town hall first", "Old Marta Fenn|who was born on the island and won't leave", "Lieutenant Kit Moro|of the colony's tiny security force"],
    strange: ["a reef that glowed at night until a month ago", "tides that have stopped keeping time", "fish that left the reef all at once", "a hollow in the reef where something was cut out"],
    brief: "{world}'s island colony is sinking. The seabed has started to slip; the sea is coming in faster every day. Twelve hundred people, one harbour, and boats for a third of them.",
    arrive: "From orbit you can see it: the island tilted, its southern streets already under grey water, waves breaking where gardens were. The harbour is jammed with every boat the colony owns, and people standing on the quay, waiting, looking at the sea.\n\n{key} is in the harbour office with a chart and a slide rule and a face like stone. \"Four days,\" {key} says. \"Maybe three. The sea doesn't care what the experts say.\"",
    steps: [
      ["Organize the colony", "Reyes divides the town into districts, the districts into boat-loads, the boat-loads into a timetable, and pins it to every door. People argue. People always argue. Then the sea comes in another street's width overnight, and the arguing stops."],
      ["Move the people", "Boats out, shuttles down, the Pelion's transporters running hot. Grath swears that the pattern buffers are not rated for this many cycles, and runs them anyway, for thirty hours straight. The island empties street by street, and the sea fills it behind them."],
      ["Find the last ones", "The last few are the hardest: the ones who won't go. {key} finds most of them. One old woman refuses until Vessik sits down beside her on her doorstep, with the sea at the step, and talks to her about her garden for an hour, and then carries her bag down to the boat himself."],
    ],
    choice: { title: "The reef", text: "Everyone is off the island. And Sevek has found out why it sank: a hollow in the reef, where something was cut out a month ago. The thing that held the seabed still. Something else might still be done. Grath thinks the Pelion's tractor beam could hold the seabed for a few months while the colony salvages what it can. It would tie the ship up for weeks.",
      options: [
        { id: "salvage", name: "Hold the island while they salvage", blurb: "+12 supplies, +2 accord with {world}; it costs the Pelion two weeks on every other order.", how: "The island evacuated, and held up long enough to salvage it.", fx: { supplies: 12, accord: 2, delay: 2 }, text: "For two weeks the Pelion hangs over the island with its tractor beam locked on the seabed, Grath sleeping in engineering, while the colonists go back and take everything they can carry: the town hall's records, the school's books, the harbour's bell. On the last day, the beam lets go, and the island goes down into the grey sea, slowly, with dignity." },
        { id: "let", name: "Let it go", blurb: "+1 commendation; the island sinks with everything on it.", how: "The island evacuated before it sank.", fx: { commendations: 1 }, text: "The island goes down three days later, faster than anyone expected, with everything still on it. The colonists watch from the boats. Then they turn toward the mainland, and the work of starting over, and {key} rings the harbour bell one last time from the deck of the last boat." },
      ] },
    fail: "The sea came faster than the boats. The island is gone, and not everyone left it.",
  },
  "Patrol the Neutral Zone border#2": {
    mission: "Patrol the Neutral Zone border", name: "The drifting buoy", type: "Security",
    reason: "A Romulan marker buoy has drifted across the Neutral Zone into Federation space near {world}. By treaty, neither side may touch the other's buoys. It's broadcasting.",
    why: "The buoy's broadcast is a list of coordinates. Sevek recognizes them: Makers' sites, on both sides of the Zone. The Romulans are hunting them too.",
    thread: "The Romulan buoy was mapping Makers' carrier waves, on both sides of the Zone. The Romulans have found sites of their own, and some of them have been dug up too, by someone who isn't Romulan.",
    keys: ["Commander Ilse Varga|who hasn't slept in a week", "Lieutenant Pip Doyle|in charge since the commander fell ill", "Commander Soren|a Vulcan, unimpressed by everything", "Lieutenant Commander Aiko Rhee|twenty years on the line"],
    strange: ["a buoy that broadcasts on a frequency no buoy uses", "coordinates repeated in a loop, every eleven seconds", "a Romulan sentry ship that watches but doesn't approach", "a second, fainter signal underneath the first"],
    brief: "A Romulan marker buoy has drifted across the Neutral Zone near {world}. Neither side may touch the other's buoys; touching it could be an act of war. Leaving it means listening to whatever it's saying.",
    arrive: "The buoy turns slowly in Federation space, a black spike a few metres long with a Romulan bird painted on its side. {key} has been watching it for three days from the listening post. \"It isn't drifting,\" {key} says. \"It's holding position. And it's broadcasting {strange}.\"\n\nOn the far side of the Zone, sitting very still, a Romulan sentry ship watches the Pelion arrive.",
    steps: [
      ["Read the buoy", "Rrinn listens for six hours and decodes it: coordinates, dozens of them, on both sides of the Zone. Sevek lays them on the chart and goes very still. \"Captain. These are the Makers' sites. Some I recognize. Many I do not. These are on the Romulan side.\""],
      ["Face the sentry", "The Romulan sentry ship hails, for the first time anyone at the post can remember. Its commander is courteous, and precise, and makes it clear that the buoy is Romulan property, and that the Pelion will not touch it, and that the commander would very much regret having to make that point any other way."],
    ],
    choice: { title: "The buoy", text: "The buoy holds a Romulan map of Makers' sites the Federation has never seen. Copying its data in full would mean touching it: a treaty violation. Leaving it means the Romulans keep their map and the Federation keeps the peace.\n\nThe Romulan commander is watching.",
      options: [
        { id: "copy", name: "Copy its data", blurb: "+12 science, the Romulans' map; a Romulan reprisal against the listening posts.", how: "The Neutral Zone patrolled; a Romulan buoy's map copied.", fx: { science: 12, romulan: 1 }, text: "Grath makes the link in eleven seconds, and the buoy's memory is the Pelion's. The Romulan commander's hail comes a minute later, quite calm, and says only: \"Noted.\" The sentry ship turns and goes. Everyone at the listening post knows what \"noted\" means." },
        { id: "leave", name: "Leave it alone", blurb: "+1 commendation; the Romulans keep their map.", how: "The Neutral Zone patrolled; a Romulan buoy left untouched.", fx: { commendations: 1 }, text: "The captain hails the Romulan commander and says, politely, that the buoy appears to have drifted, and that the Federation wouldn't dream of touching it. A pause. \"Of course,\" the commander says. The buoy is gone by morning. So is the sentry. {key} pours the captain a cup of the asteroid coffee in silent respect." },
      ] },
    fail: "The patrol never came. The buoy finished broadcasting, and went home.",
  },
  "Recover a lost probe or artifact#2": {
    mission: "Recover a lost probe or artifact", name: "The museum's missing piece", type: "Exploration",
    reason: "A shipment from the Federation Archaeological Council went missing near {world}: one crate, on a freighter that arrived without it. The Council wants it back.",
    why: "The missing crate held a Makers' tablet, found on a dig thirty years ago and never deciphered. It's turned up for sale on an Orion market. Someone knows what it's for.",
    thread: "The tablet is a Makers' key: a pattern that tells a caretaker who's allowed near it. The diggers have been using copies to walk past the machines' defences. That's how they cut them out without waking them.",
    keys: ["Curator Aldo Finch|of the Archaeological Council", "Tib Rolle|the freighter's cargo master", "Dr. Ana Kaur|who found the tablet thirty years ago", "Archivist Jun Bell|who packed the crate"],
    strange: ["a tablet covered in a script no one can read", "a crate whose seals were opened and resealed", "an auction listing in an Orion market", "a pattern on the tablet that matches the Corvan II caretaker's carvings"],
    brief: "One crate from the Archaeological Council, gone missing between {world} and Starbase 23. The freighter arrived. The crate didn't. It has turned up for sale on an Orion market.",
    arrive: "The freighter's cargo hold is spotless, and the crate's empty berth has fresh scratches on the clamps. {key} wrings their hands. \"Thirty years in the Council's archive and nobody gave it a second look. And then someone steals it the very first time we move it.\"\n\nRrinn already has the auction listing up: {strange}. Bids close in four days.",
    steps: [
      ["Find the seller", "The listing traces to an Orion trading post in an asteroid field near {world}, the kind of place that changes its name every month. Reyes goes in under cover, as a buyer. She's very good at it, which nobody on the bridge comments on."],
      ["Get it back", "The dealer has three buyers bidding, and one of them is a Klingon, standing very still at the back of the room. Reyes outbids them all with Federation credit she doesn't have, and gets the tablet out before anyone checks."],
      ["Read the tablet", "Sevek works on it for two nights. On the third morning he has it: the tablet isn't writing. It's a pattern. A key, he thinks. The pattern a caretaker reads to know who's allowed near it. Anyone carrying a copy could walk right past one."],
    ],
    choice: { title: "The key", text: "The tablet is a key to the Makers' machines, and the diggers have almost certainly copied it already. Returned to the Archaeological Council, it goes back in a drawer. Sevek could study it aboard the Pelion instead, and learn how to block it, which would mean keeping it from its rightful owners.",
      options: [
        { id: "return", name: "Return it to the Council", blurb: "+1 commendation, +4 supplies in thanks.", how: "The Council's tablet recovered and returned.", fx: { commendations: 1, supplies: 4 }, text: "The tablet goes back to the Council under guard, and {key} weeps a little, holding it. Sevek sends the Council a long, careful letter about what it is. They put it in a better drawer." },
        { id: "study", name: "Keep it to study", blurb: "+12 science; the Council files a complaint.", how: "The Council's tablet recovered and kept for study.", fx: { science: 12, command: 1 }, text: "Sevek keeps the tablet in the science lab, and in a month he understands it well enough to know how a caretaker could be taught to refuse it. The Council files a formal complaint, and Starfleet Command sides with the Council, and Sevek doesn't regret a moment of it." },
      ] },
    fail: "The auction closed without the Pelion. The tablet went to the highest bidder, and the highest bidder was standing at the back of the room.",
  },
  "Mediate a dispute between two worlds#2": {
    mission: "Mediate a dispute between two worlds", name: "The water treaty", type: "Diplomatic",
    reason: "{world} and its twin share a single ice comet that waters them both. It's running out, and each world says the other is taking more than its share.",
    why: "The comet's ice holds a Makers' relay, frozen in its heart. Both worlds have found it, and both think it's theirs, and the diggers would buy it from whichever one wins.",
    thread: "Frozen in the comet's heart is a Makers' relay, still transmitting toward the same point as all the others. Someone has already been out to the comet. There are drill holes in the ice.",
    keys: ["Speaker Olun Breck|for the near world", "Speaker Ama Tessaly|for the far world", "Chief Hydrologist Teo Vance|who has the numbers", "Judge Ilka Morrow|retired, called back to witness"],
    strange: ["a comet whose orbit never decays", "ice that is warmer at the core than the surface", "drill holes in the ice that neither world made", "a signal from the comet's heart, very faint"],
    brief: "{world} and its twin share one comet: every few years it passes close and they each take their water from it. This year it's running short, each says the other is stealing, and both have armed their mining ships.",
    arrive: "The comet hangs between the two worlds, a white smudge trailing its tail, and around it, nose to nose, two fleets of armed ice-haulers. {key} meets the captain on the comet's surface, of all places: the only ground both sides will stand on.\n\n\"We have taken water from this ice for nine hundred years,\" {key} says. \"In fair shares. Until now.\"",
    steps: [
      ["Separate the fleets", "sh'Vari puts the Pelion between the two fleets, close enough to scrape paint, and keeps it there. Neither side wants to be the one to fire past a Federation starship. It isn't peace. It's room to talk."],
      ["Count the water", "The hydrologist's numbers don't add up, and neither do anyone else's. Sevek finds out why: neither world is stealing. Someone else has drilled into the comet: {strange}. The water's been taken from below."],
      ["Find what's inside", "And under the drill holes, in the comet's heart, Sevek's sensors find what the drillers were after: a relay, frozen in the ice, still transmitting. Both worlds knew it was there. Neither told the other."],
    ],
    choice: { title: "The water", text: "Both worlds are short of water and neither is to blame. The captain can propose they share what's left equally and jointly guard the comet. Or that the Federation takes over the comet's management, and the relay with it, and supplies both worlds fairly.",
      options: [
        { id: "share", name: "Share and guard it together", blurb: "+2 accord with {world}; the relay stays in the ice.", how: "The water dispute settled: a shared, guarded comet.", fx: { accord: 2 }, text: "The two speakers sign the new treaty on the comet's surface, standing in the snow. Their fleets turn their guns outward together for the first time in a generation, toward whoever comes to drill next. {key} keeps the pen." },
        { id: "federation", name: "Federation stewardship", blurb: "+10 science from the relay, +1 commendation; both worlds lose a little pride.", how: "The water dispute settled under Federation stewardship.", fx: { science: 10, commendations: 1, accord: -1 }, text: "Starfleet takes the comet into its keeping, and the relay with it. Both worlds get their water, measured and fair, and both resent it a little, the way you resent a referee. Sevek gets the relay. He considers it a good trade." },
      ] },
    fail: "The talks broke down. The haulers fired. Both worlds are thirstier now, and angrier.",
  },
  "Test experimental technology#2": {
    mission: "Test experimental technology", name: "The shield harmonics", type: "Technology",
    reason: "Starfleet R&D has a new shield emitter design: stronger, faster to recover, and built from principles nobody fully understands yet. It needs a starship's power to test.",
    why: "The emitter's design came from studying the field around the Corvan II caretaker. R&D wants to know if Makers' technology can protect a starship. So, Starfleet suspects, do the people taking the machines apart.",
    thread: "The harmonics match the field around every Makers' site: it's how the caretakers protected themselves. Whoever is taking them apart has been learning to build them. House Kor'vath's ships may soon carry Makers' shields.",
    keys: ["Dr. Ruth Calder|of Starfleet R&D, who designed it", "Chief Yanni Pell|an engineer who's installed it twice before", "Commander Ida Vosk|of Starfleet R&D, with a deadline", "Dr. Pell Annix|a brilliant, reckless scientist"],
    strange: ["a shield that sings when it's struck", "harmonics that match the Corvan II field exactly", "an emitter that seems to anticipate the hit", "a power curve no engineer can explain"],
    brief: "Starfleet R&D's new shield emitter, built from principles nobody quite understands, needs a field test under a real starship's power near {world}. It's either a breakthrough or a very expensive fire.",
    arrive: "{key} brings the emitter aboard in a single crate the size of a coffin and installs it personally, with Grath standing over every connection with his arms folded.\n\n\"How does it work?\" Grath asks.\n\n\"We're not entirely sure,\" {key} says, cheerfully. \"That's what the test is for.\"",
    steps: [
      ["Fit it", "Fitting it takes a day. Grath objects to every connection and then, grudgingly, admires most of them. When the emitter powers up the whole ship hums, faintly, a low note just at the edge of hearing. Rrinn's ears flatten and stay that way."],
      ["Take the hits", "The test range: a drone that fires phasers at the Pelion's shields, harder and harder. The new shields take it all and recover in half the time. And they do something else: {strange}. Nobody asked for that."],
      ["Find its limit", "At full power the shields shrug off a hit that would have holed the old ones. And Sevek, reading the harmonics, goes still. \"Captain. These are the same harmonics as the field around the Corvan II caretaker. Exactly the same.\" R&D didn't invent this. They copied it."],
    ],
    choice: { title: "The emitter", text: "It works. It's a stronger shield than anything in the fleet, and it was copied from a Makers' machine. {key} wants it left fitted to the Pelion for further field trials. Sevek is uneasy: nobody knows what else the harmonics do.",
      options: [
        { id: "keep", name: "Keep it fitted", blurb: "Shield emitters fitted to the Pelion for free (Shields 5 → 6); +4 science.", how: "The new shield emitter tested and left fitted to the Pelion.", fx: { science: 4, refit: "shields" }, text: "The emitter stays. The Pelion's shields are the strongest in the sector now, and hum faintly whenever they're up, a low note that the crew come to find oddly comforting. Sevek keeps watching the harmonics, and writes careful notes, and doesn't say what he's worried about." },
        { id: "return", name: "Send it back to R&D", blurb: "+10 science, +1 commendation for caution.", how: "The new shield emitter tested and returned to R&D.", fx: { science: 10, commendations: 1 }, text: "The emitter goes back to R&D with Sevek's notes attached: a long, careful document about the Makers' harmonics and what nobody knows about them. {key} is disappointed. R&D reads the notes, and quietly puts the program on hold." },
      ] },
    fail: "The trials never happened. R&D's emitter sits in its crate, and the questions it raises go unasked.",
  },
  "Ferry a delegation to a world that left the Federation#2": {
    mission: "Ferry a delegation to a world that left the Federation", name: "The broken treaty", type: "Diplomatic",
    reason: "{world} left the Federation over a trade treaty it says Starfleet broke. It's been ten years. They've asked for a delegation to talk about the terms of coming back.",
    why: "{world} is offering to come back to the Federation in exchange for protection: something has been digging in their mountains, and they're frightened.",
    thread: "{world}'s mountains held a Makers' site, and it's been dug up. Their scouts saw the diggers: Orion crews, and a Klingon ship that paid them. {world} came back to the Federation because the diggers frightened them more than old grudges.",
    keys: ["Chancellor Mira Dov|who signed the treaty, and the withdrawal", "Trade Minister Rook|who still thinks the Federation cheated", "Envoy Sela Grant|the Federation's last ambassador here", "Captain Jon Abara|of their small defence fleet"],
    strange: ["a treaty clause nobody on either side remembers agreeing to", "scouts' reports of lights in the mountains", "a trade ledger that doesn't balance by eleven percent", "a mountain pass that's been closed for a month"],
    brief: "{world} left the Federation ten years ago over a broken trade treaty. Now they've asked for a delegation. The message doesn't say why, and it's the first time in a decade they've called.",
    arrive: "{world}'s capital is ten years older and poorer than the briefing pictures, but not bitter. The delegation is met at the spaceport by {key}, and taken, before anything else, to see the mountains on the horizon, where at night there are lights.\n\n\"That's why we called,\" {key} says. \"We'll talk about the treaty. But that's why.\"",
    steps: [
      ["Settle the old grievance", "The treaty dispute takes a day of shouting and a night of ledgers. Rrinn finds it: {strange}. Neither side cheated. Both were cheated, by the same broker, who's long gone. It doesn't fix ten years. But it lets everyone stop shouting."],
      ["Hear the new fear", "Then {world}'s scouts tell the delegation about the mountains: a ruin nobody visited, and since last month, lights, cutting, ships coming and going at night. Their small fleet went to look. It came back with holes in it."],
      ["See for themselves", "Reyes and Sevek go up the mountain with two of {world}'s scouts. They find the ruin cut open, the caretaker gone, and the diggers' camp abandoned, still warm. In the mud, a footprint too big for an Orion."],
    ],
    choice: { title: "The terms", text: "{world} wants to rejoin the Federation, and wants a Starfleet guard on their mountains as the price. The delegation can agree on Starfleet's behalf, which isn't quite its place. Or carry the request back, and let Starfleet decide, which will take months.",
      options: [
        { id: "agree", name: "Agree to the guard", blurb: "+3 accord with {world}; Starfleet Command marks a box for promising its ships.", how: "{world} brought back toward the Federation, with a guard promised.", fx: { accord: 3, command: 1 }, text: "The delegation agrees, and {world}'s council votes to apply for readmission the same night. There's dancing in the capital. Starfleet Command's response is, to put it mildly, firm. But the guard is sent, and the mountain lights don't come back." },
        { id: "carry", name: "Carry the request back", blurb: "+1 accord, +1 commendation.", how: "{world}'s request to rejoin carried to Starfleet.", fx: { accord: 1, commendations: 1 }, text: "The request goes back to Starfleet through proper channels, with the delegation's strong recommendation attached. {key} understands. That doesn't make the waiting easier. The mountain lights come back twice more before the answer does." },
      ] },
    fail: "The delegation never arrived. {world} watched its mountains alone, and stopped calling.",
  },
  "Shore leave that goes wrong#2": {
    mission: "Shore leave that goes wrong", name: "The festival of masks", type: "Crew",
    reason: "Shore leave at {world}'s Festival of Masks, the most famous party in the sector. The crew have earned it.",
    why: "Starfleet Intelligence would like the Pelion's crew to keep their eyes open at the Festival: Orion brokers are said to be selling Makers' pieces there, behind the masks.",
    thread: "Behind the Festival's masks, an Orion broker was selling Makers' fragments to a buyer in a Klingon house's colours. Two of the Pelion's crew saw the deal. Now they know the broker's name.",
    keys: ["Mistress Vey|who owns the Festival's grandest house", "Constable Haro Finch|of the colony constabulary", "Lord Masque|the Festival's master of ceremonies", "Tamsin Ro|a fortune-teller who knows everyone"],
    strange: ["masks that change their faces when no one's looking", "a masked broker selling pieces of ancient machinery", "a dance that everyone knows and no one was taught", "a mask that won't come off"],
    brief: "Shore leave at {world}'s Festival of Masks: a week of music and masks and nobody being who they are. The crew have been counting the days.",
    arrive: "{world}'s capital at Festival time is a riot of colour: every face masked, every street lantern-lit, music from every window. The crew pour down from the transporter room in borrowed masks, and the captain watches them go, and allows themselves a moment of hope that this will be a quiet week.\n\nIt lasts until the second evening, when {key} comes to find the captain with an expression the mask doesn't quite hide.",
    steps: [
      ["Find out what happened", "Three crew members, one of them Rrinn, are in a cell under the Festival hall: caught, they say, where they shouldn't have been, behind a curtain where {strange}. Rrinn says she heard something she wasn't supposed to hear. Rrinn is very hard to sneak up on."],
      ["Get them out", "The captain argues them out of the cell with a mixture of charm, Starfleet credit, and a quiet word from Reyes. On the way back to the ship Rrinn tells the captain what she heard: a broker's name, a price, and a buyer with Klingon accents."],
    ],
    choice: { title: "The broker", text: "Rrinn knows the broker's name and where they'll be tomorrow night. {key} would very much like this not to become a Starfleet matter: the Festival lives on discretion. The captain can let Starfleet Intelligence know, quietly, or step in personally, publicly, and stop the deal.",
      options: [
        { id: "quiet", name: "Tell Intelligence, quietly", blurb: "+8 science from what they learn; the Festival never knows.", how: "Shore leave at the Festival, and a broker's name passed to Intelligence.", fx: { science: 8 }, text: "The name goes to Starfleet Intelligence in a coded burst from orbit, and the rest of the Festival passes in music and masks. Three weeks later, a broker who sold to a Klingon house stops answering their messages. The crew come back aboard tired, sunburned and happy, which is the whole point of shore leave." },
        { id: "stop", name: "Stop the deal", blurb: "+1 commendation; the Festival is not pleased with Starfleet.", how: "Shore leave at the Festival, and an Orion deal stopped in public.", fx: { commendations: 1, accord: -1 }, text: "Reyes walks into the deal at midnight, in a Festival mask and Starfleet uniform, and the broker runs, leaving the pieces on the table. It's spectacular. It's also the talk of the Festival for all the wrong reasons, and {key} makes it clear that the Pelion's crew will not be welcome next year." },
      ] },
    fail: "Shore leave ended badly. Three of the crew spent the Festival in a cell, and the broker's name went unheard.",
  },
  "Carry a message across the Neutral Zone#2": {
    mission: "Carry a message across the Neutral Zone", name: "The prisoner exchange", type: "Security",
    reason: "A Starfleet officer captured by the Romulans six years ago is to be exchanged at the edge of the Neutral Zone. The Romulans asked for the Pelion. Nobody knows why.",
    why: "The Romulans are offering more than a prisoner: their exchange officer wants to talk, quietly, about a common enemy digging up sites on both sides of the Zone.",
    thread: "The Romulan officer's message is plain: the diggers have taken sites on the Romulan side too, and the Romulans know who's paying them. House Kor'vath. The Romulans would like it known they didn't do it.",
    keys: ["Admiral Rhys Caldwell|who arranged the exchange", "Lieutenant Sabine Aube|an admiral's intelligence aide", "Dr. Nils Arden|a Starfleet doctor sent to meet the prisoner", "Commander Hollis Reyne|who served with the prisoner before her capture"],
    strange: ["a prisoner who's been held for six years and doesn't know the war's over", "a Romulan officer who asks to speak to the captain alone", "a message slipped into the exchange papers", "an exchange point no Federation ship has visited in decades"],
    brief: "A prisoner exchange at the edge of the Neutral Zone near {world}: one Starfleet officer, held six years, for a Romulan held two. The Romulans asked for the Pelion by name.",
    arrive: "The exchange point is a patch of empty space the treaty set aside a century ago. A Romulan bird-of-prey waits there, decloaked, which in itself is a statement. Its commander hails: Subcommander Velan. Correct, cold, very formal. \"Captain. You are expected.\"\n\nAboard the Pelion for the exchange is {key}. In the brig, the Romulan prisoner waits, perfectly calm. Somewhere aboard the bird-of-prey is a Starfleet officer who hasn't seen home in six years.",
    steps: [
      ["Make the exchange", "Two officers cross between two ships in the same instant, beams locked together so neither side can cheat. The Starfleet officer materializes on the Pelion's transporter pad thin, pale and upright, and salutes the captain, and then sits down on the pad very suddenly and puts her face in her hands. Vessik is beside her before anyone else moves."],
      ["Take the message", "The Romulan exchange officer asks for one more thing: a word with the captain, alone, by viewscreen. When the captain agrees, the Romulan speaks quickly and quietly: their sites have been dug up too. They know who's paying. They would like the Federation to know it isn't them."],
    ],
    choice: { title: "The offer", text: "The Romulan officer has offered, without quite saying so, to share what they know about the diggers: in exchange for what the Federation knows. It would be an unprecedented channel between the two powers. Starfleet would never authorize it. The captain could open it anyway, or report the offer and leave it to the admirals.",
      options: [
        { id: "open", name: "Open the channel", blurb: "+14 science from what they share; Starfleet Command marks a box.", how: "The prisoner exchanged; a quiet channel opened with a Romulan officer.", fx: { science: 14, command: 1 }, text: "A coded frequency, a schedule, two officers on opposite sides of a line who will never meet. What comes through it in the months that follow is extraordinary. Starfleet Command finds out, eventually, and is furious, and keeps using it." },
        { id: "report", name: "Report it and wait", blurb: "+1 commendation; the offer is never repeated.", how: "The prisoner exchanged; the Romulan offer reported to Starfleet.", fx: { commendations: 1 }, text: "The captain reports the offer word for word, and Starfleet Command thanks them for their discretion and does nothing at all. The Romulan never calls again. The rescued officer, at least, is home, and on her first night aboard she eats three dinners." },
      ] },
    fail: "The Pelion never came. The Romulans took their officer home, and Starfleet's officer back to her cell.",
  },
});

/**
 * Complications: partway through an order, something goes wrong. Press on (an opposed roll: win and you gain ground,
 * lose and it costs you) or fall back (safe, but a week lost). One set for each kind of mission.
 */
export const COMPLICATIONS = {
  Rescue: { title: "A second disaster", text: "Halfway through, it gets worse. A secondary explosion somewhere below decks, a deep boom felt through the boots more than heard, and then a hull section groaning and giving way. Smoke rolls down the corridor toward the rescue team, thick and yellow, and on the far side of it, through the haze, there are still people: Reyes can see their hand-lights waving.\n\n\"Thirty seconds before that bulkhead seals itself,\" Grath says over the comm, very fast. \"Maybe forty. After that, they're on the wrong side of it.\"", oppose: { name: "the spreading disaster", skill: "Severity", target: 12 }, skills: ["Engineering", "Medicine", "Leadership"], cost: "hurt", costText: "a rescuer is hurt getting them out", press: "Send the team in now", win: "They go in through the smoke on a single tether, Reyes leading, hand over hand. It's thirty-eight seconds. The bulkhead slams down behind the last of them with a sound like a bell, and on the right side of it, coughing, blackened, every one of them alive, the survivors start to laugh, the way people do when they shouldn't have lived.", lose: "They get everyone out. But the bulkhead comes down a second early, and one of the rescuers is caught by the edge of it. Vessik is already moving before the call for a medic finishes. \"Broken, not crushed,\" he says, working. \"They'll mend. They were lucky.\" Nobody in the corridor feels lucky." },
  Diplomatic: { title: "A walkout", text: "Mid-session, without warning, one delegation stands. Their leader gathers their papers with great deliberation, says something in their own language that the translator renders, after a pause, as \"We will not be spoken to like this,\" and walks out. Nobody else in the room heard an insult. Everybody in the room heard the door.\n\nsh'Vari is already on her feet. \"Their shuttle's on the landing pad, Captain. If they reach it, there are no more talks.\"", oppose: { name: "wounded pride", skill: "Grievance", target: 12 }, skills: ["Diplomacy", "Psychology", "Leadership"], cost: "accord", costText: "the talks sour: accord −1", press: "Go after them", win: "The captain catches them at the shuttle ramp, alone, without guards and without notes, and asks one question: what did they hear? It turns out to be a single word, mistranslated, that meant something very different in their tongue. The captain apologizes for it, simply, in front of their whole delegation. After a long moment, they walk back in.", lose: "The captain reaches them at the shuttle ramp, but the words don't land; whatever was heard in that room, an apology now sounds like an admission. They go home. They come back two days later, at a lower table, with lower expectations, and the talks are poorer for it." },
  Exploration: { title: "The readings spike", text: "Without warning the sensor readings spike off every scale at once. Something out there has noticed the Pelion's scans, and it doesn't like them: the harder the ship looks, the harder it pushes back. The deck lights flicker. A console on the science station sparks and dies.\n\n\"It is responding to us,\" Sevek says, quite calmly, with smoke curling past his shoulder. \"Each scan, a stronger response. I estimate the array can tolerate perhaps two more minutes.\"", oppose: { name: "the phenomenon", skill: "Strangeness", target: 12 }, skills: ["Sensors", "Physical Sciences", "Computers"], cost: "sensors", costText: "the sensor array burns out a box", press: "Hold position and keep scanning", win: "Sevek doesn't stop. He narrows the beam instead, lower power, longer pulse, and the thing out there settles, like an animal that's decided the light isn't going to hurt it. Two minutes become ten. Ten become an hour. When the array finally cools, the Pelion has more data than it came for, and the phenomenon is still there, still calm, as if it had chosen to be studied.", lose: "The third scan is one too many. The response comes back like a slap: every sensor on the forward array overloads at once, and the bridge goes briefly blind. When the screens come back, half the array is dark and Grath is already swearing at it from a Jefferies tube. \"It bit us,\" he says. \"It actually bit us.\"" },
  Technology: { title: "Cascade failure", text: "The prototype's power draw spikes, and keeps spiking. Then a cascade starts: a relay on deck seven blows, then one on deck eight, then nine, a line of failures running down through the ship like falling dominoes, faster than the repair crews can chase them.\n\n\"It's heading for the warp core,\" Grath says, very quietly, which is how everyone on the bridge knows to be frightened. \"I can cut the prototype and stop it dead. Or I can ride it out and keep the data. Your call. Quickly.\"", oppose: { name: "the cascade", skill: "Overload", target: 12 }, skills: ["Engineering", "Electronics", "Computers"], cost: "engines", costText: "the cascade reaches the warp drive: engines damaged", press: "Ride it out", win: "Grath rides it out. He reroutes the cascade around the warp core with his hands inside an open junction, dumping power through systems that were never meant to carry it, one relay at a time, and talking to the ship the whole while in a low Tellarite mutter. It reaches deck twelve and stops. The data survives. So, nearly, does Grath's temper.", lose: "The cascade gets there first. A shudder runs through the whole ship, deep and wrong, and the warp core drops to standby by itself. \"Drive's damaged,\" Grath reports, when he can be heard over the alarms. \"Not badly. Not well either. We're not going anywhere fast for a while.\"" },
  Security: { title: "Contact", text: "A contact on long-range sensors, closing fast, running dark: no transponder, no hails answered. It could be a patrol that's wandered. It could be a trap. Rrinn's ears go back and stay there.\n\n\"It's not trying very hard to hide, Captain,\" she says. \"It wants to be seen. It wants to see what we do about it.\"", oppose: { name: "whoever is out there", skill: "Cunning", target: 12 }, skills: ["Sensors", "Helm", "Communications"], cost: "romulan", costText: "the Romulans take it as provocation: a bird-of-prey crosses the Zone to strike a Federation world", press: "Hold course and find out", win: "The captain holds course, shields down, weapons cold, and lets it come. It comes to within a light-minute, holds there, watching, for a long, long minute. Then it turns and goes, back toward the Zone, having learned that the Pelion doesn't startle. Reyes lets out a breath she has been holding since the contact appeared.", lose: "The Pelion holds course, and the contact doesn't turn. It makes a pass so close the ship's proximity alarms howl, and drops something in its wake: a marker buoy, Romulan, transmitting a single word on every frequency. Starfleet Intelligence will say later what it means. The Romulans have taken note of the Pelion, and they'll answer." },
  Crew: { title: "It gets out of hand", text: "It started as a misunderstanding in a bar. Now there's a constable, a crowd, raised voices in three languages, and a Pelion crewman backed against a wall who won't stop arguing his case, loudly, to people who are rapidly running out of patience with him.\n\nReyes, on the comm: \"Captain, I can pull him out by force. It won't be pretty. Or you can come down here and talk them all down, which might work, if you're quick.\"", oppose: { name: "the crowd's temper", skill: "Anger", target: 11 }, skills: ["Leadership", "Psychology", "Diplomacy"], cost: "command", costText: "an incident report reaches Starfleet: a Command box", press: "Step in personally", win: "The captain walks into the middle of it, in uniform, unarmed, and asks the constable to explain the problem from the beginning, slowly. Halfway through the explanation the crowd starts to drift away; halfway through the next, the crewman apologizes. By the end, the constable is buying the captain a drink.", lose: "The captain's arrival doesn't calm things. It makes it an incident, with a Starfleet captain in the middle of it, and three local reporters get pictures. The crewman is escorted back to the ship by Reyes, the constable files a complaint, and the complaint reaches Starfleet Command before the Pelion leaves orbit." },
  Campaign: { title: "Kor'vath moves first", text: "The Kor'vath cruiser runs its shields up and turns, slowly and deliberately, to put itself between the Pelion and the Gate. Its disruptor ports glow. Captain Dakhar's voice comes over an open channel, unhurried, almost amused: \"Starfleet. This is no place for you. Move aside.\"\n\nsh'Vari's antennae are flat to her skull. \"If we give them room, they'll take all of it. If we don't, someone will fire first.\"", oppose: { name: "House Kor'vath's cruiser", skill: "Ruthlessness", target: 12 }, skills: ["Helm", "Leadership", "Diplomacy"], cost: "hurt", costText: "a disruptor hit on the bridge: a crew member is hurt", press: "Hold your ground", win: "The captain holds the Pelion where it is, nose to nose with the cruiser, and says nothing at all. A minute passes. Two. Then the cruiser's disruptor ports dim, one by one, and it eases back to its own side of the Gate. Dakhar's voice again, and this time something like respect in it: \"Stubborn. Good. I would not have liked to fight a coward.\"", lose: "The cruiser fires first: a single disruptor shot, precise, aimed not at the shields but at the Pelion's bridge windows. It's a warning, and it lands. Glass and sparks, a console exploding, and when the smoke clears one of the bridge crew is down, and the Pelion has given ground it won't get back." },
};
/** Each Makers' site the diggers take, in turn: [where it was, the report of what happened there]. */
export const KORVATH_SITES = [
  [
    "a ruin on an airless moon",
    "The report comes from a survey drone that passed the moon a week late. The ruin's dome has been cut open in a neat circle, and the hollow where the caretaker stood is empty: cut out in a single night, judging by the drill scars. The drone's cameras find bootprints in the dust, dozens of them, and nothing else. No one ever lived on that moon to see it happen."
  ],
  [
    "a cave city on a frozen world",
    "The cave city held three hundred people, a hardy, quiet folk who had lived beside their watcher for as long as their stories went back. The relief ship that answered their beacon found the caves empty, the fires out, the bedding still warm under the ice. The watcher's chamber had been cut open at its heart. Of the three hundred, there is no trace at all."
  ],
  [
    "a sea-floor vault",
    "The vault lay under four kilometres of ocean, and the diggers went down to it anyway. They cut the caretaker out and left, and the vault flooded behind them: the sea took the rest. The coastal villages on the surface felt the tremor and saw the water draw back, strangely, for an hour. Then it came back, and kept coming."
  ],
  [
    "a mountain shrine",
    "The locals had guarded the shrine for a thousand years: a family of keepers, passing the duty mother to daughter. The last keeper sent one message on an old trader's transmitter, three words, before it went silent. \"They are here.\" When Starfleet reached the mountain, the shrine was open to the sky and the keepers' house was empty."
  ],
  [
    "a derelict in a slow orbit",
    "It was a Makers' ship, or the shell of one, turning slowly around a dead star for eleven thousand years. The diggers stripped it to the frame. A Federation freighter crew who'd been using it as a navigation marker found it a week later, gutted, and reported it with something like grief: it had been there all their lives, and their parents' lives."
  ],
  [
    "a desert obelisk",
    "The obelisk stood in a desert where nomads wintered, and it hummed, faintly, when the wind was right; the nomads called it the Singing Stone. They came back for the winter and found it toppled and hollow, its heart cut out, its song gone. They have asked the Federation, through a trader, who did this. Nobody has an answer for them."
  ],
  [
    "a ring of standing stones",
    "Twelve stones in a ring on a grassy world, and under them, the caretaker. Every stone has been cut open, methodically, one after another, as if the diggers didn't know which one held it and didn't care how long it took. The farmers in the valley below heard cutting for nine nights and were too afraid to go and look."
  ],
  [
    "a crater observatory",
    "The observatory sat in the rim of a crater, its great lenses turned toward the sky for eleven thousand years. The diggers smashed every lens on the way in, as if the watching itself offended them. The caretaker's chamber is empty. Rrinn, reading the report, says quietly that whoever did this wanted it to hurt."
  ]
];
