// Build USS Pelion: Frontier into one page: dist/index.html, every module inlined in dependency order.
//   node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ORDER = ["hex", "data", "sector", "game", "combat", "arc", "ai", "turn", "ui"];
const here = new URL(".", import.meta.url);
const strip = (src) => src
  .replace(/^import [^;]+;\s*$/gm, "")        // the modules share one scope once inlined
  .replace(/^export \{[^}]*\};\s*$/gm, "")
  .replace(/^export (?=(async )?function|const|let|class)/gm, "");
const body = ORDER.map((m) => `// ---- ${m}.js ----\n` + strip(readFileSync(new URL(`src/${m}.js`, here), "utf8"))).join("\n");
const page = readFileSync(new URL("index.html", here), "utf8").replace("/* APP */", () => `(() => {\n"use strict";\n${body.replace(/<\//g, "<\\/")}\n})();`);
mkdirSync(new URL("dist/", here), { recursive: true });
writeFileSync(new URL("dist/index.html", here), page);
// A standalone copy with its own document skeleton, for the fan-games site (tools/build-fansite.py copies it to /uss-pelion/frontier/) or opening from disk.
writeFileSync(new URL("dist/play.html", here), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n${page}\n</body></html>\n`);
console.log(`wrote dist/index.html (${Math.round(page.length / 1024)} KB)`);
