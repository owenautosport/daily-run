// Rewrites the content-script "matches" (and web-accessible origins) in
// extension/manifest.json from the game list, so adding a game to js/games.js
// is enough. Run by build-extension.sh.
import { readFileSync, writeFileSync } from 'node:fs';
import { GAMES } from '../js/games.js';

const path = new URL('../extension/manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(path, 'utf8'));

const matches = [...new Set(GAMES.map((g) => {
  const u = new URL(g.url);
  // Match the game's path and anything under it (query strings, sub-pages).
  const dir = u.pathname.replace(/[^/]*\.html$/, '').replace(/\/$/, '');
  return `${u.origin}${dir}${dir ? '*' : '/*'}`;
}))];
const origins = [...new Set(GAMES.map((g) => `${new URL(g.url).origin}/*`))];

for (const cs of manifest.content_scripts) cs.matches = matches;
manifest.web_accessible_resources[0].matches = origins;
writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest: ${matches.length} game URL patterns`);
