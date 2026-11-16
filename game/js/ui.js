// Screens and overlays: title, dungeon menu, game HUD + map, combat panel, death, cleared.
DD.ui = (function () {
  const { el } = DD.u, S = DD.S;
  const ui = { mode: 'title' };
  let root, g = {}, titleConfirm = false, menuConfirm = false;

  const mount = n => root.replaceChildren(n);
  const pct = (v, m) => Math.max(0, Math.min(100, Math.round((v / m) * 100)));
  const bar = (cls, p) => el('div', { class: 'bar ' + cls }, el('i', { style: { width: p + '%' } }));
  function ago(ts) {
    if (!ts) return 'never reviewed';
    const d = Math.floor((Date.now() - ts) / 86400000);
    return d <= 0 ? 'reviewed today' : 'reviewed ' + d + (d === 1 ? ' day ago' : ' days ago');
  }

  ui.mount = mount;
  ui.init = function (r) { root = r; };
  ui.refresh = function () { if (ui.mode === 'title') ui.title(); else if (ui.mode === 'menu') ui.menu(); };
  const FILTERS = [['all', 'All'], ['human-model', 'Human model'], ['fetal-pig', 'Fetal pig'], ['text', 'Text only']];

  // ---------- title ----------
  ui.title = function () {
    ui.mode = 'title';
    const has = DD.save.hasSave();
    const btns = [];
    if (titleConfirm) {
      btns.push(el('p', { class: 'warn' }, 'This erases your level, question history and any run in progress.'),
        el('button', { class: 'btn danger', onclick: () => { DD.save.reset(); titleConfirm = false; DD.game.abandon(); ui.menu(); } }, 'Yes, erase and start over'),
        el('button', { class: 'btn', onclick: () => { titleConfirm = false; ui.title(); } }, 'Keep my save'));
    } else if (has) {
      btns.push(el('button', { class: 'btn primary', onclick: ui.continueGame }, 'Continue'),
        el('button', { class: 'btn', onclick: () => { titleConfirm = true; ui.title(); } }, 'New game'));
    } else {
      btns.push(el('button', { class: 'btn primary', onclick: () => { DD.save.save(); ui.menu(); } }, 'Start'));
    }
    mount(el('div', { class: 'screen center' },
      el('div', { class: 'tag' }, 'An anatomy & physiology roguelike'),
      el('h1', { class: 'logo' }, 'Derrick is the Dungeon'),
      el('p', { class: 'lede' }, 'You are one of Derrick’s white blood cells. He does not take great care of himself. Every fight runs on study questions.'),
      el('div', { class: 'stack' }, btns),
      el('p', { class: 'dim small' }, DD.save.status())));
  };
  ui.continueGame = function () {
    const run = DD.save.run;
    if (run && DD.data.region(run.regionId)) { DD.game.resume(run); ui.game(); } else ui.menu();
  };

  // ---------- dungeon menu ----------
  ui.menu = function () {
    ui.mode = 'menu';
    const p = DD.save.profile, st = DD.stats.compute(p), cls = DD.data.classes[p.classId], run = DD.save.run;
    const cards = DD.data.regions.map(r => {
      const m = DD.q.mastery(r.id), reg = p.regions[r.id];
      const meter = r.playable
        ? el('div', { class: 'mastery' }, bar('mas', m.value == null ? 0 : m.value),
          el('span', null, m.value == null ? 'Unexplored (' + m.n + '/' + S.mastery.minAnswers + ' answers)' : 'Mastery ' + m.value + '%'))
        : null;
      const resume = run && run.regionId === r.id;
      return el('div', { class: 'card region' + (r.playable ? '' : ' locked'), style: { '--accent': r.accent } },
        el('div', { class: 'rhead' }, el('h3', null, r.name + (r.temp ? ' (temporary)' : '')),
          el('span', { class: 'chip ' + (r.playable ? 'ok' : '') }, r.playable ? (reg && reg.cleared ? 'Cleared' : 'Playable') : 'Needs content')),
        el('div', { class: 'dim small' }, r.system + (r.blurb ? ' · ' + r.blurb : '')),
        meter,
        r.playable ? el('div', { class: 'dim small' }, ago(reg && reg.lastReviewed)) : null,
        r.playable && !DD.q.available(r.systems) ? el('div', { class: 'warn small' }, 'No questions match this source filter here. All questions are used instead.') : null,
        !r.playable && DD.img.questions(r.systems, null).length ? el('div', { class: 'dim small' }, DD.img.questions(r.systems, null).length + ' image questions saved. They appear when this dungeon opens.') : null,
        r.playable ? el('button', { class: 'btn primary', onclick: () => ui.enter(r.id, resume) }, resume ? 'Resume floor ' + (run.floorIdx + 1) : 'Enter dungeon') : null);
    });
    mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Bone Marrow'),
      el('h1', null, 'Choose a dungeon'),
      el('div', { class: 'card profile' },
        el('div', null, el('b', null, cls.name + ' · ' + cls.role), el('span', { class: 'dim' }, '  Level ' + p.level)),
        el('div', { class: 'stats small dim' }, 'HP ' + st.maxHP + ' · Power ' + st.power.toFixed(1) + ' · Defense ' + st.defense.toFixed(1) + ' · ATP ' + st.maxATP),
        bar('xp', pct(p.xp, st.xpToNext)), el('div', { class: 'small dim' }, p.xp + ' / ' + st.xpToNext + ' XP'),
        el('div', { class: 'small' }, el('b', null, cls.passive.name + ': '), cls.passive.desc),
        el('div', { class: 'small' }, el('b', null, cls.active.name + ' (' + cls.active.cost + ' ATP): '), cls.active.desc)),
      el('div', { class: 'card toolrow' },
        el('div', { class: 'filter', role: 'group', 'aria-label': 'Question source' }, el('span', { class: 'tag' }, 'Source'),
          FILTERS.map(([v, l]) => el('button', { class: 'btn small' + (p.settings.sourceFilter === v ? ' primary' : ''), type: 'button', 'aria-pressed': String(p.settings.sourceFilter === v),
            onclick: () => { p.settings.sourceFilter = v; DD.save.save(); ui.menu(); } }, l))),
        DD.img.state === 'unavailable' ? el('span', { class: 'dim small' }, 'Image questions need the claude.ai viewer.')
          : el('button', { class: 'btn small', type: 'button', disabled: DD.img.state !== 'ready', onclick: DD.editor.open }, 'Lab images' + (DD.img.state === 'ready' ? ' (' + DD.img.records.length + ')' : '…'))),
      el('p', { class: 'dim small' }, 'Questions are starter placeholders until the real study-guide set arrives.'),
      el('div', { class: 'grid' }, cards),
      el('div', { class: 'foot' },
        el('span', { class: 'dim small' }, DD.save.status()),
        menuConfirm
          ? el('span', null, el('button', { class: 'btn danger', onclick: () => { menuConfirm = false; DD.save.reset(); DD.game.abandon(); ui.menu(); } }, 'Yes, erase everything'),
            el('button', { class: 'btn', onclick: () => { menuConfirm = false; ui.menu(); } }, 'Cancel'))
          : el('button', { class: 'btn', onclick: () => { menuConfirm = true; ui.menu(); } }, 'Erase save'))));
  };
  ui.enter = function (regionId, resume) {
    if (resume) DD.game.resume(DD.save.run); else DD.game.newRun(regionId);
    ui.game();
  };

  // ---------- game screen ----------
  ui.game = function () {
    ui.mode = 'map';
    g = {};
    g.floor = el('div', { class: 'floorname' });
    g.hp = el('div', { class: 'stat' }); g.atp = el('div', { class: 'stat' }); g.xp = el('div', { class: 'stat' });
    g.leave = el('button', { class: 'btn small', onclick: ui.leave }, 'Leave');
    g.canvas = el('canvas', { 'aria-label': 'Dungeon map' });
    g.mapbox = el('div', { class: 'mapbox' }, g.canvas);
    g.log = el('div', { class: 'log', 'aria-live': 'polite' });
    g.combat = el('div', { class: 'overlay', hidden: true });
    const key = (label, dx, dy, cls) => el('button', { class: 'key ' + cls, 'aria-label': 'Move ' + label, onclick: () => DD.game.move(dx, dy) }, label);
    const dpad = el('div', { class: 'dpad' }, key('↑', 0, -1, 'u'), key('←', -1, 0, 'l'), key('↓', 0, 1, 'd'), key('→', 1, 0, 'r'));
    const legend = el('div', { class: 'legend' },
      el('span', null, el('b', { class: 'gp' }, '@'), 'you'), el('span', null, el('b', { class: 'gm' }, 'a–z'), 'pathogen'), el('span', null, el('b', { class: 'gm' }, 'A–Z'), 'boss'),
      el('span', null, el('b', { class: 'gg' }, '$'), 'glucose'), el('span', null, el('b', { class: 'gd' }, '+'), 'door'), el('span', null, el('b', { class: 'gs' }, '>'), 'stairs'));
    mount(el('div', { class: 'screen game' },
      el('div', { class: 'hud' }, g.floor, g.hp, g.atp, g.xp, g.leave),
      g.mapbox, g.log,
      el('div', { class: 'controls' }, dpad, legend),
      g.combat));
    if (window.ResizeObserver) { g.ro = new ResizeObserver(() => ui.refreshMap(true)); g.ro.observe(g.mapbox); }
    ui.refreshMap();
    if (DD.game.combat) ui.openCombat();
  };
  ui.leave = function () {
    if (!g.leaveArmed) {
      g.leaveArmed = true; g.leave.textContent = 'Abandon run?';
      setTimeout(() => { if (g.leave) { g.leaveArmed = false; g.leave.textContent = 'Leave'; } }, 3000);
      return;
    }
    if (g.ro) g.ro.disconnect();
    DD.game.abandon(); DD.save.save(); ui.menu();
  };
  ui.refreshMap = function (resizeOnly) {
    const run = DD.game.run; if (!run || !g.canvas) return;
    DD.render.draw(g.canvas, run);
    if (resizeOnly) return;
    const r = DD.data.region(run.regionId), st = DD.game.stats(), p = DD.save.profile;
    g.floor.replaceChildren(el('b', null, r.name), el('small', null, run.floor.boss ? 'Boss floor' : 'Floor ' + (run.floorIdx + 1) + ' of ' + S.floorsPerDungeon));
    const stat = (node, label, v, m, cls) => node.replaceChildren(label + ' ', el('b', null, Math.round(v) + (m ? '/' + m : '')), bar(cls, m ? pct(v, m) : 0));
    stat(g.hp, 'HP', run.hp, st.maxHP, 'hp'); stat(g.atp, 'ATP', run.atp, st.maxATP, 'atp');
    g.xp.replaceChildren('Lv ' + p.level + ' XP ', el('b', null, p.xp + '/' + st.xpToNext), bar('xp', pct(p.xp, st.xpToNext)));
    g.log.replaceChildren(...DD.game.msgs.slice(-S.log.lines).reverse().map(t => el('div', null, t)));
  };

  // ---------- combat ----------
  ui.openCombat = function () { ui.mode = 'combat'; g.combat.hidden = false; ui.renderCombat(); };
  ui.closeCombat = function () { ui.mode = 'map'; g.combat.hidden = true; g.combat.replaceChildren(); ui.refreshMap(); };
  const INTENT = { attack: ['Attack', ''], big: ['Big attack !!', 'danger'], defend: ['Bracing (damage halved)', 'guard'], question: ['Question', 'ask'] };

  ui.renderCombat = function () {
    const C = DD.game.combat; if (!C) return;
    const e = C.enemy, run = C.run, [iname, icls] = INTENT[C.intent];
    const foe = el('div', { class: 'foe' },
      el('div', { class: 'glyph' + (e.boss ? ' boss' : '') }, e.glyph),
      el('div', { class: 'foeinfo' },
        el('h2', null, e.name), 
        el('div', { class: 'chips' }, el('span', { class: 'chip' }, e.type), el('span', { class: 'chip' }, 'Lv ' + e.lvl), e.boss ? el('span', { class: 'chip danger' }, 'Boss') : null,
          C.matchup > 1 ? el('span', { class: 'chip ok' }, 'Strong matchup') : null),
        el('div', { class: 'stat' }, 'HP ', el('b', null, e.hp + '/' + e.maxHP), bar('hp', pct(e.hp, e.maxHP)))));
    const intent = C.phase === 'choose' ? el('div', { class: 'intent ' + icls }, el('span', { class: 'tag' }, 'It plans to'), el('b', null, iname)) : null;
    const me = el('div', { class: 'me' },
      el('div', { class: 'stat' }, 'You HP ', el('b', null, Math.round(run.hp) + '/' + C.st.maxHP), bar('hp', pct(run.hp, C.st.maxHP))),
      el('div', { class: 'stat' }, 'ATP ', el('b', null, Math.round(run.atp) + '/' + C.st.maxATP), bar('atp', pct(run.atp, C.st.maxATP))),
      C.buffs.length || C.enemyBuffs.length ? el('div', { class: 'chips' },
        C.buffs.map(b => el('span', { class: 'chip ok' }, b.id === 'antigen-armed' ? 'Antigen armed' : b.id === 'q-focus' ? '+25% damage (' + b.turns + ')' : b.id)),
        C.enemyBuffs.map(b => el('span', { class: 'chip danger' }, 'Enemy +25% (' + b.turns + ')'))) : null);
    const body = el('div', { class: 'cbody' });
    if (C.phase === 'choose') {
      const a = C.cls.active, can = DD.combat.canAbility(C);
      body.append(el('div', { class: 'actions' },
        el('button', { class: 'btn', onclick: () => act('light') }, el('kbd', null, 'L'), 'Light', el('small', null, 'small hit, always lands')),
        el('button', { class: 'btn primary', onclick: () => act('heavy') }, el('kbd', null, 'H'), 'Heavy', el('small', null, 'answer a question for a big hit')),
        el('button', { class: 'btn', onclick: () => act('block') }, el('kbd', null, 'B'), 'Block', el('small', null, 'cut the next hit by 60%')),
        el('button', { class: 'btn', disabled: !can, onclick: () => act('ability') }, el('kbd', null, 'A'), a.name, el('small', null, a.cost + ' ATP · free action')),
        el('button', { class: 'btn', disabled: true, title: 'Fleeing arrives with the economy update' }, 'Flee', el('small', null, 'not yet'))));
    } else if (C.phase === 'question' || C.phase === 'explain') {
      const q = C.q, ans = C.answer;
      body.append(
        el('div', { class: 'qtag' }, C.qKind === 'enemy' ? e.name + ' asks:' : 'Heavy attack: answer to land it', q.placeholder ? el('span', { class: 'chip' }, 'placeholder') : null,
          q.img ? el('span', { class: 'chip ok' }, DD.img.TAGS[q.img.tag]) : null),
        el('p', { class: 'q' }, q.q),
        q.img ? DD.img.view(q.img, !!ans) : null,
        el('div', { class: 'opts' }, C.opts.map((o, i) => {
          let cls = 'opt';
          if (ans) cls += o.correct ? ' right' : (i === ans.i ? ' wrong' : '');
          return el('button', { class: cls, disabled: !!ans, onclick: () => act('answer', i) }, el('kbd', null, String(i + 1)), o.text);
        })));
      if (ans) body.append(el('div', { class: 'fb ' + (ans.ok ? 'good' : 'bad') }, el('b', null, ans.ok ? 'Correct. ' : 'Not quite. The answer is ' + q.answer + '. '), q.explain),
        el('button', { class: 'btn primary', onclick: () => act('cont') }, el('kbd', null, '↵'), 'Continue'));
    } else if (C.phase === 'end') {
      body.append(el('h3', null, C.over === 'win' ? 'Pathogen destroyed' : 'Your cell has died'),
        el('p', { class: 'dim small' }, e.codex),
        el('button', { class: 'btn primary', onclick: () => act('cont') }, el('kbd', null, '↵'), 'Continue'));
    }
    const log = el('div', { class: 'clog' }, C.log.slice(-S.log.lines).reverse().map(t => el('div', null, t)));
    g.combat.replaceChildren(el('div', { class: 'cbox', role: 'dialog', 'aria-label': 'Combat', style: { '--accent': DD.data.region(run.regionId).accent } }, foe, intent, me, body, log));
  };
  function act(name, i) {
    const C = DD.game.combat; if (!C) return;
    if (name === 'cont') { if (C.phase === 'end') return DD.game.endCombat(); DD.combat.cont(C); }
    else if (name === 'answer') DD.combat.answer(C, i);
    else DD.combat[name](C);
    ui.renderCombat(); ui.refreshMap(true);
    DD.ui.syncHud();
  }
  ui.act = act;
  ui.syncHud = function () {
    const run = DD.game.run; if (!run || !g.hp) return;
    const st = DD.game.stats();
    g.hp.replaceChildren('HP ', el('b', null, Math.round(run.hp) + '/' + st.maxHP), bar('hp', pct(run.hp, st.maxHP)));
    g.atp.replaceChildren('ATP ', el('b', null, Math.round(run.atp) + '/' + st.maxATP), bar('atp', pct(run.atp, st.maxATP)));
  };

  // ---------- end screens ----------
  ui.showDeath = function (info) {
    ui.mode = 'dead';
    mount(el('div', { class: 'screen center' },
      el('div', { class: 'tag' }, info.region.name),
      el('h1', null, 'Your cell has died'),
      el('p', { class: 'lede' }, 'Destroyed by ' + info.by + '. You wake in the marrow with full HP. The dungeon has reset, and your level and question history are kept.'),
      info.miss ? el('p', { class: 'dim' }, 'Questions missed this run: ' + info.miss + '.') : null,
      el('button', { class: 'btn primary', onclick: ui.menu }, 'Return to the marrow')));
  };
  ui.showCleared = function (s) {
    ui.mode = 'cleared';
    mount(el('div', { class: 'screen center' },
      el('div', { class: 'tag' }, s.region.name),
      el('h1', null, 'Dungeon cleared'),
      el('p', { class: 'lede' }, s.killed + ' pathogens destroyed · ' + s.glucose + ' glucose collected · ' + s.missed + ' questions missed.'),
      el('button', { class: 'btn primary', onclick: ui.menu }, 'Back to the marrow')));
  };
  return ui;
})();
