// The shared table's rules: codes, hello, rolls and rerolls, limits.
import assert from "node:assert/strict";
import test from "node:test";
import * as L from "../src/logic.js";
import { existsSync } from "node:fs";

const table = () => L.newTable({ name: "Saturday", game: "western", gmKeyHash: "h", now: 1000 });
const ruth = { role: "player", name: "Des", character: "Ruth Calloway", owner: "h-des" };

test("codes: six characters with nothing that's misheard", () => {
  let i = 0; const code = L.newCode(() => i++ % 31);
  assert.equal(code.length, 6); assert.ok(L.validCode(code));
  assert.ok(!L.validCode("ABC10O"), "no 0, 1 or O"); assert.ok(!L.validCode("abcdef"));
});

test("hello: a GM needs the key, a player a name, and the game must match", () => {
  const t = table();
  assert.deepEqual(L.hello({ role: "player", name: "Des", character: "Ruth Calloway", game: "western" }, t, false), { who: { ...ruth, owner: "" } });
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
  const other = { role: "player", name: "Kim", character: "Dr. Webb", owner: "h-kim" };
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

test("the table's roll matches the core rules' resolve (when the engine is beside this folder)", async (t) => {
  const core = new URL("../../engine/rules/core.js", import.meta.url);
  if (!existsSync(core)) { t.skip("the engine isn't in this checkout"); return; }
  const { resolve } = await import(core.href);
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) for (const target of [-3, 4, 9, 10, 12, 16, 19, 25]) {
    const x = L.resolve([a, b, c], target), y = resolve([a, b, c], target);
    assert.deepEqual([x.total, x.success, x.auto, x.margin], [y.total, y.success, y.auto, y.margin]);
  }
});

test("phase 2: a player shares their character; the table's play state wins once it has one", () => {
  const sheets = {};
  const r = L.shareSheet(sheets, ruth, { key: "abc123", sheet: { name: "Ruth Calloway", portrait: "data:big", play: { injury: 3 } }, play: { injury: 1, duty: 2, bogus: 9 } }, 1000);
  assert.deepEqual(r.entry.play, { injury: 1, duty: 2 }, "only the shared fields, cleaned");
  assert.equal(r.entry.sheet.portrait, undefined, "no portrait"); assert.equal(r.entry.sheet.play, undefined);
  assert.equal(r.entry.owner.character, "Ruth Calloway");
  L.changePlay(sheets, { role: "gm", name: "Sam" }, { key: "abc123", play: { injury: 2 } }, 1100);
  const again = L.shareSheet(sheets, ruth, { key: "abc123", sheet: { name: "Ruth Calloway" }, play: { injury: 0, duty: 2 } }, 1200).entry;
  assert.equal(again.play.injury, 2, "sharing again keeps the table's injury"); assert.equal(again.rev, 3);
  assert.match(L.shareSheet(sheets, { role: "player", name: "Kim", character: "Ruth", owner: "h-kim" }, { key: "abc123", sheet: {} }, 1300).error, /Des's/);
  assert.match(L.shareSheet(sheets, { role: "player", name: "Des", character: "Ruth", owner: "h-impostor" }, { key: "abc123", sheet: {} }, 1300).error, /Des's/, "the same name from another browser isn't the owner");
  assert.match(L.changePlay(sheets, { role: "player", name: "Des", owner: "h-impostor" }, { key: "abc123", play: { duty: 0 } }, 1300).error, /Only the GM/);
  assert.match(L.shareSheet(sheets, { role: "player", name: "Des", character: "Ruth", owner: "" }, { key: "new1", sheet: {} }, 1300).error, /private id/);
  assert.equal(L.publicSheet(sheets.abc123).owner.id, undefined, "the owner's id isn't shown to anyone");
  assert.match(L.shareSheet(sheets, { role: "gm", name: "Sam" }, { key: "zz", sheet: {} }, 1300).error, /Only a player/);
  assert.match(L.shareSheet(sheets, ruth, { key: "bad key!", sheet: {} }, 1300).error, /no id/);
  assert.match(L.shareSheet(sheets, ruth, { key: "big", sheet: { x: "y".repeat(L.MAX_SHEET) } }, 1300).error, /too large/);
});

test("phase 2: the GM changes anyone's play state, a player only their own; values are checked", () => {
  const sheets = {};
  L.shareSheet(sheets, ruth, { key: "abc123", sheet: { name: "Ruth" }, play: { injury: 0, duty: 2 } }, 1000);
  const kim = { role: "player", name: "Kim", character: "Dr. Webb", owner: "h-kim" };
  assert.match(L.changePlay(sheets, kim, { key: "abc123", play: { injury: 1 } }, 1100).error, /Only the GM/);
  assert.equal(L.changePlay(sheets, ruth, { key: "abc123", play: { duty: 1 } }, 1100).entry.play.duty, 1);
  const e = L.changePlay(sheets, { role: "gm", name: "Sam" }, { key: "abc123", play: { injury: 2, dying: true, rounds: 4, spares: 1, form: true, stunned: false, ptrack: 1 } }, 1200).entry;
  assert.deepEqual(e.play, { injury: 2, duty: 1, dying: true, rounds: 4, spares: 1, form: true, stunned: false, ptrack: 1 });
  assert.match(L.changePlay(sheets, { role: "gm", name: "Sam" }, { key: "abc123", play: { injury: 9, duty: -1, dying: "yes" } }, 1300).error, /Nothing to change/);
  assert.match(L.changePlay(sheets, { role: "gm", name: "Sam" }, { key: "nobody", play: { injury: 1 } }, 1300).error, /isn't shared/);
});

test("the GM removes a player: their browser is banned and their characters unshared", () => {
  const t = table(), sheets = {};
  L.shareSheet(sheets, ruth, { key: "r1", sheet: { name: "Ruth" }, play: {} }, 1000);
  L.shareSheet(sheets, { role: "player", name: "Kim", character: "Webb", owner: "h-kim" }, { key: "w1", sheet: { name: "Webb" }, play: {} }, 1000);
  assert.deepEqual(L.removeOwner(t, sheets, "h-kim"), ["w1"]);
  assert.deepEqual(Object.keys(sheets), ["r1"]); assert.ok(L.isBanned(t, "h-kim")); assert.ok(!L.isBanned(t, "h-des"));
  assert.ok(!L.isBanned(t, ""), "a browser without an id can't be banned (it can still be disconnected)");
  for (let i = 0; i < L.MAX_BANNED + 5; i++) L.removeOwner(t, sheets, "h" + i);
  assert.equal(t.banned.length, L.MAX_BANNED);
  assert.deepEqual(L.presence([{ cid: "abc", role: "player", name: "Des", character: "Ruth", owner: "h-des" }]), [{ cid: "abc", role: "player", name: "Des", character: "Ruth" }], "presence carries the handle, never the owner id");
});
