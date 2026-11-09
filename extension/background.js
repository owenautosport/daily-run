// Service worker: owns saving results and opening the run each day.
import { byId } from './lib/games.js';
import { isoDate } from './lib/stats.js';
import * as core from './lib/core.js';
import { loadState, saveState } from './lib/store.js';

function statusFor(state, gameId) {
  const date = isoDate();
  const games = core.activeGames(state);
  const r = gameId ? core.resultFor(state, gameId, date) : null;
  const next = core.nextUnplayed(state, date);
  return {
    date,
    total: games.length,
    done: games.filter((g) => core.resultFor(state, g.id, date)).length,
    inRun: gameId ? games.some((g) => g.id === gameId) : false,
    logged: r ? byId[gameId].describe(r) : null,
    next: next ? { id: next.id, name: next.name, url: next.url } : null,
  };
}

async function handle(msg, sender) {
  let state = await loadState();
  switch (msg.type) {
    case 'status':
      return statusFor(state, msg.gameId);

    case 'result': {
      const game = byId[msg.gameId];
      if (!game) return null;
      const { kind, date } = core.classify(state, game, msg.parsed);
      // Archive puzzles (old dates) aren't today's run, so leave them out.
      if (kind !== 'old' && kind !== 'duplicate') {
        state = core.withResult(state, game, msg.parsed, date);
        await saveState(state);
      }
      return { kind, date, status: statusFor(state, game.id) };
    }

    case 'openStats':
      if (sender.tab?.id) await chrome.tabs.update(sender.tab.id, { url: chrome.runtime.getURL('stats.html') });
      else await chrome.tabs.create({ url: chrome.runtime.getURL('stats.html') });
      return true;

    case 'startRun': {
      const next = core.nextUnplayed(state);
      await chrome.tabs.create({ url: next ? next.url : chrome.runtime.getURL('stats.html') });
      return true;
    }
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  handle(msg, sender).then(reply, (err) => { console.error(err); reply(null); });
  return true; // reply asynchronously
});

// ---------- open the run once a day ----------
async function maybeAutoOpen() {
  const state = await loadState();
  if (state.autoOpen === false) return;
  const date = isoDate();
  if (state.lastAutoOpen === date) return;
  const next = core.nextUnplayed(state, date);
  if (!next) return;
  await saveState({ ...state, lastAutoOpen: date });
  await chrome.tabs.create({ url: next.url });
}

chrome.runtime.onStartup.addListener(maybeAutoOpen);
// Coming back to the computer (after a minute or more away) also counts, so a
// browser that stays open for days still brings the run up each morning.
chrome.idle.onStateChanged.addListener((s) => { if (s === 'active') maybeAutoOpen(); });

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // Today's run starts from the welcome page, not a surprise game tab.
    const state = await loadState();
    await saveState({ ...state, lastAutoOpen: isoDate() });
    await chrome.tabs.create({ url: chrome.runtime.getURL('stats.html') });
  }
});
