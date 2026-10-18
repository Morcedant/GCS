// @ts-check
/**
 * Legend Dynamics shared table: a Cloudflare Worker with one Durable Object per table.
 *
 *   POST /api/tables              { name, game }  → { code, gmKey, name }   start a table (the GM keeps the key)
 *   GET  /api/tables/CODE                         → { name, game, players }  does it exist, and what is it
 *   GET  /api/tables/CODE/ws      WebSocket: the table's live connection (see table.js for the messages)
 *
 * ALLOWED_ORIGINS (a var in wrangler.toml) lists the sites whose pages may connect, comma-separated, or "*".
 */
import { newCode, validCode, hashKey } from "./logic.js";
export { Table } from "./table.js";

/** @param {any} env @param {string} origin */
const originOk = (env, origin) => {
  const list = String(env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes("*") || !origin || list.includes(origin) || (origin === "null" && list.includes("null"));
};
/** @param {any} env @param {string} origin */
const cors = (env, origin) => ({
  "Access-Control-Allow-Origin": originOk(env, origin) ? origin || "*" : "null",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin",
});
/** @param {any} body @param {number} status @param {Record<string, string>} headers */
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const randomInt = (/** @type {number} */ n) => { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0] % n; };
const newKey = () => { const b = new Uint8Array(24); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };

export default {
  /** @param {Request} req @param {any} env */
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get("Origin") || "", h = cors(env, origin);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (!originOk(env, origin)) return json({ error: "This site isn't allowed to use the table server." }, 403, h);
    if (url.pathname === "/") return new Response("Legend Dynamics table server. Start or join a table from a character creator.", { headers: { "Content-Type": "text/plain", ...h } });

    if (url.pathname === "/api/tables" && req.method === "POST") {
      /** @type {any} */ let body = {};
      try { body = await req.json(); } catch { /* an empty body is fine */ }
      const gmKey = newKey(), gmKeyHash = await hashKey(gmKey);
      for (let i = 0; i < 5; i++) { // a code already in use is tried again
        const code = newCode(randomInt);
        const stub = env.TABLES.get(env.TABLES.idFromName(code));
        const r = await stub.fetch("https://table/init", { method: "POST", body: JSON.stringify({ name: body.name, game: body.game, gmKeyHash }) });
        if (r.ok) { const t = /** @type {any} */ (await r.json()); return json({ code, gmKey, name: t.name }, 201, h); }
        if (r.status !== 409) return json({ error: "The table couldn't be started." }, 500, h);
      }
      return json({ error: "No free table code: try again." }, 503, h);
    }

    const m = url.pathname.match(/^\/api\/tables\/([^/]+)(\/ws)?$/);
    if (m && req.method === "GET") {
      const code = decodeURIComponent(m[1]).toUpperCase();
      if (!validCode(code)) return json({ error: "That isn't a table code." }, 400, h);
      const stub = env.TABLES.get(env.TABLES.idFromName(code));
      if (m[2]) {
        if (req.headers.get("Upgrade") !== "websocket") return json({ error: "Connect with a WebSocket." }, 426, h);
        return stub.fetch(new Request("https://table/ws", req));
      }
      const r = await stub.fetch("https://table/info");
      return json(await r.json(), r.status, h);
    }
    return json({ error: "Not found." }, 404, h);
  },
};
