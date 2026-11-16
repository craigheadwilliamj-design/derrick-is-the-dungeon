// Screens for phase 3b: the talk overlay (native cells and the dendritic merchant) and the thymus.
(function () {
  const { el } = DD.u, ui = DD.ui, S = DD.S;
  const prof = () => DD.save.profile;

  function head(def, kind, accent) {
    return el('div', { class: 'foe' },
      el('div', { class: 'glyph', style: { color: kind === 'merchant' ? '#e0c060' : '#7fd6c2' } }, kind === 'merchant' ? '¥' : '☺'),
      el('div', { class: 'foeinfo' }, el('h2', null, def.name), el('div', { class: 'chips' },
        el('span', { class: 'chip' }, kind === 'merchant' ? 'Traveling merchant' : 'Native cell'), el('span', { class: 'chip' }, placeName()))));
  }
  const inTown = () => DD.town.here();
  const townId = () => DD.save.profile.loc;
  const placeName = () => inTown() ? DD.data.town(townId()).name : DD.data.region(DD.game.run.regionId).name;
  const placeAccent = () => inTown() ? DD.data.town(townId()).accent : DD.data.region(DD.game.run.regionId).accent;
  const say = t => el('p', { class: 'small' }, '“' + t + '”');
  const joke = T => el('div', null, say(T.joke), T.jokeFrom ? el('span', { class: 'chip' }, 'Derrick lately: ' + T.jokeFrom) : null);

  ui.npc = function () {
    const G = DD.game, T = G.talk; if (!T) return;
    ui.mode = 'npc';
    const box = document.querySelector('.overlay'); if (!box) return;
    const NP = DD.npc, accent = placeAccent(), d = T.def, body = [];
    if (T.phase === 'greet') {
      body.push(say(T.greet), joke(T), el('p', { class: 'small dim' }, d.codex),
        T.npc.done ? el('p', { class: 'warn small' }, 'You have already talked to this cell on this floor. It only has one question for you per floor.') : null,
        el('div', { class: 'actions' },
          !T.npc.done ? el('button', { class: 'btn primary', onclick: NP.ask }, el('kbd', null, '↵'), 'Ask me something', el('small', null, 'one question, loot if you get it right')) : null,
          el('button', { class: 'btn', onclick: NP.close }, el('kbd', null, 'Esc'), T.npc.done ? 'Goodbye' : 'Not now')));
    } else if (T.phase === 'noq') {
      body.push(el('p', { class: 'dim small' }, 'They have nothing to ask you yet. This region has no questions.'), el('button', { class: 'btn', onclick: NP.close }, 'Goodbye'));
    } else if (T.phase === 'ask' || T.phase === 'result') {
      const q = T.q, ans = T.answer;
      body.push(el('div', { class: 'qtag' }, d.name + ' asks:', q.placeholder ? el('span', { class: 'chip' }, 'placeholder') : null, q.img ? el('span', { class: 'chip ok' }, DD.img.TAGS[q.img.tag]) : null),
        el('div', { class: 'qrow' }, el('p', { class: 'q' }, q.q), DD.review.flagBtn(q)), q.img ? DD.img.view(q.img, !!ans) : null,
        el('div', { class: 'opts' }, T.opts.map((o, i) => {
          let cls = 'opt'; if (ans) cls += o.correct ? ' right' : (i === ans.i ? ' wrong' : '');
          return el('button', { class: cls, disabled: !!ans, onclick: () => NP.answer(i) }, el('kbd', null, String(i + 1)), o.text);
        })));
      if (ans) body.push(el('div', { class: 'fb ' + (ans.ok ? 'good' : 'bad') }, el('b', null, ans.ok ? 'Correct. ' : 'Not quite. The answer is ' + q.answer + '. '), q.explain, el('div', null, el('b', null, T.msg))),
        el('button', { class: 'btn primary', onclick: NP.close }, el('kbd', null, '↵'), 'Continue'));
    } else if (T.phase === 'shop') {
      const n = T.npc, p = prof(), why = NP.restWhy(), M = S.merchant;
      body.push(say(T.greet), joke(T), el('div', { class: 'chips' }, el('span', { class: 'chip warn' }, 'Glucose ' + p.glucose)),
        T.msg ? el('div', { class: 'fb good', role: 'status' }, T.msg) : null,
        el('h3', null, 'Stock'),
        n.stock.map((s, i) => { const it = DD.data.items[s.id], w = NP.canBuy(s);
          return el('div', { class: 'shoprow' }, el('div', { class: 'shopinfo' }, el('b', null, it.name), el('span', { class: 'chip' }, s.qty + ' left · owned ' + (p.inventory[s.id] || 0) + (it.cap ? '/' + it.cap : '')),
            el('div', { class: 'small' }, it.tip), el('div', { class: 'small dim' }, it.real)),
            el('button', { class: 'btn small', disabled: !!w, title: w, onclick: () => NP.buy(i) }, 'Buy ' + s.price + ' g')); }),
        (() => { const rs = n.rare, it = rs && DD.data.gearById[rs.id];
          if (!it) return el('div', { class: 'shoprow' }, el('div', { class: 'shopinfo' }, el('b', null, 'Rare stock'), el('div', { class: 'small dim' }, 'Nothing special today.')), el('button', { class: 'btn small', disabled: true }, 'Empty'));
          const why = rs.sold ? 'Sold out' : p.glucose < rs.price ? 'Not enough glucose' : '';
          return el('div', { class: 'shoprow gearrow' }, DD.gear.info(it, el('span', { class: 'chip warn' }, 'rare stock · owned ' + DD.gear.owned(it.id))),
            el('button', { class: 'btn small', disabled: !!why, title: why, onclick: () => NP.buyRare() }, rs.sold ? 'Sold' : 'Buy ' + rs.price + ' g')); })(),
        el('h3', null, 'Services'),
        el('div', { class: 'shoprow' }, el('div', { class: 'shopinfo' }, el('b', null, 'Rest'), el('div', { class: 'small dim' }, 'Full HP and ATP, at ×' + M.restMult + ' the inn price.' + (why ? ' ' + why : ''))),
          el('button', { class: 'btn small', disabled: !!why, onclick: NP.rest }, 'Rest ' + NP.restCost() + ' g')),
        el('div', { class: 'shoprow' }, el('div', { class: 'shopinfo' }, el('b', null, 'Tip: what is fading'),
          n.tip ? el('div', { class: 'small' }, 'Your most-faded regions: ' + n.tip.map(t => t.name + ' (' + t.ago + ')').join(' and ') + '. Review them to bring them back.') : el('div', { class: 'small dim' }, 'Names your ' + M.fadedCount + ' most-faded regions.')),
          el('button', { class: 'btn small', disabled: !!n.tip || p.glucose < M.tipCost, onclick: NP.tip }, n.tip ? 'Bought' : 'Buy ' + M.tipCost + ' g')),
        el('button', { class: 'btn', onclick: NP.close }, el('kbd', null, 'Esc'), 'Leave'));
    }
    box.hidden = false;
    box.replaceChildren(el('div', { class: 'cbox', role: 'dialog', 'aria-label': d.name, style: { '--accent': accent } }, head(d, T.npc.kind, accent), body));
    ui.syncHud();
  };
  ui.closeNpc = function () {
    if (inTown()) return DD.town.back();
    ui.mode = 'map';
    const box = document.querySelector('.overlay'); if (box) { box.hidden = true; box.replaceChildren(); }
    ui.refreshMap();
  };

  const timedOrNot = a => (a.effect && a.effect.turns != null) || (a.cast && a.cast.turns != null);
  // ---------- the thymus ----------
  ui.thymus = function () {
    ui.mode = 'thymus';
    const p = prof(), cls = DD.data.classes[p.classId], TH = DD.thymus, a = TH.base(p.classId), cur = TH.active(p);
    const rows = TH.levels.map(L => {
      const got = TH.claimed(p.classId, L), ok = TH.available(p.classId, L);
      let inner;
      if (got) inner = el('div', { class: 'small' }, el('span', { class: 'chip ok' }, 'claimed'), ' ' + ({ cost: 'Cheaper: −' + Math.round(S.thymus.costCut * 100) + '% ATP cost', boost: timedOrNot(a) ? 'Longer: +' + S.thymus.extraTurns + ' turn' : 'Stronger: +' + Math.round(S.thymus.effectPct * 100) + '% effect', charge: 'Extra charge: +' + S.thymus.extraCharges + ' use' })[got.pick]);
      else if (ok) inner = el('div', { class: 'stack', style: { alignItems: 'stretch' } }, el('div', { class: 'small' }, 'Choose one:'),
        TH.options(a).map(([k, label]) => el('button', { class: 'btn', type: 'button', onclick: () => { if (TH.claim(p.classId, L, k)) ui.thymus(); } }, label, el('small', null, TH.describe(p.classId, k)))));
      else inner = el('div', { class: 'dim small' }, 'Locked until level ' + L + '.');
      return el('div', { class: 'card' }, el('div', { class: 'rhead' }, el('h3', null, 'Level ' + L + ' milestone'), el('span', { class: 'chip' + (got ? ' ok' : '') }, got ? 'claimed' : ok ? 'ready' : 'locked')), inner);
    });
    const sub = DD.sub.get(p), SB = S.subclass;
    const subCard = s => {
      const mine = sub && sub.id === s.id, cost = DD.sub.switchCost(p.classId);
      return el('div', { class: 'card' + (mine ? ' sel' : '') },
        el('div', { class: 'rhead' }, el('h3', null, s.name), el('span', { class: 'chip' + (mine ? ' ok' : '') }, mine ? 'yours' : s.role)),
        el('div', { class: 'small' }, el('b', null, 'Passive: '), s.passiveText),
        el('div', { class: 'small' }, el('b', null, 'Active: '), s.activeText),
        el('div', { class: 'dim small' }, s.codex),
        mine ? null : el('button', { class: 'btn' + (sub ? '' : ' primary'), type: 'button', disabled: !!(cost && p.glucose < cost),
          onclick: () => { if (!DD.sub.choose(p.classId, s.id)) ui.thymus(); } }, sub ? 'Switch for ' + cost + ' glucose' : 'Choose ' + s.name));
    };
    const subs = DD.sub.unlocked()
      ? [el('h2', null, 'Subclass'), el('p', { class: 'dim small' }, 'Pick one for ' + cls.name + '. The first pick is free; switching later costs ' + SB.switchCost + ' glucose. Each is a passive tweak plus an active upgrade.'), ].concat(DD.sub.list(p.classId).map(subCard))
      : [el('div', { class: 'card' }, el('div', { class: 'rhead' }, el('h3', null, 'Subclass'), el('span', { class: 'chip' }, 'locked')), el('div', { class: 'dim small' }, 'Two paths for ' + cls.name + ' open at level ' + SB.level + '.'))];
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Thymus'),
      el('h1', null, 'Training hall'),
      el('p', { class: 'dim small' }, 'T cell precursors made in the bone marrow mature in the thymus. Developing T cells that cannot recognize your own MHC molecules are discarded, and so are those that react too strongly to your own tissues. Milestone upgrades are kept per class, and your level is shared by all of them.'),
      el('div', { class: 'card' },
        el('div', { class: 'rhead' }, el('h3', null, cls.name + ': ' + a.name), el('span', { class: 'chip' }, 'Level ' + p.level)),
        el('div', { class: 'small' }, el('b', null, cur.cost + ' ATP: '), cur.desc)),
      rows,
      subs,
      el('div', { class: 'toolrow2' }, el('button', { class: 'btn primary', type: 'button', onclick: () => ui.menu('thymus') }, 'Open the body map'))));
  };
})();
