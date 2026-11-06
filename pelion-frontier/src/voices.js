// The other powers speak. Each has someone who speaks for it in the Corvan Sector, and a character: the Klingon
// commander respects a captain who stands their ground; the Romulan measures every word; the Tholian Speaker is exact
// to the second about boundaries; the Orion pirate captain sells anything. Now and then one of them hails the Pelion,
// and the captain answers. Every answer, and much of what the Pelion does (firing first, destroying a ship, letting one
// go), is remembered (game.js remember): it moves that power's standing, and the Sector tab shows what each remembers.
// Standing and the bargains made here change what the powers do: raids, strikes and webs held back for a while.
import { distance } from "./hex.js";
import { ENEMIES } from "./data.js";
import { inZone } from "./sector.js";
import { log, rand, sysAt, spawnEnemy, markCommand, romulanReprisal, tholianReprisal, tholianSpace, releaseWebs, livePosts, registerChoices, pushChoice, sceneRoll, remember, standingOf, setCalm } from "./game.js";

export const VOICES = {
  klingon: { leader: "Commander Torgath of House Mok'tal", title: "Honour and the blade", text: "Respects a captain who stands their ground, and despises one who talks too much. Never forgets an insult, or a debt of honour." },
  romulan: { leader: "Commander t'Rehu", title: "Patience and secrets", text: "Every word measured, every offer a test. The Romulans keep their own accounts, and always collect." },
  tholian: { leader: "Speaker Thrann of the Assembly", title: "Precision and boundaries", text: "Exact to the second and rigid as crystal. A boundary crossed is never forgotten; a promise kept is noted." },
  orion: { leader: "Kessa Vane, of the Corvan cell", title: "Everything has a price", text: "A pirate captain who would sell anyone, and has. She bargains, she threatens, and she remembers who paid." },
};
const ATT = [[20, "friendly"], [8, "cordial"], [-8, "neutral"], [-20, "wary"], [-99, "hostile"]];
export const attitude = (S, p) => ATT.find(([n]) => standingOf(S, p).score >= n)[1];
const vRolled = (r) => `(${r.who}, ${r.skill}: ${r.total} against ${r.target}, ${r.success ? `success by ${r.margin}` : `fails by ${-r.margin}`})`;
const near = (S, kinds, n) => Object.values(S.systems).find((s) => kinds.includes(s.kind) && distance(s.at, S.pelion.at) <= n);
const orionBase = (S) => Object.values(S.enemies).find((e) => ENEMIES[e.type].base);

