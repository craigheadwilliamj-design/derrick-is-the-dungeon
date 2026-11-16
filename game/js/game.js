// Run lifecycle: start/resume a dungeon, movement, floors, combat hand-off, leveling, run save.
DD.game = (function () {
  const S = DD.S;
  const G = { run: null, combat: null, msgs: [] };
  const prof = () => DD.save.profile;

  G.say = function (t) { G.msgs.push(t); while (G.msgs.length > 12) G.msgs.shift(); };
  G.stats = () => DD.stats.compute(prof());

  G.newRun = function (regionId) {
    const st = G.stats();
    G.run = { v: 1, regionId, seed: (Math.random() * 2147483647) >>> 0, floorIdx: 0, genLevel: prof().level, hp: st.maxHP, atp: st.maxATP,
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
    DD.save.saveRun({ v: 1, regionId: r.regionId, seed: r.seed, floorIdx: r.floorIdx, genLevel: r.genLevel, hp: r.hp, atp: r.atp,
      killed: r.killed, glucose: r.glucose, miss: r.miss, px: r.px, py: r.py, bossDead: f.bossDead, gm: r.gm,
      explored: Array.from(f.explored).join(''), en: f.enemies.map(e => [e.x, e.y, e.alive ? 1 : 0]),
      taken: f.pickups.map((p, i) => p.taken ? i : -1).filter(i => i >= 0), traps: f.traps.map(t => t.state), chests: f.chests.map((c, i) => c.taken ? i : -1).filter(i => i >= 0), npcs: DD.npc.saveState(f) });
  };
  G.resume = function (saved) {
    G.run = { v: 1, regionId: saved.regionId, seed: saved.seed, floorIdx: saved.floorIdx, genLevel: saved.genLevel, hp: saved.hp, atp: saved.atp,
      killed: saved.killed || 0, glucose: saved.glucose || 0, miss: saved.miss || [], px: 0, py: 0, floor: null, gm: saved.gm || undefined };
    const st = G.stats(); G.run.hp = Math.min(G.run.hp, st.maxHP); G.run.atp = Math.min(G.run.atp, st.maxATP);
    G.msgs = []; G.loadFloor(saved.floorIdx, saved);
    G.say('You pick up where you left off.');
  };
  G.abandon = function () { G.run = null; G.combat = null; DD.save.saveRun(null); };

  G.move = function (dx, dy) {
    const run = G.run; if (!run || G.combat || DD.ui.mode !== 'map') return;
    if (run.trip) return DD.travel.move(dx, dy);
    const f = run.floor, nx = run.px + dx, ny = run.py + dy;
    if (!DD.dungeon.walk(f, nx, ny)) return;
    const foe = DD.dungeon.enemyAt(f, nx, ny);
    if (foe) return G.startCombat(foe);
    const npc = DD.npc.at(f, nx, ny);
    if (npc) return DD.npc.open(npc); // bump into a cell to talk to it
    run.px = nx; run.py = ny;
    const p = f.pickups.find(q => !q.taken && q.x === nx && q.y === ny);
    if (p) {
      const E = S.economy.pickup, v = DD.derrick.loot(DD.u.int(Math.random, E.min, E.max), run.regionId);
      p.taken = true; run.glucose += v; prof().glucose += v; G.say('You absorb ' + v + ' glucose.');
    }
    const chest = f.chests.find(c => !c.taken && c.x === nx && c.y === ny);
    if (chest) DD.gear.openChest(chest);
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
    r.cleared = true;
    const summary = { region: DD.data.region(run.regionId), killed: run.killed, glucose: run.glucose, missed: run.miss.length, legendary: run.legend || null };
    G.run = null; DD.save.saveRun(null); DD.save.save();
    DD.ui.showCleared(summary);
  };

  // Death: half the carried glucose is lost (rounded down), the run and its dungeon are gone, everything else stays.
  G.die = function (C) {
    const run = G.run, lost = Math.floor(prof().glucose * S.economy.deathLossPct);
    prof().glucose -= lost;
    const info = { by: C.enemy.name, region: DD.data.region(run.regionId), missIds: run.miss.slice(), lost, kept: prof().glucose, killed: run.killed, trip: !!run.trip };
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
  G.gainXp = function (n) {
    const run = G.run;
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
      Q.dmg = Math.max(1, Math.round(G.stats().maxHP * TR.dmgPct) + TR.dmgPerLevel * prof().level);
      run.hp = Math.max(0, run.hp - Q.dmg); Q.msg = 'The trap hits you for ' + Q.dmg + '.';
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

  G.startCombat = function (enemy) {
    G.combat = DD.combat.create(G.run, enemy);
    DD.ui.openCombat();
  };
  G.endCombat = function () {
    const C = G.combat, run = G.run; G.combat = null;
    if (C.drill) return DD.ui.review(); // practice drill: nothing else changes
    if (C.over === 'lose') return G.die(C);
    if (C.over === 'flee') { // Lymph Drain: the run stays saved, the pathogen resets, and you wash up in the town
      C.enemy.hp = C.enemy.maxHP;
      const town = DD.world.townFor(run.regionId) || 'cervical';
      prof().loc = town;
      DD.save.save(); G.persist(); DD.ui.stopMap();
      return DD.ui.town({ fled: true, id: town, via: 'lymph' });
    }
    const e = C.enemy, x = S.enemy.xp;
    e.alive = false; run.killed++;
    if (!prof().beaten.includes(e.defId)) prof().beaten.push(e.defId); // B Cell Memory
    const gain = Math.round((x.base + x.perLevel * e.lvl) * (e.boss ? x.bossMult : 1));
    G.say(e.name + ' destroyed. +' + gain + ' XP.');
    G.gainXp(gain);
    if (run.trip) DD.travel.afterKill();
    if (!run.trip) DD.bounty.onKill(e, run.regionId);
    if (e.boss) {
      DD.npc.markCleared(run.regionId); DD.bounty.onClear(run.regionId); // the region counts as cleared as soon as its boss falls
      const L = DD.npc.legendary(e.defId);
      if (L) { run.legend = L.name; G.say('Legendary drop: ' + L.name + '! It is in your gear bag.'); }
      run.floor.bossDead = true;
      run.floor.g[run.floor.exit.y][run.floor.exit.x] = '>';
      G.say('The boss is down. The exit (>) has opened.');
    }
    DD.save.save(); G.persist();
    DD.ui.closeCombat();
  };
  return G;
})();
