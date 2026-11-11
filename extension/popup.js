import { isoDate } from './lib/stats.js';
import * as core from './lib/core.js';
import { loadState } from './lib/store.js';

const state = await loadState();
const date = isoDate();
const games = core.activeGames(state);
const done = games.filter((g) => core.isDone(state, g.id, date)).length;
const next = core.nextUnplayed(state, date);

document.getElementById('count').textContent = `${done} of ${games.length} today`;
document.getElementById('fill').style.width = `${games.length ? (done / games.length) * 100 : 0}%`;

const go = document.getElementById('go');
if (next) {
  go.textContent = `${done ? 'Carry on' : "Start today's run"} → ${next.name}`;
  go.onclick = async () => {
    await chrome.runtime.sendMessage({ type: 'startRun' });
    window.close();
  };
  const skip = document.getElementById('skip');
  skip.hidden = false;
  skip.textContent = `Skip ${next.name} today`;
  skip.onclick = async () => {
    await chrome.runtime.sendMessage({ type: 'skip', gameId: next.id });
    location.reload();
  };
} else {
  go.textContent = games.length ? 'Run complete for today 🎉' : 'Pick games in settings';
  go.disabled = true;
}

const list = document.getElementById('list');
for (const g of games) {
  const r = core.resultFor(state, g.id, date);
  const sk = !r && core.isSkipped(state, g.id, date);
  const li = document.createElement('li');
  li.className = r ? (r.won ? 'won' : 'lost') : sk ? 'skipped' : '';
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.textContent = r ? (r.won ? '✓' : '✕') : sk ? '–' : '·';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = g.name;
  const res = document.createElement('span');
  res.className = 'res';
  res.textContent = r ? g.describe(r) : sk ? 'skipped' : '';
  li.append(mark, name, res);
  list.append(li);
}

document.getElementById('stats').onclick = (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('stats.html') });
  window.close();
};
