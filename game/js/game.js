// Run lifecycle: start/resume a dungeon, movement, floors, combat hand-off, leveling, run save.
DD.game = (function () {
  const S = DD.S;
  const G = { run: null, combat: null, msgs: [] };
  const prof = () => DD.save.profile;

  G.say = function (t) { G.msgs.push(t); while (G.msgs.length > 12) G.msgs.shift(); };
  G.stats = () => DD.stats.compute(prof());

  G.resources = function () {
    const p = prof(); DD.gear.prepare(p); const st = G.stats();
    p.hp = Number.isFinite(p.hp) ? Math.max(1, Math.min(p.hp, st.maxHP)) : st.maxHP;
    p.atp = Number.isFinite(p.atp) ? Math.max(0, Math.min(p.atp, st.maxATP)) : st.maxATP;
    return p;
  };
  G.syncResources = function (r) { if (r && !r.drill) { prof().hp = r.hp; prof().atp = r.atp; } };
  G.earnings = function () { const r = G.run; return r ? (r.earned || (r.earned = { xp: 0, glucose: 0, gear: [], items: {}, kills: [] })) : null; };
  G.reward = function (kind, value, amount = 1) {
    const e = G.earnings();
    if (!e) return;
    if (kind === 'gear') e.gear.push(value);
    else if (kind === 'item') e.items[value] = (e.items[value] || 0) + amount;
    else e[kind] += value;
  };
  G.consumeItem = function (id) {
    const e = G.earnings();
    if (e && e.items[id] > 0) { if (--e.items[id] === 0) delete e.items[id]; }
    else if (--prof().inventory[id] <= 0) delete prof().inventory[id];
  };
  // Don't-Eat-Me Shroud (once per expedition), then a carried Defibrillator. Returns a log line if you were saved.
  G.rescue = function (run, maxHP) {
    if (!run || run.hp > 0) return '';
    if (DD.gear.perks(prof()).cheatDeath && !run.shroud) { run.shroud = 1; run.hp = 1; return 'Don’t-Eat-Me Shroud: the killing blow leaves you at 1 HP.'; }
    if (DD.combat.count('defib') > 0) { G.consumeItem('defib'); run.hp = Math.max(1, Math.round(maxHP * S.items.defib.revivePct)); return DD.data.items.defib.use.msg; }
    return '';
  };
  G.settle = function (keep, reason = 'flee') {
    const r = G.run; if (!r) return;
    G.syncResources(r);
    const e = r.earned;
    if(!keep&&e){
      const perks=DD.gear.perks(prof());
      if(reason==='death')G.gainXp(Math.floor(e.xp*(perks.deathXP||0)),true);
      else{prof().glucose+=Math.floor(e.glucose*(perks.fleeGlucose||0));if(perks.keepGear)prof().gearBag.push(...e.gear);}
      DD.gear.forfeitWorn(e,reason!=='death'&&perks.keepGear);
    }
    if (keep && e) {
      prof().glucose += e.glucose;
      prof().gearBag.push(...e.gear);
      for (const [id, n] of Object.entries(e.items)) prof().inventory[id] = Math.min(DD.data.items[id].cap || Infinity, (prof().inventory[id] || 0) + n);
      G.gainXp(e.xp, true);
      for (const foe of e.kills) {
        if (!prof().beaten.includes(foe.defId)) prof().beaten.push(foe.defId);
        if (!r.trip) DD.bounty.onKill(foe, r.regionId);
      }
      if (r.bossWon) { DD.npc.markCleared(r.regionId); DD.bounty.onClear(r.regionId); }
    }
    r.earned = null; G.syncResources(r); DD.save.save();
  };
  G.newRun = function (regionId) {
    const st = G.stats(), resources = G.resources();
    G.run = { v: 1, regionId, seed: (Math.random() * 2147483647) >>> 0, floorIdx: 0, genLevel: prof().level, hp: resources.hp, atp: resources.atp,
      killed: 0, glucose: 0, miss: [], px: 0, py: 0, floor: null, gm: DD.derrick.genMods(regionId) };
    G.msgs = [];
    G.loadFloor(0);
  };
  G.loadFloor = function (idx, saved) {
    const run = G.run, boss = idx === S.floorsPerDungeon - 1;
    run.floorIdx = idx;
    if (!saved) run.genLevel = prof().level;
    const f = DD.dungeon.generate({ regionId: run.regionId, floorIdx: idx, boss, seed: (run.seed + idx * 7919) >>> 0, playerLevel: run.genLevel, gm: run.gm });
    run.floor = f;
    if (saved) {
      saved.explored.split('').forEach((c, i) => { f.explored[i] = c === '1' ? 1 : 0; });
      saved.en.forEach((s, i) => { const e = f.enemies[i]; if (e) { e.x = s[0]; e.y = s[1]; e.alive = !!s[2]; } });
      saved.taken.forEach(i => { if (f.pickups[i]) f.pickups[i].taken = true; });
      (saved.traps || []).forEach((s, i) => { if (f.traps[i]) f.traps[i].state = s; });
      (saved.chests || []).forEach(i => { if (f.chests[i]) f.chests[i].taken = true; });
      (saved.rests || []).forEach(i => { if (f.rests && f.rests[i]) f.rests[i].taken = true; });
      DD.npc.loadState(f, saved.npcs);
      f.bossDead = !!saved.bossDead;
      if (f.bossDead && f.exit) f.g[f.exit.y][f.exit.x] = '>';
      run.px = saved.px; run.py = saved.py;
    } else { run.px = f.start.x; run.py = f.start.y; }
    DD.dungeon.computeFov(f, run.px, run.py);
    if (!saved) {
      G.say(boss ? 'Boss floor. Something large waits at the far end.' : 'Floor ' + (idx + 1) + ' of ' + S.floorsPerDungeon + '. Find the stairs (>).');
      G.persist();
    }
  };
  G.persist = function () {
    const r = G.run; if (!r) return;
    if (r.trip) return DD.travel.persist();
    const f = r.floor;
    G.syncResources(r); DD.save.save();
    DD.save.saveRun({ v: 1, regionId: r.regionId, seed: r.seed, floorIdx: r.floorIdx, genLevel: r.genLevel, hp: r.hp, atp: r.atp,
      earned: r.earned, bossWon: r.bossWon, shroud: r.shroud, cheats: r.cheats, battle: G.combat && !G.combat.drill ? DD.combat.snapshot(G.combat) : null, killed: r.killed, glucose: r.glucose, miss: r.miss, px: r.px, py: r.py, bossDead: f.bossDead, gm: r.gm,
      explored: Array.from(f.explored).join(''), en: f.enemies.map(e => [e.x, e.y, e.alive ? 1 : 0]),
      taken: f.pickups.map((p, i) => p.taken ? i : -1).filter(i => i >= 0), traps: f.traps.map(t => t.state), chests: f.chests.map((c, i) => c.taken ? i : -1).filter(i => i >= 0), rests: (f.rests || []).map((c, i) => c.taken ? i : -1).filter(i => i >= 0), npcs: DD.npc.saveState(f) });
  };
  G.resume = function (saved) {
    G.run = { v: 1, regionId: saved.regionId, seed: saved.seed, floorIdx: saved.floorIdx, genLevel: saved.genLevel, hp: saved.hp, atp: saved.atp,
      earned: saved.earned, bossWon: saved.bossWon, shroud: saved.shroud, cheats: saved.cheats, killed: saved.killed || 0, glucose: saved.glucose || 0, miss: saved.miss || [], px: 0, py: 0, floor: null, gm: saved.gm || undefined };
    const st = G.stats(); G.run.hp = Math.min(G.run.hp, st.maxHP); G.run.atp = Math.min(G.run.atp, st.maxATP);
    G.msgs = []; G.loadFloor(saved.floorIdx, saved);
    if (saved.battle) G.combat = DD.combat.create(G.run, null, { saved: saved.battle });
    G.say('You pick up where you left off.');
  };
  G.abandon = function () { if (!G.run && DD.save.run && !DD.save.run.kind) G.resume(DD.save.run); G.settle(false); G.run = null; G.combat = null; DD.save.saveRun(null); };

  G.move = function (dx, dy) {
    const run = G.run; if (!run || G.combat || DD.ui.mode !== 'map') return;
    if (run.trip) return DD.travel.move(dx, dy);
    const f = run.floor, nx = run.px + dx, ny = run.py + dy;
    if (!DD.dungeon.walk(f, nx, ny)) return;
    const foe = DD.dungeon.enemyAt(f, nx, ny);
    if (foe) return G.startCombat(foe, { firstStrike: true });
    const npc = DD.npc.at(f, nx, ny);
    if (npc) return DD.npc.open(npc); // bump into a cell to talk to it
    run.px = nx; run.py = ny;
    const p = f.pickups.find(q => !q.taken && q.x === nx && q.y === ny);
    if (p) {
      const E = S.economy.pickup, v = DD.derrick.loot(DD.u.int(Math.random, E.min, E.max), run.regionId);
      p.taken = true; run.glucose += v; G.reward('glucose', v); G.say('You absorb ' + v + ' glucose.');
    }
    const chest = f.chests.find(c => !c.taken && c.x === nx && c.y === ny);
    if (chest) DD.gear.openChest(chest);
    const rest = (f.rests || []).find(c => !c.taken && c.x === nx && c.y === ny);
    if (rest) {
      const st = G.stats(), R = S.rpg.rest, hp0 = run.hp, atp0 = run.atp;
      run.hp = Math.min(st.maxHP, run.hp + Math.round(st.maxHP * R.hp * DD.derrick.healMult())); run.atp = Math.min(st.maxATP, run.atp + Math.round(st.maxATP * R.atp));
      rest.taken = true; G.say('You rest in a quiet pocket of tissue fluid: +' + (run.hp - hp0) + ' HP, +' + (run.atp - atp0) + ' ATP.');
    }
    const t = f.g[ny][nx];
    const trap = f.traps.find(q => q.state === 0 && q.x === nx && q.y === ny);
    if (trap) { DD.dungeon.computeFov(f, nx, ny); DD.ui.refreshMap(); return G.springTrap(trap); }
    if (t === '>') return G.takeStairs();
    DD.dungeon.computeFov(f, nx, ny);
    const eng = DD.dungeon.enemiesAct(f, nx, ny);
    DD.ui.refreshMap();
    if (eng) { G.say(eng.name + ' lunges at you!'); G.startCombat(eng); }
  };
  G.takeStairs = function () {
    const run = G.run, f = run.floor;
    if (f.boss) return G.clearDungeon();
    G.loadFloor(run.floorIdx + 1);
    DD.ui.refreshMap();
  };
  G.clearDungeon = function () {
    const run = G.run, r = prof().regions[run.regionId] || (prof().regions[run.regionId] = { lastReviewed: 0, cleared: false, recent: [] });
    G.settle(true); r.cleared = true;
    const summary = { region: DD.data.region(run.regionId), killed: run.killed, glucose: run.glucose, missed: run.miss.length, legendary: run.legend || null };
    G.run = null; DD.save.saveRun(null); DD.save.save();
    DD.ui.showCleared(summary);
  };

  // Death: half the carried glucose is lost (rounded down), the run and its dungeon are gone, everything else stays.
  G.die = function (C) {
    const run = G.run; G.settle(false,'death');
    const lost = Math.floor(prof().glucose * S.economy.deathLossPct);
    prof().glucose -= lost;
    const info = { by: C.enemy.name, region: DD.data.region(run.regionId), missIds: run.miss.slice(), lost, kept: prof().glucose, killed: run.killed, trip: !!run.trip };
    prof().hp = G.stats().maxHP; prof().atp = G.stats().maxATP;
    prof().loc = 'marrow'; // you re-form in the marrow
    G.run = null; DD.save.saveRun(null); DD.save.save();
    DD.ui.showDeath(info);
  };
  // Practice fight against a training dummy using only these question ids. Never touches the live run.
  G.startDrill = function (ids) {
    const st = G.stats(), dummy = { uid: 'dummy', defId: 'dummy', name: 'Training Dummy', type: 'straw', glyph: 'T', boss: false, lvl: 1, atk: 0, def: 0,
      hp: ids.length, maxHP: ids.length, x: 0, y: 0, alive: true, codex: 'Straw and sandbags. It has never infected anyone.' };
    const pseudo = { v: 1, regionId: 'marrow', hp: st.maxHP, atp: st.maxATP, miss: [], glucose: 0, killed: 0, drill: true };
    G.combat = DD.combat.create(pseudo, dummy, { drill: ids });
    DD.ui.drill();
  };
  G.endDrill = function () { G.combat = null; DD.ui.review(); };

  // XP and level-ups for the live run (combat kills and pop quizzes).
  G.gainXp = function (n, immediate) {
    const run = G.run;
    if (run && !immediate) { G.reward('xp', n); return; }
    prof().xp += n;
    let st = G.stats();
    while (prof().xp >= st.xpToNext) {
      prof().xp -= st.xpToNext; prof().level++;
      const before = st.maxHP; st = G.stats();
      run.hp = Math.min(st.maxHP, run.hp + (st.maxHP - before) + Math.round(st.maxHP * S.stats.levelUpHealPct));
      G.say('Level up! You are now level ' + prof().level + '.');
    }
  };

  // Pop quiz traps (dungeon floors and vessels). Wrong = 10% max HP + level; right = disarmed + 5 XP. Either way the trap is spent and stays visible.
  G.springTrap = function (trap) {
    const run = G.run, systems = run.trip ? run.systems : DD.data.region(run.regionId).systems, q = DD.q.pick(systems);
    G.quiz = { trap, q, opts: DD.q.options(q, 0), answer: null };
    G.say('You trigger a trap: ' + trap.name + '!');
    DD.ui.popQuiz();
  };
  G.answerTrap = function (i) {
    const Q = G.quiz, run = G.run; if (!Q || Q.answer) return;
    const o = Q.opts[i]; if (!o) return;
    const ok = o.correct, TR = S.travel.trap;
    DD.q.record(Q.q, ok, run.trip ? DD.q.regionOf(Q.q) : run.regionId);
    Q.answer = { i, ok };
    if (ok) { Q.trap.state = 2; Q.msg = 'Disarmed. +' + TR.xp + ' XP.'; G.gainXp(TR.xp); }
    else {
      Q.trap.state = 1;
      if (!run.miss.includes(Q.q.id)) run.miss.push(Q.q.id);
      Q.dmg = Math.max(1, Math.round((Math.round(G.stats().maxHP * TR.dmgPct) + TR.dmgPerLevel * prof().level) * (1 - (DD.gear.perks(prof()).trapCut || 0))));
      run.hp = Math.max(0, run.hp - Q.dmg); Q.msg = 'The trap hits you for ' + Q.dmg + '.';
      const saved = G.rescue(run, G.stats().maxHP); if (saved) Q.msg += ' ' + saved;
    }
    G.say(Q.msg);
    DD.save.save(); G.persist();
    DD.ui.popQuiz();
  };
  G.endTrap = function () {
    const run = G.run, name = G.quiz.trap.name; G.quiz = null;
    if (run.hp <= 0) return G.die({ enemy: { name: 'a trap (' + name + ')' } });
    DD.ui.closeQuiz();
  };

  G.startCombat = function (enemy, opts) {
    G.combat = DD.combat.create(G.run, enemy, opts);
    G.persist(); DD.ui.openCombat();
  };
  G.endCombat = function () {
    const C = G.combat, run = G.run; if (!C || C.phase !== 'end') return;
    G.combat = null;
    if (C.drill) return DD.ui.review();
    if (C.over === 'lose') return G.die(C);
    if (C.over === 'flee' || C.over === 'return') {
      const town = DD.world.townFor(run.regionId) || 'cervical';
      G.settle(C.over === 'return');
      if (C.over === 'return') prof().loc = town;
      else if (run.trip) prof().loc = run.trip.from;
      G.run = null; DD.save.saveRun(null); DD.save.save(); DD.ui.stopMap();
      return C.over === 'return' ? DD.ui.town({ id: town, via: 'lymph' }) : DD.ui.menu();
    }
    const anchor = run.floor.enemies.find(e => e.uid === C.anchorUid); if (anchor) anchor.alive = false;
    for (const e of C.enemies) {
      const x = S.enemy.xp, gain = Math.round((x.base + x.perLevel * e.lvl) * (e.boss ? x.bossMult : 1));
      const D = S.economy.drop, glucose = DD.derrick.loot(e.boss ? D.boss : Math.round(DD.u.int(Math.random, D.min, D.max) * (1 + D.perLevel * e.lvl)), run.regionId);
      run.killed++; run.glucose += glucose; G.reward('glucose', glucose); G.gainXp(gain);
      G.earnings().kills.push({ defId: e.defId, type: e.type, boss: e.boss });
      G.say(e.name + ' defeated. ' + gain + ' XP and ' + glucose + ' glucose held until return.');
      if (e.boss) {
        const L = DD.npc.legendary(e.defId);
        if (L) { run.legend = L.name; G.say('Found ' + L.name + '. You can wear it now; return safely to keep it.'); }
        const DF = S.items.defib; if (Math.random() < DF.bossChance && DD.combat.count('defib') < DF.cap) { G.reward('item', 'defib'); G.say('Found a Defibrillator.'); }
        run.bossWon = true; run.floor.bossDead = true;
        run.floor.g[run.floor.exit.y][run.floor.exit.x] = '>';
      }
    }
    if (run.trip) DD.travel.afterKill();
    DD.save.save(); G.persist(); DD.ui.closeCombat();
  };
  return G;
})();
