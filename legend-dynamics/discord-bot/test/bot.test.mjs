// Run with: npm test
import assert from "node:assert/strict";
import test from "node:test";
import worker, { odds, resolve } from "../src/worker.js";

test("roll-under with automatic results", () => {
  assert.equal(resolve([3, 3, 3], 11).success, true);
  assert.equal(resolve([4, 4, 4], 11).success, false);
  assert.equal(resolve([1, 1, 2], 2).success, true, "natural 4 always succeeds");
  assert.equal(resolve([1, 1, 2], 2).contestMargin, 0);
  assert.equal(resolve([6, 6, 5], 20).success, false, "natural 17 always fails");
  assert.equal(resolve([3, 3, 3], 14).margin, 5);
  assert.equal(Math.round(odds(10) * 1000), 500);
  assert.equal(Math.round(odds(16) * 1000), 981);
  assert.equal(Math.round(odds(1) * 1000), 19, "only natural 3–4");
});

const keys = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const pub = Buffer.from(await crypto.subtle.exportKey("raw", keys.publicKey)).toString("hex");
const env = { DISCORD_PUBLIC_KEY: pub };

async function send(payload, { badSignature = false } = {}) {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(timestamp + body))).toString("hex");
  const headers = { "X-Signature-Ed25519": badSignature ? "00".repeat(64) : sig, "X-Signature-Timestamp": timestamp };
  const res = await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers }), env);
  return { status: res.status, json: res.status === 200 ? await res.json() : null };
}

test("rejects bad signatures and answers PING", async () => {
  assert.equal((await send({ type: 1 }, { badSignature: true })).status, 401);
  assert.deepEqual((await send({ type: 1 })).json, { type: 1 });
});

test("/roll rolls and offers a Grit point reroll to the roller only", async () => {
  const cmd = { type: 2, member: { user: { id: "42" } }, data: { name: "roll", options: [
    { name: "target", value: 16 }, { name: "modifier", value: -2 }, { name: "label", value: "Tracking" }] } };
  const { json } = await send(cmd);
  assert.equal(json.type, 4);
  assert.match(json.data.embeds[0].title, /Tracking: target 14/);
  assert.match(json.data.embeds[0].description, /16 −2 → \*\*14\*\*/);
  const button = json.data.components[0].components[0];
  assert.equal(button.custom_id, "reroll|42|16|-2|Tracking");

  const click = (id) => ({ type: 3, member: { user: { id } }, data: { custom_id: button.custom_id }, message: { embeds: json.data.embeds } });
  const other = await send(click("7"));
  assert.equal(other.json.data.flags, 64, "someone else gets a private refusal");
  const mine = await send(click("42"));
  assert.equal(mine.json.type, 7);
  assert.deepEqual(mine.json.data.components, [], "the button is removed after the reroll");
  assert.match(mine.json.data.embeds[0].description, /Grit point reroll/);
});

test("GET /register explains missing settings instead of failing silently", async () => {
  const res = await worker.fetch(new Request("https://bot.example/register"), env);
  assert.equal(res.status, 400);
  assert.match(await res.text(), /DISCORD_APPLICATION_ID/);
});

test("status page reports settings, and a key pasted with spaces still verifies", async () => {
  const page = await (await worker.fetch(new Request("https://bot.example/"), env)).text();
  assert.match(page, /OK  DISCORD_PUBLIC_KEY is set/);
  const spaced = { DISCORD_PUBLIC_KEY: ` ${pub.slice(0, 32)} ${pub.slice(32).toUpperCase()}\n` };
  const body = JSON.stringify({ type: 1 }), ts = "1700000000";
  const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(ts + body))).toString("hex");
  const res = await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers: { "X-Signature-Ed25519": sig, "X-Signature-Timestamp": ts } }), spaced);
  assert.equal(res.status, 200);
  const missing = await (await worker.fetch(new Request("https://bot.example/"), {})).text();
  assert.match(missing, /!!  DISCORD_PUBLIC_KEY is missing/);
});

