// Screens and overlays: title, dungeon menu, game HUD + map, combat panel, death, cleared.
DD.ui = (function () {
  const { el } = DD.u, S = DD.S;
  const ui = { mode: 'title' };
  let root, g = {}, titleConfirm = false;

  const mount = n => root.replaceChildren(n);
  const pct = (v, m) => Math.max(0, Math.min(100, Math.round((v / m) * 100)));
  const bar = (cls, p) => el('div', { class: 'bar ' + cls }, el('i', { style: { width: p + '%' } }));
  function ago(ts) {
    if (!ts) return 'never reviewed';
    const d = Math.floor((Date.now() - ts) / 86400000);
    return d <= 0 ? 'reviewed today' : 'reviewed ' + d + (d === 1 ? ' day ago' : ' days ago');
  }

  ui.mount = mount;
  const invText = p => DD.data.itemOrder.filter(id => p.inventory[id] > 0).map(id => DD.data.items[id].name + ' ×' + p.inventory[id]).join(', ');
  const tonicCap = DD.data.items.tonic.cap;
  function hudGlucose() {
    const p = DD.save.profile;
    g.glu.replaceChildren('Glucose ', el('b', null, p.glucose), el('span', null, 'Tonics ' + (p.inventory.tonic || 0) + '/' + tonicCap));
  }
  // Called when leaving the map without ending the run (Lymph Drain to the town).
  ui.stopMap = function () { if (g.ro) g.ro.disconnect(); stopTimer(); g = {}; };
  ui.init = function (r) { root = r; };
  ui.refresh = function () { if (ui.mode === 'title') ui.title(); else if (ui.mode === 'menu') ui.menu(); };
  ui.pctBar = bar; ui.pct = pct; ui.ago = ago; ui.invText = invText;

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
    const run = DD.save.run, inTown = DD.town.saved(run);
    if (inTown) { ui.town({ resume: inTown }); return; } // reloaded inside a town (3c)
    if (run && run.kind === 'town') DD.save.saveRun(null);
    else if (run && DD.travel.valid(run)) { if (DD.travel.resume(run)) { ui.game(); DD.travel.banner(); return; } }
    else if (run && !run.kind && run.regionId !== 'bloodstream' && DD.data.region(run.regionId)) { DD.game.resume(run); ui.game(); return; }
    else if (run) DD.game.abandon(); // a leftover from before the world map (the old Bloodstream dungeon) or an unreadable trip
    ui.menu();
  };

  // The dungeon menu is now the body map (js/bodymap.js defines ui.menu).
  // ---------- class select (Hematopoiesis) ----------
  const RATINGS = [['hp', 'HP', 'maxHP'], ['pow', 'Power', 'power'], ['def', 'Defense', 'defense'], ['atp', 'ATP', 'maxATP']];
  ui.classes = function () {
    ui.mode = 'classes';
    const p = DD.save.profile, locked = !!DD.save.run;
    const back = el('button', { class: 'btn', type: 'button', onclick: ui.menu }, 'Back to the marrow');
    const cards = DD.data.classOrder.map(id => {
      const c = DD.data.classes[id], st = DD.stats.compute(Object.assign({}, p, { classId: id })), cur = p.classId === id;
      const rows = RATINGS.map(([k, label, sk]) => el('div', { class: 'rate' }, el('span', null, label), bar('rt', c.ratings[k] * 20),
        el('b', null, c.ratings[k] + '/5'), el('small', { class: 'dim' }, (sk === 'power' || sk === 'defense' ? st[sk].toFixed(1) : st[sk]))));
      return el('div', { class: 'card cls' + (cur ? ' current' : '') },
        el('div', { class: 'rhead' }, el('h3', null, c.name), el('span', { class: 'chip ' + (cur ? 'ok' : '') }, cur ? 'Current · ' + c.role : c.role)),
        el('div', { class: 'ratings' }, rows),
        el('div', { class: 'small' }, el('b', null, 'Weapon: '), c.weapon + ' (own type gets a bonus once gear arrives)'),
        el('div', { class: 'small' }, el('b', null, 'Strong against: '), c.matchups.length ? c.matchups.join(', ') + ' (+50% damage)' : 'no one in particular. This is a support class.'),
        el('div', { class: 'small' }, el('b', null, c.passive.name + ' (passive): '), c.passive.desc),
        el('div', { class: 'small' }, el('b', null, c.active.name + ' (' + c.active.cost + ' ATP): '), c.active.desc),
        el('p', { class: 'codex small dim' }, c.codex),
        el('button', { class: 'btn' + (cur ? '' : ' primary'), type: 'button', disabled: cur || locked,
          onclick: () => { p.classId = id; DD.save.save(); ui.classes(); } }, cur ? 'Your current class' : 'Become a ' + c.name));
    });
    mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Bone Marrow'),
      el('h1', null, 'Hematopoiesis'),
      el('p', { class: 'dim small' }, 'Blood cells are made in the red bone marrow from hematopoietic stem cells. Pick which white blood cell you are. Your level carries over to every class, and you can only switch here at the marrow.'),
      locked ? el('p', { class: 'warn small' }, 'A run is in progress, so switching is locked. Resume or abandon it first.') : null,
      back, el('div', { class: 'grid' }, cards)));
  };
  ui.enter = function (regionId, resume) {
    DD.save.profile.loc = regionId; // you stand in the dungeon you enter (also after a Lymph Drain and "Return to the dungeon")
    if (resume) DD.game.resume(DD.save.run); else DD.game.newRun(regionId);
    ui.game();
  };

  // ---------- game screen ----------
  ui.game = function () {
    ui.mode = 'map';
    if (g.ro) g.ro.disconnect();
    g = {};
    g.floor = el('div', { class: 'floorname' });
    g.hp = el('div', { class: 'stat' }); g.atp = el('div', { class: 'stat' }); g.xp = el('div', { class: 'stat' }); g.glu = el('div', { class: 'stat' });
    const trip = !!(DD.game.run && DD.game.run.trip);
    g.trip = trip;
    g.leave = el('button', { class: 'btn small', onclick: ui.leave }, trip ? 'Pause' : 'Leave');
    g.abort = trip ? el('button', { class: 'btn small', onclick: ui.abortTrip, title: 'Give up this trip and wash back up where you set out' }, 'Abort') : null;
    g.strip = trip ? el('div', { class: 'strip', 'aria-label': 'Route' }) : null;
    g.canvas = el('canvas', { 'aria-label': trip ? 'Vessel map' : 'Dungeon map' });
    g.banner = el('div', { class: 'banner', hidden: true, role: 'status' });
    g.mapbox = el('div', { class: 'mapbox' }, g.canvas, g.banner);
    g.log = el('div', { class: 'log', 'aria-live': 'polite' });
    g.combat = el('div', { class: 'overlay', hidden: true });
    // Holding a d-pad key keeps walking on trips (vessels are long). A tap fires on pointerdown; click only handles keyboard activation.
    const key = (label, dx, dy, cls) => {
      let timer = null; const stop = () => { clearInterval(timer); timer = null; };
      return el('button', { class: 'key ' + cls, 'aria-label': 'Move ' + label, onclick: e => { if (e.detail === 0) DD.game.move(dx, dy); },
        onpointerdown: () => { DD.game.move(dx, dy); if (trip) { stop(); timer = setInterval(() => DD.game.move(dx, dy), 120); } },
        onpointerup: stop, onpointerleave: stop, onpointercancel: stop }, label);
    };
    const dpad = el('div', { class: 'dpad' }, key('↑', 0, -1, 'u'), key('←', -1, 0, 'l'), key('↓', 0, 1, 'd'), key('→', 1, 0, 'r'));
    const L = (cls, ch, label) => el('span', null, el('b', { class: cls }, ch), label);
    const legend = el('div', { class: 'legend' }, trip
      ? [L('gp', '@', 'you'), L('gm', 'a–z', 'pathogen'), L('gg', '$', 'glucose'), L('gg', '!', 'item'), L('gc', '%', 'clot'), L('gd', '=', 'plaque'), L('gv', '»', 'one-way valve'), L('gt', '^', 'trap'), L('gs', '>', 'onward')]
      : [L('gp', '@', 'you'), L('gm', 'a–z', 'pathogen'), L('gm', 'A–Z', 'boss'), L('gc', '☺', 'native cell'), L('gg', '¥', 'merchant'), L('gg', '$', 'glucose'), L('gd', '+', 'door'), L('gs', '>', 'stairs'), L('gt', '^', 'trap')]);
    mount(el('div', { class: 'screen game' },
      el('div', { class: 'hud' }, g.floor, g.hp, g.atp, g.xp, g.glu, g.leave, g.abort),
      g.strip, g.mapbox, g.log,
      el('div', { class: 'controls' }, dpad, legend),
      g.combat));
    if (window.ResizeObserver) { g.ro = new ResizeObserver(() => ui.refreshMap(true)); g.ro.observe(g.mapbox); }
    ui.refreshMap();
    if (DD.game.combat) ui.openCombat();
  };
  // Vessel trips: Pause saves where the current stop began; Abort washes you back up where you set out.
  ui.abortTrip = function () {
    if (!g.abortArmed) {
      g.abortArmed = true; g.abort.textContent = 'Abort trip?';
      setTimeout(() => { if (g.abort) { g.abortArmed = false; g.abort.textContent = 'Abort'; } }, 3000);
      return;
    }
    if (g.ro) g.ro.disconnect();
    stopTimer(); DD.travel.abort();
  };
  ui.leave = function () {
    if (g.trip) { // pause the trip: the title screen's Continue picks it back up
      if (g.ro) g.ro.disconnect();
      DD.game.persist(); DD.save.save(); DD.save.flush(); stopTimer(); g = {}; return ui.title();
    }
    if (!g.leaveArmed) {
      g.leaveArmed = true; g.leave.textContent = 'Abandon run?';
      setTimeout(() => { if (g.leave) { g.leaveArmed = false; g.leave.textContent = 'Leave'; } }, 3000);
      return;
    }
    if (g.ro) g.ro.disconnect();
    DD.game.abandon(); DD.save.save(); ui.menu(DD.save.profile.loc);
  };
  ui.refreshMap = function (resizeOnly) {
    const run = DD.game.run; if (!run || !g.canvas) return;
    DD.render.draw(g.canvas, run);
    if (resizeOnly) return;
    const r = DD.data.region(run.regionId), st = DD.game.stats(), p = DD.save.profile;
    if (run.trip) {
      const segs = DD.travel.segs(run), n = segs[run.trip.idx], last = segs.length - 1;
      const kind = n.kind === 'vessel' ? (n.flow === 'artery' ? 'artery · the current pushes you on' : 'vein') : n.kind === 'lymph' ? 'lymphatic vessel' : n.kind === 'capillary' ? 'capillary bed' : n.sub === 'nodeRoom' ? 'lymph node' : n.kind;
      g.floor.replaceChildren(el('b', null, n.name), el('small', null, 'Stop ' + (run.trip.idx + 1) + ' of ' + last + ' · ' + kind));
      if (g.stripIdx !== run.trip.idx) {
        g.stripIdx = run.trip.idx;
        g.strip.replaceChildren(...segs.map((s, i) => el('span', { class: 'stop' + (i < run.trip.idx ? ' past' : i === run.trip.idx ? ' now' : ''), 'aria-current': i === run.trip.idx ? 'step' : null }, s.name)));
        const now = g.strip.querySelector('.now'); if (now && now.scrollIntoView) now.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    } else g.floor.replaceChildren(el('b', null, r.name), el('small', null, run.floor.boss ? 'Boss floor' : 'Floor ' + (run.floorIdx + 1) + ' of ' + S.floorsPerDungeon));
    const stat = (node, label, v, m, cls) => node.replaceChildren(label + ' ', el('b', null, Math.round(v) + (m ? '/' + m : '')), bar(cls, m ? pct(v, m) : 0));
    stat(g.hp, 'HP', run.hp, st.maxHP, 'hp'); stat(g.atp, 'ATP', run.atp, st.maxATP, 'atp');
    g.xp.replaceChildren('Lv ' + p.level + ' XP ', el('b', null, p.xp + '/' + st.xpToNext), bar('xp', pct(p.xp, st.xpToNext)));
    hudGlucose();
    g.log.replaceChildren(...DD.game.msgs.slice(-S.log.lines).reverse().map(t => el('div', null, t)));
  };

  // ---------- combat ----------
  ui.openCombat = function () { ui.mode = 'combat'; g.combat.hidden = false; ui.renderCombat(); };
  ui.closeCombat = function () { stopTimer(); itemOpen = false; ui.mode = 'map'; g.combat.hidden = true; g.combat.replaceChildren(); ui.refreshMap(); };
  const INTENT = { idle: ['Standing there', 'guard'], attack: ['Attack', ''], big: ['Big attack !!', 'danger'], defend: ['Bracing (damage halved)', 'guard'], question: ['Question', 'ask'] };

  // Thin bar for answeredFast classes (Cytotoxic T). It only decides the crit; running out never fails the answer.
  let timerId = null;
  const stopTimer = () => { if (timerId) { clearInterval(timerId); timerId = null; } };
  const hasFast = C => DD.fx.classEffects(DD.save.profile).some(e => e.cond && e.cond.answeredFast);
  function fastTimer(C) {
    const fill = el('i'), box = el('div', { class: 'timer', 'aria-hidden': 'true' }, fill), secs = DD.S.combat.fastSeconds;
    const tick = () => { const left = Math.max(0, 1 - (Date.now() - C.qStart) / 1000 / secs); fill.style.width = Math.round(left * 100) + '%'; box.classList.toggle('spent', left <= 0); };
    tick(); stopTimer(); timerId = setInterval(tick, 100);
    return [box, el('div', { class: 'rmnote' }, C.cls.passive.name + ': answer within ' + secs + ' s for a crit (no penalty if you take longer)')];
  }
  let itemOpen = false;
  function itemMenu(C) {
    const e = C.enemy, ids = DD.data.itemOrder.filter(id => DD.combat.count(id) > 0);
    const rows = ids.map(id => {
      const d = DD.data.items[id], why = DD.combat.itemWhy(C, id), c = d.use.effect && d.use.effect.cond;
      const dud = c && c.enemyType && ![].concat(c.enemyType).includes(e.type) ? 'No effect on ' + e.type + '.' : '';
      return el('button', { class: 'btn', disabled: !!why, title: why || d.tip, onclick: () => act('item', id) },
        d.name, el('small', null, d.tip + (dud ? ' ' + dud : '') + (why ? ' (' + why + ')' : '')), el('small', { class: 'acost' }, '×' + DD.combat.count(id)));
    });
    return el('div', { class: 'stack', style: { alignItems: 'stretch' } },
      el('div', { class: 'tag' }, 'Items · using one takes your turn'),
      rows.length ? el('div', { class: 'actions' }, rows) : el('p', { class: 'dim small' }, 'You are carrying nothing. Buy supplies in any lymph node town.'),
      el('button', { class: 'btn', onclick: () => act('items') }, 'Back'));
  }
  ui.renderCombat = function () {
    stopTimer();
    const C = DD.game.combat; if (!C) return;
    const e = C.enemy, run = C.run, [iname, icls] = INTENT[C.intent];
    const foe = el('div', { class: 'foe' },
      el('div', { class: 'glyph' + (e.boss ? ' boss' : '') }, e.glyph),
      el('div', { class: 'foeinfo' },
        el('h2', null, e.name), 
        el('div', { class: 'chips' }, el('span', { class: 'chip' }, C.drill ? 'practice · no damage' : e.type), C.drill ? null : el('span', { class: 'chip' }, 'Lv ' + e.lvl), e.boss ? el('span', { class: 'chip danger' }, 'Boss') : null,
          C.matchup > 1 ? el('span', { class: 'chip ok' }, 'Strong matchup') : null),
        el('div', { class: 'stat' }, C.drill ? 'Questions left ' : 'HP ', el('b', null, e.hp + '/' + e.maxHP), bar('hp', pct(e.hp, e.maxHP)))));
    const intent = C.phase === 'choose' && !C.drill ? el('div', { class: 'intent ' + icls }, el('span', { class: 'tag' }, 'It plans to'), el('b', null, iname)) : null;
    const me = C.drill ? null : el('div', { class: 'me' },
      el('div', { class: 'stat' }, 'You HP ', el('b', null, Math.round(run.hp) + '/' + C.st.maxHP), bar('hp', pct(run.hp, C.st.maxHP))),
      el('div', { class: 'stat' }, 'ATP ', el('b', null, Math.round(run.atp) + '/' + C.st.maxATP), bar('atp', pct(run.atp, C.st.maxATP))),
      C.buffs.length || C.enemyBuffs.length || C.ally || C.poison ? el('div', { class: 'chips' },
        C.buffs.map(b => el('span', { class: 'chip ok' }, (b.label || b.id) + (b.turns != null ? ' (' + b.turns + ')' : ''))),
        C.ally ? el('span', { class: 'chip ok' }, 'Neutrophil ally (' + C.ally.turns + ')') : null,
        C.poison ? el('span', { class: 'chip ok' }, 'Enemy poisoned (' + C.poison.turns + ')') : null,
        C.enemyBuffs.map(b => el('span', { class: 'chip danger' }, 'Enemy +25% (' + b.turns + ')'))) : null);
    const body = el('div', { class: 'cbody' });
    if (C.phase === 'choose' && C.drill) {
      body.append(el('div', { class: 'actions' },
        el('button', { class: 'btn primary', onclick: () => act('heavy') }, el('kbd', null, 'H'), 'Next question', el('small', null, 'answer each question right once to finish')),
        el('button', { class: 'btn', onclick: DD.game.endDrill }, 'Stop drilling', el('small', null, 'back to your missed questions'))));
    } else if (C.phase === 'choose' && itemOpen) {
      body.append(itemMenu(C));
    } else if (C.phase === 'choose') {
      const a = C.cls.active, can = DD.combat.canAbility(C), fleeWhy = DD.combat.itemWhy(C, 'lymphDrain');
      body.append(el('div', { class: 'actions' },
        el('button', { class: 'btn', onclick: () => act('light') }, el('kbd', null, 'L'), 'Light', el('small', null, 'small hit, always lands')),
        el('button', { class: 'btn primary', onclick: () => act('heavy') }, el('kbd', null, 'H'), 'Heavy', el('small', null, 'answer a question for a big hit')),
        el('button', { class: 'btn', onclick: () => act('block') }, el('kbd', null, 'B'), 'Block', el('small', null, 'cut the next hit by ' + Math.round(C.st.blockCut * 100) + '%')),
        el('button', { class: 'btn ability', disabled: !can, title: a.name + ' (' + a.cost + ' ATP, free action): ' + a.desc, 'aria-label': a.name + ', ' + a.cost + ' ATP, free action. ' + a.desc, onclick: () => act('ability') },
          el('kbd', null, 'A'), a.name, el('small', { class: 'adesc' }, a.desc), el('small', { class: 'acost' }, a.cost + ' ATP · free action')),
        el('button', { class: 'btn', onclick: () => act('items') }, el('kbd', null, 'I'), 'Item', el('small', null, 'uses your turn')),
        el('button', { class: 'btn', disabled: !!fleeWhy, title: fleeWhy || 'Uses a Lymph Drain to escape to the lymph node town that drains this region', onclick: () => act('flee') },
          'Flee', el('small', null, fleeWhy === 'None left' ? 'needs a Lymph Drain' : fleeWhy || 'uses a Lymph Drain (×' + DD.combat.count('lymphDrain') + ')'))));
    } else if (C.phase === 'question' || C.phase === 'explain') {
      const q = C.q, ans = C.answer;
      body.append(...[
        el('div', { class: 'qtag' }, C.qKind === 'enemy' ? e.name + ' asks:' : 'Heavy attack: answer to land it', q.placeholder ? el('span', { class: 'chip' }, 'placeholder') : null,
          q.img ? el('span', { class: 'chip ok' }, DD.img.TAGS[q.img.tag]) : null),
        !ans && C.qKind === 'heavy' && hasFast(C) ? fastTimer(C) : null,
        el('div', { class: 'qrow' }, el('p', { class: 'q' }, q.q), DD.review.flagBtn(q)),
        q.img ? DD.img.view(q.img, !!ans) : null,
        C.removed > 0 ? el('div', { class: 'rmnote' }, C.removed + ' wrong option' + (C.removed > 1 ? 's' : '') + ' removed (' + C.cls.active.name + ')') : null,
        el('div', { class: 'opts' }, C.opts.map((o, i) => {
          let cls = 'opt';
          if (ans) cls += o.correct ? ' right' : (i === ans.i ? ' wrong' : '');
          return el('button', { class: cls, disabled: !!ans, onclick: () => act('answer', i) }, el('kbd', null, String(i + 1)), o.text);
        }))].flat().filter(Boolean));
      if (ans) body.append(el('div', { class: 'fb ' + (ans.ok ? 'good' : 'bad') }, el('b', null, ans.ok ? 'Correct. ' : 'Not quite. The answer is ' + q.answer + '. '), q.explain),
        el('button', { class: 'btn primary', onclick: () => act('cont') }, el('kbd', null, '↵'), 'Continue'));
    } else if (C.phase === 'end') {
      body.append(el('h3', null, C.drill ? 'Drill complete' : C.over === 'win' ? 'Pathogen destroyed' : C.over === 'flee' ? 'You slipped away' : 'Your cell has died'),
        C.over === 'win' && !C.drill ? el('p', { class: 'warn' }, '+' + C.drop + ' glucose') : null,
        el('p', { class: 'dim small' }, C.over === 'flee' ? 'The lymph carries you to the ' + DD.data.town(DD.world.townFor(run.regionId) || 'cervical').name + '. The pathogen stays behind, healed.' : e.codex),
        el('button', { class: 'btn primary', onclick: () => act('cont') }, el('kbd', null, '↵'), 'Continue'));
    }
    const log = el('div', { class: 'clog' }, C.log.slice(-S.log.lines).reverse().map(t => el('div', null, t)));
    g.combat.replaceChildren(el('div', { class: 'cbox', role: 'dialog', 'aria-label': 'Combat', style: { '--accent': DD.data.region(run.regionId).accent } }, foe, intent, me, body, log));
  };
  function act(name, i) {
    const C = DD.game.combat; if (!C) return;
    if (name === 'items') itemOpen = !itemOpen && C.phase === 'choose' && !C.drill;
    else itemOpen = false;
    if (name === 'items') { /* menu toggle only */ }
    else if (name === 'cont') { if (C.phase === 'end') return DD.game.endCombat(); DD.combat.cont(C); }
    else if (name === 'answer') DD.combat.answer(C, i);
    else if (name === 'item') DD.combat.useItem(C, i);
    else if (name === 'flee') DD.combat.useItem(C, 'lymphDrain');
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
    hudGlucose();
  };

  // ---------- end screens ----------
  ui.showDeath = info => DD.review.postMortem(info);
  ui.review = () => DD.review.screen();
  // Practice drill screen: just the combat panel over an empty game shell.
  ui.drill = function () {
    ui.mode = 'combat'; itemOpen = false;
    g = { combat: el('div', { class: 'overlay' }) };
    mount(el('div', { class: 'screen game' }, g.combat));
    ui.renderCombat();
  };
  ui.showCleared = function (s) {
    ui.mode = 'cleared';
    mount(el('div', { class: 'screen center' },
      el('div', { class: 'tag' }, s.region.name),
      el('h1', null, 'Dungeon cleared'),
      el('p', { class: 'lede' }, s.killed + ' pathogens destroyed · ' + s.glucose + ' glucose collected · ' + s.missed + ' questions missed.'),
      s.legendary ? el('p', { class: 'warn' }, 'Legendary drop: ' + s.legendary + '. It is saved for the gear update.') : null,
      el('p', { class: 'dim small' }, 'Leave through the body map, or take this region’s lymphatic vessel to its node town.'),
      el('div', { class: 'stack' },
        DD.world.townFor(s.region.id) ? el('button', { class: 'btn primary', onclick: () => DD.travel.start(DD.world.plan(s.region.id, DD.world.townFor(s.region.id))) }, 'Lymphatic vessel to the ' + DD.data.town(DD.world.townFor(s.region.id)).name) : null,
        el('button', { class: 'btn' + (DD.world.townFor(s.region.id) ? '' : ' primary'), onclick: () => ui.menu(s.region.id) }, 'Open the body map'))));
  };
  return ui;
})();
