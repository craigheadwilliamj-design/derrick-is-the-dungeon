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
      killed: 0, glucose: 0, miss: [], px: 0, py: 0, floor: null };
    G.msgs = [];
    G.loadFloor(0);
  };
  G.loadFloor = function (idx, saved) {
    const run = G.run, boss = idx === S.floorsPerDungeon - 1;
    run.floorIdx = idx;
    if (!saved) run.genLevel = prof().level;
    const f = DD.dungeon.generate({ regionId: run.regionId, floorIdx: idx, boss, seed: (run.seed + idx * 7919) >>> 0, playerLevel: run.genLevel });
    run.floor = f;
    if (saved) {
      saved.explored.split('').forEach((c, i) => { f.explored[i] = c === '1' ? 1 : 0; });
      saved.en.forEach((s, i) => { const e = f.enemies[i]; if (e) { e.x = s[0]; e.y = s[1]; e.alive = !!s[2]; } });
      saved.taken.forEach(i => { if (f.pickups[i]) f.pickups[i].taken = true; });
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
    const f = r.floor;
    DD.save.saveRun({ v: 1, regionId: r.regionId, seed: r.seed, floorIdx: r.floorIdx, genLevel: r.genLevel, hp: r.hp, atp: r.atp,
      killed: r.killed, glucose: r.glucose, miss: r.miss, px: r.px, py: r.py, bossDead: f.bossDead,
      explored: Array.from(f.explored).join(''), en: f.enemies.map(e => [e.x, e.y, e.alive ? 1 : 0]),
      taken: f.pickups.map((p, i) => p.taken ? i : -1).filter(i => i >= 0) });
  };
  G.resume = function (saved) {
    G.run = { v: 1, regionId: saved.regionId, seed: saved.seed, floorIdx: saved.floorIdx, genLevel: saved.genLevel, hp: saved.hp, atp: saved.atp,
      killed: saved.killed || 0, glucose: saved.glucose || 0, miss: saved.miss || [], px: 0, py: 0, floor: null };
    G.msgs = []; G.loadFloor(saved.floorIdx, saved);
    G.say('You pick up where you left off.');
  };
  G.abandon = function () { G.run = null; G.combat = null; DD.save.saveRun(null); };

  G.move = function (dx, dy) {
    const run = G.run; if (!run || G.combat || DD.ui.mode !== 'map') return;
    const f = run.floor, nx = run.px + dx, ny = run.py + dy;
    if (!DD.dungeon.walk(f, nx, ny)) return;
    const foe = DD.dungeon.enemyAt(f, nx, ny);
    if (foe) return G.startCombat(foe);
    run.px = nx; run.py = ny;
    const p = f.pickups.find(q => !q.taken && q.x === nx && q.y === ny);
    if (p) { p.taken = true; run.glucose++; prof().glucose++; G.say('You absorb a glucose.'); }
    const t = f.g[ny][nx];
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
    const summary = { region: DD.data.region(run.regionId), killed: run.killed, glucose: run.glucose, missed: run.miss.length };
    G.run = null; DD.save.saveRun(null); DD.save.save();
    DD.ui.showCleared(summary);
  };

  G.startCombat = function (enemy) {
    G.combat = DD.combat.create(G.run, enemy);
    DD.ui.openCombat();
  };
  G.endCombat = function () {
    const C = G.combat, run = G.run; G.combat = null;
    if (C.over === 'lose') {
      const info = { by: C.enemy.name, region: DD.data.region(run.regionId), miss: run.miss.length };
      G.run = null; DD.save.saveRun(null); DD.save.save();
      return DD.ui.showDeath(info);
    }
    const e = C.enemy, x = S.enemy.xp;
    e.alive = false; run.killed++;
    const gain = Math.round((x.base + x.perLevel * e.lvl) * (e.boss ? x.bossMult : 1));
    prof().xp += gain;
    G.say(e.name + ' destroyed. +' + gain + ' XP.');
    let st = G.stats();
    while (prof().xp >= st.xpToNext) {
      prof().xp -= st.xpToNext; prof().level++;
      const before = st.maxHP; st = G.stats();
      run.hp = Math.min(st.maxHP, run.hp + (st.maxHP - before) + Math.round(st.maxHP * S.stats.levelUpHealPct));
      run.atp = Math.min(st.maxATP, run.atp + 0);
      G.say('Level up! You are now level ' + prof().level + '.');
    }
    if (e.boss) {
      run.floor.bossDead = true;
      run.floor.g[run.floor.exit.y][run.floor.exit.x] = '>';
      G.say('The boss is down. The exit (>) has opened.');
    }
    DD.save.save(); G.persist();
    DD.ui.closeCombat();
  };
  return G;
})();
