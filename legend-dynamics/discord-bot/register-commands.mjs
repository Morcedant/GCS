// Registers the Legend Dynamics slash commands from a terminal. (Visiting your Worker's /register page does the same.)
//   DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... node register-commands.mjs
import { COMMANDS } from "./src/worker.js";

const appId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_BOT_TOKEN;
if (!appId || !token) {
  console.error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN first (both are on your app's page in the Discord Developer Portal).");
  process.exit(1);
}
const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(COMMANDS),
});
if (!res.ok) {
  console.error(`Discord refused the command (${res.status}): ${await res.text()}`);
  process.exit(1);
}
console.log("Registered /roll, /contest, /assist, /points, /clock, /track, /seed and /game. It can take a minute to appear in Discord.");
