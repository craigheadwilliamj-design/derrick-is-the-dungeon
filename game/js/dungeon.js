// Floor generation (deterministic from seed), FOV, enemy movement.
DD.dungeon = (function () {
  const S = DD.S;
  const BAND_RANK = { mild: 0, moderate: 1, serious: 2 };

  function los(f, x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    while (!(x === x1 && y === y1)) {
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      if (x === x1 && y === y1) break;
      if (f.g[y][x] === '#') return false;
    }
    return true;
  }
  function computeFov(f, px, py) {
    const R = S.fov.radius;
    f.vis = new Uint8Array(f.W * f.H);
    for (let y = py - R; y <= py + R; y++) for (let x = px - R; x <= px + R; x++) {
      if (x < 0 || y < 0 || x >= f.W || y >= f.H) continue;
      if ((x - px) ** 2 + (y - py) ** 2 > R * R) continue;
      if (los(f, px, py, x, y)) { f.vis[y * f.W + x] = 1; f.explored[y * f.W + x] = 1; }
    }
  }
  function bandRank(level) { return level >= S.enemy.seriousAt ? 2 : level >= S.enemy.moderateAt ? 1 : 0; }
  function pickDef(regionId, level, boss, r) {
    const defs = DD.data.enemies.filter(d => d.regions.includes(regionId));
    if (boss) return defs.find(d => d.boss);
    const rank = bandRank(level);
    // Bands the region has content for, up to the player's band. Missing bands fall back to what exists.
    const ok = defs.filter(d => !d.boss && BAND_RANK[d.band] <= rank);
    return DD.u.pick(r, ok.length ? ok : defs.filter(d => !d.boss));
  }
  function makeEnemy(def, uid, x, y, level, boss) {
    const E = S.enemy;
    const hp = Math.round((E.hp.base + E.hp.perLevel * level) * (boss ? E.bossHpMult : 1));
    return { uid, defId: def.id, name: def.name, type: def.type, glyph: def.glyph, codex: def.codex, boss: !!boss, lvl: level,
      hp, maxHP: hp, atk: (E.atk.base + E.atk.perLevel * level) * (boss ? E.bossAtkMult : 1), def: E.def.perLevel * level,
      x, y, alive: true };
  }

  function generate(o) {
    const r = DD.rng(o.seed), W = S.grid.w, H = S.grid.h, R = S.rooms;
    const g = Array.from({ length: H }, () => Array(W).fill('#'));
    const room = Array.from({ length: H }, () => Array(W).fill(false));
    const corr = Array.from({ length: H }, () => Array(W).fill(false));
    const rooms = [], target = DD.u.int(r, R.min, R.max);
    for (let tries = 0; rooms.length < target && tries < 800; tries++) {
      const w = DD.u.int(r, R.wMin, R.wMax), h = DD.u.int(r, R.hMin, R.hMax);
      const x = DD.u.int(r, 1, W - w - 1), y = DD.u.int(r, 1, H - h - 1);
      // keep a 1-tile wall margin between rooms
      if (rooms.some(o2 => x - 1 < o2.x + o2.w && x + w + 1 > o2.x && y - 1 < o2.y + o2.h && y + h + 1 > o2.y)) continue;
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
    }
    for (const rm of rooms) for (let y = rm.y; y < rm.y + rm.h; y++) for (let x = rm.x; x < rm.x + rm.w; x++) { g[y][x] = '.'; room[y][x] = true; }
    const mark = (x, y) => { if (!room[y][x]) { g[y][x] = '.'; corr[y][x] = true; } };
    function connect(a, b) {
      let x = a.cx, y = a.cy; const hFirst = r() < 0.5;
      const hs = () => { while (x !== b.cx) { x += x < b.cx ? 1 : -1; mark(x, y); } };
      const vs = () => { while (y !== b.cy) { y += y < b.cy ? 1 : -1; mark(x, y); } };
      if (hFirst) { hs(); vs(); } else { vs(); hs(); }
    }
    for (let i = 0; i < rooms.length - 1; i++) connect(rooms[i], rooms[i + 1]);
    if (rooms.length > 3) { // one extra connection for a loop
      const a = DD.u.int(r, 0, rooms.length - 1); let b = DD.u.int(r, 0, rooms.length - 1);
      if (Math.abs(a - b) < 2) b = (a + 2) % rooms.length;
      connect(rooms[a], rooms[b]);
    }
    // doors where a corridor meets a room through a one-tile wall gap
    const isWall = (x, y) => y < 0 || x < 0 || y >= H || x >= W || g[y][x] === '#';
    const doors = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!corr[y][x]) continue;
      const side = (room[y][x - 1] || room[y][x + 1]) && isWall(x, y - 1) && isWall(x, y + 1);
      const vert = (room[y - 1][x] || room[y + 1][x]) && isWall(x - 1, y) && isWall(x + 1, y);
      if (side || vert) doors.push([x, y]);
    }
    doors.forEach(([x, y]) => { g[y][x] = '+'; });

    // farthest room from room 0
    let far = 1, best = -1;
    rooms.forEach((rm, i) => { const d = Math.hypot(rm.cx - rooms[0].cx, rm.cy - rooms[0].cy); if (i > 0 && d > best) { best = d; far = i; } });
    const occ = new Set();
    const key = (x, y) => x + ',' + y;
    const start = { x: rooms[0].cx, y: rooms[0].cy };
    occ.add(key(start.x, start.y));
    const freeIn = rm => {
      for (let i = 0; i < 60; i++) {
        const x = DD.u.int(r, rm.x, rm.x + rm.w - 1), y = DD.u.int(r, rm.y, rm.y + rm.h - 1);
        if (!occ.has(key(x, y))) { occ.add(key(x, y)); return { x, y }; }
      }
      return null;
    };
    const f = { W, H, g, rooms, start, enemies: [], pickups: [], traps: [], stairs: null, exit: null, boss: !!o.boss,
      explored: new Uint8Array(W * H), vis: new Uint8Array(W * H), bossDead: false };
    const level = o.playerLevel + o.floorIdx;
    let uid = 0;
    if (o.boss) {
      const c = { x: rooms[far].cx, y: rooms[far].cy }; occ.add(key(c.x, c.y));
      f.enemies.push(makeEnemy(pickDef(o.regionId, level, true, r), uid++, c.x, c.y, level, true));
      f.exit = { x: c.x, y: c.y };
    } else {
      f.stairs = { x: rooms[far].cx, y: rooms[far].cy }; occ.add(key(f.stairs.x, f.stairs.y));
      g[f.stairs.y][f.stairs.x] = '>';
    }
    const n = o.boss ? S.bossFloorMinions : DD.u.int(r, S.enemiesPerFloor.min, S.enemiesPerFloor.max);
    for (let i = 0; i < n; i++) {
      const rm = rooms[DD.u.int(r, 1, rooms.length - 1)], p = freeIn(rm);
      if (p) f.enemies.push(makeEnemy(pickDef(o.regionId, level, false, r), uid++, p.x, p.y, level, false));
    }
    const np = DD.u.int(r, S.pickups.min, S.pickups.max);
    for (let i = 0; i < np; i++) {
      const p = freeIn(rooms[DD.u.int(r, 0, rooms.length - 1)]);
      if (p) f.pickups.push({ x: p.x, y: p.y, taken: false });
    }
    // hidden traps: stepping on one asks a pop quiz. Generated after everything else so older floors keep their layout.
    const TR = S.travel.trap, nt = DD.u.int(r, TR.perFloor.min, TR.perFloor.max), tname = (DD.data.region(o.regionId) || {}).trap || 'Hidden trap';
    for (let i = 0; i < nt; i++) {
      const p = freeIn(rooms[DD.u.int(r, 0, rooms.length - 1)]);
      if (p) f.traps.push({ x: p.x, y: p.y, state: 0, name: tname });
    }
    return f;
  }

  const walk = (f, x, y) => x >= 0 && y >= 0 && x < f.W && y < f.H && !'#%=|'.includes(f.g[y][x]); // clots, plaque and closed valves block too
  const enemyAt = (f, x, y) => f.enemies.find(e => e.alive && e.x === x && e.y === y);

  // Enemies that can see the player within the chase radius take one greedy step. Returns an enemy that reached the player.
  function enemiesAct(f, px, py) {
    for (const e of f.enemies) {
      if (!e.alive || e.boss) continue;
      if (Math.hypot(e.x - px, e.y - py) > S.chase.radius || !los(f, e.x, e.y, px, py)) continue;
      const dx = Math.sign(px - e.x), dy = Math.sign(py - e.y);
      const order = Math.abs(px - e.x) >= Math.abs(py - e.y) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
      for (const [mx, my] of order) {
        if (!mx && !my) continue;
        const nx = e.x + mx, ny = e.y + my;
        if (nx === px && ny === py) return e;
        if (walk(f, nx, ny) && !enemyAt(f, nx, ny)) { e.x = nx; e.y = ny; break; }
      }
    }
    return null;
  }
  return { generate, computeFov, enemiesAct, enemyAt, walk, los, pickDef, makeEnemy };
})();
