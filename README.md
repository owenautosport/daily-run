# Daily Run

Takes you through the daily puzzle games one by one and keeps your stats.

1. Hit **Start today's run**. The first game opens in a new tab.
2. Play it, then press the game's **Share** button.
3. Come back and paste (anywhere on the page, or into that game's box). The site reads your score from the share text.
4. **Next up** opens the next game.

Stats (played, win %, streak, best streak, score distribution, last 28 days, and a "full run" streak for days you played every game) are kept in your browser's `localStorage`. To move them to another device, use Settings → Export / Import.

Games so far: Wordle, Connections.

## Adding a game

Add an entry to `GAMES` in `js/games.js` with a `url`, `todaysPuzzle(date)`, score `buckets`, and a `parse(text)` that turns the share text into `{ puzzle, won, score, grid }`. Add a test in `test/parsers.test.js`.

## Develop

No build step: it's plain HTML, CSS and ES modules, served as-is by GitHub Pages.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # parser + stats tests (Node 20+)
```
