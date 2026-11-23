// Missed-question review, the drill launcher, and the post-mortem on death. Shares one question card.
DD.review = (function () {
  const { el } = DD.u;
  const R = {};

  // One question with its answer and explanation. s = qstats entry (optional) for the missed/right chips.
  // Flag toggle for one question. Flagging pulls it from rotation at once; the button flips in place so a question in progress is not redrawn.
  R.flagBtn = function (q) {
    const b = el('button', { class: 'btn small flagbtn', type: 'button' });
    const paint = () => { const on = DD.q.isFlagged(q); b.textContent = on ? '⚑ Flagged' : '⚐ Flag'; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
      b.title = on ? 'Flagged: out of rotation. Unflag it from the Flagged list on the body map, or tap again.' : 'Flag this question as wrong or unclear. It leaves rotation until you fix or delete it.'; };
    b.addEventListener('click', ev => { ev.stopPropagation(); DD.q.setFlag(q.id, !DD.q.isFlagged(q)); paint(); });
    paint(); return b;
  };
  function card(q, s, noFlag) {
    return el('div', { class: 'card qcard' },
      el('div', { class: 'chips' },
        s ? el('span', { class: 'chip danger' }, 'missed ' + s.wrong) : null,
        s ? el('span', { class: 'chip ok' }, 'right ' + s.right) : null,
        q.placeholder ? el('span', { class: 'chip' }, 'placeholder') : null,
        q.img ? el('span', { class: 'chip ok' }, DD.img.TAGS[q.img.tag]) : null),
      el('p', { class: 'q' }, q.q),
      q.img ? DD.img.view(q.img, true) : null,
      el('div', { class: 'fb good' }, el('b', null, 'Answer: '), q.answer),
      el('div', { class: 'small dim' }, q.explain),
      noFlag ? null : R.flagBtn(q));
  }
  R.card = card;

  // Every question with wrong >= 1, grouped by system, worst (wrong - right) first.
  R.missed = function () {
    const qs = DD.save.profile.qstats, byId = new Map(DD.q.all().map(q => [q.id, q]));
    return Object.keys(qs).filter(id => qs[id].wrong >= 1 && byId.has(id) && !DD.q.isFlagged(byId.get(id)))
      .map(id => ({ q: byId.get(id), s: qs[id], score: qs[id].wrong - qs[id].right }))
      .sort((a, b) => b.score - a.score || b.s.wrong - a.s.wrong);
  };

  R.screen = function () {
    const ui = DD.ui; ui.mode = 'review';
    const rows = R.missed();
    const groups = DD.img.SYSTEMS.map(([id, name]) => [name, rows.filter(r => r.q.system === id)]).filter(g => g[1].length);
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Derrick'),
      el('h1', null, 'Missed questions'),
      el('p', { class: 'dim small' }, rows.length ? rows.length + ' question' + (rows.length === 1 ? '' : 's') + ' you have missed at least once. Worst first within each system: misses minus right answers.'
        : 'Nothing missed yet. Questions you get wrong will collect here with their answers.'),
      el('div', { class: 'toolrow2' },
        el('button', { class: 'btn', type: 'button', onclick: () => ui.menu() }, 'Back to the body map'),
        el('button', { class: 'btn primary', type: 'button', disabled: !rows.length, title: 'A no-damage practice fight against a training dummy, using only these questions',
          onclick: () => DD.game.startDrill(rows.map(r => r.q.id)) }, 'Drill these' + (rows.length ? ' (' + rows.length + ')' : ''))),
      groups.map(([name, list]) => el('div', { class: 'ed-group' },
        el('h3', null, name + ' (' + list.length + ')'),
        list.map(r => card(r.q, r.s))))));
  };

  // Question bank: every text question in the game (built-in and your own), by system. Lab image questions live in Lab images.
  R.bank = function () {
    const ui = DD.ui; ui.mode = 'bank';
    const qs = DD.save.profile.qstats, all = DD.img.SYSTEMS.flatMap(([id]) => DD.q.pool([id], true).filter(q => !q.img));
    const own = all.filter(q => q.custom).length;
    const rows = all.map(q => {
      const node = el('div', null, card(q, qs[q.id] && qs[q.id].seen ? qs[q.id] : null),
        el('div', { class: 'small dim' }, el('b', null, 'Wrong options: '), q.wrong.join(' · '),
          el('span', null, '  ·  ' + (q.custom ? 'Your question' : 'Built-in') + (DD.q.isFlagged(q) ? ' · flagged' : ''))));
      return { q, node, hay: [q.q, q.answer, q.explain].concat(q.wrong).join(' ').toLowerCase() };
    });
    const groups = DD.img.SYSTEMS.map(([id, name]) => {
      const list = rows.filter(r => r.q.system === id); if (!list.length) return null;
      const sum = el('summary', null, name + ' (' + list.length + ')');
      return { list, name, sum, box: el('details', { class: 'ed-group' }, sum, list.map(r => r.node)) };
    }).filter(Boolean);
    const count = el('p', { class: 'dim small' });
    const apply = term => {
      let shown = 0;
      groups.forEach(g => {
        const n = g.list.filter(r => { const on = !term || r.hay.includes(term); r.node.style.display = on ? '' : 'none'; return on; }).length;
        shown += n; g.box.style.display = n ? '' : 'none'; g.sum.textContent = g.name + ' (' + n + ')'; if (term) g.box.open = n > 0;
      });
      count.textContent = all.length ? (term ? shown + ' of ' + all.length + ' match.' : all.length + ' multiple-choice questions (' + own + ' yours). Tap a system to open it.')
        : 'No multiple-choice questions yet. Add study material to write some.';
    };
    const search = el('input', { type: 'search', placeholder: 'Search questions, answers, explanations', 'aria-label': 'Search questions', style: { width: '100%' },
      oninput: () => apply(search.value.trim().toLowerCase()) });
    apply('');
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Study'),
      el('h1', null, 'Question bank'),
      count,
      el('div', { class: 'toolrow2' }, el('button', { class: 'btn', type: 'button', onclick: () => ui.leaveStudy() }, 'Back')),
      all.length ? search : null,
      groups.map(g => g.box)));
  };

  // Quiz mode: questions only, no combat. Pick systems (or missed only), then answer nonstop until you stop.
  // Uses the normal picker and records stats and mastery like any other answer.
  R.quiz = function () {
    const ui = DD.ui; ui.mode = 'quizsetup';
    const sys = DD.img.SYSTEMS.map(([id, name]) => ({ id, name, n: DD.q.available([id]) })).filter(x => x.n);
    const missed = R.missed().length, chosen = new Set(sys.map(x => x.id));
    const boxes = sys.map(x => el('label', { class: 'small', style: { display: 'flex', gap: '6px', alignItems: 'center' } },
      el('input', { type: 'checkbox', checked: true, onchange: e => { e.target.checked ? chosen.add(x.id) : chosen.delete(x.id); } }), x.name + ' (' + x.n + ')'));
    const start = ids => { if (ids.length) R.quizRun({ systems: ids, missedOnly: false }); };
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Study'),
      el('h1', null, 'Quiz mode'),
      el('p', { class: 'dim small' }, 'Questions only, no combat. Missed, unseen and stale questions come up more often. Answers count toward mastery. Keys 1–4 answer, Enter continues, Esc stops.'),
      sys.length ? el('div', { class: 'card stack' }, el('b', null, 'Systems'), boxes) : el('p', { class: 'warn' }, 'No questions yet. Add study material first.'),
      el('div', { class: 'toolrow2' },
        el('button', { class: 'btn', type: 'button', onclick: () => ui.leaveStudy() }, 'Back'),
        el('button', { class: 'btn primary', type: 'button', disabled: !sys.length, onclick: () => start([...chosen]) }, 'Start'),
        el('button', { class: 'btn', type: 'button', disabled: !missed, onclick: () => R.quizRun({ missedOnly: true }) }, 'Missed only (' + missed + ')'))));
  };
  R.quizRun = function (cfg) {
    const ui = DD.ui, Z = R.qz = { cfg, n: 0, right: 0, streak: 0, best: 0, miss: [] };
    if (cfg.missedOnly) Z.left = R.missed().map(r => r.q.id);
    const next = () => {
      if (cfg.missedOnly) {
        const byId = new Map(DD.q.all().map(q => [q.id, q])), qs = Z.left.map(id => byId.get(id)).filter(Boolean);
        if (!qs.length) return R.quizEnd();
        const fresh = qs.filter(q => !Z.q || q.id !== Z.q.id);
        Z.q = DD.u.pick(Math.random, fresh.length ? fresh : qs);
      } else Z.q = DD.q.pick(cfg.systems);
      Z.opts = DD.q.options(Z.q); Z.ans = null; draw();
    };
    Z.answer = i => {
      if (Z.ans || !Z.opts[i]) return;
      const ok = Z.opts[i].correct; Z.ans = { i, ok };
      DD.q.record(Z.q, ok, DD.q.regionOf(Z.q)); DD.save.save();
      Z.n++; if (ok) { Z.right++; Z.streak++; Z.best = Math.max(Z.best, Z.streak); if (Z.left) Z.left = Z.left.filter(id => id !== Z.q.id); }
      else { Z.streak = 0; if (!Z.miss.includes(Z.q.id)) Z.miss.push(Z.q.id); }
      draw();
    };
    Z.cont = () => { if (Z.ans) next(); };
    const draw = () => {
      ui.mode = 'quiz';
      const q = Z.q, a = Z.ans, name = (DD.img.SYSTEMS.find(s => s[0] === q.system) || [, q.system])[1];
      ui.mount(el('div', { class: 'screen menu' },
        el('div', { class: 'rhead' }, el('span', { class: 'tag' }, 'Quiz · ' + name),
          el('span', { class: 'small' }, Z.right + '/' + Z.n + (Z.n ? ' (' + Math.round(100 * Z.right / Z.n) + '%)' : '') + ' · streak ' + Z.streak + (Z.left ? ' · ' + Z.left.length + ' left' : ''))),
        el('div', { class: 'card stack' },
          el('div', { class: 'qrow' }, el('p', { class: 'q' }, q.q), R.flagBtn(q)),
          q.img ? DD.img.view(q.img, !!a) : null,
          el('div', { class: 'opts' }, Z.opts.map((o, i) => el('button', {
            class: 'opt' + (a ? o.correct ? ' right' : i === a.i ? ' wrong' : '' : ''), disabled: !!a, type: 'button',
            onclick: () => Z.answer(i) }, el('kbd', null, String(i + 1)), o.text))),
          a ? el('div', { class: 'fb ' + (a.ok ? 'good' : 'bad') }, el('b', null, a.ok ? 'Correct. ' : 'The answer is ' + q.answer + '. '), q.explain) : null,
          a ? el('button', { class: 'btn primary', type: 'button', onclick: Z.cont }, 'Next [Enter]') : null),
        el('div', { class: 'toolrow2' }, el('button', { class: 'btn small', type: 'button', onclick: R.quizEnd }, 'Stop [Esc]'))));
    };
    next();
  };
  R.quizEnd = function () {
    const ui = DD.ui, Z = R.qz || { n: 0, right: 0, best: 0, miss: [] }; ui.mode = 'review';
    const byId = new Map(DD.q.all().map(q => [q.id, q])), qs = Z.miss.map(id => byId.get(id)).filter(Boolean);
    R.qz = null;
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Quiz mode'),
      el('h1', null, Z.n ? Z.right + ' of ' + Z.n + ' right' : 'No questions answered'),
      Z.n ? el('p', { class: 'dim small' }, Math.round(100 * Z.right / Z.n) + '% · best streak ' + Z.best + (Z.left && !Z.left.length ? ' · every missed question cleared' : '')) : null,
      el('div', { class: 'toolrow2' },
        el('button', { class: 'btn primary', type: 'button', onclick: R.quiz }, 'Another round'),
        el('button', { class: 'btn', type: 'button', onclick: () => ui.leaveStudy() }, 'Back')),
      el('h3', null, qs.length ? 'Missed this round (' + qs.length + ')' : 'Nothing missed this round'),
      qs.map(q => card(q, null))));
  };

  // Death screen: what killed you, this run's misses, the glucose penalty, then respawn (optionally switching class).
  R.postMortem = function (info) {
    const ui = DD.ui; ui.mode = 'dead';
    const byId = new Map(DD.q.all().map(q => [q.id, q]));
    const qs = info.missIds.map(id => byId.get(id)).filter(Boolean);
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Post-mortem · ' + info.region.name),
      el('h1', null, 'Your cell has died'),
      el('p', { class: 'lede' }, 'Destroyed by ' + info.by + ' after ' + info.killed + ' kill' + (info.killed === 1 ? '' : 's') + '. You will re-form in the bone marrow with full HP and ATP, and ' + (info.trip ? 'this trip ends.' : 'this dungeon resets.')),
      el('p', { class: 'warn' }, info.lost ? 'You lost ' + info.lost + ' glucose (half of what you carried). ' + info.kept + ' left.' : 'You had no glucose to lose.'),
      el('p', { class: 'dim small' }, 'Level, gear, items, question history and routes are kept.'),
      el('div', { class: 'toolrow2' },
        el('button', { class: 'btn primary', type: 'button', onclick: () => ui.menu('marrow') }, 'Respawn at the marrow'),
        el('button', { class: 'btn', type: 'button', onclick: ui.classes }, 'Respawn and switch class')),
      el('h3', null, qs.length ? 'Questions you missed this run (' + qs.length + ')' : 'You missed no questions this run'),
      qs.map(q => card(q, null))));
  };
  return R;
})();
