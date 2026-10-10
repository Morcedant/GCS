// USS Pelion dice bot: a Cloudflare Worker that answers Discord slash commands over HTTP.
// One self-contained file, so it can be pasted straight into the Cloudflare dashboard.
// Discord signs every request; unsigned or badly signed requests are rejected with 401.
//
// Settings (Cloudflare → Worker → Settings → Variables and Secrets):
//   DISCORD_PUBLIC_KEY       required, from the Discord Developer Portal
//   DISCORD_APPLICATION_ID   and DISCORD_BOT_TOKEN: only needed to register commands by visiting /register
// Binding (Settings → Bindings → KV namespace):
//   DUTY                     optional; turns on /duty and makes the reroll button spend a real Duty point

// ---- Rules: 3d6 roll-under, as written in the Players' Guide ----

export const MIN_TARGET = 1;
export const MAX_TARGET = 30;

export function rollDice(random = Math.random) {
  return [0, 0, 0].map(() => 1 + Math.floor(random() * 6));
}

/**
 * Resolve a roll against an adjusted target.
 * Natural 3–4 always succeeds; natural 17–18 always fails.
 * An automatic success above its target counts as margin 0 in a contest.
 */
export function resolve(dice, target) {
  const total = dice[0] + dice[1] + dice[2];
  const auto = total <= 4 ? "success" : total >= 17 ? "failure" : null;
  const success = auto === "success" || (auto === null && total <= target);
  const margin = target - total;
  return {
    dice,
    total,
    target,
    success,
    auto,
    margin,
    contestMargin: success ? Math.max(0, margin) : margin,
  };
}

// Ways to roll each total on 3d6, index 0 = total 3.
const WAYS = [1, 3, 6, 10, 15, 21, 25, 27, 27, 25, 21, 15, 10, 6, 3, 1];

/** Chance of success against a target, including the automatic results. */
export function odds(target) {
  let ways = 0;
  for (let t = 3; t <= 18; t++) if (t <= 4 || (t <= 16 && t <= target)) ways += WAYS[t - 3];
  return ways / 216;
}

const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");

/** Text lines for a result, shared by the first roll and a Duty point reroll. */
export function describe(r) {
  const lines = [];
  if (r.auto === "success") lines.push(`Natural ${r.total}: automatic success.` + (r.margin < 0 ? " Counts as margin 0 in a contest." : ""));
  else if (r.auto === "failure") lines.push(`Natural ${r.total}: automatic failure.`);
  else lines.push(r.success ? `Succeeded by ${r.margin}.` : `Failed by ${-r.margin}.`);
  if (r.success && r.margin >= 5) lines.push("Margin 5+: as an assistant this gives +2; in medical care it clears an extra box.");
  if (r.total === 18) lines.push("As an assistant, an 18 introduces a complication.");
  if (!r.success && !r.auto && r.margin >= -2) lines.push(`Missed by ${-r.margin}: the GM may offer success at a cost.`);
  return lines;
}

export function targetLine(base, modifier) {
  return modifier ? `${base} ${signed(modifier)} → **${base + modifier}**` : `**${base}**`;
}

// ---- Slash command ----

