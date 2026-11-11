import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { byId } from '../js/games.js';
import * as core from '../js/core.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('extension/lib is in sync with js/ (run npm run build:ext)', () => {
  for (const f of ['games.js', 'stats.js', 'core.js', 'app.js']) {
    assert.equal(read(`extension/lib/${f}`), read(`js/${f}`), f);
  }
  assert.equal(read('extension/lib/store.js'), read('extension/src/store.js'));
});

test('manifest covers every game URL', () => {
  const m = JSON.parse(read('extension/manifest.json'));
  const patterns = m.content_scripts[0].matches.map((p) => new RegExp('^' + p.replace(/[.?]/g, '\\$&').replace(/\*/g, '.*') + '$'));
  for (const g of Object.values(byId)) {
    assert.ok(patterns.some((re) => re.test(g.url)), `${g.name} (${g.url}) not matched`);
  }
});

test('core: classify, withResult, nextUnplayed', () => {
  const now = new Date(2026, 10, 9);
  const wordle = byId.wordle;
  const parsed = wordle.parse('Wordle 1,969 4/6\n\n🟩🟩🟩🟩🟩');
  let state = core.DEFAULT_STATE();
  assert.equal(core.nextUnplayed(state, '2026-11-09').id, 'wordle');
  const c = core.classify(state, wordle, parsed, now);
  assert.deepEqual([c.kind, c.date], ['new', '2026-11-09']);
  state = core.withResult(state, wordle, parsed, c.date, now);
  assert.equal(core.classify(state, wordle, parsed, now).kind, 'duplicate');
  assert.equal(core.nextUnplayed(state, '2026-11-09').id, 'connections');
  const other = wordle.parse('Wordle 1,969 2/6\n\n🟩🟩🟩🟩🟩');
  assert.equal(core.classify(state, wordle, other, now).kind, 'conflict');
  assert.equal(core.classify(state, wordle, wordle.parse('Wordle 1,900 2/6'), now).kind, 'old');
  state = core.withResult(state, wordle, other, '2026-11-09', now);
  assert.equal(state.results.length, 1);
  assert.equal(state.results[0].score, 2);
  assert.equal(core.nextUnplayed({ ...state, enabled: ['wordle'] }, '2026-11-09'), undefined);
});

test('core: share-text date wins over puzzle maths', () => {
  const r = byId.worldle.parse('#Worldle #1388 (08.11.2026) 3/6 (100%)');
  assert.equal(core.dateForResult(byId.worldle, r, new Date(2026, 10, 9)).date, '2026-11-08');
});

test('skipping: counts as done, moves the run on, undoable, keeps the full-run streak', async () => {
  const { fullRunStreak } = await import('../js/stats.js');
  let state = { results: [], enabled: ['wordle', 'connections', 'strands'] };
  const day = '2026-11-11';
  state = core.withSkip(state, 'wordle', day);
  assert.equal(core.isSkipped(state, 'wordle', day), true);
  assert.equal(core.isDone(state, 'wordle', day), true);
  assert.equal(core.nextUnplayed(state, day).id, 'connections');
  state = core.withSkip(state, 'wordle', day, false);
  assert.equal(core.nextUnplayed(state, day).id, 'wordle');
  assert.deepEqual(state.skipped, {});

  const results = [
    { game: 'wordle', date: '2026-11-10', won: true },
    { game: 'connections', date: '2026-11-10', won: true },
    { game: 'wordle', date: '2026-11-11', won: true },
    { game: 'connections', date: '2026-11-11', won: true },
  ];
  const ids = ['wordle', 'connections', 'strands'];
  assert.equal(fullRunStreak(ids, results, day), 0);
  assert.equal(fullRunStreak(ids, results, day, { '2026-11-10': ['strands'], '2026-11-11': ['strands'] }), 2);
  // A day where everything was skipped doesn't count.
  assert.equal(fullRunStreak(ids, [], day, { [day]: ids }), 0);
});
