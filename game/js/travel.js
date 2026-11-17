// Walkable segments and the trip state machine. A trip is a run (DD.game.run) with run.trip set, so combat, HUD and
// rendering are shared with dungeons. Vessels are corridors, chambers are rooms, valves are one-way doors.
DD.travel = (function () {
  const S = DD.S, T = S.travel, { el } = DD.u;
  const X = {};
  const prof = () => DD.save.profile;
  const G = () => DD.game;

  // Tiles: # wall, . lumen, > exit column, % clot, = plaque, » valve (one-way), | closed valve.
  const BLOCK = '#%=|';
  const rngFor = (seed, idx) => DD.rng((seed + idx * 7919) >>> 0);
  const accentFor = n => n.kind === 'vessel' ? T.accent[n.flow] : n.kind === 'lymph' ? T.accent.lymph : n.sub === 'nodeRoom' ? T.accent.nodeRoom : T.accent[n.kind];
  X.accentFor = accentFor;

  function blank(W, H) {
    return { W, H, g: Array.from({ length: H }, () => Array(W).fill('#')), rooms: [], enemies: [], pickups: [], traps: [], stairs: null, exit: null,
      boss: false, bossDead: false, explored: new Uint8Array(W * H), vis: new Uint8Array(W * H) };
  }
  const lumenRows = (cx, half) => { const a = []; for (let y = cx - half; y <= cx + half; y++) a.push(y); return a; };

  // A vessel (or lymph vessel): a band of lumen that drifts up and down, with optional clot, plaque and valve.
  function genVessel(n, r) {
    const lymph = n.kind === 'lymph', half = ((lymph ? T.lumen.lymph : T.lumen.vessel) - 1) / 2;
    const L = Math.max(14, Math.round((lymph ? T.len.lymph : T.len.vessel) * (n.lenMul || 1)));
    return bandSegment(n, r, L, half);
  }
  function bandSegment(n, r, L, half, o) {
    o = o || {};
    const f = blank(L + 2, T.h), mid = T.h >> 1, cx = [];
    // plaque needs a straight stretch, so decide it first and keep the lumen from bending there
    const plq = n.kind === 'vessel' && n.flow === 'artery' && r() < T.hazard.plaque * DD.derrick.hazardMult() ? DD.u.int(r, 6, Math.max(6, L - 6 - T.plaqueLen)) : null;
    let c = mid, next = DD.u.int(r, 5, 9);
    for (let x = 1; x <= L; x++) {
      const still = plq != null && x >= plq - 2 && x <= plq + T.plaqueLen + 2;
      if (!o.flat && !still && --next <= 0) { c = DD.u.clamp(c + (r() < 0.5 ? -1 : 1), mid - 2, mid + 2); next = DD.u.int(r, 5, 9); }
      cx[x] = c;
      lumenRows(c, half).forEach(y => { f.g[y][x] = '.'; });
    }
    for (const y of lumenRows(cx[L], half)) f.g[y][L] = '>';
    const flat = x => cx[x - 1] === cx[x] && cx[x] === cx[x + 1];
    const used = [];
    // hazard columns avoid each other and the ends
    const spot = (span) => {
      for (let i = 0; i < 40; i++) {
        const x = DD.u.int(r, 6, L - 6 - span);
        let ok = true; for (let k = -1; k <= span + 1; k++) if (!flat(x + k) && x + k > 0) ok = false;
        if (ok && used.every(([a, b]) => x > b + 2 || x + span < a - 2)) { used.push([x, x + span]); return x; } // keep a clear column between hazards
      }
      return null;
    };
    const lane = n.kind === 'vessel' || n.kind === 'lymph';
    if (lane && n.kind === 'vessel') {
      if (plq != null) { // plaque: narrows the lane to one tile
        const span = T.plaqueLen, x = plq; used.push([x, x + span - 1]);
        const keep = cx[x] + DD.u.int(r, -half, half);
        for (let k = 0; k < span; k++) for (const y of lumenRows(cx[x], half)) if (y !== keep) f.g[y][x + k] = '=';
      }
      if (r() < T.hazard.clot * DD.derrick.hazardMult()) { // clot: blocks the main lane, the two edge lanes stay open
        const x = spot(1);
        if (x != null) for (let k = 0; k < 2; k++) for (let y = cx[x] - 1; y <= cx[x] + 1; y++) f.g[y][x + k] = '%';
      }
    }
    const doorP = n.kind === 'lymph' ? T.valveChance.lymph : n.kind === 'vessel' && n.flow === 'vein' ? T.valveChance.vein : 0;
    const doors = n.kind === 'lymph' ? 2 : 1;
    for (let d = 0; d < doors; d++) {
      if (r() >= doorP) continue;
      const x = spot(0);
      if (x != null) { for (const y of lumenRows(cx[x], half)) f.g[y][x] = '#'; f.g[cx[x]][x] = '»'; }
    }
    if (o.doorAt) { for (const y of lumenRows(cx[o.doorAt], half)) f.g[y][o.doorAt] = '#'; f.g[cx[o.doorAt]][o.doorAt] = '»'; }
    f.start = { x: 1, y: cx[1] };
    f.cx = cx; f.L = L;
    return f;
  }

  // Valve node: a short run with a door tile in the middle.
  function genValve(n, r) {
    const L = T.len.valve;
    return bandSegment(n, r, L, 2, { flat: true, doorAt: (L + 1) >> 1 });
  }

  // Chamber: a 14 x 9 room with a few pillars (trabeculae); the way through is checked.
  function genChamber(n, r) {
    const w = T.len.chamber, h = 9, f = blank(w + 2, T.h), y0 = 1;
    for (let y = 0; y < h; y++) for (let x = 1; x <= w; x++) f.g[y0 + y][x] = '.';
    for (let y = 0; y < h; y++) f.g[y0 + y][w] = '>';
    const mid = y0 + (h >> 1);
    f.start = { x: 1, y: mid };
    for (let tries = 0; tries < 20; tries++) {
      const saved = f.g.map(row => row.slice()), pillars = DD.u.int(r, 4, 7);
      for (let i = 0; i < pillars; i++) {
        const x = DD.u.int(r, 3, w - 2), y = y0 + DD.u.int(r, 0, h - 1);
        if (f.g[y][x] === '.') f.g[y][x] = '#';
      }
      if (reachable(f, f.start, w)) break;
      f.g = saved;
    }
    f.L = w;
    return f;
  }
  function reachable(f, s, xGoal) {
    const seen = new Set([s.x + ',' + s.y]), q = [[s.x, s.y]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x >= xGoal) return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= f.W || ny >= f.H || BLOCK.includes(f.g[ny][nx]) || seen.has(nx + ',' + ny)) continue;
        seen.add(nx + ',' + ny); q.push([nx, ny]);
      }
    }
    return false;
  }

  // Capillary bed: a one-tile-wide meander (cells squeeze through single file).
  function genCapillary(n, r) {
    const L = T.len.capillary, f = blank(L + 2, T.h);
    let y = T.h >> 1, x = 1; const cells = [];
    f.g[y][1] = '.'; cells.push([1, y]);
    while (x < L) {
      const run = Math.min(L - x, DD.u.int(r, 2, 4));
      for (let i = 0; i < run; i++) { x++; f.g[y][x] = '.'; cells.push([x, y]); }
      if (x >= L) break;
      const ty = DD.u.clamp(y + (r() < 0.5 ? -1 : 1) * DD.u.int(r, 2, 4), 1, T.h - 2), dy = Math.sign(ty - y);
      while (y !== ty) { y += dy; f.g[y][x] = '.'; cells.push([x, y]); }
    }
    f.g[y][L] = '>';
    f.start = { x: 1, y: T.h >> 1 };
    f.cells = cells; f.L = L;
    return f;
  }

  // ---- contents: pickups, traps, ambush enemy ----
  function lumenTiles(f, x0, x1) {
    const a = [];
    for (let y = 0; y < f.H; y++) for (let x = x0; x <= x1; x++) if (f.g[y][x] === '.') a.push([x, y]);
    return a;
  }
  function populate(f, n, r, o) {
    const taken = new Set([f.start.x + ',' + f.start.y]);
    const free = (x0, x1) => {
      const t = lumenTiles(f, x0, x1).filter(([x, y]) => !taken.has(x + ',' + y));
      if (!t.length) return null;
      const p = DD.u.pick(r, t); taken.add(p[0] + ',' + p[1]); return p;
    };
    if (n.kind !== 'valve') {
      const np = DD.u.int(r, T.pickups.min, T.pickups.max);
      for (let i = 0; i < np; i++) { const p = free(3, f.L - 1); if (p) f.pickups.push({ x: p[0], y: p[1], taken: false, kind: 'glucose', glyph: '$' }); }
      if (r() < T.pickups.itemChance) { const p = free(3, f.L - 1); if (p) f.pickups.push({ x: p[0], y: p[1], taken: false, kind: 'item', item: DD.u.pick(r, T.lootItems), glyph: '!' }); }
    }
    const vesselish = n.kind === 'vessel' || n.kind === 'capillary' || n.kind === 'lymph';
    if (vesselish && r() < T.trap.perVessel) {
      const p = free(5, f.L - 2);
      if (p) f.traps.push({ x: p[0], y: p[1], state: 0, name: n.trap || (n.kind === 'lymph' ? 'Lymph eddy' : n.kind === 'capillary' ? 'Tight squeeze' : n.flow === 'artery' ? 'Pressure surge' : 'Sluggish eddy') });
    }
    if (o.ambush) {
      const level = prof().level + DD.derrick.tripLevels(), def = DD.dungeon.pickDef('bloodstream', level, false, r), p = free(Math.max(6, f.L >> 1), f.L - 1);
      if (def && p) f.enemies.push(DD.dungeon.makeEnemy(def, 0, p[0], p[1], level, false));
    }
  }

  X.generate = function (node, seed, idx, ambush) {
    const r = rngFor(seed, idx);
    const f = node.kind === 'chamber' ? genChamber(node, r) : node.kind === 'valve' ? genValve(node, r) : node.kind === 'capillary' ? genCapillary(node, r) : genVessel(node, r);
    populate(f, node, r, { ambush });
    return f;
  };

  // ---- trips ----
  const SEG_ID = p => p.ids.slice(1);
  // 1-2 blood ambushes per trip: 15% per blood vessel segment, at most 2, at least 1 when there are enough vessels.
  function planAmbushes(segs, r) {
    const elig = []; segs.forEach((n, i) => { if ((n.kind === 'vessel' || n.kind === 'capillary')) elig.push(i); });
    const A = T.ambush; let hit = elig.filter(() => r() < A.chance + DD.derrick.ambushDelta()); // hydrated Derrick: fewer ambushes (5b)
    if (!hit.length && elig.length >= A.minVessels) hit = [DD.u.pick(r, elig)];
    return DD.u.shuffle(r, hit).slice(0, A.max).sort((a, b) => a - b);
  }

  X.start = function (plan, opts) {
    const g = G(), st = g.stats(), seed = (Math.random() * 2147483647) >>> 0, r = DD.rng(seed);
    const resources = g.resources();
    const run = { v: 1, kind: 'trip', regionId: 'bloodstream', systems: null, seed, hp: resources.hp, atp: resources.atp, glucose: 0, killed: 0, miss: [], genLevel: prof().level,
      px: 0, py: 0, floor: null, accent: null,
      trip: { key: plan.key, from: plan.from, to: plan.to, ids: plan.ids, mode: plan.mode, idx: 0, steps: 0, amb: planAmbushes(plan.ids.slice(1).map(DD.world.get), r), done: 0 } };
    g.run = run; g.combat = null; g.msgs = [];
    DD.save.save();
    enter(0); taxNode(plan.ids[1]);
    DD.ui.game();
    banner();
  };
  X.segs = run => run.trip.ids.slice(1).map(DD.world.get);
  X.banner = () => banner();

  function enter(idx, resumed) {
    const g = G(), run = g.run, t = run.trip, segs = X.segs(run), n = segs[idx];
    t.idx = idx; t.steps = 0;
    if (n.kind === 'place' && t.mode !== 'explore') return null; // handled by advance()
    const blood = !(n.kind === 'lymph' || n.sub === 'nodeRoom');
    run.systems = blood ? T.systems.blood : T.systems.lymph;
    run.accent = n.kind === 'place' ? (DD.data.region(n.id)?.accent || T.accent.lymph) : accentFor(n);
    run.floor = t.mode === 'explore' ? DD.walkWorld.floor(n, run, idx) : X.generate(n, run.seed, idx, t.amb.includes(idx));
    run.px = run.floor.start.x; run.py = run.floor.start.y;
    DD.dungeon.computeFov(run.floor, run.px, run.py);
    X.persist();
    return n;
  }
  function banner() {
    const run = G().run, n = X.segs(run)[run.trip.idx];
    if (run.trip.mode !== 'explore' && n && DD.ui.banner) DD.ui.banner(n.name, n.note);
  }
  X.persist = function () {
    const run = G().run; if (!run || !run.trip) return;
    const t = run.trip;
    if (t.mode === 'explore') DD.walkWorld.capture(run);
    G().syncResources(run); DD.save.save();
    DD.save.saveRun({ v: 1, kind: 'trip', seed: run.seed, hp: run.hp, atp: run.atp, earned: run.earned, shroud: run.shroud, cheats: run.cheats, battle: G().combat ? DD.combat.snapshot(G().combat) : null, glucose: run.glucose, killed: run.killed, miss: run.miss, genLevel: run.genLevel,
      trip: { key: t.key, from: t.from, to: t.to, ids: t.ids, mode: t.mode, idx: t.idx, amb: t.amb, areas: t.areas, junction: !!t.junction },
      segment: run.floor ? { px: run.px, py: run.py, grid: run.floor.g.map(row => row.join('')),
        explored: Array.from(run.floor.explored), taken: run.floor.pickups.map(p => p.taken),
        traps: run.floor.traps.map(t => t.state), enemies: run.floor.enemies.map(e => [e.x, e.y, e.alive]) } : null });
  };
  X.resume = function (s) {
    const g = G(), st = g.stats();
    const run = { v: 1, kind: 'trip', regionId: 'bloodstream', systems: null, seed: s.seed, hp: Math.min(s.hp, st.maxHP), atp: Math.min(s.atp, st.maxATP), glucose: s.glucose || 0,
      earned: s.earned, shroud: s.shroud, cheats: s.cheats, killed: s.killed || 0, miss: s.miss || [], genLevel: s.genLevel || prof().level, px: 0, py: 0, floor: null, accent: null,
      trip: { key: s.trip.key, from: s.trip.from, to: s.trip.to, ids: s.trip.ids, mode: s.trip.mode, junction: s.trip.mode === 'explore' ? false : !!s.trip.junction, areas: s.trip.areas || {}, idx: 0, steps: 0, amb: s.trip.amb || [], done: 0 } };
    g.run = run; g.combat = null; g.msgs = [];
    if (!s.trip.ids.every(id => DD.world.get(id))) { g.run = null; DD.save.saveRun(null); return false; }
    enter(Math.min(s.trip.idx, X.segs(run).length - 1));
    const f = run.floor, snap = s.segment;
    if (f && snap && snap.grid && snap.grid.length === f.H && snap.grid.every(row => row.length === f.W)) {
      f.g = snap.grid.map(row => row.split('')); run.px = snap.px; run.py = snap.py;
      f.explored.set(snap.explored || []);
      f.pickups.forEach((p, i) => { p.taken = !!(snap.taken || [])[i]; });
      f.traps.forEach((t, i) => { t.state = (snap.traps || [])[i] || 0; });
      f.enemies.forEach((e, i) => { const a = (snap.enemies || [])[i]; if (a) { e.x = a[0]; e.y = a[1]; e.alive = a[2]; } });
      DD.dungeon.computeFov(f, run.px, run.py);
    }
    if (s.battle) { g.combat = DD.combat.create(run, null, { saved: s.battle }); }
    X.persist();
    g.say('You rejoin the flow.');
    return true;
  };
  X.valid = s => !!(s && s.kind === 'trip' && s.trip && Array.isArray(s.trip.ids) && s.trip.ids.every(id => DD.world.get(id)));

  // ---- movement ----
  const walkable = (f, x, y) => x >= 0 && y >= 0 && x < f.W && y < f.H && !BLOCK.includes(f.g[y][x]);
  X.move = function (dx, dy) {
    const g = G(), run = g.run, f = run.floor, t = run.trip;
    const nx = run.px + dx, ny = run.py + dy;
    if (f.g[ny] && f.g[ny][nx] === '%' && DD.combat.count('tpa') > 0) { g.consumeItem('tpa'); f.g[ny][nx] = '.'; g.say(DD.data.items.tpa.use.msg); X.persist(); DD.ui.refreshMap(); return; } // tPA Injection: walk into a clot
    if (!walkable(f, nx, ny)) return;
    if (f.g[run.py][run.px] === '»' && dx <= 0) return; // a valve only opens downstream
    const foe = DD.dungeon.enemyAt(f, nx, ny);
    if (foe) return g.startCombat(foe, { firstStrike: true });
    if (f.g[run.py][run.px] === '»') f.g[run.py][run.px] = '|'; // it closes behind you
    run.px = nx; run.py = ny; t.steps++;
    if (land(f, run, nx, ny)) return;
    const flow = X.segs(run)[t.idx].flow, boots = DD.fx.gearSum(prof(), 'travelSpeed'); // Selectin Boots: arteries push more often, veins get a nudge
    const every = flow === 'artery' ? Math.max(1, DD.derrick.pushEvery(T.pushEvery) - boots) : flow === 'vein' && boots ? DD.S.gear.veinPushEvery : 0;
    if (every && t.steps % every === 0 && !(t.mode === 'explore' && run.px >= f.branchStart)) {
      const px = run.px + 1;
      if (walkable(f, px, run.py) && !DD.dungeon.enemyAt(f, px, run.py)) {
        if (f.g[run.py][run.px] === '»') f.g[run.py][run.px] = '|';
        run.px = px;
        if (land(f, run, px, run.py)) return;
        if (!t.pushNote) { t.pushNote = true; g.say(flow === 'artery' ? 'The arterial pressure carries you along.' : 'You roll along the vessel wall.'); }
      }
    }
    DD.dungeon.computeFov(f, run.px, run.py);
    const eng = DD.dungeon.enemiesAct(f, run.px, run.py);
    DD.ui.refreshMap();
    if (eng) { g.say(eng.name + ' lunges at you!'); g.startCombat(eng); }
  };
  // Returns true when the tile ended the segment or opened a screen.
  function land(f, run, x, y) {
    const g = G();
    if (run.trip.mode === 'explore' && DD.walkWorld.land(run, x, y)) return true;
    const p = f.pickups.find(q => !q.taken && q.x === x && q.y === y);
    if (p) {
      p.taken = true;
      if (p.kind === 'item') {
        const d = DD.data.items[p.item], inv = prof().inventory, have = inv[p.item] || 0;
        if (d.cap && have >= d.cap) { const v = DD.derrick.loot(DD.u.int(Math.random, S.economy.pickup.min, S.economy.pickup.max), 'bloodstream'); g.reward('glucose', v); run.glucose += v; g.say('You find a ' + d.name + ' but cannot carry more. It breaks down into ' + v + ' glucose.'); }
        else { g.reward('item', p.item); g.say('You catch a ' + d.name + ' drifting in the current.'); }
      } else {
        const E = S.economy.pickup, v = DD.derrick.loot(DD.u.int(Math.random, E.min, E.max), 'bloodstream');
        run.glucose += v; prof().glucose += v; g.say('You absorb ' + v + ' glucose.');
      }
    }
    const trap = f.traps.find(q => q.state === 0 && q.x === x && q.y === y);
    if (trap) { DD.ui.refreshMap(); g.springTrap(trap); return true; }
    if (run.trip.mode !== 'explore' && x >= f.W - 2 && f.g[y][x] === '>') { advance(); return true; }
    return false;
  }
  X.afterKill = function () { // the ambush is over: it will not come back on a resume
    const t = G().run.trip; t.amb = t.amb.filter(i => i !== t.idx); X.persist();
  };

  // ---- between segments ----
  function advance() {
    const g = G(), run = g.run, t = run.trip, segs = X.segs(run);
    if (t.mode === 'explore') {
      t.junction = false; X.persist();
      return DD.ui.game();
    }
    const i = t.idx + 1, n = segs[i];
    if (!n) return arrive(run, segs[segs.length - 1]);
    if (n.kind === 'place') {
      if (i === segs.length - 1) return arrive(run, n);
      // a dungeon in the middle of a route (blood in, lymph out): pass through its tissue
      t.idx = i; taxNode(n.id);
      return DD.ui.diapedesis(n, { pass: true }, () => {
        advance();
        if (DD.ui.mode === 'dia') { DD.ui.game(); banner(); } // the diapedesis screen replaced the map: put it back for the next segment
      });
    }
    enter(i); g.say(n.name + '.'); taxNode(n.id); DD.ui.refreshMap(); banner();
  }
  X.exploreNext = function (id) {
    const run = G().run, t = run.trip;
    DD.walkWorld.capture(run);
    t.junction = false; t.ids.push(id); t.to = id;
    const idx = t.idx + 1, n = DD.world.get(id);
    // Plan each newly chosen segment once; combat and hazards use the normal travel systems.
    if (planAmbushes([n], Math.random).length) t.amb.push(idx);
    enter(idx); taxNode(id); DD.ui.game(); banner();
  };
  // Diabetes: passing the renal vein or the kidneys costs glucose (glycosuria).
  function taxNode(id) {
    const lost = DD.derrick.glycosuria(id);
    if (lost > 0) { G().say('Glycosuria: ' + lost + ' glucose spills into the urine.'); DD.save.save(); }
  }
  function arrive(run, place) {
    const g = G(), t = run.trip;
    const info = { trip: t, place, from: DD.world.get(t.from), segs: X.segs(run).length - 1, glucose: run.glucose, killed: run.killed, fast: false };
    const done = () => {
      const st = DD.world.walked(t.key);
      g.settle(true); prof().loc = t.to;
      g.run = null; g.combat = null; DD.save.saveRun(null); DD.save.save();
      info.state = st;
      DD.ui.arrive(info);
    };
    if (place.sub === 'town') return done();
    taxNode(place.id);
    DD.ui.diapedesis(place, {}, done);
  }
  // Instant travel along an unlocked route.
  X.fast = function (plan) {
    const place = DD.world.get(plan.to);
    prof().loc = plan.to; DD.save.save();
    DD.ui.arrive({ trip: { key: plan.key, from: plan.from, to: plan.to, ids: plan.ids }, place, from: DD.world.get(plan.from), segs: plan.segs.length - 1, glucose: 0, killed: 0, fast: true, state: DD.world.state(plan.key) });
  };
  // Give up a trip: you wash back up where you set out.
  X.abort = function () {
    const g = G(), t = g.run && g.run.trip; if (!t) return;
    g.settle(false); prof().loc = t.from; g.run = null; g.combat = null; DD.save.saveRun(null); DD.save.save();
    DD.ui.menu();
  };
  return X;
})();
