// @ts-check
/**
 * The shared table's rules, with no Cloudflare code: what a message may say, how a roll is made and logged,
 * who is at the table. The Durable Object (table.js) keeps the state and the sockets; the tests import this file.
 *
 * The server rolls the dice, so a roll on the shared table is the same for everyone and nobody can fudge it.
 * The player's sheet works out the target (skill, circumstances, injury) and the server reports it with the roll.
 */
// The core rules' roll (engine/rules/core.js resolve), copied so this folder deploys on its own;
// test/logic.test.mjs checks the two agree whenever the engine is beside it.
/** @param {[number, number, number]} dice @param {number} target */
export function resolve(dice, target) {
  const total = dice[0] + dice[1] + dice[2];
  const auto = total <= 4 ? "success" : total >= 17 ? "failure" : null;
  const success = auto === "success" || (auto === null && total <= target);
  return { dice, total, target, success, auto, margin: target - total };
}

// No 0/O or 1/I/L: a code read out across a table shouldn't be misheard.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const LOG_KEEP = 200; // rolls kept and sent to anyone joining
export const MAX_MESSAGE = 2048; // bytes; a roll request is a few hundred
export const MAX_SHEET = 32_768; // a character sheet (without its portrait) is a few kilobytes
export const MAX_SHEETS = 12; // characters shared at one table
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
  return { who: { role, name: name || (role === "gm" ? "GM" : ""), character, owner: "" } }; // owner: set by the caller from the browser's private id
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
    if (prior.character !== who.character || prior.by !== who.name || (prior.owner || "") !== (who.owner || "")) return { error: "Only whoever made a roll can reroll it." };
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
    reroll: of, owner: who.owner || "",
  };
  table.log.push(entry);
  if (table.log.length > LOG_KEEP) table.log.splice(0, table.log.length - LOG_KEEP);
  table.active = now;
  return { entry };
}

/** Who is connected, for everyone's list: GMs first, then players by name. @param {any[]} whos */
export const presence = (whos) => whos.filter(Boolean).map((w) => ({ cid: w.cid, role: w.role, name: w.name, character: w.character }))
  .sort((a, b) => (a.role === b.role ? (a.character || a.name).localeCompare(b.character || b.name) : a.role === "gm" ? -1 : 1));

/** SHA-256 of a GM key, as hex: the table keeps only this. @param {string} key */
export async function hashKey(key) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The GMs allowed to start tables: the GM_CODES secret, one "Name: code" per line or comma (a bare code is "GM").
 * No entries: anyone may start a table. Joining a table never needs one; its own code is the door.
 * @param {any} text @returns {{ name: string, code: string }[]}
 */
export function parseAccess(text) {
  return String(text ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const i = s.indexOf(":");
    return i < 0 ? { name: "GM", code: s } : { name: s.slice(0, i).trim() || "GM", code: s.slice(i + 1).trim() };
  }).filter((a) => a.code);
}

/** The name an access code belongs to, or null. Hashes are compared, not the codes themselves. @param {{ name: string, code: string }[]} list @param {any} given */
export async function checkAccess(list, given) {
  const g = String(given ?? "").trim();
  if (!g) return null;
  const h = await hashKey(g);
  let who = null;
  for (const a of list) if ((await hashKey(a.code)) === h && who === null) who = a.name;
  return who;
}

/** Server dice: three d6 from the platform's cryptographic random source, without modulo bias. */
export function serverDice() {
  const out = /** @type {number[]} */ ([]);
  const buf = new Uint8Array(1);
  while (out.length < 3) { crypto.getRandomValues(buf); if (buf[0] < 252) out.push(1 + (buf[0] % 6)); }
  return /** @type {[number, number, number]} */ (out);
}

// ---- phase 2: shared characters ----
// A player's sheet is shared with the table under its character's id (key). Its play state (injury, points, ammo,
// form) is the part both sides change: the player on their sheet, the GM on their cards or in the encounter panel.
// The table keeps one copy of it, and every change goes to everyone.

/** The play state the table shares, cleaned: anything else is dropped. @param {any} p */
export function cleanPlay(p) {
  const out = /** @type {Record<string, any>} */ ({});
  if (!p || typeof p !== "object") return out;
  const n = (/** @type {string} */ k, /** @type {number} */ lo, /** @type {number} */ hi) => { const v = int(p[k], lo, hi); if (v !== null) out[k] = v; };
  n("injury", 0, 3); n("duty", 0, 30); n("ptrack", 0, 30); n("rounds", 0, 200); n("spares", 0, 50);
  for (const k of ["dying", "stunned", "form"]) if (typeof p[k] === "boolean") out[k] = p[k];
  if (Array.isArray(p.lasting) && p.lasting.length <= 12 && JSON.stringify(p.lasting).length <= 3000) out.lasting = p.lasting;
  return out;
}
const validKey = (/** @type {any} */ k) => typeof k === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(k);

/**
 * A player shares (or updates) their character. The first sharer of a key owns it.
 * @param {Record<string, any>} sheets @param {{ role: string, name: string, character: string }} who @param {any} msg @param {number} now
 * @returns {{ entry: any } | { error: string }}
 */