/** Each message: who sends it, when (`can`), what's said, and the answers. */
export const MESSAGES = {
  "klingon:border": {
    can: (S) => (near(S, ["klingon", "claimed"], 3) && !S.pelion.docked ? {} : null),
    text: () => "\"Starfleet. You are close enough to our border to count our guns. Count them, then go.\" The channel closes, and opens again a moment later, as if Torgath wants to see what kind of captain you are.",
    options: [
      { id: "withdraw", name: "Withdraw, with courtesy", blurb: "Klingon tension −1, but Torgath thinks less of a captain who backs away (−2).", apply: (S) => { S.tension = Math.max(0, S.tension - 1); remember(S, "klingon", "backed away from our border", -2); return "The Pelion turns away. Torgath doesn't bother to answer. Klingon tension −1."; } },
      { id: "hold", name: "Hold your position", blurb: "A Leadership roll: success, Torgath respects it (+6); fail, an incident (tension +1, −3).", apply: (S) => {
        const r = sceneRoll(S, ["Leadership", "Diplomacy"]);
        if (r.success) { remember(S, "klingon", "held its ground at our border, like a warrior", 6); return `"These are open stars," the Pelion answers, "and we'll keep to them." A long pause; then Torgath laughs ${vRolled(r)}. The Empire thinks better of you.`; }
        S.tension = Math.min(10, S.tension + 1); remember(S, "klingon", "provoked us at our border", -3); return `It goes badly ${vRolled(r)}: words, then threats, then a disruptor shot across the bow. Klingon tension +1.`;
      } },
    ],
  },
  "klingon:tribute": {
    can: (S) => (S.turn >= 8 && S.tension >= 4 && S.supplies >= 8 ? {} : null),
    text: () => "\"The Empire's ships keep these lanes clear of Orion vermin, and your colonies grow fat on it. Eight crates of supplies would show your gratitude.\" Torgath's officers, behind, look as if they hope you'll refuse.",
    options: [
      { id: "pay", name: "Pay", blurb: "−8 supplies; Klingon tension −2. Torgath takes it, and thinks a little less of you (−1).", apply: (S) => { S.supplies -= 8; S.tension = Math.max(0, S.tension - 2); remember(S, "klingon", "paid us tribute", -1); return "The crates are beamed across. Klingon tension −2. Torgath doesn't say thank you."; } },
      { id: "refuse", name: "Refuse", blurb: "Klingon tension +1; but a captain with a spine earns some respect (+3).", apply: (S) => { S.tension = Math.min(10, S.tension + 1); remember(S, "klingon", "refused us tribute to our faces", 3); return "\"Then we'll see whose ships keep the lanes,\" Torgath says, and seems almost pleased. Klingon tension +1."; } },
    ],
  },
  "klingon:hunt": {
    can: (S) => (S.turn >= 10 && !S.orionBaseDown && orionBase(S) && standingOf(S, "klingon").score >= -5 ? {} : null),
    text: () => "\"Orion dogs raid my outposts as they raid your colonies. I have no love for Starfleet, Captain, but less for pirates. Tell me what you know of their nest, and I'll tell you what I know.\"",
    options: [
      { id: "share", name: "Trade what you know", blurb: "The pirate base goes on your charts (Torgath knows where it is); tension −1, +6 standing. Starfleet may ask why.", apply: (S) => {
        const b = orionBase(S); S.tension = Math.max(0, S.tension - 1); remember(S, "klingon", "hunted the Orions with us", 6);
        if (b && !b.found) { b.found = true; const sy = sysAt(S, b.at); if (sy) { sy.surveyed = true; S.seenSys[sy.id] = true; } log(S, `The Orion pirate base is found: ${sy ? `hidden at ${sy.name}` : "in the dust"}. It's on the charts now.`, "discovery"); return `Torgath sends coordinates: the pirate base, ${sy ? `hidden at ${sy.name}` : "in the dust"}. It's on the charts now. Klingon tension −1.`; }
        return "You already know where the base is; Torgath grunts, and says the hunt is yours, then. Klingon tension −1.";
      } },
      { id: "decline", name: "Decline", blurb: "−3 standing.", apply: (S) => { remember(S, "klingon", "wouldn't hunt with us", -3); return "\"Then hunt alone,\" Torgath says, and closes the channel."; } },
    ],
  },
  "romulan:zone": {
    can: (S) => (Object.keys(S.hexes).some((k) => inZone(k) && distance(k, S.pelion.at) <= 2) ? {} : null),
    text: () => "A voice on the Pelion's command frequency, from no ship the sensors can see: \"Commander t'Rehu, of the Romulan Star Empire. Your course brings you within two light-years of the Neutral Zone. That is close enough to be mistaken for intent. We are patient, Captain. Not infinitely so.\"",
    options: [
      { id: "withdraw", name: "Alter course away", blurb: "+4 standing.", apply: (S) => { remember(S, "romulan", "altered course away from the Zone when asked", 4); return "The Pelion turns away from the Zone. Nothing answers, but the static on that frequency goes quiet."; } },
      { id: "hold", name: "Hold course: these are Federation stars", blurb: "−6 standing, and they may answer with a strike on a listening post.", apply: (S) => { remember(S, "romulan", "held course on the Neutral Zone", -6); if (rand(S) < 0.5) { romulanReprisal(S, "the Pelion held its course on the Neutral Zone"); return "\"Noted,\" says t'Rehu. Within the day, Romulan traffic surges along the Zone."; } return "\"Noted,\" says t'Rehu, and nothing more."; } },
    ],
  },
  "romulan:exchange": {
    can: (S) => (S.turn >= 12 && S.science >= 6 && standingOf(S, "romulan").score >= -10 ? {} : null),
    text: () => "\"An exchange, Captain, between professionals. Your survey data of this sector, which we lack, for the positions of our ships, which you lack. For a few weeks, our birds-of-prey will keep to their side of the Zone. Consider it a gesture.\"",
    options: [
      { id: "trade", name: "Trade the survey data", blurb: "−6 science; the Romulans hold back their strikes for 6 weeks, +5 standing.", apply: (S) => { S.science -= 6; setCalm(S, "romulan", S.turn + 6); for (const e of Object.values(S.enemies)) if (e.power === "romulan") { e.revealed = true; e.seen = true; } remember(S, "romulan", "traded survey data with us", 5); return "The data goes across, and a list of positions comes back: every bird-of-prey this side of the Zone. For six weeks, there will be no strikes."; } },
      { id: "refuse", name: "Refuse", blurb: "−2 standing.", apply: (S) => { remember(S, "romulan", "refused an exchange", -2); return "\"As you wish,\" says t'Rehu, as if the answer had been expected."; } },
    ],
  },
  "romulan:posts": {
    can: (S) => (S.turn >= 15 && livePosts(S).length ? {} : null),
    text: () => "\"Your listening posts, Captain, stare into our space day and night. We find it discourteous. Dim one of them, for a time, and we will find less reason to visit them.\"",
    options: [
      { id: "dim", name: "Dim a post's scanners for ten weeks", blurb: "No Romulan strikes for 10 weeks, +8 standing; Starfleet Intelligence won't be pleased (the Starfleet Command track).", apply: (S) => { setCalm(S, "romulan", S.turn + 10); remember(S, "romulan", "dimmed a listening post for us", 8); markCommand(S, 1, "the Pelion had a listening post dimmed at a Romulan's request."); return "One of the posts goes quiet, officially for maintenance. For ten weeks, the Zone is quiet too."; } },
      { id: "refuse", name: "Refuse", blurb: "−5 standing.", apply: (S) => { remember(S, "romulan", "refused to dim the listening posts", -5); return "\"Then we will go on visiting them,\" says t'Rehu."; } },
    ],
  },
  "tholian:boundary": {
    can: (S) => (tholianSpace(S, S.pelion.at) ? {} : null),
    text: () => "Speaker Thrann's voice is a chime of crystal, translated flat: \"Federation vessel. You are 1.3 light-years inside the boundary of the Assembly. You will depart within seven days, at 0400 hours by your clocks. The Assembly is always punctual.\"",
    options: [
      { id: "comply", name: "Comply, to the second", blurb: "+5 standing. (You still have to leave.)", apply: (S) => { remember(S, "tholian", "promised to leave our space on time", 5); return "\"Acknowledged,\" says the Speaker. \"The time is noted.\""; } },
      { id: "protest", name: "Protest the boundary", blurb: "A Diplomacy roll: success, +3; fail, −6 and a Tholian vessel heads for a Federation world.", apply: (S) => {
        const r = sceneRoll(S, ["Diplomacy", "Communications"]);
        if (r.success) { remember(S, "tholian", "argued the boundary well", 3); return `The Speaker hears the argument out, all of it ${vRolled(r)}, and says it will be entered in the record. From a Tholian, that's a great deal.`; }
        remember(S, "tholian", "disputed our boundary", -6); tholianReprisal(S, "the Pelion disputed the Assembly's boundary"); return `The Speaker closes the channel mid-sentence ${vRolled(r)}.`;
      } },
    ],
  },
  "tholian:treaty": {
    can: (S) => (Object.values(S.systems).some((s) => s.kind === "annexed") && standingOf(S, "tholian").score >= 8 ? {} : null),
    text: () => "\"The Assembly proposes a demarcation, fixed to the metre and for all time. One of the worlds within our webs is released. For ten weeks the Assembly spins no new web. After that, the demarcation will be as the Assembly measures it.\"",
    options: [
      { id: "accept", name: "Accept the demarcation", blurb: "One world released from the webs; no new webs for 10 weeks; +4 standing.", apply: (S) => { const n = releaseWebs(S, 1); setCalm(S, "tholian", S.turn + 10); remember(S, "tholian", "agreed a demarcation with us", 4); return n ? "The web around one world dissolves, precisely on the hour. For ten weeks, no new webs." : "There's nothing left in the webs to release, but the ten weeks stand."; } },
      { id: "decline", name: "Decline", blurb: "−2 standing.", apply: (S) => { remember(S, "tholian", "declined a demarcation", -2); return "\"Noted,\" says the Speaker."; } },
    ],
  },
  "tholian:registry": {
    can: (S) => (S.turn >= 6 ? {} : null),
    text: () => "\"The Assembly requires your vessel's registry, mass, crew complement and purpose in this sector, to six decimal places. It is a formality. The Assembly does not regard formalities as small.\"",
    options: [
      { id: "answer", name: "Answer it, in full", blurb: "+4 standing.", apply: (S) => { remember(S, "tholian", "answered our questions precisely", 4); return "Rrinn sends the figures to seven decimal places, to be safe. The Speaker acknowledges, almost warmly."; } },
      { id: "refuse", name: "Decline: Starfleet's business is its own", blurb: "−4 standing.", apply: (S) => { remember(S, "tholian", "refused to give its registry", -4); return "\"The refusal is recorded,\" says the Speaker."; } },
    ],
  },
  "orion:protection": {
    can: (S) => (S.turn >= 8 && !S.orionBaseDown && S.supplies >= 10 ? {} : null),
    text: () => "Kessa Vane, lounging, gold at her throat and a smile that doesn't reach her eyes: \"Captain. Your colonies are so very far apart, and space is so very big. Ten crates of supplies, and my people will find other worlds to visit for a couple of months. Call it insurance.\"",
    options: [
      { id: "pay", name: "Pay her", blurb: "−10 supplies; no Orion raids for 8 weeks; +5 standing. Starfleet won't hear of it.", apply: (S) => { S.supplies -= 10; setCalm(S, "orion", S.turn + 8); remember(S, "orion", "paid for protection", 5); return "The crates go across. Kessa blows a kiss at the screen. For eight weeks, the raids will go somewhere else."; } },
      { id: "refuse", name: "Refuse", blurb: "−5 standing, and a raider sets out for one of your worlds now.", apply: (S) => {
        remember(S, "orion", "refused our offer of insurance", -5);
        const tgt = Object.values(S.systems).filter((s) => s.kind === "colony" || s.kind === "member").sort(() => rand(S) - 0.5)[0], b = orionBase(S);
        if (tgt && b) spawnEnemy(S, "orion", b.at, { goal: "raid", target: tgt.at, hostile: true, home: b.at });
        return `"Pity," says Kessa. ${tgt ? `Within the day, a raider is reported heading for ${tgt.name}.` : ""}`;
      } },
    ],
  },
  "orion:sell": {
    can: (S) => { const b = orionBase(S); return b && !b.found && S.supplies >= 8 ? {} : null; },
    text: () => "\"A business proposal, Captain. There's a rival cell in this sector, and I'd like them gone. Eight crates, and I'll tell you exactly where their base is. You get a pirate base; I get a smaller market. Everyone wins but them.\"",
    options: [
      { id: "buy", name: "Buy the coordinates", blurb: "−8 supplies: the pirate base goes on your charts.", apply: (S) => { const b = orionBase(S); S.supplies -= 8; remember(S, "orion", "bought a rival's secrets from us", 3); if (b) { b.found = true; const sy = sysAt(S, b.at); if (sy) { sy.surveyed = true; S.seenSys[sy.id] = true; } log(S, `The Orion pirate base is found: ${sy ? `hidden at ${sy.name}` : "in the dust"}. It's on the charts now.`, "discovery"); } return "The coordinates are good. The base is on the charts now."; } },
      { id: "no", name: "No deals with pirates", blurb: "Nothing spent.", apply: () => "\"Your loss,\" says Kessa." },
    ],
  },
  "orion:grudge": {
    can: () => null,   // sent when the Pelion destroys a raider (combat.js)
    text: () => "Kessa Vane again, and not smiling: \"That was one of mine, Captain. She had a crew of nine, and some of them owed me money. I'll remember.\"",
    options: [{ id: "ok", name: "Close the channel", blurb: "She will.", apply: () => "The channel closes." }],
  },
};

