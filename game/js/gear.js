// Gear (phase 4b): ownership, equipping, chests, shop and merchant stock, item cards and the equipment screen.
// Item data is in data/gear.js; equipped items reach combat through DD.fx.gearEffects, so equipping only changes profile.equipment.
DD.gear = (function () {
  const { el } = DD.u, G = DD.S.gear, E = DD.S.economy;
  const gear = {};
  const prof = () => DD.save.profile;
  const by = id => DD.data.gearById[id];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pc = x => Math.round(x * 100) + '%';
  const SLOT_NAME = { weapon: 'Weapon', armor: 'Armor', acc1: 'Accessory 1', acc2: 'Accessory 2' };
  const KIND_NAME = { weapon: 'Weapon', armor: 'Armor', acc: 'Accessory' };
  const TYPE_NAME = { axe: 'Axe', staff: 'Staff', dagger: 'Dagger', mace: 'Mace', bow: 'Bow', instrument: 'Instrument' };
  const TYPE_PL = { bacteria: 'bacteria', virus: 'viruses', fungus: 'fungi', protozoa: 'protozoa', worm: 'worms' };
  const STATS = [['maxHP', 'HP', 0], ['power', 'Power', 1], ['defense', 'Defense', 1], ['maxATP', 'ATP', 0]];

  gear.slotsFor = it => it.slot === 'acc' ? ['acc1', 'acc2'] : [it.slot];
  gear.color = rarity => G.colors[rarity];
  gear.price = it => G.price[it.rarity] || 0;           // legendaries have no price: never bought or sold
  gear.sellPrice = it => Math.floor(gear.price(it) * E.sellPct);
  gear.canSell = it => it.rarity !== 'legendary';

  // ---------- ownership ----------
  const bag = () => prof().gearBag;
  gear.equippedIds = () => DD.data.gearSlots.map(s => prof().equipment[s]).filter(Boolean);
  gear.bagCount = id => bag().filter(x => x === id).length;
  gear.owned = id => gear.bagCount(id) + gear.equippedIds().filter(x => x === id).length;
  gear.give = function (id) { if (by(id)) bag().push(id); };
  function takeFromBag(id) { const i = bag().indexOf(id); if (i >= 0) bag().splice(i, 1); return i >= 0; }
  // A saved run (or town visit) keeps its HP and ATP, so they can't sit above a lowered maximum.
  function clampRun() {
    const r = DD.save.run; if (!r || typeof r.hp !== 'number') return;
    const st = DD.stats.compute(prof());
    r.hp = Math.max(1, Math.min(r.hp, st.maxHP)); r.atp = Math.min(r.atp || 0, st.maxATP);
    DD.save.saveRun(r);
  }
  gear.equip = function (id, slot) {
    const it = by(id); if (!it || !gear.slotsFor(it).includes(slot) || !takeFromBag(id)) return false;
    const old = prof().equipment[slot]; if (old) bag().push(old);
    prof().equipment[slot] = id;
    clampRun(); DD.save.save(); return true;
  };
  gear.unequip = function (slot) {
    const old = prof().equipment[slot]; if (!old) return false;
    bag().push(old); delete prof().equipment[slot];
    clampRun(); DD.save.save(); return true;
  };
  // Stats with some slots swapped, for the comparison on item cards. changes = {slot: id | null}.
  gear.preview = function (changes) {
    const eq = Object.assign({}, prof().equipment, changes);
    return DD.stats.compute(Object.assign({}, prof(), { equipment: eq }));
  };

  // ---------- plain-language effects ----------
  const STAT_TEXT = {
    maxHP: v => '+' + Math.round(v) + ' max HP', power: v => '+' + (+v.toFixed(1)) + ' Power', defense: v => '+' + (+v.toFixed(1)) + ' Defense',
    maxATP: v => '+' + Math.round(v) + ' max ATP', blockCut: v => '+' + pc(v) + ' damage cut when you block'
  };
  const WHEN = { onKill: 'When you destroy an enemy', onBlock: 'When you block', onHeavyCorrect: 'On a correct heavy attack', onQuestionCorrect: 'On every correct answer',
    fightStart: 'At the start of a fight', turnStart: 'At the start of each turn' };
  function condText(c) {
    if (!c) return '';
    if (c.enemyType) return ' against ' + [].concat(c.enemyType).map(t => TYPE_PL[t] || t).join(' and ');
    if (c.isBoss) return ' against bosses';
    if (c.hpBelow != null) return ' while the enemy is under ' + pc(c.hpBelow) + ' HP';
    if (c.beatenBefore) return ' against species you have beaten before';
    return '';
  }
  gear.fxText = function (e) {
    const r = e.result;
    if (e.trigger === 'static') {
      if (r.type === 'stat') return STAT_TEXT[r.stat](r.add);
      if (r.type === 'damageMult') return '×' + r.mult + ' damage' + condText(e.cond);
      if (r.type === 'travelSpeed') return 'The current carries you along vessels more often';
      if (r.type === 'revealNPCs') return 'Shows native cells and merchants on the dungeon map before you find them';
    }
    const when = WHEN[e.trigger] || e.trigger;
    if (r.type === 'heal') return when + ': heal ' + pc(r.pct) + ' of max HP';
    if (r.type === 'atp') return when + ': +' + r.amount + ' ATP';
    if (r.type === 'shield') return when + ': the first hit you take does 0 damage';
    if (r.type === 'poison') return when + ': poison for ' + pc(r.pct) + ' of its max HP per turn, ' + r.turns + ' turns';
    if (r.type === 'execute') return when + ': finishes an enemy left under ' + pc(r.threshold) + ' HP';
    return when;
  };
  // Stat lines merge into one row; the rest stay one per line.
  gear.fxLines = function (it) {
    const stats = it.effects.filter(e => e.result.type === 'stat').map(gear.fxText), rest = it.effects.filter(e => e.result.type !== 'stat').map(gear.fxText);
    return (stats.length ? [stats.join(', ')] : []).concat(rest);
  };

  // ---------- chests, shops, merchant ----------
  const TIERS = ['common', 'uncommon', 'rare'];
  // Rolled with the floor's seeded rng so a reload shows the same chest. Boss floors shift the roll one tier up (rare stays rare).
  gear.rollChest = function (r, regionId, boss) {
    const C = G.chest;
    let tier = DD.u.weightedPick(r, TIERS, t => C.odds[t]);
    if (boss) tier = TIERS[Math.min(TIERS.length - 1, TIERS.indexOf(tier) + C.bossShift)];
    const w = it => it.region === regionId ? C.regionWeight : !it.region ? C.genericWeight : 0;
    for (const t of [tier].concat(TIERS.filter(x => x !== tier))) {
      const pool = DD.data.gear.filter(it => it.rarity === t && w(it) > 0);
      if (pool.length) return DD.u.weightedPick(r, pool, w).id;
    }
    return DD.data.gear.find(it => it.rarity === 'common').id;
  };
  gear.openChest = function (chest) {
    const it = by(chest.item); chest.taken = true; gear.give(chest.item);
    DD.game.say('You open a chest: ' + it.name + ' (' + it.rarity + ').');
    DD.save.save(); DD.game.persist();
  };
  // Town shop: some commons and a few uncommons, favoring gear from the regions that drain to this node. Same seed, same stock.
  gear.shopStock = function (seed, regions) {
    const r = DD.rng((seed ^ 0x6ea7) >>> 0), S = G.shop;
    const w = it => (regions || []).includes(it.region) ? S.regionWeight : 1;
    const take = (tier, n) => {
      const pool = DD.data.gear.filter(it => it.rarity === tier), out = [];
      while (out.length < n && pool.length) { const it = DD.u.weightedPick(r, pool, w); pool.splice(pool.indexOf(it), 1); out.push(it.id); }
      return out;
    };
    return take('common', S.commons).concat(take('uncommon', S.uncommons));
  };
  // The dendritic merchant's rare slot: one rare item, at the merchant's markup.
  gear.rareStock = function (r) {
    const pool = DD.data.gear.filter(it => it.rarity === 'rare'), it = DD.u.pick(r, pool);
    return { id: it.id, price: Math.round(G.price.rare * DD.S.merchant.priceMult), sold: false };
  };
  gear.buyRare = function (npc) {
    const s = npc.rare; if (!s || s.sold || prof().glucose < s.price) return false;
    prof().glucose -= s.price; s.sold = true; gear.give(s.id); return true;
  };

  // ---------- cards ----------
  const ownType = it => it.wtype && it.wtype === DD.data.classes[prof().classId].weaponType;
  function chips(it) {
    return el('div', { class: 'chips' },
      el('span', { class: 'chip rc' }, cap(it.rarity)),
      el('span', { class: 'chip' }, it.slot === 'weapon' ? TYPE_NAME[it.wtype] : KIND_NAME[it.slot]),
      it.region ? el('span', { class: 'chip' }, DD.data.region(it.region).name) : null,
      ownType(it) ? el('span', { class: 'chip ok', title: 'Your class’s weapon type: this weapon does ×' + G.weaponTypeMult + ' damage' }, 'own type ×' + G.weaponTypeMult) : null);
  }
  // Name, rarity, effects and the real fact. Used in shops, the merchant and the equipment screen.
  gear.info = function (it, extra) {
    return el('div', { class: 'shopinfo ginfo', style: { '--rc': gear.color(it.rarity) } },
      el('b', { class: 'gname' }, it.name), chips(it), extra || null,
      el('ul', { class: 'fxl' }, gear.fxLines(it).map(t => el('li', null, t))),
      el('div', { class: 'small dim' }, it.desc));
  };
  const fmt = (v, d) => d ? v.toFixed(1) : String(Math.round(v));
  // Stat comparison if `id` replaced whatever is in `slot`.
  gear.diff = function (id, slot) {
    const it = by(id), oldId = prof().equipment[slot], old = oldId ? by(oldId) : null;
    const a = DD.stats.compute(prof()), b = gear.preview({ [slot]: id }), rows = [];
    STATS.forEach(([k, label, d]) => {
      const dv = b[k] - a[k]; if (Math.abs(dv) < 0.05) return;
      rows.push(el('div', { class: dv > 0 ? 'up' : 'down' }, label + ' ' + fmt(a[k], d) + ' → ' + fmt(b[k], d) + ' (' + (dv > 0 ? '+' : '') + (d ? dv.toFixed(1) : Math.round(dv)) + ')'));
    });
    if (Math.abs(b.blockCut - a.blockCut) > 0.001) rows.push(el('div', { class: b.blockCut > a.blockCut ? 'up' : 'down' }, 'Block cut ' + pc(a.blockCut) + ' → ' + pc(b.blockCut)));
    if (slot === 'weapon') {
      const oldOwn = old && ownType(old), newOwn = ownType(it);
      if (newOwn && !oldOwn) rows.push(el('div', { class: 'up' }, 'Own weapon type: ×' + G.weaponTypeMult + ' damage'));
      if (oldOwn && !newOwn) rows.push(el('div', { class: 'down' }, 'Loses the own-weapon-type bonus (×' + G.weaponTypeMult + ')'));
    }
    const lose = old ? old.effects.filter(e => e.result.type !== 'stat').map(gear.fxText) : [];
    lose.forEach(t => rows.push(el('div', { class: 'down' }, 'Loses: ' + t)));
    if (!rows.length) rows.push(el('div', { class: 'dim' }, 'No change to your stats.'));
    return el('div', { class: 'diff' }, el('div', { class: 'dim' }, (old ? 'Replaces ' + old.name : 'Empty slot') + (it.slot === 'acc' ? ' (' + SLOT_NAME[slot] + ')' : '') + ':'), rows);
  };

  // ---------- the equipment screen ----------
  let filter = 'all', back = null;
  const RANK = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
  gear.screen = function (backFn) {
    const ui = DD.ui, p = prof();
    if (backFn) back = backFn;
    ui.mode = 'gear';
    const sc = document.querySelector('.screen'), top = sc ? sc.scrollTop : 0;
    const st = DD.stats.compute(p), cls = DD.data.classes[p.classId];
    const rerender = () => gear.screen();
    const slotCard = slot => {
      const id = p.equipment[slot], it = id && by(id);
      return el('div', { class: 'gearcard' + (it ? ' ' + it.rarity : ''), style: { '--rc': it ? gear.color(it.rarity) : 'var(--line)' } },
        el('div', { class: 'tag' }, SLOT_NAME[slot]),
        it ? gear.info(it) : el('div', { class: 'dim small' }, 'Empty'),
        it ? el('button', { class: 'btn small', type: 'button', onclick: () => { gear.unequip(slot); rerender(); } }, 'Unequip') : null);
    };
    const counts = {};
    bag().forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const ids = Object.keys(counts).map(by).filter(it => filter === 'all' || it.slot === filter)
      .sort((a, b) => ['weapon', 'armor', 'acc'].indexOf(a.slot) - ['weapon', 'armor', 'acc'].indexOf(b.slot) || RANK[a.rarity] - RANK[b.rarity] || a.name.localeCompare(b.name));
    const bagCard = it => {
      const n = counts[it.id], extra = gear.owned(it.id) > 1;
      const slots = gear.slotsFor(it);
      return el('div', { class: 'gearcard ' + it.rarity, style: { '--rc': gear.color(it.rarity) } },
        gear.info(it, extra || n > 1 ? el('div', { class: 'chips' }, el('span', { class: 'chip warn' }, 'you own ' + gear.owned(it.id)),
          gear.canSell(it) ? el('span', { class: 'chip' }, 'extra copies sell at a plasma cell shop for ' + gear.sellPrice(it) + ' g') : null) : null),
        slots.map(s => gear.diff(it.id, s)),
        el('div', { class: 'toolrow2' }, slots.map(s => el('button', { class: 'btn small primary', type: 'button', onclick: () => { gear.equip(it.id, s); rerender(); } },
          slots.length > 1 ? 'Equip in ' + SLOT_NAME[s].toLowerCase() : 'Equip'))));
    };
    const chip = ([v, label]) => el('button', { class: 'btn small' + (filter === v ? ' primary' : ''), type: 'button', 'aria-pressed': String(filter === v),
      onclick: () => { filter = v; rerender(); } }, label);
    ui.mount(el('div', { class: 'screen menu' },
      el('div', { class: 'tag' }, 'Gear'),
      el('h1', null, 'Equipment'),
      el('p', { class: 'dim small' }, cls.name + ' · ' + cls.weapon + ' are your own weapon type: an equipped one does ×' + G.weaponTypeMult + ' damage. Any class can equip any item.'),
      el('div', { class: 'toolrow2' }, el('button', { class: 'btn', type: 'button', onclick: () => (back || ui.menu)() }, 'Back')),
      el('div', { class: 'card' },
        el('div', { class: 'stats small' }, 'HP ' + st.maxHP + ' · Power ' + st.power.toFixed(1) + ' · Defense ' + st.defense.toFixed(1) + ' · ATP ' + st.maxATP + ' · Block cut ' + pc(st.blockCut)),
        DD.save.run ? el('div', { class: 'dim small' }, 'A run is in progress: HP and ATP are capped to the new maximums when you swap.') : null),
      el('div', { class: 'gslots' }, DD.data.gearSlots.map(slotCard)),
      el('div', { class: 'toolrow2' }, el('b', null, 'Bag (' + bag().length + ')'), [['all', 'All'], ['weapon', 'Weapons'], ['armor', 'Armor'], ['acc', 'Accessories']].map(chip)),
      ids.length ? el('div', { class: 'gslots' }, ids.map(bagCard)) : el('p', { class: 'dim small' }, bag().length ? 'Nothing in the bag for this filter.' : 'Your bag is empty. Gear comes from dungeon chests (&), plasma cell shops, the dendritic merchant and boss drops.')));
    const sc2 = document.querySelector('.screen'); if (sc2) sc2.scrollTop = top;
  };
  gear.summary = function () {
    const ids = gear.equippedIds();
    return ids.length ? ids.map(id => by(id).name).join(', ') : 'nothing equipped';
  };

  return gear;
})();
