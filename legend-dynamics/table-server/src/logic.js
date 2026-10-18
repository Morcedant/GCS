// @ts-check
/**
 * The shared table's rules, with no Cloudflare code: what a message may say, how a roll is made and logged,
 * who is at the table. The Durable Object (table.js) keeps the state and the sockets; the tests import this file.
 *
 * The server rolls the dice, so a roll on the shared table is the same for everyone and nobody can fudge it.
 * The player's sheet works out the target (skill, circumstances, injury) and the server reports it with the roll.
 */
import { resolve } from "../../engine/rules/core.js";

// No 0/O or 1/I/L: a code read out across a table shouldn't be misheard.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const LOG_KEEP = 200; // rolls kept and sent to anyone joining
export const MAX_MESSAGE = 2048; // bytes; a roll request is a few hundred
export const RATE = { rolls: 20, perMs: 60_000 }; // per connection
export const REROLL_WITHIN_MS = 10 * 60_000; // a point reroll answers a recent roll
export const IDLE_DAYS = 30; // a table nobody has used for this long is deleted

/** A new table code. @param {(n: number) => number} randomInt a random integer below n */
export function newCode(randomInt) {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}
export const validCode = (/** @type {string} */ c) => new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(c);

/** Text from a client: no control characters, trimmed, at most max characters. @param {any} v @param {number} max */
export const cleanText = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const int = (/** @type {any} */ v, /** @type {number} */ lo, /** @type {number} */ hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

/** A new table's state. @param {{ name?: any, game?: any, gmKeyHash: string, now: number }} o */
export function newTable({ name, game, gmKeyHash, now }) {
  return { name: cleanText(name, 60) || "Shared table", game: cleanText(game, 30), gmKeyHash, created: now, active: now, seq: 0, log: /** @type {any[]} */ ([]) };
}

/**
 * Who a "hello" says is connecting. A GM must bring the table's key (checked by the caller: keyOk).
 * @param {any} msg @param {any} table @param {boolean} keyOk
 * @returns {{ who: { role: "gm" | "player", name: string, character: string } } | { error: string }}
 */
export function hello(msg, table, keyOk) {
  const role = msg.role === "gm" ? "gm" : "player";
  if (role === "gm" && !keyOk) return { error: "That isn't this table's GM key." };
  const game = cleanText(msg.game, 30);
  if (table.game && game && game !== table.game) return { error: `This table plays a different game (${table.game}). Open that game's creator to join.` };
  const name = cleanText(msg.name, 40), character = cleanText(msg.character, 60);
  if (role === "player" && !character && !name) return { error: "Give your name or your character's name." };
  return { who: { role, name: name || (role === "gm" ? "GM" : ""), character } };
}

/** A sliding-window rate check; returns the new window, or null when it's full. @param {number[]} times @param {number} now */
export function rateCheck(times, now) {
  const recent = (times || []).filter((t) => now - t < RATE.perMs);
  return recent.length >= RATE.rolls ? null : [...recent, now];
}

/**
 * A roll on the table: checks the request, rolls with the server's dice, logs it.
 * msg: { label, target, base?, mod?, attack?, called?, of? (the roll a point reroll answers) }
 * @param {any} table @param {{ role: string, name: string, character: string }} who @param {any} msg
 * @param {[number, number, number]} dice @param {number} now
 * @returns {{ entry: any } | { error: string }}
 */
export function roll(table, who, msg, dice, now) {
  const target = int(msg.target, -20, 40);
  if (target === null) return { error: "A roll needs a target from −20 to 40." };
  const label = cleanText(msg.label, 60) || "Roll";
  let of = null;
  if (msg.of !== undefined && msg.of !== null) {
    const prior = table.log.find((/** @type {any} */ e) => e.n === msg.of);
    if (!prior) return { error: "That roll isn't in the log any more." };
    if (prior.character !== who.character || prior.by !== who.name) return { error: "Only whoever made a roll can reroll it." };
    if (prior.rerolled) return { error: "That roll has already been rerolled: the second result stands." };
    if (prior.reroll) return { error: "A reroll can't be rerolled: it stands." };
    if (now - prior.at > REROLL_WITHIN_MS) return { error: "That roll is too old to reroll." };
    prior.rerolled = true;
    of = prior.n;
  }
  const r = resolve(dice, target);
  const attack = !!msg.attack, called = !!msg.called;
  const entry = {
    n: ++table.seq, at: now, by: who.name, character: who.character, role: who.role, label, target,
    base: int(msg.base, -20, 40), mod: int(msg.mod, -40, 40),
    dice: r.dice, total: r.total, success: r.success, auto: r.auto, margin: r.margin,
    attack, called, telling: attack && !called && r.success && (r.margin >= 5 || r.auto === "success"),
    reroll: of,
  };
  table.log.push(entry);
  if (table.log.length > LOG_KEEP) table.log.splice(0, table.log.length - LOG_KEEP);
  table.active = now;
  return { entry };
}

/** Who is connected, for everyone's list: GMs first, then players by name. @param {any[]} whos */
export const presence = (whos) => whos.filter(Boolean).map((w) => ({ role: w.role, name: w.name, character: w.character }))
  .sort((a, b) => (a.role === b.role ? (a.character || a.name).localeCompare(b.character || b.name) : a.role === "gm" ? -1 : 1));

/** SHA-256 of a GM key, as hex: the table keeps only this. @param {string} key */
export async function hashKey(key) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Server dice: three d6 from the platform's cryptographic random source, without modulo bias. */
export function serverDice() {
  const out = /** @type {number[]} */ ([]);
  const buf = new Uint8Array(1);
  while (out.length < 3) { crypto.getRandomValues(buf); if (buf[0] < 252) out.push(1 + (buf[0] % 6)); }
  return /** @type {[number, number, number]} */ (out);
}
