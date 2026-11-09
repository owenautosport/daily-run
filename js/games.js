// Game registry. To add a game: give it an id, a URL, and a parse(text) that
// turns the game's Share text into { puzzle, won, score, grid } or null.

const SQUARE = /[\u{1F7E5}-\u{1F7EB}⬛⬜]/u; // coloured squares + black/white

function dayNumber(epochISO, date = new Date()) {
  const [y, m, d] = epochISO.split('-').map(Number);
  const epoch = Date.UTC(y, m - 1, d);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today - epoch) / 86400000);
}

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
