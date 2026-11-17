// NPC logic (phase 3b): native cells, the dendritic merchant, helper T bounties, thymus milestones, boss legendaries.
// Screens for these live in js/npcui.js.
DD.npc = (function () {
  const S = DD.S, { el } = DD.u;
  const N = {};
  const prof = () => DD.save.profile;
  const run = () => DD.town.here() ? DD.town.run() : DD.game.run; // in a town (3c) the saved run is the only copy
  const inv = id => prof().inventory[id] || 0;
  const cap = id => DD.data.items[id].cap || Infinity;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ---------- generation (called by dungeon.js with its seeded rng, so floors reload identically) ----------
  N.natives = regionId => DD.data.npcs.filter(n => n.kind === 'native' && n.regions.includes(regionId));
  // Rotates through the region's cells floor by floor, so back-to-back floors differ.
  N.nativeFor = (regionId, floorIdx, seed) => { const l = N.natives(regionId); return l.length ? l[(floorIdx + (seed % l.length)) % l.length] : null; };
  N.makeStock = function (r) {
    const M = S.merchant, ids = DD.u.shuffle(r, DD.data.shopItems), n = DD.u.int(r, M.stockMin, M.stockMax);
    return ids.slice(0, n).map(id => ({ id, price: Math.round(DD.data.items[id].price * M.priceMult), qty: DD.u.int(r, 1, M.qtyMax) }));
  };
  N.saveState = f => (f.npcs || []).map(n => n.kind === 'merchant' ? { q: n.stock.map(s => s.qty), t: n.tip ? 1 : 0, g: n.rare && n.rare.sold ? 1 : 0 } : n.done ? 1 : 0);
  N.loadState = function (f, saved) {
    (saved || []).forEach((s, i) => {
      const n = (f.npcs || [])[i]; if (!n) return;
      if (n.kind === 'merchant' && s && typeof s === 'object') { n.stock.forEach((x, j) => { if (s.q && s.q[j] != null) x.qty = s.q[j]; }); if (s.t) n.tip = N.fadedTip(); if (s.g && n.rare) n.rare.sold = true; }
      else if (s === 1) n.done = true;
    });
  };
  N.at = (f, x, y) => (f.npcs || []).find(n => n.x === x && n.y === y);

  // ---------- talking: native cells and the merchant ----------
  N.open = function (npc) {
    const G = DD.game, d = npc.kind === 'merchant' ? DD.data.npc('dendritic') : DD.data.npc(npc.id);
    const ev = DD.derrick.npcLine(d.id); // a line about what Derrick has been up to (5b) replaces the standing joke
    G.talk = { npc, def: d, phase: npc.kind === 'merchant' ? 'shop' : 'greet', greet: pick(d.lines.greet), joke: ev ? ev.text : pick(d.lines.derrick), jokeFrom: ev ? ev.from : null, msg: '' };
    DD.ui.npc();
  };
  N.close = function () { DD.game.talk = null; DD.ui.closeNpc(); };
  N.ask = function () {
    const T = DD.game.talk, region = DD.data.region(DD.game.run.regionId);
    if (!T || T.npc.done) return;
    if (!DD.q.pool(region.systems, true).length) { T.phase = 'noq'; return DD.ui.npc(); }
    T.q = DD.q.pick(region.systems, { weakBias: true }); T.opts = DD.q.options(T.q, 0); T.answer = null; T.phase = 'ask';
    DD.ui.npc();
  };
  // Right = loot (glucose or a consumable). Wrong = the explanation and a friendly line. Either way this cell is done for the floor.
  N.answer = function (i) {
    const T = DD.game.talk, rn = DD.game.run; if (!T || T.phase !== 'ask' || T.answer) return;
    const o = T.opts[i]; if (!o) return;
    const ok = o.correct, L = S.npc;
    DD.q.record(T.q, ok, rn.regionId);
    T.answer = { i, ok }; T.npc.done = true; T.phase = 'result';
    if (ok) {
      const pool = S.travel.lootItems.filter(id => inv(id) < cap(id));
      if (pool.length && Math.random() < L.lootItemChance) { const id = pick(pool); DD.game.reward('item', id); T.loot = DD.data.items[id].name; }
      else { const v = DD.derrick.loot(DD.u.int(Math.random, L.lootGlucose.min, L.lootGlucose.max), rn.regionId); DD.game.reward('glucose', v); rn.glucose += v; T.loot = v + ' glucose'; }
      T.msg = 'They hand you ' + T.loot + '.';
    } else {
      if (!rn.miss.includes(T.q.id)) rn.miss.push(T.q.id);
      T.msg = pick(DD.data.npcFriendly);
    }
    DD.game.say(T.def.name + (ok ? ': ' + T.msg : ' shares the answer.'));
    DD.save.save(); DD.game.persist();
    DD.ui.npc();
  };

  // ---------- merchant ----------
  N.restCost = () => DD.town.innCost() * S.merchant.restMult;
  N.canBuy = function (s) {
    if (s.qty <= 0) return 'Sold out';
    if (inv(s.id) >= cap(s.id)) return 'Carry limit reached';
    if (prof().glucose < s.price) return 'Not enough glucose';
    return '';
  };
  N.buy = function (i) {
    const T = DD.game.talk, s = T.npc.stock[i]; if (!s || N.canBuy(s)) return;
    prof().glucose -= s.price; s.qty--; prof().inventory[s.id] = inv(s.id) + 1;
    T.msg = 'Bought ' + DD.data.items[s.id].name + ' for ' + s.price + ' glucose.';
    DD.save.save(); DD.game.persist(); DD.ui.npc();
  };
  N.buyRare = function () {
    const T = DD.game.talk, n = T.npc, it = n.rare && DD.data.gearById[n.rare.id];
    if (!it || !DD.gear.buyRare(n)) return;
    T.msg = 'Bought ' + it.name + ' for ' + n.rare.price + ' glucose. It is in your gear bag.';
    DD.save.save(); DD.game.persist(); DD.ui.npc();
  };
  N.restWhy = function () {
    const st = DD.game.stats(), r = run();
    if (!r) return 'HP and ATP only matter inside a dungeon run.';
    if (r.hp >= st.maxHP && r.atp >= st.maxATP) return 'You are already fully rested.';
    if (prof().glucose < N.restCost()) return 'Not enough glucose.';
    return '';
  };
  N.rest = function () {
    if (N.restWhy()) return;
    const st = DD.game.stats(), r = run(), T = DD.game.talk;
    prof().glucose -= N.restCost(); r.hp = st.maxHP; r.atp = st.maxATP;
    DD.game.syncResources(r);
    if (DD.town.here() && r !== prof()) DD.save.saveRun(r);
    T.msg = 'You curl up in the lymph for a bit. Full HP and ATP.';
    DD.save.save(); DD.game.persist(); DD.ui.npc(); DD.ui.syncHud();
  };
  // Regions with questions, oldest review first (never reviewed counts as most faded).
  N.fadedTip = function () {
    const rs = DD.data.regions.filter(r => r.playable || r.noPlace);
    const rank = rs.map((r, i) => ({ r, i, t: (prof().regions[r.id] || {}).lastReviewed || 0 })).sort((a, b) => a.t - b.t || a.i - b.i);
    return rank.slice(0, S.merchant.fadedCount).map(x => ({ name: x.r.name, ago: DD.ui.ago(x.t) }));
  };
  N.tip = function () {
    const T = DD.game.talk, n = T.npc; if (n.tip || prof().glucose < S.merchant.tipCost) return;
    prof().glucose -= S.merchant.tipCost; n.tip = N.fadedTip();
    T.msg = 'Pleasure doing business.';
    DD.save.save(); DD.game.persist(); DD.ui.npc(); DD.ui.syncHud();
  };

  // ---------- boss legendaries ----------
  // The first kill of a region's boss drops its legendary gear item into profile.gearBag. Returns the item if it was new.
  N.legendary = function (defId) {
    const region=DD.game.run.regionId;
    const pool=DD.data.activeGear.filter(it=>it.source==='boss'&&it.region===region);
    const fallback=DD.data.activeGear.filter(it=>it.source==='deep'&&(!it.region||it.region===region));
    const it=(pool.length?pool:fallback).find(it=>!DD.gear.owned(it.id)&&!DD.game.earnings().gear.includes(it.id));
    if(!it)return null;
    DD.game.reward('gear',it.id);return it;
  };
  N.markCleared = function (regionId) {
    const p = prof(), r = p.regions[regionId] || (p.regions[regionId] = { lastReviewed: 0, cleared: false, recent: [] });
    r.cleared = true;
  };

  return N;
})();

