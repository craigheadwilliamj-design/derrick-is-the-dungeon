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
    if (n.kind === 'place') return 'lymph'; // walkable-circulation plazas without a tissue profile (lymph node towns): drawn as lymph
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
        let area = 0; const F = fd.F, mk = P.mask; for (let i = 0; i < F.length; i++) if (F[i] >= a && F[i] < b && (!mk || mk((i % fd.nx) / fd.s * U, ((i / fd.nx) | 0) / fd.s * U))) area++; // mask: only where mask(X, Y) (town zones)
        const n = Math.round(area / (fd.s * fd.s) * per);
        for (let k = 0, tries = 0; k < n && tries < n * 30; tries++) {
          const X = R(0, Wu), Y = R(0, Hu), d = sdU(fd, X, Y);
          if (d < a || d >= b || (mk && !mk(X, Y))) continue;
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
    fibers(P, o, a, b, c) { // strokes following the wall, evenly or randomly spaced; optional striations and peripheral nuclei; band: own [a, b]; spark/trace: record the lines for the spark or contract motion
      if (o.band) { a = o.band[0]; b = o.band[1]; }
      for (let k = 0; k < (o.n || 6); k++) {
        const lv = o.even ? a + (b - a) * (k + .5) / o.n : P.R(a, b);
        const wv = [o.amp == null ? 2 : o.amp, P.R(o.per[0], o.per[1]), P.R(0, 6)], ds = o.dash || [40, 110, P.R(6, 18)]; // dash: [min, max, gap] (short gaps read as intercalated discs)
        P.line(lv, o.stroke, o.w || 1.4, { wave: wv, dash: `${P.R(ds[0], ds[1]) | 0} ${n1(ds[2])}`, off: P.R(0, 60) | 0 });
        if (o.striate) P.line(lv, o.striate, o.sw || (o.w || 1.4) * 1.6, { wave: wv, dash: o.sdash || '1.2 3' }); // sdash: striation pattern (skeletal: dark A band, pale I band)
        if (o.nuclei) for (const sd of [-1, 1]) { const nu = o.nuclei; along(P.C(lv + sd * ((o.w || 1.4) / 2 - nu.size[1]) / U), P.R.bind(null, 0, 1), nu.every[0], nu.every[1], (p, t) => { // peripheral nuclei, flat against the fiber edge
          P.push(`<ellipse cx="${n1(p[0])}" cy="${n1(p[1])}" rx="${nu.size[0]}" ry="${nu.size[1]}" transform="rotate(${deg(t)} ${n1(p[0])} ${n1(p[1])})" fill="${nu.fill}"/>`); c.tag(nu.tag, p[0], p[1]); }); }
        if ((o.spark || o.trace) && c) for (const l of P.C(lv)) if (l.length > 8) c.axons.push(l.map(q => [q[0] / U - c.M, q[1] / U - c.M]));
      }
      if (o.branch) P.scatter(a, b, o.branch, (X, Y, t) => { // short oblique strokes joining neighbouring fibers (branching)
        const an = (t + (P.R(0, 1) < .5 ? -1 : 1) * P.R(18, 32)) * .01745, l = P.R(14, 26), bx = X + Math.cos(an) * l, by = Y + Math.sin(an) * l;
        P.push(`<path fill="none" stroke="${o.stroke}" stroke-width="${o.w || 1.4}" stroke-linecap="round" d="M${n1(X)},${n1(Y)} L${n1(bx)},${n1(by)}"/>`);
      });
    },
    lamellae(P, o, a, b, c) { // concentric rings around a central canal
      // optional: pack (no overlap with other packed shapes), fill, cells (cells in lacunae between rings, with canaliculi), vessel (red cells in the canal),
      // cement (outer cement line), remnant (partial arcs with no canal: interstitial lamellae, the leftovers of remodelled osteons)
      const placed = c.packed = c.packed || [], rings = o.rings || 4;
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.r[0], o.r[1]); if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + r / U)) return;
        if (o.pack) { if (placed.some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + r + 1)) return; placed.push([X, Y, r]); }
        let s = o.fill ? `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r)}" fill="${o.fill}"/>` : '';
        const t0 = P.R(0, 360), span = o.remnant ? P.R(110, 210) : 360;
        for (let k = 1; k <= rings; k++) {
          const rk = r * k / rings;
          if (o.remnant) { const a0 = t0 * .01745, a1 = (t0 + span) * .01745; s += `<path fill="none" stroke="${o.stroke}" stroke-width="${o.w || 1.2}" d="M${n1(X + Math.cos(a0) * rk)},${n1(Y + Math.sin(a0) * rk)} A${n1(rk)},${n1(rk)} 0 ${span > 180 ? 1 : 0} 1 ${n1(X + Math.cos(a1) * rk)},${n1(Y + Math.sin(a1) * rk)}"/>`; }
          else s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(rk)}" fill="none" stroke="${o.stroke}" stroke-width="${o.w || 1.2}"/>`;
        }
        if (o.cement) s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r + .8)}" fill="none" stroke="${o.cement}" stroke-width="1.4"/>`;
        if (o.cells) for (let k = 1; k < rings; k++) for (let j = 0, n = Math.round(o.cells.per * k); j < n; j++) { // lacunae sit between lamellae, long axis along the ring; canaliculi run across the rings
          if (o.remnant && P.R(0, 1) < .5) continue;
          const an = o.remnant ? (t0 + P.R(0, span)) * .01745 : P.R(0, 6.28), rr = r * (k + .5) / rings, lx = X + Math.cos(an) * rr, ly = Y + Math.sin(an) * rr, rot = deg(an * 57.2958 + 90);
          for (let q = 0; q < 4; q++) { const d = (q < 2 ? -1 : 1) * P.R(5, 10), sp = P.R(-.35, .35); s += `<line x1="${n1(lx)}" y1="${n1(ly)}" x2="${n1(lx + Math.cos(an + sp) * d)}" y2="${n1(ly + Math.sin(an + sp) * d)}" stroke="${o.cells.canaliculi}" stroke-width=".7"/>`; }
          s += `<ellipse cx="${n1(lx)}" cy="${n1(ly)}" rx="${n1(o.cells.size[0])}" ry="${n1(o.cells.size[1])}" transform="rotate(${rot} ${n1(lx)} ${n1(ly)})" fill="${o.cells.lacuna}"/>` +
            `<ellipse cx="${n1(lx)}" cy="${n1(ly)}" rx="${n1(o.cells.size[0] * .6)}" ry="${n1(o.cells.size[1] * .55)}" transform="rotate(${rot} ${n1(lx)} ${n1(ly)})" fill="${o.cells.fill}"/>`;
          c.tag(o.cells.tag, lx, ly);
        }
        if (!o.remnant) {
          const cr = r * (o.canalR || .18); s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(cr)}" fill="${o.canal || 'rgba(20,8,12,.6)'}"/>`;
          for (let k = 0; k < (o.vessel || 0); k++) { const an = P.R(0, 6.28), d = P.R(0, cr * .4); s += `<ellipse cx="${n1(X + Math.cos(an) * d)}" cy="${n1(Y + Math.sin(an) * d)}" rx="${n1(cr * .32)}" ry="${n1(cr * .24)}" fill="url(#rbc)"/>`; }
          if (o.canalTag) c.tag(o.canalTag, X, Y);
        }
        P.push(s); c.tag(o.tag, X, Y);
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
          if (!on || (o.hub === false && hub) || (o.hub === true && !hub) || (P.mask && !P.mask(p[0], p[1]))) continue;
          const t = Math.atan2(p[1] - q[1], p[0] - q[0]), nv = normalAt(c.fd, p[0], p[1]);
          const X = p[0] - nv[0] * h / 2, Y = p[1] - nv[1] * h / 2, side = -Math.sin(t) * nv[0] + Math.cos(t) * nv[1] > 0 ? 1 : -1; // +y local toward the wall
          let nu;
          if (o.shape === 'squamous') nu = `<ellipse cx="0" cy="0" rx="${n1(w * .3)}" ry="${n1(h * .32)}" fill="${o.nucleus}"/>`;
          else if (o.shape === 'columnar') nu = `<ellipse cx="0" cy="${n1(side * h * .22)}" rx="${n1(w * .22)}" ry="${n1(h * .2)}" fill="${o.nucleus}"/>`;
          else nu = `<circle cx="0" cy="0" r="${n1(Math.min(w, h) * .3)}" fill="${o.nucleus}"/>`;
          let ex = ''; // optional: foamy cytoplasm (pale vacuoles), cilia on the apical (floor) side
          if (o.foam) for (let k = 0; k < o.foam; k++) ex += `<circle cx="${n1(P.R(-w, w) * .32)}" cy="${n1(-side * P.R(0, h * .32))}" r="${n1(P.R(1.2, 2))}" fill="rgba(255,250,246,.5)"/>`;
          if (o.cilia) for (let k = 0, n = Math.max(2, (w / 3) | 0); k < n; k++) { const cx = n1(-w / 2 + (k + .5) * w / n); ex += `<line x1="${cx}" y1="${n1(-side * h / 2)}" x2="${n1(+cx + P.R(-1.5, 1.5))}" y2="${n1(-side * (h / 2 + o.cilia))}" stroke="${o.ciliaStroke || o.fill}" stroke-width=".8"/>`; }
          P.push(`<g transform="translate(${n1(X)} ${n1(Y)}) rotate(${deg(t * 57.2958)})"><rect x="${n1(-w / 2)}" y="${n1(-h / 2)}" width="${w}" height="${h}" rx="${n1(Math.min(w, h) * .4)}" fill="${o.fill}"/>${nu}${ex}</g>`);
          c.tag(o.tag, X, Y);
        }
      }
    },
    nuclei(P, o, a, b, c) { // scatter by shape: round, flat, elongated, lobed; optional cytoplasm or lacuna with canaliculi; granules in the cytoplasm; eccentric nucleus with clock-face chromatin
      P.scatter(a, b, o.per, (X0, Y0, t) => {
        const r = P.R(o.size[0], o.size[1]), cr = o.cell ? P.R(o.cell[0], o.cell[1]) : r;
        if (!fits(c.fd, X0, Y0, a, b, (o.inset || 0) + cr / U)) return;
        let s = '', X = X0, Y = Y0;
        if (o.cell) s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(cr)}" fill="${o.cellFill}"/>`;
        if (o.granules) for (let k = 0, gr = o.granules; k < gr.n; k++) { const an = P.R(0, 6.283), q = Math.sqrt(P.R(0, 1)) * cr * .85; s += `<circle cx="${n1(X + Math.cos(an) * q)}" cy="${n1(Y + Math.sin(an) * q)}" r="${n1(P.R(gr.r[0], gr.r[1]))}" fill="${gr.fill}"/>`; }
        if (o.eccentric) { const an = P.R(0, 6.283); X += Math.cos(an) * cr * o.eccentric; Y += Math.sin(an) * cr * o.eccentric; s += `<circle cx="${n1(X0 - (X - X0) * .9)}" cy="${n1(Y0 - (Y - Y0) * .9)}" r="${n1(cr * .3)}" fill="rgba(240,226,246,.22)"/>`; } // the pale Golgi beside the nucleus
        const rot = n1(t + P.R(-15, 15)), tr = `transform="rotate(${rot} ${n1(X)} ${n1(Y)})"`;
        if (o.lacuna) {
          s += `<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="${n1(r * 1.9)}" ry="${n1(r * .95)}" ${tr} fill="${o.lacuna}"/>`;
          if (o.canaliculi) for (let k = 0; k < 6; k++) { const an = P.R(0, 6.28), l = P.R(8, 14); s += `<line x1="${n1(X)}" y1="${n1(Y)}" x2="${n1(X + Math.cos(an) * l)}" y2="${n1(Y + Math.sin(an) * l)}" stroke="${o.canaliculi}" stroke-width=".8"/>`; }
        }
        if (o.shape === 'lobed') { s += `<g fill="${o.fill}" opacity="${o.opacity || 1}">`; for (let k = 0, n = P.R(3, 5.99) | 0; k < n; k++) { const an = k / n * 6.28 + P.R(-.3, .3); s += `<circle cx="${n1(X + Math.cos(an) * r * .55)}" cy="${n1(Y + Math.sin(an) * r * .55)}" r="${n1(r * .55)}"/>`; } s += '</g>'; }
        else { const ry = o.shape === 'flat' ? r * .3 : o.shape === 'elongated' ? r * .55 : r; s += `<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="${n1(r)}" ry="${n1(ry)}" ${tr} fill="${o.fill}"/>`; }
        if (o.clock) for (let k = 0; k < o.clock.n; k++) { const an = k / o.clock.n * 6.283 + P.R(-.3, .3); s += `<circle cx="${n1(X + Math.cos(an) * r * .62)}" cy="${n1(Y + Math.sin(an) * r * .62)}" r="${n1(r * .26)}" fill="${o.clock.fill}"/>`; } // chromatin clumps at the rim
        P.push(s); c.tag(o.tag, X, Y);
      });
    },
    vacuoles(P, o, a, b, c) { // empty round cells (adipocytes): thin rim, a flattened nucleus pushed to the edge
      const placed = [];
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.r[0], o.r[1]); if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + r / U)) return;
        if (placed.some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + r - 2) || (o.pack && (c.packed || []).some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + r + 1))) return; // pack: keep clear of packed shapes
        placed.push([X, Y, r]);
        let s = `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r)}" fill="${o.fill || 'none'}" stroke="${o.stroke}" stroke-width="1.3"/>`;
        if (o.nucleus && P.R(0, 1) < .5) { const an = P.R(0, 6.28), nx = X + Math.cos(an) * r * .86, ny = Y + Math.sin(an) * r * .86; s += `<ellipse cx="${n1(nx)}" cy="${n1(ny)}" rx="${n1(r * .32)}" ry="${n1(r * .12)}" transform="rotate(${deg(an * 57.2958 + 90)} ${n1(nx)} ${n1(ny)})" fill="${o.nucleus}"/>`; }
        P.push(s); c.tag(o.tag, X, Y);
      });
    },
    crossSections(P, o, a, b, c) { // tubes or vessels cut across: wall ring, lumen, flat wall nuclei, optional red cells
      // optional: pack (no overlap with other packed sections), brush (fuzzy apical border), borders (lateral cell borders across the wall)
      const placed = c.packed = c.packed || [];
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.r[0], o.r[1]), ww = o.ww || 2; if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + r / U)) return;
        if (o.pack) { const R0 = r + ww / 2; if (placed.some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + R0 + 1)) return; placed.push([X, Y, R0]); }
        let s = `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r)}" fill="${o.lumen}" stroke="${o.wall}" stroke-width="${ww}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
        if (o.brush) s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r - ww / 2 - 1)}" fill="none" stroke="${o.brush}" stroke-width="2.4" stroke-dasharray=".9 .9"/>`;
        if (o.feet) { // astrocyte end-feet clasping the outside of the wall, with the odd astrocyte nearby sending a process to it
          const fr = r + ww / 2 + o.feet.w / 2; s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(fr)}" fill="none" stroke="${o.feet.fill}" stroke-width="${o.feet.w}" stroke-dasharray="${o.feet.dash || '5 1.6'}"/>`;
          if (P.R(0, 1) < (o.feet.astro || 0)) {
            const an = P.R(0, 6.28), d = fr + P.R(12, 18), ax = X + Math.cos(an) * d, ay = Y + Math.sin(an) * d;
            for (let k = 0; k < 5; k++) { const b2 = k ? P.R(0, 6.28) : an + Math.PI, l = k ? P.R(7, 13) : d - fr; s += `<line x1="${n1(ax)}" y1="${n1(ay)}" x2="${n1(ax + Math.cos(b2) * l)}" y2="${n1(ay + Math.sin(b2) * l)}" stroke="${o.feet.fill}" stroke-width="1.1"/>`; }
            s += `<ellipse cx="${n1(ax)}" cy="${n1(ay)}" rx="3.4" ry="2.8" fill="${o.feet.nucleus}"/>`; c.tag(o.feet.tag, ax, ay);
          }
        }
        if (o.borders) for (let k = 0, t0 = P.R(0, 6.28); k < o.borders; k++) { const an = t0 + k / o.borders * 6.283, ca = Math.cos(an), sa = Math.sin(an), r0 = r - ww / 2, r1 = r + ww / 2; s += `<line x1="${n1(X + ca * r0)}" y1="${n1(Y + sa * r0)}" x2="${n1(X + ca * r1)}" y2="${n1(Y + sa * r1)}" stroke="${o.borderStroke}" stroke-width=".9"/>`; }
        if (o.central) s += `<circle cx="${n1(X + P.R(-1, 1))}" cy="${n1(Y + P.R(-1, 1))}" r="${n1(o.central)}" fill="${o.nucleus}"/>`; // optional: one round central nucleus (cells cut across)
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
        const pk = c.packed = c.packed || [];
        if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + R0 / U) || placed.some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + R0) || (o.pack && pk.some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + R0 + 1))) return;
        placed.push([X, Y, R0]); if (o.pack) pk.push([X, Y, R0]);
        const t = P.R(0, 6.283), ct = Math.cos(t), st = Math.sin(t), at = (lx, ly2) => [X + ct * lx - st * ly2, Y + st * lx + ct * ly2];
        const gx = ce ? -r * sx * (ce.off || 0) : 0, gr = ce ? r * ce.r : 0, ax = ar ? r * sx * (ar.off || 0) : 0;
        let s = `<g transform="translate(${n1(X)} ${n1(Y)}) rotate(${deg(t * 57.2958)})">`;
        if (m) s += `<ellipse rx="${n1(r * sx + mz)}" ry="${n1(r + mz)}" fill="${m.fill}"/>`;
        if (o.rim) { // optional outer rim with flat nuclei along it (Bowman's capsule, parietal layer)
          s += `<ellipse rx="${n1(r * sx + mz)}" ry="${n1(r + mz)}" fill="none" stroke="${o.rim.stroke}" stroke-width="${o.rim.w}"/>`;
          for (let k = 0, n = o.rim.nuclei; k < n; k++) { const an = (k + P.R(0, .6)) / n * 6.283; s += `<ellipse cx="${n1(Math.cos(an) * (r * sx + mz))}" cy="${n1(Math.sin(an) * (r + mz))}" rx="5" ry="1.6" transform="rotate(${deg(an * 57.2958 + 90)} ${n1(Math.cos(an) * (r * sx + mz))} ${n1(Math.sin(an) * (r + mz))})" fill="${o.rim.nucleus}"/>`; }
        }
        s += `<ellipse rx="${n1(r * sx)}" ry="${n1(r)}" fill="${o.fill}"/>`;
        if (o.loops) for (let k = 0, lp = o.loops, n = Math.round(Math.PI * r * r * sx / (U * U) * lp.per); k < n; k++) { // optional capillary loops packed in the nodule (glomerular tuft)
          const an = P.R(0, 6.283), rr = P.R(lp.r[0], lp.r[1]), q = Math.sqrt(P.R(0, 1)), x2 = Math.cos(an) * (r * sx - rr) * q, y2 = Math.sin(an) * (r - rr) * q;
          s += `<circle cx="${n1(x2)}" cy="${n1(y2)}" r="${n1(rr)}" fill="${lp.lumen}" stroke="${lp.wall}" stroke-width="1.3"/>` + (P.R(0, 1) < lp.rbc ? `<ellipse cx="${n1(x2)}" cy="${n1(y2)}" rx="${n1(rr * .7)}" ry="${n1(rr * .5)}" fill="url(#rbc)" opacity=".8"/>` : '');
        }
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
    somata(P, o, a, b, c) { // neuron cell bodies: pyramidal or round soma with Nissl granules, a large pale nucleus with a dark nucleolus, dendrites and an axon
      const placed = [];
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.size[0], o.size[1]); if (!fits(c.fd, X, Y, a, b, (o.inset || 0) + r * 1.7 / U)) return;
        if (placed.some(q => Math.hypot(q[0] - X, q[1] - Y) < q[2] + r * 1.7)) return; placed.push([X, Y, r * 1.7]);
        const pyr = o.shape === 'pyramidal', t = P.R(0, 360), dl = o.dendrites || {};
        let s = `<g transform="translate(${n1(X)} ${n1(Y)}) rotate(${deg(t)})" opacity="${o.opacity || 1}"><g stroke="${dl.stroke || o.fill}" stroke-width="${dl.w || 2}" fill="none" stroke-linecap="round">`;
        if (pyr) s += `<path d="M0,${n1(-r * 1.4)} Q${n1(P.R(-2, 2))},${n1(-r * 2.6)} ${n1(P.R(-4, 4))},${n1(-r * 3.6)}"/>`; // apical dendrite
        for (let k = 0, n = pyr ? 2 : (dl.n || 4); k < n; k++) { const an = pyr ? (k ? 2.4 : .74) : k / n * 6.28 + P.R(-.4, .4), x0 = Math.cos(an) * r * .9, y0 = Math.sin(an) * r * .9, l = r * P.R(1.4, 2.2); s += `<path d="M${n1(x0)},${n1(y0)} Q${n1(x0 + Math.cos(an) * l * .5 + P.R(-3, 3))},${n1(y0 + Math.sin(an) * l * .5 + P.R(-3, 3))} ${n1(x0 + Math.cos(an) * l)},${n1(y0 + Math.sin(an) * l)}"/>`; }
        s += `<path stroke-width="${n1((dl.w || 2) * .55)}" d="M0,${n1(r * .9)} L${n1(P.R(-2, 2))},${n1(r * 2.4)}"/></g>`; // axon from the hillock
        s += pyr ? `<path fill="${o.fill}" d="M0,${n1(-r * 1.5)} Q${n1(r * .5)},${n1(-r * .3)} ${n1(r * 1.05)},${n1(r * .75)} Q0,${n1(r * 1.05)} ${n1(-r * 1.05)},${n1(r * .75)} Q${n1(-r * .5)},${n1(-r * .3)} 0,${n1(-r * 1.5)}Z"/>` : `<circle r="${n1(r)}" fill="${o.fill}"/>`;
        const nr = r * .46, ny = pyr ? r * .1 : 0;
        for (let k = 0, n = o.nissl ? o.nissl.n : 0; k < n; k++) { const an = P.R(0, 6.28), q = P.R(nr + 1.2, r * .92), gx = Math.cos(an) * q, gy = ny + Math.sin(an) * q; if (gy > r * .7 && Math.abs(gx) < r * .3) continue; s += `<circle cx="${n1(gx)}" cy="${n1(gy)}" r="${n1(P.R(.7, 1.3))}" fill="${o.nissl.fill}"/>`; } // none in the axon hillock
        s += `<circle cy="${n1(ny)}" r="${n1(nr)}" fill="${o.nucleus}"/><circle cx="${n1(P.R(-1, 1))}" cy="${n1(ny + P.R(-1, 1))}" r="${n1(Math.max(1.2, nr * .28))}" fill="${o.nucleolus}"/></g>`;
        P.push(s); c.tag(o.tag, X, Y);
      });
    },
    strands(P, o, a, b, c) { // loose fibers and collagen; optional head: a dark knob at one end (sperm: head and tail)
      P.scatter(a, b, o.per, (X, Y) => {
        const an = P.R(0, 6.28), l = P.R(o.len[0], o.len[1]), bx = X + Math.cos(an) * l, by = Y + Math.sin(an) * l, h = o.head;
        if (h && !fits(c.fd, X, Y, a, b, (h.inset || 0) + l / U)) return;
        let s = `<path fill="none" stroke="${o.stroke}" stroke-width="${o.w || 1.2}" d="M${n1(X)},${n1(Y)} Q${n1((X + bx) / 2 + P.R(-l, l) * .3)},${n1((Y + by) / 2 + P.R(-l, l) * .3)} ${n1(bx)},${n1(by)}"/>`;
        if (h) s += `<ellipse cx="${n1(X - Math.cos(an) * h.rx)}" cy="${n1(Y - Math.sin(an) * h.rx)}" rx="${h.rx}" ry="${h.ry}" transform="rotate(${deg(an * 57.2958)} ${n1(X - Math.cos(an) * h.rx)} ${n1(Y - Math.sin(an) * h.rx)})" fill="${h.fill}"/>`;
        P.push(s); c.tag(o.tag, X, Y);
      });
    },
    fingers(P, o, a, b, c) { // finger-like folds rooted on the edge: out into the floor (villi) or in into the wall (crypts, glands)
      const out = o.dir !== 'in', e = o.epi, cover = o.cover == null ? 1 : o.cover;
      along(P.C(o.at || 0), P.R.bind(null, 0, 1), o.every[0], o.every[1], (p, t) => {
        if (P.R(0, 1) > cover) return;
        const nv = normalAt(c.fd, p[0], p[1]), d = out ? [-nv[0], -nv[1]] : nv, hw = P.R(o.width[0], o.width[1]) / 2;
        let L = P.R(o.len[0], o.len[1]) * U; const tip = l => sdU(c.fd, p[0] + d[0] * l, p[1] + d[1] * l);
        if (out) { if (tip(L) > -L / U * .75) L *= .55; if (tip(L) > -L / U * .75) return; } // keep villi off the far side of narrow passages
        else if (tip(L) < (o.at || 0) + L / U * .7 || tip(L) > (o.max != null ? o.max : b)) return;
        const bend = P.R(-1, 1) * (o.bend || 0) * hw, rot = Math.atan2(d[1], d[0]) * 57.2958 - 90;
        const shape = (w, l, y0) => `M${n1(-w)},${n1(y0)}C${n1(-w)},${n1(l * .6)} ${n1(-w * .9 + bend)},${n1(l)} ${n1(bend)},${n1(l)}C${n1(w * .9 + bend)},${n1(l)} ${n1(w)},${n1(l * .6)} ${n1(w)},${n1(y0)}Z`;
        let s = `<g transform="translate(${n1(p[0])} ${n1(p[1])}) rotate(${deg(rot)})"><path d="${shape(hw, L, -e)}" fill="${o.epiFill}"${o.rim ? ` stroke="${o.rim}" stroke-width="${o.rimW || 2}"${o.rimDash ? ` stroke-dasharray="${o.rimDash}"` : ''}` : ''}/>`;
        s += `<path d="${shape(hw - e, L - e, -e)}" fill="${o.coreFill}"/>`;
        for (const sd of [-1, 1]) for (let y = e * .2; y < L - e * 1.2; y += P.R(4.5, 6)) { // columnar nuclei, toward the basement membrane
          const x = sd * (hw - e * .68) + bend * Math.pow(y / L, 2); s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(e * .16)}" ry="1.8" fill="${o.nucleus}"/>`;
        }
        for (let k = 0, n = P.R(o.goblets[0], o.goblets[1] + .99) | 0; k < n; k++) { // goblet cells: pale mucin cups in the epithelium
          const y = P.R(e, L - e * 1.5), sd = P.R(0, 1) < .5 ? -1 : 1; s += `<ellipse cx="${n1(sd * (hw - e * .45) + bend * Math.pow(y / L, 2))}" cy="${n1(y)}" rx="${n1(e * .36)}" ry="${n1(e * .7)}" fill="${o.goblet}"/>`;
        }
        if (o.core && o.loop) { const g = hw * .32; s += `<path d="M${n1(-g)},${n1(-e)} Q${n1(-g + bend * .3)},${n1(L * .6)} ${n1(bend * .8)},${n1(L - e * 1.8)} Q${n1(g + bend * .3)},${n1(L * .6)} ${n1(g)},${n1(-e)}" fill="none" stroke="${o.core}" stroke-width="${o.coreW || 2.4}" stroke-linecap="round"/>`; } // loop: the core vessel is a hairpin (capillary loop)
        else if (o.core) s += `<path d="M0,${n1(e)} Q${n1(bend * .3)},${n1(L * .6)} ${n1(bend * .8)},${n1(L - e * 1.6)}" fill="none" stroke="${o.core}" stroke-width="${o.coreW || 2.4}" stroke-linecap="round"/>`;
        const tp = o.tip, hasTip = tp && P.R(0, 1) < tp.chance; // tip: an encapsulated ovoid near the blind end, its cells stacked across it (tactile corpuscle)
        if (hasTip) { const ty = L - e - tp.ry * 1.1, tx = bend * Math.pow(ty / L, 2) * .8; s += `<ellipse cx="${n1(tx)}" cy="${n1(ty)}" rx="${tp.rx}" ry="${tp.ry}" fill="${tp.fill}" stroke="${tp.stroke}" stroke-width="1"/>`; for (let k = 1; k < tp.n; k++) { const y = ty - tp.ry + 2 * tp.ry * k / tp.n, w = tp.rx * Math.sqrt(1 - Math.pow((y - ty) / tp.ry, 2)) * .85; s += `<path d="M${n1(tx - w)},${n1(y)} Q${n1(tx)},${n1(y + 1.2)} ${n1(tx + w)},${n1(y)}" fill="none" stroke="${tp.stroke}" stroke-width=".8"/>`; } }
        if (o.base) for (let k = 0; k < o.base.n; k++) { // cells at the blind end (crypt base: Paneth cells with eosinophilic granules)
          const an = (k / Math.max(1, o.base.n - 1) - .5) * 2.2, x = bend + Math.sin(an) * (hw - e * .45), y = L - e * .6 - (1 - Math.cos(an)) * e * .8;
          s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(e * .42)}" fill="${o.base.fill}"/>`; for (let g = 0; g < 3; g++) s += `<circle cx="${n1(x + P.R(-1.6, 1.6))}" cy="${n1(y + P.R(-1.6, 1.6))}" r=".9" fill="${o.base.granule}"/>`;
        }
        P.push(s + '</g>');
        c.tag(o.tag, p[0] + d[0] * L * .55, p[1] + d[1] * L * .55);
        if (o.core && o.coreTag) c.tag(o.coreTag, p[0] + d[0] * L * .5, p[1] + d[1] * L * .5);
        if (o.base && o.base.tag) c.tag(o.base.tag, p[0] + d[0] * L * .9, p[1] + d[1] * L * .9);
        if (hasTip) c.tag(tp.tag, p[0] + d[0] * L * .8, p[1] + d[1] * L * .8);
      });
    },
    bundle(P, o, a, b, c) { // an encapsulated bundle cut across: capsule rings around packed small profiles (nerve fascicle in its perineurium, muscle spindle); max: at most this many
      let n = 0;
      P.scatter(a, b, o.per, (X, Y) => {
        const r = P.R(o.r[0], o.r[1]); if ((o.max && n >= o.max) || !fits(c.fd, X, Y, a, b, (o.inset || 0) + r / U)) return; n++;
        let s = `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r)}" fill="${o.fill}"/>`;
        for (let k = 0; k < (o.rings || 1); k++) s += `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(r - k * 2.2)}" fill="none" stroke="${o.stroke}" stroke-width="${o.w || 1.2}"/>`;
        const q = o.inner, pts = [], R0 = r - (o.rings || 1) * 2.2 - .5;
        for (let t = 0; t < q.n * 30 && pts.length < q.n; t++) { const an = P.R(0, 6.28), d = Math.sqrt(P.R(0, 1)) * R0, rr = P.R(q.r[0], q.r[1]), x = X + Math.cos(an) * d, y = Y + Math.sin(an) * d; if (d + rr > R0 || pts.some(p => Math.hypot(p[0] - x, p[1] - y) < p[2] + rr + (q.gap || .6))) continue; pts.push([x, y, rr]); }
        for (const [x, y, rr] of pts) {
          s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rr)}" fill="${q.fill}" stroke="${q.stroke}" stroke-width="${q.w || .9}"/>`;
          for (let k = 0; k < (q.nuclei || 0); k++) { const an = P.R(0, 6.28), d = q.central ? P.R(0, rr * .45) : rr - 1; s += `<circle cx="${n1(x + Math.cos(an) * d)}" cy="${n1(y + Math.sin(an) * d)}" r="${q.nr || 1.4}" fill="${q.nucleus}"/>`; }
        }
        for (let k = 0; k < (o.nuclei || 0); k++) { const an = P.R(0, 6.28), d = P.R(0, R0); s += `<ellipse cx="${n1(X + Math.cos(an) * d)}" cy="${n1(Y + Math.sin(an) * d)}" rx="2.4" ry="1.3" transform="rotate(${P.R(0, 180) | 0} ${n1(X + Math.cos(an) * d)} ${n1(Y + Math.sin(an) * d)})" fill="${o.nucleus}"/>`; } // Schwann or fibroblast nuclei between the profiles
        P.push(s); c.tag(o.tag, X, Y);
      });
    },
    endings(P, o, a, b, c) { // nerve endings on the wall surface: a twig from the nerve at level `from` to the edge, ending in a cluster of terminal boutons (motor end plate)
      along(P.C(o.from), P.R.bind(null, 0, 1), o.every[0], o.every[1], p => {
        const nv = normalAt(c.fd, p[0], p[1]), d = (-o.from + o.depth) * U, ex = p[0] + nv[0] * d, ey = p[1] + nv[1] * d;
        if (Math.abs(sdU(c.fd, ex, ey) - o.depth) > .12) return;
        const mx = (p[0] + ex) / 2 + nv[1] * P.R(-6, 6), my = (p[1] + ey) / 2 - nv[0] * P.R(-6, 6);
        let s = `<path fill="none" stroke="${o.stroke}" stroke-width="${o.w || 1.4}" d="M${n1(p[0])},${n1(p[1])} Q${n1(mx)},${n1(my)} ${n1(ex)},${n1(ey)}"/>`;
        if (o.cell) { const ex2 = ex + nv[0] * o.cell.ry * .8, ey2 = ey + nv[1] * o.cell.ry * .8; s += `<ellipse cx="${n1(ex2)}" cy="${n1(ey2)}" rx="${o.cell.rx}" ry="${o.cell.ry}" transform="rotate(${deg(Math.atan2(nv[1], nv[0]) * 57.2958 + 90)} ${n1(ex2)} ${n1(ey2)})" fill="${o.cell.fill}"/>`; } // optional: the cell the ending contacts (tactile epithelial cell, a disc beneath it)
        for (let k = 0; k < o.boutons; k++) { const an = P.R(0, 6.28), dd = P.R(1, 6); s += `<circle cx="${n1(ex + Math.cos(an) * dd)}" cy="${n1(ey + Math.sin(an) * dd)}" r="${n1(P.R(1.4, 2.4))}" fill="${o.fill}"/>`; }
        P.push(s); c.tag(o.tag, ex, ey);
      });
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

  function buildFloor(f, regionId, idx, seed, plaza) {
    const prof = DD.data.tissue && DD.data.tissue[regionId];
    if (!f || !prof || (f.tiles && !plaza) || !can()) return null;
    const have = store.get(f); if (have) return have;
    const st = S(), sf = st.floor, D = prof.depth[Math.min(idx, prof.depth.length - 1)], next = prof.depth[idx + 1];
    const G = floorGrid(f), M = G.M, TW = G.W + 2 * M, TH = G.H + 2 * M, Wu = TW * U, Hu = TH * U, cap = sf.cap;
    const r = DD.rng((seed ^ hash(regionId + ':' + idx)) >>> 0), fd = pin(field(G, G.walk, cap), G, G.walk, sf.pin), P = painter(fd, r, Wu, Hu);
    const anchors = {}, sinus = [], axons = [];
    const hubRoom = D.hub && f.exit ? (f.rooms || []).find(m => f.exit.x >= m.x && f.exit.x < m.x + m.w && f.exit.y >= m.y && f.exit.y < m.y + m.h) : null;
    const hb = hubRoom && [(hubRoom.x + M - .6) * U, (hubRoom.y + M - .6) * U, (hubRoom.x + hubRoom.w + M + .6) * U, (hubRoom.y + hubRoom.h + M + .6) * U];
    const c = { fd, sinus, axons, M, tag: (k, X, Y) => { if (k) (anchors[k] = anchors[k] || []).push([X, Y]); }, inHub: (X, Y) => !!hb && X >= hb[0] && X <= hb[2] && Y >= hb[1] && Y <= hb[3] };
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
      P.push(`<path fill="${pf.lumen}" stroke="${pf.wall}" stroke-width="${pf.ww || 2.4}"${pf.dash ? ` stroke-dasharray="${pf.dash}"` : ''} d="${pathD(L)}"/>`);
      const pn = pf.nr || [6, 1.8];
      along(L, r, pf.every ? pf.every[0] : 26, pf.every ? pf.every[1] : 48, (p, t) => P.push(`<ellipse cx="${n1(p[0])}" cy="${n1(p[1])}" rx="${pn[0]}" ry="${pn[1]}" transform="rotate(${deg(t)} ${n1(p[0])} ${n1(p[1])})" fill="${pf.nucleus}"/>`));
      for (let k = 0; k < cells.length * pf.rbc; k++) { const X = (P.R(box[0], box[2] + 1) + M) * U, Y = (P.R(box[1], box[3] + 1) + M) * U; if (sdU(pfd, X, Y) < -.15) P.push(`<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="6" ry="${n1(P.R(3, 6))}" transform="rotate(${P.R(0, 180) | 0} ${n1(X)} ${n1(Y)})" fill="url(#rbc)"/>`); }
      c.tag(pf.tag, (box[0] + box[2] + 1) / 2 * U + M * U, (box[1] + box[3] + 1) / 2 * U + M * U);
      const tu = pf.tuft; // optional tuft of capillary loops inside the pillar (renal corpuscle: glomerulus inside Bowman's space)
      if (tu) {
        P.push(`<path fill="${tu.fill}" d="${pathD(contours(pfd, -tu.inset))}"/>`);
        for (let k = 0, n = Math.max(4, Math.round(cells.length * tu.per)); k < n; k++) { const X = (P.R(box[0], box[2] + 1) + M) * U, Y = (P.R(box[1], box[3] + 1) + M) * U, rr = P.R(tu.r[0], tu.r[1]); if (sdU(pfd, X, Y) > -tu.inset - rr / U) continue; P.push(`<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(rr)}" fill="${tu.lumen}" stroke="${tu.wall}" stroke-width="1.3"/>` + (P.R(0, 1) < tu.rbc ? `<ellipse cx="${n1(X)}" cy="${n1(Y)}" rx="${n1(rr * .7)}" ry="${n1(rr * .5)}" fill="url(#rbc)" opacity=".8"/>` : '')); }
        for (let k = 0, n = Math.round(cells.length * tu.nuclei); k < n; k++) { const X = (P.R(box[0], box[2] + 1) + M) * U, Y = (P.R(box[1], box[3] + 1) + M) * U; if (sdU(pfd, X, Y) < -tu.inset - .04) P.push(`<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(P.R(1.8, 2.6))}" fill="${pf.nucleus}"/>`); }
        c.tag(tu.tag, (box[0] + box[2] + 1) / 2 * U + M * U, (box[1] + box[3] + 1) / 2 * U + M * U + 4);
      }
      const co = pf.core; // optional inner core (hair follicle cut across: inner root sheath ring around the pigmented hair shaft)
      if (co) { const CL = contours(pfd, -co.inset); P.push(`<path fill="${co.fill}" stroke="${co.stroke}" stroke-width="${co.w}" d="${pathD(CL)}"/>`); if (CL.length) c.tag(co.tag, (box[0] + box[2] + 1) / 2 * U + M * U, (box[1] + box[3] + 1) / 2 * U + M * U); }
      const lb = pf.lobules; // optional gland lobules budding off one side (sebaceous gland on a follicle) and a smooth muscle strap below them (arrector pili)
      if (lb && L.length && L[0].length > 8) {
        const p = L[0][(P.R(0, 1) * L[0].length) | 0], g2 = grad(pfd, p[0], p[1]), t2 = [-g2[1], g2[0]], X = p[0] + g2[0] * lb.R * .7, Y = p[1] + g2[1] * lb.R * .7;
        let s = '';
        for (let k = 0; k < lb.n; k++) { const an = k / lb.n * 6.283 + P.R(-.3, .3), d = k ? lb.R * .55 : 0, x = X + Math.cos(an) * d, y = Y + Math.sin(an) * d, rr = P.R(lb.r[0], lb.r[1]); s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rr)}" fill="${lb.fill}" stroke="${lb.stroke}" stroke-width="1.2"/><circle cx="${n1(x + P.R(-1, 1))}" cy="${n1(y + P.R(-1, 1))}" r="1.8" fill="${lb.nucleus}"/>`; for (let q = 0; q < 4; q++) s += `<circle cx="${n1(x + P.R(-rr, rr) * .55)}" cy="${n1(y + P.R(-rr, rr) * .55)}" r="${n1(P.R(1.2, 2))}" fill="${lb.foam}"/>`; }
        P.push(s); c.tag(lb.tag, X, Y);
        const sp = pf.strap;
        if (sp) {
          const sd = P.R(0, 1) < .5 ? -1 : 1, a0 = [p[0] - t2[0] * sd * lb.R * 1.1, p[1] - t2[1] * sd * lb.R * 1.1], dir = [g2[0] * .6 + t2[0] * sd * .8, g2[1] * .6 + t2[1] * sd * .8], a1 = [a0[0] + dir[0] * sp.len, a0[1] + dir[1] * sp.len];
          let s2 = `<path fill="none" stroke="${sp.fill}" stroke-width="${sp.w}" stroke-linecap="round" d="M${n1(a0[0])},${n1(a0[1])} Q${n1((a0[0] + a1[0]) / 2 + g2[0] * 6)},${n1((a0[1] + a1[1]) / 2 + g2[1] * 6)} ${n1(a1[0])},${n1(a1[1])}"/>`;
          for (let k = 1; k <= sp.nuclei; k++) { const u = k / (sp.nuclei + 1), x = a0[0] + (a1[0] - a0[0]) * u + g2[0] * 3 * Math.sin(u * Math.PI), y = a0[1] + (a1[1] - a0[1]) * u + g2[1] * 3 * Math.sin(u * Math.PI); s2 += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="4" ry="1.3" transform="rotate(${deg(Math.atan2(dir[1], dir[0]) * 57.2958)} ${n1(x)} ${n1(y)})" fill="${sp.nucleus}"/>`; }
          P.push(s2); c.tag(sp.tag, (a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2);
        }
      }
      const md = pf.beside; // optional tubule cut across beside every Nth pillar, its wall nuclei crowded on the pillar side (macula densa)
      if (md && L.length && L[0].length > 8 && (G.pillars.indexOf(cells) % md.every) === 0) {
        const p = L[0][(L[0].length / 3) | 0], g2 = grad(pfd, p[0], p[1]), X = p[0] + g2[0] * md.r * .3, Y = p[1] + g2[1] * md.r * .3;
        let s = `<circle cx="${n1(X)}" cy="${n1(Y)}" r="${md.r}" fill="${md.lumen}" stroke="${md.wall}" stroke-width="${md.ww}"/>`;
        for (let k = 0; k < md.n; k++) { const an = Math.atan2(-g2[1], -g2[0]) + (k - (md.n - 1) / 2) * .34, nx = X + Math.cos(an) * md.r, ny = Y + Math.sin(an) * md.r; s += `<ellipse cx="${n1(nx)}" cy="${n1(ny)}" rx="1.6" ry="2.8" transform="rotate(${deg(an * 57.2958 + 90)} ${n1(nx)} ${n1(ny)})" fill="${pf.nucleus}"/>`; }
        P.push(s); c.tag(md.tag, X, Y);
      }
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
    const shedAt = []; // shed motion: spots on the surface at the motion's level, normal pointing away from the room
    if (D.motion && D.motion.type === 'shed') along(P.C(D.motion.at), r, U * .8, U * 1.6, p => { const nv = normalAt(fd, p[0], p[1]); shedAt.push({ x: p[0] / U - M, y: p[1] / U - M, nx: nv[0], ny: nv[1] }); });
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
    const art = { floorArt: true, kind: 'floor', regionId, D, G, M, f, fd, labels, ready: false, bmp: null, sinus, axons, shedAt, parts: [], last: 0, k, Wu, Hu };
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

  // ---------- lymph node towns (V13): DD.data.townTissue over the hand-built layout in data/townmap.js ----------
  // Open ground is every walkable or bump tile; zones come from the layout's legend. FOV stays off (towns are fully lit).
  // One bake is kept, keyed by accent and seed, so walking around a town never rebakes.
  let townCache = null;
  function buildTown(f, accent, seed) {
    const prof = DD.data.townTissue, TM = DD.data.townmap;
    if (!f || !prof || !TM || !can()) return null;
    const key = accent + ':' + seed;
    if (townCache && townCache.key === key) { townCache.art.f = f; return townCache.art; }
    const st = S(), sf = st.floor, W = f.W, H = f.H, M = 0, cap = sf.cap, Wu = W * U, Hu = H * U;
    const info = (x, y) => { const row = TM.rows[y]; return row && TM.legend[[...row][x]] || null; };
    const zoneOf = [], lum = new Uint8Array(W * H), chOf = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = info(x, y), i = y * W + x; zoneOf[i] = d && d.zone || ''; chOf[i] = f.g[y][x]; if (d && (d.walk || d.bump)) lum[i] = 1; }
    const inG = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const G = { W, H, M, lum, pillars: [], walk: (x, y) => inG(x, y) && lum[y * W + x] > 0 };
    const zoneAt = (X, Y) => { const x = Math.floor(X / U), y = Math.floor(Y / U); return inG(x, y) ? zoneOf[y * W + x] : ''; };
    const r = DD.rng((seed ^ hash('town:' + accent)) >>> 0), fd = pin(field(G, G.walk, cap), G, G.walk, sf.pin), P = painter(fd, r, Wu, Hu);
    const anchors = {}, c = { fd, sinus: [], axons: [], M, tag: (k, X, Y) => { if (k) (anchors[k] = anchors[k] || []).push([X, Y]); }, inHub: () => false };
    const tileSet = pred => { const out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pred(x, y)) out.push([x, y]); return out; };
    const zfield = (pred, lv) => contours(pin(field(G, (x, y) => inG(x, y) && pred(x, y), 2), G, (x, y) => inG(x, y) && pred(x, y), sf.pin), lv || 0);
    // walls: dense connective tissue, fat beyond. Tiles within 2 of the outside are capsule, the rest trabeculae.
    const outside = (x, y) => !inG(x, y) || f.g[y][x] === ' ';
    const nearOut = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (outside(x + dx, y + dy)) return true; return false; };
    for (const w of prof.walls) {
      P.band(w.band[0], w.band[1], w.fill); paint(P, w.painter, w.band[0], w.band[1], c);
      if (w.tag) along(P.C(w.band[0] + .5), r, U * 6, U * 10, p => { const x = Math.floor(p[0] / U), y = Math.floor(p[1] / U); c.tag(nearOut(x, y) ? 'capsule' : 'trabecula', p[0], p[1]); });
    }
    // follicles: wall islands around a germinal centre are the dark mantle zone of resting B cells
    const ml = prof.mantle, seen = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (lum[i] || seen[i] || f.g[(i / W) | 0][i % W] !== '#') continue;
      const q = [i], cells = []; let edge = false; seen[i] = 1;
      while (q.length) { const k = q.pop(), x = k % W, y = (k / W) | 0; cells.push(k); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (outside(a, b)) { edge = true; continue; } const j = b * W + a; if (!lum[j] && !seen[j] && f.g[b][a] === '#') { seen[j] = 1; q.push(j); } } }
      if (edge) continue;
      const set = new Set(cells), xs = cells.map(k => k % W), ys = cells.map(k => (k / W) | 0), box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      let gc = false; for (let y = box[1] - 2; y <= box[3] + 2 && !gc; y++) for (let x = box[0] - 2; x <= box[2] + 2; x++) if (inG(x, y) && zoneOf[y * W + x] === 'g') { gc = true; break; } // follicle wall pieces sit within 2 tiles of the centre
      if (!gc) continue;
      const isI = (x, y) => inG(x, y) && set.has(y * W + x), ifd = pin(field(G, isI, 2, box), G, isI, sf.pin);
      P.push(`<path fill="${ml.fill}" d="${pathD(contours(ifd, -.02))}"/>`);
      for (let k = 0, n = cells.length * ml.cells * 3; k < n; k++) { const X = P.R(box[0] - .4, box[2] + 1.4) * U, Y = P.R(box[1] - .4, box[3] + 1.4) * U; if (sdU(ifd, X, Y) < -.08) P.push(`<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(P.R(2.2, 3))}" fill="${ml.cellFill}"/>`); }
      c.tag(ml.tag, (box[0] + box[2] + 1) / 2 * U, box[1] * U + U * .5);
    }
    // floor: base fill, then each zone's fill and cells (masked to its tiles), clipped to the open ground
    P.band(-999, 0, prof.floor.fill);
    P.push('<g clip-path="url(#flo)">');
    const zl = [];
    for (const z of Object.keys(prof.zones)) {
      const Z = prof.zones[z], tiles = tileSet((x, y) => zoneOf[y * W + x] === z); if (!tiles.length) continue;
      P.push(`<path fill="${Z.fill}" d="${pathD(zfield((x, y) => zoneOf[y * W + x] === z))}"/>`);
      if (z === 'g') { // the mantle continues as a darker ring on the cortex around each germinal centre
        const gfd = pin(field(G, (x, y) => inG(x, y) && zoneOf[y * W + x] === 'g', 2), G, (x, y) => inG(x, y) && zoneOf[y * W + x] === 'g', sf.pin);
        P.push(`<path fill-rule="evenodd" fill="${ml.ringFill}" d="${pathD(contours(gfd, ml.ring))}${pathD(contours(gfd, 0))}"/>`);
        for (let k = 0, n = tiles.length * ml.ringCells * 8; k < n; k++) { const X = P.R(0, Wu), Y = P.R(0, Hu), d = sdU(gfd, X, Y); if (d > .05 && d < ml.ring && zoneAt(X, Y) === 'c') P.push(`<circle cx="${n1(X)}" cy="${n1(Y)}" r="${n1(P.R(2.2, 3))}" fill="${ml.ringCellFill}"/>`); }
      }
      P.mask = (X, Y) => zoneAt(X, Y) === z; paint(P, Z.ambient, -999, 0, c); if (Z.lining) zl.push([z, Z.lining]); P.mask = null;
      if (Z.tag) for (let k = 0, n = Math.min(4, tiles.length); k < n; k++) { const t = tiles[(r() * tiles.length) | 0]; c.tag(Z.tag, (t[0] + .5) * U, (t[1] + .5) * U); }
    }
    P.push('</g>');
    // the HEV gate: a venule cut lengthwise, plump cuboidal endothelium, lymphocytes squeezing through its wall
    const hv = prof.hev, gate = tileSet((x, y) => chOf[y * W + x] === '≈');
    if (gate.length) {
      const x0 = Math.min(...gate.map(t => t[0])), x1 = Math.max(...gate.map(t => t[0])) + 1, cy = (gate[0][1] + .5) * U, cx = (x0 + x1) / 2 * U, rx = (x1 - x0) / 2 * U + U * .3, ry = U * .5;
      let s2 = `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${hv.lumen}"/>`;
      for (let k = 0; k < 7; k++) s2 += `<ellipse cx="${n1(cx + P.R(-rx, rx) * .6)}" cy="${n1(cy + P.R(-ry, ry) * .3)}" rx="6" ry="${n1(P.R(3, 5))}" fill="url(#rbc)" opacity=".8"/>`;
      const n = Math.round(Math.PI * (rx + ry) / 9);
      for (let k = 0; k < n; k++) {
        const an = k / n * 6.283, ex = cx + Math.cos(an) * rx, ey = cy + Math.sin(an) * ry, t = Math.atan2(Math.cos(an) * ry, -Math.sin(an) * rx) * 57.2958;
        s2 += k % 6 === 3 ? `<circle cx="${n1(ex)}" cy="${n1(ey)}" r="3.4" fill="${hv.lymph}"/>` // a lymphocyte crossing the wall
          : `<g transform="translate(${n1(ex)} ${n1(ey)}) rotate(${deg(t)})"><rect x="-4.4" y="-4" width="8.8" height="8" rx="2.6" fill="${hv.cell}"/><circle r="2.6" fill="${hv.nucleus}"/></g>`;
      }
      P.push(s2); c.tag(hv.tag, cx, cy - ry);
    }
    // afferent lymphatics: a valve near the capsule, its cusps pointing into the node
    for (const y of [...new Set(tileSet((x, y) => chOf[y * W + x] === 'e').map(t => t[1]))]) {
      const xs = tileSet((x, yy) => yy === y && chOf[yy * W + x] === 'e').map(t => t[0]), X = (Math.max(...xs) + .3) * U, Y = (y + .5) * U;
      P.push(`<path fill="none" stroke="rgba(236,224,244,.6)" stroke-width="1.6" d="M${n1(X - U * .5)},${n1(Y - U * .5)} Q${n1(X - U * .1)},${n1(Y - U * .3)} ${n1(X + U * .3)},${n1(Y - U * .06)} M${n1(X - U * .5)},${n1(Y + U * .5)} Q${n1(X - U * .1)},${n1(Y + U * .3)} ${n1(X + U * .3)},${n1(Y + U * .06)}"/>`);
      c.tag('valve', X, Y);
    }
    // vessels past the hilum, running off the map
    for (const ch of Object.keys(prof.vessels)) {
      const v = prof.vessels[ch], ts = tileSet((x, y) => chOf[y * W + x] === ch); if (!ts.length) continue;
      const y = ts[0][1], xa = (Math.min(...ts.map(t => t[0])) - (ch === 'f' ? .5 : 0)) * U, xb = Wu + U, Y = (y + .5) * U, h = U * (ch === 'V' ? .44 : .38);
      let s2 = `<rect x="${n1(xa)}" y="${n1(Y - h)}" width="${n1(xb - xa)}" height="${n1(2 * h)}" rx="${n1(h)}" fill="${v.lumen}" stroke="${v.wall}" stroke-width="${v.ww}"/>`;
      if (ch === 'A') s2 += `<path fill="none" stroke="rgba(255,236,240,.7)" stroke-width="1" d="M${n1(xa + h)},${n1(Y - h + v.ww / 2 + 1)}H${n1(xb)}M${n1(xa + h)},${n1(Y + h - v.ww / 2 - 1)}H${n1(xb)}" stroke-dasharray="3 2"/>`; // internal elastic lamina
      if (v.rbc) for (let x = xa + 8; x < xb; x += P.R(8, 14)) s2 += `<ellipse cx="${n1(x)}" cy="${n1(Y + P.R(-h, h) * .45)}" rx="5" ry="${n1(P.R(3, 5))}" fill="url(#rbc)"/>`;
      if (v.cells) for (let x = xa + 10; x < xb; x += P.R(14, 26)) s2 += `<circle cx="${n1(x)}" cy="${n1(Y + P.R(-h, h) * .5)}" r="2.8" fill="rgba(70,28,124,.6)"/>`;
      if (v.valve) for (const vx of [xa + U * 2.6, xa + U * 5.6]) s2 += `<path fill="none" stroke="${v.wall}" stroke-width="1.4" d="M${n1(vx)},${n1(Y - h)} Q${n1(vx + U * .3)},${n1(Y - h * .4)} ${n1(vx + U * .55)},${n1(Y - 1)} M${n1(vx)},${n1(Y + h)} Q${n1(vx + U * .3)},${n1(Y + h * .4)} ${n1(vx + U * .55)},${n1(Y + 1)}"/>`; // cusps point away from the node
      P.push(s2); c.tag(v.tag, xa + U * 3, Y);
    }
    // sinus linings, the glossy edge in the town's accent, membranes around the buildings
    for (const [z, o] of zl) { P.mask = (X, Y) => zoneAt(X, Y) === z; LIB.lining(P, o, 0, 0, c); P.mask = null; }
    P.push(`<path fill="none" stroke="${accent}" stroke-opacity=".75" stroke-width="2.2" filter="url(#glow)" d="${pathD(P.C(0))}"/>`);
    for (const z of prof.buildings || []) {
      const L = zfield((x, y) => zoneOf[y * W + x] === z, 0);
      P.push(`<path fill="none" stroke="${accent}" stroke-opacity=".9" stroke-width="2.4" filter="url(#glow)" d="${pathD(L)}"/>`);
    }
    const labels = [];
    for (const lb of prof.labels || []) { const list = anchors[lb.at] || []; const step = Math.max(1, Math.floor(list.length / sf.anchorsPer)); for (let i = 0; i < list.length; i += step) labels.push({ X: list[i][0], Y: list[i][1], text: lb.text, d: 0 }); }
    // lymph flow: distance to the hilum exit through the sinuses (afferent -> subcapsular -> medullary -> hilum), as a per-tile direction
    const sinusZ = { e: 1, s: 1, n: 1, h: 1 }, dist = new Float32Array(W * H).fill(Infinity), q = [];
    for (let i = 0; i < W * H; i++) if (chOf[i] === '<') { dist[i] = 0; q.push(i); }
    while (q.length) { const k = q.shift(), x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, j = b * W + a; if (inG(a, b) && sinusZ[zoneOf[j]] && dist[j] > dist[k] + 1) { dist[j] = dist[k] + 1; q.push(j); } } }
    const flow = new Float32Array(W * H * 2);
    for (let i = 0; i < W * H; i++) { if (!isFinite(dist[i])) continue; const x = i % W, y = (i / W) | 0; let vx = 0, vy = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if ((dx || dy) && inG(a, b) && dist[b * W + a] < dist[i]) { const l = Math.hypot(dx, dy); vx += dx / l; vy += dy / l; } } const l = Math.hypot(vx, vy) || 1; flow[i * 2] = vx / l; flow[i * 2 + 1] = vy / l; }
    const k = Math.min(st.px / U, st.maxSide / Math.max(Wu, Hu));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(Wu * k)}" height="${Math.round(Hu * k)}" viewBox="0 0 ${Wu} ${Hu}"><defs>` +
      `<filter id="wob" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="turbulence" baseFrequency="0.012 0.02" numOctaves="2" seed="${(seed % 997) + 1}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${st.wobble}" xChannelSelector="R" yChannelSelector="G"/></filter>` +
      `<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
      `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .92  0 0 0 0 .9  0 0 0 1.1 -.55"/></filter>` +
      `<radialGradient id="rbc"><stop offset="0" stop-color="#ffb3b0" stop-opacity=".55"/><stop offset=".5" stop-color="#d8323f" stop-opacity=".75"/><stop offset=".8" stop-color="#d8323f" stop-opacity=".98"/><stop offset="1" stop-color="#d8323f" stop-opacity=".6"/></radialGradient>` +
      `<clipPath id="tis"><path clip-rule="evenodd" d="M0,0H${Wu}V${Hu}H0Z${pathD(P.C(0))}"/></clipPath><clipPath id="flo"><path d="${pathD(P.C(0))}"/></clipPath></defs>` +
      `<g filter="url(#wob)">${P.out.join('')}</g><rect width="${Wu}" height="${Hu}" filter="url(#grain)" opacity="${st.grain}" clip-path="url(#tis)" style="mix-blend-mode:overlay"/>` +
      `<rect width="${Wu}" height="${Hu}" filter="url(#grain)" opacity="${prof.floor.grain}" clip-path="url(#flo)" style="mix-blend-mode:overlay"/></svg>`;
    const art = { floorArt: true, town: true, kind: 'town', D: { motion: prof.motion }, G, M, f, fd, labels, glyphs: prof.glyphs, flow, ready: false, bmp: null, sinus: [], axons: [], shedAt: [], parts: [], last: 0, k, Wu, Hu };
    art.fog = null; townCache = { key, art };
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
  // Lymph: pale particles (and the odd lymphocyte) carried along the sinuses toward the hilum.
  function lymph(ctx, art, V, mo, dt, still) {
    const G = art.G, W = G.W, H = G.H, fl = art.flow, rnd = DD.rng(((art.seedN = (art.seedN || 7) + 1) * 2654435761) >>> 0);
    const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (fl[((y | 0) * W + (x | 0)) * 2] || fl[((y | 0) * W + (x | 0)) * 2 + 1]);
    const spawn = p => { for (let k = 0; k < 24; k++) { const x = V.x0 + rnd() * V.cols, y = V.y0 + rnd() * V.rows; if (ok(x, y)) { p.x = x; p.y = y; p.age = still ? rnd() * mo.life : 0; p.r = mo.size[0] + rnd() * (mo.size[1] - mo.size[0]); p.cell = rnd() < .15; return true; } } return false; };
    while (art.parts.length < mo.count) { const p = {}; if (!spawn(p)) return; p.age = rnd() * mo.life; art.parts.push(p); }
    tileT(ctx, V);
    for (const p of art.parts) {
      p.age += dt;
      if (p.age > mo.life || !ok(p.x, p.y) || p.x < V.x0 - 1 || p.y < V.y0 - 1 || p.x > V.x0 + V.cols + 1 || p.y > V.y0 + V.rows + 1) { if (!spawn(p)) continue; }
      const fx = p.x - .5, fy = p.y - .5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0; let vx = 0, vy = 0; // bilinear blend of the tile directions
      for (const [dx, dy, w] of [[0, 0, (1 - u) * (1 - v)], [1, 0, u * (1 - v)], [0, 1, (1 - u) * v], [1, 1, u * v]]) { const a = x0 + dx, b = y0 + dy; if (a >= 0 && b >= 0 && a < W && b < H) { vx += fl[(b * W + a) * 2] * w; vy += fl[(b * W + a) * 2 + 1] * w; } }
      const l = Math.hypot(vx, vy) || 1; p.x += vx / l * mo.speed * dt; p.y += vy / l * mo.speed * dt;
      const al = clamp(Math.min(p.age / .8, mo.life - p.age), 0, 1) * mo.alpha;
      ctx.globalAlpha = al; ctx.fillStyle = p.cell ? mo.cell : mo.fill; ctx.beginPath(); ctx.arc(p.x, p.y, p.cell ? .08 : p.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Live layer for floors: only the profile's motion. Beat: the floor contracts at bpm. Breathe: it slowly stretches and relaxes. Diapedesis: new red cells squeeze through a sinusoid wall, then drift away. Peristalsis: a travelling wave ripples the floor. Drift: particles flow along the passages. Spark: action potentials run along axons. Contract: a muscle fiber shortens, striations bunching. Shed: squames lift off the skin surface. Wiggle: sperm tails beat in the lumen.
  function floorBase(ctx, art, V, now) {
    const still = !animated(), t = still ? 0 : now / 1000, dt = still ? 0 : Math.min(.05, art.last ? t - art.last : 0), M = art.M;
    art.last = t;
    const sx = (V.x0 + M - 1) * U, sy = (V.y0 + M - 1) * U, sw = (V.cols + 2) * U, sh = (V.rows + 2) * U, k = art.k;
    localT(ctx, V, M);
    const mo = art.D.motion;
    if (mo && mo.type === 'beat' && !still) { // the whole floor contracts slightly in ventricular systole, about the view centre
      const sc = 1 - S().floor.beat * beatOf(t).c, cx = (V.x0 + M + V.cols / 2) * U, cy = (V.y0 + M + V.rows / 2) * U;
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    }
    if (mo && mo.type === 'breathe' && !still) { // inspiration stretches the septa, expiration relaxes them
      const b = S().floor.breath, sc = 1 + b.amp * (.5 - .5 * Math.cos(t * 2 * Math.PI / b.period)), cx = (V.x0 + M + V.cols / 2) * U, cy = (V.y0 + M + V.rows / 2) * U;
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    }
    const ax = clamp(sx, 0, art.Wu), ay = clamp(sy, 0, art.Hu), bx = clamp(sx + sw, 0, art.Wu), by = clamp(sy + sh, 0, art.Hu);
    if (mo && mo.type === 'peristalsis' && !still && bx > ax && by > ay) { // a ring of contraction travels along the gut and the villi sway with it:
      const pe = S().floor.peristalsis, cv = ctx.canvas, T = art.tmp = art.tmp || document.createElement('canvas'); // draw the view once offscreen, then shift whole-pixel columns
      if (T.width !== cv.width || T.height !== cv.height) { T.width = cv.width; T.height = cv.height; }
      const tc = T.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); tc.clearRect(0, 0, T.width, T.height); tc.setTransform(ctx.getTransform());
      tc.drawImage(art.bmp, ax * k, ay * k, (bx - ax) * k, (by - ay) * k, ax, ay, bx - ax, by - ay);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const px = V.dpr * V.ts, n = pe.strips, w = Math.ceil(cv.width / n);
      for (let i = 0; i < n; i++) {
        const x = i * w, xt = V.x0 + (x / V.dpr - V.ox) / V.ts, sway = pe.sway * Math.sin(2 * Math.PI * t / pe.swayPeriod + xt * .7);
        const dy = (pe.amp * Math.sin(2 * Math.PI * (xt / pe.wave - t / pe.period)) + sway) * px, ww = Math.min(w, cv.width - x);
        if (ww > 0) ctx.drawImage(T, x, 0, ww, cv.height, x, dy, ww, cv.height);
      }
      ctx.restore();
    } else if (bx > ax && by > ay) ctx.drawImage(art.bmp, ax * k, ay * k, (bx - ax) * k, (by - ay) * k, ax, ay, bx - ax, by - ay);
    if (mo && mo.type === 'drift') return drift(ctx, art, V, mo, dt, still);
    if (mo && mo.type === 'spark') return spark(ctx, art, V, mo, dt, still);
    if (mo && mo.type === 'contract') return contract(ctx, art, V, mo, dt, still);
    if (mo && mo.type === 'shed') return shed(ctx, art, V, mo, dt, still);
    if (mo && mo.type === 'wiggle') return wiggle(ctx, art, V, mo, dt, still);
    if (mo && mo.type === 'lymph') return lymph(ctx, art, V, mo, dt, still);
    if (!mo || mo.type !== 'diapedesis' || !art.sinus.length) return;
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
  // Drift: faint particles carried along the floor's passages (kidney: filtrate flowing down the tubules). Each follows the wall
  // tangent, signed toward one preferred direction so both sides of a passage flow the same way.
  function drift(ctx, art, V, mo, dt, still) {
    const G = art.G, M = art.M, life = mo.life || 6, rnd = DD.rng(((art.seedN = (art.seedN || 7) + 1) * 2654435761) >>> 0);
    const spawn = p => { for (let k = 0; k < 20; k++) { const x = V.x0 + rnd() * V.cols, y = V.y0 + rnd() * V.rows, i = (y | 0) * G.W + (x | 0); if (x >= 0 && y >= 0 && x < G.W && y < G.H && G.lum[i]) { p.x = x; p.y = y; p.age = still ? rnd() * life : 0; p.r = mo.size[0] + rnd() * (mo.size[1] - mo.size[0]); return true; } } return false; };
    while (art.parts.length < mo.count) { const p = {}; if (!spawn(p)) return; p.age = rnd() * life; art.parts.push(p); }
    tileT(ctx, V); ctx.fillStyle = mo.fill;
    for (const p of art.parts) {
      p.age += dt;
      if (p.age > life || !G.lum[(p.y | 0) * G.W + (p.x | 0)] || p.x < V.x0 - 1 || p.y < V.y0 - 1 || p.x > V.x0 + V.cols + 1 || p.y > V.y0 + V.rows + 1) { if (!spawn(p)) continue; }
      const g = grad(art.fd, (p.x + M) * U, (p.y + M) * U); let tx = -g[1], ty = g[0]; if (tx * .8 + ty * .6 < 0) { tx = -tx; ty = -ty; }
      p.x += tx * mo.speed * dt; p.y += ty * mo.speed * dt;
      const u = p.age, al = u < .8 ? u / .8 : u > life - 1 ? (life - u) : 1;
      ctx.globalAlpha = clamp(al, 0, 1) * mo.alpha; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Spark: action potentials run along the myelinated axons recorded at bake time, a bright pulse with a fading tail.
  function spark(ctx, art, V, mo, dt, still) {
    if (still || !art.axons.length) return;
    const rnd = DD.rng(((art.seedN = (art.seedN || 7) + 1) * 2654435761) >>> 0), inV = q => q[0] > V.x0 - 1 && q[1] > V.y0 - 1 && q[0] < V.x0 + V.cols + 1 && q[1] < V.y0 + V.rows + 1;
    const spawn = p => { for (let k = 0; k < 24; k++) { const l = art.axons[(rnd() * art.axons.length) | 0], i = (rnd() * l.length) | 0; if (inV(l[i])) { p.l = l; p.i = i; p.u = 0; p.dir = rnd() < .5 ? -1 : 1; p.age = -rnd() * mo.gap; return true; } } return false; };
    while (art.parts.length < mo.count) { const p = {}; if (!spawn(p)) return; art.parts.push(p); }
    tileT(ctx, V); ctx.lineCap = 'round';
    for (const p of art.parts) {
      p.age += dt;
      if (p.age > mo.life || !inV(p.l[p.i])) { if (!spawn(p)) continue; }
      if (p.age < 0) continue;
      p.u += mo.speed * dt; const n = p.l.length;
      while (p.u > 0) { const a = p.l[p.i], j = (p.i + p.dir + n) % n, b = p.l[j], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d > p.u) break; p.u -= d; p.i = j; } // walk the polyline (loops are closed)
      const al = clamp(Math.min(p.age / .1, (mo.life - p.age) / .3), 0, 1) * mo.alpha;
      ctx.strokeStyle = mo.fill; ctx.lineWidth = mo.w;
      for (let k = 0, i = p.i; k < mo.tail; k++) { const j = (i - p.dir + n) % n; ctx.globalAlpha = al * (1 - k / mo.tail); ctx.beginPath(); ctx.moveTo(p.l[i][0], p.l[i][1]); ctx.lineTo(p.l[j][0], p.l[j][1]); ctx.stroke(); i = j; }
      ctx.globalAlpha = al; ctx.fillStyle = mo.fill; ctx.beginPath(); ctx.arc(p.l[p.i][0], p.l[p.i][1], mo.w * 1.4, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Contract: now and then one traced muscle fiber shortens, its striations bunching toward the middle of the stretch, then relaxes.
  function contract(ctx, art, V, mo, dt, still) {
    if (still || !art.axons.length) return;
    const st = S().floor.contract, rnd = DD.rng(((art.seedN = (art.seedN || 7) + 1) * 2654435761) >>> 0), inV = q => q[0] > V.x0 && q[1] > V.y0 && q[0] < V.x0 + V.cols && q[1] < V.y0 + V.rows;
    const p = art.parts[0] || (art.parts[0] = { age: st.life + 1, wait: st.every * rnd() });
    p.age += dt;
    if (p.age > st.life + p.wait) {
      p.l = null; for (let k = 0; k < 30 && !p.l; k++) { const l = art.axons[(rnd() * art.axons.length) | 0], i = (rnd() * l.length) | 0; if (inV(l[i])) { p.l = l; p.i = i; } }
      p.age = 0; p.wait = st.every * (.5 + rnd()); if (!p.l) return;
    }
    if (!p.l || p.age > st.life) return;
    const l = p.l, n = l.length, pts = [l[p.i]]; // walk the stretch out from the chosen point both ways (loops are closed)
    for (const dir of [1, -1]) for (let len = 0, i = p.i; len < st.span / 2;) { const j = (i + dir + n) % n; len += Math.hypot(l[j][0] - l[i][0], l[j][1] - l[i][1]); i = j; dir > 0 ? pts.push(l[j]) : pts.unshift(l[j]); }
    const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = acc[acc.length - 1], q = Math.sin(Math.PI * p.age / st.life), fade = clamp(Math.min(p.age, st.life - p.age) / .25, 0, 1);
    const at = s => { let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const u = (s - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]), a = pts[i - 1], b = pts[i]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])]; };
    tileT(ctx, V); ctx.lineCap = 'round'; ctx.globalAlpha = fade;
    ctx.strokeStyle = mo.fill; ctx.lineWidth = mo.w * (1 + .25 * q); ctx.beginPath(); pts.forEach((pt, i) => ctx[i ? 'lineTo' : 'moveTo'](pt[0], pt[1])); ctx.stroke(); // the fiber thickens as it shortens
    ctx.strokeStyle = mo.band; ctx.lineWidth = mo.bw; const h = mo.w * (1 + .25 * q) / 2;
    for (let d = -L / 2; d <= L / 2; d += mo.gap) { const x = d / (L / 2), s = L / 2 + d * (1 - st.amp * q * (1 - x * x)), [px, py, an] = at(s), nx = -Math.sin(an) * h, ny = Math.cos(an) * h; ctx.beginPath(); ctx.moveTo(px - nx, py - ny); ctx.lineTo(px + nx, py + ny); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // Shed: flat dead squames lift off the surface one by one, tumbling slowly away from it (stratum corneum desquamation).
  function shed(ctx, art, V, mo, dt, still) {
    const inV = s => s.x > V.x0 - 1 && s.x < V.x0 + V.cols + 1 && s.y > V.y0 - 1 && s.y < V.y0 + V.rows + 1, ports = art.shedAt.filter(inV);
    if (!ports.length) return;
    const rnd = DD.rng(((art.seedN = (art.seedN || 7) + 1) * 2654435761) >>> 0);
    while (art.parts.length < mo.count) art.parts.push({ age: rnd() * mo.life, s: null });
    tileT(ctx, V); ctx.fillStyle = mo.fill; ctx.strokeStyle = mo.rim; ctx.lineWidth = .012;
    for (const p of art.parts) {
      p.age += dt;
      if (!p.s || p.age > mo.life || !inV(p.s)) { p.s = ports[(rnd() * ports.length) | 0]; p.age = still ? rnd() * mo.life : 0; p.sway = rnd() < .5 ? -1 : 1; p.w = mo.size[0] * (.75 + rnd() * .5); }
      const s = p.s, q = p.age / mo.life, lift = mo.dist * q, side = p.sway * mo.sway * Math.sin(q * Math.PI * 1.5);
      const x = s.x + s.nx * lift - s.ny * side, y = s.y + s.ny * lift + s.nx * side, al = clamp(Math.min(q / .15, (1 - q) / .3), 0, 1) * mo.alpha;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(Math.atan2(s.ny, s.nx) + Math.PI / 2 + p.sway * q * mo.tumble);
      ctx.beginPath(); ctx.ellipse(0, 0, p.w, mo.size[1], 0, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // Wiggle: sperm drift slowly down the lumen, each tail beating in a travelling wave behind its head.
  function wiggle(ctx, art, V, mo, dt, still) {
    const G = art.G, life = mo.life, rnd = DD.rng(((art.seedN = (art.seedN || 7) + 1) * 2654435761) >>> 0);
    const spawn = p => { for (let k = 0; k < 20; k++) { const x = V.x0 + rnd() * V.cols, y = V.y0 + rnd() * V.rows; if (x >= 0 && y >= 0 && x < G.W && y < G.H && G.lum[(y | 0) * G.W + (x | 0)]) { p.x = x; p.y = y; p.a = rnd() * 6.283; p.ph = rnd() * 6.283; p.age = still ? rnd() * life : 0; return true; } } return false; };
    while (art.parts.length < mo.count) { const p = {}; if (!spawn(p)) return; p.age = rnd() * life; art.parts.push(p); }
    tileT(ctx, V); ctx.lineCap = 'round'; ctx.lineWidth = mo.w;
    const t = still ? 0 : art.last, n = 10;
    for (const p of art.parts) {
      p.age += dt;
      if (p.age > life || !G.lum[(p.y | 0) * G.W + (p.x | 0)] || p.x < V.x0 - 1 || p.y < V.y0 - 1 || p.x > V.x0 + V.cols + 1 || p.y > V.y0 + V.rows + 1) { if (!spawn(p)) continue; }
      p.a += (rnd() - .5) * mo.turn * dt; p.x += Math.cos(p.a) * mo.speed * dt; p.y += Math.sin(p.a) * mo.speed * dt;
      const ca = Math.cos(p.a), sa = Math.sin(p.a), al = clamp(Math.min(p.age / .8, life - p.age), 0, 1) * mo.alpha;
      ctx.globalAlpha = al; ctx.strokeStyle = mo.tail; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const u = i / n, d = u * mo.len, off = mo.amp * u * Math.sin(u * mo.waves * 6.283 - t * mo.beat * 6.283 + p.ph); ctx[i ? 'lineTo' : 'moveTo'](p.x - ca * d - sa * off, p.y - sa * d + ca * off); }
      ctx.stroke(); ctx.fillStyle = mo.head; ctx.beginPath(); ctx.ellipse(p.x + ca * mo.hx, p.y + sa * mo.hx, mo.hx, mo.hy, p.a, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const floorProfile = run => !!(run && !run.trip && run.floor && !run.floor.tiles && DD.data.tissue && DD.data.tissue[run.regionId]);

  function animated() { return !reduce.matches; }
  function forRun(run) {
    if (!run || !run.floor || !can()) return null;
    if (run.townArt) { const ta = buildTown(run.floor, run.accent, run.seed >>> 0); return ta && ta.ready ? ta : null; } // V13: lymph node towns
    if (!run.trip) {
      if (!floorProfile(run)) return null;
      const fa = store.get(run.floor) || buildFloor(run.floor, run.regionId, run.floorIdx, (run.seed + run.floorIdx * 7919) >>> 0);
      return fa && fa.ready ? fa : null;
    }
    const n = DD.travel.segs(run)[run.trip.idx];
    if (n && n.kind === 'place' && n.region && DD.data.tissue && DD.data.tissue[n.region]) { // organ plaza: the organ's own floor-1 tissue
      const pa = store.get(run.floor) || buildFloor(run.floor, n.region, 0, (run.seed + run.trip.idx * 7919) >>> 0, true);
      return pa && pa.ready ? pa : null;
    }
    const art = store.get(run.floor) || build(run.floor, n, (run.seed + run.trip.idx * 7919) >>> 0);
    return art && art.ready ? art : null;
  }
  return {
    build, buildFloor, buildTown, floorProfile, forRun, base, fog, sprite, glucose, labels, animated, kindOf,
    onReady(fn) { onReady = fn; },
    perf: { frames: 0, ms: 0 },
    has: f => !!store.get(f)
  };
})();
