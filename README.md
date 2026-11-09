# Daily Run

Takes you through the daily puzzle games one by one and keeps your stats.

1. Hit **Start today's run**.
2. Play the game, then press its **Share** button.
3. Log it: **Log result** in the player bar, or paste anywhere on the page. The site reads your score from the share text.
4. It moves on to the next game.

Worldle, Globle, Framed and Nerdle play inside the site, full screen, and each one leads straight into the next. Wordle and Connections open in a new tab, because the NYT blocks its games being shown inside other sites.

Stats (played, win %, streak, best streak, score distribution, last 28 days, and a "full run" streak for days you played every game) are kept in your browser's `localStorage`. To move them to another device, use Settings → Export / Import.

Games: Wordle, Connections, Worldle, Globle, Framed, Nerdle. Pick which are in your run under Settings.

## Adding a game

Add an entry to `GAMES` in `js/games.js` with a `url`, score `buckets`, and a `parse(text)` that turns the share text into `{ puzzle, won, score, grid }` (plus `date` if the share text has one; otherwise give `todaysPuzzle(date)`). Set `embed: true` only if the site allows framing (no `X-Frame-Options` / `frame-ancestors` block). Add a test in `test/parsers.test.js`.

## Develop

No build step: it's plain HTML, CSS and ES modules, served as-is by GitHub Pages.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # parser + stats tests (Node 20+)
```