export function shareSheet(sheets, who, msg, now) {
  if (who.role !== "player") return { error: "Only a player shares a character." };
  if (!validKey(msg.key)) return { error: "That character has no id." };
  if (!msg.sheet || typeof msg.sheet !== "object" || Array.isArray(msg.sheet)) return { error: "That isn't a character." };
  if (JSON.stringify(msg.sheet).length > MAX_SHEET) return { error: "That character is too large to share (remove its portrait?)." };
  if (!who.owner) return { error: "Reload the page to share your character (it needs this browser's private id)." };
  const had = sheets[msg.key];
  if (had && had.owner.id !== who.owner) return { error: `That character is ${had.owner.name}'s at this table.` };
  if (!had && Object.keys(sheets).length >= MAX_SHEETS) return { error: `A table shares at most ${MAX_SHEETS} characters.` };
  const sheet = { ...msg.sheet }; delete sheet.play; delete sheet.portrait;
  const play = had ? had.play : cleanPlay(msg.play); // the table's copy wins once it has one
  const entry = { key: msg.key, owner: { id: who.owner, name: who.name, character: cleanText(sheet.name, 60) || who.character }, sheet, play, rev: (had ? had.rev : 0) + 1, at: now };
  sheets[msg.key] = entry;
  return { entry };
}

/**
 * A change to a shared character's play state: the GM for anyone, a player for their own.
 * @param {Record<string, any>} sheets @param {{ role: string, name: string }} who @param {any} msg @param {number} now
 * @returns {{ entry: any } | { error: string }}
 */
export function changePlay(sheets, who, msg, now) {
  const had = validKey(msg.key) && sheets[msg.key];
  if (!had) return { error: "That character isn't shared at this table." };
  if (who.role !== "gm" && (!who.owner || had.owner.id !== who.owner)) return { error: "Only the GM or the character's player can change it." };
  const patch = cleanPlay(msg.play);
  if (!Object.keys(patch).length) return { error: "Nothing to change." };
  had.play = { ...had.play, ...patch }; had.rev++; had.at = now;
  return { entry: had };
}

/** A shared character as everyone may see it: without its owner's private id. @param {any} e */
export const publicSheet = (e) => ({ ...e, owner: { name: e.owner.name, character: e.owner.character } });
/** A roll as everyone may see it: without its roller's private id. @param {any} e */
export const publicEntry = (e) => { const { owner, ...rest } = e; void owner; return rest; };

// ---- the GM's controls: remove a player, change the code ----
export const MAX_BANNED = 50;
/** A random integer below n, from the platform's cryptographic source. @param {number} n */
export const cryptoInt = (n) => { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0] % n; };
/** A connection's public handle, for the GM's Remove button. */
export const newCid = () => newCode(cryptoInt).toLowerCase();
/** Whether a browser was removed from this table. @param {any} table @param {string} owner */
export const isBanned = (table, owner) => !!owner && (table.banned || []).includes(owner);
/**
 * Remove a player's browser: it can't rejoin (until it clears its storage, which the code change then covers),
 * and the characters it shared stop being shared. Returns the keys unshared.
 * @param {any} table @param {Record<string, any>} sheets @param {string} owner
 */
export function removeOwner(table, sheets, owner) {
  if (owner && !isBanned(table, owner)) table.banned = [...(table.banned || []), owner].slice(-MAX_BANNED);
  const keys = Object.keys(sheets).filter((k) => owner && sheets[k].owner.id === owner);
  for (const k of keys) delete sheets[k];
  return keys;
}

// ---- phase 3: the fight, shared ----
// The GM's page runs the encounter and the battle map, as it always has; it sends the table a scene (the map without
// pictures, and the fight's order, injuries and latest lines), which the table keeps and passes to every player.
// Players can drag their own token (the move goes to the GM's map) and, on their turn, ask for an action; the GM runs it.
export const MAX_SCENE = 65_536;

/** The GM's scene: { map?, fight? }, kept as sent (it's only shown). @param {any} who @param {any} msg */
export function checkScene(who, msg) {
  if (who.role !== "gm") return { error: "Only the GM shares the map and the fight." };
  const scene = { map: msg.map && typeof msg.map === "object" ? msg.map : null, fight: msg.fight && typeof msg.fight === "object" ? msg.fight : null };
  if (JSON.stringify(scene).length > MAX_SCENE) return { error: "The map is too large to share." };
  return { scene };
}
const ownsKey = (/** @type {Record<string, any>} */ sheets, /** @type {any} */ who, /** @type {any} */ key) => who.role === "player" && validKey(key) && sheets[key] && who.owner && sheets[key].owner.id === who.owner;

/** A player moves their own token: { key, to: { q, r } | { lane, y } }. @param {Record<string, any>} sheets @param {any} who @param {any} msg */
export function checkMove(sheets, who, msg) {
  if (!ownsKey(sheets, who, msg.key)) return { error: "You can move only your own character." };
  const t = msg.to || {}, n = (/** @type {any} */ v) => Number.isInteger(v) && Math.abs(v) <= 10_000;
  const to = n(t.q) && n(t.r) ? { q: t.q, r: t.r } : n(t.lane) && t.lane >= 0 && t.lane <= 20 ? { lane: t.lane, y: Number.isFinite(t.y) ? Math.round(t.y) : 0 } : null;
  if (!to) return { error: "That isn't a place on the map." };
  return { move: { key: msg.key, by: sheets[msg.key].owner.character, to } };
}

/** A player asks for an action on their turn: { key, pid, action, target?, weapon?, note? }. @param {Record<string, any>} sheets @param {any} who @param {any} msg */
export function checkAsk(sheets, who, msg) {
  if (!ownsKey(sheets, who, msg.key)) return { error: "You can ask only for your own character." };
  const action = ["attack", "aim", "other"].includes(msg.action) ? msg.action : null;
  if (!action) return { error: "Choose what you want to do." };
  const id = (/** @type {any} */ v) => (typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : null);
  return { ask: { key: msg.key, by: sheets[msg.key].owner.character, pid: id(msg.pid), action, target: id(msg.target), weapon: id(msg.weapon), note: cleanText(msg.note, 200) } };
}