export const COMMANDS = [
  {
    name: "pelion",
    description: "Roll 3d6 under your target (USS Pelion rules)",
    options: [
      { type: 4, name: "target", description: "Skill or attribute from your sheet, e.g. 16 for Sensors 16", required: true, min_value: 1, max_value: 30 },
      { type: 4, name: "modifier", description: "Total of circumstance, assistance, advantage and injury modifiers, e.g. -2", required: false, min_value: -12, max_value: 12 },
      { type: 3, name: "label", description: "What you're rolling, e.g. Sensors", required: false, max_length: 40 },
    ],
  },
  {
    name: "duty",
    description: "Track Duty points (start each session with 2)",
    options: [
      { type: 1, name: "show", description: "Show Duty points", options: [{ type: 6, name: "player", description: "Whose points (default: yours)", required: false }] },
      { type: 1, name: "spend", description: "Spend one of your Duty points" },
      { type: 1, name: "gain", description: "Gain a Duty point (the GM can award one to a player)",
        options: [{ type: 6, name: "player", description: "GM only: who receives the point", required: false }] },
      { type: 1, name: "set", description: "GM: set a player's Duty points",
        options: [{ type: 6, name: "player", description: "Player", required: true }, { type: 4, name: "points", description: "New total", required: true, min_value: 0, max_value: 20 }] },
      { type: 1, name: "newsession", description: "GM: start a new session; everyone goes back to 2" },
    ],
  },
  {
    name: "clock",
    description: "Progress and danger clocks for the table",
    options: [
      { type: 1, name: "new", description: "Start a clock",
        options: [
          { type: 3, name: "name", description: "e.g. Warp core breach", required: true, max_length: 40 },
          { type: 4, name: "segments", description: "4 urgent, 6 substantial, 8 long", required: true, choices: [{ name: "4", value: 4 }, { name: "6", value: 6 }, { name: "8", value: 8 }] },
          { type: 3, name: "kind", description: "Danger fills on failures; progress on successes", required: false, choices: [{ name: "danger", value: "danger" }, { name: "progress", value: "progress" }] },
        ] },
      { type: 1, name: "tick", description: "Fill segments on a clock",
        options: [
          { type: 3, name: "name", description: "Which clock", required: true },
          { type: 4, name: "segments", description: "How many (default 1; use -1 to undo)", required: false, min_value: -8, max_value: 8 },
        ] },
      { type: 1, name: "show", description: "Show all clocks" },
      { type: 1, name: "remove", description: "Remove a clock", options: [{ type: 3, name: "name", description: "Which clock", required: true }] },
    ],
  },
];

// ---- Discord request handling ----

const PING = 1, COMMAND = 2, COMPONENT = 3;
const PONG = 1, MESSAGE = 4, UPDATE_MESSAGE = 7;
const EPHEMERAL = 64;
const GREEN = 0x52e3a0, RED = 0xff6a5c;

export default {
  async fetch(request, env) {
    if (request.method === "GET" && new URL(request.url).pathname === "/register") return registerCommands(env);
    if (request.method !== "POST") return statusPage(env);
    const body = await request.text();
    const ok = await verify(request, body, env.DISCORD_PUBLIC_KEY);
    if (!ok) return new Response("Bad request signature.", { status: 401 });

    const interaction = JSON.parse(body);
    if (interaction.type === PING) return json({ type: PONG });
    if (interaction.type === COMMAND && interaction.data?.name === "pelion") return json(rollCommand(interaction));
    if (interaction.type === COMMAND && interaction.data?.name === "duty") return json(await dutyCommand(interaction, env));
    if (interaction.type === COMMAND && interaction.data?.name === "clock") return json(await clockCommand(interaction, env));
    if (interaction.type === COMPONENT && interaction.data?.custom_id?.startsWith("reroll|")) return json(await reroll(interaction, env));
    return json({ type: MESSAGE, data: { content: "Unknown command.", flags: EPHEMERAL } });
  },
};

async function verify(request, body, publicKeyHex) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const keyHex = cleanKey(publicKeyHex);
  if (!signature || !timestamp || !keyHex) return false;
  const data = new TextEncoder().encode(timestamp + body);
  // Standard Ed25519 first; older Workers runtimes only know the NODE-ED25519 name.
  for (const alg of [{ name: "Ed25519" }, { name: "NODE-ED25519", namedCurve: "NODE-ED25519" }]) {
    try {
      const key = await crypto.subtle.importKey("raw", hex(keyHex), alg, false, ["verify"]);
      return await crypto.subtle.verify(alg, key, hex(signature), data);
    } catch {
      // try the next algorithm name
    }
  }
  return false;
}

