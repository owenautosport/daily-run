import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byId, detectGame } from '../js/games.js';
import { gameStats, fullRunStreak } from '../js/stats.js';

const wordle = byId.wordle;
const conn = byId.connections;

test('wordle win', () => {
  const r = wordle.parse('Wordle 1,234 3/6\n\n⬛🟨⬛⬛⬛\n🟩🟩⬛⬛🟨\n🟩🟩🟩🟩🟩');
  assert.equal(r.puzzle, 1234);
  assert.equal(r.won, true);
  assert.equal(r.score, 3);
  assert.equal(r.hard, false);
  assert.equal(r.grid.split('\n').length, 3);
});

test('wordle loss, hard mode, white squares, dot thousands separator', () => {
  const r = wordle.parse('Wordle 1.600 X/6*\n\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜🟩');
  assert.equal(r.puzzle, 1600);
  assert.equal(r.won, false);
  assert.equal(r.score, 7);
  assert.equal(r.hard, true);
  assert.equal(wordle.describe(r), 'X/6');
});

test('wordle with no comma and a hash', () => {
  const r = wordle.parse('Wordle #987 6/6');
  assert.equal(r.puzzle, 987);
  assert.equal(r.score, 6);
});

test('connections perfect, purple first', () => {
  const r = conn.parse('Connections\nPuzzle #512\n🟪🟪🟪🟪\n🟦🟦🟦🟦\n🟩🟩🟩🟩\n🟨🟨🟨🟨');
  assert.equal(r.puzzle, 512);
  assert.equal(r.won, true);
  assert.equal(r.score, 0);
  assert.equal(r.purpleFirst, true);
  assert.equal(conn.describe(r), 'Perfect, purple first');
});

test('connections with mistakes', () => {
  const r = conn.parse('Connections\nPuzzle #600\n🟨🟨🟦🟨\n🟨🟨🟨🟨\n🟩🟩🟩🟩\n🟦🟪🟦🟦\n🟦🟦🟦🟦\n🟪🟪🟪🟪');
  assert.equal(r.won, true);
  assert.equal(r.score, 2);
  assert.equal(conn.describe(r), '2 mistakes');
});

test('connections loss', () => {
  const r = conn.parse('Connections\nPuzzle #601\n🟨🟨🟨🟨\n🟩🟦🟩🟩\n🟩🟪🟩🟩\n🟦🟩🟦🟦\n🟪🟦🟪🟪');
  assert.equal(r.won, false);
  assert.equal(r.score, 4);
  assert.equal(r.solved, 1);
  assert.equal(conn.describe(r), 'Lost (1/4 groups)');
});

test('garbage returns null, detectGame routes correctly', () => {
  assert.equal(wordle.parse('hello'), null);
  assert.equal(conn.parse('Wordle 1,234 3/6'), null);
  assert.equal(detectGame('Connections\nPuzzle #5\n🟨🟨🟨🟨\n🟩🟩🟩🟩\n🟦🟦🟦🟦\n🟪🟪🟪🟪').game.id, 'connections');
  assert.equal(detectGame('nothing here'), null);
});

test('todays puzzle numbers line up with known dates', () => {
  assert.equal(wordle.todaysPuzzle(new Date(2021, 5, 19)), 0);
  assert.equal(wordle.todaysPuzzle(new Date(2022, 0, 1)), 196);
  assert.equal(conn.todaysPuzzle(new Date(2023, 5, 12)), 1);
});

test('stats: streaks, win %, distribution', () => {
  const results = [
    { game: 'wordle', date: '2026-11-01', won: true, score: 4 },
    { game: 'wordle', date: '2026-11-02', won: false, score: 7 },
    { game: 'wordle', date: '2026-11-03', won: true, score: 3 },
    { game: 'wordle', date: '2026-11-04', won: true, score: 3 },
    { game: 'wordle', date: '2026-11-05', won: true, score: 5 },
  ];
  const s = gameStats(wordle, results, '2026-11-06'); // today not played yet
  assert.equal(s.played, 5);
  assert.equal(s.winPct, 80);
  assert.equal(s.current, 3);
  assert.equal(s.max, 3);
  assert.equal(s.dist['3'], 2);
  assert.equal(s.dist.X, 1);
  assert.equal(gameStats(wordle, results, '2026-11-08').current, 0); // missed a day
});

test('full run streak needs every game each day', () => {
  const results = [
    { game: 'wordle', date: '2026-11-06', won: true },
    { game: 'connections', date: '2026-11-06', won: false },
    { game: 'wordle', date: '2026-11-07', won: true },
    { game: 'connections', date: '2026-11-07', won: true },
    { game: 'wordle', date: '2026-11-08', won: true },
  ];
  assert.equal(fullRunStreak(['wordle', 'connections'], results, '2026-11-08'), 2);
});

