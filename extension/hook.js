// Runs inside the game page itself (MAIN world), before the game's own code.
// When the game copies or shares its result, pass the text to content.js.
// It only listens: the game's own copy/share still happens exactly as before.
(() => {
  const send = (text) => {
    if (typeof text === 'string' && text.trim()) {
      window.postMessage({ __dailyRun: true, text }, location.origin);
    }
  };

  const clip = navigator.clipboard;
  if (clip) {
    const writeText = clip.writeText?.bind(clip);
    if (writeText) {
      clip.writeText = function (text) {
        send(text);
        return writeText(text);
      };
    }
    const write = clip.write?.bind(clip);
    if (write) {
      clip.write = function (items) {
        (async () => {
          for (const item of items || []) {
            if (item.types?.includes('text/plain')) send(await (await item.getType('text/plain')).text());
          }
        })().catch(() => {});
        return write(items);
      };
    }
  }

  // Phones and some desktops use the share sheet instead of the clipboard.
  const share = navigator.share?.bind(navigator);
  if (share) {
    navigator.share = function (data) {
      send(data?.text);
      return share(data);
    };
  }

  // Older games copy through a hidden textarea + execCommand('copy').
  const exec = document.execCommand.bind(document);
  document.execCommand = function (cmd, ...rest) {
    if (String(cmd).toLowerCase() === 'copy') {
      const el = document.activeElement;
      const text = el && typeof el.value === 'string'
        ? el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? el.value.length)
        : String(window.getSelection());
      send(text);
    }
    return exec(cmd, ...rest);
  };
})();
