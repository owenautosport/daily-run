import { GAMES, byId, detectGame } from './games.js';
import { gameStats, fullRunStreak, isoDate } from './stats.js';

const KEY = 'dailyrun.v1';
const $ = (s) => document.querySelector(s);

// ---------- storage ----------
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.results)) return data;
  } catch {}
  return { results: [] };
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

const today = () => isoDate();
const resultFor = (gameId, date) => state.results.find((r) => r.game === gameId && r.date === date);

// The share text carries a puzzle number; turn it into the day it belongs to,
// so pasting yesterday's game late still lands on yesterday.
function dateForPuzzle(game, puzzle) {
  const offset = game.todaysPuzzle(new Date()) - puzzle;
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, offset));
  return { date: isoDate(d), offset };
}

function record(game, parsed) {
  const { date, offset } = dateForPuzzle(game, parsed.puzzle);
  if (offset > 7 || offset < -1) {
    if (!confirm(`That's ${game.name} #${parsed.puzzle}, but today's is #${game.todaysPuzzle(new Date())}. Save it anyway (as ${date})?`)) return false;
  }
  const existing = resultFor(game.id, date);
  if (existing) {
    if (existing.puzzle === parsed.puzzle && existing.grid === parsed.grid) {
      toast(`Already saved ${game.name} for ${date === today() ? 'today' : date}`);
      return true;
    }
    if (!confirm(`You already have a ${game.name} result for ${date}. Replace it?`)) return false;
    state.results = state.results.filter((r) => r !== existing);
  }
  state.results.push({ game: game.id, date, savedAt: new Date().toISOString(), ...parsed });
  save();
  toast(`${game.name}: ${game.describe(parsed)}${date !== today() ? ` (saved to ${date})` : ''}`);
  return true;
}

// ---------- UI helpers ----------
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) n.append(k);
  return n;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

const openPaste = new Set(); // game ids whose paste box is expanded

function openGame(game) {
  window.open(game.url, '_blank', 'noopener');
  openPaste.add(game.id);
  renderToday();
}

// ---------- Today ----------
function renderToday() {
  const d = today();
  const list = $('#game-list');
  list.replaceChildren();
  let done = 0;

  GAMES.forEach((game, i) => {
    const r = resultFor(game.id, d);
    if (r) done++;
    const li = el('li', { class: `game${r ? (r.won ? ' done' : ' lost') : ''}` });

    const actions = el('div', { class: 'game-actions' });
    if (!r) {
      actions.append(
        el('button', { class: 'primary', onclick: () => openGame(game) }, 'Play'),
        el('button', {
          class: 'secondary',
          onclick: () => { openPaste.has(game.id) ? openPaste.delete(game.id) : openPaste.add(game.id); renderToday(); },
        }, 'Paste result'),
      );
    } else {
      actions.append(el('a', { class: 'secondary', href: game.url, target: '_blank', rel: 'noopener', style: 'text-decoration:none' }, 'Open'));
    }

    li.append(
      el('div', { class: 'game-head' },
        el('div', { class: 'game-num' }, r ? (r.won ? '✓' : '✕') : String(i + 1)),
        el('div', { class: 'game-title' },
          el('h3', {}, game.name),
          el('p', { class: 'muted' }, r ? game.describe(r) : `#${game.todaysPuzzle(new Date())} · ${game.blurb}`),
        ),
        actions,
      ),
    );

    if (r) {
      const s = gameStats(game, state.results);
      li.append(
        el('div', { class: 'result' },
          el('div', { class: 'grid' }, r.grid),
          el('div', { class: 'result-text muted' },
            el('b', {}, `${s.current} day streak`),
            `${s.winPct}% wins over ${s.played} played`,
          ),
        ),
      );
    } else if (openPaste.has(game.id)) {
      li.append(pasteBox(game));
    }
    list.append(li);
  });

  const total = GAMES.length;
  $('#progress-fill').style.width = `${(done / total) * 100}%`;
  $('#progress-text').textContent = `${done} of ${total} done`;

  const next = GAMES.find((g) => !resultFor(g.id, d));
  const btn = $('#start-run');
  if (next) {
    btn.disabled = false;
    btn.textContent = done === 0 ? `Start today's run → ${next.name}` : `Next up → ${next.name}`;
    btn.onclick = () => openGame(next);
  } else {
    btn.disabled = true;
    btn.textContent = 'Run complete for today 🎉';
    btn.onclick = null;
  }

  const rs = fullRunStreak(GAMES.map((g) => g.id), state.results);
  $('#run-streak').replaceChildren(String(rs), el('small', {}, rs === 1 ? 'day full run' : 'days full run'));
}

function pasteBox(game) {
  const ta = el('textarea', { placeholder: `Paste your ${game.name} share text here`, 'aria-label': `${game.name} result` });
  const err = el('p', { class: 'error', hidden: true });
  const submit = () => {
    const text = ta.value;
    const parsed = game.parse(text);
    if (!parsed) {
      const other = detectGame(text);
      if (other) {
        if (record(other.game, other.result)) { ta.value = ''; renderAll(); }
        return;
      }
      err.textContent = `That doesn't look like a ${game.name} result. Use the game's Share button and paste the whole thing.`;
      err.hidden = false;
      return;
    }
    if (record(game, parsed)) { openPaste.delete(game.id); renderAll(); }
  };
  const fromClipboard = async () => {
    try {
      ta.value = await navigator.clipboard.readText();
      submit();
    } catch {
      err.textContent = 'Couldn’t read the clipboard. Paste into the box instead.';
      err.hidden = false;
    }
  };
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); });
  return el('div', { class: 'paste' },
    ta,
    el('div', { class: 'row' },
      navigator.clipboard?.readText ? el('button', { class: 'primary', onclick: fromClipboard }, 'Paste from clipboard') : null,
      el('button', { class: 'secondary', onclick: submit }, 'Save'),
    ),
    err,
  );
}

