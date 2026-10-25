# Legend Dynamics shared table

A small server that lets a whole table roll together. The GM starts a table from the creator's **GM view** and gets a six-character code. Players open their character, go to the play tab (**Ride**, **Adventure** or **Play**) and join with that code. From then on:

- every roll a player makes from their sheet is rolled **by the server**, so everyone sees the same dice and nobody can fudge them;
- the roll appears at once in a live log on every player's play tab and on the GM view: who rolled, what, the target, the dice, the margin, and any telling hit;
- a point reroll answers its own roll, once, and the log marks the first roll as rerolled;
- the GM view lists who is at the table;
- **shared characters (phase 2):** each player's character appears among the GM view's characters, marked *at the table* (or *away* when they've left), and its injuries, points, ammunition, form and setting track stay in step both ways: a box marked on the player's sheet shows on the GM's card, and one marked on the card or by the encounter panel shows on the sheet. The table keeps its own copy, so a change the GM makes while a player is away reaches them when they rejoin. Character portraits stay in each browser.

Without a table, or if the server can't be reached, the roller works exactly as before and rolls in the page.

It runs on **Cloudflare Workers** with one **Durable Object** per table (SQLite storage, available on the Workers Free plan). Connections hibernate while nobody is rolling, so an idle table costs nothing. A table nobody has used for 30 days is deleted.

- **the fight (phase 3):** the GM's battle map and encounter appear on every player's play tab, in a **Map and fight** card: the map (without its background picture) with everyone's tokens and injuries, the turn order with whose turn it is, and the latest lines of the fight. Players can pan, zoom and measure, and drag **their own** token: the move goes to the GM's map. On their turn they get a **Your turn** form (attack, aim or something else, the target, the weapon, a note) and **Send to the GM**; the request waits in the GM's Shared table panel, and **Put it in the encounter panel** fills in the action for the GM to check and run. The GM's page still runs every roll of the fight.

## Set it up

You need a Cloudflare account (the same one as the site and the dice bot).

### From a browser (works on an iPad)

1. In the Cloudflare dashboard open **Workers & Pages → Create**. On the **Workers** side (not Pages: Pages only serves files and can't run the server), choose **Continue with GitHub** / **Import a repository**, connect GitHub the first time, and pick this repository.
2. Fill in:
   - **Project name:** `legend-table` (it must match `name` in `wrangler.toml`)
   - **Build command:** leave empty
   - **Deploy command:** `npx wrangler deploy`
   - **Preview command** (if shown): `npx wrangler versions upload`
   - **Root directory** (often under Advanced settings): `legend-dynamics/table-server`. No `cd` in the commands: the root directory does that.
3. Deploy. Cloudflare builds the repository's production branch: if that branch hasn't got this folder, the build stops with "root directory not found". Set the production branch in the Worker's **Settings → Build** (it may be called Branch control) to one that has it, and retry.
4. The first deploy must be a full `wrangler deploy` (it creates the Durable Object). A preview build (`versions upload`) before it fails with "pending Durable Object migration": retry the production build, or set the preview command to `npx wrangler deploy` for one build.
5. Open the Worker's address (`https://legend-table.<your-subdomain>.workers.dev`): it should say "Legend Dynamics table server."

Recommended: set **Build watch paths** to `legend-dynamics/table-server/*` in **Settings → Build**, so branches without this folder don't fail a build.

### From a computer

```
cd legend-dynamics/table-server
npx wrangler login
npx wrangler deploy
```

### Then tell the creators where it is

Put the address in `legend-dynamics/table-server/server-url.txt` (one line, `https://…`, no trailing slash) and rebuild (`python3 tools/build-legend.py`, then `python3 tools/build-site.py --zip …`). The Join and Start boxes then use it without asking. Until then, the boxes have a **Table server** field to paste it into; each browser remembers it.

### Lock it to your site (optional)

`ALLOWED_ORIGINS` in `wrangler.toml` says which sites' pages may use the server. `"*"` lets any page connect, which is fine for a private game. To allow only your site, set it to that address, for example `"https://legend-dynamics.pages.dev"`, and add `null` if you also open creators as files on your computer: `"https://legend-dynamics.pages.dev,null"`. Redeploy after changing it.

### Only registered GMs (recommended)

So that only GMs you've chosen can start tables on your server, and nobody else runs up its usage, give each one a private access code. In the Worker's **Settings → Variables and Secrets**, add a **Secret** named `GM_CODES`, one GM per line or comma:

```
Don: k7Qp2mXv9Lr4
Sam: w3Hn8Tz5Bq1c
```

Those two are examples: don't use them. Make each code long and random: 12 or more letters and digits, from a password generator. The first time a GM presses **Start a table**, the creator asks for the code and then remembers it in that browser (**Forget my GM access code** clears it). Players never need one; they join with the table's code. To remove a GM, delete their line and save: they can't start new tables, and their existing tables carry on until they go idle. Each table started is logged with the GM's name (the Worker's **Logs**). With no `GM_CODES`, anyone can start a table. From a computer: `npx wrangler secret put GM_CODES`.

Keep it a **Secret**, not a variable in `wrangler.toml`: a secret survives every deploy, and the codes stay out of the repository.

**The GM view and the GM's Guides.** The same codes open each creator's **GM view**, which stays covered by a code box until the server accepts the code (`POST /api/gm`). The GM's Guides aren't in the pages at all: the server hands a game's guide to a GM whose code checks out (`POST /api/gm/guide`), from `src/gm-guides.js`, which `tools/gm_guides.py` builds from each game's `gm-guide.json` whenever the guides are rebuilt. So a change to a GM's Guide reaches GMs once the server is redeployed. With no `GM_CODES`, the GM view and the guides are open to anyone, like starting tables.

### The dev blog

The same server keeps the site's dev blog (`/blog/` on the website; the posts live in the server's own storage, `src/blog.js`). Anyone can read published posts. To write them, add a **Secret** named `DEV` in the Worker's **Settings → Variables and Secrets**: a long random code of its own (not a GM code), or `Name: code` lines for more than one author. Then open `/blog/write/` on the site and sign in with it; that browser remembers it until **Sign out**. With no `DEV` secret, nobody can write. Posts and drafts are kept until you delete them, whatever happens to the tables.

## Use it

- **GM:** GM view → **Shared table** → name it → **Start a table** (and the GM access code, the first time, if the server has `GM_CODES`). Share the code, or **Copy link** and send that (the link fills in the code). **Rejoin** gets you back in after closing the page; the key that makes you the GM stays in your browser.
- **Players:** open your character → play tab → **Shared table** → type the code and your name → **Join**. A reload, or a dropped phone connection, reconnects by itself. **Leave the table** goes back to rolling on your own.

Joining checks the game: a Trails table only takes players from the Trails creator.

## How it works

| File | What |
|---|---|
| `src/worker.js` | The Worker: starts tables (`POST /api/tables`), says whether a code exists (`GET /api/tables/CODE`) and opens the live connection (`GET /api/tables/CODE/ws`) |
| `src/table.js` | The Durable Object: one per table, holding its log and everyone's connection, and broadcasting each roll |
| `src/logic.js` | The table's rules, with no Cloudflare code: hello, rolls and rerolls, limits; the dice use the core rules' `resolve` |
| `test/logic.test.mjs` | Tests: `npm test` |
| `../engine/table-client.js` | The page side, built into every creator |

Limits: 20 rolls a minute per connection, the last 200 rolls kept, messages up to 2 KB, names up to 40 characters.

## Security

A table is meant for a private game among friends, like a video-call link.

- **The code is the door.** Anyone with a table's code (or link) can join it as a player: see the rolls and the shared characters, roll, and share a character. Six characters from 31 give about 887 million codes, so a table can't realistically be stumbled on, but share the code only with your players.
- **Who can start tables.** With `GM_CODES` set (above), only GMs with an access code can start a table; the server compares hashes of the codes. Without it, anyone who can reach the server can.
- **The GM key.** Starting a table gives the GM's browser a private key (24 random bytes); the server keeps only its hash. Only that browser can join as the GM and change other players' characters.
- **Each player's browser has a private id**, and a shared character belongs to the browser that shared it (the server keeps only a hash). Someone who joins with the same name can't change that character or reroll its rolls.
- **Remove a player.** On the GM view, **Remove** next to a player disconnects them, stops sharing their character (the GM's card stays, as an ordinary copy) and stops that browser rejoining this table.
- **Change the code.** **Change code** moves the table, with its log and shared characters, to a new code. Everyone connected follows it automatically; anyone else needs the new code, and the old one stops working. Use it after removing someone who might come back from another device, or if the code got out.
- **Everything travels over HTTPS/WSS.** Names, characters and rolls are kept on Cloudflare until the table has gone 30 days unused. Don't put anything private in a character.
- **Lock it to your site.** Set `ALLOWED_ORIGINS` (above) so only your site's pages can use the server.
- **Rate limits.** Rolls are limited per connection. To limit starting tables and guessing codes too, add a rate-limiting rule in the Cloudflare dashboard (Security → WAF → Rate limiting rules; the free plan allows one): for example, 20 requests a minute per IP to paths starting with `/api/tables`.

Phase 3 can run the encounter panel and battle map on the table.
