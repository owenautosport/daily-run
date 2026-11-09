// Share samples built from each game's own share code (read Nov 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byId, detectGame } from '../js/games.js';

const d = new Date(2026, 10, 9); // 9 Nov 2026

test('The Mini: link with date and solve time', () => {
  const r = byId.mini.parse('I solved the daily mini!\nhttps://www.nytimes.com/shared/v2/mini-xwd.html?d=2026-11-09&t=47&c=0123456789abcdef0123456789abcdef&smid=url-share');
  assert.deepEqual([r.date, r.score, r.won], ['2026-11-09', 47, true]);
  assert.equal(byId.mini.describe(r), '47s');
  const old = byId.mini.parse('https://www.nytimes.com/badges/games/mini.html?d=2026-11-09&t=125&c=abc');
  assert.equal(byId.mini.describe(old), '2:05');
  assert.equal(byId.mini.bucketOf(old), '2–5m');
});

test('Unwordle (unwordle.online)', () => {
  const r = byId.unwordle.parse('Unwordle 1043 4/6\n\n🟨⬜⬜🟩⬜\n⬜🟩🟨⬜⬜\n🟩🟩⬜🟩⬜\n🟩🟩🟩🟩🟩\n\nhttps://unwordle.online');
  assert.deepEqual([r.puzzle, r.won, r.score], [1043, true, 4]);
  assert.equal(byId.unwordle.parse('Unwordle 1043 X/6\n\n🟨⬜⬜🟩⬜').won, false);
  assert.equal(byId.unwordle.todaysPuzzle(d), 1043);
  assert.equal(detectGame('Unwordle 1043 4/6\n\n🟩🟩🟩🟩🟩').game.id, 'unwordle'); // not Wordle
});

test('Costcodle', () => {
  const r = byId.costcodle.parse('Costcodle #1147 3/6\n⬆️🟥\n⬇️🟨\n✅\nhttps://costcodle.com');
  assert.deepEqual([r.puzzle, r.won, r.score], [1147, true, 3]);
  assert.equal(r.grid.split('\n').length, 3);
  assert.equal(byId.costcodle.parse('Costcodle #1147 X/6\n⬆️🟥\n⬆️🟥\n⬆️🟨\n⬇️🟨\n⬆️🟨\n⬇️🟨\n').won, false);
  assert.equal(byId.costcodle.todaysPuzzle(d), 1147);
});

test('Minecraftle win, and a 10/10 loss', () => {
  const w = byId.minecraftle.parse('Minecraftle 2026-11-09 2/10\n⬜🟨⬜\n🟩⬜⬜\n⬜⬜⬜\n\n🟩🟩🟩\n🟩🟩🟩\n🟩🟩🟩');
  assert.deepEqual([w.date, w.won, w.score], ['2026-11-09', true, 2]);
  const block = '🟩🟨⬜\n🟩🟩⬜\n⬜⬜⬜';
  const l = byId.minecraftle.parse(`Minecraftle 2026-11-09 10/10\n${Array(10).fill(block).join('\n\n')}`);
  assert.equal(l.won, false);
});

test('Krillion', () => {
  const r = byId.krillion.parse('Krillion #117 🦐\n310\n\n🐟🦑⬛🌟🫧🏮🐟');
  assert.deepEqual([r.puzzle, r.score, r.grid], [117, 310, '🐟🦑⬛🌟🫧🏮🐟']);
  assert.equal(byId.krillion.todaysPuzzle(d), 117);
  assert.equal(byId.krillion.parse('Krillion ⟲ #100 🦐\n200\n\n⬛⬛⬛⬛⬛⬛⬛'), null); // archive
});

test('Flagle win and loss', () => {
  const w = byId.flagle.parse('#Flagle #1722 (09.11.2026) 3/6\n🟩🟥🟩\n🟩🟩🟥\n🗺️🛡️\nhttps://www.flagle.io/?utm_source=share&utm_medium=clipboard');
  assert.deepEqual([w.puzzle, w.date, w.won, w.score], [1722, '2026-11-09', true, 3]);
  const l = byId.flagle.parse('#Flagle #1722 (09.11.2026) X/6\n🟥🟥🟥\n🟥🟥🟥\n\nhttps://www.flagle.io/');
  assert.equal(l.won, false);
});

