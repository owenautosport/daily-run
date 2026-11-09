// Logic shared by the website and the browser extension. No DOM, no storage.
import { GAMES } from './games.js';
import { isoDate } from './stats.js';

export const DEFAULT_STATE = () => ({ results: [] });

// Which games are in your run (Settings). Default: all of them, in GAMES order.
export const activeGames = (state) =>
  state.enabled ? GAMES.filter((g) => state.enabled.includes(g.id)) : GAMES;

export const resultFor = (state, gameId, date) =>
  state.results.find((r) => r.game === gameId && r.date === date);

export const nextUnplayed = (state, date = isoDate()) =>
  activeGames(state).find((g) => !resultFor(state, g.id, date));

// Work out which day a result belongs to, so a game finished after midnight, or
// pasted late, still lands on its own day. Some games put the date in the share
// text; for the rest, count back from today's puzzle number.
export function dateForResult(game, parsed, now = new Date()) {
  const today = isoDate(now);
  if (parsed.date) {
    const offset = Math.round((new Date(today) - new Date(parsed.date)) / 86400000);
    return { date: offset < 0 ? today : parsed.date, offset };
  }
  if (game.todaysPuzzle && parsed.puzzle != null) {
    const offset = game.todaysPuzzle(now) - parsed.puzzle;
    const d = new Date(now);
    d.setDate(d.getDate() - Math.max(0, offset));
    return { date: isoDate(d), offset };
  }
  return { date: today, offset: 0 };
}

// Decide what saving a result would do, without doing it.
//   'new'       nothing saved for that game + day yet
//   'duplicate' the same result is already saved
//   'conflict'  a different result is saved for that game + day
//   'old'       it's more than a week old (or from the future)
export function classify(state, game, parsed, now = new Date()) {
  const { date, offset } = dateForResult(game, parsed, now);
  const existing = resultFor(state, game.id, date);
  let kind = 'new';
  if (existing) kind = existing.score === parsed.score && existing.grid === parsed.grid ? 'duplicate' : 'conflict';
  else if (offset > 7 || offset < -1) kind = 'old';
  return { kind, date, existing };
}

// Returns a new state with the result stored (replacing any for that game + day).
export function withResult(state, game, parsed, date, now = new Date()) {
  const { date: _fromShare, ...rest } = parsed;
  return {
    ...state,
    results: [
      ...state.results.filter((r) => !(r.game === game.id && r.date === date)),
      { game: game.id, date, savedAt: now.toISOString(), ...rest },
    ],
  };
}
