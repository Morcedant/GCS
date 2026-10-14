# Legend Dynamics dice bot

One Discord bot for all six games: the Legend Dynamics settings **Trails of Blood & Dust**, **Fracture Lines**, **The Shattered Crown** and **Aurora**, plus
**USS Pelion** and **Grimm**. Each server picks its game with `/game`. The bot then names points correctly
(**Grit** in Trails of Blood & Dust and Grimm, **Resolve** in Fracture Lines, **Fortune** in The Shattered Crown, **Spark** in Aurora, **Duty** in USS Pelion) and shows that game's
tracks and seed tables. Here's how you roll:

```
/roll target:13 modifier:-2 label:Shooting
```

The bot rolls 3d6 under the adjusted target (13 − 2 = 11) and reports:

- success or failure, and the margin
- natural 3–4 (always a success) and 17–18 (always a failure)
- the chance of success
- "success at a cost" when a roll misses by 1 or 2

A **Spend a Grit point to reroll** button lets the player who rolled reroll once, and the second
result stands.

It runs free on **Cloudflare Workers** (100,000 requests a day on the free plan). Discord sends each
command to the Worker's web address, so there is no server to keep running.

## Commands

| Command | What it does |
|---|---|
| `/roll target:13 modifier:-2 label:Shooting` | Rolls 3d6 under your target, with the point reroll button |
| `/contest target:13 opponent:14 opponent_name:Werewolf label:Grapple` | Rolls both sides and names the winner by the core rules. One success beats a failure. If both succeed, the larger margin wins. Ties and double failures go to the defender: the opponent, unless you set `defender:me`. |
| `/assist target:12 helper_target:14 helper:@Ruth label:"Hold the door"` | The helper rolls first: success gives +1, success by 5 or more +2, and a natural 18 adds a complication. Then you roll with that bonus. |
| `/seed` | Rolls an adventure seed: one line from each of the game's tables (job, place, the darkness, twist, ticking clock, key character) |
| `/game show` · `/game set game:Fracture Lines` | Shows or sets this server's game (GM): Trails of Blood & Dust, Fracture Lines, The Shattered Crown, Aurora, Grimm or USS Pelion |

### With storage connected

| Command | Who | What it does |
|---|---|---|
| `/points show [player]` | anyone | Shows your points, or another player's |
| `/points spend` · `/points gain` | player | Spends or gains one of your points (e.g. for an accepted complication) |
| `/points gain player:@name` · `/points set player:@name points:N` | GM | Awards a point, or corrects a player's total |
| `/points newsession` | GM | Starts a new session: everyone goes back to 2. Players with Extra Grit then use `/points gain` once. |
| `/clock new name:"The mob forms" segments:4 kind:danger` | anyone | Starts a clock of 2, 4, 6 or 8 segments, as danger or progress |
| `/clock tick name:"The mob forms"` · `/clock show` · `/clock remove` | anyone | Fills segments (add `segments:2`, or `-1` to undo), lists every clock, or removes one |
| `/track show` | anyone | The game's shared tracks and what each one means right now, e.g. **The Dark** ■■□□ 2/4: Signs and warnings |
| `/track mark name:dark` · `/track clear name:heat boxes:2` | anyone | Marks or clears boxes. A partial name works ("dark" finds The Dark). |
| `/track reset` | GM | Clears every track |

"GM" means anyone with the **Manage Server** permission. Each server keeps its own points, clocks and tracks.
Tracks are kept separately per game, so switching games doesn't lose them. With storage connected, the reroll
button spends a real point and refuses when you have none.

## Already running the Pelion or Grimm bot?

You don't need a new bot. Use your existing one:

1. Open your existing Worker (`pelion-dice` or `grimm-dice`) and choose **Edit code**.
2. Paste in this [`src/worker.js`](src/worker.js) and **Deploy**.
3. Add `DISCORD_BOT_TOKEN` back for a moment, open `/register` once, then delete the token again.

What carries over:

- Your `DUTY` or `GRIT` storage keeps working, and your clocks carry over.
- Each server starts on that bot's game: USS Pelion for the Pelion bot, Grimm for the Grimm bot.
- Each player's points start fresh at 2.

What changes for players:

- The old commands still work: `/pelion` or `/grimm` rolls, and `/duty` or `/grit` tracks points.
  `/register` adds all four to every Worker, alongside the new commands. Points take the server's game's
  name, so `/grit` on a USS Pelion server shows Duty points.
- The new names work too: `/roll` and `/points`, plus `/track`, `/seed` and `/game`.
- The reroll button still says Duty or Grit.

If you'd rather not see the old names, add the setting `LEGACY_COMMANDS` = `no` and open `/register` again.

Any server on that bot can now also switch games with `/game set`.

## Set it up from scratch (about 15 minutes, no installs)

Make it its own Discord application and Cloudflare Worker (`legend-dice`). The steps are the same as for the
Pelion and Grimm bots.

### 1. Create the Discord application

1. Go to <https://discord.com/developers/applications> and choose **New Application**. Name it, e.g. *Legend Dice*.
2. On **General Information**, copy the **Application ID** and the **Public Key**.
3. On **Bot**, choose **Reset Token** and copy the token. Keep it private; you only need it once, to register the commands.