// Share formats below are copied from each game's own share code (Nov 2026).

test('worldle win uses the date in the share text', () => {
  const r = byId.worldle.parse('#Worldle #1388 (09.11.2026) 3/6 (100%)\n🔥 4\n🟩🟩🟩🟨⬜↗️\n🟩🟩🟩🟩🟨↘️\n🟩🟩🟩🟩🟩🎉\n\nhttps://worldle.teuteuf.fr');
  assert.equal(r.date, '2026-11-09');
  assert.equal(r.won, true);
  assert.equal(r.score, 3);
  assert.equal(r.grid.split('\n').length, 3);
});

test('worldle loss (X and the give-up face)', () => {
  assert.equal(byId.worldle.parse('#Worldle #1388 (09.11.2026) X/6 (93%)').won, false);
  const r = byId.worldle.parse('#Worldle #1388 (09.11.2026) 😛/6 (93%) 🙈');
  assert.equal(r.won, false);
  assert.equal(r.score, 7);
});

test('globle', () => {
  const r = byId.globle.parse('🌎 Nov 9, 2026 🌍\n🔥 3 | Avg. Guesses: 5.2\n🟧🟥🟥🟩 = 4\n\nhttps://globle-game.com\n#globle');
  assert.equal(r.date, '2026-11-09');
  assert.equal(r.score, 4);
  assert.equal(r.won, true);
  assert.equal(r.grid, '🟧🟥🟥🟩');
  assert.equal(byId.globle.bucketOf(r), '4–6');
});

test('globle not played today ("--") is rejected', () => {
  assert.equal(byId.globle.parse('🌎 Nov 8, 2026 🌍\n🔥 0 | Avg. Guesses: --\n-- = --\n\nhttps://globle-game.com\n#globle'), null);
});

test('framed win and miss, ignores side challenges', () => {
  const w = byId.framed.parse('Framed #1704\n🎥 🟥 🟥 🟩 ⬛ ⬛ ⬛\n\nhttps://framed.wtf');
  assert.equal(w.puzzle, 1704);
  assert.equal(w.won, true);
  assert.equal(w.score, 3);
  const l = byId.framed.parse('Framed #1704\n🎥 🟥 🟥 🟥 🟥 🟥 🟥\n\nhttps://framed.wtf');
  assert.equal(l.won, false);
  assert.equal(byId.framed.parse('Framed - One Frame Challenge #300\n🎥 🟩\n\nhttps://framed.wtf/one-frame'), null);
});

test('nerdle win and loss, ignores mini nerdle', () => {
  const w = byId.nerdle.parse('nerdlegame 1755 3/6\n\n🟪⬛⬛🟩⬛🟪⬛⬛\n🟩🟩🟪🟩⬛🟩🟪🟩\n🟩🟩🟩🟩🟩🟩🟩🟩');
  assert.equal(w.puzzle, 1755);
  assert.equal(w.won, true);
  assert.equal(w.score, 3);
  const rows = Array(6).fill('🟩🟩🟪🟩⬛🟩🟪🟩').join('\n');
  const l = byId.nerdle.parse(`nerdlegame 1755 6/6\n\n${rows}`);
  assert.equal(l.won, false);
  assert.equal(byId.nerdle.parse('mini nerdlegame 1755 3/6\n\n🟩🟩🟩🟩🟩🟩'), null);
});

test('puzzle numbers for Framed and Nerdle match the sites on 9 Nov 2026', () => {
  assert.equal(byId.framed.todaysPuzzle(new Date(2026, 10, 9)), 1704);
  assert.equal(byId.nerdle.todaysPuzzle(new Date(2026, 10, 9)), 1755);
});

test('detectGame tells all six apart', () => {
  const samples = {
    wordle: 'Wordle 1,969 4/6\n\n🟩🟩🟩🟩🟩',
    connections: 'Connections\nPuzzle #1247\n🟨🟨🟨🟨\n🟩🟩🟩🟩\n🟦🟦🟦🟦\n🟪🟪🟪🟪',
    worldle: '#Worldle #1388 (09.11.2026) 2/6 (100%)\n🟩🟩🟩🟩🟨↗️\n🟩🟩🟩🟩🟩🎉',
    globle: '🌎 Nov 9, 2026 🌍\n🔥 3 | Avg. Guesses: 5.2\n🟧🟩 = 2\n\nhttps://globle-game.com\n#globle',
    framed: 'Framed #1704\n🎥 🟩 ⬛ ⬛ ⬛ ⬛ ⬛\n\nhttps://framed.wtf',
    nerdle: 'nerdlegame 1755 2/6\n\n🟪⬛⬛🟩⬛🟪⬛⬛\n🟩🟩🟩🟩🟩🟩🟩🟩',
  };
  for (const [id, text] of Object.entries(samples)) assert.equal(detectGame(text)?.game.id, id, id);
});