// ---------- helper T bounties ----------
DD.bounty = (function () {
  const B = DD.S.bounty, prof = () => DD.save.profile, bs = () => prof().bounties;
  const SYS_NAME = id => (DD.img && DD.img.SYSTEMS.find(s => s[0] === id) || [id, id])[1];
  const TYPE_PL = { bacteria: 'bacteria', virus: 'viruses', fungus: 'fungi', protozoa: 'protozoa', worm: 'worms' };
  const out = {};

  const playable = () => DD.data.regions.filter(r => r.playable);
  const killTargets = () => playable().flatMap(r => [...new Set(DD.data.enemies.filter(e => !e.boss && e.regions.includes(r.id)).map(e => e.type))].map(t => ({ region: r.id, type: t })));
  const sysTargets = () => Object.keys(DD.data.questions).filter(s => (DD.data.questions[s] || []).length);
  const key = b => b.kind + ':' + (b.region || '') + ':' + (b.type || '') + ':' + (b.system || '');

  function make() {
    const kinds = []; if (killTargets().length) kinds.push('kill'); if (sysTargets().length) kinds.push('answer'); if (playable().length) kinds.push('clear');
    if (!kinds.length) return null;
    const have = new Set(bs().active.map(key));
    for (let tries = 0; tries < 20; tries++) {
      const kind = DD.u.pick(Math.random, kinds), b = { id: 'b' + (++bs().seq), kind, have: 0, done: false };
      if (kind === 'kill') { const t = DD.u.pick(Math.random, killTargets()); b.region = t.region; b.type = t.type; b.need = DD.u.int(Math.random, B.kill.min, B.kill.max); b.glucose = b.need * B.glucose.kill; }
      else if (kind === 'answer') { b.system = DD.u.pick(Math.random, sysTargets()); b.need = DD.u.int(Math.random, B.answer.min, B.answer.max); b.glucose = b.need * B.glucose.answer; }
      else { b.region = DD.u.pick(Math.random, playable()).id; b.need = 1; b.glucose = B.glucose.clear; }
      if (have.has(key(b)) && tries < 19) continue;
      b.item = DD.u.pick(Math.random, B.items);
      return b;
    }
    return null;
  }
  // Keep three bounties active. Returns true if any were added.
  out.fill = function () {
    let added = false;
    while (bs().active.length < B.active) { const b = make(); if (!b) break; bs().active.push(b); added = true; }
    return added;
  };
  out.text = function (b) {
    const rn = b.region && DD.data.region(b.region);
    if (b.kind === 'kill') return 'Defeat ' + b.need + ' ' + TYPE_PL[b.type] + ' in the ' + rn.name;
    if (b.kind === 'answer') return 'Answer ' + b.need + ' ' + SYS_NAME(b.system) + ' questions correctly';
    return 'Clear the ' + rn.name + ' (defeat its boss)';
  };
  out.reward = b => b.glucose + ' glucose + ' + DD.data.items[b.item].name;
  function bump(pred, n) {
    let hit = false;
    for (const b of bs().active) if (!b.done && pred(b)) { b.have = Math.min(b.need, b.have + (n || 1)); if (b.have >= b.need) b.done = true; hit = true; }
    return hit;
  }
  out.onKill = (e, regionId) => bump(b => b.kind === 'kill' && b.region === regionId && b.type === e.type && !e.boss);
  out.onAnswer = (system, correct) => correct && bump(b => b.kind === 'answer' && b.system === system);
  out.onClear = regionId => bump(b => b.kind === 'clear' && b.region === regionId);
  out.claim = function (id) {
    const i = bs().active.findIndex(b => b.id === id), b = bs().active[i]; if (!b || !b.done) return null;
    bs().active.splice(i, 1); bs().done++;
    prof().glucose += b.glucose; prof().inventory[b.item] = (prof().inventory[b.item] || 0) + 1;
    out.fill(); DD.save.save();
    return b;
  };
  return out;
})();

