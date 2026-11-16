// Keyboard: arrows/WASD move, L/H/B/A combat, 1-4 answer, Enter/Space continue. Touch uses the on-screen buttons.
DD.input = {
  init() {
    window.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase(), ui = DD.ui;
      if (ui.mode === 'map') {
        const m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
        if (m) { e.preventDefault(); DD.game.move(m[0], m[1]); }
      } else if (ui.mode === 'town') {
        const m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
        if (m) { e.preventDefault(); DD.town.move(m[0], m[1]); }
      } else if (ui.mode === 'chart') {
        if ((k === 'escape' || k === 'enter') && DD.derrickui.close) { e.preventDefault(); DD.derrickui.close(); }
      } else if (ui.mode === 'townpanel') {
        if (k === 'escape') { e.preventDefault(); DD.town.close(); }
      } else if (ui.mode === 'popquiz') {
        const Q = DD.game.quiz; if (!Q) return;
        if (!Q.answer && /^[1-4]$/.test(k) && +k <= Q.opts.length) { e.preventDefault(); DD.game.answerTrap(+k - 1); }
        else if (Q.answer && (k === 'enter' || k === ' ')) { e.preventDefault(); DD.game.endTrap(); }
      } else if (ui.mode === 'npc') {
        const T = DD.game.talk; if (!T) return;
        if (k === 'escape' && T.phase !== 'ask') { e.preventDefault(); DD.npc.close(); }
        else if (T.phase === 'ask' && !T.answer && /^[1-4]$/.test(k) && +k <= T.opts.length) { e.preventDefault(); DD.npc.answer(+k - 1); }
        else if (k === 'enter' || k === ' ') {
          if (T.phase === 'greet' && !T.npc.done) { e.preventDefault(); DD.npc.ask(); }
          else if (T.phase === 'result' || T.phase === 'noq') { e.preventDefault(); DD.npc.close(); }
        }
      } else if (ui.mode === 'dia') {
        if ((k === 'enter' || k === ' ') && ui.diaSkip) { e.preventDefault(); ui.diaSkip(); }
      } else if (ui.mode === 'combat') {
        const C = DD.game.combat; if (!C) return;
        if (C.phase === 'choose') {
          const a = C.drill ? { h: 'heavy' }[k] : { l: 'attack', b: 'block', a: 'abilities', i: 'items' }[k];
          if (a) { e.preventDefault(); ui.act(a); }
        } else if (C.phase === 'target' && k === 'escape') { e.preventDefault(); ui.act('cancel');
        } else if (C.phase === 'question' && /^[1-4]$/.test(k)) {
          if (+k <= C.opts.length) { e.preventDefault(); ui.act('answer', +k - 1); }
        } else if ((C.phase === 'explain' || C.phase === 'end') && (k === 'enter' || k === ' ')) {
          e.preventDefault(); ui.act('cont');
        }
      }
    });
  }
};