test('Strands: hints counted, theme clue skipped, special emoji', () => {
  const r = byId.strands.parse('Strands #981\n“Hold your horses”\n🔵🔵💡🔵\n🟡🔵🔵🔵');
  assert.deepEqual([r.puzzle, r.score, r.won], [981, 1, true]);
  assert.equal(byId.strands.describe(r), '1 hint');
  assert.equal(byId.strands.parse('Strands #900\n“Clue 💡 in it”\n🔵🔵🔵🔵\n🟡🔵🔵').score, 0);
  assert.equal(byId.strands.parse('Strands #607\n“Lit”\n🔵🕯️🔵🔵\n🟡🔵').score, 1);
  assert.equal(byId.strands.todaysPuzzle(d), 981);
});

test('Spotle win and loss', () => {
  const w = byId.spotle.parse('Spotle.io #1654\n\n📅👥📈🚻💽🌎\n⬜🟩🟨⬜🟩🟨\n🟨🟩⬜🟩🟩🟩\n🟩🟩🟩🟩🟩🟩');
  assert.deepEqual([w.puzzle, w.won, w.score], [1654, true, 3]);
  const l = byId.spotle.parse(`Spotle.io #1654\n\n📅👥📈🚻💽🌎\n${Array(10).fill('⬜🟩🟨⬜🟩🟨').join('\n')}`);
  assert.equal(l.won, false);
  assert.equal(byId.spotle.parse('Spotle.io Challenge\n\n📅👥📈🚻💽🌎\n🟩🟩🟩🟩🟩🟩'), null);
});

test('Minute Cryptic: help used and par', () => {
  const r = byId.minutecryptic.parse('Minute Cryptic - 9 November, 2026\n"Sailor finally gets to grips with weapon (5)" (5)\n⚪️⚪️🟡🟣🟣🟣🟣🟣\n🏆 3 hints – 1 under the community par (12,345 solvers so far).\nhttps://www.minutecryptic.com/?utm_source=share');
  assert.deepEqual([r.date, r.score, r.par], ['2026-11-09', 3, -1]);
  assert.equal(byId.minutecryptic.describe(r), '3 hints, 1 under par');
  const e = byId.minutecryptic.parse('Minute Cryptic - 9 November, 2026\n"x" (5)\n🟣🟣🟣\n🏁 Early solver! Just 120 people so far – I solved it with 0 hints.\nhttps://www.minutecryptic.com/');
  assert.equal(e.score, 0);
  assert.equal(byId.minutecryptic.parse('Minute Cryptic Mini Crossword - 9 November, 2026\n🟨⬛'), null);
});

test('Metazooa win and loss (random header emoji)', () => {
  const w = byId.metazooa.parse('🦊 Animal #1197 🐢\nI figured it out in 6 guesses!\n🟥🟧🟨🟨🟩🟩\n🔥 4 | Avg. Guesses: 7.5\n    \nhttps://metazooa.com\n#metazooa');
  assert.deepEqual([w.puzzle, w.won, w.score, w.grid], [1197, true, 6, '🟥🟧🟨🟨🟩🟩']);
  const l = byId.metazooa.parse("🐘 Animal #1197 🦉\nI was stumped by today's game!\n🟥🟥🟧\n🔥 0 | Avg. Guesses: 7.5\n    \nhttps://metazooa.com\n#metazooa");
  assert.equal(l.won, false);
  assert.equal(byId.metazooa.todaysPuzzle(d), 1197);
  assert.equal(byId.metazooa.parse('🌵 Plant #300 🌻\nI figured it out in 3 guesses!\n#metaflora'), null);
});

test('Travle: +N, perfect, loss, other maps ignored', () => {
  const w = byId.travle.parse('#travle #1426 +2\n✅🟧🟩✅🟥✅\nhttps://travle.earth');
  assert.deepEqual([w.puzzle, w.won, w.score], [1426, true, 2]);
  assert.equal(byId.travle.describe(byId.travle.parse('#travle #1426 +0 (Perfect)\n✅✅✅\nhttps://travle.earth')), '+0 (perfect)');
  const l = byId.travle.parse('#travle #1426 (hard mode) (2 away) (1 hint)\n🟧🟥🟩🟧🟥🟥🟧\nhttps://travle.earth');
  assert.deepEqual([l.won, l.away, l.hints, l.hard], [false, 2, 1, true]);
  assert.equal(byId.travle.parse('#travle_usa #500 +1\n✅🟩\nhttps://travle.earth/usa'), null);
  assert.equal(byId.travle.todaysPuzzle(d), 1426);
});

