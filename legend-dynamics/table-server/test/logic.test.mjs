// The shared table's rules: codes, hello, rolls and rerolls, limits.
import assert from "node:assert/strict";
import test from "node:test";
import * as L from "../src/logic.js";

const table = () => L.newTable({ name: "Saturday", game: "western", gmKeyHash: "h", now: 1000 });
const ruth = { role: "player", name: "Des", character: "Ruth Calloway" };

test("codes: six characters with nothing that's misheard", () => {
  let i = 0; const code = L.newCode(() => i++ % 31);
  assert.equal(code.length, 6); assert.ok(L.validCode(code));
  assert.ok(!L.validCode("ABC10O"), "no 0, 1 or O"); assert.ok(!L.validCode("abcdef"));
});

test("hello: a GM needs the key, a player a name, and the game must match", () => {
  const t = table();
  assert.deepEqual(L.hello({ role: "player", name: "Des", character: "Ruth Calloway", game: "western" }, t, false), { who: ruth });
  assert.match(L.hello({ role: "gm", name: "Sam" }, t, false).error, /GM key/);
  assert.equal(L.hello({ role: "gm", name: "Sam" }, t, true).who.role, "gm");
  assert.match(L.hello({ role: "player", name: "Des", game: "fantasy" }, t, false).error, /different game/);
  assert.match(L.hello({ role: "player" }, t, false).error, /name/);
  assert.equal(L.hello({ role: "player", name: "D\u0000es " + "x".repeat(80) }, t, false).who.name.length, 40, "names are cleaned and capped");
});

test("a roll uses the server's dice and the core rules, and is logged", () => {
  const t = table();
  const r = L.roll(t, ruth, { label: "Shooting", target: 14, base: 16, mod: -2, attack: true }, [2, 3, 4], 2000);
  assert.equal(r.entry.n, 1); assert.equal(r.entry.total, 9); assert.equal(r.entry.margin, 5); assert.equal(r.entry.success, true);
  assert.equal(r.entry.telling, true, "an attack by 5 is a telling hit");
  assert.equal(r.entry.character, "Ruth Calloway"); assert.equal(t.log.length, 1); assert.equal(t.active, 2000);
  assert.equal(L.roll(t, ruth, { label: "Shooting", target: 14, attack: true, called: true }, [2, 3, 4], 2000).entry.telling, false, "a called shot isn't a telling hit");
  assert.equal(L.roll(t, ruth, { label: "Dodge", target: 5 }, [1, 1, 2], 2000).entry.auto, "success", "natural 4 succeeds");
  assert.equal(L.roll(t, ruth, { label: "Dodge", target: 20 }, [6, 6, 5], 2000).entry.success, false, "natural 17 fails");
  assert.match(L.roll(t, ruth, { label: "x", target: 99 }, [1, 1, 1], 2000).error, /target/);
  assert.match(L.roll(t, ruth, { label: "x", target: "12" }, [1, 1, 1], 2000).error, /target/);
});

test("a point reroll answers one recent roll of your own, once", () => {
  const t = table();
  const a = L.roll(t, ruth, { label: "Ride", target: 10 }, [6, 6, 4], 2000).entry;
  const other = { role: "player", name: "Kim", character: "Dr. Webb" };
  assert.match(L.roll(t, other, { label: "Ride", target: 10, of: a.n }, [1, 1, 1], 2100).error, /Only whoever/);
  const b = L.roll(t, ruth, { label: "Ride", target: 10, of: a.n }, [3, 3, 3], 2100).entry;
  assert.equal(b.reroll, a.n); assert.equal(t.log[0].rerolled, true);
  assert.match(L.roll(t, ruth, { label: "Ride", target: 10, of: a.n }, [3, 3, 3], 2200).error, /already been rerolled/);
  assert.match(L.roll(t, ruth, { label: "Ride", target: 10, of: b.n }, [3, 3, 3], 2200).error, /can't be rerolled/);
  const c = L.roll(t, ruth, { label: "Ride", target: 10 }, [6, 6, 4], 3000).entry;
  assert.match(L.roll(t, ruth, { label: "Ride", target: 10, of: c.n }, [3, 3, 3], 3000 + L.REROLL_WITHIN_MS + 1).error, /too old/);
});

test("the log keeps the latest rolls; rolls are rate-limited per connection", () => {
  const t = table();
  for (let i = 0; i < L.LOG_KEEP + 5; i++) L.roll(t, ruth, { label: "x", target: 10 }, [3, 3, 3], 2000);
  assert.equal(t.log.length, L.LOG_KEEP); assert.equal(t.log[0].n, 6);
  let w = []; for (let i = 0; i < L.RATE.rolls; i++) w = L.rateCheck(w, 1000);
  assert.equal(L.rateCheck(w, 1000), null); assert.ok(L.rateCheck(w, 1000 + L.RATE.perMs));
});

test("server dice are fair d6", () => {
  const n = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6000; i++) for (const d of L.serverDice()) n[d]++;
  assert.equal(n[0], 0); for (let f = 1; f <= 6; f++) assert.ok(n[f] > 2700 && n[f] < 3300, `face ${f}: ${n[f]}`);
});

test("presence lists the GM first, then players", () => {
  assert.deepEqual(L.presence([ruth, { role: "gm", name: "Sam", character: "" }, null]).map((p) => p.role), ["gm", "player"]);
});
