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
      const m = text.match(/Wordle\s+#?([\d][\d,.\s]*?)\s+([1-6X])\s*\/\s*6(\*)?/i);
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
];

// Try every game's parser; useful when someone pastes into the wrong box.
export function detectGame(text) {
  for (const g of GAMES) {
    const r = g.parse(text);
    if (r) return { game: g, result: r };
  }
  return null;
}

export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
