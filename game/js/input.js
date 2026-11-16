// Keyboard: arrows/WASD move, L/H/B/A combat, 1-4 answer, Enter/Space continue. Touch uses the on-screen buttons.
DD.input = {
  init() {
    window.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase(), ui = DD.ui;
      if (ui.mode === 'map') {
        const m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
        if (m) { e.preventDefault(); DD.game.move(m[0], m[1]); }
      } else if (ui.mode === 'combat') {
        const C = DD.game.combat; if (!C) return;
        if (C.phase === 'choose') {
          const a = { l: 'light', h: 'heavy', b: 'block', a: 'ability' }[k];
          if (a) { e.preventDefault(); ui.act(a); }
        } else if (C.phase === 'question' && /^[1-4]$/.test(k)) {
          if (+k <= C.opts.length) { e.preventDefault(); ui.act('answer', +k - 1); }
        } else if ((C.phase === 'explain' || C.phase === 'end') && (k === 'enter' || k === ' ')) {
          e.preventDefault(); ui.act('cont');
        }
      }
    });
  }
};