test('Loldle classic only, CRLF, more than 5 guesses', () => {
  const r = byId.loldle.parse('I found #LoLdle champion #1234 in classic mode in 7 shots  ⚔️\r\n🟩🟩🟩🟩🟩🟩🟩\r\n🟥🟧🟩🟥⬆️🟥🟩\r\n🟥🟥🟥🟩⬇️🟥🟥\r\n🟥🟥🟥🟩⬇️🟥🟥\r\n🟥🟥🟥🟩⬇️🟥🟥\r\n➕2️⃣ more\r\nhttps://loldle.net');
  assert.deepEqual([r.puzzle, r.score, r.won], [1234, 7, true]);
  assert.equal(byId.loldle.parse('I found #LoLdle champion #1234 in classic mode in one shot (easy) ⚔️🥇\r\n🟩🟩🟩🟩🟩🟩🟩\r\n\r\nhttps://loldle.net').score, 1);
  assert.equal(byId.loldle.parse('I found #LoLdle champion #1234 with a quote in 2 shots (easy) ⚔️\r\nhttps://loldle.net'), null);
});

test('Squirdle daily win and loss', () => {
  const w = byId.squirdle.parse('Squirdle Daily 1763 - 4/9\n🟦❌🟨🔼🔽\n✅❌❌🔽🔼\n✅🟨✅🔼✅\n✅✅✅✅✅');
  assert.deepEqual([w.puzzle, w.won, w.score], [1763, true, 4]);
  assert.equal(byId.squirdle.parse(`Squirdle Daily 1763 - X/9\n${Array(9).fill('🟦❌🟨🔼🔽').join('\n')}`).won, false);
  assert.equal(byId.squirdle.todaysPuzzle(d), 1763);
  assert.equal(byId.squirdle.parse('Squirdle 4/8\n✅✅✅✅✅'), null);
});

test('detectGame routes every sample to the right game', () => {
  const samples = {
    mini: 'https://www.nytimes.com/shared/v2/mini-xwd.html?d=2026-11-09&t=47&c=x',
    unwordle: 'Unwordle 1043 4/6\n\n🟩🟩🟩🟩🟩',
    costcodle: 'Costcodle #1147 3/6\n✅',
    minecraftle: 'Minecraftle 2026-11-09 1/10\n🟩🟩🟩\n🟩🟩🟩\n🟩🟩🟩',
    krillion: 'Krillion #117 🦐\n310\n\n🐟🦑⬛🌟🫧🏮🐟',
    flagle: '#Flagle #1722 (09.11.2026) 1/6\n🟩🟩🟩\n🟩🟩🟩',
    strands: 'Strands #981\n“x”\n🔵🔵🔵🔵',
    spotle: 'Spotle.io #1654\n\n📅👥📈🚻💽🌎\n🟩🟩🟩🟩🟩🟩',
    minutecryptic: 'Minute Cryptic - 9 November, 2026\n"x" (5)\n🟣\n🤝 0 hints – matched the community par (500 solvers so far).',
    metazooa: '🦊 Animal #1197 🐢\nI figured it out in 6 guesses!\n🟩\n#metazooa',
    travle: '#travle #1426 +0 (Perfect)\n✅✅✅',
    loldle: 'I found #LoLdle champion #1234 in classic mode in 2 shots (easy) ⚔️',
    squirdle: 'Squirdle Daily 1763 - 1/9\n✅✅✅✅✅',
    wordle: 'Wordle 1,969 4/6\n\n🟩🟩🟩🟩🟩',
    worldle: '#Worldle #1388 (09.11.2026) 2/6 (100%)\n🟩🟩🟩🟩🟩🎉',
  };
  for (const [id, text] of Object.entries(samples)) assert.equal(detectGame(text)?.game.id, id, id);
});

test('a stray % in other text does not crash the Mini parser', () => {
  assert.equal(byId.mini.parse('#Worldle #1388 (09.11.2026) 2/6 (100%)'), null);
});
