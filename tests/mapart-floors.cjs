// Dungeon floor map art (V2) in headless Chromium: every walkable tile still looks walkable in the baked bitmap, and
// every wall tile looks like wall. Also logs frame time at 360 px. Run: node tests/mapart-floors.cjs [shotDir] [region...]
// Regions default to every profile in data/tissue.js. FLOORS=1 limits to floor 1 (preview).
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..', 'game'), shots = process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : null, nFloors = +process.env.FLOORS || 3;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); s.end(b); } }); });
(async () => {
  await new Promise(r => server.listen(0, r));
  const url = 'http://localhost:' + server.address().port + '/', browser = await chromium.launch(), errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }), page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(v => { window.__pillar = v; }, !!process.env.PILLAR); await page.goto(url); await page.waitForFunction(() => window.DD && DD.save && DD.save.profile);
  const regions = process.argv.slice(3).length ? process.argv.slice(3) : await page.evaluate(() => Object.keys(DD.data.tissue));
  const seeds = [12345, 777, 4242, 99001, 31337, 8], shotSeed = +process.env.SHOTSEED || seeds[0]; // SHOTSEED: which seed to screenshot; PILLAR=1 frames a pillar
  for (const region of regions) {
  await page.evaluate(rg => { const p = DD.save.profile; p.classId = p.classId || 'neutrophil'; p.intro = true; p.settings.mapLabels = true; DD.ui.enter(rg); }, region);
  for (let n = 0; n < seeds.length * nFloors; n++) {
    const i = n % nFloors, seed = seeds[(n / nFloors) | 0];
    await page.evaluate(([i, seed]) => { DD.game.run.seed = seed; DD.game.loadFloor(i); DD.ui.game(); }, [i, seed]);
    await page.waitForFunction(() => !!DD.mapart.forRun(DD.game.run), null, { timeout: 30000 });
    const r = await page.evaluate(() => {
      const run = DD.game.run, f = run.floor, art = DD.mapart.forRun(run), c = art.bmp, x = c.getContext('2d'), k = c.width / f.W, bad = [];
      const d = x.getImageData(0, 0, c.width, c.height).data, A = (px, py) => { let s = 0; for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) s += d[((py + dy) * c.width + px + dx) * 4 + 3]; return s / 121 / 255; }; // a quarter-tile average at the tile centre
      let fmax = 0, wmin = 1;
      for (let y = 0; y < f.H; y++) for (let x2 = 0; x2 < f.W; x2++) {
        const a = A(Math.round((x2 + .5) * k), Math.round((y + .5) * k)), walk = f.g[y][x2] !== '#';
        if (walk) { fmax = Math.max(fmax, a); if (a > .62) bad.push('floor ' + f.g[y][x2] + ' ' + x2 + ',' + y + ' a=' + a.toFixed(2)); }
        else { wmin = Math.min(wmin, a); if (a < .7) bad.push('wall ' + x2 + ',' + y + ' a=' + a.toFixed(2)); }
      }
      // explore the floor for the screenshot so the tissue shows beyond the torch radius
      f.explored.fill(1); f.vis.fill(1);
      if (window.__pillar && art.G.pillars.length) { const k2 = art.G.pillars[0][0]; run.px = k2 % f.W; run.py = (k2 / f.W) | 0; } else if (f.exit) { const m = f.rooms.find(m => f.exit.x >= m.x && f.exit.x < m.x + m.w && f.exit.y >= m.y && f.exit.y < m.y + m.h); run.px = m.x + 1; run.py = m.y + 1; } // boss floor: frame the hub
      return { bad, fmax, wmin, w: c.width, h: c.height, kb: Math.round(art.svgBytes / 1024), pillars: art.G.pillars.length, labels: art.labels.length };
    });
    console.log(region, 'seed', seed, 'floor', i + 1, JSON.stringify({ ...r, bad: r.bad.length }));
    if (r.bad.length) console.log(r.bad.join('\n'));
    if (!process.env.ALL) assert.deepEqual(r.bad, [], region + ' seed ' + seed + ' floor ' + (i + 1) + ': walkable tiles look walkable, walls look like walls');
    if (shots && seed === shotSeed) { await page.evaluate(() => DD.ui.refreshMap()); await page.waitForTimeout(400); await page.screenshot({ path: path.join(shots, region + '-floor' + (i + 1) + '.png') }); }
  }
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => { DD.mapart.perf.frames = 0; DD.mapart.perf.ms = 0; DD.ui.refreshMap(); });
  await page.waitForTimeout(2500);
  const P = await page.evaluate(() => DD.mapart.perf);
  console.log('frame time at 360 px:', (P.ms / Math.max(1, P.frames)).toFixed(2), 'ms over', P.frames, 'frames');
  assert.ok(P.frames > 10, 'floor animates');
  assert.deepEqual(errors, [], 'no page errors');
  await browser.close(); server.close();
  console.log('mapart floors: ok');
})().catch(e => { console.error(e); process.exit(1); });
