// Glyph map on a canvas. Camera centers on the player and shows about 25x17 tiles.
DD.render = (function () {
  let colors = null;
  function loadColors() {
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    colors = { floor: v('--floor'), door: v('--bile'), player: '#ffffff', mon: v('--art'), item: v('--bile'), stairs: v('--bone'), ok: v('--ok'), bg: v('--map-bg'), clot: '#ff9ea6', trap: '#ff7a59', npc: '#7fd6c2', merchant: '#e0c060' };
  }
  function fit(canvas) {
    const box = canvas.parentElement, dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, box.clientWidth), h = Math.max(1, box.clientHeight), W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== H) { // resizing clears the canvas, so only do it when the box changed
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; canvas.width = W; canvas.height = H;
    }
    return { w, h, dpr };
  }
  // Circulation segments (V1), dungeon floors (V2) and towns (V13) with map art animate: one frame per display refresh while the map is showing.
  let raf = 0, live = null, liveRun = null;
  const tick = () => { raf = 0; const run = liveRun; if (live && live.isConnected && run && run.floor && !DD.game.combat) draw(live, run); };
  if (DD.mapart) DD.mapart.onReady(() => { if (DD.ui && DD.ui.mode === 'town' && DD.town.redraw) DD.town.redraw(); else if (DD.ui && DD.ui.refreshMap) DD.ui.refreshMap(true); });
  function draw(canvas, run) {
    if (!colors) loadColors();
    const art = DD.mapart ? DD.mapart.forRun(run) : null, t0 = art ? performance.now() : 0;
    const f = run.floor, cam = DD.S.camera, accent = run.accent || DD.data.region(run.regionId).accent;
    const { w, h, dpr } = fit(canvas), ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, w, h);
    const ts = Math.max(8, Math.floor(Math.min(w / cam.cols, h / cam.rows)));
    const ox = Math.round((w - ts * cam.cols) / 2), oy = Math.round((h - ts * cam.rows) / 2);
    const x0 = run.px - ((cam.cols - 1) >> 1), y0 = run.py - ((cam.rows - 1) >> 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.round(ts * 0.82) + 'px "JetBrains Mono", ui-monospace, monospace';
    const put = (ch, i, j, col, alpha, glow) => {
      ctx.globalAlpha = alpha; ctx.fillStyle = col;
      ctx.shadowColor = glow || 'transparent'; ctx.shadowBlur = glow ? ts * 0.6 : 0;
      ctx.fillText(ch, ox + (i + 0.5) * ts, oy + (j + 0.55) * ts);
    };
    const V = { ts, ox, oy, x0, y0, cols: cam.cols, rows: cam.rows, dpr, w, h }, now = t0 || 0;
    const glow = c => art ? c : null; // with tissue under them, items keep their glyph shapes but always glow
    if (art) { DD.mapart.base(ctx, art, V, now); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = '800 ' + Math.round(ts * 0.82) + 'px "JetBrains Mono", ui-monospace, monospace'; }
    if (art && art.town) for (let j = 0; j < cam.rows; j++) for (let i = 0; i < cam.cols; i++) { // town (V13): doors, bounty board, HEV gate and exits keep their glyphs, with a glow
      const x = x0 + i, y = y0 + j; if (x < 0 || y < 0 || x >= f.W || y >= f.H) continue;
      const t = f.g[y][x]; if (!art.glyphs.includes(t)) continue;
      if (t === '+') put('+', i, j, colors.door, 1, colors.door); else { const d = f.tiles[t], c = colors[d.col] || d.col; put(d.ch, i, j, c, 1, c); }
    }
    else for (let j = 0; j < cam.rows; j++) for (let i = 0; i < cam.cols; i++) {
      const x = x0 + i, y = y0 + j;
      if (x < 0 || y < 0 || x >= f.W || y >= f.H) continue;
      const idx = y * f.W + x;
      if (!f.explored[idx]) continue;
      const seen = f.vis[idx] === 1, a = seen ? 1 : 0.38, t = f.g[y][x];
      if (t === '#') put('#', i, j, accent, seen ? 0.9 : 0.3);
      else if (t === '.') put('·', i, j, colors.floor, a);
      else if (t === '+') put('+', i, j, colors.door, a);
      else if (t === '>') put('>', i, j, colors.stairs, a, seen ? colors.door : null);
      else if (t === '%') put('%', i, j, colors.clot, a, seen ? colors.clot : null);   // clot
      else if (t === '=') put('=', i, j, colors.door, a);                                 // plaque
      else if (t === '»') put('»', i, j, colors.ok, a, seen ? colors.ok : null);          // one-way valve
      else if (t === '|') put('|', i, j, colors.floor, a);                                // closed valve
      else if (f.tiles && f.tiles[t]) { const d = f.tiles[t], c = colors[d.col] || d.col; put(d.ch, i, j, c, a, d.glow && seen ? c : null); } // town features (3c)
    }
    for (const tr of f.traps || []) {
      if (!tr.state) continue; // hidden until stepped on; revealed traps stay visible
      const idx = tr.y * f.W + tr.x; if (!f.explored[idx]) continue;
      const tc = tr.state === 2 ? colors.ok : colors.trap;
      put('^', tr.x - x0, tr.y - y0, tc, f.vis[idx] ? 1 : 0.45, glow(tc));
    }
    for (const p of f.pickups) {
      if (p.taken) continue;
      const idx = p.y * f.W + p.x; if (!f.explored[idx]) continue;
      if (art && p.kind === 'glucose') { DD.mapart.glucose(ctx, V, p.x, p.y, f.vis[idx] ? 1 : 0.45, now); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); continue; }
      put(p.glyph || '$', p.x - x0, p.y - y0, colors.item, f.vis[idx] ? 1 : 0.45, glow(colors.item));
    }
    for (const c of f.chests || []) { // gear chests (4b)
      if (c.taken) continue;
      const idx = c.y * f.W + c.x; if (!f.explored[idx]) continue;
      put('&', c.x - x0, c.y - y0, '#f2c14e', f.vis[idx] ? 1 : 0.45, f.vis[idx] || art ? '#f2c14e' : null);
    }
    for (const c of f.rests || []) { // rest pocket: one-use recovery
      if (c.taken) continue;
      const idx = c.y * f.W + c.x; if (!f.explored[idx]) continue;
      put('~', c.x - x0, c.y - y0, '#7fd36b', f.vis[idx] ? 1 : 0.45, f.vis[idx] || art ? '#7fd36b' : null);
    }
    const reveal = DD.fx.gearSum(DD.save.profile, 'revealNPCs') > 0 && !f.tiles; // Chemokine Compass: cells show through walls (dungeon floors only)
    for (const n of f.npcs || []) {
      const idx = n.y * f.W + n.x, seen = f.explored[idx] && f.vis[idx];
      if (!seen && !reveal) continue;
      put(n.glyph, n.x - x0, n.y - y0, n.col || (n.kind === 'merchant' ? colors.merchant : colors.npc), seen ? 1 : 0.55, seen && !n.done && n.kind !== 'ambient' ? colors.npc : null);
    }
    for (const e of f.enemies) {
      if (!e.alive || !f.vis[e.y * f.W + e.x]) continue;
      const eid = art && DD.anim.enemyArtId(e);
      if (eid && DD.mapart.sprite(ctx, V, eid, e.x, e.y, true, now)) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); continue; }
      put(e.glyph, e.x - x0, e.y - y0, colors.mon, 1, e.boss ? colors.mon : null);
    }
    if (art && !art.town) { DD.mapart.fog(ctx, art, f, V); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; }
    for (const s of f.signs || []) {
      if (!f.explored[s.y * f.W + s.x]) continue;
      const i=s.x-x0,j=s.y-y0;
      if(i < -12 || i > cam.cols+12 || j<0 || j>=cam.rows)continue;
      ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.fillStyle='#ffe39a';
      ctx.font='600 '+Math.max(9,Math.round(ts*.55))+'px ui-monospace,monospace';
      ctx.fillText(s.label || DD.world.get(s.to).name,ox+(i+.5)*ts,oy+(j+.2)*ts);
    }
    ctx.font='800 '+Math.round(ts*.82)+'px "JetBrains Mono",ui-monospace,monospace';
    const pid = art && DD.anim.classArtId(DD.save.profile.classId);
    if (!(pid && DD.mapart.sprite(ctx, V, pid, run.px, run.py, false, now))) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); put('@', run.px - x0, run.py - y0, colors.player, 1, 'rgba(255,255,255,.6)'); }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if (art && DD.save.profile.settings.mapLabels) DD.mapart.labels(ctx, art, f, V, { bone: '#ece3d3' });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (art) {
      const P = DD.mapart.perf; P.frames++; P.ms += performance.now() - t0;
      if (DD.mapart.animated() && !DD.game.combat) { live = canvas; liveRun = run; if (!raf) raf = requestAnimationFrame(tick); }
    }
  }
  return { draw };
})();
