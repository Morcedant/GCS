# Fan games (private)

USS Pelion (Star Trek) and Grimm use settings owned by others, so they stay off the public Legend Dynamics site,
bot and changelog. They run the same way, from their own private site:

| Piece | What it is |
|---|---|
| **Site** | `fan-games/site/`, built by `python3 tools/build-fansite.py --zip <path>`: a home page, each game's creator, its Players' Guide in Word and its Discord commands handout. Its own Cloudflare Pages project, locked with Cloudflare Access. |
| **Creators** | `uss-pelion/index.html` (this branch) and `grimm-west/index.html` (built on `claude/grimm-wild-west`; `tools/fan_sources.py` reads it from there). |
| **Discord bot** | `fan-games/discord-bot/worker.js`: the public bot's code with the fan games added, and the old Pelion and Grimm bots' names (`/pelion`, `/duty`, `/grimm`, `/grit`) and storage (`DUTY`, `GRIT`). `tools/build-legend.py` writes it alongside the public bot; the games' data is in `fan-games/discord-bot/games/`. Paste it into your Pelion or Grimm bot's Worker. |
| **Table server** | The same `legend-table` server as Legend Dynamics, with the same GM access codes. It carries the fan games' GM's Guides and hands them only to registered GMs. |

## Put the site up (once)

1. **Create the Pages project.** In Cloudflare, **Workers & Pages → Create → Pages → Upload assets**. Name it (for example `fan-games`), upload the fan-games zip and **Deploy**. Its address ends in `.pages.dev`.
2. **Lock it.** Open **Zero Trust** (first time: pick a team name and the Free plan, up to 50 users). Then **Access → Applications → Add an application → Self-hosted**:
   - Application domain: your `.pages.dev` address. Add a second one with `*.` in front (for example `*.fan-games.pages.dev`) so preview copies are locked too.
   - Policy: **Allow**, with **Include → Emails**, listing your players' email addresses.
   - Login method: **One-time PIN** (the default).

   Now visiting the site asks for an email address and sends a code to it; only the listed addresses get in.
3. **Table server.** If you've restricted `ALLOWED_ORIGINS` in the `legend-table` Worker, add the fan-games address to it. With `*`, nothing to do.

## Update it

Rebuild with `python3 tools/build-fansite.py --zip <path>` and upload the zip to the same Pages project (**Create a new deployment**). Access stays in place.

## Keep it private

- Share the site's address only with your players, and keep them on the Access list.
- The site tells search engines to stay away (`robots.txt`, `noindex`), but Access is what actually keeps people out.
- Don't link it from the Legend Dynamics site, bot or Discord handouts.
