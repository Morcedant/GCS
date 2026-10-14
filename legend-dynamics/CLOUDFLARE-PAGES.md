# Putting the Legend Dynamics site on Cloudflare Pages

The whole website is the `legend-dynamics/site/` folder: the home page, the three game pages, their
character creators and Players' Guides, the core rules, the Discord page and the Discord handouts.
Cloudflare Pages hosts it for free. You can use the same Cloudflare account as the Discord bot.

## First upload (about 5 minutes)

1. Sign in at <https://dash.cloudflare.com>.
2. Open **Workers & Pages** and choose **Create**.
3. Switch to the **Pages** tab and choose **Upload assets** (Cloudflare calls this Direct Upload). If you only
   see Worker options, look for a line like "Looking to deploy Pages? Get started" and follow it.
4. Name the project, e.g. `legend-dynamics`. This gives you the address `https://legend-dynamics.pages.dev`.
5. Drag in the `site` folder, or `legend-dynamics-site.zip`, and choose **Deploy site**.

   A zip must have `index.html` at its top level, not inside a `site/` folder; otherwise the home page is
   at `/site/` and your address shows nothing. `python3 tools/build-site.py --zip legend-dynamics-site.zip`
   makes it that way.

The site is live at that address a minute later.

## Updating the site

After any change, rebuild and upload again:

```
python3 tools/build-legend.py --docx   # creators, guides, handouts and the bot code
python3 tools/build-site.py            # the site folder
```

In Cloudflare, open the project and choose **Create deployment** (or **Create new deployment**), then drag in
the new `site` folder. Each upload replaces the whole site, and earlier versions stay listed under
**Deployments**, so you can roll back.

## Your own domain (optional)

Open the project's **Custom domains** tab and choose **Set up a custom domain**. If the domain is already on
Cloudflare, it is connected for you. If not, Cloudflare shows the DNS record to add where you bought the domain.

## What's where

| Address | Page |
|---|---|
| `/` | Home |
| `/pact-of-bones/`, `/fracture-lines/`, `/the-shattered-crown/` | Game pages |
| `/<game>/create/` | That game's character creator |
| `/core-rules/` | Core rules, with the Word version |
| `/discord/` | The Discord bot's commands for every setting |
| `/discord/<game>/` | Each game's handout, with the bot setup steps and code |

**Old addresses.** The site's `_redirects` file sends the old Dust & Damnation addresses (`/dust-and-damnation/…`, its Word guide and its Discord handout) to Pact of Bones, so old links and bookmarks keep working. Cloudflare Pages reads the file automatically; there is nothing to set up.

Free plan limits are far above what this site needs: 500 uploads a month, 20,000 files, and 25 MB per file.
