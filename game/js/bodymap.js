// The body map (replaces the dungeon menu): a glyph silhouette with a marker for every place. Marker brightness and glow follow
// mastery. Select a place to see its info and route; travel starts from where Derrick's cell is standing (profile.loc).
(function () {
  const { el } = DD.u, ui = DD.ui, S = DD.S, C = DD.data.circ, W = DD.world;
  const COLS = 40, ROWS = 44, ASPECT = 1.4, MAX_W = 460;
  const FILTERS = [['all', 'All'], ['human-model', 'Human model'], ['fetal-pig', 'Fetal pig'], ['text', 'Text only']];
  const TOWN_ACCENT = '#7fd6c2', THYMUS_ACCENT = '#b8a2e8';
  let sel = null, canvas = null, ro = null, eraseArmed = false, redraw = null;

  // ---- silhouette (computed once): '·' body, ':' outline ----
  const body = (function () {
    const hw = y => y === 11 ? 9.5 : y === 12 ? 11.5 : y <= 19 ? 10.5 - (y - 13) * 0.1 : y <= 23 ? 9.8 - (y - 19) * 0.6 : y <= 26 ? 7.4 + (y - 23) * 0.6 : 9.2 + (y - 26) * 0.2;
    const inside = (x, y) => {
      const dx = Math.abs(x - 19.5);
      if (y <= 8) return (dx / 5.2) ** 2 + ((y - 4.2) / 4.6) ** 2 <= 1;
      if (y <= 10) return dx <= 2.8;
      if (y <= 29 && dx <= hw(y)) return true;
      if (y >= 12 && y <= 31) { const t = (y - 12) / 19; if (Math.abs(dx - (12.4 + 4.2 * t)) <= 1.9 && !(y <= 14 && dx <= hw(y))) return true; }
      if (y >= 29 && y <= 43) { const t = (y - 29) / 14; if (Math.abs(dx - (4.9 - t)) <= 4.3 - 1.2 * t) return true; }
      return false;
    };
    const g = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => inside(x, y)));
    return g.map((row, y) => row.map((v, x) => !v ? ' ' : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !(g[y + b] && g[y + b][x + a])) ? ':' : '·'));
  })();

  const places = Object.keys(C.map).map(id => ({ id, x: C.map[id][0], y: C.map[id][1], side: C.map[id][2], node: C.nodes[id] }));
  const accentOf = id => { const n = C.nodes[id]; return n.sub === 'town' ? TOWN_ACCENT : n.sub === 'thymus' ? THYMUS_ACCENT : DD.data.region(id).accent; };
  const labelOf = n => n.short || n.name;
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  const masteryOf = id => DD.data.region(id) && !DD.data.region(id).noPlace ? DD.q.mastery(id) : { value: null, n: 0 };
  const isCleared = id => { const r = DD.save.profile.regions[id]; return !!(r && r.cleared && DD.data.region(id) && !DD.data.region(id).noPlace); };
  const dungeonRun = () => { const r = DD.save.run; return r && !r.kind ? r : null; };

  function geometry() {
    const box = canvas.parentElement, w = Math.max(200, Math.min(box.clientWidth, MAX_W)), cw = w / COLS, ch = cw * ASPECT;
    return { w, cw, ch, h: ch * ROWS };
  }
  function draw() {
    if (!canvas) return;
    const { w, cw, ch, h } = geometry(), dpr = window.devicePixelRatio || 1, ctx = canvas.getContext('2d'), loc = DD.save.profile.loc;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue(n).trim();
    ctx.fillStyle = v('--map-bg'); ctx.fillRect(0, 0, w, h);
    const gf = Math.min(cw / 0.6, ch * 0.92), lf = DD.u.clamp(cw * 1.25, 10, 13), mono = ' "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.font = '500 ' + gf + 'px' + mono;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = body[y][x]; if (c === ' ') continue;
      ctx.fillStyle = c === ':' ? '#5a4650' : '#33252b';
      ctx.fillText(c, (x + 0.5) * cw, (y + 0.55) * ch);
    }
    // region glow: brighter and wider as mastery rises; unexplored places stay dim
    for (const p of places) {
      const m = masteryOf(p.id).value, town = p.node.sub === 'town', a = town ? 0.16 : m == null ? 0.1 : 0.14 + 0.5 * m / 100, r = cw * (m == null ? 2.6 : 2.6 + 2 * m / 100);
      const gr = ctx.createRadialGradient((p.x + 0.5) * cw, (p.y + 0.5) * ch, 0, (p.x + 0.5) * cw, (p.y + 0.5) * ch, r);
      gr.addColorStop(0, rgba(accentOf(p.id), a)); gr.addColorStop(1, rgba(accentOf(p.id), 0));
      ctx.fillStyle = gr; ctx.fillRect((p.x + 0.5) * cw - r, (p.y + 0.5) * ch - r, r * 2, r * 2);
    }
    const evd = DD.derrick.event(); // places today's event touches get a ring (amber = trouble, green = a good day)
    if (evd) for (const p of places) if (DD.derrick.marked(p.id)) {
      const col = evd.kind === 'positive' ? '#6fcf8a' : '#ffb347';
      ctx.strokeStyle = rgba(col, 0.85); ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc((p.x + 0.5) * cw, (p.y + 0.5) * ch, cw * 1.9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.font = '800 ' + gf * 1.15 + 'px' + mono;
    for (const p of places) {
      const m = masteryOf(p.id).value, n = p.node, here = p.id === loc, acc = accentOf(p.id);
      const glyph = here ? '@' : n.sub === 'town' ? '○' : DD.data.region(p.id) && DD.data.region(p.id).playable ? '◆' : '◇';
      ctx.globalAlpha = here ? 1 : n.sub === 'town' ? 0.9 : m == null ? 0.7 : 0.6 + 0.4 * m / 100;
      ctx.fillStyle = here ? '#ffffff' : acc; ctx.shadowColor = here ? 'rgba(255,255,255,.8)' : m == null ? 'transparent' : acc; ctx.shadowBlur = here ? cw : m == null ? 0 : cw * (0.4 + 1.2 * m / 100);
      ctx.fillText(glyph, (p.x + 0.5) * cw, (p.y + 0.55) * ch);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (p.id === sel) { ctx.strokeStyle = v('--bone'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc((p.x + 0.5) * cw, (p.y + 0.5) * ch, cw * 1.15, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.font = '500 ' + lf + 'px' + mono; ctx.lineJoin = 'round';
    for (const p of places) {
      const r = p.side === 'r', t = labelOf(p.node) + (isCleared(p.id) ? ' ✓' : '') + (masteryOf(p.id).fading ? ' ↓' : '') + (DD.derrick.marked(p.id) ? ' !' : '');
      ctx.textAlign = r ? 'left' : 'right';
      const x = (p.x + 0.5) * cw + (r ? 1.2 : -1.2) * cw, y = (p.y + 0.55) * ch;
      ctx.lineWidth = 3.5; ctx.strokeStyle = v('--map-bg'); ctx.strokeText(t, x, y);
      ctx.fillStyle = p.id === sel ? v('--bone') : p.id === loc ? '#ffffff' : p.node.sub === 'town' ? TOWN_ACCENT : v('--dim'); ctx.fillText(t, x, y);
    }
  }
  function hit(ev) {
    const rc = canvas.getBoundingClientRect(), { cw, ch } = geometry(), px = ev.clientX - rc.left, py = ev.clientY - rc.top;
    let best = null, bd = (cw * 3.2) ** 2;
    for (const p of places) { const d = (px - (p.x + 0.5) * cw) ** 2 + (py - (p.y + 0.5) * ch) ** 2; if (d < bd) { bd = d; best = p.id; } }
    return best;
  }

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
  function chipBtn(id) {
    const n = id === 'bloodstream' ? null : C.nodes[id], loc = DD.save.profile.loc;
    return el('button', { class: 'btn small chipbtn' + (sel === id ? ' primary' : ''), type: 'button', style: { '--accent': id === 'bloodstream' ? DD.data.region(id).accent : accentOf(id) }, 'aria-pressed': String(sel === id),
      onclick: () => ui.menu(id) }, (id === loc ? '@ ' : '') + (n ? labelOf(n) : 'Bloodstream') + (isCleared(id) ? ' ✓' : '') + (masteryOf(id).fading ? ' ↓' : '') + (DD.derrick.marked(id) ? ' !' : ''));
  }
  ui.menu = function (arg) {
    ui.mode = 'menu'; ui.studyBack = null;
    DD.derrick.ensure(); // today's event (5b)
    const p = DD.save.profile, run = DD.save.run;
    if (run && !run.kind && run.regionId === 'bloodstream') DD.game.abandon(); // the old temporary Bloodstream dungeon is gone
    if (typeof arg === 'string' && (C.nodes[arg] || arg === 'bloodstream')) sel = arg; else if (!sel || !(C.nodes[sel] || sel === 'bloodstream')) sel = p.loc;
    const st = DD.stats.compute(p), cls = DD.data.classes[p.classId], atMarrow = p.loc === 'marrow', locNode = C.nodes[p.loc], drun = dungeonRun();
    if (ro) { ro.disconnect(); ro = null; }
    canvas = el('canvas', { 'aria-label': 'Body map. Use the place buttons below the map for the same choices.', class: 'bodycanvas' });
    canvas.addEventListener('click', ev => { const id = hit(ev); if (id) ui.menu(id); });
    const dungeonIds = ['marrow'].concat(places.filter(q => q.node.sub === 'dungeon' && q.id !== 'marrow').map(q => q.id));
    const townIds = C.towns.map(t => t.id);
    const panelEl = panel(sel);
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Body map'),
      el('h1', null, 'Derrick'),
      el('div', { class: 'dim small' }, 'You are in the ' + locNode.name + '.'),
      DD.derrickui.card(),
      !drun && !(run && run.kind === 'trip') ? el('button', { class: 'btn primary', onclick: () => DD.explore.start() }, 'Explore the circulation · leave ' + locNode.name) : null,
      ui.circulationMap(),
      el('p', { class: 'dim small' }, 'Questions are starter placeholders until the real study-guide set arrives. Explore freely through the circulation, choosing branches as you go, or pick a destination for a planned trip. ◆ has a dungeon, ◇ is not built yet, ○ is a lymph node town, and brighter glow means higher mastery, and ↓ marks a place that is fading from lack of review.'),
      el('div', { class: 'worldgrid' },
        el('div', { class: 'bodybox' }, canvas),
        el('div', { class: 'worldside' },
          panelEl,
          el('div', { class: 'card' },
            el('div', { class: 'tag' }, 'Dungeons'), el('div', { class: 'chips' }, dungeonIds.map(chipBtn)),
            el('div', { class: 'tag' }, 'Lymph node towns'), el('div', { class: 'chips' }, townIds.map(chipBtn)),
            el('div', { class: 'tag' }, 'Other'), el('div', { class: 'chips' }, ['thymus', 'bloodstream'].map(chipBtn))))),
      el('div', { class: 'card profile' },
        el('div', null, el('b', null, cls.name + ' · ' + cls.role), el('span', { class: 'dim' }, '  Level ' + p.level)),
        el('div', { class: 'stats small dim' }, 'HP ' + st.maxHP + ' · Power ' + st.power.toFixed(1) + ' · Defense ' + st.defense.toFixed(1) + ' · ATP ' + st.maxATP),
        el('div', { class: 'small' }, el('b', null, 'Glucose ' + p.glucose), el('span', { class: 'dim' }, '  ' + (ui.invText(p) || 'no items'))),
        ui.pctBar('xp', ui.pct(p.xp, st.xpToNext)), el('div', { class: 'small dim' }, p.xp + ' / ' + st.xpToNext + ' XP'),
        DD.sub.get(p) ? el('div', { class: 'small' }, el('b', null, 'Subclass: '), DD.sub.get(p).name) : null,
        el('div', { class: 'small' }, el('b', null, DD.data.classes[p.classId].passive.name + ': '), DD.data.classes[p.classId].passive.desc),
        el('div', { class: 'small' }, el('b', null, 'HP ' + Math.round(p.hp) + '/' + DD.stats.compute(p).maxHP + ' · ATP ' + Math.round(p.atp) + '/' + DD.stats.compute(p).maxATP + ' · Skills: '), DD.skills.list(p).map(s => s.name).join(' · ')),
        el('div', { class: 'small' }, el('b', null, 'Equipped: '), DD.gear.summary(), el('span', { class: 'dim' }, '  ·  ' + p.gearBag.length + ' in the bag')),
        W.isLymphocyte() ? el('div', { class: 'small' }, el('b', null, 'Lymphocyte shortcut: '), 'you can travel town to town along the lymph node chain.') : null,
        el('div', { class: 'toolrow2' },
          el('button', { class: 'btn small primary', type: 'button', disabled: !atMarrow || !!drun, onclick: ui.classes, title: atMarrow ? '' : 'Blood cells are made in the bone marrow. Travel there to change class.' }, 'Hematopoiesis: change class'),
          !atMarrow ? el('span', { class: 'dim small' }, 'Only at the Bone Marrow.') : drun ? el('span', { class: 'dim small' }, 'Locked while a run is in progress.') : null,
          el('button', { class: 'btn small primary', type: 'button', onclick: () => DD.gear.screen(() => ui.menu()) }, 'Gear'),
          el('button', { class: 'btn small', type: 'button', onclick: DD.derrickui.chart }, 'Derrick’s chart'),
          el('button', { class: 'btn small', type: 'button', onclick: DD.review.screen }, 'Missed questions (' + Object.values(p.qstats).filter(s => s.wrong >= 1).length + ')'),
          el('button', { class: 'btn small', type: 'button', onclick: DD.review.bank }, 'Question bank'),
          DD.writer ? el('button', { class: 'btn small', type: 'button', onclick: DD.writer.open }, 'Add study material') : null,
          el('button', { class: 'btn small', type: 'button', onclick: DD.writer.flagged }, 'Flagged (' + Object.keys(p.flagged || {}).length + ')'))),
      el('div', { class: 'card toolrow' },
        el('div', { class: 'filter', role: 'group', 'aria-label': 'Question source' }, el('span', { class: 'tag' }, 'Source'),
          FILTERS.map(([v, l]) => el('button', { class: 'btn small' + (p.settings.sourceFilter === v ? ' primary' : ''), type: 'button', 'aria-pressed': String(p.settings.sourceFilter === v),
            onclick: () => { p.settings.sourceFilter = v; DD.save.save(); ui.menu(); } }, l))),
        DD.img.state === 'unavailable' ? el('span', { class: 'dim small' }, 'Browser image storage unavailable; allow site data and reload.')
          : el('button', { class: 'btn small', type: 'button', disabled: DD.img.state !== 'ready', onclick: DD.editor.open }, 'Lab images' + (DD.img.state === 'ready' ? ' (' + DD.img.records.length + ')' : '…'))),
      el('div', { class: 'foot' },
        el('span', { class: 'dim small' }, DD.save.status()),
        el('button', { class: 'btn', type: 'button', onclick: DD.backup.open }, 'Backups'),
        eraseArmed
          ? el('span', null, el('button', { class: 'btn danger', onclick: () => { eraseArmed = false; DD.save.reset(); DD.game.abandon(); ui.menu('marrow'); } }, 'Yes, erase everything'),
            el('button', { class: 'btn', onclick: () => { eraseArmed = false; ui.menu(); } }, 'Cancel'))
          : el('button', { class: 'btn', onclick: () => { eraseArmed = true; ui.menu(); } }, 'Erase save'))));
    redraw = draw; draw();
    if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (ui.mode === 'menu') draw(); }); ro.observe(canvas.parentElement); }
    if (typeof arg === 'string' && window.matchMedia && matchMedia('(max-width: 759px)').matches && panelEl.scrollIntoView) panelEl.scrollIntoView({ block: 'nearest' });
  };
})();
