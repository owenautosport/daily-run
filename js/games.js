// Game registry. To add a game: give it an id, a URL, and a parse(text) that
// turns the game's Share text into { puzzle, won, score, grid } or null.

const SQUARE = /[\u{1F7E5}-\u{1F7EB}⬛⬜]/u; // coloured squares + black/white

function dayNumber(epochISO, date = new Date()) {
  const [y, m, d] = epochISO.split('-').map(Number);
  const epoch = Date.UTC(y, m - 1, d);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today - epoch) / 86400000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const isoFrom = (y, m0, d) => `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function gridLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => Array.from(l.trim()).filter((c) => SQUARE.test(c)))
    .filter((cells) => cells.length > 0);
}

export const GAMES = [
  {
    id: 'wordle',
    name: 'Wordle',
    url: 'https://www.nytimes.com/games/wordle/index.html',
    blurb: 'Guess the five-letter word in six tries.',
    // Wordle #0 was 19 June 2021.
    todaysPuzzle: (date) => dayNumber('2021-06-19', date),
    scoreLabel: 'Guesses',
    buckets: ['1', '2', '3', '4', '5', '6', 'X'],
    bucketOf: (r) => (r.won ? String(r.score) : 'X'),
    parse(text) {
      const m = text.match(/(?<![A-Za-z])Wordle\s+#?([\d][\d,.\s]*?)\s+([1-6X])\s*\/\s*6(\*)?/i);
      if (!m) return null;
      const puzzle = Number(m[1].replace(/\D/g, ''));
      const won = m[2].toUpperCase() !== 'X';
      const rows = gridLines(text.slice(m.index)).filter((r) => r.length === 5);
      return {
        puzzle,
        won,
        score: won ? Number(m[2]) : 7,
        hard: Boolean(m[3]),
        grid: rows.map((r) => r.join('')).join('\n'),
      };
    },
    describe: (r) => (r.won ? `${r.score}/6${r.hard ? ' (hard)' : ''}` : 'X/6'),
  },
  {
    id: 'connections',
    name: 'Connections',
    url: 'https://www.nytimes.com/games/connections',
    blurb: 'Find four groups of four.',
    // Connections #1 was 12 June 2023.
    todaysPuzzle: (date) => dayNumber('2023-06-12', date) + 1,
    scoreLabel: 'Mistakes',
    buckets: ['0', '1', '2', '3', 'Lost'],
    bucketOf: (r) => (r.won ? String(r.score) : 'Lost'),
    parse(text) {
      const m = text.match(/Connections[\s\S]*?Puzzle\s*#\s*([\d,]+)/i);
      if (!m) return null;
      const puzzle = Number(m[1].replace(/\D/g, ''));
      const rows = gridLines(text.slice(m.index + m[0].length)).filter((r) => r.length === 4);
      if (rows.length === 0) return null;
      const solved = rows.filter((r) => r.every((c) => c === r[0])).length;
      const mistakes = rows.length - solved;
      const won = solved === 4;
      // A perfect game where purple is solved first is worth noting.
      const purpleFirst = rows[0].every((c) => c === '\u{1F7EA}');
      return {
        puzzle,
        won,
        score: mistakes,
        solved,
        purpleFirst: won && purpleFirst,
        grid: rows.map((r) => r.join('')).join('\n'),
      };
    },
    describe: (r) =>
      r.won
        ? `${r.score === 0 ? 'Perfect' : `${r.score} mistake${r.score === 1 ? '' : 's'}`}${r.purpleFirst ? ', purple first' : ''}`
        : `Lost (${r.solved}/4 groups)`,
  },
  {
    id: 'worldle',
    name: 'Worldle',
    url: 'https://worldle.teuteuf.fr/',
    embed: true,
    blurb: 'Name the country from its outline.',
    scoreLabel: 'Guesses',
    buckets: ['1', '2', '3', '4', '5', '6', 'X'],
    bucketOf: (r) => (r.won ? String(r.score) : 'X'),
    // "#Worldle #1234 (09.11.2026) 3/6 (100%)" — the share carries its own date.
    parse(text) {
      const m = text.match(/#Worldle\s+#(\d+)\s+\((\d{2})\.(\d{2})\.(\d{4})\)\s+(\S+?)\/6/i);
      if (!m) return null;
      const n = Number(m[5]);
      const won = Number.isInteger(n) && n >= 1 && n <= 6;
      const rows = gridLines(text.slice(m.index)).filter((r) => r.length === 5);
      return {
        puzzle: Number(m[1]),
        date: `${m[4]}-${m[3]}-${m[2]}`,
        won,
        score: won ? n : 7,
        grid: rows.map((r) => r.join('')).join('\n'),
      };
    },
    describe: (r) => (r.won ? `${r.score}/6` : 'X/6'),
  },
  {
    id: 'globle',
    name: 'Globle',
    url: 'https://globle-game.com/',
    embed: true,
    blurb: 'Find the mystery country on the globe.',
    scoreLabel: 'Guesses',
    buckets: ['1–3', '4–6', '7–10', '11–15', '16+'],
    bucketOf: (r) => (r.score <= 3 ? '1–3' : r.score <= 6 ? '4–6' : r.score <= 10 ? '7–10' : r.score <= 15 ? '11–15' : '16+'),
    // "🌎 Nov 9, 2026 🌍\n🔥 3 | Avg. Guesses: 5.2\n🟧🟥🟩 = 3"
    // You can't lose Globle, so the score is just how many guesses it took.
    parse(text) {
      const d = text.match(/🌎\s*([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})\s*🌍/);
      const g = text.match(/=\s*(\d+)\s*(?:\n|$)/);
      if (!d || !g || !/globle/i.test(text)) return null;
      const month = MONTHS.indexOf(d[1]);
      if (month < 0) return null;
      const before = text.slice(0, g.index).split('\n').pop();
      return {
        puzzle: null,
        date: isoFrom(Number(d[3]), month, Number(d[2])),
        won: true,
        score: Number(g[1]),
        grid: Array.from(before).filter((c) => SQUARE.test(c)).join(''),
      };
    },
    describe: (r) => `${r.score} guess${r.score === 1 ? '' : 'es'}`,
  },
  {
    id: 'framed',
    name: 'Framed',
    url: 'https://framed.wtf/',
    embed: true,
    blurb: 'Guess the film from six frames.',
    // Framed #1 was 12 March 2022.
    todaysPuzzle: (date) => dayNumber('2022-03-12', date) + 1,
    scoreLabel: 'Frames',
    buckets: ['1', '2', '3', '4', '5', '6', 'X'],
    bucketOf: (r) => (r.won ? String(r.score) : 'X'),
    // "Framed #1704\n🎥 🟥 🟥 🟩 ⬛ ⬛ ⬛" (only the daily, not the side challenges)
    parse(text) {
      const m = text.match(/(?:^|\n)\s*Framed\s+#(\d+)\s*\n/);
      if (!m) return null;
      const row = gridLines(text.slice(m.index + m[0].length))[0];
      if (!row || row.length !== 6) return null;
      const hit = row.indexOf('\u{1F7E9}');
      return {
        puzzle: Number(m[1]),
        won: hit >= 0,
        score: hit >= 0 ? hit + 1 : 7,
        grid: row.join(''),
      };
    },
    describe: (r) => (r.won ? `Frame ${r.score}` : 'Missed it'),
  },
  {
    id: 'nerdle',
    name: 'Nerdle',
    url: 'https://nerdlegame.com/',
    embed: true,
    blurb: 'Guess the hidden sum in six tries.',
    // Nerdle #1 was 20 January 2022.
    todaysPuzzle: (date) => dayNumber('2022-01-20', date) + 1,
    scoreLabel: 'Guesses',
    buckets: ['1', '2', '3', '4', '5', '6', 'X'],
    bucketOf: (r) => (r.won ? String(r.score) : 'X'),
    // "nerdlegame 1755 3/6\n\n🟩🟪⬛..." (classic only; mini/midi have a prefix)
    parse(text) {
      const m = text.match(/(?:^|\n)\s*nerdlegame\s+(\d+)\s+([1-6X])\/6/i);
      if (!m) return null;
      const rows = gridLines(text.slice(m.index)).filter((r) => r.length === 8);
      // Trust the grid for win/loss: solved means the last row is all green.
      const last = rows[rows.length - 1];
      const won = rows.length > 0 ? last.every((c) => c === '\u{1F7E9}') : m[2].toUpperCase() !== 'X';
      return {
        puzzle: Number(m[1]),
        won,
        score: won ? rows.length || Number(m[2]) : 7,
        grid: rows.map((r) => r.join('')).join('\n'),
      };
    },
    describe: (r) => (r.won ? `${r.score}/6` : 'X/6'),
  },

  // ---------- from the reel (formats read from each game's own code, Nov 2026) ----------
  {
    id: 'mini',
    name: 'The Mini',
    url: 'https://www.nytimes.com/crosswords/game/mini',
    blurb: 'The NYT five-by-five crossword.',
    scoreLabel: 'Solve time',
    buckets: ['<30s', '30–59s', '1–2m', '2–5m', '5m+'],
    bucketOf: (r) => timeBucket(r.score),
    // The Mini shares only a link: …/mini-xwd.html?d=2026-11-09&t=47&c=…
    // (or …/badges/games/mini.html?d=…&t=…). t is the solve time in seconds.
    parse(text) {
      let t = text;
      try { t = decodeURIComponent(text); } catch {} // e.g. "(100%)" in other games' text
      const m = t.match(/nytimes\.com\/(?:shared\/v\d\/mini-xwd|badges\/games\/mini)\.html\?[^\s]*?\bd=(\d{4}-\d{2}-\d{2})[^\s]*?[&?]t=(\d+)/);
      if (!m) return null;
      return { puzzle: null, date: m[1], won: true, score: Number(m[2]), grid: '' };
    },
    describe: (r) => formatSeconds(r.score),
    lowerIsBetter: true,
  },
  {
    id: 'unwordle',
    name: 'Unwordle',
    url: 'https://unwordle.online/',
    embed: true,
    blurb: 'Wordle backwards: find the guesses that fit the colours.',
    // Unwordle #0 was 1 January 2024.
    todaysPuzzle: (date) => dayNumber('2024-01-01', date),
    scoreLabel: 'Attempts',
    buckets: ['1', '2', '3', '4', '5', '6', 'X'],
    bucketOf: (r) => (r.won ? String(r.score) : 'X'),
    // "Unwordle 1043 4/6\n\n🟨⬜…\n…\n🟩🟩🟩🟩🟩\n\nhttps://unwordle.online"
    parse(text) {
      const m = text.match(/(?:^|\n)\s*Unwordle\s+(\d+)\s+([1-6X])\/6/);
      if (!m) return null;
      const won = m[2] !== 'X';
      const rows = gridLines(text.slice(m.index)).filter((r) => r.length === 5);
      return { puzzle: Number(m[1]), won, score: won ? Number(m[2]) : 7, grid: rows.map((r) => r.join('')).join('\n') };
    },
    describe: (r) => (r.won ? `${r.score}/6` : 'X/6'),
  },
  {
    id: 'costcodle',
    name: 'Costcodle',
    url: 'https://costcodle.com/',
    embed: true,
    blurb: 'Guess the price of a Costco item.',
    // Shows #2 on its launch day, 21 September 2023.
    todaysPuzzle: (date) => dayNumber('2023-09-21', date) + 2,
    scoreLabel: 'Guesses',
    buckets: ['1', '2', '3', '4', '5', '6', 'X'],
    bucketOf: (r) => (r.won ? String(r.score) : 'X'),
    // "Costcodle #1147 3/6\n⬆️🟥\n⬇️🟨\n✅\nhttps://costcodle.com"
    parse(text) {
      const m = text.match(/Costcodle\s+#(\d+)\s+([1-6X])\/6/i);
      if (!m) return null;
      const won = m[2].toUpperCase() !== 'X';
      const lines = text.slice(m.index + m[0].length).split(/\r?\n/).map((l) => l.trim()).filter((l) => /[⬆⬇✅🟥🟨]/u.test(l));
      return { puzzle: Number(m[1]), won, score: won ? Number(m[2]) : 7, grid: lines.join('\n') };
    },
    describe: (r) => (r.won ? `${r.score}/6` : 'X/6'),
  },
  {
    id: 'minecraftle',
    name: 'Minecraftle',
    url: 'https://minecraftle.zachmanson.com/',
    blurb: 'Guess the Minecraft crafting recipe.',
    scoreLabel: 'Crafting tables',
    buckets: ['1–2', '3–4', '5–6', '7–8', '9–10', 'X'],
    bucketOf: (r) => (!r.won ? 'X' : r.score <= 2 ? '1–2' : r.score <= 4 ? '3–4' : r.score <= 6 ? '5–6' : r.score <= 8 ? '7–8' : '9–10'),
    // "Minecraftle 2026-11-09 2/10" then a 3×3 block per guess. The header never
    // says X: a loss is 10/10 with a final block that isn't all green.
    parse(text) {
      const m = text.match(/Minecraftle\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2})\/10/);
      if (!m) return null;
      const n = Number(m[2]);
      const rows = gridLines(text.slice(m.index)).filter((r) => r.length === 3);
      const lastBlock = rows.slice(-3);
      const won = lastBlock.length === 3 && lastBlock.every((r) => r.every((c) => c === '\u{1F7E9}'));
      return { puzzle: null, date: m[1], won, score: won ? n : 11, grid: lastBlock.map((r) => r.join('')).join('\n') };
    },
    describe: (r) => (r.won ? `${r.score}/10` : 'X/10'),
  },
  {
    id: 'krillion',
    name: 'Krillion',
    url: 'https://krillion.io/',
    blurb: 'Seven prompts; rarer answers score more.',
    // Krillion #1 was 16 July 2026.
    todaysPuzzle: (date) => dayNumber('2026-07-16', date) + 1,
    scoreLabel: 'Points',
    buckets: ['0–199', '200–299', '300–399', '400–499', '500+'],
    bucketOf: (r) => (r.score < 200 ? '0–199' : r.score < 300 ? '200–299' : r.score < 400 ? '300–399' : r.score < 500 ? '400–499' : '500+'),
    // "Krillion #117 🦐\n310\n\n🐟🦑⬛🌟🫧🏮🐟" (archive "Krillion ⟲ #", unlimited "Krillion ∞ #")
    parse(text) {
      const m = text.match(/(?:^|\n)\s*Krillion\s+#(\d+)\s*🦐\s*\n\s*(\d+)/u);
      if (!m) return null;
      const tiles = (text.slice(m.index + m[0].length).match(/[🫧🤡🐟🦑🏮🌟⬛]/gu) || []).slice(0, 7);
      return { puzzle: Number(m[1]), won: true, score: Number(m[2]), grid: tiles.join('') };
    },
    describe: (r) => `${r.score} points`,
  },
  {
    id: 'flagle',
    name: 'Flagle',
    url: 'https://www.flagle.io/',
    // Refuses to run inside another site (shows an 'official website' error).
    blurb: 'Name the country from its flag, tile by tile.',
    scoreLabel: 'Guesses',
    buckets: ['1', '2', '3', '4', '5', '6', 'X'],
    bucketOf: (r) => (r.won ? String(r.score) : 'X'),
    // "#Flagle #1722 (09.11.2026) 3/6\n🟩🟥🟩\n🟩🟩🟥\n🗺️🛡️\nhttps://www.flagle.io/…"
    parse(text) {
      const m = text.match(/#Flagle\s+#(\d+)\s+\((\d{2})\.(\d{2})\.(\d{4})\)\s+([1-6X])\/6/i);
      if (!m) return null;
      const won = m[5].toUpperCase() !== 'X';
      const rows = gridLines(text.slice(m.index)).filter((r) => r.length === 3).slice(0, 2);
      return { puzzle: Number(m[1]), date: `${m[4]}-${m[3]}-${m[2]}`, won, score: won ? Number(m[5]) : 7, grid: rows.map((r) => r.join('')).join('\n') };
    },
    describe: (r) => (r.won ? `${r.score}/6` : 'X/6'),
  },
  {
    id: 'strands',
    name: 'Strands',
    url: 'https://www.nytimes.com/games/strands',
    blurb: 'Find the themed words hidden in the letter grid.',
    // Strands #1 was 4 March 2024.
    todaysPuzzle: (date) => dayNumber('2024-03-04', date) + 1,
    scoreLabel: 'Hints',
    buckets: ['0', '1', '2', '3', '4+'],
    bucketOf: (r) => (r.score >= 4 ? '4+' : String(r.score)),
    // "Strands #981\n“Hold your horses”\n🔵🔵💡🔵\n🟡🔵🔵🔵" (💡 = hint). You can't lose.
    // Special puzzles swap the emoji, so count hints as 💡/🕯️ and everything else as words.
    parse(text) {
      const m = text.match(/(?:^|\n)\s*Strands\s+#(\d+)\s*\n/);
      if (!m) return null;
      const body = text.slice(m.index + m[0].length).split(/\r?\n/).slice(1).join('\n');
      const marks = (body.match(/\p{Extended_Pictographic}️?/gu) || []);
      const hints = marks.filter((c) => /💡|🕯/u.test(c)).length;
      const lines = body.split('\n').map((l) => l.trim()).filter((l) => /\p{Extended_Pictographic}/u.test(l));
      return { puzzle: Number(m[1]), won: true, score: hints, grid: lines.join('\n') };
    },
    describe: (r) => (r.score === 0 ? 'Perfect, no hints' : `${r.score} hint${r.score === 1 ? '' : 's'}`),
  },
  {
    id: 'spotle',
    name: 'Spotle',
    url: 'https://spotle.io/',
    embed: true,
    blurb: 'Guess the music artist from their stats.',
    // Spotle #1 was 30 April 2022 (the number in the share comes from their server).
    todaysPuzzle: (date) => dayNumber('2022-04-30', date) + 1,
    scoreLabel: 'Guesses',
    buckets: ['1–2', '3–4', '5–6', '7–8', '9–10', 'X'],
    bucketOf: (r) => (!r.won ? 'X' : r.score <= 2 ? '1–2' : r.score <= 4 ? '3–4' : r.score <= 6 ? '5–6' : r.score <= 8 ? '7–8' : '9–10'),
    // "Spotle.io #1654\n\n📅👥📈🚻💽🌎\n⬜🟩🟨⬜🟩🟨\n…\n🟩🟩🟩🟩🟩🟩"
    parse(text) {
      const m = text.match(/(?:^|\n)\s*Spotle\.io\s+#(\d+)/i);
      if (!m) return null;
      const rows = gridLines(text.slice(m.index)).filter((r) => r.length === 6);
      if (!rows.length) return null;
      const won = rows[rows.length - 1].every((c) => c === '\u{1F7E9}');
      return { puzzle: Number(m[1]), won, score: won ? rows.length : 11, grid: rows.map((r) => r.join('')).join('\n') };
    },
    describe: (r) => (r.won ? `${r.score}/10` : 'X/10'),
  },
  {
    id: 'minutecryptic',
    name: 'Minute Cryptic',
    url: 'https://www.minutecryptic.com/',
    embed: true,
    blurb: 'One cryptic crossword clue a day.',
    scoreLabel: 'Hints used',
    buckets: ['0', '1', '2', '3', '4', '5+'],
    bucketOf: (r) => (r.score >= 5 ? '5+' : String(r.score)),
    // "Minute Cryptic - 9 November, 2026\n"clue" (5)\n⚪️⚪️🟡🟣…\n🏆 3 hints – 1 under the community par (…)"
    // Score = help used (hints + letters revealed); also keep how it compared to par.
    parse(text) {
      const m = text.match(/Minute Cryptic\s+-\s+(\d{1,2})\s+([A-Z][a-z]+),\s+(\d{4})/);
      if (!m || /Mini Crossword/.test(text.slice(m.index, m.index + 40))) return null;
      const month = MONTHS.findIndex((mm) => m[2].startsWith(mm));
      if (month < 0) return null;
      const after = text.slice(m.index);
      const h = after.match(/(\d+)\s+hints?\s+[–-]/);
      const used = h ? Number(h[1]) : (after.match(/⚪|🟡/gu) || []).length;
      let par = null;
      const pm = after.match(/(\d+(?:\.\d+)?)\s+(under|over)\s+(?:the community\s+)?par/);
      if (pm) par = (pm[2] === 'under' ? -1 : 1) * Number(pm[1]);
      else if (/matched the community par|even par/.test(after)) par = 0;
      const dots = after.split('\n').find((l) => /[⚪🟡🟣]/u.test(l)) || '';
      return { puzzle: null, date: isoFrom(Number(m[3]), month, Number(m[1])), won: true, score: used, par, grid: dots.trim() };
    },
    describe: (r) => {
      const p = r.par == null ? '' : r.par === 0 ? ', on par' : r.par < 0 ? `, ${-r.par} under par` : `, ${r.par} over par`;
      return `${r.score} hint${r.score === 1 ? '' : 's'}${p}`;
    },
  },
  {
    id: 'metazooa',
    name: 'Metazooa',
    url: 'https://metazooa.com/',
    embed: true,
    blurb: 'Find the mystery animal through the tree of life.',
    // Metazooa #0 was 31 July 2023 (rolls over at UTC midnight).
    todaysPuzzle: (date) => dayNumber('2023-07-31', date),
    scoreLabel: 'Guesses',
    buckets: ['1–5', '6–10', '11–15', '16–20', 'X'],
    bucketOf: (r) => (!r.won ? 'X' : r.score <= 5 ? '1–5' : r.score <= 10 ? '6–10' : r.score <= 15 ? '11–15' : '16–20'),
    // "🦊 Animal #1197 🐢\nI figured it out in 6 guesses!\n🟥🟧🟨🟨🟩🟩\n🔥 4 | …\n…#metazooa"
    // (the emoji around the header are random; a loss says "I was stumped…")
    parse(text) {
      const m = text.match(/Animal\s+#(\d+)/);
      if (!m || !/metazooa/i.test(text)) return null;
      const after = text.slice(m.index);
      const w = after.match(/figured it out in (\d+) guess/);
      const lost = /stumped by today's game/.test(after);
      if (!w && !lost) return null;
      const sq = after.split('\n').find((l) => /^[🟥🟧🟨🟩]+$/u.test(l.trim())) || '';
      return { puzzle: Number(m[1]), won: Boolean(w), score: w ? Number(w[1]) : 21, grid: sq.trim() };
    },
    describe: (r) => (r.won ? `${r.score} guess${r.score === 1 ? '' : 'es'}` : 'Stumped'),
  },
  {
    id: 'travle',
    name: 'Travle',
    url: 'https://travle.earth/',
    // Refuses to run inside another site (shows an 'official website' error).
    blurb: 'Connect two countries by land in the fewest guesses.',
    // Travle #1 was 15 December 2022.
    todaysPuzzle: (date) => dayNumber('2022-12-15', date) + 1,
    scoreLabel: 'Extra guesses',
    buckets: ['+0', '+1', '+2', '+3', '+4 or more', 'X'],
    bucketOf: (r) => (!r.won ? 'X' : r.score >= 4 ? '+4 or more' : `+${r.score}`),
    // "#travle #1426 +2\n✅🟧🟩✅🟥✅\nhttps://travle.earth"  /  "#travle #1426 (2 away)…"
    // Only the main world map ("#travle #", not "#travle_usa #" etc.).
    parse(text) {
      const m = text.match(/#travle\s+#(\d+)\s+(?:\(hard mode\)\s+)?(?:\+(\d+)|\((\d+) away\))/);
      if (!m) return null;
      const won = m[2] != null;
      const hints = text.slice(m.index).match(/\((\d+) hints?\)/);
      const line = text.slice(m.index).split('\n')[1] || '';
      return {
        puzzle: Number(m[1]),
        won,
        score: won ? Number(m[2]) : 99,
        away: won ? 0 : Number(m[3]),
        hints: hints ? Number(hints[1]) : 0,
        hard: /\(hard mode\)/.test(m[0]),
        grid: line.trim(),
      };
    },
    describe: (r) => (r.won ? `+${r.score}${r.score === 0 && !r.hints ? ' (perfect)' : ''}` : `${r.away} away`),
  },
  {
    id: 'loldle',
    name: 'Loldle',
    url: 'https://loldle.net/',
    // Refuses to run inside another site (shows an 'official website' error).
    blurb: 'Guess the League of Legends champion (classic mode).',
    scoreLabel: 'Shots',
    buckets: ['1', '2', '3', '4', '5', '6–9', '10+'],
    bucketOf: (r) => (r.score <= 5 ? String(r.score) : r.score <= 9 ? '6–9' : '10+'),
    // "I found #LoLdle champion #1234 in classic mode in 3 shots (easy) ⚔️\r\n🟩…"
    // Unlimited guesses, so no losses. The grid shows only the last 5 guesses.
    parse(text) {
      const m = text.match(/#LoLdle champion #(\d+) in classic mode in (one shot|(\d+) shots)/i);
      if (!m) return null;
      const rows = text.slice(m.index).split(/\r?\n/).slice(1).map((l) => l.trim()).filter((l) => /^[🟩🟥🟧⬇⬆️]+$/u.test(l));
      return { puzzle: Number(m[1]), won: true, score: m[3] ? Number(m[3]) : 1, grid: rows.join('\n') };
    },
    describe: (r) => (r.score === 1 ? 'One shot 🥇' : `${r.score} shots`),
  },
  {
    id: 'squirdle',
    name: 'Squirdle',
    url: 'https://squirdle.fireblend.com/',
    embed: true,
    blurb: 'Guess the Pokémon from its stats (daily mode).',
    // Squirdle Daily #1 was 12 January 2022.
    todaysPuzzle: (date) => dayNumber('2022-01-12', date) + 1,
    scoreLabel: 'Guesses',
    buckets: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'X'],
    bucketOf: (r) => (r.won ? String(r.score) : 'X'),
    // "Squirdle Daily 1763 - 4/9\n🟦❌🟨🔼🔽\n…\n✅✅✅✅✅"
    parse(text) {
      const m = text.match(/Squirdle Daily (\d+) - (\d|X)\/(\d+)/);
      if (!m) return null;
      const won = m[2] !== 'X';
      const rows = text.slice(m.index).split('\n').slice(1).map((l) => l.trim()).filter((l) => /^[✅❌🟨🟦🔼🔽]/u.test(l));
      return { puzzle: Number(m[1]), won, score: won ? Number(m[2]) : 10, grid: rows.map((r) => Array.from(r).slice(0, 5).join('')).join('\n') };
    },
    describe: (r) => (r.won ? `${r.score}/9` : 'X/9'),
  },
];

function timeBucket(s) {
  return s < 30 ? '<30s' : s < 60 ? '30–59s' : s < 120 ? '1–2m' : s < 300 ? '2–5m' : '5m+';
}

export function formatSeconds(s) {
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// Run order: games that must open in their own tab first, then the ones the
// website can play in-page, so those run back to back.
const ORDER = [
  'wordle', 'connections', 'strands', 'mini', 'krillion', 'minecraftle', 'flagle', 'travle', 'loldle',
  'worldle', 'globle', 'framed', 'spotle', 'minutecryptic', 'metazooa', 'unwordle', 'nerdle', 'costcodle', 'squirdle',
];
GAMES.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

// Try every game's parser; useful when someone pastes into the wrong box.
export function detectGame(text) {
  for (const g of GAMES) {
    const r = g.parse(text);
    if (r) return { game: g, result: r };
  }
  return null;
}

export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
