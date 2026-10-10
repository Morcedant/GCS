// Run with: node --test discord-bot/test
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

test("/grimm rolls and offers a Grit point reroll to the roller only", async () => {
  const cmd = { type: 2, member: { user: { id: "42" } }, data: { name: "grimm", options: [
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

test("/grit tracks points per player, GM powers, new sessions, and rerolls spend points", async () => {
  const kv = new MemoryKV();
  const env2 = { ...env, GRIT: kv };
  const call = async (sub, { id = "42", gm = false, options = [] } = {}) => {
    const payload = { type: 2, guild_id: "G1", member: { user: { id }, permissions: gm ? String(1 << 5) : "0" },
      data: { name: "grit", options: [{ type: 1, name: sub, options }] } };
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
  const env2 = { ...env, GRIT: new MemoryKV() };
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
