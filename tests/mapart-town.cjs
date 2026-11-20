// Town map art (V13) in headless Chromium: for every town accent, walkable tiles look walkable in the baked bitmap and
// wall tiles look like wall. Screenshots one view per zone, and logs frame time at 360 px. Run: node tests/mapart-town.cjs [shotDir]
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..', 'game'), shots = process.argv[2] || null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); s.end(b); } }); });
(async () => {
  await new Promise(r => server.listen(0, r));
  const url = 'http://localhost:' + server.address().port + '/', browser = await chromium.launch(), errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }), page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url); await page.waitForFunction(() => window.DD && DD.save && DD.save.profile);
  const towns = await page.evaluate(() => DD.data.circ.towns.map(t => t.id));
  const open = (id, x, y, seed) => page.evaluate(([id, x, y, seed]) => { const p = DD.save.profile; p.classId = p.classId || 'neutrophil'; p.intro = true; p.settings.mapLabels = true; DD.ui.town({ resume: { id, x, y, seed } }); }, [id, x, y, seed]);
  const ready = () => page.waitForFunction(() => { const r = DD.town.mapRun(); return !!(r && DD.mapart.forRun(r)); }, null, { timeout: 30000 });
  for (const id of towns) for (const seed of [4242, 99]) {
    await open(id, 3, 9, seed); await ready();
    const r = await page.evaluate(() => {
      const run = DD.town.mapRun(), f = run.floor, art = DD.mapart.forRun(run), c = art.bmp, x = c.getContext('2d'), k = c.width / f.W, bad = [];
      const d = x.getImageData(0, 0, c.width, c.height).data, A = (px, py) => { let s = 0; for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) s += d[((py + dy) * c.width + px + dx) * 4 + 3]; return s / 121 / 255; };
      const TM = DD.data.townmap;
      for (let y = 0; y < f.H; y++) for (let x2 = 0; x2 < f.W; x2++) {
        const ch = [...(TM.rows[y] || '')][x2] || ' ', lg = TM.legend[ch], a = A(Math.round((x2 + .5) * k), Math.round((y + .5) * k));
        if (lg && lg.walk && a > .62) bad.push('floor ' + ch + ' ' + x2 + ',' + y + ' a=' + a.toFixed(2));
        if (ch === '#' && a < .7) bad.push('wall ' + x2 + ',' + y + ' a=' + a.toFixed(2));
      }
      return { bad, kb: Math.round(art.svgBytes / 1024), labels: art.labels.length };
    });
    console.log(id, 'seed', seed, JSON.stringify({ ...r, bad: r.bad.length }));
    if (r.bad.length) console.log(r.bad.join('\n'));
    assert.deepEqual(r.bad, [], id + ' seed ' + seed + ': walkable tiles look walkable, walls look like walls');
  }
  if (shots) { // one view per zone, first town
    const spots = await page.evaluate(() => { const TM = DD.data.townmap, out = {}; TM.rows.forEach((row, y) => [...row].forEach((ch, x) => { const d = TM.legend[ch]; if (d && d.walk && d.zone && !d.keeper) (out[d.zone] = out[d.zone] || []).push([x, y]); })); for (const z in out) { const l = out[z]; out[z] = l[(l.length / 2) | 0]; } return out; });
    for (const [z, [x, y]] of Object.entries(spots)) {
      await open(towns[0], x, y, 4242); await ready();
      await page.evaluate(() => { document.querySelectorAll('.banner').forEach(b => { b.hidden = true; }); DD.town.redraw(); }); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(shots, 'town-' + z + '.png') });
    }
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => { DD.mapart.perf.frames = 0; DD.mapart.perf.ms = 0; DD.town.redraw(); });
  await page.waitForTimeout(2500);
  const P = await page.evaluate(() => DD.mapart.perf);
  console.log('frame time at 360 px:', (P.ms / Math.max(1, P.frames)).toFixed(2), 'ms over', P.frames, 'frames');
  assert.ok(P.frames > 10, 'town animates');
  assert.deepEqual(errors, [], 'no page errors');
  await browser.close(); server.close();
  console.log('mapart town: ok');
})().catch(e => { console.error(e); process.exit(1); });