class MemoryKV {
  constructor() { this.m = new Map(); }
  async get(k, type) { const v = this.m.get(k); return v == null ? null : type === "json" ? JSON.parse(v) : v; }
  async put(k, v) { this.m.set(k, String(v)); }
}

test("/points tracks points per player, GM powers, new sessions, and rerolls spend points", async () => {
  const kv = new MemoryKV();
  const env2 = { ...env, STORE: kv };
  const call = async (sub, { id = "42", gm = false, options = [] } = {}) => {
    const payload = { type: 2, guild_id: "G1", member: { user: { id }, permissions: gm ? String(1 << 5) : "0" },
      data: { name: "points", options: [{ type: 1, name: sub, options }] } };
    const body = JSON.stringify(payload), ts = "1700000000";
    const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(ts + body))).toString("hex");
    const res = await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers: { "X-Signature-Ed25519": sig, "X-Signature-Timestamp": ts } }), env2);
    return (await res.json()).data;
  };
  assert.match((await call("show")).content, /\*\*2 Grit points\*\*/);
  assert.match((await call("spend")).content, /1 Grit point\*\* left/);
  assert.match((await call("spend")).content, /0 Grit points\*\* left/);
  assert.equal((await call("spend")).flags, 64, "can't go below zero");
  assert.equal((await call("gain", { id: "7", options: [{ name: "player", value: "42" }] })).flags, 64, "players can't award others");
  assert.match((await call("gain", { id: "9", gm: true, options: [{ name: "player", value: "42" }] })).content, /now has \*\*1 Grit point\*\*/);
  assert.equal((await call("newsession")).flags, 64, "only the GM starts a session");
  await call("newsession", { gm: true });
  assert.match((await call("show")).content, /\*\*2 Grit points\*\*/, "back to 2 after a new session");

  // Reroll button spends a point and refuses at zero.
  await call("set", { gm: true, options: [{ name: "player", value: "42" }, { name: "points", value: 1 }] });
  const click = async () => {
    const payload = { type: 3, guild_id: "G1", member: { user: { id: "42" } }, data: { custom_id: "reroll|42|14|0|Tracking" }, message: { embeds: [{ description: "x" }] } };
    const body = JSON.stringify(payload), ts = "1700000000";
    const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(ts + body))).toString("hex");
    return (await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers: { "X-Signature-Ed25519": sig, "X-Signature-Timestamp": ts } }), env2)).json();
  };
  const first = await click();
  assert.equal(first.type, 7);
  assert.match(first.data.embeds[0].description, /0 Grit points left/);
  const second = await click();
  assert.equal(second.data.flags, 64, "no points, no reroll");
});

test("/clock creates, ticks, shows and removes clocks; near misses are flagged", async () => {
  const env2 = { ...env, STORE: new MemoryKV() };
  const call = async (sub, options = []) => {
    const payload = { type: 2, guild_id: "G1", member: { user: { id: "42" }, permissions: "0" }, data: { name: "clock", options: [{ type: 1, name: sub, options }] } };
    const body = JSON.stringify(payload), ts = "1700000000";
    const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(ts + body))).toString("hex");
    return (await (await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers: { "X-Signature-Ed25519": sig, "X-Signature-Timestamp": ts } }), env2)).json()).data;
  };
  assert.match((await call("new", [{ name: "name", value: "The mob forms" }, { name: "segments", value: 4 }])).content, /○○○○ 0\/4/);
  assert.match((await call("tick", [{ name: "name", value: "the MOB forms" }, { name: "segments", value: 3 }])).content, /●●●○ 3\/4/);
  assert.match((await call("tick", [{ name: "name", value: "The mob forms" }])).content, /It happens/);
  assert.equal((await call("tick", [{ name: "name", value: "Nope" }])).flags, 64);
  assert.match((await call("show")).content, /The mob forms/);
  assert.match((await call("remove", [{ name: "name", value: "The mob forms" }])).content, /Removed/);
  assert.match((await call("show")).content, /No clocks/);
  const { describe, resolve } = await import("../src/worker.js");
  assert.ok(describe(resolve([5, 4, 4], 11)).some((l) => /success at a cost/.test(l)), "miss by 2");
  assert.ok(!describe(resolve([5, 5, 4], 11)).some((l) => /success at a cost/.test(l)), "miss by 3");
  assert.ok(!describe(resolve([6, 6, 5], 16)).some((l) => /success at a cost/.test(l)), "natural 17 never");
});

