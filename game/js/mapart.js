// Map art for circulation segments (phase V1) and dungeon floors (V2, profiles in data/tissue.js). A segment's tile grid becomes translucent SVG tissue, baked once into a
// bitmap, plus a cheap live layer (arterial pulse, flowing cells, valve leaflets, heartbeat). Grid, movement, FOV and
// game logic are untouched; nothing is saved. See docs/design.html "Map art: tissue, not glyphs" and the V1 card.
DD.mapart = (function () {
  const S = () => DD.S.mapart;
  const store = new WeakMap();
  const U = 40;                                   // SVG user units per tile (the bake may scale down to fit maxSide)
  const reduce = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const can = () => { try { return typeof Image === 'function' && typeof Path2D === 'function' && !!document.createElement('canvas').getContext('2d'); } catch (e) { return false; } };
  const n1 = v => (Math.round(v * 10) / 10).toString();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ramp = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  let onReady = null;

  function kindOf(n) {
    if (!n || n.sub === 'nodeRoom') return null;
    if (n.kind === 'vessel') return n.flow === 'artery' ? 'artery' : 'vein';
    if (n.kind === 'lymph' || n.kind === 'capillary' || n.kind === 'chamber' || n.kind === 'valve') return n.kind;
    return null;
  }
  const VALVE = { tricuspid: 'av', mitral: 'av', pulmValve: 'semi', aorticValve: 'semi' };
  const AV_IN = { rv: 'Tricuspid valve', lv: 'Mitral valve' };
  function deoxy(n, kind) {
    const s = S();
    if (s.deoxy.includes(n.id)) return true;
    if (s.oxy.includes(n.id)) return false;
    return kind === 'vein';
  }

  // ---------- grid analysis ----------
  function analyse(f, n, kind) {
    const W = f.W, H = f.H, g = f.g, M = S().margin;
    const lum = new Uint8Array(W * H); // 1 walkable (hazards included), 2 valve-door wall tile
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = g[y][x];
      if (c !== '#') lum[y * W + x] = 1;
      else if (kind !== 'chamber' && x > 0 && x < W - 1 && g[y][x - 1] !== '#' && g[y][x + 1] !== '#') lum[y * W + x] = 2;
    }
    let xr = -1; for (let x = W - 1; x >= 0 && xr < 0; x--) for (let y = 0; y < H; y++) if (g[y][x] === '>') { xr = x; break; }
    const mid = f.start ? f.start.y : H >> 1, left = new Set();
    const vent = n.id === 'rv' || n.id === 'lv';
    if (kind === 'chamber') for (let y = mid - (vent ? 2 : 1); y <= mid + (vent ? 2 : 1); y++) left.add(y);
    else for (let y = 0; y < H; y++) if (W > 1 && lum[y * W + 1] === 1) left.add(y);
    const walk = (tx, ty) => {
      if (ty < 0 || ty >= H) return false;
      if (tx <= 0) return left.has(ty);
      if (xr >= 0 && tx > xr) return g[ty][xr] === '>';
      if (tx >= W) return false;
      return lum[ty * W + tx] > 0;
    };
    const flowOpen = (tx, ty) => {
      if (!walk(tx, ty)) return false;
      if (tx <= 0 || tx >= W || (xr >= 0 && tx > xr)) return true;
      const c = g[ty][tx]; return lum[ty * W + tx] === 1 && c !== '=' && c !== '%';
    };
    return { W, H, M, lum, xr, mid, left, walk, flowOpen, vent };
  }

  // Signed distance (in tiles) from each sample to the nearest tile matching pred: positive outside, negative inside.
  function field(G, pred, cap, box) {
    const s = S().samples, TW = G.W + 2 * G.M, TH = G.H + 2 * G.M, nx = TW * s + 1, ny = TH * s + 1;
    const T = new Uint8Array(TW * TH);
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) T[ty * TW + tx] = pred(tx - G.M, ty - G.M) ? 1 : 0;
    const F = new Float32Array(nx * ny).fill(cap), R = Math.ceil(cap) + 1;
    const rd = (x, y, tx, ty) => { const dx = Math.max(tx - x, 0, x - tx - 1), dy = Math.max(ty - y, 0, y - ty - 1); return Math.sqrt(dx * dx + dy * dy); };
    const i0 = box ? Math.max(1, (box[0] + G.M - R) * s) : 1, i1 = box ? Math.min(nx - 2, (box[2] + G.M + R) * s) : nx - 2;
    const j0 = box ? Math.max(1, (box[1] + G.M - R) * s) : 1, j1 = box ? Math.min(ny - 2, (box[3] + G.M + R) * s) : ny - 2;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = i / s, y = j / s, cx = Math.floor(x), cy = Math.floor(y);
      let out = cap, inn = 3;
      for (let ty = Math.max(0, cy - R); ty <= Math.min(TH - 1, cy + R); ty++) for (let tx = Math.max(0, cx - R); tx <= Math.min(TW - 1, cx + R); tx++) {
        const d = rd(x, y, tx, ty);
        if (T[ty * TW + tx]) { if (d < out) out = d; } else if (d < inn) inn = d;
      }
      F[j * nx + i] = out > 0 ? Math.min(out, cap) : -inn;
    }
    // soften tile corners: separable box blur, border samples stay at cap so every contour still closes
    const rad = S().blur, tmp = new Float32Array(F.length);
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let t = 0, c = 0; for (let k = -rad; k <= rad; k++) { const q = i + k; if (q >= 0 && q < nx) { t += F[j * nx + q]; c++; } } tmp[j * nx + i] = t / c; }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let t = 0, c = 0; for (let k = -rad; k <= rad; k++) { const q = j + k; if (q >= 0 && q < ny) { t += tmp[q * nx + i]; c++; } } F[j * nx + i] = t / c; }
    }
    for (let i = 0; i < nx; i++) { F[i] = cap; F[(ny - 1) * nx + i] = cap; }
    for (let j = 0; j < ny; j++) { F[j * nx] = cap; F[j * nx + nx - 1] = cap; }
    return { F, nx, ny, s };
  }
  const at = (fd, i, j) => { // bilinear, sample coords
    i = clamp(i, 0, fd.nx - 1.001); j = clamp(j, 0, fd.ny - 1.001);
    const a = Math.floor(i), b = Math.floor(j), u = i - a, v = j - b, F = fd.F, nx = fd.nx;
    return (F[b * nx + a] * (1 - u) + F[b * nx + a + 1] * u) * (1 - v) + (F[(b + 1) * nx + a] * (1 - u) + F[(b + 1) * nx + a + 1] * u) * v;
  };
  // local units (U per tile, origin at tile -M) <-> sample coords
  const toS = (fd, X) => X / U * fd.s;
  const sdU = (fd, X, Y) => at(fd, toS(fd, X), toS(fd, Y));
  const grad = (fd, X, Y) => { const e = 2, gx = sdU(fd, X + e, Y) - sdU(fd, X - e, Y), gy = sdU(fd, X, Y + e) - sdU(fd, X, Y - e), l = Math.hypot(gx, gy) || 1; return [gx / l, gy / l]; };

  // Marching squares at one level, joined into closed loops (the field's border is at cap, so every loop closes).
  function contours(fd, level) {
    const { F, nx, ny } = fd, pts = new Map(), nb = new Map();
    const pt = (id, x0, y0, v0, x1, y1, v1) => { if (!pts.has(id)) { const t = (level - v0) / (v1 - v0 || 1e-6); pts.set(id, [(x0 + (x1 - x0) * t) / fd.s * U, (y0 + (y1 - y0) * t) / fd.s * U]); } return id; };
    const link = (a, b) => { (nb.get(a) || nb.set(a, []).get(a)).push(b); (nb.get(b) || nb.set(b, []).get(b)).push(a); };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = F[j * nx + i], b = F[j * nx + i + 1], c = F[(j + 1) * nx + i + 1], d = F[(j + 1) * nx + i];
      const k = (a < level ? 8 : 0) | (b < level ? 4 : 0) | (c < level ? 2 : 0) | (d < level ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const T = () => pt((j * nx + i) * 2, i, j, a, i + 1, j, b), B = () => pt(((j + 1) * nx + i) * 2, i, j + 1, d, i + 1, j + 1, c);
      const L = () => pt((j * nx + i) * 2 + 1, i, j, a, i, j + 1, d), R = () => pt((j * nx + i + 1) * 2 + 1, i + 1, j, b, i + 1, j + 1, c);
      const mid = (a + b + c + d) / 4 < level;
      switch (k) {
        case 1: case 14: link(L(), B()); break;
        case 2: case 13: link(B(), R()); break;
        case 3: case 12: link(L(), R()); break;
        case 4: case 11: link(T(), R()); break;
        case 6: case 9: link(T(), B()); break;
        case 7: case 8: link(T(), L()); break;
        case 5: if (mid) { link(T(), L()); link(B(), R()); } else { link(T(), R()); link(L(), B()); } break;
        case 10: if (mid) { link(T(), R()); link(L(), B()); } else { link(T(), L()); link(B(), R()); } break;
      }
    }
    const loops = [], done = new Set();
    for (const start of nb.keys()) {
      if (done.has(start)) continue;
      const loop = []; let prev = null, cur = start;
      while (cur != null && !done.has(cur)) {
        done.add(cur); loop.push(pts.get(cur));
        const n = nb.get(cur); const nxt = n[0] !== prev && !done.has(n[0]) ? n[0] : n[1] !== prev && !done.has(n[1]) ? n[1] : null;
        prev = cur; cur = nxt;
      }
      if (loop.length > 2) loops.push(smooth(loop));
    }
    return loops;
  }
  function smooth(p) {
    for (let k = 0; k < S().chaikin; k++) {
      const q = [];
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
      p = q;
    }
    const out = [p[0]]; // drop points closer than 3 units
    for (const pt of p) { const l = out[out.length - 1]; if (Math.abs(pt[0] - l[0]) + Math.abs(pt[1] - l[1]) > 3) out.push(pt); }
    return out;
  }
  const pathD = loops => loops.map(l => 'M' + l.map(p => n1(p[0]) + ',' + n1(p[1])).join('L') + 'Z').join('');
  function wavy(fd, loops, amp, per, ph) { // displace along the field normal
    return loops.map(l => { let s = 0; return l.map((p, i) => { if (i) s += Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]); const g = grad(fd, p[0], p[1]), o = amp * Math.sin(s / per + ph); return [p[0] + g[0] * o, p[1] + g[1] * o]; }); });
  }
  function along(loops, r, lo, hi, fn) { // call fn(point, tangentAngleDeg) every lo..hi units of arc length
    for (const l of loops) { let need = lo + (hi - lo) * r(), acc = 0; for (let i = 1; i < l.length; i++) { const a = l[i - 1], b = l[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += d; if (acc >= need) { acc = 0; need = lo + (hi - lo) * r(); fn(b, Math.atan2(b[1] - a[1], b[0] - a[0]) * 57.2958); } } }
  }

  // ---------- SVG building ----------
  function painter(fd, r, Wu, Hu) {
    const out = [], cache = new Map();
    const C = lv => { const k = lv.toFixed(3); if (!cache.has(k)) cache.set(k, contours(fd, lv)); return cache.get(k); };
    const R = (a, b) => a + (b - a) * r();
    const P = {
      out, C, R,
      push: s => out.push(s),
      band(a, b, fill) { out.push(`<path fill-rule="evenodd" fill="${fill}" d="${b == null ? `M-400,-400H${Wu + 400}V${Hu + 400}H-400Z` : pathD(C(b))}${pathD(C(a))}"/>`); },
      line(lv, stroke, w, o = {}) {
        const loops = o.wave ? wavy(fd, C(lv), o.wave[0], o.wave[1], o.wave[2] || 0) : C(lv);
        out.push(`<path fill="none" stroke="${stroke}" stroke-width="${w}"${o.dash ? ` stroke-dasharray="${o.dash}" stroke-dashoffset="${o.off || 0}"` : ''}${o.glow ? ' filter="url(#glow)"' : ''} d="${pathD(loops)}"/>`);
      },
      fibers(a, b, n, stroke, w, amp, per) { for (let i = 0; i < n; i++) P.line(R(a, b), stroke, w, { wave: [amp, R(per[0], per[1]), R(0, 6)], dash: `${R(30, 90) | 0} ${R(8, 24) | 0}`, off: R(0, 60) | 0 }); },
      // scatter shapes in a band by rejection sampling; fn(X, Y, tangentDeg)
      scatter(a, b, per, fn) {
        let area = 0; const F = fd.F; for (let i = 0; i < F.length; i++) if (F[i] >= a && F[i] < b) area++;
        const n = Math.round(area / (fd.s * fd.s) * per);
        for (let k = 0, tries = 0; k < n && tries < n * 30; tries++) {
          const X = R(0, Wu), Y = R(0, Hu), d = sdU(fd, X, Y);
          if (d < a || d >= b) continue;
          const g = grad(fd, X, Y); fn(X, Y, Math.atan2(g[0], -g[1]) * 57.2958); k++;
        }
      },
      nuclei(a, b, per, fill, rx, ry, jit) { P.scatter(a, b, per, (X, Y, t) => out.push(`<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="${n1(R(rx[0], rx[1]))}" ry="${ry}" transform="rotate(${n1(t + R(-jit, jit))} ${n1(X)} ${n1(Y)})" fill="${fill}"/>`)); },
      flat(lv, lo, hi, fill, rx, ry) { along(C(lv), r, lo, hi, (p, t) => out.push(`<ellipse cx="${n1(p[0])}" cy="${n1(p[1])}" rx="${rx}" ry="${ry}" transform="rotate(${n1(t)} ${n1(p[0])} ${n1(p[1])})" fill="${fill}"/>`)); }
    };
    return P;
  }

  function recipe(P, kind, labels, G, n) {
    const L = S().layers, cap = S().cap;
    if (kind === 'artery') {
      const a = L.artery;
      P.band(a.externa, null, 'rgba(80,45,50,.28)');
      P.nuclei(a.externa + .2, cap, .22, 'rgba(140,80,130,.45)', [5, 9], 1.8, 20);
      P.band(a.media, a.externa, 'rgba(205,150,120,.16)');
      P.fibers(a.media + .1, a.externa - .05, 12, 'rgba(236,196,160,.3)', 1.6, 3, [12, 22]);
      P.scatter(a.media + .6, a.externa - .5, .035, (X, Y) => { const rr = P.R(8, 11); P.push(`<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(rr)}" fill="rgba(224,71,79,.42)" stroke="rgba(255,190,190,.7)" stroke-width="1.6"/><circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(rr * .45)}" fill="rgba(255,150,150,.35)"/>`); labels.push({ X, Y, text: 'Vasa vasorum', d: a.externa }); });
      P.line(a.media, 'rgba(255,200,190,.55)', 2, { wave: [1.6, 11] });
      P.band(a.intima, a.media, 'rgba(224,71,79,.3)');
      for (let k = 0; k < 5; k++) P.line(a.intima + (a.media - a.intima) * (k + .6) / 5.4, 'rgba(255,176,170,.32)', 1.4, { wave: [1.8, 8, k] });
      P.nuclei(a.intima + .08, a.media - .05, 3.2, 'rgba(130,45,100,.6)', [3.5, 5.5], 2.3, 30);
      P.band(0, a.intima, 'rgba(255,160,160,.13)');
      P.line(a.intima, 'rgba(255,205,196,.8)', 2.4, { wave: [2.6, 5.5], glow: 1 });
      P.line(0, 'rgba(255,218,212,.95)', 2.4, { glow: 1 });
      P.flat(.06, 38, 56, 'rgba(150,60,120,.8)', 6, 1.8);
      labels.layers = [[.03, 'Endothelium', -1], [a.intima, 'Internal elastic lamina', -1], [(a.intima + a.media) / 2, 'Tunica media: smooth muscle, elastic lamellae', 1], [a.media, 'External elastic lamina', 1], [(a.media + a.externa) / 2, 'Tunica externa', -1]];
    } else if (kind === 'vein') {
      const v = L.vein;
      P.band(v.externa, null, 'rgba(60,50,80,.3)');
      P.nuclei(v.externa + .2, cap, .2, 'rgba(120,90,150,.45)', [5, 9], 1.8, 20);
      P.band(v.media, v.externa, 'rgba(120,140,210,.13)');
      P.fibers(v.media + .1, v.externa - .05, 16, 'rgba(190,200,240,.24)', 1.6, 3.5, [14, 26]);
      P.scatter(v.media + .4, v.externa - .3, .45, (X, Y, t) => P.push(`<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="${n1(P.R(16, 26))}" ry="${n1(P.R(4, 6))}" transform="rotate(${n1(t)} ${n1(X)} ${n1(Y)})" fill="rgba(108,143,224,.22)" stroke="rgba(160,185,240,.3)" stroke-width="1"/>`));
      P.band(.1, v.media, 'rgba(108,143,224,.3)');
      P.nuclei(.15, v.media - .05, 1.6, 'rgba(110,60,140,.6)', [4.5, 4.5], 2, 15);
      P.line(0, 'rgba(210,222,255,.9)', 2.2, { glow: 1 });
      P.flat(.05, 40, 60, 'rgba(120,70,150,.8)', 6, 1.8);
      labels.layers = [[.03, 'Endothelium', -1], [(.1 + v.media) / 2, 'Thin tunica media', -1], [(v.media + v.externa) / 2, 'Thick tunica externa: collagen, longitudinal smooth muscle', 1]];
    } else if (kind === 'lymph') {
      const l = L.lymph;
      P.band(l.support, null, 'rgba(46,72,66,.28)');
      P.nuclei(l.support + .2, cap, .18, 'rgba(120,100,150,.4)', [5, 8], 1.8, 25);
      P.fibers(l.support + .2, cap - .5, 8, 'rgba(170,230,210,.14)', 1.4, 3, [12, 24]);
      P.band(.06, l.support, 'rgba(111,207,184,.12)');
      P.fibers(.1, l.support, 4, 'rgba(190,245,225,.22)', 1.2, 2, [10, 18]);
      P.line(0, 'rgba(214,255,242,.85)', 1.8, { glow: 1 });
      P.flat(.04, 50, 80, 'rgba(120,80,150,.7)', 6, 1.7);
      labels.layers = [[.03, 'Endothelium: one thin layer', -1], [(l.support + .06) / 2, 'Thin connective tissue support', 1]];
    } else if (kind === 'capillary') {
      const e = L.capillary.endo;
      P.band(e, null, 'rgba(110,60,90,.22)');
      P.fibers(e + .3, cap - .5, 8, 'rgba(230,170,210,.14)', 1.3, 3, [12, 24]);
      P.nuclei(e + .4, cap, .35, 'rgba(130,60,120,.5)', [5, 8], 2, 40);
      P.line(e + .03, 'rgba(240,190,220,.35)', 1.2);
      P.band(0, e, 'rgba(224,143,192,.28)');
      P.line(0, 'rgba(255,222,240,.9)', 2, { glow: 1 });
      P.flat(.05, 60, 90, 'rgba(140,60,130,.8)', 7, 2.4);
      labels.layers = [[.03, 'Endothelium: one cell thick', -1], [e + .03, 'Basement membrane', 1]];
    } else { // heart: chamber or valve segment
      const h = L.heart;
      P.band(h.myo, null, 'rgba(255,122,89,.08)');
      P.band(h.endo, h.myo, 'rgba(255,122,89,.17)');
      const fibers = [];
      for (let lv = h.endo + .2, k = 0; lv < h.myo; lv += .3, k++) {
        const al = Math.max(.08, .3 - k * .012).toFixed(3);
        P.line(lv, `rgba(255,172,140,${al})`, 4, { dash: `${P.R(26, 40) | 0} 3`, off: P.R(0, 40) | 0 });
        P.line(lv, 'rgba(255,215,195,.14)', 3, { dash: '1.2 2.6' });
        fibers.push(lv);
      }
      for (const lv of fibers) P.flat(lv, 60, 170, 'rgba(130,40,95,.6)', 5, 2.2);
      P.band(0, h.endo, 'rgba(255,170,140,.12)');
      P.line(0, 'rgba(255,170,140,.1)', 14);
      P.line(0, 'rgba(255,228,214,.9)', 2.4, { glow: 1 });
      labels.layers = [[.04, 'Endocardium', -1], [h.myo * .45, 'Myocardium: striated, branching fibers, intercalated discs', 1]];
    }
  }

  // Hazards drawn into the bake. Plaque: an intimal bulge with lipid core, foam cells, cholesterol clefts and a fibrous cap.
  function hazards(P, G, f, seedR, labels) {
    const g = f.g, comps = ch => { const pts = []; for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) if (g[y][x] === ch) pts.push([x, y]); return pts; };
    const bbox = pts => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
    const plq = comps('=');
    if (plq.length) {
      const set = new Set(plq.map(p => p[0] + ',' + p[1]));
      const fd = field(G, (x, y) => set.has(x + ',' + y), 2, bbox(plq)), Q = painter(fd, seedR, 0, 0), R = Q.R;
      const C = lv => contours(fd, lv);
      P.push(`<path fill="rgba(236,196,110,.3)" d="${pathD(C(.1))}"/><path fill="rgba(250,222,140,.26)" d="${pathD(C(-.3))}"/>`);
      const [x0, y0, x1, y1] = bbox(plq).map((v, i) => (v + G.M + (i > 1 ? 1 : 0)) * U);
      for (let i = 0, k = 0; i < 400 && k < plq.length * 2.2; i++) { const X = R(x0, x1), Y = R(y0, y1); if (sdU(fd, X, Y) > -.35) continue; k++; const a = R(0, 3.14), l = R(8, 15); P.push(`<line x1="${n1(X - l * Math.cos(a))}" y1="${n1(Y - l * Math.sin(a))}" x2="${n1(X + l * Math.cos(a))}" y2="${n1(Y + l * Math.sin(a))}" stroke="rgba(255,250,230,.6)" stroke-width="1.5"/>`); }
      for (let i = 0, k = 0; i < 400 && k < plq.length * 1.8; i++) { const X = R(x0, x1), Y = R(y0, y1); if (sdU(fd, X, Y) > -.2) continue; k++; const r = R(6, 9); let s = `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r)}" fill="rgba(255,230,170,.16)" stroke="rgba(255,230,180,.5)" stroke-width="1.2"/>`; for (let q = 0; q < 4; q++) s += `<circle cx="${n1(X + R(-r / 2, r / 2))}" cy="${n1(Y + R(-r / 2, r / 2))}" r="${n1(R(1.4, 2.6))}" fill="rgba(255,245,215,.45)"/>`; P.push(s); }
      P.push(`<path fill="none" stroke="rgba(255,236,205,.85)" stroke-width="4.5" d="${pathD(C(.1))}"/><path fill="none" stroke="rgba(255,218,212,.95)" stroke-width="2.2" filter="url(#glow)" d="${pathD(C(.16))}"/>`);
      const c = plq[plq.length >> 1]; labels.push({ X: (c[0] + G.M + .5) * U, Y: (c[1] + G.M + .5) * U, text: 'Plaque: lipid core, foam cells, fibrous cap', d: -1 });
      labels.push({ X: (x0 + x1) / 2, Y: (c[1] + G.M + .5) * U, text: 'Cholesterol clefts', d: -1, far: 1 });
    }
    const clot = comps('%');
    if (clot.length) {
      const set = new Set(clot.map(p => p[0] + ',' + p[1]));
      const fd = field(G, (x, y) => set.has(x + ',' + y), 2, bbox(clot)), R = (a, b) => a + (b - a) * seedR();
      const [x0, y0, x1, y1] = bbox(clot).map((v, i) => (v + G.M + (i > 1 ? 1 : 0)) * U), C = lv => contours(fd, lv);
      // fibrin stalk tying the thrombus to the nearest wall above it
      let wy = y0; while (wy > 0 && sdLum(G, (x0 + x1) / 2, wy) <= 0) wy -= 4;
      for (let i = 0; i < 6; i++) { const X = R(x0 + 8, x1 - 8); P.push(`<path fill="none" stroke="rgba(245,226,170,.32)" stroke-width="1.4" d="M${n1(X)},${n1(y0 + 6)} Q${n1(X + R(-10, 10))},${n1((y0 + wy) / 2)} ${n1(X + R(-14, 14))},${n1(wy + 4)}"/>`); }
      P.push(`<path fill="rgba(150,40,55,.6)" stroke="rgba(255,200,190,.5)" stroke-width="2" d="${pathD(C(.12))}"/>`);
      for (let i = 0; i < clot.length * 2.4; i++) { const X = R(x0, x1), Y = R(y0, y1); if (sdU(fd, X, Y) > -.05) continue; P.push(`<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="8" ry="${n1(R(4, 8))}" transform="rotate(${R(0, 180) | 0} ${n1(X)} ${n1(Y)})" fill="url(#rbc)"/>`); }
      for (let i = 0; i < clot.length * 8; i++) { const ax = R(x0, x1), ay = R(y0, y1), bx = ax + R(-40, 40), by = ay + R(-40, 40); if (sdU(fd, ax, ay) > .05 || sdU(fd, bx, by) > .05) continue; P.push(`<line x1="${n1(ax)}" y1="${n1(ay)}" x2="${n1(bx)}" y2="${n1(by)}" stroke="rgba(245,226,170,.45)" stroke-width="1.2"/>`); }
      for (let i = 0; i < clot.length * 2.5; i++) { const X = R(x0, x1), Y = R(y0, y1); if (sdU(fd, X, Y) > -.05) continue; P.push(`<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(R(2, 3.5))}" fill="rgba(200,170,240,.75)"/>`); }
      labels.push({ X: (x0 + x1) / 2, Y: (y0 + y1) / 2, text: 'Thrombus: fibrin mesh, trapped red cells, platelets', d: -1 });
    }
  }
  let lumFd = null; const sdLum = (G, X, Y) => sdU(lumFd, X, Y);

  // ---------- build ----------
  function build(f, n, seed) {
    if (!f || !n || !can()) return null;
    const kind = kindOf(n); if (!kind) return null;
    const have = store.get(f); if (have) return have;
    const st = S(), G = analyse(f, n, kind), M = G.M, TW = G.W + 2 * M, TH = G.H + 2 * M, Wu = TW * U, Hu = TH * U;
    const r = DD.rng((seed ^ hash(n.id)) >>> 0);
    const fd = lumFd = field(G, G.walk, st.cap);
    const labels = [], P = painter(fd, r, Wu, Hu);
    const dark = deoxy(n, kind), lymph = kind === 'lymph';
    const blood = lymph ? ['#f4fff9', '#cfeee2'] : dark ? ['#c06a7c', '#7c2038'] : ['#ffb3b0', '#d8323f'];
    recipe(P, kind, labels, G, n);
    hazards(P, G, f, r, labels);
    const art = { kind, n, G, M, f, labels, blood, ready: false, bmp: null, parts: [], valves: [], paps: [], t: 0, last: 0, beat: 0 };
    valves(P, art, f, r);
    const outV = art.valves.find(v => v.outflow), port = (f.portals || [])[0];
    art.outRow = outV ? outV.c : port ? port.y + .5 : G.mid + .5;
    if (kind === 'chamber' && G.vent) papillary(P, art, r);
    if (kind === 'chamber' && n.id === 'ra') pillarsLabel(art, f, 'Pectinate muscles');
    if (kind === 'chamber' && G.vent) pillarsLabel(art, f, 'Trabeculae carneae');
    anchorLayers(art, fd);
    const k = Math.min(st.px / U, st.maxSide / Math.max(Wu, Hu));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(Wu * k)}" height="${Math.round(Hu * k)}" viewBox="0 0 ${Wu} ${Hu}"><defs>` +
      `<filter id="wob" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="turbulence" baseFrequency="0.012 0.02" numOctaves="2" seed="${(seed % 997) + 1}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${st.wobble}" xChannelSelector="R" yChannelSelector="G"/></filter>` +
      `<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
      `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .92  0 0 0 0 .9  0 0 0 1.1 -.55"/></filter>` +
      `<radialGradient id="rbc"><stop offset="0" stop-color="${blood[0]}" stop-opacity=".55"/><stop offset=".5" stop-color="${blood[1]}" stop-opacity=".75"/><stop offset=".8" stop-color="${blood[1]}" stop-opacity=".98"/><stop offset="1" stop-color="${blood[1]}" stop-opacity=".6"/></radialGradient>` +
      `<clipPath id="tis"><path clip-rule="evenodd" d="M0,0H${Wu}V${Hu}H0Z${pathD(P.C(0))}"/></clipPath></defs>` +
      `<g filter="url(#wob)">${P.out.join('')}</g><rect width="${Wu}" height="${Hu}" filter="url(#grain)" opacity="${st.grain}" clip-path="url(#tis)" style="mix-blend-mode:overlay"/></svg>`;
    art.lumen = new Path2D(pathD(P.C(.3)));
    art.lumenTint = lymph ? 'rgba(180,240,220,.07)' : dark ? 'rgba(140,30,60,.22)' : 'rgba(200,40,50,.2)';
    if (kind === 'artery') art.split = splitPath(f, G);
    if (kind === 'chamber') { const L = f.L || 14; art.center = [(1 + L / 2 + M) * U, (G.mid + .5 + M) * U]; }
    flowSetup(art, f, G, r);
    art.rbc = rbcSprite(blood, lymph);
    art.k = k; art.Wu = Wu; art.Hu = Hu; art.fog = document.createElement('canvas'); art.fog.width = TW; art.fog.height = TH;
    store.set(f, art);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = Math.round(Wu * k); c.height = Math.round(Hu * k);
      try { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); art.bmp = c; art.ready = true; } catch (e) { art.failed = true; }
      if (onReady) onReady();
    };
    img.onerror = () => { art.failed = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    art.svgBytes = svg.length;
    return art;
  }

  // Upper half of an artery (above the lumen centre line), so the two walls can move apart with each beat.
  function splitPath(f, G) {
    const cx = f.cx || [], L = f.L || G.W, M = G.M, pts = [];
    const c = x => { const v = cx[clamp(x, 1, L)]; return v == null ? G.mid : v; };
    for (let x = -M; x <= G.W + M; x++) pts.push(n1((x + M) * U) + ',' + n1((c(x) + .5 + M) * U));
    return new Path2D(`M${-U},-${U}L${pts.join('L')}L${(G.W + 2 * M + 1) * U},-${U}Z`);
  }

  // ---------- valves (door columns, chamber inflow and outflow) ----------
  function valves(P, art, f, r) {
    const { G, kind, n } = art, g = f.g, M = G.M;
    const run = (x, y) => { let a = y, b = y; while (a > 0 && G.lum[(a - 1) * G.W + x]) a--; while (b < G.H - 1 && G.lum[(b + 1) * G.W + x]) b++; return [a, b + 1]; };
    const add = v => { art.valves.push(v); if (v.label) art.labels.push({ X: (v.x + M) * U, Y: (v.top + (v.c - v.top) * .5 + M) * U, text: v.label, d: -1 }); };
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
      if (g[y][x] !== '»' && g[y][x] !== '|') continue;
      const [top, bot] = run(x, y), c = y + .5;
      const type = kind === 'valve' ? VALVE[n.id] || 'semi' : 'venous';
      const label = kind === 'valve' ? n.name + (type === 'av' ? ': atrioventricular leaflets' : ': semilunar cusps') : kind === 'lymph' ? 'Lymphatic valve: two leaflets, one way' : 'Venous valve: two leaflets, one way';
      add({ type, x, y, top, bot, c, label, door: 1 });
      if (type === 'venous') { // a sinus bulging out behind each leaflet
        for (const s of [-1, 1]) { const ey = (s < 0 ? top : bot) + s * .22, X = (x + .35 + M) * U, Y = (ey + M) * U; P.push(`<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="${U * .85}" ry="${n1(U * .32)}" fill="${art.lumenTint || 'rgba(140,30,60,.22)'}" stroke="rgba(210,222,255,.55)" stroke-width="1.6"/>`); }
        art.labels.push({ X: (x + .35 + M) * U, Y: (top - .3 + M) * U, text: 'Valve sinus', d: -1 });
      }
    }
    if (kind === 'chamber') {
      if (G.vent) add({ type: 'av', x: .35, top: G.mid - 2, bot: G.mid + 3, c: G.mid + .5, label: AV_IN[n.id], inflow: 1, len: 2.3 });
      for (const p of (f.portals || []).filter((p, i, a) => !a.some(q => q.to === p.to && q.y < p.y))) {
        const to = DD.world && DD.world.get(p.to), type = to && VALVE[to.id];
        if (!type) continue;
        add({ type, x: p.x - .4, top: p.y, bot: p.y + 3, c: p.y + 1.5, label: to.name, outflow: 1, len: 1.4 });
      }
    }
  }
  function papillary(P, art, r) {
    const { G, M } = art, R = (a, b) => a + (b - a) * r();
    const spots = [[4.6, -1], [3.8, 1], [6.4, 1]];
    for (const [x, s] of spots) {
      const edge = s < 0 ? G.mid - 4 : G.mid + 5, base = edge + s * 1.2, tip = edge - s * .38, w = .8;
      const bx = (x + M) * U, b1 = [(x - w + M) * U, (base + M) * U], b2 = [(x + w + M) * U, (base + M) * U], t = [bx, (tip + M) * U];
      P.push(`<path fill="rgba(255,122,89,.34)" stroke="rgba(255,228,214,.85)" stroke-width="2" d="M${n1(b1[0])},${n1(b1[1])} Q${n1(bx - U * .5)},${n1((b1[1] + t[1]) / 2)} ${n1(t[0] - 7)},${n1(t[1])} Q${n1(t[0])},${n1(t[1] - s * 9)} ${n1(t[0] + 7)},${n1(t[1])} Q${n1(bx + U * .5)},${n1((b2[1] + t[1]) / 2)} ${n1(b2[0])},${n1(b2[1])}Z"/>`);
      for (let j = -1; j <= 1; j++) P.push(`<line x1="${n1(bx + j * 12)}" y1="${n1(b1[1])}" x2="${n1(bx + j * 3 + R(-1, 1))}" y2="${n1(t[1] - s * 8)}" stroke="rgba(255,180,150,.35)" stroke-width="3" stroke-dasharray="18 3"/>`);
      art.paps.push({ x, y: tip, s });
    }
    art.labels.push({ X: (spots[1][0] + M) * U, Y: (G.mid + 4.62 + M) * U, text: 'Papillary muscle', d: -1 });
    art.labels.push({ X: (spots[0][0] - 1.6 + M) * U, Y: (G.mid - 2 + M) * U, text: 'Chordae tendineae', d: -1 });
  }
  function pillarsLabel(art, f, text) {
    const L = f.L || 14;
    for (let y = 1; y < art.G.H - 1; y++) for (let x = 2; x < L; x++) if (f.g[y][x] === '#') { art.labels.push({ X: (x + .5 + art.M) * U, Y: (y + .5 + art.M) * U, text, d: -1 }); return; }
  }
  // Layer anchors every ~18 tiles along the lumen edge, found by stepping out from the lumen along the field.
  function anchorLayers(art, fd) {
    const { G, M } = art, list = art.labels.layers || [];
    delete art.labels.layers;
    for (let x = 4; x < G.W - 1; x += 18) {
      let y = 0; while (y < G.H && !G.walk(x, y)) y++;
      let yb = G.H - 1; while (yb > 0 && !G.walk(x, yb)) yb--;
      if (y >= G.H) continue;
      list.forEach(([d, text, side], i) => {
        const X = (x + .5 + (i % 3) * 1.7 + M) * U; let Y = ((side < 0 ? y : yb + 1) + M) * U;
        for (let k = 0; k < 400 && sdU(fd, X, Y) < d; k++) Y += side * 2;
        if (sdU(fd, X, Y) >= d - .05) art.labels.push({ X, Y, text, d });
      });
    }
  }

  // ---------- live flow ----------
  function flowSetup(art, f, G, r) {
    const st = S(), M = G.M, cols = {}, R = (a, b) => a + (b - a) * r();
    for (let x = -M; x < G.W + M; x++) {
      const iv = []; let y0 = null;
      for (let y = 0; y <= G.H; y++) { const o = y < G.H && G.flowOpen(x, y); if (o && y0 == null) y0 = y; if (!o && y0 != null) { iv.push([y0 + .2, y - .2]); y0 = null; } }
      cols[x] = iv;
    }
    const tot = iv => iv.reduce((s, v) => s + v[1] - v[0], 0);
    const widths = Object.values(cols).map(tot).filter(v => v > 0).sort((a, b) => a - b);
    art.cols = cols; art.tot = tot; art.ref = widths[widths.length >> 1] || 1;
    const span = G.W + 2 * M, perScreen = art.kind === 'lymph' ? st.lymphPerScreen : st.rbcPerScreen;
    if (art.kind === 'capillary' && f.cells) {
      const c = f.cells, pts = [];
      for (let x = -M; x < 1; x++) pts.push([x + .5, c[0][1] + .5]);
      for (const p of c) pts.push([p[0] + .5, p[1] + .5]);
      const last = c[c.length - 1]; for (let x = last[0] + 1; x <= last[0] + 5; x++) pts.push([x + .5, last[1] + .5]);
      const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      art.path = { pts, acc, len: acc[acc.length - 1] };
      for (let s = R(0, 1); s < art.path.len; s += R(1.15, 1.7)) art.parts.push({ s, spin: R(0, 6.3), sv: R(.6, 2) });
      return;
    }
    const n = Math.round(perScreen * span / DD.S.camera.cols);
    for (let i = 0; i < n; i++) art.parts.push({ x: R(-M, G.W + M), o: R(-.94, .94), spin: R(0, 6.3), sv: R(.6, 2.2), rot: R(0, 180), room: null });
  }
  function laneY(art, x, o) {
    const iv = art.cols[Math.floor(x)]; if (!iv || !iv.length) return null;
    const T = art.tot(iv); let u = (o + 1) / 2 * T;
    for (const v of iv) { const l = v[1] - v[0]; if (u <= l) return { y: v[0] + u, q: 2 * u / l - 1, w: T }; u -= l; }
    const v = iv[iv.length - 1]; return { y: v[1], q: 1, w: T };
  }
  function beatOf(t) {
    const ph = (t * S().bpm / 60) % 1;
    return {
      ph,
      art: ph < .14 ? Math.sin(ph / .14 * Math.PI / 2) : Math.exp(-(ph - .14) * 4.5) + .18 * Math.exp(-(((ph - .42) / .05) ** 2)),
      c: ph < .38 ? Math.sin(Math.PI * ph / .38) : 0,                                     // ventricular systole
      av: ph < .42 ? 0 : ph < .52 ? ramp(ph, .42, .52) : 1 - ramp(ph, .95, 1),            // AV valves open in diastole
      semi: ramp(ph, .05, .12) * (1 - ramp(ph, .32, .38)),                                // semilunar valves open in systole
      ac: ph > .82 ? Math.sin(Math.PI * (ph - .82) / .18) : 0                             // atrial kick, late diastole
    };
  }
  function step(art, dt, B) {
    const st = S(), G = art.G, M = G.M, kind = art.kind, n = art.n;
    const base = st.speed[kind] || 2;
    if (art.path) {
      for (const p of art.parts) { p.s += base * dt; if (p.s > art.path.len) p.s -= art.path.len; p.spin += p.sv * dt; }
      return;
    }
    const L = art.f.L || G.W, vent = G.vent, room = kind === 'chamber';
    const valveOpen = kind === 'valve' ? (VALVE[n.id] === 'av' ? B.av : B.semi) : 1;
    for (const p of art.parts) {
      p.spin += p.sv * dt;
      if (room && p.room) { // swirl in the chamber, then eject toward the outflow
        const cx = 1 + L / 2, cy = G.mid + .5, A = L / 2 - .6, Bh = 3.8, dx = p.room[0] - cx, dy = p.room[1] - cy;
        let vx = dy * .5, vy = -dx * .5 * (Bh / A);
        const push = vent ? B.c * B.semi : B.av, out = art.outRow != null ? art.outRow : cy;
        const ex = L + 1 - p.room[0], ey = out - p.room[1], el = Math.hypot(ex, ey) || 1;
        vx += ex / el * 7 * push + .3; vy += ey / el * 7 * push;
        const q = (dx / A) ** 2 + (dy / Bh) ** 2; if (q > 1) { vx -= dx * (q - 1) * 3; vy -= dy * (q - 1) * 3; }
        p.room[0] += vx * dt; p.room[1] += vy * dt;
        if (p.room[0] > L - .6) { const iv = laneY(art, Math.floor(p.room[0]), 0); p.x = p.room[0]; p.o = iv ? clamp((p.room[1] - iv.y) / (iv.w / 2), -.9, .9) : 0; p.room = null; }
        continue;
      }
      const ly = laneY(art, p.x, p.o);
      let v = base;
      if (ly) v *= (.2 + .8 * (1 - ly.q * ly.q)) * Math.min(3, art.ref / Math.max(.3, ly.w));
      if (kind === 'artery') v *= .7 + .5 * B.art;
      if (kind === 'valve') v *= .12 + .88 * valveOpen;
      if (room) v *= p.x < 1 ? (vent ? .1 + .9 * B.av : 1) : (vent ? .1 + 2.5 * B.semi : .3 + 2 * B.av);
      p.x += v * dt;
      if (room && p.x >= 1.5 && p.x < L - 1 && ly) { p.room = [p.x, ly.y]; }
      if (p.x > G.W + M) { p.x = -M + Math.random() * 2; p.o = Math.random() * 1.88 - .94; }
    }
  }

  // ---------- drawing ----------
  function rbcSprite(blood, lymph) {
    const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d');
    if (lymph) { // a lymphocyte: a pale cell with a big dark nucleus
      x.fillStyle = 'rgba(230,255,245,.32)'; x.beginPath(); x.arc(24, 24, 22, 0, 7); x.fill();
      x.strokeStyle = 'rgba(230,255,245,.6)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = 'rgba(120,70,160,.7)'; x.beginPath(); x.arc(25, 24, 16, 0, 7); x.fill();
      return c;
    }
    const g = x.createRadialGradient(24, 24, 0, 24, 24, 23);
    g.addColorStop(0, hexA(blood[0], .55)); g.addColorStop(.5, hexA(blood[1], .75)); g.addColorStop(.8, hexA(blood[1], .98)); g.addColorStop(1, hexA(blood[1], .55));
    x.fillStyle = g; x.beginPath(); x.arc(24, 24, 23, 0, 7); x.fill();
    return c;
  }
  const hexA = (h, a) => 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';

  // Tile-space transform helper: after this, 1 unit = 1 tile, origin at tile (0,0).
  const tileT = (ctx, V) => ctx.setTransform(V.dpr * V.ts, 0, 0, V.dpr * V.ts, V.dpr * (V.ox - V.x0 * V.ts), V.dpr * (V.oy - V.y0 * V.ts));
  const localT = (ctx, V, M) => { const s = V.dpr * V.ts / U; ctx.setTransform(s, 0, 0, s, V.dpr * (V.ox + (-M - V.x0) * V.ts), V.dpr * (V.oy + (-M - V.y0) * V.ts)); };

  function base(ctx, art, V, now) {
    if (art.floorArt) return floorBase(ctx, art, V, now);
    const st = S(), G = art.G, M = G.M, still = !animated();
    const t = still ? 0.3 : now / 1000, dt = still ? 0 : Math.min(.05, art.last ? t - art.last : 0);
    art.last = t;
    const B = beatOf(t);
    if (!still) step(art, dt, B);
    else if (!art.warm) { art.warm = 1; for (let i = 0; i < 120; i++) step(art, 1 / 30, beatOf(i / 30)); }
    // the visible slice of the bitmap, in local units
    const sx = (V.x0 + M - 1) * U, sy = (V.y0 + M - 1) * U, sw = (V.cols + 2) * U, sh = (V.rows + 2) * U;
    const blit = (dy, sc) => {
      localT(ctx, V, M);
      if (sc) { const c = art.center; ctx.translate(c[0], c[1]); ctx.scale(sc, sc); ctx.translate(-c[0], -c[1]); }
      const k = art.k, ax = clamp(sx, 0, art.Wu), ay = clamp(sy, 0, art.Hu), bx = clamp(sx + sw, 0, art.Wu), by = clamp(sy + sh, 0, art.Hu);
      if (bx > ax && by > ay) ctx.drawImage(art.bmp, ax * k, ay * k, (bx - ax) * k, (by - ay) * k, ax, ay + (dy || 0), bx - ax, by - ay);
    };
    let sc = 0;
    if (art.kind === 'chamber') sc = 1 - (art.G.vent ? .022 * B.c : .012 * B.ac);
    localT(ctx, V, M);
    if (sc) { const c = art.center; ctx.translate(c[0], c[1]); ctx.scale(sc, sc); ctx.translate(-c[0], -c[1]); }
    ctx.fillStyle = art.lumenTint; ctx.fill(art.lumen);
    drawCells(ctx, art, V, B);
    if (art.split) { // the walls move apart with the pulse: a sharp rise, then a dicrotic notch
      const d = st.pulsePx * B.art;
      localT(ctx, V, M); ctx.save(); ctx.clip(art.split); blit(-d); ctx.restore();
      localT(ctx, V, M); ctx.save(); const lo = new Path2D(); lo.rect(-U * 2, -U * 2, art.Wu + U * 4, art.Hu + U * 4); lo.addPath(art.split); ctx.clip(lo, 'evenodd'); blit(d); ctx.restore();
    } else blit(0, sc);
    drawValves(ctx, art, V, B);
  }
  function drawCells(ctx, art, V, B) {
    const M = art.G.M, x0 = V.x0 - 1, x1 = V.x0 + V.cols + 1, y0 = V.y0 - 1, y1 = V.y0 + V.rows + 1, img = art.rbc, lymph = art.kind === 'lymph';
    const r = lymph ? .3 : .23, pos = [];
    if (art.path) {
      const P = art.path;
      for (const p of art.parts) {
        let i = 1; while (i < P.acc.length - 1 && P.acc[i] < p.s) i++;
        const a = P.pts[i - 1], b = P.pts[i], u = (p.s - P.acc[i - 1]) / ((P.acc[i] - P.acc[i - 1]) || 1);
        const fade = p.s > P.len - 1.5 ? (P.len - p.s) / 1.5 : 1;
        pos.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0]), .7, fade]);
      }
    } else for (const p of art.parts) {
      if (p.room) { pos.push([p.room[0], p.room[1], p.rot * .0175, Math.abs(Math.cos(p.spin)), 1]); continue; }
      if (p.x < x0 || p.x > x1) continue;
      const a = laneY(art, p.x, p.o), b = laneY(art, p.x + 1, p.o); if (!a) continue;
      const fx = p.x - Math.floor(p.x), y = b ? a.y + (b.y - a.y) * fx : a.y;
      pos.push([p.x, y, p.rot * .0175, lymph ? 1 : .32 + .68 * Math.abs(Math.cos(p.spin)), 1]);
    }
    tileT(ctx, V);
    let drawn = 0;
    for (const [x, y, rot, sq, al] of pos) {
      if (x < x0 || x > x1 || y < y0 || y > y1 || drawn >= S().rbcPerScreen + 6) continue;
      drawn++;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, sq); ctx.drawImage(img, -r, -r, 2 * r, 2 * r); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function leaf(ctx, h, tip, ctl, col) {
    ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.quadraticCurveTo(ctl[0], ctl[1], tip[0], tip[1]);
    ctx.strokeStyle = col[0]; ctx.lineWidth = .22; ctx.stroke();
    ctx.strokeStyle = col[1]; ctx.lineWidth = .06; ctx.stroke();
  }
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const qpt = (h, c, t, u) => [(1 - u) * (1 - u) * h[0] + 2 * (1 - u) * u * c[0] + u * u * t[0], (1 - u) * (1 - u) * h[1] + 2 * (1 - u) * u * c[1] + u * u * t[1]];
  function drawValves(ctx, art, V, B) {
    if (!art.valves.length) return;
    tileT(ctx, V); ctx.lineCap = 'round';
    const heart = art.kind === 'chamber' || art.kind === 'valve', col = heart ? ['rgba(255,215,200,.3)', 'rgba(255,242,234,.92)'] : art.kind === 'lymph' ? ['rgba(170,255,230,.3)', 'rgba(225,255,245,.92)'] : ['rgba(160,185,255,.32)', 'rgba(225,232,255,.92)'];
    const g = art.f.g, avTips = [];
    for (const v of art.valves) {
      const shut = v.door && g[v.y] && g[v.y][v.x] === '|';
      if (v.type === 'venous') {
        const fl = animated() ? Math.sin(art.last * 1.9 + v.x) * .07 : 0;
        for (const s of [-1, 1]) {
          const e = s < 0 ? v.top : v.bot, gap = shut ? .03 : .2 + fl;
          leaf(ctx, [v.x - .55, e], [v.x + .6, v.c + s * gap], [v.x - .05, e + (v.c - e) * .62], col);
        }
        continue;
      }
      const o = shut ? 0 : v.type === 'av' ? B.av : B.semi;
      for (const s of [-1, 1]) {
        const e = s < 0 ? v.top : v.bot, h = [v.x, e], half = Math.abs(v.c - e);
        let tip, ctl;
        if (v.type === 'av') {
          const len = v.len || Math.min(2.3, half + .3);
          tip = lerp([v.x + .5, v.c + s * .03], [v.x + len, e - s * .35], o);
          ctl = lerp([v.x - .4, (e + v.c) / 2], [v.x + len * .5, e - s * .18], o);
          if (v.inflow) avTips.push([h, ctl, tip]);
        } else {
          tip = lerp([v.x + .25, v.c + s * .03], [v.x + 1.3, e - s * .25], o);
          ctl = lerp([v.x - .35, (e + v.c) / 2], [v.x + .6, e - s * .3], o);
        }
        leaf(ctx, h, tip, ctl, col);
      }
    }
    if (art.paps.length && avTips.length === 2) { // chordae tendineae from the papillary muscles to the AV leaflets
      ctx.strokeStyle = 'rgba(255,246,236,.7)'; ctx.lineWidth = .035;
      const ends = [[0, 0, .55], [0, 0, .8], [0, 0, 1], [1, 1, .6], [1, 1, .85], [1, 2, .9], [1, 2, 1]];
      for (const [li, pi, u] of ends) {
        const [h, c, tp] = avTips[li], a = qpt(h, c, tp, u), p = art.paps[pi];
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo((p.x + a[0]) / 2 + .2, (p.y + a[1]) / 2, a[0], a[1]); ctx.stroke();
      }
    }
  }

  // Dark overlay for unexplored and remembered tiles, softened by drawing a 1-px-per-tile canvas scaled up.
  // Wall tissue within a few tiles of a tile you have seen shows, since walls hide nothing.
  function fog(ctx, art, f, V) {
    const G = art.G, M = G.M, TW = G.W + 2 * M, TH = G.H + 2 * M, lv = new Uint8Array(TW * TH);
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) { const i = y * G.W + x; lv[(y + M) * TW + x + M] = f.vis[i] ? 2 : f.explored[i] ? 1 : 0; }
    const wall = (x, y) => { const gx = x - M, gy = y - M; return !(gx >= 0 && gy >= 0 && gx < G.W && gy < G.H && G.lum[gy * G.W + gx] === 1); };
    for (let pass = 0; pass < S().fogReach; pass++) {
      const nx = lv.slice();
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
        if (!wall(x, y)) continue; let m = lv[y * TW + x];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < TW && b < TH && lv[b * TW + a] > m) m = lv[b * TW + a]; }
        nx[y * TW + x] = m;
      }
      lv.set(nx);
    }
    const c = art.fog.getContext('2d'), im = c.createImageData(TW, TH), d = im.data, dim = Math.round(S().fogDim * 255);
    for (let i = 0; i < lv.length; i++) { d[i * 4] = 12; d[i * 4 + 1] = 8; d[i * 4 + 2] = 9; d[i * 4 + 3] = lv[i] === 2 ? 0 : lv[i] === 1 ? dim : 255; }
    c.putImageData(im, 0, 0);
    tileT(ctx, V); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
    ctx.drawImage(art.fog, -M, -M, TW, TH);
  }

  // Sprites: idle sheets about 2 tiles wide on a soft dark halo. Returns false when the sheet is not ready.
  function sprite(ctx, V, id, x, y, mirror, now) {
    const sh = DD.anim && DD.anim.idleSheet ? DD.anim.idleSheet(id, onReady) : null;
    if (!sh || !(sh.back.complete && sh.back.naturalWidth) || !(sh.front.complete && sh.front.naturalWidth)) return false;
    const fr = animated() ? Math.floor(now * 16 / 1000) % 32 : 0, sx = (fr % 8) * 256, sy = (fr >> 3) * 256, w = S().spriteTiles;
    tileT(ctx, V);
    const cx = x + .5, cy = y + .5, hg = ctx.createRadialGradient(cx, cy + .1, 0, cx, cy + .1, w * .55);
    hg.addColorStop(0, 'rgba(8,4,6,.62)'); hg.addColorStop(1, 'rgba(8,4,6,0)');
    ctx.fillStyle = hg; ctx.fillRect(cx - w, cy - w, 2 * w, 2 * w);
    ctx.save(); ctx.translate(cx, cy); if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(sh.back, sx, sy, 256, 256, -w / 2, -w / 2, w, w); ctx.drawImage(sh.front, sx, sy, 256, 256, -w / 2, -w / 2, w, w);
    ctx.restore();
    return true;
  }
  // Glucose: a glowing six-membered ring with its ring oxygen.
  function glucose(ctx, V, x, y, alpha, now) {
    tileT(ctx, V);
    const cx = x + .5, cy = y + .5 + (animated() ? .07 * Math.sin(now / 1000 * 2.4 + x) : 0), r = .32;
    ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = '#e8c560'; ctx.shadowBlur = V.ts * .5 * V.dpr;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    ctx.closePath(); ctx.fillStyle = 'rgba(217,180,74,.18)'; ctx.fill(); ctx.strokeStyle = '#e8c560'; ctx.lineWidth = .065; ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ff8a7a'; ctx.beginPath(); ctx.arc(cx, cy - r, .09, 0, 7); ctx.fill();
    ctx.restore();
  }
  // Structure labels with leader lines, one per name, for anchors in view. Drawn in screen pixels.
  function labels(ctx, art, f, V, colors) {
    const M = art.G.M, ts = V.ts, boxes = [], seen = new Set(), fs = Math.max(11, Math.round(ts * .42));
    const sx = x => V.ox + (x - V.x0) * ts, sy = y => V.oy + (y - V.y0) * ts;
    const list = art.labels.map(l => ({ l, x: sx(l.X / U - M), y: sy(l.Y / U - M), tx: Math.floor(l.X / U - M), ty: Math.floor(l.Y / U - M) }))
      .filter(a => a.x > 8 && a.x < V.w - 8 && a.y > 6 && a.y < V.h - 6)
      .filter(a => { const x = clamp(a.tx, 0, f.W - 1), y = clamp(a.ty, 0, f.H - 1); return f.explored[y * f.W + x] || nearExplored(f, x, y); })
      .sort((a, b) => Math.abs(a.x - V.w / 2) - Math.abs(b.x - V.w / 2));
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    for (const a of list) {
      if (seen.has(a.l.text)) continue;
      const tw = ctx.measureText(a.l.text).width, up = a.y < V.h / 2;
      let placed = null;
      for (let k = 0; k < 5 && !placed; k++) {
        const ty = up ? Math.max(fs, a.y - ts * (2 + k * .9)) : Math.min(V.h - fs, a.y + ts * (2 + k * .9));
        const tx = clamp(a.x - tw / 2, 6, V.w - 6 - tw), box = [tx - 4, ty - fs * .7, tx + tw + 4, ty + fs * .7];
        if (!boxes.some(b => b[0] < box[2] && box[0] < b[2] && b[1] < box[3] && box[1] < b[3])) placed = { tx, ty, box };
      }
      if (!placed) continue;
      seen.add(a.l.text); boxes.push(placed.box);
      const lx = clamp(a.x, placed.tx, placed.tx + tw), ly = placed.ty + (up ? fs * .6 : -fs * .6);
      ctx.strokeStyle = 'rgba(236,227,211,.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(a.x, a.y); ctx.stroke();
      ctx.fillStyle = colors.bone; ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, 7); ctx.fill();
      ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0c0809'; ctx.strokeText(a.l.text, placed.tx, placed.ty); ctx.fillText(a.l.text, placed.tx, placed.ty);
    }
  }
  function nearExplored(f, x, y) { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < f.W && b < f.H && f.explored[b * f.W + a]) return true; } return false; }

  // ---------- dungeon floors (V2): tissue profiles from data/tissue.js ----------
  // Painter library. Each paints the band [a, b] (tiles from the room edge; negative is floor) into P, seeded by P.R.
  // c: { fd, tag(name, X, Y), sinus: [], inHub(X, Y) }. Later cards reuse these and add one only when none fits.
  const deg = t => n1(t);
  const fits = (fd, X, Y, a, b, m) => { const d = sdU(fd, X, Y); return d - m >= a && d + m <= b; };
  const normalAt = (fd, X, Y) => grad(fd, X, Y); // points into the wall
  const LIB = {
    fibers(P, o, a, b) { // strokes following the wall, evenly or randomly spaced; optional striations
      for (let k = 0; k < (o.n || 6); k++) {
        const lv = o.even ? a + (b - a) * (k + .5) / o.n : P.R(a, b);
        P.line(lv, o.stroke, o.w || 1.4, { wave: [o.amp == null ? 2 : o.amp, P.R(o.per[0], o.per[1]), P.R(0, 6)], dash: `${P.R(40, 110) | 0} ${P.R(6, 18) | 0}`, off: P.R(0, 60) | 0 });
        if (o.striate) P.line(lv, o.striate, (o.w || 1.4) * 1.6, { dash: '1.2 3' });
      }
    },
    lamellae(P, o, a, b, c) { // concentric rings around a central canal
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.r[0], o.r[1]); if (!fits(c.fd, X, Y, a, b, r / U)) return;
        let s = ''; for (let k = 1; k <= (o.rings || 4); k++) s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r * k / (o.rings || 4))}" fill="none" stroke="${o.stroke}" stroke-width="${o.w || 1.2}"/>`;
        P.push(s + `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r * .18)}" fill="${o.canal || 'rgba(20,8,12,.6)'}"/>`); c.tag(o.tag, X, Y);
      });
    },
    lining(P, o, a, b, c) { // a row of cells along an edge, on the floor side; nuclei placed by cell shape
      const [w, h] = o.size, L = P.C(o.at || 0);
      for (const l of L) {
        let on = P.R(0, 1) < (o.cover == null ? 1 : o.cover), run = 0, s = 0;
        for (let i = 1; i < l.length; i++) {
          const p = l[i], q = l[i - 1]; s += Math.hypot(p[0] - q[0], p[1] - q[1]);
          if (s < w * 1.1) continue; s = 0;
          if (++run > P.R(3, 9)) { run = 0; on = P.R(0, 1) < (o.cover == null ? 1 : o.cover); }
          const hub = c.inHub(p[0], p[1]);
          if (!on || (o.hub === false && hub) || (o.hub === true && !hub)) continue;
          const t = Math.atan2(p[1] - q[1], p[0] - q[0]), nv = normalAt(c.fd, p[0], p[1]);
          const X = p[0] - nv[0] * h / 2, Y = p[1] - nv[1] * h / 2, side = -Math.sin(t) * nv[0] + Math.cos(t) * nv[1] > 0 ? 1 : -1; // +y local toward the wall
          let nu;
          if (o.shape === 'squamous') nu = `<ellipse cx="0" cy="0" rx="${n1(w * .3)}" ry="${n1(h * .32)}" fill="${o.nucleus}"/>`;
          else if (o.shape === 'columnar') nu = `<ellipse cx="0" cy="${n1(side * h * .22)}" rx="${n1(w * .22)}" ry="${n1(h * .2)}" fill="${o.nucleus}"/>`;
          else nu = `<circle cx="0" cy="0" r="${n1(Math.min(w, h) * .3)}" fill="${o.nucleus}"/>`;
          P.push(`<g transform="translate(${n1(X)} ${n1(Y)}) rotate(${deg(t * 57.2958)})"><rect x="${n1(-w / 2)}" y="${n1(-h / 2)}" width="${w}" height="${h}" rx="${n1(Math.min(w, h) * .4)}" fill="${o.fill}"/>${nu}</g>`);
          c.tag(o.tag, X, Y);
        }
      }
    },
    nuclei(P, o, a, b, c) { // scatter by shape: round, flat, elongated, lobed; optional cytoplasm or lacuna with canaliculi
      P.scatter(a, b, o.per, (X, Y, t) => {
        const r = P.R(o.size[0], o.size[1]), cr = o.cell ? P.R(o.cell[0], o.cell[1]) : r;
        if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + cr / U)) return;
        let s = '';
        if (o.cell) s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(cr)}" fill="${o.cellFill}"/>`;
        const rot = n1(t + P.R(-15, 15)), tr = `transform="rotate(${rot} ${n1(X)} ${n1(Y)})"`;
        if (o.lacuna) {
          s += `<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="${n1(r * 1.9)}" ry="${n1(r * .95)}" ${tr} fill="${o.lacuna}"/>`;
          if (o.canaliculi) for (let k = 0; k < 6; k++) { const an = P.R(0, 6.28), l = P.R(8, 14); s += `<line x1="${n1(X)}" y1="${n1(Y)}" x2="${n1(X + Math.cos(an) * l)}" y2="${n1(Y + Math.sin(an) * l)}" stroke="${o.canaliculi}" stroke-width=".8"/>`; }
        }
        if (o.shape === 'lobed') { s += `<g fill="${o.fill}" opacity="${o.opacity || 1}">`; for (let k = 0, n = P.R(3, 5.99) | 0; k < n; k++) { const an = k / n * 6.28 + P.R(-.3, .3); s += `<circle cx="${n1(X + Math.cos(an) * r * .55)}" cy="${n1(Y + Math.sin(an) * r * .55)}" r="${n1(r * .55)}"/>`; } s += '</g>'; }
        else { const ry = o.shape === 'flat' ? r * .3 : o.shape === 'elongated' ? r * .55 : r; s += `<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="${n1(r)}" ry="${n1(ry)}" ${tr} fill="${o.fill}"/>`; }
        P.push(s); c.tag(o.tag, X, Y);
      });
    },
    vacuoles(P, o, a, b, c) { // empty round cells (adipocytes): thin rim, a flattened nucleus pushed to the edge
      const placed = [];
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.r[0], o.r[1]); if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + r / U)) return;
        if (placed.some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + r - 2)) return;
        placed.push([X, Y, r]);
        let s = `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r)}" fill="${o.fill || 'none'}" stroke="${o.stroke}" stroke-width="1.3"/>`;
        if (o.nucleus && P.R(0, 1) < .5) { const an = P.R(0, 6.28), nx = X + Math.cos(an) * r * .86, ny = Y + Math.sin(an) * r * .86; s += `<ellipse cx="${n1(nx)}" cy="${n1(ny)}" rx="${n1(r * .32)}" ry="${n1(r * .12)}" transform="rotate(${deg(an * 57.2958 + 90)} ${n1(nx)} ${n1(ny)})" fill="${o.nucleus}"/>`; }
        P.push(s); c.tag(o.tag, X, Y);
      });
    },
    crossSections(P, o, a, b, c) { // tubes or vessels cut across: wall ring, lumen, flat wall nuclei, optional red cells
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.r[0], o.r[1]); if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + r / U)) return;
        let s = `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r)}" fill="${o.lumen}" stroke="${o.wall}" stroke-width="${o.ww || 2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
        const nr = o.nr || [5, 1.8], inn = o.nr ? nr[1] : 0; // stave nuclei bulge into the lumen
        for (let k = 0; k < (o.nuclei || 0); k++) { const an = P.R(0, 6.28), nx = X + Math.cos(an) * (r - inn), ny = Y + Math.sin(an) * (r - inn); s += `<ellipse cx="${n1(nx)}" cy="${n1(ny)}" rx="${nr[0]}" ry="${nr[1]}" transform="rotate(${deg(an * 57.2958 + 90)} ${n1(nx)} ${n1(ny)})" fill="${o.nucleus || 'rgba(122,58,128,.8)'}"/>`; }
        for (let k = 0; k < (o.rbc || 0); k++) { const an = P.R(0, 6.28), d = P.R(0, r * .6); s += `<ellipse cx="${n1(X + Math.cos(an) * d)}" cy="${n1(Y + Math.sin(an) * d)}" rx="5" ry="${n1(P.R(3, 5))}" fill="url(#rbc)"/>`; }
        P.push(s); c.tag(o.tag, X, Y);
        if (o.sinus) for (let k = 0; k < 8; k++) { const an = k / 8 * 6.28; c.sinus.push({ x: X / U - c.M + Math.cos(an) * r / U, y: Y / U - c.M + Math.sin(an) * r / U, nx: -Math.cos(an), ny: -Math.sin(an), span: r / U * .8 }); }
      });
    },
    nodules(P, o, a, b, c) { // lymphoid nodules or sheaths: packed lymphocyte nuclei, optional pale germinal centre, eccentric arteriole, marginal zone
      const placed = [], m = o.marginal, ce = o.centre, ar = o.arteriole, ly = o.cells;
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.r[0], o.r[1]), sx = o.stretch ? P.R(o.stretch[0], o.stretch[1]) : 1, mz = m ? r * m.w : 0, R0 = r * sx + mz;
        if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + R0 / U) || placed.some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + R0)) return;
        placed.push([X, Y, R0]);
        const t = P.R(0, 6.283), ct = Math.cos(t), st = Math.sin(t), at = (lx, ly2) => [X + ct * lx - st * ly2, Y + st * lx + ct * ly2];
        const gx = ce ? -r * sx * (ce.off || 0) : 0, gr = ce ? r * ce.r : 0, ax = ar ? r * sx * (ar.off || 0) : 0;
        let s = `<g transform="translate(${n1(X)} ${n1(Y)}) rotate(${deg(t * 57.2958)})">`;
        if (m) s += `<ellipse rx="${n1(r * sx + mz)}" ry="${n1(r + mz)}" fill="${m.fill}"/>`;
        s += `<ellipse rx="${n1(r * sx)}" ry="${n1(r)}" fill="${o.fill}"/>`;
        if (m && m.cells) for (let k = 0, n = Math.round(m.cells * R0 * 6.28 / U); k < n; k++) { const an = P.R(0, 6.283), q = P.R(1.02, 1 + m.w * .9); s += `<circle cx="${n1(Math.cos(an) * r * sx * q)}" cy="${n1(Math.sin(an) * r * q)}" r="${n1(P.R(ly.size[0], ly.size[1]))}" fill="${m.cellFill}"/>`; }
        if (ce) s += `<circle cx="${n1(gx)}" cy="0" r="${n1(gr)}" fill="${ce.fill}"/>`;
        for (let k = 0, n = Math.round(Math.PI * r * r * sx / (U * U) * ly.per); k < n; k++) {
          const an = P.R(0, 6.283), q = Math.sqrt(P.R(0, 1)), x2 = Math.cos(an) * r * sx * q, y2 = Math.sin(an) * r * q;
          if (ce && Math.hypot(x2 - gx, y2) < gr * .92) continue; // the germinal centre is pale: few small lymphocytes
          s += `<circle cx="${n1(x2)}" cy="${n1(y2)}" r="${n1(P.R(ly.size[0], ly.size[1]))}" fill="${ly.fill}"/>`;
        }
        if (ce && ce.cells) for (let k = 0, n = Math.round(Math.PI * gr * gr / (U * U) * ce.cells); k < n; k++) { const an = P.R(0, 6.283), q = Math.sqrt(P.R(0, 1)) * gr * .85; s += `<circle cx="${n1(gx + Math.cos(an) * q)}" cy="${n1(Math.sin(an) * q)}" r="${n1(P.R(ce.size[0], ce.size[1]))}" fill="${ce.cellFill}"/>`; }
        if (ar) {
          const rr = P.R(ar.r[0], ar.r[1]);
          s += `<circle cx="${n1(ax)}" cy="0" r="${n1(rr)}" fill="${ar.lumen}" stroke="${ar.wall}" stroke-width="${ar.ww || 3}"/>`;
          for (let k = 0; k < 2; k++) s += `<ellipse cx="${n1(ax + P.R(-rr, rr) * .35)}" cy="${n1(P.R(-rr, rr) * .35)}" rx="${n1(rr * .4)}" ry="${n1(rr * .28)}" fill="url(#rbc)" opacity=".45"/>`;
        }
        P.push(s + '</g>');
        c.tag(o.tag, X, Y);
        if (ce) { const g = at(gx, 0); c.tag(ce.tag, g[0], g[1]); }
        if (ar) { const g = at(ax, 0); c.tag(ar.tag, g[0], g[1]); }
        if (m) { const g = at(0, r + mz * .5); c.tag(m.tag, g[0], g[1]); }
      });
    },
    strands(P, o, a, b, c) { // loose fibers and collagen
      P.scatter(a, b, o.per, (X, Y) => { const an = P.R(0, 6.28), l = P.R(o.len[0], o.len[1]), bx = X + Math.cos(an) * l, by = Y + Math.sin(an) * l; P.push(`<path fill="none" stroke="${o.stroke}" stroke-width="${o.w || 1.2}" d="M${n1(X)},${n1(Y)} Q${n1((X + bx) / 2 + P.R(-l, l) * .3)},${n1((Y + by) / 2 + P.R(-l, l) * .3)} ${n1(bx)},${n1(by)}"/>`); c.tag(o.tag, X, Y); });
    },
    pits(P, o, a, b, c) { // a shallow resorption pit in the wall surface holding a large multinucleated cell
      along(P.C(0), P.R.bind(null, 0, 1), o.every[0], o.every[1], (p, t) => {
        const hub = c.inHub(p[0], p[1]); if ((o.hub === false && hub) || (o.hub === true && !hub)) return;
        const nv = normalAt(c.fd, p[0], p[1]), w = P.R(o.width[0], o.width[1]), dp = o.depth * U, rot = `rotate(${deg(t)} `;
        const px = p[0] + nv[0] * dp * .3, py = p[1] + nv[1] * dp * .3, cx = p[0] - nv[0] * dp * .15, cy = p[1] - nv[1] * dp * .15;
        let s = `<ellipse cx="${n1(px)}" cy="${n1(py)}" rx="${n1(w / 2)}" ry="${n1(dp * .7)}" transform="${rot}${n1(px)} ${n1(py)})" fill="${o.fill}" stroke="${o.rim}" stroke-width="1.4" stroke-dasharray="3 2"/>`;
        s += `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(w * .46)}" ry="${n1(dp * .62)}" transform="${rot}${n1(cx)} ${n1(cy)})" fill="${o.cell}"/>`;
        for (let k = 0, n = P.R(o.nuclei[0], o.nuclei[1] + .99) | 0; k < n; k++) { const u = (k + .5) / n - .5, ex = cx + Math.cos(t * .01745) * u * w * .75, ey = cy + Math.sin(t * .01745) * u * w * .75; s += `<circle cx="${n1(ex)}" cy="${n1(ey)}" r="3.4" fill="${o.nucleus}"/>`; }
        P.push(s); c.tag(o.tag, cx, cy);
      });
    }
  };
  const paint = (P, list, a, b, c) => { for (const o of [].concat(list || [])) LIB[o.p](P, o, a, b == null ? 999 : b, c); };

  // Collision stays on the tiles: pin each tile centre (and the samples around it) to its own side of the edge, so a
  // smoothed contour can never cover a walkable tile or expose a wall tile as floor.
  function pin(fd, G, pred, m) {
    const s = fd.s, nx = fd.nx;
    for (let y = -G.M; y < G.H + G.M; y++) for (let x = -G.M; x < G.W + G.M; x++) {
      const inside = pred(x, y), ci = (x + G.M) * s + (s >> 1), cj = (y + G.M) * s + (s >> 1);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const i = ci + di, j = cj + dj; if (i < 1 || j < 1 || i >= nx - 1 || j >= fd.ny - 1) continue;
        const k = j * nx + i; fd.F[k] = inside ? Math.min(fd.F[k], -m) : Math.max(fd.F[k], m);
      }
    }
    return fd;
  }
  function floorGrid(f) {
    const W = f.W, H = f.H, g = f.g, M = S().floor.margin, lum = new Uint8Array(W * H), pill = new Uint8Array(W * H), pillars = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] !== '#') lum[y * W + x] = 1;
    const seen = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { // pillars: small wall islands cut off by corridors
      if (lum[i] || seen[i]) continue;
      const q = [i], cells = []; let edge = false; seen[i] = 1;
      while (q.length) { const k = q.pop(), x = k % W, y = (k / W) | 0; cells.push(k); if (!x || !y || x === W - 1 || y === H - 1) edge = true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, j = b * W + a; if (a >= 0 && b >= 0 && a < W && b < H && !lum[j] && !seen[j]) { seen[j] = 1; q.push(j); } } }
      if (!edge && cells.length <= S().floor.pillarMax) { pillars.push(cells); for (const k of cells) pill[k] = 1; }
    }
    const walk = (tx, ty) => tx >= 0 && ty >= 0 && tx < W && ty < H && (lum[ty * W + tx] || pill[ty * W + tx]) > 0;
    return { W, H, M, lum, pill, pillars, walk };
  }

  function buildFloor(f, regionId, idx, seed) {
    const prof = DD.data.tissue && DD.data.tissue[regionId];
    if (!f || !prof || f.tiles || !can()) return null;
    const have = store.get(f); if (have) return have;
    const st = S(), sf = st.floor, D = prof.depth[Math.min(idx, prof.depth.length - 1)], next = prof.depth[idx + 1];
    const G = floorGrid(f), M = G.M, TW = G.W + 2 * M, TH = G.H + 2 * M, Wu = TW * U, Hu = TH * U, cap = sf.cap;
    const r = DD.rng((seed ^ hash(regionId + ':' + idx)) >>> 0), fd = pin(field(G, G.walk, cap), G, G.walk, sf.pin), P = painter(fd, r, Wu, Hu);
    const anchors = {}, sinus = [];
    const hubRoom = D.hub && f.exit ? (f.rooms || []).find(m => f.exit.x >= m.x && f.exit.x < m.x + m.w && f.exit.y >= m.y && f.exit.y < m.y + m.h) : null;
    const hb = hubRoom && [(hubRoom.x + M - .6) * U, (hubRoom.y + M - .6) * U, (hubRoom.x + hubRoom.w + M + .6) * U, (hubRoom.y + hubRoom.h + M + .6) * U];
    const c = { fd, sinus, M, tag: (k, X, Y) => { if (k) (anchors[k] = anchors[k] || []).push([X, Y]); }, inHub: (X, Y) => !!hb && X >= hb[0] && X <= hb[2] && Y >= hb[1] && Y <= hb[3] };
    // walls, outermost band first
    for (const w of D.walls) {
      P.band(w.band[0], w.band[1], w.fill); paint(P, w.painter, w.band[0], w.band[1], c);
      if (w.tag) along(P.C((w.band[0] + Math.min(w.band[1] == null ? cap : w.band[1], cap)) / 2), r, U * 10, U * 16, p => c.tag(w.tag, p[0], p[1]));
    }
    // floor: fill and baked ambient haze; the hub room is a sinusoid lumen
    P.band(-999, 0, D.floor.fill);
    if (hb) {
      P.push(`<clipPath id="hubc"><rect x="${n1(hb[0])}" y="${n1(hb[1])}" width="${n1(hb[2] - hb[0])}" height="${n1(hb[3] - hb[1])}"/></clipPath><path clip-path="url(#hubc)" fill="${D.hub.fill}" d="${pathD(P.C(0))}"/>`);
      P.scatter(-999, -.3, D.hub.rbc, (X, Y) => { if (c.inHub(X, Y)) P.push(`<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="6" ry="${n1(P.R(3, 6))}" transform="rotate(${P.R(0, 180) | 0} ${n1(X)} ${n1(Y)})" fill="url(#rbc)" opacity=".4"/>`); });
      c.tag(D.hub.tag, (hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2);
    }
    paint(P, D.floor.ambient, -999, 0, c);
    // pillars: small wall islands drawn as the profile's pillar feature (marrow: venous sinusoids)
    const pf = D.features && D.features.pillar;
    if (pf) for (const cells of G.pillars) {
      const set = new Set(cells), xs = cells.map(k => k % G.W), ys = cells.map(k => (k / G.W) | 0);
      const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      const isP = (x, y) => x >= 0 && y >= 0 && x < G.W && y < G.H && set.has(y * G.W + x), pfd = pin(field(G, isP, 2, box), G, isP, sf.pin), L = contours(pfd, 0);
      P.push(`<path fill="${pf.lumen}" stroke="${pf.wall}" stroke-width="2.4"${pf.dash ? ` stroke-dasharray="${pf.dash}"` : ''} d="${pathD(L)}"/>`);
      const pn = pf.nr || [6, 1.8];
      along(L, r, pf.every ? pf.every[0] : 26, pf.every ? pf.every[1] : 48, (p, t) => P.push(`<ellipse cx="${n1(p[0])}" cy="${n1(p[1])}" rx="${pn[0]}" ry="${pn[1]}" transform="rotate(${deg(t)} ${n1(p[0])} ${n1(p[1])})" fill="${pf.nucleus}"/>`));
      for (let k = 0; k < cells.length * pf.rbc; k++) { const X = (P.R(box[0], box[2] + 1) + M) * U, Y = (P.R(box[1], box[3] + 1) + M) * U; if (sdU(pfd, X, Y) < -.15) P.push(`<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="6" ry="${n1(P.R(3, 6))}" transform="rotate(${P.R(0, 180) | 0} ${n1(X)} ${n1(Y)})" fill="url(#rbc)"/>`); }
      c.tag(pf.tag, (box[0] + box[2] + 1) / 2 * U + M * U, (box[1] + box[3] + 1) / 2 * U + M * U);
      for (const l of L) for (let i = 0; i < l.length; i += 6) { const p = l[i], g2 = grad(pfd, p[0], p[1]); sinus.push({ x: p[0] / U - M, y: p[1] / U - M, nx: -g2[0], ny: -g2[1], span: .5 }); }
    }
    // doors narrow the passage; stairs open into the next depth, tinted with its colours; rest pockets glow
    const ft = D.features || {};
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
      const ch = f.g[y][x], X = (x + .5 + M) * U, Y = (y + .5 + M) * U;
      if (ch === '+' && ft.door) {
        const horiz = f.g[y][x - 1] === '#' && f.g[y][x + 1] === '#', dx = horiz ? 1 : 0, dy = horiz ? 0 : 1;
        for (const s of [-1, 1]) P.push(`<ellipse cx="${n1(X + s * dx * U * .62)}" cy="${n1(Y + s * dy * U * .62)}" rx="${n1(U * (horiz ? .3 : .55))}" ry="${n1(U * (horiz ? .55 : .3))}" fill="${ft.door.lip}" stroke="${ft.door.rim}" stroke-width="1.6"/>`);
      } else if (ch === '>' && ft.stairs) {
        const nf = (next || D).floor.fill;
        P.push(`<radialGradient id="st${x}_${y}"><stop offset="0" stop-color="${nf.replace(/[\d.]+\)$/, '1)')}" stop-opacity=".22"/><stop offset=".6" stop-color="${nf.replace(/[\d.]+\)$/, '1)')}" stop-opacity=".2"/><stop offset="1" stop-color="#0c0809" stop-opacity="0"/></radialGradient><circle cx="${n1(X)}" cy="${n1(Y)}" r="${U * .72}" fill="url(#st${x}_${y})"/><circle cx="${n1(X)}" cy="${n1(Y)}" r="${U * .42}" fill="none" stroke="${ft.stairs.rim}" stroke-width="2" filter="url(#glow)"/>`);
      }
    }
    if (ft.rest) for (const p of f.rests || []) P.push(`<circle cx="${n1((p.x + .5 + M) * U)}" cy="${n1((p.y + .5 + M) * U)}" r="${U * .46}" fill="${ft.rest.fill}" stroke="${ft.rest.stroke}" stroke-width="1.4" stroke-dasharray="4 3"/>`);
    // surface: lining cells and pits, hub endothelium, then the glossy edge
    paint(P, D.lining, -999, 999, c);
    if (D.hub && D.hub.lining) LIB.lining(P, Object.assign({ hub: true }, D.hub.lining), 0, 0, c);
    if (hubRoom && D.motion && D.hub.ports !== false) along(P.C(0), r, 30, 60, p => { if (c.inHub(p[0], p[1])) { const nv = normalAt(fd, p[0], p[1]); sinus.push({ x: p[0] / U - M, y: p[1] / U - M, nx: -nv[0], ny: -nv[1], span: 2.5 }); } });
    P.line(0, D.edge.stroke, D.edge.w, { glow: 1 });
    const labels = [];
    for (const lb of prof.labels || []) { const list = anchors[lb.at] || []; const step = Math.max(1, Math.floor(list.length / sf.anchorsPer)); for (let i = 0; i < list.length; i += step) labels.push({ X: list[i][0], Y: list[i][1], text: lb.text, d: 0 }); }
    const k = Math.min(st.px / U, st.maxSide / Math.max(Wu, Hu));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(Wu * k)}" height="${Math.round(Hu * k)}" viewBox="0 0 ${Wu} ${Hu}"><defs>` +
      `<filter id="wob" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="turbulence" baseFrequency="0.012 0.02" numOctaves="2" seed="${(seed % 997) + 1}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${st.wobble}" xChannelSelector="R" yChannelSelector="G"/></filter>` +
      `<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
      `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .92  0 0 0 0 .9  0 0 0 1.1 -.55"/></filter>` +
      `<radialGradient id="rbc"><stop offset="0" stop-color="#ffb3b0" stop-opacity=".55"/><stop offset=".5" stop-color="#d8323f" stop-opacity=".75"/><stop offset=".8" stop-color="#d8323f" stop-opacity=".98"/><stop offset="1" stop-color="#d8323f" stop-opacity=".6"/></radialGradient>` +
      `<clipPath id="tis"><path clip-rule="evenodd" d="M0,0H${Wu}V${Hu}H0Z${pathD(P.C(0))}"/></clipPath><clipPath id="flo"><path d="${pathD(P.C(0))}"/></clipPath></defs>` +
      `<g filter="url(#wob)">${P.out.join('')}</g><rect width="${Wu}" height="${Hu}" filter="url(#grain)" opacity="${st.grain}" clip-path="url(#tis)" style="mix-blend-mode:overlay"/>` +
      `<rect width="${Wu}" height="${Hu}" filter="url(#grain)" opacity="${D.floor.grain}" clip-path="url(#flo)" style="mix-blend-mode:overlay"/></svg>`;
    const art = { floorArt: true, kind: 'floor', regionId, D, G, M, f, labels, ready: false, bmp: null, sinus, parts: [], last: 0, k, Wu, Hu };
    art.rbc = rbcSprite(['#ffb3b0', '#d8323f'], false);
    art.fog = document.createElement('canvas'); art.fog.width = TW; art.fog.height = TH;
    store.set(f, art);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = Math.round(Wu * k); cv.height = Math.round(Hu * k);
      try { cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); art.bmp = cv; art.ready = true; } catch (e) { art.failed = true; }
      if (onReady) onReady();
    };
    img.onerror = () => { art.failed = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    art.svgBytes = svg.length;
    return art;
  }

  // Live layer for floors: only the profile's motion. Diapedesis: new red cells squeeze through a sinusoid wall, then drift away.
  function floorBase(ctx, art, V, now) {
    const still = !animated(), t = still ? 0 : now / 1000, dt = still ? 0 : Math.min(.05, art.last ? t - art.last : 0), M = art.M;
    art.last = t;
    const sx = (V.x0 + M - 1) * U, sy = (V.y0 + M - 1) * U, sw = (V.cols + 2) * U, sh = (V.rows + 2) * U, k = art.k;
    localT(ctx, V, M);
    const ax = clamp(sx, 0, art.Wu), ay = clamp(sy, 0, art.Hu), bx = clamp(sx + sw, 0, art.Wu), by = clamp(sy + sh, 0, art.Hu);
    if (bx > ax && by > ay) ctx.drawImage(art.bmp, ax * k, ay * k, (bx - ax) * k, (by - ay) * k, ax, ay, bx - ax, by - ay);
    const mo = art.D.motion; if (!mo || mo.type !== 'diapedesis' || !art.sinus.length) return;
    const inView = s => s.x > V.x0 - 1 && s.x < V.x0 + V.cols + 1 && s.y > V.y0 - 1 && s.y < V.y0 + V.rows + 1;
    const ports = art.sinus.filter(inView); if (!ports.length) return;
    const life = S().floor.cellLife, rnd = DD.rng(((art.seedN = (art.seedN || 7) + 1) * 2654435761) >>> 0);
    while (art.parts.length < mo.count) art.parts.push({ age: rnd() * life, port: null });
    tileT(ctx, V);
    for (const p of art.parts) {
      p.age += dt;
      if (!p.port || p.age > life || !inView(p.port)) { p.port = ports[(rnd() * ports.length) | 0]; p.age = still ? rnd() * life : 0; p.side = rnd() < .5 ? -1 : 1; p.spin = rnd() * 6.3; }
      const s = p.port, u = p.age, sq = S().floor.squeeze, tx = -s.ny * p.side, ty = s.nx * p.side;
      let d, along = 0, wsc = 1, hsc = 1;
      if (u < sq) { const q = u / sq; d = -.28 + .56 * q; const pinch = Math.sin(q * Math.PI); wsc = 1 - .35 * pinch; hsc = 1 + .2 * pinch; }
      else { const q = (u - sq) * mo.speed; d = .28 + Math.min(q * .4, s.span * .5); along = q; }
      const x = s.x + s.nx * d + tx * along, y = s.y + s.ny * d + ty * along, al = u < .3 ? u / .3 : u > life - .8 ? (life - u) / .8 : 1;
      ctx.save(); ctx.globalAlpha = clamp(al, 0, 1) * .95; ctx.translate(x, y); ctx.rotate(Math.atan2(s.ny, s.nx)); ctx.scale(hsc, wsc * (.75 + .25 * Math.abs(Math.cos(p.spin + u * .5)))); ctx.drawImage(art.rbc, -.2, -.2, .4, .4); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  const floorProfile = run => !!(run && !run.trip && run.floor && !run.floor.tiles && DD.data.tissue && DD.data.tissue[run.regionId]);

  function animated() { return !reduce.matches; }
  function forRun(run) {
    if (!run || !run.floor || !can()) return null;
    if (!run.trip) {
      if (!floorProfile(run)) return null;
      const fa = store.get(run.floor) || buildFloor(run.floor, run.regionId, run.floorIdx, (run.seed + run.floorIdx * 7919) >>> 0);
      return fa && fa.ready ? fa : null;
    }
    const n = DD.travel.segs(run)[run.trip.idx];
    const art = store.get(run.floor) || build(run.floor, n, (run.seed + run.trip.idx * 7919) >>> 0);
    return art && art.ready ? art : null;
  }
  return {
    build, buildFloor, floorProfile, forRun, base, fog, sprite, glucose, labels, animated, kindOf,
    onReady(fn) { onReady = fn; },
    perf: { frames: 0, ms: 0 },
    has: f => !!store.get(f)
  };
})();
