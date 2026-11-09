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

  // Older games (and the copy-to-clipboard library, which Worldle uses) select
  // some hidden text and call execCommand('copy'). Send both the page selection
  // and any selected text-box text: the game's own guess box often still has
  // focus, so the selection alone isn't always the share text.
  const exec = document.execCommand.bind(document);
  document.execCommand = function (cmd, ...rest) {
    if (String(cmd).toLowerCase() === 'copy') {
      send(String(window.getSelection()));
      const el = document.activeElement;
      if (el && typeof el.value === 'string' && el.selectionStart !== el.selectionEnd) {
        send(el.value.slice(el.selectionStart, el.selectionEnd));
      }
    }
    return exec(cmd, ...rest);
  };

  // Copy handlers that write the text straight into the clipboard event
  // (e.clipboardData.setData('text/plain', text)).
  const setData = DataTransfer.prototype.setData;
  DataTransfer.prototype.setData = function (type, data) {
    if (/^text(\/plain)?$/i.test(String(type))) send(data);
    return setData.call(this, type, data);
  };
})();
