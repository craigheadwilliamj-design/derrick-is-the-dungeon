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
  // Existing town bounties stay visible while exploring; rewards are claimed at the helper T.
  // A collapsible bounty tracker; towns use it too. Returns { node, update }.
  ui.bountyTracker = function () {
    const o = { summary: el('summary'), rows: el('div', { class: 'bountyrows' }) };
    o.node = el('details', { class: 'bountytracker' }, o.summary, o.rows,
      el('p', { class: 'small dim' }, 'Collect completed rewards from the helper T cell in any lymph node town.'));
    o.update = () => fillBounties(o);
    o.update(); return o;
  };
  function hudBounties() { if (g.bt) g.bt.update(); }
  function fillBounties(o) {
    const active = DD.save.profile.bounties.active;
    const signature = JSON.stringify(active);
    if (signature === o.sig) return;
    o.sig = signature;
    const ready = active.filter(b => b.done).length;
    o.summary.textContent = 'Bounties · ' + (ready ? ready + ' ready to claim' : active.length + ' active');
    o.rows.replaceChildren(...(active.length ? active.map(b =>
      el('div', { class: 'bountyrow' },
        el('div', { class: 'rhead' }, el('b', null, DD.bounty.text(b)),
          el('span', { class: 'chip' + (b.done ? ' ok' : '') }, b.done ? 'Ready to claim' : b.have + '/' + b.need)),
        bar('xp', pct(b.have, b.need)),
        el('div', { class: 'small dim' }, 'Reward: ' + DD.bounty.reward(b))))
      : [el('p', { class: 'small dim' }, 'Visit the helper T cell in a lymph node town to pick up bounties.')]));
  }
  // Called when leaving the map without ending the run (Lymph Drain to the town).
  // Study screens (writer, lab images, flagged) can open mid-run; Back returns to where you were.
  ui.studyBack = null;
  ui.leaveStudy = function () { const f = ui.studyBack; ui.studyBack = null; (f || ui.menu)(); };
  ui.studyMenu = function (prep, back) {
    const previous = ui.mode, dialog = el('dialog', { style: { width: 'min(360px,92vw)', padding: '16px', background: 'var(--panel)', color: 'var(--bone)', border: '1px solid var(--line)', borderRadius: '8px' } });
    const go = open => () => { dialog.close(); prep(); ui.studyBack = back; open(); };
    const box = el('div', { class: 'stack' });
    dialog.append(box);
    box.append(el('h3', null, 'Study'),
      el('button', { class: 'btn', type: 'button', onclick: go(DD.writer.open) }, 'Add study material'),
      el('button', { class: 'btn', type: 'button', onclick: go(DD.editor.open) }, 'Lab images'),
      el('button', { class: 'btn', type: 'button', onclick: go(DD.writer.flagged) }, 'Flagged questions'),
      el('p', { class: 'small dim' }, 'Your spot is saved. Back on any of these returns you here.'),
      el('button', { class: 'btn small', type: 'button', onclick: () => dialog.close() }, 'Close'));
    dialog.addEventListener('close', () => { if (ui.mode === 'study') ui.mode = previous; dialog.remove(); });
    document.body.append(dialog); ui.mode = 'study'; dialog.showModal();
  };
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
    DD.derrick.ensure(); // roll today's event before anything resumes (5b)
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
  const RATINGS = [['hp', 'HP', 'maxHP'], ['pow', 'Power', 'power'], ['def', 'Armor', 'defense'], ['atp', 'ATP', 'maxATP']];
  ui.classes = function () {
    ui.mode = 'classes';
    const p = DD.save.profile, locked = !!(DD.save.run && DD.save.run.kind !== 'town');
    const back = el('button', { class: 'btn', type: 'button', onclick: ui.menu }, 'Back to the marrow');
    const cards = DD.data.classOrder.map(id => {
      const c = DD.data.classes[id], st = DD.stats.compute(Object.assign({}, p, { classId: id })), cur = p.classId === id;
      const rows = RATINGS.map(([k, label, sk]) => el('div', { class: 'small' }, label + ': ', el('b', null, Math.round(st[sk]))));
      return el('div', { class: 'card cls' + (cur ? ' current' : '') },
        el('div', { class: 'rhead' }, el('h3', null, c.name), el('span', { class: 'chip ' + (cur ? 'ok' : '') }, cur ? 'Current · ' + c.role : c.role)),
        el('div', { class: 'ratings' }, rows),
        el('div', { class: 'small' }, el('b', null, 'Weapon: '), c.weapon + ' · any class can use any weapon'),

        el('div', { class: 'small' }, el('b', null, c.passive.name + ' (passive): '), c.passive.desc),
        el('div', { class: 'small' }, el('b', null, 'ATP skills: '), DD.skills.list(Object.assign({}, p, { classId: id })).map(s => s.name + ' (' + s.cost + ' ATP)').join(' · ')),
        el('p', { class: 'codex small dim' }, c.codex),
        el('button', { class: 'btn' + (cur ? '' : ' primary'), type: 'button', disabled: cur || locked,
          onclick: () => { p.classId = id; DD.gear.prepare(p,true); DD.game.resources(); DD.save.save(); ui.classes(); } }, cur ? 'Your current class' : 'Become a ' + c.name));
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
    const active = DD.game.run;
    if (active && active.trip && active.trip.mode === 'explore') active.trip.junction = false;
    ui.mode = 'map';
    if (g.ro) g.ro.disconnect();
    stopTimer(); g = {};
    g.floor = el('div', { class: 'floorname' });
    g.hp = el('div', { class: 'stat' }); g.atp = el('div', { class: 'stat' }); g.xp = el('div', { class: 'stat' }); g.glu = el('div', { class: 'stat' });
    const trip = !!(DD.game.run && DD.game.run.trip);
    g.trip = trip;
    g.leave = el('button', { class: 'btn small', onclick: ui.leave }, trip ? 'Pause' : 'Leave');
    g.chart = el('button', { class: 'btn small chartbtn', type: 'button', onclick: DD.derrickui.chart, title: 'Derrick’s vitals and what he has been up to' }, 'Chart');
    g.gear = el('button', { class: 'btn small', type: 'button', onclick: () => {
      if (ui.mode !== 'map' || DD.gear.locked()) return;
      DD.game.persist();
      ui.stopMap();
      DD.gear.screen(ui.game);
    } }, 'Gear');
    g.study = el('button', { class: 'btn small', type: 'button', title: 'Write questions, lab images, flagged questions', onclick: () => {
      if (ui.mode !== 'map' || DD.gear.locked()) return;
      ui.studyMenu(() => { DD.game.persist(); ui.stopMap(); }, ui.game);
    } }, 'Study');
    g.labels = trip ? el('button', { class: 'btn small', type: 'button', 'aria-pressed': String(!!DD.save.profile.settings.mapLabels), title: 'Name the structures in view',
      onclick: () => { const s = DD.save.profile.settings; s.mapLabels = !s.mapLabels; g.labels.setAttribute('aria-pressed', String(s.mapLabels)); g.labels.textContent = s.mapLabels ? 'Labels on' : 'Labels'; DD.save.save(); ui.refreshMap(true); } },
      DD.save.profile.settings.mapLabels ? 'Labels on' : 'Labels') : null;
    g.abort = trip ? el('button', { class: 'btn small', onclick: ui.abortTrip, title: 'Give up this trip and wash back up where you set out' }, 'Abort') : null;
    g.bt = ui.bountyTracker(); g.bounties = g.bt.node;
    g.strip = trip ? el('div', { class: 'strip', 'aria-label': 'Route' }) : null;
    g.canvas = el('canvas', { 'aria-label': trip ? 'Vessel map' : 'Dungeon map' });
    g.banner = el('div', { class: 'banner', hidden: true, role: 'status' });
    g.atlasPanel = trip ? el('details', { class: 'travel-atlas', ontoggle: () => {
      if (g.atlasPanel && g.atlasPanel.open) g.atlas.replaceChildren(ui.circulationMap());
    } }, el('summary', null, 'Body map'), (g.atlas = el('div'))) : null;
    g.mapbox = el('div', { class: 'mapbox' }, g.canvas, g.banner, g.atlasPanel);
    g.log = el('div', { class: 'log', 'aria-live': 'polite' });
    g.combat = el('div', { class: 'overlay', hidden: true });
    // Holding a d-pad key keeps walking on trips (vessels are long). A tap fires on pointerdown; click only handles keyboard activation.
    const key = (label, dx, dy, cls) => {
      let timer = null; const stop = () => { clearInterval(timer); timer = null; };
      return el('button', { class: 'key ' + cls, 'aria-label': 'Move ' + label, onclick: e => { if (e.detail === 0) DD.game.move(dx, dy); },
        onpointerdown: () => { DD.game.move(dx, dy); if (trip) { stop(); timer = g.moveTimer = setInterval(() => DD.game.move(dx, dy), 120); } },
        onpointerup: stop, onpointerleave: stop, onpointercancel: stop }, label);
    };
    const dpad = el('div', { class: 'dpad' }, key('↑', 0, -1, 'u'), key('←', -1, 0, 'l'), key('↓', 0, 1, 'd'), key('→', 1, 0, 'r'));
    const L = (cls, ch, label) => el('span', null, el('b', { class: cls }, ch), label);
    const legend = el('div', { class: 'legend' }, trip
      ? [L('gp', '@', 'you'), L('gm', 'a–z', 'pathogen'), L('gg', '$', 'glucose'), L('gg', '!', 'item'), L('gc', '%', 'clot'), L('gd', '=', 'plaque'), L('gv', '»', 'one-way valve'), L('gt', '^', 'trap'), L('gs', '>', 'walk into branch'), L('gs', 'O', 'enter organ/town')]
      : [L('gp', '@', 'you'), L('gm', 'a–z', 'pathogen'), L('gm', 'A–Z', 'boss'), L('gc', '☺', 'native cell'), L('gg', '¥', 'merchant'), L('gg', '$', 'glucose'), L('gg', '&', 'chest'), L('gc', '~', 'rest'), L('gd', '+', 'door'), L('gs', '>', 'stairs'), L('gt', '^', 'trap')]);
    mount(el('div', { class: 'screen game' },
      el('div', { class: 'hud' }, g.floor, g.hp, g.atp, g.xp, g.glu, g.chart, g.gear, g.study, g.labels, g.leave, g.abort),
      g.bounties, g.strip, g.mapbox, g.log,
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
    if (g.labels) g.labels.hidden = !(DD.mapart && DD.mapart.kindOf(DD.travel.segs(run)[run.trip.idx]));
    if (resizeOnly) return;
    const r = DD.data.region(run.regionId), st = DD.game.stats(), p = DD.save.profile;
    if (run.trip) {
      const segs = DD.travel.segs(run), n = segs[run.trip.idx], last = segs.length - 1;
      const kind = n.kind === 'vessel' ? (n.flow === 'artery' ? 'artery · the current pushes you on' : 'vein') : n.kind === 'lymph' ? 'lymphatic vessel' : n.kind === 'capillary' ? 'capillary bed' : n.sub === 'nodeRoom' ? 'lymph node' : n.kind;
      g.floor.replaceChildren(el('b', null, n.name), el('small', null, (run.trip.mode === 'explore' ? 'Free exploration · ' : 'Stop ' + (run.trip.idx + 1) + ' of ' + last + ' · ') + kind));
      if (g.stripIdx !== run.trip.idx) {
        g.stripIdx = run.trip.idx;
        g.strip.replaceChildren(...segs.map((s, i) => el('span', { class: 'stop' + (i < run.trip.idx ? ' past' : i === run.trip.idx ? ' now' : ''), 'aria-current': i === run.trip.idx ? 'step' : null }, s.name)));
        const now = g.strip.querySelector('.now'); if (now && now.scrollIntoView) now.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    } else g.floor.replaceChildren(el('b', null, r.name), el('small', null, run.floor.boss ? 'Boss floor' : 'Floor ' + (run.floorIdx + 1) + ' of ' + S.floorsPerDungeon));
    const stat = (node, label, v, m, cls) => node.replaceChildren(label + ' ', el('b', null, Math.round(v) + (m ? '/' + m : '')), bar(cls, m ? pct(v, m) : 0));
    stat(g.hp, 'HP', run.hp, st.maxHP, 'hp'); stat(g.atp, 'ATP', run.atp, st.maxATP, 'atp');
    g.xp.replaceChildren('Lv ' + p.level + ' XP ', el('b', null, p.xp + '/' + st.xpToNext + (run.earned ? ' · +' + run.earned.xp + ' pending' : '')), bar('xp', pct(p.xp, st.xpToNext)));
    hudGlucose(); hudBounties();
    const atlas = g.atlas;
    if (run.trip && atlas && g.atlasPanel.open) atlas.replaceChildren(ui.circulationMap());
    g.log.replaceChildren(...DD.game.msgs.slice(-S.log.lines).reverse().map(t => el('div', null, t)));
  };

  // ---------- group combat ----------
  const stopTimer = () => { if (g.moveTimer) { clearInterval(g.moveTimer); g.moveTimer = null; } };
  let itemOpen = false;
  const lastHP = new WeakMap(); // enemy HP at the previous render, to flash cards that just took damage
  ui.openCombat = function () { ui.mode = 'combat'; g.combat.hidden = false; ui.renderCombat(); };
  ui.closeCombat = function () { itemOpen = false; ui.mode = 'map'; g.combat.hidden = true; g.combat.replaceChildren(); ui.refreshMap(); };
  ui.renderCombat = function () {
    const C = DD.game.combat; if (!C) return;
    const combat = DD.combat;
    const button = (label, fn, why, tip) => el('button', { class: 'btn', type: 'button', disabled: !!why, title: why || tip || '', onclick: fn }, label, tip ? el('small', null, tip) : null);
    const meter = (label, v, m, cls = 'hp') => el('div', { class: 'stat' }, label + ' ' + Math.round(v) + '/' + m, bar(cls, pct(v, m)));
    const statuses = el('div', { class: 'chips' },
      C.rage ? el('span', { class: 'chip ok' }, 'Protein Rage: ' + C.rage) : null,
      C.coating ? el('span', { class: 'chip ok' }, 'Toxic Coating: ' + C.coating) : null,
      C.shield ? el('span', { class: 'chip ok' }, 'One-hit Shield') : null,
      C.wind ? el('span', { class: 'chip ok' }, 'Next Attack +50%') : null,
      el('span', null, combat.statusText(C.status)));
    if (!lastHP.has(C) && DD.anim) DD.anim.reset(C);
    const prevHP = lastHP.get(C) || []; lastHP.set(C, C.enemies.map(e => e.hp));
    const portrait = DD.anim && DD.anim.forClass(C.cls.id);
    const player = el('div', { class: 'battle-player' }, el('h2', null, C.cls.role), portrait || el('div', { class: 'glyph player-glyph', 'aria-hidden': 'true' }, '@'),
      el('div', { class: 'small dim' }, C.cls.name), meter('HP', C.run.hp, C.st.maxHP), meter('ATP', C.run.atp, C.st.maxATP, 'atp'), statuses,
      C.ally ? el('div', { class: 'companion card' }, el('b', null, 'Basophil'), meter('HP', C.ally.hp, C.ally.maxHP), el('small', null, C.ally.hp > 0 ? 'Attacks each round · shares 25% damage' : 'Defeated · recruit again')) : null);
    const enemies = el('div', { class: 'battle-enemies' }, C.enemies.map((e, i) => {
      const intent = e.intent === 'big' ? 'Charging: ' + (e.applies || 'heavy attack') : e.intent === 'defend' ? 'Guarding' : 'Attack';
      const selected = C.selection.includes(i), targetable = C.phase === 'target' && e.hp > 0;
      const art = DD.anim && !C.drill && DD.anim.enemyArt(e);   // sprite cards play their own Hit clip instead of the card flash
      return el('button', { class: 'enemy-card' + (e.hp <= 0 ? ' defeated' : '') + (selected ? ' selected' : '') + (!art && e.hp < (prevHP[i] ?? e.hp) ? ' hurt' : ''), type: 'button', disabled: !targetable,
        'aria-label': e.name + ', HP ' + e.hp + ' of ' + e.maxHP + ', ' + intent,
        onclick: () => act('target', i) },
        art || el('div', { class: 'glyph' }, e.glyph), el('b', null, e.name), e.sci ? el('small', { class: 'dim' }, e.sci) : null,
        el('small', null, e.boss ? 'Boss · Lv ' + e.lvl : e.type + ' · Lv ' + e.lvl), meter('HP', e.hp, e.maxHP),
        el('small', { class: e.intent === 'big' ? 'danger' : '' }, e.hp > 0 ? intent : 'Defeated'),
        el('small', null, combat.statusText(e.status)),
        C.mark === i ? el('span', { class: 'chip ok' }, 'Antibody Mark') : null,
        selected ? el('span', { class: 'chip' }, C.selection.filter(x => x === i).length + ' selected strikes') : null);
    }));
    const body = el('div', { class: 'battle-details' });
    const commands = el('nav', { class: 'battle-commands', 'aria-label': 'Combat commands' });
    if (C.phase === 'choose' && !C.drill) {
      commands.append(button('Attack [L]', () => act('attack'), '', 'Free · choose one enemy'),
        button('Block [B]', () => act('block'), '', 'Free · reduce all direct attacks this round by ' + Math.round(C.st.blockCut * 100) + '%'),
        button('Abilities [A]', () => act('abilities'), C.rage ? 'Locked during Protein Rage' : '', 'ATP · answer a question'),
        button('Items [I]', () => act('items'), C.rage ? 'Locked during Protein Rage' : '', 'Uses your turn'),
        button('Flee', () => act('flee'), '', 'Leave now · lose expedition XP and loot'));
      if (C.menu === 'abilities') body.append(el('h3', null, 'ATP abilities'), el('p', { class: 'small dim' }, 'ATP is spent when the question appears. Correct activates the ability; wrong spends the turn without an effect.'),
        ...combat.skills().map(s => button(s.name + ' · ' + s.cost + ' ATP', () => act('ability', s.id), combat.skillWhy(C, s), s.tip + (s.type ? ' [' + s.type + ']' : ''))));
      else if (C.menu === 'items') {
        // Tabs (Heal, Cure, Throw, Buff, Utility) list only what you carry.
        const tabs = Object.entries(DD.data.itemTabs).filter(([, ids]) => ids.some(id => combat.count(id)));
        if (!tabs.some(([t]) => t === C.itemTab)) C.itemTab = tabs.length ? tabs[0][0] : null;
        body.append(el('h3', null, 'Supplies'), tabs.length ? el('div', { class: 'toolrow2', role: 'tablist' }, tabs.map(([t]) =>
          el('button', { class: 'btn small' + (t === C.itemTab ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(t === C.itemTab), onclick: () => { C.itemTab = t; ui.renderCombat(); } }, t))) : el('p', { class: 'small dim' }, 'You are not carrying any supplies.'),
          ...(tabs.find(([t]) => t === C.itemTab) || [null, []])[1].filter(id => combat.count(id)).map(id => {
            const d = DD.data.items[id]; return button(d.name + ' ×' + combat.count(id), () => act('item', id), combat.itemWhy(C, id), d.tip);
          }));
      }
      else body.append(el('h3', null, 'Choose your action'), el('p', null, 'Read enemy intentions, then choose a command. Attack and Block are always free.'),
        el('div', { class: 'small dim' }, 'Armor ' + Math.round(C.st.defense) + ' · ' + Math.round(C.st.defense / (100 + C.st.defense) * 100) + '% Physical protection'),
        el('div', { class: 'small dim' }, 'Pending: ' + ((C.run.earned || {}).xp || 0) + ' XP · ' + ((C.run.earned || {}).glucose || 0) + ' glucose · ' + (((C.run.earned || {}).gear || []).length) + ' gear. Clear or use Lymph Drain to keep them.'));
    } else if (C.phase === 'target') {
      body.append(el('h3', null, C.pending.name), el('p', null, C.pending.hits ? 'Choose strike ' + (C.selection.length + 1) + ' of ' + C.pending.hits + '. You may choose the same target again.' : (C.pending.item ? 'Choose an enemy to throw it at.' : 'Choose an enemy on the battlefield.')), button('Back', () => act('cancel')));
    } else if (C.phase === 'choose' && C.drill) {
      body.append(button('Next question', () => act('heavy')), button('Stop practice', DD.game.endDrill));
    } else if (C.phase === 'question' || C.phase === 'explain') {
      const q = C.q, ans = C.answer;
      body.append(el('div', { class: 'qtag' }, C.drill ? 'Practice' : C.pending.name + ' · ' + (C.paidCost != null ? C.paidCost : C.pending.cost) + ' ATP spent'),
        el('div', { class: 'qrow' }, el('p', { class: 'q' }, q.q), DD.review.flagBtn(q)));
      if (q.img) body.append(DD.img.view(q.img, !!ans));
      body.append(el('div', { class: 'opts' }, C.opts.map((o, i) => el('button', {
        class: 'opt' + (ans ? o.correct ? ' right' : i === ans.i ? ' wrong' : '' : ''), disabled: !!ans,
        onclick: () => act('answer', i) }, el('kbd', null, String(i + 1)), o.text))));
      if (ans) body.append(el('div', { class: 'fb ' + (ans.ok ? 'good' : 'bad') }, el('b', null, ans.ok ? 'Correct. ' : 'The answer is ' + q.answer + '. '), q.explain), button('Continue [Enter]', () => act('cont')));
    } else if (C.phase === 'end') {
      const title = C.over === 'win' ? 'Victory' : C.over === 'return' ? 'Lymphatic return' : C.over === 'flee' ? 'Expedition abandoned' : 'Your cell was defeated';
      body.append(el('h2', null, title), el('p', null, C.over === 'return' ? 'Return to the lymph node with your earnings. HP and ATP stay depleted.' : C.over === 'flee' ? 'Run earnings are forfeited; Coat of Mucous retains 25% of earned glucose. Your original belongings remain yours.' : C.over === 'win' ? 'Continue exploring, or return safely to keep the expedition rewards.' : 'You will reform in the marrow.'), button('Continue [Enter]', () => act('cont')));
    }
    g.combat.replaceChildren(el('div', { class: 'cbox battle-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Combat', style: { '--accent': DD.data.region(C.run.regionId).accent } },
      el('div', { class: 'rhead' }, el('b', null, DD.data.region(C.run.regionId).name), el('span', null, 'Round ' + C.round)),
      el('div', { class: 'battlefield' }, player, enemies),
      el('div', { class: 'clog', role: 'status', 'aria-live': 'polite' }, C.log.slice(-3).map(t => el('div', null, t))),
      el('div', { class: 'battle-bottom' }, commands, body)));
    if (DD.anim && !C.drill) DD.anim.sync(C);
  };
  function act(name, value) {
    const C = DD.game.combat; if (!C) return;
    if (name === 'abilities' || name === 'items') {
      if (C.phase !== 'choose' || C.rage) return;
      C.menu = name;
    } else if (name === 'cont' && C.phase === 'end') return DD.game.endCombat();
    else if (name === 'item') DD.combat.useItem(C, value);
    else if (typeof DD.combat[name] === 'function') DD.combat[name](C, value);
    if (!C.drill) { DD.game.persist(); DD.save.save(); }
    ui.renderCombat(); ui.syncHud();
  }
  ui.act = act;
  ui.syncHud = function () {
    const run = DD.game.run; if (!run || !g.hp) return;
    const st = DD.game.stats();
    g.hp.replaceChildren('HP ', el('b', null, Math.round(run.hp) + '/' + st.maxHP), bar('hp', pct(run.hp, st.maxHP)));
    g.atp.replaceChildren('ATP ', el('b', null, Math.round(run.atp) + '/' + st.maxATP), bar('atp', pct(run.atp, st.maxATP)));
    hudGlucose(); hudBounties();
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
      s.legendary ? el('p', { class: 'warn' }, 'Legendary drop: ' + s.legendary + '. It is in your gear bag.') : null,
      el('p', { class: 'dim small' }, 'Leave through the body map, or take this region’s lymphatic vessel to its node town.'),
      el('div', { class: 'stack' },
        DD.world.townFor(s.region.id) ? el('button', { class: 'btn primary', onclick: () => DD.travel.start(DD.world.plan(s.region.id, DD.world.townFor(s.region.id))) }, 'Lymphatic vessel to the ' + DD.data.town(DD.world.townFor(s.region.id)).name) : null,
        el('button', { class: 'btn' + (DD.world.townFor(s.region.id) ? '' : ' primary'), onclick: () => ui.menu(s.region.id) }, 'Open the body map'))));
  };
  return ui;
})();

