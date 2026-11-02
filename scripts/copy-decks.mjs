// Publishes deck packs for the client: content/decks/<id>.json → public/decks/<id>.v<version>.json
// Versioned filenames let the service worker cache each pack forever and pick up new versions.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = join(root, "content", "decks");
const out = join(root, "public", "decks");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let count = 0;
for (const file of readdirSync(src).filter((f) => f.endsWith(".json"))) {
  const deck = JSON.parse(readFileSync(join(src, file), "utf8"));
  writeFileSync(join(out, `${deck.slug}.v${deck.version}.json`), JSON.stringify(deck));
  count++;
}
console.log(`copy-decks: published ${count} deck packs to public/decks`);