// Copying the Public Key often brings spaces or a line break along; Discord's key is 64 hex characters.
const cleanKey = (k) => {
  const v = String(k || "").replace(/\s+/g, "").toLowerCase();
  return /^[0-9a-f]{64}$/.test(v) ? v : "";
};

// Visiting the Worker's address shows which settings it can see, without revealing them.
function statusPage(env) {
  const check = (ok, good, bad) => `${ok ? "OK " : "!! "} ${ok ? good : bad}`;
  const lines = [
    "USS Pelion dice bot is running.",
    "",
    check(!!cleanKey(env.DISCORD_PUBLIC_KEY), "DISCORD_PUBLIC_KEY is set and looks right.",
      env.DISCORD_PUBLIC_KEY ? "DISCORD_PUBLIC_KEY is set but isn't 64 hex characters. Copy the Public Key again from General Information."
        : "DISCORD_PUBLIC_KEY is missing. Add it under Settings > Variables and Secrets."),
    check(/^\d{15,25}$/.test(String(env.DISCORD_APPLICATION_ID || "").trim()), "DISCORD_APPLICATION_ID is set.",
      "DISCORD_APPLICATION_ID is missing or not a number (only needed for /register)."),
    check(!!env.DUTY, "DUTY storage is connected: /duty and /clock work, and rerolls spend points.",
      "DUTY storage isn't connected (optional): bind a KV namespace named DUTY to turn on /duty."),
    check(!!env.DISCORD_BOT_TOKEN, "DISCORD_BOT_TOKEN is set (you can delete it after /register works).",
      "DISCORD_BOT_TOKEN is not set (only needed for /register)."),
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function rollCommand(interaction) {
  const opts = Object.fromEntries((interaction.data.options || []).map((o) => [o.name, o.value]));
  const base = clampInt(opts.target);
  const modifier = Number.isInteger(opts.modifier) ? opts.modifier : 0;
  const label = String(opts.label || "").replace(/\|/g, "/").trim().slice(0, 40);
  const user = userOf(interaction);
  const r = resolve(rollDice(), base + modifier);

  return {
    type: MESSAGE,
    data: {
      embeds: [{
        title: `${label || "3d6 roll"}: target ${base + modifier}`,
        color: r.success ? GREEN : RED,
        description: `<@${user.id}> rolls 3d6 under ${targetLine(base, modifier)}\n` +
          `🎲 ${r.dice.join(" + ")} = **${r.total}**  ·  **${r.success ? "SUCCESS" : "FAILURE"}**\n` + describe(r).join("\n"),
        footer: { text: `${Math.round(odds(base + modifier) * 100)}% chance · USS Pelion NCC-1750` },
      }],
      components: [{
        type: 1,
        components: [{ type: 2, style: 2, label: "Spend a Duty point to reroll", custom_id: `reroll|${user.id}|${base}|${modifier}|${label}` }],
      }],
    },
  };
}

async function reroll(interaction, env) {
  const [, ownerId, baseStr, modStr] = interaction.data.custom_id.split("|");
  const user = userOf(interaction);
  if (user.id !== ownerId) {
    return { type: MESSAGE, data: { content: "Only the player who rolled can spend their Duty point on this roll.", flags: EPHEMERAL } };
  }
  let left = null;
  if (env.DUTY) {
    const guild = guildOf(interaction);
    const have = await getDuty(env, guild, user.id);
    if (have <= 0) return { type: MESSAGE, data: { content: "You have no Duty points left this session.", flags: EPHEMERAL } };
    left = have - 1;
    await setDuty(env, guild, user.id, left);
  }
  const target = Number(baseStr) + Number(modStr);
  const r = resolve(rollDice(), target);
  const embed = { ...(interaction.message?.embeds?.[0] || {}) };
  embed.color = r.success ? GREEN : RED;
  embed.description = (embed.description || "") +
    `\n\n**Duty point reroll** (this result stands${left === null ? "" : ` · ${left} Duty point${left === 1 ? "" : "s"} left`})\n🎲 ${r.dice.join(" + ")} = **${r.total}**  ·  **${r.success ? "SUCCESS" : "FAILURE"}**\n` +
    describe(r).join("\n");
  return { type: UPDATE_MESSAGE, data: { embeds: [embed], components: [] } };
}

// ---- Duty points ----
// Stored per server and player. Each server has a session number; a player's record from an
// earlier session counts as the starting 2, so /duty newsession is a single write.

const START_DUTY = 2;
const MANAGE_GUILD = 1n << 5n;
const guildOf = (interaction) => interaction.guild_id || "dm";
const isGM = (interaction) => !interaction.guild_id || (BigInt(interaction.member?.permissions || "0") & MANAGE_GUILD) !== 0n;

async function sessionOf(env, guild) {
  return Number(await env.DUTY.get(`session:${guild}`)) || 1;
}
async function getDuty(env, guild, userId) {
  const [rec, session] = await Promise.all([env.DUTY.get(`duty:${guild}:${userId}`, "json"), sessionOf(env, guild)]);
  return rec && rec.session === session ? rec.points : START_DUTY;
}
async function setDuty(env, guild, userId, points) {
  await env.DUTY.put(`duty:${guild}:${userId}`, JSON.stringify({ points, session: await sessionOf(env, guild) }));
}

async function dutyCommand(interaction, env) {
  const reply = (content, priv = false) => ({ type: MESSAGE, data: { content, flags: priv ? EPHEMERAL : 0, allowed_mentions: { parse: [] } } });
  if (!env.DUTY) {
    return reply("Duty point tracking isn't switched on yet. Bind a KV namespace named DUTY to the Worker (see the bot's README).", true);
  }
  const sub = interaction.data.options?.[0] || {};
  const opt = Object.fromEntries((sub.options || []).map((o) => [o.name, o.value]));
  const me = userOf(interaction).id, guild = guildOf(interaction);
  const pts = (n) => `${n} Duty point${n === 1 ? "" : "s"}`;
  const gmOnly = () => reply("Only the GM (someone with Manage Server) can do that.", true);

  switch (sub.name) {
    case "show": {
      const who = opt.player || me;
      return reply(`<@${who}> has **${pts(await getDuty(env, guild, who))}**.`);
    }
    case "spend": {
      const have = await getDuty(env, guild, me);
      if (have <= 0) return reply("You have no Duty points left this session.", true);
      await setDuty(env, guild, me, have - 1);
      return reply(`<@${me}> spends a Duty point and has **${pts(have - 1)}** left.`);
    }
    case "gain": {
      const who = opt.player || me;
      if (who !== me && !isGM(interaction)) return gmOnly();
      const now = (await getDuty(env, guild, who)) + 1;
      await setDuty(env, guild, who, now);
      return reply(`<@${who}> gains a Duty point and now has **${pts(now)}**.`);
    }
    case "set": {
      if (!isGM(interaction)) return gmOnly();
      await setDuty(env, guild, opt.player, opt.points);
      return reply(`<@${opt.player}> now has **${pts(opt.points)}**.`);
    }
    case "newsession": {
      if (!isGM(interaction)) return gmOnly();
      await env.DUTY.put(`session:${guild}`, String((await sessionOf(env, guild)) + 1));
      return reply(`New session. Everyone starts with **${pts(START_DUTY)}**; unused points from last session are gone.`);
    }
  }
  return reply("Unknown /duty option.", true);
}

// ---- Clocks ----
// Stored per server in the same KV namespace as Duty points: { [lowercased name]: {name, size, filled, kind} }.

const clockBar = (c) => "●".repeat(Math.min(c.filled, c.size)) + "○".repeat(Math.max(0, c.size - c.filled));
const clockLine = (c) => `**${c.name}** (${c.kind}) ${clockBar(c)} ${c.filled}/${c.size}` +
  (c.filled >= c.size ? (c.kind === "danger" ? "  **It happens.**" : "  **Done.**") : "");

async function clockCommand(interaction, env) {
  const reply = (content, priv = false) => ({ type: MESSAGE, data: { content, flags: priv ? EPHEMERAL : 0, allowed_mentions: { parse: [] } } });
  if (!env.DUTY) return reply("Clocks need the bot's storage. Bind a KV namespace named DUTY to the Worker (see the bot's README).", true);
  const sub = interaction.data.options?.[0] || {};
  const opt = Object.fromEntries((sub.options || []).map((o) => [o.name, o.value]));
  const key = `clocks:${guildOf(interaction)}`;
  const all = (await env.DUTY.get(key, "json")) || {};
  const id = String(opt.name || "").trim().toLowerCase();
  const save = () => env.DUTY.put(key, JSON.stringify(all));
  switch (sub.name) {
    case "new": {
      if (Object.keys(all).length >= 20 && !all[id]) return reply("This server already has 20 clocks. Remove one first.", true);
      all[id] = { name: String(opt.name).trim().slice(0, 40), size: opt.segments, filled: 0, kind: opt.kind === "progress" ? "progress" : "danger" };
      await save();
      return reply(`New clock: ${clockLine(all[id])}`);
    }
    case "tick": {
      const c = all[id];
      if (!c) return reply(`No clock called "${opt.name}". Use /clock show to see them.`, true);
      c.filled = Math.max(0, Math.min(c.size, c.filled + (Number.isInteger(opt.segments) ? opt.segments : 1)));
      await save();
      return reply(clockLine(c));
    }
    case "show": {
      const list = Object.values(all);
      return reply(list.length ? list.map(clockLine).join("\n") : "No clocks running. Start one with /clock new.");
    }
    case "remove": {
      if (!all[id]) return reply(`No clock called "${opt.name}".`, true);
      const name = all[id].name; delete all[id]; await save();
      return reply(`Removed the clock **${name}**.`);
    }
  }
  return reply("Unknown /clock option.", true);
}

const userOf = (interaction) => interaction.member?.user || interaction.user || { id: "0" };
const clampInt = (v) => Math.max(MIN_TARGET, Math.min(MAX_TARGET, Number.isInteger(v) ? v : 10));
const json = (data) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
const hex = (s) => new Uint8Array(s.match(/../g).map((b) => parseInt(b, 16)));

// Registers /pelion with Discord. Safe to repeat: it replaces the command list with the same one.
async function registerCommands(env) {
  if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_BOT_TOKEN) {
    return new Response("Add DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN to the Worker's settings, then reload this page.", { status: 400 });
  }
  const put = () => fetch(`https://discord.com/api/v10/applications/${String(env.DISCORD_APPLICATION_ID).trim()}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${String(env.DISCORD_BOT_TOKEN).trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify(COMMANDS),
  });
  let res = await put();
  // Discord rate-limits command registration. Wait out a short limit once instead of failing.
  if (res.status === 429) {
    const wait = Number((await res.clone().json().catch(() => ({}))).retry_after) || 0;
    if (wait > 0 && wait <= 60) {
      await new Promise((r) => setTimeout(r, Math.ceil(wait * 1000) + 500));
      res = await put();
    }
  }
  if (res.ok) return new Response("Registered /pelion, /duty and /clock. They can take a minute to appear in Discord.");
  const detail = await res.text();
  const hint = res.status === 429 ? "\n\nDiscord is rate-limiting registration. Wait a minute or two, then reload this page once."
    : res.status === 401 ? "\n\nThe bot token is wrong or was reset. Reset it on the Bot page and update DISCORD_BOT_TOKEN." : "";
  return new Response(`Discord refused the command (${res.status}): ${detail}${hint}`, { status: 502 });
}
