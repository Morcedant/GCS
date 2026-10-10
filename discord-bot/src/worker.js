// USS Pelion dice bot: a Cloudflare Worker that answers Discord slash commands over HTTP.
// One self-contained file, so it can be pasted straight into the Cloudflare dashboard.
// Discord signs every request; unsigned or badly signed requests are rejected with 401.
//
// Settings (Cloudflare → Worker → Settings → Variables and Secrets):
//   DISCORD_PUBLIC_KEY       required, from the Discord Developer Portal
//   DISCORD_APPLICATION_ID   and DISCORD_BOT_TOKEN: only needed to register /pelion by visiting /register

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
    if (interaction.type === COMPONENT && interaction.data?.custom_id?.startsWith("reroll|")) return json(reroll(interaction));
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

function reroll(interaction) {
  const [, ownerId, baseStr, modStr] = interaction.data.custom_id.split("|");
  const user = userOf(interaction);
  if (user.id !== ownerId) {
    return { type: MESSAGE, data: { content: "Only the player who rolled can spend their Duty point on this roll.", flags: EPHEMERAL } };
  }
  const target = Number(baseStr) + Number(modStr);
  const r = resolve(rollDice(), target);
  const embed = { ...(interaction.message?.embeds?.[0] || {}) };
  embed.color = r.success ? GREEN : RED;
  embed.description = (embed.description || "") +
    `\n\n**Duty point reroll** (this result stands)\n🎲 ${r.dice.join(" + ")} = **${r.total}**  ·  **${r.success ? "SUCCESS" : "FAILURE"}**\n` +
    describe(r).join("\n");
  return { type: UPDATE_MESSAGE, data: { embeds: [embed], components: [] } };
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
  const res = await fetch(`https://discord.com/api/v10/applications/${String(env.DISCORD_APPLICATION_ID).trim()}/commands`, {
    method: "PUT",
    headers: { Authorization: `Bot ${String(env.DISCORD_BOT_TOKEN).trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify(COMMANDS),
  });
  return new Response(res.ok ? "Registered /pelion. It can take a minute to appear in Discord." : `Discord refused the command (${res.status}): ${await res.text()}`,
    { status: res.ok ? 200 : 502 });
}