test("contest follows the guide's opposed rules, and assist adds the helper's bonus", async () => {
  const { contestWinner, assistBonus } = await import("../src/worker.js");
  const R = (d, t) => resolve(d, t);
  assert.equal(contestWinner(R([3, 3, 3], 12), R([6, 6, 4], 12)), "me", "success beats failure");
  assert.equal(contestWinner(R([2, 2, 3], 14), R([3, 3, 3], 14)), "me", "larger margin wins");
  assert.equal(contestWinner(R([3, 3, 3], 12), R([3, 3, 3], 12)), "opponent", "tie favors the defender");
  assert.equal(contestWinner(R([6, 6, 4], 10), R([6, 6, 4], 10), "me"), "me", "double failure favors the defender (me)");
  assert.equal(contestWinner(R([1, 1, 2], 2), R([3, 3, 3], 12)), "opponent", "automatic success counts as margin 0");
  assert.equal(assistBonus(R([3, 3, 3], 14)), 2);
  assert.equal(assistBonus(R([4, 4, 4], 14)), 1);
  assert.equal(assistBonus(R([6, 5, 5], 14)), 0);

  const call = async (name, options) => {
    const payload = { type: 2, guild_id: "G1", member: { user: { id: "42" } }, data: { name, options } };
    const body = JSON.stringify(payload), ts = "1700000000";
    const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(ts + body))).toString("hex");
    return (await (await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers: { "X-Signature-Ed25519": sig, "X-Signature-Timestamp": ts } }), env)).json()).data;
  };
  const c = await call("contest", [{ name: "target", value: 13 }, { name: "opponent", value: 12 }, { name: "opponent_name", value: "Blutbad" }, { name: "label", value: "Grapple" }]);
  assert.match(c.embeds[0].title, /^Grapple: (you win|Blutbad wins)$/);
  assert.match(c.embeds[0].description, /Defender: Blutbad/);
  const a = await call("assist", [{ name: "target", value: 14 }, { name: "helper_target", value: 14 }, { name: "helper", value: "7" }]);
  assert.match(a.embeds[0].description, /<@7> rolls under/);
  assert.match(a.embeds[0].title, /target 1[456]$/);
  assert.match(a.components[0].components[0].custom_id, /^reroll\|42\|14\|[012]\|$/);
});

async function signedCall(env2, payload) {
  const body = JSON.stringify(payload), ts = "1700000000";
  const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(ts + body))).toString("hex");
  return (await (await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers: { "X-Signature-Ed25519": sig, "X-Signature-Timestamp": ts } }), env2)).json()).data;
}
const sub = (name, s, options = [], { gm = false, id = "42" } = {}) =>
  ({ type: 2, guild_id: "G1", member: { user: { id }, permissions: gm ? String(1 << 5) : "0" }, data: { name, options: [{ type: 1, name: s, options }] } });

test("/game switches the server's setting: point names, tracks and seeds follow", async () => {
  const env2 = { ...env, STORE: new MemoryKV() };
  assert.match((await signedCall(env2, sub("game", "show"))).content, /Iron Roads.*Grit points.*Heat, Whispers, The Dark/);
  assert.equal((await signedCall(env2, sub("game", "set", [{ name: "game", value: "spaceopera" }]))).flags, 64, "only the GM");
  assert.match((await signedCall(env2, sub("game", "set", [{ name: "game", value: "spaceopera" }], { gm: true }))).content, /Starward/);
  assert.match((await signedCall(env2, sub("points", "show"))).content, /2 Resolve points/);
  const roll = await signedCall(env2, { type: 2, guild_id: "G1", member: { user: { id: "42" } }, data: { name: "roll", options: [{ name: "target", value: 12 }] } });
  assert.equal(roll.components[0].components[0].label, "Spend a Resolve point to reroll");
  assert.match(roll.embeds[0].footer.text, /Starward/);
  assert.match((await signedCall(env2, sub("track", "show"))).content, /Shields.*Hull/s);
  const other = await signedCall({ ...env2, STORE: new MemoryKV(), DEFAULT_GAME: "spaceopera" }, sub("game", "show"));
  assert.match(other.content, /Starward/, "DEFAULT_GAME picks the starting game");
});

