// Headless sheet export: loads editor.html in Playwright with each character as the draft, then
// clicks Download sprite sheet for every clip. Usage: node render-sheets.cjs <out dir> <char.json>… [--clips idle,act,actInPlace,hit]
const {chromium} = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const args = process.argv.slice(2), ci = args.indexOf('--clips');
  const clips = ci >= 0 ? args.splice(ci, 2)[1].split(',') : ['idle', 'act', 'actInPlace', 'hit'];
  const [out, ...files] = args; fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch(), errors = [];
  for (const file of files) {
    const json = fs.readFileSync(file, 'utf8'), id = JSON.parse(json).id;
    const ctx = await browser.newContext({acceptDownloads: true, viewport: {width: 1200, height: 900}});
    await ctx.addInitScript(j => { try { localStorage.setItem('blob_editor_draft', j); } catch (e) {} }, json);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${id}: ${e.message}`));
    page.on('console', m => m.type() === 'error' && errors.push(`${id}: ${m.text()}`));
    await page.goto('file://' + path.resolve(__dirname, 'editor.html'));
    for (const clip of clips) {
      await page.selectOption('#clip', clip);
      const got = [], done = new Promise(res => page.on('download', async d => {
        const p = path.join(out, d.suggestedFilename().replace(/^[^_]+(?=_)/, id)); await d.saveAs(p); got.push(p); if (got.length === 2) res(); }));
      await page.click('#downloadSheet'); await done; page.removeAllListeners('download');
    }
    await ctx.close(); console.log('rendered', id);
  }
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
})();
