// @ts-check
/**
 * One shared table: a Durable Object holding the table's state and everyone's WebSocket.
 * It uses WebSocket hibernation, so an idle table costs nothing while players sit connected.
 *
 * Client → server
 *   { type: "hello", role: "player" | "gm", name, character, game, key? }   first, once
 *   { type: "roll", req, label, target, base?, mod?, attack?, called?, of? } of: the roll a point reroll answers
 *   { type: "ping" }
 * Server → client
 *   { type: "welcome", table: { name, game }, you, log, players }
 *   { type: "roll", entry, req? }         to everyone; req only to the roller, matching its request
 *   { type: "rerolled", n }               the roll a reroll answered (marked in everyone's log)
 *   { type: "players", players }
 *   { type: "error", error, req? }
 *   { type: "pong" }
 */
import { newTable, hello, roll, rateCheck, presence, hashKey, serverDice, MAX_MESSAGE, IDLE_DAYS } from "./logic.js";

const DAY = 86_400_000;

export class Table {
  /** @param {any} ctx @param {any} env */
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    /** @type {any} */ this.table = null;
    ctx.blockConcurrencyWhile(async () => { this.table = (await ctx.storage.get("table")) || null; });
  }
  async save() { await this.ctx.storage.put("table", this.table); }

  /** @param {Request} req */
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/init") {
      if (this.table) return Response.json({ error: "exists" }, { status: 409 });
      const b = /** @type {any} */ (await req.json());
      this.table = newTable({ name: b.name, game: b.game, gmKeyHash: b.gmKeyHash, now: Date.now() });
      await this.save();
      await this.ctx.storage.setAlarm(Date.now() + IDLE_DAYS * DAY);
      return Response.json({ name: this.table.name });
    }
    if (!this.table) return Response.json({ error: "There's no table with that code. Check it with your GM." }, { status: 404 });
    if (path === "/info") return Response.json({ name: this.table.name, game: this.table.game, players: this.whos().length });
    if (path === "/ws") {
      const pair = new WebSocketPair(), [client, server] = [pair[0], pair[1]];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ who: null, times: [] });
      return new Response(null, { status: 101, webSocket: client });
    }
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  /** Everyone who has said hello (but the socket that is leaving). @param {any} [leaving] */
  whos(leaving) { return this.ctx.getWebSockets().filter((/** @type {any} */ ws) => ws !== leaving).map((/** @type {any} */ ws) => (ws.deserializeAttachment() || {}).who).filter(Boolean); }
  /** @param {any} msg @param {any} [except] */
  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) if (ws !== except && (ws.deserializeAttachment() || {}).who) try { ws.send(s); } catch { /* gone */ }
  }
  /** @param {any} ws @param {any} msg */
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* gone */ } }

  /** @param {any} ws @param {string | ArrayBuffer} data */
  async webSocketMessage(ws, data) {
    if (!this.table) { this.send(ws, { type: "error", error: "This table has closed." }); ws.close(1008, "no table"); return; }
    if (typeof data !== "string" || data.length > MAX_MESSAGE) { this.send(ws, { type: "error", error: "That message was too large." }); return; }
    /** @type {any} */ let msg;
    try { msg = JSON.parse(data); } catch { this.send(ws, { type: "error", error: "That wasn't a message the table understands." }); return; }
    const att = ws.deserializeAttachment() || { who: null, times: [] };

    if (msg.type === "ping") { this.send(ws, { type: "pong" }); return; }
    if (msg.type === "hello") {
      const keyOk = msg.role === "gm" && typeof msg.key === "string" && (await hashKey(msg.key)) === this.table.gmKeyHash;
      const r = hello(msg, this.table, keyOk);
      if ("error" in r) { this.send(ws, { type: "error", error: r.error }); ws.close(1008, "refused"); return; }
      att.who = r.who; ws.serializeAttachment(att);
      this.send(ws, { type: "welcome", table: { name: this.table.name, game: this.table.game }, you: r.who, log: this.table.log, players: presence(this.whos()) });
      this.broadcast({ type: "players", players: presence(this.whos()) }, ws);
      return;
    }
    if (!att.who) { this.send(ws, { type: "error", error: "Say hello first." }); return; }
    if (msg.type === "roll") {
      const now = Date.now(), times = rateCheck(att.times, now);
      if (!times) { this.send(ws, { type: "error", req: msg.req, error: "Too many rolls at once: wait a moment." }); return; }
      att.times = times; ws.serializeAttachment(att);
      const r = roll(this.table, att.who, msg, serverDice(), now);
      if ("error" in r) { this.send(ws, { type: "error", req: msg.req, error: r.error }); return; }
      await this.save();
      await this.ctx.storage.setAlarm(now + IDLE_DAYS * DAY);
      if (r.entry.reroll) this.broadcast({ type: "rerolled", n: r.entry.reroll });
      this.send(ws, { type: "roll", entry: r.entry, req: msg.req });
      this.broadcast({ type: "roll", entry: r.entry }, ws);
      return;
    }
    this.send(ws, { type: "error", req: msg.req, error: "That isn't something the table does." });
  }

  /** @param {any} ws */
  async webSocketClose(ws) {
    try { ws.close(); } catch { /* already closed */ }
    this.broadcast({ type: "players", players: presence(this.whos(ws)) }, ws);
  }
  /** @param {any} ws */
  async webSocketError(ws) { await this.webSocketClose(ws); }

  // A table nobody has rolled on for IDLE_DAYS days is deleted.
  async alarm() {
    if (!this.table) return;
    if (Date.now() - this.table.active >= IDLE_DAYS * DAY && !this.whos().length) { this.table = null; await this.ctx.storage.deleteAll(); return; }
    await this.ctx.storage.setAlarm(Math.max(Date.now() + DAY, this.table.active + IDLE_DAYS * DAY));
  }
}
