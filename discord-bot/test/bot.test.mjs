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

test("/pelion rolls and offers a Duty point reroll to the roller only", async () => {
  const cmd = { type: 2, member: { user: { id: "42" } }, data: { name: "pelion", options: [
    { name: "target", value: 16 }, { name: "modifier", value: -2 }, { name: "label", value: "Sensors" }] } };
  const { json } = await send(cmd);
  assert.equal(json.type, 4);
  assert.match(json.data.embeds[0].title, /Sensors: target 14/);
  assert.match(json.data.embeds[0].description, /16 −2 → \*\*14\*\*/);
  const button = json.data.components[0].components[0];
  assert.equal(button.custom_id, "reroll|42|16|-2|Sensors");

  const click = (id) => ({ type: 3, member: { user: { id } }, data: { custom_id: button.custom_id }, message: { embeds: json.data.embeds } });
  const other = await send(click("7"));
  assert.equal(other.json.data.flags, 64, "someone else gets a private refusal");
  const mine = await send(click("42"));
  assert.equal(mine.json.type, 7);
  assert.deepEqual(mine.json.data.components, [], "the button is removed after the reroll");
  assert.match(mine.json.data.embeds[0].description, /Duty point reroll/);
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

test("/duty tracks points per player, GM powers, new sessions, and rerolls spend points", async () => {
  const kv = new MemoryKV();
  const env2 = { ...env, DUTY: kv };
  const call = async (sub, { id = "42", gm = false, options = [] } = {}) => {
    const payload = { type: 2, guild_id: "G1", member: { user: { id }, permissions: gm ? String(1 << 5) : "0" },
      data: { name: "duty", options: [{ type: 1, name: sub, options }] } };
    const body = JSON.stringify(payload), ts = "1700000000";
    const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(ts + body))).toString("hex");
    const res = await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers: { "X-Signature-Ed25519": sig, "X-Signature-Timestamp": ts } }), env2);
    return (await res.json()).data;
  };
  assert.match((await call("show")).content, /\*\*2 Duty points\*\*/);
  assert.match((await call("spend")).content, /1 Duty point\*\* left/);
  assert.match((await call("spend")).content, /0 Duty points\*\* left/);
  assert.equal((await call("spend")).flags, 64, "can't go below zero");
  assert.equal((await call("gain", { id: "7", options: [{ name: "player", value: "42" }] })).flags, 64, "players can't award others");
  assert.match((await call("gain", { id: "9", gm: true, options: [{ name: "player", value: "42" }] })).content, /now has \*\*1 Duty point\*\*/);
  assert.equal((await call("newsession")).flags, 64, "only the GM starts a session");
  await call("newsession", { gm: true });
  assert.match((await call("show")).content, /\*\*2 Duty points\*\*/, "back to 2 after a new session");

  // Reroll button spends a point and refuses at zero.
  await call("set", { gm: true, options: [{ name: "player", value: "42" }, { name: "points", value: 1 }] });
  const click = async () => {
    const payload = { type: 3, guild_id: "G1", member: { user: { id: "42" } }, data: { custom_id: "reroll|42|14|0|Sensors" }, message: { embeds: [{ description: "x" }] } };
    const body = JSON.stringify(payload), ts = "1700000000";
    const sig = Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(ts + body))).toString("hex");
    return (await worker.fetch(new Request("https://bot.example/", { method: "POST", body, headers: { "X-Signature-Ed25519": sig, "X-Signature-Timestamp": ts } }), env2)).json();
  };
  const first = await click();
  assert.equal(first.type, 7);
  assert.match(first.data.embeds[0].description, /0 Duty points left/);
  const second = await click();
  assert.equal(second.data.flags, 64, "no points, no reroll");
});
