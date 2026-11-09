// Extension storage: chrome.storage.local, shared by the background worker,
// the popup, the stats page and the game-page panel.
import { DEFAULT_STATE } from './core.js';

const KEY = 'dailyrun.v1';

export const isExtension = true;

export async function loadState() {
  const got = await chrome.storage.local.get(KEY);
  const data = got[KEY];
  return data && Array.isArray(data.results) ? data : DEFAULT_STATE();
}

export async function saveState(state) {
  await chrome.storage.local.set({ [KEY]: state });
}

export function onExternalChange(fn) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) fn(changes[KEY].newValue ?? DEFAULT_STATE());
  });
}
