// The body map (replaces the dungeon menu): the body atlas with every place clickable (glow follows mastery), a place list,
// and the selected place's panel. Travel starts from where Derrick's cell is standing (profile.loc). New players get a
// welcome card that points at the nearest place with study questions.
(function () {
  const { el } = DD.u, ui = DD.ui, S = DD.S, C = DD.data.circ, W = DD.world;
  const FILTERS = [['all', 'All'], ['human-model', 'Human model'], ['fetal-pig', 'Fetal pig'], ['text', 'Text only']];
  const TOWN_ACCENT = '#7fd6c2', THYMUS_ACCENT = '#b8a2e8';
  let sel = null;
  const DIALOG = { width: 'min(360px,92vw)', padding: '16px', background: 'var(--panel)', color: 'var(--bone)', border: '1px solid var(--line)', borderRadius: '8px' };

  const places = Object.keys(C.map).map(id => ({ id, x: C.map[id][0], y: C.map[id][1], side: C.map[id][2], node: C.nodes[id] }));
  const accentOf = id => { const n = C.nodes[id]; return n.sub === 'town' ? TOWN_ACCENT : n.sub === 'thymus' ? THYMUS_ACCENT : DD.data.region(id).accent; };
  const labelOf = n => n.short || n.name;
  const masteryOf = id => DD.data.region(id) && !DD.data.region(id).noPlace ? DD.q.mastery(id) : { value: null, n: 0 };
  const isCleared = id => { const r = DD.save.profile.regions[id]; return !!(r && r.cleared && DD.data.region(id) && !DD.data.region(id).noPlace); };
  const dungeonRun = () => { const r = DD.save.run; return r && !r.kind ? r : null; };

  // ---- place panel ----
  const modeText = plan => plan.mode === 'blood' ? 'Blood route' : plan.mode === 'lymph' ? 'Lymphatic vessel' : plan.mode === 'chain' ? 'Lymph node chain (B and T cells only)' : 'Blood and lymph';
  const kindText = n => n.sub === 'town' ? 'Lymph node town' : n.sub === 'thymus' ? 'Training' : 'Dungeon';
  function panel(id) {
    const p = DD.game.resources(), loc = p.loc, run = dungeonRun();
    if (id === 'bloodstream') {
      const r = DD.data.region('bloodstream'), m = DD.q.mastery('bloodstream');
      return el('div', { class: 'card place', style: { '--accent': r.accent } },
        el('div', { class: 'rhead' }, el('h3', null, 'Bloodstream'), el('span', { class: 'chip' }, 'Mastery entry')),
        el('p', { class: 'small' }, r.blurb), masteryBlock(m, true), DD.derrickui.placeNote('bloodstream'),
        el('p', { class: 'dim small' }, 'This is not a place you can walk to. The vessels between places are the bloodstream.'));
    }
    const n = C.nodes[id], r = DD.data.region(id), acc = accentOf(id), m = masteryOf(id), here = id === loc;
    const drains = n.sub === 'town' ? DD.data.town(id).regions.map(x => C.nodes[x].name).join(', ') : null;
    const actions = [];
    if (run) {
      const rr = DD.data.region(run.regionId);
      if (run.regionId === id) actions.push(el('button', { class: 'btn primary', onclick: () => ui.enter(id, true) }, 'Resume floor ' + (run.floorIdx + 1)));
      else actions.push(el('p', { class: 'warn small' }, 'A run in the ' + rr.name + ' is in progress. Finish it or abandon it before you travel.'));
      actions.push(el('button', { class: 'btn small danger', onclick: () => { DD.game.abandon(); DD.save.save(); ui.menu(id); } }, 'Abandon the ' + rr.name + ' run'));
    } else if (here) {
      if (W.isDungeon(id)) actions.push(r.playable ? el('button', { class: 'btn primary', onclick: () => ui.enter(id, false) }, 'Enter the ' + r.name)
        : el('p', { class: 'dim small' }, 'No usable study questions here yet. Add study material or save lab images with at least 4 different labels in the same system and source.'));
      if (n.sub === 'town') actions.push(el('button', { class: 'btn primary', onclick: () => ui.town({ id, via: 'hev' }) }, 'Visit the ' + n.name));
      if (n.sub === 'thymus') actions.push(el('button', { class: 'btn primary', onclick: ui.thymus }, 'Enter the thymus'));
      const tn = W.townFor(id);
      if (tn) actions.push(el('button', { class: 'btn', onclick: () => DD.travel.start(W.plan(id, tn)) }, 'Take the lymphatic vessel to the ' + DD.data.town(tn).name));
    } else {
      const plan = W.plan(loc, id);
      if (!plan) actions.push(el('p', { class: 'dim small' }, 'No route from here.'));
      else {
        const fs = W.fastStatus(plan), stops = plan.segs.length - 1;
        actions.push(el('div', { class: 'small' }, el('b', null, modeText(plan)), ' · ' + stops + ' stop' + (stops === 1 ? '' : 's') + ' · about ' + plan.secs + ' s on foot'),
          el('div', { class: 'strip static', 'aria-label': 'Route' }, plan.segs.map(s => el('span', { class: 'stop' + (s.kind === 'place' ? ' goal' : '') }, s.name))));
        if (fs.code === 'unlocked') actions.push(el('button', { class: 'btn primary', onclick: () => DD.travel.fast(plan) }, 'Fast travel (instant)'),
          el('button', { class: 'btn small', onclick: () => DD.travel.start(plan) }, 'Walk it anyway'));
        else {
          if (fs.code === 'quiz') actions.push(el('div', { class: 'small' }, 'You know this route. Put its stops in order to unlock fast travel.'),
            el('button', { class: 'btn', onclick: () => ui.routeQuiz(plan) }, 'Take the route quiz'));
          else actions.push(el('div', { class: 'dim small' }, 'Walked ' + fs.walks + ' of ' + fs.need + ' times' + (fs.retry ? ' (walk it once more to retry the quiz)' : ' to unlock the route quiz') + '.'));
          actions.push(el('button', { class: 'btn primary', onclick: () => DD.travel.start(plan) }, 'Travel'));
        }
      }
    }
    const filterNote = r && r.playable && !DD.q.available(r.systems) ? el('div', { class: 'warn small' }, 'No questions match this source filter here. All questions are used instead.') : null;
    return el('div', { class: 'card place', style: { '--accent': acc } },
      el('div', { class: 'rhead' }, el('h3', null, n.name), el('div', { class: 'chips' }, here ? el('span', { class: 'chip ok' }, '@ you are here') : null, isCleared(id) ? el('span', { class: 'chip ok' }, '✓ cleared') : null, el('span', { class: 'chip' }, kindText(n)))),
      r ? el('div', { class: 'dim small' }, r.system + (r.blurb ? ' · ' + r.blurb : '')) : null,
      el('p', { class: 'small' }, n.note),
      DD.derrickui.placeNote(id),
      drains ? el('div', { class: 'dim small' }, 'Drains: ' + drains) : null,
      r && !r.noPlace ? masteryBlock(m, false, r.id) : null,
      filterNote,
      el('div', { class: 'stack', style: { alignItems: 'stretch' } }, actions));
  }
  function masteryBlock(m, noTime, id) {
    const reg = id ? DD.save.profile.regions[id] : DD.save.profile.regions.bloodstream;
    return el('div', { class: 'mastery' }, ui.pctBar('mas', m.value == null ? 0 : m.value),
      el('span', null, m.value == null ? 'Unexplored (' + m.n + '/' + S.mastery.minAnswers + ' answers)' : 'Mastery ' + m.value + '%' + (reg && reg.cleared ? ' · cleared' : '')),
      el('span', null, ui.ago(reg && reg.lastReviewed)),
      m.fading ? el('span', { class: 'chip fading', title: 'Mastery fades over about two weeks without review. Answer questions here to bring it back.' }, 'fading · memory ' + Math.round(100 * m.recency) + '%') : null);
  }

  // ---- the screen ----
  const mark = id => (isCleared(id) ? ' ✓' : '') + (masteryOf(id).fading ? ' ↓' : '') + (DD.derrick.marked(id) ? ' !' : '');
  const noQuestions = id => W.isDungeon(id) && !(DD.data.region(id) && DD.data.region(id).playable);
  const dungeonIds = ['marrow'].concat(places.filter(q => q.node.sub === 'dungeon' && q.id !== 'marrow').map(q => q.id));
  function placeSelect() {
    const loc = DD.save.profile.loc;
    const opt = id => el('option', { value: id, selected: id === sel },
      (id === loc ? '@ ' : '') + (id === 'bloodstream' ? 'Bloodstream' : C.nodes[id].name) + mark(id) + (noQuestions(id) ? ' · no questions yet' : ''));
    return el('label', { class: 'placepick' }, el('span', { class: 'tag' }, 'Places'),
      el('select', { onchange: e => ui.menu(e.target.value) },
        el('optgroup', { label: 'Dungeons' }, dungeonIds.map(opt)),
        el('optgroup', { label: 'Lymph node towns' }, C.towns.map(t => opt(t.id))),
        el('optgroup', { label: 'Other' }, ['thymus', 'bloodstream'].map(opt))));
  }
  // The nearest dungeon with study questions (where you stand counts as nearest).
  function firstStop() {
    const loc = DD.save.profile.loc, ids = dungeonIds.filter(id => !noQuestions(id));
    if (ids.includes(loc)) return { id: loc, plan: null, ids };
    let best = null;
    for (const id of ids) { const plan = W.plan(loc, id); if (plan && (!best || plan.secs < best.plan.secs)) best = { id, plan, ids }; }
    return best;
  }
  function welcome() {
    const p = DD.save.profile, cls = DD.data.classes[p.classId], stop = firstStop();
    const done = () => { p.intro = true; DD.save.save(); };
    const name = id => C.nodes[id].name;
    const go = !stop ? el('button', { class: 'btn primary', type: 'button', onclick: () => { done(); DD.writer.open(); } }, 'Add study material')
      : !stop.plan ? el('button', { class: 'btn primary', type: 'button', onclick: () => { done(); ui.enter(stop.id, false); } }, 'Enter the ' + name(stop.id))
      : el('button', { class: 'btn primary', type: 'button', onclick: () => { done(); DD.travel.start(stop.plan); } }, 'Travel to the ' + name(stop.id) + ' (about ' + stop.plan.secs + ' s)');
    return el('div', { class: 'card evcard intro' },
      el('div', { class: 'tag' }, 'Welcome, ' + cls.name),
      el('h3', null, 'How this works'),
      el('ul', { class: 'evlist small' },
        el('li', null, 'Travel Derrick’s blood and lymph vessels to his organs. Organs with study questions are dungeons full of pathogens.'),
        el('li', null, 'Attack and Block are free. Your three ATP skills each ask a study question first: right answer, the skill fires. The ATP is spent either way.'),
        el('li', null, 'Lymph node towns are the green dots on the map. Rest at the inn and buy supplies and gear there.'),
        el('li', null, 'Missed questions and your own study material live under Study. Adding material opens up more of the body.')),
      el('p', { class: 'small dim' }, !stop ? 'No place has study questions yet. Add some to open your first dungeon.'
        : 'Places with questions right now: ' + stop.ids.map(name).join(', ') + '. The rest stay empty until you add material for them.'),
      el('div', { class: 'toolrow2' }, go,
        el('button', { class: 'btn small', type: 'button', onclick: () => { done(); ui.menu(); } }, 'Look around first')));
  }
  function studyMenu() {
    const p = DD.save.profile, missed = Object.values(p.qstats).filter(s => s.wrong >= 1).length;
    ui.studyMenu(() => {}, () => ui.menu(), close => el('div', { class: 'stack' },
      el('button', { class: 'btn', type: 'button', onclick: () => { close(); DD.review.screen(); } }, 'Missed questions (' + missed + ')'),
      el('div', { class: 'filter', role: 'group', 'aria-label': 'Question source' }, el('span', { class: 'tag' }, 'Question source'),
        FILTERS.map(([v, l]) => el('button', { class: 'btn small' + (p.settings.sourceFilter === v ? ' primary' : ''), type: 'button', 'aria-pressed': String(p.settings.sourceFilter === v),
          onclick: () => { p.settings.sourceFilter = v; DD.save.save(); close(); ui.menu(); } }, l))),
      DD.img.state === 'unavailable' ? el('p', { class: 'small dim' }, 'Browser image storage unavailable; allow site data and reload to use lab images.') : null));
  }
  function dataMenu() {
    const dialog = el('dialog', { style: DIALOG }), box = el('div');
    let armed = false;
    const draw = () => box.replaceChildren(el('div', { class: 'stack' },
      el('h3', null, 'Save & data'),
      el('p', { class: 'small dim' }, DD.save.status()),
      el('button', { class: 'btn', type: 'button', onclick: () => { dialog.close(); DD.backup.open(); } }, 'Backups'),
      armed ? [el('p', { class: 'warn small' }, 'This erases your level, question history and any run in progress.'),
        el('button', { class: 'btn danger', type: 'button', onclick: () => { dialog.close(); DD.save.reset(); DD.game.abandon(); ui.classes({ first: true }); } }, 'Yes, erase everything'),
        el('button', { class: 'btn', type: 'button', onclick: () => { armed = false; draw(); } }, 'Cancel')]
        : el('button', { class: 'btn', type: 'button', onclick: () => { armed = true; draw(); } }, 'Erase save'),
      el('button', { class: 'btn small', type: 'button', onclick: () => dialog.close() }, 'Close')));
    draw(); dialog.append(box);
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog); dialog.showModal();
  }
  ui.menu = function (arg) {
    ui.mode = 'menu'; ui.studyBack = null;
    DD.derrick.ensure(); // today's event (5b)
    const p = DD.game.resources(), run = DD.save.run;
    if (run && !run.kind && run.regionId === 'bloodstream') DD.game.abandon(); // the old temporary Bloodstream dungeon is gone
    if (typeof arg === 'string' && (C.nodes[arg] || arg === 'bloodstream')) sel = arg; else if (!sel || !(C.nodes[sel] || sel === 'bloodstream')) sel = p.loc;
    const st = DD.stats.compute(p), cls = DD.data.classes[p.classId], atMarrow = p.loc === 'marrow', locNode = C.nodes[p.loc], drun = dungeonRun();
    const pick = { sel, onPick: id => ui.menu(id), accent: accentOf, suffix: mark, dim: noQuestions,
      glow: id => { const m = masteryOf(id).value; return m == null ? null : m / 100; } };
    const panelEl = panel(sel);
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Body map'),
      el('h1', null, 'Derrick'),
      el('div', { class: 'dim small' }, 'You are in the ' + locNode.name + '.'),
      p.intro ? DD.derrickui.card() : welcome(),
      el('div', { class: 'card mapbar' },
        !drun && !(run && run.kind === 'trip') ? el('button', { class: 'btn primary', onclick: () => DD.explore.start() }, 'Explore the circulation · leave ' + locNode.name) : null,
        el('div', { class: 'toolrow2' },
          el('button', { class: 'btn small', type: 'button', onclick: () => DD.gear.screen(() => ui.menu()) }, 'Gear'),
          el('button', { class: 'btn small', type: 'button', onclick: studyMenu }, 'Study'),
          el('button', { class: 'btn small', type: 'button', onclick: DD.derrickui.chart }, 'Derrick’s chart'),
          atMarrow ? el('button', { class: 'btn small', type: 'button', disabled: !!drun, onclick: ui.classes, title: drun ? 'Locked while a run is in progress.' : '' }, 'Change class') : null)),
      el('div', { class: 'worldgrid' },
        ui.circulationMap(false, pick),
        el('div', { class: 'worldside' }, placeSelect(), panelEl)),
      el('div', { class: 'card profile' },
        el('div', { class: 'rhead' }, el('div', null, el('b', null, cls.name + ' · ' + cls.role), el('span', { class: 'dim' }, '  Level ' + p.level)), el('b', { class: 'small' }, 'Glucose ' + p.glucose)),
        el('div', { class: 'small' }, 'HP ' + Math.round(p.hp) + '/' + st.maxHP + ' · ATP ' + Math.round(p.atp) + '/' + st.maxATP + ' · Power ' + st.power.toFixed(1) + ' · Armor ' + st.defense.toFixed(1)),
        ui.pctBar('xp', ui.pct(p.xp, st.xpToNext)), el('div', { class: 'small dim' }, p.xp + ' / ' + st.xpToNext + ' XP'),
        el('div', { class: 'small dim' }, 'Skills: ' + DD.skills.list(p).map(s => s.name).join(' · ') + ' · Equipped: ', DD.gear.summary()),
        W.isLymphocyte() ? el('div', { class: 'small dim' }, 'Lymphocyte shortcut: you can travel town to town along the lymph node chain.') : null),
      el('div', { class: 'foot' },
        el('span', { class: 'dim small' }, DD.save.status()),
        el('button', { class: 'btn small', type: 'button', onclick: dataMenu }, 'Save & data'))));
    if (typeof arg === 'string' && window.matchMedia && matchMedia('(max-width: 759px)').matches && panelEl.scrollIntoView) panelEl.scrollIntoView({ block: 'nearest' });
  };
})();
