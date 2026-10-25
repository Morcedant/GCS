// The campaign builder (engine/campaign.js): campaigns are checked as they're kept, the generators roll from the
// setting's own tables, and only what the GM shares (never a secret or notes) reaches the players.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const here = new URL(".", import.meta.url);
const pack = (id) => JSON.parse(fs.readFileSync(new URL(`../../../packs/${id}/pack.json`, here), "utf8"));
const CP = (() => {
  const src = fs.readFileSync(new URL("../../campaign.js", here), "utf8");
  return new Function("localStorage", src + "\nreturn { cpClean, cpPublic, cpCleanPublic, cpRoll, cpRollPremise, cpKinds, cpTrigger };")({ getItem: () => null, setItem: () => {} });
})();
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test("a campaign is checked as it's kept", () => {
  const c = CP.cpClean({ name: "  Copper\nCreek ", premise: "Line one\r\n\r\n\r\n\r\nLine two\u0007", sharePremise: 1,
    people: [{ name: "Silas Crane", secret: "x".repeat(5000), shared: true, id: "pe-abc" }, { role: "no name" }, { name: "Twin", id: "pe-abc" }],
    sessions: [{ title: "First", status: "nonsense" }], bogus: [1] });
  assert.equal(c.name, "Copper Creek");
  assert.equal(c.premise, "Line one\n\nLine two");
  assert.equal(c.people.length, 2, "an entry needs a name");
  assert.notEqual(c.people[0].id, c.people[1].id, "ids stay unique");
  assert.equal(c.people[0].secret.length, 600);
  assert.equal(c.sessions[0].status, "planned");
  assert.equal(c.bogus, undefined);
});

test("players see only what's shared, and never a secret or the GM's notes", () => {
  const c = CP.cpClean({ name: "Copper Creek", premise: "The mine.", sharePremise: false, notes: "Big twist",
    people: [{ name: "Silas", desc: "The sheriff.", secret: "He did it.", notes: "n", goal: "g", shared: true }, { name: "Hidden", shared: false }],
    sessions: [{ title: "One", recap: "We met.", log: "GM only", scenes: "s", shared: true }, { title: "Two", recap: "We fought.", shared: true }] });
  const p = CP.cpPublic(c);
  assert.equal(p.premise, undefined, "the premise only when the GM shares it");
  assert.deepEqual(p.people, [{ name: "Silas", desc: "The sheriff." }]);
  assert.deepEqual(p.sessions.map((s) => s.title), ["Two", "One"], "latest recap first");
  assert.ok(!JSON.stringify(p).includes("He did it") && !JSON.stringify(p).includes("GM only") && !JSON.stringify(p).includes("Big twist"));
  assert.equal(CP.cpPublic(CP.cpClean({ name: "Nothing shared", people: [{ name: "A" }] })), null);
  // A player's page checks it again: a secret slipped in is dropped.
  assert.deepEqual(CP.cpCleanPublic({ people: [{ name: "Silas", secret: "leak" }] }).people, [{ name: "Silas" }]);
  // Too much to send: the oldest recaps go first.
  const big = CP.cpClean({ sessions: Array.from({ length: 30 }, (_, i) => ({ title: "S" + i, recap: "r".repeat(1900), shared: true })) });
  const pb = CP.cpPublic(big);
  assert.ok(JSON.stringify(pb).length <= 20000 && pb.sessions[0].title === "S29");
});

test("the generators roll from each setting's own tables, ready to change", () => {
  for (const id of ["western", "spaceopera", "fantasy", "aurora"]) {
    const P = pack(id), c = CP.cpClean(null);
    const person = CP.cpRoll(P, "people", c, seq(0.1, 0.5, 0.9, 0.3, 0.7));
    assert.ok(person.name.split(" ").length >= 2 && P.campaign.names.first.includes(person.name.split(" ")[0]), id + ": a name from the setting");
    assert.ok(P.seeds.who[1].includes(person.role) || P.roles.some((r) => person.role === "A " + r.name.toLowerCase()), id + ": who they are, from the setting");
    assert.ok(person.desc && person.goal && person.secret);
    const place = CP.cpRoll(P, "places", c, seq(0.2, 0.6));
    assert.ok(P.seeds.place[1].includes(place.name));
    const s = CP.cpRoll(P, "sessions", c, seq(0.4, 0.8, 0.15));
    assert.ok(P.seeds.mission[1].includes(s.title) && /Clock: .*segment clock/.test(s.threats) && s.scenes.split("\n").length === 4);
    const f = CP.cpRoll(P, "factions", c, seq(0.1, 0.3));
    assert.ok(f.goal && f.methods && f.resources);
    assert.ok(CP.cpRollPremise(P).length > 40);
    // Kept as rolled, it passes the checks.
    assert.equal(CP.cpClean({ people: [person], places: [place], sessions: [s], factions: [{ ...f, name: f.name || "The Ring" }] }).people.length, 1);
  }
});

test("a step's trigger: locked until the group holds the cards it names, then unlocked for good", () => {
  const step = CP.cpClean({ arc: [{ title: "Into the Barrow", summary: "The wight's lair.", unlockCards: "Ghoul, Barrow wight", unlockCount: 3, unlockText: "The priest sends word.", shared: true }] }).arc[0];
  const card = (name, tag) => ({ name, tag: tag || name.toLowerCase().replace(/ /g, "-") });
  let t = CP.cpTrigger(step, [card("Ghoul")]);
  assert.deepEqual([t.missing, t.short, t.met], [["Barrow wight"], 2, false]);
  t = CP.cpTrigger(step, [card("ghoul"), card("Barrow Wight"), card("Ghoul")]); // the same subject twice counts once
  assert.deepEqual([t.missing, t.short, t.met], [[], 1, false]);
  t = CP.cpTrigger(step, [card("Ghoul"), card("Barrow wight"), card("Werewolf")]);
  assert.equal(t.met, true);
  assert.equal(CP.cpTrigger(CP.cpClean({ arc: [{ title: "No trigger" }] }).arc[0], []).met, false, "a step with no trigger never fires");
  // Players see a locked step as locked: never its summary or what happens, and what opens it only if the GM says so.
  const pub = (x) => CP.cpPublic(CP.cpClean({ arc: [x] })).arc[0];
  assert.deepEqual(pub(step), { title: "Into the Barrow", locked: true });
  assert.match(pub({ ...step, unlockHint: true }).needs, /a card about Ghoul; a card about Barrow wight; 3 cards in all/);
  assert.deepEqual(pub({ ...step, unlocked: true }), { title: "Into the Barrow", summary: "The wight's lair." });
  assert.ok(!JSON.stringify(pub(step)).includes("priest"));
  assert.equal(CP.cpCleanPublic({ arc: [{ title: "X", locked: true, summary: "leak" }] }).arc[0].summary, undefined);
});
