// The stories behind each kind of order, in the way of The Silence at Corvan II: a briefing, a scene on arrival, a scene
// for each stage of the work, a decision at the end with two ways to go, and what happens if the Pelion is too late.
// {world} is where it happens, {key} the key character, {strange} the strange thing, {captain} you.
// A choice's `fx` is what it does: commendations, science, supplies, accord (the world's), command (boxes marked),
// tension (with the Klingon Empire), heal (the world's harm).
export const STORIES = {
  "Answer a distress call": {
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
    brief: "Ambassador Teresh and her delegation are bound for talks at {world}, and someone has made it clear they shouldn't arrive. Get them there, alive and on time.",
    arrive: "The delegation boards: eleven diplomats, too much luggage, and {key}, who wasn't on the manifest. The ambassador vouches for them. Reyes doesn't.",
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
    brief: "{world}'s star is flaring, months ahead of every prediction. The colony has days, not months: twelve hundred people, three transports, and a governor, {key}, who doesn't believe the readings.",
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
    brief: "Romulan ships have been sighted near the Neutral Zone at {world}: a patrol is overdue. Show the flag, watch the border, and don't start a war.",
    arrive: "The border is quiet. Too quiet: the outpost listening stations report a gap in their coverage, as if something were jamming them on purpose, and {key} is waiting for the Pelion with a story about {strange}.",
    steps: [
      ["Sweep the border", "Rrinn hears it first: the faint echo of a cloaked ship, holding station on the Zone's edge, close enough to watch every outpost on the line."],
      ["Find out why", "It's a Romulan bird-of-prey, and it's mapping the outposts' shield frequencies. Whatever it's preparing for, it isn't a visit."],
    ],
    choice: { title: "The watcher", text: "The Romulan ship hasn't crossed the line, quite. Hail it and tell it that it's been seen, or quietly retune every outpost's shields and let it go home with useless data.",
      options: [
        { id: "hail", name: "Hail it", blurb: "Let them know they've been seen: +1 commendation; tension with the Empire's allies rises.", how: "The border patrolled; a Romulan watcher challenged and sent home.", fx: { commendations: 1 }, text: "The bird-of-prey decloaks long enough for its commander to say nothing at all, and leaves. Everyone on the line breathes out." },
        { id: "retune", name: "Retune the shields", blurb: "Let them leave with bad data: +6 science, and the outposts are safer for it.", how: "The border patrolled; a Romulan spy sent home with bad data.", fx: { science: 6 }, text: "Every outpost on the line changes frequency the moment the Romulan ship turns for home. Months of their work, wasted. They'll never know when it happened." },
      ] },
    fail: "The patrol never happened. Whatever was watching the border has finished watching.",
  },
  "Recover a lost probe or artifact": {
    brief: "A Federation deep-space probe went down near {world} carrying sensor logs from beyond the sector's edge, and {strange} it was never meant to find. Recover it before anyone else does.",
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
    brief: "Starfleet R&D has a prototype for the Pelion to test near {world}: a sensor-cloak inverter, built by {key}, that should let a starship see through a cloak. It hasn't been tested outside a lab.",
    arrive: "{key} beams aboard with the prototype in three crates and a manner that suggests the Pelion should be grateful. Grath takes one look at the wiring and asks who signed off on it.",
    steps: [
      ["Install it", "The prototype goes into the sensor array. The first power-up blows every fuse on deck seven, and the second one works."],
      ["Run the trials", "It works: against a cloaked training drone, the inverter finds it in seconds. It also finds {strange}, which nobody was looking for."],
      ["Push it to the limit", "At full power the inverter sees through a cloak at three light-years. It also starts to overheat, and {key} won't say what happens if it keeps going."],
    ],
    choice: { title: "The prototype", text: "The trials are done. {key} wants to push it one more time, at full power for an hour, to prove it. Grath wants it shut down and crated before it melts the array.",
      options: [
        { id: "push", name: "One more run", blurb: "+12 science; the sensors take a box of damage.", how: "The prototype tested to its limit.", fx: { science: 12, sensors: 1 }, text: "An hour at full power, and the most complete data set R&D has ever seen. The sensor array smokes for a day afterwards." },
        { id: "shut", name: "Shut it down", blurb: "+6 science, +1 commendation; the array is safe.", how: "The prototype tested and safely returned.", fx: { science: 6, commendations: 1 }, text: "Grath crates it himself. {key} sulks all the way back to Starbase 23, and R&D sends a thank-you note to the chief engineer." },
      ] },
    fail: "The trials never happened. R&D will find another ship, and another schedule.",
  },
  "Ferry a delegation to a world that left the Federation": {
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
    brief: "Shore leave at {world}, at last: a week's liberty for the crew. Starfleet only asks that the Pelion's people come back on time and in one piece. {strange} is the local attraction.",
    arrive: "The crew scatters across {world}'s pleasure districts. By the second evening, six of them haven't checked in, and {key} is asking for the captain.",
    steps: [
      ["Find the missing crew", "Four of the six are found at once: a card game, a misunderstanding, a local magistrate who wants a fine paid. The other two are somewhere {strange} leads."],
      ["Bring them home", "The last two are found, dazed and delighted and with no memory of the last day. And one of them has something they shouldn't, which {key} says was stolen."],
    ],
    choice: { title: "The stolen thing", text: "{key} wants the crewman handed over to the local magistrate. The crewman swears it was a gift. Local law is local law; Starfleet looks after its own.",
      options: [
        { id: "local", name: "Hand them over", blurb: "Respect local law: +1 accord with {world}; the crewman faces a local court.", how: "Shore leave sorted out under local law.", fx: { accord: 1 }, text: "The magistrate is fair, the fine is paid, and the crewman serves three days sweeping the market. {world} remembers that the Pelion played by its rules." },
        { id: "ship", name: "Starfleet handles it", blurb: "+1 commendation; the locals aren't happy.", how: "Shore leave sorted out under Starfleet discipline.", fx: { commendations: 1, accord: -1 }, text: "The crewman faces a captain's mast instead, and the item is returned with an apology. {key} calls it Starfleet arrogance, loudly." },
      ] },
    fail: "Shore leave ended badly, and late. The incident report is longer than the liberty was.",
  },
  "Carry a message across the Neutral Zone": {
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
  const world = o.sys ? S.systems[o.sys].name : "the border";
  return text.replace(/\{world\}/g, world).replace(/\{key\}/g, (o.key || "a stranger").replace(/^A /, "a ").replace(/^An /, "an "))
    .replace(/\{strange\}/g, (o.strange || "something strange").replace(/^A /, "a ").replace(/^An /, "an ").replace(/^The /, "the ")).replace(/\{captain\}/g, S.captain || "the captain")
    .replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, (m, p, c) => p + c.toUpperCase());
}
export const storyOf = (o) => (o && o.story ? STORIES[o.story] : null);
