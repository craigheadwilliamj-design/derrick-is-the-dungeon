// The six lymph node towns (data/circulation.js) share one layout: plasma cell shop, mast cell inn, respiration counter.
// HP and ATP only exist inside a dungeon run, so the inn and the counter act on the saved run; with none in progress
// they explain themselves instead.
DD.town = (function () {
  const { el } = DD.u, E = DD.S.economy;
  const T = { msg: '' };
  const prof = () => DD.save.profile;
  const run = () => { const r = DD.save.run; return r && !r.kind ? r : null; }; // dungeon runs only, never a trip
  const inv = id => prof().inventory[id] || 0;
  const cap = id => DD.data.items[id].cap || Infinity;
  const sellPrice = id => Math.floor(DD.data.items[id].price * E.sellPct);
  const innCost = () => E.inn.base + E.inn.perLevel * prof().level;
  T.sellPrice = sellPrice; T.innCost = innCost;

  function done(msg) { T.msg = msg; DD.save.save(); DD.ui.town(); }
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
    if (!r) return 'You are not hurt. HP and ATP only matter inside a dungeon run.';
    if (r.hp >= st.maxHP && r.atp >= st.maxATP) return 'You are already fully rested.';
    if (prof().glucose < innCost()) return 'Not enough glucose.';
    return '';
  };
  T.rest = function () {
    if (T.innWhy()) return;
    const r = run(), st = maxes();
    prof().glucose -= innCost(); r.hp = st.maxHP; r.atp = st.maxATP; DD.save.saveRun(r);
    done('You sleep it off. Full HP and ATP.');
  };
  T.convertWhy = function () {
    const r = run(), st = maxes();
    if (!r) return 'ATP only matters inside a dungeon run.';
    if (r.atp >= st.maxATP) return 'Your ATP is already full.';
    if (prof().glucose < E.respiration.glucose) return 'Not enough glucose.';
    return '';
  };
  T.convert = function () {
    if (T.convertWhy()) return;
    const r = run(), st = maxes(), before = r.atp;
    prof().glucose -= E.respiration.glucose; r.atp = Math.min(st.maxATP, r.atp + E.respiration.atp); DD.save.saveRun(r);
    done('Respiration: +' + Math.round(r.atp - before) + ' ATP.');
  };

  DD.ui.town = function (opts) {
    const ui = DD.ui; ui.mode = 'town';
    if (opts && opts.id) T.id = opts.id; else if (!T.id) T.id = DD.world.isTown(prof().loc) ? prof().loc : 'cervical';
    const town = DD.data.town(T.id);
    if (opts) T.msg = opts.fled ? 'You flowed into a lymphatic vessel and out into the ' + town.name + '. The pathogen is still back there.' : '';
    const p = prof(), r = run(), st = maxes();
    const note = (txt, cls) => el('div', { class: 'small ' + (cls || 'dim') }, txt);
    const shop = DD.data.itemOrder.map(id => {
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
    const iw = T.innWhy(), cw = T.convertWhy();
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Lymph node'),
      el('h1', null, town.name),
      el('p', { class: 'dim small' }, town.blurb),
      el('div', { class: 'chips' }, el('span', { class: 'chip warn' }, 'Glucose ' + p.glucose),
        r ? el('span', { class: 'chip' }, 'HP ' + Math.round(r.hp) + '/' + st.maxHP + ' · ATP ' + Math.round(r.atp) + '/' + st.maxATP) : el('span', { class: 'chip' }, 'no run in progress')),
      T.msg ? el('div', { class: 'fb good', role: 'status' }, T.msg) : null,
      el('div', { class: 'card' }, el('h3', null, 'Plasma cell · shop'),
        note('“Plasma cells are antibody factories. Between batches, I sell supplies.”'),
        shop, el('h3', null, 'Sell (' + Math.round(E.sellPct * 100) + '% of price)'), sell),
      el('div', { class: 'card' }, el('h3', null, 'Mast cell · inn'),
        note('“My granules hold histamine and heparin. Rooms are quiet, so take a bed.”'),
        el('button', { class: 'btn', type: 'button', disabled: !!iw, onclick: T.rest }, 'Rest: full HP and ATP · ' + innCost() + ' g'),
        iw ? note(iw, 'warn') : null),
      el('div', { class: 'card' }, el('h3', null, 'Respiration counter'),
        note('“Aerobic respiration yields roughly 30–32 ATP per glucose. Here, the rate is simpler.”'),
        el('button', { class: 'btn', type: 'button', disabled: !!cw, onclick: T.convert }, E.respiration.glucose + ' glucose → +' + E.respiration.atp + ' ATP'),
        cw ? note(cw, 'warn') : null),
      el('div', { class: 'toolrow2' },
        r ? el('button', { class: 'btn primary', type: 'button', onclick: () => ui.enter(r.regionId, true) }, 'Return to the dungeon') : null,
        el('button', { class: 'btn' + (r ? '' : ' primary'), type: 'button', onclick: () => ui.menu(T.id) }, 'Open the body map'))));
  };
  return T;
})();
