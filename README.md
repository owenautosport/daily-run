# Daily Run

Takes you through the daily puzzle games one by one and keeps your stats.

1. Hit **Start today's run**.
2. Play the game, then press its **Share** button.
3. Log it: **Log result** in the player bar, or paste anywhere on the page. The site reads your score from the share text.
4. It moves on to the next game.

Worldle, Globle, Framed and Nerdle play inside the site, full screen, and each one leads straight into the next. Wordle and Connections open in a new tab, because the NYT blocks its games being shown inside other sites.

Stats (played, win %, streak, best streak, score distribution, last 28 days, and a "full run" streak for days you played every game) are kept in your browser's `localStorage`. To move them to another device, use Settings → Export / Import.

Games: Wordle, Connections, Worldle, Globle, Framed, Nerdle. Pick which are in your run under Settings.

## Browser extension (Brave / Chrome)

The extension does the run without any pasting:

- Once a day (when the browser starts, or when you come back to the computer) it opens your first unplayed game. You can turn this off in its settings.
- A small Daily Run panel sits in the corner of each game. When you press the game's own **Share** button, it logs your result.
- It then counts down five seconds and takes the same tab to the next game. Press **Stay** to stop it.
- The toolbar button shows today's progress and **Start / Carry on**. **Stats & settings** opens the full stats page.

Install it:

1. Go to `brave://extensions` (or `chrome://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this repo's `extension/` folder.
4. Pin Daily Run to the toolbar.

The extension keeps its own stats. To bring over stats from the website, use Settings → Export backup on the site, then Settings → Import backup in the extension.

After changing `js/`, `style.css` or `index.html`, run `npm run build:ext` to copy them into `extension/` (a test fails if you forget), then press reload on Daily Run in `brave://extensions`.

## Adding a game

Add an entry to `GAMES` in `js/games.js` with a `url`, score `buckets`, and a `parse(text)` that turns the share text into `{ puzzle, won, score, grid }` (plus `date` if the share text has one; otherwise give `todaysPuzzle(date)`). Set `embed: true` only if the site allows framing (no `X-Frame-Options` / `frame-ancestors` block). Add a test in `test/parsers.test.js`. For the extension, add the site to both `matches` lists in `extension/manifest.json` (a test checks this) and run `npm run build:ext`.

## Develop

No build step: it's plain HTML, CSS and ES modules, served as-is by GitHub Pages.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # parser + stats tests (Node 20+)
```
