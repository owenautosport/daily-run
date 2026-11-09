// Pure stats over a list of results: [{ game, date: 'YYYY-MM-DD', won, score, ... }]

export function isoDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function prevDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d - 1));
}

export function gameStats(game, results, today = isoDate()) {
  const rs = results.filter((r) => r.game === game.id).sort((a, b) => a.date.localeCompare(b.date));
  const played = rs.length;
  const wins = rs.filter((r) => r.won).length;

  const winDays = new Set(rs.filter((r) => r.won).map((r) => r.date));

  // Current streak: count back from today (or yesterday, if today isn't played yet).
  let current = 0;
  let day = winDays.has(today) ? today : prevDay(today);
  while (winDays.has(day)) {
    current++;
    day = prevDay(day);
  }

  // Max streak across history.
  let max = 0;
  let run = 0;
  let last = null;
  for (const r of rs) {
    if (r.won && last && prevDay(r.date) === last) run++;
    else run = r.won ? 1 : 0;
    if (r.won) last = r.date;
    else last = null;
    max = Math.max(max, run);
  }

  const dist = Object.fromEntries(game.buckets.map((b) => [b, 0]));
  for (const r of rs) dist[game.bucketOf(r)]++;

  const wonScores = rs.filter((r) => r.won).map((r) => r.score);
  const avg = wonScores.length ? wonScores.reduce((a, b) => a + b, 0) / wonScores.length : null;

  return {
    played,
    wins,
    winPct: played ? Math.round((wins / played) * 100) : 0,
    current,
    max,
    dist,
    avg,
  };
}

// Days on which every game in the run was played.
export function fullRunStreak(gameIds, results, today = isoDate()) {
  const byDay = new Map();
  for (const r of results) {
    if (!byDay.has(r.date)) byDay.set(r.date, new Set());
    byDay.get(r.date).add(r.game);
  }
  const complete = (d) => gameIds.every((id) => byDay.get(d)?.has(id));
  let n = 0;
  let day = complete(today) ? today : prevDay(today);
  while (complete(day)) {
    n++;
    day = prevDay(day);
  }
  return n;
}
