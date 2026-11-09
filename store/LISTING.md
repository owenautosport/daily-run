# Chrome Web Store submission: Daily Run

Everything to paste into the Chrome Web Store developer dashboard
(https://chrome.google.com/webstore/devconsole). Upload `dist/daily-run-extension.zip`
(build it with `npm run build:ext`).

## Store listing tab

**Name** (from the manifest): Daily Run

**Summary** (132 characters max; this is 121):

> Play Wordle, Connections, Strands and 16 more daily games in one run. Press Share and your score is logged automatically.

**Category:** Fun (or Productivity › Tools if Fun isn't offered)

**Language:** English (UK)

**Description:**

```
Daily Run takes you through your daily puzzle games, one after another, and keeps your stats. You never have to paste a score.

HOW IT WORKS
• Once a day, Daily Run opens your first unplayed game (you can turn this off).
• Play as normal. When you finish, press the game's own Share button.
• Daily Run logs your result and takes the same tab to the next game.
• The toolbar button shows today's progress. The stats page shows streaks, win rates, score charts and a 28-day history for every game.

GAMES (19)
Wordle, Connections, Strands, The Mini, Krillion, Minecraftle, Flagle, Travle, Loldle, Worldle, Globle, Framed, Spotle, Minute Cryptic, Metazooa, Unwordle, Nerdle, Costcodle, Squirdle. Pick which ones are in your run in Settings.

PRIVATE BY DESIGN
Your results stay on your device. There are no accounts, no servers, no analytics and no ads. Daily Run only reads a game's share text when you press Share, and only on the game sites it supports.

Daily Run is an independent project and isn't affiliated with any of the games or their publishers.

Source code: https://github.com/owenautosport/daily-run
```

**Graphic assets** (in `store/`):
- Store icon: `extension/icons/128.png` (already in the zip)
- Screenshots (1280×800): `store/screenshot-1-panel.png`, `store/screenshot-2-stats.png`, `store/screenshot-3-popup.png`
- Small promo tile (440×280): `store/promo-small.png`
- Marquee (1400×560, optional): `store/promo-marquee.png`

**Official URL / homepage:** https://owenautosport.github.io/daily-run/

**Support URL:** https://github.com/owenautosport/daily-run/issues

## Privacy practices tab

**Single purpose:**

> Daily Run helps you play a set of daily web puzzle games in one sitting and records your results from each game's share text, so you can see your streaks and stats.

**Permission justifications:**

- **storage**: Saves your game results and settings locally on your device so the stats page and toolbar popup can show them.
- **idle**: Detects when you return to the computer, so Daily Run can open the day's first unplayed game once a day. The user can turn this off in Settings.
- **Host permissions (content scripts on the listed game sites)**: On the supported game sites only, the extension shows a small progress panel and reads the text the game produces when the user presses its Share button, to record the score. It runs on no other sites.

**Are you using remote code?** No. All JavaScript is in the package. The extension loads no external scripts and uses no eval.

**Data usage**: tick **none** of the data types. Daily Run collects no user data; results are stored only locally and never transmitted. Then tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://owenautosport.github.io/daily-run/privacy.html

## Distribution tab

- Visibility: **Public** (or **Unlisted** to share by link only while testing)
- Regions: all

## After it's approved

Put the store link in the README and on the website's Settings tab as an "Add to Brave / Chrome" button. Brave, Chrome, Edge and Arc all install from the Chrome Web Store.

## Publishing an update

1. Bump `version` in `extension/manifest.json`.
2. `npm run build:ext`
3. Upload the new `dist/daily-run-extension.zip` in the dashboard (Package › Upload new package) and submit for review.
