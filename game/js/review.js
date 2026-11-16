// Missed-question review, the drill launcher, and the post-mortem on death. Shares one question card.
DD.review = (function () {
  const { el } = DD.u;
  const R = {};

  // One question with its answer and explanation. s = qstats entry (optional) for the missed/right chips.
  function card(q, s) {
    return el('div', { class: 'card qcard' },
      el('div', { class: 'chips' },
        s ? el('span', { class: 'chip danger' }, 'missed ' + s.wrong) : null,
        s ? el('span', { class: 'chip ok' }, 'right ' + s.right) : null,
        q.placeholder ? el('span', { class: 'chip' }, 'placeholder') : null,
        q.img ? el('span', { class: 'chip ok' }, DD.img.TAGS[q.img.tag]) : null),
      el('p', { class: 'q' }, q.q),
      q.img ? DD.img.view(q.img, true) : null,
      el('div', { class: 'fb good' }, el('b', null, 'Answer: '), q.answer),
      el('div', { class: 'small dim' }, q.explain));
  }
  R.card = card;

  // Every question with wrong >= 1, grouped by system, worst (wrong - right) first.
  R.missed = function () {
    const qs = DD.save.profile.qstats, byId = new Map(DD.q.all().map(q => [q.id, q]));
    return Object.keys(qs).filter(id => qs[id].wrong >= 1 && byId.has(id))
      .map(id => ({ q: byId.get(id), s: qs[id], score: qs[id].wrong - qs[id].right }))
      .sort((a, b) => b.score - a.score || b.s.wrong - a.s.wrong);
  };

  R.screen = function () {
    const ui = DD.ui; ui.mode = 'review';
    const rows = R.missed();
    const groups = DD.img.SYSTEMS.map(([id, name]) => [name, rows.filter(r => r.q.system === id)]).filter(g => g[1].length);
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Bone Marrow'),
      el('h1', null, 'Missed questions'),
      el('p', { class: 'dim small' }, rows.length ? rows.length + ' question' + (rows.length === 1 ? '' : 's') + ' you have missed at least once. Worst first within each system: misses minus right answers.'
        : 'Nothing missed yet. Questions you get wrong will collect here with their answers.'),
      el('div', { class: 'toolrow2' },
        el('button', { class: 'btn', type: 'button', onclick: ui.menu }, 'Back to the marrow'),
        el('button', { class: 'btn primary', type: 'button', disabled: !rows.length, title: 'A no-damage practice fight against a training dummy, using only these questions',
          onclick: () => DD.game.startDrill(rows.map(r => r.q.id)) }, 'Drill these' + (rows.length ? ' (' + rows.length + ')' : ''))),
      groups.map(([name, list]) => el('div', { class: 'ed-group' },
        el('h3', null, name + ' (' + list.length + ')'),
        list.map(r => card(r.q, r.s))))));
  };

  // Death screen: what killed you, this run's misses, the glucose penalty, then respawn (optionally switching class).
  R.postMortem = function (info) {
    const ui = DD.ui; ui.mode = 'dead';
    const byId = new Map(DD.q.all().map(q => [q.id, q]));
    const qs = info.missIds.map(id => byId.get(id)).filter(Boolean);
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Post-mortem · ' + info.region.name),
      el('h1', null, 'Your cell has died'),
      el('p', { class: 'lede' }, 'Destroyed by ' + info.by + ' after ' + info.killed + ' kill' + (info.killed === 1 ? '' : 's') + '. You will re-form in the bone marrow with full HP and ATP, and this dungeon resets.'),
      el('p', { class: 'warn' }, info.lost ? 'You lost ' + info.lost + ' glucose (half of what you carried). ' + info.kept + ' left.' : 'You had no glucose to lose.'),
      el('p', { class: 'dim small' }, 'Level, gear, items, question history and routes are kept.'),
      el('div', { class: 'toolrow2' },
        el('button', { class: 'btn primary', type: 'button', onclick: ui.menu }, 'Respawn at the marrow'),
        el('button', { class: 'btn', type: 'button', onclick: ui.classes }, 'Respawn and switch class')),
      el('h3', null, qs.length ? 'Questions you missed this run (' + qs.length + ')' : 'You missed no questions this run'),
      qs.map(q => card(q, null))));
  };
  return R;
})();
