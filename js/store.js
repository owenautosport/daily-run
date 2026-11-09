// Website storage: this browser's localStorage.
// (The extension ships its own store.js with the same API over chrome.storage.)
import { DEFAULT_STATE } from './core.js';

const KEY = 'dailyrun.v1';

export const isExtension = false;

export async function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.results)) return data;
  } catch {}
  return DEFAULT_STATE();
}

export async function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

// Called when another tab or the extension changes the data.
export function onExternalChange(fn) {
  window.addEventListener('storage', (e) => { if (e.key === KEY) loadState().then(fn); });
}
