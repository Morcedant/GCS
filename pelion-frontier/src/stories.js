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

/**
 * Complications: partway through an order, something goes wrong. Press on (an opposed roll: win and you gain ground,
 * lose and it costs you) or fall back (safe, but a week lost). One set for each kind of mission.
 */
export const COMPLICATIONS = {
  Rescue: { title: "A second disaster", text: "Halfway through, it gets worse: a secondary explosion, a hull section giving way, a corridor filling with smoke, and people still on the far side of it.", oppose: { name: "the spreading disaster", skill: "Severity", target: 12 }, skills: ["Engineering", "Medicine", "Leadership"], cost: "hurt", costText: "a rescuer is hurt getting them out", press: "Send the team in now" },
  Diplomatic: { title: "A walkout", text: "One delegation stands up mid-session and walks out, citing an insult nobody else heard. If they reach their ship, the talks are over.", oppose: { name: "wounded pride", skill: "Grievance", target: 12 }, skills: ["Diplomacy", "Psychology", "Leadership"], cost: "accord", costText: "the talks sour: accord −1", press: "Go after them" },
  Exploration: { title: "The readings spike", text: "The sensors spike off every scale: something is reacting to the Pelion's scans, and the longer the ship stays, the harder it pushes back.", oppose: { name: "the phenomenon", skill: "Strangeness", target: 12 }, skills: ["Sensors", "Physical Sciences", "Computers"], cost: "sensors", costText: "the sensor array burns out a box", press: "Hold position and keep scanning" },
  Technology: { title: "Cascade failure", text: "The prototype's power draw spikes and a cascade starts running through the ship's systems, deck by deck. It can be shut down, or ridden out.", oppose: { name: "the cascade", skill: "Overload", target: 12 }, skills: ["Engineering", "Electronics", "Computers"], cost: "engines", costText: "the cascade reaches the warp drive: engines damaged", press: "Ride it out" },
  Security: { title: "Contact", text: "A contact on long-range sensors, closing fast and running dark. It could be a patrol. It could be a trap.", oppose: { name: "whoever is out there", skill: "Cunning", target: 12 }, skills: ["Sensors", "Helm", "Communications"], cost: "romulan", costText: "the Romulans take it as provocation: a bird-of-prey crosses the Zone to strike a Federation world", press: "Hold course and find out" },
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
