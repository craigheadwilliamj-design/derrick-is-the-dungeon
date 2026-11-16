// Glyph map on a canvas. Camera centers on the player and shows about 25x17 tiles.
DD.render = (function () {
  let colors = null;
  function loadColors() {
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    colors = { floor: v('--floor'), door: v('--bile'), player: '#ffffff', mon: v('--art'), item: v('--bile'), stairs: v('--bone'), ok: v('--ok'), bg: v('--map-bg') };
  }
  function fit(canvas) {
    const box = canvas.parentElement, dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, box.clientWidth), h = Math.max(1, box.clientHeight);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    return { w, h, dpr };
  }
  function draw(canvas, run) {
    if (!colors) loadColors();
    const f = run.floor, cam = DD.S.camera, accent = DD.data.region(run.regionId).accent;
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
    for (let j = 0; j < cam.rows; j++) for (let i = 0; i < cam.cols; i++) {
      const x = x0 + i, y = y0 + j;
      if (x < 0 || y < 0 || x >= f.W || y >= f.H) continue;
      const idx = y * f.W + x;
      if (!f.explored[idx]) continue;
      const seen = f.vis[idx] === 1, a = seen ? 1 : 0.38, t = f.g[y][x];
      if (t === '#') put('#', i, j, accent, seen ? 0.9 : 0.3);
      else if (t === '.') put('·', i, j, colors.floor, a);
      else if (t === '+') put('+', i, j, colors.door, a);
      else if (t === '>') put('>', i, j, colors.stairs, a, seen ? colors.door : null);
    }
    for (const p of f.pickups) {
      if (p.taken) continue;
      const idx = p.y * f.W + p.x; if (!f.explored[idx]) continue;
      put('$', p.x - x0, p.y - y0, colors.item, f.vis[idx] ? 1 : 0.45);
    }
    for (const e of f.enemies) {
      if (!e.alive || !f.vis[e.y * f.W + e.x]) continue;
      put(e.glyph, e.x - x0, e.y - y0, colors.mon, 1, e.boss ? colors.mon : null);
    }
    put('@', run.px - x0, run.py - y0, colors.player, 1, 'rgba(255,255,255,.6)');
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  return { draw };
})();