// ---------- thymus milestones ----------
// At levels 5, 10 and 15 the player claims one upgrade for the current class's active: -25% ATP cost, +1 turn (timed actives) or
// +25% effect (the rest), or an extra charge (one-shot actives that have charges). Stored per class as profile.milestones.
DD.thymus = (function () {
  const T = DD.S.thymus, prof = () => DD.save.profile;
  const out = { levels: T.levels };
  const pct = x => Math.round(x * 100);
  const r2 = x => Math.round(x * 100) / 100;

  out.picks = (classId) => prof().milestones.filter(m => m.classId === classId);
  out.claimed = (classId, level) => out.picks(classId).find(m => m.level === level) || null;
  out.available = (classId, level) => level <= prof().level && !out.claimed(classId, level);
  out.pending = classId => T.levels.filter(l => out.available(classId, l)).length;

  const timed = a => (a.effect && a.effect.turns != null) || (a.cast && a.cast.turns != null);
  out.options = function (a) {
    const o = [['cost', 'Cheaper']];
    o.push(['boost', timed(a) ? 'Longer' : 'Stronger']);
    if (a.effect && a.effect.charges != null) o.push(['charge', 'Extra charge']);
    return o;
  };
  // Returns a copy of the active with the given picks applied (the original data is never changed).
  function apply(a, picks) {
    const n = k => picks.filter(p => p === k).length, o = Object.assign({}, a);
    if (!picks.length) return o;
    if (a.effect) o.effect = Object.assign({}, a.effect, { result: Object.assign({}, a.effect.result) });
    if (a.cast) o.cast = Object.assign({}, a.cast);
    const notes = [];
    if (n('cost')) { o.cost = Math.max(1, Math.round(a.cost * Math.pow(1 - T.costCut, n('cost')))); notes.push('costs ' + o.cost + ' ATP'); }
    const b = n('boost');
    if (b) {
      const f = Math.pow(1 + T.effectPct, b);
      switch (a.id) {
        case 'suppress': o.cast.turns = a.cast.turns + b * T.extraTurns; o.armedText = 'enemy loses its next ' + o.cast.turns + ' moves'; notes.push('skips ' + o.cast.turns + ' moves'); break;
        case 'opsonize': o.effect.turns = a.effect.turns + b * T.extraTurns; o.armedText = 'enemy takes ×' + a.effect.result.mult + ' for ' + o.effect.turns + ' turns'; notes.push('lasts ' + o.effect.turns + ' turns'); break;
        case 'degranulate': o.cast.turns = a.cast.turns + b * T.extraTurns; o.armedText = 'poisoned for ' + o.cast.turns + ' turns'; notes.push('lasts ' + o.cast.turns + ' turns'); break;
        case 'inflammation': o.cast.turns = a.cast.turns + b * T.extraTurns; o.armedText = 'neutrophil ally joins for ' + o.cast.turns + ' turns'; notes.push('lasts ' + o.cast.turns + ' turns'); break;
        case 'netosis': { const m = r2(a.effect.result.mult * f); o.effect.result.mult = m; o.effect.label = 'NETosis: next heavy ×' + m; o.armedText = 'next heavy ×' + m; notes.push('next heavy ×' + m); break; }
        case 'apoptosis': { const t = Math.min(0.9, a.effect.result.threshold * f), p = pct(t); o.effect.result.threshold = t; o.effect.label = 'Apoptosis armed: executes under ' + p + '% HP'; o.armedText = 'next correct heavy executes under ' + p + '% HP'; notes.push('executes under ' + p + '% HP'); break; }
        case 'antigen': { const k = Math.round(a.effect.result.n * f); o.effect.result.n = k; o.effect.label = 'Antigen Presentation: next question loses ' + k + ' wrong options'; o.armedText = 'next question loses ' + k + ' wrong options'; notes.push('removes ' + k + ' wrong options'); break; }
        default: break;
      }
    }
    if (n('charge') && o.effect && o.effect.charges != null) { o.effect.charges = a.effect.charges + n('charge') * T.extraCharges; o.armedText = (o.armedText || a.armedText) + ' (' + o.effect.charges + ' uses)'; notes.push(o.effect.charges + ' charges'); }
    o.desc = a.desc + ' Thymus upgrades: ' + notes.join(', ') + '.';
    return o;
  }
  const subOf = (profile, id) => { const s = DD.data.subclassById[profile.subclass && profile.subclass[id]]; return s && s.classId === id ? s : null; };
  // The class active with the chosen subclass applied (5a), before milestone picks.
  out.base = function (classId, profile) { return DD.sub.applyActive(DD.data.classes[classId].active, subOf(profile || prof(), classId)); };
  // Plasma Cell (5a) trims every active's ATP cost, after the milestone cost cuts.
  function finalize(a, profile, id) {
    const m = DD.fx.ruleMin(Object.assign({}, profile, { classId: id }), 'atpCost', 1);
    return m < 1 ? Object.assign({}, a, { cost: Math.max(1, Math.round(a.cost * m)) }) : a;
  }
  out.active = function (profile, classId) {
    const id = classId || profile.classId;
    return finalize(apply(out.base(id, profile), profile.milestones.filter(m => m.classId === id).map(m => m.pick)), profile, id);
  };
  // The class record combat reads, with the subclass and upgraded active swapped in.
  out.cls = function (profile) {
    const cls = DD.data.classes[profile.classId], sub = subOf(profile, profile.classId);
    return Object.assign({}, cls, { active: out.active(profile), passive: sub && sub.passive ? sub.passive : cls.passive });
  };
  // Short description of what a pick would do right now.
  out.describe = function (classId, pick) {
    const base = out.base(classId), cur = out.active(prof(), classId), picks = out.picks(classId).map(m => m.pick), nxt = finalize(apply(base, picks.concat(pick)), prof(), classId), id = base.id;
    if (pick === 'cost') return '−' + pct(T.costCut) + '% ATP cost (' + cur.cost + ' → ' + nxt.cost + ')';
    if (pick === 'charge') return '+' + T.extraCharges + ' charge (' + (cur.effect ? cur.effect.charges : 1) + ' → ' + (nxt.effect ? nxt.effect.charges : 2) + ' uses per cast)';
    if (timed(base)) { const c = cur.effect || cur.cast, x = nxt.effect || nxt.cast; return '+' + T.extraTurns + ' turn of duration (' + c.turns + ' → ' + x.turns + ' turns)'; }
    const eff = { netosis: [cur.effect && cur.effect.result.mult, nxt.effect && nxt.effect.result.mult, '×', '×'], antigen: [cur.effect && cur.effect.result.n, nxt.effect && nxt.effect.result.n, '', ' wrong options removed'] };
    if (id === 'apoptosis') return '+' + pct(T.effectPct) + '% effect (executes under ' + pct(cur.effect.result.threshold) + '% → ' + pct(nxt.effect.result.threshold) + '% HP)';
    const e = eff[id] || [];
    return '+' + pct(T.effectPct) + '% effect (' + (e[2] || '') + e[0] + (e[3] === '×' ? '' : e[3] || '') + ' → ' + (e[2] || '') + e[1] + (e[3] === '×' ? '' : e[3] || '') + ')';
  };
  out.claim = function (classId, level, pick) {
    if (!out.available(classId, level) || !out.options(out.base(classId)).some(o => o[0] === pick)) return false;
    prof().milestones.push({ classId, level, pick }); DD.save.save(); return true;
  };
  return out;
})();
