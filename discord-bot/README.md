# USS Pelion dice bot

A Discord slash command for the Pelion rules:

```
/pelion target:16 modifier:-2 label:Sensors
```

The bot rolls 3d6 under the adjusted target (16 − 2 = 14) and reports success or failure, the margin,
natural 3–4 and 17–18, and the success chance. A **Spend a Duty point to reroll** button lets the
player who rolled reroll once; the second result stands, as the guide says. Players still track their
own Duty points on the sheet.

It runs free on **Cloudflare Workers** (100,000 requests a day on the free plan). Discord sends each
command to the Worker's web address, so there is no server to keep running.

## Set it up (about 15 minutes, no installs)

### 1. Create the Discord application

1. Go to <https://discord.com/developers/applications> and choose **New Application**. Name it, e.g. *Pelion Dice*.
2. On **General Information**, copy the **Application ID** and the **Public Key**.
3. On **Bot**, choose **Reset Token** and copy the token. Keep it private; it's only needed once, to register the command.

### 2. Create the Worker

1. Sign up at <https://dash.cloudflare.com> (free; no card needed for Workers).
2. Open **Workers & Pages → Create**. On the "Make something new" screen choose **Start with Hello World!**,
   name it `pelion-dice`, and **Deploy** the starter. (Skip Connect GitHub/GitLab and Upload your static files.)
3. Choose **Edit code** (top right), replace everything in the open file (`worker.js` or `index.js`) with the
   contents of [`src/worker.js`](src/worker.js), and **Deploy**.
4. In the Worker's **Settings → Variables and Secrets**, add:
   - `DISCORD_PUBLIC_KEY` = the Public Key
   - `DISCORD_APPLICATION_ID` = the Application ID
   - `DISCORD_BOT_TOKEN` = the bot token (choose type **Secret**)
5. Note the Worker's address, like `https://pelion-dice.YOUR-NAME.workers.dev`.

### 3. Connect them

1. Back on the Discord app's **General Information** page, paste the Worker address into
   **Interactions Endpoint URL** and save. Discord checks it immediately; if it saves, the signature check works.
2. Open `https://pelion-dice.YOUR-NAME.workers.dev/register` in your browser. You should see
   "Registered /pelion." After that you can delete `DISCORD_BOT_TOKEN` from the Worker settings.
3. On the app's **Installation** page, make sure **Guild Install** includes the `applications.commands` scope,
   then open the install link and pick your server. The bot needs no other permissions.

Type `/pelion` in your server to roll. New commands can take a minute to appear.

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
