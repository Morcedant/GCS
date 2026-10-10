# Grimm dice bot

This is a copy of the USS Pelion bot with Grimm names: `/grimm` instead of `/pelion` and Grit points instead of Duty points. Set it up as its **own** Discord application and its **own** Cloudflare Worker (`grimm-dice`), so the two games never share commands or points. If you've set up the Pelion bot before, the steps are identical.

A Discord slash command for the Grimm rules:

```
/grimm target:13 modifier:-2 label:Tracking
```

The bot rolls 3d6 under the adjusted target (13 − 2 = 11) and reports success or failure, the margin,
natural 3–4 and 17–18, and the success chance. A **Spend a Grit point to reroll** button lets the
player who rolled reroll once; the second result stands, as the guide says. Players still track their
own Grit points on the sheet.

It runs free on **Cloudflare Workers** (100,000 requests a day on the free plan). Discord sends each
command to the Worker's web address, so there is no server to keep running.

## Set it up (about 15 minutes, no installs)

### 1. Create the Discord application

1. Go to <https://discord.com/developers/applications> and choose **New Application**. Name it, e.g. *Grimm Dice*.
2. On **General Information**, copy the **Application ID** and the **Public Key**.
3. On **Bot**, choose **Reset Token** and copy the token. Keep it private; it's only needed once, to register the command.

### 2. Create the Worker

1. Sign up at <https://dash.cloudflare.com> (free; no card needed for Workers).
2. Open **Workers & Pages → Create**. On the "Make something new" screen choose **Start with Hello World!**,
   name it `grimm-dice`, and **Deploy** the starter. (Skip Connect GitHub/GitLab and Upload your static files.)
3. Choose **Edit code** (top right), replace everything in the open file (`worker.js` or `index.js`) with the
   contents of [`src/worker.js`](src/worker.js), and **Deploy**.
4. In the Worker's **Settings → Variables and Secrets**, add:
   - `DISCORD_PUBLIC_KEY` = the Public Key
   - `DISCORD_APPLICATION_ID` = the Application ID
   - `DISCORD_BOT_TOKEN` = the bot token (choose type **Secret**)
5. Note the Worker's address, like `https://grimm-dice.YOUR-NAME.workers.dev`.

### 3. Connect them

1. Back on the Discord app's **General Information** page, paste the Worker address into
   **Interactions Endpoint URL** and save. Discord checks it immediately; if it saves, the signature check works.
2. Open `https://grimm-dice.YOUR-NAME.workers.dev/register` in your browser. You should see
   "Registered /grimm." After that you can delete `DISCORD_BOT_TOKEN` from the Worker settings.
3. On the app's **Installation** page, make sure **Guild Install** includes the `applications.commands` scope,
   then open the install link and pick your server. The bot needs no other permissions.

Type `/grimm` in your server to roll. New commands can take a minute to appear.

## Contests and assistance

| Command | What it does |
|---|---|
| `/contest target:13 opponent:12 opponent_name:"Blutbad" label:Grapple` | Rolls both sides and names the winner by the guide's rules: one success beats a failure; if both succeed the larger margin wins; ties and double failures go to the defender (the opponent unless you set `defender:me`). Add `modifier` / `opponent_modifier` for penalties. |
| `/assist target:12 helper_target:14 helper:@Gus label:"Hold the door"` | Rolls the helper first: success +1, success by 5 or more +2, failure +0, a natural 18 adds a complication. Then rolls your lead roll with that bonus, with the usual Grit point reroll button. |

## Track Grit points (optional)

With storage connected, the bot keeps each player's Grit points per server:

| Command | Who | What it does |
|---|---|---|
| `/grit show [player]` | anyone | Shows your points, or another player's |
| `/grit spend` | player | Spends one of your points (not below 0) |
| `/grit gain` | player | Gains a point, e.g. when you accept a complication |
| `/grit gain player:@name` | GM | Awards a point to a player |
| `/grit set player:@name points:N` | GM | Corrects a player's total |
| `/grit newsession` | GM | New session: everyone back to 2, as the guide says |

"GM" means anyone with the **Manage Server** permission. Everyone starts at 2. The **Spend a Grit point to reroll**
button then takes a real point and refuses when you have none.

To switch it on (free; Workers KV allows 1,000 changes a day):

1. In Cloudflare, open **Storage & databases → Workers KV → Create**, and name it `grimm-grit`.
2. Open the `grimm-dice` Worker → **Settings → Bindings → Add → KV namespace**. Set **Variable name** to `GRIT`
   and pick `grimm-grit`. Save; this redeploys the Worker.
3. Paste the latest [`src/worker.js`](src/worker.js) in **Edit code** and **Deploy**.
4. Add `DISCORD_BOT_TOKEN` back for a moment, open `/register` once (it should say "Registered /grimm and /grit"),
   then delete the token again.

The Worker's home page shows "GRIT storage is connected" when it's working.

## Clocks (needs the same storage as Grit points)

| Command | What it does |
|---|---|
| `/clock new name:"The mob forms" segments:4 kind:danger` | Starts a clock (4, 6 or 8 segments; danger or progress) |
| `/clock tick name:"The mob forms"` | Fills one segment; add `segments:2`, or `-1` to undo |
| `/clock show` | Lists every clock on this server, e.g. **The mob forms** ●●●○ 3/4 |
| `/clock remove name:"The mob forms"` | Removes a clock |

After updating the Worker code, add `DISCORD_BOT_TOKEN` back for a moment and open `/register` once more
("Registered /grimm, /contest, /assist, /grit and /clock"), then delete the token again.

Rolls that fail by 1 or 2 now say "the GM may offer success at a cost", following the guide.

## Options

| Option | Required | Meaning |
|---|---|---|
| `target` | yes | The skill or attribute number from the sheet, 1–30 |
| `modifier` | no | Total of circumstance, assistance, advantage and injury modifiers, −12 to +12 |
| `label` | no | What you're rolling, shown as the title |

## Developing locally

Node 20 or newer:

```
npm test                 # rules and Discord request handling, with a generated signing key
npx wrangler deploy      # deploy from the terminal instead of the dashboard
npx wrangler secret put DISCORD_PUBLIC_KEY
DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... npm run register
```

## If it isn't working

Open the Worker's address (`https://grimm-dice.YOUR-NAME.workers.dev`) in a browser first.

| What you see | What it means |
|---|---|
| "Hello World!" | The bot code wasn't deployed. Paste `src/worker.js` again in **Edit code** and press **Deploy**. |
| An error page (e.g. 1101) | Only part of the code was pasted. Paste the whole file again and **Deploy**. |
| "Grimm dice bot is running." with `!!` lines | A setting is missing or mistyped; the line says which. |
| All `OK` lines | The Worker is fine; check the Discord side below. |

On the Discord side:

- **"Interactions endpoint URL could not be verified"** when saving: the Public Key in Cloudflare doesn't match this app's
  General Information page, or the URL is wrong. Use the exact `https://…workers.dev` address with nothing after it.
- **`/register` shows "Discord refused the command (401)"**: the bot token is wrong or was reset. Reset it again on the
  **Bot** page and update `DISCORD_BOT_TOKEN`.
- **`/grimm` doesn't appear in Discord**: the app isn't installed on that server (Installation step), or Discord hasn't
  refreshed. Press Ctrl+R (Cmd+R on a Mac) in Discord.
- **"The application did not respond"**: the Interactions Endpoint URL points somewhere else, or the Worker code is out of date.
