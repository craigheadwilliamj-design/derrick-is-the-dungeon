// The six lymph node towns (data/circulation.js) share one walkable layout (data/townmap.js, phase 3c).
// Buildings open panels: plasma cell shop, mast cell inn, respiration counter, helper T bounty board.
// Persistent HP and ATP are available even when no dungeon is in progress.
DD.town = (function () {
  const { el } = DD.u, E = DD.S.economy, TS = DD.S.town, TM = DD.data.townmap;
  const T = { msg: '', lines: {}, panel: null };
  const prof = () => DD.save.profile;
  const run = () => { const r = DD.save.run; return r && !r.kind ? r : DD.game.resources(); };
  const saveResources = r => { DD.game.syncResources(r); if (r !== prof()) DD.save.saveRun(r); DD.save.save(); }; // dungeon runs only, never a trip
  const inv = id => prof().inventory[id] || 0;
  const cap = id => DD.data.items[id].cap || Infinity;
  const sellPrice = id => Math.floor(DD.data.items[id].price * E.sellPct);
  const innCost = () => E.inn.base + E.inn.perLevel * prof().level;
  T.sellPrice = sellPrice; T.innCost = innCost; T.run = run;
  T.here = () => !!document.querySelector('.screen.town');

  function done(msg) { T.msg = msg; DD.save.save(); if (T.panel) T.open(T.panel, T.panelArg); }
  T.buyGear = function (id) {
    const it = DD.data.gearById[id], p = prof();
    if (!it || T.gearBought.has(id)) return;
    if (p.glucose < DD.gear.price(it)) return done('Not enough glucose for ' + it.name + '.');
    p.glucose -= DD.gear.price(it); DD.gear.give(id); T.gearBought.add(id);
    done('Bought ' + it.name + ' for ' + DD.gear.price(it) + ' glucose. It is in your gear bag.');
  };
  T.sellGear = function (id) {
    const it = DD.data.gearById[id], bag = prof().gearBag, i = bag.indexOf(id);
    if (!it || i < 0 || !DD.gear.canSell(it)) return;
    bag.splice(i, 1); prof().glucose += DD.gear.sellPrice(it);
    done('Sold ' + it.name + ' for ' + DD.gear.sellPrice(it) + ' glucose.');
  };
  T.gearBought = new Set();
  T.buy = function (id) {
    const d = DD.data.items[id], p = prof();
    if (inv(id) >= cap(id)) return done('You can only carry ' + d.cap + ' ' + d.name + 's.');
    if (p.glucose < d.price) return done('Not enough glucose for ' + d.name + '.');
    p.glucose -= d.price; p.inventory[id] = inv(id) + 1;
    done('Bought ' + d.name + ' for ' + d.price + ' glucose.');
  };
  T.sell = function (id) {
    const d = DD.data.items[id], p = prof(); if (!inv(id)) return;
    if (--p.inventory[id] <= 0) delete p.inventory[id];
    p.glucose += sellPrice(id);
    done('Sold ' + d.name + ' for ' + sellPrice(id) + ' glucose.');
  };
  const maxes = () => DD.stats.compute(prof());
  T.innWhy = function () {
    const r = run(), st = maxes();

    if (r.hp >= st.maxHP && r.atp >= st.maxATP) return 'You are already fully rested.';
    if (prof().glucose < innCost()) return 'Not enough glucose.';
    return '';
  };
  T.rest = function () {
    if (T.innWhy()) return;
    const r = run(), st = maxes();
    prof().glucose -= innCost(); r.hp = st.maxHP; r.atp = st.maxATP; saveResources(r);
    done('You sleep it off. Full HP and ATP.');
  };
  T.convertWhy = function () {
    const r = run(), st = maxes();

    if (r.atp >= st.maxATP) return 'Your ATP is already full.';
    if (prof().glucose < E.respiration.glucose) return 'Not enough glucose.';
    return '';
  };
  T.convert = function () {
    if (T.convertWhy()) return;
    const r = run(), st = maxes(), before = r.atp;
    prof().glucose -= E.respiration.glucose; r.atp = Math.min(st.maxATP, r.atp + E.respiration.atp); saveResources(r);
    done('Respiration: +' + Math.round(r.atp - before) + ' ATP.');
  };

  // One greeting and one Derrick joke per NPC per visit (rolled when you arrive, not on every redraw).
  const talk = id => {
    if (!T.lines[id]) { const l = DD.data.npc(id).lines, ev = DD.derrick.npcLine(id); T.lines[id] = [DD.u.pick(Math.random, l.greet), ev ? ev.text : DD.u.pick(Math.random, l.derrick), ev ? ev.from : null]; } // 5b: an event line replaces the joke
    const L = T.lines[id];
    return L.slice(0, 2).map(t => el('div', { class: 'small dim' }, '“' + t + '”')).concat(L[2] ? [el('span', { class: 'chip' }, 'Derrick lately: ' + L[2])] : []);
  };
  T.claim = function (id) {
    const b = DD.bounty.claim(id);
    done(b ? 'Bounty done: ' + DD.bounty.text(b) + '. +' + b.glucose + ' glucose and ' + DD.data.items[b.item].name + '.' : '');
  };

  // ---------- the map ----------
  let base = null; // parsed layout, shared by every town
  function parse() {
    if (base) return base;
    const rows = TM.rows.map(r => [...r]), H = rows.length, W = Math.max(...rows.map(r => r.length));
    const b = { W, H, g: [], info: [], spots: {}, keepers: [] };
    for (let y = 0; y < H; y++) {
      b.g.push([]); b.info.push([]);
      for (let x = 0; x < W; x++) {
        const c = rows[y][x] || ' ', d = TM.legend[c] || null;
        b.g[y].push(d ? d.tile : ' '); b.info[y].push(d);
        if (d && d.spot) b.spots[d.spot] = { x, y };
        if (d && d.keeper) b.keepers.push({ id: d.keeper, x, y });
      }
    }
    return (base = b);
  }
  let st = null, g = {};
  const town = () => DD.data.town(st.id);
  const npcAt = (x, y) => st.f.npcs.find(n => n.x === x && n.y === y);
  const infoAt = (x, y) => (base.info[y] || [])[x] || null;
  const roamable = (n, x, y) => { const d = infoAt(x, y); return !!(d && d.walk && n.zones.includes(d.zone) && !d.keeper && !d.spot && !npcAt(x, y) && !(x === st.x && y === st.y)); };

  function build(id, seed) {
    const b = parse(), r = DD.rng(seed), n = b.W * b.H;
    const f = { W: b.W, H: b.H, g: b.g, explored: new Uint8Array(n).fill(1), vis: new Uint8Array(n).fill(1), traps: [], pickups: [], enemies: [], npcs: [], tiles: TM.features };
    b.keepers.forEach(k => f.npcs.push({ kind: 'town', id: k.id, glyph: '☺', x: k.x, y: k.y }));
    // The dendritic merchant, at the same chance as on a dungeon floor: dendritic cells present antigen in the paracortex.
    if (r() < DD.S.merchant.chance && b.spots.merchant) f.npcs.push({ kind: 'merchant', id: 'dendritic', glyph: '¥', x: b.spots.merchant.x, y: b.spots.merchant.y, stock: DD.npc.makeStock(r), rare: DD.gear.rareStock(DD.rng((seed + 17) >>> 0)), tip: null });
    // Ambient cells: always the sinus macrophage, then a shuffled mix, wandering only inside their own zones.
    const defs = DD.data.npcs.filter(d => d.kind === 'ambient'), mac = defs.filter(d => d.zones.includes('n'));
    const order = mac.concat(DD.u.shuffle(r, defs.filter(d => !mac.includes(d)))), count = DD.u.int(r, TS.ambient.min, TS.ambient.max);
    st.f = f;
    for (let i = 0; i < count; i++) {
      const d = order[i % order.length], spots = [];
      for (let y = 0; y < b.H; y++) for (let x = 0; x < b.W; x++) if (roamable(d, x, y)) spots.push([x, y]);
      if (!spots.length) continue;
      const [x, y] = DD.u.pick(r, spots);
      f.npcs.push({ kind: 'ambient', id: d.id, glyph: d.glyph, col: '#9fc4ba', zones: d.zones, x, y, wait: DD.u.int(r, TS.ambientStep.min, TS.ambientStep.max) });
    }
  }
  function ambientTick() {
    for (const n of st.f.npcs) {
      if (n.kind !== 'ambient' || --n.wait > 0) continue;
      n.wait = DD.u.int(Math.random, TS.ambientStep.min, TS.ambientStep.max);
      const dir = DD.u.shuffle(Math.random, [[1, 0], [-1, 0], [0, 1], [0, -1]]).find(([dx, dy]) => roamable(n, n.x + dx, n.y + dy));
      if (dir) { n.x += dir[0]; n.y += dir[1]; }
    }
  }

  // Run state: the town position lives on the saved dungeon run, or on a small {kind:'town'} run when none is in progress.
  function savePos() {
    const pos = { id: st.id, x: st.x, y: st.y, seed: st.seed }, r = DD.save.run;
    if (r && !r.kind) { r.town = pos; DD.save.saveRun(r); }
    else if (!r || r.kind === 'town') DD.save.saveRun({ v: 1, kind: 'town', town: pos });
  }
  function clearPos() {
    const r = DD.save.run;
    if (r && r.kind === 'town') DD.save.saveRun(null);
    else if (r && r.town) { delete r.town; DD.save.saveRun(r); }
  }
  T.saved = function (r) {
    const t = r && r.town; parse();
    if (!t || !DD.world.isTown(t.id) || !infoAt(t.x, t.y) || !infoAt(t.x, t.y).walk) return null;
    return t;
  };

  function zoneCheck(quiet) {
    const d = infoAt(st.x, st.y), z = d && d.zone;
    if (!z || z === st.zone) return;
    st.zone = z;
    if (!quiet) DD.ui.banner(TM.zones[z].name, TM.zones[z].blurb);
  }
  function say(t) { st.msgs.push(t); while (st.msgs.length > 6) st.msgs.shift(); }
  function draw(resizeOnly) {
    if (!g.canvas || !st) return;
    DD.render.draw(g.canvas, { floor: st.f, px: st.x, py: st.y, accent: town().accent });
    if (resizeOnly) return;
    const p = prof(), r = run(), s = maxes();
    g.floor.replaceChildren(el('b', null, town().name), el('small', null, st.zone ? TM.zones[st.zone].name : 'Lymph node'));
    g.glu.replaceChildren('Glucose ', el('b', null, p.glucose));
    g.run.replaceChildren(r ? 'HP ' : 'Run ', el('b', null, r ? Math.round(r.hp) + '/' + s.maxHP + ' · ATP ' + Math.round(r.atp) + '/' + s.maxATP : 'none'));
    g.log.replaceChildren(...st.msgs.slice(-DD.S.log.lines).reverse().map(t => el('div', null, t)));
  }

  T.move = function (dx, dy) {
    if (DD.ui.mode !== 'town' || !st) return;
    const nx = st.x + dx, ny = st.y + dy, d = infoAt(nx, ny); if (!d) return;
    const n = npcAt(nx, ny);
    if (n) return bump(n);
    if (d.bump) return T.open(d.bump);
    if (!d.walk) return;
    st.x = nx; st.y = ny;
    ambientTick(); zoneCheck(); savePos(); draw();
    if (d.panel) T.open(d.panel);
  };
  function bump(n) {
    if (n.kind === 'merchant') return DD.npc.open(n);
    if (n.kind === 'town') return T.open(TM.keepers[n.id]);
    // ambient: an accurate fact or a Derrick joke, sometimes gossip about a region that drains here
    const d = DD.data.npc(n.id), gossip = town().regions.flatMap(id => DD.data.townGossip[id] || []);
    const ev = DD.derrick.npcLine(n.id); // 5b: sometimes they react to what Derrick has been up to
    const line = ev && Math.random() < 0.5 ? ev.text : gossip.length && Math.random() < TS.gossipChance ? DD.u.pick(Math.random, gossip) : DD.u.pick(Math.random, d.lines.greet);
    say(d.name + ': “' + line + '”');
    // then it gets out of your way, so a cell in a narrow gap never blocks the path: step aside, or swap places with you
    const dir = DD.u.shuffle(Math.random, [[1, 0], [-1, 0], [0, 1], [0, -1]]).find(([dx, dy]) => roamable(n, n.x + dx, n.y + dy));
    if (dir) { n.x += dir[0]; n.y += dir[1]; } else { const [x, y] = [n.x, n.y]; n.x = st.x; n.y = st.y; st.x = x; st.y = y; zoneCheck(); savePos(); }
    T.open('talk', { def: d, line });
  }

  // ---------- panels ----------
  const note = (txt, cls) => el('div', { class: 'small ' + (cls || 'dim') }, txt);
  const chips = () => { const p = prof(), r = run(), s = maxes(); return el('div', { class: 'chips' }, el('span', { class: 'chip warn' }, 'Glucose ' + p.glucose),
    r ? el('span', { class: 'chip' }, 'HP ' + Math.round(r.hp) + '/' + s.maxHP + ' · ATP ' + Math.round(r.atp) + '/' + s.maxATP) : el('span', { class: 'chip' }, 'no run in progress')); };
  const leaveBtn = () => el('button', { class: 'btn', type: 'button', onclick: T.close }, el('kbd', null, 'Esc'), 'Leave');
  const msgEl = () => T.msg ? el('div', { class: 'fb good', role: 'status' }, T.msg) : null;
  function shopPanel() {
    const p = prof();
    const rows = DD.data.itemOrder.map(id => {
      const d = DD.data.items[id], have = inv(id), full = have >= cap(id), poor = p.glucose < d.price;
      return el('div', { class: 'shoprow' },
        el('div', { class: 'shopinfo' }, el('b', null, d.name), el('span', { class: 'chip' }, 'owned ' + have + (d.cap ? '/' + d.cap : '')),
          el('div', { class: 'small' }, d.tip), el('div', { class: 'small dim' }, d.real)),
        el('button', { class: 'btn small', type: 'button', disabled: full || poor, title: full ? 'Carry limit reached' : poor ? 'Not enough glucose' : '', onclick: () => T.buy(id) },
          'Buy ' + d.price + ' g'));
    });
    const owned = DD.data.itemOrder.filter(id => inv(id) > 0);
    const sell = owned.length ? owned.map(id => el('div', { class: 'shoprow' },
      el('div', { class: 'shopinfo' }, el('b', null, DD.data.items[id].name), el('span', { class: 'chip' }, '×' + inv(id))),
      el('button', { class: 'btn small', type: 'button', onclick: () => T.sell(id) }, 'Sell ' + sellPrice(id) + ' g')))
      : [note('Nothing to sell. You are not carrying any items.')];
    // Gear (4b): commons and a few uncommons that rotate with each visit, favoring gear from the regions that drain to this node.
    const GR = DD.gear, stock = GR.shopStock(st.seed, town().regions).filter(id => !T.gearBought.has(id));
    const gearRows = stock.map(id => { const it = DD.data.gearById[id], price = GR.price(it), poor = p.glucose < price;
      return el('div', { class: 'shoprow gearrow' }, GR.info(it, el('span', { class: 'chip' }, 'owned ' + GR.owned(id))),
        el('button', { class: 'btn small', type: 'button', disabled: poor, title: poor ? 'Not enough glucose' : '', onclick: () => T.buyGear(id) }, 'Buy ' + price + ' g')); });
    const bagSell = [...new Set(p.gearBag)].map(id => DD.data.gearById[id]).filter(it => GR.canSell(it))
      .sort((a, b) => (GR.owned(b.id) > 1) - (GR.owned(a.id) > 1) || GR.sellPrice(b) - GR.sellPrice(a))
      .map(it => el('div', { class: 'shoprow' }, el('div', { class: 'shopinfo' }, el('b', { class: 'gname', style: { color: GR.color(it.rarity) } }, it.name),
        el('span', { class: 'chip' }, 'you own ' + GR.owned(it.id) + (GR.owned(it.id) > 1 ? ' (extra copy)' : ''))),
        el('button', { class: 'btn small', type: 'button', onclick: () => T.sellGear(it.id) }, 'Sell ' + GR.sellPrice(it) + ' g')));
    return ['Plasma cell · shop', talk('plasma'), chips(), msgEl(), rows,
      el('div',{class:'toolrow2'},el('button',{class:'btn',onclick:()=>T.open('specialty')},'Specialty equipment'),el('button',{class:'btn',onclick:()=>T.open('enchant')},'The Golgi Workshop')),
      el('h3', null, 'Gear'), note('Stock changes every visit. Equip what you buy from the gear screen.'),
      el('div', { class: 'toolrow2' }, el('button', { class: 'btn small primary', type: 'button', onclick: () => { savePos(); DD.gear.screen(() => DD.ui.town({ resume: T.saved(DD.save.run) })); } }, 'Open gear screen')),
      gearRows.length ? gearRows : note('Sold out for this visit.'),
      el('h3', null, 'Sell (' + Math.round(E.sellPct * 100) + '% of price)'), sell,
      bagSell.length ? [el('div', { class: 'tag' }, 'Gear in your bag (equipped gear is not for sale; legendaries are never sold)'), bagSell] : null];
  }
  function innPanel() {
    const iw = T.innWhy();
    return ['Mast cell · inn', talk('mast'), chips(), msgEl(),
      el('button', { class: 'btn', type: 'button', disabled: !!iw, onclick: T.rest }, 'Rest: full HP and ATP · ' + innCost() + ' g'), iw ? note(iw, 'warn') : null];
  }
  function respPanel() {
    const cw = T.convertWhy();
    return ['Respiration counter', note('“Aerobic respiration yields roughly 30–32 ATP per glucose. Here, the rate is simpler.”'), chips(), msgEl(),
      el('button', { class: 'btn', type: 'button', disabled: !!cw, onclick: T.convert }, E.respiration.glucose + ' glucose → +' + E.respiration.atp + ' ATP'), cw ? note(cw, 'warn') : null];
  }
  function bountyPanel() {
    if (DD.bounty.fill()) DD.save.save();
    const B = DD.S.bounty, bs = prof().bounties;
    return ['Helper T cell · bounties', el('span', { class: 'chip' }, bs.active.length + '/' + B.active + ' active · ' + bs.done + ' done'), talk('helper-t'), msgEl(),
      bs.active.length ? bs.active.map(b => el('div', { class: 'shoprow' },
        el('div', { class: 'shopinfo' }, el('b', null, DD.bounty.text(b)), el('span', { class: 'chip' + (b.done ? ' ok' : '') }, b.have + '/' + b.need),
          el('div', { class: 'small dim' }, 'Reward: ' + DD.bounty.reward(b))),
        el('button', { class: 'btn small' + (b.done ? ' primary' : ''), type: 'button', disabled: !b.done, onclick: () => T.claim(b.id) }, b.done ? 'Turn in' : 'In progress')))
        : note('No bounties right now.')];
  }
  function talkPanel(a) {
    return [a.def.name, el('p', { class: 'small' }, '“' + a.line + '”')];
  }
  function hevPanel() {
    const r = DD.save.run && !DD.save.run.kind ? DD.save.run : null;
    return ['High endothelial venule', note('HEVs are small venules lined with tall endothelial cells. Lymphocytes leave the blood through them to enter the node. For you, they are the town’s gate to the circulation.'),
      el('div', { class: 'stack' },
        r ? el('button', { class: 'btn primary', type: 'button', onclick: () => leave(() => DD.ui.enter(r.regionId, true)) }, 'Return to the ' + DD.data.region(r.regionId).name) : null,
        el('button', { class: 'btn' + (r ? '' : ' primary'), type: 'button', onclick: () => leave(id => DD.ui.menu(id)) }, 'Open the travel map'))];
  }
  function hilumPanel() {
    const W = DD.world, t = town(), exit = DD.world.get(t.exit), r = DD.save.run && !DD.save.run.kind ? DD.save.run : null;
    const chain = !r && W.isLymphocyte() ? DD.data.circ.towns.filter(o => o.id !== st.id).map(o => W.plan(st.id, o.id)).filter(p => p && p.mode === 'chain') : [];
    const go = plan => leave(() => W.fastStatus(plan).code === 'unlocked' ? DD.travel.fast(plan) : DD.travel.start(plan));
    return ['Hilum · efferent lymphatic vessel', note('Lymph leaves the node through the efferent lymphatic vessel, heading for the ' + exit.name.toLowerCase() + ' and the venous angle, where lymph rejoins the blood.'),
      r ? note('A run in the ' + DD.data.region(r.regionId).name + ' is in progress. Finish it or abandon it before you travel.', 'warn') : null,
      chain.length ? el('div', { class: 'tag' }, 'Lymphocyte shortcut: along the node chain') : null,
      chain.length ? el('div', { class: 'stack' }, chain.map(p => el('button', { class: 'btn', type: 'button', onclick: () => go(p) },
        'To the ' + DD.data.town(p.to).name + (W.fastStatus(p).code === 'unlocked' ? ' (fast travel)' : '')))) : null,
      el('button', { class: 'btn' + (chain.length ? '' : ' primary'), type: 'button', onclick: () => leave(id => DD.ui.menu(id)) }, 'Rejoin the blood: pick a destination')];
  }
  function specialtyPanel(){
    const ids=DD.gear.specialtyStock(town().regions).filter(id=>!T.gearBought.has(id));
    return ['Specialty outfitter',note('Distinctive equipment for specific builds.'),chips(),msgEl(),
      ...ids.map(id=>{const it=DD.data.gearById[id];return el('div',{class:'shoprow'},DD.gear.info(it),el('button',{class:'btn',disabled:prof().glucose<DD.gear.price(it),onclick:()=>T.buyGear(id)},'Buy '+DD.gear.price(it)+' g'));})];
  }
  function enchantPanel(){
    const ids=[...new Set(DD.gear.equippedIds().concat(prof().gearBag))].filter(id=>{const it=DD.data.gearById[id];return it&&it.modern&&it.slot==='armor';});
    return ['The Golgi Workshop · Fibroblast',note('One added resistance per armor copy. Built-in properties remain. Replacing an enchantment costs the full price; identical resistance never stacks.'),chips(),msgEl(),
      note('Each enchantment costs '+DD.gear.enchantCost()+' glucose and halves direct damage of its type. It does not grant status immunity.'),
      ...ids.map(id=>el('div',{class:'card'},DD.gear.info(DD.data.gearById[id]),el('div',{class:'toolrow2'},['acid','electrical','oxidative','toxin'].map(type=>{
        const why=DD.gear.enchantWhy(id,type);return el('button',{class:'btn small',disabled:!!why,title:why,onclick:()=>{if(DD.gear.enchant(id,type)){T.msg='Enchantment applied.';T.open('enchant');}}},type+' resistance');
      }))))];
  }
  const PANELS = { enchant:enchantPanel,specialty:specialtyPanel, shop: shopPanel, inn: innPanel, resp: respPanel, bounty: bountyPanel, talk: talkPanel, hev: hevPanel, hilum: hilumPanel };
  T.open = function (name, arg) {
    if (!g.over) return;
    if (T.panel !== name) T.msg = '';
    T.panel = name; T.panelArg = arg; DD.ui.mode = 'townpanel';
    const [title, ...body] = PANELS[name](arg);
    g.over.hidden = false;
    g.over.replaceChildren(el('div', { class: 'cbox', role: 'dialog', 'aria-label': title },
      el('div', { class: 'tag' }, town().name), el('h2', null, title), ...body, leaveBtn()));
    draw();
  };
  T.close = function () {
    T.panel = null; T.panelArg = null; T.msg = '';
    if (g.over) { g.over.hidden = true; g.over.replaceChildren(); }
    DD.ui.mode = 'town'; draw();
  };
  T.back = function () { // after the merchant's talk overlay closes
    if (g.over) { g.over.hidden = true; g.over.replaceChildren(); }
    DD.ui.mode = 'town'; savePos(); draw();
  };
  function leave(next) {
    const id = st.id;
    if (g.ro) g.ro.disconnect();
    clearPos(); g = {}; st = null; T.panel = null; DD.save.save();
    next(id);
  }

  // ---------- screen ----------
  // opts: {id, via:'lymph'|'hev', fled, resume:{id,x,y,seed}}. Lymph (and Lymph Drain) lands at the afferent entrance; the blood at the HEV gate.
  DD.ui.town = function (opts) {
    opts = opts || {};
    const ui = DD.ui, b = parse(), res = opts.resume;
    const id = res ? res.id : opts.id || (DD.world.isTown(prof().loc) ? prof().loc : 'cervical');
    DD.game.run = null; DD.game.combat = null; DD.game.talk = null; // the saved run is the only copy while you are here
    prof().loc = id;
    if (g.ro) g.ro.disconnect();
    g = {}; T.lines = {}; T.msg = ''; T.panel = null; T.gearBought = new Set();
    const spot = b.spots[opts.via === 'hev' ? 'hev' : 'lymph'];
    st = { id, seed: res ? res.seed : (Math.random() * 2147483647) >>> 0, x: res ? res.x : spot.x, y: res ? res.y : spot.y, zone: null, msgs: [] };
    build(id, st.seed);
    if (DD.bounty.fill()) DD.save.save();
    const t = town();
    say(opts.fled ? 'You flowed into a lymphatic vessel and out into the ' + t.name + '. The pathogen is still back there.'
      : res ? 'You pick up where you stood.' : opts.via === 'hev' ? 'You slip out of a high endothelial venule into the paracortex.' : 'Lymph carries you in through an afferent vessel.');
    if (st.f.npcs.some(n => n.kind === 'merchant')) say('A dendritic merchant is presenting its wares in the paracortex.');
    ui.mode = 'town';
    g.floor = el('div', { class: 'floorname' });
    g.glu = el('div', { class: 'stat' }); g.run = el('div', { class: 'stat' });
    g.canvas = el('canvas', { 'aria-label': t.name + ' town map' });
    g.banner = el('div', { class: 'banner', hidden: true, role: 'status' });
    g.mapbox = el('div', { class: 'mapbox' }, g.canvas, g.banner);
    g.log = el('div', { class: 'log', 'aria-live': 'polite' });
    g.over = el('div', { class: 'overlay', hidden: true });
    const key = (label, dx, dy, cls) => {
      let timer = null; const stop = () => { clearInterval(timer); timer = null; };
      return el('button', { class: 'key ' + cls, 'aria-label': 'Move ' + label, onclick: e => { if (e.detail === 0) T.move(dx, dy); },
        onpointerdown: () => { T.move(dx, dy); stop(); timer = setInterval(() => { if (DD.ui.mode === 'town') T.move(dx, dy); else stop(); }, TS.holdMs); },
        onpointerup: stop, onpointerleave: stop, onpointercancel: stop }, label);
    };
    const L = (ch, label, color) => el('span', null, el('b', { style: { color } }, ch), label);
    ui.mount(el('div', { class: 'screen game town', style: { '--accent': t.accent } },
      el('div', { class: 'hud' }, g.floor, g.glu, g.run),
      g.mapbox, g.log,
      el('div', { class: 'controls' },
        el('div', { class: 'dpad' }, key('↑', 0, -1, 'u'), key('←', -1, 0, 'l'), key('↓', 0, 1, 'd'), key('→', 1, 0, 'r')),
        el('div', { class: 'legend' }, L('@', 'you', '#fff'), L('☺', 'town cell', '#7fd6c2'), L('b t o f r', 'resident cells', '#9fc4ba'), L('¥', 'merchant', '#e0c060'),
          L('+', 'building', 'var(--bile)'), L('✧','enchanter','#c09aff'), L('!', 'bounty board', 'var(--bile)'), L('=', 'counter', 'var(--bile)'), L('≈', 'HEV gate', '#ff6b6b'), L('<', 'hilum exit', 'var(--bone)'), L('∗', 'germinal center', '#e6a3c8'))),
      g.over));
    zoneCheck(true);
    savePos();
    if (window.ResizeObserver) { g.ro = new ResizeObserver(() => draw(true)); g.ro.observe(g.mapbox); }
    draw();
    ui.banner(t.name, TM.zones[st.zone].name + ' · ' + t.blurb);
  };
  return T;
})();