test("/track marks, clears and resets the game's tracks, with each box's meaning", async () => {
  const env2 = { ...env, STORE: new MemoryKV() };
  assert.match((await signedCall(env2, sub("track", "mark", [{ name: "name", value: "dark" }]))).content, /\*\*The Dark\*\* ■□□□ 1\/4: Dogs howl/);
  assert.match((await signedCall(env2, sub("track", "mark", [{ name: "name", value: "Heat" }, { name: "boxes", value: 9 }]))).content, /■■■■ 4\/4: A warrant/);
  assert.match((await signedCall(env2, sub("track", "clear", [{ name: "name", value: "heat" }]))).content, /3\/4/);
  assert.equal((await signedCall(env2, sub("track", "mark", [{ name: "name", value: "Hull" }]))).flags, 64, "not a track in this game");
  const shown = (await signedCall(env2, sub("track", "show"))).content;
  assert.match(shown, /Trouble/); assert.match(shown, /Whispers\*\* □□□□ 0\/4: Nobody's talking/);
  assert.equal((await signedCall(env2, sub("track", "reset"))).flags, 64);
  assert.match((await signedCall(env2, sub("track", "reset", [], { gm: true }))).content, /Every track is clear/);
  assert.equal((await signedCall({ ...env }, sub("track", "show"))).flags, 64, "needs storage");
});

test("/seed rolls one entry from each of the game's tables, without storage", async () => {
  const { PACKS, rollSeed } = await import("../src/worker.js");
  const rows = rollSeed(PACKS.western, () => 0);
  assert.deepEqual(rows[0], ["Job", "A body found drained of blood"]);
  const seed = await signedCall(env, { type: 2, guild_id: "G1", member: { user: { id: "42" } }, data: { name: "seed" } });
  const lines = seed.embeds[0].description.split("\n");
  assert.equal(lines.filter((l) => l.startsWith("**")).length, Object.keys(PACKS.western.seeds).length);
  assert.match(seed.embeds[0].description, /\*\*Ticking clock:\*\* .+ \([2468] segments\)/);
  assert.match(seed.embeds[0].description, /Start the clock: `\/clock new name:.+ segments:[2468]`/);
  assert.ok(!/,\d/.test(seed.embeds[0].description), "no raw arrays");
  assert.match(seed.embeds[0].title, /Job seed/);
});

test("USS Pelion and Grimm are games too, and their old storage bindings still work", async () => {
  const { PACKS } = await import("../src/worker.js");
  assert.equal(PACKS.pelion.point, "Duty"); assert.equal(PACKS.grimm.point, "Grit");
  assert.equal(PACKS.pelion.tracks.length, 8); assert.equal(Object.keys(PACKS.grimm.seeds).length, 6);
  assert.equal(PACKS.grimm.seeds.mission[0], "Case");

  // A Pelion Worker's DUTY binding: storage works and the server starts on USS Pelion.
  const pel = { ...env, DUTY: new MemoryKV() };
  assert.match((await signedCall(pel, sub("game", "show"))).content, /USS Pelion.*Duty points.*Shields, Hull/);
  assert.match((await signedCall(pel, sub("points", "show"))).content, /2 Duty points/);
  assert.match((await signedCall(pel, sub("track", "mark", [{ name: "name", value: "life" }]))).content, /\*\*Life support\*\* ■□□ 1\/3: Damaged: −2/);
  const roll = await signedCall(pel, { type: 2, guild_id: "G1", member: { user: { id: "42" } }, data: { name: "roll", options: [{ name: "target", value: 16 }] } });
  assert.equal(roll.components[0].components[0].label, "Spend a Duty point to reroll");
  assert.match(roll.embeds[0].footer.text, /USS Pelion/);
  const page = await (await worker.fetch(new Request("https://bot.example/"), pel)).text();
  assert.match(page, /OK  DUTY storage is connected/);

  // A Grimm Worker's GRIT binding.
  const gr = { ...env, GRIT: new MemoryKV() };
  assert.match((await signedCall(gr, sub("track", "mark", [{ name: "name", value: "exposure" }]))).content, /Exposure\*\* ■□□□ 1\/4: Odd stories/);
  const seed = await signedCall(gr, { type: 2, guild_id: "G1", member: { user: { id: "42" } }, data: { name: "seed" } });
  assert.match(seed.embeds[0].title, /Case seed/);
  assert.match(seed.embeds[0].description, /\*\*The hidden world:\*\*/);

  // The GM can switch a server to Grimm on the shared bot.
  const shared = { ...env, STORE: new MemoryKV() };
  await signedCall(shared, sub("game", "set", [{ name: "game", value: "grimm" }], { gm: true }));
  assert.match((await signedCall(shared, sub("track", "show"))).content, /Suspicion.*Exposure.*Attention/s);
  const { COMMANDS } = await import("../src/worker.js");
  const choices = COMMANDS.find((c) => c.name === "game").options[1].options[0].choices.map((c) => c.name);
  assert.deepEqual([...choices].sort(), ["Grimm", "Iron Roads", "Starward", "USS Pelion"]);
});

test("the old /duty, /grit, /pelion and /grimm names still work, and register on their own Workers", async () => {
  const pel = { ...env, DUTY: new MemoryKV() };
  assert.match((await signedCall(pel, sub("duty", "show"))).content, /2 Duty points/);
  const gr = { ...env, GRIT: new MemoryKV() };
  assert.match((await signedCall(gr, sub("grit", "spend"))).content, /1 Grit point\*\* left/);
  const r = await signedCall(pel, { type: 2, guild_id: "G1", member: { user: { id: "42" } }, data: { name: "pelion", options: [{ name: "target", value: 16 }] } });
  assert.equal(r.components[0].components[0].label, "Spend a Duty point to reroll");
  const g = await signedCall(gr, { type: 2, guild_id: "G1", member: { user: { id: "42" } }, data: { name: "grimm", options: [{ name: "target", value: 12 }] } });
  assert.match(g.embeds[0].footer.text, /Grimm/);

  const { commandsFor } = await import("../src/worker.js");
  const names = (e) => commandsFor(e).map((c) => c.name);
  assert.deepEqual(names({ DUTY: {} }).slice(-4), ["pelion", "duty", "grimm", "grit"], "every Worker registers all four old names");
  assert.deepEqual(names({}).slice(-4), ["pelion", "duty", "grimm", "grit"]);
  assert.ok(!names({ LEGACY_COMMANDS: "no" }).includes("grit"));
  // On the Pelion Worker, /grit works too (points named for the server's game).
  assert.match((await signedCall(pel, sub("grit", "show"))).content, /Duty points/);
  const unknown = await signedCall(pel, { type: 2, guild_id: "G1", member: { user: { id: "42" } }, data: { name: "phaser" } });
  assert.match(unknown.content, /doesn't know \/phaser.*\/register/);
  const notGM = await signedCall(pel, sub("game", "set", [{ name: "game", value: "grimm" }]));
  assert.match(notGM.content, /Manage Server/);
  assert.match((await signedCall(env, sub("game", "set", [{ name: "game", value: "grimm" }], { gm: true }))).content, /needs the bot's storage/);
  const duty = commandsFor({ DUTY: {} }).find((c) => c.name === "duty");
  assert.match(duty.description, /Duty points/); assert.equal(duty.options.length, 5);
});