### 2. Create the Worker

1. Sign up at <https://dash.cloudflare.com>. It's free, and Workers need no card.
2. Open **Workers & Pages → Create**. On the "Make something new" screen choose **Start with Hello World!**,
   name it `legend-dice`, and **Deploy** the starter. Skip Connect GitHub/GitLab and Upload your static files.
3. Choose **Edit code** (top right). Replace everything in the open file (`worker.js` or `index.js`) with the
   contents of [`src/worker.js`](src/worker.js), then **Deploy**.
4. In the Worker's **Settings → Variables and Secrets**, add:
   - `DISCORD_PUBLIC_KEY` = the Public Key
   - `DISCORD_APPLICATION_ID` = the Application ID
   - `DISCORD_BOT_TOKEN` = the bot token (choose type **Secret**)
   - `DEFAULT_GAME` = `western`, `spaceopera`, `fantasy`, `aurora`, `grimm` or `pelion` (optional). This is the game a server starts on; without it, servers start on Trails of Blood & Dust.
5. Note the Worker's address, like `https://legend-dice.YOUR-NAME.workers.dev`.

### 3. Connect storage (optional, but needed for points, clocks, tracks and `/game set`)

1. In Cloudflare, open **Storage & databases → Workers KV → Create**, and name it `legend-store`.
2. Open the `legend-dice` Worker, then **Settings → Bindings → Add → KV namespace**. Set **Variable name** to `STORE`
   and pick `legend-store`. Save; this redeploys the Worker.

The free plan allows 1,000 storage changes a day, which is plenty for a table.

### 4. Connect Discord

1. Back on the Discord app's **General Information** page, paste the Worker address into
   **Interactions Endpoint URL** and save. Discord checks the address immediately, so if it saves, the connection works.
2. Open `https://legend-dice.YOUR-NAME.workers.dev/register` in your browser. You should see
   "Registered /roll, /contest, /assist, /points, /clock, /track, /seed and /game." After that you can delete
   `DISCORD_BOT_TOKEN` from the Worker settings.
3. On the app's **Installation** page, make sure **Guild Install** includes the `applications.commands` scope.
   Then open the install link and pick your server. The bot needs no other permissions.
4. In Discord, the GM runs `/game set` to choose the setting.

New commands can take a minute to appear.

## Updating the bot or adding a setting

The bot's game data lives between `/* PACKS:START */` and `/* PACKS:END */` in `src/worker.js`. The
`python3 tools/build-legend.py` command rewrites that data from two places:

- Every `legend-dynamics/packs/*/pack.json`.
- The files in [`games/`](games), for USS Pelion and Grimm. Their tracks are written there, and their seed tables
  are read from `uss-pelion/index.html` and `grimm-west/index.html`.

A new pack therefore appears in `/game set` automatically.

After any update:

1. Paste the new `src/worker.js` into **Edit code** and **Deploy**.
2. Add `DISCORD_BOT_TOKEN` back for a moment and open `/register` once, so Discord learns the new game list.
3. Delete the token again.

## Developing locally

Node 20 or newer:

```
npm test                 # rules, Discord request handling, points, clocks, tracks, seeds and games
npx wrangler deploy      # deploy from the terminal instead of the dashboard
npx wrangler secret put DISCORD_PUBLIC_KEY
DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... npm run register
```

## If it isn't working

Open the Worker's address (`https://legend-dice.YOUR-NAME.workers.dev`) in a browser first.

| What you see | What it means |
|---|---|
| "Hello World!" | The bot code wasn't deployed. Paste `src/worker.js` again in **Edit code** and press **Deploy**. |
| An error page (e.g. 1101) | Only part of the code was pasted. Paste the whole file again and **Deploy**. |
| "Legend Dynamics dice bot is running." with `!!` lines | A setting is missing or mistyped; the line says which. |
| All `OK` lines | The Worker is fine; check the Discord side below. |

If there's a problem on the Discord side:

- **"Interactions endpoint URL could not be verified"** when saving: the Public Key in Cloudflare doesn't match this
  app's General Information page, or the URL is wrong. Use the exact `https://…workers.dev` address with nothing after it.
- **`/register` shows "Discord refused the command (401)"**: the bot token is wrong or was reset. Reset it again on the
  **Bot** page and update `DISCORD_BOT_TOKEN`.
- **The commands don't appear in Discord**: either the app isn't installed on that server (see the Installation step),
  or Discord hasn't refreshed yet. Press Ctrl+R (Cmd+R on a Mac) in Discord.
- **"The application did not respond"**: the Interactions Endpoint URL points somewhere else, or the Worker code is out of date.
- **"…need the bot's storage"**: bind the KV namespace as `STORE` (step 3).
- **"Only the GM can change the game"**: `/game set` needs the **Manage Server** permission on that Discord server.
- **"This bot doesn't know /…"**, or a command is missing from the list: Discord still has the old command list.
  Add `DISCORD_BOT_TOKEN` back, open `/register`, check that it names the command, then press Ctrl+R in Discord.
