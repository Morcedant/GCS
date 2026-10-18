# Legend Dynamics shared table

A small server that lets a whole table roll together. The GM starts a table from the creator's **GM view** and gets a six-character code. Players open their character, go to the play tab (**Ride**, **Adventure** or **Play**) and join with that code. From then on:

- every roll a player makes from their sheet is rolled **by the server**, so everyone sees the same dice and nobody can fudge them;
- the roll appears at once in a live log on every player's play tab and on the GM view: who rolled, what, the target, the dice, the margin, and any telling hit;
- a point reroll answers its own roll, once, and the log marks the first roll as rerolled;
- the GM view lists who is at the table.

Without a table, or if the server can't be reached, the roller works exactly as before and rolls in the page.

It runs on **Cloudflare Workers** with one **Durable Object** per table (SQLite storage, available on the Workers Free plan). Connections hibernate while nobody is rolling, so an idle table costs nothing. A table nobody has used for 30 days is deleted.

## Set it up

You need a Cloudflare account (the same one as the site and the dice bot).

### From a browser (works on an iPad)

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Import a repository** and pick this GitHub repository.
2. Set:
   - **Project name:** `legend-table`
   - **Branch:** the branch with this folder on it
   - **Root directory:** `legend-dynamics/table-server`
   - **Build command:** leave empty
   - **Deploy command:** `npx wrangler deploy`
3. Deploy. Cloudflare reads `wrangler.toml`, creates the Durable Object and gives the Worker an address like `https://legend-table.<your-subdomain>.workers.dev`.
4. Open that address: it should say "Legend Dynamics table server."

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

## Use it

- **GM:** GM view → **Shared table** → name it → **Start a table**. Share the code, or **Copy link** and send that (the link fills in the code). **Rejoin** gets you back in after closing the page; the key that makes you the GM stays in your browser.
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

Phase 1 shares rolls. Later phases can share the characters' injuries and points, and then the encounter panel and battle map.
