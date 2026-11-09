// Runs on each game page (isolated world). Shows the Daily Run panel, hands any
// shared result to the background worker, then moves you on to the next game.
(async () => {
  if (window.top !== window) return;
  const { GAMES, detectGame } = await import(chrome.runtime.getURL('lib/games.js'));

  const here = GAMES.find((g) => location.href.startsWith(g.url.replace(/index\.html$/, '')));
  if (!here) return;

  const ask = (msg) => chrome.runtime.sendMessage(msg).catch(() => null);
  const AUTO_ADVANCE_SECONDS = 5;

  // ---------- panel (shadow DOM so the game's CSS can't touch it) ----------
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .card {
        font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
        background: #1f1d17; color: #f1ece0; border: 1px solid #34312a; border-radius: 14px;
        box-shadow: 0 8px 30px rgba(0,0,0,.35); padding: 12px 14px; width: 290px;
      }
      .card.min { width: auto; padding: 8px 12px; cursor: pointer; }
      .card.min .body { display: none; }
      .top { display: flex; align-items: center; gap: 8px; }
      .brand { font-weight: 700; flex: 1; }
      .count { color: #a39d8e; font-size: 12px; }
      .x { background: none; border: 0; color: #a39d8e; font-size: 16px; cursor: pointer; padding: 0 2px; }
      .bar { height: 4px; border-radius: 9px; background: #34312a; margin: 8px 0 10px; overflow: hidden; }
      .bar span { display: block; height: 100%; background: #6aaa64; transition: width .4s; }
      .msg { margin: 0 0 10px; }
      .msg b { color: #fff; }
      .muted { color: #a39d8e; font-size: 12px; }
      .row { display: flex; gap: 8px; }
      button.go, button.stay {
        font: inherit; font-weight: 600; border-radius: 999px; padding: 7px 14px; cursor: pointer; border: 1px solid #34312a;
      }
      button.go { background: #f1ece0; color: #15140f; border-color: #f1ece0; flex: 1; white-space: nowrap; }
      button.stay { background: none; color: #f1ece0; }
      .hidden { display: none !important; }
    </style>
    <div class="card">
      <div class="top">
        <span class="brand">Daily Run</span>
        <span class="count"></span>
        <button class="x" title="Minimise" aria-label="Minimise">–</button>
      </div>
      <div class="body">
        <div class="bar"><span></span></div>
        <p class="msg"></p>
        <div class="row">
          <button class="go hidden"></button>
          <button class="stay hidden">Stay</button>
        </div>
      </div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const card = $('.card');
  $('.x').onclick = (e) => { e.stopPropagation(); card.classList.add('min'); };
  card.onclick = () => card.classList.remove('min');
  document.documentElement.append(host);

  let countdown = null;
  const stopCountdown = () => { clearInterval(countdown); countdown = null; };

  function show(status, note) {
    stopCountdown();
    const { done, total, logged, next, inRun } = status;
    $('.count').textContent = `${done}/${total}`;
    $('.bar span').style.width = `${total ? (done / total) * 100 : 0}%`;
    const msg = $('.msg');
    const go = $('.go');
    const stay = $('.stay');
    stay.classList.add('hidden');
    msg.replaceChildren();

    if (note) {
      msg.append(note, document.createElement('br'));
    }
    if (logged) {
      const b = document.createElement('b');
      b.textContent = `✓ ${here.name}: ${logged}`;
      msg.prepend(b, document.createElement('br'));
    } else if (inRun) {
      msg.append(`Press ${here.name}'s Share button when you finish and it's logged automatically.`);
    } else {
      msg.append(`${here.name} isn't in your run. Turn it on in Daily Run's settings.`);
    }

    if (next && (logged || !inRun)) {
      go.textContent = `Next: ${next.name} →`;
      go.onclick = () => { location.href = next.url; };
      go.classList.remove('hidden');
    } else if (!next && done === total && total > 0) {
      const fin = document.createElement('span');
      fin.className = 'muted';
      fin.textContent = 'Run complete for today 🎉';
      msg.append(fin);
      go.textContent = 'See your stats';
      go.onclick = () => ask({ type: 'openStats' });
      go.classList.remove('hidden');
    } else {
      go.classList.add('hidden');
    }
  }

  function autoAdvance(next) {
    const go = $('.go');
    const stay = $('.stay');
    let left = AUTO_ADVANCE_SECONDS;
    const tick = () => {
      go.textContent = `Next: ${next.name} in ${left}s →`;
      if (left-- <= 0) { stopCountdown(); location.href = next.url; }
    };
    tick();
    countdown = setInterval(tick, 1000);
    stay.classList.remove('hidden');
    stay.onclick = () => { stopCountdown(); go.textContent = `Next: ${next.name} →`; stay.classList.add('hidden'); };
  }

  // ---------- results ----------
  window.addEventListener('message', async (e) => {
    if (e.source !== window || !e.data || e.data.__dailyRun !== true) return;
    const hit = detectGame(String(e.data.text));
    if (!hit) return;
    const reply = await ask({ type: 'result', gameId: hit.game.id, parsed: hit.result });
    if (!reply) return;
    card.classList.remove('min');
    if (reply.kind === 'old') {
      show(reply.status, `That's the ${reply.date} puzzle, so it wasn't logged.`);
      return;
    }
    show(reply.status);
    if (reply.status.next && reply.kind !== 'duplicate') autoAdvance(reply.status.next);
  });

  // ---------- first paint ----------
  const status = await ask({ type: 'status', gameId: here.id });
  if (status) show(status);
})();