// Paste anywhere on the page (outside a text box) and we'll figure out the game.
document.addEventListener('paste', (e) => {
  if (e.target.closest('textarea, input')) return;
  const text = e.clipboardData?.getData('text') || '';
  const hit = detectGame(text);
  if (hit) {
    e.preventDefault();
    if (record(hit.game, hit.result)) { openPaste.delete(hit.game.id); renderAll(); }
  } else if (text.trim()) {
    toast('Couldn’t spot a Wordle or Connections result in that');
  }
});

// ---------- Stats ----------
function renderStats() {
  const root = $('#tab-stats');
  root.replaceChildren();
  if (!state.results.length) {
    root.append(el('p', { class: 'empty muted' }, 'No games logged yet. Finish one and your stats show up here.'));
    return;
  }
  for (const game of GAMES) {
    const s = gameStats(game, state.results);
    const maxCount = Math.max(1, ...Object.values(s.dist));
    const todays = resultFor(game.id, today());
    const hotBucket = todays ? game.bucketOf(todays) : null;

    // Last 28 days, oldest first.
    const cal = el('div', { class: 'calendar', 'aria-label': 'Last 28 days' });
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = isoDate(d);
      const r = resultFor(game.id, iso);
      cal.append(el('i', { class: `${r ? (r.won ? 'win' : 'loss') : ''}${i === 0 ? ' today' : ''}`, title: `${iso}${r ? ': ' + game.describe(r) : ''}` }));
    }

    root.append(
      el('div', { class: 'stat-card' },
        el('h3', {}, game.name),
        el('div', { class: 'tiles' },
          tile(s.played, 'Played'),
          tile(`${s.winPct}%`, 'Win %'),
          tile(s.current, 'Streak'),
          tile(s.max, 'Best streak'),
        ),
        el('p', { class: 'dist-label' }, `${game.scoreLabel}${s.avg != null ? ` · average ${s.avg.toFixed(2)} when won` : ''}`),
        el('div', { class: 'dist' },
          game.buckets.map((b) =>
            el('div', { class: 'bar-row' },
              el('span', {}, b),
              el('div', { class: `bar${b === hotBucket ? ' hot' : ''}`, style: `width:${Math.max(8, (s.dist[b] / maxCount) * 100)}%` }, String(s.dist[b])),
            ),
          ),
        ),
        cal,
      ),
    );
  }
}
const tile = (v, label) => el('div', { class: 'tile' }, el('b', {}, String(v)), el('span', {}, label));

// ---------- History ----------
function renderHistory() {
  const root = $('#tab-history');
  root.replaceChildren();
  const rs = [...state.results].sort((a, b) => b.date.localeCompare(a.date) || a.game.localeCompare(b.game));
  if (!rs.length) {
    root.append(el('p', { class: 'empty muted' }, 'Nothing here yet.'));
    return;
  }
  root.append(
    el('ul', { class: 'history' },
      rs.map((r) => {
        const g = byId[r.game];
        return el('li', {},
          el('span', { class: 'when' }, r.date),
          el('span', { class: 'what' }, el('b', {}, g?.name ?? r.game), ` #${r.puzzle} · ${g ? g.describe(r) : ''}`),
          el('button', {
            title: 'Delete', 'aria-label': `Delete ${g?.name} ${r.date}`,
            onclick: () => {
              if (!confirm(`Delete ${g?.name} for ${r.date}?`)) return;
              state.results = state.results.filter((x) => x !== r);
              save();
              renderAll();
            },
          }, '×'),
        );
      }),
    ),
  );
}

// ---------- Settings ----------
$('#export').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `daily-run-${today()}.json` });
  a.click();
  URL.revokeObjectURL(a.href);
};
$('#import').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.results)) throw new Error();
    // Merge: imported results win on the same game + date.
    const key = (r) => `${r.game}|${r.date}`;
    const incoming = new Set(data.results.map(key));
    state.results = [...state.results.filter((r) => !incoming.has(key(r))), ...data.results];
    save();
    renderAll();
    toast(`Imported ${data.results.length} results`);
  } catch {
    toast('That file isn’t a Daily Run backup');
  }
  e.target.value = '';
};
$('#reset').onclick = () => {
  if (!confirm('Delete every saved result? This can’t be undone (export a backup first if unsure).')) return;
  state = { results: [] };
  save();
  renderAll();
};

// ---------- tabs ----------
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.tab').forEach((s) => (s.hidden = s.id !== `tab-${name}`));
  history.replaceState(null, '', name === 'today' ? location.pathname : `#${name}`);
}
document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

function renderAll() {
  $('#today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  renderToday();
  renderStats();
  renderHistory();
}

renderAll();
showTab(location.hash.slice(1) || 'today');

// Coming back to the tab after midnight: redraw for the new day. (Don't redraw
// otherwise; it would wipe anything half-typed in a paste box.)
let renderedFor = today();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && today() !== renderedFor) {
    renderedFor = today();
    openPaste.clear();
    renderAll();
  }
});
