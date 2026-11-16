// Travel screens: segment banner, diapedesis scene, arrival, route quiz, pop quiz traps.
(function () {
  const { el } = DD.u, ui = DD.ui, S = DD.S, T = S.travel;
  const reduce = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mounted = () => document.getElementById('app');

  // ---- the vessel name shows on entering each segment ----
  let bannerTimer = null;
  ui.banner = function (name, note) {
    const b = document.querySelector('.banner'); if (!b) return;
    b.replaceChildren(el('b', null, name), note ? el('span', null, note) : null);
    b.hidden = false; clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.hidden = true; }, T.bannerMs);
  };

  // ---- diapedesis: leukocytes slip between endothelial cells to reach the tissue ----
  // Frames: rolling (selectins), activation and firm adhesion (chemokines, integrins), squeezing through, arrived.
  const ART = [
    ['  ~  ~  ~  ~  ~  ~  ~  ~  ', '  @ >>>                   ', ' ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ', ' ░░░░░░░░░░░░░░░░░░░░░░░ ', '                         '],
    ['  ~  ~  ~  ~  ~  ~  ~  ~  ', '                           ', ' ▓▓▓▓▓▓▓▓▓@▓▓▓▓▓▓▓▓▓▓▓▓▓ ', ' ░░░░░░░░░░░░░░░░░░░░░░░ ', '                         '],
    ['  ~  ~  ~  ~  ~  ~  ~  ~  ', '                           ', ' ▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓ ', ' ░░░░░░░░@░░░░░░░░░░░░░░ ', '                         '],
    ['  ~  ~  ~  ~  ~  ~  ~  ~  ', '                           ', ' ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ', ' ░░░░░░░░░░░░░░░░░░░░░░░ ', '         @               ']
  ];
  const STEPS = [
    'Rolling: selectins on the endothelium catch you and slow you down.',
    'Activation and adhesion: chemokines signal you, and integrins grip the vessel wall.',
    'Diapedesis: you squeeze between two endothelial cells.',
    null
  ];
  let diaTimer = null, diaDone = null;
  ui.diapedesis = function (place, o, done) {
    ui.mode = 'dia'; clearInterval(diaTimer); diaDone = done;
    const pass = !!(o && o.pass), text = STEPS.slice(), calm = reduce();
    text[3] = pass ? 'You cross the ' + place.name + ' tissue and enter its lymphatic vessels.' : 'You emerge in the ' + place.name + '.';
    const pre = el('pre', { class: 'dia', 'aria-hidden': 'true' }), list = el('ol', { class: 'steps' });
    const draw = f => {
      pre.textContent = ART[f].join('\n');
      list.replaceChildren(...text.slice(0, f + 1).map((t, i) => el('li', { class: i === f ? 'now' : '' }, t)));
    };
    const finish = () => { clearInterval(diaTimer); diaTimer = null; const d = diaDone; diaDone = null; if (d) d(); };
    ui.diaSkip = finish;
    const box = el('div', { class: 'cbox', role: 'dialog', 'aria-label': 'Diapedesis', style: { '--accent': '#e08fc0' } },
      el('div', { class: 'tag' }, 'Diapedesis'), pre, list,
      el('button', { class: 'btn primary', onclick: finish }, el('kbd', null, '↵'), 'Continue'));
    mounted().replaceChildren(el('div', { class: 'screen game' }, el('div', { class: 'overlay' }, box)));
    let f = calm ? ART.length - 1 : 0; draw(f);
    if (calm) return;
    diaTimer = setInterval(() => { if (f < ART.length - 1) { f++; draw(f); } else { clearInterval(diaTimer); diaTimer = setTimeout(finish, 900); } }, T.diapedesisMs);
  };

  // ---- arrival ----
  ui.arrive = function (info) {
    ui.mode = 'arrive';
    const p = info.place, dest = p.id, W = DD.world;
    const plan = W.plan(info.trip.from, info.trip.to), fs = plan ? W.fastStatus(plan) : { code: 'none' };
    const region = DD.data.region(dest), dungeon = W.isDungeon(dest);
    const town = W.isTown(dest), playable = dungeon && region && region.playable;
    const summary = info.fast ? 'You took the route you know by heart.' : info.segs + ' stops · ' + info.killed + ' pathogen' + (info.killed === 1 ? '' : 's') + ' destroyed · ' + info.glucose + ' glucose collected.';
    const fast = fs.code === 'unlocked' ? el('p', { class: 'chip ok' }, 'Fast travel unlocked for this route')
      : fs.code === 'quiz' ? el('div', { class: 'card' }, el('b', null, 'You know this route now'), el('p', { class: 'small dim' }, 'Put its stops in order to unlock fast travel.'),
        el('button', { class: 'btn primary', onclick: () => ui.routeQuiz(plan) }, 'Take the route quiz'))
      : fs.code === 'walk' ? el('p', { class: 'dim small' }, 'Walked ' + fs.walks + (fs.need ? ' of ' + fs.need : '') + ' times. ' + (fs.retry ? 'Walk it once more to try the quiz again.' : 'Walk it ' + (fs.need - fs.walks) + ' more time' + (fs.need - fs.walks === 1 ? '' : 's') + ' to unlock the route quiz.')) : null;
    ui.mount(el('div', { class: 'screen center' },
      el('div', { class: 'tag' }, 'Arrived'),
      el('h1', null, p.name),
      el('p', { class: 'lede' }, p.note || ''),
      el('p', { class: 'dim small' }, summary),
      dungeon && !playable ? el('p', { class: 'warn small' }, 'No pathogens or questions live here yet. The dungeon opens once it has content.') : null,
      fast,
      el('div', { class: 'stack' },
        playable ? el('button', { class: 'btn primary', onclick: () => ui.enter(dest, false) }, 'Enter the ' + region.name) : null,
        town ? el('button', { class: 'btn primary', onclick: () => ui.town({ id: dest, via: 'lymph' }) }, 'Visit the ' + p.name) : null,
        dest === 'thymus' ? el('button', { class: 'btn primary', onclick: ui.thymus }, 'Enter the thymus') : null,
        el('button', { class: 'btn' + (playable || town || dest === 'thymus' ? '' : ' primary'), onclick: () => ui.menu(dest) }, 'Open the body map'))));
  };

  // ---- route quiz: tap the stops in order ----
  let rq = null;
  ui.routeQuiz = function (plan) {
    ui.mode = 'routequiz';
    rq = { plan, order: DD.u.shuffle(Math.random, plan.waypoints), picked: [], done: null };
    drawQuiz();
  };
  function drawQuiz() {
    const { plan, order, picked, done } = rq, W = DD.world, nm = id => W.get(id).name;
    const left = order.filter(id => !picked.includes(id));
    const right = !done || done.ok;
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Route quiz'),
      el('h1', null, nm(plan.from) + ' to ' + nm(plan.to)),
      el('p', { class: 'dim small' }, 'Tap the stops in the order you pass through them, starting from ' + nm(plan.from) + '. Get them all right to unlock fast travel for this route.'),
      el('ol', { class: 'qorder' }, picked.map((id, i) => el('li', { class: done ? (id === plan.waypoints[i] ? 'ok' : 'bad') : '' }, nm(id)))),
      done ? el('div', { class: 'card' },
        el('div', { class: 'fb ' + (done.ok ? 'good' : 'bad') }, done.ok ? 'Correct. Fast travel is unlocked for this route.' : 'Not quite. Here is the real order.'),
        done.ok ? null : el('ol', { class: 'qorder' }, plan.waypoints.map(id => el('li', { class: 'ok' }, nm(id)))),
        done.ok ? null : el('p', { class: 'dim small' }, 'Walk the route once more, then try again.'),
        el('button', { class: 'btn primary', onclick: () => ui.menu(plan.to) }, 'Back to the body map'))
        : el('div', { class: 'card' },
          el('div', { class: 'tag' }, 'Stops left (' + left.length + ')'),
          el('div', { class: 'chips qchips' }, left.map(id => el('button', { class: 'btn small', type: 'button', onclick: () => pickStop(id) }, nm(id)))),
          el('div', { class: 'toolrow2' },
            el('button', { class: 'btn small', type: 'button', disabled: !picked.length, onclick: () => { rq.picked.pop(); drawQuiz(); } }, 'Undo'),
            el('button', { class: 'btn small', type: 'button', disabled: !picked.length, onclick: () => { rq.picked = []; drawQuiz(); } }, 'Start over'),
            el('button', { class: 'btn small', type: 'button', onclick: () => ui.menu(plan.to) }, 'Cancel')))));
  }
  function pickStop(id) {
    rq.picked.push(id);
    if (rq.picked.length === rq.order.length) {
      const ok = rq.picked.every((x, i) => x === rq.plan.waypoints[i]);
      rq.done = { ok };
      if (ok) DD.world.unlock(rq.plan.key); else DD.world.failQuiz(rq.plan.key);
    }
    drawQuiz();
  }

  // ---- pop quiz traps (dungeon floors and vessels) ----
  ui.popQuiz = function () {
    const G = DD.game, Q = G.quiz; if (!Q) return;
    ui.mode = 'popquiz';
    const q = Q.q, ans = Q.answer, box = document.querySelector('.overlay');
    if (!box) return;
    box.hidden = false;
    box.replaceChildren(el('div', { class: 'cbox', role: 'dialog', 'aria-label': 'Trap', style: { '--accent': '#ff7a59' } },
      el('div', { class: 'qtag' }, el('b', null, 'Trap: ' + Q.trap.name + '!'), 'Answer to ' + (ans ? 'see what happens' : 'disarm it'), q.placeholder ? el('span', { class: 'chip' }, 'placeholder') : null,
        q.img ? el('span', { class: 'chip ok' }, DD.img.TAGS[q.img.tag]) : null),
      el('div', { class: 'qrow' }, el('p', { class: 'q' }, q.q), DD.review.flagBtn(q)),
      q.img ? DD.img.view(q.img, !!ans) : null,
      el('div', { class: 'opts' }, Q.opts.map((o, i) => {
        let cls = 'opt'; if (ans) cls += o.correct ? ' right' : (i === ans.i ? ' wrong' : '');
        return el('button', { class: cls, disabled: !!ans, onclick: () => G.answerTrap(i) }, el('kbd', null, String(i + 1)), o.text);
      })),
      ans ? el('div', { class: 'fb ' + (ans.ok ? 'good' : 'bad') }, el('b', null, ans.ok ? 'Correct. ' : 'Not quite. The answer is ' + q.answer + '. '), q.explain, el('div', null, el('b', null, Q.msg))) : null,
      ans ? el('button', { class: 'btn primary', onclick: G.endTrap }, el('kbd', null, '↵'), 'Continue') : null));
    DD.ui.syncHud();
  };
  ui.closeQuiz = function () {
    ui.mode = 'map';
    const box = document.querySelector('.overlay'); if (box) { box.hidden = true; box.replaceChildren(); }
    ui.refreshMap();
  };
})();