/** Now and then (every five weeks at most, a chance in three), one of the powers hails the Pelion. */
export function voicesTurn(S) {
  if (S.over || S.event || S.battle || S.turn < 4 || S.turn - (S.lastVoice || 0) < 5) return;
  if (rand(S) > 0.35) return;
  const seen = (S.voicesSeen = S.voicesSeen || {});
  const cands = Object.keys(MESSAGES).filter((k) => S.turn - (seen[k] || -99) >= 12).map((k) => ({ k, ctx: MESSAGES[k].can(S) })).filter((x) => x.ctx);
  if (!cands.length) return;
  const pick = cands[Math.floor(rand(S) * cands.length)];
  seen[pick.k] = S.turn; S.lastVoice = S.turn;
  pushChoice(S, "voice", pick.k, pick.ctx);
}
/** A message sent on an occasion (a grudge): pushed now, whatever the timer. */
export function hail(S, key, ctx = {}) { pushChoice(S, "voice", key, ctx); }
registerChoices("voice", {
  view: (S, ev) => { const p = ev.id.split(":")[0], V = VOICES[p], M = MESSAGES[ev.id]; return { title: V.leader, kicker: `A hail · ${{ klingon: "the Klingon Empire", romulan: "the Romulan Star Empire", tholian: "the Tholian Assembly", orion: "Orion pirates" }[p]} · ${attitude(S, p)}`, power: p, speaker: V.title, text: M.text(S, ev.ctx), quote: true, options: M.options.map((o) => ({ id: o.id, name: o.name, blurb: o.blurb })) }; },
  choose: (S, ev, id) => {
    const p = ev.id.split(":")[0], M = MESSAGES[ev.id], o = M.options.find((x) => x.id === id) || M.options[0];
    const text = o.apply(S, ev.ctx); log(S, `${VOICES[p].leader}: you answered "${o.name}". ${text}`, "order");
    return { title: VOICES[p].leader, text, choice: o.name };
  },
});
